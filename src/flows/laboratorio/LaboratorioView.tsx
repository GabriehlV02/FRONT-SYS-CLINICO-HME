import { useEffect, useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import {
  guardarResultadosLaboratorio, leerSolicitudesLaboratorio, suscribirLaboratorio,
  calcularResultadosLaboratorio,
  type EstadoLaboratorio, type OrigenLaboratorio, type ResultadoLaboratorio, type SolicitudLaboratorio,
} from './almacenLaboratorio';
import './LaboratorioView.css';
import './CargaResultados.css';
import './FilasResultados.css';
import { EstadoReferenciaLaboratorio } from './EstadoReferenciaLaboratorio';
import { leerSesion } from '../../radius/types/sesion';
import { ejemplosLaboratorio } from './ejemplosLaboratorio';
import { ModalResultadosLaboratorio } from './ModalResultadosLaboratorio';

const etiquetas: Record<EstadoLaboratorio, string> = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Finalizado' };
const fecha = (valor: string) => new Date(valor).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });

export function LaboratorioView({ origen }: { origen: OrigenLaboratorio }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudLaboratorio[]>([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'pendientes' | 'todos' | EstadoLaboratorio>('pendientes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [ordenCargaId, setOrdenCargaId] = useState<string | null>(null);
  const [modificado, setModificado] = useState(false);
  const [modoEjemplo, setModoEjemplo] = useState(true);
  const [ejemplos, setEjemplos] = useState(() => ejemplosLaboratorio(origen));

  useEffect(() => {
    const cargar = () => {
      try { const datos = leerSolicitudesLaboratorio(); setSolicitudes(datos); if (datos.some(s => s.origen === origen)) setModoEjemplo(false); setError(''); }
      catch { setError('No se pudieron cargar las solicitudes guardadas en este navegador.'); }
    };
    cargar();
    return suscribirLaboratorio(cargar);
  }, [origen]);

  const delOrigen = useMemo(() => modoEjemplo ? ejemplos : solicitudes.filter(s => s.origen === origen), [solicitudes, origen, modoEjemplo, ejemplos]);
  const visibles = delOrigen.filter(s => {
    const dia = new Date(s.fecha).toLocaleDateString('en-CA');
    return `${s.paciente} ${s.ci} ${s.medico} ${s.estudios.map(e => e.nombre).join(' ')}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
      && (filtro === 'todos' || (filtro === 'pendientes' ? s.estado !== 'completado' : s.estado === filtro))
      && (!desde || dia >= desde) && (!hasta || dia <= hasta);
  });
  const todas = modoEjemplo ? ejemplos : solicitudes;
  const solicitud = todas.find(s => s.id === seleccionado);
  const ordenCarga = todas.find(s => s.id === ordenCargaId);
  const elegir = (id: string | null) => {
    if (modificado && !window.confirm('Hay resultados sin guardar. ¿Quieres salir y descartar esos cambios?')) return;
    setSeleccionado(id); setOrdenCargaId(id); setModificado(false); setMensaje('');
  };

  return <section className="laboratorio-vista" aria-label={`Laboratorio ${origen === 'ambulatorio' ? 'ambulatorio' : 'de internación'}`}>
    <header className="lab-cabecera"><div><h2>Laboratorio · {origen === 'ambulatorio' ? 'Ambulatorios' : 'Internados'}</h2><p>Solicitudes de pacientes y registro de resultados.</p></div><button type="button" className="lab-boton" onClick={() => { if (modificado && !window.confirm('¿Descartar los cambios sin guardar?')) return; setModoEjemplo(!modoEjemplo); setSeleccionado(null); setModificado(false); setMensaje(''); }}>{modoEjemplo ? 'Ver solicitudes locales' : 'Ver ejemplo visual'}</button></header>
    <p className="lab-local">{modoEjemplo ? 'Vista de ejemplo · Pacientes ficticios para probar pendientes y resultados. Los cambios del ejemplo no se guardan al recargar.' : 'Vista local · Las solicitudes y resultados se guardan únicamente en este navegador.'}</p>
    <nav className="lab-resumen" aria-label="Estado de las solicitudes">
      {(['pendientes', 'en_proceso', 'completado', 'todos'] as const).map(id => {
        const cantidad = id === 'todos' ? delOrigen.length : delOrigen.filter(s => id === 'pendientes' ? s.estado !== 'completado' : s.estado === id).length;
        return <button key={id} type="button" aria-pressed={filtro === id} className={filtro === id ? 'activo' : ''} onClick={() => setFiltro(id)}><span>{id === 'todos' ? 'Todas las solicitudes' : id === 'pendientes' ? 'Por completar' : etiquetas[id]}</span><strong>{cantidad}</strong></button>;
      })}
    </nav>
    <div className="lab-filtros"><label className="lab-busqueda"><Icon name="search" size={17}/><input aria-label="Buscar solicitudes de laboratorio" placeholder="Paciente, CI, médico o estudio" value={busqueda} onChange={e => setBusqueda(e.target.value)}/></label><label>Estado<select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)}><option value="pendientes">Por completar</option><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Finalizado</option><option value="todos">Todos</option></select></label><label>Desde<input type="date" value={desde} onChange={e => setDesde(e.target.value)}/></label><label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)}/></label></div>
    {error && <p className="lab-error" role="alert">{error}</p>}
    {mensaje && <p className="lab-mensaje" role="status">{mensaje}</p>}
    <div className="lab-tablero">
      <section className="lab-bandeja panel"><header><h3>Solicitudes de laboratorio</h3><span>{visibles.length} {visibles.length === 1 ? 'solicitud' : 'solicitudes'}</span></header><div className="lab-tabla-scroll"><table><thead><tr><th>Paciente</th><th>Solicitud / médico</th><th>Estudios</th><th>Estado</th><th><span className="lab-sr">Acción</span></th></tr></thead><tbody>{visibles.map(s => <tr key={s.id} className={seleccionado === s.id ? 'seleccionada' : ''}><td><strong>{s.paciente}</strong><small>CI {s.ci}</small></td><td><time>{fecha(s.fecha)}</time><small>{s.medico || 'Sin médico registrado'}</small></td><td><strong>{s.estudios.length} {s.estudios.length === 1 ? 'estudio' : 'estudios'}</strong><small>{s.estudios.map(e => e.nombre).join(' · ')}</small></td><td><span className={`lab-estado ${s.estado}`}>{etiquetas[s.estado]}</span></td><td><button className="lab-boton" type="button" onClick={() => elegir(s.id)}>{s.estado === 'completado' ? 'Ver resultados' : 'Asignar resultados'}</button></td></tr>)}</tbody></table></div>
        {!visibles.length && <div className="lab-vacio"><Icon name="lab" size={30}/><strong>{delOrigen.length ? 'No hay solicitudes con estos filtros' : 'No hay solicitudes de laboratorio'}</strong><p>{delOrigen.length ? 'Cambia el estado o la búsqueda para ver otras solicitudes.' : origen === 'ambulatorio' ? 'Los estudios enviados desde la orden de laboratorio del consultorio aparecerán aquí.' : 'Las solicitudes de internación aparecerán en esta bandeja cuando se conecte su envío.'}</p></div>}
      </section>
      {solicitud && ordenCarga && <ModalResultadosLaboratorio ordenActual={ordenCarga} seleccionada={solicitud} solicitudes={todas} onElegir={id => { if (todas.find(s => s.id === id)?.ci === ordenCarga.ci) setSeleccionado(id); }} onCerrar={() => elegir(null)} mensaje={mensaje}
        editorActual={<EditorResultados key={ordenCarga.id} solicitud={ordenCarga} modoEjemplo={modoEjemplo} guardarEjemplo={nuevo => setEjemplos(actuales => actuales.map(s => s.id === nuevo.id ? nuevo : s))} onCerrar={() => elegir(null)} onModificado={setModificado} onGuardado={texto => { setModificado(false); setMensaje(texto); }}/>}
        editorHistorial={solicitud.id !== ordenCarga.id ? <EditorResultados key={`${solicitud.id}-${solicitud.actualizadoEn}`} solicitud={solicitud} soloLectura modoEjemplo={modoEjemplo} guardarEjemplo={() => {}} onCerrar={() => elegir(null)} onModificado={() => {}} onGuardado={() => {}}/> : null}/>}
    </div>
  </section>;
}

// Captura de resultados por parámetros, con referencia y cálculo automático.
function EditorResultados({ solicitud, soloLectura = false, modoEjemplo, guardarEjemplo, onCerrar, onModificado, onGuardado }: {
  solicitud: SolicitudLaboratorio; soloLectura?: boolean; onCerrar: () => void; onModificado: (valor: boolean) => void; onGuardado: (mensaje: string) => void;
  modoEjemplo: boolean; guardarEjemplo: (solicitud: SolicitudLaboratorio) => void;
}) {
  const [borrador, setBorrador] = useState(() => structuredClone(solicitud));
  const calculos = useMemo(() => calcularResultadosLaboratorio(borrador), [borrador]);
  const [error, setError] = useState('');
  const finalizado = borrador.estado === 'completado';
  const lectura = soloLectura || finalizado;
  const totalParametros = calculos.estudios.reduce((total, e) => total + e.resultados.length, 0);
  const completados = calculos.estudios.reduce((total, e) => total + e.resultados.filter(r => r.valor.trim()).length, 0);
  const modificar = (nuevo: SolicitudLaboratorio) => { setBorrador({ ...nuevo, estudios: calcularResultadosLaboratorio(nuevo).estudios }); onModificado(true); setError(''); };
  const cambiar = (estudioId: string, resultadoId: string, campo: keyof ResultadoLaboratorio, valor: string) => modificar({ ...borrador, estudios: borrador.estudios.map(e => e.id !== estudioId ? e : { ...e, resultados: e.resultados.map(r => r.id !== resultadoId ? r : { ...r, [campo]: valor }) }) });
  const guardar = (finalizar: boolean) => {
    if (lectura) return;
    try {
      const vigente = { ...borrador, estudios: calculos.estudios };
      if (finalizar && Object.keys(calculos.errores).length) throw new Error('Revisa los avisos de las fórmulas antes de finalizar.');
      if (finalizar && vigente.estudios.some(e => !e.resultados.length || e.resultados.some(r => !r.parametro.trim() || !r.valor.trim()))) throw new Error('Completa el nombre y el resultado de todos los parámetros antes de finalizar.');
      const nuevo: SolicitudLaboratorio = modoEjemplo ? { ...vigente, estado: finalizar ? 'completado' : 'en_proceso', actualizadoEn: new Date().toISOString(), ...(finalizar ? { finalizadoEn: new Date().toISOString(), registradoPor: 'Laboratorio · Ejemplo' } : {}) } : guardarResultadosLaboratorio(vigente, finalizar, leerSesion()?.usuario.nombre || 'Usuario local');
      if (modoEjemplo) guardarEjemplo(nuevo);
      setBorrador(nuevo); setError(''); onGuardado(modoEjemplo ? finalizar ? 'Ejemplo finalizado. Puedes verlo en la pestaña Finalizado.' : 'Borrador de ejemplo guardado en esta vista.' : finalizar ? 'Resultados finalizados. Ya están disponibles en el consultorio.' : 'Borrador guardado. La solicitud sigue en proceso.');
    } catch (e) { setError((e as Error).message); }
  };
  return <aside className="lab-detalle panel lab-carga" aria-label={`Resultados de ${borrador.paciente}`}><header><div><h3>{lectura ? finalizado ? 'Resultados finalizados' : 'Resultados de la orden' : 'Asignar resultados'}</h3><p>{borrador.paciente}</p><small>CI {borrador.ci} · {borrador.medico}</small></div><button type="button" className="lab-cerrar" aria-label="Cerrar resultados" onClick={onCerrar}>×</button></header>
    <p className="lab-detalle-fecha">Solicitado {fecha(borrador.fecha)} <span className={`lab-estado ${borrador.estado}`}>{etiquetas[borrador.estado]}</span></p>
    {borrador.procedencia === 'recepcion' && <p className="lab-ayuda">Origen: Recepción · Registrado por {borrador.solicitadoPor || 'Recepción'} · Prioridad: <strong>{borrador.prioridad === 'urgente' ? 'Urgente' : 'Normal'}</strong></p>}
    {borrador.indicaciones && <p className="lab-ayuda"><strong>Diagnóstico / indicaciones:</strong> {borrador.indicaciones}</p>}
    {!lectura && <p className="lab-ayuda">Completa los resultados. Las unidades y referencias ya están configuradas.</p>}
    <div className="lab-carga-progreso"><div><strong>{completados} de {totalParametros} resultados</strong><span>{totalParametros === completados ? 'Carga completa' : 'Por completar'}</span></div><progress aria-label="Progreso de carga de resultados" value={completados} max={totalParametros || 1}/></div>
    <form onSubmit={e => { e.preventDefault(); guardar(true); }}>
      {calculos.estudios.map(estudio => <fieldset key={estudio.id} className="lab-estudio" disabled={lectura}>
        <legend><Icon name="lab" size={16}/>{estudio.nombre}<span>{estudio.resultados.length} {estudio.resultados.length === 1 ? 'parámetro' : 'parámetros'}</span></legend>
        <div className="lab-carga-columnas" aria-hidden="true"><span>Parámetro</span><span>Resultado</span><span>Estado</span></div>
        {estudio.resultados.map(r => <div className="lab-parametro lab-carga-fila" key={r.id}>
          <div className="lab-carga-identidad"><strong>{r.parametro}</strong>{r.formula && <span className="lab-carga-calculado"><Icon name="sparkles" size={12}/> Calculado</span>}</div>
          <label className="lab-carga-entrada"><span className="lab-sr">{r.formula ? 'Resultado calculado' : r.tipo === 'numero' ? 'Resultado numérico' : 'Resultado'}</span><span className={`lab-carga-control ${r.formula ? 'automatico' : ''}`}><input className="lab-carga-valor" readOnly={lectura || !!r.formula} inputMode={r.tipo === 'numero' ? 'decimal' : undefined} value={r.valor} required placeholder={r.formula ? 'Pendiente' : 'Ingresar valor'} onChange={e => cambiar(estudio.id, r.id, 'valor', e.target.value)}/><span aria-hidden="true" className="lab-carga-unidad-valor">{r.unidad || '—'}</span></span></label>
          <EstadoReferenciaLaboratorio resultado={r}/>
          {calculos.errores[r.id] && <p className="lab-formula-estado lab-carga-error-calculo" role="status">{calculos.errores[r.id]}</p>}
        </div>)}
      </fieldset>)}
      <label className="lab-observacion">Observaciones<textarea value={borrador.observacion} readOnly={lectura} onChange={e => modificar({ ...borrador, observacion: e.target.value })} placeholder="Observaciones del resultado"/></label>
      {error && <p role="alert" className="lab-error">{error}</p>}
      {lectura ? <p className="lab-finalizado"><Icon name="check" size={16}/> {finalizado ? <>Registrado por {borrador.registradoPor}{borrador.finalizadoEn && ` · ${fecha(borrador.finalizadoEn)}`}</> : 'Orden anterior · Solo lectura'}</p> : <footer className="lab-acciones"><button className="lab-boton" type="button" onClick={() => guardar(false)}>Guardar borrador</button><button className="lab-boton principal" type="submit">Finalizar resultados</button></footer>}
    </form>
  </aside>;
}
