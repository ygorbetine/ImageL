// Arvore de menus padrao do ImageJ, com rotulos PT/EN. `cmd` e SEMPRE o nome original em ingles
// (e o que o ImageJ espera em run("...")), entao macros continuam validas em qualquer idioma da UI.
// Itens: [cmd, en, pt, atalho?]   Submenu: { sub: [en, pt], items: [...] }   Separador: '-'

const I = (cmd, en, pt, key) => ({ cmd, en, pt, key });
const S = (en, pt, items) => ({ sub: { en, pt }, items });

export const MENUS = [
  { id: 'file', en: 'File', pt: 'Arquivo', items: [
    S('New', 'Novo', [I('Image...', 'Image…', 'Imagem…', 'Ctrl+N')]),
    I('Open...', 'Open…', 'Abrir…', 'Ctrl+O'),
    I('Close', 'Close', 'Fechar', 'Ctrl+W'),
    I('Close All', 'Close All', 'Fechar tudo'),
    '-',
    I('Save', 'Save', 'Salvar', 'Ctrl+S'),
    S('Save As', 'Salvar como', [
      I('Tiff...', 'TIFF…', 'TIFF…'), I('Jpeg...', 'JPEG…', 'JPEG…'), I('PNG...', 'PNG…', 'PNG…'), I('Gif...', 'GIF…', 'GIF…'),
    ]),
    I('Revert', 'Revert', 'Reverter', 'Ctrl+R'),
  ] },
  { id: 'edit', en: 'Edit', pt: 'Editar', items: [
    I('Undo', 'Undo', 'Desfazer', 'Ctrl+Z'),
    '-',
    I('Cut', 'Cut', 'Recortar', 'Ctrl+X'), I('Copy', 'Copy', 'Copiar', 'Ctrl+C'), I('Paste', 'Paste', 'Colar', 'Ctrl+V'),
    '-',
    I('Clear', 'Clear', 'Limpar'), I('Fill', 'Fill', 'Preencher', 'Ctrl+F'), I('Draw', 'Draw', 'Desenhar', 'Ctrl+D'), I('Invert', 'Invert', 'Inverter', 'Ctrl+Shift+I'),
    S('Selection', 'Seleção', [
      I('Select All', 'Select All', 'Selecionar tudo', 'Ctrl+A'), I('Select None', 'Select None', 'Selecionar nada', 'Ctrl+Shift+A'),
    ]),
    S('Options', 'Opções', [
      I('Colors...', 'Colors…', 'Cores…'), I('Line Width...', 'Line Width…', 'Espessura da linha…'),
      I('Appearance...', 'Appearance…', 'Aparência…'), I('Conversions...', 'Conversions…', 'Conversões…'),
    ]),
  ] },
  { id: 'image', en: 'Image', pt: 'Imagem', items: [
    S('Type', 'Tipo', [
      I('8-bit', '8-bit', '8 bits'), I('16-bit', '16-bit', '16 bits'), I('32-bit', '32-bit', '32 bits'), I('RGB Color', 'RGB Color', 'Cor RGB'),
    ]),
    S('Adjust', 'Ajustar', [
      I('Brightness/Contrast...', 'Brightness/Contrast…', 'Brilho/Contraste…', 'Ctrl+Shift+C'),
      I('Threshold...', 'Threshold…', 'Limiar…', 'Ctrl+Shift+T'), I('Color Balance...', 'Color Balance…', 'Balanço de cor…'),
    ]),
    I('Properties...', 'Properties…', 'Propriedades…', 'Ctrl+Shift+P'),
    S('Color', 'Cor', [I('Split Channels', 'Split Channels', 'Separar canais'), I('Merge Channels...', 'Merge Channels…', 'Mesclar canais…')]),
    S('Stacks', 'Pilhas', [I('Images to Stack', 'Images to Stack', 'Imagens para pilha'), I('Z Project...', 'Z Project…', 'Projeção Z…')]),
    '-',
    I('Crop', 'Crop', 'Cortar', 'Ctrl+Shift+X'), I('Duplicate...', 'Duplicate…', 'Duplicar…', 'Ctrl+Shift+D'), I('Scale...', 'Scale…', 'Escala…', 'E'),
    S('Transform', 'Transformar', [
      I('Flip Horizontally', 'Flip Horizontally', 'Espelhar horizontalmente'), I('Flip Vertically', 'Flip Vertically', 'Espelhar verticalmente'),
      I('Rotate 90 Degrees Right', 'Rotate 90° Right', 'Girar 90° à direita'), I('Rotate 90 Degrees Left', 'Rotate 90° Left', 'Girar 90° à esquerda'),
    ]),
    S('Zoom', 'Zoom', [
      I('In [+]', 'In', 'Aproximar', '+'), I('Out [-]', 'Out', 'Afastar', '-'), I('Original Scale', 'Original Scale', 'Escala original'), I('View 100%', 'View 100%', 'Ver 100%', '5'),
    ]),
  ] },
  { id: 'process', en: 'Process', pt: 'Processar', items: [
    I('Smooth', 'Smooth', 'Suavizar', 'Ctrl+Shift+S'), I('Sharpen', 'Sharpen', 'Aguçar'), I('Find Edges', 'Find Edges', 'Detectar bordas'),
    I('Enhance Contrast...', 'Enhance Contrast…', 'Realçar contraste…'),
    S('Filters', 'Filtros', [
      I('Gaussian Blur...', 'Gaussian Blur…', 'Desfoque gaussiano…'), I('Median...', 'Median…', 'Mediana…'),
      I('Unsharp Mask...', 'Unsharp Mask…', 'Máscara de nitidez…'), I('Mean...', 'Mean…', 'Média…'),
    ]),
    S('Noise', 'Ruído', [I('Add Noise', 'Add Noise', 'Adicionar ruído'), I('Despeckle', 'Despeckle', 'Remover manchas')]),
    S('Background', 'Fundo', [I('Subtract Background...', 'Subtract Background…', 'Subtrair fundo…')]),
    S('Binary', 'Binário', [
      I('Make Binary', 'Make Binary', 'Tornar binária'), I('Convert to Mask', 'Convert to Mask', 'Converter em máscara'),
      I('Erode', 'Erode', 'Erodir'), I('Dilate', 'Dilate', 'Dilatar'), I('Fill Holes', 'Fill Holes', 'Preencher buracos'), I('Watershed', 'Watershed', 'Watershed'),
    ]),
    S('FFT', 'FFT', [I('FFT', 'FFT', 'FFT')]),
    I('Image Calculator...', 'Image Calculator…', 'Calculadora de imagens…'),
  ] },
  { id: 'analyze', en: 'Analyze', pt: 'Analisar', items: [
    I('Measure', 'Measure', 'Medir', 'Ctrl+M'), I('Analyze Particles...', 'Analyze Particles…', 'Analisar partículas…'),
    I('Summarize', 'Summarize', 'Resumir'), I('Histogram', 'Histogram', 'Histograma', 'Ctrl+H'),
    I('Plot Profile', 'Plot Profile', 'Perfil de intensidade', 'Ctrl+K'),
    '-',
    I('Set Measurements...', 'Set Measurements…', 'Definir medições…'), I('Set Scale...', 'Set Scale…', 'Definir escala…'), I('Calibrate...', 'Calibrate…', 'Calibrar…'),
    S('Tools', 'Ferramentas', [I('ROI Manager...', 'ROI Manager…', 'Gerenciador de ROIs…'), I('Calibration Bar...', 'Calibration Bar…', 'Barra de calibração…')]),
  ] },
  { id: 'plugins', en: 'Plugins', pt: 'Plugins', items: [
    S('Macros', 'Macros', [I('Record...', 'Record…', 'Gravar…')]),
    S('Utilities', 'Utilitários', [I('Console', 'Console', 'Console')]),
  ] },
  { id: 'window', en: 'Window', pt: 'Janela', items: [
    I('Tile', 'Tile', 'Lado a lado'), I('Cascade', 'Cascade', 'Em cascata'), I('Close All', 'Close All', 'Fechar tudo'),
  ] },
  { id: 'help', en: 'Help', pt: 'Ajuda', items: [I('About ImageJ...', 'About ImageJ…', 'Sobre o ImageJ…')] },
];

