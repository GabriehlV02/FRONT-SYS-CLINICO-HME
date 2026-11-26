import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descargarReporte } from '../src/flows/emergencias/descargarReporte.ts';

test('descarga el PDF aunque la atención no esté vinculada a un paciente', async () => {
  let descargas = 0;
  const aviso = await descargarReporte({ descargar: () => { descargas++; } });
  assert.equal(descargas, 1);
  assert.match(aviso, /no se archivó/);
});

test('un error al archivar no impide la descarga', async () => {
  const eventos = [];
  const aviso = await descargarReporte({ descargar: () => { eventos.push('descarga'); }, archivar: async () => { eventos.push('archivo'); throw new Error('API no disponible'); } });
  assert.deepEqual(eventos, ['descarga', 'archivo']);
  assert.match(aviso, /API no disponible/);
});

test('confirma el guardado cuando ambas operaciones terminan', async () => {
  const eventos = [];
  const aviso = await descargarReporte({ descargar: async () => { eventos.push('descarga'); }, archivar: async () => { eventos.push('archivo'); } });
  assert.deepEqual(eventos, ['descarga', 'archivo']);
  assert.equal(aviso, null);
});

test('propaga los errores de descarga sin archivar ni comunicar éxito', async () => {
  let archivado = false;
  await assert.rejects(descargarReporte({ descargar: () => { throw new Error('No se generó el archivo'); }, archivar: async () => { archivado = true; } }), /No se generó/);
  assert.equal(archivado, false);
});
