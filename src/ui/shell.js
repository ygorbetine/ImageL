// Casca HTML do ImageL (opt-in: ?ui=new ou localStorage imagel.ui=new): topbar com menus, toolbar vertical,
// statusbar e paleta de comandos. Executa tudo via ImageJBridge. Sem framework; DOM direto.
import { initSelectFix } from './select-fix.js';
import { buildGapMacro, buildGapBatchMacro } from '../ai/gap-assay.js';
import { MENUS, TOOLS, TOOLBAR, withImageL, flattenCommands, searchCommands } from './menus.js';
import { createBridge } from './bridge.js';
import { initDraggable } from './draggable.js';
import { getLocale, setLocale, onLocaleChange, t } from '../i18n.js';
import { isLite, setLite } from '../lite.js';
import { reportError } from '../error-handler.js';
import { initDesktop, isDesktop as isTauri, readPin } from '../desktop.js';
import { createAiPanel } from './ai-panel.js';
import { loadLiveMenus, EXT_HANDLERS } from './ij-menus.js';
import { initJavaTheme } from './java-theme.js';
import { initFitWindow } from './fit-window.js';
import { snapshot, restore, readStore, writeStore } from './positions.js';
import { createMoreTools } from './more-tools.js';
import { createFlyout, createTooltip } from './toolbar-ui.js';

const SVG = (d, s = 22, w = 2.4) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  theme: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
  grip: '<circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="16" cy="7" r="1.6" fill="currentColor"/><circle cx="8" cy="12" r="1.6" fill="currentColor"/><circle cx="16" cy="12" r="1.6" fill="currentColor"/><circle cx="8" cy="17" r="1.6" fill="currentColor"/><circle cx="16" cy="17" r="1.6" fill="currentColor"/>',
  bg: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="8" y="9" width="9" height="7" rx="1"/>',
  ov: '<rect x="3" y="4" width="18" height="16" rx="1.5" stroke-dasharray="3 2.4"/>',
};

