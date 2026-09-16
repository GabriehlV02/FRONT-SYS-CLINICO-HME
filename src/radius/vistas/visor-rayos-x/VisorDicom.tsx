import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import dicomParser from "dicom-parser";

export type ControlDicom = {
  zoom: (factor: number) => void;
  rotar: (grados: number) => void;
  negativo: () => void;
  invertirHorizontal: () => void;
  centrar: () => void;
  siguienteCorte: () => void;
  restablecer: () => void;
  canvas: () => HTMLCanvasElement | null;
};

type ImagenDicom = {
  pixeles: Float32Array;
  filas: number;
  columnas: number;
  centro: number;
  ancho: number;
  centroInicial: number;
  anchoInicial: number;
  monocromo1: boolean;
};

const numeroDicom = (valor: string | undefined) =>
  Number(valor?.split("\\")[0]);

async function decodificar(file: File): Promise<ImagenDicom> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dataSet = dicomParser.parseDicom(bytes);
  const filas = dataSet.uint16("x00280010") || 0,
    columnas = dataSet.uint16("x00280011") || 0;
  const bits = dataSet.uint16("x00280100") || 16,
    bitsGuardados = dataSet.uint16("x00280101") || bits;
  const firmado = dataSet.uint16("x00280103") === 1,
    muestras = dataSet.uint16("x00280002") || 1;
  const transferencia =
    dataSet.string("x00020010")?.trim() || "1.2.840.10008.1.2";
  const pixelData = dataSet.elements.x7fe00010;
  if (!filas || !columnas || !pixelData)
    throw new Error("El DICOM no contiene una imagen radiográfica válida.");
  if (muestras !== 1)
    throw new Error(
      "Este DICOM contiene una imagen a color que todavía no está soportada por el visor radiográfico.",
    );
  if (
    ![
      "1.2.840.10008.1.2",
      "1.2.840.10008.1.2.1",
      "1.2.840.10008.1.2.2",
    ].includes(transferencia)
  )
    throw new Error(
      `El estudio utiliza compresión DICOM (${transferencia}) y necesita el decodificador avanzado.`,
    );
  const cantidad = filas * columnas,
    pixeles = new Float32Array(cantidad),
    vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const littleEndian = transferencia !== "1.2.840.10008.1.2.2",
    pendiente = bitsGuardados < 32 ? 32 - bitsGuardados : 0;
  const slope = Number(dataSet.string("x00281053")) || 1,
    intercept = Number(dataSet.string("x00281052")) || 0;
  let minimo = Infinity,
    maximo = -Infinity;
  for (let i = 0; i < cantidad; i++) {
    const posicion = pixelData.dataOffset + i * (bits / 8);
    let crudo: number;
    if (bits === 8)
      crudo = firmado ? vista.getInt8(posicion) : vista.getUint8(posicion);
    else {
      crudo = vista.getUint16(posicion, littleEndian);
      if (firmado) crudo = (crudo << pendiente) >> pendiente;
    }
    const valor = crudo * slope + intercept;
    pixeles[i] = valor;
    if (valor < minimo) minimo = valor;
    if (valor > maximo) maximo = valor;
  }
  let centro = numeroDicom(dataSet.string("x00281050")),
    ancho = numeroDicom(dataSet.string("x00281051"));
  if (!Number.isFinite(centro)) centro = (minimo + maximo) / 2;
  if (!Number.isFinite(ancho) || ancho <= 1)
    ancho = Math.max(2, maximo - minimo);
  return {
    pixeles,
    filas,
    columnas,
    centro,
    ancho,
    centroInicial: centro,
    anchoInicial: ancho,
    monocromo1: dataSet.string("x00280004")?.trim() === "MONOCHROME1",
  };
}

