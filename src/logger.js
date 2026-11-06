// ImageL logger: niveis, silencioso em producao, buffer circular para diagnostico.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const BUFFER_MAX = 200;
const buffer = [];

function detectLevel() {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('log') : null;
    if (q && q in LEVELS) return q;
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem('imagel.log') : null;
    if (s && s in LEVELS) return s;
  } catch (_) { /* storage indisponivel */ }
  const dev = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  return dev ? 'debug' : 'warn';
}

let current = detectLevel();

function fmt(a) {
  if (a instanceof Error) return a.stack || a.message;
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch (_) { return String(a); }
}

function emit(level, scope, args) {
  const entry = { t: Date.now(), level, scope, msg: args.map(fmt).join(' ') };
  buffer.push(entry);
  if (buffer.length > BUFFER_MAX) buffer.shift();
  if (LEVELS[level] < LEVELS[current]) return;
  const fn = console[level === 'debug' ? 'log' : level] || console.log;
  fn.call(console, '[' + scope + ']', ...args);
}

export function createLogger(scope = 'app') {
  return {
    debug: (...a) => emit('debug', scope, a),
    info: (...a) => emit('info', scope, a),
    warn: (...a) => emit('warn', scope, a),
    error: (...a) => emit('error', scope, a),
  };
}
export function setLogLevel(level) { if (level in LEVELS) current = level; }
export function getLogLevel() { return current; }
export function getLogBuffer() { return buffer.slice(); }
export function clearLogBuffer() { buffer.length = 0; }
export function diagnosticText() {
  return buffer.map(e => new Date(e.t).toISOString() + ' ' + e.level.toUpperCase() + ' [' + e.scope + '] ' + e.msg).join('\n');
}
if (typeof window !== 'undefined') { (window.ImageL = window.ImageL || {}).createLogger = createLogger; }
