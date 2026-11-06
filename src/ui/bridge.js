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
  async function macro(code) {
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
    macro,
    /** Executa um comando de menu pelo nome original: run("Gaussian Blur...", "sigma=2") */
    async run(cmd, options) {
      const code = options ? `run("${macroString(cmd)}", "${macroString(options)}");` : `run("${macroString(cmd)}");`;
      log.debug('run', cmd, options || '');
      return macro(code);
    },
    /** Nomes aceitos: rectangle, oval, brush, arrow... ou nome de ferramenta de macro ("Flood Filler Built-in Tool"). */
    async setTool(id) {
      if (!TOOL_RE.test(id)) throw new Error('ferramenta invalida: ' + id);
      log.debug('setTool', id);
      return macro(`setTool("${id}");`);
    },
  };
}
