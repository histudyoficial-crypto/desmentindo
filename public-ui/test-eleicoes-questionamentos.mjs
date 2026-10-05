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
    for (const t of ["O que aconteceu", "O que testamos", "O que encontramos|O que podemos concluir", "O que isso não prova|O que não podemos concluir", "Confira você mesmo", "Fonte primária", "Análise Eleições 2026", "Ver como verificamos"])
      if (!t.split("|").concat(Object.values(q.rotulos || {})).some(x => t.split("|").includes(x) ? h.includes(x) : false) &&
          !(q.rotulos && Object.entries({ "O que aconteceu": "aconteceu", "O que testamos": "testamos", "O que encontramos|O que podemos concluir": "encontramos", "O que isso não prova|O que não podemos concluir": "nao_prova" })
            .some(([k, f]) => k === t && q.rotulos[f] && h.includes(q.rotulos[f])))) bad(`${q.id} página sem bloco "${t}"`);
    if (q.versao_oficial && !/^Não localizamos/.test(q.versao_oficial) && !h.includes("não é tratado aqui como prova")) bad(`${q.id} versão oficial sem aviso de independência`);
  }
}
const home = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "index.html"), "utf8");
if (!home.includes("Questionamentos sobre a eleição") || !home.includes("Ver todos os questionamentos")) bad("home sem seção de questionamentos");
if (!fs.existsSync(path.join(ROOT, "eleicoes-2026", "questionamentos", "04-de-outubro", "index.html"))) bad("linha do tempo de 04/10 não gerada");
// Última milha (05/10): Q7 com número renderizado e hora da última verificação (nunca "tempo real"); Q6 com a verificação
// independente separada do arquivo oficial e o achado dos arquivos municipais rotulado; nav do produto em todas as páginas.
const pg = s => fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", s, "index.html"), "utf8");
const q7 = pg("arquivos-ainda-nao-disponiveis"), q6 = pg("boletins-de-urna-batem-com-resultado"), q1 = D.questionamentos.find(q => q.id === "Q1");
if (!/<b id="qcPend">[\d.]+<\/b>/.test(q7) || !/Última verificação: <time datetime="\d{4}-\d\d-\d\dT/.test(q7) || !q7.includes("recuperados desde o início do monitoramento")) bad("Q7 sem contador renderizado/última verificação/recuperados");
if (/tempo real/.test(q7) && !/não é (atualização em )?tempo real/.test(q7)) bad("Q7 sugere tempo real");
if (!q6.includes("Arquivo oficial utilizado") || !q6.includes("Verificação independente feita por nós") || !q6.includes("INCONSISTÊNCIA ENTRE PUBLICAÇÕES OFICIAIS · SEM DIVERGÊNCIA DE VOTOS IDENTIFICADA")) bad("Q6 sem destaque/achado");
if (!/^Sim\. A atualização pública do resultado presidencial ficou parada por cerca de uma hora/.test(q1.resposta)) bad("Q1 não abre com a confirmação da parada");
for (const h of [home, q7, q6]) if (!h.includes('class="pnav"')) bad("página sem a navegação do produto");
const q11 = D.questionamentos.find(q => q.id === "Q11");
if (q11) {
  const t11 = JSON.stringify(q11);
  if (/eleitores de Lula votaram em Tarc[ií]sio(?! nem)|quem votou em Lula votou em Tarc|é normal haver voto cruzado|prova (de )?fraude/i.test(t11.replace(/nem que eleitores de Lula votaram em Tarcísio/, ""))) bad("Q11 com inferência individual, conclusão pressuposta ou acusação");
  if (!t11.includes("DIVERG") && !/divergência agregada entre cargos/i.test(t11)) bad("Q11 sem o termo divergência agregada entre cargos");
}
const tl = JSON.stringify(D.linha_do_tempo); if (BANNED.test(tl) || MOCK.test(tl) || ASSERT_STOP.test(tl)) bad("linha do tempo com linguagem proibida");
console.log(fail ? `QUESTIONAMENTOS_QA FAIL (${fail})` : `QUESTIONAMENTOS_QA PASS (${n} páginas + índice + 04/10 + home)`);
process.exit(fail ? 1 : 0);
