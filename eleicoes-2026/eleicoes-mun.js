/* Eleições 2026 · mapa por município — um componente para os dois turnos (e para a comparação lado a lado).
   Parâmetros vêm do HTML (data-*): eleição, turno, arquivo de dados, raiz das páginas. Geometria: malha oficial do IBGE
   (2025), simplificada no build e baixada uma única vez por página (cache em memória + ?v= do build). Dados: arquivos
   municipais oficiais do TSE reunidos no build (public-ui/build-eleicoes-mun.mjs); o detalhe por estado só é baixado
   quando um município daquele estado é aberto. Cor: na camada "Mais votado", a cor do candidato (eleicoes-cores.js,
   decisão do proprietário de 22/10/2026), chapada — só diz QUEM foi o mais votado, nunca o tamanho da vitória. Camadas
   numéricas: escala própria, neutra, em cinco faixas. Sem dado → "—" e hachura, nunca zero.
   Movimento: só transform/opacity; sem animação com prefers-reduced-motion. Passar o mouse não muda dado nenhum.
   Acesso sem mouse: busca por nome, escolha de estado e tabela; o mapa é complemento visual. */
(function () {
  "use strict";
  var CORES = window.EleicoesCores || { de: function () { return { cor: "#8F8A88", tinta: "#5C5958", neutro: true }; }, sigla: function () { return null; } };
  var SEQ = ["#F1EFEE", "#DCD7D3", "#BEB6B0", "#978C85", "#6B605A", "#3F3632"];
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
  var RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var semMov = function () { return !!(RM && RM.matches); };
  var r1 = function (v) { return Math.round(v * 10) / 10; };

  var cacheSvg = null, cacheJson = {};
  function getText(url) { return fetch(url, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }); }
  function getJson(url) { if (!cacheJson[url]) cacheJson[url] = fetch(url, { cache: "force-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); return cacheJson[url]; }
  function geometria(url) { if (!cacheSvg) cacheSvg = getText(url); return cacheSvg; }
  function padroes() {
    if (document.getElementById("mmp-sd")) return;
    var d = document.createElement("div"); d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" focusable="false"><defs>' +
      '<pattern id="mmp-emp" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#E4E2E1"/><line x1="0" y1="0" x2="0" y2="5" stroke="#5C5958" stroke-width="1.4"/></pattern>' +
      '<pattern id="mmp-neu" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="5" height="5" fill="#8F8A88"/><line x1="0" y1="0" x2="0" y2="5" stroke="#F3F2F2" stroke-width="1.2"/></pattern>' +
      '<pattern id="mmp-sd" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#FFF"/><path d="M0 3h6M3 0v6" stroke="#C9C4C1" stroke-width=".8"/></pattern></defs></svg>';
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
  // cor do mais votado: pelo NÚMERO do candidato (a cor acompanha a pessoa); empate e sem arquivo têm padrão próprio
  function corCand(c) { var k = CORES.de(c.n); return k.neutro ? "url(#mmp-neu)" : k.cor; }
  function corLider(r, D) { if (!r || r[3] == null || r[9] == null) return "url(#mmp-sd)"; if (r[9] === -1) return "url(#mmp-emp)"; return corCand(D.cands[r[9]]); }
  function partido(c) { var s = CORES.sigla(c.n); return (s ? s + " · " : "") + c.n; }
  function amostra(f, cls) { return '<svg class="mm-sw' + (cls ? " " + cls : "") + '" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><rect width="14" height="14" fill="' + f + '"/></svg>'; }
  // caixa [x, y, largura, altura] alargada para a proporção do quadro (sem faixas vazias nem distorção)
  function caixa(b, asp) { var w = b[2], h = b[3]; if (h / w > asp) { var nw = h / asp; return [b[0] - (nw - w) / 2, b[1], nw, h]; } var nh = w * asp; return [b[0], b[1] - (nh - h) / 2, w, nh]; }

  function Mapa(root) {
    this.root = root; this.d = root.dataset; this.lay = "lider"; this.uf = ""; this.sel = null; this.D = null; this.q = null; this.svg = null; this.ordLider = null;
    this.host = root.querySelector(".mm-mapa"); this.vb = null; this.vb0 = null; this.anim = 0;
    this.ui();
  }
  Mapa.prototype.ui = function () {
    // controles são opcionais: na comparação lado a lado eles ficam fora dos mapas e acionam os dois (eleicoes-cmp.js)
    var self = this, R = this.root, q = function (s) { return R.querySelector(s); };
    if (q(".mm-camadas")) {
      q(".mm-camadas").innerHTML = CAMADAS.map(function (c) { return '<button type="button" data-lay="' + c.id + '" aria-pressed="' + (c.id === self.lay) + '">' + esc(c.nome) + "</button>"; }).join("");
      q(".mm-camadas").addEventListener("click", function (e) { var b = e.target.closest("button[data-lay]"); if (b) self.camada(b.getAttribute("data-lay"), true); });
    }
    if (q(".mm-uf")) { q(".mm-uf").innerHTML = opcoesUF(); q(".mm-uf").addEventListener("change", function (e) { self.estado(e.target.value, true); }); }
    if (q(".mm-busca")) busca(q(".mm-busca"), function () { return self.lista; }, function (cdi) { self.selecionar(cdi, { foco: true, hist: true }); });
    if (q(".mm-tab")) q(".mm-tab").addEventListener("click", function (e) { var b = e.target.closest("button[data-cdi]"); if (b) self.selecionar(b.getAttribute("data-cdi"), { foco: true, hist: true }); });
    if (q(".mm-zoom")) q(".mm-zoom").addEventListener("click", function (e) { var b = e.target.closest("button[data-z]"); if (!b || !self.svg) return; var z = b.getAttribute("data-z");
      if (z === "x") { self.fechar(false); self.limpar(); self.hash(); self.emit("limpar"); } else if (z === "0") self.estado("", true); else self.zoom(z === "+" ? 2 : 0.5); });
    if (q(".mm-fechar")) q(".mm-fechar").addEventListener("click", function () { self.fechar(true); });
    if (q(".mm-fundo")) q(".mm-fundo").addEventListener("click", function () { self.fechar(true); });
    R.addEventListener("keydown", function (e) { if (e.key === "Escape" && R.classList.contains("mm-aberto")) { e.preventDefault(); self.fechar(true); } });
  };
  function opcoesUF() { return '<option value="">Brasil inteiro</option>' + Object.keys(UFN).sort(function (a, b) { return UFN[a].localeCompare(UFN[b], "pt-BR"); }).map(function (u) { return '<option value="' + u + '">' + esc(UFN[u]) + "</option>"; }).join(""); }
  function busca(box, lista, escolher) {
    var inp = box.querySelector("input"), ul = box.querySelector("ul");
    inp.addEventListener("input", function () {
      var L = lista(); if (!L) { ul.innerHTML = "<li>Carregando…</li>"; return; }
      var s = fold(inp.value.trim()); if (s.length < 2) { ul.innerHTML = ""; return; }
      var hits = L.filter(function (x) { return x.f.indexOf(s) >= 0; }).sort(function (a, b) { return (a.f.indexOf(s) === 0 ? 0 : 1) - (b.f.indexOf(s) === 0 ? 0 : 1); }).slice(0, 8);
      ul.innerHTML = hits.length ? hits.map(function (x) { return '<li><button type="button" data-cdi="' + x.cdi + '">' + esc(titulo(x.nm)) + " <span>" + x.uf.toUpperCase() + "</span></button></li>"; }).join("") : '<li class="mm-nada">Nenhum município com esse nome.</li>';
    });
    inp.addEventListener("keydown", function (e) { if (e.key === "Escape" && ul.innerHTML) { e.stopPropagation(); ul.innerHTML = ""; } });
    ul.addEventListener("click", function (e) { var b = e.target.closest("button[data-cdi]"); if (b) { escolher(b.getAttribute("data-cdi")); ul.innerHTML = ""; inp.value = ""; } });
  }
  Mapa.prototype.carregar = function () {
    var self = this; if (this.carregando) return this.carregando;
    var host = this.host;
    if (!this.d.dados) {
      var aviso = '<p class="empty mm-aviso">' + esc(this.d.semDados || "Mapa por município ainda indisponível.") + "</p>"; this.root.classList.add("mm-off");
      // comparação: o turno sem arquivos aparece como silhueta vazia (sem cor, sem número) com o aviso — nunca um mapa fictício
      if (this.d.espera === "geo" && this.d.geo) return (this.carregando = geometria(this.d.geo).then(function (s) {
        host.innerHTML = s.replace(/ id="m\d{7}"/g, "").replace(/<title[^>]*>[\s\S]*?<\/title>/, "").replace(/<desc[^>]*>[\s\S]*?<\/desc>/, "") + aviso;
        var sv = host.querySelector("svg"); sv.removeAttribute("role"); sv.removeAttribute("aria-labelledby"); sv.setAttribute("aria-hidden", "true"); sv.setAttribute("focusable", "false"); sv.classList.add("mm-vazio");
        self.root.classList.add("mm-espera"); return null;
      }).catch(function () { host.innerHTML = aviso; return null; }));
      host.innerHTML = aviso; return (this.carregando = Promise.resolve(null));
    }
    var t0 = performance.now();
    this.carregando = Promise.all([geometria(this.d.geo), getJson(this.d.dados)]).then(function (x) {
      self.D = x[1];
      // sem ids repetidos com mais de um mapa na página: código do município em data-c; padrões num <defs> único
      host.innerHTML = x[0].replace(/ id="m(\d{7})"/g, ' data-c="$1"').replace(/<title[^>]*>[\s\S]*?<\/title>/, "").replace(/<desc[^>]*>[\s\S]*?<\/desc>/, "");
      var sv = self.svg = host.querySelector("svg");
      ["role", "aria-labelledby"].forEach(function (a) { sv.removeAttribute(a); }); sv.setAttribute("aria-hidden", "true"); sv.setAttribute("focusable", "false");   // equivalente textual: busca, tabela e painel
      // por cima da malha: véu (atenua o resto no hover), seleção e hover — cópias do contorno, sem data-c
      var NS = "http://www.w3.org/2000/svg", mk = function (tag, cls, pai, antes) { var e = document.createElementNS(NS, tag); e.setAttribute("class", cls); pai.insertBefore(e, antes || null); return e; };
      var ufs = sv.querySelector(".ufs");
      self.veu = mk("rect", "mm-veu", sv, ufs); ["x", "y"].forEach(function (a) { self.veu.setAttribute(a, "-5000"); }); ["width", "height"].forEach(function (a) { self.veu.setAttribute(a, "20000"); });
      self.ov = mk("g", "mm-ov", sv); self.selo = mk("path", "mm-selo", self.ov); self.hov = mk("path", "mm-hov", self.ov);
      padroes();
      self.vb0 = caixa(sv.getAttribute("viewBox").split(/\s+/).map(Number), self.aspecto()); self.vb = self.vb0.slice(); sv.setAttribute("viewBox", self.vb.map(r1).join(" "));
      self.lista = Object.keys(self.D.m).map(function (cdi) { var r = self.D.m[cdi]; return { cdi: cdi, nm: r[2], uf: r[0], f: fold(r[2]) }; }).sort(function (a, b) { return a.f < b.f ? -1 : a.f > b.f ? 1 : 0; });
      var cont = {}; Object.keys(self.D.m).forEach(function (k) { var l = self.D.m[k][9]; if (l != null) cont[l] = (cont[l] || 0) + 1; });
      self.contLider = cont;
      // legenda: quem foi mais votado em mais municípios primeiro (a cor não muda com a ordem: é do candidato)
      self.ordLider = Object.keys(cont).map(Number).filter(function (i) { return i >= 0; }).sort(function (a, b) { return cont[b] - cont[a] || self.D.cands[a].seq - self.D.cands[b].seq; });
      self.eventos();
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
  Mapa.prototype.aspecto = function () { var r = this.host.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r.height / r.width : 0.904; };
  // ---------------------------------------------------------------- hover (mouse), clique/toque e arrasto quando há zoom
  Mapa.prototype.eventos = function () {
    var self = this, sv = this.svg, tip = this.root.querySelector(".mm-tip"), wrap = this.root.querySelector(".mm-mapwrap"), arr = null;
    var alvo = function (t) { return t && t.getAttribute ? t.getAttribute("data-c") : null; };
    var some = function () { if (self.hovC) self.emit("hover", null); self.hovC = null; wrap.classList.remove("mm-hovering"); if (tip) tip.classList.remove("on"); };
    sv.addEventListener("pointermove", function (ev) {
      if (arr) return self.arrastar(ev, arr);
      var c = alvo(ev.target);
      if (ev.pointerType === "touch" || !c) { if (!c) some(); return; }
      if (c !== self.hovC) { self.hovC = c; var p = ev.target; self.hov.setAttribute("d", p.getAttribute("d")); self.hov.setAttribute("fill", p.getAttribute("fill"));
        wrap.classList.add("mm-hovering"); if (tip) { tip.innerHTML = self.dica(c); tip.hidden = false; } self.emit("hover", c); }
      if (tip) { var b = wrap.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight, x = ev.clientX - b.left + 14, y = ev.clientY - b.top + 14;
        if (x + tw > b.width - 4) x = ev.clientX - b.left - tw - 14; if (y + th > b.height - 4) y = ev.clientY - b.top - th - 14;
        tip.style.transform = "translate3d(" + Math.round(Math.max(4, x)) + "px," + Math.round(Math.max(4, y)) + "px,0)"; tip.classList.add("on"); }
    });
    sv.addEventListener("pointerleave", some);
    sv.addEventListener("pointerdown", function (ev) { if (!ev.isPrimary || (ev.pointerType === "mouse" && ev.button !== 0) || !self.ampliado()) return; arr = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, mov: false }; });
    var solta = function () { if (!arr) return; var a = arr; arr = null; if (a.mov) { self.fimArrasto(a); self.arrastou = Date.now(); } };
    sv.addEventListener("pointerup", solta); sv.addEventListener("pointercancel", solta);
    sv.addEventListener("click", function (ev) { if (self.arrastou && Date.now() - self.arrastou < 250) return; var c = alvo(ev.target); if (c) self.selecionar(c, { hist: true, abrir: true }); });
  };
  // destaque coordenado (comparação): o mesmo município realçado no outro mapa, sem dica e sem mudar seleção
  Mapa.prototype.realce = function (c) {
    if (!this.svg) return; var wrap = this.root.querySelector(".mm-mapwrap"), p = c && this.svg.querySelector('path[data-c="' + c + '"]');
    if (!p) { wrap.classList.remove("mm-hovering"); return; }
    this.hov.setAttribute("d", p.getAttribute("d")); this.hov.setAttribute("fill", p.getAttribute("fill")); wrap.classList.add("mm-hovering");
  };
  Mapa.prototype.ampliado = function () { return !!(this.vb && this.vb0 && this.vb[2] < this.vb0[2] * 0.98); };
  Mapa.prototype.arrastar = function (ev, a) {
    var dx = ev.clientX - a.x, dy = ev.clientY - a.y;
    if (!a.mov) { if (Math.abs(dx) + Math.abs(dy) < 6) return; a.mov = true; try { this.svg.setPointerCapture(a.id); } catch (e) { /* segue sem captura */ }
      this.root.querySelector(".mm-mapwrap").classList.remove("mm-hovering"); var t = this.root.querySelector(".mm-tip"); if (t) t.classList.remove("on"); }
    a.dx = dx; a.dy = dy; this.svg.style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
  };
  Mapa.prototype.fimArrasto = function (a) {
    var k = this.host.getBoundingClientRect().width / this.vb[2], v = this.vb;
    this.svg.style.transform = ""; this.ir([v[0] - (a.dx || 0) / k, v[1] - (a.dy || 0) / k, v[2], v[3]], false);
  };
  Mapa.prototype.dica = function (c) {
    var r = this.D.m[c], l = "", lay = this.lay;
    var st = r[3] == null ? "Sem arquivo do TSE para este município" : r[3] < 100 ? "Arquivo parcial do TSE · " + fPct(r[3], 1) + " das seções" : "Arquivo do TSE · 100% das seções";
    if (r[3] != null && r[9] != null) {
      if (r[9] === -1) l = '<p class="mm-tip-l">' + amostra("url(#mmp-emp)") + "<span>Empate entre os dois primeiros</span></p>";
      else { var c0 = this.D.cands[r[9]]; l = '<p class="mm-tip-l">' + amostra(corCand(c0)) + "<span><b>" + esc(titulo(c0.nm)) + "</b> " + fPct(r[10]) + "<small> dos válidos · mais votado</small></span></p>"; }
    }
    if (lay !== "lider" && r[3] != null) {
      var cm = CAMADAS.filter(function (x) { return x.id === lay; })[0], v = valor(r, lay);
      l = '<p class="mm-tip-v"><small>' + esc(cm.nome) + "</small> <b>" + (lay === "margem" ? (r[9] === -1 ? "Empate" : fPP(v)) : fPct(v)) + "</b>" + (cm.den ? " <small>" + esc(cm.den) + "</small>" : "") + "</p>" + l;
    }
    return '<p class="mm-tip-t">' + esc(titulo(r[2])) + " <span>" + r[0].toUpperCase() + "</span></p>" + l + '<p class="mm-tip-s">' + esc(st) + "</p>";
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
    var lay = this.lay, D = this.D, paths = this.svg.querySelectorAll("path[data-c]"), vs = [], k, i;
    if (lay !== "lider") { for (k in D.m) { var v = valor(D.m[k], lay); if (v != null) vs.push(v); } this.q = quintis(vs); }
    for (i = 0; i < paths.length; i++) {
      var r = D.m[paths[i].getAttribute("data-c")], f;
      if (lay === "lider") f = corLider(r, D);
      else { var c = classe(valor(r, lay), this.q); f = c < 0 || !r || r[9] == null ? "url(#mmp-sd)" : SEQ[c + 1]; }
      paths[i].setAttribute("fill", f);
      if (r && r[3] != null && r[3] < 100) paths[i].classList.add("parc");   // arquivo parcial no TSE: contorno tracejado (todas as camadas)
    }
    // troca de camada: a nova pintura entra com um fade curto (opacity; nada com movimento reduzido)
    if (!semMov() && this.pintado) { var sv = this.svg; sv.classList.add("mm-entra"); requestAnimationFrame(function () { requestAnimationFrame(function () { sv.classList.remove("mm-entra"); }); }); }
    this.pintado = true;
    var s = this.sel && this.svg.querySelector('path[data-c="' + this.sel + '"]'); if (s) this.selo.setAttribute("fill", s.getAttribute("fill"));
    this.legenda(vs); this.tabela();
    var bt = this.root.querySelectorAll(".mm-camadas button[data-lay]"); for (i = 0; i < bt.length; i++) bt[i].setAttribute("aria-pressed", String(bt[i].getAttribute("data-lay") === lay));
    this.root.setAttribute("data-camada", lay);
    if (this.sel) this.detalhe(this.sel);
  };
  Mapa.prototype.legenda = function (vs) {
    var D = this.D, lay = this.lay, h, self = this, semArq = D.fonte.sem_arquivo.length, emp = this.contLider[-1] || 0;
    var parc = Object.keys(D.m).filter(function (k) { return D.m[k][3] != null && D.m[k][3] < 100; }).length;
    var fonte = " " + (parc ? parc + " município(s) com arquivo parcial no TSE. " : "") + "Arquivos municipais do TSE reunidos em " + esc(dataBR(D.fonte.coletado_em)) + ". Malha: IBGE, Malha Municipal Digital 2025 (CC BY 4.0), simplificada.";
    if (lay === "lider") {
      h = '<ul class="mm-leg-l mm-leg-c">' + this.ordLider.map(function (ci) { var c = D.cands[ci], k = CORES.de(c.n);
        return "<li>" + amostra(corCand(c)) + '<span class="mm-leg-n"><b>' + esc(titulo(c.nm)) + '</b> <span class="mm-pt">' + esc(partido(c)) + '</span></span><span class="mm-leg-q">mais votado em <b>' + fInt(self.contLider[ci]) + "</b> municípios" + (k.neutro ? " · sem cor de partido verificada (hachura)" : "") + "</span></li>"; }).join("") +
        (emp ? "<li>" + amostra("url(#mmp-emp)") + '<span class="mm-leg-n">Empate entre os dois primeiros</span><span class="mm-leg-q"><b>' + fInt(emp) + "</b> municípios</span></li>" : "") +
        (semArq ? "<li>" + amostra("url(#mmp-sd)", "mm-sw-b") + '<span class="mm-leg-n">Sem arquivo do TSE</span><span class="mm-leg-q"><b>' + fInt(semArq) + "</b> municípios</span></li>" : "") +
        (parc ? '<li><svg class="mm-sw" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><rect x="1" y="1" width="12" height="12" fill="none" stroke="#201E1D" stroke-width="1.5" stroke-dasharray="2 2"/></svg><span class="mm-leg-n">Arquivo parcial no TSE (contorno tracejado)</span><span class="mm-leg-q"><b>' + fInt(parc) + "</b> municípios</span></li>" : "") + "</ul>";
      h += '<p class="note">' + OFICIAL + " Cor = candidato com mais votos válidos no município, na cor do candidato. A cor só diz quem foi o mais votado: não mostra tamanho da vitória nem percentual (para isso, “Diferença 1º–2º”). Área do município não representa número de eleitores." + fonte + "</p>";
    } else {
      var c = CAMADAS.filter(function (x) { return x.id === lay; })[0], lo = vs.length ? Math.min.apply(null, vs) : null, hi = vs.length ? Math.max.apply(null, vs) : null, fmt = lay === "margem" ? fPP : fPct;
      var lim = [lo].concat(this.q, [hi]);
      h = '<div class="mm-escala" aria-hidden="true"><p class="mm-esc-t">' + esc(c.nome) + (c.den ? " · % " + esc(c.den) : " · pontos percentuais") + "</p><ol>" +
        SEQ.slice(1).map(function (s, i) { return '<li><i style="background:' + s + '"></i><span>' + fmt(lim[i]) + "</span></li>"; }).join("") + '<li class="mm-esc-f"><span>' + fmt(lim[5]) + "</span></li></ol>" +
        (semArq ? '<p class="mm-esc-x">' + amostra("url(#mmp-sd)", "mm-sw-b") + " sem arquivo do TSE</p>" : "") + "</div>" +
        '<p class="note">' + (lay === "margem" ? CALCULADO + " Diferença, em pontos percentuais dos votos válidos, entre o 1º e o 2º colocados em cada município (percentuais oficiais do TSE). A cor mostra só o tamanho da diferença, não quem está à frente."
          : OFICIAL + " " + c.nome + " em % " + c.den + ", campo do arquivo municipal do TSE.") +
        " Cinco faixas com o mesmo número de municípios; limites: " + this.q.map(function (v) { return fmt(v); }).join(" · ") + "." + fonte + "</p>";
    }
    this.root.querySelector(".mm-leg").innerHTML = h;
  };
  function dataBR(iso) { if (!iso) return "—"; var d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " (Brasília)"; }
  Mapa.prototype.tabela = function () {
    var el = this.root.querySelector(".mm-tab-body"), D = this.D, uf = this.uf; if (!el || !D) return;
    if (!uf) { el.innerHTML = '<p class="sub">Escolha um estado acima para ver os municípios dele em tabela.</p>'; return; }
    var ks = Object.keys(D.m).filter(function (k) { return D.m[k][0] === uf; }).sort(function (a, b) { return D.m[a][2].localeCompare(D.m[b][2], "pt-BR"); });
    el.innerHTML = '<div class="tablewrap"><table class="mm-t"><caption>' + esc(UFN[uf]) + ": " + ks.length + ' municípios</caption><thead><tr><th scope="col">Município</th><th scope="col">Mais votado</th><th scope="col">Diferença 1º–2º</th><th scope="col">Comparec.</th><th scope="col">Abstenção</th><th scope="col">Válidos</th><th scope="col">Brancos</th><th scope="col">Nulos</th></tr></thead><tbody>' +
      ks.map(function (k) { var r = D.m[k]; return '<tr><th scope="row"><button type="button" data-cdi="' + k + '">' + esc(titulo(r[2])) + "</button>" + (r[3] != null && r[3] < 100 ? " <small>parcial</small>" : "") + "</th><td>" +
        (r[9] == null ? "—" : r[9] === -1 ? "empate" : amostra(corCand(D.cands[r[9]])) + esc(titulo(D.cands[r[9]].nm)) + " " + fPct(r[10])) + "</td><td>" + fPP(valor(r, "margem")) + "</td><td>" + fPct(r[4]) + "</td><td>" + fPct(r[5]) + "</td><td>" + fPct(r[6]) + "</td><td>" + fPct(r[7]) + "</td><td>" + fPct(r[8]) + "</td></tr>"; }).join("") +
      "</tbody></table></div>";
  };
  Mapa.prototype.camada = function (lay, user) { if (!CAMADAS.some(function (c) { return c.id === lay; })) return; this.lay = lay; this.pintar(); if (user) this.hash(); this.emit("camada", lay); };
  // ---------------------------------------------------------------- enquadramento: transição por transform (GPU) e, no fim, viewBox nítido
  Mapa.prototype.ir = function (b, anim) {
    var sv = this.svg; if (!sv || !(b[2] > 0 && b[3] > 0)) return;   // mapa oculto (getBBox zerado): não mexe no enquadramento
    var v0 = this.vb0; b = caixa(b, this.aspecto());
    if (b[2] >= v0[2]) b = v0.slice();   // nunca mais aberto que o Brasil inteiro
    else { b[0] = Math.max(v0[0] - b[2] * 0.25, Math.min(b[0], v0[0] + v0[2] - b[2] * 0.75)); b[1] = Math.max(v0[1] - b[3] * 0.25, Math.min(b[1], v0[1] + v0[3] - b[3] * 0.75)); }
    var self = this, a = this.vb, tok = ++this.anim, W = this.host.getBoundingClientRect().width;
    var fim = function () { if (tok !== self.anim) return; sv.style.transition = ""; sv.style.transform = ""; self.vb = b; sv.setAttribute("viewBox", b.map(r1).join(" "));
      sv.classList.toggle("zoom", self.ampliado()); self.root.classList.toggle("mm-ampliado", self.ampliado()); self.emit("vista", b); };
    if (!anim || semMov() || !W || !a) return fim();
    var k1 = W / b[2], s = k1 / (W / a[2]);
    if (Math.abs(s - 1) < 0.01 && Math.abs(a[0] - b[0]) * k1 < 1 && Math.abs(a[1] - b[1]) * k1 < 1) return fim();
    sv.style.transformOrigin = "0 0"; sv.style.transition = "transform .34s cubic-bezier(.22,.7,.2,1)";
    requestAnimationFrame(function () { if (tok === self.anim) sv.style.transform = "translate3d(" + r1(k1 * (a[0] - b[0])) + "px," + r1(k1 * (a[1] - b[1])) + "px,0) scale(" + s.toFixed(4) + ")"; });
    var t = setTimeout(fim, 450); sv.addEventListener("transitionend", function f(e) { if (e.target !== sv) return; sv.removeEventListener("transitionend", f); clearTimeout(t); fim(); });
  };
  Mapa.prototype.zoom = function (f) {
    var a = this.vb, cx = a[0] + a[2] / 2, cy = a[1] + a[3] / 2, p = this.sel && this.svg.querySelector('path[data-c="' + this.sel + '"]');
    if (p && f > 1) { var bb = p.getBBox(), px = bb.x + bb.width / 2, py = bb.y + bb.height / 2; if (px > a[0] && px < a[0] + a[2] && py > a[1] && py < a[1] + a[3]) { cx = px; cy = py; } }
    var w = Math.max(this.vb0[2] / 32, a[2] / f), h = w * (a[3] / a[2]);
    this.ir([cx - w / 2, cy - h / 2, w, h], true);
  };
  Mapa.prototype.estado = function (uf, user) {
    this.uf = UFN[uf] ? uf : ""; var su = this.root.querySelector(".mm-uf"); if (su) su.value = this.uf;
    if (this.svg) {
      if (!this.uf) this.ir(this.vb0.slice(), true);
      else { var ps = this.svg.querySelectorAll('path[data-uf="' + this.uf + '"]'), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (var i = 0; i < ps.length; i++) { var b = ps[i].getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); }
        var pad = Math.max(x1 - x0, y1 - y0) * 0.06; this.ir([x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad], true); }
    }
    this.tabela(); if (user) { this.hash(); this.emit("estado", this.uf); }
  };
  Mapa.prototype.selecionar = function (cdi, o) {
    o = o || {}; if (!this.D || !this.D.m[cdi]) return;
    this.sel = cdi; var old = this.svg && this.svg.querySelector("path.sel"); if (old) old.classList.remove("sel");
    var p = this.svg && this.svg.querySelector('path[data-c="' + cdi + '"]');
    var pin = this.svg && this.svg.querySelector(".mm-pin"); if (pin) pin.remove();
    if (p) {
      p.classList.add("sel"); this.selo.setAttribute("d", p.getAttribute("d")); this.selo.setAttribute("fill", p.getAttribute("fill"));
      var selo = this.selo; selo.classList.remove("on"); if (semMov()) selo.classList.add("on"); else requestAnimationFrame(function () { selo.classList.add("on"); });
      var bb = p.getBBox(); if (bb.width < 9 && bb.height < 9) {   // município pequeno (ex.: Fernando de Noronha): marca visível
        this.ov.insertAdjacentHTML("beforeend", '<circle class="mm-pin" cx="' + (bb.x + bb.width / 2).toFixed(1) + '" cy="' + (bb.y + bb.height / 2).toFixed(1) + '" r="9"/>'); }
    }
    this.root.classList.add("mm-tem-sel");
    if (o.zoom !== false && this.uf && this.uf !== this.D.m[cdi][0]) this.estado(this.D.m[cdi][0], false);
    if (o.abrir || o.foco) this.abrir();
    this.detalhe(cdi, o.foco || (o.abrir && this.folha())); if (o.hist) this.hash(); if (!o.silencioso) this.emit("municipio", cdi);
  };
  // painel: coluna ao lado no desktop; folha inferior no celular/tablet, com fechar, Esc e toque fora
  Mapa.prototype.folha = function () { return !!this.root.querySelector(".mm-fechar") && !!(window.matchMedia && window.matchMedia("(max-width: 999px)").matches); };
  Mapa.prototype.abrir = function () { if (!this.root.querySelector(".mm-fechar")) return; this.root.classList.add("mm-aberto"); var f = this.root.querySelector(".mm-fundo"); if (f) f.hidden = false; };
  Mapa.prototype.fechar = function (user) {
    var estava = this.root.classList.contains("mm-aberto");
    this.root.classList.remove("mm-aberto"); var f = this.root.querySelector(".mm-fundo"); if (f) f.hidden = true;
    if (user) { this.limpar(estava && !semMov()); this.hash(); var i = this.root.querySelector(".mm-busca input"); if (i && estava && this.folha()) i.focus({ preventScroll: true }); }
  };
  Mapa.prototype.limpar = function (depois) {
    this.sel = null; var s = this.svg && this.svg.querySelector("path.sel"); if (s) s.classList.remove("sel");
    if (this.selo) { this.selo.classList.remove("on"); this.selo.removeAttribute("d"); }
    var pn = this.svg && this.svg.querySelector(".mm-pin"); if (pn) pn.remove(); this.root.classList.remove("mm-tem-sel");
    // folha descendo: o conteúdo só é trocado depois que ela sai da tela (sem salto visível durante a animação)
    var self = this, dt = this.root.querySelector(".mm-det"), vazio = function () { if (dt && !self.sel) dt.innerHTML = '<p class="sub mm-vazio-t">Escolha um município no mapa, na busca ou na tabela.</p>'; };
    if (depois) setTimeout(vazio, 340); else vazio();
  };
  Mapa.prototype.detalhe = function (cdi, foco) {
    var self = this, D = this.D, r = D.m[cdi], el = this.root.querySelector(".mm-det"), raiz = this.d.raiz || "/eleicoes-2026/";
    if (!el) return;
    var cab = '<div class="mm-dh"><p class="mm-k">' + esc(UFN[r[0]] || r[0].toUpperCase()) + " · Presidente · " + (D.turno === 2 ? "2º turno" : "1º turno") + '</p><h3 tabindex="-1">' + esc(titulo(r[2])) + " · " + r[0].toUpperCase() + '</h3><p class="mm-cod">Código IBGE ' + cdi + " · código TSE " + esc(r[1]) + "</p></div>";
    var acoes = '<p class="mm-acoes"><a class="mm-ir" href="' + raiz + r[0] + "/#m=" + r[1] + '">Zonas e seções deste município →</a> <button type="button" class="linkbtn mm-share">Copiar link</button></p>';
    var anima = function () { if (semMov()) return; el.classList.remove("mm-in"); void el.offsetWidth; el.classList.add("mm-in"); };
    if (r[3] == null) { el.innerHTML = cab + '<p class="empty">O arquivo deste município não estava disponível no TSE quando os dados foram reunidos. Nenhum número é mostrado no lugar.</p>' + acoes; anima(); return this.fimDetalhe(foco); }
    if (!el.querySelector('[data-mm="' + cdi + '"]')) { el.innerHTML = cab + '<div class="mm-carrega" aria-hidden="true"><i></i><i></i><i></i></div><p class="sub">Carregando os números do município…</p>' + acoes; anima(); }
    this.fimDetalhe(foco);
    getJson(this.d.ufTpl.replace("{uf}", r[0])).then(function (U) {
      if (self.sel !== cdi) return; var x = U.m[cdi]; if (!x) throw new Error("sem detalhe");
      var tinhaFoco = el.contains(document.activeElement);   // reescrever o painel não pode jogar o foco do teclado para o topo
      var ord = D.cands.map(function (c, i) { return { c: c, v: x.vap[i], p: x.pvap[i] }; }).filter(function (o) { return o.v != null; }).sort(function (a, b) { return b.v - a.v || a.c.seq - b.c.seq; });
      var top = ord[0] && ord[0].p ? ord[0].p : 100;
      var st = x.s.pst != null && x.s.pst < 100 ? '<p class="mm-parcial"><b>Arquivo parcial no TSE:</b> ' + fPct(x.s.pst) + " das seções totalizadas (" + fInt(x.s.st) + " de " + fInt(x.s.ts) + "). Os números abaixo não são o resultado final do município.</p>"
        : '<p class="mm-st">' + OFICIAL + " 100% das seções totalizadas</p>";
      var emp = ord.length > 1 && ord[0].p != null && ord[0].p === ord[1].p;
      var lider = ord.length && ord[0].p != null ? '<div class="mm-lider' + (emp ? " mm-emp" : "") + '" style="--c:' + (emp ? "#5C5958" : CORES.de(ord[0].c.n).tinta) + '"><p class="mm-k">' + (emp ? "Empate entre os dois primeiros" : "Mais votado no município") + "</p>" +
        (emp ? "" : '<p class="mm-lider-n">' + esc(titulo(ord[0].c.nm)) + ' <span class="mm-pt">' + esc(partido(ord[0].c)) + '</span></p><p class="mm-lider-v"><b>' + fPct(ord[0].p) + "</b> dos votos válidos · " + fInt(ord[0].v) + " votos</p>") + "</div>" : "";
      el.innerHTML = '<div data-mm="' + cdi + '">' + cab + st + lider +
        '<div class="tablewrap mm-cw"><table class="mm-cands"><caption>Votação no município (Presidente)</caption><thead><tr><th scope="col">Candidato</th><th scope="col">Votos</th><th scope="col">% dos válidos</th></tr></thead><tbody>' +
        ord.map(function (o) { var k = CORES.de(o.c.n), w = o.p == null ? 0 : Math.max(0.6, o.p / top * 100);
          return '<tr><th scope="row"><span class="mm-cn">' + amostra(corCand(o.c)) + esc(titulo(o.c.nm)) + " <small>" + esc(partido(o.c)) + '</small></span><span class="mm-barra" aria-hidden="true"><i style="width:' + w.toFixed(1) + "%;background:" + k.cor + '"></i></span></th><td>' + fInt(o.v) + "</td><td>" + fPct(o.p) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        '<dl class="inds mm-inds">' + ind("Eleitorado apurado", fInt(x.e.esi), "") + ind("Comparecimento", fInt(x.e.c), fPct(x.e.pc) + " do eleitorado apurado") + ind("Abstenção", fInt(x.e.a), fPct(x.e.pa) + " do eleitorado apurado") +
        ind("Votos válidos", fInt(x.v.vv), fPct(x.v.pvvc) + " do comparecimento") + ind("Brancos", fInt(x.v.vb), fPct(x.v.pvb) + " do comparecimento") + ind("Nulos", fInt(x.v.tvn), fPct(x.v.ptvn) + " do comparecimento") + "</dl>" +
        '<p class="note">' + OFICIAL + " Arquivo municipal do TSE gerado em " + esc(x.dg || "—") + " às " + esc(x.hg || "—") + (x.e.esni ? ". Em seções não instaladas: " + fInt(x.e.esni) + " eleitores" : "") + ". Todos os números são campos do arquivo oficial.</p>" + acoes + "</div>";
      self.bindShare(); if (tinhaFoco) el.querySelector("h3").focus({ preventScroll: true });
    }).catch(function () { if (self.sel === cdi) { var s = el.querySelector(".sub"); if (s) s.textContent = "Não foi possível carregar os números deste município agora."; } });
  };
  function ind(k, v, d) { return '<div class="ind"><dt>' + esc(k) + "</dt><dd><b>" + esc(v) + "</b>" + (d ? "<small>" + esc(d) + "</small>" : "") + "</dd></div>"; }
  Mapa.prototype.fimDetalhe = function (foco) { this.bindShare(); var h = this.root.querySelector(".mm-det h3"); if (foco && h) h.focus({ preventScroll: this.folha() }); };
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
    else if (!o.mun && this.sel) { this.fechar(false); this.limpar(); }
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
    reenquadrar(m);
    return m;
  }
  // quadro mudou de tamanho (rotação, janela): reenquadra sem animação na proporção nova
  function reenquadrar(m) { if (!("ResizeObserver" in window)) return; var w0 = 0; new ResizeObserver(function (es) { var w = Math.round(es[0].contentRect.width); if (m.svg && w0 && w && w !== w0) { m.vb0 = caixa(m.vb0, m.aspecto()); m.ir(m.vb.slice(), false); } w0 = w; }).observe(m.host); }
  window.EleicoesMun = { iniciar: iniciar, Mapa: Mapa, valor: valor, quintis: quintis, classe: classe, CAMADAS: CAMADAS, UFN: UFN, corLider: corLider, corCand: corCand, reenquadrar: reenquadrar,
    getJson: getJson, titulo: titulo, fold: fold, opcoesUF: opcoesUF, busca: busca, partido: partido, amostra: amostra, fmt: { pct: fPct, pp: fPP, int: fInt, esc: esc } };
  var els = document.querySelectorAll(".mm[data-auto='on']"); for (var i = 0; i < els.length; i++) iniciar(els[i]);
})();
