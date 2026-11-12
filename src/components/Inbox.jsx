import { useState } from "react";
import PlanCard from "./PlanCard";
import RunPanel from "./RunPanel";
import useDebounce from "@hooks/useDebounce";
import { targetLabel, VERDICT_LABELS } from "../lib/plans";

// Already written. The inbox does NOT own the decisions: App does (the header needs the pending counter too),
// so they arrive by props, together with the function that changes them. The inbox only remembers what is typed.
export default function Inbox({ plans, decisions, onDecide, runAgent }) {
  const [query, setQuery] = useState("");
  // The list reacts to the quiet value (300 ms without typing); the text box shows what is typed right now.
  const quietQuery = useDebounce(query, 300);

  const pending = plans.filter((plan) => !(plan.id in decisions));
  const decided = plans.filter((plan) => plan.id in decisions);
  const approved = decided.filter((plan) => decisions[plan.id] === "approved");
  const needle = quietQuery.trim().toLowerCase();
  const visible = pending.filter(
    (plan) => plan.op.toLowerCase().includes(needle) || targetLabel(plan.target).toLowerCase().includes(needle)
  );

  return (
    <section className="inbox" aria-labelledby="inbox-title">
      <h2 id="inbox-title">Planes del agente</h2>

      <p className="counters">
        <span>Decididos: {decided.length}</span>
      </p>

      <label className="search">
        Buscar plan
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      <section aria-labelledby="pending-title">
        <h3 id="pending-title">Pendientes</h3>
        {visible.length > 0 ? (
          <div className="plan-list">
            {visible.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onDecide={onDecide} />
            ))}
          </div>
        ) : needle !== "" ? (
          <div className="empty">
            <p>No hay planes que coincidan</p>
            <button type="button" onClick={() => setQuery("")}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <p className="empty">No quedan planes pendientes.</p>
        )}
      </section>

      <section aria-labelledby="decided-title">
        <h3 id="decided-title">Decididos</h3>
        {decided.length > 0 ? (
          <ul className="decided-list">
            {decided.map((plan) => (
              <li key={plan.id} className={`decided decided-${decisions[plan.id]}`}>
                <strong>{VERDICT_LABELS[decisions[plan.id]]}</strong> · {plan.op} · {targetLabel(plan.target)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Aún no has decidido ningún plan.</p>
        )}
      </section>

      <RunPanel approvedPlans={approved} runAgent={runAgent} />
    </section>
  );
}
