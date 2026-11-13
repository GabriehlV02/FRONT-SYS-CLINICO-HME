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
const salasPrueba = [
  { numero: "UCI", tipo: "Terapia intensiva", camas: ["A", "B", "C"] },
  { numero: "Recuperación", tipo: "Recuperación", camas: ["A", "B"] },
  ...[101, 102, 103].map((numero) => ({ numero: String(numero), tipo: "Sala VIP", camas: ["A"] })),
  ...[105, 106, 107, 108, 109, 110].map((numero) => ({ numero: String(numero), tipo: "Sala compartida", camas: ["A", "B"] })),
  ...[111, 112, 113].map((numero) => ({ numero: String(numero), tipo: "Habitación individual", camas: ["A"] })),
];

export function EnfermeraInternacionView({ subvista }: { subvista: Subvista }) {
  const registros = useInternacionesVinculadas();
  const registrosVista = registros.filter((registro) => !esPacienteUci(registro));
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
  const salasDisponibles = seleccionada && /uci|terapia intensiva|recuperaci/i.test(`${seleccionada.servicio ?? ""} ${seleccionada.tipoSala ?? ""} ${seleccionada.sala ?? ""}`)
    ? salasPrueba.filter((item) => item.tipo === "Terapia intensiva" || item.tipo === "Recuperación")
    : salasPrueba.filter((item) => item.tipo !== "Terapia intensiva" && item.tipo !== "Recuperación");
  const pendientes = registrosVista.filter(
    (item) => item.estado === "preinternacion",
  );
  const internados = registrosVista.filter((item) => item.estado === "confirmada");
  const altas = registrosVista.filter((item) => item.estado === "alta");
  const pacientesVisibles = subvista === "internados" ? internados : altas;
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const pacientesFiltrados = pacientesVisibles.filter(
    (item) =>
      !termino ||
      [item.paciente, item.ci, item.sala, item.cama, item.medico].some(
        (valor) => valor?.toLocaleLowerCase("es").includes(termino),
      ),
  );
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
      aria-label="Enfermería de internación"
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
                <em>Preinternación</em>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSeleccionada(item);
                  setSala("");
                  setCama("");
                }}
              >
                Asignar sala y cama
              </button>
            </article>
          ))}
        </section>
      )}
      <section className="internacion-listado">
        <div className="internacion-herramientas">
          <label>
            <Icon name="search" size={18} />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por paciente, CI, sala o cama"
              aria-label="Buscar paciente internado"
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
              <h3>Pacientes dados de alta este mes</h3>
            </div>
            <small>Historial cl?nico de altas confirmadas.</small>
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
        {subvista === "altas" && pacientesFiltrados.length > 0 && (
          <div className="internacion-altas-cabecera">
            <span>PACIENTE</span>
            <span>HISTORIA CLÍNICA</span>
            <span>MÉDICO RESPONSABLE</span>
            <span>SALA Y CAMA</span>
            <span>FECHA DE INGRESO</span>
            <span>FECHA DE ALTA</span>
            <span>ESTADO</span>
          </div>
        )}
        {pacientesFiltrados.length ? (
          pacientesFiltrados.map((item) =>
            subvista === "internados" ? (
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
            ) : (
              <article className="internacion-alta-fila" key={item.id}>
                <div className="internacion-paciente">
                  <span>
                    <Icon name="patient" size={18} />
                  </span>
                  <span>
                    <strong>{item.paciente}</strong>
                    <small>CI {item.ci}</small>
                  </span>
                </div>
                <strong>HC-{item.ci}</strong>
                <strong>{item.medico}</strong>
                <strong>
                  Sala {item.sala || "—"} · Cama {item.cama || "—"}
                </strong>
                <strong>{item.fechaIngreso || item.fecha}</strong>
                <strong>{item.fechaAlta || "Sin registro"}</strong>
                <em className="alta">Alta registrada</em>
              </article>
            ),
          )
        ) : !busqueda && subvista === "internados" ? null : (
          <div className="internacion-listado-vacio">
            <Icon
              name={subvista === "internados" ? "patient" : "check"}
              size={26}
            />
            <strong>
              {busqueda
                ? "No se encontraron coincidencias"
                : subvista === "internados"
                  ? "No hay pacientes internados"
                  : "No hay altas registradas"}
            </strong>
            <small>
              {busqueda
                ? "Prueba con otro nombre, CI, sala o cama."
                : subvista === "internados"
                  ? "Los ingresos confirmados aparecerán aquí."
                  : "Las altas médicas aparecerán aquí."}
            </small>
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
                <p>CONFIRMAR INTERNACIÓN</p>
                <h3 id="asignar-cama-titulo">{seleccionada.paciente}</h3>
                <small>
                  CI {seleccionada.ci}. Al confirmar se registrará como
                  internación y se habilitará su cuenta en Recepción.
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
                      <optgroup label="Recuperación · 2 camas">
                        {salasDisponibles.filter((item) => item.tipo === "Recuperación").map((item) => <option key={item.numero} value={item.numero}>Sala {item.numero}</option>)}
                      </optgroup>
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
                Confirmar ingreso
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
