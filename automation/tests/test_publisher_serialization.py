"""Serialization of Publisher PRs by public index (one open PR per index.json).

Runs without network: only the pure decision functions of publisher_runtime are exercised,
and a small scenario loop mirrors main() across runs (open PR -> human merge -> REFRESH_BASE).

    python3 -m unittest discover -s automation/tests -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import publisher_runtime as P  # noqa: E402

FX = "data/editorial/fechamentos/index.json"
VX = "data/editorial/videos/index.json"
AX = "data/editorial/index.json"


def cand(cid, base, *paths, key=None):
    return {"candidate_id": cid, "idempotency_key": key or f"{cid}:k", "expected_base_commit": base,
            "target_files": [{"path": p} for p in paths]}


def fechamento(day, base):
    return cand(f"PUB-FECHAMENTO-{day}", base, f"data/editorial/fechamentos/{day}.json", FX)


def videos(day, base):
    return cand(f"PUB-VIDEOS-{day}", base, f"data/editorial/videos/{day}.json", VX)


def agora(day, base):
    return cand(f"PUB-AGORA-{day}", base, f"data/editorial/edicoes/{day}.json", AX)


class World:
    """Outbox + ledger + public main, driven like main() / outbox_forward REFRESH_BASE."""

    def __init__(self, head="b0"):
        self.head, self.outbox, self.tracking, self.consumed, self.next_pr = head, [], {}, set(), 100

    def run(self):
        locks = P.index_locks(self.tracking)
        out = {}
        for c in sorted(self.outbox, key=lambda c: c["candidate_id"]):
            action, detail = P.decide(c, self.consumed, self.tracking, locks, self.head)
            out[c["candidate_id"]] = action
            if action != "PROCESS":
                continue
            paths = [tf["path"] for tf in c["target_files"]]
            self.next_pr += 1
            self.tracking[c["idempotency_key"]] = {"candidate_id": c["candidate_id"], "pr_number": self.next_pr,
                                                   "status": "AWAITING_HUMAN_APPROVAL",
                                                   "index_paths": P.index_paths(paths)}
            for p in P.index_paths(paths):
                locks.setdefault(p, {"pr_number": self.next_pr, "idempotency_key": c["idempotency_key"],
                                     "candidate_id": c["candidate_id"]})
        return out

    def merge(self, cid):
        key = next(k for k, e in self.tracking.items() if e["candidate_id"] == cid)
        self.tracking[key]["status"] = "CONSUMED"
        self.consumed.add(key)
        self.outbox = [c for c in self.outbox if c["idempotency_key"] != key]
        self.head = self.head + "+"

    def refresh_base(self):
        """ops outbox_forward REFRESH_BASE: same content and key, rebuilt on the current main."""
        for c in self.outbox:
            c["expected_base_commit"] = self.head

    def open_prs(self):
        return {e["candidate_id"] for e in self.tracking.values() if e["status"] in P.OPEN_PR_STATUSES}


class IndexPathsTest(unittest.TestCase):
    def test_only_index_files(self):
        self.assertEqual(P.index_paths(["data/editorial/fechamentos/2026-10-18.json", FX, FX, "index.json",
                                        "data/editorial/videos/2026-10-18.json"]), [FX, "index.json"])


class DecideTest(unittest.TestCase):
    def test_independent_queues_are_not_blocked(self):
        locks = {FX: {"pr_number": 72, "idempotency_key": "F17:k", "candidate_id": "F17"}}
        self.assertEqual(P.decide(videos("2026-10-18", "b0"), set(), {}, locks, "b0")[0], "PROCESS")
        self.assertEqual(P.decide(agora("2026-10-18", "b0"), set(), {}, locks, "b0")[0], "PROCESS")

    def test_same_index_waits_and_names_the_blocking_pr(self):
        locks = {FX: {"pr_number": 72, "idempotency_key": "F17:k", "candidate_id": "F17"}}
        action, detail = P.decide(fechamento("2026-10-18", "b0"), set(), {}, locks, "b0")
        self.assertEqual((action, detail["pr_number"], detail["index"]), ("WAIT_SERIALIZED", 72, FX))

    def test_existing_order_of_checks_is_kept(self):
        c = fechamento("2026-10-18", "old")
        locks = {FX: {"pr_number": 72, "idempotency_key": "F17:k", "candidate_id": "F17"}}
        self.assertEqual(P.decide(c, {c["idempotency_key"]}, {}, locks, "b0")[0], "SKIP_CONSUMED")
        tracking = {c["idempotency_key"]: {"status": "AWAITING_HUMAN_APPROVAL", "pr_number": 9}}
        self.assertEqual(P.decide(c, set(), tracking, locks, "b0"), ("SKIP_PR_OPEN", 9))
        self.assertEqual(P.decide(c, set(), {}, locks, "b0")[0], "STALE_BASE")

    def test_own_lock_does_not_block_its_own_candidate(self):
        c = fechamento("2026-10-18", "b0")
        locks = {FX: {"pr_number": 72, "idempotency_key": c["idempotency_key"], "candidate_id": c["candidate_id"]}}
        self.assertEqual(P.decide(c, set(), {}, locks, "b0")[0], "PROCESS")


class IndexLocksTest(unittest.TestCase):
    def test_only_open_prs_lock_and_legacy_entries_are_read_once(self):
        tracking = {"a": {"status": "AWAITING_HUMAN_APPROVAL", "pr_number": 70, "candidate_id": "A"},
                    "b": {"status": "CONSUMED", "pr_number": 71, "index_paths": [FX]},
                    "c": {"status": "REJECTED_BY_HUMAN", "pr_number": 69, "index_paths": [VX]}}
        calls = []
        files = lambda n: calls.append(n) or [AX, "data/editorial/edicoes/2026-10-16.json"]  # noqa: E731
        self.assertEqual(set(P.index_locks(tracking, files_of=files)), {AX})
        self.assertEqual(tracking["a"]["index_paths"], [AX])
        P.index_locks(tracking, files_of=files)
        self.assertEqual(calls, [70])

    def test_unreadable_legacy_pr_locks_nothing(self):
        tracking = {"a": {"status": "PR_CREATED", "pr_number": 70}}
        self.assertEqual(P.index_locks(tracking, files_of=lambda n: None), {})
        self.assertNotIn("index_paths", tracking["a"])


class ScenarioTest(unittest.TestCase):
    def test_backlog_of_fechamentos_is_published_one_by_one_without_conflict(self):
        w = World()
        w.outbox = [fechamento("2026-10-16", "b0"), fechamento("2026-10-17", "b0"), fechamento("2026-10-18", "b0"),
                    videos("2026-10-17", "b0"), videos("2026-10-18", "b0"), agora("2026-10-18", "b0")]
        r = w.run()
        # one PR per index; the other candidates of the same index wait in the outbox
        self.assertEqual(w.open_prs(), {"PUB-FECHAMENTO-2026-10-16", "PUB-VIDEOS-2026-10-17", "PUB-AGORA-2026-10-18"})
        self.assertEqual(r["PUB-FECHAMENTO-2026-10-17"], "WAIT_SERIALIZED")
        self.assertEqual(r["PUB-VIDEOS-2026-10-18"], "WAIT_SERIALIZED")
        self.assertEqual(len(w.outbox), 6)  # nothing moved, rejected or forgotten

        # a run before any merge changes nothing (idempotent)
        before = dict(w.tracking)
        w.run()
        self.assertEqual(w.tracking, before)

        published = []
        for _ in range(10):
            for cid in sorted(w.open_prs()):
                w.merge(cid)
                published.append(cid)
            stale = w.run()  # main moved: waiting candidates are STALE_BASE, no PR opened on an old base
            self.assertTrue(all(a in ("STALE_BASE",) for a in stale.values()), stale)
            self.assertFalse(w.open_prs())
            w.refresh_base()
            w.run()
            if not w.outbox:
                break
        self.assertEqual(sorted(published), sorted(["PUB-FECHAMENTO-2026-10-16", "PUB-FECHAMENTO-2026-10-17",
                                                    "PUB-FECHAMENTO-2026-10-18", "PUB-VIDEOS-2026-10-17",
                                                    "PUB-VIDEOS-2026-10-18", "PUB-AGORA-2026-10-18"]))
        self.assertLess(published.index("PUB-FECHAMENTO-2026-10-16"), published.index("PUB-FECHAMENTO-2026-10-17"))

    def test_pending_pr_from_before_the_change_is_respected(self):
        w = World()
        w.tracking["F17:k"] = {"candidate_id": "PUB-FECHAMENTO-2026-10-17", "pr_number": 71,
                               "status": "AWAITING_HUMAN_APPROVAL", "index_paths": [FX]}
        w.outbox = [fechamento("2026-10-18", "b0"), videos("2026-10-18", "b0")]
        r = w.run()
        self.assertEqual(r, {"PUB-FECHAMENTO-2026-10-18": "WAIT_SERIALIZED", "PUB-VIDEOS-2026-10-18": "PROCESS"})


if __name__ == "__main__":
    unittest.main()
