// Painel "IA": pede uma analise em linguagem natural e roda o agente (receitas offline por padrao).
import { createAgent, toProtocol } from '../ai/agent.js';
import { pickRecipe, recipeProvider } from '../ai/recipes.js';
import { createBridge } from './bridge.js';
import { t } from '../i18n.js';

export function createAiPanel() {
  const bridge = createBridge();
  const box = document.createElement('section');
  box.className = 'il-ai';
  box.hidden = true;
  box.setAttribute('aria-label', t('panel.ai'));
  box.innerHTML = '<header><b></b><button data-x aria-label="Close">✕</button></header>' +
    '<input type="text" data-goal autocomplete="off"><div class="row"><select data-mode>' +
    '<option value="suggest"></option><option value="semi"></option><option value="auto"></option></select>' +
    '<button data-run class="p"></button><button data-stop></button></div><pre data-out aria-live="polite"></pre>' +
    '<button data-copy hidden></button>';
  const q = s => box.querySelector(s);
  const labels = () => {
    q('header b').textContent = t('panel.ai');
    q('[data-goal]').placeholder = t('ai.goal');
    const [a, b, c] = q('[data-mode]').options;
    a.textContent = t('ai.mode.suggest'); b.textContent = t('ai.mode.semi'); c.textContent = t('ai.mode.auto');
    q('[data-run]').textContent = t('ai.run'); q('[data-stop]').textContent = t('ai.stop'); q('[data-copy]').textContent = t('ai.copy');
  };
  let ctl = null, last = null;
  const out = s => { q('[data-out]').textContent += s + '\n'; };
  async function go() {
    const goal = q('[data-goal]').value.trim();
    const out_ = q('[data-out]'); out_.textContent = ''; q('[data-copy]').hidden = true;
    const id = pickRecipe(goal);
    if (!id) { out(t('ai.norecipe')); return; }
    ctl = new AbortController();
    const agent = createAgent({
      provider: recipeProvider(id), bridge, mode: q('[data-mode]').value,
      confirm: async ({ why, code }) => window.confirm(`${why || ''}\n\n${code}`),
    });
    const res = await agent.run(goal, { signal: ctl.signal });
    for (const a of res.audit) if (a.type === 'proposed') out(`${a.step}. ${a.why}  [${a.level}]`);
    out(`→ ${res.status}${res.report ? ': ' + res.report : ''}${res.question ? ': ' + res.question : ''}`);
    last = res; q('[data-copy]').hidden = res.status !== 'done';
  }
  box.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) box.hidden = true;
    else if (e.target.closest('[data-run]')) go().catch(err => out(String(err.message || err)));
    else if (e.target.closest('[data-stop]') && ctl) ctl.abort();
    else if (e.target.closest('[data-copy]') && last) navigator.clipboard.writeText(toProtocol(last)).catch(() => {});
  });
  labels();
  document.body.appendChild(box);
  return { toggle() { labels(); box.hidden = !box.hidden; if (!box.hidden) q('[data-goal]').focus(); } };
}
