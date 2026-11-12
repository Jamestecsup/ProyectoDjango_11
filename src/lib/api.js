// A fake network (already written). There is no server: these functions answer after a delay, and in
// "failing" mode they reject, so the app can show its loading and error states. The real call to the course
// API (fetch + the person's token) arrives in week 12.
import { plans } from "../data/plans";

export const network = {
  delayMs: 900,
  // Open the app as http://localhost:5173/?fail=1 to start with the network down.
  failing: typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fail") === "1",
};

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/** The plans the agent proposed. Same format as the week 10 inbox: { id, op, risk, target, plan_hash, proposed_by }. */
export async function fetchPlans() {
  await wait(network.delayMs);
  if (network.failing) throw new Error("Sin conexión con la pasarela del agente");
  return plans.map((plan) => ({ ...plan, target: { ...plan.target } }));
}

/**
 * The agent runs a plan (a rehearsal first). Resolves with a summary of what it did.
 * It receives an AbortSignal: when it aborts, the promise rejects with an AbortError.
 */
export async function runAgent(plan, { signal } = {}) {
  await wait(network.delayMs, signal);
  if (network.failing) throw new Error(`La pasarela rechazó el plan ${plan.id}`);
  return { summary: `${plan.op} ensayado sobre ${plan.plan_hash}` };
}
