# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (ver `ROADMAP.md`).

## [Unreleased]
### Corrigido
- DeepImageJ: notificacoes atrasadas de uma chamada antiga do plugin nao acordam mais o `wait()` das chamadas seguintes. A "falha na 2a execucao" investigada era na verdade o `IJ.run` voltando antes de o plugin terminar o pos-processamento (o resultado sai normalmente, IoU 0,973 em 6 execucoes seguidas na mesma sessao).

## [0.6.0-alpha.54]
### Corrigido
- **Comandos com dialogo pelos menus e pela paleta da interface nova** (Gaussian Blur..., Set Scale..., plugins...) nao faziam nada: o caminho de macro silenciosa devolvia "sucesso" sem abrir o dialogo. Sem opcoes, a interface agora chama `IJ.run(comando)`, como o menu original.
- Chamadas de fundo ao Java (tema das janelas, ajuste de janela, destaque da ferramenta) sao puladas enquanto outro comando esta em andamento; antes podiam colidir com ele ("Java code still running").
### Adicionado
- **DeepImageJ executa modelos** (Plugins > DeepImageJ > DeepImageJ Run), localmente, com TensorFlow.js (as imagens nao saem do computador):
  - ponte Java -> JavaScript em `deepimagej-patch/` e `threadhack/runtime/loader.js`; executor em `src/ai/dij-runner.js`; TensorFlow.js 4.22 embutido em `static/vendor/tfjs/`.
  - modelo disponivel: *Small Extracellular Vesicle TEM Segmentation (Fully Residual U-Net)* (bioimage.io `naked-microbe`, BSD-3). Os pesos TensorFlow.js originais sairam do ar; foram reconvertidos do arquivo Keras oficial com `tools/keras1-to-tfjs.py` e ficam na branch `models` do repositorio.
  - blocos maiores que 512 px sao divididos e costurados pelo executor (limite de textura do WebGL).
### Testes
- Modelo convertido: 99,85% de concordancia pixel a pixel com o tensor de teste oficial (Node e dentro do app, WebGL).
- Fluxo completo pelo plugin (pre-processamento, modelo, pos-processamento) na imagem de teste oficial: mascara com IoU 0,973 em relacao a referencia; imagem 1000x1000 em ~15 s.
### Conhecido
- A **segunda execucao do DeepImageJ na mesma sessao** termina sem processar ("Error while handling user native"); reiniciar o ImageL entre execucoes. Causa ainda nao identificada.
- So ha um modelo: os demais do bioimage.io nao tem pesos TensorFlow.js.

## [0.6.0-alpha.53]
### Corrigido
- **Ferramenta de texto**: Ctrl+D (desenhar) e Ctrl+B (adicionar ao overlay) eram digitados como letras no texto em edicao (no CheerpJ, Ctrl+letra chega ao ImageJ como a propria letra). Com a ferramenta de texto ativa, Ctrl+letra agora executa o comando da tabela de atalhos do ImageJ.
- **DeepImageJ Run**: em vez de `NoClassDefFoundError`, explica que o plugin depende do executor de modelos do ImJoy, ausente nesta versao (`deepimagej-patch/`, `tools/patch-deepimagej.py`).
### Testes
- TurboJPEG em Java puro validado no caminho do leitor NDPI: JPEG com 600 marcadores de reinicio decodificado em blocos pelo `JPEGTurboServiceImpl`, identico a decodificacao completa (diferenca 0).
- Ferramenta de texto com digitacao real; `javax.imageio` decodifica JPEG no CheerpJ.

## [0.6.0-alpha.52]
### Corrigido
- **F5 e Ctrl+R recarregavam o app** (perdendo o trabalho) e outros atalhos eram capturados pelo WebView (Ctrl+F, Ctrl+P, Ctrl+S, Ctrl+H...). No desktop esses atalhos agora vao so para o ImageJ (Ctrl+R = Revert, Ctrl+H = Histogram, Ctrl+Shift+I = Invert).
- **Sem fundo**: a janela crescia a cada ida e volta (salvava o tamanho externo e restaurava como interno).
### Testes (rodada 3)
- Cliques reais nos menus e submenus, paleta, atalhos de teclado, pincel, balde, ROI Manager, janela classica, Sem fundo; plugins ThunderSTORM, MorphoLibJ, ActionBar e Bio-Formats abrem seus dialogos.
## [0.6.0-alpha.51]
### Corrigido
- **Bio-Formats Exporter** (OME-TIFF e demais formatos de escrita) funciona: o `NIOFileHandle` do Bio-Formats usava FileChannel, que falha no CheerpJ ao gravar; foi trocado por uma versao com a mesma API sobre RandomAccessFile (`bioformats-patch/`).
- **/local com leitura e escrita aleatoria**: arquivos abertos para escrita compartilham um buffer entre descritores, existem assim que sao criados e respeitam `setLength`. O arquivo e salvo fora do app uma unica vez por gravacao.
### Testes
- OME-TIFF 16 bits com 5 fatias exportado e reimportado no ImageL com os mesmos valores do ImageJ nativo.

