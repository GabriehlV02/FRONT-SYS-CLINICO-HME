const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const fuente = stripTypeScriptTypes(readFileSync(resolve(__dirname, '../src/flows/internacion/registroDescargos.ts'), 'utf8')).replace(/^export /gm, '');
function registro(inicial = {}) {
  const datos = new Map([['hme:descargos-internacion', JSON.stringify(inicial)]]);
  const window = { localStorage: { getItem: (clave) => datos.get(clave), setItem: (clave, valor) => datos.set(clave, valor) }, dispatchEvent() {} };
  return new Function('window', `${fuente}\nreturn { leerDescargos, codigoDescargo, registrarRecepcionDescargo, anularDescargo };`)(window);
}
test('conserva el código al descargar y no permite anular una entrega realizada', () => {
  const r = registro();
  const codigo = r.codigoDescargo('receta-uno');
  r.registrarRecepcionDescargo('receta-uno', 'Farmacia');
  assert.equal(r.codigoDescargo('receta-uno'), codigo);
  assert.equal(r.leerDescargos()['receta-uno'].estado, 'recibido');
  assert.throws(() => r.anularDescargo('receta-uno', 'Farmacia'), /devoluciones/);
});
test('conserva la anulación e impide descargar una solicitud anulada', () => {
  const r = registro();
  const codigo = r.codigoDescargo('receta-dos');
  r.anularDescargo('receta-dos', 'Responsable');
  assert.equal(r.codigoDescargo('receta-dos'), codigo);
  assert.equal(r.leerDescargos()['receta-dos'].anuladoPor, 'Responsable');
  assert.throws(() => r.registrarRecepcionDescargo('receta-dos', 'Farmacia'), /anulada/);
});
test('mantiene las recepciones existentes y sus códigos después de recargar', () => {
  const r = registro({ antigua: { estado: 'recibido', recibidoPor: 'Original' } });
  r.registrarRecepcionDescargo('antigua', 'Otro');
  assert.equal(r.leerDescargos().antigua.recibidoPor, 'Original');
  const codigo = r.codigoDescargo('antigua');
  const recargado = registro(r.leerDescargos());
  assert.equal(recargado.codigoDescargo('antigua'), codigo);
  assert.notEqual(codigo, r.codigoDescargo('otra'));
});
