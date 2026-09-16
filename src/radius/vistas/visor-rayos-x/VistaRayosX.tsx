import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Icon from "../../componentes/Icono";
import { notificar } from "../../componentes/Notificaciones";
import { apiFetch } from "../../api";
import {
  obtenerArchivoEstudio,
  obtenerEstudioSeleccionado,
  obtenerEstudios,
  obtenerPacientes,
  type EstudioDemo,
} from "../../datos/almacenDemo";
import {
  importarEstudio,
  type ResultadoImportacion,
} from "./importadorEstudios";
import VisorDicom, { type ControlDicom } from "./VisorDicom";
import { crearPlantillaRadiografiaPdf } from "./PlantillaRadiografiaPdf";
import { recortarBordesNegros } from "./recorteRadiografia";
import "./VistaRayosX.css";
import "./HistorialPaciente.css";

type Estudio = {
  id: string;
  titulo: string;
  paciente: string;
  categoria: string;
  mime: string;
  url: string;
  creadaEn: string;
};
type EstudioOrthanc = {
  id: string;
  patientIdDicom: string;
  patientName: string;
  descripcion: string;
  fechaEstudio: string;
  modalidades: string[];
  accessionNumber: string;
  studyInstanceUid?: string;
};

export default function VistaRayosX() {
  const [estudios, setEstudios] = useState<Estudio[]>([]),
    [estudiosOrthanc, setEstudiosOrthanc] = useState<EstudioOrthanc[]>([]),
    [actual, setActual] = useState<Estudio | null>(null),
    [dicomFiles, setDicomFiles] = useState<File[]>([]);
  const [zoom, setZoom] = useState(1),
    [brillo, setBrillo] = useState(100),
    [contraste, setContraste] = useState(100),
    [rotacion, setRotacion] = useState(0),
    [invertido, setInvertido] = useState(false),
    [reflejado, setReflejado] = useState(false);
  const [panel, setPanel] = useState(true),
    [posicion, setPosicion] = useState({ x: 0, y: 0 }),
    [arrastrando, setArrastrando] = useState<"mover" | "ventana" | null>(null);
  const [cargando, setCargando] = useState(false),
    [mensajeCarga, setMensajeCarga] = useState(""),
    [corte, setCorte] = useState({ actual: 1, total: 1 });
  const archivo = useRef<HTMLInputElement>(null),
    carpeta = useRef<HTMLInputElement>(null),
    dicomControl = useRef<ControlDicom | null>(null),
    estacion = useRef<HTMLElement>(null);
  const gesto = useRef({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
    brillo: 100,
    contraste: 100,
  });
  const ultimoClickDerecho = useRef(0);
  const esDicom = dicomFiles.length > 0;

  useEffect(() => {
    carpeta.current?.setAttribute("webkitdirectory", "");
    carpeta.current?.setAttribute("directory", "");
    setEstudios(
      obtenerEstudios().map((e) => ({
        id: e.id,
        titulo: e.titulo,
        paciente: e.paciente,
        categoria: e.categoria,
        mime: e.mime,
        url: "",
        creadaEn: e.creadaEn,
      })),
    );
  }, []);
  const restablecerRaster = () => {
    setZoom(1);
    setBrillo(100);
    setContraste(100);
    setRotacion(0);
    setInvertido(false);
    setReflejado(false);
    setPosicion({ x: 0, y: 0 });
  };
  const restablecer = () => {
    if (esDicom) {
      dicomControl.current?.restablecer();
      setReflejado(false);
    } else restablecerRaster();
  };
  const alCambiarCorte = useCallback(
    (actualCorte: number, total: number) =>
      setCorte({ actual: actualCorte, total }),
    [],
  );

  const cargarResultado = (
    resultado: ResultadoImportacion,
    nombre: string,
    datos?: EstudioDemo,
  ) => {
    if (resultado.dicom.length) {
      setDicomFiles(resultado.dicom);
      setActual({
        id: datos?.id || `dicom-${Date.now()}`,
        titulo: datos?.titulo || nombre,
        paciente: datos?.paciente || "Estudio local",
        categoria: datos?.categoria || "DICOM",
        mime: "application/dicom",
        url: "",
        creadaEn: datos?.creadaEn || new Date().toISOString(),
      });
      setCorte({ actual: 1, total: resultado.dicom.length });
      setMensajeCarga(
        `${resultado.dicom.length} imagen${resultado.dicom.length === 1 ? "" : "es"} DICOM cargadas${resultado.omitidos ? ` · ${resultado.omitidos} archivos auxiliares omitidos` : ""}.`,
      );
    } else if (resultado.imagenes.length) {
      const file = resultado.imagenes[0];
      setDicomFiles([]);
      setActual({
        id: `local-${Date.now()}`,
        titulo: file.name,
        paciente: "Prueba local",
        categoria: "Rayos X",
        mime: file.type,
        url: URL.createObjectURL(file),
        creadaEn: new Date().toISOString(),
      });
      setMensajeCarga(
        `${resultado.imagenes.length} imagen${resultado.imagenes.length === 1 ? "" : "es"} encontrada${resultado.imagenes.length === 1 ? "" : "s"}. Mostrando la primera.`,
      );
    } else
      throw new Error(
        "No se encontraron imágenes DICOM ni radiografías compatibles en la selección.",
      );
    restablecerRaster();
  };
  const procesarSeleccion = async (lista: FileList | null) => {
    if (!lista?.length) return;
    const seleccion = Array.from(lista);
    setCargando(true);
    setMensajeCarga(
      `Analizando ${seleccion.length === 1 ? seleccion[0].name : `${seleccion.length} archivos`}…`,
    );
    try {
      setEstudiosOrthanc([]);
      const resultado = await importarEstudio(seleccion);
      cargarResultado(
        resultado,
        seleccion.length === 1
          ? seleccion[0].name
          : (
              seleccion[0] as File & { webkitRelativePath?: string }
            ).webkitRelativePath?.split("/")[0] || "Estudio DICOM",
      );
    } catch (error) {
      setMensajeCarga("");
      notificar(
        "error",
        "No se pudo abrir el estudio",
        error instanceof Error
          ? error.message
          : "Revise el archivo seleccionado.",
      );
    } finally {
      setCargando(false);
    }
  };
  const abrirEstudioGuardado = useCallback(async (estudio: EstudioDemo) => {
    setEstudiosOrthanc([]);
    setCargando(true);
    setMensajeCarga(`Abriendo ${estudio.nombreArchivo}…`);
    try {
      const file = await obtenerArchivoEstudio(estudio),
        resultado = await importarEstudio([file]);
      cargarResultado(resultado, estudio.nombreArchivo, estudio);
    } catch (error) {
      setMensajeCarga("");
      notificar(
        "error",
        "No se pudo abrir el estudio",
        error instanceof Error
          ? error.message
          : "Revise el archivo seleccionado.",
      );
    } finally {
      setCargando(false);
    }
  }, []);
  const abrirEstudioOrthanc = async (estudio: EstudioOrthanc) => {
    setCargando(true);
    setMensajeCarga(`Abriendo ${estudio.descripcion || "estudio DICOM"}…`);
    try {
      const respuesta = await apiFetch(
        `/api/orthanc/estudios/${encodeURIComponent(estudio.id)}/archivo`,
      );
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(
          datos.message || "No se pudo obtener el estudio desde Orthanc.",
        );
      }
      const blob = await respuesta.blob(),
        file = new File([blob], `orthanc-${estudio.id}.zip`, {
          type: "application/zip",
        }),
        resultado = await importarEstudio([file]),
        fecha = /^\d{8}$/.test(estudio.fechaEstudio)
          ? `${estudio.fechaEstudio.slice(0, 4)}-${estudio.fechaEstudio.slice(4, 6)}-${estudio.fechaEstudio.slice(6, 8)}T00:00:00`
          : new Date().toISOString();
      cargarResultado(resultado, file.name, {
        id: estudio.id,
        pacienteId: estudio.patientIdDicom,
        paciente: estudio.patientName || "Paciente sin nombre",
        titulo:
          estudio.descripcion ||
          estudio.modalidades.join(", ") ||
          "Estudio radiográfico",
        categoria: estudio.modalidades.join(", ") || "DICOM",
        descripcion: estudio.accessionNumber,
        nombreArchivo: file.name,
        mime: "application/zip",
        creadaEn: fecha,
      });
    } catch (error) {
      setMensajeCarga("");
      notificar(
        "error",
        "No se pudo abrir desde Orthanc",
        error instanceof Error
          ? error.message
          : "No se pudo obtener el estudio del servidor.",
      );
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    const seleccionado = obtenerEstudioSeleccionado();
    if (seleccionado) void abrirEstudioGuardado(seleccionado);
  }, [abrirEstudioGuardado]);
  useEffect(() => {
    const id = localStorage.getItem("radiuus_orthanc_estudio");
    if (!id) return;
    localStorage.removeItem("radiuus_orthanc_estudio");
    void (async () => {
      const respuesta = await apiFetch("/api/orthanc/estudios"),
        lista = await respuesta.json().catch(() => []);
      if (!respuesta.ok)
        throw new Error(
          lista.message || "No se pudo consultar el historial del paciente.",
        );
      const seleccionado = (lista as EstudioOrthanc[]).find((e) => e.id === id);
      if (!seleccionado)
        throw new Error("El estudio seleccionado ya no está disponible.");
      const idPaciente = seleccionado.patientIdDicom.trim().toUpperCase(),
        nombre = seleccionado.patientName.trim().toUpperCase(),
        idGenerico =
          !idPaciente ||
          ["NUEVOID", "NEWID", "UNKNOWN", "DESCONOCIDO"].includes(
            idPaciente.replace(/[^A-Z0-9]/g, ""),
          ),
        historial = (lista as EstudioOrthanc[])
          .filter((e) =>
            idGenerico
              ? e.patientName.trim().toUpperCase() === nombre
              : e.patientIdDicom.trim().toUpperCase() === idPaciente &&
                e.patientName.trim().toUpperCase() === nombre,
          )
          .sort((a, b) => b.fechaEstudio.localeCompare(a.fechaEstudio));
      setEstudiosOrthanc(historial);
      await abrirEstudioOrthanc(seleccionado);
    })().catch((error) =>
      notificar(
        "error",
        "No se pudo abrir el historial DICOM",
        error instanceof Error ? error.message : "Intente nuevamente.",
      ),
    );
  }, []);

  const alternarPantallaCompleta = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await estacion.current?.requestFullscreen();
    } catch {
      /* El navegador puede bloquear la solicitud fuera de un gesto directo. */
    }
  };
  const iniciarGesto = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!actual || esDicom || ![0, 1, 2].includes(e.button)) return;
    e.preventDefault();
    if (e.button === 2) {
      const ahora = Date.now();
      if (ahora - ultimoClickDerecho.current < 350) {
        ultimoClickDerecho.current = 0;
        setArrastrando(null);
        void alternarPantallaCompleta();
        return;
      }
      ultimoClickDerecho.current = ahora;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = {
      x: e.clientX,
      y: e.clientY,
      posX: posicion.x,
      posY: posicion.y,
      brillo,
      contraste,
    };
    setArrastrando(e.button === 2 ? "ventana" : "mover");
  };
  const moverGesto = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!arrastrando) return;
    e.preventDefault();
    const dx = e.clientX - gesto.current.x,
      dy = e.clientY - gesto.current.y;
    if (arrastrando === "mover")
      setPosicion({
        x: gesto.current.posX + dx / zoom,
        y: gesto.current.posY + dy / zoom,
      });
    else {
      setContraste(
        Math.max(
          20,
          Math.min(250, Math.round(gesto.current.contraste + dx * 0.65)),
        ),
      );
      setBrillo(
        Math.max(
          20,
          Math.min(200, Math.round(gesto.current.brillo - dy * 0.55)),
        ),
      );
    }
  };
  const terminarGesto = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    setArrastrando(null);
  };
  const zoomConRueda = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!actual || esDicom) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect(),
      puntoX = e.clientX - (rect.left + rect.width / 2),
      puntoY = e.clientY - (rect.top + rect.height / 2),
      factor = e.deltaY < 0 ? 1.15 : 1 / 1.15,
      nuevoZoom = Math.max(0.25, Math.min(4, zoom * factor)),
      factorReal = nuevoZoom / zoom;
    setPosicion((p) => ({
      x: puntoX - (puntoX - p.x) * factorReal,
      y: puntoY - (puntoY - p.y) * factorReal,
    }));
    setZoom(nuevoZoom);
  };

  const generarJpeg = () =>
    new Promise<string>((resolve, reject) => {
      if (!actual) return reject(new Error("No hay imagen"));
      if (esDicom) {
        const canvas = dicomControl.current?.canvas();
        return canvas
          ? resolve(canvas.toDataURL("image/jpeg", 0.94))
          : reject(new Error("El corte DICOM todavía se está preparando."));
      }
      const imagen = new Image();
      imagen.crossOrigin = "anonymous";
      imagen.onload = () => {
        const giro = ((rotacion % 360) + 360) % 360,
          vertical = giro === 90 || giro === 270,
          canvas = document.createElement("canvas");
        canvas.width = vertical ? imagen.naturalHeight : imagen.naturalWidth;
        canvas.height = vertical ? imagen.naturalWidth : imagen.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo preparar la imagen"));
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotacion * Math.PI) / 180);
        ctx.scale(reflejado ? -1 : 1, 1);
        ctx.filter = `grayscale(1) brightness(${brillo}%) contrast(${contraste}%) invert(${invertido ? 1 : 0})`;
        ctx.drawImage(
          imagen,
          -imagen.naturalWidth / 2,
          -imagen.naturalHeight / 2,
        );
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.94));
        } catch {
          reject(new Error("La imagen externa no permite exportación"));
        }
      };
      imagen.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      imagen.src = actual.url;
    });
  const exportar = async (formato: "jpeg" | "pdf") => {
    if (!actual) return;
    const ventana = formato === "pdf" ? window.open("", "_blank") : null;
    try {
      const original = await generarJpeg(),
        data = await recortarBordesNegros(original),
        nombre =
          actual.titulo
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-|-$/g, "") || "radiografia";
      if (formato === "jpeg") {
        const enlace = document.createElement("a");
        enlace.href = data;
        enlace.download = `${nombre}-${esDicom ? `corte-${corte.actual}` : "imagen"}.jpg`;
        enlace.click();
      } else if (ventana) {
        const dicom = estudiosOrthanc.find((item) => item.id === actual.id),
          guardado = obtenerEstudios().find((item) => item.id === actual.id),
          pacienteLocal = guardado
            ? obtenerPacientes().find((item) => item.id === guardado.pacienteId)
            : undefined;
        const fechaDicom =
          dicom?.fechaEstudio && /^\d{8}$/.test(dicom.fechaEstudio)
            ? `${dicom.fechaEstudio.slice(6, 8)}/${dicom.fechaEstudio.slice(4, 6)}/${dicom.fechaEstudio.slice(0, 4)}`
            : new Date(actual.creadaEn).toLocaleDateString("es-BO");
        ventana.document.write(
          crearPlantillaRadiografiaPdf({
            imagen: data,
            logo: new URL("/logo-hospital-original.png", window.location.origin).href,
            paciente: actual.paciente,
            pacienteId:
              dicom?.patientIdDicom ||
              pacienteLocal?.numeroDocumento ||
              "No registrado",
            estudio: actual.titulo,
            modalidad: dicom?.modalidades.join(", ") || actual.categoria,
            fechaEstudio: fechaDicom,
            acceso:
              dicom?.accessionNumber ||
              guardado?.descripcion ||
              "No registrado",
            uid: dicom?.studyInstanceUid || "No registrado",
            corte: esDicom
              ? `Corte ${corte.actual} de ${corte.total}`
              : "Imagen radiográfica",
          }),
        );
        ventana.document.close();
      }
    } catch (error) {
      ventana?.close();
      notificar(
        "error",
        "No se pudo exportar la radiografía",
        error instanceof Error ? error.message : "Intente nuevamente.",
      );
    }
  };
  const cambiarZoom = (factor: number) =>
    esDicom
      ? dicomControl.current?.zoom(factor)
      : setZoom((valor) => Math.max(0.25, Math.min(4, valor * factor)));
  const rotar = (grados: number) =>
    esDicom
      ? dicomControl.current?.rotar(grados)
      : setRotacion((valor) => valor + grados);
  const negativo = () =>
    esDicom
      ? dicomControl.current?.negativo()
      : setInvertido((valor) => !valor);
  const invertirHorizontal = () => {
    if (esDicom) dicomControl.current?.invertirHorizontal();
    setReflejado((valor) => !valor);
  };
  const centrar = () =>
    esDicom ? dicomControl.current?.centrar() : setPosicion({ x: 0, y: 0 });

  return (
    <div className="rx-vista">
      <header className="rx-cabecera">
        <div>
          <p>IMAGENOLOGÍA / VISOR</p>
          <h2>Visor de estudios</h2>
          <small>
            DICOM, DICOMDIR, carpetas, ZIP, RAR e imágenes radiográficas.
          </small>
        </div>
        <div>
          <button onClick={() => setPanel((v) => !v)}>
            <Icon name="menu" size={17} />
            {panel ? "Ocultar estudios" : "Mostrar estudios"}
          </button>
          <button onClick={() => carpeta.current?.click()}>
            <Icon name="package" size={17} />
            Abrir carpeta
            <input
              ref={carpeta}
              hidden
              type="file"
              multiple
              onChange={(e) => {
                void procesarSeleccion(e.target.files);
                e.target.value = "";
              }}
            />
          </button>
          <button
            className="rx-abrir"
            disabled={cargando}
            onClick={() => archivo.current?.click()}
          >
            <Icon name="plus" size={17} />
            {cargando ? "Procesando…" : "Abrir estudio"}
            <input
              ref={archivo}
              hidden
              type="file"
              multiple
              accept=".dcm,.dicom,.zip,.rar,image/*,application/dicom,application/zip,application/vnd.rar"
              onChange={(e) => {
                void procesarSeleccion(e.target.files);
                e.target.value = "";
              }}
            />
          </button>
        </div>
      </header>
      {mensajeCarga && (
        <div className="rx-resultado-carga">
          <Icon name="check" size={15} />
          {mensajeCarga}
        </div>
      )}
      <section ref={estacion} className="rx-estacion">
        {panel && (
          <aside className="rx-panel">
            <div className="rx-panel-titulo">
              <div>
                <strong>Estudios del paciente</strong>
                {actual && <small>{actual.paciente}</small>}
              </div>
              <span>
                {estudiosOrthanc.length ||
                  (actual
                    ? Math.max(
                        1,
                        estudios.filter((e) => e.paciente === actual.paciente)
                          .length,
                      )
                    : 0)}
              </span>
            </div>
            <div className="rx-lista">
              {estudiosOrthanc.length ? (
                estudiosOrthanc.map((estudio) => (
                  <button
                    key={estudio.id}
                    className={actual?.id === estudio.id ? "activo" : ""}
                    disabled={cargando && actual?.id === estudio.id}
                    onClick={() => void abrirEstudioOrthanc(estudio)}
                  >
                    <span>
                      <Icon name="image" size={17} />
                    </span>
                    <div>
                      <strong>
                        {estudio.descripcion ||
                          estudio.modalidades.join(", ") ||
                          "Estudio radiográfico"}
                      </strong>
                      <small>
                        {/^\d{8}$/.test(estudio.fechaEstudio)
                          ? `${estudio.fechaEstudio.slice(6, 8)}/${estudio.fechaEstudio.slice(4, 6)}/${estudio.fechaEstudio.slice(0, 4)}`
                          : "Fecha no registrada"}
                      </small>
                      <small>
                        {actual?.id === estudio.id
                          ? `Corte ${corte.actual} de ${corte.total}`
                          : estudio.modalidades.join(", ") || "DICOM"}
                      </small>
                    </div>
                  </button>
                ))
              ) : actual ? (
                [
                  actual,
                  ...estudios.filter(
                    (e) => e.paciente === actual.paciente && e.id !== actual.id,
                  ),
                ].map((estudio) => (
                  <button
                    key={estudio.id}
                    className={actual.id === estudio.id ? "activo" : ""}
                    onClick={() => {
                      if (actual.id === estudio.id) return;
                      const guardado = obtenerEstudios().find(
                        (e) => e.id === estudio.id,
                      );
                      if (guardado) void abrirEstudioGuardado(guardado);
                    }}
                  >
                    <span>
                      <Icon name="image" size={17} />
                    </span>
                    <div>
                      <strong>{estudio.titulo}</strong>
                      <small>
                        {new Date(estudio.creadaEn).toLocaleDateString("es-ES")}
                      </small>
                      <small>
                        {actual.id === estudio.id && esDicom
                          ? `Corte ${corte.actual} de ${corte.total}`
                          : estudio.categoria}
                      </small>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rx-sin-estudios">
                  <Icon name="image" size={24} />
                  <span>Selecciona un paciente y un estudio</span>
                </div>
              )}
            </div>
          </aside>
        )}
        <main className={`rx-area ${esDicom ? "sin-ajustes" : ""}`}>
          <div className="rx-toolbar">
            <div>
              <button onClick={() => cambiarZoom(0.8)}>−</button>
              <span>
                {esDicom
                  ? `Corte ${corte.actual}/${corte.total}`
                  : `${Math.round(zoom * 100)}%`}
              </span>
              <button onClick={() => cambiarZoom(1.25)}>+</button>
            </div>
            <button onClick={() => rotar(-90)}>↶</button>
            <button onClick={() => rotar(90)}>↷</button>
            <button className={invertido ? "activo" : ""} onClick={negativo}>
              Negativo
            </button>
            <button
              className={reflejado ? "activo" : ""}
              onClick={invertirHorizontal}
              title="Reflejar la imagen de izquierda a derecha"
            >
              Invertir L/R
            </button>
            <button onClick={centrar} title="Devolver la imagen al centro">
              Centrar
            </button>
            <button onClick={restablecer}>Restablecer</button>
            <span className="rx-toolbar-separador" />
            <button
              className="rx-exportar"
              disabled={!actual}
              onClick={() => void exportar("jpeg")}
            >
              <Icon name="image" size={15} />
              JPEG
            </button>
            <button
              className="rx-exportar"
              disabled={!actual}
              onClick={() => void exportar("pdf")}
            >
              <Icon name="fileText" size={15} />
              PDF
            </button>
          </div>
          <div
            className={`rx-lienzo ${arrastrando ? `arrastrando-${arrastrando}` : ""}`}
            onWheel={zoomConRueda}
            onContextMenu={(e) => e.preventDefault()}
            onAuxClick={(e) => e.preventDefault()}
            onPointerDown={iniciarGesto}
            onPointerMove={moverGesto}
            onPointerUp={terminarGesto}
            onPointerCancel={terminarGesto}
          >
            {esDicom ? (
              <VisorDicom
                files={dicomFiles}
                alCambiarCorte={alCambiarCorte}
                controlRef={dicomControl}
                onSolicitarPantallaCompleta={() =>
                  void alternarPantallaCompleta()
                }
              />
            ) : actual ? (
              <>
                <img
                  src={actual.url}
                  alt={actual.titulo}
                  style={{
                    transform: `translate(${posicion.x}px,${posicion.y}px) scale(${zoom}) rotate(${rotacion}deg) scaleX(${reflejado ? -1 : 1})`,
                    filter: `grayscale(1) brightness(${brillo}%) contrast(${contraste}%) invert(${invertido ? 1 : 0})`,
                  }}
                />
                <span className="rx-marca rx-izquierda">R</span>
                <span className="rx-marca rx-derecha">L</span>
                <div className="rx-datos">
                  <strong>{actual.paciente}</strong>
                  <span>{actual.titulo}</span>
                  <span>{actual.categoria}</span>
                </div>
              </>
            ) : (
              <div className="rx-vacio">
                <Icon name="image" size={37} />
                <h3>Abre un estudio radiológico</h3>
                <p>
                  Selecciona un DICOM, un archivo comprimido o una carpeta
                  completa.
                </p>
              </div>
            )}
            {actual && (
              <div className="rx-ayuda-gestos">
                <span>Rueda: zoom</span>
                <span>Doble clic derecho: pantalla completa</span>
                <span>Rueda presionada: mover</span>
                <span>Derecho ↔ contraste</span>
                <span>Derecho ↕ brillo</span>
                {esDicom && corte.total > 1 && (
                  <span>Mayús + rueda: cambiar corte</span>
                )}
              </div>
            )}
            {arrastrando && (
              <div className="rx-gesto-activo">
                {arrastrando === "mover"
                  ? "Moviendo imagen"
                  : `Brillo ${brillo}% · Contraste ${contraste}%`}
              </div>
            )}
          </div>
          {!esDicom && (
            <div className="rx-ajustes">
              <label>
                <span>Brillo</span>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={brillo}
                  onChange={(e) => setBrillo(Number(e.target.value))}
                />
                <b>{brillo}%</b>
              </label>
              <label>
                <span>Contraste</span>
                <input
                  type="range"
                  min="20"
                  max="250"
                  value={contraste}
                  onChange={(e) => setContraste(Number(e.target.value))}
                />
                <b>{contraste}%</b>
              </label>
            </div>
          )}
        </main>
      </section>
      <p className="rx-advertencia">
        Visor experimental para pruebas. No utilizar como única herramienta de
        diagnóstico clínico.
      </p>
    </div>
  );
}
