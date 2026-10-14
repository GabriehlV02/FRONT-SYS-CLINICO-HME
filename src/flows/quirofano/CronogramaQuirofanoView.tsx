import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import type { CirugiaProgramada } from './cronogramaQuirofano';
import './CronogramaQuirofanoView.css';

const fechaLocal = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

export function CronogramaQuirofanoView({ cirugias, fechaInicial, onNuevaCuenta }: {
  cirugias: CirugiaProgramada[];
  fechaInicial: string;
  onNuevaCuenta: () => void;
}) {
  const [fecha, setFecha] = useState(fechaInicial || fechaLocal());
  const [sala, setSala] = useState('');
  const salas = useMemo(() => [...new Set(['Quirófano 1 · General', 'Quirófano 2 · Especialidades', 'Quirófano 3 · Ambulatorio', ...cirugias.map(c => c.quirofano)])], [cirugias]);
  const salasVisibles = sala ? [sala] : salas;
  const delDia = useMemo(() => cirugias.filter(c => c.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora)), [cirugias, fecha]);
  const visibles = delDia.filter(c => !sala || c.quirofano === sala);
  const horas = [...new Set(visibles.map(c => c.hora))];

  return <section className="cronograma-q" aria-labelledby="cronograma-q-titulo">
    <header className="cronograma-q-cabecera"><div><p>QUIRÓFANO · PROGRAMACIÓN</p><h2 id="cronograma-q-titulo">Cronograma de uso de quirófanos</h2><small>Cirugías programadas por fecha, hora y sala.</small></div><button type="button" onClick={onNuevaCuenta}><Icon name="plus" size={16}/> Nueva cuenta</button></header>
    <div className="cronograma-q-filtros"><label>Fecha<input type="date" value={fecha} onChange={e => setFecha(e.target.value)}/></label><label>Quirófano<select value={sala} onChange={e => setSala(e.target.value)}><option value="">Todos los quirófanos</option>{salas.map(item => <option key={item} value={item}>{item}</option>)}</select></label><span>{visibles.length} {visibles.length === 1 ? 'cirugía programada' : 'cirugías programadas'}</span></div>
    {horas.length ? <div className="cronograma-q-desborde"><div className="cronograma-q-grilla" style={{ gridTemplateColumns: `82px repeat(${salasVisibles.length}, minmax(210px, 1fr))` }}><div className="cronograma-q-esquina">Hora</div>{salasVisibles.map(item => <div className="cronograma-q-sala" key={item}>{item}</div>)}{horas.map(hora => <div className="cronograma-q-fila" key={hora}><time>{hora}</time>{salasVisibles.map(item => { const cirugia = delDia.find(c => c.hora === hora && c.quirofano === item); return <div className="cronograma-q-celda" key={item}>{cirugia && <article><strong>{cirugia.paciente}</strong><small>CI {cirugia.ci} · {cirugia.cuenta}</small><span>{cirugia.tipo}</span><small>{cirugia.medico}</small></article>}</div>; })}</div>)}</div></div> : <div className="cronograma-q-vacio"><Icon name="calendar" size={28}/><strong>No hay cirugías programadas para esta fecha</strong><small>Elige otra fecha o apertura una cuenta para añadir una cirugía al cronograma.</small></div>}
  </section>;
}
