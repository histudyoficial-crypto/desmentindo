#!/usr/bin/env python3
"""Self-test do ctl.py: roda numa cópia temporária e prova que cada invariante
bloqueia o que deve bloquear. Não toca nos arquivos reais."""
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FAILS = []


def setup():
    tmp = tempfile.mkdtemp(prefix="ctl-test-")
    for d in ("control", "operations", "command-center"):
        shutil.copytree(os.path.join(ROOT, d), os.path.join(tmp, d))
    os.makedirs(os.path.join(tmp, "reports"))
    return tmp


def ctl(tmp, *args):
    return subprocess.run([sys.executable, os.path.join(tmp, "operations/tools/ctl.py"), *args],
                          capture_output=True, text=True)


def edit(tmp, name, fn):
    p = os.path.join(tmp, "control", name)
    with open(p, encoding="utf-8") as fh:
        data = json.load(fh)
    fn(data)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def expect(label, result, ok, needle=None):
    out = result.stdout + result.stderr
    passed = (result.returncode == 0) == ok and (needle is None or needle in out)
    print(f"{'PASS' if passed else 'FAIL'}  {label}")
    if not passed:
        FAILS.append(label)
        print("      " + out.strip().replace("\n", "\n      "))


def case(label, name, fn, needle, sync_first=False):
    tmp = setup()
    try:
        edit(tmp, name, fn)
        if sync_first:
            ctl(tmp, "sync")
        expect(label, ctl(tmp, "validate"), False, needle)
    finally:
        shutil.rmtree(tmp)


