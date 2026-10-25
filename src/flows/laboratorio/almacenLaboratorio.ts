import { leerCatalogoLaboratorio, tiposLaboratorioActivos } from './catalogoLaboratorio';
import { evaluarFormula, validarFormula, type FormulaLaboratorio } from './formulasLaboratorio';
import type { RangoReferencia } from './rangosLaboratorio';

export type OrigenLaboratorio = 'ambulatorio' | 'internacion';
export type EstadoLaboratorio = 'pendiente' | 'en_proceso' | 'completado' | 'anulado';
export type AdjuntoLaboratorio = { id: string; nombre: string; tipo: string; contenido: string };
export type ResultadoLaboratorio = { id: string; parametro: string; valor: string; unidad: string; referencia: string; notaReferencia?: string; rangoReferencia?: RangoReferencia; tipo?: 'numero' | 'texto'; parametroId?: string; formula?: FormulaLaboratorio; observacion?: string; registradoEn?: string; adjuntos?: AdjuntoLaboratorio[] };
export type EstudioLaboratorio = { id: string; nombre: string; resultados: ResultadoLaboratorio[] };
export type SolicitudLaboratorio = {
  id: string; paciente: string; ci: string; medico: string; origen: OrigenLaboratorio;
  consultaId: string; fecha: string; estado: EstadoLaboratorio; estudios: EstudioLaboratorio[];
  observacion: string; actualizadoEn: string; finalizadoEn?: string; registradoPor?: string;
  procedencia?: 'recepcion' | 'consultorio'; indicaciones?: string; prioridad?: 'normal' | 'urgente'; solicitadoPor?: string;
};

const clave = 'clinico.laboratorio.solicitudes.v1';
const evento = 'laboratorio:actualizado';
const estados: EstadoLaboratorio[] = ['pendiente', 'en_proceso', 'completado', 'anulado'];

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
  const claveReferenciasPendientes = 'clinico.laboratorio.solicitudes.referencias-lipidos.v1';
  if (!localStorage.getItem(claveReferenciasPendientes)) {
    let catalogo;
    try { catalogo = leerCatalogoLaboratorio(); } catch { return datos; }
    let cambiaron = false;
    const actualizadas = (datos as SolicitudLaboratorio[]).map(s => {
      if (s.estado === 'completado') return s;
      let cambio = false;
      const estudios = s.estudios.map(e => {
        if (!['lab-lipidico', 'lab-ejemplo-lipidico-formula'].includes(e.id)) return e;
        const tipo = catalogo.tipos.find(t => t.id === e.id);
        return { ...e, resultados: e.resultados.map(r => {
          const p = tipo?.parametros.find(p => r.parametroId ? p.id === r.parametroId : p.nombre === r.parametro);
          if (r.referencia.trim() || r.rangoReferencia || !p?.referencia.trim() || r.unidad !== p.unidad) return r;
          cambio = true;
          return { ...r, referencia: p.referencia, notaReferencia: p.notaReferencia, rangoReferencia: p.rangoReferencia ? structuredClone(p.rangoReferencia) : undefined };
        }) };
      });
      if (!cambio) return s;
      cambiaron = true;
      return { ...s, estudios, actualizadoEn: new Date().toISOString() };
    });
    if (cambiaron) localStorage.setItem(clave, JSON.stringify(actualizadas));
    localStorage.setItem(claveReferenciasPendientes, '1');
    return actualizadas;
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
  const repetidos = existentes.filter(s => s.consultaId === paciente.consultaId && s.origen === origen && !['completado', 'anulado'].includes(s.estado))
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
      return { ...e, resultados: tipo ? tipo.parametros.map(p => ({ id: crypto.randomUUID(), parametroId: p.id, parametro: p.nombre, valor: '', unidad: p.unidad, referencia: p.referencia, notaReferencia: p.notaReferencia, ...(p.rangoReferencia ? { rangoReferencia: structuredClone(p.rangoReferencia) } : {}), tipo: p.tipo, ...(p.formula ? { formula: structuredClone(p.formula) } : {}) })) : [{ id: crypto.randomUUID(), parametro: e.nombre, valor: '', unidad: '', referencia: '' }] };
    }),
  };
  persistir([solicitud, ...existentes]);
  return solicitud;
}

