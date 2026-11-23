import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiFetch } from "../../api";
import Icon from "../../componentes/Icono";
import "./VistaAlmacenesCajas.css";

type Almacen = {
  id: string;
  nombre: string;
  codigo: string;
  sucursal: string;
  estado: "ACTIVO" | "INACTIVO";
};
type Caja = {
  id: string;
  nombre: string;
  sucursal: string;
  almacenes?: Almacen[];
  estado: "ACTIVO" | "INACTIVO";
};
type Modal = "almacen" | null;

export default function VistaAlmacenesCajas() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const cargar = async () => {
    setCargando(true);
    try {
      const respuesta = await apiFetch("/api/v1/operacion/almacenes-cajas");
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message);
      setAlmacenes(datos.almacenes || []);
      setCajas(datos.cajas || []);
    } catch {
      setMensaje("No se pudo cargar la configuración operativa.");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    void cargar();
  }, []);
  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    const datos = new FormData(event.currentTarget);
    const cuerpo = { nombre: datos.get("nombre"), codigo: datos.get("codigo"), sucursal: datos.get("sucursal") };
    setMensaje("");
    try {
      const respuesta = await apiFetch(
        "/api/v1/operacion/almacenes",
        { method: "POST", body: JSON.stringify(cuerpo) },
      );
      const resultado = await respuesta.json();
      if (!respuesta.ok)
        throw new Error(resultado.message || "No se pudo guardar.");
      setModal(null);
      await cargar();
    } catch (error) {
      setMensaje(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const cambiarEstado = async (id: string) => {
    try {
      const respuesta = await apiFetch(
        `/api/v1/operacion/almacenes/${id}/estado`,
        { method: "PATCH" },
      );
      if (!respuesta.ok) throw new Error();
      await cargar();
    } catch {
      setMensaje("No se pudo actualizar el estado.");
    }
  };
  return (
    <section className="operacion-vista" aria-labelledby="operacion-titulo">
      <header className="config-usuarios-cabecera">
        <div>
          <p>CONFIGURACIÓN OPERATIVA</p>
          <h2 id="operacion-titulo">Almacenes y cajas</h2>
          <small>
            Define desde dónde se descuenta el stock y quién puede venderlo.
          </small>
        </div>
      </header>
      {mensaje && (
        <p className="operacion-mensaje" role="status">
          {mensaje}
        </p>
      )}
      <div className="operacion-grid">
        <Panel
          titulo="Almacenes"
          descripcion="Existencias, lotes y movimientos por ubicación."
          icono="building"
          onCrear={() => setModal("almacen")}
        >
          {cargando ? (
            <p className="operacion-vacio">Cargando almacenes…</p>
          ) : almacenes.length ? (
            almacenes.map((a) => (
              <article key={a.id}>
                <div>
                  <strong>
                    {a.nombre} <code>{a.codigo}</code>
                  </strong>
                  <small>{a.sucursal}</small>
                </div>
                <button
                  type="button"
                  className={a.estado === "ACTIVO" ? "activo" : ""}
                   onClick={() => void cambiarEstado(a.id)}
                >
                  {a.estado}
                </button>
              </article>
            ))
          ) : (
            <p className="operacion-vacio">Aún no hay almacenes creados.</p>
          )}
        </Panel>
        <Panel
          titulo="Cajas"
          descripcion="Las cajas se administran en Contabilidad."
          icono="asset"
        >
          {cargando ? (
            <p className="operacion-vacio">Cargando cajas…</p>
          ) : cajas.length ? (
            cajas.map((c) => (
              <article key={c.id}>
                <div>
                  <strong>{c.nombre}</strong>
                  <small>
                    {c.sucursal} ·{" "}
                    {c.almacenes?.map((a) => a.nombre).join(", ") ||
                      "Sin almacén asignado"}
                  </small>
                </div>
                <span>{c.estado}</span>
              </article>
            ))
          ) : (
            <p className="operacion-vacio">Aún no hay cajas creadas.</p>
          )}
        </Panel>
      </div>
      {modal && (
        <div className="operacion-modal-fondo" role="presentation">
          <form className="operacion-modal" onSubmit={guardar}>
            <header>
              <div>
                <h3>Crear almacén</h3>
              </div>
              <button
                type="button"
                className="operacion-cerrar"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
              <div className="operacion-formulario">
                <label>
                  Nombre
                  <input
                    name="nombre"
                    required
                    autoFocus
                    placeholder="Ej. Almacén farmacia"
                  />
                </label>
                <label>
                  Código
                  <input
                    name="codigo"
                    required
                    maxLength={30}
                    placeholder="Ej. ALM-FAR-01"
                  />
                </label>
                <label>
                  Sucursal
                  <input
                    name="sucursal"
                    required
                    placeholder="Sucursal o ubicación"
                  />
                </label>
              </div>
            <footer>
              <button
                type="button"
                className="secundario"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button disabled={guardando} type="submit">
                <Icon name="plus" size={15} />
                {guardando ? "Guardando…" : `Crear ${modal}`}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
function Panel({
  titulo,
  descripcion,
  icono,
  onCrear,
  children,
}: {
  titulo: string;
  descripcion: string;
  icono: "building" | "asset";
  onCrear?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="operacion-panel">
      <header>
        <span>
          <Icon name={icono} size={20} />
        </span>
        <div>
          <h3>{titulo}</h3>
          <p>{descripcion}</p>
        </div>
        {onCrear && <button type="button" onClick={onCrear}>
          <Icon name="plus" size={14} /> Crear
        </button>}
      </header>
      <div className="operacion-lista">{children}</div>
    </section>
  );
}
