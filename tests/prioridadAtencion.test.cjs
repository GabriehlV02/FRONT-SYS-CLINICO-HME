const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');

const fuente = (ruta) => stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/flows', ruta), 'utf8'))
  .replace(/^import .*from .*;\r?$/gm, '').replace(/^export /gm, '');
const { evaluarPrioridad, mensajePrioridad } = new Function(`${fuente('triaje/camposSignosVitales.ts')}\n${fuente('triaje/prioridadAtencion.ts')}\nreturn { evaluarPrioridad, mensajePrioridad };`)();
const rango = { nombre: 'Rango sintético de prueba', minimo: 10, maximo: 20 };
const campo = { id: 'prueba', etiqueta: 'Medición de prueba', unidad: 'pts', rango, alertaPrioritaria: true };

test('solo los signos activados fuera del rango generan una alerta', () => {
  for (const valor of ['10', '15', '20', '', 'texto', 'Infinity']) assert.equal(evaluarPrioridad([campo], { prueba: valor }, 30), null);
  assert.equal(evaluarPrioridad([{ ...campo, alertaPrioritaria: false }], { prueba: '30' }, 30), null);
  assert.equal(evaluarPrioridad([{ ...campo, rango: undefined }], { prueba: '30' }, 30), null);
  for (const valor of ['5', '30']) assert.equal(evaluarPrioridad([campo], { prueba: valor }, 30).mediciones[0].valor, valor);
});

test('conserva los valores y limites en el mensaje y respeta el contexto del rango', () => {
  const adulto = { ...campo, rango: { ...rango, contexto: 'Adultos' } };
  assert.equal(evaluarPrioridad([adulto], { prueba: '30' }, null), null);
  assert.equal(evaluarPrioridad([adulto], { prueba: '30' }, 12), null);
  const prioridad = evaluarPrioridad([adulto], { prueba: '30' }, 30);
  const mensaje = mensajePrioridad('Paciente de prueba', prioridad);
  assert.ok(mensaje.includes('Paciente de prueba'));
  assert.ok(mensaje.includes('30 pts (rango 10–20)'));
});

test('el paciente prioritario pasa primero sin desplazar una consulta iniciada', () => {
  const episodios = new Map();
  const { compararCola, prioridadPendiente } = new Function('obtenerAtencionAmbulatoria', 'obtenerPrioridad', `${fuente('consultorio/prioridadCola.ts')}\nreturn { compararCola, prioridadPendiente };`)(
    (cita) => episodios.get(cita.id), (cita) => cita.prioridad,
  );
  const normal = { id: 'primero', estado: 'confirmada', fecha: '2026-11-13', hora: '08:00' };
  const urgente = { ...normal, id: 'segundo', hora: '09:00', prioridad: evaluarPrioridad([campo], { prueba: '30' }, 30) };
  assert.deepEqual([normal, urgente].sort(compararCola).map(cita => cita.id), ['segundo', 'primero']);
  episodios.set(urgente.id, { atendidaEn: '2026-11-13T12:00:00Z' });
  assert.equal(prioridadPendiente(urgente), null);
  assert.equal(prioridadPendiente({ ...urgente, id: 'cancelada', estado: 'cancelada' }), null);
  assert.equal(prioridadPendiente({ ...urgente, id: 'finalizada', atencionFinalizadaEn: '2026-11-13T12:00:00Z' }), null);
});

test('en desarrollo conserva mediciones y prioridad entre sesiones y sincroniza otra pestaña', () => {
  const almacen = new Map();
  const localStorage = { getItem: clave => almacen.get(clave) ?? null, setItem: (clave, valor) => almacen.set(clave, valor) };
  const abrir = (demo = true) => {
    const eventos = {};
    const window = { addEventListener: (nombre, listener) => eventos[nombre] = listener };
    const registro = new Function('esModoPruebaLocal', 'window', 'localStorage', `${fuente('triaje/registroSignosVitales.ts')}\nreturn { obtenerPrioridad, obtenerSignosVitales, guardarSignosVitales, suscribirSignosVitales };`)(() => demo, window, localStorage);
    return { ...registro, eventos };
  };
  const enfermeria = abrir(), medico = abrir(), cita = { id: 'cita-prueba' };
  let avisos = 0;
  medico.suscribirSignosVitales(() => avisos++);
  enfermeria.guardarSignosVitales(cita, { prueba: '30' }, evaluarPrioridad([campo], { prueba: '30' }, 30));
  const clave = [...almacen.keys()][0];
  medico.eventos.storage({ key: clave });
  assert.equal(avisos, 1);
  assert.equal(medico.obtenerPrioridad(cita).mediciones[0].valor, '30');
  assert.equal(abrir().obtenerSignosVitales(cita).prueba, '30');
  enfermeria.guardarSignosVitales(cita, { prueba: '15' }, null);
  medico.eventos.storage({ key: clave });
  assert.equal(medico.obtenerPrioridad(cita), null);
  const produccion = abrir(false);
  assert.equal(produccion.obtenerSignosVitales(cita), undefined);
  assert.equal(produccion.obtenerPrioridad(cita), null);
  const servidor = evaluarPrioridad([campo], { prueba: '30' }, 30);
  assert.equal(produccion.obtenerPrioridad({ ...cita, prioridad: servidor }), servidor);
});
