import type { CitaConfirmada } from "./AgendaAmbulatoriaView";

export type TipoEpisodio =
  | "Consulta médica"
  | "Emergencias"
  | "Internación"
  | "Cirugía"
  | "Quirófano"
  | "Terapia intensiva"
  | "Recuperación";
export type MedicamentoReceta = {
  id: string;
  nombre: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion: string;
  cantidad: string;
  catalogoId?: string;
  codigo?: string;
  unidad?: string;
  indicaciones?: string;
};
export type DocumentoEpisodio = {
  tipo: string;
  detalle: string;
  estado?: string;
  fecha?: string;
  medico?: string;
  receta?: {
    id: string;
    fecha: string;
    medicamentos: MedicamentoReceta[];
    indicaciones: string;
  };
};
export type EpisodioClinico = {
  episodioId: string;
  origenId: string;
  correlativo: number;
  tipo: TipoEpisodio;
  paciente: CitaConfirmada;
  medico: string;
  fecha: string;
  motivo: string;
  enfermedadActual: string;
  examenFisico: string;
  antecedentes: string;
  notas: string;
  diagnosticos?: { diagnostico: string; planes: string[] }[];
  signosVitales: Record<string, string>;
  recetas: DocumentoEpisodio[];
  ordenes: DocumentoEpisodio[];
  resultados: DocumentoEpisodio[];
  reconsultas: DocumentoEpisodio[];
  actualizadoEn: string;
  atendidaEn?: string;
  finalizadaEn?: string;
};

const CLAVE = "hme-episodios-clinicos-v1";
const episodioAna: EpisodioClinico = {
  episodioId: "6102837-1",
  origenId: "consulta:agenda-demo-3",
  correlativo: 1,
  tipo: "Consulta médica",
  paciente: {
    id: "agenda-demo-3",
    paciente: "Ana Rodríguez Vargas",
    ci: "6102837",
    doctor: "Agenda ambulatoria",
    especialidad: "Consulta ambulatoria",
    fecha: "2026-10-12",
    hora: "09:15",
    nombre: "Ana",
    apellidos: "Rodríguez Vargas",
    edad: 28,
    fechaNacimiento: "22 de mayo de 1998",
    domicilio: "Av. Busch N.º 1250, La Paz",
  },
  medico: "Dr. Ever Luizaga",
  fecha: "12 de octubre de 2026",
  motivo: "Resfrío, congestión nasal y dolor de garganta",
  enfermedadActual:
    "Cuadro de tres días de evolución con congestión nasal, rinorrea, odinofagia leve y tos seca ocasional. Niega dificultad respiratoria.",
  examenFisico:
    "Paciente consciente y orientada. Faringe levemente congestiva, sin placas. Campos pulmonares ventilados, sin ruidos agregados.",
  antecedentes:
    "Sin alergias medicamentosas conocidas. Sin enfermedades crónicas registradas.",
  notas:
    "Cuadro compatible con infección respiratoria alta de probable origen viral. Se indican medidas generales y control según evolución.",
  signosVitales: {
    temperatura: "37.2 °C",
    frecuenciaCardiaca: "82 P/min",
    frecuenciaRespiratoria: "19 Res/min",
    presionArterial: "112/72 mmHg",
    saturacionAmbiente: "98 %",
    peso: "58 kg",
    estatura: "157 cm",
    imc: "23.5",
  },
  recetas: [
    {
      tipo: "Tratamiento sintomático",
      detalle:
        "Paracetamol 500 mg por vía oral cada 8 horas si presenta dolor o fiebre, durante 3 días.",
      estado: "Indicada",
    },
  ],
  ordenes: [
    {
      tipo: "Laboratorio",
      detalle: "Hemograma completo",
      estado: "Completada",
    },
  ],
  resultados: [
    {
      tipo: "Hemograma completo",
      detalle:
        "Leucocitos 7.200/mm³ · Hemoglobina 13,4 g/dL · Hematocrito 40 % · Plaquetas 268.000/mm³. Valores dentro de parámetros esperados.",
      estado: "Validado",
    },
  ],
  reconsultas: [],
  actualizadoEn: "2026-10-12T09:45:00-04:00",
  finalizadaEn: "2026-10-12T09:45:00-04:00",
};
const historialUciDemo: EpisodioClinico[] = [
  {
    episodioId: "TEST-UCI-20261111-1",
    origenId: "demo:historia-uci:ingreso-20261111",
    correlativo: 1,
    tipo: "Terapia intensiva",
    paciente: {
      id: "demo-pac-uci-prueba",
      paciente: "Paciente de prueba Unidad UCI Demo",
      ci: "TEST-UCI-20261111",
      doctor: "Equipo UCI Demo",
      especialidad: "Terapia intensiva",
      fecha: "2026-11-11",
      hora: "08:00",
    },
    medico: "Equipo UCI Demo",
    fecha: "2026-11-11",
    motivo: "Ingreso de demostración para seguimiento en UCI",
    enfermedadActual: "Caso ficticio para practicar el registro de ingreso y la vigilancia de enfermería. No corresponde a una atención real.",
    examenFisico: "Evaluación simulada: paciente consciente, orientado y sin dificultad respiratoria.",
    antecedentes: "Datos de prueba. Sin antecedentes ni alergias consignados en este escenario.",
    notas: "HISTORIAL DE DEMOSTRACIÓN. Registro ficticio de ingreso, valoración inicial y seguimiento del turno.",
    signosVitales: {
      presionArterial: "118/76 mmHg",
      frecuenciaCardiaca: "80 lpm",
      frecuenciaRespiratoria: "18 rpm",
      temperatura: "36.7 °C",
      saturacionAmbiente: "98 %",
    },
    recetas: [],
    ordenes: [{ tipo: "Cuidados de enfermería (demo)", detalle: "Ejemplo ficticio de valoración inicial y registro de evolución del turno.", estado: "Registrada" }],
    resultados: [{ tipo: "Evolución de enfermería (demo)", detalle: "Control simulado del turno: sin cambios respecto de la valoración inicial.", estado: "Registrado" }],
    reconsultas: [],
    actualizadoEn: "2026-11-11T12:00:00-04:00",
    atendidaEn: "2026-11-11T08:00:00-04:00",
  },
];
const cargar = (): EpisodioClinico[] => {
  try {
    const guardados = JSON.parse(
      localStorage.getItem(CLAVE) || "[]",
    ) as EpisodioClinico[];
    const completos = guardados.filter(
      (episodio) => episodio.origenId !== episodioAna.origenId,
    );
    for (const ejemplo of historialUciDemo) {
      if (!completos.some((episodio) => episodio.origenId === ejemplo.origenId)) {
        completos.push(ejemplo);
      }
    }
    localStorage.setItem(CLAVE, JSON.stringify(completos));
    return completos;
  } catch {
    return [];
  }
};
let episodios = cargar();
const oyentes = new Set<() => void>();

