import { apiFetch } from '../../radius/api';
import { leerSesion } from '../../radius/types/sesion';

export type ItemEmergencia = { id: string; codigo: string; nombre: string; tipo: 'servicio' | 'producto'; unidad: string; precio: number; categoria?: string; grupo?: string };
export type OrdenEmergencia = {
  id: string; revision: number; fecha: string; usuario: string; tipo: string; titulo: string;
  indicaciones: string; dosis: string; via: string; frecuencia: string; duracion: string;
  itemId: string; porHora: boolean; estado: 'pendiente' | 'en_curso' | 'aplicada' | 'cancelada';
  aplicaciones: { id: string; fecha: string; usuario: string; observacion: string; consumoId?: string }[];
  historial: { fecha: string; usuario: string; detalle: string }[];
};
export type CuentaEmergencia = {
  id: string; cubiculo: string; inicio: string; fin: string | null; revision: number;
  identidad: Record<string, string> | null;
  signos: { id: string; fecha: string; valores: Record<string, number>; observacion: string }[];
  consumos: (ItemEmergencia & { registroId: string; cantidad: number; porHora: boolean; inicio: string; fin: string | null; ordenId?: string })[];
  evaluaciones?: { id?: string; revision: number; fecha: string; usuario: string; campos: Record<string, string> }[];
  ordenes?: OrdenEmergencia[];
  cierre?: { condicionEgreso: 'vivo' | 'muerto'; causaEgreso: 'hospitalaria' | 'solicitada' | 'fuga' | 'transferencia' | 'deceso' | 'internacion'; observacionEgreso?: string; fecha: string; usuario: string } | null;
};
const lecturasEnCurso = new Map<string, Promise<unknown>>();
const cacheLecturas = new Map<string, { expira: number; valor: unknown }>();
const ttlLecturaMs = 2_000;

function claveLectura(ruta: string) {
  return `emergencias:${ruta || 'cuentas'}`;
}

export function invalidarCacheEmergencias() {
  cacheLecturas.clear();
}

async function solicitarEmergencias<T>(ruta = '', body?: object): Promise<T> {
  if (import.meta.env.DEV && leerSesion()?.token === 'frontend-demo-local') {
    const clave = 'clinico-emergencias-demo-v1';
    const cuentas: CuentaEmergencia[] = JSON.parse(sessionStorage.getItem(clave) || '[]');
    const datos = (body || {}) as Record<string, any>;
    const fecha = new Date().toISOString();
    if (ruta === '/catalogo') return [] as T;
    if (!ruta && !body) return { cuentas } as T;
    let cuenta: CuentaEmergencia;
    if (!ruta) {
      if (cuentas.some(c => !c.fin && c.cubiculo === datos.cubiculo)) throw new Error('Ese cubículo ya está ocupado.');
      cuenta = { id: crypto.randomUUID(), cubiculo: datos.cubiculo, inicio: fecha, fin: null, revision: 1, identidad: datos.identidad || null, signos: [], consumos: [], evaluaciones: [], ordenes: [] };
      cuentas.push(cuenta);
    } else {
      const [id, accion] = ruta.split('/').filter(Boolean);
      const encontrada = cuentas.find(c => c.id === id);
      if (!encontrada) throw new Error('Atención demo no encontrada.');
      cuenta = encontrada;
      if (accion === 'evaluacion') (cuenta.evaluaciones ||= []).push({ id: crypto.randomUUID(), revision: 1, fecha, usuario: 'Admin demo', campos: datos.campos || datos });
      else if (accion === 'signos') {
        const valores = datos.valores || {};
        if (!Object.keys(valores).length) throw new Error('Registra al menos un signo vital.');
        const registro = new Date();
        if (/^\d{2}:\d{2}$/.test(datos.hora || '')) { const [hora, minuto] = datos.hora.split(':').map(Number); registro.setHours(hora, minuto, 0, 0); }
        cuenta.signos.push({ id: crypto.randomUUID(), fecha: registro.toISOString(), valores, observacion: datos.observacion || '' });
        cuenta.signos.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
      }
      else if (accion === 'identidad') cuenta.identidad = { ...cuenta.identidad, ...datos };
      else if (accion === 'orden') {
        const orden = { tipo: '', titulo: '', indicaciones: '', dosis: '', via: '', frecuencia: '', duracion: '', itemId: '', porHora: false, ...datos, id: crypto.randomUUID(), revision: 1, fecha, usuario: 'Admin demo', estado: 'pendiente', aplicaciones: [], historial: [] } as OrdenEmergencia;
        (cuenta.ordenes ||= []).push(orden);
      } else if (accion === 'cierre') { cuenta.fin = fecha; cuenta.cierre = { ...datos, fecha, usuario: 'Admin demo' } as CuentaEmergencia['cierre']; }
      else throw new Error('Esta operación todavía no está disponible en la demo local.');
      cuenta.revision++;
    }
    sessionStorage.setItem(clave, JSON.stringify(cuentas));
    return cuenta as T;
  }
  const respuesta = await apiFetch(`/api/emergencias${ruta}`, body ? { method: 'POST', body: JSON.stringify(body) } : {});
  const contenido = await respuesta.text();
  let datos: unknown = null;
  try { datos = contenido ? JSON.parse(contenido) : null; }
  catch { if (respuesta.ok) throw new Error('El servicio de emergencias devolvió una respuesta no válida.'); }
  if (!respuesta.ok) throw new Error((datos as { message?: string } | null)?.message || 'El servicio de emergencias no está disponible.');
  if (datos === null) throw new Error('El servicio de emergencias respondió sin información.');
  return datos as T;
}

