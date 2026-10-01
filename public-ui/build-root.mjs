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

let h = fs.readFileSync(path.join(ROOT, "v5", "index.html"), "utf8");
const must = (re, what) => { if (!re.test(h)) throw new Error("v5/index.html mudou: não encontrei " + what); };
must(/<meta name="robots" content="noindex, nofollow">/, "meta robots");
must(/href="css\/v5\.css"/, "css");
must(/src="js\/v5\.js"/, "js");
h = h
  .replace(/<meta name="robots" content="noindex, nofollow">/,
    '<meta name="robots" content="index, follow">\n<link rel="canonical" href="https://desmentindo.com.br/">\n' +
    '<meta name="v5-base" content="v5/">\n<meta name="desmentindo-root" content="v5">')
  .replace(/(href|src)="(css|js|fonts)\//g, '$1="v5/$2/')
  .replace(/<span>Cópia de prévia · <a href="\.\.\/">desmentindo\.com\.br<\/a><\/span>/, "");
if (/noindex/.test(h)) throw new Error("raiz não pode ter noindex");
fs.writeFileSync(out, h);
console.log("raiz = v5 → " + path.relative(ROOT, out));
