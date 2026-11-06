// Ensaio de lacuna ("scratch"/wound healing): mede automaticamente a distancia entre dois grupos de celulas em N linhas
// igualmente espacadas, com parametros preenchidos pelo usuario (Dialog nativo do ImageJ). Roda 100% local e leve:
// filtro de variancia (textura: celulas = alta, lacuna = baixa) + limiar + morfologia + varredura por linha, refinada
// nas bordas reais das celulas. Nunca altera a imagem original: trabalha numa copia e desenha as medicoes como Overlay.
// Orientacao "Auto" detecta se a lacuna e uma faixa horizontal ou vertical. Modo lote: uma pasta inteira.

const L = {
  en: {
    title: 'ImageL - Gap distance (scratch assay)', btitle: 'ImageL - Gap distance (batch folder)',
    lines: 'Measurements (lines):', radius: 'Texture radius (px):', margin: 'Edge margin (%):',
    hp: 'High-pass filter, px (0 = off; helps faint cells):', smooth: 'Curve smoothing (0 = hug every cell, 10 = very smooth):', along: 'Gap orientation:',
    auto: 'Auto (detect)', hband: 'Vertical band (measure horizontally)', vband: 'Horizontal band (measure vertically)',
    tores: 'Also add each line to the Results table (like Ctrl+M)', prev: 'Previous mean distance (0 = none):',
    thr: 'Movement threshold (%):', save: 'Save annotated PNGs in subfolder ImageL-gap', pick: 'Choose the folder with the images',
    open1: 'ImageL: open an image first.', noimg: 'ImageL: no images found in this folder.',
    sumLines: 'lines | mean', closed: 'Lines with no gap found (closed):', change: 'Change vs previous:', closure: '% closure',
    moved: '=> Movement detected (>=', nomove: '=> No significant movement (<', msgtitle: 'ImageL - Gap distance',
    done: 'Batch finished:', imgs: 'images', file: 'File', mean: 'Mean', unit: 'Unit', orient: 'Band', h: 'horizontal', v: 'vertical', log: '--- ImageL gap distance ---',
  },
  pt: {
    title: 'ImageL - Distância entre grupos (scratch)', btitle: 'ImageL - Distância entre grupos (pasta em lote)',
    lines: 'Medições (linhas):', radius: 'Raio de textura (px):', margin: 'Margem das bordas (%):',
    hp: 'Filtro passa-alta, px (0 = desligado; ajuda células fracas):', smooth: 'Suavização da curva (0 = abraça cada célula, 10 = bem suave):', along: 'Orientação da lacuna:',
    auto: 'Automática (detectar)', hband: 'Faixa vertical (medir na horizontal)', vband: 'Faixa horizontal (medir na vertical)',
    tores: 'Lançar também cada linha na tabela Results (como Ctrl+M)', prev: 'Distância média anterior (0 = nenhuma):',
    thr: 'Limiar de movimento (%):', save: 'Salvar PNGs anotados na subpasta ImageL-gap', pick: 'Escolha a pasta com as imagens',
    open1: 'ImageL: abra uma imagem primeiro.', noimg: 'ImageL: nenhuma imagem encontrada nesta pasta.',
    sumLines: 'linhas | média', closed: 'Linhas sem lacuna (fechadas):', change: 'Variação vs anterior:', closure: '% de fechamento',
    moved: '=> Movimento detectado (>=', nomove: '=> Sem movimento significativo (<', msgtitle: 'ImageL - Distância entre grupos',
    done: 'Lote concluído:', imgs: 'imagens', file: 'Arquivo', mean: 'Média', unit: 'Unidade', orient: 'Faixa', h: 'horizontal', v: 'vertical', log: '--- ImageL distância entre grupos ---',
  },
};
const q = s => JSON.stringify(s); // literal de string de macro

