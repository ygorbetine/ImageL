// Inicializacao antecipada: idioma, tratamento global de erros, splash e Service Worker.
import { initI18n } from './i18n.js';
import { installGlobalErrorHandlers } from './error-handler.js';
import { splash } from './splash.js';
import { createLogger } from './logger.js';

const log = createLogger('boot-early');

initI18n();
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
