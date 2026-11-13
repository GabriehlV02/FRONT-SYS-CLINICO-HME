import { evaluarPrioridad, type PrioridadAtencion } from "./prioridadAtencion";
import { esModoPruebaLocal } from "../../radius/datos/modoPrueba";
import { useState, useEffect } from "react";
import Icon from "../../radius/componentes/Icono";
import "./SignosVitalesView.css";
import "./ColaTriaje.css";
import type { SignoVitalConfig } from "./ConfiguracionSignosVitalesView";
import { guardarSignosVitales } from "./registroSignosVitales";
import { useServiciosSignosVitales } from "./ServiciosSignosVitales";
import { camposParaServicio, compararReferencia } from "./camposSignosVitales";
import { apiFetch } from "../../radius/api";
import { obtenerCitasAgendaDemo } from "../../radius/datos/agendaDemo";

type PacienteEnEspera = {
  id: string;
  pacienteId?: string;
  hora: string;
  fecha: string;
  estado?: string;
  paciente: string;
  ci: string;
  edad: number;
  doctor: string;
  especialidad: string;
  motivoConsulta?: string;
  signosRegistrados?: boolean;
};
type PacienteAtendido = PacienteEnEspera & {
  valores: Record<string, string>;
  registrado: string;
};
type MedicionHistorial = {
  id: string;
  nombre: string;
  unidad: string;
  valor: string | number;
};
type RegistroHistorial = {
  id: string;
  fecha: string;
  servicio: string;
  contexto: string;
  observacion: string;
  mediciones: MedicionHistorial[];
};

const claveColaDemo = "clinico.triaje.cola-demo.v2";
const claveAtendidosDemo = "clinico.triaje.atendidos-demo.v1";
const colaInicial: PacienteEnEspera[] = obtenerCitasAgendaDemo().map((cita) => ({
  ...cita,
  hora: cita.hora,
  edad: cita.edad,
}));
const atendidosIniciales: PacienteAtendido[] = [];

function leerListaDemo<T>(clave: string, inicial: T[]): T[] {
  try {
    const guardada = localStorage.getItem(clave);
    return guardada ? JSON.parse(guardada) as T[] : inicial;
  } catch {
    return inicial;
  }
}

const camposVitalesPredeterminados = [
  ["temperatura", "Temperatura", "°C"],
  ["glicemia", "Glicemia capilar", "mg/dL"],
  ["frecuenciaCardiaca", "Frec. cardíaca", "P/min"],
  ["frecuenciaRespiratoria", "Frec. respiratoria", "Res/min"],
  ["presionSistolica", "Presión sistólica", "mmHg"],
  ["presionDiastolica", "Presión diastólica", "mmHg"],
  ["saturacionAmbiente", "Saturación ambiente", "%"],
  ["oxigeno", "Oxígeno", "lts"],
  ["saturacionOxigeno", "Saturación oxígeno", "%"],
  ["perimetroCintura", "Perímetro cintura", "cm"],
  ["perimetroCadera", "Perímetro cadera", "cm"],
  ["peso", "Peso", "kg"],
  ["estatura", "Estatura", "cm"],
  ["imc", "IMC", ""],
] as const;

