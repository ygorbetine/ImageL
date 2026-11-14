"""Converte um modelo Keras 2.x (.h5 completo, com model_config) para o formato TensorFlow.js "layers-model", sem TensorFlow.

Uso: python tools/keras2-to-tfjs.py modelo.h5 pasta_saida
Requer h5py e numpy. A topologia vai como esta (o TensorFlow.js le o JSON do Keras 2); so os pesos sao reorganizados.
Camadas com Lambda (codigo Python embutido) nao sao convertidas: o script interrompe.
"""
import json
import os
import sys

import h5py
import numpy as np

SHARD = 4 * 1024 * 1024


def text(v):
    return v.decode() if isinstance(v, bytes) else str(v)


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    f = h5py.File(src, "r")
    cfg = json.loads(text(f.attrs["model_config"]))
    if cfg["class_name"] not in ("Model", "Functional", "Sequential"):
        raise SystemExit("classe de modelo nao suportada: " + cfg["class_name"])
    layers = cfg["config"]["layers"] if isinstance(cfg["config"], dict) else cfg["config"]
    bad = sorted({l["class_name"] for l in layers if l["class_name"] in ("Lambda", "TFOpLambda")})
    if bad:
        raise SystemExit("camadas com codigo embutido nao suportadas: " + ", ".join(bad))
    mw = f["model_weights"] if "model_weights" in f else f
    specs, blobs, total = [], [], 0
    for layer in layers:
        name = layer["config"]["name"]
        if name not in mw:
            continue
        g = mw[name]
        for n in [text(x) for x in g.attrs.get("weight_names", [])]:
            arr = np.asarray(g[n], dtype="<f4")
            specs.append({"name": n.split(":")[0], "shape": list(arr.shape), "dtype": "float32"})
            blobs.append(arr.tobytes())
            total += arr.size
    data = b"".join(blobs)
    paths = []
    count = max(1, (len(data) + SHARD - 1) // SHARD)
    for i in range(count):
        p = "group1-shard%dof%d.bin" % (i + 1, count)
        with open(os.path.join(out, p), "wb") as fh:
            fh.write(data[i * SHARD:(i + 1) * SHARD])
        paths.append(p)
    model = {"format": "layers-model", "generatedBy": "keras v" + text(f.attrs.get("keras_version", "2")),
             "convertedBy": "ImageL tools/keras2-to-tfjs.py",
             "modelTopology": {"keras_version": text(f.attrs.get("keras_version", "2.2.4")), "backend": "tensorflow", "model_config": cfg},
             "weightsManifest": [{"paths": paths, "weights": specs}]}
    with open(os.path.join(out, "model.json"), "w", encoding="utf-8") as fh:
        json.dump(model, fh)
    print("ok: %d camadas, %d parametros, %d bytes em %d arquivos" % (len(layers), total, len(data), count))


if __name__ == "__main__":
    main()
