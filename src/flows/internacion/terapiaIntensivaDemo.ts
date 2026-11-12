export type PacienteTerapiaDemo = {
  id: string;
  pacienteId: string;
  paciente: string;
  ci: string;
  medico: string;
  motivo: string;
  sala: string;
  cama: string;
  hora: string;
  fechaIngreso: string;
};

const CLAVE = "hme:terapia-intensiva:pacientes-demo:v1";

const pacienteInicial: PacienteTerapiaDemo = {
  id: "UCI-PRUEBA-LOCAL-001",
  pacienteId: "paciente-prueba-uci-001",
  paciente: "Paciente Ficticio UCI",
  ci: "TEST-UCI-001",
  medico: "Médico de prueba",
  motivo: "Registro ficticio para probar el flujo de terapia intensiva",
  sala: "UCI DEMO",
  cama: "01",
  hora: "09:00",
  fechaIngreso: new Date().toLocaleDateString("es-BO"),
};

export const obtenerPacientesTerapiaDemo = (): PacienteTerapiaDemo[] => {
  if (!import.meta.env.DEV || typeof window === "undefined") return [];
  try {
    const pacientes = JSON.parse(window.localStorage.getItem(CLAVE) ?? "null");
    if (Array.isArray(pacientes)) return pacientes;
  } catch {
    // Restaura el registro ficticio si el almacenamiento local no es válido.
  }
  window.localStorage.setItem(CLAVE, JSON.stringify([pacienteInicial]));
  return [pacienteInicial];
};
