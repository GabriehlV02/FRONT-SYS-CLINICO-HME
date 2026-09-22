import { useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import { CitasRecepcionView } from '../recepcion/subvistas/CitasRecepcionView';
import './ConsultorioView.css';

type Subvista = 'consulta' | 'agenda' | 'historias';
const subvistas: { id: Subvista; nombre: string; icono: IconName }[] = [
  { id: 'consulta', nombre: 'Consulta', icono: 'userCheck' },
  { id: 'agenda', nombre: 'Agenda', icono: 'calendar' },
  { id: 'historias', nombre: 'Historias clínicas', icono: 'fileText' },
];

export function ConsultorioView({ medico }: { medico: string }) {
  const [subvista, setSubvista] = useState<Subvista>('consulta');
  return <section className="consultorio-vista">
    <nav className="consultorio-subvistas" aria-label="Subvistas de Consultorio médico">
      {subvistas.map((item) => <button key={item.id} className={subvista === item.id ? 'activo' : ''} onClick={() => setSubvista(item.id)}>
        <Icon name={item.icono} size={17} /><span>{item.nombre}</span>
      </button>)}
    </nav>
    {subvista === 'agenda' ? <CitasRecepcionView medicoInicial={medico} /> : <div className="consultorio-vacio">
      <Icon name={subvistas.find((item) => item.id === subvista)?.icono ?? 'userCheck'} size={30} />
      <p>CONSULTORIO MÉDICO</p>
      <h2>{subvista === 'consulta' ? 'Consulta' : 'Historias clínicas'}</h2>
      <small>{subvista === 'consulta' ? 'Atención, diagnóstico e indicaciones del paciente en consultorio.' : 'Consulta y seguimiento de las historias clínicas de tus pacientes.'}</small>
    </div>}
  </section>;
}
