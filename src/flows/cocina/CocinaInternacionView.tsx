import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './CocinaInternacionView.css';

type Vista = 'pacientes' | 'reportes';
export function CocinaInternacionView() {
  const [vista, setVista] = useState<Vista>('pacientes');
  return <section className="cocina-internacion">
    <header><div><p>COCINA · INTERNACIÓN</p><h2>Alimentación de pacientes internados</h2><small>Control de dietas, entregas y consumo por estancia.</small></div><span><Icon name="patient" size={25} /></span></header>
    <nav>{([['pacientes', 'Pacientes', 'patient'], ['reportes', 'Reportes', 'audit']] as const).map(([id, nombre, icono]) => <button key={id} className={vista === id ? 'activo' : ''} onClick={() => setVista(id)}><Icon name={icono} size={17} />{nombre}</button>)}</nav>
    {vista === 'pacientes' ? <div className="cocina-internacion-panel"><header><div><p>PACIENTES INTERNADOS</p><h3>Dietas y entregas del turno</h3></div><button><Icon name="plus" size={16} /> Registrar entrega</button></header><div className="cocina-internacion-filtros"><input placeholder="Buscar paciente, cama o historia clínica" /><select><option>Todos los tipos de dieta</option><option>Dieta normal</option><option>Dieta blanda</option><option>Dieta líquida</option><option>Dieta hiposódica</option></select><select><option>Turno actual</option><option>Desayuno</option><option>Almuerzo</option><option>Cena</option></select></div><table><thead><tr><th>Paciente</th><th>Habitación / cama</th><th>Dieta indicada</th><th>Turno</th><th>Entrega</th></tr></thead><tbody><tr><td colSpan={5}><div className="cocina-internacion-vacio"><Icon name="patient" size={27} /><strong>No hay pacientes internados para mostrar</strong><small>Los pacientes aparecerán al conectar las estancias de internación y sus indicaciones nutricionales.</small></div></td></tr></tbody></table></div> : <div className="cocina-internacion-panel"><header><div><p>REPORTES DE INTERNACIÓN</p><h3>Consumo y entregas de alimentación</h3></div><button>Exportar reporte</button></header><div className="cocina-internacion-kpis"><article><small>Raciones entregadas hoy</small><b>0</b></article><article><small>Pacientes atendidos</small><b>0</b></article><article><small>Entregas pendientes</small><b>0</b></article></div><p className="cocina-internacion-ayuda">El reporte consolidará raciones por fecha, turno, tipo de dieta y paciente internado.</p></div>}
  </section>;
}
