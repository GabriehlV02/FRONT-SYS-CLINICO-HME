import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiFetch } from "../../api";
import Icon from "../../componentes/Icono";
import type { Sesion } from "../../types/sesion";
import "./VistaAuditorias.css";
import AuditoriaVentas from "./AuditoriaVentas";
import AuditoriaAtencion from "./AuditoriaAtencion";
import AuditoriaItems from "./AuditoriaItems";

type SubvistaId =
  "usuarios" | "ventas" | "atencion" | "pacientes" | "farmacia" | "items";
type Usuario = {
  id: string;
  nombres: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  apellidos?: string | null;
  usuario: string;
  ci?: string | null;
  correo?: string | null;
  rol?: string | null;
  estado: "ACTIVO" | "INACTIVO";
  created_at?: string | null;
};
type Evento = {
  id: number;
  categoria: string;
  accion: string;
  metodo: string;
  ruta: string;
  ip?: string | null;
  created_at: string;
};
type PaginaEventos = {
  eventos: Evento[];
  pagina: number;
  ultimaPagina: number;
  total: number;
};

const subvistas: {
  id: SubvistaId;
  nombre: string;
  descripcion: string;
  icono: "users" | "cash" | "stethoscope" | "patient" | "pill" | "package";
}[] = [
  {
    id: "usuarios",
    nombre: "Usuarios",
    descripcion: "Cuentas, accesos y actividad realizada en el sistema.",
    icono: "users",
  },
  {
    id: "ventas",
    nombre: "Ventas",
    descripcion: "Cambios y operaciones de venta registrados.",
    icono: "cash",
  },
  {
    id: "atencion",
    nombre: "Atención",
    descripcion: "Actividad de atención clínica y emergencias.",
    icono: "stethoscope",
  },
  {
    id: "pacientes",
    nombre: "Pacientes",
    descripcion: "Consultas y modificaciones de fichas clínicas.",
    icono: "patient",
  },
  {
    id: "farmacia",
    nombre: "Farmacia",
    descripcion: "Movimientos de productos e inventario.",
    icono: "pill",
  },
  {
    id: "items",
    nombre: "Ítems",
    descripcion: "Auditoría de existencias, mínimos y vencimientos.",
    icono: "package",
  },
];

