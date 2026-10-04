/*!
 * DESMENTINDO — acervos.js (Corpus UI Implementation Candidate v2 — Product Evolution v2)
 *
 * "Nos acervos" — curated, privacy-gated (PUBLIC_ELIGIBILITY=ELIGIBLE only)
 * layer over the documentary corpus (AG today; CC/others when eligible in a
 * future build). Follows the same pattern already proven in
 * js/multisource.*.js: this file is a pure, source-agnostic library exposed
 * on window.DesmentindoAcervos — it does not touch the DOM and does not
 * assume anything about the render code around it. The glue that wires it
 * into VIEWFN.pessoa/VIEWFN.caso/VIEWFN.busca/VIEWFN.acervos is injected
 * separately, directly inside the main app's inline <script>, exactly like
 * the AG multisource bootstrap.
 *
 * v2 additions over v1: compact search index (separate, small, prefetchable
 * — never the full occurrence dataset) powering evolved search + a new
 * lightweight "Nos acervos" hub (explore by person/case, simple year
 * timeline); "também localizado neste vídeo" cross-reference (co-occurrence
 * within one video, explicitly NEVER framed as a relationship — see the
 * round's own principle: OCORRÊNCIA ≠ EVIDÊNCIA, RELAÇÃO ≠ COOCORRÊNCIA);
 * first/last occurrence; correct handling of occurrences with no timestamp
 * (never fabricates 0:00).
 *
 * CANDIDATE ONLY. Feature-flagged (CORPUS_UI_ENABLED in the bootstrap glue).
 * Never loads REVIEW_REQUIRED / INTERNAL_ONLY / REJECTED data — the dataset
 * this file fetches (data/corpus/*.json) was built exclusively from
 * PUBLIC_ELIGIBILITY=ELIGIBLE records; there is no code path here that can
 * render anything else, because no other classification ever reaches this
 * file's input.
 */
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normText(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function ytLink(videoId, t) {
    var hasTs = (t !== null && t !== undefined && t >= 0);
    return 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + (hasTs && t > 0 ? '&t=' + Math.floor(t) + 's' : '');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = String(iso).slice(0, 10).split('-');
    if (d.length !== 3) return String(iso).slice(0, 10);
    return d[2] + '/' + d[1] + '/' + d[0];
  }

  function clock(s) {
    if (s === null || s === undefined) return null; // never fabricate 0:00 for a missing timestamp
    var m = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
    return m + ':' + ss;
  }

  function yearOf(iso) {
    return iso ? String(iso).slice(0, 4) : '—';
  }

  var _manifestPromise = null;
  function getManifest() {
    if (_manifestPromise) return _manifestPromise;
    var metaEl = document.querySelector('meta[name="acervos-manifest"]');
    var url = metaEl ? metaEl.getAttribute('content') : 'data/corpus/manifest.json';
    _manifestPromise = fetch(url, { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error('acervos manifest fetch failed: ' + r.status); return r.json(); });
    return _manifestPromise;
  }

  // Compact index (counts + year breakdown, no occurrence text) — safe to
  // prefetch eagerly for search-as-you-type; never triggers the heavy dataset fetch.
  var _indexPromise = null;
  function ensureIndex() {
    if (_indexPromise) return _indexPromise;
    _indexPromise = getManifest().then(function (manifest) {
      if (!manifest.ui_enabled) throw new Error('acervos UI disabled in manifest (feature flag off)');
      if (!manifest.index || !manifest.index.url) throw new Error('acervos manifest has no index published');
      return fetch(manifest.index.url, { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error('acervos index fetch failed: ' + r.status);
        return r.json();
      });
    });
    return _indexPromise;
  }

  // Full occurrence dataset — only fetched when a person/case panel is actually opened.
  var _linksPromise = null;
  function ensureLinks() {
    if (_linksPromise) return _linksPromise;
    _linksPromise = getManifest().then(function (manifest) {
      if (!manifest.ui_enabled) throw new Error('acervos UI disabled in manifest (feature flag off)');
      if (!manifest.dataset || !manifest.dataset.url) throw new Error('acervos manifest has no dataset published');
      return fetch(manifest.dataset.url, { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error('acervos dataset fetch failed: ' + r.status);
        return r.json();
      });
    });
    return _linksPromise;
  }

  /* ---------- occurrence / video-group rendering ---------- */

  var SOURCE_LABEL = { AG: 'Alexandre Garcia (YouTube)', CC: 'Canal Cravo (YouTube)' };

  function occurrenceRow(occ) {
    var c = clock(occ.timestamp);
    var link = occ.video_id ? ytLink(occ.video_id, occ.timestamp) : null;
    return '<div class="acseg">' +
      (link
        ? '<a class="acseg-t mono" href="' + escHtml(link) + '" target="_blank" rel="noopener noreferrer">' + (c || 'ver vídeo') + '</a>'
        : '<span class="acseg-t mono">—</span>') +
      '<div class="acseg-b">' +
        '<span class="pill k">' + escHtml(SOURCE_LABEL[occ.source] || occ.source) + '</span> ' +
        '<span class="mute" style="font-size:12px">' + escHtml(fmtDate(occ.published_at)) + (c ? '' : ' · timestamp indisponível') + '</span>' +
        '<blockquote class="acq">&ldquo;' + escHtml(occ.text) + '&rdquo;</blockquote>' +
        (link ? '<a class="btn ghost" href="' + escHtml(link) + '" target="_blank" rel="noopener noreferrer" style="margin-top:4px;display:inline-block">Ver no vídeo</a>' : '') +
      '</div></div>';
  }

  // "Também localizado neste vídeo" — co-occurrence within one video, never
  // framed as a relationship (RELAÇÃO ≠ COOCORRÊNCIA, enforced by copy).
  // selfKey identifies the current person/case so it never lists itself.
  function crossRefHtml(videoId, indexData, selfType, selfKey) {
    if (!indexData || !indexData.video_targets) return '';
    var targets = indexData.video_targets[videoId];
    if (!targets || !targets.length) return '';
    var others = targets.filter(function (t) { return !(t.type === selfType && t.name === selfKey); });
    if (!others.length) return '';
    var chips = others.slice(0, 6).map(function (t) {
      var href = t.type === 'pessoa'
        ? '#/pessoa?n=' + encodeURIComponent(t.name) + '&pt=acervos'
        : '#/caso?c=' + encodeURIComponent(t.name);
      var label = t.type === 'caso' && indexData.cases[t.name] ? (indexData.cases[t.name].display_label || t.name) : t.name;
      return '<a class="chip" href="' + escHtml(href) + '" style="text-decoration:none">' + escHtml(label) + '</a>';
    }).join('');
    return '<p class="mute" style="font-size:12px;margin:4px 0 0">Também localizado neste vídeo: ' + chips + '</p>';
  }

  function videoGroupBlock(group, indexData, selfType, selfKey) {
    var n = group.occurrence_count;
    var first = group.occurrences && group.occurrences[0];
    var titleLine = '<span class="mono" style="font-size:12.5px">' + escHtml(group.video_id) + '</span> · ' + escHtml(fmtDate(group.published_at));
    var cross = crossRefHtml(group.video_id, indexData, selfType, selfKey);
    if (n <= 1) {
      return '<div class="acvg" style="margin-bottom:10px"><div class="mute" style="font-size:12px;margin-bottom:2px">' + titleLine + '</div>' +
        (first ? occurrenceRow(first) : '') + cross + '</div>';
    }
    return '<details class="acvg-more" style="margin-bottom:10px">' +
      '<summary>' + titleLine + ' — <b>' + n + ' ocorrências neste vídeo</b></summary>' +
      (group.occurrences || []).map(occurrenceRow).join('') + cross +
      '</details>';
  }

  /* ---------- filter + pagination state (per entity key, module-local) ---------- */
  var _filterState = {}; // key -> {year: string|null, page: number}
  var PAGE_SIZE = 5; // video-groups per page, matches the "Ver todos os N" progressive-disclosure pattern already used elsewhere in the product

  function getFilterState(key) {
    if (!_filterState[key]) _filterState[key] = { year: null, page: 1 };
    return _filterState[key];
  }

  // Shareable filter state via URL query (?acy=2026 on top of the existing
  // n=/c= params) — read on panel open so a shared link reproduces the view.
  function readShareableYear() {
    var q = new URLSearchParams((location.hash.split('?')[1] || ''));
    return q.get('acy') || null;
  }

  function yearsIn(groups) {
    var set = {};
    (groups || []).forEach(function (g) { set[yearOf(g.published_at)] = true; });
    return Object.keys(set).sort().reverse();
  }

  function firstLastHtml(groups) {
    if (!groups.length) return '';
    var sorted = groups.slice().sort(function (a, b) { return String(a.published_at || '').localeCompare(String(b.published_at || '')); });
    var first = sorted[0], last = sorted[sorted.length - 1];
    if (first === last) return '';
    return '<p class="mute" style="font-size:12px;margin:2px 0 8px">Primeira ocorrência localizada neste acervo: ' + escHtml(fmtDate(first.published_at)) +
      ' · Última ocorrência localizada: ' + escHtml(fmtDate(last.published_at)) + '</p>';
  }

  function renderPanelBody(entry, key, indexData, selfType, selfKey) {
    var st = getFilterState(key);
    if (st.year === null && st.page === 1 && !st._sharedRead) {
      var shared = readShareableYear();
      if (shared) st.year = shared;
      st._sharedRead = true;
    }
    var groups = (entry.ag_video_groups || []).slice().sort(function (a, b) {
      return String(b.published_at || '').localeCompare(String(a.published_at || ''));
    });
    var years = yearsIn(groups);
    var filtered = st.year ? groups.filter(function (g) { return yearOf(g.published_at) === st.year; }) : groups;
    var totalOcc = entry.ag_occurrence_count || 0;
    var shown = filtered.slice(0, st.page * PAGE_SIZE);
    var rest = filtered.length - shown.length;

    var chips = years.length > 1
      ? '<div class="chips" style="margin:8px 0">' +
          '<button class="chip" data-ac-year="" data-ac-key="' + escHtml(key) + '" aria-pressed="' + (!st.year) + '">Todos os anos</button>' +
          years.map(function (y) {
            return '<button class="chip" data-ac-year="' + escHtml(y) + '" data-ac-key="' + escHtml(key) + '" aria-pressed="' + (st.year === y) + '">' + escHtml(y) + '</button>';
          }).join('') +
        '</div>'
      : '';

    var summary = '<p class="mute" style="font-size:13px;margin:0 0 2px">' + totalOcc + ' ocorrência(s) localizada(s)' +
      (entry.ag_video_count ? ' em ' + entry.ag_video_count + ' vídeo(s)' : '') + '.</p>' + firstLastHtml(groups);

    var help = '<p class="mute" style="font-size:12px;margin:4px 0 10px">Ocorrência significa que o assunto ou pessoa foi localizado no acervo; não representa confirmação independente, prova ou veredito. Os resultados refletem os acervos atualmente integrados e publicamente elegíveis no Desmentindo.</p>';

    var body = filtered.length
      ? shown.map(function (g) { return videoGroupBlock(g, indexData, selfType, selfKey); }).join('') + (rest > 0
          ? '<button class="btn ghost" data-ac-more="' + escHtml(key) + '" style="margin-top:6px">Ver mais ' + Math.min(rest, PAGE_SIZE) + ' (' + rest + ' restantes) →</button>'
          : '')
      : '<div class="empty">Nenhuma ocorrência para o filtro selecionado.</div>';

    return '<div id="acervos-panel-root-' + escHtml(key) + '" class="acervos-panel" data-ac-panel="' + escHtml(key) + '">' +
      '<h2 style="margin-top:4px">Nos acervos</h2>' + summary + chips + body + help +
      '</div>';
  }

  function reRenderPanel(key, entry, indexData, selfType, selfKey) {
    var root = document.querySelector('[data-ac-panel="' + cssEscape(key) + '"]');
    if (!root) return;
    var html = renderPanelBody(entry, key, indexData, selfType, selfKey);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var newRoot = tmp.firstChild;
    root.replaceWith(newRoot);
    // keep the URL's ?acy= in sync so the filtered view is shareable (no router rewrite)
    var st = getFilterState(key);
    try {
      var base = location.hash.split('?')[0];
      var q = new URLSearchParams((location.hash.split('?')[1] || ''));
      if (st.year) q.set('acy', st.year); else q.delete('acy');
      var qs = q.toString();
      history.replaceState(null, '', base + (qs ? '?' + qs : ''));
    } catch (e) { /* shareable-state is a nicety, never fatal */ }
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, '\\$&');
  }

  /* ---------- delegated click handling for OUR filter/pagination controls ----------
     Bubble-phase, own namespace (data-ac-*), never touches the app's own
     data-pt/data-agt delegated handler — coexists safely. */
  var _entryCache = {}; // key -> {entry, indexData, selfType, selfKey}
  document.addEventListener('click', function (ev) {
    var t = ev.target, x;
    if ((x = t.closest('[data-ac-year]'))) {
      var key = x.getAttribute('data-ac-key');
      var st = getFilterState(key);
      st.year = x.getAttribute('data-ac-year') || null;
      st.page = 1;
      var c1 = _entryCache[key];
      if (c1) reRenderPanel(key, c1.entry, c1.indexData, c1.selfType, c1.selfKey);
      return;
    }
    if ((x = t.closest('[data-ac-more]'))) {
      var key2 = x.getAttribute('data-ac-more');
      getFilterState(key2).page += 1;
      var c2 = _entryCache[key2];
      if (c2) reRenderPanel(key2, c2.entry, c2.indexData, c2.selfType, c2.selfKey);
      return;
    }
  });

  function registerEntry(key, entry, indexData, selfType, selfKey) {
    _entryCache[key] = { entry: entry, indexData: indexData, selfType: selfType, selfKey: selfKey };
  }

  /* ---------- injection helpers: string-surgery on the app's own returned
     HTML, at fixed literal anchors extracted from the verified production
     source. If an anchor is not found (future production markup drift),
     these fail closed: the original HTML is returned untouched and the
     panel silently does not appear — never a broken page. ---------- */

  function injectPersonPanel(html, name, acState, wantOpen) {
    var tnavAnchor0 = '<div class="tnav ptabs"';
    var tnavIdx0 = html.indexOf(tnavAnchor0);
    if (!acState || (!acState.loaded && !acState.error)) {
      // Still in flight (or not started): show a quiet, honest placeholder tab
      // instead of letting the whole tab bar pop a new entry in once the fetch
      // resolves. Never claims a count it doesn't have yet.
      if (tnavIdx0 === -1) return html;
      // Round G fix (editorial hierarchy): insert after the first tab ("Resumo"),
      // not before it — "Nos acervos" is real, useful, secondary evidence, but
      // leading the tab row with it (ahead of the audited editorial summary) read
      // as prioritizing raw corpus material over the dossiê's own content.
      var openEnd0 = html.indexOf('</button>', html.indexOf('>', tnavIdx0) + 1);
      openEnd0 = openEnd0 === -1 ? html.indexOf('>', tnavIdx0) + 1 : openEnd0 + '</button>'.length;
      var loadingBtn = '<button disabled aria-disabled="true" style="opacity:.55;cursor:default">Nos acervos…</button>';
      return html.slice(0, openEnd0) + loadingBtn + html.slice(openEnd0);
    }
    if (!acState.loaded || !acState.links) return html; // failed to load: fail closed, omit silently (unchanged)
    var entry = acState.links.persons[name];
    if (!entry || !((entry.ag_occurrence_count || 0) + (entry.cc_occurrence_count || 0) > 0)) return html; // nothing eligible: omit silently, never a fake empty state

    var key = 'pessoa:' + name;
    registerEntry(key, entry, acState.index, 'pessoa', name);
    var n = entry.ag_occurrence_count + entry.cc_occurrence_count;

    var tnavAnchor = '<div class="tnav ptabs"';
    var tnavIdx = html.indexOf(tnavAnchor);
    if (tnavIdx === -1) return html; // fail closed

    // Same hierarchy fix as the loading placeholder above: land right after the
    // first tab ("Resumo") rather than in front of it.
    var openTagEnd0 = html.indexOf('>', tnavIdx) + 1;
    var firstBtnEnd = html.indexOf('</button>', openTagEnd0);
    var openTagEnd = firstBtnEnd === -1 ? openTagEnd0 : firstBtnEnd + '</button>'.length;
    var pressed = wantOpen ? 'true' : 'false';
    var btn = '<button data-pt="acervos" aria-pressed="' + pressed + '">Nos acervos (' + n + ')</button>';
    html = html.slice(0, openTagEnd) + btn + html.slice(openTagEnd);

    if (wantOpen) {
      html = html.replace('<button data-pt="geral" aria-pressed="true">', '<button data-pt="geral" aria-pressed="false">');

      var notaAnchor = '<div class="note8" style="margin-top:22px"><b>Por que não há nota';
      var notaIdx = html.indexOf(notaAnchor);
      var tnavCloseEnd = findTnavCloseEnd(html, tnavIdx);
      if (notaIdx !== -1 && tnavCloseEnd !== -1 && tnavCloseEnd < notaIdx) {
        html = html.slice(0, tnavCloseEnd) + renderPanelBody(entry, key, acState.index, 'pessoa', name) + html.slice(notaIdx);
      }
    }
    return html;
  }

  function findTnavCloseEnd(html, tnavIdx) {
    var closeIdx = html.indexOf('</div>', tnavIdx);
    return closeIdx === -1 ? -1 : closeIdx + '</div>'.length;
  }

  // caseKey must be the canonical case KEY (S.cs), not the display label —
  // v1 looked this up via D.caso_lbl[S.cs], which happened to equal S.cs for
  // every case with eligible data but was not guaranteed to in general; v2's
  // dataset is keyed by S.cs directly, so the bootstrap glue no longer needs
  // the indirection.
  function injectCasePanel(html, caseKey, acState) {
    var marker0 = '<div class="fa" style="margin-top:14px"><button class="btn ghost" data-sup="';
    var idx0 = html.indexOf(marker0);
    if (!acState || (!acState.loaded && !acState.error)) {
      if (idx0 === -1) return html;
      var loadingLine = '<p class="mute" style="font-size:12px;margin:8px 0" aria-live="polite">Carregando ocorrências do acervo…</p>';
      return html.slice(0, idx0) + loadingLine + html.slice(idx0);
    }
    if (!acState.loaded || !acState.links) return html;
    var entry = acState.links.cases[caseKey];
    if (!entry || !((entry.ag_occurrence_count || 0) + (entry.cc_occurrence_count || 0) > 0)) return html;

    var key = 'caso:' + caseKey;
    registerEntry(key, entry, acState.index, 'caso', caseKey);

    var marker = '<div class="fa" style="margin-top:14px"><button class="btn ghost" data-sup="';
    var idx = html.indexOf(marker);
    if (idx === -1) return html;

    return html.slice(0, idx) + renderPanelBody(entry, key, acState.index, 'caso', caseKey) + html.slice(idx);
  }

  /* ---------- search (§6-14): layered, compact-index-only, no heavy fetch on keystroke ---------- */

  function corpusSearchHtml(query, indexData) {
    var q = normText(query);
    if (!q || !indexData) return '';
    var pHits = Object.keys(indexData.persons).filter(function (n) { return normText(n).indexOf(q) !== -1; }).slice(0, 8);
    var cHits = Object.keys(indexData.cases).filter(function (k) {
      var lbl = (indexData.cases[k] && indexData.cases[k].display_label) || k;
      return normText(lbl).indexOf(q) !== -1;
    }).slice(0, 8);
    if (!pHits.length && !cHits.length) return '';
    function row(label, href, entry) {
      return '<a class="agrow" href="' + escHtml(href) + '"><div class="agrow-t">' + escHtml(label) + '</div>' +
        '<div class="agrow-m mute">' + entry.ag + ' ocorrência(s) localizada(s)' + (entry.ag_videos ? ' em ' + entry.ag_videos + ' vídeo(s)' : '') + '</div></a>';
    }
    var pRows = pHits.map(function (n) { return row(n, '#/pessoa?n=' + encodeURIComponent(n) + '&pt=acervos', indexData.persons[n]); }).join('');
    var cRows = cHits.map(function (k) { return row((indexData.cases[k].display_label || k), '#/caso?c=' + encodeURIComponent(k), indexData.cases[k]); }).join('');
    return '<div class="card" style="margin-bottom:10px"><h3 style="margin-top:0">Nos acervos</h3><div class="aglist">' + pRows + cRows + '</div>' +
      '<p class="mute" style="font-size:12px;margin-top:6px">Ocorrência significa que o assunto ou pessoa foi localizado no acervo; não representa confirmação independente, prova ou veredito. Os resultados refletem os acervos atualmente integrados e publicamente elegíveis no Desmentindo.</p></div>';
  }

  /* ---------- Nos acervos hub (§15-18): explore by person/case + simple year timeline ---------- */

  var _hubState = { sortPeople: 'az', sortCases: 'az', year: null };

  function hubPersonRow(name, entry) {
    return '<a class="agrow" href="#/pessoa?n=' + encodeURIComponent(name) + '&pt=acervos"><div class="agrow-t">' + escHtml(name) + '</div>' +
      '<div class="agrow-m mute">' + entry.ag + ' ocorrência(s) · ' + entry.ag_videos + ' vídeo(s)</div></a>';
  }
  function hubCaseRow(key, entry) {
    return '<a class="agrow" href="#/caso?c=' + encodeURIComponent(key) + '"><div class="agrow-t">' + escHtml(entry.display_label || key) + '</div>' +
      '<div class="agrow-m mute">' + entry.ag + ' ocorrência(s) · ' + entry.ag_videos + ' vídeo(s)</div></a>';
  }

  function sortEntries(names, indexScope, mode) {
    var arr = names.slice();
    if (mode === 'count') arr.sort(function (a, b) { return indexScope[b].ag - indexScope[a].ag; });
    else arr.sort(function (a, b) { return normText(a).localeCompare(normText(b)); }); // a-z default
    return arr;
  }

  function yearTimelineHtml(indexData) {
    var byYear = {};
    ['persons', 'cases'].forEach(function (scope) {
      Object.keys(indexData[scope]).forEach(function (name) {
        var years = indexData[scope][name].years || {};
        Object.keys(years).forEach(function (y) {
          byYear[y] = (byYear[y] || 0) + years[y];
        });
      });
    });
    var yearsSorted = Object.keys(byYear).sort().reverse();
    if (!yearsSorted.length) return '';
    var rows = yearsSorted.map(function (y) {
      return '<div class="lrow" style="cursor:default"><span class="lb"><span class="lm"><b>' + escHtml(y) + '</b></span>' +
        '<span class="lt">' + byYear[y] + ' ocorrência(s) localizada(s) no acervo</span></span></div>';
    }).join('');
    return '<h2>Cronologia do acervo</h2><p class="mute" style="font-size:13px">Distribuição por ano de publicação do vídeo-fonte, não uma linha do tempo de eventos — é uma contagem documental do acervo, não uma reconstrução dos fatos.</p><div class="lline">' + rows + '</div>';
  }

  function hubHtml(indexData) {
    if (!indexData) return '<div class="card" style="padding:20px"><h2>Carregando…</h2></div>';
    var pNames = sortEntries(Object.keys(indexData.persons), indexData.persons, _hubState.sortPeople);
    var cKeys = sortEntries(Object.keys(indexData.cases), indexData.cases, _hubState.sortCases);
    return '<h1>Nos acervos</h1>' +
      '<p class="lead" style="font-size:15px">Explore pessoas e casos do dossiê que possuem ocorrências localizadas nos acervos documentais integrados (hoje: Alexandre Garcia). A ordem não indica relevância, suspeita ou culpa — apenas frequência de ocorrência ou ordem alfabética.</p>' +
      '<h2>Pessoas (' + pNames.length + ')</h2>' +
      '<div class="chips" style="margin-bottom:8px" id="ac-hub-people-chips">' +
        '<button class="chip" data-ac-hub-sort="people:az" aria-pressed="' + (_hubState.sortPeople === 'az') + '">A–Z</button>' +
        '<button class="chip" data-ac-hub-sort="people:count" aria-pressed="' + (_hubState.sortPeople === 'count') + '">Mais ocorrências</button>' +
      '</div>' +
      '<div class="aglist" style="margin-bottom:18px" id="ac-hub-people-list">' + pNames.map(function (n) { return hubPersonRow(n, indexData.persons[n]); }).join('') + '</div>' +
      '<h2>Casos (' + cKeys.length + ')</h2>' +
      '<div class="chips" style="margin-bottom:8px" id="ac-hub-cases-chips">' +
        '<button class="chip" data-ac-hub-sort="cases:az" aria-pressed="' + (_hubState.sortCases === 'az') + '">A–Z</button>' +
        '<button class="chip" data-ac-hub-sort="cases:count" aria-pressed="' + (_hubState.sortCases === 'count') + '">Mais ocorrências</button>' +
      '</div>' +
      '<div class="aglist" style="margin-bottom:18px" id="ac-hub-cases-list">' + cKeys.map(function (k) { return hubCaseRow(k, indexData.cases[k]); }).join('') + '</div>' +
      yearTimelineHtml(indexData);
  }

  // Round G fix: this handler looked for a #acervos-hub-root wrapper to swap
  // via outerHTML on every sort click, but nothing ever wrapped the hub output
  // in one (VIEWFN.acervos returns hubHtml()'s string directly into #main) —
  // so both sort toggles (A–Z / "Mais ocorrências", people and cases) were
  // completely inert: no error, just no visible effect. acervos.candidate.js
  // has no access to the inline app script's renderMain (separate <script>,
  // separate closure — renderMain is never exposed on window), so instead of
  // a full page re-render this patches only the two affected pieces directly:
  // the matching list's contents and both chip rows' aria-pressed, the same
  // "targeted DOM patch" pattern this file already uses elsewhere (year/more
  // pagination) rather than a full-section replace.
  document.addEventListener('click', function (ev) {
    var x = ev.target.closest('[data-ac-hub-sort]');
    if (!x || !window.__acervosHubIndex) return;
    var parts = x.getAttribute('data-ac-hub-sort').split(':');
    var kind = parts[0], mode = parts[1];
    if (kind === 'people') _hubState.sortPeople = mode; else _hubState.sortCases = mode;
    var idx = window.__acervosHubIndex;
    var chipsEl = document.getElementById(kind === 'people' ? 'ac-hub-people-chips' : 'ac-hub-cases-chips');
    var listEl = document.getElementById(kind === 'people' ? 'ac-hub-people-list' : 'ac-hub-cases-list');
    if (chipsEl) {
      var btns = chipsEl.querySelectorAll('[data-ac-hub-sort]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-ac-hub-sort') === (kind + ':' + mode) ? 'true' : 'false');
      }
    }
    if (listEl) {
      if (kind === 'people') {
        var pNames2 = sortEntries(Object.keys(idx.persons), idx.persons, _hubState.sortPeople);
        listEl.innerHTML = pNames2.map(function (n) { return hubPersonRow(n, idx.persons[n]); }).join('');
      } else {
        var cKeys2 = sortEntries(Object.keys(idx.cases), idx.cases, _hubState.sortCases);
        listEl.innerHTML = cKeys2.map(function (k) { return hubCaseRow(k, idx.cases[k]); }).join('');
      }
    }
  });

  window.DesmentindoAcervos = {
    escHtml: escHtml, normText: normText, ytLink: ytLink, fmtDate: fmtDate,
    getManifest: getManifest, ensureIndex: ensureIndex, ensureLinks: ensureLinks,
    injectPersonPanel: injectPersonPanel, injectCasePanel: injectCasePanel,
    renderPanelBody: renderPanelBody, corpusSearchHtml: corpusSearchHtml, hubHtml: hubHtml,
  };
})();
