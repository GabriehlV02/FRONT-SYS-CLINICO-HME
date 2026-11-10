import { useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../../componentes/Icono";
import { apiFetch } from "../../api";
import ModalRegistroPaciente, {
  type PacienteRegistrado,
} from "./ModalRegistroPaciente";
import { listarPacientes, pacienteParaVista } from "./pacientesApi";
import { useEstudiosPacientes } from "./useEstudiosPacientes";
import {
  guardarArchivoEstudio,
  guardarPacientes,
  guardarEstudios,
  obtenerFamiliaresPacienteDemo,
  obtenerHistorialPacienteDemo,
  obtenerEstudios,
  seleccionarEstudio,
  type EstudioDemo,
  type FamiliarPacienteDemo,
  type MovimientoPacienteDemo,
  type PacienteDemo as Paciente,
  vincularFamiliarPacienteDemo,
} from "../../datos/almacenDemo";
import { leerSesion } from "../../types/sesion";
import "../usuarios/VistaUsuarios.css";
import "./VistaPacientes.css";
import "./TablaPacientes.css";
import "./InformesPaciente.css";
import "./PacientesHistoriaVisual.css";

const inicial = {
  nombres: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "CI",
  numeroDocumento: "",
  fechaNacimiento: "",
  sexo: "no_especifica",
  telefono: "",
  direccion: "",
  sucursal: "Central",
};
const calcularEdad = (fecha: string) => {
  if (!fecha) return null;
  const nacimiento = new Date(`${fecha}T00:00:00`),
    hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() &&
      hoy.getDate() < nacimiento.getDate())
  )
    edad--;
  return Math.max(0, edad);
};
const nombreCompleto = (p: Paciente) =>
  `${p.nombres} ${p.primerApellido} ${p.segundoApellido}`.trim();

type EstudioInspeccion = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  descripcion: string;
  origen: "local" | "orthanc";
};
type ClasificacionEstudio = { id: number; nombre: string };
const clasificacionesIniciales = [
  "Ecografía",
  "Radiografía",
  "Tomografía",
  "Electrocardiograma",
];

