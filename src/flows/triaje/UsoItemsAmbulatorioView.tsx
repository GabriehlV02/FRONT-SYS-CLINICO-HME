import { useMemo, useState, useSyncExternalStore, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { obtenerMovimientosItems, registrarMovimientoItem, suscribirMovimientosItems, type MovimientoItemAmbulatorio } from './registroUsoItems';
import './UsoItemsAmbulatorioView.css';

const ahoraLocal = () => {
  const fecha = new Date();
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const fechaVisible = (fecha: string) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const horaVisible = (fechaHora: string) => fechaHora.slice(11, 16) || '—';
const borradorVacio = (): Omit<MovimientoItemAmbulatorio, 'id'> => ({ fechaHora: ahoraLocal(), tipo: 'Utilizado', item: '', codigo: '', cantidad: 1, unidad: 'unidad', paciente: '', ci: '', responsable: '', observacion: '' });

export function UsoItemsAmbulatorioView() {
  const movimientos = useSyncExternalStore(suscribirMovimientosItems, obtenerMovimientosItems, obtenerMovimientosItems);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [registrando, setRegistrando] = useState(false);
  const [borrador, setBorrador] = useState(borradorVacio);
  const [error, setError] = useState('');

  const visibles = useMemo(() => movimientos.filter(movimiento => {
    const fecha = movimiento.fechaHora.slice(0, 10);
    const texto = `${movimiento.item} ${movimiento.codigo} ${movimiento.paciente} ${movimiento.ci} ${movimiento.responsable}`.toLocaleLowerCase('es');
    return (!desde || fecha >= desde) && (!hasta || fecha <= hasta) && (tipo === 'Todos' || movimiento.tipo === tipo) && texto.includes(busqueda.trim().toLocaleLowerCase('es'));
  }).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)), [movimientos, desde, hasta, busqueda, tipo]);
  const dias = [...new Set(visibles.map(movimiento => movimiento.fechaHora.slice(0, 10)))];

  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!borrador.item.trim() || !borrador.paciente.trim() || !borrador.responsable.trim() || !borrador.fechaHora || !Number.isFinite(borrador.cantidad) || borrador.cantidad <= 0) {
      setError('Completa el ítem, paciente, responsable, fecha y una cantidad mayor a cero.');
      return;
    }
    try {
      registrarMovimientoItem({ ...borrador, item: borrador.item.trim(), codigo: borrador.codigo.trim(), paciente: borrador.paciente.trim(), ci: borrador.ci.trim(), responsable: borrador.responsable.trim(), unidad: borrador.unidad.trim() || 'unidad', observacion: borrador.observacion.trim() });
      setBorrador(borradorVacio());
      setError('');
      setRegistrando(false);
    } catch { setError('No se pudo guardar el registro en este navegador.'); }
  };

  return <section className="uso-items-ambulatorio" aria-labelledby="uso-items-titulo">
    <header className="uso-items-cabecera"><div><p>CONSULTA AMBULATORIA</p><h2 id="uso-items-titulo">Uso de ítems</h2><small>Ítems efectivamente dispensados o utilizados durante la atención.</small></div><button type="button" onClick={() => setRegistrando(true)}><Icon name="plus" size={17}/> Registrar ítem</button></header>
    <div className="uso-items-filtros"><label className="uso-items-buscar"><Icon name="search" size={17}/><input type="search" aria-label="Buscar usos de ítems" placeholder="Buscar ítem, paciente, CI o responsable" value={busqueda} onChange={evento => setBusqueda(evento.target.value)}/></label><label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={evento => setDesde(evento.target.value)}/></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={evento => setHasta(evento.target.value)}/></label><label>Movimiento<select value={tipo} onChange={evento => setTipo(evento.target.value)}><option>Todos</option><option>Dispensado</option><option>Utilizado</option></select></label></div>
    <div className="uso-items-resumen">{visibles.length} {visibles.length === 1 ? 'movimiento' : 'movimientos'} en {dias.length} {dias.length === 1 ? 'día' : 'días'}</div>
    {dias.length ? dias.map(dia => <section className="uso-items-dia" key={dia}><header><Icon name="calendar" size={17}/><h3>{fechaVisible(dia)}</h3><span>{visibles.filter(item => item.fechaHora.startsWith(dia)).length} registros</span></header><div className="uso-items-tabla"><table><thead><tr><th>Hora</th><th>Ítem</th><th>Movimiento</th><th>Cantidad</th><th>Paciente</th><th>Responsable</th><th>Observación</th></tr></thead><tbody>{visibles.filter(item => item.fechaHora.startsWith(dia)).map(item => <tr key={item.id}><td>{horaVisible(item.fechaHora)}</td><td><strong>{item.item}</strong>{item.codigo && <small>{item.codigo}</small>}</td><td><span className={`uso-items-tipo ${item.tipo === 'Dispensado' ? 'dispensado' : 'utilizado'}`}>{item.tipo}</span></td><td>{item.cantidad} {item.unidad}</td><td><strong>{item.paciente}</strong>{item.ci && <small>CI {item.ci}</small>}</td><td>{item.responsable}</td><td>{item.observacion || '—'}</td></tr>)}</tbody></table></div></section>) : <div className="uso-items-vacio"><Icon name="package" size={30}/><strong>{movimientos.length ? 'Sin registros para estos filtros' : 'Aún no hay ítems registrados'}</strong><span>{movimientos.length ? 'Cambia la búsqueda o el rango de fechas.' : 'Registra cada dispensación o uso para verla agrupada por día.'}</span></div>}
    {registrando && <div className="uso-items-fondo" onMouseDown={() => setRegistrando(false)}><form className="uso-items-modal" onSubmit={guardar} role="dialog" aria-modal="true" aria-labelledby="uso-items-form-titulo" onMouseDown={evento => evento.stopPropagation()}><header><div><small>CONSULTA AMBULATORIA</small><h3 id="uso-items-form-titulo">Registrar uso de ítem</h3></div><button type="button" aria-label="Cerrar" onClick={() => setRegistrando(false)}><Icon name="close" size={18}/></button></header><div className="uso-items-campos"><label>Fecha y hora<input required type="datetime-local" value={borrador.fechaHora} onChange={evento => setBorrador(actual => ({ ...actual, fechaHora: evento.target.value }))}/></label><label>Movimiento<select value={borrador.tipo} onChange={evento => setBorrador(actual => ({ ...actual, tipo: evento.target.value as MovimientoItemAmbulatorio['tipo'] }))}><option>Utilizado</option><option>Dispensado</option></select></label><label className="ancho">Ítem<input required value={borrador.item} onChange={evento => setBorrador(actual => ({ ...actual, item: evento.target.value }))} placeholder="Medicamento, insumo o material"/></label><label>Código<input value={borrador.codigo} onChange={evento => setBorrador(actual => ({ ...actual, codigo: evento.target.value }))} placeholder="Opcional"/></label><label>Cantidad<input required min="0.01" step="any" type="number" value={borrador.cantidad} onChange={evento => setBorrador(actual => ({ ...actual, cantidad: Number(evento.target.value) }))}/></label><label>Unidad<input required value={borrador.unidad} onChange={evento => setBorrador(actual => ({ ...actual, unidad: evento.target.value }))} placeholder="Unidad, ml, ampolla..."/></label><label>Paciente<input required value={borrador.paciente} onChange={evento => setBorrador(actual => ({ ...actual, paciente: evento.target.value }))}/></label><label>CI del paciente<input value={borrador.ci} onChange={evento => setBorrador(actual => ({ ...actual, ci: evento.target.value }))}/></label><label>Responsable<input required value={borrador.responsable} onChange={evento => setBorrador(actual => ({ ...actual, responsable: evento.target.value }))}/></label><label className="ancho">Observación<textarea value={borrador.observacion} onChange={evento => setBorrador(actual => ({ ...actual, observacion: evento.target.value }))} placeholder="Opcional"/></label></div>{error && <p className="uso-items-error" role="alert">{error}</p>}<footer><button type="button" onClick={() => setRegistrando(false)}>Cancelar</button><button type="submit">Guardar registro</button></footer></form></div>}
  </section>;
}
