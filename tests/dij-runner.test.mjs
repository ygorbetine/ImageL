import test from 'node:test';
import assert from 'node:assert/strict';
import { paddedSize, padHWC, cropHWC, tileStarts, keepRange, createRunner } from '../src/ai/dij-runner.js';

test('tamanho arredonda para o multiplo do modelo', () => {
  assert.equal(paddedSize(400, 16), 400);
  assert.equal(paddedSize(390, 16), 400);
  assert.equal(paddedSize(7, 1), 7);
});

test('padHWC repete a borda e cropHWC desfaz', () => {
  const src = Float32Array.from([1, 2, 3, 4]); // 2x2, 1 canal
  const p = padHWC(src, 2, 2, 1, 3, 3);
  assert.deepEqual([...p], [1, 2, 2, 3, 4, 4, 3, 4, 4]);
  assert.deepEqual([...cropHWC(p, 3, 3, 1, 2, 2)], [1, 2, 3, 4]);
});

test('pedacos cobrem a imagem inteira sem buracos', () => {
  for (const [size, tile, ov] of [[1000, 512, 128], [513, 512, 128], [2048, 512, 128], [400, 512, 128], [640, 512, 100]]) {
    const starts = tileStarts(size, tile, ov);
    let end = 0;
    for (const s of starts) {
      assert.ok(s >= 0 && s + Math.min(tile, size) <= size, 'pedaco dentro da imagem');
      const [from, to] = keepRange(s, Math.min(tile, size), size, ov, end);
      assert.ok(from <= end, `sem buraco em ${size}: ${from} > ${end}`);
      end = Math.max(end, to);
    }
    assert.equal(end, size, 'cobre ate o fim');
  }
});

// modelo falso: saida = entrada + 1, mesma forma; registra o tamanho de cada chamada
function fakeTf(calls) {
  const tensor = (data, shape) => ({ data: async () => data, shape, dispose() {} });
  return { tensor, getBackend: () => 'fake', loadLayersModel: async () => ({ predict: x => { calls.push(x.shape); return tensor(Float32Array.from(x._d, v => v + 1), x.shape); } }) };
}

test('predict costura pedacos e devolve [w, h, c, dados]', async () => {
  const calls = [];
  const tf = fakeTf(calls);
  const realTensor = tf.tensor;
  tf.tensor = (data, shape) => Object.assign(realTensor(data, shape), { _d: data });
  const models = [{ name: 'm', base: 'x/', spec: 'model.yaml', weights: 'model.json', multiple: 16, maxTile: 64, overlap: 8 }];
  const r = createRunner(models, { loadTf: async () => tf, fetchText: async () => 'yaml' });
  assert.equal(await r.getModels(), 'm');
  assert.equal(await r.initModel('m'), 'yaml');
  const w = 150, h = 100;
  const input = Float32Array.from({ length: w * h }, (_, i) => i % 97);
  const out = await r.predict('m', input, w, h, 1);
  assert.equal(r.lastError(), '');
  assert.deepEqual([out[0], out[1], out[2]], [w, h, 1]);
  for (let i = 0; i < w * h; i++) assert.equal(out[3 + i], input[i] + 1);
  assert.ok(calls.length > 1 && calls.every(s => s[1] <= 64 && s[2] <= 64), 'rodou em pedacos de ate 64');
});

test('modelo desconhecido e erro na predicao viram mensagens', async () => {
  const r = createRunner([], { loadTf: async () => ({}), fetchText: async () => '' });
  await assert.rejects(() => r.initModel('nao existe'), /unknown model/);
  const out = await r.predict('nao existe', new Float32Array(4), 2, 2, 1);
  assert.equal(out.length, 0);
  assert.match(r.lastError(), /not loaded/);
});
