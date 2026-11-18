import { fechaISOEnBolivia } from "../../utils/fechaBolivia";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AvisoTemporal } from "../../radius/componentes/AvisoTemporal";
import Icon from "../../radius/componentes/Icono";
import { usePacientes } from "../../radius/vistas/pacientes/usePacientes";
import { pacienteParaVista } from "../../radius/vistas/pacientes/pacientesApi";
import type { PacienteDemo } from "../../radius/datos/almacenDemo";
import "./AmbulanciaView.css";
import "./AmbulanciaLayout.css";

type Vista = "traslados" | "programar" | "historial" | "unidad";
type Estado = "Programado" | "En curso" | "Finalizado" | "Cancelado";
type SolicitudAmbulancia = {
  cuentaId: string;
  paciente: string;
  ci: string;
  fecha: string;
  hora: string;
  motivo: string;
  destino: string;
};
type Traslado = {
  id: number;
  solicitudId?: string;
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
const REQUESTS_KEY = "hme:emergencias:traslados-ambulancia:v1";
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
  const [solicitudes, setSolicitudes] = useState<SolicitudAmbulancia[]>([]);
  const [solicitudSeleccionada, setSolicitudSeleccionada] =
    useState<SolicitudAmbulancia | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState("");
  const [modalProgramacionAbierto, setModalProgramacionAbierto] = useState(false);
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
  useEffect(() => {
    const leerSolicitudes = () => {
      try {
        const guardadas = JSON.parse(
          localStorage.getItem(REQUESTS_KEY) || "{}",
        ) as Record<string, { fecha?: string; hora?: string; motivo?: string; destino?: string; paciente?: string; ci?: string }>;
        const idsRegistrados = new Set(
          leerDatos().traslados.map((traslado) => String(traslado.solicitudId || "")),
        );
        const pendientes = Object.entries(guardadas)
          .filter(([cuentaId]) => !idsRegistrados.has(cuentaId))
          .map(([cuentaId, solicitud]) => ({
            cuentaId,
            paciente: solicitud.paciente || `Paciente de Emergencias · ${cuentaId}`,
            ci: solicitud.ci || "",
            fecha: solicitud.fecha || hoy(),
            hora: solicitud.hora || "",
            motivo: solicitud.motivo || "Traslado solicitado desde Emergencias",
            destino: solicitud.destino || "",
          }));
        setSolicitudes(pendientes);
      } catch {
        setSolicitudes([]);
      }
    };
    leerSolicitudes();
    window.addEventListener("storage", leerSolicitudes);
    window.addEventListener("focus", leerSolicitudes);
    return () => {
      window.removeEventListener("storage", leerSolicitudes);
      window.removeEventListener("focus", leerSolicitudes);
    };
  }, []);
  useEffect(() => {
    const refrescarSolicitudes = () => {
      try {
        const guardadas = JSON.parse(
          localStorage.getItem(REQUESTS_KEY) || "{}",
        ) as Record<string, { fecha?: string; hora?: string; motivo?: string; destino?: string; paciente?: string; ci?: string }>;
        const pendientes = Object.entries(guardadas).map(([cuentaId, solicitud]) => ({
          cuentaId,
          paciente: solicitud.paciente || `Paciente de Emergencias · ${cuentaId}`,
          ci: solicitud.ci || "",
          fecha: solicitud.fecha || hoy(),
          hora: solicitud.hora || "",
          motivo: solicitud.motivo || "Traslado solicitado desde Emergencias",
          destino: solicitud.destino || "",
        }));
        setSolicitudes((actuales) => {
          const actualizadas = pendientes.filter((item) =>
            !leerDatos().traslados.some((traslado) => String(traslado.solicitudId || "") === item.cuentaId),
          );
          return JSON.stringify(actuales) === JSON.stringify(actualizadas) ? actuales : actualizadas;
        });
      } catch {
        setSolicitudes([]);
      }
    };
    const intervalo = window.setInterval(refrescarSolicitudes, 500);
    return () => window.clearInterval(intervalo);
  }, []);
  const activos = datos.traslados.filter(
    (item) => item.estado === "Programado" || item.estado === "En curso",
  );
  const bajos = datos.insumos.filter((item) => item.cantidad <= item.minimo);
  const solicitudesFiltradas = useMemo(() => {
    const consulta = busquedaSolicitudes.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return [...solicitudes]
      .filter((solicitud) =>
        !consulta || `${solicitud.paciente} ${solicitud.ci} ${solicitud.destino} ${solicitud.motivo}`
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(consulta),
      )
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  }, [solicitudes, busquedaSolicitudes]);
  const historial = useMemo(
    () =>
      datos.traslados
        .filter((item) => item.estado === "En curso" || item.estado === "Finalizado")
        .filter((item) => {
          const consulta = busqueda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const contenido = `${item.paciente} ${item.origen} ${item.destino} ${item.responsable} ${item.tipo} ${item.estado}`
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          return (!consulta || contenido.includes(consulta))
            && (filtroEstado === "Todos" || item.estado === filtroEstado)
            && (filtroTipo === "Todos" || item.tipo === filtroTipo)
            && (!fechaDesde || item.fecha >= fechaDesde)
            && (!fechaHasta || item.fecha <= fechaHasta);
        })
        .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)),
    [datos.traslados, busqueda, filtroEstado, filtroTipo, fechaDesde, fechaHasta],
  );
  const exportarHistorialPdf = async () => {
    if (!historial.length) {
      setAviso("No hay traslados para exportar con los filtros seleccionados.");
      return;
    }
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.setTextColor(23, 62, 97);
    pdf.text("Historial de transporte de pacientes", 14, 17);
    pdf.setFontSize(9);
    pdf.setTextColor(90, 116, 137);
    pdf.text(`Registros: ${historial.length} · Periodo: ${fechaDesde || "inicio"} a ${fechaHasta || "hoy"}`, 14, 24);
    autoTable(pdf, {
      startY: 30,
      head: [["Fecha", "Paciente", "Tipo", "Origen", "Destino", "Responsable", "Estado"]],
      body: historial.map((item) => [item.fecha, item.paciente, item.tipo, item.origen, item.destino, item.responsable, item.estado]),
      styles: { fontSize: 8, cellPadding: 3, textColor: [36, 74, 102] },
      headStyles: { fillColor: [8, 127, 189], textColor: 255 },
      alternateRowStyles: { fillColor: [242, 249, 253] },
    });
    pdf.save(`historial-ambulancia-${hoy()}.pdf`);
  };
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
    if (!pacienteSeleccionado && !solicitudSeleccionada) {
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
          paciente: solicitudSeleccionada?.paciente || formulario.paciente.trim(),
          solicitudId: solicitudSeleccionada?.cuentaId,
          fecha: solicitudSeleccionada?.fecha || formulario.fecha,
          origen: formulario.origen.trim(),
          destino: (solicitudSeleccionada?.destino || formulario.destino).trim(),
          tipo: solicitudSeleccionada ? "Traslado solicitado desde Emergencias" : formulario.tipo,
          responsable: formulario.responsable.trim(),
          kilometrajeInicial: km,
          estado: "Programado",
        },
        ...actual.traslados,
      ],
    }));
    if (solicitudSeleccionada) {
      try {
        const guardadas = JSON.parse(localStorage.getItem(REQUESTS_KEY) || "{}") as Record<string, unknown>;
        delete guardadas[solicitudSeleccionada.cuentaId];
        localStorage.setItem(REQUESTS_KEY, JSON.stringify(guardadas));
      } catch {
        // La salida queda registrada aunque la cola compartida no se pueda leer.
      }
      setSolicitudes((actuales) => actuales.filter((item) => item.cuentaId !== solicitudSeleccionada.cuentaId));
      setSolicitudSeleccionada(null);
    }
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
        <div className="ambulancia-lista-programados">
        <div className="ambulancia-herramientas">
          <label><Icon name="search" size={17} /><input value={busquedaSolicitudes} onChange={(e) => setBusquedaSolicitudes(e.target.value)} placeholder="Buscar paciente, CI, destino o motivo" /></label>
          <button type="button" className="ambulancia-primario" onClick={() => setModalProgramacionAbierto(true)}><Icon name="plus" size={16} /> Programar transporte</button>
        </div>
        <section className="ambulancia-cola panel" aria-label="Pacientes con traslado programado">
          <header>
            <span>HORARIO</span>
            <span>PACIENTE</span>
            <span>DESTINO</span>
            <span>MOTIVO DEL TRASLADO</span>
            <span>ESTADO</span>
            <span>ACCIÓN</span>
          </header>
          {solicitudesFiltradas.length ? (
            solicitudesFiltradas
              .map((solicitud) => (
                <article key={solicitud.cuentaId}>
                  <time>
                    <strong>{solicitud.hora || "Hora pendiente"}</strong>
                    <small>{solicitud.fecha}</small>
                  </time>
                  <div>
                    <strong>{solicitud.paciente}</strong>
                    {solicitud.ci && <small>CI {solicitud.ci}</small>}
                  </div>
                  <div className="ambulancia-cola-destino">
                    <strong>{solicitud.destino || "Destino no especificado"}</strong>
                  </div>
                  <div className="ambulancia-cola-motivo">
                    <strong>{solicitud.motivo}</strong>
                  </div>
                  <span className="ambulancia-programado">Programado</span>
                  <button type="button" className="ambulancia-programar-fila" onClick={() => { setSolicitudSeleccionada(solicitud); setVista("programar"); }}><Icon name="calendar" size={15} /> Programar</button>
                </article>
              ))
          ) : (
            <div className="ambulancia-cola-vacia" role="status">
              <Icon name="ambulance" size={25} />
              <strong>{solicitudes.length ? "No se encontraron pacientes" : "No hay pacientes con traslado programado"}</strong>
              <small>{solicitudes.length ? "Prueba con otro nombre, CI, destino o motivo." : "Las solicitudes registradas en Emergencias aparecerán en esta lista."}</small>
            </div>
          )}
        </section>
        </div>
      )}

      {vista === "programar" && (
        <section className="ambulancia-detalle-programacion" aria-label="Programar transporte">
          {solicitudSeleccionada && (
            <>
              <header className="ambulancia-detalle-cabecera">
                <span className="ambulancia-detalle-icono"><Icon name="patient" size={23} /></span>
                <div><span>PROGRAMACIÓN DE TRANSPORTE</span><h2>Datos del paciente</h2><p>Revisa la solicitud de traslado seleccionada.</p></div>
                <span className="ambulancia-programado">Traslado solicitado</span>
              </header>
              <article className="ambulancia-paciente-resumen">
                <span className="ambulancia-paciente-avatar"><Icon name="patient" size={24} /></span>
                <div><small>PACIENTE</small><h3>{solicitudSeleccionada.paciente}</h3>{solicitudSeleccionada.ci && <span>CI {solicitudSeleccionada.ci}</span>}</div>
              </article>
              <div className="ambulancia-detalle-datos">
                <article><span className="ambulancia-dato-icono"><Icon name="calendar" size={18} /></span><div><small>FECHA Y HORA</small><strong>{solicitudSeleccionada.fecha}</strong><span>{solicitudSeleccionada.hora || "Hora pendiente"}</span></div></article>
                <article><span className="ambulancia-dato-icono"><Icon name="ambulance" size={18} /></span><div><small>DESTINO</small><strong>{solicitudSeleccionada.destino || "No especificado"}</strong></div></article>
                <article className="ambulancia-dato-motivo"><span className="ambulancia-dato-icono"><Icon name="fileText" size={18} /></span><div><small>MOTIVO DEL TRASLADO</small><strong>{solicitudSeleccionada.motivo}</strong></div></article>
              </div>
            </>
          )}
        </section>
      )}

      {modalProgramacionAbierto && (
        <div className="ambulancia-modal-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setModalProgramacionAbierto(false); }}>
          <section className="ambulancia-modal" role="dialog" aria-modal="true" aria-labelledby="ambulancia-modal-titulo">
            <header><div><span>NUEVO TRASLADO</span><h3 id="ambulancia-modal-titulo">Programar transporte</h3></div><button type="button" aria-label="Cerrar" onClick={() => setModalProgramacionAbierto(false)}>×</button></header>
            <p>Selecciona un paciente de la lista para abrir la programación con sus datos.</p>
            <div className="ambulancia-modal-pacientes">
              {solicitudesFiltradas.length ? solicitudesFiltradas.map((solicitud) => (
                <article key={solicitud.cuentaId}><div><strong>{solicitud.paciente}</strong><small>{solicitud.ci ? `CI ${solicitud.ci} · ` : ""}{solicitud.fecha} · {solicitud.hora || "Hora pendiente"}</small><small>{solicitud.destino} · {solicitud.motivo}</small></div><button type="button" className="ambulancia-primario" onClick={() => { setSolicitudSeleccionada(solicitud); setModalProgramacionAbierto(false); setVista("programar"); }}>Seleccionar</button></article>
              )) : <div className="ambulancia-cola-vacia"><strong>No hay pacientes programados para seleccionar</strong></div>}
            </div>
          </section>
        </div>
      )}

      {vista === "historial" && (
        <section className="ambulancia-panel">
          <header className="ambulancia-panel-busqueda">
            <div>
              <span>TRASLADOS REGISTRADOS</span>
              <h3>Historial de transporte de pacientes</h3>
            </div>
          </header>
          <div className="ambulancia-filtros-historial">
            <label className="ambulancia-busqueda-historial"><Icon name="search" size={17} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar paciente, origen, destino o responsable" /></label>
            <label><span>Estado</span><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option>Todos</option><option>En curso</option><option>Finalizado</option></select></label>
            <label><span>Tipo de traslado</span><select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option>Todos</option>{[...new Set(datos.traslados.filter((item) => item.estado === "En curso" || item.estado === "Finalizado").map((item) => item.tipo))].map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
            <label><span>Desde</span><input type="date" value={fechaDesde} max={fechaHasta || undefined} onChange={(e) => setFechaDesde(e.target.value)} /></label>
            <label><span>Hasta</span><input type="date" value={fechaHasta} min={fechaDesde || undefined} onChange={(e) => setFechaHasta(e.target.value)} /></label>
            <button type="button" className="ambulancia-exportar-pdf" onClick={() => void exportarHistorialPdf()}><Icon name="download" size={16} /> Exportar PDF</button>
          </div>
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
                {datos.traslados.some((item) => item.estado === "Programado")
                  ? "Los pacientes aparecerán aquí cuando la ambulancia salga."
                  : "Aún no hay pacientes que hayan utilizado la ambulancia."}
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
