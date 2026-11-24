import type { FormEventHandler, ReactNode } from "react";
import "./TriajeEmergenciasView.css";

type FechaHora = { fecha: string; hora: string };
type CampoSigno = { id: string; etiqueta: string; unidad?: string; tipo?: string };

export function FormularioSignosVitales({
  campos, fechaHora, valores, observacion, onFechaHora, onValor, onObservacion,
  onSubmit, deshabilitado, estadoCampos, error,
}: {
  campos: readonly CampoSigno[];
  fechaHora: FechaHora;
  valores: Record<string, string>;
  observacion: string;
  onFechaHora: (valor: FechaHora) => void;
  onValor: (id: string, valor: string) => void;
  onObservacion: (valor: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  deshabilitado?: boolean;
  estadoCampos?: ReactNode;
  error?: string;
}) {
  return (
    <form className="em-signos-formulario em-registro-signos" onSubmit={onSubmit}>
      <h4>Registrar signos vitales</h4>
      <div className="em-signos-fecha-hora">
        <label>
          Fecha de la medición
          <input type="date" required value={fechaHora.fecha} onChange={(e) => onFechaHora({ ...fechaHora, fecha: e.target.value })} />
        </label>
        <label>
          Hora de la medición
          <input type="time" required value={fechaHora.hora} onChange={(e) => onFechaHora({ ...fechaHora, hora: e.target.value })} />
        </label>
      </div>
      <div className="em-form-grid em-signos">
        {campos.map(({ id, etiqueta, unidad, tipo }) => (
          <label key={id}>
            {etiqueta}
            <span>
              <input
                type={tipo === "Texto" ? "text" : "number"}
                step={tipo === "Número entero" ? "1" : "any"}
                value={valores[id] ?? ""}
                onChange={(e) => onValor(id, e.target.value)}
              />
              {unidad}
            </span>
          </label>
        ))}
        {estadoCampos}
      </div>
      <label>
        Observación o motivo de medición no disponible
        <textarea value={observacion} maxLength={1000} onChange={(e) => onObservacion(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="em-acciones">
        <button type="submit" className="em-primario" disabled={deshabilitado}>Guardar signos vitales</button>
      </div>
    </form>
  );
}
