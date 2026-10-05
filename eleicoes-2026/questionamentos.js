/* Eleições 2026 · contador de arquivos oficiais ainda não disponíveis (dados publicados por revisão humana). */
(function () {
  "use strict";
  var box = document.querySelector(".qcount"); if (!box) return;
  var nf = function (x) { return Number(x).toLocaleString("pt-BR"); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  fetch(box.getAttribute("data-src"), { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) { document.getElementById("qcountnote").textContent = "Não foi possível carregar a contagem agora."; return; }
    document.getElementById("qcount").innerHTML =
      "<div><b>" + nf(d.base_madrugada_05_10) + "</b><span>sem arquivo na madrugada de 05/10</span></div>" +
      "<div><b>" + nf(d.recuperadas) + "</b><span>apareceram e foram conferidas</span></div>" +
      "<div><b>" + nf(d.pendentes) + "</b><span>ainda acompanhadas</span></div>";
    var t = d.atualizado_em ? new Date(d.atualizado_em) : null;
    document.getElementById("qcountnote").innerHTML = "Última checagem: " + (t ? esc(t.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })) + " (Brasília)" : "—") +
      ". Por estado: " + Object.keys(d.pendentes_por_uf).map(function (u) { return esc(u === "ZZ" ? "exterior" : u) + " " + nf(d.pendentes_por_uf[u]); }).join(" · ") + ". Status: ACOMPANHANDO.";
  }).catch(function () { document.getElementById("qcountnote").textContent = "Não foi possível carregar a contagem agora."; });
})();
