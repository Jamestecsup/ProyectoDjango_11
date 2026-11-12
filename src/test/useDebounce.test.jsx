import { act, renderHook } from "@testing-library/react";
import useDebounce from "@hooks/useDebounce";

// Fake timers: the tests move the clock themselves, so they are instant and never flaky.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// The clock moves inside act(): that is what lets React apply the state change a timer causes.
const tick = (ms) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

// `seen` records every value the hook returned in every render, so a test can say "b was NEVER returned".
function setup(value = "a", delay = 300) {
  const seen = [];
  const utils = renderHook(
    (props) => {
      const debounced = useDebounce(props.value, props.delay);
      seen.push(debounced);
      return debounced;
    },
    { initialProps: { value, delay } }
  );
  return { ...utils, seen };
}

describe("useDebounce · el valor tranquilo", () => {
  it("en el primer dibujado devuelve el valor tal cual", () => {
    const { result, seen } = setup("a");
    expect(result.current).toBe("a");
    expect(seen[0]).toBe("a");
  });

  it("no cambia antes de que pasen delay ms y cambia justo al cumplirse", () => {
    const { result, rerender } = setup("a", 300);
    rerender({ value: "b", delay: 300 });
    expect(result.current).toBe("a");

    tick(299);
    expect(result.current).toBe("a");

    tick(1);
    expect(result.current).toBe("b");
  });

  it("sirve con cualquier tipo de valor (números, objetos)", () => {
    const first = { page: 1 };
    const second = { page: 2 };
    const { result, rerender } = renderHook((props) => useDebounce(props.value, 100), {
      initialProps: { value: first },
    });
    expect(result.current).toBe(first);
    rerender({ value: second });
    tick(100);
    expect(result.current).toBe(second);
  });
});

describe("useDebounce · cada cambio cancela el temporizador anterior", () => {
  it("un segundo cambio reinicia la cuenta: el valor intermedio no llega a devolverse", () => {
    const { result, rerender, seen } = setup("a", 300);
    rerender({ value: "b", delay: 300 });
    tick(200);
    rerender({ value: "c", delay: 300 });

    tick(299);
    expect(result.current).toBe("a"); // desde el cambio a "c" solo han pasado 299 ms

    tick(1);
    expect(result.current).toBe("c");
    expect(seen).not.toContain("b");
  });

  it("tres cambios seguidos devuelven solo el último", () => {
    const { result, rerender, seen } = setup("a", 300);
    for (const value of ["b", "c", "d"]) {
      rerender({ value, delay: 300 });
      tick(100);
    }
    tick(200);
    expect(result.current).toBe("d");
    expect(seen).not.toContain("b");
    expect(seen).not.toContain("c");
  });

  it("si el valor vuelve al de antes dentro del retardo, nunca se devuelve el intermedio", () => {
    const { result, rerender, seen } = setup("a", 300);
    rerender({ value: "b", delay: 300 });
    tick(100);
    rerender({ value: "a", delay: 300 });
    for (let ms = 0; ms < 1000; ms += 50) tick(50); // paso a paso: cada render intermedio quedaría registrado en `seen`
    expect(result.current).toBe("a");
    expect(seen).not.toContain("b");
  });

  it("si cambia delay se vuelve a contar desde cero con el nuevo retardo", () => {
    const { result, rerender } = setup("a", 300);
    rerender({ value: "b", delay: 300 });
    tick(200);
    rerender({ value: "b", delay: 500 });

    tick(499);
    expect(result.current).toBe("a");

    tick(1);
    expect(result.current).toBe("b");
  });
});

describe("useDebounce · limpieza al desmontar", () => {
  it("al desmontar justo después de montar no queda ningún temporizador", () => {
    const { unmount } = setup("a", 300);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("al desmontar con varios cambios en el aire no queda ningún temporizador vivo", () => {
    const { rerender, unmount } = setup("a", 300);
    rerender({ value: "b", delay: 300 });
    rerender({ value: "c", delay: 300 });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("tras desmontar, dejar correr el reloj no vuelve a dibujar el hook", () => {
    const { rerender, unmount, seen } = setup("a", 300);
    rerender({ value: "b", delay: 300 });
    unmount();
    const rendersAtUnmount = seen.length;

    tick(1000);
    expect(seen).toHaveLength(rendersAtUnmount);
  });
});
