import { useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import './RecepcionView.css';
import { CajaRecepcionView } from './subvistas/CajaRecepcionView';
import { CitasRecepcionView } from './subvistas/CitasRecepcionView';
import { CuentasRecepcionView } from './subvistas/CuentasRecepcionView';
import { ComprobantesRecepcionView } from './subvistas/ComprobantesRecepcionView';
import { ReportesRecepcionView } from './subvistas/ReportesRecepcionView';

type SubvistaRecepcion = 'caja' | 'citas' | 'cuentas' | 'comprobantes' | 'reportes';

const subvistas: { id: SubvistaRecepcion; nombre: string; icono: IconName; descripcion: string }[] = [
  { id: 'caja', nombre: 'Caja', icono: 'asset', descripcion: 'Recepcion de pagos y admisiones.' },
  { id: 'citas', nombre: 'Citas', icono: 'audit', descripcion: 'Agenda y turnos del dia.' },
  { id: 'cuentas', nombre: 'Cuentas', icono: 'fileText', descripcion: 'Cuentas abiertas y saldos.' },
  { id: 'comprobantes', nombre: 'Comprobantes', icono: 'audit', descripcion: 'Pagos recibidos desde el banco.' },
  { id: 'reportes', nombre: 'Reportes', icono: 'building', descripcion: 'Indicadores de recepcion.' },
];

export function RecepcionView({ initialAgenda = false, initialSubview }: { initialAgenda?: boolean; initialSubview?: SubvistaRecepcion }) {
  const [subvista, setSubvista] = useState<SubvistaRecepcion>(initialSubview ?? (initialAgenda ? 'citas' : 'caja'));

  return <section className="recepcion-vista">
    <nav className="recepcion-subvistas" aria-label="Subvistas de Recepcion">
      {subvistas.map(item => <button key={item.id} className={subvista === item.id ? 'activo' : ''} onClick={() => setSubvista(item.id)}>
        <span><Icon name={item.icono} size={17}/></span>
        <strong>{item.nombre}</strong>
        <small>{item.descripcion}</small>
      </button>)}
    </nav>

    {subvista === 'caja' && <CajaRecepcionView/>}
    {subvista === 'citas' && <CitasRecepcionView/>}
    {subvista === 'cuentas' && <CuentasRecepcionView/>}
    {subvista === 'comprobantes' && <ComprobantesRecepcionView/>}
    {subvista === 'reportes' && <ReportesRecepcionView/>}
  </section>;
}
