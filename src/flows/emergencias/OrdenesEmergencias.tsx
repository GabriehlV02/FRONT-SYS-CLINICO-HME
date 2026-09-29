import { useRef, useState } from 'react';
import { fechaEmergencia, tiposOrden, type CuentaEmergencia, type ItemEmergencia, type OrdenEmergencia } from './emergenciasApi';

type Guardar = (ruta: string, body: object, mensaje: string) => Promise<boolean>;
const estados = { pendiente: 'Pendiente de aplicación', en_curso: 'Servicio en curso', aplicada: 'Aplicación registrada', cancelada: 'Suspendida' };

export function OrdenesEmergencias({ cuenta, catalogo, guardar, ocupado, enfermeria = false, editar }: {
  cuenta: CuentaEmergencia; catalogo: ItemEmergencia[]; guardar: Guardar; ocupado: boolean;
  enfermeria?: boolean; editar?: (orden: OrdenEmergencia) => void;
}) {
  return <section className="em-panel em-ordenes-panel">
    <header className="em-panel-titulo"><div><h3>{enfermeria ? 'Indicaciones médicas para enfermería' : 'Órdenes e indicaciones emitidas'}</h3><small>{enfermeria ? 'Revisa la indicación y confirma cada aplicación. Las cantidades son de consumo, no la dosis prescrita.' : 'Se muestran automáticamente en Triaje de emergencias.'}</small></div><b>{(cuenta.ordenes || []).filter(o => o.estado === 'pendiente').length} pendientes</b></header>
    {!cuenta.ordenes?.length && <p className="em-vacio">Aún no hay indicaciones médicas.</p>}
    {[...(cuenta.ordenes || [])].reverse().map(orden => <OrdenTarjeta key={orden.id} {...{ orden, cuenta, catalogo, guardar, ocupado, enfermeria, editar }} />)}
  </section>;
}