function InspeccionPaciente({
  paciente,
  estudios,
  onVolver,
}: {
  paciente: Paciente;
  estudios: EstudioDemo[];
  onVolver: () => void;
}) {
  const [orthanc, setOrthanc] = useState<EstudioInspeccion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [clasificaciones, setClasificaciones] = useState<string[]>(
    clasificacionesIniciales,
  );
  useEffect(() => {
    let activo = true;
    void apiFetch("/api/v1/estudios/clasificaciones")
      .then(async (respuesta) => {
        if (!respuesta.ok) return [];
        const cuerpo = (await respuesta.json()) as {
          data?: ClasificacionEstudio[];
        };
        return cuerpo.data || [];
      })
      .then((datos) => {
        if (activo && datos.length)
          setClasificaciones(
            datos.map((clasificacion) => clasificacion.nombre),
          );
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);
  useEffect(() => {
    let activo = true;
    void apiFetch("/api/orthanc/estudios")
      .then(async (respuesta) => (respuesta.ok ? respuesta.json() : []))
      .then(
        (
          datos: Array<{
            id: string;
            pacienteId: string | null;
            patientIdDicom: string;
            descripcion: string;
            fechaEstudio: string;
            modalidades: string[];
          }>,
        ) => {
          if (!activo) return;
          setOrthanc(
            datos
              .filter(
                (estudio) =>
                  estudio.pacienteId === paciente.id ||
                  estudio.patientIdDicom.trim() ===
                    paciente.numeroDocumento.trim(),
              )
              .map((estudio) => ({
                id: estudio.id,
                titulo: estudio.descripcion || "Estudio DICOM",
                tipo: estudio.modalidades.join(" · ") || "Radiografía",
                fecha: /^\d{8}$/.test(estudio.fechaEstudio)
                  ? `${estudio.fechaEstudio.slice(0, 4)}-${estudio.fechaEstudio.slice(4, 6)}-${estudio.fechaEstudio.slice(6, 8)}`
                  : estudio.fechaEstudio,
                descripcion: "Servidor Orthanc",
                origen: "orthanc",
              })),
          );
        },
      )
      .catch(() => undefined)
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [paciente.id, paciente.numeroDocumento]);
  const todos = useMemo<EstudioInspeccion[]>(() => {
    const locales = estudios
      .filter((estudio) => estudio.pacienteId === paciente.id)
      .map((estudio) => ({
        id: estudio.id,
        titulo: estudio.titulo,
        tipo: estudio.categoria,
        fecha: estudio.creadaEn.slice(0, 10),
        descripcion: estudio.descripcion || estudio.nombreArchivo,
        origen: "local" as const,
      }));
    return [...locales, ...orthanc].sort((a, b) =>
      (b.fecha || "").localeCompare(a.fecha || ""),
    );
  }, [estudios, orthanc, paciente.id]);
  const tipos = useMemo(
    () => [
      ...new Set([
        ...clasificaciones,
        ...todos.map((estudio) => estudio.tipo).filter(Boolean),
      ]),
    ],
    [clasificaciones, todos],
  );
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    return todos.filter(
      (estudio) =>
        (!termino ||
          `${estudio.titulo} ${estudio.tipo} ${estudio.descripcion}`
            .toLocaleLowerCase("es")
            .includes(termino)) &&
        (tipo === "todos" || estudio.tipo === tipo) &&
        (!desde || estudio.fecha >= desde) &&
        (!hasta || estudio.fecha <= hasta),
    );
  }, [todos, busqueda, tipo, desde, hasta]);
  const abrir = (estudio: EstudioInspeccion) => {
    if (estudio.origen === "orthanc") {
      localStorage.setItem("radiuus_orthanc_estudio", estudio.id);
      const destino =
        estudio.tipo === "Tomografía"
          ? "visor-tomografias"
          : estudio.tipo === "Ecografía"
            ? "visor-ecografias"
            : estudio.tipo === "Ecocardiograma"
              ? "visor-ecocardiogramas"
              : "visor-radiografias";
      window.dispatchEvent(
        new CustomEvent("radiuus:navegar", { detail: destino }),
      );
    } else seleccionarEstudio(estudio.id);
  };
  return (
    <section className="inspeccion-imagenologia">
      <button type="button" className="inspeccion-volver" onClick={onVolver}>
        <Icon name="chevronLeft" size={17} /> Volver al listado de pacientes
      </button>
      <header className="inspeccion-paciente">
        <span>
          <Icon name="patient" size={24} />
        </span>
        <div>
          <small>PACIENTE</small>
          <h2>{nombreCompleto(paciente)}</h2>
          <p>
            {paciente.tipoDocumento} {paciente.numeroDocumento} · {todos.length}{" "}
            {todos.length === 1 ? "estudio" : "estudios"} de imagenología
          </p>
        </div>
      </header>
      <section className="inspeccion-filtros" aria-label="Filtros de estudios">
        <label className="inspeccion-buscar">
          <Icon name="search" size={17} />
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar estudio, modalidad o descripción"
          />
        </label>
        <label>
          <span>Tipo de estudio</span>
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
          >
            <option value="todos">Todos los tipos</option>
            {tipos.map((valor) => (
              <option key={valor}>{valor}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(evento) => setDesde(evento.target.value)}
          />
        </label>
        <label>
          <span>Hasta</span>
          <input
            type="date"
            min={desde}
            value={hasta}
            onChange={(evento) => setHasta(evento.target.value)}
          />
        </label>
        {(busqueda || tipo !== "todos" || desde || hasta) && (
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setTipo("todos");
              setDesde("");
              setHasta("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </section>
      <section className="inspeccion-estudios">
        <header className="inspeccion-columnas">
          <span>Estudio</span>
          <span>Fecha</span>
          <span>Origen</span>
          <span>Acciones</span>
        </header>
        {cargando && !todos.length ? (
          <div className="inspeccion-vacio">
            <span>Cargando estudios…</span>
          </div>
        ) : visibles.length ? (
          <div className="inspeccion-lista">
            {visibles.map((estudio) => (
              <article key={`${estudio.origen}-${estudio.id}`}>
                <span>
                  <Icon name="image" size={19} />
                </span>
                <div>
                  <strong>{estudio.titulo}</strong>
                  <small>
                    {estudio.tipo} · {estudio.descripcion}
                  </small>
                </div>
                <time>
                  {estudio.fecha
                    ? new Date(`${estudio.fecha}T00:00:00`).toLocaleDateString(
                        "es-BO",
                      )
                    : "Sin fecha"}
                </time>
                <em>{estudio.origen === "orthanc" ? "Orthanc" : "Local"}</em>
                <button type="button" onClick={() => abrir(estudio)}>
                  <Icon name="eye" size={16} /> Ver estudio
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="inspeccion-vacio">
            <Icon name="image" size={28} />
            <strong>No hay estudios que coincidan</strong>
            <small>
              {todos.length
                ? "Cambia la búsqueda o los filtros aplicados."
                : "Este paciente todavía no tiene estudios de imagenología."}
            </small>
          </div>
        )}
      </section>
    </section>
  );
}

function FichaPacienteCompleta({
  paciente,
  pacientes,
  estudios,
  onVolver,
  onEditar,
  onVerFamiliar,
}: {
  paciente: Paciente;
  pacientes: Paciente[];
  estudios: EstudioDemo[];
  onVolver: () => void;
  onEditar: () => void;
  onVerFamiliar: (familiar: Paciente) => void;
}) {
  const demoLocal =
    import.meta.env.DEV && leerSesion()?.token === "frontend-demo-local";
  const [vincularAbierto, setVincularAbierto] = useState(false);
  const [busquedaFamiliar, setBusquedaFamiliar] = useState("");
  const [parentesco, setParentesco] = useState("Familiar");
  const [familiarElegido, setFamiliarElegido] = useState("");
  const [errorVinculo, setErrorVinculo] = useState("");
  const [movimientoDetalle, setMovimientoDetalle] =
    useState<MovimientoPacienteDemo | null>(null);
  const [familiares, setFamiliares] = useState<FamiliarPacienteDemo[]>(() =>
    obtenerFamiliaresPacienteDemo(paciente.id),
  );
  useEffect(() => {
    setFamiliares(obtenerFamiliaresPacienteDemo(paciente.id));
  }, [paciente.id]);
  const consultaFamiliar = busquedaFamiliar
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
  const pacientesCoincidentes = pacientes.filter((candidato) => {
    if (candidato.id === paciente.id) return false;
    const texto = `${nombreCompleto(candidato)} ${candidato.numeroDocumento}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
    return (
      !consultaFamiliar ||
      consultaFamiliar.split(/\s+/).every((parte) => texto.includes(parte))
    );
  });
  const familiaresVisibles = familiares
    .map((vinculo) => ({
      vinculo,
      paciente: pacientes.find((item) => item.id === vinculo.familiarId),
    }))
    .filter((item) => item.paciente);
  const vincularFamiliar = () => {
    if (!familiarElegido) {
      setErrorVinculo("Selecciona un paciente para vincularlo.");
      return;
    }
    try {
      setFamiliares(
        vincularFamiliarPacienteDemo(paciente.id, familiarElegido, parentesco),
      );
      setVincularAbierto(false);
      setBusquedaFamiliar("");
      setFamiliarElegido("");
      setParentesco("Familiar");
      setErrorVinculo("");
    } catch (error) {
      setErrorVinculo(
        error instanceof Error ? error.message : "No se pudo vincular al familiar.",
      );
    }
  };
  const estudiosPaciente = estudios.filter(
    (estudio) => estudio.pacienteId === paciente.id,
  );
  const historial: MovimientoPacienteDemo[] = [
    ...obtenerHistorialPacienteDemo(paciente.id),
    ...estudiosPaciente.map((estudio) => ({
      id: estudio.id,
      pacienteId: estudio.pacienteId,
      tipo: "consumo" as const,
      concepto: estudio.titulo,
      categoria: estudio.categoria,
      fecha: estudio.creadaEn,
      importe: 0,
    })),
  ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const totalConsumido = historial
    .filter((movimiento) => movimiento.tipo === "consumo")
    .reduce((total, movimiento) => total + movimiento.importe, 0);
  const totalPagado = historial
    .filter((movimiento) => movimiento.tipo === "pago")
    .reduce((total, movimiento) => total + movimiento.importe, 0);
  const historialPorFecha = Array.from(
    historial.reduce((grupos, movimiento) => {
      const fecha = new Date(movimiento.fecha);
      const clave = [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, "0"), String(fecha.getDate()).padStart(2, "0")].join("-");
      const grupo = grupos.get(clave) ?? [];
      grupo.push(movimiento);
      grupos.set(clave, grupo);
      return grupos;
    }, new Map<string, MovimientoPacienteDemo[]>()),
  );
  const desglosePagoDetalle = movimientoDetalle?.tipo === "pago"
    ? movimientoDetalle.desglosePagos?.length
      ? movimientoDetalle.desglosePagos
      : movimientoDetalle.metodoPago
        ? [{ metodo: movimientoDetalle.metodoPago, importe: movimientoDetalle.importe }]
        : []
    : [];
  const datos = [
    ["Nombres", paciente.nombres],
    ["Apellido paterno", paciente.primerApellido],
    ["Apellido materno", paciente.segundoApellido],
    ["CI", paciente.numeroDocumento],
    ["Complemento", paciente.complementoCi || "No registrado"],
    ["Expedido en", paciente.expedidoEn || "No registrado"],
    ["CI con QR", paciente.ciConQr ? "Sí" : "No"],
    ["NIT", paciente.nit || "No registrado"],
    ["Razón social", paciente.razonSocial || "No registrada"],
    [
      "Fecha de nacimiento",
      paciente.fechaNacimiento
        ? new Date(`${paciente.fechaNacimiento}T00:00:00`).toLocaleDateString(
            "es-BO",
          )
        : "No registrada",
    ],
    [
      "Edad",
      calcularEdad(paciente.fechaNacimiento) === null
        ? "No registrada"
        : `${calcularEdad(paciente.fechaNacimiento)} años`,
    ],
    ["Sexo", paciente.sexo.replaceAll("_", " ") || "No registrado"],
    ["Celular", paciente.telefono || "No registrado"],
    ["País", paciente.pais || "No registrado"],
    ["Departamento", paciente.departamento || "No registrado"],
    ["Ciudad", paciente.ciudad || "No registrada"],
    ["Zona / barrio", paciente.zonaBarrio || "No registrada"],
    ["Dirección", paciente.direccion || "No registrada"],
    ["Responsable", paciente.responsableNombre || "No registrado"],
    ["CI responsable", paciente.responsableCi || "No registrado"],
    ["Teléfono responsable", paciente.responsableTelefono || "No registrado"],
    ["Parentesco", paciente.responsableParentesco || "No registrado"],
    ["Cómo se enteró", paciente.comoSeEntero || "No registrado"],
    ["Observaciones", paciente.observaciones || "Sin observaciones"],
    ["Estado", paciente.habilitado === false ? "Inhabilitado" : "Habilitado"],
  ];
  return (
    <section
      className="ficha-paciente-completa"
      aria-label={`Ficha de ${nombreCompleto(paciente)}`}
    >
      <header>
        <div className="ficha-paciente-identidad">
          <span className="ficha-paciente-avatar">{`${paciente.nombres[0] || ""}${paciente.primerApellido[0] || ""}`}</span>
          <div>
            <span>FICHA DEL PACIENTE</span>
            <h2>{nombreCompleto(paciente)}</h2>
            <p>
              {paciente.tipoDocumento} {paciente.numeroDocumento} <i /> Paciente
              registrado
            </p>
          </div>
        </div>
      </header>
      <div className="ficha-paciente-regreso">
        <button type="button" onClick={onVolver}>
          <Icon name="chevronLeft" size={17} /> Volver al listado
        </button>
        <div className="ficha-paciente-acciones">
          <button type="button" className="ficha-accion-editar" onClick={onEditar}>
            <Icon name="edit" size={17} /> Editar datos
          </button>
          {demoLocal && (
            <button
              type="button"
              className="ficha-accion-familiar"
              onClick={() => {
                setVincularAbierto(true);
                setErrorVinculo("");
              }}
            >
              <Icon name="users" size={17} /> Vincular familiar
            </button>
          )}
        </div>
      </div>
      <div className="ficha-paciente-completa-cuerpo">
        <section className="ficha-paciente-informacion">
          <header>
            <div>
              <span>INFORMACIÓN PERSONAL</span>
              <h3>Datos registrados</h3>
            </div>
            <small>{paciente.sucursal || "Central"}</small>
          </header>
          <div>
            {datos.map(([etiqueta, valor]) => (
              <article
                key={etiqueta}
                className={etiqueta === "Dirección" ? "ficha-dato-amplio" : ""}
              >
                <span>{etiqueta}</span>
                <strong>{valor}</strong>
              </article>
            ))}
          </div>
          <section className="ficha-familiares-vinculados" aria-label="Familiares relacionados">
            <header>
              <div><span>RED DE APOYO</span><h4>Familiares relacionados</h4></div>
              <small>{familiaresVisibles.length} {familiaresVisibles.length === 1 ? "familiar" : "familiares"}</small>
            </header>
            {familiaresVisibles.length ? (
              <div className="ficha-familiares-tabla-contenedor">
                <table className="ficha-familiares-tabla">
                  <thead>
                    <tr><th>CI</th><th>Nombre completo</th><th>Grado familiar</th><th>Ver paciente</th></tr>
                  </thead>
                  <tbody>
                    {familiaresVisibles.map(({ vinculo, paciente: familiar }) => (
                      <tr key={vinculo.familiarId}>
                        <td>{familiar!.numeroDocumento}</td>
                        <td><strong>{nombreCompleto(familiar!)}</strong></td>
                        <td><span className="ficha-familiar-parentesco">{vinculo.parentesco}</span></td>
                        <td><button type="button" onClick={() => onVerFamiliar(familiar!)}>Ver paciente <Icon name="chevronRight" size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ficha-familiares-vacio">Todavía no hay familiares relacionados con este paciente.</p>
            )}
          </section>
        </section>
        <aside className="ficha-paciente-consumos">
          <header>
            <div>
              <span>HISTORIAL</span>
              <h3>Consumos y pagos</h3>
            </div>
            <small>{historial.length} movimientos</small>
          </header>
          {historial.length ? (
            <div className="ficha-consumos-lista">
              <div className="ficha-consumos-resumen">
                <div><span>Consumido</span><strong>Bs {totalConsumido.toFixed(2)}</strong></div>
                <div><span>Pagado</span><strong>Bs {totalPagado.toFixed(2)}</strong></div>
                <div className="pendiente"><span>Saldo</span><strong>Bs {Math.max(0, totalConsumido - totalPagado).toFixed(2)}</strong></div>
              </div>
              <p className="ficha-consumos-demo">Historial de ejemplo · datos locales</p>
              <div className="ficha-consumos-fechas">
              {historialPorFecha.map(([fecha, movimientos]) => {
                const fechaTexto = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-BO", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                });
                return (
                  <section className="ficha-consumos-grupo-fecha" key={fecha}>
                    <h4><span>{fechaTexto}</span><small>{movimientos.length} {movimientos.length === 1 ? "movimiento" : "movimientos"}</small></h4>
                    <div className="ficha-consumos-tarjetas">
                    {movimientos.map((movimiento) => (
                <article className={`ficha-consumo-movimiento ${movimiento.tipo}`} key={movimiento.id}>
                  <div className="ficha-consumo-encabezado">
                    <strong>{movimiento.concepto}</strong>
                    <b>{movimiento.tipo === "pago" ? "−" : ""}Bs {movimiento.importe.toFixed(2)}</b>
                  </div>
                  <span>{movimiento.tipo === "pago" ? "Pago recibido" : movimiento.categoria}{movimiento.tipo === "pago" && (movimiento.desglosePagos?.length ?? 0) > 1 ? ` · ${movimiento.desglosePagos!.map((pago) => pago.metodo).join(" + ")}` : movimiento.metodoPago ? ` · ${movimiento.metodoPago}` : ""}</span>
                <footer>
                    <time>{new Date(movimiento.fecha).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</time>
                  <span>{movimiento.referencia || (movimiento.tipo === "pago" ? "Pago recibido" : "Consumo registrado")}</span>
                  <button type="button" onClick={() => setMovimientoDetalle(movimiento)}>
                    Ver detalle <Icon name="chevronRight" size={14} />
                  </button>
                  </footer>
                </article>
                    ))}
                    </div>
                  </section>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="ficha-consumos-vacio">
              <Icon name="fileText" size={25} />
              <strong>Sin consumos o pagos registrados</strong>
              <span>
                Los servicios, estudios y pagos del paciente aparecerán aquí.
              </span>
            </div>
          )}
        </aside>
      </div>
      {movimientoDetalle && (
        <div
          className="ficha-detalle-movimiento-fondo"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMovimientoDetalle(null);
          }}
        >
          <section className="ficha-detalle-movimiento" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-movimiento">
            <header>
              <div>
                <span>DETALLE DE {movimientoDetalle.tipo === "pago" ? "PAGO" : "CONSUMO"}</span>
                <h3 id="titulo-detalle-movimiento">{movimientoDetalle.concepto}</h3>
                <small>{nombreCompleto(paciente)} · {paciente.tipoDocumento} {paciente.numeroDocumento}</small>
              </div>
              <button type="button" aria-label="Cerrar detalle" onClick={() => setMovimientoDetalle(null)}><Icon name="close" size={19} /></button>
            </header>
            <div className="ficha-detalle-movimiento-resumen">
              <span><b>Fecha y hora</b>{new Date(movimientoDetalle.fecha).toLocaleString("es-BO", { dateStyle: "long", timeStyle: "short" })}</span>
              <span><b>Estado</b>{movimientoDetalle.tipo === "pago" ? "Registrado" : "Consumido"}</span>
              {movimientoDetalle.tipo === "pago" && desglosePagoDetalle.length > 0 && (
                <span><b>Métodos de pago</b>{desglosePagoDetalle.map((pago) => pago.metodo).join(" + ")}</span>
              )}
              <span><b>Referencia</b>{movimientoDetalle.referencia || "Sin referencia registrada"}</span>
            </div>
            <section className="ficha-detalle-movimiento-items">
              <div className="ficha-detalle-movimiento-titulo"><span>{movimientoDetalle.tipo === "pago" ? "PAGO REGISTRADO" : "CONSUMO REGISTRADO"}</span></div>
              <div className="ficha-detalle-movimiento-fila">
                <strong>{movimientoDetalle.concepto}</strong>
                <b>Bs {movimientoDetalle.importe.toFixed(2)}</b>
              </div>
            </section>
            {movimientoDetalle.tipo === "pago" && desglosePagoDetalle.length > 0 && (
              <section className="ficha-detalle-desglose-pago" aria-label="Desglose por método de pago">
                <header><span>DESGLOSE DEL PAGO</span><small>Importe recibido con cada método</small></header>
                <div>
                  {desglosePagoDetalle.map((pago, indice) => (
                    <article key={`${pago.metodo}-${indice}`}>
                      <span className="ficha-detalle-pago-indicador" />
                      <strong>{pago.metodo}</strong>
                      <b>Bs {pago.importe.toFixed(2)}</b>
                    </article>
                  ))}
                </div>
                <footer><span>Total recibido</span><strong>Bs {desglosePagoDetalle.reduce((total, pago) => total + pago.importe, 0).toFixed(2)}</strong></footer>
              </section>
            )}
            <footer>
              <span>{movimientoDetalle.tipo === "pago" ? "Importe recibido" : "Total del consumo"}<strong>Bs {movimientoDetalle.importe.toFixed(2)}</strong></span>
              <button type="button" onClick={() => setMovimientoDetalle(null)}>Cerrar detalle</button>
            </footer>
          </section>
        </div>
      )}
      {vincularAbierto && demoLocal && (
        <div className="familiar-vinculo-fondo" onMouseDown={(event) => { if (event.target === event.currentTarget) setVincularAbierto(false); }}>
          <section className="familiar-vinculo-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-vincular-familiar">
            <header>
              <div><span>FICHA FAMILIAR</span><h3 id="titulo-vincular-familiar">Vincular familiar</h3><p>Busca un paciente existente y relaciónalo con {nombreCompleto(paciente)}.</p></div>
              <button type="button" aria-label="Cerrar" onClick={() => setVincularAbierto(false)}><Icon name="close" size={18} /></button>
            </header>
            <label className="familiar-vinculo-busqueda">Buscar paciente
              <span><Icon name="search" size={18} /><input autoFocus value={busquedaFamiliar} onChange={(event) => { setBusquedaFamiliar(event.target.value); setFamiliarElegido(""); setErrorVinculo(""); }} placeholder="Nombre, apellido o CI" /></span>
            </label>
            <div className="familiar-vinculo-resultados" role="listbox" aria-label="Pacientes encontrados">
              {pacientesCoincidentes.length ? pacientesCoincidentes.slice(0, 8).map((candidato) => (
                <button type="button" role="option" aria-selected={familiarElegido === candidato.id} className={familiarElegido === candidato.id ? "seleccionado" : ""} key={candidato.id} onClick={() => { setFamiliarElegido(candidato.id); setErrorVinculo(""); }}>
                  <span className="familiar-avatar">{candidato.nombres[0]}{candidato.primerApellido[0]}</span><span><strong>{nombreCompleto(candidato)}</strong><small>{candidato.tipoDocumento} {candidato.numeroDocumento}</small></span><i>{familiarElegido === candidato.id ? "✓" : ""}</i>
                </button>
              )) : <p>No se encontraron pacientes con esos datos.</p>}
            </div>
            <label className="familiar-vinculo-parentesco">Parentesco
              <select value={parentesco} onChange={(event) => setParentesco(event.target.value)}>
                {["Familiar", "Cónyuge", "Madre", "Padre", "Hijo/a", "Hermano/a", "Tutor/a", "Otro"].map((opcion) => <option key={opcion}>{opcion}</option>)}
              </select>
            </label>
            {errorVinculo && <p className="familiar-vinculo-error" role="alert">{errorVinculo}</p>}
            <p className="familiar-vinculo-nota">El vínculo se guarda en los datos locales de este navegador.</p>
            <footer><button type="button" onClick={() => setVincularAbierto(false)}>Cancelar</button><button type="button" disabled={!familiarElegido} onClick={vincularFamiliar}>Vincular familiar</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}

export default function VistaPacientes({
  modalidad,
  soloConEstudio = false,
  modoClinico = false,
}: {
  modalidad?: "Radiografía" | "Tomografía" | "Ecografía" | "Ecocardiograma";
  soloConEstudio?: boolean;
  modoClinico?: boolean;
}) {
  const { estudios: solicitudesImagen, errorEstudios } = useEstudiosPacientes(!modoClinico);
  const [errorListado, setErrorListado] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [pacientes, setPacientes] = useState<Paciente[]>([]),
    [estudios, setEstudios] = useState<EstudioDemo[]>([]),
    [busqueda, setBusqueda] = useState(""),
    [sexo, setSexo] = useState("todos"),
    [sucursal, setSucursal] = useState("todas");
  const [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(10),
    [cargando, setCargando] = useState(true),
    [abierto, setAbierto] = useState(false),
    [registroAbierto, setRegistroAbierto] = useState(false),
    [form, setForm] = useState(inicial),
    [error, setError] = useState(""),
    [guardando, setGuardando] = useState(false),
    [editando, setEditando] = useState<Paciente | null>(null),
    [volverAFichaTrasEditar, setVolverAFichaTrasEditar] = useState(false),
    [viendo, setViendo] = useState<Paciente | null>(null),
    [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(
      null,
    ),
    [pacienteRadiografia, setPacienteRadiografia] = useState<Paciente | null>(
      null,
    ),
    [archivoRadiografia, setArchivoRadiografia] = useState<File | null>(null),
    [errorRadiografia, setErrorRadiografia] = useState(""),
    [guardandoRadiografia, setGuardandoRadiografia] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const actualizar = () => setEstudios(obtenerEstudios());
    actualizar();
    setCargando(true);
    setErrorListado("");
    void listarPacientes(controller.signal)
      .then((datos) => {
        if (!controller.signal.aborted) setPacientes(datos);
      })
      .catch((causa) => {
        if (!controller.signal.aborted)
          setErrorListado(
            causa instanceof Error
              ? causa.message
              : "No se pudieron cargar los pacientes.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    window.addEventListener("radiuus:datos-demo", actualizar);
    return () => {
      controller.abort();
      window.removeEventListener("radiuus:datos-demo", actualizar);
    };
  }, [recarga]);
  useEffect(() => {
    const actualizar = () => setRecarga((valor) => valor + 1);
    window.addEventListener("pacientes:actualizados", actualizar);
    window.addEventListener("focus", actualizar);
    return () => {
      window.removeEventListener("pacientes:actualizados", actualizar);
      window.removeEventListener("focus", actualizar);
    };
  }, []);
  const estudiosModalidad = useMemo(
    () => {
      if (modoClinico) return estudios;
      const modalidades: Record<string, string> = { RADIOGRAFIA: 'Radiografía', TOMOGRAFIA: 'Tomografía', ECOGRAFIA: 'Ecografía', ECOCARDIOGRAMA: 'Ecocardiograma' };
      return solicitudesImagen.filter((solicitud) => modalidades[solicitud.tipo] && (!modalidad || modalidades[solicitud.tipo] === modalidad)).map((solicitud) => ({ id: solicitud.id, pacienteId: solicitud.paciente_id, paciente: [solicitud.nombres, solicitud.apellido_paterno, solicitud.apellido_materno].filter(Boolean).join(' '), titulo: solicitud.nombre, categoria: modalidades[solicitud.tipo], descripcion: solicitud.indicaciones || '', nombreArchivo: '', mime: '', creadaEn: solicitud.solicitado_en }));
    },
    [estudios, modalidad, modoClinico, solicitudesImagen],
  );
  const pacientesVisibles = useMemo(() => {
    const unicos = [
      ...new Map(
        pacientes.map((paciente) => [
          (paciente.numeroDocumento || paciente.id)
            .trim()
            .toLocaleUpperCase("es"),
          paciente,
        ]),
      ).values(),
    ];
    return !modoClinico || soloConEstudio || Boolean(modalidad)
      ? unicos.filter((paciente) =>
          estudiosModalidad.some(
            (estudio) => estudio.pacienteId === paciente.id,
          ),
        )
      : unicos;
  }, [pacientes, estudiosModalidad, soloConEstudio, modoClinico]);
  const filtrados = useMemo(
    () =>
      pacientesVisibles.filter(
        (p) =>
          `${nombreCompleto(p)} ${p.numeroDocumento} ${p.telefono} ${p.direccion}`
            .toLowerCase()
            .includes(busqueda.toLowerCase()) &&
          (sexo === "todos" || p.sexo === sexo) &&
          (sucursal === "todas" || (p.sucursal || "Central") === sucursal),
      ),
    [pacientesVisibles, busqueda, sexo, sucursal],
  );
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamano)),
    actual = Math.min(pagina, paginas),
    visibles = filtrados.slice((actual - 1) * tamano, actual * tamano);
  const filtrar = (fn: () => void) => {
    fn();
    setPagina(1);
  };
  const cerrar = (forzar = false) => {
    if (guardando && !forzar) return;
    const regresar = volverAFichaTrasEditar ? editando : null;
    setAbierto(false);
    setEditando(null);
    setForm(inicial);
    setError("");
    setVolverAFichaTrasEditar(false);
    if (regresar) setPacienteSeleccionado(regresar);
  };
  const pacienteRegistrado = (registrado: PacienteRegistrado) => {
    const nuevo = pacienteParaVista(registrado);
    setPacientes((actuales) => [
      nuevo,
      ...actuales.filter((p) => p.id !== nuevo.id),
    ]);
    setRecarga((actual) => actual + 1);
    setBusqueda("");
    setSexo("todos");
    setSucursal("todas");
    setPacienteSeleccionado(nuevo);
    setPagina(1);
  };
  const replegarSidebar = () =>
    window.dispatchEvent(new Event("clinico:replegar-sidebar"));
  const historialConsumos = useMemo(
    (): MovimientoPacienteDemo[] => {
      if (!pacienteSeleccionado) return [];
      return [
        ...obtenerHistorialPacienteDemo(pacienteSeleccionado.id),
        ...estudios
          .filter((estudio) => estudio.pacienteId === pacienteSeleccionado.id)
          .map((estudio) => ({
            id: estudio.id,
            pacienteId: estudio.pacienteId,
            tipo: "consumo" as const,
            concepto: estudio.titulo,
            categoria: estudio.categoria,
            fecha: estudio.creadaEn,
            importe: 0,
          })),
      ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    },
    [estudios, pacienteSeleccionado],
  );
  const abrirEditar = (p: Paciente, desdeFicha = false) => {
    setVolverAFichaTrasEditar(desdeFicha);
    setEditando(p);
    setForm({
      nombres: p.nombres,
      primerApellido: p.primerApellido,
      segundoApellido: p.segundoApellido,
      tipoDocumento: p.tipoDocumento,
      numeroDocumento: p.numeroDocumento,
      fechaNacimiento: p.fechaNacimiento,
      sexo: p.sexo,
      telefono: p.telefono,
      direccion: p.direccion,
      sucursal: p.sucursal || "Central",
    });
    setAbierto(true);
  };
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const d: Paciente = {
        ...(editando || {} as Paciente),
        ...form,
        id: editando?.id || `pac-${crypto.randomUUID()}`,
        creadoEn: editando?.creadoEn || new Date().toISOString(),
      };
      if (!editando)
        throw new Error(
          "Utiliza Registrar paciente para crear una ficha completa.",
        );
      const volverAFicha = volverAFichaTrasEditar;
      const persistirDemo = import.meta.env.DEV && leerSesion()?.token === "frontend-demo-local";
      if (persistirDemo) {
        const nuevos = pacientes.map((p) => p.id === editando.id ? d : p);
        guardarPacientes(nuevos);
        setPacientes(nuevos);
        cerrar(true);
        if (volverAFicha) setPacienteSeleccionado(d);
        return;
      }
      const respuesta = await apiFetch(`/api/v1/pacientes/${editando.id}`, {
        method: "PUT",
        headers: { Accept: "application/json" },
        body: JSON.stringify({
          nombres: d.nombres,
          apellido_paterno: d.primerApellido,
          apellido_materno: d.segundoApellido,
          ci: d.numeroDocumento,
          fecha_nacimiento: d.fechaNacimiento,
          genero:
            (
              {
                femenino: "Femenino",
                masculino: "Masculino",
                otro: "Otro",
              } as Record<string, string>
            )[d.sexo] || d.sexo,
          telefono: d.telefono,
          direccion_domicilio: d.direccion,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok)
        throw new Error(datos.message || "No se pudo guardar el paciente.");
      const guardado = pacienteParaVista(datos.data);
      const nuevos = editando
        ? pacientes.map((p) => (p.id === guardado.id ? guardado : p))
        : [guardado, ...pacientes];
      window.dispatchEvent(new Event("pacientes:actualizados"));
      setPacientes(nuevos);
      cerrar(true);
      if (volverAFicha) setPacienteSeleccionado(guardado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };
  const estudioDe = (p: Paciente) =>
    estudiosModalidad.find((e) => e.pacienteId === p.id);
  const cerrarRadiografia = () => {
    if (guardandoRadiografia) return;
    setPacienteRadiografia(null);
    setArchivoRadiografia(null);
    setErrorRadiografia("");
  };
  const abrirRadiografia = (p: Paciente) => {
    const estudio = estudioDe(p);
    if (estudio) {
      seleccionarEstudio(estudio.id);
      return;
    }
    setPacienteRadiografia(p);
    setArchivoRadiografia(null);
    setErrorRadiografia("");
  };
  const subirRadiografia = async (e: FormEvent) => {
    e.preventDefault();
    if (!pacienteRadiografia || !archivoRadiografia)
      return setErrorRadiografia(
        `Selecciona el archivo de ${modalidad?.toLowerCase() || "imagenología"}.`,
      );
    if (archivoRadiografia.size > 200 * 1024 * 1024)
      return setErrorRadiografia("El archivo no debe superar 200 MB.");
    setGuardandoRadiografia(true);
    setErrorRadiografia("");
    try {
      const id = `est-${crypto.randomUUID()}`,
        nuevo: EstudioDemo = {
          id,
          pacienteId: pacienteRadiografia.id,
          paciente: nombreCompleto(pacienteRadiografia),
          titulo: archivoRadiografia.name.replace(/\.[^.]+$/, ""),
          categoria: modalidad || "Radiografía",
          descripcion: "",
          nombreArchivo: archivoRadiografia.name,
          mime: archivoRadiografia.type || "application/octet-stream",
          creadaEn: new Date().toISOString(),
        };
      await guardarArchivoEstudio(id, archivoRadiografia);
      guardarEstudios([nuevo, ...estudios]);
      setEstudios((v) => [nuevo, ...v]);
      cerrarRadiografia();
    } catch (e) {
      setErrorRadiografia(
        e instanceof Error
          ? e.message
          : `No se pudo guardar el estudio de ${modalidad?.toLowerCase() || "imagenología"}.`,
      );
    } finally {
      setGuardandoRadiografia(false);
    }
  };
  const Paginacion = ({ tam = false }: { tam?: boolean }) => (
    <div className="usuarios-paginacion">
      <small>
        {filtrados.length
          ? `${(actual - 1) * tamano + 1}–${Math.min(actual * tamano, filtrados.length)} de ${filtrados.length}`
          : "0 resultados"}
      </small>
      <div>
        {tam && (
          <label className="selector-tamano">
            <span>Tamaño</span>
            <select
              value={tamano}
              onChange={(e) => {
                setTamano(Number(e.target.value));
                setPagina(1);
              }}
            >
              {[5, 10, 15, 20, 30, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <button disabled={actual === 1} onClick={() => setPagina((p) => p - 1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <span>
          Página <strong>{actual}</strong> de {paginas}
        </span>
        <button
          disabled={actual === paginas}
          onClick={() => setPagina((p) => p + 1)}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
  if (viendo && !modoClinico)
    return (
      <InspeccionPaciente
        paciente={viendo}
        estudios={estudiosModalidad}
        onVolver={() => setViendo(null)}
      />
    );
  if (pacienteSeleccionado && modoClinico)
    return (
      <FichaPacienteCompleta
        paciente={pacienteSeleccionado}
        pacientes={pacientes}
        estudios={estudios}
        onVolver={() => setPacienteSeleccionado(null)}
        onEditar={() => {
          const actual = pacienteSeleccionado;
          setPacienteSeleccionado(null);
          if (actual) abrirEditar(actual, true);
        }}
        onVerFamiliar={(familiar) => setPacienteSeleccionado(familiar)}
      />
    );
  return (
    <div
      className="usuarios-vista pacientes-vista"
      onPointerDownCapture={replegarSidebar}
    >
      {errorListado && (
        <div role="alert">
          {errorListado}{" "}
          <button
            type="button"
            onClick={() => setRecarga((actual) => actual + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {!modoClinico && errorEstudios && <div role="alert">{errorEstudios}</div>}
      <div className="usuarios-herramientas">
        <label className="pacientes-buscador">
          <Icon name="search" size={18} />
          <input
            value={busqueda}
            onChange={(e) => filtrar(() => setBusqueda(e.target.value))}
            placeholder="Buscar por nombre, documento, celular o dirección..."
          />
        </label>
        <label className="pacientes-filtro">
          <span>Sexo</span>
          <select
            value={sexo}
            onChange={(e) => filtrar(() => setSexo(e.target.value))}
          >
            <option value="todos">Todos los sexos</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="otro">Otro</option>
            <option value="no_especifica">No especifica</option>
          </select>
        </label>
        {modoClinico && (
          <label className="pacientes-filtro">
            <span>Sucursal</span>
            <select
              value={sucursal}
              onChange={(e) => filtrar(() => setSucursal(e.target.value))}
              aria-label="Filtrar por sucursal"
            >
              <option value="todas">Todas las sucursales</option>
              <option value="Central">Sucursal Central</option>
              <option value="Norte">Sucursal Norte</option>
              <option value="Sur">Sucursal Sur</option>
            </select>
          </label>
        )}
        {modoClinico && (
          <button
            className="usuarios-crear pacientes-registrar"
            type="button"
            onClick={() => setRegistroAbierto(true)}
          >
            <Icon name="plus" size={17} />
            Registrar nuevo paciente
          </button>
        )}
      </div>
      <div
        className={`pacientes-con-historial ${pacienteSeleccionado ? "con-paciente" : ""}`}
      >
        <div className="pacientes-listado">
          <div
            className={`usuarios-tabla pacientes-tabla ${modoClinico ? "pacientes-tabla-sin-sucursal" : ""}`}
          >
            <Paginacion tam />
            <div className="usuarios-fila usuarios-columnas">
              <span>Paciente</span>
              <span>Fecha de nacimiento</span>
              <span>Documento</span>
              <span>Edad</span>
              <span>Sexo</span>
              <span>Celular</span>
              {!modoClinico && (
                <>
                  <span>Tipo de estudio</span>
                  <span>Estado</span>
                </>
              )}
              <span>Acciones</span>
            </div>
            {cargando ? (
              <div className="usuarios-mensaje">Cargando pacientes…</div>
            ) : visibles.length ? (
              visibles.map((p) => {
                const estudio = estudioDe(p);
                return (
                  <div
                    className={`usuarios-fila ${pacienteSeleccionado?.id === p.id ? "paciente-activo" : ""}`}
                    key={p.id}
                  >
                    <div className="usuario-identidad">
                      <div>
                        <strong>{nombreCompleto(p)}</strong>
                      </div>
                    </div>
                    <div>
                      <strong className="dato-movil">
                        Fecha de nacimiento
                      </strong>
                      <span>
                        {p.fechaNacimiento
                          ? new Date(
                              `${p.fechaNacimiento}T00:00:00`,
                            ).toLocaleDateString("es-ES")
                          : "No registrada"}
                      </span>
                    </div>
                    <div>
                      <strong className="dato-movil">Documento</strong>
                      <span>
                        {p.tipoDocumento} · {p.numeroDocumento}
                      </span>
                    </div>
                    <div>
                      <strong className="dato-movil">Edad</strong>
                      <span>
                        {calcularEdad(p.fechaNacimiento) === null
                          ? "No registrada"
                          : `${calcularEdad(p.fechaNacimiento)} años`}
                      </span>
                    </div>
                    <div>
                      <strong className="dato-movil">Sexo</strong>
                      <span>{p.sexo.replace("_", " ") || "No registrado"}</span>
                    </div>
                    <div>
                      <strong className="dato-movil">Celular</strong>
                      <span>{p.telefono || "No registrado"}</span>
                    </div>
                    {!modoClinico && (
                      <>
                        <div className="radiografia-tipo">
                          <strong className="dato-movil">
                            Tipo de estudio
                          </strong>
                          <span>
                            {estudio?.titulo || modalidad || "Sin estudio"}
                          </span>
                        </div>
                        <div className="radiografia-estado">
                          <strong className="dato-movil">Estado</strong>
                          <span
                            className={
                              estudio && solicitudesImagen.find((solicitud) => solicitud.id === estudio.id)?.estado === 'EN_PROCESO' ? "estado-cargado" : "estado-pendiente"
                            }
                          >
                            {estudio && solicitudesImagen.find((solicitud) => solicitud.id === estudio.id)?.estado === 'EN_PROCESO' ? 'En proceso' : 'Solicitado'}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="acciones-tabla">
                      {modoClinico ? (
                        <button
                          className="usuario-accion"
                          type="button"
                          onClick={() => setPacienteSeleccionado(p)}
                          title="Ver paciente"
                          aria-label={`Ver paciente ${nombreCompleto(p)}`}
                        >
                          <Icon name="eye" size={16} />
                          <span>Ver paciente</span>
                        </button>
                      ) : (
                        <button
                          className="usuario-accion"
                          onClick={() => {
                            setViendo(p);
                          }}
                          title={
                            !modalidad
                              ? "Inspeccionar paciente"
                              : "Ver paciente"
                          }
                          aria-label={
                            !modalidad
                              ? `Inspeccionar estudios de ${nombreCompleto(p)}`
                              : `Ver paciente ${nombreCompleto(p)}`
                          }
                        >
                          <Icon name="eye" size={16} />
                          <span>Ver paciente</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="usuarios-mensaje">
                <span>
                  <Icon name="users" size={25} />
                </span>
                <strong>No hay pacientes para mostrar</strong>
                <small>{modoClinico ? 'Registra el primer paciente o cambia los filtros.' : 'No hay solicitudes de imagenología pendientes para los filtros seleccionados.'}</small>
              </div>
            )}
          </div>
          <Paginacion tam />
        </div>
        {pacienteSeleccionado && (
          <aside
            className="historial-consumos"
            aria-label={`Ficha e historial de consumo de ${nombreCompleto(pacienteSeleccionado)}`}
          >
            <header>
              <div>
                <p>FICHA DEL PACIENTE</p>
                <h3>{nombreCompleto(pacienteSeleccionado)}</h3>
                <small>
                  {pacienteSeleccionado.tipoDocumento}{" "}
                  {pacienteSeleccionado.numeroDocumento}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setPacienteSeleccionado(null)}
                aria-label="Cerrar ficha"
              >
                <Icon name="close" size={16} />
              </button>
            </header>
            <section className="ficha-paciente-datos">
              <div>
                <span>Fecha de nacimiento</span>
                <strong>
                  {pacienteSeleccionado.fechaNacimiento
                    ? new Date(
                        `${pacienteSeleccionado.fechaNacimiento}T00:00:00`,
                      ).toLocaleDateString("es-BO")
                    : "No registrada"}
                </strong>
              </div>
              <div>
                <span>Edad</span>
                <strong>
                  {calcularEdad(pacienteSeleccionado.fechaNacimiento) === null
                    ? "No registrada"
                    : `${calcularEdad(pacienteSeleccionado.fechaNacimiento)} años`}
                </strong>
              </div>
              <div>
                <span>Sexo</span>
                <strong>
                  {pacienteSeleccionado.sexo.replace("_", " ") ||
                    "No registrado"}
                </strong>
              </div>
              <div>
                <span>Celular</span>
                <strong>
                  {pacienteSeleccionado.telefono || "No registrado"}
                </strong>
              </div>
              <div className="ficha-paciente-direccion">
                <span>Dirección</span>
                <strong>
                  {pacienteSeleccionado.direccion || "No registrada"}
                </strong>
              </div>
            </section>
            <h4 className="historial-consumos-titulo">Historial de consumos</h4>
            <label className="historial-filtro">
              <span>Todos</span>
              <select aria-label="Filtrar historial">
                <option>Todos</option>
                <option>Pagados</option>
                <option>Pendientes</option>
              </select>
            </label>
            <div className="historial-lista">
              {historialConsumos.length ? (
                historialConsumos.map((estudio) => (
                  <article className={`consumo-card ${estudio.tipo}`} key={estudio.id}>
                    <strong>{estudio.concepto}</strong>
                    <span>{estudio.categoria}{estudio.metodoPago ? ` · ${estudio.metodoPago}` : ""}</span>
                    <small>{estudio.referencia || (estudio.tipo === "pago" ? "Pago recibido" : "Consumo registrado")}</small>
                    <footer>
                      <time>
                        {new Date(estudio.fecha).toLocaleDateString(
                          "es-BO",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      </time>
                      <b>{estudio.tipo === "pago" ? "−" : ""}Bs {estudio.importe.toFixed(2)}</b>
                    </footer>
                  </article>
                ))
              ) : (
                <div className="historial-vacio">
                  <Icon name="fileText" size={23} />
                  <strong>Sin consumos registrados</strong>
                  <small>
                    Los estudios, servicios y cargos de este paciente aparecerán
                    aquí.
                  </small>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      {abierto && editando && (
        <div className="usuario-modal-fondo" onClick={() => cerrar()}>
          <form
            className="usuario-modal usuario-formulario"
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="usuario-modal-cerrar"
              onClick={() => cerrar()}
            >
              <Icon name="close" />
            </button>
            <div className="usuario-modal-titulo">
              <span>
                <Icon name="users" size={23} />
              </span>
              <div>
                <h3>{editando ? "Editar paciente" : "Registrar paciente"}</h3>
                <p>Completa su identificación e información personal.</p>
              </div>
            </div>
            {error && <div className="usuario-form-error">{error}</div>}
            <div className="paciente-campos paciente-campos-completos">
              <label>
                Nombres
                <input
                  required
                  value={form.nombres}
                  onChange={(e) =>
                    setForm({ ...form, nombres: e.target.value })
                  }
                />
              </label>
              <label>
                Primer apellido
                <input
                  required
                  value={form.primerApellido}
                  onChange={(e) =>
                    setForm({ ...form, primerApellido: e.target.value })
                  }
                />
              </label>
              <label>
                Segundo apellido
                <input
                  required
                  value={form.segundoApellido}
                  onChange={(e) =>
                    setForm({ ...form, segundoApellido: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo de documento
                <select
                  value={form.tipoDocumento}
                  onChange={(e) =>
                    setForm({ ...form, tipoDocumento: e.target.value })
                  }
                >
                  <option>CI</option>
                  <option>Pasaporte</option>
                  <option>Documento extranjero</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>
                Número de documento o CI
                <input
                  required
                  value={form.numeroDocumento}
                  onChange={(e) =>
                    setForm({ ...form, numeroDocumento: e.target.value })
                  }
                />
              </label>
              <label>
                Fecha de nacimiento
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.fechaNacimiento}
                  onChange={(e) =>
                    setForm({ ...form, fechaNacimiento: e.target.value })
                  }
                />
              </label>
              <label>
                Edad calculada
                <input
                  readOnly
                  value={
                    calcularEdad(form.fechaNacimiento) === null
                      ? "Selecciona la fecha"
                      : `${calcularEdad(form.fechaNacimiento)} años`
                  }
                />
              </label>
              <label>
                Sexo
                <select
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                >
                  <option value="no_especifica">No especifica</option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label>
                Número de celular / WhatsApp
                <input
                  required
                  type="tel"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                />
              </label>
              <label className="campo-direccion">
                Dirección
                <textarea
                  required
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                />
              </label>
              <label>
                Sucursal
                <select
                  value={form.sucursal}
                  onChange={(e) =>
                    setForm({ ...form, sucursal: e.target.value })
                  }
                >
                  <option value="Central">Sucursal Central</option>
                  <option value="Norte">Sucursal Norte</option>
                  <option value="Sur">Sucursal Sur</option>
                </select>
              </label>
            </div>
            <div className="usuario-form-acciones">
              <button type="button" onClick={() => cerrar()}>
                Cancelar
              </button>
              <button className="usuarios-crear" disabled={guardando}>
                <Icon name="check" size={17} />
                {guardando
                  ? "Guardando…"
                  : editando
                    ? "Guardar cambios"
                    : "Guardar paciente"}
              </button>
            </div>
          </form>
        </div>
      )}
      {registroAbierto && (
        <ModalRegistroPaciente
          onCerrar={() => setRegistroAbierto(false)}
          onRegistrado={pacienteRegistrado}
        />
      )}
      {viendo && (
        <div className="usuario-modal-fondo" onClick={() => setViendo(null)}>
          <div
            className="usuario-modal ficha-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="usuario-modal-cerrar"
              onClick={() => setViendo(null)}
            >
              <Icon name="close" />
            </button>
            <div className="usuario-modal-titulo">
              <span>
                <Icon name="users" size={23} />
              </span>
              <div>
                <h3>{nombreCompleto(viendo)}</h3>
                <p>Información del paciente</p>
              </div>
            </div>
            <div className="ficha-datos">
              <div>
                <small>Documento</small>
                <strong>
                  {viendo.numeroDocumento
                    ? `${viendo.tipoDocumento || "Documento"} · ${viendo.numeroDocumento}`
                    : "No registrado"}
                </strong>
              </div>
              <div>
                <small>Nacimiento y edad</small>
                <strong>
                  {viendo.fechaNacimiento
                    ? `${viendo.fechaNacimiento} · ${calcularEdad(viendo.fechaNacimiento)} años`
                    : "No registrado"}
                </strong>
              </div>
              <div>
                <small>Sexo</small>
                <strong>{viendo.sexo.replace("_", " ")}</strong>
              </div>
              <div>
                <small>Celular / WhatsApp</small>
                <strong>{viendo.telefono || "No registrado"}</strong>
              </div>
              <div className="ficha-direccion">
                <small>Dirección</small>
                <strong>{viendo.direccion || "No registrada"}</strong>
              </div>
            </div>
            <div className="usuario-form-acciones">
              <button onClick={() => setViendo(null)}>Cerrar</button>
              <button
                className="usuarios-crear"
                onClick={() => {
                  const paciente = viendo;
                  setViendo(null);
                  abrirEditar(paciente);
                }}
              >
                <Icon name="edit" size={16} />
                Editar paciente
              </button>
            </div>
          </div>
        </div>
      )}
      {pacienteRadiografia && (
        <div className="usuario-modal-fondo" onClick={cerrarRadiografia}>
          <div
            className="usuario-modal informe-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="usuario-modal-cerrar"
              onClick={cerrarRadiografia}
            >
              <Icon name="close" />
            </button>
            <div className="usuario-modal-titulo">
              <span>
                <Icon name="image" size={23} />
              </span>
              <div>
                <h3>Subir {modalidad?.toLowerCase() || "estudio"}</h3>
                <p>{nombreCompleto(pacienteRadiografia)}</p>
              </div>
            </div>
            {errorRadiografia && (
              <div className="usuario-form-error">{errorRadiografia}</div>
            )}
            <p className="radiografia-ayuda">
              Carga el estudio en imagen, DICOM, ZIP o RAR para asociarlo a este
              paciente y dejarlo disponible en el visor.
            </p>
            <form className="informe-carga" onSubmit={subirRadiografia}>
              <label>
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/dicom,application/zip,application/x-rar-compressed,.dcm,.zip,.rar"
                  onChange={(e) =>
                    setArchivoRadiografia(e.target.files?.[0] || null)
                  }
                />
                <span>
                  <Icon name="plus" size={17} />
                  {archivoRadiografia
                    ? archivoRadiografia.name
                    : `Seleccionar ${modalidad?.toLowerCase() || "estudio"}`}
                </span>
              </label>
              <div className="usuario-form-acciones">
                <button type="button" onClick={cerrarRadiografia}>
                  Cerrar
                </button>
                <button
                  className="usuarios-crear"
                  disabled={!archivoRadiografia || guardandoRadiografia}
                >
                  <Icon name="check" size={16} />
                  {guardandoRadiografia
                    ? "Guardando…"
                    : `Subir ${modalidad?.toLowerCase() || "estudio"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
