import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideLite } from '../src/lite.js';

test('maquina modesta liga o modo leve', () => {
  assert.equal(decideLite({ cores: 2 }), true);
  assert.equal(decideLite({ cores: 8, mem: 4 }), true);
  assert.equal(decideLite({ cores: 8, mem: 16, saveData: true }), true);
  assert.equal(decideLite({ cores: 8, mem: 16, reducedMotion: true }), true);
});
test('maquina boa fica no modo normal', () => {
  assert.equal(decideLite({ cores: 8, mem: 16 }), false);
  assert.equal(decideLite({ cores: 8, mem: 0 }), false); // memoria desconhecida
});
test('override: URL vence armazenamento vence deteccao', () => {
  assert.equal(decideLite({ cores: 2, param: '0' }), false);
  assert.equal(decideLite({ cores: 16, mem: 32, param: '1' }), true);
  assert.equal(decideLite({ cores: 16, mem: 32, stored: '1' }), true);
  assert.equal(decideLite({ cores: 2, stored: '0', param: '1' }), true);
});
