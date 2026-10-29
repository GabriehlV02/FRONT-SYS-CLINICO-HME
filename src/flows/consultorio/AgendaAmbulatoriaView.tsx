import { useEffect, useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import { apiFetch } from '../../radius/api';
import { obtenerSignosVitales, suscribirSignosVitales } from '../triaje/registroSignosVitales';
import './AgendaAmbulatoriaView.css';
import './AgendaAmbulatoriaViewAlineacion.css';

export type CitaConfirmada = { id: string; paciente: string; ci: string; doctor: string; especialidad: string; fecha: string; hora: string; nombre?: string; apellidos?: string; domicilio?: string; edad?: string | number; fechaNacimiento?: string };
const fechaHoy = () => new Date().toLocaleDateString('en-CA');
const citasEjemplo: CitaConfirmada[] = [
  ['agenda-demo-1', '08:00', 'María Fernanda Rojas', '4839201', 'Medicina general'],
  ['agenda-demo-2', '08:30', 'Carlos Mendoza López', '7281044', 'Control médico'],
  ['agenda-demo-3', '09:15', 'Ana Rodríguez Vargas', '6102837', 'Consulta ambulatoria'],
  ['agenda-demo-4', '10:00', 'Jorge Quiroga Salinas', '5948216', 'Seguimiento clínico'],
  ['agenda-demo-5', '11:30', 'Sofía Castillo Flores', '7013659', 'Consulta general'],
].map(([id, hora, paciente, ci, especialidad]) => ({ id, hora, paciente, ci, especialidad, fecha: fechaHoy(), doctor: 'Agenda ambulatoria', ...(id === 'agenda-demo-3' ? { nombre: 'Ana', apellidos: 'Rodríguez Vargas', edad: 28, fechaNacimiento: '22 de mayo de 1998', domicilio: 'Av. Busch N.º 1250, La Paz' } : {}) }));

export function AgendaAmbulatoriaView({ medico, onAtender }: { medico: string; onAtender?: (cita: CitaConfirmada) => void }) {
  const [citas, setCitas] = useState<CitaConfirmada[]>(citasEjemplo.slice(2));
  const [atendidas, setAtendidas] = useState<Set<string>>(() => new Set());
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAtendidas, setBusquedaAtendidas] = useState('');

  useEffect(() => {
    const cancelarSuscripcion = suscribirSignosVitales(() => setCitas((actuales) => [...actuales]));
    return () => { cancelarSuscripcion(); };
  }, []);
  useEffect(() => { void apiFetch('/api/citas').then(async (response) => {
    if (!response.ok) return;
    const datos = await response.json() as Array<CitaConfirmada & { estado: string }>;
    setCitas([...citasEjemplo.slice(2), ...datos.filter((cita) => cita.estado.toLowerCase() === 'confirmada')]);
  }).catch(() => undefined); }, []);

  const visibles = useMemo(() => citas.filter((cita) => !medico || medico === 'Administrador' || cita.doctor === medico || cita.doctor === 'Agenda ambulatoria')
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)), [citas, medico]);
  const coincide = (cita: CitaConfirmada, texto: string) => `${cita.paciente} ${cita.ci} ${cita.doctor} ${cita.especialidad}`.toLocaleLowerCase().includes(texto.trim().toLocaleLowerCase());
  const pendientes = visibles.filter((cita) => !atendidas.has(cita.id) && coincide(cita, busqueda));
  const atendidasHoy = visibles.filter((cita) => atendidas.has(cita.id) && coincide(cita, busquedaAtendidas));
  const atender = (cita: CitaConfirmada) => { setAtendidas((actuales) => new Set(actuales).add(cita.id)); onAtender?.(cita); };
  const signosRegistrados = (cita: CitaConfirmada) => Object.values(obtenerSignosVitales(cita.ci) ?? {}).some(Boolean);

  return <section className="agenda-ambulatoria" aria-label="Agenda de pacientes ambulatorios confirmados">
    <div className="agenda-herramientas">
      <label><Icon name="search" size={17} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por paciente, CI o médico" aria-label="Buscar consulta confirmada" /></label>
      <span><Icon name="calendar" size={17} /> {visibles.length} confirmadas</span>
    </div>
    <div className="agenda-ambulatoria-tablero">
      <section className="agenda-cola panel">
        <header><span>CONSULTA</span><span>PACIENTE</span><span>MÉDICO / ESPECIALIDAD</span><span>SIGNOS VITALES</span><span>ACCIÓN</span></header>
        {pendientes.length ? pendientes.map((cita) => <article key={cita.id}>
          <time>{cita.hora}</time>
          <div><strong>{cita.paciente}</strong><small>CI {cita.ci}</small></div>
          <div className="agenda-medico"><strong>{cita.doctor}</strong><small>{cita.especialidad || 'Consulta ambulatoria'}</small></div>
          <span className={`agenda-signos ${signosRegistrados(cita) ? 'registrados' : 'pendientes'}`}>{signosRegistrados(cita) ? 'Registrados' : 'Pendientes de registro'}</span>
          <button type="button" onClick={() => atender(cita)}><Icon name="userCheck" size={15} /> Atender</button>
        </article>) : <div className="agenda-cola-vacia"><Icon name="calendar" size={25} /><strong>No hay consultas por atender</strong><small>Las citas confirmadas aparecerán en esta lista.</small></div>}
      </section>
      <aside className="agenda-lateral agenda-atendidas">
        <header><div><p>ATENDIDOS HOY</p><strong>Consultas realizadas</strong></div><span>{atendidasHoy.length}</span></header>
        <label className="agenda-buscar-atendidas"><Icon name="search" size={15} /><input value={busquedaAtendidas} onChange={(event) => setBusquedaAtendidas(event.target.value)} placeholder="Buscar atendido..." /></label>
        {atendidasHoy.length ? <div>{atendidasHoy.map((cita) => <article key={cita.id}><span className="agenda-iniciales">{cita.paciente.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}</span><div><strong>{cita.paciente}</strong><small>Consulta {cita.hora}</small><small>{cita.especialidad || 'Consulta ambulatoria'}</small></div><Icon name="check" size={16} /></article>)}</div> : <p>Aún no hay consultas atendidas.</p>}
      </aside>
    </div>
  </section>;
}
