#!/usr/bin/env python3
"""Eleições 2026 · snapshots da apuração oficial (Presidente · Brasil · 1º turno).

Lê o arquivo de totalização do TSE e registra, de forma idempotente, a evolução da apuração:
FIRST_RESULT (primeiro dado oficial publicado) → HOURLY (no máximo um por hora cheia BRT) → FINAL (só quando o
próprio TSE marca totalização final, campo tf = "s"; nunca inferido porque os números pararam).

Um snapshot registra o que o TSE mostrava naquele momento. Não é projeção, tendência nem vencedor.
Desconhecido fica null (nunca 0). Só biblioteca padrão.

    python3 public-ui/eleicoes_snapshot.py --out dados/presidente-br.json [--input arquivo.json] [--now ISO]
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

BASE = "https://resultados.tse.jus.br/oficial/ele2026"
ELE = "6257"            # Eleição Ordinária Federal 2026 · 1º turno (config oficial ele-c.json, pleito 3220)
CARGO = "0001"          # Presidente
SOURCE = f"{BASE}/{ELE}/dados-simplificados/br/br-c{CARGO}-e{int(ELE):06d}-r.json"
BRT = dt.timezone(dt.timedelta(hours=-3))
STOP_AFTER = dt.datetime(2026, 10, 7, tzinfo=BRT)   # o cron é só desta eleição


def num(v):
    """Votos: string do TSE → int; vazio/ausente → None (nunca 0)."""
    if v is None:
        return None
    s = "".join(ch for ch in str(v) if ch.isdigit())
    return int(s) if s else None


def pct(v):
    """Percentual do TSE ("43,41") → float; vazio/ausente → None."""
    if v is None or str(v).strip() == "":
        return None
    try:
        return float(str(v).strip().replace(".", "").replace(",", ".")) if "," in str(v) else float(str(v))
    except ValueError:
        return None


def tse_time(d, t):
    """"04/10/2026" + "17:07:12" (horário de Brasília) → ISO com fuso; incompleto → None."""
    try:
        return dt.datetime.strptime(f"{d} {t}", "%d/%m/%Y %H:%M:%S").replace(tzinfo=BRT).isoformat()
    except (TypeError, ValueError):
        return None


def parse(raw, captured_at):
    cands = []
    for c in raw.get("cand") or []:
        cands.append({"candidate_id": c.get("sqcand"), "number": c.get("n"), "candidate_name": c.get("nm"),
                      "party": c.get("cc"), "votes": num(c.get("vap")), "percentage": pct(c.get("pvap")),
                      "tse_order": num(c.get("seq")), "tse_status": c.get("st") or None})
    final = str(raw.get("tf") or "").lower() == "s"
    return {
        "captured_at": captured_at,
        "tse_updated_at": tse_time(raw.get("dt"), raw.get("ht")) or tse_time(raw.get("dg"), raw.get("hg")),
        "tse_generated_at": tse_time(raw.get("dg"), raw.get("hg")),
        "scope": "BR", "office": "Presidente", "round": 1, "election_code": ELE, "source_url": SOURCE,
        "percent_totalized": pct(raw.get("pst")),
        "sections_totalized": num(raw.get("st")), "sections_total": num(raw.get("s")),
        "status": "FINAL" if final else "PARTIAL", "tse_final_flag": raw.get("tf"),
        "turnout": {"votes": num(raw.get("c")), "percentage": pct(raw.get("pc"))},
        "blank_votes": {"votes": num(raw.get("vb")), "percentage": pct(raw.get("pvb"))},
        "null_votes": {"votes": num(raw.get("tvn")), "percentage": pct(raw.get("ptvn"))},
        "valid_votes": num(raw.get("vv")),
        "candidates": cands,
    }


def empty_store():
    return {"schema": "desmentindo.eleicoes2026.snapshots.v1", "scope": "BR", "office": "Presidente", "round": 1,
            "source": "TSE · " + SOURCE,
            "rule": "Cada snapshot é o que o TSE mostrava naquele momento. Não é projeção, tendência nem vencedor. "
                    "Desconhecido = null.",
            "snapshots": [], "no_change": []}


def decide(store, rec, now):
    """Devolve (ação, motivo). Ações: FIRST_RESULT | HOURLY | FINAL | NO_CHANGE | SKIP."""
    snaps = store["snapshots"]
    if any(s["kind"] == "FINAL" for s in snaps):
        return "SKIP", "FINAL já registrado"
    window = "H" + now.astimezone(BRT).strftime("%Y-%m-%dT%H")
    key = (rec["tse_updated_at"], rec["percent_totalized"])
    last = snaps[-1] if snaps else None
    same = last is not None and (last["tse_updated_at"], last["percent_totalized"]) == key
    if not snaps:
        return "FIRST_RESULT", window
    if rec["status"] == "FINAL" and not same:
        return "FINAL", window
    if rec["status"] == "FINAL" and same and last["status"] != "FINAL":
        return "FINAL", window   # TSE marcou final sem mudar números: o marco FINAL ainda vale
    seen = {s["window"] for s in snaps} | {n["window"] for n in store.get("no_change", [])}
    if window in seen:
        return "SKIP", f"janela {window} já registrada"
    if same:
        return "NO_CHANGE", window
    return "HOURLY", window


def apply(store, action, window, rec):
    if action in ("FIRST_RESULT", "HOURLY", "FINAL"):
        store["snapshots"].append(dict(rec, kind=action, window=window, seq=len(store["snapshots"]) + 1))
    elif action == "NO_CHANGE":
        store.setdefault("no_change", []).append({"window": window, "checked_at": rec["captured_at"],
                                                  "tse_updated_at": rec["tse_updated_at"],
                                                  "note": "TSE sem dado novo nesta hora; nenhum snapshot duplicado"})
    s = store["snapshots"]
    store["summary"] = {"snapshot_count": len(s), "first_result_at": s[0]["tse_updated_at"] if s else None,
                        "last_snapshot_at": s[-1]["captured_at"] if s else None,
                        "last_tse_update": s[-1]["tse_updated_at"] if s else None,
                        "current_totalized": s[-1]["percent_totalized"] if s else None,
                        "final_captured": any(x["kind"] == "FINAL" for x in s)}
    return store


def fetch():
    req = urllib.request.Request(SOURCE, headers={"User-Agent": "desmentindo-eleicoes-2026-snapshot (+https://desmentindo.com.br)",
                                                  "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (403, 404):
            return None   # ainda não publicado
        raise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--input", help="arquivo do TSE já baixado (teste)")
    ap.add_argument("--now", help="ISO (teste)")
    a = ap.parse_args()
    now = dt.datetime.fromisoformat(a.now) if a.now else dt.datetime.now(dt.timezone.utc)
    if now > STOP_AFTER:
        print("SNAPSHOT=SKIP (fora da janela desta eleição)")
        return 0
    raw = json.load(open(a.input, encoding="utf-8")) if a.input else fetch()
    if raw is None or not raw.get("cand"):
        print("SNAPSHOT=NOT_AVAILABLE (TSE ainda não publicou totalização)")
        return 0
    rec = parse(raw, now.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    store = json.load(open(a.out, encoding="utf-8")) if os.path.exists(a.out) else empty_store()
    action, why = decide(store, rec, now)
    if action == "SKIP":
        print(f"SNAPSHOT=SKIP ({why})")
        return 0
    apply(store, action, why, rec)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(store, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"SNAPSHOT={action} pst={rec['percent_totalized']} tse={rec['tse_updated_at']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
