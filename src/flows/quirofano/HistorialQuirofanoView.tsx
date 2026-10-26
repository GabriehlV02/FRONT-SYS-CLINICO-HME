import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import type { CirugiaProgramada } from './cronogramaQuirofano';
import './HistorialQuirofanoView.css';

const fechaLocal = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

export function HistorialQuirofanoView({ cirugias }: { cirugias: CirugiaProgramada[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [quirofano, setQuirofano] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState(fechaLocal());
  const salas = useMemo(() => [...new Set(cirugias.map(item => item.quirofano))].sort(), [cirugias]);
  const historial = useMemo(() => {
    const ahora = new Date();
    return cirugias.filter(item => {
      const fechaCirugia = new Date(`${item.fecha}T${item.hora || '00:00'}:00`);
      const texto = `${item.paciente} ${item.ci} ${item.cuenta} ${item.tipo} ${item.medico}`.toLowerCase();
      return fechaCirugia <= ahora && texto.includes(busqueda.toLowerCase()) && (!quirofano || item.quirofano === quirofano) && (!desde || item.fecha >= desde) && (!hasta || item.fecha <= hasta);
    }).sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
  }, [cirugias, busqueda, quirofano, desde, hasta]);

  return <section className="historial-q" aria-labelledby="historial-q-titulo">
    <header className="historial-q-cabecera"><div><p>QUIRÓFANO · REGISTROS</p><h2 id="historial-q-titulo">Historial de quirófano</h2><small>Consulta las cirugías realizadas, sus pacientes, responsables y salas.</small></div><span><Icon name="fileText" size={17}/>{historial.length} registros</span></header>
    <div className="historial-q-filtros"><label className="historial-q-buscar"><Icon name="search" size={16}/><input aria-label="Buscar en historial" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar paciente, CI, cuenta, cirugía o médico"/></label><label>Desde<input type="date" value={desde} onChange={evento => setDesde(evento.target.value)}/></label><label>Hasta<input type="date" value={hasta} onChange={evento => setHasta(evento.target.value)}/></label><label>Quirófano<select value={quirofano} onChange={evento => setQuirofano(evento.target.value)}><option value="">Todos</option>{salas.map(item => <option key={item}>{item}</option>)}</select></label></div>
    {historial.length ? <div className="historial-q-tabla"><table><thead><tr><th>Fecha y hora</th><th>Paciente</th><th>Cirugía</th><th>Médico</th><th>Quirófano</th><th>Cuenta</th><th>Estado</th></tr></thead><tbody>{historial.map(item => <tr key={item.id}><td><strong>{item.fecha.split('-').reverse().join('/')}</strong><small>{item.hora}</small></td><td><strong>{item.paciente}</strong><small>CI {item.ci}</small></td><td>{item.tipo}</td><td>{item.medico}</td><td>{item.quirofano}</td><td>{item.cuenta}</td><td><span className="historial-q-estado"><Icon name="check" size={14}/> Realizada</span></td></tr>)}</tbody></table></div> : <div className="historial-q-vacio"><Icon name="fileText" size={28}/><strong>No hay registros en el historial</strong><small>{cirugias.length ? 'Ajusta los filtros o el rango de fechas para consultar otros registros.' : 'Las cirugías aparecerán aquí después de su fecha y hora programadas.'}</small></div>}
  </section>;
}
