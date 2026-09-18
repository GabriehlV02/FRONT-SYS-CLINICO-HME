import { useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../../componentes/Icono";
import {
  guardarArchivoEstudio,
  guardarEstudios,
  guardarPacientes,
  obtenerEstudios,
  obtenerPacientes,
  seleccionarEstudio,
  type EstudioDemo,
  type PacienteDemo as Paciente,
} from "../../datos/almacenDemo";
import "../usuarios/VistaUsuarios.css";
import "./VistaPacientes.css";
import "./InformesPaciente.css";

const inicial = {
  nombres: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "CI",
  numeroDocumento: "",
  fechaNacimiento: "",
  sexo: "no_especifica",
  telefono: "",
  direccion: "",
};
const calcularEdad = (fecha: string) => {
  if (!fecha) return null;
  const nacimiento = new Date(`${fecha}T00:00:00`),
    hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() &&
      hoy.getDate() < nacimiento.getDate())
  )
    edad--;
  return Math.max(0, edad);
};
const nombreCompleto = (p: Paciente) =>
  `${p.nombres} ${p.primerApellido} ${p.segundoApellido}`.trim();

export default function VistaPacientes({ modalidad, soloConEstudio = false }: { modalidad?: "Radiografía" | "Tomografía" | "Ecocardiograma"; soloConEstudio?: boolean }) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]),
    [estudios, setEstudios] = useState<EstudioDemo[]>([]),
    [busqueda, setBusqueda] = useState(""),
    [sexo, setSexo] = useState("todos");
  const [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(10),
    [cargando, setCargando] = useState(true),
    [abierto, setAbierto] = useState(false),
    [form, setForm] = useState(inicial),
    [error, setError] = useState(""),
    [guardando, setGuardando] = useState(false),
    [editando, setEditando] = useState<Paciente | null>(null),
    [viendo, setViendo] = useState<Paciente | null>(null),
    [pacienteRadiografia, setPacienteRadiografia] = useState<Paciente | null>(
      null,
    ),
    [archivoRadiografia, setArchivoRadiografia] = useState<File | null>(null),
    [errorRadiografia, setErrorRadiografia] = useState(""),
    [guardandoRadiografia, setGuardandoRadiografia] = useState(false);
  useEffect(() => {
    const actualizar = () => {
      setPacientes(obtenerPacientes());
      setEstudios(obtenerEstudios());
      setCargando(false);
    };
    actualizar();
    window.addEventListener("radiuus:datos-demo", actualizar);
    return () => window.removeEventListener("radiuus:datos-demo", actualizar);
  }, []);
  const estudiosModalidad = useMemo(
    () => modalidad ? estudios.filter((estudio) => estudio.categoria === modalidad) : estudios,
    [estudios, modalidad],
  );
  const pacientesVisibles = useMemo(
    () => soloConEstudio ? pacientes.filter((paciente) => estudiosModalidad.some((estudio) => estudio.pacienteId === paciente.id)) : pacientes,
    [pacientes, estudiosModalidad, soloConEstudio],
  );
  const filtrados = useMemo(
    () =>
      pacientesVisibles.filter(
        (p) =>
          `${nombreCompleto(p)} ${p.numeroDocumento} ${p.telefono} ${p.direccion}`
            .toLowerCase()
            .includes(busqueda.toLowerCase()) &&
          (sexo === "todos" || p.sexo === sexo),
      ),
    [pacientesVisibles, busqueda, sexo],
  );
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamano)),
    actual = Math.min(pagina, paginas),
    visibles = filtrados.slice((actual - 1) * tamano, actual * tamano);
  const filtrar = (fn: () => void) => {
    fn();
    setPagina(1);
  };
  const cerrar = () => {
    if (guardando) return;
    setAbierto(false);
    setEditando(null);
    setForm(inicial);
    setError("");
  };
  const abrirEditar = (p: Paciente) => {
    setEditando(p);
    setForm({
      nombres: p.nombres,
      primerApellido: p.primerApellido,
      segundoApellido: p.segundoApellido,
      tipoDocumento: p.tipoDocumento,
      numeroDocumento: p.numeroDocumento,
      fechaNacimiento: p.fechaNacimiento,
      sexo: p.sexo,
      telefono: p.telefono,
      direccion: p.direccion,
    });
    setAbierto(true);
  };
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const d: Paciente = {
        ...form,
        id: editando?.id || `pac-${crypto.randomUUID()}`,
        creadoEn: editando?.creadoEn || new Date().toISOString(),
      };
      const nuevos = editando
        ? pacientes.map((p) => (p.id === d.id ? d : p))
        : [d, ...pacientes];
      guardarPacientes(nuevos);
      setPacientes(nuevos);
      cerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };
  const estudioDe = (p: Paciente) =>
    estudiosModalidad.find((e) => e.pacienteId === p.id);
  const cerrarRadiografia = () => {
    if (guardandoRadiografia) return;
    setPacienteRadiografia(null);
    setArchivoRadiografia(null);
    setErrorRadiografia("");
  };
  const abrirRadiografia = (p: Paciente) => {
    const estudio = estudioDe(p);
    if (estudio) {
      seleccionarEstudio(estudio.id);
      return;
    }
    setPacienteRadiografia(p);
    setArchivoRadiografia(null);
    setErrorRadiografia("");
  };
  const subirRadiografia = async (e: FormEvent) => {
    e.preventDefault();
    if (!pacienteRadiografia || !archivoRadiografia)
      return setErrorRadiografia(`Selecciona el archivo de ${modalidad?.toLowerCase() || "imagenología"}.`);
    if (archivoRadiografia.size > 200 * 1024 * 1024)
      return setErrorRadiografia("El archivo no debe superar 200 MB.");
    setGuardandoRadiografia(true);
    setErrorRadiografia("");
    try {
      const id = `est-${crypto.randomUUID()}`,
        nuevo: EstudioDemo = {
          id,
          pacienteId: pacienteRadiografia.id,
          paciente: nombreCompleto(pacienteRadiografia),
          titulo: archivoRadiografia.name.replace(/\.[^.]+$/, ""),
          categoria: modalidad || "Radiografía",
          descripcion: "",
          nombreArchivo: archivoRadiografia.name,
          mime: archivoRadiografia.type || "application/octet-stream",
          creadaEn: new Date().toISOString(),
        };
      await guardarArchivoEstudio(id, archivoRadiografia);
      guardarEstudios([nuevo, ...estudios]);
      setEstudios((v) => [nuevo, ...v]);
      cerrarRadiografia();
    } catch (e) {
      setErrorRadiografia(
        e instanceof Error ? e.message : `No se pudo guardar el estudio de ${modalidad?.toLowerCase() || "imagenología"}.`,
      );
    } finally {
      setGuardandoRadiografia(false);
    }
  };
  const Paginacion = ({ tam = false }: { tam?: boolean }) => (
    <div className="usuarios-paginacion">
      <small>
        {filtrados.length
          ? `${(actual - 1) * tamano + 1}–${Math.min(actual * tamano, filtrados.length)} de ${filtrados.length}`
          : "0 resultados"}
      </small>
      <div>
        {tam && (
          <label className="selector-tamano">
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
          Página <strong>{actual}</strong> de {paginas}
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
    <div className="usuarios-vista pacientes-vista">
      <div className="usuarios-herramientas">
        <label>
          <Icon name="search" size={18} />
          <input
            value={busqueda}
            onChange={(e) => filtrar(() => setBusqueda(e.target.value))}
            placeholder="Buscar por nombre, documento, celular o dirección..."
          />
        </label>
        <select
          value={sexo}
          onChange={(e) => filtrar(() => setSexo(e.target.value))}
        >
          <option value="todos">Todos los sexos</option>
          <option value="femenino">Femenino</option>
          <option value="masculino">Masculino</option>
          <option value="otro">Otro</option>
          <option value="no_especifica">No especifica</option>
        </select>
      </div>
      <Paginacion tam />
      <div className="usuarios-tabla pacientes-tabla">
        <div className="usuarios-fila usuarios-columnas">
          <span>Paciente</span>
          <span>Documento</span>
          <span>Edad / sexo</span>
          <span>Celular</span>
          <span>{modalidad || "Pacientes"}</span>
          <span>Acciones</span>
        </div>
        {cargando ? (
          <div className="usuarios-mensaje">Cargando pacientes…</div>
        ) : visibles.length ? (
          visibles.map((p) => {
            const estudio = estudioDe(p);
            return (
              <div className="usuarios-fila" key={p.id}>
                <div className="usuario-identidad">
                  <span>
                    <Icon name="users" size={19} />
                  </span>
                  <div>
                    <strong>{nombreCompleto(p)}</strong>
                    <small>
                      Nacimiento:{" "}
                      {p.fechaNacimiento
                        ? new Date(
                            `${p.fechaNacimiento}T00:00:00`,
                          ).toLocaleDateString("es-ES")
                        : "No registrado"}
                    </small>
                  </div>
                </div>
                <div>
                  <strong className="dato-movil">Documento</strong>
                  <span>
                    {p.tipoDocumento} · {p.numeroDocumento}
                  </span>
                </div>
                <div>
                  <strong className="dato-movil">Edad / sexo</strong>
                  <span>
                    {calcularEdad(p.fechaNacimiento) === null
                      ? "No registrada"
                      : `${calcularEdad(p.fechaNacimiento)} años`}
                  </span>
                  <small>{p.sexo.replace("_", " ")}</small>
                </div>
                <div>
                  <strong className="dato-movil">Celular</strong>
                  <span>{p.telefono || "No registrado"}</span>
                </div>
                <div className="radiografia-estado">
                  <strong className="dato-movil">{modalidad || "Estudio"}</strong>
                  <span
                    className={estudio ? "estado-cargado" : "estado-pendiente"}
                  >
                    {estudio ? "Cargada" : "Pendiente"}
                  </span>
                  {estudio && (
                    <small title={estudio.nombreArchivo}>
                      {estudio.titulo}
                    </small>
                  )}
                </div>
                <div className="acciones-tabla">
                  <button
                    className="usuario-accion"
                    onClick={() => setViendo(p)}
                    title="Ver paciente"
                  >
                    <Icon name="eye" size={18} />
                  </button>
                  <button
                    className="usuario-accion"
                    onClick={() => abrirEditar(p)}
                    title="Editar paciente"
                  >
                    <Icon name="edit" size={17} />
                  </button>
                  <button
                    className={`usuario-accion accion-radiografia ${estudio ? "con-informe" : ""}`}
                    onClick={() => abrirRadiografia(p)}
                    title={
                      estudio ? `Visualizar ${modalidad?.toLowerCase() || "estudio"}` : `Subir ${modalidad?.toLowerCase() || "estudio"}`
                    }
                  >
                    <Icon name={estudio ? "eye" : "plus"} size={17} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="usuarios-mensaje">
            <span>
              <Icon name="users" size={25} />
            </span>
            <strong>No hay pacientes para mostrar</strong>
            <small>Registra el primer paciente o cambia los filtros.</small>
          </div>
        )}
      </div>
      <Paginacion />
      {abierto && (
        <div className="usuario-modal-fondo" onClick={cerrar}>
          <form
            className="usuario-modal usuario-formulario"
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="usuario-modal-cerrar"
              onClick={cerrar}
            >
              <Icon name="close" />
            </button>
            <div className="usuario-modal-titulo">
              <span>
                <Icon name="users" size={23} />
              </span>
              <div>
                <h3>{editando ? "Editar paciente" : "Registrar paciente"}</h3>
                <p>Completa su identificación e información personal.</p>
              </div>
            </div>
            {error && <div className="usuario-form-error">{error}</div>}
            <div className="paciente-campos paciente-campos-completos">
              <label>
                Nombres
                <input
                  required
                  value={form.nombres}
                  onChange={(e) =>
                    setForm({ ...form, nombres: e.target.value })
                  }
                />
              </label>
              <label>
                Primer apellido
                <input
                  required
                  value={form.primerApellido}
                  onChange={(e) =>
                    setForm({ ...form, primerApellido: e.target.value })
                  }
                />
              </label>
              <label>
                Segundo apellido
                <input
                  required
                  value={form.segundoApellido}
                  onChange={(e) =>
                    setForm({ ...form, segundoApellido: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo de documento
                <select
                  value={form.tipoDocumento}
                  onChange={(e) =>
                    setForm({ ...form, tipoDocumento: e.target.value })
                  }
                >
                  <option>CI</option>
                  <option>Pasaporte</option>
                  <option>Documento extranjero</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>
                Número de documento o CI
                <input
                  required
                  value={form.numeroDocumento}
                  onChange={(e) =>
                    setForm({ ...form, numeroDocumento: e.target.value })
                  }
                />
              </label>
              <label>
                Fecha de nacimiento
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.fechaNacimiento}
                  onChange={(e) =>
                    setForm({ ...form, fechaNacimiento: e.target.value })
                  }
                />
              </label>
              <label>
                Edad calculada
                <input
                  readOnly
                  value={
                    calcularEdad(form.fechaNacimiento) === null
                      ? "Selecciona la fecha"
                      : `${calcularEdad(form.fechaNacimiento)} años`
                  }
                />
              </label>
              <label>
                Sexo
                <select
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                >
                  <option value="no_especifica">No especifica</option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label>
                Número de celular / WhatsApp
                <input
                  required
                  type="tel"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                />
              </label>
              <label className="campo-direccion">
                Dirección
                <textarea
                  required
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="usuario-form-acciones">
              <button type="button" onClick={cerrar}>
                Cancelar
              </button>
              <button className="usuarios-crear" disabled={guardando}>
                <Icon name="check" size={17} />
                {guardando
                  ? "Guardando…"
                  : editando
                    ? "Guardar cambios"
                    : "Guardar paciente"}
              </button>
            </div>
          </form>
        </div>
      )}
      {viendo && (
        <div className="usuario-modal-fondo" onClick={() => setViendo(null)}>
          <div
            className="usuario-modal ficha-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="usuario-modal-cerrar"
              onClick={() => setViendo(null)}
            >
              <Icon name="close" />
            </button>
            <div className="usuario-modal-titulo">
              <span>
                <Icon name="users" size={23} />
              </span>
              <div>
                <h3>{nombreCompleto(viendo)}</h3>
                <p>Información del paciente</p>
              </div>
            </div>
            <div className="ficha-datos">
              <div>
                <small>Documento</small>
                <strong>
                  {viendo.tipoDocumento} · {viendo.numeroDocumento}
                </strong>
              </div>
              <div>
                <small>Nacimiento y edad</small>
                <strong>
                  {viendo.fechaNacimiento
                    ? `${viendo.fechaNacimiento} · ${calcularEdad(viendo.fechaNacimiento)} años`
                    : "No registrado"}
                </strong>
              </div>
              <div>
                <small>Sexo</small>
                <strong>{viendo.sexo.replace("_", " ")}</strong>
              </div>
              <div>
                <small>Celular / WhatsApp</small>
                <strong>{viendo.telefono || "No registrado"}</strong>
              </div>
              <div className="ficha-direccion">
                <small>Dirección</small>
                <strong>{viendo.direccion || "No registrada"}</strong>
              </div>
            </div>
            <div className="usuario-form-acciones">
              <button onClick={() => setViendo(null)}>Cerrar</button>
              <button
                className="usuarios-crear"
                onClick={() => {
                  const paciente = viendo;
                  setViendo(null);
                  abrirEditar(paciente);
                }}
              >
                <Icon name="edit" size={16} />
                Editar paciente
              </button>
            </div>
          </div>
        </div>
      )}
      {pacienteRadiografia && (
        <div className="usuario-modal-fondo" onClick={cerrarRadiografia}>
          <div
            className="usuario-modal informe-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="usuario-modal-cerrar" onClick={cerrarRadiografia}>
              <Icon name="close" />
            </button>
            <div className="usuario-modal-titulo">
              <span>
                <Icon name="image" size={23} />
              </span>
              <div>
                <h3>
                  Subir {modalidad?.toLowerCase() || "estudio"}
                </h3>
                <p>{nombreCompleto(pacienteRadiografia)}</p>
              </div>
            </div>
            {errorRadiografia && (
              <div className="usuario-form-error">{errorRadiografia}</div>
            )}
            <p className="radiografia-ayuda">Carga el estudio en imagen, DICOM, ZIP o RAR para asociarlo a este paciente y dejarlo disponible en el visor.</p>
            <form className="informe-carga" onSubmit={subirRadiografia}>
              <label>
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/dicom,application/zip,application/x-rar-compressed,.dcm,.zip,.rar"
                  onChange={(e) =>
                    setArchivoRadiografia(e.target.files?.[0] || null)
                  }
                />
                <span>
                  <Icon name="plus" size={17} />
                  {archivoRadiografia ? archivoRadiografia.name : `Seleccionar ${modalidad?.toLowerCase() || "estudio"}`}
                </span>
              </label>
              <div className="usuario-form-acciones">
                <button type="button" onClick={cerrarRadiografia}>
                  Cerrar
                </button>
                <button
                  className="usuarios-crear"
                  disabled={!archivoRadiografia || guardandoRadiografia}
                >
                  <Icon name="check" size={16} />
                  {guardandoRadiografia ? "Guardando…" : `Subir ${modalidad?.toLowerCase() || "estudio"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
