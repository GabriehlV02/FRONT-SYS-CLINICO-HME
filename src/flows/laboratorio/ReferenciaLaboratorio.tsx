import { useState } from 'react';
import { leerRangoReferencia, type RangoReferencia } from './rangosLaboratorio';

export function ReferenciaLaboratorio({ referencia, rango, numerico, onCambio }: {
  referencia: string; rango?: RangoReferencia; numerico: boolean; onCambio: (valor: string, rango?: RangoReferencia) => void;
}) {
  const rangoInicial = rango || leerRangoReferencia(referencia);
  const [modo, setModo] = useState<'texto' | 'rango'>(numerico && rangoInicial ? 'rango' : 'texto');
  const [minimo, setMinimo] = useState(rangoInicial?.minimo?.toString() || '');
  const [maximo, setMaximo] = useState(rangoInicial?.maximo?.toString() || '');
  const [minimoInclusivo, setMinimoInclusivo] = useState(rangoInicial?.minimoInclusivo !== false);
  const [maximoInclusivo, setMaximoInclusivo] = useState(rangoInicial?.maximoInclusivo !== false);
  const esRango = numerico && modo === 'rango';
  const actualizarRango = (desde: string, hasta: string, incluirMinimo = minimoInclusivo, incluirMaximo = maximoInclusivo) => {
    setMinimo(desde); setMaximo(hasta);
    setMinimoInclusivo(incluirMinimo); setMaximoInclusivo(incluirMaximo);
    const inferior = `${incluirMinimo ? '≥' : '>'} ${desde}`;
    const superior = `${incluirMaximo ? '≤' : '<'} ${hasta}`;
    const referencia = desde && hasta ? incluirMinimo && incluirMaximo ? `${desde} – ${hasta}` : `${inferior} y ${superior}` : desde ? inferior : hasta ? superior : '';
    onCambio(referencia, desde || hasta ? { ...(desde ? { minimo: Number(desde), minimoInclusivo: incluirMinimo } : {}), ...(hasta ? { maximo: Number(hasta), maximoInclusivo: incluirMaximo } : {}) } : undefined);
  };
  return <div className="lab-config-referencia">
    <h5>Valores de referencia</h5>
    {numerico && <label>Formato de referencia<select value={modo} onChange={e => {
      const siguiente = e.target.value as typeof modo;
      setModo(siguiente);
      if (siguiente === 'rango') actualizarRango(minimo, maximo);
      else onCambio(referencia);
    }}><option value="texto">Texto / referencia personalizada</option><option value="rango">Rango numérico (mínimo y máximo)</option></select></label>}
    {esRango ? <><div className="lab-config-rango"><label>Valor mínimo<input type="number" step="any" required={!maximo} value={minimo} onChange={e => actualizarRango(e.target.value, maximo)}/></label><label>Valor máximo<input type="number" step="any" required={!minimo} min={minimo || undefined} value={maximo} onChange={e => actualizarRango(minimo, e.target.value)}/></label></div><div className="lab-config-inclusion"><label><input type="checkbox" checked={minimoInclusivo} disabled={!minimo} onChange={e => actualizarRango(minimo, maximo, e.target.checked, maximoInclusivo)}/> Incluir valor mínimo</label><label><input type="checkbox" checked={maximoInclusivo} disabled={!maximo} onChange={e => actualizarRango(minimo, maximo, minimoInclusivo, e.target.checked)}/> Incluir valor máximo</label></div><p className="lab-config-ayuda">Registra ambos límites, o solo uno. Elige si cada límite se incluye. Al ingresar el resultado se indicará si está dentro, por debajo o por encima.</p></> : <label>Referencia del parámetro<textarea maxLength={1000} rows={3} value={referencia} onChange={e => onCambio(e.target.value)} placeholder="Registra el resultado esperado o una referencia descriptiva."/></label>}
    <p className="lab-config-ayuda">La unidad se configura arriba. Esta referencia se copiará a las nuevas solicitudes; las solicitudes anteriores conservarán la referencia con la que se crearon.</p>
    <p className="lab-config-referencia-preview"><strong>Referencia registrada:</strong> {referencia || 'Sin referencia configurada'}</p>
  </div>;
}
