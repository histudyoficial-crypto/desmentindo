#!/usr/bin/env node
// QA editorial da seção Questionamentos (Eleições 2026). Falha fechado.
//   node public-ui/test-eleicoes-questionamentos.mjs
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "eleicoes_questionamentos.json"), "utf8"));
const TAX = ["CONFIRMADO", "PARCIALMENTE CONFIRMADO", "EXPLICADO PELOS DADOS", "NÃO SUSTENTADO PELOS DADOS", "INCONCLUSIVO", "AINDA NÃO TESTÁVEL"];
// linguagem pública proibida (CLAUDE.md) + deboche/rótulo da dúvida + conclusão por autoridade
const BANNED = /(?<![\p{L}\p{N}])(auditoria|dossi[eê]|corpus|evid[eê]ncia|ocorr[eê]ncia|matriz|entidade|proveni[eê]ncia|claim|pipeline|score)(?![\p{L}\p{N}])/iu;   // limites Unicode (dossiê)
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
// LAYOUT (diretriz do proprietário 22/10/2026, narrativa progressiva; substitui a ordem de 06/10): situação oficial →
// placar → quem votou → mapa por município → comparação → noite de 4/10 → questionamentos → explorador → metodologia;
// nenhum percentual fixo no HTML (o número vem do TSE).
{
  const ord = ['id="estado"', 'id="resultado"', 'id="votou"', 'id="municipios"', 'id="comparar"', 'id="t-evo"', 'id="t-q"', 'id="onde"', 'id="verificacao"'].map(x => home.indexOf(x));
  if (ord.some(i => i < 0) || ord.some((v, i) => i && v < ord[i - 1])) bad("Brasil fora da ordem do layout aprovado: " + ord.join(","));
  const topo = home.slice(home.indexOf('id="estado"'), home.indexOf('id="t-evo"'));
  if (/\d+,\d+%/.test(topo.replace(/<script[\s\S]*?<\/script>/g, ""))) bad("percentual fixo no HTML antes da noite da apuração");
  const uf = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "sp", "index.html"), "utf8");
  if (uf.includes('id="estado"') || uf.includes('id="t-q"')) bad("UF ganhou blocos exclusivos do Brasil");
  // central: resumo contado do dado; Q pages: resposta antes da prova, atalhos para evidência/limites/fontes
  const central = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", "index.html"), "utf8");
  const cnt = {}; for (const q of D.questionamentos) cnt[q.classificacao] = (cnt[q.classificacao] || 0) + 1;
  for (const [c, n] of Object.entries(cnt)) if (!new RegExp(`<li><b>${n}</b><span class="qbadge[^"]*"[^>]*>${c}<`).test(central)) bad(`resumo da central sem ${n} × ${c}`);
  if (!central.includes(`${D.questionamentos.length} dúvidas testadas nos dados oficiais`)) bad("resumo da central sem total");
  for (const q of D.questionamentos) {
    const h = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", q.slug, "index.html"), "utf8");
    const iS = h.indexOf('class="qsum"'), iP = h.indexOf('class="qpainel"');
    if (iP >= 0 && iP < iS) bad(`${q.id} evidência antes da resposta`);
    if (!/class="qjump"[\s\S]*href="#dados"[\s\S]*href="#limites"[\s\S]*href="#fontes"/.test(h)) bad(`${q.id} sem atalhos evidência/limites/fontes`);
    for (const a of ['id="dados"', 'id="limites"', 'id="fontes"']) if (!h.includes(a)) bad(`${q.id} sem âncora ${a}`);
  }
  // linguagem pública no HTML GERADO (texto visível + aria-label/title/alt): o builder também escreve texto fixo
  const pub = [["central", central], ["04-de-outubro", fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", "04-de-outubro", "index.html"), "utf8")],
    ...D.questionamentos.map((q) => [q.id, fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", q.slug, "index.html"), "utf8")])];
  for (const [id, h] of pub) {
    const vis = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
    const attrs = [...h.matchAll(/\b(?:aria-label|title|alt)="([^"]*)"/g)].map((m) => m[1]).join(" ");
    const hit = (vis + " " + attrs).match(BANNED);
    if (hit) bad(`${id} termo proibido no HTML público: "${hit[0]}"`);
  }
  // Regressões editoriais (revisão de 03/11/2026), conferidas no HTML gerado:
  const pg = (slug) => fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", slug, "index.html"), "utf8")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const bySlug = Object.fromEntries(D.questionamentos.map((q) => [q.id, q.slug]));
  const must = (id, txt, re, msg) => { if (!re.test(txt)) bad(`${id} ${msg}`); };
  const never = (id, txt, re, msg) => { if (re.test(txt)) bad(`${id} ${msg}`); };
  // Q2: teste não significativo não vira "não há efeito"; observação separada da explicação
  const q2 = pg(bySlug.Q2);
  never("Q2", q2, /não aumenta a chance de pausa|não gatilho da parada|efeito da fase da noite/i, "afirma ausência de efeito a partir de teste não significativo");
  must("Q2", q2, /não demonstra ausência de qualquer relação/i, "sem a ressalva de que p = 0,23 não demonstra ausência de relação");
  if (!D.questionamentos.find((q) => q.id === "Q2").observacao) bad("Q2 sem observação × explicação separadas");
  // Q5: encerramento da seção ≠ horário de cada voto; totais por seção ≠ escolha individual
  const q5 = pg(bySlug.Q5);
  never("Q5", q5, /quem votou por último|é sobre quem votou|e não ao tempo de transmissão/i, "lê o encerramento da seção como horário do voto");
  must("Q5", q5, /não informa o horário de cada voto/i, "sem dizer que o boletim não traz o horário de cada voto");
  never("Q5", q5, /é comum e mensurável|o eleitor vota de formas diferentes/i, "infere comportamento individual dos totais por seção");
  never("Q5", q5, /maioria de partidos de direita/i, "rótulo ideológico sem definição nem fonte");
  // Q6: ausência de boletim ≠ diferença explicada
  const q6 = pg(bySlug.Q6);
  never("Q6", q6, /nenhuma diferença ficou sem explicação|\b0\s+diferenças? sem explicação|diferenças sem explicação/i, "trata dado indisponível como diferença explicada");
  must("Q6", q6, /ainda não conferíveis/i, "sem a categoria de municípios ainda não conferíveis");
  must("Q6", q6, /reconciliada/i, "sem a categoria de diferenças reconciliadas");
  // Q3, Q4, Q10, Q7
  never("Q3", pg(bySlug.Q3), /quem garante que os votos/i, "soma dos boletins apresentada como garantia dos votos");
  never("Q4", pg(bySlug.Q4), /Ordem de chegada é logística\./, "logística afirmada como causa");
  never("Q10", pg(bySlug.Q10), /funcionamento normal \(acontecem em ciclos\)|são parte do funcionamento normal/i, "normalidade afirmada sem base");
  never("Q7", pg(bySlug.Q7), /Estamos acompanhando\./, "sem indicar quando foi a última verificação");
  // 04/10: horário oficial ≠ fim efetivo; ciclos não analisados não aparecem como fato
  const d4 = pg("04-de-outubro");
  never("04/10", d4, /Fim da votação no país\.|Pausas assim acontecem em ciclos|Mesmo padrão de ciclo/i, "linha do tempo afirma fim efetivo da votação ou ciclo não analisado");
  // alegação sem link: sempre dita como não preservada
  for (const q of D.questionamentos) for (const s of (q.fontes && q.fontes.alegacao) || []) if (!s.url && !/não preservad/i.test(s.nome)) bad(`${q.id} alegação sem link e sem aviso de não preservada: ${s.nome}`);
  // Q7: contrato dinâmico completo depois do layout (o JS troca os valores; nada disso pode sumir)
  const q7c = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", "arquivos-ainda-nao-disponiveis", "index.html"), "utf8");
  for (const [re, n] of [[/class="qcount"/, ".qcount"], [/ data-src="/, "data-src"], [/ data-live="/, "data-live"], [/ data-at="/, "data-at"], [/id="qcPend"/, "#qcPend"],
    [/id="qcRec"/, "#qcRec"], [/id="qcUF"/, "#qcUF"], [/id="qcWhen"/, "#qcWhen"], [/class="qwhen/, ".qwhen"], [/data-qcex/, "a[data-qcex]"]])
    if (!re.test(q7c)) bad("Q7 contrato: falta " + n);
  const qjs = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos.js"), "utf8");
  if (!/stale/.test(qjs)) bad("Q7: questionamentos.js sem estado stale");
  // Q11: aviso de unidade antes dos gráficos; observação ≠ explicação preservadas
  const q11 = fs.readFileSync(path.join(ROOT, "eleicoes-2026", "questionamentos", "presidente-governador-sao-paulo", "index.html"), "utf8");
  const iU = q11.indexOf('class="qunit"'), iG = q11.search(/class="(qhists|qmap|qfig)/);
  if (iU < 0 || (iG >= 0 && iG < iU)) bad("Q11: aviso de unidade não está antes dos gráficos");
  if (!q11.includes("Observação verdadeira não significa explicação verdadeira.")) bad("Q11 sem distinção observação × explicação");
}
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
// Regra: observação verdadeira ≠ explicação verdadeira — quando há observação, as duas têm status próprio e aparecem na página.
for (const q of D.questionamentos) if (q.observacao) {
  const o = q.observacao, h = pg(q.slug);
  if (!o.obs || !o.obs_status || !o.exp || !o.exp_status) bad(`${q.id} observação/explicação incompleta`);
  if (!h.includes("Observação verdadeira não significa explicação verdadeira")) bad(`${q.id} sem a regra observação ≠ explicação na página`);
}
for (const id of ["Q3", "Q11"]) if (!D.questionamentos.find(q => q.id === id).observacao) bad(`${id} sem observação/explicação`);
const q11 = D.questionamentos.find(q => q.id === "Q11");
if (q11) {
  const t11 = JSON.stringify(q11);
  if (/eleitores de Lula votaram em Tarc[ií]sio(?! nem)|quem votou em Lula votou em Tarc|é normal haver voto cruzado|prova (de )?fraude/i.test(t11.replace(/nem que eleitores de Lula votaram em Tarcísio/, ""))) bad("Q11 com inferência individual, conclusão pressuposta ou acusação");
  if (!t11.includes("DIVERG") && !/divergência agregada entre cargos/i.test(t11)) bad("Q11 sem o termo divergência agregada entre cargos");
}
const tl = JSON.stringify(D.linha_do_tempo); if (BANNED.test(tl) || MOCK.test(tl) || ASSERT_STOP.test(tl)) bad("linha do tempo com linguagem proibida");
console.log(fail ? `QUESTIONAMENTOS_QA FAIL (${fail})` : `QUESTIONAMENTOS_QA PASS (${n} páginas + índice + 04/10 + home)`);
process.exit(fail ? 1 : 0);
