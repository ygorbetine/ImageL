// Ponte JS -> ImageJ (Java via CheerpJ). Tudo passa por IJ.runMacro, a API ja usada pelo servico Hypha,
// entao nao depende de resolucao de sobrecargas Java. getIJ() e injetavel para testes.
import { createLogger } from '../logger.js';

const log = createLogger('bridge');

/** Escapa texto para dentro de uma string de macro ImageJ ("..."). */
export function macroString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

export function createBridge(getIJ = () => (typeof window !== 'undefined' ? window.IJClass : null)) {
  const ready = () => !!getIJ();
  async function macro(code) {
    const IJ = getIJ();
    if (!IJ) throw new Error('ImageJ ainda nao carregou');
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
    async setTool(id) {
      if (!/^[a-z]+$/.test(id)) throw new Error('ferramenta invalida: ' + id);
      log.debug('setTool', id);
      return macro(`setTool("${id}");`);
    },
  };
}
