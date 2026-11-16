import { apiFetch } from "../../radius/api";
import { esModoPruebaLocal } from "../../radius/datos/modoPrueba";
import { leerSesion } from "../../radius/types/sesion";

export type AlmacenInsumos = { id: number; nombre: string; sucursal: string };
export type ItemInsumos = { id: number; nombre: string; codigo: string; unidad: string };
export type StockInsumos = ItemInsumos & { cantidad: number | string; estado: string; estado_producto: string };
export type DetalleSolicitud = { item_id: number; nombre: string; unidad: string; cantidad: number };
export type SolicitudInsumos = { id: string; almacen_destino_id: number; almacen: string; solicitante: string; estado: "pendiente" | "dispensada"; detalles: DetalleSolicitud[]; observacion: string | null; created_at: string; dispensado_en?: string | null };
export type OpcionesInsumos = { almacenes: AlmacenInsumos[]; catalogo: ItemInsumos[] };
const ruta = "/api/v1/enfermeria/insumos";
const clave = "clinico:insumos-enfermeria-demo:v1";
type DatosDemo = { stocks: Record<string, StockInsumos[]>; solicitudes: SolicitudInsumos[] };
const catalogoDemo: ItemInsumos[] = [
  { id: 1, nombre: "Jeringa estéril 5 ml", codigo: "PRUEBA-JER-5", unidad: "Unidad" },
  { id: 2, nombre: "Guantes de nitrilo", codigo: "PRUEBA-GUA", unidad: "Par" },
  { id: 3, nombre: "Solución fisiológica 500 ml", codigo: "PRUEBA-SOL", unidad: "Frasco" },
];
function leerDemo(): DatosDemo {
  const guardado = localStorage.getItem(clave);
  if (guardado) return JSON.parse(guardado);
  const stock = (item: ItemInsumos, cantidad: number): StockInsumos => ({ ...item, cantidad, estado: "ACTIVO", estado_producto: "ACTIVO" });
  return { stocks: { "1": catalogoDemo.map((item) => stock(item, 100)), "2": [stock(catalogoDemo[0], 12), stock(catalogoDemo[1], 20)] }, solicitudes: [] };
}
async function solicitar<T>(path: string, body?: object): Promise<T> {
  if (esModoPruebaLocal()) return demo(path, body) as T;
  const respuesta = await apiFetch(`${ruta}${path}`, body ? { method: "POST", body: JSON.stringify(body) } : {});
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(Object.values(datos.errors || {}).flat().join(" ") || datos.message || "No se pudo completar la operación.");
  return datos;
}
function demo(path: string, body?: object): unknown {
  const datos = leerDemo();
  if (path === "/opciones") return { almacenes: [{ id: 2, nombre: "Enfermería · pruebas", sucursal: "Hospital" }, { id: 1, nombre: "Farmacia · pruebas", sucursal: "Hospital" }], catalogo: catalogoDemo };
  if (path.startsWith("/stock?")) return { data: datos.stocks[new URLSearchParams(path.split("?")[1]).get("almacen_id") || ""] || [] };
  if (path.startsWith("/solicitudes") && !body) return { data: [...datos.solicitudes].reverse() };
  if (path === "/solicitudes" && body) {
    const pedido = body as { id: string; almacen_destino_id: number; detalles: { item_id: number; cantidad: number }[]; observacion: string };
    if (!datos.stocks[pedido.almacen_destino_id]) throw new Error("Selecciona un almacén válido.");
    if (datos.solicitudes.some((solicitud) => solicitud.id === pedido.id)) return { id: pedido.id };
    const detalles = pedido.detalles.map((detalle) => {
      const item = catalogoDemo.find((producto) => producto.id === detalle.item_id);
      if (!item || !Number.isFinite(detalle.cantidad) || detalle.cantidad <= 0) throw new Error("Selecciona un insumo y una cantidad válida.");
      return { item_id: item.id, nombre: item.nombre, unidad: item.unidad, cantidad: detalle.cantidad };
    });
    datos.solicitudes.push({ ...pedido, detalles, estado: "pendiente", almacen: pedido.almacen_destino_id === 2 ? "Enfermería · pruebas" : "Farmacia · pruebas", solicitante: leerSesion()?.usuario.nombre || "Enfermería", created_at: new Date().toISOString() });
  } else if (body && path.endsWith("/dispensar")) {
    const pedido = datos.solicitudes.find((solicitud) => solicitud.id === path.split("/")[2]);
    if (!pedido) throw new Error("La solicitud no existe.");
    if (pedido.estado === "dispensada") return { message: "La solicitud ya fue dispensada." };
    const origen = (body as { almacen_origen_id: number }).almacen_origen_id;
    if (origen === pedido.almacen_destino_id || !datos.stocks[origen]) throw new Error("Selecciona un almacén de origen diferente al destino.");
    for (const detalle of pedido.detalles) {
      const stock = datos.stocks[origen].find((item) => item.id === detalle.item_id);
      if (!stock || Number(stock.cantidad) < detalle.cantidad) throw new Error(`Stock insuficiente de ${detalle.nombre}.`);
    }
    for (const detalle of pedido.detalles) {
      const origenItem = datos.stocks[origen].find((item) => item.id === detalle.item_id)!;
      origenItem.cantidad = Number(origenItem.cantidad) - detalle.cantidad;
      let destinoItem = datos.stocks[pedido.almacen_destino_id].find((item) => item.id === detalle.item_id);
      if (!destinoItem) { destinoItem = { ...origenItem, cantidad: 0 }; datos.stocks[pedido.almacen_destino_id].push(destinoItem); }
      destinoItem.cantidad = Number(destinoItem.cantidad) + detalle.cantidad;
    }
    pedido.estado = "dispensada";
    pedido.dispensado_en = new Date().toISOString();
  } else throw new Error("Operación no disponible.");
  localStorage.setItem(clave, JSON.stringify(datos));
  window.dispatchEvent(new Event("enfermeria:stock-actualizado"));
  return { message: "Operación registrada." };
}
export const opcionesInsumos = () => solicitar<OpcionesInsumos>("/opciones");
export const stockInsumos = (almacen: number) => solicitar<{ data: StockInsumos[] }>(`/stock?almacen_id=${almacen}`);
export const solicitudesInsumos = (farmacia = false) => solicitar<{ data: SolicitudInsumos[] }>(`/solicitudes${farmacia ? "?farmacia=1" : ""}`);
export const enviarSolicitudInsumos = (body: { id: string; almacen_destino_id: number; detalles: { item_id: number; cantidad: number }[]; observacion: string }) => solicitar("/solicitudes", body);
export const dispensarSolicitudInsumos = (id: string, almacen: number) => solicitar(`/solicitudes/${id}/dispensar`, { almacen_origen_id: almacen });
