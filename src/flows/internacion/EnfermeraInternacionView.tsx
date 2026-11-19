import { useInternacionesVinculadas } from "./useInternacionesVinculadas";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AtencionEnfermeriaInternacion } from "./AtencionEnfermeriaInternacion";
import Icon from "../../radius/componentes/Icono";
import {
  camaDisponible,
  confirmarInternacion,
  esPacienteUci,
  leerInternaciones,
  suscribirInternaciones,
  type RegistroInternacion,
} from "./registroInternaciones";
import "./EnfermeraInternacionView.css";
import "./EnfermeraInternacionTabla.css";

type Subvista = "internados" | "altas";
const fechaAltaAISO = (fecha?: string) => {
  if (!fecha) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
  const partes = fecha.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return partes
    ? `${partes[3]}-${partes[2].padStart(2, "0")}-${partes[1].padStart(2, "0")}`
    : "";
};
const salasPrueba = [
  { numero: "UCI", tipo: "Terapia intensiva", camas: ["A", "B", "C"] },
  { numero: "Recuperación", tipo: "Recuperación", camas: ["A", "B"] },
  ...[101, 102, 103].map((numero) => ({ numero: String(numero), tipo: "Sala VIP", camas: ["A"] })),
  ...[105, 106, 107, 108, 109, 110].map((numero) => ({ numero: String(numero), tipo: "Sala compartida", camas: ["A", "B"] })),
  ...[111, 112, 113].map((numero) => ({ numero: String(numero), tipo: "Habitación individual", camas: ["A"] })),
];

