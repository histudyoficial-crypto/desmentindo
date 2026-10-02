#!/usr/bin/env python3
"""QA automatizado da v5 (Playwright, Chromium local).

    python3 -m http.server 8765            # na raiz do repositório
    python3 public-ui/qa/v5_qa.py [--base http://127.0.0.1:8765] [--shots DIR] [--story dark-horse]

Grava public-ui/qa/v5_qa_result.json e capturas em --shots. Sai com código 1 se algum gate falhar.
"""
import argparse, json, os, re, subprocess, sys, unicodedata
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

# INTERNAL_IDENTIFIER_PUBLIC_LEAK — mesma regra de public-ui/internal-ids.mjs
INTERNAL_IDS = re.compile(r"\bPS-[A-Z]{2,}-\d{8}|\bRV-20\d{6}-\d{3}\b|\bDS-20\d{2}-\d{2}-\d{2}-\d{3}\b|\bDSNR-|\bEVC-20\d{6}-\d{3}|\bHI-[0-9a-f]{12}\b|\bRQ-[0-9a-f]{12}\b|\bSC-\d{3}\b|\bWI-\d{8}-\d{3}|\bINC-20\d{6}-\d{3}\b|\bDQ-\d{4}\b|\bD-20\d{12}-[0-9a-f]{6,}|\b(source_id|evidence_id|review_id|event_id|claim_id|story_id|item_id|query_id)\b|\[fonte prim[aá]ria\]", re.I)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://127.0.0.1:8765")
ap.add_argument("--shots", default="/tmp/v5shots")
ap.add_argument("--story", default="dark-horse")
ap.add_argument("--chromium", default="/opt/pw-browsers/chromium")
args = ap.parse_args()
os.makedirs(args.shots, exist_ok=True)
BASE = args.base.rstrip("/") + "/v5/"

# ---------------------------------------------------------------- fontes públicas para conferência
html = open(os.path.join(ROOT, "index.html"), encoding="utf8").read()
ms_path = re.search(r'name="ms-manifest" content="([^"]+)"', html).group(1)
MS = json.load(open(os.path.join(ROOT, ms_path), encoding="utf8"))
AGS = next(s for s in MS["sources"] if s["source_id"] == "youtube:alexandre_garcia")
AG = json.load(open(os.path.join(ROOT, AGS["dataset"]["url"]), encoding="utf8"))
VID = {v["id"]: v for v in AG["videos"]}
lm_path = re.search(r'name="acervos-manifest" content="([^"]+)"', html).group(1)
LINKS = json.load(open(os.path.join(ROOT, json.load(open(os.path.join(ROOT, lm_path)))["dataset"]["url"]), encoding="utf8"))
UNAVAILABLE = [s["display_name"] for s in MS["sources"] if not (s.get("capabilities") or {}).get("searchable")]

MARKERS = re.compile(r"AUTONOMOUS_TEST_RUN|RV-2026|DS-20\d\d-|EVC-2026|WAITING_REVIEW|HUMAN_REVIEW_QUEUE|review_reason|decision_ref|desmentindo-ops|MORNING_OPEN|LEGACY_PROJECT_MORNING|ANTHROPIC_API_KEY|sk-ant-")
JARGON = re.compile(r"\bRHR\b|\bOccurrences?\b|Media Salience|Audit Index|Human Review|\bpipeline\b|\bscores?\b", re.I)
# "corpus" só é aceito como termo jurídico/calendário vindo do texto público ("habeas corpus", "Corpus Christi").
# (a chave `corpus: "#/…"` do mapa de rotas antigas no JS é endereço do app anterior, não texto exibido)
CORPUS_BAD = re.compile(r"(?<!habeas )(?<!habeas-)(?<!habeas)\bcorpus\b(?! christi)(?!: \"#/)", re.I)

def segment_at(video_id, t):
    v = VID.get(video_id)
    if not v:
        return None, None
    for s in v["sg"]:
        if s["s"] == t:
            return v, s
    return v, None

MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
def fdate(d):
    y, m, dd = d.split("-")
    return f"{int(dd)} {MES[int(m)-1]} {y}"

R = {"viewports": {}, "checks": {}, "requests": {}, "evidence": {}}
fails = {}
def check(gate, name, ok, info=None):
    R["checks"].setdefault(gate, []).append({"check": name, "ok": bool(ok), "info": info})
    if not ok:
        fails.setdefault(gate, []).append(name)

def verify_link(href, shown_date, gate, label):
    u = urlparse(href)
    q = parse_qs(u.query)
    vid = (q.get("v") or [None])[0]
    t = int(re.sub(r"s$", "", (q.get("t") or ["-1"])[0]))
    v, sg = segment_at(vid, t)
    ok = u.netloc == "www.youtube.com" and u.path == "/watch" and v is not None and sg is not None
    check(gate, f"{label}: link aponta para segmento real (vídeo + segundo)", ok, {"href": href, "video_id": vid, "t": t})
    if v:
        check(gate, f"{label}: data exibida = data de publicação do vídeo", shown_date == v["u"][:10], {"shown": shown_date, "video_u": v["u"]})
    return vid, t, v, sg

def page_text_ok(text, gate, where):
    for name in UNAVAILABLE:
        for line in [l for l in text.splitlines() if name in l]:
            if re.search(r"(^|\s)0\s*(trechos?|resultados?|vídeos?)", line) or re.search(r"\b0 resultados\b", line):
                check(gate, f"{where}: {name} sem contagem zero", False, line)
    check(gate, f"{where}: sem '0 resultados'", "0 resultados" not in text)
    check(gate, f"{where}: sem marcadores internos no texto", not MARKERS.search(text), (MARKERS.search(text) or [None])[0])
    j = JARGON.search(text) or CORPUS_BAD.search(text)
    check(gate, f"{where}: sem jargão interno no texto", not j, j.group(0) if j else None)