/** Comparte solicitudes iguales y conserva lecturas brevemente para evitar recargas duplicadas al navegar. */
export async function apiEmergencias<T>(ruta = '', body?: object): Promise<T> {
  if (body) {
    const resultado = await solicitarEmergencias<T>(ruta, body);
    invalidarCacheEmergencias();
    return resultado;
  }

  const clave = claveLectura(ruta);
  const cacheada = cacheLecturas.get(clave);
  if (cacheada && cacheada.expira > Date.now()) return cacheada.valor as T;
  const pendiente = lecturasEnCurso.get(clave);
  if (pendiente) return pendiente as Promise<T>;

  const solicitud = solicitarEmergencias<T>(ruta)
    .then(valor => {
      cacheLecturas.set(clave, { valor, expira: Date.now() + ttlLecturaMs });
      return valor;
    })
    .finally(() => lecturasEnCurso.delete(clave));
  lecturasEnCurso.set(clave, solicitud);
  return solicitud;
}
export const nombrePaciente = (c: CuentaEmergencia) => [c.identidad?.nombres, c.identidad?.apellidos].filter(Boolean).join(' ') || 'Paciente sin identificar';
export const fechaEmergencia = (v: string) => new Date(v).toLocaleString('es-BO');
export const camposEvaluacion = [
  ['motivoConsulta', 'Motivo de consulta'], ['enfermedadActual', 'Enfermedad actual'],
  ['antecedentesNoPatologicos', 'Antecedentes personales no patológicos'], ['antecedentesPatologicos', 'Antecedentes personales patológicos'], ['antecedentesFamiliares', 'Antecedentes familiares'], ['antecedentesGineco', 'Antecedentes ginecoobstétricos'],
  ['examenGeneral', 'Examen físico general'], ['cabeza', 'Examen regional · Cabeza'], ['ojos', 'Examen regional · Ojos'], ['oidos', 'Examen regional · Oídos'], ['nariz', 'Examen regional · Nariz'], ['boca', 'Examen regional · Boca'], ['cuello', 'Examen regional · Cuello'], ['torax', 'Examen regional · Tórax'], ['respiratorio', 'Examen regional · Respiratorio'], ['cardiovascular', 'Examen regional · Cardiovascular'], ['pulsos', 'Examen regional · Pulsos arteriales'], ['abdomen', 'Examen regional · Abdomen'], ['extremidades', 'Examen regional · Extremidades'], ['genitalesPerine', 'Examen regional · Genitales y periné'], ['neurologico', 'Examen neurológico'],
  ['examenesComplementarios', 'Exámenes complementarios solicitados / revisados'], ['impresionDiagnostica', 'Impresión diagnóstica'], ['tratamiento', 'Tratamiento indicado / realizado'],
];
export const camposIdentidad = [['nombres', 'Nombres'], ['apellidos', 'Apellidos'], ['documento', 'Documento'], ['nacimiento', 'Fecha de nacimiento'], ['sexo', 'Sexo'], ['procedencia', 'Procedencia'], ['telefono', 'Teléfono'], ['direccion', 'Dirección'], ['profesion', 'Profesión / ocupación'], ['familiar', 'Familiar / acompañante'], ['parentesco', 'Parentesco'], ['referenciaFamiliar', 'Número de referencia'], ['telefonoFamiliar', 'Teléfono del acompañante'], ['documentoFamiliar', 'Documento del acompañante']];
export const tiposOrden = [['medicamento', 'Medicamento / receta'], ['servicio', 'Servicio / procedimiento'], ['laboratorio', 'Laboratorio'], ['imagenologia', 'Imagenología'], ['internacion', 'Internación'], ['cuidado', 'Cuidado / indicación general']];
