# Auditoria funcional da v4 (base para a v5)

Data: 2026-10-01 · branch de base: `main` @ be3dafe · escopo: `v4/index.html`, `v4/js/app.js`, `v4/data/*`,
`public-ui/build-public-data.mjs` e os dados públicos (`data/manifest.*.json`, `data/ag/*`, `data/corpus/*`).

| Item | Classificação | Evidência (uma linha) |
|---|---|---|
| AG_FRONTEND_DATA | PARTIAL | `v4/data/arquivos.json` traz só a cobertura do manifesto; a busca de vídeos em `#/arquivos` baixa o arquivo completo de 7 MB (`data/ag/corpus.*.json`) no navegador (`archiveSearch`, app.js). Nada de AG nas páginas de história. |
| CC_FRONTEND_DATA | DATA_NOT_AVAILABLE | Manifesto: Caio Coppolla 8/553, `PARTIAL`, `searchable=false`, `dataset=null`; `data/corpus/links` tem `cc_occurrence_count=0` em todas as pessoas/casos (não é zero real: o arquivo não é pesquisável). |
| TA_FRONTEND_DATA | DATA_NOT_AVAILABLE | Manifesto: Te Atualizei 93/581, `PARTIAL`, `searchable=false`, `dataset=null`. Nenhum dado público de trechos. |
| RHR_VISIBLE_IN_V4 ("o que já foi dito" nas histórias) | DATA_AVAILABLE_BUT_NOT_EXPOSED | `data/corpus/links.*.json` tem 13 casos e 29 pessoas com trechos AG elegíveis (vídeo, data, segundo, texto); nem `build-public-data.mjs` nem `app.js` leem esse arquivo (0 referências). |
| SEARCH_V4 | PARTIAL | `busca.json` (387 KB, carregado inteiro) busca histórias, registros e afirmações; o arquivo de vídeos fica numa busca separada em `#/arquivos`, com download de 7 MB e sem agrupamento por fonte. |
| TIMESTAMPS_AVAILABLE | AVAILABLE (dados) | Segmentos `sg[].s` (segundos) em `data/ag/corpus` e `timestamp` em `data/corpus/links`; 2.433 de 2.451 trechos elegíveis batem com um segmento (mesmo vídeo e segundo). Na v4 só aparecem na busca de `#/arquivos`. |
| DEEP_LINKS_AVAILABLE | PARTIAL | Manifesto AG `has_deep_links=true`; a v4 monta `watch?v=<id>&t=<s>s` apenas na busca de `#/arquivos`; o vídeo da história usa a URL da fonte sem minutagem. |
| STORY_TO_ARCHIVE_OCCURRENCES | DATA_AVAILABLE_BUT_NOT_EXPOSED | Chaves de caso de `links.cases` (Lava Jato, Triplex, Atibaia, CPMI do INSS, Dark Horse…) coincidem com `D.casos`; a história da v4 não tem o bloco nem link para os trechos. |

## Consequências para a v5
1. Mostrar "Já falaram sobre isso" nas histórias com os trechos de `links.cases`, verificados contra o segmento do arquivo AG (mesmo vídeo e mesmo segundo); o texto exibido é o do segmento.
2. Uma busca só, que procura também no texto dos trechos AG, com índice fragmentado (nunca baixar os 7 MB / 6,7 MB).
3. Disponibilidade lida do manifesto: fonte com `searchable=false` aparece como "ainda não disponível para pesquisa", nunca como zero.
4. Build da v5 e da v4 no deploy, para os dados não ficarem velhos depois do Publisher.