export function SignosVitalesView({
  camposConfigurados,
}: {
  camposConfigurados?: SignoVitalConfig[];
}) {
  const catalogoServicios = useServiciosSignosVitales();
  const esDemo = esModoPruebaLocal();
  const [cola, setCola] = useState(() => esDemo ? leerListaDemo(claveColaDemo, colaInicial) : []);
  const [errorPacientes, setErrorPacientes] = useState("");
  useEffect(() => {
    if (esDemo) return;
    const controller = new AbortController();
    apiFetch("/api/citas", { signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok)
          throw new Error("No se pudieron cargar las consultas.");
        const citas: PacienteEnEspera[] = (await respuesta.json()).map(
          (cita: PacienteEnEspera & { motivo?: string; motivoOperativo?: string }) => ({
            ...cita,
            motivoConsulta: cita.motivoConsulta || cita.motivo || cita.motivoOperativo || "",
          }),
        );
        const activas = citas.filter(
          (cita) =>
            cita.estado === "confirmada" || cita.estado === "por_confirmar",
        );
        setCola(activas.filter((cita) => !cita.signosRegistrados));
        setAtendidos(
          activas
            .filter((cita) => cita.signosRegistrados)
            .map((cita) => ({
              ...cita,
              valores: {},
              registrado: "Registrado",
            })),
        );
        setErrorPacientes("");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrorPacientes(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las consultas.",
          );
      });
    return () => controller.abort();
  }, [esDemo]);
  const [busqueda, setBusqueda] = useState("");
  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState<PacienteEnEspera | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [motivoConsulta, setMotivoConsulta] = useState("");
  const [atendidos, setAtendidos] =
    useState<PacienteAtendido[]>(() => esDemo ? leerListaDemo(claveAtendidosDemo, atendidosIniciales) : []);
  const [panelAtendidosAbierto, setPanelAtendidosAbierto] = useState(true);
  const [busquedaAtendidos, setBusquedaAtendidos] = useState("");
  const [editandoAtendido, setEditandoAtendido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState("");
  const [historialPaciente, setHistorialPaciente] = useState<
    RegistroHistorial[]
  >([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [versionValoracion, setVersionValoracion] = useState<number | null>(
    null,
  );
  useEffect(() => {
    const pacienteId = pacienteSeleccionado?.pacienteId;
    setHistorialPaciente([]);
    setErrorHistorial("");
    if (!pacienteId || esDemo) {
      setCargandoHistorial(false);
      return;
    }
    const controller = new AbortController();
    setCargandoHistorial(true);
    apiFetch(
      `/api/v1/pacientes/${encodeURIComponent(pacienteId)}/signos-vitales`,
      { signal: controller.signal },
    )
      .then(async (respuesta) => {
        if (!respuesta.ok)
          throw new Error("No se pudo cargar la historia de signos vitales.");
        const resultado = (await respuesta.json()) as {
          data?: RegistroHistorial[];
        };
        if (!Array.isArray(resultado.data))
          throw new Error("La historia de signos vitales tiene un formato inválido.");
        if (!controller.signal.aborted)
          setHistorialPaciente(resultado.data);
      })
      .catch((fallo) => {
        if (!controller.signal.aborted)
          setErrorHistorial(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar la historia de signos vitales.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoHistorial(false);
      });
    return () => controller.abort();
  }, [pacienteSeleccionado?.pacienteId, esDemo]);
  useEffect(() => {
    if (!esDemo) return;
    localStorage.setItem(claveColaDemo, JSON.stringify(cola));
    localStorage.setItem(claveAtendidosDemo, JSON.stringify(atendidos));
  }, [esDemo, cola, atendidos]);
  useEffect(() => {
    if (!esDemo) return;
    const actualizarAgenda = () => {
      const anteriores = new Map(cola.map((cita) => [cita.id, cita]));
      setCola(
        obtenerCitasAgendaDemo()
          .filter((cita) => cita.estado === "confirmada" || cita.estado === "por_confirmar")
          .map((cita) => ({
            ...cita,
            motivoConsulta: cita.motivoOperativo,
            signosRegistrados: anteriores.get(cita.id)?.signosRegistrados,
          })),
      );
    };
    window.addEventListener("citas:actualizadas", actualizarAgenda);
    window.addEventListener("pacientes:actualizados", actualizarAgenda);
    return () => {
      window.removeEventListener("citas:actualizadas", actualizarAgenda);
      window.removeEventListener("pacientes:actualizados", actualizarAgenda);
    };
  }, [esDemo, cola]);
  const atendidosVisibles = atendidos.filter((paciente) =>
    `${paciente.paciente} ${paciente.ci} ${paciente.doctor}`
      .toLocaleLowerCase()
      .includes(busquedaAtendidos.toLocaleLowerCase()),
  );
  const visibles = cola.filter((paciente) =>
    `${paciente.paciente} ${paciente.ci} ${paciente.doctor}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );
  const idsAmbulatorio = catalogoServicios.servicios.find(
    (servicio) => servicio.id === "consulta-ambulatoria",
  )?.signos;
  const camposVitales = camposConfigurados
    ? camposParaServicio(camposConfigurados, idsAmbulatorio ?? [])
    : camposVitalesPredeterminados.map(([id, etiqueta, unidad]) => ({
        id,
        etiqueta,
        unidad,
        tipo: "Número decimal",
        rango: undefined,
        alertaPrioritaria: false,
      }));
  const gruposVitales = camposVitales.reduce<
    { id: string; nombre: string; campos: typeof camposVitales }[]
  >((grupos, campo) => {
    const separador = campo.id.indexOf("::");
    const id = separador < 0 ? campo.id : campo.id.slice(0, separador);
    let grupo = grupos.find((actual) => actual.id === id);
    if (!grupo) {
      grupo = {
        id,
        nombre:
          camposConfigurados?.find((signo) => signo.id === id)?.nombre ||
          campo.etiqueta,
        campos: [],
      };
      grupos.push(grupo);
    }
    grupo.campos.push(campo);
    return grupos;
  }, []);

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!pacienteSeleccionado) return;
    const datos = Object.fromEntries(
      camposVitales
        .map((campo) => [campo.id, (valores[campo.id] || "").trim()])
        .filter(([, valor]) => valor),
    );
    if (!Object.keys(datos).length) {
      setErrorRegistro("Registra al menos una medición.");
      return;
    }
    setGuardando(true);
    setErrorRegistro("");
    try {
      let prioridad: PrioridadAtencion | null = evaluarPrioridad(camposVitales, datos, pacienteSeleccionado.edad > 0 ? pacienteSeleccionado.edad : null);
      if (!esDemo) {
        const respuesta = await apiFetch(
          `/api/v1/citas/${encodeURIComponent(pacienteSeleccionado.id)}/signos-vitales`,
          {
            method: "POST",
          body: JSON.stringify({
            valores: datos,
            version: versionValoracion,
            motivoConsulta: motivoConsulta.trim(),
          }),
          },
        );
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok)
          throw new Error(
            resultado.message || "No se pudieron guardar los signos vitales.",
          );
        prioridad = resultado.data?.prioridad ?? null;
      }
      guardarSignosVitales(pacienteSeleccionado, datos, prioridad);
      if (editandoAtendido) {
        setAtendidos((actual) =>
          actual.map((item) =>
            item.id === pacienteSeleccionado.id
              ? { ...item, valores, registrado: "Ahora" }
              : item,
          ),
        );
      } else {
        setCola((actual) =>
          actual.filter((item) => item.id !== pacienteSeleccionado.id),
        );
        setAtendidos((actual) => [
          { ...pacienteSeleccionado, valores, registrado: "Ahora" },
          ...actual,
        ]);
      }
      setPacienteSeleccionado(null);
      setValores({});
      setMotivoConsulta("");
      setEditandoAtendido(false);
    } catch (error) {
      setErrorRegistro(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los signos vitales.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const editar = async (paciente: PacienteAtendido) => {
    setErrorPacientes("");
    if (esDemo) {
      setValores(paciente.valores);
      setMotivoConsulta(paciente.motivoConsulta || "");
      setVersionValoracion(1);
      setPacienteSeleccionado(paciente);
      setEditandoAtendido(true);
      setErrorRegistro("");
      return;
    }
    try {
      const respuesta = await apiFetch(
        `/api/v1/citas/${encodeURIComponent(paciente.id)}/signos-vitales`,
      );
      if (!respuesta.ok) throw new Error("No se pudo cargar la valoración.");
      const resultado = await respuesta.json();
      setValores(resultado.data?.valores ?? {});
      setMotivoConsulta(paciente.motivoConsulta || "");
      setVersionValoracion(resultado.data?.id ?? null);
      setPacienteSeleccionado(paciente);
      setEditandoAtendido(true);
      setErrorRegistro("");
    } catch (error) {
      setErrorPacientes(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la valoración.",
      );
    }
  };

  if (
    pacienteSeleccionado &&
    (catalogoServicios.cargando || catalogoServicios.error || !idsAmbulatorio)
  )
    return (
      <section className="signos-vitales-vista">
        <p role={catalogoServicios.cargando ? "status" : "alert"}>
          {catalogoServicios.cargando
            ? "Cargando signos configurados…"
            : catalogoServicios.error ||
              "No se encontró la configuración de consulta ambulatoria."}
        </p>
        <button type="button" onClick={() => setPacienteSeleccionado(null)}>
          Volver a la cola
        </button>
      </section>
    );
  if (pacienteSeleccionado)
    return (
      <section className="signos-vitales-vista">
        <header className="signos-vitales-cabecera">
          <div>
            <p>TRIAJE DE ENFERMERÍA</p>
            <h2>Registro de signos vitales</h2>
          </div>
          <button
            className="signos-volver"
            type="button"
            onClick={() => {
              setPacienteSeleccionado(null);
              setValores({});
              setMotivoConsulta("");
              setEditandoAtendido(false);
            }}
          >
            <Icon name="chevronLeft" size={16} />{" "}
            {editandoAtendido ? "Volver a atendidos" : "Volver a la cola"}
          </button>
        </header>
        <section
          className="signos-historial-paciente"
          aria-labelledby="signos-historial-titulo"
        >
          <header>
            <div>
              <h3 id="signos-historial-titulo">
                Historia de signos vitales
              </h3>
              <p>
                Mediciones anteriores de consulta y Emergencias, conservando su
                servicio y atención de origen.
              </p>
            </div>
            <span>{historialPaciente.length} registros</span>
          </header>
          {cargandoHistorial && (
            <p role="status">Cargando historia del paciente…</p>
          )}
          {errorHistorial && <p role="alert">{errorHistorial}</p>}
          {!cargandoHistorial &&
            !errorHistorial &&
            !pacienteSeleccionado.pacienteId && (
              <p>No hay una ficha identificada para consultar el historial.</p>
            )}
          {!cargandoHistorial &&
            !errorHistorial &&
            pacienteSeleccionado.pacienteId &&
            !historialPaciente.length && (
              <p>No hay mediciones previas registradas para este paciente.</p>
            )}
          {!!historialPaciente.length && (
            <ol>
              {historialPaciente.map((registro) => (
                <li key={registro.id}>
                  <header>
                    <time dateTime={registro.fecha}>
                      {new Date(registro.fecha).toLocaleString("es-BO")}
                    </time>
                    <strong>{registro.servicio}</strong>
                    <span>{registro.contexto}</span>
                  </header>
                  <dl>
                    {registro.mediciones.map((medicion) => (
                      <div key={`${registro.id}-${medicion.id}`}>
                        <dt>{medicion.nombre}</dt>
                        <dd>
                          {medicion.valor}
                          {medicion.unidad ? ` ${medicion.unidad}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {registro.observacion && <p>{registro.observacion}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
        <form className="formulario-signos" onSubmit={guardar}>
          <section className="formulario-signos-datos">
            <div className="formulario-datos-bloqueados">
              Datos asignados por Recepción
            </div>
            <label>
              Doctor
              <input value={pacienteSeleccionado.doctor} disabled />
            </label>
            <label className="formulario-paciente">
              Paciente
              <input value={pacienteSeleccionado.paciente} disabled />
            </label>
            <label>
              Edad
              <input value={`${pacienteSeleccionado.edad} años`} disabled />
            </label>
            <label>
              Hora de consulta
              <input value={pacienteSeleccionado.hora} disabled />
            </label>
            <label className="formulario-paciente">
              Especialidad
              <input value={pacienteSeleccionado.especialidad} disabled />
            </label>
            <label className="formulario-motivo-consulta">
              Motivo de consulta
              <textarea
                value={motivoConsulta}
                onChange={(evento) => setMotivoConsulta(evento.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Describe el motivo de consulta referido por el paciente o su acompañante."
              />
              <small>
                {motivoConsulta.length}/1000 caracteres
                {!motivoConsulta.trim() && " · Completa este dato si no fue registrado en recepción."}
              </small>
            </label>
          </section>
          <section className="formulario-signos-campos">
            <div className="triaje-mediciones-cabecera">
              <div>
                <strong>Mediciones</strong>
                <small>
                  Completa los signos vitales configurados para consulta
                  ambulatoria.
                </small>
              </div>
              <span>{gruposVitales.length} signos</span>
            </div>
            {!camposVitales.length && (
              <p role="status">
                Este servicio no tiene signos vitales asignados. Configúralos
                antes de registrar la valoración.
              </p>
            )}
            {[...gruposVitales]
              .sort(
                (a, b) =>
                  Number(b.campos.length > 1) - Number(a.campos.length > 1),
              )
              .map((grupo) => (
                <div
                  className={`triaje-signo-grupo ${grupo.campos.length > 1 ? "triaje-signo-grupo-multiple" : ""}`}
                  key={grupo.id}
                >
                  {grupo.campos.length > 1 && (
                    <strong className="triaje-signo-grupo-titulo">
                      {grupo.nombre}
                    </strong>
                  )}
                  <div className="triaje-signo-componentes">
                    {grupo.campos.map(
                      ({ id, etiqueta, unidad, tipo, rango }, indice) => {
                        const texto = tipo === "Texto";
                        const entero = tipo === "N\u00famero entero";
                        const estado = compararReferencia(
                          valores[id] || "",
                          rango,
                          pacienteSeleccionado.edad > 0
                            ? pacienteSeleccionado.edad
                            : null,
                        );
                        const nombreCampo =
                          grupo.campos.length > 1
                            ? etiqueta
                                .slice(grupo.nombre.length)
                                .replace(/^\s*·\s*/, "")
                            : etiqueta;
                        return (
                          <div className="triaje-signo-campo" key={id}>
                            {indice > 0 && (
                              <span
                                className="triaje-signo-barra"
                                aria-hidden="true"
                              >
                                /
                              </span>
                            )}
                            <label htmlFor={`triaje-signo-${id}`}>
                              {nombreCampo}
                            </label>
                            <div
                              className={`triaje-signo-entrada ${estado ? `triaje-signo-${estado}` : ""}`}
                            >
                              <input
                                id={`triaje-signo-${id}`}
                                type={texto ? "text" : "number"}
                                step={entero ? "1" : "any"}
                                inputMode={
                                  texto
                                    ? "text"
                                    : entero
                                      ? "numeric"
                                      : "decimal"
                                }
                                aria-label={
                                  grupo.campos.length > 1 ? etiqueta : undefined
                                }
                                aria-describedby={
                                  [
                                    rango && `referencia-${id}`,
                                    estado && `estado-${id}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") || undefined
                                }
                                value={valores[id] || ""}
                                onChange={(evento) =>
                                  setValores((actual) => ({
                                    ...actual,
                                    [id]: evento.target.value,
                                  }))
                                }
                                placeholder="—"
                              />
                              {unidad && <span>{unidad}</span>}
                            </div>
                            {estado && (
                              <small
                                className={`triaje-signo-estado ${estado}`}
                                id={`estado-${id}`}
                                role="status"
                              >
                                {estado === "alto"
                                  ? "Sobre la referencia"
                                  : "Bajo la referencia"}{" "}
                                · Orientativo
                              </small>
                            )}
                            {rango && (
                              <details
                                className="triaje-signo-referencia"
                                id={`referencia-${id}`}
                              >
                                <summary>
                                  Ref. {rango.minimo}–{rango.maximo} {unidad}
                                </summary>
                                <div>
                                  <strong>
                                    {rango.nombre || "Referencia"}
                                  </strong>
                                  {rango.contexto && <p>{rango.contexto}</p>}
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
                        );
                      },
                    )}
                  </div>
                </div>
              ))}
          </section>
          {errorRegistro && <p role="alert">{errorRegistro}</p>}
          <footer>
            <button
              className="signos-cancelar"
              type="button"
              disabled={guardando}
              onClick={() => {
                setPacienteSeleccionado(null);
                setValores({});
                setEditandoAtendido(false);
              }}
            >
              Cancelar
            </button>
            <button
              className="signos-guardar"
              type="submit"
              disabled={!camposVitales.length || guardando}
            >
              <Icon name="check" size={16} />{" "}
              {guardando
                ? "Guardando…"
                : editandoAtendido
                  ? "Actualizar signos vitales"
                  : "Guardar signos vitales"}
            </button>
          </footer>
        </form>
      </section>
    );

  return (
    <section className="signos-vitales-vista">
      <div className="signos-vitales-herramientas">
        <label>
          <Icon name="search" size={17} />
          <input
            aria-label="Buscar pacientes en espera"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por paciente, CI o médico"
          />
        </label>
        <button
          className="cola-toggle"
          type="button"
          aria-expanded={panelAtendidosAbierto}
          aria-controls="cola-atendidos"
          onClick={() => setPanelAtendidosAbierto((abierto) => !abierto)}
        >
          <Icon name="userCheck" size={17} />
          <span>Atendidos</span>
          <b>{atendidos.length}</b>
          <Icon
            name={panelAtendidosAbierto ? "chevronRight" : "chevronLeft"}
            size={16}
          />
        </button>
      </div>
      <div
        className={`signos-vitales-operacion ${panelAtendidosAbierto ? "panel-atendidos-abierto" : ""}`}
      >
        <section
          className="signos-vitales-lista"
          aria-label="Cola de pacientes para signos vitales"
        >
          {errorPacientes && <p role="alert">{errorPacientes}</p>}
          <header>
            <span>Hora / fecha</span>
            <span>Paciente</span>
            <span>Médico</span>
            <span>Especialidad</span>
            <span>Acción</span>
          </header>
          {visibles.map((paciente) => (
            <article key={paciente.id}>
              <time dateTime={`${paciente.fecha}T${paciente.hora}`}>
                <strong>{paciente.hora}</strong>
                <small>{paciente.fecha.split("-").reverse().join("/")}</small>
              </time>
              <div className="signos-paciente">
                <span>
                  {paciente.paciente
                    .split(" ")
                    .map((parte) => parte[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <strong>{paciente.paciente}</strong>
                  <small>CI {paciente.ci}</small>
                </div>
              </div>
              <div className="signos-consulta">
                <strong>{paciente.doctor}</strong>
                {paciente.estado === "por_confirmar" && (
                  <small>Por confirmar · Cobro pendiente de verificar</small>
                )}
              </div>
              <div className="signos-especialidad">{paciente.especialidad}</div>
              <button
                className="accion-registrar-signos"
                type="button"
                onClick={() => {
                  setVersionValoracion(null);
                  setErrorRegistro("");
                  setPacienteSeleccionado(paciente);
                }}
              >
                <Icon name="patient" size={16} /> Registrar
              </button>
            </article>
          ))}
          {!visibles.length && (
            <p className="signos-vitales-vacio">
              {busqueda
                ? "No hay pacientes que coincidan con la búsqueda."
                : "No hay consultas pendientes de atención."}
            </p>
          )}
        </section>
        <aside
          id="cola-atendidos"
          hidden={!panelAtendidosAbierto}
          className="signos-atendidos"
          aria-label="Pacientes atendidos"
        >
          <div className="signos-atendidos-contenido">
            <header>
              <div>
                <p>SIGNOS REGISTRADOS</p>
                <strong>Signos vitales registrados</strong>
              </div>
              <b>{atendidos.length}</b>
            </header>
            <label className="cola-buscar-atendidos">
              <Icon name="search" size={15} />
              <input
                aria-label="Buscar pacientes atendidos"
                value={busquedaAtendidos}
                onChange={(evento) => setBusquedaAtendidos(evento.target.value)}
                placeholder="Buscar atendido…"
              />
            </label>
            {atendidosVisibles.length ? (
              <div className="cola-historial">
                {atendidosVisibles.map((paciente) => (
                  <article key={paciente.id}>
                    <span>
                      {paciente.paciente
                        .split(" ")
                        .map((parte) => parte[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <strong>{paciente.paciente}</strong>
                      <small>
                        Consulta {paciente.hora} · Registrado{" "}
                        {paciente.registrado}
                      </small>
                      <small>{paciente.doctor}</small>
                    </div>
                    <button
                      type="button"
                      aria-label={`Editar signos vitales de ${paciente.paciente}`}
                      onClick={() => void editar(paciente)}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cola-vacio">
                <Icon name="userCheck" size={28} />
                <strong>
                  {atendidos.length
                    ? "Sin coincidencias"
                    : "Aún no hay atendidos"}
                </strong>
                <p>
                  {atendidos.length
                    ? "Prueba con otro nombre, CI o médico."
                    : "Al guardar los signos vitales, el paciente aparecerá aquí."}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
