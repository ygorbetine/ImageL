import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describe } from '../src/splash.js';

test('describe aceita Error, string e objetos sem prototipo', () => {
  assert.equal(describe(new Error('x')), 'x');
  assert.equal(describe('falhou'), 'falhou');
  assert.match(describe(Object.create(null)), /ImageJ/); // String(obj) lancaria TypeError
  assert.match(describe({}), /ImageJ/);
  assert.match(describe(undefined), /undefined|ImageJ/);
});
