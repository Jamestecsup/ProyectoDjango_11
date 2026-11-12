// Already written: what the person sees while the plans are loading.
export default function PlansSkeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Cargando planes">
      {[0, 1, 2].map((n) => (
        <div key={n} className="skeleton-card" aria-hidden="true">
          <span className="skeleton-line skeleton-title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-short" />
        </div>
      ))}
    </div>
  );
}
