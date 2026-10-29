import Icon from '../../radius/componentes/Icono';
import './RoperiaView.css';

const ropa = [
  ['Ropa quirúrgica limpia', '48 prendas disponibles', 'Disponible'],
  ['Ropa en lavado', '26 prendas en proceso', 'En lavado'],
  ['Ropa por clasificar', '12 prendas recibidas', 'Pendiente'],
];

export function RoperiaView() {
  return <section className="roperia-vista"><header><div><p>ESTERILIZACIÓN · ROPERÍA</p><h2>Control de ropa hospitalaria</h2><small>Recepción, lavado, entrega y trazabilidad de ropa quirúrgica.</small></div><button type="button"><Icon name="plus" size={16}/> Registrar movimiento</button></header><div className="roperia-resumen">{ropa.map(([titulo, detalle, estado]) => <article key={titulo}><span><Icon name="asset" size={20}/></span><div><strong>{titulo}</strong><small>{detalle}</small></div><b className={estado === 'Disponible' ? 'disponible' : ''}>{estado}</b></article>)}</div></section>;
}
