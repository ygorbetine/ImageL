# Plano de ação — rumo ao ImageL 1.0.0

Início: **sábado, 07/11/2026, 21h**. Estado atual: 0.6.0-alpha.44 (pré-release no fork `ygorbetine/ImageL`).

## Fase 1 — Verificação ao vivo (base para tudo) · ~1 h
- [ ] Gap na imagem real: espigão esquerdo, filtro passa-alta, orientação automática, lote.
- [ ] Dropdown dos diálogos Java e arrastar imagem para a janela.
- [ ] "Sem fundo": mover entre monitores, memória de posição, status dentro do painel.
- [ ] Tema claro (barras, diálogos, campos).
- Saída: lista de bugs reais → corrigidos antes de seguir (alpha.45).

## Fase 2 — Offline e instalador · ~3–4 h
- [ ] Flag `--offline` em `tools/build-site.mjs`: copiar `vendor/cheerpj/4.2` para `dist/cheerpj/4.2` e definir `window.__CJ_BASE`; mapear os arquivos `/lt/8/jre/...`.
- [ ] Testar sem internet (rede desligada) com o .exe.
- [ ] Instalador MSI/NSIS (`cargo install tauri-cli`), ícone e nome com versão.
- [ ] Entregas: `ImageL-<v>.exe` (online, leve), `ImageL-<v>-offline.exe` e `ImageL-<v>-setup.exe`.

## Fase 3 — Janelas do ImageJ com problema · ~2–3 h
- [ ] Tema: Threshold, Plot, editor de texto, seletor de cor.
- [ ] ROI Manager (UnsatisfiedLinkError) e botões minúsculos do Histograma.
- [ ] Revisão de tradução PT/EN nas janelas restantes.

## Fase 4 — Projeto e publicação · ~1–2 h
- [ ] README do ImageL (o que é, download, capturas de tela); manuais já em `docs/`.
- [ ] Créditos e licenças (ImageJ, imagej.js, CheerpJ, Tauri).
- [ ] Decidir branch padrão do fork (`ImageL`).
- [ ] Assinatura do .exe (certificado) ou aviso de SmartScreen no README.

## Fase 5 — Lançamento 1.0.0 · ~1 h
- [ ] Congelar funções; rodar `npm test` e `cargo test`.
- [ ] CHANGELOG e ROADMAP finais; versão 1.0.0.
- [ ] Release estável (não pré-release) com os 3 binários + manuais PT/EN.

## Ordem sugerida para a primeira noite (21h)
1. Fase 1 (verificação) → 2. início da Fase 2 (offline). As demais nos dias seguintes.

## Riscos
- Offline: tamanho do runtime (centenas de MB) pode exigir download à parte ou instalador maior.
- Assinatura de código exige certificado pago; sem ele o SmartScreen avisa.
- Sem imagens reais de teste, o Gap pode precisar de novos ajustes finos.
