# Reconciliação: Design aprovado × plataforma real (v5) × Plano Diretor

Data: 2026-10-02 · Fonte: `Desmentindo.zip` (manifesto em `SOURCE_MANIFEST.md`) · Lido primeiro: `handoff/COWORK_IMPLEMENTATION_PROMPT_v1.md`, depois `CLAUDE.md`.

**Isto não é um redesign.** O alvo da implementação é a plataforma que está no ar (v5 na raiz), não a antiga
`Desmentindo Brasil.html` / `desmentindo_local.html`, que serve só de inventário funcional e referência histórica.

## Checkpoint 0 — estado real (implementation target)

| | Hoje |
|---|---|
| CURRENT_PRODUCTION_ARCHITECTURE | Site estático (FTP Locaweb). Raiz gerada no deploy por `public-ui/build-root.mjs` a partir de `v5/index.html` (`ROOT_VERSION=v5`; rollback = `legacy`). |
| CURRENT_ROOT | `v5/index.html` + `v5/js/v5.js` (roteador por hash) + `v5/css/v5.css` |
| CURRENT_HOME | `P.home`: marca + mensagem + busca; AGORA (edição editorial), Em acompanhamento, Já falaram sobre isso, Nos arquivos |
| CURRENT_STORY | `P.historia` (`#/historia/<slug>`), dados `v5/data/historia/*.json` |
| CURRENT_SEARCH | `P.busca` (`#/busca?q=`), índice fragmentado `v5/data/busca/` |
| CURRENT_ARCHIVE | `P.arquivos` (`#/arquivos`) e consulta por pessoa `P.arquivo` (`#/arquivo/<slug>`) |
| CURRENT_PUBLIC_DATA | `data/editorial/` (edição aprovada, Publisher) + `v5/data/` (gerado por `build-v5-data.mjs` a partir dos dados públicos aprovados) |
| CURRENT_PUBLISHER | `automation/publisher_runtime.py` (outbox → PR; nunca faz merge) |
| CURRENT_DEPLOY | `deploy-locaweb.yml` (push em `main`): builds v4/v5 → raiz → FTP → `verify-production.mjs` |

**PRE_DESIGN_IMPLEMENTATION_COMMIT = `3cb0e67`** (`main`). Esta implementação parte do branch do PR #10
(`public-ui/evidence-label-ids` @ `90a19d5`, correções P1 de fonte primária e IDs internos) para não conflitar com ele.
Rollback: reverter o merge deste PR (1 commit); nenhum dado nem backend é alterado.

## Hierarquia aplicada
1. Visual v4 (`Desmentindo Visual v4`, `DM Home v4`, `DM Historia v4`) → tratamento visual.
2. Master Screens v3 (+ `DM Home/Historia/Profissionais v3`) → estrutura.
3. Expansão Etapa 1.1 → estados, componentes 22–23, pessoa, capacidades.
4. Expansão Etapa 1 → famílias, navegação, inventário, tokens.
5. 26 Telas + famílias + Cards + Tela 25 + Cabeçalho + Rodapé.
6. DM Plataforma v4 → adaptadores com dados reais.
7. Linguagem Pública v1 + v1.1 (Consolidação v2).

Superados não vencem canônicos (v1, sem sufixo, candidatos). **Por cima de tudo:** decisões de produto de Johnny
posteriores ao handoff (Home simples, consulta neutra por pessoa, CHECAR, CHECK_OUTPUT_PARITY, ordem da Story).

