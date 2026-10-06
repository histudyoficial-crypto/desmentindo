#!/usr/bin/env node
/*
 * Verificação PÓS-DEPLOY da produção (roda no fim do deploy-locaweb.yml; falha o workflow se algo divergir).
 * Compara o que desmentindo.com.br SERVE com o que ESTE commit gera — conteúdo, não só HTTP 200.
 *   ROOT_UI_VERSION     raiz declara desmentindo-ui=v5 e não contém o app legado
 *   ROOT_VERSION_MATCH  bytes da raiz servida == raiz gerada por build-root.mjs neste commit
 *   ASSETS_MATCH        v5.js / v5.css / fonts.css servidos == arquivos do commit
 *   DATA_MATCH          home.json servido == build deste commit; build-info.json com ui_commit e data_build_id deste deploy
 *   DATA_FRESHNESS      edição servida == D.meta.atualizado deste commit E edição editorial servida == data/editorial do commit
 *   EDITORIAL_MATCH     /data/editorial/index.json e a edição mais recente servidos == bytes do commit (sha256)
 *   LEGACY_V4_PUBLIC_PREVIEW_RETIRED /v4/ = redirecionamento; /v4/data/* não é mais servido (404)
 *   LEGACY_PUBLIC_APP_RETIRED /desmentindo_local.html = redirecionamento para a raiz (app anterior fora do ar)
 *   INTERNAL_IDENTIFIER_SCAN nenhum id interno (PS-*, RV-*, DS-*, EVC-*, source_id…) no que a produção serve
 *   CACHE_POLICY        HTML da raiz com Cache-Control no-cache (sem reuso heurístico da Home antiga)
 *   ELEICOES_HTML_MATCH  cada página de /eleicoes-2026/ servida == bytes do commit (Brasil, UFs, central, Q1–Q11)
 *   ELEICOES_ASSETS_COMPATIBLE cada CSS/JS local dessas páginas vem com ?v= e o arquivo servido nessa URL tem exatamente
 *                       esse sha256 — pega HTML de uma versão com CSS/JS de outra (P0 06/10/2026), não só HTTP 200
 *   FAVICON             /favicon.ico, /favicon.svg e /apple-touch-icon.png servidos == arquivos do commit, e a raiz os declara
 *   node public-ui/verify-production.mjs [--base https://desmentindo.com.br] [--retries 3]
 */
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findLeaks } from "./internal-ids.mjs";
import { assetProblems } from "./asset-versions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://desmentindo.com.br").replace(/\/$/, "");
const RETRIES = +arg("--retries", "3");
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const local = p => fs.readFileSync(path.join(ROOT, p));

async function get(p) {
  const r = await fetch(BASE + p + (p.includes("?") ? "&" : "?") + "cb=" + Date.now(), { headers: { "Cache-Control": "no-cache" } });
  return { status: r.status, body: Buffer.from(await r.arrayBuffer()), headers: Object.fromEntries(r.headers) };
}

function eleicoesPages(d = "eleicoes-2026", out = []) {
  for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const r = d + "/" + f.name;
    if (f.isDirectory()) eleicoesPages(r, out); else if (f.name === "index.html") out.push(r);
  }
  return out;
}

