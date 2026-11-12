import { fechaISOEnBolivia } from "../../utils/fechaBolivia";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AvisoTemporal } from "../../radius/componentes/AvisoTemporal";
import Icon from "../../radius/componentes/Icono";
import { usePacientes } from "../../radius/vistas/pacientes/usePacientes";
import { pacienteParaVista } from "../../radius/vistas/pacientes/pacientesApi";
import type { PacienteDemo } from "../../radius/datos/almacenDemo";
import "./AmbulanciaView.css";
import "./AmbulanciaLayout.css";

type Vista = "traslados" | "historial" | "unidad";
type Estado = "Programado" | "En curso" | "Finalizado" | "Cancelado";
type Traslado = {
  id: number;
  fecha: string;
  paciente: string;
  origen: string;
  destino: string;
  tipo: string;
  responsable: string;
  estado: Estado;
  kilometrajeInicial: number;
  kilometrajeFinal?: number;
};
type Insumo = {
  id: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  minimo: number;
  unidad: string;
  vence?: string;
};
type Carga = {
  id: number;
  fecha: string;
  litros: number;
  importe: number;
  kilometraje: number;
  proveedor: string;
};
type DatosAmbulancia = {
  traslados: Traslado[];
  insumos: Insumo[];
  cargas: Carga[];
  kilometrajeActual: number;
};

const STORAGE_KEY = "clinico-ambulancia-v1";
const hoy = () => fechaISOEnBolivia();
const inicial: DatosAmbulancia = {
  traslados: [],
  insumos: [
    {
      id: 1,
      nombre: "Oxigeno medicinal",
      categoria: "Emergencia",
      cantidad: 2,
      minimo: 2,
      unidad: "balones",
    },
    {
      id: 2,
      nombre: "Guantes descartables",
      categoria: "Proteccion",
      cantidad: 18,
      minimo: 20,
      unidad: "pares",
    },
    {
      id: 3,
      nombre: "Gasas esteriles",
      categoria: "Curacion",
      cantidad: 40,
      minimo: 30,
      unidad: "unidades",
    },
  ] as Insumo[],
  cargas: [] as Carga[],
  kilometrajeActual: 0,
};

function leerDatos(): DatosAmbulancia {
  try {
    return {
      ...inicial,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
    };
  } catch {
    return inicial;
  }
}

