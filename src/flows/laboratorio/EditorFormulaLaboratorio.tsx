import type { ParametroLaboratorio, TipoLaboratorio } from './catalogoLaboratorio';
import { evaluarFormula, type FormulaLaboratorio } from './formulasLaboratorio';

export function EditorFormulaLaboratorio({ parametro, estudio, catalogo, onCambio }: {
  parametro: ParametroLaboratorio; estudio: TipoLaboratorio; catalogo: TipoLaboratorio[];
  onCambio: (formula: FormulaLaboratorio | undefined) => void;
}) {
  const formula = parametro.formula;
  const fuentes = [...catalogo.filter(t => t.id !== estudio.id), estudio].flatMap(t => t.parametros.filter(p => p.tipo === 'numero' && !(t.id === estudio.id && p.id === parametro.id)).map(p => ({ estudio: t, parametro: p })));
  let error = '';
  if (formula) { try { evaluarFormula(formula.expresion); } catch (e) { error = (e as Error).message; } }
  return <div className="lab-config-referencia lab-config-formula">
    <label>Método de registro<select value={formula ? 'calculado' : 'manual'} onChange={e => onCambio(e.target.value === 'manual' ? undefined : { expresion: '', fuentes: [], decimales: 2 })}><option value="manual">Manual</option><option value="calculado">Calculado por fórmula</option></select></label>
    {formula && <>
      <label>Fórmula<input required maxLength={300} value={formula.expresion} placeholder="Ej. A / 5 o A - B - C" onChange={e => {
        const expresion = e.target.value.toUpperCase();
        const variables = [...new Set(expresion.match(/[A-Z][A-Z0-9]*/g) || [])];
        onCambio({ ...formula, expresion, fuentes: variables.map(variable => formula.fuentes.find(f => f.variable === variable) || { variable, estudioId: '', parametroId: '', unidad: '' }), limite: formula.limite && variables.includes(formula.limite.variable) ? formula.limite : undefined });
      }}/></label>
      <p className="lab-config-ayuda">Usa variables como A, B y C, números y operaciones + − * /. Selecciona el origen de cada variable. Solo se toman resultados de la misma solicitud.</p>
      {formula.fuentes.map(f => <label key={f.variable}>Origen de {f.variable}<select required value={f.estudioId ? JSON.stringify([f.estudioId, f.parametroId]) : ''} onChange={e => {
        const seleccionado = fuentes.find(o => JSON.stringify([o.estudio.id, o.parametro.id]) === e.target.value);
        onCambio({ ...formula, fuentes: formula.fuentes.map(actual => actual.variable !== f.variable ? actual : { variable: f.variable, estudioId: seleccionado?.estudio.id || '', parametroId: seleccionado?.parametro.id || '', unidad: seleccionado?.parametro.unidad || '' }) });
      }}><option value="">Selecciona estudio y parámetro</option>{fuentes.map(o => <option key={`${o.estudio.id}:${o.parametro.id}`} value={JSON.stringify([o.estudio.id, o.parametro.id])}>{o.estudio.nombre || 'Este estudio'} → {o.parametro.nombre || 'Parámetro sin nombre'}{o.parametro.unidad ? ` (${o.parametro.unidad})` : ''}</option>)}</select></label>)}
      <label>Decimales del resultado<select value={formula.decimales} onChange={e => onCambio({ ...formula, decimales: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label>No calcular si esta variable alcanza o supera el límite<select value={formula.limite?.variable || ''} onChange={e => onCambio({ ...formula, limite: e.target.value ? { variable: e.target.value, maximoExclusivo: NaN } : undefined })}><option value="">Sin límite adicional</option>{formula.fuentes.map(f => <option key={f.variable} value={f.variable}>{f.variable}</option>)}</select></label>
      {formula.limite && <label>Límite de la variable (en su unidad de origen)<input type="number" step="any" required value={Number.isFinite(formula.limite.maximoExclusivo) ? formula.limite.maximoExclusivo : ''} onChange={e => onCambio({ ...formula, limite: { variable: formula.limite!.variable, maximoExclusivo: e.target.value === '' ? NaN : Number(e.target.value) } })}/></label>}
      {error && <p className="lab-config-ayuda" role="status">{error}</p>}
      <p className="lab-config-ayuda">Configura la fórmula, unidades y límites que utiliza tu laboratorio. Los resultados calculados se mostrarán como tales y no se escriben manualmente.</p>
    </>}
  </div>;
}
