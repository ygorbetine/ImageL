// Arrastar elementos livremente: [data-drag] e movido pelo seu [data-handle].
// Regras: pelo menos MIN_VISIBLE px ficam na tela; clique traz a janela a frente;
// elementos [data-window] movem-se relativos ao offsetParent; barras fixas so quando enabled(el) for true.

export const MIN_VISIBLE = 60;

/** Limita a posicao (x,y) para manter parte do elemento visivel. Pura, testavel. */
export function clampPosition(x, y, w, vw, vh, minVisible = MIN_VISIBLE, minTop = 0) {
  const cx = Math.min(Math.max(x, -w + minVisible), vw - minVisible);
  const cy = Math.min(Math.max(y, minTop), vh - 30);
  return { x: cx, y: cy };
}

export function initDraggable({ root = document, enabled = () => true, onMove, onEnd } = {}) {
  let cur = null;
  let z = 100;
  const down = e => {
    const handle = e.target.closest('[data-handle]');
    if (!handle || e.button > 0) return;
    if (e.target.closest('[data-no-drag]')) return;
    const el = handle.closest('[data-drag]');
    if (!el) return;
    const isWin = el.hasAttribute('data-window');
    if (!isWin && !enabled(el)) return;
    const r = el.getBoundingClientRect();
    if (isWin) {
      const pr = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
      el.style.left = r.left - pr.left + 'px';
      el.style.top = r.top - pr.top + 'px';
      el.style.zIndex = ++z;
    } else {
      el.style.left = r.left + 'px';
      el.style.top = r.top + 'px';
      el.style.right = el.style.bottom = 'auto';
      el.style.transform = 'none';
    }
    cur = { el, isWin, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width };
    el.classList.add('dragging');
    try { handle.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
    e.preventDefault();
  };
  const move = e => {
    if (!cur) return;
    const { el, isWin, dx, dy, w } = cur;
    const pr = isWin && el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    const p = clampPosition(e.clientX - dx - pr.left, e.clientY - dy - pr.top, w,
      window.innerWidth - pr.left, window.innerHeight - pr.top);
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    if (onMove) onMove(el, p);
  };
  const up = () => {
    if (!cur) return;
    cur.el.classList.remove('dragging');
    if (onEnd) onEnd(cur.el);
    cur = null;
  };
  root.addEventListener('pointerdown', down);
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
  return () => {
    root.removeEventListener('pointerdown', down);
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerup', up);
    root.removeEventListener('pointercancel', up);
  };
}
