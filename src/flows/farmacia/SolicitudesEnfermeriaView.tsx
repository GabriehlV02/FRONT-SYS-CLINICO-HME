import { useEffect, useState } from "react";
import { confirmar, notificar } from "../../radius/componentes/Notificaciones";
import { opcionesInsumos, solicitudesInsumos, dispensarSolicitudInsumos, type AlmacenInsumos, type SolicitudInsumos } from "../emergencias/insumosEnfermeriaApi";
import "./SolicitudesEnfermeriaView.css";

export function SolicitudesEnfermeriaView() {
  const [almacenes, setAlmacenes] = useState<AlmacenInsumos[]>([]);
  const [origen, setOrigen] = useState("");
  const [solicitudes, setSolicitudes] = useState<SolicitudInsumos[]>([]);
  const [estado, setEstado] = useState("pendiente");
  const [error, setError] = useState(""), [cargando, setCargando] = useState(true), [ocupada, setOcupada] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vigente = true, leyendo = false;
    const cargar = async () => {
      if (leyendo) return;
      leyendo = true;
      try {
        const [opciones, pedidos] = await Promise.all([opcionesInsumos(), solicitudesInsumos(true)]);
        if (vigente) { setAlmacenes(opciones.almacenes); setSolicitudes(pedidos.data); setOrigen((actual) => opciones.almacenes.some((a) => String(a.id) === actual) ? actual : opciones.almacenes.length === 1 ? String(opciones.almacenes[0].id) : ""); setError(""); }
      } catch (fallo) { if (vigente) setError(fallo instanceof Error ? fallo.message : "No se pudieron consultar las solicitudes."); }
      finally { leyendo = false; if (vigente) setCargando(false); }
    };
    void cargar();
    const timer = window.setInterval(cargar, 5000);
    window.addEventListener("enfermeria:stock-actualizado", cargar);
    window.addEventListener("storage", cargar);
    return () => { vigente = false; window.clearInterval(timer); window.removeEventListener("enfermeria:stock-actualizado", cargar); window.removeEventListener("storage", cargar); };
  }, [version]);
  const dispensar = async (pedido: SolicitudInsumos) => {
    if (ocupada || !origen) return;
    setOcupada(pedido.id);
    try {
      if (!await confirmar({ titulo: "Confirmar dispensación", mensaje: `Se transferirán los insumos solicitados desde ${almacenes.find((a) => String(a.id) === origen)?.nombre} hacia ${pedido.almacen}.`, textoConfirmar: "Dispensar insumos" })) return;
      await dispensarSolicitudInsumos(pedido.id, Number(origen));
      setVersion((actual) => actual + 1);
      notificar("exito", "Insumos dispensados", "El stock fue transferido al almacén de enfermería.");
    } catch (fallo) { notificar("error", "No se pudo dispensar", fallo instanceof Error ? fallo.message : "Intenta nuevamente."); }
    finally { setOcupada(""); }
  };
  const visibles = solicitudes.filter((pedido) => pedido.estado === estado);
  return <section className="farmacia-solicitudes-enfermeria" aria-label="Solicitudes de insumos de enfermería">
    <header><div><h2>Solicitudes de enfermería</h2><p>Dispensa desde tu almacén de Farmacia y transfiere el stock al almacén solicitante.</p></div><span>{visibles.length} solicitudes</span></header>
    <div className="farmacia-solicitudes-filtros">
      <label>Almacén de origen<select value={origen} onChange={(evento) => setOrigen(evento.target.value)} disabled={!!ocupada}><option value="">Seleccionar almacén de Farmacia</option>{almacenes.map((almacen) => <option value={almacen.id} key={almacen.id}>{almacen.nombre} · {almacen.sucursal}</option>)}</select></label>
      <label>Estado<select value={estado} onChange={(evento) => setEstado(evento.target.value)}><option value="pendiente">Pendientes</option><option value="dispensada">Dispensadas</option></select></label>
      <button type="button" onClick={() => setVersion((actual) => actual + 1)}>Actualizar</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {cargando ? <p role="status">Cargando solicitudes…</p> : !error && !visibles.length ? <p className="farmacia-solicitudes-vacio">No hay solicitudes {estado === "pendiente" ? "pendientes" : "dispensadas"}.</p> : visibles.map((pedido) => <article key={pedido.id}>
      <header><div><h3>{pedido.almacen}</h3><small>{pedido.solicitante} · {new Date(pedido.created_at).toLocaleString("es-BO")}</small></div><span>{pedido.estado === "pendiente" ? "Pendiente" : "Dispensada"}</span></header>
      <table><thead><tr><th>Insumo</th><th>Cantidad solicitada</th><th>Unidad</th></tr></thead><tbody>{pedido.detalles.map((detalle) => <tr key={detalle.item_id}><td>{detalle.nombre}</td><td>{detalle.cantidad}</td><td>{detalle.unidad}</td></tr>)}</tbody></table>
      {pedido.observacion && <p>{pedido.observacion}</p>}
      {pedido.estado === "pendiente" && <footer><button type="button" disabled={!origen || Number(origen) === Number(pedido.almacen_destino_id) || !!ocupada || !!error} onClick={() => void dispensar(pedido)}>{ocupada === pedido.id ? "Procesando…" : "Dispensar al almacén solicitante"}</button></footer>}
    </article>)}
  </section>;
}
