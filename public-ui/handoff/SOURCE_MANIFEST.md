# Pacote de Design — manifesto da fonte (imutável)

Recebido de Johnny em 2026-10-02 (`Desmentindo.zip`, 28.848.610 bytes, sha256 `f5352c7c197781879121985af5e2db9bb0316de1ccd4fadbd517bb79d58d8b6a`).
O ZIP não é versionado aqui (tamanho e arquivos do app antigo); este manifesto permite conferir qualquer cópia byte a byte.

Contagem: CANONICAL 18 · STRUCTURAL 4 · SUPPORTING 16 · LEGACY 13 · SUPERSEDED 7 · UNKNOWN 10

| Classe | Arquivo | Bytes | sha256 (16) | Papel |
|---|---|---:|---|---|
| CANONICAL | `DM Cabecalho.dc.html` | 3829 | `e31b1cafbec7b3ee` | 5 · cabeçalho |
| CANONICAL | `DM Cards.dc.html` | 10046 | `4492197f9ac8d67d` | 5 · cards sociais |
| CANONICAL | `DM Familia A.dc.html` | 12977 | `ca902698af710800` | 5 · família A |
| CANONICAL | `DM Familia B.dc.html` | 23451 | `70911273217cf908` | 5 · família B (estados da história) |
| CANONICAL | `DM Familia CD.dc.html` | 23586 | `e43a56159185489c` | 5 · famílias C/D (Checar, Arquivos) |
| CANONICAL | `DM Familia EFH.dc.html` | 16732 | `bda81c0555f9685b` | 5 · famílias E/F/H |
| CANONICAL | `DM Historia v4.dc.html` | 21225 | `d687449fae1bb759` | 1 · verdade visual (História) |
| CANONICAL | `DM Home v4.dc.html` | 18692 | `300c1e1fd7115d95` | 1 · verdade visual (Home) |
| CANONICAL | `DM Plataforma v4.dc.html` | 21169 | `7e111deda9879ddf` | 6 · adaptadores com dados reais |
| CANONICAL | `DM Rodape.dc.html` | 3269 | `8bae45c9d0f89bea` | 5 · rodapé |
| CANONICAL | `DM Tela 25.dc.html` | 15014 | `847b9244e6a179dc` | 5 · Desmentindo Data |
| CANONICAL | `Desmentindo 26 Telas.dc.html` | 24668 | `d3a5a85577fbbf98` | 5 · 26 telas (nível v3; lacuna L1) |
| CANONICAL | `Desmentindo Expansao Etapa 1.1.dc.html` | 35537 | `0da01db27260150f` | 3 · estados, componentes 22–23, pessoa, capacidades |
| CANONICAL | `Desmentindo Expansao Etapa 1.dc.html` | 38294 | `644548b8c04bf674` | 4 · famílias, navegação, inventário, tokens |
| CANONICAL | `Desmentindo Linguagem Publica v1.dc.html` | 50259 | `c9c891f743b71f60` | 7 · linguagem pública |
| CANONICAL | `Desmentindo Plataforma v4.dc.html` | 3149 | `459726b9d94d69f0` | 6 · vitrine do DM Plataforma v4 (casos longo/médio/curto) |
| CANONICAL | `Desmentindo Visual v4.dc.html` | 6163 | `e2357eb2d46abd78` | 1 · verdade visual |
| CANONICAL | `handoff/COWORK_IMPLEMENTATION_PROMPT_v1.md` | 32470 | `94d17a06fbb4ac24` | prompt de implementação (lido primeiro) |
| STRUCTURAL | `DM Historia v3.dc.html` | 27605 | `c9dd62f49ec07a40` | 2 · estrutura (História) |
| STRUCTURAL | `DM Home v3.dc.html` | 27558 | `323b72552849ccb7` | 2 · estrutura (Home) |
| STRUCTURAL | `DM Profissionais v3.dc.html` | 14606 | `2eea165ed81b92d5` | 2 · estrutura (Profissionais) |
| STRUCTURAL | `Desmentindo Master Screens v3.dc.html` | 13122 | `3da4d4035554f929` | 2 · estrutura |
| SUPPORTING | `CLAUDE.md` | 978 | `d415be4c00bca6a7` | premissas do projeto de design (arquivo de trabalho antigo superado) |
| SUPPORTING | `Desmentindo Consolidacao v2.dc.html` | 68929 | `db46a3e74bfe632f` | seção v1.1 = CANONICAL (7); resto suporte (sitemap, institucional) |
| SUPPORTING | `Desmentindo Sistema Visual v1.dc.html` | 91088 | `ff529a61c256a5d0` | edições do dia e peças sociais (selos antigos superados pela Etapa 1.1) |
| SUPPORTING | `_ds/modernist-b46b742e-e952-439c-acdf-edd5a478468a/_adherence.oxlintrc.json` | 4002 | `a152602ffec4485a` | design system Modernist (base; vermelho #EC3013 não usado) |
| SUPPORTING | `_ds/modernist-b46b742e-e952-439c-acdf-edd5a478468a/_ds_bundle.js` | 303 | `6138a8418649050c` | design system Modernist (base; vermelho #EC3013 não usado) |
| SUPPORTING | `_ds/modernist-b46b742e-e952-439c-acdf-edd5a478468a/_ds_manifest.json` | 7247 | `5a5662c539da3adb` | design system Modernist (base; vermelho #EC3013 não usado) |
| SUPPORTING | `_ds/modernist-b46b742e-e952-439c-acdf-edd5a478468a/readme.md` | 7376 | `4b7a850adf3d5b14` | design system Modernist (base; vermelho #EC3013 não usado) |
| SUPPORTING | `_ds/modernist-b46b742e-e952-439c-acdf-edd5a478468a/styles.css` | 10555 | `cf9fcf75ac84dfe7` | design system Modernist (base; vermelho #EC3013 não usado) |
| SUPPORTING | `candidato/dados.json` | 2681434 | `8baed79447242f48` | extrato dos dados `D` usado pelos mockups |
| SUPPORTING | `handoff/DESIGN_BACKLOG.md` | 3011 | `60320ec120d326dd` | backlog canônico de apresentação → public-ui/handoff/DESIGN_BACKLOG.md |
| SUPPORTING | `handoff/PROMPT-claude-code.md` | 122141 | `079edbac27c72f2e` | registro histórico → public-ui/handoff/PROMPT-claude-code.md |
| SUPPORTING | `handoff/PROMPT_ChatGPT_revisao.md` | 4686 | `b6f5259b66527396` | pedido de revisão externa |
| SUPPORTING | `handoff/ROTINA-hub-noticias.md` | 3472 | `f6b99c641880ced2` | rotina do hub (operação, não UI) |
| SUPPORTING | `hub/edicao-2026-09-25.json` | 5206 | `91083ca6e2e1ce69` | edição de exemplo do hub |
| SUPPORTING | `image-slot.js` | 65350 | `fff26d081c8d9d60` | runtime dos .dc.html |
| SUPPORTING | `support.js` | 69150 | `8fe7df74405f3c55` | runtime dos .dc.html (precisa de React via CDN) |
| LEGACY | `Desmentindo Brasil.html` | 11250717 | `f4df078ff54f8cc0` | plataforma antiga (UI superada; referência de dados e inventário funcional) |
| LEGACY | `Desmentindo.html` | 5750026 | `3f22335c256debb6` | cópia do app antigo |
| LEGACY | `handoff/PROMPT-v8-secoes-10-12.md` | 32713 | `058befd3a9f61ff2` | patch do app antigo |
| LEGACY | `handoff/drawers2.js` | 8890 | `2f67072809f15845` | patch do app antigo |
| LEGACY | `handoff/evDrawer.js` | 6744 | `c6959ddf34f188a7` | patch do app antigo |
| LEGACY | `handoff/nav.css` | 3327 | `8c7c5be7724467f6` | patch do app antigo |
| LEGACY | `handoff/nav.js` | 1668 | `da418470c73b76d0` | patch do app antigo |
| LEGACY | `handoff/veiculos.js` | 2577 | `33d9d73755a68129` | patch do app antigo |
| LEGACY | `uploads/desmentindo_local.html` | 5743709 | `7b4a1364627640ad` | versão antiga do app |
| LEGACY | `uploads/desmentindo_local_4.html` | 11223133 | `fb8fc515f34bb86d` | versão antiga do app |
| LEGACY | `uploads/desmentindo_local_8.html` | 11229001 | `55d2b5dbb4e3e22b` | versão antiga do app |
| LEGACY | `versoes/Desmentindo Brasil -antes da v8-.html` | 11240368 | `ca1dab6a1e069f13` | versão antiga do app |
| LEGACY | `versoes/Desmentindo Brasil -antes do sync-.html` | 5818916 | `7a40ff1f6cb83196` | versão antiga do app |
| SUPERSEDED | `DM Historia.dc.html` | 24946 | `d86e6fcaa20522eb` | sem sufixo |
| SUPERSEDED | `DM Home.dc.html` | 23757 | `23b95ff54422678e` | sem sufixo |
| SUPERSEDED | `DM Profissionais.dc.html` | 13651 | `3213272d8f02e24c` | sem sufixo |
| SUPERSEDED | `Desmentindo Home Checar v2 - candidato.dc.html` | 78890 | `a0e387a12bcb03b9` | candidato |
| SUPERSEDED | `Desmentindo Home e Checar (candidato).dc.html` | 77993 | `6f239e3f8312d052` | candidato |
| SUPERSEDED | `Desmentindo Master Screens.dc.html` | 3785 | `71a193ef598b0b43` | v1 |
| SUPERSEDED | `candidato/home-v2.tpl` | 10478 | `908368a86ffdaabb` | molde do candidato |
| UNKNOWN | `.thumbnail` | 33148 | `19919f8315f688ba` | miniatura do projeto |
| UNKNOWN | `uploads/pasted-1790350986404-0.png` | 2662704 | `329032b01d5e8d51` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790354075401-0.png` | 734774 | `8d4774f2d3e8d0f1` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790359558585-0.png` | 785721 | `89ab36424249f762` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790645735967-0.png` | 231791 | `cc6d26d0315b4ffa` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790645917523-0.png` | 282023 | `c578598486f35ab3` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790647539966-0.png` | 103862 | `ecfd33cb0590b178` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790647772332-0.png` | 58586 | `375785756a49166b` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790647934126-0.png` | 221594 | `677167b3a3e3db16` | captura sem contexto (não usada) |
| UNKNOWN | `uploads/pasted-1790649284878-0.png` | 220260 | `0e1422e382a986d5` | captura sem contexto (não usada) |
