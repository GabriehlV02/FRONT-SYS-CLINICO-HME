import type { ResultadoLaboratorio } from './almacenLaboratorio';
import { compararReferencia } from './rangosLaboratorio';

export function EstadoReferenciaLaboratorio({ resultado }: { resultado: ResultadoLaboratorio }) {
  const comparacion = compararReferencia(resultado.valor, resultado.referencia, resultado.rangoReferencia, resultado.tipo !== 'texto');
  const textos: Record<string, string> = { bajo: 'Por debajo del rango', alto: 'Por encima del rango', 'en-rango': 'Dentro del rango' };
  const texto = textos[comparacion.estado];
  if (!texto) return null;
  return <div className="lab-resultado-estado"><span role="status" className={`lab-comparacion ${comparacion.estado}`}>{texto}</span></div>;
}
