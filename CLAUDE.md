# CLAUDE.md — Desmentindo (repositório PÚBLICO)

Este repositório é **público**: site + Publisher. O estado operacional, o Human Review, o Command Center, os relatórios internos, as decisões e os incidentes vivem no repositório **privado** `histudyoficial-crypto/desmentindo-ops`.

## Fronteira
PRIVATE OPS → HUMAN GATE → APPROVED PUBLIC ARTIFACT → PUBLIC REPO (PR do Publisher) → merge humano → SITE.
- Nunca criar aqui `control/`, `operations/`, `reports/`, `command-center/` nem filas, notas internas, métricas de saúde ou incidentes. A CI `public-boundary.yml` bloqueia.
- PUBLISH=OFF por padrão. Publicar = merge humano de PR.

## Mapa
- `index.html` (= `desmentindo_local.html`), `js/`, `data/`, `img/`: app legado no ar. Deploy FTP (`deploy-locaweb.yml`) a cada push em `main`.
- `automation/publisher_runtime.py` + `desmentindo-publisher.yml`: Publisher horário (Vault outbox → PR). **Nunca faz merge.**
- `v4/`: nova interface pública (design canônico v4). Os dados vêm de adaptadores (`public-ui/build_public_data.py`); o modelo canônico não é alterado.

## Invariantes públicas
- Estados da afirmação: EM CHECAGEM · DOCUMENTADO · PARCIALMENTE DOCUMENTADO · AINDA NÃO DÁ PARA CONFIRMAR · NÃO ENCONTRAMOS REGISTRO, sempre com "CHECAMOS SE FOI DITO / SE ACONTECEU". Valor desconhecido = EM CHECAGEM, nunca estado conclusivo.
- Fonte localizada ≠ fato confirmado. Documento localizado ≠ interpretação confirmada.
- Mudança temporal ≠ contradição. Verbos interpretativos ("se contradisse", "mudou de lado", "voltou atrás", "recuou") só com revisão humana.
- VÍNCULO ≠ INFLUÊNCIA ≠ COORDENAÇÃO ≠ ILEGALIDADE. HIPÓTESE ≠ FATO. ALEGAÇÃO ≠ PROVA.
- Objeto primário = EVENTO / HISTÓRIA / AFIRMAÇÃO / DOCUMENTO. Sem página global de pessoa, dossiê, watchlist, ranking, score ou grafo pessoa↔pessoa.
- Não fabricar histórias, documentos, números ou fontes. Sem dado = estado vazio correto.
- Linguagem pública: nunca "auditoria, dossiê, corpus, evidência, ocorrência, matriz, entidade, proveniência, claim, pipeline, score" na tela.

## Proibido sem autorização de Johnny
Publicar, fazer merge em `main`, ativar cron, alterar Publisher/deploy (exceto proteção documentada), apagar dados, reorganizar Corpus, colocar credenciais em arquivos.
