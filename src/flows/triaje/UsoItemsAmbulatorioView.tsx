import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Icon from "../../radius/componentes/Icono";
import {
  obtenerMovimientosItems,
  suscribirMovimientosItems,
} from "./registroUsoItems";
import "./UsoItemsAmbulatorioView.css";
import "./DescargoAmbulatorio.css";

const fechaVisible = (fecha: string) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString("es-BO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const horaVisible = (fechaHora: string) => fechaHora.slice(11, 16) || "—";
type ItemCatalogo = {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string;
};
type DescargoPendiente = ItemCatalogo & {
  estado: "Pendiente" | "Dispensado" | "Anulado";
  consultorio: string;
  medico: string;
  justificacion: string;
};
const catalogoItems: ItemCatalogo[] = [
  {
    id: "jeringa-5",
    nombre: "Jeringa descartable 5 ml",
    codigo: "INS-001",
    unidad: "unidad",
  },
  {
    id: "guantes-m",
    nombre: "Guantes de examen M",
    codigo: "INS-002",
    unidad: "par",
  },
  {
    id: "gasas",
    nombre: "Gasas estériles",
    codigo: "INS-003",
    unidad: "paquete",
  },
  {
    id: "suero",
    nombre: "Suero fisiológico 0,9%",
    codigo: "INS-004",
    unidad: "frasco",
  },
  {
    id: "paracetamol",
    nombre: "Paracetamol 500 mg",
    codigo: "MED-001",
    unidad: "tableta",
  },
];

export function UsoItemsAmbulatorioView() {
  const movimientos = useSyncExternalStore(
    suscribirMovimientosItems,
    obtenerMovimientosItems,
    obtenerMovimientosItems,
  );
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [registrando, setRegistrando] = useState(false);
  const [buscarCatalogo, setBuscarCatalogo] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const buscadorCatalogo = useRef<HTMLInputElement>(null);
  const [consultorioDestino, setConsultorioDestino] = useState("");
  const [medicoDestino, setMedicoDestino] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [pendientes, setPendientes] = useState<DescargoPendiente[]>([]);

  const visibles = useMemo(
    () =>
      movimientos
        .filter((movimiento) => {
          const fecha = movimiento.fechaHora.slice(0, 10);
          const texto =
            `${movimiento.item} ${movimiento.codigo} ${movimiento.paciente} ${movimiento.ci} ${movimiento.responsable}`.toLocaleLowerCase(
              "es",
            );
          return (
            (!desde || fecha >= desde) &&
            (!hasta || fecha <= hasta) &&
            (tipo === "Todos" || movimiento.tipo === tipo) &&
            texto.includes(busqueda.trim().toLocaleLowerCase("es"))
          );
        })
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
    [movimientos, desde, hasta, busqueda, tipo],
  );
  const dias = [
    ...new Set(visibles.map((movimiento) => movimiento.fechaHora.slice(0, 10))),
  ];
  const catalogoVisible = catalogoItems.filter((item) =>
    `${item.nombre} ${item.codigo}`
      .toLowerCase()
      .includes(buscarCatalogo.trim().toLowerCase()),
  );
  const agregarDescargo = () => {
    if (
      !itemSeleccionado ||
      !consultorioDestino ||
      !medicoDestino ||
      !justificacion.trim()
    )
      return;
    setPendientes((actual) => [...actual, {
      ...itemSeleccionado,
      estado: "Pendiente",
      consultorio: consultorioDestino,
      medico: medicoDestino,
      justificacion: justificacion.trim(),
    }]);
    setItemSeleccionado(null);
    setBuscarCatalogo("");
    setConsultorioDestino("");
    setMedicoDestino("");
    setJustificacion("");
    buscadorCatalogo.current?.focus();
  };

  return (
    <section
      className="uso-items-ambulatorio"
      aria-labelledby="uso-items-titulo"
    >
      <div className="uso-items-filtros">
        <label className="uso-items-buscar">
          <Icon name="search" size={17} />
          <input
            type="search"
            aria-label="Buscar usos de ítems"
            placeholder="Buscar ítem, paciente, CI o responsable"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </label>
        <label>
          Desde
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(evento) => setDesde(evento.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(evento) => setHasta(evento.target.value)}
          />
        </label>
        <label>
          Movimiento
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
          >
            <option>Todos</option>
            <option>Dispensado</option>
            <option>Utilizado</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setRegistrando(true)}
          style={{
            alignSelf: "end",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            height: 40,
            padding: "0 15px",
            border: 0,
            borderRadius: 8,
            background: "#0788bd",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="plus" size={17} /> Descargo ambulatorio
        </button>
      </div>
      <div className="uso-items-resumen">
        {visibles.length} {visibles.length === 1 ? "movimiento" : "movimientos"}{" "}
        en {dias.length} {dias.length === 1 ? "día" : "días"}
      </div>
      {dias.length ? (
        dias.map((dia) => (
          <section className="uso-items-dia" key={dia}>
            <header>
              <Icon name="calendar" size={17} />
              <h3>{fechaVisible(dia)}</h3>
              <span>
                {
                  visibles.filter((item) => item.fechaHora.startsWith(dia))
                    .length
                }{" "}
                descargos
              </span>
            </header>
            <div className="uso-items-tabla">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Ítem</th>
                    <th>Movimiento</th>
                    <th>Cantidad</th>
                    <th>Paciente</th>
                    <th>Enfermera responsable</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles
                    .filter((item) => item.fechaHora.startsWith(dia))
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{horaVisible(item.fechaHora)}</td>
                        <td>
                          <strong>{item.item}</strong>
                          {item.codigo && <small>{item.codigo}</small>}
                        </td>
                        <td>
                          <span
                            className={`uso-items-tipo ${item.tipo === "Dispensado" ? "dispensado" : "utilizado"}`}
                          >
                            {item.tipo}
                          </span>
                        </td>
                        <td>
                          {item.cantidad} {item.unidad}
                        </td>
                        <td>
                          <strong>{item.paciente}</strong>
                          {item.ci && <small>CI {item.ci}</small>}
                        </td>
                        <td>{item.responsable}</td>
                        <td>{item.observacion || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      ) : (
        <div className="uso-items-vacio">
          <Icon name="package" size={30} />
          <strong>
            {movimientos.length
              ? "Sin descargos para estos filtros"
              : "Aún no hay descargos registrados"}
          </strong>
          <span>
            {movimientos.length
              ? "Cambia la búsqueda o el rango de fechas."
              : "Registra cada ítem utilizado para conservar el historial diario de enfermería."}
          </span>
        </div>
      )}
      {registrando && (
        <div
          className="uso-items-fondo"
          onMouseDown={() => setRegistrando(false)}
        >
          <section
            className="uso-items-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="uso-items-form-titulo"
            onMouseDown={(evento) => evento.stopPropagation()}
            style={{ width: "min(100%, 1080px)" }}
          >
            <header>
              <div>
                <small>CONSULTA AMBULATORIA</small>
                <h3 id="uso-items-form-titulo">Descargo ambulatorio</h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setRegistrando(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 20,
                padding: 22,
              }}
            >
              <section>
                <strong>1. Seleccionar ítems</strong>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    margin: "12px 0",
                    padding: "0 10px",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 8,
                  }}
                >
                  <Icon name="search" size={16} />
                  <input
                    ref={buscadorCatalogo}
                    aria-label="Buscar ítem o código"
                    value={buscarCatalogo}
                    onChange={(e) => setBuscarCatalogo(e.target.value)}
                    placeholder="Buscar ítem o código"
                    style={{ width: "100%", height: 38, border: 0, outline: 0 }}
                  />
                </label>
                {!itemSeleccionado && buscarCatalogo.trim() && <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    maxHeight: 260,
                    overflow: "auto",
                  }}
                >
                  {catalogoVisible.map((item) => (
                    <button
                      type="button"
                      className="descargo-resultado"
                      key={item.id}
                      onClick={() => {
                        setItemSeleccionado(item);
                        setBuscarCatalogo(item.nombre);
                        setConsultorioDestino("");
                        setMedicoDestino("");
                        setJustificacion("");
                      }}
                    >
                      <span className="descargo-resultado-nombre">{item.nombre}</span>
                      <span className="descargo-resultado-detalle">{item.codigo} · {item.unidad}</span>
                    </button>
                  ))}
                  {!catalogoVisible.length && <p role="status">No se encontraron ítems.</p>}
                </div>}
              </section>
              {itemSeleccionado && <section>
                <strong>{itemSeleccionado.nombre}</strong>
                <button type="button" onClick={() => setItemSeleccionado(null)}>Cambiar ítem</button>
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <label>
                    Consultorio
                    <select
                      value={consultorioDestino}
                      onChange={(e) => setConsultorioDestino(e.target.value)}
                    >
                      <option value="">Seleccionar consultorio</option>
                      <option>Consultorio 1</option>
                      <option>Consultorio 2</option>
                      <option>Consultorio de procedimientos</option>
                    </select>
                  </label>
                  <label>
                    Médico
                    <select
                      value={medicoDestino}
                      onChange={(e) => setMedicoDestino(e.target.value)}
                    >
                      <option value="">Seleccionar médico</option>
                      <option>Dr. Ever Luizaga</option>
                      <option>Dra. María Salazar</option>
                      <option>Dr. Pablo Rojas</option>
                    </select>
                  </label>
                  <label>
                    Observación
                    <textarea
                      value={justificacion}
                      onChange={(e) => setJustificacion(e.target.value)}
                      placeholder="Indica el motivo del uso"
                    />
                  </label>
                  <button
                    type="button"
                    className="boton-principal"
                    disabled={
                      !itemSeleccionado ||
                      !consultorioDestino ||
                      !medicoDestino ||
                      !justificacion.trim()
                    }
                    onClick={agregarDescargo}
                    style={{
                      justifySelf: "start",
                      padding: "10px 15px",
                      border: 0,
                      borderRadius: 8,
                      color: "var(--primary-text)",
                      background: "var(--primary)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Añadir a la lista
                  </button>
                </div>
              </section>}
            </div>
            <section
              style={{
                margin: "0 22px 22px",
                border: "1px solid var(--border)",
                borderRadius: 9,
                overflow: "hidden",
              }}
            >
              <header style={{ padding: "11px 14px", background: "var(--panel-2)" }}>
                <strong>3. Ítems seleccionados</strong>
                <small style={{ marginLeft: 8 }}>
                  {pendientes.length} en la lista
                </small>
              </header>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Consultorio</th>
                    <th>Médico</th>
                    <th>Observación</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.length ? (
                    pendientes.map((item, indice) => (
                      <tr key={`${item.id}-${indice}`}>
                        <td>{item.nombre}</td>
                        <td>{item.consultorio}</td>
                        <td>{item.medico}</td>
                        <td>{item.justificacion}</td>
                        <td>
                          <select
                            value={item.estado}
                            onChange={(e) =>
                              setPendientes((actual) =>
                                actual.map((actualItem, posicion) =>
                                  posicion === indice
                                    ? {
                                        ...actualItem,
                                        estado: e.target
                                          .value as DescargoPendiente["estado"],
                                      }
                                    : actualItem,
                                ),
                              )
                            }
                          >
                            <option>Pendiente</option>
                            <option>Dispensado</option>
                            <option>Anulado</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: 24,
                          textAlign: "center",
                          color: "var(--muted)",
                        }}
                      >
                        Selecciona ítems, justifica el descargo y añádelos a la
                        lista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </section>
        </div>
      )}
    </section>
  );
}
