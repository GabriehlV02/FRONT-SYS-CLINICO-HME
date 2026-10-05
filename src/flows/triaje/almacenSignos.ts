import type { SignoVitalConfig } from './ConfiguracionSignosVitalesView';

const clave = 'clinico.triaje.signos-vitales.v1';
export function cargarSignos(iniciales: SignoVitalConfig[]): SignoVitalConfig[] {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(clave) || 'null');
    if (!Array.isArray(valor) || !valor.every((s) => s && typeof s.id === 'string' && typeof s.nombre === 'string' && typeof s.unidad === 'string' && typeof s.abreviatura === 'string' && ['Texto', 'Número entero', 'Número decimal'].includes(s.tipo) && (!s.rangoReferencia || (Number.isFinite(s.rangoReferencia.minimo) && Number.isFinite(s.rangoReferencia.maximo) && s.rangoReferencia.minimo < s.rangoReferencia.maximo)))) return iniciales;
    return valor;
  } catch { return iniciales; }
}

export function guardarSignos(signos: SignoVitalConfig[]) {
  localStorage.setItem(clave, JSON.stringify(signos));
}
