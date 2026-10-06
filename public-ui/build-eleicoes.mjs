#!/usr/bin/env node
/**
 * Eleições 2026 · gera eleicoes-2026/index.html (Brasil) e eleicoes-2026/<uf>/index.html (27 UFs), cada uma com
 * título, descrição, canonical e Open Graph próprios (prévia de link não sai genérica). Resultado vem do TSE no
 * navegador (eleicoes-2026/eleicoes.js); estas páginas não têm número nenhum.
 *
 *   node public-ui/build-eleicoes.mjs          # escreve
 *   node public-ui/build-eleicoes.mjs --check  # CI: falha se o que está versionado difere do gerado
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pages as qPages, cards as qCards } from "./eleicoes-questionamentos.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://desmentindo.com.br";
const UFS = [["ac","Acre"],["al","Alagoas"],["ap","Amapá"],["am","Amazonas"],["ba","Bahia"],["ce","Ceará"],["df","Distrito Federal"],
  ["es","Espírito Santo"],["go","Goiás"],["ma","Maranhão"],["mt","Mato Grosso"],["ms","Mato Grosso do Sul"],["mg","Minas Gerais"],
  ["pa","Pará"],["pb","Paraíba"],["pr","Paraná"],["pe","Pernambuco"],["pi","Piauí"],["rj","Rio de Janeiro"],["rn","Rio Grande do Norte"],
  ["rs","Rio Grande do Sul"],["ro","Rondônia"],["rr","Roraima"],["sc","Santa Catarina"],["sp","São Paulo"],["se","Sergipe"],["to","Tocantins"]];
const A = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "analytics.json"), "utf8"));
// Dados opcionais. calculado = métricas derivadas (ordem de chegada, conferência municipal): exige Human Gate.
// locais = arquivo oficial "Eleitorado por local de votação" por município. Desligados: a interface esconde as partes.
const FLAGS = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_flags.json"), "utf8"));
const CORE = createRequire(import.meta.url)(path.join(ROOT, "eleicoes-2026", "eleicoes-core.js"));
// Cartões de situação no estado inicial (antes da 1ª leitura do TSE), idênticos ao que eleicoes.js desenha em cards():
// a primeira pintura já tem a altura final e a resposta do TSE só troca texto (sem deslocar o resto da página).
const OFICIAL_TAG = '<span class="prov of" title="Número publicado pela Justiça Eleitoral">Dado oficial (TSE)</span>';
const card0 = (k, v, s, cls, prov) => `<div class="card ${cls}"><p class="k">${k}</p><p class="v">${v}</p><p class="s">${s}</p>${prov ? `<p class="p">${prov}</p>` : ""}</div>`;
const STATUS0 = card0("Situação", "—", "Aguardando o TSE", "parcial", OFICIAL_TAG) + card0("Seções totalizadas", "—", "—", "", OFICIAL_TAG) +
  card0("Faltam totalizar", "—", "—", "", OFICIAL_TAG) + card0("Última atualização do TSE", "—", "Horário não informado", "", OFICIAL_TAG) +
  card0("Leitura desta página", "—", "Ainda sem leitura", "", "");
// Navegação do produto Eleições 2026: resultados, território, questionamentos e verificação no mesmo lugar.
// Brasil, na ordem do Human Gate (06/10): estado da eleição → questionamentos → a noite de 4/10 → resultado oficial →
// explorador → metodologia. A linha dos líderes é desenhada pelo eleicoes.js a partir do mesmo arquivo do placar (nada fixo).
const LIDERES0 = '<p class="ld-k">Resultado oficial · TSE</p><p class="ld-v">Aguardando a leitura do TSE.</p>';
const pnav = cur => `<nav class="pnav" aria-label="Eleições 2026"><div class="wrap"><a class="pn-home" href="/eleicoes-2026/">Eleições 2026</a>` +
  [["res", "/eleicoes-2026/#resultado", "Resultados"], ["exp", "/eleicoes-2026/#onde", "Explorar"], ["q", "/eleicoes-2026/questionamentos/", "Questionamentos"], ["ver", "/eleicoes-2026/#verificacao", "Verificação"]]
    .map(([k, h, t]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ""}>${t}</a>`).join("") + `</div></nav>`;
const QDATA = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_questionamentos.json"), "utf8"));
const QHOME = ["Q1", "Q2", "Q3", "Q6", "Q7"].map(id => QDATA.questionamentos.find(q => q.id === id));
const Q_BR = `<section class="area-q" aria-labelledby="t-q"><h2 id="t-q">Questionamentos sobre a eleição</h2><p class="sub">Você viu isso circulando? Fomos aos dados para descobrir o que realmente aconteceu.</p>${qCards(QHOME)}<p class="more"><a href="/eleicoes-2026/questionamentos/">Ver todos os questionamentos →</a></p></section>`;
const NOITE_BR = `<section class="area-time" aria-labelledby="t-evo"><h2 id="t-evo">A noite de 4 de outubro</h2><p class="sub">Do início da apuração (17h) ao final: o que o TSE mostrava em cada registro. Escolha um instante para ver o resultado daquela hora. <a href="/eleicoes-2026/questionamentos/04-de-outubro/">A noite, passo a passo →</a></p><div id="evolucao"><p class="empty">Disponível depois das 17h.</p></div></section>`;
const ESTADOS_HTML = Object.values(CORE.ESTADOS).map(e => `<div class="e-${e.classe}"><dt>${e.nome}</dt><dd>${e.texto}</dd></div>`).join("");
// CSS/JS locais com ?v=<sha256 do arquivo, 12 hex> — a mesma convenção ?v= da raiz (build-root.mjs). Aqui a versão vem do
// conteúdo, não do commit, porque estas páginas são versionadas no repositório: o HTML só aponta para o asset com que foi
// gerado, e o navegador nunca junta HTML novo com CSS/JS antigo em cache (P0 06/10/2026). Mudou o asset sem regenerar as
// páginas → `--check` falha no CI. Ninguém incrementa versão à mão.
const ASSET_V = {};
const asset = p => "/" + p + "?v=" + (ASSET_V[p] ??= crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex").slice(0, 12));
const attr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const umami = A.provider === "umami" && /^[0-9a-f-]{36}$/.test(A.website_id || "")
  ? `<script defer src="${A.script_src}" data-website-id="${A.website_id}"${A.respect_do_not_track ? ' data-do-not-track="true"' : ""}></script>` : "";

function page(uf, name) {
  const br = !uf, zz = uf === "zz", where = br ? "Brasil" : name;
  const url = `${SITE}/eleicoes-2026/${br ? "" : uf + "/"}`;
  const title = `Eleições 2026 · Presidente · 1º turno — ${where} | Desmentindo`;
  const desc = br
    ? "Resultado oficial do TSE para presidente no Brasil, atualizado direto da fonte, com a evolução da apuração hora a hora e o caminho até cada seção e boletim de urna."
    : zz ? "Resultado oficial do TSE para presidente no exterior, atualizado direto da fonte, com cidade, zona, seção e boletim de urna."
    : `Resultado oficial do TSE para presidente em ${name}, atualizado direto da fonte, com município, zona, seção e boletim de urna.`;
  const nav = UFS.concat([["zz", "Exterior"]]).map(([c, n]) => `<li><a href="/eleicoes-2026/${c}/" title="${attr(n)}"${c === uf ? ' aria-current="page"' : ""}>${c === "zz" ? "Exterior" : c.toUpperCase()}</a></li>`).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${attr(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="Desmentindo"><meta property="og:locale" content="pt_BR"><meta property="og:type" content="website">
<meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/img/og/eleicoes-2026.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Eleições 2026 · resultado oficial do TSE · Desmentindo">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(title)}"><meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${SITE}/img/og/eleicoes-2026.png">
<meta name="theme-color" content="#1D1B1A">
<link rel="icon" href="data:,">
<link rel="preload" href="/v5/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset("v5/css/fonts.css")}">
<link rel="stylesheet" href="${asset("eleicoes-2026/eleicoes.css")}">
<script>/* reserva espaço do recorte aberto por link antes do 1º desenho (menos deslocamento de layout) */(function(h,d){d.className+=/(^|[#&])s=/.test(h)?" deep-s":/(^|[#&])z=/.test(h)?" deep-z":/(^|[#&])m=/.test(h)?" deep-m":""})(location.hash,document.documentElement)</script>
${umami}
</head>
<body data-scope="${br ? "br" : uf}" data-mode="resultados" data-calc="${FLAGS.calculado ? "on" : "off"}" data-locais="${FLAGS.locais ? "on" : "off"}">
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="top"><div class="wrap topbar"><a class="brand" href="/" aria-label="Desmentindo — início"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><b>DESMENTINDO</b></a>
<nav class="crumbs" id="crumbs" aria-label="Você está em"><a href="/eleicoes-2026/">Brasil</a>${br ? "" : `<span aria-hidden="true">›</span><b>${attr(where)}</b>`}</nav>
<div class="modes" role="group" aria-label="Modo de leitura"><button type="button" id="mRes" aria-pressed="true">Resultados</button><button type="button" id="mAud" aria-pressed="false">Verificação</button></div></div></header>
${pnav(br ? "res" : "exp")}
<main class="wrap" id="conteudo">
<div class="head">
<p class="kick"><span class="tag res">Dado oficial · TSE</span>Eleições 2026 · Presidente · 1º turno · 4 out</p>
<h1>${attr(where)}</h1>
${br ? `<nav class="paths" aria-label="O que dá para fazer aqui"><a href="#resultado"><b>Explore os resultados</b><span>Placar oficial do TSE e o caminho até cada seção</span></a><a href="/eleicoes-2026/questionamentos/"><b>Investigue os questionamentos</b><span>${QDATA.questionamentos.length} dúvidas que circularam, testadas nos dados oficiais</span></a><a href="#verificacao"><b>Verificação</b><span>De onde vem cada número</span></a></nav>` : ""}
</div>
${br ? `<section class="estado-el" id="estado" aria-labelledby="t-estado"><h2 id="t-estado">Estado da eleição</h2><div id="lideres" class="lideres" aria-live="polite">${LIDERES0}</div>` : ""}<section id="status" class="cards" aria-label="Situação da apuração">${STATUS0}</section>${br ? "</section>\n" + Q_BR + "\n" + NOITE_BR : ""}
<div class="layout">
<section class="area-res" aria-labelledby="t-agora" id="resultado"><h2 id="t-agora">${br ? "Resultado oficial" : "Resultado"}</h2><p class="stale" id="stale" hidden></p><p class="snapnote" id="snapnote" hidden></p><div id="placar"><p class="empty">Carregando…</p></div></section>
<section class="area-terr" aria-labelledby="t-terr" id="onde"><h2 id="t-terr">Explorar o território</h2>
<div class="busca"><label for="busca">Buscar município</label><input id="busca" type="search" autocomplete="off" placeholder="${br ? "ex.: Campinas" : "nome do município"}" aria-describedby="buscaDica"><p id="buscaDica" class="sub">Depois: zona, local de votação e seção.</p><ul id="buscaRes" class="buscares" aria-live="polite"></ul></div>
${br ? `<div class="maphead"><label for="layers">Mostrar no mapa</label><select id="layers"><option value="lider">Quem está à frente</option><option value="tot">Quanto falta totalizar</option><option value="late">Ordem de chegada das seções</option></select></div>
<div id="mapa" class="mapa"><p class="empty">Disponível depois das 17h.</p></div><div id="mapaLista"></div>
<ul class="ufs">${UFS.concat([["zz", "Exterior"]]).map(([c, n]) => `<li><a href="/eleicoes-2026/${c}/" title="${attr(n)}">${c === "zz" ? "Exterior" : c.toUpperCase()}</a></li>`).join("")}</ul>` :
`<div id="explorar"><p class="empty">Disponível depois das 17h.</p></div>
<details class="outros"><summary>${zz ? "Estados" : "Outros estados e exterior"}</summary><ul class="ufs">${nav}</ul></details>`}
</section>
<aside class="area-ctx" aria-labelledby="t-falta"><div id="secPanel" class="sheet" hidden role="region" aria-labelledby="sheetTitle"></div>
<h2 id="t-falta">Quem ainda falta?</h2><div id="falta"><p class="empty">Disponível depois das 17h.</p></div>
${br ? `<h2 class="h2s" id="t-ext">Exterior</h2><div id="exterior"><p class="empty">Disponível depois das 17h.</p></div>` : ""}
</aside>
</div>
<section class="area-aud" aria-labelledby="t-aud" id="verificacao"><h2 id="t-aud">${br ? "Metodologia e verificação" : "Verificação"}</h2>
<p class="sub">O que cada número é, de onde vem e o que ainda falta. Use o modo Verificação (no topo) para ver os detalhes técnicos abertos. <a href="/eleicoes-2026/questionamentos/">Questionamentos sobre a eleição →</a></p>
<div class="audgrid"><div><h3>Origem dos números</h3><ul class="rules"><li><span class="prov of">Dado oficial (TSE)</span> número publicado pela Justiça Eleitoral, lido direto dos arquivos públicos do TSE.</li>
<li><span class="prov calc">Métrica calculada pelo Eleições 2026</span> conta feita por esta página a partir de arquivos oficiais (ex.: % de uma seção a partir do boletim). Não é número do TSE.</li></ul></div>
<div><h3>Estado de cada seção</h3><dl class="estados">${ESTADOS_HTML}</dl></div></div>
<div id="calcbox" class="calcbox"></div></section>
<section aria-labelledby="t-regras"><h2 id="t-regras">Como ler esta página</h2><ul class="rules">
<li>Resultado oficial é o que o TSE publica. Pesquisa eleitoral é outra coisa e não aparece aqui.</li>
<li>Até a totalização final, todo número é parcial e vem com o % de seções totalizadas.</li>
<li>Dado que o TSE não informou aparece como “—”, nunca como zero. Entre dois registros da linha do tempo não desenhamos nada.</li>
<li>Arquivo que ainda não está disponível não é indício de problema na votação, e não inferimos o motivo.</li>
<li>Não fazemos previsão de vencedor nem projeção.</li></ul></section>
</main>
<footer><div class="wrap">Fonte: Tribunal Superior Eleitoral (resultados.tse.jus.br). <a href="/#/privacidade">Privacidade</a> · <a href="/">Desmentindo</a></div></footer>
<script src="${asset("eleicoes-2026/eleicoes-core.js")}" defer></script>
<script src="${asset("eleicoes-2026/eleicoes.js")}" defer></script>
</body>
</html>
`;
}

function qShell(o) {
  const url = SITE + o.path;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${attr(o.title)}</title>
<meta name="description" content="${attr(o.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="Desmentindo"><meta property="og:locale" content="pt_BR"><meta property="og:type" content="article">
<meta property="og:title" content="${attr(o.title)}"><meta property="og:description" content="${attr(o.desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/img/og/eleicoes-2026.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(o.title)}"><meta name="twitter:description" content="${attr(o.desc)}">
<meta name="theme-color" content="#1D1B1A">
<link rel="icon" href="data:,">
<link rel="preload" href="/v5/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset("v5/css/fonts.css")}">
<link rel="stylesheet" href="${asset("eleicoes-2026/eleicoes.css")}">
${umami}
</head>
<body class="qpage">
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="top"><div class="wrap topbar"><a class="brand" href="/" aria-label="Desmentindo — início"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><b>DESMENTINDO</b></a>
<nav class="crumbs" aria-label="Você está em"><a href="/eleicoes-2026/">Eleições 2026</a><span aria-hidden="true">›</span><a href="/eleicoes-2026/questionamentos/">Questionamentos</a></nav></div></header>
${pnav("q")}
<main class="wrap qwrap" id="conteudo">
${o.main}
</main>
<footer><div class="wrap">Fontes primárias: Tribunal Superior Eleitoral (resultados.tse.jus.br; Portal de Dados Abertos). Análise: Eleições 2026 · Desmentindo. <a href="/#/privacidade">Privacidade</a> · <a href="/eleicoes-2026/">Eleições 2026</a></div></footer>
${o.q && o.q.contador ? '<script src="' + asset("eleicoes-2026/questionamentos.js") + '" defer></script>' : ""}
</body>
</html>
`;
}

const files = { "eleicoes-2026/index.html": page(null, null) };
Object.assign(files, qPages(QDATA, qShell));
for (const [c, n] of UFS) files[`eleicoes-2026/${c}/index.html`] = page(c, n);
files["eleicoes-2026/zz/index.html"] = page("zz", "Exterior");
const check = process.argv.includes("--check");
let bad = 0;
for (const [rel, html] of Object.entries(files)) {
  const p = path.join(ROOT, rel);
  if (check) {
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== html) { console.error("DESATUALIZADO: " + rel); bad++; }
  } else {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, html);
  }
}
if (bad) { console.error("rode: node public-ui/build-eleicoes.mjs"); process.exit(1); }
console.log(`ELEICOES_PAGES_${check ? "OK" : "WRITTEN"} (${Object.keys(files).length})`);
