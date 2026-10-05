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
const C3 = "#2A9D8F";                            // 3ª cor (Q11, quadrante B): validada com C1 e C2 em todos os pares (CVD ΔE ≥ 10,0; normal ≥ 16,3)
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
    `<div class="qtable" tabindex="0" role="region" aria-label="Tabela (role para os lados)"><table><thead><tr><th scope="col">Atualização</th><th scope="col">Flávio real</th><th scope="col">Flávio na tela</th><th scope="col">Lula real</th><th scope="col">Lula na tela</th><th scope="col">Soma dos boletins (Flávio / Lula)</th></tr></thead><tbody>${rows}</tbody></table></div>` +
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

// Hora de Brasília (UTC−3; sem horário de verão desde 2019), igual no build e no navegador.
export function brHora(iso) {
  const t = new Date(Date.parse(iso) - 3 * 3600e3), p = n => String(n).padStart(2, "0");
  return `${p(t.getUTCDate())}/${p(t.getUTCMonth() + 1)}/${t.getUTCFullYear()}, ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}
const ufNome = u => (u === "ZZ" ? "exterior" : u);
// Q7: o número vem renderizado no HTML (último snapshot conhecido no deploy); questionamentos.js só troca o texto se
// encontrar um snapshot mais novo. Mesmo layout antes e depois: nada se desloca.
function contador(c) {
  const e = c.estado;
  return `<div class="qcount" data-src="${esc(c.arquivo)}"${c.ao_vivo ? ` data-live="${esc(c.ao_vivo)}"` : ""} data-at="${esc(e.atualizado_em)}">
<p class="k">Arquivos ainda não disponíveis</p>
<p class="qbig"><b id="qcPend">${nf(e.pendentes, 0)}</b> <span>seções</span></p>
<p class="qwhen" id="qcWhen">Última verificação: <time datetime="${esc(e.atualizado_em)}">${brHora(e.atualizado_em)}</time> (Brasília)</p>
<div class="qnums"><div><b id="qcRec">${nf(e.recuperadas, 0)}</b><span>recuperados desde o início do monitoramento (eram ${nf(e.base_madrugada_05_10, 0)} sem arquivo na madrugada de 05/10)</span></div>
<div><b id="qcUF">${Object.entries(e.pendentes_por_uf).map(([u, n]) => `${ufNome(u)} ${nf(n, 0)}`).join(" · ")}</b><span>ainda pendentes, por estado</span></div></div>
<p class="qnote" id="qcNote">Contagem do acompanhamento de hora em hora do Eleições 2026 — não é atualização em tempo real. Erro 404 (“NoSuchKey”) quer dizer que o arquivo ainda não está publicado, não que ele nunca vá existir.</p></div>`;
}
function achado(a) {
  return `<div class="qachado"><p class="qflag">${esc(a.rotulo)}</p><h3>${esc(a.titulo)}</h3>${list(a.itens)}</div>`;
}
function destaque(d) {
  return `<section class="qdest" aria-labelledby="qdest-t"><h2 id="qdest-t">${esc(d.titulo)}</h2><div class="qdcols">
<div><h3>Arquivo oficial utilizado</h3><p class="qtag of">Dado oficial (TSE)</p>${list(d.oficial)}</div>
<div><h3>Verificação independente feita por nós</h3><p class="qtag an">Eleições 2026</p>${list(d.nossa)}</div></div>
<p class="qcov"><b>Cobertura:</b> ${esc(d.cobertura)}</p><p class="qcov"><b>Limitações atuais:</b> ${esc(d.limites)}</p></section>`;
}

// ---- Q11: painel dos dois cargos, histogramas por seção e mapa dos locais de votação
function painel(p) {
  return `<section class="qpainel" aria-label="${esc(p.titulo)}"><p class="k">${esc(p.titulo)}</p><div class="qpcols">${p.cargos.map(c => `<div><h2>${esc(c.cargo)}</h2>${c.itens.map((it, i) =>
    `<div class="qprow"><span class="nm">${esc(it[0])}</span><b>${nf(it[1], 2)}%</b><span class="bar"><i style="width:${it[1]}%;background:${i ? "#8A8786" : "var(--ink)"}"></i></span><span class="vt">${nf(it[2], 0)} votos</span></div>`).join("")}</div>`).join("")}</div>
<p class="qpq">${esc(p.pergunta)}</p><p class="qnote">${esc(p.nota)}</p></section>`;
}
function hist(h) {
  const ks = Object.keys(h.bins).map(Number).sort((a, b) => a - b), vs = ks.map(k => h.bins[String(k)]), W = 440, H = 170, L = 30, B = 26, bw = (W - L - 8) / ks.length, max = Math.max(...vs);
  const col = h.cor === 2 ? C2 : C1;
  let g = vs.map((v, i) => `<rect x="${(L + i * bw + 1).toFixed(1)}" y="${(H - B - v / max * (H - B - 12)).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(v / max * (H - B - 12)).toFixed(1)}" rx="1.5" fill="${col}"><title>${ks[i]} a ${ks[i] + 2} pontos: ${nf(v, 0)} seções</title></rect>`).join("");
  const x0 = L + ks.indexOf(0) * bw;
  g += `<line x1="${x0}" x2="${x0}" y1="6" y2="${H - B}" class="ref"/><text x="${x0 + 4}" y="14" class="rl">zero</text>`;
  g += ks.filter(k => k % 10 === 0).map(k => `<text x="${L + ks.indexOf(k) * bw}" y="${H - 8}" class="ax" text-anchor="middle">${k > 0 ? "+" : ""}${k}</text>`).join("");
  return `<figure class="qfig"><figcaption>${esc(h.titulo)}</figcaption><div class="qsvg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(h.titulo)}: número de seções em cada faixa de 2 pontos">${g}</svg></div></figure>`;
}
function mapa(pts) {
  const lon = pts.map(p => p[0]), lat = pts.map(p => p[1]), k = Math.cos(23.6 * Math.PI / 180);
  const x0 = Math.min(...lon), x1 = Math.max(...lon), y0 = Math.min(...lat), y1 = Math.max(...lat), W = 420, H = Math.round(W * (y1 - y0) / ((x1 - x0) * k)) + 8;
  const X = v => (4 + (v - x0) / (x1 - x0) * (W - 8)).toFixed(1), Y = v => (4 + (y1 - v) / (y1 - y0) * (H - 8)).toFixed(1);
  const COL = { A: C1, B: C3, C: C2, empate: "#8A8786" }, ord = { C: 0, A: 1, empate: 2, B: 3 };
  const cnt = { A: 0, B: 0, C: 0, empate: 0 }; pts.forEach(p => cnt[p[2]]++);
  const dots = pts.slice().sort((a, b) => ord[a[2]] - ord[b[2]]).map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2.6" fill="${COL[p[2]]}"/>`).join("");
  const leg = [["A", "Lula e Haddad à frente"], ["B", "Lula e Tarcísio à frente"], ["C", "Flávio e Tarcísio à frente"], ["empate", "empate em algum cargo"]];
  return `<figure class="qfig"><figcaption>Locais de votação da capital, pelo resultado somado das suas seções</figcaption>
<ul class="qleg">${leg.map(([q, t]) => `<li><i style="background:${COL[q]}"></i>${esc(t)} (${nf(cnt[q], 0)})</li>`).join("")}</ul>
<div class="qsvg qmap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa de ${nf(pts.length, 0)} locais de votação da cidade de São Paulo: ${nf(cnt.A, 0)} com Lula e Haddad à frente, ${nf(cnt.B, 0)} com Lula e Tarcísio à frente, ${nf(cnt.C, 0)} com Flávio e Tarcísio à frente">${dots}</svg></div>
<p class="qnote">Cada ponto é um local de votação, na coordenada do cadastro oficial do TSE. Cor = quem ficou à frente em cada cargo, somando as seções do local. Não mostra o voto de ninguém.</p></figure>`;
}
function chartContra(c) {
  const W = 440, H = 220, L = 34, R = 12, T = 12, B = 30, all = c.series.flatMap(s => s.v), lo = Math.min(0, ...all), hi = Math.max(...all) * 1.08;
  const X = i => L + i * (W - L - R) / (c.pontos.length - 1), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const COL = { ink: "var(--ink)", c1: C1, c2: C2, c3: C3 };
  let g = [0, 2, 4, 6].filter(v => v <= hi).map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#E4E2E1"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="ax">${v}</text>`).join("");
  g += c.pontos.map((p, i) => `<text x="${X(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="ax">${esc(p)}</text>`).join("");
  g += c.series.map(s => `<polyline fill="none" stroke="${COL[s.cor]}" stroke-width="${s.cor === "ink" ? 3 : 2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""} points="${s.v.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")}"/>` +
    s.v.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.5" fill="${COL[s.cor]}" stroke="#fff" stroke-width="1.5"><title>${esc(s.nome)} · ${esc(c.pontos[i])}: ${nf(v, 2)}</title></circle>`).join("")).join("");
  const tab = `<details class="tablewrap"><summary>Ver os números</summary><div class="qtable" tabindex="0" role="region" aria-label="Tabela da curva"><table><thead><tr><th scope="col">Curva</th>${c.pontos.map(p => `<th scope="col">${esc(p)}</th>`).join("")}</tr></thead><tbody>${c.series.map(s => `<tr><th scope="row">${esc(s.nome)}</th>${s.v.map(v => `<td>${nf(v, 2)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
  return `<figure class="qfig"><figcaption>${esc(c.titulo)}</figcaption><ul class="qleg">${c.series.map(s => `<li><i style="background:${COL[s.cor]}"></i>${esc(s.nome)}</li>`).join("")}</ul>
<div class="qsvg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.titulo)}. ${c.series.map(s => s.nome + ": de " + nf(s.v[0], 2) + " a " + nf(s.v[s.v.length - 1], 2)).join("; ")}">${g}</svg></div>${tab}</figure>`;
}
function blocos(q) {
  return (q.blocos || []).map(b => sec(b.titulo, list(b.itens) +
    (b.tabela ? `<div class="qtable" tabindex="0" role="region" aria-label="${esc(b.titulo)} (tabela; role para os lados)"><table><thead><tr>${b.tabela[0].map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${b.tabela.slice(1).map(r => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "") +
    (b.histogramas ? `<div class="qhists">${b.histogramas.map(hist).join("")}</div>` : "") + (b.mapa && q.locais_mapa ? mapa(q.locais_mapa) : "") +
    (b.grafico_transicoes && q.grafico ? chartTransicoes(q.grafico) + (q.arredondamento ? chartArred(q.arredondamento) : "") : "") +
    (b.contrafactual ? chartContra(b.contrafactual) : ""))).join("\n");
}

function body(q, all) {
  const g = q.grafico_no_bloco ? null : q.grafico;
  const T = (k, d) => (q.rotulos && q.rotulos[k]) || d;
  const chart = !g ? "" : g.tipo === "barras_referencia" ? chartBars(g) : g.tipo === "transicoes" ? chartTransicoes(g) : g.tipo === "pontos_uf" ? chartUF(g) : "";
  const extras = (q.arredondamento && !q.grafico_no_bloco ? chartArred(q.arredondamento) : "") +
    (q.fluxo ? `<ol class="qflow">${q.fluxo.map(f => `<li>${esc(f)}</li>`).join("")}</ol>` : "") +
    (q.numeros ? `<div class="qnums">${q.numeros.map(n => `<div><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div>`).join("")}</div>` : "") +
    (q.tabela ? `<div class="qtable" tabindex="0" role="region" aria-label="Tabela (role para os lados)"><table><thead><tr>${q.tabela[0].map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${q.tabela.slice(1).map(r => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "") +
    (q.linha_do_tempo ? `<ol class="qtl">${q.linha_do_tempo.map(e => `<li><b>${esc(e[0])}</b><span>${esc(e[1])}</span></li>`).join("")}</ol>` : "") +
    (q.achado ? achado(q.achado) : "");
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
${q.painel_cargos ? painel(q.painel_cargos) : ""}
<div class="qverdict">${badge(q.classificacao)}${q.classificacao_nota ? `<p>${esc(q.classificacao_nota)}</p>` : ""}</div>
<p class="qlead">${esc(q.resposta)}</p>
${q.destaque ? destaque(q.destaque) : ""}
${q.contador ? contador(q.contador) : ""}
${q.hipotese ? sec(q.painel_cargos ? "Duas afirmações diferentes" : T("hipotese", "A hipótese"), `<p>${esc(q.hipotese)}</p>`, "hip") : ""}
${sec(T("chamou_atencao", "Por que isso chamou atenção"), `<p>${esc(q.chamou_atencao)}</p>`)}
${sec(T("aconteceu", "O que aconteceu"), list(q.aconteceu))}
${q.versao_oficial ? sec("Versão oficial", `<p class="qoff">${esc(q.versao_oficial)}</p>` + (/^Não localizamos/.test(q.versao_oficial) ? "" : `<p class="qnote">O que o TSE declara não é tratado aqui como prova. Abaixo, o que conseguimos testar de forma independente.</p>`), "off") : ""}
${q.outras_fontes && q.outras_fontes.length ? sec("O que outras fontes registraram", list(q.outras_fontes)) : ""}
${q.blocos_antes ? blocos(q) : ""}
${sec(T("testamos", "O que testamos"), list(q.testamos))}
${q.blocos_antes ? "" : blocos(q)}
${sec(q.painel_cargos ? "O que podemos concluir" : T("encontramos", "O que encontramos"), list(q.encontramos) + chart + extras, "found")}
${sec(T("explica", "O que isso explica"), `<p>${esc(q.explica)}</p>`)}
${sec(q.painel_cargos ? "O que não podemos concluir" : T("nao_prova", "O que isso não prova"), `<p>${esc(q.nao_prova)}</p>`, "limit")}
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
