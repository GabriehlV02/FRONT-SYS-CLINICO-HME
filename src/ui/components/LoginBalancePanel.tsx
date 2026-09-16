import Icon from './Icon';
import { Brand } from './Brand';

const features = [
  { icon: 'fileText' as const, title: 'Ventas', text: 'Control de operaciones y caja.' },
  { icon: 'building' as const, title: 'Cuentas', text: 'Seguimiento de cuentas y movimientos.' },
  { icon: 'package' as const, title: 'Inventario', text: 'Productos, insumos y existencias.' },
  { icon: 'audit' as const, title: 'Facturación', text: 'Control y seguimiento fiscal.' },
];

export function LoginBalancePanel({ subtitle }: { subtitle: string }) {
  return <section className="login-balance-panel">
    <Brand name="Balance" subtitle={subtitle} />
    <div className="login-balance-copy">
      <span className="login-balance-kicker">GESTIÓN INTELIGENTE</span>
      <h2>Todo lo que necesitas<br />para <strong>gestionar mejor.</strong></h2>
      <p>Administra ventas, cuentas, inventario y operaciones desde una plataforma centralizada, segura y eficiente.</p>
    </div>
    <div className="login-balance-features" aria-label="Funciones principales">
      {features.map(feature => <div key={feature.title} className="login-balance-feature">
        <span><Icon name={feature.icon} size={17} /></span>
        <div><strong>{feature.title}</strong><small>{feature.text}</small></div>
      </div>)}
    </div>
    <footer className="login-balance-footer">
      <div><strong>BALANCE</strong><span>Administración · Organización · Control</span></div>
      <div className="login-balance-security"><Icon name="audit" size={20}/><span>Tu información<br />siempre protegida</span></div>
    </footer>
  </section>;
}
