// Eleições 2026 · 2º turno · Institutos de pesquisa. Seção estática gerada no build a partir de
// public-ui/eleicoes_pesquisas_2t.json. Só entra pesquisa aprovada no Human Gate (aprovado + decision_ref) com registro
// no PesqEle e publicação original; qualquer outra coisa falha fechado. Desligada (flag pesquisas_2t), a seção só explica
// o que vai aparecer. Pesquisa não é resultado; erro das pesquisas só depois da totalização final e com revisão humana.
// Ligada: linha do tempo dos levantamentos na janela (16–25/10, pontos nas datas reais de publicação, nada entre eles),
// explorador com filtros, tabela com metodologia e documentos, e a referência de 2022 separada. Sem média, sem projeção.
const REG = /^BR-\d{5}\/(2026|2022)$/, DIA = /^\d{4}-\d\d-\d\d$/, ISO = /^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(:\d\d)?([.,]\d+)?(Z|[+-]\d\d:?\d\d)?$/;
const HEX = /^[0-9a-f]{64}$/;
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const f1 = n => n == null ? "—" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
const fI = n => n == null ? "—" : Number(n).toLocaleString("pt-BR");
const dBR = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "—";
const hBR = t => { const m = /[T ](\d\d):(\d\d)/.exec(t || ""); return m ? `${m[1]}h${m[2]}` : ""; };
export const chave = p => `${p.instituto}|${p.modalidade || ""}`;
const NOME = { "FLAVIO BOLSONARO": "Flávio Bolsonaro", "LULA": "Lula", "JAIR BOLSONARO": "Jair Bolsonaro" };
const nome = c => NOME[c] || c;
const janela = D => D.janela || D.semana || { de: "2026-10-16", ate: "2026-10-25" };
// categoria do método para o filtro (o texto completo fica na tabela); sem texto = "Não informado", nunca um palpite
export function metodoTipo(m) {
  const t = String(m || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!t.trim()) return "Não informado";
  const tel = /telefon|ura\b|ivr|cati|celular|liga[cç]/.test(t), pres = /presencia|pessoa|domicil|ponto[s]? de fluxo|face a face|porta a porta/.test(t), web = /internet|online|web|digital|app|aplicativo|rds|recrutamento digital/.test(t);
  const n = [tel, pres, web].filter(Boolean).length;
  return n > 1 ? "Misto" : tel ? "Telefone" : pres ? "Presencial" : web ? "Internet" : "Outro (ver metodologia)";
}
const aprovada = p => p.aprovado === true && /\S/.test(p.decision_ref || "");

