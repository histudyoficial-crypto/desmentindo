# RUNBOOK — CONCORRÊNCIA

Duas camadas:

1. **GitHub Actions** (quando as rotinas forem automatizadas): todas as rotinas usam `concurrency: group: desmentindo-ops, cancel-in-progress: false`, então nunca rodam duas ao mesmo tempo no runner. O Publisher mantém o grupo próprio (`desmentindo-publisher`) e não escreve em `control/`.
2. **Lock no Control Plane** (`CURRENT_STATE.json#lock`), que vale para execuções manuais do Claude Code, Cowork e Actions.

## Sequência
```
git pull --rebase
RUN_ID=$(python3 operations/tools/ctl.py lock acquire MORNING_OPEN --holder claude-code)
git commit -am "ops(lock): MORNING_OPEN $RUN_ID" && git push   # o push é o "compare-and-swap"
```
- **Push rejeitado** (non-fast-forward): outro executor escreveu. `git pull --rebase`. Se o lock remoto for de outro run válido: descartar o seu, parar e registrar `CONCURRENCY_COLLISION` (SEV4, se não houve dano).
- `lock acquire` sai com código 3 se já existe lock válido.
- Lock expirado (TTL padrão de 90 min) aparece como aviso no `validate`. Assumir com `--force` só depois de confirmar que o executor anterior morreu, registrando incidente.

## Fim
```
python3 operations/tools/ctl.py validate
git pull --rebase                   # conflito em control/*.json → NÃO resolver "no chute": abortar, incidente
python3 operations/tools/ctl.py routine finish ... && python3 operations/tools/ctl.py lock release --run-id $RUN_ID
python3 operations/tools/ctl.py validate && git commit -am "ops(...)" && git push
```
