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
