import { InsumosEnfermeriaPanel } from "../emergencias/InsumosEnfermeriaPanel";
import "../emergencias/TriajeEmergenciasView.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import {
  guardarEvolucionEnfermeriaInternacion,
  guardarRegistroBalanceInternacion,
  guardarSignosInternacion,
  leerBalanceInternacion,
  leerEvolucionesEnfermeriaInternacion,
  leerSignosInternacion,
  type EvolucionEnfermeriaInternacion,
  type RegistroBalanceInternacion,
  type RegistroInternacion,
  type TomaSignosInternacion,
} from "./registroInternaciones";
import {
  leerSolicitudesLaboratorio,
  suscribirLaboratorio,
  type SolicitudLaboratorio,
} from "../laboratorio/almacenLaboratorio";
import "./AtencionEnfermeriaInternacion.css";
import "./BalanceEmergenciasCompartido.css";

const campos = [["temperatura", "Temperatura", "°C"], ["glicemia", "Glicemia capilar", "mg/dL"], ["frecuenciaCardiaca", "Frecuencia cardíaca", "P/min"], ["frecuenciaRespiratoria", "Frecuencia respiratoria", "Res/min"], ["presionSistolica", "Presión sistólica", "mmHg"], ["presionDiastolica", "Presión diastólica", "mmHg"], ["saturacion", "Saturación ambiente", "%"], ["oxigeno", "Oxígeno", "L"], ["saturacionOxigeno", "Saturación con oxígeno", "%"], ["peso", "Peso", "kg"], ["estatura", "Estatura", "cm"], ["imc", "IMC", "kg/m²"]] as const;
const fecha = (v: string) => new Date(v).toLocaleString("es-BO");
const horaIngreso = (v: string) => new Date(v).toLocaleTimeString("es-BO", {hour:"2-digit",minute:"2-digit",hour12:false});
function GraficaEvolucionSignos({
  mediciones,
  camposGrafica = campos,
}: {
  mediciones: { id: string; fecha: string; valores: Record<string, string | number>; observacion?: string }[];
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
      .filter((punto) => punto.medicion.valores[id] !== undefined && punto.medicion.valores[id] !== "" && Number.isFinite(punto.valor));
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
export function AtencionEnfermeriaInternacion({
  paciente,
  onVolver,
  unidad,
}: {
  paciente: RegistroInternacion;
  onVolver: () => void;
  unidad?: "internacion" | "uci";
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const fechaHoraActual = () => {
    const ahora = new Date();
    return {
      fecha: `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`,
      hora: `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`,
    };
  };

  const [seccionPaciente, setSeccionPaciente] = useState<"ingreso" | "atencion" | "reportes">("ingreso");
  const [evoluciones, setEvoluciones] = useState<EvolucionEnfermeriaInternacion[]>(() => leerEvolucionesEnfermeriaInternacion(paciente.id));
  const [textoEvolucion, setTextoEvolucion] = useState("");
  const [fechaHoraEvolucion, setFechaHoraEvolucion] = useState(fechaHoraActual);
  const [evolucionEditando, setEvolucionEditando] = useState<string | null>(null);
  const [evolucionEnVista, setEvolucionEnVista] = useState<EvolucionEnfermeriaInternacion | null>(null);
  const [errorEvolucion, setErrorEvolucion] = useState("");
  const [signos, setSignos] = useState<TomaSignosInternacion[]>(() => leerSignosInternacion(paciente.id));
  const [formSignos, setFormSignos] = useState({ temperatura: "", frecuenciaCardiaca: "", frecuenciaRespiratoria: "", saturacion: "", presionSistolica: "", presionDiastolica: "" });
  const [errorSignos, setErrorSignos] = useState("");
  const [valoresSignos, setValoresSignos] = useState<Record<string, string>>({});
  const [fechaHoraSignos, setFechaHoraSignos] = useState(fechaHoraActual);
  const [observacionSignos, setObservacionSignos] = useState("");
  const [balance, setBalance] = useState<RegistroBalanceInternacion[]>(() => leerBalanceInternacion(paciente.id));
  const [formBalance, setFormBalance] = useState({ tipo: "ingreso" as "ingreso" | "egreso", volumen: "", detalle: "", anotacion: "", ...fechaHoraActual() });
  const [errorBalance, setErrorBalance] = useState("");
  const [solicitudesLaboratorio, setSolicitudesLaboratorio] = useState<
    SolicitudLaboratorio[]
  >([]);
  const [errorLaboratorio, setErrorLaboratorio] = useState("");
  useEffect(() => {
    const cargar = () => {
      try {
        setSolicitudesLaboratorio(leerSolicitudesLaboratorio());
        setErrorLaboratorio("");
      } catch {
        setErrorLaboratorio("No se pudieron cargar las indicaciones de laboratorio.");
      }
    };
    const cancelar = suscribirLaboratorio(cargar);
    cargar();
    return cancelar;
  }, []);
  const datos = paciente.datosPaciente ?? {};
  const responsable =
    datos.responsableNombre || datos.responsable || "Sin registro";
  const telefonoResponsable = datos.responsableTelefono || "Sin teléfono";
  const fechaIngreso = paciente.fechaIngreso || paciente.fecha;
  const fechaVisible = (() => {
    if (!fechaIngreso) return "Sin registro";
    if (/^\d{4}-\d{2}-\d{2}/.test(fechaIngreso))
      return new Date(
        `${fechaIngreso.slice(0, 10)}T00:00:00`,
      ).toLocaleDateString("es-BO");
    const partes = fechaIngreso.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (partes)
      return new Date(
        Number(partes[3]),
        Number(partes[2]) - 1,
        Number(partes[1]),
      ).toLocaleDateString("es-BO");
    const valor = new Date(fechaIngreso);
    return Number.isNaN(valor.getTime())
      ? fechaIngreso
      : valor.toLocaleDateString("es-BO");
  })();
  const indicacionesLaboratorio = solicitudesLaboratorio.filter(
    (solicitud) =>
      solicitud.origen === "internacion" &&
      Boolean(paciente.ci?.trim()) && solicitud.ci?.trim() === paciente.ci.trim(),
  );
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  useEffect(() => {
    setEvoluciones(leerEvolucionesEnfermeriaInternacion(paciente.id));
    const actualizar = (evento: StorageEvent) => {
      if (evento.key === "hme:internacion:evoluciones-enfermeria:v1") {
        setEvoluciones(leerEvolucionesEnfermeriaInternacion(paciente.id));
      }
    };
    window.addEventListener("storage", actualizar);

  return () => window.removeEventListener("storage", actualizar);
  }, [paciente.id]);

  useEffect(() => {
    setSignos(leerSignosInternacion(paciente.id));
    const actualizar = (evento: StorageEvent) => {
      if (evento.key === "hme:internacion:signos-vitales:v1") {
        setSignos(leerSignosInternacion(paciente.id));
      }
    };
    window.addEventListener("storage", actualizar);
    return () => window.removeEventListener("storage", actualizar);
  }, [paciente.id]);

  useEffect(() => {
    setBalance(leerBalanceInternacion(paciente.id));
    const actualizar = (evento: StorageEvent) => {
      if (evento.key === "hme:internacion:balance-hidrico:v1") {
        setBalance(leerBalanceInternacion(paciente.id));
      }
    };
    window.addEventListener("storage", actualizar);
    return () => window.removeEventListener("storage", actualizar);
  }, [paciente.id]);

  function guardarEvolucion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = textoEvolucion.trim();
    if (!texto) return;
    try {
      guardarEvolucionEnfermeriaInternacion(
        paciente.id,
        { texto, ...fechaHoraEvolucion },
        evolucionEditando ?? undefined,
      );
      setEvoluciones(leerEvolucionesEnfermeriaInternacion(paciente.id));
      setTextoEvolucion("");
      setFechaHoraEvolucion(fechaHoraActual());
      setEvolucionEditando(null);
      setErrorEvolucion("");
    } catch (error) {
      setErrorEvolucion((error as Error).message || "No se pudo guardar la evolución.");
    }
  }

  function registrarSignos(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    try {
      if (!Object.values(valoresSignos).some((valor) => valor.trim()) && !observacionSignos.trim()) { setErrorSignos("Ingresa al menos una medición o una observación."); return; }
      const numero = (clave: string) => valoresSignos[clave] ? Number(valoresSignos[clave]) : 0;
      guardarSignosInternacion(paciente.id, { temperatura: numero("temperatura"), frecuenciaCardiaca: numero("frecuenciaCardiaca"), frecuenciaRespiratoria: numero("frecuenciaRespiratoria"), saturacion: numero("saturacion"), presionSistolica: numero("presionSistolica"), presionDiastolica: numero("presionDiastolica"), valores: valoresSignos, observacion: observacionSignos.trim(), ...fechaHoraSignos });
      setSignos(leerSignosInternacion(paciente.id));
      setValoresSignos({}); setObservacionSignos(""); setFechaHoraSignos(fechaHoraActual());
      setErrorSignos("");
    } catch (error) {
      setErrorSignos((error as Error).message || "No se pudieron guardar los signos vitales.");
    }
  }

  function registrarBalance(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    try {
      guardarRegistroBalanceInternacion(paciente.id, {
        tipo: formBalance.tipo,
        volumen: Number(formBalance.volumen),
        detalle: formBalance.detalle.trim(),
        anotacion: formBalance.anotacion.trim(),
        fecha: formBalance.fecha,
        hora: formBalance.hora,
      });
      setBalance(leerBalanceInternacion(paciente.id));
      setFormBalance((actual) => ({ ...actual, volumen: "", detalle: "", anotacion: "", ...fechaHoraActual() }));
      setErrorBalance("");
    } catch (error) {
      setErrorBalance((error as Error).message || "No se pudo guardar el balance hídrico.");
    }
  }

  const totalIngresos = balance.filter((registro) => registro.tipo === "ingreso").reduce((total, registro) => total + registro.volumen, 0);
  const totalEgresos = balance.filter((registro) => registro.tipo === "egreso").reduce((total, registro) => total + registro.volumen, 0);
  const balanceAcumulado = totalIngresos - totalEgresos;
  let acumuladoTemporal = 0;
  const puntosBalance = balance.map((registro, indice) => {
    acumuladoTemporal += registro.tipo === "ingreso" ? registro.volumen : -registro.volumen;
    return { ...registro, acumulado: acumuladoTemporal, indice };
  });


  const panelSignos = (
    <section className="em-panel em-signos-panel">
      <header className="em-panel-titulo"><div><h3>Signos vitales</h3></div></header>
      <div className="em-signos-columnas">
        <GraficaEvolucionSignos mediciones={signos.map((toma) => ({ id: toma.id, fecha: toma.fecha + "T" + toma.hora, observacion: toma.observacion, valores: toma.valores ?? { temperatura: toma.temperatura, frecuenciaCardiaca: toma.frecuenciaCardiaca, frecuenciaRespiratoria: toma.frecuenciaRespiratoria, saturacion: toma.saturacion, presionSistolica: toma.presionSistolica, presionDiastolica: toma.presionDiastolica } }))} />
        <form className="em-signos-formulario" onSubmit={registrarSignos}>
          <h4>Registrar signos vitales</h4>
          <div className="em-signos-fecha-hora"><label>Fecha de la medición<input type="date" required value={fechaHoraSignos.fecha} onChange={(e) => setFechaHoraSignos({ ...fechaHoraSignos, fecha:e.target.value })} /></label><label>Hora de la medición<input type="time" required value={fechaHoraSignos.hora} onChange={(e) => setFechaHoraSignos({ ...fechaHoraSignos, hora:e.target.value })} /></label></div>
          <div className="em-form-grid em-signos">{campos.map(([id, etiqueta, unidad]) => <label key={id}>{etiqueta}<span><input type="number" step="any" value={valoresSignos[id] || ""} onChange={(e) => setValoresSignos({ ...valoresSignos, [id]: e.target.value })} />{unidad}</span></label>)}</div>
          <label>Observación o motivo de medición no disponible<textarea maxLength={1000} value={observacionSignos} onChange={(e) => setObservacionSignos(e.target.value)} /></label>
          {errorSignos && <p role="alert">{errorSignos}</p>}<div className="em-acciones"><button className="em-primario" type="submit">Guardar signos vitales</button></div>
        </form>
      </div>
    </section>
  );

  const panelBalance = (
                    <section className="em-panel em-balance-emergencias" aria-label="Balance hídrico">
                      <header className="em-balance-emergencias-cabecera">
                        <div>
                          <span>CONTROL DE LÍQUIDOS</span>
                          <h3>Balance hídrico</h3>
                        </div>
                        <b>{balance.length} {balance.length === 1 ? "registro" : "registros"}</b>
                      </header>
                      <div className="em-balance-emergencias-resumen">
                        <article><small>Ingresos</small><strong>{totalIngresos.toLocaleString("es-BO")} ml</strong></article>
                        <article><small>Egresos</small><strong>{totalEgresos.toLocaleString("es-BO")} ml</strong></article>
                        <article className={balanceAcumulado < 0 ? "negativo" : "positivo"}><small>Balance acumulado</small><strong>{balanceAcumulado > 0 ? "+ " : ""}{balanceAcumulado.toLocaleString("es-BO")} ml</strong></article>
                      </div>
                      <div className="em-balance-emergencias-cuerpo">
                      <div className="em-balance-emergencias-visualizacion">
                      <section className="em-balance-emergencias-grafica" aria-label="Gráfica de ingresos y egresos">
                        <h4>Ingresos y egresos por movimiento</h4>
                        {puntosBalance.length ? (() => {
                          const tope = Math.max(...puntosBalance.map((punto) => punto.volumen), 100);
                          const escala = tope * 1.18;
                          const yCero = 128;
                          const alturaMaxima = 92;
                          const anchoDisponible = 742;
                          const anchoGrupo = anchoDisponible / puntosBalance.length;
                          const anchoBarra = Math.min(54, Math.max(16, anchoGrupo * 0.58));
                          const guias = [0, 0.5, 1].map((fraccion) => ({ y: yCero - fraccion * alturaMaxima, valor: escala * fraccion }));
                          return <><div className="em-balance-emergencias-leyenda"><span><i className="ingreso" /> Ingreso</span><span><i className="egreso" /> Egreso</span><small>{puntosBalance.length} movimientos · balance neto {balanceAcumulado > 0 ? "+" : ""}{balanceAcumulado.toLocaleString("es-BO")} ml</small></div><svg viewBox="0 0 800 225" role="img" aria-label="Gráfica de columnas de ingresos y egresos en mililitros; escala ajustada al mayor movimiento"><path d={guias.map((guia) => `M58 ${guia.y}H780`).join(" ")} /><path className="em-balance-emergencias-cero" d={`M58 ${yCero}H780`} />{guias.map((guia, indice) => <text className="em-balance-emergencias-eje" key={`eje-${indice}`} x="50" y={guia.y + 4}>{Math.round(guia.valor).toLocaleString("es-BO")}</text>)}{puntosBalance.map((punto, indice) => {
                            const centro = 58 + anchoGrupo * (indice + 0.5);
                            const altura = Math.max(3, (punto.volumen / escala) * alturaMaxima);
                            const ingreso = punto.tipo === "ingreso";
                            const y = ingreso ? yCero - altura : yCero;
                            const etiquetaY = ingreso ? y - 6 : y + altura + 13;
                            return <g key={punto.id} className={`em-balance-emergencias-barra ${punto.tipo}`}><rect x={centro - anchoBarra / 2} y={y} width={anchoBarra} height={altura} rx="4"><title>{`${ingreso ? "Ingreso" : "Egreso"}: ${punto.detalle} · ${punto.volumen.toLocaleString("es-BO")} ml · ${punto.hora}`}</title></rect><text className="em-balance-emergencias-volumen" x={centro} y={etiquetaY} textAnchor="middle">{punto.volumen.toLocaleString("es-BO")}</text><text className="em-balance-emergencias-hora" x={centro} y="218" textAnchor="middle">{punto.hora}</text></g>;
                          })}</svg></>;
                        })() : <><div className="em-balance-emergencias-leyenda"><span><i className="ingreso" /> Ingreso</span><span><i className="egreso" /> Egreso</span><small>Se actualizará con cada movimiento</small></div><svg className="em-balance-emergencias-sin-datos" viewBox="0 0 800 225" role="img" aria-label="Gráfica vacía de ingresos y egresos"><path d="M58 34H780M58 73H780M58 112H780M58 151H780" /><path className="em-balance-emergencias-cero" d="M58 112H780" /><text className="em-balance-emergencias-eje" x="50" y="38">—</text><text className="em-balance-emergencias-eje" x="50" y="77">—</text><text className="em-balance-emergencias-eje" x="50" y="116">0</text><text className="em-balance-emergencias-eje" x="50" y="155">—</text><text x="420" y="111">Registra el primer movimiento para comparar ingresos y egresos</text></svg></>}
                      </section>
                      {balance.length > 0 && <ol className="em-balance-emergencias-historial">
                        {balance.slice().reverse().map((registro) => <li key={registro.id} className={registro.tipo}>
                          <span>{registro.tipo === "ingreso" ? "Ingreso" : "Egreso"}</span>
                          <div><strong>{registro.detalle}</strong>{registro.anotacion && <small>{registro.anotacion}</small>}</div>
                          <b>{registro.tipo === "ingreso" ? "+" : "−"}{registro.volumen.toLocaleString("es-BO")} ml</b>
                          <time>{new Date(`${registro.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {registro.hora}</time>
                        </li>)}
                      </ol>}
                      </div>
                      {<form className="em-balance-emergencias-form" onSubmit={registrarBalance}>
                        <fieldset className="em-balance-tipo-switch">
                          <legend>Tipo de registro</legend>
                          <div className="em-balance-tipo-pista" role="group" aria-label="Tipo de movimiento">
                            <button type="button" className={formBalance.tipo === "ingreso" ? "activo ingreso" : "ingreso"} aria-pressed={formBalance.tipo === "ingreso"} onClick={() => setFormBalance((actual) => ({ ...actual, tipo: "ingreso" }))}><span aria-hidden="true">＋</span><span><strong>Ingreso</strong><small>Entra líquido</small></span></button>
                            <button type="button" className={formBalance.tipo === "egreso" ? "activo egreso" : "egreso"} aria-pressed={formBalance.tipo === "egreso"} onClick={() => setFormBalance((actual) => ({ ...actual, tipo: "egreso" }))}><span aria-hidden="true">−</span><span><strong>Egreso</strong><small>Sale líquido</small></span></button>
                          </div>
                        </fieldset>
                        <label>Volumen (ml)<input type="number" min="1" step="1" placeholder="Ej. 250" value={formBalance.volumen} onChange={(evento) => setFormBalance((actual) => ({ ...actual, volumen: evento.target.value }))} required /></label>
                        <label className="em-balance-emergencias-detalle">Detalle<input maxLength={180} placeholder={formBalance.tipo === "ingreso" ? "Ej. Solución intravenosa, agua" : "Ej. Diuresis, drenaje"} value={formBalance.detalle} onChange={(evento) => setFormBalance((actual) => ({ ...actual, detalle: evento.target.value }))} required /></label>
                        <label className="em-balance-emergencias-anotacion">Anotación clínica<textarea maxLength={1000} rows={2} placeholder="Observación de enfermería relacionada con este registro" value={formBalance.anotacion} onChange={(evento) => setFormBalance((actual) => ({ ...actual, anotacion: evento.target.value }))} /></label>
                        <div className="em-balance-fecha-hora">
                          <label>Fecha<input type="date" value={formBalance.fecha} onChange={(evento) => setFormBalance((actual) => ({ ...actual, fecha: evento.target.value }))} required /></label>
                          <label>Hora<input type="time" value={formBalance.hora} onChange={(evento) => setFormBalance((actual) => ({ ...actual, hora: evento.target.value }))} required /></label>
                        </div>
                        {errorBalance && <p role="alert">{errorBalance}</p>}
                        <button type="submit"><Icon name="plus" size={16} /> Registrar balance</button>
                      </form>}
                      
                      </div>
                    </section>
  );


  return (
    <section
      className={`enfermeria-paciente${unidad === "uci" ? " enfermeria-paciente-uci" : ""}`}
      aria-labelledby="enfermeria-paciente-titulo"
    >
      <button
        type="button"
        className="enfermeria-paciente-volver"
        onClick={onVolver}
      >
        <Icon name="chevronLeft" size={17} />
        {unidad === "uci" ? "Volver a pacientes UCI" : "Volver a pacientes internados"}
      </button>
      <section
        className="enfermeria-paciente-resumen"
        aria-label="Información de atención del paciente"
      >
        <header>
          <div className="enfermeria-resumen-identidad">
            <h2 id="enfermeria-paciente-titulo" ref={titulo} tabIndex={-1}>
              {paciente.paciente}
            </h2>
            <span className="enfermeria-resumen-ci">HC-{paciente.ci || "S/R"} · {unidad === "uci" ? "UCI" : "Internado"}</span>
            <span className="enfermeria-resumen-diagnostico">Diagnóstico: {paciente.motivo || "Sin registro"}</span>
          </div>
          <div className="enfermeria-resumen-contexto">
            <div>
              <span>Fecha de ingreso</span>
              <strong>{fechaVisible}</strong>
            </div>
            <div>
              <span>Ubicación actual</span>
              <strong>
                Sala {paciente.sala || "—"} · Cama {paciente.cama || "—"}
              </strong>
            </div>
          </div>
        </header>
        <div className="enfermeria-resumen-datos">
          <article>
            <span>
              <Icon name="patient" size={16} />
            </span>
            <div>
              <small>Familiar responsable</small>
              <strong>
                {responsable} · {telefonoResponsable}
              </strong>
            </div>
          </article>
          <article>
            <span>
              <Icon name="userCheck" size={16} />
            </span>
            <div>
              <small>Médico responsable</small>
              <strong>{paciente.medico || "Sin asignar"}</strong>
            </div>
          </article>
        </div>
      </section>
      <section className="enfermeria-paciente-flujo">
        <nav className="enfermeria-flujo-nav" aria-label="Secciones de enfermería del paciente">
          <button type="button" className={seccionPaciente === "ingreso" ? "activo" : ""} aria-current={seccionPaciente === "ingreso" ? "page" : undefined} onClick={() => setSeccionPaciente("ingreso")}><span aria-hidden="true"><Icon name="home" size={17} /></span>{unidad === "uci" ? "Ingreso del paciente" : "Evolución del paciente"}</button>
          <button type="button" className={seccionPaciente === "atencion" ? "activo" : ""} aria-current={seccionPaciente === "atencion" ? "page" : undefined} onClick={() => setSeccionPaciente("atencion")}><span aria-hidden="true"><Icon name="stethoscope" size={17} /></span>Atención del paciente</button>
          <button type="button" className={seccionPaciente === "reportes" ? "activo" : ""} aria-current={seccionPaciente === "reportes" ? "page" : undefined} onClick={() => setSeccionPaciente("reportes")}><span aria-hidden="true"><Icon name="clipboardMedical" size={17} /></span>Reportes</button>
          {unidad !== "uci" && <button type="button" className="enfermeria-resumen-trasladar"><Icon name="bed" size={16} /> Trasladar paciente</button>}
        </nav>
        {seccionPaciente === "reportes" && (
          <section className="enfermeria-reporte-panel" aria-labelledby="enfermeria-reporte-titulo">
            <header><div><span>RESUMEN DE INTERNACIÓN</span><h3 id="enfermeria-reporte-titulo">Reportes de enfermería</h3><strong className="enfermeria-reporte-servicio">SERVICIO DE INTERNACIÓN</strong><p>Registros clínicos asociados a esta internación.</p></div><button type="button" onClick={() => window.print()}><Icon name="fileText" size={16} /> Imprimir reporte</button></header>
            <div className="enfermeria-reporte-metricas">
              <article><small>Evoluciones</small><strong>{evoluciones.length}</strong></article>
              <article><small>Tomas de signos</small><strong>{signos.length}</strong></article>
              <article><small>Movimientos de balance</small><strong>{balance.length}</strong></article>
              <article><small>Indicaciones</small><strong>{indicacionesLaboratorio.length}</strong></article>
              <article><small>Balance acumulado</small><strong>{balanceAcumulado.toLocaleString("es-BO")} ml</strong></article>
            </div>
            <section className="enfermeria-reporte-seccion"><h4>Últimos registros de enfermería</h4>
              {evoluciones.length ? <ol>{evoluciones.slice().reverse().slice(0, 5).map((item) => <li key={item.id}><time>{new Date(`${item.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {item.hora}</time><p>{item.texto}</p></li>)}</ol> : <p className="enfermeria-reporte-vacio">Aún no hay evoluciones registradas para esta internación.</p>}
            </section>
            {signos.length > 0 && <section className="enfermeria-reporte-seccion"><h4>Última toma de signos vitales</h4>{(() => { const toma = signos.at(-1)!; return <div className="enfermeria-reporte-signos"><span>Temperatura <b>{toma.temperatura} °C</b></span><span>Frecuencia cardíaca <b>{toma.frecuenciaCardiaca} lpm</b></span><span>Frecuencia respiratoria <b>{toma.frecuenciaRespiratoria} rpm</b></span><span>Saturación <b>{toma.saturacion}%</b></span><span>Presión arterial <b>{toma.presionSistolica}/{toma.presionDiastolica} mmHg</b></span><time>{new Date(`${toma.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {toma.hora}</time></div>; })()}</section>}
          </section>
        )}
        {seccionPaciente === "ingreso" && unidad !== "uci" && (
          <section className="enfermeria-paciente-subvistas">
          <section className="enfermeria-evolucion">
            <div className="enfermeria-evolucion-layout">
              <form className="enfermeria-evolucion-form" onSubmit={guardarEvolucion}>
                <label className="enfermeria-evolucion-texto">
                  Evolución de enfermería
                  <textarea
                    value={textoEvolucion}
                    maxLength={5000}
                    rows={5}
                    placeholder="Escribe aquí la evolución de enfermería del paciente."
                    onChange={(evento) => setTextoEvolucion(evento.target.value)}
                    required
                  />
                </label>
                <div className="enfermeria-evolucion-fecha-hora">
                  <label>
                    Fecha de la evolución
                    <input type="date" value={fechaHoraEvolucion.fecha} required onChange={(evento) => setFechaHoraEvolucion((actual) => ({ ...actual, fecha: evento.target.value }))} />
                  </label>
                  <label>
                    Hora de la evolución
                    <input type="time" value={fechaHoraEvolucion.hora} required onChange={(evento) => setFechaHoraEvolucion((actual) => ({ ...actual, hora: evento.target.value }))} />
                  </label>
                </div>
                <div className="enfermeria-evolucion-acciones">
                  {errorEvolucion && <p role="alert">{errorEvolucion}</p>}
                  {evolucionEditando && <button type="button" onClick={() => { setEvolucionEditando(null); setTextoEvolucion(""); setFechaHoraEvolucion(fechaHoraActual()); setErrorEvolucion(""); }}>Cancelar edición</button>}
                  <button className="enfermeria-evolucion-guardar" type="submit" disabled={!textoEvolucion.trim()}>
                    {evolucionEditando ? "Actualizar evolución" : "Guardar evolución"}
                  </button>
                </div>
              </form>
              <aside className="enfermeria-evolucion-historial" aria-label="Historial de anotaciones de enfermería">
                <header>
                  <div>
                    <h3>Historial de anotaciones</h3>
                    <small>Evoluciones registradas durante esta internación</small>
                  </div>
                  <span>{evoluciones.length}</span>
                </header>
                {evoluciones.length ? (
                  <div className="enfermeria-evolucion-lista">
                    {evoluciones.slice().reverse().map((evolucion) => (
                      <article key={evolucion.id}>
                        <small>{new Date(`${evolucion.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {evolucion.hora}</small>
                        <p>{evolucion.texto}</p>
                        <div className="enfermeria-evolucion-item-acciones">
                          <button type="button" onClick={() => setEvolucionEnVista(evolucion)}>Ver</button>
                          <button type="button" onClick={() => {
                            setEvolucionEditando(evolucion.id);
                            setTextoEvolucion(evolucion.texto);
                            setFechaHoraEvolucion({ fecha: evolucion.fecha, hora: evolucion.hora });
                            document.querySelector(".enfermeria-evolucion-texto textarea")?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}>Editar</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="enfermeria-evolucion-vacia">Todavía no hay anotaciones para esta internación.</p>
                )}
              </aside>
            </div>
            {evolucionEnVista && (
              <div className="enfermeria-evolucion-modal-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setEvolucionEnVista(null); }}>
                <section className="enfermeria-evolucion-modal" role="dialog" aria-modal="true" aria-labelledby="enfermeria-evolucion-modal-titulo">
                  <header><div><small>REGISTRO DE ENFERMERÍA</small><h3 id="enfermeria-evolucion-modal-titulo">Detalle de la evolución</h3></div><button type="button" aria-label="Cerrar" onClick={() => setEvolucionEnVista(null)}>×</button></header>
                  <p>{evolucionEnVista.texto}</p>
                  <small>{new Date(`${evolucionEnVista.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {evolucionEnVista.hora}</small>
                </section>
              </div>
            )}
          </section>
          </section>
        )}
        {seccionPaciente === "atencion" && <section className="enfermeria-paciente-subvistas">
        {errorLaboratorio && <p role="alert">{errorLaboratorio}</p>}
          <div className="enfermeria-atencion-seguimiento">
            <InsumosEnfermeriaPanel onUtilizar={async (item, cantidad) => {
              try {
                guardarEvolucionEnfermeriaInternacion(paciente.id, {
                  texto: `Insumo utilizado: ${item.nombre}. Cantidad: ${cantidad} ${item.unidad}.`,
                  ...fechaHoraActual(),
                });
                setEvoluciones(leerEvolucionesEnfermeriaInternacion(paciente.id));
                setErrorEvolucion("");
                return true;
              } catch {
                setErrorEvolucion("No se pudo registrar el insumo. Intenta nuevamente.");
                return false;
              }
            }} />

          <section className="enfermeria-indicaciones">
            <header>
              <div>
                <span>ÓRDENES ACTIVAS</span>
                <h3>Indicaciones médicas del paciente</h3>
              </div>
              <b>{indicacionesLaboratorio.length}</b>
            </header>
            {indicacionesLaboratorio.length ? (
              <ul>
                {indicacionesLaboratorio.map((solicitud) => (
                  <li key={solicitud.id}>
                    <span>
                      <Icon name="lab" size={17} />
                    </span>
                    <div>
                      <strong>Orden de laboratorio</strong>
                      <small>
                        {solicitud.estudios
                          .map((estudio) => estudio.nombre)
                          .join(" · ")}
                      </small>
                      <em>
                        Solicitada por{" "}
                        {solicitud.solicitadoPor ||
                          solicitud.medico ||
                          "Médico de internación"}
                      </em>
                    </div>
                    <time>
                      {new Date(solicitud.fecha).toLocaleDateString("es-BO")}
                    </time>
                    <b className={`estado-${solicitud.estado}`}>
                      {solicitud.estado === "en_proceso"
                        ? "En proceso"
                        : solicitud.estado === "completado"
                          ? "Completada"
                          : solicitud.estado === "anulado"
                            ? "Anulada"
                            : "Pendiente"}
                    </b>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="enfermeria-indicaciones-vacio">
                <Icon name="fileText" size={25} />
                <strong>Sin indicaciones médicas</strong>
                <small>
                  Las órdenes emitidas por el médico aparecerán aquí.
                </small>
              </div>
            )}
          </section>
          </div>
      </section>}
      </section>
    </section>
  );
}
