export type CategoriaLaboratorio = { id: string; nombre: string; descripcion: string; activa: boolean };
export type ParametroLaboratorio = { id: string; nombre: string; tipo: 'numero' | 'texto'; unidad: string; referencia: string };
export type TipoLaboratorio = {
  id: string; codigo: string; nombre: string; categoriaId: string; tipoMuestra: string;
  descripcion: string; activo: boolean; parametros: ParametroLaboratorio[];
};
export type ConfiguracionLaboratorio = { categorias: CategoriaLaboratorio[]; tipos: TipoLaboratorio[] };

const clave = 'clinico.laboratorio.catalogo.v1';
const evento = 'laboratorio:catalogo';
const claveAmpliacion = 'clinico.laboratorio.catalogo.ampliacion.v1';
const gruposAdicionales: CategoriaLaboratorio[] = [
  { id: 'coagulacion', nombre: 'Hemostasia y coagulación', descripcion: 'Pruebas de coagulación', activa: true },
  { id: 'electrolitos', nombre: 'Electrolitos', descripcion: 'Electrolitos séricos', activa: true },
  { id: 'serologia', nombre: 'Serología', descripcion: 'Pruebas serológicas', activa: true },
  { id: 'parasitologia', nombre: 'Parasitología', descripcion: 'Estudios de heces', activa: true },
  { id: 'inmunologia', nombre: 'Inmunología', descripcion: 'Inmunoglobulinas', activa: true },
];
function examen(id: string, codigo: string, nombre: string, categoriaId: string, tipoMuestra: string, parametros: [string, string, 'numero' | 'texto'][]): TipoLaboratorio {
  return { id, codigo, nombre, categoriaId, tipoMuestra, descripcion: '', activo: true, parametros: parametros.map(([nombreParametro, unidad, tipo], indice) => ({ id: `${id}-p${indice + 1}`, nombre: nombreParametro, unidad, tipo, referencia: '' })) };
}
const tiposAdicionales: TipoLaboratorio[] = [
  examen('lab-grupo-rh', 'LAB-004', 'Grupo sanguíneo y factor RH', 'hematologia', 'Sangre', [['Grupo sanguíneo', '', 'texto'], ['Factor RH', '', 'texto']]),
  examen('lab-plaquetas', 'LAB-005', 'Recuento de plaquetas', 'hematologia', 'Sangre', [['Plaquetas', '', 'numero']]),
  examen('lab-creatinina', 'LAB-006', 'Creatinina', 'bioquimica', 'Sangre', [['Creatinina', 'mg/dL', 'numero']]),
  examen('lab-urea', 'LAB-007', 'Urea', 'bioquimica', 'Sangre', [['Urea', 'mg/dL', 'numero']]),
  examen('lab-lipidico', 'LAB-008', 'Perfil lipídico', 'bioquimica', 'Sangre', [['Colesterol total', 'mg/dL', 'numero'], ['HDL', 'mg/dL', 'numero'], ['LDL', 'mg/dL', 'numero'], ['Triglicéridos', 'mg/dL', 'numero']]),
  examen('lab-transaminasas', 'LAB-009', 'Transaminasas GOT / GPT', 'bioquimica', 'Sangre', [['GOT / AST', 'U/L', 'numero'], ['GPT / ALT', 'U/L', 'numero']]),
  examen('lab-tp', 'LAB-010', 'Tiempo de protrombina e INR', 'coagulacion', 'Plasma', [['Tiempo de protrombina', 's', 'numero'], ['INR', '', 'numero']]),
  examen('lab-aptt', 'LAB-011', 'A.P.T.T.', 'coagulacion', 'Plasma', [['A.P.T.T.', 's', 'numero']]),
  examen('lab-dimero-d', 'LAB-012', 'Dímero D', 'coagulacion', 'Plasma', [['Dímero D', '', 'numero']]),
  examen('lab-electrolitos', 'LAB-013', 'Electrolitos Na / K / Cl', 'electrolitos', 'Sangre', [['Sodio', 'mmol/L', 'numero'], ['Potasio', 'mmol/L', 'numero'], ['Cloro', 'mmol/L', 'numero']]),
  examen('lab-calcio', 'LAB-014', 'Calcio', 'electrolitos', 'Sangre', [['Calcio', 'mg/dL', 'numero']]),
  examen('lab-pcr', 'LAB-015', 'Proteína C reactiva', 'serologia', 'Sangre', [['Proteína C reactiva', '', 'numero']]),
  examen('lab-vdrl', 'LAB-016', 'VDRL', 'serologia', 'Sangre', [['Resultado', '', 'texto'], ['Título', '', 'texto']]),
  examen('lab-copro', 'LAB-017', 'Coproparasitológico directo', 'parasitologia', 'Heces', [['Aspecto', '', 'texto'], ['Parásitos observados', '', 'texto']]),
  examen('lab-sangre-oculta', 'LAB-018', 'Sangre oculta en heces', 'parasitologia', 'Heces', [['Resultado', '', 'texto']]),
  examen('lab-iga', 'LAB-019', 'Inmunoglobulina A (IgA)', 'inmunologia', 'Sangre', [['IgA', '', 'numero']]),
  examen('lab-igg', 'LAB-020', 'Inmunoglobulina G (IgG)', 'inmunologia', 'Sangre', [['IgG', '', 'numero']]),
  examen('lab-creatinina-orina', 'LAB-021', 'Creatinina en orina casual', 'uroanalisis', 'Orina', [['Creatinina en orina', 'mg/dL', 'numero']]),
];
const inicial: ConfiguracionLaboratorio = {
  categorias: [
    { id: 'hematologia', nombre: 'Hematología', descripcion: 'Estudios hematológicos', activa: true },
    { id: 'bioquimica', nombre: 'Bioquímica', descripcion: 'Química clínica', activa: true },
    { id: 'uroanalisis', nombre: 'Uroanálisis', descripcion: 'Estudios de orina', activa: true },
    ...gruposAdicionales,
  ],
  tipos: [
    { id: 'lab-hemograma', codigo: 'LAB-001', nombre: 'Hemograma completo', categoriaId: 'hematologia', tipoMuestra: 'Sangre', descripcion: '', activo: true, parametros: [
      { id: 'hemoglobina', nombre: 'Hemoglobina', tipo: 'numero', unidad: 'g/dL', referencia: '' },
      { id: 'hematocrito', nombre: 'Hematocrito', tipo: 'numero', unidad: '%', referencia: '' },
      { id: 'leucocitos', nombre: 'Leucocitos', tipo: 'numero', unidad: '', referencia: '' },
    ] },
    { id: 'lab-glucosa', codigo: 'LAB-002', nombre: 'Glucosa', categoriaId: 'bioquimica', tipoMuestra: 'Sangre', descripcion: '', activo: true, parametros: [
      { id: 'glucosa', nombre: 'Glucosa', tipo: 'numero', unidad: 'mg/dL', referencia: '' },
    ] },
    { id: 'lab-orina', codigo: 'LAB-003', nombre: 'Examen general de orina', categoriaId: 'uroanalisis', tipoMuestra: 'Orina', descripcion: '', activo: true, parametros: [
      { id: 'aspecto', nombre: 'Aspecto', tipo: 'texto', unidad: '', referencia: '' },
      { id: 'color', nombre: 'Color', tipo: 'texto', unidad: '', referencia: '' },
    ] },
    ...tiposAdicionales,
  ],
};

