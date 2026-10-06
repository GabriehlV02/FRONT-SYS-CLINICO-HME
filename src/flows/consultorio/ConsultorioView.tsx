import { useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import { AgendaAmbulatoriaView, type CitaConfirmada } from './AgendaAmbulatoriaView';
import { ConsultaMedicaView } from './ConsultaMedicaView';
import './ConsultorioView.css';

type Subvista = 'consulta' | 'historias';
const subvistas: { id: Subvista; nombre: string; icono: IconName }[] = [
  { id: 'consulta', nombre: 'Consulta', icono: 'userCheck' },
  { id: 'historias', nombre: 'Historias clínicas', icono: 'fileText' },
];

export function ConsultorioView({ medico, initialSubview = 'consulta', initialPatient = null }: { medico: string; initialSubview?: Subvista; initialPatient?: CitaConfirmada | null }) {
  const [subvista, setSubvista] = useState<Subvista>(initialSubview);
  const [pacienteEnConsulta, setPacienteEnConsulta] = useState<CitaConfirmada | null>(initialPatient);
  return <section className="consultorio-vista">
    <nav className="consultorio-subvistas" aria-label="Subvistas de Consultorio médico">
      {subvistas.map((item) => <button key={item.id} className={subvista === item.id ? 'activo' : ''} onClick={() => { setSubvista(item.id); if (item.id === 'consulta') setPacienteEnConsulta(null); }}>
        <Icon name={item.icono} size={17} /><span>{item.nombre}</span>
      </button>)}
    </nav>
    {subvista === 'consulta' ? (pacienteEnConsulta ? <ConsultaMedicaView paciente={pacienteEnConsulta} /> : <AgendaAmbulatoriaView medico={medico} onAtender={(cita) => setPacienteEnConsulta(cita)} />) : <div className="consultorio-vacio">
      <Icon name={subvistas.find((item) => item.id === subvista)?.icono ?? 'userCheck'} size={30} />
      <p>CONSULTORIO MÉDICO</p>
      <h2>Historias clínicas</h2>
      <small>Consulta y seguimiento de las historias clínicas de tus pacientes.</small>
    </div>}
  </section>;
}
