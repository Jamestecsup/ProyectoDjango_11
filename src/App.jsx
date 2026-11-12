import { useEffect, useState } from "react";
import ErrorBanner from "./components/ErrorBanner";
import Header from "./components/Header";
import Inbox from "./components/Inbox";
import PlansSkeleton from "./components/PlansSkeleton";
import usePlans from "@hooks/usePlans";
import { fetchPlans as defaultFetchPlans, network, runAgent as defaultRunAgent } from "./lib/api";
import { readStoredDecisions, writeStoredDecisions } from "./lib/storage";

// Already written. The decisions live HERE, in the lowest component that is an ancestor of everyone who
// needs them: the inbox (to draw them) and the header (to count the pending ones). Both props are
// functions that must keep the same identity between renders (module-level), because usePlans repeats
// its effect when `fetchPlans` changes.
export default function App({ fetchPlans = defaultFetchPlans, runAgent = defaultRunAgent }) {
  const { status, plans, error, reload } = usePlans(fetchPlans);
  const [decisions, setDecisions] = useState(readStoredDecisions);
  const [failing, setFailing] = useState(network.failing);

  useEffect(() => {
    writeStoredDecisions(decisions);
  }, [decisions]);

  function decide(id, verdict) {
    setDecisions((current) => ({ ...current, [id]: verdict }));
  }

  function toggleFailing(event) {
    network.failing = event.target.checked;
    setFailing(event.target.checked);
  }

  // Derived on every render, never stored. The header receives only this number.
  const pendingCount = status === "ready" ? plans.filter((plan) => !(plan.id in decisions)).length : null;

  return (
    <main className="app">
      <Header pendingCount={pendingCount} />

      <div className="toolbar">
        <label className="network-toggle">
          <input type="checkbox" checked={failing} onChange={toggleFailing} />
          Simular fallo de red
        </label>
        <button type="button" className="reload-link" onClick={reload}>
          Recargar planes
        </button>
      </div>

      {status === "loading" && <PlansSkeleton />}
      {status === "error" && <ErrorBanner error={error} onRetry={reload} />}
      {status === "ready" && <Inbox plans={plans} decisions={decisions} onDecide={decide} runAgent={runAgent} />}
    </main>
  );
}
