export type AsignacionEnfermeriaQuirofano = {
  cirugiaId: string;
  profesionalIds?:Record<string,string>;
  usuarioIds?:Record<string,string>;
  paciente: string;
  procedimiento: string;
  instrumentista: string;
  circulante: string;
};

const CLAVE = 'hme-asignaciones-enfermeria-quirofano-v1';

export const normalizarNombre = (valor: string) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/^(lic\.?|enf\.?|dra?\.?)\s+/i, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export function leerAsignacionesQuirofano(): AsignacionEnfermeriaQuirofano[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(datos) ? datos.filter((item): item is AsignacionEnfermeriaQuirofano =>
      Boolean(item && typeof item === 'object' && typeof item.cirugiaId === 'string')) : [];
  } catch {
    return [];
  }
}

export function guardarAsignacionQuirofano(asignacion: AsignacionEnfermeriaQuirofano) {
  const actuales = leerAsignacionesQuirofano();
  const indice = actuales.findIndex(item => item.cirugiaId === asignacion.cirugiaId || (
    normalizarNombre(item.paciente) === normalizarNombre(asignacion.paciente)
    && normalizarNombre(item.procedimiento) === normalizarNombre(asignacion.procedimiento)
  ));
  const siguientes = [...actuales];
  if (indice >= 0) siguientes[indice] = asignacion;
  else siguientes.push(asignacion);
  localStorage.setItem(CLAVE, JSON.stringify(siguientes));
  window.dispatchEvent(new CustomEvent('hme:quirofano:asignaciones-actualizadas'));
}

export function buscarAsignacionQuirofano(cirugia: { id: string; paciente: string; procedimiento: string }) {
  return leerAsignacionesQuirofano().find(item => item.cirugiaId === cirugia.id || (
    normalizarNombre(item.paciente) === normalizarNombre(cirugia.paciente)
    && normalizarNombre(item.procedimiento) === normalizarNombre(cirugia.procedimiento)
  ));
}
