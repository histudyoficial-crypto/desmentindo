#!/usr/bin/env node
// Eleições 2026 · dados do mapa municipal, gerados de arquivos OFICIAIS do TSE já baixados (resultado por município,
// cargo Presidente). Determinístico: mesma entrada → mesmo arquivo. Nada é estimado: campo ausente → null ("—" na tela).
// Contrato (falha fechado, exit 2): cada município do TSE com código IBGE (cdi) tem polígono no SVG da malha; nenhum
// polígono de município sem par; o exterior não entra no mapa; cdi único.
//   node public-ui/build-eleicoes-mun.mjs --dados <dir com …/dados/<uf>/<uf><cd>-c0001-e<ele>-u.json> --cm <mun-e<ele>-cm.json>
//        --ele 6257 --fonte <run.json do coletor> [--manifest <manifest.jsonl.gz>] [--check]
// Saída: eleicoes-2026/mapa/presidente-<ele>.json (camadas, carregado com o mapa) e presidente-<ele>-<uf>.json (detalhe por
// estado, carregado só quando um município do estado é aberto).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "eleicoes-2026", "mapa");
const A = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? acc.concat([[v.slice(2), a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : true]]) : acc), []));
const ELE = String(A.ele || ""); if (!/^\d{4}$/.test(ELE)) { console.error("uso: --ele 6257|6258 …"); process.exit(1); }
const ELE6 = ("000000" + ELE).slice(-6);
const SVG = fs.readFileSync(path.join(OUT, "municipios-2025.svg"), "utf8");
const POLI = new Set([...SVG.matchAll(/id="m(\d{7})"/g)].map(m => m[1]));
const fail = m => { console.error("MUN_CONTRATO_FALHOU: " + m); process.exit(2); };

const int = s => (s == null || String(s).trim() === "" ? null : /^\d+$/.test(String(s).replace(/\./g, "")) ? parseInt(String(s).replace(/\./g, ""), 10) : null);
const pct = s => { if (s == null || String(s).trim() === "") return null; const f = parseFloat(String(s).replace(/\./g, "").replace(",", ".")); return isNaN(f) ? null : f; };

// arquivos: aceita o nome do TSE puro ou com sufixo "@<hash>" do acervo bruto
const files = {};
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p);
  else { const m = new RegExp(`^([a-z]{2})(\\d{5})-c0001-e${ELE6}-u\\.json(@[0-9a-f]+)?$`).exec(f.name); if (m) files[m[1] + m[2]] = p; } } })(A.dados);

const cm = JSON.parse(fs.readFileSync(A.cm, "utf8")), muns = [];
for (const a of cm.abr || []) for (const m of a.mu || []) muns.push({ uf: a.cd, cd: m.cd, cdi: m.cdi || null, nm: m.nm });
const dom = muns.filter(m => m.uf !== "zz");
if (muns.some(m => m.uf === "zz" && m.cdi)) fail("município do exterior com cdi");
const cdis = dom.map(m => m.cdi);
if (cdis.some(c => !/^\d{7}$/.test(c || ""))) fail("município sem cdi de 7 dígitos");
if (new Set(cdis).size !== cdis.length) fail("cdi repetido no TSE");
const semPoli = dom.filter(m => !POLI.has(m.cdi)); if (semPoli.length) fail("sem polígono: " + semPoli.slice(0, 5).map(m => m.cdi).join(","));
const set = new Set(cdis), sobra = [...POLI].filter(c => !set.has(c)); if (sobra.length) fail("polígono de município sem par no TSE: " + sobra.join(","));

