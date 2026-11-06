import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../../api";
import Icon from "../../componentes/Icono";
import "./AuditoriaAtencion.css";

type Registro = {
  id: string;
  profesional_id: string | null;
  profesional: string;
  cargo: string;
  paciente_id: string;
  paciente: string;
  ci: string | null;
  servicio: string;
  fecha_hora: string;
};
type Opcion = {
  id: string;
  nombre: string;
  cargo?: string;
  ci?: string | null;
};
type Respuesta = {
  data: Registro[];
  current_page: number;
  last_page: number;
  total: number;
  profesionales: Opcion[];
  pacientes: Opcion[];
  servicios: string[];
};

const formatoFecha = (valor: string) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
const escapar = (valor: string) =>
  valor.replace(
    /[&<>"']/g,
    (caracter) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        caracter
      ] || caracter,
  );

export default function AuditoriaAtencion() {
  const [datos, setDatos] = useState<Respuesta>({
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
    profesionales: [],
    pacientes: [],
    servicios: [],
  });
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [profesional, setProfesional] = useState("");
  const [paciente, setPaciente] = useState("");
  const [servicio, setServicio] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalExportar, setModalExportar] = useState(false);
  const [exportarPor, setExportarPor] = useState<"paciente" | "profesional">(
    "profesional",
  );
  const [exportarId, setExportarId] = useState("");
  const [exportDesde, setExportDesde] = useState("");
  const [exportHasta, setExportHasta] = useState("");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => {
      const parametros = new URLSearchParams({
        page: String(pagina),
        per_page: "25",
      });
      if (busqueda.trim()) parametros.set("buscar", busqueda.trim());
      if (desde) parametros.set("fecha_desde", desde);
      if (hasta) parametros.set("fecha_hasta", hasta);
      if (profesional) parametros.set("profesional_id", profesional);
      if (paciente) parametros.set("paciente_id", paciente);
      if (servicio) parametros.set("servicio", servicio);
      setCargando(true);
      setError("");
      void apiFetch(`/api/auditorias/atencion?${parametros}`, {
        signal: controlador.signal,
      })
        .then(async (respuesta) => {
          const resultado = await respuesta.json();
          if (!respuesta.ok)
            throw new Error(
              resultado.message ||
                "No se pudo consultar la actividad asistencial.",
            );
          setDatos(resultado as Respuesta);
        })
        .catch((causa) => {
          if (!controlador.signal.aborted)
            setError(
              causa instanceof Error
                ? causa.message
                : "No se pudo consultar la actividad asistencial.",
            );
        })
        .finally(() => {
          if (!controlador.signal.aborted) setCargando(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [busqueda, desde, hasta, profesional, paciente, servicio, pagina]);

  const cambiar = (actualizar: (valor: string) => void) => (valor: string) => {
    actualizar(valor);
    setPagina(1);
  };
  const opcionesExportar =
    exportarPor === "paciente" ? datos.pacientes : datos.profesionales;
  const prepararExportacion = () => {
    setExportarPor(paciente ? "paciente" : "profesional");
    setExportarId(paciente || profesional || "");
    setExportDesde(desde);
    setExportHasta(hasta);
    setModalExportar(true);
  };

  const exportarPdf = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!exportarId) return;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setError("Permite ventanas emergentes para generar el PDF.");
      return;
    }
    ventana.document.write(
      '<!doctype html><html lang="es"><meta charset="utf-8"><body style="font:16px Arial;padding:30px">Preparando el registro…</body></html>',
    );
    ventana.document.close();
    setExportando(true);
    setError("");
    try {
      const registros: Registro[] = [];
      let page = 1;
      let pages = 1;
      do {
        const parametros = new URLSearchParams({
          page: String(page),
          per_page: "100",
          fecha_desde: exportDesde,
          fecha_hasta: exportHasta,
          [exportarPor === "paciente" ? "paciente_id" : "profesional_id"]:
            exportarId,
        });
        if (servicio) parametros.set("servicio", servicio);
        const respuesta = await apiFetch(
          `/api/auditorias/atencion?${parametros}`,
        );
        const resultado = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(resultado.message || "No se pudo preparar el PDF.");
        registros.push(...resultado.data);
        pages = resultado.last_page || 1;
        page += 1;
      } while (page <= pages);
      const detalle =
        exportarPor === "paciente"
          ? datos.pacientes.find((item) => item.id === exportarId)?.nombre
          : datos.profesionales.find((item) => item.id === exportarId)?.nombre;
      const filas = registros.length
        ? registros
            .map(
              (registro) =>
                `<tr><td>${escapar(registro.profesional)}</td><td>${escapar(registro.paciente)}</td><td>${escapar(registro.servicio)}</td><td>${escapar(formatoFecha(registro.fecha_hora))}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="4">Sin interacciones registradas para este periodo.</td></tr>';
      ventana.document.open();
      ventana.document.write(
        `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Registro asistencial</title><style>*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#193b56;margin:30px}header{padding-bottom:15px;border-bottom:2px solid #0586bf}h1{margin:0 0 8px;font-size:21px}p{color:#60788c}.conteo{color:#087caf;font-weight:bold}table{width:100%;margin-top:20px;border-collapse:collapse}th,td{padding:10px 8px;border-bottom:1px solid #d9e5ed;text-align:left}th{background:#eef7fb;text-transform:uppercase;font-size:9px}tr{break-inside:avoid}@media print{body{margin:14mm}thead{display:table-header-group}}</style></head><body><header><h1>Registro de atención por ${exportarPor === "paciente" ? "paciente" : "profesional"}</h1><p>${escapar(detalle || "")} · Periodo ${escapar(exportDesde)} al ${escapar(exportHasta)}</p><p class="conteo">${registros.length} interacciones · Solo profesional, paciente, servicio y hora</p></header><table><thead><tr><th>Profesional</th><th>Paciente</th><th>Servicio</th><th>Fecha y hora</th></tr></thead><tbody>${filas}</tbody></table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`,
      );
      ventana.document.close();
      setModalExportar(false);
    } catch (causa) {
      ventana.close();
      setError(
        causa instanceof Error ? causa.message : "No se pudo generar el PDF.",
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <section className="auditoria-atencion">
      <div className="auditoria-atencion-resumen">
        <article>
          <span>
            <Icon name="users" size={17} />
          </span>
          <div>
            <small>Interacciones encontradas</small>
            <strong>{datos.total}</strong>
          </div>
        </article>
        <article>
          <span>
            <Icon name="patient" size={17} />
          </span>
          <div>
            <small>Profesionales en la lista</small>
            <strong>{datos.profesionales.length}</strong>
          </div>
        </article>
        <button type="button" onClick={prepararExportacion}>
          <Icon name="download" size={17} /> Exportar historial
        </button>
      </div>
      <div className="auditoria-atencion-filtros">
        <label className="auditoria-atencion-buscar">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => cambiar(setBusqueda)(event.target.value)}
            placeholder="Buscar paciente o CI"
            aria-label="Buscar paciente"
          />
        </label>
        <label>
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(event) => cambiar(setDesde)(event.target.value)}
          />
        </label>
        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(event) => cambiar(setHasta)(event.target.value)}
          />
        </label>
        <label>
          <span>Profesional o personal</span>
          <select
            value={profesional}
            onChange={(event) => cambiar(setProfesional)(event.target.value)}
          >
            <option value="">Todos</option>
            {datos.profesionales.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre} · {item.cargo}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Paciente</span>
          <select
            value={paciente}
            onChange={(event) => cambiar(setPaciente)(event.target.value)}
          >
            <option value="">Todos</option>
            {datos.pacientes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
                {item.ci ? ` · CI ${item.ci}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Servicio</span>
          <select
            value={servicio}
            onChange={(event) => cambiar(setServicio)(event.target.value)}
          >
            <option value="">Todos los servicios</option>
            {datos.servicios.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="auditoria-atencion-error" role="alert">
          {error}
        </p>
      )}
      <div className="auditoria-atencion-tabla">
        <div className="auditoria-atencion-fila encabezado">
          <span>Profesional</span>
          <span>Paciente</span>
          <span>Servicio</span>
          <span>Fecha y hora</span>
        </div>
        {cargando ? (
          <div className="auditoria-atencion-vacio">Cargando actividad…</div>
        ) : datos.data.length ? (
          datos.data.map((registro) => (
            <article className="auditoria-atencion-fila" key={registro.id}>
              <div>
                <strong>{registro.profesional}</strong>
                <small>{registro.cargo}</small>
              </div>
              <div>
                <strong>{registro.paciente}</strong>
                <small>{registro.ci ? `CI ${registro.ci}` : "Paciente"}</small>
              </div>
              <span data-label="Servicio">{registro.servicio}</span>
              <time data-label="Fecha y hora">
                {formatoFecha(registro.fecha_hora)}
              </time>
            </article>
          ))
        ) : (
          <div className="auditoria-atencion-vacio">
            No hay actividad asistencial vinculada a pacientes para estos
            filtros.
          </div>
        )}
      </div>
      <footer className="auditoria-atencion-paginacion">
        <span>
          {datos.total} registros · Página {datos.current_page} de{" "}
          {datos.last_page}
        </span>
        <div>
          <button
            type="button"
            disabled={pagina <= 1 || cargando}
            onClick={() => setPagina((valor) => valor - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pagina >= datos.last_page || cargando}
            onClick={() => setPagina((valor) => valor + 1)}
          >
            Siguiente
          </button>
        </div>
      </footer>
      {modalExportar && (
        <div
          className="auditoria-atencion-capa"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalExportar(false);
          }}
        >
          <form
            className="auditoria-atencion-modal"
            onSubmit={(event) => void exportarPdf(event)}
          >
            <header>
              <div>
                <small>EXPORTAR TRAZABILIDAD</small>
                <h3>Elegir alcance</h3>
                <p>
                  El documento solo incluye quién atendió, a quién, en qué
                  servicio y a qué hora.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setModalExportar(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="auditoria-atencion-modal-opciones">
              <label>
                Exportar por
                <select
                  value={exportarPor}
                  onChange={(event) => {
                    const tipo = event.target.value as
                      "paciente" | "profesional";
                    setExportarPor(tipo);
                    setExportarId("");
                  }}
                >
                  <option value="profesional">Profesional o personal</option>
                  <option value="paciente">Paciente</option>
                </select>
              </label>
              <label>
                {exportarPor === "paciente" ? "Paciente" : "Profesional"}
                <select
                  required
                  value={exportarId}
                  onChange={(event) => setExportarId(event.target.value)}
                >
                  <option value="">Selecciona un registro</option>
                  {opcionesExportar.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Desde
                <input
                  required
                  type="date"
                  value={exportDesde}
                  max={exportHasta || undefined}
                  onChange={(event) => setExportDesde(event.target.value)}
                />
              </label>
              <label>
                Hasta
                <input
                  required
                  type="date"
                  value={exportHasta}
                  min={exportDesde || undefined}
                  onChange={(event) => setExportHasta(event.target.value)}
                />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setModalExportar(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={exportando}>
                <Icon name="download" size={16} />
                {exportando ? "Preparando…" : "Generar PDF"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
