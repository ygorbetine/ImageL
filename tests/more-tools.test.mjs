import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToolFiles, toolLabel } from '../src/ui/more-tools.js';
import { createBridge } from '../src/ui/bridge.js';

test('parseToolFiles filtra so ferramentas e ignora opcoes', () => {
  const list = 'AddParticles.txt\nCircle_Tool.txt\nFloodFillTool.txt\nFloodFillToolOptions.txt\nDeveloperMenuTool.txt\nREADME.md\n';
  assert.deepEqual(parseToolFiles(list), ['Circle_Tool.txt', 'FloodFillTool.txt', 'DeveloperMenuTool.txt']);
});

test('toolLabel legivel', () => {
  assert.equal(toolLabel('FloodFillTool.txt'), 'Flood Fill Tool');
  assert.equal(toolLabel('Circle_Tool.txt'), 'Circle Tool');
});

test('bridge: modo silencioso devolve erro como excecao, sem dialogo', async () => {
  const silent = { runMacroSilent: async c => (c.includes('bad') ? ['error', 'linha 1'] : ['success', 'ok']) };
  const b = createBridge(() => ({}), async () => silent);
  assert.equal(await b.run('Smooth'), 'ok');
  await assert.rejects(() => b.run('bad'), /linha 1/);
});

test('bridge aceita nome de ferramenta de macro e recusa injecao', async () => {
  const calls = [];
  const b = createBridge(() => ({}), async () => ({ runMacroSilent: async c => { calls.push(c); return ['success', '']; } }));
  await b.setTool('Flood Filler Built-in Tool');
  assert.equal(calls[0], 'setTool("Flood Filler Built-in Tool");');
  await assert.rejects(() => b.setTool('x");exit();//'));
});

import { placeNear } from '../src/ui/toolbar-ui.js';
test('placeNear mantem o popover dentro da tela', () => {
  const r = { left: 950, right: 990, top: 40, bottom: 80 };
  const p = placeNear(r, { w: 200, h: 100 }, 1000, 600, false);
  assert.equal(p.x, 796);
  assert.equal(p.y, 86);
  assert.deepEqual(placeNear({ left: 0, right: 50, top: 10, bottom: 50 }, { w: 100, h: 100 }, 1000, 600, true), { x: 56, y: 10 });
});

test('bridge le arrays estilo proxy Java (nao iteraveis, indice assincrono)', async () => {
  const fake = { 0: Promise.resolve('success'), 1: Promise.resolve('ok'), [Symbol.iterator]: undefined };
  const b = createBridge(() => ({}), async () => ({ runMacroSilent: async () => fake }));
  assert.equal(await b.run('Smooth'), 'ok');
  const err = { 0: 'error', 1: Promise.resolve('boom') };
  const b2 = createBridge(() => ({}), async () => ({ runMacroSilent: async () => err }));
  await assert.rejects(() => b2.run('x'), /boom/);
});

test('setTool aceita indice numerico (Dev/Balde) e rejeita fora da faixa', async () => {
  const calls = [];
  const b = createBridge(() => ({}), async () => ({ runMacroSilent: async c => { calls.push(c); return ['success', '']; } }));
  await b.setTool(17);
  assert.equal(calls[0], 'setTool(17);');
  await assert.rejects(() => b.setTool(99));
});
