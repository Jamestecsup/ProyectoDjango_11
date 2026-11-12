import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import Header from "../components/Header";
import { plans } from "../data/plans";
import { deferred, makePlans, STORAGE_KEY } from "./fixtures";

// The App is ALREADY WRITTEN: these tests check that it works once your hooks do.
const counter = () => screen.getByRole("status", { name: "Contador de pendientes" });
const cards = () => screen.queryAllByRole("article");

describe("App · prueba de humo con los datos reales", () => {
  it("los datos tienen el formato del plan de la semana 8", () => {
    for (const plan of plans) {
      expect(plan.plan_hash).toMatch(/^[0-9a-f]{12}$/);
      expect(["R1", "R2"]).toContain(plan.risk);
      expect(plan.proposed_by).toBe("agente");
      expect(plan.op).toMatch(/^(exams|questions)_(create|destroy)$/);
    }
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(plans.length);
  });

  it("la cabecera solo necesita un número: se dibuja sin la lista de planes", () => {
    render(<Header pendingCount={3} />);
    expect(screen.getByRole("heading", { level: 1, name: "Los hooks del agente" })).toBeInTheDocument();
    expect(counter()).toHaveTextContent("Pendientes: 3");
  });
});

describe("App · carga con usePlans (cargando, datos y error)", () => {
  it("muestra el esqueleto mientras carga y los planes cuando llegan", async () => {
    const request = deferred();
    const fetchPlans = vi.fn(() => request.promise);
    render(<App fetchPlans={fetchPlans} runAgent={vi.fn()} />);

    expect(screen.getByRole("status", { name: "Cargando planes" })).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
    expect(counter()).toHaveTextContent("Pendientes: …");

    await act(async () => request.resolve(makePlans()));
    expect(screen.queryByRole("status", { name: "Cargando planes" })).not.toBeInTheDocument();
    expect(cards()).toHaveLength(4);
    expect(counter()).toHaveTextContent("Pendientes: 4");
  });

  it("si la red falla muestra el error y Reintentar vuelve a cargar", async () => {
    const user = userEvent.setup();
    const first = deferred();
    const second = deferred();
    const fetchPlans = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<App fetchPlans={fetchPlans} runAgent={vi.fn()} />);

    await act(async () => first.reject(new Error("Sin conexión con la pasarela")));
    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión con la pasarela");
    expect(screen.queryByRole("status", { name: "Cargando planes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(fetchPlans).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status", { name: "Cargando planes" })).toBeInTheDocument();

    await act(async () => second.resolve(makePlans()));
    expect(cards()).toHaveLength(4);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("App · elevar el estado: el contador de pendientes vive en App", () => {
  async function renderReady() {
    const request = deferred();
    const fetchPlans = vi.fn(() => request.promise);
    const utils = render(<App fetchPlans={fetchPlans} runAgent={vi.fn()} />);
    await act(async () => request.resolve(makePlans()));
    return { ...utils, fetchPlans };
  }

  it("al decidir un plan, el contador de la cabecera baja", async () => {
    const user = userEvent.setup();
    const { fetchPlans } = await renderReady();
    expect(counter()).toHaveTextContent("Pendientes: 4");

    const card = screen.getByRole("article", { name: "Plan T-02" });
    await user.click(within(card).getByRole("button", { name: "Aprobar" }));

    expect(counter()).toHaveTextContent("Pendientes: 3");
    expect(screen.getByText("Decididos: 1")).toBeInTheDocument();
    expect(fetchPlans).toHaveBeenCalledTimes(1); // decidir no vuelve a pedir los planes
  });

  it("rechazar también cuenta, y las decisiones sobreviven a recargar la página", async () => {
    const user = userEvent.setup();
    const first = await renderReady();
    await user.click(within(screen.getByRole("article", { name: "Plan T-04" })).getByRole("button", { name: "Rechazar" }));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual({ "T-04": "rejected" });
    first.unmount();

    await renderReady();
    expect(counter()).toHaveTextContent("Pendientes: 3");
    expect(screen.getByText("Decididos: 1")).toBeInTheDocument();
  });

  it("un plan aprobado aparece en el panel de ejecución del agente", async () => {
    const user = userEvent.setup();
    await renderReady();
    await user.click(within(screen.getByRole("article", { name: "Plan T-02" })).getByRole("button", { name: "Aprobar" }));
    expect(screen.getByRole("button", { name: "Ejecutar T-02" })).toBeInTheDocument();
  });
});
