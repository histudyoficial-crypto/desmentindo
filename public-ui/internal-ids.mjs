/*
 * INTERNAL_IDENTIFIER_PUBLIC_LEAK = FAIL_CLOSED.
 * Identificadores internos do backend (registro de fontes PS-*, revisões, histórias, eventos, afirmações, decisões,
 * work items, incidentes, chaves de campo) nunca chegam ao público: texto visível, title/tooltip, aria-label, href,
 * data-* ou JSON servido. A rastreabilidade continua no repositório privado.
 *
 *   node public-ui/internal-ids.mjs [arquivos ou pastas...]   # varredura (CI); sai 1 se achar qualquer id
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const INTERNAL_IDS = /\bPS-[A-Z]{2,}-\d{8}|\bRV-20\d{6}-\d{3}\b|\bDS-20\d{2}-\d{2}-\d{2}-\d{3}\b|\bDSNR-|\bEVC-20\d{6}-\d{3}|\bHI-[0-9a-f]{12}\b|\bRQ-[0-9a-f]{12}\b|\bSC-\d{3}\b|\bWI-\d{8}-\d{3}|\bINC-20\d{6}-\d{3}\b|\bDQ-\d{4}\b|\bD-20\d{12}-[0-9a-f]{6,}|\b(source_id|evidence_id|review_id|event_id|claim_id|story_id|item_id|query_id)\b|\[fonte prim[aá]ria\]/i;

export function findLeaks(text) {
  const re = new RegExp(INTERNAL_IDS.source, "gi");
  const out = [];
  let m;
  while ((m = re.exec(text)) && out.length < 20) out.push(m[0]);
  return out;
}

function walk(p) {
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).flatMap(n => walk(path.join(p, n)));
  return /\.(html?|json|js|css|txt|xml)$/i.test(p) ? [p] : [];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const targets = process.argv.slice(2);
  let bad = 0, n = 0;
  for (const f of targets.flatMap(walk)) {
    n++;
    const leaks = findLeaks(fs.readFileSync(f, "utf8"));
    if (leaks.length) { bad++; console.error(`INTERNAL_IDENTIFIER_PUBLIC_LEAK ${f}: ${[...new Set(leaks)].join(", ")}`); }
  }
  console.log(`INTERNAL_IDENTIFIER_SCAN ${bad ? "FAIL" : "PASS"} (${n} arquivos)`);
  process.exit(bad ? 1 : 0);
}
