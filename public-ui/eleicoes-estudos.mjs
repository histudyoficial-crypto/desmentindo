// E26 · módulos dos estudos (A LATE15 · B H23 · C reconciliação BU) — renderizadores PUROS: dados validados → HTML estático
// com SVG à mão, no mesmo padrão das páginas de questionamentos (build-eleicoes.mjs: HTML gerado no build, sem JS na página).
// Entram como <section class="qsec mod-e26"> antes de #explica na página do questionamento (a Story canônica).
// Gate: inserir() só insere com gate { ativo: true, estado: "APPROVED", decision_ref } — sem isso, a página volta intacta.
// Os DADOS de cada estudo não ficam neste repositório antes da aprovação: entram em public-ui/eleicoes_estudos/<id>.json pelo
// mesmo PR que ativa o gate (Human Gate + decision_ref). Sem arquivo ou sem gate → nada é inserido (aplicarEstudos).
// Cor: rampa neutra única; nenhuma cor de candidato, partido ou lado (§32.2.4). Valor ausente → "—", nunca 0.
const SEQ = ["#EFEBE8", "#D6CFCA", "#B8AEA8", "#968B84", "#6E625C", "#463C38"];
const INK = "#201E1D", INK2 = "#444141", MUTED = "#5C5958", RULE = "#D6D3D2";
// limites por letra Unicode: com \\b sem a flag u, "dossiê" (termina em letra acentuada) nunca casava
const PROIBIDAS = /(?<![\p{L}\p{N}])(auditoria|dossi[eê]|corpus|evid[eê]ncia|ocorr[eê]ncia|matriz|entidade|proveni[eê]ncia|claim|pipeline|score)(?![\p{L}\p{N}])/iu;

export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const fN = (v, d = 0) => (v == null || !isFinite(v) ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));
export const fP = (v, d = 1) => (v == null ? "—" : fN(v, d) + "%");

