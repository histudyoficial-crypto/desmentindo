/*
 * Compatibilidade HTML ↔ CSS/JS (P0 06/10/2026: HTML novo + eleicoes.css antigo em cache = bloco "emendado").
 * Toda referência local a .css/.js numa página estática deve vir com ?v=<sha256 do arquivo, 12 hex> (build-eleicoes.mjs).
 * assetProblems(html, bodyOf) devolve a lista de problemas; vazia = a página só aponta para assets compatíveis.
 *   bodyOf(path) → Buffer|null com os bytes do asset (do disco no CI; da produção no verify-production.mjs).
 */
import crypto from "node:crypto";

export const v12 = b => crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);

export function localAssetRefs(html) {
  const out = [];
  for (const m of html.matchAll(/<(?:link|script)\b[^>]*?\b(?:href|src)="(\/[^"]+?\.(?:css|js))(?:\?v=([^"&]*))?"/g)) out.push({ path: m[1], v: m[2] || null });
  return out;
}

export async function assetProblems(html, bodyOf) {
  const problems = [];
  for (const r of localAssetRefs(html)) {
    if (!r.v) { problems.push(`UNVERSIONED:${r.path}`); continue; }
    const b = await bodyOf(r.path, r.v);
    if (!b) problems.push(`MISSING:${r.path}`);
    else if (v12(b) !== r.v) problems.push(`VERSION_MISMATCH:${r.path}?v=${r.v} (servido ${v12(b)})`);
  }
  return problems;
}
