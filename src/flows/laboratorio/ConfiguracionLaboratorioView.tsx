import { useEffect, useRef, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import {
  guardarCategoriaLaboratorio, guardarTipoLaboratorio, leerCatalogoLaboratorio, suscribirCatalogoLaboratorio,
  type CategoriaLaboratorio, type ConfiguracionLaboratorio, type ParametroLaboratorio, type TipoLaboratorio,
} from './catalogoLaboratorio';
import './LaboratorioView.css';
import './ConfiguracionLaboratorioView.css';

export function ConfiguracionLaboratorioView() {
  const [catalogo, setCatalogo] = useState<ConfiguracionLaboratorio>({ categorias: [], tipos: [] });
  const [vista, setVista] = useState<'tipos' | 'categorias'>('tipos');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState<TipoLaboratorio | null>(null);
  const [categoria, setCategoria] = useState<CategoriaLaboratorio | null>(null);
  const [modificado, setModificado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const cargar = () => { try { setCatalogo(leerCatalogoLaboratorio()); setError(''); } catch (e) { setError((e as Error).message); } };
    cargar();
    return suscribirCatalogoLaboratorio(cargar);
  }, []);
  const continuar = () => !modificado || window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');
  const editarTipo = (nuevo: TipoLaboratorio | null) => { if (!continuar()) return; setTipo(nuevo); setModificado(false); setMensaje(''); };
  const editarCategoria = (nueva: CategoriaLaboratorio | null) => { if (!continuar()) return; setCategoria(nueva); setModificado(false); setMensaje(''); };
  const cambiarVista = (nueva: typeof vista) => { if (!continuar()) return; setVista(nueva); setTipo(null); setCategoria(null); setModificado(false); setBusqueda(''); setMensaje(''); };
  const operar = (accion: () => void, texto: string) => {
    try { accion(); setMensaje(texto); setError(''); } catch (e) { setError((e as Error).message); }
  };
  const visibles = catalogo.tipos.filter(t => `${t.codigo} ${t.nombre}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
    && (!categoriaId || t.categoriaId === categoriaId) && (estado === 'todos' || t.activo === (estado === 'activo')));
  const categorias = catalogo.categorias.filter(c => c.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  const nuevoTipo = (): TipoLaboratorio => ({ id: crypto.randomUUID(), codigo: '', nombre: '', categoriaId: catalogo.categorias.find(c => c.id === categoriaId && c.activa)?.id || catalogo.categorias.find(c => c.activa)?.id || '', tipoMuestra: '', descripcion: '', activo: true, parametros: [{ id: crypto.randomUUID(), nombre: '', tipo: 'numero', unidad: '', referencia: '' }] });

  return <section className="laboratorio-vista lab-configuracion" aria-label="Configuración de laboratorio">
    <header className="lab-cabecera"><div><h2>Tipos de laboratorio</h2><p>Define los exámenes y los parámetros que se registrarán en sus resultados.</p></div><button type="button" className="lab-boton principal" onClick={() => vista === 'tipos' ? editarTipo(nuevoTipo()) : editarCategoria({ id: crypto.randomUUID(), nombre: '', descripcion: '', activa: true })}><Icon name="plus" size={15}/>{vista === 'tipos' ? 'Crear tipo de laboratorio' : 'Crear categoría'}</button></header>
    <nav className="lab-config-nav" aria-label="Configuración de laboratorio"><button type="button" aria-pressed={vista === 'tipos'} className={vista === 'tipos' ? 'activo' : ''} onClick={() => cambiarVista('tipos')}>Tipos de laboratorio <span>{catalogo.tipos.length}</span></button><button type="button" aria-pressed={vista === 'categorias'} className={vista === 'categorias' ? 'activo' : ''} onClick={() => cambiarVista('categorias')}>Categorías <span>{catalogo.categorias.length}</span></button></nav>
    <p className="lab-local">Configuración visual con tipos de ejemplo. Los cambios se guardan en este navegador. Configura las unidades y referencias utilizadas por tu laboratorio.</p>
    <div className="lab-filtros"><label className="lab-busqueda"><Icon name="search" size={17}/><input aria-label={vista === 'tipos' ? 'Buscar tipo de laboratorio' : 'Buscar categoría'} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={vista === 'tipos' ? 'Buscar por código o nombre' : 'Buscar categoría'}/></label>{vista === 'tipos' && <><label>Categoría<select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}><option value="">Todas las categorías</option>{catalogo.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}{!c.activa && ' (inactiva)'}</option>)}</select></label><label>Estado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="todos">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></label></>}</div>
    {error && <p className="lab-error" role="alert">{error}</p>}{mensaje && <p className="lab-mensaje" role="status">{mensaje}</p>}
    <div className={`lab-config-tablero ${tipo || categoria ? 'con-editor' : ''}`}>
      <section className="lab-bandeja panel"><header><h3>{vista === 'tipos' ? 'Catálogo de exámenes' : 'Categorías de laboratorio'}</h3><span>{vista === 'tipos' ? visibles.length : categorias.length} registros</span></header><div className="lab-tabla-scroll"><table><thead><tr>{vista === 'tipos' ? <><th>Código / nombre</th><th>Categoría</th><th>Muestra / parámetros</th></> : <><th>Nombre</th><th>Descripción</th><th>Tipos asociados</th></>}<th>Estado</th><th>Acciones</th></tr></thead><tbody>{vista === 'tipos' ? visibles.map(t => <tr key={t.id} className={tipo?.id === t.id ? 'seleccionada' : ''}><td><small>{t.codigo}</small><strong>{t.nombre}</strong></td><td>{catalogo.categorias.find(c => c.id === t.categoriaId)?.nombre || 'Sin categoría'}{catalogo.categorias.some(c => c.id === t.categoriaId && !c.activa) && <small>Categoría inactiva</small>}</td><td>{t.tipoMuestra || 'Sin especificar'}<small>{t.parametros.length} {t.parametros.length === 1 ? 'parámetro' : 'parámetros'}</small></td><td><span className={`lab-estado ${t.activo ? 'completado' : 'pendiente'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span></td><td><div className="lab-config-acciones"><button type="button" className="lab-boton" aria-label={`Editar ${t.nombre}`} onClick={() => editarTipo(t)}>Editar</button><button type="button" className="lab-config-enlace" aria-label={`${t.activo ? 'Desactivar' : 'Activar'} ${t.nombre}`} disabled={tipo?.id === t.id} onClick={() => operar(() => guardarTipoLaboratorio({ ...t, activo: !t.activo }), t.activo ? 'Tipo de laboratorio desactivado.' : 'Tipo de laboratorio activado.')}>{t.activo ? 'Desactivar' : 'Activar'}</button></div></td></tr>) : categorias.map(c => <tr key={c.id} className={categoria?.id === c.id ? 'seleccionada' : ''}><td><strong>{c.nombre}</strong></td><td>{c.descripcion || '—'}</td><td>{catalogo.tipos.filter(t => t.categoriaId === c.id).length}</td><td><span className={`lab-estado ${c.activa ? 'completado' : 'pendiente'}`}>{c.activa ? 'Activa' : 'Inactiva'}</span></td><td><div className="lab-config-acciones"><button type="button" className="lab-boton" aria-label={`Editar categoría ${c.nombre}`} onClick={() => editarCategoria(c)}>Editar</button><button type="button" className="lab-config-enlace" disabled={categoria?.id === c.id} aria-label={`${c.activa ? 'Desactivar' : 'Activar'} categoría ${c.nombre}`} onClick={() => operar(() => guardarCategoriaLaboratorio({ ...c, activa: !c.activa }), c.activa ? 'Categoría desactivada. Sus tipos no estarán disponibles en nuevas órdenes.' : 'Categoría activada.')}>{c.activa ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody></table></div>{!(vista === 'tipos' ? visibles.length : categorias.length) && <div className="lab-vacio"><Icon name="lab" size={28}/><strong>No hay registros con estos filtros</strong><p>Cambia la búsqueda o crea un registro.</p></div>}</section>
      {vista === 'tipos' && tipo && <EditorTipo key={tipo.id} inicial={tipo} existente={catalogo.tipos.some(t => t.id === tipo.id)} categorias={catalogo.categorias} onCambio={() => setModificado(true)} onCerrar={() => editarTipo(null)} onGuardado={() => { setTipo(null); setModificado(false); setMensaje('Tipo de laboratorio guardado. Está disponible en las órdenes si el tipo y su categoría están activos.'); }}/>} 
      {vista === 'categorias' && categoria && <EditorCategoria key={categoria.id} inicial={categoria} existente={catalogo.categorias.some(c => c.id === categoria.id)} onCambio={() => setModificado(true)} onCerrar={() => editarCategoria(null)} onGuardado={() => { setCategoria(null); setModificado(false); setMensaje('Categoría de laboratorio guardada.'); }}/>} 
    </div>
  </section>;
}

function EditorTipo({ inicial, existente, categorias, onCambio, onCerrar, onGuardado }: {
  inicial: TipoLaboratorio; existente: boolean; categorias: CategoriaLaboratorio[]; onCambio: () => void; onCerrar: () => void; onGuardado: () => void;
}) {
  const [tipo, setTipo] = useState(() => structuredClone(inicial));
  const [error, setError] = useState('');
  const primerCampo = useRef<HTMLInputElement>(null);
  useEffect(() => { primerCampo.current?.focus(); }, []);
  const cambiar = (nuevo: TipoLaboratorio) => { setTipo(nuevo); onCambio(); setError(''); };
  const parametro = (id: string, campo: keyof ParametroLaboratorio, valor: string) => cambiar({ ...tipo, parametros: tipo.parametros.map(p => p.id === id ? { ...p, [campo]: valor } : p) });
  const mover = (indice: number, direccion: number) => { const nuevos = [...tipo.parametros]; [nuevos[indice], nuevos[indice + direccion]] = [nuevos[indice + direccion], nuevos[indice]]; cambiar({ ...tipo, parametros: nuevos }); };
  const guardar = (e: FormEvent) => { e.preventDefault(); try { guardarTipoLaboratorio(tipo); onGuardado(); } catch (error) { setError((error as Error).message); } };
  return <aside className="lab-detalle panel lab-config-editor" aria-label={existente ? `Editar ${inicial.nombre}` : 'Crear tipo de laboratorio'}><header><div><h3>{existente ? 'Editar tipo de laboratorio' : 'Crear tipo de laboratorio'}</h3><p>Examen y parámetros del resultado</p></div><button type="button" className="lab-cerrar" aria-label="Cerrar configuración del tipo" onClick={onCerrar}>×</button></header><form onSubmit={guardar}>
    <div className="lab-config-campos"><label>Código<input ref={primerCampo} required maxLength={30} value={tipo.codigo} onChange={e => cambiar({ ...tipo, codigo: e.target.value })} placeholder="Ej. LAB-004"/></label><label>Nombre del examen<input required maxLength={120} value={tipo.nombre} onChange={e => cambiar({ ...tipo, nombre: e.target.value })} placeholder="Ej. Perfil renal"/></label><label>Categoría<select required value={tipo.categoriaId} onChange={e => cambiar({ ...tipo, categoriaId: e.target.value })}><option value="">Selecciona una categoría</option>{categorias.map(c => <option key={c.id} value={c.id} disabled={!c.activa && c.id !== tipo.categoriaId}>{c.nombre}{!c.activa && ' (inactiva)'}</option>)}</select></label><label>Tipo de muestra<input maxLength={80} value={tipo.tipoMuestra} onChange={e => cambiar({ ...tipo, tipoMuestra: e.target.value })} placeholder="Ej. Sangre, orina"/></label></div>
    <label className="lab-observacion">Descripción<textarea value={tipo.descripcion} onChange={e => cambiar({ ...tipo, descripcion: e.target.value })} placeholder="Descripción o indicaciones del examen"/></label>
    <div className="lab-config-parametros-titulo"><h4>Parámetros / subanálisis</h4><span>{tipo.parametros.length}</span></div><p className="lab-config-ayuda">Se crearán estas filas al solicitar el examen. El orden de la lista será el orden de los resultados.</p>
    {tipo.parametros.map((p, indice) => <fieldset key={p.id} className="lab-config-parametro"><legend>Parámetro {indice + 1}</legend><div className="lab-config-campos"><label>Nombre del parámetro<input required maxLength={120} value={p.nombre} onChange={e => parametro(p.id, 'nombre', e.target.value)} placeholder="Ej. Creatinina"/></label><label>Tipo de resultado<select value={p.tipo} onChange={e => parametro(p.id, 'tipo', e.target.value)}><option value="numero">Numérico</option><option value="texto">Texto / cualitativo</option></select></label><label>Unidad de medida<input maxLength={40} value={p.unidad} onChange={e => parametro(p.id, 'unidad', e.target.value)} placeholder="Ej. mg/dL"/></label><label>Valor de referencia<input maxLength={200} value={p.referencia} onChange={e => parametro(p.id, 'referencia', e.target.value)} placeholder="Referencia utilizada por tu laboratorio"/></label></div><div className="lab-config-orden"><button type="button" disabled={indice === 0} onClick={() => mover(indice, -1)} aria-label={`Subir parámetro ${indice + 1}`}>↑ Subir</button><button type="button" disabled={indice === tipo.parametros.length - 1} onClick={() => mover(indice, 1)} aria-label={`Bajar parámetro ${indice + 1}`}>↓ Bajar</button><button type="button" disabled={tipo.parametros.length === 1} className="lab-config-quitar" onClick={() => cambiar({ ...tipo, parametros: tipo.parametros.filter(r => r.id !== p.id) })} aria-label={`Quitar parámetro ${indice + 1}`}>Quitar</button></div></fieldset>)}
    <button type="button" className="lab-agregar" onClick={() => cambiar({ ...tipo, parametros: [...tipo.parametros, { id: crypto.randomUUID(), nombre: '', tipo: 'numero', unidad: '', referencia: '' }] })}><Icon name="plus" size={15}/> Agregar parámetro</button>
    <label className="lab-config-activo"><input type="checkbox" checked={tipo.activo} onChange={e => cambiar({ ...tipo, activo: e.target.checked })}/> Tipo de laboratorio activo</label>
    {error && <p role="alert" className="lab-error">{error}</p>}<footer className="lab-acciones"><button type="button" className="lab-boton" onClick={onCerrar}>Cancelar</button><button type="submit" className="lab-boton principal">Guardar tipo de laboratorio</button></footer>
  </form></aside>;
}

function EditorCategoria({ inicial, existente, onCambio, onCerrar, onGuardado }: {
  inicial: CategoriaLaboratorio; existente: boolean; onCambio: () => void; onCerrar: () => void; onGuardado: () => void;
}) {
  const [categoria, setCategoria] = useState({ ...inicial });
  const [error, setError] = useState('');
  const primerCampo = useRef<HTMLInputElement>(null);
  useEffect(() => { primerCampo.current?.focus(); }, []);
  const cambiar = (nueva: CategoriaLaboratorio) => { setCategoria(nueva); onCambio(); setError(''); };
  return <aside className="lab-detalle panel lab-config-editor" aria-label={existente ? `Editar categoría ${inicial.nombre}` : 'Crear categoría de laboratorio'}><header><h3>{existente ? 'Editar categoría' : 'Crear categoría'}</h3><button type="button" className="lab-cerrar" aria-label="Cerrar configuración de categoría" onClick={onCerrar}>×</button></header><form onSubmit={e => { e.preventDefault(); try { guardarCategoriaLaboratorio(categoria); onGuardado(); } catch (error) { setError((error as Error).message); } }}><div className="lab-config-campos una-columna"><label>Nombre de la categoría<input ref={primerCampo} required maxLength={100} value={categoria.nombre} onChange={e => cambiar({ ...categoria, nombre: e.target.value })} placeholder="Ej. Inmunología"/></label></div><label className="lab-observacion">Descripción<textarea value={categoria.descripcion} onChange={e => cambiar({ ...categoria, descripcion: e.target.value })}/></label><label className="lab-config-activo"><input type="checkbox" checked={categoria.activa} onChange={e => cambiar({ ...categoria, activa: e.target.checked })}/> Categoría activa</label><p className="lab-config-ayuda">Al desactivarla, sus tipos dejarán de aparecer en las nuevas órdenes. Las solicitudes existentes conservarán sus resultados.</p>{error && <p className="lab-error" role="alert">{error}</p>}<footer className="lab-acciones"><button type="button" className="lab-boton" onClick={onCerrar}>Cancelar</button><button type="submit" className="lab-boton principal">Guardar categoría</button></footer></form></aside>;
}
