import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { apiEmergencias, nombrePaciente, type CuentaEmergencia } from "./emergenciasApi";
import { leerSesion } from "../../radius/types/sesion";
import { usePacientes } from "../../radius/vistas/pacientes/usePacientes";
import { edadPaciente } from "../../radius/vistas/pacientes/pacientesApi";
import { HistoriaHojeable } from "../consultorio/ConsultorioView";
import { obtenerEpisodios } from "../consultorio/registroHistoria";
import "../internacion/MedicoVisitanteInternacionView.css";
import "./MedicoVisitanteEmergenciasView.css";

type Evolucion = { id: string; pacienteId: string; fecha: string; texto: string; medico: string; pacienteNombre?: string; cubiculo?: string };
type Orden = { id: string; pacienteId: string; tipo: string; detalle: string; fecha: string; medico: string };
const KEY_EVOLUCIONES = "hme:emergencias:medico-visitante:evoluciones:v1";
const KEY_ORDENES = "hme:emergencias:medico-visitante:ordenes:v1";
function leer<T>(key: string): T[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value as T[] : []; } catch { return []; }
}
function ahora() {
  const d = new Date();
  return { fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
}

export function MedicoVisitanteEmergenciasView() {
  const [cuentas, setCuentas] = useState<CuentaEmergencia[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [subvista, setSubvista] = useState<"pacientes" | "historial">("pacientes");
  const [seccionPaciente, setSeccionPaciente] = useState<"evolucion" | "ordenes">("evolucion");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [evoluciones, setEvoluciones] = useState(() => leer<Evolucion>(KEY_EVOLUCIONES));
  const [ordenes, setOrdenes] = useState(() => leer<Orden>(KEY_ORDENES));
  const [borrador, setBorrador] = useState({ texto: "", ...ahora() });
  const [tipoOrden, setTipoOrden] = useState("medicamentos");
  const [detalleOrden, setDetalleOrden] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [historiaAbierta, setHistoriaAbierta] = useState(false);
  const { pacientes: fichas } = usePacientes(historiaAbierta);

  const cargarCuentas = useCallback(async () => {
    try {
      const resultado = await apiEmergencias<{ cuentas: CuentaEmergencia[] }>();
      setCuentas(resultado.cuentas.filter((cuenta) => !cuenta.fin));
      setError("");
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudieron cargar las atenciones de Emergencias.");
    } finally { setCargando(false); }
  }, []);
  useEffect(() => {
    void cargarCuentas();
    const timer = window.setInterval(() => void cargarCuentas(), 5000);
    window.addEventListener("focus", cargarCuentas);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", cargarCuentas); };
  }, [cargarCuentas]);
  useEffect(() => {
    const actualizar = (event: StorageEvent) => {
      if (event.key === KEY_EVOLUCIONES) setEvoluciones(leer<Evolucion>(KEY_EVOLUCIONES));
      if (event.key === KEY_ORDENES) setOrdenes(leer<Orden>(KEY_ORDENES));
    };
    window.addEventListener("storage", actualizar);
    return () => window.removeEventListener("storage", actualizar);
  }, []);

  useEffect(() => { setSeccionPaciente("evolucion"); }, [seleccionado]);

  const visibles = useMemo(() => {
    const q = busqueda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return cuentas.filter((c) => !q || `${nombrePaciente(c)} ${c.identidad?.documento || ""} ${c.cubiculo}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q))
      .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
  }, [cuentas, busqueda]);
  const paciente = cuentas.find((c) => c.id === seleccionado);
  const ciActual = paciente?.identidad?.documento || "";
  const ficha = fichas.find((p) => p.ci === ciActual);
  const identidad = paciente?.identidad || {};
  const nacimiento = identidad.nacimiento || ficha?.fecha_nacimiento;
  const edad = nacimiento ? edadPaciente(nacimiento) : Number.NaN;
  const totalConsumido = (paciente?.consumos || []).reduce(
    (total, consumo) => total + consumo.precio * consumo.cantidad, 0,
  );
  const evolucionesActuales = evoluciones.filter((r) => r.pacienteId === seleccionado).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const ordenesActuales = ordenes.filter((r) => r.pacienteId === seleccionado).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const visitas = useMemo(() => {
    const q = busqueda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return evoluciones
      .map((evolucion) => {
        const cuenta = cuentas.find((item) => item.id === evolucion.pacienteId);
        return { ...evolucion, paciente: evolucion.pacienteNombre || (cuenta ? nombrePaciente(cuenta) : "Paciente de Emergencias"), cubiculo: evolucion.cubiculo || cuenta?.cubiculo || "—" };
      })
      .filter((visita) => !q || `${visita.paciente} ${visita.medico} ${visita.texto} ${visita.cubiculo}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q))
      .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  }, [evoluciones, cuentas, busqueda]);

  function guardarLista<T>(key: string, rows: T[], actualizar: (items: T[]) => void, item: T) {
    try { const next = [item, ...leer<T>(key)]; localStorage.setItem(key, JSON.stringify(next)); actualizar(next); setError(""); }
    catch { setError("No se pudo guardar el registro médico."); }
  }
  function guardarEvolucion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!seleccionado || !borrador.texto.trim()) return;
    const fecha = new Date(`${borrador.fecha}T${borrador.hora}`);
    if (Number.isNaN(fecha.getTime())) { setError("Indica una fecha y hora válidas."); return; }
    guardarLista(KEY_EVOLUCIONES, evoluciones, setEvoluciones, { id: crypto.randomUUID(), pacienteId: seleccionado, fecha: fecha.toISOString(), texto: borrador.texto.trim(), medico: leerSesion()?.usuario.nombre?.trim() || "Médico visitante", pacienteNombre: paciente ? nombrePaciente(paciente) : "Paciente de Emergencias", cubiculo: paciente?.cubiculo || "—" });
    setBorrador({ texto: "", ...ahora() });
  }
  function guardarOrden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!seleccionado || !detalleOrden.trim()) return;
    guardarLista(KEY_ORDENES, ordenes, setOrdenes, { id: crypto.randomUUID(), pacienteId: seleccionado, tipo: tipoOrden, detalle: detalleOrden.trim(), fecha: new Date().toISOString(), medico: leerSesion()?.usuario.nombre?.trim() || "Médico visitante" });
    setDetalleOrden("");
  }

  return <section className="medico-visitante-internacion mve-emergencias" aria-label="Médico visitante de Emergencias">
    <nav className="mve-subvistas" aria-label="Subvistas de Médico visitante Emergencias">
      <button type="button" className={subvista === "pacientes" ? "activa" : ""} onClick={() => { setSubvista("pacientes"); setSeleccionado(null); setBusqueda(""); }}><Icon name="patient" size={17}/> Pacientes en atención</button>
      <button type="button" className={subvista === "historial" ? "activa" : ""} onClick={() => { setSubvista("historial"); setSeleccionado(null); setBusqueda(""); }}><Icon name="calendar" size={17}/> Historial de atención</button>
    </nav>
    {subvista === "historial" ? <section className="mvi-pacientes-vista mve-historial-vista" aria-label="Historial de atención de Emergencias">
      <header><div><span>EMERGENCIAS</span><h3>Historial de atención</h3><p>{visitas.length} visitas registradas</p></div><label className="mvi-busqueda"><Icon name="search" size={17}/><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar paciente, médico o nota" aria-label="Buscar visitas"/></label></header>
      <div className="mve-tabla mve-tabla-visitas"><div className="mve-tabla-cabecera"><span>FECHA Y HORA</span><span>PACIENTE</span><span>CUBÍCULO</span><span>MÉDICO VISITANTE</span><span>NOTA DE ATENCIÓN</span></div>
        {visitas.map((visita) => <article className="mve-fila mve-fila-visita" key={visita.id}><strong>{new Date(visita.fecha).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}</strong><div className="mve-nombre"><span className="mvi-avatar"><Icon name="patient" size={18}/></span><strong>{visita.paciente}</strong></div><strong>{visita.cubiculo}</strong><strong>{visita.medico}</strong><p>{visita.texto}</p></article>)}
        {!visitas.length && <p className="mvi-vacio">{busqueda ? "No hay visitas que coincidan con la búsqueda." : "Aún no se han registrado visitas médicas en Emergencias."}</p>}
      </div>
    </section> : !paciente ? <section className="mvi-pacientes-vista" aria-label="Pacientes activos en Emergencias">
      <header className="mve-lista-header"><label className="mvi-busqueda"><Icon name="search" size={17}/><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por paciente, CI o cubículo" aria-label="Buscar pacientes de Emergencias"/></label></header>
      <div className="mve-tabla"><div className="mve-tabla-cabecera"><span>PACIENTE</span><span>HISTORIA CLÍNICA</span><span>CUBÍCULO</span><span>FECHA DE INGRESO</span><span>ESTADO</span><span>ACCIONES</span></div>
        {cargando ? <p className="mvi-vacio">Cargando pacientes de Emergencias…</p> : visibles.map((c) => <article className="mve-fila" key={c.id}><div className="mve-nombre"><span className="mvi-avatar"><Icon name="patient" size={18}/></span><div><strong>{nombrePaciente(c)}</strong><small>CI {c.identidad?.documento || "Sin documento"}</small></div></div><strong>HC-{c.identidad?.historiaClinica || c.identidad?.documento || "S/R"}</strong><strong>{c.cubiculo}</strong><strong>{new Date(c.inicio).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" })}</strong><em>En atención</em><button type="button" onClick={() => { setSeleccionado(c.id); setError(""); }}><Icon name="userMedical" size={16}/> Atender</button></article>)}
        {!cargando && !visibles.length && <p className="mvi-vacio">{error || (busqueda ? "No hay pacientes que coincidan con la búsqueda." : "No hay pacientes con atención activa en Emergencias.")}</p>}
      </div>
    </section> : <section className="mve-atencion">
      <button type="button" className="mvi-volver" onClick={() => { setSeleccionado(null); setHistoriaAbierta(false); }}><Icon name="chevronLeft" size={16}/> Volver a pacientes de Emergencias</button>
      <header className="mve-resumen-paciente">
        <div className="mve-resumen-datos">
          <div className="mve-resumen-principal">
            <div className="mve-resumen-nombre"><small>Paciente</small><h3>{nombrePaciente(paciente)}</h3></div>
            <div className="mve-resumen-campo"><small>Edad</small><strong>{Number.isFinite(edad) ? `${edad} años` : "No registrada"}</strong></div>
            <div className="mve-resumen-campo"><small>Sexo</small><strong>{identidad.sexo || "No registrado"}</strong></div>
          </div>
          <div className="mve-resumen-familia">
            <div><small>Familiar o responsable</small><strong>{identidad.familiar || "Sin registro"}</strong></div>
            <div><small>Número de referencia</small><strong>{identidad.referenciaFamiliar || "Sin registro"}</strong></div>
          </div>
          <div className="mve-resumen-indicadores">
            <div><small>Cubículo</small><strong>Cubículo {paciente.cubiculo}</strong></div>
            <div><small>Hora de ingreso</small><strong>{new Date(paciente.inicio).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</strong></div>
          </div>
        </div>
        <div className="mve-resumen-acciones">
          <div className="mve-resumen-total"><small>Total consumido</small><strong>Bs {totalConsumido.toFixed(2)}</strong></div>
          <button type="button" className="mve-resumen-historia" onClick={() => setHistoriaAbierta(true)}><Icon name="fileText" size={16}/> Historia clínica</button>
          <span className="mvi-estado">En atención</span>
        </div>
      </header>
      {error && <p className="mvi-error" role="alert">{error}</p>}
      <nav className="mve-subvistas mve-subsubvistas" aria-label="Secciones de la atención del paciente">
        <button type="button" className={seccionPaciente === "evolucion" ? "activa" : ""} aria-pressed={seccionPaciente === "evolucion"} aria-controls="mve-evolucion" onClick={() => setSeccionPaciente("evolucion")}><Icon name="fileText" size={17}/> Evolución</button>
        <button type="button" className={seccionPaciente === "ordenes" ? "activa" : ""} aria-pressed={seccionPaciente === "ordenes"} aria-controls="mve-ordenes" onClick={() => setSeccionPaciente("ordenes")}><Icon name="clipboardMedical" size={17}/> Orden médica</button>
      </nav>
      <div className="mvi-visita">
        <section id="mve-evolucion" className="mvi-seccion" aria-label="Evolución" hidden={seccionPaciente !== "evolucion"}><form className="mvi-formulario" onSubmit={guardarEvolucion}><h4>Registrar evolución médica</h4><label className="mvi-texto">Evolución<textarea value={borrador.texto} onChange={(e) => setBorrador((a) => ({ ...a, texto: e.target.value }))} placeholder="Escribe la evolución médica del paciente." maxLength={5000} required/></label><div className="mvi-fecha-hora"><label>Fecha<input type="date" value={borrador.fecha} onChange={(e) => setBorrador((a) => ({ ...a, fecha: e.target.value }))} required/></label><label>Hora<input type="time" value={borrador.hora} onChange={(e) => setBorrador((a) => ({ ...a, hora: e.target.value }))} required/></label></div><button type="submit" disabled={!borrador.texto.trim()}><Icon name="plus" size={16}/> Guardar evolución</button></form><details className="mvi-historial"><summary>Historial de evoluciones <span>{evolucionesActuales.length}</span></summary>{evolucionesActuales.length ? evolucionesActuales.map((r) => <article key={r.id}><small>{new Date(r.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {r.medico}</small><p>{r.texto}</p></article>) : <p className="mvi-vacio">Aún no hay evoluciones médicas registradas.</p>}</details></section>
        <section id="mve-ordenes" className="mvi-seccion" aria-label="Orden médica" hidden={seccionPaciente !== "ordenes"}><form className="mvi-formulario mvi-formulario-orden" onSubmit={guardarOrden}><h4>Registrar orden médica</h4><label>Tipo de orden<select value={tipoOrden} onChange={(e) => setTipoOrden(e.target.value)}><option value="medicamentos">Medicamentos</option><option value="laboratorio">Laboratorio</option><option value="imagenologia">Imagenología</option><option value="indicacion">Indicación médica</option></select></label><label className="mvi-texto">Detalle de la orden<textarea value={detalleOrden} onChange={(e) => setDetalleOrden(e.target.value)} placeholder="Indicación, medicamento, estudio o procedimiento." maxLength={3000} required/></label><button type="submit" disabled={!detalleOrden.trim()}><Icon name="plus" size={16}/> Registrar orden</button></form><details className="mvi-historial"><summary>Órdenes registradas <span>{ordenesActuales.length}</span></summary>{ordenesActuales.length ? ordenesActuales.map((r) => <article key={r.id}><small>{r.tipo} · {new Date(r.fecha).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })} · {r.medico}</small><p>{r.detalle}</p></article>) : <p className="mvi-vacio">Aún no hay órdenes médicas registradas.</p>}</details></section>
      </div>
      {historiaAbierta && <HistoriaHojeable paciente={{ nombre: nombrePaciente(paciente), ci: ciActual, edad: ficha?.fecha_nacimiento ? edadPaciente(ficha.fecha_nacimiento) : Number.NaN, fechaNacimiento: ficha?.fecha_nacimiento?.slice(0, 10) || "No registrada", numeroHistoria: `HC-${paciente.identidad?.historiaClinica || ciActual || "S/R"}`, datoRelevante: "Consulta los antecedentes registrados en la historia.", estado: "Al día", episodios: obtenerEpisodios().filter((e) => e.paciente.ci === ciActual).sort((a, b) => a.correlativo - b.correlativo).map((e) => ({ ...e, id: e.episodioId, hora: e.paciente.hora, especialidad: e.paciente.especialidad })) }} onCerrar={() => setHistoriaAbierta(false)}/>}
    </section>}
  </section>;
}
