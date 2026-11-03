import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '../../radius/api';
import Icon from '../../radius/componentes/Icono';
import './AsistenteFarmaciaView.css';

type SubvistaFarmaciaIa = 'chat' | 'inventario' | 'admin';
type MensajeChat = { id: number; rol: 'assistant' | 'user'; texto: string; hora: string; inventarioDescargaId?: number };
type ConfiguracionIa = { endpoint: string; modelo: string; instrucciones: string; consultarCatalogo: boolean; consultarInventario: boolean };
type SucursalFarmacia = { id: number; nombre: string; items: number; almacenes: number; estantes: number; mostradores: number; espacios: number };
type TipoEstructuraFarmacia = 'ESTANTE' | 'FRIGOBAR' | 'MOSTRADOR' | 'OTRO' | 'ESPACIO';
type EstructuraFarmacia = { id?: number; tipo: TipoEstructuraFarmacia; nombre: string; repisas: string[]; repisaIds?: number[] };
type ProductoUbicacionFarmacia = { id: number; codigo: string; nombre: string; marca: string | null; presentacion: string | null; generico: string; repisaId: number | null; ubicacion: string | null; cantidad: number };
type AlmacenFarmacia = { id: number; nombre: string; items: number; estructuras: EstructuraFarmacia[]; productos?: ProductoUbicacionFarmacia[] };
type DetalleSucursalFarmacia = { sucursalId: number; nombre?: string; items: number; almacenes: AlmacenFarmacia[] };
type AlmacenInventarioFisico = { id: number; sucursalId: number; sucursal: string; nombre: string };
type InventarioFisico = { id: number; sucursal: string; almacen: string; estado: 'ESPERANDO_ALMACEN' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO'; inicio: string; finalizado: string | null; cantidadEsperada: number; cantidadContada: number; faltantes: number; sobrantes: number; itemsTotal: number; itemsContados: number };
type DetalleInventarioFisico = InventarioFisico & { items: { id: number; itemId: number; codigo: string; nombre: string; generico: string; marca: string; presentacion: string; esperada: number; contada: number | null }[] };
const formatoCantidad = (valor: number) => valor.toLocaleString('es-BO', { maximumFractionDigits: 3 });
const formatoFecha = (valor: string | null) => valor ? new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor.replace(' ', 'T'))) : '—';
const etiquetaEstadoInventario = (estado: InventarioFisico['estado']) => ({ EN_CURSO: 'Inventario en curso', ESPERANDO_ALMACEN: 'Pendiente de almacén', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado' })[estado];
const claseEstadoInventario = (estado: InventarioFisico['estado']) => ({ EN_CURSO: 'en-curso', ESPERANDO_ALMACEN: 'pendiente', FINALIZADO: 'finalizado', CANCELADO: 'cancelado' })[estado];
type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const configuracionInicial: ConfiguracionIa = {
  endpoint: '', modelo: 'gpt-6-luna',
  instrucciones: 'Eres TOMI, un asistente amable y claro para consultas de catálogo e inventario de farmacia. Si no tienes datos suficientes, indícalo y solicita verificación con el personal farmacéutico.',
  consultarCatalogo: true, consultarInventario: true,
};
const saludo: MensajeChat = { id: 1, rol: 'assistant', texto: '¡Hola! Soy TOMI, el asistente de farmacia. Puedo ayudarte a consultar el catálogo y el inventario. Puedes escribirme o dictar tu consulta con el micrófono.', hora: 'Ahora' };
function leerConfiguracion(): ConfiguracionIa {
  try {
    const guardada = localStorage.getItem('farmacia-ia-config');
    if (!guardada) return configuracionInicial;
    const preferencias = JSON.parse(guardada) as Partial<ConfiguracionIa> & Record<string, unknown>;
    delete preferencias.vozURI; delete preferencias.vozVelocidad; delete preferencias.vozTono; delete preferencias.voiceURI;
    return { ...configuracionInicial, ...preferencias };
  }
  catch { return configuracionInicial; }
}

const etiquetaTipoEstructura: Record<TipoEstructuraFarmacia, string> = {
  ESTANTE: 'Estante', FRIGOBAR: 'Frigobar', MOSTRADOR: 'Mostrador', OTRO: 'Otro', ESPACIO: 'Otro',
};

type VistaDetalleSucursalProps = {
  detalle: DetalleSucursalFarmacia;
  almacenSeleccionado: number | null;
  guardando: boolean;
  mensaje: string;
  error: string;
  volver: () => void;
  seleccionarAlmacen: (id: number) => void;
  cambiarEstructura: (indice: number, cambios: Partial<EstructuraFarmacia>) => void;
  agregarEstructura: (estructura: EstructuraFarmacia) => void;
  quitarEstructura: (indice: number) => void;
  asignarItem: (itemId: number, repisaId: number) => void;
  guardar: () => void;
};

function VistaDetalleSucursal({ detalle, almacenSeleccionado, guardando, mensaje, error, volver, seleccionarAlmacen, cambiarEstructura, agregarEstructura, quitarEstructura, asignarItem, guardar }: VistaDetalleSucursalProps) {
  const [tipoNuevo, setTipoNuevo] = useState<TipoEstructuraFarmacia>('ESTANTE');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [cantidadRepisas, setCantidadRepisas] = useState('');
  const [formularioNuevo, setFormularioNuevo] = useState(false);
  const [itemAsignacion, setItemAsignacion] = useState('');
  const [repisaAsignacion, setRepisaAsignacion] = useState('');
  const estructuras = detalle.almacenes.flatMap(almacen => almacen.estructuras);
  const repisasTotales = estructuras.reduce((total, estructura) => total + estructura.repisas.length, 0);
  const tarjetas = [
    { titulo: 'Almacenes', valor: detalle.almacenes.length },
    { titulo: 'Estantes', valor: estructuras.filter(estructura => estructura.tipo === 'ESTANTE').length },
    { titulo: 'Repisas de estantes', valor: estructuras.filter(estructura => estructura.tipo === 'ESTANTE').reduce((total, estructura) => total + estructura.repisas.length, 0) },
    { titulo: 'Mostradores', valor: estructuras.filter(estructura => estructura.tipo === 'MOSTRADOR').length },
    { titulo: 'Repisas de mostrador', valor: estructuras.filter(estructura => estructura.tipo === 'MOSTRADOR').reduce((total, estructura) => total + estructura.repisas.length, 0) },
    { titulo: 'Frigobares', valor: estructuras.filter(estructura => estructura.tipo === 'FRIGOBAR').length },
    { titulo: 'Repisas totales', valor: repisasTotales },
  ];
  const abrirFormulario = (tipo: TipoEstructuraFarmacia) => {
    const nombreBase = etiquetaTipoEstructura[tipo];
    const actuales = detalle.almacenes.find(almacen => almacen.id === almacenSeleccionado)?.estructuras ?? [];
    let consecutivo = 1;
    while (actuales.some(estructura => estructura.nombre.toLowerCase() === `${nombreBase} ${consecutivo}`.toLowerCase())) consecutivo++;
    setTipoNuevo(tipo);
    setNombreNuevo(`${nombreBase} ${consecutivo}`);
    setCantidadRepisas('');
    setFormularioNuevo(true);
  };
  const crearEstructura = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cantidad = Number(cantidadRepisas);
    if (!nombreNuevo.trim() || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 100) return;
    agregarEstructura({ tipo: tipoNuevo, nombre: nombreNuevo.trim(), repisas: Array.from({ length: cantidad }, (_, indice) => `Repisa ${indice + 1}`) });
    setFormularioNuevo(false);
    setNombreNuevo('');
    setCantidadRepisas('');
  };
  const almacen = detalle.almacenes.find(item => item.id === almacenSeleccionado);
  const productos = almacen?.productos ?? [];
  const repisasDisponibles = (almacen?.estructuras ?? []).flatMap(estructura => estructura.repisas.map((repisa, indice) => ({ id: estructura.repisaIds?.[indice], etiqueta: `${estructura.nombre} · ${repisa}` }))).filter((repisa): repisa is { id: number; etiqueta: string } => typeof repisa.id === 'number');

  return <section className="farmacia-ia-sucursal-detalle" aria-label={`Detalle de ${detalle.nombre || 'sucursal'}`}>
    <button type="button" className="farmacia-ia-volver-sucursales" onClick={volver}><Icon name="arrowRight" size={15} /> Volver a sucursales</button>
    <header className="farmacia-ia-sucursal-detalle-cabecera"><div><small>DETALLE Y DISTRIBUCIÓN</small><h2>{detalle.nombre || 'Sucursal de farmacia'}</h2><p>{detalle.items} ítems con existencias registradas</p></div><span><Icon name="home" size={22} /></span></header>
    <div className="farmacia-ia-sucursal-resumen">{tarjetas.map(tarjeta => <article key={tarjeta.titulo}><small>{tarjeta.titulo}</small><strong>{tarjeta.valor.toLocaleString('es-BO')}</strong></article>)}</div>
    {error && <p className="farmacia-ia-admin-error" role="alert">{error}</p>}
    {detalle.almacenes.length === 0 ? <div className="farmacia-ia-sucursal-sin-almacen">Esta sucursal todavía no tiene almacenes activos. Registra un almacén en el inventario contable para configurar estantes y repisas.</div> : <>
      <label className="farmacia-ia-almacen-selector">Almacén<select value={almacenSeleccionado ?? ''} onChange={event => { seleccionarAlmacen(Number(event.target.value)); setItemAsignacion(''); setRepisaAsignacion(''); }}>{detalle.almacenes.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.items} ítems en stock</option>)}</select></label>
      <div className="farmacia-ia-nueva-estructura-acciones"><strong>Agregar a {almacen?.nombre}</strong><button type="button" onClick={() => abrirFormulario(tipoNuevo)}><Icon name="plus" size={15} /> Nueva estructura</button></div>
      <section className="farmacia-ia-asignacion" aria-label="Asignar productos a repisas"><div><small>ORGANIZACIÓN DE PRODUCTOS</small><h3>Asignar productos a repisas</h3><p>Selecciona un producto con existencias y la repisa donde está guardado. Guarda primero cualquier cambio de estructura.</p></div><label>Producto<select value={itemAsignacion} onChange={event => setItemAsignacion(event.target.value)}><option value="">Seleccionar producto…</option>{productos.map(producto => <option key={producto.id} value={producto.id}>{producto.codigo} · {producto.nombre}{producto.marca ? ` (${producto.marca})` : ''} · {producto.cantidad} en stock</option>)}</select></label><label>Estante y repisa<select value={repisaAsignacion} onChange={event => setRepisaAsignacion(event.target.value)}><option value="">Seleccionar ubicación…</option>{repisasDisponibles.map(repisa => <option key={repisa.id} value={repisa.id}>{repisa.etiqueta}</option>)}</select></label><button type="button" disabled={!itemAsignacion || !repisaAsignacion || guardando} onClick={() => asignarItem(Number(itemAsignacion), Number(repisaAsignacion))}><Icon name="check" size={15} /> Asignar ubicación</button>{itemAsignacion && productos.find(producto => producto.id === Number(itemAsignacion))?.ubicacion && <small className="farmacia-ia-asignacion-actual">Ubicación actual: {productos.find(producto => producto.id === Number(itemAsignacion))?.ubicacion}</small>}</section>
      <div className="farmacia-ia-productos-ubicados"><strong>Productos ubicados</strong>{productos.filter(producto => producto.repisaId !== null).length ? productos.filter(producto => producto.repisaId !== null).map(producto => <span key={producto.id}>{producto.codigo} · {producto.nombre}<small>{producto.ubicacion}</small></span>) : <p>Aún no hay productos asignados a una repisa.</p>}</div>
      <div className="farmacia-ia-estructuras-lista">{(almacen?.estructuras ?? []).map((estructura, indice) => <article className="farmacia-ia-estructura" key={estructura.id ?? `nueva-${indice}`}><header><span>{etiquetaTipoEstructura[estructura.tipo]}</span><input aria-label="Nombre de estructura" value={estructura.nombre} onChange={event => cambiarEstructura(indice, { nombre: event.target.value })} /><button type="button" aria-label={`Quitar ${estructura.nombre}`} onClick={() => quitarEstructura(indice)}>×</button></header><div className="farmacia-ia-estructura-repisas"><strong>{estructura.repisas.length} repisas <small>· ordenadas de arriba hacia abajo</small></strong>{estructura.repisas.map((repisa, indiceRepisa) => <label key={`${estructura.id ?? estructura.nombre}-${indiceRepisa}`}><span>Repisa {indiceRepisa + 1}<small>{indiceRepisa === 0 ? 'Superior' : indiceRepisa === estructura.repisas.length - 1 ? 'Inferior' : `Nivel ${indiceRepisa + 1}`}</small></span><input aria-label={`Nombre de repisa ${indiceRepisa + 1}`} value={repisa} onChange={event => cambiarEstructura(indice, { repisas: estructura.repisas.map((nombre, posicion) => posicion === indiceRepisa ? event.target.value : nombre) })} /></label>)}<button type="button" className="farmacia-ia-agregar-repisa" onClick={() => cambiarEstructura(indice, { repisas: [...estructura.repisas, `Repisa ${estructura.repisas.length + 1}`] })}>+ Añadir repisa abajo</button></div></article>)}{!almacen?.estructuras.length && <p className="farmacia-ia-tabla-vacia">Este almacén aún no tiene estantes ni estructuras configuradas.</p>}</div>
      <footer className="farmacia-ia-sucursal-detalle-pie"><span role="status">{mensaje || 'Guarda los cambios de nombre y repisas al terminar.'}</span><button type="button" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar distribución'}</button></footer>
    </>}
    {formularioNuevo && <div className="farmacia-ia-modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setFormularioNuevo(false); }}><section className="farmacia-ia-modal-estructura" role="dialog" aria-modal="true" aria-labelledby="farmacia-ia-modal-titulo"><header><div><small>NUEVA ESTRUCTURA</small><h2 id="farmacia-ia-modal-titulo">Crear espacio de almacenamiento</h2><p>Define el tipo, el nombre y cómo se organizarán sus repisas.</p></div><button type="button" aria-label="Cerrar" onClick={() => setFormularioNuevo(false)}>×</button></header><form className="farmacia-ia-modal-estructura-form" onSubmit={crearEstructura}><label>Tipo de estructura<select value={tipoNuevo} onChange={event => abrirFormulario(event.target.value as TipoEstructuraFarmacia)}><option value="ESTANTE">Estante</option><option value="FRIGOBAR">Frigobar</option><option value="MOSTRADOR">Mostrador</option><option value="OTRO">Otro espacio</option></select></label><label>Nombre<input required maxLength={120} value={nombreNuevo} onChange={event => setNombreNuevo(event.target.value)} /></label><label>Número de repisas<input required type="number" min="0" max="100" step="1" value={cantidadRepisas} onChange={event => setCantidadRepisas(event.target.value)} placeholder="Ej.: 4" /></label><p>Se ordenarán de arriba hacia abajo: la repisa 1 será la superior y la última, la inferior. Usa 0 si el espacio no tiene repisas.</p><footer><button type="button" className="farmacia-ia-cancelar" onClick={() => setFormularioNuevo(false)}>Cancelar</button><button type="submit"><Icon name="check" size={14} /> Crear estructura</button></footer></form></section></div>}
  </section>;
}

