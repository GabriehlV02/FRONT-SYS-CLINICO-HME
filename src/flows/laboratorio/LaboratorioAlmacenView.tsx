import { useEffect, useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import './LaboratorioAlmacenView.css';
import './SolicitudStock.css';
import './LaboratorioAlmacenCompacto.css';
import './EquiposRecargas.css';
import './UsoPacientesLaboratorio.css';
import './UsoPacientesAcciones.css';
import './UsoPacientesAccionesLayout.css';
import { ejemplosLaboratorio } from './ejemplosLaboratorio';
import { leerSolicitudesLaboratorio, suscribirLaboratorio, type SolicitudLaboratorio } from './almacenLaboratorio';

type Subvista = 'insumos' | 'equipos-recargas' | 'uso-pacientes';

const vistas: { id: Subvista; nombre: string; detalle: string; icono: IconName }[] = [
  { id: 'insumos', nombre: 'Insumos', detalle: 'Existencias y reposición de reactivos.', icono: 'package' },
  { id: 'equipos-recargas', nombre: 'Equipos y recargas', detalle: 'Control de equipos, mantenimiento y recargas.', icono: 'asset' },
  { id: 'uso-pacientes', nombre: 'Uso en pacientes', detalle: 'Trazabilidad del material utilizado.', icono: 'patient' },
];

const contenido: Record<Subvista, { titulo: string; descripcion: string; accion: string; columnas: string[]; vacio: string }> = {
  insumos: { titulo: 'Insumos de laboratorio', descripcion: 'Administra reactivos, materiales y sus niveles de disponibilidad.', accion: 'Registrar insumo', columnas: ['Insumo', 'Categoría', 'Stock actual', 'Vencimiento', 'Estado'], vacio: 'Aún no hay insumos registrados.' },
  'equipos-recargas': { titulo: 'Equipos y recargas', descripcion: 'Mantén el inventario técnico y el historial de recargas al día.', accion: 'Registrar equipo', columnas: ['Equipo', 'Código', 'Última recarga', 'Próximo mantenimiento', 'Estado'], vacio: 'Aún no hay equipos o recargas registrados.' },
  'uso-pacientes': { titulo: 'Uso en pacientes', descripcion: 'Consulta el consumo de insumos asociado a cada atención o estudio.', accion: 'Registrar uso', columnas: ['Paciente', 'Atención / estudio', 'Insumo utilizado', 'Cantidad', 'Fecha', 'Acciones'], vacio: 'Aún no hay usos de insumos registrados.' },
};

const catalogoInsumos = [
  { id: 'tubo-rojo', nombre: 'Tubo al vacío tapa roja', codigo: 'INS-001', unidad: 'unidades', disponible: 42 },
  { id: 'jeringa-5', nombre: 'Jeringa estéril 5 ml', codigo: 'INS-002', unidad: 'unidades', disponible: 18 },
  { id: 'guantes-m', nombre: 'Guantes de nitrilo talla M', codigo: 'INS-003', unidad: 'cajas', disponible: 6 },
  { id: 'reactivo-glucosa', nombre: 'Reactivo de glucosa', codigo: 'INS-004', unidad: 'frascos', disponible: 3 },
  { id: 'portaobjetos', nombre: 'Portaobjetos de vidrio', codigo: 'INS-005', unidad: 'cajas', disponible: 9 },
];
type SolicitudItem = typeof catalogoInsumos[number] & { cantidad: number };
type Equipo = { id: string; nombre: string; codigo: string };
type InsumoEquipo = { id: string; nombre: string; unidad: string };

export function LaboratorioAlmacenView() {
  const [subvista, setSubvista] = useState<Subvista>('insumos');
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [solicitud, setSolicitud] = useState<SolicitudItem[]>([]);
  const [mensaje, setMensaje] = useState('');
  const actual = contenido[subvista];
  const coincidencias = catalogoInsumos.filter(insumo => `${insumo.nombre} ${insumo.codigo}`.toLocaleLowerCase().includes(busquedaInsumo.trim().toLocaleLowerCase()) && !solicitud.some(item => item.id === insumo.id));
  const abrirSolicitud = () => { setMensaje(''); setBusquedaInsumo(''); setSolicitudAbierta(true); };
  const cerrarSolicitud = () => { setSolicitudAbierta(false); setBusquedaInsumo(''); setSolicitud([]); };
  const agregarInsumo = (insumo: typeof catalogoInsumos[number]) => { setSolicitud(actual => [...actual, { ...insumo, cantidad: 1 }]); setBusquedaInsumo(''); };
  const cambiarCantidad = (id: string, cantidad: string) => setSolicitud(actual => actual.map(item => item.id === id ? { ...item, cantidad: Math.max(1, Number(cantidad) || 1) } : item));
  const enviarSolicitud = () => { if (!solicitud.length) return; setMensaje(`Solicitud de stock enviada con ${solicitud.length} ${solicitud.length === 1 ? 'insumo' : 'insumos'}.`); cerrarSolicitud(); };

  return <section className="laboratorio-almacen-vista" aria-label="Laboratorio almacén">
    <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de laboratorio almacén">
      {vistas.map(vista => <button key={vista.id} type="button" aria-current={subvista === vista.id ? 'page' : undefined} className={subvista === vista.id ? 'activo' : ''} onClick={() => setSubvista(vista.id)}>
        <span><Icon name={vista.icono} size={17} /></span><strong>{vista.nombre}</strong><small>{vista.detalle}</small>
      </button>)}
    </HorizontalSubvistaNav>

    <header className="laboratorio-almacen-cabecera">
      <div><p>LABORATORIO · ALMACÉN</p><h2>{actual.titulo}</h2><small>{actual.descripcion}</small></div>
      {subvista === 'insumos' ? <button type="button" onClick={abrirSolicitud}><Icon name="package" size={17} /> Solicitar stock</button> : null}
    </header>

    {subvista === 'equipos-recargas' ? <EquiposRecargasView /> : subvista === 'uso-pacientes' ? <UsoPacientesView /> : <section className="laboratorio-almacen-tabla" aria-label={actual.titulo}>
      <header><strong>Inventario</strong><span>0 registros</span></header>
      <div className="laboratorio-almacen-columnas">{actual.columnas.map(columna => <span key={columna}>{columna}</span>)}</div>
      <div className="laboratorio-almacen-vacio"><span><Icon name={vistas.find(vista => vista.id === subvista)?.icono ?? 'package'} size={29} /></span><strong>{actual.vacio}</strong><small>Los registros creados en esta sección aparecerán aquí.</small></div>
    </section>}
    {mensaje && <p className="laboratorio-almacen-mensaje" role="status"><Icon name="check" size={16} /> {mensaje}</p>}
    {solicitudAbierta && <div className="solicitud-stock-fondo" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) cerrarSolicitud(); }}>
      <section className="solicitud-stock-modal" role="dialog" aria-modal="true" aria-labelledby="solicitud-stock-titulo">
        <header><div><p>LABORATORIO · ALMACÉN</p><h2 id="solicitud-stock-titulo">Solicitar stock</h2><small>Agrega los insumos que necesitas y define la cantidad solicitada.</small></div><button type="button" aria-label="Cerrar solicitud" onClick={cerrarSolicitud}><Icon name="close" size={19}/></button></header>
        <div className="solicitud-stock-buscador"><Icon name="search" size={18}/><input autoFocus value={busquedaInsumo} onChange={evento => setBusquedaInsumo(evento.target.value)} placeholder="Buscar insumo por nombre o código" aria-label="Buscar insumo" /></div>
        {busquedaInsumo.trim() && <div className="solicitud-stock-coincidencias">{coincidencias.length ? coincidencias.map(insumo => <button type="button" key={insumo.id} onClick={() => agregarInsumo(insumo)}><span><strong>{insumo.nombre}</strong><small>{insumo.codigo} · Disponible: {insumo.disponible} {insumo.unidad}</small></span><Icon name="plus" size={17}/></button>) : <p>No hay más insumos que coincidan con la búsqueda.</p>}</div>}
        <section className="solicitud-stock-lista" aria-label="Insumos solicitados"><header><strong>Detalle de la solicitud</strong><span>{solicitud.length} {solicitud.length === 1 ? 'insumo' : 'insumos'}</span></header>{solicitud.length ? <div>{solicitud.map(item => <article key={item.id}><div><strong>{item.nombre}</strong><small>{item.codigo} · Disponible: {item.disponible} {item.unidad}</small></div><label>Cantidad<input type="number" min="1" value={item.cantidad} onChange={evento => cambiarCantidad(item.id, evento.target.value)} /></label><button type="button" aria-label={`Quitar ${item.nombre}`} onClick={() => setSolicitud(actual => actual.filter(solicitado => solicitado.id !== item.id))}><Icon name="trash" size={17}/></button></article>)}</div> : <p className="solicitud-stock-vacia">Busca y selecciona los insumos que deseas solicitar.</p>}</section>
        <footer><button type="button" className="solicitud-stock-cancelar" onClick={cerrarSolicitud}>Cancelar</button><button type="button" className="solicitud-stock-enviar" disabled={!solicitud.length} onClick={enviarSolicitud}><Icon name="check" size={17}/> Enviar solicitud</button></footer>
      </section>
    </div>}
  </section>;
}

