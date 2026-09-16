import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Icon from "../../componentes/Icono";
import { notificar } from "../../componentes/Notificaciones";
import {
  guardarArchivoEstudio,
  guardarEstudios,
  obtenerArchivoEstudio,
  obtenerEstudios,
  obtenerPacientes,
  seleccionarEstudio,
  type EstudioDemo as Estudio,
} from "../../datos/almacenDemo";
import "./EstudiosTabla.css";

const inicial = {
  pacienteId: "",
  titulo: "",
  categoria: "Radiografía",
  descripcion: "",
};
export default function VistaBibliotecaImagenes() {
  const [estudios, setEstudios] = useState<Estudio[]>(obtenerEstudios),
    [busqueda, setBusqueda] = useState(""),
    [categoria, setCategoria] = useState("Todas"),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(10),
    [modalCarga, setModalCarga] = useState(false),
    [form, setForm] = useState(inicial),
    [archivo, setArchivo] = useState<File | null>(null),
    [error, setError] = useState(""),
    [guardando, setGuardando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null),
    pacientes = obtenerPacientes();
  useEffect(() => {
    const actualizar = () => setEstudios(obtenerEstudios());
    window.addEventListener("radiuus:datos-demo", actualizar);
    return () => window.removeEventListener("radiuus:datos-demo", actualizar);
  }, []);
  const categorias = ["Todas", ...new Set(estudios.map((e) => e.categoria))];
  const filtrados = useMemo(
    () =>
      estudios.filter(
        (e) =>
          `${e.paciente} ${e.titulo} ${e.categoria} ${e.descripcion}`
            .toLowerCase()
            .includes(busqueda.toLowerCase()) &&
          (categoria === "Todas" || e.categoria === categoria),
      ),
    [estudios, busqueda, categoria],
  );
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamano)),
    actual = Math.min(pagina, paginas),
    visibles = filtrados.slice((actual - 1) * tamano, actual * tamano);
  const cerrarCarga = () => {
    if (guardando) return;
    setModalCarga(false);
    setForm(inicial);
    setArchivo(null);
    setError("");
  };
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!archivo)
      return setError("Selecciona un ZIP, RAR, DICOM o una imagen.");
    const paciente = pacientes.find((p) => p.id === form.pacienteId);
    if (!paciente) return setError("Selecciona un paciente registrado.");
    setGuardando(true);
    try {
      const id = `est-${crypto.randomUUID()}`,
        nuevo: Estudio = {
          id,
          pacienteId: paciente.id,
          paciente:
            `${paciente.nombres} ${paciente.primerApellido} ${paciente.segundoApellido}`.trim(),
          titulo: form.titulo,
          categoria: form.categoria,
          descripcion: form.descripcion,
          nombreArchivo: archivo.name,
          mime: archivo.type || "application/octet-stream",
          creadaEn: new Date().toISOString(),
        };
      await guardarArchivoEstudio(id, archivo);
      const nuevos = [nuevo, ...estudios];
      guardarEstudios(nuevos);
      setEstudios(nuevos);
      setModalCarga(false);
      setForm(inicial);
      setArchivo(null);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el estudio.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const descargar = async (estudio: Estudio) => {
    try {
      const archivo = await obtenerArchivoEstudio(estudio),
        url = URL.createObjectURL(archivo),
        a = document.createElement("a");
      a.href = url;
      a.download = estudio.nombreArchivo || estudio.titulo;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      notificar(
        "error",
        "No se pudo descargar",
        e instanceof Error ? e.message : "Intente nuevamente.",
      );
    }
  };
  const Paginacion = ({ superior = false }: { superior?: boolean }) => (
    <div className="estudios-paginacion">
      <small>
        {filtrados.length
          ? `${(actual - 1) * tamano + 1}–${Math.min(actual * tamano, filtrados.length)} de ${filtrados.length}`
          : "0 resultados"}
      </small>
      <div>
        {superior && (
          <label>
            <span>Tamaño</span>
            <select
              value={tamano}
              onChange={(e) => {
                setTamano(Number(e.target.value));
                setPagina(1);
              }}
            >
              {[5, 10, 15, 20, 30, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <button disabled={actual === 1} onClick={() => setPagina((p) => p - 1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <span>
          Página <b>{actual}</b> de {paginas}
        </span>
        <button
          disabled={actual === paginas}
          onClick={() => setPagina((p) => p + 1)}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
  return (
    <div className="estudios-vista">
      <header className="estudios-cabecera">
        <div>
          <p>IMAGENOLOGÍA / ESTUDIOS</p>
          <h2>Estudios e imágenes</h2>
          <small>
            Carga, consulta y descarga los estudios médicos de cada paciente.
          </small>
        </div>
        <button onClick={() => setModalCarga(true)}>
          <Icon name="plus" size={18} />
          Cargar estudio
        </button>
      </header>
      <div className="estudios-herramientas">
        <label>
          <Icon name="search" size={18} />
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar paciente, estudio, modalidad o descripción..."
          />
        </label>
        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value);
            setPagina(1);
          }}
        >
          {categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Paginacion superior />
      <div className="estudios-tabla">
        <div className="estudio-fila estudio-columnas">
          <span>Paciente</span>
          <span>Estudio</span>
          <span>Modalidad</span>
          <span>Archivo</span>
          <span>Actualización</span>
          <span>Acciones</span>
        </div>
        {visibles.map((estudio) => (
          <div className="estudio-fila" key={estudio.id}>
            <div className="estudio-paciente">
              <span>
                <Icon name="users" size={18} />
              </span>
              <strong>{estudio.paciente}</strong>
            </div>
            <div>
              <strong>{estudio.titulo}</strong>
              <small>{estudio.descripcion || "Sin descripción"}</small>
            </div>
            <div>
              <span className="modalidad-etiqueta">{estudio.categoria}</span>
            </div>
            <div>
              <span>{estudio.nombreArchivo}</span>
              <small>{estudio.mime}</small>
            </div>
            <div>
              <span>
                {new Date(estudio.creadaEn).toLocaleDateString("es-ES")}
              </span>
              <small>
                {new Date(estudio.creadaEn).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
            <div className="estudio-acciones">
              <button onClick={() => void descargar(estudio)} title="Descargar">
                <Icon name="arrowRight" size={17} />
              </button>
              <button
                onClick={() => seleccionarEstudio(estudio.id)}
                title="Abrir en el visor"
              >
                <Icon name="eye" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {!visibles.length && (
        <div className="estudios-vacio">
          <Icon name="image" size={27} />
          <strong>No hay estudios para mostrar</strong>
          <small>Carga un estudio o cambia los filtros.</small>
        </div>
      )}
      <Paginacion />
      {modalCarga && (
        <div className="modal-fondo" onClick={cerrarCarga}>
          <form
            className="carga-estudio-modal"
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="cerrar-estudio"
              onClick={cerrarCarga}
            >
              <Icon name="close" />
            </button>
            <div className="carga-titulo">
              <span>
                <Icon name="image" size={23} />
              </span>
              <div>
                <h3>Cargar estudio</h3>
                <p>
                  Asocia un archivo radiográfico con un paciente registrado.
                </p>
              </div>
            </div>
            {error && <div className="carga-error">{error}</div>}
            <div className="carga-campos">
              <label>
                Paciente
                <select
                  required
                  value={form.pacienteId}
                  onChange={(e) =>
                    setForm({ ...form, pacienteId: e.target.value })
                  }
                >
                  <option value="">Selecciona un paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombres} {p.primerApellido} {p.segundoApellido}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre del estudio
                <input
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej. Radiografía de tórax PA"
                />
              </label>
              <label>
                Modalidad
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                >
                  <option>Radiografía</option>
                  <option>Resonancia</option>
                  <option>Ecografía</option>
                  <option>Mamografía</option>
                  <option>Otro</option>
                </select>
              </label>
              <label className="campo-descripcion">
                Descripción
                <textarea
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Observaciones del estudio"
                />
              </label>
              <label className="campo-archivo">
                <input
                  ref={entrada}
                  hidden
                  type="file"
                  accept=".zip,.rar,.dcm,.dicom,image/*,application/zip,application/vnd.rar,application/dicom"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                />
                <button type="button" onClick={() => entrada.current?.click()}>
                  <Icon name="plus" size={18} />
                  {archivo
                    ? archivo.name
                    : "Seleccionar ZIP, RAR, DICOM o imagen"}
                </button>
                <small>
                  El archivo se guardará localmente en este navegador.
                </small>
              </label>
            </div>
            <div className="carga-acciones">
              <button type="button" onClick={cerrarCarga}>
                Cancelar
              </button>
              <button disabled={guardando}>
                <Icon name="check" size={17} />
                {guardando ? "Cargando…" : "Guardar estudio"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
