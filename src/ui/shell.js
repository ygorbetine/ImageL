// Casca HTML do ImageL (opt-in: ?ui=new ou localStorage imagel.ui=new): topbar com menus, toolbar vertical,
// statusbar e paleta de comandos. Executa tudo via ImageJBridge. Sem framework; DOM direto.
import { MENUS, TOOLS, flattenCommands, searchCommands } from './menus.js';
import { createBridge } from './bridge.js';
import { initDraggable } from './draggable.js';
import { getLocale, setLocale, onLocaleChange, t } from '../i18n.js';
import { isLite, setLite } from '../lite.js';
import { reportError } from '../error-handler.js';
import { initDesktop } from '../desktop.js';
import { createAiPanel } from './ai-panel.js';
import { loadLiveMenus, EXT_HANDLERS } from './ij-menus.js';

const SVG = (d, s = 22, w = 2.4) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  theme: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
  grip: '<circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="16" cy="7" r="1.6" fill="currentColor"/><circle cx="8" cy="12" r="1.6" fill="currentColor"/><circle cx="16" cy="12" r="1.6" fill="currentColor"/><circle cx="8" cy="17" r="1.6" fill="currentColor"/><circle cx="16" cy="17" r="1.6" fill="currentColor"/>',
  bg: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="8" y="9" width="9" height="7" rx="1"/>',
  ov: '<rect x="3" y="4" width="18" height="16" rx="1.5" stroke-dasharray="3 2.4"/>',
};

