export type EstadoMaterial = 'pendiente' | 'sucio' | 'esterilizacion' | 'limpio' | 'reservado' | 'cirugia';
export type MaterialEsteril = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string;
  serie: string;
  sector: string;
  descripcion: string;
  estado: EstadoMaterial;
  cirugiaId: string;
  actualizadoEn: string;
};
export type KitEsteril = { id: string; nombre: string; descripcion: string; especialidades?: string[]; materialIds: string[] };
export type MovimientoEsteril = {
  id: string;
  materialId: string;
  desde: EstadoMaterial | 'registro';
  hacia: EstadoMaterial;
  cirugiaId: string;
  fecha: string;
};
export type EstadoEsterilizacion = { materiales: MaterialEsteril[]; kits: KitEsteril[]; movimientos: MovimientoEsteril[] };

export const ETIQUETAS_ESTADO: Record<EstadoMaterial, string> = {
  pendiente: 'Pendiente de esterilización',
  sucio: 'Sucio',
  esterilizacion: 'En esterilización',
  limpio: 'Limpio y disponible',
  reservado: 'Reservado',
  cirugia: 'En cirugía',
};

export const SIGUIENTES_ESTADOS: Record<EstadoMaterial, EstadoMaterial[]> = {
  pendiente: ['esterilizacion'],
  sucio: ['esterilizacion'],
  esterilizacion: ['limpio'],
  limpio: ['reservado', 'esterilizacion'],
  reservado: ['cirugia', 'limpio'],
  cirugia: ['sucio'],
};

const CLAVE = 'hme-esterilizacion-v1';
const VACIO: EstadoEsterilizacion = { materiales: [], kits: [], movimientos: [] };
const fechaDemo = (diasAtras: number) => new Date(Date.now() - diasAtras * 86_400_000).toISOString();

const materialesDemo: MaterialEsteril[] = [
  { id: 'demo-material-001', codigo: 'INST-001', nombre: 'Pinza hemostática Kelly', tipo: 'Instrumento', marca: 'HME', serie: 'SER-KEL-001', sector: 'Central de esterilización', descripcion: 'Pinza recta de 14 cm para cirugía general.', estado: 'limpio', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-002', codigo: 'INST-002', nombre: 'Tijera Mayo recta', tipo: 'Instrumento', marca: 'HME', serie: 'SER-MAY-002', sector: 'Central de esterilización', descripcion: 'Tijera reutilizable para tejido y sutura.', estado: 'limpio', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-003', codigo: 'INST-003', nombre: 'Portaagujas Mayo-Hegar', tipo: 'Instrumento', marca: 'HME', serie: 'SER-HEG-003', sector: 'Central de esterilización', descripcion: 'Portaagujas mediano para sutura.', estado: 'limpio', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-004', codigo: 'INST-004', nombre: 'Pinza de campo Backhaus', tipo: 'Instrumento', marca: 'HME', serie: 'SER-BAC-004', sector: 'Recepción de material', descripcion: 'Pendiente de lavado tras su uso.', estado: 'sucio', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-005', codigo: 'INST-005', nombre: 'Separador Farabeuf', tipo: 'Instrumento', marca: 'HME', serie: 'SER-FAR-005', sector: 'Recepción de material', descripcion: 'Esperando limpieza y acondicionamiento.', estado: 'sucio', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-006', codigo: 'INST-006', nombre: 'Pinza Foerster', tipo: 'Instrumento', marca: 'HME', serie: 'SER-FOE-006', sector: 'Sala de esterilización', descripcion: 'Ciclo de esterilización en curso.', estado: 'esterilizacion', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-007', codigo: 'INST-007', nombre: 'Tijera Metzenbaum', tipo: 'Instrumento', marca: 'HME', serie: 'SER-MET-007', sector: 'Sala de esterilización', descripcion: 'En proceso de esterilización.', estado: 'esterilizacion', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-008', codigo: 'INST-008', nombre: 'Pinza Rochester-Pean', tipo: 'Instrumento', marca: 'HME', serie: 'SER-ROC-008', sector: 'Quirófano 1', descripcion: 'Reservada para cirugía de demostración.', estado: 'reservado', cirugiaId: 'demo-cirugia-cesarea', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-009', codigo: 'INST-009', nombre: 'Separador Richardson', tipo: 'Instrumento', marca: 'HME', serie: 'SER-RIC-009', sector: 'Quirófano 1', descripcion: 'Reservado para cirugía de demostración.', estado: 'reservado', cirugiaId: 'demo-cirugia-cesarea', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-010', codigo: 'INST-010', nombre: 'Pinza Allis', tipo: 'Instrumento', marca: 'HME', serie: 'SER-ALL-010', sector: 'Quirófano 1', descripcion: 'Asignada a cirugía en curso de demostración.', estado: 'cirugia', cirugiaId: 'demo-cirugia-actual', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-011', codigo: 'INST-011', nombre: 'Mango de bisturí N.º 3', tipo: 'Instrumento', marca: 'HME', serie: 'SER-BIS-011', sector: 'Recepción de material', descripcion: 'Registro nuevo pendiente de esterilización.', estado: 'pendiente', cirugiaId: '', actualizadoEn: fechaDemo(0) },
  { id: 'demo-material-012', codigo: 'INST-012', nombre: 'Espéculo vaginal mediano', tipo: 'Instrumento', marca: 'HME', serie: 'SER-ESP-012', sector: 'Recepción de material', descripcion: 'Registro nuevo pendiente de esterilización.', estado: 'pendiente', cirugiaId: '', actualizadoEn: fechaDemo(0) },
];

