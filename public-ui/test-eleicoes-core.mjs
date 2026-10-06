#!/usr/bin/env node
// Testes do núcleo do Eleições 2026 (estados explícitos, leitor de BU, linha do tempo sem interpolação).
//   node public-ui/test-eleicoes-core.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const C = createRequire(import.meta.url)(path.join(ROOT, "eleicoes-2026", "eleicoes-core.js"));
let n = 0;
const t = (nome, f) => { f(); n++; console.log("ok " + nome); };

const zona = [{ ns: "0139", nsa: ["0465"], da: "04/10/2026", ha: "20:50:59" }, { ns: "0465" },
  { ns: "0292", da: "04/10/2026", ha: "19:59:00" }, { ns: "0001" }];
const aux = tps => ({ status: 200, json: { hashes: [{ hash: "ab", arq: tps.map(tp => ({ tp, nm: "x-" + tp })) }] } });
const E = (s, a, x) => C.secaoEstado(s, zona, a, x).estado;

t("agregada nunca vira 'não publicou' (nem com 404)", () => assert.equal(E(zona[1], { status: 404 }), "AGREGADA"));
t("agregada aponta a principal", () => assert.equal(C.secaoEstado(zona[1], zona, { status: 404 }).principal, "0139"));
t("BU publicado", () => assert.equal(E(zona[0], aux(["bu", "log", "rdv", "vota"])), "PUBLICADO"));
t("conferido só com dado de conferência", () => assert.equal(E(zona[0], aux(["bu"]), { conferido: true }), "CONFERIDO"));
t("Sistema de Apuração (busa)", () => assert.equal(E(zona[0], aux(["busa", "sa", "rdv"])), "APURACAO"));
t("fonte incompleta (aux sem bu/busa)", () => assert.equal(E(zona[0], aux(["log", "rdv", "vota"])), "INCOMPLETA"));
t("404 com da/ha = arquivo gerado, indisponível (NoSuchKey no detalhe)", () => {
  const r = C.secaoEstado(zona[2], zona, { status: 404, corpo: "<Error><Code>NoSuchKey</Code></Error>" });
  assert.equal(r.estado, "INDISPONIVEL"); assert.match(r.tecnico, /NoSuchKey/); assert.match(r.texto, /ACOMPANHANDO/); assert.doesNotMatch(r.texto, /fraude|suspeit|erro na vota/i);
});
t("404 sem da/ha = pendente", () => assert.equal(E(zona[3], { status: 404 }), "PENDENTE"));
t("403 = consulta recusada (não 'não publicou')", () => assert.equal(E(zona[3], { status: 403 }), "RECUSADA"));
t("429 = consulta recusada", () => assert.equal(E(zona[2], { status: 429 }), "RECUSADA"));
t("rede = consulta não concluída", () => assert.equal(E(zona[3], { status: null, erro: "TypeError" }), "NAO_CONCLUIDA"));
t("5xx = consulta não concluída", () => assert.equal(E(zona[3], { status: 503 }), "NAO_CONCLUIDA"));
t("200 ilegível", () => assert.equal(E(zona[3], { status: 200, json: {} }), "ILEGIVEL"));
// design v3: cada classe de estado tem marca própria no CSS (glifo), e arquivo ilegível ≠ problema de consulta
t("estados: classe com glifo próprio; ilegível separado da consulta", () => {
  const css = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "eleicoes.css"), "utf8");
  for (const c of new Set(Object.values(C.ESTADOS).map(e => e.classe))) assert.ok(new RegExp("\\.e-" + c + " \\.enome::before").test(css), "sem glifo: " + c);
  assert.notStrictEqual(C.ESTADOS.ILEGIVEL.classe, C.ESTADOS.RECUSADA.classe); assert.strictEqual(C.ESTADOS.RECUSADA.classe, C.ESTADOS.NAO_CONCLUIDA.classe);
});
t("todo estado tem nome curto, texto e classe", () => Object.values(C.ESTADOS).forEach(e => { assert.ok(e.nome.length < 40); assert.ok(e.texto.length > 30); assert.ok(e.classe); }));
t("cadastro: agregada / gerado / pendente", () => {
  assert.equal(C.estadoCadastro(zona[1], zona).estado, "AGREGADA");
  assert.equal(C.estadoCadastro(zona[2], zona).estado, "GERADO");
  assert.equal(C.estadoCadastro(zona[3], zona).estado, "PENDENTE");
});
t("leitor de BU: seção real AL/27855/0001/0447 (1º turno)", () => {
  const b = fs.readFileSync(path.join(ROOT, "public-ui", "fixtures", "o03220al2785500010447-bu.dat"));
  const d = C.decodeBU(new Uint8Array(b), 6257);
  assert.equal(d.municipio, 27855); assert.equal(d.zona, 1); assert.equal(d.secao, 447);
  assert.equal(d.aptos, 443); assert.equal(d.comparecimento, 363); assert.equal(d.confere, true);
  assert.deepEqual(d.votos, { 13: 144, 14: 16, 22: 183, 30: 1, 55: 2, 70: 10, branco: 5, nulo: 2 });
});
t("leitor de BU: eleição errada ou bytes corrompidos → null (nada mostrado)", () => {
  const b = fs.readFileSync(path.join(ROOT, "public-ui", "fixtures", "o03220al2785500010447-bu.dat"));
  assert.equal(C.decodeBU(new Uint8Array(b), 6258), null);
  assert.equal(C.decodeBU(new Uint8Array(b.subarray(0, 300)), 6257), null);
  assert.equal(C.decodeBU(new Uint8Array([1, 2, 3]), 6257), null);
});
t("linha do tempo: lacuna > limite, nenhuma interpolação", () => {
  const h = 3600e3, p = [{ t: 0 }, { t: 0.5 * h }, { t: 2.4 * h }, { t: 3 * h }];
  assert.deepEqual(C.lacunas(p, 1.1 * h), [{ de: 0.5 * h, ate: 2.4 * h, ms: 1.9 * h }]);
});
console.log(`ELEICOES_CORE_TESTS ${n}/${n} OK`);
