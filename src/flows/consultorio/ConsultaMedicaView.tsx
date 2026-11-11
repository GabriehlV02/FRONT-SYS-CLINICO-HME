import { useEffect, useState, useSyncExternalStore } from "react";
import Icon from "../../radius/componentes/Icono";
import { HojaLaboratorios } from "./HojaLaboratorios";
import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import "./ConsultaMedicaView.css";
import "./ConsultaImpresion.css";
import {
  guardarSignosVitales,
  obtenerSignosVitales,
  suscribirSignosVitales,
} from "../triaje/registroSignosVitales";
import { apiFetch } from "../../radius/api";
import { useServiciosSignosVitales } from "../triaje/ServiciosSignosVitales";
import { camposParaServicio } from "../triaje/camposSignosVitales";
import type { SignoVitalConfig } from "../triaje/ConfiguracionSignosVitalesView";
import {
  guardarEpisodio,
  obtenerAtencionAmbulatoria,
  obtenerEpisodios,
  origenConsultaAmbulatoria,
  suscribirEpisodios,
  type DocumentoEpisodio,
} from "./registroHistoria";
import { RecetarioMedico } from "./RecetarioMedico";
import { leerPaquetes, type Paquete } from "./FavoritosPaquetes";
import {
  crearSolicitudLaboratorio,
  leerSolicitudesLaboratorio,
  suscribirLaboratorio,
  type SolicitudLaboratorio,
} from "../laboratorio/almacenLaboratorio";
import { OrdenInternacionMedica } from "./OrdenInternacionMedica";
import { RevisionConsulta } from "./RevisionConsulta";
import { BuscadorDiagnostico } from "./BuscadorDiagnostico";
import "../laboratorio/LaboratorioView.css";

type TipoOrden = "laboratorio" | "imagenologia" | "internacion";
type SeccionConsulta = "atencion" | "resultados" | "historia" | "tratamientos";
type DatosClinicos = {
  motivoConsulta: string;
  enfermedadActual: string;
  examenFisico: string;
};
type DiagnosticoConPlan = { id: string; diagnostico: string; planes: string[] };
const titulosOrden: Record<TipoOrden, string> = {
  laboratorio: "laboratorio",
  imagenologia: "imagenología",
  internacion: "internación",
};
const seccionesConsulta: {
  id: SeccionConsulta;
  nombre: string;
  icono: "userCheck" | "lab" | "fileText" | "patient";
}[] = [
  { id: "atencion", nombre: "Atención", icono: "userCheck" },
  { id: "resultados", nombre: "Resultados de estudios", icono: "lab" },
  { id: "historia", nombre: "Historia clínica", icono: "fileText" },
  { id: "tratamientos", nombre: "Tratamientos", icono: "patient" },
];
const catalogoOrdenesMedicas = [
  "Hemograma completo",
  "Glucemia",
  "Perfil lipídico",
  "Radiografía de tórax",
  "Ecografía abdominal",
  "Tomografía",
  "Interconsulta cardiología",
  "Interconsulta cirugía",
  "Internación",
  "Control de signos vitales",
];
const normalizarBusquedaOrden = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

const resultadosDemo = (paciente: CitaConfirmada): SolicitudLaboratorio[] => [
  {
    id: `demo-resultados-${paciente.ci}`,
    paciente: paciente.paciente,
    ci: paciente.ci,
    medico: paciente.doctor || "Médico tratante",
    origen: "ambulatorio",
    consultaId: "demo-consulta",
    fecha: "2026-10-28T09:10:00.000Z",
    actualizadoEn: "2026-10-28T10:05:00.000Z",
    estado: "completado",
    finalizadoEn: "2026-10-28T10:05:00.000Z",
    registradoPor: "Laboratorio clínico",
    observacion: "Resultados de ejemplo para visualización clínica.",
    estudios: [
      {
        id: "demo-hemograma",
        nombre: "Hemograma completo",
        resultados: [
          {
            id: "hb",
            parametro: "Hemoglobina",
            valor: "13.4",
            unidad: "g/dL",
            referencia: "12.0 - 16.0",
          },
          {
            id: "leu",
            parametro: "Leucocitos",
            valor: "7.2",
            unidad: "10³/µL",
            referencia: "4.5 - 11.0",
          },
          {
            id: "pla",
            parametro: "Plaquetas",
            valor: "268",
            unidad: "10³/µL",
            referencia: "150 - 400",
          },
        ],
      },
      {
        id: "demo-glucosa",
        nombre: "Glucosa en sangre",
        resultados: [
          {
            id: "glu",
            parametro: "Glucosa",
            valor: "92",
            unidad: "mg/dL",
            referencia: "70 - 110",
          },
        ],
      },
    ],
  },
];

function OrdenesConsulta({
  paciente,
  onAbrir,
  onAbrirRecetario,
}: {
  paciente: CitaConfirmada | null;
  onAbrir?: (tipo: TipoOrden) => void;
  onAbrirRecetario?: () => void;
}) {
  const [mensaje, setMensaje] = useState("");
  const abrir = (tipo: TipoOrden) => {
    if (!paciente) {
      setMensaje("Selecciona primero un paciente en atención.");
      return;
    }
    setMensaje("");
    onAbrir?.(tipo);
  };
  return (
    <>
      <nav className="consulta-ordenes">
        <button
          className="orden-laboratorio"
          type="button"
          onClick={() => abrir("laboratorio")}
        >
          <Icon name="lab" size={17} /> Orden de laboratorio
        </button>
        <button
          className="orden-imagenologia"
          type="button"
          onClick={() => abrir("imagenologia")}
        >
          <Icon name="image" size={17} /> Orden de imagenología
        </button>
        <button
          className="orden-recetario"
          type="button"
          onClick={() => {
            if (!paciente) {
              setMensaje("Selecciona primero un paciente en atención.");
              return;
            }
            setMensaje("");
            onAbrirRecetario?.();
          }}
        >
          <Icon name="fileText" size={17} /> Recetario médico
        </button>
        <button
          className="orden-internacion"
          type="button"
          onClick={() => abrir("internacion")}
        >
          <Icon name="patient" size={17} /> Orden de internación
        </button>
      </nav>
      {mensaje && <em className="consulta-aviso">{mensaje}</em>}
    </>
  );
}

