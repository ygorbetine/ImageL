# ImageL

**ImageJ com interface moderna — no navegador e como app de desktop (Windows).** · *ImageJ with a modern interface — in the browser and as a Windows desktop app.*

ImageL é um fork do [imagej.js](https://github.com/aicell-lab/imagej.js) (ImageJ rodando via WebAssembly/CheerpJ). Mantém **todas as funções originais do ImageJ** e acrescenta:

- Interface moderna e leve: tema escuro/claro, ícones grandes, paleta de comandos (Ctrl+K), PT/EN.
- **Distância entre grupos (scratch assay):** contornos suaves + medições automáticas, também em lote por pasta.
- Desktop (Tauri): modo **"Sem fundo"** (barras e janelas flutuando sobre a área de trabalho, entre monitores, com click-through e sempre no topo).
- Ferramenta de IA para gerar macros do ImageJ.

## Download
Na página de [Releases](../../releases):

| Arquivo | Para quê |
|---|---|
| `ImageL-<versão>-setup.exe` | Instalador (versão offline). |
| `ImageL-<versão>-offline.exe` | Arquivo único, **funciona sem internet** (~88 MB). |
| `ImageL-<versão>.exe` | Arquivo único leve (~56 MB); baixa o runtime na 1ª execução. |

Requer Windows 10/11 com WebView2 (já incluído no Windows 11).

## Manual
[Português](docs/MANUAL.pt.md) · [English](docs/MANUAL.en.md) · [Plano de ação](docs/PLANO.md) · [CHANGELOG](CHANGELOG.md)

## Desenvolvimento
```bash
npm install
npm test                       # testes (node:test)
node tools/build-site.mjs      # monta dist/ (use --offline para embutir o CheerpJ)
node tools/build-desktop.mjs   # gera os binários em release/
```
Para o build offline, o runtime precisa estar em `vendor/cheerpj/4.2` (ignorado pelo git; veja `tools/fetch-cheerpj.mjs`).

## Créditos e licenças
Veja [THIRD_PARTY.md](THIRD_PARTY.md). O README original do imagej.js está em [README.imagejs.md](README.imagejs.md).
