import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Inbox from "../components/Inbox";
import { deferred, makePlans } from "./fixtures";

// The Inbox is ALREADY WRITTEN: these tests check that it works once your hooks do.
// T-01 exams_destroy (R2) · T-02 questions_create (R1) · T-03 questions_destroy (R2) · T-04 questions_create (R1)
const pendingRegion = () => screen.getByRole("region", { name: "Pendientes" });
const decidedRegion = () => screen.getByRole("region", { name: "Decididos" });
const runRegion = () => screen.getByRole("region", { name: "Ejecución del agente" });
const searchBox = () => screen.getByRole("searchbox", { name: /buscar/i });
const pendingIds = () =>
  within(pendingRegion())
    .queryAllByRole("article")
    .map((article) => article.getAttribute("aria-label").replace("Plan ", ""));

function renderInbox({ decisions = {}, onDecide = vi.fn(), runAgent = vi.fn() } = {}) {
  render(<Inbox plans={makePlans()} decisions={decisions} onDecide={onDecide} runAgent={runAgent} />);
  return { onDecide, runAgent };
}

describe("Inbox · decidir (las decisiones llegan por props)", () => {
  it("separa pendientes y decididos según decisions", () => {
    renderInbox({ decisions: { "T-02": "approved", "T-03": "rejected" } });
    expect(pendingIds()).toEqual(["T-01", "T-04"]);
    const items = within(decidedRegion()).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Aprobado");
    expect(items[1]).toHaveTextContent("Rechazado");
    expect(screen.getByText("Decididos: 2")).toBeInTheDocument();
  });

  it("aprobar un plan R1 avisa al padre con onDecide(id, 'approved')", async () => {
    const user = userEvent.setup();
    const { onDecide } = renderInbox();
    const card = within(pendingRegion()).getByRole("article", { name: "Plan T-02" });
    await user.click(within(card).getByRole("button", { name: "Aprobar" }));
    expect(onDecide).toHaveBeenCalledWith("T-02", "approved");
  });

  it("aprobar un plan R2 exige el hash exacto", async () => {
    const user = userEvent.setup();
    const { onDecide } = renderInbox();
    const card = within(pendingRegion()).getByRole("article", { name: "Plan T-01" });
    expect(within(card).getByRole("button", { name: "Aprobar" })).toBeDisabled();
    await user.type(within(card).getByRole("textbox", { name: /hash/i }), "a1b2c3d4e5f6");
    await user.click(within(card).getByRole("button", { name: "Aprobar" }));
    expect(onDecide).toHaveBeenCalledWith("T-01", "approved");
  });
});

describe("Inbox · el buscador usa useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("el campo muestra lo escrito al instante, pero la lista espera 300 ms", () => {
    renderInbox();
    fireEvent.change(searchBox(), { target: { value: "values" } });
    expect(searchBox()).toHaveValue("values");
    expect(pendingIds()).toEqual(["T-01", "T-02", "T-03", "T-04"]);

    act(() => vi.advanceTimersByTime(299));
    expect(pendingIds()).toEqual(["T-01", "T-02", "T-03", "T-04"]);

    act(() => vi.advanceTimersByTime(1));
    expect(pendingIds()).toEqual(["T-02"]);
  });

  it("sin coincidencias muestra el estado vacío y Limpiar búsqueda devuelve la lista", () => {
    renderInbox();
    fireEvent.change(searchBox(), { target: { value: "no existe" } });
    act(() => vi.advanceTimersByTime(300));
    expect(within(pendingRegion()).getByText("No hay planes que coincidan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(searchBox()).toHaveValue("");
    act(() => vi.advanceTimersByTime(300));
    expect(pendingIds()).toHaveLength(4);
  });
});

describe("Inbox · ejecución del agente con useAgentRun", () => {
  const approved = { "T-02": "approved", "T-01": "approved" };

  it("sin planes aprobados no hay nada que ejecutar", () => {
    renderInbox();
    expect(within(runRegion()).getByText("Aprueba un plan para poder ejecutarlo.")).toBeInTheDocument();
    expect(within(runRegion()).getByText("Sin ejecución en curso.")).toBeInTheDocument();
  });

  it("un plan R1 aprobado se ejecuta y termina aplicado, sin confirmación extra", async () => {
    const user = userEvent.setup();
    const request = deferred();
    renderInbox({ decisions: approved, runAgent: vi.fn(() => request.promise) });

    await user.click(within(runRegion()).getByRole("button", { name: "Ejecutar T-02" }));
    expect(within(runRegion()).getByText("Ejecutando T-02…")).toBeInTheDocument();
    expect(within(runRegion()).getByRole("button", { name: "Ejecutar T-01" })).toBeDisabled();

    await act(async () => request.resolve({ summary: "ok" }));
    expect(within(runRegion()).getByText("T-02 aplicado (ok).")).toBeInTheDocument();
  });

  it("un plan R2 aprobado espera una última confirmación antes de aplicarse", async () => {
    const user = userEvent.setup();
    const request = deferred();
    renderInbox({ decisions: approved, runAgent: vi.fn(() => request.promise) });

    await user.click(within(runRegion()).getByRole("button", { name: "Ejecutar T-01" }));
    await act(async () => request.resolve({ summary: "ensayo" }));

    expect(within(runRegion()).getByText(/Falta tu confirmación/)).toBeInTheDocument();
    expect(within(runRegion()).queryByText(/T-01 aplicado/)).not.toBeInTheDocument();

    await user.click(within(runRegion()).getByRole("button", { name: "Confirmar y aplicar" }));
    expect(within(runRegion()).getByText("T-01 aplicado (ensayo).")).toBeInTheDocument();
  });

  it("Descartar vuelve al reposo sin aplicar nada", async () => {
    const user = userEvent.setup();
    const request = deferred();
    renderInbox({ decisions: approved, runAgent: vi.fn(() => request.promise) });

    await user.click(within(runRegion()).getByRole("button", { name: "Ejecutar T-01" }));
    await act(async () => request.resolve({ summary: "ensayo" }));
    await user.click(within(runRegion()).getByRole("button", { name: "Descartar" }));

    expect(within(runRegion()).getByText("Sin ejecución en curso.")).toBeInTheDocument();
    expect(within(runRegion()).queryByText(/aplicado/)).not.toBeInTheDocument();
  });

  it("si el agente falla, lo dice", async () => {
    const user = userEvent.setup();
    const request = deferred();
    renderInbox({ decisions: approved, runAgent: vi.fn(() => request.promise) });

    await user.click(within(runRegion()).getByRole("button", { name: "Ejecutar T-02" }));
    await act(async () => request.reject(new Error("pasarela caída")));
    expect(within(runRegion()).getByText("Falló T-02: pasarela caída")).toBeInTheDocument();
  });
});
