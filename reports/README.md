# REPORTING CONTRACT v1 — Cowork

Cowork (Chief of Staff) trabalha **principalmente** com quatro fontes e só abre detalhes quando precisa:

| Ordem | Arquivo | Para quê |
|---|---|---|
| 1 | `control/CURRENT_STATE.json` | Status geral, rotinas do dia, contagens, lock |
| 2 | `control/HEALTH.json` | Saúde por componente |
| 3 | `control/HUMAN_REVIEW_QUEUE.json` + `control/DECISION_QUEUE.json` | O que precisa de Johnny |
| 4 | `reports/` | Relatórios prontos (abaixo) |

Detalhes sob demanda: `INCIDENTS.json`, `PIPELINE_TODAY.json`, `CORPUS_STATUS.json`, `RESULTS.json`, `VIDEO_ENGINE.json`, `ENGINEERING.json`, `BUSINESS.json`.
Cowork **não** abre `data/`, `index.html` nem o Vault para montar relatório.

## Formatos

Todos os relatórios são Markdown com **front matter** (`---` … `---`, um `chave: valor-JSON` por linha) seguido de seções numeradas fixas. São gerados por `python3 operations/tools/ctl.py report <tipo>`, nunca escritos à mão.

| Tipo | Caminho | Front matter mínimo | Seções |
|---|---|---|---|
| `DAILY_EXECUTIVE_REPORT` | `reports/daily/YYYY-MM-DD.md` (+ cópia `reports/executive/LATEST.md`) | report_type, contract_version, operational_date, generated_at, overall_status, publish_state, pending_human_reviews, open_decisions, active_incidents, degraded_services | 1 Status geral · 2 Rotinas · 3 Pipeline · 4 Precisa de Johnny · 5 Incidentes ativos · 6 Saúde |
| `WEEKLY_OPERATING_REPORT` | `reports/weekly/YYYY-Www.md` | report_type, contract_version, iso_week, week_start, week_end, generated_at, daily_reports_found, incidents_in_week, reviews_decided, historical_context_value | 1 Cobertura · 2 Incidentes · 3 Human Review · 4 Resultados · 5 Engenharia P0/P1 |
| `INCIDENT_REPORT` | `reports/incidents/INC-….md` | report_type, contract_version, incident_id, component, type, severity, status, generated_at | Descrição · Impacto · Resolução |
| `HUMAN_REVIEW_BRIEF` | `reports/human-review/YYYY-MM-DD.md` | report_type, contract_version, operational_date, generated_at, waiting_count | Um bloco por item: alegação, evidência, contraevidência, RHR, fontes, ações |

## Semântica dos valores
- Número = medido (`MEASURED`). `0` é zero real.
- `UNKNOWN`, `NOT_EXECUTED`, `NOT_AVAILABLE`, `NOT_CONFIGURED`, `QUERY_UNAVAILABLE`, `FAILED` são estados, não zeros. Cowork deve repeti-los literalmente, nunca convertê-los para "0" ou "nenhum".

## O que Cowork pode escrever
Nada em `control/`. Cowork produz resumos para Johnny a partir destes arquivos. Se detectar inconsistência, reporta ao Claude Code (Issue com label `ops`).
