import "./TriajeEmergenciasView.css";

type CampoSigno = { id: string; etiqueta: string; unidad?: string };
type Medicion = {
  id: string;
  fecha: string;
  valores: Record<string, string | number | undefined>;
  mediciones?: readonly { id: string; nombre: string; valor?: string | number }[];
  observacion?: string;
};

export function TablaEvolucionSignos({ campos, mediciones }: {
  campos: readonly CampoSigno[];
  mediciones: readonly Medicion[];
}) {
  return (
    <section className="em-signos-evolucion-tabla" aria-label="Tabla de evolución de signos vitales">
      <header>
        <h4>Evolución por hora</h4>
        <span>{mediciones.length} {mediciones.length === 1 ? "medición registrada" : "mediciones registradas"}</span>
      </header>
      {mediciones.length > 0 && campos.length > 0 ? (
        <div className="em-signos-tabla-contenedor" role="region" aria-label="Mediciones por hora" tabIndex={0}>
          <table className="em-signos-tabla em-signos-evolucion-matriz">
            <thead>
              <tr>
                <th scope="col">Signo vital</th>
                {mediciones.map(({ id, fecha }) => {
                  const momento = new Date(fecha);
                  return (
                    <th scope="col" key={id}>
                      <span>{momento.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      <small>{momento.toLocaleDateString("es-BO")}</small>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {campos.map((campo) => (
                <tr key={campo.id}>
                  <th scope="row">
                    <span>{campo.etiqueta}</span>
                    {campo.unidad && <small>{campo.unidad}</small>}
                  </th>
                  {mediciones.map((medicion) => {
                    const detalle = medicion.mediciones?.find((registro) =>
                      registro.id === campo.id || registro.nombre === campo.etiqueta);
                    const valor = detalle?.valor ?? medicion.valores[campo.id];
                    return <td key={medicion.id}><strong>{valor === undefined || valor === "" ? "—" : valor}</strong></td>;
                  })}
                </tr>
              ))}
              {mediciones.some((medicion) => medicion.observacion) && (
                <tr>
                  <th scope="row">Observaciones</th>
                  {mediciones.map(({ id, observacion }) => <td key={id} className="em-signos-observacion">{observacion || "—"}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : <p className="em-signos-evolucion-vacia">Aún no hay mediciones de signos vitales para mostrar.</p>}
    </section>
  );
}
