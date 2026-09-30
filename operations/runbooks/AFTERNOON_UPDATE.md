# RUNBOOK — AFTERNOON_UPDATE

**Objetivo:** atualizar o pipeline do dia, avançar evidências e preparar candidatos editoriais para Human Review.

## Entradas
`CLAUDE.md`, `control/CURRENT_STATE.json`, `control/PIPELINE_TODAY.json`, `control/HUMAN_REVIEW_QUEUE.json`.
Sob demanda: `HEALTH.json`, `CORPUS_STATUS.json`, `INCIDENTS.json`.

## Passos
1. Pull → lock `AFTERNOON_UPDATE` → push do lock → `routine start`.
2. Pré-condição: MORNING_OPEN do mesmo `operational_date` em COMPLETED ou COMPLETED_WITH_WARNINGS. Se não, `routine finish --status SKIPPED --summary "MORNING não concluído"` e parar.
3. Atualizar EVIDENCE, DAY_STORY, EDITORIAL_CANDIDATE com contagens reais.
4. Aplicar decisões de Johnny: para cada Issue `human-gate` nova, `ctl.py review decide <RV> --status ... --by Johnny --ref <url da issue>`.
5. Novos candidatos com conclusão substantiva ⇒ `review add`.
6. Validate → `routine finish` → `report daily` → `report review-brief` → release → commit `ops(afternoon)` → push.
