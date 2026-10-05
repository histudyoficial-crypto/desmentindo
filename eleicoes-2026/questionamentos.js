/* Eleições 2026 · contador de arquivos oficiais ainda não disponíveis (Q7).
   O HTML já traz o último snapshot conhecido no deploy. Aqui: busca o snapshot do acompanhamento horário (branch de dados)
   e o do próprio site; usa o mais recente; se ficar velho, diz há quanto tempo foi a última verificação. Nunca finge
   tempo real; falha de rede mantém o que está na tela. */
(function () {
  "use strict";
  var box = document.querySelector(".qcount"); if (!box) return;
  var nf = function (x) { return Number(x).toLocaleString("pt-BR"); };
  var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
  var br = function (iso) { var t = new Date(Date.parse(iso) - 3 * 3600e3); return p2(t.getUTCDate()) + "/" + p2(t.getUTCMonth() + 1) + "/" + t.getUTCFullYear() + ", " + p2(t.getUTCHours()) + ":" + p2(t.getUTCMinutes()); };
  var get = function (u) { return u ? fetch(u, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null); };
  var ok = function (d) { return d && typeof d.pendentes === "number" && d.atualizado_em && !isNaN(Date.parse(d.atualizado_em)); };
  function show(d) {
    var at = Date.parse(d.atualizado_em), h = (Date.now() - at) / 36e5, when = document.getElementById("qcWhen");
    if (Date.parse(box.getAttribute("data-at")) < at) {
      document.getElementById("qcPend").textContent = nf(d.pendentes);
      document.getElementById("qcRec").textContent = nf(d.recuperadas);
      document.getElementById("qcUF").textContent = Object.keys(d.pendentes_por_uf || {}).map(function (u) { return (u === "ZZ" ? "exterior" : u) + " " + nf(d.pendentes_por_uf[u]); }).join(" · ") || "—";
      box.setAttribute("data-at", d.atualizado_em);
    }
    var txt = "Última verificação: " + br(d.atualizado_em) + " (Brasília)";
    if (h >= 2) { txt += " — há " + (h < 48 ? Math.floor(h) + " horas" : Math.floor(h / 24) + " dias") + ". Este número pode ter mudado desde então."; when.className = "qwhen stale"; }
    if (d.verificacao_ok === false && d.ultima_tentativa) txt += " A tentativa de " + br(d.ultima_tentativa) + " não foi concluída; mostramos o último estado conhecido.";
    when.textContent = txt;
  }
  Promise.all([get(box.getAttribute("data-live")), get(box.getAttribute("data-src"))]).then(function (r) {
    var best = r.filter(ok).sort(function (a, b) { return Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em); })[0];
    show(best || { pendentes: 0, atualizado_em: box.getAttribute("data-at"), skip: 1 });
  });
})();