const kitsDemo: KitEsteril[] = [
  { id: 'demo-kit-general', nombre: 'Kit de cirugía general', descripcion: 'Instrumental básico listo para reservar.', especialidades: ['Cirugía general'], materialIds: ['demo-material-001', 'demo-material-002', 'demo-material-003'] },
  { id: 'demo-kit-ginecologia', nombre: 'Kit de cesárea', descripcion: 'Instrumental asignado a una cirugía programada.', especialidades: ['Ginecología y obstetricia'], materialIds: ['demo-material-008', 'demo-material-009'] },
  { id: 'demo-kit-lavado', nombre: 'Kit en reprocesamiento', descripcion: 'Piezas que requieren limpieza y esterilización.', especialidades: ['Cirugía general', 'Traumatología'], materialIds: ['demo-material-004', 'demo-material-006'] },
];

const movimientosDemo: MovimientoEsteril[] = [
  { id: 'demo-mov-001', materialId: 'demo-material-001', desde: 'registro', hacia: 'pendiente', cirugiaId: '', fecha: fechaDemo(3) },
  { id: 'demo-mov-002', materialId: 'demo-material-001', desde: 'pendiente', hacia: 'esterilizacion', cirugiaId: '', fecha: fechaDemo(2) },
  { id: 'demo-mov-003', materialId: 'demo-material-001', desde: 'esterilizacion', hacia: 'limpio', cirugiaId: '', fecha: fechaDemo(1) },
  { id: 'demo-mov-004', materialId: 'demo-material-002', desde: 'registro', hacia: 'pendiente', cirugiaId: '', fecha: fechaDemo(3) },
  { id: 'demo-mov-005', materialId: 'demo-material-002', desde: 'pendiente', hacia: 'esterilizacion', cirugiaId: '', fecha: fechaDemo(2) },
  { id: 'demo-mov-006', materialId: 'demo-material-002', desde: 'esterilizacion', hacia: 'limpio', cirugiaId: '', fecha: fechaDemo(1) },
  { id: 'demo-mov-007', materialId: 'demo-material-003', desde: 'registro', hacia: 'pendiente', cirugiaId: '', fecha: fechaDemo(2) },
  { id: 'demo-mov-008', materialId: 'demo-material-003', desde: 'pendiente', hacia: 'esterilizacion', cirugiaId: '', fecha: fechaDemo(1) },
  { id: 'demo-mov-009', materialId: 'demo-material-003', desde: 'esterilizacion', hacia: 'limpio', cirugiaId: '', fecha: fechaDemo(0) },
  { id: 'demo-mov-010', materialId: 'demo-material-004', desde: 'cirugia', hacia: 'sucio', cirugiaId: '', fecha: fechaDemo(0) },
  { id: 'demo-mov-011', materialId: 'demo-material-005', desde: 'cirugia', hacia: 'sucio', cirugiaId: '', fecha: fechaDemo(0) },
  { id: 'demo-mov-012', materialId: 'demo-material-006', desde: 'sucio', hacia: 'esterilizacion', cirugiaId: '', fecha: fechaDemo(0) },
  { id: 'demo-mov-013', materialId: 'demo-material-007', desde: 'sucio', hacia: 'esterilizacion', cirugiaId: '', fecha: fechaDemo(0) },
  { id: 'demo-mov-014', materialId: 'demo-material-008', desde: 'limpio', hacia: 'reservado', cirugiaId: 'demo-cirugia-cesarea', fecha: fechaDemo(0) },
  { id: 'demo-mov-015', materialId: 'demo-material-009', desde: 'limpio', hacia: 'reservado', cirugiaId: 'demo-cirugia-cesarea', fecha: fechaDemo(0) },
  { id: 'demo-mov-016', materialId: 'demo-material-010', desde: 'reservado', hacia: 'cirugia', cirugiaId: 'demo-cirugia-actual', fecha: fechaDemo(0) },
  { id: 'demo-mov-017', materialId: 'demo-material-011', desde: 'registro', hacia: 'pendiente', cirugiaId: '', fecha: fechaDemo(0) },
  { id: 'demo-mov-018', materialId: 'demo-material-012', desde: 'registro', hacia: 'pendiente', cirugiaId: '', fecha: fechaDemo(0) },
];

const EJEMPLO: EstadoEsterilizacion = { materiales: materialesDemo, kits: kitsDemo, movimientos: movimientosDemo };

export function leerEsterilizacion(): EstadoEsterilizacion {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === null) return EJEMPLO;
    const datos: unknown = JSON.parse(guardado);
    if (!datos || typeof datos !== 'object') return VACIO;
    const estado = datos as Partial<EstadoEsterilizacion>;
    return {
      materiales: Array.isArray(estado.materiales) ? estado.materiales : [],
      kits: Array.isArray(estado.kits) ? estado.kits : [],
      movimientos: Array.isArray(estado.movimientos) ? estado.movimientos : [],
    };
  } catch { return VACIO; }
}

export function guardarEsterilizacion(estado: EstadoEsterilizacion): void {
  localStorage.setItem(CLAVE, JSON.stringify(estado));
}
