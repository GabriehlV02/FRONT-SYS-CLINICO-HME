import { useMemo, useState } from 'react';
import { useEstudiosPacientes } from '../../../radius/vistas/pacientes/useEstudiosPacientes';
import Icon from '../../../radius/componentes/Icono';
import './CronogramaEstudiosView.css';

type Estudio = { id: string; paciente: string; ci: string; tipo: 'Radiografía' | 'Tomografía' | 'Ecocardiograma' | 'Ecografía'; fecha: string; hora: string; estado: 'Confirmado' | 'Pendiente' };
const hoy = new Date().toLocaleDateString('en-CA');

const diasSemana = (inicio: Date) => Array.from({ length: 7 }, (_, indice) => { const fecha = new Date(inicio); fecha.setDate(inicio.getDate() + indice); return fecha; });

export function CronogramaEstudiosView() {
  const {estudios,errorEstudios}=useEstudiosPacientes();
  const datos:Estudio[]=estudios.map(e=>({id:e.id,paciente:[e.nombres,e.apellido_paterno,e.apellido_materno].join(' '),ci:e.ci,tipo:({TOMOGRAFIA:'Tomografía',ECOCARDIOGRAMA:'Ecocardiograma',ECOGRAFIA:'Ecografía'} as Record<string,Estudio['tipo']>)[e.tipo] || 'Radiografía',fecha:e.solicitado_en.slice(0,10),hora:e.solicitado_en.slice(11,16),estado:e.estado==='SOLICITADO'?'Pendiente':'Confirmado'}));
  const [inicio, setInicio] = useState(() => { const fecha = new Date(); fecha.setDate(fecha.getDate() - fecha.getDay()); return fecha; });
  const [tipo, setTipo] = useState('Todos');
  const dias = diasSemana(inicio);
  const visibles = useMemo(() => datos.filter(estudio => tipo === 'Todos' || estudio.tipo === tipo), [tipo, estudios]);
  const mover = (dias: number) => setInicio(actual => { const siguiente = new Date(actual); siguiente.setDate(actual.getDate() + dias); return siguiente; });
  const fechaClave = (fecha: Date) => fecha.toLocaleDateString('en-CA');
  const horas = Array.from({ length: 96 }, (_, indice) => {
    const minutos = indice * 15;
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  });
  return <section className="cronograma-estudios">{errorEstudios && <p role="alert">{errorEstudios}</p>}<header className="cronograma-estudios-filtros"><div><button type="button" onClick={() => mover(-7)} aria-label="Semana anterior"><Icon name="chevronLeft" size={17}/></button><strong>{dias[0].toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })} - {dias[6].toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => mover(7)} aria-label="Semana siguiente"><Icon name="chevronRight" size={17}/></button><button type="button" onClick={() => { const fecha = new Date(); fecha.setDate(fecha.getDate() - fecha.getDay()); setInicio(fecha); }}>Hoy</button></div><label>Tipo de estudio<select value={tipo} onChange={evento => setTipo(evento.target.value)}><option>Todos</option><option>Radiografía</option><option>Tomografía</option><option>Ecocardiograma</option><option>Ecografía</option></select></label></header><div className="cronograma-estudios-leyenda"><span><i className="confirmado"/>Confirmados</span><span><i className="pendiente"/>Por confirmar</span><b>{visibles.length} estudios solicitados</b></div><div className="cronograma-estudios-desborde"><div className="cronograma-estudios-grilla"><div className="cronograma-estudios-hora">Hora</div>{dias.map(dia => <div className="cronograma-estudios-dia" key={fechaClave(dia)}>{dia.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}</div>)}{horas.map(hora => <div className="cronograma-estudios-fila" key={hora}><time>{hora}</time>{dias.map(dia => { const estudio = visibles.find(actual => actual.fecha === fechaClave(dia) && actual.hora === hora); return <div className="cronograma-estudios-celda" key={fechaClave(dia)}>{estudio && <article className={estudio.estado === 'Confirmado' ? 'confirmado' : 'pendiente'}><strong>{estudio.paciente}</strong><small>CI {estudio.ci}</small><span>{estudio.tipo}</span><b>{estudio.estado}</b></article>}</div>; })}</div>)}</div></div></section>;
}
