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
import { aplicarEstudos } from "./eleicoes-estudos.mjs";
import { validate as pesqValidate, section as pesqSection } from "./eleicoes-pesquisas.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://desmentindo.com.br";
const UFS = [["ac","Acre"],["al","Alagoas"],["ap","Amapá"],["am","Amazonas"],["ba","Bahia"],["ce","Ceará"],["df","Distrito Federal"],
  ["es","Espírito Santo"],["go","Goiás"],["ma","Maranhão"],["mt","Mato Grosso"],["ms","Mato Grosso do Sul"],["mg","Minas Gerais"],
  ["pa","Pará"],["pb","Paraíba"],["pr","Paraná"],["pe","Pernambuco"],["pi","Piauí"],["rj","Rio de Janeiro"],["rn","Rio Grande do Norte"],
  ["rs","Rio Grande do Sul"],["ro","Rondônia"],["rr","Roraima"],["sc","Santa Catarina"],["sp","São Paulo"],["se","Sergipe"],["to","Tocantins"]];
// Turnos (códigos conferidos no config oficial ele-c.json do TSE, gerado em 18/10/2026 12:38:11). O 1º turno sai exatamente
// como antes (sem atributos novos no <body>); o 2º turno usa o mesmo HTML/JS com outra eleição, pleito, horário e raiz.
const SNAP_BASE = "https://raw.githubusercontent.com/histudyoficial-crypto/desmentindo/eleicoes-2026-dados/";
const T1 = { n: 1, root: "/eleicoes-2026/", rotulo: "1º turno", dia: "4 out", og: "eleicoes-2026.png" };
const T2 = { n: 2, root: "/eleicoes-2026/2-turno/", rotulo: "2º turno", dia: "25 out", og: "eleicoes-2026-2t.png", ele: "6258", pleito: "3221",
  release: "2026-10-25T20:00:00Z", snap: SNAP_BASE + "presidente-br-2t.json" };
