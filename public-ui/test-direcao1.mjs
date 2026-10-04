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
  [/i\.ytimg\.com/, "miniatura automática do YouTube (pode associar pessoa errada)"],
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

if (fail.length) { console.error("DIRECAO1_INVALID\n  " + fail.join("\n  ")); process.exit(1); }
console.log("DIRECAO1_VALID (EM1_RULE, fwd, byTime, limites da V1)");
