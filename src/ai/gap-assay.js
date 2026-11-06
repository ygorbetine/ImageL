// Ensaio de lacuna ("scratch"/wound healing): mede automaticamente a distancia entre dois grupos de celulas em N linhas
// igualmente espacadas, com parametros preenchidos pelo usuario (Dialog nativo do ImageJ). Roda 100% local e leve:
// filtro de variancia (textura: celulas = alta, lacuna = baixa) + Otsu + abrir/fechar + varredura por linha.
// Nunca altera a imagem original: trabalha numa copia e desenha as medicoes como Overlay na original.

export const GAP_MACRO = String.raw`
if (nImages == 0) exit("ImageL: abra uma imagem primeiro / open an image first.");
Dialog.create("ImageL - Gap distance (scratch assay)");
Dialog.addNumber("Measurements (lines):", 10);
Dialog.addNumber("Texture radius (px):", 3);
Dialog.addNumber("Edge margin (%):", 5);
Dialog.addChoice("Measure along:", newArray("Horizontal (gap is a vertical band)", "Vertical (gap is a horizontal band)"));
Dialog.addNumber("Previous mean distance (0 = none):", 0);
Dialog.addNumber("Movement threshold (%):", 10);
Dialog.show();
n = round(Dialog.getNumber()); rad = Dialog.getNumber(); mg = Dialog.getNumber();
mode = Dialog.getChoice(); prev = Dialog.getNumber(); thr = Dialog.getNumber();
if (n < 1) n = 1;
if (mg < 0 || mg > 40) mg = 5;
vert = startsWith(mode, "Vertical");
orig = getImageID(); title = getTitle();
w = getWidth(); h = getHeight();
getPixelSize(unit, pw, ph);
if (unit == "pixels" || unit == "pixel") unit = "px";
step = pw; if (vert) step = ph;
run("Duplicate...", "title=ImageL-gap");
work = getImageID();
run("8-bit");
run("Variance...", "radius=" + rad);
setAutoThreshold("Otsu dark");
setOption("BlackBackground", true);
run("Convert to Mask");
run("Close-");
run("Open");
nl = h; len = w;
if (vert) { nl = w; len = h; }
pos0 = newArray(n); d = newArray(n); a1 = newArray(n);
for (i = 0; i < n; i++) {
  pos = round(nl * (mg / 100 + (1 - 2 * mg / 100) * (i + 0.5) / n));
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
  pos0[i] = pos; d[i] = best; a1[i] = bs;
}
selectImage(work); close();
selectImage(orig);
tbl = "Gap distances";
Table.create(tbl);
sum = 0; closed = 0; mn = 1e9; mx = 0;
Overlay.remove;
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
