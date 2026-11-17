import { AvisoTemporal } from "../../radius/componentes/AvisoTemporal";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Icon from "../../radius/componentes/Icono";
import {
  obtenerEpisodios,
  suscribirEpisodios,
  type DocumentoEpisodio,
  type MedicamentoReceta,
} from "./registroHistoria";
import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import "./RecetarioMedico.css";
import { abrirImpresionReceta, imprimirReceta } from "./imprimirReceta";
import { apiFetch } from "../../radius/api";
import type { ConsultaPrevia } from "./ventanaConsultaPrevia";

const nuevoMedicamento = (): MedicamentoReceta => ({
  id: crypto.randomUUID(),
  nombre: "",
  dosis: "",
  via: "",
  frecuencia: "",
  duracion: "",
  cantidad: "",
  indicaciones: "",
});
export function RecetarioMedico({
  paciente,
  medico,
  abierto,
  onAbrir,
  onCerrar,
  onGuardar,
  medicamentosIniciales = [],
  consultas = [],
  cargandoHistorial = false,
  errorHistorial = "",
}: {
  paciente: CitaConfirmada;
  medico: string;
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  onGuardar: (receta: DocumentoEpisodio) => void;
  medicamentosIniciales?: MedicamentoReceta[];
  consultas?: ConsultaPrevia[];
  cargandoHistorial?: boolean;
  errorHistorial?: string;
}) {
  const episodios = useSyncExternalStore(suscribirEpisodios, obtenerEpisodios);
  const recetasServidor = consultas.flatMap((consulta) => {
    const documentos = consulta.contenido.documentos;
    const recetasAtencion = (documentos?.recetas ?? []).map((receta, indice) => ({
      receta,
      fecha: receta.receta?.fecha || receta.fecha || consulta.fecha,
      medico: receta.medico || consulta.medico,
      id: `consulta-${consulta.citaId}-receta-${receta.receta?.id || indice}`,
      citaId: consulta.citaId,
    }));
    const medicamentos = [...new Set([
      ...(documentos?.ordenes ?? []).filter((orden) => orden.tipo === "Medicamento").map((orden) => orden.detalle),
      ...(consulta.contenido.ordenes ?? []).filter((orden) => / — Cada \d+ horas durante \d+ días$/.test(orden)),
    ])];
    if (medicamentos.length) recetasAtencion.push({
      receta: { tipo: "Medicamentos registrados en consulta", detalle: medicamentos.join("\n"), estado: "Registrados" },
      fecha: consulta.fecha,
      medico: consulta.medico,
      id: `consulta-${consulta.citaId}-medicamentos`,
      citaId: consulta.citaId,
    });
    return recetasAtencion;
  });
  const recetasLocales = episodios
    .filter((e) => paciente.pacienteId && e.paciente.pacienteId ? e.paciente.pacienteId === paciente.pacienteId : e.paciente.ci === paciente.ci)
    .flatMap((e) =>
      e.recetas.map((receta, indice) => ({
        receta,
        fecha: receta.receta?.fecha || receta.fecha || e.fecha,
        medico: receta.medico || e.medico,
        id: receta.receta?.id || `${e.episodioId}-${indice}`,
        citaId: String(e.paciente.id),
      })),
    );
  const recetas = [...recetasServidor, ...recetasLocales.filter((local) => !recetasServidor.some((servidor) => servidor.citaId === local.citaId && (local.receta.receta?.id ? servidor.receta.receta?.id === local.receta.receta.id : servidor.receta.detalle === local.receta.detalle)))].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const recetaSeleccionada = recetas.find((item) => item.id === seleccionada);
  const [mensaje, setMensaje] = useState("");
  const [errorImpresion, setErrorImpresion] = useState("");
  const reimprimir = (
    documento: DocumentoEpisodio,
    fecha: string,
    medicoReceta: string,
  ) => {
    const ventana = abrirImpresionReceta();
    if (!ventana) {
      setErrorImpresion(
        "Permite las ventanas emergentes para reimprimir la receta.",
      );
      return;
    }
    setErrorImpresion("");
    imprimirReceta(
      ventana,
      { ...documento, fecha: documento.fecha || fecha },
      paciente,
      medicoReceta,
    );
  };
  return (
    <section className="recetario-historial panel">
      <header>
        <div>
          <p>Recetario médico</p>
          <h3>Historial de recetas</h3>
          <small>
            {paciente.paciente} · CI {paciente.ci}
          </small>
        </div>
        <button type="button" onClick={onAbrir}>
          <Icon name="plus" size={16} /> Nueva receta
        </button>
      </header>
      {errorImpresion && (
        <p className="receta-error" role="alert">
          {errorImpresion}
        </p>
      )}
      {mensaje && <AvisoTemporal mensaje={mensaje} />}
      {errorHistorial && <p className="receta-error" role="alert">{errorHistorial}</p>}
      {cargandoHistorial && <p role="status">Cargando recetas de consultas anteriores...</p>}
      {recetas.length ? (
        <div className="recetario-paneles">
          <div className="recetario-panel-lista" aria-label="Recetas registradas">
            <div className="recetario-panel-titulo"><strong>Recetas registradas</strong><span>{recetas.length}</span></div>
            {recetas.map((item) => <button key={item.id} type="button" className="recetario-seleccion" aria-pressed={seleccionada === item.id} onClick={() => setSeleccionada(item.id)}>
              <span><strong>{item.fecha.includes("T") ? new Date(item.fecha).toLocaleString("es-BO", { timeZone: "America/La_Paz" }) : item.fecha.split("-").reverse().join("/")}</strong><small>{item.receta.tipo}</small><small>Médico: {item.medico || "Sin registrar"}</small></span>
              <Icon name="chevronRight" size={16} />
            </button>)}
          </div>
          {recetaSeleccionada ? <section className="recetario-panel-vista" aria-label="Detalle de la receta seleccionada">
            <header><div><small>RECETARIO MÉDICO · SOLO LECTURA</small><h3>{recetaSeleccionada.receta.tipo}</h3><p>{recetaSeleccionada.fecha.includes("T") ? new Date(recetaSeleccionada.fecha).toLocaleString("es-BO", { timeZone: "America/La_Paz" }) : recetaSeleccionada.fecha.split("-").reverse().join("/")} · {recetaSeleccionada.medico}</p></div><button type="button" onClick={() => reimprimir(recetaSeleccionada.receta, recetaSeleccionada.fecha, recetaSeleccionada.medico)}><Icon name="print" size={15} /> Reimprimir</button></header>
            <div className="recetario-panel-contenido"><h4>Medicamentos e indicaciones</h4>
              {recetaSeleccionada.receta.receta?.medicamentos.length ? <ul>{recetaSeleccionada.receta.receta.medicamentos.map((medicamento, indice) => <li key={`${medicamento.id}-${indice}`}><strong>{medicamento.nombre}</strong><p>{[["Dosis", medicamento.dosis], ["Vía", medicamento.via], ["Frecuencia", medicamento.frecuencia], ["Duración", medicamento.duracion], ["Cantidad", medicamento.cantidad], ["Indicaciones", medicamento.indicaciones]].filter(([, valor]) => valor).map(([etiqueta, valor]) => `${etiqueta}: ${valor}`).join(" · ")}</p></li>)}</ul> : <p className="recetario-panel-texto">{recetaSeleccionada.receta.detalle || "Sin indicaciones registradas."}</p>}
              {recetaSeleccionada.receta.receta?.indicaciones && <p className="recetario-panel-texto"><strong>Indicaciones generales:</strong> {recetaSeleccionada.receta.receta.indicaciones}</p>}
            </div>
          </section> : <div className="recetario-panel-vacio"><Icon name="fileText" size={28} /><strong>Selecciona una receta</strong><small>Elige una receta de la lista para ver su contenido.</small></div>}
        </div>
      ) : !cargandoHistorial && !errorHistorial ? (
        <div className="recetario-vacio">
          <Icon name="fileText" size={32} />
          <h4>Este paciente aún no tiene recetas</h4>
          <p>
            Las recetas que registres aparecerán aquí con su fecha y médico.
          </p>
          <button type="button" onClick={onAbrir}>
            Crear primera receta
          </button>
        </div>
      ) : null}
      {abierto && (
        <NuevaReceta
          key={paciente.ci}
          paciente={paciente}
          medico={medico}
          medicamentosIniciales={medicamentosIniciales}
          onCerrar={onCerrar}
          onGuardar={(receta) => {
            onGuardar(receta);
            setMensaje("Receta guardada en el historial del paciente.");
            onCerrar();
          }}
        />
      )}
    </section>
  );
}

