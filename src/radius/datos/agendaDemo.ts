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
const hoy = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};
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

function citasIniciales(): CitaAgendaDemo[] {
  const pacientes = obtenerPacientes();
  const preferidos = ["demo-pac-luis-morales", "demo-pac-003", "demo-pac-002"];
  const seleccionados = preferidos
    .map((id) => pacientes.find((paciente) => paciente.id === id))
    .filter(
      (paciente): paciente is NonNullable<typeof paciente> =>
        Boolean(paciente?.numeroDocumento.trim()),
    );
  const lista = seleccionados.length
    ? seleccionados
    : pacientes.filter((paciente) => paciente.numeroDocumento.trim()).slice(0, 3);
  const asignaciones = [
    ["Dra. Andrea Vargas", "Medicina general", "Consultorio 1", "Control general", "09:30"],
    ["Dr. Martín Rojas", "Medicina familiar", "Consultorio 2", "Consulta de seguimiento", "10:15"],
    ["Dra. Andrea Vargas", "Medicina interna", "Consultorio 3", "Valoración médica", "11:00"],
  ];
  const citas = lista.map((paciente, indice) => {
    const [doctor, especialidad, consultorio, motivoOperativo, hora] =
      asignaciones[indice % asignaciones.length];
    return {
      id: `demo-agenda-${paciente.id}`,
      pacienteId: paciente.id,
      paciente: [paciente.nombres, paciente.primerApellido, paciente.segundoApellido]
        .filter(Boolean)
        .join(" "),
      ci: paciente.numeroDocumento,
      doctor,
      especialidad,
      fecha: hoy(),
      hora,
      estado: "confirmada",
      consultorio,
      motivoOperativo,
      edad: edad(paciente.fechaNacimiento),
    };
  });
  const pacientePrueba = pacientes.find(
    (paciente) => paciente.id === "demo-pac-consultorio-prueba",
  );
  if (pacientePrueba) {
    citas.push({
      id: "demo-agenda-consultorio-prueba",
      pacienteId: pacientePrueba.id,
      paciente: [
        pacientePrueba.nombres,
        pacientePrueba.primerApellido,
        pacientePrueba.segundoApellido,
      ]
        .filter(Boolean)
        .join(" "),
      ci: pacientePrueba.numeroDocumento,
      doctor: "Administrador",
      especialidad: "Medicina general",
      fecha: hoy(),
      hora: "15:30",
      estado: "confirmada",
      consultorio: "Consultorio 4",
      motivoOperativo: "Paciente de prueba para consultorio",
      edad: edad(pacientePrueba.fechaNacimiento),
    });
  }
  return citas;
}

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
