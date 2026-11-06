// Tema escuro do conteudo das janelas Java: marca (data-il-dark) as janelas que NAO sao de imagem; o CSS inverte o canvas
// delas. Imagens nunca sao tocadas. Leve: so reage a janelas criadas/removidas/retitulos, com debounce.

/** Pura: decide quais titulos de janela sao de imagem. */
export function darkTargets(windowTitles, imageTitles) {
  // Titulo da janela de imagem pode ganhar sufixo de zoom/pilha: "cells.tif (50%)".
  const isImage = t => imageTitles.some(it => t === it || t.startsWith(it + ' ('));
  return windowTitles.map(t => !isImage(t));
}

/** Heuristica de forma: janela de imagem = sem barra de menu e 2 canvas (moldura + imagem quase do mesmo tamanho). */
export function looksLikeImage(w) {
  if (w.querySelector('.cjMenuBar')) return false;
  const c = w.querySelectorAll('canvas');
  if (c.length < 2) return false;
  const a = c[0], b = c[1];
  return b.width >= a.width * 0.85 && b.height >= a.height * 0.5;
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
  let inflight = null; // no maximo 1 consulta pendente: com Java preso nao empilhamos macros
  const fetchOnce = () => inflight || (inflight = fetchTitles().finally(() => { inflight = null; }));
  const apply = async () => {
    if (busy) return;
    busy = true;
    try {
      // Titulos frescos (Java livre) mandam. Se o Java estiver preso (macro/dialogo), a lista pode estar velha:
      // janelas desconhecidas so escurecem se NAO tiverem forma de imagem, e reavaliamos logo depois.
      const fresh = await Promise.race([fetchOnce().then(() => true, () => false), new Promise(r => setTimeout(() => r(false), 400))]);
      const wins = [...root.querySelectorAll(':scope > .cjWindow')];
      const titles = wins.map(w => (w.querySelector('.cjTitleBarText')?.textContent || '').trim());
      const byTitle = known ? darkTargets(titles, imgs) : wins.map(() => true);
      const dark = wins.map((w, i) => (fresh ? byTitle[i] : byTitle[i] && !looksLikeImage(w)));
      if (!fresh) { clearTimeout(timer); timer = setTimeout(apply, 1500); }
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
