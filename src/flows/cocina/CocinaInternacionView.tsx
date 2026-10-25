import { useMemo, useState, type FormEvent } from 'react';
import Icon from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import './CocinaInternacionView.css';

type Vista = 'pacientes' | 'dietas' | 'reportes';
type Dieta = { id: number; codigo: string; nombre: string; tipo: string; descripcion: string; consistencia: string; indicaciones: string; restricciones: string; calorias: string; estado: 'Activa' | 'Inactiva' };

const DIETAS_INICIALES: Dieta[] = [
  { id: 1, codigo: 'D-001', nombre: 'Dieta normal', tipo: 'General', descripcion: 'Alimentación completa sin restricciones específicas.', consistencia: 'Sólida', indicaciones: 'Pacientes sin restricciones dietéticas', restricciones: 'Ninguna', calorias: '2000', estado: 'Activa' },
  { id: 2, codigo: 'D-002', nombre: 'Dieta blanda', tipo: 'Terapéutica', descripcion: 'Preparaciones suaves y de fácil digestión.', consistencia: 'Blanda', indicaciones: 'Posoperatorio y molestias digestivas', restricciones: 'Evitar frituras y condimentos', calorias: '1800', estado: 'Activa' },
  { id: 3, codigo: 'D-003', nombre: 'Dieta líquida', tipo: 'Transición', descripcion: 'Líquidos claros y preparaciones coladas.', consistencia: 'Líquida', indicaciones: 'Preparación de estudios y recuperación', restricciones: 'Sin sólidos', calorias: '1200', estado: 'Activa' },
  { id: 4, codigo: 'D-004', nombre: 'Dieta hiposódica', tipo: 'Terapéutica', descripcion: 'Alimentación con contenido reducido de sodio.', consistencia: 'Sólida', indicaciones: 'Hipertensión y retención de líquidos', restricciones: 'Sodio controlado', calorias: '1800', estado: 'Activa' },
  { id: 5, codigo: 'D-005', nombre: 'Dieta para diabético', tipo: 'Terapéutica', descripcion: 'Control de carbohidratos simples y porciones.', consistencia: 'Sólida', indicaciones: 'Diabetes y control glucémico', restricciones: 'Sin azúcar añadida', calorias: '1800', estado: 'Activa' },
];

