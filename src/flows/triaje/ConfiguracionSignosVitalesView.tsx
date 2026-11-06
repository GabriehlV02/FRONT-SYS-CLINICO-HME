import { useMemo, useRef, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { obtenerRangos, type RangoReferencia } from "./rangosReferencia";
import { SelectorUnidad } from "./SelectorUnidad";
import { ServiciosSignosVitales, useServiciosSignosVitales } from "./ServiciosSignosVitales";
import { UnidadesMedidaView, useUnidadesMedida, type UnidadMedida } from "./UnidadesMedidaView";
import "./ConfiguracionSignosVitalesView.css";
import "./ConfiguracionSignosVitalesViewEspacio.css";

export type SignoVitalConfig = {
  id: string;
  nombre: string;
  unidad: string;
  abreviatura: string;
  tipo: "Número entero" | "Número decimal" | "Texto";
  rangoReferencia?: RangoReferencia;
  componentes?: { id: string; nombre: string; rangoReferencia?: RangoReferencia | null }[];
};

export const signosVitalesIniciales: SignoVitalConfig[] = [
  ["temperatura", "Temperatura", "Grados Celsius", "°C", "Número decimal"],
  [
    "glicemia",
    "Glicemia capilar",
    "Miligramos por decilitro",
    "mg/dL",
    "Número entero",
  ],
  [
    "frecuenciaCardiaca",
    "Frecuencia cardíaca",
    "Pulsaciones por minuto",
    "P/min",
    "Número entero",
  ],
  [
    "frecuenciaRespiratoria",
    "Frecuencia respiratoria",
    "Respiraciones por minuto",
    "Res/min",
    "Número entero",
  ],
  [
    "presionSistolica",
    "Presión sistólica",
    "Milímetros de mercurio",
    "mmHg",
    "Número entero",
  ],
  [
    "presionDiastolica",
    "Presión diastólica",
    "Milímetros de mercurio",
    "mmHg",
    "Número entero",
  ],
  [
    "saturacionAmbiente",
    "Saturación ambiente",
    "Porcentaje",
    "%",
    "Número entero",
  ],
  ["oxigeno", "Oxígeno", "Litros", "L", "Número decimal"],
  [
    "saturacionOxigeno",
    "Saturación con oxígeno",
    "Porcentaje",
    "%",
    "Número entero",
  ],
  [
    "perimetroCintura",
    "Perímetro de cintura",
    "Centímetros",
    "cm",
    "Número decimal",
  ],
  [
    "perimetroCadera",
    "Perímetro de cadera",
    "Centímetros",
    "cm",
    "Número decimal",
  ],
  ["peso", "Peso", "Kilogramos", "kg", "Número decimal"],
  ["estatura", "Estatura", "Centímetros", "cm", "Número decimal"],
  ["imc", "IMC", "Índice de masa corporal", "kg/m²", "Número decimal"],
].map(([id, nombre, unidad, abreviatura, tipo]) => ({
  id,
  nombre,
  unidad,
  abreviatura,
  tipo: tipo as SignoVitalConfig["tipo"],
}));

type Formulario = Omit<SignoVitalConfig, "id">;
const vacio: Formulario = {
  nombre: "",
  unidad: "",
  abreviatura: "",
  tipo: "Número decimal",
};
const abreviaturasUnidades: Record<string, string> = {
  "Grados Celsius": "°C",
  "Grados Fahrenheit": "°F",
  Kelvin: "K",
  "Pulsaciones por minuto": "P/min",
  "Latidos por minuto": "lpm",
  "Respiraciones por minuto": "Res/min",
  "Milímetros de mercurio": "mmHg",
  "Centímetros de agua": "cmH₂O",
  "Milímetros de agua": "mmH₂O",
  Kilopascales: "kPa",
  Porcentaje: "%",
  Kilogramos: "kg",
  Gramos: "g",
  Libras: "lb",
  Onzas: "oz",
  Metros: "m",
  Centímetros: "cm",
  Milímetros: "mm",
  Pulgadas: "in",
  Pies: "ft",
  "Índice de masa corporal": "kg/m²",
  "Metros cuadrados": "m²",
  Litros: "L",
  Mililitros: "mL",
  "Litros por minuto": "L/min",
  "Mililitros por minuto": "mL/min",
  "Mililitros por hora": "mL/h",
  "Mililitros por kilogramo por hora": "mL/kg/h",
  "Mililitros por kilogramo": "mL/kg",
  "Miligramos por decilitro": "mg/dL",
  "Miligramos por litro": "mg/L",
  "Gramos por decilitro": "g/dL",
  "Milimoles por litro": "mmol/L",
  Segundos: "s",
  Milisegundos: "ms",
  Minutos: "min",
  Puntos: "pts",
  "Escala numérica": "pts",
  "Sin unidad": "s/u",
};
function EditorSignosVitalesView({
  signos,
  onChange,
  unidadesRegistradas,
}: {
  signos: SignoVitalConfig[];
  onChange: (signos: SignoVitalConfig[]) => Promise<void>;
  unidadesRegistradas: UnidadMedida[];
}) {
  const [multiples, setMultiples] = useState(false);
  const [componentes, setComponentes] = useState<{id:string; nombre:string; minimo:string; maximo:string}[]>([]);
  const [nombreRango, setNombreRango] = useState("");
  const [seleccionRango, setSeleccionRango] = useState("personalizado");
  const [detalleRango, setDetalleRango] = useState<
    Pick<RangoReferencia, "fuente" | "contexto">
  >({});
  const [conRango, setConRango] = useState(false);
  const [minimo, setMinimo] = useState("");
  const [maximo, setMaximo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const abreviaturas = {
    ...abreviaturasUnidades,
    ...Object.fromEntries(
      signos
        .filter((s) => s.unidad.trim() && s.abreviatura.trim())
        .map((s) => [s.unidad.trim(), s.abreviatura.trim()]),
    ),
    ...Object.fromEntries(unidadesRegistradas.map((unidad) => [unidad.nombre, unidad.abreviatura])),
  };
  const unidades = Array.from(
    new Set(
      [
        ...unidadesRegistradas.map((unidad) => unidad.nombre),
        ...signos.filter((s) => s.id === editando).map((s) => s.unidad),
      ]
        .map((unidad) => unidad.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const modal = useRef<HTMLDialogElement>(null);
  const modalAreas = useRef<HTMLDialogElement>(null);
  const [formulario, setFormulario] = useState<Formulario>(vacio);
  const [busqueda, setBusqueda] = useState("");
  const sugerencias = obtenerRangos(formulario.unidad, signos);
  const limpiarRango = () => {
    setConRango(false);
    setMinimo("");
    setMaximo("");
    setNombreRango("");
    setSeleccionRango("personalizado");
    setDetalleRango({});
  };
  const cambiarUnidad = (unidad: string) => {
    if (unidad !== formulario.unidad) limpiarRango();
    setFormulario((actual) => ({
      ...actual,
      unidad,
      abreviatura: abreviaturas[unidad] || "",
    }));
  };
  const elegirRango = (id: string) => {
    setError("");
    setSeleccionRango(id);
    setConRango(id !== "ninguno");
    const rango = sugerencias.find((r) => r.id === id);
    setNombreRango(rango?.nombre || "");
    setMinimo(rango ? String(rango.minimo) : "");
    setMaximo(rango ? String(rango.maximo) : "");
    setDetalleRango(
      rango ? { fuente: rango.fuente, contexto: rango.contexto } : {},
    );
    if (
      rango &&
      (!Number.isInteger(rango.minimo) || !Number.isInteger(rango.maximo))
    )
      actualizar("tipo", "Número decimal");
  };
  const personalizarRango = () => {
    setSeleccionRango("personalizado");
    setDetalleRango({});
  };
  const visibles = useMemo(
    () =>
      signos.filter((s) =>
        `${s.nombre} ${s.unidad} ${s.abreviatura} ${s.tipo}`
          .toLocaleLowerCase()
          .includes(busqueda.toLocaleLowerCase()),
      ),
    [busqueda, signos],
  );
  const actualizar = (campo: keyof Formulario, valor: string) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  const cancelar = () => {
    limpiarRango();
    setMultiples(false);
    setComponentes([]);
    setError("");
    setConRango(false);
    setMinimo("");
    setMaximo("");
    setFormulario(vacio);
    setEditando(null);
    modal.current?.close();
  };
  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    const datos: Formulario = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      unidad: formulario.unidad.trim(),
      abreviatura: formulario.abreviatura.trim(),
      rangoReferencia: undefined,
    };
    if (!datos.nombre || !unidades.includes(datos.unidad) || !datos.abreviatura) {
      setError("Completa el nombre y selecciona una unidad de medida registrada.");
      return;
    }
    if (
      signos.some(
        (s) =>
          s.id !== editando &&
          s.nombre.trim().toLocaleLowerCase() ===
            datos.nombre.toLocaleLowerCase(),
      )
    ) {
      setError("Ya existe un signo vital con ese nombre. Usa otro nombre.");
      return;
    }
    if (multiples) {
      if (componentes.length < 2 || componentes.some(c => !c.nombre.trim() || ((c.minimo !== "" || c.maximo !== "") && (c.minimo === "" || c.maximo === "" || Number(c.minimo) >= Number(c.maximo))))) {
        setError("Agrega al menos dos datos con nombre y rangos válidos.");
        return;
      }
      if (new Set(componentes.map(c => c.nombre.trim().toLocaleLowerCase())).size !== componentes.length) {
        setError("Cada dato debe tener un nombre diferente.");
        return;
      }
      datos.componentes = componentes.map(c => ({ id: c.id, nombre: c.nombre.trim(), rangoReferencia: c.minimo !== "" ? { nombre: c.nombre.trim(), minimo: Number(c.minimo), maximo: Number(c.maximo) } : undefined }));
    } else {
      datos.componentes = [];
    }
    if (!multiples && conRango && datos.tipo !== "Texto") {
      const min = Number(minimo),
        max = Number(maximo);
      if (
        !minimo.trim() ||
        !maximo.trim() ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min >= max
      ) {
        setError("El límite mínimo debe ser menor que el máximo.");
        return;
      }
      if (
        datos.tipo === "Número entero" &&
        (!Number.isInteger(min) || !Number.isInteger(max))
      ) {
        setError(
          "Para este tipo de dato, los límites deben ser números enteros.",
        );
        return;
      }
      if (!nombreRango.trim()) {
        setError("Introduce un nombre para el rango de referencia.");
        return;
      }
      datos.rangoReferencia = {
        minimo: min,
        maximo: max,
        nombre: nombreRango.trim(),
        ...detalleRango,
      };
    }
    setGuardando(true);
    try {
      if (editando)
        await onChange(signos.map((s) => (s.id === editando ? { ...s, ...datos } : s)));
      else
        await onChange([...signos, { ...datos, id: `signo-${crypto.randomUUID()}` }]);
      cancelar();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el signo vital.");
    } finally {
      setGuardando(false);
    }
  };
  const editar = (s: SignoVitalConfig) => {
    setMultiples(Boolean(s.componentes?.length));
    setComponentes((s.componentes || []).map(c => ({ id: c.id, nombre: c.nombre, minimo: c.rangoReferencia ? String(c.rangoReferencia.minimo) : "", maximo: c.rangoReferencia ? String(c.rangoReferencia.maximo) : "" })));
    setNombreRango(s.rangoReferencia?.nombre || s.nombre);
    setSeleccionRango("personalizado");
    setDetalleRango({
      fuente: s.rangoReferencia?.fuente,
      contexto: s.rangoReferencia?.contexto,
    });
    setError("");
    setEditando(s.id);
    setFormulario({
      nombre: s.nombre,
      unidad: s.unidad,
      abreviatura: s.abreviatura,
      tipo: s.tipo,
    });
    setConRango(Boolean(s.rangoReferencia));
    setMinimo(s.rangoReferencia ? String(s.rangoReferencia.minimo) : "");
    setMaximo(s.rangoReferencia ? String(s.rangoReferencia.maximo) : "");
    modal.current?.showModal();
  };
  return (
    <section
      className="config-signos"
      aria-label="Configuración de signos vitales"
    >
      <header className="config-signos-cabecera">
        <div>
          <p>CONFIGURACIÓN DE TRIAJE</p>
          <h2>Signos vitales</h2>
          <small>
            Define los campos disponibles al registrar la valoración del
            paciente.
          </small>
        </div>
        <span>{signos.length} campos activos</span>
      </header>
      <div className="config-signos-distribucion">
        <dialog
          ref={modal}
          className="config-signos-modal config-signos-modal-registro"
          aria-labelledby="config-signos-titulo"
          aria-describedby="config-signos-descripcion"
          onCancel={cancelar}
        >
          <form className="config-signos-formulario" onSubmit={guardar}>
            <header>
              <div>
                <strong id="config-signos-titulo">
                  {editando ? "Editar signo vital" : "Nuevo signo vital"}
                </strong>
                <small id="config-signos-descripcion">
                  Define cómo se registrará este dato en triaje.
                </small>
              </div>
              <button
                className="config-signos-cerrar"
                type="button"
                aria-label="Cerrar formulario"
                onClick={cancelar}
              >
                ×
              </button>
            </header>
            <p className="config-signos-ayuda">
              Los campos con * son obligatorios.
            </p>
            <label>
              Nombre del signo vital *
              <input
                autoFocus
                maxLength={80}
                value={formulario.nombre}
                onChange={(e) => actualizar("nombre", e.target.value)}
                placeholder="Ej. Temperatura corporal"
                required
              />
            </label>
            <SelectorUnidad
              valor={formulario.unidad}
              unidades={unidades}
              abreviaturas={abreviaturas}
              onChange={cambiarUnidad}
              onSelect={cambiarUnidad}
            />
            <label className="config-signos-multiples-toggle"><input type="checkbox" checked={multiples} onChange={(e) => { setMultiples(e.target.checked); if (e.target.checked && componentes.length === 0) setComponentes([{id:crypto.randomUUID(), nombre:"", minimo:"", maximo:""}, {id:crypto.randomUUID(), nombre:"", minimo:"", maximo:""}]); }} /> Este signo tiene varios datos</label>
            {multiples && <div className="config-signos-componentes"><strong>Datos de la medición</strong><small>Por ejemplo, presión sistólica y diastólica. Los rangos son opcionales y deben seguir el protocolo institucional.</small>{componentes.map((componente, indice) => <div className="config-signos-componente" key={componente.id}><label>Nombre del dato {indice + 1} *<input value={componente.nombre} maxLength={120} required onChange={e => setComponentes(actual => actual.map(c => c.id === componente.id ? {...c, nombre:e.target.value} : c))} placeholder="Ej. Sistólica" /></label><div className="config-signos-dos-campos"><label>Referencia mínima<input type="number" step="any" value={componente.minimo} onChange={e => setComponentes(actual => actual.map(c => c.id === componente.id ? {...c, minimo:e.target.value} : c))} /></label><label>Referencia máxima<input type="number" step="any" value={componente.maximo} onChange={e => setComponentes(actual => actual.map(c => c.id === componente.id ? {...c, maximo:e.target.value} : c))} /></label></div><button type="button" disabled={componentes.length <= 2} onClick={() => setComponentes(actual => actual.filter(c => c.id !== componente.id))}>Quitar dato</button></div>)}<button type="button" onClick={() => setComponentes(actual => [...actual, {id:crypto.randomUUID(), nombre:"", minimo:"", maximo:""}])} disabled={componentes.length >= 20}>+ Agregar dato</button></div>}
            {!multiples && <>
            <label>
              Rangos de referencia{" "}
              <select
                value={conRango ? seleccionRango : "ninguno"}
                disabled={formulario.tipo === "Texto"}
                onChange={(e) => elegirRango(e.target.value)}
              >
                <option value="ninguno">Sin rango de referencia</option>
                {sugerencias.length > 0 && (
                  <optgroup label="Rangos disponibles para esta unidad">
                    {sugerencias.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}: {r.minimo} – {r.maximo}{" "}
                        {formulario.abreviatura}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="personalizado">Crear rango personalizado</option>
              </select>
              <small>
                {formulario.tipo === "Texto"
                  ? "Los rangos solo están disponibles para datos numéricos."
                  : sugerencias.length
                    ? "Elige la medición y el contexto adecuados. Puedes modificar los límites y guardar el rango con otro nombre."
                    : "No hay una referencia general disponible para esta unidad. El peso, la talla, los volúmenes y otras medidas requieren un contexto específico; puedes crear tu propio rango."}
              </small>
            </label>
            {conRango && formulario.tipo !== "Texto" && (
              <label>
                Nombre del rango *
                <input
                  maxLength={100}
                  value={nombreRango}
                  onChange={(e) => {
                    setNombreRango(e.target.value);
                    personalizarRango();
                  }}
                  placeholder="Ej. Temperatura corporal - protocolo institucional"
                  required
                />
                <small>
                  Se guardará con el signo vital y podrás reutilizarlo en otros
                  campos con la misma unidad.
                </small>
              </label>
            )}
            {conRango && detalleRango.contexto && (
              <p className="config-signos-ayuda">
                {detalleRango.contexto}{" "}
                {detalleRango.fuente && (
                  <a
                    href={detalleRango.fuente}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar referencia
                  </a>
                )}
              </p>
            )}
            {conRango && formulario.tipo !== "Texto" && (
              <div className="config-signos-dos-campos">
                <label>
                  Límite mínimo *
                  <input
                    type="number"
                    step={formulario.tipo === "Número entero" ? "1" : "any"}
                    value={minimo}
                    onChange={(e) => {
                      setMinimo(e.target.value);
                      personalizarRango();
                    }}
                    required
                  />
                </label>
                <label>
                  Límite máximo *
                  <input
                    type="number"
                    step={formulario.tipo === "Número entero" ? "1" : "any"}
                    value={maximo}
                    onChange={(e) => {
                      setMaximo(e.target.value);
                      personalizarRango();
                    }}
                    required
                  />
                </label>
              </div>
            )}
            </>}
            <div className="config-signos-preview">
              <small>VISTA PREVIA DEL CAMPO</small>
              <strong>
                {formulario.nombre.trim() || "Nombre del signo vital"}
              </strong>
              {multiples ? <div className="config-signos-preview-multiples">{componentes.map((componente, indice) => <div className="config-signos-preview-grupo" key={componente.id}>{indice > 0 && <span className="config-signos-preview-separador" aria-hidden="true">/</span>}<span className="config-signos-preview-caja"><span>{componente.nombre || "Nombre del dato"}: 0</span><b>{formulario.abreviatura || "unidad"}</b></span></div>)}</div> : <span>
                {formulario.tipo === "Texto"
                  ? "Texto de ejemplo"
                  : formulario.tipo === "Número entero"
                    ? "80"
                    : "36.5"}{" "}
                <b>{formulario.abreviatura || "unidad"}</b>
              </span>}
              {!multiples && conRango && minimo && maximo && (
                <small>
                  {nombreRango || "Referencia"}: {minimo} – {maximo}{" "}
                  {formulario.abreviatura}
                </small>
              )}
            </div>
            {error && (
              <p className="config-signos-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <button
                className="config-signos-cancelar"
                type="button"
                onClick={cancelar}
              >
                Cancelar
              </button>
              <button className="config-signos-guardar" type="submit" disabled={guardando}>
                <Icon name="check" size={16} />
                {editando ? "Guardar cambios" : "Guardar signo vital"}
              </button>
            </footer>
          </form>
        </dialog>
        <dialog
          ref={modalAreas}
          className="config-signos-modal config-signos-modal-areas"
          aria-labelledby="config-signos-areas-titulo"
        >
          <section className="config-signos-areas-contenido">
            <header>
              <div>
                <strong id="config-signos-areas-titulo">Áreas de uso</strong>
                <small>Configura en qué áreas estará disponible este signo vital.</small>
              </div>
              <button
                className="config-signos-cerrar"
                type="button"
                aria-label="Cerrar áreas de uso"
                onClick={() => modalAreas.current?.close()}
              >
                ×
              </button>
            </header>
            <div className="config-signos-areas-vacio" />
          </section>
        </dialog>
        <section className="config-signos-lista">
          <header>
            <div className="config-signos-herramientas">
              <label>
                <Icon name="search" size={16} />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar signo vital"
                  aria-label="Buscar signo vital"
                />
              </label>
              <button
                className="config-signos-guardar"
                type="button"
                onClick={() => {
                  limpiarRango();
                  setFormulario(vacio);
                  setMultiples(false);
                  setComponentes([]);
                  setEditando(null);
                  setError("");
                  setConRango(false);
                  setMinimo("");
                  setMaximo("");
                  modal.current?.showModal();
                }}
              >
                <Icon name="plus" size={16} />
                Crear nuevo signo vital
              </button>
            </div>
          </header>
          <div className="config-signos-tabla">
            <div className="config-signos-encabezado">
              <span>Nombre</span>
              <span>Unidad de medición</span>
              <span>Abreviatura</span>
              <span>Datos / referencia</span>
              <span>Acciones</span>
            </div>
            {visibles.map((s) => (
              <article key={s.id}>
                <strong>{s.nombre}</strong>
                <span>{s.unidad}</span>
                <b>{s.abreviatura}</b>
                <em>{s.componentes?.length ? `${s.componentes.length} datos` : s.rangoReferencia ? `${s.rangoReferencia.minimo} – ${s.rangoReferencia.maximo}` : "Sin rango"}</em>
                <div>
                  <button
                    className="config-signos-accion-areas"
                    type="button"
                    onClick={() => modalAreas.current?.showModal()}
                    aria-label={`Configurar áreas para ${s.nombre}`}
                    title="Configurar áreas de uso"
                  >
                    <Icon name="building" size={15} />
                  </button>
                  <button
                    className="config-signos-accion-editar"
                    type="button"
                    onClick={() => editar(s)}
                    aria-label={`Editar ${s.nombre}`}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    className="config-signos-accion-eliminar"
                    type="button"
                    onClick={() => {
                      if (editando === s.id) cancelar();
                      void onChange(signos.filter((actual) => actual.id !== s.id)).catch((error: unknown) => window.alert(error instanceof Error ? error.message : "No se pudo eliminar el signo vital."));
                    }}
                    aria-label={`Eliminar ${s.nombre}`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </article>
            ))}
            {!visibles.length && (
              <p>No hay signos vitales que coincidan con la búsqueda.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export function ConfiguracionSignosVitalesView({ signos, onChange }: { signos: SignoVitalConfig[]; onChange: (signos: SignoVitalConfig[]) => Promise<void> }) {
  const [vistaConfiguracion, setVistaConfiguracion] = useState<'servicios' | 'signos' | 'unidades'>('servicios');
  const catalogoUnidades = useUnidadesMedida();
  const catalogoServicios = useServiciosSignosVitales();
  return <section className="config-signos-servicios" aria-label="Configuración de signos vitales"><nav className="config-signos-subvistas" aria-label="Subvistas de configuración"><button type="button" className={vistaConfiguracion === 'servicios' ? 'activa' : ''} onClick={() => setVistaConfiguracion('servicios')}>Servicios de atención</button><button type="button" className={vistaConfiguracion === 'signos' ? 'activa' : ''} onClick={() => setVistaConfiguracion('signos')}>Signos vitales</button><button type="button" className={vistaConfiguracion === 'unidades' ? 'activa' : ''} onClick={() => setVistaConfiguracion('unidades')}>Unidades de medida</button></nav>{vistaConfiguracion === 'unidades' ? <UnidadesMedidaView catalogo={catalogoUnidades} /> : vistaConfiguracion === 'signos' ? <><header><h2>Signos vitales</h2></header><EditorSignosVitalesView signos={signos} onChange={onChange} unidadesRegistradas={catalogoUnidades.unidades} /></> : <ServiciosSignosVitales signos={signos} catalogo={catalogoServicios} />}</section>;
}
