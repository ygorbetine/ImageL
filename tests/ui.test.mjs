import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MENUS, TOOLS, flattenCommands, searchCommands } from '../src/ui/menus.js';
import { macroString, createBridge } from '../src/ui/bridge.js';

test('todo item de menu tem cmd, en e pt', () => {
  const cmds = flattenCommands();
  assert.ok(cmds.length > 60);
  for (const c of cmds) {
    assert.ok(c.cmd && c.en && c.pt, JSON.stringify(c));
    assert.ok(c.path.length >= 1);
  }
});

test('menus tem ids unicos e rotulos nos dois idiomas', () => {
  const ids = MENUS.map(m => m.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of MENUS) assert.ok(m.en && m.pt);
});

test('ferramentas: ids validos para setTool e icones', () => {
  for (const t of TOOLS) {
    if (t === '-') continue;
    assert.match(t.id, /^[A-Za-z][A-Za-z -]*$/);
    assert.ok(t.icon && t.en && t.pt);
  }
});

test('busca sem acento/caixa nos dois idiomas', () => {
  assert.equal(searchCommands('gauss')[0].cmd, 'Gaussian Blur...');
  assert.equal(searchCommands('DESFOQUE')[0].cmd, 'Gaussian Blur...');
  assert.equal(searchCommands('particulas')[0].cmd, 'Analyze Particles...');
  assert.equal(searchCommands('zzzz').length, 0);
  assert.equal(searchCommands('').length, 12);
});

test('macroString escapa aspas, barras e quebras de linha', () => {
  assert.equal(macroString('a"b\\c\nd'), 'a\\"b\\\\c d');
});

test('bridge monta macros corretas e valida ferramenta', async () => {
  const calls = [];
  const b = createBridge(() => ({ runMacro: async c => { calls.push(c); return 'ok'; } }));
  await b.run('Gaussian Blur...', 'sigma=2');
  await b.run('Close');
  await b.setTool('rectangle');
  assert.deepEqual(calls, ['run("Gaussian Blur...", "sigma=2");', 'run("Close");', 'setTool("rectangle");']);
  await assert.rejects(() => b.setTool('x");exit();//'));
});

test('bridge sem ImageJ carregado rejeita com mensagem clara', async () => {
  const b = createBridge(() => null);
  assert.equal(b.ready(), false);
  await assert.rejects(() => b.run('Close'), /ainda nao carregou/);
});