function fecha(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function nombreCompleto(usuario: Usuario) {
  return [
    usuario.nombres,
    usuario.apellido_paterno ?? usuario.apellidos,
    usuario.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");
}

function escaparHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}

function fechaImprimible(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export default function VistaAuditorias({ sesion }: { sesion: Sesion }) {
  const [subvista, setSubvista] = useState<SubvistaId>("usuarios");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroRol, setFiltroRol] = useState("TODOS");
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [errorEventos, setErrorEventos] = useState("");
  const [paginaEventos, setPaginaEventos] = useState(1);
  const [ultimaPaginaEventos, setUltimaPaginaEventos] = useState(1);
  const [totalEventos, setTotalEventos] = useState(0);
  const [modalExportar, setModalExportar] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState("");

  useEffect(() => {
    if (subvista !== "usuarios") return;
    const temporizador = window.setTimeout(() => {
      void cargarUsuarios();
    }, 250);
    return () => window.clearTimeout(temporizador);
  }, [subvista, busqueda, filtroEstado]);

  const cargarUsuarios = async () => {
    setCargando(true);
    setError("");
    const parametros = new URLSearchParams({ por_pagina: "100" });
    if (busqueda.trim()) parametros.set("buscar", busqueda.trim());
    if (filtroEstado !== "TODOS") parametros.set("estado", filtroEstado);
    try {
      const resultado: Usuario[] = [];
      let pagina = 1;
      let ultimaPagina = 1;
      do {
        parametros.set("page", String(pagina));
        const respuesta = await apiFetch(
          `/api/v1/usuarios?${parametros.toString()}`,
        );
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error();
        resultado.push(...(Array.isArray(datos.data) ? datos.data : []));
        ultimaPagina = datos.last_page || 1;
        pagina += 1;
      } while (pagina <= ultimaPagina);
      setUsuarios(resultado);
    } catch {
      setUsuarios([]);
      setError(
        "No se pudo cargar el listado de usuarios. Verifica tu permiso y la conexión con el servidor.",
      );
    } finally {
      setCargando(false);
    }
  };

  const cargarEventos = async (
    usuarioId: string,
    pagina = 1,
    anexar = false,
  ) => {
    setCargandoEventos(true);
    setErrorEventos("");
    try {
      const respuesta = await apiFetch(
        `/api/auditorias/usuarios/${encodeURIComponent(usuarioId)}/eventos?per_page=50&page=${pagina}`,
      );
      const datos = (await respuesta.json().catch(() => ({}))) as PaginaEventos;
      if (!respuesta.ok) throw new Error();
      setEventos((actuales) =>
        anexar ? [...actuales, ...(datos.eventos || [])] : datos.eventos || [],
      );
      setPaginaEventos(datos.pagina || pagina);
      setUltimaPaginaEventos(datos.ultimaPagina || 1);
      setTotalEventos(datos.total || 0);
    } catch {
      setEventos([]);
      setErrorEventos(
        "No se pudo cargar el historial de acciones de este usuario.",
      );
    } finally {
      setCargandoEventos(false);
    }
  };

  const verUsuario = (usuario: Usuario) => {
    setUsuarioActivo(usuario);
    setEventos([]);
    setPaginaEventos(1);
    setErrorEventos("");
    void cargarEventos(usuario.id);
  };

  const roles = useMemo(
    () =>
      [...new Set(usuarios.map((usuario) => usuario.rol || "Sin rol"))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [usuarios],
  );
  const usuariosVisibles = useMemo(
    () =>
      usuarios.filter(
        (usuario) =>
          filtroRol === "TODOS" || (usuario.rol || "Sin rol") === filtroRol,
      ),
    [usuarios, filtroRol],
  );
  const usuariosActivos = usuarios.filter(
    (usuario) => usuario.estado === "ACTIVO",
  ).length;
  const actual = subvistas.find((item) => item.id === subvista)!;

  const exportarPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!usuarioActivo) return;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setErrorExportar(
        "El navegador bloqueó la ventana del PDF. Permite ventanas emergentes para este sitio y vuelve a intentar.",
      );
      return;
    }
    ventana.document.write(
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Preparando historial…</title></head><body style="font:16px Arial,sans-serif;padding:32px;color:#163b58">Preparando el historial para exportar…</body></html>',
    );
    ventana.document.close();
    setExportando(true);
    setErrorExportar("");
    try {
      const todosLosEventos: Evento[] = [];
      let pagina = 1;
      let paginas = 1;
      do {
        const parametros = new URLSearchParams({
          per_page: "100",
          page: String(pagina),
          desde,
          hasta,
        });
        const respuesta = await apiFetch(
          `/api/auditorias/usuarios/${encodeURIComponent(usuarioActivo.id)}/eventos?${parametros.toString()}`,
        );
        const datos = (await respuesta
          .json()
          .catch(() => ({}))) as PaginaEventos;
        if (!respuesta.ok)
          throw new Error(
            "No se pudo obtener el historial para el rango seleccionado.",
          );
        todosLosEventos.push(...(datos.eventos || []));
        paginas = datos.ultimaPagina || 1;
        pagina += 1;
      } while (pagina <= paginas);

      const filas = todosLosEventos.length
        ? todosLosEventos
            .map(
              (evento) =>
                `<tr><td>${escaparHtml(fecha(evento.created_at))}</td><td>${escaparHtml(evento.accion)}</td><td>${escaparHtml(evento.categoria)}</td><td>${escaparHtml(evento.metodo)}</td><td>${escaparHtml(evento.ip || "—")}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="5" class="vacio">No hay acciones registradas en el rango seleccionado.</td></tr>';
      const nombre = escaparHtml(nombreCompleto(usuarioActivo));
      ventana.document.open();
      ventana.document
        .write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Historial de ${nombre}</title><style>
        *{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#193b56;margin:32px}header{border-bottom:2px solid #0b83bc;padding-bottom:16px;margin-bottom:20px}h1{font-size:21px;margin:0 0 8px}p{margin:4px 0;color:#526b80}.rango{margin-top:12px;font-weight:bold;color:#0879ae}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #d9e5ed;vertical-align:top}th{background:#edf6fb;text-transform:uppercase;font-size:9px;color:#45657e}.vacio{text-align:center;padding:28px;color:#627a8e}@media print{body{margin:15mm}thead{display:table-header-group}tr{break-inside:avoid}}
      </style></head><body><header><h1>Historial de actividad del usuario</h1><p><strong>${nombre}</strong> · @${escaparHtml(usuarioActivo.usuario)}</p><p>CI: ${escaparHtml(usuarioActivo.ci || "—")} · Rol: ${escaparHtml(usuarioActivo.rol || "Sin rol")}</p><p class="rango">Periodo: ${escaparHtml(fechaImprimible(desde))} al ${escaparHtml(fechaImprimible(hasta))} · ${todosLosEventos.length} acciones</p></header><table><thead><tr><th>Fecha y hora</th><th>Acción</th><th>Área</th><th>Operación</th><th>IP</th></tr></thead><tbody>${filas}</tbody></table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`);
      ventana.document.close();
      setModalExportar(false);
    } catch (cause) {
      ventana.close();
      setErrorExportar(
        cause instanceof Error ? cause.message : "No se pudo generar el PDF.",
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <section className="auditorias-vista">
      <nav className="auditorias-subvistas" aria-label="Secciones de auditoría">
        {subvistas.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`auditorias-subvista${subvista === item.id ? " activa" : ""}`}
            aria-current={subvista === item.id ? "page" : undefined}
            onClick={() => setSubvista(item.id)}
          >
            <Icon name={item.icono} size={18} />
            <span>{item.nombre}</span>
          </button>
        ))}
      </nav>

      <div className="auditorias-area-cabecera">
        <div className="auditorias-area-icono">
          <Icon name={actual.icono} size={21} />
        </div>
        <div>
          <h3>Auditoría de {actual.nombre.toLocaleLowerCase("es-BO")}</h3>
          <p>{actual.descripcion}</p>
        </div>
        {subvista === "usuarios" && (
          <span className="auditorias-conexion">
            Responsable: {sesion.usuario.nombre}
          </span>
        )}
      </div>

      {subvista === "usuarios" ? (
        <>
          <div className="auditoria-usuarios-resumen">
            <article>
              <span className="resumen-icono">
                <Icon name="users" size={18} />
              </span>
              <div>
                <small>Usuarios encontrados</small>
                <strong>{usuarios.length}</strong>
              </div>
            </article>
            <article>
              <span className="resumen-icono">
                <Icon name="userCheck" size={18} />
              </span>
              <div>
                <small>Activos en la lista</small>
                <strong>{usuariosActivos}</strong>
              </div>
            </article>
            <article>
              <span className="resumen-icono">
                <Icon name="audit" size={18} />
              </span>
              <div>
                <small>Coinciden con filtros</small>
                <strong>{usuariosVisibles.length}</strong>
              </div>
            </article>
          </div>

          <div className="auditoria-usuarios-herramientas">
            <label className="auditoria-usuarios-busqueda">
              <Icon name="search" size={17} />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre, usuario, CI o correo"
                aria-label="Buscar usuarios"
              />
            </label>
            <label>
              <span>Estado</span>
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </label>
            <label>
              <span>Rol</span>
              <select
                value={filtroRol}
                onChange={(event) => setFiltroRol(event.target.value)}
              >
                <option value="TODOS">Todos los roles</option>
                {roles.map((rol) => (
                  <option value={rol} key={rol}>
                    {rol}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p className="auditorias-error" role="alert">
              {error}
            </p>
          )}
          <div
            className="auditoria-usuarios-tabla"
            role="table"
            aria-label="Usuarios auditables"
          >
            <div className="auditoria-usuarios-fila encabezado" role="row">
              <span>Usuario</span>
              <span>CI</span>
              <span>Correo</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Acción</span>
            </div>
            {cargando ? (
              <div className="auditoria-usuarios-vacio">Cargando usuarios…</div>
            ) : usuariosVisibles.length ? (
              usuariosVisibles.map((usuario) => (
                <article
                  className="auditoria-usuarios-fila"
                  role="row"
                  key={usuario.id}
                >
                  <div className="auditoria-usuario-identidad">
                    <span>
                      <Icon name="userCheck" size={17} />
                    </span>
                    <div>
                      <strong>{nombreCompleto(usuario)}</strong>
                      <small>@{usuario.usuario}</small>
                    </div>
                  </div>
                  <span data-label="CI">{usuario.ci || "—"}</span>
                  <span data-label="Correo">{usuario.correo || "—"}</span>
                  <span data-label="Rol">
                    <i className="auditoria-rol">{usuario.rol || "Sin rol"}</i>
                  </span>
                  <span data-label="Estado">
                    <i
                      className={`auditoria-estado ${usuario.estado === "ACTIVO" ? "activo" : ""}`}
                    >
                      {usuario.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                    </i>
                  </span>
                  <button
                    className="auditoria-ver-usuario"
                    type="button"
                    onClick={() => verUsuario(usuario)}
                  >
                    <Icon name="eye" size={15} /> Ver
                  </button>
                </article>
              ))
            ) : (
              <div className="auditoria-usuarios-vacio">
                <Icon name="users" size={26} />
                <strong>No hay usuarios para mostrar</strong>
                <small>
                  {error
                    ? "Revisa la conexión del servicio."
                    : "Ajusta la búsqueda o los filtros."}
                </small>
              </div>
            )}
          </div>
        </>
      ) : subvista === "ventas" ? (
        <AuditoriaVentas />
      ) : subvista === "atencion" ? (
        <AuditoriaAtencion />
      ) : subvista === "items" ? (
        <AuditoriaItems />
      ) : (
        <section className="auditorias-panel auditorias-proximamente">
          <span className="auditorias-vacio-icono">
            <Icon name="audit" size={24} />
          </span>
          <h3>Registro de {actual.nombre.toLocaleLowerCase("es-BO")}</h3>
          <p>
            Esta sección está preparada para mostrar quién realizó cada acción,
            cuándo ocurrió y en qué registro del sistema.
          </p>
          <small>
            La fuente de eventos de esta área todavía no está conectada.
          </small>
        </section>
      )}

      {usuarioActivo && (
        <div
          className="auditoria-modal-fondo"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setUsuarioActivo(null);
          }}
        >
          <section
            className="auditoria-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auditoria-modal-titulo"
          >
            <header className="auditoria-modal-cabecera">
              <div className="auditoria-modal-avatar">
                <Icon name="users" size={22} />
              </div>
              <div className="auditoria-modal-identidad">
                <p>DETALLE DE CUENTA</p>
                <h2 id="auditoria-modal-titulo">
                  {nombreCompleto(usuarioActivo)}
                </h2>
                <small>@{usuarioActivo.usuario}</small>
              </div>
              <button
                className="auditoria-modal-cerrar"
                type="button"
                aria-label="Cerrar detalle"
                onClick={() => {
                  setUsuarioActivo(null);
                  setModalExportar(false);
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="auditoria-modal-datos">
              <div>
                <small>Documento</small>
                <strong>{usuarioActivo.ci || "No registrado"}</strong>
              </div>
              <div>
                <small>Correo</small>
                <strong>{usuarioActivo.correo || "No registrado"}</strong>
              </div>
              <div>
                <small>Rol</small>
                <strong>{usuarioActivo.rol || "Sin rol asignado"}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong>
                  <i
                    className={`auditoria-estado ${usuarioActivo.estado === "ACTIVO" ? "activo" : ""}`}
                  >
                    {usuarioActivo.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                  </i>
                </strong>
              </div>
              <div>
                <small>Cuenta creada</small>
                <strong>{fecha(usuarioActivo.created_at)}</strong>
              </div>
            </div>
            <div className="auditoria-historial-cabecera">
              <div>
                <h3>Acciones realizadas</h3>
                <small>{totalEventos} acciones registradas</small>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorExportar("");
                  setModalExportar(true);
                }}
              >
                <Icon name="download" size={16} /> Exportar historial
              </button>
            </div>
            {errorEventos && (
              <p className="auditorias-error" role="alert">
                {errorEventos}
              </p>
            )}
            <div className="auditoria-historial-lista">
              {cargandoEventos && eventos.length === 0 ? (
                <p className="auditorias-vacio">Cargando historial…</p>
              ) : eventos.length ? (
                eventos.map((evento) => (
                  <article className="auditoria-evento-fila" key={evento.id}>
                    <span className="auditoria-evento-marca">
                      <Icon name="check" size={14} />
                    </span>
                    <div className="auditoria-evento-detalle">
                      <strong>{evento.accion}</strong>
                      <small>
                        {evento.categoria.charAt(0).toUpperCase() +
                          evento.categoria.slice(1)}{" "}
                        · {evento.metodo} · {evento.ruta}
                      </small>
                      {evento.ip && <small>IP {evento.ip}</small>}
                    </div>
                    <time>{fecha(evento.created_at)}</time>
                  </article>
                ))
              ) : (
                <div className="auditoria-historial-vacio">
                  <Icon name="audit" size={24} />
                  <strong>Aún no hay acciones registradas</strong>
                  <small>Las operaciones completadas aparecerán aquí.</small>
                </div>
              )}
            </div>
            {paginaEventos < ultimaPaginaEventos && (
              <button
                className="auditoria-cargar-mas"
                type="button"
                disabled={cargandoEventos}
                onClick={() =>
                  void cargarEventos(usuarioActivo.id, paginaEventos + 1, true)
                }
              >
                {cargandoEventos ? "Cargando…" : "Cargar más acciones"}
              </button>
            )}
          </section>
        </div>
      )}

      {modalExportar && usuarioActivo && (
        <div
          className="auditoria-modal-fondo auditoria-exportar-fondo"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalExportar(false);
          }}
        >
          <form
            className="auditoria-exportar-modal"
            onSubmit={(event) => void exportarPdf(event)}
          >
            <header>
              <div>
                <p>EXPORTAR HISTORIAL</p>
                <h2>Selecciona el periodo</h2>
                <small>
                  Se incluirán las acciones de {nombreCompleto(usuarioActivo)}.
                </small>
              </div>
              <button
                type="button"
                className="auditoria-modal-cerrar"
                aria-label="Cerrar"
                onClick={() => setModalExportar(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="auditoria-exportar-fechas">
              <label>
                Desde
                <input
                  required
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(event) => setDesde(event.target.value)}
                />
              </label>
              <label>
                Hasta
                <input
                  required
                  type="date"
                  value={hasta}
                  min={desde || undefined}
                  onChange={(event) => setHasta(event.target.value)}
                />
              </label>
            </div>
            {errorExportar && (
              <p className="auditorias-error" role="alert">
                {errorExportar}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="auditoria-cancelar-exportar"
                onClick={() => setModalExportar(false)}
              >
                Cancelar
              </button>
              <button type="submit" disabled={exportando}>
                <Icon name="download" size={16} />
                {exportando ? "Preparando PDF…" : "Generar PDF"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
