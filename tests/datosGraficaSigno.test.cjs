const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const fuente = stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/flows/emergencias/datosGraficaSigno.ts'), 'utf8')).replace(/^export /gm, '');
const puntosSignoVital = new Function(`${fuente}\nreturn puntosSignoVital;`)();
const campo = { id: 'temperatura', etiqueta: 'Temperatura' };
const medicion = (id, valor, fecha = '2026-11-24T10:00:00Z') => ({ id, fecha, valores: { temperatura: valor } });
test('omite datos vacíos y no numéricos sin convertirlos en cero', () => {
  const puntos = puntosSignoVital(campo, [medicion('vacio', ''), medicion('espacio', ' '), medicion('ausente', undefined), medicion('texto', '—'), medicion('infinito', Infinity), medicion('cero', 0)]);
  assert.deepEqual(puntos.map(p => [p.id, p.valor]), [['cero', 0]]);
});
test('ordena cronológicamente y admite decimales con coma', () => {
  const puntos = puntosSignoVital(campo, [medicion('ultimo', '37,5', '2026-11-24T11:00:00Z'), medicion('primero', 36.8), medicion('fecha-invalida', 37, 'sin fecha')]);
  assert.deepEqual(puntos.map(p => [p.id, p.valor]), [['primero', 36.8], ['ultimo', 37.5]]);
});
test('usa los mismos valores de mediciones detalladas que la tabla', () => {
  const registro = { ...medicion('detalle', 36), mediciones: [{ id: 'temperatura', nombre: 'Temperatura', valor: 38 }] };
  assert.equal(puntosSignoVital(campo, [registro])[0].valor, 38);
  assert.deepEqual(puntosSignoVital(campo, []), []);
});
