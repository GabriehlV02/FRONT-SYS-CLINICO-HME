import { useState } from 'react';
import { BuscadorPacienteInternacion, nombrePaciente } from '../recepcion/subvistas/BuscadorPacienteInternacion';
import type { PacienteDemo } from '../../radius/datos/almacenDemo';

export function PacienteIngresoEmergencia({ onSeleccionar }: { onSeleccionar: (paciente: PacienteDemo | null) => void }) {
  const [consulta, setConsulta] = useState('');
  const [seleccionado, setSeleccionado] = useState<PacienteDemo | null>(null);

  return <div className="em-ingreso-buscador">
    <BuscadorPacienteInternacion requerido={false} valor={consulta} ci=""
      onCambiar={valor => { setConsulta(valor); if (seleccionado) { setSeleccionado(null); onSeleccionar(null); } }}
      onSeleccionar={paciente => { setSeleccionado(paciente); setConsulta(nombrePaciente(paciente)); onSeleccionar(paciente); }} />
    {seleccionado && <p className="em-paciente-seleccionado">Paciente seleccionado: <strong>{nombrePaciente(seleccionado)}</strong> · CI {seleccionado.numeroDocumento}</p>}
    {!seleccionado && <p className="em-paciente-sin-identificar">Puedes iniciar la atención sin identificar al paciente y completar sus datos después.</p>}
  </div>;
}

export function fechaHoraIngresoActual(): { fecha: string; hora: string } {
  const ahora = new Date();
  const dos = (valor: number) => String(valor).padStart(2, '0');
  return { fecha: `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`, hora: `${dos(ahora.getHours())}:${dos(ahora.getMinutes())}` };
}

export function inicioEnIso(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00`).toISOString();
}
