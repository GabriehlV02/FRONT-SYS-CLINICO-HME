import { useInternacionesVinculadas } from "./useInternacionesVinculadas";
import { useMemo, useState, useSyncExternalStore } from "react";
import Icon from "../../radius/componentes/Icono";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";
import {
  obtenerEpisodios,
  suscribirEpisodios,
} from "../consultorio/registroHistoria";
import {
  leerInternaciones,
  suscribirInternaciones,
  actualizarInternacion,
  type RegistroInternacion,
} from "./registroInternaciones";
import {
  leerDescargos,
  codigoDescargo,
  anularDescargo,
  registrarRecepcionDescargo,
  suscribirDescargos,
} from "./registroDescargos";
import "./FarmaciaInternacionView.css";
import { PacientesDescargosView } from "./PacientesDescargosView";
import { DevolucionesFarmaciaView } from "./DevolucionesFarmaciaView";

type Subvista = "pacientes" | "historial" | "devoluciones" | "historialDevoluciones";
type EstadoFiltro = "todos" | "pendientes" | "recibidos" | "anulados";
const etiquetaEstado = (estado: SolicitudDescargo["estado"]) => estado === "pendiente" ? "En solicitud" : estado === "recibido" ? "Descargado" : "Anulado";
type SolicitudDescargo = {
  id: string;
  codigo: string;
  paciente: string;
  ci: string;
  medico: string;
  fecha: string;
  medicamentos: {
    id: string;
    nombre: string;
    dosis: string;
    frecuencia: string;
    cantidad: string;
    via: string;
  }[];
  estado: "pendiente" | "recibido" | "anulado";
  recibidoPor?: string;
  recibidoEn?: string;
};

const opcionesSubvista: {
  id: Subvista;
  nombre: string;
  icono: "package" | "patient";
}[] = [
  { id: "pacientes", nombre: "Pacientes", icono: "patient" },
  { id: "historial", nombre: "Historial de descargos", icono: "package" },
  { id: "devoluciones", nombre: "Devoluciones", icono: "package" },
  { id: "historialDevoluciones", nombre: "Historial de devoluciones", icono: "package" },
];

const textoNormalizado = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

function fechaParaEditar(fecha: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
  const partes = fecha.split("/");
  return partes.length === 3
    ? `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`
    : "";
}

