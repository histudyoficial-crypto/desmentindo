#!/usr/bin/env node
/*
 * Página da RAIZ do site (desmentindo.com.br/) — gerada no deploy, nunca commitada.
 *
 *   public-ui/ROOT_VERSION = "v5"     → raiz = v5 (indexável, canonical, assets e dados em /v5/)
 *   public-ui/ROOT_VERSION = "legacy" → raiz = index.html legado (ROLLBACK: um commit trocando a palavra)
 *
 * O index.html do repositório continua sendo o app legado: é o que o Publisher atualiza e é a fonte
 * dos dados públicos lidos pelos builds da v4/v5 (que rodam ANTES deste script no deploy).
 *
 *   node public-ui/build-root.mjs                  # escreve index.html (só no workspace do deploy)
 *   node public-ui/build-root.mjs --out <arquivo>  # escreve em outro lugar (QA / fronteira)
 */
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = fs.readFileSync(path.join(ROOT, "public-ui", "ROOT_VERSION"), "utf8").trim();
const i = process.argv.indexOf("--out");
const out = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(ROOT, "index.html");

if (mode === "legacy") {
  if (out !== path.join(ROOT, "index.html")) fs.copyFileSync(path.join(ROOT, "index.html"), out);
  console.log("raiz = legado (ROOT_VERSION=legacy)");
  process.exit(0);
}
if (mode !== "v5") throw new Error("ROOT_VERSION desconhecido: " + mode);

// VERSIONAMENTO (P0 01/10): a raiz declara qual UI e qual build de dados está servindo, e todo asset/dado é pedido
// com ?v=<versão> — o navegador nunca mistura uma página antiga em cache com dados/CSS/JS de outro deploy.
const commit = (process.env.DESMENTINDO_BUILD_COMMIT || process.env.GITHUB_SHA ||
  (() => { try { return execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })());
const ui = commit.slice(0, 12);
const home = JSON.parse(fs.readFileSync(path.join(ROOT, "v5", "data", "home.json"), "utf8"));
const dataBuild = crypto.createHash("sha256");
for (const f of ["v5/data/home.json", "v5/data/busca/meta.json", "data/editorial/index.json"]) {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) dataBuild.update(fs.readFileSync(fp));
}
const dataId = dataBuild.digest("hex").slice(0, 12);

let h = fs.readFileSync(path.join(ROOT, "v5", "index.html"), "utf8");
const must = (re, what) => { if (!re.test(h)) throw new Error("v5/index.html mudou: não encontrei " + what); };
must(/<meta name="robots" content="noindex, nofollow">/, "meta robots");
must(/href="css\/v5\.css"/, "css");
must(/src="js\/v5\.js"/, "js");
h = h
  .replace(/<meta name="robots" content="noindex, nofollow">/,
    '<meta name="robots" content="index, follow">\n<link rel="canonical" href="https://desmentindo.com.br/">\n' +
    '<meta name="v5-base" content="v5/">\n<meta name="desmentindo-root" content="v5">\n' +
    '<meta name="desmentindo-ui" content="v5">\n' +
    `<meta name="desmentindo-build" content="ui=${ui};data=${dataId};edition=${home.edition || "unknown"}">\n` +
    `<meta name="desmentindo-data-version" content="${dataId}">`)
  .replace(/(href|src)="(css|js)\/([^"]+)"/g, `$1="v5/$2/$3?v=${ui}"`)
  .replace(/href="fonts\//g, 'href="v5/fonts/')
  .replace(/<span>Cópia de prévia · <a href="\.\.\/">desmentindo\.com\.br<\/a><\/span>/, "");
if (/noindex/.test(h)) throw new Error("raiz não pode ter noindex");

// ANALYTICS (T3, decisão D-01 de 04/10): Umami Cloud, só quando public-ui/analytics.json tiver o website_id.
// Sem id → nenhum script de medição. Sem cookie, sem identificador próprio, sem dado pessoal em evento.
const AN = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "analytics.json"), "utf8"));
const analyticsTag = AN.provider === "umami" && AN.website_id
  ? `<meta name="desmentindo-analytics" content="umami"${AN.retention ? ` data-retention="${String(AN.retention).replace(/"/g, "")}"` : ""}>\n<script defer src="${AN.script_src}" data-website-id="${AN.website_id}" data-auto-track="false"${AN.respect_do_not_track ? ' data-do-not-track="true"' : ""}></script>`
  : "";
if (analyticsTag && !/^[0-9a-f-]{36}$/.test(AN.website_id)) throw new Error("analytics.json: website_id inválido");

