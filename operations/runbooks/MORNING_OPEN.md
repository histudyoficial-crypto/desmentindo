# RUNBOOK — MORNING_OPEN

**Objetivo:** abrir o dia operacional, levantar o que chegou e montar a pauta candidata. **Nada é publicado.**

## Entradas (carregar só isto)
`CLAUDE.md`, `control/CURRENT_STATE.json`, `control/HEALTH.json`, `control/HUMAN_REVIEW_QUEUE.json`, `control/INCIDENTS.json`.
Sob demanda: `control/CORPUS_STATUS.json`, `control/PIPELINE_TODAY.json`.

## Passos
1. `git pull --rebase` → `ctl.py lock acquire MORNING_OPEN` → commit + push do lock (ver CONCURRENCY.md).
2. Se `operational_date` < hoje (America/Sao_Paulo): `ctl.py day-open`.
3. `ctl.py routine start MORNING_OPEN --run-id $RUN_ID`.
4. **Saúde:** para cada componente com sinal (PUBLISHER, SITE, CORPUS), atualizar via `ctl.py health set`. Sem sinal ⇒ manter `UNKNOWN`.
5. **News Hub → Eventos → Relevância:** registrar contagens reais com `ctl.py pipeline set <STAGE> --state MEASURED --value N --source "..."`. Não rodou ⇒ `NOT_EXECUTED`. Fonte fora do ar ⇒ `FAILED` + incidente `SOURCE_UNAVAILABLE`.
6. **Claims:** contar só AUDIT_CLAIM (EXTRACTED_STATEMENT não conta).
7. **RHR:** somente onde `RHR_WARRANTED`. Fonte membro não pesquisável ⇒ `QUERY_UNAVAILABLE`.
8. Itens com conclusão política substantiva ⇒ `ctl.py review add --file ...` (resumo + links; repo público).
9. QA: `ctl.py validate`.
10. `ctl.py routine finish MORNING_OPEN --status ... --summary "..."` → `ctl.py report daily` → `ctl.py report review-brief` (se houver fila).
11. `ctl.py lock release` → validate → commit `ops(morning): <data>` → push.

## Critérios de parada (abrir incidente e parar)
Conflito em `control/` após rebase · lock de outro executor válido · timestamp futuro · falha de schema · qualquer pedido de publicação.
