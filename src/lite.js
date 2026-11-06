// Modo leve: reduz efeitos visuais e trabalho em segundo plano em maquinas modestas.
// Mesma heuristica do pool de workers (threadhack/runtime/loader.js). Override: ?lite=1|0 ou localStorage imagel.lite.
const KEY = 'imagel.lite';

/** Pura e testavel. param/stored: '1' | '0' | null. */
export function decideLite({ cores = 2, mem = 0, saveData = false, reducedMotion = false, param = null, stored = null } = {}) {
  if (param === '1' || param === '0') return param === '1';
  if (stored === '1' || stored === '0') return stored === '1';
  return cores <= 4 || (mem > 0 && mem <= 4) || saveData || reducedMotion;
}

export function detectLite() {
  let param = null, stored = null;
  try { param = new URLSearchParams(location.search).get('lite'); } catch (_) { /* ok */ }
  try { stored = localStorage.getItem(KEY); } catch (_) { /* ok */ }
  return decideLite({
    cores: navigator.hardwareConcurrency || 2,
    mem: navigator.deviceMemory || 0,
    saveData: !!(navigator.connection && navigator.connection.saveData),
    reducedMotion: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    param, stored,
  });
}

export function setLite(on, { persist = true } = {}) {
  document.documentElement.toggleAttribute('data-lite', !!on);
  if (persist) { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) { /* ok */ } }
  window.dispatchEvent(new CustomEvent('imagel:lite', { detail: !!on }));
}

export function isLite() { return document.documentElement.hasAttribute('data-lite'); }

export function initLite() { setLite(detectLite(), { persist: false }); }
if (typeof window !== 'undefined') { (window.ImageL = window.ImageL || {}).lite = { isLite, setLite }; }
