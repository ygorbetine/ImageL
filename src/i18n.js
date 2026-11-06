// i18n minimo PT/EN, sem dependencias.
import { messages } from './i18n/messages.js';

export const SUPPORTED = ['en', 'pt'];
export const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'imagel.locale';
let locale = DEFAULT_LOCALE;
const listeners = new Set();

/** 'pt-BR' / 'pt_PT' -> 'pt'; desconhecido -> null */
export function normalizeLocale(value) {
  if (!value || typeof value !== 'string') return null;
  const base = value.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED.includes(base) ? base : null;
}

/** ?lang= > escolha salva > idioma do navegador > padrao. */
export function detectLocale() {
  try {
    const q = typeof location !== 'undefined' ? normalizeLocale(new URLSearchParams(location.search).get('lang')) : null;
    if (q) return q;
    const s = typeof localStorage !== 'undefined' ? normalizeLocale(localStorage.getItem(STORAGE_KEY)) : null;
    if (s) return s;
  } catch (_) { /* storage indisponivel */ }
  const langs = typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : [];
  for (const l of langs) { const n = normalizeLocale(l); if (n) return n; }
  return DEFAULT_LOCALE;
}

export function getLocale() { return locale; }

export function setLocale(next, { persist = true } = {}) {
  const n = normalizeLocale(next);
  if (!n) return false;
  locale = n;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = n === 'pt' ? 'pt-BR' : 'en';
    applyDOM();
  }
  if (persist) { try { localStorage.setItem(STORAGE_KEY, n); } catch (_) { /* ok */ } }
  listeners.forEach(fn => fn(n));
  return true;
}

/** t('chave', {n: 3}) troca {n}; chave ausente cai no ingles e depois na propria chave. */
export function t(key, params) {
  const cur = messages[locale] || {};
  const def = messages[DEFAULT_LOCALE] || {};
  let s = key in cur ? cur[key] : (key in def ? def[key] : key);
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
  return s;
}

export function onLocaleChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Aplica [data-i18n] (texto), [data-i18n-title] e [data-i18n-placeholder]. */
export function applyDOM(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
}

export function initI18n() { setLocale(detectLocale(), { persist: false }); }
if (typeof window !== 'undefined') {
  (window.ImageL = window.ImageL || {}).i18n = { t, setLocale, getLocale, applyDOM };
}
