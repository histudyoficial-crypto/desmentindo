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
  const H = new Function(`${MES}\n${dec ? dec[0] : ""}\n${mesl ? mesl[0] : ""}\n${fn("e")}\n${fn("dParts")}\n${fn("imgOk")}\n${fn("morningItems")}\n${fn("mhVisual")}\n${fn("mhCat")}\n${fn("morningBlock")}\n` +
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
  eq("cabeçalho", /Morning · 5 de outubro/.test(one) && /O que importa hoje/.test(one), true);
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

// JÁ FALARAM (05/10): miniatura real só revisada (thumb === true, vindo de revisão SAFE no build); o resto = pôster
// editorial. Miniatura automática continua proibida: i.ytimg.com só pode aparecer dentro de thumbSrc.
{
  const yt = src.match(/i\.ytimg\.com/g) || [];
  eq("ytimg só em thumbSrc", yt.length === 1 && fn("thumbSrc").includes("i.ytimg.com"), true);
  const yid = (src.match(/var YT_ID = [^;]+;/) || [""])[0];
  const T = new Function(`${MES}\n${yid}\n${fn("e")}\n${fn("dParts")}\n${fn("fdate")}\n${fn("dDay")}\n${fn("initials")}\n${fn("thumbSrc")}\n${fn("miniSaid")}\nreturn { thumbSrc, miniSaid };`)();
  const o = (x = {}) => Object.assign({ source_name: "Alexandre Garcia", video_id: "GZ8jWAg9pAA", date: "2026-09-14", excerpt: "Trecho do corpus", t_seconds: 302, t_label: "5:02", deep_link: "https://www.youtube.com/watch?v=GZ8jWAg9pAA&t=302s" }, x);
  const st = { slug: "dark-horse", title: "Dark Horse" };
  // A/B/C: miniatura válida (genérico por fonte: AG, TA, CC)
  for (const [name, id] of [["Alexandre Garcia", "GZ8jWAg9pAA"], ["Te Atualizei", "abcdefghijk"], ["Caio Coppolla", "ABC_def-123"]]) {
    const h = T.miniSaid(o({ source_name: name, video_id: id, thumb: true }), st);
    eq("thumb " + name, h.includes('src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg"') && /class="vmini has-img"/.test(h), true);
    eq("thumb lazy/16:9 " + name, /loading="lazy"/.test(h) && /width="320" height="180"/.test(h), true);
    eq("alt só com metadados " + name, h.includes('alt="Miniatura do vídeo de ' + name + ","), true);
  }
  // D: sem revisão → pôster editorial (nunca retângulo vazio, nunca ytimg)
  const d = T.miniSaid(o(), st);
  eq("sem thumb → editorial", /class="vmini vm-ed"/.test(d) && /vm-a1/.test(d) && !/ytimg/.test(d), true);
  // E: revisão insegura nunca chega como true; qualquer valor ≠ true é ignorado; id inválido é ignorado
  eq("thumb 'SAFE' string ignorado", T.thumbSrc(o({ thumb: "SAFE" })), "");
  eq("id inválido", T.thumbSrc(o({ thumb: true, video_id: "../x" })), "");
  // F/G: minuto presente / ausente
  eq("minuto", /▶ 5:02/.test(d), true);
  eq("fonte · data no overlay e no texto", /vm-src">AG · 14 set/.test(d) && /said-who">Alexandre Garcia</.test(d), true);
  // H: toque abre o player no próprio card (data-play + minuto), imagem não é link externo direto
  eq("player inline", /class="vmini[^"]*" data-play/.test(d) && /data-t="302"/.test(d), true);
  eq("trecho do corpus + escape", /Trecho do corpus/.test(d) && /&lt;b&gt;/.test(T.miniSaid(o({ excerpt: "<b>x</b>" }), st)), true);
  // registro de revisão: chaves video_id@slug, veredito SAFE/UNSAFE
  const R = JSON.parse(fs.readFileSync(path.join(ROOT, "data/corpus/thumb_review.json"), "utf8"));
  eq("thumb_review válido", Object.entries(R.reviews).every(([k, r]) => /^[\w-]{11}@[a-z0-9-]+$/.test(k) && ["SAFE", "UNSAFE"].includes(r.verdict)), true);
  // dado publicado: thumb só onde a revisão é SAFE
  const HOME = JSON.parse(fs.readFileSync(path.join(ROOT, "v5/data/home.json"), "utf8"));
  eq("home: thumb só com SAFE", (HOME.said || []).every(s => (s.item.thumb === true) === ((R.reviews[s.item.video_id + "@" + s.slug] || {}).verdict === "SAFE")), true);
}

if (fail.length) { console.error("DIRECAO1_INVALID\n  " + fail.join("\n  ")); process.exit(1); }
console.log("DIRECAO1_VALID (EM1_RULE, fwd, byTime, limites da V1, MORNING da Home, miniaturas do Já falaram)");
