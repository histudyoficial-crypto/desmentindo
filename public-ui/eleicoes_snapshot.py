#!/usr/bin/env python3
"""Eleições 2026 · snapshots da apuração oficial (Presidente · Brasil · 1º e 2º turno).

Lê o arquivo de totalização do TSE e registra, de forma idempotente, a evolução da apuração:
FIRST_RESULT (primeiro dado oficial publicado) → HOURLY (no máximo um por hora cheia BRT) → FINAL (só quando o
próprio TSE marca totalização final, campo tf = "s"; nunca inferido porque os números pararam).

Um snapshot registra o que o TSE mostrava naquele momento. Não é projeção, tendência nem vencedor.
Desconhecido fica null (nunca 0). Só biblioteca padrão.

    python3 public-ui/eleicoes_snapshot.py --out dados/presidente-br.json [--input arquivo.json] [--now ISO]
    python3 public-ui/eleicoes_snapshot.py --eleicao 6258 --out dados/presidente-br-2t.json   # 2º turno (25/10)

Cada snapshot guarda o SHA-256 dos bytes exatamente como vieram do TSE e os cabeçalhos HTTP de data/versão
(Date, Last-Modified, ETag), para qualquer pessoa conferir depois que o registro corresponde ao arquivo oficial.
Falha de rede/servidor não grava nada: o arquivo continua com o último estado conhecido (a página mostra a hora dele).
"""
import hashlib
import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

BASE = "https://resultados.tse.jus.br/oficial/ele2026"
# Códigos conferidos no config oficial (resultados.tse.jus.br/oficial/comum/config/ele-c.json, gerado em 18/10/2026 12:38:11):
# pleito 3220 (04/10) → eleição 6257 · 1º turno; pleito 3221 (25/10) → eleição 6258 "Eleição Ordinária Federal - 2026 2º Turno".
# STOP_AFTER: depois disso o coletor não roda (cada execução é só da sua eleição).
BRT = dt.timezone(dt.timedelta(hours=-3))
TURNOS = {"6257": {"round": 1, "pleito": "3220", "stop": dt.datetime(2026, 10, 7, tzinfo=BRT)},
          "6258": {"round": 2, "pleito": "3221", "stop": dt.datetime(2026, 10, 28, tzinfo=BRT)}}
ELE = "6257"            # padrão = 1º turno (comportamento original); --eleicao 6258 = 2º turno
CARGO = "0001"          # Presidente
# Contrato real (verificado 04/10/2026 17:15 BRT): totalização em dados/<uf>/<uf>-c<cargo>-e<ele>-u.json (estrutura aninhada).
# "dados-simplificados/*-r.json" não existe mais no TSE desde 2024.
def source_for(ele):
    return f"{BASE}/{ele}/dados/br/br-c{CARGO}-e{int(ele):06d}-u.json"


SOURCE = source_for(ELE)
STOP_AFTER = TURNOS[ELE]["stop"]


def use(ele):
    """Seleciona a eleição (só códigos conferidos no config oficial; qualquer outro é erro, nunca adivinhado)."""
    global ELE, SOURCE, STOP_AFTER
    if ele not in TURNOS:
        raise SystemExit(f"eleição {ele!r} não conferida no config oficial")
    ELE, SOURCE, STOP_AFTER = ele, source_for(ele), TURNOS[ele]["stop"]


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


def flatten(raw):
    """Arquivo oficial "-u.json" → formato plano lido por parse(). Estrito: estrutura desconhecida → sem candidatos.
    Sem seção totalizada (s.st = 0: arquivo pré-carregado com zeros) → sem candidatos: zero de arquivo vazio não é resultado."""
    if not raw or "carg" not in raw:
        return {"cand": []}
    cg = next((c for c in raw.get("carg") or [] if num(c.get("cd")) == int(CARGO)), None)
    s, e, v = raw.get("s") or {}, raw.get("e") or {}, raw.get("v") or {}
    if not cg or not (num(s.get("st")) or 0) > 0:
        return {"cand": []}
    cand = [{"sqcand": c.get("sqcand"), "n": c.get("n"), "nm": c.get("nmu") or c.get("nm"), "cc": p.get("sg"),
             "vap": c.get("vap"), "pvap": c.get("pvap"), "seq": c.get("seq"), "st": c.get("st")}
            for a in cg.get("agr") or [] for p in a.get("par") or [] for c in p.get("cand") or []]
    return {"cand": cand, "tf": raw.get("tf"), "pst": s.get("pst"), "st": s.get("st"), "s": s.get("ts"),
            "dt": raw.get("dt"), "ht": raw.get("ht"), "dg": raw.get("dg"), "hg": raw.get("hg"),
            "c": e.get("c"), "pc": e.get("pc"), "vb": v.get("vb"), "pvb": v.get("pvb"), "tvn": v.get("tvn"),
            "ptvn": v.get("ptvn"), "vv": v.get("vv")}


