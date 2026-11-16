import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import type { DatosAntecedentesConsulta } from "./AntecedentesConsulta";

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
  antecedentesEstructurados?: DatosAntecedentesConsulta;
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
const cargar = (): EpisodioClinico[] => {
  try {
    const guardados: unknown = JSON.parse(
      localStorage.getItem(CLAVE) || "[]",
    );
    if (!Array.isArray(guardados)) return [];
    return guardados.filter((episodio): episodio is EpisodioClinico =>
      Boolean(episodio && typeof episodio.origenId === "string" && episodio.paciente && typeof episodio.paciente.id === "string") &&
      !episodio.origenId.startsWith("demo:") && !episodio.paciente.id.startsWith("demo-") && episodio.origenId !== "consulta:agenda-demo-3",
    );
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
      (episodio.origenId === `consulta:${cita.id}` || episodio.origenId.startsWith(`consulta:${cita.id}:`)) &&
      episodio.paciente.fecha === cita.fecha &&
      episodio.paciente.hora?.slice(0, 5) === cita.hora?.slice(0, 5),
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
