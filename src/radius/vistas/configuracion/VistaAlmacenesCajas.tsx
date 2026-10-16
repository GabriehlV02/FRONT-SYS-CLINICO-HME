import { useState, type FormEvent } from 'react';
import Icon from '../../componentes/Icono';
import './VistaAlmacenesCajas.css';

type Registro = { id: number; nombre: string; detalle: string; estado: 'ACTIVO' | 'INACTIVO' };

export default function VistaAlmacenesCajas() {
  const [almacenes, setAlmacenes] = useState<Registro[]>([{ id: 1, nombre: 'Almacén principal', detalle: 'Casa matriz', estado: 'ACTIVO' }]);
  const [cajas, setCajas] = useState<Registro[]>([{ id: 1, nombre: 'Caja 01', detalle: 'Recepción · Casa matriz', estado: 'ACTIVO' }]);
  const agregar = (tipo: 'almacen' | 'caja') => (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); const datos = new FormData(evento.currentTarget); const nombre = String(datos.get('nombre') || '').trim(); const detalle = String(datos.get('detalle') || '').trim();
    if (!nombre) return;
    const nuevo = { id: Date.now(), nombre, detalle: detalle || 'Sin ubicación asignada', estado: 'ACTIVO' as const };
    (tipo === 'almacen' ? setAlmacenes : setCajas)(actuales => [...actuales, nuevo]); evento.currentTarget.reset();
  };
  const cambiarEstado = (tipo: 'almacen' | 'caja', id: number) => {
    const actualizar = (items: Registro[]): Registro[] => items.map(item => item.id === id ? { ...item, estado: item.estado === 'ACTIVO' ? 'INACTIVO' as const : 'ACTIVO' as const } : item);
    (tipo === 'almacen' ? setAlmacenes : setCajas)(actualizar);
  };
  const panel = (tipo: 'almacen' | 'caja', titulo: string, descripcion: string, items: Registro[]) => <section className="operacion-panel"><header><span><Icon name={tipo === 'almacen' ? 'building' : 'asset'} size={20} /></span><div><h3>{titulo}</h3><p>{descripcion}</p></div></header><div className="operacion-lista">{items.map(item => <article key={item.id}><div><strong>{item.nombre}</strong><small>{item.detalle}</small></div><button type="button" className={item.estado === 'ACTIVO' ? 'activo' : ''} onClick={() => cambiarEstado(tipo, item.id)}>{item.estado}</button></article>)}</div><form onSubmit={agregar(tipo)}><input name="nombre" required placeholder={`Nombre del ${tipo === 'almacen' ? 'almacén' : 'caja'}`} /><input name="detalle" placeholder="Sucursal o ubicación" /><button type="submit"><Icon name="plus" size={15} /> Agregar</button></form></section>;
  return <section className="operacion-vista" aria-labelledby="operacion-titulo"><header className="config-usuarios-cabecera"><div><p>CONFIGURACIÓN OPERATIVA</p><h2 id="operacion-titulo">Almacenes y cajas</h2><small>Crea y habilita los puntos que estarán disponibles para la operación.</small></div></header><div className="operacion-grid">{panel('almacen', 'Almacenes', 'Ubicaciones donde se controlan existencias.', almacenes)}{panel('caja', 'Cajas', 'Puntos autorizados para registrar cobros.', cajas)}</div></section>;
}
