# CLAUDE.md — Desmentindo (repositório PÚBLICO)

Este repositório é **público**: site + Publisher. O estado operacional, o Human Review, o Command Center, os relatórios internos, as decisões e os incidentes vivem no repositório **privado** `histudyoficial-crypto/desmentindo-ops`.

## Fronteira
PRIVATE OPS → HUMAN GATE → APPROVED PUBLIC ARTIFACT → PUBLIC REPO (PR do Publisher) → merge humano → SITE.
- Nunca criar aqui `control/`, `operations/`, `reports/`, `command-center/` nem filas, notas internas, métricas de saúde ou incidentes. A CI `public-boundary.yml` bloqueia.
- PUBLISH=OFF por padrão. Publicar = merge humano de PR.

## Mapa
- `index.html` (= `desmentindo_local.html`), `js/`, `data/`, `img/`: app legado (fonte de dados do Publisher; não é mais a raiz quando ROOT_VERSION=v5). **LEGACY_PUBLIC_APP = RETIRED (Johnny, 02/10/2026):** um só Desmentindo público — no deploy, `/desmentindo_local.html` vira um redirecionamento para a raiz (a rota `#/…` é preservada e o adaptador da v5 leva ao equivalente público). O app anterior fica só como histórico técnico no Git. `ROOT_VERSION=legacy` é rollback de emergência e reexpõe o app anterior; preferir reverter o PR. Deploy FTP (`deploy-locaweb.yml`) a cada push em `main`.
- `automation/publisher_runtime.py` + `desmentindo-publisher.yml`: Publisher horário (Vault outbox → PR). **Nunca faz merge.**
- `v4/`: nova interface pública (design canônico v4). Os dados vêm de adaptadores (`public-ui/build_public_data.py`); o modelo canônico não é alterado.
- `v5/`: interface pública em produção desde 01/10/2026 (início oficial da operação). A RAIZ do site é gerada no deploy
  por `public-ui/build-root.mjs` a partir de `v5/index.html` (indexável; assets e dados em `/v5/`). `/v5/` segue como
  cópia de prévia `noindex`. ROLLBACK: trocar `public-ui/ROOT_VERSION` de `v5` para `legacy` (1 commit) → a raiz volta
  a ser o `index.html` legado. Dados de apresentação: `public-ui/build-public-data.mjs` (v4) e `build-v5-data.mjs` (v5)
  rodam no deploy a partir dos dados públicos aprovados (o `index.html` legado do Publisher) — nunca do Human Review.

## Invariantes públicas
- Estados da afirmação: EM CHECAGEM · DOCUMENTADO · PARCIALMENTE DOCUMENTADO · AINDA NÃO DÁ PARA CONFIRMAR · NÃO ENCONTRAMOS REGISTRO, sempre com "CHECAMOS SE FOI DITO / SE ACONTECEU". Valor desconhecido = EM CHECAGEM, nunca estado conclusivo.
- Fonte localizada ≠ fato confirmado. Documento localizado ≠ interpretação confirmada.
- Mudança temporal ≠ contradição. Verbos interpretativos ("se contradisse", "mudou de lado", "voltou atrás", "recuou") só com revisão humana.
- VÍNCULO ≠ INFLUÊNCIA ≠ COORDENAÇÃO ≠ ILEGALIDADE. HIPÓTESE ≠ FATO. ALEGAÇÃO ≠ PROVA.
- Objeto primário = EVENTO / HISTÓRIA / AFIRMAÇÃO / DOCUMENTO.
- PROIBIDO (decisão de Johnny, 01/10/2026): dossiê global de pessoa, perfil político, perfil ideológico, perfil de
  irregularidades, score de suspeita, score político, score de controvérsia, ranking de pessoas, watchlist e grafo
  pessoa↔pessoa.
- PERMITIDO: CONSULTA AO ARQUIVO POR PESSOA (v5 `#/arquivo/<slug>`). A interface só recupera registros documentais
  relacionados — notícias, falas, vídeos, datas, fontes, documentos e cronologia quando válida. Pessoa é chave de
  consulta, não objeto de julgamento. Contagens são navegacionais, nunca avaliativas.
- Não fabricar histórias, documentos, números ou fontes. Sem dado = estado vazio correto.
- Linguagem pública: nunca "auditoria, dossiê, corpus, evidência, ocorrência, matriz, entidade, proveniência, claim, pipeline, score" na tela.

## Checar
- `#/checar` apresenta o produto. **CHECAR_SUBMISSIONS = CLOSED** até o fluxo ponta a ponta (GLT-001) ser validado e Johnny autorizar: sem campo de envio, sem upload, sem chamada que sugira envio, fora da navegação principal. **CHECAR_PUBLIC_EXAMPLE = OFF** (`build-v5-data.mjs`) até decisão editorial explícita.
- Alegação atribuída nunca aparece como fato: rótulo + quem alega + resposta + fonte (`public-ui/attribution_audit.json`; build falha com `ALLEGATION_RENDERED_AS_FACT`).

## Proibido sem autorização de Johnny
Publicar, fazer merge em `main`, ativar cron, alterar Publisher/deploy (exceto proteção documentada), apagar dados, reorganizar Corpus, colocar credenciais em arquivos.
