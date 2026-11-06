// Carregamento sob demanda: scripts pesados/opcionais so sao baixados quando necessarios.
import { createLogger } from './logger.js';

const log = createLogger('lazy');
const loaded = new Map();

/** Carrega um script classico uma unica vez. Rejeita se falhar (ex.: 404). */
export function loadScript(src) {
  if (loaded.has(src)) return loaded.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => { log.debug('carregado:', src); resolve(); };
    s.onerror = () => { loaded.delete(src); reject(new Error('Nao foi possivel carregar ' + src)); };
    document.head.appendChild(s);
  });
  loaded.set(src, p);
  return p;
}

/** ome-loader so com ?load=/?ome=; touch-controller so em dispositivos com toque. */
export function loadOptionalFeatures(base = '') {
  const p = new URLSearchParams(location.search);
  if (p.has('load') || p.has('ome')) {
    import(base + 'threadhack/viv-loader/ome-loader.js').catch(e => log.warn('ome-loader:', e));
  }
  if ((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window) {
    loadScript(base + 'threadhack/viv-loader/touch-controller.js').catch(e => log.warn('touch-controller:', e));
  }
}