export function leerCatalogoLaboratorio(): ConfiguracionLaboratorio {
  const guardado = localStorage.getItem(clave);
  if (!guardado) return structuredClone(inicial);
  const datos = JSON.parse(guardado) as ConfiguracionLaboratorio;
  if (!datos || !Array.isArray(datos.categorias) || !Array.isArray(datos.tipos)
    || !datos.categorias.every(c => c && ['id', 'nombre', 'descripcion'].every(k => typeof c[k as keyof CategoriaLaboratorio] === 'string') && typeof c.activa === 'boolean')
    || !datos.tipos.every(t => t && ['id', 'codigo', 'nombre', 'categoriaId', 'tipoMuestra', 'descripcion'].every(k => typeof t[k as keyof TipoLaboratorio] === 'string')
      && typeof t.activo === 'boolean' && Array.isArray(t.parametros) && t.parametros.every(p => p && ['id', 'nombre', 'unidad', 'referencia'].every(k => typeof p[k as keyof ParametroLaboratorio] === 'string') && ['numero', 'texto'].includes(p.tipo)))) {
    throw new Error('No se pudo leer la configuración local de laboratorio.');
  }
  if (!localStorage.getItem(claveAmpliacion)) {
    for (const categoria of gruposAdicionales) {
      if (!datos.categorias.some(c => c.id === categoria.id || c.nombre.toLocaleLowerCase() === categoria.nombre.toLocaleLowerCase())) datos.categorias.push(structuredClone(categoria));
    }
    for (const tipo of tiposAdicionales) {
      if (datos.categorias.some(c => c.id === tipo.categoriaId) && !datos.tipos.some(t => t.id === tipo.id || t.codigo.toUpperCase() === tipo.codigo || t.nombre.toLocaleLowerCase() === tipo.nombre.toLocaleLowerCase())) datos.tipos.push(structuredClone(tipo));
    }
    localStorage.setItem(clave, JSON.stringify(datos));
    localStorage.setItem(claveAmpliacion, '1');
  }
  return datos;
}

