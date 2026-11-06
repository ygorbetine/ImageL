import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, setLogLevel, getLogBuffer, clearLogBuffer, diagnosticText } from '../src/logger.js';

test('respeita nivel e guarda no buffer mesmo quando filtrado', () => {
  clearLogBuffer();
  setLogLevel('silent');
  const log = createLogger('t');
  log.info('a');
  log.error(new Error('boom'));
  const buf = getLogBuffer();
  assert.equal(buf.length, 2);
  assert.equal(buf[0].scope, 't');
  assert.match(diagnosticText(), /ERROR \[t\] Error: boom/);
});

test('buffer circular limitado', () => {
  clearLogBuffer();
  setLogLevel('silent');
  const log = createLogger('c');
  for (let i = 0; i < 500; i++) log.debug(i);
  assert.equal(getLogBuffer().length, 200);
});
