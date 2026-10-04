/* DESMENTINDO v5 — três portas: AGORA · JÁ FALARAM SOBRE ISSO · PESQUISE O ARQUIVO.
   Dados: v5/data (gerados por public-ui/build-v5-data.mjs). Nunca baixa o arquivo completo de vídeos. */
(function () {
  "use strict";
  var main = document.getElementById("main");
  var cache = {};
  // Na raiz do site (index.html gerado por public-ui/build-root.mjs) os dados ficam em v5/data/.
  var BASE = (document.querySelector('meta[name="v5-base"]') || {}).content || "";
  var DV = (document.querySelector('meta[name="desmentindo-data-version"]') || {}).content || "";
  function load(p) {
    if (!cache[p]) cache[p] = fetch(BASE + "data/" + p + (DV ? (p.indexOf("?") < 0 ? "?v=" : "&v=") + DV : "")).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); });
    return cache[p];
  }
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function fdate(d) {
    if (!d) return "";
    var p = d.split("-");
    if (p.length === 1) return p[0];
    if (p.length === 2) return MES[+p[1] - 1] + " " + p[0];
    return +p[2] + " " + MES[+p[1] - 1] + " " + p[0];
  }
  function tdate(d) { return '<time datetime="' + e(d) + '">' + e(fdate(d)) + "</time>"; }
  function nf(n) { return Number(n).toLocaleString("pt-BR"); }
  function plural(n, a, b) { return nf(n) + " " + (n === 1 ? a : b); }
  function ext(url, label, cls) { return '<a class="' + (cls || "link") + '" href="' + e(url) + '" target="_blank" rel="noopener">' + label + "</a>"; }
  function tLabel(s) { var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0"); return h ? h + ":" + String(m).padStart(2, "0") + ":" + x : m + ":" + x; }
  function qparam(name) { var q = location.hash.split("?")[1] || ""; var m = new RegExp("(?:^|&)" + name + "=([^&]*)").exec(q); return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : ""; }

  // ---------------------------------------------------------------- medição de audiência (T3; D-01 de 04/10/2026)
  // Só existe quando a página declara <meta name="desmentindo-analytics">, gerado a partir de public-ui/analytics.json.
  // Umami Cloud: sem cookie, sem identificador próprio, sem dado pessoal. A URL enviada nunca leva o texto de uma busca
  // (a parte "?…" do #/rota fica de fora); os parâmetros utm_* do link original seguem para atribuir a origem.
  var AN = !!document.querySelector('meta[name="desmentindo-analytics"]');
  var anQ = [], anTimer = 0;
  function anFlush() {
    if (!AN) return;
    if (window.umami && typeof window.umami.track === "function") { while (anQ.length) { try { anQ.shift()(); } catch (x) { /* medição nunca quebra a página */ } } return; }
    if (anTimer) return;
    var tries = 0;
    anTimer = setInterval(function () {
      if ((window.umami && typeof window.umami.track === "function") || ++tries > 40) { clearInterval(anTimer); anTimer = 0; if (tries <= 40) anFlush(); else anQ = []; }
    }, 250);
  }
  function anUrl() { return location.pathname + location.search + location.hash.split("?")[0]; }
  function anPage() {
    if (!AN) return;
    // o título da página de busca contém o texto pesquisado: nunca é enviado
    var url = anUrl(), title = /^#\/busca/.test(location.hash || "") ? "Pesquisa · Desmentindo" : document.title;
    anQ.push(function () { window.umami.track(function (p) { p.url = url; p.title = title; return p; }); });
    anFlush();
  }
  function anEvent(name, data) {
    if (!AN) return;
    anQ.push(function () { window.umami.track(name, data); });
    anFlush();
  }
  // Leitura engajada (regra estável, documentada em Privacidade): numa página de FECHAMENTO ou MATÉRIA, pelo menos 60 s
  // com a aba visível E rolagem até a metade da página. Conta uma vez por visita à página.
  var ENG_SECONDS = 60, ENG_DEPTH = 0.5, eng = null;
  function pageKind() { var m = /^#\/(fechamento|materia)\/([^?#/]+)/.exec(location.hash || ""); return m ? { type: m[1], id: decodeURIComponent(m[2]) } : null; }
  function engStart() {
    if (eng && eng.iv) clearInterval(eng.iv);
    eng = null;
    var k = pageKind();
    if (!AN || !k) return;
    eng = { k: k, secs: 0, depth: 0, done: false };
    eng.iv = setInterval(function () {
      if (!eng || eng.done) return;
      if (document.visibilityState === "visible") eng.secs += 1;
      var de = document.documentElement, d = (window.scrollY + window.innerHeight) / Math.max(1, de.scrollHeight);
      if (d > eng.depth) eng.depth = d;
      if (eng.secs >= ENG_SECONDS && eng.depth >= ENG_DEPTH) {
        eng.done = true; clearInterval(eng.iv);
        anEvent("ENGAGED_READING", { type: eng.k.type, edition: eng.k.id });
      }
    }, 1000);
  }
  document.addEventListener("click", function (ev) {
    if (!AN) return;
    var a = ev.target.closest && ev.target.closest('a[href^="http"]');
    var k = pageKind();
    if (!a || !k || a.closest("li.said")) return; // trechos de vídeo contam como VIDEO_PLAY
    var host = ""; try { host = new URL(a.href).hostname.replace(/^www\d?\./, ""); } catch (x) { return; }
    if (host && host !== location.hostname) anEvent("SOURCE_CLICK", { type: k.type, host: host });
  }, true);

  // ---------------------------------------------------------------- componente: JÁ FALARAM SOBRE ISSO
  function saidItem(o, story, noWho) {
    return '<li class="said" data-src="' + e(o.source_name || "") + '" data-video="' + e(o.video_id) + '" data-t="' + o.t_seconds + '" data-date="' + e(o.date) + '">' +
      (story ? '<p class="said-story">Sobre <a href="#/historia/' + e(story.slug) + '">' + e(story.title) + "</a></p>" : "") +
      (noWho ? "" : '<p class="said-who">' + e(o.source_name) + "</p>") +
      '<p class="said-x">' + e(o.excerpt) + "</p>" +
      '<div class="said-foot"><span class="said-when">' + tdate(o.date) + " · " + e(o.t_label) + "</span>" +
      '<a class="go" data-play href="' + e(o.deep_link) + '" target="_blank" rel="noopener" aria-label="Ver trecho aqui, a partir de ' + e(o.t_label) + '">Ver trecho</a>' +
      '<a class="said-yt" href="' + e(o.deep_link) + '" target="_blank" rel="noopener">Assistir no YouTube <span aria-hidden="true">↗</span></a></div></li>';
  }
  // ---------------------------------------------------------------- vídeo no minuto, dentro da página (premissa do produto)
  // "Ver trecho" = player oficial do YouTube (modo de privacidade) dentro do próprio card, começando no minuto.
  // Nenhum iframe carrega antes do toque. "Assistir no YouTube" fica como ação secundária. Nada é baixado nem hospedado.
  // Se o player não carregar, o card diz isso e oferece o vídeo original no mesmo minuto.
  function inlinePlayer(box, videoId, t, label, deepLink) {
    if (box.querySelector(".vplayer")) return;
    var wrap = document.createElement("div");
    wrap.className = "vplayer";
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?start=" + (Math.max(0, parseInt(t, 10) || 0)) + "&autoplay=1&playsinline=1&rel=0";
    f.title = "Vídeo a partir de " + label;
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    var loaded = false;
    function fail() {
      if (loaded || !wrap.isConnected) return;
      wrap.className = "vplayer vfail";
      wrap.innerHTML = '<p>Não foi possível carregar o vídeo aqui.</p><a class="go" href="' + e(deepLink) + '" target="_blank" rel="noopener">Assistir no YouTube a partir de ' + e(label) + "</a>";
    }
    f.addEventListener("load", function () { loaded = true; });
    var timer = setTimeout(fail, 10000);
    f.addEventListener("load", function () { clearTimeout(timer); });
    wrap.appendChild(f);
    return wrap;
  }
  document.addEventListener("securitypolicyviolation", function (ev) {
    if (!/youtube/.test(ev.blockedURI || "")) return;
    [].forEach.call(document.querySelectorAll(".vplayer:not(.vfail)"), function (w) {
      var li = w.closest("[data-video]"), a = li && li.querySelector("a.said-yt"), when = li && li.querySelector(".said-when");
      var lbl = when ? when.textContent.split("·").pop().trim() : "";
      w.className = "vplayer vfail";
      w.innerHTML = '<p>Não foi possível carregar o vídeo aqui.</p>' + (a ? '<a class="go" href="' + e(a.href) + '" target="_blank" rel="noopener">Assistir no YouTube' + (lbl ? " a partir de " + e(lbl) : "") + "</a>" : "");
    });
  });
  // Em cada lista de trechos, o PRIMEIRO card já mostra o vídeo (miniatura oficial + play + minuto, sem iframe e sem autoplay);
  // os demais ficam compactos e abrem o player no próprio card ao tocar "Ver trecho". Um player aberto por lista.
  function whenLabel(li) { return (((li.querySelector(".said-when") || {}).textContent) || "").split("·").pop().trim(); }
  function posterFor(li) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "vposter";
    b.setAttribute("aria-label", "Ver trecho aqui, a partir de " + whenLabel(li));
    var img = document.createElement("img");
    img.alt = ""; img.loading = "lazy"; img.decoding = "async";
    img.src = "https://i.ytimg.com/vi/" + encodeURIComponent(li.getAttribute("data-video")) + "/hqdefault.jpg";
    img.addEventListener("error", function () { img.remove(); });
    b.appendChild(img);
    b.insertAdjacentHTML("beforeend", '<span class="vplay" aria-hidden="true"></span><span class="vts">' + e(whenLabel(li)) + "</span>");
    return b;
  }
  function primeLists(root) {
    [].forEach.call((root || document).querySelectorAll("ul.said-list"), function (ul) {
      if (ul.querySelector(".said-open")) return;
      // Um bloco = um card aberto: listas irmãs (ex.: anos em "Nos arquivos") só abrem a primeira.
      for (var sib = ul.previousElementSibling; sib; sib = sib.previousElementSibling) if (sib.matches("ul.said-list")) return;
      var li = ul.querySelector("li.said[data-video]");
      if (!li) return;
      li.classList.add("said-open");
      li.insertBefore(posterFor(li), li.querySelector(".said-foot"));
      var go = li.querySelector("a.go[data-play]");
      if (go) go.hidden = true;
    });
  }
  function closeOthers(li) {
    var ul = li.closest("ul.said-list");
    if (!ul) return;
    [].forEach.call(ul.querySelectorAll("li.said .vplayer"), function (w) {
      var o = w.closest("li.said");
      if (o === li) return;
      w.remove();
      if (o.classList.contains("said-open")) o.insertBefore(posterFor(o), o.querySelector(".said-foot"));
      else { var g = o.querySelector("a.go[data-play]"); if (g) g.hidden = false; }
    });
  }
  function play(li, deepLink) {
    closeOthers(li);
    var p = inlinePlayer(li, li.getAttribute("data-video"), li.getAttribute("data-t"), whenLabel(li), deepLink);
    if (!p) return;
    var poster = li.querySelector(".vposter");
    if (poster) poster.replaceWith(p); else li.insertBefore(p, li.querySelector(".said-foot"));
    var pk = pageKind();
    anEvent("VIDEO_PLAY", { type: pk ? pk.type : (location.hash.split("/")[1] || "home").split("?")[0] });
    var go = li.querySelector("a.go[data-play]");
    if (go) go.hidden = true;
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest && ev.target.closest("a.go[data-play], button.vposter");
    if (!t || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
    var li = t.closest("li.said[data-video]");
    if (!li) return;
    ev.preventDefault();
    var yt = li.querySelector("a.said-yt");
    play(li, (yt && yt.getAttribute("href")) || t.getAttribute("href"));
  });
  // Listas montadas depois (busca, "Mostrar mais", troca de rota) também ganham o primeiro card aberto.
  new MutationObserver(function () { primeLists(document); }).observe(document.documentElement, { childList: true, subtree: true });
  // Status de fonte primária calculado por afirmação ↔ fonte (no backend); aqui só o texto público de cada estado.
  var EV_NOTE = {
    AVAILABLE: "",
    PARTIAL: "Parte das afirmações tem documento oficial entre as fontes; o restante vem do conteúdo público das matérias citadas.",
    NOT_AVAILABLE: "Com base no conteúdo público das matérias citadas. A fonte primária (decisão, petição ou documento) ainda não foi obtida."
  };
  var NOTE = '<p class="quiet">O texto resume o que é dito naquele minuto. Confira no vídeo.</p>';

  // ---------------------------------------------------------------- estados epistêmicos (handoff §5)
  // Selo da afirmação: forma + palavra. Valor desconhecido → EM CHECAGEM (nunca estado conclusivo).
  var SELO = {
    DOCUMENTADO: ["■", "Documentado"],
    PARCIALMENTE_DOCUMENTADO: ["◧", "Parcialmente documentado"],
    AINDA_NAO_DA: ["?", "Ainda não dá para confirmar"],
    NAO_ENCONTRAMOS: ["□", "Não encontramos registro"],
    EM_CHECAGEM: ["◉", "Em checagem"]
  };
  var SELO_ORDER = ["DOCUMENTADO", "PARCIALMENTE_DOCUMENTADO", "AINDA_NAO_DA", "NAO_ENCONTRAMOS", "EM_CHECAGEM"];
  function seloKey(s) { return SELO[s] ? s : "EM_CHECAGEM"; }
  function checkedWhat(c) { return c === "FOI_DITO" ? "Checamos se foi dito" : c === "ACONTECEU" ? "Checamos se aconteceu" : ""; }
  function selo(s, check) {
    var k = seloKey(s), w = checkedWhat(check);
    return '<span class="selo s-' + k + '"><span aria-hidden="true">' + SELO[k][0] + "</span>" + SELO[k][1] + "</span>" + (w ? ' <span class="chkd">' + w + "</span>" : "");
  }
  var NAO_ENC_TXT = "Não encontramos registro nos arquivos consultados. Isso não significa que nunca aconteceu.";
  // Registro da história: alegação atribuída nunca aparece como fato.
  // Quem alegou / quem disse, resposta e fonte vêm do dado (sem inventar). "declaracao" = fala atribuída que não é
  // acusação; "atribuido" = classificação em revisão humana (rótulo neutro). Nunca sai como fato sem rótulo.
  var ATTR_TAG = { alegacao: ["tag-alleg", "Alegação atribuída", "Quem alega"], declaracao: ["tag-said", "Declaração atribuída", "Quem disse"], atribuido: ["tag-said", "Atribuído", "Segundo"] };
  function natTag(x) {
    if (!x || !x.allegation) return "";
    var a = x.attr || { kind: "alegacao" }, t = ATTR_TAG[a.kind] || ATTR_TAG.alegacao;
    return '<span class="tag ' + t[0] + '">' + t[1] + "</span> ";
  }
  function attrNote(x) {
    if (!x || !x.allegation || !x.attr) return "";
    var a = x.attr, t = ATTR_TAG[a.kind] || ATTR_TAG.alegacao;
    return '<p class="attr">' + (a.by ? "<b>" + t[2] + ":</b> " + e(a.by) : "") + (a.resp ? "<br><b>Resposta:</b> " + e(a.resp) : "") +
      (a.src ? '<br><b>Fonte:</b> <a href="' + e(a.src.url) + '" target="_blank" rel="noopener">' + e(a.src.outlet) + "</a>" : "") + "</p>";
  }
  var KIND = { Documento: ["k-doc", "▤"], "Fonte oficial": ["k-doc", "▤"], "Vídeo": ["k-vid", "▶"], "Opinião": ["k-src", "↗"] };
  function railCard(x) {
    var k = KIND[x.kind] || ["k-src", "↗"];
    return '<li class="' + k[0] + '"><span class="rk"><i aria-hidden="true">' + k[1] + "</i>" + e(x.kind || "Fonte") + "</span>" +
      '<span class="rt2">' + e(x.title) + '</span><span class="rm">' + e(x.outlet || "") + (x.date ? " · " + e(fdate(x.date)) : "") + "</span>" +
      '<a class="open" href="' + e(x.url) + '" target="_blank" rel="noopener">Abrir <span aria-hidden="true">→</span><span class="sr"> ' + e(x.title) + "</span></a></li>";
  }
  var SRC_RULE = '<p class="rule-note"><b>Fonte localizada</b>: isso, sozinho, não confirma a afirmação. <b>Documento localizado</b>: ainda precisamos verificar o que ele realmente sustenta.</p>';
  function smooth() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }
  function unavailable(arch) {
    var na = (arch || []).filter(function (a) { return !a.available; }).map(function (a) { return a.name; });
    if (!na.length) return "";
    return '<p class="na">' + e(na.join(" e ")) + ": arquivo" + (na.length > 1 ? "s" : "") + " ainda não disponíve" + (na.length > 1 ? "is" : "l") + " para pesquisa.</p>";
  }
  function archList(arch) {
    return '<ul class="arch">' + arch.map(function (a) {
      return '<li data-src="' + e(a.name) + '"><span class="an">' + e(a.name) + "</span>" + (a.available
        ? '<span class="as ok">' + (a.videos_total && a.videos_indexed < a.videos_total
            ? nf(a.videos_indexed) + " de " + nf(a.videos_total) + " vídeos disponíveis para pesquisa · cobertura parcial"
            : nf(a.videos_indexed) + " vídeos · pesquisa disponível") + "</span>"
        : '<span class="as">Arquivo ainda não disponível para pesquisa</span>') + "</li>";
    }).join("") + "</ul>";
  }
  // Lista com "mostrar mais" sem recarregar dados.
  function moreList(id, items, render, first) {
    var h = '<ul class="said-list" id="' + id + '">' + items.slice(0, first).map(render).join("") + "</ul>";
    if (items.length > first) h += '<button class="more-btn" data-more="' + id + '">Mostrar mais ' + nf(items.length - first) + "</button>";
    pending[id] = { items: items, render: render, shown: first };
    return h;
  }
  var pending = {};
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-more]");
    if (!b) return;
    var p = pending[b.getAttribute("data-more")], ul = document.getElementById(b.getAttribute("data-more"));
    if (!p || !ul) return;
    var next = p.items.slice(p.shown, p.shown + 10);
    ul.insertAdjacentHTML("beforeend", next.map(p.render).join(""));
    p.shown += next.length;
    if (p.shown >= p.items.length) b.remove(); else b.textContent = "Mostrar mais " + nf(p.items.length - p.shown);
  });

  function searchForm(q, id, big) {
    return '<form class="qform" role="search" data-search><label class="sr" for="' + id + '">Pesquisar</label>' +
      '<input id="' + id + '" name="q" type="search" value="' + e(q || "") + '" placeholder="Pesquise uma pessoa, assunto ou acontecimento" autocomplete="off"' + (big ? "" : "") + ">" +
      '<button type="submit">Pesquisar</button></form>';
  }
  document.addEventListener("submit", function (ev) {
    var f = ev.target.closest("[data-search]");
    if (!f) return;
    ev.preventDefault();
    var q = f.querySelector("input").value.trim();
    location.hash = "#/busca?q=" + encodeURIComponent(q);
  });

  var P = {};
  // ---------------------------------------------------------------- HOME
  // Edição editorial aprovada: JSON próprio publicado em /data/editorial/ (versionado pelo carimbo de build e
  // pelo sha256 do índice). Sem edição ou falha de leitura → null (nunca inventa conteúdo).
  var edPromise = null;
  function loadEdition() {
    if (!edPromise) edPromise = fetch("/data/editorial/index.json" + (DV ? "?v=" + DV : "")).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (idx) {
        var x = idx && idx.editions && idx.editions[0];
        if (!x || !/^data\/editorial\/edicoes\/\d{4}-\d{2}-\d{2}\.json$/.test(x.file)) return null;
        return fetch("/" + x.file + "?v=" + String(x.sha256 || "").slice(0, 12)).then(function (r) { return r.ok ? r.json() : null; });
      }).catch(function () { return null; });
    return edPromise;
  }
  function edItems(EDN) {
    return EDN && EDN.items && EDN.items.length ? EDN.items.map(function (it) {
      var ev = it.evidence || {};
      var st = ev.primary_source_status || (ev.primary_source_obtained ? "AVAILABLE" : "NOT_AVAILABLE");
      return { id: it.id, date: it.date, title: it.title, text: it.text, sources: it.sources || [], evidence: st };
    }) : [];
  }
  P.home = function () {
    var ED = loadEdition();
    return Promise.all([load("home.json"), ED, loadIdx("fechamentos"), loadIdx("materias"), loadTyped("fechamentos")]).then(function (res) {
      var H = res[0], EDN = res[1], FI = res[2], MI = res[3], LF = res[4];
      H.agora = edItems(EDN).length ? { edition: EDN.edition, label: EDN.label, items: edItems(EDN) } : null;
      var today = new Date(), wd = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][today.getDay()];
      var h = '<div class="sig" role="note"><div class="sig-in"><span>O que foi dito. Quando foi dito. E de onde veio.</span>' +
        '<time datetime="' + today.toISOString().slice(0, 10) + '">' + wd + " · " + today.getDate() + " " + MES[today.getMonth()] + " " + today.getFullYear() + "</time></div></div>";
      h += '<section class="hero"><h1 class="name">DESMENTINDO</h1><p class="motto">Notícias passam. O que foi dito fica.</p>' +
        searchForm("", "q-home", true) +
        '<p class="cue">Veja o que já foi dito sobre uma notícia, com a data, o minuto do vídeo e a fonte original.</p>' +
        '<p class="tries">Por exemplo: <a href="#/busca?q=Alexandre%20de%20Moraes">Alexandre de Moraes</a> · <a href="#/busca?q=INSS">INSS</a> · <a href="#/busca?q=Dark%20Horse">Dark Horse</a></p></section>';
      // FECHAMENTO = produto principal (decisão D-06, 04/10): o mais recente publicado vem antes do AGORA.
      // Sem edição fixa: o índice publicado diz qual é a última; a Home muda sozinha quando entra uma nova.
      if (LF && LF.edition_date) {
        var fu = "#/fechamento/" + LF.edition_date, pts = (LF.opening && LF.opening.points) || [];
        h += '<section class="sec fx-home" id="fechamento"><h2 class="h2">Fechamento <span class="meta" style="letter-spacing:0;text-transform:none;font-weight:400">· ' +
          e(fdate(LF.edition_date)) + (LF.cutoff_at ? ", verificado até " + e(fhm(LF.cutoff_at)) : "") + "</span></h2>" +
          '<p class="fx-home-t"><a href="' + e(fu) + '">' + e(LF.public_title) + "</a></p>" +
          (pts.length ? '<ol class="fx-open">' + pts.map(function (p) {
            return '<li><a href="' + e(fu + "#" + p.story) + '">' + e(p.text) + "</a></li>";
          }).join("") + "</ol>" : "") +
          '<p class="fx-home-go"><a class="link" href="' + e(fu) + '">Ler o fechamento completo</a></p></section>';
      }
      var A = H.agora && H.agora.items && H.agora.items.length ? H.agora : null;
      if (A) {
        // Edição editorial (JSON próprio, aprovada no Human Gate): texto aprovado + fontes. Nada interno.
        // AGORA não domina a Home: 3 itens com texto, o resto em linhas; cada item tem página própria (#/agora/<id>).
        var full = A.items.slice(0, 3), rest = A.items.slice(3);
        h += '<section class="sec" id="agora"><h2 class="h2">' + e(A.label || "Agora") + ' <span class="meta" style="letter-spacing:0;text-transform:none;font-weight:400">· edição de ' + e(fdate(A.edition)) + "</span></h2>" +
          '<ul class="ed-list">' + full.map(function (it) {
            return '<li class="ed-item" id="' + e(it.id) + '"><h3 class="ed-t"><a href="#/agora/' + e(it.id) + '">' + e(it.title) + "</a></h3>" +
              '<p class="meta">' + tdate(it.date) + "</p><p>" + e(it.text) + "</p>" +
              '<p class="src">Fontes: ' + it.sources.map(function (s) {
                return '<a href="' + e(s.url) + '" rel="noopener" target="_blank">' + e(s.name) + "</a>";
              }).join(" · ") + ' · <a class="link" href="#/agora/' + e(it.id) + '">documentos e detalhes</a></p>' +
              (EV_NOTE[it.evidence] ? '<p class="quiet ed-ev">' + EV_NOTE[it.evidence] + "</p>" : "") +
              "</li>";
          }).join("") + "</ul>" +
          (rest.length ? '<ul class="ed-rows">' + rest.map(function (it) {
            return '<li><a href="#/agora/' + e(it.id) + '"><span class="rt">' + e(it.title) + '</span><span class="rd">' + tdate(it.date) + "</span></a></li>";
          }).join("") + "</ul>" : "") + "</section>";
      }
      // Fechamento e matérias aprovados: só um atalho para a página própria (Home não muda de desenho).
      var fx = (LF ? [] : (FI && FI.items || []).slice(0, 1).map(function (x) { return { href: "#/fechamento/" + x.date, t: x.title, d: x.date }; }))
        .concat((MI && MI.items || []).slice(0, 3).map(function (x) { return { href: "#/materia/" + x.slug, t: x.title, d: x.date }; }));
      if (fx.length) h += '<section class="sec" id="' + (LF ? "materias" : "fechamento") + '"><h2 class="h2">' + (LF ? "Matérias" : "Fechamento e matérias") + '</h2><ul class="ed-rows">' + fx.map(function (x) {
        return '<li><a href="' + e(x.href) + '"><span class="rt">' + e(x.t) + '</span><span class="rd">' + tdate(x.d) + "</span></a></li>";
      }).join("") + "</ul></section>";
      if (H.hero) {
        h += '<section class="sec" id="' + (A ? "acompanhamento" : "agora") + '"><h2 class="h2">' + (A ? "Em acompanhamento" : "Agora") + (H.edition && !A ? ' <span class="meta" style="letter-spacing:0;text-transform:none;font-weight:400">· atualizado em ' + e(fdate(H.edition)) + "</span>" : "") + "</h2>" +
          '<article class="story-main"><a href="#/historia/' + e(H.hero.slug) + '"><span class="t">' + e(H.hero.title) + "</span></a>" +
          (H.hero.text ? "<p>" + e(H.hero.text) + "</p>" : "") +
          '<p class="meta" style="margin-top:8px">Último registro em ' + tdate(H.hero.lastD) + "</p>" +
          (H.hero.said ? '<a class="said-cue" href="#/historia/' + e(H.hero.slug) + '#ja-falaram">Já falaram sobre isso · ' + plural(H.hero.said, "trecho", "trechos") + "</a>" : "") + "</article>" +
          (H.more.length ? '<ul class="rows">' + H.more.map(function (s) {
            return '<li><a href="#/historia/' + e(s.slug) + '"><span class="rt">' + e(s.title) + '</span><span class="rd">' + tdate(s.lastD) + "</span></a></li>";
          }).join("") + "</ul>" : "") + "</section>";
      }
      if (H.said.length) {
        h += '<section class="sec" id="ja-falaram"><h2 class="h2">Já falaram sobre isso</h2>' +
          '<p style="margin:-6px 0 18px;color:var(--ink-2)">O que já foi dito sobre as histórias, com data e o minuto exato do vídeo.</p>' +
          '<ul class="said-list">' + H.said.map(function (s) { return saidItem(s.item, s); }).join("") + "</ul>" + NOTE +
          '<h3 class="h2" style="margin-top:34px">Nos arquivos</h3>' + archList(H.archives) +
          '<p class="quiet"><a class="link" href="#/arquivos">Ver tudo o que já está nos arquivos</a></p></section>';
      }
      return h;
    });
  };

  // ---------------------------------------------------------------- HISTÓRIA
  P.historia = function (slug) {
    return Promise.all([load("historia/" + slug + ".json"), load("home.json")]).then(function (r) {
      var s = r[0], arch = r[1].archives;
      document.title = s.title + " · Desmentindo";
      // EDITORIAL HERO, variante tipográfica do v4 (sem imagem no dado): fundo --ink, título, data do último registro
      // e cartão da fonte. Sem parágrafo dentro do hero; o resumo vem logo abaixo.
      var src0 = s.summary && s.summary.source;
      var h = '<section class="page-head hero-ink"><p class="kicker"><span class="tag tag-paper">História</span>' + (s.span ? " " + e(s.span.replace("–", " a ")) : "") + '</p><h1 class="h1">' + e(s.title) + "</h1>" +
        '<div class="hero-row">' + (s.lastD ? '<p class="bigdate"><span>Último registro</span><b>' + tdate(s.lastD) + "</b></p>" : "") +
        (src0 ? '<a class="hero-src" href="' + e(src0.url) + '" target="_blank" rel="noopener"><span class="rk"><i aria-hidden="true">↗</i>Fonte do resumo</span><span class="hs-t">' + e(src0.outlet || "fonte") + "</span><span>" + tdate(s.summary.date) + " · Abrir →</span></a>" : "") +
        "</div></section><section class=\"page-sub\">";
      if (s.summary) h += '<p class="summary">' + natTag(s.summary) + e(s.summary.text) + "</p>" + attrNote(s.summary);
      // Números com contexto (BIG NUMBER): navegacionais, nunca avaliação.
      h += '<div class="facts">' +
        '<div><p class="fl">Registros</p><p class="fv num">' + nf(s.records) + '</p><p class="fs">fatos e alegações guardados nesta história</p></div>' +
        '<div><p class="fl">Fontes</p><p class="fv num">' + nf(s.n_sources) + '</p><p class="fs">links que você pode abrir e conferir</p></div>' +
        "</div>";
      if (s.said.length) h += '<a class="jump" href="#ja-falaram" data-jump>Já falaram sobre isso · ' + plural(s.said.length, "trecho", "trechos") + "</a>";
      h += "</section>";
      if (s.known.length) {
        h += '<section class="sec"><h2 class="h2">O que sabemos</h2><ul class="items">' + s.known.map(function (k) {
          return "<li>" + tdate(k.date) + "<p>" + e(k.text) + "</p>" + (k.source ? '<p class="src"><span class="tag tag-fact">Fato com fonte</span> ' + ext(k.source.url, e(k.source.outlet || "fonte"), "") + "</p>" : "") + "</li>";
        }).join("") + "</ul></section>";
      }
      // JÁ FALARAM SOBRE ISSO
      if (s.said.length || s.people.length) {
        h += '<section class="sec" id="ja-falaram"><h2 class="h2">Já falaram sobre isso</h2>';
        if (s.said.length) {
          h += moreList("said-" + s.slug, s.said, function (o) { return saidItem(o); }, 3) + NOTE + '<p class="rule-note">Aparecer antes não prova o fato de hoje.</p>' + unavailable(arch);
          if (s.people.length) h += '<p class="people">Também nos arquivos: ' + s.people.map(person).join("") + "</p>";
        } else {
          h += '<p style="margin:0;color:var(--ink-2)">Ainda não ligamos trechos de vídeo a esta história. Pessoas citadas nela têm trechos nos arquivos:</p>' +
            '<p class="people">' + s.people.map(person).join("") + "</p>" + unavailable(arch);
        }
        h += "</section>";
      }
      if (s.found) {
        // DOCUMENT SPOTLIGHT: cartão tipográfico (a imagem do documento não existe no modelo); nunca redigitar o original.
        h += '<section class="sec"><h2 class="h2">O que encontramos</h2><div class="spot">' +
          '<div class="spot-doc"><div class="spot-page"><span class="gl" aria-hidden="true">▤</span><p>' + e(s.found.outlet || "") + "</p></div></div>" +
          '<div class="spot-txt"><p class="spot-k">O documento · ' + tdate(s.found.date) + '</p><p class="spot-t">' + e(s.found.title) + "</p>" +
          (s.found.says ? '<div class="spot-says"><b>O que ele diz</b>' + e(s.found.says.replace(/^["'“‘«]|["'”’»]$/g, "")) + "</div>" : "") +
          (s.found.context ? '<div class="spot-ctx"><b>O registro desta história</b>' + e(s.found.context) + "</div>" : "") +
          '<a class="btn-ink" href="' + e(s.found.url) + '" target="_blank" rel="noopener">Ver documento original</a>' +
          '<p class="rule-note"><b>Documento localizado</b>: ainda precisamos verificar o que ele realmente sustenta.</p></div></div></section>';
      }
      if (s.chrono.length) {
        // VISUAL TIMELINE: do mais antigo ao mais recente; o último marco é o "agora" (amarelo).
        h += '<section class="sec"><h2 class="h2">Cronologia</h2><ol class="tl">' + s.chrono.map(function (c, i) {
          return '<li' + (i === s.chrono.length - 1 ? ' class="now"' : "") + ">" + tdate(c.date) + natTag(c) + "<p>" + e(c.text) + "</p>" + attrNote(c) + "</li>";
        }).join("") + "</ol></section>";
      }
      if (s.sources.length) {
        h += '<section class="sec"><h2 class="h2">Fontes</h2><ul class="rail">' + s.sources.slice(0, 8).map(railCard).join("") + "</ul>" + SRC_RULE +
          (s.sources.length > 8 ? "<details><summary>Ver mais " + nf(s.sources.length - 8) + (s.sources_total > s.sources.length ? " (das " + nf(s.sources_total) + " fontes)" : "") + '</summary><ul class="srcs">' + s.sources.slice(8).map(function (x) {
            return '<li><span class="k">' + e(x.kind) + "</span>" + ext(x.url, e(x.title)) + (x.outlet ? ' <span class="meta">· ' + e(x.outlet) + "</span>" : "") + "</li>";
          }).join("") + "</ul></details>" : "") + "</section>";
      }
      if (s.updates.length) {
        h += '<section class="sec"><h2 class="h2">Atualizações</h2><ul class="upd">' + s.updates.map(function (u) {
          return '<li><span class="tag tag-ink">↻ Atualizado em ' + e(fdate(u.published)) + "</span> " + natTag(u) + "<p>" + e(u.text) + "</p>" + attrNote(u) + "</li>";
        }).join("") + "</ul></section>";
      }
      h += '<p class="transp"><span>' + plural(s.records, "registro", "registros") + "</span><span>" + plural(s.n_sources, "fonte", "fontes") + "</span>" +
        (s.lastPublished ? "<span>Atualizado em " + tdate(s.lastPublished) + "</span>" : "") + "</p>";
      return h;
    }, function () { return notFound(); });
  };
  function person(p) { return '<a href="#/arquivo/' + e(p.slug) + '">' + e(p.name) + ' <span class="c">' + nf(p.count) + "</span></a> "; }

  // ---------------------------------------------------------------- PESQUISA
  var STOPSET = null;
  function norm(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function qtokens(q, M) {
    if (!STOPSET) { STOPSET = {}; M.stop.forEach(function (w) { STOPSET[w] = 1; }); }
    var seen = {};
    return norm(q).split(" ").filter(function (t) { if (t.length < 2 || STOPSET[t] || seen[t]) return false; seen[t] = 1; return true; });
  }
  function shardKey(t, M) { var L = M.shard_len[t.slice(0, 2)] || 2; return t.length <= L ? t : t.slice(0, L); }
  function postings(t, M) {
    var k = shardKey(t, M);
    if (M.shards.indexOf(k) < 0) return Promise.resolve(null);
    return load("busca/t/" + k + ".json").then(function (S) {
      if (S[t]) return dec(S[t]);
      // Sem a palavra exata: aceita palavras que começam com ela (ex.: "moraes" ← "mora").
      if (t.length < 3) return null;
      var keys = Object.keys(S).filter(function (w) { return w.indexOf(t) === 0; });
      if (!keys.length) return null;
      return keys.map(function (w) { return dec(S[w]); }).reduce(union);
    });
  }
  function dec(p) {
    var a = [], acc = 0;
    (p[0] || []).forEach(function (d, i) { acc = i ? acc + d : d; a.push(acc); });
    return [a, p[1] || [], p[2] || [], p[3] || [], p[4] || []];
  }
  function uniq(arr) { var o = {}, r = []; arr.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r.sort(function (x, y) { return x - y; }); }
  function union(A, B) { return A.map(function (a, i) { return uniq(a.concat(B[i])); }); }
  function inter(a, b) { var i = 0, j = 0, r = []; while (i < a.length && j < b.length) { if (a[i] === b[j]) { r.push(a[i]); i++; j++; } else if (a[i] < b[j]) i++; else j++; } return r; }
  function run(q, M) {
    var toks = qtokens(q, M);
    if (!toks.length) return Promise.resolve(null);
    return Promise.all(toks.map(function (t) { return postings(t, M); })).then(function (lists) {
      if (lists.some(function (l) { return !l; })) return [[], [], [], [], []];
      return lists.reduce(function (A, B) { return A.map(function (a, i) { return inter(a, B[i]); }); });
    });
  }
  function segs(ids, M) {
    var need = uniq(ids.map(function (id) { return Math.floor(id / M.chunk); }));
    return Promise.all(need.map(function (c) { return load("busca/s/" + c + ".json"); })).then(function (chunks) {
      var by = {}; need.forEach(function (c, i) { by[c] = chunks[i]; });
      return ids.map(function (id) {
        var c = Math.floor(id / M.chunk), C = by[c], r = C.r[id - c * M.chunk], v = C.v[r[0]];
        var srcs = M.seg_sources || [{ name: M.ag_name }];
        return { source_name: (srcs[v[2] || 0] || srcs[0]).name, video_id: v[0], date: v[1], t_seconds: r[1], t_label: tLabel(r[1]), excerpt: r[2], deep_link: "https://www.youtube.com/watch?v=" + v[0] + "&t=" + r[1] + "s" };
      });
    });
  }
  P.busca = function () {
    var q = qparam("q");
    document.title = (q ? q + " · " : "") + "Pesquisa · Desmentindo";
    var head = '<section class="page-head"><h1 class="kicker">Pesquise o arquivo</h1>' + searchForm(q, "q-busca") + "</section>";
    if (!q) return load("home.json").then(function (H) {
      return head + '<section class="sec"><p style="margin:0">Pesquise uma pessoa, empresa, órgão, assunto ou acontecimento. Mostramos as histórias, o que já foi dito nos vídeos (com data e minuto) e os documentos.</p>' + archList(H.archives) + "</section>";
    });
    return load("busca/meta.json").then(function (M) {
      return run(q, M).then(function (R) {
        var h = head;
        if (!R) return h + '<section class="sec"><p class="empty">Digite ao menos uma palavra com duas letras ou mais.</p></section>';
        var stories = {}, order = [];
        R[2].forEach(function (k) { stories[k] = stories[k] || { k: k, n: 0, title: true }; stories[k].title = true; });
        R[1].forEach(function (ev) { (M.events[ev] || []).forEach(function (k) { stories[k] = stories[k] || { k: k, n: 0 }; stories[k].n++; }); });
        order = Object.keys(stories).map(function (k) { return stories[k]; }).filter(function (x) { return M.stories[x.k]; })
          .sort(function (a, b) { return (b.title ? 1 : 0) - (a.title ? 1 : 0) || b.n - a.n || (M.stories[b.k][2] || "").localeCompare(M.stories[a.k][2] || ""); });
        var storyRow = function (x) {
          var s = M.stories[x.k];
          return '<li><a href="#/historia/' + e(s[0]) + '"><span><span class="rt">' + e(s[1]) + "</span>" + (x.n ? '<br><span class="meta">' + plural(x.n, "registro menciona", "registros mencionam") + "</span>" : "") + '</span><span class="rd">' + tdate(s[2]) + "</span></a></li>";
        };
        var ag = R[0], persons = R[4].map(function (k) { return M.persons[k]; }), docs = R[3].map(function (k) { return M.docs[k]; });
        var any = order.length || ag.length || persons.length || docs.length;
        h += '<p class="meta" style="margin:14px 0 0">Resultados para “' + e(q) + "”</p>";
        if (order.length) {
          h += '<section class="group"><div class="group-h"><h2 class="h2">Agora</h2><span class="meta">' + plural(order.length, "história", "histórias") + '</span></div><ul class="rows" style="margin:0">' +
            order.slice(0, 3).map(storyRow).join("") + "</ul>" +
            (order.length > 3 ? '<details><summary>Ver mais ' + plural(order.length - 3, "história", "histórias") + '</summary><ul class="rows" style="margin:0">' +
              order.slice(3, 10).map(storyRow).join("") + "</ul></details>" : "") +
            '<p class="meta" style="margin:10px 0 0"><a class="link" href="#nos-arquivos" data-jump="nos-arquivos">O que já foi dito sobre isso ↓</a></p></section>';
        }
        h += '<section class="group" id="nos-arquivos"><div class="group-h"><h2 class="h2">Nos arquivos</h2></div>';
        persons.forEach(function (p) { h += '<p style="margin:0 0 10px"><a class="link" href="#/arquivo/' + e(p[1]) + '">' + e(p[0]) + ": " + plural(p[2], "trecho de vídeo reunido", "trechos de vídeo reunidos") + "</a></p>"; });
        // Um bloco por arquivo pesquisável, cada um com os SEUS trechos (faixa de ids do arquivo) e a sua cobertura.
        var srcs = M.seg_sources || [{ key: (M.archives.filter(function (a) { return a.available; })[0] || {}).key, start: 0, end: Infinity }];
        var byKey = {}; srcs.forEach(function (s) { byKey[s.key] = s; });
        var blocks = [];
        M.archives.forEach(function (a) {
          if (!a.available) return;
          var sr = byKey[a.key];
          var ids = sr ? ag.filter(function (id) { return id >= sr.start && id < sr.end; }) : [];
          var bi = blocks.length; blocks.push(ids);
          var cov = a.videos_total && a.videos_indexed < a.videos_total ? ' <span class="meta">· pesquisa em ' + nf(a.videos_indexed) + " de " + nf(a.videos_total) + " vídeos</span>" : "";
          h += '<div class="src-h"><strong>' + e(a.name) + "</strong>" + cov + '<span class="n" data-count="' + ids.length + '">' + (ids.length ? plural(ids.length, "trecho", "trechos") + " mencionam" : "nenhum trecho com essas palavras") + "</span></div>";
          if (ids.length) h += '<div id="ag-res-' + bi + '"><p class="meta">Carregando trechos…</p></div>';
        });
        h += unavailable(M.archives) + "</section>";
        if (docs.length) {
          h += '<section class="group"><div class="group-h"><h2 class="h2">Documentos</h2><span class="meta">' + plural(docs.length, "documento", "documentos") + '</span></div><ul class="srcs">' +
            docs.slice(0, 6).map(function (d) { return "<li>" + ext(d[2], e(d[0])) + ' <span class="meta">· ' + tdate(d[3]) + (d[1] ? " · " + e(d[1]) : "") + "</span></li>"; }).join("") + "</ul></section>";
        }
        if (!any) h += '<section class="sec"><p class="empty">Nada encontrado para “' + e(q) + '” nas histórias nem nos vídeos pesquisáveis. Isso não quer dizer que nunca foi dito.</p></section>';
        blocks.forEach(function (ag, bi) {
          if (!ag.length) return;
          setTimeout(function () {
            var box = document.getElementById("ag-res-" + bi);
            if (!box) return;
            var first = ag.slice(0, 6);
            segs(first, M).then(function (items) {
              // Resultado agrupado por ANO, do mais recente ao mais antigo (busca por nome = onde aparece, nunca "tudo sobre").
              var yState = { y: null };
              var byYear = function (list) { return list.map(function (o) { var y = (o.date || "").slice(0, 4), h0 = y && y !== yState.y ? '<li class="yr">' + e(y) + "</li>" : ""; if (y) yState.y = y; return h0 + saidItem(o, null, true); }).join(""); };
              box.innerHTML = '<ul class="said-list" id="ag-list-' + bi + '">' + byYear(items) + "</ul>" +
                (ag.length > first.length ? '<button class="more-btn" id="ag-more-' + bi + '">Mostrar mais ' + nf(ag.length - first.length) + "</button>" : "") + NOTE;
              var shown = first.length, btn = document.getElementById("ag-more-" + bi);
              if (btn) btn.addEventListener("click", function () {
                var next = ag.slice(shown, shown + 10);
                segs(next, M).then(function (more) {
                  document.getElementById("ag-list-" + bi).insertAdjacentHTML("beforeend", byYear(more));
                  shown += next.length;
                  if (shown >= ag.length) btn.remove(); else btn.textContent = "Mostrar mais " + nf(ag.length - shown);
                });
              });
            }, function () { box.innerHTML = '<p class="empty">Não conseguimos carregar os trechos agora. É uma falha nossa, não “nada encontrado”. Tente de novo.</p>'; });
          }, 0);
        });
        return h;
      });
    });
  };

  // ---------------------------------------------------------------- ARQUIVO DE UMA PESSOA (consulta, sem perfil)
  P.arquivo = function (slug) {
    return load("arquivo/" + slug + ".json").then(function (A) {
      document.title = A.name + " nos arquivos · Desmentindo";
      var h = '<section class="page-head"><p class="kicker">Nos arquivos</p><h1 class="h1">' + e(A.name) + "</h1>" +
        '<p class="lead">' + plural(A.count, "trecho", "trechos") + " de " + e(A.source_name) + " citam " + e(A.name) + ", em " + plural(A.videos, "vídeo", "vídeos") + ". Do mais recente ao mais antigo.</p>" +
        '<p class="quiet">Ser citado não indica culpa, nem posição de quem fala. ' + (A.archives.length ? e(A.archives.join(" e ")) + ": arquivos ainda não disponíveis para pesquisa. " : "") +
          (A.not_here && A.not_here.length ? e(A.not_here.join(" e ")) + ": ainda não reunido nesta página; use a pesquisa." : "") + "</p></section>";
      if (A.stories.length) {
        h += '<section class="sec"><h2 class="h2">Nas histórias</h2><ul class="rows" style="margin:0">' + A.stories.map(function (s) {
          return '<li><a href="#/historia/' + e(s.slug) + '"><span class="rt">' + e(s.title) + '</span><span class="rd">' + tdate(s.lastD) + "</span></a></li>";
        }).join("") + "</ul></section>";
      }
      var by = {}, years = [];
      A.occ.forEach(function (o) { var y = o.date.slice(0, 4); if (!by[y]) { by[y] = []; years.push(y); } by[y].push(Object.assign({ source_name: A.source_name }, o)); });
      h += '<section class="sec"><h2 class="h2">O que foi dito</h2>' + years.map(function (y, i) {
        var list = moreList("y" + y, by[y], function (o) { return saidItem(o); }, i === 0 ? 5 : 3);
        return '<h3 class="year">' + e(y) + ' <span class="meta" style="font-stretch:100%;font-weight:400;font-size:14px">' + plural(by[y].length, "trecho", "trechos") + "</span></h3>" + list;
      }).join("") + NOTE + "</section>";
      return h;
    }, function () { return notFound(); });
  };

  // ---------------------------------------------------------------- JÁ FALARAM SOBRE ISSO (porta)
  P.arquivos = function () {
    document.title = "Já falaram sobre isso · Desmentindo";
    return load("arquivos.json").then(function (A) {
      var h = '<section class="page-head"><p class="kicker">Já falaram sobre isso</p><h1 class="h1">O que já foi dito, com data e minuto</h1>' +
        '<p class="lead">Trechos de vídeo ligados às histórias e às pessoas citadas nelas. Cada trecho abre o vídeo no minuto exato.</p></section>';
      h += '<section class="sec"><h2 class="h2">Arquivos de vídeo</h2>' + archList(A.archives) + "</section>";
      if (A.stories.length) h += '<section class="sec"><h2 class="h2">Histórias com trechos</h2><ul class="rows" style="margin:0">' + A.stories.map(function (s) {
        return '<li><a href="#/historia/' + e(s.slug) + '#ja-falaram"><span class="rt">' + e(s.title) + '</span><span class="rd">' + plural(s.said, "trecho", "trechos") + "</span></a></li>";
      }).join("") + "</ul></section>";
      if (A.persons.length) h += '<section class="sec"><h2 class="h2">Pessoas citadas</h2><p class="people" style="margin:0">' + A.persons.map(person).join("") + '</p><p class="quiet">O número é quantos trechos reunimos. Não é nota nem avaliação.</p></section>';
      return h;
    });
  };

  // ---------------------------------------------------------------- PARA PROFISSIONAIS
  P.profissionais = function () {
    document.title = "Para profissionais · Desmentindo";
    return load("arquivos.json").then(function (A) {
      var h = '<section class="page-head"><p class="data-mark" aria-label="Desmentindo Data"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand-word">DESMENTINDO</span><span class="dt">DATA</span></p><h1 class="h1">Para profissionais</h1>' +
        '<p class="lead">O Desmentindo é a publicação. O Desmentindo Data é para quem usa esses arquivos no trabalho: redações, pesquisa e escolas.</p></section>';
      // PROFESSIONAL CAPABILITY CARD: só o que JÁ EXISTE no ar; nada prometido sem confirmação (handoff L2).
      var vids = A.archives.filter(function (a) { return a.available; }).reduce(function (n, a) { return n + a.videos_indexed; }, 0);
      h += '<section class="sec"><h2 class="h2">O que já existe</h2><ol class="steps data">' +
        '<li><span class="tag tag-ink">Já existe</span><b>Pesquisar</b><p>Trechos de ' + nf(vids) + " vídeos, com data e o minuto exato.</p></li>" +
        '<li><span class="tag tag-ink">Já existe</span><b>Consultar</b><p>' + nf(A.stats.stories) + " histórias com " + nf(A.stats.records) + " registros, com data e fonte.</p></li>" +
        '<li><span class="tag tag-ink">Já existe</span><b>Abrir a fonte</b><p>As fontes de cada história abrem o documento, a reportagem ou o vídeo original.</p></li></ol></section>';
      h += '<section class="sec"><h2 class="h2">Cobertura dos arquivos de vídeo</h2><ul class="arch">' + A.archives.map(function (a) {
        return '<li data-src="' + e(a.name) + '"><span class="an">' + e(a.name) + '</span><span class="as' + (a.available ? " ok" : "") + '">' + nf(a.videos_indexed) + " de " + nf(a.videos_total) + " vídeos processados" + (a.available ? (a.latest ? " · até " + e(fdate(a.latest)) : "") : " · ainda não disponível para pesquisa") + "</span></li>";
      }).join("") + "</ul></section>";
      h += '<section class="sec"><div class="dont"><b>O que não fazemos</b><ul><li>Lista de pessoas monitoradas.</li><li>Ranking de pessoas.</li><li>Nota de suspeita ou de risco sobre alguém.</li><li>Perfil político de pessoas.</li><li>Checagem encomendada por cliente.</li></ul></div>' +
        '<p class="quiet">A unidade é o fato, a história, o que foi dito e o documento.</p></section>';
      return h;
    });
  };

  // ---------------------------------------------------------------- AGORA: uma notícia = uma URL (#/agora/<id>)
  P.agora = function (id) {
    return loadEdition().then(function (EDN) {
      var items = edItems(EDN), it = items.filter(function (x) { return x.id === id; })[0];
      if (!it) return notFound();
      document.title = it.title + " · Desmentindo";
      var h = '<section class="page-head"><p class="kicker"><span class="tag tag-ink">' + e(EDN.label || "Agora") + "</span> edição de " + e(fdate(EDN.edition)) + "</p>" +
        '<h1 class="h1">' + e(it.title) + '</h1><p class="bigdate"><span>Publicado em</span><b>' + tdate(it.date) + "</b></p>" +
        '<p class="summary">' + e(it.text) + "</p></section>";
      h += '<section class="sec"><h2 class="h2">Fontes</h2><ul class="rail">' + it.sources.map(function (x) {
        var off = /\((documento oficial|comunicação oficial)\)$/.test(x.name || "");
        return railCard({ kind: off ? "Fonte oficial" : "Reportagem", title: x.title || x.name, outlet: x.name, url: x.url });
      }).join("") + "</ul>" + SRC_RULE + (EV_NOTE[it.evidence] ? '<p class="quiet">' + EV_NOTE[it.evidence] + "</p>" : "") + "</section>";
      h += '<section class="sec"><h2 class="h2">Pesquise o que já foi dito</h2>' + searchForm("", "q-agora") +
        '<p class="rule-note">Procure uma pessoa, órgão ou assunto desta notícia nos arquivos. Aparecer antes não prova o fato de hoje.</p></section>';
      var others = items.filter(function (x) { return x.id !== id; });
      if (others.length) h += '<section class="sec"><h2 class="h2">Também no Agora</h2><ul class="ed-rows">' + others.map(function (o) {
        return '<li><a href="#/agora/' + e(o.id) + '"><span class="rt">' + e(o.title) + '</span><span class="rd">' + tdate(o.date) + "</span></a></li>";
      }).join("") + "</ul></section>";
      return h;
    });
  };

  // ---------------------------------------------------------------- privacidade (descrição factual da medição)
  P.privacidade = function () {
    document.title = "Privacidade · Desmentindo";
    var m = document.querySelector('meta[name="desmentindo-analytics"]');
    var ret = m && m.getAttribute("data-retention");
    var h = '<section class="page-head"><p class="kicker">Desmentindo</p><h1 class="h1">Privacidade</h1>' +
      '<p class="lead">O Desmentindo não tem cadastro, não usa cookies de medição e não identifica quem lê.</p></section><section class="sec prose">';
    if (!m) {
      h += "<p>Hoje o site não usa nenhuma ferramenta de medição de audiência.</p>";
    } else {
      h += '<h2 class="h2">Medição de audiência</h2>' +
        "<p>Para saber quantas pessoas leem o Desmentindo, o que leem e de onde chegam, usamos o <b>Umami Cloud</b>, uma ferramenta de medição que não usa cookies e não guarda um identificador no seu navegador.</p>" +
        "<p><b>O que é registrado:</b> a página aberta (sem o texto de buscas), a página de onde você veio, os parâmetros de campanha do link (utm), tipo de dispositivo, navegador, sistema, idioma e localização aproximada (país e região). Também estas ações: <i>leitura engajada</i> (pelo menos 60 segundos com a página visível e rolagem até a metade de um Fechamento ou Matéria), <i>clique em uma fonte</i> (só o endereço do site da fonte) e <i>play de vídeo</i>.</p>" +
        "<p>Nas páginas de Eleições 2026, também registramos até que nível a pessoa navegou (registro da apuração, município, zona ou seção), sem identificar quem navegou.</p>" +
        "<p><b>Como a visita é contada:</b> a ferramenta usa o endereço IP e o navegador para formar um código de visita anônimo, que muda todo mês. Não enviamos nome, e-mail, telefone ou qualquer identificador de pessoa.</p>" +
        "<p><b>Para quê:</b> medir audiência agregada e melhorar o produto. Não vendemos dados e não fazemos publicidade direcionada.</p>" +
        (ret ? "<p><b>Por quanto tempo:</b> " + e(ret) + ".</p>" : "") +
        "<p>Se o seu navegador envia o sinal “Do Not Track”, nada é medido.</p>";
    }
    if (document.querySelector('meta[name="desmentindo-capture"]')) {
      h += '<h2 class="h2">Receber o FECHAMENTO</h2>' +
        "<p>A faixa “Receba o FECHAMENTO” no topo leva você ao nosso canal fora do site. O site não pede nem guarda seu número, e-mail ou nome. " +
        (m ? "Na medição de audiência, registramos só que houve um toque na faixa (o canal e o tipo de página), sem identificar quem tocou. " : "") +
        "No canal, valem também as regras de privacidade da plataforma.</p>";
    }
    return Promise.resolve(h + "</section>");
  };

  // ---------------------------------------------------------------- FECHAMENTO e MATÉRIA (aprovados no Human Gate)
  // Publicados pelo Publisher em /data/editorial/fechamentos/ e /data/editorial/materias/, com índices próprios (o AGORA
  // não muda). A página só apresenta o artefato aprovado: não escolhe, não resume, não completa. Sem índice → nada aparece.
  var typedIdx = {};
  function loadIdx(kind) {
    if (!typedIdx[kind]) typedIdx[kind] = fetch("/data/editorial/" + kind + "/index.json" + (DV ? "?v=" + DV : ""))
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return typedIdx[kind];
  }
  var TYPED_FILE = { fechamentos: /^data\/editorial\/fechamentos\/\d{4}-\d{2}-\d{2}\.json$/, materias: /^data\/editorial\/materias\/[a-z0-9-]+\.json$/ };
  function loadTyped(kind, key) {
    return loadIdx(kind).then(function (idx) {
      if (!idx || !idx.items) return null;
      key = key || idx.latest;
      var x = idx.items.filter(function (i) { return kind === "fechamentos" ? i.date === key : i.slug === key; })[0];
      if (!x || !TYPED_FILE[kind].test(x.file)) return null;
      return fetch("/" + x.file + "?v=" + String(x.sha256 || "").slice(0, 12)).then(function (r) { return r.ok ? r.json() : null; });
    }).catch(function () { return null; });
  }
  // horário de Brasília (UTC−3, sem horário de verão) a partir de ISO com fuso
  function brt(iso) { var t = Date.parse(iso); return isNaN(t) ? null : new Date(t - 3 * 3600e3); }
  function fhm(iso) { var d = brt(iso); return d ? String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0") : ""; }
  function fts(iso) {
    if (!iso) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return fdate(iso);
    var d = brt(iso);
    return d ? d.getUTCDate() + " " + MES[d.getUTCMonth()] + ", " + fhm(iso) : "";
  }
  function setDesc(s) { var m = document.querySelector('meta[name="description"]'); if (m && s) m.setAttribute("content", s); }
  function covList(cov) {
    return '<ul class="fx-cov">' + cov.map(function (c) {
      return '<li><p class="fx-who"><a href="' + e(c.url) + '" target="_blank" rel="noopener"><b>' + e(c.outlet) + '</b> <span aria-hidden="true">↗</span>' +
        '<span class="sr"> ' + e(c.title || c.headline || "") + "</span></a>" + (c.published_at ? "<span>" + e(fts(c.published_at)) + "</span>" : "") + "</p>" +
        (c.headline ? '<p class="fx-hl">' + e(c.headline) + "</p>" : "") + (c.summary ? "<p>" + e(c.summary) + "</p>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  function srcLinks(srcs) {
    return '<p class="src">' + srcs.map(function (s) { return '<a href="' + e(s.url) + '" target="_blank" rel="noopener">' + e(s.outlet) + "</a>"; }).join(" · ") + "</p>";
  }
  var BASIS_TXT = { "manchete": "só a manchete", "manchete e resumo": "manchete e resumo", "texto da matéria": "texto da matéria" };

  P.fechamento = function (date) {
    return loadTyped("fechamentos", date).then(function (F) {
      if (!F) return notFound();
      document.title = F.public_title + " · Desmentindo";
      setDesc((F.opening && F.opening.points || []).map(function (p) { return p.text; }).join(" "));
      var h = '<section class="page-head fx-head"><p class="kicker"><span class="tag tag-ink">Fechamento</span> ' + e(fdate(F.edition_date)) +
        (F.context ? " · " + e(F.context) : "") + "</p>" +
        '<h1 class="h1">' + e(F.public_title) + "</h1>" +
        '<p class="fx-cut">Conteúdo verificado até <b>' + e(fhm(F.cutoff_at)) + "</b> de " + e(fdate(F.edition_date)) +
        (F.published_at ? ' · publicado em <time datetime="' + e(F.published_at) + '">' + e(fts(F.published_at)) + "</time>" : "") + "</p>";
      if (F.opening && F.opening.points && F.opening.points.length) {
        h += '<h2 class="fx-open-h">' + e(F.opening.title) + '</h2><ol class="fx-open">' + F.opening.points.map(function (p) {
          return '<li><a href="#' + e(p.story) + '" data-jump="' + e(p.story) + '">' + e(p.text) + "</a></li>";
        }).join("") + "</ol>";
      }
      h += "</section>";
      if (F.main_stories && F.main_stories.length) {
        h += '<section class="sec"><h2 class="h2">Histórias principais</h2>' + F.main_stories.map(function (s) {
          var x = '<article class="fx-story' + (s.lead ? " fx-lead" : "") + '" id="' + e(s.id) + '">' + (s.lead ? '<p class="kicker">Principal</p>' : "") +
            '<h3 class="fx-h">' + e(s.headline) + "</h3>" + (s.dek ? '<p class="fx-dek">' + e(s.dek) + "</p>" : "");
          if (s.steps) x += '<ol class="fx-steps">' + s.steps.map(function (st) {
            return '<li class="' + (st.done ? "done" : "open") + '"><b>' + e(st.label) + "</b><span>" + e(st.text) + "</span></li>";
          }).join("") + "</ol>";
          x += '<h4 class="fx-k">O que aconteceu</h4><p>' + e(s.what_happened) + "</p>";
          if (s.what_changed) x += '<h4 class="fx-k">O que há de novo</h4><p class="fx-new">' + e(s.what_changed) + "</p>";
          if (s.coverage && s.coverage.length) x += '<h4 class="fx-k">Como estão cobrindo</h4>' + covList(s.coverage);
          if (s.official) x += '<h4 class="fx-k">Manifestações oficiais</h4><ul class="fx-plain">' + s.official.map(function (o) { return "<li>" + e(o) + "</li>"; }).join("") + "</ul>";
          x += '<div class="fx-concl"><h4 class="fx-k">O que dá para concluir</h4><p>' + e(s.conclusion) + "</p>" +
            (s.open_questions ? '<p class="fx-open-q"><b>Em aberto:</b> ' + e(s.open_questions) + "</p>" : "") + "</div>";
          return x + "</article>";
        }).join("") + "</section>";
      }
      if (F.other_stories && F.other_stories.length) {
        h += '<section class="sec"><h2 class="h2">Outras que você precisa saber</h2><ul class="fx-list">' + F.other_stories.map(function (o) {
          return '<li id="' + e(o.id) + '"><h3>' + e(o.title) + "</h3><p>" + e(o.text) + "</p>" + srcLinks(o.sources) + "</li>";
        }).join("") + "</ul></section>";
      }
      if (F.following && F.following.length) {
        h += '<section class="sec"><h2 class="h2">Acompanhando</h2><ul class="fx-list fx-fol">' + F.following.map(function (o) {
          return '<li id="' + e(o.id) + '"><h3>' + e(o.title) + "</h3><p>" + e(o.text) + "</p>" + srcLinks(o.sources) +
            (o.voice ? '<p class="fx-voice"><span class="tag tag-ring">' + e(o.voice.kind) + "</span> " + e(o.voice.who) + ": " + e(o.voice.summary) +
              ' <a class="link" href="' + e(o.voice.url) + '" target="_blank" rel="noopener">Ler</a></p>' : "") + "</li>";
        }).join("") + "</ul></section>";
      }
      if (F.opinion && F.opinion.length) {
        h += '<section class="sec"><h2 class="h2">Opinião</h2><ul class="fx-list">' + F.opinion.map(function (o) {
          return '<li><p><span class="tag tag-alleg">' + e(o.kind) + "</span> " + e(o.who) + ': <a class="link" href="' + e(o.url) + '" target="_blank" rel="noopener">' + e(o.title) + "</a></p>" +
            (o.note ? '<p class="quiet">' + e(o.note) + "</p>" : "") + "</li>";
        }).join("") + '</ul><p class="rule-note">Opinião não é fato: mostramos quem disse e onde.</p></section>';
      }
      if (F.sources && F.sources.length) {
        h += '<section class="sec"><h2 class="h2">Veja por você mesmo</h2><details><summary>Todas as fontes desta edição (' + nf(F.sources.length) + ')</summary><ul class="srcs">' +
          F.sources.map(function (s) {
            return "<li><b>" + e(s.outlet) + "</b> · " + e(fts(s.published_at)) + " · " + ext(s.url, e(s.title || s.outlet), "link") +
              (s.basis ? ' <span class="meta">(' + e(BASIS_TXT[s.basis] || s.basis) + ")</span>" : "") + "</li>";
          }).join("") + "</ul></details>" + (F.note ? '<p class="quiet">' + e(F.note) + "</p>" : "") + SRC_RULE + "</section>";
      }
      return h;
    });
  };

  function videoItem(v) {
    var li = saidItem({ source_name: v.channel, video_id: v.video_id, t_seconds: v.t_seconds, date: v.date, excerpt: v.said, t_label: v.t_label, deep_link: v.deep_link });
    li = li.replace('<p class="said-x">', (v.video_title ? '<p class="fx-vt">' + e(v.video_title) + "</p>" : "") + '<p class="said-x">');
    return v.context ? li.replace('<div class="said-foot">', '<p class="fx-ctx">' + e(v.context) + '</p><div class="said-foot">') : li;
  }
  P.materia = function (slug) {
    return loadTyped("materias", slug).then(function (M) {
      if (!M) return notFound();
      document.title = M.public_title + " · Desmentindo";
      setDesc(M.dek);
      var h = '<section class="page-head hero-ink fx-mhead"><p class="kicker"><span class="tag tag-paper">' + e(M.kicker || "Matéria") + "</span>" +
        (M.status ? ' <span class="fx-st">' + e(M.status) + "</span>" : "") + "</p>" +
        '<h1 class="h1">' + e(M.public_title) + "</h1>" + (M.dek ? '<p class="fx-mdek">' + e(M.dek) + "</p>" : "") +
        '<p class="fx-pub">' + tdate(M.date) + (M.updated_at && M.updated_at !== M.published_at ? " · atualizado em " + e(fts(M.updated_at)) : "") + "</p>";
      if (M.art) h += '<figure class="fx-art"><picture><source media="(min-width: 620px)" srcset="' + e(M.art.desktop) + '"><img src="' + e(M.art.mobile) + '" alt="" loading="lazy" decoding="async"></picture>' +
        (M.art.caption ? "<figcaption>" + e(M.art.caption) + "</figcaption>" : "") + "</figure>";
      h += "</section>";
      if (M.facts && M.facts.length) h += '<div class="facts fx-facts">' + M.facts.map(function (f) { return '<div><p class="fv num">' + e(f.value) + '</p><p class="fs">' + e(f.label) + "</p></div>"; }).join("") + "</div>";
      if (M.what_changed && M.what_changed.length) {
        h += '<section class="sec"><h2 class="h2">O que mudou hoje</h2><ul class="items">' + M.what_changed.map(function (c) {
          return '<li><span class="fx-when">' + e(c.when) + "</span><p>" + e(c.text) + "</p></li>";
        }).join("") + "</ul>" + (M.correction ? '<p class="fx-fix"><b>Correção:</b> ' + e(M.correction) + "</p>" : "") + "</section>";
      }
      if ((M.videos && M.videos.length) || M.partial_videos) {
        h += '<section class="sec" id="ja-falaram"><h2 class="h2">' + e(M.videos_title || "Já falaram sobre isso") + "</h2>" +
          (M.videos_note ? '<p class="quiet">' + e(M.videos_note) + "</p>" : "") +
          '<ul class="said-list">' + (M.videos || []).map(videoItem).join("") + "</ul>";
        if (M.partial_videos && M.partial_videos.items.length) {
          h += '<p class="fx-partial"><span class="tag tag-alleg">' + e(M.partial_videos.label) + "</span> " + e(M.partial_videos.who) + "</p>" +
            '<ul class="said-list">' + M.partial_videos.items.map(videoItem).join("") + "</ul>";
        }
        h += (M.archive_note ? '<p class="quiet">' + e(M.archive_note) + "</p>" : "") + NOTE + "</section>";
      }
      if (M.timeline && M.timeline.length) {
        h += '<section class="sec"><h2 class="h2">Linha do tempo · com o que foi dito</h2><ol class="fx-tl">' + M.timeline.map(function (t) {
          return '<li' + (t.today ? ' class="today"' : "") + '><span class="d">' + e(t.when) + '</span><span class="ev">' + e(t.text) + "</span>" +
            (t.clips ? '<span class="fx-chips">' + t.clips.map(function (c) {
              return '<a href="' + e(c.url) + '" target="_blank" rel="noopener"><i>' + e(c.channel) + "</i>▶ " + e(c.t_label) + " <span>" + e(c.text) + "</span></a>";
            }).join("") + "</span>" : "") + "</li>";
        }).join("") + "</ol></section>";
      }
      if (M.coverage && M.coverage.length) h += '<section class="sec"><h2 class="h2">Quem está cobrindo</h2>' + covList(M.coverage) + (M.coverage_note ? '<p class="rule-note">' + e(M.coverage_note) + "</p>" : "") + "</section>";
      if (M.documents && M.documents.length) {
        h += '<section class="sec"><h2 class="h2">Documentos</h2><ul class="fx-docs">' + M.documents.map(function (d) {
          return '<li><span class="tag ' + (d.located ? "tag-fact" : "tag-ring") + '">' + e(d.status) + '</span><p class="fx-hl">' + e(d.title) + "</p>" +
            (d.note ? "<p>" + e(d.note) + "</p>" : "") + (d.url ? ext(d.url, "Ver documento ↗", "link") : "") + "</li>";
        }).join("") + "</ul></section>";
      }
      if (M.conclusion) {
        var C = M.conclusion;
        h += '<section class="sec"><h2 class="h2">O que dá para concluir hoje</h2><div class="fx-mconcl"><p class="fx-st">' + e(C.status) + "</p><ul>" +
          C.points.map(function (p) { return '<li class="' + (p.holds ? "y" : "n") + '">' + e(p.text) + "</li>"; }).join("") + "</ul>" +
          (C.limits && C.limits.length ? '<p class="fx-lims">' + C.limits.map(function (l) { return "<span>" + e(l) + "</span>"; }).join("") + "</p>" : "") + "</div></section>";
      }
      if (M.see_for_yourself && M.see_for_yourself.length) {
        h += '<section class="sec"><h2 class="h2">Veja por você mesmo</h2><ul class="srcs">' + M.see_for_yourself.map(function (s) {
          return '<li><span class="k">' + (s.kind === "video" ? "Vídeo" : s.kind === "document" ? "Documento" : "Reportagem") + "</span>" + ext(s.url, e(s.label), "link") + "</li>";
        }).join("") + "</ul>" + SRC_RULE + "</section>";
      }
      if (M.people && M.people.length) {
        h += '<section class="sec" id="pessoas"><h2 class="h2">' + e(M.people_title || "Pessoas nesta história") + "</h2>" + (M.people_note ? '<p class="quiet">' + e(M.people_note) + "</p>" : "") +
          '<ul class="fx-people">' + M.people.map(function (p) {
            return '<li><p class="fx-pn">' + e(p.name) + '</p><p class="meta">' + e(p.when) + "</p><p>" + e(p.role) + '</p><p class="fx-why">' + e(p.why) + "</p>" +
              '<p class="meta">' + e(p.status) + "</p></li>";
          }).join("") + "</ul></section>";
      }
      return h;
    });
  };

  // ---------------------------------------------------------------- CHECAR (apresentação)
  // CHECK_OUTPUT_PARITY = REQUIRED_WHEN_FEASIBLE: o resultado volta no MESMO formato da entrada (mapa de relações →
  // mapa checado, tabela → tabela checada, linha do tempo → linha do tempo checada, card/print → reconstrução checada).
  // Contrato de apresentação (CHECK_MODEL):
  //   { format: "relations"|"table"|"timeline"|"card", input: {type, outlet, date, title, note},
  //     status, checked_at, groups: [{title, sub, items: [CLAIM]}], links: [CLAIM],
  //     table: {cols: [..], rows: [{cells: [..], claim: CLAIM}]}, events: [{date, ...CLAIM}] }
  //   CLAIM = { text, selo, check, kind, proves, not_proves, sources: [{title, outlet, url}] }
  // O ORIGINAL mostra o que entrou (sem selo); o CHECADO mostra o que sobrou, com selo por afirmação. A força do traço
  // nunca é maior que a do selo: ligação não confirmada é pontilhada, alegação é marcada como alegação.
  function claimLi(c, checked) {
    if (!checked) return "<li>" + e(c.text) + "</li>";
    var k = seloKey(c.selo);
    return "<li>" + (c.n ? '<span class="cn">nº ' + c.n + "</span> " : "") + e(c.text) + '<div class="st">' + selo(k, c.check) + (c.kind ? ' <span class="meta">' + e(c.kind) + "</span>" : "") + "</div>" +
      (k === "NAO_ENCONTRAMOS" ? '<p class="rule-note">' + NAO_ENC_TXT + "</p>" : "") +
      (c.proves || c.not_proves || (c.sources || []).length ? "<details><summary>O que encontramos</summary>" +
        (c.proves ? '<p class="pv"><b>O que sustenta</b><br>' + e(c.proves) + "</p>" : "") +
        (c.not_proves ? '<p class="np"><b>O que não sustenta</b><br>' + e(c.not_proves) + "</p>" : "") +
        ((c.sources || []).length ? '<p class="srcl">' + c.sources.map(function (x) { return ext(x.url, e(x.outlet || x.title || "fonte")); }).join(" · ") + "</p>" : "") +
        "</details>" : "") + "</li>";
  }
  function linkLi(l, checked) {
    var k = checked ? seloKey(l.selo) : "orig";
    var lt = !checked ? "No original: seta" : k === "DOCUMENTADO" ? "Ligação documentada" : k === "PARCIALMENTE_DOCUMENTADO" ? "Ligação documentada em parte" :
      k === "EM_CHECAGEM" ? "Ligação em checagem" : "Ligação não confirmada";
    return '<li><p class="lk lk-' + k + '"><span class="ln" aria-hidden="true"></span><span class="lt">' + lt + "</span></p>" + (checked && l.n ? '<span class="cn">nº ' + l.n + "</span> " : "") + e(l.text) +
      (checked ? '<div class="cl"><div class="st">' + selo(k, l.check) + "</div></div>" : "") + "</li>";
  }
  var RENDER = {
    relations: function (m, checked) {
      return m.groups.map(function (g) {
        return '<div class="grp"><div class="grp-h"><b>' + e(g.title) + "</b>" + (g.sub ? "<span>" + e(g.sub) + "</span>" : "") + '</div><ul class="cl">' +
          g.items.map(function (c) { return claimLi(c, checked); }).join("") + "</ul></div>";
      }).join("") + (m.links && m.links.length ? '<div class="grp"><div class="grp-h"><b>' + (checked ? "As setas do original, checadas" : "As setas (o que o original liga)") + '</b></div><ul class="links">' +
        m.links.map(function (l) { return linkLi(l, checked); }).join("") + "</ul></div>" : "");
    },
    table: function (m, checked) {
      return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + m.table.cols.map(function (c) { return '<th scope="col">' + e(c) + "</th>"; }).join("") +
        (checked ? '<th scope="col">Checado</th>' : "") + "</tr></thead><tbody>" + m.table.rows.map(function (r) {
          return "<tr>" + r.cells.map(function (c) { return "<td>" + e(c) + "</td>"; }).join("") + (checked ? "<td>" + selo(r.claim.selo, r.claim.check) + "</td>" : "") + "</tr>";
        }).join("") + "</tbody></table></div>";
    },
    timeline: function (m, checked) {
      return '<ol class="tl">' + m.events.map(function (ev, i) {
        return '<li' + (i === m.events.length - 1 ? ' class="now"' : "") + ">" + tdate(ev.date) + "<p>" + e(ev.text) + "</p>" + (checked ? '<div class="cl"><div class="st">' + selo(ev.selo, ev.check) + "</div></div>" : "") + "</li>";
      }).join("") + "</ol>";
    },
    card: function (m, checked) {
      return '<ul class="cl grp">' + m.groups[0].items.map(function (c) { return claimLi(c, checked); }).join("") + "</ul>";
    }
  };
  function allClaims(m) {
    var out = [];
    (m.groups || []).forEach(function (g) { out = out.concat(g.items); });
    out = out.concat(m.links || []);
    ((m.table || {}).rows || []).forEach(function (r) { out.push(r.claim); });
    (m.events || []).forEach(function (x) { out.push(x); });
    return out;
  }
  function propBar(m) {
    var n = {}, all = allClaims(m);
    if (!all.length) return "";
    all.forEach(function (c) { var k = seloKey(c.selo); n[k] = (n[k] || 0) + 1; });
    var keys = SELO_ORDER.filter(function (k) { return n[k]; });
    return '<div class="ovc-sum"><div class="prop" role="img" aria-label="' + e(keys.map(function (k) { return n[k] + " " + SELO[k][1].toLowerCase(); }).join(", ")) + '">' +
      keys.map(function (k) { return '<i class="p-' + k + '" style="width:' + (100 * n[k] / all.length).toFixed(2) + '%"></i>'; }).join("") + "</div>" +
      '<ul class="prop-leg">' + keys.map(function (k) { return "<li>" + selo(k) + " " + nf(n[k]) + "</li>"; }).join("") + "</ul>" +
      (n.NAO_ENCONTRAMOS ? '<p class="rule-note">' + NAO_ENC_TXT + "</p>" : "") +
      '<p class="rule-note">' + plural(all.length, "afirmação separada e checada", "afirmações separadas e checadas") + ". O número conta afirmações, não é nota.</p></div>";
  }
  var FORMAT_NAME = { relations: ["Mapa de relações", "Mapa de relações checado"], table: ["Tabela", "Tabela checada"], timeline: ["Linha do tempo", "Linha do tempo checada"], card: ["Card", "Card checado"] };
  function originalVsChecked(m) {
    var f = RENDER[m.format] ? m.format : "card", nm = FORMAT_NAME[f], inp = m.input || {};
    return '<div class="ovc" data-format="' + f + '">' +
      '<section class="ovc-orig" aria-label="Original"><div class="ovc-head"><span class="t">Original</span><span class="tag tag-ring">' + e(inp.type || nm[0]) + "</span></div>" +
      '<p class="ovc-meta">' + e(inp.outlet || "") + (inp.date ? " · " + tdate(inp.date) : "") + "</p>" +
      (inp.title ? '<p class="spot-t" style="margin:0 0 10px">' + e(inp.title) + "</p>" : "") + RENDER[f](m, false) +
      (inp.note ? '<p class="ovc-note">' + e(inp.note) + "</p>" : "") + "</section>" +
      '<section class="ovc-chk asset" aria-label="Checado pelo Desmentindo"><div class="ovc-head"><span class="t">Checado pelo Desmentindo</span><span class="tag tag-fact">' + e(nm[1]) + "</span>" +
      (m.status ? selo(m.status) : "") + "</div>" + propBar(m) + RENDER[f](m, true) +
      '<p class="asset-foot"><span class="asset-brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>DESMENTINDO</span>' +
      "<span>" + (m.checked_at ? "Checado em " + e(fdate(m.checked_at)) + " · " : "") + "desmentindo.com.br</span></p></section></div>";
  }
  // Adaptador: peça que circulou (dados públicos já publicados) → CHECK_MODEL. Sem IDs internos na saída.
  function checkModelFromCirculating(circ, claims) {
    var by = {}; claims.forEach(function (c) { by[c.id] = c; });
    var inBlock = {}; circ.blocks.forEach(function (b) { b.claims.forEach(function (id) { inBlock[id] = 1; }); });
    var mine = claims.filter(function (c) { return c.origin && circ.origin && c.origin.title === circ.text || inBlock[c.id]; });
    // Numeração pública na ordem de leitura (blocos, depois setas); referências internas viram "afirmação nº N".
    var num = {}, k = 0;
    circ.blocks.forEach(function (b) { b.claims.forEach(function (id) { if (by[id] && !num[id]) num[id] = ++k; }); });
    mine.forEach(function (c) { if (!num[c.id]) num[c.id] = ++k; });
    var deref = function (t) { return t == null ? t : String(t).replace(/\bCL-(\d{3})\b/g, function (m0, d) { var id = "CL-" + d; return num[id] ? "afirmação nº " + num[id] : "outra afirmação"; }); };
    var pick = function (c) { return { n: num[c.id], text: deref(c.text), selo: c.selo, check: c.check, kind: c.kind, proves: deref(c.proves), not_proves: deref(c.not_proves), sources: (c.sources || []).map(function (x) { return { title: x.title, outlet: x.outlet, url: x.url }; }) }; };
    var dates = mine.map(function (c) { return c.checked_at; }).filter(Boolean).sort();
    return {
      format: /infogr|mapa|rela/i.test((circ.origin || {}).type || "") || circ.blocks.length > 1 ? "relations" : "card",
      input: { type: (circ.origin || {}).type, outlet: (circ.origin || {}).outlet, date: (circ.origin || {}).date, title: circ.text, note: circ.note },
      status: circ.status, checked_at: dates[dates.length - 1] || null,
      groups: circ.blocks.map(function (b) { return { title: b.title, sub: b.sub, items: b.claims.filter(function (id) { return by[id]; }).map(function (id) { return pick(by[id]); }) }; }),
      links: mine.filter(function (c) { return !inBlock[c.id]; }).map(pick)
    };
  }
  window.DesmentindoCheck = { originalVsChecked: originalVsChecked, fromCirculating: checkModelFromCirculating, selo: selo };

  P.checar = function () {
    document.title = "Checar · Desmentindo";
    // CHECAR_SUBMISSIONS = CLOSED (decisão de Johnny, 02/10): a página apresenta o produto; nenhum chamado de envio.
    var h = '<section class="page-head chk-hero"><p class="kicker chk-k">Checar · em preparação</p><h1 class="h1">Como o Desmentindo checa</h1>' +
      '<p class="lead">Quando o envio abrir, você vai poder mandar um print, post, vídeo, tabela, gráfico, infográfico, linha do tempo ou mapa. A gente separa cada afirmação, confere uma por uma e devolve no mesmo formato, agora checado.</p>' +
      '<p class="notice"><b>O envio pelo site ainda não está aberto.</b> Esta página não recebe nem guarda nada. Enquanto isso, veja se o assunto já apareceu antes nos arquivos:</p>' +
      '<div style="margin-top:14px">' + searchForm("", "q-checar") + "</div></section>";
    h += '<section class="sec" id="como"><h2 class="h2">Como checamos</h2><ol class="steps">' +
      "<li><b>Entrada</b><p>O material como chegou: print, post, vídeo, tabela, infográfico, linha do tempo ou mapa.</p></li>" +
      "<li><b>Separar</b><p>Cada afirmação vira uma linha. Pessoas, datas, valores e relações continuam lá.</p></li>" +
      "<li><b>Checar</b><p>Para cada uma: checamos se foi dito ou se aconteceu.</p></li>" +
      "<li><b>O que encontramos</b><p>Documentos e fontes, com data. O que sustentam e o que não sustentam.</p></li>" +
      "<li><b>Contexto</b><p>O que veio antes, quando e onde. Olha a data.</p></li>" +
      "<li><b>O que dá para concluir</b><p>Nunca mais forte que as fontes. Investigação não é culpa. Alegação não é fato.</p></li>" +
      "<li><b>De volta no mesmo formato</b><p>Original ao lado do checado, para ver o que entrou e o que sobrou.</p></li></ol></section>";
    h += '<section class="sec"><h2 class="h2">O formato volta igual</h2><ul class="parity">' +
      [["Infográfico", "Infográfico checado"], ["Card", "Card checado"], ["Tabela", "Tabela checada"], ["Linha do tempo", "Linha do tempo checada"], ["Mapa de relações", "Mapa de relações checado"], ["Print", "Reconstrução checada"]].map(function (p) {
        return "<li>" + e(p[0]) + ' <span aria-hidden="true">→</span><span class="sr">vira</span> <span class="to">' + e(p[1]) + "</span></li>";
      }).join("") + '</ul><p class="rule-note">Não é cópia pixel a pixel: é a mesma informação, no mesmo formato, com o estado de cada afirmação corrigido. O resultado nunca fica mais pobre que a entrada.</p></section>';
    h += '<section class="sec"><h2 class="h2">Como ler o resultado</h2><ul class="legend">' +
      SELO_ORDER.map(function (k) {
        var why = { DOCUMENTADO: "Encontramos documentação que sustenta a afirmação no contexto apresentado.", PARCIALMENTE_DOCUMENTADO: "Uma parte tem documento; dizemos qual parte sim e qual não.",
          AINDA_NAO_DA: "O que existe hoje não basta para confirmar nem para descartar.", NAO_ENCONTRAMOS: NAO_ENC_TXT, EM_CHECAGEM: "Ainda estamos conferindo. Nada concluído." }[k];
        return "<li>" + selo(k) + ' <span class="why">' + why + "</span></li>";
      }).join("") +
      '<li><span class="chkd">Checamos se foi dito</span> <span class="why">Um vídeo da fala documenta que foi dito, não que o fato aconteceu.</span></li>' +
      '<li><span class="chkd">Checamos se aconteceu</span> <span class="why">Uma reportagem sobre acusação documenta a acusação, não o fato.</span></li>' +
      '<li><p class="lk lk-DOCUMENTADO" style="margin:0"><span class="ln" aria-hidden="true"></span><span class="lt">Linha cheia</span></p><span class="why">Ligação documentada. Ligação não é culpa, influência nem ilegalidade.</span></li>' +
      '<li><p class="lk lk-AINDA_NAO_DA" style="margin:0"><span class="ln" aria-hidden="true"></span><span class="lt">Pontilhada</span></p><span class="why">Ligação que o original desenha, mas que não confirmamos.</span></li>' +
      "</ul></section>";
    // Exemplo público só com checagem já publicada E liberada (v5/data/checar.json com "example"); sem isso, nada é
    // mostrado nem inventado.
    return load("checar.json").then(function (C) {
      var m = C && (C.example || (C.circulating && C.claims ? checkModelFromCirculating(C.circulating, C.claims) : null));
      if (!m) return h;
      return h + '<section class="sec"><h2 class="h2">Exemplo: original × checado</h2>' + originalVsChecked(m) + "</section>";
    }, function () { return h; });
  };

  // ---------------------------------------------------------------- rotas antigas (app anterior, links históricos)
  // Nenhum link antigo vira 404 silencioso: redireciona para o equivalente ou explica o que mudou.
  var LEGACY = {
    home: "#/", inicio: "#/", noticias: "#/", busca: "#/busca", corpus: "#/arquivos", garcia: "#/arquivos", acervos: "#/arquivos", video: "#/arquivos", narrativas: "#/checar",
    // prévia /v4/ (aposentada): mesmas portas da v5; peças checadas da v4 NÃO são trazidas (exemplo do Checar = OFF)
    buscar: "#/busca", destaque: "#/", circulando: "#/checar", checamos: "#/checar", afirmacao: "#/checar", resultado: "#/checar",
    registro: "#/busca", data: "#/profissionais", sobre: "#/arquivos", "como-trabalhamos": "#/checar", cards: "#/", correcoes: "#/", envie: "#/", contato: "#/",
    moved: { eventos: "Eventos e linha do tempo", trilhas: "Onde os casos param", mecanismos: "Mecanismos processuais", sit: "Situação atual", gazeta: "Gazeta do Povo", oeste: "Revista Oeste",
      cobertura: "Cobertura de opinião", opiniao: "Opinião do autor", mensagens: "Mensagens", glossario: "Glossário e método" },
    retired: { matriz: "Matriz", mapa: "Mapa", rede: "Vínculos e hipóteses", cerebro: "Segundo cérebro", fichas: "Pessoas e casos", contagens: "Contagens", regime: "Termômetro do regime" }
  };
  function legacyRoute(name, query, arg) {
    var q = new URLSearchParams(query || "");
    // v4: #/caso/<slug> → história com o mesmo slug, se existir
    if (name === "caso" && arg) return load("historia/" + arg + ".json").then(function () { return { go: "#/historia/" + arg }; }, function () { return { go: "#/busca?q=" + encodeURIComponent(arg.replace(/-/g, " ")) }; });
    var ev = q.get("ev"), key = q.get("c") || q.get("n") || "";
    // Registro específico (#/…?ev=) → a história pública que o contém; afirmação (?cl=) → Checar.
    if (ev || q.get("cl") || name === "caso" || name === "pessoa" || (name === "cerebro" && key)) {
      return load("rotas.json").then(function (R) {
        if (ev && R.eventos && R.eventos[ev]) return { go: "#/historia/" + R.eventos[ev] };
        if (q.get("cl")) return { go: "#/checar" };
        if (name === "caso" && R.casos[key]) return { go: "#/historia/" + R.casos[key] };
        if ((name === "pessoa" || name === "cerebro") && R.pessoas[key]) return { go: "#/arquivo/" + R.pessoas[key] };
        return key ? { go: "#/busca?q=" + encodeURIComponent(key) } : legacyPage(name);
      }, function () { return key ? { go: "#/busca?q=" + encodeURIComponent(key) } : legacyPage(name); });
    }
    if (typeof LEGACY[name] === "string") return Promise.resolve({ go: LEGACY[name] });
    var pg = legacyPage(name);
    return pg ? Promise.resolve(pg) : null;
  }
  // O site anterior foi encerrado (LEGACY_PUBLIC_APP = RETIRED): nenhum link para ele; nenhum módulo proibido trazido.
  function legacyPage(name) {
    if (typeof LEGACY[name] === "string") return { go: LEGACY[name] };
    if (LEGACY.moved[name]) return { html: '<section class="page-head"><p class="kicker">Endereço antigo</p><h1 class="h1">' + e(LEGACY.moved[name]) + " foi encerrada</h1>" +
      '<p class="lead">Esta seção era do site anterior do Desmentindo, que foi encerrado. Os registros, com data e fonte, estão nas histórias e na pesquisa.</p>' + searchForm("", "q-legacy") + "</section>" };
    if (LEGACY.retired[name]) return { html: '<section class="page-head"><p class="kicker">Endereço antigo</p><h1 class="h1">' + e(LEGACY.retired[name]) + " saiu da página pública</h1>" +
      '<p class="lead">O Desmentindo não publica perfis, rankings, mapas de pessoas nem painéis de pontuação. Aparecer junto não é ser culpado. A pesquisa mostra os registros, com data e fonte.</p>' + searchForm("", "q-legacy") + "</section>" };
    return { go: "#/" };
  }

  function notFound() {
    return '<section class="page-head"><h1 class="h1">Página não encontrada</h1><p class="lead">Ela não existe ou mudou de endereço.</p>' + searchForm("", "q-nf") + "</section>";
  }

  // ---------------------------------------------------------------- roteador
  var routeSeq = 0;
  function setDoor(door) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-door]"), function (a) { if (a.getAttribute("data-door") === door) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  function route() {
    var hash = location.hash || "#/";
    var path = hash.slice(1).split("?")[0].split("#")[0];
    var anchor = hash.slice(1).split("#")[1];
    if (/^ja-falaram|^agora/.test(hash.slice(1))) return; // âncora na própria página
    var parts = path.split("/").filter(Boolean);
    var name = parts[0] || "home", arg = parts[1] ? decodeURIComponent(parts[1]) : null;
    if (!P[name] && name !== "home") {
      var lg = legacyRoute(name, hash.slice(1).split("?")[1], arg);
      if (lg) {
        var mine = ++routeSeq;
        lg.then(function (r) {
          if (mine !== routeSeq) return;
          if (r.go) { location.replace(r.go); return; }
          setDoor(""); main.innerHTML = '<div class="wrap">' + r.html + "</div>"; window.scrollTo(0, 0);
        });
        return;
      }
    }
    var fn = P[name] || P.home;
    document.body.classList.toggle("is-home", fn === P.home);
    document.title = "Desmentindo";
    setDoor(fn === P.busca ? "busca" : (fn === P.arquivos || fn === P.arquivo) ? "arquivos" : (fn === P.home || fn === P.historia || fn === P.agora || fn === P.fechamento || fn === P.materia) ? "agora" : "");
    pending = {};
    var my = ++routeSeq; // só a navegação mais recente pode pintar a página (resposta atrasada de outra rota é descartada)
    fn(arg).then(function (h) {
      if (my !== routeSeq) return;
      main.innerHTML = '<div class="wrap">' + h + "</div>";
      if (anchor) { var t = document.getElementById(anchor); if (t) t.scrollIntoView(); } else window.scrollTo(0, 0);
      anPage(); engStart();
    }, function () { if (my !== routeSeq) return; main.innerHTML = '<div class="wrap"><p class="empty" style="padding:40px 0">Não conseguimos carregar esta página agora. Tente de novo.</p></div>'; });
  }
  // Âncoras internas (#ja-falaram) não trocam a rota.
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest("a[data-jump]");
    if (!a) return;
    ev.preventDefault();
    var t = document.getElementById(a.getAttribute("data-jump") || "ja-falaram");
    if (t) t.scrollIntoView({ behavior: smooth() });
  });
  // ---------------------------------------------------------------- captação (T3/T4, 04/10/2026)
  // Faixa "Receba o FECHAMENTO" acima do topo. Só existe com <meta name="desmentindo-capture"> (gerado de
  // public-ui/capture.json com um destino real). O site não recebe nenhum dado do leitor: o toque leva ao canal, e a
  // medição registra só o clique anônimo (canal + tipo de página), nunca quem clicou.
  (function capInit() {
    var m = document.querySelector('meta[name="desmentindo-capture"]');
    var top = document.querySelector("header.top");
    if (!m || !top) return;
    var url = m.getAttribute("content"), ch = m.getAttribute("data-channel") || "";
    var bar = document.createElement("aside");
    bar.className = "capbar"; bar.setAttribute("aria-label", "Receber o FECHAMENTO");
    bar.innerHTML = '<a class="capbar-in" target="_blank" rel="noopener">' +
      '<span class="capbar-msg"><b class="capbar-p"></b> <span class="capbar-d"></span><b class="capbar-s"></b></span>' +
      '<span class="capbar-cta"><span class="capbar-ct"></span> <span aria-hidden="true">→</span></span></a>';
    var a = bar.querySelector("a");
    a.href = url;
    bar.querySelector(".capbar-p").textContent = m.getAttribute("data-promise") || "";
    bar.querySelector(".capbar-d").textContent = m.getAttribute("data-detail") || "";
    bar.querySelector(".capbar-s").textContent = m.getAttribute("data-short") || "";
    bar.querySelector(".capbar-ct").textContent = m.getAttribute("data-cta") || "";
    a.addEventListener("click", function () {
      var k = pageKind();
      anEvent("AUDIENCE_CAPTURE_CLICK", { channel: ch, placement: "top_bar", page: k ? k.type : "outra" });
    });
    top.parentNode.insertBefore(bar, top);
  })();

  window.addEventListener("hashchange", route);
  route();
})();
