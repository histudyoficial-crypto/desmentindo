"""Publisher schedule: cron off minute 0, kept in lockstep with the runtime, and the gap since the previous run.

    python3 -m unittest discover -s automation/tests -v
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import publisher_runtime as P  # noqa: E402

WORKFLOW = os.path.join(os.path.dirname(__file__), "..", "..", ".github", "workflows", "desmentindo-publisher.yml")


class CronTest(unittest.TestCase):
    def setUp(self):
        with open(WORKFLOW, encoding="utf-8") as fh:
            self.crons = re.findall(r"cron:\s*'([^']+)'", fh.read())

    def test_single_hourly_cron_off_the_top_of_the_hour(self):
        self.assertEqual(len(self.crons), 1)
        minute, hour, *_ = self.crons[0].split()
        self.assertEqual(hour, "*")
        self.assertNotEqual(minute, "0")

    def test_runtime_status_matches_workflow(self):
        self.assertEqual(self.crons[0], P.SCHEDULE_CRON)


class GapTest(unittest.TestCase):
    def test_on_time(self):
        g = P.schedule_gap({"last_run_at": "2026-10-19T07:17:05Z"}, "2026-10-19T08:18:40Z")
        self.assertEqual((g["gap_minutes"], g["schedule_delayed"]), (62, False))

    def test_delay_of_19_10_is_flagged(self):
        g = P.schedule_gap({"last_run_at": "2026-10-19T07:36:09Z"}, "2026-10-19T14:56:12Z")
        self.assertEqual((g["gap_minutes"], g["schedule_delayed"]), (440, True))

    def test_threshold_is_strict(self):
        self.assertFalse(P.schedule_gap({"last_run_at": "2026-10-19T10:00:00Z"}, "2026-10-19T11:30:00Z")["schedule_delayed"])
        self.assertTrue(P.schedule_gap({"last_run_at": "2026-10-19T10:00:00Z"}, "2026-10-19T11:31:00Z")["schedule_delayed"])

    def test_unknown_previous_run_is_not_an_alarm(self):
        for prev in (None, {}, {"last_run_at": "x"}):
            g = P.schedule_gap(prev, "2026-10-19T11:31:00Z")
            self.assertEqual((g["gap_minutes"], g["schedule_delayed"]), (None, False))


if __name__ == "__main__":
    unittest.main()
