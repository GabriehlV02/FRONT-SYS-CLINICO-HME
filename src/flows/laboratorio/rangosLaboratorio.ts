export type RangoReferencia = { minimo?: number; maximo?: number; minimoInclusivo?: boolean; maximoInclusivo?: boolean };
export function leerRangoReferencia(referencia: string): RangoReferencia | undefined {
  const numero = '(-?\\d+(?:[.,]\\d+)?)';
  const rango = referencia.trim().match(new RegExp(`^${numero}\\s*[–-]\\s*${numero}$`));
  if (rango) return { minimo: Number(rango[1].replace(',', '.')), maximo: Number(rango[2].replace(',', '.')) };
  const limite = referencia.trim().match(new RegExp(`^(≥|≤|>|<)\\s*${numero}$`));
  if (limite) return ['≥', '>'].includes(limite[1]) ? { minimo: Number(limite[2].replace(',', '.')), ...(limite[1] === '>' ? { minimoInclusivo: false } : {}) } : { maximo: Number(limite[2].replace(',', '.')), ...(limite[1] === '<' ? { maximoInclusivo: false } : {}) };
}
export function validarRangoReferencia(rango: RangoReferencia) {
  if (rango.minimo === undefined && rango.maximo === undefined) throw new Error('Registra al menos un límite de referencia.');
  if ([rango.minimo, rango.maximo].some(n => n !== undefined && !Number.isFinite(n))) throw new Error('Los límites de referencia deben ser números válidos.');
  if (rango.minimo !== undefined && rango.maximo !== undefined && rango.minimo > rango.maximo) throw new Error('El mínimo de referencia no puede ser mayor que el máximo.');
  if ([rango.minimoInclusivo, rango.maximoInclusivo].some(v => v !== undefined && typeof v !== 'boolean')) throw new Error('Revisa si los límites de referencia se incluyen.');
  if (rango.minimo !== undefined && rango.minimo === rango.maximo && (rango.minimoInclusivo === false || rango.maximoInclusivo === false)) throw new Error('El rango de referencia no puede quedar vacío.');
}
export function compararReferencia(valor: string, referencia: string, rango?: RangoReferencia, numerico = true) {
  const limites = rango || leerRangoReferencia(referencia);
  if (!numerico || !limites) return { estado: 'sin-rango', texto: referencia.trim() ? 'Referencia de texto · Sin comparación automática' : 'Sin rango configurado' };
  try { validarRangoReferencia(limites); } catch { return { estado: 'sin-rango', texto: 'Revisa el rango en Tipos de laboratorio' }; }
  if (!valor.trim()) return { estado: 'pendiente', texto: 'Pendiente de resultado' };
  const limpio = valor.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(limpio) || !Number.isFinite(Number(limpio))) return { estado: 'pendiente', texto: 'Ingresa un resultado numérico válido' };
  const numero = Number(limpio);
  if (limites.minimo !== undefined && numero < limites.minimo) return { estado: 'bajo', texto: 'Por debajo del rango ↓' };
  if (limites.maximo !== undefined && numero > limites.maximo) return { estado: 'alto', texto: 'Por encima del rango ↑' };
  if (limites.minimoInclusivo === false && numero === limites.minimo) return { estado: 'bajo', texto: 'Fuera del rango · Límite inferior ↓' };
  if (limites.maximoInclusivo === false && numero === limites.maximo) return { estado: 'alto', texto: 'Fuera del rango · Límite superior ↑' };
  return { estado: 'en-rango', texto: 'Dentro del rango' };
}