## [0.6.0-alpha.50]
### Adicionado
- **Mais formatos de imagem**: o Bio-Formats Importer agora funciona (Plugins > Bio-Formats). O TurboJPEG nativo, que o CheerpJ nao carrega, foi trocado por uma versao em Java puro (`bioformats-patch/`, `tools/patch-bioformats.py`).
### Conhecido
- Bio-Formats Exporter (OME-TIFF) ainda falha: precisa de leitura/escrita aleatoria em `/local`.
- Leitor NDPI nao testado com arquivo real.

## [0.6.0-alpha.49]
Bateria comparativa com o ImageJ nativo (mesmo `ij.jar`, JDK 17).
### Corrigido
- **Plugins**: Bio-Formats, MorphoLibJ, ThunderSTORM, ActionBar e DeepImageJ nao apareciam no desktop (o servidor local nao listava pastas com `index.list`). A arvore de menus agora e identica a do ImageJ nativo (620 itens).
- **Salvar (desktop)**: grava direto na pasta Downloads; o WebView pedia permissao para "baixar varios arquivos" a partir do segundo arquivo. Salvar de novo com o mesmo nome sobrescreve o arquivo criado na sessao.
- **Salvar e reabrir**: o arquivo salvo fica em `/local` (Open, Revert e salvar por cima funcionam, como no ImageJ).
### Adicionado
- **Duplo clique nas ferramentas** abre as opcoes, igual a toolbar do ImageJ (Roi Defaults, Rounded Rect, Selection Brush, Line Width, Arrow, Angle, Point, Wand, Fonts, Color Picker, lupa = zoom original, opcoes das ferramentas de macro).
- O destaque da ferramenta acompanha o ImageJ (mudanca por macro, atalho ou toolbar antiga).
### Testes
- 58 operacoes de imagem e 7 do MorphoLibJ com resultado numerico identico ao nativo; todas as ferramentas testadas com clique e arrasto reais.
## [0.6.0-alpha.48]
### Corrigido
- **Abrir (File > Open)**: a lista de arquivos mostrava "undefined" (`localFS.listDirectory` devolve nomes, o navegador esperava objetos). Sem arquivos carregados, Abrir vai direto ao seletor do sistema.
- **Toolbar antiga (janela "ImageJ")**: o X encerrava o ImageJ de vez e nao dava para reabrir; agora so esconde, e o botao da barra reabre. "Quit" do menu novo nao mata mais o Java.
- **Menus**: submenus altos (Open Samples, Selection, Lookup Tables...) eram cortados no fim da tela; agora cabem e rolam.
- **Menus do ImageJ antigo**: dropdowns nao sao mais cortados pela borda da janela.
### Testes
- Varredura de 331 comandos dos menus File/Edit/Image/Process/Analyze/Plugins sem erros.

## [0.6.0-alpha.47]
- Build offline: texto das janelas Java (Results, Log, mensagens, Macro Error) voltou a aparecer. Causa: o servidor local entregava o index.html no lugar de arquivos inexistentes do CheerpJ e faltavam as listas de diretório (status 231) e as fontes.
- Corrigido: ROI Manager (e qualquer componente Swing) falhava com ClassCastException/UnsatisfiedLinkError: o carregador de classes redefinia javax.*; agora delega ao JDK. Native `Unsafe.throwException` implementado.
- Revertido o patch do MultiLineLabel da 0.6.0-alpha.46 (diagnóstico errado; não era necessário).
- Dois servidores locais (app e runtime CheerpJ com CORS), como no modo online.

## [0.6.0-alpha.46]
- Corrigido: janelas de mensagem e "Macro Error" do ImageJ apareciam vazias (MultiLineLabel patchado; ver imagej-patch/).

