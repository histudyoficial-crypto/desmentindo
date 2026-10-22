#!/usr/bin/env node
// Contrato do mapa por município: malha IBGE × arquivos municipais do TSE reunidos no build (eleicoes-2026/mapa/).
//   node public-ui/test-eleicoes-mun.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import assert from "node:assert/strict";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), DIR = path.join(ROOT, "eleicoes-2026", "mapa");
const J = f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
let n = 0; const t = (nome, f) => { f(); n++; console.log("ok " + nome); };
const svg = fs.readFileSync(path.join(DIR, "municipios-2025.svg"), "utf8"), fonte = J("municipios-2025.fonte.json");
const ids = [...svg.matchAll(/id="m(\d{7})"/g)].map(m => m[1]);

t("malha: SVG é o gerado da malha oficial (sha256 registrado na proveniência)", () =>
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(DIR, "municipios-2025.svg"))).digest("hex"), fonte.svg_sha256));
t("malha: 5.571 municípios com id único + 2 áreas operacionais como água (5.573 feições)", () => {
  assert.equal(ids.length, 5571); assert.equal(new Set(ids).size, 5571); assert.equal((svg.match(/class="agua"/g) || []).length, 2); assert.equal(fonte.feicoes, 5573);
  for (const c of ["2605459", "5101837", "5300108"]) assert.ok(ids.includes(c), c);
  for (const c of Object.keys(fonte.areas_sem_voto)) assert.ok(!ids.includes(c), c);
});
t("malha: tamanho dentro do orçamento (SVG ≤ 1,4 MB)", () => assert.ok(svg.length <= 1.4e6, svg.length));

for (const ele of ["6257", "6258"]) {
  const f = path.join(DIR, `presidente-${ele}.json`); if (!fs.existsSync(f)) { console.log(`-- presidente-${ele}.json ausente (turno sem arquivos municipais reunidos): a página mostra o estado “aguardando”`); continue; }
  const D = J(`presidente-${ele}.json`), M = D.m, ks = Object.keys(M);
  t(`${ele}: mesmos 5.571 municípios do SVG, nenhum do exterior, proveniência TSE`, () => {
    assert.equal(ks.length, 5571); assert.deepEqual([...ks].sort(), [...ids].sort()); assert.ok(ks.every(k => M[k][0] !== "zz"));
    assert.equal(D.fonte.orgao, "Tribunal Superior Eleitoral"); assert.ok(D.fonte.coleta && D.fonte.manifesto_sha256); assert.equal(D.fonte.com_arquivo + D.fonte.sem_arquivo.length, 5571);
  });
  t(`${ele}: candidatos na ordem da cédula`, () => { assert.ok(D.cands.length >= 2); D.cands.forEach((c, i) => i && assert.ok(c.seq > D.cands[i - 1].seq)); });
  t(`${ele}: sem arquivo → tudo nulo (nunca zero)`, () => { for (const k of D.fonte.sem_arquivo) assert.ok(M[k].slice(3).every(v => v === null), k); });
  const ufs = [...new Set(ks.map(k => M[k][0]))].sort(); let checados = 0, ident = 0;
  t(`${ele}: camadas = campos do arquivo municipal (detalhe por estado), líder e 2º pelos % oficiais`, () => {
    for (const uf of ufs) {
      const U = J(`presidente-${ele}-${uf}.json`);
      for (const [k, x] of Object.entries(U.m)) {
        const r = M[k]; assert.equal(r[0], uf);
        assert.deepEqual([r[3], r[4], r[5], r[6], r[7], r[8]], [x.s.pst, x.e.pc, x.e.pa, x.v.pvvc, x.v.pvb, x.v.ptvn], k);
        const ord = x.pvap.map((p, i) => [p, i]).filter(a => a[0] != null).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
        if (ord[0][0] === ord[1][0]) assert.equal(r[9], -1, k); else { assert.equal(r[9], ord[0][1], k); assert.equal(r[10], ord[0][0]); assert.equal(r[11], ord[1][1]); assert.equal(r[12], ord[1][0]); }
        if (x.e.esi != null && x.e.c != null && x.e.a != null) { ident++; assert.equal(x.e.c + x.e.a, x.e.esi, "esi = c + a em " + k); }   // identidade publicada pelo TSE
        checados++;
      }
    }
    assert.equal(checados, D.fonte.com_arquivo);
  });
  t(`${ele}: identidade oficial esi = comparecimento + abstenção conferida em todos os municípios com arquivo (${D.fonte.com_arquivo})`, () => assert.equal(ident, D.fonte.com_arquivo));
  t(`${ele}: arquivo parcial no TSE fica marcado (pst < 100), sem virar final`, () => { const p = ks.filter(k => M[k][3] != null && M[k][3] < 100); for (const k of p) assert.ok(M[k][3] > 0 && M[k][3] < 100); console.log(`   (${p.length} parciais)`); });
  t(`${ele}: tamanho do arquivo de camadas ≤ 600 KB`, () => assert.ok(fs.statSync(f).size <= 600e3));
}

// componente: funções puras (sem DOM)
const ctx = { window: {}, document: { querySelectorAll: () => [] } }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "eleicoes-2026", "eleicoes-mun.js"), "utf8"), ctx);
const EM = ctx.window.EleicoesMun;
t("componente: margem = 1º − 2º (p.p.), sem arquivo → null; camadas oficiais leem a coluna certa", () => {
  const r = ["sp", "71072", "X", 100, 80.1, 19.9, 95.5, 2.1, 2.4, 0, 51.25, 1, 40.5];
  assert.equal(EM.valor(r, "margem"), 10.75); assert.equal(EM.valor(r, "comp"), 80.1); assert.equal(EM.valor(r, "abst"), 19.9); assert.equal(EM.valor(r, "nulos"), 2.4);
  assert.equal(EM.valor(["sp", "1", "X", null, null, null, null, null, null, null, null, null, null], "comp"), null);
});
t("componente: quintis e classes (sem dado → -1)", () => { const q = EM.quintis([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); assert.equal(q.length, 4); assert.equal(EM.classe(null, q), -1); assert.equal(EM.classe(1, q), 0); assert.equal(EM.classe(10, q), 4); });
t("página: os dois turnos usam o MESMO componente (sem cópia), com o arquivo de dados do turno", () => {
  for (const [p, ele] of [["eleicoes-2026/index.html", "6257"], ["eleicoes-2026/2-turno/index.html", "6258"]]) {
    const h = fs.readFileSync(path.join(ROOT, p), "utf8"); assert.match(h, /<script src="\/eleicoes-2026\/eleicoes-mun\.js\?v=[0-9a-f]{12}" defer><\/script>/);
    assert.match(h, /class="area-mun mm" id="municipios"/); assert.match(h, /data-geo="\/eleicoes-2026\/mapa\/municipios-2025\.svg\?v=/);
    if (fs.existsSync(path.join(DIR, `presidente-${ele}.json`))) assert.match(h, new RegExp(`data-dados="/eleicoes-2026/mapa/presidente-${ele}\\.json\\?v=`)); else assert.match(h, /data-sem-dados="/);
  }
  const uf = fs.readFileSync(path.join(ROOT, "eleicoes-2026/sp/index.html"), "utf8"); assert.doesNotMatch(uf, /eleicoes-mun/);
});
console.log(`ELEICOES_MUN_TESTS ${n}/${n} OK`);
