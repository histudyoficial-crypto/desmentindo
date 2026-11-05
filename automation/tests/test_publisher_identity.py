"""Identidade dos PRs do Publisher e escopo dos PRs na CI (04/11/2026).

PR aberto com o GITHUB_TOKEN deixa a CI em `action_required` até aprovação manual. O workflow passa a usar, quando
configurado, o token efêmero de um GitHub App dedicado (só Contents + Pull requests), e a CI recusa PR do Publisher
fora da allowlist antes de rodar qualquer script do PR. Testes só de texto (sem dependência de YAML).

    python3 -m unittest discover -s automation/tests -v
"""
import importlib
import os
import re
import sys
import unittest

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, ".."))
import publisher_runtime as P  # noqa: E402

WF = os.path.join(HERE, "..", "..", ".github", "workflows")


def read(name):
    with open(os.path.join(WF, name), encoding="utf-8") as fh:
        return fh.read()


class PublisherWorkflow(unittest.TestCase):
    def setUp(self):
        self.s = read("desmentindo-publisher.yml")

    def test_permissions_unchanged_and_minimal(self):
        perms = re.search(r"^permissions:\n((?:  .+\n)+)", self.s, re.M).group(1)
        self.assertEqual(sorted(l.strip() for l in perms.splitlines()), ["contents: write", "pull-requests: write"])
        self.assertNotRegex(self.s, r"actions:\s*write|workflows:")

    def test_app_token_is_optional_and_falls_back_to_github_token(self):
        self.assertIn("if: ${{ vars.PUBLISHER_APP_ID != '' }}", self.s)
        self.assertIn("uses: actions/create-github-app-token@v1", self.s)
        self.assertIn("private-key: ${{ secrets.PUBLISHER_APP_PRIVATE_KEY }}", self.s)
        self.assertEqual(self.s.count("${{ steps.app.outputs.token || secrets.GITHUB_TOKEN }}"), 2)   # checkout + gh
        self.assertLess(self.s.index("id: app"), self.s.index("uses: actions/checkout@v4"))   # push usa o mesmo token

    def test_never_merges(self):
        self.assertNotRegex(self.s, r"pr merge|auto-merge|--admin")

    def test_runtime_reports_identity(self):
        os.environ.pop("PUBLISHER_AUTH", None)
        self.assertEqual(importlib.reload(P).PUBLISHER_AUTH, "GITHUB_TOKEN")
        os.environ["PUBLISHER_AUTH"] = "GITHUB_APP"
        try:
            self.assertEqual(importlib.reload(P).PUBLISHER_AUTH, "GITHUB_APP")
        finally:
            os.environ.pop("PUBLISHER_AUTH", None)
            importlib.reload(P)


class BoundaryScopeGuard(unittest.TestCase):
    def setUp(self):
        self.s = read("public-boundary.yml")
        i = self.s.index("- name: PR do Publisher só altera JSON editorial")
        self.step = self.s[i:self.s.index("- name:", i + 10)]

    def test_guard_runs_first_and_only_for_publisher_prs(self):
        steps = re.findall(r"^      - (?:name: (.+)|uses: (.+))$", self.s, re.M)
        self.assertEqual(steps[0][1], "actions/checkout@v4")
        self.assertTrue(steps[1][0].startswith("PR do Publisher só altera JSON editorial"))
        self.assertIn("startsWith(github.head_ref, 'publisher/')", self.step)
        self.assertIn("exit 1", self.step)

    def test_guard_is_strict_subset_of_runtime_allowlist(self):
        rx = re.search(r"grep -Eq '(\^data/editorial/.+?)'", self.step).group(1)
        self.assertTrue(rx.startswith("^data/editorial/") and rx.endswith("\\.json$"))
        self.assertIn("data/", P.ALLOWLIST_PREFIXES)                       # data/editorial/ ⊂ allowlist do runtime
        cases = {"data/editorial/fechamentos/2026-10-22.json": True, "data/editorial/videos/index.json": True,
                 "data/editorial/index.json": True, "js/app.js": False, "index.html": False, "img/x.png": False,
                 "data/editorial/x.js": False, "data/other/x.json": False, "data/editorial/../../.github/w.json": False,
                 ".github/workflows/x.yml": False, "data/editorial/Fechamentos/X.json": False}
        for path, ok in cases.items():
            self.assertEqual(bool(re.fullmatch(rx.strip("^$"), path)), ok, path)

    def test_guard_requires_valid_json_without_running_pr_code(self):
        self.assertIn("python3 -I -c 'import json,sys; json.load(sys.stdin)'", self.step)
        self.assertIn('git show "$HEAD:$f"', self.step)

if __name__ == "__main__":
    unittest.main()
