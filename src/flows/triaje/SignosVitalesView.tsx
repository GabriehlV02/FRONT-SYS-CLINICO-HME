import { useState, useEffect } from "react";
import Icon from "../../radius/componentes/Icono";
import "./SignosVitalesView.css";
import "./ColaTriaje.css";
import type { SignoVitalConfig } from "./ConfiguracionSignosVitalesView";
import { guardarSignosVitales } from "./registroSignosVitales";
import { useServiciosSignosVitales } from "./ServiciosSignosVitales";
import { camposParaServicio, compararReferencia } from "./camposSignosVitales";
import { apiFetch } from "../../radius/api";
import { leerSesion } from "../../radius/types/sesion";

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
  signosRegistrados?: boolean;
};
type PacienteAtendido = PacienteEnEspera & {
  valores: Record<string, string>;
  registrado: string;
};

const claveColaDemo = "clinico.triaje.cola-demo.v1";
const claveAtendidosDemo = "clinico.triaje.atendidos-demo.v1";
const colaInicial: PacienteEnEspera[] = [
  {
    id: "demo-cita-luis-morales",
    pacienteId: "demo-pac-luis-morales",
    hora: "09:15",
    fecha: "2026-11-09",
    estado: "confirmada",
    paciente: "Luis Eduardo Morales Rojas",
    ci: "6543210",
    edad: 40,
    doctor: "Dra. Andrea Vargas",
    especialidad: "Medicina general",
  },
  {
    id: "demo-cita-ana-quispe",
    pacienteId: "demo-pac-003",
    hora: "09:40",
    fecha: "2026-11-09",
    estado: "confirmada",
    paciente: "Ana Sofía Quispe Vargas",
    ci: "7319845",
    edad: 31,
    doctor: "Dr. Martín Rojas",
    especialidad: "Medicina general",
  },
];
const atendidosIniciales: PacienteAtendido[] = [
  {
    id: "demo-cita-carlos-mendoza",
    pacienteId: "demo-pac-002",
    hora: "08:50",
    fecha: "2026-11-09",
    estado: "confirmada",
    paciente: "Carlos Alberto Mendoza Rojas",
    ci: "5987412",
    edad: 51,
    doctor: "Dra. Andrea Vargas",
    especialidad: "Medicina general",
    signosRegistrados: true,
    valores: {
      temperatura: "36.7",
      frecuenciaCardiaca: "76",
      frecuenciaRespiratoria: "16",
      presionSistolica: "120",
      presionDiastolica: "78",
      saturacionAmbiente: "98",
      peso: "72.4",
      estatura: "168",
    },
    registrado: "08:55",
  },
];

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
  const esDemo = import.meta.env.DEV && leerSesion()?.token === "frontend-demo-local";
  const [cola, setCola] = useState(() => esDemo ? leerListaDemo(claveColaDemo, colaInicial) : []);
  const [errorPacientes, setErrorPacientes] = useState("");
  useEffect(() => {
    if (esDemo) return;
    const controller = new AbortController();
    apiFetch("/api/citas", { signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok)
          throw new Error("No se pudieron cargar las consultas.");
        const citas: PacienteEnEspera[] = await respuesta.json();
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
  const [atendidos, setAtendidos] =
    useState<PacienteAtendido[]>(() => esDemo ? leerListaDemo(claveAtendidosDemo, atendidosIniciales) : []);
  const [panelAtendidosAbierto, setPanelAtendidosAbierto] = useState(true);
  const [busquedaAtendidos, setBusquedaAtendidos] = useState("");
  const [editandoAtendido, setEditandoAtendido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState("");
  const [versionValoracion, setVersionValoracion] = useState<number | null>(
    null,
  );
  useEffect(() => {
    if (!esDemo) return;
    localStorage.setItem(claveColaDemo, JSON.stringify(cola));
    localStorage.setItem(claveAtendidosDemo, JSON.stringify(atendidos));
  }, [esDemo, cola, atendidos]);
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
      if (!esDemo) {
        const respuesta = await apiFetch(
          `/api/v1/citas/${encodeURIComponent(pacienteSeleccionado.id)}/signos-vitales`,
          {
            method: "POST",
            body: JSON.stringify({ valores: datos, version: versionValoracion }),
          },
        );
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok)
          throw new Error(
            resultado.message || "No se pudieron guardar los signos vitales.",
          );
      }
      guardarSignosVitales(pacienteSeleccionado, datos);
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
            <small>
              Complete la valoración inicial antes de la consulta ambulatoria.
            </small>
          </div>
          <button
            className="signos-volver"
            type="button"
            onClick={() => {
              setPacienteSeleccionado(null);
              setValores({});
              setEditandoAtendido(false);
            }}
          >
            <Icon name="chevronLeft" size={16} />{" "}
            {editandoAtendido ? "Volver a atendidos" : "Volver a la cola"}
          </button>
        </header>
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
            <span>Consulta</span>
            <span>Paciente</span>
            <span>Médico / especialidad</span>
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
                <small>{paciente.especialidad}</small>
                {paciente.estado === "por_confirmar" && (
                  <small>Por confirmar · Cobro pendiente de verificar</small>
                )}
              </div>
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
