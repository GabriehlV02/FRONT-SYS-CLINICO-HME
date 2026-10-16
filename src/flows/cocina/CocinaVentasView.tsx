import { useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import { CajaRecepcionView } from '../recepcion/subvistas/CajaRecepcionView';
import '../recepcion/RecepcionView.css';
import './CocinaVentasView.css';

type Vista = 'caja' | 'almacen' | 'administracion' | 'reportes';
const subvistas: { id: Vista; nombre: string; icono: IconName; descripcion: string }[] = [
  { id: 'caja', nombre: 'Caja', icono: 'asset', descripcion: 'Ventas y cobros de cocina.' },
  { id: 'almacen', nombre: 'Almacén', icono: 'package', descripcion: 'Existencias y disponibilidad.' },
  { id: 'administracion', nombre: 'Administración', icono: 'settings', descripcion: 'Cajas y parámetros de cocina.' },
  { id: 'reportes', nombre: 'Reportes', icono: 'audit', descripcion: 'Indicadores de ventas y consumo.' },
];

export function CocinaVentasView() {
  const [subvista, setSubvista] = useState<Vista>('caja');
  const navegacion = <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Cocina">{subvistas.map(item => <button key={item.id} className={subvista === item.id ? 'activo' : ''} onClick={() => setSubvista(item.id)}><span><Icon name={item.icono} size={17} /></span><strong>{item.nombre}</strong><small>{item.descripcion}</small></button>)}</HorizontalSubvistaNav>;
  return <section className="recepcion-vista cocina-vista">{subvista === 'caja' ? <CajaRecepcionView cocina navegacion={navegacion} /> : <><div className="cocina-subvista-cabecera">{navegacion}</div>{subvista === 'almacen' && <Almacen />}{subvista === 'administracion' && <Administracion />}{subvista === 'reportes' && <Reportes />}</>}</section>;
}
function Almacen() { return <section className="cocina-subvista"><header><div><p>ALMACÉN DE COCINA</p><h2>Existencias y disponibilidad</h2><small>Controla las preparaciones e insumos habilitados para la venta.</small></div><button><Icon name="plus" size={16} /> Registrar movimiento</button></header><table><thead><tr><th>Producto / preparación</th><th>Código</th><th>Disponible</th><th>Estado</th></tr></thead><tbody>{[['Desayuno hospitalario','COC-001','32'],['Almuerzo del día','COC-002','48'],['Dieta blanda','COC-004','18']].map(([nombre,codigo,stock]) => <tr key={codigo}><td>{nombre}</td><td>{codigo}</td><td>{stock} unidades</td><td><span className={Number(stock) < 20 ? 'cocina-estado alerta' : 'cocina-estado'}>{Number(stock) < 20 ? 'Stock bajo' : 'Disponible'}</span></td></tr>)}</tbody></table></section> }
function Administracion() { return <section className="cocina-subvista"><header><div><p>ADMINISTRACIÓN DE COCINA</p><h2>Configuración operativa</h2><small>Define la caja, el almacén y los responsables del módulo.</small></div></header><div className="cocina-config"><label>Almacén asignado<select><option>Almacén Cocina Central</option></select></label><label>Caja de ventas<select><option>Caja 03 · Cocina</option></select></label><label>Serie de venta<input defaultValue="COC-" /></label><label>Responsable del turno<input defaultValue="Administrador" /></label><button>Guardar configuración</button></div></section> }
function Reportes() { return <section className="cocina-subvista"><header><div><p>REPORTES DE COCINA</p><h2>Resumen operativo</h2><small>Consolidado de ventas, pedidos y consumo por turno.</small></div><button>Exportar reporte</button></header><div className="cocina-kpis"><article><small>Ventas del día</small><b>Bs 0.00</b></article><article><small>Pedidos registrados</small><b>0</b></article><article><small>Ticket promedio</small><b>Bs 0.00</b></article></div><p className="cocina-ayuda">Los reportes se alimentan de las ventas registradas desde la subvista Caja.</p></section> }
