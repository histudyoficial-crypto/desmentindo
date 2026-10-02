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
 *   CACHE_POLICY        HTML da raiz com Cache-Control no-cache (sem reuso heurístico da Home antiga)
 *   node public-ui/verify-production.mjs [--base https://desmentindo.com.br] [--retries 3]
 */
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  g.EDITORIAL_MATCH = edOk;
  g.CACHE_POLICY = /no-cache/i.test(root.headers["cache-control"] || "");
  return { base: BASE, gates: g, assets, served_build: m.slice(1), build_info: info, data: { ROOT_DATA_EDITION: served, LATEST_APPROVED_DATA_EDITION: approved, EDITORIAL_EDITION_SERVED: edServed, EDITORIAL_EDITION_APPROVED: editorial },
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
