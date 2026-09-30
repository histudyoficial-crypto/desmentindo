# DECISIONS — registro de decisões operacionais

Registro append-only. Cada entrada: data (America/Sao_Paulo), decisor, decisão, motivo, referência.
Decisões editoriais sobre histórias ficam em `HUMAN_REVIEW_QUEUE.json` (campo `decision`), não aqui.

---

## 2026-09-29 — Publisher com gate por PR
- **Decisor:** Johnny
- **Decisão:** o Publisher (`desmentindo-publisher.yml`) só abre PR; nunca faz merge nem push em `main`. Publicação = merge humano.
- **Referência:** commit 92bffb3 ("Authorized by Johnny (FINALIZACAO / FINAL ACTIVATION, PR-gate decision 2026-09-29)").

## 2026-09-30 — Divisão de papéis e GitHub como Source of Truth
- **Decisor:** Johnny
- **Decisão:** JOHNNY = CEO / Editor / Human Gate · CHATGPT = Co-CEO / Strategy & Intelligence · CLAUDE CODE = COO / Executor / Automation Engine · CLAUDE COWORK = Chief of Staff / Reporting Layer · GITHUB = Source of Truth + Control Plane · VAULT = arquivos pesados e históricos.
- **Regra:** GitHub guarda a verdade. Claude Code executa. Cowork reporta. ChatGPT ajuda a dirigir. Johnny autoriza.
- **Referência:** briefing "CONTROL PLANE + COMMAND CENTER v1".

## 2026-09-30 — Control Plane v1 neste repositório; PUBLISH=OFF; schedules desligados
- **Decisor:** Johnny (briefing), executado por Claude Code
- **Decisão:** criar `control/`, `operations/`, `reports/`, `command-center/`. PUBLISH=OFF. Nenhum schedule novo até o ciclo manual MORNING → AFTERNOON → EVENING ser revisado.
- **Observação:** o cron horário do Publisher já existia e não foi alterado.

## 2026-09-30 — Pastas internas fora do deploy FTP
- **Decisor:** Claude Code (proteção), sujeito à aprovação do PR
- **Decisão:** `deploy-locaweb.yml` passa a excluir `control/`, `operations/`, `reports/`, `command-center/` e `CLAUDE.md` do envio para `public_html`. O Command Center é interno e não vai para desmentindo.com.br.
- **Pendente:** DQ-0001 (repositório público / GitHub Pages ainda expõe esses arquivos).
