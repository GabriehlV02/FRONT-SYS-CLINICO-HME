import type { ParametroLaboratorio } from './catalogoLaboratorio';

// Referencias orientativas para adultos, revisadas en MedlinePlus.
// https://medlineplus.gov/ency/article/007812.htm
// https://medlineplus.gov/lab-tests/cholesterol-levels/
export const referenciasLipidosAdultos: Record<string, Pick<ParametroLaboratorio, 'referencia' | 'notaReferencia' | 'rangoReferencia'>> = {
  'Colesterol total': { referencia: '< 200', rangoReferencia: { minimo: 0, maximo: 200, maximoInclusivo: false }, notaReferencia: 'Adultos ≥20 años · Referencia orientativa (MedlinePlus).' },
  HDL: { referencia: 'Hombres: ≥ 40; mujeres: ≥ 50', notaReferencia: 'Adultos: ≥60 mg/dL es deseable. Interpretar según sexo; no se clasifica automáticamente sin ese dato.' },
  Triglicéridos: { referencia: '< 150', rangoReferencia: { minimo: 0, maximo: 150, maximoInclusivo: false }, notaReferencia: 'Adultos ≥20 años · Referencia orientativa (MedlinePlus).' },
  VLDL: { referencia: '2 – 30', rangoReferencia: { minimo: 2, maximo: 30 }, notaReferencia: 'Adultos · Referencia orientativa (MedlinePlus).' },
  LDL: { referencia: '< 100', rangoReferencia: { minimo: 0, maximo: 100, maximoInclusivo: false }, notaReferencia: 'Adultos: objetivo general orientativo. Puede ser más estricto según el riesgo cardiovascular.' },
};
