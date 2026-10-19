import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import '../recepcion/RecepcionView.css';
import '../cocina/CocinaVentasView.css';
import { leerCronograma, type CirugiaProgramada } from './cronogramaQuirofano';
import {
  ETIQUETAS_ESTADO, SIGUIENTES_ESTADOS, guardarEsterilizacion, leerEsterilizacion,
  type EstadoEsterilizacion, type EstadoMaterial, type KitEsteril, type MaterialEsteril, type RecepcionMaterialSucio,
} from './almacenEsterilizacion';
import './EsterilizacionView.css';
import './KitsEsterilizacion.css';

const MATERIAL_VACIO = { codigo: '', nombre: '', tipo: '', marca: '', serie: '', sector: '', descripcion: '' };
const KIT_VACIO = { nombre: '', descripcion: '' };
const ESPECIALIDADES = ['Cirugía general', 'Ginecología y obstetricia', 'Traumatología', 'Urología', 'Pediatría', 'Otras'];
const estadoKit = (kit: KitEsteril, materiales: MaterialEsteril[]) => {
  const piezas = kit.materialIds.map(id => materiales.find(item => item.id === id));
  if (!piezas.length || piezas.some(item => !item)) return 'incompleto';
  if (piezas.some(item => item?.estado === 'cirugia' || item?.estado === 'reservado')) return 'ocupado';
  if (piezas.some(item => item?.estado === 'sucio' || item?.estado === 'pendiente')) return 'sucio';
  return piezas.every(item => item?.estado === 'limpio') ? 'disponible' : 'proceso';
};
const ETIQUETAS_KIT: Record<string, string> = { disponible: 'Disponible', ocupado: 'Ocupado', sucio: 'Sucio / pendiente', proceso: 'En proceso', incompleto: 'Incompleto' };
const etiquetaCirugia = (cirugia: CirugiaProgramada) => `${cirugia.fecha} ${cirugia.hora} · ${cirugia.quirofano} · ${cirugia.paciente}`;
const fechaDemo = (diasDesdeHoy: number) => {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() + diasDesdeHoy);
  return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-');
};
const CIRUGIAS_DEMO: CirugiaProgramada[] = [
  { id: 'demo-cirugia-cesarea', cuenta: 'DEMO-QX-001', paciente: 'Paciente de demostración A', ci: 'DEMO-001', medico: 'Dra. María Salazar', tipo: 'Cesárea', quirofano: 'Quirófano 1', fecha: fechaDemo(1), hora: '08:00' },
  { id: 'demo-cirugia-general', cuenta: 'DEMO-QX-002', paciente: 'Paciente de demostración B', ci: 'DEMO-002', medico: 'Dr. Pablo Rojas', tipo: 'Colecistectomía', quirofano: 'Quirófano 2', fecha: fechaDemo(2), hora: '10:30' },
  { id: 'demo-cirugia-actual', cuenta: 'DEMO-QX-003', paciente: 'Paciente de demostración C', ci: 'DEMO-003', medico: 'Dr. Ever Luizaga', tipo: 'Hernioplastia', quirofano: 'Quirófano 1', fecha: fechaDemo(0), hora: '11:00' },
];
const leerCirugiasEsterilizacion = () => {
  const programadas = leerCronograma();
  return programadas.length ? programadas : CIRUGIAS_DEMO;
};

