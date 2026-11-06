// A imagem acompanha o tamanho da janela: ao terminar de redimensionar uma janela de imagem (mouse solto),
// o zoom e ajustado para caber. So reage a redimensionamento feito pelo usuario (mouse pressionado), nunca ao
// que o proprio ImageJ faz (zoom +/-), entao nao ha laco. Leve: so observa janelas de imagem.
import { looksLikeImage } from './java-theme.js';
import { macroString } from './bridge.js';

/** Pura: zoom (%) que faz a imagem w x h caber em aw x ah. */
export function fitZoomPct(aw, ah, w, h) {
  if (!(aw > 0 && ah > 0 && w > 0 && h > 0)) return 0;
  const z = Math.min(aw / w, ah / h) * 100;
  return Math.round(Math.max(3.1, Math.min(3200, z)) * 10) / 10;
}

export function initFitWindow(bridge) {
  let pressed = false;
  const dirty = new Set();
  const last = new WeakMap();
  const watched = new WeakSet();
  const ro = new ResizeObserver(es => {
    for (const e of es) {
      const w = e.target, prev = last.get(w);
      last.set(w, [w.offsetWidth, w.offsetHeight]);
      if (prev && pressed && (prev[0] !== w.offsetWidth || prev[1] !== w.offsetHeight)) dirty.add(w);
    }
  });
  const scan = () => {
    const root = document.getElementById('cheerpjDisplay');
    if (!root) return;
    root.querySelectorAll(':scope > .cjWindow').forEach(w => { if (!watched.has(w)) { watched.add(w); last.set(w, [w.offsetWidth, w.offsetHeight]); ro.observe(w); } });
  };
  async function fit(w) {
    if (!w.isConnected || w.querySelector('.cjMenuBar') || !looksLikeImage(w) || !bridge.ready()) return;
    const cv = w.querySelectorAll('canvas')[1];
    const title = (w.querySelector('.cjTitleBarText')?.textContent || '').trim();
    if (!cv || !title) return;
    // A area util e o canvas atual redimensionado pelo usuario; como o Java ainda nao refez o layout, usamos o
    // tamanho novo da janela menos a moldura medida antes do arrasto (guardada em dataset).
    const base = w.dataset.ilChrome ? w.dataset.ilChrome.split(',').map(Number) : [w.offsetWidth - cv.offsetWidth, w.offsetHeight - cv.offsetHeight];
    const aW = w.offsetWidth - base[0], aH = w.offsetHeight - base[1];
    const t = macroString(title);
    try {
      await bridge.macro(`W="${t}"; for(i=1;i<=nImages;i++){selectImage(i);t=getTitle();if(W==t||startsWith(W,t+" (")){w=getWidth();h=getHeight();z=minOf(${aW}/w,${aH}/h)*100;if(z<3.1)z=3.1;if(z>3200)z=3200;run("Set... ","zoom="+z+" x="+w/2+" y="+h/2);break;}}`);
    } catch (_) { /* cosmetico */ }
  }
  addEventListener('pointerdown', () => {
    pressed = true;
    document.querySelectorAll('#cheerpjDisplay > .cjWindow').forEach(w => {
      const cv = w.querySelectorAll('canvas')[1];
      if (cv) w.dataset.ilChrome = `${w.offsetWidth - cv.offsetWidth},${w.offsetHeight - cv.offsetHeight}`;
    });
  }, true);
  addEventListener('pointerup', () => {
    pressed = false;
    const ws = [...dirty]; dirty.clear();
    setTimeout(() => ws.forEach(fit), 120);
  }, true);
  const mo = new MutationObserver(scan);
  const start = () => { scan(); const r = document.getElementById('cheerpjDisplay'); if (r) mo.observe(r, { childList: true }); };
  start();
  addEventListener('imagel:ready', start);
}
