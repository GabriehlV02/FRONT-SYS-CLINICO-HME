import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { fechaISOEnBolivia } from "../../utils/fechaBolivia";
import Icon from "../../radius/componentes/Icono";
import { HojaLaboratorios } from "./HojaLaboratorios";
import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import "./ConsultaMedicaView.css";
import "./ConsultaImpresion.css";
import estilosImpresion from "./ConsultaImpresion.css?inline";
import {
  guardarSignosVitales,
  obtenerSignosVitales,
  suscribirSignosVitales,
} from "../triaje/registroSignosVitales";
import { apiFetch } from "../../radius/api";
import { archivarHojaClinica, crearHojaClinicaPdf } from "../../radius/vistas/pacientes/documentosClinicos";
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
import {
  crearSolicitudLaboratorio,
  leerSolicitudesLaboratorio,
  suscribirLaboratorio,
  type SolicitudLaboratorio,
} from "../laboratorio/almacenLaboratorio";
import { OrdenInternacionMedica } from "./OrdenInternacionMedica";
import { RevisionConsulta } from "./RevisionConsulta";
import {
  AntecedentesConsulta,
  antecedentesConsultaVacios,
  type DatosAntecedentesConsulta,
} from "./AntecedentesConsulta";
import { BuscadorDiagnostico } from "./BuscadorDiagnostico";
import type { ConsultaPrevia } from "./ventanaConsultaPrevia";
import { PanelConsultaPrevia } from "./PanelConsultaFlotante";
import "../laboratorio/LaboratorioView.css";

type TipoOrden = "laboratorio" | "imagenologia" | "internacion";
type SeccionConsulta = "atencion" | "resultados" | "historia" | "tratamientos";
type DatosClinicos = {
  motivoConsulta: string;
  enfermedadActual: string;
  examenFisico: string;
};
type DiagnosticoConPlan = { id: string; diagnostico: string; planes: string[] };
type AtencionGuardada = { version: number; finalizadaEn: string | null; contenido: { motivo: string; enfermedadActual: string; examenFisico: string; antecedentes: string; antecedentesEstructurados?: DatosAntecedentesConsulta; notas: string; diagnosticos: { diagnostico: string; planes: string[] }[]; revision: Record<string, string>; ordenes: string[]; documentos?: { ordenes?: DocumentoEpisodio[]; recetas?: DocumentoEpisodio[] } } };
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
type ItemCatalogoOrden = { id: string; codigo: string; nombre: string; tipo: string; categoria?: string; tipoServicio?: string; generico?: string; presentacion?: string };
const normalizarBusquedaOrden = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
async function imprimirDocumentosConsulta(contenido: HTMLElement): Promise<void> {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  Object.assign(marco.style, { position: "fixed", width: "1px", height: "1px", right: "0", bottom: "0", border: "0", opacity: "0" });
  document.body.appendChild(marco);
  const documento = marco.contentDocument;
  const ventana = marco.contentWindow;
  if (!documento || !ventana) { marco.remove(); throw new Error("No se pudo preparar el documento de impresión."); }
  documento.open();
  documento.write("<!doctype html><html lang='es'><head><meta charset='utf-8'><title>Documentos de consulta</title></head><body></body></html>");
  documento.close();
  const estilos = documento.createElement("style");
  estilos.textContent = `@page { size: letter landscape; margin: 8mm; } ${estilosImpresion}`;
  documento.head.appendChild(estilos);
  const fondo = documento.createElement("div");
  fondo.className = "consulta-impresion-fondo";
  const modal = documento.createElement("section");
  modal.className = "consulta-impresion-modal";
  modal.appendChild(documento.importNode(contenido, true));
  fondo.appendChild(modal);
  documento.body.appendChild(fondo);
  await Promise.all(Array.from(documento.images, (imagen) => imagen.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    imagen.addEventListener("load", () => resolve(), { once: true });
    imagen.addEventListener("error", () => resolve(), { once: true });
    window.setTimeout(resolve, 5000);
  })));
  ventana.addEventListener("afterprint", () => marco.remove(), { once: true });
  ventana.focus();
  ventana.print();
  window.setTimeout(() => marco.remove(), 120000);
}
const coincideBusquedaOrden = (palabra: string, texto: string) => {
  if (texto.includes(palabra)) return true;
  if (palabra.length < 4) return false;
  return texto.split(/[^a-z0-9]+/).some((termino) => {
    for (const longitud of [palabra.length - 1, palabra.length, palabra.length + 1]) {
      if (longitud < 1 || termino.length < longitud) continue;
      const prefijo = termino.slice(0, longitud);
      let i = 0, j = 0, diferencias = 0;
      while (i < palabra.length && j < prefijo.length) {
        if (palabra[i] === prefijo[j]) { i++; j++; continue; }
        if (++diferencias > 1) break;
        if (palabra.length > prefijo.length) i++;
        else if (palabra.length < prefijo.length) j++;
        else { i++; j++; }
      }
      if (diferencias + (palabra.length - i) + (prefijo.length - j) <= 1) return true;
    }
    return false;
  });
};



