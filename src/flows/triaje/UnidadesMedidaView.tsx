import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../../radius/api";
import "./UnidadesMedidaView.css";

export type UnidadMedida = { id: number; nombre: string; abreviatura: string };
const url = "/api/v1/configuracion/unidades-signos-vitales";

export function useUnidadesMedida() {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(url, { signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok)
          throw new Error("No se pudieron cargar las unidades de medida.");
        const resultado = await respuesta.json();
        setUnidades(resultado.data);
      })
      .catch((fallo) => {
        if (fallo.name !== "AbortError")
          setError("No se pudieron cargar las unidades de medida.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, []);

  async function crear(nombre: string, abreviatura: string) {
    const respuesta = await apiFetch(url, {
      method: "POST",
      body: JSON.stringify({ nombre, abreviatura }),
    });
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok)
      throw new Error(
        Object.values(resultado.errors || {})
          .flat()
          .join(" ") ||
          resultado.message ||
          "No se pudo guardar la unidad.",
      );
    setUnidades((actuales) =>
      [...actuales, resultado.data].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      ),
    );
  }
  return { unidades, error, cargando, crear };
}

export function UnidadesMedidaView({
  catalogo,
}: {
  catalogo: ReturnType<typeof useUnidadesMedida>;
}) {
  const [nombre, setNombre] = useState("");
  const [abreviatura, setAbreviatura] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const visibles = catalogo.unidades.filter((unidad) =>
    `${unidad.nombre} ${unidad.abreviatura}`
      .toLocaleLowerCase()
      .includes(busqueda.toLocaleLowerCase()),
  );

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      await catalogo.crear(nombre.trim(), abreviatura.trim());
      setNombre("");
      setAbreviatura("");
      setAbierto(false);
      setMensaje("Unidad de medida registrada correctamente.");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar la unidad.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="unidades-vitales">
      <header>
        <div>
          <h2>Unidades de medida</h2>
          <p>Registra las unidades y abreviaturas para los signos vitales.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAbierto(!abierto);
            setError("");
          }}
        >
          {abierto ? "Cerrar" : "+ Nueva unidad"}
        </button>
      </header>
      {abierto && (
        <form className="unidades-vitales-form" onSubmit={guardar}>
          <label>
            Nombre de la unidad{" "}
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Grados Celsius"
              maxLength={120}
              required
            />
          </label>
          <label>
            Abreviatura{" "}
            <input
              value={abreviatura}
              onChange={(e) => setAbreviatura(e.target.value)}
              placeholder="Ej. °C"
              maxLength={32}
              required
            />
          </label>
          <button disabled={guardando} type="submit">
            {guardando ? "Guardando…" : "Guardar unidad"}
          </button>
        </form>
      )}
      {(error || catalogo.error) && (
        <p role="alert" className="unidades-vitales-error">
          {error || catalogo.error}
        </p>
      )}
      {mensaje && (
        <p role="status" className="unidades-vitales-exito">
          {mensaje}
        </p>
      )}
      <label className="unidades-vitales-busqueda">
        <span>Buscar unidad</span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o abreviatura"
        />
      </label>
      <div className="unidades-vitales-tabla">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Abreviatura</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((unidad) => (
              <tr key={unidad.id}>
                <td>{unidad.nombre}</td>
                <td>{unidad.abreviatura}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {catalogo.cargando ? (
          <p>Cargando unidades…</p>
        ) : (
          visibles.length === 0 && <p>No hay unidades que mostrar.</p>
        )}
      </div>
    </section>
  );
}