const HIST = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_historico.json"), "utf8"));
// Pesquisas do 2º turno: só com Human Gate; erro de contrato derruba o build (nada sai pela metade).
const PESQ = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_pesquisas_2t.json"), "utf8"));
const PESQ_ERR = pesqValidate(PESQ);
if (PESQ_ERR.length) { console.error("PESQUISAS_2T_INVALIDAS:\n" + PESQ_ERR.join("\n")); process.exit(1); }
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
const pnav = (cur, T = T1) => `<nav class="pnav" aria-label="Eleições 2026"><div class="wrap"><a class="pn-home" href="${T.root}">Eleições 2026${T.n === 2 ? " · 2º turno" : ""}</a>` +
  [["res", T.root + "#resultado", "Resultados"], ["exp", T.root + "#onde", "Explorar"], ...(T.n === 2 ? [["pesq", T.root + "#pesquisas", "Pesquisas"]] : []), ["q", "/eleicoes-2026/questionamentos/", "Questionamentos"], ["ver", T.root + "#verificacao", "Verificação"]]
    .map(([k, h, t]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ""}>${t}</a>`).join("") + `</div></nav>`;
const QDATA = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_questionamentos.json"), "utf8"));
const QHOME = ["Q1", "Q2", "Q3", "Q6", "Q7"].map(id => QDATA.questionamentos.find(q => q.id === id));
const Q_BR = `<section class="area-q" aria-labelledby="t-q"><h2 id="t-q">Questionamentos sobre a eleição</h2><p class="sub">Você viu isso circulando? Fomos aos dados para descobrir o que realmente aconteceu.</p>${qCards(QHOME)}<p class="more"><a href="/eleicoes-2026/questionamentos/">Ver todos os questionamentos →</a></p></section>`;
const NOITE_BR = `<section class="area-time" aria-labelledby="t-evo"><h2 id="t-evo">A noite de 4 de outubro</h2><p class="sub">Do início da apuração (17h) ao final: o que o TSE mostrava em cada registro. Escolha um instante para ver o resultado daquela hora. <a href="/eleicoes-2026/questionamentos/04-de-outubro/">A noite, passo a passo →</a></p><div id="evolucao"><p class="empty">Disponível depois das 17h.</p></div></section>`;
const NOITE_2T = `<section class="area-time" aria-labelledby="t-evo"><h2 id="t-evo">A noite de 25 de outubro</h2><p class="sub">Do início da apuração (17h) ao final: o que o TSE mostrava em cada registro. Escolha um instante para ver o resultado daquela hora.</p><div id="evolucao"><p class="empty">Disponível depois das 17h de 25/10.</p></div></section>`;
const DIF_2T = `<section class="area-dif" aria-labelledby="t-dif"><h2 id="t-dif">Evolução da diferença</h2><p class="sub">Quantos votos separavam os dois candidatos em cada registro oficial da apuração. Diferença parcial não é resultado e não prevê a final.</p><div id="diferenca"><p class="empty">Disponível depois das 17h de 25/10.</p></div></section>`;
const fI = n => n.toLocaleString("pt-BR"), fP = n => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
// Comparação histórica: 2022 vem do arquivo conferido (public-ui/eleicoes_historico.json); 1º turno de 2026 e este turno são
// preenchidos no navegador a partir dos registros oficiais (FINAL do 1º turno; leitura atual do 2º). Nada fixo de 2026 aqui.
const HIST_2T = () => `<section class="area-hist" aria-labelledby="t-hist" id="historico"><h2 id="t-hist">Comparação histórica</h2><p class="sub">Números oficiais lado a lado. Turnos diferentes têm bases diferentes: no 1º turno os votos válidos se dividem entre todos os candidatos; no 2º, entre dois.</p>
<div class="qtable htab" tabindex="0" role="region" aria-label="Comparação histórica (role para os lados)"><table><thead><tr><th scope="col">Eleição</th><th scope="col">Candidato</th><th scope="col">Votos</th><th scope="col">% dos válidos</th></tr></thead>
<tbody id="histAgora"><tr><th scope="row">2º turno de 2026</th><td colspan="3">Aguardando apuração</td></tr></tbody>
<tbody id="hist1t"><tr><th scope="row">1º turno de 2026</th><td colspan="3">Aguardando a leitura do arquivo final do TSE</td></tr></tbody>
${HIST.eleicoes.map(e => `<tbody>${e.candidatos.map((c, i) => `<tr>${i ? "" : `<th scope="row" rowspan="${e.candidatos.length}">${attr(e.rotulo)}<small>${attr(e.situacao)}</small></th>`}<td>${attr(c.nome)}</td><td>${fI(c.votos)}</td><td>${fP(c.pct_validos)}</td></tr>`).join("")}</tbody>`).join("")}
</table></div>
<p class="note">${OFICIAL_TAG} ${HIST.eleicoes.map(e => `${attr(e.rotulo)}: <a href="${attr(e.fonte_url)}" rel="noopener">${attr(e.fonte)}</a>.`).join(" ")} 1º turno de 2026: arquivo oficial de totalização do TSE (eleição 6257), mostrado só com a totalização final marcada pelo próprio TSE. A comparação não mostra transferência de votos nem quem votou em quem.</p></section>`;
// Participação: 6 indicadores com o denominador escrito (eleitorado apurado / comparecimento — campos esi, c, pc do TSE), preenchidos pelo eleicoes.js com os
// números do TSE. Estado inicial com a altura final (sem deslocar a página quando o dado chega).
const PART0 = `<section class="area-part" aria-labelledby="t-part"><h3 id="t-part" class="h3s">Participação e votos</h3><div id="participacao" aria-live="polite"><dl class="inds">${
  [["Eleitores aptos", ""], ["Comparecimento", "do eleitorado apurado"], ["Abstenção", "do eleitorado apurado"], ["Votos válidos", "do comparecimento"], ["Brancos", "do comparecimento"], ["Nulos", "do comparecimento"]]
    .map(([k, d]) => `<div class="ind"><dt>${k}</dt><dd><b>—</b>${d ? `<small>— ${d}</small>` : ""}</dd></div>`).join("")}</dl></div></section>`;
// Mapa por município (malha IBGE 2025 + arquivos municipais oficiais do TSE reunidos por build-eleicoes-mun.mjs). Um só
// componente (eleicoes-mun.js) para os dois turnos e para a comparação; aqui só os parâmetros mudam. Sem arquivo de dados
// do turno → a seção explica por quê e não desenha nada.
const MAPA_DIR = path.join(ROOT, "eleicoes-2026", "mapa");
const munDados = ele => fs.existsSync(path.join(MAPA_DIR, `presidente-${ele}.json`)) ? `eleicoes-2026/mapa/presidente-${ele}.json` : null;
function munAttrs(ele, raiz, extra = "") {
  const d = munDados(ele);
  return `data-geo="${asset("eleicoes-2026/mapa/municipios-2025.svg")}" data-raiz="${raiz}"` +
    (d ? ` data-dados="${asset(d)}" data-uf-tpl="/eleicoes-2026/mapa/presidente-${ele}-{uf}.json?${asset(d).split("?")[1]}"` :
      ` data-sem-dados="${ele === "6258" ? "O mapa por município do 2º turno aparece quando os arquivos municipais oficiais do TSE forem reunidos, depois da totalização. Até lá, use o mapa de estados acima." : "Arquivos municipais do TSE ainda não reunidos."}"`) + extra;
}
function munSection(ele, raiz, rotulo) {
  const id = "mm" + ele;
  return `<section class="area-mun mm" id="municipios" aria-labelledby="t-${id}" data-auto="on" data-hash="on" ${munAttrs(ele, raiz)}>
<div class="mm-head"><p class="kick">Mapa · ${rotulo} · Presidente</p><h2 id="t-${id}">Resultados por município</h2>
<p class="sub">Os ${(5571).toLocaleString("pt-BR")} municípios na malha oficial do IBGE, com o resultado do arquivo municipal do TSE. Passe o mouse ou toque num município para ver os números e seguir até zonas e seções.</p></div>
<div class="mm-ctrl"><div class="mm-camadas" role="group" aria-label="Mostrar no mapa"></div>
<div class="mm-f"><label class="mm-ufl"><span>Estado</span><select class="mm-uf"></select></label><div class="mm-busca"><label for="${id}-busca">Buscar município</label><input id="${id}-busca" type="search" autocomplete="off" placeholder="ex.: Fernando de Noronha"><ul aria-live="polite"></ul></div></div></div>
<div class="mm-grid"><div class="mm-stage"><div class="mm-mapwrap"><div class="mm-mapa"><p class="empty">Carregando o mapa…</p></div>${ZOOM}<div class="mm-tip" hidden></div></div>
<div class="mm-leg"></div></div>
<div class="mm-side" role="region" aria-label="Município escolhido"><button type="button" class="mm-fechar" aria-label="Fechar o painel do município"><span aria-hidden="true">×</span></button><div class="mm-det" aria-live="polite"><p class="sub mm-vazio-t">Escolha um município no mapa, na busca ou na tabela.</p></div></div></div>
<div class="mm-fundo" hidden></div>
<details class="mm-tab"><summary>Ver os municípios de um estado em tabela</summary><div class="mm-tab-body"><p class="sub">Escolha um estado acima para ver os municípios dele em tabela.</p></div></details>
<noscript><p class="empty">O mapa por município precisa de JavaScript. Os resultados por estado e município continuam nas páginas de cada estado.</p></noscript>
</section>`;
}
// zoom do mapa: aproximar, afastar, Brasil inteiro (o arrasto com o mapa ampliado é só complemento)
const ZOOM = `<div class="mm-zoom" role="group" aria-label="Zoom do mapa"><button type="button" data-z="+"><span aria-hidden="true">+</span><span class="vh">Aproximar</span></button><button type="button" data-z="-"><span aria-hidden="true">−</span><span class="vh">Afastar</span></button><button type="button" data-z="0"><span aria-hidden="true">BR</span><span class="vh">Ver o Brasil inteiro</span></button></div>`;
// Navegação da página Brasil (E26-04): turno, "Nesta página", comparação lado a lado e os dois índices (apuração e
// conferências). Só links e componentes existentes; nenhum número novo de estudo aparece aqui sem gate.
const TURNOS = t2 => `<nav class="turnos" aria-label="Turno"><a href="/eleicoes-2026/"${t2 ? "" : ' aria-current="page"'}><b>1º turno</b> · 4 out</a><a href="/eleicoes-2026/2-turno/"${t2 ? ' aria-current="page"' : ""}><b>2º turno</b> · 25 out</a></nav>`;
const SECNAV = `<nav class="secnav" aria-label="Nesta página"><a href="#resultado">Resultado oficial</a><a href="#municipios">Por município</a><a href="#comparar">Compare os turnos</a><a href="#apuracao">Entenda a apuração</a><a href="#conferencias">Conferências</a><a href="#onde">Buscar UF, município, zona ou seção</a></nav>`;
const qLink = (id, extra) => { const q = QDATA.questionamentos.find(x => x.id === id); return q ? `<li><a href="/eleicoes-2026/questionamentos/${q.slug}/"><b>${attr(q.card)}</b><span>${attr(extra || "")}${extra ? " · " : ""}${attr(q.classificacao.toLowerCase())}</span></a></li>` : ""; };
const HUBS = () => `<div class="hubs"><section class="hub" id="apuracao" aria-labelledby="t-apur"><h2 id="t-apur">Entenda a apuração</h2><p class="sub">Como os números chegam ao longo da noite e por que a curva tem a forma que tem.</p><ul class="hublist">
<li><a href="/eleicoes-2026/questionamentos/04-de-outubro/"><b>A noite de 4 de outubro, passo a passo</b><span>registros oficiais do TSE, das 17h ao final</span></a></li>${qLink("Q4", "ordem de chegada das seções")}${qLink("Q3", "regularidade da curva")}${qLink("Q1", "a parada de uma hora")}</ul></section>
<section class="hub" id="conferencias" aria-labelledby="t-conf"><h2 id="t-conf">Conferências do Desmentindo</h2><p class="sub">O que conferimos nos arquivos oficiais, com método e limites escritos.</p><ul class="hublist">
${qLink("Q6", "boletins de urna × resultado oficial")}${qLink("Q8", "seções agregadas")}${qLink("Q7", "arquivos ainda não publicados")}<li><a href="/eleicoes-2026/questionamentos/"><b>Todos os questionamentos</b><span>${QDATA.questionamentos.length} dúvidas testadas nos dados oficiais</span></a></li></ul></section></div>`;
function cmpSection(raiz) {
  const one = (ele, cls, tit) => `<div class="mm ${cls}" data-auto="off" data-hash="off" ${munAttrs(ele, raiz, munDados(ele) ? "" : ' data-espera="geo"')}><h3 class="cmp-h">${tit}</h3><div class="mm-mapwrap"><div class="mm-mapa"><p class="empty">Carregando…</p></div>${ZOOM}<div class="mm-tip" hidden></div></div><div class="mm-leg"></div></div>`;
  return `<section class="area-cmp" id="comparar" aria-labelledby="t-cmp" data-ver="a"><div class="mm-head"><p class="kick">Mapa · 1º e 2º turno · Presidente</p><h2 id="t-cmp">Compare os turnos</h2>
<p class="sub">Os mesmos municípios nos dois turnos, lado a lado. Escolher um município num mapa (ou na busca) seleciona o mesmo no outro; zoom e destaque andam juntos.</p></div>
<div class="mm-ctrl"><div class="mm-camadas cmp-camadas" role="group" aria-label="Mostrar nos dois mapas"></div>
<div class="mm-f"><label class="mm-ufl"><span>Estado</span><select class="mm-uf cmp-uf"></select></label><div class="mm-busca cmp-busca"><label for="cmp-busca">Buscar município</label><input id="cmp-busca" type="search" autocomplete="off" placeholder="ex.: Campinas"><ul aria-live="polite"></ul></div></div></div>
<div class="cmp-alterna" role="group" aria-label="Turno no mapa"><button type="button" data-ver="a" aria-pressed="true">1º turno · 4 out</button><button type="button" data-ver="b" aria-pressed="false">2º turno · 25 out</button></div>
<div class="cmp-maps">${one("6257", "cmp-a", "1º turno · 4 out")}${one("6258", "cmp-b", "2º turno · 25 out")}</div>
<div class="cmp-painel" aria-live="polite"><p class="sub">Escolha um município para comparar os dois turnos.</p></div>
<noscript><p class="empty">A comparação precisa de JavaScript.</p></noscript></section>`;
}
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

function page(uf, name, T = T1) {
  const br = !uf, zz = uf === "zz", where = br ? "Brasil" : name, t2 = T.n === 2;
  const url = `${SITE}${T.root}${br ? "" : uf + "/"}`;
  const title = `Eleições 2026 · Presidente · ${T.rotulo} — ${where} | Desmentindo`;
  const desc = t2 ? (br
    ? "Apuração oficial do TSE do 2º turno para presidente (25/10) no Brasil, direto da fonte: resultado, evolução da diferença registro a registro, comparação histórica e o caminho até cada seção e boletim de urna."
    : `Apuração oficial do TSE do 2º turno para presidente (25/10) ${zz ? "no exterior" : "em " + name}, direto da fonte, com ${zz ? "cidade" : "município"}, zona, seção e boletim de urna.`)
    : br
    ? "Resultado oficial do TSE para presidente no Brasil, atualizado direto da fonte, com a evolução da apuração hora a hora e o caminho até cada seção e boletim de urna."
    : zz ? "Resultado oficial do TSE para presidente no exterior, atualizado direto da fonte, com cidade, zona, seção e boletim de urna."
    : `Resultado oficial do TSE para presidente em ${name}, atualizado direto da fonte, com município, zona, seção e boletim de urna.`;
  const nav = UFS.concat([["zz", "Exterior"]]).map(([c, n]) => `<li><a href="${T.root}${c}/" title="${attr(n)}"${c === uf ? ' aria-current="page"' : ""}>${c === "zz" ? "Exterior" : c.toUpperCase()}</a></li>`).join("");
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
<meta property="og:image" content="${SITE}/img/og/${T.og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Eleições 2026${t2 ? " · 2º turno" : ""} · resultado oficial do TSE · Desmentindo">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(title)}"><meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${SITE}/img/og/${T.og}">
<meta name="theme-color" content="#1D1B1A">
<link rel="icon" href="${asset("favicon.ico")}" sizes="32x32">
<link rel="icon" href="${asset("favicon.svg")}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${asset("apple-touch-icon.png")}">
<link rel="preload" href="/v5/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset("v5/css/fonts.css")}">
<link rel="stylesheet" href="${asset("eleicoes-2026/eleicoes.css")}">${br ? `\n<link rel="stylesheet" href="${asset("eleicoes-2026/eleicoes-mun.css")}">` : ""}
<script>/* reserva espaço do recorte aberto por link antes do 1º desenho (menos deslocamento de layout) */(function(h,d){d.className+=/(^|[#&])s=/.test(h)?" deep-s":/(^|[#&])z=/.test(h)?" deep-z":/(^|[#&])m=/.test(h)?" deep-m":""})(location.hash,document.documentElement)</script>
${umami}
</head>
<body data-scope="${br ? "br" : uf}" data-mode="resultados" data-calc="${FLAGS.calculado && !t2 ? "on" : "off"}" data-locais="${FLAGS.locais ? "on" : "off"}"${t2 ? ` data-turno="2" data-ele="${T.ele}" data-pleito="${T.pleito}" data-release="${T.release}" data-snap="${T.snap}" data-root="${T.root}"` : ""}>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="top"><div class="wrap topbar"><a class="brand" href="/" aria-label="Desmentindo — início"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><b>DESMENTINDO</b></a>
<nav class="crumbs" id="crumbs" aria-label="Você está em"><a href="${T.root}">Brasil</a>${br ? "" : `<span aria-hidden="true">›</span><b>${attr(where)}</b>`}</nav>
<div class="modes" role="group" aria-label="Modo de leitura"><button type="button" id="mRes" aria-pressed="true">Resultados</button><button type="button" id="mAud" aria-pressed="false">Verificação</button></div></div></header>
${pnav(br ? "res" : "exp", T)}
<main class="wrap" id="conteudo">
<div class="head">
${br ? TURNOS(t2) : ""}<p class="kick"><span class="tag res">Dado oficial · TSE</span>Eleições 2026 · Presidente · ${T.rotulo} · ${T.dia}</p>
<h1>${attr(where)}</h1>
${br && t2 ? `<nav class="paths t2" aria-label="O que dá para fazer aqui"><a href="#resultado"><b>Explore os resultados</b><span>Apuração oficial do TSE e o caminho até cada seção</span></a><a href="#historico"><b>Compare com outros turnos</b><span>1º turno de 2026 e 2º turno de 2022, com a fonte</span></a><a href="/eleicoes-2026/"><b>1º turno (4 out)</b><span>Resultado final, a noite da apuração e os questionamentos</span></a></nav>` :
br ? `<p class="turno2"><a href="/eleicoes-2026/2-turno/"><b>2º turno · 25 de outubro</b><span>Acompanhe a apuração oficial do TSE a partir das 17h</span></a></p><nav class="paths" aria-label="O que dá para fazer aqui"><a href="#resultado"><b>Explore os resultados</b><span>Placar oficial do TSE e o caminho até cada seção</span></a><a href="/eleicoes-2026/questionamentos/"><b>Investigue os questionamentos</b><span>${QDATA.questionamentos.length} dúvidas que circularam, testadas nos dados oficiais</span></a><a href="#verificacao"><b>Verificação</b><span>De onde vem cada número</span></a></nav>` : ""}
</div>
${br ? SECNAV + "\n" : ""}${br ? `<section class="estado-el" id="estado" aria-labelledby="t-estado"><h2 id="t-estado">Estado da eleição</h2><div id="lideres" class="lideres" aria-live="polite">${LIDERES0}</div>` : ""}<section id="status" class="cards" aria-label="Situação da apuração">${STATUS0}</section>${PART0}${br ? "</section>\n" + (t2 ? NOITE_2T + "\n" + DIF_2T : Q_BR + "\n" + NOITE_BR) : ""}
<div class="layout">
<section class="area-res" aria-labelledby="t-agora" id="resultado"><h2 id="t-agora">${br ? "Resultado oficial" : "Resultado"}</h2><p class="stale" id="stale" hidden></p><p class="snapnote" id="snapnote" hidden></p><div id="placar"><p class="empty">Carregando…</p></div></section>
<section class="area-terr" aria-labelledby="t-terr" id="onde"><h2 id="t-terr">Explorar o território</h2>
<div class="busca"><label for="busca">Buscar município</label><input id="busca" type="search" autocomplete="off" placeholder="${br ? "ex.: Campinas" : "nome do município"}" aria-describedby="buscaDica"><p id="buscaDica" class="sub">Depois: zona, local de votação e seção.</p><ul id="buscaRes" class="buscares" aria-live="polite"></ul></div>
${br ? `<div class="maphead"><label for="layers">Mostrar no mapa</label><select id="layers"><option value="lider">Quem está à frente</option><option value="tot">Quanto falta totalizar</option><option value="comp">Comparecimento</option><option value="abst">Abstenção</option><option value="margem">Diferença entre os dois primeiros</option><option value="late">Ordem de chegada das seções</option></select></div>
<div id="mapa" class="mapa"><p class="empty">Disponível depois das 17h.</p></div><div id="mapaLista"></div>
<ul class="ufs">${UFS.concat([["zz", "Exterior"]]).map(([c, n]) => `<li><a href="${T.root}${c}/" title="${attr(n)}">${c === "zz" ? "Exterior" : c.toUpperCase()}</a></li>`).join("")}</ul>` :
`<div id="explorar"><p class="empty">Disponível depois das 17h.</p></div>
<details class="outros"><summary>${zz ? "Estados" : "Outros estados e exterior"}</summary><ul class="ufs">${nav}</ul></details>`}
</section>
<aside class="area-ctx" aria-labelledby="t-falta"><div id="secPanel" class="sheet" hidden role="region" aria-labelledby="sheetTitle"></div>
<h2 id="t-falta">Quem ainda falta?</h2><div id="falta"><p class="empty">Disponível depois das 17h.</p></div>
${br ? `<h2 class="h2s" id="t-ext">Exterior</h2><div id="exterior"><p class="empty">Disponível depois das 17h.</p></div>` : ""}
</aside>
</div>
${br ? munSection(t2 ? "6258" : "6257", T.root, t2 ? "2º turno" : "1º turno") + "\n" : ""}${br ? cmpSection(T.root) + "\n" + HUBS() + "\n" : ""}${br && t2 ? HIST_2T() + "\n" + pesqSection(PESQ, FLAGS.pesquisas_2t === true) + "\n" : ""}<section class="area-aud" aria-labelledby="t-aud" id="verificacao"><h2 id="t-aud">${br ? "Metodologia e verificação" : "Verificação"}</h2>
<p class="sub">O que cada número é, de onde vem e o que ainda falta. Use o modo Verificação (no topo) para ver os detalhes técnicos abertos. <a href="/eleicoes-2026/questionamentos/">Questionamentos sobre a eleição →</a></p>
<div class="audgrid"><div><h3>Origem dos números</h3><ul class="rules"><li><span class="prov of">Dado oficial (TSE)</span> número publicado pela Justiça Eleitoral, lido direto dos arquivos públicos do TSE.</li>
<li><span class="prov calc">Métrica calculada pelo Eleições 2026</span> conta feita por esta página a partir de arquivos oficiais (ex.: % de uma seção a partir do boletim). Não é número do TSE.</li></ul></div>
<div><h3>Estado de cada seção</h3><dl class="estados">${ESTADOS_HTML}</dl></div></div>
<div id="calcbox" class="calcbox"></div></section>
<section aria-labelledby="t-regras"><h2 id="t-regras">Como ler esta página</h2><ul class="rules">
<li>Resultado oficial é o que o TSE publica. Pesquisa eleitoral é outra coisa${t2 && br ? ": aparece só em “Institutos de pesquisa”, separada, com registro e fonte." : " e não aparece aqui."}</li>
<li>Até a totalização final, todo número é parcial e vem com o % de seções totalizadas.</li>
<li>Dado que o TSE não informou aparece como “—”, nunca como zero. Entre dois registros da linha do tempo não desenhamos nada.</li>
<li>Arquivo que ainda não está disponível não é indício de problema na votação, e não inferimos o motivo.</li>
<li>Não fazemos previsão de vencedor nem projeção.</li>${t2 ? "\n<li>O % de seções totalizadas mostra o andamento da contagem. Não é chance de vitória, e a diferença parcial não prevê a final.</li>" : ""}</ul></section>
</main>
<footer><div class="wrap">Fonte: Tribunal Superior Eleitoral (resultados.tse.jus.br). <a href="/#/privacidade">Privacidade</a> · <a href="/">Desmentindo</a></div></footer>
<script src="${asset("eleicoes-2026/eleicoes-core.js")}" defer></script>
<script src="${asset("eleicoes-2026/eleicoes-cores.js")}" defer></script>
<script src="${asset("eleicoes-2026/eleicoes.js")}" defer></script>
${br ? `<script src="${asset("eleicoes-2026/eleicoes-mun.js")}" defer></script>\n<script src="${asset("eleicoes-2026/eleicoes-cmp.js")}" defer></script>\n` : ""}</body>
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
<link rel="icon" href="${asset("favicon.ico")}" sizes="32x32">
<link rel="icon" href="${asset("favicon.svg")}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${asset("apple-touch-icon.png")}">
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
// Estudos (LATE15 · H23 · boletins): só com gate aprovado + arquivo de dados; sem isso as páginas saem idênticas.
{ const dados = Object.fromEntries(["late15", "h23", "bu"].map(id => { const p = path.join(ROOT, "public-ui", "eleicoes_estudos", id + ".json"); return [id, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null]; }));
  const ins = aplicarEstudos(files, FLAGS.estudos, dados, Object.values(dados).some(Boolean) ? asset("eleicoes-2026/eleicoes-estudos.css") : null);
  if (ins.length) console.log("ESTUDOS_INSERIDOS " + ins.join(",")); }
for (const [c, n] of UFS) files[`eleicoes-2026/${c}/index.html`] = page(c, n);
files["eleicoes-2026/zz/index.html"] = page("zz", "Exterior");
files["eleicoes-2026/2-turno/index.html"] = page(null, null, T2);
for (const [c, n] of UFS) files[`eleicoes-2026/2-turno/${c}/index.html`] = page(c, n, T2);
files["eleicoes-2026/2-turno/zz/index.html"] = page("zz", "Exterior", T2);
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
