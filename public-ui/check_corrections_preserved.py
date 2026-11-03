#!/usr/bin/env python3
"""Correção publicada não some (desmentindo#111, 29/10/2026): toda nota `correction` que existe em data/editorial na
base tem de continuar, idêntica, depois da mudança. Contar não basta (A→B passaria): compara o texto de cada nota.

    python3 public-ui/check_corrections_preserved.py <ref-base> [<ref-depois>]   # sem o 2º: árvore de trabalho
Correção só sai por novo Human Gate registrado no repositório privado; aqui o PR falha fechado.
"""
import json
import subprocess
import sys

ROOT = "data/editorial"


def _git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True, check=True).stdout


def _files(ref):
    out = _git("ls-tree", "-r", "--name-only", ref, "--", ROOT) if ref else \
        _git("ls-files", "--", ROOT)
    return [p for p in out.splitlines() if p.endswith(".json") and not p.endswith("index.json")]


def _read(ref, path):
    try:
        raw = _git("show", f"{ref}:{path}") if ref else open(path, encoding="utf-8").read()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    try:
        return json.loads(raw)
    except ValueError:
        return None


def corrections(obj):
    if isinstance(obj, dict):
        own = [json.dumps(obj["correction"], ensure_ascii=False, sort_keys=True)] if "correction" in obj else []
        return own + [x for v in obj.values() for x in corrections(v)]
    if isinstance(obj, list):
        return [x for v in obj for x in corrections(v)]
    return []


def check(base, head=None):
    lost = []
    for path in _files(base):
        before = corrections(_read(base, path))
        if not before:
            continue
        after = corrections(_read(head, path))
        missing = list(before)
        for x in after:
            if x in missing:
                missing.remove(x)
        if missing:
            lost.append((path, len(missing)))
    return lost


def main():
    if len(sys.argv) < 2:
        print("uso: check_corrections_preserved.py <ref-base> [<ref-depois>]", file=sys.stderr)
        return 2
    lost = check(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    for path, n in lost:
        print(f"CORRECTION_DROPPED: {path} perde {n} nota(s) de correção publicada(s)")
    print("CORRECTIONS_PRESERVED=" + ("NO" if lost else "YES"))
    return 1 if lost else 0


if __name__ == "__main__":
    sys.exit(main())
