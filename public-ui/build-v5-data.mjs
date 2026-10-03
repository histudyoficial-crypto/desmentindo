#!/usr/bin/env node
/*
 * Desmentindo v5 — dados de apresentação (build determinístico).
 *
 * Lê SÓ fontes já públicas deste repositório:
 *   - index.html: literais `D`, `HUB` (app legado publicado)
 *   - data/manifest.*.json (meta ms-manifest): disponibilidade de cada arquivo de vídeo
 *   - data/corpus/manifest.json → links.*.json (trechos ELEGÍVEIS por caso e por pessoa)
 *   - data/ag/corpus.*.json (vídeos e trechos com segundo) — lido aqui, nunca no navegador
 *   - data/ta/corpus.*.json (Te Atualizei, mesmo contrato do AG; cobertura PARCIAL declarada no manifesto)
 *   - data/editorial/ (edições aprovadas no Human Gate, JSON próprio; DATA ≠ PRESENTATION)
 *
 * Grava v5/data/ com arquivos pequenos por rota e um índice de busca fragmentado.
 * Não inventa dado: sem campo, sem bloco.
 *
 *   node public-ui/build-v5-data.mjs          # gera v5/data/
 *   node public-ui/build-v5-data.mjs --check  # falha se v5/data/ estiver desatualizado
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERNAL_IDS } from "./internal-ids.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "v5", "data");
const CHECK = process.argv.includes("--check");

// ---------------------------------------------------------------- fontes públicas
function grabLiteral(src, name) {
  const m = new RegExp("const " + name + " ?= ?").exec(src);
  if (!m) throw new Error("não encontrei const " + name);
  let j = m.index + m[0].length;
  const start = j;
  let depth = 0, inStr = null, esc = false;
  for (; j < src.length; j++) {
    const c = src[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === "\\") { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { depth--; if (depth === 0) { j++; break; } }
  }
  return new Function("return " + src.slice(start, j))();
}
const readJSON = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const meta = name => { const m = new RegExp('name="' + name + '" content="([^"]+)"').exec(html); if (!m) throw new Error("meta " + name); return m[1]; };
const D = grabLiteral(html, "D");
const MS = readJSON(meta("ms-manifest"));
const LM = readJSON(meta("acervos-manifest"));
const LINKS = readJSON(LM.dataset.url);
const AG_SRC = MS.sources.find(s => s.source_id === "youtube:alexandre_garcia");
const AG = AG_SRC && AG_SRC.dataset ? readJSON(AG_SRC.dataset.url) : { videos: [] };
// Demais arquivos pesquisáveis (mesmo contrato do AG). Só entram com dataset verificado E searchable no manifesto.
const OTHER_SRC = MS.sources.filter(s => s.source_id !== "youtube:alexandre_garcia" && s.dataset && s.capabilities && s.capabilities.searchable && s.capabilities.has_deep_links);
const OTHER = OTHER_SRC.map(s => {
  const b = fs.readFileSync(path.join(ROOT, s.dataset.url));
  const h = crypto.createHash("sha256").update(b).digest("hex");
  if (s.dataset.sha256 && h !== s.dataset.sha256) throw new Error("sha256 diverge em " + s.dataset.url);
  return { src: s, data: JSON.parse(b.toString("utf8")) };
});

// ---------------------------------------------------------------- helpers
const DATE_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
function validDate(s) {
  const m = DATE_RE.exec(s || "");
  if (!m) return false;
  const y = +m[1];
  return y > 1900 && y < 2100 && (!m[2] || (+m[2] >= 1 && +m[2] <= 12)) && (!m[3] || (+m[3] >= 1 && +m[3] <= 31));
}
const cmp = (a, b) => (a || "").localeCompare(b || "");
const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function cut(s, n) {
  s = (s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const c = s.slice(0, n + 1);
  const i = c.lastIndexOf(" ");
  return (i > n * 0.6 ? c.slice(0, i) : c.slice(0, n)).replace(/[,;:.\s—–-]+$/, "") + "…";
}
function host(u) { try { return new URL(u).hostname.replace(/^www\d?\./, ""); } catch { return null; } }
// Mesma troca de linguagem pública da v4: "dossiê" referido ao próprio arquivo.
function pub(s) {
  if (!s) return s;
  return s.replace(/\bdossiê canônico\b/g, "arquivo do Desmentindo").replace(/\bpelo dossiê\b/g, "por nós")
    .replace(/\bdo dossiê\b/g, "dos nossos arquivos").replace(/\bno dossiê\b/g, "nos nossos arquivos")
    .replace(/\bao dossiê\b/g, "aos nossos arquivos").replace(/\bo dossiê\b/g, "o Desmentindo").replace(/\bRodada \d+:?\s*/g, "");
}
const DOC_TYPES = new Set(["documento_oficial", "primaria_documento", "decisao"]);
const OFFICIAL_TYPES = new Set(["institucional_oficial", "pagina_institucional", "institucional"]);
const srcKind = tp => (DOC_TYPES.has(tp) ? "Documento" : OFFICIAL_TYPES.has(tp) ? "Fonte oficial" : tp === "coluna_opiniao" || tp === "opiniao_veiculo_partidario" ? "Opinião" : "Reportagem");
const quote = t => (t && /^["'“‘«]/.test(t.trim()) ? t.trim() : null);
const tLabel = s => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, "0"); return h ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss; };
const deepLink = (id, s) => "https://www.youtube.com/watch?v=" + id + "&t=" + s + "s";