export function guardarResultadosLaboratorio(solicitud: SolicitudLaboratorio, finalizar: boolean, registradoPor: string) {
  const solicitudes = leerSolicitudesLaboratorio();
  const actual = solicitudes.find(s => s.id === solicitud.id);
  if (!actual) throw new Error('La solicitud ya no está disponible.');
  if (['completado', 'anulado'].includes(actual.estado)) throw new Error('Los resultados finalizados o anulados son de solo lectura.');
  if (actual.actualizadoEn !== solicitud.actualizadoEn) throw new Error('La solicitud cambió en otra pestaña. Vuelve a abrirla antes de guardar.');
  if (solicitud.estudios.length !== actual.estudios.length || solicitud.estudios.some(e => !actual.estudios.some(a => a.id === e.id))) throw new Error('Los estudios de la solicitud no coinciden.');
  for (const e of actual.estudios) for (const r of e.resultados) if (r.parametroId) {
    const recibido = solicitud.estudios.find(s => s.id === e.id)?.resultados.find(s => s.id === r.id);
    if (!recibido) throw new Error('No puedes quitar parámetros configurados del estudio.');
    recibido.parametroId = r.parametroId; recibido.formula = r.formula;
  }
  const calculado = calcularResultadosLaboratorio(solicitud);
  solicitud = { ...solicitud, estudios: calculado.estudios };
  if (finalizar && Object.keys(calculado.errores).length) throw new Error('Hay fórmulas pendientes o inválidas. Completa los datos de origen y revisa los avisos.');
  if (finalizar && solicitud.estudios.some(e => !e.resultados.length || e.resultados.some(r => !r.parametro.trim() || !r.valor.trim()))) {
    throw new Error('Completa el nombre y el resultado de todos los parámetros antes de finalizar.');
  }
  if (finalizar && solicitud.estudios.some(e => e.resultados.some(r => r.tipo === 'numero' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(r.valor.trim().replace(',', '.'))))) throw new Error('Revisa los resultados numéricos: ingresa un número válido.');
  const fecha = new Date().toISOString();
  const actualizado: SolicitudLaboratorio = {
    ...actual, estudios: solicitud.estudios.map(e => ({ ...e, resultados: e.resultados.map(r => ({ ...r, ...(r.valor.trim() ? { registradoEn: r.registradoEn || fecha } : {}) })) })), observacion: solicitud.observacion.trim(), registradoPor,
    estado: finalizar ? 'completado' : 'en_proceso', actualizadoEn: fecha,
    ...(finalizar ? { finalizadoEn: fecha } : {}),
  };
  persistir(solicitudes.map(s => s.id === actual.id ? actualizado : s));
  return actualizado;
}

export function calcularResultadosLaboratorio(solicitud: SolicitudLaboratorio) {
  const estudios = structuredClone(solicitud.estudios);
  const errores: Record<string, string> = {};
  const visitados = new Set<string>(); const visitando = new Set<string>();
  const calcular = (r: ResultadoLaboratorio): number => {
    if (visitando.has(r.id)) throw new Error('Dependencia circular.');
    if (errores[r.id]) throw new Error(errores[r.id]);
    if (r.formula && !visitados.has(r.id)) {
      r.valor = ''; visitando.add(r.id);
      try {
        validarFormula(r.formula);
        const valores: Record<string, number> = {};
        for (const f of r.formula.fuentes) {
          const estudio = estudios.find(e => e.id === f.estudioId);
          const fuente = estudio?.resultados.find(p => p.parametroId === f.parametroId);
          if (!fuente) throw new Error(`Falta el estudio o parámetro de origen para ${f.variable} en esta solicitud.`);
          if (fuente.unidad !== f.unidad) throw new Error(`Revisa la unidad del origen ${f.variable}: debe ser ${f.unidad || 'sin unidad'}.`);
          valores[f.variable] = calcular(fuente);
        }
        if (r.formula.limite && valores[r.formula.limite.variable] >= r.formula.limite.maximoExclusivo) throw new Error(`Fuera del límite de cálculo: ${r.formula.limite.variable} debe ser menor que ${r.formula.limite.maximoExclusivo}.`);
        const valor = evaluarFormula(r.formula.expresion, valores).valor;
        if (!Number.isFinite(valor)) throw new Error('Cálculo inválido o división por cero.');
        r.valor = valor.toFixed(r.formula.decimales);
      } catch (e) { errores[r.id] = (e as Error).message; throw e; }
      finally { visitando.delete(r.id); visitados.add(r.id); }
    }
    if (r.formula) return Number(r.valor);
    const texto = r.valor.trim().replace(',', '.');
    if (!texto || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(texto) || !Number.isFinite(Number(texto))) throw new Error(`Completa un resultado numérico válido para ${r.parametro}.`);
    return Number(texto);
  };
  for (const e of estudios) for (const r of e.resultados) if (r.formula) { try { calcular(r); } catch { /* El aviso acompaña al resultado pendiente. */ } }
  return { estudios, errores };
}

export function actualizarReferenciasLaboratorio(solicitud: SolicitudLaboratorio) {
  if (['completado', 'anulado'].includes(solicitud.estado)) throw new Error('Las referencias de resultados finalizados o anulados son de solo lectura.');
  const catalogo = leerCatalogoLaboratorio();
  let encontrados = 0;
  const estudios = solicitud.estudios.map(e => {
    const tipo = catalogo.tipos.find(t => t.id === e.id);
    return { ...e, resultados: e.resultados.map(r => {
      const p = tipo?.parametros.find(p => r.parametroId ? p.id === r.parametroId : p.nombre === r.parametro);
      if (!p) return r;
      if (r.unidad !== p.unidad) throw new Error(`La unidad de ${r.parametro} cambió en la configuración. Revisa el estudio antes de actualizar sus referencias.`);
      encontrados++;
      return { ...r, referencia: p.referencia, notaReferencia: p.notaReferencia, rangoReferencia: p.rangoReferencia ? structuredClone(p.rangoReferencia) : undefined };
    }) };
  });
  if (!encontrados) throw new Error('No se encontraron parámetros de esta solicitud en Tipos de laboratorio.');
  return { ...solicitud, estudios };
}
