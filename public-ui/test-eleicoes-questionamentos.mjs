#!/usr/bin/env node
// QA editorial da seção Questionamentos (Eleições 2026). Falha fechado.
//   node public-ui/test-eleicoes-questionamentos.mjs
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_questionamentos.json"), "utf8"));
const TAX = ["CONFIRMADO", "PARCIALMENTE CONFIRMADO", "EXPLICADO PELOS DADOS", "NÃO SUSTENTADO PELOS DADOS", "INCONCLUSIVO", "AINDA NÃO TESTÁVEL"];
// linguagem pública proibida (CLAUDE.md) + deboche/rótulo da dúvida + conclusão por autoridade
const BANNED = /\b(auditoria|dossi[eê]|corpus|evid[eê]ncia|ocorr[eê]ncia|matriz|entidade|proveni[eê]ncia|claim|pipeline|score)\b/i;
const MOCK = /(fake news|desinformad|teoria da conspira|terraplan|mentiros|absurd|ridícul|ignorant|lunátic|\bgado\b|petralha|bolsominion)/i;
const AUTH = /(segundo o TSE,? portanto|como o TSE (j[aá] )?(provou|comprovou)|o TSE garante|confirmado pelo TSE)/i;
const ASSERT_STOP = /\bsistema parou\b/i;   // permitido só na pergunta (é a dúvida que circulou)
const REQ = ["pergunta", "resposta", "chamou_atencao", "aconteceu", "testamos", "encontramos", "explica", "nao_prova", "confira", "fontes", "metodologia", "classificacao", "gate"];
let fail = 0, n = 0;
const bad = (m) => { fail++; console.error("FAIL " + m); };
const text = (q, skip) => JSON.stringify(Object.fromEntries(Object.entries(q).filter(([k]) => !skip.includes(k))));
for (const q of D.questionamentos) {
  n++;
  for (const k of REQ) if (q[k] == null || (Array.isArray(q[k]) && !q[k].length)) bad(`${q.id} sem seção ${k}`);
  if (!TAX.includes(q.classificacao)) bad(`${q.id} classificação fora da taxonomia: ${q.classificacao}`);
  if (!q.fontes.primaria.length || !q.fontes.analise.length) bad(`${q.id} sem fonte primária ou sem análise própria`);
  const all = text(q, []), body = text(q, ["pergunta", "card", "confira"]);   // links de "confira" repetem títulos de outras perguntas
  if (BANNED.test(all)) bad(`${q.id} palavra proibida: ${all.match(BANNED)[0]}`);
  if (MOCK.test(all)) bad(`${q.id} tom de deboche/rótulo: ${all.match(MOCK)[0]}`);
  if (AUTH.test(all)) bad(`${q.id} usa autoridade como prova: ${all.match(AUTH)[0]}`);
  if (ASSERT_STOP.test(body)) bad(`${q.id} afirma "sistema parou" fora da pergunta`);
  if (q.versao_oficial && /prova|comprova/i.test(q.versao_oficial)) bad(`${q.id} versão oficial redigida como prova`);
  if (!["READY TO PUBLISH", "NEEDS EDITORIAL REVIEW", "NEEDS MORE EVIDENCE"].includes(q.gate)) bad(`${q.id} gate inválido`);
  const f = path.join(ROOT, "eleicoes-2026", "questionamentos", q.slug, "index.html");
  if (!fs.existsSync(f)) bad(`${q.id} página não gerada`);
  else {
    const h = fs.readFileSync(f, "utf8");
    for (const t of ["O que aconteceu", "O que testamos", "O que encontramos", "O que isso não prova", "Confira você mesmo", "Fonte primária", "Análise Eleições 2026", "Ver como verificamos"])
      if (!h.includes(t)) bad(`${q.id} página sem bloco "${t}"`);
    if (q.versao_oficial && !/^Não localizamos/.test(q.versao_oficial) && !h.includes("não é tratado aqui como prova")) bad(`${q.id} versão oficial sem aviso de independência`);
  }
}
const home = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "index.html"), "utf8");
if (!home.includes("Questionamentos sobre a eleição") || !home.includes("Ver todos os questionamentos")) bad("home sem seção de questionamentos");
if (!fs.existsSync(path.join(ROOT, "eleicoes-2026", "questionamentos", "04-de-outubro", "index.html"))) bad("linha do tempo de 04/10 não gerada");
const tl = JSON.stringify(D.linha_do_tempo); if (BANNED.test(tl) || MOCK.test(tl) || ASSERT_STOP.test(tl)) bad("linha do tempo com linguagem proibida");
console.log(fail ? `QUESTIONAMENTOS_QA FAIL (${fail})` : `QUESTIONAMENTOS_QA PASS (${n} páginas + índice + 04/10 + home)`);
process.exit(fail ? 1 : 0);
