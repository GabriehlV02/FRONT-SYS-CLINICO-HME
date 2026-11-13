import { useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { leerSesion } from "../../radius/types/sesion";
import {
  esPacienteUci,
  leerInternaciones,
  suscribirInternaciones,
  type RegistroInternacion,
} from "./registroInternaciones";
import "./MedicoVisitanteInternacionView.css";

type SeccionVisitante = "evolucion" | "ordenes";
type EvolucionVisitante = {
  id: string;
  pacienteId: string;
  fecha: string;
  texto: string;
  medico: string;
};
type OrdenVisitante = {
  id: string;
  pacienteId: string;
  tipo: "medicamentos" | "laboratorio" | "imagenologia" | "indicacion";
  detalle: string;
  fecha: string;
  medico: string;
};

const claveEvoluciones = "hme:internacion:evoluciones-medicas:v1";
const claveOrdenes = "hme:internacion:ordenes-medico-visitante:v1";

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
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [atendiendo, setAtendiendo] = useState(false);
  const [seccion, setSeccion] = useState<SeccionVisitante>("evolucion");
  const [evoluciones, setEvoluciones] = useState<EvolucionVisitante[]>(() => leerRegistros(claveEvoluciones));
  const [ordenes, setOrdenes] = useState<OrdenVisitante[]>(() => leerRegistros(claveOrdenes));
  const [borrador, setBorrador] = useState({ texto: "", ...fechaHoraActual() });
  const [tipoOrden, setTipoOrden] = useState<OrdenVisitante["tipo"]>("medicamentos");
  const [detalleOrden, setDetalleOrden] = useState("");
  const [error, setError] = useState("");

  useEffect(() => suscribirInternaciones(() => setPacientes(leerInternaciones())), []);
  useEffect(() => {
    const actualizar = (evento: StorageEvent) => {
      if (evento.key === claveEvoluciones) setEvoluciones(leerRegistros(claveEvoluciones));
      if (evento.key === claveOrdenes) setOrdenes(leerRegistros(claveOrdenes));
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
  const evolucionesPaciente = evoluciones
    .filter((evolucion) => evolucion.pacienteId === seleccionado)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const ordenesPaciente = ordenes
    .filter((orden) => orden.pacienteId === seleccionado)
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));

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
    <section className="medico-visitante-internacion" aria-label="Médico visitante">
      <header className="mvi-cabecera">
        <div className="mvi-icono"><Icon name="userMedical" size={22} /></div>
        <div>
          <span>INTERNACIÓN</span>
          <h2>Médico visitante</h2>
          <p>Registra evoluciones y órdenes para los pacientes internados.</p>
        </div>
        <b>{internados.length} pacientes</b>
      </header>
      {!atendiendo && (
        <section className="mvi-pacientes-vista" aria-label="Pacientes internados">
          <header>
            <div><span>PACIENTES INTERNADOS</span><h3>Pacientes en sala de internación</h3><p>{internados.length} pacientes internados</p></div>
            <label className="mvi-busqueda"><Icon name="search" size={17} /><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por paciente, CI, sala o cama" aria-label="Buscar pacientes internados" /></label>
          </header>
          <div className="mvi-tabla-scroll">
            <div className="mvi-tabla-cabecera">
              <span>SALA</span><span>CAMA</span><span>PACIENTE</span><span>HISTORIA CLÍNICA</span><span>MÉDICO</span><span>FECHA DE INGRESO</span><span>ESTADO</span><span>ACCIONES</span>
            </div>
            {internados.map((paciente) => (
              <article className="mvi-tabla-fila" key={paciente.id}>
                <b className="mvi-tabla-chip">{paciente.sala || "—"}</b>
                <b className="mvi-tabla-chip mvi-cama">{paciente.cama || "—"}</b>
                <div className="mvi-tabla-paciente"><span className="mvi-avatar"><Icon name="patient" size={18} /></span><strong>{paciente.paciente}</strong></div>
                <strong>HC-{paciente.ci || "S/R"}</strong>
                <strong>{paciente.medico || "Sin asignar"}</strong>
                <strong>{paciente.fechaIngreso || paciente.fecha || "Sin registro"}</strong>
                <em>Internado</em>
                <button type="button" onClick={() => { setSeleccionado(paciente.id); setAtendiendo(true); setSeccion("evolucion"); setError(""); }}><Icon name="userMedical" size={16} /> Atender</button>
              </article>
            ))}
            {!internados.length && <p className="mvi-vacio">No hay pacientes internados que coincidan con la búsqueda.</p>}
          </div>
        </section>
      )}
      {atendiendo && <div className="mvi-contenido mvi-atendiendo">
        <aside className="mvi-listado" aria-label="Pacientes internados" hidden>
          <label className="mvi-busqueda">
            <Icon name="search" size={17} />
            <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar paciente, CI o sala" aria-label="Buscar pacientes internados" />
          </label>
          {internados.map((paciente) => (
            <button type="button" key={paciente.id} className={seleccionado === paciente.id ? "seleccionado" : ""} onClick={() => { setSeleccionado(paciente.id); setSeccion("evolucion"); setError(""); }}>
              <span className="mvi-avatar"><Icon name="patient" size={17} /></span>
              <span><strong>{paciente.paciente}</strong><small>HC-{paciente.ci || "S/R"} · Sala {paciente.sala || "—"} · Cama {paciente.cama || "—"}</small></span>
              <Icon name="chevronRight" size={16} />
            </button>
          ))}
          {!internados.length && <p className="mvi-vacio">No hay pacientes internados que coincidan con la búsqueda.</p>}
        </aside>
          <article className="mvi-detalle">
          {pacienteActual ? (
            <>
              <button type="button" className="mvi-volver" onClick={() => setAtendiendo(false)}><Icon name="chevronLeft" size={16} /> Volver a pacientes internados</button>
              <header className="mvi-paciente-cabecera">
                <div><small>PACIENTE INTERNADO</small><h3>{pacienteActual.paciente}</h3><p>HC-{pacienteActual.ci || "S/R"} · Sala {pacienteActual.sala || "—"} · Cama {pacienteActual.cama || "—"}</p></div>
                <span className="mvi-estado">Internado</span>
              </header>
              <nav className="mvi-secciones" aria-label="Atención del médico visitante">
                <button type="button" className={seccion === "evolucion" ? "activa" : ""} onClick={() => { setSeccion("evolucion"); setError(""); }}><Icon name="fileText" size={16} /> Evolución médica</button>
                <button type="button" className={seccion === "ordenes" ? "activa" : ""} onClick={() => { setSeccion("ordenes"); setError(""); }}><Icon name="clipboardMedical" size={16} /> Órdenes médicas</button>
              </nav>
              {error && <p className="mvi-error" role="alert">{error}</p>}
              {seccion === "evolucion" ? (
                <section className="mvi-seccion" aria-label="Evolución médica">
                  <form className="mvi-formulario" onSubmit={registrarEvolucion}>
                    <h4>Registrar evolución médica</h4>
                    <label className="mvi-texto">Evolución
                      <textarea value={borrador.texto} onChange={(evento) => setBorrador((actual) => ({ ...actual, texto: evento.target.value }))} placeholder="Escribe la evolución médica del paciente." maxLength={5000} required />
                    </label>
                    <div className="mvi-fecha-hora">
                      <label>Fecha<input type="date" value={borrador.fecha} onChange={(evento) => setBorrador((actual) => ({ ...actual, fecha: evento.target.value }))} required /></label>
                      <label>Hora<input type="time" value={borrador.hora} onChange={(evento) => setBorrador((actual) => ({ ...actual, hora: evento.target.value }))} required /></label>
                    </div>
                    <button type="submit" disabled={!borrador.texto.trim()}><Icon name="plus" size={16} /> Guardar evolución</button>
                  </form>
                  <div className="mvi-historial">
                    <header><h4>Historial de evoluciones</h4><span>{evolucionesPaciente.length}</span></header>
                    {evolucionesPaciente.length ? evolucionesPaciente.map((evolucion) => (
                      <article key={evolucion.id}><small>{new Date(evolucion.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {evolucion.medico}</small><p>{evolucion.texto}</p></article>
                    )) : <p className="mvi-vacio">Aún no hay evoluciones médicas registradas.</p>}
                  </div>
                </section>
              ) : (
                <section className="mvi-seccion" aria-label="Órdenes médicas">
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
                  <div className="mvi-historial">
                    <header><h4>Órdenes registradas</h4><span>{ordenesPaciente.length}</span></header>
                    {ordenesPaciente.length ? ordenesPaciente.map((orden) => (
                      <article key={orden.id}><small>{tipoOrdenEtiqueta[orden.tipo]} · {new Date(orden.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {orden.medico}</small><p>{orden.detalle}</p></article>
                    )) : <p className="mvi-vacio">Aún no hay órdenes médicas registradas.</p>}
                  </div>
                </section>
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
