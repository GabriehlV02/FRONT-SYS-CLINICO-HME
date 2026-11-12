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

export function AtencionEnfermeriaInternacion({
  paciente,
  onVolver,
}: {
  paciente: RegistroInternacion;
  onVolver: () => void;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const fechaHoraActual = () => {
    const ahora = new Date();
    return {
      fecha: `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`,
      hora: `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`,
    };
  };
  const [subvista, setSubvista] = useState<"evolucion" | "indicaciones">(
    "evolucion",
  );
  const [evoluciones, setEvoluciones] = useState<EvolucionEnfermeriaInternacion[]>(() => leerEvolucionesEnfermeriaInternacion(paciente.id));
  const [textoEvolucion, setTextoEvolucion] = useState("");
  const [fechaHoraEvolucion, setFechaHoraEvolucion] = useState(fechaHoraActual);
  const [evolucionEditando, setEvolucionEditando] = useState<string | null>(null);
  const [evolucionEnVista, setEvolucionEnVista] = useState<EvolucionEnfermeriaInternacion | null>(null);
  const [errorEvolucion, setErrorEvolucion] = useState("");
  const [signos, setSignos] = useState<TomaSignosInternacion[]>(() => leerSignosInternacion(paciente.id));
  const [formSignos, setFormSignos] = useState({ temperatura: "", frecuenciaCardiaca: "", frecuenciaRespiratoria: "", saturacion: "", presionSistolica: "", presionDiastolica: "" });
  const [errorSignos, setErrorSignos] = useState("");
  const [balance, setBalance] = useState<RegistroBalanceInternacion[]>(() => leerBalanceInternacion(paciente.id));
  const [formBalance, setFormBalance] = useState({ tipo: "ingreso" as "ingreso" | "egreso", volumen: "", detalle: "" });
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
      solicitud.ci.trim() === paciente.ci.trim(),
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
      const fechaHora = fechaHoraActual();
      guardarSignosInternacion(paciente.id, {
        ...Object.fromEntries(Object.entries(formSignos).map(([clave, valor]) => [clave, Number(valor)])) as Omit<TomaSignosInternacion, "id" | "pacienteId" | "registradaEn" | "fecha" | "hora">,
        ...fechaHora,
      });
      setSignos(leerSignosInternacion(paciente.id));
      setFormSignos({ temperatura: "", frecuenciaCardiaca: "", frecuenciaRespiratoria: "", saturacion: "", presionSistolica: "", presionDiastolica: "" });
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
        ...fechaHoraActual(),
      });
      setBalance(leerBalanceInternacion(paciente.id));
      setFormBalance((actual) => ({ ...actual, volumen: "", detalle: "" }));
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

  const signosGrafica = [
    { clave: "temperatura", etiqueta: "Temperatura", unidad: "°C", color: "#e07b39" },
    { clave: "frecuenciaCardiaca", etiqueta: "Frecuencia cardíaca", unidad: "lpm", color: "#d95365" },
    { clave: "frecuenciaRespiratoria", etiqueta: "Frecuencia respiratoria", unidad: "rpm", color: "#7058bc" },
    { clave: "saturacion", etiqueta: "Saturación O₂", unidad: "%", color: "#168dbb" },
    { clave: "presionSistolica", etiqueta: "Presión sistólica", unidad: "mmHg", color: "#418b61" },
    { clave: "presionDiastolica", etiqueta: "Presión diastólica", unidad: "mmHg", color: "#459b91" },
  ] as const;

  return (
    <section
      className="enfermeria-paciente"
      aria-labelledby="enfermeria-paciente-titulo"
    >
      <button
        type="button"
        className="enfermeria-paciente-volver"
        onClick={onVolver}
      >
        <Icon name="chevronLeft" size={17} /> Volver a pacientes internados
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
            <span>| HC-{paciente.ci || "S/R"} · Internado</span>
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
          <article>
            <span>
              <Icon name="fileText" size={16} />
            </span>
            <div>
              <small>Diagnóstico de ingreso</small>
              <strong>{paciente.motivo || "Sin registro"}</strong>
            </div>
          </article>
        </div>
      </section>
      <section className="enfermeria-paciente-subvistas">
        {errorLaboratorio && <p role="alert">{errorLaboratorio}</p>}
        <nav aria-label="Información clínica del paciente">
          <button
            type="button"
            className={subvista === "evolucion" ? "activa" : ""}
            onClick={() => setSubvista("evolucion")}
          >
            <Icon name="fileText" size={16} /> Evolución del paciente
          </button>
          <button
            type="button"
            className={subvista === "indicaciones" ? "activa" : ""}
            onClick={() => setSubvista("indicaciones")}
          >
            <Icon name="lab" size={16} /> Indicaciones médicas{" "}
            <b>{indicacionesLaboratorio.length}</b>
          </button>
        </nav>
        {subvista === "evolucion" && (
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
            <section className="enfermeria-signos-panel" aria-label="Registro y evolución de signos vitales">
              <header>
                <div>
                  <span>CONTROL DE ENFERMERÍA</span>
                  <h3>Signos vitales</h3>
                  <p>Registra una toma para actualizar la gráfica del paciente.</p>
                </div>
                <b>{signos.length} {signos.length === 1 ? "toma" : "tomas"}</b>
              </header>
              <form className="enfermeria-signos-form" onSubmit={registrarSignos}>
                <label>Temperatura (°C)<input type="number" min="30" max="45" step="0.1" placeholder="36.8" value={formSignos.temperatura} onChange={(evento) => setFormSignos((actual) => ({ ...actual, temperatura: evento.target.value }))} required /></label>
                <label>Frecuencia cardíaca (lpm)<input type="number" min="20" max="250" placeholder="78" value={formSignos.frecuenciaCardiaca} onChange={(evento) => setFormSignos((actual) => ({ ...actual, frecuenciaCardiaca: evento.target.value }))} required /></label>
                <label>Frecuencia respiratoria (rpm)<input type="number" min="5" max="80" placeholder="18" value={formSignos.frecuenciaRespiratoria} onChange={(evento) => setFormSignos((actual) => ({ ...actual, frecuenciaRespiratoria: evento.target.value }))} required /></label>
                <label>Saturación O₂ (%)<input type="number" min="50" max="100" placeholder="98" value={formSignos.saturacion} onChange={(evento) => setFormSignos((actual) => ({ ...actual, saturacion: evento.target.value }))} required /></label>
                <label>Presión sistólica (mmHg)<input type="number" min="50" max="250" placeholder="120" value={formSignos.presionSistolica} onChange={(evento) => setFormSignos((actual) => ({ ...actual, presionSistolica: evento.target.value }))} required /></label>
                <label>Presión diastólica (mmHg)<input type="number" min="30" max="160" placeholder="80" value={formSignos.presionDiastolica} onChange={(evento) => setFormSignos((actual) => ({ ...actual, presionDiastolica: evento.target.value }))} required /></label>
                {errorSignos && <p className="enfermeria-signos-error" role="alert">{errorSignos}</p>}
                <button type="submit"><Icon name="plus" size={16} /> Registrar signos vitales</button>
              </form>
              <div className="enfermeria-signos-graficas">
                {signosGrafica.map((serie) => {
                  const valores = signos.map((toma) => toma[serie.clave]);
                  const minimo = Math.min(...valores);
                  const maximo = Math.max(...valores);
                  const rango = maximo - minimo || 1;
                  const puntos = valores.map((valor, indice) => {
                    const x = valores.length < 2 ? 160 : 12 + indice * (296 / (valores.length - 1));
                    const y = 62 - ((valor - minimo) / rango) * 42;
                    return `${x},${y}`;
                  }).join(" ");
                  const ultimo = signos.at(-1);
                  return (
                    <article key={serie.clave}>
                      <header><span style={{ color: serie.color }}>{serie.etiqueta}</span><strong>{ultimo ? `${ultimo[serie.clave]} ${serie.unidad}` : "Sin datos"}</strong></header>
                      {signos.length ? (
                        <svg viewBox="0 0 320 78" role="img" aria-label={`Gráfica de ${serie.etiqueta}`}>
                          <path className="enfermeria-signos-guia" d="M8 20H312M8 41H312M8 62H312" />
                          {signos.length > 1 && <polyline points={puntos} style={{ stroke: serie.color }} />}
                          {valores.map((valor, indice) => {
                            const x = valores.length < 2 ? 160 : 12 + indice * (296 / (valores.length - 1));
                            const y = 62 - ((valor - minimo) / rango) * 42;
                            return <circle key={signos[indice].id} cx={x} cy={y} r="3.5" style={{ fill: serie.color }} />;
                          })}
                        </svg>
                      ) : <p>Aún no hay tomas registradas.</p>}
                      {signos.length > 0 && <small>{signos.length} mediciones · más reciente {new Date(`${signos.at(-1)!.fecha}T12:00:00`).toLocaleDateString("es-BO")} {signos.at(-1)!.hora}</small>}
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="enfermeria-balance-panel" aria-label="Balance hídrico">
              <header>
                <div>
                  <span>CONTROL DE LÍQUIDOS</span>
                  <h3>Balance hídrico</h3>
                  <p>Registra los ingresos y egresos de líquidos del paciente.</p>
                </div>
                <b>{balance.length} {balance.length === 1 ? "registro" : "registros"}</b>
              </header>
              <div className="enfermeria-balance-resumen">
                <article><small>Ingresos</small><strong>{totalIngresos.toLocaleString("es-BO")} ml</strong></article>
                <article><small>Egresos</small><strong>{totalEgresos.toLocaleString("es-BO")} ml</strong></article>
                <article className={balanceAcumulado < 0 ? "negativo" : "positivo"}><small>Balance acumulado</small><strong>{balanceAcumulado > 0 ? "+ " : ""}{balanceAcumulado.toLocaleString("es-BO")} ml</strong></article>
              </div>
              <form className="enfermeria-balance-form" onSubmit={registrarBalance}>
                <label>Tipo de registro
                  <select value={formBalance.tipo} onChange={(evento) => setFormBalance((actual) => ({ ...actual, tipo: evento.target.value as "ingreso" | "egreso" }))}>
                    <option value="ingreso">Ingreso de líquidos</option>
                    <option value="egreso">Egreso de líquidos</option>
                  </select>
                </label>
                <label>Volumen (ml)<input type="number" min="1" step="1" placeholder="Ej. 250" value={formBalance.volumen} onChange={(evento) => setFormBalance((actual) => ({ ...actual, volumen: evento.target.value }))} required /></label>
                <label className="enfermeria-balance-detalle">Detalle<input maxLength={180} placeholder={formBalance.tipo === "ingreso" ? "Ej. Solución intravenosa, agua" : "Ej. Diuresis, drenaje"} value={formBalance.detalle} onChange={(evento) => setFormBalance((actual) => ({ ...actual, detalle: evento.target.value }))} required /></label>
                {errorBalance && <p role="alert">{errorBalance}</p>}
                <button type="submit"><Icon name="plus" size={16} /> Registrar balance</button>
              </form>
              <section className="enfermeria-balance-grafica" aria-label="Gráfica de balance acumulado">
                <h4>Evolución del balance acumulado</h4>
                {puntosBalance.length ? (() => {
                  const valores = [0, ...puntosBalance.map((punto) => punto.acumulado)];
                  const minimo = Math.min(...valores);
                  const maximo = Math.max(...valores);
                  const rango = maximo - minimo || 1;
                  const coordenadas = valores.map((valor, indice) => `${20 + indice * (760 / Math.max(valores.length - 1, 1))},${200 - ((valor - minimo) / rango) * 160}`).join(" ");
                  return <svg viewBox="0 0 800 230" role="img" aria-label="Gráfica de ingresos y egresos acumulados en mililitros"><path d="M20 40H780M20 120H780M20 200H780" /><polyline points={coordenadas} /><text x="20" y="222">Inicio</text>{puntosBalance.map((punto) => <text key={punto.id} x={20 + (punto.indice + 1) * (760 / Math.max(puntosBalance.length, 1))} y="222">{punto.hora}</text>)}</svg>;
                })() : <p>Aún no hay registros de ingresos o egresos para mostrar.</p>}
              </section>
              {balance.length > 0 && (
                <ol className="enfermeria-balance-historial">
                  {balance.slice().reverse().map((registro) => (
                    <li key={registro.id} className={registro.tipo}>
                      <span>{registro.tipo === "ingreso" ? "Ingreso" : "Egreso"}</span>
                      <strong>{registro.detalle}</strong>
                      <b>{registro.tipo === "ingreso" ? "+" : "−"}{registro.volumen.toLocaleString("es-BO")} ml</b>
                      <time>{new Date(`${registro.fecha}T12:00:00`).toLocaleDateString("es-BO")} · {registro.hora}</time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
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
        )}
        {subvista === "indicaciones" && (
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
        )}
      </section>
    </section>
  );
}
