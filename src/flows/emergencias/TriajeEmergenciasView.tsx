import { AvisoTemporal } from "../../radius/componentes/AvisoTemporal";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { sincronizarPaciente } from "../../radius/pacientesCompartidos";
import {
  PacienteIngresoEmergencia,
  fechaHoraIngresoActual,
  inicioEnIso,
} from "./PacienteIngresoEmergencia";
import Icon from "../../radius/componentes/Icono";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";
import "./TriajeEmergenciasView.css";
import "./TriajeEmergenciasCompacto.css";
import "./ResumenPacienteEmergencias.css";
import "./EditarPacienteEmergencias.css";
import { cubiculosEmergencias, nombreCubiculo } from "./cubiculos";
import { OrdenesEmergencias } from "./OrdenesEmergencias";
import {
  apiEmergencias,
  nombrePaciente,
  type CuentaEmergencia,
  type RegistroEnfermeria,
} from "./emergenciasApi";
import { camposParaServicio } from "../triaje/camposSignosVitales";
import {
  useCatalogoSignosVitales,
  useServiciosSignosVitales,
} from "../triaje/ServiciosSignosVitales";
import {
  signosVitalesIniciales,
  type SignoVitalConfig,
} from "../triaje/ConfiguracionSignosVitalesView";

type Item = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "servicio" | "producto";
  unidad: string;
  precio: number;
  categoria?: string;
};
type Consumo = Item & {
  registroId: string;
  cantidad: number;
  porHora: boolean;
  inicio: string;
  fin: string | null;
  tiempoAcumuladoMs?: number;
};
type PagoCobro = {
  id: string;
  metodo: string;
  monto: string;
  referencia: string;
};
type Identidad = Record<string, string>;
type Cuenta = CuentaEmergencia;
const dinero = (n: number) =>
  `Bs ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (v: string) => new Date(v).toLocaleString("es-BO");
const horaIngreso = (v: string) =>
  new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(v));
const edadPaciente = (nacimiento?: string) => {
  if (!nacimiento) return "No registrada";
  const fechaNacimiento = new Date(`${nacimiento}T00:00:00`);
  if (Number.isNaN(fechaNacimiento.getTime())) return "No registrada";
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  if (
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() &&
      hoy.getDate() < fechaNacimiento.getDate())
  )
    edad--;
  return edad >= 0 ? `${edad} años` : "No registrada";
};
const duracion = (c: Consumo, ahora: number) => {
  const tiempoGuardado = c.tiempoAcumuladoMs;
  const tiempoEnCurso = c.fin ? 0 : ahora - Date.parse(c.inicio);
  return Math.max(
    0,
    tiempoGuardado === undefined
      ? (c.fin ? Date.parse(c.fin) : ahora) - Date.parse(c.inicio)
      : tiempoGuardado + tiempoEnCurso,
  );
};
const horasFacturables = (milisegundos: number) =>
  Math.max(0.5, Math.ceil(milisegundos / (30 * 60 * 1000)) * 0.5);
const importe = (c: Consumo, ahora: number) =>
  Math.round(
    c.precio *
      (c.porHora ? horasFacturables(duracion(c, ahora)) : c.cantidad) *
      100,
  ) / 100;
const reloj = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const campos = [
  ["temperatura", "Temperatura", "°C"],
  ["frecuenciaCardiaca", "Frec. cardíaca", "lpm"],
  ["frecuenciaRespiratoria", "Frec. respiratoria", "rpm"],
  ["presionSistolica", "Presión sistólica", "mmHg"],
  ["presionDiastolica", "Presión diastólica", "mmHg"],
  ["saturacion", "Saturación", "%"],
  ["glicemia", "Glicemia", "mg/dL"],
  ["peso", "Peso", "kg"],
 ] as const;
function GraficaEvolucionSignos({
  mediciones,
  camposGrafica = campos,
}: {
  mediciones: Cuenta["signos"];
  camposGrafica?: readonly (readonly [string, string, string])[];
}) {
  const [signosSeleccionados, setSignosSeleccionados] = useState<string[]>([]);
  const colores = [
    "#087fc0",
    "#f0783b",
    "#7655c5",
    "#18a17e",
    "#db7a51",
    "#0c9e88",
    "#9a6bc3",
    "#547e9b",
  ];
  const medicionesVisibles = mediciones.slice(-8);
  const series = camposGrafica.map(([id, nombre, unidad], indice) => {
    const valores = medicionesVisibles
      .map((medicion, posicion) => ({
        medicion,
        posicion,
        valor: Number(medicion.valores[id]),
      }))
      .filter((punto) => Number.isFinite(punto.valor));
    const minimo = valores.length
      ? Math.min(...valores.map((punto) => punto.valor!))
      : 0;
    const maximo = valores.length
      ? Math.max(...valores.map((punto) => punto.valor!))
      : 1;
    const margen = Math.max(
      (maximo - minimo) * 0.2,
      Math.abs(maximo || minimo) * 0.08,
      1,
    );
    const bajo = minimo - margen,
      alto = maximo + margen;
    return {
      id,
      nombre,
      unidad,
      color: colores[indice],
      valores,
      coords: valores.map((punto) => ({
        ...punto,
        x:
          medicionesVisibles.length === 1
            ? 415
            : 55 + punto.posicion * (720 / (medicionesVisibles.length - 1)),
        y: 30 + ((alto - punto.valor!) / (alto - bajo)) * 160,
      })),
    };
  });
  const alternarSigno = (id: string) =>
    setSignosSeleccionados((actual) =>
      actual.includes(id)
        ? actual.filter((signo) => signo !== id)
        : [...actual, id],
    );
  useEffect(() => {
    setSignosSeleccionados(camposGrafica.slice(0, 2).map(([id]) => id));
  }, [camposGrafica]);
  const seleccionados = series.filter((serie) =>
    signosSeleccionados.includes(serie.id),
  );
  return (
    <section
      className="em-signos-grafica"
      aria-label="Evolución de signos vitales"
    >
      <header>
        <div>
          <h4>Evolución de signos vitales</h4>
          <small>
            {mediciones.length
              ? `Últimas ${medicionesVisibles.length} mediciones registradas`
              : "Selecciona uno o más signos para compararlos."}
          </small>
        </div>
        <span>
          {seleccionados.length} signo{seleccionados.length === 1 ? "" : "s"}{" "}
          seleccionado{seleccionados.length === 1 ? "" : "s"}
        </span>
      </header>
      <nav
        className="em-signos-selector"
        aria-label="Seleccionar signos vitales"
      >
        {series.map((serie) => (
          <button
            type="button"
            key={serie.id}
            className={signosSeleccionados.includes(serie.id) ? "activo" : ""}
            onClick={() => alternarSigno(serie.id)}
            aria-pressed={signosSeleccionados.includes(serie.id)}
          >
            {serie.nombre}
          </button>
        ))}
      </nav>
      {medicionesVisibles.length &&
      seleccionados.some((serie) => serie.coords.length) ? (
        <>
          <svg
            viewBox="0 0 830 235"
            role="img"
            aria-label="Comparación de la evolución de los signos vitales seleccionados"
          >
            <g className="em-signos-grafica-guia">
              <path d="M55 30H775M55 83H775M55 136H775M55 190H775" />
            </g>
            {seleccionados.map(
              (serie) =>
                serie.coords.length > 0 && (
                  <g
                    className="em-signos-serie"
                    key={serie.id}
                    style={{ color: serie.color }}
                  >
                    <polyline
                      points={serie.coords
                        .map((punto) => `${punto.x},${punto.y}`)
                        .join(" ")}
                    />
                    {serie.coords.map((punto, indice) => (
                      <circle
                        key={`${serie.id}-${indice}`}
                        cx={punto.x}
                        cy={punto.y}
                        r="5"
                      >
                        <title>
                          {serie.nombre}: {punto.valor} {serie.unidad} ·{" "}
                          {fecha(punto.medicion.fecha)}
                        </title>
                      </circle>
                    ))}
                  </g>
                ),
            )}
            {medicionesVisibles.length > 0 && (
              <>
                <text
                  className="em-signos-grafica-hora"
                  x="55"
                  y="222"
                  textAnchor="start"
                >
                  {horaIngreso(medicionesVisibles[0].fecha)}
                </text>
                <text
                  className="em-signos-grafica-hora"
                  x="775"
                  y="222"
                  textAnchor="end"
                >
                  {horaIngreso(medicionesVisibles.at(-1)!.fecha)}
                </text>
              </>
            )}
          </svg>
          <p className="em-signos-grafica-nota">
            Cada signo se escala según sus propias mediciones; pasa sobre un
            punto para consultar su valor exacto.
          </p>
        </>
      ) : (
        <div className="em-signos-grafica-vacia">
          <Icon name="patient" size={23} />
          <strong>
            {mediciones.length
              ? "No hay datos para los signos seleccionados"
              : "Aún no hay mediciones"}
          </strong>
          <span>
            {mediciones.length
              ? "Elige otro signo para ver sus mediciones."
              : "Registra los signos vitales para iniciar la gráfica de evolución."}
          </span>
        </div>
      )}
      {mediciones.length > 0 && (
        <details className="em-signos-historial-inline">
          <summary>
            <Icon name="chevronRight" size={15} /> Ver mediciones registradas (
            {mediciones.length})
          </summary>
          <div className="em-mediciones">
            {[...mediciones].reverse().map((medicion) => (
              <details key={medicion.id}>
                <summary>
                  {fecha(medicion.fecha)} ·{" "}
                  {Object.entries(medicion.valores)
                    .map(
                      ([id, valor]) =>
                        `${campos.find((campo) => campo[0] === id)?.[1] || id}: ${valor}`,
                    )
                    .join(" · ") || "Medición no disponible"}
                </summary>
                <p>
                  {medicion.observacion || "Sin observaciones adicionales."}
                </p>
              </details>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const pedir = apiEmergencias;
const mismasCuentas = (actuales: Cuenta[], siguientes: Cuenta[]) =>
  actuales.length === siguientes.length &&
  actuales.every(
    (cuenta, indice) =>
      cuenta.id === siguientes[indice]?.id &&
      cuenta.revision === siguientes[indice]?.revision &&
      cuenta.fin === siguientes[indice]?.fin,
  );

function ModalCobro({
  cuenta,
  ahora,
  ocupado,
  onCerrar,
  onConfirmar,
}: {
  cuenta: Cuenta;
  ahora: number;
  ocupado: boolean;
  onCerrar: () => void;
  onConfirmar: (datos: {
    descuento: number;
    pagos: { metodo: string; monto: number; referencia: string }[];
    total: number;
  }) => void;
}) {
  const subtotal = cuenta.consumos.reduce(
    (s, consumo) => s + importe(consumo, ahora),
    0,
  );
  const [descuento, setDescuento] = useState("0"),
    [pagos, setPagos] = useState<PagoCobro[]>([]),
    [metodo, setMetodo] = useState("Efectivo"),
    [monto, setMonto] = useState(""),
    [referencia, setReferencia] = useState("");
  const descuentoAplicado = Math.min(
    subtotal,
    Math.max(0, Number(descuento) || 0),
  );
  const total = Math.max(0, subtotal - descuentoAplicado),
    pagado = pagos.reduce((s, pago) => s + (Number(pago.monto) || 0), 0),
    pendiente = Math.max(0, total - pagado),
    cambio = Math.max(0, pagado - total);
  const agregarPago = () => {
    if (
      (Number(monto) || 0) <= 0 ||
      (metodo !== "Efectivo" && !referencia.trim())
    )
      return;
    setPagos((actual) => [
      ...actual,
      { id: crypto.randomUUID(), metodo, monto, referencia: referencia.trim() },
    ]);
    setMonto("");
    setReferencia("");
  };
  return (
    <div
      className="em-modal-cobro-fondo"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <form
        className="em-modal-cobro em-modal-cobro-formal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="em-cobro-titulo"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!pendiente)
            onConfirmar({
              descuento: descuentoAplicado,
              pagos: pagos.map((pago) => ({
                metodo: pago.metodo,
                monto: Number(pago.monto),
                referencia: pago.referencia,
              })),
              total,
            });
        }}
      >
        <header>
          <div>
            <p>CIERRE DE ATENCIÓN</p>
            <h3 id="em-cobro-titulo">Cobro y liberación</h3>
            <div className="em-cobro-identidad">
              <span>{nombrePaciente(cuenta)}</span>
              <b>{nombreCubiculo(cuenta.cubiculo)}</b>
            </div>
          </div>
          <button type="button" aria-label="Cerrar cobro" onClick={onCerrar}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="em-cobro-columnas">
          <section className="em-cobro-consumos">
            <div className="em-cobro-seccion-titulo">
              <div>
                <span>CUENTA</span>
                <h4>Consumos</h4>
              </div>
              <b>{dinero(subtotal)}</b>
            </div>
            {cuenta.consumos.length ? (
              <div className="em-cobro-lista">
                {[...cuenta.consumos].reverse().map((consumo) => (
                  <article key={consumo.registroId}>
                    <div>
                      <strong>{consumo.nombre}</strong>
                      <small>
                        {consumo.porHora
                          ? `${dinero(consumo.precio)} / hora`
                          : `${consumo.cantidad} × ${dinero(consumo.precio)}`}
                      </small>
                    </div>
                    <b>{dinero(importe(consumo, ahora))}</b>
                  </article>
                ))}
              </div>
            ) : (
              <p className="em-cobro-vacio">Sin consumos registrados</p>
            )}
            <footer>
              <span>Total</span>
              <strong>{dinero(subtotal)}</strong>
            </footer>
          </section>
          <section className="em-cobro-datos">
            <div className="em-cobro-seccion-titulo">
              <div>
                <span>COBRO</span>
                <h4>Resumen de pago</h4>
              </div>
            </div>
            <div className="em-cobro-resumen">
              <span>
                Subtotal <b>{dinero(subtotal)}</b>
              </span>
              <label>
                Descuento
                <input
                  aria-label="Descuento"
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={descuento}
                  onChange={(evento) => setDescuento(evento.target.value)}
                />
              </label>
              <strong>
                Total <b>{dinero(total)}</b>
              </strong>
            </div>
            <section className="em-pago-mixto">
              <header>
                <div>
                  <strong>Medio de pago</strong>
                  <small>Registra uno o más pagos.</small>
                </div>
              </header>
              <div className="em-pago-agregar">
                <select
                  aria-label="Medio de pago"
                  value={metodo}
                  onChange={(evento) => setMetodo(evento.target.value)}
                >
                  <option>Efectivo</option>
                  <option>Tarjeta</option>
                  <option>Transferencia</option>
                  <option>Seguro / convenio</option>
                </select>
                <input
                  aria-label="Monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(evento) => setMonto(evento.target.value)}
                  placeholder="Monto"
                />
              </div>
              {metodo !== "Efectivo" && (
                <input
                  className="em-pago-referencia"
                  value={referencia}
                  onChange={(evento) => setReferencia(evento.target.value)}
                  placeholder="Referencia de pago"
                />
              )}
              <button
                className="em-agregar-metodo"
                type="button"
                onClick={agregarPago}
              >
                <Icon name="plus" size={15} /> Añadir pago
              </button>
              {pagos.length > 0 && (
                <div className="em-pagos-lista">
                  {pagos.map((pago) => (
                    <div key={pago.id}>
                      <span>
                        {pago.metodo}
                        <small>{pago.referencia}</small>
                      </span>
                      <b>{dinero(Number(pago.monto))}</b>
                      <button
                        type="button"
                        aria-label={`Quitar ${pago.metodo}`}
                        onClick={() =>
                          setPagos((actual) =>
                            actual.filter((item) => item.id !== pago.id),
                          )
                        }
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <footer>
                <span>
                  Pagado <b>{dinero(pagado)}</b>
                </span>
                <span>
                  Saldo{" "}
                  <b className={pendiente ? "em-saldo-pendiente" : ""}>
                    {dinero(pendiente)}
                  </b>
                </span>
                {cambio > 0 && (
                  <span>
                    Cambio <b>{dinero(cambio)}</b>
                  </span>
                )}
              </footer>
            </section>
          </section>
        </div>
        <footer className="em-cobro-acciones">
          <button type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="em-primario" disabled={ocupado || pendiente > 0}>
            <Icon name="check" size={16} /> Cobrar y liberar
          </button>
        </footer>
      </form>
    </div>
  );
}

export function TriajeEmergenciasView({
  recepcion = false,
  camposConfigurados,
}: {
  recepcion?: boolean;
  camposConfigurados?: SignoVitalConfig[];
}) {
  const catalogoServicios = useServiciosSignosVitales();
  const catalogoSignos = useCatalogoSignosVitales(
    camposConfigurados,
    signosVitalesIniciales,
  );
  const idsEmergencias = catalogoServicios.servicios.find(
    (servicio) => servicio.id === "emergencias",
  )?.signos;
  const camposEmergencia = useMemo(
    () =>
      idsEmergencias
        ? camposParaServicio(catalogoSignos.signos, idsEmergencias)
        : [],
    [catalogoSignos.signos, idsEmergencias],
  );
  const vitalesEmergencia = useMemo(
    () =>
      camposEmergencia
        .filter((campo) => campo.tipo !== "Texto")
        .map((campo) => [campo.id, campo.etiqueta, campo.unidad] as const),
    [camposEmergencia],
  );
  const [seccionClinica, setSeccionClinica] = useState<
    "paciente" | "ingreso" | "insumos" | "signos" | "examen" | "descargos"
  >("ingreso");
  const [cuentas, setCuentas] = useState<Cuenta[]>([]),
    [activa, setActiva] = useState("");
  const [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(""),
    [aviso, setAviso] = useState("");
  const usoTipo: RegistroEnfermeria["tipo"] = "cuidado";
  const [usoDetalle, setUsoDetalle] = useState(""),
    [usoCantidad, setUsoCantidad] = useState(""),
    [usoUnidad, setUsoUnidad] = useState(""),
    [usoObservacion, setUsoObservacion] = useState("");
  const [ahora, setAhora] = useState(Date.now()),
    desfase = useRef(0),
    ultimaLectura = useRef(0);
  const [cubiculo, setCubiculo] = useState(""),
    [nueva, setNueva] = useState(false),
    solicitud = useRef(crypto.randomUUID());
  const [ingresoFechaHora, setIngresoFechaHora] = useState(
    fechaHoraIngresoActual,
  );
  const [selectorCubiculoAbierto, setSelectorCubiculoAbierto] = useState(false);
  const [errorCubiculo, setErrorCubiculo] = useState("");
  const [datosIniciales, setDatosIniciales] = useState<Identidad>({});
  const [mostrarAcompanante, setMostrarAcompanante] = useState(false);
  const [busquedaCuenta, setBusquedaCuenta] = useState(""),
    [subvista, setSubvista] = useState<"atencion" | "historial">("atencion");
  const [modalExportarHistorial, setModalExportarHistorial] = useState(false);
  const [fechaDesdeHistorial, setFechaDesdeHistorial] = useState("");
  const [fechaHastaHistorial, setFechaHastaHistorial] = useState("");
  const [errorExportarHistorial, setErrorExportarHistorial] = useState("");
  const [pagina, setPagina] = useState(1);
  const [catalogo, setCatalogo] = useState<Item[]>([]),
    [errorCatalogo, setErrorCatalogo] = useState(""),
    [busqueda, setBusqueda] = useState("");
  const [itemId, setItemId] = useState(""),
    [cantidad, setCantidad] = useState("1"),
    [porHora, setPorHora] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({}),
    [observacion, setObservacion] = useState("");
  const [fechaHoraSignos, setFechaHoraSignos] = useState(fechaHoraIngresoActual);
  const [evolucion, setEvolucion] = useState("");
  const [evolucionEditando, setEvolucionEditando] = useState<string | null>(null);
  const [evolucionEnVista, setEvolucionEnVista] = useState<NonNullable<Cuenta["evaluaciones"]>[number] | null>(null);
  const [fechaHoraEvolucion, setFechaHoraEvolucion] = useState(
    fechaHoraIngresoActual,
  );
  const [identidad, setIdentidad] = useState<Identidad | null>(null),
    [revisionIdentidad, setRevisionIdentidad] = useState(0);
  const [cobroModal, setCobroModal] = useState(false),
    [metodoPago, setMetodoPago] = useState("Efectivo"),
    [montoRecibido, setMontoRecibido] = useState(""),
    [referenciaPago, setReferenciaPago] = useState("");
  const datosPacienteRef = useRef<HTMLElement>(null);
  const operacionActiva = useRef(false),
    intentoConsumo = useRef<{ clave: string; id: string } | null>(null);
  const cuenta = cuentas.find((c) => c.id === activa),
    item = catalogo.find((i) => i.id === itemId);
  useEffect(() => {
    if (!identidad || recepcion) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [identidad, recepcion]);
  async function cargar(): Promise<boolean> {
    if (operacionActiva.current) return true;
    const lectura = ++ultimaLectura.current;
    try {
      const datos = await pedir<{ cuentas: Cuenta[]; ahora: string }>();
      if (lectura !== ultimaLectura.current) return true;
      desfase.current = Date.parse(datos.ahora) - Date.now();
      setAhora(Date.now() + desfase.current);
      setCuentas((actuales) =>
        mismasCuentas(actuales, datos.cuentas) ? actuales : datos.cuentas,
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setCargando(false);
    }
  }
  async function cargarCatalogo() {
    try {
      setCatalogo(await pedir<Item[]>("/catalogo"));
      setErrorCatalogo("");
    } catch (e) {
      setErrorCatalogo((e as Error).message);
    }
  }
  useEffect(() => {
    let cancelado = false,
      temporizador = 0,
      erroresConsecutivos = 0;
    const programar = (demora: number) => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => void actualizar(), demora);
    };
    const actualizar = async () => {
      const correcto = await cargar();
      if (cancelado) return;
      erroresConsecutivos = correcto ? 0 : Math.min(erroresConsecutivos + 1, 3);
      programar(
        document.hidden
          ? 30_000
          : correcto
            ? 5_000
            : 5_000 * 2 ** erroresConsecutivos,
      );
    };
    const alCambiarVisibilidad = () => {
      if (!document.hidden) void actualizar();
    };
    void actualizar();
    if (!recepcion) void cargarCatalogo();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    const r = window.setInterval(() => {
      if (!document.hidden) setAhora(Date.now() + desfase.current);
    }, 1000);
    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
      clearInterval(r);
      ultimaLectura.current++;
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [recepcion]);
  useEffect(() => {
    if (cubiculo) setErrorCubiculo("");
  }, [cubiculo]);
  useEffect(() => {
    if (!nueva) return;
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setSelectorCubiculoAbierto(false);
        setNueva(false);
      }
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [nueva]);
  function seleccionar(id: string) {
    setActiva(id);
    setSeccionClinica("ingreso");
    setIdentidad(null);
    setValores({});
    setObservacion("");
    setItemId("");
    setAviso("");
    setError("");
  }
  function salirDeAtencion() {
    setActiva("");
    setSeccionClinica("ingreso");
    setIdentidad(null);
    setValores({});
    setObservacion("");
    setItemId("");
    setAviso("");
    setError("");
  }
  async function guardar(ruta: string, body: object, mensaje: string) {
    if (operacionActiva.current) return false;
    operacionActiva.current = true;
    if (ruta.endsWith("/consumos")) {
      const datos = body as Record<string, unknown>;
      const clave = JSON.stringify([
        ruta,
        datos.itemId,
        datos.precio,
        datos.cantidad,
        datos.porHora,
      ]);
      if (intentoConsumo.current?.clave !== clave)
        intentoConsumo.current = { clave, id: String(datos.registroId) };
      body = { ...datos, registroId: intentoConsumo.current.id };
    }
    setOcupado(true);
    setError("");
    setAviso("");
    ++ultimaLectura.current;
    try {
      const actualizada = await pedir<Cuenta>(ruta, body);
      ++ultimaLectura.current;
      intentoConsumo.current = null;
      setCuentas((prev) => [
        actualizada,
        ...prev.filter((c) => c.id !== actualizada.id),
      ]);
      setActiva(actualizada.id);
      setAviso(mensaje);
      if (ruta.endsWith("/identidad")) void sincronizarFicha(body as Identidad);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      operacionActiva.current = false;
      setOcupado(false);
    }
  }
  async function sincronizarFicha(datos: Identidad) {
    if (!datos.nombres?.trim() || !datos.documento?.trim()) return;
    try {
      await sincronizarPaciente(datos);
    } catch (e) {
      setError(
        `La atención fue guardada, pero no se pudo sincronizar la ficha general: ${(e as Error).message}`,
      );
    }
  }
  async function iniciar(e: FormEvent) {
    e.preventDefault();
    if (!cubiculo) {
      setErrorCubiculo("Selecciona un cubículo para iniciar la atención.");
      setSelectorCubiculoAbierto(true);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(".em-selector-cubiculo > button")
          ?.focus(),
      );
      return;
    }
    setErrorCubiculo("");
    const identidadInicial = Object.fromEntries(
      Object.entries(datosIniciales).filter(([, valor]) => valor.trim()),
    );
    if (
      await guardar(
        "",
        {
          cubiculo,
          identidad: Object.keys(identidadInicial).length
            ? identidadInicial
            : null,
          inicio: inicioEnIso(ingresoFechaHora.fecha, ingresoFechaHora.hora),
          solicitudId: solicitud.current,
        },
        "Atención iniciada. La cuenta ya está disponible en Recepción.",
      )
    ) {
      solicitud.current = crypto.randomUUID();
      setNueva(false);
      setCubiculo("");
      setSelectorCubiculoAbierto(false);
      setDatosIniciales({});
      setMostrarAcompanante(false);
      setSeccionClinica("ingreso");
      setIdentidad(null);
      setValores({});
      setObservacion("");
    }
  }
  async function registrarSignos(e: FormEvent) {
    e.preventDefault();
    if (!cuenta) return;
    if (
      await guardar(
        `/${cuenta.id}/signos`,
        {
          valores: Object.fromEntries(
            Object.entries(valores)
              .filter(([, v]) => v !== "")
              .map(([k, v]) => [k, v]),
          ),
          observacion,
          fecha: fechaHoraSignos.fecha,
          hora: fechaHoraSignos.hora,
        },
        "Signos vitales guardados.",
      )
    ) {
      setValores({});
      setObservacion("");
      setFechaHoraSignos(fechaHoraIngresoActual());
    }
  }
  async function registrarUsoEnfermeria(e: FormEvent) {
    e.preventDefault();
    if (!cuenta) return;
    const cantidad = usoCantidad.trim() ? Number(usoCantidad) : null;
    if (
      await guardar(
        `/${cuenta.id}/uso-enfermeria`,
        {
          tipo: usoTipo,
          detalle: usoDetalle.trim(),
          cantidad,
          unidad: usoUnidad.trim(),
          observacion: usoObservacion.trim(),
        },
        "Registro de enfermería guardado.",
      )
    ) {
      setUsoDetalle("");
      setUsoCantidad("");
      setUsoUnidad("");
      setUsoObservacion("");
    }
  }
  const serviciosPorHora = catalogo.filter(
    (item) =>
      /^(hora|horas|hr|hrs)$/i.test(item.unidad.trim()) ||
      /\bpor hora\b/i.test(item.unidad),
  );
  function iniciarServicioHora(item: Item) {
    if (!cuenta) return;
    const consumoPausado = [...cuenta.consumos]
      .reverse()
      .find(
        (consumo) =>
          consumo.itemId === item.id && consumo.porHora && consumo.fin,
      );
    void guardar(
      `/${cuenta.id}/consumos`,
      {
        item,
        itemId: item.id,
        precio: item.precio,
        cantidad: 1,
        porHora: true,
        registroId: consumoPausado?.registroId || crypto.randomUUID(),
      },
      `${item.nombre}: contador iniciado.`,
    );
  }
  function pausarServicioHora(registroId: string, nombre: string) {
    if (!cuenta) return;
    void guardar(
      `/${cuenta.id}/finalizar-consumo`,
      { registroId },
      `${nombre}: uso pausado y costo acumulado guardado.`,
    );
  }
  function abrirDatosPaciente() {
    if (!cuenta) return;
    setSeccionClinica("ingreso");
    const guardada = cuenta.identidad || {};
    const apellidos = (guardada.apellidos || "").trim().split(/\s+/).filter(Boolean);
    const sexo = guardada.sexo?.toLocaleLowerCase("es");
    setIdentidad({
      ...guardada,
      apellidoPaterno: guardada.apellidoPaterno || apellidos[0] || "",
      apellidoMaterno: guardada.apellidoMaterno || apellidos.slice(1).join(" "),
      sexo:
        sexo === "femenino" ? "Femenino" :
        sexo === "masculino" ? "Masculino" :
        sexo === "otro" ? "Otro" : guardada.sexo || "",
    });
    setRevisionIdentidad(cuenta.revision);
  }
  const visibles = cuentas.filter(
    (c) =>
      (recepcion || (subvista === "historial" ? Boolean(c.fin) : !c.fin)) &&
      normalizar(
        `${c.cubiculo} ${c.identidad?.nombres || ""} ${c.identidad?.apellidos || ""} ${c.identidad?.documento || ""}`,
      ).includes(normalizar(busquedaCuenta)),
  );
  const rangoHistorialValido = Boolean(
    fechaDesdeHistorial &&
      fechaHastaHistorial &&
      fechaDesdeHistorial <= fechaHastaHistorial,
  );
  const atencionesExportables = rangoHistorialValido
    ? cuentas.filter((item) => {
        if (!item.fin) return false;
        const fechaCierre = new Date(item.fin).getTime();
        const inicioRango = new Date(`${fechaDesdeHistorial}T00:00:00`).getTime();
        const finRango = new Date(`${fechaHastaHistorial}T23:59:59.999`).getTime();
        return fechaCierre >= inicioRango && fechaCierre <= finRango;
      })
    : [];
  const exportarHistorialPDF = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!rangoHistorialValido) return;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setErrorExportarHistorial(
        "El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.",
      );
      return;
    }
    const escapar = (valor: string) =>
      valor.replace(/[&<>\"']/g, (caracter) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[
          caracter
        ] || caracter,
      );
    const filas = atencionesExportables
      .map((item) => {
        const paciente = nombrePaciente(item);
        const documento = item.identidad?.documento || "Sin documento";
        const historia = item.identidad?.historiaClinica || "Sin registro";
        const edad = edadPaciente(item.identidad?.nacimiento);
        const sexo = item.identidad?.sexo || "No registrado";
        const medico = item.identidad?.medicoAdmision || "Médico de turno";
        const cierre = new Date(item.fin!).toLocaleString("es-BO");
        return `<tr><td>${escapar(nombreCubiculo(item.cubiculo))}</td><td><strong>${escapar(paciente)}</strong><small>CI ${escapar(documento)}</small></td><td>${escapar(historia)}</td><td>${escapar(edad)}</td><td>${escapar(sexo)}</td><td>${escapar(fecha(item.inicio))}</td><td>${escapar(cierre)}</td><td>${escapar(medico)}</td></tr>`;
      })
      .join("");
    const contenidoVacio = '<tr><td class="sin-datos" colspan="8">No hay atenciones finalizadas en el período seleccionado.</td></tr>';
    ventana.document.open();
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Historial de atención de emergencias</title><style>
      @page{size:landscape;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#173b59;margin:0}header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding-bottom:16px;border-bottom:2px solid #1686bd}h1{margin:0;font-size:21px;color:#12436a}header p{margin:6px 0 0;color:#647d91;font-size:11px}.periodo{text-align:right;color:#405f78;font-size:11px}table{width:100%;margin-top:18px;border-collapse:collapse;font-size:9px}th{padding:9px 7px;background:#eaf5fb;color:#24618a;text-align:left;text-transform:uppercase;font-size:8px;letter-spacing:.04em}td{padding:8px 7px;border-bottom:1px solid #dce8ef;vertical-align:top}td small{display:block;margin-top:3px;color:#698197}.sin-datos{text-align:center;padding:28px;color:#688096}.resumen{margin-top:12px;color:#647d91;font-size:10px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body><header><div><h1>Historial de atención · Emergencias</h1><p>Hospital María Esperanza · Registro de atenciones finalizadas</p></div><div class="periodo"><strong>Período seleccionado</strong><br>${escapar(fechaDesdeHistorial)} al ${escapar(fechaHastaHistorial)}</div></header><table><thead><tr><th>Cubículo</th><th>Paciente / documento</th><th>N.º HCL</th><th>Edad</th><th>Sexo</th><th>Hora de ingreso</th><th>Fecha de cierre</th><th>Médico de admisión</th></tr></thead><tbody>${filas || contenidoVacio}</tbody></table><p class="resumen">Atenciones incluidas: ${atencionesExportables.length}</p></body></html>`);
    ventana.document.close();
    window.setTimeout(() => {
      ventana.focus();
      ventana.print();
    }, 250);
    setModalExportarHistorial(false);
    setErrorExportarHistorial("");
  };
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / 25)),
    paginaActual = Math.min(pagina, totalPaginas),
    cuentasPagina = visibles.slice((paginaActual - 1) * 25, paginaActual * 25);
  const cubiculosDisponibles = cubiculosEmergencias.filter(
    (cubiculoDisponible) =>
      !cuentas.some(
        (cuentaActiva) =>
          !cuentaActiva.fin && cuentaActiva.cubiculo === cubiculoDisponible.id,
      ),
  );
  const total =
    cuenta?.consumos.reduce((s, c) => s + importe(c, ahora), 0) || 0;
  const recibido = Number(montoRecibido) || 0,
    cambioCobro = Math.max(0, recibido - total);
  function abrirCobro() {
    setCobroModal(true);
  }
  const cobroAbierto = false,
    setCobroAbierto = (_abierto: boolean) => {};
  const confirmarCobro = (event: FormEvent) => event.preventDefault();
  const evolucionesEnfermeria = (cuenta?.evaluaciones || []).filter(
    (evaluacionGuardada) => evaluacionGuardada.campos.evolucion?.trim(),
  );
  const eventosSuministracion = [
    ...(cuenta?.registrosEnfermeria || []).map((registro) => ({
      id: `enfermeria-${registro.id}`,
      fecha: registro.fecha,
      tipo: registro.tipo === "insumo" ? "Insumo" : registro.tipo === "procedimiento" ? "Procedimiento" : "Cuidado",
      detalle: registro.detalle,
      cantidad: registro.cantidad ? `${registro.cantidad} ${registro.unidad || ""}`.trim() : "",
      observacion: registro.observacion || "",
      estado: "Registrado",
    })),
    ...(cuenta?.consumos || []).map((consumo) => ({
      id: `consumo-${consumo.registroId}`,
      fecha: consumo.inicio,
      tipo: consumo.tipo === "servicio" ? "Servicio" : "Insumo",
      detalle: consumo.nombre,
      cantidad: consumo.porHora ? "Por hora" : `${consumo.cantidad} ${consumo.unidad}`,
      observacion: "",
      estado: consumo.porHora ? (consumo.fin ? "Finalizado" : "En curso") : "Aplicado",
    })),
  ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  return (
    <section className="emergencias-vista">
      {!recepcion && (
        <header
          className={`em-cabecera em-triaje-cabecera ${cuenta ? "em-cabecera-con-paciente" : ""}`}
        >
          {cuenta && (
            <button
              type="button"
              className="em-volver-listado"
              onClick={salirDeAtencion}
            >
              <Icon name="chevronLeft" size={17} /> Regresar
            </button>
          )}
          <div>
            {!cuenta && (
              <HorizontalSubvistaNav
                className="em-subvistas"
                ariaLabel="Vistas de triaje"
              >
                <button
                  type="button"
                  className={subvista === "atencion" ? "activo" : ""}
                  onClick={() => {
                    setSubvista("atencion");
                    setPagina(1);
                  }}
                >
                  <span>
                    <Icon name="patient" size={16} />
                  </span>
                  <strong>Atención emergencias</strong>
                </button>
                <button
                  type="button"
                  className={subvista === "historial" ? "activo" : ""}
                  onClick={() => {
                    setSubvista("historial");
                    setPagina(1);
                  }}
                >
                  <span>
                    <Icon name="fileText" size={16} />
                  </span>
                  <strong>Historial de atención</strong>
                </button>
              </HorizontalSubvistaNav>
            )}
          </div>
          {!cuenta && (
            <div className="em-triaje-cabecera-acciones">
              <button
                className="em-actualizar"
                type="button"
                onClick={() => void cargar()}
              >
                <Icon name="refresh" size={18} /> Actualizar
              </button>
              {subvista === "historial" && (
                <button
                  className="em-exportar-triaje"
                  type="button"
                  onClick={() => {
                    setFechaDesdeHistorial("");
                    setFechaHastaHistorial("");
                    setErrorExportarHistorial("");
                    setModalExportarHistorial(true);
                  }}
                >
                  <Icon name="fileText" size={18} /> Exportar en PDF
                </button>
              )}
              {subvista === "atencion" && (
                <button
                  className="em-primario"
                  type="button"
                  onClick={() => {
                    setIngresoFechaHora(fechaHoraIngresoActual());
                    setNueva(true);
                  }}
                >
                  <Icon name="plus" size={20} strokeWidth={2.3} /> Iniciar
                  atención
                </button>
              )}
            </div>
          )}
        </header>
      )}
      {modalExportarHistorial && (
        <div
          className="em-modal-inicio"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget)
              setModalExportarHistorial(false);
          }}
        >
          <form
            className="em-panel em-exportar-triaje-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="em-exportar-triaje-titulo"
            onSubmit={exportarHistorialPDF}
          >
            <header className="em-exportar-triaje-cabecera">
              <div>
                <span>REGISTRO DE ATENCIÓN</span>
                <h3 id="em-exportar-triaje-titulo">Exportar en PDF</h3>
                <p>Selecciona el período de las atenciones finalizadas que quieres incluir.</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => setModalExportarHistorial(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="em-exportar-triaje-periodo">
              <label>
                Desde
                <input
                  type="date"
                  required
                  value={fechaDesdeHistorial}
                  max={fechaHastaHistorial || undefined}
                  onChange={(evento) => setFechaDesdeHistorial(evento.target.value)}
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  required
                  value={fechaHastaHistorial}
                  min={fechaDesdeHistorial || undefined}
                  onChange={(evento) => setFechaHastaHistorial(evento.target.value)}
                />
              </label>
            </div>
            {rangoHistorialValido && (
              <p className="em-exportar-triaje-conteo" aria-live="polite">
                Se incluirán {atencionesExportables.length} atenciones finalizadas.
              </p>
            )}
            {errorExportarHistorial && (
              <p className="em-exportar-triaje-error" role="alert">{errorExportarHistorial}</p>
            )}
            <footer className="em-exportar-triaje-pie">
              <button type="button" onClick={() => setModalExportarHistorial(false)}>
                Cancelar
              </button>
              <button className="em-primario" type="submit" disabled={!rangoHistorialValido}>
                <Icon name="fileText" size={16} /> Exportar en PDF
              </button>
            </footer>
          </form>
        </div>
      )}
      {recepcion && (
        <header className="em-cabecera">
          <div>
            <p>RECEPCIÓN · CUENTAS</p>
            <h2>Cuentas de emergencias</h2>
            <small>
              Identifica al paciente y a su acompañante sin interrumpir la
              atención.
            </small>
          </div>
        </header>
      )}
      {cobroModal && cuenta && (
        <ModalCobro
          cuenta={cuenta}
          ahora={ahora}
          ocupado={ocupado}
          onCerrar={() => setCobroModal(false)}
          onConfirmar={async (pago) => {
            if (
              await guardar(
                `/${cuenta.id}/cierre`,
                { condicionEgreso: "vivo", causaEgreso: "hospitalaria", pago },
                "Cobro registrado y atención finalizada; cubículo disponible.",
              )
            )
              setCobroModal(false);
          }}
        />
      )}
      {aviso && <AvisoTemporal mensaje={aviso} />}
      {nueva && !recepcion && (
        <div
          className="em-modal-inicio"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setNueva(false);
          }}
        >
          <form
            className="em-panel em-inicio-atencion"
            role="dialog"
            aria-modal="true"
            aria-labelledby="em-inicio-titulo"
            onSubmit={iniciar}
          >
            <div className="em-inicio-cabecera">
              <div>
                <h3 id="em-inicio-titulo">Iniciar atención de emergencias</h3>
                <small>
                  El cubículo es obligatorio. Puedes registrar los datos que
                  conozcas o iniciar sin identificar al paciente.
                </small>
              </div>
              <button
                className="em-cerrar-modal"
                type="button"
                aria-label="Cerrar"
                onClick={() => setNueva(false)}
              >
                <Icon name="close" size={18} />
              </button>
              <div
                className="em-selector-cubiculo"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSelectorCubiculoAbierto(false);
                }}
              >
                <button
                  type="button"
                  disabled={ocupado || !cubiculosDisponibles.length}
                  className={cubiculo ? "seleccionado" : ""}
                  aria-label="Seleccionar cubículo de atención"
                  aria-haspopup="listbox"
                  aria-expanded={selectorCubiculoAbierto}
                  onClick={() =>
                    setSelectorCubiculoAbierto((abierto) => !abierto)
                  }
                >
                  {cubiculo
                    ? nombreCubiculo(cubiculo)
                    : cubiculosDisponibles.length
                      ? "Selecciona el cubículo de atención"
                      : "No hay cubículos libres"}
                  <Icon name="chevronDown" size={16} />
                </button>
                {selectorCubiculoAbierto && (
                  <div
                    className="em-opciones-cubiculo"
                    role="listbox"
                    aria-label="Cubículo de atención"
                  >
                    {cubiculosDisponibles.map((c) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={cubiculo === c.id}
                        key={c.id}
                        onClick={() => {
                          setCubiculo(c.id);
                          setSelectorCubiculoAbierto(false);
                          solicitud.current = crypto.randomUUID();
                        }}
                      >
                        {cubiculo === c.id && <Icon name="check" size={15} />}
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {!cubiculosDisponibles.length && (
              <p className="em-error em-error-cubiculo" role="alert">
                No hay cubículos libres. Finaliza, da de alta o traslada a un
                paciente para liberar un espacio.
              </p>
            )}
            {errorCubiculo && (
              <p className="em-error em-error-cubiculo" role="alert">
                {errorCubiculo}
              </p>
            )}
            {error && (
              <p className="em-error em-error-cubiculo" role="alert">
                {error}
              </p>
            )}
            <div className="em-fecha-hora-ingreso">
              <label>
                Fecha de atención
                <input
                  type="date"
                  required
                  value={ingresoFechaHora.fecha}
                  onChange={(e) =>
                    setIngresoFechaHora((actual) => ({
                      ...actual,
                      fecha: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Hora de atención
                <input
                  type="time"
                  required
                  value={ingresoFechaHora.hora}
                  onChange={(e) =>
                    setIngresoFechaHora((actual) => ({
                      ...actual,
                      hora: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <fieldset className="em-datos-iniciales" disabled={ocupado}>
              <legend>Paciente · opcional</legend>
              <PacienteIngresoEmergencia
                onSeleccionar={(p) =>
                  setDatosIniciales((actual) => ({
                    ...actual,
                    nombres: p?.nombres || "",
                    apellidos: p
                      ? [p.primerApellido, p.segundoApellido]
                          .filter(Boolean)
                          .join(" ")
                      : "",
                    documento: p?.numeroDocumento || "",
                    nacimiento: p?.fechaNacimiento || "",
                    sexo: p?.sexo || "",
                    telefono: p?.telefono || "",
                    direccion: p?.direccion || "",
                  }))
                }
              />
            </fieldset>
            <div className="em-acompanante-toggle">
              <button
                type="button"
                disabled={ocupado}
                aria-expanded={mostrarAcompanante}
                aria-controls="em-datos-acompanante"
                onClick={() => setMostrarAcompanante((abierto) => !abierto)}
              >
                <Icon
                  name={mostrarAcompanante ? "chevronDown" : "plus"}
                  size={16}
                />
                {mostrarAcompanante
                  ? "Ocultar datos del acompañante/responsable"
                  : "Registrar acompañante/responsable"}
              </button>
            </div>
            <fieldset
              id="em-datos-acompanante"
              className="em-datos-iniciales"
              hidden={!mostrarAcompanante}
              disabled={ocupado}
            >
              <legend>Datos del acompañante / responsable · opcionales</legend>
              <div className="em-form-grid">
                {[
                  ["familiar", "Nombre completo"],
                  ["parentesco", "Parentesco o relación"],
                  ["documentoFamiliar", "Documento de identidad"],
                  ["telefonoFamiliar", "Teléfono"],
                  ["referenciaFamiliar", "Número de referencia"],
                ].map(([k, titulo]) => (
                  <label key={k}>
                    {titulo}
                    <input
                      type={k === "telefonoFamiliar" ? "tel" : "text"}
                      maxLength={200}
                      value={datosIniciales[k] || ""}
                      onChange={(e) => {
                        setDatosIniciales((actual) => ({
                          ...actual,
                          [k]: e.target.value,
                        }));
                        solicitud.current = crypto.randomUUID();
                      }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="em-acciones">
              <button type="button" onClick={() => setNueva(false)}>
                Cancelar
              </button>
              <button className="em-primario" type="submit" disabled={ocupado}>
                {ocupado ? "Iniciando…" : "Iniciar y atender"}
              </button>
            </div>
          </form>
        </div>
      )}
      {cobroAbierto && cuenta && (
        <div
          className="em-modal-cobro-fondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setCobroAbierto(false);
          }}
        >
          <form
            className="em-modal-cobro"
            role="dialog"
            aria-modal="true"
            aria-labelledby="em-cobro-titulo"
            onSubmit={confirmarCobro}
          >
            <header>
              <div>
                <p>CIERRE DE ATENCIÓN</p>
                <h3 id="em-cobro-titulo">Liberar y cobrar</h3>
                <small>
                  {nombrePaciente(cuenta)} · {nombreCubiculo(cuenta.cubiculo)}
                </small>
              </div>
              <button
                type="button"
                aria-label="Cerrar cobro"
                onClick={() => setCobroAbierto(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="em-cobro-columnas">
              <section className="em-cobro-consumos">
                <div className="em-cobro-seccion-titulo">
                  <div>
                    <span>CUENTA DEL PACIENTE</span>
                    <h4>Consumos cargados</h4>
                  </div>
                  <b>{dinero(total)}</b>
                </div>
                {cuenta.consumos.length ? (
                  <div className="em-cobro-lista">
                    {[...cuenta.consumos].reverse().map((consumo) => (
                      <article key={consumo.registroId}>
                        <div>
                          <strong>{consumo.nombre}</strong>
                          <small>
                            {consumo.codigo} ·{" "}
                            {consumo.porHora
                              ? `${dinero(consumo.precio)} / hora`
                              : `${consumo.cantidad} × ${dinero(consumo.precio)}`}
                          </small>
                        </div>
                        <b>{dinero(importe(consumo, ahora))}</b>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="em-cobro-vacio">
                    No existen consumos registrados en esta cuenta.
                  </p>
                )}
                <footer>
                  <span>Total a cobrar</span>
                  <strong>{dinero(total)}</strong>
                </footer>
              </section>
              <section className="em-cobro-datos">
                <div className="em-cobro-seccion-titulo">
                  <div>
                    <span>DATOS DE COBRO</span>
                    <h4>Registrar pago</h4>
                  </div>
                </div>
                <label>
                  Método de pago
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option>Efectivo</option>
                    <option>Tarjeta</option>
                    <option>Transferencia</option>
                    <option>Seguro / convenio</option>
                  </select>
                </label>
                {metodoPago === "Efectivo" ? (
                  <label>
                    Monto recibido
                    <input
                      required
                      type="number"
                      min={total}
                      step="0.01"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                    />
                  </label>
                ) : (
                  <label>
                    Referencia de pago
                    <input
                      required
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      placeholder="Nro. de operación, autorización o convenio"
                    />
                  </label>
                )}
                <div className="em-cobro-totales">
                  <span>
                    Total de la cuenta <b>{dinero(total)}</b>
                  </span>
                  {metodoPago === "Efectivo" && (
                    <span>
                      Cambio <b>{dinero(cambioCobro)}</b>
                    </span>
                  )}
                </div>
                <p className="em-cobro-nota">
                  Al confirmar, se libera el cubículo y se conserva el detalle
                  de la cuenta.
                </p>
              </section>
            </div>
            <footer className="em-cobro-acciones">
              <button type="button" onClick={() => setCobroAbierto(false)}>
                Cancelar
              </button>
              <button
                className="em-primario"
                disabled={
                  ocupado ||
                  cuenta.consumos.some((c) => c.porHora && !c.fin) ||
                  (metodoPago === "Efectivo" && recibido < total)
                }
              >
                <Icon name="check" size={16} /> Confirmar cobro y liberar
              </button>
            </footer>
          </form>
        </div>
      )}
      <div
        className={`em-distribucion ${nueva && !recepcion ? "formulario-abierto" : ""} ${cuenta && !recepcion ? "atencion-activa" : ""}`}
      >
        {!cuenta && (
          <aside className="em-panel em-cubiculos">
            <label className="em-buscar">
              <Icon name="search" size={16} />
              <input
                aria-label="Buscar cuenta"
                placeholder="Cubículo, paciente o documento"
                value={busquedaCuenta}
                onChange={(e) => {
                  setBusquedaCuenta(e.target.value);
                  setPagina(1);
                }}
              />
            </label>
            {!recepcion && (
              <small className="em-subvista-ayuda">
                {subvista === "historial"
                  ? "Atenciones finalizadas"
                  : `${cuentas.filter((c) => !c.fin).length} atenciones activas`}
              </small>
            )}
            {recepcion && (
              <small>
                {cuentas.filter((c) => !c.fin).length} atenciones activas
              </small>
            )}
            {!recepcion && (
              <div className="em-lista-triaje-cabecera" role="row">
                <span>Cubículo</span>
                <span>Paciente</span>
                <span>N.º HCL</span>
                <span>Edad</span>
                <span>Sexo</span>
                <span>Hora ingreso</span>
                <span>Médico de admisión</span>
                <span>Acción</span>
              </div>
            )}
            {cuentasPagina.map((c) => (
              <button
                key={c.id}
                className={`em-cubiculo ${activa === c.id ? "seleccionado" : ""}`}
                onClick={() => seleccionar(c.id)}
              >
                <strong>{nombreCubiculo(c.cubiculo)}</strong>
                <span className="em-paciente-lista">{nombrePaciente(c)}</span>
                {!recepcion && (
                  <>
                    <span>
                      {c.identidad?.historiaClinica || "Sin registro"}
                    </span>
                    <span>{edadPaciente(c.identidad?.nacimiento)}</span>
                    <span>{c.identidad?.sexo || "No registrado"}</span>
                    <time>{horaIngreso(c.inicio)}</time>
                    <span>
                      {c.identidad?.medicoAdmision || "Médico de turno"}
                    </span>
                    <span className="em-accion-lista">Atender</span>
                  </>
                )}
                {recepcion && (
                  <>
                    <small>
                      {c.fin
                        ? "Atención finalizada"
                        : c.signos.length
                          ? "En atención"
                          : "Signos vitales pendientes"}{" "}
                      · {horaIngreso(c.inicio)}
                    </small>
                    <b>
                      {dinero(
                        c.consumos.reduce((s, i) => s + importe(i, ahora), 0),
                      )}
                    </b>
                  </>
                )}
              </button>
            ))}
            {!visibles.length && (
              <p className="em-vacio">
                {cargando
                  ? "Cargando cuentas…"
                  : subvista === "historial"
                    ? "Aún no hay atenciones finalizadas."
                    : "No hay cuentas para mostrar."}
              </p>
            )}
            {visibles.length > 25 && (
              <nav
                className="em-paginacion-lista"
                aria-label="Paginación de atenciones"
              >
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                >
                  <Icon name="chevronLeft" size={16} /> Anterior
                </button>
                <span>
                  Página {paginaActual} de {totalPaginas} · {visibles.length}{" "}
                  atenciones
                </span>
                <button
                  type="button"
                  disabled={paginaActual === totalPaginas}
                  onClick={() =>
                    setPagina((actual) => Math.min(totalPaginas, actual + 1))
                  }
                >
                  Siguiente <Icon name="chevronRight" size={16} />
                </button>
              </nav>
            )}
          </aside>
        )}
        <main className="em-trabajo">
          {!cuenta ? (
            recepcion ? (
              <div className="em-panel em-vacio">
                <Icon name="patient" size={32} />
                <h3>Selecciona una cuenta</h3>
                <p>Las cuentas creadas en triaje aparecerán aquí.</p>
              </div>
            ) : null
          ) : (
            <>
              <div className="em-panel em-resumen">
                <div className="em-resumen-identidad">
                  <div className="em-identidad-fila">
                    <div>
                      <small>Paciente</small>
                      <strong>{nombrePaciente(cuenta)}</strong>
                    </div>
                    <div>
                      <small>Edad</small>
                      <strong>
                        {edadPaciente(cuenta.identidad?.nacimiento)}
                      </strong>
                    </div>
                    <div>
                      <small>Sexo</small>
                      <strong>
                        {cuenta.identidad?.sexo || "No registrado"}
                      </strong>
                    </div>
                  </div>
                  <div className="em-identidad-fila em-identidad-fila-familiar">
                    <div>
                      <small>Familiar o responsable</small>
                      <strong>
                        {cuenta.identidad?.familiar || "Sin registro"}
                      </strong>
                    </div>
                    <div>
                      <small>Número de referencia</small>
                      <strong>
                        {cuenta.identidad?.referenciaFamiliar || "Sin registro"}
                      </strong>
                    </div>
                  </div>
                  <div className="em-identidad-fila em-cuenta-indicadores">
                    <div>
                      <small>Cubículo</small>
                      <strong>{nombreCubiculo(cuenta.cubiculo)}</strong>
                    </div>
                    <div>
                      <small>Hora de ingreso</small>
                      <strong>{horaIngreso(cuenta.inicio)}</strong>
                    </div>
                  </div>
                </div>
                <div className="em-total-acciones">
                  <div className="em-total-consumido">
                    <small>Total consumido</small>
                    <strong>{dinero(total)}</strong>
                  </div>
                  {!recepcion && !cuenta.fin && (
                    <button
                      className="em-liberar-cobrar"
                      type="button"
                      disabled={cuenta.consumos.some(
                        (c) => c.porHora && !c.fin,
                      )}
                      onClick={abrirCobro}
                    >
                      <Icon name="cash" size={15} /> Liberar y cobrar
                    </button>
                  )}
                  {!cuenta.fin && !identidad && (
                    <button
                      className="em-identidad-boton em-resumen-editar"
                      type="button"
                      onClick={abrirDatosPaciente}
                    >
                      <Icon name="edit" size={15} /> Editar datos
                    </button>
                  )}
                </div>
              </div>
              {!recepcion && (
                <>
                  <div
                    className="em-descargos-indicaciones"
                    hidden={seccionClinica !== "descargos"}
                  >
                    {!cuenta.signos.length && (
                      <p className="em-pendiente">
                        Registra primero los signos vitales en «Atención
                        paciente» para poder aplicar indicaciones.
                      </p>
                    )}
                    <OrdenesEmergencias
                      key={cuenta.id}
                      cuenta={cuenta}
                      catalogo={catalogo}
                      guardar={guardar}
                      ocupado={ocupado}
                      enfermeria
                    />
                  </div>
                </>
              )}
              {(recepcion || identidad || seccionClinica === "ingreso") && (
                <div
                  className={identidad && !recepcion ? "em-identidad-modal-fondo" : "em-identidad-enlinea"}
                  onMouseDown={(evento) => {
                    if (evento.target === evento.currentTarget) setIdentidad(null);
                  }}
                  onKeyDown={(evento) => {
                    if (evento.key === "Escape" && identidad && !recepcion)
                      setIdentidad(null);
                  }}
                >
                <section
                  ref={datosPacienteRef}
                  className={`em-panel em-identidad-panel ${!cuenta.identidad ? "pendiente" : ""} ${identidad && !recepcion ? "em-identidad-panel-modal" : ""}`}
                  role={identidad && !recepcion ? "dialog" : undefined}
                  aria-modal={identidad && !recepcion ? true : undefined}
                  aria-label={identidad && !recepcion ? "Editar datos del paciente" : undefined}
                >
                  <header className="em-panel-titulo">
                    <div className="em-identidad-titulo">
                      <span>
                        <Icon name="patient" size={18} />
                      </span>
                      <div>
                        <small>IDENTIFICACIÓN DE LA CUENTA</small>
                        <h3>
                          {identidad && !recepcion
                            ? "Editar datos del paciente"
                            : "Datos del paciente y acompañante"}
                        </h3>
                      </div>
                    </div>
                    {identidad && !recepcion && (
                      <button
                        type="button"
                        className="em-identidad-modal-cerrar"
                        aria-label="Cerrar edición de datos"
                        onClick={() => setIdentidad(null)}
                      >
                        <Icon name="close" size={19} />
                      </button>
                    )}
                  </header>
                  {identidad && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const apellidos = [
                          identidad.apellidoPaterno || "",
                          identidad.apellidoMaterno || "",
                        ].filter(Boolean).join(" ");
                        if (
                          await guardar(
                            `/${cuenta.id}/identidad`,
                            { ...identidad, apellidos, revision: revisionIdentidad },
                            "Datos guardados en la cuenta.",
                          )
                        )
                          setIdentidad(null);
                      }}
                    >
                      <PacienteIngresoEmergencia
                        onSeleccionar={(p) => {
                          if (p)
                            setIdentidad((actual) =>
                              actual
                                ? {
                                    ...actual,
                                    nombres: p.nombres,
                                    apellidoPaterno: p.primerApellido,
                                    apellidoMaterno: p.segundoApellido,
                                    apellidos: [
                                      p.primerApellido,
                                      p.segundoApellido,
                                    ]
                                      .filter(Boolean)
                                      .join(" "),
                                    documento: p.numeroDocumento,
                                    complemento: p.complementoCi || "",
                                    expedidoEn: p.expedidoEn || "",
                                    ciConQr: String(Boolean(p.ciConQr)),
                                    nit: p.nit || "",
                                    razonSocial: p.razonSocial || "",
                                    nacimiento: p.fechaNacimiento,
                                    sexo:
                                      p.sexo === "femenino" ? "Femenino" :
                                      p.sexo === "masculino" ? "Masculino" :
                                      p.sexo === "otro" ? "Otro" : p.sexo,
                                    telefono: p.telefono,
                                    pais: p.pais || "Bolivia",
                                    departamento: p.departamento || "",
                                    ciudad: p.ciudad || "",
                                    zonaBarrio: p.zonaBarrio || "",
                                    direccion: p.direccion,
                                    familiar: p.responsableNombre || "",
                                    documentoFamiliar: p.responsableCi || "",
                                    telefonoFamiliar: p.responsableTelefono || "",
                                    parentesco: p.responsableParentesco || "",
                                  }
                                : actual,
                            );
                        }}
                      />
                      {[
                        {
                          titulo: "Datos del paciente",
                          campos: [
                            ["nombres", "Nombres"],
                            ["apellidoPaterno", "Apellido paterno"],
                            ["apellidoMaterno", "Apellido materno"],
                            ["documento", "CI / documento"],
                            ["complemento", "Complemento"],
                            ["expedidoEn", "Expedido en"],
                            ["nit", "NIT"],
                            ["razonSocial", "Razón social"],
                            ["nacimiento", "Fecha de nacimiento"],
                            ["telefono", "Teléfono"],
                            ["sexo", "Género"],
                          ],
                        },
                        {
                          titulo: "Domicilio",
                          campos: [
                            ["pais", "País"],
                            ["departamento", "Departamento"],
                            ["ciudad", "Ciudad"],
                            ["zonaBarrio", "Zona / barrio"],
                            ["direccion", "Dirección"],
                          ],
                        },
                        {
                          titulo: "Familiar o responsable",
                          campos: [
                            ["familiar", "Nombre completo"],
                            ["documentoFamiliar", "CI del responsable"],
                            ["telefonoFamiliar", "Teléfono del responsable"],
                            ["parentesco", "Parentesco"],
                            ["referenciaFamiliar", "Número de referencia"],
                          ],
                        },
                        {
                          titulo: "Información adicional",
                          campos: [
                            ["comoSeEntero", "¿Cómo se enteró del servicio?"],
                            ["observaciones", "Observaciones"],
                          ],
                        },
                      ].map((grupo) => (
                        <fieldset className="em-identidad-grupo" key={grupo.titulo}>
                          <legend>{grupo.titulo}</legend>
                          <div className="em-identidad-form-grid">
                            {grupo.campos.map(([k, titulo]) => (
                              <label
                                className={k === "direccion" || k === "observaciones" ? "em-identidad-campo-amplio" : ""}
                                key={k}
                              >
                                {titulo}
                                {k === "sexo" ? (
                                  <select
                                    value={identidad[k] || ""}
                                    onChange={(e) => setIdentidad({ ...identidad, [k]: e.target.value })}
                                  >
                                    <option value="">Seleccionar</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Otro">Otro</option>
                                  </select>
                                ) : k === "observaciones" ? (
                                  <textarea
                                    rows={3}
                                    maxLength={500}
                                    value={identidad[k] || ""}
                                    onChange={(e) => setIdentidad({ ...identidad, [k]: e.target.value })}
                                  />
                                ) : (
                                  <input
                                    type={k === "nacimiento" ? "date" : "text"}
                                    maxLength={200}
                                    value={identidad[k] || ""}
                                    onChange={(e) => setIdentidad({ ...identidad, [k]: e.target.value })}
                                  />
                                )}
                              </label>
                            ))}
                            {grupo.titulo === "Datos del paciente" && (
                              <label className="em-identidad-qr">
                                <input
                                  type="checkbox"
                                  checked={identidad.ciConQr === "true"}
                                  onChange={(e) => setIdentidad({ ...identidad, ciConQr: String(e.target.checked) })}
                                />
                                CI con QR
                              </label>
                            )}
                          </div>
                        </fieldset>
                      ))}
                      <div className="em-acciones em-identidad-acciones">
                        <button
                          type="button"
                          onClick={() => setIdentidad(null)}
                        >
                          Cancelar
                        </button>
                        <button className="em-primario" disabled={ocupado}>
                          Guardar datos
                        </button>
                      </div>
                    </form>
                  )}
                  {!identidad &&
                    (cuenta.identidad ? (
                      <div className="em-identidad-registrada">
                        <Icon name="check" size={17} />
                        <p>
                          <strong>Identificación registrada</strong>
                          <span>
                            Documento:{" "}
                            {cuenta.identidad.documento || "No registrado"} ·
                            Familiar:{" "}
                            {cuenta.identidad.familiar || "Sin registro"} ·
                            Referencia:{" "}
                            {cuenta.identidad.referenciaFamiliar ||
                              "Sin registro"}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="em-identidad-vacia">
                        <span>
                          <Icon name="patient" size={22} />
                        </span>
                        <p>
                          <strong>Paciente pendiente de identificar</strong>
                          <small>
                            Completa sus datos cuando estén disponibles. La
                            cuenta y todos sus consumos se conservarán.
                          </small>
                        </p>
                      </div>
                    ))}
                </section>
                </div>
              )}
              {!recepcion && (
                <section className="em-atencion-clinica">
                  <nav
                    className="em-paginacion-clinica"
                    aria-label="Registro de atención de emergencia"
                  >
                    <button
                      type="button"
                      className={seccionClinica === "ingreso" ? "activo" : ""}
                      aria-current={seccionClinica === "ingreso" ? "page" : undefined}
                      onClick={() => setSeccionClinica("ingreso")}
                    >
                      Ingreso del paciente
                    </button>
                    <button
                      type="button"
                      className={seccionClinica === "paciente" ? "activo" : ""}
                      aria-current={
                        seccionClinica === "paciente" ? "page" : undefined
                      }
                      onClick={() => setSeccionClinica("paciente")}
                    >
                      Atención del paciente
                    </button>
                    <button
                      type="button"
                      className={seccionClinica === "insumos" ? "activo" : ""}
                      aria-current={seccionClinica === "insumos" ? "page" : undefined}
                      onClick={() => setSeccionClinica("insumos")}
                    >
                      Insumos del paciente
                    </button>
                  </nav>
                  {seccionClinica === "ingreso" && (
                    <section className="em-panel em-signos-panel">
                      <header className="em-panel-titulo">
                        <h3>Signos vitales</h3>
                      </header>
                      <div className="em-signos-columnas">
                        <GraficaEvolucionSignos
                          mediciones={cuenta.signos}
                          camposGrafica={vitalesEmergencia}
                        />
                        {!cuenta.fin && (
                            <form
                              className="em-signos-formulario"
                              onSubmit={registrarSignos}
                            >
                              <h4>Registrar signos vitales</h4>
                              <div className="em-signos-fecha-hora">
                                <label>
                                  Fecha de la medición
                                  <input
                                    type="date"
                                    required
                                    value={fechaHoraSignos.fecha}
                                    onChange={(evento) =>
                                      setFechaHoraSignos({ ...fechaHoraSignos, fecha: evento.target.value })
                                    }
                                  />
                                </label>
                                <label>
                                  Hora de la medición
                                  <input
                                    type="time"
                                    required
                                    value={fechaHoraSignos.hora}
                                    onChange={(evento) =>
                                      setFechaHoraSignos({ ...fechaHoraSignos, hora: evento.target.value })
                                    }
                                  />
                                </label>
                              </div>
                              <div className="em-form-grid em-signos">
                                {camposEmergencia.map(
                                  ({ id, etiqueta, unidad, tipo }) => (
                                  <label key={id}>
                                    {etiqueta}
                                    <span>
                                      <input
                                        type={tipo === "Texto" ? "text" : "number"}
                                        step={tipo === "Número entero" ? "1" : "any"}
                                        value={valores[id] || ""}
                                        onChange={(e) =>
                                          setValores({
                                            ...valores,
                                            [id]: e.target.value,
                                          })
                                        }
                                      />
                                      {unidad}
                                    </span>
                                  </label>
                                  ),
                                )}
                                {(catalogoSignos.cargando ||
                                  catalogoServicios.cargando) && (
                                  <p role="status">
                                    Cargando los signos configurados para Emergencias…
                                  </p>
                                )}
                                {(catalogoSignos.error ||
                                  catalogoServicios.error) && (
                                  <p role="alert">
                                    {catalogoSignos.error ||
                                      catalogoServicios.error}
                                  </p>
                                )}
                                {!catalogoSignos.cargando &&
                                  !catalogoServicios.cargando &&
                                  !camposEmergencia.length && (
                                    <p role="status">
                                      No hay signos vitales asignados al servicio de Emergencias.
                                    </p>
                                  )}
                              </div>
                              <label>
                                Observación o motivo de medición no disponible
                                <textarea
                                  value={observacion}
                                  maxLength={1000}
                                  onChange={(e) =>
                                    setObservacion(e.target.value)
                                  }
                                />
                              </label>
                              <div className="em-acciones">
                                <button
                                  className="em-primario"
                                  disabled={
                                    ocupado ||
                                    catalogoSignos.cargando ||
                                    catalogoServicios.cargando ||
                                    !!catalogoSignos.error ||
                                    !!catalogoServicios.error ||
                                    !camposEmergencia.length
                                  }
                                >
                                  Guardar signos vitales
                                </button>
                              </div>
                            </form>
                          )}
                      </div>
                    </section>
                  )}
                  {seccionClinica === "paciente" && (
                    <>
                    <section className="em-panel em-evolucion-panel">
                      <div className="em-evolucion-layout">
                        {!cuenta.fin && (
                          <form
                            className="em-evolucion-form"
                            onSubmit={async (evento) => {
                              evento.preventDefault();
                              const texto = evolucion.trim();
                              if (!texto) return;
                              const rutaEvolucion = evolucionEditando
                                ? `/${cuenta.id}/evaluacion/${encodeURIComponent(evolucionEditando)}/editar`
                                : `/${cuenta.id}/evaluacion`;
                              if (
                                await guardar(
                                  rutaEvolucion,
                                  {
                                    revision: cuenta.revision,
                                    campos: {
                                      evolucion: texto,
                                      evolucionFecha: fechaHoraEvolucion.fecha,
                                      evolucionHora: fechaHoraEvolucion.hora,
                                    },
                                  },
                                  evolucionEditando ? "Evolución actualizada." : "Evolución guardada.",
                                )
                              ) {
                                setEvolucion("");
                                setEvolucionEditando(null);
                                setFechaHoraEvolucion(fechaHoraIngresoActual());
                              }
                            }}
                          >
                            <div className="em-evolucion-campo-texto">
                              <label htmlFor="em-evolucion-texto">
                                Evolución de enfermería
                              </label>
                              <textarea
                                id="em-evolucion-texto"
                                value={evolucion}
                                maxLength={5000}
                                rows={5}
                                placeholder="Escribe aquí la evolución de enfermería del paciente."
                                onChange={(evento) =>
                                  setEvolucion(evento.target.value)
                                }
                                required
                              />
                            </div>
                            <div className="em-evolucion-lateral">
                              <label>
                                Fecha de la evolución
                                <input
                                  type="date"
                                  value={fechaHoraEvolucion.fecha}
                                  required
                                  onChange={(evento) =>
                                    setFechaHoraEvolucion((actual) => ({
                                      ...actual,
                                      fecha: evento.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Hora de la evolución
                                <input
                                  type="time"
                                  value={fechaHoraEvolucion.hora}
                                  required
                                  onChange={(evento) =>
                                    setFechaHoraEvolucion((actual) => ({
                                      ...actual,
                                      hora: evento.target.value,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className="em-evolucion-acciones">
                              <button
                                className="em-primario"
                                type="submit"
                                disabled={ocupado || !evolucion.trim()}
                              >
                                {evolucionEditando ? "Actualizar evolución" : "Guardar evolución"}
                              </button>
                              {evolucionEditando && <button type="button" className="em-evolucion-cancelar" onClick={() => { setEvolucionEditando(null); setEvolucion(""); setFechaHoraEvolucion(fechaHoraIngresoActual()); }}>Cancelar edición</button>}
                            </div>
                          </form>
                        )}
                        <aside
                          className="em-evolucion-historial"
                          aria-label="Historial de anotaciones de enfermería"
                        >
                          <header>
                            <div>
                              <h3>Historial de anotaciones</h3>
                              <small>
                                Evoluciones registradas durante esta atención
                              </small>
                            </div>
                            <span>{evolucionesEnfermeria.length}</span>
                          </header>
                          {evolucionesEnfermeria.length ? (
                            <div className="em-evolucion-lista">
                              {evolucionesEnfermeria
                                .slice()
                                .reverse()
                                .map((evaluacionGuardada) => {
                                  const fechaGuardada =
                                    evaluacionGuardada.campos.evolucionFecha;
                                  const horaGuardada =
                                    evaluacionGuardada.campos.evolucionHora;
                                  const fechaVisible = fechaGuardada
                                    ? new Date(
                                        `${fechaGuardada}T12:00:00`,
                                      ).toLocaleDateString("es-BO")
                                    : fecha(evaluacionGuardada.fecha);
                                  return (
                                    <article
                                      key={
                                        evaluacionGuardada.id ??
                                        evaluacionGuardada.fecha
                                      }
                                    >
                                      <small>
                                        {fechaVisible}
                                        {horaGuardada
                                          ? ` · ${horaGuardada}`
                                          : ""}
                                      </small>
                                      <p>
                                        {evaluacionGuardada.campos.evolucion}
                                      </p>
                                      <div className="em-evolucion-item-acciones">
                                        <button type="button" onClick={() => setEvolucionEnVista(evaluacionGuardada)}>Ver</button>
                                        {!cuenta.fin && <button type="button" onClick={() => {
                                          if (!evaluacionGuardada.id) return;
                                          setEvolucionEditando(evaluacionGuardada.id);
                                          setEvolucion(evaluacionGuardada.campos.evolucion || "");
                                          setFechaHoraEvolucion({
                                            fecha: evaluacionGuardada.campos.evolucionFecha || new Date(evaluacionGuardada.fecha).toISOString().slice(0, 10),
                                            hora: evaluacionGuardada.campos.evolucionHora || new Date(evaluacionGuardada.fecha).toTimeString().slice(0, 5),
                                          });
                                          requestAnimationFrame(() => document.getElementById("em-evolucion-texto")?.focus());
                                        }}>Editar</button>}
                                      </div>
                                    </article>
                                  );
                                })}
                            </div>
                          ) : (
                            <p className="em-evolucion-vacia">
                              Todavía no hay anotaciones para esta atención.
                            </p>
                          )}
                          {evolucionEnVista && <div className="em-evolucion-modal-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setEvolucionEnVista(null); }}>
                            <section className="em-evolucion-modal" role="dialog" aria-modal="true" aria-labelledby="em-evolucion-modal-titulo">
                              <header><div><small>REGISTRO DE ENFERMERÍA</small><h3 id="em-evolucion-modal-titulo">Detalle de la evolución</h3></div><button type="button" aria-label="Cerrar" onClick={() => setEvolucionEnVista(null)}>×</button></header>
                              <p>{evolucionEnVista.campos.evolucion}</p>
                              <small>{evolucionEnVista.campos.evolucionFecha ? new Date(`${evolucionEnVista.campos.evolucionFecha}T12:00:00`).toLocaleDateString("es-BO") : fecha(evolucionEnVista.fecha)}{evolucionEnVista.campos.evolucionHora ? ` · ${evolucionEnVista.campos.evolucionHora}` : ""}{evolucionEnVista.usuario ? ` · ${evolucionEnVista.usuario}` : ""}</small>
                              {evolucionEnVista.editadoEn && <small className="em-evolucion-editada">Editada el {fecha(evolucionEnVista.editadoEn)}{evolucionEnVista.editadoPor ? ` · ${evolucionEnVista.editadoPor}` : ""}</small>}
                            </section>
                          </div>}
                        </aside>
                      </div>
                    </section>
                    <div className="em-seguimiento-enfermeria">
                      <OrdenesEmergencias
                        key={`indicaciones-${cuenta.id}`}
                        cuenta={cuenta}
                        catalogo={catalogo}
                        guardar={guardar}
                        ocupado={ocupado}
                        enfermeria
                      />
                    </div>
                    </>
                  )}
                  {seccionClinica === "insumos" && (
<section className="em-panel em-suministracion-panel">
                        <header className="em-panel-titulo">
                          <div>
                            <h3>Suministración al paciente</h3>
                            <small>Registra los cuidados, procedimientos e insumos utilizados durante esta atención.</small>
                          </div>
                          <b>{eventosSuministracion.length} registros</b>
                        </header>
                        {!cuenta.fin && <form className="em-suministracion-form" onSubmit={registrarUsoEnfermeria}>
                          <label className="em-suministracion-detalle">Detalle utilizado
                            <input required maxLength={500} value={usoDetalle} onChange={(evento) => setUsoDetalle(evento.target.value)} placeholder="Medicamento, insumo o cuidado realizado" />
                          </label>
                          <label>Cantidad
                            <input type="number" min="0.001" step="any" value={usoCantidad} onChange={(evento) => setUsoCantidad(evento.target.value)} placeholder="Opcional" />
                          </label>
                          <label>Unidad
                            <input maxLength={80} value={usoUnidad} onChange={(evento) => setUsoUnidad(evento.target.value)} placeholder="Ej. ml, unidad" />
                          </label>
                          <label className="em-suministracion-detalle">Observación
                            <input maxLength={1000} value={usoObservacion} onChange={(evento) => setUsoObservacion(evento.target.value)} placeholder="Nota opcional" />
                          </label>
                          <button className="em-primario" type="submit" disabled={ocupado || !usoDetalle.trim()}>Registrar suministración</button>
                        </form>}
                        <div className="em-suministracion-lista" aria-label="Historial de suministración">
                          {eventosSuministracion.length ? eventosSuministracion.map((evento) => <article key={evento.id}>
                            <div><small>{evento.tipo} · {fecha(evento.fecha)}</small><strong>{evento.detalle}</strong>{evento.observacion && <p>{evento.observacion}</p>}</div>
                            <span>{evento.cantidad || evento.estado}</span>
                          </article>) : <p className="em-vacio">Todavía no hay suministraciones registradas.</p>}
                        </div>
                      </section>
                  )}
                  {seccionClinica === "examen" && (
                    <section className="em-panel em-examen-regional">
                      <header className="em-panel-titulo">
                        <div>
                          <h3>Examen físico regional</h3>
                          <small>
                            Registro clínico por regiones anatómicas.
                          </small>
                        </div>
                      </header>
                      <div className="em-vacio">
                        <Icon name="patient" size={28} />
                        <p>
                          El examen físico regional se habilitará en este
                          apartado.
                        </p>
                      </div>
                    </section>
                  )}
                </section>
              )}
              <div
                className="em-descargos-consumo"
                hidden={!recepcion && seccionClinica !== "descargos"}
              >
                {!recepcion && !cuenta.fin && (
                  <section
                    className="em-panel"
                    hidden={seccionClinica !== "descargos"}
                  >
                    <header className="em-panel-titulo">
                      <h3>Registrar consumo</h3>
                      <small>Catálogo de Contabilidad</small>
                    </header>
                    {!cuenta.signos.length && (
                      <p className="em-pendiente">
                        Guarda la valoración inicial para registrar consumos.
                      </p>
                    )}
                    {errorCatalogo && (
                      <p className="em-error">{errorCatalogo}</p>
                    )}
                    <div className="em-buscador-catalogo">
                      <label className="em-buscar">
                        <Icon name="search" size={16} />
                        <input
                          placeholder="Buscar servicio, producto o insumo…"
                          aria-label="Buscar consumo"
                          value={busqueda}
                          onChange={(e) => {
                            setBusqueda(e.target.value);
                            setItemId("");
                          }}
                        />
                      </label>
                      <button onClick={() => void cargarCatalogo()}>
                        Actualizar catálogo
                      </button>
                    </div>
                    {!catalogo.length && !errorCatalogo && (
                      <p>
                        No hay ítems activos con precio aprobado. Regístralos en
                        el catálogo de Contabilidad.
                      </p>
                    )}
                    {busqueda && !item && (
                      <div className="em-resultados">
                        {catalogo
                          .filter((i) =>
                            normalizar(`${i.nombre} ${i.codigo}`).includes(
                              normalizar(busqueda),
                            ),
                          )
                          .slice(0, 30)
                          .map((i) => (
                            <button
                              key={i.id}
                              onClick={() => {
                                setItemId(i.id);
                                setPorHora(
                                  i.tipo === "servicio" &&
                                    ["TIEMPO", "HORA", "HORAS"].includes(
                                      i.unidad.toUpperCase(),
                                    ),
                                );
                                setCantidad("1");
                              }}
                            >
                              <span>
                                <strong>{i.nombre}</strong>
                                <small>
                                  {i.codigo} ·{" "}
                                  {i.tipo === "servicio"
                                    ? "Servicio"
                                    : "Producto / insumo"}{" "}
                                  · {i.unidad}
                                </small>
                              </span>
                              <b>{dinero(i.precio)}</b>
                            </button>
                          ))}
                        {!catalogo.some((i) =>
                          normalizar(`${i.nombre} ${i.codigo}`).includes(
                            normalizar(busqueda),
                          ),
                        ) && <p>Sin coincidencias.</p>}
                      </div>
                    )}
                    {item && (
                      <form
                        className="em-agregar"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (
                            await guardar(
                              `/${cuenta.id}/consumos`,
                              {
                                itemId: item.id,
                                precio: item.precio,
                                cantidad: Number(cantidad),
                                porHora,
                                registroId: crypto.randomUUID(),
                              },
                              porHora
                                ? "Servicio iniciado. El contador seguirá activo hasta finalizar su uso."
                                : "Consumo registrado.",
                            )
                          ) {
                            setItemId("");
                            setBusqueda("");
                          }
                        }}
                      >
                        <strong>{item.nombre}</strong>
                        {item.tipo === "servicio" && (
                          <label>
                            Modalidad
                            <select
                              value={porHora ? "hora" : "unidad"}
                              onChange={(e) =>
                                setPorHora(e.target.value === "hora")
                              }
                            >
                              <option value="unidad">
                                Por aplicación / unidad
                              </option>
                              <option value="hora">
                                Por hora · proporcional
                              </option>
                            </select>
                          </label>
                        )}
                        {!porHora && (
                          <label>
                            Cantidad
                            <input
                              required
                              type="number"
                              min="0.001"
                              max="100000"
                              step="any"
                              value={cantidad}
                              onChange={(e) => setCantidad(e.target.value)}
                            />
                          </label>
                        )}
                        <span>
                          {dinero(item.precio)} /{" "}
                          {porHora ? "hora" : item.unidad}
                        </span>
                        <button
                          className="em-primario"
                          disabled={ocupado || !cuenta.signos.length}
                        >
                          {porHora ? "Iniciar servicio" : "Agregar consumo"}
                        </button>
                        {porHora && (
                          <small>
                            Confirma que esta tarifa corresponde a una hora. Se
                            cobrará la fracción exacta de tiempo utilizado.
                          </small>
                        )}
                      </form>
                    )}
                  </section>
                )}
                <section className="em-panel em-tabla-consumos">
                  <header className="em-panel-titulo">
                    <div>
                      <h3>Consumos registrados</h3>
                      <small>
                        Servicios, productos e insumos cargados a la cuenta del
                        paciente.
                      </small>
                    </div>
                    <b>{dinero(total)}</b>
                  </header>
                  {cuenta.consumos.length ? (
                    <div className="em-tabla-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Fecha y hora</th>
                            <th>Tipo</th>
                            <th>Detalle</th>
                            <th>Cantidad / modalidad</th>
                            <th>Estado</th>
                            <th>Importe</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...cuenta.consumos].reverse().map((c) => (
                            <tr key={c.registroId}>
                              <td>{fecha(c.inicio)}</td>
                              <td>
                                <span className="em-tipo-consumo">
                                  {c.tipo === "servicio"
                                    ? "Servicio"
                                    : "Producto / insumo"}
                                </span>
                              </td>
                              <td>
                                <strong>{c.nombre}</strong>
                                <small>
                                  {c.codigo} · {c.unidad}
                                </small>
                              </td>
                              <td>
                                {c.porHora
                                  ? `${dinero(c.precio)} / hora`
                                  : `${c.cantidad} × ${dinero(c.precio)}`}
                              </td>
                              <td>
                                {c.porHora ? (
                                  <span
                                    className={`em-reloj ${!c.fin ? "en-curso" : ""}`}
                                  >
                                    {!c.fin ? "● En curso" : "Finalizado"} ·{" "}
                                    {reloj(duracion(c, ahora))}
                                  </span>
                                ) : (
                                  "Registrado"
                                )}
                              </td>
                              <td>
                                <strong>{dinero(importe(c, ahora))}</strong>
                              </td>
                              <td>
                                {c.porHora &&
                                !c.fin &&
                                !recepcion &&
                                !/cub[ií]culo/i.test(c.nombre) ? (
                                  <button
                                    disabled={ocupado}
                                    onClick={() =>
                                      void guardar(
                                        `/${cuenta.id}/finalizar-consumo`,
                                        { registroId: c.registroId },
                                        "Servicio finalizado. Importe fijado en la cuenta.",
                                      )
                                    }
                                  >
                                    Finalizar uso
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="em-vacio">Aún no hay consumos registrados.</p>
                  )}
                </section>
              </div>
              {!recepcion && !cuenta.fin && (
                <div
                  className="em-cierre"
                  hidden={seccionClinica === "descargos"}
                >
                  <small>
                    Al finalizar, la cuenta se conserva en Recepción y el
                    cubículo queda libre.
                  </small>
                  <button
                    disabled={ocupado || !cuenta.signos.length}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Finalizar esta atención y liberar el cubículo? La cuenta se conservará en Recepción.",
                        )
                      )
                        void guardar(
                          `/${cuenta.id}/cierre`,
                          {
                            condicionEgreso: "vivo",
                            causaEgreso: "hospitalaria",
                          },
                          "Atención finalizada; cubículo disponible.",
                        );
                    }}
                  >
                    Finalizar atención
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </section>
  );
}
