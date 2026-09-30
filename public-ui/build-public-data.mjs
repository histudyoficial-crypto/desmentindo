#!/usr/bin/env node
/*
 * Desmentindo v4 — PRESENTATION ADAPTERS (build step).
 *
 * DATA MODEL (canônico, intocado)  →  PRESENTATION ADAPTER (este arquivo)  →  COMPONENT (v4/js)
 *
 * Lê os dados embutidos no app legado (index.html: `const D = {...}` e `const HUB = {...}`)
 * e grava JSONs pequenos por rota em v4/data/. Não altera o modelo canônico, não inventa
 * dado: campo ausente vira null e o componente mostra o estado vazio correto.
 *
 *   node public-ui/build-public-data.mjs          # gera v4/data/
 *   node public-ui/build-public-data.mjs --check  # falha se v4/data/ estiver desatualizado
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "index.html");
const OUT = path.join(ROOT, "v4", "data");
const CHECK = process.argv.includes("--check");

// ---------------------------------------------------------------- extract
function grabLiteral(src, name) {
  const re = new RegExp("const " + name + " ?= ?");
  const m = re.exec(src);
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
  // Literais de dados do próprio repositório (JS object literal, não JSON).
  return new Function("return " + src.slice(start, j))();
}

const html = fs.readFileSync(SRC, "utf8");
const D = grabLiteral(html, "D");
const HUB = grabLiteral(html, "HUB");
const HTIPO = grabLiteral(html, "HTIPO");
const MS = JSON.parse(fs.readFileSync(path.join(ROOT, html.match(/name="ms-manifest" content="([^"]+)"/)[1]), "utf8"));

// ---------------------------------------------------------------- helpers
const DATE_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
function validDate(s) {
  const m = DATE_RE.exec(s || "");
  if (!m) return false;
  const y = +m[1];
  return y > 1900 && y < 2100 && (!m[2] || (+m[2] >= 1 && +m[2] <= 12)) && (!m[3] || (+m[3] >= 1 && +m[3] <= 31));
}
const year = s => (validDate(s) ? +s.slice(0, 4) : null);
const cmpDate = (a, b) => (a || "").localeCompare(b || "");
function slugify(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function cut(s, n) {
  s = (s || "").trim();
  if (s.length <= n) return s;
  const c = s.slice(0, n + 1);
  const i = c.lastIndexOf(" ");
  return (i > n * 0.6 ? c.slice(0, i) : c.slice(0, n)).replace(/[,;:.\s—–-]+$/, "") + "…";
}
function host(u) { try { return new URL(u).hostname.replace(/^www\d?\./, ""); } catch { return null; } }

// Adaptador de LINGUAGEM PÚBLICA: só troca a palavra interna "dossiê" quando se refere
// ao próprio acervo do Desmentindo. Nomes próprios ("Dossiê dos Aloprados") e o sentido
// histórico ("comprar um dossiê") ficam intactos.
function pub(s) {
  if (!s) return s;
  return s
    .replace(/\bdossiê canônico\b/g, "arquivo do Desmentindo")
    .replace(/\bpelo dossiê\b/g, "por nós")
    .replace(/\bdo dossiê\b/g, "dos nossos arquivos")
    .replace(/\bno dossiê\b/g, "nos nossos arquivos")
    .replace(/\bao dossiê\b/g, "aos nossos arquivos")
    .replace(/\bo dossiê\b/g, "o Desmentindo")
    .replace(/\bRodada \d+:?\s*/g, "");
}
// Pendências com jargão interno não viram pergunta pública.
const INTERNAL = /\b(E[0-5]|EV-\d+|S\d{3,}|H-\d+|CL-\d+|corpus|rodada|lote \d|pipeline|auditoria|agente|dossiê)\b/i;
// Pendência que é tarefa interna ("Registrar…", "Abrir…") não é pergunta pública.
const TODO = /^(registrar|conferir|abrir|ler|verificar|buscar|localizar|checar|confirmar|obter|acompanhar|atualizar|consultar|identificar|reconciliar)\b/i;
const publicText = t => (t && !INTERNAL.test(t) ? t : null);

