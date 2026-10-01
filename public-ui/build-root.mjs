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
for (const f of ["v5/data/home.json", "v5/data/busca/meta.json"]) {
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
if (!process.argv.includes("--no-build-info")) {
  // build-info técnico (não visual) — só no workspace do deploy; base do DATA_FRESHNESS gate
  const info = { ui_version: "v5", ui_commit: commit, data_build_id: dataId, data_edition: home.edition || null,
                 data_source: "index.html (dados públicos aprovados, Publisher) → public-ui/build-v5-data.mjs",
                 generated_at: new Date().toISOString() };
  fs.writeFileSync(path.join(ROOT, "v5", "data", "build-info.json"), JSON.stringify(info, null, 1) + "\n");
}
console.log("raiz = v5 → " + path.relative(ROOT, out));