export function AmbulanciaView() {
  const [vista, setVista] = useState<Vista>("traslados");
  const [datos, setDatos] = useState(leerDatos);
  const [busqueda, setBusqueda] = useState("");
  const [aviso, setAviso] = useState("");
  const [formulario, setFormulario] = useState({
    fecha: hoy(),
    paciente: "",
    origen: "Hospital Maria Esperanza",
    destino: "",
    tipo: "Traslado asistencial",
    responsable: "",
    kilometrajeInicial: "",
  });
  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState<PacienteDemo | null>(null);
  const [buscadorPacienteAbierto, setBuscadorPacienteAbierto] = useState(false);
  const [insumo, setInsumo] = useState({
    nombre: "",
    categoria: "Emergencia",
    cantidad: "",
    minimo: "",
    unidad: "unidades",
    vence: "",
  });
  const [carga, setCarga] = useState({
    fecha: hoy(),
    litros: "",
    importe: "",
    kilometraje: "",
    proveedor: "",
  });
  const {
    pacientes: fichasPacientes,
    cargandoPacientes,
    errorPacientes,
  } = usePacientes();
  const pacientesRegistrados = useMemo(
    () => fichasPacientes.map(pacienteParaVista),
    [fichasPacientes],
  );
  const coincidenciasPacientes = useMemo(() => {
    const consulta = formulario.paciente
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!consulta) return [];
    return pacientesRegistrados
      .filter((paciente) =>
        consulta.split(/\s+/).every((parte) =>
          `${paciente.nombres} ${paciente.primerApellido} ${paciente.segundoApellido} ${paciente.numeroDocumento}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(parte),
        ),
      )
      .slice(0, 8);
  }, [formulario.paciente, pacientesRegistrados]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  }, [datos]);
  const activos = datos.traslados.filter(
    (item) => item.estado === "Programado" || item.estado === "En curso",
  );
  const bajos = datos.insumos.filter((item) => item.cantidad <= item.minimo);
  const historial = useMemo(
    () =>
      datos.traslados.filter((item) =>
        `${item.paciente} ${item.origen} ${item.destino} ${item.estado}`
          .toLowerCase()
          .includes(busqueda.toLowerCase()),
      ),
    [datos.traslados, busqueda],
  );
  const cambiarTraslado = (id: number, estado: Estado) =>
    setDatos((actual) => ({
      ...actual,
      traslados: actual.traslados.map((item) =>
        item.id === id
          ? {
              ...item,
              estado,
              kilometrajeFinal:
                estado === "Finalizado"
                  ? actual.kilometrajeActual
                  : item.kilometrajeFinal,
            }
          : item,
      ),
    }));

  const registrarTraslado = (evento: FormEvent) => {
    evento.preventDefault();
    if (!pacienteSeleccionado) {
      setAviso(
        "Busca y selecciona un paciente registrado antes de registrar el traslado.",
      );
      return;
    }
    if (!formulario.destino.trim() || !formulario.responsable.trim()) {
      setAviso("Completa destino y responsable para registrar el traslado.");
      return;
    }
    const km = Number(formulario.kilometrajeInicial || datos.kilometrajeActual);
    setDatos((actual) => ({
      ...actual,
      kilometrajeActual: Math.max(actual.kilometrajeActual, km),
      traslados: [
        {
          id: Date.now(),
          ...formulario,
          paciente: formulario.paciente.trim(),
          origen: formulario.origen.trim(),
          destino: formulario.destino.trim(),
          responsable: formulario.responsable.trim(),
          kilometrajeInicial: km,
          estado: "Programado",
        },
        ...actual.traslados,
      ],
    }));
    setFormulario({
      fecha: hoy(),
      paciente: "",
      origen: "Hospital Maria Esperanza",
      destino: "",
      tipo: "Traslado asistencial",
      responsable: "",
      kilometrajeInicial: "",
    });
    setPacienteSeleccionado(null);
    setAviso("Traslado registrado y listo para ser despachado.");
  };
  const registrarInsumo = (evento: FormEvent) => {
    evento.preventDefault();
    if (!insumo.nombre.trim() || !insumo.cantidad) return;
    setDatos((actual) => ({
      ...actual,
      insumos: [
        ...actual.insumos,
        {
          id: Date.now(),
          ...insumo,
          nombre: insumo.nombre.trim(),
          cantidad: Number(insumo.cantidad),
          minimo: Number(insumo.minimo || 0),
          vence: insumo.vence || undefined,
        },
      ],
    }));
    setInsumo({
      nombre: "",
      categoria: "Emergencia",
      cantidad: "",
      minimo: "",
      unidad: "unidades",
      vence: "",
    });
    setAviso("Insumo agregado al control de la ambulancia.");
  };
  const registrarCarga = (evento: FormEvent) => {
    evento.preventDefault();
    const km = Number(carga.kilometraje);
    if (!carga.litros || !carga.importe || !km) return;
    if (km < datos.kilometrajeActual) {
      setAviso("El kilometraje no puede ser menor al ultimo registro.");
      return;
    }
    setDatos((actual) => ({
      ...actual,
      kilometrajeActual: km,
      cargas: [
        {
          id: Date.now(),
          ...carga,
          litros: Number(carga.litros),
          importe: Number(carga.importe),
          kilometraje: km,
        },
        ...actual.cargas,
      ],
    }));
    setCarga({
      fecha: hoy(),
      litros: "",
      importe: "",
      kilometraje: "",
      proveedor: "",
    });
    setAviso("Carga de combustible y kilometraje registrados.");
  };

  return (
    <section className="ambulancia-vista">
      <header className="ambulancia-cabecera">
        <div>
          <span>OPERACION PREHOSPITALARIA</span>
          <h2>Ambulancia</h2>
          <p>
            Coordina el transporte de pacientes y mantén lista la unidad para
            cada salida.
          </p>
        </div>
        <div className="ambulancia-km">
          <Icon name="ambulance" size={22} />
          <span>Kilometraje actual</span>
          <strong>{datos.kilometrajeActual.toLocaleString("es-BO")} km</strong>
        </div>
      </header>
      <nav className="ambulancia-nav" aria-label="Funciones de ambulancia">
        <button
          className={vista === "traslados" ? "activo" : ""}
          onClick={() => setVista("traslados")}
        >
          <Icon name="ambulance" size={17} /> Transporte de pacientes
        </button>
        <button
          className={vista === "historial" ? "activo" : ""}
          onClick={() => setVista("historial")}
        >
          <Icon name="calendar" size={17} /> Historial de transportes
        </button>
        <button
          className={vista === "unidad" ? "activo" : ""}
          onClick={() => setVista("unidad")}
        >
          <Icon name="package" size={17} /> Unidad e insumos
        </button>
      </nav>
      {aviso &&
        (/registrad[oa]|agregado/i.test(aviso) ? (
          <AvisoTemporal mensaje={aviso} />
        ) : (
          <div className="ambulancia-aviso" role="alert">
            {aviso}
            <button onClick={() => setAviso("")} aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        ))}

      {vista === "traslados" && (
        <div className="ambulancia-grid">
          <section className="ambulancia-panel">
            <header>
              <div>
                <span>NUEVO TRASLADO</span>
                <h3>Registrar transporte de paciente</h3>
              </div>
              <Icon name="patient" size={23} />
            </header>
            <form className="ambulancia-form" onSubmit={registrarTraslado}>
              <label>
                Fecha
                <input
                  type="date"
                  value={formulario.fecha}
                  onChange={(e) =>
                    setFormulario({ ...formulario, fecha: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo de traslado
                <select
                  value={formulario.tipo}
                  onChange={(e) =>
                    setFormulario({ ...formulario, tipo: e.target.value })
                  }
                >
                  <option>Traslado asistencial</option>
                  <option>Emergencia</option>
                  <option>Alta hospitalaria</option>
                  <option>Interhospitalario</option>
                </select>
              </label>
              <div className="ambulancia-paciente-buscador">
                <label>
                  Paciente registrado
                  <input
                    value={formulario.paciente}
                    onFocus={() => setBuscadorPacienteAbierto(true)}
                    onChange={(e) => {
                      setFormulario({
                        ...formulario,
                        paciente: e.target.value,
                      });
                      setPacienteSeleccionado(null);
                      setBuscadorPacienteAbierto(true);
                    }}
                    placeholder="Buscar por nombre o CI"
                    autoComplete="off"
                  />
                </label>
                {buscadorPacienteAbierto && formulario.paciente.trim() && (
                  <div className="ambulancia-paciente-resultados">
                    {cargandoPacientes ? (
                      <p>Buscando pacientes registrados...</p>
                    ) : coincidenciasPacientes.length ? (
                      coincidenciasPacientes.map((paciente) => {
                        const nombre = [
                          paciente.nombres,
                          paciente.primerApellido,
                          paciente.segundoApellido,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <button
                            type="button"
                            key={paciente.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setPacienteSeleccionado(paciente);
                              setFormulario({
                                ...formulario,
                                paciente: nombre,
                              });
                              setBuscadorPacienteAbierto(false);
                            }}
                          >
                            <span>
                              <strong>{nombre}</strong>
                              <small>
                                CI {paciente.numeroDocumento}{" "}
                                {paciente.telefono
                                  ? `· ${paciente.telefono}`
                                  : ""}
                              </small>
                            </span>
                            <Icon name="chevronRight" size={15} />
                          </button>
                        );
                      })
                    ) : (
                      <p>
                        {errorPacientes ||
                          "No se encontraron pacientes registrados con esta busqueda."}
                      </p>
                    )}
                  </div>
                )}
                <small>
                  {pacienteSeleccionado
                    ? `Seleccionado: CI ${pacienteSeleccionado.numeroDocumento}`
                    : "Selecciona un paciente existente de la lista."}
                </small>
              </div>
              <label>
                Origen
                <input
                  value={formulario.origen}
                  onChange={(e) =>
                    setFormulario({ ...formulario, origen: e.target.value })
                  }
                />
              </label>
              <label>
                Destino
                <input
                  value={formulario.destino}
                  onChange={(e) =>
                    setFormulario({ ...formulario, destino: e.target.value })
                  }
                  placeholder="Centro o direccion de destino"
                />
              </label>
              <label>
                Responsable
                <input
                  value={formulario.responsable}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      responsable: e.target.value,
                    })
                  }
                  placeholder="Conductor o personal a cargo"
                />
              </label>
              <label>
                Kilometraje de salida
                <input
                  type="number"
                  min="0"
                  value={formulario.kilometrajeInicial}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      kilometrajeInicial: e.target.value,
                    })
                  }
                  placeholder={String(datos.kilometrajeActual)}
                />
              </label>
              <footer>
                <button className="ambulancia-primario" type="submit">
                  <Icon name="plus" size={17} /> Registrar traslado
                </button>
              </footer>
            </form>
          </section>
          <aside className="ambulancia-panel ambulancia-salidas">
            <header>
              <div>
                <span>SALIDAS ACTIVAS</span>
                <h3>Control de despacho</h3>
              </div>
              <strong>{activos.length}</strong>
            </header>
            {activos.length === 0 ? (
              <p className="ambulancia-vacio">
                No hay traslados pendientes. Registra uno para iniciar el
                control.
              </p>
            ) : (
              activos.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.paciente}</strong>
                    <small>
                      {item.origen} → {item.destino}
                    </small>
                    <em>
                      {item.tipo} · {item.fecha}
                    </em>
                  </div>
                  <select
                    value={item.estado}
                    onChange={(e) =>
                      cambiarTraslado(item.id, e.target.value as Estado)
                    }
                  >
                    <option>Programado</option>
                    <option>En curso</option>
                    <option>Finalizado</option>
                    <option>Cancelado</option>
                  </select>
                </article>
              ))
            )}
            <section className="ambulancia-lista-salida">
              <span>LISTA PREVIA DE SALIDA</span>
              <p>
                <i className={bajos.length ? "pendiente" : ""} />
                {bajos.length
                  ? `${bajos.length} insumo(s) requieren reposicion`
                  : "Insumos verificados"}
              </p>
              <p>
                <i />
                Kilometraje de referencia:{" "}
                <strong>
                  {datos.kilometrajeActual.toLocaleString("es-BO")} km
                </strong>
              </p>
              <p>
                <i />
                Registra el estado del traslado al despachar y al retorno.
              </p>
            </section>
          </aside>
        </div>
      )}

      {vista === "historial" && (
        <section className="ambulancia-panel">
          <header className="ambulancia-panel-busqueda">
            <div>
              <span>TRASLADOS REGISTRADOS</span>
              <h3>Historial de transporte de pacientes</h3>
            </div>
            <label>
              <Icon name="search" size={16} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar paciente, origen o destino"
              />
            </label>
          </header>
          <div className="ambulancia-tabla">
            <div className="ambulancia-fila encabezado">
              <span>Fecha</span>
              <span>Paciente y tipo</span>
              <span>Ruta</span>
              <span>Responsable</span>
              <span>Estado</span>
            </div>
            {historial.length === 0 ? (
              <p className="ambulancia-vacio">
                Aun no hay transportes registrados.
              </p>
            ) : (
              historial.map((item) => (
                <div className="ambulancia-fila" key={item.id}>
                  <span>{item.fecha}</span>
                  <span>
                    <strong>{item.paciente}</strong>
                    <small>{item.tipo}</small>
                  </span>
                  <span>
                    {item.origen} → {item.destino}
                  </span>
                  <span>{item.responsable}</span>
                  <span
                    className={`estado ${item.estado.toLowerCase().replace(" ", "-")}`}
                  >
                    {item.estado}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {vista === "unidad" && (
        <div className="ambulancia-unidad">
          <section className="ambulancia-panel">
            <header>
              <div>
                <span>INSUMOS Y EQUIPO</span>
                <h3>Control de la ambulancia</h3>
              </div>
              <strong className={bajos.length ? "alerta" : ""}>
                {bajos.length} bajo minimo
              </strong>
            </header>
            <div className="ambulancia-insumos">
              {datos.insumos.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.nombre}</strong>
                    <small>
                      {item.categoria}
                      {item.vence ? ` · Vence ${item.vence}` : ""}
                    </small>
                  </div>
                  <b className={item.cantidad <= item.minimo ? "bajo" : ""}>
                    {item.cantidad} {item.unidad}
                  </b>
                  <span>Minimo: {item.minimo}</span>
                </article>
              ))}
            </div>
            <form
              className="ambulancia-form compacto"
              onSubmit={registrarInsumo}
            >
              <label>
                Insumo
                <input
                  value={insumo.nombre}
                  onChange={(e) =>
                    setInsumo({ ...insumo, nombre: e.target.value })
                  }
                  placeholder="Ej.: Collar cervical"
                />
              </label>
              <label>
                Categoria
                <select
                  value={insumo.categoria}
                  onChange={(e) =>
                    setInsumo({ ...insumo, categoria: e.target.value })
                  }
                >
                  <option>Emergencia</option>
                  <option>Curacion</option>
                  <option>Proteccion</option>
                  <option>Equipo</option>
                </select>
              </label>
              <label>
                Cantidad
                <input
                  type="number"
                  min="0"
                  value={insumo.cantidad}
                  onChange={(e) =>
                    setInsumo({ ...insumo, cantidad: e.target.value })
                  }
                />
              </label>
              <label>
                Minimo
                <input
                  type="number"
                  min="0"
                  value={insumo.minimo}
                  onChange={(e) =>
                    setInsumo({ ...insumo, minimo: e.target.value })
                  }
                />
              </label>
              <label>
                Unidad
                <input
                  value={insumo.unidad}
                  onChange={(e) =>
                    setInsumo({ ...insumo, unidad: e.target.value })
                  }
                />
              </label>
              <button className="ambulancia-secundario" type="submit">
                Agregar insumo
              </button>
            </form>
          </section>
          <section className="ambulancia-panel">
            <header>
              <div>
                <span>COMBUSTIBLE Y RECORRIDO</span>
                <h3>Bitacora de la unidad</h3>
              </div>
              <Icon name="calendar" size={22} />
            </header>
            <form
              className="ambulancia-form compacto"
              onSubmit={registrarCarga}
            >
              <label>
                Fecha
                <input
                  type="date"
                  value={carga.fecha}
                  onChange={(e) =>
                    setCarga({ ...carga, fecha: e.target.value })
                  }
                />
              </label>
              <label>
                Litros
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={carga.litros}
                  onChange={(e) =>
                    setCarga({ ...carga, litros: e.target.value })
                  }
                />
              </label>
              <label>
                Importe (Bs)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={carga.importe}
                  onChange={(e) =>
                    setCarga({ ...carga, importe: e.target.value })
                  }
                />
              </label>
              <label>
                Kilometraje
                <input
                  type="number"
                  min={datos.kilometrajeActual}
                  value={carga.kilometraje}
                  onChange={(e) =>
                    setCarga({ ...carga, kilometraje: e.target.value })
                  }
                  placeholder={String(datos.kilometrajeActual)}
                />
              </label>
              <label>
                Proveedor
                <input
                  value={carga.proveedor}
                  onChange={(e) =>
                    setCarga({ ...carga, proveedor: e.target.value })
                  }
                  placeholder="Estacion de servicio"
                />
              </label>
              <button className="ambulancia-primario" type="submit">
                Registrar carga
              </button>
            </form>
            <div className="ambulancia-cargas">
              {datos.cargas.length === 0 ? (
                <p className="ambulancia-vacio">
                  Sin cargas de combustible registradas.
                </p>
              ) : (
                datos.cargas.map((item) => (
                  <article key={item.id}>
                    <strong>
                      {item.fecha} · {item.litros} L
                    </strong>
                    <span>
                      Bs {item.importe.toFixed(2)} ·{" "}
                      {item.kilometraje.toLocaleString("es-BO")} km
                    </span>
                    <small>{item.proveedor || "Proveedor no registrado"}</small>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
