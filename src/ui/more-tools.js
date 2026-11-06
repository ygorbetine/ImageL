// "More tools": flyout ao lado da toolbar com as ferramentas extras do ImageJ (equivale ao botao » da barra Java).
// Lista = ferramentas de macro em lib/ImageJ/macros (arquivos *Tool*.txt) + extras embutidas. Clicar instala a
// ferramenta no ImageJ (`run("Install...")`) e a seleciona.
import { createLogger } from '../logger.js';

const log = createLogger('more-tools');

/** Arquivos de ferramenta a partir do index.list de macros. Pura e testavel. */
export function parseToolFiles(indexList) {
  return String(indexList).split(/\r?\n/).map(s => s.trim()).filter(f => /tool.*\.(txt|ijm)$/i.test(f) && !/options/i.test(f));
}

/** "FloodFillTool.txt" -> "Flood Fill Tool"; "Circle_Tool.txt" -> "Circle Tool". */
export function toolLabel(file) {
  return file.replace(/\.(txt|ijm)$/i, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}

export function createMoreTools({ bridge, base = '/', fetchText = u => fetch(u).then(r => (r.ok ? r.text() : '')), extras = [] }) {
  const box = document.createElement('div');
  box.className = 'il-more';
  box.hidden = true;
  box.setAttribute('role', 'menu');
  let loaded = false;

  async function pick(file) {
    box.hidden = true;
    try {
      await bridge.run('Install...', `install=/app${base}lib/ImageJ/macros/${file}`);
    } catch (e) { log.warn('install', file, e); }
  }

  async function fill() {
    box.textContent = '';
    let files = [];
    try { files = parseToolFiles(await fetchText(`${base}lib/ImageJ/macros/index.list`)); } catch (e) { log.warn('index.list', e); }
    for (const x of extras) {
      const b = document.createElement('button');
      b.setAttribute('role', 'menuitem');
      b.textContent = x.label;
      b.addEventListener('click', () => { box.hidden = true; x.run(); });
      box.appendChild(b);
    }
    if (!files.length && !extras.length) { box.textContent = '—'; return; }
    for (const f of files) {
      const b = document.createElement('button');
      b.setAttribute('role', 'menuitem');
      b.textContent = toolLabel(f);
      b.addEventListener('click', () => pick(f));
      box.appendChild(b);
    }
  }

  return {
    el: box,
    async toggle() {
      box.hidden = !box.hidden;
      if (!box.hidden && !loaded) { loaded = true; await fill(); }
    },
    close() { box.hidden = true; },
  };
}
