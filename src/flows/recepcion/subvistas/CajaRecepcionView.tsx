import { useEffect, useMemo, useState } from "react";
import Icon from "../../../radius/componentes/Icono";
import { apiContableFetch, apiFetch } from "../../../radius/api";
import { registrarSolicitudesImagenologia } from "../../../radius/datos/solicitudesImagenologiaDemo";
import "./CajaImagenologiaDemo.css";
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
  nit_ci: string | null;
  nombre_razon_social: string;
  telefono: string | null;
  correo: string | null;
};
const catalogo: Item[] = [
  {
    id: "consulta",
    nombre: "Consulta médica general",
    tipo: "Servicio",
    codigo: "SRV-001",
    precio: 80,
  },
  {
    id: "hemograma",
    nombre: "Hemograma completo",
    tipo: "Servicio",
    codigo: "LAB-009",
    precio: 50,
    categoria: "Laboratorio",
    subcategoria: "Hematología",
  },
  {
    id: "rayos",
    nombre: "Estudio de imagenología",
    tipo: "Servicio",
    codigo: "IMG-014",
    precio: 120,
    categoria: "Imagenología",
  },
  {
    id: "gasa",
    nombre: "Gasa estéril 10 × 10 cm",
    tipo: "Insumo",
    codigo: "INS-021",
    precio: 12,
    stock: 84,
  },
  {
    id: "venda",
    nombre: "Venda elástica 10 cm",
    tipo: "Insumo",
    codigo: "INS-034",
    precio: 18,
    stock: 35,
  },
  {
    id: "paracetamol",
    nombre: "Paracetamol 500 mg",
    tipo: "Producto",
    codigo: "PRD-104",
    precio: 8,
    stock: 146,
  },
];
const dinero = (n: number) => `Bs ${n.toFixed(2)}`;
const pagoNuevo = (id: number): Pago => ({ id, metodo: "Efectivo", monto: "" });
const pacientesEjemplo = [
  { nombre: "Luis Escobar", ci: "6845210" },
  { nombre: "Luis Alberto Escobar Rojas", ci: "4982157" },
  { nombre: "María Fernández López", ci: "7351842" },
  { nombre: "Ana Rodríguez Vargas", ci: "6129478" },
];
export function CajaRecepcionView({
  onAbrirCuenta,
  farmacia = false,
}: {
  onAbrirCuenta?: (
    origen: "emergencias" | "internacion",
    paciente: string,
  ) => void;
  farmacia?: boolean;
}) {
  const [busqueda, setBusqueda] = useState(""),
    [tipo, setTipo] = useState<"Todos" | Tipo>("Todos"),
    [vista, setVista] = useState<"galeria" | "listado">("galeria"),
    [lineas, setLineas] = useState<Linea[]>([]),
    [paciente, setPaciente] = useState(""),
    [ciPaciente, setCiPaciente] = useState(""),
    [historialAbierto, setHistorialAbierto] = useState(true),
    [filtroHistorial, setFiltroHistorial] = useState("Todos"),
    [mostrandoLaboratorio, setMostrandoLaboratorio] = useState(false),
    [mostrandoInternacion, setMostrandoInternacion] = useState(false),
    [mostrandoNuevoPaciente, setMostrandoNuevoPaciente] = useState(false),
    [mostrandoCotizacion, setMostrandoCotizacion] = useState(false),
    [modo, setModo] = useState<"inicio" | "buscar" | "registrar">("inicio"),
    [pagos, setPagos] = useState<Pago[]>([pagoNuevo(1)]),
    [descuento, setDescuento] = useState(""),
    [mensaje, setMensaje] = useState("");
  const [imagenParaAgregar, setImagenParaAgregar] = useState<Item | null>(null);
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
  useEffect(() => {
    if (modo !== "buscar") {
      setBuscandoClientes(false);
      return;
    }
    const termino = busquedaCliente.trim();
    if (termino.length < 2) {
      setClientesEncontrados([]);
      setErrorCliente("");
      setBuscandoClientes(false);
      return;
    }

    const controller = new AbortController();
    const temporizador = window.setTimeout(() => {
      setBuscandoClientes(true);
      setErrorCliente("");
      void apiContableFetch(`/v1/clientes?buscar=${encodeURIComponent(termino)}`, { signal: controller.signal })
        .then(async (respuesta) => {
          const resultado = await respuesta.json() as { data?: ClienteVenta[]; message?: string };
          if (!respuesta.ok) throw new Error(resultado.message || "No se pudieron buscar los clientes.");
          setClientesEncontrados(resultado.data || []);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setClientesEncontrados([]);
          setErrorCliente(error instanceof Error ? error.message : "No se pudieron buscar los clientes.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBuscandoClientes(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(temporizador);
      controller.abort();
    };
  }, [busquedaCliente, modo]);

  const resultados = useMemo(
    () =>
      catalogo.filter(
        (i) =>
          (!farmacia || i.tipo === "Producto" || i.tipo === "Insumo") &&
          (tipo === "Todos" || i.tipo === tipo) &&
          `${i.nombre} ${i.codigo} ${i.tipo}`
            .toLowerCase()
            .includes(busqueda.toLowerCase()),
      ),
    [busqueda, tipo, farmacia],
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
    if (item.categoria === "Imagenología") {
      setImagenParaAgregar(item);
      setTipoEstudioImagen("Rayos X");
      setPiezaEstudioImagen("Tórax");
      setOtraPiezaImagen("");
      return;
    }
    agregar(item);
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
  const historialPaciente =
    paciente === "Luis Escobar"
      ? [
          {
            n: "EM-000318",
            fecha: "29 de septiembre de 2026 09:08",
            total: "238.00",
            estado: "A cuenta",
            detalle: "Emergencias · Oxígeno y materiales",
          },
          {
            n: "EM-000317",
            fecha: "29 de septiembre de 2026 08:45",
            total: "95.00",
            estado: "A cuenta",
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
            estado: "A cuenta",
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
  const seleccionarCliente = (cliente: ClienteVenta) => {
    setClienteSeleccionado(cliente);
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
  return (
    <section className={`punto-pos ${farmacia ? "punto-pos-farmacia" : ""}`}>
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
            paciente && ciPaciente ? { nombre: paciente, ci: ciPaciente } : null
          }
          pacientes={pacientesEjemplo}
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
      {mostrandoNuevoPaciente && (
        <div
          className="punto-nuevo-paciente-fondo"
          role="presentation"
          onClick={() => setMostrandoNuevoPaciente(false)}
        >
          <form
            className="punto-nuevo-paciente-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo paciente"
            onClick={(event) => event.stopPropagation()}
            onSubmit={async (event) => {
              event.preventDefault();
              const formulario = event.currentTarget;
              const campo = (selector: string) => formulario.querySelector<HTMLInputElement>(selector)?.value || "";
              const respuesta = await apiFetch('/api/v1/pacientes', { method: 'POST', body: JSON.stringify({
                nombres: campo('input[placeholder="Nombres"]'), apellido_paterno: campo('input[placeholder="Apellido paterno"]'), apellido_materno: campo('input[placeholder="Apellido materno"]'), ci: campo('input[placeholder="CI"]'),
                complemento_ci: campo('input[placeholder="Complemento"]'), expedido_en: formulario.querySelector<HTMLSelectElement>('select[name="expedidoEn"]')?.value || null, nit: campo('input[placeholder="NIT"]'), razon_social: campo('input[placeholder="Razón social"]'),
                fecha_nacimiento: campo('input[type="date"]'), telefono: campo('input[placeholder="+591"]'), genero: formulario.querySelector<HTMLSelectElement>('select[name="genero"]')?.value, ci_con_qr: formulario.querySelector<HTMLInputElement>('.nuevo-paciente-ci input[type="checkbox"]')?.checked || false,
                pais: formulario.querySelector<HTMLSelectElement>('select[name="pais"]')?.value || 'Bolivia', departamento: formulario.querySelector<HTMLSelectElement>('select[name="departamento"]')?.value || 'Cochabamba', ciudad: campo('input[placeholder="Ciudad"]'), zona_barrio: campo('input[placeholder="Zona cardinal"]'), direccion_domicilio: campo('input[placeholder="Dirección"]'),
                responsable_nombre_completo: campo('input[placeholder="Nombre completo"]'), responsable_ci: campo('input[placeholder="CI del familiar"]'), responsable_telefono: campo('input[placeholder="Teléfono"]'), responsable_parentesco: campo('input[placeholder="Ej. Padre, madre o tutor"]'), como_se_entero: formulario.querySelector<HTMLSelectElement>('select[name="comoSeEntero"]')?.value, observaciones: campo('textarea[placeholder="Observaciones"]'), habilitado: formulario.querySelector<HTMLInputElement>('.nuevo-paciente-habilitado input')?.checked ?? true,
              }) });
              const resultado = await respuesta.json() as { message?: string };
              if (!respuesta.ok) throw new Error(resultado.message || 'No se pudo registrar el paciente.');
              window.dispatchEvent(new Event('pacientes:actualizados'));
              setMostrandoNuevoPaciente(false);
            }}
          >
            <header>
              <div>
                <span>
                  <Icon name="users" size={20} />
                </span>
                <div>
                  <p>NUEVO PACIENTE</p>
                  <h2>Registrar paciente</h2>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMostrandoNuevoPaciente(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="punto-nuevo-paciente-contenido">
              <section className="nuevo-paciente-busqueda">
                <label>
                  <Icon name="search" size={17} />
                  <input placeholder="Buscar paciente registrado" />
                </label>
                <button type="button">
                  <Icon name="fileText" size={16} /> Imprimir formulario
                </button>
              </section>
              <fieldset className="nuevo-paciente-seccion">
                <legend>Datos del paciente</legend>
                <div className="nuevo-paciente-campos">
                  <label>
                    Nombres *<input required placeholder="Nombres" />
                  </label>
                  <label>
                    Apellido paterno *
                    <input required placeholder="Apellido paterno" />
                  </label>
                  <label>
                    Apellido materno *
                    <input required placeholder="Apellido materno" />
                  </label>
                  <label className="nuevo-paciente-ci">
                    CI *
                    <input required placeholder="CI" />
                    <span>
                      <input type="checkbox" /> CI con QR
                    </span>
                  </label>
                  <label>
                    Complemento
                    <input placeholder="Complemento" />
                  </label>
                  <label>
                    Expedido en
                    <select name="expedidoEn" defaultValue="">
                      <option value="">Ninguno</option>
                      <option value="CBBA">CBBA - COCHABAMBA</option>
                      <option value="LPZ">LPZ - LA PAZ</option>
                      <option value="OR">OR - ORURO</option>
                      <option value="POT">POT - POTOSÍ</option>
                      <option value="TJA">TJA - TARIJA</option>
                      <option value="CHU">CHU - CHUQUISACA</option>
                      <option value="SCZ">SCZ - SANTA CRUZ</option>
                      <option value="BEN">BEN - BENI</option>
                      <option value="PND">PND - PANDO</option>
                      <option value="EXTRANJERO">EXTRANJERO</option>
                    </select>
                  </label>
                  <label>
                    NIT
                    <input placeholder="NIT" />
                  </label>
                  <label>
                    Razón social
                    <input placeholder="Razón social" />
                  </label>
                  <label>
                    Fecha de nacimiento *<input required type="date" />
                  </label>
                  <label>
                    Teléfono
                    <input type="tel" placeholder="+591" />
                  </label>
                  <label>
                    Género *
                    <select name="genero" required defaultValue="">
                      <option value="" disabled>
                        Seleccionar
                      </option>
                      <option>Femenino</option>
                      <option>Masculino</option>
                      <option>Otro</option>
                    </select>
                  </label>
                </div>
              </fieldset>
              <fieldset className="nuevo-paciente-seccion">
                <legend>Domicilio</legend>
                <div className="nuevo-paciente-campos nuevo-paciente-domicilio">
                  <label>
                    País
                    <select name="pais" defaultValue="Bolivia">
                      <option>Bolivia</option>
                    </select>
                  </label>
                  <label>
                    Departamento
                    <select name="departamento" defaultValue="Cochabamba">
                      <option>Cochabamba</option>
                      <option>La Paz</option>
                      <option>Santa Cruz</option>
                    </select>
                  </label>
                  <label>
                    Ciudad
                    <input placeholder="Ciudad" />
                  </label>
                  <label>
                    Zona / barrio
                    <input placeholder="Zona cardinal" />
                  </label>
                  <label className="campo-ancho">
                    Dirección domicilio
                    <input placeholder="Dirección" />
                  </label>
                </div>
              </fieldset>
              <fieldset className="nuevo-paciente-seccion">
                <legend>Persona responsable</legend>
                <div className="nuevo-paciente-campos nuevo-paciente-responsable">
                  <label>
                    Nombre completo
                    <input placeholder="Nombre completo" />
                  </label>
                  <label>
                    CI / Carnet de identidad
                    <input placeholder="CI del familiar" />
                  </label>
                  <label>
                    Teléfono de contacto
                    <input type="tel" placeholder="Teléfono" />
                  </label>
                  <label>
                    Parentesco
                    <input placeholder="Ej. Padre, madre o tutor" />
                  </label>
                </div>
              </fieldset>
              <fieldset className="nuevo-paciente-seccion">
                <legend>Preguntas</legend>
                <div className="nuevo-paciente-campos nuevo-paciente-preguntas">
                  <label className="campo-ancho">
                    ¿Cómo se enteró de nosotros? *
                    <select name="comoSeEntero" required defaultValue="">
                      <option value="" disabled>
                        Seleccionar una opción
                      </option>
                      <option>Recomendación</option>
                      <option>Redes sociales</option>
                      <option>Otro</option>
                    </select>
                  </label>
                  <label className="campo-ancho">
                    Observaciones
                    <textarea placeholder="Observaciones" />
                  </label>
                </div>
                <label className="nuevo-paciente-habilitado">
                  <input type="checkbox" defaultChecked /> Habilitado
                </label>
              </fieldset>
            </div>
            <footer>
              <button
                type="button"
                onClick={() => setMostrandoNuevoPaciente(false)}
              >
                Cancelar
              </button>
              <button type="submit">Guardar paciente</button>
            </footer>
          </form>
        </div>
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
            </select>
          </label>
        </div>
        {!farmacia && (
          <button
            className="punto-hacer-cotizacion"
            type="button"
            onClick={() => setMostrandoCotizacion(true)}
          >
            DOCUMENTOS Y CONSENTIMIENTOS
          </button>
        )}
      </header>
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
                    <p>CUENTAS ANTERIORES</p>
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
                  <option>A cuenta</option>
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
          <div className="punto-busquedas">
            <label>
              <Icon name="search" size={17} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre, código o categoría…"
              />
            </label>
            {!farmacia && (
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
            {!farmacia && (
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
            <button
              className="punto-accion-nuevo-paciente"
              type="button"
              onClick={() => {
                setMostrandoNuevoPaciente(true);
                setMensaje("");
              }}
            >
              <Icon name="plus" size={16} /> Registrar paciente
            </button>
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
            <div
              className="punto-modo-vista"
              role="group"
              aria-label="Cambiar vista de catálogo"
            >
              <button
                type="button"
                className={vista === "listado" ? "activo" : ""}
                onClick={() => setVista("listado")}
              >
                <Icon name="menu" size={16} /> Listado
              </button>
              <button
                type="button"
                className={vista === "galeria" ? "activo" : ""}
                onClick={() => setVista("galeria")}
              >
                <Icon name="image" size={16} /> Galería
              </button>
            </div>
          </div>
          {mensaje && <p className="punto-aviso exito">{mensaje}</p>}
          {vista === "galeria" ? (
            <div className="punto-tarjetas">
              {resultados.map((i) => (
                <article key={i.id}>
                  <div className="punto-tarjeta-avatar">
                    <span>
                      {i.nombre
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="punto-tarjeta-info">
                    <small>{i.codigo}</small>
                    <strong>{i.nombre}</strong>
                    <span>
                      {i.tipo}
                      {i.stock !== undefined ? ` · Stock ${i.stock}` : ""}
                    </span>
                  </div>
                  <footer>
                    <div>
                      <b>{dinero(i.precio)}</b>
                      <small>{i.tipo}</small>
                    </div>
                    <button type="button" onClick={() => prepararAgregar(i)}>
                      <Icon name="plus" size={16} /> Agregar
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="punto-listado">
              {resultados.map((i) => (
                <article key={i.id}>
                  <div className="punto-listado-avatar">
                    {i.nombre
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")}
                  </div>
                  <div className="punto-listado-info">
                    <strong>{i.nombre}</strong>
                    <span>
                      {i.codigo} · {i.tipo}
                    </span>
                  </div>
                  <b>{dinero(i.precio)}</b>
                  <button type="button" onClick={() => prepararAgregar(i)}>
                    <Icon name="plus" size={16} /> Agregar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside className="punto-carrito">
          <header>
            <div>
              <p>{farmacia ? "CARRITO DE FARMACIA" : "CARRITO DE VENTA"}</p>
              <strong>
                {lineas.reduce((t, i) => t + i.cantidad, 0)} productos
              </strong>
            </div>
            <Icon name="asset" size={24} />
          </header>
          <section className="punto-cliente">
            <header>
              <strong>Cliente</strong>
              {clienteSeleccionado && (
                <button
                  className="cliente-cambiar"
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                  }}
                >
                  Cambiar
                </button>
              )}
            </header>
            {!clienteSeleccionado && modo === "inicio" && (
              <div className="cliente-acciones">
                <button type="button" onClick={() => { setErrorCliente(""); setModo("buscar"); }}>
                  <Icon name="search" size={15} /> Buscar cliente
                </button>
                <button type="button" onClick={() => { setErrorCliente(""); setModo("registrar"); }}>
                  <Icon name="plus" size={15} /> Registrar cliente
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
                      <p>No hay coincidencias. Puedes registrar al cliente para esta venta.</p>
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
                  <small>Cliente de venta</small>
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
