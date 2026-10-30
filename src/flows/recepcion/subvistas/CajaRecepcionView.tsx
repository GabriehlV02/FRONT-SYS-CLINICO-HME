import { useProfesionales, etiquetaProfesional } from '../../../radius/profesionales';
import { useEffect, useMemo, useState, type ReactNode } from "react";
import ModalRegistroPaciente from '../../../radius/vistas/pacientes/ModalRegistroPaciente';
import { usePacientes } from '../../../radius/vistas/pacientes/usePacientes';
import { nombrePacienteClinico } from '../../../radius/vistas/pacientes/pacientesApi';
import Icon from "../../../radius/componentes/Icono";
import { apiContableFetch, apiFetch } from "../../../radius/api";
import { registrarSolicitudesImagenologia } from "../../../radius/datos/solicitudesImagenologiaDemo";
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
type Linea = Item & {
  cantidad: number;
  estudioImagen?: string;
  piezaImagen?: string;
};
type Pago = { id: number; metodo: string; monto: string };
type ClienteVenta = {
  id: string;
  paciente_id?: string;
  nit_ci: string | null;
  nombre_razon_social: string;
  telefono: string | null;
  correo: string | null;
};
type ConsumoHistorial = { n: string; fecha: string; total: string; estado: 'Pagado' | 'No pagado' | 'Anulado' | 'Pre venta'; detalle: string };
type ItemConsumo = { concepto: string; cantidad: number; unitario: string; total: string };
type DetalleConsumo = { items: ItemConsumo[]; pagado: string; pagos: string[]; cajero: string; caja: string; sucursal: string };

