#!/usr/bin/env node
/*
 * Vídeos recentes dos canais (Johnny 16/10/2026) — contrato e limites da seção da Home.
 *   node public-ui/test-videos-recentes.mjs
 * Testa as funções reais de v5/js/v5.js e valida, fail-closed, todo data/editorial/videos/*.json que existir no repo
 * (o Publisher só traz o lote aprovado no Human Gate; este teste barra no CI qualquer campo fora do contrato).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "v5/js/v5.js"), "utf8");
const fail = [];
const fn = name => {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) { fail.push("função ausente: " + name); return `function ${name}() { return null; }`; }
  let d = 0, j = src.indexOf("{", i);
  for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) break; }
  return src.slice(i, j + 1);
};
const line = re => { const m = src.match(re); if (!m) fail.push("declaração ausente: " + re); return m ? m[0] : ""; };
const eq = (k, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail.push(`${k}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
const names = ["e", "dParts", "isDay", "tcDate", "tc", "civilDays", "zparts", "pad2", "opDay", "vidOk", "vidItems", "vidCard", "videosBlock"];
const K = new Function(`${line(/var MES = [^\n]*\n/)}\n${line(/var YT_ID = [^\n]*\n/)}\n${line(/var VID_MAX_AGE = [^\n]*\n/)}\n` +
  `var TZ = "America/Sao_Paulo", ZF = null;\n${names.map(fn).join("\n")}\nreturn { vidOk, vidItems, vidCard, videosBlock };`)();

const v = (id, o = {}) => Object.assign({ channel: "Alexandre Garcia", channel_id: "UCitie-To0pWGe5Qyk9SjWRA", video_id: id,
  title: "Título " + id, published_at: "2026-10-15T18:11:05Z", url: "https://www.youtube.com/watch?v=" + id,
  thumbnail: "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg", highlight: true, status: "NAO_VERIFICADO",
  origin: "Lista pública de envios do canal no YouTube (YouTube Data API v3)", discovered_at: "2026-10-15T23:55:32Z" }, o);
const V = items => ({ schema: "desmentindo.public.recent_videos.v1", date: "2026-10-15", notice: "Ainda não checado.", items });

// contrato por item (fail-closed)
eq("ok", K.vidOk(v("aaaaaaaaaaa")), true);
eq("id inválido", K.vidOk(v("curto")), false);
eq("link fora do oficial", K.vidOk(v("aaaaaaaaaaa", { url: "https://evil.example/watch?v=aaaaaaaaaaa" })), false);
eq("status diferente", K.vidOk(v("aaaaaaaaaaa", { status: "DOCUMENTADO" })), false);
eq("sem título", K.vidOk(v("aaaaaaaaaaa", { title: "" })), false);
// atualidade: lote de até 3 dias aparece; mais velho some; schema errado some
eq("lote do dia", K.vidItems(V([v("aaaaaaaaaaa")]), "2026-10-16").length, 1);
eq("lote de 3 dias", K.vidItems(V([v("aaaaaaaaaaa")]), "2026-10-18").length, 1);
eq("lote de 4 dias some", K.vidItems(V([v("aaaaaaaaaaa")]), "2026-10-19").length, 0);
eq("schema errado", K.vidItems(Object.assign(V([v("aaaaaaaaaaa")]), { schema: "x" }), "2026-10-16").length, 0);
eq("sem lote → sem seção", K.videosBlock(null, "2026-10-16"), "");
// sinalizado nunca vem primeiro e nunca tem miniatura
const mix = K.vidItems(V([v("bbbbbbbbbbb", { highlight: false, thumbnail: null }), v("aaaaaaaaaaa")]), "2026-10-16");
eq("destaque primeiro", mix.map(x => x.video_id), ["aaaaaaaaaaa", "bbbbbbbbbbb"]);
const flagged = K.vidCard(v("bbbbbbbbbbb", { highlight: false, thumbnail: "https://i.ytimg.com/vi/bbbbbbbbbbb/mqdefault.jpg" }));
eq("sinalizado sem imagem", /<img/.test(flagged), false);
eq("miniatura só oficial", /<img/.test(K.vidCard(v("aaaaaaaaaaa", { thumbnail: "https://evil.example/x.jpg" }))), false);
// o que a seção mostra e o que nunca mostra
const h = K.videosBlock(V([v("aaaaaaaaaaa", { title: "<script>x</script>" })]), "2026-10-16");
eq("escapa título", /<script>x/.test(h), false);
eq("aviso de não checado", /Ainda não checado/.test(h) && /class="vr-note"/.test(h), true);
eq("canal, data, id e link oficial", [/Alexandre Garcia/.test(h), /15 OUT/.test(h), /aaaaaaaaaaa<\/span>/.test(h), /href="https:\/\/www\.youtube\.com\/watch\?v=aaaaaaaaaaa" target="_blank" rel="noopener"/.test(h)], [true, true, true, true]);
for (const bad of [/selo/i, /Checamos/, /DOCUMENTADO/, /#\/historia\//, /#\/agora\//, /data-t=/, /▶ \d/]) eq("sem " + bad, bad.test(h), false);
// separado da memória checada
eq("seção própria", /id="videos-recentes"/.test(h) && !/said/.test(h), true);

// dados publicados (se houver): contrato completo, fail-closed
const dir = path.join(ROOT, "data/editorial/videos");
if (fs.existsSync(dir)) {
  const KEYS = ["channel", "channel_id", "discovered_at", "highlight", "origin", "published_at", "status", "thumbnail", "title", "url", "video_id"];
  const CHANNELS = new Set(["UCitie-To0pWGe5Qyk9SjWRA", "UCXRIQok8uzYtg1TPwSqikVg", "UCqkoOgSof-lNcv8OzRPQj6w"]);
  const idx = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  eq("índice: schema", idx.schema, "desmentindo.public.recent_videos_index.v1");
  for (const f of fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    eq(f + " schema", d.schema, "desmentindo.public.recent_videos.v1");
    eq(f + " data", d.date + ".json", f);
    if (!(d.items || []).length || d.items.length > 6) fail.push(f + ": 1..6 itens");
    for (const it of d.items || []) {
      eq(f + " campos " + it.video_id, Object.keys(it).sort(), KEYS);
      if (!K.vidOk(it)) fail.push(f + ": item fora do contrato " + it.video_id);
      if (!CHANNELS.has(it.channel_id)) fail.push(f + ": canal fora da lista aprovada " + it.channel_id);
      if (it.highlight !== (it.thumbnail === "https://i.ytimg.com/vi/" + it.video_id + "/mqdefault.jpg")) fail.push(f + ": miniatura × destaque " + it.video_id);
    }
    if (!(idx.items || []).some(x => x.file === "data/editorial/videos/" + f)) fail.push(f + ": fora do índice");
  }
}

if (fail.length) { console.error("VIDEOS_RECENTES_INVALID\n  " + fail.join("\n  ")); process.exit(1); }
console.log("VIDEOS_RECENTES_VALID (contrato por item, atualidade, destaque × sinalizado, miniatura oficial, aviso, separação da memória, dados publicados)");
