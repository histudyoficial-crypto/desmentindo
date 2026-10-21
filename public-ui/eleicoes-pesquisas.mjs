// Eleições 2026 · 2º turno · Institutos de pesquisa. Seção estática gerada no build a partir de
// public-ui/eleicoes_pesquisas_2t.json. Só entra pesquisa aprovada no Human Gate (aprovado + decision_ref) com registro
// no PesqEle e publicação original; qualquer outra coisa falha fechado. Desligada (flag pesquisas_2t), a seção só explica
// o que vai aparecer. Pesquisa não é resultado; erro das pesquisas só depois da totalização final e com revisão humana.
const REG = /^BR-\d{5}\/2026$/, DIA = /^2026-\d\d-\d\d$/;
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const f1 = n => n == null ? "—" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
const fI = n => n == null ? "—" : Number(n).toLocaleString("pt-BR");
const dBR = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "—";
export const chave = p => `${p.instituto}|${p.modalidade || ""}`;

export function validate(D) {
  const err = [];
  const inst = new Set((D.institutos || []).map(chave));
  if (inst.size !== (D.institutos || []).length) err.push("INSTITUTO_DUPLICADO");
  const seen = new Set();
  for (const p of D.pesquisas || []) {
    const id = `${p.instituto} ${p.registro_pesqele || "?"}`;
    if (p.aprovado !== true || !/\S/.test(p.decision_ref || "")) err.push("PESQUISA_SEM_HUMAN_GATE " + id);
    if (!inst.has(chave(p))) err.push("INSTITUTO_NAO_NORMALIZADO " + id);
    if (!REG.test(p.registro_pesqele || "")) err.push("REGISTRO_PESQELE_INVALIDO " + id);
    if (!/^https:\/\//.test(p.url_original || "")) err.push("SEM_PUBLICACAO_ORIGINAL " + id);
    for (const k of ["campo_inicio", "campo_fim", "divulgacao"]) if (!DIA.test(p[k] || "")) err.push(`DATA_INVALIDA ${k} ${id}`);
    if (p.campo_fim < p.campo_inicio || p.divulgacao < p.campo_fim) err.push("DATAS_INCOERENTES " + id);
    if (p.divulgacao > "2026-10-24") err.push("DIVULGADA_DEPOIS_DE_24_10 " + id);
    const vt = p.votos_totais || {};
    if (!Object.keys(vt).length || Object.values(vt).some(v => v != null && (typeof v !== "number" || v < 0 || v > 100))) err.push("VOTOS_TOTAIS_INVALIDOS " + id);
    if (p.erro_2t != null) err.push("ERRO_2T_ANTES_DO_RESULTADO " + id);   // erro só depois do tf=s, em outra revisão
    const k = chave(p) + "|" + p.registro_pesqele; if (seen.has(k)) err.push("PESQUISA_DUPLICADA " + id); seen.add(k);
  }
  return err;
}

// válidos: os publicados pela fonte; se a fonte não publicou, candidato / soma dos candidatos (sem redistribuir nada).
export function validos(p) {
  if (p.votos_validos && Object.keys(p.votos_validos).length) return { v: p.votos_validos, calc: false };
  const c = Object.entries(p.votos_totais || {}); if (c.some(([, v]) => v == null)) return { v: null, calc: true };
  const s = c.reduce((a, [, v]) => a + v, 0); if (!s) return { v: null, calc: true };
  return { v: Object.fromEntries(c.map(([k, v]) => [k, Math.round(v / s * 1000) / 10])), calc: true };
}

export function section(D, on) {
  const head = `<section class="area-pesq" aria-labelledby="t-pesq" id="pesquisas"><h2 id="t-pesq">Institutos de pesquisa</h2>
<p class="sub">Pesquisa eleitoral não é resultado: é uma estimativa feita antes da votação, com margem de erro. Aqui só entra levantamento registrado no PesqEle (TSE) e conferido na publicação original.</p>`;
  if (!on) return head + `<p class="empty">Pesquisas em conferência. Esta seção mostra a última pesquisa de cada instituto divulgada até 24/10, depois de revisão humana.</p></section>`;
  const last = new Map();
  for (const p of (D.pesquisas || []).filter(p => p.divulgacao >= D.semana.de && p.divulgacao <= D.semana.ate))
    if (!last.has(chave(p)) || last.get(chave(p)).divulgacao < p.divulgacao) last.set(chave(p), p);
  const cands = [...new Set((D.pesquisas || []).flatMap(p => Object.keys(p.votos_totais || {})))];
  const rows = D.institutos.map(i => {
    const p = last.get(chave(i)), nome = esc(i.instituto) + (i.modalidade ? ` <small>${esc(i.modalidade)}</small>` : "");
    if (!p) return `<tr><th scope="row">${nome}</th><td colspan="${6 + cands.length * 2}">Sem nova pesquisa confirmada nesta semana</td></tr>`;
    const V = validos(p);
    return `<tr><th scope="row">${nome}${p.contratante ? `<small>para ${esc(p.contratante)}</small>` : ""}</th><td>${dBR(p.campo_inicio)}–${dBR(p.campo_fim)}</td><td>${dBR(p.divulgacao)}</td>` +
      `<td><a href="${esc(p.url_original)}" rel="noopener">${esc(p.registro_pesqele)}</a></td><td>${fI(p.amostra_n)}${p.metodo ? `<small>${esc(p.metodo)}</small>` : ""}</td><td>±${p.margem_pp == null ? "—" : String(p.margem_pp).replace(".", ",")} p.p.${p.confianca_pct ? `<small>${p.confianca_pct}% de confiança</small>` : ""}</td>` +
      cands.map(c => `<td>${f1((p.votos_totais || {})[c])}</td>`).join("") + `<td>${f1(p.branco_nulo)}<small>${f1(p.indecisos)} indecisos</small></td>` +
      cands.map(c => `<td>${f1(V.v && V.v[c])}${V.calc && V.v ? "<small>calculado</small>" : ""}</td>`).join("") + "</tr>";
  }).join("");
  return head + `<div class="qtable" tabindex="0" role="region" aria-label="Pesquisas do 2º turno (role para os lados)"><table><thead><tr><th scope="col">Instituto</th><th scope="col">Campo</th><th scope="col">Divulgação</th><th scope="col">Registro (PesqEle)</th><th scope="col">Entrevistas</th><th scope="col">Margem</th>` +
    cands.map(c => `<th scope="col">${esc(c)} · votos totais</th>`).join("") + `<th scope="col">Branco/nulo</th>` + cands.map(c => `<th scope="col">${esc(c)} · válidos</th>`).join("") + `</tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Votos totais: como o instituto publicou. Válidos: os publicados pelo instituto; quando ele não publicou, "calculado" = candidato ÷ soma dos candidatos, sem redistribuir brancos, nulos e indecisos. Comparação com o resultado oficial só depois da totalização final do TSE, com revisão humana. Não ordenamos institutos nem damos nota a eles.</p></section>`;
}
