import { useMemo, useSyncExternalStore } from "react";
import { usePacientes } from "../../radius/vistas/pacientes/usePacientes";
import { nombrePacienteClinico } from "../../radius/vistas/pacientes/pacientesApi";
import {
  leerInternaciones,
  esInternacionPruebaLocal,
  suscribirInternaciones,
  type RegistroInternacion,
} from "./registroInternaciones";

const normalizarCiInternacion = (valor: string) =>
  valor.trim().replace(/[\s-]+/g, "").toLocaleUpperCase("es");

export function useInternacionesVinculadas(): RegistroInternacion[] {
  const registros = useSyncExternalStore(
    suscribirInternaciones,
    leerInternaciones,
    leerInternaciones,
  );
  const { pacientes } = usePacientes();
  return useMemo(
    () =>
      registros.map((registro) => {
        if (esInternacionPruebaLocal(registro)) return registro;
        // La internación conserva una ficha resumen propia. No descartamos
        // ingresos/altas si el catálogo de pacientes aún carga o ya no devuelve
        // esa ficha; las altas son un historial y deben sobrevivir al egreso.
        const paciente = pacientes.find(
          (p) => p.id === registro.pacienteId,
        ) ?? pacientes.find(
          (p) => normalizarCiInternacion(p.ci) === normalizarCiInternacion(registro.ci),
        );
        if (!paciente) return registro;
        return {
          ...registro,
          pacienteId: paciente.id,
          paciente: nombrePacienteClinico(paciente) || registro.paciente,
          ci: paciente.ci || registro.ci,
          datosPaciente: {
            ...registro.datosPaciente,
            nacimiento: paciente.fecha_nacimiento?.slice(0, 10) || registro.datosPaciente?.nacimiento || "",
            sexo: paciente.genero || registro.datosPaciente?.sexo || "",
            telefono: paciente.telefono || registro.datosPaciente?.telefono || "",
            direccion: paciente.direccion_domicilio || registro.datosPaciente?.direccion || "",
          },
        };
      }),
    [registros, pacientes],
  );
}
