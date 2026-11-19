import Icon from "../../radius/componentes/Icono";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { leerSesion } from "../../radius/types/sesion";
import { notificar } from "../../radius/componentes/Notificaciones";
import { opcionesInsumos, stockInsumos, solicitudesInsumos, enviarSolicitudInsumos, type ItemInsumos, type OpcionesInsumos, type StockInsumos, type SolicitudInsumos } from "./insumosEnfermeriaApi";

type InsumosEnfermeriaPanelProps = {
  onUtilizar?: (item: ItemInsumos, cantidad: number, almacenId: number, solicitudId: string) => Promise<boolean>;
  silenciarAlmacenNoAsignado?: boolean;
};

export function InsumosEnfermeriaPanel({ onUtilizar, silenciarAlmacenNoAsignado = false }: InsumosEnfermeriaPanelProps = {}) {
  const claveAlmacen = `enfermeria:almacen:${leerSesion()?.usuario.id || "local"}`;
  const [opciones, setOpciones] = useState<OpcionesInsumos>({ almacenes: [], catalogo: [] });
  const [almacen, setAlmacen] = useState(() => sessionStorage.getItem(claveAlmacen) || "");
  const [estado, setEstado] = useState("activos");
  const [buscarStock, setBuscarStock] = useState("");
  const [seleccionados, setSeleccionados] = useState<{ item: ItemInsumos; cantidad: string }[]>([]);
  const [utilizando, setUtilizando] = useState<number | null>(null);
  const intentosUso = useRef(new Map<number, string>());
  const [stock, setStock] = useState<StockInsumos[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudInsumos[]>([]);
  const [cargando, setCargando] = useState(true), [error, setError] = useState(""), [version, setVersion] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const idSolicitud = useRef(crypto.randomUUID());
  const [lineas, setLineas] = useState<{ item_id: string; cantidad: string }[]>([]);
  const [observacion, setObservacion] = useState(""), [enviando, setEnviando] = useState(false), [errorSolicitud, setErrorSolicitud] = useState("");
  const [servicioSolicitud, setServicioSolicitud] = useState(""), [pacientesSolicitud, setPacientesSolicitud] = useState("");
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
  const resultadosSolicitud = busqueda.trim()
    ? opciones.catalogo.filter((item) =>
        normalizar(`${item.nombre} ${item.codigo || ""} ${item.unidad}`).includes(normalizar(busqueda)) &&
        !lineas.some((linea) => Number(linea.item_id) === item.id),
      ).slice(0, 8)
    : [];
  const pedidosAlmacen = solicitudes.filter((pedido) => Number(pedido.almacen_destino_id) === Number(almacen));
  const abrir = () => {
    idSolicitud.current = crypto.randomUUID(); setLineas([]); setObservacion(""); setServicioSolicitud(""); setPacientesSolicitud(""); setBusqueda(""); setErrorSolicitud(""); modal.current?.showModal();
  };
  const agregarSeleccionado = (item: ItemInsumos) => {
    setSeleccionados((actuales) =>
      actuales.some((seleccionado) => seleccionado.item.id === item.id)
        ? actuales
        : [...actuales, { item, cantidad: "1" }],
    );
    setBuscarStock("");
  };
  const agregarASolicitud = (item: ItemInsumos) => {
    if (lineas.length >= 30) return;
    setLineas((actuales) => actuales.some((linea) => Number(linea.item_id) === item.id)
      ? actuales
      : [...actuales, { item_id: String(item.id), cantidad: "1" }]);
    setBusqueda("");
    setErrorSolicitud("");
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
    if (!almacen) {
      notificar("advertencia", "Almacén no seleccionado", "Selecciona un almacén autorizado para descontar el insumo.");
      return;
    }
    const solicitudId = intentosUso.current.get(item.id) || crypto.randomUUID();
    intentosUso.current.set(item.id, solicitudId);
    setUtilizando(item.id);
    try {
      if (await onUtilizar(item, cantidadNumerica, Number(almacen), solicitudId)) {
        intentosUso.current.delete(item.id);
        setSeleccionados((actuales) => actuales.filter((seleccionado) => seleccionado.item.id !== item.id));
        window.dispatchEvent(new Event("enfermeria:stock-actualizado"));
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
      if (!almacen || !servicioSolicitud.trim() || !lineas.length || lineas.some((linea) => !linea.item_id || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0) || new Set(lineas.map((linea) => linea.item_id)).size !== lineas.length) throw new Error("Indica el servicio y agrega al menos un insumo con cantidad válida.");
      const pacientes = pacientesSolicitud.split(/[\n,;]+/).map((paciente) => paciente.trim()).filter(Boolean);
      await enviarSolicitudInsumos({ id: idSolicitud.current, almacen_destino_id: Number(almacen), servicio: servicioSolicitud.trim(), pacientes, detalles: lineas.map((linea) => ({ item_id: Number(linea.item_id), cantidad: Number(linea.cantidad) })), observacion });
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
        {opciones.almacenes.length > 1 && <label className="em-insumos-filtro">Almacén
          <select value={almacen} onChange={(evento) => setAlmacen(evento.target.value)}>
            <option value="">Seleccionar almacén</option>
            {opciones.almacenes.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre} · {opcion.sucursal}</option>)}
          </select>
        </label>}
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
      {!silenciarAlmacenNoAsignado && !cargando && !error && !opciones.almacenes.length && <p className="em-pendiente">No tienes almacenes asignados. Solicita la asignación de tu almacén a Administración.</p>}
      <div className="em-insumos-enfermeria-tabla">
        <table>
          <thead><tr><th scope="col">Insumo</th><th scope="col">Cantidad</th><th scope="col">Unidad</th><th scope="col">Acción</th></tr></thead>
          <tbody>{seleccionados.map(({ item, cantidad }) => <tr key={item.id}>
            <td><strong>{item.nombre}</strong><small>{item.codigo}</small></td>
            <td><input className="em-insumos-cantidad" type="number" min="0.001" step="0.001" value={cantidad} aria-label={`Cantidad de ${item.nombre}`} onChange={(evento) => setSeleccionados((actuales) => actuales.map((seleccionado) => seleccionado.item.id === item.id ? { ...seleccionado, cantidad: evento.target.value } : seleccionado))} /></td>
            <td>{item.unidad}</td>
            <td><button className="em-insumos-utilizar" type="button" disabled={utilizando === item.id} onClick={() => void utilizarSeleccionado(item, cantidad)}>{utilizando === item.id ? "Registrando…" : "Utilizar"}</button></td>
          </tr>)}
            {!seleccionados.length && !(silenciarAlmacenNoAsignado && !cargando && !error && !almacen) && <tr><td colSpan={4} className="em-insumos-enfermeria-vacio">{cargando ? "Cargando stock…" : error ? "No se pudo consultar el stock." : !almacen ? "No hay un almacén definido para esta sesión." : visibles.length ? "Busca un insumo y selecciónalo para añadirlo a la lista." : `No hay insumos ${estado} en este almacén.`}</td></tr>}
          </tbody>
        </table>
      </div>
      {!!pedidosAlmacen.length && <details className="em-insumos-solicitudes"><summary>Solicitudes a Farmacia · {pedidosAlmacen.filter((pedido) => pedido.estado === "pendiente").length} pendientes</summary>
        {pedidosAlmacen.map((pedido) => <article key={pedido.id}><div><strong>{pedido.detalles.map((detalle) => `${detalle.nombre} (${detalle.cantidad} ${detalle.unidad})`).join(", ")}</strong><small>{new Date(pedido.created_at).toLocaleString("es-BO")}</small></div><span>{pedido.estado === "pendiente" ? "Pendiente de Farmacia" : "Dispensada"}</span></article>)}
      </details>}
      <dialog ref={modal} className="em-insumos-solicitud-modal" onCancel={(evento) => { if (enviando) evento.preventDefault(); }}>
        <form onSubmit={enviar}>
          <header><div><h3>Solicitar descargo a Farmacia</h3>{almacen && <p>Destino: {opciones.almacenes.find((a) => String(a.id) === almacen)?.nombre}</p>}</div><button type="button" disabled={enviando} aria-label="Cerrar solicitud" onClick={() => modal.current?.close()}>×</button></header>
          {!almacen && !silenciarAlmacenNoAsignado && <p role="status" className="em-insumos-solicitud-aviso">No tienes un almacén de destino asignado. Puedes preparar la lista, pero necesitarás que Administración te asigne un almacén para enviar la solicitud.</p>}
          {!opciones.catalogo.length && <p role="status" className="em-insumos-solicitud-aviso">No hay insumos disponibles en el catálogo para solicitar.</p>}
          <div className="em-insumos-solicitud-buscador">
            <label htmlFor="em-insumos-solicitud-busqueda">Buscar insumos para agregar</label>
            <div className="em-insumos-solicitud-campo-busqueda"><Icon name="search" size={17} /><input id="em-insumos-solicitud-busqueda" type="search" disabled={enviando || lineas.length >= 30 || !opciones.catalogo.length} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Escribe el nombre, código o unidad" /></div>
            {!!resultadosSolicitud.length && <div className="em-insumos-solicitud-resultados" role="listbox" aria-label="Resultados para agregar a la solicitud">
              {resultadosSolicitud.map((item) => <button key={item.id} type="button" role="option" aria-selected="false" disabled={enviando} onClick={() => agregarASolicitud(item)}>
                <span><strong>{item.nombre}</strong><small>{item.codigo || "Sin código"} · {item.unidad}</small></span><b>+ Agregar</b>
              </button>)}
            </div>}
            {busqueda.trim() && !resultadosSolicitud.length && <p className="em-insumos-solicitud-sin-resultados">{lineas.length >= 30 ? "La solicitud permite hasta 30 insumos." : "No hay insumos disponibles que coincidan con la búsqueda."}</p>}
          </div>
          <section className="em-insumos-solicitud-seleccionados" aria-label="Insumos seleccionados">
            <header><div><h4>Insumos solicitados</h4><small>{lineas.length} de 30 seleccionados</small></div></header>
            {lineas.length ? <div className="em-insumos-solicitud-lineas">{lineas.map((linea) => {
              const item = opciones.catalogo.find((opcion) => String(opcion.id) === linea.item_id);
              if (!item) return null;
              return <article key={linea.item_id}>
                <div className="em-insumos-solicitud-producto"><strong>{item.nombre}</strong><small>{item.codigo || "Sin código"} · {item.unidad}</small></div>
                <label>Cantidad<input required disabled={enviando} type="number" min="0.001" max="100000" step="0.001" value={linea.cantidad} aria-label={`Cantidad de ${item.nombre}`} onChange={(evento) => setLineas((actuales) => actuales.map((actual) => actual.item_id === linea.item_id ? { ...actual, cantidad: evento.target.value } : actual))} /></label>
                <button type="button" disabled={enviando} aria-label={`Quitar ${item.nombre}`} onClick={() => setLineas((actuales) => actuales.filter((actual) => actual.item_id !== linea.item_id))}>Quitar</button>
              </article>;
            })}</div> : <p className="em-insumos-solicitud-lista-vacia">Busca un insumo y elige “Agregar”. Aquí podrás indicar la cantidad antes de enviar.</p>}
          </section>
          <div className="em-insumos-solicitud-contexto"><label>Servicio solicitante<input required maxLength={120} disabled={enviando} value={servicioSolicitud} onChange={(evento) => setServicioSolicitud(evento.target.value)} placeholder="Ej. Emergencias, Pediatría, UCI" /></label><label>Pacientes para quienes se solicita<textarea maxLength={1000} disabled={enviando} value={pacientesSolicitud} onChange={(evento) => setPacientesSolicitud(evento.target.value)} placeholder="Nombres separados por coma o línea" /></label></div>
          <label>Observación<textarea maxLength={1000} disabled={enviando} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} placeholder="Motivo de la reposición (opcional)" /></label>
          <p>La solicitud quedará pendiente. El stock se actualizará después de que Farmacia dispense los insumos.</p>
          {errorSolicitud && <p role="alert" className="em-error">{errorSolicitud}</p>}
          <footer><button type="button" disabled={enviando} onClick={() => modal.current?.close()}>Cancelar</button><button type="submit" className="em-primario" disabled={enviando || !almacen || !servicioSolicitud.trim() || !lineas.length || !opciones.catalogo.length}>{enviando ? "Enviando…" : "Enviar solicitud"}</button></footer>
        </form>
      </dialog>
    </section>
  );
}
