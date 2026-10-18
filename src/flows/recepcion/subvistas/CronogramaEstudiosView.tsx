import { useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';
import './CronogramaEstudiosView.css';

type Estudio = { id: string; paciente: string; ci: string; tipo: 'Radiografía' | 'Tomografía' | 'Ecocardiograma'; fecha: string; hora: string; estado: 'Confirmado' | 'Pendiente' };
const hoy = new Date().toLocaleDateString('en-CA');
const datos: Estudio[] = [
  { id: 'est-1', paciente: 'María Fernanda López', ci: '6845210', tipo: 'Radiografía', fecha: hoy, hora: '08:00', estado: 'Confirmado' },
  { id: 'est-2', paciente: 'Carlos Mendoza Rojas', ci: '5987412', tipo: 'Tomografía', fecha: hoy, hora: '09:00', estado: 'Pendiente' },
  { id: 'est-3', paciente: 'Ana Quispe Vargas', ci: '7319845', tipo: 'Ecocardiograma', fecha: hoy, hora: '10:30', estado: 'Confirmado' },
];
const diasSemana = (inicio: Date) => Array.from({ length: 7 }, (_, indice) => { const fecha = new Date(inicio); fecha.setDate(inicio.getDate() + indice); return fecha; });

export function CronogramaEstudiosView() {
  const [inicio, setInicio] = useState(() => { const fecha = new Date(); fecha.setDate(fecha.getDate() - fecha.getDay()); return fecha; });
  const [tipo, setTipo] = useState('Todos');
  const dias = diasSemana(inicio);
  const visibles = useMemo(() => datos.filter(estudio => tipo === 'Todos' || estudio.tipo === tipo), [tipo]);
  const mover = (dias: number) => setInicio(actual => { const siguiente = new Date(actual); siguiente.setDate(actual.getDate() + dias); return siguiente; });
  const fechaClave = (fecha: Date) => fecha.toLocaleDateString('en-CA');
  const horas = Array.from({ length: 96 }, (_, indice) => {
    const minutos = indice * 15;
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  });
  return <section className="cronograma-estudios"><header className="cronograma-estudios-filtros"><div><button type="button" onClick={() => mover(-7)} aria-label="Semana anterior"><Icon name="chevronLeft" size={17}/></button><strong>{dias[0].toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })} - {dias[6].toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => mover(7)} aria-label="Semana siguiente"><Icon name="chevronRight" size={17}/></button><button type="button" onClick={() => { const fecha = new Date(); fecha.setDate(fecha.getDate() - fecha.getDay()); setInicio(fecha); }}>Hoy</button></div><label>Tipo de estudio<select value={tipo} onChange={evento => setTipo(evento.target.value)}><option>Todos</option><option>Radiografía</option><option>Tomografía</option><option>Ecocardiograma</option></select></label></header><div className="cronograma-estudios-leyenda"><span><i className="confirmado"/>Confirmados</span><span><i className="pendiente"/>Por confirmar</span><b>{visibles.length} estudios agendados</b></div><div className="cronograma-estudios-desborde"><div className="cronograma-estudios-grilla"><div className="cronograma-estudios-hora">Hora</div>{dias.map(dia => <div className="cronograma-estudios-dia" key={fechaClave(dia)}>{dia.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}</div>)}{horas.map(hora => <div className="cronograma-estudios-fila" key={hora}><time>{hora}</time>{dias.map(dia => { const estudio = visibles.find(actual => actual.fecha === fechaClave(dia) && actual.hora === hora); return <div className="cronograma-estudios-celda" key={fechaClave(dia)}>{estudio && <article className={estudio.estado === 'Confirmado' ? 'confirmado' : 'pendiente'}><strong>{estudio.paciente}</strong><small>CI {estudio.ci}</small><span>{estudio.tipo}</span><b>{estudio.estado}</b></article>}</div>; })}</div>)}</div></div></section>;
}
