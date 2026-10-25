import type { OrigenLaboratorio, SolicitudLaboratorio } from './almacenLaboratorio';
import { calcularResultadosLaboratorio } from './almacenLaboratorio';
import { estudioEjemploFormula } from './ejemploFormulaLaboratorio';

// Datos ficticios para revisar la interfaz; nunca se guardan como solicitudes reales.
export function ejemplosLaboratorio(origen: OrigenLaboratorio): SolicitudLaboratorio[] {
  const fecha = new Date().toISOString();
  const ejemplos: SolicitudLaboratorio[] = [
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
  const valores: Record<string, string> = { 'demo-total': '200', 'demo-hdl': '50', 'demo-tg': '150' };
  const ejemploFormula: SolicitudLaboratorio = {
    id: `ejemplo-formula-${origen}`, consultaId: `ejemplo-formula-${origen}`, origen, paciente: 'Paciente de prueba · Fórmulas', ci: 'DEMO-FORMULA', medico: 'Laboratorio · Ejemplo', fecha, actualizadoEn: fecha, estado: 'en_proceso', observacion: 'Datos ficticios para probar el cálculo. Cambia los triglicéridos y revisa cómo se actualizan VLDL y LDL.',
    estudios: [{ id: estudioEjemploFormula.id, nombre: estudioEjemploFormula.nombre, resultados: estudioEjemploFormula.parametros.map(p => ({ id: `ejemplo-${origen}-${p.id}`, parametroId: p.id, parametro: p.nombre, tipo: p.tipo, unidad: p.unidad, referencia: p.referencia, notaReferencia: p.notaReferencia, ...(p.rangoReferencia ? { rangoReferencia: structuredClone(p.rangoReferencia) } : {}), valor: valores[p.id] || '', ...(p.formula ? { formula: structuredClone(p.formula) } : {}) })) }],
  };
  const fechaAnterior = new Date(new Date(fecha).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const anterior: SolicitudLaboratorio = {
    ...structuredClone(ejemploFormula), id: `ejemplo-formula-historico-${origen}`, consultaId: `ejemplo-formula-historico-${origen}`,
    fecha: fechaAnterior, actualizadoEn: fechaAnterior, finalizadoEn: fechaAnterior, estado: 'anulado', registradoPor: 'Laboratorio · Ejemplo',
    observacion: 'Orden anterior ficticia para consultar el historial. Sus resultados son de solo lectura.',
  };
  const valoresAnteriores: Record<string, string> = { 'demo-total': '205', 'demo-hdl': '45', 'demo-tg': '100' };
  anterior.estudios = anterior.estudios.map(e => ({ ...e, resultados: e.resultados.map(r => ({ ...r, id: `${r.id}-historico`, valor: valoresAnteriores[r.parametroId || ''] || '', registradoEn: fechaAnterior })) }));
  return [...ejemplos, { ...ejemploFormula, estudios: calcularResultadosLaboratorio(ejemploFormula).estudios }, { ...anterior, estudios: calcularResultadosLaboratorio(anterior).estudios }];
}
