import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAP_MACRO } from '../src/ai/gap-assay.js';
import { checkMacro } from '../src/ai/agent.js';
import { IMAGEL_MENU, withImageL, MENUS, flattenCommands } from '../src/ui/menus.js';

test('macro de lacuna passa no validador de seguranca e e somente leitura da imagem original', () => {
  const r = checkMacro(GAP_MACRO);
  assert.equal(r.blocked?.length ?? 0, 0);
  assert.match(GAP_MACRO, /Dialog\.create/);
  assert.match(GAP_MACRO, /Duplicate\.\.\./);
  assert.doesNotMatch(GAP_MACRO, /\brun\s*=/); // "run" e funcao embutida do ImageJ
});

test('menu ImageL e anexado sem duplicar e entra na paleta', () => {
  const ms = withImageL(withImageL(MENUS));
  assert.equal(ms.filter(m => m.id === 'imagel').length, 1);
  assert.ok(flattenCommands(ms).some(c => c.cmd === IMAGEL_MENU.items[0].cmd));
});