## Conflitos classificados (nenhum decidido em silêncio)
| # | Conflito | Classe | Resolução |
|---|---|---|---|
| C1 | Home v4 com 9 blocos (hero com foto, faixa Checar, Está circulando…) × Home simples com 3 portas (decisão posterior) | PRODUCT_EVOLUTION | Mantida a Home simples; aplicada a gramática visual v4 (régua, faixa-assinatura, data, tokens). |
| C2 | Navegação do design (Agora · Checar · Nos arquivos · O Dia) × 3 portas da v5 | PRODUCT_EVOLUTION | Topo mantém as 3 portas; Checar entra na barra inferior do celular e no rodapé (DECISÃO 3). |
| C3 | "Nenhuma página de pessoa" (handoff) × consulta neutra ao arquivo por pessoa (01/10) | PRODUCT_EVOLUTION | Mantida a consulta neutra; já registrada no Plano Diretor (changelog 2026-10-01). |
| C4 | URL `/historia/slug` × roteamento por hash `#/historia/slug` | IMPLEMENTATION_GAP | Hash mantido (estático); URL limpa = backlog. |
| C5 | Ordem da História v4 × ordem pedida por Johnny (título, resumo, o que sabemos, já falaram, o que encontramos, cronologia, fontes, atualizações) | PRODUCT_EVOLUTION | Ordem de Johnny (já era a da v5); componentes v4 aplicados dentro dela. |
| C6 | Hero com foto × sem campo de imagem + política de fotos | IMPLEMENTATION_GAP / DATA_GAP | Variante tipográfica (data protagonista). |
| C7 | `Desmentindo Brasil.html` como alvo | LEGACY_SUPERSEDED | Só inventário/referência. |
| C8 | Interface `/v4/` (implementação anterior do handoff) | LEGACY_SUPERSEDED | Segue como prévia; componentes reaproveitados como referência. |
| C9 | Formulário do Checar × não há canal de envio | DECISION_REQUIRED | Página honesta ("envio ainda não está aberto"); DECISÃO 3. |
| C10 | App anterior público com módulos proibidos (Matriz, Vínculos, Mapa, Segundo cérebro, Termômetro, Fichas, Contagens) | DECISION_REQUIRED | Raiz não aponta mais para eles; remoção do arquivo anterior = DECISÃO 1. |
| C11 | Exemplo público do Checar usaria a peça N001 (já publicada na v4; inclui Banco Master = GLT-001) | DECISION_REQUIRED | Padrão: sem exemplo público (`CHECAR_PUBLIC_EXAMPLE = null`); componente testado com a peça real só no QA. DECISÃO 2. |
| C12 | Vermelho `#EC3013` da base Modernist | LEGACY_SUPERSEDED | Não usado. |

