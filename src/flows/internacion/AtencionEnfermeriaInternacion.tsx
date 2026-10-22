import { useEffect, useRef, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { actualizarInternacion, type RegistroInternacion } from './registroInternaciones';
import './AtencionEnfermeriaInternacion.css';

export function AtencionEnfermeriaInternacion({ paciente, onVolver }: { paciente: RegistroInternacion; onVolver: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [editando, setEditando] = useState(false);
  const [sala, setSala] = useState(paciente.sala ?? '');
  const [cama, setCama] = useState(paciente.cama ?? '');
  const [error, setError] = useState('');
  const datos = paciente.datosPaciente ?? {};
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
    <section className="enfermeria-paciente-ficha">
      <header>
        <div className="enfermeria-paciente-identidad"><span className="enfermeria-paciente-icono"><Icon name="patient" size={25} /></span><div><h2 id="enfermeria-paciente-titulo" ref={titulo} tabIndex={-1}>{paciente.paciente}</h2><p>Atención de enfermería · HC-{paciente.ci || 'Sin registro'}</p></div></div>
        <span className="enfermeria-paciente-estado">Internado</span>
      </header>
      <dl className="enfermeria-paciente-contexto">
        <div><dt>Sala</dt><dd>{paciente.sala || 'Sin asignar'}</dd></div>
        <div><dt>Cama</dt><dd>{paciente.cama || 'Sin asignar'}</dd></div>
        <div><dt>Fecha de ingreso</dt><dd>{paciente.fechaIngreso || paciente.fecha || 'Sin registro'}</dd></div>
        <div><dt>Médico responsable</dt><dd>{paciente.medico || 'Sin asignar'}</dd></div>
      </dl>
    </section>
    <div className="enfermeria-paciente-detalles">
      <section><h3>Información de internación</h3><dl>
        <div><dt>Motivo de ingreso</dt><dd>{paciente.motivo || 'Sin registro'}</dd></div>
        <div><dt>Servicio</dt><dd>{paciente.servicio || 'Sin registro'}</dd></div>
        <div><dt>Observaciones</dt><dd>{paciente.observaciones || 'Sin observaciones registradas'}</dd></div>
      </dl></section>
      <section><h3>Familiar responsable</h3><dl>
        <div><dt>Nombre</dt><dd>{datos.responsableNombre || datos.responsable || 'Sin registro'}</dd></div>
        <div><dt>Teléfono</dt><dd>{datos.responsableTelefono || 'Sin registro'}</dd></div>
        <div><dt>Documento</dt><dd>{datos.responsableCi || 'Sin registro'}</dd></div>
      </dl></section>
    </div>
    <section className="enfermeria-paciente-ubicacion">
      <header><div><h3>Ubicación del paciente</h3><p>{paciente.tipoSala || 'Tipo de sala sin registrar'}</p></div>{!editando && <button type="button" onClick={() => { setSala(paciente.sala ?? ''); setCama(paciente.cama ?? ''); setError(''); setEditando(true); }}>Actualizar sala y cama</button>}</header>
      {editando && <form onSubmit={guardarUbicacion}><label>Sala<input required autoFocus value={sala} onChange={e => setSala(e.target.value)} /></label><label>Cama<input required value={cama} onChange={e => setCama(e.target.value)} /></label>{error && <p role="alert">{error}</p>}<footer><button type="button" onClick={() => setEditando(false)}>Cancelar</button><button type="submit" disabled={!sala.trim() || !cama.trim()}>Guardar ubicación</button></footer></form>}
    </section>
  </section>;
}
