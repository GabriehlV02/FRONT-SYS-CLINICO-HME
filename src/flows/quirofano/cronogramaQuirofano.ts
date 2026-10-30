export type CirugiaProgramada = {
  id: string;
  cuenta: string;
  pacienteId?: string;
  profesionalId?: string;
  paciente: string;
  ci: string;
  medico: string;
  tipo: string;
  quirofano: string;
  fecha: string;
  hora: string;
};

const CLAVE = 'hme-cronograma-quirofanos-v1';

export function leerCronograma(): CirugiaProgramada[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    if (!Array.isArray(datos)) return [];
    return datos.filter((item): item is CirugiaProgramada =>
      item !== null && typeof item === 'object' &&
      ['id', 'cuenta', 'paciente', 'ci', 'medico', 'tipo', 'quirofano', 'fecha', 'hora'].every(campo => typeof item[campo] === 'string'),
    );
  } catch { return []; }
}

export function guardarCirugia(cirugia: CirugiaProgramada): CirugiaProgramada[] {
  const actuales = leerCronograma();
  if (actuales.some(item => item.fecha === cirugia.fecha && item.hora === cirugia.hora && item.quirofano === cirugia.quirofano)) {
    throw new Error(`${cirugia.quirofano} ya tiene una cirugía programada el ${cirugia.fecha} a las ${cirugia.hora}.`);
  }
  const nuevos = [...actuales, cirugia];
  localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  return nuevos;
}
