import Icon from "../../radius/componentes/Icono";
import { obtenerPacientesTerapiaDemo } from "./terapiaIntensivaDemo";
import "./MedicoTerapiaIntensivaView.css";

export function MedicoTerapiaIntensivaView() {
  const pacientes = obtenerPacientesTerapiaDemo();

  return (
    <section
      className="uci-medico-vista"
      aria-label="Pacientes de terapia intensiva"
    >
      <header className="uci-medico-encabezado">
        <div>
          <p>UNIDAD DE CUIDADOS INTENSIVOS</p>
          <h2>Médico terapia intensiva</h2>
          <span>Pacientes asignados para seguimiento médico.</span>
        </div>
        <strong>{pacientes.length} pacientes</strong>
      </header>

      <div className="uci-medico-lista">
        {pacientes.map((paciente) => (
          <article className="uci-medico-paciente" key={paciente.id}>
            <div className="uci-medico-paciente-icono">
              <Icon name="patient" size={20} />
            </div>
            <div className="uci-medico-paciente-datos">
              <span>UCI · Cama {paciente.cama}</span>
              <h3>{paciente.paciente}</h3>
              <p>CI {paciente.ci} · Ingreso {paciente.fechaIngreso}</p>
              <small>{paciente.motivo}</small>
            </div>
            <div className="uci-medico-paciente-asignacion">
              <span>Médico asignado</span>
              <strong>{paciente.medico}</strong>
              <small>Seguimiento desde {paciente.hora}</small>
            </div>
            <span className="uci-medico-estado">En UCI</span>
          </article>
        ))}
      </div>
    </section>
  );
}