const DOC_TYPES = new Set(["documento_oficial", "primaria_documento", "decisao"]);
const OFFICIAL_TYPES = new Set(["institucional_oficial", "pagina_institucional", "institucional"]);
function sourceKind(tp) {
  if (DOC_TYPES.has(tp)) return { kind: "documento", glyph: "▤", label: "DOCUMENTO", rotulo: "DOCUMENTO LOCALIZADO" };
  if (OFFICIAL_TYPES.has(tp)) return { kind: "oficial", glyph: "▤", label: "OFICIAL", rotulo: "FONTE LOCALIZADA" };
  if (tp === "coluna_opiniao" || tp === "opiniao_veiculo_partidario") return { kind: "opiniao", glyph: "↗", label: "OPINIÃO", rotulo: "FONTE LOCALIZADA" };
  return { kind: "reportagem", glyph: "↗", label: "REPORTAGEM", rotulo: "FONTE LOCALIZADA" };
}
const EVENT_KICKER = nat => (nat === "alegacao_atribuida" ? "ALEGAÇÃO ATRIBUÍDA" : "FATO COM FONTE");

// Selo da afirmação (Etapa 1.1). Valor desconhecido = EM CHECAGEM, nunca conclusivo.
const SELO = {
  documentado: "DOCUMENTADO",
  parcial: "PARCIALMENTE_DOCUMENTADO",
  nao_comprovado: "AINDA_NAO_DA",
  sem_registro: "NAO_ENCONTRAMOS",
  em_investigacao: "EM_CHECAGEM",
  nao_avaliado: "EM_CHECAGEM",
};
const seloOf = st => SELO[st] || "EM_CHECAGEM";
// LACUNA L5: o modelo não tem o campo "checamos (dito/aconteceu)". Provisório pelo tipo.
const checkType = tipo => (tipo === "alegacao" || tipo === "opiniao" ? "FOI_DITO" : "ACONTECEU");

// Relação EVENTO ↔ pessoa/organização (nunca pessoa ↔ pessoa). Lista fechada; papéis de
// parentesco/relação entre pessoas ficam de fora de propósito.
const ROLE_VERB = {
  ministro_relator: "RELATOU", relator: "RELATOU", ministro_votante: "VOTOU", ministro_presidente: "PRESIDIU",
  procurador_geral: "ATUOU COMO PROCURADOR-GERAL", parlamentar: "ATUOU COMO PARLAMENTAR",
  investigado: "FOI INVESTIGADO", denunciado: "FOI DENUNCIADO", reu: "FOI RÉU",
  pessoa_apenas_citada: "FOI CITADO", citado_em_relatorio_pf: "FOI CITADO EM RELATÓRIO DA PF",
  citado_em_delacao: "FOI CITADO EM DELAÇÃO", advogado: "ADVOGOU", testemunha: "TESTEMUNHOU",
  impedido_ou_suspeito: "TEVE IMPEDIMENTO OU SUSPEIÇÃO DISCUTIDA", ministro_que_pediu_acesso: "PEDIU ACESSO",
  ministro_que_recebeu_advogado_ou_parte: "RECEBEU ADVOGADO OU PARTE",
  destinatario_de_requisicao_de_esclarecimentos: "RECEBEU PEDIDO DE ESCLARECIMENTOS",
};

