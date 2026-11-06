// Tema escuro do conteudo das janelas Java: marca (data-il-dark) as janelas que NAO sao de imagem; o CSS inverte o canvas
// delas. Imagens nunca sao tocadas. Leve: so reage a janelas criadas/removidas/retitulos, com debounce.

/** Pura: decide quais titulos de janela sao de imagem. */
export function darkTargets(windowTitles, imageTitles) {
  // Titulo da janela de imagem pode ganhar sufixo de zoom/pilha: "cells.tif (50%)".
  const isImage = t => imageTitles.some(it => t === it || t.startsWith(it + ' ('));
  return windowTitles.map(t => !isImage(t));
}

export function initJavaTheme(bridge, root = document.getElementById('cheerpjDisplay')) {
  if (!root) return () => {};
  let timer = 0;
  let busy = false;
  const apply = async () => {
    if (busy) return;
    busy = true;
    try {
      const wins = [...root.querySelectorAll(':scope > .cjWindow')];
      if (!wins.length) return;
      let imgs = [];
      if (bridge.ready()) {
        const r = await bridge.macro('t = getList("image.titles"); s = ""; for (i = 0; i < t.length; i++) s = s + t[i] + "\n"; return s;');
        imgs = String(r || '').split('\n').filter(Boolean);
      }
      const titles = wins.map(w => (w.querySelector('.cjTitleBarText')?.textContent || '').trim());
      const dark = darkTargets(titles, imgs);
      wins.forEach((w, i) => {
        // A janela principal "ImageJ" tem menus DOM e so um canvas pequeno: tambem escurece.
        if (dark[i]) w.dataset.ilDark = '1'; else delete w.dataset.ilDark;
      });
    } catch (_) { /* tema e cosmetico: nunca propaga erro */ } finally { busy = false; }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(apply, 250); };
  const mo = new MutationObserver(schedule);
  mo.observe(root, { childList: true });
  window.addEventListener('imagel:ready', schedule);
  schedule();
  return () => { mo.disconnect(); clearTimeout(timer); };
}
