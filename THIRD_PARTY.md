# Créditos e licenças de terceiros

| Componente | Autor | Licença |
|---|---|---|
| [ImageJ](https://imagej.net) | Wayne Rasband, NIH | Domínio público |
| [imagej.js](https://github.com/aicell-lab/imagej.js) (base deste fork) | aicell-lab / ImJoy | MIT |
| [CheerpJ](https://cheerpj.com) (runtime Java→WebAssembly) | Leaning Technologies | Veja os termos da Leaning Technologies* |
| [Tauri](https://tauri.app) (shell desktop) | Tauri contributors | MIT / Apache-2.0 |
| tiny_http | tiny-http contributors | MIT / Apache-2.0 |

\* O build **offline** inclui arquivos do runtime CheerpJ 4.2 (`cheerpj/4.2`). Antes de redistribuir publicamente esse binário, confirme que os termos de licença do CheerpJ permitem a redistribuição no seu caso de uso; a versão online (`ImageL-<v>.exe`) baixa o runtime direto do servidor da Leaning Technologies.

O ImageL é distribuído sob a licença MIT (código próprio), respeitando as licenças acima.

## TensorFlow.js

`static/vendor/tfjs/tf.min.js` (@tensorflow/tfjs 4.22.0), Apache License 2.0, Google LLC. Usado pelo executor de modelos do DeepImageJ.

## Modelo sEV TEM Segmentation (Fully Residual U-Net)

bioimage.io `naked-microbe` (Zenodo 6559475), BSD-3-Clause. Autores: Estibaliz Gomez-de-Mariscal, Martin Maska, Anna Kotrbova, Vendula Pospichalova, Pavel Matula, Arrate Munoz-Barrutia. Pesos convertidos para TensorFlow.js na branch `models` deste repositorio (ver o README dessa branch).

## DeepImageJ JS

`lib/ImageJ/plugins/DeepImageJ_JS_*.jar` (deepimagej/deepimagej.js, BSD-2-Clause). O jar recebe a classe `com.leaningtech.client.Global` de `deepimagej-patch/`.
