import type { SignoVitalConfig } from './ConfiguracionSignosVitalesView';
import type { RangoReferencia } from './rangosReferencia';

export function camposParaServicio(signos: SignoVitalConfig[], asignados: string[]) {
  return signos.filter(signo => asignados.includes(signo.id)).flatMap(signo => signo.componentes?.length
    ? signo.componentes.map(componente => ({ id: `${signo.id}::${componente.id}`, etiqueta: `${signo.nombre} · ${componente.nombre}`, unidad: signo.abreviatura, tipo: 'Número decimal', rango: componente.rangoReferencia }))
    : [{ id: signo.id, etiqueta: signo.nombre, unidad: signo.abreviatura, tipo: signo.tipo, rango: signo.rangoReferencia }]);
}

export function compararReferencia(valor: string, rango: RangoReferencia | null | undefined, edad: number | null): 'alto' | 'bajo' | null {
  if (!rango || !valor.trim() || !Number.isFinite(Number(valor))) return null;
  if (rango.contexto) {
    const contexto = rango.contexto.toLocaleLowerCase('es');
    if (!contexto.includes('adulto') || edad === null || edad < 20) return null;
  }
  const numero = Number(valor);
  return numero > rango.maximo ? 'alto' : numero < rango.minimo ? 'bajo' : null;
}
