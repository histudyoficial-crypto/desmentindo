/*!
 * DESMENTINDO — multisource.js (Fase 2 candidate)
 *
 * Source-agnostic manifest reader + lazy per-source loader + unified search.
 * Never hardcodes a source name in its core logic — every source it knows
 * about comes from the public manifest at runtime. Only the per-source
 * ADAPTERS map below is source-specific (today: only 'youtube:alexandre_garcia'
 * has real data — a working adapter). Adding TA/CC later means adding an
 * adapter entry here + publishing their dataset/index files; nothing else
 * in this file changes.
 *
 * Exposes window.DesmentindoMS. Does not touch the DOM and does not assume
 * anything about the render code around it — the app's own bootstrap
 * (injected separately, see build/bootstrap_snippet.js) is what wires this
 * into the existing AG/D globals.
 */
(function () {
  'use strict';

  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let _manifestPromise = null;
  function getManifest() {
    if (_manifestPromise) return _manifestPromise;
    const metaEl = document.querySelector('meta[name="ms-manifest"]');
    const url = metaEl ? metaEl.getAttribute('content') : 'data/manifest.json';
    _manifestPromise = fetch(url, { cache: 'force-cache' })
      .then(r => { if (!r.ok) throw new Error('manifest fetch failed: ' + r.status); return r.json(); });
    return _manifestPromise;
  }

  function getSourceEntry(manifest, sourceId) {
    return (manifest.sources || []).find(s => s.source_id === sourceId) || null;
  }

  const _partitionCache = {}; // source_id -> Promise<{dataset,index}>
  function ensureSourceData(sourceId) {
    if (_partitionCache[sourceId]) return _partitionCache[sourceId];
    _partitionCache[sourceId] = getManifest().then(manifest => {
      const entry = getSourceEntry(manifest, sourceId);
      if (!entry || !entry.dataset || !entry.index) {
        // Honest failure, never fabricated data — matches coverage.status in the manifest.
        return Promise.reject(new Error('source ' + sourceId + ' has no published dataset yet (coverage: ' +
          (entry && entry.coverage && entry.coverage.coverage_label) + ')'));
      }
      return Promise.all([
        fetch(entry.dataset.url).then(r => r.json()),
        fetch(entry.index.url).then(r => r.json()),
      ]).then(([dataset, index]) => ({ dataset, index, entry }));
    });
    return _partitionCache[sourceId];
  }

  /* ---------- per-source search adapters ----------
     Each adapter(query, {dataset, index, entry}) -> array of unified result rows:
       {source_id, display_name, content, date, canonical_type, timestamp, deep_link, provenance}
     Only 'youtube:alexandre_garcia' is implemented (the only source with a
     published dataset in this build). */
  const TIPO_LABEL = { T: 'Tema', F: 'Fato', P: 'Personalidade', M: 'Memória', L: 'Lugar', D: 'Data' };
  const TIPO_CANON = { T: 'TOPIC', F: 'EXTRACTED_STATEMENT', P: 'ENTITY_MENTION', M: 'MEMORY', L: 'PLACE_MENTION', D: 'DATE_MENTION' };
  const ytl = (id, t) => 'https://www.youtube.com/watch?v=' + id + (t > 0 ? '&t=' + t + 's' : '');

  const ADAPTERS = {
    'youtube:alexandre_garcia': function (query, ctx) {
      const q = norm(query);
      if (!q) return [];
      const out = [];
      const MAX = 200; // matches the existing #/corpus list cap (agListHtml slices to 200)
      for (const v of ctx.dataset.videos) {
        if (out.length >= MAX) break;
        const titleHit = norm(v.t).includes(q);
        if (titleHit) {
          out.push({
            source_id: ctx.entry.source_id, display_name: ctx.entry.display_name,
            content: v.t, date: v.u, canonical_type: 'TOPIC',
            timestamp: 0, deep_link: ytl(v.id, 0),
            provenance: { video_id: v.id, seq: v.seq, matched_in: 'title' },
          });
        }
        for (const s of v.sg) {
          if (out.length >= MAX) break;
          if (!norm(s.x).includes(q)) continue;
          out.push({
            source_id: ctx.entry.source_id, display_name: ctx.entry.display_name,
            content: s.x, date: v.u, canonical_type: TIPO_CANON[s.y] || s.y,
            timestamp: s.s, deep_link: ytl(v.id, s.s || 0),
            provenance: { video_id: v.id, seq: v.seq, matched_in: 'segment', confidence: s.c, nota: s.n || null },
          });
        }
      }
      return out;
    },
  };

  function searchSource(sourceId, query) {
    return ensureSourceData(sourceId).then(ctx => {
      const adapter = ADAPTERS[sourceId];
      if (!adapter) return [];
      return adapter(query, ctx);
    });
  }

  /* Unified, cross-source search. Never claims cross-source confirmation —
     see labelForResults(): "localizamos ocorrências em N acervos", never
     "confirmado por vários acervos". A hit in more than one source is
     evidence of what was SAID in each, not evidence that it is true. */
  function searchAll(query, opts) {
    opts = opts || {};
    return getManifest().then(manifest => {
      const sources = (manifest.sources || []).filter(s =>
        s.capabilities && s.capabilities.searchable &&
        (!opts.sourceIds || opts.sourceIds.includes(s.source_id)));
      return Promise.all(sources.map(s => searchSource(s.source_id, query).catch(() => [])))
        .then(perSource => {
          const results = [].concat(...perSource);
          const bySource = {};
          results.forEach(r => { bySource[r.source_id] = (bySource[r.source_id] || 0) + 1; });
          return {
            query, results,
            sources_hit: Object.keys(bySource),
            sources_searched: sources.map(s => s.source_id),
            label: labelForResults(Object.keys(bySource).length),
          };
        });
    });
  }

  function labelForResults(nSourcesHit) {
    if (nSourcesHit === 0) return 'Nenhuma ocorrência localizada nos acervos pesquisáveis.';
    if (nSourcesHit === 1) return 'localizamos ocorrências em 1 acervo';
    return 'localizamos ocorrências em ' + nSourcesHit + ' acervos';
  }

  window.DesmentindoMS = {
    norm, getManifest, getSourceEntry, ensureSourceData, searchSource, searchAll, labelForResults,
  };
})();
