import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Icon from "../componentes/Icono";
import {
  eliminarArchivoEstudioDemo,
  eliminarInformeSolicitudImagen,
  guardarSolicitudesImagenologia,
  guardarInformeSolicitudImagen,
  obtenerInformeSolicitudImagen,
  obtenerSolicitudesImagenologia,
  type SolicitudImagenologiaDemo,
} from "../datos/solicitudesImagenologiaDemo";
import {
  guardarArchivoEstudio,
  guardarEstudios,
  obtenerArchivoEstudio,
  obtenerEstudios,
  seleccionarEstudio,
  type EstudioDemo,
} from "../datos/almacenDemo";
import "./VistaEstudiosCobrados.css";

const VENTANA_EDICION_MS = 24 * 60 * 60 * 1000;
const TIPOS_ESTUDIO = ["Rayos X", "Tomografía", "Ecografía", "Ecocardiograma", "Otro estudio de imagen"];
const PIEZAS = ["Tórax", "Brazo", "Antebrazo", "Mano", "Pierna", "Rodilla", "Pie", "Cráneo", "Abdomen", "Columna", "Pelvis", "Otra"];
const fechaHora = (valor: string) => new Date(valor).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" });

function convertidoAEstudio(solicitud: SolicitudImagenologiaDemo): EstudioDemo {
  return {
    id: solicitud.id,
    pacienteId: solicitud.ci,
    paciente: solicitud.paciente,
    titulo: solicitud.archivoNombre?.replace(/\.[^.]+$/, "") || solicitud.estudio,
    categoria: solicitud.estudio,
    descripcion: solicitud.pieza,
    nombreArchivo: solicitud.archivoNombre || solicitud.estudio,
    mime: solicitud.archivoMime || "application/octet-stream",
    creadaEn: solicitud.tomadaEn || solicitud.cobradaEn,
  };
}

