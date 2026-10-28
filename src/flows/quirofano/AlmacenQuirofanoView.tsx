import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './AlmacenQuirofanoView.css';

type Quirofano = 'quirofano-1' | 'quirofano-2';
type ItemSolicitado = { nombre: string; tipo: string; cantidad: number };

const inventario = {
  'quirofano-1': [['Guantes estériles talla 7', 'Insumo', '48 pares'], ['Gasas estériles 10 × 10 cm', 'Insumo', '120 paquetes'], ['Jeringas de 10 ml', 'Insumo', '75 unidades'], ['Suturas absorbibles 2-0', 'Insumo', '36 unidades'], ['Bisturí eléctrico', 'Equipo', '1 disponible'], ['Monitor multiparámetro', 'Equipo', '1 disponible'], ['Kit de cirugía general', 'Instrumental', '3 kits']],
  'quirofano-2': [['Guantes estériles talla 7.5', 'Insumo', '42 pares'], ['Campos quirúrgicos estériles', 'Insumo', '28 juegos'], ['Catéter intravenoso N.º 20', 'Insumo', '60 unidades'], ['Suturas no absorbibles 3-0', 'Insumo', '24 unidades'], ['Torre de laparoscopía', 'Equipo', '1 disponible'], ['Aspirador quirúrgico', 'Equipo', '1 disponible'], ['Set de laparoscopía', 'Instrumental', '2 sets']],
} as const;

const catalogoSolicitud = [
  ['Guantes estériles talla 7', 'Insumo'], ['Guantes estériles talla 7.5', 'Insumo'], ['Gasas estériles 10 × 10 cm', 'Insumo'], ['Jeringas de 10 ml', 'Insumo'], ['Catéter intravenoso N.º 20', 'Insumo'], ['Suturas absorbibles 2-0', 'Insumo'], ['Suturas no absorbibles 3-0', 'Insumo'], ['Campos quirúrgicos estériles', 'Insumo'], ['Bisturí eléctrico', 'Equipo'], ['Monitor multiparámetro', 'Equipo'], ['Aspirador quirúrgico', 'Equipo'], ['Torre de laparoscopía', 'Equipo'], ['Kit de cirugía general', 'Instrumental'], ['Set de laparoscopía', 'Instrumental'],
] as const;