## [0.6.0-alpha.45]
- Build offline (`--offline`): CheerpJ embutido, sem internet. Instalador NSIS. `tools/build-desktop.mjs` gera os 3 binários com a versão no nome.
- Removida a telemetria (Google Analytics) do app desktop.

## [0.6.0-alpha.44]
- Gap: remove espigões estreitos (célula solta/detrito) dos contornos.
- Desktop: versão no título da janela e no nome do arquivo (ImageL-<versão>.exe).

## [0.6.0-alpha.43]
- Gap: filtro passa-alta (FFT Bandpass, padrão 40 px; 0 = desligado) antes da detecção, para pegar células fracas.

## [0.6.0-alpha.42]
- Corrigido: dropdown (Choice) dos diálogos Java fechava na hora (CheerpJ devolvia o foco ao textarea oculto).
- Desktop: arrastar arquivos para a janela volta a abrir a imagem (dragDropEnabled=false no Tauri).

## [0.6.0-alpha.41]
- Corrigido: dropdown (Choice) dos diálogos Java fechava na hora; o tema não consulta mais o Java quando só abre um popup.

## [0.6.0-alpha.40]
- Campos de texto dos diálogos Java agora escuros (a regra de borda do index.html forçava fundo branco).

## [0.6.0-alpha.39]
- Adicionado docs/MANUAL.md.

## [0.6.0-alpha.38]
- Menu de "mais ferramentas" abre ao lado do botão » (antes ficava num canto fixo).

## [0.6.0-alpha.37]
- Sem fundo: a barra de status agora fica dentro do painel de topo (some o problema de voltar à posição inicial).

## [0.6.0-alpha.36]
- A posição salva é aplicada antes de trocar a classe do modo: a barra não passa mais pela posição padrão ao alternar.

## [0.6.0-alpha.35]
- Corrigido: ao trocar de modo a barra/aba saltava pela posição padrão antes de ir à salva (parecia recriada); a posição salva agora é aplicada no mesmo quadro.

## [0.6.0-alpha.34]
### Added
- "No background" / "With background" now remember where bars and floating windows were left, per mode (also across sessions); positions are clamped to the visible area on restore.

## [0.6.0-alpha.33]
### Added
- Gap distance: **auto orientation** (detects horizontal/vertical band; new default), **batch folder** mode (menu ImageL; Shift+click on the new quick-access button in the top bar) with summary table "Gap batch" and optional annotated PNGs, PT/EN dialog and messages.
- Quick-access button for Gap distance in the top bar.
### Fixed
- Java dialog text fields: dark background and readable text (inline CheerpJ styles overridden).
- Open/Save file dialog now follows the dark/light theme.
- i18n audit: toolbar, menus, palette, classic/lite/orientation labels now translated (PT/EN).

## [0.6.0-alpha.32]
### Fixed
- Desktop "No background": IPC commands now permitted for the local asset origin (always-on-top and click-through work), no window frame/shadow, and the transparent window spans all monitors so bars and windows move anywhere; size/position restored on exit.

## [0.6.0-alpha.31]
### Fixed
- Desktop: opens the new shell (`?ui=new`) by default; local asset server is multi-threaded and streams slices without copying (ImageJ now loads in the Tauri window).

## [0.6.0-alpha.30]
### Fixed
- Desktop: ImageJ did not load inside the Tauri window (CheerpJ needs HTTP Range requests, which the asset protocol lacks). The app now serves its embedded files from a local 127.0.0.1 server with Range support; still a single .exe.
- Desktop: executable is now `ImageL.exe`; icons regenerated from the cell logo (`node tools/make-icons.mjs`).

## [0.6.0-alpha.29]
### Added
- Gap distance: option to add each measurement line to the Results table (like Ctrl+M).

## [0.6.0-alpha.28]
### Added
- Desktop: pin button in the topbar toggles always-on-top in "No background" mode (default on, persisted); turned off in "With background".

## [0.6.0-alpha.27]
### Changed
- Gap distance: borders now hug the cells (fine refinement + 1D closing); new "Curve smoothing" option (0-10).

## [0.6.0-alpha.26]
### Changed
- Gap distance: draws the two group borders (top/bottom contours, like the manual freehand outline) plus the straight measurement lines; contours are outlier-filtered (loose cells, dust) and smoothed; Li threshold follows sparse border cells.

## [0.6.0-alpha.25]
### Changed
- Horizontal toolbar always sits on its own row below the menu bar (no longer merged into the top bar).

