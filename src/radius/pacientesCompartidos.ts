import { apiFetch } from "./api";
import { obtenerPacientes } from "./datos/almacenDemo";
import { leerSesion } from "./types/sesion";

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

/** Recupera la identidad clínica sin crear fichas con datos incompletos. */
export async function sincronizarPaciente(datos: DatosPacienteCompartido) {
  const ci = datos.documento || datos.numeroDocumento;
  if (!ci?.trim())
    throw new Error(
      "Selecciona un paciente registrado o completa su registro en Pacientes.",
    );
  if (
    import.meta.env.DEV &&
    leerSesion()?.token === "frontend-demo-local"
  ) {
    const paciente = obtenerPacientes().find(
      (item) => item.numeroDocumento.trim() === ci.trim(),
    );
    if (!paciente)
      throw new Error(
        "No encontramos esa ficha de demostración. Selecciona un paciente de la lista.",
      );
    return { data: { id: paciente.id } };
  }
  const respuesta = await apiFetch(
    `/api/v1/pacientes/buscar?ci=${encodeURIComponent(ci.trim())}`,
    { headers: { Accept: "application/json" } },
  );
  const resultado = (await respuesta.json()) as {
    data?: { id: string };
    message?: string;
  };
  if (!respuesta.ok)
    throw new Error(resultado.message || "No se pudo sincronizar el paciente.");
  if (!resultado.data)
    throw new Error(
      "Completa la ficha del paciente en Registrar paciente para vincular esta atención.",
    );
  return resultado;
}
