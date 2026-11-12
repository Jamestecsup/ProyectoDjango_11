import { act, renderHook } from "@testing-library/react";
import useAgentRun from "@hooks/useAgentRun";
import { deferred, makePlans } from "./fixtures";

// T-01 exams_destroy (R2) · T-02 questions_create (R1) · T-03 questions_destroy (R2)
const [R2, R1, OTHER_R2] = makePlans();

const finish = (request, value) =>
  act(async () => {
    request.resolve(value);
  });
const fail = (request, error) =>
  act(async () => {
    request.reject(error);
  });

// `seen` records the status of EVERY render: it is how a test proves that a state was (or was not) visited.
function setup(runAgent) {
  const seen = [];
  const utils = renderHook(
    (props) => {
      const run = useAgentRun(props.runAgent);
      if (seen.at(-1) !== run.status) seen.push(run.status);
      return run;
    },
    { initialProps: { runAgent } }
  );
  return { ...utils, seen };
}

// A runAgent mock that hands out one deferred answer per call.
function fakeAgent() {
  const requests = [];
  const runAgent = vi.fn(() => {
    const request = deferred();
    requests.push(request);
    return request.promise;
  });
  return { runAgent, requests };
}

describe("useAgentRun · punto de partida", () => {
  it("empieza en idle, sin plan, resultado ni error, y expone start, approve y reject", () => {
    const { result } = setup(fakeAgent().runAgent);
    expect(result.current).toMatchObject({ status: "idle", plan: null, result: null, error: null });
    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.approve).toBe("function");
    expect(typeof result.current.reject).toBe("function");
  });

  it("approve() y reject() en idle no hacen nada", () => {
    const { result } = setup(fakeAgent().runAgent);
    act(() => result.current.approve());
    act(() => result.current.reject());
    expect(result.current.status).toBe("idle");
  });
});

describe("useAgentRun · un plan R1", () => {
  it("start(plan) pasa a running y llama a runAgent con el plan y una señal sin abortar", () => {
    const { runAgent } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R1));

    expect(result.current.status).toBe("running");
    expect(result.current.plan).toBe(R1);
    expect(runAgent).toHaveBeenCalledTimes(1);
    const [plan, options] = runAgent.mock.calls[0];
    expect(plan).toBe(R1);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(false);
  });

  it("al terminar bien va directo a done con el resultado, sin pedir aprobación", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result, seen } = setup(runAgent);
    act(() => result.current.start(R1));
    await finish(requests[0], { summary: "listo" });

    expect(result.current.status).toBe("done");
    expect(result.current.result).toEqual({ summary: "listo" });
    expect(seen).toEqual(["idle", "running", "done"]);
  });
});

describe("useAgentRun · un plan R2 no se aplica sin aprobación", () => {
  it("al terminar bien pasa a awaiting_approval (guarda el resultado) y NO a done", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result, seen } = setup(runAgent);
    act(() => result.current.start(R2));
    await finish(requests[0], { summary: "ensayo" });

    expect(result.current.status).toBe("awaiting_approval");
    expect(result.current.result).toEqual({ summary: "ensayo" });
    expect(result.current.plan).toBe(R2);
    expect(seen).not.toContain("done");
  });

  it("solo approve() lo lleva a done, y pasa por todos los estados en orden", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result, seen } = setup(runAgent);
    act(() => result.current.start(R2));
    await finish(requests[0], { summary: "ensayo" });
    act(() => result.current.approve());

    expect(result.current.status).toBe("done");
    expect(result.current.result).toEqual({ summary: "ensayo" });
    expect(seen).toEqual(["idle", "running", "awaiting_approval", "done"]);
  });

  it("approve() mientras corre no salta la barrera: al terminar sigue pidiendo aprobación", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result, seen } = setup(runAgent);
    act(() => result.current.start(R2));
    act(() => result.current.approve()); // demasiado pronto
    expect(result.current.status).toBe("running");

    await finish(requests[0], { summary: "ensayo" });
    expect(result.current.status).toBe("awaiting_approval");
    expect(seen).not.toContain("done");
  });

  it("reject() en awaiting_approval descarta el resultado y vuelve a idle", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R2));
    await finish(requests[0], { summary: "ensayo" });
    act(() => result.current.reject());

    expect(result.current).toMatchObject({ status: "idle", plan: null, result: null, error: null });
  });

  it("approve() dos veces seguidas no vuelve a hacer nada raro", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R2));
    await finish(requests[0], { summary: "ensayo" });
    act(() => result.current.approve());
    act(() => result.current.approve());
    expect(result.current.status).toBe("done");
  });
});

