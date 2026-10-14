export type ItemCirugia = { id: string; materialId?: string; codigo?: string; nombre: string; cantidad: number; precioUnitario: number };
export type PaqueteCirugia = {
  id: string; codigo: string; nombre: string; especialidad: string; medico: string;
  horasQuirofano: number; tarifaHoraQuirofano: number;
  colaboradores: number; tarifaColaborador: number;
  anestesiologo: boolean; tarifaAnestesiologo: number;
  instrumentos: ItemCirugia[]; otrosCargos: ItemCirugia[];
};

const CLAVE = 'hme-cirugias-admin-v1';
export const subtotalItems = (items: ItemCirugia[]) => items.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0);
export const totalPaquete = (item: PaqueteCirugia) => item.horasQuirofano * item.tarifaHoraQuirofano + item.colaboradores * item.tarifaColaborador + (item.anestesiologo ? item.tarifaAnestesiologo : 0) + subtotalItems(item.instrumentos) + subtotalItems(item.otrosCargos);
export const tieneTarifas = (item: PaqueteCirugia) => Boolean(item.tarifaHoraQuirofano || item.tarifaColaborador || (item.anestesiologo && item.tarifaAnestesiologo) || item.instrumentos.some(parte => parte.precioUnitario) || item.otrosCargos.some(parte => parte.precioUnitario));
export const tieneTarifasPendientes = (item: PaqueteCirugia) => Boolean((item.horasQuirofano && !item.tarifaHoraQuirofano) || (item.colaboradores && !item.tarifaColaborador) || (item.anestesiologo && !item.tarifaAnestesiologo) || item.instrumentos.some(parte => !parte.precioUnitario) || item.otrosCargos.some(parte => !parte.precioUnitario));

export function leerCatalogoCirugias(): PaqueteCirugia[] {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(valor) ? valor.filter((item): item is PaqueteCirugia => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.codigo === 'string' && Array.isArray(item.instrumentos) && Array.isArray(item.otrosCargos))) : [];
  } catch { return []; }
}

export function guardarCatalogoCirugias(items: PaqueteCirugia[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(items));
}