export function EsterilizacionView() {
  const [subvista, setSubvista] = useState<'sala' | 'entrega' | 'seguimiento' | 'inventario' | 'kits'>('sala');
  const [datos, setDatos] = useState<EstadoEsterilizacion>(leerEsterilizacion);
  const [cirugias, setCirugias] = useState(leerCirugiasEsterilizacion);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSector, setFiltroSector] = useState('');
  const [modal, setModal] = useState<'material' | 'kit' | 'agregar' | 'estado' | 'recepcion' | 'etiqueta' | null>(null);
  const [formMaterial, setFormMaterial] = useState(MATERIAL_VACIO);
  const [formKit, setFormKit] = useState(KIT_VACIO);
  const [materialesKit, setMaterialesKit] = useState<string[]>([]);
  const [especialidadesKit, setEspecialidadesKit] = useState<string[]>([]);
  const [busquedaAsociar, setBusquedaAsociar] = useState('');
  const [busquedaKit, setBusquedaKit] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroKitEstado, setFiltroKitEstado] = useState('');
  const [kitAbierto, setKitAbierto] = useState<string | null>(null);
  const [materialAbierto, setMaterialAbierto] = useState<string | null>(null);
  const [destino, setDestino] = useState<EstadoMaterial | ''>('');
  const [cirugiaId, setCirugiaId] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [entregadoPor, setEntregadoPor] = useState('');
  const [usoMaterial, setUsoMaterial] = useState('');
  const [materialesRecibidos, setMaterialesRecibidos] = useState<string[]>([]);
  const [busquedaRecepcion, setBusquedaRecepcion] = useState('');
  const [materialEtiqueta, setMaterialEtiqueta] = useState<MaterialEsteril | null>(null);

  useEffect(() => {
    const actualizar = () => { setDatos(leerEsterilizacion()); setCirugias(leerCirugiasEsterilizacion()); };
    window.addEventListener('storage', actualizar);
    return () => window.removeEventListener('storage', actualizar);
  }, []);

  const guardar = (nuevos: EstadoEsterilizacion, mensaje: string) => {
    try { guardarEsterilizacion(nuevos); setDatos(nuevos); setAviso(mensaje); setError(''); setModal(null); return true; }
    catch { setError('No se pudo guardar. Revisa que el almacenamiento de este navegador esté disponible.'); return false; }
  };
  const tipos = [...new Set(datos.materiales.map(item => item.tipo))].sort();
  const sectores = [...new Set(datos.materiales.map(item => item.sector))].sort();
  const materialesVisibles = useMemo(() => datos.materiales.filter(item => {
    const texto = `${item.codigo} ${item.nombre} ${item.tipo} ${item.marca} ${item.serie}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (!filtroEstado || item.estado === filtroEstado) && (!filtroTipo || item.tipo === filtroTipo) && (!filtroSector || item.sector === filtroSector);
  }).sort((a, b) => a.nombre.localeCompare(b.nombre)), [datos.materiales, busqueda, filtroEstado, filtroTipo, filtroSector]);
  const especialidades = [...new Set([...ESPECIALIDADES, ...datos.kits.flatMap(item => item.especialidades || [])])];
  const kitsVisibles = datos.kits.filter(item => `${item.nombre} ${item.descripcion} ${(item.especialidades || []).join(' ')}`.toLowerCase().includes(busquedaKit.toLowerCase()) && (!filtroEspecialidad || (item.especialidades || []).includes(filtroEspecialidad)) && (!filtroKitEstado || estadoKit(item, datos.materiales) === filtroKitEstado));
  const kitSeleccionado = datos.kits.find(item => item.id === kitAbierto);
  const materialSeleccionado = datos.materiales.find(item => item.id === materialAbierto);
  const movimientos = datos.movimientos.filter(item => item.materialId === materialAbierto).slice().reverse();
  const cirugiasOrdenadas = [...cirugias].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  const cirugiasConMaterial = cirugiasOrdenadas.filter(cirugia => datos.materiales.some(item => item.cirugiaId === cirugia.id) || datos.movimientos.some(movimiento => movimiento.cirugiaId === cirugia.id));
  const recepcionesOrdenadas = [...datos.recepciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const materialesEntregables = datos.materiales.filter(item => ['limpio', 'reservado', 'cirugia'].includes(item.estado));
  const materialesFiltradosRecepcion = materialesEntregables.filter(item => `${item.codigo} ${item.nombre} ${item.serie}`.toLowerCase().includes(busquedaRecepcion.toLowerCase()));

  const crearMaterial = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const codigo = formMaterial.codigo.trim();
    if (datos.materiales.some(item => item.codigo.toLowerCase() === codigo.toLowerCase())) { setError('Ya existe un material con ese código.'); return; }
    const fecha = new Date().toISOString();
    const material: MaterialEsteril = { ...formMaterial, codigo, nombre: formMaterial.nombre.trim(), tipo: formMaterial.tipo.trim(), sector: formMaterial.sector.trim(), id: crypto.randomUUID(), estado: 'pendiente', cirugiaId: '', actualizadoEn: fecha };
    if (guardar({ ...datos, materiales: [...datos.materiales, material], movimientos: [...datos.movimientos, { id: crypto.randomUUID(), materialId: material.id, desde: 'registro', hacia: 'pendiente', cirugiaId: '', fecha }] }, `Material ${material.codigo} registrado. Está pendiente de esterilización.`)) { setFormMaterial(MATERIAL_VACIO); setMaterialEtiqueta(material); setModal('etiqueta'); }
  };

  const crearKit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!especialidadesKit.length) { setError('Selecciona al menos una especialidad para el kit.'); return; }
    if (!materialesKit.length) { setError('Selecciona al menos un material para el kit.'); return; }
    if (datos.kits.some(item => item.nombre.toLowerCase() === formKit.nombre.trim().toLowerCase())) { setError('Ya existe un kit con ese nombre.'); return; }
    const kit: KitEsteril = { id: crypto.randomUUID(), nombre: formKit.nombre.trim(), descripcion: formKit.descripcion.trim(), especialidades: especialidadesKit, materialIds: materialesKit };
    if (guardar({ ...datos, kits: [...datos.kits, kit] }, `Kit ${kit.nombre} creado con ${kit.materialIds.length} materiales.`)) { setFormKit(KIT_VACIO); setMaterialesKit([]); setEspecialidadesKit([]); setKitAbierto(kit.id); }
  };

  const agregarMateriales = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!kitSeleccionado || !materialesKit.length) { setError('Selecciona al menos un material nuevo para añadir.'); return; }
    const nuevosIds = [...new Set([...kitSeleccionado.materialIds, ...materialesKit])];
    guardar({ ...datos, kits: datos.kits.map(item => item.id === kitSeleccionado.id ? { ...item, materialIds: nuevosIds } : item) }, `${materialesKit.length} materiales añadidos al kit ${kitSeleccionado.nombre}.`);
    setMaterialesKit([]);
  };

  const cambiarEstado = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const material = materialSeleccionado;
    if (!material || !destino || !SIGUIENTES_ESTADOS[material.estado].includes(destino)) return;
    const cirugiaAsignada = destino === 'reservado' ? cirugiaId : destino === 'cirugia' ? material.cirugiaId : '';
    if ((destino === 'reservado' || destino === 'cirugia') && !cirugiaAsignada) { setError('Selecciona una cirugía programada para asignar el material.'); return; }
    const fecha = new Date().toISOString();
    const actualizados = datos.materiales.map(item => item.id === material.id ? { ...item, estado: destino, cirugiaId: cirugiaAsignada, actualizadoEn: fecha } : item);
    guardar({ ...datos, materiales: actualizados, movimientos: [...datos.movimientos, { id: crypto.randomUUID(), materialId: material.id, desde: material.estado, hacia: destino, cirugiaId: material.cirugiaId || cirugiaAsignada, fecha }] }, `${material.nombre}: ${ETIQUETAS_ESTADO[destino]}.`);
  };

  const abrirRecepcion = () => { setEntregadoPor(''); setUsoMaterial(''); setMaterialesRecibidos([]); setBusquedaRecepcion(''); setError(''); setModal('recepcion'); };
  const leerCodigoBarras = () => {
    const codigo = window.prompt('Ingresa o pega el código de barras del material.');
    if (!codigo?.trim()) return;
    const valor = codigo.trim();
    setBusquedaRecepcion(valor);
    const material = materialesEntregables.find(item => item.codigo.toLowerCase() === valor.toLowerCase());
    if (!material) { setError(`No se encontró una pieza disponible con el código ${valor}.`); return; }
    setMaterialesRecibidos(actual => actual.includes(material.id) ? actual : [...actual, material.id]);
    setError('');
  };
  const registrarRecepcion = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!entregadoPor.trim()) { setError('Indica quién entrega el material.'); return; }
    if (!usoMaterial.trim()) { setError('Indica dónde fue utilizado el material.'); return; }
    if (!materialesRecibidos.length) { setError('Selecciona al menos una pieza recibida.'); return; }
    const fecha = new Date().toISOString();
    const kitDe = (materialId: string) => datos.kits.find(kit => kit.materialIds.includes(materialId))?.id || '';
    const recepciones: RecepcionMaterialSucio[] = materialesRecibidos.map(materialId => ({ id: crypto.randomUUID(), materialId, kitId: kitDe(materialId), entregadoPor: entregadoPor.trim(), uso: usoMaterial.trim(), fecha }));
    const ids = new Set(materialesRecibidos);
    const materiales = datos.materiales.map(item => ids.has(item.id) ? { ...item, estado: 'sucio' as const, cirugiaId: '', sector: 'Recepción sucio', actualizadoEn: fecha } : item);
    const movimientos = datos.movimientos.concat(datos.materiales.filter(item => ids.has(item.id)).map(item => ({ id: crypto.randomUUID(), materialId: item.id, desde: item.estado, hacia: 'sucio' as const, cirugiaId: item.cirugiaId, fecha })));
    guardar({ ...datos, materiales, movimientos, recepciones: [...datos.recepciones, ...recepciones] }, `${recepciones.length} pieza${recepciones.length === 1 ? '' : 's'} recibida${recepciones.length === 1 ? '' : 's'} como material sucio.`);
  };

  const reservarKit = () => {
    if (!kitSeleccionado || !cirugiaId) { setError('Selecciona una cirugía para reservar el kit.'); return; }
    const integrantes = kitSeleccionado.materialIds.map(id => datos.materiales.find(item => item.id === id));
    if (integrantes.some(item => !item || item.estado !== 'limpio')) { setError('Todos los materiales del kit deben estar limpios y disponibles para reservarlo.'); return; }
    const fecha = new Date().toISOString();
    const ids = new Set(kitSeleccionado.materialIds);
    const actualizados = datos.materiales.map(item => ids.has(item.id) ? { ...item, estado: 'reservado' as const, cirugiaId, actualizadoEn: fecha } : item);
    guardar({ ...datos, materiales: actualizados, movimientos: [...datos.movimientos, ...integrantes.filter((item): item is MaterialEsteril => Boolean(item)).map(item => ({ id: crypto.randomUUID(), materialId: item.id, desde: 'limpio' as const, hacia: 'reservado' as const, cirugiaId, fecha }))] }, `Kit ${kitSeleccionado.nombre} reservado para la cirugía seleccionada.`);
  };

  const abrirMovimiento = (id: string) => { setMaterialAbierto(id); setDestino(''); setCirugiaId(''); setError(''); setModal('estado'); setCirugias(leerCirugiasEsterilizacion()); };
  const verSeguimiento = (id: string) => { setMaterialAbierto(id); setSubvista('seguimiento'); setBusqueda(''); setFiltroEstado(''); setFiltroTipo(''); setFiltroSector(''); setError(''); };
  const cambiarSubvista = (destinoVista: 'sala' | 'entrega' | 'seguimiento' | 'inventario' | 'kits') => { setSubvista(destinoVista); setBusqueda(''); setFiltroEstado(''); setFiltroTipo(''); setFiltroSector(''); setAviso(''); setError(''); };
  const abrirAgregar = (id: string) => { setKitAbierto(id); setMaterialesKit([]); setBusquedaAsociar(''); setError(''); setModal('agregar'); };

  return <section className="recepcion-vista est-vista esterilizacion-vista" aria-label="Esterilización de quirófano"><div className="cocina-subvista-cabecera"><HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Esterilización"><button className={subvista === 'sala' ? 'activo' : ''} onClick={() => cambiarSubvista('sala')}><span><Icon name="lab" size={17}/></span><strong>Recepción sucio</strong><small>Ingreso de material para reprocesar.</small></button><button className={subvista === 'entrega' ? 'activo' : ''} onClick={() => cambiarSubvista('entrega')}><span><Icon name="check" size={17}/></span><strong>Entrega de material estéril</strong><small>Piezas limpias disponibles para entregar.</small></button><button className={subvista === 'seguimiento' ? 'activo' : ''} onClick={() => cambiarSubvista('seguimiento')}><span><Icon name="search" size={17}/></span><strong>Seguimiento de material</strong><small>Ubicación y estado de cada pieza.</small></button><button className={subvista === 'inventario' ? 'activo' : ''} onClick={() => cambiarSubvista('inventario')}><span><Icon name="package" size={17}/></span><strong>Inventario</strong><small>Registro individual de material estéril.</small></button><button className={subvista === 'kits' ? 'activo' : ''} onClick={() => cambiarSubvista('kits')}><span><Icon name="package" size={17}/></span><strong>Kits de instrumental</strong><small>Grupos, reservas y preparación quirúrgica.</small></button></HorizontalSubvistaNav></div>
    <header className="est-cabecera"><div><p>QUIRÓFANO · ESTERILIZACIÓN</p><h2>Control de material estéril</h2><small>Inventario, kits y trazabilidad del material utilizado en cirugía.</small></div><span><Icon name="lab" size={20}/> {datos.materiales.length} materiales registrados</span></header>
    <nav className="est-subvistas" aria-label="Sub-vistas de esterilización"><button type="button" className={subvista === 'sala' ? 'activo' : ''} onClick={() => cambiarSubvista('sala')}><Icon name="lab" size={17}/> Sala de esterilización</button><button type="button" className={subvista === 'inventario' ? 'activo' : ''} onClick={() => cambiarSubvista('inventario')}><Icon name="package" size={17}/> Inventario de material</button><button type="button" className={subvista === 'kits' ? 'activo' : ''} onClick={() => cambiarSubvista('kits')}><Icon name="package" size={17}/> Kits de instrumental</button></nav>
    {aviso && <p className="est-aviso" role="status">{aviso}</p>}
    {error && !modal && <p className="est-error" role="alert">{error}</p>}

    {subvista === 'sala' && <RecepcionSucio recepciones={recepcionesOrdenadas} materiales={datos.materiales} kits={datos.kits} onAbrir={abrirRecepcion}/>}

    {subvista === 'entrega' && <section className="est-panel"><header><div><h3>Material estéril disponible</h3><small>Piezas limpias listas para entregar a un procedimiento o área solicitante.</small></div></header><TablaMateriales materiales={datos.materiales.filter(item => item.estado === 'limpio')} cirugias={cirugias} onAccion={verSeguimiento} accion="Ver seguimiento"/></section>}

    {subvista === 'seguimiento' && <>
      <div className="est-resumen">{(['pendiente', 'sucio', 'esterilizacion', 'limpio', 'reservado', 'cirugia'] as EstadoMaterial[]).map(estado => <div key={estado}><strong>{datos.materiales.filter(item => item.estado === estado).length}</strong><small>{ETIQUETAS_ESTADO[estado]}</small></div>)}</div>
      <section className="est-panel"><div className="est-filtros"><label><Icon name="search" size={16}/><input aria-label="Buscar material" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, código o serie"/></label><select aria-label="Filtrar por estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{Object.entries(ETIQUETAS_ESTADO).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select><select aria-label="Filtrar por sector" value={filtroSector} onChange={e => setFiltroSector(e.target.value)}><option value="">Todos los sectores</option>{sectores.map(item => <option key={item}>{item}</option>)}</select></div><TablaMateriales materiales={materialesVisibles} cirugias={cirugias} onAccion={abrirMovimiento} accion="Registrar movimiento"/></section>
      {materialSeleccionado && <section className="est-panel est-historial"><header><div><h3>Historial · {materialSeleccionado.nombre}</h3><small>{materialSeleccionado.codigo} · {movimientos.length} movimientos registrados</small></div><button type="button" onClick={() => setMaterialAbierto(null)} aria-label="Cerrar historial"><Icon name="close" size={16}/></button></header><div className="est-historial-lista">{movimientos.map(item => <div key={item.id}><time>{new Date(item.fecha).toLocaleString('es-BO')}</time><strong>{item.desde === 'registro' ? 'Registro inicial' : ETIQUETAS_ESTADO[item.desde]} → {ETIQUETAS_ESTADO[item.hacia]}</strong><small>{cirugias.find(c => c.id === item.cirugiaId)?.cuenta || 'Sin cirugía asignada'}</small></div>)}</div></section>}
    </>}

    {subvista === 'inventario' && <>
      <section className="est-panel"><header><div><h3>Inventario de material</h3><small>Las piezas conservan su registro individual aunque pertenezcan a varios kits.</small></div><button className="est-principal" type="button" onClick={() => { setError(''); setFormMaterial(MATERIAL_VACIO); setModal('material'); }}><Icon name="plus" size={16}/> Registrar material</button></header><div className="est-filtros"><label><Icon name="search" size={16}/><input aria-label="Buscar material" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar material o instrumento"/></label><select aria-label="Filtrar por tipo" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}><option value="">Todos los tipos</option>{tipos.map(item => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar por sector" value={filtroSector} onChange={e => setFiltroSector(e.target.value)}><option value="">Todos los sectores</option>{sectores.map(item => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar por estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{Object.entries(ETIQUETAS_ESTADO).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></div><TablaMateriales materiales={materialesVisibles} cirugias={cirugias} onAccion={verSeguimiento} accion="Ver seguimiento"/></section>
    </>}

    {subvista === 'kits' && <section className="est-panel est-kits-panel"><header><div><h3>Kits y grupos de instrumental</h3><small>Cada instrumento conserva su estado y puede pertenecer a varios kits.</small></div><button className="est-principal" type="button" onClick={() => { setError(''); setFormKit(KIT_VACIO); setMaterialesKit([]); setEspecialidadesKit([]); setBusquedaAsociar(''); setModal('kit'); }}><Icon name="plus" size={16}/> Crear nuevo kit</button></header>
      <div className="est-filtros"><label><Icon name="search" size={16}/><input aria-label="Buscar kit" value={busquedaKit} onChange={e => setBusquedaKit(e.target.value)} placeholder="Buscar kit o especialidad"/></label><select aria-label="Filtrar kits por especialidad" value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)}><option value="">Todas las especialidades</option>{especialidades.map(item => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar kits por estado" value={filtroKitEstado} onChange={e => setFiltroKitEstado(e.target.value)}><option value="">Todos los estados</option>{Object.entries(ETIQUETAS_KIT).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></div>
      {kitsVisibles.length ? <div className="est-kits est-kits-tarjetas">{kitsVisibles.map(kit => <article key={kit.id} className={kitAbierto === kit.id ? 'est-kit-tarjeta activo' : 'est-kit-tarjeta'}><div className="est-kit-tarjeta-info"><Icon name="package" size={20}/><span><strong>{kit.nombre}</strong><small>{kit.materialIds.length} instrumentos · {(kit.especialidades || []).join(', ') || 'Sin especialidad'}</small></span><b className={`est-kit-estado ${estadoKit(kit, datos.materiales)}`}>{ETIQUETAS_KIT[estadoKit(kit, datos.materiales)]}</b></div><div className="est-kit-acciones"><button type="button" onClick={() => { setKitAbierto(kit.id); setCirugiaId(''); setError(''); setCirugias(leerCirugiasEsterilizacion()); }}>Inspeccionar</button><button type="button" onClick={() => abrirAgregar(kit.id)}>Añadir materiales</button></div></article>)}</div> : <div className="est-vacio"><Icon name="package" size={26}/><strong>No hay kits con estos filtros</strong><small>Crea un kit o ajusta la búsqueda.</small></div>}
      {kitSeleccionado && <div className="est-kit-detalle"><div className="est-kit-detalle-cabecera"><div><h4>Inspección · {kitSeleccionado.nombre}</h4><small>{(kitSeleccionado.especialidades || []).join(', ') || 'Sin especialidad'} · {kitSeleccionado.descripcion || 'Listado de instrumental'}</small></div><button type="button" onClick={() => abrirAgregar(kitSeleccionado.id)}>+ Añadir materiales</button></div><ul>{kitSeleccionado.materialIds.map(id => { const item = datos.materiales.find(material => material.id === id); return <li key={id}><span>{item?.nombre || 'Material no disponible'} <small>{item?.codigo || 'Sin código'}</small></span><b className={`est-estado ${item?.estado || 'pendiente'}`}>{item ? item.estado === 'cirugia' || item.estado === 'reservado' ? 'Ocupado · ' + ETIQUETAS_ESTADO[item.estado] : ETIQUETAS_ESTADO[item.estado] : 'Sin registro'}</b></li>; })}</ul><div className="est-kit-reserva"><select aria-label="Cirugía para reservar el kit" value={cirugiaId} onChange={e => setCirugiaId(e.target.value)}><option value="">Seleccionar cirugía programada</option>{cirugiasOrdenadas.map(item => <option key={item.id} value={item.id}>{etiquetaCirugia(item)}</option>)}</select><button type="button" onClick={reservarKit} disabled={!cirugiasOrdenadas.length}>Reservar kit</button></div>{error && <p className="est-error" role="alert">{error}</p>}</div>}
    </section>}

    {modal && <div className="est-modal-fondo" role="presentation" onMouseDown={() => setModal(null)}><section className="est-modal" role="dialog" aria-modal="true" aria-label={modal === 'recepcion' ? 'Recepción de material sucio' : modal === 'material' ? 'Registrar material estéril' : modal === 'kit' ? 'Crear kit de instrumental' : modal === 'agregar' ? 'Añadir materiales al kit' : 'Registrar movimiento de material'} onMouseDown={e => e.stopPropagation()}><header><div><p>ESTERILIZACIÓN</p><h3>{modal === 'recepcion' ? 'Recepción de material sucio' : modal === 'material' ? 'Registrar nuevo material' : modal === 'kit' ? 'Crear kit o grupo' : modal === 'agregar' ? `Añadir materiales · ${kitSeleccionado?.nombre || ''}` : 'Registrar movimiento'}</h3></div><button type="button" aria-label="Cerrar ventana" onClick={() => setModal(null)}><Icon name="close" size={17}/></button></header>
      {modal === 'etiqueta' && materialEtiqueta && <div className="est-etiqueta-vista"><EtiquetaCodigo material={materialEtiqueta}/><div className="est-etiqueta-acciones"><button type="button" onClick={() => window.print()}>Imprimir</button><button type="button" onClick={() => setModal(null)}>Cerrar</button></div></div>}
      {modal === 'recepcion' && <form onSubmit={registrarRecepcion}><div className="est-form-grid"><label>Entregado por *<input required value={entregadoPor} onChange={e => setEntregadoPor(e.target.value)} placeholder="Nombre del personal que entrega"/></label><label>Utilizado en / procedencia *<input required list="cirugias-con-material" value={usoMaterial} onChange={e => setUsoMaterial(e.target.value)} placeholder="Selecciona una cirugía o escribe la procedencia"/><datalist id="cirugias-con-material">{cirugiasConMaterial.map(cirugia => <option key={cirugia.id} value={etiquetaCirugia(cirugia)} />)}</datalist></label></div><div className="est-recepcion-selector"><fieldset className="est-recepcion-lista"><legend>Material disponible</legend><label className="est-recepcion-buscar"><Icon name="search" size={16}/><input value={busquedaRecepcion} onChange={e => setBusquedaRecepcion(e.target.value)} placeholder="Buscar por nombre, código o serie"/></label><button className="est-lector-codigo" type="button" onClick={leerCodigoBarras}><Icon name="camera" size={16}/> Lector de código de barras</button>{materialesFiltradosRecepcion.length ? materialesFiltradosRecepcion.map(item => { const kit = datos.kits.find(grupo => grupo.materialIds.includes(item.id)); return <label key={item.id}><input type="checkbox" checked={materialesRecibidos.includes(item.id)} onChange={() => setMaterialesRecibidos(actual => actual.includes(item.id) ? actual.filter(id => id !== item.id) : [...actual, item.id])}/><span><strong>{item.nombre}</strong><small>{item.codigo} · {item.serie || item.tipo}</small></span><em>{kit?.nombre || 'Pieza individual'}</em></label>; }) : <p>No se encontraron piezas disponibles.</p>}</fieldset><aside className="est-recepcion-seleccion"><strong>Seleccionado ({materialesRecibidos.length})</strong>{materialesRecibidos.length ? <ul>{materialesRecibidos.map(id => { const item = datos.materiales.find(material => material.id === id); return <li key={id}><span>{item?.nombre}<small>{item?.codigo}</small></span><button type="button" onClick={() => setMaterialesRecibidos(actual => actual.filter(materialId => materialId !== id))} aria-label={`Quitar ${item?.nombre || 'material'}`}><Icon name="close" size={14}/></button></li>; })}</ul> : <p>Selecciona las piezas recibidas para revisarlas aquí.</p>}</aside></div>{error && <p className="est-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Registrar recepción ({materialesRecibidos.length})</button></footer></form>}
      {modal === 'material' && <form onSubmit={crearMaterial}><div className="est-form-grid"><label>Código único *<input required value={formMaterial.codigo} onChange={e => setFormMaterial({ ...formMaterial, codigo: e.target.value })} placeholder="Ej. INST-001"/></label><label>Nombre del material *<input required value={formMaterial.nombre} onChange={e => setFormMaterial({ ...formMaterial, nombre: e.target.value })} placeholder="Ej. Pinza Kelly"/></label><label>Tipo *<select required value={formMaterial.tipo} onChange={e => setFormMaterial({ ...formMaterial, tipo: e.target.value })}><option value="">Seleccionar tipo</option><option>Instrumento</option><option>Material reutilizable</option><option>Textil quirúrgico</option><option>Contenedor</option><option>Otro</option></select></label><label>Sector de origen *<input required value={formMaterial.sector} onChange={e => setFormMaterial({ ...formMaterial, sector: e.target.value })} placeholder="Ej. Central de esterilización"/></label><label>Marca / fabricante<input value={formMaterial.marca} onChange={e => setFormMaterial({ ...formMaterial, marca: e.target.value })}/></label><label>Número de serie / lote<input value={formMaterial.serie} onChange={e => setFormMaterial({ ...formMaterial, serie: e.target.value })}/></label><label className="est-campo-ancho">Descripción / observaciones<textarea value={formMaterial.descripcion} onChange={e => setFormMaterial({ ...formMaterial, descripcion: e.target.value })}/></label></div><p className="est-ayuda">El material se registra como pendiente de esterilización. Podrás cambiar su estado en Sala de esterilización.</p>{error && <p className="est-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Registrar material</button></footer></form>}
      {modal === 'kit' && <form onSubmit={crearKit}><div className="est-form-grid"><label>Nombre del kit *<input required value={formKit.nombre} onChange={e => setFormKit({ ...formKit, nombre: e.target.value })} placeholder="Ej. Kit de cesárea"/></label><label>Descripción<input value={formKit.descripcion} onChange={e => setFormKit({ ...formKit, descripcion: e.target.value })} placeholder="Uso previsto"/></label></div><fieldset className="est-especialidades"><legend>Especialidades asociadas *</legend><div>{ESPECIALIDADES.map(item => <label key={item}><input type="checkbox" checked={especialidadesKit.includes(item)} onChange={() => setEspecialidadesKit(actual => actual.includes(item) ? actual.filter(valor => valor !== item) : [...actual, item])}/>{item}</label>)}</div></fieldset><label className="est-buscar-kit"><Icon name="search" size={16}/><input value={busquedaAsociar} onChange={e => setBusquedaAsociar(e.target.value)} placeholder="Buscar instrumentos para asociar"/></label><div className="est-lista-asociar">{datos.materiales.filter(item => `${item.codigo} ${item.nombre}`.toLowerCase().includes(busquedaAsociar.toLowerCase())).map(item => <label key={item.id}><input type="checkbox" checked={materialesKit.includes(item.id)} onChange={() => setMaterialesKit(actual => actual.includes(item.id) ? actual.filter(id => id !== item.id) : [...actual, item.id])}/><span><strong>{item.nombre}</strong><small>{item.codigo} · {item.tipo}</small></span><b className={`est-estado ${item.estado}`}>{ETIQUETAS_ESTADO[item.estado]}</b></label>)}{!datos.materiales.length && <p>Registra materiales antes de crear un kit.</p>}</div><p className="est-ayuda">Asociar una pieza a este kit no la elimina del inventario ni de otros kits.</p>{error && <p className="est-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Guardar kit ({materialesKit.length})</button></footer></form>}
      {modal === 'agregar' && kitSeleccionado && <form onSubmit={agregarMateriales}><p className="est-ayuda">Selecciona instrumentos del inventario. Los que ya pertenecen al kit se mantienen independientes y pueden usarse en otros kits.</p><label className="est-buscar-kit"><Icon name="search" size={16}/><input value={busquedaAsociar} onChange={e => setBusquedaAsociar(e.target.value)} placeholder="Buscar instrumentos para añadir"/></label><div className="est-lista-asociar">{datos.materiales.filter(item => !kitSeleccionado.materialIds.includes(item.id) && `${item.codigo} ${item.nombre}`.toLowerCase().includes(busquedaAsociar.toLowerCase())).map(item => <label key={item.id}><input type="checkbox" checked={materialesKit.includes(item.id)} onChange={() => setMaterialesKit(actual => actual.includes(item.id) ? actual.filter(id => id !== item.id) : [...actual, item.id])}/><span><strong>{item.nombre}</strong><small>{item.codigo} · {item.tipo}</small></span><b className={`est-estado ${item.estado}`}>{ETIQUETAS_ESTADO[item.estado]}</b></label>)}{!datos.materiales.some(item => !kitSeleccionado.materialIds.includes(item.id)) && <p>No hay más instrumentos disponibles para añadir.</p>}</div>{error && <p className="est-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Añadir materiales ({materialesKit.length})</button></footer></form>}
      {modal === 'estado' && materialSeleccionado && <form onSubmit={cambiarEstado}><p className="est-modal-identidad"><strong>{materialSeleccionado.nombre}</strong><small>{materialSeleccionado.codigo} · Estado actual: {ETIQUETAS_ESTADO[materialSeleccionado.estado]}</small></p><div className="est-form-grid"><label>Nuevo estado *<select required value={destino} onChange={e => setDestino(e.target.value as EstadoMaterial)}><option value="">Seleccionar estado</option>{SIGUIENTES_ESTADOS[materialSeleccionado.estado].map(item => <option key={item} value={item}>{ETIQUETAS_ESTADO[item]}</option>)}</select></label>{destino === 'reservado' && <label>Cirugía programada *<select required value={cirugiaId} onChange={e => setCirugiaId(e.target.value)}><option value="">Seleccionar cirugía</option>{cirugiasOrdenadas.map(item => <option key={item.id} value={item.id}>{etiquetaCirugia(item)}</option>)}</select></label>}</div>{destino === 'cirugia' && <p className="est-ayuda">Asignado a {cirugias.find(item => item.id === materialSeleccionado.cirugiaId)?.cuenta || 'la cirugía registrada'}.</p>}{destino === 'limpio' && <p className="est-ayuda">Confirma este estado solo cuando el material haya completado el proceso de esterilización.</p>}{error && <p className="est-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" disabled={!destino}>Registrar cambio</button></footer></form>}
    </section></div>}
  </section>;
}

function EtiquetaCodigo({ material }: { material: MaterialEsteril }) {
  const barras = Array.from(material.codigo).flatMap((caracter, indice) => [1 + (caracter.charCodeAt(0) % 3), 1, 2 + ((caracter.charCodeAt(0) + indice) % 2)]);
  return <div className="est-etiqueta"><div className="est-etiqueta-barras" aria-label={`Código de barras ${material.codigo}`}>{barras.map((ancho, indice) => <i key={indice} style={{ width: `${ancho}px` }}/>)}</div><strong>{material.nombre}</strong><span>{material.codigo}</span></div>;
}

function RecepcionSucio({ recepciones, materiales, kits, onAbrir }: { recepciones: RecepcionMaterialSucio[]; materiales: MaterialEsteril[]; kits: KitEsteril[]; onAbrir: () => void }) {
  return <section className="est-panel est-recepcion-panel"><header><div><h3>Material recibido</h3><small>Registro individual de cada pieza entregada para reprocesamiento.</small></div><button className="est-recepcion-boton" type="button" onClick={onAbrir}><Icon name="plus" size={17}/> Recepción de material sucio</button></header><div className="est-tabla-scroll"><table className="est-recepcion-tabla"><thead><tr><th>Material / código</th><th>Kit</th><th>Entregado por</th><th>Utilizado en</th><th>Fecha de recepción</th></tr></thead><tbody>{recepciones.map(recepcion => { const material = materiales.find(item => item.id === recepcion.materialId); const kit = kits.find(item => item.id === recepcion.kitId); return <tr key={recepcion.id}><td><strong>{material?.nombre || 'Material no disponible'}</strong><small>{material?.codigo || 'Sin código'} · {material?.serie || material?.tipo || 'Sin serie'}</small></td><td>{kit?.nombre || 'Pieza individual'}</td><td>{recepcion.entregadoPor}</td><td>{recepcion.uso}</td><td>{new Date(recepcion.fecha).toLocaleString('es-BO')}</td></tr>; })}</tbody></table></div>{!recepciones.length && <div className="est-vacio"><Icon name="package" size={26}/><strong>Aún no hay material recibido</strong><small>Registra la primera entrega para verla en este listado.</small></div>}</section>;
}

function TablaMateriales({ materiales, cirugias, onAccion, accion }: { materiales: MaterialEsteril[]; cirugias: CirugiaProgramada[]; onAccion: (id: string) => void; accion: string }) {
  return materiales.length ? <div className="est-tabla-scroll"><table><thead><tr><th>Material / código</th><th>Tipo y serie</th><th>Sector / ubicación</th><th>Estado</th><th>Cirugía asignada</th><th>Acción</th></tr></thead><tbody>{materiales.map(item => { const cirugia = cirugias.find(c => c.id === item.cirugiaId); const ubicacion = item.estado === 'cirugia' ? cirugia?.quirofano : item.estado === 'esterilizacion' ? 'Sala de esterilización' : item.sector; return <tr key={item.id}><td><strong>{item.nombre}</strong><small>{item.codigo}</small></td><td>{item.tipo}<small>{item.serie || item.marca || 'Sin serie'}</small></td><td>{ubicacion || item.sector}<small>Origen: {item.sector}</small></td><td><span className={`est-estado ${item.estado}`}>{ETIQUETAS_ESTADO[item.estado]}</span></td><td>{cirugia ? <><strong>{cirugia.cuenta}</strong><small>{cirugia.fecha} · {cirugia.hora}</small></> : <span className="est-sin-cirugia">Sin asignar</span>}</td><td><button type="button" onClick={() => onAccion(item.id)}>{accion}</button></td></tr>; })}</tbody></table></div> : <div className="est-vacio"><Icon name="package" size={26}/><strong>No hay materiales con estos filtros</strong><small>Registra una pieza en Inventario o ajusta la búsqueda.</small></div>;
}
