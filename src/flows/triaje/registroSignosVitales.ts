export type RegistroSignosVitales = Record<string, string>;

type Suscriptor = () => void;

// Comunica las mediciones de Triaje a la consulta activa del paciente.
const registros = new Map<string, RegistroSignosVitales>();
const suscriptores = new Set<Suscriptor>();

export function obtenerSignosVitales(ci: string) { return registros.get(ci); }

export function guardarSignosVitales(ci: string, valores: RegistroSignosVitales) {
  registros.set(ci, { ...valores });
  suscriptores.forEach((suscriptor) => suscriptor());
}

export function suscribirSignosVitales(suscriptor: Suscriptor) {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}