// ---------------------------------------------------------------- arquivo AG: só trechos publicáveis
// Fora do público: trechos com etiqueta entre colchetes (ex.: "[caso sensível]", exceções) e confiança baixa ("B").
const publicSeg = sg => sg && typeof sg.x === "string" && sg.x.trim() && !/^\s*\[/.test(sg.x) && sg.c !== "B" && Number.isInteger(sg.s) && sg.s >= 0;
const VIDEOS = AG.videos.slice().sort((a, b) => cmp(b.u, a.u) || b.seq - a.seq); // mais recente primeiro
const SEG = []; // {id, v, d, s, x}
const segAt = new Map(); // "video|s" -> segmento público
for (const v of VIDEOS) {
  const d = (v.u || "").slice(0, 10);
  if (!validDate(d)) continue;
  for (const sg of v.sg.slice().sort((a, b) => a.s - b.s)) {
    if (!publicSeg(sg)) continue;
    const key = v.id + "|" + sg.s;
    if (segAt.has(key)) continue;
    const o = { id: SEG.length, v: v.id, d, s: sg.s, x: sg.x.trim() };
    SEG.push(o); segAt.set(key, o);
  }
}
const AG_NAME = AG_SRC ? AG_SRC.display_name : "Alexandre Garcia";
// Faixas de ids por arquivo: AG primeiro (ids estáveis), depois os demais em ordem do manifesto.
const SEG_SOURCES = [{ key: AG_SRC ? AG_SRC.source_id : "youtube:alexandre_garcia", name: AG_NAME, start: 0, end: SEG.length }];
// Outros arquivos: fora do público também o que foi minimizado por privacidade (p=1).
for (const { src, data } of OTHER) {
  const start = SEG.length, seen = new Set(), k = SEG_SOURCES.length;
  for (const v of data.videos.slice().sort((a, b) => cmp(b.u, a.u) || b.seq - a.seq)) {
    const d = (v.u || "").slice(0, 10);
    if (!validDate(d)) continue;
    for (const sg of v.sg.slice().sort((a, b) => a.s - b.s)) {
      if (!publicSeg(sg) || sg.p === 1) continue;
      const key = v.id + "|" + sg.s + "|" + sg.x;
      if (seen.has(key)) continue;
      seen.add(key);
      SEG.push({ id: SEG.length, v: v.id, d, s: sg.s, x: sg.x.trim(), k });
    }
  }
  SEG_SOURCES.push({ key: src.source_id, name: src.display_name, start, end: SEG.length });
}
const AG_OK = !!(AG_SRC && AG_SRC.capabilities && AG_SRC.capabilities.searchable && AG_SRC.capabilities.has_deep_links);

// Trecho público: só se o par (vídeo, segundo) do link existe no arquivo AG. O texto exibido é o do segmento.
function occurrencesFrom(groups, relation) {
  const out = [], seen = new Set();
  for (const g of groups || []) for (const o of g.occurrences || []) {
    if (o.source !== "AG") continue;
    const sg = segAt.get(o.video_id + "|" + o.timestamp);
    // Conferência: mesmo vídeo, mesmo segundo e mesmo texto do segmento; senão, fica de fora.
    if (!sg || seen.has(sg.id) || (o.text || "").trim() !== sg.x) continue;
    seen.add(sg.id);
    out.push({ source_name: AG_NAME, video_id: sg.v, date: sg.d, excerpt: cut(sg.x, 240), t_seconds: sg.s, t_label: tLabel(sg.s), deep_link: deepLink(sg.v, sg.s), relation });
  }
  return out.sort((a, b) => cmp(b.date, a.date) || a.t_seconds - b.t_seconds);
}

// ---------------------------------------------------------------- disponibilidade dos arquivos (manifesto)
const ARCHIVES = MS.sources.map(s => {
  const ok = !!(s.capabilities && s.capabilities.searchable);
  return {
    key: s.source_id, name: s.display_name, available: ok, deep_links: !!(s.capabilities && s.capabilities.has_deep_links),
    videos_indexed: s.coverage.videos_indexed, videos_total: s.coverage.videos_total,
    latest: ok ? (s.latest_content && s.latest_content.latest_source_content) || null : null,
  };
});
// Ordem fixa de apresentação: o que está disponível primeiro.
ARCHIVES.sort((a, b) => (b.available - a.available));

// ---------------------------------------------------------------- pessoas (arquivo de consulta, sem perfil)
const PERSONS = Object.keys(LINKS.persons).sort((a, b) => a.localeCompare(b, "pt")).map(name => {
  const occ = occurrencesFrom(LINKS.persons[name].ag_video_groups, "Cita " + name);
  return { name, slug: slugify(name), occ };
}).filter(p => p.occ.length);
const personBySlug = Object.fromEntries(PERSONS.map(p => [p.slug, p]));
const personByName = Object.fromEntries(PERSONS.map(p => [p.name, p]));

// ---------------------------------------------------------------- histórias
// Auditoria das alegações exibidas (public-ui/attribution_audit.json, camada de apresentação; não altera o dado).
// Vale só se o texto do registro não mudou (hash); senão, volta ao rótulo do dado (ALEGAÇÃO ATRIBUÍDA).
const AUDIT = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, "public-ui", "attribution_audit.json"), "utf8")).items.map(x => [x.event, x]));
const evHash = t => crypto.createHash("sha256").update(String(t || "").normalize("NFC").replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
const cleanAttr = t => (t && t !== "None" ? String(t).replace(/,?\s*segundo (o )?resumo( de busca)?;?/gi, "").replace(/\(\s*,\s*/g, "(").replace(/\s+\)/g, ")").trim() : null);
const ATTR_LOG = [];
function attribution(x) {
  if (!x.allegation) return undefined;
  const a = AUDIT[x.e.id], ok = a && a.text_sha256 === evHash(x.e.desc);
  // Revisão humana individual (Command Center): enquanto não decidida, rótulo neutro. CONFIRMED → proposta;
  // KEPT_PREVIOUS → classificação do dado (alegação). Nunca aprovação em lote.
  const hr = ok && a.human_review ? a.human_review.status : null;
  const cls = !ok ? "ALLEGATION" : hr === "CONFIRMED" ? a.proposed : hr === "KEPT_PREVIOUS" ? "ALLEGATION" : hr ? "HUMAN_REVIEW" : a.proposed;
  const kind = cls === "ATTRIBUTED_STATEMENT" ? "declaracao" : cls === "HUMAN_REVIEW" ? "atribuido" : "alegacao";
  const src = x.sources[0];
  ATTR_LOG.push({ ev: x.e.id, kind, hr });
  return { kind, by: (ok && a.by) || cleanAttr(x.e.alde) || (src ? src.outlet : null), resp: x.e.resp ? cut(cleanAttr(x.e.resp), 170) : null,
           src: src ? { outlet: src.outlet, url: src.url } : null };
}
// Correção de link de fonte auditada (ex.: URL que cai em 404 no dado legado → URL canônico verificado). Só vale se o
// texto do registro não mudou (hash); o rótulo e a classificação não mudam.
const fixUrl = (e, u) => { const a = AUDIT[e.id]; return a && a.source_url_fix && a.text_sha256 === evHash(e.desc) && a.source_url_fix[u] || u; };
const EVENTS = D.ev.map((e, i) => ({
  i, e, date: validDate(e.d) ? e.d : null, published: validDate(e.dp) ? e.dp : null,
  allegation: e.nat === "alegacao_atribuida", text: pub(e.desc),
  sources: (() => { const seen = new Set(); return (e.fontes || []).filter(f => f.url && !seen.has(f.url) && seen.add(f.url)).map(f => { const url = fixUrl(e, f.url); return { title: pub(f.t), outlet: host(url), url, kind: srcKind(f.tp), tp: f.tp, loc: f.loc }; }); })(),
}));
const byCase = {};
for (const x of EVENTS) for (const c of x.e.c) (byCase[c] = byCase[c] || []).push(x);
const EXCLUDE_CASE = "Outros contextos e frentes menores"; // agregado, não é uma história
const label = c => D.caso_lbl[c] || c;

function pickSpread(list, n) {
  if (list.length <= n) return list;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}
const brief = x => { const s = x.sources[0]; return { date: x.date, text: cut(x.text, 220), source: s ? { title: s.title, outlet: s.outlet, url: s.url } : null }; };

function buildStory(caso) {
  const all = byCase[caso] || [];
  const dated = all.filter(x => x.date).sort((a, b) => cmp(b.date, a.date) || b.i - a.i); // recente primeiro
  const facts = dated.filter(x => !x.allegation && x.sources.length);
  const lastPublished = all.map(x => x.published).filter(Boolean).sort().pop() || null;
  const years = dated.map(x => +x.date.slice(0, 4));
  const firstY = years.length ? Math.min(...years) : null, lastY = years.length ? Math.max(...years) : null;
  const sources = []; const seen = new Set();
  for (const x of dated) for (const s of x.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push({ title: s.title, outlet: s.outlet, url: s.url, kind: s.kind, date: x.date }); }

  const summaryEv = facts[0] || dated[0] || null;
  const known = facts.filter(x => x !== summaryEv).slice(0, 3).map(brief);

  // Já falaram sobre isso: só trechos ELEGÍVEIS do caso (data/corpus/links), conferidos no arquivo AG.
  const linkCase = LINKS.cases[caso];
  const said = linkCase ? occurrencesFrom(linkCase.ag_video_groups, "Sobre " + label(caso)) : [];

  // Pessoas desta história com trechos nos arquivos (navegação; não é perfil).
  const pc = {};
  for (const x of all) for (const n of new Set([x.e.p, x.e.pf, ...(x.e.env || [])].filter(Boolean))) if (personByName[n]) pc[n] = (pc[n] || 0) + 1;
  const people = Object.keys(pc).sort((a, b) => pc[b] - pc[a] || a.localeCompare(b, "pt")).slice(0, 6)
    .map(n => ({ name: n, slug: personByName[n].slug, count: personByName[n].occ.length }));

  // O que encontramos: documento localizado mais recente.
  let found = null;
  for (const x of dated) {
    const f = x.sources.find(s => DOC_TYPES.has(s.tp));
    if (f) { found = { title: f.title, outlet: f.outlet, url: f.url, date: x.date, says: quote(f.loc), context: cut(x.text, 220) }; break; }
  }
  const shownIds = new Set([summaryEv, ...facts.filter(x => x !== summaryEv).slice(0, 3)].filter(Boolean).map(x => x.i));
  // Cronologia só quando ajuda: registros em anos diferentes; sem repetir o que já está acima.
  // Mesmo registro duplicado no dado (mesma data, mesmo começo de texto) aparece uma vez só.
  const recKey = x => x.date + "|" + String(x.text).slice(0, 80);
  const seenChrono = new Set();
  const rest = dated.filter(x => !shownIds.has(x.i)).filter(x => { const k = recKey(x); if (seenChrono.has(k)) return false; seenChrono.add(k); return true; });
  const chronoSrc = firstY !== lastY && rest.length >= 3 ? pickSpread(rest.slice().reverse(), 6) : [];
  const chrono = chronoSrc.map(x => ({ date: x.date, allegation: x.allegation || undefined, attr: attribution(x), text: cut(x.text, 150) }));
  for (const x of chronoSrc) shownIds.add(x.i);
  const seenUpd = new Set([...chronoSrc, ...dated.filter(x => shownIds.has(x.i))].map(recKey));
  const updates = all.filter(x => x.published && !shownIds.has(x.i)).filter(x => { const k = recKey(x); if (seenUpd.has(k)) return false; seenUpd.add(k); return true; }).sort((a, b) => cmp(b.published, a.published) || b.i - a.i).slice(0, 3)
    .map(x => ({ published: x.published, allegation: x.allegation || undefined, attr: attribution(x), text: cut(x.text, 150) }));

  return {
    slug: slugify(caso), key: caso, title: label(caso),
    span: firstY ? (firstY === lastY ? String(firstY) : firstY + "–" + lastY) : null,
    lastD: dated[0] ? dated[0].date : null, lastPublished, records: all.length, n_sources: sources.length,
    summary: summaryEv ? { date: summaryEv.date, allegation: summaryEv.allegation || undefined, attr: attribution(summaryEv), text: cut(summaryEv.text, 260), source: summaryEv.sources[0] ? { title: summaryEv.sources[0].title, outlet: summaryEv.sources[0].outlet, url: summaryEv.sources[0].url } : null } : null,
    known, said, people, found, chrono, sources: sources.slice(0, 40), sources_total: sources.length, updates,
  };
}
const STORIES = D.casos.filter(c => (byCase[c] || []).length).map(buildStory);
// ALLEGATION_RENDERED_AS_FACT (fail closed): nenhum item de alegação sai sem atribuição.
{
  const shown = STORIES.filter(s => s.key !== EXCLUDE_CASE).flatMap(s => [s.summary, ...s.chrono, ...s.updates].filter(Boolean));
  const bad = shown.filter(x => x.allegation && !(x.attr && x.attr.kind && x.attr.by));
  if (bad.length) throw new Error("ALLEGATION_RENDERED_AS_FACT: " + bad.length + " item(ns) sem atribuição");
  // ATTRIBUTED_STATEMENT ≠ ATTRIBUTED_ALLEGATION ≠ FATO: declaração só com confirmação humana; revisão pendente = neutro;
  // alegação nunca entra em "O que sabemos" (só fato com fonte).
  const semBad = ATTR_LOG.filter(l => (l.kind === "declaracao" && l.hr && l.hr !== "CONFIRMED") || (l.hr && !["CONFIRMED", "KEPT_PREVIOUS"].includes(l.hr) && l.kind !== "atribuido"));
  if (semBad.length) throw new Error("ATTRIBUTION_SEMANTICS: " + JSON.stringify(semBad.slice(0, 3)));
  const knownAlleg = STORIES.flatMap(s => s.known).filter(k => EVENTS.some(x => x.allegation && x.date === k.date && cut(x.text, 220) === k.text));
  if (knownAlleg.length) throw new Error("ALLEGATION_IN_WHAT_WE_KNOW: " + knownAlleg.length);
  const al = shown.filter(x => x.allegation);
  console.log(`alegações exibidas: ${al.length} (alegação ${al.filter(x => x.attr.kind === "alegacao").length} · declaração ${al.filter(x => x.attr.kind === "declaracao").length} · atribuído neutro ${al.filter(x => x.attr.kind === "atribuido").length})`);
}
const RANKED = STORIES.filter(s => s.key !== EXCLUDE_CASE).sort((a, b) => cmp(b.lastPublished, a.lastPublished) || b.records - a.records);
const storyIdx = Object.fromEntries(STORIES.map((s, i) => [s.key, i]));

// ---------------------------------------------------------------- arquivos (público)
const archivesPublic = ARCHIVES.map(a => ({ key: a.key, name: a.name, available: a.available, videos_indexed: a.videos_indexed, videos_total: a.videos_total, latest: a.latest }));

// ---------------------------------------------------------------- edição editorial (DATA ≠ PRESENTATION)
// Conteúdo aprovado no Human Gate chega como JSON próprio (data/editorial/), não mais embutido no index.html.
// Ausente → null (compatível com o app legado). Íntegra conferida pelo sha256 do índice; esquema validado; falha
// fechada: arquivo divergente ou campo fora do contrato derruba o build (nada é publicado pela metade).
const EDITORIAL_FIELDS = ["id", "date", "label", "title", "text", "sources", "evidence"];
function loadEditorial() {
  const idxPath = path.join(ROOT, "data", "editorial", "index.json");
  if (!fs.existsSync(idxPath)) return null;
  const idx = readJSON("data/editorial/index.json");
  if (idx.schema !== "desmentindo.public.editorial_index.v1" || !Array.isArray(idx.editions))
    throw new Error("data/editorial/index.json fora do contrato");
  if (!idx.editions.length) return null; // índice vazio (deploy sem edição publicada)
  const latest = idx.editions[0];
  if (!/^data\/editorial\/edicoes\/\d{4}-\d{2}-\d{2}\.json$/.test(latest.file)) throw new Error("edição fora de data/editorial/edicoes/");
  const raw = fs.readFileSync(path.join(ROOT, latest.file));
  const sha = crypto.createHash("sha256").update(raw).digest("hex");
  if (sha !== latest.sha256) throw new Error("edição " + latest.edition + ": sha256 diverge do índice");
  const ed = JSON.parse(raw.toString("utf8"));
  if (ed.schema !== "desmentindo.public.editorial_edition.v1" || ed.edition !== latest.edition || !validDate(ed.edition))
    throw new Error("edição " + latest.edition + " fora do contrato");
  const items = ed.items.map(it => {
    const extra = Object.keys(it).filter(k => !EDITORIAL_FIELDS.includes(k));
    if (extra.length) throw new Error("campo fora do contrato em " + it.id + ": " + extra.join(","));
    if (!it.id || !validDate(it.date) || !it.title || !it.text) throw new Error("item incompleto: " + it.id);
    if (!it.sources.length || it.sources.some(s => !/^https:\/\//.test(s.url))) throw new Error("fonte inválida em " + it.id);
    const est = it.evidence && it.evidence.primary_source_status;
    if (est !== undefined && !["AVAILABLE", "PARTIAL", "NOT_AVAILABLE"].includes(est)) throw new Error("primary_source_status inválido em " + it.id);
    const leak = INTERNAL_IDS.exec(JSON.stringify(it));
    if (leak) throw new Error("INTERNAL_IDENTIFIER_PUBLIC_LEAK em " + it.id + ": " + leak[0]);
    return { id: it.id, date: it.date, label: it.label, title: it.title, text: it.text,
             sources: it.sources.map(s => ({ name: s.name, title: s.title, url: s.url })),
             primary: !!(it.evidence && it.evidence.primary_source_obtained) };
  });
  return { edition: ed.edition, label: ed.label || "AGORA", items };
}
const EDITORIAL = loadEditorial();

// ---------------------------------------------------------------- home
const teaser = s => ({ slug: s.slug, title: s.title, lastD: s.lastD, said: s.said.length });
const hero = RANKED[0];
const saidStories = RANKED.filter(s => s.said.length).sort((a, b) => cmp(b.said[0].date, a.said[0].date)).slice(0, 3);
// A edição editorial NÃO é copiada para v5/data: a v5 lê data/editorial/ direto (DATA ≠ PRESENTATION), assim o
// PR do Publisher e o código da interface podem entrar em qualquer ordem. Aqui ela só é validada (falha fechada).
if (EDITORIAL) console.log(`data/editorial: edição ${EDITORIAL.edition} válida (${EDITORIAL.items.length} itens)`);
const HOME = {
  edition: validDate(D.meta.atualizado) ? D.meta.atualizado : null,
  hero: hero ? { ...teaser(hero), text: hero.summary ? cut(hero.summary.text, 220) : null } : null,
  more: RANKED.slice(1, 4).map(teaser),
  said: saidStories.map(s => ({ slug: s.slug, title: s.title, count: s.said.length, item: s.said[0] })),
  archives: archivesPublic,
};

// ---------------------------------------------------------------- busca (índice fragmentado)
const STOP = new Set("a o e é as os de da do das dos em no na nos nas um uma uns umas para pra por com sem que se ao aos à às ou mas como mais foi ser sua seu suas seus ele ela eles elas isso esse essa este esta lhe já não sim the of".split(" ").map(w => w.normalize("NFD").replace(/[̀-ͯ]/g, "")));
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tokens = s => [...new Set(norm(s).split(" ").filter(t => t.length > 1 && !STOP.has(t)))];

const POST = new Map(); // token -> {a:Set,e:Set,h:Set,d:Set,p:Set}
function add(kind, id, text) {
  for (const t of tokens(text)) {
    let p = POST.get(t);
    if (!p) POST.set(t, (p = { a: [], e: [], h: [], d: [], p: [] }));
    const arr = p[kind];
    if (arr[arr.length - 1] !== id) arr.push(id);
  }
}
for (const sg of SEG) add("a", sg.id, sg.x);
// Registros das histórias (sem o agregado) → contam para AGORA.
const SEARCH_EVENTS = EVENTS.filter(x => x.e.c.some(c => c !== EXCLUDE_CASE && storyIdx[c] !== undefined));
SEARCH_EVENTS.forEach((x, k) => add("e", k, [x.text, x.e.p, x.e.pf, ...(x.e.env || [])].filter(Boolean).join(" ")));
STORIES.forEach((s, k) => { if (s.key !== EXCLUDE_CASE) add("h", k, s.title + " " + s.key); });
const DOCS = []; const docSeen = new Set();
for (const x of SEARCH_EVENTS.slice().sort((a, b) => cmp(b.date, a.date) || b.i - a.i)) for (const s of x.sources) {
  if (!DOC_TYPES.has(s.tp) || docSeen.has(s.url)) continue;
  docSeen.add(s.url);
  const st = STORIES[storyIdx[x.e.c.find(c => c !== EXCLUDE_CASE)]];
  DOCS.push({ title: s.title, outlet: s.outlet, url: s.url, date: x.date, story: st ? st.slug : null });
}
DOCS.forEach((d, k) => add("d", k, d.title));
PERSONS.forEach((p, k) => add("p", k, p.name));

// Codificação compacta: [a(deltas), e, h, d, p] sem vazios no fim.
const enc = p => {
  const a = p.a.map((v, i) => (i ? v - p.a[i - 1] : v));
  const r = [a, p.e, p.h, p.d, p.p];
  while (r.length && !r[r.length - 1].length) r.pop();
  return r;
};
const ALL_TOKENS = [...POST.keys()].sort();
const LIMIT = 110 * 1024;
const sizeOf = list => list.reduce((n, t) => n + t.length + 6 + JSON.stringify(enc(POST.get(t))).length, 2);
const shardLen = {}; // prefixo de 2 letras -> tamanho da chave
const SHARDS = {};
const groups2 = {};
for (const t of ALL_TOKENS) (groups2[t.slice(0, 2)] = groups2[t.slice(0, 2)] || []).push(t);
function place(list, L) {
  const g = {};
  for (const t of list) { const k = t.length <= L ? t : t.slice(0, L); (g[k] = g[k] || []).push(t); }
  return g;
}
for (const [p2, list] of Object.entries(groups2)) {
  let L = 2;
  let g = place(list, L);
  while (L < 6 && Object.values(g).some(l => sizeOf(l) > LIMIT)) { L++; g = place(list, L); }
  if (L > 2) shardLen[p2] = L;
  for (const [k, l] of Object.entries(g)) SHARDS[k] = Object.fromEntries(l.map(t => [t, enc(POST.get(t))]));
}
// Trechos em blocos (ordem: mais recente primeiro).
const CHUNK = 700;
const CHUNKS = [];
for (let i = 0; i < SEG.length; i += CHUNK) {
  const part = SEG.slice(i, i + CHUNK), vids = [], vi = {};
  const rows = part.map(sg => { if (vi[sg.v] === undefined) { vi[sg.v] = vids.length; vids.push(sg.k ? [sg.v, sg.d, sg.k] : [sg.v, sg.d]); } return [vi[sg.v], sg.s, cut(sg.x, 240)]; });
  CHUNKS.push({ v: vids, r: rows });
}
const SEARCH_META = {
  chunk: CHUNK, segments: SEG.length, shard_len: shardLen, shards: Object.keys(SHARDS).sort(), stop: [...STOP].sort(),
  stories: STORIES.map(s => (s.key === EXCLUDE_CASE ? null : [s.slug, s.title, s.lastD])),
  events: SEARCH_EVENTS.map(x => x.e.c.map(c => storyIdx[c]).filter(k => k !== undefined && STORIES[k].key !== EXCLUDE_CASE)),
  docs: DOCS.map(d => [d.title, d.outlet, d.url, d.date, d.story]),
  persons: PERSONS.map(p => [p.name, p.slug, p.occ.length]),
  archives: archivesPublic, ag_name: AG_NAME, ag_searchable: AG_OK,
  seg_sources: SEG_SOURCES,
};

// ---------------------------------------------------------------- pessoa (arquivo de consulta)
function personPage(p) {
  const stories = {};
  for (const x of EVENTS) if ([x.e.p, x.e.pf, ...(x.e.env || [])].includes(p.name)) for (const c of x.e.c) if (c !== EXCLUDE_CASE && storyIdx[c] !== undefined) stories[c] = (stories[c] || 0) + 1;
  return {
    name: p.name, slug: p.slug, count: p.occ.length, videos: new Set(p.occ.map(o => o.video_id)).size,
    stories: Object.keys(stories).map(c => STORIES[storyIdx[c]]).sort((a, b) => cmp(b.lastD, a.lastD)).map(s => ({ slug: s.slug, title: s.title, lastD: s.lastD, records: stories[s.key] })),
    occ: p.occ.map(({ relation, source_name, ...o }) => o), source_name: AG_NAME,
    archives: archivesPublic.filter(a => !a.available).map(a => a.name),
    // Arquivos pesquisáveis que ainda NÃO entram nesta página (só AG tem trechos reunidos por pessoa).
    not_here: archivesPublic.filter(a => a.available && a.key !== (AG_SRC && AG_SRC.source_id)).map(a => a.name),
  };
}

// ---------------------------------------------------------------- Checar (exemplo público)
// null = nenhum exemplo público (padrão). Para liberar, Johnny escolhe uma peça JÁ publicada e checada
// (ex.: "N001" de v4/data/afirmacoes.json) — decisão humana, nunca automática.
const CHECAR_PUBLIC_EXAMPLE = null;
function checarPublic() {
  if (!CHECAR_PUBLIC_EXAMPLE) return { example: null };
  const A = JSON.parse(fs.readFileSync(path.join(ROOT, "v4", "data", "afirmacoes.json"), "utf8"));
  const circ = A.circulating.find(c => c.id === CHECAR_PUBLIC_EXAMPLE);
  if (!circ) throw new Error("CHECAR_PUBLIC_EXAMPLE não encontrado: " + CHECAR_PUBLIC_EXAMPLE);
  const ids = new Set(circ.blocks.flatMap(b => b.claims));
  const claims = A.claims.filter(c => ids.has(c.id) || (c.origin && c.origin.title === circ.text));
  return { example: null, circulating: circ, claims };
}

// ---------------------------------------------------------------- write / check
const files = {
  "home.json": HOME,
  "arquivos.json": { archives: archivesPublic, persons: PERSONS.map(p => ({ name: p.name, slug: p.slug, count: p.occ.length })),
    stories: STORIES.filter(s => s.key !== EXCLUDE_CASE).map(s => ({ slug: s.slug, title: s.title, said: s.said.length })).filter(s => s.said) ,
    stats: { stories: RANKED.length, records: D.ev.length, segments: SEG.length } },
  "busca/meta.json": SEARCH_META,
  // Links do app anterior (#/caso?c=…, #/pessoa?n=…) → história/consulta equivalente. Só o que existe na v5.
  "rotas.json": {
    casos: Object.fromEntries(STORIES.filter(s => s.key !== EXCLUDE_CASE).map(s => [s.key, s.slug])),
    pessoas: Object.fromEntries(PERSONS.map(p => [p.name, p.slug])),
    // #/…?ev=<registro> do app anterior → a história pública que contém o registro
    eventos: Object.fromEntries(D.ev.map(e => [e.id, (e.c || []).filter(c => c !== EXCLUDE_CASE && storyIdx[c] !== undefined).map(c => STORIES[storyIdx[c]].slug)[0]]).filter(x => x[1])),
  },
  // Checar: exemplo público "original × checado" só com checagem já publicada E liberada por Johnny
  // (CHECAR_PUBLIC_EXAMPLE). Padrão = nenhum (fail closed): a página explica o método e não mostra exemplo.
  "checar.json": checarPublic(),
};
for (const s of STORIES) if (s.key !== EXCLUDE_CASE) { const { key, ...rest } = s; files["historia/" + s.slug + ".json"] = rest; }
for (const p of PERSONS) files["arquivo/" + p.slug + ".json"] = personPage(p);
for (const [k, v] of Object.entries(SHARDS)) files["busca/t/" + k + ".json"] = v;
CHUNKS.forEach((c, i) => (files["busca/s/" + i + ".json"] = c));

// Fronteira: nada interno sai daqui.
const FORBID = /AUTONOMOUS_TEST_RUN|RV-2026|DS-20\d\d-|EVC-2026|WAITING_REVIEW|HUMAN_REVIEW_QUEUE|review_reason|decision_ref|desmentindo-ops|MORNING_OPEN|LEGACY_PROJECT_MORNING|ANTHROPIC_API_KEY|sk-ant-/;
const bodies = {};
for (const [name, data] of Object.entries(files)) {
  const body = JSON.stringify(data) + "\n";
  if (FORBID.test(body)) throw new Error("marcador interno em " + name);
  bodies[name] = body;
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? listFiles(path.join(dir, d.name), base) : [path.relative(base, path.join(dir, d.name)).split(path.sep).join("/")]));
}
const existing = listFiles(OUT);
if (CHECK) {
  const stale = Object.keys(bodies).filter(n => { const p = path.join(OUT, n); return !fs.existsSync(p) || fs.readFileSync(p, "utf8") !== bodies[n]; });
  const extra = existing.filter(n => !(n in bodies));
  if (stale.length || extra.length) {
    console.error("v5/data desatualizado: " + [...stale, ...extra.map(x => "(sobra) " + x)].slice(0, 12).join(", ") + "\nRode: node public-ui/build-v5-data.mjs");
    process.exit(1);
  }
  console.log("v5/data em sincronia (" + Object.keys(bodies).length + " arquivos)");
} else {
  for (const n of existing) if (!(n in bodies)) fs.rmSync(path.join(OUT, n));
  for (const [n, body] of Object.entries(bodies)) {
    const p = path.join(OUT, n);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== body) fs.writeFileSync(p, body);
  }
  const sizes = Object.entries(bodies).map(([n, b]) => [n, Buffer.byteLength(b)]);
  const max = sizes.reduce((m, x) => (x[1] > m[1] ? x : m), ["", 0]);
  const tot = sizes.reduce((n, x) => n + x[1], 0);
  console.log(`v5/data: ${sizes.length} arquivos, ${(tot / 1024).toFixed(0)} KB · home ${(Buffer.byteLength(bodies["home.json"]) / 1024).toFixed(1)} KB · maior ${max[0]} ${(max[1] / 1024).toFixed(0)} KB · trechos públicos ${SEG.length} · história do momento: ${hero && hero.title}`);
}
