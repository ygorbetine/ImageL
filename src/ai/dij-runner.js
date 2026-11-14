// Executor de modelos do DeepImageJ no ImageL. Substitui o "ImJoyModelRunner" do ambiente ImJoy (que o plugin
// DeepImageJ JS espera) usando TensorFlow.js: o modelo roda no proprio computador, as imagens nao saem dele.
// A ponte Java -> aqui fica em deepimagej-patch/ (classe com.leaningtech.client.Global) e em
// threadhack/runtime/loader.js (nativos nativeText / nativePredict).
//
// Modelos: os pesos TensorFlow.js publicados originalmente sairam do ar; os daqui foram convertidos do arquivo Keras
// oficial do bioimage.io e ficam na branch "models" do repositorio (ver README dessa branch e tools/keras1-to-tfjs.py).
import { createLogger } from '../logger.js';

const log = createLogger('deepimagej');

/** name: como aparece na lista do plugin (sem virgula: a lista viaja separada por virgulas). */
export const MODELS = [
  {
    name: 'sEV TEM Segmentation - Fully Residual U-Net',
    base: 'https://raw.githubusercontent.com/ygorbetine/ImageL/models/frunet_sev/',
    spec: 'model.yaml',
    weights: 'model.json',
    multiple: 16, // 4 poolings: altura e largura multiplas de 16
  },
];

const TF_URL = new URL('../../static/vendor/tfjs/tf.min.js', import.meta.url).href;

/** Altura/largura arredondadas para cima ao multiplo exigido pelo modelo. Pura. */
export function paddedSize(n, multiple) {
  return multiple > 1 ? Math.ceil(n / multiple) * multiple : n;
}

/** Copia HWC para um quadro maior, repetindo a borda (para completar o multiplo). Pura. */
export function padHWC(data, w, h, c, W, H) {
  if (W === w && H === h) return data;
  const out = new Float32Array(W * H * c);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(y, h - 1);
    for (let x = 0; x < W; x++) {
      const sx = Math.min(x, w - 1);
      for (let k = 0; k < c; k++) out[(y * W + x) * c + k] = data[(sy * w + sx) * c + k];
    }
  }
  return out;
}

/** Recorta de volta para w x h. Pura. */
export function cropHWC(data, W, H, c, w, h) {
  if (W === w && H === h) return data;
  const out = new Float32Array(w * h * c);
  for (let y = 0; y < h; y++) out.set(data.subarray(y * W * c, (y * W + w) * c), y * w * c);
  return out;
}

/**
 * Origens dos pedacos (1D) para cobrir `size` com pedacos de `tile` sobrepostos em pelo menos 2*overlap. Pura.
 * O ultimo pedaco encosta na borda (pode sobrepor mais).
 */
export function tileStarts(size, tile, overlap) {
  if (size <= tile) return [0];
  const stride = Math.max(1, tile - 2 * overlap), out = [];
  for (let s = 0; ; s += stride) {
    if (s + tile >= size) { out.push(size - tile); break; }
    out.push(s);
  }
  return out;
}

/** Faixa [from, to) do pedaco que vai para a saida: descarta `overlap` em cada lado, menos nas bordas da imagem. Pura. */
export function keepRange(start, tile, size, overlap, prevEnd) {
  const from = start === 0 ? 0 : Math.max(start + overlap, Math.min(prevEnd, start + tile));
  const to = start + tile >= size ? size : start + tile - overlap;
  return [Math.min(from, to), to];
}

let tfPromise = null;
function loadTf() {
  if (typeof window !== 'undefined' && window.tf) return Promise.resolve(window.tf);
  tfPromise = tfPromise || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TF_URL;
    s.onload = () => (window.tf ? resolve(window.tf) : reject(new Error('TensorFlow.js did not load')));
    s.onerror = () => { tfPromise = null; reject(new Error('could not load TensorFlow.js')); };
    document.head.appendChild(s);
  });
  return tfPromise;
}

async function fetchText(url) {
  let r;
  try { r = await fetch(url); } catch (e) { throw new Error('no connection to the model repository (' + new URL(url).host + ')'); }
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.text();
}

