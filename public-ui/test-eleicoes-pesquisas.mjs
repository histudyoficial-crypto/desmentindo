#!/usr/bin/env node
// Pesquisas do 2º turno: Human Gate obrigatório, registro PesqEle, publicação original, janela 16–25/10, nada de erro antes
// do resultado, linha do tempo só com pontos nas datas reais (nada entre elas) e a referência de 2022 separada.
// Pesquisas daqui são SINTÉTICAS (dados de teste); o arquivo versionado não tem nenhuma pesquisa aprovada.
//   node public-ui/test-eleicoes-pesquisas.mjs
import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict";
import { validate, validos, section } from "./eleicoes-pesquisas.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_pesquisas_2t.json"), "utf8"));
const HIST = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_historico.json"), "utf8"));
let n = 0; const t = (m, f) => { f(); n++; console.log("ok " + m); };
const P = o => Object.assign({ instituto: "Datafolha", modalidade: null, registro_pesqele: "BR-01234/2026", url_original: "https://exemplo.org/p", campo_inicio: "2026-10-20",
  campo_fim: "2026-10-21", divulgacao: "2026-10-22", votos_totais: { A: 45, B: 43 }, branco_nulo: 7, indecisos: 5, margem_pp: 2, aprovado: true, decision_ref: "github:#1" }, o);
const W = (ps, extra) => Object.assign({}, D, { pesquisas: ps, atualizado_editorial_em: ps.length ? "2026-10-23" : null }, extra);
const pontos = h => (h.match(/<g class="pt"/g) || []).length;

