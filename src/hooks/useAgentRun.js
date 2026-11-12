import { useCallback, useEffect, useRef, useState } from "react";

const IDLE = { status: "idle", plan: null, result: null, error: null };

// State machine for running an agent plan: idle -> running -> done | awaiting_approval | error.
// A destructive plan (R2) never goes from running to done: it waits for approve().
export default function useAgentRun(runAgent) {
  const [run, setRun] = useState(IDLE);
  // Latest state, readable from start/approve/reject without waiting for a render.
  const latest = useRef(run);
  // AbortController of the execution in progress.
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

  // Unmount: abort the execution in progress so its late answer cannot touch state.
  useEffect(() => {
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  return { ...run, start, approve, reject };
}
