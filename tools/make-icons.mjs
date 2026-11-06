// Gera os icones do desktop (PNG + ICO) a partir da geometria de static/logo.svg, sem dependencias.
// Uso: node tools/make-icons.mjs   (escreve em desktop/src-tauri/icons)
import fs from 'node:fs'; import zlib from 'node:zlib';
const OUT = new URL('../desktop/src-tauri/icons/', import.meta.url);
const big = [[20, 21, 10], [44, 25, 9], [31, 45, 11]], nuc = [[22, 19, 3.6], [45, 24, 3.2], [32, 44, 4]];
const SW = 2.4, BG = [0x5b, 0x92, 0xff], NU = [0x2f, 0x56, 0xb8];
const mix = (d, c, a) => [d[0] + (c[0] - d[0]) * a, d[1] + (c[1] - d[1]) * a, d[2] + (c[2] - d[2]) * a, d[3] + (1 - d[3]) * a];
function sample(x, y) { // x,y em unidades do viewBox (0..64); devolve [r,g,b,a] nao pre-multiplicado
  const rx = 14; const cx = Math.min(Math.max(x, rx), 64 - rx), cy = Math.min(Math.max(y, rx), 64 - rx);
  if (x < 0 || y < 0 || x > 64 || y > 64 || (x - cx) ** 2 + (y - cy) ** 2 > rx * rx) return [0, 0, 0, 0];
  let c = [...BG, 1];
  for (const [ox, oy, r] of big) {
    const d = Math.hypot(x - ox, y - oy);
    if (d <= r) { // gradiente radial no bbox do circulo: centro (.35,.3), raio .85 (em unidades do bbox)
      const u = ((x - (ox - r)) / (2 * r) - .35), v = ((y - (oy - r)) / (2 * r) - .3);
      const t = Math.min(1, Math.hypot(u, v) / .85), a = .95 + (.22 - .95) * t;
      c = [...mix(c, [255, 255, 255], a).slice(0, 3), 1];
    }
    if (Math.abs(d - r) <= SW / 2) c = [255, 255, 255, 1];
  }
  for (const [ox, oy, r] of nuc) if (Math.hypot(x - ox, y - oy) <= r) c = [...mix(c, NU, .85).slice(0, 3), 1];
  return c;
}
function render(n, ss = 4) {
  const px = Buffer.alloc(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sj = 0; sj < ss; sj++) for (let si = 0; si < ss; si++) {
      const s = sample(((i + (si + .5) / ss) / n) * 64, ((j + (sj + .5) / ss) / n) * 64);
      r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3];
    }
    const o = (j * n + i) * 4, k = ss * ss;
    px[o] = a ? r / a : 0; px[o + 1] = a ? g / a : 0; px[o + 2] = a ? b / a : 0; px[o + 3] = Math.round((a / k) * 255);
  }
  return px;
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(n) {
  const px = render(n), raw = Buffer.alloc((n * 4 + 1) * n);
  for (let j = 0; j < n; j++) { raw[j * (n * 4 + 1)] = 0; px.copy(raw, j * (n * 4 + 1) + 1, j * n * 4, (j + 1) * n * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(n, 0); ih.writeUInt32BE(n, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const p = Object.fromEntries([32, 128, 256, 512].map(n => [n, png(n)]));
const w = (f, b) => fs.writeFileSync(new URL(f, OUT), b);
w('32x32.png', p[32]); w('128x128.png', p[128]); w('icon.png', p[512]);
const sizes = [32, 128, 256], head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = 6 + 16 * sizes.length; const dir = [], datas = [];
for (const n of sizes) { const e = Buffer.alloc(16); e[0] = n === 256 ? 0 : n; e[1] = e[0]; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(p[n].length, 8); e.writeUInt32LE(off, 12); off += p[n].length; dir.push(e); datas.push(p[n]); }
w('icon.ico', Buffer.concat([head, ...dir, ...datas]));
console.log('icones gerados', Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.length])));
