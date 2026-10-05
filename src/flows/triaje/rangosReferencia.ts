export type RangoReferencia = { minimo: number; maximo: number; nombre?: string; fuente?: string; contexto?: string };
export type OpcionRango = RangoReferencia & { id: string; nombre: string; unidad: string };
const vitales = 'https://medlineplus.gov/ency/article/002341.htm';
const adulto = 'Adultos sanos en reposo. Ajustar según edad, método de medición y protocolo institucional.';
const rango = (id: string, nombre: string, unidad: string, minimo: number, maximo: number, fuente = vitales, contexto = adulto): OpcionRango => ({ id, nombre, unidad, minimo, maximo, fuente, contexto });

export const rangosReferencia: OpcionRango[] = [
  rango('temperatura-c', 'Temperatura corporal · adulto', 'Grados Celsius', 36.5, 37.3),
  rango('temperatura-f', 'Temperatura corporal · adulto', 'Grados Fahrenheit', 97.7, 99.1),
  rango('temperatura-k', 'Temperatura corporal · adulto', 'Kelvin', 309.65, 310.45),
  ...['Pulsaciones por minuto', 'Latidos por minuto'].map((unidad, i) => rango(`pulso-${i}`, 'Frecuencia cardíaca · adulto en reposo', unidad, 60, 100)),
  rango('respiracion', 'Frecuencia respiratoria · adulto en reposo', 'Respiraciones por minuto', 12, 18),
  rango('sistolica', 'Presión sistólica · adulto en reposo', 'Milímetros de mercurio', 90, 120),
  rango('diastolica', 'Presión diastólica · adulto en reposo', 'Milímetros de mercurio', 60, 80),
  rango('saturacion', 'Saturación de oxígeno · referencia general', 'Porcentaje', 95, 100, 'https://medlineplus.gov/lab-tests/pulse-oximetry/', 'La referencia puede ser menor en altura o con enfermedad pulmonar. Individualizar según el contexto clínico.'),
  rango('glucosa-mg', 'Glucosa sanguínea · en ayunas', 'Miligramos por decilitro', 70, 99, 'https://medlineplus.gov/ency/article/003482.htm', 'Ayuno de al menos 8 horas. Verificar el método y la referencia del laboratorio; no corresponde a una medición posprandial.'),
  rango('glucosa-mmol', 'Glucosa sanguínea · en ayunas', 'Milimoles por litro', 3.9, 5.5, 'https://medlineplus.gov/ency/article/003482.htm', 'Ayuno de al menos 8 horas. Verificar el método y la referencia del laboratorio.'),
  rango('imc', 'IMC · peso saludable en adultos', 'Índice de masa corporal', 18.5, 24.9, 'https://www.cdc.gov/bmi/adult-calculator/index.html', 'Adultos de 20 años o más. No usar como referencia pediátrica ni durante el embarazo.'),
];

export const normalizarUnidad = (valor: string) => valor.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function obtenerRangos(unidad: string, signos: { id: string; nombre: string; unidad: string; rangoReferencia?: RangoReferencia }[]): OpcionRango[] {
  const compatibles = (valor: string) => normalizarUnidad(valor) === normalizarUnidad(unidad);
  const guardados = signos.filter((s) => compatibles(s.unidad) && s.rangoReferencia).map((s) => ({ ...s.rangoReferencia!, id: `guardado-${s.id}`, nombre: s.rangoReferencia!.nombre || s.nombre, unidad: s.unidad }));
  return [...rangosReferencia.filter((r) => compatibles(r.unidad)), ...guardados].filter((r, i, todos) => todos.findIndex((otro) => otro.nombre === r.nombre && otro.minimo === r.minimo && otro.maximo === r.maximo) === i);
}