def tse_coherent(raw):
    """Hora de totalização (dt/ht) só se coerente com a geração do arquivo (dg/hg, horário de Brasília): o TSE já publicou
    dt/ht no fuso do local (exterior e UFs fora de Brasília, 04/10/2026). Fora da janela [geração −10 min, +5 min] → geração."""
    tot, gen = tse_time(raw.get("dt"), raw.get("ht")), tse_time(raw.get("dg"), raw.get("hg"))
    if tot and (not gen or dt.datetime.fromisoformat(gen) - dt.timedelta(minutes=10)
                <= dt.datetime.fromisoformat(tot) <= dt.datetime.fromisoformat(gen) + dt.timedelta(minutes=5)):
        return tot
    return gen


def parse(raw, captured_at):
    cands = []
    for c in raw.get("cand") or []:
        cands.append({"candidate_id": c.get("sqcand"), "number": c.get("n"), "candidate_name": c.get("nm"),
                      "party": c.get("cc"), "votes": num(c.get("vap")), "percentage": pct(c.get("pvap")),
                      "tse_order": num(c.get("seq")), "tse_status": c.get("st") or None})
    final = str(raw.get("tf") or "").lower() == "s"
    return {
        "captured_at": captured_at,
        "tse_updated_at": tse_coherent(raw),
        "tse_generated_at": tse_time(raw.get("dg"), raw.get("hg")),
        "scope": "BR", "office": "Presidente", "round": TURNOS[ELE]["round"], "election_code": ELE, "source_url": SOURCE,
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
    return {"schema": "desmentindo.eleicoes2026.snapshots.v1", "scope": "BR", "office": "Presidente", "round": TURNOS[ELE]["round"],
            "election_code": ELE, "pleito": TURNOS[ELE]["pleito"],
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


def fingerprint(body, headers=None):
    """Prova de origem do registro: SHA-256 dos bytes recebidos + cabeçalhos de data/versão do servidor (ausente = null)."""
    h = headers or {}
    return {"sha256": hashlib.sha256(body).hexdigest(), "bytes": len(body),
            "http_date": h.get("Date"), "last_modified": h.get("Last-Modified"), "etag": h.get("ETag")}


def fetch():
    """→ (json, bytes, cabeçalhos) | None se ainda não publicado (403/404). Outro erro sobe: nada é gravado."""
    req = urllib.request.Request(SOURCE, headers={"User-Agent": "desmentindo-eleicoes-2026-snapshot (+https://desmentindo.com.br)",
                                                  "Accept": "application/json", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            return json.loads(body.decode("utf-8")), body, dict(r.headers.items())
    except urllib.error.HTTPError as e:
        if e.code in (403, 404):
            return None   # ainda não publicado
        raise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--input", help="arquivo do TSE já baixado (teste)")
    ap.add_argument("--now", help="ISO (teste)")
    ap.add_argument("--eleicao", default="6257", help="6257 = 1º turno (padrão) · 6258 = 2º turno")
    a = ap.parse_args()
    use(a.eleicao)
    now = dt.datetime.fromisoformat(a.now) if a.now else dt.datetime.now(dt.timezone.utc)
    if now > STOP_AFTER:
        print("SNAPSHOT=SKIP (fora da janela desta eleição)")
        return 0
    if a.input:
        body = open(a.input, "rb").read()
        got = (json.loads(body.decode("utf-8")), body, {})
    else:
        try:
            got = fetch()
        except (urllib.error.URLError, OSError, ValueError) as e:
            print(f"SNAPSHOT=FETCH_FAILED ({type(e).__name__}); nada gravado, vale o último estado conhecido")
            return 0
    raw = flatten(got[0]) if got is not None else None
    if raw is None or not raw.get("cand"):
        print("SNAPSHOT=NOT_AVAILABLE (TSE ainda não publicou totalização)")
        return 0
    rec = parse(raw, now.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    rec["source_fingerprint"] = fingerprint(got[1], got[2])
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
    print(f"SNAPSHOT={action} ele={ELE} pst={rec['percent_totalized']} tse={rec['tse_updated_at']} sha256={rec['source_fingerprint']['sha256'][:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
