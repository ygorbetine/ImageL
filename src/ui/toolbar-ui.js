// Pecas leves da toolbar: tooltip (nome + atalho) e flyout de grupo. Sem dependencias.

/** Posiciona `box` ao lado de `anchor` sem sair da tela. Pura e testavel. */
export function placeNear(anchorRect, boxSize, vw, vh, vertical) {
  let x = vertical ? anchorRect.right + 6 : anchorRect.left;
  let y = vertical ? anchorRect.top : anchorRect.bottom + 6;
  x = Math.max(4, Math.min(x, vw - boxSize.w - 4));
  y = Math.max(4, Math.min(y, vh - boxSize.h - 4));
  return { x, y };
}

const isVertical = () => document.body.dataset.orient === 'v';

export function createTooltip() {
  const tipEl = document.createElement('div');
  tipEl.className = 'il-tip';
  tipEl.hidden = true;
  tipEl.setAttribute('role', 'tooltip');
  document.body.appendChild(tipEl);
  let timer = 0;
  const hide = () => { clearTimeout(timer); tipEl.hidden = true; };
  return {
    attach(btn, text) {
      btn.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          tipEl.textContent = text();
          tipEl.hidden = false;
          const p = placeNear(btn.getBoundingClientRect(), { w: tipEl.offsetWidth, h: tipEl.offsetHeight }, innerWidth, innerHeight, isVertical());
          tipEl.style.left = p.x + 'px';
          tipEl.style.top = p.y + 'px';
        }, 350);
      });
      btn.addEventListener('mouseleave', hide);
      btn.addEventListener('click', hide);
    },
  };
}

export function createFlyout() {
  const box = document.createElement('div');
  box.className = 'il-fly';
  box.hidden = true;
  box.setAttribute('role', 'menu');
  document.body.appendChild(box);
  const close = () => { box.hidden = true; };
  document.addEventListener('click', e => { if (!e.target.closest('.il-fly')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  return {
    close,
    open(anchor, items) {
      box.textContent = '';
      for (const it of items) {
        const b = document.createElement('button');
        b.setAttribute('role', 'menuitem');
        b.innerHTML = `${it.icon}<span></span>`;
        b.lastChild.textContent = it.label;
        b.addEventListener('click', () => { close(); it.run(); });
        box.appendChild(b);
      }
      box.hidden = false;
      const p = placeNear(anchor.getBoundingClientRect(), { w: box.offsetWidth, h: box.offsetHeight }, innerWidth, innerHeight, isVertical());
      box.style.left = p.x + 'px';
      box.style.top = p.y + 'px';
    },
  };
}
