// Esqueleto mientras carga cada sección de la app.
export default function Loading() {
  return (
    <div className="stack" aria-busy="true">
      <div className="skeleton" style={{ height: 36, width: "40%" }} />
      <div className="skeleton" style={{ height: 160 }} />
      <div className="grid grid-3">
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    </div>
  );
}
