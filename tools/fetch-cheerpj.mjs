// Baixa os arquivos do runtime CheerpJ 4.2 usados pelo ImageL para vendor/cheerpj/4.2 (necessario para `build-site --offline`).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = 'https://cjrtnc.leaningtech.com/4.2/';
const FILES = [
  'loader.js', 'cj3.js', 'cj3.wasm', 'cj3n8.wasm', 'cheerpOS.js', 'cheerpj.css', 'c.html', 'c.js',
  '8/jre/lib/rt.jar', '8/jre/lib/cheerpj-awt.jar', '8/jre/lib/jsse.jar', '8/jre/lib/jce.jar', '8/jre/lib/charsets.jar',
  '8/jre/lib/resources.jar', '8/jre/lib/javaws.jar', '8/jre/lib/meta-index',
  '8/lib/ext/meta-index', '8/lib/ext/index.list', '8/lib/ext/localedata.jar', '8/lib/ext/sunec.jar', '8/lib/ext/sunjce_provider.jar', '8/lib/ext/zipfs.jar',
  '8/lib/accessibility.properties', '8/lib/currency.data', '8/lib/currency.properties', '8/lib/logging.properties', '8/lib/security/java.security', '8/lib/tzdb.dat',
  '8/lib/fonts/LucidaSansRegular.ttf', '8/lib/fonts/badfonts.txt', '8/lib/fonts/index.list',
  'etc/users', 'etc/localtime', 'etc/hosts', 'etc/resolv.conf', 'etc/timezone',
  'fc/fonts/fonts.conf', 'fc/cache/e21edda6a7db77f35ca341e0c3cb2a22-le32d8.cache-7', 'fc/ttf/LiberationSans-Regular.ttf',
];
// Diretorios: o CDN lista cada pasta em <dir>/index.list (status 231 = diretorio). Baixa as listas e os arquivos que elas citam
// (fontes sem os pacotes CJK/emoji, ~90 MB, e perfis de cor); sem as fontes o texto de varias janelas Java fica em branco.
const DIRS = ['', '8', '8/jre', '8/jre/lib', '8/lib', '8/lib/ext', '8/lib/security', '8/lib/cmm', 'etc', 'fc', 'fc/fonts', 'fc/cache', 'fc/ttf'];
const SKIP = /CJK|NotoColorEmoji/;
for (const d of DIRS) {
  const list = (d ? d + '/' : '') + 'index.list';
  const r = await fetch(BASE + list);
  if (r.status !== 200) continue;
  const text = await r.text();
  mkdirSync(dirname(`vendor/cheerpj/4.2/${list}`), { recursive: true });
  writeFileSync(`vendor/cheerpj/4.2/${list}`, text);
  if (['8/lib/cmm', 'fc/ttf', 'fc/cache'].includes(d)) for (const n of text.split(/\r?\n/).filter(Boolean)) if (!SKIP.test(n)) FILES.push((d ? d + '/' : '') + n);
}
for (const f of FILES) {
  const dest = `vendor/cheerpj/4.2/${f}`;
  if (existsSync(dest)) continue;
  const r = await fetch(BASE + f);
  if (r.status === 204) { console.log('204 (inexistente no CDN, ignorado)', f); continue; }
  if (r.status === 204) { console.log('204 (inexistente no CDN, ignorado)', f); continue; }
  if (!r.ok) { console.error('FALHOU', f, r.status); process.exitCode = 1; continue; }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  console.log('ok', f);
}
