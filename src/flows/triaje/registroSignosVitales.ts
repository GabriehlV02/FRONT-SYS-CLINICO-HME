export type RegistroSignosVitales = Record<string, string>;

type Suscriptor = () => void;

// Comunica las mediciones de Triaje a la consulta activa del paciente.
const registros = new Map<string, RegistroSignosVitales>();
const suscriptores = new Set<Suscriptor>();

type ConsultaSignos = { id: string };
const claveConsulta = (consulta: ConsultaSignos) => consulta.id;

export function obtenerSignosVitales(consulta: ConsultaSignos) {
  return registros.get(claveConsulta(consulta));
}

export function guardarSignosVitales(
  consulta: ConsultaSignos,
  valores: RegistroSignosVitales,
) {
  registros.set(claveConsulta(consulta), { ...valores });
  suscriptores.forEach((suscriptor) => suscriptor());
}

export function suscribirSignosVitales(suscriptor: Suscriptor) {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}