// ---------------------------------------------------------------- peças comuns
const tag = (t, cls = "") => `<span class="mod-tag ${cls}">${esc(t)}</span>`;
const fontes = fs => `<details class="mod-fontes"><summary>Fontes e arquivos</summary><ul>${fs.map(f => `<li>${f.url ? `<a href="${esc(f.url)}" rel="noopener">${esc(f.nome)}</a>` : esc(f.nome)}${f.nota ? ` — ${esc(f.nota)}` : ""}</li>`).join("")}</ul></details>`;
const limites = ls => `<div class="mod-lim"><h4>O que este estudo não mostra</h4><ul>${ls.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`;
const universo = u => `<p class="mod-uni"><b>Universo.</b> ${esc(u)}</p>`;
const tabela = (cab, linhas, cap) => `<div class="tablewrap mod-tw"><table><caption>${esc(cap)}</caption><thead><tr>${cab.map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${linhas.map(l => `<tr><th scope="row">${esc(l[0])}</th>${l.slice(1).map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const fig = (svg, legenda, alt) => `<figure class="mod-fig"><div class="mod-svg" role="img" tabindex="0" aria-label="${esc(alt)}">${svg}</div><figcaption>${legenda}</figcaption></figure>`;

function linhas({ series, x0, x1, xt, y0, y1, yt, fy = v => fN(v, 0), band, pts, W = 720, H = 300 }) {
  const l = 54, r = 132, t = 14, b = 30, X = v => l + ((v - x0) / (x1 - x0)) * (W - l - r), Y = v => t + ((y1 - v) / (y1 - y0)) * (H - t - b);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`;
  for (const v of yt) s += `<line x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${RULE}"/><text x="${l - 6}" y="${(Y(v) + 4).toFixed(1)}" font-size="12" text-anchor="end" fill="${MUTED}">${esc(fy(v))}</text>`;
  for (const [v, lab] of xt) s += `<text x="${X(v).toFixed(1)}" y="${H - 8}" font-size="12" text-anchor="middle" fill="${MUTED}">${esc(lab)}</text>`;
  if (band) s += `<polygon fill="${SEQ[1]}" points="${band.map(([a, , c]) => `${X(a).toFixed(1)},${Y(c).toFixed(1)}`).join(" ")} ${band.slice().reverse().map(([a, bb]) => `${X(a).toFixed(1)},${Y(bb).toFixed(1)}`).join(" ")}"/>`;
  const used = [];
  for (const sr of series) {
    s += `<polyline fill="none" stroke="${sr.cor}" stroke-width="${sr.w || 2}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ""} stroke-linejoin="round" points="${sr.pts.map(([a, c]) => `${X(a).toFixed(1)},${Y(c).toFixed(1)}`).join(" ")}"/>`;
    const [a, c] = sr.pts[sr.pts.length - 1]; let ly = Y(c) + 4; while (used.some(u => Math.abs(u - ly) < 15)) ly += 15; used.push(ly);
    s += `<text x="${(X(a) + 6).toFixed(1)}" y="${ly.toFixed(1)}" font-size="12.5" font-weight="700" fill="${INK2}">${esc(sr.nome)}</text>`;
  }
  for (const [a, c, lab] of pts || []) s += `<circle cx="${X(a).toFixed(1)}" cy="${Y(c).toFixed(1)}" r="4.5" fill="#fff" stroke="${INK}" stroke-width="2"><title>${esc(lab)}</title></circle>`;
  return s + "</svg>";
}
function barra(partes, W = 720) {
  const tot = partes.reduce((a, p) => a + p.v, 0); let x = 0, s = `<svg viewBox="0 0 ${W} 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`;
  partes.forEach((p, i) => { const w = (p.v / tot) * W; s += `<rect x="${x.toFixed(1)}" y="4" width="${Math.max(1, w - 2).toFixed(1)}" height="30" fill="${SEQ[Math.min(5, i + 1)]}"/>`;
    if (w > 64) s += `<text x="${(x + 6).toFixed(1)}" y="24" font-size="12.5" font-weight="700" fill="${i >= 2 ? "#fff" : INK}">${esc(p.rot)}</text>`; x += w; });
  return s + "</svg>";
}
const legendaBarra = partes => `<ul class="mod-leg">${partes.map((p, i) => `<li><i style="background:${SEQ[Math.min(5, i + 1)]}"></i>${esc(p.nome)}: <b>${esc(p.txt)}</b></li>`).join("")}</ul>`;
function pontos(linhasP, obs, obsIc, W = 720) {   // esperado em cada controle (com faixa) × observado (linha)
  const l = 220, r = 24, top = 30, rh = 42, H = top + rh * linhasP.length + 22, x0 = 10, x1 = 45, X = v => l + ((v - x0) / (x1 - x0)) * (W - l - r);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`;
  for (let v = 15; v <= 45; v += 5) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${top - 8}" y2="${H - 18}" stroke="${RULE}"/><text x="${X(v)}" y="${H - 4}" font-size="12" text-anchor="middle" fill="${MUTED}">${v}%</text>`;
  if (obsIc) s += `<rect x="${X(obsIc[0]).toFixed(1)}" y="${top - 10}" width="${Math.max(2, X(obsIc[1]) - X(obsIc[0])).toFixed(1)}" height="${H - top - 8}" fill="${INK}" opacity=".12"/>`;
  s += `<line x1="${X(obs).toFixed(1)}" x2="${X(obs).toFixed(1)}" y1="${top - 12}" y2="${H - 18}" stroke="${INK}" stroke-width="2"/><text x="${(X(obs) - 6).toFixed(1)}" y="${top - 16}" font-size="12.5" font-weight="700" text-anchor="end" fill="${INK}">observado ${fP(obs)}</text>`;
  linhasP.forEach((p, i) => { const y = top + 16 + i * rh, m = p.esperado;
    s += `<text x="${l - 12}" y="${y + 4}" font-size="13" text-anchor="end" fill="${INK2}">${esc(p.rotulo)}</text><line x1="${X(m).toFixed(1)}" x2="${X(obs).toFixed(1)}" y1="${y}" y2="${y}" stroke="${SEQ[2]}" stroke-width="2"/>`;
    if (p.ic) s += `<line x1="${X(p.ic[0]).toFixed(1)}" x2="${X(p.ic[1]).toFixed(1)}" y1="${y}" y2="${y}" stroke="${INK}" stroke-width="6" opacity=".35"/>`;
    s += `<circle cx="${X(m).toFixed(1)}" cy="${y}" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><text x="${(X(m) + (m < 39 ? 10 : -10)).toFixed(1)}" y="${y - 9}" font-size="12" text-anchor="${m < 39 ? "start" : "end"}" fill="${INK2}">${fP(m)}</text>`; });
  return s + "</svg>";
}
// Ficha de leitura (mesma ordem nos três estudos): o que se observou · como testamos · o que dá para concluir · limites ·
// onde conferir. Opcional no contrato (D.ficha); limites e fontes apontam para os blocos completos do próprio módulo.
const fichaHtml = (f, id, nLim) => !f ? "" : `<dl class="mod-ficha"><div><dt><span aria-hidden="true">1</span>O que se observou</dt><dd>${esc(f.observado)}</dd></div>` +
  `<div><dt><span aria-hidden="true">2</span>Como testamos</dt><dd>${esc(f.como)}</dd></div><div><dt><span aria-hidden="true">3</span>O que dá para concluir</dt><dd>${esc(f.conclusao)}</dd></div>` +
  `<div><dt><span aria-hidden="true">4</span>Limites</dt><dd><a href="#${id}-lim">${nLim} limite${nLim === 1 ? "" : "s"} escrito${nLim === 1 ? "" : "s"} no fim desta seção</a></dd></div>` +
  `<div><dt><span aria-hidden="true">5</span>Onde conferir</dt><dd><a href="#${id}-fontes">Fontes e arquivos oficiais usados</a></dd></div></dl>`;
function secao(id, titulo, estadoTag, corpo, story, ficha, nLim) {
  corpo = corpo.replace('<div class="mod-lim">', `<div class="mod-lim" id="${id}-lim">`).replace('<details class="mod-fontes">', `<details class="mod-fontes" id="${id}-fontes">`);
  const html = `<section class="qsec mod-e26" id="${id}" aria-labelledby="${id}-t"><h2 id="${id}-t">${esc(titulo)}</h2><p class="mod-tags">${estadoTag}</p>${fichaHtml(ficha, id, nLim)}${corpo}${story ? `<p class="mod-story">Esta seção detalha os dados de <a href="${esc(story.url)}">${esc(story.titulo)}</a>.</p>` : ""}</section>`;
  // texto visível INCLUSIVE dentro do SVG (<text>, <title>) + atributos lidos por leitor de tela / dica
  const txt = html.replace(/<[^>]+>/g, " ") + " " + [...html.matchAll(/\b(?:aria-label|alt|title)="([^"]*)"/g)].map(a => a[1]).join(" ");
  const m = txt.match(PROIBIDAS); if (m) throw new Error(`PALAVRA_PROIBIDA_NA_TELA: "${m[0]}" em ${id}`);
  if (/\b(NaN|undefined|null)\b/.test(txt)) throw new Error(`VALOR_INVALIDO_NA_TELA em ${id}`);
  return html;
}

// ---------------------------------------------------------------- A · LATE15
export function moduloLate15(D) {
  const b = D.bruta, curva = D.curva;
  const g1 = linhas({ series: [{ nome: "2022", pts: curva.map(r => [r[0], r[2]]), cor: "#8C837D", dash: "6 4" }, { nome: "2026", pts: curva.map(r => [r[0], r[1]]), cor: INK, w: 2.4 }],
    x0: 960, x1: 1439, xt: [16, 17, 18, 19, 20, 21, 22, 23].map(h => [h * 60, h + "h"]), y0: 0, y1: 100, yt: [0, 25, 50, 75, 100], fy: v => v + "%" });
  const g2 = pontos(D.controles.map(c => ({ rotulo: c.rotulo, esperado: c.esperado * 100, ic: c.ic && c.ic.map(v => v * 100) })), b.p * 100, b.ic && b.ic.map(v => v * 100));
  const dec = D.decomposicao.map(d => ({ nome: d.rotulo, v: d.pct, rot: fP(d.pct, 0), txt: fP(d.pct, 1) }));
  const corpo = universo(D.universo_texto) +
    `<h3>1. Recorrência</h3><p>Das ${fN(b.n)} seções que estiveram entre as 15% últimas a chegar em 2022, <b>${fP(b.p * 100)}</b> voltaram a estar entre as 15% últimas em 2026 (${fN(b.k)} seções). Se a ordem fosse sorteada, seriam ${fP(b.base * 100, 0)}. Intervalo de 95%: ${fP(b.ic[0] * 100)} a ${fP(b.ic[1] * 100)} — ${esc(b.ic_metodo)}.</p>` +
    fig(g1, `Linha contínua: 2026. Tracejada: 2022. Parte acumulada das seções recebidas pelo TSE, minuto a minuto (horário de Brasília). ${esc(D.curva_nota)}`, "Curvas acumuladas de recebimento das seções em 2022 e 2026") +
    `<h3>2. Comparando seções do mesmo lugar</h3><p>Se só importasse o estado, o município, a zona ou o local de votação, quanto se esperaria de recorrência? Círculo = esperado; números ao lado = esperado; faixa = intervalo de 95% das ${fN(D.permutacoes)} permutações; linha vertical = observado.</p>` +
    fig(g2, `${esc(D.controles_nota)}`, "Recorrência esperada em cada agrupamento comparada com a observada") +
    tabela(["Comparando só dentro do mesmo…", "Esperado", "Observado ÷ esperado"], D.controles.map(c => [c.rotulo, fP(c.esperado * 100), "×" + fN(c.razao, c.razao < 1.1 ? 3 : 2)]), "Recorrência esperada por agrupamento") +
    `<h3>3. Onde está a explicação</h3><p>Do excesso de ${fN(D.excesso_pp, 1)} pontos sobre o sorteio, a parte que se explica em cada nível:</p>` +
    fig(barra(dec), legendaBarra(dec), "Parcela do excesso de recorrência explicada por nível territorial") +
    `<p><b>Leitura.</b> ${esc(D.leitura)}</p>` + limites(D.limites) + fontes(D.fontes);
  return secao("estudo-chegada", "Os dados: a mesma ordem de chegada, quatro anos depois", tag("DADO OFICIAL (TSE)") + tag("CALCULADO"), corpo, D.story, D.ficha, (D.limites || []).length);
}

// ---------------------------------------------------------------- B · H23
export function moduloH23(D) {
  const c = D.curva;
  const g = linhas({ series: [{ nome: "Reconstruída (BU)", pts: c.reconstruida, cor: INK, w: 2.4 }, { nome: "Ordem sorteada", pts: c.sorteada, cor: "#8C837D", dash: "6 4" }],
    x0: 0, x1: 100, xt: [0, 20, 40, 60, 80, 100].map(v => [v, v + "%"]), y0: -2, y1: 12, yt: [-2, 2, 6, 10], fy: v => fN(v, 0) + " p.p.", pts: c.publicada });
  const corpo = universo(D.universo_texto) +
    `<div class="mod-sep"><div><h3>O que se vê nos dados</h3><p>${esc(D.observacao.texto)}</p><p>${tag(D.observacao.estado, "ok")}</p></div><div><h3>A explicação que circulou</h3><p>${esc(D.hipotese.texto)}</p><p>${tag(D.hipotese.estado, "nd")}</p></div></div>` +
    `<h3>A curva publicada e a curva refeita com os boletins</h3>` +
    fig(g, `${esc(c.nota)}`, "Diferença entre os dois primeiros colocados ao longo da apuração: pontos publicados, curva reconstruída e curva com ordem sorteada") +
    `<h3>O resultado dos testes</h3><p>${esc(D.testes_texto)}</p>` +
    tabela(["Ordem de chegada sorteada…", "5% dos sorteios abaixo de", "Mediana dos sorteios", "Posição do observado"], D.testes.map(t => [t.rotulo, fP(t.q05 * 100), fP(t.q50 * 100), t.percentil == null ? "—" : fN(t.percentil, 1) + "º percentil"]), "Proporção de intervalos de 5 minutos em que a diferença diminuiu, depois das 20h08") +
    `<h3>Explicação estatística e territorial</h3><p>${esc(D.explicacao)}</p>` +
    `<h3>Quanto a reconstrução erra</h3><p>${esc(D.erro_texto)}</p>` + (D.erro_tabela ? tabela(D.erro_tabela.cab, D.erro_tabela.linhas, D.erro_tabela.cap) : "") +
    limites(D.limites) + fontes(D.fontes);
  return secao("estudo-regularidade", "Os dados: regularidade da curva depois da pausa", tag("DADO OFICIAL (TSE)") + tag("CALCULADO"), corpo, D.story, D.ficha, (D.limites || []).length);
}

// ---------------------------------------------------------------- C · Reconciliação BU
export function moduloBU(D) {
  const u = D.universo.map(p => ({ nome: p.rotulo, v: p.n, rot: fP((p.n / D.universo_total) * 100, 1), txt: fN(p.n) }));
  const soma = D.universo.reduce((a, p) => a + p.n, 0);
  if (soma !== D.universo_total) throw new Error(`BU_UNIVERSO_NAO_FECHA ${soma} != ${D.universo_total}`);
  const corpo = universo(D.universo_texto) +
    fig(barra(u), legendaBarra(u), "Composição das seções da lista oficial") +
    `<p class="mod-conta"><b>Conferência:</b> ${D.universo.map(p => fN(p.n)).join(" + ")} = <b>${fN(D.universo_total)}</b> seções.</p>` +
    `<h3>Cobertura</h3>` + tabela(["Conjunto", "Seções", "Base"], D.cobertura.map(c => [c.rotulo, fN(c.n), esc(c.base)]), "Denominador de cada número") +
    `<h3>Conferência dos totais</h3><p>${esc(D.conferencia_texto)}</p>` +
    tabela(["Posição", "Municípios que batem", "Estados que batem", "Diferença sem explicação"], D.posicoes.map(p => [p.rotulo, `${fN(p.mun)} de ${fN(p.mun_total)}`, `${fN(p.uf)} de ${fN(p.uf_total)}`, fN(p.sem_explicacao)]), "Municípios e estados em que a soma dos boletins bate com o resultado oficial") +
    `<h3>Diferenças explicadas</h3>` + tabela(["Motivo", "Municípios", "Seções"], D.diferencas.map(d => [d.motivo, fN(d.municipios), fN(d.secoes)]), "Diferenças com motivo identificado") +
    `<h3>Como foi feito</h3><p>${esc(D.metodologia)}</p>` + limites(D.limites) + fontes(D.fontes);
  return secao("estudo-boletins", "Os dados: boletins de urna × resultado oficial", tag("DADO OFICIAL (TSE)") + tag("CALCULADO"), corpo, D.story, D.ficha, (D.limites || []).length);
}

// ---------------------------------------------------------------- guardas editoriais (só valem quando um gate abre)
// Não decidem o que é verdade: apontam o que exige revisão humana antes de ir para a tela e travam a ativação até haver
// decisão específica (gate.revisao_editorial = { decision_ref, itens: [regra ou termo liberado] }). Negação ("não prova")
// e citação entre aspas “…” não travam: são o uso metodológico legítimo.
export const DECISION_REF = /^(?:github:(?:[\w.-]+\/[\w.-]+)?#\d+|control\/DECISIONS\.md#[\w:.\-]+|https:\/\/github\.com\/histudyoficial-crypto\/desmentindo(?:-ops)?\/(?:issues|pull)\/\d+)$/;
export const gateAberto = g => !!g && g.ativo === true && g.estado === "APPROVED" && typeof g.decision_ref === "string" && DECISION_REF.test(g.decision_ref);
// Classes Unicode (\p{L}), não \w/\b: com \w, "manipulação" nunca casava ("ç"/"ã" não contam como letra).
const L_ = "[\\p{L}\\p{N}]", ANTES = `(?<!${L_})`, DEPOIS = `(?!${L_})`;
const R = src => new RegExp(ANTES + "(?:" + src + ")" + DEPOIS, "giu");
const REVISAR = [
  ["PROVA_OU_FRAUDE", R("fraud\\p{L}*|manipul\\p{L}*|prova(?:m|r|ria|do|da|s)?|comprov\\p{L}*|irregularidades? (?:comprovad|confirmad)\\p{L}*")],
  ["HORARIO_DO_VOTO", R("(?:hor[aá]rio|hora) (?:de|do|em que) (?:cada )?(?:voto|eleitor votou|o eleitor votou)|quem votou (?:por [uú]ltimo|primeiro|mais tarde)|votaram (?:por [uú]ltimo|mais tarde|depois das)|[uú]ltimos eleitores")],
  ["INFERENCIA_INDIVIDUAL", R("(?:o eleitor|os eleitores|cada eleitor|cada pessoa|o mesmo eleitor) (?:vot|escolh|prefer|mud|troc|combin|divid)\\p{L}*")]];
const NEG = /(?<![\p{L}\p{N}])(n[aã]o|nem|sem|nunca|jamais)(?![\p{L}\p{N}])[^.;:]{0,40}$/iu;
function strings(o, out = [], k = "") {
  if (typeof o === "string") { if (!/(^|\.)url$/.test(k)) out.push([k, o]); }
  else if (Array.isArray(o)) o.forEach((v, i) => strings(v, out, `${k}[${i}]`));
  else if (o && typeof o === "object") for (const [kk, v] of Object.entries(o)) strings(v, out, k ? `${k}.${kk}` : kk);
  return out;
}
const HIP_NAO_CONCLUSIVO = ["NÃO DEMONSTRADA", "NÃO SUSTENTADA", "INCONCLUSIVO", "AINDA NÃO TESTÁVEL", "EM CHECAGEM", "NÃO SUSTENTADO PELOS DADOS"];
export function validarEstudo(id, D, gate) {
  const erros = [], liberado = new Set(((gate && gate.revisao_editorial && DECISION_REF.test(gate.revisao_editorial.decision_ref || "")) ? gate.revisao_editorial.itens : []) || []);
  if (!Array.isArray(D.fontes) || !D.fontes.length) erros.push("FONTES_VAZIAS");
  else for (const f of D.fontes) if (!f || !String(f.nome || "").trim() || !(/^https:\/\//.test(f.url || "") || (f.url == null && /n[aã]o preservad/i.test(f.nota || ""))))
    erros.push(`FONTE_INVALIDA: ${f && f.nome}`);
  if (!Array.isArray(D.limites) || !D.limites.length || D.limites.some(l => String(l || "").trim().length < 15)) erros.push("LIMITES_AUSENTES");
  if (D.hipotese) {
    if (!HIP_NAO_CONCLUSIVO.includes(D.hipotese.estado) && !liberado.has("HIPOTESE_CONCLUSIVA")) erros.push(`HIPOTESE_CONCLUSIVA_SEM_REVISAO: ${D.hipotese.estado}`);
    if (HIP_NAO_CONCLUSIVO.includes(D.hipotese.estado)) {
      const concl = [D.ficha && D.ficha.conclusao, D.explicacao, D.leitura, D.testes_texto].filter(Boolean).join(" ");
      if (/\b(confirma(?:m|ndo)? a (?:hip[oó]tese|explica[cç][aã]o)|a hip[oó]tese (?:se )?confirm\w*|(?:fica|est[aá]) (?:demonstrad|comprovad)\w*)/iu.test(concl)) erros.push("CONCLUSAO_INCOMPATIVEL_COM_A_HIPOTESE");
    }
  }
  // a hipótese que circulou, rotulada como NÃO conclusiva, é a alegação sendo examinada (citação), não afirmação do estudo
  const hipCitada = D.hipotese && HIP_NAO_CONCLUSIVO.includes(D.hipotese.estado);
  for (const [campo, txt] of strings(D)) {
    for (const [regra, re] of REVISAR) {
      if (hipCitada && campo === "hipotese.texto" && regra === "PROVA_OU_FRAUDE") continue;
      for (const m of txt.matchAll(re)) {
        const antes = txt.slice(0, m.index), citacao = (antes.match(/“/g) || []).length > (antes.match(/”/g) || []).length;
        if (NEG.test(antes) || citacao || liberado.has(regra) || liberado.has(m[0].toLowerCase())) continue;
        erros.push(`REQUER_REVISAO_EDITORIAL ${regra}: "${m[0]}" em ${campo}`);
      }
    }
  }
  if (erros.length) throw new Error(`ESTUDO_${id.toUpperCase()}_BLOQUEADO: ` + erros.join(" | "));
  return true;
}

// ---------------------------------------------------------------- gate
export function inserir(pagina, modHtml, gate) {
  if (!gateAberto(gate)) return pagina;   // falha fechado
  const i = pagina.indexOf('<section class="qsec " id="explica">');
  if (i < 0) throw new Error("ANCORA_EXPLICA_AUSENTE");
  return pagina.slice(0, i) + modHtml + pagina.slice(i);
}

// ---------------------------------------------------------------- integração com o build das páginas (build-eleicoes.mjs)
export const ESTUDOS = [
  { id: "late15", slug: "por-que-nordeste-chega-mais-tarde", render: moduloLate15 },
  { id: "h23", slug: "flavio-caia-lula-subia-0-1", render: moduloH23 },
  { id: "bu", slug: "boletins-de-urna-batem-com-resultado", render: moduloBU }];
// files: { caminho: html } já gerados; gates: eleicoes_flags.json#estudos; dados: id → objeto (ou null). Cada estudo é
// independente: um gate aberto não abre os outros. Devolve a lista do que foi inserido.
export function aplicarEstudos(files, gates, dados, cssHref) {
  const feito = [];
  for (const e of ESTUDOS) {
    const g = (gates || {})[e.id], d = (dados || {})[e.id], k = `eleicoes-2026/questionamentos/${e.slug}/index.html`;
    if (!gateAberto(g) || !d || !files[k]) continue;
    validarEstudo(e.id, d, g);   // gate aberto: guardas editoriais antes de renderizar (lança e derruba o build)
    let h = inserir(files[k], e.render(d), g);
    if (cssHref && !h.includes(cssHref)) h = h.replace("</head>", `<link rel="stylesheet" href="${cssHref}">\n</head>`);
    files[k] = h; feito.push(e.id);
  }
  return feito;
}