export function AlmacenQuirofanoView() {
  const [quirofano, setQuirofano] = useState<Quirofano>('quirofano-1');
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [solicitud, setSolicitud] = useState<ItemSolicitado[]>([]);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const nombre = quirofano === 'quirofano-1' ? 'Quirófano 1' : 'Quirófano 2';
  const coincidencias = catalogoSolicitud.filter(([articulo]) => articulo.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).slice(0, 6);
  const abrirSolicitud = () => { setBusqueda(''); setSolicitud([]); setMensajeSolicitud(''); setSolicitudAbierta(true); };
  const agregarArticulo = (nombreArticulo: string, tipo: string) => { setSolicitud(actual => actual.some(item => item.nombre === nombreArticulo) ? actual.map(item => item.nombre === nombreArticulo ? { ...item, cantidad: item.cantidad + 1 } : item) : [...actual, { nombre: nombreArticulo, tipo, cantidad: 1 }]); setBusqueda(''); };
  const cambiarCantidad = (nombreArticulo: string, cantidad: number) => setSolicitud(actual => cantidad < 1 ? actual.filter(item => item.nombre !== nombreArticulo) : actual.map(item => item.nombre === nombreArticulo ? { ...item, cantidad } : item));
  const confirmarSolicitud = () => { setSolicitudAbierta(false); setMensajeSolicitud(`Solicitud de ${solicitud.length} artículo${solicitud.length === 1 ? '' : 's'} enviada para ${nombre}.`); };
  return <div className="almacen-quirofano-contenido">
    <nav className="enfermeria-q-subsubvistas recepcion-subvistas" aria-label="Quirófanos del almacén">
      <button type="button" className={quirofano === 'quirofano-1' ? 'activo' : ''} onClick={() => setQuirofano('quirofano-1')}><span><Icon name="package" size={16} /></span><strong>Quirófano 1</strong></button>
      <button type="button" className={quirofano === 'quirofano-2' ? 'activo' : ''} onClick={() => setQuirofano('quirofano-2')}><span><Icon name="package" size={16} /></span><strong>Quirófano 2</strong></button>
    </nav>
    <section className="almacen-q-inventario" aria-labelledby="almacen-q-titulo"><header><div><p>ALMACÉN QUIRÚRGICO · {nombre.toUpperCase()}</p><h3 id="almacen-q-titulo">Existencias de {nombre}</h3><small>Consulta los insumos, equipos e instrumental disponibles en esta sala.</small></div><button type="button" onClick={abrirSolicitud}><Icon name="plus" size={16} /> Solicitar</button></header>{mensajeSolicitud && <p className="almacen-q-mensaje" role="status">{mensajeSolicitud}</p>}<div className="almacen-q-tabla" role="table" aria-label={`Inventario de ${nombre}`}><div className="almacen-q-fila almacen-q-columnas" role="row"><span>Artículo</span><span>Tipo</span><span>Disponible</span></div>{inventario[quirofano].map(([articulo, tipo, disponibilidad]) => <div className="almacen-q-fila" role="row" key={articulo}><strong>{articulo}</strong><span>{tipo}</span><span>{disponibilidad}</span></div>)}</div></section>
    {solicitudAbierta && <div className="almacen-q-modal-fondo" role="presentation" onMouseDown={() => setSolicitudAbierta(false)}><section className="almacen-q-modal" role="dialog" aria-modal="true" aria-labelledby="solicitud-q-titulo" onMouseDown={event => event.stopPropagation()}><header><div><p>NUEVA SOLICITUD · {nombre.toUpperCase()}</p><h3 id="solicitud-q-titulo">Solicitar material</h3><small>Busca y añade los artículos que necesita este quirófano.</small></div><button type="button" className="almacen-q-modal-cerrar" onClick={() => setSolicitudAbierta(false)} aria-label="Cerrar solicitud">×</button></header><label className="almacen-q-buscador"><span>¿Qué necesitas?</span><input autoFocus value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar insumo, equipo o instrumental" /></label>{busqueda && <div className="almacen-q-coincidencias">{coincidencias.length ? coincidencias.map(([articulo, tipo]) => <button type="button" key={articulo} onClick={() => agregarArticulo(articulo, tipo)}><span><strong>{articulo}</strong><small>{tipo}</small></span><Icon name="plus" size={16} /></button>) : <p>No se encontraron artículos.</p>}</div>}<section className="almacen-q-lista-solicitud"><header><strong>Artículos solicitados</strong><small>{solicitud.length} seleccionado{solicitud.length === 1 ? '' : 's'}</small></header>{solicitud.length ? solicitud.map(item => <article key={item.nombre}><div><strong>{item.nombre}</strong><small>{item.tipo}</small></div><label>Cantidad<input type="number" min="1" value={item.cantidad} onChange={event => cambiarCantidad(item.nombre, Number(event.target.value))} /></label><button type="button" onClick={() => cambiarCantidad(item.nombre, 0)} aria-label={`Quitar ${item.nombre}`}>×</button></article>) : <p className="almacen-q-lista-vacia">Busca un artículo arriba para añadirlo a la solicitud.</p>}</section><footer><button type="button" className="almacen-q-cancelar" onClick={() => setSolicitudAbierta(false)}>Cancelar</button><button type="button" className="almacen-q-confirmar" disabled={!solicitud.length} onClick={confirmarSolicitud}><Icon name="check" size={16} /> Solicitar</button></footer></section></div>}
  </div>;
}
