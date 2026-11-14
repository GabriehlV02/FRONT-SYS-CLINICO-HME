import Icon from "../../radius/componentes/Icono";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { leerSesion } from "../../radius/types/sesion";
import { notificar } from "../../radius/componentes/Notificaciones";
import { opcionesInsumos, stockInsumos, solicitudesInsumos, enviarSolicitudInsumos, type ItemInsumos, type OpcionesInsumos, type StockInsumos, type SolicitudInsumos } from "./insumosEnfermeriaApi";

type InsumosEnfermeriaPanelProps = {
  onUtilizar?: (item: ItemInsumos, cantidad: number) => Promise<boolean>;
};

export function InsumosEnfermeriaPanel({ onUtilizar }: InsumosEnfermeriaPanelProps = {}) {
  const claveAlmacen = `enfermeria:almacen:${leerSesion()?.usuario.id || "local"}`;
  const [opciones, setOpciones] = useState<OpcionesInsumos>({ almacenes: [], catalogo: [] });
  const [almacen, setAlmacen] = useState(() => sessionStorage.getItem(claveAlmacen) || "");
  const [estado, setEstado] = useState("activos");
  const [buscarStock, setBuscarStock] = useState("");
  const [seleccionados, setSeleccionados] = useState<{ item: ItemInsumos; cantidad: string }[]>([]);
  const [utilizando, setUtilizando] = useState<number | null>(null);
  const [stock, setStock] = useState<StockInsumos[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudInsumos[]>([]);
  const [cargando, setCargando] = useState(true), [error, setError] = useState(""), [version, setVersion] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const idSolicitud = useRef(crypto.randomUUID());
  const [lineas, setLineas] = useState([{ item_id: "", cantidad: "1" }]);
  const [observacion, setObservacion] = useState(""), [enviando, setEnviando] = useState(false), [errorSolicitud, setErrorSolicitud] = useState("");
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    void opcionesInsumos().then((datos) => {
      if (!vigente) return;
      setOpciones(datos);
      setAlmacen((actual) => datos.almacenes.some((a) => String(a.id) === actual) ? actual : datos.almacenes.length === 1 ? String(datos.almacenes[0].id) : "");
      setError("");
    }).catch((fallo: Error) => { if (vigente) setError(fallo.message); }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [version]);
  useEffect(() => {
    setStock([]);
    setSolicitudes([]);
    if (!almacen) return;
    sessionStorage.setItem(claveAlmacen, almacen);
    let vigente = true, leyendo = false;
    const cargar = async () => {
      if (leyendo) return;
      leyendo = true;
      try {
        const [existencias, pedidos] = await Promise.all([stockInsumos(Number(almacen)), solicitudesInsumos()]);
        if (vigente) { setStock(existencias.data); setSolicitudes(pedidos.data); setError(""); }
      } catch (fallo) { if (vigente) setError(fallo instanceof Error ? fallo.message : "No se pudo actualizar el stock."); }
      finally { leyendo = false; if (vigente) setCargando(false); }
    };
    setCargando(true);
    void cargar();
    const timer = window.setInterval(cargar, 5000);
    window.addEventListener("enfermeria:stock-actualizado", cargar);
    window.addEventListener("storage", cargar);
    return () => { vigente = false; window.clearInterval(timer); window.removeEventListener("enfermeria:stock-actualizado", cargar); window.removeEventListener("storage", cargar); };
  }, [almacen, claveAlmacen, version]);
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  const visibles = stock.filter((item) =>
    (item.estado === "ACTIVO" && item.estado_producto === "ACTIVO") === (estado === "activos") &&
    normalizar(`${item.nombre} ${item.codigo || ""} ${item.unidad}`).includes(normalizar(buscarStock)),
  );
  const resultadosBusqueda = buscarStock.trim()
    ? opciones.catalogo.filter((item) =>
        normalizar(`${item.nombre} ${item.codigo || ""} ${item.unidad}`).includes(normalizar(buscarStock)) &&
        !seleccionados.some((seleccionado) => seleccionado.item.id === item.id),
      )
    : [];
  const pedidosAlmacen = solicitudes.filter((pedido) => Number(pedido.almacen_destino_id) === Number(almacen));
  const abrir = () => {
    idSolicitud.current = crypto.randomUUID(); setLineas([{ item_id: "", cantidad: "1" }]); setObservacion(""); setBusqueda(""); setErrorSolicitud(""); modal.current?.showModal();
  };
  const agregarSeleccionado = (item: ItemInsumos) => {
    setSeleccionados((actuales) =>
      actuales.some((seleccionado) => seleccionado.item.id === item.id)
        ? actuales
        : [...actuales, { item, cantidad: "1" }],
    );
    setBuscarStock("");
  };
  const utilizarSeleccionado = async (item: ItemInsumos, cantidad: string) => {
    const cantidadNumerica = Number(cantidad);
    if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
      notificar("advertencia", "Cantidad no válida", "Escribe una cantidad mayor que cero.");
      return;
    }
    if (!onUtilizar) {
      notificar("advertencia", "Atención no seleccionada", "Abre los insumos desde la atención del paciente para registrar su uso.");
      return;
    }
    setUtilizando(item.id);
    try {
      if (await onUtilizar(item, cantidadNumerica)) {
        setSeleccionados((actuales) => actuales.filter((seleccionado) => seleccionado.item.id !== item.id));
      }
    } finally {
      setUtilizando(null);
    }
  };
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true); setErrorSolicitud("");
    try {
      if (!almacen || lineas.some((linea) => !linea.item_id || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0) || new Set(lineas.map((linea) => linea.item_id)).size !== lineas.length) throw new Error("Selecciona insumos diferentes y cantidades mayores que cero.");
      await enviarSolicitudInsumos({ id: idSolicitud.current, almacen_destino_id: Number(almacen), detalles: lineas.map((linea) => ({ item_id: Number(linea.item_id), cantidad: Number(linea.cantidad) })), observacion });
      modal.current?.close(); setVersion((actual) => actual + 1);
      notificar("exito", "Solicitud enviada a Farmacia", "Las cantidades se sumarán a tu almacén cuando Farmacia confirme la dispensación.");
    } catch (fallo) { setErrorSolicitud(fallo instanceof Error ? fallo.message : "No se pudo enviar la solicitud."); }
    finally { setEnviando(false); }
  };
  return (
    <section className="em-panel em-insumos-enfermeria" aria-labelledby="em-insumos-enfermeria-titulo">
      <header className="em-panel-titulo">
        <div>
          <h3 id="em-insumos-enfermeria-titulo">Insumos de enfermería</h3>
        </div>
      </header>
      <div className="em-insumos-enfermeria-herramientas">
        <div className="em-insumos-buscar-contenedor">
          <label className="em-insumos-buscar">
            Buscar insumo
            <span><Icon name="search" size={16} /><input type="search" value={buscarStock} onChange={(evento) => setBuscarStock(evento.target.value)} placeholder="Nombre, código o unidad" /></span>
          </label>
          {!!resultadosBusqueda.length && (
            <div className="em-insumos-resultados" role="listbox" aria-label="Resultados de insumos">
              {resultadosBusqueda.slice(0, 8).map((item) => (
                <button key={item.id} type="button" role="option" aria-selected="false" onClick={() => agregarSeleccionado(item)}>
                  <span><strong>{item.nombre}</strong><small>{item.codigo} · {item.unidad}</small></span>
                  <b>Añadir</b>
                </button>
              ))}
            </div>
          )}
          {buscarStock.trim() && !resultadosBusqueda.length && (
            <div className="em-insumos-resultados em-insumos-resultados-vacio">No hay insumos que coincidan con la búsqueda.</div>
          )}
        </div>
        <label className="em-insumos-filtro">
          Filtro
          <select value={estado} onChange={(evento) => setEstado(evento.target.value)}>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </label>
        <button type="button" className="em-primario" onClick={abrir}>
          <Icon name="package" size={16} /> Solicitar descargo
        </button>
      </div>
      {error && <p role="alert" className="em-error">{error} <button type="button" onClick={() => setVersion((actual) => actual + 1)}>Reintentar</button></p>}
      {!cargando && !error && !opciones.almacenes.length && <p className="em-pendiente">No tienes almacenes asignados. Solicita la asignación de tu almacén a Administración.</p>}
      <div className="em-insumos-enfermeria-tabla">
        <table>
          <thead><tr><th scope="col">Insumo</th><th scope="col">Cantidad</th><th scope="col">Unidad</th><th scope="col">Acción</th></tr></thead>
          <tbody>{seleccionados.map(({ item, cantidad }) => <tr key={item.id}>
            <td><strong>{item.nombre}</strong><small>{item.codigo}</small></td>
            <td><input className="em-insumos-cantidad" type="number" min="0.001" step="0.001" value={cantidad} aria-label={`Cantidad de ${item.nombre}`} onChange={(evento) => setSeleccionados((actuales) => actuales.map((seleccionado) => seleccionado.item.id === item.id ? { ...seleccionado, cantidad: evento.target.value } : seleccionado))} /></td>
            <td>{item.unidad}</td>
            <td><button className="em-insumos-utilizar" type="button" disabled={utilizando === item.id} onClick={() => void utilizarSeleccionado(item, cantidad)}>{utilizando === item.id ? "Registrando…" : "Utilizar"}</button></td>
          </tr>)}
            {!seleccionados.length && <tr><td colSpan={4} className="em-insumos-enfermeria-vacio">{cargando ? "Cargando stock…" : error ? "No se pudo consultar el stock." : !almacen ? "No hay un almacén definido para esta sesión." : visibles.length ? "Busca un insumo y selecciónalo para añadirlo a la lista." : `No hay insumos ${estado} en este almacén.`}</td></tr>}
          </tbody>
        </table>
      </div>
      {!!pedidosAlmacen.length && <details className="em-insumos-solicitudes"><summary>Solicitudes a Farmacia · {pedidosAlmacen.filter((pedido) => pedido.estado === "pendiente").length} pendientes</summary>
        {pedidosAlmacen.map((pedido) => <article key={pedido.id}><div><strong>{pedido.detalles.map((detalle) => `${detalle.nombre} (${detalle.cantidad} ${detalle.unidad})`).join(", ")}</strong><small>{new Date(pedido.created_at).toLocaleString("es-BO")}</small></div><span>{pedido.estado === "pendiente" ? "Pendiente de Farmacia" : "Dispensada"}</span></article>)}
      </details>}
      <dialog ref={modal} className="em-insumos-solicitud-modal" onCancel={(evento) => { if (enviando) evento.preventDefault(); }}>
        <form onSubmit={enviar}>
          <header><div><h3>Solicitar descargo a Farmacia</h3>{almacen && <p>Destino: {opciones.almacenes.find((a) => String(a.id) === almacen)?.nombre}</p>}</div><button type="button" disabled={enviando} aria-label="Cerrar solicitud" onClick={() => modal.current?.close()}>×</button></header>
          {!almacen ? (
            <>
              <div className="em-insumos-solicitud-vacia" aria-label="Solicitud vacía" />
              <footer>
                <button type="button" onClick={() => modal.current?.close()}>Cerrar</button>
              </footer>
            </>
          ) : (
            <>
          <label>Buscar insumo<input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre o código del catálogo" /></label>
          <div className="em-insumos-solicitud-lineas">{lineas.map((linea, indice) => <div key={indice}>
            <label>Insumo<select required disabled={enviando} value={linea.item_id} onChange={(evento) => setLineas((actuales) => actuales.map((actual, i) => i === indice ? { ...actual, item_id: evento.target.value } : actual))}><option value="">Seleccionar insumo</option>{opciones.catalogo.filter((item) => String(item.id) === linea.item_id || `${item.nombre} ${item.codigo}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.unidad}</option>)}</select></label>
            <label>Cantidad<input required disabled={enviando} type="number" min="0.001" max="100000" step="0.001" value={linea.cantidad} onChange={(evento) => setLineas((actuales) => actuales.map((actual, i) => i === indice ? { ...actual, cantidad: evento.target.value } : actual))} /></label>
            <button type="button" disabled={lineas.length === 1 || enviando} aria-label={`Quitar insumo ${indice + 1}`} onClick={() => setLineas((actuales) => actuales.filter((_, i) => i !== indice))}>Quitar</button>
          </div>)}</div>
          <button type="button" disabled={lineas.length >= 30 || enviando} onClick={() => setLineas((actuales) => [...actuales, { item_id: "", cantidad: "1" }])}>+ Añadir insumo</button>
          <label>Observación<textarea maxLength={1000} disabled={enviando} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} placeholder="Motivo de la reposición (opcional)" /></label>
          <p>La solicitud quedará pendiente. El stock se actualizará después de que Farmacia dispense los insumos.</p>
          {errorSolicitud && <p role="alert" className="em-error">{errorSolicitud}</p>}
          <footer><button type="button" disabled={enviando} onClick={() => modal.current?.close()}>Cancelar</button><button type="submit" className="em-primario" disabled={enviando || !opciones.catalogo.length}>{enviando ? "Enviando…" : "Enviar solicitud"}</button></footer>
            </>
          )}
        </form>
      </dialog>
    </section>
  );
}