function OrdenesConsulta({
  paciente,
  onAbrir,
}: {
  paciente: CitaConfirmada | null;
  onAbrir?: (tipo: TipoOrden) => void;
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
  const consultaRef = useRef<HTMLElement>(null);
  const cabeceraRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cabecera = cabeceraRef.current;
    const consulta = consultaRef.current;
    if (!cabecera || !consulta) return;
    const actualizarAltura = () => consulta.style.setProperty("--consulta-altura-cabecera", `${cabecera.getBoundingClientRect().height}px`);
    actualizarAltura();
    const observador = new ResizeObserver(actualizarAltura);
    observador.observe(cabecera);
    return () => observador.disconnect();
  }, [paciente]);
  const catalogoServicios = useServiciosSignosVitales();
  useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const [seccion, setSeccion] = useState<SeccionConsulta>("atencion");
  const [recetarioAbierto, setRecetarioAbierto] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
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
  const [antecedentesEstructurados, setAntecedentesEstructurados] = useState<DatosAntecedentesConsulta>(antecedentesConsultaVacios);
  const [mensajeAntecedentes, setMensajeAntecedentes] = useState("");
  const [mensajeOrdenes, setMensajeOrdenes] = useState("");
  const [errorOrdenes, setErrorOrdenes] = useState("");
  const [diagnosticosFinales, setDiagnosticosFinales] = useState<
    Record<string, DiagnosticoConPlan[]>
  >({});
  const [atencionesCerradas, setAtencionesCerradas] = useState<
    Record<string, boolean>
  >({});
  const [vistaImpresionAbierta, setVistaImpresionAbierta] = useState(false);
  const [errorImpresion, setErrorImpresion] = useState("");
  const hojasImpresionRef = useRef<HTMLDivElement>(null);
  const [atencionServidor, setAtencionServidor] = useState<AtencionGuardada | null>(null);
  const [citaAtencionCargada, setCitaAtencionCargada] = useState("");
  const [errorAtencion, setErrorAtencion] = useState("");
  const [guardandoAtencion, setGuardandoAtencion] = useState(false);
  const [recargaAtencion, setRecargaAtencion] = useState(0);
  const guardandoAtencionRef = useRef(false);
  const [revisionSistemas, setRevisionSistemas] = useState<Record<string, string>>({});
  const [historialServidor, setHistorialServidor] = useState<ConsultaPrevia[]>([]);
  const [consultaPreviaAbierta, setConsultaPreviaAbierta] = useState<{ citaActualId: string; consulta: ConsultaPrevia } | null>(null);
  const [filtroHistorial, setFiltroHistorial] = useState<"todas" | "consulta" | "reconsulta" | "internacion">("todas");
  const [citaHistorial, setCitaHistorial] = useState("");
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const reconsultaDialog = useRef<HTMLDialogElement>(null);
  const guardandoReconsultaRef = useRef(false);
  const [fechaReconsulta, setFechaReconsulta] = useState("");
  const [horaReconsulta, setHoraReconsulta] = useState("");
  const [guardandoReconsulta, setGuardandoReconsulta] = useState(false);
  const [mensajeReconsulta, setMensajeReconsulta] = useState("");
  const [errorReconsulta, setErrorReconsulta] = useState("");
  const [busquedaOrdenMedica, setBusquedaOrdenMedica] = useState("");
  const [catalogoOrdenesMedicas, setCatalogoOrdenesMedicas] = useState<ItemCatalogoOrden[]>([]);
  const [estadoCatalogoOrdenes, setEstadoCatalogoOrdenes] = useState<"cargando" | "listo" | "error">("cargando");
  const [recargaCatalogoOrdenes, setRecargaCatalogoOrdenes] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEstadoCatalogoOrdenes("cargando");
    apiFetch("/api/emergencias/catalogo", { signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error();
        const datos: unknown = await respuesta.json();
        if (!Array.isArray(datos)) throw new Error();
        return (datos as ItemCatalogoOrden[]).filter((item) => (item.tipo === "producto" || item.tipo === "servicio") && typeof item.nombre === "string" && typeof item.id === "string");
      })
      .then((items) => { if (!controller.signal.aborted) { setCatalogoOrdenesMedicas(items); setEstadoCatalogoOrdenes("listo"); } })
      .catch(() => { if (!controller.signal.aborted) setEstadoCatalogoOrdenes("error"); });
    return () => controller.abort();
  }, [recargaCatalogoOrdenes]);
  const [buscadorOrdenAbierto, setBuscadorOrdenAbierto] = useState(false);
  const dialogoMedicamento = useRef<HTMLDialogElement>(null);
  const [medicamentoOrden, setMedicamentoOrden] = useState<ItemCatalogoOrden | null>(null);
  const [frecuenciaMedicamento, setFrecuenciaMedicamento] = useState("");
  const [diasMedicamento, setDiasMedicamento] = useState("");
  const [ordenesMedicas, setOrdenesMedicas] = useState<
    Record<string, string[]>
  >({});
  const [datosClinicos, setDatosClinicos] = useState<
    Record<string, DatosClinicos>
  >({});
  const [tipoOrden, setTipoOrden] = useState<TipoOrden | null>(null);
  const [detalleOrden, setDetalleOrden] = useState("");
  const [laboratoriosElegidos, setLaboratoriosElegidos] = useState("");
  const [ordenInternacionEmitida, setOrdenInternacionEmitida] = useState("");
  const [resultadosLaboratorio, setResultadosLaboratorio] = useState<
    SolicitudLaboratorio[]
  >([]);
  useEffect(() => { setMensajeReconsulta(""); setErrorReconsulta(""); }, [paciente?.id]);
  useEffect(() => {
    if (!paciente) return;
    const controller = new AbortController();
    setHistorialServidor([]); setErrorHistorial(""); setCargandoHistorial(true);
    apiFetch(`/api/v1/citas/${encodeURIComponent(paciente.id)}/historial`, { signal: controller.signal })
      .then(async (respuesta) => { if (!respuesta.ok) throw new Error(); const resultado = await respuesta.json() as { data: ConsultaPrevia[] }; if (!Array.isArray(resultado.data)) throw new Error(); return resultado.data; })
      .then((registros) => { if (!controller.signal.aborted) { setHistorialServidor(registros); setCitaHistorial(paciente.id); } })
      .catch(() => { if (!controller.signal.aborted) setErrorHistorial("No se pudo cargar el historial del servidor. Revisa la conexión."); })
      .finally(() => { if (!controller.signal.aborted) setCargandoHistorial(false); });
    return () => controller.abort();
  }, [paciente?.id]);
  useEffect(() => {
    if (!paciente) return;
    const controller = new AbortController();
    setCitaAtencionCargada(""); setErrorAtencion(""); setAtencionServidor(null); setRevisionSistemas({});
    setOrdenesMedicas((actual) => ({ ...actual, [paciente.ci]: [] }));
    setAntecedentesEstructurados(antecedentesConsultaVacios);
    setMensajeAntecedentes("");
    setMensajeOrdenes(""); setErrorOrdenes("");
    apiFetch(`/api/v1/citas/${encodeURIComponent(paciente.id)}/atencion/iniciar`, { method: 'POST', signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo cargar la atención desde el servidor.");
        const resultado = await respuesta.json() as { data: AtencionGuardada | null };
        if (controller.signal.aborted) return;
        setAtencionServidor(resultado.data);
        if (resultado.data) {
          const contenido = resultado.data.contenido;
          setDatosClinicos((actual) => ({ ...actual, [paciente.ci]: { motivoConsulta: contenido.motivo, enfermedadActual: contenido.enfermedadActual, examenFisico: contenido.examenFisico } }));
          setAntecedentes((actual) => ({ ...actual, [paciente.ci]: contenido.antecedentes }));
          setAntecedentesEstructurados({ ...antecedentesConsultaVacios, ...contenido.antecedentesEstructurados });
          setNotasMedicas((actual) => ({ ...actual, [paciente.ci]: contenido.notas }));
          setDiagnosticosFinales((actual) => ({ ...actual, [paciente.ci]: contenido.diagnosticos.map((item, indice) => ({ ...item, id: `servidor-${indice}` })) }));
          setOrdenesMedicas((actual) => ({ ...actual, [paciente.ci]: contenido.ordenes }));
          setRevisionSistemas(contenido.revision);
        }
        setCitaAtencionCargada(paciente.id);
      })
      .catch(() => { if (!controller.signal.aborted) setErrorAtencion("No se pudo cargar la atención del servidor. Revisa la conexión y vuelve a intentar."); });
    return () => controller.abort();
  }, [paciente?.id, recargaAtencion]);
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
    setMostrarFormulario(false);
    setVitales({});
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
  if (citaAtencionCargada !== paciente.id) return <section className="consulta-inicio panel" role="status">{errorAtencion ? <><p>{errorAtencion}</p><button type="button" onClick={() => setRecargaAtencion((valor) => valor + 1)}>Reintentar</button><button type="button" onClick={() => window.dispatchEvent(new Event("consulta:volver-al-listado"))}>Volver al listado</button></> : "Cargando atención..."}</section>;
  const episodioActual = obtenerAtencionAmbulatoria(paciente);
  const idsAmbulatorio = catalogoServicios.servicios.find(
    (servicio) => servicio.id === "consulta-ambulatoria",
  )?.signos;
  const campos = camposParaServicio(signos, idsAmbulatorio ?? []);
  const datos = { ...(vitalesTriaje ?? {}), ...vitales };
  const camposConResultado = campos.filter(
    (campo) => datos[campo.id] != null && String(datos[campo.id]).trim() !== "",
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
      setMostrarFormulario(false);
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
    atencionesCerradas[paciente.ci] || atencionServidor?.finalizadaEn || episodioActual?.finalizadaEn,
  );
  const ordenesPaciente = ordenesMedicas[paciente.ci] ?? [];
  const clasificarOrden = (detalle: string): string => {
    const guardada = atencionServidor?.contenido.documentos?.ordenes?.find((orden) => orden.detalle === detalle);
    if (guardada && ["Medicamento", "Laboratorio", "Imagenología"].includes(guardada.tipo)) return guardada.tipo;
    if (/ — Cada \d+ horas durante \d+ días$/.test(detalle)) return "Medicamento";
    const item = catalogoOrdenesMedicas.find((entrada) => entrada.nombre === detalle);
    if (!item) return "Sin clasificar";
    if (item.tipo === "producto") return "Medicamento";
    const categoria = normalizarBusquedaOrden(`${item.categoria || ""} ${item.tipoServicio || ""}`);
    if (/laboratorio/.test(categoria)) return "Laboratorio";
    if (/imagen|radiolog|ecograf|tomograf|resonancia/.test(categoria)) return "Imagenología";
    return "Sin clasificar";
  };
  const ordenesImpresion = ordenesPaciente.map((detalle) => ({ tipo: clasificarOrden(detalle), detalle }));
  const medicamentosImpresion = ordenesImpresion.filter((orden) => orden.tipo === "Medicamento");
  const laboratoriosImpresion = ordenesImpresion.filter((orden) => orden.tipo === "Laboratorio");
  const imagenesImpresion = ordenesImpresion.filter((orden) => orden.tipo === "Imagenología");
  const ordenesSinClasificar = ordenesImpresion.filter((orden) => orden.tipo === "Sin clasificar");
  const documentosOrdenes = atencionServidor?.contenido.documentos?.ordenes ?? [];
  const laboratoriosDocumento = [...new Set([laboratoriosElegidos, ...documentosOrdenes.filter((orden) => orden.tipo === "Laboratorio" && !ordenesPaciente.includes(orden.detalle)).map((orden) => orden.detalle)].filter(Boolean))];
  const recetasDocumento = atencionServidor?.contenido.documentos?.recetas ?? episodioActual?.recetas ?? [];
  const diagnosticosPaciente =
    diagnosticosFinales[paciente.ci] ??
    (episodioActual?.diagnosticos ?? []).map((item, indice) => ({
      ...item,
      id: `historial-${indice}`,
    }));
  const historialActual = citaHistorial === paciente.id ? historialServidor : [];
  const citasEnServidor = new Set(historialActual.map((item) => item.citaId));
  const consultasLocales = obtenerEpisodios()
    .filter(
      (episodio) =>
        (episodio.paciente.pacienteId ? episodio.paciente.pacienteId === paciente.pacienteId : episodio.paciente.ci === paciente.ci) &&
        episodio.tipo === "Consulta médica" && Boolean(episodio.finalizadaEn) &&
        episodio.origenId !== origenConsulta && !citasEnServidor.has(String(episodio.paciente.id)) &&
        `${episodio.paciente.fecha} ${episodio.paciente.hora}` < `${paciente.fecha} ${paciente.hora}`,
    )
    .map((episodio): ConsultaPrevia => ({ citaId: String(episodio.paciente.id), fecha: episodio.fecha, hora: episodio.paciente.hora, medico: episodio.medico, especialidad: episodio.paciente.especialidad, signosVitales: Object.entries(episodio.signosVitales || {}).map(([nombre, valor]) => ({ nombre, valor })), contenido: { motivo: episodio.motivo, enfermedadActual: episodio.enfermedadActual, examenFisico: episodio.examenFisico, antecedentes: episodio.antecedentes, antecedentesEstructurados: episodio.antecedentesEstructurados, notas: episodio.notas, diagnosticos: episodio.diagnosticos ?? [], revision: {}, ordenes: (episodio.ordenes ?? []).map((orden) => orden.detalle), documentos: { recetas: episodio.recetas ?? [], ordenes: episodio.ordenes ?? [], resultados: episodio.resultados ?? [], reconsultas: episodio.reconsultas ?? [] } } }));
  const consultasAnteriores = [...historialActual, ...consultasLocales].sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
  const consultasFiltradas = consultasAnteriores.filter((consulta) => {
    const tipo = (consulta.tipo || "consulta").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return filtroHistorial === "todas" || tipo === filtroHistorial;
  });
  const antecedentesPaciente =
    consultasAnteriores.find((episodio) => episodio.contenido.antecedentes?.trim())
      ?.contenido.antecedentes || "Sin antecedentes registrados";
  const alergiasPaciente =
    consultasAnteriores.find((episodio) => /alerg/i.test(episodio.contenido.antecedentes || ""))
      ?.contenido.antecedentes || "Sin alergias registradas";
  const antecedentesGuardados = [atencionServidor?.contenido.antecedentesEstructurados, ...consultasAnteriores.map((consulta) => consulta.contenido.antecedentesEstructurados)];
  const valorAntecedente = (campo: keyof DatosAntecedentesConsulta) => antecedentesGuardados.find((registro) => registro?.[campo]?.trim())?.[campo]?.trim() || "";
  const camposPatologicos: [keyof DatosAntecedentesConsulta, string][] = [["hipertension", "Hipertensión"], ["diabetes", "Diabetes"], ["tuberculosis", "Tuberculosis"], ["chagas", "Chagas"], ["cardiopatia", "Cardiopatía"], ["asma", "Asma"], ["epoc", "EPOC"], ["enfermedadRenal", "Enfermedad renal"], ["otroPatologico", "Otro"]];
  const resumenPatologicos = camposPatologicos.map(([campo, etiqueta]) => { const valor = valorAntecedente(campo); return valor ? `${etiqueta}: ${valor}` : ""; }).filter(Boolean).join(" · ");
  const palabrasOrden = normalizarBusquedaOrden(busquedaOrdenMedica).split(/\s+/).filter(Boolean);
  const ordenesFiltradas = catalogoOrdenesMedicas.filter((orden) =>
    palabrasOrden.length > 0 && palabrasOrden.every((palabra) => coincideBusquedaOrden(palabra, normalizarBusquedaOrden(`${orden.nombre} ${orden.codigo || ""} ${orden.generico || ""} ${orden.categoria || ""} ${orden.presentacion || ""}`))) && !ordenesPaciente.some((registrada) => registrada === orden.nombre || registrada.startsWith(`${orden.nombre} — Cada `)),
  ).slice(0, 20);
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
    guardarEpisodio({
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
      antecedentesEstructurados: { ...antecedentesEstructurados },
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
    if (finalizar)
      setAtencionesCerradas((actual) => ({ ...actual, [paciente.ci]: true }));
  };
  const obtenerContenidoAtencion = () => ({
    motivo: datosClinicosPaciente.motivoConsulta.trim(),
    enfermedadActual: datosClinicosPaciente.enfermedadActual.trim(),
    examenFisico: datosClinicosPaciente.examenFisico.trim(),
    antecedentes: (antecedentes[paciente.ci] ?? episodioActual?.antecedentes ?? "").trim(),
    antecedentesEstructurados: { ...antecedentesEstructurados },
    notas: (notasMedicas[paciente.ci] ?? episodioActual?.notas ?? "").trim(),
    diagnosticos: diagnosticosPaciente
      .filter((item) => item.diagnostico.trim())
      .map(({ diagnostico, planes }) => ({ diagnostico, planes: planes.filter(Boolean) })),
    revision: revisionSistemas,
    ordenes: ordenesPaciente,
    documentos: {
      recetas: episodioActual?.recetas ?? [],
      ordenes: [
        ...(episodioActual?.ordenes ?? []),
        ...documentosOrdenes.filter((orden) => orden.tipo === "Laboratorio" && orden.estado === "Solicitado" && orden.detalle !== laboratoriosElegidos),
        ...ordenesImpresion.map((orden) => ({ ...orden, estado: "Registrado" })),
        ...(laboratoriosElegidos ? [{ tipo: "Laboratorio", detalle: laboratoriosElegidos, estado: "Solicitado" }] : []),
        ...(tipoOrden && tipoOrden !== "laboratorio" && detalleOrden.trim()
          ? [{ tipo: titulosOrden[tipoOrden], detalle: detalleOrden.trim(), estado: "Solicitado" }]
          : []),
      ],
      resultados: episodioActual?.resultados ?? [],
      reconsultas: episodioActual?.reconsultas ?? [],
    },
  });
  const guardarDatosConsulta = async (seccionGuardar: "antecedentes" | "ordenes") => {
    if (guardandoAtencionRef.current || atencionFinalizada) return;
    guardandoAtencionRef.current = true;
    setGuardandoAtencion(true);
    setErrorAtencion("");
    setMensajeAntecedentes("");
    setMensajeOrdenes(""); setErrorOrdenes("");
    try {
      const respuesta = await apiFetch(`/api/v1/citas/${encodeURIComponent(paciente.id)}/atencion`, {
        method: "PUT",
        body: JSON.stringify({
          version: atencionServidor?.version ?? null,
          finalizar: false,
          contenido: obtenerContenidoAtencion(),
        }),
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.message || "No se pudieron guardar los datos de la atención.");
      setAtencionServidor(resultado.data);
      try { guardarEnHistoria(false); } catch (error) { console.error("No se pudo actualizar la copia local de la atención", error); }
      if (seccionGuardar === "antecedentes") setMensajeAntecedentes("Antecedentes guardados.");
      else { setMensajeOrdenes("Órdenes guardadas en la consulta."); setVistaImpresionAbierta(true); }
    } catch (error) {
      const mensaje = error instanceof TypeError
        ? "Se interrumpió la conexión. Revisa la conexión y vuelve a guardar."
        : error instanceof Error ? error.message : "No se pudieron guardar los datos de la atención.";
      if (seccionGuardar === "antecedentes") setErrorAtencion(mensaje);
      else setErrorOrdenes(mensaje);
    } finally {
      guardandoAtencionRef.current = false;
      setGuardandoAtencion(false);
    }
  };
  const finalizarAtencion = async () => {
    if (guardandoAtencionRef.current || !paciente) return;
    guardandoAtencionRef.current = true;
    setGuardandoAtencion(true); setErrorAtencion("");
    try {
      const contenido = obtenerContenidoAtencion();
      const secciones = [
        { titulo: "Motivo de consulta", contenido: contenido.motivo },
        { titulo: "Enfermedad actual", contenido: contenido.enfermedadActual },
        { titulo: "Antecedentes", contenido: contenido.antecedentes },
        { titulo: "Examen físico", contenido: contenido.examenFisico },
        { titulo: "Revisión por sistemas", contenido: Object.entries(contenido.revision || {}).map(([campo, valor]) => `${campo}: ${String(valor)}`) },
        { titulo: "Diagnósticos", contenido: contenido.diagnosticos.map((item) => `${item.diagnostico}${item.planes.length ? ` — ${item.planes.join("; ")}` : ""}`) },
        { titulo: "Órdenes médicas", contenido: [...contenido.ordenes, ...contenido.documentos.ordenes.map((orden) => `${orden.tipo}: ${orden.detalle}`)] },
        { titulo: "Notas médicas", contenido: contenido.notas },
      ];
      const pdf = await crearHojaClinicaPdf({
        titulo: "Hoja de atención ambulatoria",
        servicio: `Consulta ambulatoria · ${paciente.especialidad}`,
        paciente: nombreCompletoPaciente,
        ci: paciente.ci,
        fecha: `${paciente.fecha} ${paciente.hora}`,
        secciones,
      });
      await archivarHojaClinica({
        pacienteId: paciente.pacienteId || "",
        referenciaId: paciente.id,
        categoriaReferencia: "cita",
        tipo: "hoja_consulta_ambulatoria",
        titulo: `Atención ambulatoria · ${paciente.fecha}`,
        archivo: pdf,
      });
      const respuesta = await apiFetch(`/api/v1/citas/${encodeURIComponent(paciente.id)}/atencion`, {
        method: "PUT",
        body: JSON.stringify({
          version: atencionServidor?.version ?? null,
          finalizar: true,
          contenido,
        }),
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.message || "No se pudo guardar la atención.");
      setAtencionServidor(resultado.data);
      try { guardarEnHistoria(true); } catch (error) { console.error("No se pudo actualizar el historial local", error); }
      setVistaImpresionAbierta(true);
    } catch (error) {
      setErrorAtencion(error instanceof TypeError ? "Se interrumpió la conexión. Recarga la atención para comprobar si se guardó antes de reintentar." : error instanceof Error ? error.message : "No se pudo guardar la atención.");
    } finally { guardandoAtencionRef.current = false; setGuardandoAtencion(false); }
  };
  const agendarReconsulta = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (guardandoReconsultaRef.current) return;
    if (!paciente.pacienteId || !paciente.profesionalId) {
      setErrorReconsulta("La consulta no tiene un paciente o médico vinculado. Revisa sus datos antes de agendar.");
      return;
    }
    guardandoReconsultaRef.current = true;
    setGuardandoReconsulta(true);
    setErrorReconsulta("");
    try {
      const respuesta = await apiFetch("/api/citas", { method: "POST", body: JSON.stringify({
        paciente_id: paciente.pacienteId, profesional_id: paciente.profesionalId,
        doctor: paciente.doctor, especialidad: paciente.especialidad, consultorio: paciente.consultorio || "Consultorio 1",
        fecha: fechaReconsulta, hora: horaReconsulta, estado: "por_confirmar", tipo: "reconsulta", cita_origen_id: Number(paciente.id),
      }) });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(String(Object.values(resultado.errors || {}).flat()[0] || resultado.message || "No se pudo agendar la reconsulta."));
      setMensajeReconsulta(`Reconsulta agendada para el ${fechaReconsulta.split("-").reverse().join("/")} a las ${horaReconsulta}. Pendiente de confirmación.`);
      window.dispatchEvent(new Event("citas:actualizadas"));
      reconsultaDialog.current?.close();
    } catch (error) {
      setErrorReconsulta(error instanceof TypeError ? "Se interrumpió la conexión. Revisa la agenda antes de reintentar para evitar duplicados." : error instanceof Error ? error.message : "No se pudo agendar la reconsulta. Revisa la agenda antes de reintentar.");
    } finally {
      guardandoReconsultaRef.current = false;
      setGuardandoReconsulta(false);
    }
  };
  return (
    <section
      className="consulta-medica"
      ref={consultaRef}
      aria-label={`Consulta de ${paciente.paciente}`}
    >
      <section className="consulta-activa-derecha">
        <div className="consulta-cabecera-fija" ref={cabeceraRef}>
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
            <span className="consulta-etiqueta-contexto">CONSULTA MÉDICA</span>
          </div>
          <header className="consulta-area-cabecera">
            <div className="consulta-resumen-paciente">
              <div>
                <dl className="consulta-datos-personales">
                  <div>
                    <dt>Paciente</dt>
                    <dd className="consulta-paciente-identidad">
                      <span className="consulta-paciente-nombre">{nombreCompletoPaciente}</span>
                      <span className="consulta-paciente-ci">CI {paciente.ci}</span>
                    </dd>
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
          </div>
        </div>
        {seccion === "atencion" && (
          <>
            {tipoOrden === "laboratorio" && (
              <HojaLaboratorios
                permitirEstudiosLocales
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
                    {!mostrarFormulario && !cargandoValoracion && !cargaValoracionFallida && campos.length > 0 && (
                      <button className="secundario" type="button" onClick={() => { setMensajeValoracion(""); setMostrarFormulario(true); }}>
                        <Icon name="edit" size={15} /> {camposConResultado.length ? "Editar signos vitales" : "Registrar signos vitales"}
                      </button>
                    )}
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
                              <div className="consulta-signos-form" role="region" aria-label="Signos vitales, desplazamiento horizontal" tabIndex={0}>
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
                              <button className="secundario consulta-signos-guardar" type="button" disabled={guardandoValoracion} onClick={() => { setVitales({}); setErrorValoracion(""); setMostrarFormulario(false); }}>Cancelar</button>
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
                  <AntecedentesConsulta
                    value={antecedentesEstructurados}
                    onChange={(valor) => { setAntecedentesEstructurados(valor); setMensajeAntecedentes(""); setErrorAtencion(""); }}
                    onSave={() => void guardarDatosConsulta("antecedentes")}
                    disabled={atencionFinalizada}
                    saving={guardandoAtencion}
                    status={mensajeAntecedentes}
                    error={errorAtencion}
                  />
                  <RevisionConsulta key={paciente.id} pacienteId={paciente.ci} cerrada={atencionFinalizada} storageKey={`revision-consulta:${paciente.id}`} registros={revisionSistemas} onChange={setRevisionSistemas} />
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
                          className={`consulta-diagnostico-item${entrada.diagnostico.trim() ? "" : " sin-diagnostico"}`}
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
                          {entrada.diagnostico.trim() && <div className="consulta-planes-diagnostico">
                            <strong className="consulta-plan-titulo">Indicaciones para: <span>{entrada.diagnostico.replace(/^[A-Z0-9.]+\s·\s/, "")}</span></strong>
                            {(entrada.planes.length ? entrada.planes : [""]).map((plan, indice) => (
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
                                              planes: (item.planes.length ? item.planes : [""]).map(
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
                          </div>}
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
                      <div className="consulta-cierre-acciones">
                        <button type="button" className="consulta-reconsulta-boton" onClick={() => { setErrorReconsulta(""); setFechaReconsulta(""); setHoraReconsulta(""); reconsultaDialog.current?.showModal(); }}>Agendar reconsulta</button>
                        {!atencionFinalizada && <button type="button" disabled={guardandoAtencion} onClick={() => void finalizarAtencion()}>{guardandoAtencion ? "Guardando..." : "Finalizar atención"}</button>}
                      </div>
                    </header>
                    <p>
                      {atencionFinalizada
                        ? "Atención finalizada y trasladada a Atendidos hoy."
                        : "Al finalizar se abrirá la vista previa de la historia clínica y órdenes."}
                    </p>
                    {mensajeReconsulta && <p role="status">{mensajeReconsulta}</p>}
                    {errorAtencion && <p role="alert">{errorAtencion}</p>}
                    <dialog ref={reconsultaDialog} className="consulta-reconsulta-dialog" aria-labelledby="reconsulta-titulo" onCancel={(evento) => { if (guardandoReconsulta) evento.preventDefault(); }}>
                      <form onSubmit={agendarReconsulta}>
                        <h3 id="reconsulta-titulo">Agendar reconsulta</h3>
                        <p>{paciente.paciente} · {paciente.doctor}</p>
                        <label>Fecha<input type="date" required min={fechaISOEnBolivia() > paciente.fecha ? fechaISOEnBolivia() : paciente.fecha} value={fechaReconsulta} onChange={(evento) => setFechaReconsulta(evento.target.value)} /></label>
                        <label>Hora<input type="time" required value={horaReconsulta} onChange={(evento) => setHoraReconsulta(evento.target.value)} /></label>
                        <small>La cita quedará pendiente de confirmación. No se registrará un cobro.</small>
                        {errorReconsulta && <p role="alert">{errorReconsulta}</p>}
                        <footer><button type="button" disabled={guardandoReconsulta} onClick={() => reconsultaDialog.current?.close()}>Cancelar</button><button type="submit" disabled={guardandoReconsulta}>{guardandoReconsulta ? "Agendando..." : "Agendar"}</button></footer>
                      </form>
                    </dialog>
                  </section>
                </section>
              </div>
              <div className="consulta-atencion-lateral">
                <section className="consulta-contexto-clinico consulta-contexto-lateral panel" aria-label="Resumen de antecedentes del paciente">
                  <header><p>RESUMEN CLÍNICO</p></header>
                  <dl>
                    <div><dt>Patológicos</dt><dd>{resumenPatologicos || antecedentesPaciente}</dd></div>
                    <div><dt>Quirúrgicos</dt><dd>{valorAntecedente("quirurgicos") || "Sin antecedentes registrados"}</dd></div>
                    <div><dt>Alérgicos</dt><dd>{valorAntecedente("alergicos") || alergiasPaciente}</dd></div>
                    <div><dt>Familiares</dt><dd>{valorAntecedente("familiares") || "Sin antecedentes registrados"}</dd></div>
                  </dl>
                </section>
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
                  />
                  <div className="consulta-buscador-orden-contenedor" onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setBuscadorOrdenAbierto(false); }} onKeyDown={(evento) => { if (evento.key === 'Escape') setBuscadorOrdenAbierto(false); }}>
                  <label className="consulta-buscador-orden">
                    <Icon name="search" size={16} />
                    <input
                      aria-label="Buscar medicamentos, estudios y laboratorios"
                      aria-expanded={buscadorOrdenAbierto && Boolean(busquedaOrdenMedica.trim())}
                      aria-controls="consulta-opciones-ordenes"
                      value={busquedaOrdenMedica}
                      onFocus={() => setBuscadorOrdenAbierto(true)}
                      onChange={(event) =>
                        { setBusquedaOrdenMedica(event.target.value); setBuscadorOrdenAbierto(true); }
                      }
                      placeholder="Buscar medicamentos, estudios o laboratorios"
                    />
                    {busquedaOrdenMedica && <button type="button" className="consulta-limpiar-busqueda-orden" aria-label="Limpiar búsqueda de órdenes" onClick={() => setBusquedaOrdenMedica('')}>×</button>}
                  </label>
                  {buscadorOrdenAbierto && Boolean(busquedaOrdenMedica.trim()) && (
                    <div className="consulta-resultados-orden" id="consulta-opciones-ordenes">
                      {estadoCatalogoOrdenes === "cargando" ? <p role="status">Cargando catálogo...</p> : estadoCatalogoOrdenes === "error" ? <p role="alert">No se pudo cargar el catálogo. <button type="button" onClick={() => setRecargaCatalogoOrdenes((valor) => valor + 1)}>Reintentar</button></p> : ordenesFiltradas.length ? (
                        ordenesFiltradas.map((orden) => (
                          <button
                            type="button"
                            key={orden.id}
                            disabled={atencionFinalizada || guardandoAtencion}
                            onClick={() => {
                              setMensajeOrdenes(""); setErrorOrdenes("");
                              if (orden.tipo === "producto") {
                                setMedicamentoOrden(orden);
                                setFrecuenciaMedicamento("");
                                setDiasMedicamento("");
                                setBusquedaOrdenMedica("");
                                setBuscadorOrdenAbierto(false);
                                dialogoMedicamento.current?.showModal();
                                return;
                              }
                              setOrdenesMedicas((actual) => ({
                                ...actual,
                                [paciente.ci]: [
                                  ...(actual[paciente.ci] ?? []),
                                  orden.nombre,
                                ],
                              }));
                              setBusquedaOrdenMedica("");
                              setBuscadorOrdenAbierto(false);
                            }}
                          >
                            <span>{orden.nombre}<small className="consulta-resultado-orden-tipo">{orden.tipo === "producto" ? "Medicamento / producto" : /laboratorio/i.test(`${orden.categoria || ""} ${orden.tipoServicio || ""}`) ? "Laboratorio" : "Estudio / servicio"}{orden.codigo ? ` · ${orden.codigo}` : ""}</small></span>
                          </button>
                        ))
                      ) : (
                        <p>No se encontraron órdenes disponibles. Prueba con otro término.</p>
                      )}
                    </div>
                  )}
                  </div>
                  <dialog ref={dialogoMedicamento} className="consulta-reconsulta-dialog" aria-labelledby="consulta-medicamento-titulo" onClose={() => setMedicamentoOrden(null)}>
                    <form onSubmit={(evento) => {
                      evento.preventDefault();
                      if (!medicamentoOrden) return;
                      const detalle = `${medicamentoOrden.nombre} — Cada ${frecuenciaMedicamento} horas durante ${diasMedicamento} días`;
                      setMensajeOrdenes(""); setErrorOrdenes("");
                      setOrdenesMedicas((actual) => ({ ...actual, [paciente.ci]: [...(actual[paciente.ci] ?? []), detalle] }));
                      dialogoMedicamento.current?.close();
                    }}>
                      <h3 id="consulta-medicamento-titulo">Indicación del medicamento</h3>
                      <p>{medicamentoOrden?.nombre}</p>
                      <label>¿Cada cuántas horas?<input type="number" min="1" step="1" required value={frecuenciaMedicamento} onChange={(evento) => setFrecuenciaMedicamento(evento.target.value)} /></label>
                      <label>¿Durante cuántos días?<input type="number" min="1" step="1" required value={diasMedicamento} onChange={(evento) => setDiasMedicamento(evento.target.value)} /></label>
                      <small>Indica la frecuencia y duración según la indicación médica.</small>
                      <footer><button type="button" onClick={() => dialogoMedicamento.current?.close()}>Cancelar</button><button type="submit">Agregar al listado</button></footer>
                    </form>
                  </dialog>
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
                            disabled={atencionFinalizada || guardandoAtencion}
                            aria-label={`Quitar ${orden}`}
                            onClick={() => {
                              setMensajeOrdenes(""); setErrorOrdenes("");
                              setOrdenesMedicas((actual) => ({
                                ...actual,
                                [paciente.ci]: (
                                  actual[paciente.ci] ?? []
                                ).filter((item) => item !== orden),
                              }));
                            }}
                          >
                            ×
                          </button>
                        </article>
                      ))
                    ) : (
                      <p>Busca una orden médica para añadirla al listado.</p>
                    )}
                  </section>
                  <div className="consulta-ordenes-guardar">
                    {mensajeOrdenes && <small role="status">{mensajeOrdenes}</small>}
                    {errorOrdenes && <small role="alert" className="consulta-ordenes-error">{errorOrdenes}</small>}
                    {!atencionFinalizada && <button type="button" disabled={guardandoAtencion} onClick={() => void guardarDatosConsulta("ordenes")}>{guardandoAtencion ? "Guardando..." : "Guardar órdenes"}</button>}
                  </div>
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
            {errorHistorial && <p className="consulta-historial-error" role="alert">{errorHistorial}</p>}
            {cargandoHistorial && <p className="consulta-historial-cargando" role="status">Cargando consultas anteriores...</p>}
            {consultasAnteriores.length ? <div className="consulta-historial-paneles">
              <div className="consulta-historial-lista" aria-label="Consultas anteriores">
              <div className="consulta-historial-lista-titulo"><strong>Consultas anteriores</strong><span>{consultasFiltradas.length}</span></div>
              <label className="consulta-historial-filtro">Tipo de atención<select value={filtroHistorial} onChange={(evento) => { setFiltroHistorial(evento.target.value as typeof filtroHistorial); setConsultaPreviaAbierta(null); }}><option value="todas">Todas las atenciones</option><option value="consulta">Consulta</option><option value="reconsulta">Reconsulta</option><option value="internacion">Internación</option></select></label>
              {consultasFiltradas.map((consulta) => <button type="button" className="consulta-historial-item consulta-historial-abrir" key={consulta.citaId} aria-pressed={consultaPreviaAbierta?.citaActualId === paciente.id && consultaPreviaAbierta.consulta.citaId === consulta.citaId} onClick={() => setConsultaPreviaAbierta({ citaActualId: paciente.id, consulta })}>
                <span className="consulta-historial-datos"><strong>{consulta.fecha.split("-").reverse().join("/")} · {consulta.hora}</strong><small className="consulta-historial-tipo">{consulta.tipo === "reconsulta" ? "Reconsulta" : consulta.tipo?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "internacion" ? "Internación" : "Consulta"}</small><small className="consulta-historial-especialidad">{consulta.especialidad || "Consulta médica"}</small><small className="consulta-historial-medico">Médico: {consulta.medico || "Sin registrar"}</small></span><Icon name="chevronRight" size={16} />
              </button>)}
              {!consultasFiltradas.length && <p className="consulta-historial-sin-resultados">{filtroHistorial === "internacion" ? "El historial de internaciones aún no está conectado a esta vista." : "No hay atenciones de este tipo en el historial disponible."}</p>}
              </div>
              {consultaPreviaAbierta?.citaActualId === paciente.id && consultasFiltradas.some((consulta) => consulta.citaId === consultaPreviaAbierta.consulta.citaId)
                ? <PanelConsultaPrevia consulta={consultaPreviaAbierta.consulta} paciente={paciente} />
                : <div className="consulta-historial-seleccion-vacia"><Icon name="fileText" size={28} /><strong>Selecciona una consulta</strong><small>Elige una atención de la lista para ver sus datos.</small></div>}
            </div> : !cargandoHistorial && !errorHistorial && <div className="consulta-estado-vacio compacto"><Icon name="calendar" size={27} /><strong>Sin consultas anteriores</strong><small>Las atenciones finalizadas se mostrarán aquí en orden cronológico.</small></div>}
          </section>
        )}
        {seccion === "tratamientos" && (
          <RecetarioMedico
            paciente={paciente}
            consultas={[...consultasAnteriores, ...(atencionServidor ? [{ citaId: String(paciente.id), fecha: paciente.fecha, hora: paciente.hora, medico: paciente.doctor || medico, especialidad: paciente.especialidad, contenido: atencionServidor.contenido }] : [])]}
            cargandoHistorial={cargandoHistorial}
            errorHistorial={errorHistorial}
            medico={
              paciente.doctor && paciente.doctor !== "Agenda ambulatoria"
                ? paciente.doctor
                : medico
            }
            abierto={recetarioAbierto}
            onAbrir={() => setRecetarioAbierto(true)}
            onCerrar={() => setRecetarioAbierto(false)}
            onGuardar={guardarReceta}
          />
        )}
        {vistaImpresionAbierta && createPortal(
          <div className="consulta-impresion-fondo" role="presentation">
            <style media="print">{"@page { size: letter landscape; margin: 8mm; }"}</style>
            <section
              className="consulta-impresion-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Vista previa de receta y órdenes"
            >
              <header>
                <div>
                  <p>DOCUMENTOS DE LA CONSULTA</p>
                  <h3>Vista previa de impresión</h3>
                  <small>
                    Carta horizontal, dividida en dos medias cartas: receta y órdenes de estudios.
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
              <div className="consulta-hojas" ref={hojasImpresionRef}>
                <article className="consulta-hoja consulta-hoja-receta">
                  <header className="consulta-documento-cabecera"><img src="/logo-hospital-original.png" alt="Hospital María Esperanza" /><div><span>Consulta médica</span><h2>Receta médica</h2></div></header>
                  <div className="consulta-documento-paciente"><p><strong>Paciente</strong>{paciente.paciente}</p><p><strong>CI</strong>{paciente.ci}</p><p><strong>Fecha</strong>{paciente.fecha.split("-").reverse().join("/")}</p><p><strong>Médico</strong>{paciente.doctor || medico}</p></div>
                  <h4>Medicamentos e indicaciones</h4>
                  {medicamentosImpresion.length || recetasDocumento.length ? <ul>
                    {medicamentosImpresion.map((orden) => <li key={orden.detalle}>{orden.detalle}</li>)}
                    {recetasDocumento.flatMap((documento) => documento.receta?.medicamentos ?? []).map((medicamento, indice) => <li key={`${medicamento.id}-${indice}`}><strong>{medicamento.nombre}</strong>{[medicamento.dosis, medicamento.via, medicamento.frecuencia, medicamento.duracion, medicamento.cantidad, medicamento.indicaciones].filter(Boolean).join(" · ") && ` — ${[medicamento.dosis, medicamento.via, medicamento.frecuencia, medicamento.duracion, medicamento.cantidad, medicamento.indicaciones].filter(Boolean).join(" · ")}`}</li>)}
                  </ul> : <p>Sin medicamentos registrados.</p>}
                  <div className="consulta-hoja-firma">Firma y sello del médico</div>
                </article>
                <article className="consulta-hoja consulta-hoja-estudios">
                  <header className="consulta-documento-cabecera"><img src="/logo-hospital-original.png" alt="Hospital María Esperanza" /><div><span>Consulta médica</span><h2>Órdenes de estudios</h2></div></header>
                  <div className="consulta-documento-paciente"><p><strong>Paciente</strong>{paciente.paciente}</p><p><strong>CI</strong>{paciente.ci}</p><p><strong>Fecha</strong>{paciente.fecha.split("-").reverse().join("/")}</p><p><strong>Médico</strong>{paciente.doctor || medico}</p></div>
                  <div className="consulta-hoja-doble">
                    <div><h4>Laboratorio</h4>{laboratoriosImpresion.length || laboratoriosDocumento.length ? <ul>{laboratoriosImpresion.map((orden) => <li key={orden.detalle}>{orden.detalle}</li>)}{laboratoriosDocumento.map((detalle) => <li key={detalle}>{detalle}</li>)}</ul> : <p>Sin laboratorios registrados.</p>}</div>
                    <div><h4>Imagenología</h4>{imagenesImpresion.length ? <ul>{imagenesImpresion.map((orden) => <li key={orden.detalle}>{orden.detalle}</li>)}</ul> : <p>Sin estudios de imagenología registrados.</p>}</div>
                  </div>
                  {ordenesSinClasificar.length > 0 && <div className="consulta-hoja-sin-clasificar"><h4>Órdenes por clasificar</h4><p>Verifica el tipo de estas órdenes antes de emitirlas:</p><ul>{ordenesSinClasificar.map((orden) => <li key={orden.detalle}>{orden.detalle}</li>)}</ul></div>}
                  <div className="consulta-hoja-firma">Firma y sello del médico</div>
                </article>
              </div>
              <footer>
                {errorImpresion && <small role="alert">{errorImpresion}</small>}
                <button
                  type="button"
                  onClick={() => setVistaImpresionAbierta(false)}
                >
                  Cerrar
                </button>
                <button type="button" onClick={() => { setErrorImpresion(""); if (hojasImpresionRef.current) void imprimirDocumentosConsulta(hojasImpresionRef.current).catch(() => setErrorImpresion("No se pudo preparar la impresión. Intenta nuevamente.")); }}>
                  <Icon name="fileText" size={16} /> Imprimir documentos
                </button>
              </footer>
            </section>
          </div>, document.body
        )}
      </section>
    </section>
  );
}
