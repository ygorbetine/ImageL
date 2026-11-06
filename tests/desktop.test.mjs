import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRects, isDesktop } from '../src/desktop.js';

const R = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test('normalizeRects converte e descarta vazios/fora de tela', () => {
  const out = normalizeRects([R(10, 20, 100, 50), R(0, 0, 0, 10), R(2000, 10, 50, 50), R(-200, -200, 100, 100), R(5, 5, 1, 1)], 1280, 800);
  assert.deepEqual(out, [{ x: 10, y: 20, w: 100, h: 50 }]);
});

test('na web (sem __TAURI__) o shell desktop nao ativa', () => {
  assert.equal(isDesktop(), false);
});
