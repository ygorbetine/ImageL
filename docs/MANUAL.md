# Manual do ImageL

ImageL é o ImageJ no navegador/desktop com interface moderna. **Todas as funções originais do ImageJ continuam disponíveis.**

## 1. Instalação
- **Desktop (Windows):** execute `ImageL.exe` (arquivo único, ~56 MB). Requer WebView2 (já vem no Windows 11) e internet no primeiro uso (baixa o runtime CheerpJ).
- **Navegador:** abra o site com `?ui=new` para a interface moderna.

## 2. Tela principal
- **Barra de topo:** menus (Arquivo, Editar, Imagem, Processar… `»` mostra o resto), busca de comandos, modos de janela, botões rápidos.
- **Barra de ferramentas:** ícones grandes das ferramentas do ImageJ. Ícones com triângulo agrupam variações (clique e segure/abra). `»` abre ferramentas extras (macros do ImageJ).
- **Barra de status:** estado do CheerpJ e uso de memória.

### Botões da barra de topo
| Botão | Função |
|---|---|
| Buscar comandos (Ctrl+K) | Executa qualquer comando do ImageJ pelo nome. `Tab` em área vazia também abre. |
| Com fundo / Sem fundo | Modo normal ou modo overlay (ver seção 5). |
| Ícone de curvas (Gap) | Distância entre grupos (scratch). Clique = uma imagem; **Shift+clique** = pasta em lote. |
| IA | Painel da ferramenta autônoma de IA. |
| Ícone de janela | Alterna para o ImageJ clássico. |
| Raio | Modo leve (menos efeitos, para PCs fracos). |
| Pin (só em Sem fundo) | Liga/desliga "sempre no topo". |
| PT/EN | Idioma. |
| Lua/Sol | Tema escuro/claro. |

Na barra de ferramentas há também um botão para alternar entre **horizontal** (abaixo dos menus) e **vertical**; duplo clique volta ao automático.

## 3. Janelas e zoom
- Janelas de imagem são flutuantes e arrastáveis. Ao **redimensionar a janela**, o zoom da imagem acompanha o novo tamanho.
- Diálogos do Java (campos, Abrir/Salvar) seguem o tema escuro/claro.

## 4. Distância entre grupos (ensaio de cicatrização / scratch)
Automatiza o que se faz à mão: dois contornos suaves (cima e baixo) colados aos grupos de células e linhas retas medindo a distância entre eles.
1. Abra a imagem e clique no botão **Gap** (ou menu ImageL → *Distância entre grupos (scratch)…*).
2. Ajuste no diálogo: número de linhas de medição, tamanho do filtro, margem, **suavização** das curvas, orientação (**auto** detecta horizontal/vertical), desenhar contornos e linhas, enviar medições à tabela **Results** (como Ctrl+M, uma linha por medição).
3. Células soltas dentro do vão são ignoradas; "entradas" estreitas são removidas.
4. Resultado: contornos brancos, linhas amarelas, tabela com média, desvio, mínimo, máximo e área do vão.
- **Lote:** Shift+clique no botão (ou *Distância entre grupos (pasta)…*) processa todas as imagens de uma pasta.

## 5. Modo "Sem fundo" (desktop)
Barras e janelas flutuam sobre a área de trabalho, sem moldura de janela; cliques passam para os programas atrás onde não há interface.
- A janela cobre **todos os monitores**: barras e janelas podem ser movidas entre monitores.
- Sempre no topo ligado por padrão; use o pin para desligar.
- A barra de status fica dentro do painel de topo.
- Cada modo **memoriza a posição** das barras e janelas; ao voltar ao modo, elas retornam ao último lugar.
- Atalhos: **Ctrl+Shift+B** alterna Com/Sem fundo; **Ctrl+Shift+P** fixa no topo (fora de Sem fundo).

## 6. Ferramenta de IA
Abra o painel **IA**, descreva a tarefa em linguagem natural (ex.: "segmentar núcleos e contar") e o ImageL gera e executa macros do ImageJ. Revise o resultado; é possível desfazer com Ctrl+Z do ImageJ.

## 7. Atalhos
| Atalho | Ação |
|---|---|
| Ctrl+K | Paleta de comandos |
| Tab (área vazia) | Paleta de comandos |
| Esc | Fecha menus/paleta |
| Ctrl+Shift+B | Com fundo ↔ Sem fundo (desktop) |
| Ctrl+Shift+P | Sempre no topo (desktop) |
| Ctrl+M / Ctrl+D | Medir / adicionar ao ROI Manager (ImageJ) |

## 8. Problemas comuns
- **Tela vazia ao abrir:** aguarde "CheerpJ pronto" na barra de status; o primeiro carregamento baixa o runtime.
- **Lento:** ative o modo leve (raio) e feche imagens não usadas.
- **Botão novo não aparece:** você está num build antigo; use a versão mais recente.

## 9. Versões
Veja `CHANGELOG.md` e `ROADMAP.md`.
