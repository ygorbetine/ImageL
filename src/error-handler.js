// Tratamento global de erros: registra no logger e mostra um toast nao bloqueante.
import { createLogger, diagnosticText } from './logger.js';
import { t } from './i18n.js';

const log = createLogger('error');
const seen = new Map(); // dedupe: mesma mensagem em <5s so aparece uma vez
let installed = false;

// Ruidos conhecidos que nao devem virar toast (sentinela interna do CheerpJ, loop benigno do ResizeObserver).
const IGNORE = /ResizeObserver loop|CheerpJContinue/;

export function reportError(err, origin = 'runtime') {
  const msg = err instanceof Error ? err.message : String(err);
  if (IGNORE.test(msg)) return;
  log.error(origin + ':', err);
  const now = Date.now();
  if (seen.has(msg) && now - seen.get(msg) < 5000) return;
  seen.set(msg, now);
  showToast(msg);
}

function showToast(msg) {
  if (typeof document === 'undefined') return;
  let host = document.getElementById('imagel-toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'imagel-toasts';
    host.setAttribute('role', 'alert');
    host.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:100000;display:flex;flex-direction:column;gap:8px;max-width:360px;font:13px system-ui,sans-serif';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.style.cssText = 'background:#171a1f;color:#e9edf1;border:1px solid #2c333c;border-left:3px solid #f0616d;border-radius:8px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  const text = document.createElement('div');
  text.textContent = msg.length > 240 ? msg.slice(0, 240) + '…' : msg;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-top:8px';
  const copy = document.createElement('button');
  copy.textContent = t('error.copy');
  const close = document.createElement('button');
  close.textContent = t('error.dismiss');
  for (const b of [copy, close]) b.style.cssText = 'background:#222830;color:inherit;border:1px solid #2c333c;border-radius:6px;padding:3px 10px;cursor:pointer';
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(msg + '\n\n' + diagnosticText()); copy.textContent = t('error.copied'); } catch (_) { /* sem permissao */ }
  };
  close.onclick = () => el.remove();
  row.append(copy, close);
  el.append(text, row);
  host.appendChild(el);
  setTimeout(() => el.remove(), 15000);
}

export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', e => reportError(e.error || e.message, 'window.onerror'));
  window.addEventListener('unhandledrejection', e => reportError(e.reason || 'Unhandled rejection', 'unhandledrejection'));
}
