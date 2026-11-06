# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (ver `ROADMAP.md`).

## [Unreleased]

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
