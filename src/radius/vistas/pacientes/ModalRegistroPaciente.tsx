import { useState, type FormEvent } from "react";
import { apiFetch } from "../../api";
import Icon from "../../componentes/Icono";
import "./ModalRegistroPaciente.css";

export type PacienteRegistrado = {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  ci: string;
  fecha_nacimiento: string;
  genero: string;
  telefono?: string | null;
  ciudad?: string | null;
  zona_barrio?: string | null;
  direccion_domicilio?: string | null;
};

type DatosPaciente = {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  ci: string;
  complemento_ci: string;
  expedido_en: string;
  nit: string;
  razon_social: string;
  fecha_nacimiento: string;
  telefono: string;
  genero: string;
  ci_con_qr: boolean;
  pais: string;
  departamento: string;
  ciudad: string;
  zona_barrio: string;
  direccion_domicilio: string;
  responsable_nombre_completo: string;
  responsable_ci: string;
  responsable_telefono: string;
  responsable_parentesco: string;
  como_se_entero: string;
  observaciones: string;
  habilitado: boolean;
};

const inicial: DatosPaciente = {
  nombres: "", apellido_paterno: "", apellido_materno: "", ci: "",
  complemento_ci: "", expedido_en: "", nit: "", razon_social: "",
  fecha_nacimiento: "", telefono: "", genero: "", ci_con_qr: false,
  pais: "Bolivia", departamento: "Cochabamba", ciudad: "", zona_barrio: "",
  direccion_domicilio: "", responsable_nombre_completo: "", responsable_ci: "", responsable_telefono: "",
  responsable_parentesco: "", como_se_entero: "", observaciones: "", habilitado: true,
};

