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
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://desmentindo.com.br";
const UFS = [["ac","Acre"],["al","Alagoas"],["ap","Amapá"],["am","Amazonas"],["ba","Bahia"],["ce","Ceará"],["df","Distrito Federal"],
  ["es","Espírito Santo"],["go","Goiás"],["ma","Maranhão"],["mt","Mato Grosso"],["ms","Mato Grosso do Sul"],["mg","Minas Gerais"],
  ["pa","Pará"],["pb","Paraíba"],["pr","Paraná"],["pe","Pernambuco"],["pi","Piauí"],["rj","Rio de Janeiro"],["rn","Rio Grande do Norte"],
  ["rs","Rio Grande do Sul"],["ro","Rondônia"],["rr","Roraima"],["sc","Santa Catarina"],["sp","São Paulo"],["se","Sergipe"],["to","Tocantins"]];
const A = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "analytics.json"), "utf8"));
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
${umami}
</head>
<body data-scope="${br ? "br" : uf}">
<header class="top"><div class="wrap"><a class="brand" href="/" aria-label="Desmentindo — início"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><b>DESMENTINDO</b></a>${br ? "" : '<a class="crumb" href="/eleicoes-2026/">← Brasil</a>'}</div></header>
<main class="wrap">
<div class="head">
<p class="kick"><span class="tag res">Resultado oficial · TSE</span>Eleições 2026 · Presidente · 1º turno</p>
<h1>${attr(where)}</h1>
<p class="lead">Números lidos direto da Justiça Eleitoral, sem soma nem estimativa nossa. Parcial mostra quantas seções já foram totalizadas.</p>
</div>
<section aria-labelledby="t-agora"><h2 id="t-agora">Resultado agora</h2><p class="stale" id="stale" hidden></p><div id="placar"><p class="empty">Carregando…</p></div></section>
${br ? `<section class="mapsec" aria-labelledby="t-mapa"><h2 id="t-mapa">Por estado</h2><p class="sub">Toque num estado para ver o resultado dele e descer até a seção e o boletim de urna. A cor indica quem está à frente na parcial daquele estado; os números estão na lista abaixo do mapa.</p><div id="mapa" class="mapa"><p class="empty">Disponível depois das 17h.</p></div><div id="mapaLista"></div></section>
<section aria-labelledby="t-ext"><h2 id="t-ext">Exterior</h2><p class="sub">Votos de brasileiros no exterior, como o TSE publica. A divulgação segue o mesmo horário do Brasil.</p><div id="exterior"><p class="empty">Disponível depois das 17h.</p></div><p class="more"><a href="/eleicoes-2026/zz/">Ver o exterior por cidade, zona e seção →</a></p></section>
<section aria-labelledby="t-evo"><h2 id="t-evo">Evolução da apuração</h2><p class="sub">Registros do que o TSE mostrava: o primeiro resultado, depois um por hora, e o final. Não é projeção nem tendência.</p><div id="evolucao"><p class="empty">Disponível depois das 17h.</p></div></section>
<section aria-labelledby="t-bu"><h2 id="t-bu">Consulte os boletins de urna</h2><p class="sub">Escolha o estado (ou o exterior), depois o município, a zona e a seção. Na seção, você chega aos arquivos oficiais da urna publicados pelo TSE, como o boletim de urna (BU). <b id="buState">Aguardando dados oficiais (17h).</b></p><ul class="ufs">${UFS.concat([["zz", "Exterior"]]).map(([c, n]) => `<li><a href="/eleicoes-2026/${c}/#onde" title="${attr(n)}">${c === "zz" ? "Exterior" : c.toUpperCase()}</a></li>`).join("")}</ul></section>` :
`<section aria-labelledby="t-onde" id="onde"><h2 id="t-onde">De onde vieram os votos</h2><p class="sub">${zz ? "Escolha a cidade, a zona e a seção." : "Escolha o município, a zona e a seção."} Na seção, você chega aos arquivos oficiais da urna, como o boletim de urna.</p><div id="explorar"><p class="empty">Disponível depois das 17h.</p></div></section>
<section aria-labelledby="t-uf"><h2 id="t-uf">${zz ? "Estados" : "Outros estados e exterior"}</h2><ul class="ufs">${nav}</ul></section>`}
<section aria-labelledby="t-regras"><h2 id="t-regras">Como ler esta página</h2><ul class="rules">
<li>Resultado oficial é o que o TSE publica. Pesquisa eleitoral é outra coisa e não aparece aqui.</li>
<li>Até a totalização final, todo número é parcial e vem com o % de seções totalizadas.</li>
<li>Dado que o TSE não informou aparece como “—”, nunca como zero.</li>
<li>Não fazemos previsão de vencedor nem projeção.</li></ul></section>
</main>
<footer><div class="wrap">Fonte: Tribunal Superior Eleitoral (resultados.tse.jus.br). <a href="/#/privacidade">Privacidade</a> · <a href="/">Desmentindo</a></div></footer>
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
