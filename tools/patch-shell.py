# Aplica (uma vez) as mudancas: menus reais no shell, evento imagel:ready e ferramentas/icones no formato do ImageJ.
import re, io

def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)

# ---- boot.js: evento de pronto
b = rd('src/boot.js')
if "imagel:ready" not in b:
    b = b.replace("        splash.done();", "        window.dispatchEvent(new Event('imagel:ready'));\n        splash.done();")
    wr('src/boot.js', b)

# ---- shell.js: menus vivos
sh = rd('src/ui/shell.js')
if 'loadLiveMenus' not in sh:
    sh = sh.replace("import { createAiPanel } from './ai-panel.js';", "import { createAiPanel } from './ai-panel.js';\nimport { loadLiveMenus, EXT_HANDLERS } from './ij-menus.js';")
    sh = sh.replace("  const commands = flattenCommands();", "  let menus = MENUS;\n  let commands = flattenCommands(menus);")
    sh = sh.replace("  const run = (cmd) => bridge.run(cmd).catch(e => reportError(e, 'menu'));",
"""  const run = (cmd, ext) => {
    const h = ext && window.__menuHandlers && window.__menuHandlers[EXT_HANDLERS[cmd]];
    if (h) { try { return Promise.resolve(h()).catch(e => reportError(e, 'ext')); } catch (e) { reportError(e, 'ext'); return null; } }
    return bridge.run(cmd).catch(e => reportError(e, 'menu'));
  };""")
    sh = sh.replace("li.firstChild.addEventListener('click', () => { closeMenus(); run(it.cmd); });", "li.firstChild.addEventListener('click', () => { closeMenus(); run(it.cmd, it.ext); });")
    sh = sh.replace("    for (const m of MENUS) {\n      const wrap", "    for (const m of menus) {\n      const wrap")
    sh = sh.replace("if (c) run(c.cmd); };", "if (c) run(c.cmd, c.ext); };")
    sh = sh.replace("  onLocaleChange(refresh);",
"""  onLocaleChange(refresh);
  // Menus reais do ImageJ (completos, com plugins e Extensions) quando ele estiver pronto; falha -> lista padrao.
  window.addEventListener('imagel:ready', async () => {
    try { menus = await loadLiveMenus(window.IJClass); commands = flattenCommands(menus); refresh(); }
    catch (e) { reportError('Menus do ImageJ indisponiveis, usando lista padrao: ' + (e.message || e), 'menus'); }
  });""")
    wr('src/ui/shell.js', sh)

# ---- menus.js: ferramentas na MESMA ordem/forma da barra original do ImageJ, icones atualizados (traco grosso)
m = rd('src/ui/menus.js')
a = m.index('export const TOOLS = [')
b2 = m.index('];', a) + 2
tools = '''export const TOOLS = [
  { id: 'rectangle', en: 'Rectangle', pt: 'Retângulo', key: 'R', icon: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>' },
  { id: 'oval', en: 'Oval', pt: 'Oval', icon: '<ellipse cx="12" cy="12" rx="8.5" ry="6"/>' },
  { id: 'polygon', en: 'Polygon', pt: 'Polígono', icon: '<path d="M4 17l3-10 9-2 4 8-4 6z"/>' },
  { id: 'freehand', en: 'Freehand', pt: 'Mão livre', icon: '<path d="M6 9c2-4 8-5 11-2 3 3 1 7-3 8-3 1-4 3-7 2-3-1-4-5-1-8z"/>' },
  { id: 'line', en: 'Straight line', pt: 'Linha reta', icon: '<path d="M5 19L19 5"/><path d="M4 21l2-2M18 7l2-2" opacity=".0"/>' },
  { id: 'angle', en: 'Angle', pt: 'Ângulo', icon: '<path d="M5 19h14M5 19L16 6"/><path d="M11 19a6 6 0 00-1.6-4"/>' },
  { id: 'point', en: 'Point', pt: 'Ponto', icon: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>' },
  { id: 'wand', en: 'Wand', pt: 'Varinha', icon: '<path d="M5 19L15 9"/><path d="M17 3v4M15 5h4M20 11v3M18.5 12.5h3"/>' },
  { id: 'text', en: 'Text', pt: 'Texto', icon: '<path d="M6 19L12 5l6 14M8.5 14h7"/>' },
  { id: 'zoom', en: 'Magnifier', pt: 'Lupa', icon: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>' },
  { id: 'hand', en: 'Hand', pt: 'Mão', icon: '<path d="M8 12V5.5a1.5 1.5 0 013 0V11M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6 7-3 0-4.5-2-6-4.5l-1.3-2.3a1.5 1.5 0 012.6-1.4L8 14"/>' },
  { id: 'dropper', en: 'Color picker', pt: 'Conta-gotas', icon: '<path d="M14 7l3-3a2.1 2.1 0 013 3l-3 3M14 7l3 3M14 7L5 16l-1 4 4-1 9-9"/>' },
  '-',
  { id: 'polyline', en: 'Segmented line', pt: 'Linha segmentada', icon: '<path d="M4 18l5-8 5 5 6-10"/>' },
  { id: 'multipoint', en: 'Multi-point', pt: 'Multiponto', icon: '<circle cx="6" cy="7" r="2" fill="currentColor"/><circle cx="17" cy="9" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/>' },
  { id: 'brush', en: 'Paintbrush', pt: 'Pincel', icon: '<path d="M20 4l-9 9M9 13c-3 0-4 2-4 4 0 1-1 2-2 2 3 1 8 1 8-4z"/>' },
  { id: 'arrow', en: 'Arrow', pt: 'Seta', icon: '<path d="M5 19L19 5M10 5h9v9"/>' },
];'''
m = m[:a] + tools + m[b2:]
wr('src/ui/menus.js', m)
print('ok')
