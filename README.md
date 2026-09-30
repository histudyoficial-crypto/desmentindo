# Desmentindo

Dossie de auditoria de narrativas politicas ("Politica Brasil").

- `index.html` / `desmentindo_local.html` — mesmo conteudo (o app single-file completo).
- `img/` — fotos das pessoas citadas no dossie.

## Deploy automatico

A cada push na branch `main`, o workflow `.github/workflows/deploy-locaweb.yml`
envia este conteudo por FTP para o servidor da Locaweb (`/public_html/`),
atualizando automaticamente https://desmentindo.com.br/

Mirror estatico (GitHub Pages): https://histudyoficial-crypto.github.io/desmentindo/

## Operação (Control Plane + Command Center)

- `CLAUDE.md` — invariantes operacionais (PUBLISH=OFF, Human Gate, QUERY_UNAVAILABLE ≠ NO_MATCH…).
- `control/` — estado operacional (source of truth). Alterar só via `python3 operations/tools/ctl.py`.
- `operations/` — runbooks MORNING/AFTERNOON/EVENING, prompts, config, `ctl.py`.
- `reports/` — relatórios para Cowork (contrato em `reports/README.md`).
- `command-center/` — dashboard interno: `python3 -m http.server 8000` → http://localhost:8000/command-center/ (ou abrir o `index.html` direto, modo snapshot).

Nenhuma dessas pastas vai para o FTP da Locaweb.
