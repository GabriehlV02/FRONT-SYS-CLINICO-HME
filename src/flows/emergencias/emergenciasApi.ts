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
};
export async function apiEmergencias<T>(ruta = '', body?: object): Promise<T> {
  const respuesta = await apiFetch(`/api/emergencias${ruta}`, body ? { method: 'POST', body: JSON.stringify(body) } : {});
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.message || 'No se pudo completar la operación.');
  return datos;
}
export const nombrePaciente = (c: CuentaEmergencia) => [c.identidad?.nombres, c.identidad?.apellidos].filter(Boolean).join(' ') || 'Paciente sin identificar';
export const fechaEmergencia = (v: string) => new Date(v).toLocaleString('es-BO');
export const camposEvaluacion = [
  ['motivo', 'Motivo de atención'], ['estado', 'Estado actual / nivel de conciencia'],
  ['antecedentes', 'Antecedentes conocidos'], ['alergias', 'Alergias conocidas o pendientes de averiguar'],
  ['evaluacion', 'Evaluación y examen físico'], ['diagnostico', 'Impresión diagnóstica'],
  ['plan', 'Plan y evolución'], ['informacion', 'Información obtenida / fuente de la información'],
];
export const camposIdentidad = [['nombres', 'Nombres'], ['apellidos', 'Apellidos'], ['documento', 'Documento'], ['nacimiento', 'Fecha de nacimiento'], ['telefono', 'Teléfono'], ['direccion', 'Dirección'], ['familiar', 'Familiar / acompañante'], ['parentesco', 'Parentesco'], ['telefonoFamiliar', 'Teléfono del acompañante'], ['documentoFamiliar', 'Documento del acompañante']];
export const tiposOrden = [['medicamento', 'Medicamento / receta'], ['servicio', 'Servicio / procedimiento'], ['laboratorio', 'Laboratorio'], ['imagenologia', 'Imagenología'], ['internacion', 'Internación'], ['cuidado', 'Cuidado / indicación general']];
