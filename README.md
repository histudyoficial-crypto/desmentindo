# Desmentindo

Dossie de auditoria de narrativas politicas ("Politica Brasil").

- `index.html` / `desmentindo_local.html` — mesmo conteudo (o app single-file completo).
- `img/` — fotos das pessoas citadas no dossie.

## Deploy automatico

A cada push na branch `main`, o workflow `.github/workflows/deploy-locaweb.yml`
envia este conteudo por FTP para o servidor da Locaweb (`/public_html/`),
atualizando automaticamente https://desmentindo.com.br/

Mirror estatico (GitHub Pages): https://histudyoficial-crypto.github.io/desmentindo/

## Operação

O Control Plane, o Command Center, o Human Review e os relatórios internos vivem no repositório privado `histudyoficial-crypto/desmentindo-ops`. Este repositório só recebe artefatos aprovados (PR do Publisher). Regras em `CLAUDE.md`; a CI `public-boundary.yml` impede que material interno entre aqui.
