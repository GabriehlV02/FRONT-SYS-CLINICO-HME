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

const fechaLocal = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

export const obtenerPacientesTerapiaDemo = (): PacienteTerapiaDemo[] => [
  {
    id: "COLA-DEMO-U1",
    pacienteId: "demo-pac-uci-carmen",
    paciente: "Carmen Villca Apaza",
    ci: "6041728",
    medico: "Dra. Valeria Quiroga",
    motivo: "Seguimiento de paciente en UCI",
    sala: "UCI",
    cama: "3",
    hora: "07:30",
    fechaIngreso: fechaLocal(),
  },
  {
    id: "COLA-DEMO-U2",
    pacienteId: "demo-pac-uci-roberto",
    paciente: "Roberto Salazar Flores",
    ci: "7316042",
    medico: "Dr. Daniel Siles",
    motivo: "Seguimiento de paciente en UCI",
    sala: "UCI",
    cama: "5",
    hora: "12:10",
    fechaIngreso: fechaLocal(),
  },
  {
    id: "COLA-DEMO-U3",
    pacienteId: "demo-pac-uci-prueba",
    paciente: "Paciente de prueba UCI",
    ci: "TEST-UCI-20261111",
    medico: "Administrador",
    motivo: "Caso ficticio para practicar el flujo de terapia intensiva",
    sala: "UCI",
    cama: "7",
    hora: "15:30",
    fechaIngreso: fechaLocal(),
  },
];
