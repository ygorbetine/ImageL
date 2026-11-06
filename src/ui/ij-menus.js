// Le a arvore de menus REAL do ImageJ (Frame.getMenuBar) para a casca ficar sempre completa: inclui menus de
// plugins instalados e o menu "Extensions". Aceita qualquer objeto com a API do AWT (testavel com fakes).
// Rotulos em PT vem do dicionario estatico (MENUS); o que nao estiver la fica no original (ingles).
import { MENUS } from './menus.js';

// Itens do menu Extensions sao tratados por handlers JS (ver boot.js), nao por run("...").
export const EXT_HANDLERS = { 'Connect to Hypha MCP...': 'mcp', 'Test ROI ↔ GeoJSON': 'roi-test', 'Cellpose…': 'cellpose' };

function ptDictionary() {
  const d = new Map();
  const walk = items => {
    for (const it of items) {
      if (it === '-') continue;
      if (it.sub) { d.set('sub:' + it.sub.en, it.sub.pt); walk(it.items); } else d.set(it.cmd, it.pt);
    }
  };
  for (const m of MENUS) { d.set('top:' + m.en, m.pt); walk(m.items); }
  return d;
}

const call = async (o, name, ...a) => (typeof o[name] === 'function' ? o[name](...a) : undefined);

async function readItems(menu, pt, ext, depth) {
  const n = Number(await call(menu, 'getItemCount')) || 0;
  const items = [];
  for (let i = 0; i < n; i++) {
    const it = await menu.getItem(i);
    const label = String(await it.getLabel());
    if (label === '-') { if (items.length && items[items.length - 1] !== '-') items.push('-'); continue; }
    if (typeof it.getItemCount === 'function' && depth < 4) {
      const sub = await readItems(it, pt, ext, depth + 1);
      items.push({ sub: { en: label, pt: pt.get('sub:' + label) || label }, items: sub });
    } else {
      items.push({ cmd: label, en: label, pt: pt.get(label) || label, ext });
    }
  }
  while (items.length && items[items.length - 1] === '-') items.pop();
  return items;
}

/** menuBar: java.awt.MenuBar (proxy CheerpJ ou fake). Retorna [{id,en,pt,items}] no mesmo formato de MENUS. */
export async function readImageJMenus(menuBar) {
  const pt = ptDictionary();
  const n = Number(await menuBar.getMenuCount());
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = await menuBar.getMenu(i);
    const label = String(await m.getLabel());
    const ext = label === 'Extensions';
    out.push({ id: label.toLowerCase().replace(/\W+/g, '-'), en: label, pt: pt.get('top:' + label) || label, items: await readItems(m, pt, ext, 0) });
  }
  return out;
}

export async function loadLiveMenus(IJClass) {
  const ij = await IJClass.getInstance();
  const bar = await ij.getMenuBar();
  const menus = await readImageJMenus(bar);
  if (!menus.length) throw new Error('menu do ImageJ vazio');
  return menus;
}
