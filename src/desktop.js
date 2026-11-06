// Ponte com o shell desktop (Tauri). So ativa quando window.__TAURI__ existe; na web nao faz nada.
// "Sem fundo": o front-end reporta os retangulos interativos e o Rust liga/desliga o click-through conforme o cursor.
import { createLogger } from './logger.js';
import { isLite } from './lite.js';

const log = createLogger('desktop');

/** Seletores dos elementos que devem capturar o mouse no modo "Sem fundo". */
export const INTERACTIVE = ['.cjWindow', '.il-top', '.il-tools', '.il-status', '.il-pal:not([hidden]) .il-palbox',
  '#imagel-toasts > *', '.il-mwrap.open ul'];

/** Converte DOMRects em {x,y,w,h} descartando vazios e fora de tela. Pura e testavel. */
export function normalizeRects(domRects, vw = Infinity, vh = Infinity) {
  const out = [];
  for (const r of domRects) {
    if (!(r.width > 1 && r.height > 1)) continue;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) continue;
    out.push({ x: r.left, y: r.top, w: r.width, h: r.height });
  }
  return out;
}

export const PIN_KEY = 'imagel.pin';
/** Preferencia do pin (padrao: ligado). Pura: recebe o storage. */
export function readPin(storage) {
  try { return storage.getItem(PIN_KEY) !== '0'; } catch (_) { return true; }
}
export function writePin(storage, on) { try { storage.setItem(PIN_KEY, on ? '1' : '0'); } catch (_) { /* ok */ } }
/** Always-on-top efetivo: so no "Sem fundo" e conforme a preferencia. */
export function wantOnTop(overlay, pref) { return !!overlay && !!pref; }

export function isDesktop() {
  return typeof window !== 'undefined' && !!(window.__TAURI__ && window.__TAURI__.core);
}

export function initDesktop() {
  if (!isDesktop()) return null;
  const invoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args).catch(e => log.warn(cmd, e));
  let overlay = false;
  let timer = 0;
  let pref = readPin(localStorage);
  const applyTop = () => invoke('set_always_on_top', { on: wantOnTop(overlay, pref) });

  const report = () => {
    timer = 0;
    if (!overlay) return;
    const els = document.querySelectorAll(INTERACTIVE.join(','));
    invoke('set_hit_regions', { rects: normalizeRects([...els].map(e => e.getBoundingClientRect()), innerWidth, innerHeight) });
  };
  // rAF no modo normal; mais espaçado no modo leve para poupar CPU
  const schedule = () => { if (!timer && overlay) timer = setTimeout(report, isLite() ? 120 : 33); };

  window.addEventListener('imagel:overlay', e => {
    overlay = !!e.detail;
    invoke('set_overlay', { on: overlay }).then(() => { applyTop(); if (overlay) report(); });
  });
  window.addEventListener('imagel:pin', e => { pref = !!e.detail; writePin(localStorage, pref); applyTop(); });
  new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  window.addEventListener('resize', schedule);
  window.addEventListener('pointerup', schedule);

  // Ctrl+Shift+P: fixar a janela no topo (fora do modo "Sem fundo", que ja fixa)
  let pinned = false;
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p' && !overlay) {
      pinned = !pinned;
      invoke('set_always_on_top', { on: pinned });
    }
  });
  log.info('shell desktop ativo');
  return { report };
}