// Nucleo comum: analisa a imagem ativa. orient: 0 auto, 1 faixa vertical (mede na horizontal), 2 faixa horizontal (mede na vertical).
// Resultados em variaveis globais g*. tbl != "" grava uma linha de tabela por medicao.
const CORE = String.raw`
var ghp = 0;
var gmean, gsd, gmin, gmax, gclosed, gunit, gvert;
function gapAnalyze(n, rad, mg, sm, orient, draw, toRes, tbl) {
  orig = getImageID(); title = getTitle();
  w = getWidth(); h = getHeight();
  getPixelSize(unit, pw, ph);
  if (unit == "pixels" || unit == "pixel") unit = "px";
  run("Duplicate...", "title=ImageL-gap");
  run("8-bit");
  if (ghp > 0) run("Bandpass Filter...", "filter_large=" + ghp + " filter_small=3 suppress=None tolerance=5 autoscale saturate");
  run("Variance...", "radius=" + rad);
  run("Gaussian Blur...", "sigma=" + (rad * 1.5));
  setAutoThreshold("Li dark");
  setOption("BlackBackground", true);
  run("Convert to Mask");
  run("Options...", "iterations=3 count=1 black");
  run("Close-");
  run("Open");
  run("Options...", "iterations=1 count=1 black");
  vert = (orient == 2);
  if (orient == 0) {
    g = 24; rv = newArray(g); cv = newArray(g);
    for (i = 0; i < g; i++) {
      rs = 0; cs = 0;
      for (j = 0; j < g; j++) {
        if (getPixel(round((j + 0.5) * w / g), round((i + 0.5) * h / g)) <= 127) rs++;
        if (getPixel(round((i + 0.5) * w / g), round((j + 0.5) * h / g)) <= 127) cs++;
      }
      rv[i] = rs / g; cv[i] = cs / g;
    }
    Array.getStatistics(rv, rmin, rmax, rmean, rsd);
    Array.getStatistics(cv, cmin, cmax, cmean, csd);
    vert = (rsd > csd);
  }
  step = pw; if (vert) step = ph;
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
    // Remove espigoes: saliencias estreitas (celula solta/detrito ligado a borda) com largura < ~7% do comprimento.
    // ee: fecho (max depois min) tira vales estreitos; es: abertura (min depois max) tira picos estreitos.
    ws = maxOf(3, round(ne * 0.035));
    t1 = newArray(ne); t2 = newArray(ne); u1 = newArray(ne); u2 = newArray(ne);
    for (k = 0; k < ne; k++) {
      t1[k] = -1; u1[k] = -1; if (ee[k] < 0) continue;
      mx = -1; mn = 1e9;
      for (j = maxOf(0, k - ws); j <= minOf(ne - 1, k + ws); j++) if (ee[j] >= 0) { mx = maxOf(mx, ee[j]); mn = minOf(mn, es[j]); }
      t1[k] = mx; u1[k] = mn;
    }
    for (k = 0; k < ne; k++) {
      t2[k] = -1; u2[k] = -1; if (t1[k] < 0) continue;
      mx = 1e9; mn = -1;
      for (j = maxOf(0, k - ws); j <= minOf(ne - 1, k + ws); j++) if (t1[j] >= 0) { mx = minOf(mx, t1[j]); mn = maxOf(mn, u1[j]); }
      t2[k] = mx; u2[k] = mn;
    }
    for (k = 0; k < ne; k++) if (t2[k] >= 0) { ee[k] = t2[k]; es[k] = u2[k]; }
    for (k = 0; k < n; k++) {
      bj = -1; bd = 1e9;
      for (j = 0; j < ne; j++) if (ee[j] >= 0 && abs(ep[j] - pos0[k]) < bd) { bd = abs(ep[j] - pos0[k]); bj = j; }
      if (bj >= 0) { a1[k] = es[bj]; d[k] = ee[bj] - es[bj]; }
    }
  }
  // Refinamento fino: mascara mais sensivel, buscando a borda REAL (celula mais proxima) a ate R px da borda grossa.
  // Assim o contorno cola nas celulas como o desenho a mao, sem entrar nos vaos entre elas.
  selectImage(orig); run("Duplicate...", "title=ImageL-fine"); run("8-bit");
  if (ghp > 0) run("Bandpass Filter...", "filter_large=" + ghp + " filter_small=3 suppress=None tolerance=5 autoscale saturate");
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
  sum = 0; closed = 0; mn = 1e9; mx = 0;
  if (draw) {
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
  }
  for (i = 0; i < n; i++) {
    if (tbl != "") {
      Table.set("Line", i, i + 1, tbl);
      Table.set("Position (px)", i, pos0[i], tbl);
      Table.set("Start (px)", i, a1[i], tbl);
      Table.set("End (px)", i, a1[i] + d[i], tbl);
      Table.set("Distance (px)", i, d[i], tbl);
      Table.set("Distance (" + unit + ")", i, d[i] * step, tbl);
    }
    sum += d[i]; if (d[i] == 0) closed++;
    mn = minOf(mn, d[i]); mx = maxOf(mx, d[i]);
    if (draw && d[i] > 0) {
      if (vert) Overlay.drawLine(pos0[i], a1[i], pos0[i], a1[i] + d[i]);
      else Overlay.drawLine(a1[i], pos0[i], a1[i] + d[i], pos0[i]);
    }
  }
  if (tbl != "") Table.update(tbl);
  if (toRes) {
    for (i = 0; i < n; i++) {
      if (d[i] <= 0) continue;
      if (vert) makeLine(pos0[i], a1[i], pos0[i], a1[i] + d[i]); else makeLine(a1[i], pos0[i], a1[i] + d[i], pos0[i]);
      run("Measure");
    }
    run("Select None");
  }
  if (draw) Overlay.show;
  mean = sum / n; ss = 0;
  for (i = 0; i < n; i++) ss += (d[i] - mean) * (d[i] - mean);
  sd = 0; if (n > 1) sd = sqrt(ss / (n - 1));
  gmean = mean * step; gsd = sd * step; gmin = mn * step; gmax = mx * step; gclosed = closed; gunit = unit; gvert = vert;
}
`;

