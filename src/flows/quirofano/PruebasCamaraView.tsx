import { useEffect, useRef, useState } from "react";
import Icon from "../../radius/componentes/Icono";
import "./PruebasCamaraView.css";

type EstadoCamara = "conectando" | "activa" | "error";
type Rectangulo = { x: number; y: number; width: number; height: number };
type Cv = any;

declare global {
  interface Window {
    cv?: Cv;
  }
}

let cargaOpenCv: Promise<Cv> | null = null;

function obtenerOpenCv(): Promise<Cv> {
  if (window.cv?.HOGDescriptor) return Promise.resolve(window.cv);
  if (cargaOpenCv) return cargaOpenCv;
  cargaOpenCv = new Promise((resolve, reject) => {
    const existente = document.querySelector(
      "script[data-opencv-pruebas]",
    ) as HTMLScriptElement | null;
    const esperarRuntime = () => {
      const inicio = Date.now();
      const revisar = () => {
        if (window.cv?.HOGDescriptor) {
          resolve(window.cv);
          return;
        }
        if (Date.now() - inicio > 20000) {
          reject(new Error("OpenCV no terminó de cargar."));
          return;
        }
        window.setTimeout(revisar, 120);
      };
      revisar();
    };
    if (existente) {
      esperarRuntime();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.dataset.opencvPruebas = "true";
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.onload = esperarRuntime;
    script.onerror = () => reject(new Error("No se pudo descargar OpenCV."));
    document.head.appendChild(script);
  });
  return cargaOpenCv;
}

const seCruzan = (a: Rectangulo, b: Rectangulo) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
const escalar = (
  rectangulo: Rectangulo,
  factorX: number,
  factorY: number,
): Rectangulo => ({
  x: rectangulo.x * factorX,
  y: rectangulo.y * factorY,
  width: rectangulo.width * factorX,
  height: rectangulo.height * factorY,
});

export function PruebasCamaraView() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const solicitudCamara = useRef(0);
  const anterior = useRef<any>(null);
  const hayObjetoEnZona = useRef(false);
  const [estado, setEstado] = useState<EstadoCamara>("conectando");
  const [mensaje, setMensaje] = useState("Conectando con la cámara…");
  const [personas, setPersonas] = useState(0);
  const [instrumentos, setInstrumentos] = useState(0);
  const [visionLista, setVisionLista] = useState(false);
  const [errorVision, setErrorVision] = useState(false);
  const [analisisSolicitado, setAnalisisSolicitado] = useState(false);

  const detenerCamara = () => {
    solicitudCamara.current += 1;
    stream.current?.getTracks().forEach((pista) => pista.stop());
    stream.current = null;
  };
  const iniciarCamara = async () => {
    detenerCamara();
    setEstado("conectando");
    setMensaje("Conectando con la cámara…");
    const solicitud = solicitudCamara.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado("error");
      setMensaje(
        "Este navegador no permite acceder a la cámara. Usa una conexión segura o localhost.",
      );
      return;
    }
    try {
      const medio = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (solicitud !== solicitudCamara.current) {
        medio.getTracks().forEach((pista) => pista.stop());
        return;
      }
      stream.current = medio;
      if (video.current) {
        video.current.srcObject = medio;
        await video.current.play();
      }
      setEstado("activa");
      setMensaje("Cámara conectada y transmitiendo en vivo.");
    } catch (error) {
      if (solicitud !== solicitudCamara.current) return;
      const nombre = error instanceof DOMException ? error.name : "";
      setEstado("error");
      setMensaje(
        nombre === "NotAllowedError"
          ? "Se requiere permiso del navegador para usar la cámara."
          : nombre === "NotFoundError"
            ? "No se detectó una cámara conectada."
            : "No se pudo iniciar la cámara. Verifica que no esté siendo usada por otra aplicación.",
      );
    }
  };
  useEffect(() => {
    void iniciarCamara();
    return detenerCamara;
  }, []);

  useEffect(() => {
    if (estado !== "activa" || !analisisSolicitado) {
      setVisionLista(false);
      return;
    }
    let cancelado = false;
    let intervalo = 0;
    let detector: any = null;
    const procesar = (cv: Cv, hog: any) => {
      const fuente = video.current;
      const capa = canvas.current;
      if (
        !fuente ||
        !capa ||
        fuente.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !fuente.videoWidth
      )
        return;
      const ancho = 480;
      const alto = Math.round((fuente.videoHeight * ancho) / fuente.videoWidth);
      let origen: any;
      let reducida: any;
      let gris: any;
      let rectangulos: any;
      let pesos: any;
      let diferencia: any;
      let binaria: any;
      let contornos: any;
      let jerarquia: any;
      let nucleo: any;
      try {
        origen = cv.imread(fuente);
        reducida = new cv.Mat();
        gris = new cv.Mat();
        cv.resize(origen, reducida, new cv.Size(ancho, alto));
        cv.cvtColor(reducida, gris, cv.COLOR_RGBA2GRAY);
        rectangulos = new cv.RectVector();
        pesos = new cv.DoubleVector();
        hog.detectMultiScale(
          reducida,
          rectangulos,
          pesos,
          0,
          new cv.Size(8, 8),
          new cv.Size(16, 16),
          1.05,
          2,
          false,
        );
        const detectadas: Rectangulo[] = [];
        for (let indice = 0; indice < rectangulos.size(); indice += 1) {
          const r = rectangulos.get(indice) as Rectangulo;
          if (!detectadas.some((existente) => seCruzan(existente, r)))
            detectadas.push(r);
        }
        const factorX = fuente.videoWidth / ancho;
        const factorY = fuente.videoHeight / alto;
        capa.width = fuente.videoWidth;
        capa.height = fuente.videoHeight;
        const contexto = capa.getContext("2d");
        if (!contexto) return;
        contexto.clearRect(0, 0, capa.width, capa.height);
        contexto.lineWidth = 3;
        contexto.font = "700 15px Arial";
        contexto.textBaseline = "top";
        const zonas = detectadas.flatMap((persona) => [
          {
            x: persona.x - persona.width * 0.08,
            y: persona.y + persona.height * 0.38,
            width: persona.width * 0.3,
            height: persona.height * 0.3,
          },
          {
            x: persona.x + persona.width * 0.78,
            y: persona.y + persona.height * 0.38,
            width: persona.width * 0.3,
            height: persona.height * 0.3,
          },
        ]);
        detectadas.forEach((persona) => {
          const r = escalar(persona, factorX, factorY);
          contexto.strokeStyle = "#20d57a";
          contexto.strokeRect(r.x, r.y, r.width, r.height);
          contexto.fillStyle = "#20d57a";
          contexto.fillRect(r.x, Math.max(0, r.y - 25), 106, 24);
          contexto.fillStyle = "#052619";
          contexto.fillText("PERSONA", r.x + 7, Math.max(3, r.y - 21));
        });
        zonas.forEach((zona) => {
          const r = escalar(zona, factorX, factorY);
          contexto.setLineDash([6, 5]);
          contexto.strokeStyle = "#38cce6";
          contexto.strokeRect(r.x, r.y, r.width, r.height);
          contexto.setLineDash([]);
        });
        let objetoVisible = false;
        if (anterior.current) {
          diferencia = new cv.Mat();
          binaria = new cv.Mat();
          contornos = new cv.MatVector();
          jerarquia = new cv.Mat();
          nucleo = new cv.Mat();
          cv.absdiff(gris, anterior.current, diferencia);
          cv.threshold(diferencia, binaria, 28, 255, cv.THRESH_BINARY);
          cv.dilate(binaria, binaria, nucleo, new cv.Point(-1, -1), 2);
          cv.findContours(
            binaria,
            contornos,
            jerarquia,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE,
          );
          for (let indice = 0; indice < contornos.size(); indice += 1) {
            const r = cv.boundingRect(contornos.get(indice));
            if (
              r.width * r.height < 450 ||
              !zonas.some((zona) => seCruzan(zona, r))
            )
              continue;
            objetoVisible = true;
            const dibujo = escalar(r, factorX, factorY);
            contexto.strokeStyle = "#ffba27";
            contexto.strokeRect(
              dibujo.x,
              dibujo.y,
              dibujo.width,
              dibujo.height,
            );
            contexto.fillStyle = "#ffba27";
            contexto.fillRect(dibujo.x, Math.max(0, dibujo.y - 23), 175, 22);
            contexto.fillStyle = "#382300";
            contexto.fillText(
              "OBJETO MANIPULADO",
              dibujo.x + 6,
              Math.max(3, dibujo.y - 19),
            );
          }
        }
        if (objetoVisible && !hayObjetoEnZona.current)
          setInstrumentos((actual) => actual + 1);
        hayObjetoEnZona.current = objetoVisible;
        anterior.current?.delete();
        anterior.current = gris.clone();
        setPersonas(detectadas.length);
      } catch {
        /* la transmisión permanece disponible si un cuadro no puede procesarse */
      } finally {
        origen?.delete();
        reducida?.delete();
        gris?.delete();
        rectangulos?.delete();
        pesos?.delete();
        diferencia?.delete();
        binaria?.delete();
        contornos?.delete();
        jerarquia?.delete();
        nucleo?.delete();
      }
    };
    const iniciarVision = async () => {
      try {
        setErrorVision(false);
        const cv = await obtenerOpenCv();
        if (cancelado) return;
        detector = new cv.HOGDescriptor();
        detector.setSVMDetector(cv.HOGDescriptor.getDefaultPeopleDetector());
        setVisionLista(true);
        intervalo = window.setInterval(() => procesar(cv, detector), 420);
      } catch {
        if (!cancelado) {
          setErrorVision(true);
          setMensaje(
            "La cámara está activa, pero OpenCV no pudo iniciarse. Revisa la conexión a internet.",
          );
        }
      }
    };
    void iniciarVision();
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      detector?.delete?.();
      anterior.current?.delete();
      anterior.current = null;
    };
  }, [estado, analisisSolicitado]);

  return (
    <main className="pruebas-camara-vista">
      <header className="pruebas-camara-cabecera">
        <div>
          <span>QUIRÓFANO · PRUEBA DE VISIÓN</span>
          <h2>Pruebas de cámara</h2>
          <p>Detección anónima de personas y objetos manipulados.</p>
        </div>
        <div className={`pruebas-camara-estado ${estado}`}>
          <i />
          {estado === "activa"
            ? "En vivo"
            : estado === "conectando"
              ? "Conectando"
              : "Sin conexión"}
        </div>
      </header>
      <section className="pruebas-camara-metricas">
        <div>
          <Icon name="users" size={19} />
          <span>Personas detectadas</span>
          <strong>{visionLista ? personas : "—"}</strong>
        </div>
        <div>
          <Icon name="surgery" size={19} />
          <span>Objetos manipulados</span>
          <strong>{visionLista ? instrumentos : "—"}</strong>
        </div>
        <small>
          {visionLista
            ? "Prueba OpenCV activa · sin identificación facial"
            : estado !== "activa"
              ? "Conecta la cámara para iniciar el análisis."
              : errorVision
                ? "No se pudo iniciar el análisis de imagen."
                : analisisSolicitado
                  ? "Cargando motor OpenCV…"
                  : "Análisis de imagen desactivado."}
        </small>
        {estado === "activa" && !analisisSolicitado && (
          <button type="button" onClick={() => setAnalisisSolicitado(true)}>
            Iniciar análisis
          </button>
        )}
      </section>
      <section
        className="pruebas-camara-visor"
        aria-label="Vista en vivo de cámara"
      >
        <video ref={video} autoPlay muted playsInline />
        <canvas ref={canvas} aria-hidden="true" />
        {estado !== "activa" && (
          <div className="pruebas-camara-mensaje">
            <Icon name="camera" size={30} />
            <strong>
              {estado === "conectando"
                ? "Preparando la cámara"
                : "No fue posible iniciar la cámara"}
            </strong>
            <span>{mensaje}</span>
            {estado === "error" && (
              <button type="button" onClick={() => void iniciarCamara()}>
                <Icon name="refresh" size={16} /> Reintentar
              </button>
            )}
          </div>
        )}
        {estado === "activa" && (
          <div className="pruebas-camara-en-vivo">
            <i /> EN VIVO · ANÓNIMO
          </div>
        )}
      </section>
      <footer className="pruebas-camara-pie">
        <Icon name="camera" size={16} />
        <span>{mensaje}</span>
      </footer>
    </main>
  );
}
