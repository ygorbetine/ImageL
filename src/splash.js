// Splash de carregamento: barra de progresso por etapas (textos via i18n). O markup fica em index.html
// para aparecer no primeiro paint; este modulo so atualiza.
import { t, onLocaleChange } from './i18n.js';

let key = 'load.runtime';
let hidden = false;
let watchdog = null;
const SLOW_MS = 45000;

function arm() {
  clearTimeout(watchdog);
  watchdog = setTimeout(() => { if (!hidden) { key = 'load.slow'; render(); } }, SLOW_MS);
}

function el(id) { return typeof document === 'undefined' ? null : document.getElementById(id); }

function render() {
  const label = el('imagel-splash-label');
  if (label) label.textContent = t(key);
}

onLocaleChange(render);

/** Texto seguro para qualquer valor lancado (objetos sem prototipo, CJ3Library etc. nao viram string). */
export function describe(err) {
  try {
    if (err && typeof err.message === 'string' && err.message) return err.message;
    if (typeof err === 'string' && err) return err;
    const s = String(err);
    if (s && s !== '[object Object]') return s;
  } catch (_) { /* objeto sem toString */ }
  return t('load.failed');
}

export const splash = {
  step(labelKey, percent) {
    if (hidden) return;
    key = labelKey;
    render();
    arm();
    const bar = el('imagel-splash-bar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
    const root = el('imagel-splash');
    if (root) root.setAttribute('aria-valuenow', String(Math.round(percent)));
  },
  done() {
    if (hidden) return;
    this.step('load.ready', 100);
    hidden = true;
    clearTimeout(watchdog);
    const root = el('imagel-splash');
    if (!root) return;
    root.classList.add('done');
    setTimeout(() => root.remove(), 400);
  },
  fail(err) {
    clearTimeout(watchdog);
    const root = el('imagel-splash');
    if (!root) return;
    root.classList.add('failed');
    const label = el('imagel-splash-label');
    if (label) label.textContent = describe(err);
  },
};