// CAPTAÇÃO (T3/T4, 04/10): faixa "Receba o FECHAMENTO" acima do topo, só quando public-ui/capture.json tiver um destino
// real (https, host permitido para o canal). Sem destino → nenhuma faixa. Nenhum dado do leitor passa pelo site.
const CAP = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "capture.json"), "utf8"));
let captureTag = "";
if (CAP.enabled) {
  let u = null;
  try { u = new URL(CAP.destination); } catch (e) { /* inválido */ }
  const hosts = (CAP.allowed_hosts || {})[CAP.channel] || [];
  if (!u || u.protocol !== "https:" || !hosts.includes(u.hostname)) throw new Error("capture.json: destination precisa ser https num host permitido para o canal");
  const a = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  captureTag = `<meta name="desmentindo-capture" content="${a(u.href)}" data-channel="${a(CAP.channel)}" data-promise="${a(CAP.copy.promise)}" data-detail="${a(CAP.copy.detail)}" data-cta="${a(CAP.copy.cta)}" data-short="${a(CAP.copy.short)}">`;
}

// COMPARTILHAMENTO (T2, P0-A de 04/10): prévia de link. Quem gera prévia (WhatsApp, LinkedIn, X) não roda JS nem vê o
// "#/rota", então cada FECHAMENTO e MATÉRIA ganha uma página estática própria com título, descrição, canonical e Open Graph.
const SITE = "https://desmentindo.com.br";
const attr = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
function meta({ title, desc, url, image, type, published }) {
  return [`<link rel="canonical" href="${attr(url)}">`, `<meta name="description" content="${attr(desc)}">`,
    `<meta property="og:site_name" content="Desmentindo">`, `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:type" content="${type}">`, `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`, `<meta property="og:url" content="${attr(url)}">`,
    `<meta property="og:image" content="${SITE}${image}">`, `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`, `<meta property="og:image:alt" content="${attr(title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${attr(title)}">`,
    `<meta name="twitter:description" content="${attr(desc)}">`, `<meta name="twitter:image" content="${SITE}${image}">`]
    .concat(published ? [`<meta property="article:published_time" content="${attr(published)}">`] : []).join("\n");
}
const ROOT_DESC = (/<meta name="description" content="([^"]*)">/.exec(h) || [])[1] || "Desmentindo";
h = h.replace(/<meta name="description" content="[^"]*">\n?/, "")
  .replace('<link rel="canonical" href="https://desmentindo.com.br/">',
    meta({ title: "Desmentindo", desc: ROOT_DESC, url: SITE + "/", image: "/img/og/desmentindo.png", type: "website" }))
  .replace("</head>", (analyticsTag ? analyticsTag + "\n" : "") + (captureTag ? captureTag + "\n" : "") + "</head>");
fs.writeFileSync(out, h);

