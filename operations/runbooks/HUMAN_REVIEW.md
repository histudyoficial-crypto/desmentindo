# RUNBOOK — HUMAN REVIEW

## Quando um item entra na fila
Qualquer conclusão política substantiva, alegação nova sobre pessoa pública, "contradição" temporal, risco jurídico, direito de imagem incerto ou baixa confiança.

## Como Johnny decide (sem credenciais no browser)
1. No Command Center → **Precisa de você**, clicar na ação (APPROVE / REQUEST CHANGES / HOLD / REJECT). O botão abre uma **GitHub Issue pré-preenchida** com label `human-gate`.
2. Johnny revisa e envia a Issue (autenticado no próprio GitHub).
3. Na próxima rotina, o Claude Code aplica: `ctl.py review decide RV-... --status APPROVED --by Johnny --ref <url da issue>` e fecha a Issue com o commit.

## Regras
- Status válidos: WAITING_REVIEW, APPROVED, CHANGES_REQUESTED, HOLD, REJECTED.
- Decisão sem `decision_ref` do GitHub é inválida (validate bloqueia).
- APPROVED libera o item para virar candidato do Publisher. O merge do PR continua humano.
- Repo público: só resumo e links.
