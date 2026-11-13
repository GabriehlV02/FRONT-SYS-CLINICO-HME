const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');

const fuente = readFileSync(resolve(__dirname, '../src/radius/datos/pacientesPrueba.ts'), 'utf8');
const salida = stripTypeScriptTypes(fuente).replace(/^export /gm, '');
const cargarPacientesPrueba = new Function(`${salida}\nreturn cargarPacientesPrueba;`)();
class Almacen extends Map {
  getItem(clave) { return this.get(clave) ?? null; }
  setItem(clave, valor) { this.set(clave, valor); }
}
const ahora = new Date('2026-11-14T01:00:00Z');
const leer = (almacen, clave) => JSON.parse(almacen.getItem(clave));

test('cada servicio tiene dos pacientes distintos y todas las solicitudes están vinculadas a sus fichas', () => {
  const local = new Almacen(), sesion = new Almacen();
  assert.deepEqual(cargarPacientesPrueba(local, sesion, ahora), { pacientes: 26, servicios: 13 });
  const pacientes = leer(local, 'pulso_local_pacientes_v1');
  assert.equal(new Set(pacientes.map(p => p.numeroDocumento)).size, 26);
  const servicios = Map.groupBy(pacientes, p => p.primerApellido);
  for (const grupo of servicios.values()) assert.equal(grupo.length, 2);
  const porId = new Map(pacientes.map(p => [p.id, p]));
  for (const clave of ['clinico.agenda-demo.v2', 'hme:internaciones', 'clinico.laboratorio.solicitudes.v1', 'hme-cronograma-quirofanos-v1']) {
    for (const registro of leer(local, clave)) {
      assert.ok(porId.has(registro.pacienteId), `${clave}: ficha faltante`);
      assert.equal(registro.ci, porId.get(registro.pacienteId).numeroDocumento);
    }
  }
  for (const emergencia of leer(sesion, 'clinico-emergencias-demo-v1')) {
    assert.equal(emergencia.identidad.documento, porId.get(emergencia.pacienteId).numeroDocumento);
  }
  assert.equal(leer(local, 'clinico.agenda-demo.v2')[0].fecha, '2026-11-13');
  assert.equal(leer(local, 'clinico.prueba.estudios-agenda.v1').length, 12);
});

test('recargar conserva los avances del flujo y los registros que ya existían', () => {
  const local = new Almacen(), sesion = new Almacen();
  local.setItem('pulso_local_pacientes_v1', JSON.stringify([{ id: 'paciente-existente', nombres: 'Conservar' }]));
  cargarPacientesPrueba(local, sesion, ahora);
  const solicitudes = leer(local, 'clinico.laboratorio.solicitudes.v1');
  solicitudes[0].estado = 'completado';
  solicitudes[0].estudios[0].resultados[0].valor = 'resultado de prueba guardado';
  local.setItem('clinico.laboratorio.solicitudes.v1', JSON.stringify(solicitudes));
  const antes = JSON.stringify([...local]);
  const emergenciaAntes = sesion.getItem('clinico-emergencias-demo-v1');
  cargarPacientesPrueba(local, sesion, new Date('2026-11-15T01:00:00Z'));
  assert.equal(JSON.stringify([...local]), antes);
  assert.equal(sesion.getItem('clinico-emergencias-demo-v1'), emergenciaAntes);
  assert.equal(leer(local, 'pulso_local_pacientes_v1')[0].nombres, 'Conservar');
});

test('un almacén inválido se reporta antes de escribir cualquier conjunto de datos', () => {
  const local = new Almacen(), sesion = new Almacen();
  local.setItem('clinico.laboratorio.solicitudes.v1', '{datos dañados');
  const antes = JSON.stringify([...local]);
  assert.throws(() => cargarPacientesPrueba(local, sesion, ahora));
  assert.equal(JSON.stringify([...local]), antes);
  assert.equal(sesion.size, 0);
});