function UsoPacientesView() {
  const [solicitudes, setSolicitudes] = useState<SolicitudLaboratorio[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  useEffect(() => {
    const cargar = () => { try { setSolicitudes(leerSolicitudesLaboratorio()); } catch { setSolicitudes([]); } };
    cargar();
    return suscribirLaboratorio(cargar);
  }, []);
  const registros = solicitudes.length ? solicitudes : ejemplosLaboratorio('ambulatorio');
  const orden = registros.find(solicitud => solicitud.id === seleccionada) ?? registros[0];
  const estado = (valor: SolicitudLaboratorio['estado']) => valor === 'completado' ? 'Terminado' : valor === 'en_proceso' ? 'En proceso' : valor === 'anulado' ? 'Anulado' : 'Pendiente';
  const fecha = (valor: string) => new Date(valor).toLocaleDateString('es-BO', { dateStyle: 'medium' });
  return <section className="uso-pacientes-laboratorio" aria-label="Uso de laboratorio por paciente">
    <header className="uso-pacientes-resumen"><div><strong>Pacientes con orden de laboratorio</strong><small>Consulta cada orden, sus estudios y la trazabilidad de recursos utilizados.</small></div><span>{registros.length} {registros.length === 1 ? 'orden' : 'órdenes'}</span></header>
    {!solicitudes.length && <p className="uso-pacientes-demo"><Icon name="sparkles" size={15}/> Mostrando órdenes de ejemplo hasta que se registren órdenes reales de laboratorio.</p>}
    <div className="uso-pacientes-contenido"><section className="uso-pacientes-listado"><header><span>Paciente / orden</span><span>Exámenes</span><span>Estado</span><span>Acciones</span></header>{registros.map(solicitud => <article key={solicitud.id} className={orden?.id === solicitud.id ? 'activa' : ''}><div><strong>{solicitud.paciente}</strong><small>CI {solicitud.ci} · {fecha(solicitud.fecha)}</small></div><div className="uso-pacientes-estudios">{solicitud.estudios.map(estudio => <span key={estudio.id}>{estudio.nombre}</span>)}</div><b className={solicitud.estado}>{estado(solicitud.estado)}</b><div className="uso-pacientes-acciones"><button type="button" onClick={() => setSeleccionada(solicitud.id)} aria-label={`Ver uso de recursos para ${solicitud.paciente}`}><Icon name="eye" size={15}/> Ver</button><button type="button" onClick={() => setSeleccionada(solicitud.id)} aria-label={`Editar uso de recursos para ${solicitud.paciente}`}><Icon name="edit" size={15}/> Editar</button></div></article>)}</section>{orden && <aside className="uso-pacientes-detalle"><header><p>ORDEN DE LABORATORIO</p><h3>{orden.paciente}</h3><small>CI {orden.ci} · {fecha(orden.fecha)} · {orden.origen === 'internacion' ? 'Internación' : 'Ambulatorio'}</small></header><section><h4>Exámenes realizados / solicitados</h4>{orden.estudios.map(estudio => <article key={estudio.id}><Icon name="lab" size={16}/><span>{estudio.nombre}<small>{estudio.resultados.length} {estudio.resultados.length === 1 ? 'parámetro' : 'parámetros'}</small></span></article>)}</section><section><h4>Equipos utilizados</h4><p className="uso-pacientes-sin-recurso"><Icon name="asset" size={16}/> Sin equipos registrados para esta orden.</p></section><section><h4>Insumos y líquidos utilizados</h4><p className="uso-pacientes-sin-recurso"><Icon name="package" size={16}/> Sin consumos registrados para esta orden.</p></section><footer>Al registrar el uso desde esta orden, quedará trazado por paciente, examen, equipo e insumo.</footer></aside>}</div>
  </section>;
}

function EquiposRecargasView() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [insumos, setInsumos] = useState<InsumoEquipo[]>([]);
  const [asociaciones, setAsociaciones] = useState<{ equipoId: string; insumoId: string }[]>([]);
  const [formulario, setFormulario] = useState<'equipo' | 'insumo' | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [unidad, setUnidad] = useState('unidades');
  const [equipoId, setEquipoId] = useState('');
  const [insumoId, setInsumoId] = useState('');
  const limpiarFormulario = () => { setFormulario(null); setNombre(''); setCodigo(''); setUnidad('unidades'); };
  const guardar = () => {
    if (!nombre.trim()) return;
    if (formulario === 'equipo') setEquipos(actual => [...actual, { id: crypto.randomUUID(), nombre: nombre.trim(), codigo: codigo.trim() || `EQ-${String(actual.length + 1).padStart(3, '0')}` }]);
    if (formulario === 'insumo') setInsumos(actual => [...actual, { id: crypto.randomUUID(), nombre: nombre.trim(), unidad }]);
    limpiarFormulario();
  };
  const asociar = () => { if (!equipoId || !insumoId || asociaciones.some(item => item.equipoId === equipoId && item.insumoId === insumoId)) return; setAsociaciones(actual => [...actual, { equipoId, insumoId }]); setInsumoId(''); };
  return <section className="equipos-recargas" aria-label="Gestión de equipos y recargas">
    <div className="equipos-recargas-acciones"><div><strong>Registro técnico</strong><small>Registra los equipos y los líquidos o insumos que consumen.</small></div><span><button type="button" onClick={() => setFormulario('equipo')}><Icon name="asset" size={16}/> Registrar equipo</button><button type="button" onClick={() => setFormulario('insumo')}><Icon name="package" size={16}/> Registrar líquido o insumo</button></span></div>
    {formulario && <form className="equipos-recargas-formulario" onSubmit={evento => { evento.preventDefault(); guardar(); }}><strong>{formulario === 'equipo' ? 'Nuevo equipo' : 'Nuevo líquido o insumo'}</strong><label>Nombre<input autoFocus required value={nombre} onChange={evento => setNombre(evento.target.value)} placeholder={formulario === 'equipo' ? 'Ej. Analizador hematológico' : 'Ej. Agua destilada'} /></label>{formulario === 'equipo' ? <label>Código interno<input value={codigo} onChange={evento => setCodigo(evento.target.value)} placeholder="Ej. LAB-EQ-001" /></label> : <label>Unidad<select value={unidad} onChange={evento => setUnidad(evento.target.value)}><option>unidades</option><option>ml</option><option>litros</option><option>frascos</option><option>cajas</option></select></label>}<footer><button type="button" onClick={limpiarFormulario}>Cancelar</button><button type="submit"><Icon name="check" size={15}/> Guardar</button></footer></form>}
    <div className="equipos-recargas-grillas"><section><header><div><h3>Equipos registrados</h3><span>{equipos.length} registros</span></div></header>{equipos.length ? <div className="equipos-recargas-lista">{equipos.map(equipo => <article key={equipo.id}><Icon name="asset" size={18}/><div><strong>{equipo.nombre}</strong><small>{equipo.codigo}</small></div><button type="button" aria-label={`Eliminar ${equipo.nombre}`} onClick={() => { setEquipos(actual => actual.filter(item => item.id !== equipo.id)); setAsociaciones(actual => actual.filter(item => item.equipoId !== equipo.id)); }}><Icon name="trash" size={15}/></button></article>)}</div> : <p className="equipos-recargas-vacio">Aún no hay equipos registrados.</p>}</section><section><header><div><h3>Líquidos e insumos</h3><span>{insumos.length} registros</span></div></header>{insumos.length ? <div className="equipos-recargas-lista">{insumos.map(insumo => <article key={insumo.id}><Icon name="package" size={18}/><div><strong>{insumo.nombre}</strong><small>{insumo.unidad}</small></div><button type="button" aria-label={`Eliminar ${insumo.nombre}`} onClick={() => { setInsumos(actual => actual.filter(item => item.id !== insumo.id)); setAsociaciones(actual => actual.filter(item => item.insumoId !== insumo.id)); }}><Icon name="trash" size={15}/></button></article>)}</div> : <p className="equipos-recargas-vacio">Aún no hay líquidos o insumos registrados.</p>}</section></div>
    <section className="equipos-recargas-asociar"><header><div><p>ASOCIACIÓN DE CONSUMOS</p><h3>Equipo e insumo</h3><small>Define qué líquido o insumo utiliza cada equipo.</small></div></header><div className="equipos-recargas-selector"><label>Equipo<select value={equipoId} onChange={evento => setEquipoId(evento.target.value)}><option value="">Selecciona un equipo</option>{equipos.map(equipo => <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>)}</select></label><label>Insumo o líquido<select value={insumoId} onChange={evento => setInsumoId(evento.target.value)}><option value="">Selecciona un insumo</option>{insumos.map(insumo => <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>)}</select></label><button type="button" disabled={!equipoId || !insumoId} onClick={asociar}><Icon name="plus" size={16}/> Asociar</button></div>{asociaciones.length ? <div className="equipos-recargas-asociaciones">{asociaciones.map(asociacion => { const equipo = equipos.find(item => item.id === asociacion.equipoId); const insumo = insumos.find(item => item.id === asociacion.insumoId); return equipo && insumo ? <article key={`${asociacion.equipoId}-${asociacion.insumoId}`}><span><Icon name="asset" size={15}/>{equipo.nombre}</span><Icon name="arrowRight" size={16}/><span><Icon name="package" size={15}/>{insumo.nombre}</span><button type="button" aria-label={`Quitar asociación entre ${equipo.nombre} e ${insumo.nombre}`} onClick={() => setAsociaciones(actual => actual.filter(item => item !== asociacion))}><Icon name="close" size={14}/></button></article> : null; })}</div> : <p className="equipos-recargas-vacio">Registra un equipo y un insumo para crear la primera asociación.</p>}</section>
  </section>;
}
