import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../../componentes/Icono";
import { apiFetch } from "../../api";
import {
  obtenerArchivoEstudio,
  obtenerEstudioSeleccionado,
  obtenerEstudios,
  type EstudioDemo,
} from "../../datos/almacenDemo";
import {
  importarEstudio,
  type ResultadoImportacion,
} from "../visor-rayos-x/importadorEstudios";
import VisorDicom, { type ControlDicom } from "../visor-rayos-x/VisorDicom";
import "./VisorEcografias.css";

type EstudioOrthanc = {
  id: string;
  patientIdDicom: string;
  patientName: string;
  descripcion: string;
  fechaEstudio: string;
  modalidades: string[];
  accessionNumber: string;
};

const esEcografia = (categoria: string) =>
  /ecograf|ultrason|\bus\b/i.test(
    categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );

export default function VisorEcografias() {
  const [estudios, setEstudios] = useState(() =>
    obtenerEstudios().filter((estudio) => esEcografia(estudio.categoria)),
  );
  const [estudiosOrthanc, setEstudiosOrthanc] = useState<EstudioDemo[]>([]);
  const [estudio, setEstudio] = useState<EstudioDemo | null>(null);
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [dicom, setDicom] = useState<File[]>([]);
  const [cuadro, setCuadro] = useState(0);
  const [urlImagen, setUrlImagen] = useState("");
  const [ganancia, setGanancia] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [invertir, setInvertir] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const estacion = useRef<HTMLElement>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const entradaCarpeta = useRef<HTMLInputElement>(null);
  const controlDicom = useRef<ControlDicom | null>(null);
  const zoomDicom = useRef(100);
  const esDICOM = dicom.length > 0;
  const totalCuadros = esDICOM ? dicom.length : imagenes.length;

  useEffect(() => {
    entradaCarpeta.current?.setAttribute("webkitdirectory", "");
    entradaCarpeta.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    const actualizar = () =>
      setEstudios(
        obtenerEstudios().filter((item) => esEcografia(item.categoria)),
      );
    window.addEventListener("radiuus:datos-demo", actualizar);
    return () => window.removeEventListener("radiuus:datos-demo", actualizar);
  }, []);

  useEffect(() => {
    const actualizarPantallaCompleta = () =>
      setPantallaCompleta(document.fullscreenElement === estacion.current);
    document.addEventListener("fullscreenchange", actualizarPantallaCompleta);
    actualizarPantallaCompleta();
    return () =>
      document.removeEventListener("fullscreenchange", actualizarPantallaCompleta);
  }, []);

  useEffect(() => {
    if (esDICOM) {
      controlDicom.current?.ajustarVentana(ganancia, contraste);
      controlDicom.current?.zoom(zoom / zoomDicom.current);
      zoomDicom.current = zoom;
    }
  }, [esDICOM, ganancia, contraste, zoom]);

  useEffect(() => {
    if (esDICOM || !imagenes[cuadro]) {
      setUrlImagen("");
      return;
    }
    const url = URL.createObjectURL(imagenes[cuadro]);
    setUrlImagen(url);
    return () => URL.revokeObjectURL(url);
  }, [cuadro, esDICOM, imagenes]);

  useEffect(() => {
    if (!reproduciendo || totalCuadros < 2) return;
    const intervalo = window.setInterval(() => {
      if (esDICOM) controlDicom.current?.siguienteCorte();
      else setCuadro((actual) => (actual + 1) % totalCuadros);
    }, 120);
    return () => window.clearInterval(intervalo);
  }, [esDICOM, reproduciendo, totalCuadros]);

  const restablecerControles = () => {
    setGanancia(100);
    setContraste(100);
    setZoom(100);
    setInvertir(false);
    zoomDicom.current = 100;
    controlDicom.current?.restablecer();
  };

  const cargarResultado = (
    resultado: ResultadoImportacion,
    nombre: string,
    datos?: EstudioDemo,
  ) => {
    if (resultado.dicom.length) {
      setDicom(resultado.dicom);
      setImagenes([]);
      setCuadro(Math.floor(resultado.dicom.length / 2));
    } else if (resultado.imagenes.length) {
      setDicom([]);
      setImagenes(resultado.imagenes);
      setCuadro(0);
    } else {
      throw new Error("No se encontraron imágenes compatibles en el estudio.");
    }
    setEstudio(
      datos || {
        id: `local-${Date.now()}`,
        pacienteId: "",
        paciente: "Estudio local",
        titulo: nombre,
        categoria: "Ecografía",
        descripcion: "",
        nombreArchivo: nombre,
        mime: resultado.dicom.length
          ? "application/dicom"
          : resultado.imagenes[0].type,
        creadaEn: new Date().toISOString(),
      },
    );
    setReproduciendo(false);
    restablecerControles();
  };

  const abrirEstudio = useCallback(async (item: EstudioDemo) => {
    if (!esEcografia(item.categoria)) return;
    setCargando(true);
    setError("");
    try {
      const archivo = await obtenerArchivoEstudio(item);
      cargarResultado(
        await importarEstudio([archivo]),
        item.nombreArchivo,
        item,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el estudio ecográfico.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  const abrirEstudioOrthanc = useCallback(async (item: EstudioDemo) => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await apiFetch(
        `/api/orthanc/estudios/${encodeURIComponent(item.id)}/archivo`,
      );
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(
          datos.message || "No se pudo obtener el estudio desde Orthanc.",
        );
      }
      const archivo = new File(
        [await respuesta.blob()],
        item.nombreArchivo,
        { type: "application/zip" },
      );
      cargarResultado(await importarEstudio([archivo]), archivo.name, item);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el estudio de Orthanc.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const seleccionado = obtenerEstudioSeleccionado();
    if (seleccionado && esEcografia(seleccionado.categoria)) {
      void abrirEstudio(seleccionado);
    }
  }, [abrirEstudio]);

  useEffect(() => {
    const id = localStorage.getItem("radiuus_orthanc_estudio");
    if (!id) return;
    localStorage.removeItem("radiuus_orthanc_estudio");
    void (async () => {
      const respuesta = await apiFetch("/api/orthanc/estudios");
      const lista = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          lista.message || "No se pudo consultar el historial DICOM.",
        );
      }
      const seleccionado = (lista as EstudioOrthanc[]).find(
        (item) => item.id === id,
      );
      if (!seleccionado) {
        throw new Error("El estudio seleccionado ya no está disponible.");
      }
      if (!esEcografia(seleccionado.modalidades.join(" "))) {
        throw new Error("El estudio seleccionado no corresponde a ecografía.");
      }
      const pacienteId = seleccionado.patientIdDicom.trim().toUpperCase();
      const paciente = seleccionado.patientName.trim().toUpperCase();
      const historial = (lista as EstudioOrthanc[])
        .filter((item) => {
          if (!esEcografia(item.modalidades.join(" "))) return false;
          if (!pacienteId || pacienteId === "UNKNOWN") {
            return item.patientName.trim().toUpperCase() === paciente;
          }
          return (
            item.patientIdDicom.trim().toUpperCase() === pacienteId &&
            item.patientName.trim().toUpperCase() === paciente
          );
        })
        .sort((a, b) => b.fechaEstudio.localeCompare(a.fechaEstudio))
        .map((item) => ({
          id: item.id,
          pacienteId: item.patientIdDicom,
          paciente: item.patientName || "Paciente sin nombre",
          titulo: item.descripcion || item.modalidades.join(", "),
          categoria: item.modalidades.join(", "),
          descripcion: item.accessionNumber,
          nombreArchivo: `orthanc-${item.id}.zip`,
          mime: "application/zip",
          creadaEn: /^\d{8}$/.test(item.fechaEstudio)
            ? `${item.fechaEstudio.slice(0, 4)}-${item.fechaEstudio.slice(4, 6)}-${item.fechaEstudio.slice(6, 8)}T00:00:00`
            : new Date().toISOString(),
        }));
      setEstudiosOrthanc(historial);
      const seleccionadoVista = historial.find((item) => item.id === id);
      if (!seleccionadoVista) {
        throw new Error("No se pudo preparar el estudio ecográfico seleccionado.");
      }
      await abrirEstudioOrthanc(seleccionadoVista);
    })().catch((e: unknown) =>
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo abrir el historial ecográfico de Orthanc.",
      ),
    );
  }, [abrirEstudioOrthanc]);

  const procesarSeleccion = async (seleccion: FileList | null) => {
    if (!seleccion?.length) return;
    setCargando(true);
    setError("");
    try {
      const archivos = Array.from(seleccion);
      const resultado = await importarEstudio(archivos);
      const carpeta = (
        archivos[0] as File & { webkitRelativePath?: string }
      ).webkitRelativePath?.split("/")[0];
      cargarResultado(
        resultado,
        archivos.length === 1 ? archivos[0].name : carpeta || "Estudio ecográfico",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el estudio ecográfico.",
      );
    } finally {
      setCargando(false);
    }
  };

  const alternarPantallaCompleta = async () => {
    try {
      if (document.fullscreenElement === estacion.current) {
        await document.exitFullscreen();
      } else {
        await estacion.current?.requestFullscreen();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudo cambiar a pantalla completa: ${e.message}`
          : "No se pudo cambiar a pantalla completa.",
      );
    }
  };

  const cambiarCuadro = (valor: number) => {
    const siguiente = Math.max(0, Math.min(totalCuadros - 1, valor));
    if (esDICOM) controlDicom.current?.irACorte(siguiente);
    else setCuadro(siguiente);
  };

  return (
    <section className="eco-viewer" aria-label="Visor de ecografías">
      <header className="eco-viewer-header">
        <div>
          <span>IMAGENOLOGÍA · ULTRASONIDO</span>
          <h2>Visor de ecografías</h2>
          <p>Revisión de imágenes, secuencias y cine ecográfico.</p>
        </div>
        <div className="eco-viewer-actions">
          <input
            ref={entradaArchivo}
            hidden
            type="file"
            accept=".zip,.rar,.dcm,.dicom,image/*,application/zip,application/dicom"
            onChange={(event) => {
              void procesarSeleccion(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={entradaCarpeta}
            hidden
            type="file"
            multiple
            onChange={(event) => {
              void procesarSeleccion(event.target.files);
              event.target.value = "";
            }}
          />
          <button type="button" onClick={() => entradaArchivo.current?.click()}>
            <Icon name="image" size={17} /> Abrir estudio
          </button>
          <button
            type="button"
            onClick={() => entradaCarpeta.current?.click()}
          >
            <Icon name="package" size={17} /> Abrir carpeta
          </button>
        </div>
      </header>

      {error && <div className="eco-viewer-error" role="alert">{error}</div>}

      <section className="eco-console" ref={estacion}>
        <aside className="eco-study-list">
          <header>
            <div>
              <span>ESTUDIOS DISPONIBLES</span>
              <strong>Ecografías</strong>
            </div>
            <b>{estudios.length + estudiosOrthanc.length}</b>
          </header>
          <div className="eco-study-items">
            {estudios.map((item) => (
              <button
                type="button"
                key={item.id}
                className={estudio?.id === item.id ? "activo" : ""}
                onClick={() => void abrirEstudio(item)}
                disabled={cargando}
              >
                <span className="eco-study-icon">
                  <Icon name="image" size={17} />
                </span>
                <span className="eco-study-text">
                  <strong>{item.paciente}</strong>
                  <small>{item.titulo}</small>
                  <em>{new Date(item.creadaEn).toLocaleDateString("es-ES")}</em>
                </span>
              </button>
            ))}
            {estudiosOrthanc.map((item) => (
              <button
                type="button"
                key={`orthanc-${item.id}`}
                className={estudio?.id === item.id ? "activo" : ""}
                onClick={() => void abrirEstudioOrthanc(item)}
                disabled={cargando}
              >
                <span className="eco-study-icon">
                  <Icon name="image" size={17} />
                </span>
                <span className="eco-study-text">
                  <strong>{item.paciente}</strong>
                  <small>{item.titulo}</small>
                  <em>Orthanc · {new Date(item.creadaEn).toLocaleDateString("es-ES")}</em>
                </span>
              </button>
            ))}
            {!estudios.length && !estudiosOrthanc.length && (
              <p className="eco-study-empty">
                Aún no hay estudios de ecografía guardados.
              </p>
            )}
          </div>
        </aside>

        <main className="eco-imaging">
          <nav className="eco-imaging-toolbar" aria-label="Controles de imagen">
            <div className="eco-mode">
              <span className="eco-mode-dot" />
              <strong>Modo B</strong>
              <small>{esDICOM ? "DICOM" : "Imagen ecográfica"}</small>
            </div>
            <div className="eco-toolbar-actions">
              <button
                type="button"
                title={reproduciendo ? "Pausar cine" : "Reproducir cine"}
                onClick={() => setReproduciendo((valor) => !valor)}
                disabled={totalCuadros < 2}
                className={reproduciendo ? "activo" : ""}
              >
                {reproduciendo ? "Pausar cine" : "Reproducir cine"}
              </button>
              <button type="button" onClick={restablecerControles}>
                <Icon name="refresh" size={15} /> Restablecer
              </button>
              <button
                type="button"
                onClick={() => void alternarPantallaCompleta()}
                title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                <Icon name={pantallaCompleta ? "close" : "eye"} size={15} />
                {pantallaCompleta ? "Salir" : "Pantalla completa"}
              </button>
            </div>
          </nav>

          <div className="eco-scan-area">
            <div className="eco-scan-screen">
              {cargando ? (
                <div className="eco-scan-placeholder">
                  <span className="eco-loading-ring" />
                  <strong>Preparando estudio ecográfico…</strong>
                </div>
              ) : esDICOM ? (
                <VisorDicom
                  files={dicom}
                  controlRef={controlDicom}
                  alCambiarCorte={(actual) => setCuadro(actual - 1)}
                  modoRueda="cortes"
                />
              ) : urlImagen ? (
                <img
                  src={urlImagen}
                  alt={`Cuadro ${cuadro + 1} del estudio ecográfico`}
                  style={{
                    filter: `brightness(${ganancia}%) contrast(${contraste}%)`,
                    transform: `scale(${zoom / 100}) scaleX(${invertir ? -1 : 1})`,
                  }}
                />
              ) : (
                <div className="eco-scan-placeholder">
                  <span className="eco-probe-mark">
                    <Icon name="camera" size={25} />
                  </span>
                  <strong>Selecciona una ecografía para visualizarla</strong>
                  <small>
                    Abre un estudio guardado o carga imágenes, una carpeta o un
                    archivo DICOM.
                  </small>
                </div>
              )}
              {estudio && !cargando && (
                <>
                  <div className="eco-overlay-patient">
                    <strong>{estudio.paciente}</strong>
                    <span>{estudio.titulo}</span>
                    <span>{new Date(estudio.creadaEn).toLocaleDateString("es-ES")}</span>
                  </div>
                  {totalCuadros > 0 && (
                    <div className="eco-frame-indicator">
                      CUADRO {cuadro + 1} / {totalCuadros}
                    </div>
                  )}
                  <span className="eco-depth-scale" aria-hidden="true">
                    <i /><i /><i /><i /><i />
                  </span>
                </>
              )}
            </div>
          </div>

          <footer className="eco-timeline">
            <button
              type="button"
              title="Cuadro anterior"
              onClick={() => cambiarCuadro(cuadro - 1)}
              disabled={totalCuadros < 2}
            >
              <Icon name="chevronLeft" size={17} />
            </button>
            <label>
              <span>Cine</span>
              <input
                type="range"
                min="0"
                max={Math.max(0, totalCuadros - 1)}
                value={Math.min(cuadro, Math.max(0, totalCuadros - 1))}
                onChange={(event) => cambiarCuadro(Number(event.target.value))}
                disabled={totalCuadros < 2}
              />
              <b>{totalCuadros ? `${cuadro + 1} / ${totalCuadros}` : "—"}</b>
            </label>
            <button
              type="button"
              title="Cuadro siguiente"
              onClick={() => cambiarCuadro(cuadro + 1)}
              disabled={totalCuadros < 2}
            >
              <Icon name="chevronRight" size={17} />
            </button>
          </footer>
        </main>

        <aside className="eco-image-controls">
          <header>
            <span>AJUSTES DE IMAGEN</span>
            <strong>Ecografía</strong>
          </header>
          <label>
            Ganancia
            <input
              type="range"
              min="50"
              max="160"
              value={ganancia}
              onChange={(event) => setGanancia(Number(event.target.value))}
            />
            <b>{ganancia}%</b>
          </label>
          <label>
            Contraste
            <input
              type="range"
              min="60"
              max="160"
              value={contraste}
              onChange={(event) => setContraste(Number(event.target.value))}
            />
            <b>{contraste}%</b>
          </label>
          <label>
            Ampliación
            <input
              type="range"
              min="60"
              max="180"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <b>{zoom}%</b>
          </label>
          <button
            type="button"
            className={invertir ? "eco-flip activo" : "eco-flip"}
            onClick={() => {
              setInvertir((valor) => !valor);
              if (esDICOM) controlDicom.current?.invertirHorizontal();
            }}
          >
            <Icon name="refresh" size={15} /> Invertir lateral
          </button>
          <p>
            Los ajustes modifican la visualización y no alteran el archivo
            original.
          </p>
        </aside>
      </section>
      <p className="eco-viewer-note">
        La visualización no sustituye la interpretación médica del estudio.
      </p>
    </section>
  );
}
