// Provider OFFLINE de receitas classicas (zero custo, sem rede, roda em qualquer maquina).
// Cada receita e uma lista de passos; o provider entrega um por vez e conclui com um relatorio.
// Sempre comeca duplicando a imagem ativa: o original nunca e alterado.

const DUP = { why: 'Trabalhar em uma copia: o original nao e alterado', code: 'run("Duplicate...", "title=ImageL-work");' };

export const RECIPES = {
  // Contagem de nucleos/celulas em fluorescencia (fundo escuro): suaviza, remove fundo, Otsu, watershed, particulas.
  'count-bright-objects': {
    title: { en: 'Count bright objects (nuclei/cells)', pt: 'Contar objetos brilhantes (núcleos/células)' },
    params: { sigma: 2, rolling: 50, minSize: 30 },
    steps: p => [
      DUP,
      { why: 'Converter para 8 bits', code: 'run("8-bit");' },
      { why: 'Remover fundo desigual (rolling ball)', code: `run("Subtract Background...", "rolling=${p.rolling}");` },
      { why: 'Suavizar ruido', code: `run("Gaussian Blur...", "sigma=${p.sigma}");` },
      { why: 'Limiar automatico de Otsu', code: 'setAutoThreshold("Otsu dark"); setOption("BlackBackground", true); run("Convert to Mask");' },
      { why: 'Separar objetos encostados', code: 'run("Watershed");' },
      { why: 'Medir e contar particulas', code: `run("Set Measurements...", "area mean shape redirect=None decimal=3"); run("Analyze Particles...", "size=${p.minSize}-Infinity display exclude clear summarize add");` },
    ],
    report: 'Contagem concluida: veja a tabela Results/Summary e o ROI Manager.',
  },
  // Medir intensidade media de regioes ja selecionadas (ROI Manager).
  'measure-intensity': {
    title: { en: 'Measure intensity in ROIs', pt: 'Medir intensidade nas ROIs' },
    params: {},
    steps: () => [
      { why: 'Definir medicoes de intensidade', code: 'run("Set Measurements...", "area mean standard min integrated redirect=None decimal=3");' },
      { why: 'Medir todas as ROIs', code: 'if (roiManager("count") > 0) { roiManager("Deselect"); roiManager("Measure"); } else { run("Measure"); }' },
    ],
    report: 'Medicoes concluidas: veja a tabela Results.',
  },
  // Segmentacao por limiar com metodo escolhido (para fundo claro/escuro).
  'threshold-area': {
    title: { en: 'Area fraction by threshold', pt: 'Fração de área por limiar' },
    params: { method: 'Otsu', dark: true },
    steps: p => [
      DUP,
      { why: 'Converter para 8 bits', code: 'run("8-bit");' },
      { why: `Limiar ${p.method}`, code: `setAutoThreshold("${p.method}${p.dark ? ' dark' : ''}"); run("Create Selection");` },
      { why: 'Medir fracao de area', code: 'run("Set Measurements...", "area area_fraction redirect=None decimal=3"); run("Measure");' },
    ],
    report: 'Fracao de area medida: veja a coluna %Area em Results.',
  },
};

/** Escolhe a receita por palavras-chave do pedido (PT/EN, sem acento). Retorna o id ou null. */
export function pickRecipe(goal) {
  const g = String(goal).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/(count|conta|contar|nucle|nuclei|cell|celula|particle|particula)/.test(g)) return 'count-bright-objects';
  if (/(area fraction|fracao de area|threshold|limiar|cobertura|coverage)/.test(g)) return 'threshold-area';
  if (/(intens|mean|media|measure|medir|fluoresc)/.test(g)) return 'measure-intensity';
  return null;
}

/** Provider offline: entrega os passos da receita em ordem e depois conclui. */
export function recipeProvider(recipeId, overrides = {}) {
  const r = RECIPES[recipeId];
  if (!r) throw new Error('receita desconhecida: ' + recipeId);
  const steps = r.steps({ ...r.params, ...overrides });
  let i = 0;
  return {
    async next({ history }) {
      const last = history[history.length - 1];
      if (last && last.error) return { type: 'ask', question: 'O passo "' + last.code + '" falhou: ' + last.error + '. Ajustar a receita ou tentar outro metodo?' };
      if (i < steps.length) return { type: 'macro', code: steps[i].code, why: steps[i++].why };
      return { type: 'done', report: r.report };
    },
  };
}
