import { apiFetch } from './api';

export type DatosPacienteCompartido = {
  nombres?: string;
  apellidos?: string;
  primerApellido?: string;
  segundoApellido?: string;
  documento?: string;
  numeroDocumento?: string;
  tipoDocumento?: string;
  nacimiento?: string;
  fechaNacimiento?: string;
  telefono?: string;
  direccion?: string;
};

/** Registra o actualiza la ficha clínica común, usando el documento como clave única. */
export async function sincronizarPaciente(datos: DatosPacienteCompartido) {
  const respuesta = await apiFetch('/api/pacientes/sincronizar', {
    method: 'POST', body: JSON.stringify(datos),
  });
  const resultado = await respuesta.json() as { message?: string };
  if (!respuesta.ok) throw new Error(resultado.message || 'No se pudo sincronizar el paciente.');
  window.dispatchEvent(new Event('pacientes:actualizados'));
  return resultado;
}
