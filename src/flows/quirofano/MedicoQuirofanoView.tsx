import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './MedicoQuirofanoView.css';

type Rol = 'cirujano' | 'primer-asistente' | 'primer-ayudante' | 'segundo-ayudante' | 'institucional';

const roles: { id: Rol; titulo: string; descripcion: string }[] = [
  { id: 'cirujano', titulo: 'Médico cirujano', descripcion: 'Dirección del procedimiento, indicaciones y registro quirúrgico.' },
  { id: 'primer-asistente', titulo: 'Primer asistente', descripcion: 'Apoyo directo al cirujano durante el procedimiento.' },
  { id: 'primer-ayudante', titulo: '1.er ayudante', descripcion: 'Preparación del campo y asistencia operatoria.' },
  { id: 'segundo-ayudante', titulo: '2.º ayudante', descripcion: 'Apoyo al equipo y seguimiento de indicaciones.' },
  { id: 'institucional', titulo: 'Médico institucional', descripcion: 'Supervisión institucional y registro de la atención.' },
];

export function MedicoQuirofanoView() {
  const [rol, setRol] = useState<Rol>('cirujano');
  const activo = roles.find(item => item.id === rol)!;
  return <section className="medico-q" aria-labelledby="medico-q-titulo">
    <nav className="medico-q-subvistas" aria-label="Roles de médico quirófano">{roles.map(item => <button type="button" key={item.id} className={rol === item.id ? 'activo' : ''} onClick={() => setRol(item.id)}><Icon name="userCheck" size={17}/><strong>{item.titulo}</strong></button>)}</nav>
    <section className="medico-q-contenido"><header><div><p>QUIRÓFANO · {activo.titulo.toUpperCase()}</p><h2 id="medico-q-titulo">{activo.titulo}</h2><small>{activo.descripcion}</small></div><span><Icon name="userCheck" size={22}/></span></header><div className="medico-q-vacio"><Icon name="calendar" size={28}/><strong>Sin cirugías asignadas</strong><small>Las cirugías correspondientes a este rol aparecerán aquí.</small></div></section>
  </section>;
}
