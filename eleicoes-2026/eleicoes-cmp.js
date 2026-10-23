/* Eleições 2026 · Compare os turnos — dois mapas por município (mesmo componente eleicoes-mun.js) sincronizados: camada,
   estado e município escolhidos num valem para o outro. O painel compara o mesmo território nos dois turnos, cada número
   com o seu denominador (eleitorado apurado e comparecimento de CADA turno); a variação é em pontos percentuais e vem
   marcada como conta. Não mostra transferência de votos. Sem arquivos municipais do 2º turno → coluna "—" e aviso. */
(function () {
  "use strict";
  var EM = window.EleicoesMun; if (!EM) return;
  var F = EM.fmt, esc = F.esc;
  var root = document.getElementById("comparar"); if (!root) return;
  var ea = root.querySelector(".cmp-a"), eb = root.querySelector(".cmp-b"), painel = root.querySelector(".cmp-painel");
  var A = new EM.Mapa(ea), B = new EM.Mapa(eb), sel = null, sync = false;
  var CAM = ["comp", "abst", "validos", "brancos", "nulos", "lider", "margem"];

  var chips = root.querySelector(".cmp-camadas");
  chips.innerHTML = CAM.map(function (id) { var c = EM.CAMADAS.filter(function (x) { return x.id === id; })[0]; return '<button type="button" data-lay="' + id + '" aria-pressed="' + (id === "comp") + '">' + esc(c.nome) + "</button>"; }).join("");
  chips.addEventListener("click", function (e) { var b = e.target.closest("button[data-lay]"); if (!b) return; var l = b.getAttribute("data-lay");
    [A, B].forEach(function (m) { m.lay = l; m.pintar(); }); [].forEach.call(chips.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); });
  var su = root.querySelector(".cmp-uf"); su.innerHTML = EM.opcoesUF();
  su.addEventListener("change", function () { [A, B].forEach(function (m) { m.estado(su.value, false); }); });
  EM.busca(root.querySelector(".cmp-busca"), function () { return A.lista || B.lista; }, function (cdi) { escolher(cdi, true); });

  // seleção, enquadramento (zoom/arrasto) e destaque num mapa → o outro acompanha (sem laço de eventos)
  [[A, B], [B, A]].forEach(function (p) { p[0].on(function (t, v) { if (sync) return;
    if (t === "municipio") escolher(v, false);
    else if (t === "limpar") { sync = true; p[1].limpar(); sync = false; sel = null; painel.innerHTML = '<p class="sub">Escolha um município para comparar os dois turnos.</p>'; }
    else if (t === "vista" && p[1].svg && p[0].host.getBoundingClientRect().width > 0) { sync = true; p[1].ir(v.slice(), false); sync = false; }
    else if (t === "hover") p[1].realce(v); }); });
  // celular: um mapa por vez, com alternância 1º/2º turno (a seleção e a camada continuam valendo para os dois)
  var alt = root.querySelector(".cmp-alterna");
  if (alt) alt.addEventListener("click", function (e) { var b = e.target.closest("button[data-ver]"); if (!b) return; var v = b.getAttribute("data-ver"); root.setAttribute("data-ver", v);
    [].forEach.call(alt.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    var m = v === "b" ? B : A, o = v === "b" ? A : B; if (m.svg && o.vb) m.ir(o.vb.slice(), false); });
  function escolher(cdi, foco) {
    sync = true; sel = cdi;
    [A, B].forEach(function (m) { if (m.D && m.D.m[cdi]) { if (m.uf && m.uf !== m.D.m[cdi][0]) m.estado(m.D.m[cdi][0], false); m.selecionar(cdi, { silencioso: true, zoom: false }); } });
    sync = false; render(cdi, foco);
  }
  function uf(m, cdi) { return m.D && m.D.m[cdi] ? EM.getJson(m.d.ufTpl.replace("{uf}", m.D.m[cdi][0])).then(function (U) { return { D: m.D, x: U.m[cdi] || null }; }).catch(function () { return null; }) : Promise.resolve(null); }
  function render(cdi, foco) {
    var M = (A.D || B.D).m[cdi]; if (!M) return;
    painel.innerHTML = '<h3 tabindex="-1">' + esc(EM.titulo(M[2])) + " · " + M[0].toUpperCase() + '</h3><p class="sub">Carregando os dois turnos…</p>';
    if (foco) painel.querySelector("h3").focus();
    Promise.all([uf(A, cdi), uf(B, cdi)]).then(function (r) {
      if (sel !== cdi) return; var a = r[0], b = r[1];
      var linhas = [["Eleitorado apurado", "esi", "e", "int"], ["Comparecimento", "pc", "e", "pct", "do eleitorado apurado de cada turno"], ["Abstenção", "pa", "e", "pct", "do eleitorado apurado de cada turno"],
        ["Votos válidos", "pvvc", "v", "pct", "do comparecimento de cada turno"], ["Brancos", "pvb", "v", "pct", "do comparecimento de cada turno"], ["Nulos", "ptvn", "v", "pct", "do comparecimento de cada turno"]];
      var g = function (o, k, w) { return o && o.x && o.x[w] ? o.x[w][k] : null; };
      var rows = linhas.map(function (l) { var va = g(a, l[1], l[2]), vb = g(b, l[1], l[2]), d = l[3] === "pct" && va != null && vb != null ? Math.round((vb - va) * 100) / 100 : null;
        return '<tr><th scope="row">' + esc(l[0]) + (l[4] ? "<small>" + esc(l[4]) + "</small>" : "") + "</th><td>" + (l[3] === "int" ? F.int(va) : F.pct(va)) + "</td><td>" + (l[3] === "int" ? F.int(vb) : F.pct(vb)) + "</td><td>" + (d == null ? "—" : (d > 0 ? "+" : "") + F.pp(d)) + "</td></tr>"; });
      // finalistas: os candidatos do arquivo do 2º turno, achados pelo número no 1º (cor = a do candidato, nos dois turnos)
      if (b && b.x) b.D.cands.forEach(function (c, i) { var ia = a && a.D ? a.D.cands.map(function (x) { return x.n; }).indexOf(c.n) : -1, va = ia >= 0 && a.x ? a.x.pvap[ia] : null, vb = b.x.pvap[i], d = va != null && vb != null ? Math.round((vb - va) * 100) / 100 : null;
        rows.push('<tr class="cmp-fin"><th scope="row">' + EM.amostra(EM.corCand(c)) + esc(EM.titulo(c.nm)) + " <small>" + esc(EM.partido(c)) + " · % dos válidos de cada turno</small></th><td>" + F.pct(va) + "</td><td>" + F.pct(vb) + "</td><td>" + (d == null ? "—" : (d > 0 ? "+" : "") + F.pp(d)) + "</td></tr>"); });
      // resumo: quem foi o mais votado no município em cada turno (do arquivo municipal de cada turno)
      var lid = function (o, rot) { var r = o && o.D && o.D.m[cdi]; if (!r || r[3] == null) return '<div class="cmp-l cmp-l-v"><p class="mm-k">' + rot + "</p><p>—</p></div>";
        if (r[9] === -1) return '<div class="cmp-l"><p class="mm-k">' + rot + "</p><p>" + EM.amostra("url(#mmp-emp)") + "Empate</p></div>";
        var c = o.D.cands[r[9]]; return '<div class="cmp-l"><p class="mm-k">' + rot + "</p><p>" + EM.amostra(EM.corLider(r, o.D)) + "<b>" + esc(EM.titulo(c.nm)) + "</b> " + F.pct(r[10]) + "</p></div>"; };
      var resumo = '<div class="cmp-res">' + lid(a, "Mais votado · 1º turno") + lid(b, "Mais votado · 2º turno") + "</div>";
      var nota2 = b && b.x ? "" : '<p class="cmp-aviso">2º turno: os arquivos municipais oficiais ainda não foram reunidos (isso acontece depois da totalização). Até lá, a coluna fica com “—”.</p>';
      var parc = [a, b].some(function (o) { return o && o.x && o.x.s.pst != null && o.x.s.pst < 100; }) ? '<p class="mm-parcial">Pelo menos um dos turnos tem arquivo parcial no TSE neste município; a comparação não é entre resultados finais.</p>' : "";
      painel.innerHTML = '<h3 tabindex="-1">' + esc(EM.titulo(M[2])) + " · " + M[0].toUpperCase() + "</h3>" + resumo + parc + nota2 +
        '<div class="tablewrap"><table class="cmp-t"><caption>O mesmo município nos dois turnos (Presidente)</caption><thead><tr><th scope="col">Indicador</th><th scope="col">1º turno</th><th scope="col">2º turno</th><th scope="col">Variação</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>" +
        '<p class="note"><span class="prov of">Dado oficial (TSE)</span> nas colunas de cada turno (arquivos municipais do TSE). <span class="prov calc">Métrica calculada pelo Eleições 2026</span> na variação: diferença em pontos percentuais, cada turno sobre a sua própria base. A comparação não mostra transferência de votos: a mesma pessoa pode ter mudado de voto, deixado de votar ou passado a votar.</p>';
      if (foco) painel.querySelector("h3").focus({ preventScroll: true });
      if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) { painel.classList.remove("mm-in"); void painel.offsetWidth; painel.classList.add("mm-in"); }
    });
  }
  // carga preguiçosa: a malha (a mesma, baixada uma vez) e os dados dos dois turnos só quando a seção se aproxima da tela
  A.lay = B.lay = "comp";
  var go = function () { Promise.all([A.carregar(), B.carregar()]); };
  EM.reenquadrar(A); EM.reenquadrar(B);
  if (!("IntersectionObserver" in window)) go();
  else { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); } }, { rootMargin: "600px" }); io.observe(root); }
})();