## [0.6.0-alpha.24]
### Added
- Image windows: releasing the mouse after resizing a window fits the image zoom to the new window size (user-driven resizes only).

## [0.6.0-alpha.23]
### Added
- Toolbar: Freehand line, Rounded rectangle, Rotated rectangle, Elliptical and Selection brush (variants in the group flyouts).
### Fixed
- "Paintbrush" button now selects the real Paintbrush tool (was the selection brush).

## [0.6.0-alpha.22]
- Janelas Java: conteudo pintado pelo Java (Results, Log, dialogos, molduras) passa por filtro SVG com a paleta do tema (branco->superficie, preto->texto, cinzas->superficie2) em vez de inversao simples; botoes estreitos sem borda que corta texto; borda azul sutil na janela sob o mouse.

## [0.6.0-alpha.21]
- Acabamento das janelas Java: cantos 10px, sombra em camadas, titulo que esmaece quando a janela nao esta em foco, controles circulares, rolagem em pilula com hover azul, botao OK/Apply/Run em azul, foco visivel e selecao de texto no tema.

## [0.6.0-alpha.20]
- Janelas Java: componentes AWT (DIV/INPUT com estilo inline) agora seguem os tokens do tema: paineis, rotulos, botoes, campos, checkbox (B&C, Histograma, dialogos). Sem lista de imagens (Java ocupado) usa heuristica de forma, reavalia depois e nunca empilha consultas.

## [0.6.0-alpha.19]
- Tema claro das janelas Java (titulo, menus, rolagem usam os mesmos tokens do shell); janelas so escurecem depois de conhecer os titulos de imagem (nunca inverte uma imagem).

## [0.6.0-alpha.18]
- Tema escuro completo nas janelas Java: janelas de imagem escurecem so a moldura/linha de info (a imagem nunca e alterada); Results, Log, dialogos e editores escurecem por inteiro. Funciona mesmo com dialogo modal aberto; display do CheerpJ e esperado ate existir.

## [0.6.0-alpha.17]
- Tema escuro nas janelas Java: menus/rolagem/submenus via CSS; Results, Log, dialogos e editores (nao imagens) escurecem por inversao do canvas, marcados por src/ui/java-theme.js.

## [0.6.0-alpha.16]
- Fix: Balde e Dev ("Unrecognized tool name") agora usam o indice numerico do setTool (17 e 15). Teste no ImageJ real: todas as 18 ferramentas selecionam.
- Gap distance roda em modo normal do ImageJ (o modo silencioso/batch quebrava a selecao de imagens).

## [0.6.0-alpha.15]
- Fix: Tab capturado antes do CheerpJ; paleta aberta no mouse fecha corretamente (hidden vs .at).

## [0.6.0-alpha.14]
- Fix: bridge lia o retorno de runMacroSilent com Array.from (proxy Java nao iteravel) -> "Cannot convert a Symbol value to a number".
- Barra de titulo das janelas Java com 20px (CheerpJ posiciona o menu em y=20; titulo ficava cortado), botoes 18px com traco fino.
- Removida a barra branca do rodape (::before do CheerpJ).
- Tab abre a busca de comandos onde o mouse esta (sobre area vazia).

## [0.6.0-alpha.13]
- CSS do shell/tema com ?v=versao (cache antigo mantinha a barra branca). Pontos mais suaves. docs/compare.html: comparacao ao vivo original x ImageL.

## [0.6.0-alpha.12]
- Fix: fundo de pontos agora aparece (contêiner do CheerpJ era opaco) e some a linha branca no rodape (cantos arredondados do tema).
- Logo: celulas separadas com gradiente interno. docs/COMPARISON.md.

## [0.6.0-alpha.11]
- Logo/icone do ImageL: celulas com nucleos vistas ao microscopio (static/logo.svg), usado no favicon, splash e barra superior.

## [0.6.0-alpha.10]
- Visual volta ao do mockup: toolbar vertical por padrao (horizontal so em telas baixas), barra de status em faixa, fundo de pontos, seletor Com/Sem fundo sempre visivel.

## [0.6.0-alpha.9]
- Fix: voltar de "Sem fundo" para "Com fundo" mantinha posicoes arrastadas das barras (toolbar deslocada); agora reseta.
- Fundo "Com fundo" com grade leve em dois niveis; barras de rolagem discretas.