function fechaVisible(fecha: string) {
  const fechaISO = fechaParaEditar(fecha);
  if (!fechaISO) return fecha || "Sin registrar";
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

function ubicacion(internacion: RegistroInternacion) {
  return `${internacion.sala ?? ""}${internacion.cama ?? ""}` || "Sin asignar";
}

export function FarmaciaInternacionView({ enfermera }: { enfermera: string }) {
  const [subvista, setSubvista] = useState<Subvista>("pacientes");
  const [pacienteCi, setPacienteCi] = useState<string | null>(null);
  const navegacion = (
    <HorizontalSubvistaNav
      className="recepcion-subvistas"
      ariaLabel="Subvistas de Descargos farmacia"
    >
      {opcionesSubvista.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={subvista === item.id ? "page" : undefined}
          className={subvista === item.id ? "activo" : ""}
          onClick={() => { setPacienteCi(null); setSubvista(item.id); }}
        >
          <span>
            <Icon name={item.icono} size={17} />
          </span>
          <strong>{item.nombre}</strong>
        </button>
      ))}
    </HorizontalSubvistaNav>
  );

  return (
    <section className="farmacia-internacion-vista">
      {navegacion}
      {subvista === "pacientes" && (pacienteCi
        ? <><button type="button" className="fi-volver-pacientes" onClick={() => setPacienteCi(null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M5 12h14" /></svg>Volver a pacientes</button><VistaDescargos enfermera={enfermera} pacienteCi={pacienteCi} /></>
        : <PacientesDescargosView abrir={setPacienteCi} />)}
      {subvista === "historial" && <VistaDescargos enfermera={enfermera} historial />}
      {subvista === "devoluciones" && <DevolucionesFarmaciaView responsable={enfermera} />}
      {subvista === "historialDevoluciones" && <DevolucionesFarmaciaView responsable={enfermera} historial />}
    </section>
  );
}

function VistaDescargos({ enfermera, historial = false, pacienteCi }: { enfermera: string; historial?: boolean; pacienteCi?: string }) {
  const internaciones = useInternacionesVinculadas();
  const episodios = useSyncExternalStore(
    suscribirEpisodios,
    obtenerEpisodios,
    obtenerEpisodios,
  );
  const estados = useSyncExternalStore(
    suscribirDescargos,
    leerDescargos,
    leerDescargos,
  );
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<EstadoFiltro>("todos");
  const [errorAccion, setErrorAccion] = useState("");
  const [seleccionada, setSeleccionada] = useState<SolicitudDescargo | null>(
    null,
  );
  const pacientesInternados = useMemo(
    () =>
      new Map(
        internaciones
          .filter((item) => item.estado === "confirmada")
          .map((item) => [
            item.ci,
            fechaParaEditar(item.fechaIngreso || item.fecha),
          ]),
      ),
    [internaciones],
  );
  const solicitudes = useMemo(
    () =>
      episodios.flatMap((episodio) => {
        const fechaIngreso = pacientesInternados.get(episodio.paciente.ci);
        if (!historial && !pacienteCi && !fechaIngreso) return [];
        if (pacienteCi && episodio.paciente.ci !== pacienteCi) return [];
        return episodio.recetas.flatMap((receta, indice) => {
          const medicamentos = receta.receta?.medicamentos ?? [];
          if (!medicamentos.length) return [];
          const id = receta.receta?.id || `${episodio.episodioId}-${indice}`;
          const fecha = receta.receta?.fecha || receta.fecha || episodio.fecha;
          const fechaSolicitud = fechaParaEditar(fecha);
          if (!historial && fechaIngreso && (!fechaSolicitud || fechaSolicitud < fechaIngreso)) return [];
          const estado = estados[id];
          if (historial && estado?.estado !== "recibido" && estado?.estado !== "anulado") return [];
          return [
            {
              id,
              codigo: codigoDescargo(id),
              paciente: episodio.paciente.paciente,
              ci: episodio.paciente.ci,
              medico: receta.medico || episodio.medico,
              fecha,
              medicamentos: medicamentos.map((item) => ({
                id: item.id,
                nombre: item.nombre,
                dosis: item.dosis,
                frecuencia: item.frecuencia,
                cantidad: item.cantidad,
                via: item.via,
              })),
              estado: estado?.estado ?? "pendiente",
              recibidoPor: estado?.recibidoPor,
              recibidoEn: estado?.recibidoEn,
            },
          ];
        });
      }),
    [episodios, estados, pacientesInternados, historial, pacienteCi],
  );
  const visibles = solicitudes.filter((solicitud) => {
    const coincideEstado =
      filtro === "todos" ||
      (filtro === "pendientes"
        ? solicitud.estado === "pendiente"
        : filtro === "recibidos" ? solicitud.estado === "recibido" : solicitud.estado === "anulado");
    const termino = textoNormalizado(busqueda.trim());
    const coincideBusqueda =
      !termino ||
      textoNormalizado(
        `${solicitud.codigo} ${solicitud.paciente} ${solicitud.ci} ${solicitud.medico} ${solicitud.medicamentos.map((item) => item.nombre).join(" ")}`,
      ).includes(termino);
    return coincideEstado && coincideBusqueda;
  });
  const pendientes = solicitudes.filter(
    (item) => item.estado === "pendiente",
  ).length;
  const recibidas = solicitudes.filter((item) => item.estado === "recibido").length;
  const anuladas = solicitudes.filter((item) => item.estado === "anulado").length;
  function cambiarEstado(solicitud: SolicitudDescargo, estado: "recibido" | "anulado") {
    if (!window.confirm(`${estado === "recibido" ? "Confirmar la descarga de" : "Anular"} ${solicitud.codigo}?`)) return;
    try {
      setErrorAccion("");
      if (estado === "recibido") registrarRecepcionDescargo(solicitud.id, enfermera);
      else anularDescargo(solicitud.id, enfermera);
      setSeleccionada(null);
    } catch (error) { setErrorAccion(error instanceof Error ? error.message : "No se pudo actualizar el descargo."); }
  }

  return (
    <section className="fi-panel" aria-label="Solicitudes de dispensación">
      <header className="fi-encabezado">
        <div>
          <p>FARMACIA · DESCARGOS</p>
          <h2>{historial ? "Historial de descargos" : "Descargos del paciente"}</h2>
          <small>
            {historial ? "Registro de descargos realizados y solicitudes anuladas." : `${solicitudes[0]?.paciente || "Paciente"} · CI ${pacienteCi || ""}`}
          </small>
        </div>
        <div className="fi-resumen">
          <span>
            <strong>{pendientes}</strong> en solicitud
          </span>
          <span>
            <strong>{recibidas}</strong> descargados
          </span>
          <span><strong>{anuladas}</strong> anulados</span>
        </div>
      </header>
      <div className="fi-controles">
        <label className="fi-buscador">
          <Icon name="search" size={17} />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar código de descargo, médico o producto"
            aria-label="Buscar solicitudes"
          />
        </label>
        <div
          className="fi-filtros"
          role="group"
          aria-label="Filtrar solicitudes"
        >
          {(
            [
              ["todos", "Todos"],
              ["pendientes", "En solicitud"],
              ["recibidos", "Descargados"],
              ["anulados", "Anulados"],
            ] as const
          ).map(([id, texto]) => (
            <button
              type="button"
              key={id}
              className={filtro === id ? "activo" : ""}
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>
      {errorAccion && <p className="fd-aviso" role="alert">{errorAccion}</p>}
      {visibles.length ? (
        <div className="fi-tabla-wrap">
          <table className="fi-tabla">
            <thead><tr><th>Código de descargo</th><th>Fecha de solicitud</th>{historial && <th>Paciente</th>}<th>Solicitante</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>{visibles.map((solicitud) => <tr key={solicitud.id}>
              <td><strong className="fi-codigo-descargo">{solicitud.codigo}</strong></td>
              <td>{fechaVisible(solicitud.fecha)}</td>
              {historial && <td>{solicitud.paciente}<small>CI {solicitud.ci}</small></td>}
              <td>{solicitud.medico || "Sin registrar"}</td>
              <td>{solicitud.medicamentos.length} productos</td>
              <td><span className={`fi-estado ${solicitud.estado}`}>{etiquetaEstado(solicitud.estado)}</span></td>
              <td><div className="fi-acciones-tabla">
                <button type="button" onClick={() => setSeleccionada(solicitud)}><Icon name="eye" size={15} /> Ver detalle</button>
                {solicitud.estado === "pendiente" && <>
                  <button type="button" onClick={() => cambiarEstado(solicitud, "recibido")}>Descargar</button>
                  <button type="button" onClick={() => cambiarEstado(solicitud, "anulado")}>Anular</button>
                </>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="fi-vacio">
          <span>
            <Icon name="package" size={27} />
          </span>
          <strong>
            {busqueda
              ? "No hay solicitudes que coincidan"
              : filtro === "pendientes"
                ? "No hay descargos pendientes"
                : filtro === "recibidos"
                  ? "Aún no hay descargos recibidos"
                  : "No hay solicitudes de dispensación"}
          </strong>
          <small>
            {busqueda
              ? "Prueba con otro paciente, CI, médico o producto."
              : "Cada solicitud del paciente aparecerá aquí con su código y estado."}
          </small>
        </div>
      )}
      {seleccionada && (
        <div
          className="fi-modal-fondo"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSeleccionada(null);
          }}
        >
          <section
            className="fi-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fi-detalle-titulo"
          >
            <header>
              <div>
                <p>{seleccionada.codigo}</p>
                <h3 id="fi-detalle-titulo">{seleccionada.paciente}</h3>
                <small>
                  CI {seleccionada.ci} · Médico {seleccionada.medico}
                </small>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={() => setSeleccionada(null)}
              >
                ×
              </button>
            </header>
            <dl>
              <div>
                <dt>Fecha</dt>
                <dd>{fechaVisible(seleccionada.fecha)}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {etiquetaEstado(seleccionada.estado)}
                </dd>
              </div>
            </dl>
            <h4>Medicamentos e insumos</h4>
            <ul>
              {seleccionada.medicamentos.map((item) => (
                <li key={item.id}>
                  <strong>{item.nombre}</strong>
                  <span>
                    {[
                      item.dosis,
                      item.via,
                      item.frecuencia,
                      item.cantidad && `Cantidad: ${item.cantidad}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
            <footer>
              <button
                type="button"
                className="fi-secundario"
                onClick={() => setSeleccionada(null)}
              >
                Cerrar
              </button>
              {seleccionada.estado === "pendiente" && (
                <button
                  type="button"
                  className="fi-primario"
                  onClick={() => {
                    cambiarEstado(seleccionada, "recibido");
                  }}
                >
                  Confirmar descargo
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

function VistaInternados() {
  const internaciones = useInternacionesVinculadas();
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState<RegistroInternacion | null>(
    null,
  );
  const [editando, setEditando] = useState<RegistroInternacion | null>(null);
  const [sala, setSala] = useState("");
  const [cama, setCama] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [error, setError] = useState("");
  const internados = internaciones.filter(
    (item) => item.estado === "confirmada",
  );
  const visibles = internados.filter((item) =>
    textoNormalizado(`${item.paciente} ${item.ci} ${ubicacion(item)}`).includes(
      textoNormalizado(busqueda.trim()),
    ),
  );

  const abrirEdicion = (internacion: RegistroInternacion) => {
    setEditando(internacion);
    setSala(internacion.sala ?? "");
    setCama(internacion.cama ?? "");
    setFechaIngreso(
      fechaParaEditar(internacion.fechaIngreso || internacion.fecha),
    );
    setError("");
  };
  const guardarEdicion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editando || !sala.trim() || !cama.trim() || !fechaIngreso) {
      setError("Completa la fecha de ingreso, la sala y la cama.");
      return;
    }
    try {
      actualizarInternacion(editando.id, {
        sala: sala.trim(),
        cama: cama.trim(),
        fechaIngreso,
      });
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    setEditando(null);
  };

  return (
    <section className="fi-panel" aria-label="Pacientes internados">
      <header className="fi-encabezado">
        <div>
          <p>FARMACIA · INTERNACIÓN</p>
          <h2>Pacientes internados</h2>
          <small>Consulta y administra los datos de ingreso y ubicación.</small>
        </div>
        <span className="fi-total">
          <Icon name="patient" size={17} /> {internados.length} internado
          {internados.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="fi-controles">
        <label className="fi-buscador">
          <Icon name="search" size={17} />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, CI o sala/cama"
            aria-label="Buscar pacientes internados"
          />
        </label>
      </div>
      {visibles.length ? (
        <div className="fi-tabla-wrap">
          <table className="fi-tabla">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CI</th>
                <th>Fecha de ingreso</th>
                <th>Sala / cama</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((internacion) => (
                <tr key={internacion.id}>
                  <td>
                    <strong>{internacion.paciente}</strong>
                  </td>
                  <td>{internacion.ci}</td>
                  <td>
                    {fechaVisible(
                      internacion.fechaIngreso || internacion.fecha,
                    )}
                  </td>
                  <td>
                    <span className="fi-ubicacion">
                      {ubicacion(internacion)}
                    </span>
                  </td>
                  <td>
                    <div className="fi-acciones-tabla">
                      <button
                        type="button"
                        onClick={() => setSeleccionada(internacion)}
                      >
                        <Icon name="eye" size={15} /> Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(internacion)}
                      >
                        <Icon name="edit" size={15} /> Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fi-vacio">
          <span>
            <Icon name="patient" size={27} />
          </span>
          <strong>
            {busqueda
              ? "No hay pacientes que coincidan"
              : "No hay pacientes internados"}
          </strong>
          <small>
            {busqueda
              ? "Prueba con otro nombre, CI o sala/cama."
              : "Los ingresos confirmados por Enfermería aparecerán en este listado."}
          </small>
        </div>
      )}
      {seleccionada && (
        <div
          className="fi-modal-fondo"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSeleccionada(null);
          }}
        >
          <section
            className="fi-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fi-paciente-titulo"
          >
            <header>
              <div>
                <p>DATOS DE INTERNACIÓN</p>
                <h3 id="fi-paciente-titulo">{seleccionada.paciente}</h3>
                <small>CI {seleccionada.ci}</small>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={() => setSeleccionada(null)}
              >
                ×
              </button>
            </header>
            <dl>
              <div>
                <dt>Fecha de ingreso</dt>
                <dd>
                  {fechaVisible(
                    seleccionada.fechaIngreso || seleccionada.fecha,
                  )}
                </dd>
              </div>
              <div>
                <dt>Sala / cama</dt>
                <dd>{ubicacion(seleccionada)}</dd>
              </div>
              <div>
                <dt>Médico responsable</dt>
                <dd>{seleccionada.medico || "Sin registrar"}</dd>
              </div>
              <div>
                <dt>Tipo de sala</dt>
                <dd>{seleccionada.tipoSala || "Sin registrar"}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{seleccionada.motivo || "Sin registrar"}</dd>
              </div>
              {seleccionada.observaciones && (
                <div>
                  <dt>Observaciones</dt>
                  <dd>{seleccionada.observaciones}</dd>
                </div>
              )}
            </dl>
            <footer>
              <button
                type="button"
                className="fi-secundario"
                onClick={() => setSeleccionada(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="fi-primario"
                onClick={() => {
                  setSeleccionada(null);
                  abrirEdicion(seleccionada);
                }}
              >
                <Icon name="edit" size={15} /> Editar internación
              </button>
            </footer>
          </section>
        </div>
      )}
      {editando && (
        <div className="fi-modal-fondo" role="presentation">
          <form
            className="fi-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fi-editar-titulo"
            onSubmit={guardarEdicion}
          >
            <header>
              <div>
                <p>ACTUALIZAR DATOS</p>
                <h3 id="fi-editar-titulo">{editando.paciente}</h3>
                <small>CI {editando.ci}</small>
              </div>
              <button
                type="button"
                aria-label="Cerrar edición"
                onClick={() => setEditando(null)}
              >
                ×
              </button>
            </header>
            {error && (
              <p className="fi-error" role="alert">
                {error}
              </p>
            )}
            <div className="fi-formulario">
              <label>
                Fecha de ingreso
                <input
                  type="date"
                  required
                  value={fechaIngreso}
                  onChange={(event) => setFechaIngreso(event.target.value)}
                />
              </label>
              <label>
                Sala
                <input
                  required
                  value={sala}
                  onChange={(event) => setSala(event.target.value)}
                  placeholder="Ej.: 107"
                />
              </label>
              <label>
                Cama
                <input
                  required
                  value={cama}
                  onChange={(event) => setCama(event.target.value)}
                  placeholder="Ej.: A"
                />
              </label>
            </div>
            <footer>
              <button
                type="button"
                className="fi-secundario"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="fi-primario">
                Guardar cambios
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
