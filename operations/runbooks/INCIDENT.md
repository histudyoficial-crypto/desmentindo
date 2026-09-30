# RUNBOOK — INCIDENTES

| Severidade | Critério | Ação |
|---|---|---|
| SEV1 | Publicação indevida, vazamento, dado canônico corrompido | Parar rotinas, abrir incidente, DQ `CRITICAL_INCIDENT` para Johnny |
| SEV2 | Componente crítico FAILED (Publisher, Site, RHR na rotina) | Incidente + `report incident` |
| SEV3 | Degradação com contorno | Incidente |
| SEV4 | Anomalia sem impacto | Incidente informativo |

Tipos: CONCURRENCY_COLLISION, CAPACITY_DEGRADATION, SOURCE_UNAVAILABLE, FUTURE_TIMESTAMP_ANOMALY, RHR_UNAVAILABLE, PUBLISHER_FAILURE, SCHEMA_FAILURE, DEPLOY_FAILURE, OTHER.

```
ctl.py incident open --component RHR --type RHR_UNAVAILABLE --severity SEV2 --description "..." --impact "..." --evidence-url https://...
ctl.py incident update INC-YYYYMMDD-NNN --status RESOLVED --resolution "..."
ctl.py report incident --id INC-YYYYMMDD-NNN
```
