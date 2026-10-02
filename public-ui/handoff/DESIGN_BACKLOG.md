# DESIGN_BACKLOG — Desmentindo

Único registro de melhorias visuais descobertas no uso real. Severidade: P0 quebra/informação errada · P1 compreensão/hierarquia/mobile · P2 visual importante · P3 cosmético.

| SCREEN | COMPONENT | ISSUE | SEVERITY | EVIDENCE | PROPOSED_FIX | STATUS |
|---|---|---|---|---|---|---|
| História | Editorial Hero | Os dados não têm campo de imagem por evento ou caso; o hero cai no modo "data + documento". | P1 | `dados.json` sem `img` em `ev`/`casos` | Adicionar `imagem {url, credito, tipo}` no modelo de apresentação (não no Corpus); enquanto isso, hero tipográfico. | ABERTO |
| História | Título | O título da história é o rótulo do caso ("Compliance Zero / Master"), não um gancho editorial. | P1 | `caso_lbl` | Campo `gancho` (≤60 car.) preenchido pela redação, com revisão humana. | ABERTO |
| História | Visual Timeline | Textos dos eventos têm 300–600 caracteres; o corte em 110 às vezes para no meio da ideia. | P1 | `ev[].t` | Campo `resumo_curto` (≤110) no adaptador; manter o texto completo ao abrir. | ABERTO |
| História | Visual Timeline | Seleção de marcos é por espaçamento, não por importância. | P2 | adaptador `pick` | Campo `marco:true` definido pela redação. | ABERTO |
| História | Open Questions | Modelo não tem perguntas abertas por caso; aparece o estado vazio. | P2 | sem campo | Campo `perguntas[{texto,status}]`. | ABERTO |
| História | Document Spotlight | Documento escolhido pelo domínio do link (jus.br, gov.br…); não há página nem trecho. | P1 | heurística `kind()` | Campos `documento {url,pagina,trecho,tipo}`; marcação sempre identificada como do Desmentindo. | ABERTO |
| História | Source Rail | Tipo da fonte inferido pelo domínio (oficial, vídeo, reportagem). | P2 | heurística | Campo `tipo_fonte` no registro. | ABERTO |
| História | Estados | Eventos só têm `nat` f/a; faltam "checamos se foi dito / se aconteceu" por evento. | P1 | `ev[].nat` | Campo `checamos` no adaptador. | ABERTO |
| Home | Em destaque | Hub tem 1 item nesta edição; seção fica curta. | P2 | `hub.length=1` | Estado "poucos itens" já tratado; completar com a edição anterior marcada com data. | ABERTO |
| Home | Está circulando | As 27 afirmações vêm de uma única peça auditada; faltam origem (tipo, hora) por afirmação. | P1 | `cl`, `narr` | Campo `origem {tipo, visto_em}` por afirmação. | ABERTO |
| Home | Entenda os casos | "Outros contextos e frentes menores" não é um caso; foi filtrado. | P2 | `casos` | Não publicar como caso; reclassificar. | ABERTO |
| Todas | Fotos | Política: fotos só do arquivo, P&B, com crédito. Nenhuma foto usada nesta rodada. | P3 | CLAUDE.md | Ligar `fotos` quando houver campo por história. | ABERTO |
| Home | Está circulando | Status `em_investigacao` e `nao_avaliado` caíam em "Ainda não dá para confirmar". | P0 | adaptador `pickSt` | Mapeados para EM CHECAGEM; valor desconhecido nunca vira estado conclusivo. | CORRIGIDO |
| Raiz (v5) | Alegação na cronologia | 35 marcos, 17 atualizações e 1 resumo eram alegação atribuída sem rótulo. | P0 | `build-v5-data.mjs` (chrono/updates sem `nat`) | Campo `allegation` no adaptador + rótulo "ALEGAÇÃO ATRIBUÍDA"; gate `V5_EPISTEMIC_QA`. | CORRIGIDO (2026-10-02) |
| Arquivo anterior | Módulos proibidos | `desmentindo_local.html` segue público com Matriz, Vínculos, Mapa, Segundo cérebro, Termômetro, Fichas, Contagens. | P0 | app anterior | Retirar da superfície pública (DECISÃO 1 de Johnny). A raiz já não aponta para eles. | AGUARDANDO DECISÃO |
| Agora | URL por notícia | Notícias do AGORA não tinham página própria. | P1 | `P.home` | `#/agora/<id>` com fontes visíveis. | CORRIGIDO (2026-10-02) |
| Agora | Fontes | Título do documento só no `title` (hover). | P1 | Home | Título visível na página da notícia (trilho de fontes). | CORRIGIDO (2026-10-02) |
| Home | AGORA | 11 notícias com texto dominavam a Home. | P1 | Home | 3 com texto + linhas. | CORRIGIDO (2026-10-02) |
| Todas | Rotas antigas | `#/caso`, `#/pessoa`, `#/eventos`… caíam na Home sem aviso. | P1 | roteador | Adaptador de compatibilidade (redireciona, "mudou de lugar" ou "saiu da página pública"). | CORRIGIDO (2026-10-02) |
| Busca | Títulos | Página sem `h1`. | P1 | QA de acessibilidade | `h1` "Pesquise o arquivo". | CORRIGIDO (2026-10-02) |
| Celular | Navegação | Sem barra inferior; Checar e rodapé fora de alcance. | P1 | DM Rodape | Barra inferior 5 itens, 54 px, ativo com borda amarela. | CORRIGIDO (2026-10-02) |
| Checar | Envio | Não existe canal de envio. | P1 | — | Definir canal e política de dados (DECISÃO 3). Página diz que o envio ainda não está aberto. | ABERTO |
| Checar | Exemplo ORIGINAL × CHECADO | Única peça checada publicada (N001) envolve Banco Master (GLT-001). | P1 | `v4/data/afirmacoes.json` | `CHECAR_PUBLIC_EXAMPLE = null` até decisão (DECISÃO 2). | AGUARDANDO DECISÃO |
| Está circulando / Já checamos | Feed | Só 1 peça checada; falta origem por afirmação. | P1 | dados | Campos `origem {tipo, visto_em}` e feed de checagens. | ABERTO (DATA_GAP) |
| Páginas internas | Busca no cabeçalho | Design tem busca no cabeçalho (desktop). | P2 | DM Cabecalho | Campo compacto no topo das páginas internas. | ABERTO |
| História | Hero | Design v4 usa hero escuro (tipográfico sem foto); v5 mantém cabeçalho claro com data protagonista. | P2 | DM Historia v4 | Variante escura quando houver gancho editorial (campo `gancho`). | ABERTO |
| História | Isso já apareceu antes | Faixa 4:3 por ano não implementada (lista de trechos mantida). | P2 | DM Historia v4 | Faixa por ano com o presente em amarelo. | ABERTO |
| História | O que ele NÃO diz | Sem campo no dado; o bloco não é inventado. | P2 | DM Historia v4 | Campo `documento.nao_diz`. | ABERTO (DATA_GAP) |
| Checar | Cards 1080 | A peça checada (`.asset`) tem marca, data e endereço; falta exportar 1080×1350/1920. | P3 | DM Cards | Derivação para Instagram/Story/X a partir do CHECKED_MASTER_ASSET. | ABERTO |
| Celular | Marca | Palavra DESMENTINDO some < 400 px (só o símbolo). | P3 | v5.css | Avaliar marca compacta. | ABERTO |
| Todas | URL limpa | `/historia/slug` do design × `#/historia/slug`. | P3 | site estático | Gerar páginas estáticas por história. | ABERTO |
