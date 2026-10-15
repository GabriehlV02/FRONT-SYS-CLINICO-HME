import type { TipoLaboratorio } from './catalogoLaboratorio';
import { referenciasLipidosAdultos } from './referenciasPerfilLipidico';

export const categoriaEjemploFormula = { id: 'ejemplos-calculo', nombre: 'Ejemplos de cálculo', descripcion: 'Datos ficticios para probar fórmulas', activa: true };
const estudioId = 'lab-ejemplo-lipidico-formula';
const fuente = (variable: string, parametroId: string) => ({ variable, estudioId, parametroId, unidad: 'mg/dL' });
export const estudioEjemploFormula: TipoLaboratorio = {
  id: estudioId, codigo: 'DEMO-FORM-001', nombre: 'Perfil lipídico calculado · Ejemplo',
  categoriaId: categoriaEjemploFormula.id, tipoMuestra: 'Sangre', activo: true,
  descripcion: 'Ejemplo de configuración con datos ficticios: total 200, HDL 50 y triglicéridos 150. VLDL esperado 30 y LDL esperado 120 mg/dL. Usa fórmulas de Friedewald; no calcula con triglicéridos ≥ 400 mg/dL.',
  parametros: [
    { id: 'demo-total', nombre: 'Colesterol total', tipo: 'numero', unidad: 'mg/dL', ...referenciasLipidosAdultos['Colesterol total'] },
    { id: 'demo-hdl', nombre: 'HDL', tipo: 'numero', unidad: 'mg/dL', ...referenciasLipidosAdultos['HDL'] },
    { id: 'demo-tg', nombre: 'Triglicéridos', tipo: 'numero', unidad: 'mg/dL', ...referenciasLipidosAdultos['Triglicéridos'] },
    { id: 'demo-vldl', nombre: 'VLDL estimado', tipo: 'numero', unidad: 'mg/dL', ...referenciasLipidosAdultos['VLDL'], formula: { expresion: 'A / 5', fuentes: [fuente('A', 'demo-tg')], decimales: 2, limite: { variable: 'A', maximoExclusivo: 400 } } },
    { id: 'demo-ldl', nombre: 'LDL estimado', tipo: 'numero', unidad: 'mg/dL', ...referenciasLipidosAdultos['LDL'], formula: { expresion: 'A - B - C', fuentes: [fuente('A', 'demo-total'), fuente('B', 'demo-hdl'), fuente('C', 'demo-vldl')], decimales: 2 } },
  ],
};
