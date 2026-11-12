import { useCallback, useEffect, useRef, useState } from "react";

const IDLE = { status: "idle", plan: null, result: null, error: null };

// Fixed three defects of the "AI" version:
//   1. It returned before calling useRef/useCallback when `runAgent` was missing: a
//      conditional hook that breaks the rules of hooks. Now every hook is called on every
//      render and start() simply does nothing while there is no runAgent.
//   2. An R2 plan went straight to "done". Now it stops in "awaiting_approval" until
//      approve() is called.
//   3. Nothing aborted the run on unmount. The useEffect below aborts the controller.
export default function useAgentRun(runAgent) {
  const [run, setRun] = useState(IDLE);
  const latest = useRef(run);
  const controller = useRef(null);

  const update = useCallback((next) => {
    latest.current = next;
    setRun(next);
  }, []);

  const start = useCallback(
    (plan) => {
      const { status } = latest.current;
      if (status === "running" || status === "awaiting_approval") return;
      if (!runAgent) return;

      const current = new AbortController();
      controller.current = current;
      update({ status: "running", plan, result: null, error: null });

      runAgent(plan, { signal: current.signal }).then(
        (result) => {
          if (current.signal.aborted) return;
          const nextStatus = plan.risk === "R2" ? "awaiting_approval" : "done";
          update({ status: nextStatus, plan, result, error: null });
        },
        (failure) => {
          if (current.signal.aborted) return;
          update({ status: "error", plan, result: null, error: failure });
        }
      );
    },
    [runAgent, update]
  );

  const approve = useCallback(() => {
    if (latest.current.status !== "awaiting_approval") return;
    update({ ...latest.current, status: "done" });
  }, [update]);

  const reject = useCallback(() => {
    const { status } = latest.current;
    if (status !== "running" && status !== "awaiting_approval") return;

    controller.current?.abort();
    controller.current = null;
    update(IDLE);
  }, [update]);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  return { ...run, start, approve, reject };
}
