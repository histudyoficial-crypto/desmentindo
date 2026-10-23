/* Eleições 2026 · Institutos de pesquisa (2º turno): filtros, tipo de voto e dica dos pontos. A página já vem pronta do
   build (pontos, tabela e textos); aqui só se mostra/esconde o que existe e se lê a dica dos dados embutidos. Sem rede. */
(function () {
  var S = document.getElementById("pesquisas"); if (!S || !S.dataset.voto) return;
  var F = S.querySelector(".pq-filtros"), tip = S.querySelector(".pq-tip"), J = S.querySelector(".pq-dados");
  var D = []; try { D = JSON.parse(J ? J.textContent : "[]"); } catch (e) { D = []; }
  var br = function (d) { return d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "—"; };
  var pc = function (v) { return v == null ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; };
  var NOME = { "FLAVIO BOLSONARO": "Flávio Bolsonaro", "LULA": "Lula" };
  function aplica() {
    var voto = (F.querySelector("input[name=voto]:checked") || {}).value || "validos";
    S.dataset.voto = voto;
    S.querySelectorAll(".pq-tempo").forEach(function (g) { g.hidden = g.dataset.tipo !== voto; });
    var on = {}; F.querySelectorAll("input[name=inst]").forEach(function (c) { on[c.value] = c.checked; });
    var de = F.elements.de.value || "0", ate = F.elements.ate.value || "9", met = F.elements.metodo.value, reg = (F.elements.reg.value || "").replace(/\D/g, "");
    var ok = function (i, d, m, r) { return on[i] !== false && d >= de && d <= ate && (!met || m === met) && (!reg || r.replace(/\D/g, "").indexOf(reg) >= 0); };
    var n = 0, tot = 0;
    S.querySelectorAll(".pq-tab tbody tr[data-reg]").forEach(function (tr) {
      var v = ok(tr.dataset.inst, tr.dataset.ctx ? de : tr.dataset.dia, tr.dataset.metodo, tr.dataset.reg); tr.hidden = !v;   // contexto: fora da janela, sempre marcado
      if (!tr.dataset.ctx) { tot++; if (v) n++; }
    });
    S.querySelectorAll(".pt").forEach(function (g) { var p = D[+g.dataset.i]; g.classList.toggle("off", !p || !ok(p.i, p.d, p.me, p.r)); });
    var o = F.querySelector(".pq-cont"); if (o) o.textContent = n + " de " + tot + " pesquisas na janela";
  }
  function mostra(g) {
    var p = D[+g.dataset.i]; if (!p || !tip) return;
    var voto = S.dataset.voto, v = voto === "validos" ? (p.v || {}) : (p.t || {});
    var linhas = Object.keys(p.t || {}).map(function (c) { return "<li><b>" + (NOME[c] || c) + "</b> " + pc(v[c]) + "</li>"; }).join("");
    tip.innerHTML = "<b>" + p.i + "</b> · " + p.r + "<ul>" + linhas + "</ul><small>" + (voto === "validos" ? "votos válidos" + (p.vc ? " (calculado)" : "") : "votos totais") +
      "</small><dl><dt>Campo</dt><dd>" + br(p.c[0]) + "–" + br(p.c[1]) + "</dd><dt>Publicada</dt><dd>" + br(p.d) + (p.h ? " " + p.h : "") + (p.f ? " · " + p.f : "") +
      "</dd><dt>Entrevistas</dt><dd>" + (p.n ? Number(p.n).toLocaleString("pt-BR") : "—") + (p.m == null ? " · margem —" : " · ±" + String(p.m).replace(".", ",") + " p.p.") + (p.ic ? " · " + String(p.ic).replace(".", ",") + "%" : "") +
      "</dd><dt>Método</dt><dd>" + p.me + (p.mx ? " · " + p.mx : "") + "</dd>" + (p.ct ? "<dt>Contratante</dt><dd>" + p.ct + "</dd>" : "") + "</dl>";
    var box = S.querySelector(".pq-graf"), r = g.getBoundingClientRect(), b = box.getBoundingClientRect();
    tip.hidden = false; tip.classList.remove("mm-in"); void tip.offsetWidth; tip.classList.add("mm-in");
    var x = Math.min(Math.max(0, r.left - b.left + r.width / 2 - tip.offsetWidth / 2), b.width - tip.offsetWidth);
    tip.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(r.bottom - b.top + 8) + "px,0)";
    S.querySelectorAll(".pt").forEach(function (o) { o.classList.toggle("foco", D[+o.dataset.i] && D[+o.dataset.i].i === p.i); });
    S.classList.add("pq-foco");
  }
  function some() { if (tip) tip.hidden = true; S.classList.remove("pq-foco"); }
  S.querySelectorAll(".pt").forEach(function (g) {
    g.addEventListener("pointerenter", function () { mostra(g); }); g.addEventListener("pointerleave", some);
    g.addEventListener("focus", function () { mostra(g); }); g.addEventListener("blur", some);
  });
  F.addEventListener("input", aplica); F.addEventListener("change", aplica);
  F.addEventListener("reset", function () { setTimeout(aplica, 0); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") some(); });
  aplica();
})();