export function ConsultaMedicaView({
  paciente,
  medico,
  signos,
  estadoSignos,
}: {
  paciente: CitaConfirmada | null;
  medico: string;
  signos: SignoVitalConfig[];
  estadoSignos: "cargando" | "listo" | "error";
}) {
  const catalogoServicios = useServiciosSignosVitales();
  useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const [seccion, setSeccion] = useState<SeccionConsulta>("atencion");
  const [recetarioAbierto, setRecetarioAbierto] = useState(false);
  const [paqueteId, setPaqueteId] = useState("");
  const [paqueteAplicado, setPaqueteAplicado] = useState<Paquete | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(true);
  const [vitales, setVitales] = useState<Record<string, string>>({});
  const [cargandoValoracion, setCargandoValoracion] = useState(true);
  const [guardandoValoracion, setGuardandoValoracion] = useState(false);
  const [errorValoracion, setErrorValoracion] = useState("");
  const [cargaValoracionFallida, setCargaValoracionFallida] = useState(false);
  const [mensajeValoracion, setMensajeValoracion] = useState("");
  const [versionValoracion, setVersionValoracion] = useState<number | null>(
    null,
  );
  const [conflictoValoracion, setConflictoValoracion] = useState(false);
  const [recargaValoracion, setRecargaValoracion] = useState(0);
  const [notasMedicas, setNotasMedicas] = useState<Record<string, string>>({});
  const [antecedentes, setAntecedentes] = useState<Record<string, string>>({});
  const [diagnosticosFinales, setDiagnosticosFinales] = useState<
    Record<string, DiagnosticoConPlan[]>
  >({});
  const [atencionesCerradas, setAtencionesCerradas] = useState<
    Record<string, boolean>
  >({});
  const [vistaImpresionAbierta, setVistaImpresionAbierta] = useState(false);
  const [busquedaOrdenMedica, setBusquedaOrdenMedica] = useState("");
  const [buscadorOrdenAbierto, setBuscadorOrdenAbierto] = useState(false);
  const [ordenesMedicas, setOrdenesMedicas] = useState<
    Record<string, string[]>
  >({});
  const [datosClinicos, setDatosClinicos] = useState<
    Record<string, DatosClinicos>
  >({});
  const [tipoOrden, setTipoOrden] = useState<TipoOrden | null>(null);
  const [detalleOrden, setDetalleOrden] = useState("");
  const [laboratoriosElegidos, setLaboratoriosElegidos] = useState("");
  const [episodioGuardado, setEpisodioGuardado] = useState("");
  const [ordenInternacionEmitida, setOrdenInternacionEmitida] = useState("");
  const [resultadosLaboratorio, setResultadosLaboratorio] = useState<
    SolicitudLaboratorio[]
  >([]);
  useEffect(() => {
    const cargar = () => {
      try {
        const resultados = leerSolicitudesLaboratorio().filter(
          (s) => s.ci === paciente?.ci && s.estado === "completado",
        );
        setResultadosLaboratorio(resultados);
      } catch {
        setResultadosLaboratorio([]);
      }
    };
    cargar();
    return suscribirLaboratorio(cargar);
  }, [paciente?.ci]);
  const vitalesTriaje = useSyncExternalStore(
    suscribirSignosVitales,
    () => (paciente ? obtenerSignosVitales(paciente) : undefined),
    () => undefined,
  );
  useEffect(() => {
    if (!paciente) {
      setCargandoValoracion(false);
      return;
    }
    const controller = new AbortController();
    setCargandoValoracion(true);
    setErrorValoracion("");
    setCargaValoracionFallida(false);
    setConflictoValoracion(false);
    apiFetch(
      `/api/v1/citas/${encodeURIComponent(paciente.id)}/signos-vitales`,
      { signal: controller.signal },
    )
      .then(async (respuesta) => {
        if (!respuesta.ok)
          throw new Error("No se pudo cargar la valoración de esta consulta.");
        const resultado = await respuesta.json();
        if (!controller.signal.aborted) {
          guardarSignosVitales(paciente, resultado.data?.valores ?? {});
          setVersionValoracion(resultado.data?.id ?? null);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCargaValoracionFallida(true);
          setErrorValoracion(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la valoración.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoValoracion(false);
      });
    return () => controller.abort();
  }, [paciente?.id, recargaValoracion]);
  if (!paciente)
    return (
      <section className="consulta-inicio consulta-inicio-sin-lista">
        <section className="consulta-area panel">
          <header>
            <div>
              <p>CONSULTA MÉDICA</p>
              <h2>Sin paciente en atención</h2>
              <small>
                La información se cargará al pulsar “Atender” desde la Agenda.
              </small>
            </div>
            <OrdenesConsulta paciente={null} />
          </header>
          <div className="consulta-area-vacia">
            <Icon name="userCheck" size={30} />
            <strong>Aún no hay una consulta iniciada</strong>
            <small>
              Selecciona “Atender” en la Agenda para cargar los datos del
              paciente.
            </small>
          </div>
        </section>
      </section>
    );
  const episodioActual = obtenerAtencionAmbulatoria(paciente);
  const idsAmbulatorio = catalogoServicios.servicios.find(
    (servicio) => servicio.id === "consulta-ambulatoria",
  )?.signos;
  const campos = camposParaServicio(signos, idsAmbulatorio ?? []);
  const datos = { ...(vitalesTriaje ?? {}), ...vitales };
  const camposConResultado = campos.filter(
    (campo) => datos[campo.id] !== undefined && datos[campo.id] !== "",
  );
  const guardarValoracion = async () => {
    const valores = Object.fromEntries(
      campos
        .map((campo) => [campo.id, (datos[campo.id] || "").trim()])
        .filter(([, valor]) => valor),
    );
    if (!Object.keys(valores).length) {
      setErrorValoracion("Registra al menos una medición.");
      return;
    }
    setGuardandoValoracion(true);
    setErrorValoracion("");
    setMensajeValoracion("");
    setConflictoValoracion(false);
    try {
      const respuesta = await apiFetch(
        `/api/v1/citas/${encodeURIComponent(paciente.id)}/signos-vitales`,
        {
          method: "POST",
          body: JSON.stringify({ valores, version: versionValoracion }),
        },
      );
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        if (respuesta.status === 409) setConflictoValoracion(true);
        throw new Error(
          resultado.message || "No se pudieron guardar los signos vitales.",
        );
      }
      guardarSignosVitales(paciente, resultado.data.valores);
      setVersionValoracion(resultado.data.id);
      setVitales({});
      setMostrarFormulario(true);
      setMensajeValoracion("Signos vitales guardados.");
    } catch (error) {
      setErrorValoracion(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los signos vitales.",
      );
    } finally {
      setGuardandoValoracion(false);
    }
  };
  const origenConsulta = origenConsultaAmbulatoria(paciente);
  const datosClinicosPaciente = datosClinicos[paciente.ci] ?? {
    motivoConsulta: episodioActual?.motivo || "",
    enfermedadActual: episodioActual?.enfermedadActual || "",
    examenFisico: episodioActual?.examenFisico || "",
  };
  const atencionFinalizada = Boolean(
    atencionesCerradas[paciente.ci] || episodioActual?.finalizadaEn,
  );
  const ordenesPaciente = ordenesMedicas[paciente.ci] ?? [];
  const diagnosticosPaciente =
    diagnosticosFinales[paciente.ci] ??
    (episodioActual?.diagnosticos ?? []).map((item, indice) => ({
      ...item,
      id: `historial-${indice}`,
    }));
  const consultasAnteriores = obtenerEpisodios()
    .filter(
      (episodio) =>
        episodio.paciente.ci === paciente.ci &&
        episodio.origenId !== origenConsulta,
    )
    .sort((a, b) =>
      (b.actualizadoEn || "").localeCompare(a.actualizadoEn || ""),
    );
  const ultimaConsulta = consultasAnteriores[0];
  const antecedentesPaciente =
    consultasAnteriores.find((episodio) => episodio.antecedentes.trim())
      ?.antecedentes || "Sin antecedentes registrados";
  const alergiasPaciente =
    consultasAnteriores.find((episodio) => /alerg/i.test(episodio.antecedentes))
      ?.antecedentes || "Sin alergias registradas";
  const diagnosticosPrevios = consultasAnteriores
    .flatMap(
      (episodio) =>
        episodio.diagnosticos?.map((diagnostico) => diagnostico.diagnostico) ??
        [],
    )
    .filter(Boolean);
  const ordenesFiltradas = catalogoOrdenesMedicas.filter(
    (orden) =>
      normalizarBusquedaOrden(orden).includes(normalizarBusquedaOrden(busquedaOrdenMedica)) &&
      !ordenesPaciente.includes(orden),
  );
  const nombreCompletoPaciente =
    [paciente.nombre, paciente.apellidos]
      .filter((parte): parte is string => Boolean(parte?.trim()))
      .join(" ") ||
    paciente.paciente.trim() ||
    "No registrado";
  const guardarReceta = (receta: DocumentoEpisodio) => {
    const existente = obtenerEpisodios().find(
      (e) => e.origenId === origenConsulta,
    );
    guardarEpisodio({
      origenId: origenConsulta,
      tipo: "Consulta médica",
      paciente,
      medico:
        paciente.doctor && paciente.doctor !== "Agenda ambulatoria"
          ? paciente.doctor
          : medico,
      fecha: paciente.fecha,
      motivo:
        datosClinicosPaciente.motivoConsulta.trim() || existente?.motivo || "",
      enfermedadActual:
        datosClinicosPaciente.enfermedadActual.trim() ||
        existente?.enfermedadActual ||
        "",
      examenFisico:
        datosClinicosPaciente.examenFisico.trim() ||
        existente?.examenFisico ||
        "",
      antecedentes: antecedentes[paciente.ci] ?? existente?.antecedentes ?? "",
      notas: notasMedicas[paciente.ci] ?? existente?.notas ?? "",
      diagnosticos: diagnosticosPaciente.map(({ diagnostico, planes }) => ({
        diagnostico,
        planes: planes.filter(Boolean),
      })),
      signosVitales: Object.keys(datos).length
        ? { ...datos }
        : (existente?.signosVitales ?? {}),
      recetas: [
        ...(existente?.recetas ?? []).map((r) => ({
          ...r,
          fecha: r.fecha || existente?.fecha,
          medico: r.medico || existente?.medico,
        })),
        receta,
      ],
      ordenes: existente?.ordenes ?? [],
      resultados: existente?.resultados ?? [],
      reconsultas: existente?.reconsultas ?? [],
    });
  };
  const guardarEnHistoria = (finalizar = false) => {
    const ordenes = [
      ...(laboratoriosElegidos
        ? [
            {
              tipo: "Laboratorio",
              detalle: laboratoriosElegidos,
              estado: "Solicitado",
            },
          ]
        : []),
      ...(tipoOrden && tipoOrden !== "laboratorio" && detalleOrden.trim()
        ? [
            {
              tipo: titulosOrden[tipoOrden],
              detalle: detalleOrden.trim(),
              estado: "Solicitado",
            },
          ]
        : []),
    ];
    const episodio = guardarEpisodio({
      origenId: origenConsulta,
      tipo: "Consulta médica",
      paciente,
      medico:
        paciente.doctor && paciente.doctor !== "Agenda ambulatoria"
          ? paciente.doctor
          : medico,
      fecha: paciente.fecha,
      motivo: datosClinicosPaciente.motivoConsulta.trim(),
      enfermedadActual: datosClinicosPaciente.enfermedadActual.trim(),
      examenFisico: datosClinicosPaciente.examenFisico.trim(),
      antecedentes: (
        antecedentes[paciente.ci] ??
        episodioActual?.antecedentes ??
        ""
      ).trim(),
      notas: (notasMedicas[paciente.ci] ?? episodioActual?.notas ?? "").trim(),
      diagnosticos: diagnosticosPaciente.map(({ diagnostico, planes }) => ({
        diagnostico,
        planes: planes.filter(Boolean),
      })),
      signosVitales: Object.keys(datos).length
        ? { ...datos }
        : (episodioActual?.signosVitales ?? {}),
      recetas: [],
      ordenes,
      resultados: [],
      reconsultas: [],
      ...(finalizar ? { finalizadaEn: new Date().toISOString() } : {}),
    });
    setEpisodioGuardado(episodio.episodioId);
    if (finalizar)
      setAtencionesCerradas((actual) => ({ ...actual, [paciente.ci]: true }));
  };
  const finalizarAtencion = () => {
    guardarEnHistoria(true);
    setVistaImpresionAbierta(true);
  };
  return (
    <section
      className="consulta-medica"
      aria-label={`Consulta de ${paciente.paciente}`}
    >
      <section className="consulta-activa-derecha">
        <div className="consulta-cabecera-fija">
          <div className="consulta-volver-listado-fila">
            <button
              type="button"
              className="consulta-volver-listado"
              onClick={() =>
                window.dispatchEvent(new Event("consulta:volver-al-listado"))
              }
            >
              <Icon name="chevronLeft" size={16} />
              <span>Volver al listado</span>
            </button>
          </div>
          <header className="consulta-area-cabecera">
            <div className="consulta-resumen-paciente">
              <div>
                <p>CONSULTA MÉDICA</p>
                <small>CI {paciente.ci}</small>
                <dl className="consulta-datos-personales">
                  <div>
                    <dt>Paciente</dt>
                    <dd>{nombreCompletoPaciente}</dd>
                  </div>
                  <div>
                    <dt>Edad</dt>
                    <dd>{paciente.edad ?? "No registrado"}</dd>
                  </div>
                  <div>
                    <dt>Fecha de nacimiento</dt>
                    <dd>{paciente.fechaNacimiento ?? "No registrada"}</dd>
                  </div>
                </dl>
              </div>
              <section
                className="consulta-contexto-clinico"
                aria-label="Resumen de antecedentes del paciente"
              >
                <header>
                  <p>RESUMEN CLÍNICO</p>
                </header>
                <dl>
                  <div>
                    <dt>Antecedentes</dt>
                    <dd>{antecedentesPaciente}</dd>
                  </div>
                  <div>
                    <dt>Alergias</dt>
                    <dd>{alergiasPaciente}</dd>
                  </div>
                  <div>
                    <dt>Diagnósticos previos</dt>
                    <dd>
                      {diagnosticosPrevios.length
                        ? diagnosticosPrevios.join(" · ")
                        : "Sin diagnósticos registrados"}
                    </dd>
                  </div>
                  <div>
                    <dt>Última consulta</dt>
                    <dd>
                      {ultimaConsulta
                        ? `${ultimaConsulta.fecha} · ${ultimaConsulta.motivo || "Sin motivo registrado"}`
                        : "Sin consultas previas"}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </header>
          <div className="consulta-secciones-bar">
            <nav
              className="consulta-secciones"
              aria-label="Secciones de la consulta"
            >
              {seccionesConsulta.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={seccion === item.id ? "activo" : ""}
                  aria-current={seccion === item.id ? "page" : undefined}
                  onClick={() => setSeccion(item.id)}
                >
                  <Icon name={item.icono} size={16} />
                  <span>{item.nombre}</span>
                </button>
              ))}
            </nav>
            {seccion === "atencion" && (
              <div className="consulta-guardar-historia consulta-guardar-en-barra">
                <button
                  type="button"
                  onClick={() => guardarEnHistoria()}
                  disabled={!datosClinicosPaciente.motivoConsulta.trim()}
                >
                  <Icon name="fileText" size={16} /> Guardar episodio
                  cl&iacute;nico
                </button>
                {episodioGuardado && (
                  <span>
                    Episodio {episodioGuardado} actualizado en la historia
                    cl&iacute;nica.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {seccion === "atencion" && (
          <>
            <div className="consulta-paquete">
              <label>
                Paquete favorito
                <select
                  value={paqueteId}
                  onChange={(e) => setPaqueteId(e.target.value)}
                >
                  <option value="">Seleccionar paquete</option>
                  {leerPaquetes(medico).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!paqueteId || atencionFinalizada}
                onClick={() => {
                  const paquete = leerPaquetes(medico).find(
                    (p) => p.id === paqueteId,
                  );
                  if (!paquete) return;
                  setPaqueteAplicado(paquete);
                  if (paquete.indicaciones.length)
                    setDiagnosticosFinales((actual) => ({
                      ...actual,
                      [paciente.ci]: [
                        ...(actual[paciente.ci] ?? diagnosticosPaciente),
                        {
                          id: crypto.randomUUID(),
                          diagnostico: "",
                          planes: [...paquete.indicaciones],
                        },
                      ],
                    }));
                }}
              >
                Cargar paquete
              </button>
              {paqueteAplicado && (
                <>
                  <p>
                    Paquete «{paqueteAplicado.nombre}» cargado. Revisa las
                    indicaciones y prepara los documentos correspondientes.
                  </p>
                  {paqueteAplicado.medicamentos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeccion("tratamientos");
                        setRecetarioAbierto(true);
                      }}
                    >
                      Revisar receta ({paqueteAplicado.medicamentos.length})
                    </button>
                  )}
                  {paqueteAplicado.laboratorios.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTipoOrden("laboratorio")}
                    >
                      Revisar laboratorios (
                      {paqueteAplicado.laboratorios.length})
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="consulta-guardar-historia">
              <button
                type="button"
                onClick={() => guardarEnHistoria()}
                disabled={!datosClinicosPaciente.motivoConsulta.trim()}
              >
                <Icon name="fileText" size={16} /> Guardar episodio clínico
              </button>
              {episodioGuardado && (
                <span>
                  Episodio {episodioGuardado} actualizado en la historia
                  clínica.
                </span>
              )}
            </div>
            {tipoOrden === "laboratorio" && (
              <HojaLaboratorios
                permitirEstudiosLocales
                seleccionInicial={paqueteAplicado?.laboratorios.map(
                  (l) => l.id,
                )}
                paciente={paciente.paciente}
                onCerrar={() => setTipoOrden(null)}
                onAceptar={(items) => {
                  crearSolicitudLaboratorio(
                    {
                      profesionalId: paciente.profesionalId,
                      pacienteId: paciente.pacienteId,
                      paciente: paciente.paciente,
                      ci: paciente.ci,
                      medico: paciente.doctor,
                      consultaId: paciente.id,
                    },
                    items,
                  );
                  setLaboratoriosElegidos(
                    items.map((i) => i.nombre).join(" · "),
                  );
                  setTipoOrden(null);
                }}
              />
            )}
            {laboratoriosElegidos && (
              <p className="consulta-aviso" role="status">
                Solicitud enviada a Laboratorio · Ambulatorios:{" "}
                {laboratoriosElegidos}
              </p>
            )}
            {tipoOrden === "imagenologia" && (
              <section
                className="consulta-orden-panel panel"
                aria-label="Orden de imagenología"
              >
                <header>
                  <div>
                    <p>ORDEN DE IMAGENOLOGÍA</p>
                    <h3>{paciente.paciente}</h3>
                    <small>
                      CI {paciente.ci} · Cita {paciente.hora}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTipoOrden(null)}
                    aria-label="Cerrar orden"
                  >
                    ×
                  </button>
                </header>
                <label>
                  Estudios y regiones solicitados
                  <textarea
                    value={detalleOrden}
                    onChange={(event) => setDetalleOrden(event.target.value)}
                    placeholder="Escribe los estudios solicitados"
                  />
                </label>
                <footer>
                  <button type="button" onClick={() => setTipoOrden(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!detalleOrden.trim()}
                    onClick={() => window.print()}
                  >
                    Imprimir orden
                  </button>
                </footer>
              </section>
            )}
            {tipoOrden === "internacion" && (
              <OrdenInternacionMedica
                paciente={paciente}
                medico={medico}
                onCerrar={() => setTipoOrden(null)}
                onEmitir={() => {
                  setOrdenInternacionEmitida(paciente.paciente);
                  setTipoOrden(null);
                }}
              />
            )}
            {ordenInternacionEmitida && (
              <p
                className="consulta-aviso consulta-aviso-internacion"
                role="status"
              >
                Orden emitida para {ordenInternacionEmitida}. Enfermería y
                Recepción la verán como preinternación.
              </p>
            )}
            <div className="consulta-atencion-superior">
              <div className="consulta-atencion-principal">
                <section className="consulta-signos panel">
                  <header>
                    <div>
                      <p>SIGNOS VITALES</p>
                    </div>

                  </header>
                  {(estadoSignos === "cargando" ||
                    catalogoServicios.cargando) && (
                    <p role="status">Cargando signos configurados...</p>
                  )}
                  {cargandoValoracion && (
                    <p role="status">Cargando valoración de la consulta…</p>
                  )}
                  {errorValoracion && <p role="alert">{errorValoracion}</p>}
                  {conflictoValoracion && (
                    <button
                      className="secundario consulta-signos-recargar"
                      type="button"
                      onClick={() => {
                        setVitales({});
                        setRecargaValoracion((actual) => actual + 1);
                      }}
                    >
                      Descartar cambios y cargar versión actual
                    </button>
                  )}
                  {mensajeValoracion && (
                    <p role="status">{mensajeValoracion}</p>
                  )}
                  {(estadoSignos === "error" ||
                    catalogoServicios.error ||
                    (!catalogoServicios.cargando && !idsAmbulatorio)) && (
                    <p role="alert">
                      {catalogoServicios.error ||
                        "No se pudo cargar la configuración de signos para consulta ambulatoria."}
                    </p>
                  )}
                  {estadoSignos === "listo" &&
                    !catalogoServicios.cargando &&
                    !catalogoServicios.error &&
                    idsAmbulatorio && (
                      <>
                        {campos.length === 0 && (
                          <p>
                            No hay signos vitales asignados a consulta
                            ambulatoria.
                          </p>
                        )}
                        {!mostrarFormulario &&
                          camposConResultado.length > 0 && (
                            <div
                              className="consulta-signos-grid"
                              role="region"
                              aria-label="Signos vitales registrados, desplazamiento horizontal"
                              tabIndex={0}
                            >
                              {camposConResultado.map(
                                ({ id, etiqueta, unidad }) => (
                                  <article key={id}>
                                    <small>{etiqueta}</small>
                                    <strong>
                                      {datos[id]}
                                      {unidad ? " " + unidad : ""}
                                    </strong>
                                  </article>
                                ),
                              )}
                            </div>
                          )}
                        {!mostrarFormulario &&
                          !cargandoValoracion &&
                          !cargaValoracionFallida &&
                          campos.length > 0 &&
                          camposConResultado.length === 0 && (
                            <p className="consulta-signos-sin-datos">
                              No hay signos vitales registrados para esta
                              consulta.
                            </p>
                          )}
                        {mostrarFormulario && (
                            <>
                              <div className="consulta-signos-form">
                                {campos.map(
                                  ({ id, etiqueta, unidad, tipo, rango }) => (
                                    <div
                                      className="consulta-signo-campo"
                                      key={id}
                                    >
                                      <label htmlFor={`consulta-signo-${id}`}>
                                        {etiqueta}
                                      </label>
                                      <div className="consulta-signo-entrada">
                                        <input
                                          id={`consulta-signo-${id}`}
                                          type={
                                            tipo === "Texto" ? "text" : "number"
                                          }
                                          step={
                                            tipo === "Número entero"
                                              ? "1"
                                              : "any"
                                          }
                                          value={datos[id] ?? ""}
                                          disabled={guardandoValoracion}
                                          onChange={(event) =>
                                            setVitales((actual) => ({
                                              ...actual,
                                              [id]: event.target.value,
                                            }))
                                          }
                                          placeholder="—"
                                        />
                                        {unidad && <span>{unidad}</span>}
                                      </div>
                                      {rango && (
                                        <details className="consulta-signo-referencia">
                                          <summary>
                                            Ref. {rango.minimo}–{rango.maximo}{" "}
                                            {unidad}
                                          </summary>
                                          <div>
                                            <strong>
                                              {rango.nombre || "Referencia"}
                                            </strong>
                                            {rango.contexto && (
                                              <p>{rango.contexto}</p>
                                            )}
                                            {rango.fuente && (
                                              <a
                                                href={rango.fuente}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                Consultar fuente
                                              </a>
                                            )}
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                              <button
                                className="primario consulta-signos-guardar"
                                type="button"
                                disabled={
                                  guardandoValoracion ||
                                  cargandoValoracion ||
                                  cargaValoracionFallida ||
                                  conflictoValoracion ||
                                  !campos.length
                                }
                                onClick={() => void guardarValoracion()}
                              >
                                {guardandoValoracion
                                  ? "Guardando…"
                                  : "Guardar signos vitales"}
                              </button>
                            </>
                          )}
                      </>
                    )}
                </section>
                <section
                  className="consulta-seguimiento-clinico"
                  aria-label="Seguimiento clínico de la consulta"
                >
                  <details className="consulta-seguimiento-panel" open>
                    <summary>
                      <span>Anamnesis · Relato cronológico</span>
                      <Icon name="chevronRight" size={18} />
                    </summary>
                    <div>
                      <textarea
                        aria-label="Anamnesis"
                        value={antecedentes[paciente.ci] ?? ""}
                        onChange={(event) =>
                          setAntecedentes((actual) => ({
                            ...actual,
                            [paciente.ci]: event.target.value,
                          }))
                        }
                        placeholder="Describe el relato cronológico, antecedentes relevantes y evolución del cuadro actual..."
                      />
                    </div>
                  </details>
                  <RevisionConsulta pacienteId={paciente.ci} />
                  <section className="consulta-seguimiento-panel consulta-diagnostico-final">
                    <header>
                      <div>
                        <h3>Diagnósticos y plan médico</h3>
                        <small>
                          Registra los planes o indicaciones que correspondan a
                          cada diagnóstico.
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDiagnosticosFinales((actual) => ({
                            ...actual,
                            [paciente.ci]: [
                              ...(actual[paciente.ci] ?? diagnosticosPaciente),
                              {
                                id: crypto.randomUUID(),
                                diagnostico: "",
                                planes: [""],
                              },
                            ],
                          }))
                        }
                      >
                        <Icon name="plus" size={15} /> Añadir diagnóstico
                      </button>
                    </header>
                    <div className="consulta-diagnosticos-lista">
                      {(diagnosticosPaciente.length
                        ? diagnosticosPaciente
                        : [{ id: "nuevo", diagnostico: "", planes: [""] }]
                      ).map((entrada) => (
                        <article
                          className="consulta-diagnostico-item"
                          key={entrada.id}
                        >
                          <BuscadorDiagnostico
                            valor={entrada.diagnostico}
                            onSeleccionar={(diagnostico) =>
                              setDiagnosticosFinales((actual) => {
                                const lista =
                                  actual[paciente.ci] ?? diagnosticosPaciente;
                                const existe = lista.some(
                                  (item) => item.id === entrada.id,
                                );
                                const actualizado = existe
                                  ? lista.map((item) =>
                                      item.id === entrada.id
                                        ? { ...item, diagnostico }
                                        : item,
                                    )
                                  : [...lista, { ...entrada, diagnostico }];
                                return {
                                  ...actual,
                                  [paciente.ci]: actualizado,
                                };
                              })
                            }
                          />
                          <div className="consulta-planes-diagnostico">
                            <strong>Plan médico / indicaciones</strong>
                            {entrada.planes.map((plan, indice) => (
                              <div
                                className="consulta-plan-campo"
                                key={`${entrada.id}-${indice}`}
                              >
                                <textarea
                                  aria-label={`Plan médico ${indice + 1}`}
                                  value={plan}
                                  onChange={(event) =>
                                    setDiagnosticosFinales((actual) => ({
                                      ...actual,
                                      [paciente.ci]: (
                                        actual[paciente.ci] ?? (diagnosticosPaciente.length ? diagnosticosPaciente : [entrada])
                                      ).map((item) =>
                                        item.id === entrada.id
                                          ? {
                                              ...item,
                                              planes: item.planes.map(
                                                (valor, posicion) =>
                                                  posicion === indice
                                                    ? event.target.value
                                                    : valor,
                                              ),
                                            }
                                          : item,
                                      ),
                                    }))
                                  }
                                  placeholder="Escribe la indicación o plan de contingencia..."
                                />
                                {entrada.planes.length > 1 && (
                                  <button
                                    type="button"
                                    aria-label="Quitar plan"
                                    onClick={() =>
                                      setDiagnosticosFinales((actual) => ({
                                        ...actual,
                                        [paciente.ci]: (
                                          actual[paciente.ci] ?? diagnosticosPaciente
                                        ).map((item) =>
                                          item.id === entrada.id
                                            ? {
                                                ...item,
                                                planes: item.planes.filter(
                                                  (_, posicion) =>
                                                    posicion !== indice,
                                                ),
                                              }
                                            : item,
                                        ),
                                      }))
                                    }
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              className="consulta-agregar-plan"
                              type="button"
                              onClick={() =>
                                setDiagnosticosFinales((actual) => ({
                                  ...actual,
                                  [paciente.ci]: (
                                    actual[paciente.ci] ?? (diagnosticosPaciente.length ? diagnosticosPaciente : [entrada])
                                  ).map((item) =>
                                    item.id === entrada.id
                                      ? {
                                          ...item,
                                          planes: [...item.planes, ""],
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              <Icon name="plus" size={14} /> Añadir indicación
                            </button>
                          </div>
                          {diagnosticosPaciente.length > 1 && (
                            <button
                              className="consulta-quitar-diagnostico"
                              type="button"
                              aria-label="Quitar diagnóstico"
                              onClick={() =>
                                setDiagnosticosFinales((actual) => ({
                                  ...actual,
                                  [paciente.ci]: (
                                    actual[paciente.ci] ?? diagnosticosPaciente
                                  ).filter((item) => item.id !== entrada.id),
                                }))
                              }
                            >
                              ×
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="consulta-seguimiento-panel consulta-cierre-consulta">
                    <header>
                      <div>
                        <h3>Cierre de atención</h3>
                        <small>
                          Finaliza la consulta y revisa el documento antes de
                          imprimirlo.
                        </small>
                      </div>
                      {!atencionFinalizada && (
                        <button type="button" onClick={finalizarAtencion}>
                          Finalizar atención
                        </button>
                      )}
                    </header>
                    <p>
                      {atencionFinalizada
                        ? "Atención finalizada y trasladada a Atendidos hoy."
                        : "Al finalizar se abrirá la vista previa de la historia clínica y órdenes."}
                    </p>
                  </section>
                </section>
              </div>
              <div className="consulta-atencion-lateral">
                <section className="consulta-ordenes-medicas panel">
                  <header>
                    <div>
                      <p>ÓRDENES MÉDICAS</p>
                      <h3>Órdenes del paciente</h3>
                    </div>
                    <span>{ordenesPaciente.length}</span>
                  </header>
                  <OrdenesConsulta
                    paciente={paciente}
                    onAbrir={(tipo) => {
                      setTipoOrden(tipo);
                      setDetalleOrden("");
                    }}
                    onAbrirRecetario={() => {
                      setSeccion("tratamientos");
                      setRecetarioAbierto(true);
                    }}
                  />
                  <div className="consulta-buscador-orden-contenedor" onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setBuscadorOrdenAbierto(false); }} onKeyDown={(evento) => { if (evento.key === 'Escape') setBuscadorOrdenAbierto(false); }}>
                  <label className="consulta-buscador-orden">
                    <Icon name="search" size={16} />
                    <input
                      aria-label="Buscar orden médica"
                      aria-expanded={buscadorOrdenAbierto && Boolean(busquedaOrdenMedica.trim())}
                      aria-controls="consulta-opciones-ordenes"
                      value={busquedaOrdenMedica}
                      onFocus={() => setBuscadorOrdenAbierto(true)}
                      onChange={(event) =>
                        { setBusquedaOrdenMedica(event.target.value); setBuscadorOrdenAbierto(true); }
                      }
                      placeholder="Buscar orden médica"
                    />
                    {busquedaOrdenMedica && <button type="button" className="consulta-limpiar-busqueda-orden" aria-label="Limpiar búsqueda de órdenes" onClick={() => setBusquedaOrdenMedica('')}>×</button>}
                  </label>
                  {buscadorOrdenAbierto && Boolean(busquedaOrdenMedica.trim()) && (
                    <div className="consulta-resultados-orden" id="consulta-opciones-ordenes">
                      {ordenesFiltradas.length ? (
                        ordenesFiltradas.map((orden) => (
                          <button
                            type="button"
                            key={orden}
                            onClick={() => {
                              setOrdenesMedicas((actual) => ({
                                ...actual,
                                [paciente.ci]: [
                                  ...(actual[paciente.ci] ?? []),
                                  orden,
                                ],
                              }));
                              setBusquedaOrdenMedica("");
                              setBuscadorOrdenAbierto(false);
                            }}
                          >
                            <span>{orden}</span>
                          </button>
                        ))
                      ) : (
                        <p>No se encontraron órdenes disponibles. Prueba con otro término.</p>
                      )}
                    </div>
                  )}
                  </div>
                  <section className="consulta-lista-ordenes">
                    <header>
                      <strong>Listado de órdenes</strong>
                      <small>
                        {ordenesPaciente.length} agregada
                        {ordenesPaciente.length === 1 ? "" : "s"}
                      </small>
                    </header>
                    {ordenesPaciente.length ? (
                      ordenesPaciente.map((orden) => (
                        <article key={orden}>
                          <span>
                            <Icon name="fileText" size={15} />
                          </span>
                          <strong>{orden}</strong>
                          <button
                            type="button"
                            aria-label={`Quitar ${orden}`}
                            onClick={() =>
                              setOrdenesMedicas((actual) => ({
                                ...actual,
                                [paciente.ci]: (
                                  actual[paciente.ci] ?? []
                                ).filter((item) => item !== orden),
                              }))
                            }
                          >
                            ×
                          </button>
                        </article>
                      ))
                    ) : (
                      <p>Busca una orden médica para añadirla al listado.</p>
                    )}
                  </section>
                </section>
              </div>
            </div>
          </>
        )}
        {seccion === "resultados" && (
          <section className="consulta-seccion-contenido panel">
            <header>
              <span>
                <Icon name="lab" size={20} />
              </span>
              <div>
                <p>RESULTADOS DE ESTUDIOS</p>
                <h3>Laboratorio e imagenología</h3>
                <small>
                  Resultados de laboratorio registrados para {paciente.paciente}
                  .
                </small>
              </div>
            </header>
            {resultadosLaboratorio.length ? (
              <div className="consulta-resultados-lab">
                {resultadosLaboratorio.map((s) => (
                  <article key={s.id}>
                    <small>
                      {new Date(s.finalizadoEn || s.fecha).toLocaleString(
                        "es-BO",
                      )}{" "}
                      · {s.registradoPor}
                    </small>
                    {s.estudios.map((e) => (
                      <section key={e.id}>
                        <h4>{e.nombre}</h4>
                        {e.resultados.map((r) => (
                          <p key={r.id}>
                            <strong>{r.parametro}:</strong> {r.valor} {r.unidad}
                            {r.referencia && (
                              <small> · Referencia: {r.referencia}</small>
                            )}
                          </p>
                        ))}
                      </section>
                    ))}
                    {s.observacion && <p>Observaciones: {s.observacion}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="consulta-estado-vacio">
                <Icon name="fileText" size={30} />
                <strong>No hay resultados disponibles</strong>
                <small>
                  Los resultados finalizados en Laboratorio aparecerán aquí.
                </small>
              </div>
            )}
          </section>
        )}
        {seccion === "historia" && (
          <section className="consulta-seccion-contenido panel">
            <header>
              <span>
                <Icon name="fileText" size={20} />
              </span>
              <div>
                <p>HISTORIA CLÍNICA</p>
                <h3>Antecedentes y consultas previas</h3>
                <small>Resumen cronológico de atenciones del paciente.</small>
              </div>
            </header>
            <div className="consulta-resumen-clinico">
              <article>
                <small>Antecedentes patológicos</small>
                <strong>Sin antecedentes registrados</strong>
              </article>
              <article>
                <small>Alergias</small>
                <strong>Sin alergias registradas</strong>
              </article>
              <article>
                <small>Cirugías previas</small>
                <strong>Sin cirugías registradas</strong>
              </article>
            </div>
            <div className="consulta-estado-vacio compacto">
              <Icon name="calendar" size={27} />
              <strong>Sin consultas anteriores</strong>
              <small>
                Las atenciones finalizadas se mostrarán aquí en orden
                cronológico.
              </small>
            </div>
          </section>
        )}
        {seccion === "tratamientos" && (
          <RecetarioMedico
            paciente={paciente}
            medico={
              paciente.doctor && paciente.doctor !== "Agenda ambulatoria"
                ? paciente.doctor
                : medico
            }
            abierto={recetarioAbierto}
            medicamentosIniciales={paqueteAplicado?.medicamentos}
            onAbrir={() => setRecetarioAbierto(true)}
            onCerrar={() => setRecetarioAbierto(false)}
            onGuardar={guardarReceta}
          />
        )}
        {vistaImpresionAbierta && (
          <div className="consulta-impresion-fondo" role="presentation">
            <section
              className="consulta-impresion-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Vista previa de historia clínica"
            >
              <header>
                <div>
                  <p>ATENCIÓN FINALIZADA</p>
                  <h3>Vista previa de impresión</h3>
                  <small>
                    Historia clínica y documentos asociados a la consulta.
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => setVistaImpresionAbierta(false)}
                  aria-label="Cerrar vista previa"
                >
                  ×
                </button>
              </header>
              <div className="consulta-hojas">
                <article className="consulta-hoja">
                  <span>HOJA 1 · HISTORIA CLÍNICA</span>
                  <h2>{paciente.paciente}</h2>
                  <small>
                    CI {paciente.ci} · {paciente.especialidad} ·{" "}
                    {paciente.fecha} {paciente.hora}
                  </small>
                  <h4>Anamnesis</h4>
                  <p>{antecedentes[paciente.ci] || "Sin registro."}</p>
                  <h4>Signos vitales</h4>
                  <p>
                    {camposConResultado
                      .map(
                        ({ id, etiqueta, unidad }) =>
                          `${etiqueta}: ${datos[id] || "—"}${unidad ? " " + unidad : ""}`,
                      )
                      .join(" · ") || "Sin registro."}
                  </p>
                  <h4>Diagnósticos y plan médico</h4>
                  {diagnosticosPaciente
                    .filter((item) => item.diagnostico)
                    .map((item) => (
                      <p key={item.id}>
                        <strong>{item.diagnostico}.</strong>{" "}
                        {item.planes.filter(Boolean).join(" · ")}
                      </p>
                    ))}
                </article>
                <article className="consulta-hoja consulta-hoja-doble">
                  <div>
                    <span>HOJA 2 · ORDEN DE IMAGENOLOGÍA</span>
                    <h4>Estudios solicitados</h4>
                    <p>{detalleOrden || "Sin orden de imagenología."}</p>
                  </div>
                  <div>
                    <span>HOJA 2 · RECETARIO</span>
                    <h4>Indicaciones médicas</h4>
                    <p>
                      {ordenesPaciente.length
                        ? ordenesPaciente.join(" · ")
                        : "Sin recetas o indicaciones registradas."}
                    </p>
                  </div>
                </article>
                <article className="consulta-hoja">
                  <span>REVERSO · ORDEN DE LABORATORIO</span>
                  <h4>Laboratorio solicitado</h4>
                  <p>{laboratoriosElegidos || "Sin orden de laboratorio."}</p>
                </article>
              </div>
              <footer>
                <button
                  type="button"
                  onClick={() => setVistaImpresionAbierta(false)}
                >
                  Cerrar
                </button>
                <button type="button" onClick={() => window.print()}>
                  <Icon name="fileText" size={16} /> Imprimir documentos
                </button>
              </footer>
            </section>
          </div>
        )}
      </section>
    </section>
  );
}
