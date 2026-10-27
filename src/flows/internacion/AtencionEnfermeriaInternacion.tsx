import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { actualizarInternacion, type RegistroInternacion } from './registroInternaciones';
import { leerSolicitudesLaboratorio, suscribirLaboratorio } from '../laboratorio/almacenLaboratorio';
import './AtencionEnfermeriaInternacion.css';

export function AtencionEnfermeriaInternacion({ paciente, onVolver }: { paciente: RegistroInternacion; onVolver: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [editando, setEditando] = useState(false);
  const [sala, setSala] = useState(paciente.sala ?? '');
  const [cama, setCama] = useState(paciente.cama ?? '');
  const [error, setError] = useState('');
  const [subvista, setSubvista] = useState<'evolucion' | 'indicaciones'>('evolucion');
  const solicitudesLaboratorio = useSyncExternalStore(suscribirLaboratorio, leerSolicitudesLaboratorio, leerSolicitudesLaboratorio);
  const datos = paciente.datosPaciente ?? {};
  const responsable = datos.responsableNombre || datos.responsable || 'Sin registro';
  const telefonoResponsable = datos.responsableTelefono || 'Sin teléfono';
  const fechaIngreso = paciente.fechaIngreso || paciente.fecha;
  const fechaVisible = (() => {
    if (!fechaIngreso) return 'Sin registro';
    if (/^\d{4}-\d{2}-\d{2}/.test(fechaIngreso)) return new Date(`${fechaIngreso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-BO');
    const partes = fechaIngreso.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (partes) return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1])).toLocaleDateString('es-BO');
    const valor = new Date(fechaIngreso);
    return Number.isNaN(valor.getTime()) ? fechaIngreso : valor.toLocaleDateString('es-BO');
  })();
  const indicacionesLaboratorio = solicitudesLaboratorio.filter(solicitud => solicitud.origen === 'internacion' && solicitud.ci.trim() === paciente.ci.trim());
  useEffect(() => { titulo.current?.focus(); }, []);

  function guardarUbicacion(event: FormEvent) {
    event.preventDefault();
    try {
      actualizarInternacion(paciente.id, { sala: sala.trim(), cama: cama.trim(), fechaIngreso: paciente.fechaIngreso });
      setError('');
      setEditando(false);
    } catch (problema) { setError((problema as Error).message); }
  }

  return <section className="enfermeria-paciente" aria-labelledby="enfermeria-paciente-titulo">
    <button type="button" className="enfermeria-paciente-volver" onClick={onVolver}><Icon name="chevronLeft" size={17} /> Volver a pacientes internados</button>
    <section className="enfermeria-paciente-resumen" aria-label="Información de atención del paciente">
      <header>
        <div className="enfermeria-resumen-identidad"><h2 id="enfermeria-paciente-titulo" ref={titulo} tabIndex={-1}>{paciente.paciente}</h2><span>| HC-{paciente.ci || 'S/R'} · Internado</span></div>
        <div className="enfermeria-resumen-contexto"><div><span>Fecha de ingreso</span><strong>{fechaVisible}</strong></div><div><span>Ubicación actual</span><strong>Sala {paciente.sala || '—'} · Cama {paciente.cama || '—'}</strong></div></div>
      </header>
      <div className="enfermeria-resumen-datos">
        <article><span><Icon name="patient" size={16}/></span><div><small>Familiar responsable</small><strong>{responsable} · {telefonoResponsable}</strong></div></article>
        <article><span><Icon name="userCheck" size={16}/></span><div><small>Médico responsable</small><strong>{paciente.medico || 'Sin asignar'}</strong></div></article>
        <article><span><Icon name="fileText" size={16}/></span><div><small>Diagnóstico de ingreso</small><strong>{paciente.motivo || 'Sin registro'}</strong></div></article>
      </div>
    </section>
    <section className="enfermeria-paciente-subvistas">
      <nav aria-label="Información clínica del paciente">
        <button type="button" className={subvista === 'evolucion' ? 'activa' : ''} onClick={() => setSubvista('evolucion')}><Icon name="fileText" size={16}/> Evolución del paciente</button>
        <button type="button" className={subvista === 'indicaciones' ? 'activa' : ''} onClick={() => setSubvista('indicaciones')}><Icon name="lab" size={16}/> Indicaciones médicas <b>{indicacionesLaboratorio.length}</b></button>
      </nav>
      {subvista === 'evolucion' && <div className="enfermeria-evolucion">
        <section className="enfermeria-evolucion-datos"><article><small>Diagnóstico de ingreso</small><strong>{paciente.motivo || 'Sin registro'}</strong></article><article><small>Servicio</small><strong>{paciente.servicio || 'Sin registro'}</strong></article><article><small>Observaciones</small><strong>{paciente.observaciones || 'Sin observaciones registradas'}</strong></article></section>
        <section className="enfermeria-paciente-ubicacion">
          <header><div><h3>Ubicación del paciente</h3><p>{paciente.tipoSala || 'Tipo de sala sin registrar'}</p></div>{!editando && <button type="button" onClick={() => { setSala(paciente.sala ?? ''); setCama(paciente.cama ?? ''); setError(''); setEditando(true); }}>Actualizar sala y cama</button>}</header>
          {editando && <form onSubmit={guardarUbicacion}><label>Sala<input required autoFocus value={sala} onChange={e => setSala(e.target.value)} /></label><label>Cama<input required value={cama} onChange={e => setCama(e.target.value)} /></label>{error && <p role="alert">{error}</p>}<footer><button type="button" onClick={() => setEditando(false)}>Cancelar</button><button type="submit" disabled={!sala.trim() || !cama.trim()}>Guardar ubicación</button></footer></form>}
        </section>
      </div>}
      {subvista === 'indicaciones' && <section className="enfermeria-indicaciones">
        <header><div><span>ÓRDENES ACTIVAS</span><h3>Indicaciones médicas del paciente</h3></div><b>{indicacionesLaboratorio.length}</b></header>
        {indicacionesLaboratorio.length ? <ul>{indicacionesLaboratorio.map(solicitud => <li key={solicitud.id}><span><Icon name="lab" size={17}/></span><div><strong>Orden de laboratorio</strong><small>{solicitud.estudios.map(estudio => estudio.nombre).join(' · ')}</small><em>Solicitada por {solicitud.solicitadoPor || solicitud.medico || 'Médico de internación'}</em></div><time>{new Date(solicitud.fecha).toLocaleDateString('es-BO')}</time><b className={`estado-${solicitud.estado}`}>{solicitud.estado === 'en_proceso' ? 'En proceso' : solicitud.estado === 'completado' ? 'Completada' : solicitud.estado === 'anulado' ? 'Anulada' : 'Pendiente'}</b></li>)}</ul> : <div className="enfermeria-indicaciones-vacio"><Icon name="fileText" size={25}/><strong>Sin indicaciones médicas</strong><small>Las órdenes emitidas por el médico aparecerán aquí.</small></div>}
      </section>}
    </section>
  </section>;
}
