/*
 * DESMENTINDO COMMAND CENTER v1 — view layer.
 * Lê control/*.json (verdade no GitHub). Se não conseguir buscar (ex.: file://),
 * usa window.CC_BUNDLE gerado por `ctl.py sync`. Nunca escreve, nunca guarda
 * credenciais: ações abrem GitHub Issues pré-preenchidas.
 */
(function () {
  "use strict";

  var REPO = "https://github.com/histudyoficial-crypto/desmentindo";
  var FILES = ["CURRENT_STATE", "HEALTH", "HUMAN_REVIEW_QUEUE", "INCIDENTS", "DECISION_QUEUE",
    "PIPELINE_TODAY", "CORPUS_STATUS", "RESULTS", "VIDEO_ENGINE", "ENGINEERING", "BUSINESS"];
  var AREAS = [
    { id: "executiva", label: "Visão executiva" },
    { id: "precisa", label: "Precisa de você" },
    { id: "hoje", label: "Hoje" },
    { id: "conteudo", label: "Conteúdo" },
    { id: "corpus", label: "Corpus & Intelligence" },
    { id: "saude", label: "System health" },
    { id: "resultados", label: "Resultados" },
    { id: "video", label: "Video Engine" },
    { id: "engenharia", label: "Produto & Engenharia" },
    { id: "negocio", label: "Desmentindo Data" },
    { id: "incidentes", label: "Incidentes" }
  ];
  var STATE_TEXT = {
    HEALTHY: "Operando normalmente",
    DEGRADED: "Operando com degradação",
    FAILED: "Falha em componente crítico",
    UNKNOWN: "Sem sinal suficiente",
    NOT_CONFIGURED: "Não configurado"
  };
  var PRI = { P0: 0, P1: 1, P2: 2, P3: 3 };
  var D = null;
  var SOURCE = null;

  // ------------------------------------------------------------ helpers
  function e(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) {
    return typeof u === "string" && /^https:\/\//.test(u) ? u : null;
  }
  function link(u, text) {
    var s = safeUrl(u);
    return s ? '<a href="' + e(s) + '" target="_blank" rel="noopener noreferrer">' + e(text || s) + "</a>" : e(text || u || "—");
  }
  function chip(state, extra) {
    var s = state == null ? "UNKNOWN" : String(state);
    return '<span class="chip ' + e(s.replace(/[^A-Z0-9_]/gi, "")) + (extra ? " " + extra : "") + '">' + e(s) + "</span>";
  }
  // Metric: value só quando MEASURED; caso contrário mostra o estado (nunca zero inventado).
  function metric(m) {
    if (!m) return '<span class="stat-state">UNKNOWN</span>';
    if (m.state === "MEASURED" && typeof m.value === "number") return '<span class="stat">' + e(fmtNum(m.value)) + "</span>";
    return '<span class="stat-state">' + e(m.state || "UNKNOWN") + "</span>";
  }
  function fmtNum(n) {
    return Number.isInteger(n) ? n.toLocaleString("pt-BR") : n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  }
  function ts(s) {
    if (!s) return "—";
    var d = new Date(s);
    if (isNaN(d)) return e(s);
    return e(d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })) + " BRT";
  }
  function ago(s) {
    if (!s) return "";
    var mins = Math.round((Date.now() - new Date(s).getTime()) / 60000);
    if (isNaN(mins)) return "";
    if (mins < 0) return "em " + fmtDur(-mins);
    return "há " + fmtDur(mins);
  }
  function fmtDur(m) {
    if (m < 60) return m + " min";
    if (m < 48 * 60) return Math.round(m / 60) + " h";
    return Math.round(m / 1440) + " d";
  }
  function card(title, body, opts) {
    opts = opts || {};
    return '<section class="card ' + (opts.q ? "q " : "") + (opts.cls || "") + " " + (opts.span || "span-12") + '"' +
      (opts.q ? ' data-q="' + e(opts.q) + '"' : "") + (opts.label ? ' aria-label="' + e(opts.label) + '"' : "") + ">" +
      (title ? "<h2" + (opts.q ? ' data-q="' + e(opts.q) + '"' : "") + ">" + e(title) + "</h2>" : "") + body + "</section>";
  }
  function empty(text) { return '<p class="empty">' + e(text) + "</p>"; }
  function issueUrl(item, decision, title) {
    var q = "template=human-gate-decision.yml&labels=human-gate" +
      "&title=" + encodeURIComponent("[HUMAN_GATE] " + item + " " + decision + (title ? " — " + title.slice(0, 80) : "")) +
      "&item=" + encodeURIComponent(item) + "&decision=" + encodeURIComponent(decision);
    return REPO + "/issues/new?" + q;
  }

  // ------------------------------------------------------------ derived views
  function needsYou() {
    var items = [];
    (D.HUMAN_REVIEW_QUEUE.items || []).forEach(function (r) {
      if (r.status !== "WAITING_REVIEW") return;
      items.push({ kind: "REVISÃO EDITORIAL", priority: "P0", id: r.review_id, title: r.title,
        what: r.claim_summary, why: "Motivo: " + r.review_reason + ". Nenhuma conclusão política substantiva sai sem o Human Gate.",
        impact: "Bloqueia a história " + r.story_id + " até a decisão.",
        evidence: [r.evidence_summary, r.counter_evidence_summary ? "Contraevidência: " + r.counter_evidence_summary : null,
          "RHR: " + r.rhr_context.result].filter(Boolean),
        sources: r.sources || [], review: r });
    });
    (D.DECISION_QUEUE.items || []).forEach(function (d) {
      if (d.status !== "OPEN") return;
      items.push({ kind: d.kind.replace(/_/g, " "), priority: d.priority, id: d.item_id, title: d.title,
        what: d.what, why: d.why_decision, impact: d.impact, evidence: d.evidence || [], actions: d.possible_actions,
        actionUrl: d.action_url });
    });
    (D.INCIDENTS.items || []).forEach(function (i) {
      if (i.status === "RESOLVED" || (i.severity !== "SEV1" && i.severity !== "SEV2")) return;
      items.push({ kind: "INCIDENTE CRÍTICO", priority: "P0", id: i.incident_id, title: i.component + " — " + i.type,
        what: i.description, why: "Severidade " + i.severity + ".", impact: i.impact, evidence: i.evidence_url ? [i.evidence_url] : [],
        actions: ["Acompanhar incidente"], actionUrl: i.evidence_url });
    });
    function rank(p) { return p in PRI ? PRI[p] : 9; }
    items.sort(function (a, b) { return rank(a.priority) - rank(b.priority); });
    return items;
  }

  function renderNeed(n, compact) {
    var h = '<li class="need"><div class="row"><span class="muted small">' + e(n.kind) + " · <code>" + e(n.id) + "</code></span>" + chip(n.priority) + "</div>" +
      "<h3>" + e(n.title) + "</h3>";
    if (!compact) {
      h += '<dl class="kv"><dt>O que é</dt><dd>' + e(n.what) + "</dd>" +
        "<dt>Por que decidir</dt><dd>" + e(n.why) + "</dd>" +
        "<dt>Impacto</dt><dd>" + e(n.impact) + "</dd>" +
        "<dt>Evidência</dt><dd>" + (n.evidence.length ? n.evidence.map(function (x) { return safeUrl(x) ? link(x) : "<code>" + e(x) + "</code>"; }).join("<br>") : "—") + "</dd>";
      if (n.sources && n.sources.length) {
        h += "<dt>Fontes</dt><dd>" + n.sources.map(function (s) { return link(s.url, s.title); }).join("<br>") + "</dd>";
      }
      if (n.actions) h += "<dt>Ações possíveis</dt><dd>" + n.actions.map(e).join("<br>") + "</dd>";
      h += "</dl>";
    } else {
      h += '<p class="muted small m0">' + e(n.why) + "</p>";
    }
    h += '<div class="actions">';
    if (n.review) {
      [["APPROVE", "approve"], ["REQUEST_CHANGES", ""], ["HOLD", ""], ["REJECT", "reject"]].forEach(function (a) {
        h += '<a class="btn ' + a[1] + '" target="_blank" rel="noopener noreferrer" href="' + e(issueUrl(n.id, a[0], n.title)) + '">' + e(a[0].replace("_", " ")) + "</a>";
      });
    } else if (safeUrl(n.actionUrl)) {
      h += '<a class="btn" target="_blank" rel="noopener noreferrer" href="' + e(n.actionUrl) + '">Decidir no GitHub</a>';
    }
    return h + "</div></li>";
  }

  function pipeline() {
    var st = D.PIPELINE_TODAY.stages;
    return '<ol class="pipe" aria-label="Pipeline editorial de hoje">' + st.map(function (s) {
      var measured = s.state === "MEASURED";
      var cls = (measured ? "measured" : "") + (s.stage === "HUMAN_REVIEW" ? " gate" : "");
      return '<li class="' + cls + '" title="' + e(s.note || s.source || "") + '"><span class="lbl">' + e(s.label) + "</span>" +
        (measured ? '<span class="val">' + e(fmtNum(s.value)) + "</span>" : '<span class="state">' + e(s.state).replace(/_/g, "_<wbr>") + "</span>") + "</li>";
    }).join("") + "</ol>";
  }

  function routines() {
    var cs = D.CURRENT_STATE;
    return '<ol class="steps">' + ["MORNING_OPEN", "AFTERNOON_UPDATE", "EVENING_CLOSE"].map(function (r) {
      var x = cs.routines[r];
      return '<li><div class="name">' + e(r) + "</div>" + chip(x.status) +
        '<div class="muted small">' + (x.finished_at ? "fim " + ts(x.finished_at) : x.started_at ? "início " + ts(x.started_at) : "—") + "</div>" +
        (x.summary ? '<div class="small">' + e(x.summary) + "</div>" : "") + "</li>";
    }).join("") + "</ol>";
  }

  function alerts() {
    var comps = D.HEALTH.components, out = [];
    Object.keys(comps).forEach(function (k) {
      var c = comps[k];
      if (c.status === "FAILED" || c.status === "DEGRADED") out.push({ k: k, c: c, rank: c.status === "FAILED" ? 0 : 1 });
    });
    (D.INCIDENTS.items || []).filter(function (i) { return i.status !== "RESOLVED"; }).forEach(function (i) {
      out.push({ inc: i, rank: 0 });
    });
    out.sort(function (a, b) { return a.rank - b.rank; });
    var unknown = Object.keys(comps).filter(function (k) { return comps[k].status === "UNKNOWN"; });
    var h = out.length ? '<ul class="list">' + out.map(function (a) {
      if (a.inc) return '<li><div class="row"><strong>' + e(a.inc.incident_id) + " · " + e(a.inc.component) + "</strong>" + chip(a.inc.severity) + '</div><div class="small">' + e(a.inc.description) + "</div></li>";
      return '<li><div class="row"><strong>' + e(a.k) + "</strong>" + chip(a.c.status) + '</div><div class="small">' + e(a.c.summary) + "</div></li>";
    }).join("") + "</ul>" : empty("Nenhum componente degradado e nenhum incidente ativo.");
    if (unknown.length) {
      h += '<p class="small muted mt12">Sem sinal (UNKNOWN): ' + unknown.map(function (u) { return "<code>" + e(u) + "</code>"; }).join(", ") + "</p>";
    }
    return h;
  }

  function resultsSummary() {
    var R = D.RESULTS, all = R.site.concat(R.video);
    var configured = all.filter(function (m) { return m.state !== "NOT_CONFIGURED"; }).length;
    var hcv = R.historical_context_value;
    var h = '<div class="stats"><div><div class="muted small">Métricas com fonte</div><div class="stat">' + configured + " / " + all.length + "</div></div>" +
      '<div><div class="muted small">Analytics</div>' + chip(D.HEALTH.components.ANALYTICS.status) + "</div>" +
      '<div><div class="muted small">Contexto histórico útil</div>' + metric(hcv) + '<div class="muted small">' + e(hcv.evaluated_count) + " avaliações humanas</div></div></div>";
    if (!configured) h += '<p class="small muted mt12">Ainda não sabemos se há resultado: sem analytics configurado, nenhum número é exibido.</p>';
    return h;
  }

  // ------------------------------------------------------------ pages
  var PAGES = {};

  PAGES.executiva = function () {
    var cs = D.CURRENT_STATE, needs = needsYou(), overall = cs.overall_status;
    var measuredStages = D.PIPELINE_TODAY.stages.filter(function (s) { return s.state === "MEASURED"; }).length;
    var anyRoutine = ["MORNING_OPEN", "AFTERNOON_UPDATE", "EVENING_CLOSE"].some(function (r) { return cs.routines[r].status !== "NOT_EXECUTED"; });
    var h = "<h1>Visão executiva</h1><p class=\"lede\">Dia operacional <strong>" + e(cs.operational_date) + "</strong> · atualizado " + ts(cs.updated_at) + " (" + e(ago(cs.updated_at)) + ").</p>";
    h += '<div class="grid"><div class="span-7 stack">';
    h += card("Como está o Desmentindo?",
      '<div class="hero"><span class="hero-status">' + e(STATE_TEXT[overall] || overall) + "</span>" + chip(overall, "big") + "</div>" +
      '<p class="muted mt8">' + e(cs.degraded_services.length ? "Degradado: " + cs.degraded_services.join(", ") + ". " : "") +
      e((cs.unknown_services || []).length + " componente(s) sem sinal. ") + "PUBLISH " + chip(cs.publish_state) + " · Human Gate " + chip(cs.human_gate_state === "REQUIRED" ? "REQUIRED" : cs.human_gate_state, "ok") + "</p>",
      { span: "span-7", q: "1", cls: "o1", label: "Status geral" });
    h += card("O que aconteceu hoje?",
      routines() + '<p class="small muted mt10">Última execução: ' + (cs.last_run ? "<code>" + e(cs.last_run.routine) + "</code> " + chip(cs.last_run.status) + " " + ts(cs.last_run.finished_at) : "nenhuma rotina executada via Claude Code") +
      " · Próxima: <code>" + e(cs.next_run.routine) + "</code> " + chip(cs.next_run.mode, cs.next_run.mode === "MANUAL" ? "unk" : "ok") + "</p>" +
      (!anyRoutine ? '<p class="small muted mt6">Nenhuma rotina rodou hoje. Os números do dia ficam NOT_EXECUTED até a primeira execução.</p>' : ""),
      { span: "span-7", q: "3", cls: "o3", label: "Hoje" });
    h += '</div>';
    h += card("O que precisa de mim?",
      needs.length ? '<ul class="list">' + needs.slice(0, 3).map(function (n) { return renderNeed(n, true); }).join("") + "</ul>" +
        (needs.length > 3 ? '<p class="small"><a href="#/precisa">Ver todos os ' + needs.length + " itens</a></p>" : '<p class="small"><a href="#/precisa">Abrir detalhes</a></p>')
        : empty("Nada aguardando decisão."),
      { span: "span-5", q: "2", cls: "o2 priority" + (needs.length ? "" : " calm"), label: "Precisa de você" });
    h += card("O que está degradado?", alerts(), { span: "span-12", q: "4", label: "Alertas" });
    h += card("O que está sendo produzido?",
      pipeline() + '<p class="small muted mt10">' + measuredStages + " de 10 estágios com número medido hoje. Estados em cinza significam que não há dado; não significam zero.</p>",
      { span: "span-12", q: "5", label: "Pipeline" });
    h += card("Estamos obtendo resultados?", resultsSummary(), { span: "span-12", q: "6", label: "Resultados" });
    return h + "</div>";
  };

  PAGES.precisa = function () {
    var needs = needsYou();
    var h = '<h1>Precisa de você</h1><p class="lede">Revisões editoriais, PRs, decisões de produto, direitos de imagem e incidentes críticos. Cada ação abre uma GitHub Issue (label <code>human-gate</code>) na sua conta; o Claude Code aplica a decisão no Control Plane na rotina seguinte.</p>';
    return h + card(null, needs.length ? '<ul class="list">' + needs.map(function (n) { return renderNeed(n, false); }).join("") + "</ul>" : empty("Nada aguardando decisão."));
  };

  PAGES.hoje = function () {
    var cs = D.CURRENT_STATE, lock = cs.lock;
    var h = "<h1>Hoje · " + e(cs.operational_date) + '</h1><p class="lede">Rotinas do dia, execução em curso e pipeline.</p><div class="grid">';
    h += card("Rotinas", routines(), { span: "span-12" });
    h += card("Execução", '<dl class="kv"><dt>Lock</dt><dd>' + (lock.held ? chip("RUNNING") + " <code>" + e(lock.routine) + "</code> por " + e(lock.holder) + " até " + ts(lock.expires_at) : "livre") + "</dd>" +
      "<dt>Última execução</dt><dd>" + (cs.last_run ? "<code>" + e(cs.last_run.run_id) + "</code> " + chip(cs.last_run.status) : "—") + "</dd>" +
      "<dt>Última com sucesso</dt><dd>" + (cs.last_successful_run ? "<code>" + e(cs.last_successful_run.run_id) + "</code> " + ts(cs.last_successful_run.finished_at) : "—") + "</dd>" +
      "<dt>Último commit operacional</dt><dd>" + (cs.last_operational_commit ? link(REPO + "/commit/" + cs.last_operational_commit, cs.last_operational_commit.slice(0, 7)) : "—") + "</dd>" +
      "<dt>Próxima</dt><dd><code>" + e(cs.next_run.routine) + "</code> · " + e(cs.next_run.mode) + (cs.next_run.scheduled_for ? " · " + ts(cs.next_run.scheduled_for) : "") + (cs.next_run.note ? '<div class="small muted">' + e(cs.next_run.note) + "</div>" : "") + "</dd></dl>",
      { span: "span-6" });
    h += card("Contagens", '<div class="stats"><div><div class="muted small">Histórias abertas</div>' + metric(cs.open_stories) + "</div>" +
      '<div><div class="muted small">Human Review pendente</div>' + metric(cs.pending_human_reviews) + "</div>" +
      '<div><div class="muted small">Decisões abertas</div>' + metric(cs.open_decisions) + "</div>" +
      '<div><div class="muted small">Incidentes ativos</div>' + metric(cs.active_incidents) + "</div></div>", { span: "span-6" });
    h += card("Pipeline", pipeline() + '<div class="table-wrap mt12"><table><thead><tr><th>Estágio</th><th>Estado</th><th>Fonte / nota</th></tr></thead><tbody>' +
      D.PIPELINE_TODAY.stages.map(function (s) {
        return "<tr><td>" + e(s.label) + "</td><td>" + (s.state === "MEASURED" ? e(fmtNum(s.value)) + " " : "") + chip(s.state) + '</td><td class="small">' + e(s.source || "") + (s.note ? '<div class="muted">' + e(s.note) + "</div>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>");
    return h + "</div>";
  };

  PAGES.conteudo = function () {
    var q = D.HUMAN_REVIEW_QUEUE.items || [];
    var by = {};
    q.forEach(function (r) { by[r.status] = (by[r.status] || 0) + 1; });
    var h = '<h1>Conteúdo</h1><p class="lede">Histórias e candidatos editoriais passando pelo Human Review. DAY-STORIES ainda vivem fora do repositório.</p><div class="grid">';
    h += card("Fila de Human Review", '<div class="stats">' + D.HUMAN_REVIEW_QUEUE.statuses.map(function (s) {
      return '<div><div class="muted small">' + e(s) + '</div><div class="stat">' + (by[s] || 0) + "</div></div>";
    }).join("") + "</div>", { span: "span-12" });
    h += card("Itens", q.length ? '<div class="table-wrap"><table><thead><tr><th>Review</th><th>História</th><th>Título</th><th>Motivo</th><th>RHR</th><th>Status</th><th>Decisão</th></tr></thead><tbody>' +
      q.map(function (r) {
        return "<tr><td><code>" + e(r.review_id) + "</code></td><td><code>" + e(r.story_id) + "</code></td><td>" + e(r.title) + "</td><td>" + e(r.review_reason) + "</td><td>" + chip(r.rhr_context.result) + "</td><td>" + chip(r.status) + "</td><td>" +
          (r.decision ? e(r.decision.decided_by) + " · " + link(r.decision.decision_ref, "issue") : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : empty("Fila vazia. Nenhum candidato editorial foi registrado no Control Plane."), { span: "span-12" });
    h += card("Publicação", '<dl class="kv"><dt>PUBLISH</dt><dd>' + chip(D.CURRENT_STATE.publish_state) + "</dd><dt>Publisher</dt><dd>" + chip(D.HEALTH.components.PUBLISHER.status) + " " + e(D.HEALTH.components.PUBLISHER.last_result || "") + "</dd><dt>Regra</dt><dd>O Publisher só abre PR. Publicar = merge humano.</dd></dl>", { span: "span-12" });
    return h + "</div>";
  };

  PAGES.corpus = function () {
    var C = D.CORPUS_STATUS;
    var h = '<h1>Corpus & Intelligence</h1><p class="lede">' + e(C.principle) + "</p>";
    h += '<p class="notice">Unidade de análise: <strong>fonte</strong>. Este painel não tem, e não pode ter, pontuação, ranking ou watchlist de pessoas.</p>';
    h += card("Fontes", '<div class="table-wrap"><table><thead><tr><th>Fonte</th><th>Corpus membership</th><th>Technical searchability</th><th>Adapter</th><th>Cobertura</th><th>Freshness</th></tr></thead><tbody>' +
      C.sources.map(function (s) {
        var cov = s.coverage;
        var covTxt = cov.indexed != null ? fmtNum(cov.indexed) + " / " + fmtNum(cov.total) + " " + cov.unit : "";
        return "<tr><td><strong>" + e(s.display_name) + '</strong><div class="small muted"><code>' + e(s.source_id) + "</code></div>" + (s.notes ? '<div class="small muted">' + e(s.notes) + "</div>" : "") + "</td>" +
          "<td>" + chip(s.corpus_membership, s.corpus_membership === "MEMBER" ? "ok" : "") + "</td><td>" + chip(s.technical_searchability) + "</td><td>" + chip(s.adapter_health) + "</td>" +
          "<td>" + (covTxt ? e(covTxt) + '<progress class="meter" max="100" value="' + e(Math.max(0, Math.min(100, cov.pct))) + '" aria-label="' + e(cov.pct) + '% indexado">' + e(cov.pct) + "%</progress>" : chip(cov.status)) + "</td>" +
          "<td>" + (s.freshness.state === "MEASURED" ? "conteúdo " + e(s.freshness.latest_source_content) + '<div class="small muted">índice ' + e(s.freshness.latest_index) + "</div>" : chip(s.freshness.state)) + "</td></tr>";
      }).join("") + "</tbody></table></div>");
    h += '<div class="spacer"></div>';
    h += card("RHR por fonte", '<div class="table-wrap"><table><thead><tr><th>Fonte</th><th>RHR_WARRANTED</th><th>RHR_EXECUTED</th><th>OCCURRENCES_FOUND</th><th>NO_MATCH</th><th>QUERY_UNAVAILABLE</th></tr></thead><tbody>' +
      C.sources.map(function (s) {
        var r = s.rhr;
        return "<tr><td>" + e(s.display_name) + "</td>" + ["rhr_warranted", "rhr_executed", "occurrences_found", "no_match", "query_unavailable"].map(function (k) {
          return "<td>" + (r[k].state === "MEASURED" ? e(fmtNum(r[k].value)) : chip(r[k].state)) + "</td>";
        }).join("") + "</tr>";
      }).join("") + '</tbody></table></div><p class="small muted mt10">NO_MATCH só aparece depois de uma consulta que realmente rodou. Fonte sem adaptador aparece como QUERY_UNAVAILABLE.</p>');
    h += '<div class="spacer"></div>';
    h += card("Manifests", '<dl class="kv">' + Object.keys(C.manifests).map(function (k) {
      var m = C.manifests[k];
      return "<dt>" + e(k) + "</dt><dd><code>" + e(m.path) + "</code> · " + e(m.build_id) + " · " + ts(m.generated_at) + "</dd>";
    }).join("") + '</dl><p class="forbidden mt10">Bloqueados pelo validate: person_score · political_score · suspicion_score · wrongdoing_score · controversy_score · person_ranking · person_watchlist</p>');
    return h;
  };

  PAGES.saude = function () {
    var H = D.HEALTH.components;
    var h = '<h1>System health</h1><p class="lede">' + D.HEALTH.invariants.map(e).join(" · ") + "</p>";
    return h + card(null, '<div class="table-wrap"><table><thead><tr><th>Componente</th><th>Status</th><th>Último sucesso</th><th>Última falha</th><th>Duração</th><th>Próxima</th><th>Resultado / erro</th></tr></thead><tbody>' +
      Object.keys(H).map(function (k) {
        var c = H[k];
        return "<tr><td><strong>" + e(k) + '</strong><div class="small muted">' + e(c.summary) + '</div><div class="small muted">' + e(c.location) + (c.evidence_url ? " · " + link(c.evidence_url, "evidência") : "") + "</div></td>" +
          "<td>" + chip(c.status) + "</td><td>" + ts(c.last_success) + '<div class="small muted">' + e(ago(c.last_success)) + "</div></td><td>" + ts(c.last_failure) + "</td>" +
          '<td class="num">' + (c.duration_seconds != null ? e(c.duration_seconds) + " s" : "—") + "</td><td>" + ts(c.next_run) + "</td>" +
          '<td class="small">' + e(c.last_result || "—") + (c.error_summary ? '<div class="err">' + e(c.error_summary) + "</div>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>");
  };

  PAGES.resultados = function () {
    var R = D.RESULTS;
    function table(rows) {
      return '<div class="table-wrap"><table><thead><tr><th>Métrica</th><th>Valor</th><th>Período</th><th>Fonte</th></tr></thead><tbody>' +
        rows.map(function (m) {
          return "<tr><td>" + e(m.label) + '<div class="small muted"><code>' + e(m.metric) + "</code></div></td><td>" + (m.state === "MEASURED" ? e(fmtNum(m.value)) : chip(m.state)) + "</td><td>" + e(m.period || "—") + "</td><td>" + e(m.source || "—") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    var hcv = R.historical_context_value;
    var h = '<h1>Resultados</h1><p class="lede">' + e(R.rule) + "</p><div class=\"grid\">";
    h += card("Site", table(R.site), { span: "span-6" });
    h += card("Vídeo", table(R.video), { span: "span-6" });
    h += card("HISTORICAL_CONTEXT_VALUE", '<p class="m0b">' + e(hcv.definition) + "</p>" +
      '<div class="stats"><div><div class="muted small">Valor</div>' + metric(hcv) + '</div><div><div class="muted small">Avaliações</div><div class="stat">' + e(hcv.evaluated_count) + "</div></div></div>" +
      '<dl class="kv mt12"><dt>Método</dt><dd>' + e(hcv.method) + " (sem score automático)</dd><dt>Fórmula</dt><dd>" + e(hcv.formula) + "</dd><dt>Registrar</dt><dd><code>ctl.py hcv add --story-id … --by Johnny --verdict USEFUL|NOT_USEFUL|NOT_APPLICABLE --justification …</code></dd></dl>" +
      (hcv.evaluations.length ? '<div class="table-wrap mt12"><table><thead><tr><th>História</th><th>Veredito</th><th>Por</th><th>Justificativa</th></tr></thead><tbody>' +
        hcv.evaluations.map(function (v) { return "<tr><td><code>" + e(v.story_id) + "</code></td><td>" + chip(v.verdict === "USEFUL" ? "HEALTHY" : "UNKNOWN") + " " + e(v.verdict) + "</td><td>" + e(v.evaluated_by) + " · " + ts(v.evaluated_at) + "</td><td>" + e(v.justification) + "</td></tr>"; }).join("") +
        "</tbody></table></div>" : ""), { span: "span-12" });
    return h + "</div>";
  };

  PAGES.video = function () {
    var V = D.VIDEO_ENGINE;
    var h = '<h1>Video Engine</h1><p class="lede">' + e(V.source_of_state) + "</p><div class=\"grid\">";
    h += card("Estado", '<dl class="kv">' + Object.keys(V.state).map(function (k) {
      var v = V.state[k];
      return "<dt><code>" + e(k) + "</code></dt><dd>" + chip(v, v === "NO" ? "unk" : v === "OFF" ? "" : "warn") + "</dd>";
    }).join("") + "</dl>", { span: "span-6" });
    h += card("Próximos passos", '<ol class="ol">' + V.next_steps.map(function (s) { return "<li>" + e(s) + "</li>"; }).join("") + "</ol>" +
      '<p class="small muted">Nenhum render acontece neste repositório.</p>', { span: "span-6" });
    h += card("Métricas de vídeo", D.RESULTS.video.map(function (m) { return "<div class=\"row py4\"><span>" + e(m.label) + "</span>" + (m.state === "MEASURED" ? e(fmtNum(m.value)) : chip(m.state)) + "</div>"; }).join(""), { span: "span-12" });
    return h + "</div>";
  };

  PAGES.engenharia = function () {
    var G = D.ENGINEERING;
    var h = '<h1>Produto & Engenharia</h1><p class="lede">' + e(G.stack) + "</p><div class=\"grid\">";
    h += card("Workflows", '<div class="table-wrap"><table><thead><tr><th>Arquivo</th><th>Gatilho</th><th>Estado</th><th>Última execução</th></tr></thead><tbody>' +
      G.workflows.map(function (w) { return "<tr><td><code>" + e(w.file) + "</code></td><td>" + e(w.trigger) + "</td><td>" + chip(w.state === "ACTIVE" ? "HEALTHY" : "UNKNOWN") + " " + e(w.state) + "</td><td>" + (w.last_conclusion ? e(w.last_conclusion) + " · " + ts(w.last_run_at) : "—") + "</td></tr>"; }).join("") +
      "</tbody></table></div>", { span: "span-12" });
    h += card("Repositório", '<dl class="kv"><dt>Repo</dt><dd>' + link(REPO, G.repository.full_name) + " · " + chip(G.repository.visibility, G.repository.visibility === "PUBLIC" ? "warn" : "ok") + "</dd><dt>HEAD main</dt><dd><code>" + e(G.repository.head.slice(0, 7)) + "</code></dd><dt>PRs abertos</dt><dd>" + metric(G.open_prs) + "</dd><dt>Branches antigas</dt><dd>" + G.stale_branches.map(function (b) { return "<code>" + e(b) + "</code>"; }).join("<br>") + "</dd></dl>", { span: "span-5" });
    h += card("Backlog", '<ul class="list">' + G.backlog.map(function (b) {
      return '<li><div class="row"><strong>' + e(b.id) + " · " + e(b.title) + "</strong><span>" + chip(b.priority) + " " + chip(b.status === "OPEN" ? "OPEN" : "RESOLVED") + '</span></div><div class="small muted">' + e(b.detail || "") + "</div></li>";
    }).join("") + "</ul>", { span: "span-7" });
    return h + "</div>";
  };

  PAGES.negocio = function () {
    var B = D.BUSINESS;
    var h = "<h1>" + e(B.line) + '</h1><p class="lede">' + e(B.note) + "</p><div class=\"grid\">";
    h += card("Métricas", '<div class="stats">' + B.metrics.map(function (m) { return '<div><div class="muted small">' + e(m.label) + "</div>" + metric(m) + "</div>"; }).join("") + "</div>", { span: "span-12" });
    h += card("Ativos de dados existentes", '<ul class="list">' + B.data_assets.map(function (a) { return '<li><div class="row"><strong>' + e(a.asset) + "</strong>" + chip(a.state, "ok") + '</div><div class="small muted">' + e(a.size) + " · <code>" + e(a.source) + "</code></div></li>"; }).join("") + "</ul>", { span: "span-7" });
    h += card("Guardrail", "<p class=\"m0\">" + e(B.guardrail) + "</p>", { span: "span-5" });
    return h + "</div>";
  };

  PAGES.incidentes = function () {
    var I = D.INCIDENTS.items || [];
    var sorted = I.slice().sort(function (a, b) { return (a.status === "RESOLVED") - (b.status === "RESOLVED") || (b.timestamp > a.timestamp ? 1 : -1); });
    var h = '<h1>Incidentes</h1><p class="lede">Tipos conhecidos: ' + D.INCIDENTS.types.map(function (t) { return "<code>" + e(t) + "</code>"; }).join(" ") + "</p>";
    return h + card(null, sorted.length ? '<ul class="list">' + sorted.map(function (i) {
      return '<li><div class="row"><strong>' + e(i.incident_id) + " · " + e(i.component) + " · " + e(i.type) + "</strong><span>" + chip(i.severity) + " " + chip(i.status) + "</span></div>" +
        '<dl class="kv mt8"><dt>Início</dt><dd>' + ts(i.timestamp) + "</dd><dt>Descrição</dt><dd>" + e(i.description) + "</dd><dt>Impacto</dt><dd>" + e(i.impact) + "</dd><dt>Resolução</dt><dd>" + e(i.resolution || "Em aberto") + (i.resolved_at ? " · " + ts(i.resolved_at) : "") + "</dd>" +
        (i.evidence_url ? "<dt>Evidência</dt><dd>" + link(i.evidence_url) + "</dd>" : "") + "</dl></li>";
    }).join("") + "</ul>" : empty("Nenhum incidente registrado."));
  };

  // ------------------------------------------------------------ shell
  function renderNav(active) {
    var needs = needsYou().length;
    var activeInc = (D.INCIDENTS.items || []).filter(function (i) { return i.status !== "RESOLVED"; }).length;
    document.getElementById("nav").innerHTML = AREAS.map(function (a, i) {
      var badge = a.id === "precisa" && needs ? '<span class="count" aria-label="' + needs + ' itens">' + needs + "</span>" :
        a.id === "incidentes" && activeInc ? '<span class="count" aria-label="' + activeInc + ' ativos">' + activeInc + "</span>" : "";
      return '<li><a href="#/' + a.id + '"' + (a.id === active ? ' aria-current="page"' : "") + "><span>" + (i + 1) + ". " + e(a.label) + "</span>" + badge + "</a></li>";
    }).join("");
  }

  function renderTop() {
    var cs = D.CURRENT_STATE;
    document.getElementById("top-meta").innerHTML =
      chip(cs.overall_status) + ' <span class="chip OFF">PUBLISH ' + e(cs.publish_state) + "</span> " +
      '<span class="chip ok">HUMAN GATE ' + e(cs.human_gate_state) + "</span> " +
      '<span class="muted small">' + e(cs.operational_date) + "</span>";
  }

  function route() {
    var id = (location.hash.replace(/^#\/?/, "") || "executiva");
    if (!PAGES[id]) id = "executiva";
    renderNav(id);
    var main = document.getElementById("main");
    try {
      main.innerHTML = PAGES[id]();
    } catch (err) {
      main.innerHTML = '<p class="notice">Falha ao renderizar esta área: ' + e(err.message) + ". Rode <code>ctl.py validate</code>.</p>";
    }
    var label = (AREAS.filter(function (a) { return a.id === id; })[0] || AREAS[0]).label;
    document.title = label + " · Desmentindo Command Center";
    if (route.done) main.focus();
    route.done = true;
  }

  function load() {
    var base = "../control/";
    return Promise.all(FILES.map(function (f) {
      return fetch(base + f + ".json", { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error(f + " HTTP " + r.status);
        return r.json();
      });
    })).then(function (arr) {
      var out = {};
      FILES.forEach(function (f, i) { out[f] = arr[i]; });
      SOURCE = { kind: "LIVE", note: "Dados lidos agora de control/*.json." };
      return out;
    }).catch(function () {
      var b = window.CC_BUNDLE;
      if (!b) throw new Error("Sem acesso a control/*.json e sem data.js. Rode ctl.py sync.");
      var out = {};
      FILES.forEach(function (f) { out[f] = b.files[f + ".json"]; });
      var ageH = (Date.now() - new Date(b.generated_at).getTime()) / 3600000;
      SOURCE = { kind: "BUNDLE", generated_at: b.generated_at, stale: ageH > 24,
        note: "Modo offline: snapshot data.js gerado " + new Date(b.generated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " BRT." };
      return out;
    });
  }

  load().then(function (data) {
    D = data;
    renderTop();
    var sn = document.getElementById("source-note");
    sn.textContent = SOURCE.note + (SOURCE.stale ? " ATENÇÃO: snapshot com mais de 24 h." : "");
    if (SOURCE.stale) document.getElementById("top-meta").insertAdjacentHTML("beforeend", ' <span class="chip warn">SNAPSHOT ANTIGO</span>');
    window.addEventListener("hashchange", route);
    route();
  }).catch(function (err) {
    document.getElementById("main").innerHTML = '<p class="notice">' + e(err.message) + "</p>";
  });
})();