export default function ModalRegistroPaciente({
  onCerrar,
  onRegistrado,
}: {
  onCerrar: () => void;
  onRegistrado: (paciente: PacienteRegistrado) => void;
}) {
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cambiar = <K extends keyof DatosPaciente>(campo: K, valor: DatosPaciente[K]) =>
    setForm((actual) => ({ ...actual, [campo]: valor }));

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const respuesta = await apiFetch("/api/v1/pacientes", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const resultado = await respuesta.json() as { data?: PacienteRegistrado; message?: string; errors?: Record<string, string[]> };
      if (!respuesta.ok || !resultado.data) {
        const detalle = Object.values(resultado.errors || {}).flat()[0];
        throw new Error(detalle || resultado.message || "No se pudo registrar al paciente.");
      }
      onRegistrado(resultado.data);
      onCerrar();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo registrar al paciente.");
    } finally {
      setGuardando(false);
    }
  };

  const campoTexto = (etiqueta: string, campo: keyof DatosPaciente, placeholder = etiqueta, requerido = false, tipo: "text" | "tel" = "text") => (
    <label key={campo}>{etiqueta}{requerido && " *"}
      <input type={tipo} required={requerido} value={form[campo] as string} placeholder={placeholder}
        onChange={(evento) => cambiar(campo, evento.target.value as never)} />
    </label>
  );

  return (
    <div className="registro-paciente-fondo" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) onCerrar(); }}>
      <form className="registro-paciente-modal" role="dialog" aria-modal="true" aria-labelledby="registro-paciente-titulo" onSubmit={guardar}>
        <header>
          <div className="registro-paciente-titulo-icono"><Icon name="users" size={19} /></div>
          <div><p>NUEVO PACIENTE</p><h2 id="registro-paciente-titulo">Registrar paciente</h2></div>
          <button type="button" className="registro-paciente-cerrar" aria-label="Cerrar" disabled={guardando} onClick={onCerrar}><Icon name="close" size={17} /></button>
        </header>
        <div className="registro-paciente-contenido">
          {error && <div className="registro-paciente-error" role="alert">{error}</div>}
          <fieldset><legend>Datos del paciente</legend><div className="registro-paciente-grid">
            {campoTexto("Nombres", "nombres", "Nombres", true)}
            {campoTexto("Apellido paterno", "apellido_paterno", "Apellido paterno", true)}
            {campoTexto("Apellido materno", "apellido_materno", "Apellido materno", true)}
            <label className="registro-paciente-ci">CI *<input required value={form.ci} placeholder="CI" onChange={(e) => cambiar("ci", e.target.value)} /><span><input type="checkbox" checked={form.ci_con_qr} onChange={(e) => cambiar("ci_con_qr", e.target.checked)} /> CI con QR</span></label>
            {campoTexto("Complemento", "complemento_ci")}
            <label>Expedido en<select value={form.expedido_en} onChange={(e) => cambiar("expedido_en", e.target.value)}><option value="">Ninguno</option>{["CBBA - COCHABAMBA", "LPZ - LA PAZ", "OR - ORURO", "POT - POTOSÍ", "TJA - TARIJA", "CHU - CHUQUISACA", "SCZ - SANTA CRUZ", "BEN - BENI", "PND - PANDO", "EXTRANJERO"].map((v) => <option key={v}>{v}</option>)}</select></label>
            {campoTexto("NIT", "nit")}{campoTexto("Razón social", "razon_social")}
            <label>Fecha de nacimiento *<input type="date" required max={new Date().toISOString().slice(0, 10)} value={form.fecha_nacimiento} onChange={(e) => cambiar("fecha_nacimiento", e.target.value)} /></label>
            {campoTexto("Teléfono", "telefono", "+591", false, "tel")}
            <label>Género *<select required value={form.genero} onChange={(e) => cambiar("genero", e.target.value)}><option value="" disabled>Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>
          </div></fieldset>
          <fieldset><legend>Domicilio</legend><div className="registro-paciente-grid">
            <label>País *<select required value={form.pais} onChange={(e) => cambiar("pais", e.target.value)}><option>Bolivia</option><option>Argentina</option><option>Brasil</option><option>Chile</option><option>Perú</option><option>Otro</option></select></label>
            <label>Departamento *<select required value={form.departamento} onChange={(e) => cambiar("departamento", e.target.value)}>{["Cochabamba", "La Paz", "Santa Cruz", "Oruro", "Potosí", "Tarija", "Chuquisaca", "Beni", "Pando", "Otro"].map((v) => <option key={v}>{v}</option>)}</select></label>
            {campoTexto("Ciudad", "ciudad", "Ciudad")}{campoTexto("Zona / barrio", "zona_barrio", "Zona / barrio")}
            <div className="registro-paciente-ancho">{campoTexto("Dirección domicilio", "direccion_domicilio", "Dirección")}</div>
          </div></fieldset>
          <fieldset><legend>Persona responsable</legend><div className="registro-paciente-grid registro-paciente-responsable">
            {campoTexto("Nombre completo", "responsable_nombre_completo", "Nombre completo")}{campoTexto("CI / Carnet de identidad", "responsable_ci", "CI del familiar")}{campoTexto("Teléfono de contacto", "responsable_telefono", "Teléfono", false, "tel")}{campoTexto("Parentesco", "responsable_parentesco", "Ej. Padre, madre o tutor")}
          </div></fieldset>
          <fieldset><legend>Preguntas</legend><div className="registro-paciente-grid">
            <label className="registro-paciente-ancho">¿Cómo se enteró de nosotros? *<select required value={form.como_se_entero} onChange={(e) => cambiar("como_se_entero", e.target.value)}><option value="" disabled>Seleccionar una opción</option><option>Recomendación</option><option>Redes sociales</option><option>Publicidad</option><option>Otro</option></select></label>
            <label className="registro-paciente-ancho">Observaciones<textarea value={form.observaciones} placeholder="Observaciones" onChange={(e) => cambiar("observaciones", e.target.value)} /></label>
          </div><label className="registro-paciente-habilitado"><input type="checkbox" checked={form.habilitado} onChange={(e) => cambiar("habilitado", e.target.checked)} /> Habilitado</label></fieldset>
        </div>
        <footer><button type="button" disabled={guardando} onClick={onCerrar}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar paciente"}</button></footer>
      </form>
    </div>
  );
}
