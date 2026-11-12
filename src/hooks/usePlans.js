import { useCallback, useEffect, useState } from "react";

// Loads the agent plans and exposes the three states of a request.
// Every effect run gets its own `cancelled` flag: a late answer (after a reload, a new
// `fetchPlans`, or an unmount) is ignored instead of overwriting the current state.
export default function usePlans(fetchPlans) {
  const [status, setStatus] = useState("loading");
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setPlans([]);
    setError(null);

    fetchPlans().then(
      (data) => {
        if (cancelled) return;
        setPlans(data);
        setStatus("ready");
      },
      (failure) => {
        if (cancelled) return;
        setError(failure);
        setStatus("error");
      }
    );

    return () => {
      cancelled = true;
    };
  }, [fetchPlans, attempt]);

  // Stable identity: the caller can pass it to a button without repeating the effect.
  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { status, plans, error, reload };
}
