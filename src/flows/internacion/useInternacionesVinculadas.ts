import { useMemo, useSyncExternalStore } from 'react';
import { usePacientes } from '../../radius/vistas/pacientes/usePacientes';
import { nombrePacienteClinico } from '../../radius/vistas/pacientes/pacientesApi';
import { leerInternaciones, suscribirInternaciones, type RegistroInternacion } from './registroInternaciones';

export function useInternacionesVinculadas(): RegistroInternacion[] {
  const registros = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const { pacientes } = usePacientes();
  return useMemo(() => registros.flatMap(registro => {
    const paciente = pacientes.find(p => registro.pacienteId ? p.id === registro.pacienteId : p.ci === registro.ci);
    if (!paciente) return [];
    return [{ ...registro, pacienteId: paciente.id, paciente: nombrePacienteClinico(paciente), ci: paciente.ci,
      datosPaciente: { ...registro.datosPaciente, nacimiento: paciente.fecha_nacimiento.slice(0, 10), sexo: paciente.genero,
        telefono: paciente.telefono || '', direccion: paciente.direccion_domicilio || '' } }];
  }), [registros, pacientes]);
}
