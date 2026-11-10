import {
  useProfesionales,
  etiquetaProfesional,
} from "../../../radius/profesionales";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ModalRegistroPaciente from "../../../radius/vistas/pacientes/ModalRegistroPaciente";
import { usePacientes } from "../../../radius/vistas/pacientes/usePacientes";
import { nombrePacienteClinico } from "../../../radius/vistas/pacientes/pacientesApi";
import Icon from "../../../radius/componentes/Icono";
import { notificar } from "../../../radius/componentes/Notificaciones";
import { apiContableFetch, apiFetch } from "../../../radius/api";
import "./CajaImagenologiaDemo.css";
import "./CatalogoTarjetas.css";
import { InternacionModal } from "./InternacionModal";
import { SolicitudLaboratorioRecepcion } from "./SolicitudLaboratorioRecepcion";
type Tipo = "Producto" | "Insumo" | "Servicio";
type Item = {
  id: string;
  nombre: string;
  tipo: Tipo;
  codigo: string;
  precio: number;
  stock?: number;
  stockMinimo?: number;
  fechaVencimiento?: string;
  categoria?: string;
  subcategoria?: string;
};
const catalogoEjemplo: Item[] = [
  {
    id: "demo-prod-1",
    codigo: "DEMO-PRO-001",
    nombre: "Paracetamol 500 mg",
    tipo: "Producto",
    categoria: "Farmacia",
    precio: 2.5,
    stock: 120,
  },
  {
    id: "demo-prod-2",
    codigo: "DEMO-PRO-002",
    nombre: "Ibuprofeno 400 mg",
    tipo: "Producto",
    categoria: "Farmacia",
    precio: 3,
    stock: 80,
  },
  {
    id: "demo-prod-3",
    codigo: "DEMO-PRO-003",
    nombre: "Alcohol antiséptico 70%",
    tipo: "Producto",
    categoria: "Farmacia",
    precio: 18,
    stock: 35,
  },
  {
    id: "demo-ins-1",
    codigo: "DEMO-INS-001",
    nombre: "Jeringa descartable 5 ml",
    tipo: "Insumo",
    categoria: "Material médico",
    precio: 3.5,
    stock: 100,
  },
  {
    id: "demo-ins-2",
    codigo: "DEMO-INS-002",
    nombre: "Guantes de examen",
    tipo: "Insumo",
    categoria: "Material médico",
    precio: 2,
    stock: 160,
  },
  {
    id: "demo-ins-3",
    codigo: "DEMO-INS-003",
    nombre: "Gasas estériles",
    tipo: "Insumo",
    categoria: "Material médico",
    precio: 8,
    stock: 45,
  },
  {
    id: "demo-srv-1",
    codigo: "DEMO-SRV-001",
    nombre: "Hemograma completo",
    tipo: "Servicio",
    categoria: "Laboratorio",
    precio: 60,
  },
  {
    id: "demo-srv-2",
    codigo: "DEMO-SRV-002",
    nombre: "Glucosa en sangre",
    tipo: "Servicio",
    categoria: "Laboratorio",
    precio: 35,
  },
  {
    id: "demo-srv-3",
    codigo: "DEMO-SRV-003",
    nombre: "Electrocardiograma",
    tipo: "Servicio",
    categoria: "Cardiología",
    precio: 120,
  },
  {
    id: "demo-srv-4",
    codigo: "DEMO-SRV-004",
    nombre: "Curación ambulatoria",
    tipo: "Servicio",
    categoria: "Enfermería",
    precio: 50,
  },
];
type Linea = Item & {
  cantidad: number;
  estudioImagen?: string;
  piezaImagen?: string;
};
type Pago = { id: number; metodo: string; monto: string };
type CajaVenta = {
  id: number;
  nombre: string;
  codigo: string;
  sucursal_id: number;
  sucursal: string;
  almacenes: { id: number; nombre: string }[];
};
type ClienteVenta = {
  id: string;
  paciente_id?: string;
  nit_ci: string | null;
  nombre_razon_social: string;
  telefono: string | null;
  correo: string | null;
};