t("arquivo versionado é válido e não tem nenhuma pesquisa", () => { assert.deepEqual(validate(D), []); assert.equal(D.pesquisas.length, 0); assert.equal(D.atualizado_editorial_em, null); });
t("janela principal = 16 a 25/10/2026, inclusive", () => assert.deepEqual(D.janela, { de: "2026-10-16", ate: "2026-10-25" }));
t("15 institutos, Quaest separado por modalidade", () => { assert.equal(D.institutos.length, 15); assert.equal(D.institutos.filter(i => i.instituto === "Quaest").length, 2); });
t("referência 2022: 2º turno igual ao histórico oficial já conferido; 1º turno com fonte e hash", () => {
  const r2 = D.referencia_2022.resultados_oficiais.find(r => r.data === "2022-10-30"), h = HIST.eleicoes.find(e => e.id === "2022-2t");
  assert.deepEqual(r2.candidatos.map(c => [c.nome, c.votos, c.pct_validos]), h.candidatos.map(c => [c.nome, c.votos, c.pct_validos]));
  const r1 = D.referencia_2022.resultados_oficiais.find(r => r.data === "2022-10-02");
  assert.ok(/^[0-9a-f]{64}$/.test(r1.sha256) && /^https:\/\/cdn\.tse\.jus\.br\//.test(r1.fonte_url));
  assert.equal(D.referencia_2022.pesquisas.length, 0);
});
t("sem Human Gate falha", () => assert.match(validate(W([P({ aprovado: false })])).join(), /PESQUISA_SEM_HUMAN_GATE/));
t("sem decision_ref falha", () => assert.match(validate(W([P({ decision_ref: "" })])).join(), /PESQUISA_SEM_HUMAN_GATE/));
t("registro PesqEle inválido falha", () => assert.match(validate(W([P({ registro_pesqele: "BR-1/2026" })])).join(), /REGISTRO_PESQELE_INVALIDO/));
t("instituto fora da lista normalizada falha", () => assert.match(validate(W([P({ instituto: "Quaest", modalidade: "outra" })])).join(), /INSTITUTO_NAO_NORMALIZADO/));
t("divulgada depois de 25/10 falha; 25/10 passa", () => { assert.match(validate(W([P({ divulgacao: "2026-10-26" })])).join(), /DIVULGADA_DEPOIS_DA_JANELA/); assert.deepEqual(validate(W([P({ campo_fim: "2026-10-24", divulgacao: "2026-10-25" })])), []); });
t("antes da janela só como contexto marcado", () => {
  assert.match(validate(W([P({ campo_inicio: "2026-10-12", campo_fim: "2026-10-14", divulgacao: "2026-10-15" })])).join(), /FORA_DA_JANELA_SEM_MARCA/);
  assert.deepEqual(validate(W([P({ campo_inicio: "2026-10-12", campo_fim: "2026-10-14", divulgacao: "2026-10-15", contexto: true })])), []);
});
t("hora de publicação tem de ser do mesmo dia da divulgação", () => { assert.match(validate(W([P({ publicado_em: "2026-10-23T10:00:00-03:00" })])).join(), /HORA_DE_PUBLICACAO_INVALIDA/); assert.deepEqual(validate(W([P({ publicado_em: "2026-10-22T19:05:00-03:00" })])), []); });
t("documento sem https ou com hash malformado falha", () => assert.match(validate(W([P({ documentos: [{ url: "http://x", sha256: "abc" }] })])).join(), /DOCUMENTO_INVALIDO/));
t("pesquisa aprovada exige horário da atualização editorial", () => assert.match(validate(Object.assign({}, D, { pesquisas: [P({})] })).join(), /SEM_HORARIO_DA_ATUALIZACAO_EDITORIAL/));
t("2022 também só com Human Gate", () => assert.match(validate(Object.assign({}, D, { referencia_2022: { ...D.referencia_2022, pesquisas: [P({ registro_pesqele: "BR-01234/2022", campo_inicio: "2022-10-20", campo_fim: "2022-10-21", divulgacao: "2022-10-22", aprovado: false })] } })).join(), /PESQUISA_SEM_HUMAN_GATE/));
t("erro do 2º turno antes do resultado falha", () => assert.match(validate(W([P({ erro_2t: 1.2 })])).join(), /ERRO_2T_ANTES/));
t("válidos calculados sem redistribuir", () => assert.deepEqual(validos(P({})).v, { A: 51.1, B: 48.9 }));
t("válidos publicados pela fonte prevalecem", () => assert.deepEqual(validos(P({ votos_validos: { A: 52, B: 48 } })), { v: { A: 52, B: 48 }, calc: false }));
t("dado ausente nos totais → válidos null (não zero)", () => assert.equal(validos(P({ votos_totais: { A: 45, B: null } })).v, null));
t("desligada: só explicação, nenhum número", () => { const h = section(W([P({})]), false); assert.doesNotMatch(h, /\d+,\d%/); assert.match(h, /16\/10 a 25\/10/); assert.doesNotMatch(h, /pq-dados/); });
t("ligada sem nenhuma pesquisa: nada inventado, sem ponto, sem tabela", () => { const h = section(W([]), true); assert.equal(pontos(h), 0); assert.match(h, /Nenhuma pesquisa aprovada na janela/); assert.doesNotMatch(h, /<table><thead><tr><th scope="col">Instituto<\/th><th scope="col">Registro/); });
t("ligada: um ponto por pesquisa e candidato, na data real; nada desenhado entre datas", () => {
  const h = section(W([P({}), P({ instituto: "Nexus", registro_pesqele: "BR-04321/2026", divulgacao: "2026-10-19", campo_fim: "2026-10-18", campo_inicio: "2026-10-16" })]), true);
  assert.equal(pontos(h), 2 * 2 * 2);   // 2 pesquisas × 2 candidatos × (válidos e totais)
  assert.doesNotMatch(h, /<polyline|<path /);
  assert.match(h, /aria-label="Nexus, publicada em 19\/10/);
});
t("ligada: pesquisa não aprovada não aparece nem na tabela nem nos dados", () => { const h = section(W([P({}), P({ registro_pesqele: "BR-09999/2026", aprovado: false })]), true); assert.doesNotMatch(h, /BR-09999/); });
t("ligada: filtros, horário de sincronização e da atualização editorial, sem rotular registro como divulgação", () => {
  const h = section(W([P({})]), true);
  for (const k of ['name="voto"', 'name="inst"', 'name="de"', 'name="ate"', 'name="metodo"', 'name="reg"']) assert.ok(h.includes(k), k);
  assert.match(h, /sincronizados em <b>23\/10 02h13 \(UTC\)/); assert.match(h, /Última atualização editorial: <b>23\/10/);
  assert.match(h, /Sincronizar registros não é divulgar pesquisa/);
});
t("ligada: institutos sem pesquisa aprovada listados; válido calculado marcado", () => { const h = section(W([P({})]), true); assert.match(h, /Sem pesquisa aprovada na janela: Veritá/); assert.match(h, /51,1%<small>calculado/); });
t("ligada: referência 2022 separada, com resultado oficial e sem pesquisa não aprovada", () => { const h = section(W([P({})]), true); assert.match(h, /class="pq-ref"/); assert.match(h, /60\.345\.999/); assert.match(h, /ainda em conferência/); });
t("prévia interna só com opção explícita", () => { assert.doesNotMatch(section(W([P({})]), true), /PRÉVIA INTERNA/); assert.match(section(W([P({ aprovado: false, estado_editorial: "BLOCKED" })]), true, { previa: true }), /PRÉVIA INTERNA[\s\S]*Bloqueada/); });
console.log(`ELEICOES_PESQUISAS_TESTS ${n}/${n} OK`);
