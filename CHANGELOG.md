# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (ver `ROADMAP.md`).

## [Unreleased]

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
