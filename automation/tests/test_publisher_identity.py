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
        i = self.s.index("- name: PR do Publisher só altera caminhos publicáveis")
        self.step = self.s[i:self.s.index("- name:", i + 10)]

    def test_guard_runs_first_and_only_for_publisher_prs(self):
        steps = re.findall(r"^      - (?:name: (.+)|uses: (.+))$", self.s, re.M)
        self.assertEqual(steps[0][1], "actions/checkout@v4")
        self.assertTrue(steps[1][0].startswith("PR do Publisher só altera caminhos publicáveis"))
        self.assertIn("startsWith(github.head_ref, 'publisher/')", self.step)
        self.assertIn("exit 1", self.step)

    def test_guard_mirrors_runtime_allowlist(self):
        allowed = re.search(r"\n\s+(data/\*.*?)\) ok=1 ;;", self.step).group(1).split("|")
        self.assertEqual(sorted(allowed), sorted([p + "*" for p in P.ALLOWLIST_PREFIXES] + P.ALLOWLIST_EXACT))
        forbidden = re.search(r"\n\s+(\*\.github/\*.*?)\) ok=0 ;;", self.step).group(1).split("|")
        self.assertEqual(sorted(forbidden), sorted(f"*{x}*" for x in P.FORBIDDEN_SUBSTRINGS))


if __name__ == "__main__":
    unittest.main()
