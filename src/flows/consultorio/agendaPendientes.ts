import type { CitaConfirmada } from "./AgendaAmbulatoriaView";
import { obtenerAtencionAmbulatoria } from "./registroHistoria";
import { fechaISOEnBolivia } from "../../utils/fechaBolivia";

export const fechaLocalISO = fechaISOEnBolivia;

export const estaSinAtender = (cita: CitaConfirmada) =>
  (cita.estado === "confirmada" || cita.estado === "por_confirmar") &&
  !obtenerAtencionAmbulatoria(cita)?.finalizadaEn;

export const esPendienteDeAtencion = (
  cita: CitaConfirmada,
  hoy: string = fechaLocalISO(),
) =>
  cita.fecha >= hoy && estaSinAtender(cita);
