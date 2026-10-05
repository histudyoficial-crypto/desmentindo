#!/usr/bin/env node
/*
 * Direção 1 ("A edição do dia") — regras determinísticas e limites da V1 (CI de fronteira).
 *   node public-ui/test-direcao1.mjs
 * Testa as funções reais de v5/js/v5.js (extraídas do arquivo, sem cópia) e garante o que a V1 não pode ter.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "v5/js/v5.js"), "utf8");
const fail = [];
const fn = name => {   // corpo real da função, por contagem de chaves a partir da declaração
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) { fail.push("função ausente: " + name); return `function ${name}() { return null; }`; }
  let d = 0, j = src.indexOf("{", i);
  for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) break; }
  return src.slice(i, j + 1);
};
const MES = 'var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];';
const lib = new Function(`${MES}\n${fn("fdate")}\n${fn("fwd")}\n${fn("em1")}\n${fn("byTime")}\nreturn { fdate, fwd, em1, byTime };`)();
const eq = (k, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail.push(`${k}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

// EM1_RULE: 1..5 pontos e ≤ 600 caracteres somados
const pt = n => ({ text: "x".repeat(n) });
eq("em1 3×80", lib.em1([pt(80), pt(80), pt(90)]), true);
eq("em1 limite 600", lib.em1([pt(300), pt(300)]), true);
eq("em1 601", lib.em1([pt(300), pt(301)]), false);
eq("em1 6 pontos", lib.em1([pt(10), pt(10), pt(10), pt(10), pt(10), pt(10)]), false);
eq("em1 vazio", lib.em1([]), false);
// dados reais: o FECHAMENTO publicado passa pela regra
const F = JSON.parse(fs.readFileSync(path.join(ROOT, "data/editorial/fechamentos/2026-10-03.json"), "utf8"));
eq("em1 FECHAMENTO 03/10", lib.em1(F.opening.points), true);
// dia da semana só da data
eq("fwd sábado", lib.fwd("2026-10-03"), "sáb · 3 out 2026");
eq("fwd domingo", lib.fwd("2026-10-04"), "dom · 4 out 2026");
eq("fwd inválida", lib.fwd(""), "");
// coberturas: ordem de horário; sem horário no fim, na ordem do dado; estável
const cov = [{ o: "B", published_at: "2026-10-03T15:00:00-03:00" }, { o: "X" }, { o: "A", published_at: "2026-10-03T09:00:00-03:00" }, { o: "Y", published_at: "" }, { o: "C", published_at: "2026-10-03T15:00:00-03:00" }];
eq("byTime", lib.byTime(cov).map(c => c.o), ["A", "B", "C", "X", "Y"]);
eq("byTime não muta", cov.map(c => c.o), ["B", "X", "A", "Y", "C"]);

// limites da V1 (bloqueados)
const forbid = [
  [/SHARE_ACTION/, "evento SHARE_ACTION (fora da V1)"],
  [/Voltar ao fechamento/, "MATÉRIA → FECHAMENTO sem relação no contrato de dados"],
  [/Ajudou\?/, "\"Ajudou?\" (bloqueado)"],
  [/O dia em números/i, "\"O dia em números\" (bloqueado)"],
  [/min de leitura/i, "tempo de leitura sem medição"],
  [/class="fx-st"/, "status da matéria fora do sistema de selos"],
];
for (const [re, why] of forbid) if (re.test(src)) fail.push("proibido na V1: " + why);
// Mandar: Web Share + copiar link, sem SDK de rede social
if (!/navigator\.share/.test(src) || !/Copiar link/.test(src)) fail.push("Mandar sem Web Share ou sem Copiar link");
if (/(connect\.facebook|platform\.twitter|api\.whatsapp|wa\.me)/.test(src)) fail.push("SDK/integração de rede social");

// HOME · MORNING (05/10): bloco "O que importa hoje" (funções reais do v5.js)
{
  const dec = src.match(/var SLOTS = [^\n]*\n/), mesl = src.match(/var MESL = [^\n]*\n/);
  if (!dec || !mesl) fail.push("MORNING: declarações SLOTS/MESL ausentes");
  const H = new Function(`${MES}\n${dec ? dec[0] : ""}\n${mesl ? mesl[0] : ""}\n${fn("e")}\n${fn("dParts")}\n${fn("isDay")}\n${fn("tcDate")}\n${fn("tc")}\n${fn("ddmm")}\n${fn("mhDate")}\n${fn("mhSources")}\n${fn("imgOk")}\n${fn("morningItems")}\n${fn("mhVisual")}\n${fn("mhCat")}\n${fn("morningBlock")}\n` +
    "return { imgOk, morningItems, morningBlock };")();
  const it = (n, x) => Object.assign({ id: "n" + n, title: "Título " + n, slot: null, category: "", tone: "", dek: "", image: null, variant: "" }, x || {});
  // seleção da manhã: slot MORNING ou sem slot; AFTERNOON/EVENING ficam na faixa AGORA
  eq("morningItems", H.morningItems([it(1), it(2, { slot: "AFTERNOON" }), it(3, { slot: "MORNING" }), it(4, { slot: "EVENING" })]).map(x => x.id), ["n1", "n3"]);
  // vazio → nada; 1 notícia → destaque sozinho; 6 → destaque + 3 secundárias + "ver todas"
  eq("morning vazio", H.morningBlock("2026-10-05", []), "");
  const one = H.morningBlock("2026-10-05", [it(1)]);
  eq("1 item: mh-solo", /mh-solo/.test(one), true);
  eq("1 item: sem secundárias", /mh-sec/.test(one), false);
  eq("1 item: sem 'ver todas'", /mh-all/.test(one), false);
  eq("cabeçalho", /Morning <time class="tc tc-date" datetime="2026-10-05">5 OUT<\/time>/.test(one) && /O que importa hoje/.test(one), true);
  eq("sem imagem → arte editorial decorativa", /class="mh-art" aria-hidden="true"/.test(one), true);
  const six = H.morningBlock("2026-10-05", [1, 2, 3, 4, 5, 6].map(n => it(n)));
  eq("6 itens: 3 secundárias", (six.match(/<li>/g) || []).length, 3);
  eq("6 itens: ver todas → #/agora", /class="mh-all" href="#\/agora"/.test(six), true);
  eq("4 itens: sem 'ver todas'", /mh-all/.test(H.morningBlock("2026-10-05", [1, 2, 3, 4].map(n => it(n)))), false);
  eq("rotas existentes", (six.match(/href="#\/agora\/n\d"/g) || []).length > 0 && !/href="#\/morning/.test(six), true);
  // imagem: só do próprio site, com alt/largura/altura; destaque sem lazy, secundária com lazy
  const img = { src: "/data/editorial/imagens/2026-10-05/rio.jpg", alt: "Urna eletrônica", width: 1600, height: 900, credit: "Foto: TSE" };
  eq("imgOk local", H.imgOk(img), true);
  eq("imgOk externa", H.imgOk(Object.assign({}, img, { src: "https://x.com/a.jpg" })), false);
  eq("imgOk sem alt", H.imgOk({ src: img.src, width: 1, height: 1 }), false);
  const doc = H.morningBlock("2026-10-05", [it(1, { image: img, variant: "DOCUMENTARY_IMAGE" }), it(2, { image: img })]);
  eq("foto: alt", /alt="Urna eletrônica"/.test(doc), true);
  eq("foto: width/height", /width="1600" height="900"/.test(doc), true);
  eq("foto destaque sem lazy", /fetchpriority="high"/.test(doc), true);
  eq("foto secundária lazy", /loading="lazy"/.test(doc), true);
  eq("crédito no destaque", /mh-cr">Foto: TSE/.test(doc), true);
  // categoria: texto sempre; cor só pelos 3 tons editoriais; sem tom → neutro
  const cat = H.morningBlock("2026-10-05", [it(1, { category: "Eleições 2026", tone: "yellow" }), it(2, { category: "Economia" })]);
  eq("categoria com tom", /class="mh-cat t-yellow">Eleições 2026</.test(cat), true);
  eq("categoria sem tom = neutra", /class="mh-cat">Economia</.test(cat), true);
  eq("escape", /&lt;b&gt;/.test(H.morningBlock("2026-10-05", [it(1, { title: "<b>x</b>" })])), true);
}

// JÁ FALARAM / MEMÓRIA AUDIOVISUAL (Design Final P0): miniatura real só com revisão SAFE para video_id@slug lida de
// data/corpus/thumb_review.json (home.json NÃO autoriza). Miniatura automática continua proibida: i.ytimg.com só em thumbSrc.
{
  const yt = src.match(/i\.ytimg\.com/g) || [];
  eq("ytimg só em thumbSrc", yt.length === 1 && fn("thumbSrc").includes("i.ytimg.com"), true);
  const yid = (src.match(/var YT_ID = [^;]+;/) || [""])[0];
  const T = new Function(`${MES}\n${yid}\n${fn("e")}\n${fn("dParts")}\n${fn("fdate")}\n${fn("dDay")}\n${fn("initials")}\n${fn("isDay")}\n${fn("tcDate")}\n${fn("tc")}\n${fn("civilDays")}\n${fn("agoLabel")}\n${fn("thumbSrc")}\n${fn("miniSaid")}\nreturn { thumbSrc, miniSaid, agoLabel, civilDays, tcDate };`)();
  const o = (x = {}) => Object.assign({ source_name: "Alexandre Garcia", video_id: "GZ8jWAg9pAA", date: "2026-09-14", excerpt: "Trecho do corpus", t_seconds: 302, t_label: "5:02", deep_link: "https://www.youtube.com/watch?v=GZ8jWAg9pAA&t=302s" }, x);
  const st = { slug: "dark-horse", title: "Dark Horse" };
  const R = { reviews: { "GZ8jWAg9pAA@dark-horse": { verdict: "SAFE" }, "abcdefghijk@dark-horse": { verdict: "SAFE" }, "ABC_def-123@dark-horse": { verdict: "SAFE" }, "a4RbhwuWHDQ@atibaia": { verdict: "UNSAFE" } } };
  // K: SAFE (genérico por fonte: AG, TA, CC)
  for (const [name, id] of [["Alexandre Garcia", "GZ8jWAg9pAA"], ["Te Atualizei", "abcdefghijk"], ["Caio Coppolla", "ABC_def-123"]]) {
    const h = T.miniSaid(o({ source_name: name, video_id: id }), st, R, "2026-10-05");
    eq("SAFE " + name, h.includes('src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg"') && /class="vmini has-img"/.test(h), true);
    eq("lazy/16:9 " + name, /loading="lazy"/.test(h) && /width="320" height="180"/.test(h), true);
    eq("alt só com metadados " + name, h.includes('alt="Miniatura do vídeo de ' + name + ","), true);
  }
  // L: UNSAFE → editorial · M: sem revisão → editorial · chave de outro contexto → editorial · home thumb=true NÃO autoriza
  eq("UNSAFE → editorial", /vm-ed/.test(T.miniSaid(o({ video_id: "a4RbhwuWHDQ" }), { slug: "atibaia", title: "Atibaia" }, R, "2026-10-05")), true);
  eq("sem revisão → editorial", /class="vmini vm-ed"/.test(T.miniSaid(o({ video_id: "zzzzzzzzzzz" }), st, R)), true);
  eq("chave diferente → editorial", T.thumbSrc(o(), "atibaia", R), "");
  eq("home thumb=true não autoriza", T.thumbSrc(o({ thumb: true }), "dark-horse", null), "");
  eq("id inválido", T.thumbSrc(o({ video_id: "../x" }), "dark-horse", { reviews: { "../x@dark-horse": { verdict: "SAFE" } } }), "");
  const d = T.miniSaid(o(), st, null, "2026-10-05");
  eq("nunca retângulo vazio", /vm-ed/.test(d) && /vm-a1/.test(d) && !/ytimg/.test(d), true);
  eq("fonte · data · minuto", /vm-src">AG · 14 SET/.test(d) && /▶ 5:02/.test(d) && /said-who">Alexandre Garcia</.test(d), true);
  eq("distância temporal no card", /tc tc-ago">21 DIAS ANTES</.test(d), true);
  eq("sem referência → sem carimbo", /tc-ago/.test(T.miniSaid(o(), st, R, "")), false);
  eq("player inline", /class="vmini[^"]*" data-play/.test(d) && /data-t="302"/.test(d), true);
  eq("trecho do corpus + escape", /Trecho do corpus/.test(d) && /&lt;b&gt;/.test(T.miniSaid(o({ excerpt: "<b>x</b>" }), st, R)), true);
  // distância temporal por DATAS CIVIS
  const L = T.agoLabel;
  eq("ago hoje", L("2026-10-05", "2026-10-05"), "HOJE");
  eq("ago ontem", L("2026-10-04", "2026-10-05"), "ONTEM");
  eq("ago 2 dias", L("2026-10-03", "2026-10-05"), "2 DIAS ANTES");
  eq("ago 59 dias", L("2026-08-07", "2026-10-05"), "59 DIAS ANTES");
  eq("ago 60 dias → meses", L("2026-08-06", "2026-10-05"), "1 MÊS ANTES");
  eq("ago meses", L("2026-05-26", "2026-10-05"), "4 MESES ANTES");
  eq("ago 729 dias", /MESES ANTES$/.test(L("2024-10-06", "2026-10-05")), true);
  eq("ago 730 dias → anos", L("2024-10-05", "2026-10-05"), "2 ANOS ANTES");
  eq("ago anos", L("2016-03-01", "2026-10-05"), "10 ANOS ANTES");
  eq("ago futuro/ inválido", [L("2026-10-06", "2026-10-05"), L("", "2026-10-05"), L("x", "2026-10-05")], ["", "", ""]);
  eq("civil, não 24h (virada de horário)", T.civilDays("2026-02-21", "2026-02-22"), 1);
  eq("tcDate", [T.tcDate("2026-10-05"), T.tcDate("")], ["5 OUT", ""]);
  // registro de revisão: chaves video_id@slug, veredito SAFE/UNSAFE
  const RV = JSON.parse(fs.readFileSync(path.join(ROOT, "data/corpus/thumb_review.json"), "utf8"));
  eq("thumb_review válido", Object.entries(RV.reviews).every(([k, r]) => /^[\w-]{11}@[a-z0-9-]+$/.test(k) && ["SAFE", "UNSAFE"].includes(r.verdict)), true);
}
// TEMPO (Design Final P0): America/Sao_Paulo pelo Intl, sem UTC−3 fixo
{
  eq("sem UTC−3 fixo em opDay/brt", /function opDay[^\n]*3 \* 3600e3/.test(src) || /function brt[^\n]*- 3 \* 3600e3\)/.test(src), false);
  const Z = new Function(`${fn("zparts")}\n${fn("pad2")}\n${fn("opDay")}\n${fn("brt")}\n${fn("fhm")}\nvar TZ = "America/Sao_Paulo", ZF = null;\nreturn { opDay, fhm };`)();
  eq("opDay SP (02:59Z = dia anterior)", Z.opDay(Date.parse("2026-10-06T02:59:00Z")), "2026-10-05");
  eq("opDay SP (03:00Z = dia novo)", Z.opDay(Date.parse("2026-10-06T03:00:00Z")), "2026-10-06");
  eq("HH:MM SP", Z.fhm("2026-10-04T19:00:00-03:00"), "19:00");
}
// AGORA + NEWS DO DIA + MORNING (dados reais e regras)
{
  const N = new Function(`${MES}\nvar SLOT_RANK = { MORNING: 1, AFTERNOON: 2, EVENING: 3 };\n${fn("e")}\n${fn("nf")}\n${fn("plural")}\n${fn("dParts")}\n${fn("isDay")}\n${fn("tcDate")}\n${fn("tc")}\n${fn("latestItem")}\n${fn("agoraBar")}\n${fn("newsDay")}\n${fn("ddmm")}\n${fn("mhDate")}\n${fn("mhSources")}\nreturn { latestItem, agoraBar, newsDay, ddmm, mhDate, mhSources };`)();
  const I = (id, slot, x) => Object.assign({ id, title: "T " + id, slot, category: "" }, x || {});
  const A = { edition: "2026-10-05", items: [I("rio", "MORNING", { category: "Eleições 2026" }), I("deltan", "AFTERNOON")] };
  eq("AGORA = a mais recente", N.latestItem(A.items).id, "deltan");
  const bar = N.agoraBar(A);
  eq("AGORA compacto", /Agora · hoje/.test(bar) && /2 notícias/.test(bar) && /Ver as 2 de hoje/.test(bar) && /fechamento de hoje sai à noite/.test(bar), true);
  eq("AGORA sem data duplicada", /5 out/i.test(bar), false);
  const nd = N.newsDay(A, "deltan", "rio");
  eq("NEWS: poucos itens → mostra o que não está no AGORA", /#\/agora\/rio/.test(nd) && !/#\/agora\/deltan/.test(nd), true);
  const many = { edition: "2026-10-05", items: ["a", "b", "c", "d"].map(x => I(x, "MORNING")) };
  const nd2 = N.newsDay(many, "d", "a");
  eq("NEWS: deduplica AGORA e destaque", /\/b"/.test(nd2) && /\/c"/.test(nd2) && !/\/a"/.test(nd2) && !/\/d"/.test(nd2), true);
  eq("NEWS: faixa com data", /News do dia/.test(nd2) && /5 OUT/.test(nd2), true);
  eq("NEWS sem itens", N.newsDay({ edition: "2026-10-05", items: [] }, "", ""), "");
  // nenhuma manchete 3x: AGORA + NEWS + Morning
  const all = N.agoraBar(A) + nd + '<a href="#/agora/rio">';
  eq("máx. 2 aparições por manchete", ["rio", "deltan"].every(id => (all.match(new RegExp("#/agora/" + id + '"', "g")) || []).length <= 2), true);
  // Morning: DD/MM só de title/dek; senão data da edição
  eq("ddmm válido", N.ddmm("2º turno em 25/10"), ["25", "OUT"]);
  eq("ddmm inválido/ausente", [N.ddmm("placar 3/0 e 32/13"), N.ddmm("sem data")], [null, null]);
  eq("ddmm não pega fração de data longa", N.ddmm("em 1/2/2026"), null);
  eq("mhDate: sem DD/MM → edição", N.mhDate({ title: "Rio: TSE registra 2º turno", dek: "sem data marcada", date: "2026-10-05" }), ["5", "OUT"]);
  eq("mhDate: dek com DD/MM", N.mhDate({ title: "x", dek: "julgamento em 12/11", date: "2026-10-05" }), ["12", "NOV"]);
  eq("mhDate: corpo não conta", N.mhDate({ title: "x", dek: "", text: "25/10", date: "2026-10-05" }), ["5", "OUT"]);
  eq("fonte normalizada", N.mhSources({ sources: [{ name: "TSE (documento oficial)" }, { name: "TSE (documento oficial)" }, { name: "O Globo" }] }), ["TSE", "O Globo"]);
  // dado real de 05/10: sem 25/10 em title/dek → 5 OUT
  const ED = JSON.parse(fs.readFileSync(path.join(ROOT, "data/editorial/edicoes/2026-10-05.json"), "utf8"));
  const rio = ED.items.find(x => x.slot === "MORNING");
  eq("05/10 real: 5 OUT (não 25 OUT)", N.mhDate(rio), ["5", "OUT"]);
}
// FECHAMENTO: VEJA POR VOCÊ MESMO — official[] textual nunca vira link; coverage[].url https é clicável
{
  const V = new Function(`${fn("e")}\n${fn("byTime")}\n${fn("evBlock")}\nreturn { evBlock };`)();
  const ev = V.evBlock({ official: ["TSE, arquivo oficial de totalização"], coverage: [{ outlet: "UOL", url: "https://uol.com.br/a", published_at: "2026-10-04T21:04:16Z" }, { outlet: "UOL", url: "https://uol.com.br/b" }, { outlet: "X", url: "javascript:alert(1)" }] });
  eq("N official textual sem link", /Registro oficial/.test(ev) && /▤<\/span> TSE, arquivo oficial/.test(ev) && !/<a[^>]*>[^<]*TSE, arquivo/.test(ev), true);
  eq("O coverage com URL clicável (1 por veículo, só https)", (ev.match(/<a /g) || []).length === 1 && /href="https:\/\/uol.com.br\/a"/.test(ev), true);
  eq("sem evidência → nada", V.evBlock({}), "");
  const F = JSON.parse(fs.readFileSync(path.join(ROOT, "data/editorial/fechamentos/2026-10-04.json"), "utf8"));
  eq("FECHAMENTO real: bloco presente", F.main_stories.every(s => !(s.official || s.coverage) || /Veja por você mesmo/.test(V.evBlock(s))), true);
}
// PESQUISE A MEMÓRIA: cobertura do dado; indisponível ≠ zero; desconhecido ≠ zero
{
  const C = new Function(`${fn("e")}\n${fn("nf")}\n${fn("covLine")}\nreturn { covLine };`)();
  eq("Q completo", /3\.701 vídeos · pesquisa disponível/.test(C.covLine({ name: "Alexandre Garcia", available: true, videos_indexed: 3701, videos_total: 3701 })), true);
  eq("Q parcial", /501 de 581 vídeos · cobertura parcial/.test(C.covLine({ name: "Te Atualizei", available: true, videos_indexed: 501, videos_total: 581 })), true);
  eq("R unknown ≠ 0", /cobertura desconhecida/.test(C.covLine({ name: "X", available: true })) && !/\b0 vídeos/.test(C.covLine({ name: "X", available: true })), true);
  eq("indisponível ≠ 0", /pesquisa indisponível/.test(C.covLine({ name: "Y", available: false, videos_indexed: 0, videos_total: 10 })), true);
  eq("linguagem pública", /Pesquise a memória/.test(src) && /O Desmentindo lembra/.test(src) && !/Pesquise o arquivo/.test(src), true);
}
// Sem evento novo de analytics (só os existentes)
eq("sem evento novo de analytics", Array.from(new Set((src.match(/anEvent\("([A-Z_]+)"/g) || []))).sort(), ['anEvent("AUDIENCE_CAPTURE_CLICK"', 'anEvent("ENGAGED_READING"', 'anEvent("SOURCE_CLICK"', 'anEvent("VIDEO_PLAY"']);

if (fail.length) { console.error("DIRECAO1_INVALID\n  " + fail.join("\n  ")); process.exit(1); }
console.log("DIRECAO1_VALID (EM1_RULE, fwd, byTime, limites da V1, MORNING, memória audiovisual, tempo, AGORA/NEWS, evidência, Pesquise a memória)");
