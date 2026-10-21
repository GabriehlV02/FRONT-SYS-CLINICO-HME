import { apiFetch } from '../../radius/api';

export type ItemEmergencia = { id: string; codigo: string; nombre: string; tipo: 'servicio' | 'producto'; unidad: string; precio: number; categoria?: string; grupo?: string };
export type OrdenEmergencia = {
  id: string; revision: number; fecha: string; usuario: string; tipo: string; titulo: string;
  indicaciones: string; dosis: string; via: string; frecuencia: string; duracion: string;
  itemId: string; porHora: boolean; estado: 'pendiente' | 'en_curso' | 'aplicada' | 'cancelada';
  aplicaciones: { id: string; fecha: string; usuario: string; observacion: string; consumoId?: string }[];
  historial: { fecha: string; usuario: string; detalle: string }[];
};
export type CuentaEmergencia = {
  id: string; cubiculo: string; inicio: string; fin: string | null; revision: number;
  identidad: Record<string, string> | null;
  signos: { id: string; fecha: string; valores: Record<string, number>; observacion: string }[];
  consumos: (ItemEmergencia & { registroId: string; cantidad: number; porHora: boolean; inicio: string; fin: string | null; ordenId?: string })[];
  evaluaciones?: { id?: string; revision: number; fecha: string; usuario: string; campos: Record<string, string> }[];
  ordenes?: OrdenEmergencia[];
  cierre?: { condicionEgreso: 'vivo' | 'muerto'; causaEgreso: 'hospitalaria' | 'solicitada' | 'fuga' | 'transferencia' | 'deceso' | 'internacion'; observacionEgreso?: string; fecha: string; usuario: string } | null;
};
export async function apiEmergencias<T>(ruta = '', body?: object): Promise<T> {
  const respuesta = await apiFetch(`/api/emergencias${ruta}`, body ? { method: 'POST', body: JSON.stringify(body) } : {});
  const contenido = await respuesta.text();
  let datos: unknown = null;
  try { datos = contenido ? JSON.parse(contenido) : null; }
  catch { if (respuesta.ok) throw new Error('El servicio de emergencias devolvió una respuesta no válida.'); }
  if (!respuesta.ok) throw new Error((datos as { message?: string } | null)?.message || 'El servicio de emergencias no está disponible.');
  if (datos === null) throw new Error('El servicio de emergencias respondió sin información.');
  return datos as T;
}
export const nombrePaciente = (c: CuentaEmergencia) => [c.identidad?.nombres, c.identidad?.apellidos].filter(Boolean).join(' ') || 'Paciente sin identificar';
export const fechaEmergencia = (v: string) => new Date(v).toLocaleString('es-BO');
export const camposEvaluacion = [
  ['motivoConsulta', 'Motivo de consulta'], ['enfermedadActual', 'Enfermedad actual'],
  ['antecedentesNoPatologicos', 'Antecedentes personales no patológicos'], ['antecedentesPatologicos', 'Antecedentes personales patológicos'], ['antecedentesFamiliares', 'Antecedentes familiares'], ['antecedentesGineco', 'Antecedentes ginecoobstétricos'],
  ['examenGeneral', 'Examen físico general'], ['cabeza', 'Examen regional · Cabeza'], ['ojos', 'Examen regional · Ojos'], ['oidos', 'Examen regional · Oídos'], ['nariz', 'Examen regional · Nariz'], ['boca', 'Examen regional · Boca'], ['cuello', 'Examen regional · Cuello'], ['torax', 'Examen regional · Tórax'], ['respiratorio', 'Examen regional · Respiratorio'], ['cardiovascular', 'Examen regional · Cardiovascular'], ['pulsos', 'Examen regional · Pulsos arteriales'], ['abdomen', 'Examen regional · Abdomen'], ['extremidades', 'Examen regional · Extremidades'], ['genitalesPerine', 'Examen regional · Genitales y periné'], ['neurologico', 'Examen neurológico'],
  ['examenesComplementarios', 'Exámenes complementarios solicitados / revisados'], ['impresionDiagnostica', 'Impresión diagnóstica'], ['tratamiento', 'Tratamiento indicado / realizado'],
];
export const camposIdentidad = [['nombres', 'Nombres'], ['apellidos', 'Apellidos'], ['documento', 'Documento'], ['nacimiento', 'Fecha de nacimiento'], ['sexo', 'Sexo'], ['procedencia', 'Procedencia'], ['telefono', 'Teléfono'], ['direccion', 'Dirección'], ['profesion', 'Profesión / ocupación'], ['familiar', 'Familiar / acompañante'], ['parentesco', 'Parentesco'], ['telefonoFamiliar', 'Teléfono del acompañante'], ['documentoFamiliar', 'Documento del acompañante']];
export const tiposOrden = [['medicamento', 'Medicamento / receta'], ['servicio', 'Servicio / procedimiento'], ['laboratorio', 'Laboratorio'], ['imagenologia', 'Imagenología'], ['internacion', 'Internación'], ['cuidado', 'Cuidado / indicación general']];
