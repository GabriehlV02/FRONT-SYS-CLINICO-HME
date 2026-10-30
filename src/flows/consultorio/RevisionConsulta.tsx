import { useState } from 'react';
import Icon from '../../radius/componentes/Icono';

const sistemas = [
  ['general', 'Estado general', 'Aspecto general y estado de conciencia'],
  ['cabeza', 'Cabeza y cuello', 'Cabeza, cara, ojos, oídos, nariz, boca y cuello'],
  ['respiratorio', 'Sistema respiratorio', 'Vías respiratorias, tórax y pulmones'],
  ['cardiovascular', 'Sistema cardiovascular', 'Corazón, circulación y pulsos periféricos'],
  ['digestivo', 'Sistema digestivo', 'Abdomen y aparato digestivo'],
  ['genitourinario', 'Sistema genitourinario', 'Región renal, vías urinarias y genitales'],
  ['neurologico', 'Sistema neurológico', 'Orientación, sensibilidad y función motora'],
  ['musculoesqueletico', 'Sistema musculoesquelético', 'Columna, extremidades, músculos y articulaciones'],
  ['piel', 'Piel y tejidos blandos', 'Piel, mucosas y tejido subcutáneo'],
] as const;
const opciones = ['Estable', 'Con dolor', 'Alteración observada', 'No evaluable', 'Otro'];
type Registro = { estados: string[]; detalle: string };

export function RevisionConsulta({ pacienteId }: { pacienteId: string }) {
  const [registros, setRegistros] = useState<Record<string, Registro>>({});
  const marcar = (id: string, opcion: string) => setRegistros(actual => {
    const registro = actual[id] || { estados: [], detalle: '' };
    let estados = registro.estados.includes(opcion) ? registro.estados.filter(item => item !== opcion) : [...registro.estados, opcion];
    if (estados.includes(opcion)) estados = ['Estable', 'No evaluable'].includes(opcion) ? [opcion] : estados.filter(item => !['Estable', 'No evaluable'].includes(item));
    return { ...actual, [id]: { ...registro, estados } };
  });
  const actualizarDetalle = (id: string, detalle: string) => setRegistros(actual => ({ ...actual, [id]: { ...(actual[id] || { estados: [] }), detalle } }));
  return <details className="consulta-seguimiento-panel consulta-revision-sistemas"><summary><span>Revisión por Sistema · Examen Físico</span><Icon name="chevronRight" size={18} /></summary><div className="consulta-revision-contenido"><small>Selecciona los hallazgos y describe su localización o características.</small><section className="consulta-revision-lista">{sistemas.map(([id, nombre, descripcion]) => { const registro = registros[id] || { estados: [], detalle: '' }; return <fieldset key={`${pacienteId}-${id}`}><legend>{nombre}</legend><p>{descripcion}</p><div className="consulta-revision-opciones">{opciones.map(opcion => <label key={opcion} className={registro.estados.includes(opcion) ? 'seleccionada' : ''}><input type="checkbox" checked={registro.estados.includes(opcion)} onChange={() => marcar(id, opcion)} />{opcion}</label>)}</div><label className="consulta-revision-detalle">{registro.estados.includes('Otro') ? 'Especificar otro hallazgo' : 'Observaciones'}<textarea rows={2} value={registro.detalle} onChange={event => actualizarDetalle(id, event.target.value)} placeholder="Localización, características y otros hallazgos…" /></label></fieldset>; })}</section></div></details>;
}