with sync_playwright() as pw:
    exe = args.chromium if os.path.exists(args.chromium) else None
    if exe and os.path.isdir(exe):
        cand = [os.path.join(exe, p) for p in ("chrome-linux/chrome", "chrome")]
        exe = next((c for c in cand if os.path.exists(c)), None)
    browser = pw.chromium.launch(executable_path=exe) if exe else pw.chromium.launch()

    for vp_name, vp in (("desktop", {"width": 1280, "height": 800}), ("mobile", {"width": 390, "height": 844})):
        ctx = browser.new_context(viewport=vp, device_scale_factor=1, is_mobile=vp_name == "mobile", has_touch=vp_name == "mobile")
        page = ctx.new_page()
        errors, reqs = [], []
        page.on("pageerror", lambda ex: errors.append(str(ex)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        def on_resp(r):
            try:
                body = r.body()
                reqs.append({"url": r.url.replace(args.base, ""), "status": r.status, "bytes": len(body)})
            except Exception:
                reqs.append({"url": r.url.replace(args.base, ""), "status": r.status, "bytes": None})
        page.on("response", on_resp)

        def visit(name, hash_, wait):
            reqs.clear(); errors.clear()
            page.goto(BASE + "#/__blank")
            page.goto(BASE + hash_)
            page.wait_for_selector(wait, timeout=15000)
            page.wait_for_load_state("networkidle")
            R["requests"][f"{vp_name}:{name}"] = list(reqs)
            check("BOUNDARY", f"{vp_name}:{name}: nenhum download do arquivo completo (data/ag, data/corpus)",
                  not any(re.search(r"/data/(ag|corpus)/", x["url"]) for x in reqs), [x["url"] for x in reqs if "/data/" in x["url"] and "/v5/" not in x["url"]])
            data = [x for x in reqs if "/v5/data/" in x["url"]]
            big = [x for x in data if (x["bytes"] or 0) > 400 * 1024]
            check("PERFORMANCE", f"{vp_name}:{name}: todo arquivo de dados < 400 KB", not big, big)
            check(gate_of(name), f"{vp_name}:{name}: sem erro de JS", not errors, list(errors))
            ow = page.evaluate("Math.max(document.documentElement.scrollWidth - window.innerWidth, window.innerWidth - %d)" % vp["width"])
            check(gate_of(name), f"{vp_name}:{name}: sem rolagem horizontal", ow <= 0, ow)
            text = page.inner_text("body")
            page_text_ok(text, "BOUNDARY", f"{vp_name}:{name}")
            # DOM inteiro (atributos incluídos: title/tooltip, aria-label, href, data-*) + texto visível
            dom = page.evaluate("document.documentElement.outerHTML")
            leaks = sorted(set(m.group(0) for m in INTERNAL_IDS.finditer(dom + "\n" + text)))
            check("BOUNDARY", f"{vp_name}:{name}: INTERNAL_IDENTIFIER_PUBLIC_LEAK (DOM, atributos e texto)", not leaks, leaks)
            return data, text

        def gate_of(name):
            if name.startswith(("checar", "ovc")): return "V5_CHECAR_QA"
            if name.startswith(("legacy", "agora-item")): return "V5_ROUTES_QA"
            if name.startswith("epist"): return "V5_EPISTEMIC_QA"
            return {"home": "V5_HOME_QA", "story": "V5_STORY_QA"}.get(name, "V5_SEARCH_QA" if name.startswith("search") else "V5_HOME_QA")

        # ------------------------------------------------ HOME
        data, text = visit("home", "", ".hero .name")
        home_bytes = sum(x["bytes"] or 0 for x in data)
        R["evidence"][f"{vp_name}:home_data_bytes"] = home_bytes
        check("PERFORMANCE", f"{vp_name}:home: dados iniciais < 100 KB", home_bytes < 100 * 1024, home_bytes)
        H = vp["height"]
        def in_first(sel):
            b = page.locator(sel).first.bounding_box()
            return bool(b) and b["y"] >= 0 and b["y"] + b["height"] <= H and page.locator(sel).first.is_visible()
        check("V5_HOME_QA", f"{vp_name}:home: marca DESMENTINDO na primeira dobra", in_first(".hero .name"))
        check("V5_HOME_QA", f"{vp_name}:home: mensagem na primeira dobra", in_first(".hero .motto"))
        check("V5_HOME_QA", f"{vp_name}:home: busca na primeira dobra", in_first("#q-home"))
        ph = page.get_attribute("#q-home", "placeholder")
        check("V5_HOME_QA", f"{vp_name}:home: placeholder da busca", ph == "Pesquise uma pessoa, assunto ou acontecimento", ph)
        cue = page.inner_text(".hero .cue")
        five = in_first(".hero .cue") and "minuto do vídeo" in cue and "fonte" in cue
        check("V5_HOME_QA", f"{vp_name}:home: teste dos 5 segundos (marca + explicação + busca + pista de 'o que já foi dito com fonte verificável' na 1ª dobra)", five, cue)
        check("V5_HOME_QA", f"{vp_name}:home: seção Já falaram sobre isso com Alexandre Garcia, Caio Coppolla e Te Atualizei",
              page.locator("#ja-falaram").count() == 1 and all(n in page.inner_text("#ja-falaram") for n in ("Alexandre Garcia", "Caio Coppolla", "Te Atualizei")))
        cards = page.locator(".story-main").count() + page.locator("#agora .rows li").count()
        check("V5_HOME_QA", f"{vp_name}:home: Agora enxuto (1 principal + até 3)", 1 <= cards <= 4, cards)
        noindex = page.get_attribute('meta[name="robots"]', "content")
        check("BOUNDARY", f"{vp_name}:home: noindex", noindex and "noindex" in noindex and "nofollow" in noindex, noindex)
        page.screenshot(path=os.path.join(args.shots, f"home-{vp_name}.png"))
        page.screenshot(path=os.path.join(args.shots, f"home-{vp_name}-full.png"), full_page=True)

        # ------------------------------------------------ STORY + E2E
        data, text = visit("story", "#/historia/" + args.story, "h1.h1")
        R["evidence"][f"{vp_name}:story_data_bytes"] = sum(x["bytes"] or 0 for x in data)
        jf = page.locator("#ja-falaram")
        check("V5_STORY_QA", f"{vp_name}:story: seção 'Já falaram sobre isso' existe", jf.count() == 1 and jf.locator("h2").inner_text().strip().lower() == "já falaram sobre isso")
        top = page.evaluate("document.getElementById('ja-falaram').getBoundingClientRect().top + window.scrollY")
        R["evidence"][f"{vp_name}:story_ja_falaram_top_px"] = top
        check("V5_STORY_QA", f"{vp_name}:story: 'Já falaram' começa até 1,5 tela ({1.5*H:.0f}px)", top <= 1.5 * H, top)
        jump = page.locator("a.jump").count() == 1 and in_first("a.jump")
        check("V5_STORY_QA", f"{vp_name}:story: atalho para 'Já falaram' visível na primeira dobra", jump)
        order = page.evaluate("Array.from(document.querySelectorAll('main h2')).map(h => h.textContent.trim())")
        R["evidence"][f"{vp_name}:story_sections"] = order
        check("V5_STORY_QA", f"{vp_name}:story: sem bloco vazio", page.evaluate("Array.from(document.querySelectorAll('main section.sec')).every(s => s.innerText.trim().split('\\n').length > 1)"))
        first = jf.locator("li.said").first
        href = first.locator("a.go").get_attribute("href")
        shown = first.locator("time").get_attribute("datetime")
        shown_txt = first.locator("time").inner_text()
        tl = first.locator(".said-when").inner_text()
        who = first.locator(".said-who").inner_text()
        excerpt = first.locator(".said-x").inner_text()
        vid, t, v, sg = verify_link(href, shown, "V5_AG_TIMESTAMP_E2E", f"{vp_name}:story")
        check("V5_AG_TIMESTAMP_E2E", f"{vp_name}:story: fonte = Alexandre Garcia", who.strip().upper() == "ALEXANDRE GARCIA", who)
        check("V5_AG_TIMESTAMP_E2E", f"{vp_name}:story: data exibida por extenso confere", shown_txt == fdate(v["u"][:10]) if v else False, shown_txt)
        if sg:
            mm = f"{t // 60}:{t % 60:02d}" if t < 3600 else f"{t // 3600}:{(t % 3600) // 60:02d}:{t % 60:02d}"
            check("V5_AG_TIMESTAMP_E2E", f"{vp_name}:story: minuto exibido = t do segmento", tl.endswith(mm), {"shown": tl, "expected": mm})
            check("V5_AG_TIMESTAMP_E2E", f"{vp_name}:story: texto exibido = texto do segmento", sg["x"].startswith(excerpt.rstrip("…")), {"shown": excerpt, "segment": sg["x"]})
        # O trecho vem dos links ELEGÍVEIS do caso desta história.
        case_key = next((k for k in LINKS["cases"] if re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFD", k).encode("ascii", "ignore").decode().lower()).strip("-") == args.story), None)
        in_links = case_key and any(o["video_id"] == vid and o["timestamp"] == t for g in LINKS["cases"][case_key]["ag_video_groups"] for o in g["occurrences"])
        check("V5_AG_TIMESTAMP_E2E", f"{vp_name}:story: trecho é ELEGÍVEL no caso '{case_key}' (data/corpus/links)", in_links, case_key)
        if vp_name == "mobile":
            R["evidence"]["e2e"] = {"story": args.story, "case_key": case_key, "deep_link": href, "shown_date": shown_txt, "shown_t": tl, "excerpt": excerpt,
                                    "corpus_segment": {"video_id": vid, "published": v["u"] if v else None, "s": sg["s"] if sg else None, "y": sg["y"] if sg else None, "c": sg["c"] if sg else None, "x": sg["x"] if sg else None}}
        page.screenshot(path=os.path.join(args.shots, f"story-{vp_name}.png"))
        page.screenshot(path=os.path.join(args.shots, f"story-{vp_name}-full.png"), full_page=True)

        # ------------------------------------------------ SEARCH
        for q, slug in (("Alexandre de Moraes", "moraes"), ("INSS", "inss")):
            data, text = visit("search-" + slug, "#/busca?q=" + q.replace(" ", "%20"), "#nos-arquivos")
            page.wait_for_selector("#ag-list li.said", timeout=15000)
            page.wait_for_load_state("networkidle")
            R["requests"][f"{vp_name}:search-{slug}"] = list(reqs)
            data = [x for x in reqs if "/v5/data/" in x["url"]]
            R["evidence"][f"{vp_name}:search_{slug}_data_bytes"] = sum(x["bytes"] or 0 for x in data)
            check("PERFORMANCE", f"{vp_name}:search-{slug}: todo arquivo < 400 KB (após trechos)", not [x for x in data if (x["bytes"] or 0) > 400 * 1024])
            groups = page.evaluate("Array.from(document.querySelectorAll('.group .h2')).map(h => h.textContent.trim())")
            n = int(page.get_attribute("[data-count]", "data-count") or 0)
            R["evidence"][f"{vp_name}:search_{slug}"] = {"groups": groups, "ag_count": n, "agora": page.locator(".group").first.inner_text()[:200]}
            check("V5_SEARCH_QA", f"{vp_name}:search '{q}': grupo AGORA e/ou NOS ARQUIVOS", any(g.lower() in ("agora", "nos arquivos") for g in groups), groups)
            check("V5_SEARCH_QA", f"{vp_name}:search '{q}': contagem real > 0 no arquivo Alexandre Garcia", n > 0, n)
            # contagem conferida contra o texto do arquivo (mesmos filtros públicos do build)
            if vp_name == "desktop":
                def nrm(s): return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower())
                toks = [w for w in nrm(q).split() if len(w) > 1 and w not in ("de", "da", "do")]
                cnt = 0; seen = set()
                for vv in AG["videos"]:
                    for s in vv["sg"]:
                        if s["x"].strip().startswith("[") or s["c"] == "B" or (vv["id"], s["s"]) in seen: continue
                        seen.add((vv["id"], s["s"]))
                        ws = set(nrm(s["x"]).split())
                        if all(w in ws for w in toks): cnt += 1
                R["evidence"][f"search_{slug}_recount_from_archive"] = cnt
                check("V5_SEARCH_QA", f"search '{q}': contagem exibida = recontagem no arquivo AG", cnt == n, {"shown": n, "recount": cnt})
            fl = page.locator("#ag-list li.said").first
            verify_link(fl.locator("a.go").get_attribute("href"), fl.locator("time").get_attribute("datetime"), "V5_SEARCH_QA", f"{vp_name}:search '{q}'")
            na = page.inner_text("#nos-arquivos")
            check("V5_SEARCH_QA", f"{vp_name}:search '{q}': Caio Coppolla e Te Atualizei como indisponíveis", all(nm in na for nm in UNAVAILABLE) and "ainda não disponíve" in na)
            if slug == "moraes":
                page.screenshot(path=os.path.join(args.shots, f"search-{vp_name}.png"))
                page.screenshot(path=os.path.join(args.shots, f"search-{vp_name}-full.png"), full_page=True)

        # ------------------------------------------------ outras páginas (fronteira e estados)
        for name, h, w in (("arquivos", "#/arquivos", "h1.h1"), ("arquivo-pessoa", "#/arquivo/alexandre-de-moraes", "h1.h1"), ("profissionais", "#/profissionais", "h1.h1"), ("search-vazio", "#/busca?q=xqzwv", ".empty")):
            data, text = visit(name, h, w)
            if name in ("arquivos", "profissionais"):
                for nm in UNAVAILABLE:
                    check("BOUNDARY", f"{vp_name}:{name}: {nm} marcado como indisponível", nm in text and "ainda não disponível para pesquisa" in text)
            if name == "search-vazio":
                check("V5_SEARCH_QA", f"{vp_name}: busca sem resultado diz que não quer dizer que nunca foi dito", "não quer dizer que nunca foi dito" in text)
            if name == "arquivo-pessoa" and vp_name == "mobile":
                page.screenshot(path=os.path.join(args.shots, f"pessoa-{vp_name}.png"))

        # ------------------------------------------------ SEMÂNTICA: alegação atribuída nunca aparece como fato
        hist_dir = os.path.join(ROOT, "v5", "data", "historia")
        alleg_story = next((f[:-5] for f in sorted(os.listdir(hist_dir))
                            if any(c.get("allegation") for c in json.load(open(os.path.join(hist_dir, f), encoding="utf8"))["chrono"])), None)
        if alleg_story:
            SJ = json.load(open(os.path.join(hist_dir, alleg_story + ".json"), encoding="utf8"))
            visit("epist-" + alleg_story, "#/historia/" + alleg_story, "h1.h1")
            want = [bool(c.get("allegation")) for c in SJ["chrono"]]
            got = page.evaluate("Array.from(document.querySelectorAll('ol.tl li')).map(li => !!li.querySelector('.tag-alleg, .tag-said') && !!li.querySelector('.attr'))")
            check("V5_EPISTEMIC_QA", f"{vp_name}: cronologia de '{alleg_story}' rotula e atribui toda alegação (e só ela)", got == want, {"want": want, "got": got})
            uw = [bool(u.get("allegation")) for u in SJ["updates"]]
            ug = page.evaluate("Array.from(document.querySelectorAll('ul.upd li')).map(li => !!li.querySelector('.tag-alleg, .tag-said') && !!li.querySelector('.attr'))")
            check("V5_EPISTEMIC_QA", f"{vp_name}: atualizações rotulam e atribuem alegação", ug == uw, {"want": uw, "got": ug})
        # ALLEGATION_RENDERED_AS_FACT (regressão): em TODAS as histórias, nenhuma alegação aparece sem rótulo e atribuição.
        if vp_name == "desktop":
            AUD = {x["event"]: x for x in json.load(open(os.path.join(ROOT, "public-ui", "attribution_audit.json"), encoding="utf8"))["items"]}
            bad, n_alleg = [], 0
            for f in sorted(os.listdir(hist_dir)):
                SJ2 = json.load(open(os.path.join(hist_dir, f), encoding="utf8"))
                want2 = [x.get("attr", {}).get("kind") if x and x.get("allegation") else None for x in [SJ2.get("summary")] + SJ2["chrono"] + SJ2["updates"]]
                if not any(want2): continue
                n_alleg += sum(1 for k in want2 if k)
                page.goto(BASE + "#/__blank"); page.goto(BASE + "#/historia/" + f[:-5]); page.wait_for_selector("h1.h1"); page.wait_for_load_state("networkidle")
                got2 = page.evaluate("""() => { const pick = el => { if (!el) return null; const t = el.querySelector(':scope > .tag-alleg, :scope > .tag-said, .tag-alleg, .tag-said'); return t ? t.textContent.trim().toLowerCase() : 'SEM_ROTULO'; };
                  const sum = document.querySelector('.page-head .summary'); const out = [sum && sum.querySelector('.tag-alleg, .tag-said') ? sum.querySelector('.tag-alleg, .tag-said').textContent.trim().toLowerCase() : null];
                  document.querySelectorAll('ol.tl li').forEach(li => out.push(li.querySelector('.tag-alleg, .tag-said') ? li.querySelector('.tag-alleg, .tag-said').textContent.trim().toLowerCase() : null));
                  document.querySelectorAll('ul.upd li').forEach(li => out.push(li.querySelector('.tag-alleg, .tag-said') ? li.querySelector('.tag-alleg, .tag-said').textContent.trim().toLowerCase() : null));
                  return out; }""")
                label = {"alegacao": "alegação atribuída", "declaracao": "declaração atribuída", "atribuido": "atribuído"}
                if [label.get(k) for k in want2] != got2: bad.append({"story": f[:-5], "want": want2, "got": got2})
            R["evidence"]["allegations_checked"] = n_alleg
            # rótulos mutuamente exclusivos: nada é ao mesmo tempo "fato com fonte" e alegação/declaração/atribuído
            mixed = page.evaluate("Array.from(document.querySelectorAll('li, p.summary')).filter(n => n.querySelector(':scope > .tag-fact, :scope .src > .tag-fact') && n.querySelector(':scope > .tag-alleg, :scope > .tag-said')).length")
            check("V5_EPISTEMIC_QA", "ATTRIBUTED_STATEMENT ≠ ATTRIBUTED_ALLEGATION ≠ FATO: nenhum item com dois rótulos", mixed == 0, mixed)
            pend = [x for x in AUD.values() if (x.get("human_review") or {}).get("status") not in (None, "CONFIRMED", "KEPT_PREVIOUS")]
            decl = sum(1 for f in os.listdir(hist_dir) for x in [json.load(open(os.path.join(hist_dir, f), encoding="utf8"))]
                       for it in [x.get("summary")] + x["chrono"] + x["updates"] if it and (it.get("attr") or {}).get("kind") == "declaracao")
            confirmed = sum(1 for x in AUD.values() if (x.get("human_review") or {}).get("status") == "CONFIRMED" and x["proposed"] == "ATTRIBUTED_STATEMENT")
            check("V5_EPISTEMIC_QA", f"declaração atribuída só com confirmação humana individual ({len(pend)} pendentes ficam neutros)", decl == 0 if confirmed == 0 else decl > 0, {"declaracao": decl, "confirmadas": confirmed})
            check("V5_EPISTEMIC_QA", f"ALLEGATION_RENDERED_AS_FACT = 0 em todas as histórias ({n_alleg} itens de alegação conferidos)", not bad, bad[:3])
        if not alleg_story:
            check("V5_EPISTEMIC_QA", "há história com alegação na cronologia para testar", False)
        kn = page.evaluate("Array.from(document.querySelectorAll('ul.items li')).every(li => !li.querySelector('.src') || !!li.querySelector('.tag-fact'))")
        check("V5_EPISTEMIC_QA", f"{vp_name}: 'O que sabemos' só com fato com fonte, rotulado", kn)
        check("V5_EPISTEMIC_QA", f"{vp_name}: documento localizado com a regra 'ainda precisamos verificar'", page.locator(".spot").count() == 0 or "ainda precisamos verificar o que ele realmente sustenta" in page.inner_text(".spot"))

        # ------------------------------------------------ CHECAR (página pública)
        data, text = visit("checar", "#/checar", "h1.h1")
        check("V5_CHECAR_QA", f"{vp_name}:checar: diz que o envio ainda não está aberto (nada é recebido nem guardado)", "envio pelo site ainda não está aberto" in text and "não recebe nem guarda nada" in text)
        check("V5_CHECAR_QA", f"{vp_name}:checar: CHECAR_SUBMISSIONS = CLOSED (sem campo de envio, sem CTA de envio, fora da navegação principal)",
              page.locator("textarea, input[type=file]").count() == 0 and not re.search(r"cola aqui|envie (seu|o) (print|material)|mande (pra|para) a gente", text, re.I)
              and page.locator('.doors a[href="#/checar"], .tabbar a[href="#/checar"]').count() == 0)
        check("V5_CHECAR_QA", f"{vp_name}:checar: 7 passos (entrada → decomposição → checagem → encontramos → contexto → conclusão → saída)", page.locator("ol.steps li").count() == 7)
        check("V5_CHECAR_QA", f"{vp_name}:checar: paridade de formato (6 pares)", page.locator("ul.parity li").count() == 6)
        check("V5_CHECAR_QA", f"{vp_name}:checar: legenda com os 5 selos + 'checamos se foi dito/aconteceu'",
              page.locator(".legend .selo").count() == 5 and "checamos se foi dito" in text.lower() and "checamos se aconteceu" in text.lower())
        CJ = json.load(open(os.path.join(ROOT, "v5", "data", "checar.json"), encoding="utf8"))
        public_example = bool(CJ.get("example") or CJ.get("circulating"))
        check("V5_CHECAR_QA", f"{vp_name}:checar: exemplo público só se liberado (checar.json)", (page.locator(".ovc").count() > 0) == public_example, public_example)
        # ORIGINAL × CHECADO e paridade de saída: peça REAL já publicada (v4/data/afirmacoes.json) + fixtures de teste
        # (formatos tabela/linha do tempo) injetadas só no navegador do QA. Nada disso é publicado.
        FIX = [{"format": "table", "input": {"type": "Tabela", "outlet": "FIXTURE DE TESTE"}, "status": "EM_CHECAGEM",
                "table": {"cols": ["Item", "Valor"], "rows": [{"cells": ["A", "10"], "claim": {"selo": "DOCUMENTADO", "check": "ACONTECEU"}},
                                                              {"cells": ["B", "20"], "claim": {"selo": "valor_desconhecido"}},
                                                              {"cells": ["C", "—"], "claim": {"selo": "NAO_ENCONTRAMOS", "check": "FOI_DITO"}}]}},
               {"format": "timeline", "input": {"type": "Linha do tempo", "outlet": "FIXTURE DE TESTE"},
                "events": [{"date": "2019", "text": "Marco 1", "selo": "DOCUMENTADO", "check": "ACONTECEU"}, {"date": "2021-05", "text": "Marco 2", "selo": "AINDA_NAO_DA", "check": "FOI_DITO"}]}]
        r = page.evaluate("""async (fx) => {
          const A = await (await fetch('/v4/data/afirmacoes.json')).json();
          const C = window.DesmentindoCheck, m = C.fromCirculating(A.circulating[0], A.claims);
          const box = document.querySelector('main .wrap');
          box.innerHTML = '<h1 class="h1">QA</h1>' + C.originalVsChecked(m) + C.originalVsChecked(fx[0]) + C.originalVsChecked(fx[1]);
          const v = box.querySelectorAll('.ovc'), chk = v[0].querySelector('.ovc-chk'), orig = v[0].querySelector('.ovc-orig');
          const weak = m.links.filter(l => !['DOCUMENTADO','PARCIALMENTE_DOCUMENTADO','EM_CHECAGEM'].includes(l.selo)).length;
          return { n: m.groups.reduce((n,g)=>n+g.items.length,0) + m.links.length, total: A.circulating[0].claims,
                   selos: chk.querySelectorAll('.cl .st .selo, .links .st .selo').length, orig_selos: orig.querySelectorAll('.selo').length,
                   weak, dotted: chk.querySelectorAll('.lk-AINDA_NAO_DA, .lk-NAO_ENCONTRAMOS').length, solid_unconfirmed: [...chk.querySelectorAll('.lk-DOCUMENTADO')].length - m.links.filter(l=>l.selo==='DOCUMENTADO').length,
                   html: box.innerHTML, unk: v[1].querySelectorAll('td .s-EM_CHECAGEM').length, naoenc: v[1].innerText.includes('Isso não significa que nunca aconteceu'),
                   formats: [...v].map(x => x.dataset.format), asset: !!chk.querySelector('.asset-foot .asset-brand') };
        }""", FIX)
        check("V5_CHECAR_QA", f"{vp_name}:ovc: todas as afirmações da peça real aparecem checadas (saída não empobrece a entrada)", r["n"] == r["total"] == r["selos"], {k: r[k] for k in ("n", "total", "selos")})
        check("V5_CHECAR_QA", f"{vp_name}:ovc: ORIGINAL sem selo (o que entrou) × CHECADO com selo (o que sobrou)", r["orig_selos"] == 0 and r["selos"] > 0)
        check("V5_CHECAR_QA", f"{vp_name}:ovc: ligação não confirmada é pontilhada; nenhuma aparece como documentada", r["dotted"] == r["weak"] and r["solid_unconfirmed"] == 0, {k: r[k] for k in ("weak", "dotted", "solid_unconfirmed")})
        check("V5_CHECAR_QA", f"{vp_name}:ovc: paridade de formato (mapa de relações, tabela, linha do tempo)", r["formats"] == ["relations", "table", "timeline"], r["formats"])
        check("V5_CHECAR_QA", f"{vp_name}:ovc: valor desconhecido → EM CHECAGEM; 'não encontramos' com a frase obrigatória", r["unk"] == 1 and r["naoenc"])
        check("V5_CHECAR_QA", f"{vp_name}:ovc: peça checada com marca, data e endereço (base para derivação)", r["asset"])
        ids = sorted(set(re.findall(r"\bCL-\d{3}\b|\bN\d{3}\b", r["html"])) | set(m.group(0) for m in INTERNAL_IDS.finditer(r["html"])))
        check("V5_CHECAR_QA", f"{vp_name}:ovc: sem ID interno na saída", not ids, ids)
        ow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("V5_CHECAR_QA", f"{vp_name}:ovc: sem rolagem horizontal", ow <= 0, ow)
        page.screenshot(path=os.path.join(args.shots, f"ovc-{vp_name}-full.png"), full_page=True)

        # ------------------------------------------------ AGORA: uma notícia = uma URL; nada só no hover
        ED = json.load(open(os.path.join(ROOT, "data", "editorial", "index.json"), encoding="utf8"))
        if ED.get("editions"):
            EDN = json.load(open(os.path.join(ROOT, ED["editions"][0]["file"]), encoding="utf8"))
            it = EDN["items"][0]
            data, text = visit("agora-item", "#/agora/" + it["id"], "h1.h1")
            check("V5_ROUTES_QA", f"{vp_name}:agora-item: título e texto aprovados, sem alteração", page.inner_text("h1.h1").strip() == it["title"] and it["text"] in text)
            titles = page.evaluate("Array.from(document.querySelectorAll('.rail .rt2')).map(x => x.textContent)")
            check("V5_ROUTES_QA", f"{vp_name}:agora-item: título de cada fonte visível (não depende de hover)", titles == [x.get("title") or x["name"] for x in it["sources"]], titles)
            data, text = visit("home-agora", "", ".hero .name")
            check("V5_HOME_QA", f"{vp_name}:home: AGORA enxuto (3 com texto, resto em linhas) e todos os itens com link próprio",
                  page.locator("#agora .ed-item").count() == min(3, len(EDN["items"])) and page.locator('#agora a[href^="#/agora/"]').count() >= len(EDN["items"]))
            check("V5_HOME_QA", f"{vp_name}:home: fontes sem tooltip (title) como única informação", page.locator("#agora a[title]").count() == 0)

        # ------------------------------------------------ rotas antigas: nada de 404 silencioso
        # o redirecionamento servido em /desmentindo_local.html (gerado no deploy) preserva o #/rota
        stub = subprocess.run(["node", "public-ui/build-root.mjs", "--out", "/dev/null", "--legacy-out", "/dev/stdout", "--no-build-info"], cwd=ROOT, capture_output=True, text=True).stdout
        check("V5_ROUTES_QA", f"{vp_name}: /desmentindo_local.html aposentado (redireciona para a raiz com a mesma rota; sem o app anterior)",
              'content="retired"' in stub and 'location.replace("/" + (location.hash || ""))' in stub and "const D" not in stub)
        v4stub = subprocess.run(["node", "public-ui/build-root.mjs", "--out", "/dev/null", "--legacy-out", "/dev/null", "--v4-out", "/dev/stdout", "--no-build-info"], cwd=ROOT, capture_output=True, text=True).stdout
        check("V5_ROUTES_QA", f"{vp_name}: LEGACY_V4_PUBLIC_PREVIEW_RETIRED (/v4/ redireciona para a raiz com a mesma rota)",
              'content="retired-v4"' in v4stub and 'location.replace("/" + (location.hash || ""))' in v4stub)
        for name, h_, expect in (("v4-circulando", "#/circulando", "#/checar"), ("v4-caso", "#/caso/lava-jato", "#/historia/lava-jato"), ("v4-data", "#/data", "#/profissionais"), ("legacy-caso", "#/caso?c=Lava%20Jato", "#/historia/lava-jato"), ("legacy-pessoa", "#/pessoa?n=Dias%20Toffoli", "#/arquivo/dias-toffoli"),
                                 ("legacy-corpus", "#/corpus", "#/arquivos"), ("legacy-narrativas", "#/narrativas", "#/checar")):
            page.goto(BASE + "#/__blank"); page.goto(BASE + h_)
            page.wait_for_function("(e) => location.hash === e", arg=expect, timeout=10000)
            page.wait_for_selector("h1.h1", timeout=10000)
            check("V5_ROUTES_QA", f"{vp_name}:{name}: {h_} → {expect}", page.evaluate("location.hash") == expect)
        data, text = visit("legacy-matriz", "#/matriz", "h1.h1")
        check("V5_ROUTES_QA", f"{vp_name}: rota retirada (matriz) explica e não aponta para o módulo bloqueado", "saiu da página pública" in text and page.locator('a[href*="desmentindo_local"]').count() == 0)
        data, text = visit("legacy-eventos", "#/eventos", "h1.h1")
        check("V5_ROUTES_QA", f"{vp_name}: rota encerrada (eventos) explica e não aponta para o site anterior", "foi encerrada" in text and page.locator('a[href*="desmentindo_local"]').count() == 0)
        page.goto(BASE + "#/__blank"); page.goto(BASE + "#/eventos?ev=EV-0001")
        page.wait_for_function("() => location.hash.indexOf('#/historia/') === 0", timeout=10000)
        check("V5_ROUTES_QA", f"{vp_name}: link antigo de registro (?ev=) → história que o contém", page.evaluate("location.hash") == "#/historia/" + json.load(open(os.path.join(ROOT, "v5", "data", "rotas.json")))["eventos"]["EV-0001"])

        # ------------------------------------------------ ACESSIBILIDADE (amostra por página)
        for name, h_, w in (("a11y-home", "", ".hero .name"), ("a11y-story", "#/historia/" + args.story, "h1.h1"), ("a11y-checar", "#/checar", "h1.h1"), ("a11y-busca", "#/busca?q=INSS", "#nos-arquivos")):
            page.goto(BASE + "#/__blank"); page.goto(BASE + h_); page.wait_for_selector(w); page.wait_for_load_state("networkidle")
            a = page.evaluate("""() => ({ h1: document.querySelectorAll('main h1').length,
              unlabeled: [...document.querySelectorAll('input, textarea, select')].filter(i => !(i.labels && i.labels.length) && !i.getAttribute('aria-label')).length,
              emptyLinks: [...document.querySelectorAll('a')].filter(x => x.offsetParent && !x.textContent.trim() && !x.getAttribute('aria-label')).length,
              imgsNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
              skip: !!document.querySelector('a.skip[href="#main"]'), lang: document.documentElement.lang })""")
            check("ACCESSIBILITY", f"{vp_name}:{name}: um h1, campos com rótulo, links com texto, imagens com alt, pular para o conteúdo, lang",
                  a["h1"] == 1 and a["unlabeled"] == 0 and a["emptyLinks"] == 0 and a["imgsNoAlt"] == 0 and a["skip"] and a["lang"] == "pt-BR", a)
        page.keyboard.press("Tab"); page.keyboard.press("Tab")
        foc = page.evaluate("(() => { const el = document.activeElement, c = getComputedStyle(el); return { tag: el.tagName, outline: c.outlineStyle, w: c.outlineWidth }; })()")
        check("ACCESSIBILITY", f"{vp_name}: foco visível ao navegar por teclado", foc["outline"] != "none" and foc["w"] != "0px", foc)
        if vp_name == "mobile":
            tb = page.evaluate("Array.from(document.querySelectorAll('.tabbar a')).map(a => { const r = a.getBoundingClientRect(); return [a.textContent.trim(), Math.round(r.height)]; })")
            check("MOBILE", "barra inferior: 4 itens com texto e toque ≥ 44px (Checar fora até o envio abrir)", len(tb) == 4 and all(t and h >= 44 for t, h in tb), tb)
        ctx.close()

    # ------------------------------------------------ 375 px: nenhuma página com rolagem horizontal
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    for h_ in ("", "#/historia/" + args.story, "#/busca?q=INSS", "#/arquivo/alexandre-de-moraes", "#/arquivos", "#/profissionais", "#/checar", "#/matriz"):
        page.goto(BASE + "#/__blank"); page.goto(BASE + h_); page.wait_for_selector("main h1", timeout=15000); page.wait_for_load_state("networkidle")
        ow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("MOBILE", f"375px {h_ or '#/'}: sem rolagem horizontal", ow <= 0, ow)
    ctx.close()
    browser.close()

# ---------------------------------------------------------------- arquivos da v5 (texto)
leaks = []
for dp, _, fs in os.walk(os.path.join(ROOT, "v5")):
    for f in fs:
        p = os.path.join(dp, f)
        if f.endswith((".woff2", ".png")):
            continue
        s = open(p, encoding="utf8").read()
        m = MARKERS.search(s)
        if m: leaks.append((os.path.relpath(p, ROOT), m.group(0)))
        m = JARGON.search(s)
        if m: leaks.append((os.path.relpath(p, ROOT), m.group(0)))
        # chave de índice "corpus" (palavra do texto público "habeas corpus") é aceita só no índice de busca.
        if "/busca/t/" not in p:
            m = CORPUS_BAD.search(s)
            if m: leaks.append((os.path.relpath(p, ROOT), s[max(0, m.start() - 30):m.end() + 10]))
check("BOUNDARY", "arquivos da v5 sem marcadores internos nem jargão", not leaks, leaks[:10])
pd = [k for k in ("person_score", "political_score", "suspicion_score", "wrongdoing_score", "controversy_score", "person_ranking", "person_watchlist", "ideolog")
      if subprocess.run(["grep", "-rqi", k, os.path.join(ROOT, "v5", "js"), os.path.join(ROOT, "v5", "data", "home.json"), os.path.join(ROOT, "v5", "data", "arquivos.json")]).returncode == 0]
check("BOUNDARY", "sem campos de nota/ranking de pessoa", not pd, pd)

# ---------------------------------------------------------------- data sizes
sizes = {}
for dp, _, fs in os.walk(os.path.join(ROOT, "v5", "data")):
    for f in fs:
        sizes[os.path.relpath(os.path.join(dp, f), ROOT)] = os.path.getsize(os.path.join(dp, f))
mx = max(sizes.items(), key=lambda x: x[1])
R["evidence"]["v5_data"] = {"files": len(sizes), "total_bytes": sum(sizes.values()), "home_json_bytes": sizes.get("v5/data/home.json"),
                            "largest": {"file": mx[0], "bytes": mx[1]}, "search_meta_bytes": sizes.get("v5/data/busca/meta.json")}
check("PERFORMANCE", "maior arquivo de v5/data < 400 KB", mx[1] < 400 * 1024, mx)

# ---------------------------------------------------------------- BUILD
for cmd in (["node", "public-ui/build-public-data.mjs", "--check"], ["node", "public-ui/build-v5-data.mjs", "--check"]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    check("BUILD", " ".join(cmd), r.returncode == 0, (r.stdout + r.stderr).strip()[-300:])

gates = ["V5_HOME_QA", "V5_STORY_QA", "V5_SEARCH_QA", "V5_AG_TIMESTAMP_E2E", "V5_EPISTEMIC_QA", "V5_CHECAR_QA", "V5_ROUTES_QA", "ACCESSIBILITY", "MOBILE", "BOUNDARY", "PERFORMANCE", "BUILD"]
R["gates"] = {g: ("FAIL" if g in fails else "PASS") for g in gates}
R["failures"] = fails
R["note_5s"] = "Teste dos 5 segundos é heurístico: confere se a primeira dobra tem marca, frase de explicação, busca e a pista explícita de 'o que já foi dito, com data, minuto do vídeo e fonte'. Não substitui teste com pessoas."
out = os.path.join(ROOT, "public-ui", "qa", "v5_qa_result.json")
json.dump(R, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(json.dumps(R["gates"], indent=1))
if fails:
    print(json.dumps(fails, ensure_ascii=False, indent=1))
sys.exit(1 if fails else 0)
