// Monta a pasta de distribuicao (mesmo conteudo que o CI publica no GitHub Pages) em ./dist, usada pelo shell desktop.
// Uso: node tools/build-site.mjs   (rode `npm run build:css` antes se alterou classes Tailwind)
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';

const out = 'dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = ['index.html', 'hypha-imagej-service.js', 'utils.js', 'file-browser.js', 'sw.js', 'CNAME'];
for (const f of files) if (existsSync(f)) cpSync(f, `${out}/${f}`);
cpSync('src', `${out}/src`, { recursive: true });
mkdirSync(`${out}/static`, { recursive: true });
for (const f of ['tailwind.css', 'theme.css', 'shell.css', 'logo.svg']) cpSync(`static/${f}`, `${out}/static/${f}`);
if (existsSync('lib')) cpSync('lib', `${out}/lib`, { recursive: true });
mkdirSync(`${out}/threadhack`, { recursive: true });
cpSync('threadhack/runtime', `${out}/threadhack/runtime`, { recursive: true });
if (existsSync('threadhack/viv-loader')) cpSync('threadhack/viv-loader', `${out}/threadhack/viv-loader`, { recursive: true });
console.log('dist/ pronto' + (existsSync('lib/ImageJ/ij.jar') ? '' : '  (AVISO: lib/ImageJ/ij.jar ausente; rode prepare.sh)'));

// ---- pos-processamento do index.html da distribuicao desktop ----------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs';
const offline = process.argv.includes('--offline');
let html = readFileSync(`${out}/index.html`, 'utf8');
// sem telemetria no app desktop (Google Analytics so existe na versao web)
html = html.replace(/<!-- Google tag \(gtag\.js\)[\s\S]*?<\/script>\n/, '');
if (offline) {
  if (!existsSync('vendor/cheerpj/4.2/loader.js')) { console.error('vendor/cheerpj/4.2 ausente: rode tools/fetch-cheerpj.mjs'); process.exit(1); }
  cpSync('vendor/cheerpj/4.2', `${out}/cheerpj/4.2`, { recursive: true });
  html = html.replace(/<link rel="(preconnect|dns-prefetch)" href="https:\/\/cjrtnc[^>]*>\n/g, '')
    .replace('<script src="threadhack/runtime/loader.js"></script>', `<script>window.__CJ_BASE = new URLSearchParams(location.search).get('cjbase') || new URL('cheerpj/4.2/', location.href).href;</script>\n<script src="threadhack/runtime/loader.js"></script>`);
  console.log('dist/ OFFLINE: CheerpJ embutido em dist/cheerpj/4.2');
}
writeFileSync(`${out}/index.html`, html);
