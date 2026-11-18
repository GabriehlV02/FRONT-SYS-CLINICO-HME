import { useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { HistoriaHojeable } from "../consultorio/ConsultorioView";
import { obtenerEpisodios } from "../consultorio/registroHistoria";
import { usePacientes } from "../../radius/vistas/pacientes/usePacientes";
import { edadPaciente } from "../../radius/vistas/pacientes/pacientesApi";
import { leerSesion } from "../../radius/types/sesion";
import {
  esPacienteUci,
  leerInternaciones,
  suscribirInternaciones,
  type RegistroInternacion,
} from "./registroInternaciones";
import "./MedicoVisitanteInternacionView.css";

type EvolucionVisitante = {
  id: string;
  pacienteId: string;
  fecha: string;
  texto: string;
  medico: string;
  area?: "internacion" | "uci";
  pacienteNombre?: string;
  sala?: string;
  cama?: string;
};
type OrdenVisitante = {
  id: string;
  pacienteId: string;
  tipo: "medicamentos" | "laboratorio" | "imagenologia" | "indicacion";
  detalle: string;
  fecha: string;
  medico: string;
};
type DiagnosticoVisitante = {
  id: string;
  pacienteId: string;
  diagnostico: string;
  fecha: string;
  medico: string;
  area: "internacion" | "uci";
  pacienteNombre: string;
};

const claveEvoluciones = "hme:internacion:evoluciones-medicas:v1";
const claveOrdenes = "hme:internacion:ordenes-medico-visitante:v1";
const claveDiagnosticos = "hme:internacion:diagnosticos-medico-visitante:v1";

function leerRegistros<T>(clave: string): T[] {
  try {
    const datos: unknown = JSON.parse(window.localStorage.getItem(clave) ?? "[]");
    return Array.isArray(datos) ? (datos as T[]) : [];
  } catch {
    return [];
  }
}

function fechaHoraActual() {
  const ahora = new Date();
  const parte = (valor: number) => String(valor).padStart(2, "0");
  return {
    fecha: `${ahora.getFullYear()}-${parte(ahora.getMonth() + 1)}-${parte(ahora.getDate())}`,
    hora: `${parte(ahora.getHours())}:${parte(ahora.getMinutes())}`,
  };
}

const tipoOrdenEtiqueta: Record<OrdenVisitante["tipo"], string> = {
  medicamentos: "Medicamentos",
  laboratorio: "Laboratorio",
  imagenologia: "Imagenología",
  indicacion: "Indicación médica",
};

export function MedicoVisitanteInternacionView({ area = "internacion" }: { area?: "internacion" | "uci" }) {
  const [pacientes, setPacientes] = useState<RegistroInternacion[]>(leerInternaciones);
  const [busqueda, setBusqueda] = useState("");
  const [subvista, setSubvista] = useState<"pacientes" | "historial">("pacientes");
  const [subsubvista, setSubsubvista] = useState<"indicaciones" | "evolucion">("indicaciones");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [atendiendo, setAtendiendo] = useState(false);
  const [historiaAbierta, setHistoriaAbierta] = useState(false);
  const { pacientes: fichasPacientes } = usePacientes(historiaAbierta);
  const [evoluciones, setEvoluciones] = useState<EvolucionVisitante[]>(() => leerRegistros(claveEvoluciones));
  const [ordenes, setOrdenes] = useState<OrdenVisitante[]>(() => leerRegistros(claveOrdenes));
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoVisitante[]>(() => leerRegistros(claveDiagnosticos));
  const [borrador, setBorrador] = useState({ texto: "", ...fechaHoraActual() });
  const [borradorDiagnostico, setBorradorDiagnostico] = useState("");
  const [tipoOrden, setTipoOrden] = useState<OrdenVisitante["tipo"]>("medicamentos");
  const [detalleOrden, setDetalleOrden] = useState("");
  const [error, setError] = useState("");

  useEffect(() => suscribirInternaciones(() => setPacientes(leerInternaciones())), []);
  useEffect(() => {
    const actualizar = (evento: StorageEvent) => {
      if (evento.key === claveEvoluciones) setEvoluciones(leerRegistros(claveEvoluciones));
      if (evento.key === claveOrdenes) setOrdenes(leerRegistros(claveOrdenes));
      if (evento.key === claveDiagnosticos) setDiagnosticos(leerRegistros(claveDiagnosticos));
    };
    window.addEventListener("storage", actualizar);
    return () => window.removeEventListener("storage", actualizar);
  }, []);

  const internados = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    return pacientes
      .filter((paciente) => paciente.estado === "confirmada")
      .filter((paciente) => area === "uci" ? esPacienteUci(paciente) : !esPacienteUci(paciente))
      .filter((paciente) =>
        !consulta ||
        [paciente.paciente, paciente.ci, paciente.sala, paciente.cama]
          .some((dato) => dato?.toLocaleLowerCase("es").includes(consulta)),
      )
      .sort((a, b) => a.paciente.localeCompare(b.paciente, "es"));
  }, [pacientes, busqueda, area]);
  const pacienteActual = internados.find((paciente) => paciente.id === seleccionado);
  const fichaActual = fichasPacientes.find((paciente) => paciente.ci === pacienteActual?.ci);
  const evolucionesPaciente = evoluciones
    .filter((evolucion) => evolucion.pacienteId === seleccionado)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const ordenesPaciente = ordenes
    .filter((orden) => orden.pacienteId === seleccionado)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const diagnosticosPaciente = diagnosticos
    .filter((diagnostico) => diagnostico.pacienteId === seleccionado && diagnostico.area === area)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const visitas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    return evoluciones
      .map((evolucion) => {
        const paciente = pacientes.find((item) => item.id === evolucion.pacienteId);
        const areaVisita = evolucion.area || (paciente && esPacienteUci(paciente) ? "uci" : "internacion");
        return { ...evolucion, pacienteNombre: evolucion.pacienteNombre || paciente?.paciente || "Paciente", sala: evolucion.sala || paciente?.sala || "—", cama: evolucion.cama || paciente?.cama || "—", areaVisita };
      })
      .filter((visita) => visita.areaVisita === area)
      .filter((visita) => !consulta || [visita.pacienteNombre, visita.medico, visita.texto, visita.sala, visita.cama].some((dato) => dato?.toLocaleLowerCase("es").includes(consulta)))
      .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  }, [evoluciones, pacientes, busqueda, area]);

  function registrarEvolucion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccionado || !borrador.texto.trim()) return;
    const momento = new Date(`${borrador.fecha}T${borrador.hora}`);
    if (Number.isNaN(momento.getTime())) {
      setError("Indica una fecha y hora válidas.");
      return;
    }
    const registro: EvolucionVisitante = {
      id: crypto.randomUUID(),
      pacienteId: seleccionado,
      fecha: momento.toISOString(),
      texto: borrador.texto.trim(),
      medico: leerSesion()?.usuario.nombre?.trim() || "Médico visitante",
      area,
      pacienteNombre: pacienteActual?.paciente || "Paciente",
      sala: pacienteActual?.sala || "—",
      cama: pacienteActual?.cama || "—",
    };
    try {
      const siguientes = [registro, ...leerRegistros<EvolucionVisitante>(claveEvoluciones)];
      window.localStorage.setItem(claveEvoluciones, JSON.stringify(siguientes));
      setEvoluciones(siguientes);
      setBorrador({ texto: "", ...fechaHoraActual() });
      setError("");
    } catch {
      setError("No se pudo guardar la evolución médica.");
    }
  }

  function registrarDiagnostico() {
    if (!seleccionado || !borradorDiagnostico.trim() || !pacienteActual) return;
    const registro: DiagnosticoVisitante = {
      id: crypto.randomUUID(),
      pacienteId: seleccionado,
      diagnostico: borradorDiagnostico.trim(),
      fecha: new Date().toISOString(),
      medico: leerSesion()?.usuario.nombre?.trim() || "Médico visitante",
      area,
      pacienteNombre: pacienteActual.paciente,
    };
    try {
      const siguientes = [registro, ...leerRegistros<DiagnosticoVisitante>(claveDiagnosticos)];
      window.localStorage.setItem(claveDiagnosticos, JSON.stringify(siguientes));
      setDiagnosticos(siguientes);
      setBorradorDiagnostico("");
      setError("");
    } catch {
      setError("No se pudo guardar el diagnóstico médico.");
    }
  }

  function registrarOrden(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccionado || !detalleOrden.trim()) return;
    const registro: OrdenVisitante = {
      id: crypto.randomUUID(),
      pacienteId: seleccionado,
      tipo: tipoOrden,
      detalle: detalleOrden.trim(),
      fecha: new Date().toISOString(),
      medico: leerSesion()?.usuario.nombre?.trim() || "Médico visitante",
    };
    try {
      const siguientes = [registro, ...leerRegistros<OrdenVisitante>(claveOrdenes)];
      window.localStorage.setItem(claveOrdenes, JSON.stringify(siguientes));
      setOrdenes(siguientes);
      setDetalleOrden("");
      setError("");
    } catch {
      setError("No se pudo guardar la orden médica.");
    }
  }

  return (
    <section className="medico-visitante-internacion" aria-label={area === "uci" ? "Médico visitante UCI" : "Médico visitante Internación"}>
      <nav className="mvi-subvistas" aria-label="Subvistas de médico visitante">
        <button type="button" className={subvista === "pacientes" ? "activa" : ""} onClick={() => { setSubvista("pacientes"); setAtendiendo(false); setBusqueda(""); }}><Icon name="patient" size={17} /> {area === "uci" ? "Pacientes en UCI" : "Pacientes internados"}</button>
        <button type="button" className={subvista === "historial" ? "activa" : ""} onClick={() => { setSubvista("historial"); setAtendiendo(false); setBusqueda(""); }}><Icon name="calendar" size={17} /> Historial de atención</button>
      </nav>
      {!atendiendo && subvista === "historial" && (
        <section className="mvi-pacientes-vista mvi-historial-visitas" aria-label="Historial de atención">
          <header><div><span>{area === "uci" ? "UNIDAD DE CUIDADOS INTENSIVOS" : "INTERNACIÓN"}</span><h3>Historial de atención</h3><p>{visitas.length} visitas registradas</p></div><label className="mvi-busqueda"><Icon name="search" size={17} /><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar paciente, médico o nota" aria-label="Buscar visitas médicas" /></label></header>
          <div className="mvi-visitas-tabla"><div className="mvi-visitas-cabecera"><span>FECHA Y HORA</span><span>PACIENTE</span><span>UBICACIÓN</span><span>MÉDICO VISITANTE</span><span>NOTA DE ATENCIÓN</span></div>
            {visitas.map((visita) => <article className="mvi-visita-fila" key={visita.id}><strong>{new Date(visita.fecha).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}</strong><strong>{visita.pacienteNombre}</strong><span>Sala {visita.sala} · Cama {visita.cama}</span><strong>{visita.medico}</strong><p>{visita.texto}</p></article>)}
            {!visitas.length && <p className="mvi-vacio">{busqueda ? "No hay visitas que coincidan con la búsqueda." : "Aún no hay visitas registradas para esta área."}</p>}
          </div>
        </section>
      )}
      {!atendiendo && subvista === "pacientes" && (
        <section className={`mvi-pacientes-vista ${area === "uci" ? "mvi-area-uci" : ""}`} aria-label={area === "uci" ? "Pacientes en UCI" : "Pacientes internados"}>
          <header>
            <div><span>{area === "uci" ? "UNIDAD DE CUIDADOS INTENSIVOS" : "INTERNACIÓN"}</span><h3>{area === "uci" ? "Pacientes en UCI" : "Pacientes en sala de internación"}</h3><p>{internados.length} {area === "uci" ? "pacientes en UCI" : "pacientes internados"}</p></div>
            <label className="mvi-busqueda"><Icon name="search" size={17} /><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder={area === "uci" ? "Buscar por paciente, CI o cubículo" : "Buscar por paciente, CI, sala o cama"} aria-label={area === "uci" ? "Buscar pacientes en UCI" : "Buscar pacientes internados"} /></label>
          </header>
          <div className="mvi-tabla-scroll">
            <div className="mvi-tabla-cabecera">
              <span>{area === "uci" ? "CUBÍCULO" : "SALA"}</span><span>CAMA</span><span>PACIENTE</span><span>HISTORIA CLÍNICA</span><span>MÉDICO</span><span>FECHA DE INGRESO</span><span>ESTADO</span><span>ACCIONES</span>
            </div>
            {internados.map((paciente) => (
              <article className="mvi-tabla-fila" key={paciente.id}>
                <b className="mvi-tabla-chip">{paciente.sala || "—"}</b>
                <b className="mvi-tabla-chip mvi-cama">{paciente.cama || "—"}</b>
                <div className="mvi-tabla-paciente"><span className="mvi-avatar"><Icon name="patient" size={18} /></span><strong>{paciente.paciente}</strong></div>
                <strong>HC-{paciente.ci || "S/R"}</strong>
                <strong>{paciente.medico || "Sin asignar"}</strong>
                <strong>{paciente.fechaIngreso || paciente.fecha || "Sin registro"}</strong>
                <em>{area === "uci" ? "En UCI" : "Internado"}</em>
                <button type="button" onClick={() => { setSeleccionado(paciente.id); setAtendiendo(true); setSubsubvista("indicaciones"); setBorradorDiagnostico(""); setError(""); }}><Icon name="userMedical" size={16} /> Atender</button>
              </article>
            ))}
            {!internados.length && <p className="mvi-vacio">{area === "uci" ? "No hay pacientes en UCI que coincidan con la búsqueda." : "No hay pacientes internados que coincidan con la búsqueda."}</p>}
          </div>
        </section>
      )}
      {atendiendo && subvista === "pacientes" && <div className="mvi-contenido mvi-atendiendo">

          <article className="mvi-detalle">
          {pacienteActual ? (
            <>
              <button type="button" className="mvi-volver" onClick={() => setAtendiendo(false)}><Icon name="chevronLeft" size={16} /> {area === "uci" ? "Volver a pacientes en UCI" : "Volver a pacientes internados"}</button>
              <header className="mvi-paciente-cabecera">
                <div><small>{area === "uci" ? "PACIENTE EN UCI" : "PACIENTE INTERNADO"}</small><h3>{pacienteActual.paciente}</h3><p>HC-{pacienteActual.ci || "S/R"} · {area === "uci" ? "Cubículo" : "Sala"} {pacienteActual.sala || "—"} · Cama {pacienteActual.cama || "—"}</p></div>
                <div className="mvi-paciente-acciones">
                  <button type="button" className="mvi-ver-historia" onClick={() => setHistoriaAbierta(true)}><Icon name="fileText" size={17} /> Ver historia clínica</button>
                  <span className="mvi-estado">{area === "uci" ? "En UCI" : "Internado"}</span>
                </div>
              </header>
              {error && <p className="mvi-error" role="alert">{error}</p>}
              <nav className="mvi-subsubvistas" aria-label="Subvistas de atención del paciente">
                <button type="button" className={subsubvista === "indicaciones" ? "activa" : ""} onClick={() => setSubsubvista("indicaciones")}><Icon name="fileText" size={17} /> Indicaciones médicas</button>
                <button type="button" className={subsubvista === "evolucion" ? "activa" : ""} onClick={() => setSubsubvista("evolucion")}><Icon name="heartbeat" size={17} /> Evolución médica</button>
              </nav>
              <div className={`mvi-visita ${subsubvista}`}>
                <section className="mvi-seccion" aria-label="Evolución médica" style={{ display: subsubvista === "evolucion" ? "grid" : "none" }}>
                  <form className="mvi-formulario mvi-formulario-evolucion" onSubmit={registrarEvolucion}>
                    <h4>Registrar evolución médica</h4>
                    <div className="mvi-diagnostico-editor">
                      <div className="mvi-formulario-diagnostico">
                        <label>Diagnóstico médico
                          <input value={borradorDiagnostico} onChange={(evento) => setBorradorDiagnostico(evento.target.value)} placeholder="Escribe el diagnóstico del paciente" maxLength={300} required />
                        </label>
                        <button type="button" onClick={registrarDiagnostico} disabled={!borradorDiagnostico.trim()}><Icon name="plus" size={15} /> Registrar diagnóstico</button>
                      </div>
                      <details className="mvi-historial mvi-historial-diagnosticos">
                        <summary>Diagnósticos registrados <span>{diagnosticosPaciente.length}</span></summary>
                        {diagnosticosPaciente.length ? diagnosticosPaciente.map((diagnostico) => (
                          <article key={diagnostico.id}><small>{new Date(diagnostico.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {diagnostico.medico}</small><p>{diagnostico.diagnostico}</p></article>
                        )) : <p className="mvi-vacio">Aún no hay diagnósticos registrados para este paciente.</p>}
                      </details>
                    </div>
                    <label className="mvi-texto">Evolución
                      <textarea value={borrador.texto} onChange={(evento) => setBorrador((actual) => ({ ...actual, texto: evento.target.value }))} placeholder="Escribe la evolución médica del paciente." maxLength={5000} required />
                    </label>
                    <div className="mvi-fecha-hora">
                      <label>Fecha<input type="date" value={borrador.fecha} onChange={(evento) => setBorrador((actual) => ({ ...actual, fecha: evento.target.value }))} required /></label>
                      <label>Hora<input type="time" value={borrador.hora} onChange={(evento) => setBorrador((actual) => ({ ...actual, hora: evento.target.value }))} required /></label>
                    </div>
                    <button type="submit" disabled={!borrador.texto.trim()}><Icon name="plus" size={16} /> Guardar evolución</button>
                  </form>
                  <details className="mvi-historial">
                    <summary>Historial de evoluciones <span>{evolucionesPaciente.length}</span></summary>
                    {evolucionesPaciente.length ? evolucionesPaciente.map((evolucion) => (
                      <article key={evolucion.id}><small>{new Date(evolucion.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {evolucion.medico}</small><p>{evolucion.texto}</p></article>
                    )) : <p className="mvi-vacio">Aún no hay evoluciones médicas registradas.</p>}
                  </details>
                </section>
                <section className="mvi-seccion" aria-label="Órdenes médicas" style={{ display: subsubvista === "indicaciones" ? "grid" : "none" }}>
                  <form className="mvi-formulario mvi-formulario-orden" onSubmit={registrarOrden}>
                    <h4>Registrar orden médica</h4>
                    <label>Tipo de orden
                      <select value={tipoOrden} onChange={(evento) => setTipoOrden(evento.target.value as OrdenVisitante["tipo"])}>
                        <option value="medicamentos">Medicamentos</option>
                        <option value="laboratorio">Laboratorio</option>
                        <option value="imagenologia">Imagenología</option>
                        <option value="indicacion">Indicación médica</option>
                      </select>
                    </label>
                    <label className="mvi-texto">Detalle de la orden
                      <textarea value={detalleOrden} onChange={(evento) => setDetalleOrden(evento.target.value)} placeholder="Escribe la indicación, medicamento, estudio o procedimiento." maxLength={3000} required />
                    </label>
                    <button type="submit" disabled={!detalleOrden.trim()}><Icon name="plus" size={16} /> Registrar orden</button>
                  </form>
                  <details className="mvi-historial">
                    <summary>Órdenes registradas <span>{ordenesPaciente.length}</span></summary>
                    {ordenesPaciente.length ? ordenesPaciente.map((orden) => (
                      <article key={orden.id}><small>{tipoOrdenEtiqueta[orden.tipo]} · {new Date(orden.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {orden.medico}</small><p>{orden.detalle}</p></article>
                    )) : <p className="mvi-vacio">Aún no hay órdenes médicas registradas.</p>}
                  </details>
                </section>
              </div>
              {historiaAbierta && (
                <HistoriaHojeable
                  paciente={{
                    nombre: pacienteActual.paciente,
                    ci: pacienteActual.ci,
                    edad: fichaActual?.fecha_nacimiento ? edadPaciente(fichaActual.fecha_nacimiento) : Number.NaN,
                    fechaNacimiento: fichaActual?.fecha_nacimiento?.slice(0, 10) || "No registrada",
                    numeroHistoria: `HC-${pacienteActual.ci || "S/R"}`,
                    datoRelevante: "Consulta los antecedentes registrados en la historia.",
                    estado: "Al día",
                    episodios: obtenerEpisodios()
                      .filter((episodio) => episodio.paciente.ci === pacienteActual.ci)
                      .sort((a, b) => a.correlativo - b.correlativo)
                      .map((episodio) => ({
                        ...episodio,
                        id: episodio.episodioId,
                        hora: episodio.paciente.hora,
                        especialidad: episodio.paciente.especialidad,
                      })),
                  }}
                  onCerrar={() => setHistoriaAbierta(false)}
                />
              )}
            </>
          ) : (
            <div className="mvi-seleccionar"><Icon name="patient" size={30} /><strong>Selecciona un paciente</strong><span>Elige un paciente internado para registrar su evolución u órdenes médicas.</span></div>
          )}
        </article>
      </div>}
    </section>
  );
}
