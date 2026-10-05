#!/usr/bin/env node
/**
 * Eleições 2026 · gera eleicoes-2026/index.html (Brasil) e eleicoes-2026/<uf>/index.html (27 UFs), cada uma com
 * título, descrição, canonical e Open Graph próprios (prévia de link não sai genérica). Resultado vem do TSE no
 * navegador (eleicoes-2026/eleicoes.js); estas páginas não têm número nenhum.
 *
 *   node public-ui/build-eleicoes.mjs          # escreve
 *   node public-ui/build-eleicoes.mjs --check  # CI: falha se o que está versionado difere do gerado
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
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
const ESTADOS_HTML = Object.values(CORE.ESTADOS).map(e => `<div class="e-${e.classe}"><dt>${e.nome}</dt><dd>${e.texto}</dd></div>`).join("");
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
<link rel="stylesheet" href="/v5/css/fonts.css">
<link rel="stylesheet" href="/eleicoes-2026/eleicoes.css">
<script>/* reserva espaço do recorte aberto por link antes do 1º desenho (menos deslocamento de layout) */(function(h,d){d.className+=/(^|[#&])s=/.test(h)?" deep-s":/(^|[#&])z=/.test(h)?" deep-z":/(^|[#&])m=/.test(h)?" deep-m":""})(location.hash,document.documentElement)</script>
${umami}
</head>
<body data-scope="${br ? "br" : uf}" data-mode="resultados" data-calc="${FLAGS.calculado ? "on" : "off"}" data-locais="${FLAGS.locais ? "on" : "off"}">
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<header class="top"><div class="wrap topbar"><a class="brand" href="/" aria-label="Desmentindo — início"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><b>DESMENTINDO</b></a>
<nav class="crumbs" id="crumbs" aria-label="Você está em"><a href="/eleicoes-2026/">Brasil</a>${br ? "" : `<span aria-hidden="true">›</span><b>${attr(where)}</b>`}</nav>
<div class="modes" role="group" aria-label="Modo de leitura"><button type="button" id="mRes" aria-pressed="true">Resultados</button><button type="button" id="mAud" aria-pressed="false">Auditoria</button></div></div></header>
<main class="wrap" id="conteudo">
<div class="head">
<p class="kick"><span class="tag res">Dado oficial · TSE</span>Eleições 2026 · Presidente · 1º turno</p>
<h1>${attr(where)}</h1>
</div>
<section id="status" class="cards" aria-label="Situação da apuração"></section>
<div class="layout">
<section class="area-res" aria-labelledby="t-agora"><h2 id="t-agora">Resultado</h2><p class="stale" id="stale" hidden></p><p class="snapnote" id="snapnote" hidden></p><div id="placar"><p class="empty">Carregando…</p></div></section>
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
${br ? `<section class="area-time" aria-labelledby="t-evo"><h2 id="t-evo">Linha do tempo</h2><p class="sub">Do início da apuração (17h) ao final: o que o TSE mostrava em cada registro. Escolha um instante para ver o resultado daquela hora.</p><div id="evolucao"><p class="empty">Disponível depois das 17h.</p></div></section>` : ""}
<section class="area-aud" aria-labelledby="t-aud" id="auditoria"><h2 id="t-aud">Auditoria</h2>
<p class="sub">O que cada número é, de onde vem e o que ainda falta. Use o modo Auditoria (no topo) para ver os detalhes técnicos abertos.</p>
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
<script src="/eleicoes-2026/eleicoes-core.js" defer></script>
<script src="/eleicoes-2026/eleicoes.js" defer></script>
</body>
</html>
`;
}

const files = { "eleicoes-2026/index.html": page(null, null) };
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
