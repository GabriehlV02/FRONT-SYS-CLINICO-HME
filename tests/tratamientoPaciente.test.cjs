const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const fuente = stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/flows/emergencias/tratamientoPaciente.ts'), 'utf8')).replace(/^import .*from .*;\r?$/gm, '').replace(/^export /gm, '');
const reunirTratamiento = new Function(`${fuente}\nreturn reunirTratamiento;`)();
const cuenta = (datos = {}) => ({ id: 'atencion-1', inicio: '2026-11-13T12:00:00Z', fin: null, consumos: [], ordenes: [], evaluaciones: [], registrosEnfermeria: [], ...datos });
const orden = (datos = {}) => ({ id: 'orden-1', fecha: '2026-11-13T14:00:00Z', tipo: 'medicamento', titulo: 'Medicamento de prueba', usuario: 'Dra. Prueba', autorTipo: 'medico', estado: 'pendiente', dosis: 'Dosis de prueba', via: 'Via de prueba', frecuencia: 'Frecuencia de prueba', duracion: '', indicaciones: 'Indicacion de prueba', aplicaciones: [], ...datos });

test('una receta o estudio indicado no se convierte en suministracion o estudio realizado', () => {
  const resultado = reunirTratamiento(cuenta({ ordenes: [orden(), orden({ id: 'lab', tipo: 'laboratorio' }), orden({ id: 'imagen', tipo: 'imagenologia' })] }));
  assert.equal(resultado.filas.length, 3);
  assert.deepEqual(new Set(resultado.filas.map(fila => fila.categoria)), new Set(['recetas', 'laboratorio', 'imagenes']));
  for (const fila of resultado.filas) { assert.equal(fila.estado, 'Indicado · pendiente'); assert.equal(fila.cantidad, '—'); }
  assert.equal(resultado.filas.filter(fila => fila.categoria === 'suministraciones').length, 0);
});

test('mantiene cada aplicacion y no duplica el consumo enlazado como otra suministracion', () => {
  const resultado = reunirTratamiento(cuenta({
    ordenes: [orden({ estado: 'cancelada', aplicaciones: [{ id: 'aplicacion-1', fecha: '2026-11-13T15:00:00Z', usuario: 'Enfermera', consumoId: 'registro-1' }, { id: 'aplicacion-2', fecha: '2026-11-13T16:00:00Z', usuario: 'Enfermera' }] })],
    consumos: [{ registroId: 'registro-1', inicio: '2026-11-13T15:00:00Z', tipo: 'producto', nombre: 'Insumo de prueba', cantidad: 2, unidad: 'unidades', porHora: false }],
  }));
  assert.equal(resultado.filas.length, 3);
  assert.equal(resultado.filas.find(fila => fila.id === 'aplicacion-orden-1-aplicacion-1').cantidad, '2 unidades');
  assert.equal(resultado.filas.find(fila => fila.id === 'aplicacion-orden-1-aplicacion-2').cantidad, 'No registrada');
  assert.equal(resultado.filas.find(fila => fila.id === 'orden-orden-1').estado, 'Suspendido');
});

test('los servicios en uso se distinguen de los terminados y del consumo registrado', () => {
  const servicios = [
    { registroId: 'activo', inicio: '2026-11-13T13:00:00Z', tipo: 'servicio', nombre: 'Servicio de prueba', porHora: true, fin: null },
    { registroId: 'terminado', inicio: '2026-11-13T12:00:00Z', tipo: 'servicio', nombre: 'Servicio terminado', porHora: true, fin: '2026-11-13T14:00:00Z' },
    { registroId: 'insumo', inicio: '2026-11-13T14:00:00Z', tipo: 'producto', nombre: 'Insumo', cantidad: 1, unidad: 'unidad', porHora: false },
  ];
  const resultado = reunirTratamiento(cuenta({ consumos: servicios }));
  assert.equal(resultado.filas.find(fila => fila.id === 'consumo-activo').estado, 'En uso');
  assert.equal(resultado.filas.find(fila => fila.id === 'consumo-terminado').estado, 'Finalizado');
  assert.equal(resultado.filas.find(fila => fila.id === 'consumo-insumo').estado, 'Consumo registrado');
  assert.equal(reunirTratamiento(cuenta({ consumos: servicios, fin: '2026-11-13T15:00:00Z' })).filas.find(fila => fila.id === 'consumo-activo').estado, 'Finalizado');
});

test('identifica medicos por el tipo de autor sin confundir a enfermeria ni al medico asignado', () => {
  const resultado = reunirTratamiento(cuenta({ identidad: { medicoAdmision: 'Asignado sin registro' }, ordenes: [orden(), orden({ id: 'otra', usuario: 'dra. prueba' }), orden({ id: 'enfermeria', usuario: 'Enfermera', autorTipo: 'otro' })], evaluaciones: [
    { id: 'medica', fecha: '2026-11-13T13:00:00Z', usuario: 'Dr. Otro', autorTipo: 'medico', campos: {} },
    { id: 'sin-rol', fecha: '2026-11-13T13:00:00Z', usuario: 'Profesional de turno', campos: { evolucion: 'Nota' } },
  ] }));
  assert.equal(resultado.medicos.length, 2);
  assert.ok(resultado.medicos.includes('Dr. Otro'));
  assert.ok(!resultado.medicos.includes('Enfermera'));
  assert.ok(!resultado.medicos.includes('Asignado sin registro'));
});

test('incluye los usos de enfermeria y conserva un orden cronologico estable sin mezclar atenciones', () => {
  const resultado = reunirTratamiento(cuenta({ registrosEnfermeria: [{ id: 'uso-1', fecha: '2026-11-13', hora: '12:30', tipo: 'insumo', detalle: 'Material de prueba', cantidad: 3, unidad: 'unidades', usuario: 'Enfermera' }], ordenes: [orden()] }));
  assert.equal(resultado.filas.length, 2);
  assert.ok(resultado.filas.some(fila => fila.detalle === 'Material de prueba' && fila.cantidad === '3 unidades'));
  assert.deepEqual(reunirTratamiento(cuenta()).filas, []);
  assert.ok(Date.parse(resultado.filas[0].fecha) >= Date.parse(resultado.filas[1].fecha));
});
