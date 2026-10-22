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
// 2º turno: diferença de UM registro; dado ausente nunca vira zero
t("diferença: votos e p.p. do mesmo registro, ordem pelos votos", () => {
  const d = C.diferenca([{ candidate_id: "b", candidate_name: "B", votes: 900, percentage: 47.37 }, { candidate_id: "a", candidate_name: "A", votes: 1000, percentage: 52.63 }]);
  assert.equal(d.a.candidate_id, "a"); assert.equal(d.votes, 100); assert.equal(d.pp, 5.26); assert.equal(d.tie, false);
});
t("diferença: número ausente → null (não zero)", () => {
  assert.equal(C.diferenca([{ votes: 10, percentage: 50 }, { votes: null, percentage: 50 }]), null);
  assert.equal(C.diferenca([{ votes: 10, percentage: 100 }]), null); assert.equal(C.diferenca(null), null);
});
t("diferença: empate explícito", () => assert.equal(C.diferenca([{ votes: 5, percentage: 50 }, { votes: 5, percentage: 50 }]).tie, true));

// Participação: denominadores = campos oficiais do TSE (pc/pa sobre esi, o eleitorado apurado; não sobre te, os aptos).
const fx = f => JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "fixtures", f), "utf8"));
t("participação 1T BR final: campos oficiais, 423 em seções não instaladas", () => {
  const d = fx("tse-1t-br-participacao.json"), P = C.participacao(d.e, d.v);
  assert.equal(P.aptos, 158745502); assert.equal(P.apurado, 158745079); assert.equal(P.naoInstalado, 423); assert.equal(P.naoTotalizado, 0);
  assert.deepEqual(P.comparecimento, { v: 125275835, p: 78.92 }); assert.deepEqual(P.abstencao, { v: 33469244, p: 21.08 });
  assert.deepEqual(P.validos, { v: 119300788, p: 95.23 }); assert.deepEqual(P.brancos, { v: 2300798, p: 1.84 }); assert.deepEqual(P.nulos, { v: 3674249, p: 2.93 });
  // identidades publicadas pelo próprio TSE (conferência, não substituição): esi = c + a; pcn = c/esi (não c/te)
  assert.equal(P.comparecimento.v + P.abstencao.v, P.apurado);
  assert.equal(Math.abs(parseFloat(d.e.pcn.replace(",", ".")) - 100 * P.comparecimento.v / P.apurado) < 1e-6, true);
  assert.notEqual((100 * P.comparecimento.v / P.aptos).toFixed(9), d.e.pcn.replace(",", "."));
});
t("participação parcial (ba33693): eleitorado não totalizado fica fora do denominador", () => {
  const d = fx("tse-1t-ba33693-parcial-participacao.json"), P = C.participacao(d.e, d.v);
  assert.equal(P.aptos, 15726); assert.equal(P.apurado, 14496); assert.equal(P.naoTotalizado, 1230); assert.equal(P.naoInstalado, 0);
  assert.deepEqual(P.comparecimento, { v: 11566, p: 79.79 }); assert.deepEqual(P.abstencao, { v: 2930, p: 20.21 });
});
t("participação sem arquivo: tudo desconhecido (null), nunca zero", () => {
  const P = C.participacao(null, null);
  assert.equal(P.aptos, null); assert.equal(P.apurado, null); assert.equal(P.naoInstalado, null);
  assert.deepEqual(P.comparecimento, { v: null, p: null }); assert.deepEqual(P.nulos, { v: null, p: null });
});
t("participação: campo ausente continua null (sem conta implícita)", () => {
  const P = C.participacao({ te: "100", c: "80", a: "20" }, {});
  assert.equal(P.apurado, null); assert.equal(P.comparecimento.p, null); assert.equal(P.abstencao.p, null);
});
console.log(`ELEICOES_CORE_TESTS ${n}/${n} OK`);
