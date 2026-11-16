import Icon from "../../radius/componentes/Icono";
import "./AntecedentesConsulta.css";

export type DatosAntecedentesConsulta = {
  vivienda: string;
  serviciosBasicos: string;
  alimentacion: string;
  habitos: string;
  hipertension: string;
  diabetes: string;
  tuberculosis: string;
  chagas: string;
  cardiopatia: string;
  asma: string;
  epoc: string;
  enfermedadRenal: string;
  otroPatologico: string;
  quirurgicos: string;
  alergicos: string;
  familiares: string;
};

export const antecedentesConsultaVacios: DatosAntecedentesConsulta = {
  vivienda: "",
  serviciosBasicos: "",
  alimentacion: "",
  habitos: "",
  hipertension: "",
  diabetes: "",
  tuberculosis: "",
  chagas: "",
  cardiopatia: "",
  asma: "",
  epoc: "",
  enfermedadRenal: "",
  otroPatologico: "",
  quirurgicos: "",
  alergicos: "",
  familiares: "",
};

const sociales: { id: keyof DatosAntecedentesConsulta; etiqueta: string; opciones: string[] }[] = [
  { id: "vivienda", etiqueta: "Vivienda", opciones: ["Propia", "Alquilada", "Familiar o compartida", "Otra", "No refiere", "Desconocido"] },
  { id: "serviciosBasicos", etiqueta: "Acceso a servicios básicos", opciones: ["Cuenta con agua, electricidad y saneamiento", "Acceso parcial", "Sin acceso", "No refiere", "Desconocido"] },
  { id: "alimentacion", etiqueta: "Alimentación", opciones: ["Sin restricciones referidas", "Con restricciones alimentarias", "Dieta especial", "No refiere", "Desconocido"] },
  { id: "habitos", etiqueta: "Hábitos", opciones: ["Sin consumo referido", "Tabaco", "Alcohol", "Tabaco y alcohol", "Otros hábitos referidos", "No refiere", "Desconocido"] },
];

const gruposAdicionales = [
  { id: "quirurgicos", titulo: "Antecedentes quirúrgicos", opciones: ["Sin cirugías referidas", "Cirugía previa", "Múltiples cirugías previas", "No refiere", "Desconocido"] },
  { id: "alergicos", titulo: "Antecedentes alérgicos", opciones: ["Sin alergias referidas", "Alergia a medicamentos", "Alergia a alimentos", "Alergia ambiental", "Múltiples alergias", "Otra alergia", "No refiere", "Desconocido"] },
  { id: "familiares", titulo: "Antecedentes familiares", opciones: ["Sin antecedentes referidos", "Hipertensión", "Diabetes", "Cardiopatía", "Cáncer", "Múltiples antecedentes", "Otro antecedente", "No refiere", "Desconocido"] },
] as const;

const patologicos: { id: keyof DatosAntecedentesConsulta; etiqueta: string }[] = [
  { id: "hipertension", etiqueta: "Hipertensión" },
  { id: "diabetes", etiqueta: "Diabetes mellitus" },
  { id: "tuberculosis", etiqueta: "Tuberculosis" },
  { id: "chagas", etiqueta: "Chagas" },
  { id: "cardiopatia", etiqueta: "Cardiopatía" },
  { id: "asma", etiqueta: "Asma" },
  { id: "epoc", etiqueta: "EPOC" },
  { id: "enfermedadRenal", etiqueta: "Enfermedad renal" },
];

export function AntecedentesConsulta({
  value,
  onChange,
  onSave,
  disabled = false,
  saving = false,
  status = "",
  error = "",
}: {
  value: DatosAntecedentesConsulta;
  onChange: (value: DatosAntecedentesConsulta) => void;
  onSave: () => void;
  disabled?: boolean;
  saving?: boolean;
  status?: string;
  error?: string;
}) {
  const setCampo = (id: keyof DatosAntecedentesConsulta, dato: string) =>
    onChange({ ...value, [id]: dato });
  const resumen = (campos: { id: keyof DatosAntecedentesConsulta; etiqueta: string }[]) =>
    campos.filter((campo) => value[campo.id]?.trim()).map((campo) => `${campo.etiqueta}: ${value[campo.id]}`).join(" · ") || "Sin datos registrados";
  const selector = (id: keyof DatosAntecedentesConsulta, opciones: readonly string[]) => (
    <select value={value[id] || ""} disabled={disabled || saving} onChange={(event) => setCampo(id, event.target.value)}>
      <option value="">Sin registrar</option>
      {value[id] && !opciones.includes(value[id]) && <option value={value[id]}>{value[id]} (registro anterior)</option>}
      {opciones.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
    </select>
  );

  return (
    <details className="consulta-antecedentes-estructurados consulta-seguimiento-panel">
      <summary><span>Antecedentes</span><Icon name="chevronRight" size={18} /></summary>
      <div className="consulta-antecedentes-contenido">
      <div className="consulta-antecedentes-grupos">
        <details>
          <summary><strong>Antecedentes sociales</strong><span>{resumen(sociales)}</span><Icon name="chevronRight" size={15} /></summary>
          <div className="consulta-antecedentes-campos">
            {sociales.map((campo) => (
              <label key={campo.id}>
                {campo.etiqueta}
                {selector(campo.id, campo.opciones)}
              </label>
            ))}
          </div>
        </details>
        <details>
          <summary><strong>Antecedentes patológicos</strong><span>{resumen([...patologicos, { id: "otroPatologico", etiqueta: "Otro" }])}</span><Icon name="chevronRight" size={15} /></summary>
          <div className="consulta-antecedentes-campos">
            {patologicos.map((campo) => (
              <label key={campo.id}>
                {campo.etiqueta}
                {selector(campo.id, ["Sí", "No", "No refiere", "Desconocido"])}
              </label>
            ))}
            <label>
              Otro antecedente
              {selector("otroPatologico", ["Sin otros antecedentes referidos", "Otro antecedente referido", "No refiere", "Desconocido"])}
            </label>
          </div>
        </details>
        {gruposAdicionales.map(({ id, titulo, opciones }) => (
          <details key={id}>
            <summary><strong>{titulo}</strong><span>{value[id]?.trim() || "Sin datos registrados"}</span><Icon name="chevronRight" size={15} /></summary>
            <div className="consulta-antecedentes-campos">
              <label>
                {titulo}
                {selector(id, opciones)}
              </label>
            </div>
          </details>
        ))}
      </div>
      <footer className="consulta-antecedentes-acciones">
        {status && <span role="status">{status}</span>}
        {error && <span className="consulta-antecedentes-error" role="alert">{error}</span>}
        <button type="button" disabled={disabled || saving} onClick={onSave}>
          {saving ? "Guardando…" : "Guardar antecedentes"}
        </button>
      </footer>
      </div>
    </details>
  );
}
