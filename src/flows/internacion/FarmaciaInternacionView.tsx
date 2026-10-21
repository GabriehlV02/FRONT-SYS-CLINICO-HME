import { useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import { obtenerEpisodios, suscribirEpisodios } from '../consultorio/registroHistoria';
import { leerInternaciones, suscribirInternaciones, actualizarInternacion, type RegistroInternacion } from './registroInternaciones';
import { leerDescargos, registrarRecepcionDescargo, suscribirDescargos } from './registroDescargos';
import './FarmaciaInternacionView.css';

type Subvista = 'descargos' | 'internados';
type EstadoFiltro = 'todos' | 'pendientes' | 'recibidos';
type SolicitudDescargo = {
  id: string;
  paciente: string;
  ci: string;
  medico: string;
  fecha: string;
  medicamentos: { id: string; nombre: string; dosis: string; frecuencia: string; cantidad: string; via: string }[];
  estado: 'pendiente' | 'recibido';
  recibidoPor?: string;
  recibidoEn?: string;
};

const opcionesSubvista: { id: Subvista; nombre: string; icono: 'package' | 'patient' }[] = [
  { id: 'descargos', nombre: 'Descargos', icono: 'package' },
  { id: 'internados', nombre: 'Internados', icono: 'patient' },
];

const textoNormalizado = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

function fechaParaEditar(fecha: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
  const partes = fecha.split('/');
  return partes.length === 3 ? `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}` : '';
}

function fechaVisible(fecha: string) {
  const fechaISO = fechaParaEditar(fecha);
  if (!fechaISO) return fecha || 'Sin registrar';
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

function ubicacion(internacion: RegistroInternacion) {
  return `${internacion.sala ?? ''}${internacion.cama ?? ''}` || 'Sin asignar';
}

export function FarmaciaInternacionView({ enfermera }: { enfermera: string }) {
  const [subvista, setSubvista] = useState<Subvista>('descargos');
  const navegacion = <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Internación">
    {opcionesSubvista.map(item => <button key={item.id} type="button" aria-current={subvista === item.id ? 'page' : undefined} className={subvista === item.id ? 'activo' : ''} onClick={() => setSubvista(item.id)}>
      <span><Icon name={item.icono} size={17} /></span><strong>{item.nombre}</strong>
    </button>)}
  </HorizontalSubvistaNav>;

  return <section className="farmacia-internacion-vista">
    {navegacion}
    {subvista === 'descargos' ? <VistaDescargos enfermera={enfermera} /> : <VistaInternados />}
  </section>;
}

function VistaDescargos({ enfermera }: { enfermera: string }) {
  const internaciones = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const episodios = useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const estados = useSyncExternalStore(suscribirDescargos, leerDescargos, leerDescargos);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<EstadoFiltro>('pendientes');
  const [seleccionada, setSeleccionada] = useState<SolicitudDescargo | null>(null);
  const pacientesInternados = useMemo(() => new Map(internaciones
    .filter(item => item.estado === 'confirmada')
    .map(item => [item.ci, fechaParaEditar(item.fechaIngreso || item.fecha)])), [internaciones]);
  const solicitudes = useMemo(() => episodios.flatMap(episodio => {
    const fechaIngreso = pacientesInternados.get(episodio.paciente.ci);
    if (!fechaIngreso) return [];
    return episodio.recetas.flatMap((receta, indice) => {
      const medicamentos = receta.receta?.medicamentos ?? [];
      if (!medicamentos.length) return [];
      const id = receta.receta?.id || `${episodio.episodioId}-${indice}`;
      const fecha = receta.receta?.fecha || receta.fecha || episodio.fecha;
      const fechaSolicitud = fechaParaEditar(fecha);
      if (!fechaSolicitud || fechaSolicitud < fechaIngreso) return [];
      const estado = estados[id];
      return [{
        id,
        paciente: episodio.paciente.paciente,
        ci: episodio.paciente.ci,
        medico: receta.medico || episodio.medico,
        fecha,
        medicamentos: medicamentos.map(item => ({
          id: item.id,
          nombre: item.nombre,
          dosis: item.dosis,
          frecuencia: item.frecuencia,
          cantidad: item.cantidad,
          via: item.via,
        })),
        estado: estado?.estado ?? 'pendiente',
        recibidoPor: estado?.recibidoPor,
        recibidoEn: estado?.recibidoEn,
      }];
    });
  }), [episodios, estados, pacientesInternados]);
  const visibles = solicitudes.filter(solicitud => {
    const coincideEstado = filtro === 'todos' || (filtro === 'pendientes' ? solicitud.estado === 'pendiente' : solicitud.estado === 'recibido');
    const termino = textoNormalizado(busqueda.trim());
    const coincideBusqueda = !termino || textoNormalizado(`${solicitud.paciente} ${solicitud.ci} ${solicitud.medico} ${solicitud.medicamentos.map(item => item.nombre).join(' ')}`).includes(termino);
    return coincideEstado && coincideBusqueda;
  });
  const pendientes = solicitudes.filter(item => item.estado === 'pendiente').length;
  const recibidas = solicitudes.length - pendientes;

  return <section className="fi-panel" aria-label="Solicitudes de dispensación">
    <header className="fi-encabezado">
      <div><p>FARMACIA · INTERNACIÓN</p><h2>Descargos</h2><small>Solicitudes de medicamentos e insumos recetados a pacientes internados.</small></div>
      <div className="fi-resumen"><span><strong>{pendientes}</strong> pendientes</span><span><strong>{recibidas}</strong> recibidas</span></div>
    </header>
    <div className="fi-controles">
      <label className="fi-buscador"><Icon name="search" size={17} /><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar paciente, CI, médico o producto" aria-label="Buscar solicitudes" /></label>
      <div className="fi-filtros" role="group" aria-label="Filtrar solicitudes">
        {([['pendientes', 'Pendientes'], ['recibidos', 'Recibidas'], ['todos', 'Todas']] as const).map(([id, texto]) => <button type="button" key={id} className={filtro === id ? 'activo' : ''} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{texto}</button>)}
      </div>
    </div>
    {visibles.length ? <div className="fi-lista-descargos">
      {visibles.map(solicitud => <article className="fi-descargo" key={solicitud.id}>
        <div className="fi-descargo-principal"><div className="fi-descargo-paciente"><span className="fi-icono"><Icon name="patient" size={18} /></span><div><strong>{solicitud.paciente}</strong><small>CI {solicitud.ci} · Dr. {solicitud.medico}</small><small>Solicitud · {fechaVisible(solicitud.fecha)}</small></div></div>
          <span className={`fi-estado ${solicitud.estado}`}>{solicitud.estado === 'pendiente' ? 'Pendiente' : 'Recibida'}</span>
        </div>
        <div className="fi-productos">{solicitud.medicamentos.map(medicamento => <div key={medicamento.id}><strong>{medicamento.nombre || 'Producto sin nombre'}</strong><small>{[medicamento.dosis, medicamento.via, medicamento.frecuencia, medicamento.cantidad && `Cantidad: ${medicamento.cantidad}`].filter(Boolean).join(' · ') || 'Sin indicaciones adicionales'}</small></div>)}</div>
        {solicitud.estado === 'recibido' && <small className="fi-recibido-info">Recibido por {solicitud.recibidoPor || 'Enfermería'}{solicitud.recibidoEn ? ` · ${new Date(solicitud.recibidoEn).toLocaleString('es-BO')}` : ''}</small>}
        <div className="fi-acciones"><button type="button" className="fi-secundario" onClick={() => setSeleccionada(solicitud)}><Icon name="eye" size={15} /> Ver solicitud</button>{solicitud.estado === 'pendiente' && <button type="button" className="fi-primario" onClick={() => registrarRecepcionDescargo(solicitud.id, enfermera)}><Icon name="check" size={15} /> Registrar recepción</button>}</div>
      </article>)}
    </div> : <div className="fi-vacio"><span><Icon name="package" size={27} /></span><strong>{busqueda ? 'No hay solicitudes que coincidan' : filtro === 'pendientes' ? 'No hay descargos pendientes' : filtro === 'recibidos' ? 'Aún no hay descargos recibidos' : 'No hay solicitudes de dispensación'}</strong><small>{busqueda ? 'Prueba con otro paciente, CI, médico o producto.' : 'Las recetas médicas de pacientes internados aparecerán aquí para su entrega por enfermería.'}</small></div>}
    {seleccionada && <div className="fi-modal-fondo" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSeleccionada(null); }}><section className="fi-modal" role="dialog" aria-modal="true" aria-labelledby="fi-detalle-titulo">
      <header><div><p>DETALLE DE SOLICITUD</p><h3 id="fi-detalle-titulo">{seleccionada.paciente}</h3><small>CI {seleccionada.ci} · Médico {seleccionada.medico}</small></div><button type="button" aria-label="Cerrar detalle" onClick={() => setSeleccionada(null)}>×</button></header>
      <dl><div><dt>Fecha</dt><dd>{fechaVisible(seleccionada.fecha)}</dd></div><div><dt>Estado</dt><dd>{seleccionada.estado === 'pendiente' ? 'Pendiente de recepción' : 'Recibida'}</dd></div></dl>
      <h4>Medicamentos e insumos</h4><ul>{seleccionada.medicamentos.map(item => <li key={item.id}><strong>{item.nombre}</strong><span>{[item.dosis, item.via, item.frecuencia, item.cantidad && `Cantidad: ${item.cantidad}`].filter(Boolean).join(' · ')}</span></li>)}</ul>
      <footer><button type="button" className="fi-secundario" onClick={() => setSeleccionada(null)}>Cerrar</button>{seleccionada.estado === 'pendiente' && <button type="button" className="fi-primario" onClick={() => { registrarRecepcionDescargo(seleccionada.id, enfermera); setSeleccionada(null); }}>Confirmar recepción</button>}</footer>
    </section></div>}
  </section>;
}

