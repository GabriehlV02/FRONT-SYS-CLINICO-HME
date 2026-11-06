export type Profesional = {
  id: string;
  nombres: string;
  apellidos: string;
  nombre: string;
  tipo: "Médico/a" | "Enfermero/a" | "Otro profesional";
  especialidades: string[];
  rol: string;
  matricula: string | null;
  telefono: string | null;
  usuario_id: string | null;
  activo: boolean;
  horario?: string;
};

export const etiquetaProfesional = (profesional: Profesional) =>
  `${profesional.nombre} · ${profesional.horario || profesional.matricula || profesional.id.slice(0, 8)}`;

const profesionalesDemo: Profesional[] = [
  [
    "med-neu-01",
    "Dra. Valeria Rojas",
    "Neumología",
    "CMP 4821",
    "Lun, Mié y Vie · 08:00–12:00",
  ],
  [
    "med-neu-02",
    "Dr. Andrés Molina",
    "Neumología",
    "CMP 5294",
    "Mar, Jue y Sáb · 14:00–18:00",
  ],
  [
    "med-car-01",
    "Dr. Mateo Vargas",
    "Cardiología",
    "CMP 3968",
    "Lun, Mié y Vie · 14:00–18:00",
  ],
  [
    "med-car-02",
    "Dra. Camila Pérez",
    "Cardiología",
    "CMP 6175",
    "Mar, Jue y Sáb · 08:00–12:00",
  ],
  [
    "med-ped-01",
    "Dra. Sofía Álvarez",
    "Pediatría",
    "CMP 4412",
    "Lun, Mié y Vie · 08:00–12:00",
  ],
  [
    "med-ped-02",
    "Dr. Diego Flores",
    "Pediatría",
    "CMP 5837",
    "Mar, Jue y Sáb · 14:00–18:00",
  ],
  [
    "med-int-01",
    "Dr. Gabriel Torres",
    "Medicina Interna",
    "CMP 3649",
    "Lun, Mié y Vie · 14:00–18:00",
  ],
  [
    "med-int-02",
    "Dra. Elena Castro",
    "Medicina Interna",
    "CMP 6982",
    "Mar, Jue y Sáb · 08:00–12:00",
  ],
].map(([id, nombre, especialidad, matricula, horario]) => {
  const partes = nombre.replace(/^Dra?\.\s/, "").split(" ");
  return {
    id,
    nombre,
    nombres: partes[0],
    apellidos: partes.slice(1).join(" "),
    tipo: "Médico/a",
    especialidades: [especialidad],
    rol: "Médico especialista",
    matricula,
    telefono: null,
    usuario_id: null,
    activo: true,
    horario,
  };
});

export function useProfesionales() {
  const profesionales = profesionalesDemo;
  const medicos = profesionales.filter(
    (profesional) => profesional.tipo === "Médico/a",
  );
  const enfermeria = profesionales.filter(
    (profesional) => profesional.tipo === "Enfermero/a",
  );
  const resolver = (valor: string) =>
    profesionales.find(
      (profesional) =>
        profesional.id === valor || etiquetaProfesional(profesional) === valor,
    );
  return {
    profesionales,
    medicos,
    enfermeria,
    errorProfesionales: "",
    resolver,
  };
}