/** Ferramentas da toolbar: id = nome aceito por setTool(), icone = path SVG (traco grosso). */
export const TOOLS = [
  { id: 'rectangle', en: 'Rectangle', pt: 'Retângulo', key: 'R', icon: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>' },
  { id: 'oval', en: 'Oval', pt: 'Oval', icon: '<ellipse cx="12" cy="12" rx="8.5" ry="6"/>' },
  { id: 'polygon', en: 'Polygon', pt: 'Polígono', icon: '<path d="M4 17l3-10 9-2 4 8-4 6z"/>' },
  { id: 'freehand', en: 'Freehand', pt: 'Mão livre', icon: '<path d="M6 9c2-4 8-5 11-2 3 3 1 7-3 8-3 1-4 3-7 2-3-1-4-5-1-8z"/>' },
  { id: 'line', en: 'Straight line', pt: 'Linha reta', icon: '<path d="M5 19L19 5"/><path d="M4 21l2-2M18 7l2-2" opacity=".0"/>' },
  { id: 'angle', en: 'Angle', pt: 'Ângulo', icon: '<path d="M4 19H20M4 19L14 4"/><path d="M13 19A9 9 0 0 0 9.5 11.6"/><circle cx="4" cy="19" r="1.2" fill="currentColor"/>' },
  { id: 'point', en: 'Point', pt: 'Ponto', icon: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>' },
  { id: 'wand', en: 'Wand', pt: 'Varinha', icon: '<path d="M5 19L15 9"/><path d="M17 3v4M15 5h4M20 11v3M18.5 12.5h3"/>' },
  { id: 'text', en: 'Text', pt: 'Texto', icon: '<path d="M6 19L12 5l6 14M8.5 14h7"/>' },
  { id: 'zoom', en: 'Magnifier', pt: 'Lupa', icon: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>' },
  { id: 'hand', en: 'Hand', pt: 'Mão', icon: '<path d="M8 12V5.5a1.5 1.5 0 013 0V11M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6 7-3 0-4.5-2-6-4.5l-1.3-2.3a1.5 1.5 0 012.6-1.4L8 14"/>' },
  { id: 'dropper', en: 'Color picker', pt: 'Conta-gotas', icon: '<path d="M14 7l3-3a2.1 2.1 0 013 3l-3 3M14 7l3 3M14 7L5 16l-1 4 4-1 9-9"/>' },
  '-',
  { id: 'polyline', en: 'Segmented line', pt: 'Linha segmentada', icon: '<path d="M4 18l5-8 5 5 6-10"/>' },
  { id: 'multipoint', en: 'Multi-point', pt: 'Multiponto', icon: '<circle cx="6" cy="7" r="2" fill="currentColor"/><circle cx="17" cy="9" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/>' },
  { id: 'Flood Filler Built-in Tool', en: 'Flood fill', pt: 'Balde', icon: '<path d="M5 13l7-8 7 8-7 7z"/><path d="M19 15c1.5 2 2 3 2 4a2 2 0 01-4 0c0-1 .5-2 2-4z"/>' },
  { id: 'Developer Menu Built-in Tool', en: 'Developer menu', pt: 'Dev', icon: '<text x="12" y="16.5" text-anchor="middle" font-size="10" font-weight="800" fill="currentColor" stroke="none">Dev</text>' },
  { id: 'brush', en: 'Paintbrush', pt: 'Pincel', icon: '<path d="M20 4l-9 9M9 13c-3 0-4 2-4 4 0 1-1 2-2 2 3 1 8 1 8-4z"/>' },
  { id: 'arrow', en: 'Arrow', pt: 'Seta', icon: '<path d="M5 19L19 5M10 5h9v9"/>' },
];

/** Layout compacto da toolbar: grupos (um botao + flyout), ferramentas soltas e separadores. Dev fica no flyout "More tools". */
export const TOOLBAR = [
  { group: ['rectangle', 'oval', 'polygon', 'freehand'] },
  { group: ['line', 'polyline', 'angle', 'arrow'] },
  { group: ['point', 'multipoint'] },
  'wand', 'text', 'zoom', 'hand', 'dropper',
  '-',
  { group: ['brush', 'Flood Filler Built-in Tool'] },
];

/** Menu proprio do ImageL (alem dos menus do ImageJ). Itens com ext:true sao tratados por handlers JS. */
export const IMAGEL_MENU = {
  id: 'imagel', en: 'ImageL', pt: 'ImageL',
  items: [{ cmd: 'Gap distance...', en: 'Gap distance (scratch assay)...', pt: 'Distância entre grupos (scratch)...', ext: true }],
};
export const withImageL = ms => [...ms.filter(m => m.id !== 'imagel'), IMAGEL_MENU];

const walk = (items, path, out) => {
  for (const it of items) {
    if (it === '-') continue;
    if (it.sub) walk(it.items, [...path, it.sub], out);
    else out.push({ ...it, path });
  }
};

/** Lista plana de comandos (para a paleta): { cmd, en, pt, key, path:[{en,pt}...] }. */
export function flattenCommands(menus = MENUS) {
  const out = [];
  for (const m of menus) walk(m.items, [{ en: m.en, pt: m.pt }], out);
  return out;
}

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Filtra comandos por texto (sem acento/caixa) nos dois idiomas e no caminho do menu. Mais relevantes primeiro. */
export function searchCommands(query, commands = flattenCommands(), limit = 12) {
  const q = norm(query.trim());
  if (!q) return commands.slice(0, limit);
  const scored = [];
  for (const c of commands) {
    const label = norm(c.en + ' ' + c.pt);
    const path = norm(c.path.map(p => p.en + ' ' + p.pt).join(' '));
    let score = -1;
    if (norm(c.en).startsWith(q) || norm(c.pt).startsWith(q)) score = 3;
    else if (label.includes(q)) score = 2;
    else if (path.includes(q)) score = 1;
    if (score > 0) scored.push([score, c]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1]);
}
