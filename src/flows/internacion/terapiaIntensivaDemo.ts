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

export const obtenerPacientesTerapiaDemo = (): PacienteTerapiaDemo[] => [];
