import { useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import './RecepcionView.css';
import './RecepcionSubvistas.css';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import { CajaRecepcionView } from './subvistas/CajaRecepcionView';
import { CitasRecepcionView } from './subvistas/CitasRecepcionView';
import { CuentasRecepcionView } from './subvistas/CuentasRecepcionView';
import { ComprobantesRecepcionView } from './subvistas/ComprobantesRecepcionView';
import { ReportesRecepcionView } from './subvistas/ReportesRecepcionView';
import { ConfiguracionRecepcionView } from './subvistas/ConfiguracionRecepcionView';

type SubvistaRecepcion = 'caja' | 'citas' | 'cuentas' | 'comprobantes' | 'reportes' | 'configuracion';

const subvistas: { id: SubvistaRecepcion; nombre: string; icono: IconName; descripcion: string }[] = [
  { id: 'caja', nombre: 'Caja', icono: 'asset', descripcion: 'Recepcion de pagos y admisiones.' },
  { id: 'citas', nombre: 'Citas', icono: 'audit', descripcion: 'Agenda y turnos del dia.' },
  { id: 'cuentas', nombre: 'Cuentas', icono: 'fileText', descripcion: 'Cuentas abiertas y saldos.' },
  { id: 'comprobantes', nombre: 'Comprobantes', icono: 'audit', descripcion: 'Pagos recibidos desde el banco.' },
  { id: 'reportes', nombre: 'Reportes', icono: 'building', descripcion: 'Indicadores de recepcion.' },
  { id: 'configuracion', nombre: 'Configuración', icono: 'settings', descripcion: 'Paquetes y opciones de recepción.' },
];

export function RecepcionView({ initialAgenda = false, initialSubview, onAbrirModulo }: { initialAgenda?: boolean; initialSubview?: SubvistaRecepcion; onAbrirModulo?: (modulo: string) => void }) {
  const [subvista, setSubvista] = useState<SubvistaRecepcion>(initialSubview ?? (initialAgenda ? 'citas' : 'caja'));
  const [cuentaDestino, setCuentaDestino] = useState<{ origen: 'emergencias' | 'internacion'; paciente: string } | null>(null);
  const navegacion = <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Recepcion">
    {subvistas.map(item => <button key={item.id} className={subvista === item.id ? 'activo' : ''} onClick={() => setSubvista(item.id)}>
      <span><Icon name={item.icono} size={17}/></span>
      <strong>{item.nombre}</strong>
      <small>{item.descripcion}</small>
    </button>)}
  </HorizontalSubvistaNav>;

  return <section className="recepcion-vista">
    {subvista !== 'caja' && navegacion}

    {subvista === 'caja' && <CajaRecepcionView
      navegacion={navegacion}
      onAgendarCirugia={() => onAbrirModulo?.('cuenta-quirofano')}
      onAbrirCuenta={(origen, paciente) => { setCuentaDestino({ origen, paciente }); setSubvista('cuentas'); }}
    />}
    {subvista === 'citas' && <CitasRecepcionView/>}
    {subvista === 'cuentas' && <CuentasRecepcionView key={`${cuentaDestino?.origen || 'emergencias'}-${cuentaDestino?.paciente || ''}`} origenInicial={cuentaDestino?.origen} pacienteInicial={cuentaDestino?.paciente}/>}
    {subvista === 'comprobantes' && <ComprobantesRecepcionView/>}
    {subvista === 'reportes' && <ReportesRecepcionView/>}
    {subvista === 'configuracion' && <ConfiguracionRecepcionView/>}
  </section>;
}