export function createRunner(models = MODELS, deps = { loadTf, fetchText }) {
  const loaded = new Map(); // name -> { model, def }
  let lastError = '';
  const find = name => {
    const def = models.find(m => m.name === name);
    if (!def) throw new Error('unknown model: ' + name);
    return def;
  };
  return {
    lastError: () => lastError,
    async getModels() { return models.map(m => m.name).join(','); },
    /** Carrega os pesos e devolve o YAML do modelo (o plugin le dele tamanhos, halo e macros). */
    async initModel(name) {
      const def = find(name);
      const yaml = await deps.fetchText(def.base + def.spec);
      if (!loaded.has(name)) {
        const tf = await deps.loadTf();
        log.info('carregando modelo', name, 'backend', tf.getBackend && tf.getBackend());
        const model = await tf.loadLayersModel(def.base + def.weights);
        loaded.set(name, { model, def });
      }
      return yaml;
    },
    async getFile(fileName) {
      const cur = [...loaded.values()].pop();
      if (!cur) throw new Error('no model loaded');
      return deps.fetchText(cur.def.base + String(fileName).replace(/^\.?\//, ''));
    },
    /** data: Float32Array HWC. Devolve Float32Array [largura, altura, canais, dados HWC...]. */
    async predict(name, data, w, h, c) {
      try {
        const cur = loaded.get(name) || [...loaded.values()].pop();
        if (!cur) throw new Error('model not loaded: ' + name);
        const tf = await deps.loadTf();
        const m = cur.def.multiple || 1;
        const run = async (input, iw, ih) => { // um pedaco: completa o multiplo, roda e recorta
          const W = paddedSize(iw, m), H = paddedSize(ih, m);
          const x = tf.tensor(padHWC(input, iw, ih, c, W, H), [1, H, W, c], 'float32');
          let y = cur.model.predict(x);
          if (Array.isArray(y)) y = y[0];
          const [, oh, ow, oc] = y.shape.length === 4 ? y.shape : [1, y.shape[0], y.shape[1], y.shape[2] || 1];
          const values = await y.data();
          x.dispose(); y.dispose();
          const cw = Math.round(iw * ow / W), ch = Math.round(ih * oh / H);
          return { data: cropHWC(values, ow, oh, oc, cw, ch), w: cw, h: ch, c: oc };
        };
        const T = cur.def.maxTile || 512, ov = cur.def.overlap || 128;
        let res;
        if (w <= T && h <= T) res = await run(data, w, h);
        else {
          // bloco grande demais para a GPU (limite de textura do WebGL): roda em pedacos sobrepostos e costura o miolo
          const tw = Math.min(T, w), th = Math.min(T, h);
          const xs = tileStarts(w, tw, ov), ys = tileStarts(h, th, ov);
          let outData = null, oc = 1, prevY = 0;
          for (const y0 of ys) {
            const [fy, ty] = keepRange(y0, th, h, ov, prevY);
            let prevX = 0;
            for (const x0 of xs) {
              const [fx, tx] = keepRange(x0, tw, w, ov, prevX);
              const tile = new Float32Array(tw * th * c);
              for (let yy = 0; yy < th; yy++) tile.set(data.subarray(((y0 + yy) * w + x0) * c, ((y0 + yy) * w + x0 + tw) * c), yy * tw * c);
              const r = await run(tile, tw, th);
              if (r.w !== tw || r.h !== th) throw new Error('model output is not the same size as its input; tile too large for this GPU');
              if (!outData) { oc = r.c; outData = new Float32Array(w * h * oc); }
              for (let yy = fy; yy < ty; yy++) {
                outData.set(r.data.subarray(((yy - y0) * tw + (fx - x0)) * oc, ((yy - y0) * tw + (tx - x0)) * oc), (yy * w + fx) * oc);
              }
              prevX = tx;
            }
            prevY = ty;
          }
          res = { data: outData, w, h, c: oc };
        }
        const out = new Float32Array(3 + res.data.length);
        out[0] = res.w; out[1] = res.h; out[2] = res.c;
        out.set(res.data, 3);
        lastError = '';
        return out;
      } catch (e) {
        lastError = String((e && e.message) || e);
        log.error('predict', lastError);
        return new Float32Array(0);
      }
    },
  };
}

let runner = null;
export function getRunner() { return (runner = runner || createRunner()); }
