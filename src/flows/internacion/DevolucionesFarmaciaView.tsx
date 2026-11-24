import { useState, useSyncExternalStore, type FormEvent } from "react";
import { obtenerEpisodios, suscribirEpisodios } from "../consultorio/registroHistoria";
import { leerDescargos, suscribirDescargos } from "./registroDescargos";

type Devolucion = { id: string; descargo: string; productoId: string; producto: string; paciente: string; ci: string; cantidad: number; motivo: string; responsable: string; fecha: string };
const clave = "hme:devoluciones-descargos-farmacia:v1";
const evento = "farmacia:devoluciones-actualizadas";
let cache: Devolucion[] | undefined;
function leer(): Devolucion[] {
  if (cache) return cache;
  const datos: unknown = JSON.parse(localStorage.getItem(clave) || "[]");
  if (!Array.isArray(datos)) throw new Error("El registro de devoluciones no es válido.");
  return cache = datos as Devolucion[];
}
function suscribir(actualizar: () => void) {
  const manejar = () => { cache = undefined; actualizar(); };
  window.addEventListener(evento, manejar);
  window.addEventListener("storage", manejar);
  return () => { window.removeEventListener(evento, manejar); window.removeEventListener("storage", manejar); };
}
export function DevolucionesFarmaciaView({ historial = false, responsable }: { historial?: boolean; responsable: string }) {
  const episodios = useSyncExternalStore(suscribirEpisodios, obtenerEpisodios);
  const descargos = useSyncExternalStore(suscribirDescargos, leerDescargos);
  const devoluciones = useSyncExternalStore(suscribir, leer);
  const [seleccion, setSeleccion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const productos = episodios.flatMap((episodio) => episodio.recetas.flatMap((documento, indice) => {
    const id = documento.receta?.id || `${episodio.episodioId}-${indice}`;
    if (descargos[id]?.estado !== "recibido") return [];
    return (documento.receta?.medicamentos || []).map((item) => {
      const devuelta = devoluciones.filter((d) => d.descargo === id && d.productoId === item.id).reduce((total, d) => total + d.cantidad, 0);
      const entregada = Number(item.cantidad);
      return { clave: JSON.stringify([id, item.id]), descargo: id, productoId: item.id, producto: item.nombre, paciente: episodio.paciente.paciente, ci: episodio.paciente.ci, disponible: Number.isFinite(entregada) ? Math.max(0, entregada - devuelta) : 0 };
    });
  }));
  const producto = productos.find((item) => item.clave === seleccion);
  function guardar(e: FormEvent) {
    e.preventDefault();
    setMensaje("");
    const unidades = Number(cantidad);
    if (!producto || !Number.isFinite(unidades) || unidades <= 0 || unidades > producto.disponible || !motivo.trim()) { setMensaje("Selecciona un producto, indica una cantidad disponible y el motivo."); return; }
    // Volver a leer antes de guardar evita exceder la entrega con otra pestaña.
    cache = undefined;
    try {
      const actuales = leer();
      const anterior = devoluciones.filter((d) => d.descargo === producto.descargo && d.productoId === producto.productoId).reduce((s, d) => s + d.cantidad, 0);
      const ahora = actuales.filter((d) => d.descargo === producto.descargo && d.productoId === producto.productoId).reduce((s, d) => s + d.cantidad, 0);
      if (unidades > producto.disponible + anterior - ahora) throw new Error("Las cantidades cambiaron. Revisa el saldo disponible.");
      const registro: Devolucion = { id: crypto.randomUUID(), descargo: producto.descargo, productoId: producto.productoId, producto: producto.producto, paciente: producto.paciente, ci: producto.ci, cantidad: unidades, motivo: motivo.trim(), responsable, fecha: new Date().toISOString() };
      localStorage.setItem(clave, JSON.stringify([registro, ...actuales]));
      window.dispatchEvent(new Event(evento));
      setCantidad(""); setMotivo(""); setSeleccion(""); setMensaje("Devolución registrada correctamente.");
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo guardar la devolución."); }
  }
  const visibles = devoluciones.filter((d) => `${d.paciente} ${d.ci} ${d.producto} ${d.motivo} ${d.responsable}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  return <section className="fi-panel"><header className="fi-encabezado"><div><p>FARMACIA · DEVOLUCIONES</p><h2>{historial ? "Historial de devoluciones" : "Devoluciones"}</h2><small>{historial ? "Consulta las devoluciones registradas y sus responsables." : "Registra productos devueltos de descargos recibidos."}</small></div></header>
    <p className="fd-aviso">Registro local de recepción de devoluciones. No modifica el inventario ni genera reembolsos.</p>
    {historial ? <><div className="fi-controles"><label className="fi-buscador"><input type="search" aria-label="Buscar devoluciones" placeholder="Buscar paciente, CI, producto o responsable" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label></div><div className="fi-tabla-wrap"><table className="fi-tabla"><thead><tr><th>Fecha</th><th>Paciente / CI</th><th>Producto</th><th>Cantidad</th><th>Motivo</th><th>Responsable</th></tr></thead><tbody>{visibles.map((d) => <tr key={d.id}><td>{new Date(d.fecha).toLocaleString("es-BO")}</td><td>{d.paciente}<small>{d.ci}</small></td><td>{d.producto}</td><td>{d.cantidad}</td><td>{d.motivo}</td><td>{d.responsable}</td></tr>)}</tbody></table></div>{!visibles.length && <div className="fi-vacio"><strong>No hay devoluciones que mostrar.</strong></div>}</> : <form className="fd-formulario" onSubmit={guardar}><label>Paciente y producto recibido<select required value={seleccion} onChange={(e) => { setSeleccion(e.target.value); setCantidad(""); setMensaje(""); }}><option value="">Selecciona un producto</option>{productos.filter((p) => p.disponible > 0).map((p) => <option key={p.clave} value={p.clave}>{p.paciente} · {p.ci} · {p.producto} · Disponible: {p.disponible}</option>)}</select></label><label>Cantidad a devolver<input required type="number" min="0.001" step="any" max={producto?.disponible} value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label><label>Motivo<textarea required maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label><button className="fi-primario" disabled={!producto} type="submit">Registrar devolución recibida</button>{!productos.some((p) => p.disponible > 0) && <p>No hay productos de descargos recibidos disponibles para devolver.</p>}{mensaje && <p role="status">{mensaje}</p>}</form>}
  </section>;
}
