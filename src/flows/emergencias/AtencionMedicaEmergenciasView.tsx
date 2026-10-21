import { useEffect, useRef, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { apiEmergencias, camposEvaluacion, camposIdentidad, fechaEmergencia, nombrePaciente, tiposOrden, type CuentaEmergencia, type ItemEmergencia, type OrdenEmergencia } from './emergenciasApi';
import { OrdenesEmergencias } from './OrdenesEmergencias';
import { HojaLaboratorios } from '../consultorio/HojaLaboratorios';
import './TriajeEmergenciasView.css';
import './AtencionMedicaEmergenciasView.css';
import { cubiculosEmergencias, nombreCubiculo } from './cubiculos';

type BorradorOrden = Pick<OrdenEmergencia, 'id' | 'revision' | 'tipo' | 'titulo' | 'indicaciones' | 'dosis' | 'via' | 'frecuencia' | 'duracion' | 'itemId' | 'porHora'>;
const nuevaOrden = (tipo = 'medicamento'): BorradorOrden => ({ id: crypto.randomUUID(), revision: 0, tipo, titulo: '', indicaciones: '', dosis: '', via: '', frecuencia: '', duracion: '', itemId: '', porHora: false });
const vitales = [['temperatura', 'Temperatura', '°C'], ['frecuenciaCardiaca', 'Frec. cardíaca', 'lpm'], ['frecuenciaRespiratoria', 'Frec. respiratoria', 'rpm'], ['presionSistolica', 'Presión sistólica', 'mmHg'], ['presionDiastolica', 'Presión diastólica', 'mmHg'], ['saturacion', 'Saturación', '%'], ['glicemia', 'Glicemia', 'mg/dL'], ['peso', 'Peso', 'kg']];
const tiposImagen = ['Rayos X', 'Tomografía', 'Ecografía', 'Electrocardiograma', 'Holter', 'Resonancia magnética', 'Mamografía', 'Densitometría ósea'];
const regionesImagen = ['Cráneo', 'Cuello', 'Tórax', 'Abdomen', 'Pelvis', 'Columna cervical', 'Columna dorsal', 'Columna lumbar', 'Miembro superior', 'Miembro inferior'];
type EstudioImagen = { id: string; tipo: string; contraste: 'sin contraste' | 'con contraste'; regiones: string[] };

export function AtencionMedicaEmergenciasView() {
  const [cuentas, setCuentas] = useState<CuentaEmergencia[]>([]), [activa, setActiva] = useState(''), [busqueda, setBusqueda] = useState('');
  const [finalizadas, setFinalizadas] = useState(false), [cargando, setCargando] = useState(true), [error, setError] = useState('');
  const [catalogo, setCatalogo] = useState<ItemEmergencia[]>([]), [errorCatalogo, setErrorCatalogo] = useState('');
  const [iniciando, setIniciando] = useState(false), [cubiculoNuevo, setCubiculoNuevo] = useState('');
  const [selectorCubiculoAbierto, setSelectorCubiculoAbierto] = useState(false), [errorCubiculo, setErrorCubiculo] = useState('');
  const [datosNuevos, setDatosNuevos] = useState({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '', nacimiento: '', telefono: '' });
  const guardando = useRef(false), secuencia = useRef(0), formularioSucio = useRef(false), solicitud = useRef(crypto.randomUUID());
  async function cargar() {
    if (guardando.current) return;
    const lectura = ++secuencia.current;
    try { const datos = await apiEmergencias<{ cuentas: CuentaEmergencia[] }>(); if (lectura === secuencia.current) { setCuentas(datos.cuentas); setError(''); } }
    catch (e) { if (lectura === secuencia.current) setError((e as Error).message); }
    finally { setCargando(false); }
  }
  async function cargarCatalogo() {
    try { setCatalogo(await apiEmergencias<ItemEmergencia[]>('/catalogo')); setErrorCatalogo(''); }
    catch (e) { setErrorCatalogo((e as Error).message); }
  }
  useEffect(() => {
    void cargar(); void cargarCatalogo();
    const t = window.setInterval(() => void cargar(), 5000);
    const salir = (e: BeforeUnloadEvent) => { if (formularioSucio.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', salir);
    return () => { clearInterval(t); secuencia.current++; window.removeEventListener('beforeunload', salir); };
  }, []);
  const cuenta = cuentas.find(c => c.id === activa);
  const visibles = cuentas.filter(c => (finalizadas || !c.fin) && `${c.cubiculo} ${nombrePaciente(c)} ${c.identidad?.documento || ''}`.toLowerCase().includes(busqueda.toLowerCase()));
  async function iniciarAtencion(evento: FormEvent) {
    evento.preventDefault();
    if (!cubiculoNuevo) { setErrorCubiculo('Selecciona un cubículo de atención antes de iniciar.'); setSelectorCubiculoAbierto(true); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.em-medica-nueva .em-selector-cubiculo > button')?.focus()); return; }
    setErrorCubiculo('');
    guardando.current = true; setError('');
    try {
      const identidad = Object.fromEntries(Object.entries(datosNuevos).filter(([, valor]) => valor.trim()));
      const apellidos = [datosNuevos.apellidoPaterno, datosNuevos.apellidoMaterno].filter(Boolean).join(' ');
      const creada = await apiEmergencias<CuentaEmergencia>('', { cubiculo: cubiculoNuevo, identidad: { ...identidad, apellidos }, solicitudId: solicitud.current });
      setCuentas(actuales => [creada, ...actuales.filter(item => item.id !== creada.id)]);
      setActiva(creada.id); setIniciando(false); setCubiculoNuevo(''); setSelectorCubiculoAbierto(false); solicitud.current = crypto.randomUUID();
      setDatosNuevos({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '', nacimiento: '', telefono: '' });
    } catch (e) { setError((e as Error).message); }
    finally { guardando.current = false; }
  }
    return <section className="emergencias-vista em-medica">
    <header className="em-cabecera"><div><p>EMERGENCIAS · ATENCIÓN MÉDICA</p><h2>Evaluación y tratamiento</h2></div><div className="em-medica-cabecera-acciones"><button className="em-actualizar" type="button" onClick={() => void cargar()}><Icon name="refresh" size={18}/> Actualizar</button><button className="em-primario em-iniciar-atencion" type="button" onClick={() => setIniciando(true)}><Icon name="plus" size={20} strokeWidth={2.3}/> Iniciar atención</button></div></header>
    {iniciando && <div className="em-modal-inicio" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setIniciando(false); }}><form className="em-panel em-medica-nueva" role="dialog" aria-modal="true" aria-labelledby="em-medica-inicio-titulo" onSubmit={iniciarAtencion}>
      <header><div><span>INGRESO DIRECTO</span><h3 id="em-medica-inicio-titulo">Iniciar atención médica</h3><p>Selecciona un cubículo y registra los datos disponibles para abrir la atención.</p></div><button type="button" aria-label="Cerrar" onClick={() => setIniciando(false)}><Icon name="close" size={18}/></button></header>
      <div className="em-selector-cubiculo" onKeyDown={evento => { if (evento.key === 'Escape') setSelectorCubiculoAbierto(false); }}><span>Cubículo de atención *</span><button type="button" disabled={guardando.current} className={cubiculoNuevo ? 'seleccionado' : ''} aria-haspopup="listbox" aria-expanded={selectorCubiculoAbierto} onClick={() => setSelectorCubiculoAbierto(abierto => !abierto)}>{cubiculoNuevo ? nombreCubiculo(cubiculoNuevo) : 'Selecciona un cubículo'}<Icon name="chevronDown" size={16} /></button>{selectorCubiculoAbierto && <div className="em-opciones-cubiculo" role="listbox" aria-label="Cubículo de atención">{cubiculosEmergencias.map(cubiculo => <button type="button" role="option" aria-selected={cubiculoNuevo === cubiculo.id} key={cubiculo.id} onClick={() => { setCubiculoNuevo(cubiculo.id); setSelectorCubiculoAbierto(false); setErrorCubiculo(''); solicitud.current = crypto.randomUUID(); }}>{cubiculoNuevo === cubiculo.id && <Icon name="check" size={15} />}{cubiculo.nombre}</button>)}</div>}</div>
      {errorCubiculo && <p className="em-error em-error-cubiculo" role="alert">{errorCubiculo}</p>}
      <fieldset><legend>Datos básicos del paciente · opcionales</legend><div className="em-form-grid">{([['nombres','Nombres','text'],['apellidoPaterno','Apellido paterno','text'],['apellidoMaterno','Apellido materno','text'],['documento','Documento de identidad','text'],['nacimiento','Fecha de nacimiento','date'],['telefono','Teléfono','tel']] as const).map(([campo, etiqueta, tipo]) => <label key={campo}>{etiqueta}<input type={tipo} maxLength={200} value={datosNuevos[campo]} onChange={evento => setDatosNuevos(actual => ({ ...actual, [campo]: evento.target.value }))}/></label>)}</div></fieldset>
      <footer><button type="button" onClick={() => setIniciando(false)}>Cancelar</button><button className="em-primario" disabled={guardando.current}><Icon name="plus" size={16}/> Iniciar y atender</button></footer>
    </form></div>}
    <div className="em-medica-layout">
      {!cuenta && <aside className="em-panel em-cubiculos"><label className="em-buscar"><Icon name="search" size={16} /><input placeholder="Paciente, CI o cubículo" aria-label="Buscar paciente de emergencias" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label><h3>Pacientes en emergencias</h3><small>{cuentas.filter(c => !c.fin).length} atenciones activas</small><label className="em-check"><input type="checkbox" checked={finalizadas} onChange={e => setFinalizadas(e.target.checked)} /> Incluir finalizadas</label>
        {visibles.map(c => <button key={c.id} className="em-cubiculo" disabled={guardando.current} onClick={() => {
          if (guardando.current) return;
          if (formularioSucio.current && !window.confirm('Hay datos sin guardar. ¿Atender a este paciente y descartar el borrador?')) return;
          formularioSucio.current = false; setActiva(c.id);
        }}><strong>{nombreCubiculo(c.cubiculo)}</strong><span>{nombrePaciente(c)}</span><small>{c.fin ? 'Atención finalizada' : `${c.signos.length} registro(s) de signos vitales`}</small><small>{(c.ordenes || []).filter(o => o.estado === 'pendiente').length} indicaciones pendientes</small></button>)}
        {!visibles.length && <p className="em-vacio">{cargando ? 'Cargando pacientes…' : 'No hay atenciones activas. Puedes iniciar una desde esta vista.'}</p>}
      </aside>}
      {cuenta ? <AtencionPaciente key={cuenta.id} {...{ cuenta, catalogo, errorCatalogo, cargarCatalogo }} volver={() => { if (formularioSucio.current && !window.confirm('Hay datos sin guardar. ¿Volver al listado y descartar el borrador?')) return; formularioSucio.current = false; setActiva(''); }} alEditar={valor => { formularioSucio.current = valor; }} ejecutar={async (ruta, body) => {
        if (guardando.current) throw new Error('Espera a que termine la operación actual.');
        guardando.current = true; secuencia.current++;
        try { const actualizada = await apiEmergencias<CuentaEmergencia>(ruta, body); secuencia.current++; setCuentas(prev => prev.map(c => c.id === actualizada.id ? actualizada : c)); }
        finally { guardando.current = false; }
      }} /> : null}
    </div>
  </section>;
}

function AtencionPaciente({ cuenta, catalogo, errorCatalogo, cargarCatalogo, ejecutar, alEditar, volver }: {
  cuenta: CuentaEmergencia; catalogo: ItemEmergencia[]; errorCatalogo: string; cargarCatalogo: () => Promise<void>;
  ejecutar: (ruta: string, body: object) => Promise<void>; alEditar: (valor: boolean) => void; volver: () => void;
}) {
  const ultima = cuenta.evaluaciones?.at(-1);
  const [evaluacion, setEvaluacion] = useState<{ revision: number; campos: Record<string, string> } | null>(null);
  const [identidad, setIdentidad] = useState<{ revision: number; datos: Record<string, string> } | null>(null);
  const [cierre, setCierre] = useState<{ condicionEgreso: 'vivo' | 'muerto'; causaEgreso: 'hospitalaria' | 'solicitada' | 'fuga' | 'transferencia' | 'deceso' | 'internacion'; observacionEgreso: string } | null>(null);
  const [orden, setOrden] = useState<BorradorOrden | null>(null), [buscarItem, setBuscarItem] = useState('');
  const [estudiosImagen, setEstudiosImagen] = useState<EstudioImagen[]>([]), [tipoImagen, setTipoImagen] = useState('Rayos X');
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState(''), [mensaje, setMensaje] = useState('');
  const bloqueo = useRef(false), editorOrden = useRef<HTMLDivElement>(null);
  useEffect(() => { alEditar(Boolean(evaluacion || identidad || orden || cierre)); }, [evaluacion, identidad, orden, cierre]);
  async function guardar(ruta: string, body: object, aviso: string) {
    if (bloqueo.current) return false;
    bloqueo.current = true; setOcupado(true); setError(''); setMensaje('');
    try { await ejecutar(ruta, body); setMensaje(aviso); return true; }
    catch (e) { setError((e as Error).message); return false; }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  function abrirOrden(tipo: string, existente?: OrdenEmergencia) {
    if (orden && !window.confirm('¿Descartar el borrador de la indicación actual?')) return;
    setOrden(existente ? { ...existente } : nuevaOrden(tipo)); setBuscarItem(''); setEstudiosImagen([]); setTipoImagen('Rayos X');
    window.setTimeout(() => editorOrden.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }
  const ultimoSigno = cuenta.signos.at(-1);
  return <div className="em-medica-atencion">
    <main className="em-trabajo">
      <button type="button" className="em-volver-listado" onClick={volver}><Icon name="chevronLeft" size={16}/> Volver a pacientes</button>
      <header className="em-panel em-medica-cabecera"><div><p>ATENCIÓN MÉDICA · {nombreCubiculo(cuenta.cubiculo)}</p><h2>{nombrePaciente(cuenta)}</h2><small>Ingreso: {fechaEmergencia(cuenta.inicio)} · Cuenta {cuenta.id.slice(0, 8).toUpperCase()}{cuenta.fin ? ' · FINALIZADA' : ''}</small></div>
        {!cuenta.fin && <nav className="em-accesos-orden"><button onClick={() => abrirOrden('medicamento')}>Receta / indicación</button><button onClick={() => abrirOrden('laboratorio')}><Icon name="lab" size={15} /> Laboratorio</button><button onClick={() => abrirOrden('imagenologia')}><Icon name="image" size={15} /> Imagenología</button><button onClick={() => abrirOrden('internacion')}>Internación</button></nav>}
      </header>
      {error && <div className="em-error" role="alert">{error}</div>}{mensaje && <div className="em-aviso" role="status">{mensaje}</div>}
      <section className="em-panel"><header className="em-panel-titulo"><div><h3>Evaluación y evolución médica</h3><small>Registra lo conocido. Los campos desconocidos pueden quedar pendientes.</small></div>{!cuenta.fin && !evaluacion && <button onClick={() => setEvaluacion({ revision: ultima?.revision || 0, campos: { ...(ultima?.campos || {}) } })}>{ultima ? 'Actualizar evaluación' : 'Iniciar evaluación'}</button>}</header>
        {evaluacion ? <form onSubmit={async e => { e.preventDefault(); if (await guardar(`/${cuenta.id}/evaluacion`, evaluacion, 'Evaluación guardada y disponible en enfermería.')) setEvaluacion(null); }}>
          {evaluacion.revision !== (ultima?.revision || 0) && <p className="em-error">Existe una evaluación más reciente. Conservamos tu borrador; cancela para consultar la versión guardada antes de volver a editar.</p>}
          <div className="em-form-grid">{camposEvaluacion.map(([k, titulo]) => <label key={k}>{titulo}<textarea maxLength={5000} value={evaluacion.campos[k] || ''} onChange={e => setEvaluacion({ ...evaluacion, campos: { ...evaluacion.campos, [k]: e.target.value } })} placeholder="Pendiente / aún no conocido" /></label>)}</div>
          <div className="em-acciones"><button type="button" onClick={() => setEvaluacion(null)}>Cancelar</button><button className="em-primario" disabled={ocupado || !!cuenta.fin || evaluacion.revision !== (ultima?.revision || 0)}>Guardar evaluación</button></div>
        </form> : ultima ? <><small>Actualizada: {fechaEmergencia(ultima.fecha)} · Versión {ultima.revision}</small><dl className="em-evaluacion-lectura">{camposEvaluacion.map(([k, titulo]) => <div key={k}><dt>{titulo}</dt><dd>{ultima.campos[k] || 'Pendiente de conocer'}</dd></div>)}</dl></> : <p className="em-vacio">Aún no hay una evaluación médica registrada.</p>}
        {(cuenta.evaluaciones?.length || 0) > 1 && <details className="em-historial-evaluacion"><summary>Versiones anteriores de la evaluación ({cuenta.evaluaciones!.length - 1})</summary>{cuenta.evaluaciones!.slice(0, -1).reverse().map(v => <details key={v.revision}><summary>Versión {v.revision} · {fechaEmergencia(v.fecha)}</summary>{camposEvaluacion.filter(([k]) => v.campos[k]).map(([k, t]) => <p key={k}><strong>{t}: </strong>{v.campos[k]}</p>)}</details>)}</details>}
      </section>
      <section className="em-panel em-cierre-emergencia"><header className="em-panel-titulo"><div><h3>Cierre de atención de emergencia</h3><small>Completa este paso al finalizar. Se registra automáticamente el tiempo de estadía.</small></div>{!cuenta.fin && !cierre && <button onClick={() => setCierre({ condicionEgreso: 'vivo', causaEgreso: 'hospitalaria', observacionEgreso: '' })}>Finalizar atención</button>}</header>
        {cierre ? <form onSubmit={async e => { e.preventDefault(); if (!window.confirm('¿Finalizar esta atención? Ya no se podrán registrar nuevas evaluaciones u órdenes.')) return; if (await guardar(`/${cuenta.id}/cierre`, cierre, 'Atención de emergencia finalizada.')) setCierre(null); }}><div className="em-form-grid"><label>Condición de egreso<select value={cierre.condicionEgreso} onChange={e => setCierre({ ...cierre, condicionEgreso: e.target.value as typeof cierre.condicionEgreso })}><option value="vivo">Vivo</option><option value="muerto">Muerto</option></select></label><label>Causa de alta de emergencia<select value={cierre.causaEgreso} onChange={e => setCierre({ ...cierre, causaEgreso: e.target.value as typeof cierre.causaEgreso })}><option value="hospitalaria">Alta hospitalaria</option><option value="solicitada">Alta solicitada</option><option value="fuga">Fuga</option><option value="transferencia">Transferencia</option><option value="deceso">Deceso</option><option value="internacion">Internación</option></select></label></div><label>Observación de egreso<textarea maxLength={3000} value={cierre.observacionEgreso} onChange={e => setCierre({ ...cierre, observacionEgreso: e.target.value })} placeholder="Resumen, destino, recomendaciones o información relevante del egreso" /></label><div className="em-acciones"><button type="button" onClick={() => setCierre(null)}>Cancelar</button><button className="em-primario" disabled={ocupado}>Confirmar cierre de atención</button></div></form> : cuenta.cierre ? <div className="em-cierre-registrado"><strong>Atención finalizada · {fechaEmergencia(cuenta.cierre.fecha)}</strong><span>Condición: {cuenta.cierre.condicionEgreso === 'vivo' ? 'Vivo' : 'Muerto'} · Causa: {cuenta.cierre.causaEgreso}</span>{cuenta.cierre.observacionEgreso && <p>{cuenta.cierre.observacionEgreso}</p>}<small>Registrado por {cuenta.cierre.usuario}</small></div> : <p className="em-vacio">Pendiente de cierre. Se registrarán condición, causa de egreso, observación y tiempo de estadía.</p>}
      </section>
      <div ref={editorOrden} className={orden && ['laboratorio', 'imagenologia', 'internacion'].includes(orden.tipo) ? 'em-modal-orden' : undefined}>{orden?.tipo === 'laboratorio' && <HojaLaboratorios paciente={nombrePaciente(cuenta)} onCerrar={() => setOrden(null)} onAceptar={async items => { const detalle = items.map(i => i.nombre).join(' · '); if (await guardar(`/${cuenta.id}/orden`, { ...orden, titulo: `Laboratorio: ${items.length} análisis`, indicaciones: detalle }, 'Orden de laboratorio guardada.')) setOrden(null); else throw new Error('No se pudo guardar la orden.'); }} />}
        {orden?.tipo === 'imagenologia' && <section className="em-panel em-orden-estudio"><header className="em-panel-titulo"><div><h3>Orden de imagenología</h3><small>Agrega todos los estudios requeridos y define sus regiones.</small></div></header><form onSubmit={async e => { e.preventDefault(); if (!estudiosImagen.length) { setError('Agrega al menos un estudio de imagenología.'); return; } const detalle = estudiosImagen.map(x => `${x.tipo}${x.tipo === 'Tomografía' ? ` (${x.contraste})` : ''}: ${x.regiones.join(', ') || 'región por definir'}`).join(' · '); if (await guardar(`/${cuenta.id}/orden`, { ...orden, titulo: `Imagenología: ${estudiosImagen.length} estudio(s)`, indicaciones: detalle }, 'Orden de imagenología guardada.')) setOrden(null); }}><div className="em-agregar-imagen"><label>Tipo de estudio<select value={tipoImagen} onChange={e => setTipoImagen(e.target.value)}>{tiposImagen.map(tipo => <option key={tipo}>{tipo}</option>)}</select></label><button type="button" onClick={() => setEstudiosImagen(actual => [...actual, { id: crypto.randomUUID(), tipo: tipoImagen, contraste: 'sin contraste', regiones: [] }])}><Icon name="plus" size={15} /> Agregar estudio</button></div>{!estudiosImagen.length && <p className="em-vacio">Aún no hay estudios agregados.</p>}<div className="em-estudios-imagen">{estudiosImagen.map((estudio, indice) => <article key={estudio.id}><header><strong>{indice + 1}. {estudio.tipo}</strong><button type="button" onClick={() => setEstudiosImagen(actual => actual.filter(x => x.id !== estudio.id))}>Quitar</button></header>{estudio.tipo === 'Tomografía' && <label className="em-switch">Contraste<select value={estudio.contraste} onChange={e => setEstudiosImagen(actual => actual.map(x => x.id === estudio.id ? { ...x, contraste: e.target.value as EstudioImagen['contraste'] } : x))}><option value="sin contraste">Sin contraste</option><option value="con contraste">Con contraste</option></select></label>}<fieldset><legend>{estudio.tipo === 'Rayos X' ? 'Piezas / regiones a radiografiar' : 'Regiones a contemplar'}</legend><div>{regionesImagen.map(region => <label className="em-check" key={region}><input type="checkbox" checked={estudio.regiones.includes(region)} onChange={() => setEstudiosImagen(actual => actual.map(x => x.id !== estudio.id ? x : { ...x, regiones: x.regiones.includes(region) ? x.regiones.filter(r => r !== region) : [...x.regiones, region] }))} />{region}</label>)}</div></fieldset></article>)}</div><div className="em-acciones"><button type="button" onClick={() => setOrden(null)}>Cancelar</button><button type="button" onClick={() => window.print()}>Imprimir</button><button type="button" onClick={() => window.print()}>Descargar PDF</button><button className="em-primario" disabled={ocupado}>Aceptar y guardar</button></div></form></section>}
        {orden?.tipo === 'internacion' && <section className="em-panel em-internacion-vacia"><header className="em-panel-titulo"><h3>Orden de internación</h3><button type="button" onClick={() => setOrden(null)}>Cerrar</button></header></section>}
        {orden && !['laboratorio', 'imagenologia', 'internacion'].includes(orden.tipo) && <section className="em-panel"><header className="em-panel-titulo"><h3>{orden.revision ? 'Editar indicación pendiente' : 'Nueva receta / orden médica'}</h3><small>Se enviará a enfermería al guardar</small></header>
        <form onSubmit={async e => { e.preventDefault(); if (await guardar(`/${cuenta.id}/orden`, orden, 'Indicación enviada a Triaje de emergencias.')) setOrden(null); }}>
          <div className="em-form-grid"><label>Tipo de orden<select value={orden.tipo} onChange={e => setOrden({ ...orden, tipo: e.target.value })}>{tiposOrden.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label><label>Nombre / medicamento / procedimiento<input required maxLength={200} value={orden.titulo} onChange={e => setOrden({ ...orden, titulo: e.target.value })} /></label></div>
          <label>Indicaciones para enfermería<textarea required maxLength={3000} value={orden.indicaciones} onChange={e => setOrden({ ...orden, indicaciones: e.target.value })} placeholder="Escribe la prescripción o instrucción que debe seguir enfermería" /></label>
          <div className="em-form-grid">{[['dosis', 'Dosis prescrita y unidad'], ['via', 'Vía de administración'], ['frecuencia', 'Frecuencia / momento de aplicación'], ['duracion', 'Duración indicada']].map(([k, titulo]) => <label key={k}>{titulo}<input maxLength={200} value={String(orden[k as keyof BorradorOrden])} onChange={e => setOrden({ ...orden, [k]: e.target.value })} /></label>)}</div>
          <details open={!!orden.itemId}><summary>Precargar un producto o servicio del catálogo</summary>
            {errorCatalogo && <p className="em-error">{errorCatalogo}</p>}<div className="em-buscador-catalogo"><label>Buscar en catálogo<input value={buscarItem} onChange={e => setBuscarItem(e.target.value)} placeholder="Nombre o código" /></label><button type="button" onClick={() => void cargarCatalogo()}>Actualizar catálogo</button></div>
            <label>Ítem para enfermería<select value={orden.itemId} onChange={e => { const i = catalogo.find(x => x.id === e.target.value); setOrden({ ...orden, itemId: e.target.value, titulo: orden.titulo || i?.nombre || '', porHora: i?.tipo === 'producto' ? false : orden.porHora }); }}><option value="">Sin vincular: enfermería seleccionará el ítem utilizado</option>{catalogo.filter(i => i.id === orden.itemId || `${i.nombre} ${i.codigo}`.toLowerCase().includes(buscarItem.toLowerCase())).map(i => <option value={i.id} key={i.id}>{i.nombre} · {i.codigo} · {i.unidad}</option>)}</select></label>
            {!catalogo.length && <small>El catálogo está vacío o no disponible. Puedes emitir la indicación escrita ahora y vincular el consumo al aplicarla.</small>}
          </details>
          <label className="em-check"><input type="checkbox" disabled={catalogo.find(i => i.id === orden.itemId)?.tipo === 'producto'} checked={orden.porHora} onChange={e => setOrden({ ...orden, porHora: e.target.checked })} /> Servicio por hora: enfermería iniciará y finalizará el contador.</label>
          <div className="em-acciones"><button type="button" onClick={() => setOrden(null)}>Cancelar</button><button className="em-primario" disabled={ocupado || !!cuenta.fin}>Enviar a enfermería</button></div>
        </form>
      </section>}</div>
      <OrdenesEmergencias {...{ cuenta, catalogo, guardar, ocupado }} editar={o => abrirOrden(o.tipo, o)} />
    </main>
    <aside className="em-medica-datos">
      <section className="em-panel"><header className="em-panel-titulo"><h3>Datos disponibles</h3>{!identidad && !cuenta.fin && <button onClick={() => setIdentidad({ revision: cuenta.revision, datos: { ...(cuenta.identidad || {}) } })}>Anotar / editar</button>}</header>
        {identidad ? <form onSubmit={async e => { e.preventDefault(); if (await guardar(`/${cuenta.id}/identidad`, { ...identidad.datos, revision: identidad.revision }, 'Información del paciente actualizada en la cuenta.')) setIdentidad(null); }}>
          <small>Todos los campos son opcionales. Guarda únicamente los datos conocidos.</small>
          {camposIdentidad.map(([k, t]) => <label key={k}>{t}<input type={k === 'nacimiento' ? 'date' : 'text'} maxLength={200} value={identidad.datos[k] || ''} onChange={e => setIdentidad({ ...identidad, datos: { ...identidad.datos, [k]: e.target.value } })} /></label>)}
          <div className="em-acciones"><button type="button" onClick={() => setIdentidad(null)}>Cancelar</button><button className="em-primario" disabled={ocupado || !!cuenta.fin}>Guardar datos</button></div>
        </form> : <dl className="em-datos-disponibles">{camposIdentidad.map(([k, t]) => <div key={k}><dt>{t}</dt><dd>{cuenta.identidad?.[k] || 'No conocido'}</dd></div>)}</dl>}
      </section>
      <section className="em-panel"><header className="em-panel-titulo"><div><h3>Signos vitales</h3><small>Registrados por enfermería</small></div><Icon name="patient" size={20} /></header>
        {ultimoSigno ? <><small>Última medición: {fechaEmergencia(ultimoSigno.fecha)}</small><div className="em-medica-vitales">{vitales.map(([k, t, u]) => <div key={k}><small>{t}</small><strong>{ultimoSigno.valores[k] === undefined ? 'No medido' : `${ultimoSigno.valores[k]} ${u}`}</strong></div>)}</div>{ultimoSigno.observacion && <p className="em-texto-clinico">{ultimoSigno.observacion}</p>}</> : <p>Signos vitales pendientes. Puedes continuar registrando la atención médica.</p>}
        {cuenta.signos.length > 1 && <details><summary>Mediciones anteriores ({cuenta.signos.length - 1})</summary>{cuenta.signos.slice(0, -1).reverse().map(s => <p key={s.id}><strong>{fechaEmergencia(s.fecha)}</strong><br />{vitales.filter(([k]) => s.valores[k] !== undefined).map(([k, t, u]) => `${t}: ${s.valores[k]} ${u}`).join(' · ')}{s.observacion && ` · ${s.observacion}`}</p>)}</details>}
      </section>
      <section className="em-panel"><h3>Actividad de enfermería</h3><small>{cuenta.consumos.length} consumo(s) registrado(s)</small>{cuenta.consumos.filter(c => c.porHora && !c.fin).map(c => <p className="em-servicio-activo" key={c.registroId}>● {c.nombre}<small>En uso desde {fechaEmergencia(c.inicio)}</small></p>)}</section>
    </aside>
  </div>;
}
