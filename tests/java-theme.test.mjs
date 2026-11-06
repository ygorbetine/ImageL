import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darkTargets } from '../src/ui/java-theme.js';

test('darkTargets: imagens ficam intactas, o resto escurece', () => {
  assert.deepEqual(darkTargets(['t', 'Gap distances', 'Log', 't3'], ['t', 't3']), [false, true, true, false]);
  assert.deepEqual(darkTargets([], ['a']), []);
});

test('darkTargets reconhece sufixo de zoom', () => {
  assert.deepEqual(darkTargets(['cells.tif (50%)', 'Results'], ['cells.tif']), [false, true]);
});

import { looksLikeImage } from '../src/ui/java-theme.js';
const fakeWin = (canvases, menubar = false) => ({
  querySelector: s => (s === '.cjMenuBar' && menubar ? {} : null),
  querySelectorAll: () => canvases,
});
test('looksLikeImage: moldura+imagem sim; dialogo e janela com menu nao', () => {
  assert.equal(looksLikeImage(fakeWin([{ width: 210, height: 191 }, { width: 200, height: 150 }])), true);
  assert.equal(looksLikeImage(fakeWin([{ width: 178, height: 136 }, { width: 81, height: 18 }])), false);
  assert.equal(looksLikeImage(fakeWin([{ width: 400, height: 250 }, { width: 384, height: 189 }], true)), false);
  assert.equal(looksLikeImage(fakeWin([{ width: 100, height: 100 }])), false);
});
