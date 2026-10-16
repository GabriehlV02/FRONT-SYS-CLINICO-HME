export type EstadoInternacion = 'preinternacion' | 'confirmada';

export type RegistroInternacion = {
  id: string;
  paciente: string;
  ci: string;
  medico: string;
  motivo: string;
  fecha: string;
  estado: EstadoInternacion;
  sala?: string;
  cama?: string;
  tipoSala?: string;
  datosPaciente?: Record<string, string>;
  fechaIngreso?: string;
  horaIngreso?: string;
  origen?: string;
  servicio?: string;
  observaciones?: string;
};

const clave = 'hme:internaciones';
const evento = 'internacion:actualizada';
let cache: RegistroInternacion[] | null = null;
const ejemploConfirmado: RegistroInternacion = {
  id: 'INT-108B', paciente: 'Camila Adriana Hidalgo Ayllón', ci: '9392922', medico: 'Dr. responsable',
  motivo: 'Seguimiento de internación', fecha: '13/10/2026', estado: 'confirmada', sala: '108', cama: 'B', tipoSala: 'Sala compartida',
};

function disponible() { return typeof window !== 'undefined'; }

export function leerInternaciones(): RegistroInternacion[] {
  if (cache) return cache;
  if (!disponible()) return (cache = [ejemploConfirmado]);
  try {
    const guardadas = JSON.parse(window.localStorage.getItem(clave) ?? '[]');
    if (!Array.isArray(guardadas)) return (cache = [ejemploConfirmado]);
    const ejemploGuardado = guardadas.find(item => item?.id === ejemploConfirmado.id);
    return (cache = [ejemploGuardado ?? ejemploConfirmado, ...guardadas.filter(item => item?.id !== ejemploConfirmado.id)]);
  } catch { return (cache = [ejemploConfirmado]); }
}

function guardar(registros: RegistroInternacion[]) {
  cache = registros;
  const persistentes = cache.filter(item => item.id !== ejemploConfirmado.id || JSON.stringify(item) !== JSON.stringify(ejemploConfirmado));
  window.localStorage.setItem(clave, JSON.stringify(persistentes));
  window.dispatchEvent(new Event(evento));
}

export function crearPreinternacion(datos: Omit<RegistroInternacion, 'id' | 'fecha' | 'estado'>) {
  const registro: RegistroInternacion = {
    ...datos, id: `PRE-${Date.now()}`, fecha: new Date().toLocaleDateString('es-BO'), estado: 'preinternacion',
  };
  guardar([...leerInternaciones().filter(item => item.id !== ejemploConfirmado.id), registro]);
  return registro;
}

export function confirmarInternacion(id: string, asignacion: Pick<RegistroInternacion, 'sala' | 'cama' | 'tipoSala'>) {
  const fechaIngreso = new Date().toLocaleDateString('es-BO');
  guardar(leerInternaciones().map(item => item.id === id ? { ...item, ...asignacion, fechaIngreso: item.fechaIngreso ?? fechaIngreso, estado: 'confirmada' as const } : item));
}

export function actualizarInternacion(id: string, cambios: Pick<RegistroInternacion, 'sala' | 'cama' | 'fechaIngreso'>) {
  guardar(leerInternaciones().map(item => item.id === id && item.estado === 'confirmada' ? { ...item, ...cambios } : item));
}

export function suscribirInternaciones(actualizar: () => void) {
  if (!disponible()) return () => undefined;
  const manejar = () => { cache = null; actualizar(); };
  window.addEventListener(evento, manejar);
  window.addEventListener('storage', manejar);
  return () => { window.removeEventListener(evento, manejar); window.removeEventListener('storage', manejar); };
}
