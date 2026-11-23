import { AvisoTemporal } from "../../radius/componentes/AvisoTemporal";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { apiFetch } from "../../radius/api";
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
import { InsumosEnfermeriaPanel } from "./InsumosEnfermeriaPanel";
import { TratamientoPacienteTabla } from "./TratamientoPacienteTabla";
import {
  leerBalanceEmergencia,
  suscribirBalanceEmergencia,
  type RegistroBalanceEmergencia,
} from "./balanceEmergencias";
import {
  apiEmergencias,
  nombrePaciente,
  type CuentaEmergencia,
} from "./emergenciasApi";
import { camposParaServicio } from "../triaje/camposSignosVitales";
import { cancelarPreinternacion, crearPreinternacion, salaDisponibleEnHorario } from "../internacion/registroInternaciones";
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
type RegistroBalanceTabla = Omit<RegistroBalanceEmergencia, "anotacion"> & { anotacion?: string | null };
type TrasladoAmbulanciaProgramado = { fecha: string; hora: string; motivo: string; destino: string; paciente?: string; ci?: string };
const CLAVE_TRASLADOS_AMBULANCIA = "hme:emergencias:traslados-ambulancia:v1";
const CLAVE_CONTINUIDAD_TRIAJE = "hme:emergencias:triaje:continuidad:v1";
type ContinuidadTriaje = {
  cuentaId: string;
  seccion: "paciente" | "tratamiento" | "ingreso" | "reportes" | "signos" | "examen" | "descargos";
  subvista: "atencion" | "historial" | "inventario";
};
type BorradorTriaje = {
  valores?: Record<string, string>;
  observacion?: string;
  fechaHoraSignos?: { fecha: string; hora: string };
  formBalance?: { tipo: "ingreso" | "egreso"; volumen: string; detalle: string; detalleOtro?: string; anotacion: string; fecha: string; hora: string };
  evolucion?: string;
  evolucionEditando?: string | null;
  fechaHoraEvolucion?: { fecha: string; hora: string };
  itemId?: string;
  cantidad?: string;
  porHora?: boolean;
  busqueda?: string;
};
function leerContinuidadTriaje(): ContinuidadTriaje | null {
  try {
    const valor = JSON.parse(window.sessionStorage.getItem(CLAVE_CONTINUIDAD_TRIAJE) || "null") as ContinuidadTriaje | null;
    return valor && typeof valor.cuentaId === "string" ? valor : null;
  } catch { return null; }
}
function leerBorradorTriaje(cuentaId: string): BorradorTriaje {
  if (!cuentaId) return {};
  try { return JSON.parse(window.sessionStorage.getItem(`${CLAVE_CONTINUIDAD_TRIAJE}:borrador:${cuentaId}`) || "{}") as BorradorTriaje; }
  catch { return {}; }
}
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
  const [vistaSignos, setVistaSignos] = useState<"grafica" | "tabla">("grafica");
  const [vistaAmplia, setVistaAmplia] = useState(false);
  const dialogoRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (!vistaAmplia) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setVistaAmplia(false);
    };
    document.addEventListener("keydown", cerrarConEscape);
    document.body.style.overflow = "hidden";
    dialogoRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = "";
      anterior?.focus();
    };
  }, [vistaAmplia]);
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
        </div>
        <span>
          {seleccionados.length} signo{seleccionados.length === 1 ? "" : "s"}{" "}
          seleccionado{seleccionados.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="em-signos-controles-vista">
        <div className="em-signos-vista-switch" data-vista={vistaSignos} role="group" aria-label="Vista de las mediciones">
          <button type="button" className={vistaSignos === "grafica" ? "activo" : ""} aria-pressed={vistaSignos === "grafica"} onClick={() => setVistaSignos("grafica")}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v16h16M7 14l4-5 4 3 5-7" /></svg><span>Gráfica</span></button>
          <button type="button" className={vistaSignos === "tabla" ? "activo" : ""} aria-pressed={vistaSignos === "tabla"} onClick={() => setVistaSignos("tabla")}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M3 15h18M10 10v10"/></svg><span>Tabla</span></button>
        </div>
        <button type="button" className="em-signos-ver-amplio" onClick={() => setVistaAmplia(true)} aria-haspopup="dialog">
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>
          <span>Ver amplio</span>
        </button>
      </div>
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
      {vistaSignos === "tabla" ? (
        <div className="em-signos-tabla-contenedor">
          {mediciones.length ? <table className="em-signos-tabla"><thead><tr><th>Fecha y hora</th>{seleccionados.map((serie) => <th key={serie.id}><span>{serie.nombre}</span>{serie.unidad && <small>{serie.unidad}</small>}</th>)}</tr></thead><tbody>{[...mediciones].reverse().map((medicion) => <tr key={medicion.id}><td><time dateTime={medicion.fecha}>{fecha(medicion.fecha)}</time></td>{seleccionados.map((serie) => <td key={serie.id}><strong>{medicion.valores[serie.id] !== undefined && medicion.valores[serie.id] !== "" ? medicion.valores[serie.id] : "—"}</strong></td>)}</tr>)}</tbody></table> : <p>Aún no hay mediciones registradas.</p>}
        </div>
      ) : medicionesVisibles.length &&
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
                      <g key={`${serie.id}-${indice}`}>
                      <circle
                        cx={punto.x}
                        cy={punto.y}
                        r="5"
                      >
                        <title>
                          {serie.nombre}: {punto.valor} {serie.unidad} ·{" "}
                          {fecha(punto.medicion.fecha)}
                        </title>
                      </circle>
                      <text className="em-signos-grafica-etiqueta" x={punto.x} y={punto.y - 12} textAnchor="middle">
                        {punto.valor} {serie.unidad}
                      </text>
                      </g>
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
      {vistaAmplia && (
        <div className="em-signos-modal-fondo" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setVistaAmplia(false); }}>
          <div className="em-signos-modal" role="dialog" aria-modal="true" aria-labelledby="em-signos-modal-titulo" ref={dialogoRef} tabIndex={-1}>
            <header>
              <div><span>VISTA AMPLIADA</span><h2 id="em-signos-modal-titulo">Evolución de signos vitales</h2></div>
              <button type="button" onClick={() => setVistaAmplia(false)} aria-label="Cerrar vista ampliada"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            </header>
            <div className="em-signos-modal-contenido">
              <div className="em-signos-modal-resumen">
                <div><span>REGISTROS</span><strong>{mediciones.length}</strong><small>mediciones guardadas</small></div>
                <div><span>SIGNOS VISIBLES</span><strong>{seleccionados.length}</strong><small>{seleccionados.map((serie) => serie.nombre).join(" · ") || "Sin signos seleccionados"}</small></div>
                <div><span>RANGO MOSTRADO</span><strong>{medicionesVisibles.length ? `${horaIngreso(medicionesVisibles[0].fecha)} – ${horaIngreso(medicionesVisibles.at(-1)!.fecha)}` : "—"}</strong><small>últimas mediciones registradas</small></div>
              </div>
              {vistaSignos === "tabla" ? (
                <div className="em-signos-tabla-contenedor">
                  {mediciones.length ? <table className="em-signos-tabla em-signos-tabla-amplia"><thead><tr><th><span>Fecha y hora</span><small>Registro clínico</small></th>{seleccionados.map((serie) => <th key={serie.id}><span>{serie.nombre}</span>{serie.unidad && <small>{serie.unidad}</small>}</th>)}</tr></thead><tbody>{[...mediciones].reverse().map((medicion) => <tr key={medicion.id}><td><time dateTime={medicion.fecha}>{fecha(medicion.fecha)}</time></td>{seleccionados.map((serie) => <td key={serie.id}><strong>{medicion.valores[serie.id] !== undefined && medicion.valores[serie.id] !== "" ? medicion.valores[serie.id] : "—"}</strong><small>{medicion.valores[serie.id] !== undefined && medicion.valores[serie.id] !== "" ? serie.unidad : "Sin dato"}</small></td>)}</tr>)}</tbody></table> : <p>Aún no hay mediciones registradas.</p>}
                </div>
              ) : medicionesVisibles.length && seleccionados.some((serie) => serie.coords.length) ? (
                <svg viewBox="0 0 830 235" role="img" aria-label="Gráfica ampliada de evolución de signos vitales">
                  <g className="em-signos-grafica-guia"><path d="M55 30H775M55 83H775M55 136H775M55 190H775" /></g>
                  {seleccionados.map((serie) => serie.coords.length > 0 && <g className="em-signos-serie" key={serie.id} style={{ color: serie.color }}><polyline points={serie.coords.map((punto) => `${punto.x},${punto.y}`).join(" ")} />{serie.coords.map((punto, indice) => <g key={`${serie.id}-${indice}`}><circle cx={punto.x} cy={punto.y} r="5"><title>{serie.nombre}: {punto.valor} {serie.unidad} · {fecha(punto.medicion.fecha)}</title></circle><text className="em-signos-grafica-etiqueta" x={punto.x} y={punto.y - 12} textAnchor="middle">{punto.valor} {serie.unidad}</text></g>)}</g>)}
                  {medicionesVisibles.length > 0 && <><text className="em-signos-grafica-hora" x="55" y="222" textAnchor="start">{horaIngreso(medicionesVisibles[0].fecha)}</text><text className="em-signos-grafica-hora" x="775" y="222" textAnchor="end">{horaIngreso(medicionesVisibles.at(-1)!.fecha)}</text></>}
                </svg>
              ) : <div className="em-signos-grafica-vacia"><Icon name="patient" size={23} /><strong>{mediciones.length ? "No hay datos para los signos seleccionados" : "Aún no hay mediciones"}</strong><span>{mediciones.length ? "Elige otro signo para ver sus mediciones." : "Registra los signos vitales para iniciar la gráfica de evolución."}</span></div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const categoriasBalanceIngreso = [
  { id: "suero", etiqueta: "Suero" },
  { id: "sangre", etiqueta: "Sangre" },
  { id: "plasma", etiqueta: "Plasma" },
  { id: "viaOral", etiqueta: "Vía oral" },
  { id: "otros", etiqueta: "Otros" },
] as const;
const categoriasBalanceEgreso = [
  { id: "orina", etiqueta: "Orina" },
  { id: "vomito", etiqueta: "Vómito" },
  { id: "deposicion", etiqueta: "Deposición líquida" },
  { id: "drenajes", etiqueta: "Otros drenajes" },
] as const;
function categoriaBalance(registro: RegistroBalanceTabla) {
  const detalle = normalizar(registro.detalle.split(":")[0]).replace(/[^a-z0-9]/g, "");
  if (registro.tipo === "ingreso") {
    if (detalle.includes("sangre")) return "sangre";
    if (detalle.includes("plasma")) return "plasma";
    if (detalle.includes("oral")) return "viaOral";
    if (detalle.includes("suero") || detalle.includes("solucion") || detalle.includes("venoclisis")) return "suero";
    return "otros";
  }
  if (detalle.includes("orina") || detalle.includes("diuresis")) return "orina";
  if (detalle.includes("vomito")) return "vomito";
  if (detalle.includes("deposicion") || detalle.includes("liquida") || detalle.includes("fecal")) return "deposicion";
  return "drenajes";
}
function CeldaVolumenBalance({ registros }: { registros: RegistroBalanceTabla[] }) {
  if (!registros.length) return <span className="em-balance-celda-vacia">—</span>;
  const total = registros.reduce((suma, registro) => suma + registro.volumen, 0);
  const detalle = registros.map((registro) => registro.detalle + ": " + registro.volumen.toLocaleString("es-BO") + " ml").join("; ");
  return <span title={detalle}>{total.toLocaleString("es-BO")} ml</span>;
}
function TablaBalanceDiario({ fecha, registros }: { fecha: string; registros: RegistroBalanceTabla[] }) {
  const fechaLegible = new Date(fecha + "T12:00:00").toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const registrosHora = (hora: number, tipo?: "ingreso" | "egreso", categoria?: string) => registros.filter((registro) =>
    Number(registro.hora.slice(0, 2)) === hora && (!tipo || registro.tipo === tipo) && (!categoria || categoriaBalance(registro) === categoria),
  );
  const registrosBloque = (inicio: number, fin: number, tipo?: "ingreso" | "egreso", categoria?: string) => registros.filter((registro) => {
    const hora = Number(registro.hora.slice(0, 2));
    return hora >= inicio && hora <= fin && (!tipo || registro.tipo === tipo) && (!categoria || categoriaBalance(registro) === categoria);
  });
  const totalVolumen = (items: RegistroBalanceTabla[]) => items.reduce((suma, registro) => suma + registro.volumen, 0);
  return (
    <section className="em-balance-dia">
      <header><h5>{fechaLegible}</h5><span>{registros.length} {registros.length === 1 ? "movimiento" : "movimientos"}</span></header>
      <div className="em-balance-dia-tabla-scroll">
        <table className="em-balance-tabla em-balance-tabla-horaria">
          <thead>
            <tr><th rowSpan={2} scope="col">Hora</th><th colSpan={6} scope="colgroup">Ingresos</th><th colSpan={5} scope="colgroup">Egresos</th></tr>
            <tr>{categoriasBalanceIngreso.map((categoria) => <th scope="col" key={categoria.id}>{categoria.etiqueta}</th>)}<th scope="col">Total</th>{categoriasBalanceEgreso.map((categoria) => <th scope="col" key={categoria.id}>{categoria.etiqueta}</th>)}<th scope="col">Total</th></tr>
          </thead>
          <tbody>{Array.from({ length: 24 }, (_, hora) => {
            const ingresosHora = registrosHora(hora, "ingreso");
            const egresosHora = registrosHora(hora, "egreso");
            const celdas = [
              ...categoriasBalanceIngreso.map((categoria) => <td key={"in-" + categoria.id}><CeldaVolumenBalance registros={registrosHora(hora, "ingreso", categoria.id)} /></td>),
              <td className="em-balance-total-hora ingreso" key="in-total"><CeldaVolumenBalance registros={ingresosHora} /></td>,
              ...categoriasBalanceEgreso.map((categoria) => <td key={"out-" + categoria.id}><CeldaVolumenBalance registros={registrosHora(hora, "egreso", categoria.id)} /></td>),
              <td className="em-balance-total-hora egreso" key="out-total"><CeldaVolumenBalance registros={egresosHora} /></td>,
            ];
            const filas: ReactNode[] = [<tr key={"hora-" + hora}><th scope="row" className="em-balance-hora">{String(hora).padStart(2, "0")}:00</th>{celdas}</tr>];
            if (hora % 6 === 5) {
              const inicio = hora - 5;
              const sumas = [
                ...categoriasBalanceIngreso.map((categoria) => totalVolumen(registrosBloque(inicio, hora, "ingreso", categoria.id))),
                totalVolumen(registrosBloque(inicio, hora, "ingreso")),
                ...categoriasBalanceEgreso.map((categoria) => totalVolumen(registrosBloque(inicio, hora, "egreso", categoria.id))),
                totalVolumen(registrosBloque(inicio, hora, "egreso")),
              ];
              filas.push(<tr className="em-balance-subtotal-6h" key={"subtotal-" + hora}><th scope="row">Subtotal 6 h</th>{sumas.map((suma, indice) => <td key={indice}>{suma ? suma.toLocaleString("es-BO") + " ml" : "—"}</td>)}</tr>);
            }
            return filas;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}const pedir = apiEmergencias;
const mismasCuentas = (actuales: Cuenta[], siguientes: Cuenta[]) =>
  actuales.length === siguientes.length &&
  actuales.every(
    (cuenta, indice) =>
      cuenta.id === siguientes[indice]?.id &&
      cuenta.revision === siguientes[indice]?.revision &&
      JSON.stringify(cuenta.balanceHidrico || []) === JSON.stringify(siguientes[indice]?.balanceHidrico || []) &&
      JSON.stringify(cuenta.trasladoAmbulancia || null) === JSON.stringify(siguientes[indice]?.trasladoAmbulancia || null) &&
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
  const [borradorInicial] = useState<BorradorTriaje>(() => ({}));
  const [seccionClinica, setSeccionClinica] = useState<
    "paciente" | "tratamiento" | "ingreso" | "reportes" | "signos" | "examen" | "descargos"
  >("ingreso");
  const [cuentas, setCuentas] = useState<Cuenta[]>([]),
    [activa, setActiva] = useState("");
  const [trasladosAmbulancia, setTrasladosAmbulancia] = useState<Record<string, TrasladoAmbulanciaProgramado>>(() => {
    try { return JSON.parse(window.localStorage.getItem(CLAVE_TRASLADOS_AMBULANCIA) || "{}"); } catch { return {}; }
  });
  const [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(""),
    [aviso, setAviso] = useState("");
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
    [subvista, setSubvista] = useState<"atencion" | "historial" | "inventario">("atencion");
  const [modalExportarHistorial, setModalExportarHistorial] = useState(false);
  const [fechaDesdeHistorial, setFechaDesdeHistorial] = useState("");
  const [fechaHastaHistorial, setFechaHastaHistorial] = useState("");
  const [desdeReporteTurno, setDesdeReporteTurno] = useState("");
  const [hastaReporteTurno, setHastaReporteTurno] = useState("");
  const [hojasReportePendientes, setHojasReportePendientes] = useState<Array<"signos" | "balance" | "tratamiento" | "enfermeria"> | null>(null);
  const [vistaPreviaReporte, setVistaPreviaReporte] = useState<{ url: string; titulo: string; hoja: "signos" | "balance" | "tratamiento" | "enfermeria" } | null>(null);
  const [errorExportarHistorial, setErrorExportarHistorial] = useState("");
  const [pagina, setPagina] = useState(1);
  const [catalogo, setCatalogo] = useState<Item[]>([]),
    [errorCatalogo, setErrorCatalogo] = useState(""),
    [busqueda, setBusqueda] = useState(() => borradorInicial.busqueda || "");
  const [itemId, setItemId] = useState(() => borradorInicial.itemId || ""),
    [cantidad, setCantidad] = useState(() => borradorInicial.cantidad || "1"),
    [porHora, setPorHora] = useState(() => borradorInicial.porHora || false);
  const [valores, setValores] = useState<Record<string, string>>(() => borradorInicial.valores || {}),
    [observacion, setObservacion] = useState(() => borradorInicial.observacion || "");
  const [fechaHoraSignos, setFechaHoraSignos] = useState(() => borradorInicial.fechaHoraSignos || fechaHoraIngresoActual());
  const [balanceEmergencia, setBalanceEmergencia] = useState<RegistroBalanceEmergencia[]>([]);
  const [vistaBalanceEmergencia, setVistaBalanceEmergencia] = useState<"grafica" | "tabla">("tabla");
  const [formBalanceEmergencia, setFormBalanceEmergencia] = useState(() => ({
    tipo: "ingreso" as "ingreso" | "egreso",
    volumen: "",
    detalle: "",
    detalleOtro: "",
    anotacion: "",
    ...fechaHoraIngresoActual(),
    ...borradorInicial.formBalance,
  }));
  const [errorBalanceEmergencia, setErrorBalanceEmergencia] = useState("");
  const [evolucion, setEvolucion] = useState(() => borradorInicial.evolucion || "");
  const [evolucionEditando, setEvolucionEditando] = useState<string | null>(() => borradorInicial.evolucionEditando || null);
  const [evolucionEnVista, setEvolucionEnVista] = useState<NonNullable<Cuenta["evaluaciones"]>[number] | null>(null);
  const [fechaHoraEvolucion, setFechaHoraEvolucion] = useState(() => borradorInicial.fechaHoraEvolucion || fechaHoraIngresoActual());
  const [identidad, setIdentidad] = useState<Identidad | null>(null),
    [revisionIdentidad, setRevisionIdentidad] = useState(0);
  const pacienteSeleccionadoRef = useRef<{ id: string; datos: Identidad } | null>(null);
  const [trasladoModal, setTrasladoModal] = useState(false);
  const [destinoTraslado, setDestinoTraslado] = useState<"sala" | "ambulancia" | "uci">("sala");
  const [motivoAmbulancia, setMotivoAmbulancia] = useState("");
  const [destinoAmbulancia, setDestinoAmbulancia] = useState("");
  const [salaTraslado, setSalaTraslado] = useState("105");
  const [fechaTraslado, setFechaTraslado] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [horaTraslado, setHoraTraslado] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toTimeString().slice(0, 5));
  const [cobroModal, setCobroModal] = useState(false),
    [metodoPago, setMetodoPago] = useState("Efectivo"),
    [montoRecibido, setMontoRecibido] = useState(""),
    [referenciaPago, setReferenciaPago] = useState("");
  const datosPacienteRef = useRef<HTMLElement>(null);
  const operacionActiva = useRef(false),
    intentoConsumo = useRef<{ clave: string; id: string } | null>(null);
  const cuenta = cuentas.find((c) => c.id === activa),
    item = catalogo.find((i) => i.id === itemId);
  const importacionesBalance = useRef(new Set<string>());
  useEffect(() => {
    if (recepcion) return;
    try {
      if (!activa) {
        window.sessionStorage.removeItem(CLAVE_CONTINUIDAD_TRIAJE);
        return;
      }
      window.sessionStorage.setItem(CLAVE_CONTINUIDAD_TRIAJE, JSON.stringify({ cuentaId: activa, seccion: seccionClinica, subvista } satisfies ContinuidadTriaje));
    } catch { /* La sesión puede tener el almacenamiento del navegador deshabilitado. */ }
  }, [activa, seccionClinica, subvista, recepcion]);
  useEffect(() => {
    if (recepcion || !activa) return;
    const borrador: BorradorTriaje = { valores, observacion, fechaHoraSignos, formBalance: formBalanceEmergencia, evolucion, evolucionEditando, fechaHoraEvolucion, itemId, cantidad, porHora, busqueda };
    try { window.sessionStorage.setItem(`${CLAVE_CONTINUIDAD_TRIAJE}:borrador:${activa}`, JSON.stringify(borrador)); }
    catch { /* La sesión puede tener el almacenamiento del navegador deshabilitado. */ }
  }, [activa, valores, observacion, fechaHoraSignos, formBalanceEmergencia, evolucion, evolucionEditando, fechaHoraEvolucion, itemId, cantidad, porHora, busqueda, recepcion]);
  useEffect(() => {
    if (!cuenta?.id) {
      setBalanceEmergencia([]);
      return;
    }
    const actualizar = () => setBalanceEmergencia(leerBalanceEmergencia(cuenta.id));
    actualizar();
    return suscribirBalanceEmergencia(cuenta.id, actualizar);
  }, [cuenta?.id]);
  useEffect(() => {
    if (!cuenta || cuenta.fin || importacionesBalance.current.has(cuenta.id)) return;
    const idsGuardados = new Set((cuenta.balanceHidrico || []).map((registro) => registro.id));
    const pendientes = leerBalanceEmergencia(cuenta.id).filter((registro) => !idsGuardados.has(registro.id));
    if (!pendientes.length) return;
    const cuentaId = cuenta.id;
    importacionesBalance.current.add(cuentaId);
    void (async () => {
      try {
        let actualizada: Cuenta | undefined;
        for (const registro of pendientes) {
          actualizada = await pedir<Cuenta>(`/${cuentaId}/balance-hidrico`, registro);
        }
        if (actualizada) {
          const balanceHidrico = actualizada.balanceHidrico;
          setCuentas((prev) => prev.map((item) => item.id === cuentaId ? { ...item, balanceHidrico } : item));
        }
      } catch {
        importacionesBalance.current.delete(cuentaId);
        setError("No se pudieron sincronizar los registros anteriores de balance hídrico de este navegador.");
      }
    })();
  }, [cuenta?.id, cuenta?.fin]);
  const balancePersistido = cuenta?.balanceHidrico || [];
  const idsBalancePersistido = new Set(balancePersistido.map((registro) => registro.id));
  const balanceCompleto = [...balanceEmergencia.filter((registro) => !idsBalancePersistido.has(registro.id)), ...balancePersistido]
    .sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
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
      setError("");
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
      const items = await pedir<Item[]>("/catalogo");
      setCatalogo(items.map((item) => ({ ...item, unidad: item.unidad || "" })));
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
    void pedir<{ recuperados: number }>("/recuperar-consumos-inventario", {}).catch(() => {
      if (!cancelado) setError("No se pudieron verificar los consumos de inventario pendientes. Intenta actualizar la vista.");
    }).finally(() => { if (!cancelado) void actualizar(); });
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
    setFechaHoraSignos(fechaHoraIngresoActual());
    setFormBalanceEmergencia({ tipo: "ingreso", volumen: "", detalle: "", detalleOtro: "", anotacion: "", ...fechaHoraIngresoActual() });
    setEvolucion("");
    setEvolucionEditando(null);
    setFechaHoraEvolucion(fechaHoraIngresoActual());
    setItemId("");
    setCantidad("1");
    setPorHora(false);
    setBusqueda("");
    setAviso("");
    setError("");
  }
  function salirDeAtencion() {
    setActiva("");
    setSeccionClinica("ingreso");
    setIdentidad(null);
    setValores({});
    setObservacion("");
    setFechaHoraSignos(fechaHoraIngresoActual());
    setFormBalanceEmergencia({ tipo: "ingreso", volumen: "", detalle: "", detalleOtro: "", anotacion: "", ...fechaHoraIngresoActual() });
    setEvolucion("");
    setEvolucionEditando(null);
    setFechaHoraEvolucion(fechaHoraIngresoActual());
    setItemId("");
    setCantidad("1");
    setPorHora(false);
    setBusqueda("");
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
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      operacionActiva.current = false;
      setOcupado(false);
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
  async function registrarBalanceEmergencia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cuenta) return;
    try {
      const guardado = await guardar(`/${cuenta.id}/balance-hidrico`, {
        tipo: formBalanceEmergencia.tipo,
        volumen: Number(formBalanceEmergencia.volumen),
        detalle: [formBalanceEmergencia.detalle, formBalanceEmergencia.detalleOtro?.trim()]
          .filter(Boolean)
          .join(": "),
        anotacion: formBalanceEmergencia.anotacion.trim(),
        fecha: formBalanceEmergencia.fecha,
        hora: formBalanceEmergencia.hora,
      }, "Balance hídrico guardado.");
      if (!guardado) return;
      setFormBalanceEmergencia((actual) => ({
        ...actual,
        volumen: "",
        detalle: "",
        detalleOtro: "",
        anotacion: "",
        ...fechaHoraIngresoActual(),
      }));
      setErrorBalanceEmergencia("");
    } catch (e) {
      setErrorBalanceEmergencia((e as Error).message || "No se pudo guardar el balance hídrico.");
    }
  }
  const ingresosBalanceEmergencia = balanceCompleto
    .filter((registro) => registro.tipo === "ingreso")
    .reduce((total, registro) => total + registro.volumen, 0);
  const egresosBalanceEmergencia = balanceCompleto
    .filter((registro) => registro.tipo === "egreso")
    .reduce((total, registro) => total + registro.volumen, 0);
  const totalBalanceEmergencia = ingresosBalanceEmergencia - egresosBalanceEmergencia;
  let acumuladoBalanceEmergencia = 0;
  const puntosBalanceEmergencia = balanceCompleto.map((registro, indice) => {
    acumuladoBalanceEmergencia += registro.tipo === "ingreso" ? registro.volumen : -registro.volumen;
    return { ...registro, acumulado: acumuladoBalanceEmergencia, indice };
  });
  const serviciosPorHora = catalogo.filter(
    (item) =>
      /^(hora|horas|hr|hrs)$/i.test((item.unidad || "").trim()) ||
      /\bpor hora\b/i.test(item.unidad || ""),
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
    pacienteSeleccionadoRef.current = null;
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
        const medico = item.identidad?.medicoAdmision || "Sin registrar";
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
      fecha: registro.hora ? `${registro.fecha}T${registro.hora}:00` : registro.fecha,
      tipo: registro.tipo === "insumo" ? "Medicamento / insumo" : registro.tipo === "procedimiento" ? "Procedimiento" : "Cuidado de enfermería",
      detalle: registro.detalle,
      cantidad: registro.cantidad ? `${registro.cantidad} ${registro.unidad || ""}`.trim() : "",
      observacion: registro.observacion || "",
      usuario: registro.usuario,
      ordenId: registro.ordenId,
      estado: "Registrado",
    })),
    ...(cuenta?.consumos || []).filter((consumo) => !(cuenta?.registrosEnfermeria || []).some((registro) => registro.id === consumo.registroId)).map((consumo) => ({
      id: `consumo-${consumo.registroId}`,
      fecha: consumo.inicio,
      tipo: consumo.tipo === "servicio" ? "Servicio" : "Insumo",
      detalle: consumo.nombre,
      cantidad: consumo.porHora ? "Por hora" : `${consumo.cantidad} ${consumo.unidad}`,
      observacion: "",
      usuario: cuenta?.ordenes?.find((orden) => orden.id === consumo.ordenId)?.usuario || "—",
      ordenId: consumo.ordenId,
      estado: consumo.porHora ? (consumo.fin ? "Finalizado" : "En curso") : "Aplicado",
    })),
  ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const eventosInsumosEmergencia = eventosSuministracion.filter((evento) =>
    /insumo|medicamento/i.test(evento.tipo),
  );
  useEffect(() => {
    if (!cuenta) return;
    const inicio = new Date(cuenta.inicio);
    const fin = cuenta.fin ? new Date(cuenta.fin) : new Date();
    const formatoLocal = (valor: Date) => {
      const local = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    };
    setDesdeReporteTurno(formatoLocal(inicio));
    setHastaReporteTurno(formatoLocal(fin));
  }, [cuenta?.id]);

  useEffect(() => {
    return () => { if (vistaPreviaReporte?.url) URL.revokeObjectURL(vistaPreviaReporte.url); };
  }, [vistaPreviaReporte?.url]);

  async function exportarReporteTurnoVertical(hojasSolicitadas?: Array<"signos" | "balance" | "tratamiento" | "enfermeria">, abrirPrevisualizacion = false) {
    if (!cuenta) return;
    if (!desdeReporteTurno || !hastaReporteTurno || new Date(desdeReporteTurno) > new Date(hastaReporteTurno)) {
      setAviso("Selecciona un rango válido de fecha y hora para el turno.");
      return;
    }
    const desde = new Date(desdeReporteTurno).getTime();
    const hasta = new Date(hastaReporteTurno).getTime();
    const enRango = (valor: string) => {
      const instante = new Date(valor).getTime();
      return Number.isFinite(instante) && instante >= desde && instante <= hasta;
    };
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 13;
    const identidad = cuenta.identidad || {};
    let logo: string | null = null;
    try {
      const respuestaLogo = await fetch("/logo-hospital-reportes.png");
      if (respuestaLogo.ok) {
        const archivoLogo = await respuestaLogo.blob();
        logo = await new Promise<string>((resolve, reject) => {
          const lector = new FileReader();
          lector.onload = () => typeof lector.result === "string" ? resolve(lector.result) : reject(new Error("Logo inválido"));
          lector.onerror = () => reject(new Error("No se pudo leer el logo"));
          lector.readAsDataURL(archivoLogo);
        });
      }
    } catch { /* El reporte conserva su encabezado institucional si el logo no está disponible. */ }

    const titulos = { signos: "Hoja de evolución de signos vitales", balance: "Hoja de balance hídrico", tratamiento: "Registro de medicación e insumos", enfermeria: "Reporte de enfermería" };
    let paginaIniciada = false;
    let hojasIncluidas = 0;
    const dibujarDatoEncabezado = (etiqueta: string, valor: string, x: number, y: number, anchoMaximo: number) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(83, 109, 136);
      pdf.text(etiqueta, x, y);
      const xValor = x + pdf.getTextWidth(`${etiqueta} `);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(22, 53, 88);
      pdf.text(pdf.splitTextToSize(valor || "—", Math.max(8, anchoMaximo - (xValor - x)))[0] || "—", xValor, y);
    };
    const dibujarEncabezado = (titulo: string) => {
      pdf.setFillColor(18, 56, 98);
      pdf.rect(0, 0, ancho, 2, "F");
      if (logo) pdf.addImage(logo, "PNG", margen, 7, 43, 16);
      else {
        pdf.setTextColor(18, 56, 98); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
        pdf.text("HOSPITAL MARÍA ESPERANZA", margen, 16);
      }
      pdf.setTextColor(18, 56, 98); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5);
      pdf.text(pdf.splitTextToSize(titulo.toLocaleUpperCase("es"), 87).slice(0, 2), 62, 13);
      pdf.setFontSize(8.5); pdf.setTextColor(83, 109, 136);
      pdf.text("SERVICIO DE EMERGENCIAS", ancho / 2, 21, { align: "center" });
      pdf.setFontSize(8); pdf.setTextColor(83, 109, 136);
      pdf.text("N.º HISTORIA CLÍNICA / CI", 153, 10);
      pdf.setFontSize(8.5); pdf.setTextColor(22, 53, 88);
      pdf.text(pdf.splitTextToSize(identidad.historiaClinica || identidad.documento || "No registrado", ancho - margen - 153).slice(0, 2), 153, 17);
      pdf.setDrawColor(185, 207, 229); pdf.setLineWidth(0.35); pdf.line(margen, 27, ancho - margen, 27);
      dibujarDatoEncabezado("SALA / CUBÍCULO:", nombreCubiculo(cuenta.cubiculo), 153, 24, ancho - margen - 153);
      dibujarDatoEncabezado("PACIENTE:", nombrePaciente(cuenta), margen, 32, 112);
      dibujarDatoEncabezado("EDAD:", edadPaciente(identidad.nacimiento), margen + 116, 32, ancho - margen - (margen + 116));
      pdf.setDrawColor(185, 207, 229); pdf.setLineWidth(0.35); pdf.line(margen, 36, ancho - margen, 36);
    };
    const comenzarHoja = (titulo: string) => {
      if (paginaIniciada) pdf.addPage("a4", "portrait");
      paginaIniciada = true;
      hojasIncluidas += 1;
      dibujarEncabezado(titulo);
    };
    const comenzarPaginaContinuacion = (titulo: string) => {
      pdf.addPage("a4", "portrait");
      dibujarEncabezado(titulo);
    };
    const opcionesTabla = (titulo: string) => ({
      startY: 48,
      theme: "grid" as const,
      styles: { font: "helvetica", fontSize: 7.2, cellPadding: 2, textColor: [35, 65, 91] as [number, number, number], lineColor: [205, 225, 239] as [number, number, number], lineWidth: 0.18, valign: "middle" as const, overflow: "linebreak" as const },
      headStyles: { fillColor: [18, 56, 98] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
      alternateRowStyles: { fillColor: [250, 253, 255] as [number, number, number] },
      margin: { top: 48, left: margen, right: margen, bottom: 25 },
      didDrawPage: () => dibujarEncabezado(titulo),
    });
    const elegidas = hojasSolicitadas || ["signos", "balance", "tratamiento", "enfermeria"];
    const signos = cuenta.signos.filter((registro) => enRango(registro.fecha)).sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
    const balances = balanceCompleto.filter((registro) => enRango(`${registro.fecha}T${registro.hora || "00:00"}:00`));
    const tratamientos = eventosSuministracion.filter((evento) => enRango(evento.fecha)).sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
    const registrosEnfermeria = (cuenta.registrosEnfermeria || []).filter((registro) => enRango(registro.hora ? `${registro.fecha}T${registro.hora}:00` : registro.fecha));
    const evoluciones = (cuenta.evaluaciones || []).filter((registro) => {
      const fechaRegistro = registro.campos.evolucionFecha ? `${registro.campos.evolucionFecha}T${registro.campos.evolucionHora || "00:00"}:00` : registro.fecha;
      return Boolean(registro.campos.evolucion?.trim()) && enRango(fechaRegistro);
    });
    if (elegidas.includes("signos") && signos.length) {
      comenzarHoja(titulos.signos);
      const camposInforme = camposEmergencia.length
        ? camposEmergencia
        : campos.map(([id, etiqueta, unidad]) => ({ id, etiqueta, unidad }));
      const encabezados = signos.map((toma) => `${horaIngreso(toma.fecha)}\n${new Date(toma.fecha).toLocaleDateString("es-BO")}`);
      const filasMatriz = camposInforme.map((campo) => [
        `${campo.etiqueta}\n${campo.unidad || ""}`,
        ...signos.map((toma) => {
          const valorDirecto = toma.valores?.[campo.id];
          const registro = toma.mediciones?.find((medicion) => medicion.id === campo.id || medicion.nombre === campo.etiqueta);
          const valor = valorDirecto !== undefined && valorDirecto !== "" ? valorDirecto : registro?.valor;
          return valor === undefined || valor === "" ? "—" : String(valor);
        }),
      ]);
      if (signos.some((toma) => toma.observacion?.trim())) {
        filasMatriz.push(["Observación", ...signos.map((toma) => toma.observacion?.trim() || "—")]);
      }
      autoTable(pdf, {
        ...opcionesTabla(titulos.signos),
        startY: 47,
        head: [["SIGNO VITAL", ...encabezados]],
        body: filasMatriz,
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: 0,
        styles: { font: "helvetica", fontSize: 7, cellPadding: 3, textColor: [21, 81, 122], lineColor: [206, 225, 238], lineWidth: 0.22, valign: "middle", overflow: "linebreak" },
        headStyles: { fillColor: [239, 247, 251], textColor: [8, 127, 192], fontStyle: "bold", halign: "center", lineColor: [198, 220, 234] },
        alternateRowStyles: { fillColor: [245, 250, 253] },
        columnStyles: { 0: { cellWidth: 42, fillColor: [36, 79, 109], textColor: [255, 255, 255], fontStyle: "bold", halign: "left" } },
        didParseCell: (datos) => {
          if (datos.section === "head" && datos.column.index === 0) {
            datos.cell.styles.fillColor = [36, 79, 109];
            datos.cell.styles.textColor = [255, 255, 255];
            datos.cell.styles.halign = "left";
          }
          if (datos.section === "body" && datos.column.index > 0) datos.cell.styles.halign = "center";
        },
      });
    }
    if (elegidas.includes("balance") && balances.length) {
      const dias = [...new Set(balances.map((registro) => registro.fecha))].sort();
      dias.forEach((dia) => {
        comenzarHoja(`${titulos.balance} · ${new Date(`${dia}T12:00:00`).toLocaleDateString("es-BO")}`);
        const registrosDia = balances.filter((registro) => registro.fecha === dia);
        const filas: (string | number)[][] = [];
        let totalIngreso = 0; let totalEgreso = 0;
        const tieneMovimientos = (registros: typeof registrosDia) => registros.length > 0;
        for (let bloque = 0; bloque < 4; bloque++) {
          let ingresoBloque = 0; let egresoBloque = 0;
          for (let hora = bloque * 6; hora < bloque * 6 + 6; hora++) {
            const movimientos = registrosDia.filter((registro) => Number(registro.hora.slice(0, 2)) === hora);
            if (!tieneMovimientos(movimientos)) continue;
            const entradas = movimientos.filter((registro) => registro.tipo === "ingreso");
            const salidas = movimientos.filter((registro) => registro.tipo === "egreso");
            const ingreso = entradas.reduce((suma, registro) => suma + registro.volumen, 0);
            const egreso = salidas.reduce((suma, registro) => suma + registro.volumen, 0);
            ingresoBloque += ingreso; egresoBloque += egreso; totalIngreso += ingreso; totalEgreso += egreso;
            filas.push([`${String(hora).padStart(2, "0")}:00`, entradas.map((registro) => `${registro.detalle}${registro.anotacion ? ` · ${registro.anotacion}` : ""}`).join("; ") || "—", ingreso || "—", salidas.map((registro) => `${registro.detalle}${registro.anotacion ? ` · ${registro.anotacion}` : ""}`).join("; ") || "—", egreso || "—", ingreso || egreso ? `${ingreso - egreso > 0 ? "+" : ""}${ingreso - egreso}` : "—"]);
          }
          if (ingresoBloque || egresoBloque) {
            const desdeBloque = `${String(bloque * 6).padStart(2, "0")}:00`;
            const hastaBloque = `${String(bloque * 6 + 5).padStart(2, "0")}:59`;
            filas.push([`${desdeBloque}–${hastaBloque}`, "Subtotal ingresos", ingresoBloque, "Subtotal egresos", egresoBloque, `${ingresoBloque - egresoBloque > 0 ? "+" : ""}${ingresoBloque - egresoBloque}`]);
          }
          if (bloque === 1 && (totalIngreso || totalEgreso)) {
            filas.push(["00:00–11:59", "Total ingresos 12 h", totalIngreso, "Total egresos 12 h", totalEgreso, `${totalIngreso - totalEgreso > 0 ? "+" : ""}${totalIngreso - totalEgreso}`]);
          }
          if (bloque === 3 && (totalIngreso || totalEgreso)) {
            filas.push(["00:00–23:59", "Total ingresos 24 h", totalIngreso, "Total egresos 24 h", totalEgreso, `${totalIngreso - totalEgreso > 0 ? "+" : ""}${totalIngreso - totalEgreso}`]);
          }
        }
        const movimientosGrafica = registrosDia.slice().sort((a, b) => a.hora.localeCompare(b.hora));
        const graficaX = margen; const graficaY = 47; const graficaW = ancho - margen * 2; const graficaH = 46;
        pdf.setFillColor(249, 251, 253); pdf.setDrawColor(205, 220, 233); pdf.roundedRect(graficaX, graficaY, graficaW, graficaH, 1.6, 1.6, "FD");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.4); pdf.setTextColor(18, 56, 98); pdf.text("INGRESOS Y EGRESOS POR MOVIMIENTO", graficaX + 3, graficaY + 5);
        pdf.setFillColor(21, 157, 132); pdf.circle(graficaX + 4, graficaY + 10, 1.1, "F");
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.2); pdf.setTextColor(63, 91, 111); pdf.text("Ingreso", graficaX + 7, graficaY + 10.8);
        pdf.setFillColor(216, 121, 87); pdf.circle(graficaX + 25, graficaY + 10, 1.1, "F"); pdf.text("Egreso", graficaX + 28, graficaY + 10.8);
        const balanceNeto = totalIngreso - totalEgreso;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.2); pdf.setTextColor(103, 128, 147);
        pdf.text(`${movimientosGrafica.length} movimiento(s) · balance neto ${balanceNeto > 0 ? "+" : ""}${balanceNeto.toLocaleString("es-BO")} ml`, graficaX + graficaW - 3, graficaY + 10.8, { align: "right" });
        const plotX = graficaX + 12; const plotW = graficaW - 16; const yCero = graficaY + 34; const alturaPositiva = 17; const alturaNegativa = 5;
        const maxMovimiento = Math.max(1, ...movimientosGrafica.map((registro) => registro.volumen)); const escalaGrafica = maxMovimiento * 1.12;
        [0, 0.5, 1].forEach((fraccion) => {
          const yGuia = yCero - fraccion * alturaPositiva;
          pdf.setDrawColor(224, 234, 241); pdf.setLineWidth(0.18); pdf.line(plotX, yGuia, plotX + plotW, yGuia);
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.2); pdf.setTextColor(103, 128, 147);
          pdf.text(String(Math.round(maxMovimiento * fraccion)).slice(0, 7), graficaX + 3, yGuia + 1.5);
        });
        movimientosGrafica.forEach((registro, indice) => {
          const grupoW = plotW / Math.max(1, movimientosGrafica.length); const centro = plotX + grupoW * (indice + 0.5);
          const anchoBarra = Math.min(7, Math.max(1.4, grupoW * 0.58)); const alturaBarra = Math.max(0.8, (registro.volumen / escalaGrafica) * alturaPositiva);
          const esIngreso = registro.tipo === "ingreso"; const yBarra = esIngreso ? yCero - alturaBarra : yCero;
          pdf.setFillColor(...(esIngreso ? [21, 157, 132] as [number, number, number] : [216, 121, 87] as [number, number, number]));
          pdf.roundedRect(centro - anchoBarra / 2, yBarra, anchoBarra, esIngreso ? alturaBarra : Math.min(alturaNegativa, alturaBarra), 0.7, 0.7, "F");
          if (movimientosGrafica.length <= 12 || indice === 0 || indice === movimientosGrafica.length - 1 || indice === Math.floor(movimientosGrafica.length / 2)) {
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(5); pdf.setTextColor(103, 128, 147);
            pdf.text(registro.hora, centro, graficaY + 43, { align: "center" });
          }
        });
        autoTable(pdf, { ...opcionesTabla(`${titulos.balance} · ${new Date(`${dia}T12:00:00`).toLocaleDateString("es-BO")}`), startY: graficaY + graficaH + 3, head: [["HORA", "INGRESOS · DETALLE", "ML", "EGRESOS · DETALLE", "ML", "BALANCE ML"]], body: filas, styles: { ...opcionesTabla(titulos.balance).styles, fontSize: 6.4, cellPadding: 1.35 }, columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 48 }, 2: { cellWidth: 15, halign: "right" }, 3: { cellWidth: 48 }, 4: { cellWidth: 15, halign: "right" }, 5: { cellWidth: 20, halign: "right" } }, didParseCell: (data) => { if (data.row.raw && Array.isArray(data.row.raw) && /^(Subtotal|Total)/.test(String(data.row.raw[1]))) { data.cell.styles.fillColor = [232, 239, 247]; data.cell.styles.textColor = [18, 56, 98]; data.cell.styles.fontStyle = "bold"; } } });
      });
    }
    if (elegidas.includes("tratamiento")) {
      comenzarHoja(titulos.tratamiento);
      const eventosClinicos = tratamientos.filter((evento) => /insumo|medicamento/i.test(evento.tipo));
      const filas = eventosClinicos.map((evento) => {
        const orden = cuenta.ordenes?.find((item) => item.id === evento.ordenId);
        const clasificacion = `${evento.tipo} ${orden?.tipo || ""} ${orden?.titulo || ""} ${evento.detalle}`;
        const esSolucion = /soluci[oó]n|venocl|suero|ringer|fisiol[oó]gic/i.test(clasificacion);
        const esJeringa = /jeringa/i.test(clasificacion);
        const esMedicamento = !esSolucion && !esJeringa && (/medicamento/i.test(evento.tipo) || orden?.tipo?.toLocaleLowerCase("es").includes("medicamento"));
        const detalleCantidad = [evento.detalle, evento.cantidad].filter(Boolean).join(" · ") || "—";
        const profesional = evento.usuario || orden?.usuario || "No registrado";
        return [
          new Date(evento.fecha).toLocaleDateString("es-BO"),
          new Date(evento.fecha).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
          esSolucion ? detalleCantidad : "—",
          esMedicamento ? [orden?.titulo, orden?.dosis, evento.cantidad].filter(Boolean).join(" · ") : "—",
          orden?.via || "—",
          evento.observacion || orden?.indicaciones || "—",
          !esSolucion && !esMedicamento && !esJeringa ? detalleCantidad : "—",
          esJeringa ? evento.cantidad || "Cantidad no registrada" : "—",
          profesional,
        ];
      });
      if (!filas.length) filas.push(["—", "—", "—", "—", "—", "No se registraron medicamentos ni insumos en el período seleccionado.", "—", "—", "—"]);
      autoTable(pdf, { ...opcionesTabla(titulos.tratamiento), head: [["FECHA", "HORA", "SOLUCIONES", "MEDICAMENTOS", "VÍA", "OBSERVACIONES", "INSUMOS", "JERINGAS", "RESPONSABLE / FIRMA"]], body: filas, styles: { ...opcionesTabla(titulos.tratamiento).styles, fontSize: 6.2, cellPadding: 1.6 }, columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 12 }, 2: { cellWidth: 24 }, 3: { cellWidth: 28 }, 4: { cellWidth: 14 }, 5: { cellWidth: 31 }, 6: { cellWidth: 23 }, 7: { cellWidth: 17 }, 8: { cellWidth: "auto" } } });
    }
    if (elegidas.includes("enfermeria") && (registrosEnfermeria.length || evoluciones.length)) {
      comenzarHoja(titulos.enfermeria);
      const unirNotaYObservacion = (nota?: string, observacion?: string) => {
        const textos = [nota?.trim(), observacion?.trim()].filter(Boolean);
        return [...new Set(textos)].join("\n\n") || "—";
      };
      const filas = [
        ...registrosEnfermeria.map((registro) => [
          `${new Date(`${registro.fecha}T12:00:00`).toLocaleDateString("es-BO")} ${registro.hora || ""}`,
          registro.tipo === "cuidado" ? "Cuidado" : registro.tipo === "procedimiento" ? "Procedimiento" : "Medicamento / insumo",
          unirNotaYObservacion(registro.detalle, registro.observacion),
          registro.usuario || "—",
        ]),
        ...evoluciones.map(({ fecha, campos, usuario }) => {
          const fechaRegistro = new Date(campos.evolucionFecha ? `${campos.evolucionFecha}T12:00:00` : fecha);
          const hora = campos.evolucionHora || new Date(fecha).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
          return [
            `${fechaRegistro.toLocaleDateString("es-BO")} ${hora}`,
            "Evolución de enfermería",
            unirNotaYObservacion(campos.evolucion, campos.observaciones?.trim() || campos.plan),
            usuario || "—",
          ];
        }),
      ].sort((a, b) => `${a[0]}`.localeCompare(`${b[0]}`));
      autoTable(pdf, {
        ...opcionesTabla(titulos.enfermeria),
        head: [["FECHA Y HORA", "TIPO DE REGISTRO", "NOTA / OBSERVACIÓN", "PROFESIONAL"]],
        body: filas,
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 27 },
          2: { cellWidth: "auto", valign: "top" },
          3: { cellWidth: 26 },
        },
      });
    }
    const hojasSinRegistros = [
      { hoja: "signos", cantidad: signos.length },
      { hoja: "balance", cantidad: balances.length },
      { hoja: "enfermeria", cantidad: registrosEnfermeria.length + evoluciones.length },
    ] as const;
    for (const { hoja, cantidad } of hojasSinRegistros) {
      if (elegidas.includes(hoja) && cantidad === 0) {
        comenzarHoja(titulos[hoja]);
        autoTable(pdf, {
          ...opcionesTabla(titulos[hoja]),
          head: [["REGISTROS DEL TURNO"]],
          body: [["Sin registros en el turno seleccionado."]],
        });
      }
    }
    if (!hojasIncluidas) {
      setAviso("No hay registros en las hojas seleccionadas para el turno indicado.");
      return;
    }
    const paginas = pdf.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina++) {
      pdf.setPage(pagina);
      pdf.setDrawColor(145, 174, 194); pdf.setLineWidth(0.25); pdf.line(ancho - 78, alto - 12, ancho - margen, alto - 12);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(103, 128, 147);
      pdf.text("Registro de turno · Emergencias", margen, alto - 8);
      pdf.text("Firma y sello de enfermería", ancho - 77, alto - 8);
      pdf.text(`Página ${pagina} de ${paginas}`, ancho - margen, alto - 4, { align: "right" });
    }
    if (abrirPrevisualizacion) {
      const hoja = elegidas[0] || "signos";
      const url = URL.createObjectURL(pdf.output("blob"));
      setVistaPreviaReporte({ url, titulo: titulos[hoja], hoja });
    } else {
      if (!cuenta.pacienteId) {
        setAviso("No se pudo guardar el reporte: vincula primero esta atención con la ficha del paciente.");
        return;
      }
      const nombreArchivo = `reporte-turno-emergencias-${new Date().toISOString().slice(0, 10)}.pdf`;
      const formulario = new FormData();
      formulario.append("archivo", pdf.output("blob"), nombreArchivo);
      formulario.append("titulo", "Reporte de turno de Emergencias");
      formulario.append("periodo_desde", desdeReporteTurno);
      formulario.append("periodo_hasta", hastaReporteTurno);
      try {
        const respuesta = await apiFetch(`/api/v1/emergencias/${encodeURIComponent(cuenta.id)}/reportes`, { method: "POST", body: formulario });
        const resultado = await respuesta.json().catch(() => null) as { message?: string } | null;
        if (!respuesta.ok) throw new Error(resultado?.message || "No se pudo guardar el reporte en la historia clínica.");
      } catch (causa) {
        setAviso(causa instanceof Error ? causa.message : "No se pudo guardar el reporte en la historia clínica.");
        return;
      }
      pdf.save(nombreArchivo);
      setAviso(`PDF guardado automáticamente en la historia clínica y descargado (${hojasIncluidas} hoja(s)).`);
    }
  }

  async function trasladarAInternacion() {
    if (!cuenta || !cuenta.identidad?.documento?.trim()) return;
    let preinternacionId = "";
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const identidadPaciente = cuenta.identidad;
      const nombreDestino = destinoTraslado === "sala" ? "Sala de internación" : destinoTraslado === "uci" ? "UCI · Unidad de Cuidados Intensivos" : `Traslado en ambulancia a ${destinoAmbulancia.trim()}`;
      if (destinoTraslado === "ambulancia") {
        const actualizada = await pedir<Cuenta>(`/${cuenta.id}/traslado-ambulancia`, {
          fecha: fechaTraslado, hora: horaTraslado, motivo: motivoAmbulancia.trim(), destino: destinoAmbulancia.trim(),
        });
        setCuentas((prev) => [actualizada, ...prev.filter((item) => item.id !== actualizada.id)]);
        const fechaProgramada = new Date(`${fechaTraslado}T00:00:00`).toLocaleDateString("es-BO");
        const solicitudesActualizadas = {
          ...trasladosAmbulancia,
          [cuenta.id]: { fecha: fechaProgramada, hora: horaTraslado, motivo: motivoAmbulancia, destino: destinoAmbulancia.trim(), paciente: nombrePaciente(cuenta), ci: cuenta.identidad.documento.trim() },
        };
        window.localStorage.setItem(CLAVE_TRASLADOS_AMBULANCIA, JSON.stringify(solicitudesActualizadas));
        setTrasladosAmbulancia(solicitudesActualizadas);
        setTrasladoModal(false);
        setActiva("");
        setAviso(`${nombrePaciente(cuenta)} será trasladado en ambulancia a las ${horaTraslado}.`);
        return;
      }
        const salaReservada = destinoTraslado === "sala" ? salaTraslado : "UCI";
        if (!salaDisponibleEnHorario(salaReservada, new Date(`${fechaTraslado}T00:00:00`).toLocaleDateString("es-BO"), horaTraslado)) {
          throw new Error("Esa sala ya tiene una solicitud para la misma fecha y hora. Elige otro horario o sala.");
        }
        const fechaProgramada = new Date(`${fechaTraslado}T00:00:00`).toLocaleDateString("es-BO");
        const preinternacion = crearPreinternacion({
          pacienteId: cuenta.pacienteId || undefined,
          paciente: nombrePaciente(cuenta),
          ci: identidadPaciente.documento.trim(),
          medico: "Pendiente de asignación",
          motivo: cuenta.evaluaciones?.map((evaluacion) => evaluacion.campos.diagnostico?.trim()).find(Boolean) || "Traslado desde Emergencias",
          fechaIngreso: fechaProgramada,
          horaIngreso: horaTraslado,
          sala: salaReservada,
          origen: "Emergencias",
          servicio: destinoTraslado === "uci" ? "UCI · Unidad de Cuidados Intensivos" : "Internación",
          tipoSala: destinoTraslado === "uci" ? "UCI" : "Sala de internación",
          observaciones: `Traslado solicitado desde Emergencias para ${fechaProgramada} a las ${horaTraslado}. Sala reservada: ${destinoTraslado === "sala" ? salaTraslado : "UCI"}. Pendiente de aprobación de Enfermería.`,
          datosPaciente: {
            nacimiento: identidadPaciente.nacimiento || "",
            sexo: identidadPaciente.sexo || "",
            responsableNombre: identidadPaciente.familiar || "",
          },
        });
        preinternacionId = preinternacion.id;
      const actualizada = await pedir<Cuenta>(`/${cuenta.id}/cierre`, {
        condicionEgreso: "vivo",
        causaEgreso: "internacion",
        observacionEgreso: `Traslado del paciente desde Emergencias. Destino programado: ${nombreDestino}.`,
      });
      setCuentas((prev) => [actualizada, ...prev.filter((item) => item.id !== actualizada.id)]);
      setTrasladoModal(false);
      setAviso("Traslado registrado. Enfermería puede confirmar la cama desde Internación.");
    } catch (causa) {
      if (preinternacionId) cancelarPreinternacion(preinternacionId);
      setError((causa as Error).message || "No se pudo completar el traslado a internación.");
    } finally {
      setOcupado(false);
    }
  }
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
                <button
                  type="button"
                  className={subvista === "inventario" ? "activo" : ""}
                  aria-current={subvista === "inventario" ? "page" : undefined}
                  onClick={() => setSubvista("inventario")}
                >
                  <span><Icon name="package" size={16} /></span>
                  <strong>Inventario</strong>
                </button>
              </HorizontalSubvistaNav>
            )}
          </div>
          {!cuenta && subvista !== "inventario" && (
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
      {error && !nueva && !identidad && <p className="em-error" role="alert">{error}</p>}
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
      {!recepcion && subvista === "inventario" && (
        <section className="em-inventario-general" aria-label="Inventario de Triaje emergencias">
          <InsumosEnfermeriaPanel />
        </section>
      )}
      <div
        hidden={!recepcion && subvista === "inventario"}
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
                className={`em-cubiculo ${activa === c.id ? "seleccionado" : ""} ${c.trasladoAmbulancia || trasladosAmbulancia[c.id] ? "em-cubiculo-traslado" : ""}`}
                onClick={() => seleccionar(c.id)}
              >
                {c.trasladoAmbulancia || trasladosAmbulancia[c.id] ? (
                  <>
                    <span className="em-paciente-lista">{nombrePaciente(c)}</span>
                    <strong className="em-traslado-ambulancia-titulo">Será trasladado en ambulancia a las {(c.trasladoAmbulancia || trasladosAmbulancia[c.id]).hora}</strong>
                    <span className="em-traslado-ambulancia-destino">{(c.trasladoAmbulancia || trasladosAmbulancia[c.id]).fecha} · Destino: {(c.trasladoAmbulancia || trasladosAmbulancia[c.id]).destino}</span>
                    <small className="em-traslado-ambulancia-motivo">Motivo: {(c.trasladoAmbulancia || trasladosAmbulancia[c.id]).motivo}</small>
                  </>
                ) : (
                  <>
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
                      {c.identidad?.medicoAdmision || "Sin registrar"}
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
                <div className="em-resumen-identidad em-ficha-paciente">
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
                  {!recepcion && !cuenta.fin && !identidad && (
                    <>
                      <button
                        className="em-traslado-internacion"
                        type="button"
                        disabled={ocupado || !cuenta.identidad?.documento?.trim()}
                        title={!cuenta.identidad?.documento?.trim()
                          ? "Completa primero el documento del paciente."
                          : "Trasladar al paciente a Internación."}
                        onClick={() => setTrasladoModal(true)}
                      >
                        <Icon name="bed" size={15} /> Traslado del paciente
                      </button>
                    </>
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
                        const seleccionado = pacienteSeleccionadoRef.current;
                        const camposFicha: Record<string, string> = {
                          nombres: "nombres", apellidoPaterno: "apellido_paterno", apellidoMaterno: "apellido_materno",
                          documento: "ci", complemento: "complemento_ci", expedidoEn: "expedido_en", nit: "nit",
                          razonSocial: "razon_social", nacimiento: "fecha_nacimiento", telefono: "telefono", sexo: "genero",
                          ciConQr: "ci_con_qr", pais: "pais", departamento: "departamento", ciudad: "ciudad",
                          zonaBarrio: "zona_barrio", direccion: "direccion_domicilio",
                        };
                        const cambiosPaciente = seleccionado ? Object.fromEntries(Object.entries(camposFicha)
                          .filter(([campo]) => (identidad[campo] || "") !== (seleccionado.datos[campo] || ""))
                          .map(([campo, destino]) => [destino, campo === "ciConQr" ? identidad[campo] === "true" : identidad[campo] || ""])) : undefined;
                        if (
                          await guardar(
                            `/${cuenta.id}/identidad`,
                            { ...identidad, apellidos, revision: revisionIdentidad, ...(seleccionado ? { pacienteId: seleccionado.id, cambiosPaciente } : {}) },
                            "Datos guardados en la cuenta.",
                          )
                        )
                          setIdentidad(null);
                      }}
                    >
                      <PacienteIngresoEmergencia
                        onSeleccionar={(p) => {
                          if (p) {
                            const datosSeleccionados: Identidad = {
                              nombres: p.nombres, apellidoPaterno: p.primerApellido, apellidoMaterno: p.segundoApellido,
                              documento: p.numeroDocumento, complemento: p.complementoCi || "", expedidoEn: p.expedidoEn || "",
                              ciConQr: String(Boolean(p.ciConQr)), nit: p.nit || "", razonSocial: p.razonSocial || "",
                              nacimiento: p.fechaNacimiento, sexo: p.sexo === "femenino" ? "Femenino" : p.sexo === "masculino" ? "Masculino" : p.sexo === "otro" ? "Otro" : p.sexo,
                              telefono: p.telefono, pais: p.pais || "Bolivia", departamento: p.departamento || "", ciudad: p.ciudad || "",
                              zonaBarrio: p.zonaBarrio || "", direccion: p.direccion,
                            };
                            pacienteSeleccionadoRef.current = { id: p.id, datos: datosSeleccionados };
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
                          } else pacienteSeleccionadoRef.current = null;
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
                      {error && <p className="em-error" role="alert">{error}</p>}
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
                      <span className="em-pestana-icono" aria-hidden="true"><Icon name="home" size={17} /></span>
                      Evolución del paciente
                    </button>
                    <button
                      type="button"
                      className={seccionClinica === "paciente" ? "activo" : ""}
                      aria-current={
                        seccionClinica === "paciente" ? "page" : undefined
                      }
                      onClick={() => setSeccionClinica("paciente")}
                    >
                      <span className="em-pestana-icono" aria-hidden="true"><Icon name="stethoscope" size={17} /></span>
                      Atención del paciente
                    </button>
                    <button
                      type="button"
                      className={seccionClinica === "tratamiento" ? "activo" : ""}
                      aria-current={seccionClinica === "tratamiento" ? "page" : undefined}
                      onClick={() => setSeccionClinica("tratamiento")}
                    >
                      <span className="em-pestana-icono" aria-hidden="true"><Icon name="clipboardMedical" size={17} /></span>
                      Tratamiento del paciente
                    </button>
                    <button
                      type="button"
                      className={seccionClinica === "reportes" ? "activo" : ""}
                      aria-current={seccionClinica === "reportes" ? "page" : undefined}
                      onClick={() => setSeccionClinica("reportes")}
                    >
                      <span className="em-pestana-icono" aria-hidden="true"><Icon name="clipboardMedical" size={17} /></span>
                      Reportes
                    </button>
                  </nav>
                  {seccionClinica === "reportes" && (
                    <section className="em-panel em-reporte-atencion" aria-label="Reportes de atención e insumos">
                      <section className="em-reporte-bloque" aria-labelledby="em-reporte-atencion-titulo">
                        <header className="em-reporte-bloque-cabecera">
                          <div><span>REPORTE CLÍNICO</span><h3 id="em-reporte-atencion-titulo">Reporte de atención de emergencia</h3></div>
                        </header>
                      </section>
                      <section className="em-reporte-bloque" aria-labelledby="em-reporte-insumos-titulo">
                        <header className="em-reporte-bloque-cabecera">
                          <div><span>REPORTE OPERATIVO</span><h3 id="em-reporte-insumos-titulo">Reporte de uso y dispensación de insumos</h3><small>Detalle de medicamentos e insumos utilizados durante esta atención.</small></div>
                          <button type="button" className="em-primario" onClick={() => setHojasReportePendientes(["signos", "balance", "tratamiento", "enfermeria"])}><Icon name="download" size={15} /> Exportar PDF del turno</button>
                        </header>
                          <div className="em-reporte-identidad em-reporte-resumen-insumos">
                            <article><small>Paciente</small><strong>{nombrePaciente(cuenta)}</strong><span>CI {cuenta.identidad?.documento || "Sin documento"}</span></article>
                            <article><small>Productos registrados</small><strong>{eventosInsumosEmergencia.length}</strong><span>Medicamentos e insumos aplicados</span></article>
                            <article><small>Consumos de insumos</small><strong>{cuenta.consumos.filter((consumo) => consumo.tipo !== "servicio").length}</strong><span>En esta cuenta de Emergencias</span></article>
                            <article><small>Atención</small><strong>{nombreCubiculo(cuenta.cubiculo)}</strong><span>{cuenta.fin ? "Finalizada" : "En curso"}</span></article>
                          </div>
                          <section className="em-reporte-seccion">
                            <header><h4>Detalle de uso y dispensación</h4><span>{eventosInsumosEmergencia.length} registros</span></header>
                            {eventosInsumosEmergencia.length ? <div className="em-reporte-tabla"><table><thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Insumo o medicamento</th><th>Cantidad</th><th>Observación</th><th>Estado</th></tr></thead><tbody>{eventosInsumosEmergencia.map((evento) => <tr key={evento.id}><td>{fecha(evento.fecha)}</td><td>{evento.tipo}</td><td>{evento.detalle}</td><td>{evento.cantidad || "—"}</td><td>{evento.observacion || "—"}</td><td>{evento.estado}</td></tr>)}</tbody></table></div> : <p>Aún no se registraron medicamentos ni insumos para esta atención.</p>}
                          </section>

                      </section>
                    </section>
                  )}
                  {seccionClinica === "ingreso" && (
                    <>
                    <section className="em-panel em-signos-panel">
                      <header className="em-panel-titulo">
                        <div>
                          <h3>Signos vitales</h3>
                        </div>
                      </header>
                      <div className="em-signos-columnas">
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
                      <section className="em-signos-evolucion-tabla" aria-label="Tabla de evolución de signos vitales">
                        <header>
                          <h4>Evolución por hora</h4>
                          <span>{cuenta.signos.length} {cuenta.signos.length === 1 ? "medición registrada" : "mediciones registradas"}</span>
                        </header>
                        {cuenta.signos.length > 0 && camposEmergencia.length > 0 ? (
                          <div className="em-signos-tabla-contenedor">
                            <table className="em-signos-tabla em-signos-evolucion-matriz">
                              <thead><tr><th scope="col">Signo vital</th>{cuenta.signos.map((medicion) => <th scope="col" key={medicion.id}><span>{horaIngreso(medicion.fecha)}</span><small>{new Date(medicion.fecha).toLocaleDateString("es-BO")}</small></th>)}</tr></thead>
                              <tbody>{camposEmergencia.map((campo) => <tr key={campo.id}><th scope="row"><span>{campo.etiqueta}</span>{campo.unidad && <small>{campo.unidad}</small>}</th>{cuenta.signos.map((medicion) => {
                                const valorDetalle = medicion.mediciones?.find((registro) => registro.id === campo.id || registro.nombre === campo.etiqueta)?.valor;
                                const valor = valorDetalle ?? medicion.valores[campo.id];
                                return <td key={medicion.id}><strong>{valor !== undefined && valor !== "" ? valor : "—"}</strong></td>;
                              })}</tr>)}</tbody>
                            </table>
                          </div>
                        ) : <p className="em-signos-evolucion-vacia">Aún no hay mediciones de signos vitales para mostrar.</p>}
                      </section>
                    </section>
                    <section className="em-panel em-balance-emergencias" aria-label="Balance hídrico">
                      <header className="em-balance-emergencias-cabecera">
                        <div>
                          <span>CONTROL DE LÍQUIDOS</span>
                          <h3>Balance hídrico</h3>
                        </div>
                        <b>{balanceCompleto.length} {balanceCompleto.length === 1 ? "registro" : "registros"}</b>
                      </header>
                      <div className="em-balance-emergencias-resumen">
                        <article><small>Ingresos</small><strong>{ingresosBalanceEmergencia.toLocaleString("es-BO")} ml</strong></article>
                        <article><small>Egresos</small><strong>{egresosBalanceEmergencia.toLocaleString("es-BO")} ml</strong></article>
                        <article className={totalBalanceEmergencia < 0 ? "negativo" : "positivo"}><small>Balance acumulado</small><strong>{totalBalanceEmergencia > 0 ? "+ " : ""}{totalBalanceEmergencia.toLocaleString("es-BO")} ml</strong></article>
                      </div>
                      <div className="em-balance-emergencias-cuerpo">
                      <div className="em-balance-emergencias-visualizacion">
                      <div className="em-balance-emergencias-vistas">
                        <h4>Ingresos y egresos por movimiento</h4>
                        <div role="group" aria-label="Vista de ingresos y egresos">
                          <button type="button" className={vistaBalanceEmergencia === "grafica" ? "activo" : ""} aria-pressed={vistaBalanceEmergencia === "grafica"} onClick={() => setVistaBalanceEmergencia("grafica")}>Gráfica</button>
                          <button type="button" className={vistaBalanceEmergencia === "tabla" ? "activo" : ""} aria-pressed={vistaBalanceEmergencia === "tabla"} onClick={() => setVistaBalanceEmergencia("tabla")}>Tabla</button>
                        </div>
                      </div>
                      {vistaBalanceEmergencia === "grafica" ? <>
                      <section className="em-balance-emergencias-grafica" aria-label="Gráfica de ingresos y egresos">
                        {puntosBalanceEmergencia.length ? (() => {
                          const tope = Math.max(...puntosBalanceEmergencia.map((punto) => punto.volumen), 100);
                          const escala = tope * 1.18;
                          const yCero = 128;
                          const alturaMaxima = 92;
                          const anchoDisponible = 742;
                          const anchoGrupo = anchoDisponible / puntosBalanceEmergencia.length;
                          const anchoBarra = Math.min(54, Math.max(16, anchoGrupo * 0.58));
                          const guias = [0, 0.5, 1].map((fraccion) => ({ y: yCero - fraccion * alturaMaxima, valor: escala * fraccion }));
                          return <><div className="em-balance-emergencias-leyenda"><span><i className="ingreso" /> Ingreso</span><span><i className="egreso" /> Egreso</span><small>{puntosBalanceEmergencia.length} movimientos · balance neto {totalBalanceEmergencia > 0 ? "+" : ""}{totalBalanceEmergencia.toLocaleString("es-BO")} ml</small></div><svg viewBox="0 0 800 225" role="img" aria-label="Gráfica de columnas de ingresos y egresos en mililitros; escala ajustada al mayor movimiento"><path d={guias.map((guia) => `M58 ${guia.y}H780`).join(" ")} /><path className="em-balance-emergencias-cero" d={`M58 ${yCero}H780`} />{guias.map((guia, indice) => <text className="em-balance-emergencias-eje" key={`eje-${indice}`} x="50" y={guia.y + 4}>{Math.round(guia.valor).toLocaleString("es-BO")}</text>)}{puntosBalanceEmergencia.map((punto, indice) => {
                            const centro = 58 + anchoGrupo * (indice + 0.5);
                            const altura = Math.max(3, (punto.volumen / escala) * alturaMaxima);
                            const ingreso = punto.tipo === "ingreso";
                            const y = ingreso ? yCero - altura : yCero;
                            const etiquetaY = ingreso ? y - 6 : y + altura + 13;
                            return <g key={punto.id} className={`em-balance-emergencias-barra ${punto.tipo}`}><rect x={centro - anchoBarra / 2} y={y} width={anchoBarra} height={altura} rx="4"><title>{`${ingreso ? "Ingreso" : "Egreso"}: ${punto.detalle} · ${punto.volumen.toLocaleString("es-BO")} ml · ${punto.hora}`}</title></rect><text className="em-balance-emergencias-volumen" x={centro} y={etiquetaY} textAnchor="middle">{punto.volumen.toLocaleString("es-BO")}</text><text className="em-balance-emergencias-hora" x={centro} y="218" textAnchor="middle">{punto.hora}</text></g>;
                          })}</svg></>;
                        })() : <><div className="em-balance-emergencias-leyenda"><span><i className="ingreso" /> Ingreso</span><span><i className="egreso" /> Egreso</span><small>Se actualizará con cada movimiento</small></div><svg className="em-balance-emergencias-sin-datos" viewBox="0 0 800 225" role="img" aria-label="Gráfica vacía de ingresos y egresos"><path d="M58 34H780M58 73H780M58 112H780M58 151H780" /><path className="em-balance-emergencias-cero" d="M58 112H780" /><text className="em-balance-emergencias-eje" x="50" y="38">—</text><text className="em-balance-emergencias-eje" x="50" y="77">—</text><text className="em-balance-emergencias-eje" x="50" y="116">0</text><text className="em-balance-emergencias-eje" x="50" y="155">—</text><text x="420" y="111">Registra el primer movimiento para comparar ingresos y egresos</text></svg></>}
                      </section>
                      {balanceCompleto.length > 0 && <ol className="em-balance-emergencias-historial">
                        {balanceCompleto.slice().reverse().map((registro) => <li key={registro.id} className={registro.tipo}>
                          <span>{registro.tipo === "ingreso" ? "Ingreso" : "Egreso"}</span>
                          <div><strong>{registro.detalle}</strong>{registro.anotacion && <small>{registro.anotacion}</small>}</div>
                          <b>{registro.tipo === "ingreso" ? "+" : "âˆ’"}{registro.volumen.toLocaleString("es-BO")} ml</b>
                          <time>{new Date(`${registro.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {registro.hora}</time>
                        </li>)}
                      </ol>}
                      </> : <div className="em-balance-tabla-dias">
                        {[...new Set(balanceCompleto.map((registro) => registro.fecha))].sort().map((dia) => (
                          <TablaBalanceDiario key={dia} fecha={dia} registros={balanceCompleto.filter((registro) => registro.fecha === dia)} />
                        ))}
                        {!balanceCompleto.length && <p className="em-balance-tabla-vacia">Aún no hay ingresos ni egresos registrados.</p>}
                      </div>}
                      </div>
                      {!cuenta.fin && <form className="em-balance-emergencias-form" onSubmit={registrarBalanceEmergencia}>
                        <fieldset className="em-balance-tipo-switch">
                          <legend>Tipo de registro</legend>
                          <div className="em-balance-tipo-pista" role="group" aria-label="Tipo de movimiento">
                            <button type="button" className={formBalanceEmergencia.tipo === "ingreso" ? "activo ingreso" : "ingreso"} aria-pressed={formBalanceEmergencia.tipo === "ingreso"} onClick={() => setFormBalanceEmergencia((actual) => ({ ...actual, tipo: "ingreso", detalle: "", detalleOtro: "" }))}><span aria-hidden="true"><Icon name="plus" size={14} /></span><span><strong>Ingreso</strong><small>Entra líquido</small></span></button>
                            <button type="button" className={formBalanceEmergencia.tipo === "egreso" ? "activo egreso" : "egreso"} aria-pressed={formBalanceEmergencia.tipo === "egreso"} onClick={() => setFormBalanceEmergencia((actual) => ({ ...actual, tipo: "egreso", detalle: "", detalleOtro: "" }))}><span aria-hidden="true"><Icon name="minus" size={14} /></span><span><strong>Egreso</strong><small>Sale líquido</small></span></button>
                          </div>
                        </fieldset>
                        <label>Volumen (ml)<input type="number" min="1" step="1" placeholder="Ej. 250" value={formBalanceEmergencia.volumen} onChange={(evento) => setFormBalanceEmergencia((actual) => ({ ...actual, volumen: evento.target.value }))} required /></label>
                        <label className="em-balance-emergencias-detalle">Detalle
                          <select value={formBalanceEmergencia.detalle} onChange={(evento) => setFormBalanceEmergencia((actual) => ({ ...actual, detalle: evento.target.value, detalleOtro: "" }))} required>
                            <option value="">Selecciona una opción</option>
                            {(formBalanceEmergencia.tipo === "ingreso"
                              ? ["Suero", "Sangre", "Plasma", "Vía oral", "Otros"]
                              : ["Orina", "Vómito", "Deposición líquida", "Otros drenajes"]
                            ).map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
                          </select>
                          {(formBalanceEmergencia.detalle === "Otros" || formBalanceEmergencia.detalle === "Otros drenajes") && <input maxLength={150} placeholder="Especifica el detalle" value={formBalanceEmergencia.detalleOtro || ""} onChange={(evento) => setFormBalanceEmergencia((actual) => ({ ...actual, detalleOtro: evento.target.value }))} required />}
                        </label>
                        <label className="em-balance-emergencias-anotacion">Anotación clínica<textarea maxLength={1000} rows={2} placeholder="Observación de enfermería relacionada con este registro" value={formBalanceEmergencia.anotacion} onChange={(evento) => setFormBalanceEmergencia((actual) => ({ ...actual, anotacion: evento.target.value }))} /></label>
                        <div className="em-balance-fecha-hora">
                          <label>Fecha<input type="date" value={formBalanceEmergencia.fecha} onChange={(evento) => setFormBalanceEmergencia((actual) => ({ ...actual, fecha: evento.target.value }))} required /></label>
                          <label>Hora<input type="time" value={formBalanceEmergencia.hora} onChange={(evento) => setFormBalanceEmergencia((actual) => ({ ...actual, hora: evento.target.value }))} required /></label>
                        </div>
                        {errorBalanceEmergencia && <p role="alert">{errorBalanceEmergencia}</p>}
                        <button type="submit"><Icon name="plus" size={16} /> Registrar balance</button>
                      </form>}
                      
                      </div>
                    </section>
                    </>
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

                    </>
                  )}
                  {seccionClinica === "tratamiento" && (
                    <section className="em-seccion-tratamiento-paciente" aria-label="Tratamiento del paciente">
                      <div className="em-seguimiento-enfermeria">
                        <InsumosEnfermeriaPanel
                          onUtilizar={(item, cantidad, almacenId, solicitudId) =>
                            guardar(
                              `/${cuenta.id}/uso-enfermeria`,
                              {
                                tipo: "insumo",
                                itemId: `item-${item.id}`,
                                almacenId,
                                solicitudId,
                                detalle: item.nombre,
                                cantidad,
                                unidad: item.unidad,
                                observacion: item.codigo ? `Código: ${item.codigo}` : undefined,
                              },
                              `${item.nombre} registrado como insumo utilizado.`,
                            )
                          }
                        />
                        <OrdenesEmergencias
                          key={`indicaciones-${cuenta.id}`}
                          cuenta={cuenta}
                          catalogo={catalogo}
                          guardar={guardar}
                          ocupado={ocupado}
                          enfermeria
                        />
                      </div>
                      <TratamientoPacienteTabla key={`tratamiento-${cuenta.id}`} cuenta={cuenta} />
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
                                      (i.unidad || "").toUpperCase(),
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
            </>
          )}
        </main>
      </div>
      {trasladoModal && cuenta && (
        <div className="em-traslado-modal-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !ocupado) setTrasladoModal(false); }}>
          <form className="em-traslado-modal" role="dialog" aria-modal="true" aria-labelledby="em-traslado-titulo" onSubmit={(evento) => { evento.preventDefault(); void trasladarAInternacion(); }}>
            <header>
              <span className="em-traslado-modal-icono"><Icon name="bed" size={22} /></span>
              <div><small>DERIVACIÓN ASISTENCIAL</small><h3 id="em-traslado-titulo">Traslado del paciente</h3></div>
              <button type="button" aria-label="Cerrar ventana de traslado" disabled={ocupado} onClick={() => setTrasladoModal(false)}><Icon name="close" size={18} /></button>
            </header>
            <div className="em-traslado-modal-datos">
              <article><small>Paciente</small><strong>{nombrePaciente(cuenta)}</strong></article>
              <article><small>Documento</small><strong>{cuenta.identidad?.documento?.trim() || "Sin documento"}</strong></article>
              <article><small>{destinoTraslado === "ambulancia" ? "Motivo del traslado" : "Diagnóstico / motivo"}</small><strong>{destinoTraslado === "ambulancia" ? motivoAmbulancia || "Seleccionar motivo" : cuenta.evaluaciones?.map((evaluacion) => evaluacion.campos.diagnostico?.trim()).find(Boolean) || "Traslado desde Emergencias"}</strong></article>
            </div>
            <fieldset className="em-traslado-destinos">
              <legend>¿A dónde se trasladará?</legend>
              <label className={destinoTraslado === "sala" ? "seleccionado" : ""}><input type="radio" name="destinoTraslado" value="sala" checked={destinoTraslado === "sala"} onChange={() => setDestinoTraslado("sala")} /><Icon name="bed" size={24} /><span><strong>Sala de internación</strong></span></label>
              <label className={destinoTraslado === "ambulancia" ? "seleccionado" : ""}><input type="radio" name="destinoTraslado" value="ambulancia" checked={destinoTraslado === "ambulancia"} onChange={() => setDestinoTraslado("ambulancia")} /><Icon name="ambulance" size={24} /><span><strong>Traslado en ambulancia</strong></span></label>
              <label className={destinoTraslado === "uci" ? "seleccionado" : ""}><input type="radio" name="destinoTraslado" value="uci" checked={destinoTraslado === "uci"} onChange={() => setDestinoTraslado("uci")} /><Icon name="heartbeat" size={24} /><span><strong>UCI · Unidad de Cuidados Intensivos</strong></span></label>
            </fieldset>
            {(destinoTraslado === "sala" || destinoTraslado === "uci") && <div className="em-traslado-programacion">
              <label>{destinoTraslado === "uci" ? "Sala UCI" : "Número de sala"}
                {destinoTraslado === "uci" ? <input value="UCI" readOnly aria-label="Sala UCI" /> : <select value={salaTraslado} onChange={(evento) => setSalaTraslado(evento.target.value)} aria-label="Número de sala"><option value="">Seleccionar sala</option>{[101,102,103,105,106,107,108,109,110,111,112,113].map((numero) => <option key={numero} value={String(numero)}>Sala {numero}</option>)}</select>}
              </label>
              <label>Fecha de traslado<input type="date" value={fechaTraslado} min={new Date().toLocaleDateString("en-CA")} onChange={(evento) => setFechaTraslado(evento.target.value)} /></label>
              <label>Hora de traslado<input type="time" value={horaTraslado} onChange={(evento) => setHoraTraslado(evento.target.value)} /></label>
            </div>}
            {destinoTraslado === "ambulancia" && <div className="em-traslado-programacion em-traslado-ambulancia">
              <label>Motivo del traslado
                <select value={motivoAmbulancia} onChange={(evento) => setMotivoAmbulancia(evento.target.value)} required>
                  <option value="">Seleccionar motivo</option>
                  <option value="Atención especializada">Atención especializada</option>
                  <option value="Falta de servicio o equipamiento">Falta de servicio o equipamiento</option>
                  <option value="Mayor capacidad resolutiva">Mayor capacidad resolutiva</option>
                  <option value="Solicitud del paciente o familiar">Solicitud del paciente o familiar</option>
                  <option value="Continuidad de tratamiento">Continuidad de tratamiento</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label>Lugar de destino
                <input value={destinoAmbulancia} onChange={(evento) => setDestinoAmbulancia(evento.target.value)} placeholder="Nombre del hospital o centro de salud" required />
              </label>
              <label>Fecha del traslado<input type="date" value={fechaTraslado} min={new Date().toLocaleDateString("en-CA")} onChange={(evento) => setFechaTraslado(evento.target.value)} required /></label>
              <label>Hora del traslado<input type="time" value={horaTraslado} onChange={(evento) => setHoraTraslado(evento.target.value)} required /></label>
            </div>}
            {!cuenta.identidad?.documento?.trim() && <p className="em-traslado-modal-error" role="alert">Completa el documento del paciente antes de continuar.</p>}
            <footer>
              <button type="button" disabled={ocupado} onClick={() => setTrasladoModal(false)}>Cancelar</button>
              <button type="submit" className="em-traslado-confirmar" disabled={ocupado || !cuenta.identidad?.documento?.trim() || ((destinoTraslado === "sala" || destinoTraslado === "uci") && (!fechaTraslado || !horaTraslado || (destinoTraslado === "sala" && !salaTraslado))) || (destinoTraslado === "ambulancia" && (!motivoAmbulancia || !destinoAmbulancia.trim()))}><Icon name={destinoTraslado === "ambulancia" ? "ambulance" : "bed"} size={16} />{ocupado ? "Procesando traslado…" : "Trasladar paciente"}</button>
            </footer>
          </form>
        </div>
      )}
      {vistaPreviaReporte && cuenta && (
        <div className="em-reporte-preview-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setVistaPreviaReporte(null); }}>
          <section className="em-reporte-preview" role="dialog" aria-modal="true" aria-labelledby="em-reporte-preview-titulo">
            <header className="em-reporte-preview-cabecera">
              <div><span>VISTA PREVIA DEL REPORTE</span><h2 id="em-reporte-preview-titulo">{vistaPreviaReporte.titulo}</h2><p>{nombrePaciente(cuenta)} · Período seleccionado: {desdeReporteTurno.replace("T", " ")} — {hastaReporteTurno.replace("T", " ")}</p></div>
              <button type="button" aria-label="Cerrar vista previa" onClick={() => setVistaPreviaReporte(null)}><Icon name="close" size={19} /></button>
            </header>
            <iframe title={`Vista previa: ${vistaPreviaReporte.titulo}`} src={vistaPreviaReporte.url} />
            <footer className="em-reporte-preview-acciones">
              <button type="button" className="em-secundario" onClick={() => setVistaPreviaReporte(null)}>Cerrar</button>
              <button type="button" className="em-primario" onClick={() => void exportarReporteTurnoVertical([vistaPreviaReporte.hoja])}><Icon name="download" size={16} /> Descargar PDF</button>
            </footer>
          </section>
        </div>
      )}
      {hojasReportePendientes !== null && cuenta && (
        <div className="em-reporte-preview-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setHojasReportePendientes(null); }}>
          <section className="em-reporte-rango-modal" role="dialog" aria-modal="true" aria-labelledby="em-reporte-rango-titulo">
            <header className="em-reporte-preview-cabecera">
              <div><span>EXPORTAR REPORTE</span><h2 id="em-reporte-rango-titulo">Seleccionar período</h2><p>Elige el rango de fecha y hora que se incluirá en el PDF.</p></div>
              <button type="button" aria-label="Cerrar selección de período" onClick={() => setHojasReportePendientes(null)}><Icon name="close" size={19} /></button>
            </header>
            <div className="em-reporte-turno-rango" aria-label="Rango del turno que se exportará">
              <label>Desde<input type="datetime-local" value={desdeReporteTurno} max={hastaReporteTurno || undefined} onChange={(event) => setDesdeReporteTurno(event.target.value)} /></label>
              <label>Hasta<input type="datetime-local" value={hastaReporteTurno} min={desdeReporteTurno || undefined} onChange={(event) => setHastaReporteTurno(event.target.value)} /></label>
            </div>
            <p className="em-reporte-turno-ayuda">El PDF incluirá los registros dentro del período seleccionado.</p>
            <footer className="em-reporte-preview-acciones">
              <button type="button" className="em-secundario" onClick={() => setHojasReportePendientes(null)}>Cancelar</button>
              <button type="button" className="em-primario" onClick={() => { const hojas = hojasReportePendientes || undefined; setHojasReportePendientes(null); void exportarReporteTurnoVertical(hojas); }}><Icon name="download" size={16} /> Exportar</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
