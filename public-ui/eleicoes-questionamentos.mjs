/**
 * Eleições 2026 · seção "Questionamentos" — páginas estáticas geradas a partir de public-ui/eleicoes_questionamentos.json.
 *
 * Regra editorial (05/10/2026): QUESTIONAR → INVESTIGAR → MOSTRAR → EXPLICAR → CLASSIFICAR → MOSTRAR LIMITES.
 * Cada página separa O QUE ACONTECEU · VERSÃO OFICIAL · OUTRAS FONTES · O QUE TESTAMOS · O QUE ENCONTRAMOS ·
 * O QUE ISSO EXPLICA · O QUE NÃO PROVA · O QUE AINDA NÃO SABEMOS, e as fontes em blocos separados
 * (fonte primária · fonte da alegação · imprensa/registros independentes · análise Eleições 2026).
 * Declaração oficial nunca é usada como prova da conclusão. Gráficos em SVG, com tabela/rótulos equivalentes.
 */
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const nf = (x, d) => Number(x).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");
const sg = (x, d) => (x > 0 ? "+" : "") + nf(x, d >= 3 && x !== 0 && Math.abs(x) < 0.001 ? 4 : d);
const C1 = "#4A6FB5", C2 = "#B5651D";            // validados (dataviz): CVD ΔE 21,8; contraste ≥ 3:1
export const BASE = "/eleicoes-2026/questionamentos/";
const CLS = { "CONFIRMADO": "c-conf", "PARCIALMENTE CONFIRMADO": "c-parc", "EXPLICADO PELOS DADOS": "c-expl",
  "NÃO SUSTENTADO PELOS DADOS": "c-nao", "INCONCLUSIVO": "c-inc", "AINDA NÃO TESTÁVEL": "c-nt" };