const dialogFields = t => `
Dialog.addNumber(${q(t.lines)}, 10);
Dialog.addNumber(${q(t.radius)}, 4);
Dialog.addNumber(${q(t.margin)}, 5);
Dialog.addNumber(${q(t.smooth)}, 5);
Dialog.addNumber(${q(t.hp)}, 40);
Dialog.addChoice(${q(t.along)}, newArray(${q(t.auto)}, ${q(t.hband)}, ${q(t.vband)}), ${q(t.auto)});
`;
const readFields = t => `
n = round(Dialog.getNumber()); rad = Dialog.getNumber(); mg = Dialog.getNumber(); sm = Dialog.getNumber(); ghp = Dialog.getNumber();
mode = Dialog.getChoice(); oi = 0;
if (mode == ${q(t.hband)}) oi = 1;
if (mode == ${q(t.vband)}) oi = 2;
if (n < 1) n = 1;
if (mg < 0 || mg > 40) mg = 5;
if (sm < 0) sm = 0;
if (sm > 10) sm = 10;
`;

/** Macro de uma imagem (dialogo + tabela "Gap distances" + overlay + Results opcional). lang: 'en' | 'pt'. */
export function buildGapMacro(lang = 'en') {
  const t = L[lang] || L.en;
  return CORE + `
if (nImages == 0) exit(${q(t.open1)});
Dialog.create(${q(t.title)});
${dialogFields(t)}Dialog.addCheckbox(${q(t.tores)}, true);
Dialog.addNumber(${q(t.prev)}, 0);
Dialog.addNumber(${q(t.thr)}, 10);
Dialog.show();
${readFields(t)}toRes = Dialog.getCheckbox(); prev = Dialog.getNumber(); thr = Dialog.getNumber();
tbl = "Gap distances";
Table.create(tbl);
gapAnalyze(n, rad, mg, sm, oi, true, toRes, tbl);
title = getTitle();
msg = title + "\\n" + n + " " + ${q(t.sumLines)} + " " + d2s(gmean, 2) + " " + gunit + " (SD " + d2s(gsd, 2) + ", min " + d2s(gmin, 2) + ", max " + d2s(gmax, 2) + ")";
if (gclosed > 0) msg = msg + "\\n" + ${q(t.closed)} + " " + gclosed;
if (prev > 0) {
  ch = (prev - gmean) / prev * 100;
  msg = msg + "\\n" + ${q(t.change)} + " " + d2s(ch, 1) + ${q(t.closure)};
  if (abs(ch) >= thr) msg = msg + "\\n" + ${q(t.moved)} + " " + thr + "%)"; else msg = msg + "\\n" + ${q(t.nomove)} + " " + thr + "%)";
}
print(${q(t.log)} + "\\n" + msg);
showMessage(${q(t.msgtitle)}, msg);
`;
}

/** Macro em lote: pasta inteira -> tabela "Gap batch" (e PNGs anotados opcionais). */
export function buildGapBatchMacro(lang = 'en') {
  const t = L[lang] || L.en;
  return CORE + `
Dialog.create(${q(t.btitle)});
${dialogFields(t)}Dialog.addCheckbox(${q(t.save)}, false);
Dialog.show();
${readFields(t)}save = Dialog.getCheckbox();
dir = getDirectory(${q(t.pick)});
list = getFileList(dir);
out = dir + "ImageL-gap" + File.separator;
if (save) File.makeDirectory(out);
bt = "Gap batch";
Table.create(bt);
row = 0;
for (f = 0; f < list.length; f++) {
  name = list[f]; low = toLowerCase(name);
  if (!(endsWith(low, ".tif") || endsWith(low, ".tiff") || endsWith(low, ".png") || endsWith(low, ".jpg") || endsWith(low, ".jpeg") || endsWith(low, ".bmp") || endsWith(low, ".gif"))) continue;
  open(dir + name);
  if (nImages == 0) continue;
  id = getImageID();
  gapAnalyze(n, rad, mg, sm, oi, save, false, "");
  Table.set(${q(t.file)}, row, name, bt);
  Table.set(${q(t.mean)}, row, gmean, bt);
  Table.set("SD", row, gsd, bt);
  Table.set("Min", row, gmin, bt);
  Table.set("Max", row, gmax, bt);
  Table.set(${q(t.unit)}, row, gunit, bt);
  Table.set(${q(t.orient)}, row, ${q(t.v)}, bt);
  if (!gvert) Table.set(${q(t.orient)}, row, ${q(t.h)}, bt);
  Table.set("Closed", row, gclosed, bt);
  if (save) {
    run("Flatten");
    saveAs("PNG", out + substring(name, 0, lastIndexOf(name, ".")) + ".png");
    close();
  }
  selectImage(id); setOption("Changes", false); close();
  row++;
}
Table.update(bt);
if (row == 0) exit(${q(t.noimg)});
showMessage(${q(t.msgtitle)}, ${q(t.done)} + " " + row + " " + ${q(t.imgs)});
`;
}

export const GAP_MACRO = buildGapMacro('en');
export const GAP_BATCH_MACRO = buildGapBatchMacro('en');
