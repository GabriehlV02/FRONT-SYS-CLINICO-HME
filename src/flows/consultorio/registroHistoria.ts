import type { CitaConfirmada } from './AgendaAmbulatoriaView';

export type TipoEpisodio = 'Consulta médica' | 'Emergencias' | 'Internación' | 'Cirugía' | 'Quirófano' | 'Terapia intensiva' | 'Recuperación';
export type MedicamentoReceta = { id: string; nombre: string; dosis: string; via: string; frecuencia: string; duracion: string; cantidad: string; catalogoId?: string; codigo?: string; unidad?: string; indicaciones?: string };
export type DocumentoEpisodio = { tipo: string; detalle: string; estado?: string; fecha?: string; medico?: string; receta?: { id: string; fecha: string; medicamentos: MedicamentoReceta[]; indicaciones: string } };
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
  signosVitales: Record<string, string>;
  recetas: DocumentoEpisodio[];
  ordenes: DocumentoEpisodio[];
  resultados: DocumentoEpisodio[];
  reconsultas: DocumentoEpisodio[];
  actualizadoEn: string;
};

const CLAVE = 'hme-episodios-clinicos-v1';
const episodioAna: EpisodioClinico = {
  episodioId: '6102837-1', origenId: 'consulta:agenda-demo-3', correlativo: 1, tipo: 'Consulta médica',
  paciente: { id: 'agenda-demo-3', paciente: 'Ana Rodríguez Vargas', ci: '6102837', doctor: 'Agenda ambulatoria', especialidad: 'Consulta ambulatoria', fecha: '2026-10-12', hora: '09:15', nombre: 'Ana', apellidos: 'Rodríguez Vargas', edad: 28, fechaNacimiento: '22 de mayo de 1998', domicilio: 'Av. Busch N.º 1250, La Paz' },
  medico: 'Dr. Ever Luizaga', fecha: '12 de octubre de 2026', motivo: 'Resfrío, congestión nasal y dolor de garganta',
  enfermedadActual: 'Cuadro de tres días de evolución con congestión nasal, rinorrea, odinofagia leve y tos seca ocasional. Niega dificultad respiratoria.',
  examenFisico: 'Paciente consciente y orientada. Faringe levemente congestiva, sin placas. Campos pulmonares ventilados, sin ruidos agregados.',
  antecedentes: 'Sin alergias medicamentosas conocidas. Sin enfermedades crónicas registradas.',
  notas: 'Cuadro compatible con infección respiratoria alta de probable origen viral. Se indican medidas generales y control según evolución.',
  signosVitales: { temperatura: '37.2 °C', frecuenciaCardiaca: '82 P/min', frecuenciaRespiratoria: '19 Res/min', presionArterial: '112/72 mmHg', saturacionAmbiente: '98 %', peso: '58 kg', estatura: '157 cm', imc: '23.5' },
  recetas: [{ tipo: 'Tratamiento sintomático', detalle: 'Paracetamol 500 mg por vía oral cada 8 horas si presenta dolor o fiebre, durante 3 días.', estado: 'Indicada' }],
  ordenes: [{ tipo: 'Laboratorio', detalle: 'Hemograma completo', estado: 'Completada' }],
  resultados: [{ tipo: 'Hemograma completo', detalle: 'Leucocitos 7.200/mm³ · Hemoglobina 13,4 g/dL · Hematocrito 40 % · Plaquetas 268.000/mm³. Valores dentro de parámetros esperados.', estado: 'Validado' }],
  reconsultas: [], actualizadoEn: '2026-10-12T09:45:00-04:00',
};
const cargar = (): EpisodioClinico[] => {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE) || '[]') as EpisodioClinico[];
    const completos = guardados.filter(episodio=>episodio.origenId !== episodioAna.origenId);
    localStorage.setItem(CLAVE, JSON.stringify(completos));
    return completos;
  } catch { return []; }
};
let episodios = cargar();
const oyentes = new Set<() => void>();

export const obtenerEpisodios = () => episodios;
export const suscribirEpisodios = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
};
type BorradorEpisodio = Omit<EpisodioClinico, 'episodioId' | 'correlativo' | 'actualizadoEn'>;
export const guardarEpisodio = (borrador: BorradorEpisodio) => {
  const existente = episodios.find((episodio) => episodio.origenId === borrador.origenId);
  const correlativo = existente?.correlativo ?? Math.max(0, ...episodios.filter((episodio) => episodio.paciente.ci === borrador.paciente.ci).map((episodio) => episodio.correlativo)) + 1;
  const episodio: EpisodioClinico = { ...borrador, recetas: borrador.recetas.length ? borrador.recetas : (existente?.recetas ?? []), ordenes: borrador.ordenes.length ? borrador.ordenes : (existente?.ordenes ?? []), resultados: borrador.resultados.length ? borrador.resultados : (existente?.resultados ?? []), reconsultas: borrador.reconsultas.length ? borrador.reconsultas : (existente?.reconsultas ?? []), correlativo, episodioId: `${borrador.paciente.ci}-${correlativo}`, actualizadoEn: new Date().toISOString() };
  const siguientes = existente ? episodios.map((actual) => actual.origenId === borrador.origenId ? episodio : actual) : [...episodios, episodio];
  localStorage.setItem(CLAVE, JSON.stringify(siguientes));
  episodios = siguientes;
  oyentes.forEach((oyente) => oyente());
  return episodio;
};

export const adjuntarAlEpisodio = (episodioId: string, seccion: 'recetas' | 'ordenes' | 'resultados' | 'reconsultas', documento: DocumentoEpisodio) => {
  episodios = episodios.map((episodio) => episodio.episodioId === episodioId ? { ...episodio, [seccion]: [...episodio[seccion], documento], actualizadoEn: new Date().toISOString() } : episodio);
  localStorage.setItem(CLAVE, JSON.stringify(episodios));
  oyentes.forEach((oyente) => oyente());
};
