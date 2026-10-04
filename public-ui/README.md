# public-ui — Desmentindo v4

Interface pública nova em `v4/` (prévia `noindex`; não substitui `index.html`).

```
node public-ui/build-public-data.mjs          # gera v4/data/ a partir do app legado (index.html)
node public-ui/build-public-data.mjs --check  # CI: falha se v4/data estiver desatualizado
python3 -m http.server 8765                   # http://127.0.0.1:8765/v4/
PW=$(npm root -g)/playwright node public-ui/qa/states.mjs   # QA dos estados (fixtures só no teste)
```

Depois de cada atualização do Publisher em `index.html`, rode o build e faça commit de `v4/data/`.
Pendências de design: `DESIGN_BACKLOG.md`.
