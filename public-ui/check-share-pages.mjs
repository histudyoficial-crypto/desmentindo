#!/usr/bin/env node
/*
 * Verificação (CI de fronteira) das páginas compartilháveis — P0-A de T2 (04/10/2026).
 *   node public-ui/check-share-pages.mjs <dir-das-páginas> <raiz-gerada.html>
 * Toda edição publicada (FECHAMENTO e MATÉRIA) tem /fechamento/<data>/ ou /materia/<slug>/ com título, descrição,
 * canonical e Open Graph próprios; a imagem de prévia existe no repositório; e a medição só aparece com website_id.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [dir, rootHtml] = process.argv.slice(2);
const SITE = "https://desmentindo.com.br";
const fail = [];
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const tag = (h, re) => (re.exec(h) || [])[1];
const unesc = s => String(s || "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function checkPage(rel, wantTitle, wantUrl) {
  const f = path.join(dir, rel);
  if (!fs.existsSync(f)) { fail.push("sem página: " + rel); return; }
  const h = fs.readFileSync(f, "utf8");
  const og = k => unesc(tag(h, new RegExp(`<meta property="og:${k}" content="([^"]*)">`)));
  if (og("title") !== wantTitle) fail.push(`${rel}: og:title "${og("title")}" ≠ "${wantTitle}"`);
  if (og("url") !== wantUrl) fail.push(`${rel}: og:url ${og("url")}`);
  if (tag(h, /<link rel="canonical" href="([^"]*)">/) !== wantUrl) fail.push(`${rel}: canonical`);
  if (!og("description")) fail.push(`${rel}: sem og:description`);
  const img = og("image");
  if (!img || !img.startsWith(SITE + "/img/og/") || !fs.existsSync(path.join(ROOT, img.slice(SITE.length + 1)))) fail.push(`${rel}: og:image ausente ou inexistente (${img})`);
  if (!/<meta name="twitter:card" content="summary_large_image">/.test(h)) fail.push(`${rel}: sem twitter:card`);
  if (/noindex/.test(h)) fail.push(`${rel}: noindex`);
  if (!/history\.replaceState/.test(h)) fail.push(`${rel}: não abre na rota da edição`);
  if (/(href|src)="v5\//.test(h)) fail.push(`${rel}: caminho relativo de asset (quebra em subpasta)`);
}
for (const x of (read("data/editorial/fechamentos/index.json").items || []))
  checkPage(`fechamento/${x.date}/index.html`, x.title, `${SITE}/fechamento/${x.date}/`);
for (const x of (read("data/editorial/materias/index.json").items || []))
  checkPage(`materia/${x.slug}/index.html`, x.title, `${SITE}/materia/${x.slug}/`);

const root = fs.readFileSync(rootHtml, "utf8");
if (!/<meta property="og:image" content="https:\/\/desmentindo\.com\.br\/img\/og\/desmentindo\.png">/.test(root)) fail.push("raiz sem og:image");
const AN = read("public-ui/analytics.json");
const hasAn = /name="desmentindo-analytics"/.test(root);
if (!AN.website_id && hasAn) fail.push("medição ligada sem website_id");
if (AN.website_id && (!hasAn || !/data-auto-track="false"/.test(root) || !root.includes(`src="${AN.script_src}"`))) fail.push("medição configurada mas tag inválida");
if (fail.length) { console.error("SHARE_PAGES_INVALID\n  " + fail.join("\n  ")); process.exit(1); }
console.log(`SHARE_PAGES_VALID (${fs.readdirSync(dir).length} tipos) · medição ${hasAn ? "LIGADA" : "desligada (sem website_id)"}`);
