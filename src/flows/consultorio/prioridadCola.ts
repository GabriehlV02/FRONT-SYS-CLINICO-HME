import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import { obtenerAtencionAmbulatoria } from "./registroHistoria";
import { obtenerPrioridad } from "../triaje/registroSignosVitales";

export function prioridadPendiente(cita: CitaConfirmada) {
  return cita.estado === "confirmada" && !cita.atencionFinalizadaEn && !obtenerAtencionAmbulatoria(cita)?.atendidaEn
    ? obtenerPrioridad(cita) : null;
}

export function compararCola(a: CitaConfirmada, b: CitaConfirmada) {
  const primera = prioridadPendiente(a), segunda = prioridadPendiente(b);
  return a.fecha.localeCompare(b.fecha) || Number(Boolean(segunda)) - Number(Boolean(primera)) ||
    (primera && segunda ? primera.registradoEn.localeCompare(segunda.registradoEn) : 0) ||
    `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`) || a.id.localeCompare(b.id);
}
