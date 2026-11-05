import { useProfesionales } from '../../radius/profesionales';
import { leerSesion } from '../../radius/types/sesion';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { apiFetch } from '../../radius/api';
import { obtenerSignosVitales, suscribirSignosVitales } from '../triaje/registroSignosVitales';
import { obtenerAtencionAmbulatoria, obtenerEpisodios, registrarAtencionAmbulatoria, suscribirEpisodios } from './registroHistoria';
import './AgendaAmbulatoriaView.css';
import './AgendaAmbulatoriaViewAlineacion.css';

export type CitaConfirmada = { id: string; pacienteId?: string; profesionalId?: string; paciente: string; ci: string; doctor: string; especialidad: string; fecha: string; hora: string; estado?: string; consultorio?: string; nombre?: string; apellidos?: string; domicilio?: string; edad?: string | number; fechaNacimiento?: string };
// La agenda almacena la fecha como YYYY-MM-DD. No se usa toLocaleDateString
// porque el resultado varía según el navegador y puede devolver M/D/YYYY.
const fechaHoy = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};
const fechaHoyDe = (valor: string) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};
const citasDemoDelMedico = (medico: string): CitaConfirmada[] => {
  const fecha = fechaHoy();
  return [
    { id: 'demo-consulta-001', pacienteId: 'demo-pac-001', paciente: 'María Fernanda López', ci: '6894521', doctor: medico, especialidad: 'Medicina Interna', fecha, hora: '08:00', estado: 'confirmada', consultorio: 'Consultorio 1', edad: 42, fechaNacimiento: '1984-03-14' },
    { id: 'demo-consulta-002', pacienteId: 'demo-pac-002', paciente: 'Carlos Mendoza Rojas', ci: '7459823', doctor: medico, especialidad: 'Cardiología', fecha, hora: '08:30', estado: 'confirmada', consultorio: 'Consultorio 1', edad: 55, fechaNacimiento: '1971-08-22' },
    { id: 'demo-consulta-003', pacienteId: 'demo-pac-003', paciente: 'Lucía Valdez Herrera', ci: '5128934', doctor: medico, especialidad: 'Neumología', fecha, hora: '09:30', estado: 'confirmada', consultorio: 'Consultorio 1', edad: 36, fechaNacimiento: '1990-11-05' },
    { id: 'demo-consulta-004', pacienteId: 'demo-pac-004', paciente: 'Jorge Ramírez Soria', ci: '8246175', doctor: medico, especialidad: 'Medicina Interna', fecha, hora: '10:00', estado: 'por_confirmar', consultorio: 'Consultorio 1', edad: 61, fechaNacimiento: '1965-01-28' },
    { id: 'demo-consulta-005', pacienteId: 'demo-pac-005', paciente: 'Sofía Quispe Flores', ci: '6381942', doctor: medico, especialidad: 'Pediatría', fecha, hora: '10:30', estado: 'confirmada', consultorio: 'Consultorio 1', edad: 9, fechaNacimiento: '2017-06-10' },
    { id: 'demo-consulta-006', pacienteId: 'demo-pac-006', paciente: 'Elena Paredes Vargas', ci: '4712058', doctor: medico, especialidad: 'Cardiología', fecha, hora: '11:30', estado: 'confirmada', consultorio: 'Consultorio 1', edad: 48, fechaNacimiento: '1978-12-03' },
  ];
};
export function AgendaAmbulatoriaView({ medico, onAtender }: { medico: string; onAtender?: (cita: CitaConfirmada) => void }) {
  const {profesionales}=useProfesionales();
  const profesionalActual=profesionales.find(p=>p.usuario_id===String(leerSesion()?.usuario.id));
  const [errorPacientes,setErrorPacientes]=useState('');
  const [citas, setCitas] = useState<CitaConfirmada[]>([]);
  useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAtendidas, setBusquedaAtendidas] = useState('');

  useEffect(() => {
    const cancelarSuscripcion = suscribirSignosVitales(() => setCitas((actuales) => [...actuales]));
    return () => { cancelarSuscripcion(); };
  }, []);
  useEffect(() => { if (import.meta.env.VITE_USE_API !== 'true') return; void apiFetch('/api/citas').then(async (response) => {
    if (!response.ok) throw new Error('No se pudo consultar la agenda de pacientes.');
    const datos = await response.json() as Array<CitaConfirmada & { estado: string }>;
    setCitas(datos.filter(cita => cita.estado === 'confirmada' || cita.estado === 'por_confirmar'));
  }).catch(() => undefined); }, []);
  useEffect(() => {
    setCitas(citasDemoDelMedico(medico));
    setErrorPacientes('');
  }, [medico]);

  // El backend limita la agenda del médico autenticado; este filtro evita una
  // exposición momentánea mientras se carga el perfil profesional.
  const visibles = useMemo(() => citas.filter((cita) => /administrador/i.test(medico) || (profesionalActual ? cita.profesionalId === profesionalActual.id : cita.doctor === medico))
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)), [citas, medico, profesionalActual]);
  const coincide = (cita: CitaConfirmada, texto: string) => `${cita.paciente} ${cita.ci} ${cita.doctor} ${cita.especialidad}`.toLocaleLowerCase().includes(texto.trim().toLocaleLowerCase());
  const pendientes = visibles.filter((cita) => !obtenerAtencionAmbulatoria(cita)?.finalizadaEn && coincide(cita, busqueda));
  const atendidasHoy = visibles.filter((cita) => { const finalizada = obtenerAtencionAmbulatoria(cita)?.finalizadaEn; return finalizada && fechaHoy() === fechaHoyDe(finalizada) && coincide(cita, busquedaAtendidas); });
  const atender = (cita: CitaConfirmada) => { registrarAtencionAmbulatoria(cita, medico); onAtender?.(cita); };
  const signosRegistrados = (cita: CitaConfirmada) => Object.values(obtenerSignosVitales(cita.ci) ?? {}).some(Boolean);

  return <section className="agenda-ambulatoria" aria-label="Consultas ambulatorias pendientes de atención">{errorPacientes && <p role="alert">{errorPacientes}</p>}
    <div className="agenda-herramientas">
      <label><Icon name="search" size={17} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por paciente o CI" aria-label="Buscar consulta pendiente" /></label>
      <span><Icon name="calendar" size={17} /> {pendientes.length} pendientes</span>
    </div>
    <div className="agenda-ambulatoria-tablero">
      <section className="agenda-cola panel">
        <header><span>CONSULTA</span><span>PACIENTE</span><span>MÉDICO / ESPECIALIDAD</span><span>SIGNOS VITALES</span><span>ACCIÓN</span></header>
        {pendientes.length ? pendientes.map((cita) => <article key={cita.id}>
          <time dateTime={`${cita.fecha}T${cita.hora}`}><strong>{cita.hora}</strong><small>{cita.fecha.split('-').reverse().join('/')}</small></time>
          <div><strong>{cita.paciente}</strong><small>CI {cita.ci}</small></div>
          <div className="agenda-medico"><strong>{cita.doctor}</strong><small>{cita.especialidad || 'Consulta ambulatoria'}</small>{cita.estado === 'por_confirmar' && <small>Por confirmar · Cobro pendiente de verificar</small>}</div>
          <span className={`agenda-signos ${signosRegistrados(cita) ? 'registrados' : 'pendientes'}`}>{signosRegistrados(cita) ? 'Registrados' : 'Pendientes de registro'}</span>
          <button type="button" onClick={() => atender(cita)}><Icon name="userCheck" size={15} /> {obtenerAtencionAmbulatoria(cita) ? 'Continuar' : 'Atender'}</button>
        </article>) : <div className="agenda-cola-vacia"><Icon name="calendar" size={25} /><strong>No hay consultas por atender</strong><small>Las citas pendientes y confirmadas aparecerán en esta lista.</small></div>}
      </section>
      <aside className="agenda-lateral agenda-atendidas">
        <header><div><p>ATENDIDOS HOY</p><strong>Consultas realizadas</strong></div><span>{atendidasHoy.length}</span></header>
        <label className="agenda-buscar-atendidas"><Icon name="search" size={15} /><input value={busquedaAtendidas} onChange={(event) => setBusquedaAtendidas(event.target.value)} placeholder="Buscar atendido..." /></label>
        {atendidasHoy.length ? <div>{atendidasHoy.map((cita) => <article key={`${cita.id}-${cita.fecha}-${cita.hora}`}><span className="agenda-iniciales">{cita.paciente.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}</span><div><strong>{cita.paciente}</strong><small>Consulta {cita.hora}</small><small>{cita.especialidad || 'Consulta ambulatoria'}</small></div>{obtenerAtencionAmbulatoria(cita)?.finalizadaEn ? <Icon name="check" size={16} /> : <button type="button" onClick={() => atender(cita)}>Continuar</button>}</article>)}</div> : <p>Aún no hay consultas atendidas.</p>}
      </aside>
    </div>
  </section>;
}