function VistaInternados() {
  const internaciones = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<RegistroInternacion | null>(null);
  const [editando, setEditando] = useState<RegistroInternacion | null>(null);
  const [sala, setSala] = useState('');
  const [cama, setCama] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [error, setError] = useState('');
  const internados = internaciones.filter(item => item.estado === 'confirmada');
  const visibles = internados.filter(item => textoNormalizado(`${item.paciente} ${item.ci} ${ubicacion(item)}`).includes(textoNormalizado(busqueda.trim())));

  const abrirEdicion = (internacion: RegistroInternacion) => {
    setEditando(internacion);
    setSala(internacion.sala ?? '');
    setCama(internacion.cama ?? '');
    setFechaIngreso(fechaParaEditar(internacion.fechaIngreso || internacion.fecha));
    setError('');
  };
  const guardarEdicion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editando || !sala.trim() || !cama.trim() || !fechaIngreso) {
      setError('Completa la fecha de ingreso, la sala y la cama.');
      return;
    }
    try { actualizarInternacion(editando.id, { sala: sala.trim(), cama: cama.trim(), fechaIngreso }); }
    catch (error) { setError((error as Error).message); return; }
    setEditando(null);
  };

  return <section className="fi-panel" aria-label="Pacientes internados">
    <header className="fi-encabezado"><div><p>FARMACIA · INTERNACIÓN</p><h2>Pacientes internados</h2><small>Consulta y administra los datos de ingreso y ubicación.</small></div><span className="fi-total"><Icon name="patient" size={17} /> {internados.length} internado{internados.length === 1 ? '' : 's'}</span></header>
    <div className="fi-controles"><label className="fi-buscador"><Icon name="search" size={17} /><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por nombre, CI o sala/cama" aria-label="Buscar pacientes internados" /></label></div>
    {visibles.length ? <div className="fi-tabla-wrap"><table className="fi-tabla"><thead><tr><th>Paciente</th><th>CI</th><th>Fecha de ingreso</th><th>Sala / cama</th><th>Acciones</th></tr></thead><tbody>{visibles.map(internacion => <tr key={internacion.id}><td><strong>{internacion.paciente}</strong></td><td>{internacion.ci}</td><td>{fechaVisible(internacion.fechaIngreso || internacion.fecha)}</td><td><span className="fi-ubicacion">{ubicacion(internacion)}</span></td><td><div className="fi-acciones-tabla"><button type="button" onClick={() => setSeleccionada(internacion)}><Icon name="eye" size={15} /> Ver</button><button type="button" onClick={() => abrirEdicion(internacion)}><Icon name="edit" size={15} /> Editar</button></div></td></tr>)}</tbody></table></div> : <div className="fi-vacio"><span><Icon name="patient" size={27} /></span><strong>{busqueda ? 'No hay pacientes que coincidan' : 'No hay pacientes internados'}</strong><small>{busqueda ? 'Prueba con otro nombre, CI o sala/cama.' : 'Los ingresos confirmados por Enfermería aparecerán en este listado.'}</small></div>}
    {seleccionada && <div className="fi-modal-fondo" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSeleccionada(null); }}><section className="fi-modal" role="dialog" aria-modal="true" aria-labelledby="fi-paciente-titulo">
      <header><div><p>DATOS DE INTERNACIÓN</p><h3 id="fi-paciente-titulo">{seleccionada.paciente}</h3><small>CI {seleccionada.ci}</small></div><button type="button" aria-label="Cerrar detalle" onClick={() => setSeleccionada(null)}>×</button></header>
      <dl><div><dt>Fecha de ingreso</dt><dd>{fechaVisible(seleccionada.fechaIngreso || seleccionada.fecha)}</dd></div><div><dt>Sala / cama</dt><dd>{ubicacion(seleccionada)}</dd></div><div><dt>Médico responsable</dt><dd>{seleccionada.medico || 'Sin registrar'}</dd></div><div><dt>Tipo de sala</dt><dd>{seleccionada.tipoSala || 'Sin registrar'}</dd></div><div><dt>Motivo</dt><dd>{seleccionada.motivo || 'Sin registrar'}</dd></div>{seleccionada.observaciones && <div><dt>Observaciones</dt><dd>{seleccionada.observaciones}</dd></div>}</dl>
      <footer><button type="button" className="fi-secundario" onClick={() => setSeleccionada(null)}>Cerrar</button><button type="button" className="fi-primario" onClick={() => { setSeleccionada(null); abrirEdicion(seleccionada); }}><Icon name="edit" size={15} /> Editar internación</button></footer>
    </section></div>}
    {editando && <div className="fi-modal-fondo" role="presentation"><form className="fi-modal" role="dialog" aria-modal="true" aria-labelledby="fi-editar-titulo" onSubmit={guardarEdicion}>
      <header><div><p>ACTUALIZAR DATOS</p><h3 id="fi-editar-titulo">{editando.paciente}</h3><small>CI {editando.ci}</small></div><button type="button" aria-label="Cerrar edición" onClick={() => setEditando(null)}>×</button></header>
      {error && <p className="fi-error" role="alert">{error}</p>}
      <div className="fi-formulario"><label>Fecha de ingreso<input type="date" required value={fechaIngreso} onChange={event => setFechaIngreso(event.target.value)} /></label><label>Sala<input required value={sala} onChange={event => setSala(event.target.value)} placeholder="Ej.: 107" /></label><label>Cama<input required value={cama} onChange={event => setCama(event.target.value)} placeholder="Ej.: A" /></label></div>
      <footer><button type="button" className="fi-secundario" onClick={() => setEditando(null)}>Cancelar</button><button type="submit" className="fi-primario">Guardar cambios</button></footer>
    </form></div>}
  </section>;
}
