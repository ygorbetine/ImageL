# ImageL models

Model weights used by ImageL's DeepImageJ runner, converted to TensorFlow.js so they run locally in the browser.

## frunet_sev

**Small Extracellular Vesicle TEM Segmentation (Fully Residual U-Net)**
bioimage.io id `naked-microbe` (https://bioimage.io/#/?id=naked-microbe), Zenodo record 6559475. License: **BSD-3-Clause**.
Authors: Estibaliz Gómez-de-Mariscal, Martin Maška, Anna Kotrbová, Vendula Pospíchalová, Pavel Matula, Arrate Muñoz-Barrutia.

- `model.json` + `group1-shard*.bin`: converted from the published Keras file `fully_residual_dropout_segmentation.h5`
  (sha256 `5122cbff7451136102eabfc8c80771dbba5ec477d5dac186f729cdfbb4605ff6`) with `tools/keras1-to-tfjs.py` from the ImageL
  repository. Weights are unchanged (float32); only the container format differs. The input size was made flexible.
- `model.yaml`: the same model description written in the older (0.3) block-style format that the DeepImageJ JS plugin can parse.
- `rdf.yaml`, `preprocessing.txt`, `postprocessing.txt`, `postprocessingWatershed.txt`: copied unchanged from the bioimage.io record.

Validation: on the record's `exampleImage.npy`, the converted model matches `resultImage.npy` on 99.85% of pixels after the 0.4 threshold.