type ProductoReceta = {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  unidad: string;
  categoria?: string;
  grupo?: string;
  via?: string;
};
const normalizarMedicamento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
function NuevaReceta({
  paciente,
  medico,
  onCerrar,
  onGuardar,
  medicamentosIniciales,
}: {
  paciente: CitaConfirmada;
  medico: string;
  onCerrar: () => void;
  onGuardar: (receta: DocumentoEpisodio) => void;
  medicamentosIniciales: MedicamentoReceta[];
}) {
  const dialogo = useRef<HTMLDialogElement>(null),
    formulario = useRef<HTMLFormElement>(null),
    buscador = useRef<HTMLInputElement>(null);
  const guardando = useRef(false);
  const [medicamentos, setMedicamentos] = useState<MedicamentoReceta[]>(() =>
    medicamentosIniciales.map((m) => ({ ...m, id: crypto.randomUUID() })),
  );
  const [borrador, setBorrador] = useState<MedicamentoReceta>(nuevoMedicamento);
  const [editando, setEditando] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<ProductoReceta[]>([]);
  const [cargando, setCargando] = useState(true),
    [errorCatalogo, setErrorCatalogo] = useState("");
  const [busqueda, setBusqueda] = useState(""),
    [busquedaAbierta, setBusquedaAbierta] = useState(false),
    [indice, setIndice] = useState(-1);
  const [error, setError] = useState(""),
    [aviso, setAviso] = useState("");
  const consulta = normalizarMedicamento(busqueda);
  const resultados = catalogo
    .filter(
      (p) =>
        consulta &&
        consulta
          .split(/\s+/)
          .every((palabra) =>
            normalizarMedicamento(`${p.nombre} ${p.codigo}`).includes(palabra),
          ),
    )
    .slice(0, 8);
  const cargarCatalogo = async () => {
    setCargando(true);
    setErrorCatalogo("");
    try {
      const respuesta = await apiFetch("/api/emergencias/catalogo");
      if (!respuesta.ok) throw new Error();
      const datos: unknown = await respuesta.json();
      if (!Array.isArray(datos)) throw new Error();
      setCatalogo(
        (datos as ProductoReceta[]).filter(
          (p) => p.tipo === "producto" && typeof p.nombre === "string",
        ),
      );
    } catch {
      setErrorCatalogo(
        "No se pudo consultar el catálogo. Puedes reintentar o utilizar el nombre escrito.",
      );
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    void cargarCatalogo();
  }, []);
  useEffect(() => {
    const foco = document.activeElement as HTMLElement | null;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogo.current?.showModal();
    return () => {
      document.body.style.overflow = previo;
      foco?.focus();
    };
  }, []);
  const nuevo = () => {
    setBorrador(nuevoMedicamento());
    setEditando(null);
    setBusqueda("");
    setBusquedaAbierta(false);
    setIndice(-1);
    setError("");
  };
  const elegir = (producto: ProductoReceta) => {
    setBorrador((actual) => ({
      ...actual,
      nombre: producto.nombre,
      via: producto.via || "",
      catalogoId: producto.id,
      codigo: producto.codigo,
      unidad: producto.unidad,
    }));
    setBusqueda(producto.nombre);
    setBusquedaAbierta(false);
    setIndice(-1);
  };
  const sucio = () =>
    Boolean(
      medicamentos.length ||
      borrador.nombre ||
      borrador.dosis ||
      borrador.frecuencia ||
      busqueda ||
      borrador.indicaciones,
    );
  const cerrar = () => {
    if (
      sucio() &&
      !window.confirm("¿Descartar la receta que estás preparando?")
    )
      return;
    dialogo.current?.close();
  };
  const agregar = () => {
    if (!formulario.current?.reportValidity()) return;
    if (!borrador.nombre.trim()) {
      setError("Selecciona un medicamento o confirma el nombre escrito.");
      return;
    }
    if (!borrador.dosis.trim() || !borrador.frecuencia.trim()) {
      setError("Completa la dosis y la frecuencia.");
      return;
    }
    const limpio = Object.fromEntries(
      Object.entries(borrador).map(([k, v]) => [k, v.trim()]),
    ) as MedicamentoReceta;
    setMedicamentos((actual) =>
      editando
        ? actual.map((m) => (m.id === editando ? limpio : m))
        : [...actual, limpio],
    );
    setAviso(
      editando
        ? "Cambios guardados en el medicamento."
        : "Medicamento agregado a la receta.",
    );
    nuevo();
    buscador.current?.focus();
  };
  const editar = (m: MedicamentoReceta) => {
    if (
      (borrador.nombre ||
        borrador.dosis ||
        borrador.frecuencia ||
        borrador.indicaciones ||
        busqueda) &&
      !window.confirm(
        "¿Descartar los cambios del formulario para editar este medicamento?",
      )
    )
      return;
    setBorrador({ ...m });
    setEditando(m.id);
    setBusqueda(m.nombre);
    setBusquedaAbierta(false);
    setError("");
    formulario.current?.scrollIntoView({ block: "start" });
    buscador.current?.focus();
  };
  const guardar = (imprimir = false) => {
    if (guardando.current) return;
    if (
      borrador.nombre ||
      borrador.dosis ||
      borrador.frecuencia ||
      borrador.indicaciones ||
      busqueda
    ) {
      setError(
        editando
          ? "Guarda los cambios del medicamento o cancela la edición antes de guardar la receta."
          : "Pulsa Agregar para incluir el medicamento que estás preparando.",
      );
      return;
    }
    if (!medicamentos.length) {
      setError("Agrega al menos un medicamento a la receta.");
      return;
    }
    const detalle = medicamentos
      .map(
        (m, i) =>
          `${i + 1}. ${m.nombre}\nDosis: ${m.dosis} · Frecuencia: ${m.frecuencia}${m.via ? ` · Vía: ${m.via}` : ""}${m.indicaciones ? `\nIndicaciones: ${m.indicaciones}` : ""}`,
      )
      .join("\n\n");
    const documento: DocumentoEpisodio = {
      tipo: "Receta médica",
      estado: "Emitida",
      medico,
      fecha: new Date().toISOString(),
      detalle,
      receta: {
        id: crypto.randomUUID(),
        fecha: new Date().toISOString(),
        medicamentos,
        indicaciones: "",
      },
    };
    const ventanaImpresion = imprimir ? abrirImpresionReceta() : null;
    if (imprimir && !ventanaImpresion) {
      setError(
        "Permite las ventanas emergentes para guardar e imprimir la receta.",
      );
      return;
    }
    guardando.current = true;
    try {
      onGuardar(documento);
    } catch {
      ventanaImpresion?.close();
      guardando.current = false;
      setError("No se pudo guardar la receta. Intenta nuevamente.");
      return;
    }
    if (ventanaImpresion)
      imprimirReceta(ventanaImpresion, documento, paciente, medico);
  };
  return createPortal(
    <dialog
      ref={dialogo}
      className="receta-modal receta-compositor"
      aria-labelledby="nueva-receta-titulo"
      onClose={onCerrar}
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
    >
      <header>
        <div>
          <small>Recetario médico</small>
          <h2 id="nueva-receta-titulo">Nueva receta</h2>
          <p>
            {paciente.paciente} · CI {paciente.ci}
          </p>
        </div>
        <button type="button" aria-label="Cerrar receta" onClick={cerrar}>
          <Icon name="close" size={22} />
        </button>
      </header>
      <div className="receta-contexto">
        <span>
          Médico: <strong>{medico}</strong>
        </span>
        <span>{new Date().toLocaleDateString("es-BO")}</span>
      </div>
      <div className="receta-compositor-contenido">
        <div className="receta-editor">
          <form
            ref={formulario}
            onSubmit={(e) => {
              e.preventDefault();
              agregar();
            }}
          >
            <div className="receta-seccion">
              <h3>{editando ? "Editar medicamento" : "Agregar medicamento"}</h3>
              <p>Busca el medicamento y completa su dosis y frecuencia.</p>
            </div>
            <div
              className="receta-buscador"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  setBusquedaAbierta(false);
              }}
            >
              <label htmlFor="receta-buscar">Buscar medicamento</label>
              <div className="receta-buscar-input">
                <Icon name="search" size={18} />
                <input
                  ref={buscador}
                  id="receta-buscar"
                  role="combobox"
                  aria-expanded={busquedaAbierta && Boolean(consulta)}
                  aria-controls="receta-coincidencias"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    busquedaAbierta && indice >= 0 && resultados[indice]
                      ? `receta-opcion-${indice}`
                      : undefined
                  }
                  value={busqueda}
                  autoComplete="off"
                  placeholder="Nombre, presentación o código"
                  onFocus={() => setBusquedaAbierta(true)}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setBorrador((actual) => ({
                      ...nuevoMedicamento(),
                      id: actual.id,
                      dosis: actual.dosis,
                      frecuencia: actual.frecuencia,
                      indicaciones: actual.indicaciones,
                    }));
                    setBusquedaAbierta(true);
                    setIndice(-1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setBusquedaAbierta(true);
                      setIndice((i) =>
                        resultados.length
                          ? (i +
                              (e.key === "ArrowDown" ? 1 : -1) +
                              resultados.length) %
                            resultados.length
                          : -1,
                      );
                    }
                    if (
                      e.key === "Enter" &&
                      busquedaAbierta &&
                      indice >= 0 &&
                      resultados[indice]
                    ) {
                      e.preventDefault();
                      elegir(resultados[indice]);
                    }
                    if (e.key === "Escape" && busquedaAbierta) {
                      e.preventDefault();
                      e.stopPropagation();
                      setBusquedaAbierta(false);
                    }
                  }}
                />
              </div>
              {busquedaAbierta && consulta && (
                <div className="receta-opciones">
                  <ul
                    id="receta-coincidencias"
                    role="listbox"
                    aria-label="Medicamentos disponibles"
                  >
                    {resultados.map((p, i) => (
                      <li
                        id={`receta-opcion-${i}`}
                        key={p.id}
                        role="option"
                        aria-selected={indice === i}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseMove={() => setIndice(i)}
                        onClick={() => elegir(p)}
                      >
                        <strong>{p.nombre}</strong>
                        <small>
                          {p.codigo} · {p.unidad}
                        </small>
                      </li>
                    ))}
                  </ul>
                  {!resultados.length && (
                    <p>
                      {cargando
                        ? "Consultando catálogo…"
                        : "No se encontraron coincidencias."}
                    </p>
                  )}
                  {!cargando && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setBorrador((actual) => ({
                          ...actual,
                          nombre: busqueda.trim(),
                        }));
                        setBusquedaAbierta(false);
                      }}
                    >
                      Usar nombre escrito: {busqueda}
                    </button>
                  )}
                </div>
              )}
            </div>
            {cargando && (
              <p className="receta-catalogo-aviso" role="status">
                Cargando catálogo…
              </p>
            )}
            {errorCatalogo && (
              <p className="receta-catalogo-aviso">
                {errorCatalogo}{" "}
                <button type="button" onClick={() => void cargarCatalogo()}>
                  Reintentar
                </button>
              </p>
            )}
            {borrador.nombre && (
              <div className="receta-producto-seleccionado">
                <span>Medicamento seleccionado</span>
                <strong>{borrador.nombre}</strong>
                <small>
                  {[borrador.codigo, borrador.unidad, borrador.via]
                    .filter(Boolean)
                    .join(" · ") || "Registro manual"}
                </small>
              </div>
            )}
            <div className="receta-campos">
              <label>
                Dosis *
                <input
                  required
                  value={borrador.dosis}
                  onChange={(e) =>
                    setBorrador((actual) => ({
                      ...actual,
                      dosis: e.target.value,
                    }))
                  }
                  placeholder="Dosis por toma"
                />
              </label>
              <label>
                Frecuencia *
                <input
                  required
                  value={borrador.frecuencia}
                  onChange={(e) =>
                    setBorrador((actual) => ({
                      ...actual,
                      frecuencia: e.target.value,
                    }))
                  }
                  placeholder="Intervalo entre dosis"
                />
              </label>
            </div>
            <label className="receta-indicaciones">
              Indicaciones del medicamento
              <textarea
                value={borrador.indicaciones || ""}
                onChange={(e) =>
                  setBorrador((actual) => ({
                    ...actual,
                    indicaciones: e.target.value,
                  }))
                }
                placeholder="Cuidados o instrucciones para este medicamento (opcional)"
              />
            </label>
            <div className="receta-editor-acciones">
              {editando && (
                <button type="button" onClick={nuevo}>
                  Cancelar edición
                </button>
              )}
              <button type="submit" className="receta-agregar">
                <Icon name={editando ? "check" : "plus"} size={16} />
                {editando ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          </form>
        </div>
        <aside
          className="receta-resumen"
          aria-label="Medicamentos de la receta"
        >
          <header>
            <h3>Medicamentos agregados</h3>
            <span>{medicamentos.length}</span>
          </header>
          <p>Haz clic en un medicamento para corregir su indicación.</p>
          {medicamentos.length ? (
            <ol>
              {medicamentos.map((m, i) => (
                <li key={m.id} className={editando === m.id ? "editando" : ""}>
                  <button
                    type="button"
                    className="receta-item-editar"
                    onClick={() => editar(m)}
                    aria-label={`Editar ${m.nombre}`}
                    aria-pressed={editando === m.id}
                  >
                    <span className="receta-item-numero">{i + 1}</span>
                    <div>
                      <strong>{m.nombre}</strong>
                      <dl>
                        <div>
                          <dt>Dosis</dt>
                          <dd>{m.dosis}</dd>
                        </div>
                        <div>
                          <dt>Frecuencia</dt>
                          <dd>{m.frecuencia}</dd>
                        </div>
                      </dl>
                      {m.indicaciones && (
                        <p className="receta-item-indicaciones">
                          {m.indicaciones}
                        </p>
                      )}
                      <small>
                        {editando === m.id
                          ? "Editando este medicamento"
                          : "Clic para editar"}
                      </small>
                    </div>
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="receta-item-quitar"
                    aria-label={`Quitar ${m.nombre}`}
                    onClick={() => {
                      setMedicamentos((actual) =>
                        actual.filter((item) => item.id !== m.id),
                      );
                      if (editando === m.id) nuevo();
                    }}
                  >
                    <Icon name="trash" size={14} /> Quitar
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="receta-lista-vacia">
              <Icon name="fileText" size={30} />
              <strong>Tu receta empieza aquí</strong>
              <p>Busca un medicamento y pulsa Agregar para incluirlo.</p>
            </div>
          )}
        </aside>
      </div>
      <div className="receta-compositor-mensajes">
        {error && (
          <p className="receta-error" role="alert">
            {error}
          </p>
        )}
        {aviso && <AvisoTemporal mensaje={aviso} />}
      </div>
      <footer>
        <button type="button" onClick={cerrar}>
          Cancelar
        </button>
        <div className="receta-guardar-acciones">
          <button type="button" onClick={() => guardar()}>
            Guardar receta
          </button>
          <button type="button" onClick={() => guardar(true)}>
            <Icon name="print" size={16} /> Guardar e imprimir
          </button>
        </div>
      </footer>
    </dialog>,
    document.body,
  );
}
