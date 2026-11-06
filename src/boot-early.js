// Inicializacao antecipada: idioma, tratamento global de erros, splash e Service Worker.
import { initI18n } from './i18n.js';
import { installGlobalErrorHandlers } from './error-handler.js';
import { splash } from './splash.js';
import { createLogger } from './logger.js';
import { loadOptionalFeatures } from './lazy.js';
import { initLite } from './lite.js';

const log = createLogger('boot-early');

initI18n();
initLite();
installGlobalErrorHandlers();
splash.step('load.runtime', 5);

// Service Worker: so em https (ou localhost com ?sw=1) e nunca com ?nosw=1.
try {
  const p = new URLSearchParams(location.search);
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const allowed = 'serviceWorker' in navigator && !p.has('nosw') && (location.protocol === 'https:' || (local && p.has('sw')));
  if (allowed) {
    const base = location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]*$/, '');
    navigator.serviceWorker.register(base + 'sw.js').catch(e => log.warn('Service Worker nao registrado:', e));
  }
} catch (e) {
  log.warn('Service Worker indisponivel:', e);
}

// Recursos opcionais (sob demanda): rodam depois do primeiro paint para nao competir com o boot.
(window.requestIdleCallback || (f => setTimeout(f, 500)))(() => loadOptionalFeatures(location.pathname.replace(/[^/]*$/, '')));

// Nova casca de UI (opt-in: ?ui=new). Carregada sob demanda; boot.js aguarda __shellReady antes de criar o display.
try {
  const q = new URLSearchParams(location.search).get('ui');
  const on = q ? q === 'new' : localStorage.getItem('imagel.ui') === 'new';
  if (q === 'new' || q === 'classic') localStorage.setItem('imagel.ui', q);
  if (on) {
    const base = location.pathname.replace(/[^/]*$/, '');
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'static/shell.css?v=0.6.0-alpha.33';
    document.head.appendChild(css);
    window.__shellReady = import('./ui/shell.js').then(m => m.mountShell()).catch(e => log.error('shell:', e));
  }
} catch (e) {
  log.warn('shell indisponivel:', e);
}
