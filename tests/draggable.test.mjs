import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPosition, MIN_VISIBLE } from '../src/ui/draggable.js';

test('mantem dentro da tela', () => {
  assert.deepEqual(clampPosition(100, 100, 300, 1000, 800), { x: 100, y: 100 });
});
test('nao deixa sumir a esquerda/direita: sobram MIN_VISIBLE px', () => {
  assert.equal(clampPosition(-9999, 50, 300, 1000, 800).x, -300 + MIN_VISIBLE);
  assert.equal(clampPosition(9999, 50, 300, 1000, 800).x, 1000 - MIN_VISIBLE);
});
test('nao passa do topo nem do fundo', () => {
  assert.equal(clampPosition(0, -50, 300, 1000, 800).y, 0);
  assert.equal(clampPosition(0, 9999, 300, 1000, 800).y, 770);
});
