import { obtenerPacientes } from "./almacenDemo";

export type CitaAgendaDemo = {
  id: string;
  pacienteId: string;
  paciente: string;
  ci: string;
  doctor: string;
  profesionalId?: string;
  especialidad: string;
  fecha: string;
  hora: string;
  estado: "confirmada" | "por_confirmar" | "cancelada";
  consultorio: string;
  motivoOperativo: string;
  edad: number;
};

const CLAVE = "clinico.agenda-demo.v2";
const edad = (nacimiento: string) => {
  const fecha = new Date(`${nacimiento}T12:00:00`);
  if (!nacimiento || Number.isNaN(fecha.getTime())) return 0;
  const ahora = new Date();
  return Math.max(
    0,
    ahora.getFullYear() -
      fecha.getFullYear() -
      (ahora < new Date(ahora.getFullYear(), fecha.getMonth(), fecha.getDate()) ? 1 : 0),
  );
};

function citasIniciales(): CitaAgendaDemo[] { return []; }

export function obtenerCitasAgendaDemo(): CitaAgendaDemo[] {
  let guardadas: CitaAgendaDemo[] = [];
  try {
    guardadas = JSON.parse(localStorage.getItem(CLAVE) || "[]") as CitaAgendaDemo[];
  } catch {
    guardadas = [];
  }
  const pacientes = new Map(obtenerPacientes().map((paciente) => [paciente.id, paciente]));
  const actualizadas = guardadas
    .filter((cita) => pacientes.has(cita.pacienteId))
    .map((cita) => {
      const paciente = pacientes.get(cita.pacienteId)!;
      return {
        ...cita,
        paciente: [paciente.nombres, paciente.primerApellido, paciente.segundoApellido]
          .filter(Boolean)
          .join(" "),
        ci: paciente.numeroDocumento,
        edad: edad(paciente.fechaNacimiento),
      };
    });
  const ids = new Set(actualizadas.map((cita) => cita.pacienteId));
  const citas = [...actualizadas, ...citasIniciales().filter((cita) => !ids.has(cita.pacienteId))];
  try {
    localStorage.setItem(CLAVE, JSON.stringify(citas));
  } catch {}
  return citas;
}

export function guardarCitasAgendaDemo(citas: CitaAgendaDemo[]) {
  localStorage.setItem(CLAVE, JSON.stringify(citas));
  window.dispatchEvent(new Event("citas:actualizadas"));
}
