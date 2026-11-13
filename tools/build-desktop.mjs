// Gera os artefatos desktop em ./release com a versao no nome:
//   ImageL-<v>.exe            (online: baixa o runtime CheerpJ na 1a execucao)
//   ImageL-<v>-offline.exe    (CheerpJ embutido, funciona sem internet)
//   ImageL-<v>-setup.exe      (instalador NSIS da versao offline)
// Uso: node tools/build-desktop.mjs [--skip-installer]
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';

const v = JSON.parse(readFileSync('package.json', 'utf8')).version;
const conf = 'desktop/src-tauri/tauri.conf.json';
const c = JSON.parse(readFileSync(conf, 'utf8'));
if (c.version !== v) { c.version = v; writeFileSync(conf, JSON.stringify(c, null, 2) + '\n'); }
const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
mkdirSync('release', { recursive: true });
const exe = 'desktop/src-tauri/target/release/ImageL.exe';

run('node tools/build-site.mjs');
run('cargo build --release', 'desktop/src-tauri');
copyFileSync(exe, `release/ImageL-${v}.exe`);

run('node tools/build-site.mjs --offline');
run('cargo build --release', 'desktop/src-tauri');
copyFileSync(exe, `release/ImageL-${v}-offline.exe`);

if (!process.argv.includes('--skip-installer')) {
  run('cargo tauri build --bundles nsis', 'desktop/src-tauri');
  const dir = 'desktop/src-tauri/target/release/bundle/nsis';
  const f = existsSync(dir) && readdirSync(dir).find(n => n.endsWith('-setup.exe'));
  if (f) copyFileSync(`${dir}/${f}`, `release/ImageL-${v}-setup.exe`);
}
console.log('release/ pronto para', v);
