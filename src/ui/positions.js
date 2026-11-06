// Memoriza a posicao das barras e janelas flutuantes por modo ("Sem fundo" x "Com fundo"), para voltar de onde parou.
// Barras: top/tools/status do shell. Janelas: janelas Java (div.cjWindow), identificadas pelo titulo (sem sufixo de zoom).
import { clampPosition } from './draggable.js';

const KEY = 'imagel.pos';

/** "cells.tif (50%)" -> "cells.tif". Pura. */
export const titleKey = t => String(t || '').replace(/\s*\(\d+(\.\d+)?%\)\s*$/, '').trim();

export function readStore(ls) { try { return JSON.parse(ls.getItem(KEY)) || {}; } catch (_) { return {}; } }
export function writeStore(ls, o) { try { ls.setItem(KEY, JSON.stringify(o)); } catch (_) { /* ok */ } }

const px = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

/** Foto das posicoes arrastadas (so o que tem left/top inline). */
export function snapshot(bars, display) {
  const out = { bars: {}, wins: {} };
  for (const [k, el] of Object.entries(bars)) if (el.style.left || el.style.top) out.bars[k] = { left: el.style.left, top: el.style.top };
  display?.querySelectorAll(':scope > .cjWindow').forEach(w => {
    const k = titleKey(w.querySelector('.cjTitleBarText')?.textContent);
    if (k && (w.style.left || w.style.top)) out.wins[k] = { left: w.style.left, top: w.style.top };
  });
  return out;
}

/** Reaplica a foto, mantendo parte de cada elemento visivel na area atual. */
export function restore(snap, bars, display, vw, vh) {
  if (!snap) return;
  const put = (el, p, isBar) => {
    const x = px(p.left), y = px(p.top);
    if (x === null || y === null) return;
    const c = clampPosition(x, y, el.offsetWidth || 120, vw, vh);
    el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
    if (isBar) { el.style.right = el.style.bottom = 'auto'; el.style.transform = 'none'; }
  };
  for (const [k, p] of Object.entries(snap.bars || {})) if (bars[k]) put(bars[k], p, true);
  display?.querySelectorAll(':scope > .cjWindow').forEach(w => {
    const p = snap.wins?.[titleKey(w.querySelector('.cjTitleBarText')?.textContent)];
    if (p) put(w, p, false);
  });
}