## Matriz plataforma × design
| Funcionalidade | Rota atual | Componente atual | Tela do design | Decisão | Risco | Implementação |
|---|---|---|---|---|---|---|
| Início (legado) | `#/home`, `#/inicio` | app anterior | 01 Home | MERGE | baixo | → `#/` (Home v5) |
| Hub de notícias | `#/noticias` | app anterior | 03 Em destaque hoje | MERGE | baixo | → `#/` (edição AGORA) |
| Auditoria de narrativas | `#/narrativas` | app anterior; v4 `#/circulando` | 02 Está circulando · 11–15 Checar | MIGRATE | médio (peça política; GLT-001) | → `#/checar`; exemplo público só com liberação (DECISÃO 2) |
| Termômetro do regime | `#/regime` | app anterior | — (proibido: gauge, painel) | REMOVE_FROM_PUBLIC_SURFACE | alto se exposto | `#/regime` explica a retirada; módulo segue em `desmentindo_local.html` (DECISÃO 1) |
| Segundo cérebro | `#/cerebro` | app anterior | — (legado bloqueado) | REMOVE_FROM_PUBLIC_SURFACE | alto | idem |
| Painel / Visão geral | `#/inicio` | app anterior | 01 Home | MERGE | baixo | → `#/` |
| Eventos | `#/eventos` | app anterior | 14 Nos arquivos · 16 Registro | MOVE_TO_ADVANCED_ARCHIVE | baixo | página explica + link ao arquivo anterior; registros já na busca |
| Matriz | `#/matriz` | app anterior | — (legado bloqueado) | REMOVE_FROM_PUBLIC_SURFACE | alto | explica a retirada; sem link |
| Trilhas / Caso | `#/trilhas`, `#/caso?c=` | app anterior | 05 História · 17 Entenda o caso | MIGRATE | baixo | `#/caso?c=X` → `#/historia/<slug>`; trilhas → arquivo anterior |
| Fichas / Pessoa | `#/fichas`, `#/pessoa?n=` | app anterior | busca por nome · componente 23 | MIGRATE | médio | `#/pessoa?n=X` → `#/arquivo/<slug>` (consulta neutra); fichas (perfil) retiradas |
| Rede | `#/rede`, `#/mapa` | app anterior | — (pessoa↔pessoa proibido) | REMOVE_FROM_PUBLIC_SURFACE | alto | explica a retirada; sem link |
| Mecanismos | `#/mecanismos` | app anterior | só como "Como os processos andam" dentro do caso | MOVE_TO_ADVANCED_ARCHIVE | baixo | arquivo anterior; GAP no caso (backlog) |
| Cobertura | `#/cobertura` | app anterior | — | MOVE_TO_ADVANCED_ARCHIVE | baixo | arquivo anterior |
| Gazeta | `#/gazeta` | app anterior | — | MOVE_TO_ADVANCED_ARCHIVE | baixo | arquivo anterior |
| Oeste | `#/oeste` | app anterior | — | MOVE_TO_ADVANCED_ARCHIVE | baixo | arquivo anterior |
| Opinião | `#/opiniao` | app anterior | — | MOVE_TO_ADVANCED_ARCHIVE | baixo | arquivo anterior |
| Mensagens | `#/mensagens` | app anterior | — | MOVE_TO_ADVANCED_ARCHIVE | médio (mensagens privadas vazadas) | arquivo anterior |
| Corpus Garcia | `#/corpus`, `#/garcia`, `#/video`, `#/acervos` | v5 `#/arquivos` + busca | 14 Nos arquivos | MERGE | baixo | → `#/arquivos` (Já falaram sobre isso) |
| Glossário | `#/glossario` | app anterior | 22 Como trabalhamos | MOVE_TO_ADVANCED_ARCHIVE | baixo | arquivo anterior; "Como checamos" em `#/checar#como` |
| Situação atual / Contagens | `#/sit`, `#/contagens` | app anterior | — (painéis de números proibidos) | REMOVE_FROM_PUBLIC_SURFACE | médio | `#/sit` → arquivo anterior; `#/contagens` retirada |
| AGORA | `#/` (#agora), `#/agora/<id>` (novo) | `P.home`, `P.agora` | 01 Home · 05 História · Agora | KEEP | — | 3 com texto + linhas; cada notícia com URL própria; fontes visíveis |
| ATUALIZAÇÃO | `#/historia/<slug>` (Atualizações) | `P.historia` | 07 "atualizada" | KEEP | — | marcador ↻ ATUALIZADO EM <data>; hora não existe no dado (GAP) |
| FECHAMENTO | — (v4 tinha) | — | 19 O Dia | GAP | baixo | sem dado público de fechamento na v5; backlog |
| Nos Arquivos | `#/arquivos` | `P.arquivos` | 14 Nos arquivos | KEEP | — | régua e tokens |
| Já falaram sobre isso | `#/historia/<slug>#ja-falaram` | `saidItem` | Isso já apareceu antes | KEEP | — | + "Aparecer antes não prova o fato de hoje." |
| Busca | `#/busca?q=` | `P.busca` | Search result | KEEP | — | agrupada por ANO; h1 adicionado |
| Consulta ao Arquivo (pessoa) | `#/arquivo/<slug>` | `P.arquivo` | busca por nome (Etapa 1.1) | KEEP | — | porta neutra; sem perfil/score/foto |
| Story | `#/historia/<slug>` | `P.historia` | 05 História (v4) | KEEP | — | data protagonista, números com contexto, linha do tempo, documento em destaque, trilho de fontes, alegação rotulada |
| Para Profissionais | `#/profissionais` | `P.profissionais` | 25 Desmentindo Data | KEEP | — | cartões JÁ EXISTE (só o que existe; L2) |
| Checar | `#/checar` (novo) | `P.checar` + ORIGINAL × CHECADO | 11–15 Checar | GAP | médio | apresentação pronta; envio pelo site = GAP (sem canal; DECISÃO 3) |
| Está circulando | — | — | 02 | GAP | médio | só 1 peça checada publicada; falta origem por afirmação (DATA_GAP) |
| Já checamos | — | — | 04 | GAP | baixo | sem feed de afirmações checadas além da peça N001 (DATA_GAP) |
| Estados corrigida / resposta / continua | — | — | 08–10 | GAP | baixo | sem dado de correção/resposta (DATA_GAP); componentes no backlog |
| Registro histórico | — | — | 16 | GAP | baixo | backlog |
| Cards para compartilhar | — | base: `.asset` (CHECKED_MASTER_ASSET) | 18 DM Cards | GAP | baixo | peça checada já tem marca, data e endereço; exportação 1080 = backlog |
| Sobre / Correções / Envie sua versão / Contato | — | — | 21, 23, 24, 26 | GAP | baixo | L3 + sem canal; backlog |
| Interface v4 (prévia anterior) | `/v4/` | `v4/js/app.js` | implementação anterior do handoff | SUPERSEDED | baixo | segue publicada como prévia; v5 é a raiz |

**Contagem:** KEEP 8 · MIGRATE 3 · MERGE 4 · MOVE_TO_ADVANCED_ARCHIVE 8 · REMOVE_FROM_PUBLIC_SURFACE 5 · SUPERSEDED 1 · GAP 8 · total 37

Nenhuma funcionalidade desapareceu sem justificativa: todo endereço antigo redireciona para o equivalente, explica que
mudou (com link ao arquivo anterior) ou explica por que saiu da página pública.

## Funcionalidade antiga que o design não cobre
Eventos, Trilhas, Mecanismos, Situação atual, Gazeta, Oeste, Cobertura, Opinião, Mensagens, Glossário → **arquivo anterior**
(`desmentindo_local.html`), com página de "mudou de lugar" na raiz. Matriz, Mapa, Vínculos, Segundo cérebro, Termômetro,
Fichas, Contagens → **fora da superfície pública** na raiz (proibidos pelo Plano Diretor); continuam acessíveis no arquivo
anterior até a DECISÃO 1.

## Design sem dado (não inventado)
| Capacidade do design | Situação |
|---|---|
| Hero com foto, cards 4:5, faixa de arquivo 4:3 | DATA_GAP (sem imagem por história; política de fotos) |
| Linha do dia 09:12 → 13:47 → 17:15, ATUALIZADO ÀS hh:mm | DATA_GAP (dado só tem data) |
| Olha a data (componente 22) | DATA_GAP (sem T1/T2 estruturados) |
| Quem aparece nesta história (componente 23) | DATA_GAP (sem relação evento↔ator com verbo) |
| Ainda não sabemos (perguntas abertas) | DATA_GAP |
| Está circulando / Já checamos | DATA_GAP (1 peça checada; sem origem por afirmação) |
| O que ele NÃO diz (documento em destaque) | DATA_GAP (sem campo) — bloco não é inventado |
| O Dia / Fechamento, newsletter, correções, resposta | GAP (sem dado/canal) |
| Envio do Checar | NOT_AVAILABLE (sem canal) |

## Achados
**P0 = 2**
- P0-1 (CORRIGIDO): 35 marcos de cronologia, 17 atualizações e 1 resumo eram **alegação atribuída** exibida sem rótulo,
  como se fosse fato. Agora levam "ALEGAÇÃO ATRIBUÍDA" (dado: `nat`; adaptador `build-v5-data.mjs`). Gate `V5_EPISTEMIC_QA`.
- P0-2 (PRÉ-EXISTENTE, DECISÃO 1): o app anterior público mantém módulos que o Plano Diretor proíbe na superfície
  (grafo de vínculos, matriz, fichas de pessoa, termômetro). A raiz não leva mais a eles.

**P1 = 10** (8 corrigidos, 2 GAP)
- Notícias do AGORA sem URL própria → `#/agora/<id>` (CORRIGIDO).
- Título do documento das fontes só no hover (tooltip) → visível na página da notícia (CORRIGIDO).
- AGORA ocupava a Home inteira (11 itens com texto) → 3 com texto + linhas (CORRIGIDO).
- Links antigos (`#/caso`, `#/pessoa`, `#/eventos`…) caíam na Home sem aviso → adaptador de compatibilidade (CORRIGIDO).
- Busca sem `h1` (CORRIGIDO).
- Celular sem acesso a Checar/rodapé; navegação só no topo → barra inferior de 5 itens, 54 px (CORRIGIDO).
- "Documento localizado"/"Fonte localizada" sem a regra obrigatória ao lado (CORRIGIDO).
- Checar sem apresentação pública (CORRIGIDO: método, paridade de formato, leitura do resultado, componentes).
- Envio do Checar sem canal (GAP, DECISÃO 3).
- Está circulando / Já checamos sem dado suficiente (GAP).

**P2 = 9** (5 corrigidos)
- Tokens divergentes do design (ink, paper, azul, cinzas, foco) (CORRIGIDO).
- Régua de seção, data protagonista, linha do tempo visual, documento em destaque, trilho de fontes, números com contexto (CORRIGIDO).
- Rodapé DM Rodape (colunas + NOSSAS REGRAS) (CORRIGIDO).
- Faixa-assinatura "O que foi dito. Quando foi dito. E de onde veio." (CORRIGIDO).
- Selos epistêmicos (forma + palavra) e proporção com legenda ao lado (CORRIGIDO, no Checar).
- Busca no cabeçalho das páginas internas (desktop) — backlog.
- Hero escuro da História (variante tipográfica v4) — backlog (mantido cabeçalho claro, mais leve).
- Faixa de arquivo 4:3 "Isso já apareceu antes" — backlog.
- Tablet (L4) — backlog.

**P3 = 4**: marca some < 400 px; glifo ⌕ depende de fonte do sistema; "Achou um erro?" sem canal; cards 1080 (exportação) — backlog.

## Semântica preservada
DOCUMENTADO = "Encontramos documentação que sustenta a afirmação no contexto apresentado." Todo selo vem com
"Checamos se foi dito / se aconteceu". Valor desconhecido → EM CHECAGEM. "Não encontramos registro" sempre com
"Isso não significa que nunca aconteceu." Alegação ≠ fato (rótulo). Vínculo ≠ culpa: ligação não confirmada é
pontilhada, nunca linha cheia. Fonte localizada ≠ confirmação. Nenhum ID interno na superfície (scan em CI, deploy e QA).

## Decisões de Johnny (02/10/2026)
- **LEGACY_PUBLIC_APP = RETIRE** → `/desmentindo_local.html` vira redirecionamento no deploy (gate `LEGACY_PUBLIC_APP_RETIRED`); links antigos (`#/caso`, `#/pessoa`, `?ev=`, módulos) levam ao equivalente público ou explicam; nenhum módulo proibido vai para a v5.
- **CHECAR_PUBLIC_EXAMPLE = OFF** até decisão editorial explícita (readiness técnico ≠ aprovação).
- **CHECAR_SUBMISSIONS = CLOSED** até validação ponta a ponta; Checar fora da navegação principal; sem chamada de envio.
- **P0 alegações:** auditoria semântica dos itens (`P0_ALLEGATION_AUDIT.md`); fala atribuída ≠ alegação.

## Decisões originais (histórico)
1. **Arquivo anterior** (`/desmentindo_local.html`): retirar da superfície pública os módulos proibidos (Matriz, Mapa,
   Vínculos, Segundo cérebro, Termômetro, Fichas, Contagens) — ou o arquivo anterior inteiro — mantendo os "movidos"?
2. **Exemplo público do Checar**: liberar a peça N001 (já publicada na v4; envolve Banco Master/GLT-001) como exemplo
   ORIGINAL × CHECADO, ou esperar o GLT-001? (1 linha: `CHECAR_PUBLIC_EXAMPLE` em `build-v5-data.mjs`.)
3. **Envio do Checar**: qual canal (e política de dados) e se Checar entra no menu do topo quando o envio abrir.
