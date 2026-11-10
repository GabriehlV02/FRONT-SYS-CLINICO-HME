export type ArticuloTextil = { id: string; nombre: string; descripcion: string; material: string; tamano: string; color: string; imagen: string };
const CLAVE = "hme-roperia-articulos-v1";
export function leerRoperia(): ArticuloTextil[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(datos) ? datos.filter((item): item is ArticuloTextil => Boolean(item && typeof item.id === "string" && typeof item.nombre === "string")) : [];
  } catch { return []; }
}
export function guardarRoperia(articulos: ArticuloTextil[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(articulos));
  window.dispatchEvent(new Event("hme:roperia:actualizada"));
}
