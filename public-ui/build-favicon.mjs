// Favicon do Desmentindo derivado da marca já aprovada do cabeçalho (.mark em v5/css/v5.css):
// quadrado --ink com três barras verticais --green, --yellow e #4A6FB5, na mesma ordem. Sem identidade nova.
// Gera favicon.svg, favicon.ico (PNG 32 embutido) e apple-touch-icon.png (180) na raiz. Determinístico.
//   node public-ui/build-favicon.mjs [--check]
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { deflateSync } from "node:zlib";

const INK = "#201E1D", BARS = ["#009C3B", "#FFDF00", "#4A6FB5"];
// grade 32×32: barras de 5 com vão de 2, centradas; altura 6..26 (proporção da .mark: barras ≈ 58% da altura)
const RECTS = BARS.map((c, i) => ({ x: 7 + i * 7, y: 6, w: 5, h: 20, c }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${INK}"/>` +
  RECTS.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.c}"/>`).join("") + "</svg>\n";

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function png(size) {
  const k = size / 32, row = 1 + size * 4, raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0;
    for (let x = 0; x < size; x++) {
      const gx = (x + .5) / k, gy = (y + .5) / k;
      const r = RECTS.find(r => gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h);
      const [R, G, B] = hex(r ? r.c : INK), o = y * row + 1 + x * 4;
      raw[o] = R; raw[o + 1] = G; raw[o + 2] = B; raw[o + 3] = 255;
    }
  }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4), td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4);
    l.writeUInt32BE(d.length); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function ico(p) {   // ICO com uma imagem PNG 32×32 (aceito por todos os navegadores atuais, inclusive Safari)
  const h = Buffer.alloc(22); h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h[6] = 32; h[7] = 32; h[8] = 0; h[9] = 0; h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(p.length, 14); h.writeUInt32LE(22, 18);
  return Buffer.concat([h, p]);
}
const out = { "favicon.svg": Buffer.from(svg), "favicon.ico": ico(png(32)), "apple-touch-icon.png": png(180) };
if (process.argv.includes("--check")) {
  const bad = Object.entries(out).filter(([f, b]) => !existsSync(f) || !readFileSync(f).equals(b)).map(([f]) => f);
  if (bad.length) { console.error("FAVICON_OUT_OF_SYNC: " + bad.join(", ") + " (rode node public-ui/build-favicon.mjs)"); process.exit(1); }
  console.log("FAVICON_OK");
} else for (const [f, b] of Object.entries(out)) { writeFileSync(f, b); console.log(f, b.length); }
