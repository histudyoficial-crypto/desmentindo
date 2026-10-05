/* Eleições 2026 · Desmentindo — explorador territorial + linha do tempo + camada de auditoria.
 *
 * Regras (decisões de 04/10 e 05/10/2026):
 * - RESULTADO vem só dos arquivos públicos do TSE (resultados.tse.jus.br), lidos no navegador. Nada é somado ou estimado
 *   para formar resultado. O que é calculado aqui (ex.: % de uma seção a partir do boletim, defasagem de atualização)
 *   aparece rotulado como "Métrica calculada pelo Eleições 2026", separado de "Dado oficial (TSE)".
 * - Nenhum número de 2026 antes das 17:00 de Brasília. Desconhecido = "—", nunca 0. Final só com tf = "s".
 * - Uma seção do cadastro oficial nunca some; cada seção tem estado explícito (eleicoes-core.js). Ausência de arquivo
 *   nunca é apresentada como suspeita e o motivo nunca é inferido.
 * - Linha do tempo sem interpolação: só os registros existentes; entre eles, "sem registro".
 * - Não prevê vencedor. O eixo é candidato/partido/votos, como o TSE publica.
 * - "Ao vivo" só quando a última leitura do TSE é recente; senão "Dados locais atualizados até hh:mm:ss".
 * - Dados opcionais (locais de votação; métricas calculadas como ordem de chegada) só carregam quando o build liga
 *   data-locais / data-calc. Desligados, a interface os esconde — nada é inventado.
 */
