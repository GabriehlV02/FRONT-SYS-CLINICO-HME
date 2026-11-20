import { apiFetch } from "../../radius/api";

export type AlmacenInsumos = { id: number; nombre: string; sucursal: string };
export type ItemInsumos = { id: number; nombre: string; codigo: string; unidad: string };
export type StockInsumos = ItemInsumos & { cantidad: number | string; estado: string; estado_producto: string };
export type DetalleSolicitud = { item_id: number; nombre: string; unidad: string; cantidad: number };
export type SolicitudInsumos = { id: string; almacen_destino_id: number; almacen: string; solicitante: string; servicio?: string | null; pacientes?: string[]; estado: "pendiente" | "dispensada" | "anulada"; detalles: DetalleSolicitud[]; observacion: string | null; created_at: string; dispensado_en?: string | null; anulada_en?: string | null };
export type OpcionesInsumos = { almacenes: AlmacenInsumos[]; catalogo: ItemInsumos[] };
const ruta = "/api/v1/enfermeria/insumos";
async function solicitar<T>(path: string, body?: object): Promise<T> {
  const respuesta = await apiFetch(`${ruta}${path}`, body ? { method: "POST", body: JSON.stringify(body) } : {});
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(Object.values(datos.errors || {}).flat().join(" ") || datos.message || "No se pudo completar la operación.");
  return datos;
}
export const opcionesInsumos = () => solicitar<OpcionesInsumos>("/opciones");
export const stockInsumos = (almacen: number) => solicitar<{ data: StockInsumos[] }>(`/stock?almacen_id=${almacen}`);
export const solicitudesInsumos = (farmacia = false, pagina = 1) => solicitar<{ data: SolicitudInsumos[]; current_page?: number; last_page?: number; total?: number; per_page?: number }>(`/solicitudes${farmacia ? `?farmacia=1&page=${pagina}` : ""}`);
export const enviarSolicitudInsumos = (body: { id: string; almacen_destino_id: number; servicio: string; pacientes: string[]; detalles: { item_id: number; cantidad: number }[]; observacion: string }) => solicitar("/solicitudes", body);
export const dispensarSolicitudInsumos = (id: string, almacen: number) => solicitar(`/solicitudes/${id}/dispensar`, { almacen_origen_id: almacen });
export const anularSolicitudInsumos = (id: string) => solicitar(`/solicitudes/${id}/anular`, {});
