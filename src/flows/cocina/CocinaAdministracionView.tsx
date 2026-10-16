import { useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import '../recepcion/RecepcionView.css';
import './CocinaVentasView.css';

type Vista = 'compras' | 'ventas' | 'almacen';
const subvistas: { id: Vista; nombre: string; icono: IconName; descripcion: string }[] = [
  { id: 'compras', nombre: 'Compras', icono: 'package', descripcion: 'Órdenes y recepción de insumos.' },
  { id: 'ventas', nombre: 'Ventas', icono: 'asset', descripcion: 'Resumen comercial de cocina.' },
  { id: 'almacen', nombre: 'Almacén', icono: 'building', descripcion: 'Existencias y movimientos.' },
];
export function CocinaAdministracionView() {
  const [subvista, setSubvista] = useState<Vista>('compras');
  const navegacion = <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Administración de Cocina">{subvistas.map(item => <button key={item.id} className={subvista === item.id ? 'activo' : ''} onClick={() => setSubvista(item.id)}><span><Icon name={item.icono} size={17} /></span><strong>{item.nombre}</strong><small>{item.descripcion}</small></button>)}</HorizontalSubvistaNav>;
  return <section className="recepcion-vista cocina-admin-vista"><div className="cocina-subvista-cabecera">{navegacion}</div>{subvista === 'compras' && <Compras />}{subvista === 'ventas' && <Ventas />}{subvista === 'almacen' && <Almacen />}</section>;
}
function Vacio({ icono, titulo, detalle }: { icono: IconName; titulo: string; detalle: string }) { return <div className="cocina-vacio"><Icon name={icono} size={27} /><strong>{titulo}</strong><small>{detalle}</small></div>; }
function Compras() { return <section className="cocina-subvista"><header><div><p>COMPRAS</p><h2>Órdenes y recepción de insumos</h2><small>Registra insumos y alimentos adquiridos para cocina.</small></div><button><Icon name="plus" size={16} /> Nueva compra</button></header><table><thead><tr><th>Número</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody><tr><td colSpan={5}><Vacio icono="package" titulo="No hay compras registradas" detalle="Las compras registradas para cocina aparecerán aquí." /></td></tr></tbody></table></section>; }
function Ventas() { return <section className="cocina-subvista"><header><div><p>VENTAS</p><h2>Resumen comercial de cocina</h2><small>Consulta ventas y comprobantes registrados desde Caja.</small></div><button>Ver ventas del día</button></header><div className="cocina-kpis"><article><small>Ventas del día</small><b>Bs 0.00</b></article><article><small>Comprobantes emitidos</small><b>0</b></article><article><small>Ticket promedio</small><b>Bs 0.00</b></article></div><p className="cocina-ayuda">Las ventas se originan exclusivamente en Cocina › Caja.</p></section>; }
function Almacen() { return <section className="cocina-subvista"><header><div><p>ALMACÉN</p><h2>Existencias y movimientos</h2><small>Controla el stock disponible para compras y preparación.</small></div><button><Icon name="plus" size={16} /> Registrar movimiento</button></header><table><thead><tr><th>Insumo</th><th>Unidad</th><th>Disponible</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody><tr><td colSpan={5}><Vacio icono="building" titulo="No hay existencias para mostrar" detalle="Las existencias se alimentarán con compras, consumos y ajustes autorizados." /></td></tr></tbody></table></section>; }
