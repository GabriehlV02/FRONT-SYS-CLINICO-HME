import { useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { confirmarInternacion, leerInternaciones, suscribirInternaciones, type RegistroInternacion } from './registroInternaciones';
import './EnfermeraInternacionView.css';
import './EnfermeraInternacionTabla.css';

type Subvista = 'internados' | 'altas';

export function EnfermeraInternacionView({ subvista }: { subvista: Subvista }) {
  const registros = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const [seleccionada, setSeleccionada] = useState<RegistroInternacion | null>(null);
  const [sala, setSala] = useState('');
  const [cama, setCama] = useState('');
  const [tipoSala, setTipoSala] = useState('Sala compartida');
  const [busqueda, setBusqueda] = useState('');
  const pendientes = registros.filter(item => item.estado === 'preinternacion');
  const internados = registros.filter(item => item.estado === 'confirmada');
  const altas = registros.filter(item => item.estado === 'alta');
  const pacientesVisibles = subvista === 'internados' ? internados : altas;
  const termino = busqueda.trim().toLocaleLowerCase('es');
  const pacientesFiltrados = pacientesVisibles.filter(item => !termino || [item.paciente, item.ci, item.sala, item.cama, item.medico].some(valor => valor?.toLocaleLowerCase('es').includes(termino)));

  const confirmar = () => {
    if (!seleccionada || !sala.trim() || !cama.trim()) return;
    confirmarInternacion(seleccionada.id, { sala: sala.trim(), cama: cama.trim(), tipoSala });
    setSeleccionada(null);
  };

  return <section className="internacion-enfermeria" aria-label="Enfermería de internación">
    {subvista === 'internados' && pendientes.length > 0 && <section className="internacion-pendientes"><div><strong>Preinternaciones pendientes</strong><small>Una orden médica todavía no abre una cuenta. Confírmala asignando sala y cama.</small></div>{pendientes.map(item => <article key={item.id}><div><b>{item.paciente}</b><small>CI {item.ci} · Orden de {item.medico}</small><em>Preinternación</em></div><button type="button" onClick={() => { setSeleccionada(item); setSala(''); setCama(''); }}>Asignar sala y cama</button></article>)}</section>}
    <section className="internacion-listado">
      <div className="internacion-herramientas">
        <label><Icon name="search" size={18} /><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por paciente, CI, sala o cama" aria-label="Buscar paciente internado" /></label>
        {subvista === 'internados' && <button type="button" onClick={() => pendientes[0] && setSeleccionada(pendientes[0])}><Icon name="plus" size={17} /> Internar paciente</button>}
      </div>
      <div className="internacion-listado-titulo"><div><p>{subvista === 'internados' ? 'PACIENTES INTERNADOS' : 'ALTAS HOSPITALARIAS'}</p><h3>{subvista === 'internados' ? 'Listado de sala y cama' : 'Pacientes dados de alta este mes'}</h3></div><small>{subvista === 'internados' ? 'La cuenta se habilita al confirmar el ingreso.' : 'Historial clínico de altas confirmadas.'}</small></div>
      {subvista === 'internados' && pacientesFiltrados.length > 0 && <div className="internacion-tabla-cabecera"><span>SALA</span><span>CAMA</span><span>PACIENTE</span><span>HISTORIA CLÍNICA</span><span>MÉDICO</span><span>FECHA DE INGRESO</span><span>ESTADO</span><span>ACCIONES</span></div>}
      {subvista === 'altas' && pacientesFiltrados.length > 0 && <div className="internacion-altas-cabecera"><span>PACIENTE</span><span>HISTORIA CLÍNICA</span><span>MÉDICO RESPONSABLE</span><span>SALA Y CAMA</span><span>FECHA DE INGRESO</span><span>FECHA DE ALTA</span><span>ESTADO</span></div>}
      {pacientesFiltrados.length ? pacientesFiltrados.map(item => subvista === 'internados' ? <article className="internacion-fila-tabla" key={item.id}><b className="internacion-chip">{item.sala || '—'}</b><b className="internacion-chip">{item.cama || '—'}</b><div className="internacion-paciente"><span><Icon name="patient" size={18} /></span><strong>{item.paciente}</strong></div><strong>HC-{item.ci}</strong><strong>{item.medico}</strong><strong>{item.fechaIngreso || item.fecha}</strong><em>Internado</em><button type="button" onClick={() => setSeleccionada(item)}><Icon name="patient" size={16} /> Atender</button></article> : <article className="internacion-alta-fila" key={item.id}><div className="internacion-paciente"><span><Icon name="patient" size={18} /></span><span><strong>{item.paciente}</strong><small>CI {item.ci}</small></span></div><strong>HC-{item.ci}</strong><strong>{item.medico}</strong><strong>Sala {item.sala || '—'} · Cama {item.cama || '—'}</strong><strong>{item.fechaIngreso || item.fecha}</strong><strong>{item.fechaAlta || 'Sin registro'}</strong><em className="alta">Alta registrada</em></article>) : <div className="internacion-listado-vacio"><Icon name={subvista === 'internados' ? 'patient' : 'check'} size={26}/><strong>{busqueda ? 'No se encontraron coincidencias' : subvista === 'internados' ? 'No hay pacientes internados' : 'No hay altas registradas'}</strong><small>{busqueda ? 'Prueba con otro nombre, CI, sala o cama.' : subvista === 'internados' ? 'Los ingresos confirmados aparecerán aquí.' : 'Las altas médicas aparecerán aquí.'}</small></div>}
    </section>
    {seleccionada && <div className="internacion-modal-fondo" role="presentation"><section className="internacion-modal" role="dialog" aria-modal="true" aria-labelledby="asignar-cama-titulo"><header><div><p>CONFIRMAR INTERNACIÓN</p><h3 id="asignar-cama-titulo">{seleccionada.paciente}</h3><small>CI {seleccionada.ci}. Al confirmar se registrará como internación y se habilitará su cuenta en Recepción.</small></div><button type="button" aria-label="Cerrar" onClick={() => setSeleccionada(null)}>×</button></header><div className="internacion-form"><label>Sala<input autoFocus value={sala} onChange={event => setSala(event.target.value)} placeholder="Ej.: 108" /></label><label>Cama<input value={cama} onChange={event => setCama(event.target.value)} placeholder="Ej.: B" /></label><label>Tipo de sala<select value={tipoSala} onChange={event => setTipoSala(event.target.value)}><option>Sala compartida</option><option>Habitación privada</option><option>Unidad de cuidados intermedios</option></select></label></div><footer><button type="button" onClick={() => setSeleccionada(null)}>Cancelar</button><button type="button" disabled={!sala.trim() || !cama.trim()} onClick={confirmar}>Confirmar ingreso</button></footer></section></div>}
  </section>;
}
