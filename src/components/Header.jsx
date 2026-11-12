// Already written. The header only receives the NUMBER it shows, never the list of plans:
// it does not need the list, and it must not be re-drawn because of it. `pendingCount` is null while loading.
export default function Header({ pendingCount }) {
  return (
    <header className="app-header">
      <div className="app-header-top">
        <h1>Los hooks del agente</h1>
        <p className="pending-counter" role="status" aria-label="Contador de pendientes">
          Pendientes: {pendingCount ?? "…"}
        </p>
      </div>
      <p>
        Un agente de IA propone planes y una persona decide. Lo destructivo (R2) no se aprueba con un clic: hay que
        escribir el hash del plan, y ni siquiera un plan aprobado se aplica sin una última confirmación.
      </p>
      <p className="note">
        Todo es local: la red es simulada (src/lib/api.js). El límite de verdad lo impone el servidor (semana 8);
        aquí solo ayudamos a la persona a decidir bien.
      </p>
    </header>
  );
}
