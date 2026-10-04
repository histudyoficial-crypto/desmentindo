/* Eleições 2026 · Desmentindo — resultado oficial do TSE lido direto no navegador.
 *
 * Regras (decisão de 04/10/2026):
 * - Fonte única de RESULTADO: arquivos públicos do TSE (resultados.tse.jus.br). Nada é somado ou estimado aqui.
 * - Nenhum número de 2026 antes das 17:00 de Brasília (fim da votação no país).
 * - Desconhecido aparece como "—", nunca como 0. Parcial mostra sempre o % de seções totalizadas.
 * - Final só quando o próprio TSE marca totalização final (tf = "s").
 * - Atualiza a cada 90 s só com a aba visível; se o TSE falhar, mantém o último dado com a hora dele.
 * - Snapshot (evolução) = o que o TSE mostrava naquele momento. Não é projeção, tendência nem vencedor.
 */
(function () {
  "use strict";
  var BASE = "https://resultados.tse.jus.br/oficial/ele2026";
  var ELE = "6257", ELE6 = "006257", PLEITO = "3220", PLE6 = "003220", CARGO = "0001";
  var RELEASE = Date.parse("2026-10-04T20:00:00Z"); // 17:00 BRT
  var SNAP_URL = "https://raw.githubusercontent.com/histudyoficial-crypto/desmentindo/eleicoes-2026-dados/presidente-br.json";
  var POLL_MS = 90000;
  var SCOPE = document.body.getAttribute("data-scope") || "br";          // "br" ou sigla da UF em minúsculas
  var NOW = function () { return window.__ELEICOES_NOW ? window.__ELEICOES_NOW() : Date.now(); };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var int = function (v) { if (v == null) return null; var s = String(v).replace(/\D/g, ""); return s ? parseInt(s, 10) : null; };
  var pct = function (v) { if (v == null || String(v).trim() === "") return null; var n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
  var fInt = function (n) { return n == null ? "—" : n.toLocaleString("pt-BR"); };
  var pair = function (o) { return o.v == null && o.p == null ? "—" : fInt(o.v) + " <small>" + fPct(o.p) + "</small>"; };
  var fPct = function (n) { return n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"; };
  var hhmm = function (ms) { return new Date(ms - 3 * 3600e3).toISOString().slice(11, 16); };
  var hhmmss = function (ms) { return new Date(ms - 3 * 3600e3).toISOString().slice(11, 19); };
  function track(name, data) { try { if (window.umami && window.umami.track) window.umami.track(name, data); } catch (e) { /* medição nunca quebra a página */ } }

  function resultUrl(uf, mun) { return BASE + "/" + ELE + "/dados-simplificados/" + uf + "/" + uf + (mun || "") + "-c" + CARGO + "-e" + ELE6 + "-r.json"; }

  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (r.status === 404 || r.status === 403) return { notYet: true };
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  // ---------------------------------------------------------------- placar (resultado atual)
  function parseResult(d) {
    var cands = (d.cand || []).map(function (c) {
      return { id: c.sqcand, n: c.n, name: c.nm, party: c.cc, votes: int(c.vap), pct: pct(c.pvap), order: int(c.seq), st: c.st || "" };
    }).sort(function (a, b) { return (a.order == null ? 1e9 : a.order) - (b.order == null ? 1e9 : b.order) || (b.votes || 0) - (a.votes || 0); });
    return {
      final: String(d.tf || "").toLowerCase() === "s", pst: pct(d.pst), st: int(d.st), s: int(d.s),
      tseTime: (d.dt && d.ht) ? d.dt.slice(0, 5) + " " + d.ht : (d.dg && d.hg ? d.dg.slice(0, 5) + " " + d.hg : null),
      turnout: { v: int(d.c), p: pct(d.pc) }, blank: { v: int(d.vb), p: pct(d.pvb) }, nul: { v: int(d.tvn), p: pct(d.ptvn) },
      valid: int(d.vv), cands: cands
    };
  }

  function board(R, el, opts) {
    var max = Math.max.apply(null, R.cands.map(function (c) { return c.pct || 0; }).concat([1]));
    var status = R.final
      ? '<span class="st st-final">Totalização final · TSE</span>'
      : '<span class="st st-partial">Parcial · ' + fPct(R.pst) + " das seções totalizadas</span>";
    el.innerHTML = (opts && opts.title ? '<h3 class="btitle">' + esc(opts.title) + "</h3>" : "") +
      '<div class="board-head">' + status +
      '<p class="when">' + (R.tseTime ? "Totalizado pelo TSE em " + esc(R.tseTime) : "Horário do TSE não informado") +
      (opts && opts.readAt ? ' · lido às ' + hhmmss(opts.readAt) : "") + "</p></div>" +
      '<ol class="cands">' + R.cands.map(function (c) {
        var w = c.pct == null ? 0 : Math.max(0.5, c.pct / max * 100);
        return '<li><div class="cn"><span class="nm">' + esc(c.name) + '</span><span class="pt">' + esc(c.party || "") + " · " + esc(c.n || "") + "</span></div>" +
          '<div class="cv"><b>' + fPct(c.pct) + '</b><span>' + fInt(c.votes) + " votos</span></div>" +
          '<div class="bar" aria-hidden="true"><i style="width:' + w.toFixed(2) + '%"></i></div>' +
          (R.final && c.st ? '<p class="cst">Situação informada pelo TSE: ' + esc(c.st) + "</p>" : "") + "</li>";
      }).join("") + "</ol>" +
      '<dl class="aux"><div><dt>Comparecimento</dt><dd>' + pair(R.turnout) + "</dd></div>" +
      "<div><dt>Brancos</dt><dd>" + pair(R.blank) + "</dd></div>" +
      "<div><dt>Nulos</dt><dd>" + pair(R.nul) + "</dd></div>" +
      "<div><dt>Votos válidos</dt><dd>" + fInt(R.valid) + "</dd></div></dl>" +
      '<p class="src">Fonte: <a href="' + esc(opts.url) + '" target="_blank" rel="noopener">arquivo oficial do TSE</a>. Percentuais de candidatos sobre votos válidos, como publicados pelo TSE.</p>';
  }

  // ---------------------------------------------------------------- estado atual com atualização
  var current = { last: null, lastAt: 0, timer: 0 };
  function loadCurrent() {
    var el = $("placar"), url = resultUrl(SCOPE);
    if (NOW() < RELEASE) return;
    return getJSON(url).then(function (d) {
      if (d.notYet || !(d.cand && d.cand.length)) {
        if (!current.last) el.innerHTML = '<p class="empty">O TSE ainda não publicou totalização para este recorte. A página consulta de novo a cada 90 segundos.</p>';
        return;
      }
      current.last = parseResult(d); current.lastAt = NOW();
      board(current.last, el, { readAt: current.lastAt, url: url });
      $("stale").hidden = true;
    }).catch(function () {
      if (current.last) { $("stale").hidden = false; $("stale").textContent = "Sem atualização desde " + hhmm(current.lastAt) + ": não foi possível ler o TSE agora. Os números abaixo são dessa hora."; }
      else el.innerHTML = '<p class="empty">Não foi possível ler o TSE agora. Nova tentativa em 90 segundos.</p>';
    });
  }
  function schedule() {
    clearInterval(current.timer);
    current.timer = setInterval(function () { if (document.visibilityState === "visible") loadCurrent(); }, POLL_MS);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && NOW() - current.lastAt > POLL_MS) loadCurrent();
  });

  // ---------------------------------------------------------------- evolução da apuração (snapshots)
  var KIND = { FIRST_RESULT: "Início da apuração", HOURLY: "", FINAL: "Final" };
  function chart(snaps) {
    if (snaps.length < 2) return "";
    var last = snaps[snaps.length - 1].candidates.slice().sort(function (a, b) { return (b.percentage || 0) - (a.percentage || 0); }).slice(0, 4);
    var W = 640, H = 220, L = 36, R = 150, T = 12, B = 28, xs = function (i) { return L + i * (W - L - R) / (snaps.length - 1); };
    var top = Math.max.apply(null, snaps.map(function (s) { return Math.max.apply(null, s.candidates.map(function (c) { return c.percentage || 0; })); }).concat([10]));
    top = Math.ceil(top / 10) * 10;
    var ys = function (p) { return T + (H - T - B) * (1 - p / top); };
    var cols = ["var(--ink)", "var(--blue-mid)", "var(--green-ink)", "var(--gold-ink)"];
    var g = "";
    for (var v = 0; v <= top; v += 10) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(v) + '" y2="' + ys(v) + '" class="grid"/><text x="' + (L - 6) + '" y="' + (ys(v) + 4) + '" class="ax" text-anchor="end">' + v + "%</text>";
    snaps.forEach(function (s, i) { g += '<text x="' + xs(i) + '" y="' + (H - 8) + '" class="ax" text-anchor="middle">' + esc(s.kind === "FINAL" ? "Final" : hhmm(Date.parse(s.tse_updated_at || s.captured_at))) + "</text>"; });
    last.forEach(function (c, k) {
      var pts = snaps.map(function (s, i) { var m = s.candidates.filter(function (x) { return x.candidate_id === c.candidate_id; })[0]; return m && m.percentage != null ? xs(i) + "," + ys(m.percentage) : null; }).filter(Boolean);
      g += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + cols[k] + '" stroke-width="2.5"/>';
      var lp = pts[pts.length - 1].split(",");
      g += '<text x="' + (W - R + 8) + '" y="' + (+lp[1] + 4) + '" class="lb" fill="' + cols[k] + '">' + esc(c.candidate_name) + "</text>";
    });
    return '<div class="chartwrap"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Percentual dos candidatos em cada registro da apuração">' + g + "</svg></div>" +
      '<ul class="legend">' + last.map(function (c, k) { return '<li><i style="background:' + cols[k] + '"></i>' + esc(c.candidate_name) + "</li>"; }).join("") + "</ul>" +
      '<p class="note">Cada ponto é um registro do que o TSE mostrava naquela hora. Não indica tendência nem resultado.</p>';
  }
  function loadSnaps() {
    var box = $("evolucao");
    if (!box || NOW() < RELEASE) return;
    fetch(SNAP_URL, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
      var snaps = (d && d.snapshots) || [];
      if (!snaps.length) { box.innerHTML = '<p class="empty">Nenhum registro ainda. O primeiro é gravado assim que o TSE publicar o primeiro resultado; depois, um por hora até o final.</p>'; return; }
      box.innerHTML = '<ol class="timeline">' + snaps.map(function (s, i) {
        var t = s.kind === "FINAL" ? "Final" : hhmm(Date.parse(s.tse_updated_at || s.captured_at));
        return '<li><button type="button" data-i="' + i + '" aria-pressed="false"><b>' + esc(t) + "</b> " + esc(KIND[s.kind] || "") +
          ' <span>' + fPct(s.percent_totalized) + " totalizado</span></button></li>";
      }).join("") + "</ol>" + chart(snaps) + '<div id="snapview" class="snapview" hidden></div>';
      box.querySelectorAll("button[data-i]").forEach(function (b) {
        b.addEventListener("click", function () {
          var s = snaps[+b.getAttribute("data-i")];
          box.querySelectorAll("button[data-i]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          var v = $("snapview"); v.hidden = false;
          v.innerHTML = "<h3>Registro das " + esc(hhmm(Date.parse(s.tse_updated_at || s.captured_at))) + " · " + fPct(s.percent_totalized) + ' totalizado</h3><table><thead><tr><th>Candidato</th><th>%</th><th>Votos</th></tr></thead><tbody>' +
            s.candidates.slice().sort(function (a, c) { return (a.tse_order || 99) - (c.tse_order || 99); }).map(function (c) { return "<tr><td>" + esc(c.candidate_name) + "</td><td>" + fPct(c.percentage) + "</td><td>" + fInt(c.votes) + "</td></tr>"; }).join("") +
            '</tbody></table><p class="note">Capturado às ' + esc(hhmmss(Date.parse(s.captured_at))) + ' · <a href="' + esc(s.source_url) + '" target="_blank" rel="noopener">fonte TSE</a>. É o que o TSE mostrava naquele momento.</p>';
          track("ELEICOES_RECORTE", { nivel: "registro" });
        });
      });
    });
  }

  // ---------------------------------------------------------------- de onde vieram os votos (UF → município → zona → seção)
  var cfg = { mun: null, sec: null };
  function readHash() { var o = {}; (location.hash.replace(/^#/, "").split("&")).forEach(function (p) { var kv = p.split("="); if (kv[0]) o[kv[0]] = decodeURIComponent(kv[1] || ""); }); return o; }
  function writeHash(o) { var s = Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + "=" + o[k]; }).join("&"); history.replaceState(null, "", location.pathname + location.search + (s ? "#" + s : "")); }
  var FILES = { bu: "Boletim de Urna (BU)", rdv: "Registro Digital do Voto (RDV)", imgbu: "Imagem do BU", log: "Log da urna", vota: "Arquivo de assinaturas" };

  function explorer() {
    var box = $("explorar");
    if (!box || SCOPE === "br" || NOW() < RELEASE) return;
    box.innerHTML = '<div class="pick"><label>Município<select id="selMun" disabled><option>Carregando…</option></select></label>' +
      '<label>Zona<select id="selZona" disabled><option value="">—</option></select></label>' +
      '<label>Seção<select id="selSec" disabled><option value="">—</option></select></label></div><div id="munBoard"></div><div id="secBox"></div>';
    var sm = $("selMun"), sz = $("selZona"), ss = $("selSec"), st = readHash();
    getJSON(BASE + "/" + ELE + "/config/mun-e" + ELE6 + "-cm.json").then(function (c) {
      var abr = (c.abr || []).filter(function (a) { return a.cd === SCOPE; })[0];
      var mus = (abr && abr.mu || []).slice().sort(function (a, b) { return a.nm.localeCompare(b.nm, "pt-BR"); });
      cfg.mun = mus;
      sm.innerHTML = '<option value="">Escolha o município</option>' + mus.map(function (m) { return '<option value="' + esc(m.cd) + '">' + esc(m.nm) + "</option>"; }).join("");
      sm.disabled = false;
      if (st.m) { sm.value = st.m; onMun(true); }
    }).catch(function () { sm.innerHTML = "<option>Não foi possível ler a lista do TSE</option>"; });

    function secTree() {
      if (cfg.sec) return Promise.resolve(cfg.sec);
      return getJSON(BASE + "/arquivo-urna/" + PLEITO + "/config/" + SCOPE + "/" + SCOPE + "-p" + PLE6 + "-cs.json").then(function (c) { cfg.sec = (c.abr || [])[0] || { mu: [] }; return cfg.sec; });
    }
    function onMun(restoring) {
      var m = sm.value; ss.innerHTML = '<option value="">—</option>'; ss.disabled = true; $("secBox").innerHTML = "";
      if (!m) { $("munBoard").innerHTML = ""; sz.disabled = true; writeHash({}); return; }
      if (!restoring) writeHash({ m: m });
      track("ELEICOES_RECORTE", { nivel: "municipio" });
      var url = resultUrl(SCOPE, m);
      $("munBoard").innerHTML = '<p class="empty">Lendo o TSE…</p>';
      getJSON(url).then(function (d) {
        if (d.notYet || !(d.cand && d.cand.length)) { $("munBoard").innerHTML = '<p class="empty">O TSE ainda não publicou totalização para este município.</p>'; return; }
        var nm = (cfg.mun || []).filter(function (x) { return x.cd === m; })[0];
        board(parseResult(d), $("munBoard"), { readAt: NOW(), url: url, title: "Município: " + (nm ? nm.nm : m) });
      }).catch(function () { $("munBoard").innerHTML = '<p class="empty">Não foi possível ler o TSE agora.</p>'; });
      secTree().then(function (t) {
        var mu = (t.mu || []).filter(function (x) { return x.cd === m; })[0];
        var zs = mu ? mu.zon : [];
        sz.innerHTML = '<option value="">Escolha a zona</option>' + zs.map(function (z) { return '<option value="' + esc(z.cd) + '">Zona ' + esc(z.cd) + "</option>"; }).join("");
        sz.disabled = !zs.length;
        if (restoring && st.z) { sz.value = st.z; onZona(true); }
      }).catch(function () { sz.innerHTML = "<option>Lista de seções indisponível</option>"; });
    }
    function onZona(restoring) {
      var m = sm.value, z = sz.value; $("secBox").innerHTML = "";
      var mu = (cfg.sec.mu || []).filter(function (x) { return x.cd === m; })[0];
      var zon = mu && mu.zon.filter(function (x) { return x.cd === z; })[0];
      var secs = zon ? zon.sec : [];
      ss.innerHTML = '<option value="">Escolha a seção (' + secs.length + ")</option>" + secs.map(function (s) { return '<option value="' + esc(s.ns) + '">Seção ' + esc(s.ns) + "</option>"; }).join("");
      ss.disabled = !secs.length;
      if (!restoring) { writeHash({ m: m, z: z }); track("ELEICOES_RECORTE", { nivel: "zona" }); }
      if (restoring && st.s) { ss.value = st.s; onSec(true); }
    }
    function onSec(restoring) {
      var m = sm.value, z = sz.value, s = ss.value, out = $("secBox");
      if (!s) { out.innerHTML = ""; return; }
      if (!restoring) { writeHash({ m: m, z: z, s: s }); track("ELEICOES_RECORTE", { nivel: "secao" }); }
      var dir = BASE + "/arquivo-urna/" + PLEITO + "/dados/" + SCOPE + "/" + m + "/" + z + "/" + s;
      out.innerHTML = '<p class="empty">Consultando a seção no TSE…</p>';
      getJSON(dir + "/p" + PLE6 + "-" + SCOPE + "-m" + m + "-z" + z + "-s" + s + "-aux.json").then(function (a) {
        if (a.notYet) { out.innerHTML = '<p class="empty">O TSE ainda não publicou arquivos desta seção.</p>'; return; }
        var h = (a.hashes || [])[0];
        out.innerHTML = '<div class="sec-card"><h3>Seção ' + esc(s) + " · zona " + esc(z) + "</h3>" +
          '<p>Situação no TSE: <b>' + esc(a.st || (h && h.st) || "—") + "</b>" + (h && h.dr ? " · recebida em " + esc(h.dr.slice(0, 5)) + " " + esc(h.hr) : "") + "</p>" +
          (h ? '<ul class="files">' + (h.arq || []).map(function (f) {
            return '<li><a href="' + esc(dir + "/" + h.hash + "/" + f.nm) + '" target="_blank" rel="noopener">' + esc(FILES[f.tp] || f.tp) + "</a> <small>" + esc(f.nm) + "</small></li>";
          }).join("") + "</ul>" : "") +
          '<p class="note">Arquivos oficiais do TSE, no formato da urna. O BU é a apuração desta seção, impressa e publicada pela Justiça Eleitoral; esta página ainda não lê o conteúdo do arquivo. Soma de BUs não é a totalização oficial.</p></div>';
      }).catch(function () { out.innerHTML = '<p class="empty">Não foi possível ler a seção no TSE agora.</p>'; });
    }
    sm.addEventListener("change", function () { onMun(false); });
    sz.addEventListener("change", function () { onZona(false); });
    ss.addEventListener("change", function () { onSec(false); });
  }

  // ---------------------------------------------------------------- início
  function start() {
    if (NOW() < RELEASE) {
      document.body.classList.add("before");
      $("placar").innerHTML = '<p class="wait"><b>A apuração oficial começa às 17h (horário de Brasília).</b> Antes disso, esta página não mostra nenhum número de 2026. A partir das 17h, os dados vêm direto do TSE e se atualizam sozinhos.</p>';
      var left = RELEASE - NOW();
      if (left < 6 * 3600e3) setTimeout(function () { document.body.classList.remove("before"); start(); }, left + 2000);
      return;
    }
    loadCurrent(); schedule(); loadSnaps(); explorer();
    setInterval(function () { if (document.visibilityState === "visible") loadSnaps(); }, 10 * 60 * 1000);
  }
  start();
})();
