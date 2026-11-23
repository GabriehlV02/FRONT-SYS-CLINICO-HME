const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');

function cargar(registros = []) {
  const datos = new Map([['hme:internaciones', JSON.stringify(registros)]]);
  const localStorage = { getItem: key => datos.get(key) ?? null, setItem: (key, value) => datos.set(key, value) };
  const window = { localStorage, dispatchEvent() {} };
  const fuente = readFileSync(resolve(__dirname, '../src/flows/internacion/registroInternaciones.ts'), 'utf8');
  const salida = stripTypeScriptTypes(fuente).replace(/^export /gm, '');
  return new Function('window', salida + String.fromCharCode(10) + 'return leerInternaciones;')(window);
}

test('un almacenamiento vacío no genera pacientes ficticios', () => {
  assert.deepEqual(cargar()(), []);
});

test('descarta pacientes de prueba antiguos y conserva registros reales', () => {
  const real = { id: 'internacion-real', paciente: 'Paciente registrado', estado: 'confirmada' };
  const leer = cargar([real, { id: 'INT-PRUEBA-LOCAL-001' }, { id: 'INT-PRUEBA-UCI-001' }, { id: 'prueba-internacion-1' }]);
  assert.deepEqual(leer(), [real]);
  assert.deepEqual(leer(), [real]);
});