import { useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../radius/componentes/Icono';
import { obtenerEpisodios, suscribirEpisodios, type EpisodioClinico } from '../consultorio/registroHistoria';
import { crearPdfAtenciones } from './exportarAtencionesPdf';
import './RegistroUsoTriajeView.css';

const fechaISO = (episodio: EpisodioClinico) => episodio.paciente.fecha?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || episodio.atendidaEn?.slice(0, 10) || episodio.finalizadaEn?.slice(0, 10) || '';
const fechaVisible = (fecha: string) => fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-BO') : 'Sin fecha';

export function RegistroUsoTriajeView() {
  const episodios = useSyncExternalStore(suscribirEpisodios, obtenerEpisodios, obtenerEpisodios);
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [consultorio, setConsultorio] = useState('');
  const [medico, setMedico] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [seleccionado, setSeleccionado] = useState<EpisodioClinico | null>(null);
  const [exportando, setExportando] = useState(false);
  const [fechaExportarDesde, setFechaExportarDesde] = useState('');
  const [fechaExportarHasta, setFechaExportarHasta] = useState('');
  const [errorExportar, setErrorExportar] = useState('');
  const atendidos = useMemo(() => episodios.filter(episodio => episodio.tipo === 'Consulta médica' && (episodio.atendidaEn || episodio.finalizadaEn || episodio.motivo || episodio.recetas.length)).sort((a, b) => `${fechaISO(b)} ${b.paciente.hora || ''}`.localeCompare(`${fechaISO(a)} ${a.paciente.hora || ''}`)), [episodios]);
  const consultorios = [...new Set(atendidos.map(episodio => episodio.paciente.consultorio || 'Sin asignar'))].sort();
  const medicos = [...new Set(atendidos.map(episodio => episodio.medico || 'No registrado'))].sort();
  const especialidades = [...new Set(atendidos.map(episodio => episodio.paciente.especialidad || 'Consulta externa'))].sort();
  const coincideFiltros = (episodio: EpisodioClinico) => (!consultorio || (episodio.paciente.consultorio || 'Sin asignar') === consultorio) && (!medico || (episodio.medico || 'No registrado') === medico) && (!especialidad || (episodio.paciente.especialidad || 'Consulta externa') === especialidad);
  const visibles = atendidos.filter(episodio => {
    const fecha = fechaISO(episodio);
    const coincide = `${episodio.paciente.paciente} ${episodio.paciente.ci} ${episodio.medico} ${episodio.paciente.especialidad} ${episodio.motivo}`.toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'));
    return coincide && coincideFiltros(episodio) && (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  });
  const seleccionExportar = atendidos.filter(episodio => {
    const fecha = fechaISO(episodio);
    return fechaExportarDesde && fechaExportarHasta && fecha >= fechaExportarDesde && fecha <= fechaExportarHasta && coincideFiltros(episodio);
  });
  const exportarPdf = () => {
    if (!fechaExportarDesde || !fechaExportarHasta || fechaExportarDesde > fechaExportarHasta) {
      setErrorExportar('Selecciona un rango de fechas válido.');
      return;
    }
    try {
      const archivo = crearPdfAtenciones(seleccionExportar, fechaExportarDesde, fechaExportarHasta);
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `registro-atencion-${fechaExportarDesde}-a-${fechaExportarHasta}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setExportando(false);
      setErrorExportar('');
    } catch { setErrorExportar('No se pudo generar el PDF. Intenta nuevamente.'); }
  };

  return <section className="registro-atencion" aria-labelledby="registro-atencion-titulo">
    <header className="registro-atencion-cabecera"><div><p>CONSULTA EXTERNA</p><h2 id="registro-atencion-titulo">Registro de atención</h2><small>Historial de cada consulta atendida, ordenado por fecha.</small></div><div className="registro-atencion-cabecera-acciones"><span>{visibles.length} de {atendidos.length} atenciones</span><button type="button" onClick={() => { setFechaExportarDesde(desde); setFechaExportarHasta(hasta); setErrorExportar(''); setExportando(true); }}><Icon name="fileText" size={16}/> Exportar en PDF</button></div></header>
    <div className="registro-atencion-filtros"><label className="registro-atencion-buscar"><Icon name="search" size={17}/><input type="search" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar paciente, CI o motivo" aria-label="Buscar atenciones" /></label><label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={evento => setDesde(evento.target.value)} /></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={evento => setHasta(evento.target.value)} /></label><label>Consultorio<select value={consultorio} onChange={evento => setConsultorio(evento.target.value)}><option value="">Todos</option>{consultorios.map(valor => <option key={valor} value={valor}>{valor}</option>)}</select></label><label>Médico<select value={medico} onChange={evento => setMedico(evento.target.value)}><option value="">Todos</option>{medicos.map(valor => <option key={valor} value={valor}>{valor}</option>)}</select></label><label>Especialidad<select value={especialidad} onChange={evento => setEspecialidad(evento.target.value)}><option value="">Todas</option>{especialidades.map(valor => <option key={valor} value={valor}>{valor}</option>)}</select></label></div>
    <div className="registro-atencion-desplazamiento"><table><thead><tr><th>Paciente</th><th>CI</th><th>Médico</th><th>Especialidad</th><th>Consultorio</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Motivo de consulta</th><th>Acciones</th></tr></thead><tbody>{visibles.map(episodio => <tr key={episodio.episodioId}><td><strong>{episodio.paciente.paciente}</strong></td><td>{episodio.paciente.ci || 'Sin documento'}</td><td>{episodio.medico || 'No registrado'}</td><td>{episodio.paciente.especialidad || 'Consulta externa'}</td><td>{episodio.paciente.consultorio || 'Sin asignar'}</td><td>{fechaVisible(fechaISO(episodio))}</td><td>{episodio.paciente.hora || 'No registrada'}</td><td><span className={`registro-atencion-estado ${episodio.finalizadaEn ? 'finalizada' : 'en-curso'}`}>{episodio.finalizadaEn ? 'Finalizada' : 'En atención'}</span></td><td className="registro-atencion-motivo">{episodio.motivo || 'Pendiente de registro'}</td><td><button type="button" onClick={() => setSeleccionado(episodio)}><Icon name="eye" size={16}/> Ver</button></td></tr>)}</tbody></table>{!visibles.length && <div className="registro-atencion-vacio"><Icon name="calendar" size={27}/><strong>{atendidos.length ? 'No hay atenciones con estos filtros' : 'Aún no hay atenciones registradas'}</strong><span>{atendidos.length ? 'Cambia la búsqueda o los filtros.' : 'Aparecerán aquí al iniciar una consulta externa desde Consultorio médico.'}</span></div>}</div>
    {exportando && <div className="registro-atencion-fondo" onMouseDown={() => setExportando(false)}><section className="registro-atencion-modal registro-atencion-exportar" role="dialog" aria-modal="true" aria-labelledby="registro-atencion-exportar-titulo" onMouseDown={evento => evento.stopPropagation()}><header><div><small>REGISTRO DE ATENCIÓN</small><h3 id="registro-atencion-exportar-titulo">Exportar en PDF</h3></div><button type="button" aria-label="Cerrar exportación" onClick={() => setExportando(false)}><Icon name="close" size={18}/></button></header><div className="registro-atencion-exportar-cuerpo"><p>Selecciona el período de las consultas externas que quieres incluir.</p><div className="registro-atencion-exportar-fechas"><label>Desde<input type="date" value={fechaExportarDesde} max={fechaExportarHasta || undefined} onChange={evento => { setFechaExportarDesde(evento.target.value); setErrorExportar(''); }}/></label><label>Hasta<input type="date" value={fechaExportarHasta} min={fechaExportarDesde || undefined} onChange={evento => { setFechaExportarHasta(evento.target.value); setErrorExportar(''); }}/></label></div>{fechaExportarDesde && fechaExportarHasta && fechaExportarDesde <= fechaExportarHasta && <small>{seleccionExportar.length} {seleccionExportar.length === 1 ? 'atención' : 'atenciones'} en el período seleccionado.</small>}{errorExportar && <p className="registro-atencion-exportar-error" role="alert">{errorExportar}</p>}</div><footer><button type="button" className="registro-atencion-exportar-cancelar" onClick={() => setExportando(false)}>Cancelar</button><button type="button" disabled={!fechaExportarDesde || !fechaExportarHasta || fechaExportarDesde > fechaExportarHasta} onClick={exportarPdf}><Icon name="fileText" size={16}/> Exportar en PDF</button></footer></section></div>}
    {seleccionado && <div className="registro-atencion-fondo" onMouseDown={() => setSeleccionado(null)}><section className="registro-atencion-modal" role="dialog" aria-modal="true" aria-labelledby="registro-atencion-detalle" onMouseDown={evento => evento.stopPropagation()}><header><div><small>CONSULTA EXTERNA · {seleccionado.episodioId}</small><h3 id="registro-atencion-detalle">{seleccionado.paciente.paciente}</h3></div><button type="button" aria-label="Cerrar detalle" onClick={() => setSeleccionado(null)}><Icon name="close" size={18}/></button></header><dl><div><dt>Documento</dt><dd>{seleccionado.paciente.ci || 'Sin registro'}</dd></div><div><dt>Médico</dt><dd>{seleccionado.medico}</dd></div><div><dt>Especialidad</dt><dd>{seleccionado.paciente.especialidad || 'Consulta externa'}</dd></div><div><dt>Fecha y hora</dt><dd>{fechaVisible(fechaISO(seleccionado))} · {seleccionado.paciente.hora || 'Hora no registrada'}</dd></div><div><dt>Motivo de consulta</dt><dd>{seleccionado.motivo || 'Sin registro'}</dd></div><div><dt>Enfermedad actual</dt><dd>{seleccionado.enfermedadActual || 'Sin registro'}</dd></div><div><dt>Examen físico</dt><dd>{seleccionado.examenFisico || 'Sin registro'}</dd></div><div><dt>Notas médicas</dt><dd>{seleccionado.notas || 'Sin registro'}</dd></div><div><dt>Indicaciones y órdenes</dt><dd>{seleccionado.recetas.length + seleccionado.ordenes.length} registradas</dd></div></dl><footer><button type="button" onClick={() => setSeleccionado(null)}>Cerrar</button></footer></section></div>}
  </section>;
}