export default function VistaEstudiosCobrados({ tipoEstudio }: { tipoEstudio?: string }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudImagenologiaDemo[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [ahora, setAhora] = useState(Date.now());
  const [cargando, setCargando] = useState<string | null>(null);
  const [objetivoArchivo, setObjetivoArchivo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [edicion, setEdicion] = useState<SolicitudImagenologiaDemo | null>(null);
  const [tipoEdicion, setTipoEdicion] = useState(TIPOS_ESTUDIO[0]);
  const [piezaEdicion, setPiezaEdicion] = useState(PIEZAS[0]);
  const [otraPieza, setOtraPieza] = useState("");
  const [informe, setInforme] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const informeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const actualizar = () => setSolicitudes(obtenerSolicitudesImagenologia());
    actualizar();
    window.addEventListener("radiuus:datos-demo", actualizar);
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => {
      window.removeEventListener("radiuus:datos-demo", actualizar);
      window.clearInterval(reloj);
    };
  }, []);

  const solicitudesModalidad = useMemo(() => tipoEstudio ? solicitudes.filter((solicitud) => solicitud.estudio === tipoEstudio) : solicitudes, [solicitudes, tipoEstudio]);
  const filtradas = useMemo(() => solicitudesModalidad
    .filter((solicitud) => estadoFiltro === "todos" || solicitud.estado === estadoFiltro)
    .filter((solicitud) => `${solicitud.paciente} ${solicitud.ci} ${solicitud.estudio} ${solicitud.pieza}`.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es")))
    .sort((a, b) => b.cobradaEn.localeCompare(a.cobradaEn)), [solicitudesModalidad, estadoFiltro, busqueda]);
  const tamano = 10;
  const paginas = Math.max(1, Math.ceil(filtradas.length / tamano));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((paginaActual - 1) * tamano, paginaActual * tamano);
  const pendientes = solicitudesModalidad.filter((solicitud) => solicitud.estado === "pendiente").length;
  const tomadas = solicitudesModalidad.length - pendientes;
  const bloqueada = (solicitud: SolicitudImagenologiaDemo) =>
    Boolean(solicitud.tomadaEn) && ahora - new Date(solicitud.tomadaEn!).getTime() >= VENTANA_EDICION_MS;

  const elegirArchivo = (solicitud: SolicitudImagenologiaDemo) => {
    setError("");
    setObjetivoArchivo(solicitud.id);
    archivoRef.current?.click();
  };

  const alElegirArchivo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    const id = objetivoArchivo;
    evento.target.value = "";
    if (!archivo || !id) {
      setObjetivoArchivo(null);
      return;
    }
    setObjetivoArchivo(null);
    setCargando(id);
    if (archivo.size > 200 * 1024 * 1024) {
      setError("El archivo no debe superar 200 MB.");
      setCargando(null);
      return;
    }
    try {
      const tomadaEn = new Date().toISOString();
      const actualizadas = solicitudes.map((solicitud) => solicitud.id === id
        ? { ...solicitud, estado: "tomada" as const, tomadaEn, archivoNombre: archivo.name, archivoMime: archivo.type || "application/octet-stream" }
        : solicitud);
      const actual = actualizadas.find((solicitud) => solicitud.id === id)!;
      await guardarArchivoEstudio(id, archivo);
      guardarEstudios([convertidoAEstudio(actual), ...obtenerEstudios().filter((estudio) => estudio.id !== id)]);
      guardarSolicitudesImagenologia(actualizadas);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el estudio.");
    } finally {
      setCargando(null);
    }
  };

  const descargar = async (solicitud: SolicitudImagenologiaDemo) => {
    setError("");
    try {
      const archivo = await obtenerArchivoEstudio(convertidoAEstudio(solicitud));
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = solicitud.archivoNombre || `${solicitud.estudio}.dcm`;
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo descargar el estudio.");
    }
  };

  const eliminar = async (solicitud: SolicitudImagenologiaDemo) => {
    if (solicitud.estado !== "tomada" || bloqueada(solicitud)) return;
    if (!window.confirm(`¿Eliminar el archivo de ${solicitud.estudio} · ${solicitud.pieza}? La orden volverá a Pendiente.`)) return;
    try {
      await eliminarArchivoEstudioDemo(solicitud.id);
      await eliminarInformeSolicitudImagen(solicitud.id);
      guardarEstudios(obtenerEstudios().filter((estudio) => estudio.id !== solicitud.id));
      guardarSolicitudesImagenologia(solicitudes.map((actual) => actual.id === solicitud.id
        ? { ...actual, estado: "pendiente" as const, tomadaEn: undefined, archivoNombre: undefined, archivoMime: undefined, informeNombre: undefined, informeMime: undefined, informeSubidoEn: undefined }
        : actual));
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo eliminar el archivo.");
    }
  };

  const abrirEdicion = (solicitud: SolicitudImagenologiaDemo) => {
    if (bloqueada(solicitud)) return;
    setEdicion(solicitud);
    setTipoEdicion(solicitud.estudio);
    setPiezaEdicion(PIEZAS.includes(solicitud.pieza) ? solicitud.pieza : "Otra");
    setOtraPieza(PIEZAS.includes(solicitud.pieza) ? "" : solicitud.pieza);
  };

  const guardarEdicion = (evento: FormEvent) => {
    evento.preventDefault();
    if (!edicion || bloqueada(edicion)) {
      setEdicion(null);
      return setError("Venció el plazo de 24 horas para editar este estudio.");
    }
    const pieza = piezaEdicion === "Otra" ? otraPieza.trim() : piezaEdicion;
    if (!pieza) return setError("Especifica la pieza o región anatómica.");
    const actualizadas = solicitudes.map((solicitud) => solicitud.id === edicion.id
      ? { ...solicitud, estudio: tipoEdicion, pieza }
      : solicitud);
    const actual = actualizadas.find((solicitud) => solicitud.id === edicion.id)!;
    guardarSolicitudesImagenologia(actualizadas);
    guardarEstudios(obtenerEstudios().map((estudio) => estudio.id === actual.id
      ? { ...estudio, categoria: tipoEdicion, descripcion: pieza }
      : estudio));
    setEdicion(null);
    setError("");
  };

  const elegirInforme = (solicitud: SolicitudImagenologiaDemo) => {
    setInforme(solicitud.id);
    informeRef.current?.click();
  };

  const alElegirInforme = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    const id = informe;
    evento.target.value = "";
    if (!archivo || !id) {
      setInforme(null);
      return;
    }
    try {
      await guardarInformeSolicitudImagen(id, archivo);
      guardarSolicitudesImagenologia(solicitudes.map((solicitud) => solicitud.id === id
        ? { ...solicitud, informeNombre: archivo.name, informeMime: archivo.type || "application/octet-stream", informeSubidoEn: new Date().toISOString() }
        : solicitud));
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el informe.");
    } finally {
      setInforme(null);
    }
  };

  const abrirInforme = async (solicitud: SolicitudImagenologiaDemo) => {
    const archivo = await obtenerInformeSolicitudImagen(solicitud.id);
    if (!archivo) return setError("El archivo del informe ya no está disponible.");
    const url = URL.createObjectURL(archivo);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <section className="estudios-cobrados">
      <header className="estudios-cobrados-cabecera">
        <div><span>ÓRDENES PAGADAS</span><h2>{tipoEstudio || "Estudios de imagenología"}</h2><p>Gestiona la toma y los archivos de los estudios cobrados.</p></div>
        <div className="estudios-cobrados-metricas"><span><strong>{solicitudesModalidad.length}</strong>Total</span><span><strong>{pendientes}</strong>Pendientes</span><span><strong>{tomadas}</strong>Tomadas</span></div>
      </header>
      <div className="estudios-cobrados-aviso"><Icon name="image" size={17} /><span>Prototipo local: los registros y archivos se guardan únicamente en este navegador.</span></div>
      {error && <p className="estudios-cobrados-error" role="alert">{error}</p>}
      <div className="estudios-cobrados-filtros">
        <label><Icon name="search" size={17} /><input value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }} placeholder="Buscar paciente, CI, estudio o pieza…" /></label>
        <select aria-label="Filtrar por estado" value={estadoFiltro} onChange={(evento) => { setEstadoFiltro(evento.target.value); setPagina(1); }}><option value="todos">Todos los estados</option><option value="pendiente">Pendiente</option><option value="tomada">Tomada</option></select>
      </div>
      <div className="estudios-cobrados-tabla" role="table" aria-label="Estudios de imagenología cobrados">
        <div className="estudios-cobrados-fila encabezado" role="row"><span>Paciente / CI</span><span>Estudio</span><span>Pieza / región</span><span>Fecha de cobro</span><span>Estado</span><span>Acciones</span></div>
        {visibles.length ? visibles.map((solicitud) => {
          const vencida = bloqueada(solicitud);
          return <div className="estudios-cobrados-fila" role="row" key={solicitud.id}>
            <div><strong>{solicitud.paciente}</strong><small>CI {solicitud.ci}</small></div>
            <div><strong>{solicitud.estudio}</strong>{solicitud.archivoNombre && <small title={solicitud.archivoNombre}>{solicitud.archivoNombre}</small>}</div>
            <span>{solicitud.pieza}</span>
            <span>{fechaHora(solicitud.cobradaEn)}</span>
            <div><b className={`estudios-cobrados-estado ${solicitud.estado}`}>{solicitud.estado === "pendiente" ? "Pendiente" : "Tomada"}</b>{solicitud.estado === "tomada" && <small>{vencida ? "Edición bloqueada" : "Editable por 24 h"}</small>}</div>
            <div className="estudios-cobrados-acciones">
              {solicitud.estado === "pendiente" ? <button type="button" disabled={cargando === solicitud.id} onClick={() => elegirArchivo(solicitud)} title="Subir estudio"><Icon name="plus" size={16} /><span>{cargando === solicitud.id ? "Guardando…" : "Subir"}</span></button> : <>
                <button type="button" onClick={() => seleccionarEstudio(solicitud.id)} title="Ver estudio"><Icon name="eye" size={16} /><span>Ver</span></button>
                {!vencida && <>
                  <button type="button" onClick={() => void descargar(solicitud)} title="Descargar archivo"><Icon name="download" size={16} /><span>Descargar</span></button>
                  <button type="button" onClick={() => abrirEdicion(solicitud)} title="Editar durante las primeras 24 horas"><Icon name="edit" size={16} /><span>Editar</span></button>
                  <button className="peligro" type="button" onClick={() => void eliminar(solicitud)} title="Eliminar y volver a pendiente"><Icon name="trash" size={16} /><span>Eliminar</span></button>
                </>}
                <button type="button" onClick={() => elegirInforme(solicitud)} title={solicitud.informeNombre ? "Cambiar informe médico" : "Subir informe médico"}><Icon name="fileText" size={16} /><span>{solicitud.informeNombre ? "Cambiar informe" : "Subir informe"}</span></button>
                {solicitud.informeNombre && <button type="button" onClick={() => void abrirInforme(solicitud)} title={`Ver informe: ${solicitud.informeNombre}`}><Icon name="eye" size={16} /><span>Ver informe</span></button>}
              </>}
            </div>
          </div>;
        }) : <div className="estudios-cobrados-vacio"><Icon name="image" size={26} /><strong>{solicitudesModalidad.length ? "No hay órdenes que coincidan" : `Aún no hay ${tipoEstudio?.toLocaleLowerCase("es") || "estudios"} cobrados`}</strong><small>{solicitudesModalidad.length ? "Prueba otra búsqueda o cambia el filtro." : "Al cobrar un estudio de imagenología en Caja aparecerá aquí."}</small></div>}
      </div>
      <footer className="estudios-cobrados-paginacion"><small>{filtradas.length ? `${(paginaActual - 1) * tamano + 1}–${Math.min(paginaActual * tamano, filtradas.length)} de ${filtradas.length}` : "0 resultados"}</small><div><button type="button" disabled={paginaActual <= 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))} aria-label="Página anterior"><Icon name="chevronLeft" size={16} /></button><span>Página {paginaActual} de {paginas}</span><button type="button" disabled={paginaActual >= paginas} onClick={() => setPagina((actual) => Math.min(paginas, actual + 1))} aria-label="Página siguiente"><Icon name="chevronRight" size={16} /></button></div></footer>
      <input ref={archivoRef} hidden type="file" accept="image/jpeg,image/png,image/webp,application/dicom,application/zip,application/x-rar-compressed,.dcm,.zip,.rar" onChange={(evento) => void alElegirArchivo(evento)} />
      <input ref={informeRef} hidden type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={(evento) => void alElegirInforme(evento)} />
      {edicion && <div className="estudios-cobrados-modal-fondo"><form className="estudios-cobrados-modal" onSubmit={guardarEdicion}><header><div><strong>Editar estudio</strong><small>Disponible durante las primeras 24 horas desde la subida.</small></div><button type="button" onClick={() => setEdicion(null)} aria-label="Cerrar">×</button></header><label>Tipo de estudio<select value={tipoEdicion} onChange={(evento) => setTipoEdicion(evento.target.value)}>{TIPOS_ESTUDIO.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label><label>Pieza o región<select value={piezaEdicion} onChange={(evento) => setPiezaEdicion(evento.target.value)}>{PIEZAS.map((pieza) => <option key={pieza}>{pieza}</option>)}</select></label>{piezaEdicion === "Otra" && <label>Especifica la pieza<input required value={otraPieza} onChange={(evento) => setOtraPieza(evento.target.value)} /></label>}{error && <p role="alert">{error}</p>}<footer><button type="button" onClick={() => setEdicion(null)}>Cancelar</button><button type="submit">Guardar cambios</button></footer></form></div>}
    </section>
  );
}
