import { useEffect, useState } from "react";
import { confirmar, notificar } from "../../radius/componentes/Notificaciones";
import { opcionesInsumos, solicitudesInsumos, dispensarSolicitudInsumos, anularSolicitudInsumos, type AlmacenInsumos, type SolicitudInsumos } from "../emergencias/insumosEnfermeriaApi";
import "./SolicitudesEnfermeriaView.css";

export function SolicitudesEnfermeriaView({ descargos = false, historial = false }: { descargos?: boolean; historial?: boolean }) {
  const [almacenes, setAlmacenes] = useState<AlmacenInsumos[]>([]);
  const [origen, setOrigen] = useState("");
  const [solicitudes, setSolicitudes] = useState<SolicitudInsumos[]>([]);
  const [estado, setEstado] = useState("pendiente");
  const estadoVisible = descargos ? historial ? "todos" : "pendiente" : estado;
  const [error, setError] = useState(""), [cargando, setCargando] = useState(true), [ocupada, setOcupada] = useState("");
  const [version, setVersion] = useState(0);
  const [pagina, setPagina] = useState(1), [ultimaPagina, setUltimaPagina] = useState(1), [totalRegistros, setTotalRegistros] = useState(0);
  useEffect(() => {
    let vigente = true, leyendo = false;
    const cargar = async () => {
      if (leyendo) return;
      leyendo = true;
      try {
        const [opciones, pedidos] = await Promise.all([opcionesInsumos(), solicitudesInsumos(true, pagina)]);
        if (vigente) { setAlmacenes(opciones.almacenes); setSolicitudes(pedidos.data); setUltimaPagina(pedidos.last_page || 1); setPagina((actual) => Math.min(actual, pedidos.last_page || 1)); setTotalRegistros(pedidos.total ?? pedidos.data.length); setOrigen((actual) => opciones.almacenes.some((a) => String(a.id) === actual) ? actual : opciones.almacenes.length === 1 ? String(opciones.almacenes[0].id) : ""); setError(""); }
      } catch (fallo) { if (vigente) setError(fallo instanceof Error ? fallo.message : "No se pudieron consultar las solicitudes."); }
      finally { leyendo = false; if (vigente) setCargando(false); }
    };
    void cargar();
    const timer = window.setInterval(cargar, 5000);
    window.addEventListener("enfermeria:stock-actualizado", cargar);
    window.addEventListener("storage", cargar);
    return () => { vigente = false; window.clearInterval(timer); window.removeEventListener("enfermeria:stock-actualizado", cargar); window.removeEventListener("storage", cargar); };
  }, [version, pagina]);
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
  const anular = async (pedido: SolicitudInsumos) => {
    if (ocupada) return;
    setOcupada(pedido.id);
    try {
      if (!await confirmar({ titulo: "Anular solicitud", mensaje: `La solicitud de ${pedido.almacen} quedará anulada. No se modificará el stock.`, textoConfirmar: "Anular solicitud" })) return;
      await anularSolicitudInsumos(pedido.id);
      setVersion((actual) => actual + 1);
      notificar("exito", "Solicitud anulada", "La solicitud quedó registrada en el historial.");
    } catch (fallo) { notificar("error", "No se pudo anular", fallo instanceof Error ? fallo.message : "Intenta nuevamente."); }
    finally { setOcupada(""); }
  };
  const visibles = solicitudes.filter((pedido) => estadoVisible === "todos" || pedido.estado === estadoVisible);
  return <section className="farmacia-solicitudes-enfermeria" aria-label="Solicitudes de insumos de enfermería">
    {!descargos && <header><div><h2>Solicitudes de enfermería</h2><p>Dispensa desde tu almacén de Farmacia y transfiere el stock al almacén solicitante.</p></div><span>{visibles.length} solicitudes</span></header>}
    <div className="farmacia-solicitudes-filtros">
      {!historial && <label>Almacén de origen<select value={origen} onChange={(evento) => setOrigen(evento.target.value)} disabled={!!ocupada}><option value="">Seleccionar almacén de Farmacia</option>{almacenes.map((almacen) => <option value={almacen.id} key={almacen.id}>{almacen.nombre} · {almacen.sucursal}</option>)}</select></label>}
      {!descargos && <label>Estado<select value={estado} onChange={(evento) => setEstado(evento.target.value)}><option value="todos">Todos los estados</option><option value="pendiente">Pendientes</option><option value="dispensada">Dispensadas</option><option value="anulada">Anuladas</option></select></label>}
      <button type="button" onClick={() => setVersion((actual) => actual + 1)}>Actualizar</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {cargando ? <p role="status">Cargando solicitudes…</p> : !error && !visibles.length ? <p className="farmacia-solicitudes-vacio">{historial ? "Aún no hay registros en el historial." : descargos || estado === "pendiente" ? "No hay solicitudes pendientes." : estado === "anulada" ? "No hay solicitudes anuladas." : "No hay solicitudes dispensadas."}</p> : <div className="farmacia-solicitudes-tabla-scroll"><table className="farmacia-solicitudes-tabla"><thead><tr><th>Solicitante</th><th>Cantidad solicitada</th><th>Servicio / destino</th><th>Pacientes</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visibles.map((pedido) => <tr key={pedido.id}>
      <td><strong>{pedido.solicitante}</strong></td>
      <td><div className="farmacia-solicitudes-items"><strong>{pedido.detalles.length} insumos solicitados</strong>{pedido.detalles.map((detalle) => <span key={detalle.item_id}>{detalle.nombre}: {detalle.cantidad} {detalle.unidad}</span>)}</div></td>
      <td>{pedido.servicio || pedido.almacen}</td>
      <td>{pedido.pacientes?.length ? pedido.pacientes.join(", ") : <span className="farmacia-solicitudes-sin-dato">No especificados</span>}</td>
      <td>{new Date(pedido.created_at).toLocaleString("es-BO")}</td>
      <td><span className={`farmacia-solicitudes-estado ${pedido.estado}`}>{pedido.estado === "pendiente" ? "Pendiente" : pedido.estado === "anulada" ? "Anulada" : "Dispensada"}</span>{pedido.dispensado_en && <small className="farmacia-solicitudes-fecha-dispensacion">Dispensada: {new Date(pedido.dispensado_en).toLocaleString("es-BO")}</small>}{pedido.anulada_en && <small className="farmacia-solicitudes-fecha-dispensacion">Anulada: {new Date(pedido.anulada_en).toLocaleString("es-BO")}</small>}</td>
      <td>{historial ? <span className="farmacia-solicitudes-sin-dato">Registro</span> : pedido.estado === "pendiente" ? <div className="farmacia-solicitudes-acciones"><button type="button" disabled={!origen || Number(origen) === Number(pedido.almacen_destino_id) || !!ocupada || !!error} onClick={() => void dispensar(pedido)}>{ocupada === pedido.id ? "Procesando…" : "Dispensar"}</button><button className="secundario" type="button" disabled={!!ocupada} onClick={() => void anular(pedido)}>{ocupada === pedido.id ? "Procesando…" : "Anular"}</button></div> : <span className="farmacia-solicitudes-sin-dato">—</span>}</td>
    </tr>)}</tbody></table></div>}
    {historial && <nav className="farmacia-solicitudes-paginacion" aria-label="Paginación del historial"><span>{totalRegistros} registros · Página {pagina} de {ultimaPagina}</span><div><button type="button" disabled={pagina <= 1 || cargando} onClick={() => setPagina((actual) => Math.max(1, actual - 1))}>Anterior</button><button type="button" disabled={pagina >= ultimaPagina || cargando} onClick={() => setPagina((actual) => Math.min(ultimaPagina, actual + 1))}>Siguiente</button></div></nav>}
  </section>;
}
