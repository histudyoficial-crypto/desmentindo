#!/usr/bin/env node
// Eleições 2026: cada página gerada aponta só para CSS/JS da mesma versão (?v=<sha256 do conteúdo>), e o verificador
// pega a classe de erro real de 06/10/2026 (HTML novo servido com CSS/JS anterior). node public-ui/test-eleicoes-assets.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assetProblems, localAssetRefs } from "./asset-versions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const disk = p => { try { return fs.readFileSync(path.join(ROOT, p)); } catch { return null; } };
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
  const r = d + "/" + f.name; if (f.isDirectory()) walk(r); else if (f.name.endsWith(".html")) pages.push(r); } })("eleicoes-2026");
assert.ok(pages.length >= 42, "páginas do Eleições");

let refs = 0;
for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), "utf8");
  const r = localAssetRefs(html);
  assert.ok(r.some(x => x.path === "/eleicoes-2026/eleicoes.css"), p + " sem eleicoes.css");
  refs += r.length;
  assert.deepEqual(await assetProblems(html, disk), [], p);
}
const home = fs.readFileSync(path.join(ROOT, "eleicoes-2026/index.html"), "utf8");
for (const a of ["/v5/css/fonts.css", "/eleicoes-2026/eleicoes.css", "/eleicoes-2026/eleicoes-core.js", "/eleicoes-2026/eleicoes.js"])
  assert.ok(localAssetRefs(home).some(x => x.path === a && x.v), "home sem " + a + " versionado");
const withQ = pages.map(p => fs.readFileSync(path.join(ROOT, p), "utf8")).filter(h => h.includes("/eleicoes-2026/questionamentos.js"));
assert.ok(withQ.length >= 1 && withQ.every(h => /questionamentos\.js\?v=[0-9a-f]{12}"/.test(h)), "questionamentos.js (contador do Q7) versionado");

// o defeito real: HTML desta versão + eleicoes.css/eleicoes.js da versão anterior
const stale = p => { const b = disk(p); return /\.(css|js)$/.test(p) ? Buffer.concat([b, Buffer.from("\n/* versão anterior */")]) : b; };
const bad = await assetProblems(home, stale);
assert.ok(bad.some(x => x.startsWith("VERSION_MISMATCH:/eleicoes-2026/eleicoes.css")), "CSS antigo não detectado");
assert.ok(bad.some(x => x.startsWith("VERSION_MISMATCH:/eleicoes-2026/eleicoes.js")), "JS antigo não detectado");
// referência sem versão (a forma anterior das páginas) também reprova
assert.deepEqual(await assetProblems('<link rel="stylesheet" href="/eleicoes-2026/eleicoes.css">', disk), ["UNVERSIONED:/eleicoes-2026/eleicoes.css"]);
assert.deepEqual(await assetProblems('<script src="/eleicoes-2026/eleicoes.js?v=000000000000" defer></script>', () => null), ["MISSING:/eleicoes-2026/eleicoes.js"]);
console.log(`ELEICOES_ASSETS_OK (${pages.length} páginas, ${refs} referências; HTML novo + asset antigo detectado)`);