export function badge(c) { return `<span class="qbadge ${CLS[c] || ""}">${esc(c)}</span>`; }
const list = a => (a && a.length ? `<ul class="qlist">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
const sec = (t, body, cls) => (body ? `<section class="qsec ${cls || ""}"><h2>${esc(t)}</h2>${body}</section>` : "");
const src = s => s.url ? `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.nome)}</a>` : esc(s.nome);

function chartBars(g) {
  const W = 440, row = 46, L = 170, R = 44, H = g.barras.length * row + 50, max = Math.max(60, ...g.barras.map(b => b[1]));
  const x = v => L + v / max * (W - L - R);
  let s = g.barras.map((b, i) => {
    const y = 20 + i * row;
    return `<g><title>${esc(b[0])}: ${nf(b[1], 1)}%</title><text x="${L - 10}" y="${y + 20}" text-anchor="end" class="lb">${esc(b[0])}</text>` +
      `<rect x="${L}" y="${y + 6}" width="${(x(b[1]) - L).toFixed(1)}" height="22" rx="4" fill="${C1}"/>` +
      `<text x="${x(b[1]) + 6}" y="${y + 22}" class="vl">${nf(b[1], 0)}%</text></g>`;
  }).join("");
  const xr = x(g.referencia);
  s += `<line x1="${xr}" x2="${xr}" y1="12" y2="${H - 26}" class="ref"/><text x="${xr}" y="${H - 8}" text-anchor="middle" class="rl">${esc(g.referencia_rotulo)}: ${nf(g.referencia, 0)}%</text>`;
  return `<figure class="qfig"><figcaption>${esc(g.titulo)}</figcaption><div class="qsvg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.titulo)}">${s}</svg></div></figure>`;
}

function chartTransicoes(g) {
  const max = 2;
  const bar = (v, col) => `<span class="tb"><i style="width:${Math.min(100, Math.abs(v) / max * 100).toFixed(2)}%;background:${col}"></i></span>`;
  const rows = g.linhas.map(t => {
    const hl = t.de === g.destaque[0] && t.para === g.destaque[1];
    return `<tr${hl ? ' class="hl"' : ""}><th scope="row">${esc(t.de)} → ${esc(t.para)}</th>` +
      `<td><b>${sg(t.real_f, 3)}</b>${bar(t.real_f, C1)}</td><td><b>${sg(t.exib_f, 1)}</b>${bar(t.exib_f, C2)}</td>` +
      `<td>${sg(t.real_l, 3)}</td><td>${sg(t.exib_l, 1)}</td><td>${sg(t.bu_f, 3)} / ${sg(t.bu_l, 3)}</td></tr>`;
  }).join("");
  return `<figure class="qfig"><figcaption>${esc(g.titulo)}</figcaption><ul class="qleg"><li><i style="background:${C1}"></i>Mudança real (pontos percentuais)</li><li><i style="background:${C2}"></i>Como apareceria com 1 casa decimal</li></ul>` +
    `<div class="qtable"><table><thead><tr><th scope="col">Atualização</th><th scope="col">Flávio real</th><th scope="col">Flávio na tela</th><th scope="col">Lula real</th><th scope="col">Lula na tela</th><th scope="col">Soma dos boletins (Flávio / Lula)</th></tr></thead><tbody>${rows}</tbody></table></div>` +
    `<p class="qnote">Barras na mesma escala (até 2 pontos). A linha destacada é a única em que a tela mostraria “−0,1 / +0,1”.</p></figure>`;
}

function chartArred(a) {
  const line = (nome, v0, v1, lo, hi, cut) => {
    const W = 420, L = 14, R = 14, x = v => L + (v - lo) / (hi - lo) * (W - L - R), xc = x(cut);
    return `<svg viewBox="0 0 ${W} 118" role="img" aria-label="${esc(nome)}: de ${nf(v0, 4)} para ${nf(v1, 4)}">` +
      `<rect x="${L}" y="40" width="${xc - L}" height="26" fill="#E9E7E6"/><rect x="${xc}" y="40" width="${W - R - xc}" height="26" fill="#F7F5F4"/>` +
      `<text x="${L + 6}" y="34" class="lb">a tela mostra ${nf(lo, 1)} ←</text>` +
      `<text x="${W - R - 6}" y="34" text-anchor="end" class="lb">→ a tela mostra ${nf(hi, 1)}</text>` +
      `<line x1="${xc}" x2="${xc}" y1="40" y2="76" class="ref"/><text x="${xc}" y="90" text-anchor="middle" class="rl">fronteira ${nf(cut, 2)}</text>` +
      [[v0, "antes"], [v1, "depois"]].map(([v, t], i) => `<g><title>${t}: ${nf(v, 4)}%</title><circle cx="${x(v)}" cy="53" r="7" fill="${i ? C2 : C1}" stroke="#fff" stroke-width="2"/>` +
        `<text x="${x(v)}" y="${108}" text-anchor="${x(v) < xc ? "end" : "start"}" dx="${x(v) < xc ? 6 : -6}" class="vl">${t}: ${nf(v, 4)}%</text></g>`).join("") +
      `<text x="${L}" y="90" class="ax">${nf(lo, 2)}</text><text x="${W - R}" y="90" text-anchor="end" class="ax">${nf(hi, 2)}</text></svg>`;
  };
  const fl = Math.floor(Math.min(a.f0, a.f1) * 10) / 10, ll = Math.floor(Math.min(a.l0, a.l1) * 10) / 10;
  return `<figure class="qfig"><figcaption>Como o arredondamento cria o “−0,1 / +0,1”: a mudança real é de centésimos, mas o número cruza a fronteira de arredondamento</figcaption>` +
    `<p class="qmini"><b>Flávio</b>: ${nf(a.f0, 4)}% → ${nf(a.f1, 4)}% · na tela: ${nf(Math.round(a.f0 * 10) / 10, 1)} → ${nf(Math.round(a.f1 * 10) / 10, 1)}</p><div class="qsvg">${line("Flávio", a.f0, a.f1, fl, fl + 0.1, fl + 0.05)}</div>` +
    `<p class="qmini"><b>Lula</b>: ${nf(a.l0, 4)}% → ${nf(a.l1, 4)}% · na tela: ${nf(Math.round(a.l0 * 10) / 10, 1)} → ${nf(Math.round(a.l1 * 10) / 10, 1)}</p><div class="qsvg">${line("Lula", a.l0, a.l1, ll, ll + 0.1, ll + 0.05)}</div></figure>`;
}

function chartUF(g) {
  const pts = g.pontos.slice().sort((a, b) => a[1] - b[1]), W = 440, row = 20, L = 34, R = 34, H = pts.length * row + 40;
  const x = v => L + v * (W - L - R);
  let s = `<line x1="${x(0.5)}" x2="${x(0.5)}" y1="8" y2="${H - 24}" class="ref"/><text x="${x(0.5)}" y="${H - 6}" text-anchor="middle" class="rl">meio da fila (50)</text>`;
  s += pts.map((p, i) => {
    const y = 16 + i * row, col = p[2] ? C1 : C2;
    return `<g><title>${p[0]}: posição média ${nf(p[1] * 100, 0)}</title><text x="${L - 8}" y="${y + 4}" text-anchor="end" class="lb">${p[0]}</text>` +
      `<line x1="${x(0)}" x2="${x(p[1])}" y1="${y}" y2="${y}" stroke="#D6D3D2" stroke-width="2"/><circle cx="${x(p[1])}" cy="${y}" r="6" fill="${col}"/>` +
      `<text x="${x(p[1]) + 10}" y="${y + 4}" class="vl">${nf(p[1] * 100, 0)}</text></g>`;
  }).join("");
  return `<figure class="qfig"><figcaption>${esc(g.titulo)}</figcaption><ul class="qleg"><li><i style="background:${C1}"></i>Estados do Nordeste</li><li><i style="background:${C2}"></i>Demais estados</li></ul>` +
    `<div class="qsvg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.titulo)}">${s}</svg></div></figure>`;
}

function body(q, all) {
  const g = q.grafico;
  const chart = !g ? "" : g.tipo === "barras_referencia" ? chartBars(g) : g.tipo === "transicoes" ? chartTransicoes(g) : g.tipo === "pontos_uf" ? chartUF(g) : "";
  const extras = (q.arredondamento ? chartArred(q.arredondamento) : "") +
    (q.fluxo ? `<ol class="qflow">${q.fluxo.map(f => `<li>${esc(f)}</li>`).join("")}</ol>` : "") +
    (q.numeros ? `<div class="qnums">${q.numeros.map(n => `<div><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div>`).join("")}</div>` : "") +
    (q.tabela ? `<div class="qtable"><table><thead><tr>${q.tabela[0].map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${q.tabela.slice(1).map(r => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "") +
    (q.linha_do_tempo ? `<ol class="qtl">${q.linha_do_tempo.map(e => `<li><b>${esc(e[0])}</b><span>${esc(e[1])}</span></li>`).join("")}</ol>` : "") +
    (q.contador ? `<div class="qcount" data-src="${esc(q.contador.arquivo)}"><p class="k">Arquivos oficiais ainda não disponíveis</p><div class="qnums" id="qcount"></div><p class="qnote" id="qcountnote"></p></div>` : "");
  const F = q.fontes;
  const fontes = `<div class="qfontes">` +
    `<div><h3>Fonte primária</h3><p class="qtag of">Dado oficial</p><ul>${F.primaria.map(s => `<li>${src(s)}</li>`).join("")}</ul></div>` +
    (F.alegacao && F.alegacao.length ? `<div><h3>Onde a dúvida apareceu</h3><p class="qtag al">Fonte da alegação</p><ul>${F.alegacao.map(s => `<li>${src(s)}</li>`).join("")}</ul></div>` : "") +
    (F.imprensa && F.imprensa.length ? `<div><h3>Imprensa e registros independentes</h3><p class="qtag in">Outras fontes</p><ul>${F.imprensa.map(s => `<li>${src(s)}</li>`).join("")}</ul></div>` : "") +
    `<div><h3>Análise Eleições 2026</h3><p class="qtag an">Métrica calculada pelo Eleições 2026</p><ul>${F.analise.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div></div>`;
  const others = all.filter(o => o.id !== q.id).slice(0, 4);
  return `<article class="qart">
<p class="kick"><a href="${BASE}">Questionamentos</a> · ${esc(q.tema)}</p>
<h1>${esc(q.pergunta)}</h1>
<div class="qverdict">${badge(q.classificacao)}${q.classificacao_nota ? `<p>${esc(q.classificacao_nota)}</p>` : ""}</div>
<p class="qlead">${esc(q.resposta)}</p>
${q.hipotese ? sec("A hipótese", `<p>${esc(q.hipotese)}</p>`, "hip") : ""}
${sec("Por que isso chamou atenção", `<p>${esc(q.chamou_atencao)}</p>`)}
${sec("O que aconteceu", list(q.aconteceu))}
${q.versao_oficial ? sec("Versão oficial", `<p class="qoff">${esc(q.versao_oficial)}</p>` + (/^Não localizamos/.test(q.versao_oficial) ? "" : `<p class="qnote">O que o TSE declara não é tratado aqui como prova. Abaixo, o que conseguimos testar de forma independente.</p>`), "off") : ""}
${q.outras_fontes && q.outras_fontes.length ? sec("O que outras fontes registraram", list(q.outras_fontes)) : ""}
${sec("O que testamos", list(q.testamos))}
${sec("O que encontramos", list(q.encontramos) + chart + extras, "found")}
${sec("O que isso explica", `<p>${esc(q.explica)}</p>`)}
${sec("O que isso não prova", `<p>${esc(q.nao_prova)}</p>`, "limit")}
${q.nao_sabemos && q.nao_sabemos.length ? sec("O que ainda não sabemos", list(q.nao_sabemos), "limit") : ""}
${sec("Confira você mesmo", `<ul class="qlinks">${q.confira.map(c => `<li><a href="${esc(c.href)}"${/^https?:/.test(c.href) ? ' rel="noopener" target="_blank"' : ""}>${esc(c.txt)} →</a></li>`).join("")}</ul>`)}
${sec("Fontes", fontes)}
<details class="qmet"><summary>Ver como verificamos</summary><p>${esc(q.metodologia)}</p><p class="qnote">Classificação usada pelo Eleições 2026: CONFIRMADO · PARCIALMENTE CONFIRMADO · EXPLICADO PELOS DADOS · NÃO SUSTENTADO PELOS DADOS · INCONCLUSIVO · AINDA NÃO TESTÁVEL. Cada uma aponta para os dados acima.</p></details>
<nav class="qmore" aria-label="Outros questionamentos"><h2>Outros questionamentos</h2><ul>${others.map(o => `<li><a href="${BASE}${o.slug}/">${esc(o.pergunta)}</a> ${badge(o.classificacao)}</li>`).join("")}</ul><p><a href="${BASE}">Ver todos os questionamentos →</a></p></nav>
</article>`;
}

export function cards(qs, n) {
  return `<ul class="qcards">${qs.slice(0, n || qs.length).map(q => `<li><a href="${BASE}${q.slug}/"><span class="q">${esc(q.card || q.pergunta)}</span>${badge(q.classificacao)}</a></li>`).join("")}</ul>`;
}

export function pages(data, shell) {
  const qs = data.questionamentos, out = {};
  out["eleicoes-2026/questionamentos/index.html"] = shell({
    path: BASE, title: "Questionamentos sobre a eleição · Eleições 2026 | Desmentindo",
    desc: "Dúvidas que circularam sobre a apuração de 2026, investigadas nos dados: o que aconteceu, o que testamos, o que encontramos e o que ainda não dá para saber.",
    main: `<article class="qart"><p class="kick">Eleições 2026 · Questionamentos</p><h1>Você viu isso circulando? Fomos aos dados.</h1>
<p class="qlead">Não começamos pela conclusão. Para cada dúvida, mostramos o que aconteceu, o que o TSE declara, o que outras fontes registraram, o que testamos nos dados oficiais e o que ainda não dá para saber.</p>
${cards(qs)}
<section class="qsec"><h2>Como classificamos</h2><dl class="qtax">
<div><dt>${badge("CONFIRMADO")}</dt><dd>Os dados mostram que aconteceu.</dd></div>
<div><dt>${badge("PARCIALMENTE CONFIRMADO")}</dt><dd>Parte acontece; parte não, ou não em todos os casos.</dd></div>
<div><dt>${badge("EXPLICADO PELOS DADOS")}</dt><dd>O fato existe e os dados mostram por quê.</dd></div>
<div><dt>${badge("NÃO SUSTENTADO PELOS DADOS")}</dt><dd>Os dados não mostram o que foi afirmado.</dd></div>
<div><dt>${badge("INCONCLUSIVO")}</dt><dd>Os dados disponíveis não bastam para decidir.</dd></div>
<div><dt>${badge("AINDA NÃO TESTÁVEL")}</dt><dd>Ainda não há dado público para testar.</dd></div></dl>
<p class="qnote">Tratamos TSE, tribunais regionais, partidos, imprensa, institutos, publicações nas redes e o próprio Eleições 2026 com o mesmo padrão: vale o que os dados conseguem testar.</p></section>
<p><a href="${BASE}04-de-outubro/">A noite de 4 de outubro, passo a passo →</a></p></article>`});
  for (const q of qs) out[`eleicoes-2026/questionamentos/${q.slug}/index.html`] = shell({
    path: `${BASE}${q.slug}/`, title: `${q.pergunta} · Eleições 2026 | Desmentindo`, desc: q.resposta.slice(0, 200), main: body(q, qs), q });
  const t = data.linha_do_tempo;
  out[`eleicoes-2026/questionamentos/${t.slug}/index.html`] = shell({
    path: `${BASE}${t.slug}/`, title: `${t.titulo} · Eleições 2026 | Desmentindo`, desc: t.intro,
    main: `<article class="qart"><p class="kick"><a href="${BASE}">Questionamentos</a> · Apuração</p><h1>${esc(t.titulo)}</h1><p class="qlead">${esc(t.intro)}</p>
<ol class="qcase">${t.eventos.map(e => `<li><p class="h">${esc(e.h)}</p><div><h2>${esc(e.t)}</h2><dl>
<div><dt>O que observamos</dt><dd>${esc(e.obs)}</dd></div>${e.sig !== "—" ? `<div><dt>O que significa</dt><dd>${esc(e.sig)}</dd></div>` : ""}${e.nao !== "—" ? `<div class="lim"><dt>O que não podemos concluir</dt><dd>${esc(e.nao)}</dd></div>` : ""}</dl></div></li>`).join("")}</ol>
<p class="qnote">Horários de recepção: campo dr/hr do arquivo de cada seção (TSE). Horários de publicação: versões do arquivo nacional guardadas pelo coletor do Desmentindo e registros da imprensa.</p>
<nav class="qmore"><h2>Perguntas sobre esta noite</h2>${cards(qs.filter(q => ["Q1", "Q2", "Q3", "Q9"].includes(q.id)))}<p><a href="${BASE}">Ver todos os questionamentos →</a></p></nav></article>`});
  return out;
}