export function suscribirCatalogoLaboratorio(actualizar: () => void) {
  const cambiar = (e: StorageEvent) => { if (e.key === clave || e.key === null) actualizar(); };
  window.addEventListener(evento, actualizar);
  window.addEventListener('storage', cambiar);
  return () => { window.removeEventListener(evento, actualizar); window.removeEventListener('storage', cambiar); };
}

function persistir(datos: ConfiguracionLaboratorio) {
  localStorage.setItem(clave, JSON.stringify(datos));
  window.dispatchEvent(new Event(evento));
}

export function guardarTipoLaboratorio(tipo: TipoLaboratorio) {
  const catalogo = leerCatalogoLaboratorio();
  const limpio: TipoLaboratorio = { ...tipo, nombre: tipo.nombre.trim(), codigo: tipo.codigo.trim().toUpperCase(), tipoMuestra: tipo.tipoMuestra.trim(), descripcion: tipo.descripcion.trim(), parametros: tipo.parametros.map(p => ({ ...p, nombre: p.nombre.trim(), unidad: p.unidad.trim(), referencia: p.referencia.trim() })) };
  if (!limpio.nombre || !limpio.codigo) throw new Error('Completa el código y el nombre del tipo de laboratorio.');
  if (!catalogo.categorias.some(c => c.id === limpio.categoriaId && (c.activa || !limpio.activo))) throw new Error('Selecciona una categoría activa para este laboratorio.');
  if (!limpio.parametros.length || limpio.parametros.some(p => !p.nombre)) throw new Error('Agrega al menos un parámetro y completa su nombre.');
  if (new Set(limpio.parametros.map(p => p.nombre.toLocaleLowerCase())).size !== limpio.parametros.length) throw new Error('Los nombres de los parámetros no deben repetirse dentro del examen.');
  if (catalogo.tipos.some(t => t.id !== limpio.id && (t.codigo.toUpperCase() === limpio.codigo || t.nombre.toLocaleLowerCase() === limpio.nombre.toLocaleLowerCase()))) throw new Error('Ya existe un tipo de laboratorio con ese código o nombre.');
  persistir({ ...catalogo, tipos: catalogo.tipos.some(t => t.id === limpio.id) ? catalogo.tipos.map(t => t.id === limpio.id ? limpio : t) : [...catalogo.tipos, limpio] });
}

export function guardarCategoriaLaboratorio(categoria: CategoriaLaboratorio) {
  const catalogo = leerCatalogoLaboratorio();
  const limpia = { ...categoria, nombre: categoria.nombre.trim(), descripcion: categoria.descripcion.trim() };
  if (!limpia.nombre) throw new Error('Completa el nombre de la categoría.');
  if (catalogo.categorias.some(c => c.id !== limpia.id && c.nombre.toLocaleLowerCase() === limpia.nombre.toLocaleLowerCase())) throw new Error('Ya existe una categoría con ese nombre.');
  persistir({ ...catalogo, categorias: catalogo.categorias.some(c => c.id === limpia.id) ? catalogo.categorias.map(c => c.id === limpia.id ? limpia : c) : [...catalogo.categorias, limpia] });
}

export function tiposLaboratorioActivos(catalogo = leerCatalogoLaboratorio()) {
  return catalogo.tipos.filter(t => t.activo && catalogo.categorias.some(c => c.id === t.categoriaId && c.activa));
}