describe("useAgentRun · cancelar, fallar y reintentar", () => {
  it("reject() mientras corre aborta la señal, vuelve a idle y descarta lo que llegue después", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R1));
    const { signal } = runAgent.mock.calls[0][1];

    act(() => result.current.reject());
    expect(signal.aborted).toBe(true);
    expect(result.current.status).toBe("idle");

    await finish(requests[0], { summary: "tarde" });
    expect(result.current).toMatchObject({ status: "idle", plan: null, result: null });
  });

  it("si runAgent falla pasa a error, con el error y el plan", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R2));
    const failure = new Error("La pasarela rechazó el plan");
    await fail(requests[0], failure);

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(failure);
    expect(result.current.plan).toBe(R2);
  });

  it("con una ejecución en curso, start() no lanza otra", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R1));
    act(() => result.current.start(OTHER_R2));
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(result.current.plan).toBe(R1);

    await finish(requests[0], { summary: "uno" });
    act(() => result.current.start(R2)); // R1 terminó: ya se puede otra
    expect(runAgent).toHaveBeenCalledTimes(2);
  });

  it("esperando aprobación tampoco se puede lanzar otra ejecución", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R2));
    await finish(requests[0], { summary: "ensayo" });
    act(() => result.current.start(R1));
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("awaiting_approval");
  });

  it("después de un error se puede volver a empezar con otro plan", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result } = setup(runAgent);
    act(() => result.current.start(R1));
    await fail(requests[0], new Error("roto"));
    act(() => result.current.start(OTHER_R2));

    expect(result.current).toMatchObject({ status: "running", error: null, result: null });
    expect(result.current.plan).toBe(OTHER_R2);
  });
});

describe("useAgentRun · limpieza al desmontar", () => {
  it("al desmontar con una ejecución en curso aborta su señal", () => {
    const { runAgent } = fakeAgent();
    const { result, unmount } = setup(runAgent);
    act(() => result.current.start(R1));
    const { signal } = runAgent.mock.calls[0][1];
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("si la respuesta llega después de desmontar, no pasa nada", async () => {
    const { runAgent, requests } = fakeAgent();
    const { result, unmount } = setup(runAgent);
    act(() => result.current.start(R2));
    unmount();
    await expect(finish(requests[0], { summary: "tarde" })).resolves.not.toThrow();
  });
});

describe("useAgentRun · las reglas de los hooks", () => {
  it("sin runAgent se queda en idle y start() no hace nada", () => {
    const { result } = setup(undefined);
    act(() => result.current.start(R1));
    expect(result.current.status).toBe("idle");
  });

  it("si runAgent aparece en un dibujado posterior, el hook no se rompe y funciona", async () => {
    // Un hook llamado de forma condicional hace que React lance «Rendered more hooks than during the previous render».
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, rerender } = setup(undefined);
    expect(result.current.status).toBe("idle");

    const { runAgent, requests } = fakeAgent();
    expect(() => rerender({ runAgent })).not.toThrow();

    act(() => result.current.start(R1));
    expect(result.current.status).toBe("running");
    await finish(requests[0], { summary: "listo" });
    expect(result.current.status).toBe("done");
    errorLog.mockRestore();
  });
});
