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

const sociales: { id: keyof DatosAntecedentesConsulta; etiqueta: string; ejemplo: string }[] = [
  { id: "vivienda", etiqueta: "Vivienda", ejemplo: "Describe las condiciones de vivienda" },
  { id: "serviciosBasicos", etiqueta: "Acceso a servicios básicos", ejemplo: "Agua, electricidad, saneamiento..." },
  { id: "alimentacion", etiqueta: "Alimentación", ejemplo: "Describe la alimentación habitual" },
  { id: "habitos", etiqueta: "Hábitos", ejemplo: "Actividad física, tabaco, alcohol..." },
];

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
}: {
  value: DatosAntecedentesConsulta;
  onChange: (value: DatosAntecedentesConsulta) => void;
  onSave: () => void;
  disabled?: boolean;
  saving?: boolean;
  status?: string;
}) {
  const setCampo = (id: keyof DatosAntecedentesConsulta, dato: string) =>
    onChange({ ...value, [id]: dato });
  const resumen = (campos: { id: keyof DatosAntecedentesConsulta; etiqueta: string }[]) =>
    campos.filter((campo) => value[campo.id]?.trim()).map((campo) => `${campo.etiqueta}: ${value[campo.id]}`).join(" · ") || "Sin datos registrados";

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
                <textarea
                  rows={2}
                  maxLength={5000}
                  placeholder={campo.ejemplo}
                  value={value[campo.id]}
                  disabled={disabled || saving}
                  onChange={(event) => setCampo(campo.id, event.target.value)}
                />
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
                <select
                  value={value[campo.id]}
                  disabled={disabled || saving}
                  onChange={(event) => setCampo(campo.id, event.target.value)}
                >
                  <option value="">Seleccionar</option>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              </label>
            ))}
            <label>
              Otro antecedente
              <textarea
                rows={2}
                maxLength={5000}
                value={value.otroPatologico}
                disabled={disabled || saving}
                onChange={(event) => setCampo("otroPatologico", event.target.value)}
              />
            </label>
          </div>
        </details>
        {([
          ["quirurgicos", "Antecedentes quirúrgicos"],
          ["alergicos", "Antecedentes alérgicos"],
          ["familiares", "Antecedentes familiares"],
        ] as const).map(([id, titulo]) => (
          <details key={id}>
            <summary><strong>{titulo}</strong><span>{value[id]?.trim() || "Sin datos registrados"}</span><Icon name="chevronRight" size={15} /></summary>
            <div className="consulta-antecedentes-campos">
              <label>
                {titulo}
                <textarea
                  rows={2}
                  maxLength={5000}
                  value={value[id]}
                  disabled={disabled || saving}
                  onChange={(event) => setCampo(id, event.target.value)}
                />
              </label>
            </div>
          </details>
        ))}
      </div>
      <footer className="consulta-antecedentes-acciones">
        {status && <span role="status">{status}</span>}
        <button type="button" disabled={disabled || saving} onClick={onSave}>
          {saving ? "Guardando…" : "Guardar antecedentes"}
        </button>
      </footer>
      </div>
    </details>
  );
}