function valida1(p, err, ano, jan, seen) {
  const id = `${p.instituto} ${p.registro_pesqele || "?"}`;
  if (!aprovada(p)) err.push("PESQUISA_SEM_HUMAN_GATE " + id);
  if (!REG.test(p.registro_pesqele || "") || !(p.registro_pesqele || "").endsWith("/" + ano)) err.push("REGISTRO_PESQELE_INVALIDO " + id);
  if (!/^https:\/\//.test(p.url_original || "")) err.push("SEM_PUBLICACAO_ORIGINAL " + id);
  for (const k of ["campo_inicio", "campo_fim", "divulgacao"]) if (!DIA.test(p[k] || "") || !p[k].startsWith(ano)) err.push(`DATA_INVALIDA ${k} ${id}`);
  if (p.campo_fim < p.campo_inicio || p.divulgacao < p.campo_fim) err.push("DATAS_INCOERENTES " + id);
  if (p.publicado_em != null && (!ISO.test(p.publicado_em) || p.publicado_em.slice(0, 10) !== p.divulgacao)) err.push("HORA_DE_PUBLICACAO_INVALIDA " + id);
  if (jan && p.divulgacao > jan.ate) err.push("DIVULGADA_DEPOIS_DA_JANELA " + id);
  if (jan && p.divulgacao < jan.de && p.contexto !== true) err.push("FORA_DA_JANELA_SEM_MARCA_DE_CONTEXTO " + id);
  const vt = p.votos_totais || {};
  const pct = v => v == null || (typeof v === "number" && v >= 0 && v <= 100);
  if (!Object.keys(vt).length || !Object.values(vt).every(pct)) err.push("VOTOS_TOTAIS_INVALIDOS " + id);
  if (p.votos_validos && !Object.values(p.votos_validos).every(pct)) err.push("VOTOS_VALIDOS_INVALIDOS " + id);
  for (const k of ["branco_nulo", "indecisos", "nao_votariam"]) if (!pct(p[k])) err.push(`PERCENTUAL_INVALIDO ${k} ${id}`);
  for (const d of p.documentos || []) if (!/^https:\/\//.test(d.url || "") || (d.sha256 != null && !HEX.test(d.sha256))) err.push("DOCUMENTO_INVALIDO " + id);
  if (p.erro_2t != null) err.push("ERRO_2T_ANTES_DO_RESULTADO " + id);   // erro só depois do tf=s, em outra revisão
  const k = chave(p) + "|" + p.registro_pesqele; if (seen.has(k)) err.push("PESQUISA_DUPLICADA " + id); seen.add(k);
}

export function validate(D) {
  const err = [];
  const inst = new Set((D.institutos || []).map(chave));
  if (inst.size !== (D.institutos || []).length) err.push("INSTITUTO_DUPLICADO");
  const jan = janela(D);
  if (!DIA.test(jan.de || "") || !DIA.test(jan.ate || "") || jan.de > jan.ate) err.push("JANELA_INVALIDA");
  for (const k of ["sincronizado_em", "atualizado_editorial_em"]) if (D[k] != null && !ISO.test(D[k]) && !DIA.test(D[k])) err.push("HORARIO_INVALIDO " + k);
  if ((D.pesquisas || []).length && !D.atualizado_editorial_em) err.push("SEM_HORARIO_DA_ATUALIZACAO_EDITORIAL");
  const seen = new Set();
  for (const p of D.pesquisas || []) {
    if (!inst.has(chave(p))) err.push(`INSTITUTO_NAO_NORMALIZADO ${p.instituto} ${p.registro_pesqele || "?"}`);
    valida1(p, err, "2026", jan, seen);
  }
  const R = D.referencia_2022;
  if (R) {
    for (const r of R.resultados_oficiais || []) {
      if (!/^https:\/\//.test(r.fonte_url || "") || !(r.candidatos || []).length || !r.candidatos.every(c => Number.isInteger(c.votos) && c.votos > 0 && c.pct_validos > 0 && c.pct_validos < 100))
        err.push("RESULTADO_2022_INVALIDO " + (r.rotulo || "?"));
    }
    const s22 = new Set();
    for (const p of R.pesquisas || []) valida1(p, err, "2022", null, s22);
  }
  return err;
}

// válidos: os publicados pela fonte; se a fonte não publicou, candidato / soma dos candidatos (sem redistribuir nada).
export function validos(p) {
  if (p.votos_validos && Object.keys(p.votos_validos).length && Object.values(p.votos_validos).every(v => v != null)) return { v: p.votos_validos, calc: false };
  const c = Object.entries(p.votos_totais || {}); if (!c.length || c.some(([, v]) => v == null)) return { v: null, calc: true };
  const s = c.reduce((a, [, v]) => a + v, 0); if (!s) return { v: null, calc: true };
  return { v: Object.fromEntries(c.map(([k, v]) => [k, Math.round(v / s * 1000) / 10])), calc: true };
}

const ESTADO = { APROVADO: "Aprovada no Human Gate", AGUARDA_DECISAO: "Aguarda decisão", APROVACAO_RECOMENDADA_COM_RESSALVA: "Aprovação recomendada · ressalva",
  BLOCKED: "Bloqueada", MONITORAR: "Em acompanhamento", DIVERGENCIA_ABERTA: "Divergência aberta" };
const estadoDe = (p, previa) => previa ? (ESTADO[p.estado_editorial] || p.estado_editorial || "Aguarda decisão") : "Aprovada no Human Gate";

// ── linha do tempo: um gráfico por candidato, pontos na data real de publicação, barra da margem declarada ──
function tempo(ps, jan, cands, tipo) {
  const dias = []; for (let d = new Date(jan.de + "T12:00:00Z"); d <= new Date(jan.ate + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) dias.push(d.toISOString().slice(0, 10));
  const W = 640, H = 200, L = 40, R = 10, T = 12, B = 26, bw = (W - L - R) / dias.length;
  const val = (p, c) => tipo === "validos" ? (validos(p).v || {})[c] : (p.votos_totais || {})[c];
  const vs = ps.flatMap(p => cands.map(c => val(p, c)).filter(v => v != null).flatMap(v => [v - (p.margem_pp || 0), v + (p.margem_pp || 0)]));
  if (!vs.length) return `<p class="empty">Sem ${tipo === "validos" ? "votos válidos" : "votos totais"} publicados nas pesquisas aprovadas.</p>`;
  const lo = Math.max(0, Math.floor((Math.min(...vs) - 1) / 5) * 5), hi = Math.min(100, Math.ceil((Math.max(...vs) + 1) / 5) * 5);
  const y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const porDia = {}; for (const p of ps) (porDia[p.divulgacao] ||= []).push(p);
  for (const k in porDia) porDia[k].sort((a, b) => (a.publicado_em || "").localeCompare(b.publicado_em || "") || a.instituto.localeCompare(b.instituto));
  const xDe = p => { const i = dias.indexOf(p.divulgacao), g = porDia[p.divulgacao], j = g.indexOf(p), k = g.length, step = Math.min(9, bw / (k + 1)); return L + i * bw + bw / 2 + (j - (k - 1) / 2) * step; };
  const grade = []; for (let v = lo; v <= hi; v += 5) grade.push(`<line class="gr" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ax" x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}%</text>`);
  const eixo = dias.map((d, i) => `<text class="ax" x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${dBR(d)}</text>`).join("");
  return cands.map(c => `<figure class="pq-g"><figcaption>${esc(nome(c))} <small>· ${tipo === "validos" ? "votos válidos" : "votos totais"}</small></figcaption>
<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(nome(c))}: cada ponto é uma pesquisa, na data em que foi publicada">${grade.join("")}${eixo}${ps.map((p, i) => {
    const v = val(p, c); if (v == null) return "";
    const x = xDe(p).toFixed(1), m = p.margem_pp || 0, y0 = y(Math.min(100, v + m)).toFixed(1), y1 = y(Math.max(0, v - m)).toFixed(1);
    return `<g class="pt" data-i="${i}" tabindex="0" role="img" aria-label="${esc(`${p.instituto}, publicada em ${dBR(p.divulgacao)}: ${nome(c)} ${f1(v)}`)}"><line x1="${x}" x2="${x}" y1="${y0}" y2="${y1}"/><circle cx="${x}" cy="${y(v).toFixed(1)}" r="5"/><rect class="hit" x="${(+x - 9).toFixed(1)}" y="${(y(v) - 12).toFixed(1)}" width="18" height="24"/></g>`;
  }).join("")}</svg></figure>`).join("");
}

function linha(p, i, cands, previa) {
  const V = validos(p), m = p.metodo || "—", mt = metodoTipo(p.metodo);
  const docs = [`<a href="${esc(p.url_original)}" rel="noopener">publicação original</a>`, ...(p.documentos || []).filter(d => d.url !== p.url_original).map(d => `<a href="${esc(d.url)}" rel="noopener">${esc(d.rotulo || "documento")}</a>`)];
  const hashes = (p.documentos || []).filter(d => d.sha256).map(d => `<code title="SHA-256 da cópia preservada">${esc(d.sha256.slice(0, 12))}…</code>`);
  const ret = (p.retificacoes || []).length ? p.retificacoes.map(r => `${esc(r.campo)}: ${esc(r.antes)} → ${esc(r.depois)}${r.em ? ` (${dBR(r.em)})` : ""}`).join("; ") : "Nenhuma no PesqEle";
  return `<tr data-i="${i}" data-inst="${esc(p.instituto)}" data-dia="${esc(p.divulgacao)}" data-metodo="${esc(mt)}" data-reg="${esc(p.registro_pesqele)}"${p.contexto ? ' data-ctx="1"' : ""}>
<th scope="row" data-l="Instituto">${esc(p.instituto)}${p.contratante ? `<small>para ${esc(p.contratante)}</small>` : ""}${p.contexto ? '<small class="pq-ctx">antes da janela · contexto</small>' : ""}</th>
<td data-l="Registro (PesqEle)">${esc(p.registro_pesqele)}</td><td data-l="Campo">${dBR(p.campo_inicio)}–${dBR(p.campo_fim)}</td>
<td data-l="Publicação">${dBR(p.divulgacao)}${hBR(p.publicado_em) ? `<small>${hBR(p.publicado_em)}${p.fonte_divulgacao ? " · " + esc(p.fonte_divulgacao) : ""}</small>` : p.fonte_divulgacao ? `<small>${esc(p.fonte_divulgacao)}</small>` : ""}</td>
<td data-l="Entrevistas">${fI(p.amostra_n)}<small>${p.margem_pp == null ? "margem —" : `±${String(p.margem_pp).replace(".", ",")} p.p.`}${p.confianca_pct ? ` · ${String(p.confianca_pct).replace(".", ",")}%` : ""}</small></td>` +
    cands.map(c => `<td data-l="${esc(nome(c))}" class="pq-v"><span class="tt">${f1((p.votos_totais || {})[c])}</span><span class="vv">${f1(V.v && V.v[c])}${V.calc && V.v ? "<small>calculado</small>" : ""}</span></td>`).join("") +
    `<td data-l="Branco/nulo · indecisos">${f1(p.branco_nulo)}<small>${f1(p.indecisos)} indecisos${p.nao_votariam != null ? ` · ${f1(p.nao_votariam)} não votariam` : ""}</small></td>
<td data-l="Situação">${esc(estadoDe(p, previa))}</td>
<td data-l="Metodologia e documentos"><details class="pq-met"><summary>Ver</summary><dl><dt>Método</dt><dd>${esc(mt)} · ${esc(m)}</dd><dt>Universo</dt><dd>${esc(p.universo || "—")}</dd><dt>Documentos</dt><dd>${docs.join(" · ")}${hashes.length ? `<br>${hashes.join(" ")}` : ""}</dd><dt>Retificações</dt><dd>${ret}</dd></dl></details></td></tr>`;
}

function referencia(R) {
  if (!R) return "";
  const res = (R.resultados_oficiais || []).map(r => `<tbody><tr><th scope="row" rowspan="${r.candidatos.length}">${esc(r.rotulo)}<small>${esc(r.data ? dBR(r.data) + "/" + r.data.slice(0, 4) : "")}</small></th>${r.candidatos.map((c, i) => `${i ? "<tr>" : ""}<td>${esc(c.nome)}</td><td>${fI(c.votos)}</td><td>${Number(c.pct_validos).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td></tr>`).join("")}</tbody>`).join("");
  const ps = R.pesquisas || [];
  const cands = [...new Set(ps.flatMap(p => Object.keys(p.votos_totais || {})))];
  const pesq = ps.length ? `<div class="qtable pq-tab" tabindex="0" role="region" aria-label="Pesquisas de 2022 (role para os lados)"><table><thead><tr><th scope="col">Instituto</th><th scope="col">Campo</th><th scope="col">Publicação</th><th scope="col">Entrevistas</th>${cands.map(c => `<th scope="col">${esc(nome(c))} · totais</th>`).join("")}${cands.map(c => `<th scope="col">${esc(nome(c))} · válidos</th>`).join("")}</tr></thead><tbody>${
    ps.map(p => { const V = validos(p); return `<tr><th scope="row">${esc(p.instituto)}</th><td>${dBR(p.campo_inicio)}–${dBR(p.campo_fim)}/2022</td><td><a href="${esc(p.url_original)}" rel="noopener">${dBR(p.divulgacao)}/2022</a></td><td>${fI(p.amostra_n)}</td>${cands.map(c => `<td>${f1((p.votos_totais || {})[c])}</td>`).join("")}${cands.map(c => `<td>${f1(V.v && V.v[c])}${V.calc && V.v ? "<small>calculado</small>" : ""}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`
    : `<p class="empty">Pesquisas de 2022 do mesmo período ainda em conferência: cada uma só aparece depois de revisão humana.</p>`;
  return `<section class="pq-ref" aria-labelledby="t-pq22"><p class="kick">Referência · outra eleição</p><h3 id="t-pq22">2022: pesquisas dos dez dias anteriores ao 2º turno e o resultado oficial</h3>
<p class="sub">Outra eleição, outros candidatos e outro calendário (2º turno em 30/10/2022). Serve para situar a leitura, não para prever 2026 nem para dar nota a institutos.</p>
${res ? `<div class="qtable" tabindex="0" role="region" aria-label="Resultado oficial de 2022"><table><thead><tr><th scope="col">Turno</th><th scope="col">Candidato</th><th scope="col">Votos</th><th scope="col">% dos válidos</th></tr></thead>${res}</table></div>
<p class="note">Dado oficial (TSE). ${(R.resultados_oficiais || []).map(r => `${esc(r.rotulo)}: <a href="${esc(r.fonte_url)}" rel="noopener">${esc(r.fonte)}</a>.`).join(" ")}</p>` : ""}
${pesq}<ul class="pq-notas">${(R.notas || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>`;
}

// on = flag pesquisas_2t. opt.previa = só o protótipo interno (repositório privado): mostra cada pesquisa com o estado
// editorial dela, com faixa de prévia. O build público nunca passa previa.
export function section(D, on, opt = {}) {
  const jan = janela(D);
  const head = `<section class="area-pesq" aria-labelledby="t-pesq" id="pesquisas"${on ? ' data-voto="validos"' : ""}><h2 id="t-pesq">Institutos de pesquisa</h2>
<p class="sub">Pesquisa eleitoral não é resultado: é uma estimativa feita antes da votação, com margem de erro. Aqui só entra levantamento registrado no PesqEle (TSE) e conferido na publicação original.</p>`;
  if (!on) return head + `<p class="empty">Pesquisas em conferência. Esta seção mostra as pesquisas nacionais publicadas de ${dBR(jan.de)} a ${dBR(jan.ate)}, cada uma depois de revisão humana.</p></section>`;
  const previa = opt.previa === true;
  const todas = (D.pesquisas || []).filter(p => previa || aprovada(p)).sort((a, b) => (a.divulgacao + (a.publicado_em || "")).localeCompare(b.divulgacao + (b.publicado_em || "")) || a.instituto.localeCompare(b.instituto));
  const ps = todas.filter(p => p.divulgacao >= jan.de && p.divulgacao <= jan.ate);
  const cands = [...new Set(todas.flatMap(p => Object.keys(p.votos_totais || {})))];
  const insts = [...new Set(ps.map(p => p.instituto))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const sem = (D.institutos || []).filter(i => !ps.some(p => chave(p) === chave(i))).map(i => i.instituto + (i.modalidade ? ` (${i.modalidade})` : ""));
  const metodos = [...new Set(todas.map(p => metodoTipo(p.metodo)))].sort();
  const sync = `<p class="pq-sync"><span>Registros do PesqEle sincronizados em <b>${D.sincronizado_em ? esc(dBR(D.sincronizado_em.slice(0, 10)) + " " + hBR(D.sincronizado_em)) + " (UTC)" : "—"}</b></span> <span>Última atualização editorial: <b>${D.atualizado_editorial_em ? esc(dBR(D.atualizado_editorial_em.slice(0, 10))) : "nenhuma"}</b></span></p>
<p class="note pq-regra">Sincronizar registros não é divulgar pesquisa: uma data prevista no PesqEle não aparece aqui como resultado.</p>`;
  const filtros = `<form class="pq-filtros" aria-label="Filtrar pesquisas" onsubmit="return false">
<fieldset class="pq-voto"><legend>Tipo de voto</legend><label><input type="radio" name="voto" value="validos" checked> Válidos</label><label><input type="radio" name="voto" value="totais"> Totais</label></fieldset>
<fieldset class="pq-insts"><legend>Instituto</legend>${insts.map(i => `<label><input type="checkbox" name="inst" value="${esc(i)}" checked> ${esc(i)}</label>`).join("")}</fieldset>
<div class="pq-campos"><label>De <input type="date" name="de" min="${jan.de}" max="${jan.ate}" value="${jan.de}"></label><label>Até <input type="date" name="ate" min="${jan.de}" max="${jan.ate}" value="${jan.ate}"></label>
<label>Método <select name="metodo"><option value="">Todos</option>${metodos.map(m => `<option>${esc(m)}</option>`).join("")}</select></label>
<label>Registro <input type="search" name="reg" placeholder="BR-00000/2026" inputmode="search" autocomplete="off"></label>
<button type="reset">Limpar filtros</button></div><output class="pq-cont" aria-live="polite">${ps.length} de ${ps.length} pesquisas na janela</output></form>`;
  const corpo = ps.length ? `<div class="pq-graf"><div class="pq-tempo" data-tipo="validos">${tempo(ps, jan, cands, "validos")}</div><div class="pq-tempo" data-tipo="totais" hidden>${tempo(ps, jan, cands, "totais")}</div>
<div class="pq-tip" role="status" hidden></div></div>
<p class="note">Cada ponto é uma pesquisa, na data em que foi publicada; a barra vertical é a margem de erro declarada pelo instituto. Nada é desenhado entre as datas: dia sem ponto é dia sem pesquisa aprovada.</p>`
    : `<p class="empty">Nenhuma pesquisa aprovada na janela de ${dBR(jan.de)} a ${dBR(jan.ate)} até agora.</p>`;
  const tabela = todas.length ? `<div class="qtable pq-tab stack" tabindex="0" role="region" aria-label="Pesquisas do 2º turno (role para os lados)"><table><thead><tr><th scope="col">Instituto</th><th scope="col">Registro (PesqEle)</th><th scope="col">Campo</th><th scope="col">Publicação</th><th scope="col">Entrevistas · margem</th>${
    cands.map(c => `<th scope="col">${esc(nome(c))}<small class="tt">votos totais</small><small class="vv">votos válidos</small></th>`).join("")}<th scope="col">Branco/nulo · indecisos</th><th scope="col">Situação</th><th scope="col">Metodologia e documentos</th></tr></thead><tbody>${
    todas.map(p => linha(p, ps.indexOf(p), cands, previa)).join("")}</tbody></table></div>` : "";
  const dados = `<script type="application/json" class="pq-dados">${JSON.stringify(ps.map(p => ({ i: p.instituto, r: p.registro_pesqele, c: [p.campo_inicio, p.campo_fim], d: p.divulgacao, h: hBR(p.publicado_em), f: p.fonte_divulgacao || null,
    n: p.amostra_n, m: p.margem_pp, ic: p.confianca_pct, me: metodoTipo(p.metodo), mx: p.metodo || null, ct: p.contratante || null, t: p.votos_totais, v: validos(p).v, vc: validos(p).calc }))).replace(/</g, "\\u003c")}</script>`;
  return head + (previa ? `<p class="pq-previa">PRÉVIA INTERNA · NÃO APROVADO · NÃO PUBLICAR · as situações abaixo são as do Human Gate privado</p>` : "") + sync + filtros + corpo + tabela + dados +
    (sem.length ? `<p class="note">Sem pesquisa aprovada na janela: ${sem.map(esc).join(" · ")}.</p>` : "") +
    `<p class="note">Votos totais: como o instituto publicou. Válidos: os publicados pelo instituto; quando ele não publicou, "calculado" = candidato ÷ soma dos candidatos, sem redistribuir brancos, nulos e indecisos. Não fazemos média, não juntamos pesquisas, não projetamos resultado e não damos nota a institutos. Comparação com o resultado oficial só depois da totalização final do TSE, com revisão humana.</p>` +
    referencia(D.referencia_2022) + "</section>";
}