export function AsistenteFarmaciaView() {
  const [subvista, setSubvista] = useState<SubvistaFarmaciaIa>('chat');
  const [configuracion, setConfiguracion] = useState<ConfiguracionIa>(() => { const guardada = leerConfiguracion(); return { ...guardada, modelo: guardada.modelo || 'gpt-6-luna' }; });
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([saludo]);
  const [errorChat, setErrorChat] = useState('');
  const [pensando, setPensando] = useState(false);
  const [estadoApi, setEstadoApi] = useState<{ configured: boolean; model: string }>({ configured: false, model: 'gpt-6-luna' });
  const [sucursales, setSucursales] = useState<SucursalFarmacia[]>([]);
  const [cargandoSucursales, setCargandoSucursales] = useState(false);
  const [errorSucursales, setErrorSucursales] = useState('');
  const [detalleSucursal, setDetalleSucursal] = useState<DetalleSucursalFarmacia | null>(null);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState<number | null>(null);
  const [guardandoDistribucion, setGuardandoDistribucion] = useState(false);
  const [mensajeDistribucion, setMensajeDistribucion] = useState('');
  const [inventarios, setInventarios] = useState<InventarioFisico[]>([]);
  const [almacenesInventario, setAlmacenesInventario] = useState<AlmacenInventarioFisico[]>([]);
  const [busquedaInventarios, setBusquedaInventarios] = useState('');
  const [desdeInventarios, setDesdeInventarios] = useState('');
  const [hastaInventarios, setHastaInventarios] = useState('');
  const [cargandoInventarios, setCargandoInventarios] = useState(false);
  const [errorInventarios, setErrorInventarios] = useState('');
  const [nuevoInventarioAbierto, setNuevoInventarioAbierto] = useState(false);
  const [almacenNuevoInventario, setAlmacenNuevoInventario] = useState<number | null>(null);
  const [creandoInventario, setCreandoInventario] = useState(false);
  const [detalleInventario, setDetalleInventario] = useState<DetalleInventarioFisico | null>(null);
  const [guardandoConteo, setGuardandoConteo] = useState<number | null>(null);
  const [finalizandoInventario, setFinalizandoInventario] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState<number | null>(null);
  const [inventarioActivo, setInventarioActivo] = useState<InventarioFisico | null>(null);
  const [cargandoModoInventario, setCargandoModoInventario] = useState(false);
  const peticionInventarios = useRef(0);
  const [escuchando, setEscuchando] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState('');
  const [vozMarcelo, setVozMarcelo] = useState<SpeechSynthesisVoice | null>(null);
  const reconocimiento = useRef<SpeechRecognitionLike | null>(null);
  const consultaPorVoz = useRef(false);
  const finConversacion = useRef<HTMLDivElement>(null);

  useEffect(() => { finConversacion.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensajes]);
  useEffect(() => {
    const abort = new AbortController();
    void apiFetch('/api/farmacia/tomi/estado', { signal: abort.signal }).then(respuesta => respuesta.ok ? respuesta.json() : null).then(datos => { if (datos) setEstadoApi(datos); }).catch(() => undefined);
    return () => abort.abort();
  }, []);
  const cargarSucursales = async (signal?: AbortSignal) => {
    setCargandoSucursales(true); setErrorSucursales('');
    try {
      const respuesta = await apiFetch('/api/farmacia/tomi/sucursales', signal ? { signal } : undefined);
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo consultar la lista de sucursales.');
      setSucursales(datos.data || []);
    } catch (error) {
      if (!signal?.aborted) setErrorSucursales(error instanceof Error ? error.message : 'No se pudo consultar la lista de sucursales.');
    } finally {
      if (!signal?.aborted) setCargandoSucursales(false);
    }
  };
  useEffect(() => {
    if (subvista !== 'admin') return;
    const abort = new AbortController();
    void cargarSucursales(abort.signal);
    return () => abort.abort();
  }, [subvista]);
  const cargarInventarios = async () => {
    const idPeticion = ++peticionInventarios.current;
    setCargandoInventarios(true); setErrorInventarios('');
    try {
      const parametros = new URLSearchParams();
      if (busquedaInventarios.trim()) parametros.set('buscar', busquedaInventarios.trim());
      if (desdeInventarios) parametros.set('desde', desdeInventarios);
      if (hastaInventarios) parametros.set('hasta', hastaInventarios);
      const respuesta = await apiFetch(`/api/farmacia/tomi/inventarios?${parametros.toString()}`);
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudieron cargar los inventarios.');
      if (idPeticion === peticionInventarios.current) { setInventarios(datos.data || []); setAlmacenesInventario(datos.almacenes || []); }
    } catch (error) { if (idPeticion === peticionInventarios.current) setErrorInventarios(error instanceof Error ? error.message : 'No se pudieron cargar los inventarios.'); }
    finally { if (idPeticion === peticionInventarios.current) setCargandoInventarios(false); }
  };
  const cargarInventarioActivo = async () => {
    setCargandoModoInventario(true);
    try {
      const respuesta = await apiFetch('/api/farmacia/tomi/inventario-activo');
      const datos = await respuesta.json().catch(() => ({}));
      if (respuesta.ok) setInventarioActivo(datos.data || null);
    } catch { /* El chat puede seguir disponible aunque el estado no cargue. */ }
    finally { setCargandoModoInventario(false); }
  };
  useEffect(() => {
    if (subvista !== 'inventario') return;
    const temporizador = window.setTimeout(() => { void cargarInventarios(); }, busquedaInventarios ? 300 : 0);
    return () => window.clearTimeout(temporizador);
  }, [subvista, busquedaInventarios, desdeInventarios, hastaInventarios]);
  useEffect(() => { if (subvista === 'chat') void cargarInventarioActivo(); }, [subvista]);
  useEffect(() => () => reconocimiento.current?.stop(), []);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const cargar = () => {
      const voces = window.speechSynthesis.getVoices();
      setVozMarcelo(voces.find(voz => /marcelo/i.test(voz.name) && voz.lang.toLowerCase() === 'es-bo') || voces.find(voz => /marcelo/i.test(voz.name) && voz.lang.toLowerCase().startsWith('es')) || null);
    };
    cargar();
    window.speechSynthesis.addEventListener('voiceschanged', cargar);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', cargar);
  }, []);

  const enviarMensaje = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const texto = mensaje.trim();
    if (!texto || pensando) return;
    const ahora = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const mensajeUsuario: MensajeChat = { id: Date.now(), rol: 'user', texto, hora: ahora };
    const conversacion = [...mensajes, mensajeUsuario];
    setMensajes(conversacion); setMensaje(''); setAvisoVoz(''); setErrorChat(''); setPensando(true);
    try {
      const respuesta = await apiFetch('/api/farmacia/tomi/chat', { method: 'POST', body: JSON.stringify({ messages: conversacion.slice(-16).map(item => ({ role: item.rol, content: item.texto })), model: configuracion.modelo, style: configuracion.instrucciones }) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo conectar con TOMI.');
      const inventarioDescargaId = Number(datos.inventarioFinalizadoId) || undefined;
      setMensajes(actuales => [...actuales, { id: Date.now() + 1, rol: 'assistant', texto: datos.message, hora: new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(new Date()), inventarioDescargaId }]);
      void cargarInventarioActivo();
      if (inventarioDescargaId) void descargarExcel(inventarioDescargaId);
      if (consultaPorVoz.current) { consultaPorVoz.current = false; void escucharRespuesta(datos.message); }
    } catch (error) {
      const detalle = error instanceof Error ? error.message : '';
      const mensajeTecnico = /Cannot redeclare class|Fatal error|Stack trace|\.php:\d+/i.test(detalle);
      setErrorChat(mensajeTecnico ? 'No se pudo completar la respuesta. Actualiza la página e inténtalo otra vez.' : detalle || 'No se pudo conectar con TOMI.');
    } finally { setPensando(false); }
  };

  const alternarVoz = () => {
    if (escuchando) { reconocimiento.current?.stop(); setEscuchando(false); return; }
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) { setAvisoVoz('El dictado por voz no está disponible en este navegador. Prueba con Edge o Chrome.'); return; }
    const instancia = new SpeechRecognition();
    instancia.lang = 'es-BO'; instancia.interimResults = true;
    instancia.onresult = event => { const resultado = event.results[event.results.length - 1]; if (resultado?.[0]) { consultaPorVoz.current = true; setMensaje(resultado[0].transcript); } };
    instancia.onerror = () => { setEscuchando(false); setAvisoVoz('No se pudo acceder al micrófono. Revisa el permiso del navegador.'); };
    instancia.onend = () => setEscuchando(false);
    reconocimiento.current = instancia; setAvisoVoz(''); setEscuchando(true);
    try { instancia.start(); } catch { setEscuchando(false); setAvisoVoz('No se pudo iniciar el micrófono. Inténtalo de nuevo.'); }
  };

  const escucharRespuesta = (texto: string) => {
    if (!('speechSynthesis' in window)) { setAvisoVoz('La lectura en voz alta no está disponible en este navegador.'); return; }
    if (!vozMarcelo) { setAvisoVoz('No se encontró Microsoft Marcelo Online (Natural) en español de Bolivia en este navegador.'); return; }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.voice = vozMarcelo; voz.lang = 'es-BO'; voz.rate = 1.02; voz.pitch = 1;
    window.speechSynthesis.speak(voz);
  };

  const probarVoz = () => escucharRespuesta('¡Hola! Soy TOMI, tu asistente de farmacia. Cuéntame qué producto buscas y con gusto te ayudo a revisar la información disponible.');

  const verSucursal = async (sucursal: SucursalFarmacia) => {
    setMensajeDistribucion(''); setErrorSucursales(''); setDetalleSucursal(null);
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/sucursales/${sucursal.id}`);
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo cargar esta sucursal.');
      setDetalleSucursal(datos.data);
      setAlmacenSeleccionado(datos.data.almacenes[0]?.id ?? null);
    } catch (error) { setErrorSucursales(error instanceof Error ? error.message : 'No se pudo cargar esta sucursal.'); }
  };
  const cambiarEstructura = (indice: number, cambios: Partial<EstructuraFarmacia>) => {
    setDetalleSucursal(actual => actual ? { ...actual, almacenes: actual.almacenes.map(almacen => almacen.id !== almacenSeleccionado ? almacen : { ...almacen, estructuras: almacen.estructuras.map((estructura, posicion) => posicion === indice ? { ...estructura, ...cambios } : estructura) }) } : actual);
  };
  const agregarEstructura = (estructura: EstructuraFarmacia) => {
    setDetalleSucursal(actual => actual ? { ...actual, almacenes: actual.almacenes.map(almacen => almacen.id !== almacenSeleccionado ? almacen : { ...almacen, estructuras: [...almacen.estructuras, estructura] }) } : actual);
  };
  const quitarEstructura = (indice: number) => {
    setDetalleSucursal(actual => actual ? { ...actual, almacenes: actual.almacenes.map(almacen => almacen.id !== almacenSeleccionado ? almacen : { ...almacen, estructuras: almacen.estructuras.filter((_, posicion) => posicion !== indice) }) } : actual);
  };
  const guardarDistribucion = async () => {
    if (!detalleSucursal || almacenSeleccionado === null) return;
    const almacen = detalleSucursal.almacenes.find(item => item.id === almacenSeleccionado);
    if (!almacen) return;
    setGuardandoDistribucion(true); setMensajeDistribucion(''); setErrorSucursales('');
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/sucursales/${detalleSucursal.sucursalId}`, { method: 'PUT', body: JSON.stringify({ almacen_id: almacen.id, estructuras: almacen.estructuras.map(estructura => ({ ...estructura, nombre: estructura.nombre.trim(), repisas: estructura.repisas.map(repisa => repisa.trim()).filter(Boolean) })) }) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo guardar la distribución.');
      setDetalleSucursal(datos.data); setMensajeDistribucion('Distribución de sucursal guardada.');
      await cargarSucursales();
    } catch (error) { setErrorSucursales(error instanceof Error ? error.message : 'No se pudo guardar la distribución.'); }
    finally { setGuardandoDistribucion(false); }
  };
  const asignarItemRepisa = async (itemId: number, repisaId: number) => {
    if (!detalleSucursal || almacenSeleccionado === null) return;
    setErrorSucursales(''); setMensajeDistribucion('');
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/sucursales/${detalleSucursal.sucursalId}/ubicaciones`, { method: 'POST', body: JSON.stringify({ almacen_id: almacenSeleccionado, item_id: itemId, repisa_id: repisaId }) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo guardar la ubicación.');
      const actual = await apiFetch(`/api/farmacia/tomi/sucursales/${detalleSucursal.sucursalId}`);
      const detalleActualizado = await actual.json().catch(() => ({}));
      if (!actual.ok) throw new Error(detalleActualizado.message || 'Se guardó, pero no pude actualizar la lista.');
      setDetalleSucursal(detalleActualizado.data); setMensajeDistribucion('Ubicación del producto guardada.');
    } catch (error) { setErrorSucursales(error instanceof Error ? error.message : 'No se pudo guardar la ubicación.'); }
  };
  const crearInventario = async () => {
    if (almacenNuevoInventario === null) return;
    setCreandoInventario(true); setErrorInventarios('');
    try {
      const respuesta = await apiFetch('/api/farmacia/tomi/inventarios', { method: 'POST', body: JSON.stringify({ almacen_id: almacenNuevoInventario }) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo iniciar el inventario.');
      setDetalleInventario(datos.data); setNuevoInventarioAbierto(false); await cargarInventarios();
    } catch (error) { setErrorInventarios(error instanceof Error ? error.message : 'No se pudo iniciar el inventario.'); }
    finally { setCreandoInventario(false); }
  };
  const inspeccionarInventario = async (inventario: InventarioFisico) => {
    setErrorInventarios('');
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/inventarios/${inventario.id}`);
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo abrir el inventario.');
      setDetalleInventario(datos.data);
    } catch (error) { setErrorInventarios(error instanceof Error ? error.message : 'No se pudo abrir el inventario.'); }
  };
  const guardarConteo = async (detalleId: number, cantidad: number) => {
    if (!detalleInventario || !Number.isFinite(cantidad) || cantidad < 0) return;
    setGuardandoConteo(detalleId);
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/inventarios/${detalleInventario.id}/detalles/${detalleId}`, { method: 'PATCH', body: JSON.stringify({ cantidad }) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo guardar el conteo.');
      setDetalleInventario(datos.data); await cargarInventarios();
    } catch (error) { setErrorInventarios(error instanceof Error ? error.message : 'No se pudo guardar el conteo.'); }
    finally { setGuardandoConteo(null); }
  };
  const finalizarInventario = async () => {
    if (!detalleInventario) return;
    setFinalizandoInventario(true);
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/inventarios/${detalleInventario.id}/finalizar`, { method: 'POST' });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo finalizar el inventario.');
      setDetalleInventario(datos.data); await cargarInventarios();
    } catch (error) { setErrorInventarios(error instanceof Error ? error.message : 'No se pudo finalizar el inventario.'); }
    finally { setFinalizandoInventario(false); }
  };
  const descargarExcel = async (inventarioId: number) => {
    setDescargandoExcel(inventarioId); setErrorInventarios('');
    try {
      const respuesta = await apiFetch(`/api/farmacia/tomi/inventarios/${inventarioId}/excel`);
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(datos.message || 'No se pudo descargar el Excel.');
      }
      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url; enlace.download = `inventario-${inventarioId}.xlsx`; enlace.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setErrorInventarios(error instanceof Error ? error.message : 'No se pudo descargar el Excel.'); }
    finally { setDescargandoExcel(null); }
  };
  const sugerencias = ['Buscar un medicamento', 'Consultar disponibilidad', 'Revisar productos próximos a vencer'];

  return <section className="farmacia-ia" aria-label="Asistente TOMI de farmacia">
    <nav className="farmacia-ia-subvistas" role="tablist" aria-label="Secciones de TOMI">
      <button type="button" role="tab" aria-selected={subvista === 'chat'} className={subvista === 'chat' ? 'activo' : ''} onClick={() => setSubvista('chat')}><Icon name="sparkles" size={16} /> Conversación</button>
      <button type="button" role="tab" aria-selected={subvista === 'inventario'} className={subvista === 'inventario' ? 'activo' : ''} onClick={() => setSubvista('inventario')}><Icon name="package" size={16} /> Inventario</button>
      <button type="button" role="tab" aria-selected={subvista === 'admin'} className={subvista === 'admin' ? 'activo' : ''} onClick={() => setSubvista('admin')}><Icon name="settings" size={16} /> Administración</button>
    </nav>

    {subvista === 'chat' ? <section className="farmacia-ia-chat" role="tabpanel" aria-label="Conversación con TOMI">
      <aside className="farmacia-ia-lateral farmacia-ia-panel-modo"><div className="farmacia-ia-tomi-avatar"><Icon name="sparkles" size={25} /></div><h2>TOMI</h2><p>Asistente de farmacia</p><span className={`farmacia-ia-presencia ${estadoApi.configured ? '' : 'pendiente'}`}><i /> {estadoApi.configured ? 'IA configurada' : 'Servicio sin conexión'}</span><div className="farmacia-ia-lateral-separador" /><section className={`farmacia-ia-estado-modo ${inventarioActivo ? 'activo' : ''}`} aria-live="polite"><div className="farmacia-ia-estado-modo-titulo"><Icon name="package" size={17} /><h3>MODO INVENTARIO</h3></div>{cargandoModoInventario ? <p>Consultando estado…</p> : inventarioActivo ? <><strong className="farmacia-ia-modo-chip"><i />{inventarioActivo.estado === 'ESPERANDO_ALMACEN' ? 'Esperando sucursal' : 'Inventario en curso'}</strong>{inventarioActivo.sucursal && <p className="farmacia-ia-modo-ubicacion">{inventarioActivo.sucursal}<small>{inventarioActivo.almacen}</small></p>}<div className="farmacia-ia-modo-progreso"><span>Progreso</span><strong>{inventarioActivo.itemsContados} / {inventarioActivo.itemsTotal}</strong></div><div className="farmacia-ia-modo-barra"><i style={{ width: `${inventarioActivo.itemsTotal ? Math.min(100, inventarioActivo.itemsContados / inventarioActivo.itemsTotal * 100) : 0}%` }} /></div><small className="farmacia-ia-modo-ayuda">Di el código y la cantidad contada. Para cerrar, di “termina el modo inventario”.</small></> : <><strong className="farmacia-ia-modo-chip inactivo"><i />Sin inventario activo</strong><p className="farmacia-ia-modo-ayuda">Di <b>“modo inventario”</b> para empezar. TOMI te preguntará en qué sucursal y almacén harás el conteo.</p></>}</section><div className="farmacia-ia-panel-nota"><Icon name="check" size={14} /> El estado del inventario se conserva. Las conversaciones no se guardan.</div></aside>
      <div className="farmacia-ia-sala">
        <div className="farmacia-ia-sala-cabecera"><div><span className={`farmacia-ia-online ${estadoApi.configured ? '' : 'pendiente'}`} /><strong>Chat con TOMI</strong><small>{estadoApi.configured ? estadoApi.model + ' · Clave configurada' : 'API pendiente de configurar'}</small></div><button className="farmacia-ia-probar-voz" type="button" onClick={probarVoz}><Icon name="volume" size={15} /> Escuchar ejemplo</button></div>
        <div className="farmacia-ia-conversacion" aria-live="polite">
          <div className="farmacia-ia-mensajes">{mensajes.map(item => <article key={item.id} className={`farmacia-ia-mensaje ${item.rol}`}>
            {item.rol === 'assistant' && <span className="farmacia-ia-avatar"><Icon name="sparkles" size={15} /></span>}
            <div className="farmacia-ia-emisor">{item.rol === 'assistant' ? 'TOMI' : 'Tú'}<div className="farmacia-ia-burbuja"><p>{item.texto}</p>{item.inventarioDescargaId && <button type="button" className="farmacia-ia-descarga-chat" onClick={() => void descargarExcel(item.inventarioDescargaId!)}><Icon name="download" size={14} /> Descargar Excel final</button>}<div className="farmacia-ia-burbuja-pie"><time>{item.hora}</time>{item.rol === 'assistant' && <button type="button" onClick={() => escucharRespuesta(item.texto)} aria-label="Escuchar respuesta de TOMI" title="Escuchar en voz alta"><Icon name="volume" size={14} /></button>}</div></div></div>
          </article>)}{pensando && <div className="farmacia-ia-pensando" role="status"><span /> TOMI está preparando una respuesta…</div>}<div ref={finConversacion} /></div>
          {mensajes.length === 1 && <div className="farmacia-ia-sugerencias"><span>¿Por dónde empezamos?</span><div>{sugerencias.map(texto => <button key={texto} type="button" onClick={() => setMensaje(texto)}>{texto}<Icon name="arrowRight" size={13} /></button>)}</div></div>}
        </div>
        <form className="farmacia-ia-compositor" onSubmit={enviarMensaje}>
          <label className="visually-hidden" htmlFor="farmacia-ia-mensaje">Escribe una consulta</label>
          <textarea id="farmacia-ia-mensaje" rows={1} value={mensaje} onChange={event => { consultaPorVoz.current = false; setMensaje(event.target.value); }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Escribe tu consulta o usa el micrófono…" />
          <button type="button" className={`farmacia-ia-microfono ${escuchando ? 'escuchando' : ''}`} onClick={alternarVoz} aria-label={escuchando ? 'Detener dictado' : 'Dictar consulta por voz'} title={escuchando ? 'Detener dictado' : 'Dictar por voz'}><Icon name={escuchando ? 'check' : 'mic'} size={18} /></button>
          <button type="submit" className="farmacia-ia-enviar" aria-label="Enviar mensaje" disabled={!mensaje.trim() || pensando}><Icon name="arrowRight" size={18} /></button>
          <small className={errorChat ? 'farmacia-ia-error' : ''}>{errorChat || avisoVoz || (escuchando ? 'Escuchando… habla con claridad y pulsa el micrófono para detener.' : 'Dictado por voz · Verifica la información con el personal farmacéutico. No es un sistema de prescripción.')}</small>
        </form>
      </div>
    </section> : subvista === 'inventario' ? <section className="farmacia-ia-admin farmacia-ia-inventario" role="tabpanel" aria-label="Inventarios de farmacia">
      <header className="farmacia-ia-inventario-encabezado"><div><small>CONTROL DE EXISTENCIAS</small><h2>Inventario físico</h2><p>Registra conteos por almacén y compara las cantidades físicas con el stock esperado.</p></div><button type="button" onClick={() => { setErrorInventarios(''); setAlmacenNuevoInventario(almacenesInventario[0]?.id ?? null); setNuevoInventarioAbierto(true); }} disabled={!almacenesInventario.length}><Icon name="plus" size={16} /> Nuevo inventario</button></header>
      {errorInventarios && <p className="farmacia-ia-admin-error" role="alert">{errorInventarios}</p>}
      <section className="farmacia-ia-inventario-filtros" aria-label="Filtros de inventarios"><label>Buscar<input type="search" value={busquedaInventarios} onChange={event => setBusquedaInventarios(event.target.value)} placeholder="Sucursal, almacén o estado" /></label><label>Desde<input type="date" max={hastaInventarios || undefined} value={desdeInventarios} onChange={event => setDesdeInventarios(event.target.value)} /></label><label>Hasta<input type="date" min={desdeInventarios || undefined} value={hastaInventarios} onChange={event => setHastaInventarios(event.target.value)} /></label></section>
      <div className="farmacia-ia-inventarios-tabla"><div className="farmacia-ia-inventarios-resultado" aria-live="polite">{cargandoInventarios ? 'Actualizando resultados…' : `${inventarios.length} ${inventarios.length === 1 ? 'inventario encontrado' : 'inventarios encontrados'}`}</div><table><thead><tr><th>Sucursal / almacén</th><th>Fecha de inicio</th><th>Fecha de finalización</th><th>Esperada</th><th>Contada</th><th>Faltantes</th><th>Sobrantes</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{inventarios.map(inventario => <tr key={inventario.id}><td><strong>{inventario.sucursal}</strong><small>{inventario.almacen}</small></td><td>{formatoFecha(inventario.inicio)}</td><td>{formatoFecha(inventario.finalizado)}</td><td>{formatoCantidad(inventario.cantidadEsperada)}</td><td>{formatoCantidad(inventario.cantidadContada)}<small>{inventario.itemsContados}/{inventario.itemsTotal} ítems contados</small></td><td className={inventario.faltantes ? 'farmacia-ia-valor-faltante' : ''}>{formatoCantidad(inventario.faltantes)}</td><td className={inventario.sobrantes ? 'farmacia-ia-valor-sobrante' : ''}>{formatoCantidad(inventario.sobrantes)}</td><td><span className={`farmacia-ia-estado-inventario ${claseEstadoInventario(inventario.estado)}`}>{etiquetaEstadoInventario(inventario.estado)}</span></td><td><div className="farmacia-ia-acciones-inventario"><button type="button" className="farmacia-ia-inspeccionar" onClick={() => void inspeccionarInventario(inventario)}>Inspeccionar</button><button type="button" className="farmacia-ia-descargar" disabled={inventario.estado === 'ESPERANDO_ALMACEN' || inventario.estado === 'CANCELADO' || descargandoExcel === inventario.id} onClick={() => void descargarExcel(inventario.id)}>{descargandoExcel === inventario.id ? 'Preparando…' : 'Excel'}</button></div></td></tr>)}</tbody></table>{!cargandoInventarios && !inventarios.length && <p className="farmacia-ia-tabla-vacia">{busquedaInventarios || desdeInventarios || hastaInventarios ? 'No hay inventarios que coincidan con la búsqueda y el rango de fechas.' : 'Aún no hay inventarios. Inicia uno con el botón “Nuevo inventario”.'}</p>}</div>
      {nuevoInventarioAbierto && <div className="farmacia-ia-modal-fondo" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setNuevoInventarioAbierto(false); }}><section className="farmacia-ia-modal farmacia-ia-inventario-modal" role="dialog" aria-modal="true" aria-labelledby="farmacia-ia-nuevo-titulo"><header><div><small>NUEVO REGISTRO</small><h2 id="farmacia-ia-nuevo-titulo">Iniciar inventario</h2><p>Se guardara una captura del stock esperado actual para comparar el conteo fisico.</p></div><button type="button" aria-label="Cerrar" onClick={() => setNuevoInventarioAbierto(false)}>×</button></header><div className="farmacia-ia-modal-contenido"><label className="farmacia-ia-almacen-selector">Sucursal y almacen<select value={almacenNuevoInventario ?? ""} onChange={event => setAlmacenNuevoInventario(Number(event.target.value))}>{almacenesInventario.map(almacen => <option key={almacen.id} value={almacen.id}>{almacen.sucursal} · {almacen.nombre}</option>)}</select></label>{!almacenesInventario.length && <p>No hay almacenes disponibles para iniciar un inventario.</p>}</div><footer><span /> <button type="button" className="farmacia-ia-cancelar" onClick={() => setNuevoInventarioAbierto(false)}>Cancelar</button><button type="button" disabled={creandoInventario || almacenNuevoInventario === null} onClick={() => void crearInventario()}><Icon name="plus" size={15} /> {creandoInventario ? "Iniciando..." : "Iniciar inventario"}</button></footer></section></div>}
      {detalleInventario && <div className="farmacia-ia-modal-fondo" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetalleInventario(null); }}><section className="farmacia-ia-modal farmacia-ia-detalle-inventario-modal" role="dialog" aria-modal="true" aria-labelledby="farmacia-ia-detalle-titulo"><header><div><div className="farmacia-ia-detalle-estado-linea"><small>ESTADO DEL INVENTARIO</small><span className={`farmacia-ia-detalle-estado ${claseEstadoInventario(detalleInventario.estado)}`}><i />{etiquetaEstadoInventario(detalleInventario.estado)}</span></div><h2 id="farmacia-ia-detalle-titulo">{detalleInventario.sucursal} · {detalleInventario.almacen}</h2><p>Inicio {formatoFecha(detalleInventario.inicio)} · {detalleInventario.itemsContados} de {detalleInventario.itemsTotal} ítems contados</p></div><button type="button" aria-label="Cerrar" onClick={() => setDetalleInventario(null)}>×</button></header><div className="farmacia-ia-inventario-metricas"><span>Esperada <strong>{formatoCantidad(detalleInventario.cantidadEsperada)}</strong></span><span>Contada <strong>{formatoCantidad(detalleInventario.cantidadContada)}</strong></span><span>Faltantes <strong>{formatoCantidad(detalleInventario.faltantes)}</strong></span><span>Sobrantes <strong>{formatoCantidad(detalleInventario.sobrantes)}</strong></span></div><div className="farmacia-ia-inventario-items"><table><thead><tr><th>Código</th><th>Producto</th><th>Marca</th><th>Presentación</th><th>Esperada</th><th>Conteo físico</th><th>Diferencia</th></tr></thead><tbody>{detalleInventario.items.map(item => <tr key={item.id}><td>{item.codigo}</td><td><strong>{item.generico}</strong><small>{item.nombre}</small></td><td>{item.marca}</td><td>{item.presentacion}</td><td>{formatoCantidad(item.esperada)}</td><td>{detalleInventario.estado === 'EN_CURSO' ? <input type="number" min="0" step="0.001" aria-label={`Conteo de ${item.codigo}`} defaultValue={item.contada ?? ''} disabled={guardandoConteo === item.id} onBlur={event => { if (event.currentTarget.value !== '' && Number(event.currentTarget.value) !== item.contada) void guardarConteo(item.id, Number(event.currentTarget.value)); }} /> : formatoCantidad(item.contada ?? 0)}</td><td>{item.contada === null ? 'Pendiente' : formatoCantidad(item.contada - item.esperada)}</td></tr>)}</tbody></table>{!detalleInventario.items.length && <p className="farmacia-ia-tabla-vacia">Este almacén no tenía stock esperado al iniciar el inventario.</p>}</div><footer><span role="status">{errorInventarios || (detalleInventario.estado === 'EN_CURSO' ? 'El conteo se guarda al salir de cada campo.' : `Finalizado ${formatoFecha(detalleInventario.finalizado)}`)}</span><button type="button" className="farmacia-ia-cancelar" disabled={detalleInventario.estado === 'ESPERANDO_ALMACEN' || detalleInventario.estado === 'CANCELADO' || descargandoExcel === detalleInventario.id} onClick={() => void descargarExcel(detalleInventario.id)}>{descargandoExcel === detalleInventario.id ? 'Preparando Excel…' : 'Descargar Excel'}</button>{detalleInventario.estado === 'EN_CURSO' && <button type="button" disabled={finalizandoInventario || detalleInventario.itemsContados !== detalleInventario.itemsTotal} onClick={() => void finalizarInventario()}><Icon name="check" size={15} /> {finalizandoInventario ? 'Finalizando…' : 'Finalizar inventario'}</button>}</footer></section></div>}
    </section> : <section className="farmacia-ia-admin farmacia-ia-sucursales" role="tabpanel" aria-label="Sucursales de farmacia">
      {!detalleSucursal && <>
      <header className="farmacia-ia-admin-intro farmacia-ia-sucursales-encabezado"><span><Icon name="home" size={20} /></span><div><small>INVENTARIO · ORGANIZACIÓN</small><h2>Sucursales de farmacia</h2><p>Existencias y estantes registrados por sucursal.</p></div><button type="button" className="farmacia-ia-actualizar-sucursales" onClick={() => void cargarSucursales()} disabled={cargandoSucursales}><Icon name="refresh" size={15} />{cargandoSucursales ? "Actualizando…" : "Actualizar lista"}</button></header>
      {errorSucursales && <p className="farmacia-ia-admin-error" role="alert">{errorSucursales}</p>}
      {cargandoSucursales ? <p className="farmacia-ia-admin-vacio" role="status">Cargando sucursales…</p> : sucursales.length === 0 ? <div className="farmacia-ia-admin-vacio farmacia-ia-sin-sucursales"><span><Icon name="home" size={23} /></span><h3>No hay sucursales registradas</h3><p>Esta lista lee la base contable conectada. Registra allí una sucursal para que aparezca aquí.</p></div> : <div className="farmacia-ia-sucursal-lista">{sucursales.map(sucursal => <article className="farmacia-ia-sucursal" key={sucursal.id}>
        <div className="farmacia-ia-sucursal-identidad"><h3>{sucursal.nombre}</h3></div>
        <div className="farmacia-ia-sucursal-metricas"><span><strong>{sucursal.estantes}</strong> estantes</span><span><strong>{sucursal.items}</strong> ítems en stock</span></div>
        <button type="button" onClick={() => void verSucursal(sucursal)}>VER <Icon name="arrowRight" size={15} /></button>
      </article>)}</div>}
      </>}
      {detalleSucursal && <VistaDetalleSucursal detalle={detalleSucursal} almacenSeleccionado={almacenSeleccionado} guardando={guardandoDistribucion} mensaje={mensajeDistribucion} error={errorSucursales} volver={() => { setDetalleSucursal(null); setMensajeDistribucion(""); setErrorSucursales(""); }} seleccionarAlmacen={setAlmacenSeleccionado} cambiarEstructura={cambiarEstructura} agregarEstructura={agregarEstructura} quitarEstructura={quitarEstructura} asignarItem={(itemId, repisaId) => void asignarItemRepisa(itemId, repisaId)} guardar={() => void guardarDistribucion()} />}
    </section>}
  </section>;
}
