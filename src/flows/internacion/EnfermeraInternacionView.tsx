import { useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { confirmarInternacion, leerInternaciones, suscribirInternaciones, type RegistroInternacion } from './registroInternaciones';
import './EnfermeraInternacionView.css';

type Subvista = 'internados' | 'altas';

export function EnfermeraInternacionView({ subvista }: { subvista: Subvista }) {
  const registros = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const [seleccionada, setSeleccionada] = useState<RegistroInternacion | null>(null);
  const [sala, setSala] = useState('');
  const [cama, setCama] = useState('');
  const [tipoSala, setTipoSala] = useState('Sala compartida');
  const pendientes = registros.filter(item => item.estado === 'preinternacion');
  const internados = registros.filter(item => item.estado === 'confirmada');
  const altas = registros.filter(item => item.estado === 'alta');
  const pacientesVisibles = subvista === 'internados' ? internados : altas;

  const confirmar = () => {
    if (!seleccionada || !sala.trim() || !cama.trim()) return;
    confirmarInternacion(seleccionada.id, { sala: sala.trim(), cama: cama.trim(), tipoSala });
    setSeleccionada(null);
  };

  return <section className="internacion-enfermeria" aria-label="Enfermería de internación">
    <header><div><p>INTERNACIÓN</p><h2>Enfermera internación</h2><small>Seguimiento de pacientes, preinternaciones y asignación de cama.</small></div><span><Icon name="patient" size={18} /> {pendientes.length} preinternación{pendientes.length === 1 ? '' : 'es'}</span></header>
    {subvista === 'internados' && pendientes.length > 0 && <section className="internacion-pendientes"><div><strong>Preinternaciones pendientes</strong><small>Una orden médica todavía no abre una cuenta. Confírmala asignando sala y cama.</small></div>{pendientes.map(item => <article key={item.id}><div><b>{item.paciente}</b><small>CI {item.ci} · Orden de {item.medico}</small><em>Preinternación</em></div><button type="button" onClick={() => { setSeleccionada(item); setSala(''); setCama(''); }}>Asignar sala y cama</button></article>)}</section>}
    <section className="internacion-listado">
      <div className="internacion-listado-titulo"><div><p>{subvista === 'internados' ? 'PACIENTES INTERNADOS' : 'PACIENTES DADOS DE ALTA'}</p><h3>{subvista === 'internados' ? 'Listado de sala y cama' : 'Historial de internaciones finalizadas'}</h3></div><small>{subvista === 'internados' ? 'La cuenta se habilita al confirmar el ingreso.' : 'Pacientes con alta médica registrada.'}</small></div>
      {pacientesVisibles.length ? pacientesVisibles.map(item => <article key={item.id}><span><Icon name="patient" size={18} /></span><div><strong>{item.paciente}</strong><small>CI {item.ci}</small></div><div className="internacion-ubicacion"><b>{subvista === 'internados' ? `Sala ${item.sala || '—'} · Cama ${item.cama || '—'}` : `Alta: ${item.fechaAlta || 'Sin registro'}`}</b><small>{subvista === 'internados' ? item.tipoSala : `Ingreso: ${item.fechaIngreso || item.fecha}`}</small></div><em className={subvista === 'altas' ? 'alta' : undefined}>{subvista === 'internados' ? 'Internado' : 'Alta registrada'}</em></article>) : <div className="internacion-listado-vacio"><Icon name={subvista === 'internados' ? 'patient' : 'check'} size={26}/><strong>{subvista === 'internados' ? 'No hay pacientes internados' : 'No hay altas registradas'}</strong><small>{subvista === 'internados' ? 'Los ingresos confirmados aparecerán aquí.' : 'Las altas médicas aparecerán aquí.'}</small></div>}
    </section>
    {seleccionada && <div className="internacion-modal-fondo" role="presentation"><section className="internacion-modal" role="dialog" aria-modal="true" aria-labelledby="asignar-cama-titulo"><header><div><p>CONFIRMAR INTERNACIÓN</p><h3 id="asignar-cama-titulo">{seleccionada.paciente}</h3><small>CI {seleccionada.ci}. Al confirmar se registrará como internación y se habilitará su cuenta en Recepción.</small></div><button type="button" aria-label="Cerrar" onClick={() => setSeleccionada(null)}>×</button></header><div className="internacion-form"><label>Sala<input autoFocus value={sala} onChange={event => setSala(event.target.value)} placeholder="Ej.: 108" /></label><label>Cama<input value={cama} onChange={event => setCama(event.target.value)} placeholder="Ej.: B" /></label><label>Tipo de sala<select value={tipoSala} onChange={event => setTipoSala(event.target.value)}><option>Sala compartida</option><option>Habitación privada</option><option>Unidad de cuidados intermedios</option></select></label></div><footer><button type="button" onClick={() => setSeleccionada(null)}>Cancelar</button><button type="button" disabled={!sala.trim() || !cama.trim()} onClick={confirmar}>Confirmar ingreso</button></footer></section></div>}
  </section>;
}
