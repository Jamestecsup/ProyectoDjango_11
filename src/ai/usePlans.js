import { useCallback, useEffect, useState } from "react";

// Fixed: the failure path now sets status "error" and the error (the old version only
// logged it and stayed in "loading"), and every effect run has a `cancelled` flag so a
// late answer cannot overwrite the newest one.
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

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { status, plans, error, reload };
}
