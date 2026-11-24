import type { RangoReferencia } from "../triaje/rangosReferencia";
export type CampoGrafica = { id: string; etiqueta: string; unidad?: string; rango?: RangoReferencia | null };
export type MedicionGrafica = { id: string; fecha: string; valores: Record<string, string | number | undefined>; mediciones?: readonly { id: string; nombre: string; valor?: string | number }[] };

export function puntosSignoVital(campo: CampoGrafica, mediciones: readonly MedicionGrafica[]) {
  return mediciones.flatMap((medicion) => {
    const detalle = medicion.mediciones?.find((registro) => registro.id === campo.id || registro.nombre === campo.etiqueta);
    const original = detalle?.valor ?? medicion.valores[campo.id];
    if (original === undefined || (typeof original === "string" && !original.trim())) return [];
    const valor = typeof original === "string" ? Number(original.trim().replace(",", ".")) : original;
    const instante = new Date(medicion.fecha).getTime();
    if (!Number.isFinite(valor) || !Number.isFinite(instante)) return [];
    return [{ id: medicion.id, fecha: medicion.fecha, instante, valor }];
  }).sort((a, b) => a.instante - b.instante);
}
