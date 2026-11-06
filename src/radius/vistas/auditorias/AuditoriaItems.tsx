import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api";
import Icon from "../../componentes/Icono";

type Item = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  categoria?: string;
  stock?: number;
  stockMinimo?: number;
  fechaVencimiento?: string;
};

export default function AuditoriaItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  useEffect(() => {
    void apiFetch("/api/catalogo")
      .then(async (respuesta) => {
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok)
          throw new Error(datos.message || "No se pudo cargar el inventario.");
        setItems(datos.data || []);
      })
      .catch((causa) => setError((causa as Error).message))
      .finally(() => setCargando(false));
  }, []);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const estado = (item: Item) => {
    if (
      item.fechaVencimiento &&
      new Date(`${item.fechaVencimiento}T00:00:00`) < hoy
    )
      return "Vencido";
    if (
      item.stock !== undefined &&
      item.stockMinimo !== undefined &&
      item.stock <= item.stockMinimo
    )
      return "Stock bajo";
    return "Correcto";
  };
  const visibles = useMemo(
    () =>
      items.filter((item) =>
        `${item.nombre} ${item.codigo} ${item.categoria || ""}`
          .toLocaleLowerCase("es")
          .includes(busqueda.toLocaleLowerCase("es")),
      ),
    [items, busqueda],
  );
  const bajos = items.filter((item) => estado(item) === "Stock bajo").length;
  const vencidos = items.filter((item) => estado(item) === "Vencido").length;
  return (
    <section
      className="auditoria-items"
      aria-label="Auditoría de ítems e inventario"
    >
      <div className="auditoria-usuarios-resumen">
        <article>
          <span className="resumen-icono">
            <Icon name="package" size={18} />
          </span>
          <div>
            <small>Ítems auditados</small>
            <strong>{items.length}</strong>
          </div>
        </article>
        <article>
          <span className="resumen-icono">
            <Icon name="audit" size={18} />
          </span>
          <div>
            <small>Stock bajo</small>
            <strong>{bajos}</strong>
          </div>
        </article>
        <article>
          <span className="resumen-icono">
            <Icon name="calendar" size={18} />
          </span>
          <div>
            <small>Vencidos</small>
            <strong>{vencidos}</strong>
          </div>
        </article>
      </div>
      <div className="auditoria-usuarios-herramientas">
        <label className="auditoria-usuarios-busqueda">
          <Icon name="search" size={17} />
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por ítem, código o categoría"
            aria-label="Buscar ítem"
          />
        </label>
      </div>
      {error && (
        <p className="auditorias-error" role="alert">
          {error}
        </p>
      )}
      <div className="auditoria-usuarios-tabla" role="table">
        <div className="auditoria-items-fila encabezado" role="row">
          <span>Ítem</span>
          <span>Tipo</span>
          <span>Existencia</span>
          <span>Mínimo</span>
          <span>Estado</span>
        </div>
        {cargando ? (
          <div className="auditoria-usuarios-vacio">Cargando inventario…</div>
        ) : visibles.length ? (
          visibles.map((item) => (
            <article className="auditoria-items-fila" role="row" key={item.id}>
              <div>
                <strong>{item.nombre}</strong>
                <small>{item.codigo}</small>
              </div>
              <span>{item.tipo}</span>
              <span>{item.stock ?? "—"}</span>
              <span>{item.stockMinimo ?? "—"}</span>
              <span>
                <i
                  className={`auditoria-estado ${estado(item) === "Correcto" ? "activo" : ""}`}
                >
                  {estado(item)}
                </i>
              </span>
            </article>
          ))
        ) : (
          <div className="auditoria-usuarios-vacio">
            <Icon name="package" size={26} />
            <strong>No hay ítems para auditar</strong>
            <small>
              Los productos, insumos y servicios del inventario aparecerán aquí.
            </small>
          </div>
        )}
      </div>
    </section>
  );
}