## [0.6.0-alpha.8]
- Menu ImageL > "Distancia entre grupos (scratch)": mede a lacuna entre dois grupos de celulas em N linhas (parametros em dialogo: nº de medicoes, raio, margem, direcao, media anterior, limiar de movimento %), tabela, overlay e relatorio. Validado no app real com imagem sintetica.

## [0.6.0-alpha.7]
- Janela Java original do ImageJ oculta no shell novo (continua viva); botao na barra para mostrar o ImageJ classico.

## [0.6.0-alpha.6]
- Layout compacto: toolbar na mesma linha da barra superior (>=1180px), ferramentas agrupadas com flyout (clique de novo ou botao direito), tooltips com nome+atalho, status em pilula flutuante.
- Fix: `refresh()` quebrava com os botoes de grupo e deixava o menu vazio ao alternar lite/idioma.

## [0.6.0-alpha.5]
- Toolbar horizontal por padrao, vertical automatico em tela estreita/alta, botao alterna (duplo clique volta ao auto).
- Menus que nao cabem na barra vao para a seta "»" (antes ficavam escondidos).

## [0.6.0-alpha.4]
- Toolbar maior (icones 30px, mesma espessura), novo icone de angulo, botoes Balde e Dev, flyout "More tools" (>>) com as ferramentas de macro.
- Bridge usa Interpreter.runMacroSilent quando disponivel (sem dialogos modais).

## [0.6.0-alpha.3] - 2026-11-06

### Added
- `src/ui/ij-menus.js`: a casca le o menu REAL do ImageJ (todos os menus, submenus, plugins instalados e **Extensions**), com PT quando ha traducao; falha -> lista padrao.
- Ferramentas na mesma ordem e forma da barra original (retangulo, oval, poligono, mao livre, linha, angulo, ponto, varinha, texto, lupa, mao, conta-gotas + segmentada, multiponto, pincel, seta), icones atualizados com traco grosso.
- `tools/run-prepare.sh`: gera `ij.jar` no Windows com JDK do sistema + Ant portatil (`.tools/`).

### Fixed
- Abas do menu superior empilhavam e vazavam da barra: agora em linha horizontal.
- `prepare.sh`: ignora CRLF no `plugins_manifest.txt`; `threadhack/java/build.sh`: `javac -encoding UTF-8`.

### Changed
- **Pool de workers padrao = 0** em todas as maquinas (medido: boot ~23 s contra >90 s com workers). Paralelismo so com `?pool=N`.

### Verified (ImageJ real, ij.jar gerado localmente)
- ImageJ 1.54s6 abre com a casca nova (533 comandos), menu real com Extensions e macro `run("Gaussian Blur...")` executada pela ponte.

## [0.6.0-alpha.2] - 2026-11-06

### Added
- `src/ui/ai-panel.js`: painel "IA" na topbar (pedido em linguagem natural, modo Sugerir/Semi/Autonomo, parar, copiar protocolo); usa as receitas offline.
- Acessibilidade da casca: `aria-label` nas ferramentas e botoes de icone, foco visivel, respeito a `prefers-reduced-motion`.

## [0.6.0-alpha.1] - 2026-11-06

### Added
- `src/ai/agent.js`: nucleo da IA analista autonoma (planejar -> executar -> verificar -> iterar) com validador de macros (bloqueia `File.delete`, `exec`, `eval`, `call`, `Quit`; marca como arriscado salvar/fechar/reverter), modos `suggest`/`semi`/`auto`, orcamento de passos e tempo, cancelamento, log de auditoria e `toProtocol()` (protocolo reproduzivel).
- `src/ai/recipes.js`: provider offline de receitas classicas (contar objetos brilhantes, medir intensidade, fracao de area por limiar); sempre trabalha em uma copia da imagem.
- `ROADMAP.md` 6.1: camadas de algoritmos da IA, do mais barato (classicos) ao mais caro (deep learning/LLM), todas opt-in alem da primeira.
- Testes do agente e das receitas (31 no total).

### Notes
- Ainda sem provider de LLM remoto nem painel "IA" na UI; so o nucleo e as receitas offline.

## [0.3.0] - 2026-11-06

### Added
- `desktop/` (Tauri v2): shell desktop leve com janela transparente, modo "Sem fundo", sempre no topo e click-through por regioes ativas (`set_overlay`, `set_hit_regions`, `set_always_on_top`; thread de ~30 ms consulta o cursor).
- `src/desktop.js`: ponte JS<->Tauri (reporta retangulos interativos; Ctrl+Shift+P fixa no topo).
- `tools/build-site.mjs` e scripts `desktop:dev`/`desktop:build`.