const lab = o => (getLocale() === 'pt' ? o.pt : o.en);
const LOGO = '<svg viewBox="0 0 64 64" width="22" height="22" aria-hidden="true"><defs><radialGradient id="ilg" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".22"/></radialGradient></defs><rect width="64" height="64" rx="14" fill="#5b92ff"/><g fill="url(#ilg)" stroke="#fff" stroke-width="2.4"><circle cx="20" cy="21" r="10"/><circle cx="44" cy="25" r="9"/><circle cx="31" cy="45" r="11"/></g><g fill="#2f56b8" fill-opacity=".85"><circle cx="22" cy="19" r="3.6"/><circle cx="45" cy="24" r="3.2"/><circle cx="32" cy="44" r="4"/></g></svg>';
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
  initSelectFix();
  const bridge = createBridge();
  let menus = withImageL(MENUS);
  window.__menuHandlers = { ...window.__menuHandlers, gap: () => window.IJClass.runMacro(buildGapMacro(getLocale())), 'gap-batch': () => window.IJClass.runMacro(buildGapBatchMacro(getLocale())) /* macro com Dialog e IDs de imagem: modo normal, nao o batch/silencioso */ };
  let commands = flattenCommands(menus);
  const isDesktop = typeof window !== 'undefined' && !!window.__TAURI__;
  document.documentElement.dataset.theme = (() => { try { return localStorage.getItem('imagel.theme') || 'dark'; } catch (_) { return 'dark'; } })();
  document.body.classList.add('il-shell');

  const run = (cmd, ext) => {
    if (cmd === 'Quit') { try { window.__TAURI__?.window?.getCurrentWindow?.().close(); } catch (_) {} return null; } // Quit do Java mataria o ImageJ sem fechar a janela
    const h = ext && window.__menuHandlers && window.__menuHandlers[EXT_HANDLERS[cmd]];
    if (h) { try { return Promise.resolve(h()).catch(e => reportError(e, 'ext')); } catch (e) { reportError(e, 'ext'); return null; } }
    return bridge.run(cmd).catch(e => reportError(e, 'menu')).finally(() => window.dispatchEvent(new Event('imagel:ran')));
  };

  // ---- menus ----------------------------------------------------------------------------------------------------
  const menubar = el('nav', { class: 'il-menu', role: 'menubar' });
  let openMenu = null;
  const closeMenus = () => { if (openMenu) { openMenu.classList.remove('open'); openMenu.firstChild.setAttribute('aria-expanded', 'false'); openMenu = null; } };
  const placeSub = (li, sub) => {
    const pr = li.parentElement.getBoundingClientRect(), lr = li.getBoundingClientRect();
    const w = sub.offsetWidth, h = Math.min(sub.scrollHeight, innerHeight - 56);
    sub.style.left = Math.max(4, pr.right + w - 4 > innerWidth ? pr.left - w + 4 : pr.right - 4) + 'px';
    sub.style.top = Math.max(48, Math.min(lr.top - 5, innerHeight - h - 8)) + 'px';
  };
  const renderItems = items => {
    const ul = el('ul', { role: 'menu' });
    for (const it of items) {
      if (it === '-') { ul.appendChild(el('li', { class: 'sep', role: 'separator' })); continue; }
      if (it.sub) {
        const li = el('li', { class: 'has-sub', role: 'none' }, `<span role="menuitem" aria-haspopup="true" tabindex="-1">${esc(lab(it.sub))}<i>›</i></span>`);
        const sub = renderItems(it.items);
        li.appendChild(sub);
        li.addEventListener('mouseenter', () => placeSub(li, sub)); // submenu alto: cabe na tela (com scroll) em vez de ser cortado
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
    ovWrap = el('div', { class: 'il-mwrap il-overflow', hidden: '' });
    const ob = el('button', { class: 'il-mbtn', 'aria-label': t('menu.more'), title: t('menu.more'), 'aria-haspopup': 'true', 'aria-expanded': 'false' }, '»');
    ob.addEventListener('click', () => (openMenu === ovWrap ? closeMenus() : (closeMenus(), ovWrap.classList.add('open'), openMenu = ovWrap)));
    ovWrap.appendChild(ob);
    menubar.appendChild(ovWrap);
    fitMenus();
  };
  // Menus que nao cabem na barra vao para "⋯" (nunca somem).
  let ovWrap = null;
  const fitMenus = () => {
    if (!ovWrap) return;
    const wraps = [...menubar.children].filter(w => w !== ovWrap);
    wraps.forEach(w => { w.hidden = false; });
    ovWrap.hidden = true;
    const limit = menubar.clientWidth;
    const over = w => w.offsetLeft + w.offsetWidth > limit;
    let hiddenFrom = wraps.findIndex(over);
    if (hiddenFrom >= 0) {
      ovWrap.hidden = false;
      while (hiddenFrom > 0 && wraps[hiddenFrom - 1].offsetLeft + wraps[hiddenFrom - 1].offsetWidth + ovWrap.offsetWidth > limit) hiddenFrom--;
      wraps.forEach((w, i) => { w.hidden = i >= hiddenFrom; });
    }
    ovWrap.querySelector('ul')?.remove();
    if (hiddenFrom >= 0) ovWrap.appendChild(renderItems(menus.slice(hiddenFrom).map(m => ({ sub: m, items: m.items }))));
  };
  addEventListener('resize', () => fitMenus());
  document.addEventListener('click', e => { if (!e.target.closest('.il-mwrap')) closeMenus(); });

  // ---- topbar ---------------------------------------------------------------------------------------------------
  const top = el('header', { class: 'il-top', 'data-drag': '' });
  const logo = el('div', { class: 'il-logo', 'data-handle': '', title: t('drag.hint') }, `${LOGO}ImageL`);
  const searchBtn = el('button', { class: 'il-search', onclick: () => openPalette() }, `${SVG(ICON.search, 18)}<span data-s></span><kbd>Ctrl K</kbd>`);
  const seg = el('div', { class: 'il-seg', role: 'group' });
  const mBg = el('button', { class: 'on', onclick: () => setOverlay(false) }, `${SVG(ICON.bg, 18)}<span data-m="bg"></span>`);
  const mOv = el('button', { onclick: () => setOverlay(true) }, `${SVG(ICON.ov, 18)}<span data-m="ov"></span>`);
  seg.append(mBg, mOv);
  const liteBtn = el('button', { class: 'il-ico', onclick: () => { setLite(!isLite()); refresh(); } }, SVG(ICON.bolt, 20));
  let pinOn = isTauri() ? readPin(localStorage) : false;
  const pinBtn = el('button', { class: 'il-ico', onclick: () => {
    pinOn = !pinOn;
    window.dispatchEvent(new CustomEvent('imagel:pin', { detail: pinOn }));
    refresh();
  } }, SVG(ICON.pin, 20));
  pinBtn.hidden = !isTauri();
  const langBtn = el('button', { class: 'il-lang', onclick: () => setLocale(getLocale() === 'pt' ? 'en' : 'pt') }, `${SVG(ICON.globe, 18)}<b></b>`);
  const themeBtn = el('button', { class: 'il-ico', onclick: () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('imagel.theme', next); } catch (_) { /* ok */ }
  } }, SVG(ICON.theme, 20));
  // Janela Java original do ImageJ ("ImageJ"): fica viva (menus, status, dialogos dependem dela), mas oculta por padrao.
  const CLASSIC_KEY = 'imagel.classic';
  const classicShown = () => { try { return localStorage.getItem(CLASSIC_KEY) === '1'; } catch (_) { return false; } };
  const markClassic = () => {
    const disp = document.getElementById('cheerpjDisplay');
    if (!disp) return false;
    for (const w of disp.querySelectorAll(':scope > .cjWindow')) {
      if (w.dataset.ilClassic) return true;
      const tb = w.querySelector('.cjTitleBar');
      if (tb && tb.textContent.trim() === 'ImageJ') { w.dataset.ilClassic = '1'; return true; }
    }
    return false;
  };
  const applyClassic = () => { document.body.classList.toggle('il-hide-classic', !classicShown()); };
  applyClassic();
  new MutationObserver((_, obs) => { if (markClassic()) obs.disconnect(); }).observe(document.getElementById('cheerpjDisplay') || document.body, { childList: true, subtree: true });
  const classicBtn = el('button', { class: 'il-ico', 'aria-label': t('classic.aria'), title: t('classic.title'), onclick: () => {
    try { localStorage.setItem(CLASSIC_KEY, classicShown() ? '0' : '1'); } catch (_) {}
    applyClassic(); classicBtn.classList.toggle('on', classicShown());
  } }, SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>', 20));
  classicBtn.classList.toggle('on', classicShown());
  // O X da janela "ImageJ" encerra o ImageJ (Java quit) e nao da para reabrir: o X so esconde a janela (botao da barra reabre).
  for (const ev of ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick']) {
    document.addEventListener(ev, e => {
      const ctl = e.target.closest?.('.cjWindow[data-il-classic] .cjControls');
      if (!ctl || ctl.style.order !== '1') return; // order:1 = botao fechar (order:0 = maximizar)
      e.stopImmediatePropagation(); e.preventDefault();
      if (ev === 'click') { try { localStorage.setItem(CLASSIC_KEY, '0'); } catch (_) {} applyClassic(); classicBtn.classList.remove('on'); }
    }, true);
  }
  const ai = createAiPanel();
  const aiBtn = el('button', { class: 'il-lang', onclick: () => ai.toggle() }, '<b>IA</b>');
  // Acesso rapido: distancia entre grupos (scratch). Clique = uma imagem; Shift+clique = pasta em lote.
  const gapBtn = el('button', { class: 'il-lang il-gap', onclick: ev => (window.__menuHandlers && window.__menuHandlers[ev.shiftKey ? 'gap-batch' : 'gap'])?.() },
    SVG('<path d="M4 6c3 2 5-2 8 0s5-2 8 0"/><path d="M4 18c3-2 5 2 8 0s5 2 8 0"/><path d="M12 9v6M10 11l2-2 2 2M10 13l2 2 2-2"/>', 20));
  const spacer = el('div', { class: 'il-spacer' });
  top.append(logo, menubar, spacer, searchBtn, seg, gapBtn, aiBtn, classicBtn, liteBtn, pinBtn, langBtn, themeBtn);

  // ---- toolbar --------------------------------------------------------------------------------------------------
  const tools = el('aside', { class: 'il-tools', 'data-drag': '', 'aria-label': t('tools.label') });
  tools.appendChild(el('div', { class: 'il-grip', 'data-handle': '', title: t('drag.hint') }, SVG(ICON.grip, 18)));
  const toolBtns = new Map();
  const toolById = new Map(TOOLS.filter(x => x !== '-').map(x => [x.id, x]));
  const tip = createTooltip();
  tip.attach(gapBtn, () => t('gap.tip'));
  const fly = createFlyout();
  // Fila: selecao e opcoes (duplo clique) nunca chamam o Java ao mesmo tempo.
  let toolQueue = Promise.resolve();
  const select = (id, btn) => (toolQueue = toolQueue.then(() => bridge.setTool(toolById.get(id)?.ij ?? id)).then(() => {
    toolBtns.forEach(x => x.classList.remove('active')); btn.classList.add('active');
  }).catch(e => reportError(e, 'tool')));
  const tipText = tl => `${lab(tl)}${tl.key ? '  [' + tl.key + ']' : ''}`;
  // Duplo clique = opcoes da ferramenta, exatamente como na toolbar do ImageJ: reenvia um duplo clique a Toolbar Java
  // (Rounded Rect/Roi Defaults, pincel de selecao, Line Width/Arrow, Angle, Point, Wand, Fonts, Color Picker, lupa = unzoom,
  // ferramentas de macro = "... Options"). Posicao do botao: 12 ferramentas fixas, depois um vao, depois as de macro (id 15+).
  const SLOT = { rectangle: 0, roundrect: 0, rotrect: 0, oval: 1, ellipse: 1, brush: 1, polygon: 2, freehand: 3, line: 4, polyline: 4, freeline: 4, arrow: 4, angle: 5, point: 6, multipoint: 6, wand: 7, text: 8, zoom: 9, hand: 10, dropper: 11 };
  const toolOptions = id => (toolQueue = toolQueue.then(async () => {
    try {
      const tl = toolById.get(id);
      const slot = tl && tl.ij >= 15 ? 12 + (tl.ij - 15) : SLOT[id];
      if (slot == null || !window.lib) return;
      const T = await window.lib.ij.gui.Toolbar, tb = await T.getInstance();
      const bw = Number(await T.getButtonSize()), w = Number(await (await tb.getSize()).width);
      const x = slot * bw + (bw >> 1) + (slot >= 12 ? Math.max(0, w - 20 * bw) : 0), y = bw >> 1;
      const ME = await window.lib.java.awt.event.MouseEvent;
      const mk = kind => new ME(tb, kind, Date.now(), 0, x, y, 1, false);
      await tb.mousePressed(await mk(501)); await tb.mouseReleased(await mk(502));
      Promise.resolve(tb.mousePressed(await mk(501))).then(async () => tb.mouseReleased(await mk(502))).then(syncTool).catch(() => {}); // dialogo modal: nao bloquear a UI
    } catch (e) { reportError(e, 'tool'); }
  }));
  // Destaque segue a ferramenta ativa no ImageJ (mudada por macro, atalho de teclado ou pela toolbar antiga).
  const groupSet = new Map();
  const syncTool = async () => {
    try {
      if (!window.lib) return;
      const name = String(await (await window.lib.ij.gui.Toolbar).getToolName());
      const tl = toolById.get(name) || [...toolById.values()].find(x => x.id.toLowerCase().startsWith(name.toLowerCase()));
      if (!tl) return;
      groupSet.get(tl.id)?.(tl);
      const b = [...toolBtns.values()].find(x => x.dataset.tool === tl.id);
      if (b) { toolBtns.forEach(x => x.classList.remove('active')); b.classList.add('active'); }
    } catch (_) { /* ImageJ ocupado: tenta na proxima */ }
  };
  document.addEventListener('pointerup', e => { if (e.target.closest?.('.cjWindow[data-il-classic]')) setTimeout(syncTool, 150); }, true);
  // Ferramenta de texto: no CheerpJ, Ctrl+letra chega ao ImageJ como a propria letra, e com um texto em edicao o ImageJ a
  // digita em vez de executar o atalho (Ctrl+D = desenhar, Ctrl+B = overlay, Ctrl+Z...). Aqui o atalho e resolvido pela
  // tabela do proprio ImageJ (Menus.getShortcuts) e executado como comando; a tecla nao chega ao texto.
  document.addEventListener('keydown', e => {
    if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || !/^[a-z]$/i.test(e.key)) return;
    if (document.querySelector('.il-tool.active')?.dataset.tool !== 'text') return;
    if (!e.target.closest?.('#cheerpjDisplay, .cjWindow') && e.target.tagName !== 'TEXTAREA') return;
    if (e.target.closest?.('.il-pal, .il-ai')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const code = e.key.toUpperCase().charCodeAt(0);
    toolQueue = toolQueue.then(async () => {
      try {
        const table = await (await window.lib.ij.Menus).getShortcuts();
        const cmd = await table.get(await (await window.lib.java.lang.Integer).valueOf(code));
        if (cmd) await bridge.run(String(cmd));
      } catch (err) { reportError(err, 'atalho'); }
    });
  }, true);
  document.addEventListener('keyup', e => { if (!e.ctrlKey && !e.altKey && e.key.length === 1 && e.target.closest?.('#cheerpjDisplay, .cjWindow, textarea')) setTimeout(syncTool, 150); }, true);
  window.addEventListener('imagel:ran', () => syncTool());
  window.addEventListener('imagel:ready', () => setTimeout(syncTool, 500));
  for (const entry of TOOLBAR) {
    if (entry === '-') { tools.appendChild(el('hr')); continue; }
    if (typeof entry === 'string') {
      const tl = toolById.get(entry);
      const b = el('button', { class: 'il-tool', 'data-tool': tl.id, 'aria-label': lab(tl) }, SVG(tl.icon, 30, 1.8));
      b.addEventListener('click', () => select(tl.id, b));
      b.addEventListener('dblclick', () => toolOptions(tl.id));
      tip.attach(b, () => tipText(tl));
      toolBtns.set(tl.id, b);
      tools.appendChild(b);
      continue;
    }
    // grupo: mostra a ultima ferramenta usada; clicar de novo (ou botao direito) abre o flyout com as demais
    const list = entry.group.map(id => toolById.get(id));
    let cur = list[0];
    const b = el('button', { class: 'il-tool il-group', 'aria-haspopup': 'true', 'aria-label': lab(cur) }, SVG(cur.icon, 30, 1.8));
    const paint = () => { b.innerHTML = SVG(cur.icon, 30, 1.8); b.setAttribute('aria-label', lab(cur)); b.dataset.tool = cur.id; };
    const openFly = () => fly.open(b, list.map(tl => ({
      icon: SVG(tl.icon, 22, 1.8), label: tipText(tl),
      run: () => { cur = tl; paint(); toolBtns.set(entry.group.join('|'), b); select(tl.id, b); },
    })));
    b.dataset.tool = cur.id;
    // clique = seleciona; clicar de novo (sem ser duplo clique) ou botao direito = demais ferramentas; duplo clique = opcoes
    let lastClick = 0;
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      const now = Date.now(), quick = now - lastClick <= 650; lastClick = now;
      if (b.classList.contains('active') && !quick) openFly(); else if (!b.classList.contains('active')) select(cur.id, b);
    });
    b.addEventListener('dblclick', () => { fly.close(); toolOptions(cur.id); });
    for (const tl of list) groupSet.set(tl.id, x => { cur = x; paint(); });
    b.addEventListener('contextmenu', ev => { ev.preventDefault(); openFly(); });
    tip.attach(b, () => tipText(cur));
    toolBtns.set(entry.group.join('|'), b);
    tools.appendChild(b);
  }

  // ---- more tools (equivale ao » da barra Java) ------------------------------------------------------------------
  const base = location.pathname.replace(/[^/]*$/, '');
  const more = createMoreTools({ anchor: () => moreBtn, bridge, base, extras: [{ label: t('dev.menu'), run: () => select('Developer Menu Built-in Tool', moreBtn) }] });
  const moreBtn = el('button', { class: 'il-tool il-moretools', 'aria-label': t('tools.more'), onclick: ev => { ev.stopPropagation(); more.toggle(); } },
    SVG('<path d="M6 6l6 6-6 6M13 6l6 6-6 6"/>', 30, 1.8));
  tip.attach(moreBtn, () => 'More tools');
  tools.appendChild(moreBtn);
  document.addEventListener('click', e => { if (!e.target.closest('.il-more')) more.close(); });

  // ---- orientacao da toolbar: horizontal por padrao; auto-vertical em tela estreita e alta; botao alterna -----------
  const ORIENT_KEY = 'imagel.orient';
  const store = { get: () => { try { return localStorage.getItem(ORIENT_KEY); } catch (_) { return null; } }, set: v => { try { localStorage.setItem(ORIENT_KEY, v); } catch (_) {} } };
  const autoOrient = () => (innerHeight < 640 && innerWidth >= 900 ? 'h' : 'v'); // vertical (como o mockup); horizontal so em telas baixas
  const applyOrient = () => { document.body.dataset.orient = store.get() || autoOrient(); placeTools(); };
  // Horizontal (fora do "Sem fundo"): desativado o modo inline: a toolbar horizontal fica numa linha propria abaixo dos menus.
  function placeTools() {
    const inline = document.body.dataset.orient === 'h' && !document.body.classList.contains('ov') && false; // horizontal: sempre abaixo da barra de menus (cabe em monitores menores)
    tools.classList.toggle('inline', inline);
    document.body.classList.toggle('il-inline', inline);
    if (inline) { if (tools.parentNode !== top) top.insertBefore(tools, spacer); } else if (top.isConnected) top.after(tools);
    fitMenus();
  }
  new MutationObserver(placeTools).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const orientBtn = el('button', { class: 'il-tool il-orient', 'aria-label': t('orient.label'), onclick: () => {
    store.set(document.body.dataset.orient === 'h' ? 'v' : 'h'); applyOrient();
  }, ondblclick: () => { try { localStorage.removeItem(ORIENT_KEY); } catch (_) {} applyOrient(); } },
    SVG('<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="13" width="7" height="7" rx="1.5"/>', 26, 1.8));
  tip.attach(orientBtn, () => t('orient.tip'));
  tools.querySelector(".il-grip").after(orientBtn, el("hr"));
  applyOrient();
  addEventListener('resize', () => { if (!store.get()) applyOrient(); else placeTools(); });

  // ---- statusbar ------------------------------------------------------------------------------------------------
  const status = el('footer', { class: 'il-status', 'data-drag': '' });
  const sReady = el('span', { class: 'il-ready' });
  const sMem = el('span');
  const sLite = el('span');
  status.append(sReady, el('div', { class: 'il-spacer' }), sLite, sMem);

  // ---- paleta de comandos ---------------------------------------------------------------------------------------
  const pal = el('div', { class: 'il-pal', hidden: '' });
  const palBox = el('div', { class: 'il-palbox', role: 'dialog', 'aria-modal': 'true' });
  const palIn = el('input', { type: 'text', 'aria-label': t('palette.label'), autocomplete: 'off' });
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
  // Tab abre a paleta onde o mouse esta (so sobre area vazia/shell: sobre janelas Java o Tab continua sendo do ImageJ).
  const mouse = { x: innerWidth / 2, y: innerHeight / 3 };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  function placePalette(at) {
    pal.classList.toggle('at', !!at);
    palBox.style.left = palBox.style.top = '';
    if (!at) return;
    const w = palBox.offsetWidth, h = palBox.offsetHeight;
    palBox.style.left = Math.max(8, Math.min(at.x - w / 2, innerWidth - w - 8)) + 'px';
    palBox.style.top = Math.max(8, Math.min(at.y - 24, innerHeight - h - 8)) + 'px';
  }
  function openPalette(at) { pal.hidden = false; palIn.value = ''; palSel = 0; renderPal(); placePalette(at); palIn.focus(); }
  const onBlank = () => {
    const t = document.elementFromPoint(mouse.x, mouse.y);
    return !t || !t.closest('.cjWindow, .il-menu, .il-pal, input, textarea, select, [contenteditable]') || t.id === 'cheerpjDisplay';
  };
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

  // Captura (antes do CheerpJ): o textarea dele engole o Tab no bubbling.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    const open = !pal.hidden;
    if (open ? e.target !== palIn : !(onBlank() && !e.target.closest?.('input, select, [contenteditable]'))) return;
    e.preventDefault(); e.stopPropagation();
    open ? closePalette() : openPalette({ x: mouse.x, y: mouse.y });
  }, true);

  // ---- modo "Sem fundo" (desktop) --------------------------------------------------------------------------------
  function setOverlay(on) {
    // Cada modo lembra onde as barras e janelas foram deixadas: guarda as posicoes do modo que sai e restaura as do que entra.
    const bars = { top, tools, status };
    const display = document.getElementById('cheerpjDisplay');
    const barsNow = on ? { top, tools } : bars; // sem fundo: o status fica dentro do painel de topo
    const was = document.body.classList.contains('ov') ? 'ov' : 'bg';
    const now = on ? 'ov' : 'bg';
    if (was !== now) {
      const st = readStore(localStorage); st[was] = snapshot(bars, display); writeStore(localStorage, st);
    }
    for (const n of [top, tools, status]) for (const k of ['left', 'top', 'right', 'bottom', 'transform']) n.style[k] = '';
    if (on) top.append(status); else document.body.append(status);
    const back = () => restore(readStore(localStorage)[now], barsNow, display, innerWidth, innerHeight);
    back(); // posicao salva ANTES de trocar a classe: nunca aparece na posicao padrao
    document.body.classList.toggle('ov', on);
    mOv.classList.toggle('on', on);
    pinBtn.disabled = !on;
    mBg.classList.toggle('on', !on);
    window.dispatchEvent(new CustomEvent('imagel:overlay', { detail: on })); // o shell Tauri liga click-through/transparencia
    // a janela nativa muda de tamanho de forma assincrona: restaura depois do novo layout (e de novo, por seguranca)
    // ja no mesmo quadro: sem o salto pela posicao padrao (parecia a aba recriada)
    setTimeout(back, 150); setTimeout(back, 700);
  }
  window.addEventListener('pagehide', () => {
    const st = readStore(localStorage); st[document.body.classList.contains('ov') ? 'ov' : 'bg'] = snapshot({ top, tools, ...(document.body.classList.contains('ov') ? {} : { status }) }, document.getElementById('cheerpjDisplay')); writeStore(localStorage, st);
  });

  // ---- textos dependentes de idioma/estado ----------------------------------------------------------------------
  function refresh() {
    searchBtn.querySelector('[data-s]').textContent = t('search.placeholder');
    mBg.querySelector('span').textContent = t('mode.bg');
    mOv.querySelector('span').textContent = t('mode.overlay');
    mBg.title = t('mode.bg.title'); mOv.title = t('mode.overlay.title');
    langBtn.querySelector('b').textContent = getLocale().toUpperCase();
    langBtn.title = t('lang.toggle'); themeBtn.title = t('theme.toggle');
    for (const [b, k] of [[langBtn, 'lang.toggle'], [themeBtn, 'theme.toggle'], [liteBtn, null], [aiBtn, 'panel.ai']]) b.setAttribute('aria-label', k ? t(k) : t('lite.label'));
    toolBtns.forEach((b, id) => { const tl = toolById.get(id); if (tl) b.setAttribute('aria-label', lab(tl)); });
    liteBtn.title = t('lite.label') + (isLite() ? ': ON' : ': OFF');
    classicBtn.title = t('classic.title'); classicBtn.setAttribute('aria-label', t('classic.aria'));
    tools.setAttribute('aria-label', t('tools.label')); moreBtn.setAttribute('aria-label', t('tools.more')); orientBtn.setAttribute('aria-label', t('orient.label'));
    palIn.setAttribute('aria-label', t('palette.label')); gapBtn.setAttribute('aria-label', t('gap.tip'));
    liteBtn.classList.toggle('on', isLite());
    pinBtn.title = t('pin.title') + (pinOn ? ': ON' : ': OFF'); pinBtn.setAttribute('aria-label', pinBtn.title);
    pinBtn.classList.toggle('on', pinOn); pinBtn.disabled = !document.body.classList.contains('ov');
    sReady.textContent = bridge.ready() ? t('status.ready') : t('load.runtime');
    sLite.textContent = isLite() ? 'LITE' : '';
    buildMenus();
    renderPal();
  }
  onLocaleChange(refresh);
  // Menus reais do ImageJ (completos, com plugins e Extensions) quando ele estiver pronto; falha -> lista padrao.
  window.addEventListener('imagel:ready', async () => {
    try { menus = withImageL(await loadLiveMenus(window.IJClass)); commands = flattenCommands(menus); refresh(); }
    catch (e) { reportError('Menus do ImageJ indisponiveis, usando lista padrao: ' + (e.message || e), 'menus'); }
  });

  const memTick = () => {
    const m = performance.memory;
    sMem.textContent = !isLite() && m ? `${t('status.memory')} ${Math.round(m.usedJSHeapSize / 1048576)} MB` : '';
    sReady.textContent = bridge.ready() ? t('status.ready') : t('load.runtime');
  };
  setInterval(memTick, isLite() ? 10000 : 4000);

  document.body.append(top, more.el, status, pal);
  placeTools();
  initDraggable({ enabled: () => document.body.classList.contains('ov') });
  refresh();
  memTick();
  initJavaTheme(bridge);
  initFitWindow(bridge);
  initDesktop(); // no-op na web; no Tauri liga overlay/click-through
  return { bridge, setOverlay, openPalette };
}