async function check() {
  const tmp = path.join(os.tmpdir(), "expected-root.html");
  execFileSync("node", [path.join(ROOT, "public-ui/build-root.mjs"), "--out", tmp, "--no-build-info"], { stdio: "pipe" });
  const expected = fs.readFileSync(tmp);
  const root = await get("/");
  const html = root.body.toString("utf8");
  const g = {};
  g.ROOT_UI_VERSION = root.status === 200 && /name="desmentindo-ui" content="v5"/.test(html) && !/const D ?= ?\{/.test(html);
  g.ROOT_VERSION_MATCH = sha(root.body) === sha(expected);
  const assets = {};
  for (const p of ["v5/js/v5.js", "v5/css/v5.css", "v5/css/fonts.css"]) {
    const r = await get("/" + p);
    assets[p] = r.status === 200 && sha(r.body) === sha(local(p));
  }
  g.ASSETS_MATCH = Object.values(assets).every(Boolean);
  const home = await get("/v5/data/home.json");
  const bi = await get("/v5/data/build-info.json");
  const info = bi.status === 200 ? JSON.parse(bi.body) : null;
  const m = /name="desmentindo-build" content="ui=([^;]+);data=([^;]+);edition=([^"]+)"/.exec(html) || [];
  g.DATA_MATCH = home.status === 200 && sha(home.body) === sha(local("v5/data/home.json")) && !!info &&
    info.data_build_id === m[2] && (!process.env.GITHUB_SHA || info.ui_commit === process.env.GITHUB_SHA);
  // no workspace do deploy o index.html já foi trocado pela raiz gerada: os dados aprovados vêm do commit (git)
  let src;
  try { src = execFileSync("git", ["show", "HEAD:index.html"], { cwd: ROOT, maxBuffer: 64 << 20 }).toString("utf8"); }
  catch { src = local("index.html").toString("utf8"); }
  const legacy = (/"atualizado"\s*:\s*"(\d{4}-\d{2}-\d{2})"/.exec(src) || [])[1] || null;
  // edição editorial aprovada (JSON próprio, data/editorial/index.json) deste commit — a mais recente das duas vale
  let editorial = null;
  try { editorial = JSON.parse(execFileSync("git", ["show", "HEAD:data/editorial/index.json"], { cwd: ROOT }).toString("utf8")).latest || null; }
  catch { try { editorial = JSON.parse(local("data/editorial/index.json").toString("utf8")).latest || null; } catch { editorial = null; } }
  const approved = legacy;
  const served = home.status === 200 ? JSON.parse(home.body).edition : null;
  // edição editorial: o índice servido tem de ser byte a byte o do commit, e a edição mais recente também
  let edLocal = null;
  try { edLocal = execFileSync("git", ["show", "HEAD:data/editorial/index.json"], { cwd: ROOT }); }
  catch { try { edLocal = local("data/editorial/index.json"); } catch { edLocal = null; } }
  let edOk = true, edServed = null;
  if (edLocal) {
    const ei = await get("/data/editorial/index.json");
    const idx = JSON.parse(edLocal.toString("utf8"));
    edServed = ei.status === 200 ? JSON.parse(ei.body).latest : null;
    edOk = ei.status === 200 && sha(ei.body) === sha(edLocal);
    if (idx.editions.length) {
      const f = await get("/" + idx.editions[0].file);
      edOk = edOk && f.status === 200 && sha(f.body) === idx.editions[0].sha256;
    }
  }
  g.DATA_FRESHNESS = !!served && served === approved && edOk;
  // INTERNAL_IDENTIFIER_SCAN: nada servido (raiz, JS, dados, edição editorial) pode carregar id interno — fail closed
  const scanned = [["/", root.body], ["/v5/js/v5.js", (await get("/v5/js/v5.js")).body], ["/v5/data/home.json", home.body]];
  if (edLocal) {
    const ei = await get("/data/editorial/index.json");
    scanned.push(["/data/editorial/index.json", ei.body]);
    const idx = JSON.parse(edLocal.toString("utf8"));
    for (const e of idx.editions.slice(0, 3)) scanned.push(["/" + e.file, (await get("/" + e.file)).body]);
  }
  const leaks = scanned.flatMap(([u, b]) => findLeaks(b.toString("utf8")).map(x => u + ": " + x));
  g.INTERNAL_IDENTIFIER_SCAN = leaks.length === 0;
  g.EDITORIAL_MATCH = edOk;
  // LEGACY_PUBLIC_APP_RETIRED: /desmentindo_local.html serve só o redirecionamento (nunca o app anterior com o `D`).
  const legacyApp = await get("/desmentindo_local.html");
  // LEGACY_V4_PUBLIC_PREVIEW_RETIRED: /v4/ = redirecionamento; os dados da prévia não são mais servidos.
  const v4 = await get("/v4/"), v4data = await get("/v4/data/afirmacoes.json");
  g.LEGACY_V4_PUBLIC_PREVIEW_RETIRED = v4.status === 200 && /name="desmentindo-legacy" content="retired-v4"/.test(v4.body) && v4data.status === 404;
  g.LEGACY_PUBLIC_APP_RETIRED = legacyApp.status === 200 && /name="desmentindo-legacy" content="retired"/.test(legacyApp.body) && !/const D ?= ?\{/.test(legacyApp.body);
  g.CACHE_POLICY = /no-cache/i.test(root.headers["cache-control"] || "");
  // FAVICON: ícone da marca (build-favicon.mjs) servido e declarado — sem ele o navegador mostra uma letra genérica
  const fav = {};
  for (const p of ["favicon.ico", "favicon.svg", "apple-touch-icon.png"]) { const r = await get("/" + p); fav[p] = r.status === 200 && sha(r.body) === sha(local(p)); }
  g.FAVICON = Object.values(fav).every(Boolean) && /<link rel="icon" href="\/favicon\.ico"/.test(html) && !/rel="icon" href="data:,"/.test(html);
  // Eleições 2026: HTML do commit + CSS/JS da MESMA versão (o navegador busca exatamente a URL ?v= que o HTML aponta)
  const eleicoes = { pages: 0, html_mismatch: [], asset_problems: [] }, assetCache = {};
  const servedAsset = async (p, v) => (assetCache[p + v] ??= get(p + "?v=" + v).then(r => r.status === 200 ? r.body : null));
  for (const rel of eleicoesPages()) {
    const r = await get("/" + rel.replace(/index\.html$/, ""));
    eleicoes.pages++;
    if (r.status !== 200 || sha(r.body) !== sha(local(rel))) { eleicoes.html_mismatch.push(rel); continue; }
    for (const x of await assetProblems(r.body.toString("utf8"), servedAsset)) eleicoes.asset_problems.push(rel + ": " + x);
  }
  g.ELEICOES_HTML_MATCH = eleicoes.pages > 0 && eleicoes.html_mismatch.length === 0;
  g.ELEICOES_ASSETS_COMPATIBLE = g.ELEICOES_HTML_MATCH && eleicoes.asset_problems.length === 0;
  return { base: BASE, gates: g, internal_id_leaks: leaks, assets, eleicoes, served_build: m.slice(1), build_info: info, data: { ROOT_DATA_EDITION: served, LATEST_APPROVED_DATA_EDITION: approved, EDITORIAL_EDITION_SERVED: edServed, EDITORIAL_EDITION_APPROVED: editorial },
           root_headers: { "cache-control": root.headers["cache-control"] || null, "last-modified": root.headers["last-modified"] || null, etag: root.headers.etag || null },
           root_sha256: sha(root.body), expected_sha256: sha(expected) };
}

let res;
for (let i = 1; i <= RETRIES; i++) {
  res = await check();
  if (Object.values(res.gates).every(Boolean)) break;
  if (i < RETRIES) await new Promise(r => setTimeout(r, 20000));
}
res.PRODUCTION_VERIFY = Object.values(res.gates).every(Boolean) ? "PASS" : "FAIL";
console.log(JSON.stringify(res, null, 1));
process.exit(res.PRODUCTION_VERIFY === "PASS" ? 0 : 1);
