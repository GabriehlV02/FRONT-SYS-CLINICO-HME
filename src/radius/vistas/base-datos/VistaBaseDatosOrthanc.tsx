import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api";
import Icon from "../../componentes/Icono";
import { confirmar, notificar } from "../../componentes/Notificaciones";
import "./VistaBaseDatosOrthanc.css";
import "./VistaBaseDatosOrthancMejoras.css";

type Estudio = {
  id: string;
  studyInstanceUid: string;
  patientIdDicom: string;
  patientName: string;
  pacienteId: string | null;
  accessionNumber: string;
  descripcion: string;
  fechaEstudio: string;
  modalidades: string[];
  cantidadSeries: number;
  actualizadoEn: string;
};
type Estado = {
  conectado: boolean;
  nombre: string;
  version: string;
  servidor?: string;
};
type Paciente = {
  clave: string;
  nombre: string;
  patientId: string;
  estudios: Estudio[];
  primeraFecha: string;
  ultimaFecha: string;
  modalidades: string[];
};
async function json<T>(url: string, init?: RequestInit) {
  const r = await apiFetch(url, init),
    d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error((d as { message?: string }).message || `Error ${r.status}`);
  return d as T;
}
function fecha(v: string) {
  return /^\d{8}$/.test(v)
    ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`
    : v || "Sin fecha";
}

export default function VistaBaseDatosOrthanc() {
  const [estudios, setEstudios] = useState<Estudio[]>([]),
    [estado, setEstado] = useState<Estado | null>(null),
    [vista, setVista] = useState<"estudios" | "pacientes">("estudios"),
    [busqueda, setBusqueda] = useState(""),
    [ordenarPor, setOrdenarPor] = useState<"fecha" | "nombre">("fecha"),
    [direccionOrden, setDireccionOrden] = useState<"asc" | "desc">("desc"),
    [desde, setDesde] = useState(""),
    [hasta, setHasta] = useState(""),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(20),
    [cargando, setCargando] = useState(true),
    [sincronizando, setSincronizando] = useState(false),
    [descargando, setDescargando] = useState<string | null>(null),
    [eliminando, setEliminando] = useState<string | null>(null),
    [editando, setEditando] = useState<Estudio | null>(null),
    [guardando, setGuardando] = useState(false),
    [form, setForm] = useState({
      patientName: "",
      patientIdDicom: "",
      descripcion: "",
      accessionNumber: "",
      fechaEstudio: "",
    }),
    [errorConexion, setErrorConexion] = useState(""),
    [error, setError] = useState(""),
    [resultado, setResultado] = useState("");
  const volverAEstudios = () => {
    setVista("estudios");
    setPagina(1);
    window.dispatchEvent(
      new CustomEvent("radiuus:navegar", { detail: "base-datos" }),
    );
  };
  const cargar = async () =>
    setEstudios(await json<Estudio[]>("/api/orthanc/estudios"));
  const sincronizar = async () => {
    setSincronizando(true);
    setError("");
    setErrorConexion("");
    setResultado("");
    try {
      setEstado(await json<Estado>("/api/orthanc/estado"));
      const r = await json<{
        total: number;
        nuevos: number;
        asignados: number;
        pendientes: number;
      }>("/api/orthanc/sincronizar", { method: "POST" });
      await cargar();
      setResultado(
        `${r.total} estudios encontrados Â· ${r.nuevos} nuevos Â· ${r.asignados} asociados Â· ${r.pendientes} pendientes`,
      );
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo consultar Orthanc.";
      setEstado(null);
      setErrorConexion(mensaje);
      setError(mensaje);
    } finally {
      setSincronizando(false);
      setCargando(false);
    }
  };
  useEffect(() => {
    void sincronizar();
  }, []);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase(),
      inicio = desde.replaceAll("-", ""),
      fin = hasta.replaceAll("-", "");
    return estudios
      .filter((e) => {
        const texto =
            `${e.patientName} ${e.patientIdDicom} ${e.accessionNumber} ${e.descripcion} ${e.studyInstanceUid} ${e.modalidades.join(" ")}`.toLocaleLowerCase(),
          f = /^\d{8}$/.test(e.fechaEstudio) ? e.fechaEstudio : "";
        return (
          (!q || texto.includes(q)) &&
          (!inicio || (!!f && f >= inicio)) &&
          (!fin || (!!f && f <= fin))
        );
      })
      .sort((a, b) => {
        const comparacion =
          ordenarPor === "nombre"
            ? (a.patientName || "").localeCompare(b.patientName || "", "es", {
                sensitivity: "base",
              })
            : (a.fechaEstudio || "").localeCompare(b.fechaEstudio || "");
        return direccionOrden === "asc" ? comparacion : -comparacion;
      });
  }, [estudios, busqueda, desde, hasta, ordenarPor, direccionOrden]);
  const pacientes = useMemo(() => {
    const mapa = new Map<string, Paciente>();
    for (const e of filtrados) {
      const id = e.patientIdDicom.trim().toUpperCase(),
        nombre = e.patientName.trim().toUpperCase(),
        clave = id || nombre ? `${id}|${nombre}` : `SIN-ID-${e.id}`,
        p = mapa.get(clave);
      if (p) {
        p.estudios.push(e);
        if (
          e.fechaEstudio &&
          (!p.primeraFecha || e.fechaEstudio < p.primeraFecha)
        )
          p.primeraFecha = e.fechaEstudio;
        if (e.fechaEstudio > p.ultimaFecha) p.ultimaFecha = e.fechaEstudio;
        p.modalidades = [...new Set([...p.modalidades, ...e.modalidades])];
      } else
        mapa.set(clave, {
          clave,
          nombre: e.patientName || "Paciente sin nombre",
          patientId: e.patientIdDicom,
          estudios: [e],
          primeraFecha: e.fechaEstudio,
          ultimaFecha: e.fechaEstudio,
          modalidades: [...e.modalidades],
        });
    }
    return [...mapa.values()].sort((a, b) => {
      const comparacion =
        ordenarPor === "nombre"
          ? a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
          : (a.ultimaFecha || "").localeCompare(b.ultimaFecha || "");
      return direccionOrden === "asc" ? comparacion : -comparacion;
    });
  }, [filtrados, ordenarPor, direccionOrden]);
  const elementos = vista === "estudios" ? filtrados : pacientes,
    paginas = Math.max(1, Math.ceil(elementos.length / tamano)),
    actual = Math.min(pagina, paginas),
    estudiosPagina = filtrados.slice((actual - 1) * tamano, actual * tamano),
    pacientesPagina = pacientes.slice((actual - 1) * tamano, actual * tamano);
  const descargar = async (e: Estudio) => {
    setDescargando(e.id);
    setError("");
    try {
      const r = await apiFetch(
        `/api/orthanc/estudios/${encodeURIComponent(e.id)}/archivo`,
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || "No se pudo descargar.");
      }
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download =
        `${e.accessionNumber || e.patientName || "estudio-dicom"}.zip`.replace(
          /[^A-Za-z0-9._-]/g,
          "-",
        );
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (x) {
      setError(x instanceof Error ? x.message : "No se pudo descargar.");
    } finally {
      setDescargando(null);
    }
  };
  const visualizar = (e: Estudio) => {
    localStorage.setItem("radiuus_orthanc_estudio", e.id);
    window.dispatchEvent(
      new CustomEvent("radiuus:navegar", { detail: "visor" }),
    );
  };
  const abrirEdicion = (e: Estudio) => {
    setEditando(e);
    setForm({
      patientName: e.patientName,
      patientIdDicom: e.patientIdDicom,
      descripcion: e.descripcion,
      accessionNumber: e.accessionNumber,
      fechaEstudio: e.fechaEstudio,
    });
    setError("");
  };
  const guardarEdicion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editando) return;
    setGuardando(true);
    setError("");
    try {
      await json(`/api/orthanc/estudios/${encodeURIComponent(editando.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await cargar();
      setEditando(null);
      volverAEstudios();
      setResultado(
        "Los datos DICOM del estudio fueron actualizados en Orthanc.",
      );
      notificar(
        "exito",
        "Estudio actualizado",
        "Los cambios se guardaron en Orthanc y regresaste a la tabla de estudios.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo editar el estudio.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const eliminar = async (e: Estudio) => {
    const aceptado = await confirmar({
      titulo: "Eliminar estudio de Orthanc",
      mensaje: `Se eliminarÃ¡ â€œ${e.descripcion || "Sin descripciÃ³n"}â€ de ${e.patientName || "este paciente"}.`,
      detalle:
        "Esta acciÃ³n elimina definitivamente todas sus series e imÃ¡genes del servidor y no se puede deshacer.",
      textoConfirmar: "Eliminar estudio",
      peligrosa: true,
    });
    if (!aceptado) return;
    setEliminando(e.id);
    setError("");
    try {
      const r = await apiFetch(
        `/api/orthanc/estudios/${encodeURIComponent(e.id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || "No se pudo eliminar.");
      }
      setEstudios((lista) => lista.filter((item) => item.id !== e.id));
      volverAEstudios();
      setResultado(
        "El estudio fue eliminado definitivamente del servidor Orthanc.",
      );
      notificar(
        "exito",
        "Estudio eliminado",
        "El estudio y todas sus imÃ¡genes fueron eliminados de Orthanc.",
      );
    } catch (x) {
      const mensaje =
        x instanceof Error ? x.message : "No se pudo eliminar el estudio.";
      setError(mensaje);
      notificar("error", "No se pudo eliminar", mensaje);
    } finally {
      setEliminando(null);
    }
  };
  const verPaciente = (p: Paciente) => {
    setVista("estudios");
    setBusqueda(p.patientId || p.nombre);
    setPagina(1);
  };
  return (
    <div className="orthanc-vista">
      <div className="orthanc-vistas">
        <button
          type="button"
          className={vista === "estudios" ? "activo" : ""}
          onClick={() => {
            setVista("estudios");
            setPagina(1);
          }}
        >
          <Icon name="image" size={17} />
          Estudios <b>{filtrados.length}</b>
        </button>
        <button
          type="button"
          className={vista === "pacientes" ? "activo" : ""}
          onClick={() => {
            setVista("pacientes");
            setPagina(1);
          }}
        >
          <Icon name="patient" size={17} />
          Pacientes <b>{pacientes.length}</b>
        </button>
      </div>
      <section className="orthanc-estado">
        <div className={`orthanc-conexion ${estado ? "conectado" : "desconectado"}`}>
          <i />
          <span>
            <strong>
              {estado
                ? `${estado.nombre} conectado`
                : "Sin conexiÃ³n confirmada"}
            </strong>
            <small>
              {estado
                ? `Orthanc ${estado.version}${estado.servidor ? ` Â· ${estado.servidor}` : ""}`
                : errorConexion || "No se pudo consultar el servidor Orthanc"}
            </small>
          </span>
        </div>
        <div className="orthanc-metrica">
          <strong>{estudios.length}</strong>
          <small>estudios en el servidor</small>
        </div>
        <div className="orthanc-metrica">
          <strong>
            {
              new Set(estudios.map((e) => e.patientIdDicom || e.patientName))
                .size
            }
          </strong>
          <small>pacientes DICOM</small>
        </div>
        <div className="orthanc-metrica">
          <strong>{estudios.filter((e) => !e.pacienteId).length}</strong>
          <small>pendientes de asociar</small>
        </div>
        <button
          className="orthanc-sincronizar"
          type="button"
          disabled={sincronizando}
          onClick={() => void sincronizar()}
        >
          <Icon name="arrowRight" size={17} />
          {sincronizando ? "Consultando Orthancâ€¦" : "Sincronizar servidor"}
        </button>
      </section>
      {error && <div className="orthanc-mensaje error">{error}</div>}
      <div className="orthanc-filtros">
        <label className="orthanc-buscar">
          <Icon name="search" size={18} />
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar nombre, ID, descripciÃ³n, acceso o UIDâ€¦"
          />
        </label>
        <select
          aria-label="Ordenar por"
          value={ordenarPor}
          onChange={(e) => {
            setOrdenarPor(e.target.value as "fecha" | "nombre");
            setPagina(1);
          }}
        >
          <option value="fecha">Fecha</option>
          <option value="nombre">Nombre</option>
        </select>
        <select
          aria-label="DirecciÃ³n del orden"
          value={direccionOrden}
          onChange={(e) => {
            setDireccionOrden(e.target.value as "asc" | "desc");
            setPagina(1);
          }}
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </select>
        <label className="orthanc-fecha">
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPagina(1);
            }}
          />
        </label>
        <label className="orthanc-fecha">
          <span>Hasta</span>
          <input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => {
              setHasta(e.target.value);
              setPagina(1);
            }}
          />
        </label>
      </div>
      <div className="orthanc-tabla-con-paginacion">
      <div className="orthanc-paginacion">
        <span />
        <div>
          <label>
            Mostrar{" "}
            <select
              value={tamano}
              onChange={(e) => {
                setTamano(Number(e.target.value));
                setPagina(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            disabled={actual === 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <span>
            PÃ¡gina <b>{actual}</b> de {paginas}
          </span>
          <button
            disabled={actual === paginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>
      {vista === "estudios" ? (
        <div className="orthanc-tabla">
          <div className="orthanc-fila columnas">
            <span>Paciente DICOM</span>
            <span>Estudio</span>
            <span>Fecha</span>
            <span>Series</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {estudiosPagina.map((e) => (
            <div className="orthanc-fila" key={e.id}>
              <div className="orthanc-paciente">
                <span>
                  <Icon name="patient" size={22} />
                </span>
                <div>
                  <strong>{e.patientName || "Paciente sin nombre"}</strong>
                  <small>
                    Patient ID: {e.patientIdDicom || "No registrado"}
                  </small>
                </div>
              </div>
              <div>
                <strong>{e.descripcion || "Estudio sin descripciÃ³n"}</strong>
                <small>Acceso: {e.accessionNumber || "No registrado"}</small>
                <small title={e.studyInstanceUid}>
                  UID: {e.studyInstanceUid || "No registrado"}
                </small>
              </div>
              <div>{fecha(e.fechaEstudio)}</div>
              <div>{e.cantidadSeries}</div>
              <div>
                <span
                  className={`orthanc-asociacion ${e.pacienteId ? "asociado" : "pendiente"}`}
                >
                  {e.pacienteId ? "Asociado" : "Pendiente"}
                </span>
              </div>
              <div className="orthanc-acciones">
                <button type="button" onClick={() => visualizar(e)} aria-label="Ver estudio" title="Ver estudio">
                  <Icon name="eye" size={17} />
                  <span>Ver</span>
                </button>
                <button
                  type="button"
                  disabled={descargando === e.id}
                  onClick={() => void descargar(e)}
                  aria-label="Descargar ZIP"
                  title="Descargar ZIP"
                >
                  <Icon name="arrowRight" size={17} />
                  <span>{descargando === e.id ? "â€¦" : "ZIP"}</span>
                </button>
                <button type="button" onClick={() => abrirEdicion(e)} aria-label="Editar estudio" title="Editar estudio">
                  <Icon name="edit" size={17} />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  className="eliminar"
                  disabled={eliminando === e.id}
                  onClick={() => void eliminar(e)}
                  aria-label="Eliminar estudio"
                  title="Eliminar estudio"
                >
                  <Icon name="trash" size={17} />
                  <span>{eliminando === e.id ? "â€¦" : "Eliminar"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="orthanc-tabla">
          <div className="orthanc-fila orthanc-fila-paciente columnas">
            <span>Paciente DICOM</span>
            <span>Estudios</span>
            <span>Primera fecha</span>
            <span>Ãšltima fecha</span>
            <span>AcciÃ³n</span>
          </div>
          {pacientesPagina.map((p) => (
            <div className="orthanc-fila orthanc-fila-paciente" key={p.clave}>
              <div className="orthanc-paciente">
                <span>
                  <Icon name="patient" size={22} />
                </span>
                <div>
                  <strong>{p.nombre}</strong>
                  <small>Patient ID: {p.patientId || "No registrado"}</small>
                </div>
              </div>
              <div>
                <strong>{p.estudios.length}</strong>
                <small>estudio{p.estudios.length === 1 ? "" : "s"} DICOM</small>
              </div>
              <div>{fecha(p.primeraFecha)}</div>
              <div>{fecha(p.ultimaFecha)}</div>
              <div>
                <button
                  className="orthanc-ver-paciente"
                  onClick={() => verPaciente(p)}
                >
                  <Icon name="eye" size={17} />
                  Ver estudios
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(cargando || !elementos.length) && (
        <div className="orthanc-vacio">
          <Icon name={vista === "pacientes" ? "patient" : "image"} size={28} />
          <strong>
            {cargando
              ? "Leyendo la base de datosâ€¦"
              : `No hay ${vista} para mostrar`}
          </strong>
          <small>
            {cargando
              ? "La primera consulta puede tardar si Orthanc contiene muchos estudios."
              : "Cambia la bÃºsqueda, modalidad o rango de fechas."}
          </small>
        </div>
      )}
      {!cargando && elementos.length > 0 && (
        <div className="orthanc-paginacion orthanc-paginacion-inferior">
          <small>{`${(actual - 1) * tamano + 1}â€“${Math.min(actual * tamano, elementos.length)} de ${elementos.length}`}</small>
          <div>
            <label>
              Mostrar{" "}
              <select
                value={tamano}
                onChange={(e) => {
                  setTamano(Number(e.target.value));
                  setPagina(1);
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              disabled={actual === 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              <Icon name="chevronLeft" size={16} />
            </button>
            <span>
              PÃ¡gina <b>{actual}</b> de {paginas}
            </span>
            <button
              disabled={actual === paginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
      )}
      </div>
      {editando && (
        <div
          className="orthanc-modal-fondo"
          onMouseDown={() => !guardando && setEditando(null)}
        >
          <form
            className="orthanc-modal"
            onSubmit={guardarEdicion}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <strong>Editar estudio DICOM</strong>
                <small>
                  Los cambios se aplicarÃ¡n a todas las imÃ¡genes del estudio en
                  Orthanc.
                </small>
              </div>
              <button
                type="button"
                disabled={guardando}
                onClick={() => setEditando(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="orthanc-modal-campos">
              <label>
                <span>Nombre del paciente</span>
                <input
                  required
                  maxLength={200}
                  value={form.patientName}
                  onChange={(e) =>
                    setForm({ ...form, patientName: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Patient ID</span>
                <input
                  required
                  maxLength={100}
                  value={form.patientIdDicom}
                  onChange={(e) =>
                    setForm({ ...form, patientIdDicom: e.target.value })
                  }
                />
              </label>
              <label className="ancho">
                <span>DescripciÃ³n del estudio</span>
                <input
                  maxLength={200}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Ej. TC de crÃ¡neo sin contraste"
                />
              </label>
              <label>
                <span>NÃºmero de acceso</span>
                <input
                  maxLength={100}
                  value={form.accessionNumber}
                  onChange={(e) =>
                    setForm({ ...form, accessionNumber: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Fecha del estudio (dÃ­a/mes/aÃ±o)</span>
                <input
                  type="date"
                  lang="es-BO"
                  value={
                    /^\d{8}$/.test(form.fechaEstudio)
                      ? `${form.fechaEstudio.slice(0, 4)}-${form.fechaEstudio.slice(4, 6)}-${form.fechaEstudio.slice(6, 8)}`
                      : ""
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fechaEstudio: e.target.value.replaceAll("-", ""),
                    })
                  }
                />
              </label>
            </div>
            <p className="orthanc-modal-aviso">
              Modificar Patient ID puede cambiar la identidad DICOM del estudio.
              Verifica cuidadosamente al paciente antes de guardar.
            </p>
            <footer>
              <button
                type="button"
                disabled={guardando}
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="principal" disabled={guardando}>
                <Icon name="check" size={16} />
                {guardando ? "Actualizando Orthancâ€¦" : "Guardar cambios"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

