import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import usePlans from "@hooks/usePlans";
import { deferred, makePlans } from "./fixtures";

// Controllable promises: the test decides WHEN each request answers, and in which order.
// plansA / plansB are two different answers, so a test can tell which one is on screen.
const plansA = makePlans().slice(0, 2);
const plansB = makePlans().slice(2);

const resolveWith = (request, value) =>
  act(async () => {
    request.resolve(value);
  });
const rejectWith = (request, error) =>
  act(async () => {
    request.reject(error);
  });

// Returns a fetchPlans mock that hands out the deferred requests one by one, in order.
function fakeFetch(...requests) {
  const fetchPlans = vi.fn();
  requests.forEach((request) => fetchPlans.mockReturnValueOnce(request.promise));
  return fetchPlans;
}

describe("usePlans · los tres estados", () => {
  it("empieza en loading, sin planes ni error, y pide los planes al montar", () => {
    const request = deferred();
    const fetchPlans = fakeFetch(request);
    const { result } = renderHook(() => usePlans(fetchPlans));

    expect(fetchPlans).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loading");
    expect(result.current.plans).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.reload).toBe("function");
  });

  it("al llegar los planes pasa a ready con los planes y sin error", async () => {
    const request = deferred();
    const fetchPlans = fakeFetch(request);
    const { result } = renderHook(() => usePlans(fetchPlans));
    await resolveWith(request, plansA);

    expect(result.current.status).toBe("ready");
    expect(result.current.plans).toEqual(plansA);
    expect(result.current.error).toBeNull();
  });

  it("si la petición falla pasa a error, con el error y sin planes", async () => {
    const request = deferred();
    const fetchPlans = fakeFetch(request);
    const { result } = renderHook(() => usePlans(fetchPlans));
    const failure = new Error("Sin conexión");
    await rejectWith(request, failure);

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(failure);
    expect(result.current.plans).toEqual([]);
  });

  it("no pide los planes otra vez en cada dibujado", async () => {
    const request = deferred();
    const fetchPlans = fakeFetch(request);
    const { rerender } = renderHook(() => usePlans(fetchPlans));
    await resolveWith(request, plansA);
    rerender();
    rerender();
    expect(fetchPlans).toHaveBeenCalledTimes(1);
  });
});

describe("usePlans · reload", () => {
  it("reload() vuelve a loading, pide otra vez y termina en ready con los planes nuevos", async () => {
    const first = deferred();
    const second = deferred();
    const fetchPlans = fakeFetch(first, second);
    const { result } = renderHook(() => usePlans(fetchPlans));
    await resolveWith(first, plansA);

    act(() => result.current.reload());
    expect(fetchPlans).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("loading");
    expect(result.current.plans).toEqual([]);

    await resolveWith(second, plansB);
    expect(result.current.status).toBe("ready");
    expect(result.current.plans).toEqual(plansB);
  });

  it("después de un error, reload() limpia el error y puede terminar bien", async () => {
    const first = deferred();
    const second = deferred();
    const fetchPlans = fakeFetch(first, second);
    const { result } = renderHook(() => usePlans(fetchPlans));
    await rejectWith(first, new Error("Sin conexión"));
    expect(result.current.status).toBe("error");

    act(() => result.current.reload());
    expect(result.current.status).toBe("loading");
    expect(result.current.error).toBeNull();

    await resolveWith(second, plansA);
    expect(result.current.status).toBe("ready");
    expect(result.current.plans).toEqual(plansA);
  });

  it("reload mantiene la misma identidad entre dibujados", async () => {
    const request = deferred();
    const fetchPlans = fakeFetch(request);
    const { result, rerender } = renderHook(() => usePlans(fetchPlans));
    const firstReload = result.current.reload;
    rerender();
    expect(result.current.reload).toBe(firstReload);
  });
});

describe("usePlans · ignora la respuesta vieja (carrera de peticiones)", () => {
  it("si la primera respuesta llega DESPUÉS de la segunda, no pisa a la nueva", async () => {
    const first = deferred();
    const second = deferred();
    const fetchPlans = fakeFetch(first, second);
    const { result } = renderHook(() => usePlans(fetchPlans));

    act(() => result.current.reload()); // la primera petición sigue en el aire
    await resolveWith(second, plansB);
    expect(result.current.plans).toEqual(plansB);

    await resolveWith(first, plansA); // llega tarde
    expect(result.current.status).toBe("ready");
    expect(result.current.plans).toEqual(plansB);
  });

  it("si la primera FALLA tarde, el error viejo no pisa los planes nuevos", async () => {
    const first = deferred();
    const second = deferred();
    const fetchPlans = fakeFetch(first, second);
    const { result } = renderHook(() => usePlans(fetchPlans));

    act(() => result.current.reload());
    await resolveWith(second, plansB);
    await rejectWith(first, new Error("Tarde y roto"));

    expect(result.current.status).toBe("ready");
    expect(result.current.plans).toEqual(plansB);
    expect(result.current.error).toBeNull();
  });

  it("si cambia la función fetchPlans, la respuesta de la anterior se ignora", async () => {
    const old = deferred();
    const fresh = deferred();
    const oldFetch = fakeFetch(old);
    const newFetch = fakeFetch(fresh);
    const { result, rerender } = renderHook((props) => usePlans(props.fetchPlans), {
      initialProps: { fetchPlans: oldFetch },
    });

    rerender({ fetchPlans: newFetch });
    expect(newFetch).toHaveBeenCalledTimes(1);
    await resolveWith(fresh, plansB);
    await resolveWith(old, plansA);

    expect(result.current.plans).toEqual(plansB);
  });

  it("con StrictMode (como en desarrollo) el efecto corre dos veces y gana la respuesta de la segunda", async () => {
    const first = deferred();
    const second = deferred();
    const fetchPlans = fakeFetch(first, second);
    const { result } = renderHook(() => usePlans(fetchPlans), { wrapper: StrictMode });
    expect(fetchPlans).toHaveBeenCalledTimes(2);

    await resolveWith(second, plansB);
    await resolveWith(first, plansA);

    expect(result.current.status).toBe("ready");
    expect(result.current.plans).toEqual(plansB);
  });
});

describe("usePlans · desmontar", () => {
  it("si la respuesta llega después de desmontar, no pasa nada", async () => {
    const request = deferred();
    const fetchPlans = fakeFetch(request);
    const { unmount } = renderHook(() => usePlans(fetchPlans));
    unmount();
    await expect(resolveWith(request, plansA)).resolves.not.toThrow();
  });
});
