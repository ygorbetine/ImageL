// Ponte JS -> ImageJ (Java via CheerpJ). Tudo passa por macros. Preferimos Interpreter.runMacroSilent (patch do
// projeto): erros voltam como dados em vez de abrir um dialogo modal que trava o ImageJ. Sem ele, cai em IJ.runMacro.
// getIJ()/getSilent() sao injetaveis para testes.
import { createLogger } from '../logger.js';

const log = createLogger('bridge');

/** Escapa texto para dentro de uma string de macro ImageJ ("..."). */
export function macroString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

const TOOL_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]*$/;

export function createBridge(
  getIJ = () => (typeof window !== 'undefined' ? window.IJClass : null),
  getSilent = async () => {
    try { return typeof window !== 'undefined' && window.lib ? await window.lib.ij.macro.Interpreter : null; } catch (_) { return null; }
  },
) {
  const ready = () => !!getIJ();
  // O CheerpJ aceita uma chamada JS -> Java por vez. Uma segunda chamada enquanto um comando demorado esta em andamento
  // falha ("Java code still running") e, se coincidir com um nativo assincrono (dialogo de arquivo, modelo do
  // DeepImageJ), derruba o proprio comando ("Error while handling user native"). Chamadas de fundo (tema, ajuste de
  // janela) usam { background: true } e sao recusadas enquanto houver outra em andamento.
  let inFlight = 0;
  const busy = () => inFlight > 0 || (typeof window !== 'undefined' && !!window.__cjNativeBusy);
  async function macro(code, opts) {
    if (opts && opts.background && busy()) throw new Error('ImageJ ocupado');
    inFlight++;
    try { return await macroNow(code); } finally { inFlight--; }
  }
  async function macroNow(code) {
    const IJ = getIJ();
    if (!IJ) throw new Error('ImageJ ainda nao carregou');
    const silent = await getSilent();
    if (silent && typeof silent.runMacroSilent === 'function') {
      const res = await silent.runMacroSilent(code); // String[]{status, message}: proxy Java (CheerpJ) nao e iteravel
      const at = async i => { try { const v = await res[i]; return v == null ? '' : String(v); } catch (_) { return ''; } };
      const [status, message] = res == null ? ['', ''] : [await at(0), await at(1)];
      if (status === 'error') throw new Error(message || 'erro na macro');
      return message;
    }
    return IJ.runMacro(code);
  }
  return {
    ready,
    busy,
    macro,
    /** Executa um comando de menu pelo nome original: run("Gaussian Blur...", "sigma=2") */
    async run(cmd, options) {
      log.debug('run', cmd, options || '');
      const IJ = getIJ();
      if (!options && IJ && typeof IJ.run === 'function') {
        // Sem opcoes = clique num item de menu: IJ.run(cmd), como o menu original. O caminho de macro silenciosa nao
        // abre o dialogo do comando (Gaussian Blur..., Set Scale...): voltava "sucesso" sem fazer nada.
        inFlight++;
        try { await IJ.run(cmd); return ''; } finally { inFlight--; }
      }
      const code = options ? `run("${macroString(cmd)}", "${macroString(options)}");` : `run("${macroString(cmd)}");`;
      return macro(code);
    },
    /** Nomes aceitos: rectangle, oval, brush, arrow... ou nome de ferramenta de macro ("Flood Filler Built-in Tool"). */
    async setTool(id) {
      // Ferramentas embutidas sem nome aceito pelo setTool (Dev=15, Balde=17, Pincel=16, Seta=18) usam o indice numerico.
      if (typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < 40) return macro(`setTool(${id});`);
      if (typeof id !== 'string' || !TOOL_RE.test(id)) throw new Error('ferramenta invalida: ' + id);
      log.debug('setTool', id);
      return macro(`setTool("${id}");`);
    },
  };
}
