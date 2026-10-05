export type RegistroSignosVitales = Record<string, string>;

type Suscriptor = () => void;

// Comunica las mediciones de Triaje a la consulta activa del paciente.
const registros = new Map<string, RegistroSignosVitales>([
  ['7013659', { temperatura: '36.7', frecuenciaCardiaca: '74', frecuenciaRespiratoria: '18', presionSistolica: '118', presionDiastolica: '76', saturacionAmbiente: '98', peso: '64', estatura: '162', imc: '24.4' }],
  ['6892473', { temperatura: '37.1', glicemia: '105', frecuenciaCardiaca: '82', frecuenciaRespiratoria: '19', presionSistolica: '132', presionDiastolica: '84', saturacionAmbiente: '96', peso: '79', estatura: '171', imc: '27.0' }],
  ['5418702', { temperatura: '36.5', frecuenciaCardiaca: '68', frecuenciaRespiratoria: '16', presionSistolica: '110', presionDiastolica: '70', saturacionAmbiente: '99', peso: '58', estatura: '157', imc: '23.5' }],
]);
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
