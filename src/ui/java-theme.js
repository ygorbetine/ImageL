// Tema escuro do conteudo das janelas Java: marca (data-il-dark) as janelas que NAO sao de imagem; o CSS inverte o canvas
// delas. Imagens nunca sao tocadas. Leve: so reage a janelas criadas/removidas/retitulos, com debounce.

/** Pura: decide quais titulos de janela sao de imagem. */
export function darkTargets(windowTitles, imageTitles) {
  // Titulo da janela de imagem pode ganhar sufixo de zoom/pilha: "cells.tif (50%)".
  const isImage = t => imageTitles.some(it => t === it || t.startsWith(it + ' ('));
  return windowTitles.map(t => !isImage(t));
}

export function initJavaTheme(bridge, rootArg = null) {
  // O display do CheerpJ so existe depois do boot: espera por ele.
  const find = () => rootArg || document.getElementById('cheerpjDisplay');
  let root = find();
  if (!root) {
    let stop = () => {}; let started = false;
    const start = () => { if (started || !find()) return; started = true; wait.disconnect(); stop = initJavaTheme(bridge, find()); };
    const wait = new MutationObserver(start);
    wait.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('imagel:ready', start, { once: true });
    return () => { wait.disconnect(); stop(); };
  }
  let timer = 0;
  let busy = false;
  let known = false; // so escurece depois de conhecer os titulos de imagem: nunca inverter uma imagem por engano
  let imgs = []; // ultimo conjunto conhecido de titulos de imagem (a macro nao responde enquanto ha dialogo modal)
  const fetchTitles = async () => {
    if (!bridge.ready()) return;
    const r = await bridge.macro('t = getList("image.titles"); s = ""; for (i = 0; i < t.length; i++) s = s + t[i] + "\\n"; return s;');
    imgs = String(r || '').split('\n').filter(Boolean);
    known = true;
  };
  const apply = async () => {
    if (busy) return;
    busy = true;
    try {
      // espera os titulos por no maximo 400 ms; se o Java estiver preso num dialogo, usa o cache (dialogo novo = escuro)
      await Promise.race([fetchTitles().catch(() => {}), new Promise(r => setTimeout(r, 400))]);
      if (!known) return;
      const wins = [...root.querySelectorAll(':scope > .cjWindow')];
      const titles = wins.map(w => (w.querySelector('.cjTitleBarText')?.textContent || '').trim());
      const dark = darkTargets(titles, imgs);
      wins.forEach((w, i) => {
        const frame = w.querySelector('canvas');
        if (dark[i]) { w.dataset.ilDark = '1'; delete frame?.dataset.ilFrame; }
        else { delete w.dataset.ilDark; if (frame) frame.dataset.ilFrame = '1'; } // imagem: so a moldura/linha de info escurece
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
