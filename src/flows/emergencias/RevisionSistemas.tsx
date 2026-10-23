import { useState } from 'react';
import './RevisionSistemas.css';

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
export default function RevisionSistemas({ cuentaId, cerrada }: { cuentaId: string; cerrada: boolean }) {
  const clave = `revision-sistemas-demo-${cuentaId}`;
  const [registros, setRegistros] = useState<Record<string, Registro>>(() => {
    try { return JSON.parse(sessionStorage.getItem(clave) || '{}'); } catch { return {}; }
  });
  const [error, setError] = useState('');
  function actualizar(id: string, registro: Registro) {
    const siguientes = { ...registros, [id]: registro };
    setRegistros(siguientes);
    try { sessionStorage.setItem(clave, JSON.stringify(siguientes)); setError(''); }
    catch { setError('No se pudo guardar localmente. No cierres esta pestaña antes de recuperar el texto.'); }
  }
  function marcar(id: string, opcion: string) {
    const registro = registros[id] || { estados: [], detalle: '' };
    let estados = registro.estados.includes(opcion) ? registro.estados.filter(e => e !== opcion) : [...registro.estados, opcion];
    if (estados.includes(opcion)) estados = ['Estable', 'No evaluable'].includes(opcion) ? [opcion] : estados.filter(e => !['Estable', 'No evaluable'].includes(e));
    actualizar(id, { ...registro, estados });
  }
  return <details open className="em-panel em-examen-fisico em-panel-plegable">
    <summary className="em-panel-titulo"><div><h3 id="revision-sistemas-titulo">Revisión por Sistema · Examen Físico</h3><small>Selecciona los hallazgos y describe su localización o características.</small></div></summary>
    <div className="revision-sistemas-lista">{sistemas.map(([id, nombre, partes]) => {
      const registro = registros[id] || { estados: [], detalle: '' };
      return <fieldset className="revision-sistema" key={id} disabled={cerrada}>
        <legend>{nombre}</legend><p>{partes}</p>
        <div className="revision-opciones">{opciones.map(opcion => <label key={opcion} className={registro.estados.includes(opcion) ? 'seleccionada' : ''}><input type="checkbox" checked={registro.estados.includes(opcion)} onChange={() => marcar(id, opcion)} />{opcion}</label>)}</div>
        {!registro.estados.length && <small className="revision-pendiente">Sin evaluar</small>}
        <label className="revision-detalle">{registro.estados.includes('Otro') ? 'Especificar otro hallazgo' : 'Observaciones'}<textarea rows={2} maxLength={3000} value={registro.detalle} onChange={e => actualizar(id, { ...registro, detalle: e.target.value })} placeholder={registro.estados.includes('Otro') ? 'Describe el estado o hallazgo no incluido en las opciones…' : 'Localización, características y otros hallazgos…'} /></label>
      </fieldset>;
    })}</div>
    {error && <p className="em-error" role="alert">{error}</p>}
  </details>;
}
