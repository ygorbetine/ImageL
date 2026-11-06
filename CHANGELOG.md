# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (ver `ROADMAP.md`).

## [Unreleased]

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