// Só é "trecho" o que é citação literal da fonte; notas de leitura ("ver página") não.
const quote = t => (t && /^["'“‘«]/.test(t.trim()) ? t.trim() : null);
const ytId = u => { const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/.exec(u || ""); return m ? m[1] : null; };
function fonteLim(id) { return publicText(pub(D.fontes[id] && D.fontes[id].lim)); }

function adaptSource(f, e) {
  const k = sourceKind(f.tp);
  return {
    kind: k.kind, glyph: k.glyph, label: k.label, rotulo: k.rotulo,
    title: pub(f.t), outlet: host(f.url), url: f.url, date: validDate(e.dp) ? e.dp : null,
    excerpt: quote(f.loc), limit: fonteLim(f.id), video: ytId(f.url),
  };
}

function adaptEvent(e) {
  return {
    id: e.id,
    date: validDate(e.d) ? e.d : null,
    published: validDate(e.dp) ? e.dp : null,
    kicker: EVENT_KICKER(e.nat),
    allegation: e.nat === "alegacao_atribuida",
    text: pub(e.desc),
    short: cut(pub(e.desc), 110),
    response: e.resp ? pub(e.resp) : null,
    limits: publicText(pub(e.res)),
    sources: dedupeSources(e.fontes.map(f => adaptSource(f, e))),
  };
}
function dedupeSources(list) {
  const seen = new Set();
  return list.filter(s => (s.url && !seen.has(s.url) ? seen.add(s.url) : false));
}

// ---------------------------------------------------------------- stories (storyFromCaso)
const EVENTS = D.ev.map(e => ({ raw: e, a: adaptEvent(e) }));
const byCase = {};
for (const x of EVENTS) for (const c of x.raw.c) (byCase[c] = byCase[c] || []).push(x);

function pickSpread(list, n) {
  if (list.length <= n) return list;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}

function storyFromCaso(caso) {
  const all = (byCase[caso] || []).slice();
  const dated = all.filter(x => x.a.date).sort((a, b) => cmpDate(a.a.date, b.a.date));
  const undated = all.filter(x => !x.a.date);
  const latestPub = all.map(x => x.a.published).filter(Boolean).sort().pop() || null;
  const latest = dated[dated.length - 1] || null;
  const sources = dedupeSources(all.flatMap(x => x.a.sources)).sort((a, b) => cmpDate(b.date, a.date));
  const nal = all.filter(x => x.a.allegation).length;
  const firstY = dated.length ? year(dated[0].a.date) : null;
  const lastY = latest ? year(latest.a.date) : null;

  // Documento em destaque: registro mais recente com fonte documental.
  let doc = null;
  for (const x of [...dated].reverse()) {
    const f = x.raw.fontes.find(f => DOC_TYPES.has(f.tp));
    if (f) {
      doc = { title: pub(f.t), url: f.url, host: host(f.url), date: x.a.date, published: x.a.published,
        says: quote(f.loc), does_not_say: fonteLim(f.id) || x.a.limits, event: x.a.short,
        rotulo: "DOCUMENTO LOCALIZADO" };
      break;
    }
  }

  // Vídeo: registro mais recente com fonte em vídeo (frame da própria fonte, sem minutagem inventada).
  let video = null;
  for (const x of [...dated].reverse()) {
    const s = x.a.sources.find(s => s.video);
    if (s) { video = { id: s.video, url: s.url, title: /lida na verifica/i.test(s.title) ? null : s.title, date: x.a.date, quote: s.excerpt, event: x.a.short }; break; }
  }

  // Quem aparece nesta história: EVENTO no centro; cada relação com verbo, data e fonte.
  const people = {};
  for (const x of dated) {
    const who = x.raw.p || x.raw.pf;
    const role = (x.raw.pap || []).find(r => ROLE_VERB[r]);
    if (!who || !role) continue;
    const p = (people[who] = people[who] || { name: who, relations: [], n: 0 });
    p.n++;
    if (p.relations.length < 2 && !p.relations.some(r => r.verb === ROLE_VERB[role])) {
      const s = x.a.sources[0];
      p.relations.push({ verb: ROLE_VERB[role], date: x.a.date, text: x.a.short, source: s ? { title: s.title, url: s.url, outlet: s.outlet } : null });
    }
  }
  const cast = Object.values(people).filter(p => p.relations.some(r => r.source))
    .sort((a, b) => b.n - a.n).slice(0, 6).map(({ name, relations }) => ({ name, relations }));

  // Isso já apareceu antes: um cartão por ano (primeiro registro do ano).
  const years = {};
  for (const x of dated) { const y = year(x.a.date); if (!years[y]) years[y] = x; }
  const archive = Object.keys(years).map(Number).sort((a, b) => a - b).map(y => ({
    year: y, date: years[y].a.date, text: years[y].a.short, kicker: years[y].a.kicker, id: years[y].a.id,
  }));

  // O que ainda não sabemos: pendências e versões conflitantes registradas, sem jargão interno.
  const questions = [];
  for (const x of [...dated].reverse()) {
    for (const q of x.raw.pend || []) {
      const t = pub(q);
      if (!INTERNAL.test(t) && !TODO.test(t) && questions.length < 5 && !questions.some(o => o.text === t)) questions.push({ text: t, status: "ABERTA", date: x.a.date });
    }
    for (const q of x.raw.contr || []) {
      const t = pub(q);
      if (!INTERNAL.test(t) && questions.length < 5 && !questions.some(o => o.text === t)) questions.push({ text: t, status: "VERSÕES DIFERENTES", date: x.a.date });
    }
    if (questions.length >= 5) break;
  }

  const responses = [...dated].reverse().filter(x => x.a.response).slice(0, 3)
    .map(x => ({ text: x.a.response, date: x.a.date, source: x.a.sources[0] || null }));

  const timeline = pickSpread(dated, 6).map(x => ({
    id: x.a.id, date: x.a.date, kicker: x.a.kicker, text: x.a.short,
    source_type: x.a.sources[0] ? x.a.sources[0].label : null,
  }));

  const hasDoc = sources.filter(s => s.kind === "documento").length;
  const state = !latest ? "CHECAGEM"
    : latest.a.allegation || (latest.raw.pend || []).length ? "CHECAGEM" : "AGORA";

  return {
    slug: slugify(caso), title: D.caso_lbl[caso] || caso, span: firstY && lastY ? (firstY === lastY ? String(firstY) : firstY + "–" + lastY) : null,
    firstY, lastY, gap: firstY && lastY ? lastY - firstY : null,
    lastD: latest ? latest.a.date : null, lastPublished: latestPub,
    lastT: latest ? latest.a.short : null, lastKicker: latest ? latest.a.kicker : null,
    lastSrc: latest && latest.a.sources[0] ? { kind: latest.a.sources[0].label, title: latest.a.sources[0].title, outlet: latest.a.sources[0].outlet, url: latest.a.sources[0].url } : null,
    lede: latest ? latest.a.text : null,
    state,
    corrections: [], // LACUNA: o modelo ainda não registra correções públicas por história.
    temporal_contrasts: [], // LACUNA: OLHA A DATA exige T1/T2 com verbo e fonte; o modelo não tem.
    nums: [
      { l: "Registros", v: all.length, s: "fatos e alegações com fonte nos nossos arquivos" },
      { l: "Fontes", v: sources.length, s: hasDoc ? `${hasDoc} ${hasDoc === 1 ? "documento" : "documentos"} entre elas` : "nenhum documento primário entre elas" },
      { l: "Anos", v: firstY && lastY ? lastY - firstY + 1 : null, s: firstY ? `de ${firstY} a ${lastY}` : "datas não registradas" },
      { l: "Alegações atribuídas", v: nal, s: "o que alguém afirma; alegação não é fato" },
    ],
    nfat: all.length - nal, nal, undated: undated.length,
    tl: timeline, doc, video, rail: sources.slice(0, 8), sources, cast, archive, questions, responses,
    events: [...dated].reverse().map(x => ({ id: x.a.id, date: x.a.date, published: x.a.published, kicker: x.a.kicker, text: x.a.text, response: x.a.response, limits: x.a.limits, sources: x.a.sources })),
  };
}

const STORIES = D.casos.filter(c => (byCase[c] || []).length).map(storyFromCaso);
// História do momento: registro publicado mais recente; empate → mais registros.
const ranked = STORIES.filter(s => s.slug !== slugify("Outros contextos e frentes menores"))
  .sort((a, b) => cmpDate(b.lastPublished, a.lastPublished) || b.nums[0].v - a.nums[0].v);

// ---------------------------------------------------------------- claims (afirmações)
const N = D.nar;
const narrative = N.narrativas[0] || null;
const blockOf = {};
if (narrative) for (const b of narrative.blocos) for (const l of b.linhas) for (const id of l.cl) blockOf[id] = b.titulo;
const CLAIMS = N.claims.map(c => ({
  id: c.id, slug: c.id.toLowerCase(), text: pub(c.texto), selo: seloOf(c.status), check: checkType(c.tipo_afirmacao),
  kind: N.tipos[c.tipo_afirmacao] || null, block: blockOf[c.id] || null,
  proves: pub(c.comprova), not_proves: pub(c.nao_comprova), limits: pub(c.limites), cited_version: pub(c.versao_citado),
  valid_from: c.valid_from || null, valid_to: c.valid_to || null, checked_at: c.ultima_verificacao || null,
  sources: (c.fontes || []).map(f => ({ title: pub(f.titulo), url: f.url, outlet: f.veiculo, kind: f.tipo === "reportagem" ? "REPORTAGEM" : "DOCUMENTO",
    rotulo: f.tipo === "reportagem" ? "FONTE LOCALIZADA" : "DOCUMENTO LOCALIZADO", origin: pub(f.origem_informacional), role: f.papel })),
  open: (c.pendencias || []).map(pub).filter(t => !INTERNAL.test(t) && !TODO.test(t)),
  origin: narrative ? { type: narrative.formato, outlet: narrative.veiculo, date: narrative.data_publicacao || null, title: narrative.titulo } : null,
}));

const CIRCULATING = narrative ? [{
  id: narrative.id, text: narrative.titulo, summary: pub(narrative.resumo), note: pub(narrative.entrada_nota),
  origin: { type: narrative.formato, outlet: narrative.veiculo, date: narrative.data_publicacao || null, filter: "post" },
  claims: CLAIMS.length,
  counts: CLAIMS.reduce((m, c) => ((m[c.selo] = (m[c.selo] || 0) + 1), m), {}),
  status: CLAIMS.some(c => c.selo === "EM_CHECAGEM") ? "EM_CHECAGEM" : "CONFERIDO",
  blocks: narrative.blocos.map(b => ({ title: b.titulo, sub: b.sub, claims: b.linhas.flatMap(l => l.cl) })),
}] : [];

// ---------------------------------------------------------------- em destaque hoje (notícias do dia)
const VEI = Object.fromEntries(HUB.veiculos.map(v => [v[0], v[1]]));
const HIGHLIGHTS = HUB.itens.map(h => ({
  id: h.id, title: h.t, outlet: VEI[h.v] || h.v, url: h.url, date: h.d, topic: h.tema, kind: HTIPO[h.tipo] || null,
  note: pub(h.frase), people: h.p || [],
}));

// ---------------------------------------------------------------- documento do dia
let DOC_OF_DAY = null;
for (const x of [...EVENTS].sort((a, b) => cmpDate(b.a.published, a.a.published))) {
  const f = x.raw.fontes.find(f => DOC_TYPES.has(f.tp));
  if (f && x.a.published) {
    const st = STORIES.find(s => x.raw.c.includes(Object.keys(D.caso_lbl).find(k => slugify(k) === s.slug)) );
    DOC_OF_DAY = { title: pub(f.t), url: f.url, host: host(f.url), date: x.a.date, published: x.a.published,
      says: quote(f.loc), does_not_say: fonteLim(f.id) || x.a.limits, event: x.a.short,
      story: st ? { slug: st.slug, title: st.title } : null, rotulo: "DOCUMENTO LOCALIZADO" };
    break;
  }
}

// ---------------------------------------------------------------- search index (leve)
const SEARCH = [
  ...STORIES.map(s => ({ t: "historia", slug: s.slug, title: s.title, d: s.lastD, x: s.title })),
  ...EVENTS.filter(x => x.a.date).map(x => ({ t: "registro", id: x.a.id, d: x.a.date, x: x.a.text,
    who: [...new Set([x.raw.p, x.raw.pf, ...(x.raw.env || [])].filter(Boolean))],
    stories: x.raw.c.map(slugify), k: x.a.kicker })),
  ...CLAIMS.map(c => ({ t: "afirmacao", slug: c.slug, d: c.checked_at, x: c.text, selo: c.selo })),
];

// ---------------------------------------------------------------- archive (vídeos)
const ag = (MS.sources || []).map(s => ({
  id: s.source_id, name: s.display_name, searchable: !!(s.capabilities && s.capabilities.searchable),
  indexed: s.coverage.videos_indexed, total: s.coverage.videos_total, latest: s.latest_content.latest_source_content,
  dataset: s.dataset ? s.dataset.url : null,
}));

// ---------------------------------------------------------------- home
const edition = D.meta.atualizado;
const hero = ranked[0];
const HOME = {
  edition, hub_edition: HUB.edicao, day_line: ["09:12", "13:47", "17:15"],
  hero: hero && { slug: hero.slug, title: hero.title, lastD: hero.lastD, lastPublished: hero.lastPublished, lastT: hero.lastT,
    lastKicker: hero.lastKicker, lastSrc: hero.lastSrc, state: hero.state, span: hero.span, n: hero.nums[0].v, nsrc: hero.nums[1].v },
  circulating: CIRCULATING.map(c => ({ id: c.id, text: c.text, origin: c.origin, status: c.status, claims: c.claims, counts: c.counts })),
  claims_preview: CLAIMS.slice(0, 6).map(c => ({ slug: c.slug, text: c.text, selo: c.selo, check: c.check, checked_at: c.checked_at })),
  what_changed: [], // Nenhuma afirmação teve mudança de estado registrada (historico de versões = 1).
  doc_of_day: DOC_OF_DAY,
  highlights: HIGHLIGHTS.slice(0, 6),
  checked: CLAIMS.filter(c => c.selo !== "EM_CHECAGEM").slice(0, 4).map(c => ({ slug: c.slug, text: c.text, selo: c.selo, check: c.check, checked_at: c.checked_at })),
  archive: hero ? hero.archive : [],
  more: ranked.slice(1, 7).map(s => ({ slug: s.slug, title: s.title, lastD: s.lastD, lastT: s.lastT, n: s.nums[0].v, span: s.span })),
  stats: { stories: STORIES.length, records: D.ev.length, sources: D.nfontes, videos: ag.filter(a => a.searchable).reduce((n, a) => n + a.indexed, 0) },
};

// ---------------------------------------------------------------- write / check
const files = {
  "home.json": HOME,
  "historias.json": ranked.concat(STORIES.filter(s => !ranked.includes(s))).map(s => ({ slug: s.slug, title: s.title, lastD: s.lastD, lastPublished: s.lastPublished, lastT: s.lastT, n: s.nums[0].v, span: s.span, state: s.state })),
  "afirmacoes.json": { circulating: CIRCULATING, claims: CLAIMS },
  "destaques.json": { edition: HUB.edicao, items: HIGHLIGHTS },
  "busca.json": SEARCH,
  "arquivos.json": { sources: ag, manifest: "../" + html.match(/name="ms-manifest" content="([^"]+)"/)[1] },
  // Registro histórico: índice leve id → histórias; o conteúdo vem do arquivo da história.
  "registros.json": Object.fromEntries(EVENTS.filter(x => x.a.date).map(x => [x.a.id, x.raw.c.map(slugify)])),
};
for (const s of STORIES) files["historias/" + s.slug + ".json"] = s;

let stale = [];
for (const [name, data] of Object.entries(files)) {
  const p = path.join(OUT, name);
  const body = JSON.stringify(data) + "\n";
  if (CHECK) {
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== body) stale.push(name);
  } else {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
}
if (CHECK) {
  if (stale.length) { console.error("v4/data desatualizado: " + stale.slice(0, 10).join(", ") + (stale.length > 10 ? " …" : "") + "\nRode: node public-ui/build-public-data.mjs"); process.exit(1); }
  console.log("v4/data em sincronia (" + Object.keys(files).length + " arquivos)");
} else {
  const total = Object.keys(files).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(`v4/data: ${Object.keys(files).length} arquivos, ${(total / 1024).toFixed(0)} KB · história do momento: ${hero && hero.title}`);
}
