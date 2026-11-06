import { useProfesionales } from "../../radius/profesionales";
import { leerSesion } from "../../radius/types/sesion";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Icon from "../../radius/componentes/Icono";
import { apiFetch } from "../../radius/api";
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
const fechaHoy = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
};
const fechaHoyDe = (valor: string) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? ""
    : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};
export function AgendaAmbulatoriaView({
  medico,
  onAtender,
}: {
  medico: string;
  onAtender?: (cita: CitaConfirmada) => void;
}) {
  const { profesionales } = useProfesionales();
  const profesionalActual = profesionales.find(
    (p) => p.usuario_id === String(leerSesion()?.usuario.id),
  );
  const [errorPacientes, setErrorPacientes] = useState("");
  const [citas, setCitas] = useState<CitaConfirmada[]>([]);
  useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAtendidas, setBusquedaAtendidas] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    const cancelarSuscripcion = suscribirSignosVitales(() =>
      setCitas((actuales) => [...actuales]),
    );
    return () => {
      cancelarSuscripcion();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/citas", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("No se pudo consultar la agenda de pacientes.");
        const datos: CitaConfirmada[] = await response.json();
        setCitas(
          datos.filter(
            (cita) =>
              cita.estado === "confirmada" || cita.estado === "por_confirmar",
          ),
        );
        setErrorPacientes("");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrorPacientes(
            error instanceof Error
              ? error.message
              : "No se pudo consultar la agenda.",
          );
      });
    return () => controller.abort();
  }, []);

  // El backend limita la agenda del médico autenticado; este filtro evita una
  // exposición momentánea mientras se carga el perfil profesional.
  const visibles = useMemo(
    () =>
      citas
        .filter(
          (cita) =>
            /administrador/i.test(medico) ||
            (profesionalActual
              ? cita.profesionalId === profesionalActual.id
              : cita.doctor === medico),
        )
        .sort((a, b) =>
          `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`),
        ),
    [citas, medico, profesionalActual],
  );
  const coincide = (cita: CitaConfirmada, texto: string) =>
    `${cita.paciente} ${cita.ci} ${cita.doctor} ${cita.especialidad}`
      .toLocaleLowerCase()
      .includes(texto.trim().toLocaleLowerCase());
  const coincideFecha = (cita: CitaConfirmada) =>
    fechaDesde && fechaHasta
      ? cita.fecha >= fechaDesde && cita.fecha <= fechaHasta
      : cita.fecha === fechaSeleccionada;
  const pendientes = visibles.filter(
    (cita) =>
      coincideFecha(cita) &&
      !obtenerAtencionAmbulatoria(cita)?.finalizadaEn &&
      coincide(cita, busqueda),
  );
  const atendidasHoy = visibles.filter((cita) => {
    const finalizada = obtenerAtencionAmbulatoria(cita)?.finalizadaEn;
    return (
      finalizada &&
      fechaHoy() === fechaHoyDe(finalizada) &&
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
      {errorPacientes && <p role="alert">{errorPacientes}</p>}
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
          {(fechaDesde || fechaHasta) && (
            <button
              type="button"
              onClick={() => {
                setFechaDesde("");
                setFechaHasta("");
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
          {pendientes.length ? (
            pendientes.map((cita) => (
              <article key={cita.id}>
                <time dateTime={`${cita.fecha}T${cita.hora}`}>
                  <strong>{cita.hora}</strong>
                  <small>{cita.fecha.split("-").reverse().join("/")}</small>
                </time>
                <div>
                  <strong>{cita.paciente}</strong>
                  <small>CI {cita.ci}</small>
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
              <p>ATENDIDOS HOY</p>
              <strong>Consultas realizadas</strong>
            </div>
            <span>{atendidasHoy.length}</span>
          </header>
          <label className="agenda-buscar-atendidas">
            <Icon name="search" size={15} />
            <input
              value={busquedaAtendidas}
              onChange={(event) => setBusquedaAtendidas(event.target.value)}
              placeholder="Buscar atendido..."
            />
          </label>
          {atendidasHoy.length ? (
            <div>
              {atendidasHoy.map((cita) => (
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
                    <small>{cita.especialidad || "Consulta ambulatoria"}</small>
                  </div>
                  {obtenerAtencionAmbulatoria(cita)?.finalizadaEn ? (
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
