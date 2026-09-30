# RUNBOOK — EVENING_CLOSE

**Objetivo:** fechar o dia, consolidar o relatório executivo e deixar o estado pronto para amanhã.

## Entradas
`CLAUDE.md`, `CURRENT_STATE.json`, `HEALTH.json`, `PIPELINE_TODAY.json`, `HUMAN_REVIEW_QUEUE.json`, `INCIDENTS.json`.
Sob demanda: `RESULTS.json`, `VIDEO_ENGINE.json`.

## Passos
1. Pull → lock `EVENING_CLOSE` → push do lock → `routine start`.
2. Estágios não tocados hoje continuam `NOT_EXECUTED` (não converter para 0).
3. Incidentes: atualizar status; resolvidos exigem `--resolution`. Gerar `report incident --id` para SEV1/SEV2.
4. HISTORICAL_CONTEXT_VALUE: só quando Johnny avaliar uma história (`ctl.py hcv add ...` com justificativa). Nunca pontuar automaticamente.
5. `report daily` (versão final do dia). Às sextas, também `report weekly`.
6. `next_run` = MORNING_OPEN do dia seguinte (o `routine finish` faz isso).
7. Validate → finish → release → commit `ops(evening)` → push.
