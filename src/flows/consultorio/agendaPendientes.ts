import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import { obtenerAtencionAmbulatoria } from "./registroHistoria";

export const fechaLocalISO = (fecha: Date = new Date()) => {
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
};

export const esPendienteDeAtencion = (
  cita: CitaConfirmada,
  hoy: string = fechaLocalISO(),
) =>
  cita.estado === "confirmada" &&
  cita.fecha >= hoy &&
  !obtenerAtencionAmbulatoria(cita)?.finalizadaEn;
