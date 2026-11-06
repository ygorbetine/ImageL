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
