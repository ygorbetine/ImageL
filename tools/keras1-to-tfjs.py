"""Converte um modelo Keras 1.x (.h5, dim_ordering "tf") para o formato TensorFlow.js "layers-model", sem TensorFlow.

Uso: python tools/keras1-to-tfjs.py modelo.h5 pasta_saida [--name NOME]
Requer h5py e numpy. Camadas aceitas: InputLayer, Convolution2D, ELU, Merge (sum/concat), Dropout,
AveragePooling2D, MaxPooling2D, UpSampling2D, Activation. Qualquer outra interrompe a conversao.

Feito para o modelo "Small Extracellular Vesicle TEM Segmentation (Fully Residual U-Net)" do bioimage.io
(naked-microbe, BSD-3-Clause), cujos pesos TensorFlow.js originais sairam do ar.
"""
import json
import os
import sys

import h5py
import numpy as np

SHARD = 4 * 1024 * 1024


def conv(c):
    return {
        "name": c["name"], "trainable": c.get("trainable", True),
        "filters": c["nb_filter"], "kernel_size": [c["nb_row"], c["nb_col"]],
        "strides": list(c.get("subsample", [1, 1])), "padding": c.get("border_mode", "valid"),
        "data_format": "channels_last", "dilation_rate": [1, 1],
        "activation": c.get("activation", "linear"), "use_bias": c.get("bias", True),
    }


def pool(c):
    return {"name": c["name"], "trainable": c.get("trainable", True), "pool_size": list(c["pool_size"]),
            "strides": list(c.get("strides") or c["pool_size"]), "padding": c.get("border_mode", "valid"),
            "data_format": "channels_last"}


def translate(layer):
    cls, c = layer["class_name"], layer["config"]
    if c.get("dim_ordering", "tf") != "tf":
        raise SystemExit("dim_ordering nao suportado: " + c["dim_ordering"])
    if cls == "InputLayer":
        shape = list(c["batch_input_shape"])
        shape[1] = shape[2] = None  # totalmente convolucional: aceita qualquer tamanho (multiplo do pooling)
        return "InputLayer", {"name": c["name"], "batch_input_shape": shape, "dtype": c.get("input_dtype", "float32"), "sparse": False}
    if cls == "Convolution2D":
        return "Conv2D", conv(c)
    if cls == "ELU":
        return "ELU", {"name": c["name"], "trainable": c.get("trainable", True), "alpha": float(c.get("alpha", 1.0))}
    if cls == "Dropout":
        return "Dropout", {"name": c["name"], "trainable": c.get("trainable", True), "rate": float(c.get("p", 0.5))}
    if cls == "AveragePooling2D":
        return "AveragePooling2D", pool(c)
    if cls == "MaxPooling2D":
        return "MaxPooling2D", pool(c)
    if cls == "UpSampling2D":
        return "UpSampling2D", {"name": c["name"], "trainable": c.get("trainable", True), "size": list(c["size"]), "data_format": "channels_last"}
    if cls == "Activation":
        return "Activation", {"name": c["name"], "trainable": c.get("trainable", True), "activation": c["activation"]}
    if cls == "Merge":
        mode = c.get("mode")
        if mode == "sum":
            return "Add", {"name": c["name"], "trainable": c.get("trainable", True)}
        if mode == "concat":
            return "Concatenate", {"name": c["name"], "trainable": c.get("trainable", True), "axis": c.get("concat_axis", -1)}
        raise SystemExit("Merge mode nao suportado: %r" % mode)
    raise SystemExit("camada nao suportada: " + cls)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src, out = args[0], args[1]
    name = sys.argv[sys.argv.index("--name") + 1] if "--name" in sys.argv else "model"
    os.makedirs(out, exist_ok=True)
    f = h5py.File(src, "r")
    mc = f.attrs["model_config"]
    cfg = json.loads(mc.decode() if isinstance(mc, bytes) else mc)
    if cfg["class_name"] != "Model":
        raise SystemExit("so modelos funcionais (Model)")
    layers = []
    for layer in cfg["config"]["layers"]:
        cls, c = translate(layer)
        inbound = [[[n[0], n[1], n[2], {}] for n in node] for node in layer.get("inbound_nodes", [])]
        layers.append({"name": layer["name"], "class_name": cls, "config": c, "inbound_nodes": inbound})
    topology = {
        "keras_version": "2.2.4", "backend": "tensorflow",
        "model_config": {"class_name": "Model", "config": {
            "name": name, "layers": layers,
            "input_layers": cfg["config"]["input_layers"], "output_layers": cfg["config"]["output_layers"]}},
    }
    mw = f["model_weights"] if "model_weights" in f else f
    specs, blobs, total = [], [], 0
    for layer in layers:
        if layer["class_name"] != "Conv2D":
            continue
        g = mw[layer["name"]]
        names = [n.decode() if isinstance(n, bytes) else n for n in g.attrs["weight_names"]]
        for n in names:
            arr = np.asarray(g[n], dtype="<f4")
            kind = "kernel" if n.endswith("_W") or n.endswith("_W:0") else "bias"
            expect = 4 if kind == "kernel" else 1
            if arr.ndim != expect:
                raise SystemExit("forma inesperada em %s: %s" % (n, arr.shape))
            specs.append({"name": "%s/%s" % (layer["name"], kind), "shape": list(arr.shape), "dtype": "float32"})
            blobs.append(arr.tobytes())
            total += arr.size
    data = b"".join(blobs)
    paths = []
    count = (len(data) + SHARD - 1) // SHARD
    for i in range(count):
        p = "group1-shard%dof%d.bin" % (i + 1, count)
        with open(os.path.join(out, p), "wb") as fh:
            fh.write(data[i * SHARD:(i + 1) * SHARD])
        paths.append(p)
    model = {"format": "layers-model", "generatedBy": "keras v" + str(f.attrs.get("keras_version", b"1").decode() if isinstance(f.attrs.get("keras_version"), bytes) else f.attrs.get("keras_version")),
             "convertedBy": "ImageL tools/keras1-to-tfjs.py", "modelTopology": topology,
             "weightsManifest": [{"paths": paths, "weights": specs}]}
    with open(os.path.join(out, "model.json"), "w", encoding="utf-8") as fh:
        json.dump(model, fh)
    print("ok: %d camadas, %d parametros, %d bytes em %d arquivos" % (len(layers), total, len(data), count))


if __name__ == "__main__":
    main()
