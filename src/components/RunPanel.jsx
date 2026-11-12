import Button from "./Button";
import useAgentRun from "@hooks/useAgentRun";
import { targetLabel } from "../lib/plans";

// Already written: lets the person ask the agent to run the plans they approved, one at a time.
// The run is a rehearsal first; a destructive plan (R2) waits for a last confirmation before it is applied.
export default function RunPanel({ approvedPlans, runAgent }) {
  const run = useAgentRun(runAgent);
  const busy = run.status === "running" || run.status === "awaiting_approval";

  return (
    <section aria-labelledby="run-title">
      <h3 id="run-title">Ejecución del agente</h3>

      {approvedPlans.length > 0 ? (
        <ul className="run-list">
          {approvedPlans.map((plan) => (
            <li key={plan.id}>
              <span>
                <code>{plan.id}</code> · {plan.op} · {targetLabel(plan.target)}
              </span>
              <Button variant="ghost" disabled={busy} aria-label={`Ejecutar ${plan.id}`} onClick={() => run.start(plan)}>
                Ejecutar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Aprueba un plan para poder ejecutarlo.</p>
      )}

      <div className={`run-status run-${run.status}`} role="status" aria-label="Estado de la ejecución">
        {run.status === "idle" && <p>Sin ejecución en curso.</p>}
        {run.status === "running" && (
          <>
            <p>Ejecutando {run.plan.id}…</p>
            <Button variant="ghost" onClick={run.reject}>
              Cancelar
            </Button>
          </>
        )}
        {run.status === "awaiting_approval" && (
          <>
            <p>
              El ensayo de {run.plan.id} terminó ({run.result.summary}). Falta tu confirmación para aplicar el cambio
              destructivo.
            </p>
            <Button variant="danger" onClick={run.approve}>
              Confirmar y aplicar
            </Button>
            <Button variant="ghost" onClick={run.reject}>
              Descartar
            </Button>
          </>
        )}
        {run.status === "done" && (
          <p>
            {run.plan.id} aplicado ({run.result.summary}).
          </p>
        )}
        {run.status === "error" && (
          <p>
            Falló {run.plan.id}: {run.error.message}
          </p>
        )}
      </div>
    </section>
  );
}