def main():
    tmp = setup()
    try:
        expect("baseline válido", ctl(tmp, "validate"), True, "CONTROL_PLANE_VALID=YES")
    finally:
        shutil.rmtree(tmp)

    case("NOT_EXECUTED com valor 0 é rejeitado (nunca inventar zero)", "PIPELINE_TODAY.json",
         lambda d: d["stages"][0].update({"value": 0}), "nunca inventar zero", sync_first=True)
    case("MEASURED sem valor é rejeitado", "PIPELINE_TODAY.json",
         lambda d: d["stages"][1].update({"state": "MEASURED", "value": None}), "exige value numérico", sync_first=True)
    case("campo proibido person_score é bloqueado", "CORPUS_STATUS.json",
         lambda d: d["sources"][0].update({"person_score": 1}), "campo proibido", sync_first=True)
    case("métrica proibida person_ranking é bloqueada", "RESULTS.json",
         lambda d: d["site"].append({"metric": "person_ranking", "label": "x", "value": None, "state": "NOT_CONFIGURED"}),
         "métrica proibida", sync_first=True)
    case("timestamp futuro vira FUTURE_TIMESTAMP_ANOMALY", "INCIDENTS.json",
         lambda d: d["items"][0].update({"timestamp": "2099-01-01T00:00:00Z"}), "FUTURE_TIMESTAMP_ANOMALY", sync_first=True)
    case("contagem derivada divergente é detectada", "CURRENT_STATE.json",
         lambda d: d["pending_human_reviews"].update({"value": 7}), "derivado")
    case("estado de saúde fora do enum é rejeitado", "HEALTH.json",
         lambda d: d["components"]["SITE"].update({"status": "OK"}), "fora de", sync_first=True)

    def bad_review(d):
        d["items"].append({
            "review_id": "RV-20260930-001", "story_id": "S1", "title": "t",
            "review_reason": "NEW_ALLEGATION", "claim_summary": "c", "evidence_summary": "",
            "counter_evidence_summary": "", "sources": [],
            "rhr_context": {"rhr_warranted": True, "rhr_executed": False, "result": "NO_MATCH"},
            "flags": [], "created_at": "2026-09-30T00:00:00Z", "status": "APPROVED", "decision": None})
    tmp = setup()
    try:
        edit(tmp, "HUMAN_REVIEW_QUEUE.json", bad_review)
        ctl(tmp, "sync")
        r = ctl(tmp, "validate")
        expect("NO_MATCH sem execução de RHR é rejeitado", r, False, "NOT_EXECUTED != NO_MATCH")
        expect("APPROVED sem decision_ref é rejeitado", r, False, "exige decision")
    finally:
        shutil.rmtree(tmp)

    tmp = setup()
    try:
        with open(os.path.join(tmp, "control", "leak.txt"), "w") as fh:
            fh.write("token ghp_" + "A" * 36)
        expect("segredo em control/ é detectado", ctl(tmp, "validate"), False, "possível segredo")
    finally:
        shutil.rmtree(tmp)

    # fluxo operacional completo: lock -> rotina -> review -> decisão -> relatório -> release
    tmp = setup()
    try:
        run_id = ctl(tmp, "lock", "acquire", "MORNING_OPEN", "--holder", "test").stdout.strip()
        expect("lock concorrente é negado (exit 3)", ctl(tmp, "lock", "acquire", "AFTERNOON_UPDATE"), False, "LOCK_HELD")
        expect("rotina sem lock correto é negada", ctl(tmp, "routine", "start", "MORNING_OPEN", "--run-id", "x"), False)
        expect("rotina start com lock", ctl(tmp, "routine", "start", "MORNING_OPEN", "--run-id", run_id), True)
        expect("pipeline MEASURED", ctl(tmp, "pipeline", "set", "EVENTS", "--state", "MEASURED", "--value", "12", "--source", "test"), True)
        expect("pipeline NOT_EXECUTED com valor é negado",
               ctl(tmp, "pipeline", "set", "CLAIMS", "--state", "NOT_EXECUTED", "--value", "0"), False)
        item = os.path.join(tmp, "item.json")
        with open(item, "w") as fh:
            json.dump({"story_id": "S-TEST", "title": "Teste", "review_reason": "NEW_ALLEGATION",
                       "claim_summary": "Resumo", "evidence_summary": "E", "counter_evidence_summary": "C",
                       "sources": [{"title": "Fonte", "url": "https://example.org"}],
                       "rhr_context": {"rhr_warranted": True, "rhr_executed": True, "result": "OCCURRENCES_FOUND"},
                       "flags": ["ALLEGATION_NOT_PROOF"]}, fh)
        rid = ctl(tmp, "review", "add", "--file", item).stdout.strip()
        expect("review add", ctl(tmp, "validate"), True)
        expect("decisão sem link do GitHub é negada",
               ctl(tmp, "review", "decide", rid, "--status", "APPROVED", "--by", "Johnny", "--ref", "http://x"), False)
        expect("decisão com Issue do GitHub",
               ctl(tmp, "review", "decide", rid, "--status", "HOLD", "--by", "Johnny",
                   "--ref", "https://github.com/histudyoficial-crypto/desmentindo/issues/1"), True)
        iid = ctl(tmp, "incident", "open", "--component", "RHR", "--type", "RHR_UNAVAILABLE", "--severity", "SEV3",
                  "--description", "d", "--impact", "i").stdout.strip()
        expect("incidente aberto altera overall para DEGRADED", ctl(tmp, "validate"), True)
        expect("incidente resolvido", ctl(tmp, "incident", "update", iid, "--status", "RESOLVED", "--resolution", "ok"), True)
        expect("hcv add", ctl(tmp, "hcv", "add", "--story-id", "S-TEST", "--by", "Johnny", "--rhr-executed",
                              "--verdict", "USEFUL", "--justification", "Contexto histórico mudou a leitura."), True)
        expect("routine finish", ctl(tmp, "routine", "finish", "MORNING_OPEN", "--run-id", run_id,
                                     "--status", "COMPLETED", "--summary", "teste"), True)
        for kind in ("daily", "weekly", "review-brief"):
            expect(f"report {kind}", ctl(tmp, "report", kind), True)
        expect("report incident", ctl(tmp, "report", "incident", "--id", iid), True)
        expect("lock release", ctl(tmp, "lock", "release", "--run-id", run_id), True)
        expect("estado final válido", ctl(tmp, "validate"), True, "CONTROL_PLANE_VALID=YES")
        with open(os.path.join(tmp, "control", "RESULTS.json")) as fh:
            hcv = json.load(fh)["historical_context_value"]
        ok = hcv["state"] == "MEASURED" and hcv["value"] == 1.0
        print(f"{'PASS' if ok else 'FAIL'}  HCV calculado só a partir de avaliação humana")
        if not ok:
            FAILS.append("hcv")
    finally:
        shutil.rmtree(tmp)

    print(f"\n{len(FAILS)} falha(s)")
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
