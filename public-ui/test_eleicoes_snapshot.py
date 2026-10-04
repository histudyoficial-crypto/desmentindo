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
        self.assertEqual(rec["source_url"], "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json")

    def test_cli_nao_publicado_nao_grava(self):
        with tempfile.TemporaryDirectory() as d:
            inp = os.path.join(d, "in.json")
            json.dump({"cand": []}, open(inp, "w"))
            out = os.path.join(d, "o.json")
            r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "eleicoes_snapshot.py"),
                                "--out", out, "--input", inp, "--now", "2026-10-04T17:01:00-03:00"], capture_output=True, text=True)
            self.assertIn("NOT_AVAILABLE", r.stdout)
            self.assertFalse(os.path.exists(out))



def u(st, pst="0,00", vap=("0", "0"), ht="", tf="n"):
    # Formato real "-u.json" do TSE (estrutura verificada em 04/10/2026; valores fictícios de teste).
    return {"ele": "6257", "tpabr": "br", "cdabr": "br", "dg": "04/10/2026", "hg": "17:07:40", "dt": "04/10/2026" if ht else "",
            "ht": ht, "tf": tf, "carg": [{"cd": "1", "agr": [
                {"par": [{"sg": "P1", "cand": [{"n": "11", "sqcand": "A1", "nm": "NOME COMPLETO A", "nmu": "CANDIDATO A", "seq": "1", "st": "", "vap": vap[0], "pvap": "55,56"}]}]},
                {"par": [{"sg": "P2", "cand": [{"n": "22", "sqcand": "B2", "nm": "NOME COMPLETO B", "nmu": "CANDIDATO B", "seq": "2", "st": "", "vap": vap[1], "pvap": "44,44"}]}]}]}],
            "s": {"ts": "100", "st": st, "pst": pst}, "e": {"c": "200", "pc": "80,00"},
            "v": {"vv": "180", "vb": "5", "pvb": "2,50", "tvn": "4", "ptvn": "2,00"}}


class ContratoU(unittest.TestCase):
    def test_arquivo_zerado_nao_vira_resultado(self):
        self.assertEqual(S.flatten(u("0")), {"cand": []})

    def test_estrutura_desconhecida_falha_fechado(self):
        self.assertEqual(S.flatten({"cand": [{"nm": "X"}]}), {"cand": []})
        self.assertEqual(S.flatten({"carg": [{"cd": "3", "agr": []}], "s": {"st": "5"}}), {"cand": []})

    def test_aninhado_vira_plano(self):
        f = S.flatten(u("10", "10,00", ("100", "80"), "17:07:12"))
        rec = S.parse(f, "2026-10-04T20:08:00Z")
        self.assertEqual([c["candidate_name"] for c in rec["candidates"]], ["CANDIDATO A", "CANDIDATO B"])
        self.assertEqual([c["party"] for c in rec["candidates"]], ["P1", "P2"])
        self.assertEqual(rec["candidates"][0]["votes"], 100)
        self.assertEqual(rec["percent_totalized"], 10.0)
        self.assertEqual(rec["sections_totalized"], 10)
        self.assertEqual(rec["sections_total"], 100)
        self.assertEqual(rec["tse_updated_at"], "2026-10-04T17:07:12-03:00")
        self.assertEqual(rec["turnout"], {"votes": 200, "percentage": 80.0})
        self.assertEqual(rec["valid_votes"], 180)

    def test_cli_arquivo_zerado_nao_grava(self):
        with tempfile.TemporaryDirectory() as d:
            inp, out = os.path.join(d, "u.json"), os.path.join(d, "o.json")
            json.dump(u("0"), open(inp, "w"))
            r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "eleicoes_snapshot.py"), "--out", out, "--input", inp,
                                "--now", "2026-10-04T17:20:00-03:00"], capture_output=True, text=True)
            self.assertIn("NOT_AVAILABLE", r.stdout)
            self.assertFalse(os.path.exists(out))


class HoraTSE(unittest.TestCase):
    def test_dt_ht_em_outro_fuso_nao_vira_hora_de_brasilia(self):
        r = {"dt": "05/10/2026", "ht": "09:19:47", "dg": "04/10/2026", "hg": "17:23:29"}
        self.assertEqual(S.tse_coherent(r), "2026-10-04T17:23:29-03:00")

    def test_dt_ht_no_fuso_da_uf_nao_vira_hora_de_brasilia(self):
        r = {"dt": "04/10/2026", "ht": "15:20:16", "dg": "04/10/2026", "hg": "17:20:19"}   # AC, real
        self.assertEqual(S.tse_coherent(r), "2026-10-04T17:20:19-03:00")

    def test_dt_ht_coerente(self):
        r = {"dt": "04/10/2026", "ht": "17:22:57", "dg": "04/10/2026", "hg": "17:23:37"}
        self.assertEqual(S.tse_coherent(r), "2026-10-04T17:22:57-03:00")


if __name__ == "__main__":
    unittest.main()
