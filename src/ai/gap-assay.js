// Ensaio de lacuna ("scratch"/wound healing): mede automaticamente a distancia entre dois grupos de celulas em N linhas
// igualmente espacadas, com parametros preenchidos pelo usuario (Dialog nativo do ImageJ). Roda 100% local e leve:
// filtro de variancia (textura: celulas = alta, lacuna = baixa) + Otsu + abrir/fechar + varredura por linha.
// Nunca altera a imagem original: trabalha numa copia e desenha as medicoes como Overlay na original.

export const GAP_MACRO = String.raw`
if (nImages == 0) exit("ImageL: abra uma imagem primeiro / open an image first.");
Dialog.create("ImageL - Gap distance (scratch assay)");
Dialog.addNumber("Measurements (lines):", 10);
Dialog.addNumber("Texture radius (px):", 4);
Dialog.addNumber("Edge margin (%):", 5);
Dialog.addNumber("Curve smoothing (0 = hug every cell, 10 = very smooth):", 5);
Dialog.addChoice("Measure along:", newArray("Horizontal (gap is a vertical band)", "Vertical (gap is a horizontal band)"));
Dialog.addCheckbox("Also add each line to the Results table (like Ctrl+M)", true);
Dialog.addNumber("Previous mean distance (0 = none):", 0);
Dialog.addNumber("Movement threshold (%):", 10);
Dialog.show();
n = round(Dialog.getNumber()); rad = Dialog.getNumber(); mg = Dialog.getNumber(); sm = Dialog.getNumber();
mode = Dialog.getChoice(); toRes = Dialog.getCheckbox(); prev = Dialog.getNumber(); thr = Dialog.getNumber();
if (n < 1) n = 1;
if (mg < 0 || mg > 40) mg = 5;
if (sm < 0) sm = 0;
if (sm > 10) sm = 10;
vert = startsWith(mode, "Vertical");
orig = getImageID(); title = getTitle();
w = getWidth(); h = getHeight();
getPixelSize(unit, pw, ph);
if (unit == "pixels" || unit == "pixel") unit = "px";
step = pw; if (vert) step = ph;
run("Duplicate...", "title=ImageL-gap");
run("8-bit");
run("Variance...", "radius=" + rad);
run("Gaussian Blur...", "sigma=" + (rad * 1.5));
setAutoThreshold("Li dark");
setOption("BlackBackground", true);
run("Convert to Mask");
run("Options...", "iterations=3 count=1 black");
run("Close-");
run("Open");
run("Options...", "iterations=1 count=1 black");
nl = h; len = w;
if (vert) { nl = w; len = h; }
pos0 = newArray(n); d = newArray(n); a1 = newArray(n);
// Varredura: n linhas de medicao + ~320 linhas de contorno (leve) para desenhar as bordas dos dois grupos.
ne = 320; if (ne > nl) ne = nl;
es = newArray(ne); ee = newArray(ne); ep = newArray(ne);
for (k = 0; k < n + ne; k++) {
  if (k < n) pos = round(nl * (mg / 100 + (1 - 2 * mg / 100) * (k + 0.5) / n));
  else pos = round((nl - 1) * (k - n + 0.5) / ne);
  if (pos > nl - 1) pos = nl - 1;
  best = 0; bs = 0; gl = 0; st = 0; seen = 0;
  for (a = 0; a < len; a++) {
    if (vert) v = getPixel(pos, a); else v = getPixel(a, pos);
    if (v > 127) {
      if (seen == 1 && gl > best) { best = gl; bs = st; }
      gl = 0; seen = 1;
    } else {
      if (gl == 0) st = a;
      gl++;
    }
  }
  if (k < n) { pos0[k] = pos; d[k] = best; a1[k] = bs; }
  else { es[k - n] = bs; ee[k - n] = bs + best; ep[k - n] = pos; if (best == 0) ee[k - n] = -1; }
}
// Bordas robustas: descarta amostras fora do padrao (poeira, bolhas, celulas soltas) e suaviza com mediana movel,
// para o contorno nao ter "entradas" nem picos. As medidas usam o mesmo contorno suavizado.
vs = newArray(ne); ve = newArray(ne); nv = 0;
for (k = 0; k < ne; k++) if (ee[k] >= 0) { vs[nv] = es[k]; ve[nv] = ee[k]; nv++; }
if (nv > 2) {
  ts = Array.trim(vs, nv); te = Array.trim(ve, nv); Array.sort(ts); Array.sort(te);
  ms = ts[floor(nv / 2)]; me = te[floor(nv / 2)]; tol = 0.2 * len;
  for (k = 0; k < ne; k++) if (ee[k] >= 0 && (abs(es[k] - ms) > tol || abs(ee[k] - me) > tol)) ee[k] = -1;
  ss_ = newArray(ne); se_ = newArray(ne); wn = maxOf(3, round(ne / 45));
  for (k = 0; k < ne; k++) {
    c = 0; wa = newArray(2 * wn + 1); wb = newArray(2 * wn + 1);
    for (j = maxOf(0, k - wn); j <= minOf(ne - 1, k + wn); j++) if (ee[j] >= 0) { wa[c] = es[j]; wb[c] = ee[j]; c++; }
    if (c == 0) { ss_[k] = -1; se_[k] = -1; continue; }
    wa = Array.trim(wa, c); wb = Array.trim(wb, c); Array.sort(wa); Array.sort(wb);
    ss_[k] = wa[floor(c / 2)]; se_[k] = wb[floor(c / 2)];
  }
  // media movel curta sobre a mediana: contorno liso, sem degraus
  for (k = 0; k < ne; k++) {
    c = 0; sa = 0; sb = 0;
    for (j = maxOf(0, k - 3); j <= minOf(ne - 1, k + 3); j++) if (ss_[j] >= 0) { sa += ss_[j]; sb += se_[j]; c++; }
    if (c > 0) { es[k] = sa / c; ee[k] = sb / c; } else { es[k] = -1; ee[k] = -1; }
  }
  for (k = 0; k < n; k++) {
    bj = -1; bd = 1e9;
    for (j = 0; j < ne; j++) if (ee[j] >= 0 && abs(ep[j] - pos0[k]) < bd) { bd = abs(ep[j] - pos0[k]); bj = j; }
    if (bj >= 0) { a1[k] = es[bj]; d[k] = ee[bj] - es[bj]; }
  }
}
// Refinamento fino: mascara mais sensivel, buscando a borda REAL (celula mais proxima) a ate R px da borda grossa.
// Assim o contorno cola nas celulas como o desenho a mao, sem entrar nos vaos entre elas.
selectImage(orig); run("Duplicate...", "title=ImageL-fine"); run("8-bit");
run("Variance...", "radius=3"); run("Gaussian Blur...", "sigma=2");
setAutoThreshold("Li dark"); run("Convert to Mask");
run("Options...", "iterations=2 count=1 black"); run("Open"); run("Options...", "iterations=1 count=1 black");
R = maxOf(10, round(0.05 * len));
for (q = 0; q < n + ne; q++) {
  if (q < n) { pos = pos0[q]; s0 = a1[q]; e0 = a1[q] + d[q]; if (d[q] <= 0) continue; }
  else { pos = ep[q - n]; s0 = es[q - n]; e0 = ee[q - n]; if (e0 < 0) continue; }
  s0 = round(s0); e0 = round(e0); mid = floor((s0 + e0) / 2);
  lim = maxOf(0, s0 - R); ns = lim;
  for (x = minOf(minOf(len - 1, s0 + R), mid); x >= lim; x--) {
    if (vert) v = getPixel(pos, x); else v = getPixel(x, pos);
    if (v > 127) { ns = x + 1; break; }
  }
  lim = minOf(len - 1, e0 + R); nf = lim;
  for (x = maxOf(maxOf(0, e0 - R), mid + 1); x <= lim; x++) {
    if (vert) v = getPixel(pos, x); else v = getPixel(x, pos);
    if (v > 127) { nf = x - 1; break; }
  }
  if (nf <= ns) continue;
  if (q < n) { a1[q] = ns; d[q] = nf - ns; } else { es[q - n] = ns; ee[q - n] = nf; }
}
// Fecho morfologico 1D do perfil de cada borda: preenche vaos estreitos entre celulas (como o contorno a mao,
// que abraca o grupo) e mantem as saliencias das celulas; depois media curta para ficar liso.
cw = round(sm * ne / 200); av = 1 + round(sm / 3);
cs_ = newArray(ne); ce_ = newArray(ne); ds_ = newArray(ne); de_ = newArray(ne);
for (k = 0; k < ne; k++) {
  ds_[k] = -1; de_[k] = -1;
  if (ee[k] < 0) continue;
  mxs = -1; mne = 1e9;
  for (j = maxOf(0, k - cw); j <= minOf(ne - 1, k + cw); j++) if (ee[j] >= 0) { mxs = maxOf(mxs, es[j]); mne = minOf(mne, ee[j]); }
  ds_[k] = mxs; de_[k] = mne;
}
for (k = 0; k < ne; k++) {
  cs_[k] = -1; ce_[k] = -1;
  if (ee[k] < 0) continue;
  mns = 1e9; mxe = -1;
  for (j = maxOf(0, k - cw); j <= minOf(ne - 1, k + cw); j++) if (ds_[j] >= 0) { mns = minOf(mns, ds_[j]); mxe = maxOf(mxe, de_[j]); }
  cs_[k] = mns; ce_[k] = mxe;
}
for (k = 0; k < ne; k++) {
  if (ee[k] < 0) continue;
  c = 0; sa = 0; sb = 0;
  for (j = maxOf(0, k - av); j <= minOf(ne - 1, k + av); j++) if (cs_[j] >= 0) { sa += cs_[j]; sb += ce_[j]; c++; }
  es[k] = sa / c; ee[k] = sb / c;
}
for (q = 0; q < n; q++) {
  bj = -1; bd = 1e9;
  for (j = 0; j < ne; j++) if (ee[j] >= 0 && abs(ep[j] - pos0[q]) < bd) { bd = abs(ep[j] - pos0[q]); bj = j; }
  if (bj >= 0) { a1[q] = es[bj]; d[q] = ee[bj] - es[bj]; }
}
selectImage("ImageL-fine"); close();
selectImage("ImageL-gap"); close();
selectImage(orig);
tbl = "Gap distances";
Table.create(tbl);
sum = 0; closed = 0; mn = 1e9; mx = 0;
Overlay.remove;
setColor("white");
pk = -1;
for (k = 0; k < ne; k++) {
  if (ee[k] < 0) continue;
  if (pk >= 0) {
    if (vert) { Overlay.drawLine(ep[pk], es[pk], ep[k], es[k]); Overlay.drawLine(ep[pk], ee[pk], ep[k], ee[k]); }
    else { Overlay.drawLine(es[pk], ep[pk], es[k], ep[k]); Overlay.drawLine(ee[pk], ep[pk], ee[k], ep[k]); }
  }
  pk = k;
}
setColor("yellow");
for (i = 0; i < n; i++) {
  Table.set("Line", i, i + 1, tbl);
  Table.set("Position (px)", i, pos0[i], tbl);
  Table.set("Start (px)", i, a1[i], tbl);
  Table.set("End (px)", i, a1[i] + d[i], tbl);
  Table.set("Distance (px)", i, d[i], tbl);
  Table.set("Distance (" + unit + ")", i, d[i] * step, tbl);
  sum += d[i]; if (d[i] == 0) closed++;
  mn = minOf(mn, d[i]); mx = maxOf(mx, d[i]);
  if (d[i] > 0) {
    if (vert) Overlay.drawLine(pos0[i], a1[i], pos0[i], a1[i] + d[i]);
    else Overlay.drawLine(a1[i], pos0[i], a1[i] + d[i], pos0[i]);
  }
}
Table.update(tbl);
if (toRes) {
  for (i = 0; i < n; i++) {
    if (d[i] <= 0) continue;
    if (vert) makeLine(pos0[i], a1[i], pos0[i], a1[i] + d[i]); else makeLine(a1[i], pos0[i], a1[i] + d[i], pos0[i]);
    run("Measure");
  }
  run("Select None");
}
Overlay.show;
mean = sum / n; ss = 0;
for (i = 0; i < n; i++) ss += (d[i] - mean) * (d[i] - mean);
sd = 0; if (n > 1) sd = sqrt(ss / (n - 1));
m = mean * step;
msg = title + "\n" + n + " lines | mean " + d2s(m, 2) + " " + unit + " (SD " + d2s(sd * step, 2) + ", min " + d2s(mn * step, 2) + ", max " + d2s(mx * step, 2) + ")";
if (closed > 0) msg = msg + "\nLines with no gap found (closed): " + closed;
if (prev > 0) {
  ch = (prev - m) / prev * 100;
  msg = msg + "\nChange vs previous: " + d2s(ch, 1) + "% closure";
  if (abs(ch) >= thr) msg = msg + "\n=> Movement detected (>= " + thr + "%)"; else msg = msg + "\n=> No significant movement (< " + thr + "%)";
}
print("--- ImageL gap distance ---\n" + msg);
showMessage("ImageL - Gap distance", msg);
`;
