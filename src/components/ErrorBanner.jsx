import Button from "./Button";

// Already written: what the person sees when the plans could not be loaded.
export default function ErrorBanner({ error, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <p>
        <strong>No se pudieron cargar los planes.</strong> {error?.message}
      </p>
      <Button variant="ghost" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
