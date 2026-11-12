import { useState } from "react";
import Icon from "../../radius/componentes/Icono";
import "./RevisionConsulta.css";

const sistemas = [
  ["general", "Estado general", "Aspecto general y estado de conciencia"],
  [
    "cabeza",
    "Cabeza y cuello",
    "Cabeza, cara, ojos, oídos, nariz, boca y cuello",
  ],
  [
    "respiratorio",
    "Sistema respiratorio",
    "Vías respiratorias, tórax y pulmones",
  ],
  [
    "cardiovascular",
    "Sistema cardiovascular",
    "Corazón, circulación y pulsos periféricos",
  ],
  ["digestivo", "Sistema digestivo", "Abdomen y aparato digestivo"],
  [
    "genitourinario",
    "Sistema genitourinario",
    "Región renal, vías urinarias y genitales",
  ],
  [
    "neurologico",
    "Sistema neurológico",
    "Orientación, sensibilidad y función motora",
  ],
  [
    "musculoesqueletico",
    "Sistema musculoesquelético",
    "Columna, extremidades, músculos y articulaciones",
  ],
  ["piel", "Piel y tejidos blandos", "Piel, mucosas y tejido subcutáneo"],
] as const;
const opciones = [
  "Estable",
  "Con dolor",
  "Alteración observada",
  "No evaluable",
  "Otro",
];
const opcionesEstadoGeneral = [
  "Náuseas",
  "Vómitos",
  "Fiebre",
  "Escalofríos",
  "Mareos",
];
type RegistroRevision = { estados: string[]; detalle: string };
const registroVacio: RegistroRevision = { estados: [], detalle: "" };

function leerRegistros(
  storageKey?: string,
): Record<string, RegistroRevision> {
  if (!storageKey) return {};
  try {
    const almacenado: unknown = JSON.parse(
      sessionStorage.getItem(storageKey) || "{}",
    );
    if (
      typeof almacenado !== "object" ||
      almacenado === null ||
      Array.isArray(almacenado)
    )
      return {};
    return sistemas.reduce<Record<string, RegistroRevision>>(
      (resultado, [id]) => {
        const entrada = (almacenado as Record<string, unknown>)[id];
        if (typeof entrada === "string") {
          resultado[id] = { estados: [], detalle: entrada === "Negativo" ? "" : entrada };
        } else if (typeof entrada === "object" && entrada !== null) {
          const registro = entrada as Record<string, unknown>;
          const detalle =
            typeof registro.detalle === "string" ? registro.detalle.trim() : "";
          const opcionesValidas =
            id === "general" ? opcionesEstadoGeneral : opciones;
          const estados = Array.isArray(registro.estados)
            ? registro.estados.filter(
                (estado): estado is string =>
                  typeof estado === "string" && opcionesValidas.includes(estado),
              )
            : [];
          resultado[id] = { estados, detalle };
        }
        return resultado;
      },
      {},
    );
  } catch {
    return {};
  }
}

export function RevisionConsulta({
  pacienteId,
  cerrada = false,
  storageKey,
}: {
  pacienteId: string;
  cerrada?: boolean;
  storageKey?: string;
}) {
  const [registros, setRegistros] = useState<
    Record<string, RegistroRevision>
  >(() =>
    leerRegistros(storageKey),
  );
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const actualizar = (id: string, registro: RegistroRevision) => {
    const siguientes = { ...registros, [id]: registro };
    setRegistros(siguientes);
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(siguientes));
      setError("");
    } catch {
      setError(
        "No se pudo guardar localmente. No cierres esta pestaña antes de recuperar el texto.",
      );
    }
  };
  const marcar = (id: string, opcion: string) => {
    const registro = registros[id] || registroVacio;
    let estados = registro.estados.includes(opcion)
      ? registro.estados.filter((estado) => estado !== opcion)
      : [...registro.estados, opcion];
    if (id !== "general" && estados.includes(opcion))
      estados = ["Estable", "No evaluable"].includes(opcion)
        ? [opcion]
        : estados.filter(
            (estado) => !["Estable", "No evaluable"].includes(estado),
          );
    actualizar(id, { ...registro, estados });
  };
  return (
    <details className="consulta-seguimiento-panel consulta-revision-sistemas">
      <summary>
        <span>Revisión por sistema · Examen físico</span>
        <Icon name="chevronRight" size={18} />
      </summary>
      <div className="consulta-revision-contenido">
        <div className="revision-compacta" aria-label="Revisión por sistema">
          {sistemas.map((sistema) => {
            const [id, nombre] = sistema;
            const opcionesSistema =
              id === "general" ? opcionesEstadoGeneral : opciones;
            const registro = registros[id] || registroVacio;
            const expandido = abierto === id;
            const resumen = registro.estados.length
              ? registro.estados.join(", ")
              : registro.detalle
                ? "Observación registrada"
                : "Negativo";
            const panelId = `revision-sistema-${pacienteId}-${id}`;
            return (
              <section className="revision-sistema-item" key={panelId}>
                <button
                  type="button"
                  className="revision-sistema-fila"
                  aria-expanded={expandido}
                  aria-controls={panelId}
                  onClick={() => setAbierto(expandido ? null : id)}
                >
                  <strong>{nombre}</strong>
                  <span
                    className={
                      registro.estados.length || registro.detalle
                        ? "revision-sistema-observacion"
                        : "revision-sistema-negativo"
                    }
                  >
                    {resumen}
                    {registro.detalle && (
                      <small className="revision-sistema-detalle">
                        {registro.detalle}
                      </small>
                    )}
                  </span>
                  <Icon name="chevronRight" size={15} />
                </button>
                {expandido && (
                  <div
                    className="revision-sistema-edicion"
                    id={panelId}
                  >
                    <fieldset
                      className="revision-sistema-estados"
                      disabled={cerrada}
                    >
                      <legend>Estado</legend>
                      <div className="revision-sistema-opciones">
                        {opcionesSistema.map((opcion) => (
                          <label
                            key={opcion}
                            className={
                              registro.estados.includes(opcion)
                                ? "seleccionada"
                                : ""
                            }
                          >
                            <input
                              type="checkbox"
                              checked={registro.estados.includes(opcion)}
                              onChange={() => marcar(id, opcion)}
                            />
                            {opcion}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="revision-sistema-descripcion">
                      {registro.estados.includes("Otro")
                        ? "Especificar otro hallazgo"
                        : id === "general"
                          ? "Anotaciones"
                          : "Observaciones"}
                      <textarea
                        rows={3}
                        maxLength={3000}
                        value={registro.detalle}
                        disabled={cerrada}
                        onChange={(evento) =>
                          actualizar(id, {
                            ...registro,
                            detalle: evento.target.value,
                          })
                        }
                        placeholder={
                          registro.estados.includes("Otro")
                            ? "Describe el estado o hallazgo no incluido en las opciones…"
                            : id === "general"
                              ? "Anota otros síntomas o detalles relevantes…"
                              : "Localización, características y otros hallazgos…"
                        }
                      />
                    </label>
                  </div>
                )}
              </section>
            );
          })}
        </div>
        {error && (
          <p className="revision-sistema-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
