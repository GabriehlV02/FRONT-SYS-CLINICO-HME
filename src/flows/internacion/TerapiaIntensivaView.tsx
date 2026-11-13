import { useState } from "react";
import Icon from "../../radius/componentes/Icono";
import { useInternacionesVinculadas } from "./useInternacionesVinculadas";
import { edadPaciente } from "../../radius/vistas/pacientes/pacientesApi";
import { esPacienteUci } from "./registroInternaciones";
import "./TerapiaIntensivaView.css";

const registroEnRecuperacion = (registro: { sala?: string; tipoSala?: string; servicio?: string }) =>
  /recuperaci/i.test(`${registro.sala ?? ""} ${registro.tipoSala ?? ""} ${registro.servicio ?? ""}`);

export function TerapiaIntensivaView() {
  const internaciones = useInternacionesVinculadas();
  const pacientes = internaciones.filter(
    (registro) => registro.estado === "confirmada" && esPacienteUci(registro),
  );
  const [seleccionado, setSeleccionado] = useState(pacientes[0]?.id ?? "");

  return (
    <section className="uci-monitorizacion" aria-label="Monitorización de terapia intensiva">
      <header className="uci-monitorizacion-cabecera">
        <div>
          <span>UNIDAD DE CUIDADOS INTENSIVOS</span>
          <h2>Monitorización de pacientes</h2>
          <p>Seguimiento de pacientes y disponibilidad por cubículo.</p>
        </div>
        <b>{pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}</b>
      </header>

      {pacientes.length ? (
        <div className="uci-monitorizacion-lista">
          {pacientes.map((paciente) => {
            const activo = seleccionado === paciente.id;
            return (
              <article className={`uci-monitorizacion-paciente${activo ? " activo" : ""}`} key={paciente.id}>
                <div className="uci-monitorizacion-cama">
                  <Icon name="bed" size={18} />
                  <span>{paciente.cama || paciente.sala || "Cama UCI"}</span>
                </div>
                <div className="uci-monitorizacion-identidad">
                  <small>Paciente</small>
                  <strong>{paciente.paciente}</strong>
                  <span>HC-{paciente.ci} · {paciente.datosPaciente?.nacimiento ? edadPaciente(paciente.datosPaciente.nacimiento) : "Edad sin registrar"} · {paciente.datosPaciente?.sexo || "Sexo sin registrar"}</span>
                </div>
                <div className="uci-monitorizacion-diagnostico">
                  <small>Diagnóstico / motivo</small>
                  <strong>{paciente.motivo || "Sin diagnóstico registrado"}</strong>
                  <span>Médico: {paciente.medico || "Sin asignar"}</span>
                </div>
                <div className="uci-monitorizacion-ingreso">
                  <small>Ingreso</small>
                  <strong>{paciente.horaIngreso || "Hora pendiente"}</strong>
                  <span>{paciente.fechaIngreso || paciente.fecha}</span>
                </div>
                <span className="uci-monitorizacion-estado"><i /> {registroEnRecuperacion(paciente) ? "En recuperación" : "En UCI"}</span>
                <button type="button" aria-pressed={activo} onClick={() => setSeleccionado(paciente.id)}>
                  <Icon name="monitorVitals" size={15} /> {activo ? "Monitorizando" : "Ver monitor"}
                </button>
                {activo && (
                  <section className="uci-monitorizacion-panel" aria-label={`Monitor de ${paciente.paciente}`}>
                    <div className="uci-monitorizacion-panel-titulo">
                      <div><small>MONITOR DEL PACIENTE</small><strong>{paciente.paciente} · {paciente.cama || paciente.sala}</strong></div>
                      <span><i /> Registro listo</span>
                    </div>
                    <div className="uci-monitorizacion-vitales">
                      <article><small>Frecuencia cardíaca</small><strong>— <em>lpm</em></strong><span>Sin toma registrada</span></article>
                      <article><small>SpO₂</small><strong>— <em>%</em></strong><span>Sin toma registrada</span></article>
                      <article><small>Frecuencia respiratoria</small><strong>— <em>rpm</em></strong><span>Sin toma registrada</span></article>
                      <article><small>Presión arterial</small><strong>— <em>mmHg</em></strong><span>Sin toma registrada</span></article>
                    </div>
                    <div className="uci-monitorizacion-senal" aria-label="Área de visualización de señales">
                      <div><span>ECG</span><small>La señal aparecerá cuando se registren mediciones del paciente.</small></div>
                      <svg viewBox="0 0 900 100" role="img" aria-label="Sin señal de monitorización registrada"><path d="M0 25H900M0 50H900M0 75H900M150 0V100M300 0V100M450 0V100M600 0V100M750 0V100" /></svg>
                    </div>
                    <p className="uci-monitorizacion-aviso"><Icon name="clipboardMedical" size={15} /> Esta ficha muestra datos de internación. Las mediciones se cargarán desde Registro de enfermería.</p>
                  </section>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="uci-monitorizacion-vacio">
          <Icon name="monitorVitals" size={24} />
          <strong>No hay pacientes asignados a terapia intensiva</strong>
          <span>Las internaciones activas de UCI aparecerán aquí.</span>
        </div>
      )}
    </section>
  );
}
