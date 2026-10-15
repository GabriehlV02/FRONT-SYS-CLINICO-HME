export type FuenteFormula = { variable: string; estudioId: string; parametroId: string; unidad: string };
export type FormulaLaboratorio = { expresion: string; fuentes: FuenteFormula[]; decimales: number; limite?: { variable: string; maximoExclusivo: number } };

// Analizador aritmético: nunca ejecuta JavaScript ingresado por el usuario.
export function evaluarFormula(expresion: string, valores: Record<string, number> = {}) {
  if (!expresion.trim() || expresion.length > 300) throw new Error('Escribe una fórmula de hasta 300 caracteres.');
  const tokens = expresion.match(/(?:\d+(?:\.\d*)?|\.\d+)|[A-Z][A-Z0-9]*|[()+*/-]|\S/g) || [];
  let indice = 0;
  const variables = new Set<string>();
  const factor = (): number => {
    const token = tokens[indice++];
    if (token === '+' || token === '-') return (token === '-' ? -1 : 1) * factor();
    if (token === '(') { const valor = suma(); if (tokens[indice++] !== ')') throw new Error('Revisa los paréntesis de la fórmula.'); return valor; }
    if (token && /^\d*\.?\d+$|^\d+\.$/.test(token)) return Number(token);
    if (token && /^[A-Z][A-Z0-9]*$/.test(token)) { variables.add(token); return valores[token] ?? 1; }
    throw new Error('Usa números, variables en mayúsculas, +, -, *, / y paréntesis.');
  };
  const producto = (): number => {
    let valor = factor();
    while (tokens[indice] === '*' || tokens[indice] === '/') { const op = tokens[indice++]; const siguiente = factor(); valor = op === '*' ? valor * siguiente : valor / siguiente; }
    return valor;
  };
  const suma = (): number => {
    let valor = producto();
    while (tokens[indice] === '+' || tokens[indice] === '-') { const op = tokens[indice++]; const siguiente = producto(); valor = op === '+' ? valor + siguiente : valor - siguiente; }
    return valor;
  };
  const valor = suma();
  if (indice !== tokens.length) throw new Error('La fórmula tiene términos sin una operación.');
  return { valor, variables: [...variables] };
}

export function validarFormula(formula: FormulaLaboratorio) {
  if (!formula || typeof formula.expresion !== 'string' || !Array.isArray(formula.fuentes) || !formula.fuentes.every(f => f && ['variable', 'estudioId', 'parametroId', 'unidad'].every(k => typeof f[k as keyof FuenteFormula] === 'string'))) throw new Error('La configuración de la fórmula es inválida.');
  const { variables } = evaluarFormula(formula.expresion);
  if (!variables.length) throw new Error('La fórmula debe utilizar al menos un parámetro de origen.');
  if (!Number.isInteger(formula.decimales) || formula.decimales < 0 || formula.decimales > 6) throw new Error('Selecciona entre 0 y 6 decimales.');
  if (variables.some(v => !formula.fuentes.some(f => f.variable === v && f.estudioId && f.parametroId)) || formula.fuentes.length !== variables.length || new Set(formula.fuentes.map(f => f.variable)).size !== variables.length) throw new Error('Asigna un parámetro de origen a cada variable de la fórmula.');
  if (formula.limite && (!variables.includes(formula.limite.variable) || !Number.isFinite(formula.limite.maximoExclusivo))) throw new Error('Completa la variable y el límite para calcular.');
}
