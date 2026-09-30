# DESIGN_BACKLOG — Desmentindo v4

Campos: TELA · COMPONENTE · PROBLEMA · SEVERIDADE · EVIDÊNCIA · CORREÇÃO PROPOSTA · SITUAÇÃO.
P0/P1 corrigidos na hora; P2/P3 registrados.

| Tela | Componente | Problema | Sev. | Evidência | Correção proposta | Situação |
|---|---|---|---|---|---|---|
| Todas | — | Os arquivos de referência visual (`*.dc.html`: Visual v4, DM Home v4, DM Historia v4, 26 Telas, famílias) não estavam no workspace nem no Vault. A implementação seguiu os valores do handoff (tokens, componentes, ordem, estados), sem comparação pixel a pixel. | P1 | Busca no workspace e no Dropbox sem resultado | Anexar os `.dc.html` e rodar comparação visual por tela | ABERTO |
| Home / História | EDITORIAL HERO | Não há imagem editorial por história no modelo (L5); todo hero usa a variante tipográfica/documental. | P2 | `v4/data/home.json` sem campo de imagem | Campo `imagem{src,credito,licenca,data}` por história | ABERTO (L5) |
| Home | Linha do dia 09:12 → 13:47 → 17:15 | O modelo não registra hora de publicação/atualização; a linha do dia não é renderizada (nada de horas inventadas). Marcadores mostram só a data. | P2 | eventos só têm `dp` (data) | Registrar `publicado_em`/`atualizado_em` com hora | ABERTO (L5) |
| Home | O que mudou hoje | Nenhuma afirmação tem histórico com mais de uma versão; mostra estado vazio. | P3 | `nar.claims[].historico` = 1 | Nada a fazer; aparece quando houver mudança | OK |
| História | Olha a data | O modelo não tem T1/T2 estruturados; módulo não renderiza com dados reais. Componente pronto e testado por fixture (verbos fechados, fonte obrigatória, verbo interpretativo bloqueado sem revisão humana). | P2 | `temporal_contrasts: []` | Campo `temporal_contrasts` produzido pela redação com Human Gate | ABERTO (L5) |
| História | Linha do tempo | Sem verbo por marco (DISSE, ASSINOU…); usa FATO COM FONTE / ALEGAÇÃO ATRIBUÍDA. | P2 | eventos sem `marco`/verbo | Campo `marco.verbo` | ABERTO (L5) |
| Afirmação | CHECAMOS SE FOI DITO / ACONTECEU | Derivado provisoriamente do tipo da afirmação (alegação/opinião → foi dito; demais → aconteceu). | P2 | falta campo `checamos` | Campo explícito por afirmação | ABERTO (L5) |
| Está circulando | CIRCULATING CLAIM CARD | A imagem original da origem não é reproduzida (decisão editorial registrada no dado); a origem aparece como cartão tipográfico. | P3 | `narrativas[].entrada_nota` | — | OK |
| Em destaque | NEWS HIGHLIGHT CARD | Sem foto 4:5 e sem barra de cobertura (não há medição de veículos). | P3 | `HUB.itens` sem imagem/cobertura | Só com medição real | ABERTO |
| Textos | Linguagem | Textos editoriais trazem palavras da lista (evidência, entidade) em uso comum; "habeas corpus" é termo jurídico. A interface não usa nenhum termo interno. "dossiê" referido ao próprio arquivo é trocado no adaptador; nomes próprios ficam. | P2 | varredura QA | Revisão editorial dos textos-fonte | ABERTO |
| Checar / Newsletter / Envie / Contato | Formulários | Sem backend: a tela diz que nada é enviado nem guardado. | P1 | — | Definir canal (e-mail/serviço) e política de dados | ABERTO |
| Desmentindo Data | PROFESSIONAL CAPABILITY | Estados JÁ EXISTE/PROTÓTIPO/EM ESTUDO são proposta a confirmar (L2). | P2 | handoff L2 | Confirmar com a equipe técnica | ABERTO (L2) |
| Sobre | Equipe/financiamento | Conteúdo não definido (L3); estado vazio honesto. | P2 | handoff L3 | Johnny define | ABERTO (L3) |
| — | Tablet | Breakpoint de tablet não desenhado (L4); grades auto-fit reorganizam. | P3 | handoff L4 | — | ABERTO (L4) |
| História | Performance | "Compliance Zero / Master" gera 668 KB de JSON (226 registros completos). | P2 | `v4/data/historias/` | Paginar registros por ano | ABERTO |
| Vídeo | VIDEO EVIDENCE | Sem minutagem no modelo; mostra "▶ VÍDEO" e "minutagem não registrada". | P3 | fontes sem timestamp | Campo `t` na fonte de vídeo | ABERTO |
