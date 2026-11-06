import { useEffect, useState } from "react";
import { apiFetch } from "../../radius/api";
import Icon, { type IconName } from "../../radius/componentes/Icono";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";
import { ReportesFarmaciaView } from "./ReportesFarmaciaView";
import "../recepcion/RecepcionView.css";
import "../cocina/CocinaVentasView.css";
import "./AdministracionFarmaciaView.css";

type SucursalFarmacia = { id: number; nombre: string };
type AlmacenFarmacia = { id: number; nombre: string };
type ExistenciaFarmacia = {
  id: number;
  nombre: string;
  codigo: string;
  unidad: string;
  disponible: number;
  minimo: number | null;
};
type Vista =
  | "items-venta"
  | "almacen"
  | "movimientos"
  | "ventas"
  | "ingresos"
  | "reportes"
  | "configuracion";
const subvistas: {
  id: Vista;
  nombre: string;
  icono: IconName;
  descripcion: string;
}[] = [
  {
    id: "items-venta",
    nombre: "Ítems de venta",
    icono: "package",
    descripcion: "Catálogo disponible para la dispensación.",
  },
  {
    id: "almacen",
    nombre: "Almacén",
    icono: "building",
    descripcion: "Existencias y niveles de stock.",
  },
  {
    id: "movimientos",
    nombre: "Movimientos",
    icono: "audit",
    descripcion: "Kardex y trazabilidad de inventario.",
  },
  {
    id: "ventas",
    nombre: "Ventas",
    icono: "asset",
    descripcion: "Ventas y comprobantes de farmacia.",
  },
  {
    id: "ingresos",
    nombre: "Ingresos",
    icono: "package",
    descripcion: "Recepción y alta de productos.",
  },
  {
    id: "reportes",
    nombre: "Reportes",
    icono: "fileText",
    descripcion: "Ventas y descargos por período.",
  },
  {
    id: "configuracion",
    nombre: "Configuración",
    icono: "settings",
    descripcion: "Parámetros operativos del área.",
  },
];
export function AdministracionFarmaciaView() {
  const [subvista, setSubvista] = useState<Vista>("almacen");
  const navegacion = (
    <HorizontalSubvistaNav
      className="recepcion-subvistas"
      ariaLabel="Subvistas de Administración Farmacia"
    >
      {subvistas.map((item) => (
        <button
          key={item.id}
          className={subvista === item.id ? "activo" : ""}
          onClick={() => setSubvista(item.id)}
        >
          <span>
            <Icon name={item.icono} size={17} />
          </span>
          <strong>{item.nombre}</strong>
          <small>{item.descripcion}</small>
        </button>
      ))}
    </HorizontalSubvistaNav>
  );
  return (
    <section className="recepcion-vista farmacia-admin-vista">
      <div className="cocina-subvista-cabecera">{navegacion}</div>
      {subvista === "items-venta" && <ItemsVenta />}
      {subvista === "almacen" && <Almacen />}
      {subvista === "movimientos" && <Movimientos />}
      {subvista === "ventas" && <Ventas />}
      {subvista === "ingresos" && <Ingresos />}
      {subvista === "reportes" && <ReportesFarmaciaView />}
      {subvista === "configuracion" && <Configuracion />}
    </section>
  );
}
function Vacio({
  icono,
  titulo,
  detalle,
}: {
  icono: IconName;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="cocina-vacio">
      <Icon name={icono} size={27} />
      <strong>{titulo}</strong>
      <small>{detalle}</small>
    </div>
  );
}
function ItemsVenta() {
  return (
    <section className="cocina-subvista">
      <header>
        <div>
          <p>Ítems de venta</p>
          <h2>Catálogo de farmacia</h2>
          <small>
            Administra los productos disponibles para dispensación y venta.
          </small>
        </div>
        <button>
          <Icon name="plus" size={16} /> Nuevo producto
        </button>
      </header>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Código</th>
            <th>Presentación</th>
            <th>Precio</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5}>
              <Vacio
                icono="package"
                titulo="No hay productos para mostrar"
                detalle="Los productos habilitados para venta aparecerán en este catálogo."
              />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
function Almacen() {
  const [sucursales, setSucursales] = useState<SucursalFarmacia[]>([]);
  const [sucursalId, setSucursalId] = useState("");
  const [almacenes, setAlmacenes] = useState<AlmacenFarmacia[]>([]);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<
    string[]
  >([]);
  const [existencias, setExistencias] = useState<ExistenciaFarmacia[]>([]);
  const [cargandoSucursales, setCargandoSucursales] = useState(true);
  const [cargandoAlmacenes, setCargandoAlmacenes] = useState(false);
  const [cargandoExistencias, setCargandoExistencias] = useState(false);
  const [error, setError] = useState("");
  const idsSeleccionados = almacenesSeleccionados.join(",");

  useEffect(() => {
    const controlador = new AbortController();
    void apiFetch("/api/farmacia/tomi/sucursales", {
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(
            datos.message || "No se pudieron cargar las sucursales.",
          );
        const lista: SucursalFarmacia[] = datos.data || [];
        setSucursales(lista);
        setSucursalId((actual) => actual || String(lista[0]?.id || ""));
      })
      .catch((error) => {
        if (!controlador.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las sucursales.",
          );
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoSucursales(false);
      });
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (!sucursalId) {
      setAlmacenes([]);
      setAlmacenesSeleccionados([]);
      setExistencias([]);
      return;
    }
    const controlador = new AbortController();
    setCargandoAlmacenes(true);
    setAlmacenes([]);
    setAlmacenesSeleccionados([]);
    setExistencias([]);
    setError("");
    void apiFetch("/api/farmacia/tomi/sucursales/" + sucursalId, {
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(
            datos.message || "No se pudieron cargar los almacenes.",
          );
        const lista: AlmacenFarmacia[] = datos.data?.almacenes || [];
        setAlmacenes(lista);
        setAlmacenesSeleccionados(lista.map((item) => String(item.id)));
      })
      .catch((error) => {
        if (!controlador.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los almacenes.",
          );
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoAlmacenes(false);
      });
    return () => controlador.abort();
  }, [sucursalId]);

  useEffect(() => {
    if (!sucursalId || !almacenesSeleccionados.length) {
      setExistencias([]);
      return;
    }
    const controlador = new AbortController();
    const parametros = new URLSearchParams({ sucursal_id: sucursalId });
    almacenesSeleccionados.forEach((id) =>
      parametros.append("almacenes[]", id),
    );
    setCargandoExistencias(true);
    setError("");
    void apiFetch(
      "/api/v1/farmacia/almacen/existencias?" + parametros.toString(),
      { signal: controlador.signal },
    )
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(
            datos.message || "No se pudieron consultar las existencias.",
          );
        setExistencias(datos.data || []);
      })
      .catch((error) => {
        if (!controlador.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron consultar las existencias.",
          );
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoExistencias(false);
      });
    return () => controlador.abort();
  }, [sucursalId, idsSeleccionados]);

  const alternarAlmacen = (id: string) =>
    setAlmacenesSeleccionados((actual) =>
      actual.includes(id)
        ? actual.filter((item) => item !== id)
        : [...actual, id],
    );
  const seleccionarTodos = () =>
    setAlmacenesSeleccionados((actual) =>
      actual.length === almacenes.length
        ? []
        : almacenes.map((item) => String(item.id)),
    );

  return (
    <section className="cocina-subvista farmacia-admin-almacen">
      <header>
        <div>
          <p>ALMACÉN DE FARMACIA</p>
          <h2>Existencias de productos e insumos</h2>
          <small>
            Selecciona una sucursal y uno o varios almacenes para consultar su
            stock combinado.
          </small>
        </div>
      </header>
      <div className="farmacia-admin-almacen-filtros">
        <label className="farmacia-admin-sucursal">
          Sucursal
          <select
            value={sucursalId}
            disabled={cargandoSucursales || !sucursales.length}
            onChange={(evento) => setSucursalId(evento.target.value)}
          >
            <option value="">
              {cargandoSucursales
                ? "Cargando sucursales…"
                : "Selecciona una sucursal"}
            </option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="farmacia-admin-almacenes">
          <legend>
            Almacenes <span>{almacenesSeleccionados.length} seleccionados</span>
          </legend>
          {cargandoAlmacenes ? (
            <small>Cargando almacenes…</small>
          ) : almacenes.length ? (
            <>
              <div className="farmacia-admin-almacenes-lista">
                {almacenes.map((almacen) => (
                  <label key={almacen.id}>
                    <input
                      type="checkbox"
                      checked={almacenesSeleccionados.includes(
                        String(almacen.id),
                      )}
                      onChange={() => alternarAlmacen(String(almacen.id))}
                    />
                    {almacen.nombre}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="farmacia-admin-almacenes-todos"
                onClick={seleccionarTodos}
              >
                {almacenesSeleccionados.length === almacenes.length
                  ? "Quitar selección"
                  : "Seleccionar todos"}
              </button>
            </>
          ) : (
            <small>
              {sucursalId
                ? "Esta sucursal no tiene almacenes activos."
                : "Selecciona una sucursal para ver sus almacenes."}
            </small>
          )}
        </fieldset>
      </div>
      {error && (
        <p className="farmacia-admin-almacen-error" role="alert">
          {error}
        </p>
      )}
      <div className="farmacia-admin-almacen-tabla">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código</th>
              <th>Disponible</th>
              <th>Mínimo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargandoExistencias ? (
              <tr>
                <td colSpan={5} className="farmacia-admin-almacen-mensaje">
                  Consultando existencias…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="farmacia-admin-almacen-mensaje">
                  No se pudieron cargar las existencias.
                </td>
              </tr>
            ) : !almacenesSeleccionados.length ? (
              <tr>
                <td colSpan={5} className="farmacia-admin-almacen-mensaje">
                  Selecciona al menos un almacén para consultar el stock.
                </td>
              </tr>
            ) : existencias.length ? (
              existencias.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nombre}</strong>
                  </td>
                  <td>{item.codigo}</td>
                  <td>
                    {item.disponible.toLocaleString("es-BO")} {item.unidad}
                  </td>
                  <td>
                    {item.minimo === null
                      ? "No definido"
                      : item.minimo + " " + item.unidad}
                  </td>
                  <td>
                    <span
                      className={
                        "farmacia-admin-stock " +
                        (item.disponible > 0 ? "disponible" : "agotado")
                      }
                    >
                      {item.disponible > 0 ? "Disponible" : "Agotado"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="farmacia-admin-almacen-mensaje">
                  No hay existencias en los almacenes seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Movimientos() {
  return (
    <section className="cocina-subvista">
      <header>
        <div>
          <p>MOVIMIENTOS</p>
          <h2>Kardex de farmacia</h2>
          <small>Historial de entradas, salidas, devoluciones y ajustes.</small>
        </div>
        <button>Exportar kardex</button>
      </header>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Responsable</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5}>
              <Vacio
                icono="audit"
                titulo="No hay movimientos registrados"
                detalle="Cada operación de farmacia quedará registrada en este historial."
              />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
function Ventas() {
  return (
    <section className="cocina-subvista">
      <header>
        <div>
          <p>VENTAS</p>
          <h2>Ventas y comprobantes de farmacia</h2>
          <small>
            Resumen de operaciones realizadas desde el punto de venta.
          </small>
        </div>
        <button>Ver ventas del día</button>
      </header>
      <div className="cocina-kpis">
        <article>
          <small>Ventas del día</small>
          <b>Bs 0.00</b>
        </article>
        <article>
          <small>Comprobantes emitidos</small>
          <b>0</b>
        </article>
        <article>
          <small>Ticket promedio</small>
          <b>Bs 0.00</b>
        </article>
      </div>
      <p className="cocina-ayuda">
        Las ventas se originan desde Farmacia y se consolidarán por caja, turno
        y responsable.
      </p>
    </section>
  );
}
function Ingresos() {
  return (
    <section className="cocina-subvista">
      <header>
        <div>
          <p>INGRESOS</p>
          <h2>Recepción de productos</h2>
          <small>
            Registra compras, transferencias y devoluciones al almacén.
          </small>
        </div>
        <button>
          <Icon name="plus" size={16} /> Nuevo ingreso
        </button>
      </header>
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Origen</th>
            <th>Fecha</th>
            <th>Productos</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5}>
              <Vacio
                icono="package"
                titulo="No hay ingresos registrados"
                detalle="Los productos recibidos en farmacia aparecerán aquí."
              />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
function Configuracion() {
  return (
    <section className="cocina-subvista">
      <header>
        <div>
          <p>CONFIGURACIÓN</p>
          <h2>Parámetros de farmacia</h2>
          <small>Define almacén, caja, alertas y responsable del área.</small>
        </div>
      </header>
      <div className="cocina-config">
        <label>
          Almacén principal
          <select>
            <option>Almacén Farmacia Central</option>
          </select>
        </label>
        <label>
          Caja asociada
          <select>
            <option>Caja 02 · Farmacia</option>
          </select>
        </label>
        <label>
          Stock mínimo por defecto
          <input defaultValue="10" type="number" />
        </label>
        <label>
          Responsable
          <input defaultValue="Administrador" />
        </label>
        <button>Guardar configuración</button>
      </div>
    </section>
  );
}
