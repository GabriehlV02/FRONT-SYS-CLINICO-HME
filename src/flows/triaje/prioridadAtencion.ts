import { compararReferencia } from "./camposSignosVitales";
import type { RangoReferencia } from "./rangosReferencia";

export type PrioridadAtencion = {
  id: string;
  registradoEn: string;
  mediciones: { id: string; nombre: string; valor: string; unidad: string; rangoReferencia?: RangoReferencia | null }[];
};

export function evaluarPrioridad(
  campos: { id: string; etiqueta: string; unidad: string; rango?: RangoReferencia | null; alertaPrioritaria?: boolean }[],
  valores: Record<string, string>, edad: number | null,
): PrioridadAtencion | null {
  const mediciones = campos.filter((campo) => campo.alertaPrioritaria && compararReferencia(valores[campo.id] ?? "", campo.rango, edad))
    .map((campo) => ({ id: campo.id, nombre: campo.etiqueta, unidad: campo.unidad, valor: valores[campo.id], rangoReferencia: campo.rango }));
  return mediciones.length ? { id: crypto.randomUUID(), registradoEn: new Date().toISOString(), mediciones } : null;
}

export function mensajePrioridad(paciente: string, prioridad: PrioridadAtencion) {
  const signos = prioridad.mediciones.map((medicion) => `${medicion.nombre}: ${medicion.valor} ${medicion.unidad}${medicion.rangoReferencia ? ` (rango ${medicion.rangoReferencia.minimo}–${medicion.rangoReferencia.maximo})` : ""}`).join("; ");
  return `El paciente ${paciente} presenta signos vitales fuera del rango de alerta configurado: ${signos}. Requiere valoración inmediata.`;
}