function OrdenTarjeta({ orden, cuenta, catalogo, guardar, ocupado, enfermeria, editar }: {
  orden: OrdenEmergencia; cuenta: CuentaEmergencia; catalogo: ItemEmergencia[];
  guardar: Guardar; ocupado: boolean; enfermeria: boolean; editar?: (orden: OrdenEmergencia) => void;
}) {
  const [formulario, setFormulario] = useState(false), [revision, setRevision] = useState(orden.revision);
  const [itemId, setItemId] = useState(orden.itemId), [cantidad, setCantidad] = useState(''), [observacion, setObservacion] = useState('');
  const [busqueda, setBusqueda] = useState(''), [suspender, setSuspender] = useState(false), [motivo, setMotivo] = useState('');
  const solicitud = useRef(crypto.randomUUID());
  const item = catalogo.find(i => i.id === itemId), vigente = !cuenta.fin && orden.estado !== 'cancelada';
  const consumoActivo = cuenta.consumos.find(c => c.ordenId === orden.id && c.porHora && !c.fin);
  return <article className={`em-orden-tarjeta estado-${orden.estado}`}>
    <header><div><small>{tiposOrden.find(t => t[0] === orden.tipo)?.[1]} · {fechaEmergencia(orden.fecha)}</small><h4>{orden.titulo}</h4></div><span className="em-etiqueta">{estados[orden.estado]}</span></header>
    <p className="em-texto-clinico">{orden.indicaciones}</p>
    <dl className="em-prescripcion">{[['Dosis prescrita', orden.dosis], ['Vía', orden.via], ['Frecuencia', orden.frecuencia], ['Duración', orden.duracion]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    {orden.porHora && <small>Servicio por tiempo: se calcula desde que enfermería inicia su uso.</small>}
    {!!orden.aplicaciones.length && <details><summary>{orden.aplicaciones.length} aplicación(es) registrada(s)</summary>{orden.aplicaciones.map(a => {
      const c = cuenta.consumos.find(i => i.registroId === a.consumoId);
      return <p key={a.id}>{fechaEmergencia(a.fecha)} · {c ? `${c.nombre} · ${c.porHora ? (c.fin ? 'Servicio finalizado' : 'En curso') : `${c.cantidad} ${c.unidad}`}` : 'Cumplimiento sin consumo'}{a.observacion ? ` · ${a.observacion}` : ''}</p>;
    })}</details>}
    {orden.estado === 'cancelada' && <small>{orden.historial.at(-1)?.detalle}</small>}
    {!enfermeria && vigente && <div className="em-acciones">
      {orden.estado === 'pendiente' && <button disabled={ocupado} onClick={() => editar?.(orden)}>Editar indicación</button>}
      {orden.estado !== 'en_curso' && <button disabled={ocupado} onClick={() => setSuspender(!suspender)}>Suspender</button>}
    </div>}
    {suspender && <form onSubmit={async e => { e.preventDefault(); if (await guardar(`/${cuenta.id}/cancelar-orden`, { ordenId: orden.id, revision: orden.revision, motivo }, 'Indicación suspendida en enfermería.')) setSuspender(false); }}><label>Motivo de suspensión<textarea required maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></label><button disabled={ocupado}>Confirmar suspensión</button></form>}
    {enfermeria && vigente && <div className="em-acciones">{consumoActivo ? <button disabled={ocupado} onClick={() => void guardar(`/${cuenta.id}/finalizar-consumo`, { registroId: consumoActivo.registroId }, 'Uso finalizado y consumo calculado.')}>Finalizar uso</button> : <button className="em-primario" disabled={ocupado || !cuenta.signos.length} onClick={() => { setFormulario(!formulario); setRevision(orden.revision); setItemId(orden.itemId); setCantidad(''); setObservacion(''); solicitud.current = crypto.randomUUID(); }}>{formulario ? 'Cerrar aplicación' : orden.aplicaciones.length ? 'Registrar otra aplicación' : 'Preparar aplicación'}</button>}</div>}
    {enfermeria && formulario && vigente && !consumoActivo && <form className="em-aplicar-orden" onSubmit={async e => {
      e.preventDefault();
      if (await guardar(`/${cuenta.id}/aplicar-orden`, { ordenId: orden.id, revision, registroId: solicitud.current, itemId, precio: item?.precio, cantidad: Number(cantidad), observacion }, 'Aplicación registrada en la indicación y en la cuenta.')) { setFormulario(false); solicitud.current = crypto.randomUUID(); }
    }}>
      {revision !== orden.revision && <p className="em-error">La indicación cambió. Cierra este formulario y revisa la versión actual antes de aplicarla.</p>}
      {!orden.itemId && <><label>Buscar ítem utilizado<input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre o código del catálogo" /></label><label>Producto / servicio<select value={itemId} onChange={e => setItemId(e.target.value)} required={orden.tipo === 'medicamento' || orden.tipo === 'servicio' || orden.porHora}><option value="">Cumplimiento sin consumo</option>{catalogo.filter(i => (!orden.porHora || i.tipo === 'servicio') && `${i.nombre} ${i.codigo}`.toLowerCase().includes(busqueda.toLowerCase())).map(i => <option key={i.id} value={i.id}>{i.nombre} · {i.codigo}</option>)}</select></label></>}
      {orden.itemId && <p>Ítem prescrito: {item?.nombre || 'No disponible en el catálogo. Actualiza el catálogo antes de aplicar.'}</p>}
      {item && <><small>Tarifa: Bs {item.precio.toFixed(2)} / {orden.porHora ? 'hora · proporcional al uso' : item.unidad}</small>{!orden.porHora && <label>Cantidad realmente utilizada ({item.unidad})<input required type="number" min="0.001" step="any" max="100000" value={cantidad} onChange={e => setCantidad(e.target.value)} /></label>}</>}
      <label>Observación de la aplicación<textarea required={!itemId} value={observacion} maxLength={1000} onChange={e => setObservacion(e.target.value)} /></label>
      <button className="em-primario" disabled={ocupado || revision !== orden.revision || (!!itemId && !item)}>{orden.porHora ? 'Iniciar uso y contador' : 'Confirmar aplicación'}</button>
    </form>}
  </article>;
}
