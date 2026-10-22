#!/usr/bin/env node
// Estudos E26 (LATE15 · H23 · boletins) nas páginas dos questionamentos: cada gate é independente e fecha por padrão.
// Os dados usados aqui são SINTÉTICOS de teste (estrutura do contrato, números inventados) e nunca vão para página nenhuma.
//   node public-ui/test-eleicoes-estudos.mjs
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { aplicarEstudos, ESTUDOS, moduloBU } from "./eleicoes-estudos.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let n = 0; const t = (nome, f) => { f(); n++; console.log("ok " + nome); };
const FLAGS = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_flags.json"), "utf8"));
const PAG = slug => `<html><head></head><body><main><section class="qsec " id="dados"></section><section class="qsec " id="explica"><h2>x</h2></section></main><!-- ${slug} --></body></html>`;
const files = () => Object.fromEntries(ESTUDOS.map(e => [`eleicoes-2026/questionamentos/${e.slug}/index.html`, PAG(e.slug)]));
const ok = { ativo: true, estado: "APPROVED", decision_ref: "DECISIONS#teste" };
const BU = { universo_total: 10, universo: [{ rotulo: "a", n: 7 }, { rotulo: "b", n: 3 }], universo_texto: "teste", cobertura: [{ rotulo: "a", n: 7, base: "x" }], conferencia_texto: "teste",
  posicoes: [{ rotulo: "p", mun: 1, mun_total: 1, uf: 1, uf_total: 1, sem_explicacao: 0 }], diferencas: [], metodologia: "teste", limites: ["teste"], fontes: [{ nome: "TSE", url: "https://www.tse.jus.br/" }],
  story: { url: "/eleicoes-2026/questionamentos/boletins-de-urna-batem-com-resultado/", titulo: "teste" } };

t("repositório: os três gates existem e estão INATIVOS", () => { for (const id of ["late15", "h23", "bu"]) { const g = FLAGS.estudos[id]; assert.equal(g.ativo, false); assert.notEqual(g.estado, "APPROVED"); assert.equal(g.decision_ref, null); } });
t("repositório: nenhum arquivo de dados de estudo antes da aprovação", () => assert.ok(!fs.existsSync(path.join(ROOT, "public-ui", "eleicoes_estudos")) || fs.readdirSync(path.join(ROOT, "public-ui", "eleicoes_estudos")).length === 0));
t("gate fechado (como no repositório): páginas idênticas", () => { const f = files(), f0 = { ...f }; assert.deepEqual(aplicarEstudos(f, FLAGS.estudos, { bu: BU }, "/x.css"), []); assert.deepEqual(f, f0); });
t("sem decision_ref, ou estado diferente de APPROVED: nada entra", () => {
  for (const g of [{ ...ok, decision_ref: null }, { ...ok, estado: "READY TO PUBLISH" }, { ...ok, ativo: false }]) { const f = files(); assert.deepEqual(aplicarEstudos(f, { bu: g }, { bu: BU }, "/x.css"), []); }
});
t("gate aprovado sem arquivo de dados: nada entra", () => { const f = files(); assert.deepEqual(aplicarEstudos(f, { bu: ok }, { bu: null }, "/x.css"), []); });
t("um gate aprovado não abre os outros; módulo entra antes de #explica, com CSS", () => {
  const f = files(), feito = aplicarEstudos(f, { bu: ok, late15: { ...ok, ativo: false } }, { bu: BU, late15: {} }, "/eleicoes-2026/eleicoes-estudos.css?v=1");
  assert.deepEqual(feito, ["bu"]); const h = f["eleicoes-2026/questionamentos/boletins-de-urna-batem-com-resultado/index.html"];
  assert.ok(h.indexOf('id="estudo-boletins"') < h.indexOf('id="explica"')); assert.match(h, /eleicoes-estudos\.css\?v=1/);
  assert.equal(f["eleicoes-2026/questionamentos/por-que-nordeste-chega-mais-tarde/index.html"], PAG("por-que-nordeste-chega-mais-tarde"));
});
t("linguagem pública: palavra proibida derruba o build", () => assert.throws(() => moduloBU({ ...BU, metodologia: "uma auditoria" }), /PALAVRA_PROIBIDA/));
t("universo que não fecha derruba o build", () => assert.throws(() => moduloBU({ ...BU, universo_total: 11 }), /NAO_FECHA/));
t("páginas reais do build: nenhum módulo inserido com os gates do repositório", () => {
  for (const e of ESTUDOS) assert.doesNotMatch(fs.readFileSync(path.join(ROOT, "eleicoes-2026/questionamentos", e.slug, "index.html"), "utf8"), /mod-e26|eleicoes-estudos\.css/);
});
console.log(`ELEICOES_ESTUDOS_TESTS ${n}/${n} OK`);
