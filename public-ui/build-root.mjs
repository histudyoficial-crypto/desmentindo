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
fs.writeFileSync(out, h);

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
