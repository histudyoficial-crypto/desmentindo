# v5 — decisões registradas

Prévia `noindex` em `/v5/`. Não substitui `index.html` nem a v4.

```
node public-ui/build-v5-data.mjs          # gera v5/data/ (determinístico)
node public-ui/build-v5-data.mjs --check  # falha se v5/data/ estiver desatualizado
python3 -m http.server 8765               # http://127.0.0.1:8765/v5/
python3 public-ui/qa/v5_qa.py --shots /tmp/v5shots   # QA (Playwright) → public-ui/qa/v5_qa_result.json
```

- Fontes: só `index.html` (literais `D`), o manifesto `ms-manifest`, `data/corpus/links` (via `acervos-manifest`) e `data/ag/corpus` (lido no build, nunca no navegador). `HUB` não é usado: as notas trazem jargão interno.
- "Já falaram sobre isso" numa história = trechos ELEGÍVEIS do caso em `data/corpus/links`, publicados só quando o par (vídeo, segundo) **e** o texto batem com um segmento do arquivo AG. 2.418 de 2.451 batem; o resto fica fora.
- Fora do público: segmentos marcados entre colchetes (`[caso sensível]`, exceções) e de confiança baixa (`B`).
- O texto do trecho é o resumo do segmento (não transcrição literal). Por isso aparece sem aspas e com a nota "O texto resume o que é dito naquele minuto. Confira no vídeo." O texto vem sem acentos em parte do arquivo; não foi corrigido.
- Histórias sem caso ligado não ganham trechos por busca de palavra (testes com "Master", "Porto Seguro" trouxeram falsos positivos). Mostram as pessoas citadas na história que têm trechos nos arquivos, com link para a página de consulta.
- Página de pessoa (`#/arquivo/<slug>`) é consulta de arquivo: histórias em que aparece e trechos com data e minuto. Sem foto, bio, nota, ranking ou perfil. Contagens são navegacionais.
- Disponibilidade vem do manifesto (`searchable`). Fonte não pesquisável aparece como "Arquivo ainda não disponível para pesquisa", nunca com zero.
- Busca: índice por palavra em arquivos por prefixo (`v5/data/busca/t/`) + trechos em blocos de 700 (`busca/s/`, do mais recente ao mais antigo). Uma busca baixa só a meta (~19 KB), os fragmentos das palavras e os blocos dos trechos exibidos.
- O deploy (`deploy-locaweb.yml`) roda os builds da v4 e da v5 antes do FTP. `v5/data` também fica no repositório para a prévia funcionar sem o build.
- Pendência: `public-boundary.yml` ainda só varre `v4/`; incluir `v5/` e `build-v5-data.mjs --check` exige mudar esse workflow (fora do escopo desta entrega).
- **Edição editorial (DATA ≠ PRESENTATION, 01/10/2026):** conteúdo aprovado no Human Gate chega pelo Publisher como JSON próprio em `data/editorial/` (`index.json` + `edicoes/<data>.json`), não mais embutido no `index.html`. A v5 lê esse JSON direto (versionado pelo carimbo de build e pelo sha256 do índice) e mostra "Agora · edição de …" com texto aprovado e fontes; os casos acompanhados passam a "Em acompanhamento". O build só **valida** a edição (sha256, contrato de campos, fontes https; falha fechada) e não a copia para `v5/data`, então o PR do Publisher e mudanças de interface entram em qualquer ordem. Sem edição, a Home é idêntica à anterior; no deploy, um índice vazio evita 404. `verify-production` confere o JSON editorial servido byte a byte (EDITORIAL_MATCH). Rollback: reverter o PR do Publisher remove a edição; `ROOT_VERSION=legacy` segue valendo.
- Roteador: só a navegação mais recente pinta a página (resposta atrasada de outra rota é descartada).
