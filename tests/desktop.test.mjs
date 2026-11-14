import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRects, isDesktop, readPin, writePin, wantOnTop, isBrowserAccelerator } from '../src/desktop.js';

const R = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test('normalizeRects converte e descarta vazios/fora de tela', () => {
  const out = normalizeRects([R(10, 20, 100, 50), R(0, 0, 0, 10), R(2000, 10, 50, 50), R(-200, -200, 100, 100), R(5, 5, 1, 1)], 1280, 800);
  assert.deepEqual(out, [{ x: 10, y: 20, w: 100, h: 50 }]);
});

test('na web (sem __TAURI__) o shell desktop nao ativa', () => {
  assert.equal(isDesktop(), false);
});

test('pin: padrao ligado, persiste, so vale no Sem fundo', () => {
  const m = new Map(); const st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(readPin(st), true);
  writePin(st, false); assert.equal(readPin(st), false);
  assert.equal(readPin({ getItem() { throw 1; } }), true);
  assert.equal(wantOnTop(true, true), true);
  assert.equal(wantOnTop(false, true), false);
  assert.equal(wantOnTop(true, false), false);
});

test('atalhos do WebView sao bloqueados; edicao de texto e F12 ficam', () => {
  const k = (key, m = {}) => isBrowserAccelerator({ key, ...m });
  for (const f of ['F5', 'F1', 'F3', 'F11']) assert.equal(k(f), true, f);
  assert.equal(k('F12'), false);
  for (const c of ['r', 'R', 'f', 'p', 's', 'h', 'o', 'n', 'd', 'i', '+', '-', '0']) assert.equal(k(c, { ctrlKey: true }), true, 'Ctrl+' + c);
  for (const c of ['c', 'v', 'x', 'a', 'z', 'y']) assert.equal(k(c, { ctrlKey: true }), false, 'Ctrl+' + c);
  assert.equal(k('ArrowLeft', { altKey: true }), true);
  assert.equal(k('ArrowLeft', { ctrlKey: true }), false);
  assert.equal(k('m'), false);
  assert.equal(k('Control', { ctrlKey: true }), false);
});
