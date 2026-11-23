import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { apiFetch } from "../api";
import "./ImagenologoView.css";

type EstudioPendiente = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  ci: string;
  realizado_en: string;
};

const fecha = (valor?: string) =>
  valor
    ? new Date(valor).toLocaleString("es-BO", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Fecha no disponible";

export default function ImagenologoView() {
  const [estudios, setEstudios] = useState<EstudioPendiente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cargandoLista, setCargandoLista] = useState(true);

  useEffect(() => {
    let activo = true;
    const actualizar = async () => {
      try {
        const respuesta = await apiFetch("/api/v1/estudios/interpretaciones", {
          headers: { Accept: "application/json" },
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.message || "No se pudieron cargar los estudios.");
        if (activo) setEstudios(resultado.data);
        setError("");
      } catch (causa) {
        if (activo) setError(causa instanceof Error ? causa.message : "No se pudieron cargar los estudios.");
      } finally {
        if (activo) setCargandoLista(false);
      }
    };
    actualizar();
    window.addEventListener("focus", actualizar);
    window.addEventListener("pacientes:actualizados", actualizar);
    return () => {
      activo = false;
      window.removeEventListener("focus", actualizar);
      window.removeEventListener("pacientes:actualizados", actualizar);
    };
  }, []);

  const pendientes = useMemo(
    () =>
      estudios
        .filter((estudio) =>
          `${estudio.nombres} ${estudio.apellido_paterno} ${estudio.apellido_materno} ${estudio.ci} ${estudio.nombre}`
            .toLocaleLowerCase("es")
            .includes(busqueda.trim().toLocaleLowerCase("es")),
        )
        .sort((a, b) => a.realizado_en.localeCompare(b.realizado_en)),
    [estudios, busqueda],
  );

  const abrirEstudio = async (estudio: EstudioPendiente) => {
    setError("");
    try {
      const respuesta = await apiFetch(`/api/v1/estudios/${estudio.id}/archivo`);
      if (!respuesta.ok) throw new Error("No se encontró el archivo del estudio.");
      const url = URL.createObjectURL(await respuesta.blob());
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (causa) {
      setError(
        causa instanceof Error ? causa.message : "No se pudo abrir el estudio.",
      );
    }
  };

  const cargarInforme = async (
    estudio: EstudioPendiente,
    evento: ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(archivo.type) &&
      !/\.(pdf|jpe?g|png)$/i.test(archivo.name)
    ) {
      setError("Sube el informe en formato PDF, JPG o PNG.");
      return;
    }
    if (archivo.size > 20 * 1024 * 1024) {
      setError("El informe no debe superar 20 MB.");
      return;
    }
    setError("");
    setCargando(estudio.id);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      const respuesta = await apiFetch(`/api/v1/estudios/${estudio.id}/informe`, {
        method: "POST",
        body: formulario,
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.message || "No se pudo guardar la interpretación.");
      setEstudios((actuales) => actuales.filter((actual) => actual.id !== estudio.id));
    } catch (causa) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudo guardar la interpretación.",
      );
    } finally {
      setCargando(null);
    }
  };

  return (
    <main className="imagenologo-vista">
      <header className="imagenologo-cabecera">
        <div>
          <span>IMAGENOLOGÍA · INFORMES</span>
          <h1>Interpretaciones pendientes</h1>
          <p>
            Revisa los estudios realizados y adjunta el informe médico firmado.
          </p>
        </div>
        <div className="imagenologo-conteo">
          <strong>{pendientes.length}</strong>
          <span>pendientes</span>
        </div>
      </header>

      {error && (
        <p className="imagenologo-error" role="alert">
          {error}
        </p>
      )}

      <label className="imagenologo-busqueda">
        <span aria-hidden="true">⌕</span>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar paciente, CI o estudio"
        />
      </label>

      <section className="imagenologo-lista" aria-label="Estudios pendientes">
        {pendientes.map((estudio) => (
          <article className="imagenologo-estudio" key={estudio.id}>
            <div className="imagenologo-icono" aria-hidden="true">▧</div>
            <div className="imagenologo-datos">
              <div className="imagenologo-titulo">
              <h2>{estudio.nombre}</h2>
                <span>Pendiente de informe</span>
              </div>
              <strong>{[estudio.nombres, estudio.apellido_paterno, estudio.apellido_materno].filter(Boolean).join(" ")}</strong>
              <small>
                CI {estudio.ci} · {estudio.tipo} · Realizado {fecha(estudio.realizado_en)}
              </small>
            </div>
            <div className="imagenologo-acciones">
              <button
                className="imagenologo-ver"
                type="button"
                onClick={() => void abrirEstudio(estudio)}
              >
                Ver estudio
              </button>
              <label className="imagenologo-subir">
                {cargando === estudio.id ? "Guardando…" : "Cargar informe"}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                  disabled={cargando === estudio.id}
                  onChange={(evento) => void cargarInforme(estudio, evento)}
                />
              </label>
            </div>
          </article>
        ))}
        {!pendientes.length && !cargandoLista && (
          <div className="imagenologo-vacio">
            <span aria-hidden="true">✓</span>
            <h2>{busqueda ? "No se encontraron estudios" : "Todo al día"}</h2>
            <p>
              {busqueda
                ? "Prueba con otro paciente, CI o nombre de estudio."
                : "Los estudios realizados sin informe aparecerán aquí."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
