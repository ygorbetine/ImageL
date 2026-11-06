// Nucleo da IA analista autonoma (leve, sem dependencias): laco planejar -> executar -> verificar -> iterar,
// com validador de seguranca, modos de autonomia, orcamento de passos/tempo, cancelamento e log de auditoria.
// O "cerebro" e um provider plugavel: um LLM remoto (MCP/Hypha) OU o provider offline de receitas (recipes.js),
// que nao custa nada e roda em qualquer maquina.
//
// provider.next({ goal, history, context }) -> Promise de um destes:
//   { type: 'macro', code, why }          executar uma macro ImageJ
//   { type: 'done', report }              concluido (report: texto/objeto com resultados)
//   { type: 'ask', question }             precisa do usuario

export const MODES = ['suggest', 'semi', 'auto'];

// Bloqueado em QUALQUER modo: apaga arquivos, executa programas, codigo dinamico, encerra o app.
const BLOCKED = [
  /\bFile\.(delete|rename|saveString|append|makeDirectory)\b/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /\bcall\s*\(/i,
  /\bQuit\b/i,
  /\bshowMessageWithCancel\b/i,
];
// Pede confirmacao no modo "semi": grava/sobrescreve arquivos ou mexe no original.
const RISKY = [
  /\bsave(As)?\s*\(/i,
  /\brun\(\s*"(Save|Tiff\.\.\.|Jpeg\.\.\.|PNG\.\.\.|Gif\.\.\.|Revert|Close All|Clear Results)"/i,
  /\bclose\(\s*\)/i,
  /\bclose\(\s*"\*"\s*\)/i,
  /\bselectWindow\(.*\);\s*run\(\s*"Close"/i,
];

/** { level: 'blocked' | 'risky' | 'ok', reason } */
export function checkMacro(code) {
  if (typeof code !== 'string' || !code.trim()) return { level: 'blocked', reason: 'macro vazia' };
  if (code.length > 20000) return { level: 'blocked', reason: 'macro grande demais' };
  for (const re of BLOCKED) if (re.test(code)) return { level: 'blocked', reason: 'comando proibido: ' + re.source };
  for (const re of RISKY) if (re.test(code)) return { level: 'risky', reason: 'altera/grava arquivos ou fecha imagens' };
  return { level: 'ok', reason: '' };
}

export function createAgent({ provider, bridge, mode = 'semi', maxSteps = 12, maxMs = 120000, confirm = async () => false, snapshot = null, now = () => Date.now() }) {
  if (!MODES.includes(mode)) throw new Error('modo invalido: ' + mode);
  const audit = [];
  const log = (type, data) => audit.push({ t: now(), type, ...data });

  async function run(goal, { signal } = {}) {
    const history = [];
    const t0 = now();
    for (let step = 1; step <= maxSteps; step++) {
      if (signal && signal.aborted) { log('aborted', { step }); return { status: 'aborted', audit, history }; }
      if (now() - t0 > maxMs) { log('timeout', { step }); return { status: 'timeout', audit, history }; }

      let action;
      try {
        action = await provider.next({ goal, history, context: { step, maxSteps, mode } });
      } catch (e) {
        log('provider-error', { step, error: String(e && e.message || e) });
        return { status: 'error', error: String(e && e.message || e), audit, history };
      }
      if (!action || typeof action.type !== 'string') { log('bad-action', { step }); return { status: 'error', error: 'acao invalida do provider', audit, history }; }

      if (action.type === 'done') { log('done', { step }); return { status: 'done', report: action.report, audit, history }; }
      if (action.type === 'ask') { log('ask', { step, question: action.question }); return { status: 'needs-input', question: action.question, audit, history }; }
      if (action.type !== 'macro') { log('bad-action', { step, got: action.type }); return { status: 'error', error: 'tipo desconhecido: ' + action.type, audit, history }; }

      const verdict = checkMacro(action.code);
      log('proposed', { step, why: action.why || '', code: action.code, level: verdict.level });
      if (verdict.level === 'blocked') {
        history.push({ step, code: action.code, error: 'bloqueado: ' + verdict.reason });
        continue; // devolve o erro ao provider para ele tentar outro caminho
      }
      if (mode === 'suggest') { history.push({ step, code: action.code, skipped: true }); log('skipped', { step, reason: 'modo suggest' }); continue; }
      if (verdict.level === 'risky' && mode === 'semi') {
        const ok = await confirm({ step, code: action.code, why: action.why, reason: verdict.reason });
        log('confirm', { step, approved: !!ok });
        if (!ok) { history.push({ step, code: action.code, error: 'recusado pelo usuario' }); continue; }
      }

      try {
        const result = await bridge.macro(action.code);
        const shot = snapshot ? await snapshot().catch(() => null) : null; // verificacao visual opcional
        history.push({ step, code: action.code, result: result == null ? '' : String(result), snapshot: shot });
        log('executed', { step, result: result == null ? '' : String(result) });
      } catch (e) {
        const msg = String(e && e.message || e);
        history.push({ step, code: action.code, error: msg });
        log('exec-error', { step, error: msg });
      }
    }
    log('max-steps', { maxSteps });
    return { status: 'max-steps', audit, history };
  }

  return { run, audit };
}

/** Protocolo reproduzivel: so as macros executadas com sucesso, na ordem, prontas para salvar como .ijm. */
export function toProtocol(result) {
  const lines = ['// Protocolo gerado pelo ImageL (IA analista). Reproduzivel: rode no ImageJ sobre a imagem original (duplicada).'];
  for (const h of result.history) if (h.result !== undefined && !h.error) lines.push(`// passo ${h.step}`, h.code.trim());
  return lines.join('\n');
}
