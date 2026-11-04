#!/usr/bin/env node
// Estudos E26 (LATE15 · H23 · boletins) nas páginas dos questionamentos: cada gate é independente e fecha por padrão.
// Os dados usados aqui são SINTÉTICOS de teste (estrutura do contrato, números inventados) e nunca vão para página nenhuma.
//   node public-ui/test-eleicoes-estudos.mjs
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { aplicarEstudos, ESTUDOS, moduloBU, moduloH23, validarEstudo, gateAberto } from "./eleicoes-estudos.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let n = 0; const t = (nome, f) => { f(); n++; console.log("ok " + nome); };
const FLAGS = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_flags.json"), "utf8"));
const PAG = slug => `<html><head></head><body><main><section class="qsec " id="dados"></section><section class="qsec " id="explica"><h2>x</h2></section></main><!-- ${slug} --></body></html>`;
const files = () => Object.fromEntries(ESTUDOS.map(e => [`eleicoes-2026/questionamentos/${e.slug}/index.html`, PAG(e.slug)]));
const ok = { ativo: true, estado: "APPROVED", decision_ref: "control/DECISIONS.md#2026-11-03-teste" };
const BU = { universo_total: 10, universo: [{ rotulo: "a", n: 7 }, { rotulo: "b", n: 3 }], universo_texto: "teste", cobertura: [{ rotulo: "a", n: 7, base: "x" }], conferencia_texto: "teste",
  posicoes: [{ rotulo: "p", mun: 1, mun_total: 1, uf: 1, uf_total: 1, sem_explicacao: 0 }], diferencas: [], metodologia: "teste", limites: ["não confere o boletim impresso com o digital"], fontes: [{ nome: "TSE", url: "https://www.tse.jus.br/" }],
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
// ---------------------------------------------------------------- guardas editoriais (dados SINTÉTICOS)
const B = o => Object.assign({}, BU, o), barra = (o, re) => assert.throws(() => validarEstudo("bu", B(o), ok), re);
const H23 = { universo_texto: "teste", observacao: { texto: "A curva ficou regular.", estado: "CONFIRMADA" }, hipotese: { texto: "A regularidade indica manipulação.", estado: "NÃO DEMONSTRADA" },
  curva: { reconstruida: [[0, 1], [100, 2]], sorteada: [[0, 1], [100, 1]], publicada: [], nota: "teste" }, testes_texto: "teste", testes: [], explicacao: "A ordem geográfica de chegada reproduz o padrão.",
  erro_texto: "teste", limites: ["não diz nada sobre o funcionamento interno da urna"], fontes: [{ nome: "TSE", url: "https://www.tse.jus.br/" }] };
t("guarda 1: fontes vazias ou inválidas travam a ativação", () => { barra({ fontes: [] }, /FONTES_VAZIAS/); barra({ fontes: [{ nome: "x", url: "http://inseguro" }] }, /FONTE_INVALIDA/); barra({ fontes: [{ nome: "", url: "https://a.b/" }] }, /FONTE_INVALIDA/);
  assert.ok(validarEstudo("bu", B({ fontes: [{ nome: "Publicação no X", url: null, nota: "não preservada" }, { nome: "TSE", url: "https://www.tse.jus.br/" }] }), ok)); });
t("guarda 2: limites ausentes ou vazios travam a ativação", () => { barra({ limites: [] }, /LIMITES_AUSENTES/); barra({ limites: [""] }, /LIMITES_AUSENTES/); });
t("guarda 3: decision_ref vazio ou fora do formato não abre o gate", () => {
  for (const r of ["", "DECISIONS#teste", "ok", "github:", "https://exemplo.org/1"]) assert.equal(gateAberto({ ...ok, decision_ref: r }), false, r);
  for (const r of ["github:#110", "github:histudyoficial-crypto/desmentindo-ops#90", "control/DECISIONS.md#2026-11-03T23:30Z", "https://github.com/histudyoficial-crypto/desmentindo/pull/119"]) assert.equal(gateAberto({ ...ok, decision_ref: r }), true, r);
  const f = files(); assert.deepEqual(aplicarEstudos(f, { bu: { ...ok, decision_ref: "DECISIONS#teste" } }, { bu: BU }, "/x.css"), []); });
t("guarda 4: conclusão incompatível com o estado da hipótese trava", () => {
  assert.ok(validarEstudo("h23", H23, ok));
  assert.throws(() => validarEstudo("h23", { ...H23, explicacao: "Os testes confirmam a hipótese." }, ok), /CONCLUSAO_INCOMPATIVEL/);
  assert.throws(() => validarEstudo("h23", { ...H23, hipotese: { ...H23.hipotese, estado: "CONFIRMADA" } }, ok), /HIPOTESE_CONCLUSIVA_SEM_REVISAO/);
  // a alegação examinada ("indica manipulação", NÃO DEMONSTRADA) é citação; a mesma frase fora da hipótese trava
  assert.ok(validarEstudo("h23", H23, ok));
  assert.throws(() => validarEstudo("h23", { ...H23, explicacao: "A regularidade indica manipulação." }, ok), /PROVA_OU_FRAUDE/); });
t("guarda 5: fraude/prova sem revisão editorial trava; negação e citação não travam", () => {
  barra({ metodologia: "A soma prova que não houve problema." }, /PROVA_OU_FRAUDE/);
  barra({ conferencia_texto: "Há indícios de fraude nesses municípios." }, /PROVA_OU_FRAUDE/);
  assert.ok(validarEstudo("bu", B({ metodologia: "Isto não prova a causa; também não é prova de fraude." }), ok));
  assert.ok(validarEstudo("bu", B({ conferencia_texto: "A publicação dizia “houve fraude” sem mostrar dados." }), ok));
  assert.ok(validarEstudo("bu", B({ metodologia: "A soma prova a coerência." }), { ...ok, revisao_editorial: { decision_ref: "github:#200", itens: ["PROVA_OU_FRAUDE"] } }));
  barra({ metodologia: "A soma prova a coerência." }, /PROVA_OU_FRAUDE/);   // sem revisão específica, continua travado
});
t("guarda 5 (Unicode): palavras com ç/ã travam; vizinhas inocentes não", () => {
  for (const x of ["Houve manipulação.", "manipulações em série", "A comprovação veio depois.", "fraudulência"]) barra({ metodologia: x }, /PROVA_OU_FRAUDE/);
  for (const x of ["A aprovação do plano.", "É improvável.", "Foi reprovado.", "Não houve manipulação.", "A publicação falava em “manipulação”."]) assert.ok(validarEstudo("bu", B({ metodologia: x }), ok), x);
});
t("guarda 6: linguagem proibida em SVG, aria-label, alt e title derruba o build", () => {
  assert.throws(() => moduloH23({ ...H23, curva: { ...H23.curva, publicada: [[50, 3, "ponto da auditoria"]] } }), /PALAVRA_PROIBIDA/);   // <title> dentro do SVG
  assert.throws(() => moduloBU({ ...BU, universo: [{ rotulo: "dossiê", n: 7 }, { rotulo: "b", n: 3 }] }), /PALAVRA_PROIBIDA/);       // <text> dentro do SVG
});
t("guarda 7: encerramento/recepção confundidos com o horário do voto travam; a ressalva correta passa", () => {
  barra({ metodologia: "O padrão é sobre quem votou por último na seção." }, /HORARIO_DO_VOTO/);
  barra({ conferencia_texto: "Os últimos eleitores puxaram o resultado." }, /HORARIO_DO_VOTO/);
  assert.ok(validarEstudo("bu", B({ metodologia: "O boletim não informa o horário de cada voto." }), ok)); });
t("guarda 8: inferência individual a partir de totais trava; a ressalva passa", () => {
  barra({ metodologia: "O eleitor dividiu o voto entre os cargos." }, /INFERENCIA_INDIVIDUAL/);
  assert.ok(validarEstudo("bu", B({ metodologia: "Os totais não mostram como cada eleitor combinou seus votos." }), ok)); });
t("gate aberto com conteúdo que exige revisão: o build falha (não publica em silêncio)", () => {
  assert.throws(() => aplicarEstudos(files(), { bu: ok }, { bu: B({ metodologia: "Isso comprova a lisura." }) }, "/x.css"), /ESTUDO_BU_BLOQUEADO/); });
console.log(`ELEICOES_ESTUDOS_TESTS ${n}/${n} OK`);