// candidatos na ordem da cédula (seq), do arquivo nacional quando houver, senão do primeiro municipal
let cands = null, semArquivo = [], porUF = {}, camadas = {};
for (const m of dom) {
  const f = files[m.uf + m.cd]; if (!f) { semArquivo.push(m.cdi); camadas[m.cdi] = [m.uf, m.cd, m.nm, null, null, null, null, null, null, null, null, null, null]; continue; }
  const d = JSON.parse(fs.readFileSync(f, "utf8")), e = d.e || {}, v = d.v || {};
  const cs = []; for (const cg of d.carg || []) for (const ag of cg.agr || []) for (const pa of ag.par || []) for (const c of pa.cand || []) cs.push(c);
  if (!cands) cands = cs.map(c => ({ n: c.n, nm: c.nmu || c.nm, seq: int(c.seq) })).sort((a, b) => a.seq - b.seq);
  const idx = Object.fromEntries(cands.map((c, i) => [c.n, i]));
  const vap = cands.map(() => null), pvap = cands.map(() => null);
  for (const c of cs) { if (!(c.n in idx)) fail(`candidato ${c.n} fora da lista em ${m.uf}${m.cd}`); vap[idx[c.n]] = int(c.vap); pvap[idx[c.n]] = pct(c.pvap); }
  const ord = pvap.map((p, i) => [p, i]).filter(x => x[0] != null).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const li = ord.length ? ord[0][1] : null, si = ord.length > 1 ? ord[1][1] : null, tie = ord.length > 1 && ord[0][0] === ord[1][0];
  const pst = pct((d.s || {}).pst);
  // camadas: [uf, cdTSE, nome, pst, pc, pa, pvvc, pvb, ptvn, líder (índice; -1 = empate), % líder, 2º (índice), % 2º]
  camadas[m.cdi] = [m.uf, m.cd, m.nm, pst, pct(e.pc), pct(e.pa), pct(v.pvvc), pct(v.pvb), pct(v.ptvn), li == null ? null : tie ? -1 : li, li == null ? null : pvap[li], si, si == null ? null : pvap[si]];
  (porUF[m.uf] ||= {})[m.cdi] = { dg: d.dg || null, hg: d.hg || null, tf: d.tf || null, s: { ts: int((d.s || {}).ts), st: int((d.s || {}).st), pst },
    e: { te: int(e.te), esi: int(e.esi), esni: int(e.esni), esnt: int(e.esnt), c: int(e.c), pc: pct(e.pc), a: int(e.a), pa: pct(e.pa) },
    v: { vv: int(v.vv), pvvc: pct(v.pvvc), vb: int(v.vb), pvb: pct(v.pvb), tvn: int(v.tvn), ptvn: pct(v.ptvn) }, vap, pvap };
}
if (!cands) fail("nenhum arquivo municipal encontrado");
const run = A.fonte ? JSON.parse(fs.readFileSync(A.fonte, "utf8")) : {};
const man = A.manifest ? crypto.createHash("sha256").update(fs.readFileSync(A.manifest)).digest("hex") : null;
const fonte = { orgao: "Tribunal Superior Eleitoral", arquivos: "resultados.tse.jus.br/oficial/ele2026/" + ELE + "/dados/<uf>/<uf><município>-c0001-e" + ELE6 + "-u.json",
  coleta: run.run_id || null, coletado_em: run.started_at || null, manifesto_sha256: man, municipios: dom.length, com_arquivo: dom.length - semArquivo.length, sem_arquivo: semArquivo };
const main = { v: 1, ele: ELE, turno: ELE === "6258" ? 2 : 1, cargo: "Presidente", fonte, cands, m: camadas };
const outs = { [`presidente-${ELE}.json`]: JSON.stringify(main) };
for (const uf of Object.keys(porUF).sort()) outs[`presidente-${ELE}-${uf}.json`] = JSON.stringify({ v: 1, ele: ELE, uf, cands, fonte: { coleta: fonte.coleta }, m: porUF[uf] });
let bad = 0;
for (const [n, s] of Object.entries(outs)) {
  const p = path.join(OUT, n);
  if (A.check) { if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== s) { console.error("DESATUALIZADO: " + n); bad++; } } else fs.writeFileSync(p, s);
}
if (A.check) { if (bad) process.exit(1); console.log(`ELEICOES_MUN_OK (${Object.keys(outs).length} arquivos)`); }
else console.log(`ELEICOES_MUN_WRITTEN ele=${ELE} municipios=${dom.length} com_arquivo=${fonte.com_arquivo} sem_arquivo=${semArquivo.length} principal=${outs[`presidente-${ELE}.json`].length}B gzip=${zlib.gzipSync(outs[`presidente-${ELE}.json`]).length}B`);
