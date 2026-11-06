import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messages } from '../src/i18n/messages.js';
import { t, setLocale, getLocale, normalizeLocale } from '../src/i18n.js';

test('pt e en tem exatamente as mesmas chaves', () => {
  const en = Object.keys(messages.en).sort();
  const pt = Object.keys(messages.pt).sort();
  assert.deepEqual(pt.filter(k => !en.includes(k)), [], 'chaves so em pt');
  assert.deepEqual(en.filter(k => !pt.includes(k)), [], 'chaves so em en');
});

test('nenhuma traducao vazia', () => {
  for (const loc of ['en', 'pt']) {
    for (const [k, v] of Object.entries(messages[loc])) assert.ok(v.trim(), loc + ':' + k);
  }
});

test('normalizeLocale', () => {
  assert.equal(normalizeLocale('pt-BR'), 'pt');
  assert.equal(normalizeLocale('PT_pt'), 'pt');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('fr'), null);
  assert.equal(normalizeLocale(null), null);
});

test('troca de idioma, parametros e fallback', () => {
  setLocale('pt', { persist: false });
  assert.equal(getLocale(), 'pt');
  assert.equal(t('menu.file'), 'Arquivo');
  setLocale('en', { persist: false });
  assert.equal(t('menu.file'), 'File');
  assert.equal(t('chave.inexistente'), 'chave.inexistente');
  assert.equal(setLocale('xx'), false);
});
