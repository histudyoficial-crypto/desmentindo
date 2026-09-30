#!/usr/bin/env node
/*
 * QA dos estados da História (telas 05–10) e dos casos-limite do handoff.
 * Fixtures existem SÓ aqui: são injetadas por interceptação de rede no navegador de teste,
 * nunca são gravadas em v4/data nem servidas ao público.
 *
 *   python3 -m http.server 8765   (na raiz do repo)
 *   PW=$(npm root -g)/playwright node public-ui/qa/states.mjs [pasta-de-screenshots]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.env.BASE || "http://127.0.0.1:8765/v4/";
const SHOTS = process.argv[2] || null;
const real = JSON.parse(fs.readFileSync(path.join(ROOT, "v4/data/historias/satiagraha.json"), "utf8"));

const src = { title: "Fonte de teste", url: "https://example.org/fonte", date: "2024-05-02" };
const FIX = {
  "qa-corrigida": { ...real, slug: "qa-corrigida", title: "QA · história corrigida",
    corrections: [{ date: "2026-09-28", text: "A data do acórdão estava errada; o correto é 12 MAR 2024.", before: "A data do acórdão era 21 MAR 2024." }] },
  "qa-olha": { ...real, slug: "qa-olha", title: "QA · olha a data",
    temporal_contrasts: [{ t1: { date: "2020-03-01", verb: "declarou", text: "Declarou apoio ao projeto.", status: "DOCUMENTADO", check_type: "FOI_DITO", source: src },
      t2: { date: "2024-05-02", verb: "votou", text: "Votou contra o projeto.", status: "DOCUMENTADO", check_type: "ACONTECEU", source: src },
      interval_label: "4 anos", what_changed: "O voto foi contrário ao apoio declarado antes.", explanation: { state: "AINDA NÃO ENCONTRAMOS UMA EXPLICAÇÃO DOCUMENTADA" } }] },
  "qa-verbo-interpretativo": { ...real, slug: "qa-verbo-interpretativo", title: "QA · verbo sem revisão",
    temporal_contrasts: [{ t1: { date: "2020-03-01", verb: "se contradisse", text: "x", status: "DOCUMENTADO", check_type: "FOI_DITO", source: src },
      t2: { date: "2024-05-02", verb: "votou", text: "y", status: "DOCUMENTADO", check_type: "ACONTECEU", source: src } }] },
  "qa-sem-fonte": { ...real, slug: "qa-sem-fonte", title: "QA · momento sem fonte",
    temporal_contrasts: [{ t1: { date: "2020-03-01", verb: "declarou", text: "x", status: "DOCUMENTADO", check_type: "FOI_DITO", source: null },
      t2: { date: "2024-05-02", verb: "votou", text: "y", status: "DOCUMENTADO", check_type: "ACONTECEU", source: src } }] },
  "qa-minima": { ...real, slug: "qa-minima", title: "QA · uma fonte, sem documento, sem imagem",
    doc: null, video: null, cast: [], archive: real.archive.slice(0, 1), questions: [], responses: [],
    sources: real.sources.slice(0, 1), rail: real.sources.slice(0, 1), events: real.events.slice(0, 1), tl: real.tl.slice(0, 1), state: "AGORA", lastPublished: "2020-01-01" },
};

const checks = [];
function check(name, ok, detail) { checks.push({ name, ok, detail }); console.log((ok ? "PASS  " : "FAIL  ") + name + (ok || !detail ? "" : "  → " + detail)); }

const browser = await chromium.launch({ args: process.env.HTTPS_PROXY ? ["--proxy-server=" + process.env.HTTPS_PROXY, "--proxy-bypass-list=127.0.0.1;localhost"] : [] });
for (const [vpName, vp] of [["desk", { width: 1280, height: 900 }], ["mob", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, ignoreHTTPSErrors: true });
  await ctx.route("**/data/historias/qa-*.json", r => {
    const slug = r.request().url().match(/historias\/(qa-[a-z-]+)\.json/)[1];
    return FIX[slug] ? r.fulfill({ contentType: "application/json", body: JSON.stringify(FIX[slug]) }) : r.fulfill({ status: 404, body: "" });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  async function open(hash) {
    await p.goto(BASE + "#/" + hash);
    await p.waitForFunction(() => !document.getElementById("main").hasAttribute("aria-busy"), null, { timeout: 15000 });
    return p.evaluate(() => ({ text: document.getElementById("main").innerText, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sections: [...document.querySelectorAll("main .sec-head h2")].map(h => h.textContent) }));
  }
  const tag = s => `[${vpName}] ${s}`;

  let r = await open("historia/qa-corrigida");
  check(tag("CORRIGIDA: faixa amarela no topo e registro de atualizações"), /✎ Corrigida/.test(r.text) && r.sections.includes("Registro de atualizações"));
  check(tag("CORRIGIDA: versão anterior aparece riscada"), await p.locator(".old-version").count() > 0);
  if (SHOTS && vpName === "desk") await p.screenshot({ path: path.join(SHOTS, "state-corrigida.png") });

  r = await open("historia/qa-olha");
  check(tag("OLHA A DATA: renderiza T1 → intervalo → T2 com fonte"), await p.locator(".olha").count() === 1 && /4 anos/.test(r.text) && /O que explica a mudança\?/i.test(r.text));
  check(tag("OLHA A DATA: aviso 'mudar não é contradição'"), /não é, sozinho, contradição/.test(r.text));
  if (SHOTS) { await p.locator(".olha").scrollIntoViewIfNeeded(); await p.locator(".olha").screenshot({ path: path.join(SHOTS, `state-olha-${vpName}.png`) }); }

  r = await open("historia/qa-verbo-interpretativo");
  check(tag("OLHA A DATA: verbo interpretativo sem revisão humana não entra"), await p.locator(".olha").count() === 0 && !r.sections.includes("Olha a data"));
  r = await open("historia/qa-sem-fonte");
  check(tag("OLHA A DATA: momento sem fonte não entra"), await p.locator(".olha").count() === 0);

  r = await open("historia/qa-minima");
  check(tag("1 fonte: plural correto na transparência"), /\b1 fonte\b/.test(r.text));
  check(tag("sem documento: bloco não renderiza"), !r.sections.includes("Documento em destaque"));
  check(tag("sem vídeo/sem pessoas: módulos não renderizam"), !r.sections.includes("Vídeo") && !r.sections.includes("Quem aparece nesta história"));
  check(tag("sem perguntas: estado vazio correto"), /não registram perguntas abertas/.test(r.text));
  check(tag("estado AGORA quando não há checagem pendente"), /Agora/i.test(await p.locator(".hero .tags").innerText()));

  r = await open("historia/compliance-zero-master");
  check(tag("história longa real: CONTINUA + CHECAGEM + resposta do citado"), /NOVO DESDOBRAMENTO/i.test(r.text) && /Ainda estamos conferindo/i.test(r.text) && /O que diz o citado/i.test(r.text));
  check(tag("história longa real: muitas fontes em trilho + lista completa"), (await p.locator(".rail .srccard").count()) === 8 && /Todas as \d+ fontes/.test(r.text));
  check(tag("história longa real: com documento e com vídeo"), r.sections.includes("Documento em destaque") && r.sections.includes("Vídeo"));
  check(tag("história longa real: 'Aparecer aqui não é ser culpado.'"), /Aparecer aqui não é ser culpado\./.test(r.text));

  r = await open("historia/aloprados");
  check(tag("história curta real (1 registro) renderiza sem blocos vazios"), !/undefined|NaN|null/.test(r.text) && r.overflow <= 0);
  r = await open("afirmacao/cl-001");
  check(tag("AFIRMAÇÃO: selo + 'Checamos se …' + origem"), /Documentado/i.test(r.text) && /Checamos se (foi dito|aconteceu)/i.test(r.text) && /Circulou em/.test(r.text));
  r = await open("resultado?q=xyzqwk");
  check(tag("sem resultado: 'não significa que nunca aconteceu'"), /não significa que nunca aconteceu/.test(r.text));
  r = await open("historia/nao-existe-mesmo");
  check(tag("história inexistente: estado 'não encontrada'"), /não existe ou mudou de endereço/.test(r.text));
  r = await open("arquivos");
  check(tag("arquivo fora da busca ≠ zero resultados"), /Ainda não pesquisável/.test(r.text) && /não é o mesmo que “nada encontrado”/.test(r.text));
  check(tag("sem erros de JS"), errs.length === 0, errs.join(" | "));
  await ctx.close();
}
await browser.close();
const failed = checks.filter(c => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} verificações OK`);
process.exit(failed ? 1 : 0);
