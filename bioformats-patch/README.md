# bioformats-patch

O Bio-Formats usa o TurboJPEG (biblioteca nativa, via JNI) no leitor NDPI/Hamamatsu. O CheerpJ nao carrega bibliotecas
nativas, e a falha ao carrega-la derrubava o Bio-Formats inteiro ("TurboJPEG could not be loaded").

Este patch troca so a parte nativa por Java puro, mantendo a API que o Bio-Formats chama:

| Classe | O que faz |
| --- | --- |
| `org.libjpegturbo.turbojpeg.TJ` | constantes de formato de pixel e `getPixelSize` |
| `org.libjpegturbo.turbojpeg.TJDecompressor` | decodifica JPEG com `javax.imageio` (RGB, BGR, cinza, 4 canais) |
| `org.scijava.nativelib.NativeLibraryUtil` | informa "turbojpeg" como disponivel; outras bibliotecas nativas continuam indisponiveis |

Aplicar (recompila e regrava `lib/ImageJ/plugins/bioformats_package.jar`, removendo tambem as `.dll/.so/.dylib` embutidas):

```bash
python tools/patch-bioformats.py
```

O jar ja aplicado fica marcado com `META-INF/imagel-patch.txt`.

Limites conhecidos:

- Testado: Bio-Formats Importer abrindo TIFF em pilha. Nao foi testado com um arquivo `.ndpi` real.
- A decodificacao pode diferir em +-1 nivel por canal em relacao ao libjpeg-turbo (IDCT diferente).
- Bio-Formats Exporter (OME-TIFF) ainda falha: precisa de leitura/escrita aleatoria, que o `/local` nao oferece.
