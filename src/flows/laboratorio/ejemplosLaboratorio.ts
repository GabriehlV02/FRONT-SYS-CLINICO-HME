import type { OrigenLaboratorio, SolicitudLaboratorio } from './almacenLaboratorio';

// Datos ficticios para revisar la interfaz; nunca se guardan como solicitudes reales.
export function ejemplosLaboratorio(origen: OrigenLaboratorio): SolicitudLaboratorio[] {
  const fecha = new Date().toISOString();
  return [
    { paciente: 'María Fernanda Rojas', ci: '4839201', estado: 'pendiente' as const, estudios: ['Hemograma completo', 'Glucosa'] },
    { paciente: 'Carlos Mendoza López', ci: '7281044', estado: 'en_proceso' as const, estudios: ['Examen general de orina'] },
    { paciente: 'Ana Rodríguez Vargas', ci: '6102837', estado: 'completado' as const, estudios: ['Glucosa'] },
  ].map((s, indice) => ({
    ...s, id: `ejemplo-${origen}-${indice}`, consultaId: `ejemplo-consulta-${indice}`, origen,
    medico: 'Dra. Andrea Pérez', fecha, actualizadoEn: fecha, observacion: '',
    ...(s.estado === 'completado' ? { finalizadoEn: fecha, registradoPor: 'Laboratorio · Ejemplo' } : {}),
    estudios: s.estudios.map((nombre, i) => ({ id: `ejemplo-estudio-${indice}-${i}`, nombre, resultados: [{
      id: `ejemplo-resultado-${indice}-${i}`, parametro: nombre, valor: s.estado === 'completado' ? '92' : '',
      unidad: s.estado === 'completado' ? 'mg/dL' : '', referencia: '',
    }] })),
  }));
}
