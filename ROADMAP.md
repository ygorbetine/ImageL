# ImageL — Roadmap e plano de ação

**ImageL** é uma evolução de [aicell-lab/imagej.js](https://github.com/aicell-lab/imagej.js) (fork a partir do commit `8d76dde`), focada em **performance, estabilidade e uma interface moderna, flat e escura**, com versão web e versão desktop.

Mockup interativo: [`docs/ui-mockup.html`](docs/ui-mockup.html) (tema escuro/claro, **Com fundo / Sem fundo**, janelas e barras arrastáveis, PT/EN).

---

## 1. Versionamento

Usamos **[SemVer](https://semver.org/lang/pt-BR/) 2.0** com pré-lançamentos, e a versão do ImageL é independente da do ImageJ embutido.

```
MAJOR.MINOR.PATCH[-estágio.N]        ex.: 0.1.0-alpha.1 → 0.1.0 → 0.2.0-beta.2
```

| Parte | Quando sobe |
|---|---|
| `MAJOR` | quebra de compatibilidade (URLs/parâmetros `?mount=`, `?plugins.dir=`, API Hypha/MCP). `1.0.0` = primeira versão estável |
| `MINOR` | funcionalidade nova compatível (um item do roadmap abaixo) |
| `PATCH` | correções e ajustes de performance sem mudar comportamento |
| `-alpha.N` | em desenvolvimento, pode quebrar |
| `-beta.N` | funcional, em teste |
| `-rc.N` | candidata a lançamento |

Convenções:
- **Fonte única da versão**: `package.json` (`version`). `CHANGELOG.md` segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
- **Tags**: `v0.1.0`, `v0.2.0-beta.1`. Cada MINOR do roadmap fecha com uma tag.
- **Branches**: `ImageL` (integração), `feat/<tema>`, `fix/<tema>`, `release/x.y`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `chore:`). `feat` sobe MINOR, `fix`/`perf` sobem PATCH, `feat!`/`BREAKING CHANGE` sobe MAJOR.
- Artefatos desktop: `ImageL-<versão>-<plataforma>` (ex.: `ImageL-0.3.0-win-x64.exe`).

## 2. Mapa de versões

| Versão | Tema | Conteúdo principal |
|---|---|---|
| **0.1.0** | Fundação: performance e estabilidade | baseline e testes, logger, tratamento de erros, i18n PT/EN (infra), `draggable`, modularização, Tailwind local, Service Worker |
| **0.2.0** | Nova UI (web) | tokens flat/escuro, casca HTML (topbar, toolbar, painel, status), janelas flutuantes com tema, ponte Java↔JS, menus gerados, paleta de comandos |
| **0.3.0** | Desktop e "Sem fundo" | shell Tauri (leve), janela transparente, click-through, always-on-top, janelas e barras livres |
| **0.4.0** | Performance de execução | pool de workers (`threadhack`) adaptativo e opt-in, modo leve, cache de FS |
| **0.5.0** | Polimento e mobile | responsivo, acessibilidade, Document PiP (web), temas |
| **0.6.0** | **IA analista autônoma** | ver seção 6 |
| **1.0.0** | Estável | API Hypha/MCP congelada, documentação, instaladores assinados |

---

## 2.1 Requisito transversal: leve e acessível em qualquer computador

O ImageL **não pode depender de uma máquina parruda**. Isto é critério de aceite de toda versão, não uma otimização opcional.

**Máquina de referência (piso):** 2 núcleos, 4 GB de RAM, notebook de ~2017, Chrome/Edge/Firefox recentes, sem GPU dedicada. Tudo deve ser *utilizável* nela.

**Orçamentos (verificados a cada release):**
| Item | Limite |
|---|---|
| JS+CSS próprios da casca (comprimidos) | ≤ 60 KB, sem framework (sem React/Vue); só JS/CSS puro |
| CSS | Tailwind compilado e podado (hoje ≈ 9 KB), nunca CDN em runtime |
| RAM extra da casca (fora o ImageJ/CheerpJ) | ≤ 30 MB |
| Splash visível | < 100 ms; progresso real por etapas |
| 2ª visita | sem baixar de novo shell/runtime (Service Worker + cache HTTP) |
| Janelas flutuantes/arraste | 60 fps na máquina de referência; só `transform`/`left,top` em elementos isolados, sem relayout global |

**Regras de design:**
1. **Padrão enxuto, extras opt-in.** Paralelismo, IA, efeitos e painéis pesados ficam desligados até o usuário pedir.
2. **Pool de workers adaptativo** *(implementado)*: cada worker é uma JVM inteira. Em máquinas com ≤4 núcleos, ≤4 GB ou "economia de dados" o pool é **0** (thread única); em máquinas maiores, no máximo 4 (antes: até 10). Override: `?pool=N`.
3. **Modo leve automático** (mesma detecção): sem sombras/blur/transições, sem histograma ao vivo, sem miniaturas, atualização de painéis só sob demanda. O usuário pode forçar em Configurações.
4. **Carregar sob demanda**: plugins, Cellpose, OME-Zarr loader e IA só são baixados ao usar (hoje alguns carregam sempre).
5. **Sem dependências pesadas** na casca; ferramentas de build (Tailwind) ficam só no dev/CI.
6. **Desktop: preferir Tauri a Electron** (usa a WebView do sistema, instalador de poucos MB e bem menos RAM, em vez de embutir um Chromium de ~150 MB). Tauri suporta janela transparente e click-through. Electron só se Tauri não cobrir algum requisito.
7. **IA opcional e fora da máquina local**: o agente roda via serviço remoto/MCP; nada de modelo local obrigatório. O app funciona 100% sem IA.
8. **Medir sempre**: cada release compara TTI, KB transferidos e RAM com o baseline na máquina de referência; regressão acima de 10% bloqueia o release.

## 3. Fatos do código atual que guiam o plano

- A UI do ImageJ é AWT/Swing desenhada pelo CheerpJ em `div.cjWindow` dentro de `#cheerpjDisplay`. Não dá para reescrever tudo em HTML: a estratégia é uma **casca HTML** que dispara comandos no ImageJ (`IJ.run`, `IJ.setTool`, macros), mais **tema CSS** nas janelas Java.
- `index.html` (944 linhas) mistura CSS, markup e ~550 linhas de JS inline. Tailwind vem da CDN em runtime.
- `com.hack.menu.MenuRegistry` (menu "Extensions") já é um ponto de integração Java↔JS.
- `threadhack/` provou 2,18× de speedup com 4 workers (1 JVM por worker), ainda experimental.
- O loader do `threadhack` criava até **10 workers (10 JVMs)** por padrão: pesado em máquinas modestas (agora adaptativo).
- ~140 `console.log` em produção e patches por `MutationObserver`/`setTimeout` sobre o DOM do CheerpJ.
- `index.html` referencia `cellpose-integration.js`, que não está no repositório (verificar de onde vem antes do 0.1.0).

---

## 4. Versão 0.1.0 — Performance e estabilidade

### 4.0 Baseline
Medir TTI, bytes transferidos, memória com imagem 2048², tempo de Gaussian Blur/Median. Registrar em `docs/perf-baseline.md` e comparar a cada mudança.

### 4.1 Carregamento
| Ação | Efeito |
|---|---|
| Tailwind CDN → CSS compilado | remove script bloqueante |
| gtag após `load` e com consentimento | menos jank |
| `preconnect` ao runtime CheerpJ e `preload` de `ij.jar` | download paralelo |
| Service Worker (cache de `ij.jar`, plugins, runtime, versionado por hash) | 2ª visita quase instantânea |
| Splash com progresso real por etapas | TTI percebido menor |

### 4.2 Estabilidade
- Extrair JS inline para módulos ES (`src/boot.js`, `src/display-patches.js`, `src/dnd.js`, `src/url-config.js`).
- Um único `WindowManager` no lugar dos patches soltos.
- **Logger com níveis** (`src/logger.js`) no lugar dos `console.log`. *(iniciado)*
- **Tratamento global de erros** com toast e "copiar diagnóstico" (`src/error-handler.js`). *(iniciado)*
- **`draggable`**: arrastar janelas/barras livremente, sempre mantendo parte visível na tela (`src/ui/draggable.js`). *(iniciado)*
- Corrigir `user-scalable=no`, viewport no mobile (`visualViewport`).
- Testes E2E (Playwright): abrir app, File>Open, drag-and-drop, macro, mount GitHub, salvar; no CI antes do deploy.

### 4.3 Internacionalização (PT/EN)
- Módulo `src/i18n.js` (sem dependências): `t(chave, params)`, `setLocale`, detecção (escolha salva > idioma do navegador > `en`), aplicação ao DOM por `data-i18n`, `data-i18n-title`, `data-i18n-placeholder`, evento de mudança.
- Dicionários em `src/i18n/messages.js` (`pt`, `en`), com teste que garante **mesmas chaves nos dois idiomas**.
- Seletor PT/EN na topbar; `<html lang>` atualizado; escolha persistida.
- Menus do ImageJ (Java) mantêm os nomes originais em inglês por compatibilidade com macros (`run("Gaussian Blur...")`); na casca HTML mostramos o rótulo traduzido e executamos o comando original.
- Novas strings só entram com chave nos dois idiomas.

**Aceite 0.1.0:** utilizável na máquina de referência (seção 2.1); TTI −40% (1ª visita) e −70% (2ª); zero erro não tratado nos fluxos E2E; testes de i18n/logger/draggable verdes.

---

## 5. Versões 0.2.0 a 0.5.0 — Nova UI

### Princípios
Flat (sem gradientes, borda de 1 px, raios 6–8 px), tokens CSS, **tema escuro como padrão** (claro opcional), ícones SVG de traço grosso (≈2,4 px) e grandes (22 px), tipografia Inter + JetBrains Mono, densidade de app científico, atalhos e paleta de comandos (`Ctrl/Cmd+K`).

### Layout (ver mockup)
```
┌ Topbar: logo · menus · Com fundo/Sem fundo · busca · IA · PT/EN · tema ┐
├ Toolbar (esquerda) │ Área de trabalho (janelas flutuantes) │ Painel (direita) ┤
└ Statusbar: coordenadas · valor · zoom · memória · FS · estado ───────────────┘
```
- **Topbar/menus**: gerados a partir dos menus reais do ImageJ, acionam `IJ.run(cmd)`.
- **Toolbar**: HTML, `IJ.setTool(id)`, sincronizada por eventos Java→JS.
- **Janelas de imagem**: continuam Java, com tema flat e **arrastáveis livremente em qualquer modo**.
- **Painel direito**: Propriedades, ROIs, Resultados, IA em HTML.
- **Mobile/tablet** (0.5.0): toolbar inferior, painel como bottom sheet.

### Janelas flutuantes: "Com fundo" e "Sem fundo" (desktop, 0.3.0)
Em **ambos** os modos as janelas são flutuantes e **livres para mover**. Atalho `Ctrl+Shift+B`.

| | **Com fundo** | **Sem fundo** (overlay) |
|---|---|---|
| Aparência | app normal; janelas flutuam no espaço de trabalho | janela transparente e sem moldura; só janelas e barras visíveis |
| Barras | encaixadas nas bordas | topbar, toolbar, painel e status viram cartões **arrastáveis** (alça de arraste) |
| Cliques no vazio | o app captura | atravessam para o app embaixo (click-through) |
| Uso | análise concentrada | analisar por cima de planilhas, PDFs e outros apps |
| Plataforma | web ou desktop | **somente desktop** |

Um navegador não desenha fora da aba nem fica transparente sobre outros programas; "Sem fundo" exige **shell desktop (Tauri, preferido por ser leve; Electron como alternativa)**. Na web, o Chrome oferece Document Picture-in-Picture como alternativa parcial (0.5.0).

Desktop: `transparent: true`, `frame: false`, `setAlwaysOnTop(true, 'floating')` opcional; click-through com `setIgnoreMouseEvents(true, { forward: true })`, alternando para `false` enquanto o cursor está sobre janela/barra; opacidade 50–100%; atalho global para mostrar/ocultar; copiar medidas (`Ctrl+Shift+C`). Linux depende do compositor (fallback para "Com fundo").

**Regras de arraste (implementadas em `draggable`)**: qualquer janela pelo título; barras fixas só no modo "Sem fundo"; ao soltar, pelo menos 60 px permanecem visíveis (nunca se perde fora da tela); janela clicada vai para a frente; botões de janela não iniciam arraste.

### Entregas
1. Tokens + componentes base em `src/ui/`.
2. Casca HTML com a área do CheerpJ plugada.
3. Ponte Java↔JS (`ImageJBridge`): comando, ferramenta, imagem ativa, pixel, ROIs, resultados.
4. Tema das janelas Java e `WindowManager` (tiling, snap, opacidade).
5. Paleta de comandos e atalhos.
6. Shell desktop e modo "Sem fundo".
7. Responsivo, acessibilidade (contraste AA, `aria-*`).
8. Remoção do CSS legado.

---

## 6. Versão 0.6.0 (futura) — IA analista autônoma

Objetivo: a IA analisa imagens **sozinha**, a partir de um pedido em linguagem natural, sem o usuário escrever macros.

### Como funciona
1. **Pedido**: "meça a área das células e compare controle vs. tratado".
2. **Planejamento**: o agente inspeciona a imagem (metadados, histograma, miniaturas, canais) e propõe um **plano** de passos (pré-processamento, segmentação, medição, estatística).
3. **Execução**: gera e roda macros ImageJ/JS (`Interpreter.runMacroSilent`, já existente) e, se instalados, Cellpose/MorphoLibJ. Cada passo registra entrada, saída e imagem intermediária.
4. **Verificação**: o agente olha o resultado (screenshot/ROIs), detecta falhas (sub/sobre-segmentação, saturação) e **itera** sozinho, com limite de tentativas.
5. **Relatório**: tabela de resultados, ROIs (GeoJSON), figuras e o **protocolo reproduzível** (macro final + parâmetros), exportáveis.

### Camadas e segurança
- **Modos de autonomia**: *Sugerir* (mostra o plano e espera), *Semi* (executa e pede confirmação em passos destrutivos), *Autônomo* (executa tudo em cópia).
- **Nunca altera o original**: trabalha em duplicata; salvar/sobrescrever exige confirmação.
- **Log de auditoria** de cada macro executada; botão "parar" sempre visível; orçamento de tempo/passos.
- Provedores configuráveis (cloud via MCP/Hypha ou modelo local); **nenhuma imagem sai do navegador/PC sem consentimento explícito**.
- Base de conhecimento de receitas validadas (já existe no Hypha) como contexto do agente.
- Painel **IA** (aba existente) mostra plano, passos, imagens intermediárias e relatório.


### 6.1 Algoritmos que a IA analista pode usar (ordenados por custo)

Princípio: **o mais barato que resolve vence**. O agente tenta primeiro o que roda local e leve, e só escala quando a verificação falha.

| Camada | Algoritmos | Custo | Quando |
|---|---|---|---|
| **1. Clássicos (offline, ImageJ nativo)** | Rolling-ball, Gaussian/Median, limiar automático (Otsu, Triangle, Li, Huang…), Watershed, Analyze Particles, Fiji "Auto Threshold" | ~zero, qualquer PC | núcleos/células em fluorescência, área, contagem, intensidade |
| **2. Morfologia e filtros avançados** | MorphoLibJ (já suportado), top-hat, Laplaciano/LoG e DoG para detecção de blobs, Frangi/Hessiano (vasos/fibras), CLAHE | baixo | estruturas finas, fundo irregular, contraste baixo |
| **3. Seleção automática de método** | escolher o limiar testando todos e pontuando (circularidade, tamanho esperado, nº de objetos estável); estimar σ/raio de fundo pelo tamanho típico do objeto | baixo | quando a receita padrão falha |
| **4. Rastreamento e série temporal** | TrackMate (LAP / Kalman), correlação de fase para registro, fluxo óptico simples | médio | vídeos, migração celular |
| **5. Deep learning local sob demanda** | Cellpose (já há integração), StarDist, modelos ONNX/WebGPU pequenos (cyto/nuclei) | médio–alto, **só opt-in e só se a máquina aguenta** | células tocando/irregulares onde clássicos falham |
| **6. Pós-processamento e estatística** | filtros por forma (circularidade, solidez), agrupamento (k-means/DBSCAN) de fenótipos, testes (t, Mann-Whitney) e tamanho de efeito, detecção de outliers | baixo | comparar grupos, relatório |
| **7. LLM (planejamento/verificação)** | só para escolher a receita, ajustar parâmetros e **olhar o resultado**; não processa pixels | por chamada (remoto) | casos fora das receitas |

Regras:
- O provider offline de receitas (`src/ai/recipes.js`) cobre a camada 1 sem custo e sem rede.
- Camadas 5 e 7 são **opt-in**, e 5 só é oferecida se a máquina passar na detecção do modo leve (seção 2.1).
- Toda decisão de método é registrada no log de auditoria, e o protocolo final é reproduzível sem IA (`toProtocol`).

### Pré-requisitos (vêm das versões anteriores)
Ponte Java↔JS estável (0.2.0), exportação GeoJSON (existente), pool de workers para lotes (0.4.0), i18n (o agente responde no idioma da UI).

**Aceite 0.6.0:** em um conjunto de imagens de referência, o agente conclui o fluxo (segmentar + medir + relatório) sem intervenção em ≥80% dos casos; todo passo é reproduzível por macro; nenhum arquivo original é modificado.

---

## 7. Riscos
- **Ponte Java↔JS**: validar cedo com prova de conceito (menu File + ferramenta ativa).
- **Menus dinâmicos de plugins**: ressincronizar a barra após carregar plugins.
- **Paralelismo** muda a semântica de plugins com estado: opt-in e restrito a filtros conhecidos.
- **Janelas Java** têm limite de estilização (canvas AWT).
- **Transparência no Linux** varia por compositor.
- **IA autônoma**: resultados científicos errados com aparência plausível; por isso verificação visual, logs e protocolo reproduzível são requisitos, não extras.
- **Build local**: JDK 8+ e Ant são necessários para `prepare.sh` (não presentes em todas as máquinas).