export const obtenerEpisodios = () => episodios;
export const origenConsultaAmbulatoria = (cita: CitaConfirmada) => {
  const anterior = episodios.find(
    (episodio) =>
      episodio.origenId === `consulta:${cita.id}` &&
      episodio.paciente.fecha === cita.fecha &&
      episodio.paciente.hora === cita.hora,
  );
  return anterior?.origenId || `consulta:${cita.id}:${cita.fecha}:${cita.hora}`;
};
export const obtenerAtencionAmbulatoria = (cita: CitaConfirmada) =>
  episodios.find(
    (episodio) => episodio.origenId === origenConsultaAmbulatoria(cita),
  );
export const registrarAtencionAmbulatoria = (
  cita: CitaConfirmada,
  medico: string,
) => {
  const existente = obtenerAtencionAmbulatoria(cita);
  if (existente) return existente;
  return guardarEpisodio({
    origenId: origenConsultaAmbulatoria(cita),
    tipo: "Consulta médica",
    paciente: cita,
    medico:
      cita.doctor && cita.doctor !== "Agenda ambulatoria"
        ? cita.doctor
        : medico,
    fecha: cita.fecha,
    motivo: "",
    enfermedadActual: "",
    examenFisico: "",
    antecedentes: "",
    notas: "",
    signosVitales: {},
    recetas: [],
    ordenes: [],
    resultados: [],
    reconsultas: [],
    atendidaEn: new Date().toISOString(),
  });
};
export const suscribirEpisodios = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};
type BorradorEpisodio = Omit<
  EpisodioClinico,
  "episodioId" | "correlativo" | "actualizadoEn"
>;
export const guardarEpisodio = (borrador: BorradorEpisodio) => {
  const existente = episodios.find(
    (episodio) => episodio.origenId === borrador.origenId,
  );
  const correlativo =
    existente?.correlativo ??
    Math.max(
      0,
      ...episodios
        .filter((episodio) => episodio.paciente.ci === borrador.paciente.ci)
        .map((episodio) => episodio.correlativo),
    ) + 1;
  const episodio: EpisodioClinico = {
    ...borrador,
    atendidaEn: borrador.atendidaEn ?? existente?.atendidaEn,
    finalizadaEn: borrador.finalizadaEn ?? existente?.finalizadaEn,
    recetas: borrador.recetas.length
      ? borrador.recetas
      : (existente?.recetas ?? []),
    ordenes: borrador.ordenes.length
      ? borrador.ordenes
      : (existente?.ordenes ?? []),
    resultados: borrador.resultados.length
      ? borrador.resultados
      : (existente?.resultados ?? []),
    reconsultas: borrador.reconsultas.length
      ? borrador.reconsultas
      : (existente?.reconsultas ?? []),
    correlativo,
    episodioId: `${borrador.paciente.ci || borrador.paciente.id}-${correlativo}`,
    actualizadoEn: new Date().toISOString(),
  };
  const siguientes = existente
    ? episodios.map((actual) =>
        actual.origenId === borrador.origenId ? episodio : actual,
      )
    : [...episodios, episodio];
  localStorage.setItem(CLAVE, JSON.stringify(siguientes));
  episodios = siguientes;
  oyentes.forEach((oyente) => oyente());
  return episodio;
};

export const adjuntarAlEpisodio = (
  episodioId: string,
  seccion: "recetas" | "ordenes" | "resultados" | "reconsultas",
  documento: DocumentoEpisodio,
) => {
  episodios = episodios.map((episodio) =>
    episodio.episodioId === episodioId
      ? {
          ...episodio,
          [seccion]: [...episodio[seccion], documento],
          actualizadoEn: new Date().toISOString(),
        }
      : episodio,
  );
  localStorage.setItem(CLAVE, JSON.stringify(episodios));
  oyentes.forEach((oyente) => oyente());
};