// Página por edição: mesma raiz, caminhos absolutos (a página fica em /fechamento/<data>/), e abre direto na rota.
const absRoot = h.replace(/(href|src)="v5\//g, '$1="/v5/').replace('<meta name="v5-base" content="v5/">', '<meta name="v5-base" content="/v5/">');
function editionPage(o) {
  const head = meta(o);
  let p = absRoot.replace(/<title>[^<]*<\/title>/, `<title>${attr(o.title)} · Desmentindo</title>`);
  p = p.replace(/<link rel="canonical"[\s\S]*?<meta name="twitter:image" content="[^"]*">/, head);
  const go = `<script>if(!location.hash||location.hash==="#"||location.hash==="#/")history.replaceState(null,"",location.pathname+location.search+"#${o.route}");</script>`;
  // links fixos (cabeçalho, barra e rodapé) levam à raiz; a navegação dentro da edição continua pelo #/rota
  p = p.replace(/href="#\//g, 'href="/#/').replace('href="#rodape"', 'href="#rodape"');
  return p.replace(/<script src="\/v5\/js\/v5\.js/, go + "\n$&");
}
const readJson = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")); } catch { return null; } };
export function editionPages() {
  const pages = [];
  for (const x of (readJson("data/editorial/fechamentos/index.json") || {}).items || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) throw new Error("fechamento com data inválida: " + x.date);
    const F = readJson(x.file) || {};
    const pts = ((F.opening || {}).points || []).map(q => q.text).join(" ");
    pages.push({ path: `fechamento/${x.date}/index.html`, route: `/fechamento/${x.date}`, title: x.title || F.public_title,
      desc: cut(pts || "O que importou hoje, com fontes.", 200), url: `${SITE}/fechamento/${x.date}/`,
      image: "/img/og/fechamento.png", type: "article", published: F.published_at });
  }
  for (const x of (readJson("data/editorial/materias/index.json") || {}).items || []) {
    if (!/^[a-z0-9-]+$/.test(x.slug)) throw new Error("matéria com slug inválido: " + x.slug);
    const M = readJson(x.file) || {};
    pages.push({ path: `materia/${x.slug}/index.html`, route: `/materia/${x.slug}`, title: x.title || M.public_title,
      desc: cut(x.dek || M.dek || "", 200), url: `${SITE}/materia/${x.slug}/`, image: "/img/og/materia.png",
      type: "article", published: M.published_at });
  }
  return pages.map(o => ({ path: o.path, html: editionPage(o), url: o.url }));
}

// LEGACY_PUBLIC_APP = RETIRED (decisão de Johnny, 02/10/2026): um só Desmentindo público. O app anterior continua no
// Git (index.html/desmentindo_local.html do repositório = histórico técnico e fonte de dados do Publisher), mas a URL
// pública /desmentindo_local.html passa a servir só um redirecionamento para a raiz, preservando o #/rota — o
// adaptador de rotas antigas da v5 leva cada link ao equivalente público (ou explica por que saiu).
export const LEGACY_STUB = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, follow"><meta name="desmentindo-legacy" content="retired">
<link rel="canonical" href="https://desmentindo.com.br/"><title>Desmentindo</title>
<script>location.replace("/" + (location.hash || ""));</script></head>
<body><p>O site anterior do Desmentindo foi encerrado. <a href="/">Ir para desmentindo.com.br</a></p></body></html>
`;
// Páginas por edição: no workspace do deploy (vão para o servidor pelo FTP) ou em --pages-out <dir> (QA / fronteira).
const po = process.argv.indexOf("--pages-out");
const pagesDir = po > 0 ? path.resolve(process.argv[po + 1]) : (out === path.join(ROOT, "index.html") && process.env.GITHUB_ACTIONS === "true" ? ROOT : null);
if (pagesDir) {
  const pages = editionPages();
  for (const pg of pages) {
    const f = path.join(pagesDir, pg.path);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, pg.html);
  }
  console.log(`páginas compartilháveis: ${pages.length} → ${path.relative(ROOT, pagesDir) || "."}`);
}
const li = process.argv.indexOf("--legacy-out");
// Só o workspace do deploy (GitHub Actions) troca arquivos do repositório; localmente nada é apagado/sobrescrito.
const DEPLOY_WS = out === path.join(ROOT, "index.html") && process.env.GITHUB_ACTIONS === "true";
if (out === path.join(ROOT, "index.html") && !DEPLOY_WS) console.warn("aviso: fora do GitHub Actions — app anterior e /v4/ NÃO foram substituídos (use --legacy-out/--v4-out para testar)");
const legacyOut = li > 0 ? path.resolve(process.argv[li + 1]) : (DEPLOY_WS ? path.join(ROOT, "desmentindo_local.html") : null);
if (legacyOut) fs.writeFileSync(legacyOut, LEGACY_STUB);

// LEGACY_V4_PUBLIC_PREVIEW_RETIRED (decisão de Johnny, 02/10/2026): a prévia /v4/ deixa de ser uma segunda experiência
// pública. Só no workspace do deploy: a árvore v4/ é removida (o FTP apaga do servidor o que sumiu, inclusive os dados
// da prévia) e fica apenas v4/index.html redirecionando para a raiz com a mesma rota. O código continua no Git.
export const V4_STUB = LEGACY_STUB.replace('content="retired"', 'content="retired-v4"').replace("O site anterior do Desmentindo foi encerrado.", "A prévia v4 do Desmentindo foi encerrada.");
const v4i = process.argv.indexOf("--v4-out");
if (v4i > 0) fs.writeFileSync(path.resolve(process.argv[v4i + 1]), V4_STUB);
else if (DEPLOY_WS) {
  fs.rmSync(path.join(ROOT, "v4"), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, "v4"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "v4", "index.html"), V4_STUB);
}
if (!process.argv.includes("--no-build-info")) {
  // índice editorial vazio só no workspace do deploy quando ainda não há edição publicada (evita 404 na Home);
  // nunca sobrescreve um índice real.
  const edIdx = path.join(ROOT, "data", "editorial", "index.json");
  if (!fs.existsSync(edIdx)) {
    fs.mkdirSync(path.dirname(edIdx), { recursive: true });
    fs.writeFileSync(edIdx, JSON.stringify({ schema: "desmentindo.public.editorial_index.v1", latest: null, editions: [] }) + "\n");
  }
  // build-info técnico (não visual) — só no workspace do deploy; base do DATA_FRESHNESS gate
  const info = { ui_version: "v5", ui_commit: commit, data_build_id: dataId, data_edition: home.edition || null,
                 data_source: "index.html (dados públicos aprovados, Publisher) → public-ui/build-v5-data.mjs",
                 generated_at: new Date().toISOString() };
  fs.writeFileSync(path.join(ROOT, "v5", "data", "build-info.json"), JSON.stringify(info, null, 1) + "\n");
}
console.log("raiz = v5 → " + path.relative(ROOT, out));