const lab = o => (getLocale() === 'pt' ? o.pt : o.en);
const el = (tag, attrs = {}, html = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  if (html) e.innerHTML = html;
  return e;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function shellEnabled() {
  try {
    const q = new URLSearchParams(location.search).get('ui');
    if (q === 'new' || q === 'classic') { localStorage.setItem('imagel.ui', q); return q === 'new'; }
    return localStorage.getItem('imagel.ui') === 'new';
  } catch (_) { return false; }
}

export function mountShell() {
  const bridge = createBridge();
  let menus = MENUS;
  let commands = flattenCommands(menus);
  const isDesktop = typeof window !== 'undefined' && !!window.__TAURI__;
  document.documentElement.dataset.theme = (() => { try { return localStorage.getItem('imagel.theme') || 'dark'; } catch (_) { return 'dark'; } })();
  document.body.classList.add('il-shell');

  const run = (cmd, ext) => {
    const h = ext && window.__menuHandlers && window.__menuHandlers[EXT_HANDLERS[cmd]];
    if (h) { try { return Promise.resolve(h()).catch(e => reportError(e, 'ext')); } catch (e) { reportError(e, 'ext'); return null; } }
    return bridge.run(cmd).catch(e => reportError(e, 'menu'));
  };

  // ---- menus ----------------------------------------------------------------------------------------------------
  const menubar = el('nav', { class: 'il-menu', role: 'menubar' });
  let openMenu = null;
  const closeMenus = () => { if (openMenu) { openMenu.classList.remove('open'); openMenu.firstChild.setAttribute('aria-expanded', 'false'); openMenu = null; } };
  const renderItems = items => {
    const ul = el('ul', { role: 'menu' });
    for (const it of items) {
      if (it === '-') { ul.appendChild(el('li', { class: 'sep', role: 'separator' })); continue; }
      if (it.sub) {
        const li = el('li', { class: 'has-sub', role: 'none' }, `<span role="menuitem" aria-haspopup="true" tabindex="-1">${esc(lab(it.sub))}<i>›</i></span>`);
        li.appendChild(renderItems(it.items));
        ul.appendChild(li);
      } else {
        const li = el('li', { role: 'none' }, `<button role="menuitem" tabindex="-1">${esc(lab(it))}${it.key ? `<kbd>${esc(it.key)}</kbd>` : ''}</button>`);
        li.firstChild.addEventListener('click', () => { closeMenus(); run(it.cmd, it.ext); });
        ul.appendChild(li);
      }
    }
    return ul;
  };
  const buildMenus = () => {
    menubar.textContent = '';
    for (const m of menus) {
      const wrap = el('div', { class: 'il-mwrap' });
      const btn = el('button', { class: 'il-mbtn', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, esc(lab(m)));
      const open = () => { if (openMenu !== wrap) { closeMenus(); wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); openMenu = wrap; } };
      btn.addEventListener('click', () => (openMenu === wrap ? closeMenus() : open()));
      btn.addEventListener('mouseenter', () => { if (openMenu && openMenu !== wrap) open(); });
      wrap.append(btn, renderItems(m.items));
      menubar.appendChild(wrap);
    }
  };
  document.addEventListener('click', e => { if (!e.target.closest('.il-mwrap')) closeMenus(); });

  // ---- topbar ---------------------------------------------------------------------------------------------------
  const top = el('header', { class: 'il-top', 'data-drag': '' });
  const logo = el('div', { class: 'il-logo', 'data-handle': '', title: t('drag.hint') }, '<i></i>ImageL');
  const searchBtn = el('button', { class: 'il-search', onclick: () => openPalette() }, `${SVG(ICON.search, 18)}<span data-s></span><kbd>Ctrl K</kbd>`);
  const seg = el('div', { class: 'il-seg', role: 'group' });
  const mBg = el('button', { class: 'on', onclick: () => setOverlay(false) }, `${SVG(ICON.bg, 18)}<span data-m="bg"></span>`);
  const mOv = el('button', { onclick: () => setOverlay(true) }, `${SVG(ICON.ov, 18)}<span data-m="ov"></span>`);
  seg.append(mBg, mOv);
  if (!isDesktop) seg.hidden = true; // "Sem fundo" exige o shell desktop (janela transparente)
  const liteBtn = el('button', { class: 'il-ico', onclick: () => { setLite(!isLite()); refresh(); } }, SVG(ICON.bolt, 20));
  const langBtn = el('button', { class: 'il-lang', onclick: () => setLocale(getLocale() === 'pt' ? 'en' : 'pt') }, `${SVG(ICON.globe, 18)}<b></b>`);
  const themeBtn = el('button', { class: 'il-ico', onclick: () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('imagel.theme', next); } catch (_) { /* ok */ }
  } }, SVG(ICON.theme, 20));
  const ai = createAiPanel();
  const aiBtn = el('button', { class: 'il-lang', onclick: () => ai.toggle() }, '<b>IA</b>');
  top.append(logo, menubar, el('div', { class: 'il-spacer' }), searchBtn, seg, aiBtn, liteBtn, langBtn, themeBtn);

  // ---- toolbar --------------------------------------------------------------------------------------------------
  const tools = el('aside', { class: 'il-tools', 'data-drag': '', 'aria-label': 'Tools' });
  tools.appendChild(el('div', { class: 'il-grip', 'data-handle': '', title: t('drag.hint') }, SVG(ICON.grip, 18)));
  const toolBtns = new Map();
  for (const tl of TOOLS) {
    if (tl === '-') { tools.appendChild(el('hr')); continue; }
    const b = el('button', { class: 'il-tool', 'data-tool': tl.id, title: lab(tl), 'aria-label': lab(tl) }, SVG(tl.icon));
    b.addEventListener('click', () => {
      bridge.setTool(tl.id).then(() => { toolBtns.forEach(x => x.classList.remove('active')); b.classList.add('active'); }).catch(e => reportError(e, 'tool'));
    });
    toolBtns.set(tl.id, b);
    tools.appendChild(b);
  }

  // ---- statusbar ------------------------------------------------------------------------------------------------
  const status = el('footer', { class: 'il-status', 'data-drag': '' });
  const sReady = el('span', { class: 'il-ready' });
  const sMem = el('span');
  const sLite = el('span');
  status.append(sReady, el('div', { class: 'il-spacer' }), sLite, sMem);

  // ---- paleta de comandos ---------------------------------------------------------------------------------------
  const pal = el('div', { class: 'il-pal', hidden: '' });
  const palBox = el('div', { class: 'il-palbox', role: 'dialog', 'aria-modal': 'true' });
  const palIn = el('input', { type: 'text', 'aria-label': 'Command', autocomplete: 'off' });
  const palList = el('ul', { role: 'listbox' });
  palBox.append(palIn, palList);
  pal.appendChild(palBox);
  let palSel = 0, palRes = [];
  const renderPal = () => {
    palRes = searchCommands(palIn.value, commands);
    palSel = Math.min(palSel, Math.max(0, palRes.length - 1));
    palList.textContent = '';
    palRes.forEach((c, i) => {
      const li = el('li', { role: 'option', class: i === palSel ? 'sel' : '' },
        `<span>${esc(lab(c))}</span><small>${esc(c.path.map(lab).join(' › '))}</small>`);
      li.addEventListener('mousedown', ev => { ev.preventDefault(); execPal(i); });
      palList.appendChild(li);
    });
  };
  const execPal = i => { const c = palRes[i]; closePalette(); if (c) run(c.cmd, c.ext); };
  function openPalette() { pal.hidden = false; palIn.value = ''; palSel = 0; renderPal(); palIn.focus(); }
  function closePalette() { pal.hidden = true; }
  palIn.addEventListener('input', () => { palSel = 0; renderPal(); });
  palIn.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePalette();
    else if (e.key === 'ArrowDown') { palSel = Math.min(palSel + 1, palRes.length - 1); renderPal(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { palSel = Math.max(palSel - 1, 0); renderPal(); e.preventDefault(); }
    else if (e.key === 'Enter') execPal(palSel);
  });
  pal.addEventListener('mousedown', e => { if (e.target === pal) closePalette(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); }
    else if (e.key === 'Escape') closeMenus();
    else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b' && isDesktop) { e.preventDefault(); setOverlay(!document.body.classList.contains('ov')); }
  });

  // ---- modo "Sem fundo" (desktop) --------------------------------------------------------------------------------
  function setOverlay(on) {
    document.body.classList.toggle('ov', on);
    mOv.classList.toggle('on', on);
    mBg.classList.toggle('on', !on);
    window.dispatchEvent(new CustomEvent('imagel:overlay', { detail: on })); // o shell Tauri liga click-through/transparencia
  }

  // ---- textos dependentes de idioma/estado ----------------------------------------------------------------------
  function refresh() {
    searchBtn.querySelector('[data-s]').textContent = t('search.placeholder');
    mBg.querySelector('span').textContent = t('mode.bg');
    mOv.querySelector('span').textContent = t('mode.overlay');
    mBg.title = t('mode.bg.title'); mOv.title = t('mode.overlay.title');
    langBtn.querySelector('b').textContent = getLocale().toUpperCase();
    langBtn.title = t('lang.toggle'); themeBtn.title = t('theme.toggle');
    for (const [b, k] of [[langBtn, 'lang.toggle'], [themeBtn, 'theme.toggle'], [liteBtn, null], [aiBtn, 'panel.ai']]) b.setAttribute('aria-label', k ? t(k) : 'Lite mode');
    toolBtns.forEach((b, id) => { const tl = TOOLS.find(x => x.id === id); b.title = b.ariaLabel = lab(tl); });
    liteBtn.title = isLite() ? 'Lite mode: ON' : 'Lite mode: OFF';
    liteBtn.classList.toggle('on', isLite());
    sReady.textContent = bridge.ready() ? t('status.ready') : t('load.runtime');
    sLite.textContent = isLite() ? 'LITE' : '';
    buildMenus();
    renderPal();
  }
  onLocaleChange(refresh);
  // Menus reais do ImageJ (completos, com plugins e Extensions) quando ele estiver pronto; falha -> lista padrao.
  window.addEventListener('imagel:ready', async () => {
    try { menus = await loadLiveMenus(window.IJClass); commands = flattenCommands(menus); refresh(); }
    catch (e) { reportError('Menus do ImageJ indisponiveis, usando lista padrao: ' + (e.message || e), 'menus'); }
  });

  const memTick = () => {
    const m = performance.memory;
    sMem.textContent = !isLite() && m ? `${t('status.memory')} ${Math.round(m.usedJSHeapSize / 1048576)} MB` : '';
    sReady.textContent = bridge.ready() ? t('status.ready') : t('load.runtime');
  };
  setInterval(memTick, isLite() ? 10000 : 4000);

  document.body.append(top, tools, status, pal);
  initDraggable({ enabled: () => document.body.classList.contains('ov') });
  refresh();
  memTick();
  initDesktop(); // no-op na web; no Tauri liga overlay/click-through
  return { bridge, setOverlay, openPalette };
}
