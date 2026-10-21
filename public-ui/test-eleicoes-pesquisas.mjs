#!/usr/bin/env node
// Pesquisas do 2º turno: Human Gate obrigatório, registro PesqEle, publicação original, nada de erro antes do resultado.
//   node public-ui/test-eleicoes-pesquisas.mjs
import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict";
import { validate, validos, section } from "./eleicoes-pesquisas.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_pesquisas_2t.json"), "utf8"));
let n = 0; const t = (m, f) => { f(); n++; console.log("ok " + m); };
const P = o => Object.assign({ instituto: "Datafolha", modalidade: null, registro_pesqele: "BR-01234/2026", url_original: "https://exemplo.org/p", campo_inicio: "2026-10-20",
  campo_fim: "2026-10-21", divulgacao: "2026-10-22", votos_totais: { A: 45, B: 43 }, branco_nulo: 7, indecisos: 5, aprovado: true, decision_ref: "github:#1" }, o);
const W = ps => Object.assign({}, D, { pesquisas: ps });
t("arquivo versionado é válido", () => assert.deepEqual(validate(D), []));
t("15 institutos, Quaest separado por modalidade", () => { assert.equal(D.institutos.length, 15); assert.equal(D.institutos.filter(i => i.instituto === "Quaest").length, 2); });
t("sem Human Gate falha", () => assert.match(validate(W([P({ aprovado: false })])).join(), /PESQUISA_SEM_HUMAN_GATE/));
t("sem decision_ref falha", () => assert.match(validate(W([P({ decision_ref: "" })])).join(), /PESQUISA_SEM_HUMAN_GATE/));
t("registro PesqEle inválido falha", () => assert.match(validate(W([P({ registro_pesqele: "BR-1/2026" })])).join(), /REGISTRO_PESQELE_INVALIDO/));
t("instituto fora da lista normalizada falha", () => assert.match(validate(W([P({ instituto: "Quaest", modalidade: "outra" })])).join(), /INSTITUTO_NAO_NORMALIZADO/));
t("divulgada depois de 24/10 falha", () => assert.match(validate(W([P({ divulgacao: "2026-10-25" })])).join(), /DIVULGADA_DEPOIS/));
t("erro do 2º turno antes do resultado falha", () => assert.match(validate(W([P({ erro_2t: 1.2 })])).join(), /ERRO_2T_ANTES/));
t("válidos calculados sem redistribuir", () => assert.deepEqual(validos(P({})).v, { A: 51.1, B: 48.9 }));
t("válidos publicados pela fonte prevalecem", () => assert.deepEqual(validos(P({ votos_validos: { A: 52, B: 48 } })), { v: { A: 52, B: 48 }, calc: false }));
t("dado ausente nos totais → válidos null (não zero)", () => assert.equal(validos(P({ votos_totais: { A: 45, B: null } })).v, null));
t("desligada: só explicação, nenhum número", () => assert.doesNotMatch(section(W([P({})]), false), /\d+,\d%/));
t("ligada: instituto sem pesquisa = 'Sem nova pesquisa confirmada nesta semana'", () => {
  const h = section(W([P({})]), true);
  assert.equal((h.match(/Sem nova pesquisa confirmada nesta semana/g) || []).length, 14); assert.match(h, /BR-01234\/2026/); assert.match(h, /51,1%<small>calculado/);
});
t("ligada sem nenhuma pesquisa: nada inventado", () => assert.equal((section(W([]), true).match(/Sem nova pesquisa confirmada/g) || []).length, 15));
console.log(`ELEICOES_PESQUISAS_TESTS ${n}/${n} OK`);