export default function VisorDicom({
  files,
  alCambiarCorte,
  controlRef,
  onSolicitarPantallaCompleta,
  modoRueda = "zoom",
}: {
  files: File[];
  alCambiarCorte: (actual: number, total: number) => void;
  controlRef: MutableRefObject<ControlDicom | null>;
  onSolicitarPantallaCompleta?: () => void;
  modoRueda?: "zoom" | "cortes";
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    imagenRef = useRef<ImagenDicom | null>(null);
  const [indice, setIndice] = useState(Math.floor(files.length / 2)),
    [zoom, setZoom] = useState(1),
    [rotacion, setRotacion] = useState(0),
    [invertido, setInvertido] = useState(false),
    [reflejado, setReflejado] = useState(false),
    [posicion, setPosicion] = useState({ x: 0, y: 0 }),
    [interaccion, setInteraccion] = useState<"mover" | "ventana" | null>(null),
    [error, setError] = useState(""),
    [cargando, setCargando] = useState(true);
  const ventana = useRef({ centro: 0, ancho: 1 }),
    gesto = useRef({
      activo: false,
      boton: 0,
      x: 0,
      y: 0,
      posX: 0,
      posY: 0,
      centro: 0,
      ancho: 1,
    });
  const ultimoClickDerecho = useRef(0);

  useEffect(() => {
    setIndice(Math.floor(files.length / 2));
    setZoom(1);
    setRotacion(0);
    setReflejado(false);
    setPosicion({ x: 0, y: 0 });
  }, [files]);

  const pintar = () => {
    const elemento = canvas.current,
      imagen = imagenRef.current;
    if (!elemento || !imagen) return;
    elemento.width = imagen.columnas;
    elemento.height = imagen.filas;
    const ctx = elemento.getContext("2d"),
      salida = ctx?.createImageData(imagen.columnas, imagen.filas);
    if (!ctx || !salida) return;
    const inferior = ventana.current.centro - ventana.current.ancho / 2,
      superior = ventana.current.centro + ventana.current.ancho / 2,
      invertir = imagen.monocromo1 !== invertido;
    for (let i = 0; i < imagen.pixeles.length; i++) {
      let gris = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            ((imagen.pixeles[i] - inferior) * 255) /
              Math.max(1, superior - inferior),
          ),
        ),
      );
      if (invertir) gris = 255 - gris;
      const destino = i * 4;
      salida.data[destino] = gris;
      salida.data[destino + 1] = gris;
      salida.data[destino + 2] = gris;
      salida.data[destino + 3] = 255;
    }
    ctx.putImageData(salida, 0, 0);
  };

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError("");
    imagenRef.current = null;
    decodificar(files[indice])
      .then((imagen) => {
        if (cancelado) return;
        imagenRef.current = imagen;
        ventana.current = { centro: imagen.centro, ancho: imagen.ancho };
        pintar();
        setCargando(false);
        alCambiarCorte(indice + 1, files.length);
      })
      .catch((e) => {
        if (!cancelado) {
          setError(
            e instanceof Error ? e.message : "No se pudo decodificar el DICOM.",
          );
          setCargando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [files, indice, alCambiarCorte]);

  useEffect(() => {
    controlRef.current = {
      zoom: (factor) => setZoom((v) => Math.max(0.15, Math.min(8, v * factor))),
      rotar: (grados) => setRotacion((v) => v + grados),
      negativo: () => setInvertido((v) => !v),
      invertirHorizontal: () => setReflejado((v) => !v),
      centrar: () => setPosicion({ x: 0, y: 0 }),
      siguienteCorte: () => setIndice((valor) => files.length ? (valor + 1) % files.length : 0),
      restablecer: () => {
        const imagen = imagenRef.current;
        if (imagen)
          ventana.current = {
            centro: imagen.centroInicial,
            ancho: imagen.anchoInicial,
          };
        setZoom(1);
        setRotacion(0);
        setInvertido(false);
        setReflejado(false);
        setPosicion({ x: 0, y: 0 });
        pintar();
      },
      canvas: () => canvas.current,
    };
    return () => {
      controlRef.current = null;
    };
  });
  useEffect(pintar, [invertido]);

  const iniciar = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (![0, 1, 2].includes(e.button) || !imagenRef.current) return;
    e.preventDefault();
    if (e.button === 2) {
      const ahora = Date.now();
      if (ahora - ultimoClickDerecho.current < 350) {
        ultimoClickDerecho.current = 0;
        gesto.current.activo = false;
        setInteraccion(null);
        onSolicitarPantallaCompleta?.();
        return;
      }
      ultimoClickDerecho.current = ahora;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = {
      activo: true,
      boton: e.button,
      x: e.clientX,
      y: e.clientY,
      posX: posicion.x,
      posY: posicion.y,
      centro: ventana.current.centro,
      ancho: ventana.current.ancho,
    };
    setInteraccion(e.button === 2 ? "ventana" : "mover");
  };
  const mover = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesto.current.activo) return;
    e.preventDefault();
    const dx = e.clientX - gesto.current.x,
      dy = e.clientY - gesto.current.y;
    if (gesto.current.boton !== 2)
      setPosicion({
        x: gesto.current.posX + dx / zoom,
        y: gesto.current.posY + dy / zoom,
      });
    else {
      const escala = Math.max(1, gesto.current.ancho / 300);
      ventana.current = {
        centro: gesto.current.centro - dy * escala,
        ancho: Math.max(2, gesto.current.ancho + dx * escala),
      };
      pintar();
    }
  };
  const terminar = (e: ReactPointerEvent<HTMLDivElement>) => {
    gesto.current.activo = false;
    setInteraccion(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const rueda = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if ((modoRueda === "cortes" && !e.ctrlKey) || e.shiftKey) {
      setIndice((v) =>
        Math.max(0, Math.min(files.length - 1, v + (e.deltaY > 0 ? 1 : -1))),
      );
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect(),
      puntoX = e.clientX - (rect.left + rect.width / 2),
      puntoY = e.clientY - (rect.top + rect.height / 2),
      factor = e.deltaY < 0 ? 1.15 : 1 / 1.15,
      nuevoZoom = Math.max(0.15, Math.min(8, zoom * factor)),
      factorReal = nuevoZoom / zoom;
    setPosicion((p) => ({
      x: puntoX - (puntoX - p.x) * factorReal,
      y: puntoY - (puntoY - p.y) * factorReal,
    }));
    setZoom(nuevoZoom);
  };
  return (
    <div
      className={`rx-dicom ${interaccion ? `interaccion-${interaccion}` : ""}`}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={terminar}
      onPointerCancel={terminar}
      onWheel={rueda}
      onContextMenu={(e) => e.preventDefault()}
      onAuxClick={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvas}
        style={{
          transform: `translate(${posicion.x}px,${posicion.y}px) scale(${zoom}) rotate(${rotacion}deg) scaleX(${reflejado ? -1 : 1})`,
        }}
      />
      {cargando && (
        <div className="rx-dicom-estado">
          <span className="rx-spinner" />
          Decodificando radiografía…
        </div>
      )}
      {error && (
        <div className="rx-dicom-error">
          <strong>No se pudo visualizar este archivo</strong>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
