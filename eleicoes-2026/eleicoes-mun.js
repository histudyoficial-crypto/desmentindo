/* Eleições 2026 · mapa por município — um componente para os dois turnos (e para a comparação lado a lado).
   Parâmetros vêm do HTML (data-*): eleição, turno, arquivo de dados, raiz das páginas. Geometria: malha oficial do IBGE
   (2025), simplificada no build e baixada uma única vez por página (cache em memória + ?v= do build). Dados: arquivos
   municipais oficiais do TSE reunidos no build (public-ui/build-eleicoes-mun.mjs); o detalhe por estado só é baixado
   quando um município daquele estado é aberto. Cor: escala neutra; o mais votado é identificado por nome, padrão e
   legenda, nunca por cor de partido ou lado (Plano Diretor §32.2.4). Sem dado → "—" e hachura, nunca zero.
   Acesso sem mouse: busca por nome, escolha de estado e tabela; o mapa é complemento visual. */
(function () {
  "use strict";
  var SEQ = ["#F1EFEE", "#D9D4D0", "#B9B1AB", "#958A83", "#6E625C", "#463C38"];
  var LIDER = [{ fill: "#6E625C", pat: null, nome: "liso escuro" }, { fill: "url(#mmp-lin)", pat: "lin", nome: "listrado claro" },
    { fill: "url(#mmp-pto)", pat: "pto", nome: "pontilhado" }, { fill: "url(#mmp-xad)", pat: "xad", nome: "quadriculado" }];
  var CAMADAS = [
    { id: "lider", nome: "Mais votado", prov: "of" }, { id: "margem", nome: "Diferença 1º–2º", prov: "calc" },
    { id: "comp", nome: "Comparecimento", den: "do eleitorado apurado", col: 4, prov: "of" }, { id: "abst", nome: "Abstenção", den: "do eleitorado apurado", col: 5, prov: "of" },
    { id: "validos", nome: "Votos válidos", den: "do comparecimento", col: 6, prov: "of" }, { id: "brancos", nome: "Brancos", den: "do comparecimento", col: 7, prov: "of" },
    { id: "nulos", nome: "Nulos", den: "do comparecimento", col: 8, prov: "of" }];
  var UFN = { ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo", go: "Goiás",
    ma: "Maranhão", mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba", pr: "Paraná", pe: "Pernambuco", pi: "Piauí",
    rj: "Rio de Janeiro", rn: "Rio Grande do Norte", rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima", sc: "Santa Catarina", sp: "São Paulo", se: "Sergipe", to: "Tocantins" };
  var OFICIAL = '<span class="prov of" title="Número publicado pela Justiça Eleitoral">Dado oficial (TSE)</span>';
  var CALCULADO = '<span class="prov calc" title="Conta feita por esta página a partir de arquivos oficiais; não é número publicado pelo TSE">Métrica calculada pelo Eleições 2026</span>';
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fPct = function (v, d) { return v == null ? "—" : v.toFixed(d == null ? 2 : d).replace(".", ",") + "%"; };
  var fPP = function (v) { return v == null ? "—" : v.toFixed(2).replace(".", ",") + " p.p."; };
  var fInt = function (v) { return v == null ? "—" : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var fold = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); };
  var titulo = function (s) { return String(s).toLocaleLowerCase("pt-BR").replace(/(^|[\s\-'(])([a-zà-ú])/g, function (m, a, b) { return a + b.toLocaleUpperCase("pt-BR"); }).replace(/\b(D[aeo]s?|E)\b/g, function (w) { return w.toLowerCase(); }); };

  var cacheSvg = null, cacheJson = {};
  function getText(url) { return fetch(url, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }); }
  function getJson(url) { if (!cacheJson[url]) cacheJson[url] = fetch(url, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); return cacheJson[url]; }
  function geometria(url) { if (!cacheSvg) cacheSvg = getText(url); return cacheSvg; }
  function padroes() {
    if (document.getElementById("mmp-lin")) return;
    var d = document.createElement("div"); d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" focusable="false"><defs><pattern id="mmp-lin" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#D9D4D0"/><line x1="0" y1="0" x2="0" y2="5" stroke="#463C38" stroke-width="1.6"/></pattern>' +
      '<pattern id="mmp-pto" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#EFEBE8"/><circle cx="2" cy="2" r="1.1" fill="#463C38"/></pattern>' +
      '<pattern id="mmp-xad" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#B9B1AB"/><rect width="2" height="2" fill="#F1EFEE"/></pattern>' +
      '<pattern id="mmp-sd" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#FFF"/><path d="M0 3h6M3 0v6" stroke="#D9D4D0" stroke-width=".8"/></pattern></defs></svg>';
    document.body.appendChild(d);
  }

  // ---------------------------------------------------------------- valores por camada (só campos oficiais; margem = conta)
  function valor(r, lay) {
    if (!r || r[3] == null) return null;
    if (lay === "margem") return r[10] == null || r[12] == null ? null : Math.round((r[10] - r[12]) * 100) / 100;
    var c = CAMADAS.filter(function (x) { return x.id === lay; })[0]; return c && c.col ? r[c.col] : null;
  }
  function quintis(vs) { var s = vs.slice().sort(function (a, b) { return a - b; }), q = []; for (var i = 1; i < 5; i++) q.push(s[Math.floor((i * s.length) / 5)]); return q; }
  function classe(v, q) { if (v == null) return -1; for (var i = 0; i < q.length; i++) if (v < q[i]) return i; return q.length; }

  function Mapa(root) {
    this.root = root; this.d = root.dataset; this.lay = "lider"; this.uf = ""; this.sel = null; this.D = null; this.q = null; this.svg = null; this.ordLider = null;
    this.ui();
  }
  Mapa.prototype.ui = function () {
    var self = this, R = this.root, id = R.id || "mm";
    R.querySelector(".mm-camadas").innerHTML = CAMADAS.map(function (c) { return '<button type="button" data-lay="' + c.id + '" aria-pressed="' + (c.id === self.lay) + '">' + esc(c.nome) + "</button>"; }).join("");
    R.querySelector(".mm-uf").innerHTML = '<option value="">Brasil inteiro</option>' + Object.keys(UFN).sort(function (a, b) { return UFN[a].localeCompare(UFN[b], "pt-BR"); }).map(function (u) { return '<option value="' + u + '">' + esc(UFN[u]) + "</option>"; }).join("");
    R.querySelector(".mm-camadas").addEventListener("click", function (e) { var b = e.target.closest("button[data-lay]"); if (b) self.camada(b.getAttribute("data-lay"), true); });
    R.querySelector(".mm-uf").addEventListener("change", function (e) { self.estado(e.target.value, true); });
    var inp = R.querySelector(".mm-busca input"), ul = R.querySelector(".mm-busca ul");
    inp.addEventListener("input", function () {
      if (!self.lista) { ul.innerHTML = "<li>Carregando…</li>"; return; }
      var s = fold(inp.value.trim()); if (s.length < 2) { ul.innerHTML = ""; return; }
      var hits = self.lista.filter(function (x) { return x.f.indexOf(s) >= 0; }).slice(0, 8);
      ul.innerHTML = hits.length ? hits.map(function (x) { return '<li><button type="button" data-cdi="' + x.cdi + '">' + esc(titulo(x.nm)) + " · " + x.uf.toUpperCase() + "</button></li>"; }).join("") : "<li>Nenhum município com esse nome.</li>";
    });
    ul.addEventListener("click", function (e) { var b = e.target.closest("button[data-cdi]"); if (b) { self.selecionar(b.getAttribute("data-cdi"), { foco: true, hist: true }); ul.innerHTML = ""; inp.value = ""; } });
    R.querySelector(".mm-tab").addEventListener("click", function (e) { var b = e.target.closest("button[data-cdi]"); if (b) self.selecionar(b.getAttribute("data-cdi"), { foco: true, hist: true }); });
  };
  Mapa.prototype.carregar = function () {
    var self = this; if (this.carregando) return this.carregando;
    var host = this.root.querySelector(".mm-mapa");
    if (!this.d.dados) { host.innerHTML = '<p class="empty">' + esc(this.d.semDados || "Mapa por município ainda indisponível.") + "</p>"; this.root.classList.add("mm-off"); return (this.carregando = Promise.resolve(null)); }
    var t0 = performance.now();
    this.carregando = Promise.all([geometria(this.d.geo), getJson(this.d.dados)]).then(function (x) {
      self.D = x[1];
      // sem ids repetidos com mais de um mapa na página: código do município em data-c; padrões num <defs> único
      host.innerHTML = x[0].replace(/ id="m(\d{7})"/g, ' data-c="$1"').replace(/<title[^>]*>[\s\S]*?<\/title>/, "").replace(/<desc[^>]*>[\s\S]*?<\/desc>/, "");
      self.svg = host.querySelector("svg");
      ["role", "aria-labelledby"].forEach(function (a) { self.svg.removeAttribute(a); }); self.svg.setAttribute("aria-hidden", "true"); self.svg.setAttribute("focusable", "false");   // equivalente textual: busca, tabela e painel
      padroes();
      self.vb0 = self.svg.getAttribute("viewBox");
      self.lista = Object.keys(self.D.m).map(function (cdi) { var r = self.D.m[cdi]; return { cdi: cdi, nm: r[2], uf: r[0], f: fold(r[2]) }; }).sort(function (a, b) { return a.f < b.f ? -1 : a.f > b.f ? 1 : 0; });
      var cont = {}; Object.keys(self.D.m).forEach(function (k) { var l = self.D.m[k][9]; if (l != null && l >= 0) cont[l] = (cont[l] || 0) + 1; });
      self.ordLider = Object.keys(cont).map(Number).sort(function (a, b) { return a - b; }); self.contLider = cont;   // padrão pela ordem da cédula (estável), não pelo tamanho
      var tip = self.root.querySelector(".mm-tip");
      self.svg.addEventListener("pointermove", function (ev) { var t = ev.target, c = t.getAttribute && t.getAttribute("data-c"); if (ev.pointerType === "touch" || !c) { tip.hidden = true; return; }
        var r = self.D.m[c], b = self.root.querySelector(".mm-mapwrap").getBoundingClientRect();
        tip.innerHTML = "<b>" + esc(titulo(r[2])) + " · " + r[0].toUpperCase() + "</b><br>" + esc(self.rotulo(r)); tip.hidden = false;
        tip.style.left = Math.min(ev.clientX - b.left + 12, b.width - 220) + "px"; tip.style.top = (ev.clientY - b.top + 12) + "px"; });
      self.svg.addEventListener("pointerleave", function () { tip.hidden = true; });
      self.svg.addEventListener("click", function (ev) { var c = ev.target.getAttribute && ev.target.getAttribute("data-c"); if (c) self.selecionar(c, { hist: true }); });
      self.pintar(); self.root.classList.add("mm-ok");
      self.ms = Math.round(performance.now() - t0);
      return self;
    }).catch(function (e) {
      if (window.console) console.error("[eleicoes-mun]", e && e.stack || e);
      host.innerHTML = '<p class="empty">Não foi possível carregar o mapa por município agora (' + esc(e.message) + "). Os estados continuam no mapa acima.</p>";
      self.root.classList.add("mm-err"); return null;
    });
    return this.carregando;
  };
  Mapa.prototype.rotulo = function (r) {
    if (r[3] == null) return "Sem arquivo do TSE para este município";
    var p = r[3] < 100 ? " · parcial (" + fPct(r[3]) + " das seções)" : "";
    if (this.lay === "lider") return (r[9] === -1 ? "Empate entre os dois primeiros" : r[9] == null ? "—" : titulo(this.D.cands[r[9]].nm) + " " + fPct(r[10])) + p;
    if (this.lay === "margem") return (r[9] === -1 ? "Empate" : fPP(valor(r, "margem"))) + p;
    var c = CAMADAS.filter(function (x) { return x.id === this.lay; }, this)[0]; return c.nome + ": " + fPct(valor(r, this.lay)) + " " + c.den + p;
  };
  Mapa.prototype.pintar = function () {
    if (!this.svg) return;
    var self = this, lay = this.lay, D = this.D, paths = this.svg.querySelectorAll("path[data-c]"), vs = [], k;
    if (lay !== "lider") { for (k in D.m) { var v = valor(D.m[k], lay); if (v != null) vs.push(v); } this.q = quintis(vs); }
    for (var i = 0; i < paths.length; i++) {
      var r = D.m[paths[i].getAttribute("data-c")], f;
      if (!r || r[3] == null || r[9] == null) f = "url(#mmp-sd)";
      else if (lay === "lider") f = r[9] === -1 ? SEQ[0] : LIDER[Math.min(3, this.ordLider.indexOf(r[9]))].fill;
      else { var c = classe(valor(r, lay), this.q); f = c < 0 ? "url(#mmp-sd)" : SEQ[c + 1]; }
      paths[i].setAttribute("fill", f);
    }
    this.legenda(vs); this.tabela();
    var bt = this.root.querySelectorAll(".mm-camadas button"); for (i = 0; i < bt.length; i++) bt[i].setAttribute("aria-pressed", String(bt[i].getAttribute("data-lay") === lay));
    if (this.sel) this.detalhe(this.sel);
  };
  Mapa.prototype.legenda = function (vs) {
    var D = this.D, lay = this.lay, h, self = this, semArq = D.fonte.sem_arquivo.length;
    var parc = Object.keys(D.m).filter(function (k) { return D.m[k][3] != null && D.m[k][3] < 100; }).length;
    if (lay === "lider") {
      h = '<ul class="mm-leg-l">' + this.ordLider.map(function (ci, i) { var L = LIDER[Math.min(3, i)];
        return '<li><svg width="18" height="14" aria-hidden="true" focusable="false"><rect width="18" height="14" fill="' + (L.pat ? "url(#mmp-" + L.pat + ")" : L.fill) + '" stroke="#444141" stroke-width=".8"/></svg>' +
          "<b>" + esc(titulo(D.cands[ci].nm)) + "</b> (" + esc(D.cands[ci].n) + ") · mais votado em " + fInt(self.contLider[ci]) + " municípios <small>(" + L.nome + ")</small></li>"; }).join("") +
        '<li><svg width="18" height="14" aria-hidden="true" focusable="false"><rect width="18" height="14" fill="url(#mmp-sd)" stroke="#444141" stroke-width=".8"/></svg>Sem arquivo do TSE (quadriculado branco)</li></ul>';
      h = h.replace(/<svg width="18"/g, '<svg width="18" class="sw"');
      h += '<p class="note">' + OFICIAL + " Cada município pelo candidato com mais votos válidos no arquivo municipal do TSE. Cor neutra, com padrão diferente para cada nome: não indica partido nem lado. Área do município não representa número de eleitores.";
    } else {
      var c = CAMADAS.filter(function (x) { return x.id === lay; })[0], lo = vs.length ? Math.min.apply(null, vs) : null, hi = vs.length ? Math.max.apply(null, vs) : null, fmt = lay === "margem" ? fPP : fPct;
      h = '<div class="scale" aria-hidden="true"><span>' + fmt(lo) + "</span>" + SEQ.slice(1).map(function (s) { return '<i style="background:' + s + '"></i>'; }).join("") + "<span>" + fmt(hi) + "</span></div>" +
        '<p class="note">' + (lay === "margem" ? CALCULADO + " Diferença, em pontos percentuais dos votos válidos, entre o 1º e o 2º colocados em cada município (percentuais oficiais do TSE). A cor mostra só o tamanho da diferença, não quem está à frente."
          : OFICIAL + " " + c.nome + " em % " + c.den + ", campo do arquivo municipal do TSE.") +
        " Cinco faixas com o mesmo número de municípios; limites: " + this.q.map(function (v) { return fmt(v); }).join(" · ") + ".";
    }
    h += " " + (parc ? parc + " município(s) com arquivo parcial no TSE. " : "") + (semArq ? semArq + " sem arquivo (hachura). " : "") + "Arquivos municipais do TSE reunidos em " + esc(dataBR(D.fonte.coletado_em)) + ". Malha: IBGE, Malha Municipal Digital 2025 (CC BY 4.0), simplificada.</p>";
    this.root.querySelector(".mm-leg").innerHTML = h;
  };
  function dataBR(iso) { if (!iso) return "—"; var d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " (Brasília)"; }
  Mapa.prototype.tabela = function () {
    var el = this.root.querySelector(".mm-tab-body"), D = this.D, uf = this.uf, self = this; if (!el || !D) return;
    if (!uf) { el.innerHTML = '<p class="sub">Escolha um estado acima para ver os municípios dele em tabela.</p>'; return; }
    var ks = Object.keys(D.m).filter(function (k) { return D.m[k][0] === uf; }).sort(function (a, b) { return D.m[a][2].localeCompare(D.m[b][2], "pt-BR"); });
    el.innerHTML = '<div class="tablewrap"><table class="mm-t"><caption>' + esc(UFN[uf]) + ": " + ks.length + ' municípios</caption><thead><tr><th scope="col">Município</th><th scope="col">Mais votado</th><th scope="col">Diferença 1º–2º</th><th scope="col">Comparec.</th><th scope="col">Abstenção</th><th scope="col">Válidos</th><th scope="col">Brancos</th><th scope="col">Nulos</th></tr></thead><tbody>' +
      ks.map(function (k) { var r = D.m[k]; return '<tr><th scope="row"><button type="button" data-cdi="' + k + '">' + esc(titulo(r[2])) + "</button>" + (r[3] != null && r[3] < 100 ? " <small>parcial</small>" : "") + "</th><td>" +
        (r[9] == null ? "—" : r[9] === -1 ? "empate" : esc(titulo(D.cands[r[9]].nm)) + " " + fPct(r[10])) + "</td><td>" + fPP(valor(r, "margem")) + "</td><td>" + fPct(r[4]) + "</td><td>" + fPct(r[5]) + "</td><td>" + fPct(r[6]) + "</td><td>" + fPct(r[7]) + "</td><td>" + fPct(r[8]) + "</td></tr>"; }).join("") +
      "</tbody></table></div>";
  };
  Mapa.prototype.camada = function (lay, user) { if (!CAMADAS.some(function (c) { return c.id === lay; })) return; this.lay = lay; this.pintar(); if (user) this.hash(); this.emit("camada", lay); };
  Mapa.prototype.estado = function (uf, user) {
    this.uf = UFN[uf] ? uf : ""; this.root.querySelector(".mm-uf").value = this.uf;
    if (this.svg) {
      if (!this.uf) this.svg.setAttribute("viewBox", this.vb0);
      else { var ps = this.svg.querySelectorAll('path[data-uf="' + this.uf + '"]'), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (var i = 0; i < ps.length; i++) { var b = ps[i].getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); }
        var pad = Math.max(x1 - x0, y1 - y0) * 0.06; this.svg.setAttribute("viewBox", [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map(function (v) { return Math.round(v * 10) / 10; }).join(" ")); }
      this.svg.classList.toggle("zoom", !!this.uf);
    }
    this.tabela(); if (user) { this.hash(); this.emit("estado", this.uf); }
  };
  Mapa.prototype.selecionar = function (cdi, o) {
    o = o || {}; if (!this.D || !this.D.m[cdi]) return;
    this.sel = cdi; var old = this.svg && this.svg.querySelector(".sel"); if (old) old.classList.remove("sel");
    var p = this.svg && this.svg.querySelector('path[data-c="' + cdi + '"]');
    if (p) { p.classList.add("sel"); p.parentNode.appendChild(p); }
    var pin = this.svg && this.svg.querySelector(".mm-pin"); if (pin) pin.remove();
    if (p) { var bb = p.getBBox(); if (bb.width < 9 && bb.height < 9) {   // município pequeno (ex.: Fernando de Noronha): marca visível
      this.svg.insertAdjacentHTML("beforeend", '<circle class="mm-pin" cx="' + (bb.x + bb.width / 2).toFixed(1) + '" cy="' + (bb.y + bb.height / 2).toFixed(1) + '" r="9"/>'); } }
    if (o.zoom !== false && this.uf && this.uf !== this.D.m[cdi][0]) this.estado(this.D.m[cdi][0], false);
    this.detalhe(cdi, o.foco); if (o.hist) this.hash(); if (!o.silencioso) this.emit("municipio", cdi);
  };
  Mapa.prototype.detalhe = function (cdi, foco) {
    var self = this, D = this.D, r = D.m[cdi], el = this.root.querySelector(".mm-det"), raiz = this.d.raiz || "/eleicoes-2026/";
    var cab = '<h3 tabindex="-1">' + esc(titulo(r[2])) + " · " + r[0].toUpperCase() + '</h3><p class="mm-cod">Código IBGE ' + cdi + " · código TSE " + esc(r[1]) + "</p>";
    var acoes = '<p class="mm-acoes"><a href="' + raiz + r[0] + "/#m=" + r[1] + '">Zonas e seções deste município →</a> <button type="button" class="linkbtn mm-share">Copiar link</button></p>';
    if (r[3] == null) { el.innerHTML = cab + '<p class="empty">O arquivo deste município não estava disponível no TSE quando os dados foram reunidos. Nenhum número é mostrado no lugar.</p>' + acoes; return this.fimDetalhe(foco); }
    el.innerHTML = cab + '<p class="sub">Carregando os números do município…</p>' + acoes; this.fimDetalhe(foco);
    getJson(this.d.ufTpl.replace("{uf}", r[0])).then(function (U) {
      if (self.sel !== cdi) return; var x = U.m[cdi]; if (!x) throw new Error("sem detalhe");
      var tinhaFoco = el.contains(document.activeElement);   // reescrever o painel não pode jogar o foco do teclado para o topo
      var ord = D.cands.map(function (c, i) { return { c: c, v: x.vap[i], p: x.pvap[i] }; }).filter(function (o) { return o.v != null; }).sort(function (a, b) { return b.v - a.v || a.c.seq - b.c.seq; });
      var st = x.s.pst != null && x.s.pst < 100 ? '<p class="mm-parcial"><b>Arquivo parcial no TSE:</b> ' + fPct(x.s.pst) + " das seções totalizadas (" + fInt(x.s.st) + " de " + fInt(x.s.ts) + "). Os números abaixo não são o resultado final do município.</p>" : "";
      el.innerHTML = cab + st + '<dl class="inds mm-inds">' + ind("Eleitorado apurado", fInt(x.e.esi), "") + ind("Comparecimento", fInt(x.e.c), fPct(x.e.pc) + " do eleitorado apurado") + ind("Abstenção", fInt(x.e.a), fPct(x.e.pa) + " do eleitorado apurado") +
        ind("Votos válidos", fInt(x.v.vv), fPct(x.v.pvvc) + " do comparecimento") + ind("Brancos", fInt(x.v.vb), fPct(x.v.pvb) + " do comparecimento") + ind("Nulos", fInt(x.v.tvn), fPct(x.v.ptvn) + " do comparecimento") + "</dl>" +
        '<div class="tablewrap"><table class="mm-cands"><caption>Votação no município (Presidente)</caption><thead><tr><th scope="col">Candidato</th><th scope="col">Votos</th><th scope="col">% dos válidos</th></tr></thead><tbody>' +
        ord.map(function (o) { return '<tr><th scope="row">' + esc(titulo(o.c.nm)) + " <small>" + esc(o.c.n) + "</small></th><td>" + fInt(o.v) + "</td><td>" + fPct(o.p) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        '<p class="note">' + OFICIAL + " Arquivo municipal do TSE gerado em " + esc(x.dg || "—") + " às " + esc(x.hg || "—") + (x.e.esni ? ". Em seções não instaladas: " + fInt(x.e.esni) + " eleitores" : "") + ". Todos os números são campos do arquivo oficial.</p>" + acoes;
      self.bindShare(); if (tinhaFoco) el.querySelector("h3").focus();
    }).catch(function () { if (self.sel === cdi) el.querySelector(".sub").textContent = "Não foi possível carregar os números deste município agora."; });
  };
  function ind(k, v, d) { return '<div class="ind"><dt>' + esc(k) + "</dt><dd><b>" + esc(v) + "</b>" + (d ? "<small>" + esc(d) + "</small>" : "") + "</dd></div>"; }
  Mapa.prototype.fimDetalhe = function (foco) { this.bindShare(); var h = this.root.querySelector(".mm-det h3"); if (foco && h) h.focus(); };
  Mapa.prototype.bindShare = function () {
    var b = this.root.querySelector(".mm-share"); if (!b || b.__ok) return; b.__ok = 1;
    b.addEventListener("click", function () { var u = location.href; if (navigator.share) navigator.share({ title: document.title, url: u }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { b.textContent = "Link copiado"; }).catch(function () {}); });
  };
  // estado na URL (#mun=…&camada=…&uf=…): voltar ao mapa e compartilhar sem perder a seleção
  Mapa.prototype.hash = function () {
    if (this.d.hash !== "on") return; var o = {}; if (this.sel) o.mun = this.sel; if (this.lay !== "lider") o.camada = this.lay; if (this.uf) o.uf = this.uf;
    var s = Object.keys(o).map(function (k) { return k + "=" + o[k]; }).join("&"); if (("#" + s) !== location.hash) history.pushState(null, "", location.pathname + (s ? "#" + s : ""));
  };
  Mapa.prototype.lerHash = function () {
    var o = {}; location.hash.replace(/^#/, "").split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) o[kv[0]] = decodeURIComponent(kv[1] || ""); });
    if (o.camada && o.camada !== this.lay) this.camada(o.camada, false);
    if ((o.uf || "") !== this.uf) this.estado(o.uf || "", false);
    if (o.mun && o.mun !== this.sel) this.selecionar(o.mun, { zoom: false });
    else if (!o.mun && this.sel) { this.sel = null; var s = this.svg && this.svg.querySelector(".sel"); if (s) s.classList.remove("sel"); this.root.querySelector(".mm-det").innerHTML = '<p class="sub">Escolha um município no mapa, na busca ou na tabela.</p>'; }
    return !!(o.mun || o.camada || o.uf);
  };
  Mapa.prototype.on = function (fn) { (this.ls = this.ls || []).push(fn); };
  Mapa.prototype.emit = function (t, v) { (this.ls || []).forEach(function (fn) { fn(t, v); }); };

  // ---------------------------------------------------------------- arranque: carrega quando o mapa chega perto da tela ou há estado na URL
  function iniciar(root) {
    var m = new Mapa(root); root.__mapa = m;
    var temHash = root.dataset.hash === "on" && /(^#|&)(mun|camada|uf)=/.test(location.hash);
    var go = function () { return m.carregar().then(function (x) { if (x && root.dataset.hash === "on") { var tinha = m.lerHash(); if (tinha && temHash) root.scrollIntoView({ block: "start" }); } }); };
    if (temHash || !("IntersectionObserver" in window)) go();
    else { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); } }, { rootMargin: "600px" }); io.observe(root); }
    if (root.dataset.hash === "on") window.addEventListener("hashchange", function () { if (m.D) m.lerHash(); });
    return m;
  }
  window.EleicoesMun = { iniciar: iniciar, Mapa: Mapa, valor: valor, quintis: quintis, classe: classe, CAMADAS: CAMADAS };
  var els = document.querySelectorAll(".mm[data-auto='on']"); for (var i = 0; i < els.length; i++) iniciar(els[i]);
})();
