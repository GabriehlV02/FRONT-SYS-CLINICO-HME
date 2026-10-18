import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';
import { apiFetch } from '../../../radius/api';
import './ConfiguracionRecepcionView.css';

type Item = { id: string; nombre: string; tipo: string; precio?: number };
type Asociacion = { id: string; itemId: string; item: string; tipo: string; precio: number; funcionalidad: string; activo: boolean };
const clave = 'clinico_recepcion_funciones_items_v1';
const funcionalidades = ['Agenda de pacientes', 'Admisión e internación', 'Laboratorio', 'Imagenología', 'Consulta ambulatoria', 'Cirugía y quirófano'];
const respaldo: Item[] = [{ id: 'consulta', nombre: 'Consulta ambulatoria', tipo: 'Servicio', precio: 80 }, { id: 'hemograma', nombre: 'Hemograma completo', tipo: 'Servicio', precio: 50 }, { id: 'radiografia', nombre: 'Radiografía simple', tipo: 'Servicio', precio: 120 }];
const leer = (): Asociacion[] => { try { return JSON.parse(localStorage.getItem(clave) || '[]') as Asociacion[]; } catch { return []; } };

export function ConfiguracionRecepcionView() {
  const [busqueda, setBusqueda] = useState('');
  const [busquedaPaquetes, setBusquedaPaquetes] = useState('');
  const [paquetes, setPaquetes] = useState<Array<{ id: string; nombre: string; descripcion: string; estado: string }>>([]);
  const [items, setItems] = useState<Item[]>(respaldo);
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>(leer);
  const [abierto, setAbierto] = useState(false);
  const [itemId, setItemId] = useState('');
  const [funcionalidad, setFuncionalidad] = useState(funcionalidades[0]);
  const [error, setError] = useState('');
  const [cobros, setCobros] = useState(true);
  const [qr, setQr] = useState(true);
  useEffect(() => {
    apiFetch('/api-contable/inventario').then(async r => {
      if (!r.ok) return;
      const json = await r.json() as { data?: Array<Record<string, unknown>> };
      const recibidos = (json.data || []).map(x => ({ id: String(x.id), nombre: String(x.nombre || x.descripcion || 'Ítem sin nombre'), tipo: String(x.tipo || 'Ítem'), precio: Number(x.precioVenta || x.precio || 0) }));
      if (recibidos.length) setItems(recibidos);
    }).catch(() => undefined);
  }, []);
  useEffect(() => localStorage.setItem(clave, JSON.stringify(asociaciones)), [asociaciones]);
  const visibles = useMemo(() => asociaciones.filter(x => `${x.item} ${x.tipo} ${x.funcionalidad}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es'))), [asociaciones, busqueda]);
  const cerrar = () => { setAbierto(false); setItemId(''); setFuncionalidad(funcionalidades[0]); setError(''); };
  const guardar = () => {
    const item = items.find(x => x.id === itemId);
    if (!item) return setError('Selecciona un ítem del catálogo contable.');
    if (asociaciones.some(x => x.itemId === item.id && x.funcionalidad === funcionalidad)) return setError('Este ítem ya está asociado a esa funcionalidad.');
    setAsociaciones(actuales => [{ id: crypto.randomUUID(), itemId: item.id, item: item.nombre, tipo: item.tipo, precio: Number(item.precio || 0), funcionalidad, activo: true }, ...actuales]);
    cerrar();
  };
  const crearPaquete = () => {
    const nombre = window.prompt('Nombre del nuevo paquete');
    if (!nombre?.trim()) return;
    setPaquetes(actuales => [...actuales, { id: crypto.randomUUID(), nombre: nombre.trim(), descripcion: 'Paquete de servicios para recepción.', estado: 'Activo' }]);
  };
  return <section className="configuracion-recepcion">
    <section className="configuracion-recepcion-listado configuracion-paquetes" aria-label="Listado de paquetes"><div><h1>Paquetes</h1><p>Administra paquetes de servicios disponibles en Recepción.</p></div><label className="configuracion-recepcion-buscador"><Icon name="search" size={18}/><input type="search" value={busquedaPaquetes} onChange={e => setBusquedaPaquetes(e.target.value)} placeholder="Buscar paquete" aria-label="Buscar paquete"/></label><button className="configuracion-recepcion-crear" type="button" onClick={crearPaquete}><Icon name="plus" size={17}/> Crear nuevo paquete</button><div className="configuracion-recepcion-tabla configuracion-paquetes-tabla"><div className="configuracion-recepcion-encabezado" aria-hidden="true"><span>Paquete</span><span>Descripción</span><span>Estado</span></div>{paquetes.filter(x => `${x.nombre} ${x.descripcion}`.toLowerCase().includes(busquedaPaquetes.toLowerCase())).length ? paquetes.filter(x => `${x.nombre} ${x.descripcion}`.toLowerCase().includes(busquedaPaquetes.toLowerCase())).map(x => <div className="configuracion-recepcion-fila" key={x.id}><strong>{x.nombre}</strong><span>{x.descripcion}</span><b>{x.estado}</b></div>) : <p>{busquedaPaquetes ? 'No se encontraron paquetes.' : 'No hay paquetes registrados.'}</p>}</div></section>
    <section className="configuracion-recepcion-listado configuracion-funciones" aria-label="Asociaciones de ítems y funcionalidades">
      <div><h1>Funciones asociadas</h1><p>Vincula ítems de Contabilidad con los flujos clínicos que deben habilitar.</p></div>
      <label className="configuracion-recepcion-buscador"><Icon name="search" size={18}/><input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ítem o funcionalidad" aria-label="Buscar asociación"/></label>
      <button className="configuracion-recepcion-crear" type="button" onClick={() => setAbierto(true)}><Icon name="plus" size={17}/> Asociar ítem</button>
      <div className="configuracion-recepcion-tabla configuracion-funciones-tabla"><div className="configuracion-recepcion-encabezado" aria-hidden="true"><span>Ítem contable</span><span>Funcionalidad clínica</span><span>Estado</span><span>Acciones</span></div>{visibles.length ? visibles.map(x => <div className="configuracion-recepcion-fila" key={x.id}><div><strong>{x.item}</strong><small>{x.tipo} · Bs {(x.precio || 0).toFixed(2)}</small></div><span>{x.funcionalidad}</span><button className={`funcion-estado ${x.activo ? 'activo' : ''}`} type="button" onClick={() => setAsociaciones(a => a.map(v => v.id === x.id ? { ...v, activo: !v.activo } : v))}>{x.activo ? 'Habilitada' : 'Desactivada'}</button><button className="funcion-eliminar" type="button" onClick={() => setAsociaciones(a => a.filter(v => v.id !== x.id))} aria-label={`Quitar ${x.item}`}><Icon name="close" size={16}/></button></div>) : <p>{busqueda ? 'No se encontraron asociaciones.' : 'Aún no hay ítems asociados a funcionalidades.'}</p>}</div>
    </section>
    <section className="configuracion-recepcion-opciones" aria-label="Opciones de cobro"><div><strong>Cobros</strong><small>Permite registrar cobros desde la caja.</small></div><label className="configuracion-interruptor"><input type="checkbox" checked={cobros} onChange={e => setCobros(e.target.checked)}/><span aria-hidden="true"/><b>{cobros ? 'Habilitados' : 'Desactivados'}</b></label><div><strong>Cobros por QR</strong><small>Permite mostrar el botón que genera códigos QR de cobro.</small></div><label className="configuracion-interruptor"><input type="checkbox" checked={qr} onChange={e => setQr(e.target.checked)} disabled={!cobros}/><span aria-hidden="true"/><b>{qr && cobros ? 'Habilitados' : 'Desactivados'}</b></label></section>
    {abierto && <div className="configuracion-paquete-fondo" onClick={cerrar}><section className="configuracion-paquete-modal configuracion-funcion-modal" role="dialog" aria-modal="true" aria-labelledby="asociar-item" onClick={e => e.stopPropagation()}><header><div><span>NUEVA ASOCIACIÓN</span><h2 id="asociar-item">Asociar ítem a una funcionalidad</h2></div><button type="button" onClick={cerrar} aria-label="Cerrar"><Icon name="close" size={18}/></button></header><div className="configuracion-funcion-contenido"><p>Selecciona el ítem contable y el flujo clínico que habilitará.</p><label>Ítem contable<select value={itemId} onChange={e => setItemId(e.target.value)} autoFocus><option value="">Seleccionar ítem</option>{items.map(x => <option key={x.id} value={x.id}>{x.nombre} · {x.tipo} · Bs {(x.precio || 0).toFixed(2)}</option>)}</select></label><label>Funcionalidad clínica<select value={funcionalidad} onChange={e => setFuncionalidad(e.target.value)}>{funcionalidades.map(x => <option key={x}>{x}</option>)}</select></label>{error && <p className="configuracion-paquete-error">{error}</p>}</div><footer><button type="button" onClick={cerrar}>Cancelar</button><button type="button" className="configuracion-paquete-guardar" onClick={guardar}><Icon name="check" size={16}/> Guardar asociación</button></footer></section></div>}
  </section>;
}