function SelectorContexto({
  etiqueta,
  valor,
  opciones,
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  opciones: string[];
  onCambiar: (valor: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="punto-selector-contexto">
      <span>{etiqueta}</span>
      <button
        type="button"
        className={`punto-selector-disparador ${abierto ? "abierto" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
      >
        {valor}
        <Icon name="chevronDown" size={15} />
      </button>
      {abierto && (
        <div
          className="punto-selector-opciones"
          role="listbox"
          aria-label={`Seleccionar ${etiqueta}`}
        >
          {opciones.map((opcion) => (
            <button
              key={opcion}
              type="button"
              role="option"
              aria-selected={opcion === valor}
              className={opcion === valor ? "seleccionada" : ""}
              onClick={() => {
                onCambiar(opcion);
                setAbierto(false);
              }}
            >
              {opcion}
              {opcion === valor && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const escaparRegex = (texto: string) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
const resaltarCoincidencia = (texto: string, consulta: string): ReactNode => {
  const termino = consulta.trim();
  if (!termino) return texto;
  const partes = texto.split(new RegExp(`(${escaparRegex(termino)})`, "ig"));
  return partes.map((parte, indice) =>
    parte.toLocaleLowerCase("es") === termino.toLocaleLowerCase("es") ? (
      <strong className="cliente-texto-coincidente" key={indice}>
        {parte}
      </strong>
    ) : (
      parte
    ),
  );
};
type VentaHistorial = {
  id: string;
  codigo: string;
  estado: string;
  total: string | number;
  fecha: string;
  sucursal: string | null;
  caja: string | null;
  cajero: string;
  pagos: { metodo: string; monto: string | number }[] | null;
  cambio: string | number | null;
  detalles: {
    nombre_item: string;
    cantidad: string | number;
    precio_unitario: string | number;
    total: string | number;
  }[];
};
type ConsumoHistorial = {
  id: string;
  n: string;
  fecha: string;
  total: string;
  estado: "Pagado" | "No pagado" | "Anulado" | "Pre venta";
  detalle: string;
  datos: DetalleConsumo;
};
type ItemConsumo = {
  concepto: string;
  cantidad: number;
  unitario: string;
  total: string;
};
type DetalleConsumo = {
  items: ItemConsumo[];
  pagado: string;
  pagos: string[];
  cajero: string;
  caja: string;
  sucursal: string;
};

const formatoImporte = (valor: string | number) => Number(valor).toFixed(2);
const dinero = (n: number) => `Bs ${n.toFixed(2)}`;
const fechaVencimientoCatalogo = (fecha?: string) =>
  fecha
    ? new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(
        new Date(`${fecha.slice(0, 10)}T00:00:00`),
      )
    : "Sin fecha registrada";
const alertasInventario = (item: Item) => {
  const alertas: {
    tipo: "stock" | "vencimiento";
    texto: string;
    nivel: "bajo" | "proximo" | "vencido";
  }[] = [];
  if (
    item.stock !== undefined &&
    item.stockMinimo !== undefined &&
    item.stock <= item.stockMinimo
  )
    alertas.push({
      tipo: "stock",
      texto: `Stock bajo: ${item.stock} de mínimo ${item.stockMinimo}`,
      nivel: "bajo",
    });
  if (item.fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vence = new Date(`${item.fechaVencimiento}T00:00:00`);
    const dias = Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000);
    if (dias < 0)
      alertas.push({
        tipo: "vencimiento",
        texto: "Producto vencido",
        nivel: "vencido",
      });
    else if (dias <= 90)
      alertas.push({
        tipo: "vencimiento",
        texto:
          dias === 0
            ? "Vence hoy"
            : `Vence en ${dias} día${dias === 1 ? "" : "s"}`,
        nivel: "proximo",
      });
  }
  return alertas;
};
const pagoNuevo = (id: number): Pago => ({ id, metodo: "Efectivo", monto: "" });

export function CajaRecepcionView({
  onAbrirCuenta,
  onAgendarCirugia,
  onConsultaExterna,
  farmacia = false,
  cocina = false,
  navegacion,
}: {
  onAbrirCuenta?: (
    origen: "emergencias" | "internacion",
    paciente: string,
  ) => void;
  onAgendarCirugia?: () => void;
  onConsultaExterna?: () => void;
  farmacia?: boolean;
  cocina?: boolean;
  navegacion?: ReactNode;
}) {
  const { medicos, resolver } = useProfesionales();
  const medicosPorEspecialidad: Record<string, string[]> = Object.fromEntries(
    [...new Set(medicos.flatMap((p) => p.especialidades))].map((e) => [
      e,
      medicos
        .filter((p) => p.especialidades.includes(e))
        .map(etiquetaProfesional),
    ]),
  );
  const { pacientes: fichasPacientes, errorPacientes } = usePacientes();
  const pacientesRegistrados = fichasPacientes.map((p) => ({
    id: p.id,
    nombre: nombrePacienteClinico(p),
    ci: p.ci,
  }));
  const [busqueda, setBusqueda] = useState(""),
    [tipo, setTipo] = useState<"Todos" | Tipo>("Todos"),
    [lineas, setLineas] = useState<Linea[]>([]),
    [paciente, setPaciente] = useState(""),
    [ciPaciente, setCiPaciente] = useState(""),
    [historialAbierto, setHistorialAbierto] = useState(true),
    [filtroHistorial, setFiltroHistorial] = useState("Todos"),
    [mostrandoLaboratorio, setMostrandoLaboratorio] = useState(false),
    [mostrandoInternacion, setMostrandoInternacion] = useState(false),
    [mostrandoNuevoPaciente, setMostrandoNuevoPaciente] = useState(false),
    [registroPacienteParaCobro, setRegistroPacienteParaCobro] = useState(false),
    [mostrandoCotizacion, setMostrandoCotizacion] = useState(false),
    [modo, setModo] = useState<"inicio" | "buscar" | "registrar">("inicio"),
    [pagos, setPagos] = useState<Pago[]>([pagoNuevo(1)]),
    [descuento, setDescuento] = useState(""),
    [errorAviso, setErrorAviso] = useState("");
  const setMensaje = (
    texto: string,
    tipo: "exito" | "error" | "advertencia" = "exito",
  ) => {
    setErrorAviso(tipo === "exito" ? "" : texto);
    if (texto)
      notificar(
        tipo,
        tipo === "exito"
          ? "Recepción"
          : tipo === "error"
            ? "No se pudo completar"
            : "Revisa los datos",
        texto,
      );
  };
  const [catalogo, setCatalogo] = useState<Item[]>(catalogoEjemplo);
  useEffect(() => {
    const controller = new AbortController();
    let ejecutando = false;
    const recuperar = async () => {
      if (ejecutando || controller.signal.aborted) return;
      ejecutando = true;
      try {
        const respuesta = await apiFetch('/api/v1/recepcion/ordenes/recuperar', { method: 'POST', signal: controller.signal });
        if (!respuesta.ok) return;
        const resultado = await respuesta.json() as { ventas_revisadas: number; pendientes: number };
        if (!controller.signal.aborted && resultado.ventas_revisadas > 0 && resultado.pendientes === 0) {
          notificar('exito', 'Órdenes recuperadas', 'Se sincronizaron las órdenes pendientes de ventas anteriores.');
          window.dispatchEvent(new Event('pacientes:actualizados'));
        }
      } catch { /* Se volverá a intentar mientras recepción esté abierta. */ }
      finally { ejecutando = false; }
    };
    void recuperar();
    const intervalo = window.setInterval(() => { void recuperar(); }, 30000);
    return () => { controller.abort(); window.clearInterval(intervalo); };
  }, []);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [recargaCatalogo, setRecargaCatalogo] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCargandoCatalogo(true);
    setErrorCatalogo("");
    apiFetch("/api/catalogo", { signal: controller.signal })
      .then(async (r) => {
        const respuesta = await r.json();
        if (!r.ok)
          throw new Error(
            respuesta.message || "No se pudo consultar el catálogo compartido.",
          );
        return respuesta.data as (Omit<Item, "tipo"> & { tipo: string })[];
      })
      .then((datos) =>
        setCatalogo([
          ...datos.map((i) => ({
            ...i,
            tipo: (i.tipo === "servicio"
              ? "Servicio"
              : i.tipo === "insumo"
                ? "Insumo"
                : "Producto") as Tipo,
          })),
          ...catalogoEjemplo,
        ]),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setCatalogo(catalogoEjemplo);
          setErrorCatalogo("");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoCatalogo(false);
      });
    return () => controller.abort();
  }, [recargaCatalogo]);
  const [imagenParaAgregar, setImagenParaAgregar] = useState<Item | null>(null);
  const [consultaParaAgendar, setConsultaParaAgendar] = useState<Item | null>(
    null,
  );
  const [especialidadConsulta, setEspecialidadConsulta] =
    useState("Medicina Interna");
  const [medicoConsulta, setMedicoConsulta] = useState("");
  const [fechaConsulta, setFechaConsulta] = useState("");
  const [horaConsulta, setHoraConsulta] = useState("");
  const [motivoOperativoConsulta, setMotivoOperativoConsulta] = useState("");
  const [citasCronograma, setCitasCronograma] = useState<Array<{ id: string; profesionalId?: string; doctor?: string; fecha: string; hora: string; estado?: string }>>([]);
  const [estadoCronograma, setEstadoCronograma] = useState<"cargando" | "listo" | "error">("cargando");
  const [precioConsulta, setPrecioConsulta] = useState(80);
  const [cajasVenta, setCajasVenta] = useState<CajaVenta[]>([]);
  const [cajaVentaId, setCajaVentaId] = useState("");
  const [almacenVentaId, setAlmacenVentaId] = useState("");
  const claveSolicitudVenta = 'recepcion_solicitud_venta_pendiente';
  const solicitudVenta = useRef(sessionStorage.getItem(claveSolicitudVenta) || crypto.randomUUID());
  const [verificandoVenta, setVerificandoVenta] = useState(Boolean(sessionStorage.getItem(claveSolicitudVenta)));
  const cajaVenta = cajasVenta.find((caja) => String(caja.id) === cajaVentaId);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/v1/recepcion/ventas/opciones", { signal: controller.signal })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(datos.message || "No se pudieron cargar las cajas.");
        return datos.data as CajaVenta[];
      })
      .then((cajas) => {
        setCajasVenta(cajas);
        if (cajas.length === 1) {
          setCajaVentaId(String(cajas[0].id));
          if (cajas[0].almacenes.length === 1)
            setAlmacenVentaId(String(cajas[0].almacenes[0].id));
        }
      })
      .catch(() => {
        /* Las opciones pueden no estar disponibles durante las pruebas de frontend. */
      });
    return () => controller.abort();
  }, []);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteVenta | null>(null);
  const seleccionClienteVersion = useRef(0);
  const [ventasPaciente, setVentasPaciente] = useState<VentaHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [revisionHistorial, setRevisionHistorial] = useState(0);
  useEffect(() => {
    const pendiente = sessionStorage.getItem(claveSolicitudVenta);
    if (!pendiente) return;
    const controller = new AbortController();
    apiFetch(`/api/v1/recepcion/ventas/solicitud/${encodeURIComponent(pendiente)}`, { signal: controller.signal })
      .then(async respuesta => {
        if (!respuesta.ok) return;
        const resultado = await respuesta.json() as { data?: { codigo?: string } };
        if (!resultado.data || controller.signal.aborted) return;
        sessionStorage.removeItem(claveSolicitudVenta);
        solicitudVenta.current = crypto.randomUUID();
        setMensaje(`${resultado.data.codigo || 'La venta'} ya fue registrada. Revisa su orden antes de cobrar nuevamente.`, 'advertencia');
        setRecargaCatalogo(valor => valor + 1);
        setRevisionHistorial(valor => valor + 1);
      })
      .catch(() => { /* Se conserva la solicitud para evitar un cobro duplicado. */ })
      .finally(() => { if (!controller.signal.aborted) setVerificandoVenta(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setVentasPaciente([]);
    setConsumoSeleccionado(null);
    setFiltroHistorial("Todos");
    setErrorHistorial("");
    if (!clienteSeleccionado?.id || !clienteSeleccionado.paciente_id) {
      setCargandoHistorial(false);
      return () => controller.abort();
    }
    setCargandoHistorial(true);
    apiFetch(
      `/api/v1/recepcion/clientes/${encodeURIComponent(clienteSeleccionado.id)}/ventas`,
      { signal: controller.signal },
    )
      .then(async (respuesta) => {
        const resultado = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(
            resultado.message || "No se pudo cargar el historial de ventas.",
          );
        if (!controller.signal.aborted) setVentasPaciente(resultado.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrorHistorial(
            error.message || "No se pudo cargar el historial de ventas.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoHistorial(false);
      });
    return () => controller.abort();
  }, [
    clienteSeleccionado?.id,
    clienteSeleccionado?.paciente_id,
    revisionHistorial,
  ]);
  const [datosFactura, setDatosFactura] = useState({
    nitCi: "",
    razonSocial: "",
    nitCiOriginal: "",
  });
  const [registroCliente, setRegistroCliente] = useState({
    nombre: "",
    nitCi: "",
    telefono: "",
    correo: "",
  });
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<
    ClienteVenta[]
  >([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [errorCliente, setErrorCliente] = useState("");
  const [tipoEstudioImagen, setTipoEstudioImagen] = useState("Rayos X");
  const [piezaEstudioImagen, setPiezaEstudioImagen] = useState("Tórax");
  const [otraPiezaImagen, setOtraPiezaImagen] = useState("");
  const [consumoSeleccionado, setConsumoSeleccionado] =
    useState<ConsumoHistorial | null>(null);
  const [carritoAbierto, setCarritoAbierto] = useState(true);
  const historialPaciente: ConsumoHistorial[] = ventasPaciente.map((venta) => {
    const pagos = venta.pagos;
    const fecha = new Date(venta.fecha.replace(" ", "T"));
    const estado =
      venta.estado === "COMPLETADA"
        ? "Pagado"
        : venta.estado === "ANULADA"
          ? "Anulado"
          : "Pre venta";
    return {
      id: venta.id,
      n: venta.codigo,
      fecha: Number.isNaN(fecha.getTime())
        ? venta.fecha
        : new Intl.DateTimeFormat("es-BO", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(fecha),
      total: formatoImporte(venta.total),
      estado,
      detalle:
        venta.detalles.length === 1
          ? "1 producto o servicio"
          : `${venta.detalles.length} productos o servicios`,
      datos: {
        cajero: venta.cajero || "No registrado",
        caja: venta.caja || "No registrada",
        sucursal: venta.sucursal || "No registrada",
        pagado: pagos
          ? formatoImporte(
              pagos.reduce((total, pago) => total + Number(pago.monto), 0) -
                Number(venta.cambio || 0),
            )
          : "No registrado",
        pagos: pagos
          ? pagos.map(
              (pago) => `${pago.metodo} · Bs. ${formatoImporte(pago.monto)}`,
            )
          : ["Método no registrado"],
        items: venta.detalles.map((item) => ({
          concepto: item.nombre_item,
          cantidad: Number(item.cantidad),
          unitario: formatoImporte(item.precio_unitario),
          total: formatoImporte(item.total),
        })),
      },
    };
  });
  useEffect(() => {
    if (modo !== "buscar") return;
    const termino = busquedaCliente.trim().toLocaleLowerCase("es");
    setClientesEncontrados(
      termino.length < 2
        ? []
        : fichasPacientes
            .filter((p) =>
              `${nombrePacienteClinico(p)} ${p.ci}`
                .toLocaleLowerCase("es")
                .includes(termino),
            )
            .slice(0, 8)
            .map((p) => ({
              id: "paciente:" + p.id,
              paciente_id: p.id,
              nombre_razon_social: nombrePacienteClinico(p),
              nit_ci: p.ci,
              telefono: p.telefono || null,
              correo: null,
            })),
    );
    setBuscandoClientes(false);
    setErrorCliente(errorPacientes);
  }, [modo, busquedaCliente, fichasPacientes, errorPacientes]);
  useEffect(() => {
    const actualizarPrecio = () => {
      try {
        const asociaciones = JSON.parse(
          localStorage.getItem("clinico_recepcion_funciones_items_v1") || "[]",
        ) as Array<{
          funcionalidad?: string;
          precio?: number;
          activo?: boolean;
        }>;
        const asociacion = asociaciones.find(
          (actual) =>
            actual.activo && actual.funcionalidad === "Agenda de pacientes",
        );
        setPrecioConsulta(Number(asociacion?.precio) || 80);
      } catch {
        setPrecioConsulta(80);
      }
    };
    actualizarPrecio();
    window.addEventListener("storage", actualizarPrecio);
    return () => window.removeEventListener("storage", actualizarPrecio);
  }, []);

  const resultados = useMemo(
    () =>
      catalogo.filter(
        (i) =>
          (cocina ||
            !farmacia ||
            i.tipo === "Producto" ||
            i.tipo === "Insumo") &&
          (tipo === "Todos" || i.tipo === tipo) &&
          `${i.nombre} ${i.codigo} ${i.tipo} ${i.categoria || ""}`
            .toLowerCase()
            .includes(busqueda.toLowerCase()),
      ),
    [busqueda, tipo, farmacia, cocina, catalogo],
  );
  const subtotal = lineas.reduce((t, i) => t + i.precio * i.cantidad, 0),
    rebaja = Math.min(Math.max(Number(descuento) || 0, 0), subtotal),
    total = subtotal - rebaja,
    pagado = pagos.reduce((t, p) => t + Math.max(Number(p.monto) || 0, 0), 0),
    pendiente = Math.max(total - pagado, 0),
    cambio = Math.max(pagado - total, 0);
  const profesionalConsulta = resolver(medicoConsulta);
  useEffect(() => {
    if (!consultaParaAgendar) return;
    const controller = new AbortController();
    setEstadoCronograma("cargando");
    void apiFetch("/api/citas", { signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo consultar la agenda.");
        const citas: unknown = await respuesta.json();
        if (!Array.isArray(citas)) throw new Error("Agenda no disponible.");
        if (!controller.signal.aborted) {
          setCitasCronograma(citas);
          setEstadoCronograma("listo");
        }
      })
      .catch(() => { if (!controller.signal.aborted) setEstadoCronograma("error"); });
    return () => controller.abort();
  }, [consultaParaAgendar]);
  const fechasCronograma = useMemo(() => {
    if (!consultaParaAgendar) return [];
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    return Array.from({ length: 8 }, (_, indice) => {
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() + indice);
      const clave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
      return { dia, clave };
    });
  }, [consultaParaAgendar]);
  const diasAtencionConsulta = profesionalConsulta?.horario?.startsWith("Lun")
    ? [1, 3, 5]
    : [2, 4, 6];
  const horasAtencionConsulta = profesionalConsulta?.horario?.includes("08:00")
    ? ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
    : ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];
  const fechaEnTurno =
    !fechaConsulta ||
    diasAtencionConsulta.includes(
      new Date(`${fechaConsulta}T12:00:00`).getDay(),
    );
  useEffect(() => {
    if (!consultaParaAgendar) return;
    const campoHora = document.querySelector(
      '.punto-consulta-modal input[type="time"]',
    ) as HTMLInputElement | null;
    if (!campoHora) return;
    campoHora.min = horasAtencionConsulta[0];
    campoHora.max = horasAtencionConsulta.at(-1) || "";
    campoHora.step = "1800";
    if (horaConsulta && !horasAtencionConsulta.includes(horaConsulta))
      setHoraConsulta("");
  }, [consultaParaAgendar, horasAtencionConsulta, horaConsulta]);
  const agregar = (i: Item) => {
    setLineas((a) =>
      a.some((x) => x.id === i.id)
        ? a.map((x) => (x.id === i.id ? { ...x, cantidad: x.cantidad + 1 } : x))
        : [...a, { ...i, cantidad: 1 }],
    );
    setMensaje(`${i.nombre} agregado al carrito.`);
  };
  const prepararAgregar = (item: Item) => {
    // Una consulta no es un ítem de venta genérico: requiere una cita asociada.
    // El id procede del catálogo contable y no siempre se llama "consulta".
    const esConsultaMedica =
      item.tipo === "Servicio" &&
      /consulta.*medic|medic.*consulta/.test(normalizarTexto(item.nombre));
    if (esConsultaMedica) {
      setConsultaParaAgendar(item);
      setEspecialidadConsulta("Medicina Interna");
      setMedicoConsulta(medicosPorEspecialidad["Medicina Interna"]?.[0] || "");
      setFechaConsulta("");
      setHoraConsulta("");
      setMotivoOperativoConsulta("");
      return;
    }
    agregar(item);
  };
  const abrirConsultaExterna = () => {
    const consulta = catalogo.find(
      (item) =>
        item.tipo === "Servicio" &&
        /consulta.*medic|medic.*consulta/.test(normalizarTexto(item.nombre)),
    ) || {
      id: "consulta-externa-demo",
      nombre: "Consulta médica",
      tipo: "Servicio" as Tipo,
      codigo: "SRV-CONS-EXT",
      precio: precioConsulta,
    };
    setConsultaParaAgendar(consulta);
    setEspecialidadConsulta("Medicina Interna");
    setMedicoConsulta(medicosPorEspecialidad["Medicina Interna"]?.[0] || "");
    setFechaConsulta("");
    setHoraConsulta("");
    setMotivoOperativoConsulta("");
  };
  const agendarConsulta = async () => {
    if (!consultaParaAgendar || !fechaConsulta || !horaConsulta)
      return setMensaje(
        "Selecciona especialidad, médico, fecha y hora para continuar.",
        "advertencia",
      );
    if (!fechaEnTurno || !horasAtencionConsulta.includes(horaConsulta))
      return setMensaje(
        "Selecciona un día y una hora dentro del turno de consulta externa del médico.",
        "advertencia",
      );
    const ficha = fichasPacientes.find((p) => p.ci === ciPaciente),
      profesional = resolver(medicoConsulta);
    const motivoCapturado = motivoOperativoConsulta.trim();
    if (!ficha || !profesional)
      return setMensaje(
        "Selecciona un paciente registrado y un médico activo.",
        "advertencia",
      );
    try {
      const r = await apiFetch("/api/citas", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: JSON.stringify({
          paciente_id: ficha.id,
          profesional_id: profesional.id,
          doctor: profesional.nombre,
          especialidad: especialidadConsulta,
          consultorio: "Consultorio 1",
          fecha: fechaConsulta,
          hora: horaConsulta,
          estado: "por_confirmar",
        }),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          Object.values(d.errors || {})
            .flat()
            .join(" ") ||
            d.message ||
            "No se pudo agendar la consulta.",
        );
    } catch (e) {
      setMensaje((e as Error).message, "error");
      return;
    }
    const linea: Linea = {
      ...consultaParaAgendar,
      id: `${consultaParaAgendar.id}-${fechaConsulta}-${horaConsulta}-${medicoConsulta}`,
      nombre: `${consultaParaAgendar.nombre} · ${especialidadConsulta}`,
      cantidad: 1,
    };
    setLineas((actuales) => [...actuales, linea]);
    const citaOperativa = {
      id: `cita-operativa-${Date.now()}`,
      pacienteId: ficha.id,
      paciente: nombrePacienteClinico(ficha),
      ci: ficha.ci,
      doctor: medicoConsulta,
      especialidad: especialidadConsulta,
      motivoOperativo: motivoCapturado,
      fecha: fechaConsulta,
      hora: horaConsulta,
      estado: "confirmada",
      consultorio: "Consulta ambulatoria",
      edad: ficha.fecha_nacimiento
        ? new Date().getFullYear() -
          new Date(ficha.fecha_nacimiento).getFullYear()
        : undefined,
      fechaNacimiento: ficha.fecha_nacimiento,
    };
    const citasOperativas = JSON.parse(
      localStorage.getItem("clinico_citas_operativas_v1") || "[]",
    );
    localStorage.setItem(
      "clinico_citas_operativas_v1",
      JSON.stringify([...citasOperativas, citaOperativa]),
    );
    window.dispatchEvent(new Event("agenda:operativa-actualizada"));
    setMotivoOperativoConsulta("");
    setMensaje(
      `Consulta agendada con ${medicoConsulta} para el ${fechaConsulta} a las ${horaConsulta}.`,
    );
    setConsultaParaAgendar(null);
    setCarritoAbierto(true);
  };
  const agregarEstudioImagen = () => {
    if (!imagenParaAgregar) return;
    const pieza =
      piezaEstudioImagen === "Otra"
        ? otraPiezaImagen.trim()
        : piezaEstudioImagen;
    if (!pieza)
      return setMensaje("Indica la pieza o región del estudio.", "advertencia");
    const linea: Linea = {
      ...imagenParaAgregar,
      id: `${imagenParaAgregar.id}-${tipoEstudioImagen}-${pieza}`,
      nombre: `${tipoEstudioImagen} · ${pieza}`,
      estudioImagen: tipoEstudioImagen,
      piezaImagen: pieza,
      cantidad: 1,
    };
    setLineas((actuales) => {
      const existente = actuales.find((actual) => actual.id === linea.id);
      return existente
        ? actuales.map((actual) =>
            actual.id === linea.id
              ? { ...actual, cantidad: actual.cantidad + 1 }
              : actual,
          )
        : [...actuales, linea];
    });
    setMensaje(`${linea.nombre} agregado al carrito.`);
    setImagenParaAgregar(null);
  };
  const cantidad = (id: string, d: number) =>
    setLineas((a) =>
      a
        .map((x) =>
          x.id === id ? { ...x, cantidad: Math.max(0, x.cantidad + d) } : x,
        )
        .filter((x) => x.cantidad),
    );
  const escribirCantidad = (id: string, valor: string) => {
    // El teclado numérico y los pegados se normalizan a dígitos; no se admiten
    // signos, decimales ni notación científica para las unidades vendidas.
    if (!/^\d+$/.test(valor)) return;
    const nuevaCantidad = Number(valor);
    if (
      !Number.isSafeInteger(nuevaCantidad) ||
      nuevaCantidad < 1 ||
      nuevaCantidad > 100000
    )
      return;
    setLineas((actual) =>
      actual.map((linea) =>
        linea.id === id ? { ...linea, cantidad: nuevaCantidad } : linea,
      ),
    );
  };
  const seleccionarCliente = async (cliente: ClienteVenta) => {
    const version = ++seleccionClienteVersion.current;
    setClienteSeleccionado(null);
    setVentasPaciente([]);
    setConsumoSeleccionado(null);
    if (cliente.paciente_id && cliente.id.startsWith("paciente:")) {
      try {
        const respuesta = await apiFetch(
          `/api/v1/pacientes/${cliente.paciente_id}/cliente-contable`,
          { method: "POST", headers: { Accept: "application/json" } },
        );
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.data)
          throw new Error(
            resultado.message || "No se pudo vincular el paciente para cobro.",
          );
        cliente = resultado.data;
      } catch (causa) {
        if (version === seleccionClienteVersion.current)
          setErrorCliente((causa as Error).message);
        return;
      }
    }
    if (version !== seleccionClienteVersion.current) return;
    setClienteSeleccionado(cliente);
    setPaciente(cliente.nombre_razon_social);
    setCiPaciente(cliente.nit_ci || "");
    setDatosFactura({
      nitCi: cliente.nit_ci || "",
      razonSocial: cliente.nombre_razon_social,
      nitCiOriginal: cliente.nit_ci || "",
    });
    setHistorialAbierto(true);
    setBusquedaCliente("");
    setRegistroCliente({ nombre: "", nitCi: "", telefono: "", correo: "" });
    setErrorCliente("");
    setModo("inicio");
  };

  const guardarCliente = async () => {
    if (!registroCliente.nombre.trim()) {
      setErrorCliente("Ingresa el nombre o razón social del cliente.");
      return;
    }

    setGuardandoCliente(true);
    setErrorCliente("");
    try {
      const respuesta = await apiContableFetch("/v1/clientes", {
        method: "POST",
        body: JSON.stringify({
          nombre_razon_social: registroCliente.nombre.trim(),
          nit_ci: registroCliente.nitCi.trim() || null,
          telefono: registroCliente.telefono.trim() || null,
          correo: registroCliente.correo.trim() || null,
        }),
      });
      const resultado = (await respuesta.json()) as {
        data?: ClienteVenta;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!respuesta.ok || !resultado.data) {
        const detalle = Object.values(resultado.errors || {}).flat()[0];
        throw new Error(
          detalle || resultado.message || "No se pudo registrar el cliente.",
        );
      }
      seleccionarCliente(resultado.data);
    } catch (error) {
      setErrorCliente(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el cliente.",
      );
    } finally {
      setGuardandoCliente(false);
    }
  };
  const realizarPreVenta = () => {
    if (!lineas.length)
      return setMensaje(
        "Agrega al menos un producto o servicio antes de realizar la pre venta.",
      );
    if (!clienteSeleccionado)
      return setMensaje(
        "Busca o registra un cliente antes de realizar la pre venta.",
      );
    const registro = {
      id: `PV-${Date.now()}`,
      estado: "Pre venta",
      creadoEn: new Date().toISOString(),
      cliente: {
        id: clienteSeleccionado.id,
        nombre: clienteSeleccionado.nombre_razon_social,
        nitCi: datosFactura.nitCi,
        razonSocial: datosFactura.razonSocial,
      },
      detalles: lineas.map((linea) => ({
        id: linea.id,
        nombre: linea.nombre,
        cantidad: linea.cantidad,
        precio: linea.precio,
      })),
      total,
      pagado,
      pendiente,
      descuento: rebaja,
      pagos: pagos.filter((pago) => Number(pago.monto) > 0),
    };
    try {
      const actuales = JSON.parse(
        localStorage.getItem("clinico_preventas_v1") || "[]",
      ) as unknown[];
      localStorage.setItem(
        "clinico_preventas_v1",
        JSON.stringify([registro, ...actuales]),
      );
      setMensaje(
        `Pre venta ${registro.id} guardada. Saldo pendiente: ${dinero(pendiente)}.`,
      );
      setLineas([]);
      setPagos([pagoNuevo(Date.now())]);
      setDescuento("");
      setClienteSeleccionado(null);
    } catch {
      setMensaje("No se pudo guardar la pre venta localmente.");
    }
  };
  const cobrar = async () => {
    if (!lineas.length || pendiente > 0 || verificandoVenta) return;
    if (
      lineas.some(
        (linea) =>
          !((['Producto', 'Insumo'].includes(linea.tipo) && /^item-\d+$/.test(linea.id)) || (linea.tipo === 'Servicio' && /^servicio-\d+$/.test(linea.id))),
      )
    ) {
      setMensaje(
        "El carrito contiene un artículo de ejemplo o no disponible para la venta.",
        "advertencia",
      );
      return;
    }
    if (!cajaVentaId || !almacenVentaId) {
      setMensaje(
        "Selecciona una caja y un almacén asignados antes de cobrar.",
        "advertencia",
      );
      return;
    }
    if (!clienteSeleccionado) {
      setMensaje(
        "Busca o registra un cliente antes de cobrar la venta.",
        "advertencia",
      );
      return;
    }
    if (lineas.some(linea => linea.tipo === 'Servicio') && !clienteSeleccionado.paciente_id) {
      setMensaje(
        "Selecciona al paciente y verifica su CI antes de cobrar el estudio de imagenología.",
        "advertencia",
      );
      return;
    }
    setCobrando(true);
    setMensaje("");
    try {
      const respuesta = await apiFetch("/api/v1/recepcion/ventas", {
        method: "POST",
        body: JSON.stringify({
          solicitud_id: solicitudVenta.current,
          cliente_id: clienteSeleccionado.id,
          caja_id: Number(cajaVentaId),
          almacen_id: Number(almacenVentaId),
          descuento: rebaja,
          pagos: pagos
            .filter((pago) => Number(pago.monto) > 0)
            .map((pago) => ({ metodo: pago.metodo, monto: pago.monto })),
          detalles: lineas.map((linea) => ({
            ...(linea.tipo === 'Servicio' ? { servicio_id: Number(linea.id.slice(9)) } : { item_id: Number(linea.id.slice(5)) }),
            cantidad: linea.cantidad,
            precio_unitario: linea.precio,
          })),
        }),
      });
      const resultado = (await respuesta.json()) as {
        data?: { codigo?: string };
        ordenes_pendientes?: boolean;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!respuesta.ok || !resultado.data) {
        const detalle = Object.values(resultado.errors || {}).flat()[0];
        throw new Error(
          detalle || resultado.message || "No se pudo registrar la venta.",
        );
      }

      setMensaje(
        resultado.ordenes_pendientes ? `${resultado.data.codigo || 'Venta'} cobrada. La orden está pendiente de sincronización; no repitas el cobro.` : `${resultado.data.codigo || "Venta"} registrada correctamente.`,
        resultado.ordenes_pendientes ? 'advertencia' : 'exito',
      );
      solicitudVenta.current = crypto.randomUUID();
      setRecargaCatalogo((valor) => valor + 1);
      setRevisionHistorial((valor) => valor + 1);
      setLineas([]);
      setPagos([pagoNuevo(Date.now())]);
      setDescuento("");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la venta.",
        "error",
      );
    } finally {
      setCobrando(false);
    }
  };
  const replegarSidebarAlOperar = () => {
    if (!farmacia && !cocina)
      window.dispatchEvent(new Event("clinico:replegar-sidebar"));
  };
  const detalleConsumoSeleccionado = consumoSeleccionado?.datos ?? null;
  return (
    <section
      className={`punto-pos ${farmacia || cocina ? "punto-pos-farmacia" : ""}`}
      onClickCapture={(evento) => {
        if ((evento.target as HTMLElement).closest("button"))
          replegarSidebarAlOperar();
      }}
    >
      {consumoSeleccionado && detalleConsumoSeleccionado && (
        <div
          className="punto-detalle-consumo-fondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget)
              setConsumoSeleccionado(null);
          }}
        >
          <section
            className={`punto-detalle-consumo estado-${consumoSeleccionado.estado.toLowerCase().replace(" ", "-")}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-consumo-titulo"
          >
            <header className="punto-detalle-consumo-cabecera">
              <div>
                <span>DETALLE DE CONSUMO</span>
                <h3 id="detalle-consumo-titulo">N.º {consumoSeleccionado.n}</h3>
                <small>
                  {paciente || "Paciente no identificado"} · HC-
                  {ciPaciente || "004821"}
                </small>
              </div>
              <div className="punto-detalle-consumo-importe">
                <span
                  className={`estado-${consumoSeleccionado.estado.toLowerCase().replace(" ", "-")}`}
                >
                  {consumoSeleccionado.estado}
                </span>
                <strong>Bs. {consumoSeleccionado.total}</strong>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={() => setConsumoSeleccionado(null)}
              >
                <Icon name="close" size={19} />
              </button>
            </header>
            <div className="punto-detalle-consumo-resumen">
              <span>
                <b>Fecha</b>
                {consumoSeleccionado.fecha}
              </span>
              <span>
                <b>Sucursal</b>
                {detalleConsumoSeleccionado.sucursal}
              </span>
              <span>
                <b>Caja</b>
                {detalleConsumoSeleccionado.caja}
              </span>
              <span>
                <b>Cobró</b>
                {detalleConsumoSeleccionado.cajero}
              </span>
            </div>
            <section
              className="punto-detalle-consumo-items"
              aria-label="Ítems del consumo"
            >
              <div className="punto-detalle-consumo-titulo">
                <span>CONSUMO REGISTRADO</span>
                <small>{consumoSeleccionado.detalle}</small>
              </div>
              <div className="punto-detalle-consumo-tabla">
                <div className="punto-detalle-consumo-tabla-cabecera">
                  <span>Ítem</span>
                  <span>Cant.</span>
                  <span>P. unit.</span>
                  <span>Total</span>
                </div>
                {detalleConsumoSeleccionado.items.map((item, indice) => (
                  <div
                    className="punto-detalle-consumo-tabla-fila"
                    key={`${item.concepto}-${indice}`}
                  >
                    <strong>{item.concepto}</strong>
                    <span>{item.cantidad}</span>
                    <span>Bs. {item.unitario}</span>
                    <b>Bs. {item.total}</b>
                  </div>
                ))}
              </div>
            </section>
            <section className="punto-detalle-consumo-pago">
              <div>
                <span>Total a pagar</span>
                <strong>Bs. {consumoSeleccionado.total}</strong>
              </div>
              <div>
                <span>Total pagado</span>
                <strong>
                  {detalleConsumoSeleccionado.pagado === "No registrado"
                    ? "No registrado"
                    : `Bs. ${detalleConsumoSeleccionado.pagado}`}
                </strong>
              </div>
              <div className="punto-detalle-consumo-metodos">
                <span>
                  Método{detalleConsumoSeleccionado.pagos.length > 1 ? "s" : ""}{" "}
                  de pago
                </span>
                {detalleConsumoSeleccionado.pagos.map((metodo, indice) => (
                  <b key={indice}>{metodo}</b>
                ))}
              </div>
            </section>
            <footer>
              <button
                type="button"
                onClick={() => setConsumoSeleccionado(null)}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      )}
      {consultaParaAgendar && (
        <div
          className="punto-imagen-fondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget)
              setConsultaParaAgendar(null);
          }}
        >
          <div className="punto-consulta-distribucion">
          <form
            className="punto-imagen-modal punto-consulta-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Agendar consulta ambulatoria"
            onSubmit={(evento) => {
              evento.preventDefault();
              agendarConsulta();
            }}
          >
            <header>
              <div>
                <span>CONSULTA AMBULATORIA</span>
                <h3>Agendar consulta</h3>
                <small>
                  Primero registra los datos de la cita; después se añadirá el
                  servicio al carrito para su cobro.
                </small>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setConsultaParaAgendar(null)}
              >
                ×
              </button>
            </header>
            <label>
              Paciente registrado
              <select
                required
                value={ciPaciente}
                onChange={(evento) => {
                  const ficha = fichasPacientes.find(
                    (actual) => actual.ci === evento.target.value,
                  );
                  if (!ficha) return;
                  setPaciente(nombrePacienteClinico(ficha));
                  setCiPaciente(ficha.ci);
                  void seleccionarCliente({
                    id: `paciente:${ficha.id}`,
                    paciente_id: ficha.id,
                    nit_ci: ficha.ci,
                    nombre_razon_social: nombrePacienteClinico(ficha),
                    telefono: ficha.telefono || null,
                    correo: null,
                  });
                }}
              >
                <option value="">Seleccionar paciente</option>
                {pacientesRegistrados.map((ficha) => (
                  <option key={ficha.id} value={ficha.ci}>
                    {ficha.nombre} · CI {ficha.ci}
                  </option>
                ))}
              </select>
            </label>
            <small className="punto-consulta-ayuda">
              Solo se muestran pacientes registrados en el sistema.
            </small>
            <label>
              Especialidad
              <select
                value={especialidadConsulta}
                onChange={(evento) => {
                  const especialidad = evento.target.value;
                  setEspecialidadConsulta(especialidad);
                  setMedicoConsulta(
                    medicosPorEspecialidad[especialidad]?.[0] || "",
                  );
                }}
              >
                {Object.keys(medicosPorEspecialidad).map((especialidad) => (
                  <option key={especialidad}>{especialidad}</option>
                ))}
              </select>
            </label>
            <label>
              Médico
              <select
                required
                value={medicoConsulta}
                onChange={(evento) => setMedicoConsulta(evento.target.value)}
              >
                <option value="">Seleccionar médico</option>
                {(medicosPorEspecialidad[especialidadConsulta] || []).map(
                  (medico) => (
                    <option key={medico}>{medico}</option>
                  ),
                )}
              </select>
            </label>
            <div className="punto-consulta-fecha">
              <label>
                Fecha
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={fechaConsulta}
                  onChange={(evento) => setFechaConsulta(evento.target.value)}
                />
              </label>
              <label>
                Hora
                <input
                  required
                  type="time"
                  step="1800"
                  value={horaConsulta}
                  onChange={(evento) => setHoraConsulta(evento.target.value)}
                />
              </label>
            </div>
            <label>
              Motivo de consulta (opcional)
              <input
                type="text"
                value={motivoOperativoConsulta}
                onChange={(evento) => setMotivoOperativoConsulta(evento.target.value)}
                placeholder="Describe brevemente el motivo de la consulta"
              />
            </label>
            <footer>
              <button
                type="button"
                onClick={() => setConsultaParaAgendar(null)}
              >
                Cancelar
              </button>
              <button className="punto-imagen-primario" type="submit">
                <Icon name="check" size={16} /> Confirmar cita y añadir al
                carrito
              </button>
            </footer>
          </form>
          <aside className="punto-consulta-cronograma" aria-label="Cronograma semanal del médico">
            <header>
              <span>AGENDA MÉDICA</span>
              <h3>Cronograma de atención</h3>
              <p>{profesionalConsulta?.nombre || "Selecciona un médico"}</p>
              <small>Desde hoy hasta el mismo día de la próxima semana</small>
            </header>
            {estadoCronograma === "error" && <p className="punto-cronograma-aviso" role="status">No se pudieron consultar las citas. Verifica la agenda antes de confirmar.</p>}
            {estadoCronograma === "cargando" && <p className="punto-cronograma-aviso" role="status">Consultando citas…</p>}
            <div className="punto-cronograma-dias">
              {fechasCronograma.map(({ dia, clave }) => {
                const atiende = Boolean(profesionalConsulta?.horario) && diasAtencionConsulta.includes(dia.getDay());
                const citasDia = citasCronograma.filter((cita) => cita.fecha === clave && cita.estado !== "cancelada" && (cita.profesionalId ? cita.profesionalId === profesionalConsulta?.id : cita.doctor === profesionalConsulta?.nombre));
                return (
                  <button key={clave} type="button" className={fechaConsulta === clave ? "seleccionado" : ""} disabled={!atiende} onClick={() => setFechaConsulta(clave)}>
                    <span><strong>{new Intl.DateTimeFormat("es-BO", { weekday: "short", day: "numeric", month: "short" }).format(dia)}</strong><small>{atiende ? `${horasAtencionConsulta[0]} – ${profesionalConsulta?.horario?.match(/\d{2}:\d{2}[–-](\d{2}:\d{2})/)?.[1] || horasAtencionConsulta.at(-1)}` : "Sin turno"}</small></span>
                    {atiende && estadoCronograma === "listo" && <b>{citasDia.length} {citasDia.length === 1 ? "cita" : "citas"}</b>}
                  </button>
                );
              })}
            </div>
          </aside>
          </div>
        </div>
      )}
      {imagenParaAgregar && (
        <div
          className="punto-imagen-fondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget)
              setImagenParaAgregar(null);
          }}
        >
          <form
            className="punto-imagen-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle del estudio de imagenología"
            onSubmit={(evento) => {
              evento.preventDefault();
              agregarEstudioImagen();
            }}
          >
            <header>
              <div>
                <span>IMAGENOLOGÍA</span>
                <h3>Detalle del estudio</h3>
                <small>
                  Define la modalidad y la pieza antes de agregarla al cobro.
                </small>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setImagenParaAgregar(null)}
              >
                ×
              </button>
            </header>
            <label>
              Tipo de estudio
              <select
                value={tipoEstudioImagen}
                onChange={(evento) => setTipoEstudioImagen(evento.target.value)}
              >
                <option>Rayos X</option>
                <option>Tomografía</option>
                <option>Ecocardiograma</option>
                <option>Otro estudio de imagen</option>
              </select>
            </label>
            <label>
              Pieza o región
              <select
                value={piezaEstudioImagen}
                onChange={(evento) =>
                  setPiezaEstudioImagen(evento.target.value)
                }
              >
                <option>Tórax</option>
                <option>Brazo</option>
                <option>Antebrazo</option>
                <option>Mano</option>
                <option>Pierna</option>
                <option>Rodilla</option>
                <option>Pie</option>
                <option>Craneo</option>
                <option>Abdomen</option>
                <option>Columna</option>
                <option>Pelvis</option>
                <option>Otra</option>
              </select>
            </label>
            {piezaEstudioImagen === "Otra" && (
              <label>
                Especifica la pieza
                <input
                  required
                  autoFocus
                  value={otraPiezaImagen}
                  onChange={(evento) => setOtraPiezaImagen(evento.target.value)}
                  placeholder="Ej. hombro izquierdo"
                />
              </label>
            )}
            <footer>
              <button type="button" onClick={() => setImagenParaAgregar(null)}>
                Cancelar
              </button>
              <button className="punto-imagen-primario" type="submit">
                <Icon name="plus" size={16} /> Agregar al cobro ·{" "}
                {dinero(imagenParaAgregar.precio)}
              </button>
            </footer>
          </form>
        </div>
      )}
      {mostrandoLaboratorio && (
        <SolicitudLaboratorioRecepcion
          paciente={
            paciente && ciPaciente
              ? {
                  id: fichasPacientes.find((p) => p.ci === ciPaciente)?.id,
                  nombre: paciente,
                  ci: ciPaciente,
                }
              : null
          }
          pacientes={pacientesRegistrados}
          onSeleccionar={(p) => {
            setPaciente(p.nombre);
            setCiPaciente(p.ci);
            setHistorialAbierto(true);
            setModo("inicio");
          }}
          onCerrar={() => setMostrandoLaboratorio(false)}
        />
      )}
      {mostrandoInternacion && (
        <InternacionModal
          pacienteInicial={
            paciente && ciPaciente ? { nombre: paciente, ci: ciPaciente } : null
          }
          onRegistrada={(registro) =>
            setMensaje(`Preinternación registrada para ${registro.paciente}.`)
          }
          onCerrar={() => setMostrandoInternacion(false)}
        />
      )}
      {mostrandoNuevoPaciente && (
        <ModalRegistroPaciente
          onCerrar={() => setMostrandoNuevoPaciente(false)}
          onRegistrado={(p) => {
            setPaciente(nombrePacienteClinico(p));
            setCiPaciente(p.ci);
            if (registroPacienteParaCobro)
              void seleccionarCliente({
                id: "paciente:" + p.id,
                paciente_id: p.id,
                nombre_razon_social: nombrePacienteClinico(p),
                nit_ci: p.ci,
                telefono: p.telefono || null,
                correo: null,
              });
            setMensaje("Paciente registrado en la ficha clínica compartida.");
          }}
        />
      )}
      {mostrandoCotizacion && (
        <div
          className="punto-cotizacion-fondo"
          role="presentation"
          onClick={() => setMostrandoCotizacion(false)}
        >
          <section
            className="punto-cotizacion-modal punto-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Documentos y consentimientos"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <small>GESTIÓN DOCUMENTAL</small>
                <h2>Documentos y consentimientos</h2>
                <p>
                  Completa los datos una sola vez y reutilízalos en todos los
                  documentos.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar documentos"
                onClick={() => setMostrandoCotizacion(false)}
              >
                ×
              </button>
            </header>
            <section className="documentos-lista">
              <div>
                <h3>Documentos disponibles</h3>
                <span>Selecciona los documentos que deseas preparar</span>
              </div>
              <label>
                <input type="checkbox" defaultChecked /> Consentimiento
                informado
              </label>
              <label>
                <input type="checkbox" /> Autorización de procedimiento
              </label>
              <label>
                <input type="checkbox" /> Ficha de datos del paciente
              </label>
              <label>
                <input type="checkbox" /> Documento personalizado
              </label>
            </section>
            {lineas.length ? (
              <div className="punto-cotizacion-lineas">
                {lineas.map((linea) => (
                  <div key={linea.id}>
                    <span>
                      {linea.cantidad} × {linea.nombre}
                    </span>
                    <strong>{dinero(linea.cantidad * linea.precio)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>Agrega productos o servicios al carrito para cotizar.</p>
            )}
            <footer>
              <button
                type="button"
                className="documentos-cancelar"
                onClick={() => setMostrandoCotizacion(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMensaje(
                    "Datos preparados para los documentos seleccionados.",
                  );
                  setMostrandoCotizacion(false);
                }}
              >
                Preparar documentos
              </button>
            </footer>
          </section>
        </div>
      )}
      <div className="punto-pos-superior">
        {navegacion}
        <header className="punto-pos-cabecera punto-pos-contexto">
          <div className="punto-contexto">
            <label>
              <span>Caja y sucursal</span>
              <select
                value={cajaVentaId}
                onChange={(evento) => {
                  const id = evento.target.value;
                  const caja = cajasVenta.find(
                    (actual) => String(actual.id) === id,
                  );
                  setCajaVentaId(id);
                  setAlmacenVentaId(
                    caja?.almacenes.length === 1
                      ? String(caja.almacenes[0].id)
                      : "",
                  );
                }}
              >
                <option value="">Selecciona una caja</option>
                {cajasVenta.map((caja) => (
                  <option key={caja.id} value={caja.id}>
                    {caja.sucursal} · {caja.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Almacén</span>
              <select
                value={almacenVentaId}
                onChange={(evento) => setAlmacenVentaId(evento.target.value)}
                disabled={!cajaVenta}
              >
                <option value="">Selecciona un almacén</option>
                {cajaVenta?.almacenes.map((almacen) => (
                  <option key={almacen.id} value={almacen.id}>
                    {almacen.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
      </div>
      <div
        className={`punto-pos-layout ${paciente ? (historialAbierto ? "con-historial" : "historial-plegado") : ""}`}
      >
        {paciente && (
          <aside className="punto-historial-paciente">
            <button
              className="punto-historial-control"
              type="button"
              aria-expanded={historialAbierto}
              aria-label={
                historialAbierto
                  ? "Ocultar historial del paciente"
                  : "Mostrar historial del paciente"
              }
              title={
                historialAbierto ? "Ocultar historial" : "Mostrar historial"
              }
              onClick={() => setHistorialAbierto((abierto) => !abierto)}
            >
              <Icon
                name={historialAbierto ? "chevronLeft" : "chevronRight"}
                size={16}
              />
              {historialAbierto && <span>Ocultar</span>}
            </button>
            {historialAbierto && (
              <div className="punto-historial-contenido punto-historial-nuevo">
                <header>
                  <div>
                    <p>HISTORIAL DE CONSUMO</p>
                    <h3>{paciente}</h3>
                  </div>
                  {ciPaciente && <b>CI {ciPaciente}</b>}
                </header>
                <select
                  value={filtroHistorial}
                  onChange={(e) => setFiltroHistorial(e.target.value)}
                  aria-label="Filtrar cuentas históricas"
                >
                  <option>Todos</option>
                  <option>Pagado</option>
                  <option>No pagado</option>
                  <option>Anulado</option>
                  <option>Pre venta</option>
                </select>
                <div className="punto-historial-lista">
                  {cargandoHistorial && (
                    <p role="status">Cargando ventas del paciente…</p>
                  )}
                  {errorHistorial && (
                    <p role="alert">
                      {errorHistorial}{" "}
                      <button
                        type="button"
                        onClick={() =>
                          setRevisionHistorial((valor) => valor + 1)
                        }
                      >
                        Reintentar
                      </button>
                    </p>
                  )}
                  {!cargandoHistorial &&
                    !errorHistorial &&
                    !clienteSeleccionado?.paciente_id && (
                      <p>
                        Selecciona un paciente registrado para consultar sus
                        ventas.
                      </p>
                    )}
                  {!cargandoHistorial &&
                    !errorHistorial &&
                    clienteSeleccionado?.paciente_id &&
                    !historialPaciente.some(
                      (c) =>
                        filtroHistorial === "Todos" ||
                        c.estado === filtroHistorial,
                    ) && <p>No hay ventas para mostrar.</p>}
                  {historialPaciente
                    .filter(
                      (c) =>
                        filtroHistorial === "Todos" ||
                        c.estado === filtroHistorial,
                    )
                    .map((c) => (
                      <article
                        key={c.id}
                        className={`estado-${c.estado.toLowerCase().replace(" ", "-")}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalle del consumo ${c.n}`}
                        onClick={() => setConsumoSeleccionado(c)}
                        onKeyDown={(evento) => {
                          if (evento.key === "Enter" || evento.key === " ") {
                            evento.preventDefault();
                            setConsumoSeleccionado(c);
                          }
                        }}
                      >
                        <div>
                          <strong>N.º {c.n}</strong>
                          <small>{c.datos.sucursal}</small>
                        </div>
                        <span className="punto-historial-estado">
                          {c.estado}
                        </span>
                        <p>
                          <Icon name="chevronRight" size={14} /> Cajero/a:{" "}
                          {c.datos.cajero}
                          <br />
                          <em>{c.detalle}</em>
                        </p>
                        <footer>
                          <small>{c.fecha}</small>
                          <b>Bs. {c.total}</b>
                        </footer>
                      </article>
                    ))}
                </div>
              </div>
            )}
          </aside>
        )}
        <section
          className={`punto-catalogo ${carritoAbierto ? "vista-carrito" : ""}`}
        >
          {cargandoCatalogo && (
            <p role="status">Consultando productos y servicios del contable…</p>
          )}
          {errorCatalogo && (
            <p className="punto-catalogo-error" role="alert">
              <span>{errorCatalogo}</span>
              <button
                type="button"
                onClick={() => setRecargaCatalogo((v) => v + 1)}
              >
                Reintentar
              </button>
            </p>
          )}
          <div className="punto-busquedas">
            <label>
              <Icon name="search" size={17} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre, código o categoría…"
              />
            </label>
            {carritoAbierto && busqueda.trim() && (
              <div
                className="punto-buscador-carrito-resultados"
                role="listbox"
                aria-label="Productos encontrados"
              >
                {Object.entries(
                  resultados
                    .slice(0, 14)
                    .reduce<Record<string, Item[]>>((grupos, item) => {
                      const grupo = item.categoria || item.tipo;
                      (grupos[grupo] ||= []).push(item);
                      return grupos;
                    }, {}),
                ).map(([categoria, items]) => (
                  <div key={categoria}>
                    <strong>{categoria}</strong>
                    {items.map((item) => (
                      <button
                        type="button"
                        role="option"
                        key={item.id}
                        onClick={() => prepararAgregar(item)}
                      >
                        <span>{item.nombre}</span>
                        <small>{dinero(item.precio)}</small>
                      </button>
                    ))}
                  </div>
                ))}
                {!resultados.length && (
                  <p>Sin coincidencias para esta búsqueda.</p>
                )}
              </div>
            )}
            {!farmacia && !cocina && (
              <button
                className="punto-accion-laboratorio"
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setMostrandoLaboratorio(true);
                  setMensaje("");
                }}
              >
                <Icon name="lab" size={16} /> Laboratorio
              </button>
            )}
            {!farmacia && !cocina && onConsultaExterna && (
              <button
                className="punto-accion-consulta-externa"
                type="button"
                onClick={abrirConsultaExterna}
              >
                <Icon name="calendar" size={16} /> Consulta externa
              </button>
            )}
            {!farmacia && !cocina && (
              <button
                className="punto-accion-cirugia"
                type="button"
                onClick={onAgendarCirugia}
              >
                <Icon name="calendar" size={16} /> Agendar cirugía
              </button>
            )}
            {!farmacia && !cocina && (
              <button
                className="punto-accion-internacion"
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setMensaje("");
                  setMostrandoInternacion(true);
                }}
              >
                <Icon name="plus" size={16} /> Internación
              </button>
            )}
          </div>
          <div className="punto-catalogo-filtros">
            <div className="punto-categorias">
              <button
                className={`punto-boton-carrito ${carritoAbierto ? "activo" : ""}`}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={carritoAbierto}
                onClick={() => setCarritoAbierto((abierto) => !abierto)}
              >
                <Icon name="asset" size={16} />
                <span>Carrito</span>
                {lineas.length > 0 && (
                  <b>
                    {lineas.reduce((total, linea) => total + linea.cantidad, 0)}
                  </b>
                )}
              </button>
              {(farmacia
                ? (["Todos", "Producto", "Insumo"] as const)
                : (["Todos", "Producto", "Insumo", "Servicio"] as const)
              ).map((o) => (
                <button
                  type="button"
                  className={!carritoAbierto && tipo === o ? "activo" : ""}
                  key={o}
                  onClick={() => {
                    setCarritoAbierto(false);
                    setTipo(o);
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
            <button
              className="punto-actualizar-catalogo"
              type="button"
              disabled={cargandoCatalogo}
              onClick={() => setRecargaCatalogo((v) => v + 1)}
            >
              <Icon name="refresh" size={15} /> Actualizar
            </button>
          </div>
          {carritoAbierto && (
            <section
              className="punto-carrito-flotante"
              role="dialog"
              aria-label="Carrito de venta"
            >
              <header>
                <div>
                  <strong>Carrito de venta</strong>
                  <small>
                    {lineas.reduce((total, linea) => total + linea.cantidad, 0)}{" "}
                    productos
                  </small>
                </div>
              </header>
              <div className="punto-carrito-lineas">
                {lineas.map((i) => (
                  <article key={i.id}>
                    <strong>{i.nombre}</strong>
                    <small>{dinero(i.precio)} c/u</small>
                    <div>
                      <button type="button" onClick={() => cantidad(i.id, -1)}>
                        −
                      </button>
                      <input
                        className="punto-cantidad-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`Cantidad de ${i.nombre}`}
                        value={String(i.cantidad)}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => escribirCantidad(i.id, e.target.value)}
                      />
                      <button type="button" onClick={() => cantidad(i.id, 1)}>
                        +
                      </button>
                      <span>{dinero(i.precio * i.cantidad)}</span>
                      <button
                        className="punto-quitar"
                        type="button"
                        onClick={() =>
                          setLineas((a) => a.filter((x) => x.id !== i.id))
                        }
                      >
                        ×
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <section className="punto-resumen punto-resumen-carrito">
                <div className="punto-total">
                  <span>Subtotal a pagar</span>
                  <b>{dinero(total)}</b>
                </div>
              </section>
            </section>
          )}
          {(errorAviso || errorPacientes) && (
            <p className="punto-aviso" role="alert">
              {errorAviso || errorPacientes}
            </p>
          )}

          <div className="punto-tarjetas catalogo-clinico-tarjetas">
            {resultados.map((i) => (
              <article key={i.id}>
                <div className="punto-tarjeta-info">
                  <small>{i.codigo}</small>
                  <strong>{i.nombre}</strong>
                  <div className="catalogo-clinico-detalles">
                    {i.stock !== undefined ? (
                      <span className="catalogo-clinico-vencimiento">
                        Vencimiento{" "}
                        <b>{fechaVencimientoCatalogo(i.fechaVencimiento)}</b>
                      </span>
                    ) : (
                      <span>{i.tipo}</span>
                    )}
                    {i.stock !== undefined && (
                      <span
                        className={
                          "catalogo-clinico-stock" +
                          (i.stock <= 0 ? " agotado" : "")
                        }
                      >
                        Stock <b>{i.stock}</b>
                      </span>
                    )}
                  </div>
                  {farmacia && alertasInventario(i).length > 0 && (
                    <div
                      className="punto-alertas-inventario"
                      aria-label={`Alertas de ${i.nombre}`}
                    >
                      {alertasInventario(i).map((alerta) => (
                        <span key={alerta.tipo} className={alerta.nivel}>
                          <Icon
                            name={
                              alerta.tipo === "stock" ? "package" : "calendar"
                            }
                            size={13}
                          />
                          {alerta.texto}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <footer>
                  <div>
                    <b>{dinero(i.precio)}</b>
                    <small>Precio de venta</small>
                  </div>
                  <button
                    type="button"
                    aria-label={`Agregar ${i.nombre}`}
                    onClick={() => prepararAgregar(i)}
                  >
                    <Icon name="plus" size={16} /> Agregar
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
        <aside className="punto-carrito">
          <header>
            <div>
              <p>
                {cocina
                  ? "CARRITO DE COCINA"
                  : farmacia
                    ? "CARRITO DE FARMACIA"
                    : "CARRITO DE VENTA"}
              </p>
              <strong>
                {lineas.reduce((t, i) => t + i.cantidad, 0)} productos
              </strong>
            </div>
            <Icon name="asset" size={24} />
          </header>
          <section className="punto-cliente">
            {!clienteSeleccionado && modo === "inicio" && (
              <div className="cliente-acciones">
                <button
                  type="button"
                  onClick={() => {
                    setErrorCliente("");
                    setModo("buscar");
                  }}
                >
                  <Icon name="search" size={15} /> Buscar paciente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegistroPacienteParaCobro(true);
                    setMostrandoNuevoPaciente(true);
                    setMensaje("");
                  }}
                >
                  <Icon name="plus" size={15} /> Registrar paciente
                </button>
              </div>
            )}
            {!clienteSeleccionado && modo === "buscar" && (
              <div className="cliente-busqueda">
                <label>
                  <Icon name="search" size={16} />
                  <input
                    autoFocus
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    placeholder="Buscar por nombre, CI/NIT, celular o correo"
                  />
                </label>
                {!!errorCliente && (
                  <p className="cliente-error" role="alert">
                    {errorCliente}
                  </p>
                )}
                {buscandoClientes && (
                  <p className="cliente-ayuda">Buscando clientes...</p>
                )}
                {!!busquedaCliente && !buscandoClientes && !errorCliente && (
                  <div
                    className="cliente-coincidencias"
                    role="listbox"
                    aria-label="Coincidencias de clientes"
                  >
                    {clientesEncontrados.length ? (
                      clientesEncontrados.map((cliente) => (
                        <button
                          type="button"
                          role="option"
                          key={cliente.id}
                          onClick={() => seleccionarCliente(cliente)}
                        >
                          <span className="cliente-coincidencia-linea">
                            <span className="cliente-nombre-coincidencia">
                              {resaltarCoincidencia(
                                cliente.nombre_razon_social,
                                busquedaCliente,
                              )}
                            </span>
                            <small>
                              {cliente.nit_ci
                                ? resaltarCoincidencia(
                                    cliente.nit_ci,
                                    busquedaCliente,
                                  )
                                : "Sin CI"}
                            </small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p>
                        No hay coincidencias. Puedes registrar al paciente para
                        esta venta.
                      </p>
                    )}
                  </div>
                )}
                <button
                  className="cliente-secundario"
                  type="button"
                  onClick={() => {
                    setBusquedaCliente("");
                    setClientesEncontrados([]);
                    setModo("inicio");
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
            {!clienteSeleccionado && modo === "registrar" && (
              <div className="cliente-formulario">
                <small>
                  El registro es solo comercial; no crea una ficha clínica.
                </small>
                <input
                  placeholder="Nombre o razón social *"
                  value={registroCliente.nombre}
                  onChange={(e) =>
                    setRegistroCliente((actual) => ({
                      ...actual,
                      nombre: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="CI / NIT"
                  value={registroCliente.nitCi}
                  onChange={(e) =>
                    setRegistroCliente((actual) => ({
                      ...actual,
                      nitCi: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Número de celular"
                  value={registroCliente.telefono}
                  onChange={(e) =>
                    setRegistroCliente((actual) => ({
                      ...actual,
                      telefono: e.target.value,
                    }))
                  }
                />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={registroCliente.correo}
                  onChange={(e) =>
                    setRegistroCliente((actual) => ({
                      ...actual,
                      correo: e.target.value,
                    }))
                  }
                />
                {!!errorCliente && (
                  <p className="cliente-error" role="alert">
                    {errorCliente}
                  </p>
                )}
                <div>
                  <button
                    type="button"
                    disabled={guardandoCliente}
                    onClick={() => void guardarCliente()}
                  >
                    {guardandoCliente ? "Guardando..." : "Guardar cliente"}
                  </button>
                  <button
                    className="cliente-secundario"
                    type="button"
                    onClick={() => setModo("inicio")}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {clienteSeleccionado && (
              <div className="cliente-resumen">
                <div className="cliente-paciente-factura">
                  <b>{clienteSeleccionado.nombre_razon_social}</b>
                  <button
                    className="cliente-cambiar"
                    type="button"
                    onClick={() => {
                      seleccionClienteVersion.current++;
                      setClienteSeleccionado(null);
                      setDatosFactura({
                        nitCi: "",
                        razonSocial: "",
                        nitCiOriginal: "",
                      });
                      setPaciente("");
                      setCiPaciente("");
                    }}
                  >
                    Cambiar
                  </button>
                </div>
                <label className="cliente-documento-factura">
                  <small>CI / NIT para factura</small>
                  <input
                    aria-label="CI o NIT para la factura"
                    value={datosFactura.nitCi}
                    onChange={(evento) =>
                      setDatosFactura((actual) => ({
                        ...actual,
                        nitCi: evento.target.value,
                        razonSocial:
                          actual.nitCi.trim() === actual.nitCiOriginal.trim()
                            ? ""
                            : actual.razonSocial,
                      }))
                    }
                    placeholder="CI / NIT"
                  />
                </label>
                {datosFactura.nitCi.trim() !==
                  datosFactura.nitCiOriginal.trim() && (
                  <label className="cliente-razon-social-factura">
                    <small>Razón social o nombre para factura</small>
                    <input
                      autoFocus
                      aria-label="Razón social o nombre para la factura"
                      value={datosFactura.razonSocial}
                      onChange={(evento) =>
                        setDatosFactura((actual) => ({
                          ...actual,
                          razonSocial: evento.target.value,
                        }))
                      }
                      placeholder="Escribe el nombre que saldrá en la factura"
                    />
                  </label>
                )}
              </div>
            )}
          </section>
          <div className="punto-carrito-lineas">
            {lineas.length
              ? lineas.map((i) => (
                  <article key={i.id}>
                    <strong>{i.nombre}</strong>
                    <small>{dinero(i.precio)} c/u</small>
                    <div>
                      <button type="button" onClick={() => cantidad(i.id, -1)}>
                        −
                      </button>
                      <input
                        className="punto-cantidad-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`Cantidad de ${i.nombre}`}
                        value={String(i.cantidad)}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => escribirCantidad(i.id, e.target.value)}
                      />
                      <button type="button" onClick={() => cantidad(i.id, 1)}>
                        +
                      </button>
                      <span>{dinero(i.precio * i.cantidad)}</span>
                      <button
                        className="punto-quitar"
                        type="button"
                        onClick={() =>
                          setLineas((a) => a.filter((x) => x.id !== i.id))
                        }
                      >
                        ×
                      </button>
                    </div>
                  </article>
                ))
              : null}
          </div>
          <section className="punto-resumen punto-descuento">
            <label>
              Descuento
              <input
                type="number"
                min="0"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </section>
          <section className="punto-pago-mixto">
            <header>
              <div>
                <strong>Pago mixto</strong>
                <small>Agrega métodos hasta completar el total</small>
              </div>
              <Icon name="asset" size={20} />
            </header>
            {pagos.map((p) => (
              <div className="punto-pago-fila" key={p.id}>
                <select
                  value={p.metodo}
                  onChange={(e) =>
                    setPagos((a) =>
                      a.map((x) =>
                        x.id === p.id ? { ...x, metodo: e.target.value } : x,
                      ),
                    )
                  }
                >
                  <option>Efectivo</option>
                  <option>QR</option>
                  <option>Tarjeta</option>
                  <option>Transferencia</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={p.monto}
                  onChange={(e) =>
                    setPagos((a) =>
                      a.map((x) =>
                        x.id === p.id ? { ...x, monto: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Monto"
                />
                {pagos.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPagos((a) => a.filter((x) => x.id !== p.id))
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              className="punto-agregar-pago"
              type="button"
              onClick={() => setPagos((a) => [...a, pagoNuevo(Date.now())])}
            >
              <Icon name="plus" size={15} /> Agregar método de pago
            </button>
            {pagos.some((p) => p.metodo === "QR" && Number(p.monto) > 0) && (
              <button
                className="punto-generar-qr"
                type="button"
                disabled
                title="Disponible cuando se integre la API bancaria"
              >
                Generar QR
              </button>
            )}
            <div className="punto-pago-totales">
              <span>
                Total pagado <b>{dinero(pagado)}</b>
              </span>
              <span>
                Saldo pendiente <b>{dinero(pendiente)}</b>
              </span>
              {cambio > 0 && (
                <span>
                  Cambio <b>{dinero(cambio)}</b>
                </span>
              )}
            </div>
          </section>
          <button
            className="punto-cobrar"
            type="button"
            disabled={!lineas.length || pendiente > 0 || cobrando}
            onClick={() => void cobrar()}
          >
            <Icon name="check" size={17} />{" "}
            {cobrando ? "Registrando venta..." : "Cobrar venta"}
          </button>
          <button
            className="punto-preventa"
            type="button"
            disabled={!lineas.length || cobrando}
            onClick={realizarPreVenta}
          >
            <Icon name="fileText" size={17} /> Realizar pre venta
            {pendiente > 0 ? ` · Falta ${dinero(pendiente)}` : ""}
          </button>
        </aside>
      </div>
    </section>
  );
}
