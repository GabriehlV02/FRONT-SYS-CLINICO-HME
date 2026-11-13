import type { PrioridadAtencion } from "./prioridadAtencion";
import { esModoPruebaLocal } from "../../radius/datos/modoPrueba";
export type RegistroSignosVitales = Record<string, string>;

type Suscriptor = () => void;

// Comunica las mediciones de Triaje a la consulta activa del paciente.
const registros = new Map<string, RegistroSignosVitales>();
const clave = "clinico:signos-demo:v1";
type RegistroLocal = { prioridad: PrioridadAtencion | null; valores: RegistroSignosVitales };
const leerPrioridades = (): Record<string, RegistroLocal> => {
  if (!esModoPruebaLocal()) return {};
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(clave) || "{}");
    return valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, RegistroLocal> : {};
  } catch { return {}; }
};
let prioridades = leerPrioridades();
let version = 0;
export const obtenerVersionSignos = () => version;
const avisar = () => { version++; suscriptores.forEach((suscriptor) => suscriptor()); };
window.addEventListener("storage", (evento) => {
  if (evento.key === clave || evento.key === null) { prioridades = leerPrioridades(); avisar(); }
});
export const obtenerPrioridad = (consulta: ConsultaSignos & { prioridad?: PrioridadAtencion | null }) =>
  esModoPruebaLocal() ? prioridades[consulta.id]?.prioridad ?? null : consulta.prioridad ?? null;
const suscriptores = new Set<Suscriptor>();

type ConsultaSignos = { id: string };
const claveConsulta = (consulta: ConsultaSignos) => consulta.id;

export function obtenerSignosVitales(consulta: ConsultaSignos) {
  return esModoPruebaLocal() ? prioridades[consulta.id]?.valores : registros.get(claveConsulta(consulta));
}

export function guardarSignosVitales(
  consulta: ConsultaSignos,
  valores: RegistroSignosVitales,
  prioridad: PrioridadAtencion | null = null,
) {
  registros.set(claveConsulta(consulta), { ...valores });
  if (esModoPruebaLocal()) {
    prioridades = { ...leerPrioridades(), [consulta.id]: { prioridad, valores: { ...valores } } };
    localStorage.setItem(clave, JSON.stringify(prioridades));
  }
  avisar();
}

export function suscribirSignosVitales(suscriptor: Suscriptor) {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}
