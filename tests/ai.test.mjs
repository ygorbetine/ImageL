import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAgent, checkMacro, toProtocol } from '../src/ai/agent.js';
import { recipeProvider, pickRecipe, RECIPES } from '../src/ai/recipes.js';

const okBridge = (calls = []) => ({ macro: async c => { calls.push(c); return 'ok'; } });

test('checkMacro: bloqueia perigosos, marca arriscados, libera o resto', () => {
  assert.equal(checkMacro('File.delete("/x");').level, 'blocked');
  assert.equal(checkMacro('exec("rm -rf /");').level, 'blocked');
  assert.equal(checkMacro('eval("x");').level, 'blocked');
  assert.equal(checkMacro('').level, 'blocked');
  assert.equal(checkMacro('saveAs("Tiff", "/files/a.tif");').level, 'risky');
  assert.equal(checkMacro('run("Close All");').level, 'risky');
  assert.equal(checkMacro('run("Gaussian Blur...", "sigma=2");').level, 'ok');
});

test('receita offline conta objetos e comeca duplicando o original', async () => {
  const calls = [];
  const agent = createAgent({ provider: recipeProvider('count-bright-objects'), bridge: okBridge(calls), mode: 'auto' });
  const res = await agent.run('contar nucleos');
  assert.equal(res.status, 'done');
  assert.match(calls[0], /Duplicate/);
  assert.ok(calls.some(c => /Analyze Particles/.test(c)));
  assert.ok(calls.length === RECIPES['count-bright-objects'].steps({ ...RECIPES['count-bright-objects'].params }).length);
});

test('modo suggest nunca executa', async () => {
  const calls = [];
  const agent = createAgent({ provider: recipeProvider('threshold-area'), bridge: okBridge(calls), mode: 'suggest' });
  const res = await agent.run('area');
  assert.equal(res.status, 'done');
  assert.equal(calls.length, 0);
  assert.ok(res.audit.some(a => a.type === 'skipped'));
});

test('modo semi pede confirmacao para passo arriscado; recusa devolve erro ao provider', async () => {
  const seq = [{ type: 'macro', code: 'saveAs("Tiff", "/files/x.tif");', why: 'salvar' }, { type: 'done', report: 'fim' }];
  let i = 0;
  const calls = [];
  let asked = 0;
  const agent = createAgent({
    provider: { next: async ({ history }) => { if (i === 1) assert.match(history[0].error, /recusado/); return seq[i++]; } },
    bridge: okBridge(calls), mode: 'semi', confirm: async () => { asked++; return false; },
  });
  const res = await agent.run('x');
  assert.equal(asked, 1);
  assert.equal(calls.length, 0);
  assert.equal(res.status, 'done');
});

test('macro bloqueada nunca chega ao bridge, em nenhum modo', async () => {
  const calls = [];
  let n = 0;
  const agent = createAgent({
    provider: { next: async () => (n++ === 0 ? { type: 'macro', code: 'File.delete("/a");' } : { type: 'done', report: 'x' }) },
    bridge: okBridge(calls), mode: 'auto',
  });
  await agent.run('x');
  assert.deepEqual(calls, []);
});

test('orcamento de passos, cancelamento e erro do provider', async () => {
  const loop = { next: async () => ({ type: 'macro', code: 'run("Smooth");' }) };
  assert.equal((await createAgent({ provider: loop, bridge: okBridge(), mode: 'auto', maxSteps: 3 }).run('x')).status, 'max-steps');
  const ac = new AbortController(); ac.abort();
  assert.equal((await createAgent({ provider: loop, bridge: okBridge(), mode: 'auto' }).run('x', { signal: ac.signal })).status, 'aborted');
  assert.equal((await createAgent({ provider: { next: async () => { throw new Error('rede'); } }, bridge: okBridge(), mode: 'auto' }).run('x')).status, 'error');
  let t = 0;
  const slow = createAgent({ provider: loop, bridge: okBridge(), mode: 'auto', maxMs: 10, now: () => (t += 20) });
  assert.equal((await slow.run('x')).status, 'timeout');
});

test('falha de execucao vira pergunta ao usuario na receita offline', async () => {
  const agent = createAgent({ provider: recipeProvider('measure-intensity'), bridge: { macro: async () => { throw new Error('sem imagem'); } }, mode: 'auto' });
  const res = await agent.run('medir');
  assert.equal(res.status, 'needs-input');
  assert.match(res.question, /sem imagem/);
});

test('protocolo reproduzivel contem so passos executados com sucesso', async () => {
  const agent = createAgent({ provider: recipeProvider('threshold-area'), bridge: okBridge(), mode: 'auto' });
  const proto = toProtocol(await agent.run('area'));
  assert.match(proto, /Duplicate/);
  assert.match(proto, /Create Selection/);
});

test('pickRecipe entende PT/EN', () => {
  assert.equal(pickRecipe('Contar núcleos'), 'count-bright-objects');
  assert.equal(pickRecipe('count cells'), 'count-bright-objects');
  assert.equal(pickRecipe('fração de área'), 'threshold-area');
  assert.equal(pickRecipe('medir intensidade'), 'measure-intensity');
  assert.equal(pickRecipe('faca um bolo'), null);
});
