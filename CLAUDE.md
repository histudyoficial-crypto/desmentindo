# CLAUDE.md — Desmentindo (invariantes operacionais)

Leia este arquivo antes de qualquer tarefa neste repositório.

## Papéis
- **Johnny**: CEO / Editor / Human Gate. Único que autoriza publicação e decisões editoriais.
- **ChatGPT**: Co-CEO / Strategy & Intelligence.
- **Claude Code**: COO / Executor / Automation Engine. Executa rotinas e mantém o Control Plane.
- **Claude Cowork**: Chief of Staff / Reporting Layer. Lê `control/` e `reports/`; não reconstrói o projeto.
- **GitHub**: Source of Truth + Control Plane. **Vault (Dropbox)**: arquivos pesados e históricos.

## Mapa do repositório
- `index.html` (= `desmentindo_local.html`), `js/`, `data/`, `img/`: o site publicado. Deploy FTP (`deploy-locaweb.yml`) a cada push em `main`.
- `automation/publisher_runtime.py` + `desmentindo-publisher.yml`: Publisher horário (Vault outbox → PR). **Nunca faz merge.**
- `control/`: estado operacional (verdade). Edite **somente** via `python3 operations/tools/ctl.py`.
- `operations/`: runbooks, prompts das rotinas, config, ferramenta `ctl.py`, template de workflow (não instalado).
- `reports/`: relatórios gerados para Cowork (contrato em `reports/README.md`).
- `command-center/`: dashboard interno (view layer; **não** é Source of Truth).

## Invariantes (não negociáveis)
1. **PUBLISH=OFF por padrão.** Nenhuma rotina publica. Publicação só por merge humano de PR.
2. **Human Gate obrigatório** para qualquer conclusão política substantiva. Sem `APPROVED` + `decision_ref` do GitHub, não sai.
3. **QUERY_UNAVAILABLE ≠ NO_MATCH.** Fonte sem adaptador/consulta indisponível nunca vira "nada encontrado".
4. **NOT_EXECUTED ≠ ZERO.** Não rodou ⇒ `value: null`, `state: NOT_EXECUTED`. Nunca inventar zero.
5. **FAILED ≠ ZERO_RESULTS.** Falha é falha; registrar `error_summary` e incidente.
6. **EXTRACTED_STATEMENT ≠ AUDIT_CLAIM.** Só alegações auditáveis entram na contagem de CLAIMS.
7. **ENTITY_MENTION ≠ ENTITY.** Menção textual não é identificação resolvida.
8. **VÍNCULO ≠ INFLUÊNCIA · INFLUÊNCIA ≠ COORDENAÇÃO · COORDENAÇÃO ≠ ILEGALIDADE.**
9. **HIPÓTESE ≠ FATO · ALEGAÇÃO ≠ PROVA.**
10. **Mudança temporal ≠ contradição automática.** Mudar de posição ao longo do tempo exige análise humana.
11. **Objeto primário = EVENT / STORY / CLAIM / DOCUMENT.** Nunca a pessoa.
12. **Sem watchlist ou dossiê automático de pessoa.** Proibido criar `person_score`, `political_score`, `suspicion_score`, `wrongdoing_score`, `controversy_score`, `person_ranking`, `person_watchlist` (o `ctl.py validate` bloqueia).
13. **CORPUS_MEMBERSHIP ≠ TECHNICAL_SEARCHABILITY.**
14. **UNKNOWN = ausência de sinal**, não "provavelmente OK".

## Proibido sem autorização explícita de Johnny (registrada em `control/DECISIONS.md`)
- Publicar, fazer merge em `main`, ativar cron/schedule.
- Alterar `automation/publisher_runtime.py`, `desmentindo-publisher.yml` ou o deploy (exceto proteção documentada).
- Reconstruir RHR, reiniciar TA E2, reorganizar o Corpus, apagar dados, migrar arquivos pesados.
- Colocar credenciais em arquivos, commits, logs ou no browser.

## Repositório público
Tudo aqui é público (repo público + GitHub Pages). Na fila de Human Review, registrar só resumo + links; nunca rascunho integral (ver DQ-0001).

## Contexto just-in-time
Carregue só o que a tarefa exige (ver `operations/config/operations.json#routines.*.context_budget`).
- Não abrir `data/ag/*` (7 MB), `data/corpus/links.*`, `index.html` (3,7 MB) sem necessidade.
- RHR somente quando `RHR_WARRANTED=true`. Corpus somente quando a história pede contexto histórico.

## Protocolo de execução de rotina (concorrência)
```
git pull --rebase origin <branch>
python3 operations/tools/ctl.py lock acquire <ROTINA> --holder claude-code   # imprime RUN_ID
git commit -am "ops(lock): <ROTINA> <RUN_ID>" && git push                    # push rejeitado = outro executor → pull, reavaliar
python3 operations/tools/ctl.py routine start <ROTINA> --run-id <RUN_ID>
... executar o runbook ...
python3 operations/tools/ctl.py validate                                     # QA obrigatório
git pull --rebase origin <branch>                                            # conflito em control/ → CONCURRENCY_COLLISION
python3 operations/tools/ctl.py routine finish <ROTINA> --run-id <RUN_ID> --status COMPLETED --summary "..."
python3 operations/tools/ctl.py report daily
python3 operations/tools/ctl.py lock release --run-id <RUN_ID>
python3 operations/tools/ctl.py validate && git add -A && git commit -m "ops(<rotina>): ..." && git push
```
Detalhes: `operations/runbooks/CONCURRENCY.md`.

## Comandos úteis
- Validar tudo: `python3 operations/tools/ctl.py validate`
- Recalcular derivados + bundle do dashboard: `python3 operations/tools/ctl.py sync`
- Ver dashboard: `python3 -m http.server 8000` na raiz → http://localhost:8000/command-center/
