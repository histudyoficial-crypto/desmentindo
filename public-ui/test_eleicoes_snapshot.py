"""Snapshots da apuração: FIRST_RESULT → HOURLY (1 por hora) → FINAL só com tf=s; idempotente; null ≠ 0."""
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import eleicoes_snapshot as S  # noqa: E402

BRT = S.BRT


def raw(pst, ht, tf="n", votes=("100", "80")):
    # Formato do arquivo "dados-simplificados" do TSE (valores fictícios de teste).
    return {"dt": "04/10/2026", "ht": ht, "dg": "04/10/2026", "hg": ht, "tf": tf, "pst": pst, "st": "10", "s": "100",
            "c": "", "pc": None, "vb": "5", "pvb": "2,50", "tvn": "4", "ptvn": "2,00", "vv": "180",
            "cand": [{"seq": "1", "sqcand": "A1", "n": "11", "nm": "CANDIDATO A", "cc": "P1", "vap": votes[0], "pvap": "55,56", "st": ""},
                     {"seq": "2", "sqcand": "B2", "n": "22", "nm": "CANDIDATO B", "cc": "P2", "vap": votes[1], "pvap": "44,44", "st": ""}]}


def at(h, m):
    return dt.datetime(2026, 10, 4, h, m, tzinfo=BRT)


class Snapshot(unittest.TestCase):
    def step(self, store, r, now):
        rec = S.parse(r, now.isoformat())
        act, why = S.decide(store, rec, now)
        if act != "SKIP":
            S.apply(store, act, why, rec)
        return act

    def test_sequencia(self):
        st = S.empty_store()
        self.assertEqual(self.step(st, raw("1,20", "17:07:10"), at(17, 8)), "FIRST_RESULT")
        self.assertEqual(self.step(st, raw("5,00", "17:40:00"), at(17, 41)), "SKIP")      # mesma hora do primeiro
        self.assertEqual(self.step(st, raw("30,10", "18:01:00"), at(18, 2)), "HOURLY")
        self.assertEqual(self.step(st, raw("31,00", "18:30:00"), at(18, 31)), "SKIP")     # 1 por hora
        self.assertEqual(self.step(st, raw("31,00", "18:30:00"), at(19, 3)), "HOURLY")    # mudou desde o último snapshot
        self.assertEqual(self.step(st, raw("31,00", "18:30:00"), at(20, 3)), "NO_CHANGE")  # TSE parado: sem duplicar
        self.assertEqual(self.step(st, raw("31,00", "18:30:00"), at(20, 9)), "SKIP")      # janela já marcada
        self.assertEqual(self.step(st, raw("100,00", "23:50:00", tf="s"), at(23, 52)), "FINAL")
        self.assertEqual(self.step(st, raw("100,00", "23:59:00", tf="s"), at(23, 59)), "SKIP")  # depois do FINAL, nada
        kinds = [s["kind"] for s in st["snapshots"]]
        self.assertEqual(kinds, ["FIRST_RESULT", "HOURLY", "HOURLY", "FINAL"])
        self.assertTrue(st["summary"]["final_captured"])
        self.assertEqual(st["summary"]["first_result_at"], "2026-10-04T17:07:10-03:00")

    def test_final_so_com_flag_do_tse(self):
        st = S.empty_store()
        self.step(st, raw("99,99", "22:00:00"), at(22, 1))
        for h in (23,):
            self.assertNotEqual(self.step(st, raw("99,99", "22:00:00"), at(h, 1)), "FINAL")
        self.assertFalse(any(s["kind"] == "FINAL" for s in st["snapshots"]))

    def test_desconhecido_nao_vira_zero(self):
        rec = S.parse(raw("1,00", "17:07:00"), "x")
        self.assertIsNone(rec["turnout"]["votes"])
        self.assertIsNone(rec["turnout"]["percentage"])
        self.assertEqual(rec["percent_totalized"], 1.0)
        self.assertEqual(rec["candidates"][0]["votes"], 100)
        self.assertEqual(rec["candidates"][0]["percentage"], 55.56)
        self.assertEqual(rec["source_url"], "https://resultados.tse.jus.br/oficial/ele2026/6257/dados-simplificados/br/br-c0001-e006257-r.json")

    def test_cli_nao_publicado_nao_grava(self):
        with tempfile.TemporaryDirectory() as d:
            inp = os.path.join(d, "in.json")
            json.dump({"cand": []}, open(inp, "w"))
            out = os.path.join(d, "o.json")
            r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "eleicoes_snapshot.py"),
                                "--out", out, "--input", inp, "--now", "2026-10-04T17:01:00-03:00"], capture_output=True, text=True)
            self.assertIn("NOT_AVAILABLE", r.stdout)
            self.assertFalse(os.path.exists(out))


if __name__ == "__main__":
    unittest.main()
