#!/usr/bin/env python3
"""
Desmentindo Publisher -- unattended runtime (PR-gated).

Runs inside GitHub Actions only (schedule: hourly, and workflow_dispatch).
Discovers Publication Candidates in the Dropbox Vault production outbox,
independently re-validates every one (never trusts upstream flags), and
for each valid candidate opens or updates a Pull Request against `main`
in this same checkout, using the ephemeral GITHUB_TOKEN / `gh` CLI that
GitHub Actions already provisions (no external PAT is used or required
here, so there is no persistent-PAT dependency).

THIS SCRIPT NEVER MERGES A PULL REQUEST AND NEVER PUSHES DIRECTLY TO
`main`. Publication to production only happens when a human merges the
PR on GitHub. This is a hard architectural rule, not a soft default --
there is no code path in this file that calls `gh pr merge` or pushes to
`refs/heads/main`.

Fail-closed globally: any unexpected condition or exception aborts
processing of that candidate (or the whole run) with NO branch, NO PR,
NO lifecycle move. Nothing is ever force-pushed to `main` and `main` is
never rewritten by this script at all -- only bot-owned deterministic
feature branches are created/updated (force-push allowed there only,
since each branch is fully regenerated from the same candidate content
every time).
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DROPBOX_APP_KEY = os.environ.get("DROPBOX_APP_KEY", "")
DROPBOX_APP_SECRET = os.environ.get("DROPBOX_APP_SECRET", "")
DROPBOX_REFRESH_TOKEN = os.environ.get("DROPBOX_REFRESH_TOKEN", "")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "")  # "owner/repo"

VAULT_ROOT = "/Vault - Desmentindo/_PUBLICATION"
OUTBOX = f"{VAULT_ROOT}/outbox"
CONSUMED = f"{VAULT_ROOT}/consumed"
REJECTED = f"{VAULT_ROOT}/rejected"
MANIFESTS = f"{VAULT_ROOT}/manifests"
LEDGER_PATH = f"{MANIFESTS}/PRODUCTION_IDEMPOTENCY_LEDGER.json"
STATUS_PATH = f"{MANIFESTS}/PUBLISHER_STATUS_LIVE.json"

ALLOWLIST_PREFIXES = ["data/", "img/", "js/"]
ALLOWLIST_EXACT = ["index.html", "desmentindo_local.html"]
FORBIDDEN_SUBSTRINGS = [".github/", "workflow", "secret", "credential",
                        "publisher_runtime.py", "deploy-locaweb"]

# Closed list, must be kept in lockstep with
# corpus_integration/DESMENTINDO_AUTO_PRODUCTION_ELIGIBILITY_v1.md in the
# Project. Never widen this here without updating that doc first.
AUTO_UPDATE_ELIGIBLE_CLASSES = {
    "provenance_update", "source_metadata_update", "timestamp_correction",
    "technical_correction", "availability_state_update",
    "current_superseded_bookkeeping", "approved_corpus_index_update",
}

RUN_STARTED = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def log(msg):
    print(f"[publisher] {msg}", flush=True)


def fail_closed(reason):
    log(f"FAIL_CLOSED: {reason}")


class Aborted(Exception):
    pass


# ---------------------------------------------------------------------
# Dropbox (raw HTTP, stdlib only -- no extra pip dependency to install)
# ---------------------------------------------------------------------

def dropbox_access_token():
    if not (DROPBOX_APP_KEY and DROPBOX_APP_SECRET and DROPBOX_REFRESH_TOKEN):
        raise Aborted(
            "Missing one or more required secrets: DROPBOX_APP_KEY, "
            "DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN. No Dropbox call "
            "attempted."
        )
    # Non-sensitive diagnostic: log only the length of the refresh token as
    # received by this process, to detect truncation/corruption introduced
    # between GitHub Secrets and this runtime without ever logging the
    # value itself.
    log(f"DROPBOX_REFRESH_TOKEN length as received: {len(DROPBOX_REFRESH_TOKEN)}")
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": DROPBOX_REFRESH_TOKEN,
        "client_id": DROPBOX_APP_KEY,
        "client_secret": DROPBOX_APP_SECRET,
    }).encode()
    req = urllib.request.Request(
        "https://api.dropbox.com/oauth2/token", data=data, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        # Dropbox's error body is a small JSON object like
        # {"error": "invalid_grant", "error_description": "..."} -- it never
        # echoes back the secret values, so this is safe to log/report.
        body = e.read().decode(errors="replace")[:500]
        raise Aborted(f"Dropbox token refresh HTTP {e.code}: {body}")
    except Exception as e:
        raise Aborted(f"Dropbox token refresh request failed: {type(e).__name__}: {e}")
    token = payload.get("access_token")
    if not token:
        raise Aborted(f"Dropbox token refresh returned no access_token. "
                       f"Response keys: {list(payload.keys())}")
    return token


def dbx_call(access_token, endpoint, body):
    req = urllib.request.Request(
        f"https://api.dropboxapi.com/2/{endpoint}",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def dbx_download(access_token, path):
    req = urllib.request.Request(
        "https://content.dropboxapi.com/2/files/download",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Dropbox-API-Arg": json.dumps({"path": path}),
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def dbx_upload_overwrite(access_token, path, content_bytes):
    req = urllib.request.Request(
        "https://content.dropboxapi.com/2/files/upload",
        data=content_bytes,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Dropbox-API-Arg": json.dumps({
                "path": path, "mode": "overwrite", "mute": True,
            }),
            "Content-Type": "application/octet-stream",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def dbx_move(access_token, from_path, to_path):
    return dbx_call(access_token, "files/move_v2", {
        "from_path": from_path, "to_path": to_path, "autorename": True,
    })


def dbx_list_folder(access_token, path):
    try:
        result = dbx_call(access_token, "files/list_folder", {"path": path})
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "not_found" in body:
            return []
        raise
    entries = result.get("entries", [])
    while result.get("has_more"):
        result = dbx_call(access_token, "files/list_folder/continue",
                           {"cursor": result["cursor"]})
        entries.extend(result.get("entries", []))
    return [e for e in entries if e.get(".tag") == "file"]


def dbx_try_download_json(access_token, path, default):
    try:
        raw = dbx_download(access_token, path)
        return json.loads(raw.decode())
    except Exception:
        return default


# ---------------------------------------------------------------------
# Git / gh helpers (operate on the already-checked-out repo)
# ---------------------------------------------------------------------

def run(*args, check=True, timeout=60):
    return subprocess.run(list(args), check=check, capture_output=True,
                           text=True, timeout=timeout)


def git(*args, check=True):
    return run("git", *args, check=check)


def gh(*args, check=True):
    return run("gh", *args, check=check)


def sanitize_branch_component(s):
    s = re.sub(r"[^A-Za-z0-9._-]", "-", s or "")
    s = re.sub(r"-{2,}", "-", s).strip("-.")
    return s or "x"


def branch_name_for(candidate_id, version):
    return (f"publisher/{sanitize_branch_component(candidate_id)}/"
            f"{sanitize_branch_component(str(version))}")


def current_main_head():
    git("fetch", "origin", "main")
    return git("rev-parse", "origin/main").stdout.strip()


def remote_branch_head(branch):
    r = git("ls-remote", "origin", f"refs/heads/{branch}", check=False)
    line = r.stdout.strip()
    return line.split("\t")[0] if line else None


def open_pr_for_branch(branch):
    r = gh("pr", "list", "--head", branch, "--state", "open",
           "--json", "number,url,body", check=False)
    if r.returncode != 0:
        return None
    items = json.loads(r.stdout or "[]")
    return items[0] if items else None


def pr_status(number):
    r = gh("pr", "view", str(number), "--json",
           "state,mergedAt,mergeCommit,url,headRefName", check=False)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout)


# ---------------------------------------------------------------------
# Candidate validation (independent re-validation)
# ---------------------------------------------------------------------

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_and_materialize(candidate, repo_root):
    """Returns (ok: bool, reason: str). Writes files on disk only if ok."""
    required = ["candidate_id", "version", "status", "human_gate",
                "content_hash", "target_files", "expected_base_commit",
                "idempotency_key"]
    for f in required:
        if f not in candidate:
            return False, f"MISSING_FIELD:{f}"

    status = candidate["status"]
    gate = candidate.get("human_gate", {})

    if status == "APPROVED":
        if not (gate.get("required") is True and gate.get("approved") is True
                and gate.get("approved_at") and gate.get("approved_by")):
            return False, "HUMAN_GATE_NOT_SATISFIED"
    elif status == "AUTO_UPDATE_ELIGIBLE":
        obj_type = (candidate.get("provenance", {}).get("object_type")
                    or candidate.get("source_state", {}).get("object_type"))
        if obj_type not in AUTO_UPDATE_ELIGIBLE_CLASSES:
            return False, f"NOT_IN_AUTO_UPDATE_ELIGIBLE_CLASSES:{obj_type}"
    else:
        return False, f"STATUS_NOT_PUBLISHABLE:{status}"

    manifest_lines = []
    for tf in candidate["target_files"]:
        path = tf.get("path", "")
        if not any(path.startswith(p) for p in ALLOWLIST_PREFIXES) and \
           path not in ALLOWLIST_EXACT:
            return False, f"TARGET_NOT_IN_ALLOWLIST:{path}"
        if any(bad in path for bad in FORBIDDEN_SUBSTRINGS):
            return False, f"FORBIDDEN_TARGET:{path}"
        try:
            raw = base64.b64decode(tf["content_base64"])
        except Exception:
            return False, f"BAD_BASE64:{path}"
        actual_sha = sha256_hex(raw)
        if actual_sha != tf.get("content_sha256"):
            return False, f"HASH_MISMATCH:{path}"
        manifest_lines.append(f"{path}:{actual_sha}")

    manifest_str = "\n".join(sorted(manifest_lines))
    computed_content_hash = "sha256:" + sha256_hex(manifest_str.encode())
    declared = candidate["content_hash"]
    if not declared.startswith("sha256:"):
        declared = "sha256:" + declared
    if computed_content_hash != declared:
        return False, "CONTENT_HASH_MISMATCH"

    for tf in candidate["target_files"]:
        full_path = os.path.join(repo_root, tf["path"])
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as fh:
            fh.write(base64.b64decode(tf["content_base64"]))

    return True, "OK"


def diff_matches_exactly(expected_paths):
    git("add", "-A")
    r = git("diff", "--cached", "--name-only")
    changed = sorted(p for p in r.stdout.strip().splitlines() if p)
    expected = sorted(expected_paths)
    if changed != expected:
        return False, changed
    return True, changed


def pr_body_for(candidate, idem_key):
    gate = candidate.get("human_gate", {})
    lines = [
        f"**candidate_id:** `{candidate.get('candidate_id')}`",
        f"**version:** `{candidate.get('version')}`",
        f"**status:** `{candidate.get('status')}`",
        f"**idempotency_key:** `{idem_key}`",
        f"**expected_base_commit:** `{candidate.get('expected_base_commit')}`",
        f"**human_gate.required:** `{gate.get('required')}`",
        f"**human_gate.approved:** `{gate.get('approved')}`",
        f"**human_gate.approved_by:** `{gate.get('approved_by')}`",
        f"**human_gate.approved_at:** `{gate.get('approved_at')}`",
        "",
        "This PR was opened automatically by the Desmentindo Publisher "
        "workflow (hourly schedule + workflow_dispatch). It has passed "
        "independent schema, eligibility, hash, and allowlist validation.",
        "",
        "**AUTO-MERGE IS DISABLED FOR THIS REPOSITORY'S PUBLISHER.** "
        "This PR will not be merged by any automation. A human must "
        "review and merge it for this content to go live on "
        "desmentindo.com.br.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------
# Postdeploy QA (best-effort; runs on the Actions runner, which has
# normal internet access)
# ---------------------------------------------------------------------

def postdeploy_quick_check():
    try:
        req = urllib.request.Request("https://desmentindo.com.br/",
                                      method="GET")
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status == 200
    except Exception as e:
        log(f"postdeploy_quick_check: could not verify live site: {e}")
        return None  # unknown, not a hard failure


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------

def main():
    repo_root = os.getcwd()
    log(f"run started at {RUN_STARTED} repo={GITHUB_REPOSITORY}")

    status = {
        "automation_enabled": True,
        "workflow_path": ".github/workflows/desmentindo-publisher.yml",
        "schedule_cron": "0 * * * *",
        "schedule_timezone_note": "cron is UTC; operational reference tz is America/Sao_Paulo",
        "github_runtime_auth": "GITHUB_TOKEN",
        "persistent_pat_dependency": False,
        "auto_merge": "FORBIDDEN_BY_DESIGN",
        "last_run_at": RUN_STARTED,
        "last_result": "UNKNOWN",
        "pending_count": 0,
        "validated_count": 0,
        "pr_created_count": 0,
        "pr_updated_count": 0,
        "awaiting_human_count": 0,
        "merged_count": 0,
        "deployed_count": 0,
        "consumed_count": 0,
        "rejected_count": 0,
        "stale_count": 0,
        "failed_count": 0,
        "last_successful_deploy": None,
        "errors": [],
    }

    try:
        token = dropbox_access_token()
    except Aborted as e:
        fail_closed(str(e))
        status["last_result"] = "DROPBOX_AUTH_FAILED"
        status["dropbox_runtime_auth"] = "BLOCKED"
        status["errors"].append(str(e))
        _best_effort_write_status(None, status)
        sys.exit(1)

    status["dropbox_runtime_auth"] = "READY"

    ledger = dbx_try_download_json(
        token, LEDGER_PATH,
        {"processed_idempotency_keys": [], "pr_tracking": {}})
    ledger.setdefault("processed_idempotency_keys", [])
    ledger.setdefault("pr_tracking", {})
    consumed_keys = {e["idempotency_key"] for e in
                     ledger["processed_idempotency_keys"]}

    # -----------------------------------------------------------------
    # Reconciliation pass: check previously-opened PRs for merge/close.
    # -----------------------------------------------------------------
    for idem_key, entry in list(ledger["pr_tracking"].items()):
        if entry.get("status") not in ("PR_CREATED", "AWAITING_HUMAN_APPROVAL"):
            continue
        number = entry.get("pr_number")
        if not number:
            continue
        info = pr_status(number)
        if info is None:
            log(f"reconcile {idem_key}: could not read PR #{number}, leaving as-is")
            continue
        if info.get("state") == "MERGED":
            merged_commit = (info.get("mergeCommit") or {}).get("oid")
            log(f"reconcile {idem_key}: PR #{number} MERGED as {merged_commit}")
            ok = postdeploy_quick_check()
            entry["status"] = "MERGED"
            entry["merged_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            entry["production_commit"] = merged_commit
            entry["postdeploy_quick_check"] = ok
            status["merged_count"] += 1
            if ok is not False:
                status["deployed_count"] += 1
                status["last_successful_deploy"] = entry["merged_at"]
            fname = entry.get("outbox_filename")
            if fname:
                try:
                    dbx_move(token, f"{OUTBOX}/{fname}",
                             f"{CONSUMED}/{fname}")
                    entry["status"] = "CONSUMED"
                    status["consumed_count"] += 1
                    ledger["processed_idempotency_keys"].append({
                        "idempotency_key": idem_key,
                        "candidate_id": entry.get("candidate_id"),
                        "outcome": "PUBLISHED_VIA_PR_MERGE",
                        "processed_at": entry["merged_at"],
                        "production_commit": merged_commit,
                        "pr_number": number,
                    })
                except Exception as e:
                    log(f"reconcile {idem_key}: merged but could not move to consumed/: {e}")
        elif info.get("state") == "CLOSED":
            log(f"reconcile {idem_key}: PR #{number} CLOSED without merge")
            entry["status"] = "REJECTED_BY_HUMAN"
            fname = entry.get("outbox_filename")
            if fname:
                try:
                    dbx_move(token, f"{OUTBOX}/{fname}",
                             f"{REJECTED}/{fname.rsplit('.', 1)[0]}_REJECTED_human_closed_pr.json")
                    status["rejected_count"] += 1
                except Exception as e:
                    log(f"reconcile {idem_key}: could not move to rejected/: {e}")
        else:
            status["awaiting_human_count"] += 1

    # -----------------------------------------------------------------
    # Discovery pass
    # -----------------------------------------------------------------
    try:
        candidates = dbx_list_folder(token, OUTBOX)
    except Exception as e:
        fail_closed(f"could not list outbox: {e}")
        status["last_result"] = "OUTBOX_LIST_FAILED"
        status["errors"].append(str(e))
        _best_effort_write_status(token, status)
        sys.exit(1)

    status["production_outbox"] = "ACTIVE"
    status["pending_count"] = len(candidates)

    if not candidates:
        log("NO_PENDING_CANDIDATES")
        status["last_result"] = "NO_PENDING_CANDIDATES"
        _best_effort_write_status(token, status)
        _best_effort_write_ledger(token, ledger)
        sys.exit(0)

    loaded = []
    for entry in candidates:
        try:
            raw = dbx_download(token, f"{OUTBOX}/{entry['name']}")
            cand = json.loads(raw.decode())
        except Exception as e:
            log(f"skip unreadable candidate {entry['name']}: {e}")
            continue
        loaded.append((entry["name"], cand))
    loaded.sort(key=lambda x: (x[1].get("created_at", ""), x[1].get("candidate_id", "")))

    for fname, candidate in loaded:
        cid = candidate.get("candidate_id", fname)
        idem_key = candidate.get("idempotency_key", "")
        log(f"--- processing {cid} ---")

        if idem_key in consumed_keys:
            log(f"{cid}: already CONSUMED, skipping")
            continue

        existing = ledger["pr_tracking"].get(idem_key)
        if existing and existing.get("status") in (
                "PR_CREATED", "AWAITING_HUMAN_APPROVAL"):
            log(f"{cid}: PR already open (#{existing.get('pr_number')}), "
                f"content unchanged (same idempotency_key) -- skipping")
            continue

        git("checkout", "main", check=False)
        git("reset", "--hard", "origin/main")
        head = current_main_head()
        expected_base = candidate.get("expected_base_commit")
        if expected_base != head:
            log(f"{cid}: STALE_BASE (expected {expected_base}, main is {head}) "
                f"-- left in outbox for reevaluation")
            status["stale_count"] += 1
            try:
                dbx_upload_overwrite(
                    token, f"{MANIFESTS}/STALE_{cid}_{RUN_STARTED.replace(':','')}.json",
                    json.dumps({"candidate_id": cid, "reason": "STALE_BASE",
                                "expected_base": expected_base, "actual_main_head": head,
                                "at": RUN_STARTED}, indent=2).encode())
            except Exception:
                pass
            continue

        ok, reason = validate_and_materialize(candidate, repo_root)
        if not ok:
            log(f"{cid}: REJECTED ({reason}) -- no branch/PR")
            status["failed_count"] += 1
            try:
                dbx_move(token, f"{OUTBOX}/{fname}",
                         f"{REJECTED}/{fname.rsplit('.', 1)[0]}_REJECTED_{reason.split(':')[0]}.json")
                status["rejected_count"] += 1
            except Exception as e:
                log(f"{cid}: could not move to rejected/: {e}")
            continue

        status["validated_count"] += 1

        expected_paths = [tf["path"] for tf in candidate["target_files"]]
        matches, changed = diff_matches_exactly(expected_paths)
        if not matches:
            fail_closed(f"{cid}: UNEXPECTED_DIFF (got {changed}, expected {expected_paths}) "
                        f"-- aborting, discarding working tree changes")
            status["failed_count"] += 1
            git("checkout", "main", check=False)
            git("reset", "--hard", "origin/main")
            continue

        branch = branch_name_for(cid, candidate.get("version"))
        git("checkout", "-B", branch)
        subprocess.run(["git", "-c", "user.name=Desmentindo Publisher",
                        "-c", "user.email=publisher@desmentindo.local",
                        "commit", "-m",
                        f"auto(publisher): {cid}\n\n"
                        f"idempotency_key: {idem_key}\n"
                        f"expected_base_commit: {expected_base}\n"
                        f"Opened automatically by the Desmentindo Publisher workflow.\n"
                        f"Requires human review and merge -- not auto-merged.\n"],
                       check=True, capture_output=True, text=True)
        push = run("git", "push", "--force", "origin", f"HEAD:refs/heads/{branch}",
                   check=False)
        if push.returncode != 0:
            fail_closed(f"{cid}: BRANCH_PUSH_FAILED: {push.stderr.strip()[:2000]}")
            status["failed_count"] += 1
            git("checkout", "main", check=False)
            git("reset", "--hard", "origin/main")
            continue

        body = pr_body_for(candidate, idem_key)
        existing_pr = open_pr_for_branch(branch)
        if existing_pr:
            pr_number = existing_pr["number"]
            gh("pr", "edit", str(pr_number), "--body", body, check=False)
            log(f"{cid}: updated existing PR #{pr_number}")
            status["pr_updated_count"] += 1
        else:
            create = gh("pr", "create", "--base", "main", "--head", branch,
                        "--title", f"auto(publisher): {cid} ({candidate.get('version')})",
                        "--body", body, check=False)
            if create.returncode != 0:
                fail_closed(f"{cid}: PR_CREATE_FAILED: {create.stderr.strip()[:2000]}")
                status["failed_count"] += 1
                continue
            pr_url = create.stdout.strip()
            m = re.search(r"/pull/(\d+)", pr_url)
            pr_number = int(m.group(1)) if m else None
            log(f"{cid}: opened PR #{pr_number} ({pr_url})")
            status["pr_created_count"] += 1

        ledger["pr_tracking"][idem_key] = {
            "candidate_id": cid,
            "idempotency_key": idem_key,
            "branch": branch,
            "pr_number": pr_number,
            "status": "AWAITING_HUMAN_APPROVAL",
            "expected_base_commit": expected_base,
            "outbox_filename": fname,
            "created_at": RUN_STARTED,
        }
        status["awaiting_human_count"] += 1

        git("checkout", "main", check=False)
        git("reset", "--hard", "origin/main")

    status["last_result"] = "OK"
    _best_effort_write_status(token, status)
    _best_effort_write_ledger(token, ledger)
    log("run complete")


def _best_effort_write_status(token, status):
    if token is None:
        return
    try:
        dbx_upload_overwrite(token, STATUS_PATH,
                              json.dumps(status, indent=2).encode())
    except Exception as e:
        log(f"WARNING -- could not write status manifest: {e}")


def _best_effort_write_ledger(token, ledger):
    try:
        dbx_upload_overwrite(token, LEDGER_PATH,
                              json.dumps(ledger, indent=2).encode())
    except Exception as e:
        log(f"WARNING -- could not update ledger: {e}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Last-resort catch-all: fail closed with a clean, readable message
        # instead of a raw traceback. No branch/PR/main write happens after
        # this point since we're already unwinding out of main().
        import traceback
        fail_closed(f"UNHANDLED_EXCEPTION: {type(e).__name__}: {e}")
        traceback.print_exc()
        sys.exit(1)
