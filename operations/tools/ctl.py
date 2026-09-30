#!/usr/bin/env python3
"""
Desmentindo Control Plane CLI (stdlib only).

GitHub guarda a verdade; este script é a única forma recomendada de alterar
control/*.json, para que campos derivados, invariantes e o bundle do Command
Center fiquem sempre consistentes.

  python3 operations/tools/ctl.py validate
  python3 operations/tools/ctl.py sync
  python3 operations/tools/ctl.py lock acquire MORNING_OPEN --holder claude-code
  python3 operations/tools/ctl.py lock release --run-id <id>
  python3 operations/tools/ctl.py day-open 2026-10-01
  python3 operations/tools/ctl.py routine start MORNING_OPEN --run-id <id>
  python3 operations/tools/ctl.py routine finish MORNING_OPEN --run-id <id> --status COMPLETED --summary "..."
  python3 operations/tools/ctl.py health set PUBLISHER --status HEALTHY --summary "..." [--last-success ts] ...
  python3 operations/tools/ctl.py pipeline set CLAIMS --state MEASURED --value 4 --source "..."
  python3 operations/tools/ctl.py incident open --component RHR --type RHR_UNAVAILABLE --severity SEV2 --description ".." --impact ".."
  python3 operations/tools/ctl.py incident update INC-20261001-001 --status RESOLVED --resolution ".."
  python3 operations/tools/ctl.py review add --file item.json
  python3 operations/tools/ctl.py review decide RV-20261001-001 --status APPROVED --by Johnny --ref https://github.com/.../issues/12
  python3 operations/tools/ctl.py hcv add --story-id S --by Johnny --rhr-executed --verdict USEFUL --justification ".."
  python3 operations/tools/ctl.py report daily|weekly|review-brief|incident [--id INC-..]

Nunca escreve fora de control/, reports/ e command-center/data.js.
Nunca publica, nunca ativa schedules.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONTROL = os.path.join(ROOT, "control")
SCHEMAS = os.path.join(CONTROL, "schemas")
REPORTS = os.path.join(ROOT, "reports")
CONFIG_PATH = os.path.join(ROOT, "operations", "config", "operations.json")
BUNDLE_PATH = os.path.join(ROOT, "command-center", "data.js")

# control file -> schema file
FILES = {
    "CURRENT_STATE.json": "current_state.schema.json",
    "HEALTH.json": "health.schema.json",
    "HUMAN_REVIEW_QUEUE.json": "human_review_queue.schema.json",
    "INCIDENTS.json": "incidents.schema.json",
    "DECISION_QUEUE.json": "decision_queue.schema.json",
    "PIPELINE_TODAY.json": "pipeline.schema.json",
    "CORPUS_STATUS.json": "corpus_status.schema.json",
    "RESULTS.json": "results.schema.json",
    "VIDEO_ENGINE.json": "video_engine.schema.json",
    "ENGINEERING.json": "engineering.schema.json",
    "BUSINESS.json": "business.schema.json",
}

ROUTINES = ["MORNING_OPEN", "AFTERNOON_UPDATE", "EVENING_CLOSE"]
PIPELINE_STAGES = ["NEWS_HUB", "EVENTS", "RELEVANCE", "CLAIMS", "RHR", "EVIDENCE",
                   "DAY_STORY", "EDITORIAL_CANDIDATE", "HUMAN_REVIEW", "PUBLISH"]
FORBIDDEN_KEYS = {"person_score", "political_score", "suspicion_score",
                  "wrongdoing_score", "controversy_score", "person_ranking",
                  "person_watchlist"}
SECRET_PATTERNS = [
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"gh[osu]_[A-Za-z0-9]{20,}"),
    re.compile(r"sk-ant-[A-Za-z0-9_-]{10,}"),
    re.compile(r"sk-[A-Za-z0-9]{32,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"\bsl\.[A-Za-z0-9_-]{40,}"),  # Dropbox short-lived token
]
FUTURE_TOLERANCE = dt.timedelta(minutes=10)
# Campos que por definição apontam para o futuro.
FUTURE_OK_KEYS = {"next_run", "scheduled_for", "expires_at"}
TS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


# ---------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------

def now_utc():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(s):
    return dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)


def sp_today():
    # America/Sao_Paulo is UTC-3 year-round (no DST since 2019).
    return (now_utc() - dt.timedelta(hours=3)).date().isoformat()


def load(name):
    with open(os.path.join(CONTROL, name), encoding="utf-8") as fh:
        return json.load(fh)


def save(name, data, actor="claude-code"):
    if "updated_at" in data:
        data["updated_at"] = iso(now_utc())
    if "updated_by" in data:
        data["updated_by"] = actor
    path = os.path.join(CONTROL, name)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.replace(tmp, path)


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def die(msg, code=1):
    print(f"ERRO: {msg}", file=sys.stderr)
    sys.exit(code)


def next_id(prefix, existing, width=3):
    date = sp_today().replace("-", "")
    nums = [int(i.rsplit("-", 1)[1]) for i in existing if i.startswith(f"{prefix}-{date}-")]
    return f"{prefix}-{date}-{(max(nums) + 1 if nums else 1):0{width}d}"


# ---------------------------------------------------------------------
# minimal JSON Schema subset validator
# ---------------------------------------------------------------------

_schema_cache = {}


def _load_schema(fname):
    if fname not in _schema_cache:
        with open(os.path.join(SCHEMAS, fname), encoding="utf-8") as fh:
            _schema_cache[fname] = json.load(fh)
    return _schema_cache[fname]


def _resolve(ref, current_file):
    fname, _, pointer = ref.partition("#")
    fname = fname or current_file
    node = _load_schema(fname)
    for part in [p for p in pointer.split("/") if p]:
        node = node[part]
    return node, fname


def _type_ok(value, t):
    if t == "null":
        return value is None
    if t == "boolean":
        return isinstance(value, bool)
    if t == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if t == "string":
        return isinstance(value, str)
    if t == "array":
        return isinstance(value, list)
    if t == "object":
        return isinstance(value, dict)
    return False


def validate_node(value, schema, path, errors, fname):
    if "$ref" in schema:
        target, tfile = _resolve(schema["$ref"], fname)
        validate_node(value, target, path, errors, tfile)
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_type_ok(value, t) for t in types):
            errors.append(f"{path}: tipo {type(value).__name__} não é {types}")
            return
    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: esperado {schema['const']!r}, veio {value!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: {value!r} fora de {schema['enum']}")
    if isinstance(value, str):
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: {value!r} não casa com {schema['pattern']}")
        if len(value) < schema.get("minLength", 0):
            errors.append(f"{path}: string vazia")
    if isinstance(value, dict):
        for req in schema.get("required", []):
            if req not in value:
                errors.append(f"{path}: campo obrigatório ausente '{req}'")
        props = schema.get("properties", {})
        for k, v in value.items():
            if k in props:
                validate_node(v, props[k], f"{path}.{k}", errors, fname)
            elif isinstance(schema.get("additionalProperties"), dict):
                validate_node(v, schema["additionalProperties"], f"{path}.{k}", errors, fname)
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}: campo não permitido '{k}'")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: mínimo {schema['minItems']} itens")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: máximo {schema['maxItems']} itens")
        if "items" in schema:
            for i, item in enumerate(value):
                validate_node(item, schema["items"], f"{path}[{i}]", errors, fname)


# ---------------------------------------------------------------------
# invariants
# ---------------------------------------------------------------------

def _walk(node, path=""):
    yield path, node
    if isinstance(node, dict):
        for k, v in node.items():
            yield from _walk(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from _walk(v, f"{path}[{i}]")


def check_generic_invariants(name, data, errors):
    limit = now_utc() + FUTURE_TOLERANCE
    for path, node in _walk(data):
        if isinstance(node, dict):
            for k in node:
                if k.lower() in FORBIDDEN_KEYS:
                    errors.append(f"{name}{path}: campo proibido '{k}'")
            if "metric" in node and isinstance(node["metric"], str) and node["metric"].lower() in FORBIDDEN_KEYS:
                errors.append(f"{name}{path}: métrica proibida '{node['metric']}'")
            # Metric rule: value only when MEASURED (FAILED != ZERO, NOT_EXECUTED != NO_MATCH)
            if "value" in node and "state" in node and isinstance(node.get("state"), str):
                st, val = node["state"], node["value"]
                if st == "MEASURED" and not _type_ok(val, "number"):
                    errors.append(f"{name}{path}: state=MEASURED exige value numérico")
                if st != "MEASURED" and st in {"UNKNOWN", "NOT_EXECUTED", "NOT_AVAILABLE", "NOT_CONFIGURED", "QUERY_UNAVAILABLE", "FAILED"} and val is not None:
                    errors.append(f"{name}{path}: state={st} exige value=null (nunca inventar zero)")
        if isinstance(node, str) and TS_RE.match(node):
            key = re.split(r"[.\[]", path)[-1]
            if key not in FUTURE_OK_KEYS and parse_ts(node) > limit:
                errors.append(f"{name}{path}: FUTURE_TIMESTAMP_ANOMALY {node}")


def derive(files, config):
    """Return dict of derived values from source-of-truth files."""
    hr = files["HUMAN_REVIEW_QUEUE.json"]["items"]
    inc = files["INCIDENTS.json"]["items"]
    dq = files["DECISION_QUEUE.json"]["items"]
    comps = files["HEALTH.json"]["components"]
    degraded = [c for c, v in comps.items() if v["status"] in ("DEGRADED", "FAILED")]
    unknown = [c for c, v in comps.items() if v["status"] == "UNKNOWN"]
    failed = [c for c, v in comps.items() if v["status"] == "FAILED"]
    active = [i for i in inc if i["status"] != "RESOLVED"]
    sev12 = [i for i in active if i["severity"] in ("SEV1", "SEV2")]
    if failed or sev12:
        overall = "FAILED"
    elif degraded or active:
        overall = "DEGRADED"
    elif unknown:
        overall = "UNKNOWN"
    else:
        overall = "HEALTHY"
    return {
        "pending_human_reviews": sum(1 for i in hr if i["status"] == "WAITING_REVIEW"),
        "active_incidents": len(active),
        "open_decisions": sum(1 for i in dq if i["status"] == "OPEN"),
        "degraded_services": degraded,
        "unknown_services": unknown,
        "overall_status": overall,
        "publish_state": config["publish"],
    }


def check_cross_invariants(files, config, errors, warnings):
    cs = files["CURRENT_STATE.json"]
    d = derive(files, config)
    for key in ("pending_human_reviews", "active_incidents", "open_decisions"):
        m = cs.get(key, {})
        if m.get("state") != "MEASURED" or m.get("value") != d[key]:
            errors.append(f"CURRENT_STATE.{key}: {m.get('value')} != derivado {d[key]} (rode ctl.py sync)")
    for key in ("degraded_services", "unknown_services"):
        if sorted(cs.get(key, [])) != sorted(d[key]):
            errors.append(f"CURRENT_STATE.{key} divergente de HEALTH (rode ctl.py sync)")
    if cs["overall_status"] != d["overall_status"]:
        errors.append(f"CURRENT_STATE.overall_status {cs['overall_status']} != derivado {d['overall_status']}")
    if cs["publish_state"] != config["publish"]:
        errors.append("CURRENT_STATE.publish_state diverge de operations.json#publish")
    if config["publish"] != "OFF":
        warnings.append("PUBLISH != OFF em operations.json — exige autorização explícita de Johnny em DECISIONS.md")
    if config.get("schedules_enabled"):
        warnings.append("schedules_enabled=true — confirme que o ciclo manual foi aprovado")
    lock = cs["lock"]
    if lock["held"]:
        if not (lock["routine"] and lock["holder"] and lock["run_id"] and lock["expires_at"]):
            errors.append("CURRENT_STATE.lock: lock ativo exige routine/holder/run_id/expires_at")
        elif parse_ts(lock["expires_at"]) < now_utc():
            warnings.append(f"lock de {lock['routine']} expirado em {lock['expires_at']} (stale)")
    # pipeline
    pl = files["PIPELINE_TODAY.json"]
    if [s["stage"] for s in pl["stages"]] != PIPELINE_STAGES:
        errors.append("PIPELINE_TODAY.stages fora da ordem canônica")
    hr_stage = next(s for s in pl["stages"] if s["stage"] == "HUMAN_REVIEW")
    if hr_stage["state"] == "MEASURED" and hr_stage["value"] != d["pending_human_reviews"]:
        errors.append("PIPELINE_TODAY.HUMAN_REVIEW diverge da fila (rode ctl.py sync)")
    if pl["operational_date"] != cs["operational_date"]:
        errors.append("PIPELINE_TODAY.operational_date != CURRENT_STATE.operational_date")
    # human review semantics
    for it in files["HUMAN_REVIEW_QUEUE.json"]["items"]:
        rid = it.get("review_id")
        if it["status"] == "WAITING_REVIEW" and it["decision"] is not None:
            errors.append(f"{rid}: WAITING_REVIEW não pode ter decision")
        if it["status"] != "WAITING_REVIEW" and not it["decision"]:
            errors.append(f"{rid}: status {it['status']} exige decision (quem, quando, issue)")
        rc = it["rhr_context"]
        if rc["result"] in ("OCCURRENCES_FOUND", "NO_MATCH") and not rc["rhr_executed"]:
            errors.append(f"{rid}: {rc['result']} sem rhr_executed=true (NOT_EXECUTED != NO_MATCH)")
        if rc["rhr_warranted"] is False and rc["result"] not in ("NOT_WARRANTED",):
            errors.append(f"{rid}: rhr_warranted=false exige result=NOT_WARRANTED")
        if rc["rhr_warranted"] and not rc["rhr_executed"] and rc["result"] != "NOT_EXECUTED":
            errors.append(f"{rid}: RHR warranted e não executado exige result=NOT_EXECUTED")
    # incidents
    for it in files["INCIDENTS.json"]["items"]:
        if it["status"] == "RESOLVED" and not it.get("resolution"):
            errors.append(f"{it['incident_id']}: RESOLVED exige resolution")
    # HCV
    hcv = files["RESULTS.json"]["historical_context_value"]
    exp_v, exp_s, _ = _hcv(hcv["evaluations"])
    if hcv["value"] != exp_v or hcv["state"] != exp_s:
        errors.append("RESULTS.historical_context_value divergente das avaliações (rode ctl.py sync)")


def _hcv(evals):
    useful = sum(1 for e in evals if e["verdict"] == "USEFUL")
    denom = sum(1 for e in evals if e["verdict"] in ("USEFUL", "NOT_USEFUL"))
    if denom == 0:
        return None, "NOT_EXECUTED", len(evals)
    return round(useful / denom, 4), "MEASURED", len(evals)


def scan_secrets(errors):
    for base in ("control", "reports", "operations", "command-center"):
        for dirpath, _, fnames in os.walk(os.path.join(ROOT, base)):
            for fn in fnames:
                p = os.path.join(dirpath, fn)
                try:
                    with open(p, encoding="utf-8") as fh:
                        text = fh.read()
                except (UnicodeDecodeError, OSError):
                    continue
                for pat in SECRET_PATTERNS:
                    if pat.search(text):
                        errors.append(f"{os.path.relpath(p, ROOT)}: possível segredo ({pat.pattern})")


def load_all():
    return {name: load(name) for name in FILES}


def build_bundle(files):
    payload = {"generated_at": iso(now_utc()), "files": files}
    body = json.dumps(payload, ensure_ascii=False, indent=1)
    return ("// GERADO por operations/tools/ctl.py sync — não editar.\n"
            "// Fallback offline do Command Center; a verdade está em control/*.json.\n"
            f"window.CC_BUNDLE = {body};\n")


def read_bundle():
    if not os.path.exists(BUNDLE_PATH):
        return None
    with open(BUNDLE_PATH, encoding="utf-8") as fh:
        text = fh.read()
    m = re.search(r"window\.CC_BUNDLE = (\{.*\});\s*$", text, re.S)
    return json.loads(m.group(1)) if m else None


# ---------------------------------------------------------------------
# commands
# ---------------------------------------------------------------------

def cmd_validate(args):
    errors, warnings = [], []
    files = {}
    for name, schema in FILES.items():
        try:
            data = load(name)
        except json.JSONDecodeError as e:
            errors.append(f"{name}: JSON inválido: {e}")
            continue
        except FileNotFoundError:
            errors.append(f"{name}: ausente")
            continue
        files[name] = data
        validate_node(data, _load_schema(schema), name, errors, schema)
        check_generic_invariants(name, data, errors)
    config = load_config()
    if len(files) == len(FILES):
        check_cross_invariants(files, config, errors, warnings)
        bundle = read_bundle()
        if bundle is None:
            errors.append("command-center/data.js ausente (rode ctl.py sync)")
        elif bundle["files"] != files:
            errors.append("command-center/data.js desatualizado (rode ctl.py sync)")
    scan_secrets(errors)
    for w in warnings:
        print(f"AVISO: {w}")
    if errors:
        for e in errors:
            print(f"ERRO: {e}")
        print(f"\nCONTROL_PLANE_VALID=NO ({len(errors)} erro(s))")
        sys.exit(1)
    print(f"CONTROL_PLANE_VALID=YES ({len(files)} arquivos, {len(warnings)} aviso(s))")


def cmd_sync(args, quiet=False):
    files = load_all()
    config = load_config()
    d = derive(files, config)
    cs = files["CURRENT_STATE.json"]
    for key in ("pending_human_reviews", "active_incidents", "open_decisions"):
        src = {"pending_human_reviews": "control/HUMAN_REVIEW_QUEUE.json",
               "active_incidents": "control/INCIDENTS.json",
               "open_decisions": "control/DECISION_QUEUE.json"}[key]
        cs[key] = {"value": d[key], "state": "MEASURED", "source": src}
    cs["degraded_services"] = d["degraded_services"]
    cs["unknown_services"] = d["unknown_services"]
    cs["overall_status"] = d["overall_status"]
    cs["publish_state"] = d["publish_state"]
    pl = files["PIPELINE_TODAY.json"]
    for s in pl["stages"]:
        if s["stage"] == "HUMAN_REVIEW":
            s.update({"value": d["pending_human_reviews"], "state": "MEASURED",
                      "source": "control/HUMAN_REVIEW_QUEUE.json (WAITING_REVIEW)"})
    res = files["RESULTS.json"]
    v, st, n = _hcv(res["historical_context_value"]["evaluations"])
    res["historical_context_value"].update({"value": v, "state": st, "evaluated_count": n})
    for name, data in files.items():
        before = load(name)
        if before != data:
            save(name, data)
    files = load_all()
    os.makedirs(os.path.dirname(BUNDLE_PATH), exist_ok=True)
    with open(BUNDLE_PATH, "w", encoding="utf-8") as fh:
        fh.write(build_bundle(files))
    if not quiet:
        print(f"sync OK — overall={d['overall_status']} reviews={d['pending_human_reviews']} "
              f"incidents={d['active_incidents']} decisions={d['open_decisions']}")


def cmd_lock(args):
    cs = load("CURRENT_STATE.json")
    lock = cs["lock"]
    t = now_utc()
    if args.action == "status":
        print(json.dumps(lock, indent=2, ensure_ascii=False))
        return
    if args.action == "acquire":
        if args.routine not in ROUTINES:
            die(f"rotina desconhecida {args.routine}")
        if lock["held"] and parse_ts(lock["expires_at"]) > t and not args.force:
            die(f"LOCK_HELD por {lock['holder']} ({lock['routine']}, run {lock['run_id']}) até "
                f"{lock['expires_at']} — CONCURRENCY_COLLISION evitada", code=3)
        ttl = args.ttl or load_config()["lock"]["default_ttl_minutes"]
        run_id = args.run_id or f"{args.routine}-{t.strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:6]}"
        cs["lock"] = {"held": True, "routine": args.routine, "holder": args.holder,
                      "run_id": run_id, "acquired_at": iso(t),
                      "expires_at": iso(t + dt.timedelta(minutes=ttl))}
        save("CURRENT_STATE.json", cs, args.holder)
        cmd_sync(args, quiet=True)
        print(run_id)
    elif args.action == "release":
        if lock["held"] and args.run_id and lock["run_id"] != args.run_id and not args.force:
            die(f"lock pertence a {lock['run_id']}, não a {args.run_id}", code=3)
        cs["lock"] = {"held": False, "routine": None, "holder": None, "run_id": None,
                      "acquired_at": None, "expires_at": None}
        save("CURRENT_STATE.json", cs)
        cmd_sync(args, quiet=True)
        print("lock liberado")


def cmd_day_open(args):
    date = args.date or sp_today()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        die("data inválida")
    cs = load("CURRENT_STATE.json")
    if cs["operational_date"] == date and not args.force:
        die(f"operational_date já é {date} (use --force para reabrir)")
    cs["operational_date"] = date
    for r in ROUTINES:
        cs["routines"][r] = {"status": "NOT_EXECUTED", "last_run_id": None,
                             "started_at": None, "finished_at": None, "summary": None}
    save("CURRENT_STATE.json", cs)
    pl = load("PIPELINE_TODAY.json")
    pl["operational_date"] = date
    for s in pl["stages"]:
        s.update({"value": None, "state": "NOT_EXECUTED", "source": None})
    save("PIPELINE_TODAY.json", pl)
    cmd_sync(args, quiet=True)
    print(f"dia operacional aberto: {date}")


def cmd_routine(args):
    cs = load("CURRENT_STATE.json")
    if args.routine not in ROUTINES:
        die(f"rotina desconhecida {args.routine}")
    lock = cs["lock"]
    if not (lock["held"] and lock["run_id"] == args.run_id):
        die("a rotina precisa do lock com o mesmo run_id (ctl.py lock acquire)", code=3)
    r = cs["routines"][args.routine]
    t = iso(now_utc())
    if args.action == "start":
        r.update({"status": "RUNNING", "last_run_id": args.run_id, "started_at": t,
                  "finished_at": None, "summary": None})
    else:
        if args.status not in ("COMPLETED", "COMPLETED_WITH_WARNINGS", "FAILED", "SKIPPED"):
            die("status final inválido")
        r.update({"status": args.status, "finished_at": t, "summary": args.summary})
        run = {"routine": args.routine, "run_id": args.run_id,
               "started_at": r["started_at"], "finished_at": t, "status": args.status}
        cs["last_run"] = run
        if args.status in ("COMPLETED", "COMPLETED_WITH_WARNINGS"):
            cs["last_successful_run"] = run
        if args.commit:
            cs["last_operational_commit"] = args.commit
        idx = ROUTINES.index(args.routine)
        nxt = ROUTINES[(idx + 1) % 3]
        cs["next_run"] = {"routine": nxt, "scheduled_for": None,
                          "mode": "SCHEDULED" if load_config().get("schedules_enabled") else "MANUAL",
                          "note": None}
    save("CURRENT_STATE.json", cs)
    cmd_sync(args, quiet=True)
    print(f"{args.routine} -> {r['status']}")


def cmd_health(args):
    h = load("HEALTH.json")
    if args.component not in h["components"]:
        die(f"componente desconhecido {args.component}")
    c = h["components"][args.component]
    c["status"] = args.status
    for field in ("summary", "last_success", "last_failure", "next_run", "last_result",
                  "error_summary", "evidence_url"):
        val = getattr(args, field)
        if val is not None:
            c[field] = None if val == "null" else val
    if args.duration is not None:
        c["duration_seconds"] = args.duration
    if args.status == "FAILED" and not c.get("error_summary"):
        die("FAILED exige --error-summary (FAILED != ZERO_RESULTS)")
    save("HEALTH.json", h)
    cmd_sync(args, quiet=True)
    print(f"{args.component} -> {args.status}")


def cmd_pipeline(args):
    pl = load("PIPELINE_TODAY.json")
    stage = next((s for s in pl["stages"] if s["stage"] == args.stage), None)
    if not stage:
        die(f"estágio desconhecido {args.stage}")
    if args.state == "MEASURED" and args.value is None:
        die("MEASURED exige --value")
    if args.state != "MEASURED" and args.value is not None:
        die(f"{args.state} não aceita --value (nunca inventar zero)")
    stage.update({"value": args.value, "state": args.state, "source": args.source,
                  "note": args.note if args.note is not None else stage.get("note")})
    save("PIPELINE_TODAY.json", pl)
    cmd_sync(args, quiet=True)
    print(f"{args.stage} -> {args.state} {args.value if args.value is not None else ''}")


def cmd_incident(args):
    inc = load("INCIDENTS.json")
    if args.action == "open":
        iid = next_id("INC", [i["incident_id"] for i in inc["items"]])
        inc["items"].append({
            "incident_id": iid, "timestamp": iso(now_utc()), "component": args.component,
            "type": args.type, "severity": args.severity, "description": args.description,
            "impact": args.impact, "status": "OPEN", "resolution": None, "resolved_at": None,
            "detected_by": args.by, "evidence_url": args.evidence_url})
        print(iid)
    else:
        it = next((i for i in inc["items"] if i["incident_id"] == args.id), None)
        if not it:
            die(f"incidente {args.id} não encontrado")
        it.update({"status": args.status, "resolution": args.resolution})
        if args.status == "RESOLVED":
            it["resolved_at"] = iso(now_utc())
        print(f"{args.id} -> {args.status}")
    save("INCIDENTS.json", inc)
    cmd_sync(args, quiet=True)


def cmd_review(args):
    q = load("HUMAN_REVIEW_QUEUE.json")
    if args.action == "add":
        with open(args.file, encoding="utf-8") as fh:
            item = json.load(fh)
        item.setdefault("review_id", next_id("RV", [i["review_id"] for i in q["items"]]))
        item.setdefault("created_at", iso(now_utc()))
        item["status"] = "WAITING_REVIEW"
        item["decision"] = None
        errs = []
        validate_node({"schema": q["schema"], "updated_at": q["updated_at"], "items": [item]},
                      _load_schema("human_review_queue.schema.json"), "item", errs,
                      "human_review_queue.schema.json")
        if errs:
            die("item inválido:\n  " + "\n  ".join(errs))
        q["items"].append(item)
        print(item["review_id"])
    else:
        it = next((i for i in q["items"] if i["review_id"] == args.id), None)
        if not it:
            die(f"review {args.id} não encontrado")
        if not args.ref.startswith("https://github.com/"):
            die("--ref deve apontar para a Issue/PR do GitHub onde Johnny decidiu")
        it["status"] = args.status
        it["decision"] = {"decided_by": args.by, "decided_at": iso(now_utc()),
                          "decision_ref": args.ref, "notes": args.notes}
        print(f"{args.id} -> {args.status}")
    save("HUMAN_REVIEW_QUEUE.json", q)
    cmd_sync(args, quiet=True)


def cmd_hcv(args):
    r = load("RESULTS.json")
    r["historical_context_value"]["evaluations"].append({
        "story_id": args.story_id, "evaluated_by": args.by, "evaluated_at": iso(now_utc()),
        "rhr_executed": args.rhr_executed, "verdict": args.verdict,
        "justification": args.justification})
    save("RESULTS.json", r)
    cmd_sync(args, quiet=True)
    print("avaliação registrada")


# ---------------------------------------------------------------------
# reports (Cowork contract: reports/README.md)
# ---------------------------------------------------------------------

def _m(metric):
    if metric is None:
        return "UNKNOWN"
    if metric.get("state") == "MEASURED":
        v = metric["value"]
        return int(v) if isinstance(v, float) and v.is_integer() else v
    return metric.get("state", "UNKNOWN")


def _front(d):
    lines = ["---"]
    for k, v in d.items():
        lines.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
    lines.append("---")
    return "\n".join(lines)


def _write_report(rel, text):
    path = os.path.join(REPORTS, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(os.path.relpath(path, ROOT))


def report_daily(files):
    cs, h = files["CURRENT_STATE.json"], files["HEALTH.json"]
    hr, inc = files["HUMAN_REVIEW_QUEUE.json"], files["INCIDENTS.json"]
    dq, pl = files["DECISION_QUEUE.json"], files["PIPELINE_TODAY.json"]
    date = cs["operational_date"]
    fm = _front({"report_type": "DAILY_EXECUTIVE_REPORT", "contract_version": "v1",
                 "operational_date": date, "generated_at": iso(now_utc()),
                 "overall_status": cs["overall_status"], "publish_state": cs["publish_state"],
                 "pending_human_reviews": _m(cs["pending_human_reviews"]),
                 "open_decisions": _m(cs.get("open_decisions")),
                 "active_incidents": _m(cs["active_incidents"]),
                 "degraded_services": cs["degraded_services"]})
    out = [fm, "", f"# DAILY_EXECUTIVE_REPORT — {date}", "",
           "## 1. Status geral", "",
           f"- Status: **{cs['overall_status']}** · PUBLISH={cs['publish_state']} · Human Gate={cs['human_gate_state']}",
           f"- Degradados: {', '.join(cs['degraded_services']) or 'nenhum'}",
           f"- Sem sinal (UNKNOWN): {', '.join(cs.get('unknown_services', [])) or 'nenhum'}", "",
           "## 2. Rotinas do dia", "", "| Rotina | Status | Início | Fim | Resumo |", "|---|---|---|---|---|"]
    for r in ROUTINES:
        x = cs["routines"][r]
        out.append(f"| {r} | {x['status']} | {x['started_at'] or '—'} | {x['finished_at'] or '—'} | {x.get('summary') or '—'} |")
    out += ["", "## 3. Pipeline", "", "| Estágio | Valor |", "|---|---|"]
    for s in pl["stages"]:
        out.append(f"| {s['label']} | {_m(s)} |")
    out += ["", "## 4. Precisa de Johnny", ""]
    waiting = [i for i in hr["items"] if i["status"] == "WAITING_REVIEW"]
    opendq = [i for i in dq["items"] if i["status"] == "OPEN"]
    for i in waiting:
        out.append(f"- [REVIEW] {i['review_id']} — {i['title']} ({i['review_reason']})")
    for i in opendq:
        out.append(f"- [{i['priority']}] {i['item_id']} — {i['title']}")
    if not waiting and not opendq:
        out.append("- Nada pendente.")
    out += ["", "## 5. Incidentes ativos", ""]
    act = [i for i in inc["items"] if i["status"] != "RESOLVED"]
    out += [f"- {i['incident_id']} {i['severity']} {i['component']} — {i['description']}" for i in act] or ["- Nenhum."]
    out += ["", "## 6. Saúde dos componentes", "", "| Componente | Status | Último sucesso | Resumo |", "|---|---|---|---|"]
    for c, v in h["components"].items():
        out.append(f"| {c} | {v['status']} | {v['last_success'] or '—'} | {v['summary']} |")
    out.append("")
    text = "\n".join(out)
    _write_report(f"daily/{date}.md", text)
    _write_report("executive/LATEST.md", text.replace("DAILY_EXECUTIVE_REPORT —", "EXECUTIVE SNAPSHOT —", 1))


def report_weekly(files):
    t = now_utc() - dt.timedelta(hours=3)
    year, week, _ = t.isocalendar()
    start = (t - dt.timedelta(days=t.weekday())).date()
    days = [(start + dt.timedelta(days=i)).isoformat() for i in range(7)]
    dailies = [d for d in days if os.path.exists(os.path.join(REPORTS, "daily", f"{d}.md"))]
    inc = [i for i in files["INCIDENTS.json"]["items"] if i["timestamp"][:10] >= days[0]]
    hr = files["HUMAN_REVIEW_QUEUE.json"]["items"]
    decided = [i for i in hr if i["decision"] and i["decision"]["decided_at"][:10] >= days[0]]
    hcv = files["RESULTS.json"]["historical_context_value"]
    fm = _front({"report_type": "WEEKLY_OPERATING_REPORT", "contract_version": "v1",
                 "iso_week": f"{year}-W{week:02d}", "week_start": days[0], "week_end": days[-1],
                 "generated_at": iso(now_utc()), "daily_reports_found": len(dailies),
                 "incidents_in_week": len(inc), "reviews_decided": len(decided),
                 "historical_context_value": _m(hcv)})
    out = [fm, "", f"# WEEKLY_OPERATING_REPORT — {year}-W{week:02d}", "",
           "## 1. Cobertura operacional", "",
           f"- Relatórios diários existentes: {len(dailies)}/7 ({', '.join(dailies) or 'nenhum'})", "",
           "## 2. Incidentes da semana", ""]
    out += [f"- {i['incident_id']} {i['severity']} {i['type']} — {i['status']}" for i in inc] or ["- Nenhum."]
    out += ["", "## 3. Human Review", "",
            f"- Aguardando: {sum(1 for i in hr if i['status'] == 'WAITING_REVIEW')}",
            f"- Decididos na semana: {len(decided)}"]
    out += [f"  - {i['review_id']} → {i['status']} ({i['decision']['decision_ref']})" for i in decided]
    out += ["", "## 4. Resultados", ""]
    for m in files["RESULTS.json"]["site"] + files["RESULTS.json"]["video"]:
        out.append(f"- {m['metric']}: {_m(m)}")
    out.append(f"- HISTORICAL_CONTEXT_VALUE: {_m(hcv)} (avaliações: {hcv['evaluated_count']})")
    out += ["", "## 5. Engenharia (backlog aberto P0/P1)", ""]
    out += [f"- {b['id']} [{b['priority']}] {b['title']}" for b in files["ENGINEERING.json"]["backlog"]
            if b["status"] == "OPEN" and b["priority"] in ("P0", "P1")] or ["- Nenhum."]
    out.append("")
    _write_report(f"weekly/{year}-W{week:02d}.md", "\n".join(out))


def report_review_brief(files):
    cs = files["CURRENT_STATE.json"]
    waiting = [i for i in files["HUMAN_REVIEW_QUEUE.json"]["items"] if i["status"] == "WAITING_REVIEW"]
    fm = _front({"report_type": "HUMAN_REVIEW_BRIEF", "contract_version": "v1",
                 "operational_date": cs["operational_date"], "generated_at": iso(now_utc()),
                 "waiting_count": len(waiting)})
    out = [fm, "", f"# HUMAN_REVIEW_BRIEF — {cs['operational_date']}", ""]
    if not waiting:
        out.append("Nenhum item aguardando revisão.")
    for i in waiting:
        rc = i["rhr_context"]
        out += [f"## {i['review_id']} — {i['title']}", "",
                f"- História: `{i['story_id']}` · Motivo: {i['review_reason']} · Criado: {i['created_at']}",
                f"- Flags: {', '.join(i['flags']) or '—'}", "",
                f"**Alegação:** {i['claim_summary']}", "",
                f"**Evidência:** {i['evidence_summary'] or '—'}", "",
                f"**Contraevidência:** {i['counter_evidence_summary'] or '—'}", "",
                f"**RHR:** warranted={rc['rhr_warranted']} · executed={rc['rhr_executed']} · resultado={rc['result']}"
                + (f" — {rc.get('summary')}" if rc.get("summary") else ""), "",
                "**Fontes:**"]
        out += [f"- [{s['title']}]({s['url']})" for s in i["sources"]] or ["- —"]
        out += ["", "**Ações:** APPROVE · REQUEST CHANGES · HOLD · REJECT (via Issue `human-gate`)", ""]
    _write_report(f"human-review/{cs['operational_date']}.md", "\n".join(out) + "\n")


def report_incident(files, iid):
    it = next((i for i in files["INCIDENTS.json"]["items"] if i["incident_id"] == iid), None)
    if not it:
        die(f"incidente {iid} não encontrado")
    fm = _front({"report_type": "INCIDENT_REPORT", "contract_version": "v1",
                 "incident_id": iid, "component": it["component"], "type": it["type"],
                 "severity": it["severity"], "status": it["status"], "generated_at": iso(now_utc())})
    out = [fm, "", f"# INCIDENT_REPORT — {iid}", "",
           f"- Início: {it['timestamp']}", f"- Componente: {it['component']}",
           f"- Tipo: {it['type']} · Severidade: {it['severity']} · Status: {it['status']}", "",
           "## Descrição", "", it["description"], "", "## Impacto", "", it["impact"], "",
           "## Resolução", "", it.get("resolution") or "Em aberto.", "",
           f"Evidência: {it.get('evidence_url') or '—'}", ""]
    _write_report(f"incidents/{iid}.md", "\n".join(out))


def cmd_report(args):
    files = load_all()
    if args.kind == "daily":
        report_daily(files)
    elif args.kind == "weekly":
        report_weekly(files)
    elif args.kind == "review-brief":
        report_review_brief(files)
    elif args.kind == "incident":
        if not args.id:
            die("--id obrigatório")
        report_incident(files, args.id)


# ---------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description="Desmentindo Control Plane CLI")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate")
    sub.add_parser("sync")

    lk = sub.add_parser("lock")
    lk.add_argument("action", choices=["acquire", "release", "status"])
    lk.add_argument("routine", nargs="?")
    lk.add_argument("--holder", default="claude-code")
    lk.add_argument("--run-id")
    lk.add_argument("--ttl", type=int)
    lk.add_argument("--force", action="store_true")

    do = sub.add_parser("day-open")
    do.add_argument("date", nargs="?")
    do.add_argument("--force", action="store_true")

    rt = sub.add_parser("routine")
    rt.add_argument("action", choices=["start", "finish"])
    rt.add_argument("routine")
    rt.add_argument("--run-id", required=True)
    rt.add_argument("--status")
    rt.add_argument("--summary")
    rt.add_argument("--commit")

    hs = sub.add_parser("health")
    hs.add_argument("action", choices=["set"])
    hs.add_argument("component")
    hs.add_argument("--status", required=True, choices=["HEALTHY", "DEGRADED", "FAILED", "UNKNOWN", "NOT_CONFIGURED"])
    for f in ("summary", "last-success", "last-failure", "next-run", "last-result", "error-summary", "evidence-url"):
        hs.add_argument(f"--{f}")
    hs.add_argument("--duration", type=float)

    pp = sub.add_parser("pipeline")
    pp.add_argument("action", choices=["set"])
    pp.add_argument("stage")
    pp.add_argument("--state", required=True, choices=["MEASURED", "UNKNOWN", "NOT_EXECUTED", "NOT_AVAILABLE", "NOT_CONFIGURED", "QUERY_UNAVAILABLE", "FAILED"])
    pp.add_argument("--value", type=float)
    pp.add_argument("--source")
    pp.add_argument("--note")

    ic = sub.add_parser("incident")
    ic.add_argument("action", choices=["open", "update"])
    ic.add_argument("id", nargs="?")
    ic.add_argument("--component")
    ic.add_argument("--type")
    ic.add_argument("--severity")
    ic.add_argument("--description")
    ic.add_argument("--impact")
    ic.add_argument("--by", default="claude-code")
    ic.add_argument("--evidence-url")
    ic.add_argument("--status", choices=["OPEN", "MITIGATED", "RESOLVED"], default="RESOLVED")
    ic.add_argument("--resolution")

    rv = sub.add_parser("review")
    rv.add_argument("action", choices=["add", "decide"])
    rv.add_argument("id", nargs="?")
    rv.add_argument("--file")
    rv.add_argument("--status", choices=["APPROVED", "CHANGES_REQUESTED", "HOLD", "REJECTED"])
    rv.add_argument("--by")
    rv.add_argument("--ref")
    rv.add_argument("--notes")

    hv = sub.add_parser("hcv")
    hv.add_argument("action", choices=["add"])
    hv.add_argument("--story-id", required=True)
    hv.add_argument("--by", required=True)
    hv.add_argument("--rhr-executed", action="store_true")
    hv.add_argument("--verdict", required=True, choices=["USEFUL", "NOT_USEFUL", "NOT_APPLICABLE"])
    hv.add_argument("--justification", required=True)

    rp = sub.add_parser("report")
    rp.add_argument("kind", choices=["daily", "weekly", "review-brief", "incident"])
    rp.add_argument("--id")

    args = p.parse_args()
    # argparse maps --last-success -> last_success etc.
    handlers = {"validate": cmd_validate, "sync": cmd_sync, "lock": cmd_lock,
                "day-open": cmd_day_open, "routine": cmd_routine, "health": cmd_health,
                "pipeline": cmd_pipeline, "incident": cmd_incident, "review": cmd_review,
                "hcv": cmd_hcv, "report": cmd_report}
    if args.cmd == "incident":
        if args.action == "open" and not all([args.component, args.type, args.severity, args.description, args.impact]):
            die("incident open exige --component --type --severity --description --impact")
        if args.action == "update" and not args.id:
            die("incident update exige id")
    if args.cmd == "review":
        if args.action == "add" and not args.file:
            die("review add exige --file")
        if args.action == "decide" and not (args.id and args.status and args.by and args.ref):
            die("review decide exige id --status --by --ref")
    if args.cmd == "routine" and args.action == "finish" and not args.status:
        die("routine finish exige --status")
    if args.cmd == "lock" and args.action == "acquire" and not args.routine:
        die("lock acquire exige a rotina")
    handlers[args.cmd](args)


if __name__ == "__main__":
    main()