(function () {
  "use strict";
  var C = window.EleicoesCore;
  var BASE = window.__ELEICOES_BASE || "https://resultados.tse.jus.br/oficial/ele2026";
  var ELE = "6257", ELE6 = "006257", PLEITO = "3220", PLE6 = "003220", CARGO = "0001", ELE_NUM = 6257;
  var RELEASE = Date.parse("2026-10-04T20:00:00Z"); // 17:00 BRT
  var SNAP_URL = window.__ELEICOES_SNAP || "https://raw.githubusercontent.com/histudyoficial-crypto/desmentindo/eleicoes-2026-dados/presidente-br.json";
  var POLL_MS = 90000, MAP_MS = 180000;
  var B = document.body;
  var SCOPE = B.getAttribute("data-scope") || "br";
  var CALC = window.__ELEICOES_CALC || (B.getAttribute("data-calc") === "on" ? "/eleicoes-2026/calculado/" : null);
  var LOCAIS = window.__ELEICOES_LOCAIS || (B.getAttribute("data-locais") === "on" ? "/eleicoes-2026/locais/" : null);
  var NOW = function () { return window.__ELEICOES_NOW ? window.__ELEICOES_NOW() : Date.now(); };
  var L = { audit: "Auditoria", auditSec: "Auditoria da seção" };   // nomes públicos num só lugar (decisão editorial)

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var int = function (v) { if (v == null) return null; var s = String(v).replace(/\D/g, ""); return s ? parseInt(s, 10) : null; };
  var pct = function (v) { if (v == null || String(v).trim() === "") return null; var n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
  var fInt = function (n) { return n == null ? "—" : n.toLocaleString("pt-BR"); };
  var fPct = function (n, d) { return n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + "%"; };
  var pair = function (o) { return o.v == null && o.p == null ? "—" : fInt(o.v) + " <small>" + fPct(o.p) + "</small>"; };
  var hhmm = function (ms) { return new Date(ms - 3 * 3600e3).toISOString().slice(11, 16); };
  var hhmmss = function (ms) { return new Date(ms - 3 * 3600e3).toISOString().slice(11, 19); };
  var norm = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var OFICIAL = '<span class="prov of" title="Número publicado pela Justiça Eleitoral">Dado oficial (TSE)</span>';
  var CALCULADO = '<span class="prov calc" title="Conta feita por esta página a partir de arquivos oficiais; não é número publicado pelo TSE">Métrica calculada pelo Eleições 2026</span>';
  function track(name, data) { try { if (window.umami && window.umami.track) window.umami.track(name, data); } catch (e) { /* nunca quebra */ } }

  var UFN = { ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo",
    go: "Goiás", ma: "Maranhão", mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba", pr: "Paraná",
    pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro", rn: "Rio Grande do Norte", rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima",
    sc: "Santa Catarina", sp: "São Paulo", se: "Sergipe", to: "Tocantins", zz: "Exterior" };

  // ---------------------------------------------------------------- leitura do TSE
  function resultUrl(uf, mun) { return BASE + "/" + ELE + "/dados/" + uf + "/" + uf + (mun || "") + "-c" + CARGO + "-e" + ELE6 + "-u.json"; }
  function getJSON(url) {   // 404/403 nunca viram dado; o chamador decide o estado
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (r.status === 404) return { notYet: true, status: 404 };
      if (r.status === 403 || r.status === 429) return { refused: true, status: r.status };
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function getOptional(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function flat(d) {
    if (!d || d.notYet || d.refused) return d || { notYet: true };
    if (!d.carg) return { cand: [] };
    var cg = d.carg.filter(function (c) { return int(c.cd) === int(CARGO); })[0], S = d.s || {}, E = d.e || {}, V = d.v || {};
    if (!cg || !(int(S.st) > 0)) return { cand: [] };
    var cand = [];
    (cg.agr || []).forEach(function (a) { (a.par || []).forEach(function (p) { (p.cand || []).forEach(function (c) {
      cand.push({ sqcand: c.sqcand, n: c.n, nm: c.nmu || c.nm, cc: p.sg, vap: c.vap, pvap: c.pvap, seq: c.seq, st: c.st });
    }); }); });
    return { cand: cand, tf: d.tf, pst: S.pst, st: S.st, s: S.ts, dt: d.dt, ht: d.ht, dg: d.dg, hg: d.hg, c: E.c, pc: E.pc, vb: V.vb, pvb: V.pvb, tvn: V.tvn, ptvn: V.ptvn, vv: V.vv };
  }
  function getResult(url) { return getJSON(url).then(flat); }
  function brtMs(dd, hh) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dd || ""), t = /^(\d{2}):(\d{2}):(\d{2})$/.exec(hh || "");
    return m && t ? Date.UTC(+m[3], +m[2] - 1, +m[1], +t[1] + 3, +t[2], +t[3]) : null; }
  // dt/ht vem no fuso do local (AC, AM…, exterior); dg/hg é Brasília. Só mostra dt/ht se for compatível com a geração.
  function tseWhen(d) {
    var tot = brtMs(d.dt, d.ht), gen = brtMs(d.dg, d.hg);
    if (tot != null && (gen == null || (tot <= gen + 5 * 60e3 && tot >= gen - 10 * 60e3))) return { ms: tot, txt: "Totalizado pelo TSE em " + d.dt.slice(0, 5) + " " + d.ht };
    if (gen != null) return { ms: gen, txt: "Arquivo gerado pelo TSE em " + d.dg.slice(0, 5) + " " + d.hg + " (Brasília)" };
    return null;
  }
  function parseResult(d) {
    var cands = (d.cand || []).map(function (c) {
      return { id: c.sqcand, n: c.n, name: c.nm, party: c.cc, votes: int(c.vap), pct: pct(c.pvap), order: int(c.seq), st: c.st || "" };
    }).sort(function (a, b) { return (b.votes || 0) - (a.votes || 0) || (a.order || 99) - (b.order || 99); });
    return { final: String(d.tf || "").toLowerCase() === "s", pst: pct(d.pst), st: int(d.st), s: int(d.s), when: tseWhen(d),
      turnout: { v: int(d.c), p: pct(d.pc) }, blank: { v: int(d.vb), p: pct(d.pvb) }, nul: { v: int(d.tvn), p: pct(d.ptvn) }, valid: int(d.vv), cands: cands };
  }

  // ---------------------------------------------------------------- modo Resultados | Auditoria
  function setMode(m, user) {
    B.setAttribute("data-mode", m);
    ["mRes", "mAud"].forEach(function (id) { var b = $(id); if (b) b.setAttribute("aria-pressed", String((id === "mAud") === (m === "auditoria"))); });
    document.querySelectorAll("details.tec").forEach(function (d) { d.open = m === "auditoria"; });
    try { localStorage.setItem("eleicoes-modo", m); } catch (e) { /* sem armazenamento: segue */ }
    if (user) track("ELEICOES_MODO", { modo: m });
    if (m === "auditoria") loadCalc();
  }

  // ---------------------------------------------------------------- cartões de situação (dinâmicos)
  var live = { at: 0, ok: false, R: null };
  function cards() {
    var el = $("status"); if (!el) return;
    var R = live.R, fresh = live.ok && NOW() - live.at < 2 * POLL_MS + 15000;
    var pend = R && R.s != null && R.st != null ? R.s - R.st : null;
    el.innerHTML =
      card("Situação", R ? (R.final ? "Final" : "Parcial") : "—", R ? (R.final ? "Totalização final marcada pelo TSE" : "Ainda não é o resultado final") : "Aguardando o TSE", R && R.final ? "final" : "parcial", OFICIAL) +
      card("Seções totalizadas", R ? fPct(R.pst) : "—", R ? fInt(R.st) + " de " + fInt(R.s) : "—", "", OFICIAL) +
      card("Faltam totalizar", pend == null ? "—" : fInt(pend), pend == null ? "—" : pend === 0 ? "Nenhuma seção" : "seções neste recorte", "", OFICIAL) +
      card("Última atualização do TSE", R && R.when ? hhmm(R.when.ms) : "—", R && R.when ? R.when.txt : "Horário não informado", "", OFICIAL) +
      card(fresh ? "Leitura ao vivo" : "Leitura desta página", live.at ? hhmmss(live.at) : "—",
        live.at ? (fresh ? "Lida do TSE agora; nova leitura a cada 90 s" : "Dados locais atualizados até " + hhmmss(live.at)) : "Ainda sem leitura", fresh ? "vivo" : "", "");
  }
  function card(k, v, s, cls, prov) { return '<div class="card ' + (cls || "") + '"><p class="k">' + esc(k) + '</p><p class="v">' + esc(v) + '</p><p class="s">' + esc(s) + "</p>" + (prov ? '<p class="p">' + prov + "</p>" : "") + "</div>"; }

  // ---------------------------------------------------------------- placar
  function board(R, el, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, R.cands.map(function (c) { return c.pct || 0; }).concat([1]));
    var status = R.final ? '<span class="st st-final">Totalização final · TSE</span>' : '<span class="st st-partial">Parcial · ' + fPct(R.pst) + " das seções</span>";
    el.innerHTML = (opts.title ? '<h3 class="btitle">' + esc(opts.title) + "</h3>" : "") +
      '<div class="board-head">' + status + '<p class="when">' + (R.when ? esc(R.when.txt) : "Horário do TSE não informado") + "</p></div>" +
      '<ol class="cands">' + R.cands.map(function (c, i) {
        var top = opts.compact ? 3 : 5;
        if (i === top) return '</ol><details class="maiscands"><summary>Ver todos os ' + R.cands.length + ' candidatos</summary><ol class="cands" start="' + (top + 1) + '">' + candLi(c, max, R);
        return candLi(c, max, R);
      }).join("") + (R.cands.length > (opts.compact ? 3 : 5) ? "</ol></details>" : "</ol>") +
      (opts.compact ? "" : '<dl class="aux"><div><dt>Comparecimento</dt><dd>' + pair(R.turnout) + "</dd></div><div><dt>Brancos</dt><dd>" + pair(R.blank) +
      "</dd></div><div><dt>Nulos</dt><dd>" + pair(R.nul) + "</dd></div><div><dt>Votos válidos</dt><dd>" + fInt(R.valid) + "</dd></div></dl>") +
      '<p class="src">' + OFICIAL + ' <a href="' + esc(opts.url) + '" target="_blank" rel="noopener">arquivo oficial</a>. Percentuais sobre votos válidos, como o TSE publica.</p>';
  }
  function candLi(c, max, R) {
    var w = c.pct == null ? 0 : Math.max(0.5, c.pct / max * 100);
    return '<li><div class="cn"><span class="nm">' + esc(c.name) + '</span><span class="pt">' + esc(c.party || "") + " · " + esc(c.n || "") + "</span></div>" +
      '<div class="cv"><b>' + fPct(c.pct) + "</b><span>" + fInt(c.votes) + " votos</span></div>" +
      '<div class="bar" aria-hidden="true"><i style="width:' + w.toFixed(2) + '%"></i></div>' +
      (R.final && c.st ? '<p class="cst">Situação informada pelo TSE: ' + esc(c.st) + "</p>" : "") + "</li>";
  }
  var current = { timer: 0, snapSel: null };
  function loadCurrent() {
    var el = $("placar"), url = resultUrl(SCOPE);
    if (NOW() < RELEASE) return;
    return getResult(url).then(function (d) {
      if (d.refused) throw new Error("recusado");
      if (d.notYet || !(d.cand && d.cand.length)) {
        if (!live.R) el.innerHTML = '<p class="empty">O TSE ainda não publicou totalização para este recorte. Nova leitura a cada 90 segundos.</p>';
        live.at = NOW(); live.ok = true; cards(); return;
      }
      live.R = parseResult(d); live.at = NOW(); live.ok = true;
      if (current.snapSel == null) board(live.R, el, { url: url, compact: SCOPE !== "br" && !!st.m });
      $("stale").hidden = true; cards(); renderFalta();
    }).catch(function () {
      live.ok = false; cards();
      if (live.R) { $("stale").hidden = false; $("stale").textContent = "Sem leitura nova desde " + hhmmss(live.at) + ": não foi possível ler o TSE agora. Os números são dessa hora."; }
      else el.innerHTML = '<p class="empty">Não foi possível ler o TSE agora. Nova tentativa em 90 segundos.</p>';
    });
  }

  // ---------------------------------------------------------------- mapa por UF (Brasil) com camadas
  var GRID = [["rr",0,1],["ap",0,3],["am",1,1],["pa",1,2],["ma",1,3],["ce",1,4],["rn",1,5],["ac",2,0],["ro",2,1],["to",2,2],
    ["pi",2,3],["pb",2,4],["pe",2,5],["mt",3,1],["go",3,2],["df",3,3],["ba",3,4],["al",3,5],["ms",4,1],["mg",4,2],["es",4,3],
    ["se",4,4],["pr",5,1],["sp",5,2],["rj",5,3],["sc",6,1],["rs",7,1]];
  var PALETTE = ["#2A6F77", "#B5651D", "#6B4E9B", "#4F7A28", "#8C3B5E", "#3D5A80", "#7A6A2F", "#A04A3A"];
  var SEQ = ["#F1EFEE", "#D9D4D0", "#B9B1AB", "#958A83", "#6E625C", "#463C38"];   // escala neutra (cedo → tarde / pouco → muito)
  var map = { data: {}, color: {}, at: 0, layer: "lider" };
  function lead(R) { var c = R.cands.filter(function (x) { return x.pct != null; }); return c.length ? { c: c[0], tie: c.length > 1 && c[1].pct === c[0].pct } : null; }
  function colorOf(c) { if (!(c.id in map.color)) map.color[c.id] = PALETTE[Object.keys(map.color).length % PALETTE.length]; return map.color[c.id]; }
  function seq(v, lo, hi) { if (v == null) return null; var k = Math.max(0, Math.min(SEQ.length - 1, Math.floor((v - lo) / (hi - lo) * SEQ.length))); return SEQ[k]; }
  function renderMap() {
    var el = $("mapa"); if (!el) return;
    var past = current.snapSel != null, lay = map.layer, calc = calcData && calcData.uf;
    var cells = GRID.map(function (g) {
      var uf = g[0], R = map.data[uf], Ld = R && lead(R), bg = "", txt = "—", label = UFN[uf] + ": ", cls = "";
      if (past) { cls = " nodata past"; label += "sem registro por estado neste instante"; txt = "s/ reg."; }
      else if (lay === "lider") {
        if (Ld && !Ld.tie) { bg = colorOf(Ld.c); txt = fPct(Ld.c.pct); label += Ld.c.name + (R.final ? " mais votado" : " à frente na parcial") + " com " + fPct(Ld.c.pct); }
        else if (Ld) { cls = " tie"; txt = "empate"; label += "empate na parcial"; } else { cls = " nodata"; label += "sem dado do TSE ainda"; }
      } else if (lay === "tot") {
        if (R) { bg = seq(100 - (R.pst || 0), 0, 1); txt = R.final ? "final" : fPct(R.pst, 1); label += fPct(R.pst) + " das seções totalizadas"; cls = " seqc"; } else { cls = " nodata"; label += "sem dado do TSE ainda"; }
      } else if (lay === "late") {
        var u = calc && calc[uf];
        if (u && u.late15_pct != null) { bg = seq(u.late15_pct, 0, 45); txt = fPct(u.late15_pct, 1); label += fPct(u.late15_pct, 1) + " das seções entre as 15% que chegaram por último"; cls = " seqc"; }
        else { cls = " nodata"; label += "sem métrica calculada"; }
      }
      return '<a class="tile' + cls + '" href="/eleicoes-2026/' + uf + '/" style="grid-row:' + (g[1] + 1) + ";grid-column:" + (g[2] + 1) + (bg ? ";background:" + bg : "") + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"><b>' + uf.toUpperCase() + "</b><span>" + esc(txt) + "</span></a>";
    }).join("");
    var leg = "";
    if (past) leg = '<p class="note">Você está vendo um registro passado da linha do tempo. Só existe registro do Brasil; por estado não há registro deste instante, então o mapa não inventa cor. <button type="button" class="linkbtn" data-live>Voltar ao agora</button></p>';
    else if (lay === "lider") {
      var seen = {}, lg = GRID.map(function (g) { var R = map.data[g[0]], x = R && lead(R); return x && !x.tie ? x.c : null; }).filter(function (c) { if (!c || seen[c.id]) return false; seen[c.id] = 1; return true; });
      leg = '<ul class="mlegend">' + lg.map(function (c) { return '<li><i style="background:' + colorOf(c) + '"></i>' + esc(c.name) + "</li>"; }).join("") + '<li><i class="nodata"></i>Sem dado do TSE</li></ul>' +
        '<p class="note">' + OFICIAL + " Cores pela ordem do TSE na cédula, sem relação com partido ou lado. Quadrados do mesmo tamanho: mostra quem está à frente em cada estado, não quantos votos cada estado tem. Leitura às " + (map.at ? hhmm(map.at) : "—") + ".</p>";
    } else if (lay === "tot") leg = scaleLegend("menos falta", "mais falta") + '<p class="note">' + OFICIAL + " Escala neutra pelo que falta totalizar em cada estado.</p>";
    else leg = scaleLegend("chegou antes", "chegou depois") + '<p class="note">' + CALCULADO + " Parte das seções do estado que estão entre as 15% últimas a chegar no país (pelo horário de recebimento do arquivo de cada seção). Informação logística: não diz nada sobre votos.</p>";
    el.innerHTML = '<div class="grid-map">' + cells + "</div>" + leg;
  }
  function scaleLegend(a, b) { return '<div class="scale" aria-hidden="true"><span>' + esc(a) + "</span>" + SEQ.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "<span>" + esc(b) + "</span></div>"; }
  function mapTable() {
    var list = $("mapaLista"); if (!list) return;
    var rows = Object.keys(UFN).filter(function (u) { return u !== "zz"; }).sort(function (a, b) { return UFN[a].localeCompare(UFN[b], "pt-BR"); }).map(function (uf) {
      var R = map.data[uf], Ld = R && lead(R);
      return '<tr><th scope="row"><a href="/eleicoes-2026/' + uf + '/">' + esc(UFN[uf]) + "</a></th><td>" + (Ld ? (Ld.tie ? "empate" : esc(Ld.c.name)) : "—") + "</td><td>" + (Ld && !Ld.tie ? fPct(Ld.c.pct) : "—") + "</td><td>" + (R ? (R.final ? "final" : fPct(R.pst)) : "—") + "</td></tr>";
    }).join("");
    list.innerHTML = '<details class="tablewrap"><summary>Ver todos os estados em tabela</summary><table class="uftab"><thead><tr><th scope="col">Estado</th><th scope="col">À frente</th><th scope="col">%</th><th scope="col">Totalizado</th></tr></thead><tbody>' + rows + "</tbody></table></details>";
  }
  function loadMap() {
    if (!$("mapa") || NOW() < RELEASE) return Promise.resolve();
    var ufs = Object.keys(UFN).filter(function (u) { return u !== "zz"; }), i = 0;
    function next() {
      if (i >= ufs.length) return Promise.resolve();
      var uf = ufs[i++];
      return getResult(resultUrl(uf)).then(function (d) { if (!d.notYet && !d.refused && d.cand && d.cand.length) map.data[uf] = parseResult(d); }).catch(function () {}).then(next);
    }
    var w = []; for (var k = 0; k < 6; k++) w.push(next());
    return Promise.all(w).then(function () { map.at = NOW(); renderMap(); mapTable(); renderFalta(); });
  }

  // ---------------------------------------------------------------- "Quem ainda falta?" (sem previsão)
  var ufTree = null;   // cs.json da UF (na página da UF)
  function renderFalta() {
    var el = $("falta"); if (!el) return;
    if (SCOPE === "br") {
      var rows = Object.keys(map.data).map(function (uf) { var R = map.data[uf]; return { uf: uf, f: R.s != null && R.st != null ? R.s - R.st : null, R: R }; })
        .filter(function (x) { return x.f; }).sort(function (a, b) { return b.f - a.f; });
      if (!Object.keys(map.data).length) { el.innerHTML = '<p class="empty">Aguardando a leitura dos estados.</p>'; return; }
      el.innerHTML = rows.length ? '<ol class="falta">' + rows.slice(0, 10).map(function (x) {
        return '<li><a href="/eleicoes-2026/' + x.uf + '/"><b>' + esc(UFN[x.uf]) + "</b><span>" + fInt(x.f) + " seç" + (x.f === 1 ? "ão" : "ões") + " a totalizar · " + fPct(x.R.pst) + " feito</span></a></li>";
      }).join("") + "</ol>" + (rows.length > 10 ? '<p class="note">e mais ' + (rows.length - 10) + " estados.</p>" : "")
        : '<p class="empty">Nenhum estado com seção a totalizar, segundo os arquivos do TSE.</p>';
      el.innerHTML += '<p class="note">' + OFICIAL + " Contagem de seções ainda não totalizadas, como o TSE publica. Não é previsão: não dizemos o que essas seções vão mudar.</p>";
      return;
    }
    if (!ufTree) { el.innerHTML = '<p class="empty">Abra um município para carregar o cadastro de seções do estado, ou <button type="button" class="linkbtn" id="loadTree">carregue agora</button>.</p>';
      var lb = $("loadTree"); if (lb) lb.addEventListener("click", function () { secTree().then(renderFalta); }); return; }
    var mus = (ufTree.mu || []).map(function (mu) {
      var tot = 0, sem = 0;
      mu.zon.forEach(function (z) { z.sec.forEach(function (s) { var e = C.estadoCadastro(s, z.sec).estado; if (e !== "AGREGADA") { tot++; if (e === "PENDENTE") sem++; } }); });
      return { cd: mu.cd, nm: munName(mu.cd), tot: tot, sem: sem };
    }).filter(function (m) { return m.sem; }).sort(function (a, b) { return b.sem - a.sem; });
    el.innerHTML = (mus.length ? '<ol class="falta">' + mus.slice(0, 10).map(function (m) {
      return '<li><a href="#m=' + esc(m.cd) + '"><b>' + esc(m.nm) + "</b><span>" + fInt(m.sem) + " de " + fInt(m.tot) + " seções sem arquivo gerado</span></a></li>"; }).join("") + "</ol>"
      : '<p class="empty">Todas as seções principais deste estado têm arquivo gerado no cadastro oficial.</p>') +
      '<p class="note">' + OFICIAL + " Pelo cadastro de seções (data de geração do arquivo de cada seção). Seção agregada não entra: os votos dela estão na principal. Não é previsão.</p>";
  }

  // ---------------------------------------------------------------- linha do tempo (Brasil), sem interpolação
  var snaps = [];
  function loadSnaps() {
    var box = $("evolucao"); if (!box || NOW() < RELEASE) return;
    getOptional(SNAP_URL).then(function (d) {
      snaps = ((d && d.snapshots) || []).map(function (s) { s.t = Date.parse(s.tse_updated_at || s.captured_at); s.cap = Date.parse(s.captured_at); return s; });
      renderTimeline();
    });
  }
  function renderTimeline() {
    var box = $("evolucao"); if (!box) return;
    if (!snaps.length) { box.innerHTML = '<p class="empty">Nenhum registro ainda. O primeiro é gravado quando o TSE publica o primeiro resultado; depois, um por hora até o final.</p>'; return; }
    var t0 = RELEASE, t1 = Math.max(snaps[snaps.length - 1].t, t0 + 3600e3), W = 760, H = 230, Lm = 40, Rm = 16, T = 14, Bm = 40;
    var xs = function (t) { return Lm + (t - t0) / (t1 - t0) * (W - Lm - Rm); };
    var last = snaps[snaps.length - 1].candidates.slice().sort(function (a, b) { return (b.percentage || 0) - (a.percentage || 0); }).slice(0, 3);
    var top = 60, ys = function (p) { return T + (H - T - Bm) * (1 - Math.min(p, top) / top); };
    var cols = ["var(--ink)", "var(--blue-mid)", "var(--green-ink)"];
    var g = "", gaps = C.lacunas(snaps, 70 * 60e3);
    gaps.forEach(function (q) { g += '<rect class="gap" x="' + xs(q.de) + '" y="' + T + '" width="' + Math.max(1, xs(q.ate) - xs(q.de)) + '" height="' + (H - T - Bm) + '"><title>Sem registro entre ' + hhmm(q.de) + " e " + hhmm(q.ate) + "</title></rect>"; });
    for (var v = 0; v <= top; v += 20) g += '<line x1="' + Lm + '" x2="' + (W - Rm) + '" y1="' + ys(v) + '" y2="' + ys(v) + '" class="grid"/><text x="' + (Lm - 6) + '" y="' + (ys(v) + 4) + '" class="ax" text-anchor="end">' + v + "%</text>";
    for (var h = t0; h <= t1; h += 3600e3) g += '<text x="' + xs(h) + '" y="' + (H - 22) + '" class="ax" text-anchor="middle">' + hhmm(h) + "</text>";
    snaps.forEach(function (s, i) {
      g += '<line class="stem" x1="' + xs(s.t) + '" x2="' + xs(s.t) + '" y1="' + T + '" y2="' + (H - Bm) + '"/>';
      last.forEach(function (c, k) {
        var m = s.candidates.filter(function (x) { return x.candidate_id === c.candidate_id; })[0];
        if (m && m.percentage != null) g += '<circle cx="' + xs(s.t) + '" cy="' + ys(m.percentage) + '" r="4" fill="' + cols[k] + '"><title>' + esc(c.candidate_name) + " " + fPct(m.percentage) + " às " + hhmm(s.t) + "</title></circle>";
      });
      g += '<text x="' + xs(s.t) + '" y="' + (H - 6) + '" class="ax tot" text-anchor="middle">' + fPct(s.percent_totalized, 0) + "</text>";
    });
    var sel = current.snapSel;
    if (sel != null) g += '<line class="cursor" x1="' + xs(snaps[sel].t) + '" x2="' + xs(snaps[sel].t) + '" y1="' + (T - 6) + '" y2="' + (H - Bm) + '"/>';
    box.innerHTML = '<div class="chartwrap"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Percentual dos três mais votados em cada registro da apuração, só nos instantes registrados">' + g + "</svg></div>" +
      '<ul class="legend">' + last.map(function (c, k) { return '<li><i style="background:' + cols[k] + '"></i>' + esc(c.candidate_name) + "</li>"; }).join("") + '<li><i class="gapi"></i>Sem registro</li></ul>' +
      '<div class="tl-controls"><label for="tlRange">Instante</label><input id="tlRange" type="range" min="0" max="' + snaps.length + '" step="1" value="' + (sel == null ? snaps.length : sel) + '" aria-valuetext="' + esc(sel == null ? "agora" : hhmm(snaps[sel].t)) + '">' +
      '<output id="tlOut">' + (sel == null ? "Agora" : hhmm(snaps[sel].t) + " · " + fPct(snaps[sel].percent_totalized) + " totalizado") + "</output></div>" +
      '<ol class="timeline">' + snaps.map(function (s, i) {
        var lag = C.defasagem(s.cap, s.t);
        return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (sel === i) + '"><b>' + (s.kind === "FINAL" ? "Final" : hhmm(s.t)) + "</b> " + (s.kind === "FIRST_RESULT" ? "Primeiro resultado " : "") +
          "<span>" + fPct(s.percent_totalized) + "</span>" + (lag != null && lag > 30 * 60e3 ? '<em class="lag">lido às ' + hhmm(s.cap) + ": " + Math.round(lag / 60e3) + " min sem atualização pública</em>" : "") + "</button></li>";
      }).join("") + "</ol>" +
      '<p class="note">' + OFICIAL + " Cada ponto é o que o TSE mostrava naquele instante; não há linha entre os pontos porque não existe registro entre eles. Faixas cinza = intervalo maior que 70 min sem registro. " +
      CALCULADO + " \"min sem atualização pública\" = hora da nossa leitura menos a hora de atualização informada pelo TSE (hiato observado na atualização pública; não indica causa).</p>";
    $("tlRange").addEventListener("input", function (e) { var v = +e.target.value; selectSnap(v >= snaps.length ? null : v); });
    box.querySelectorAll("button[data-i]").forEach(function (b) { b.addEventListener("click", function () { selectSnap(+b.getAttribute("data-i")); }); });
  }
  function selectSnap(i) {
    current.snapSel = i;
    var el = $("placar"), note = $("snapnote");
    if (i == null) { note.hidden = true; if (live.R) board(live.R, el, { url: resultUrl(SCOPE) }); }
    else {
      var s = snaps[i];
      board(parseResult({ cand: s.candidates.map(function (c) { return { sqcand: c.candidate_id, n: c.number, nm: c.candidate_name, cc: c.party, vap: c.votes, pvap: c.percentage != null ? String(c.percentage).replace(".", ",") : null, seq: c.tse_order }; }),
        tf: s.tse_final_flag, pst: String(s.percent_totalized).replace(".", ","), st: s.sections_totalized, s: s.sections_total, c: s.turnout && s.turnout.votes, pc: s.turnout && String(s.turnout.percentage).replace(".", ","),
        vb: s.blank_votes && s.blank_votes.votes, pvb: s.blank_votes && String(s.blank_votes.percentage).replace(".", ","), tvn: s.null_votes && s.null_votes.votes, ptvn: s.null_votes && String(s.null_votes.percentage).replace(".", ","),
        vv: s.valid_votes != null && typeof s.valid_votes === "object" ? s.valid_votes.votes : s.valid_votes }), el, { url: s.source_url });
      note.hidden = false;
      note.innerHTML = "Você está vendo o <b>registro das " + hhmm(s.t) + "</b> (" + fPct(s.percent_totalized) + ' totalizado). <button type="button" class="linkbtn" data-live>Voltar ao agora</button>';
      track("ELEICOES_RECORTE", { nivel: "registro" });
    }
    renderTimeline(); renderMap();
  }
  document.addEventListener("click", function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-live")) selectSnap(null); });

  // ---------------------------------------------------------------- métricas calculadas (opcional; Human Gate)
  var calcData = null, calcAsked = false;
  function loadCalc() {
    if (!CALC || calcAsked) return; calcAsked = true;
    getOptional(CALC + "1t.json").then(function (d) { calcData = d; renderCalc(); renderMap(); var o = document.querySelector('#layers option[value="late"]'); if (o) o.disabled = !d; });
  }
  function renderCalc() {
    var el = $("calcbox"); if (!el) return;
    if (!calcData) { el.innerHTML = '<p class="empty">Métricas calculadas não publicadas nesta versão.</p>'; return; }
    var h = calcData.hiatos || [];
    el.innerHTML = '<h3>Ritmo de chegada dos arquivos das seções</h3><p class="note">' + CALCULADO + " A partir do horário de recebimento de cada seção (campo dr/hr do arquivo oficial da seção; o TSE não documenta qual componente marca esse horário).</p>" +
      (h.length ? '<ul class="hiatos">' + h.map(function (x) { return "<li><b>" + esc(x.de) + "</b> · " + esc(Math.round(x.s / 60)) + " min · " + esc(x.txt) + "</li>"; }).join("") + "</ul>" : "") +
      '<p class="note">Fonte: ' + esc(calcData.fonte || "") + " · gerado em " + esc(calcData.gerado_em || "") + ".</p>";
  }

  // ---------------------------------------------------------------- busca de município (todas as UFs)
  var cm = null;
  function munList() {
    if (cm) return Promise.resolve(cm);
    return getJSON(BASE + "/" + ELE + "/config/mun-e" + ELE6 + "-cm.json").then(function (c) {
      cm = [];
      (c.abr || []).forEach(function (a) { (a.mu || []).forEach(function (m) { cm.push({ uf: String(a.cd).toLowerCase(), cd: m.cd, nm: m.nm, k: norm(m.nm) }); }); });
      return cm;
    });
  }
  function munName(cd) { var m = (cm || []).filter(function (x) { return x.cd === cd && x.uf === SCOPE; })[0]; return m ? m.nm : cd; }
  function searchBox() {
    var inp = $("busca"), out = $("buscaRes"); if (!inp) return;
    var go = function () {
      var q = norm(inp.value.trim());
      if (q.length < 2) { out.innerHTML = ""; return; }
      munList().then(function (l) {
        var hits = l.filter(function (m) { return m.k.indexOf(q) >= 0 && (SCOPE === "br" || m.uf === SCOPE); })
          .sort(function (a, b) { return (a.k.indexOf(q) === 0 ? 0 : 1) - (b.k.indexOf(q) === 0 ? 0 : 1) || a.k.length - b.k.length; }).slice(0, 8);
        out.innerHTML = hits.length ? hits.map(function (m) {
          return '<li><a href="/eleicoes-2026/' + m.uf + "/#m=" + esc(m.cd) + '">' + esc(m.nm) + " <small>" + esc(m.uf.toUpperCase()) + "</small></a></li>"; }).join("")
          : '<li class="none">Nenhum município com esse nome.</li>';
      }).catch(function () { out.innerHTML = '<li class="none">Não foi possível ler a lista do TSE agora.</li>'; });
    };
    inp.addEventListener("input", go);
    out.addEventListener("click", function (e) { var a = e.target.closest("a"); if (a && SCOPE !== "br" && a.pathname === location.pathname) { e.preventDefault(); location.hash = a.hash; } });
  }

  // ---------------------------------------------------------------- exploração UF → município → zona → local → seção
  function secTree() {
    if (ufTree) return Promise.resolve(ufTree);
    return getJSON(BASE + "/arquivo-urna/" + PLEITO + "/config/" + SCOPE + "/" + SCOPE + "-p" + PLE6 + "-cs.json").then(function (c) {
      if (c.notYet || c.refused) throw new Error("cs"); ufTree = (c.abr || [])[0] || { mu: [] }; return ufTree;
    });
  }
  var st = { m: null, z: null, s: null }, locais = {}, munBoardR = {};
  function readHash() { var o = {}; location.hash.replace(/^#/, "").split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) o[kv[0]] = decodeURIComponent(kv[1] || ""); }); return o; }
  function writeHash(o) { var s = ["m", "z", "s"].filter(function (k) { return o[k]; }).map(function (k) { return k + "=" + o[k]; }).join("&"); if (("#" + s) !== location.hash) history.pushState(null, "", location.pathname + (s ? "#" + s : "")); }
  function crumbs() {
    var el = $("crumbs"); if (!el) return;
    var parts = ['<a href="/eleicoes-2026/">Brasil</a>'];
    if (SCOPE !== "br") parts.push(st.m ? '<a href="#">' + esc(UFN[SCOPE]) + "</a>" : "<b>" + esc(UFN[SCOPE]) + "</b>");
    if (st.m) parts.push(st.z ? '<a href="#m=' + esc(st.m) + '">' + esc(munName(st.m)) + "</a>" : "<b>" + esc(munName(st.m)) + "</b>");
    if (st.z) parts.push(st.s ? '<a href="#m=' + esc(st.m) + "&z=" + esc(st.z) + '">Zona ' + esc(st.z) + "</a>" : "<b>Zona " + esc(st.z) + "</b>");
    if (st.s) parts.push("<b>Seção " + esc(st.s) + "</b>");
    el.innerHTML = parts.join('<span aria-hidden="true">›</span>');
  }
  function route() {
    if (SCOPE === "br") return;
    var h = readHash(); st = { m: h.m || null, z: h.z || null, s: h.s || null };
    crumbs();
    var box = $("explorar"); if (!box) return;
    if (!st.m) { box.innerHTML = '<p class="sub">Busque o município acima ou escolha na lista de quem ainda falta.</p>'; closeSheet(); renderFalta(); if (live.R) board(live.R, $("placar"), { url: resultUrl(SCOPE) }); return; }
    box.innerHTML = '<div id="munBoard"><p class="empty">Lendo o TSE…</p></div><div id="zonas"><p class="empty">Carregando o cadastro de seções…</p></div><div id="secoes"></div>';
    if (live.R && current.snapSel == null) board(live.R, $("placar"), { url: resultUrl(SCOPE), compact: true });
    var url = resultUrl(SCOPE, st.m);
    munList().catch(function () {}).then(function () { crumbs(); return getResult(url); }).then(function (d) {
      if (d.notYet || d.refused || !(d.cand && d.cand.length)) { $("munBoard").innerHTML = '<p class="empty">' + (d.refused ? "O TSE recusou a consulta agora." : "O TSE ainda não publicou totalização para este município.") + "</p>"; return; }
      munBoardR[st.m] = parseResult(d);
      board(munBoardR[st.m], $("munBoard"), { url: url, title: (SCOPE === "zz" ? "Cidade: " : "Município: ") + munName(st.m) });
    }).catch(function () { $("munBoard").innerHTML = '<p class="empty">Não foi possível ler o TSE agora.</p>'; });
    munList().catch(function () {}).then(secTree).then(function (t) {
      renderFalta();
      var mu = (t.mu || []).filter(function (x) { return x.cd === st.m; })[0];
      if (!mu) { $("zonas").innerHTML = '<p class="empty">Município não encontrado no cadastro de seções do TSE.</p>'; return; }
      renderZonas(mu);
      if (st.z) renderSecoes(mu);
      if (st.s) openSecao(mu);
      else closeSheet();
    }).catch(function () { $("zonas").innerHTML = '<p class="empty">Cadastro de seções indisponível agora.</p>'; });
  }
  function zoneCounts(z) {
    var c = { tot: z.sec.length, agr: 0, ger: 0, pen: 0 };
    z.sec.forEach(function (s) { var e = C.estadoCadastro(s, z.sec).estado; if (e === "AGREGADA") c.agr++; else if (e === "GERADO") c.ger++; else c.pen++; });
    return c;
  }
  function renderZonas(mu) {
    var el = $("zonas");
    el.innerHTML = '<h3 class="lvl">Zonas eleitorais de ' + esc(munName(mu.cd)) + "</h3>" + '<ul class="zonas">' + mu.zon.map(function (z) {
      var c = zoneCounts(z);
      return '<li><a href="#m=' + esc(mu.cd) + "&z=" + esc(z.cd) + '"' + (z.cd === st.z ? ' aria-current="true"' : "") + "><b>Zona " + esc(z.cd) + "</b><span>" + fInt(c.tot) + " seções" + (c.pen ? " · " + fInt(c.pen) + " sem arquivo" : "") + "</span></a></li>";
    }).join("") + "</ul>";
  }
  function loadLocais(m) {
    if (!LOCAIS) return Promise.resolve(null);
    if (m in locais) return Promise.resolve(locais[m]);
    return getOptional(LOCAIS + SCOPE + "/" + m + ".json").then(function (d) { locais[m] = d; return d; });
  }
  function renderSecoes(mu) {
    var z = mu.zon.filter(function (x) { return x.cd === st.z; })[0], el = $("secoes");
    if (!z) { el.innerHTML = '<p class="empty">Zona não encontrada no cadastro oficial.</p>'; return; }
    var c = zoneCounts(z);
    el.innerHTML = '<h3 class="lvl">Zona ' + esc(z.cd) + " · " + fInt(c.tot) + " seções</h3>" +
      '<p class="counts">' + OFICIAL + " " + fInt(c.ger) + " com arquivo gerado · " + fInt(c.pen) + " sem arquivo gerado ainda · " + fInt(c.agr) + ' agregadas</p>' +
      '<label class="filtro">Encontrar seção <input id="secFind" inputmode="numeric" autocomplete="off" placeholder="ex.: 0447"></label>' +
      '<ul class="seclegend"><li><i class="s-ger"></i>Arquivo gerado</li><li><i class="s-pen"></i>Sem arquivo gerado ainda</li><li><i class="s-agr"></i>Agregada (votos na principal)</li></ul><div id="secGrid"><p class="empty">Carregando…</p></div>';
    loadLocais(mu.cd).then(function (lv) {
      var byLocal = {}, order = [];
      z.sec.forEach(function (s) {
        var info = lv && lv.secoes && lv.secoes[z.cd + "/" + s.ns], k = info ? String(info.local) : "_";
        if (!byLocal[k]) { byLocal[k] = []; order.push(k); } byLocal[k].push(s);
      });
      var html = order.map(function (k) {
        var L0 = lv && lv.locais && lv.locais[k], secs = byLocal[k];
        var ger = secs.filter(function (s) { return C.estadoCadastro(s, z.sec).estado === "GERADO"; }).length;
        var pen = secs.filter(function (s) { return C.estadoCadastro(s, z.sec).estado === "PENDENTE"; }).length;
        var elei = secs.reduce(function (a, s) { var i = lv && lv.secoes[z.cd + "/" + s.ns]; return a + (i && i.eleitorado || 0); }, 0);
        var head = L0 ? '<div class="lochead"><b>' + esc(L0.nome) + "</b><span>" + esc(L0.bairro || "") + " · " + secs.length + " seções · " + fInt(elei) + " eleitores · " + ger + " com arquivo · " + pen + " sem</span></div>" : "";
        return '<div class="local">' + head + '<ul class="secgrid">' + secs.map(function (s) {
          var e = C.estadoCadastro(s, z.sec);
          var cls = e.estado === "AGREGADA" ? "s-agr" : e.estado === "GERADO" ? "s-ger" : "s-pen";
          var lab = "Seção " + s.ns + ": " + (e.estado === "AGREGADA" ? "agregada à " + e.principal : e.estado === "GERADO" ? "arquivo gerado" : "sem arquivo gerado ainda");
          return '<li><a class="' + cls + '" href="#m=' + esc(mu.cd) + "&z=" + esc(z.cd) + "&s=" + esc(s.ns) + '" data-ns="' + esc(s.ns) + '" aria-label="' + esc(lab) + '"' + (s.ns === st.s ? ' aria-current="true"' : "") + ">" + esc(s.ns) + "</a></li>";
        }).join("") + "</ul></div>";
      }).join("");
      $("secGrid").innerHTML = html + (lv ? '<p class="note">Locais de votação: arquivo oficial "Eleitorado por local de votação 2026" (TSE). Sem dado de eleitor.</p>' : "");
      $("secFind").addEventListener("input", function (e) {
        var q = e.target.value.replace(/\D/g, ""); var any = 0;
        document.querySelectorAll("#secGrid a[data-ns]").forEach(function (a) { var ok = !q || a.getAttribute("data-ns").indexOf(q.padStart(Math.min(4, q.length), "0")) >= 0 || String(+a.getAttribute("data-ns")).indexOf(q) === 0; a.parentNode.hidden = !ok; if (ok) any++; });
        document.querySelectorAll("#secGrid .local").forEach(function (d) { d.hidden = !d.querySelector("li:not([hidden])"); });
      });
    });
  }

  // ---------------------------------------------------------------- Auditoria da seção (painel lateral / folha inferior)
  var lastFocus = null;
  function closeSheet() { var p = $("secPanel"), bd = $("backdrop"); if (bd) bd.hidden = true; if (!p || p.hidden) return; p.hidden = true; B.classList.remove("sheet-open"); if (lastFocus) try { lastFocus.focus(); } catch (e) { /* ok */ } }
  function backdrop() {   // mobile: toque fora da folha fecha e volta à zona
    var bd = $("backdrop");
    if (!bd) { bd = document.createElement("div"); bd.id = "backdrop"; bd.className = "backdrop"; document.body.appendChild(bd);
      bd.addEventListener("click", function () { writeHash({ m: st.m, z: st.z }); route(); }); }
    bd.hidden = false;
  }
  function sha256(buf) { return crypto && crypto.subtle ? crypto.subtle.digest("SHA-256", buf).then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }) : Promise.resolve(null); }
  function openSecao(mu) {
    var z = mu.zon.filter(function (x) { return x.cd === st.z; })[0], s = z && z.sec.filter(function (x) { return x.ns === st.s; })[0], p = $("secPanel");
    if (!p) return;
    lastFocus = document.activeElement;
    p.hidden = false; B.classList.add("sheet-open"); backdrop();
    var where = "Seção " + st.s + " · Zona " + st.z + " · " + munName(st.m) + " (" + SCOPE.toUpperCase() + ")";
    if (!s) { p.innerHTML = head(where) + '<p class="empty">Esta seção não existe no cadastro oficial de seções desta zona (' + fInt(z ? z.sec.length : 0) + " seções). Nada foi consultado.</p>"; bindClose(); return; }
    p.innerHTML = head(where) + '<div id="secBody"><p class="empty">Consultando a seção no TSE…</p></div>';
    bindClose(); p.querySelector("h2").focus();
    track("ELEICOES_RECORTE", { nivel: "secao" });
    var dir = BASE + "/arquivo-urna/" + PLEITO + "/dados/" + SCOPE + "/" + st.m + "/" + st.z + "/" + st.s;
    var auxUrl = dir + "/p" + PLE6 + "-" + SCOPE + "-m" + st.m + "-z" + st.z + "-s" + st.s + "-aux.json";
    var cad = C.estadoCadastro(s, z.sec);
    Promise.all([loadLocais(st.m), CALC ? getOptional(CALC + "1t/" + SCOPE + "/" + st.m + ".json") : Promise.resolve(null)]).then(function (x) {
      var lv = x[0], cm1 = x[1], info = lv && lv.secoes && lv.secoes[st.z + "/" + st.s], loc = info && lv.locais[String(info.local)];
      var calcSec = cm1 && cm1.secoes && cm1.secoes[st.z + "/" + st.s];
      var conferido = cm1 && cm1.municipio_conferido === true;
      if (cad.estado === "AGREGADA") { render(C.secaoEstado(s, z.sec, { status: 404 }), null, null); return; }
      fetch(auxUrl, { cache: "no-cache" }).then(function (r) {
        if (r.status === 200) return r.json().then(function (j) { return { status: 200, json: j }; }, function () { return { status: 200, json: null }; });
        return r.text().then(function (t) { return { status: r.status, corpo: t.slice(0, 400) }; }, function () { return { status: r.status }; });
      }, function (e) { return { status: null, erro: e && e.name }; }).then(function (aux) {
        var e = C.secaoEstado(s, z.sec, aux, { conferido: conferido });
        if (!e.hash) { render(e, aux, null); return; }
        var f = (e.hash.arq || []).filter(function (a) { return a.tp === "bu" || a.tp === "busa"; })[0];
        fetch(dir + "/" + e.hash.hash + "/" + f.nm, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(function (buf) {
          return sha256(buf).then(function (h) { render(e, aux, { d: C.decodeBU(new Uint8Array(buf), ELE_NUM), sha: h, nm: f.nm, url: dir + "/" + e.hash.hash + "/" + f.nm }); });
        }).catch(function () { render(e, aux, { erro: true }); });
      });
      function render(e, aux, bu) {
        var out = [];
        out.push('<div class="estado e-' + esc(e.classe) + '"><p class="enome">' + esc(e.nome.toUpperCase()) + "</p><p>" + esc(e.texto) + "</p>" +
          (e.estado === "AGREGADA" ? '<p><a href="#m=' + esc(st.m) + "&z=" + esc(st.z) + "&s=" + esc(e.principal) + '">Abrir a seção principal ' + esc(e.principal) + " →</a></p>" : "") +
          (e.estado === "INDISPONIVEL" && calcSec && calcSec.primeiro_404 ? "<p>Acompanhando desde " + esc(calcSec.primeiro_404) + ".</p>" : "") +
          (calcSec && calcSec.recuperado ? '<p class="rec">RECUPERADO · primeira observação ' + esc(calcSec.recuperado.primeiro_200) + " · Last-Modified " + esc(calcSec.recuperado.last_modified) + " · " + esc(calcSec.recuperado.conferencia || "") + "</p>" : "") +
          '<details class="tec"' + (B.getAttribute("data-mode") === "auditoria" ? " open" : "") + "><summary>Explicação técnica</summary><p>" + esc(e.tecnico || "") + "</p></details></div>");
        // identificação
        out.push('<h3>Identificação</h3><dl class="kv">' + kv("Estado", UFN[SCOPE]) + kv("Município", munName(st.m) + " · código TSE " + st.m) + kv("Zona", st.z) + kv("Seção", st.s) +
          kv("Local de votação", loc ? loc.nome + (loc.bairro ? " · " + loc.bairro : "") : bu && bu.d ? "nº " + bu.d.local + " (do boletim)" : "—") +
          (loc && loc.endereco ? kv("Endereço", loc.endereco) : "") + (info ? kv("Eleitorado da seção", fInt(info.eleitorado)) : "") +
          kv("Tipo", cad.estado === "AGREGADA" ? "Agregada à seção " + cad.principal : (s.nsa && s.nsa.length ? "Principal · agrega " + s.nsa.join(", ") : "Principal")) + "</dl>");
        // resultado
        if (bu && bu.d) {
          var names = {}, R = munBoardR[st.m];
          (R ? R.cands : []).forEach(function (c) { names[String(c.n)] = c.name + (c.party ? " · " + c.party : ""); });
          var v = bu.d.votos, nominal = Object.keys(v).filter(function (k) { return /^\d+$/.test(k); }).sort(function (a, b) { return v[b] - v[a]; });
          var validos = nominal.reduce(function (a, k) { return a + (names[k] ? v[k] : 0); }, 0);
          out.push("<h3>Resultado desta seção</h3><p class=\"pl\">" + OFICIAL + " lido do boletim desta seção · percentuais: " + CALCULADO + '</p><table class="sectab"><thead><tr><th scope="col">Candidato</th><th scope="col">Votos</th><th scope="col">% válidos</th></tr></thead><tbody>' +
            nominal.map(function (k) { return "<tr><td>" + esc(names[k] || "Número " + k) + "</td><td>" + fInt(v[k]) + "</td><td>" + (names[k] && validos ? fPct(v[k] / validos * 100, 1) : "—") + "</td></tr>"; }).join("") +
            "<tr><td>Brancos</td><td>" + fInt(v.branco || 0) + "</td><td>—</td></tr><tr><td>Nulos</td><td>" + fInt(v.nulo || 0) + "</td><td>—</td></tr></tbody></table>" +
            '<dl class="kv">' + kv("Aptos (boletim)", fInt(bu.d.aptos)) + kv("Compareceram", fInt(bu.d.comparecimento)) + "</dl>");
        } else if (bu && (bu.erro || !bu.d)) out.push('<p class="empty">Não foi possível ler o boletim agora; nada foi concluído. O arquivo oficial segue no link abaixo.</p>');
        // arquivos
        var h = aux && aux.json && (aux.json.hashes || [])[0];
        if (h) out.push("<h3>Arquivos oficiais</h3><ul class=\"files\">" + (h.arq || []).map(function (f) {
          return '<li><a href="' + esc(dir + "/" + h.hash + "/" + f.nm) + '" target="_blank" rel="noopener">' + esc(FILES[f.tp] || f.tp) + "</a> <small>" + esc(f.nm) + "</small></li>"; }).join("") + "</ul>" +
          '<dl class="kv">' + kv("Recebido (dr/hr)", (h.dr || "—") + " " + (h.hr || "")) + kv("Situação no TSE", (aux.json.st || h.st || "—")) +
          (bu && bu.sha ? kv("SHA-256 do boletim", '<code>' + esc(bu.sha) + "</code>", true) : "") + "</dl>" +
          '<details class="tec"' + (B.getAttribute("data-mode") === "auditoria" ? " open" : "") + '><summary>Sobre o horário</summary><p>dr/hr é o timestamp operacional do arquivo da seção (EA18). O TSE não documenta qual componente marca esse horário. SHA-256 calculado nesta página a partir do arquivo baixado do TSE.</p></details>');
        // cadeia
        var chain = [
          ["Cadastro de seções (cs.json)", "ok", "seção listada"],
          ["Arquivo gerado (da/ha)", e.estado === "AGREGADA" ? "na" : s.da ? "ok" : "pend", e.estado === "AGREGADA" ? "não se aplica" : s.da ? s.da + " " + s.ha : "ainda não"],
          ["Arquivos da seção (EA18)", e.estado === "AGREGADA" ? "na" : aux && aux.status === 200 ? "ok" : e.estado === "INDISPONIVEL" ? "warn" : "pend", e.estado === "AGREGADA" ? "não se aplica" : aux && aux.status ? "HTTP " + aux.status : "sem resposta"],
          ["Boletim lido", e.estado === "AGREGADA" ? "na" : bu && bu.d ? "ok" : "pend", e.estado === "AGREGADA" ? "votos no boletim da " + e.principal : bu && bu.d ? "soma dos votos = comparecimento" : "não lido"],
          ["Total do município", conferido ? "ok" : "nt", conferido ? "soma dos boletins = resultado oficial (conferido)" : "não testável nesta página"]
        ];
        out.push("<h3>Caminho do dado</h3><ol class=\"chain\">" + chain.map(function (c) { return '<li class="c-' + c[1] + '"><b>' + esc(c[0]) + "</b><span>" + esc(c[2]) + "</span></li>"; }).join("") + "</ol>");
        if (calcSec && calcSec.chegada_pct != null) out.push("<h3>Ordem de chegada</h3><p>" + CALCULADO + " Esta seção chegou depois de " + fPct(calcSec.chegada_pct * 100, 0) + " das seções do país" + (calcSec.late15 ? " (entre as 15% últimas)" : "") + ". Informação logística, não diz nada sobre os votos.</p>");
        $("secBody").innerHTML = out.join("");
      }
    });
  }
  function head(t) { return '<div class="sheethead"><h2 tabindex="-1" id="sheetTitle">' + esc(L.auditSec) + '</h2><button type="button" class="close" aria-label="Fechar e voltar à zona">×</button></div><p class="where">' + esc(t) + "</p>"; }
  function bindClose() { var b = $("secPanel").querySelector(".close"); b.addEventListener("click", function () { writeHash({ m: st.m, z: st.z }); route(); }); }
  function kv(k, v, raw) { return "<div><dt>" + esc(k) + "</dt><dd>" + (raw ? v : esc(v)) + "</dd></div>"; }
  var FILES = { bu: "Boletim de Urna (BU)", busa: "Boletim do Sistema de Apuração", rdv: "Registro Digital do Voto (RDV)", imgbu: "Imagem do BU", imgbusa: "Imagem do boletim do Sistema de Apuração", log: "Log da urna", vota: "Arquivo de assinaturas", sa: "Arquivo do Sistema de Apuração", logsa: "Log do Sistema de Apuração" };

  function loadExterior() {
    var el = $("exterior"); if (!el || NOW() < RELEASE) return;
    getResult(resultUrl("zz")).then(function (d) {
      if (d.notYet || d.refused || !(d.cand && d.cand.length)) { el.innerHTML = '<p class="empty">O TSE ainda não publicou totalização do exterior.</p>'; return; }
      var R = parseResult(d);
      el.innerHTML = '<ol class="mini">' + R.cands.slice(0, 3).map(function (c) { return "<li><span>" + esc(c.name) + "</span><b>" + fPct(c.pct) + "</b></li>"; }).join("") + '</ol><p class="note">' + OFICIAL + " " + (R.final ? "final" : fPct(R.pst) + " totalizado") + '. <a href="/eleicoes-2026/zz/">Exterior por cidade →</a></p>';
    }).catch(function () { el.innerHTML = '<p class="empty">Não foi possível ler o TSE agora.</p>'; });
  }

  // ---------------------------------------------------------------- início
  function start() {
    var saved = null; try { saved = localStorage.getItem("eleicoes-modo"); } catch (e) { /* ok */ }
    setMode(saved === "auditoria" ? "auditoria" : "resultados", false);
    ["mRes", "mAud"].forEach(function (id) { var b = $(id); if (b) b.addEventListener("click", function () { setMode(id === "mAud" ? "auditoria" : "resultados", true); }); });
    var lay = $("layers"); if (lay) { if (!CALC) { var o = lay.querySelector('option[value="late"]'); if (o) o.remove(); } lay.addEventListener("change", function () { map.layer = lay.value; if (lay.value === "late") loadCalc(); renderMap(); track("ELEICOES_CAMADA", { camada: lay.value }); }); }
    searchBox(); crumbs(); cards();
    if (NOW() < RELEASE) {
      B.classList.add("before");
      $("placar").innerHTML = '<p class="wait"><b>A apuração oficial começa às 17h (horário de Brasília).</b> Antes disso, esta página não mostra nenhum número de 2026.</p>';
      var left = RELEASE - NOW(); if (left < 6 * 3600e3) setTimeout(function () { B.classList.remove("before"); start(); }, left + 2000);
      return;
    }
    loadCurrent(); setInterval(function () { if (document.visibilityState === "visible") loadCurrent(); }, POLL_MS);
    setInterval(cards, 15000);
    if (SCOPE === "br") {
      getResult(resultUrl("br")).then(function (d) { (d.cand || []).map(function (c) { return { id: c.sqcand, order: int(c.seq) }; }).sort(function (a, b) { return (a.order || 99) - (b.order || 99); }).forEach(colorOf); })
        .catch(function () {}).then(loadMap);
      loadExterior(); loadSnaps();
      setInterval(function () { if (document.visibilityState === "visible") { loadMap(); loadExterior(); } }, MAP_MS);
      setInterval(function () { if (document.visibilityState === "visible") loadSnaps(); }, 10 * 60e3);
    } else {
      route(); window.addEventListener("hashchange", route); window.addEventListener("popstate", route);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("secPanel").hidden) { writeHash({ m: st.m, z: st.z }); route(); } });
    }
    if (B.getAttribute("data-mode") === "auditoria") loadCalc();
  }
  start();
})();
