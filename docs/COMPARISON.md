# ImageJ.JS original → ImageL (0.6.0-alpha.12)

| Área | Original | ImageL |
|---|---|---|
| Interface | Barra Java (toolbar + menus AWT) e botões Tailwind soltos | Shell HTML flat: barra superior, toolbar, status, paleta Ctrl+K (opt-in `?ui=new`; `?ui=classic` volta) |
| Tema | Claro, janelas Java cinza | Escuro por padrão, claro opcional; janelas Java com tema flat |
| Menus | Barra Java pequena | Menus reais do ImageJ (File…Extensions) + menu ImageL; os que não cabem vão para a seta » |
| Ferramentas | 1 linha de ícones pequenos + » | Ícones 30px, grupos com flyout, Balde/Dev/Pincel/Seta, »More tools, tooltips com atalho |
| Layout | Janela ImageJ flutuando | Toolbar vertical (horizontal automático em tela baixa), status em faixa, fundo de pontos, janela Java original oculta (botão para mostrar) |
| Janelas | Arrastáveis só dentro da página | "Com fundo" e "Sem fundo" (desktop/Tauri: sobre outros apps, click-through), barras arrastáveis |
| Idioma | Inglês | PT/EN (menus, status, paleta) |
| Carregamento | Tailwind CDN, scripts opcionais sempre carregados, workers pesados | CSS local, carga preguiçosa, splash com progresso, pool de workers 0 por padrão (boot ≈23 s vs >90 s), modo lite automático |
| Estabilidade | Erros no console | Handler global com toast e diagnóstico, logger, Service Worker só do shell |
| Análise | Manual | Menu ImageL > Distância entre grupos (scratch) e IA analista offline (receitas) |
| Marca | — | Logo de células com núcleos (static/logo.svg) |