export function EnfermeraInternacionView({ subvista, unidad = "internacion", soloPendientes = false }: { subvista: Subvista; unidad?: "internacion" | "uci"; soloPendientes?: boolean }) {
  const registros = useInternacionesVinculadas();
  const registrosVista = registros.filter((registro) => unidad === "uci" ? esPacienteUci(registro) : !esPacienteUci(registro));
  const [seleccionada, setSeleccionada] = useState<RegistroInternacion | null>(
    null,
  );
  const [atencionId, setAtencionId] = useState<string | null>(null);
  useEffect(() => {
    setAtencionId(null);
    setSeleccionada(null);
  }, [subvista]);
  const [sala, setSala] = useState("");
  const [cama, setCama] = useState("");
  const [tipoSala, setTipoSala] = useState("Sala compartida");
  const [busqueda, setBusqueda] = useState("");
  const [fechaAltaDesde, setFechaAltaDesde] = useState("");
  const [fechaAltaHasta, setFechaAltaHasta] = useState("");
  const [servicioAlta, setServicioAlta] = useState("");
  const [paginaAltas, setPaginaAltas] = useState(1);
  const [tamanoPaginaAltas, setTamanoPaginaAltas] = useState(10);
  const salasDisponibles = unidad === "uci"
    ? salasPrueba.filter((item) => item.tipo === "Terapia intensiva")
    : seleccionada && /uci|terapia intensiva|recuperaci/i.test(`${seleccionada.servicio ?? ""} ${seleccionada.tipoSala ?? ""} ${seleccionada.sala ?? ""}`)
      ? salasPrueba.filter((item) => item.tipo === "Terapia intensiva" || item.tipo === "Recuperación")
      : salasPrueba.filter((item) => item.tipo !== "Terapia intensiva" && item.tipo !== "Recuperación");
  const pendientes = registrosVista.filter(
    (item) => item.estado === "preinternacion",
  );
  const internados = registrosVista.filter((item) => item.estado === "confirmada");
  const altas = registrosVista.filter((item) => item.estado === "alta");
  const pacientesVisibles = subvista === "internados" ? internados : altas;
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const coincideBusqueda = (item: RegistroInternacion) =>
    !termino ||
    [item.paciente, item.ci, item.sala, item.cama, item.medico, item.servicio].some(
      (valor) => valor?.toLocaleLowerCase("es").includes(termino),
    );
  const pacientesFiltrados = pacientesVisibles.filter(
    (item) => coincideBusqueda(item),
  );
  const serviciosAlta = [...new Set(altas.map((item) => item.servicio?.trim()).filter((valor): valor is string => Boolean(valor)))].sort((a, b) => a.localeCompare(b, "es"));
  const altasFiltradas = altas.filter((item) => {
    const fecha = fechaAltaAISO(item.fechaAlta);
    return coincideBusqueda(item) &&
      (!fechaAltaDesde || (fecha && fecha >= fechaAltaDesde)) &&
      (!fechaAltaHasta || (fecha && fecha <= fechaAltaHasta)) &&
      (!servicioAlta || item.servicio === servicioAlta);
  });
  const totalPaginasAltas = Math.max(1, Math.ceil(altasFiltradas.length / tamanoPaginaAltas));
  const paginaAltasActual = Math.min(paginaAltas, totalPaginasAltas);
  const altasPagina = altasFiltradas.slice(
    (paginaAltasActual - 1) * tamanoPaginaAltas,
    paginaAltasActual * tamanoPaginaAltas,
  );
  useEffect(() => {
    setPaginaAltas(1);
  }, [subvista, busqueda, fechaAltaDesde, fechaAltaHasta, servicioAlta, tamanoPaginaAltas]);
  const ubicacionDisponible =
    !seleccionada ||
    !sala.trim() ||
    !cama.trim() ||
    camaDisponible(sala, cama, seleccionada.id);
  const camasSala = salasDisponibles.find((item) => item.numero === sala)?.camas ?? [];

  const seleccionarSala = (numero: string) => {
    const habitacion = salasDisponibles.find((item) => item.numero === numero);
    setSala(numero);
    setTipoSala(habitacion?.tipo ?? "Sala compartida");
    const primeraLibre = habitacion?.camas.find((camaDisponibleSala) =>
      camaDisponible(numero, camaDisponibleSala, seleccionada?.id),
    );
    setCama(primeraLibre ?? "");
  };

  const confirmar = () => {
    if (!seleccionada || !sala.trim() || !cama.trim()) return;
    if (!ubicacionDisponible) return;
    try {
      confirmarInternacion(seleccionada.id, {
        sala: sala.trim(),
        cama: cama.trim(),
        tipoSala,
      });
    } catch (error) {
      window.alert((error as Error).message);
      return;
    }
    setSeleccionada(null);
  };

  const pacienteAtendido = registrosVista.find(
    (item) => item.id === atencionId && item.estado === "confirmada",
  );
  if (pacienteAtendido && subvista === "internados") {
    return (
      <AtencionEnfermeriaInternacion
        key={pacienteAtendido.id}
        paciente={pacienteAtendido}
        onVolver={() => setAtencionId(null)}
      />
    );
  }

  return (
    <section
      className="internacion-enfermeria"
      aria-label={unidad === "uci" ? "Enfermería de terapia intensiva" : "Enfermería de internación"}
    >
      {subvista === "internados" && pendientes.length > 0 && (
        <section className="internacion-pendientes">
          <div>
            <strong>Preinternaciones pendientes</strong>
            <small>
              Una orden médica todavía no abre una cuenta. Confírmala asignando
              sala y cama.
            </small>
          </div>
          {pendientes.map((item) => (
            <article key={item.id}>
              <div>
                <b>{item.paciente}</b>
                <small>
                  CI {item.ci} · Orden de {item.medico}
                </small>
                {item.sala && <small>Sala reservada {item.sala} · {item.fechaIngreso || "Fecha pendiente"} · {item.horaIngreso || "Hora pendiente"}</small>}
                <em>Preinternación</em>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSeleccionada(item);
                  setSala(item.sala ?? "");
                  setCama("");
                }}
              >
                {item.origen === "Emergencias" ? "Recibir traslado" : "Asignar sala y cama"}
              </button>
            </article>
          ))}
        </section>
      )}
      <section className={`internacion-listado ${soloPendientes ? "internacion-listado-oculto" : ""}`}>
        <div className="internacion-herramientas">
          <label>
            <Icon name="search" size={18} />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder={subvista === "altas" ? "Buscar alta por paciente o CI" : "Buscar por paciente, CI, sala o cama"}
              aria-label={subvista === "altas" ? "Buscar paciente dado de alta" : "Buscar paciente internado"}
            />
          </label>
          {subvista === "internados" && (
            <button
              type="button"
              onClick={() => pendientes[0] && setSeleccionada(pendientes[0])}
            >
              <Icon name="plus" size={17} /> Internar paciente
            </button>
          )}
        </div>
        {subvista === "altas" && (
          <div className="internacion-listado-titulo">
            <div>
              <p>ALTAS HOSPITALARIAS</p>
              <h3>Historial de altas hospitalarias</h3>
            </div>
            <small>{altasFiltradas.length} de {altas.length} altas · pacientes fuera de internación</small>
          </div>
        )}
        {subvista === "altas" && (
          <div className="internacion-altas-filtros" aria-label="Filtros de altas hospitalarias">
            <label>
              Desde
              <input type="date" value={fechaAltaDesde} max={fechaAltaHasta || undefined} onChange={(evento) => setFechaAltaDesde(evento.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={fechaAltaHasta} min={fechaAltaDesde || undefined} onChange={(evento) => setFechaAltaHasta(evento.target.value)} />
            </label>
            <label>
              Servicio
              <select value={servicioAlta} onChange={(evento) => setServicioAlta(evento.target.value)}>
                <option value="">Todos los servicios</option>
                {serviciosAlta.map((servicio) => <option value={servicio} key={servicio}>{servicio}</option>)}
              </select>
            </label>
            {(fechaAltaDesde || fechaAltaHasta || servicioAlta) && (
              <button type="button" onClick={() => { setFechaAltaDesde(""); setFechaAltaHasta(""); setServicioAlta(""); }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
        {subvista === "internados" && pacientesFiltrados.length > 0 && (
          <div className="internacion-tabla-cabecera">
            <span>SALA</span>
            <span>CAMA</span>
            <span>PACIENTE</span>
            <span>HISTORIA CLÍNICA</span>
            <span>MÉDICO</span>
            <span>FECHA DE INGRESO</span>
            <span>ESTADO</span>
            <span>ACCIONES</span>
          </div>
        )}
        {subvista === "altas" ? (
          <div className="internacion-altas-tabla-scroll" role="region" aria-label="Tabla de altas hospitalarias" tabIndex={0}>
            <table className="internacion-altas-tabla">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Historia clínica</th>
                  <th>Médico responsable</th>
                  <th>Servicio</th>
                  <th>Sala y cama</th>
                  <th>Fecha de ingreso</th>
                  <th>Fecha de alta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {altasPagina.length ? altasPagina.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.paciente}</strong><small>CI {item.ci}</small></td>
                    <td>HC-{item.ci}</td>
                    <td>{item.medico || "Sin asignar"}</td>
                    <td>{item.servicio || "Sin especificar"}</td>
                    <td>Sala {item.sala || "—"} · Cama {item.cama || "—"}</td>
                    <td>{item.fechaIngreso || item.fecha || "—"}</td>
                    <td>{item.fechaAlta || "Sin registro"}</td>
                    <td><span className="internacion-alta-estado">Alta confirmada</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="internacion-altas-tabla-vacia">
                      <Icon name={altas.length ? "search" : "check"} size={24} />
                      <strong>{altas.length ? "No hay altas que coincidan con los filtros" : "Todavía no hay pacientes dados de alta"}</strong>
                      <small>{altas.length ? "Cambia la búsqueda o limpia los filtros para ver otros registros." : "Cuando se registre un alta hospitalaria, aparecerá aquí con su fecha y antecedentes de internación."}</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : pacientesFiltrados.length ? (
          pacientesFiltrados.map((item) =>
              <article className="internacion-fila-tabla" key={item.id}>
                <b className="internacion-chip">{item.sala || "—"}</b>
                <b className="internacion-chip">{item.cama || "—"}</b>
                <div className="internacion-paciente">
                  <span>
                    <Icon name="patient" size={18} />
                  </span>
                  <strong>{item.paciente}</strong>
                </div>
                <strong>HC-{item.ci}</strong>
                <strong>{item.medico}</strong>
                <strong>{item.fechaIngreso || item.fecha}</strong>
                <em>Internado</em>
                <button type="button" onClick={() => setAtencionId(item.id)}>
                  <Icon name="patient" size={16} /> Atender
                </button>
              </article>
          )
        ) : !busqueda ? null : (
          <div className="internacion-listado-vacio">
            <Icon name="patient" size={26} />
            <strong>No se encontraron coincidencias</strong>
            <small>Prueba con otro nombre, CI, sala o cama.</small>
          </div>
        )}
        {subvista === "altas" && (
          <div className="internacion-altas-paginacion" aria-label="Paginación de altas">
            <div>
              <label>Filas
                <select value={tamanoPaginaAltas} onChange={(evento) => setTamanoPaginaAltas(Number(evento.target.value))}>
                  {[10, 25, 50].map((cantidad) => <option value={cantidad} key={cantidad}>{cantidad}</option>)}
                </select>
              </label>
              <span>{altasFiltradas.length ? `${(paginaAltasActual - 1) * tamanoPaginaAltas + 1}–${Math.min(paginaAltasActual * tamanoPaginaAltas, altasFiltradas.length)} de ${altasFiltradas.length}` : "0 resultados"}</span>
            </div>
            <div>
              <button type="button" aria-label="Página anterior" disabled={paginaAltasActual <= 1} onClick={() => setPaginaAltas((pagina) => Math.max(1, pagina - 1))}>‹</button>
              <span>Página {paginaAltasActual} de {totalPaginasAltas}</span>
              <button type="button" aria-label="Página siguiente" disabled={paginaAltasActual >= totalPaginasAltas} onClick={() => setPaginaAltas((pagina) => Math.min(totalPaginasAltas, pagina + 1))}>›</button>
            </div>
          </div>
        )}
      </section>
      {seleccionada && (
        <div className="internacion-modal-fondo" role="presentation">
          <section
            className="internacion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asignar-cama-titulo"
          >
            <header>
              <div>
                <p>{seleccionada.origen === "Emergencias" ? "RECIBIR TRASLADO" : "CONFIRMAR INTERNACIÓN"}</p>
                <h3 id="asignar-cama-titulo">{seleccionada.paciente}</h3>
                <small>
                  {seleccionada.origen === "Emergencias"
                    ? `CI ${seleccionada.ci}. Revisa la sala y cama asignadas. El paciente ingresará a Internación solo cuando confirmes la recepción del traslado.`
                    : `CI ${seleccionada.ci}. Al confirmar se registrará como internación y se habilitará su cuenta en Recepción.`}
                </small>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSeleccionada(null)}
              >
                ×
              </button>
            </header>
            <div className="internacion-form">
              <label>
                Sala de internación
                <select
                  autoFocus
                  value={sala}
                  onChange={(event) => seleccionarSala(event.target.value)}
                >
                  <option value="">Seleccionar sala</option>
                  {salasDisponibles.some((item) => item.tipo === "Terapia intensiva") ? (
                    <>
                      <optgroup label="Terapia intensiva · 3 camas">
                        {salasDisponibles.filter((item) => item.tipo === "Terapia intensiva").map((item) => <option key={item.numero} value={item.numero}>Sala {item.numero}</option>)}
                      </optgroup>
                      {unidad !== "uci" && <optgroup label="Recuperación · 2 camas">
                        {salasDisponibles.filter((item) => item.tipo === "Recuperación").map((item) => <option key={item.numero} value={item.numero}>Sala {item.numero}</option>)}
                      </optgroup>}
                    </>
                  ) : (
                    <>
                      <optgroup label="Salas VIP · 1 cama">
                        {salasDisponibles.filter((item) => item.tipo === "Sala VIP").map((item) => <option key={item.numero} value={item.numero}>Sala {item.numero}</option>)}
                      </optgroup>
                      <optgroup label="Salas compartidas · 2 camas">
                        {salasDisponibles.filter((item) => item.tipo === "Sala compartida").map((item) => <option key={item.numero} value={item.numero}>Sala {item.numero}</option>)}
                      </optgroup>
                      <optgroup label="Salas individuales · 1 cama">
                        {salasDisponibles.filter((item) => item.tipo === "Habitación individual").map((item) => <option key={item.numero} value={item.numero}>Sala {item.numero}</option>)}
                      </optgroup>
                    </>
                  )}
                </select>
              </label>
              <label>
                Cama
                <select
                  value={cama}
                  onChange={(event) => setCama(event.target.value)}
                  disabled={!sala}
                >
                  <option value="">Seleccionar cama</option>
                  {camasSala.map((camaSala) => {
                    const ocupada = !camaDisponible(sala, camaSala, seleccionada?.id);
                    return <option key={camaSala} value={camaSala} disabled={ocupada}>Cama {camaSala}{ocupada ? " · Ocupada" : " · Disponible"}</option>;
                  })}
                </select>
              </label>
              <label>
                Tipo de sala
                <input value={sala ? tipoSala : "Selecciona una sala"} readOnly />
              </label>
            </div>
            {!ubicacionDisponible && (
              <p className="internacion-error" role="alert">
                Esta sala y cama están ocupadas. Selecciona una ubicación libre.
              </p>
            )}
            <footer>
              <button type="button" onClick={() => setSeleccionada(null)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={!sala.trim() || !cama.trim() || !ubicacionDisponible}
                onClick={confirmar}
              >
                {seleccionada.origen === "Emergencias" ? "Confirmar recepción e internación" : "Confirmar ingreso"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
