#!/usr/bin/env node
/*
 * SEO mínimo (19/10/2026): robots.txt e sitemap.xml gerados por build-root.mjs, ao lado das páginas por edição.
 *   node public-ui/test-seo.mjs
 * Fail-closed: robots aponta para o sitemap e não bloqueia o site; o sitemap tem a raiz, toda página de edição
 * (FECHAMENTO/MATÉRIA), só páginas indexáveis de Eleições 2026, nenhuma URL repetida e nenhuma rota aposentada.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://desmentindo.com.br";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "seo-"));
execFileSync("node", [path.join(ROOT, "public-ui/build-root.mjs"), "--out", path.join(tmp, "root.html"), "--no-build-info",
  "--pages-out", path.join(tmp, "pages")], { stdio: "pipe" });
const fail = [];
const robots = fs.readFileSync(path.join(tmp, "pages/robots.txt"), "utf8");
const xml = fs.readFileSync(path.join(tmp, "pages/sitemap.xml"), "utf8");

if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail.push("robots.txt sem a linha Sitemap");
if (/^Disallow:\s*\/\s*$/m.test(robots)) fail.push("robots.txt bloqueia o site inteiro");
if (!/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/.test(xml)) fail.push("sitemap sem cabeçalho/namespace");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!locs.includes(`${SITE}/`)) fail.push("sitemap sem a raiz");
if (new Set(locs).size !== locs.length) fail.push("sitemap com URL repetida");
for (const u of locs) {
  if (!u.startsWith(`${SITE}/`) || !u.endsWith("/")) fail.push("URL fora do padrão: " + u);
  if (/\/v4\/|desmentindo_local/.test(u)) fail.push("rota aposentada no sitemap: " + u);
}
const editions = [];
for (const [idx, dir, key] of [["data/editorial/fechamentos/index.json", "fechamento", "date"], ["data/editorial/materias/index.json", "materia", "slug"]]) {
  const f = path.join(ROOT, idx);
  if (fs.existsSync(f)) for (const x of JSON.parse(fs.readFileSync(f, "utf8")).items || []) editions.push(`${SITE}/${dir}/${x[key]}/`);
}
for (const u of editions) if (!locs.includes(u)) fail.push("edição fora do sitemap: " + u);
for (const u of locs.filter(u => u.includes("/eleicoes-2026/"))) {
  const f = path.join(ROOT, u.slice(SITE.length + 1), "index.html");
  if (!fs.existsSync(f)) fail.push("página de Eleições inexistente no repo: " + u);
  else if (/<meta name="robots" content="noindex/.test(fs.readFileSync(f, "utf8"))) fail.push("página noindex no sitemap: " + u);
}
fs.rmSync(tmp, { recursive: true, force: true });
if (fail.length) { console.error("SEO_FAIL\n" + fail.join("\n")); process.exit(1); }
console.log(`SEO_OK: robots.txt + sitemap.xml (${locs.length} URLs; ${editions.length} edições)`);