## [0.2.0] - 2026-11-06

### Added
- **Nova casca de UI (opt-in `?ui=new`, volta com `?ui=classic`)**: `src/ui/shell.js` + `static/shell.css` — topbar com menus do ImageJ (PT/EN, submenus, atalhos), toolbar vertical com icones SVG grossos, statusbar, paleta de comandos (`Ctrl/Cmd+K`), alternar tema/idioma/modo leve.
- `src/ui/menus.js`: arvore de menus padrao do ImageJ com rotulos PT/EN (o `cmd` continua em ingles) e busca sem acento nos dois idiomas.
- `src/ui/bridge.js`: ponte JS->ImageJ via `IJ.runMacro` (`run(...)`, `setTool(...)`) com escape de macro.
- `src/ui/draggable.js` ligado: barras arrastaveis no modo "Sem fundo".
- Testes de menus, busca, bridge e splash (20 no total).

### Fixed
- `splash.fail()` lancava `TypeError` ao receber objetos sem prototipo (ex.: erro do CheerpJ); agora mostra mensagem segura e traduzida.

### Notes
- A casca e opt-in porque ainda nao foi validada com o ImageJ real (sem `ij.jar` na maquina de desenvolvimento). "Sem fundo" so aparece no shell desktop.

## [0.1.0] - 2026-11-06

### Added
- `src/lazy.js`: ome-loader (so com `?load=`), touch-controller (so em dispositivos com toque) e Cellpose (no clique do menu) carregam sob demanda; acaba o 404 de `cellpose-integration.js` no boot.
- `src/lite.js`: modo leve automatico (<=4 nucleos, <=4 GB, economia de dados, reduced-motion) com override `?lite=1|0`; desliga transicoes, animacoes, sombras e blur.
- `static/theme.css`: tema flat escuro das janelas Java (title bar de 28 px, botoes de 24 px com traco grosso, sem gradiente).
- Testes do modo leve (12 no total).

### Changed
- CSS das janelas saiu do `index.html` para `static/theme.css`.

## [0.1.0-alpha.2] - 2026-11-06

### Added
- `src/boot.js`: JS inline de `index.html` extraido (cacheavel), `console.*` -> logger.
- `src/splash.js` + splash no `index.html`: progresso por etapas, i18n, aviso de demora (45 s).
- `static/tailwind.css` (Tailwind compilado, ~9 KB) e `npm run build:css`.
- `sw.js`: Service Worker (stale-while-revalidate so da casca; ignora Range/JARs/cross-origin).
- Requisito "leve em qualquer computador" no `ROADMAP.md` (orcamentos e modo leve).

### Changed
- **Pool de workers adaptativo** (`threadhack/runtime/loader.js`): 0 workers em maquinas modestas (<=4 nucleos, <=4 GB ou economia de dados), no maximo 4 nas demais (antes ate 10). Override `?pool=N`.
- `index.html`: Tailwind CDN removido; gtag carrega apos `load`/idle e respeita Do Not Track; `preconnect` ao runtime CheerpJ.
- CI (`build-site.yml`): roda testes, compila CSS e publica `src/`, `sw.js` e `static/tailwind.css`.

## [0.1.0-alpha.1] - 2026-11-06

Primeira versao do ImageL (fork de aicell-lab/imagej.js @ `8d76dde`).

### Added
- `ROADMAP.md`: plano de acao, nomenclatura de versoes e fase futura de IA analista autonoma (0.6.0).
- `src/logger.js`: logger com niveis, buffer circular e texto de diagnostico.
- `src/error-handler.js`: tratamento global de erros com toast e "copiar diagnostico".
- `src/i18n.js` + `src/i18n/messages.js`: suporte PT/EN (deteccao, persistencia, `data-i18n*`).
- `src/ui/draggable.js`: arrastar janelas e barras livremente, mantendo parte visivel na tela.
- `docs/ui-mockup.html`: mockup da nova UI (escuro, flat, Com fundo/Sem fundo, arrastavel, PT/EN).
- Testes (`npm test`) para i18n, logger e draggable.

### Changed
- `package.json`: nome `imagel`, versao `0.1.0-alpha.1`, script `test`.
- `index.html`: carrega `src/boot-early.js` (idioma + erros globais).