const obtenerDetalleConsumo = (consumo: ConsumoHistorial): DetalleConsumo => {
  const base = { cajero: "Administrador", caja: "Caja 01 · Recepción", sucursal: "Hospital María Esperanza" };
  if (consumo.n === "131910") return { ...base, pagado: "0.00", pagos: ["Pendiente de cobro"], items: [{ concepto: "Hemograma completo", cantidad: 1, unitario: "50.00", total: "50.00" }, { concepto: "Estudio de imagenología", cantidad: 1, unitario: "120.00", total: "120.00" }, { concepto: "Consulta ambulatoria", cantidad: 1, unitario: "610.00", total: "610.00" }] };
  if (consumo.n === "131912") return { ...base, pagado: "0.00", pagos: ["Pre venta · sin cobro"], items: [{ concepto: "Estudio de imagenología", cantidad: 1, unitario: "1.200.00", total: "1.200.00" }, { concepto: "Paquete de servicios ambulatorios", cantidad: 1, unitario: "1.200.00", total: "1.200.00" }] };
  if (consumo.n === "EM-000318") return { ...base, pagado: "0.00", pagos: ["Pendiente de cobro"], items: [{ concepto: "Oxígeno medicinal", cantidad: 2, unitario: "84.00", total: "168.00" }, { concepto: "Materiales de emergencia", cantidad: 1, unitario: "70.00", total: "70.00" }] };
  if (consumo.n === "EM-000317") return { ...base, pagado: "0.00", pagos: ["Pendiente de cobro"], items: [{ concepto: "Medicamentos de emergencia", cantidad: 1, unitario: "65.00", total: "65.00" }, { concepto: "Insumos médicos", cantidad: 1, unitario: "30.00", total: "30.00" }] };
  return { ...base, pagado: consumo.estado === "Pagado" ? consumo.total : "0.00", pagos: consumo.estado === "Pagado" ? ["Efectivo · Bs. " + consumo.total] : [consumo.estado === "Anulado" ? "Venta anulada · sin cobro" : "Pendiente de cobro"], items: [{ concepto: "Consulta ambulatoria", cantidad: 1, unitario: "80.00", total: "80.00" }, { concepto: "Hemograma completo", cantidad: 1, unitario: "50.00", total: "50.00" }, { concepto: "Materiales de curación", cantidad: 1, unitario: "30.00", total: "30.00" }] };
};
const dinero = (n: number) => `Bs ${n.toFixed(2)}`;
const alertasInventario = (item: Item) => {
  const alertas: { tipo: "stock" | "vencimiento"; texto: string; nivel: "bajo" | "proximo" | "vencido" }[] = [];
  if (item.stock !== undefined && item.stockMinimo !== undefined && item.stock <= item.stockMinimo) alertas.push({ tipo: "stock", texto: `Stock bajo: ${item.stock} de mínimo ${item.stockMinimo}`, nivel: "bajo" });
  if (item.fechaVencimiento) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const vence = new Date(`${item.fechaVencimiento}T00:00:00`);
    const dias = Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000);
    if (dias < 0) alertas.push({ tipo: "vencimiento", texto: "Producto vencido", nivel: "vencido" });
    else if (dias <= 90) alertas.push({ tipo: "vencimiento", texto: dias === 0 ? "Vence hoy" : `Vence en ${dias} día${dias === 1 ? "" : "s"}`, nivel: "proximo" });
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
  const {medicos,resolver}=useProfesionales();
  const medicosPorEspecialidad:Record<string,string[]>=Object.fromEntries([...new Set(medicos.flatMap(p=>p.especialidades))].map(e=>[e,medicos.filter(p=>p.especialidades.includes(e)).map(etiquetaProfesional)]));
  const { pacientes: fichasPacientes, errorPacientes } = usePacientes();
  const pacientesRegistrados = fichasPacientes.map(p => ({id:p.id,nombre:nombrePacienteClinico(p),ci:p.ci}));
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
    [mensaje, setMensaje] = useState("");
  const [catalogo, setCatalogo] = useState<Item[]>([]);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [recargaCatalogo, setRecargaCatalogo] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setCargandoCatalogo(true); setErrorCatalogo('');
    apiFetch('/api/catalogo', { signal: controller.signal }).then(async r => {
      const respuesta = await r.json(); if (!r.ok) throw new Error(respuesta.message || 'No se pudo consultar el catálogo compartido.');
      return respuesta.data as (Omit<Item, 'tipo'> & { tipo: string })[];
    }).then(datos => setCatalogo(datos.map(i => ({ ...i, tipo: i.tipo === 'servicio' ? 'Servicio' : i.tipo === 'insumo' ? 'Insumo' : 'Producto' }))))
      .catch(error => { if (!controller.signal.aborted) setErrorCatalogo(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCargandoCatalogo(false); });
    return () => controller.abort();
  }, [recargaCatalogo]);
  const [imagenParaAgregar, setImagenParaAgregar] = useState<Item | null>(null);
  const [consultaParaAgendar, setConsultaParaAgendar] = useState<Item | null>(null);
  const [especialidadConsulta, setEspecialidadConsulta] = useState('Medicina general');
  const [medicoConsulta, setMedicoConsulta] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState('');
  const [horaConsulta, setHoraConsulta] = useState('');
  const [precioConsulta, setPrecioConsulta] = useState(80);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteVenta | null>(null);
  const [registroCliente, setRegistroCliente] = useState({ nombre: "", nitCi: "", telefono: "", correo: "" });
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteVenta[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [errorCliente, setErrorCliente] = useState("");
  const [tipoEstudioImagen, setTipoEstudioImagen] = useState("Rayos X");
  const [piezaEstudioImagen, setPiezaEstudioImagen] = useState("Tórax");
  const [otraPiezaImagen, setOtraPiezaImagen] = useState("");
  const [consumoSeleccionado, setConsumoSeleccionado] = useState<ConsumoHistorial | null>(null);
  useEffect(()=>{
    if(modo !== 'buscar') return;
    const termino=busquedaCliente.trim().toLocaleLowerCase('es');
    setClientesEncontrados(termino.length<2 ? [] : fichasPacientes.filter(p=>`${nombrePacienteClinico(p)} ${p.ci}`.toLocaleLowerCase('es').includes(termino)).slice(0,20).map(p=>({id:'paciente:'+p.id,paciente_id:p.id,nombre_razon_social:nombrePacienteClinico(p),nit_ci:p.ci,telefono:p.telefono || null,correo:null})));
    setBuscandoClientes(false);setErrorCliente(errorPacientes);
  },[modo,busquedaCliente,fichasPacientes,errorPacientes]);
  useEffect(() => {
    const actualizarPrecio = () => {
      try {
        const asociaciones = JSON.parse(localStorage.getItem('clinico_recepcion_funciones_items_v1') || '[]') as Array<{ funcionalidad?: string; precio?: number; activo?: boolean }>;
        const asociacion = asociaciones.find(actual => actual.activo && actual.funcionalidad === 'Agenda de pacientes');
        setPrecioConsulta(Number(asociacion?.precio) || 80);
      } catch { setPrecioConsulta(80); }
    };
    actualizarPrecio();
    window.addEventListener('storage', actualizarPrecio);
    return () => window.removeEventListener('storage', actualizarPrecio);
  }, []);

  const resultados = useMemo(
    () =>
      catalogo.filter(
        (i) =>
          (cocina || !farmacia || i.tipo === "Producto" || i.tipo === "Insumo") &&
          (tipo === "Todos" || i.tipo === tipo) &&
          `${i.nombre} ${i.codigo} ${i.tipo}`
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
  const agregar = (i: Item) => {
    setLineas((a) =>
      a.some((x) => x.id === i.id)
        ? a.map((x) => (x.id === i.id ? { ...x, cantidad: x.cantidad + 1 } : x))
        : [...a, { ...i, cantidad: 1 }],
    );
    setMensaje(`${i.nombre} agregado al carrito.`);
  };
  const prepararAgregar = (item: Item) => {
    if (item.id === 'consulta') {
      setConsultaParaAgendar(item); setEspecialidadConsulta('Medicina general'); setMedicoConsulta(medicosPorEspecialidad['Medicina general']?.[0] || ''); setFechaConsulta(''); setHoraConsulta('');
      return;
    }
    if (item.categoria === "Imagenología") {
      setImagenParaAgregar(item);
      setTipoEstudioImagen("Rayos X");
      setPiezaEstudioImagen("Tórax");
      setOtraPiezaImagen("");
      return;
    }
    agregar(item);
  };
  const agendarConsulta = async () => {
    if (!consultaParaAgendar || !fechaConsulta || !horaConsulta) return setMensaje('Selecciona especialidad, médico, fecha y hora para continuar.');
    const ficha=fichasPacientes.find(p=>p.ci===ciPaciente),profesional=resolver(medicoConsulta);
    if(!ficha || !profesional) return setMensaje('Selecciona un paciente registrado y un médico activo.');
    try{const r=await apiFetch('/api/citas',{method:'POST',headers:{Accept:'application/json'},body:JSON.stringify({paciente_id:ficha.id,profesional_id:profesional.id,doctor:profesional.nombre,especialidad:especialidadConsulta,consultorio:'Consultorio 1',fecha:fechaConsulta,hora:horaConsulta,estado:'por_confirmar'})});const d=await r.json();if(!r.ok)throw new Error(Object.values(d.errors || {}).flat().join(' ') || d.message || 'No se pudo agendar la consulta.');}catch(e){setMensaje((e as Error).message);return;}
    const linea: Linea = { ...consultaParaAgendar, id: `${consultaParaAgendar.id}-${fechaConsulta}-${horaConsulta}-${medicoConsulta}`, nombre: `${consultaParaAgendar.nombre} · ${especialidadConsulta}`, cantidad: 1 };
    setLineas(actuales => [...actuales, linea]);
    setMensaje(`Consulta agendada con ${medicoConsulta} para el ${fechaConsulta} a las ${horaConsulta}.`);
    setConsultaParaAgendar(null);
  };
  const agregarEstudioImagen = () => {
    if (!imagenParaAgregar) return;
    const pieza = piezaEstudioImagen === "Otra" ? otraPiezaImagen.trim() : piezaEstudioImagen;
    if (!pieza) return setMensaje("Indica la pieza o región del estudio.");
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
        ? actuales.map((actual) => actual.id === linea.id ? { ...actual, cantidad: actual.cantidad + 1 } : actual)
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
  const historialPaciente: ConsumoHistorial[] =
    paciente === "Luis Escobar"
      ? [
          {
            n: "EM-000318",
            fecha: "29 de septiembre de 2026 09:08",
            total: "238.00",
            estado: "No pagado",
            detalle: "Emergencias · Oxígeno y materiales",
          },
          {
            n: "EM-000317",
            fecha: "29 de septiembre de 2026 08:45",
            total: "95.00",
            estado: "No pagado",
            detalle: "Emergencias · Medicamentos e insumos",
          },
          {
            n: "131909",
            fecha: "18 de agosto de 2026 19:02",
            total: "160.00",
            estado: "Pagado",
            detalle: "Descargos Ambulatorios 510",
          },
        ]
      : [
          {
            n: "131932",
            fecha: "19 de agosto de 2026 10:56",
            total: "160.00",
            estado: "Pagado",
            detalle: "Descargos Ambulatorios 510",
          },
          {
            n: "131910",
            fecha: "18 de agosto de 2026 19:17",
            total: "780.00",
            estado: "No pagado",
            detalle: "Descargos Ambulatorios 510",
          },
          {
            n: "131912",
            fecha: "18 de agosto de 2026 21:02",
            total: "2.400.00",
            estado: "Pre venta",
            detalle: "Descargos Ambulatorios 510",
          },
          {
            n: "131909",
            fecha: "18 de agosto de 2026 19:02",
            total: "160.00",
            estado: "Anulado",
            detalle: "Descargos Ambulatorios 510",
          },
        ];
  const seleccionarCliente = async (cliente: ClienteVenta) => {
    if (cliente.paciente_id && cliente.id.startsWith('paciente:')) {
      try {
        const respuesta = await apiFetch(`/api/v1/pacientes/${cliente.paciente_id}/cliente-contable`, {method:'POST',headers:{Accept:'application/json'}});
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.data) throw new Error(resultado.message || 'No se pudo vincular el paciente para cobro.');
        cliente = resultado.data;
      } catch (causa) {setErrorCliente((causa as Error).message);return;}
    }
    setClienteSeleccionado(cliente);
    setPaciente(cliente.nombre_razon_social);
    setCiPaciente(cliente.nit_ci || '');
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
      const resultado = await respuesta.json() as { data?: ClienteVenta; message?: string; errors?: Record<string, string[]> };
      if (!respuesta.ok || !resultado.data) {
        const detalle = Object.values(resultado.errors || {}).flat()[0];
        throw new Error(detalle || resultado.message || "No se pudo registrar el cliente.");
      }
      seleccionarCliente(resultado.data);
    } catch (error) {
      setErrorCliente(error instanceof Error ? error.message : "No se pudo registrar el cliente.");
    } finally {
      setGuardandoCliente(false);
    }
  };
  const cobrar = async () => {
    if (!lineas.length || pendiente > 0) return;
    if (!clienteSeleccionado) {
      setMensaje("Busca o registra un cliente antes de cobrar la venta.");
      return;
    }
    const estudiosImagen = lineas.filter((linea) => linea.estudioImagen && linea.piezaImagen);
    if (estudiosImagen.length && (!paciente.trim() || !ciPaciente.trim())) {
      setMensaje("Selecciona al paciente y verifica su CI antes de cobrar el estudio de imagenología.");
      return;
    }
    setCobrando(true);
    setMensaje("");
    try {
      const respuesta = await apiContableFetch("/v1/ventas", {
        method: "POST",
        body: JSON.stringify({
          cliente_id: clienteSeleccionado.id,
          descuento: rebaja,
          ...(farmacia ? { observaciones: 'Origen: farmacia' } : {}),
          detalles: lineas.map((linea) => ({
            codigo_item: linea.codigo,
            nombre_item: linea.nombre,
            tipo_item: linea.tipo,
            cantidad: linea.cantidad,
            precio_unitario: linea.precio,
          })),
        }),
      });
      const resultado = await respuesta.json() as { data?: { codigo?: string }; message?: string; errors?: Record<string, string[]> };
      if (!respuesta.ok || !resultado.data) {
        const detalle = Object.values(resultado.errors || {}).flat()[0];
        throw new Error(detalle || resultado.message || "No se pudo registrar la venta.");
      }

      if (estudiosImagen.length) {
        registrarSolicitudesImagenologia(
          paciente,
          ciPaciente,
          estudiosImagen.map((linea) => ({
            estudio: linea.estudioImagen!,
            pieza: linea.piezaImagen!,
            precio: linea.precio,
            cantidad: linea.cantidad,
          })),
        );
      }
      setMensaje(`${resultado.data.codigo || "Venta"} registrada correctamente.`);
      setLineas([]);
      setPagos([pagoNuevo(Date.now())]);
      setDescuento("");
      setClienteSeleccionado(null);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo registrar la venta.");
    } finally {
      setCobrando(false);
    }
  };
  const replegarSidebarAlOperar = () => {
    if (!farmacia && !cocina) window.dispatchEvent(new Event("clinico:replegar-sidebar"));
  };
  const detalleConsumoSeleccionado = consumoSeleccionado ? obtenerDetalleConsumo(consumoSeleccionado) : null;
  return (
    <section className={`punto-pos ${(farmacia || cocina) ? "punto-pos-farmacia" : ""}`} onClickCapture={(evento) => { if ((evento.target as HTMLElement).closest("button")) replegarSidebarAlOperar(); }}>
      {consumoSeleccionado && detalleConsumoSeleccionado && <div className="punto-detalle-consumo-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setConsumoSeleccionado(null); }}>
        <section className={`punto-detalle-consumo estado-${consumoSeleccionado.estado.toLowerCase().replace(' ', '-')}`} role="dialog" aria-modal="true" aria-labelledby="detalle-consumo-titulo">
          <header className="punto-detalle-consumo-cabecera">
            <div><span>DETALLE DE CONSUMO</span><h3 id="detalle-consumo-titulo">N.º {consumoSeleccionado.n}</h3><small>{paciente || 'Paciente no identificado'} · HC-{ciPaciente || '004821'}</small></div>
            <div className="punto-detalle-consumo-importe"><span className={`estado-${consumoSeleccionado.estado.toLowerCase().replace(' ', '-')}`}>{consumoSeleccionado.estado}</span><strong>Bs. {consumoSeleccionado.total}</strong></div>
            <button type="button" aria-label="Cerrar detalle" onClick={() => setConsumoSeleccionado(null)}><Icon name="close" size={19}/></button>
          </header>
          <div className="punto-detalle-consumo-resumen"><span><b>Fecha</b>{consumoSeleccionado.fecha}</span><span><b>Sucursal</b>{detalleConsumoSeleccionado.sucursal}</span><span><b>Caja</b>{detalleConsumoSeleccionado.caja}</span><span><b>Cobró</b>{detalleConsumoSeleccionado.cajero}</span></div>
          <section className="punto-detalle-consumo-items" aria-label="Ítems del consumo"><div className="punto-detalle-consumo-titulo"><span>CONSUMO REGISTRADO</span><small>{consumoSeleccionado.detalle}</small></div><div className="punto-detalle-consumo-tabla"><div className="punto-detalle-consumo-tabla-cabecera"><span>Ítem</span><span>Cant.</span><span>P. unit.</span><span>Total</span></div>{detalleConsumoSeleccionado.items.map((item, indice) => <div className="punto-detalle-consumo-tabla-fila" key={`${item.concepto}-${indice}`}><strong>{item.concepto}</strong><span>{item.cantidad}</span><span>Bs. {item.unitario}</span><b>Bs. {item.total}</b></div>)}</div></section>
          <section className="punto-detalle-consumo-pago"><div><span>Total a pagar</span><strong>Bs. {consumoSeleccionado.total}</strong></div><div><span>Total pagado</span><strong>Bs. {detalleConsumoSeleccionado.pagado}</strong></div><div className="punto-detalle-consumo-metodos"><span>Método{detalleConsumoSeleccionado.pagos.length > 1 ? 's' : ''} de pago</span>{detalleConsumoSeleccionado.pagos.map(metodo => <b key={metodo}>{metodo}</b>)}</div></section>
          <footer><button type="button" onClick={() => setConsumoSeleccionado(null)}>Cerrar</button></footer>
        </section>
      </div>}
      {consultaParaAgendar && <div className="punto-imagen-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setConsultaParaAgendar(null); }}><form className="punto-imagen-modal punto-consulta-modal" role="dialog" aria-modal="true" aria-label="Agendar consulta ambulatoria" onSubmit={evento => { evento.preventDefault(); agendarConsulta(); }}><header><div><span>CONSULTA AMBULATORIA</span><h3>Agendar consulta</h3><small>Confirma la cita antes de añadir el servicio al carrito.</small></div><button type="button" aria-label="Cerrar" onClick={() => setConsultaParaAgendar(null)}>×</button></header><label>Especialidad<select value={especialidadConsulta} onChange={evento => { const especialidad = evento.target.value; setEspecialidadConsulta(especialidad); setMedicoConsulta(medicosPorEspecialidad[especialidad]?.[0] || ''); }}>{Object.keys(medicosPorEspecialidad).map(especialidad => <option key={especialidad}>{especialidad}</option>)}</select></label><label>Médico sugerido<select value={medicoConsulta} onChange={evento => setMedicoConsulta(evento.target.value)}>{(medicosPorEspecialidad[especialidadConsulta] || []).map(medico => <option key={medico}>{medico}</option>)}</select></label><div className="punto-consulta-fecha"><label>Fecha<input required type="date" min={new Date().toISOString().slice(0, 10)} value={fechaConsulta} onChange={evento => setFechaConsulta(evento.target.value)} /></label><label>Hora<select required value={horaConsulta} onChange={evento => setHoraConsulta(evento.target.value)}><option value="">Seleccionar</option><option>08:00</option><option>09:00</option><option>10:00</option><option>11:00</option><option>14:00</option><option>15:00</option><option>16:00</option></select></label></div><footer><button type="button" onClick={() => setConsultaParaAgendar(null)}>Cancelar</button><button className="punto-imagen-primario" type="submit"><Icon name="check" size={16} /> Agendar y añadir al carrito</button></footer></form></div>}
      {imagenParaAgregar && (
        <div className="punto-imagen-fondo" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setImagenParaAgregar(null); }}>
          <form className="punto-imagen-modal" role="dialog" aria-modal="true" aria-label="Detalle del estudio de imagenología" onSubmit={(evento) => { evento.preventDefault(); agregarEstudioImagen(); }}>
            <header>
              <div><span>IMAGENOLOGÍA</span><h3>Detalle del estudio</h3><small>Define la modalidad y la pieza antes de agregarla al cobro.</small></div>
              <button type="button" aria-label="Cerrar" onClick={() => setImagenParaAgregar(null)}>×</button>
            </header>
            <label>Tipo de estudio
              <select value={tipoEstudioImagen} onChange={(evento) => setTipoEstudioImagen(evento.target.value)}>
                <option>Rayos X</option><option>Tomografía</option><option>Ecocardiograma</option><option>Otro estudio de imagen</option>
              </select>
            </label>
            <label>Pieza o región
              <select value={piezaEstudioImagen} onChange={(evento) => setPiezaEstudioImagen(evento.target.value)}>
                <option>Tórax</option><option>Brazo</option><option>Antebrazo</option><option>Mano</option><option>Pierna</option><option>Rodilla</option><option>Pie</option><option>Craneo</option><option>Abdomen</option><option>Columna</option><option>Pelvis</option><option>Otra</option>
              </select>
            </label>
            {piezaEstudioImagen === "Otra" && <label>Especifica la pieza
              <input required autoFocus value={otraPiezaImagen} onChange={(evento) => setOtraPiezaImagen(evento.target.value)} placeholder="Ej. hombro izquierdo" />
            </label>}
            <footer><button type="button" onClick={() => setImagenParaAgregar(null)}>Cancelar</button><button className="punto-imagen-primario" type="submit"><Icon name="plus" size={16} /> Agregar al cobro · {dinero(imagenParaAgregar.precio)}</button></footer>
          </form>
        </div>
      )}
      {mostrandoLaboratorio && (
        <SolicitudLaboratorioRecepcion
          paciente={
            paciente && ciPaciente ? { id:fichasPacientes.find(p=>p.ci===ciPaciente)?.id, nombre: paciente, ci: ciPaciente } : null
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
          pacienteInicial={paciente && ciPaciente ? { nombre: paciente, ci: ciPaciente } : null}
          onRegistrada={(registro) => setMensaje(`Preinternación registrada para ${registro.paciente}.`)}
          onCerrar={() => setMostrandoInternacion(false)}
        />
      )}
      {mostrandoNuevoPaciente && <ModalRegistroPaciente onCerrar={() => setMostrandoNuevoPaciente(false)} onRegistrado={p => {
        setPaciente(nombrePacienteClinico(p)); setCiPaciente(p.ci);
        if(registroPacienteParaCobro) void seleccionarCliente({id:'paciente:'+p.id,paciente_id:p.id,nombre_razon_social:nombrePacienteClinico(p),nit_ci:p.ci,telefono:p.telefono || null,correo:null});
        setMensaje('Paciente registrado en la ficha clínica compartida.');
      }} />}
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
            Sucursal
            <select defaultValue="Hospital María Esperanza">
              <option>Hospital María Esperanza</option>
              <option>Centro de Hemodiálisis</option>
              <option>Policonsultorio</option>
            </select>
          </label>
          <label>
            Caja
            <select defaultValue="Caja 01 · Recepción">
              <option>Caja 01 · Recepción</option>
              <option>Caja 02 · Farmacia</option>
              {cocina && <option>Caja 03 · Cocina</option>}
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
                  <b>HC-004821</b>
                </header>
                {paciente === "Luis Escobar" && (
                  <section className="punto-acceso-internacion">
                    <strong>Internado</strong>
                    <button
                      type="button"
                      onClick={() => onAbrirCuenta?.("internacion", paciente)}
                    >
                      Ver cuenta <Icon name="arrowRight" size={14} />
                    </button>
                  </section>
                )}
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
                  {historialPaciente
                    .filter(
                      (c) =>
                        filtroHistorial === "Todos" ||
                        c.estado === filtroHistorial,
                    )
                    .map((c) => (
                      <article
                        key={c.n}
                        className={`estado-${c.estado.toLowerCase().replace(" ", "-")}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalle del consumo ${c.n}`}
                        onClick={() => setConsumoSeleccionado(c)}
                        onKeyDown={evento => { if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); setConsumoSeleccionado(c); } }}
                      >
                        <div>
                          <strong>N.º {c.n}</strong>
                          <small>HOSPITAL</small>
                        </div>
                        <span className="punto-historial-estado">
                          {c.estado}
                        </span>
                        <p>
                          <Icon name="chevronRight" size={14} /> Cajero/a:
                          farmacia test farmacia test
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
        <section className="punto-catalogo">
          {cargandoCatalogo && <p role="status">Consultando productos y servicios del contable…</p>}
          {errorCatalogo && <p className="punto-catalogo-error" role="alert"><span>{errorCatalogo}</span><button type="button" onClick={() => setRecargaCatalogo(v => v + 1)}>Reintentar</button></p>}
          <div className="punto-busquedas">
            <label>
              <Icon name="search" size={17} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre, código o categoría…"
              />
            </label>
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
              <button className="punto-accion-consulta-externa" type="button" onClick={onConsultaExterna}>
                <Icon name="calendar" size={16} /> Consulta externa
              </button>
            )}
            {!farmacia && !cocina && (
              <button className="punto-accion-cirugia" type="button" onClick={onAgendarCirugia}>
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
              {(farmacia
                ? (["Todos", "Producto", "Insumo"] as const)
                : (["Todos", "Producto", "Insumo", "Servicio"] as const)
              ).map((o) => (
                <button
                  type="button"
                  className={tipo === o ? "activo" : ""}
                  key={o}
                  onClick={() => setTipo(o)}
                >
                  {o}
                </button>
              ))}
            </div>
            <button className="punto-actualizar-catalogo" type="button" disabled={cargandoCatalogo} onClick={() => setRecargaCatalogo(v => v + 1)}><Icon name="refresh" size={15}/> Actualizar</button>

          </div>
          {(mensaje || errorPacientes) && <p className="punto-aviso exito">{mensaje || errorPacientes}</p>}

            <div className="punto-tarjetas catalogo-clinico-tarjetas">
              {resultados.map((i) => (
                <article key={i.id}>
                  <div className="punto-tarjeta-info">
                    <small>{i.codigo}</small>
                    <strong>{i.nombre}</strong>
                    <div className="catalogo-clinico-detalles"><span>{i.tipo}</span>{i.stock !== undefined && <span className={'catalogo-clinico-stock' + (i.stock <= 0 ? ' agotado' : '')}>Stock <b>{i.stock}</b></span>}</div>
                    {farmacia && alertasInventario(i).length > 0 && <div className="punto-alertas-inventario" aria-label={`Alertas de ${i.nombre}`}>
                      {alertasInventario(i).map(alerta => <span key={alerta.tipo} className={alerta.nivel}><Icon name={alerta.tipo === "stock" ? "package" : "calendar"} size={13}/>{alerta.texto}</span>)}
                    </div>}
                  </div>
                  <footer>
                    <div>
                      <b>{dinero(i.precio)}</b>
                      <small>Precio de venta</small>
                    </div>
                    <button type="button" aria-label={`Agregar ${i.nombre}`} onClick={() => prepararAgregar(i)}>
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
              <p>{cocina ? "CARRITO DE COCINA" : farmacia ? "CARRITO DE FARMACIA" : "CARRITO DE VENTA"}</p>
              <strong>
                {lineas.reduce((t, i) => t + i.cantidad, 0)} productos
              </strong>
            </div>
            <Icon name="asset" size={24} />
          </header>
          <section className="punto-cliente">
            <header>
              <strong>Paciente para cobro</strong>
              {clienteSeleccionado && (
                <button
                  className="cliente-cambiar"
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setPaciente("");
                    setCiPaciente("");
                  }}
                >
                  Cambiar
                </button>
              )}
            </header>
            {!clienteSeleccionado && modo === "inicio" && (
              <div className="cliente-acciones">
                <button type="button" onClick={() => { setErrorCliente(""); setModo("buscar"); }}>
                  <Icon name="search" size={15} /> Buscar paciente
                </button>
                <button type="button" onClick={() => { setRegistroPacienteParaCobro(true); setMostrandoNuevoPaciente(true); setMensaje(""); }}>
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
                {!!errorCliente && <p className="cliente-error" role="alert">{errorCliente}</p>}
                {buscandoClientes && <p className="cliente-ayuda">Buscando clientes...</p>}
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
                          <span>
                            <b>{cliente.nombre_razon_social}</b>
                            <small>{cliente.nit_ci ? `CI/NIT: ${cliente.nit_ci}` : "Sin CI/NIT registrado"}</small>
                          </span>
                          <Icon name="chevronRight" size={15} />
                        </button>
                      ))
                    ) : (
                      <p>No hay coincidencias. Puedes registrar al paciente para esta venta.</p>
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
                <small>El registro es solo comercial; no crea una ficha clínica.</small>
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
                  onChange={(e) => setRegistroCliente((actual) => ({ ...actual, correo: e.target.value }))}
                />
                {!!errorCliente && <p className="cliente-error" role="alert">{errorCliente}</p>}
                <div>
                  <button type="button" disabled={guardandoCliente} onClick={() => void guardarCliente()}>
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
              <button className="cliente-resumen" type="button">
                <span>
                  <small>Paciente para cobro</small>
                  <b>{clienteSeleccionado.nombre_razon_social}</b>
                </span>
                <span>
                  <small>CI / NIT</small>
                  <b>{clienteSeleccionado.nit_ci || "No registrado"}</b>
                </span>
                <Icon name="chevronDown" size={18} />
              </button>
            )}
          </section>
          <div className="punto-carrito-lineas">
            {lineas.length ? (
              lineas.map((i) => (
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
            ) : (
              <p>No hay productos en el carrito.</p>
            )}
          </div>
          <section className="punto-resumen">
            <div>
              <span>Subtotal</span>
              <b>{dinero(subtotal)}</b>
            </div>
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
            <div className="punto-total">
              <span>Total</span>
              <b>{dinero(total)}</b>
            </div>
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
            <Icon name="check" size={17} /> {cobrando ? "Registrando venta..." : "Cobrar e imprimir factura"}
          </button>
        </aside>
      </div>
    </section>
  );
}
