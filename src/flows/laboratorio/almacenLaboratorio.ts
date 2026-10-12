import { leerCatalogoLaboratorio, tiposLaboratorioActivos } from './catalogoLaboratorio';

export type OrigenLaboratorio = 'ambulatorio' | 'internacion';
export type EstadoLaboratorio = 'pendiente' | 'en_proceso' | 'completado';
export type ResultadoLaboratorio = { id: string; parametro: string; valor: string; unidad: string; referencia: string; tipo?: 'numero' | 'texto' };
export type EstudioLaboratorio = { id: string; nombre: string; resultados: ResultadoLaboratorio[] };
export type SolicitudLaboratorio = {
  id: string; paciente: string; ci: string; medico: string; origen: OrigenLaboratorio;
  consultaId: string; fecha: string; estado: EstadoLaboratorio; estudios: EstudioLaboratorio[];
  observacion: string; actualizadoEn: string; finalizadoEn?: string; registradoPor?: string;
  procedencia?: 'recepcion' | 'consultorio'; indicaciones?: string; prioridad?: 'normal' | 'urgente'; solicitadoPor?: string;
};

const clave = 'clinico.laboratorio.solicitudes.v1';
const evento = 'laboratorio:actualizado';
const estados: EstadoLaboratorio[] = ['pendiente', 'en_proceso', 'completado'];

export function leerSolicitudesLaboratorio(): SolicitudLaboratorio[] {
  const contenido = localStorage.getItem(clave);
  if (!contenido) return [];
  const datos: unknown = JSON.parse(contenido);
  if (!Array.isArray(datos) || !datos.every(s => s && typeof s.id === 'string' && typeof s.paciente === 'string'
    && typeof s.ci === 'string' && typeof s.fecha === 'string' && estados.includes(s.estado)
    && ['ambulatorio', 'internacion'].includes(s.origen) && Array.isArray(s.estudios)
    && s.estudios.every((e: EstudioLaboratorio) => e && typeof e.id === 'string' && typeof e.nombre === 'string'
      && Array.isArray(e.resultados) && e.resultados.every(r => r && ['id', 'parametro', 'valor', 'unidad', 'referencia'].every(k => typeof r[k as keyof ResultadoLaboratorio] === 'string'))))) {
    throw new Error('No se pudieron leer las solicitudes de laboratorio guardadas.');
  }
  return datos;
}

function persistir(solicitudes: SolicitudLaboratorio[]) {
  localStorage.setItem(clave, JSON.stringify(solicitudes));
  window.dispatchEvent(new Event(evento));
}

export function suscribirLaboratorio(actualizar: () => void) {
  const alCambiar = (e: StorageEvent) => { if (e.key === clave || e.key === null) actualizar(); };
  window.addEventListener(evento, actualizar);
  window.addEventListener('storage', alCambiar);
  return () => { window.removeEventListener(evento, actualizar); window.removeEventListener('storage', alCambiar); };
}

export function crearSolicitudLaboratorio(
  paciente: Pick<SolicitudLaboratorio, 'paciente' | 'ci' | 'medico' | 'consultaId'>,
  estudios: { id: string; nombre: string }[], origen: OrigenLaboratorio = 'ambulatorio',
  detalle: Pick<SolicitudLaboratorio, 'procedencia' | 'indicaciones' | 'prioridad' | 'solicitadoPor'> = {},
) {
  if (!paciente.ci.trim() || !paciente.paciente.trim() || !estudios.length) throw new Error('Selecciona un paciente y al menos un estudio.');
  const existentes = leerSolicitudesLaboratorio();
  const unicos = [...new Map(estudios.map(e => [e.id, e])).values()];
  const repetidos = existentes.filter(s => s.consultaId === paciente.consultaId && s.origen === origen && s.estado !== 'completado')
    .flatMap(s => s.estudios.map(e => e.id));
  const nuevos = unicos.filter(e => !repetidos.includes(e.id));
  if (!nuevos.length) throw new Error('Estos estudios ya están pendientes para esta consulta.');
  const configuracion = leerCatalogoLaboratorio();
  const activos = tiposLaboratorioActivos(configuracion);
  if (nuevos.some(e => configuracion.tipos.some(t => t.id === e.id) && !activos.some(t => t.id === e.id))) throw new Error('Uno de los estudios fue desactivado. Vuelve a abrir la orden y selecciona los tipos disponibles.');
  const fecha = new Date().toISOString();
  const solicitud: SolicitudLaboratorio = {
    ...paciente, ...detalle, id: crypto.randomUUID(), origen, fecha, actualizadoEn: fecha, estado: 'pendiente', observacion: '',
    estudios: nuevos.map(e => {
      const tipo = activos.find(t => t.id === e.id);
      return { ...e, resultados: tipo ? tipo.parametros.map(p => ({ id: crypto.randomUUID(), parametro: p.nombre, valor: '', unidad: p.unidad, referencia: p.referencia, tipo: p.tipo })) : [{ id: crypto.randomUUID(), parametro: e.nombre, valor: '', unidad: '', referencia: '' }] };
    }),
  };
  persistir([solicitud, ...existentes]);
  return solicitud;
}

export function guardarResultadosLaboratorio(solicitud: SolicitudLaboratorio, finalizar: boolean, registradoPor: string) {
  const solicitudes = leerSolicitudesLaboratorio();
  const actual = solicitudes.find(s => s.id === solicitud.id);
  if (!actual) throw new Error('La solicitud ya no está disponible.');
  if (actual.estado === 'completado') throw new Error('Los resultados finalizados son de solo lectura.');
  if (actual.actualizadoEn !== solicitud.actualizadoEn) throw new Error('La solicitud cambió en otra pestaña. Vuelve a abrirla antes de guardar.');
  if (solicitud.estudios.length !== actual.estudios.length || solicitud.estudios.some(e => !actual.estudios.some(a => a.id === e.id))) throw new Error('Los estudios de la solicitud no coinciden.');
  if (finalizar && solicitud.estudios.some(e => !e.resultados.length || e.resultados.some(r => !r.parametro.trim() || !r.valor.trim()))) {
    throw new Error('Completa el nombre y el resultado de todos los parámetros antes de finalizar.');
  }
  const fecha = new Date().toISOString();
  const actualizado: SolicitudLaboratorio = {
    ...actual, estudios: solicitud.estudios, observacion: solicitud.observacion.trim(), registradoPor,
    estado: finalizar ? 'completado' : 'en_proceso', actualizadoEn: fecha,
    ...(finalizar ? { finalizadoEn: fecha } : {}),
  };
  persistir(solicitudes.map(s => s.id === actual.id ? actualizado : s));
  return actualizado;
}
