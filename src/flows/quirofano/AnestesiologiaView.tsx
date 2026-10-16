import { useMemo, useState } from 'react';
import Icon, { type IconName } from '../../radius/componentes/Icono';
import { HorizontalSubvistaNav } from '../../ui/components/HorizontalSubvistaNav';
import '../recepcion/RecepcionView.css';
import '../cocina/CocinaVentasView.css';
import './AnestesiologiaView.css';

type Subvista = 'materiales' | 'informes' | 'stock';
type Material = { id: number; nombre: string; lote: string; disponible: number; unidad: string; minimo: number };

const materialesIniciales: Material[] = [
  { id: 1, nombre: 'Propofol 1%', lote: 'PR-24081', disponible: 28, unidad: 'ampollas', minimo: 12 },
  { id: 2, nombre: 'Midazolam 5 mg', lote: 'MD-24034', disponible: 8, unidad: 'ampollas', minimo: 10 },
  { id: 3, nombre: 'Kit vía aérea adulto', lote: 'VA-24112', disponible: 14, unidad: 'kits', minimo: 6 },
  { id: 4, nombre: 'Tubo endotraqueal 7.5', lote: 'TE-24098', disponible: 4, unidad: 'unidades', minimo: 8 },
];

const opciones: { id: Subvista; nombre: string; icono: IconName }[] = [
  { id: 'materiales', nombre: 'Uso de material', icono: 'package' },
  { id: 'informes', nombre: 'Informes médicos', icono: 'fileText' },
  { id: 'stock', nombre: 'Control de stock', icono: 'warehouse' },
];

export function AnestesiologiaView() {
  const [subvista, setSubvista] = useState<Subvista>('materiales');
  const [materiales, setMateriales] = useState(materialesIniciales);
  const [usos, setUsos] = useState<{ material: string; cantidad: number; paciente: string; hora: string }[]>([]);
  const [materialId, setMaterialId] = useState(1);
  const [cantidad, setCantidad] = useState(1);
  const [informe, setInforme] = useState({ paciente: '', procedimiento: '', hallazgos: '' });
  const alertas = useMemo(() => materiales.filter(material => material.disponible <= material.minimo), [materiales]);
  const registrarUso = () => {
    const material = materiales.find(item => item.id === materialId);
    if (!material || cantidad < 1 || cantidad > material.disponible) return;
    setMateriales(actual => actual.map(item => item.id === materialId ? { ...item, disponible: item.disponible - cantidad } : item));
    setUsos(actual => [{ material: material.nombre, cantidad, paciente: 'Paciente en quirófano', hora: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) }, ...actual]);
    setCantidad(1);
  };
  return <section className="recepcion-vista anestesia-vista" aria-label="Anestesiología">
    <div className="cocina-subvista-cabecera anestesia-navegacion">
      <HorizontalSubvistaNav className="recepcion-subvistas" ariaLabel="Subvistas de Anestesiología">
        {opciones.map(opcion => <button type="button" key={opcion.id} className={subvista === opcion.id ? 'activo' : ''} onClick={() => setSubvista(opcion.id)}>
          <span><Icon name={opcion.icono} size={17}/></span>
          <strong>{opcion.nombre}</strong>
          <small>{opcion.id === 'materiales' ? 'Registro durante la atención quirúrgica.' : opcion.id === 'informes' ? 'Resumen y cierre anestésico.' : 'Disponibilidad y alertas de insumos.'}</small>
        </button>)}
      </HorizontalSubvistaNav>
    </div>
    <header className="anestesia-cabecera"><div><p>QUIRÓFANO · ANESTESIOLOGÍA</p><h2>Gestión anestésica</h2><small>Materiales, informes y disponibilidad del área.</small></div><span className="anestesia-alerta">{alertas.length} alerta{alertas.length === 1 ? '' : 's'} de stock</span></header>
    <HorizontalSubvistaNav className="anestesia-subvistas" ariaLabel="Subvistas de Anestesiología">
      {opciones.map(opcion => <button type="button" key={opcion.id} className={subvista === opcion.id ? 'activo' : ''} onClick={() => setSubvista(opcion.id)}><Icon name={opcion.icono} size={17}/><strong>{opcion.nombre}</strong></button>)}
    </HorizontalSubvistaNav>
    {subvista === 'materiales' && <section className="anestesia-panel anestesia-materiales">
      <header><div><h3>Registrar uso de material</h3><small>El movimiento queda asociado a la atención activa.</small></div></header>
      <div className="anestesia-registro"><label>Material<select value={materialId} onChange={event => setMaterialId(Number(event.target.value))}>{materiales.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.disponible} {item.unidad}</option>)}</select></label><label>Cantidad<input type="number" min="1" value={cantidad} onChange={event => setCantidad(Number(event.target.value))}/></label><button type="button" onClick={registrarUso}><Icon name="plus" size={16}/> Registrar uso</button></div>
      <div className="anestesia-tabla"><div className="anestesia-fila encabezado"><span>Material</span><span>Cantidad</span><span>Paciente</span><span>Hora</span></div>{usos.length ? usos.map((uso, indice) => <div className="anestesia-fila" key={`${uso.material}-${indice}`}><strong>{uso.material}</strong><span>{uso.cantidad}</span><span>{uso.paciente}</span><span>{uso.hora}</span></div>) : <p className="anestesia-vacio">Aún no se registraron materiales en esta atención.</p>}</div>
    </section>}
    {subvista === 'informes' && <section className="anestesia-panel anestesia-informes"><header><div><h3>Informe anestésico</h3><small>Registra el resumen clínico antes de cerrar la atención.</small></div><button type="button" onClick={() => window.print()}><Icon name="print" size={16}/> Imprimir</button></header><div className="anestesia-formulario"><label>Paciente<input value={informe.paciente} onChange={event => setInforme({ ...informe, paciente: event.target.value })} placeholder="Buscar o seleccionar paciente"/></label><label>Procedimiento<input value={informe.procedimiento} onChange={event => setInforme({ ...informe, procedimiento: event.target.value })} placeholder="Procedimiento realizado"/></label><label className="anestesia-ancho">Hallazgos y evolución<textarea value={informe.hallazgos} onChange={event => setInforme({ ...informe, hallazgos: event.target.value })} placeholder="Técnica anestésica, incidencias, recuperación y recomendaciones"/></label></div><footer><button type="button" onClick={() => setInforme({ paciente: '', procedimiento: '', hallazgos: '' })}>Limpiar</button><button type="button" className="primario">Guardar informe</button></footer></section>}
    {subvista === 'stock' && <section className="anestesia-panel"><header><div><h3>Control de stock</h3><small>Existencias disponibles en anestesiología.</small></div><span className="anestesia-alerta">{alertas.length} por reponer</span></header><div className="anestesia-stock">{materiales.map(material => { const bajo = material.disponible <= material.minimo; return <article key={material.id} className={bajo ? 'bajo' : ''}><div><strong>{material.nombre}</strong><small>Lote {material.lote}</small></div><b>{material.disponible} <small>{material.unidad}</small></b><span>Mínimo: {material.minimo}</span><em>{bajo ? 'Reponer' : 'Disponible'}</em></article>; })}</div></section>}
  </section>;
}
