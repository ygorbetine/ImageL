import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readImageJMenus } from '../src/ui/ij-menus.js';

const item = label => ({ getLabel: async () => label });
const menu = (label, kids) => ({ getLabel: async () => label, getItemCount: async () => kids.length, getItem: async i => kids[i] });
const bar = kids => ({ getMenuCount: async () => kids.length, getMenu: async i => kids[i] });

test('le menus, submenus, separadores e marca Extensions', async () => {
  const mb = bar([
    menu('File', [item('Open...'), item('-'), menu('Save As', [item('Tiff...')]), item('-')]),
    menu('Plugins', [item('MeuPlugin')]),
    menu('Extensions', [item('Cellpose…')]),
  ]);
  const out = await readImageJMenus(mb);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0].items.map(i => (i === '-' ? '-' : i.cmd || i.sub.en)), ['Open...', '-', 'Save As']);
  assert.equal(out[0].pt, 'Arquivo');
  assert.equal(out[0].items[0].pt, 'Abrir…');
  assert.equal(out[1].items[0].pt, 'MeuPlugin');
  assert.equal(out[2].items[0].ext, true);
});