export function CocinaInternacionView() {
  const [vista, setVista] = useState<Vista>('pacientes');
  const [dietas, setDietas] = useState<Dieta[]>(DIETAS_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const formularioInicial: Omit<Dieta, 'id'> = { codigo: '', nombre: '', tipo: 'General', descripcion: '', consistencia: 'Sólida', indicaciones: '', restricciones: '', calorias: '', estado: 'Activa' };
  const [nuevaDieta, setNuevaDieta] = useState<Omit<Dieta, 'id'>>(formularioInicial);
  const dietasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return dietas;
    return dietas.filter((dieta) => [dieta.codigo, dieta.nombre, dieta.tipo, dieta.descripcion, dieta.consistencia, dieta.indicaciones].some((valor) => valor.toLocaleLowerCase('es').includes(termino)));
  }, [busqueda, dietas]);

  const crearDieta = (event: FormEvent) => {
    event.preventDefault();
    setDietas((actuales) => [...actuales, { id: Date.now(), ...nuevaDieta, estado: 'Activa' }]);
    setNuevaDieta(formularioInicial);
    setCreando(false);
  };

  return <section className="cocina-internacion">
    <HorizontalSubvistaNav className="recepcion-subvistas cocina-internacion-subvistas" ariaLabel="Subvistas de cocina internación">
      {([['pacientes', 'Pacientes internados', 'patient', 'Dietas y entregas del turno'], ['dietas', 'Dietas', 'utensils', 'Catálogo de dietas disponibles'], ['reportes', 'Reportes', 'audit', 'Consumo y entregas de alimentación']] as const).map(([id, nombre, icono, descripcion]) => <button key={id} type="button" className={vista === id ? 'activo' : ''} onClick={() => setVista(id)}><span><Icon name={icono} size={17} /></span><strong>{nombre}</strong><small>{descripcion}</small></button>)}
    </HorizontalSubvistaNav>

    {vista === 'pacientes' && <PacientesInternados />}
    {vista === 'dietas' && <div className="cocina-internacion-panel dietas-panel">
      <header><div><p>CATÁLOGO NUTRICIONAL</p><h3>Dietas disponibles</h3><small>Consulta y administra las dietas que pueden recetarse o asignarse a un paciente.</small></div><button type="button" onClick={() => setCreando(true)}><Icon name="plus" size={16} /> Crear dieta</button></header>
      <div className="dietas-herramientas"><label><Icon name="search" size={17} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre, consistencia o indicación" /></label><span>{dietasFiltradas.length} dieta{dietasFiltradas.length === 1 ? '' : 's'}</span></div>
      <div className="dietas-tabla-contenedor"><table><thead><tr><th>Código / dieta</th><th>Tipo</th><th>Descripción</th><th>Consistencia</th><th>Indicaciones</th><th>Estado</th></tr></thead><tbody>{dietasFiltradas.map((dieta) => <tr key={dieta.id}><td><small>{dieta.codigo}</small><strong>{dieta.nombre}</strong></td><td>{dieta.tipo}</td><td>{dieta.descripcion}</td><td><span className="dieta-consistencia">{dieta.consistencia}</span></td><td>{dieta.indicaciones}</td><td><span className={`dieta-estado ${dieta.estado.toLowerCase()}`}>{dieta.estado}</span></td></tr>)}{dietasFiltradas.length === 0 && <tr><td colSpan={6}><div className="cocina-internacion-vacio"><Icon name="search" size={27} /><strong>No encontramos dietas</strong><small>Prueba con otro nombre, consistencia o indicación.</small></div></td></tr>}</tbody></table></div>
    </div>}
    {vista === 'reportes' && <Reportes />}

    {creando && <div className="dieta-modal-fondo" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreando(false); }}><form className="dieta-modal" onSubmit={crearDieta} aria-label="Crear dieta"><header><div><p>NUEVA DIETA</p><h3>Crear dieta</h3><small>Completa la información necesaria para recetarla a pacientes.</small></div><button type="button" aria-label="Cerrar" onClick={() => setCreando(false)}><Icon name="close" size={18} /></button></header><div className="dieta-modal-fila"><label>Código<input required autoFocus value={nuevaDieta.codigo} onChange={(event) => setNuevaDieta({ ...nuevaDieta, codigo: event.target.value.toUpperCase() })} placeholder="Ej. D-006" /></label><label>Nombre de la dieta<input required value={nuevaDieta.nombre} onChange={(event) => setNuevaDieta({ ...nuevaDieta, nombre: event.target.value })} placeholder="Ej. Dieta renal" /></label><label>Tipo<select value={nuevaDieta.tipo} onChange={(event) => setNuevaDieta({ ...nuevaDieta, tipo: event.target.value })}><option>General</option><option>Terapéutica</option><option>Transición</option><option>Pediátrica</option><option>Especial</option></select></label><label>Consistencia<select value={nuevaDieta.consistencia} onChange={(event) => setNuevaDieta({ ...nuevaDieta, consistencia: event.target.value })}><option>Sólida</option><option>Blanda</option><option>Líquida</option><option>Semilíquida</option><option>Mixta</option></select></label></div><label>Descripción<textarea required value={nuevaDieta.descripcion} onChange={(event) => setNuevaDieta({ ...nuevaDieta, descripcion: event.target.value })} placeholder="Describe brevemente la composición de la dieta" /></label><div className="dieta-modal-fila"><label>Indicaciones clínicas<input required value={nuevaDieta.indicaciones} onChange={(event) => setNuevaDieta({ ...nuevaDieta, indicaciones: event.target.value })} placeholder="¿Para qué pacientes?" /></label><label>Restricciones<input required value={nuevaDieta.restricciones} onChange={(event) => setNuevaDieta({ ...nuevaDieta, restricciones: event.target.value })} placeholder="Ej. Sin sodio añadido" /></label><label>Calorías aproximadas<input required min="0" type="number" value={nuevaDieta.calorias} onChange={(event) => setNuevaDieta({ ...nuevaDieta, calorias: event.target.value })} placeholder="Ej. 1800" /></label><label>Estado<select value={nuevaDieta.estado} onChange={(event) => setNuevaDieta({ ...nuevaDieta, estado: event.target.value as 'Activa' | 'Inactiva' })}><option>Activa</option><option>Inactiva</option></select></label></div><footer><button type="button" onClick={() => setCreando(false)}>Cancelar</button><button type="submit"><Icon name="plus" size={16} /> Crear dieta</button></footer></form></div>}
  </section>;
}

function PacientesInternados() {
  return <div className="cocina-internacion-panel"><header><div><p>PACIENTES INTERNADOS</p><h3>Dietas y entregas del turno</h3></div><button><Icon name="plus" size={16} /> Registrar entrega</button></header><div className="cocina-internacion-filtros"><input placeholder="Buscar paciente, cama o historia clínica" /><select><option>Todos los tipos de dieta</option><option>Dieta normal</option><option>Dieta blanda</option><option>Dieta líquida</option><option>Dieta hiposódica</option></select><select><option>Turno actual</option><option>Desayuno</option><option>Almuerzo</option><option>Cena</option></select></div><table><thead><tr><th>Paciente</th><th>Habitación / cama</th><th>Dieta indicada</th><th>Turno</th><th>Entrega</th></tr></thead><tbody><tr><td colSpan={5}><div className="cocina-internacion-vacio"><Icon name="patient" size={27} /><strong>No hay pacientes internados para mostrar</strong><small>Los pacientes aparecerán al conectar las estancias de internación y sus indicaciones nutricionales.</small></div></td></tr></tbody></table></div>;
}

function Reportes() {
  return <div className="cocina-internacion-panel"><header><div><p>REPORTES DE INTERNACIÓN</p><h3>Consumo y entregas de alimentación</h3></div><button>Exportar reporte</button></header><div className="cocina-internacion-kpis"><article><small>Raciones entregadas hoy</small><b>0</b></article><article><small>Pacientes atendidos</small><b>0</b></article><article><small>Entregas pendientes</small><b>0</b></article></div><p className="cocina-internacion-ayuda">El reporte consolidará raciones por fecha, turno, tipo de dieta y paciente internado.</p></div>;
}
