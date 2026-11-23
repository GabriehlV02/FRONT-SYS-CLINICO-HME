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

const leerJson = async (respuesta: Response): Promise<Record<string, unknown>> => {
  const contenido = await respuesta.text();
  if (!contenido.trim()) return {};
  try {
    return JSON.parse(contenido) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export default function ImagenologoView() {
  const [estudios, setEstudios] = useState<EstudioPendiente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cargandoLista, setCargandoLista] = useState(true);
  const [subvista, setSubvista] = useState<"pendientes" | "realizados">("pendientes");
  const [realizados, setRealizados] = useState<EstudioPendiente[]>([]);

  useEffect(() => {
    let activo = true;
    const actualizar = async () => {
      try {
        const respuesta = await apiFetch("/api/v1/estudios/interpretaciones", {
          headers: { Accept: "application/json" },
        });
        const resultado = await leerJson(respuesta);
        if (!respuesta.ok) throw new Error(typeof resultado.message === "string" ? resultado.message : "No se pudieron cargar los estudios.");
        if (activo) setEstudios(Array.isArray(resultado.data) ? resultado.data as EstudioPendiente[] : []);
        const respuestaRealizados = await apiFetch("/api/v1/estudios/interpretaciones/realizadas", { headers: { Accept: "application/json" } });
        const resultadoRealizados = await leerJson(respuestaRealizados);
        if (!respuestaRealizados.ok) throw new Error(typeof resultadoRealizados.message === "string" ? resultadoRealizados.message : "No se pudieron cargar los informes realizados.");
        if (activo) setRealizados(Array.isArray(resultadoRealizados.data) ? resultadoRealizados.data as EstudioPendiente[] : []);
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

  const buscarCoincidencia = (estudio: EstudioPendiente) =>
    `${estudio.nombres} ${estudio.apellido_paterno} ${estudio.apellido_materno} ${estudio.ci} ${estudio.nombre}`
      .toLocaleLowerCase("es")
      .includes(busqueda.trim().toLocaleLowerCase("es"));
  const pendientes = useMemo(
    () =>
      estudios
        .filter(buscarCoincidencia)
        .sort((a, b) => a.realizado_en.localeCompare(b.realizado_en)),
    [estudios, busqueda],
  );
  const realizadosVisibles = useMemo(() => realizados.filter(buscarCoincidencia), [realizados, busqueda]);

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
      const resultado = await leerJson(respuesta);
      if (!respuesta.ok) throw new Error(typeof resultado.message === "string" ? resultado.message : "No se pudo guardar la interpretación.");
      setEstudios((actuales) => actuales.filter((actual) => actual.id !== estudio.id));
      setRealizados((actuales) => [estudio, ...actuales.filter((actual) => actual.id !== estudio.id)]);
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

  const abrirInforme = async (estudio: EstudioPendiente) => {
    setError("");
    try {
      const respuesta = await apiFetch(`/api/v1/estudios/${estudio.id}/informe`);
      if (!respuesta.ok) throw new Error("No se pudo abrir el informe médico.");
      const url = URL.createObjectURL(await respuesta.blob());
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo abrir el informe médico.");
    }
  };

  return (
    <main className="imagenologo-vista">
      <nav className="imagenologo-subvistas" aria-label="Informes de imagenología">
        <button type="button" className={subvista === "pendientes" ? "activo" : ""} onClick={() => setSubvista("pendientes")}>Pendientes <span>{pendientes.length}</span></button>
        <button type="button" className={subvista === "realizados" ? "activo" : ""} onClick={() => setSubvista("realizados")}>Realizados <span>{realizadosVisibles.length}</span></button>
      </nav>

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

      <div className="imagenologo-tabla-contenedor">
        <table className="imagenologo-tabla" aria-label={subvista === "pendientes" ? "Tabla de informes pendientes" : "Tabla de informes realizados"}>
          <thead>
            <tr><th>Paciente</th><th>CI</th><th>Estudio</th><th>Tipo</th><th>Fecha de realización</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {(subvista === "pendientes" ? pendientes : realizadosVisibles).map((estudio) => (
              <tr key={estudio.id}>
                <td className="imagenologo-tabla-paciente">{[estudio.nombres, estudio.apellido_paterno, estudio.apellido_materno].filter(Boolean).join(" ")}</td>
                <td>{estudio.ci || "—"}</td>
                <td>{estudio.nombre}</td>
                <td>{estudio.tipo}</td>
                <td>{fecha(estudio.realizado_en)}</td>
                <td><span className={`imagenologo-estado ${subvista}`}>{subvista === "pendientes" ? "Pendiente" : "Realizado"}</span></td>
                <td>
                  <div className="imagenologo-acciones">
                    <button className="imagenologo-ver" type="button" onClick={() => void abrirEstudio(estudio)}>Ver estudio</button>
                    {subvista === "pendientes" ? (
                      <label className="imagenologo-subir">
                        {cargando === estudio.id ? "Guardando…" : "Cargar informe"}
                        <input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={cargando === estudio.id} onChange={(evento) => void cargarInforme(estudio, evento)} />
                      </label>
                    ) : (
                      <button className="imagenologo-ver-informe" type="button" onClick={() => void abrirInforme(estudio)}>Ver informe</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!(subvista === "pendientes" ? pendientes : realizadosVisibles).length && (
              <tr className="imagenologo-tabla-vacia">
                <td colSpan={7}>{cargandoLista ? "Cargando informes…" : busqueda ? "No hay informes que coincidan con la búsqueda." : subvista === "pendientes" ? "No hay informes pendientes." : "No hay informes realizados."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );

}
