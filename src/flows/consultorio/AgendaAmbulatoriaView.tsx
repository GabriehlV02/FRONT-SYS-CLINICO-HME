import { useProfesionales } from "../../radius/profesionales";
import { leerSesion } from "../../radius/types/sesion";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Icon from "../../radius/componentes/Icono";
import { apiFetch } from "../../radius/api";
import { obtenerCitasAgendaDemo } from "../../radius/datos/agendaDemo";
import {
  obtenerSignosVitales,
  suscribirSignosVitales,
} from "../triaje/registroSignosVitales";
import {
  obtenerAtencionAmbulatoria,
  obtenerEpisodios,
  registrarAtencionAmbulatoria,
  suscribirEpisodios,
} from "./registroHistoria";
import { estaSinAtender, fechaLocalISO } from "./agendaPendientes";
import "./AgendaAmbulatoriaView.css";
import "./AgendaAmbulatoriaViewAlineacion.css";
import "./AgendaMotivo.css";

export type CitaConfirmada = {
  id: string;
  pacienteId?: string;
  profesionalId?: string;
  paciente: string;
  ci: string;
  doctor: string;
  especialidad: string;
  fecha: string;
  hora: string;
  estado?: string;
  tipo?: "consulta" | "reconsulta";
  citaOrigenId?: number | null;
  atencionFinalizadaEn?: string | null;
  signosRegistrados?: boolean;
  consultorio?: string;
  motivoOperativo?: string;
  nombre?: string;
  apellidos?: string;
  domicilio?: string;
  edad?: string | number;
  fechaNacimiento?: string;
};
// La agenda almacena la fecha como YYYY-MM-DD. No se usa toLocaleDateString
// porque el resultado varía según el navegador y puede devolver M/D/YYYY.
const fechaHoy = fechaLocalISO;
export function AgendaAmbulatoriaView({
  medico,
  onAtender,
}: {
  medico: string;
  onAtender?: (cita: CitaConfirmada) => void;
}) {
  const { profesionales } = useProfesionales();
  const esDemo =
    import.meta.env.DEV && leerSesion()?.token === "frontend-demo-local";
  const profesionalActual = profesionales.find(
    (p) => p.usuario_id === String(leerSesion()?.usuario.id),
  );
  const [agendaReintentando, setAgendaReintentando] = useState(false);
  const [cargandoAgenda, setCargandoAgenda] = useState(!esDemo);
  const [citas, setCitas] = useState<CitaConfirmada[]>(() =>
    esDemo ? obtenerCitasAgendaDemo() : [],
  );
  useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAtendidas, setBusquedaAtendidas] = useState("");
  const [hoy, setHoy] = useState(fechaHoy);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    let fechaAnterior = fechaHoy();
    const temporizador = window.setInterval(() => {
      const fechaActual = fechaHoy();
      if (fechaActual === fechaAnterior) return;
      fechaAnterior = fechaActual;
      setHoy(fechaActual);
      setFechaSeleccionada(fechaActual);
      setFechaDesde("");
      setFechaHasta("");
    }, 30000);
    return () => window.clearInterval(temporizador);
  }, []);

  useEffect(() => {
    const cancelarSuscripcion = suscribirSignosVitales(() =>
      setCitas((actuales) => [...actuales]),
    );
    return () => {
      cancelarSuscripcion();
    };
  }, []);
  useEffect(() => {
    if (esDemo) {
      const actualizar = () => setCitas(obtenerCitasAgendaDemo());
      window.addEventListener("citas:actualizadas", actualizar);
      window.addEventListener("pacientes:actualizados", actualizar);
      return () => {
        window.removeEventListener("citas:actualizadas", actualizar);
        window.removeEventListener("pacientes:actualizados", actualizar);
      };
    }
    const controller = new AbortController();
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let demoraReintento = 3000;
    const consultarAgenda = async () => {
      try {
        const response = await apiFetch("/api/citas", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Agenda no disponible");
        const datos: CitaConfirmada[] = await response.json();
        setCitas(datos);
        setCargandoAgenda(false);
        setAgendaReintentando(false);
        demoraReintento = 3000;
        temporizador = setTimeout(consultarAgenda, 30000);
      } catch {
        if (controller.signal.aborted) return;
        setCargandoAgenda(false);
        setAgendaReintentando(true);
        temporizador = setTimeout(consultarAgenda, demoraReintento);
        demoraReintento = Math.min(demoraReintento * 2, 30000);
      }
    };
    void consultarAgenda();
    return () => {
      controller.abort();
      if (temporizador) clearTimeout(temporizador);
    };
  }, [esDemo]);

  // El backend limita la agenda del médico autenticado; este filtro evita una
  // exposición momentánea mientras se carga el perfil profesional.
  const visibles = useMemo(
    () =>
      citas
        .filter(
          (cita) =>
            esDemo ||
            /administrador/i.test(medico) ||
            (profesionalActual
              ? cita.profesionalId === profesionalActual.id
              : true),
        )
        .sort((a, b) =>
          `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`),
        ),
    [citas, medico, profesionalActual, esDemo],
  );
  const coincide = (cita: CitaConfirmada, texto: string) =>
    `${cita.paciente} ${cita.ci} ${cita.doctor} ${cita.especialidad}`
      .toLocaleLowerCase()
      .includes(texto.trim().toLocaleLowerCase());
  const coincideFecha = (cita: CitaConfirmada) =>
    fechaDesde || fechaHasta
      ? (!fechaDesde || cita.fecha >= fechaDesde) && (!fechaHasta || cita.fecha <= fechaHasta)
      : cita.fecha === fechaSeleccionada;
  const pendientes = visibles.filter(
    (cita) =>
      coincideFecha(cita) &&
      estaSinAtender(cita) &&
      coincide(cita, busqueda),
  );
  const atendidas = visibles.filter((cita) => {
    const finalizada = cita.atencionFinalizadaEn || obtenerAtencionAmbulatoria(cita)?.finalizadaEn;
    return (
      finalizada &&
      coincideFecha(cita) &&
      coincide(cita, busquedaAtendidas)
    );
  });
  const atender = (cita: CitaConfirmada) => {
    registrarAtencionAmbulatoria(cita, medico);
    onAtender?.(cita);
  };
  const signosRegistrados = (cita: CitaConfirmada) =>
    Boolean(cita.signosRegistrados) ||
    Object.values(obtenerSignosVitales(cita) ?? {}).some(Boolean);

  return (
    <section
      className="agenda-ambulatoria"
      aria-label="Consultas ambulatorias pendientes de atención"
    >
      {agendaReintentando && (
        <p className="agenda-reintentando" role="status" aria-live="polite">
          Reconectando con la agenda… Las citas se actualizarán automáticamente.
        </p>
      )}
      <div className="agenda-herramientas">
        <label>
          <Icon name="search" size={17} />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por paciente o CI"
            aria-label="Buscar consulta pendiente"
          />
        </label>
        <div className="agenda-filtros-fecha">
          <label>
            Fecha
            <input
              type="date"
              value={fechaSeleccionada}
              disabled={Boolean(fechaDesde || fechaHasta)}
              onChange={(event) => setFechaSeleccionada(event.target.value)}
              aria-label="Ver agenda del día"
            />
          </label>
          <label>
            Desde
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(event) => setFechaDesde(event.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(event) => setFechaHasta(event.target.value)}
            />
          </label>
          {(fechaDesde || fechaHasta || fechaSeleccionada !== hoy) && (
            <button
              type="button"
              onClick={() => {
                setFechaDesde("");
                setFechaHasta("");
                setFechaSeleccionada(fechaHoy());
              }}
            >
              Hoy
            </button>
          )}
        </div>
        <span>
          <Icon name="calendar" size={17} /> {pendientes.length} pendientes
        </span>
      </div>
      <div className="agenda-ambulatoria-tablero">
        <section className="agenda-cola panel">
          <header>
            <span>CONSULTA</span>
            <span>PACIENTE</span>
            <span>ESPECIALIDAD</span>
            <span>MOTIVO DE CONSULTA</span>
            <span>SIGNOS VITALES</span>
            <span>ACCIÓN</span>
          </header>
          {cargandoAgenda ? (
            <div className="agenda-cola-vacia" role="status">Cargando consultas...</div>
          ) : pendientes.length ? (
            pendientes.map((cita) => (
              <article key={cita.id}>
                <time dateTime={`${cita.fecha}T${cita.hora}`}>
                  <strong>{cita.hora}</strong>
                  <small>{cita.fecha.split("-").reverse().join("/")}</small>
                  {cita.tipo === "reconsulta" && <small>Reconsulta</small>}
                  {cita.estado === "por_confirmar" && <small>Por confirmar</small>}
                </time>
                <div>
                  <strong>{cita.paciente}</strong>
                </div>
                <div className="agenda-medico">
                  <strong>{cita.especialidad || "Consulta ambulatoria"}</strong>
                </div>
                <div className="agenda-motivo">
                  <strong>
                    {cita.motivoOperativo || "Sin motivo registrado"}
                  </strong>
                </div>
                <span
                  className={`agenda-signos ${signosRegistrados(cita) ? "registrados" : "pendientes"}`}
                >
                  {signosRegistrados(cita)
                    ? "Registrados"
                    : "Pendientes de registro"}
                </span>
                <button type="button" onClick={() => atender(cita)}>
                  <Icon name="userCheck" size={15} />{" "}
                  {obtenerAtencionAmbulatoria(cita) ? "Continuar" : "Atender"}
                </button>
              </article>
            ))
          ) : (
            <div className="agenda-cola-vacia">
              <Icon name="calendar" size={25} />
              <strong>No hay consultas por atender</strong>
              <small>
                Las citas pendientes y confirmadas aparecerán en esta lista.
              </small>
            </div>
          )}
        </section>
        <aside className="agenda-lateral agenda-atendidas">
          <header>
            <div>
              <p>{fechaDesde || fechaHasta || fechaSeleccionada !== hoy ? "ATENDIDOS EN EL PERÍODO" : "ATENDIDOS HOY"}</p>
              <strong>Consultas realizadas</strong>
            </div>
            <span>{atendidas.length}</span>
          </header>
          <label className="agenda-buscar-atendidas">
            <Icon name="search" size={15} />
            <input
              value={busquedaAtendidas}
              onChange={(event) => setBusquedaAtendidas(event.target.value)}
              placeholder="Buscar atendido..."
            />
          </label>
          {atendidas.length ? (
            <div>
              {atendidas.map((cita) => (
                <article key={`${cita.id}-${cita.fecha}-${cita.hora}`}>
                  <span className="agenda-iniciales">
                    {cita.paciente
                      .split(" ")
                      .map((parte) => parte[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{cita.paciente}</strong>
                    <small>Consulta {cita.hora}</small>
                    <small>{cita.fecha.split("-").reverse().join("/")}</small>
                    <small>{cita.especialidad || "Consulta ambulatoria"}</small>
                  </div>
                  {cita.atencionFinalizadaEn || obtenerAtencionAmbulatoria(cita)?.finalizadaEn ? (
                    <Icon name="check" size={16} />
                  ) : (
                    <button type="button" onClick={() => atender(cita)}>
                      Continuar
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p>Aún no hay consultas atendidas.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
