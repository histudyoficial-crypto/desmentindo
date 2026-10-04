/*
 * DESMENTINDO v4 — interface pública.
 * Componentes reutilizáveis alimentados por v4/data/*.json (gerados por
 * public-ui/build-public-data.mjs a partir do modelo canônico, sem alterá-lo).
 * Uma história = uma URL (#/historia/slug). Atualização, correção, resposta
 * e novo dia são ESTADOS da mesma página, nunca URLs concorrentes.
 */
(function () {
  "use strict";

  // ------------------------------------------------------------ utilidades
  var MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  function e(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safe(u) { return typeof u === "string" && /^https:\/\//.test(u) ? u : null; }
  function ext(u, text, cls) {
    var s = safe(u);
    return s ? '<a class="' + (cls || "link") + '" href="' + e(s) + '" target="_blank" rel="noopener noreferrer">' + text + "</a>" : text;
  }
  function parts(d) { var m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(d || ""); return m ? { y: m[1], m: m[2] && +m[2], d: m[3] && +m[3] } : null; }
  // "30 SET 2026" · "MAR 2025" · "2019"
  function fdate(d) {
    var p = parts(d); if (!p) return "data não registrada";
    return (p.d ? p.d + " " : "") + (p.m ? MESES[p.m - 1] + " " : "") + p.y;
  }
  function fshort(d) { var p = parts(d); if (!p) return "—"; return p.d ? String(p.d).padStart(2, "0") + "/" + String(p.m).padStart(2, "0") : p.m ? MESES[p.m - 1] + " " + p.y : p.y; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function nf(n) { return typeof n === "number" ? n.toLocaleString("pt-BR") : "—"; }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function yearsBetween(a, b) { var pa = parts(a), pb = parts(b); return pa && pb ? Math.abs(+pb.y - +pa.y) : null; }
  function qparam(name) { var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.hash); return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : ""; }

  var cache = {};
  function load(path) {
    if (!cache[path]) {
      cache[path] = fetch("data/" + path, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) { var err = new Error("HTTP " + r.status); err.status = r.status; throw err; }
        return r.json();
      });
      cache[path].catch(function () { delete cache[path]; });
    }
    return cache[path];
  }

  // ------------------------------------------------------------ estados (Etapa 1.1)
  var SELO = {
    EM_CHECAGEM: ["◉", "Em checagem"],
    DOCUMENTADO: ["■", "Documentado"],
    PARCIALMENTE_DOCUMENTADO: ["◧", "Parcialmente documentado"],
    AINDA_NAO_DA: ["?", "Ainda não dá para confirmar"],
    NAO_ENCONTRAMOS: ["□", "Não encontramos registro"]
  };
  var SELO_EXPLICA = {
    DOCUMENTADO: "Encontramos documentação que sustenta a afirmação no contexto apresentado.",
    NAO_ENCONTRAMOS: "Não encontramos registro nos arquivos consultados. Isso não significa que nunca aconteceu.",
    EM_CHECAGEM: "Ainda estamos conferindo. Não há conclusão.",
    AINDA_NAO_DA: "O que achamos não basta para confirmar nem para descartar.",
    PARCIALMENTE_DOCUMENTADO: "Uma parte tem documentação; outra parte não."
  };
  var CHECK = { FOI_DITO: "Checamos se foi dito", ACONTECEU: "Checamos se aconteceu" };
  function selo(s, check) {
    var d = SELO[s] || SELO.EM_CHECAGEM; if (!SELO[s]) s = "EM_CHECAGEM";
    return '<span class="selo ' + s + '"><span class="g" aria-hidden="true">' + d[0] + "</span>" + e(d[1]) + "</span>" +
      (check ? ' <span class="check-type">' + e(CHECK[check] || "") + "</span>" : "");
  }
  function pubm(kind, text) { return '<span class="pub ' + kind + '">' + text + "</span>"; }

  // ------------------------------------------------------------ componentes
  function secHead(title, more, id) {
    return '<div class="sec-head"><h2 class="h-sec"' + (id ? ' id="' + id + '"' : "") + ">" + title + "</h2>" + (more || "") + "</div>";
  }
  function empty(msg) { return '<p class="empty">' + e(msg) + "</p>"; }

  // EDITORIAL HERO — variante tipográfica/documental (não há imagem editorial no modelo).
  function hero(h, opts) {
    opts = opts || {};
    var tags = '<span class="tag y">' + e(opts.label || "Em destaque agora") + "</span>" +
      (opts.stateTag || "") +
      (h.lastPublished ? '<span class="tag o">Atualizado em ' + e(fdate(h.lastPublished)) + "</span>" : "");
    var src = h.lastSrc ? '<div class="src"><span class="ico" aria-hidden="true">' + (h.lastSrc.kind === "DOCUMENTO" || h.lastSrc.kind === "OFICIAL" ? "▤" : "↗") + '</span><div>' +
      '<p class="rotulo" style="color:#C9D6F2">' + e(h.lastSrc.kind === "DOCUMENTO" ? "Documento localizado" : "Fonte localizada") + "</p>" +
      '<p class="t">' + e(h.lastSrc.title) + '</p><p class="m">' + e(h.lastSrc.outlet || "") + "</p>" +
      '<p class="m">' + ext(h.lastSrc.url, "Veja a fonte ↗") + "</p></div></div>" : "";
    var title = opts.link ? '<a href="#/historia/' + e(h.slug) + '">' + e(h.title) + "</a>" : e(h.title);
    return '<section class="hero typo on-dark" aria-labelledby="hero-t"><div class="hero-in"><div>' +
      '<div class="tags">' + tags + "</div>" +
      '<h1 id="hero-t" class="display">' + title + "</h1>" +
      (h.lastT ? '<p class="finding"><mark>' + e(h.lastT) + "</mark></p>" : "") +
      '<div class="when"><time class="bigdate" datetime="' + e(h.lastD || "") + '">' + e(fdate(h.lastD)) + "</time><span>último registro" +
      (h.lastKicker ? " · " + e(h.lastKicker) : "") + "</span></div>" +
      "</div><aside class=\"hero-card\" aria-label=\"De onde veio\">" + src +
      (typeof h.n === "number" ? '<div class="hero-stats"><div><b>' + nf(h.n) + "</b><span>registros</span></div><div><b>" + nf(h.nsrc) + "</b><span>fontes</span></div></div>" : "") +
      (h.span ? '<p class="m" style="margin-top:10px;color:#D6D3D2">Nos arquivos de ' + e(h.span.replace("–", " a ")) + "</p>" : "") +
      "</aside></div></section>";
  }

  function checarBand() {
    return '<section class="checar-band on-dark" aria-labelledby="chk-t"><div class="row"><div>' +
      '<h2 id="chk-t">Checar</h2><p>Recebeu uma frase, link ou mensagem? Veja o que já existe nos nossos arquivos.</p></div>' +
      '<div class="check-input"><form data-check><label class="sr" for="chk-q">Cole a frase ou o link</label>' +
      '<input id="chk-q" name="q" type="text" placeholder="Cole aqui a frase, o link ou a mensagem" autocomplete="off">' +
      '<button class="btn" type="submit">Checar</button></form>' +
      '<div class="examples" aria-label="Exemplos">' + ["Banco Master", "Mensalão", "suspeição de Moro"].map(function (x) {
        return '<button type="button" data-example="' + e(x) + '">' + e(x) + "</button>";
      }).join("") + "</div></div></div></section>";
  }

  function claimCard(c, origin) {
    var o = origin || c.origin;
    return '<article class="claimcard">' +
      (o ? '<div class="origin"><div class="o-type">De onde veio · ' + e(o.type || "origem") + '</div><div class="o-preview">' + e(o.title || c.text) + '</div><div class="o-meta">' + e(o.outlet || "") + " · " + e(o.date ? fdate(o.date) : "data de publicação não registrada") + "</div></div>" : "") +
      '<div class="body"><span class="fomos">Fomos conferir</span><p class="phrase"><a href="#/afirmacao/' + e(c.slug) + '" style="text-decoration:none">' + e(c.text) + "</a></p>" +
      "<div>" + selo(c.selo, c.check) + "</div>" +
      (c.checked_at ? '<p class="fine">Conferido em ' + e(fdate(c.checked_at)) + "</p>" : "") + "</div></article>";
  }

  function circulatingCard(n) {
    var counts = Object.keys(n.counts || {}).map(function (k) { return selo(k) + ' <span class="fine" style="display:inline">×' + n.counts[k] + "</span>"; }).join(" ");
    return '<article class="claimcard"><div class="origin"><div class="o-type">De onde veio · ' + e(n.origin.type) + '</div><div class="o-preview">' + e(n.text) + '</div><div class="o-meta">' + e(n.origin.outlet) + " · " + e(n.origin.date ? fdate(n.origin.date) : "data de publicação não registrada") + "</div></div>" +
      '<div class="body"><span class="fomos">Fomos conferir</span><p class="phrase">' + plural(n.claims, "afirmação separada", "afirmações separadas") + ' desta imagem, uma a uma.</p><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">' + counts + "</div>" +
      '<p class="fine">A origem mostra de onde a frase veio. Ela não decide a resposta.</p><a class="link" href="#/circulando">Ver as afirmações</a></div></article>';
  }

  function hlCard(h) {
    var word = (h.topic || h.outlet || "").split(" ")[0];
    return '<a class="hlcard" href="' + e(safe(h.url) || "#/destaque") + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="outlet">' + e(h.outlet) + '</span><span class="bgword" aria-hidden="true">' + e(word) + "</span>" +
      "<h3>" + e(h.title) + '</h3><span class="d">' + e(fdate(h.date)) + (h.kind ? " · " + e(h.kind) : "") + " ↗</span></a>";
  }

  function findingCard(c) {
    var d = SELO[c.selo] || SELO.EM_CHECAGEM;
    return '<a class="finding-card" href="#/afirmacao/' + e(c.slug) + '"><span class="glyph ' + e(c.selo) + '" aria-hidden="true">' + d[0] + "</span><div>" +
      selo(c.selo) + "<p>" + e(c.text) + '</p><span class="check-type">' + e(CHECK[c.check] || "") + (c.checked_at ? " · " + e(fdate(c.checked_at)) : "") + "</span></div></a>";
  }

  function docSpotlight(doc, heading) {
    if (!doc) return "";
    return '<div class="docspot"><div class="docframe"><div class="docpage">' +
      '<div class="dh">' + e(doc.host || "") + " · " + e(fdate(doc.date)) + "</div>" +
      (doc.says ? '<p class="quote"><span>' + e(doc.says) + "</span></p>" : '<div class="lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><p class="fine">Prévia ilustrativa. Abra o original.</p>') +
      (doc.says ? '<span class="marc">MARCAÇÃO DO DESMENTINDO</span>' : "") + "</div></div>" +
      '<div class="docinfo"><div><h4>' + e(heading || "O documento") + '</h4><p style="font-weight:700">' + e(doc.title) + '</p><p class="meta">' + e(fdate(doc.date)) + " · " + e(doc.host || "") + '</p><p class="rotulo" style="margin-top:6px">Documento localizado · Ainda precisamos verificar o que ele realmente sustenta.</p></div>' +
      (doc.event ? '<div class="says"><h4>O que ele diz</h4><p>' + e(doc.event) + "</p></div>" : "") +
      '<div class="nsays"><h4>O que ele não diz</h4><p>' + e(doc.does_not_say || "O documento, sozinho, não confirma a interpretação. Abra o original.") + "</p></div>" +
      (doc.story ? '<p><a class="link" href="#/historia/' + e(doc.story.slug) + '">Entenda a história: ' + e(doc.story.title) + "</a></p>" : "") +
      "<div>" + ext(doc.url, "Ver documento original ↗", "btn blue") + "</div></div></div>";
  }

  function videoEvidence(v) {
    if (!v || !v.id) return "";
    return '<div class="video"><a class="frame" href="' + e(v.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Ver o vídeo na fonte">' +
      '<img src="https://i.ytimg.com/vi/' + e(v.id) + '/hqdefault.jpg" alt="Frame do vídeo citado como fonte" width="480" height="360" loading="lazy" style="width:100%;height:100%;object-fit:cover;filter:grayscale(1)">' +
      '<span class="tc">▶ VÍDEO</span></a>' +
      '<p class="meta" style="color:#D6D3D2;margin:8px 0 0">' + e(fdate(v.date)) + " · minutagem não registrada</p>" +
      (v.quote ? "<blockquote><mark>" + e(v.quote) + "</mark></blockquote>" : "<p style=\"margin:8px 0 0\">" + e(v.event) + "</p>") +
      '<p style="margin:8px 0 0">' + ext(v.url, "Ver trecho ↗") + "</p></div>";
  }

  function keyFacts(s) {
    var cells = s.nums.map(function (n) {
      return '<div class="fact"><div class="l">' + e(n.l) + '</div><div class="v' + (typeof n.v === "number" ? "" : " na") + '">' + (typeof n.v === "number" ? nf(n.v) : "Não registrado") + '</div><p class="s">' + e(n.s) + "</p></div>";
    }).join("");
    var tot = s.nfat + s.nal;
    var bar = tot ? '<div class="propbar"><div class="bar" role="img" aria-label="' + e(s.nfat + " fatos com fonte e " + s.nal + " alegações atribuídas") + '"><i class="f" style="width:' + (100 * s.nfat / tot).toFixed(1) + '%"></i><i class="a" style="width:' + (100 * s.nal / tot).toFixed(1) + '%"></i></div>' +
      '<div class="legend"><span><b style="background:var(--blue)"></b>' + nf(s.nfat) + " fatos com fonte</span><span><b style=\"background:var(--yellow);box-shadow:0 0 0 1px var(--ink)\"></b>" + nf(s.nal) + " alegações atribuídas</span></div></div>" +
      '<p class="note-side">Contagem dos registros desta história nos nossos arquivos' + (s.lastPublished ? ", até " + e(fdate(s.lastPublished)) : "") + ". Alegação atribuída é o que alguém afirma; não é fato.</p>" : "";
    return '<div class="facts">' + cells + "</div>" + bar;
  }

  function timeline(tl) {
    if (!tl || !tl.length) return empty("Ainda não há datas registradas para montar a linha do tempo.");
    return '<ol class="tl" style="--n:' + tl.length + '">' + tl.map(function (m, i) {
      return '<li class="' + (i === tl.length - 1 ? "now" : "") + '"><div class="d"><time datetime="' + e(m.date) + '">' + e(fdate(m.date)) + '</time></div><div class="k ' + (m.kicker === "ALEGAÇÃO ATRIBUÍDA" ? "kind-a" : "kind-f") + '">' + e(m.kicker) + '</div><p class="t">' + e(m.text) + "</p>" + (m.source_type ? '<div class="s">' + e(m.source_type) + "</div>" : "") + "</li>";
    }).join("") + "</ol>";
  }

  // OLHA A DATA — só com dois momentos, cada um com data, verbo, descrição, checagem e fonte.
  var VERBOS = ["disse", "declarou", "votou", "assinou", "apoiou", "declarou apoio", "assumiu o cargo", "entrou no governo", "saiu do governo", "rompeu", "publicou", "decidiu"];
  function olhaData(tc) {
    if (!tc || !tc.t1 || !tc.t2 || !tc.t1.source || !tc.t2.source) return "";
    if (VERBOS.indexOf(String(tc.t1.verb).toLowerCase()) < 0 || VERBOS.indexOf(String(tc.t2.verb).toLowerCase()) < 0) {
      if (!tc.human_reviewed) return ""; // verbo interpretativo sem revisão humana não entra
    }
    function mom(t, cls) {
      return '<div class="t ' + cls + '"><time class="bigdate" datetime="' + e(t.date) + '">' + e(fdate(t.date)) + '</time><div class="verb">' + e(t.verb) + "</div><p>" + e(t.text) + "</p><div>" + selo(t.status, t.check_type) + '</div><p class="src meta" style="color:#D6D3D2">' + ext(t.source.url, e(t.source.title) + " ↗") + " · " + e(fdate(t.source.date)) + "</p></div>";
    }
    var ex = tc.explanation || { state: "AINDA NÃO ENCONTRAMOS UMA EXPLICAÇÃO DOCUMENTADA" };
    return '<div class="olha on-dark">' + '<div class="cols">' + mom(tc.t1, "t1") + '<div class="gap">' + e(tc.interval_label || (yearsBetween(tc.t1.date, tc.t2.date) + " anos")) + "</div>" + mom(tc.t2, "t2") + "</div>" +
      '<div class="close"><div><h4>O que mudou?</h4><p>' + e(tc.what_changed || "") + "</p></div><div><h4>O que explica a mudança?</h4><p><strong>" + e(ex.state) + "</strong>" + (ex.text ? " " + e(ex.text) : "") + "</p></div></div>" +
      '<p class="fine" style="color:#D6D3D2;margin-top:12px">Mudar ao longo do tempo não é, sozinho, contradição.</p></div>';
  }

  function whatChanged(list) {
    if (!list || !list.length) return empty("Nenhuma mudança registrada nesta edição.");
    return list.map(function (c) {
      return '<div class="changed"><div class="old"><span class="rotulo">Antes · ' + e(c.before_at || "") + "</span><br>" + e(c.before) + '</div><div class="new"><span class="rotulo">Agora · ' + e(c.after_at || "") + "</span><br>" + e(c.after) + "</div></div>";
    }).join("");
  }

  function sourceRail(list, total) {
    if (!list || !list.length) return empty("Nenhuma fonte registrada.");
    return '<div class="hscroll rail" role="list">' + list.map(function (s) {
      return '<a role="listitem" class="srccard" href="' + e(safe(s.url) || "#") + '" target="_blank" rel="noopener noreferrer"><span class="ico ' + e(s.video ? "video" : s.kind) + '" aria-hidden="true">' + (s.video ? "▶" : e(s.glyph)) + '</span><span class="ty">' + e(s.video ? "VÍDEO" : s.label) + '</span><span class="ti">' + e(s.title) + '</span><span class="ou">' + e(s.outlet || "") + (s.date ? " · " + e(fdate(s.date)) : "") + '</span><span class="rotulo">' + e(s.rotulo) + '</span><span class="open">Abrir →</span></a>';
    }).join("") + "</div>" + (total > list.length ? '<p class="note-side">Mostrando ' + list.length + " de " + plural(total, "fonte", "fontes") + '. <a class="link" href="#fontes-todas" data-anchor>Ver todas</a></p>' : "");
  }
  function sourceList(list) {
    return '<ul class="srclist">' + list.map(function (s) {
      return '<li><span class="gl" aria-hidden="true">' + e(s.video ? "▶" : s.glyph) + "</span><div>" + ext(s.url, e(s.title)) + '<div class="meta">' + e(s.label) + " · " + e(s.outlet || "") + (s.date ? " · " + e(fdate(s.date)) : "") + ' · <span class="rotulo">' + e(s.rotulo) + "</span></div>" + (s.limit ? '<div class="fine">' + e(s.limit) + "</div>" : "") + "</div></li>";
    }).join("") + "</ul>";
  }

  // QUEM APARECE NESTA HISTÓRIA — o EVENTO é o centro; nunca pessoa ↔ pessoa.
  function cast(title, list) {
    if (!list || !list.length) return "";
    return '<div class="cast-center"><span class="dot" aria-hidden="true">●</span>' + e(title) + " · o centro desta história</div>" +
      '<div class="cast">' + list.map(function (p) {
        return '<div class="castcard"><div class="nm">' + e(p.name) + "</div>" + p.relations.map(function (r) {
          return '<div class="rel"><div class="vb">' + e(r.verb) + " · " + e(fdate(r.date)) + '</div><p class="tx">' + e(r.text) + '</p><div class="sr2">' + (r.source ? ext(r.source.url, e(r.source.outlet || "fonte") + " ↗") : "") + "</div></div>";
        }).join("") + "</div>";
      }).join("") + '</div><p class="legend-fixed">Aparecer aqui não é ser culpado.</p><p class="note-side">Cada ligação é com o fato, com verbo, data e fonte. Não ligamos pessoas entre si.</p>';
  }

  function archiveStrip(list) {
    if (!list || !list.length) return empty("Nada anterior registrado nos nossos arquivos.");
    return '<div class="hscroll archive" role="list">' + list.map(function (a, i) {
      var now = i === list.length - 1;
      return '<a role="listitem" class="arcard' + (now ? " now" : "") + '" href="#/registro/' + e(a.id) + '"><span class="yr">' + e(a.year) + '</span><p class="tx">' + e(a.text) + '</p><span class="k">' + e(fdate(a.date)) + (now ? " · MAIS RECENTE" : "") + "</span></a>";
    }).join("") + '</div><p class="note-side"><strong>Aparecer antes não prova o fato de hoje.</strong></p>';
  }

  function openQuestions(qs) {
    if (!qs || !qs.length) return empty("Os dados atuais não registram perguntas abertas para este caso.");
    return '<div class="qs">' + qs.map(function (q, i) {
      return '<div class="q"><span class="n">' + String(i + 1).padStart(2, "0") + "</span><div><p>" + e(q.text) + '</p><div class="st">◉ ' + e(q.status) + (q.date ? " · " + e(fdate(q.date)) : "") + "</div></div></div>";
    }).join("") + "</div>";
  }

  function transparency(t) {
    return '<div class="transp" role="contentinfo" aria-label="Transparência">' +
      (t.published ? "<span>" + pubm("PUBLICADO", "Publicado") + " " + e(fdate(t.published)) + "</span>" : "") +
      (t.updated ? "<span>" + pubm("ATUALIZADO", "↻ Atualizado") + " " + e(fdate(t.updated)) + "</span>" : "") +
      (typeof t.sources === "number" ? "<span>" + plural(t.sources, "fonte", "fontes") + "</span>" : "") +
      '<a href="#/correcoes">Achou um erro?</a><a href="#/envie">Foi citado nesta história? Envie sua versão.</a></div>';
  }

  function newsletter() {
    return '<div class="newsletter"><div class="k">DESMENTINDO | FECHAMENTO</div><h3>Todo fim de tarde, o que realmente importou no dia.</h3>' +
      '<form data-newsletter novalidate><label class="sr" for="nl-e">Seu e-mail</label><input id="nl-e" type="email" name="email" placeholder="seu@email.com" autocomplete="email"><button class="btn" type="submit">Quero receber O Dia</button></form>' +
      '<p class="status-msg" role="status" aria-live="polite"></p></div>';
  }

  function storyRow(s) {
    var p = parts(s.lastD);
    return '<a class="storyrow" href="#/historia/' + e(s.slug) + '"><span class="y">' + e(p ? p.y : "—") + "</span><div><h3>" + e(s.title) + "</h3><p>" + e(s.lastT || "") + '</p><p class="meta">' + plural(s.n, "registro", "registros") + (s.span ? " · " + e(s.span) : "") + " · último em " + e(fdate(s.lastD)) + "</p></div></a>";
  }

  // ------------------------------------------------------------ páginas
  var P = {};
  var CTX = {};

  P.home = function () {
    return Promise.all([load("home.json"), load("historias.json")]).then(function (r) {
      var H = r[0];
      setAssinatura(H);
      var h = '<h1 class="sr">Desmentindo — agora</h1>';
      h += H.hero ? hero(H.hero, { link: true, label: "História do momento", stateTag: H.hero.state === "CHECAGEM" ? '<span class="tag y">◉ Ainda estamos conferindo</span>' : "" }) : empty("Ainda não há história publicada nesta edição.");
      h += checarBand();
      h += '<section class="sec">' + secHead("Está circulando", '<a class="more" href="#/circulando">Ver tudo →</a>') +
        (H.circulating.length ? '<div class="grid" style="--min:280px">' + H.circulating.map(circulatingCard).join("") + H.claims_preview.slice(0, 2).map(function (c) { return claimCard(c); }).join("") + "</div>" : empty("Nada circulando registrado nesta edição.")) + "</section>";
      h += '<section class="sec split"><div>' + secHead("O que mudou hoje") + whatChanged(H.what_changed) + '<p class="note-side">Mostramos aqui quando uma afirmação muda de estado. Se mudou, a gente mostra.</p></div>' +
        "<div>" + secHead("Documento do dia") + (H.doc_of_day ? docSpotlight(H.doc_of_day, "O documento") : empty("Nenhum documento novo nesta edição.")) + "</div></section>";
      h += '<section class="sec">' + secHead("Em destaque hoje", '<a class="more" href="#/destaque">Ver tudo →</a>') +
        (H.highlights.length ? '<div class="grid" style="--min:220px">' + H.highlights.slice(0, 4).map(hlCard).join("") + '</div><p class="note-side">Notícias do dia em ' + e(fdate(H.hub_edition)) + ". <strong>Aparecer em muitos veículos não é comprovar.</strong></p>" : empty("Sem destaques registrados nesta edição.")) + "</section>";
      h += '<section class="sec">' + secHead("Já checamos", '<a class="more" href="#/checamos">Ver tudo →</a>') +
        (H.checked.length ? '<div class="grid" style="--min:300px">' + H.checked.map(findingCard).join("") + "</div>" : empty("Nenhuma checagem concluída nesta edição.")) + "</section>";
      h += '<section class="sec">' + secHead("Isso já apareceu antes", H.hero ? '<a class="more" href="#/caso/' + e(H.hero.slug) + '">Entenda o caso →</a>' : "") + archiveStrip(H.archive) + "</section>";
      h += '<section class="sec split"><div>' + secHead("Nos arquivos", '<a class="more" href="#/arquivos">Abrir →</a>') +
        '<div class="facts">' + [["Histórias", H.stats.stories], ["Registros", H.stats.records], ["Fontes", H.stats.sources], ["Vídeos pesquisáveis", H.stats.videos]].map(function (x) {
          return '<div class="fact"><div class="l">' + x[0] + '</div><div class="v">' + nf(x[1]) + "</div></div>";
        }).join("") + "</div>" + H.more.slice(0, 4).map(storyRow).join("") + "</div><div>" + secHead("Receba O Dia") + newsletter() + "</div></section>";
      h += '<section class="sec"><div class="data-strip"><span class="logo-data">DATA</span><div><strong>Use no seu trabalho.</strong> Arquivos pesquisáveis, registros com fonte e data para redações, pesquisa e escolas.</div><a class="link" href="#/data">Desmentindo Data →</a></div></section>';
      return h;
    });
  };

  // ---------- História (05–10: mesma URL, estados condicionais)
  function storyStates(s, edition) {
    var st = [];
    if (s.corrections && s.corrections.length) st.push("CORRIGIDA");
    var byDay = {};
    (s.events || []).forEach(function (x) { if (x.published) (byDay[x.published] = byDay[x.published] || []).push(x); });
    var days = Object.keys(byDay).sort().reverse();
    var cont = days.length > 1 && days[0] === s.lastPublished && yearsBetween(days[0], days[1]) === 0 &&
      (Date.parse(days[0]) - Date.parse(days[1])) <= 7 * 864e5;
    if (cont) st.push("CONTINUA");
    if (s.lastPublished && s.lastPublished === edition) st.push("ATUALIZADA");
    if (s.state === "CHECAGEM") st.push("CHECAGEM");
    if (!st.length) st.push("AGORA");
    return { list: st, byDay: byDay, days: days };
  }

  P.historia = function (slug) {
    return Promise.all([load("historias/" + slug + ".json"), load("home.json")]).then(function (r) {
      var s = r[0], H = r[1]; setAssinatura(H, true);
      var ST = storyStates(s, H.edition);
      var primary = ST.list[0];
      var stateTag = { CORRIGIDA: '<span class="tag y">✎ Corrigida</span>', CONTINUA: '<span class="tag y">Novo desdobramento</span>', ATUALIZADA: '<span class="tag">↻ Atualizada</span>', CHECAGEM: '<span class="tag y">◉ Em checagem</span>', AGORA: '<span class="tag y">Agora</span>' }[primary];
      var mods = [];
      function mod(id, title, html) { if (html) mods.push({ id: id, title: title, html: html }); }
      mod("fatos", "Fatos-chave", keyFacts(s));
      mod("linha", "Linha do tempo", timeline(s.tl));
      var text = (s.lede ? '<div class="prose"><p>' + e(s.lede) + "</p></div>" : "") +
        (s.responses && s.responses.length ? s.responses.map(function (x) {
          return '<div class="response"><div class="rotulo k">✉ O que diz o citado · segundo a fonte · ' + e(fdate(x.date)) + "</div><p style=\"margin:6px 0 0\">" + e(x.text) + "</p>" + (x.source ? '<p class="meta">' + ext(x.source.url, e(x.source.outlet || "fonte") + " ↗") + "</p>" : "") + "</div>";
        }).join("") : "");
      mod("texto", "O que aconteceu", text);
      mod("documento", "Documento em destaque", docSpotlight(s.doc));
      mod("video", "Vídeo", videoEvidence(s.video));
      mod("olha", "Olha a data", (s.temporal_contrasts || []).map(olhaData).join(""));
      mod("quem", "Quem aparece nesta história", cast(s.title, s.cast));
      mod("antes", "Isso já apareceu antes", s.archive && s.archive.length > 1 ? archiveStrip(s.archive) : "");
      mod("fontes", "Fontes", sourceRail(s.rail, s.sources.length) + (s.sources.length > s.rail.length ? '<details class="more-records" id="fontes-todas"><summary>Todas as ' + plural(s.sources.length, "fonte", "fontes") + "</summary>" + sourceList(s.sources) + "</details>" : ""));
      mod("naosabemos", "O que ainda não sabemos", openQuestions(s.questions));
      mod("envie", "Envie sua versão", '<p>Foi citado nesta história ou tem um documento que muda o que está aqui? <a class="link" href="#/envie?historia=' + e(s.slug) + '">Envie sua versão</a>. Se publicarmos, a resposta aparece nesta mesma página, com data.</p>');

      var h = "";
      if (ST.list.indexOf("CORRIGIDA") >= 0) h += '<div class="correction-band"><strong>✎ Corrigida.</strong> ' + s.corrections.map(function (c) { return e(fdate(c.date)) + ": " + e(c.text); }).join(" · ") + ' <a class="link" href="#updates">Ver registro de atualizações</a></div>';
      h += hero({ slug: s.slug, title: s.title, lastD: s.lastD, lastPublished: s.lastPublished, lastT: s.lastT, lastKicker: s.lastKicker, lastSrc: s.lastSrc, n: s.nums[0].v, nsrc: s.nums[1].v, span: s.span }, { label: "História", stateTag: stateTag });
      if (ST.list.indexOf("CHECAGEM") >= 0) h += '<div class="checking-band">◉ Ainda estamos conferindo. O que está abaixo tem fonte, mas parte do caso ainda não tem conclusão.</div>';
      if (ST.list.indexOf("CONTINUA") >= 0) {
        var d0 = ST.days[0], d1 = ST.days[1];
        h += '<section class="continua" aria-label="Novo desdobramento"><span class="lbl">NOVO DESDOBRAMENTO · registrado em ' + e(fdate(d0)) + "</span>" +
          ST.byDay[d0].slice(0, 3).map(function (x) { return '<div class="record"><div class="top"><span class="d">' + e(fdate(x.date)) + '</span><span class="kicker ' + (x.kicker === "ALEGAÇÃO ATRIBUÍDA" ? "kind-a" : "kind-f") + '">' + e(x.kicker) + "</span></div><p>" + e(x.text) + "</p></div>"; }).join("") +
          '<p class="meta" style="margin-top:14px">ANTES · registrado em ' + e(fdate(d1)) + "</p>" +
          ST.byDay[d1].slice(0, 2).map(function (x) { return '<div class="record" style="opacity:.85"><div class="top"><span class="d">' + e(fdate(x.date)) + "</span></div><p>" + e(x.text) + "</p></div>"; }).join("") + "</section>";
      }
      h += '<div class="story-layout"><div class="reading">';
      mods.forEach(function (m) { h += '<section class="sec" aria-labelledby="m-' + m.id + '">' + secHead(e(m.title), "", "m-" + m.id) + m.html + "</section>"; });
      if (ST.list.indexOf("CORRIGIDA") >= 0) h += '<section class="sec" id="updates">' + secHead("Registro de atualizações") + '<ul class="updates">' + s.corrections.map(function (c) { return "<li><strong>" + e(fdate(c.date)) + '</strong><div><span class="old-version">' + e(c.before || "") + "</span><br>" + e(c.text) + "</div></li>"; }).join("") + "</ul></section>";
      h += '<section class="sec">' + secHead("Todos os registros", '<a class="more" href="#/caso/' + e(s.slug) + '">Entenda o caso →</a>') +
        '<details class="more-records"><summary>' + plural(s.events.length, "registro", "registros") + " em ordem do mais recente</summary>" +
        s.events.slice(0, 80).map(recordCard).join("") + (s.events.length > 80 ? '<p class="note-side">Mais registros em <a class="link" href="#/caso/' + e(s.slug) + '">Entenda o caso</a>.</p>' : "") + "</details></section>";
      h += transparency({ updated: s.lastPublished, sources: s.sources.length });
      h += '</div><aside class="toc" aria-label="Nesta história"><h2>Nesta história</h2><ol>' + mods.map(function (m) { return '<li><a href="#m-' + m.id + '" data-anchor>' + e(m.title) + "</a></li>"; }).join("") + "</ol></aside></div>";
      document.title = s.title + " · Desmentindo";
      return h;
    });
  };

  function recordCard(x) {
    return '<article class="record"><div class="top"><a class="d" href="#/registro/' + e(x.id) + '" style="text-decoration:none">' + e(fdate(x.date)) + '</a><span class="kicker ' + (x.kicker === "ALEGAÇÃO ATRIBUÍDA" ? "kind-a" : "kind-f") + '">' + e(x.kicker) + "</span></div><p>" + e(x.text) + "</p>" +
      (x.response ? '<p class="meta"><strong>✉ O que diz o citado:</strong> ' + e(x.response) + "</p>" : "") +
      '<p class="meta">' + (x.sources || []).slice(0, 3).map(function (s) { return ext(s.url, e(s.outlet || s.label) + " ↗"); }).join(" · ") + "</p></article>";
  }

  // ---------- Afirmação (10)
  P.afirmacao = function (slug) {
    return Promise.all([load("afirmacoes.json"), load("home.json")]).then(function (r) {
      setAssinatura(r[1], true);
      var c = r[0].claims.filter(function (x) { return x.slug === slug; })[0];
      if (!c) return notFound();
      var h = '<section class="page-head"><p class="kicker">Afirmação · ' + e(CHECK[c.check]) + "</p>" +
        '<div class="quote-v" style="margin-top:12px"><h1 class="sr">Checamos: ' + e(c.text) + '</h1><blockquote>“' + e(c.text) + '”</blockquote><div class="who">' + (c.origin ? "Circulou em: " + e(c.origin.title) + " · " + e(c.origin.outlet) + " · " + e(c.origin.type) : "") + "</div>" +
        '<div style="margin-top:14px">' + selo(c.selo, c.check) + '</div><p class="fine" style="margin-top:8px">' + e(SELO_EXPLICA[c.selo] || "") + "</p></div></section>";
      h += '<div class="story-layout"><div class="reading">';
      h += '<section class="sec">' + secHead("O que encontramos") + '<div class="docinfo" style="padding:0"><div class="says"><h4>O que as fontes mostram</h4><p>' + e(c.proves || "Não registrado.") + '</p></div><div class="nsays"><h4>O que isso não mostra</h4><p>' + e(c.not_proves || "Não registrado.") + "</p></div>" +
        (c.limits ? '<div class="nsays"><h4>Limites da checagem</h4><p>' + e(c.limits) + "</p></div>" : "") + "</div></section>";
      if (c.cited_version) h += '<section class="sec">' + secHead("O que diz o citado") + '<div class="response"><div class="rotulo k">✉ Segundo a fonte</div><p style="margin:6px 0 0">' + e(c.cited_version) + "</p></div></section>";
      h += '<section class="sec">' + secHead("Fontes") + (c.sources.length ? '<ul class="srclist">' + c.sources.map(function (s) {
        return '<li><span class="gl" aria-hidden="true">' + (s.kind === "REPORTAGEM" ? "↗" : "▤") + "</span><div>" + ext(s.url, e(s.title)) + '<div class="meta">' + e(s.kind) + " · " + e(s.outlet || "") + ' · <span class="rotulo">' + e(s.rotulo) + "</span></div>" + (s.origin ? '<div class="fine">De onde a fonte tirou: ' + e(s.origin) + "</div>" : "") + "</div></li>";
      }).join("") + "</ul>" : empty("Nenhuma fonte registrada.")) + '<p class="note-side">Fonte localizada, sozinha, não confirma a afirmação.</p></section>';
      h += '<section class="sec">' + secHead("O que ainda não sabemos") + openQuestions(c.open.map(function (t) { return { text: t, status: "ABERTA" }; })) + "</section>";
      h += transparency({ updated: c.checked_at, sources: c.sources.length });
      h += '</div><aside class="toc"><h2>Onde circulou</h2>' + (c.origin ? '<p style="margin:0;font-weight:700">' + e(c.origin.title) + '</p><p class="meta">' + e(c.origin.outlet) + " · " + e(c.origin.type) + '</p><p class="fine">A origem mostra de onde a frase veio. Ela não decide a resposta.</p>' : "<p>Origem não registrada.</p>") +
        (c.block ? '<p class="meta">Parte do bloco: ' + e(c.block) + "</p>" : "") + '<p><a class="link" href="#/circulando">Ver as outras afirmações</a></p></aside></div>';
      document.title = "Checamos: " + c.text.slice(0, 60) + " · Desmentindo";
      return h;
    });
  };

  // ---------- Está circulando (02)
  P.circulando = function () {
    return load("afirmacoes.json").then(function (A) {
      var f = qparam("f") || "tudo";
      var FIL = [["tudo", "Tudo"], ["checagem", "Em checagem"], ["conferido", "Já conferido"], ["video", "Vídeo"], ["post", "Post"], ["mensagem", "Mensagem"]];
      var list = A.claims.filter(function (c) {
        if (f === "checagem") return c.selo === "EM_CHECAGEM";
        if (f === "conferido") return c.selo !== "EM_CHECAGEM";
        if (f === "video" || f === "mensagem") return false;
        return true;
      });
      var h = '<section class="page-head"><p class="kicker">Está circulando</p><h1 class="h-page">O que está rodando por aí</h1><p class="lead">Frases, posts e mensagens que chegaram até nós. Mostramos a origem e o que fomos conferir.</p></section>';
      h += '<div class="filters" role="group" aria-label="Filtrar">' + FIL.map(function (x) { return '<button type="button" data-filter="' + x[0] + '" aria-pressed="' + (x[0] === f) + '">' + x[1] + "</button>"; }).join("") + "</div>";
      if (f === "tudo" || f === "post") h += '<div class="grid" style="--min:300px;margin-bottom:16px">' + A.circulating.map(circulatingCard).join("") + "</div>";
      h += list.length ? '<div class="grid" style="--min:280px">' + list.map(function (c) { return claimCard(c); }).join("") + "</div>" : empty(f === "video" ? "Nenhum vídeo circulando registrado." : f === "mensagem" ? "Nenhuma mensagem circulando registrada." : "Nada neste filtro.");
      h += '<p class="note-side">A origem mostra de onde a frase veio. Ela não decide a resposta.</p>';
      return h;
    });
  };

  // ---------- Em destaque hoje (03)
  P.destaque = function () {
    return load("destaques.json").then(function (D) {
      return '<section class="page-head"><p class="kicker">Em destaque hoje · ' + e(fdate(D.edition)) + '</p><h1 class="h-page">O que saiu na imprensa</h1><p class="lead">As notícias do dia que acompanhamos. Aqui não há selo de checagem: é o que foi publicado, com o link para a fonte.</p></section>' +
        (D.items.length ? '<div class="grid" style="--min:240px;margin-top:20px">' + D.items.map(hlCard).join("") + "</div>" : empty("Sem destaques registrados nesta edição.")) +
        '<section class="sec">' + D.items.map(function (x) { return '<article class="record"><div class="top"><span class="kicker">' + e(x.outlet) + " · " + e(fdate(x.date)) + (x.kind ? " · " + e(x.kind) : "") + "</span></div><p><strong>" + ext(x.url, e(x.title)) + "</strong></p>" + (x.note ? '<p class="meta">' + e(x.note) + "</p>" : "") + "</article>"; }).join("") + "</section>" +
        '<p class="note-side"><strong>Aparecer em muitos veículos não é comprovar.</strong></p>';
    });
  };

  // ---------- Já checamos (04) agrupado por dia
  P.checamos = function () {
    return load("afirmacoes.json").then(function (A) {
      var done = A.claims.filter(function (c) { return c.selo !== "EM_CHECAGEM"; });
      var by = {};
      done.forEach(function (c) { (by[c.checked_at || "sem-data"] = by[c.checked_at || "sem-data"] || []).push(c); });
      var h = '<section class="page-head"><p class="kicker">Já checamos</p><h1 class="h-page">O que já conferimos</h1><p class="lead">Cada afirmação tem um selo e diz se checamos se foi dito ou se aconteceu.</p></section>';
      h += Object.keys(by).sort().reverse().map(function (d) {
        return '<div class="daygroup"><h3>' + e(fdate(d)) + '</h3><div class="grid" style="--min:300px">' + by[d].map(findingCard).join("") + "</div></div>";
      }).join("") || empty("Nenhuma checagem concluída ainda.");
      return h;
    });
  };

  // ---------- Checar (11 entrada · 12 o que já existe · 13 enviado)
  P.checar = function (sub) {
    if (sub === "enviado") {
      return Promise.resolve('<section class="page-head"><p class="kicker">Checar · envio</p><h1 class="h-page">Ainda não recebemos envios por aqui</h1>' +
        '<p class="lead">O envio para checagem ainda não está aberto nesta versão. <strong>Nada foi enviado nem guardado.</strong></p>' +
        '<div class="notice">Enquanto isso, você pode procurar nos nossos arquivos ou ver o que já checamos.</div>' +
        '<p style="margin-top:16px"><a class="btn line" href="#/checar">Voltar para Checar</a> <a class="btn line" href="#/checamos">Ver o que já checamos</a></p></section>');
    }
    var q = qparam("q");
    var head = '<section class="page-head"><p class="kicker" style="color:var(--green-ink)">Checar</p><h1 class="h-page">Recebeu algo? A gente confere.</h1><p class="lead">Cole a frase, o link ou a mensagem. Primeiro mostramos o que já existe nos nossos arquivos.</p></section>' +
      '<div class="check-input" style="margin-top:18px"><div class="tabs" role="tablist" aria-label="Tipo de entrada">' +
      '<button role="tab" aria-selected="true" type="button">Texto/mensagem</button><button role="tab" aria-selected="false" type="button" data-tab="link">Link</button>' +
      '<button role="tab" aria-selected="false" type="button" disabled>Print<span class="soon">EM ESTUDO</span></button><button role="tab" aria-selected="false" type="button" disabled>Vídeo<span class="soon">EM ESTUDO</span></button></div>' +
      '<form data-check><label class="sr" for="chk-main">O que você quer checar</label><textarea id="chk-main" name="q" rows="3" placeholder="Cole aqui a frase, o link ou a mensagem">' + e(q) + '</textarea><button class="btn green" type="submit">Checar</button></form>' +
      '<div class="examples dark" aria-label="Exemplos">' + ["Banco Master", "Toffoli", "Triplex", "Careca do INSS"].map(function (x) { return '<button type="button" data-example="' + e(x) + '">' + e(x) + "</button>"; }).join("") + "</div></div>";
    if (!q) return Promise.resolve(head);
    return search(q).then(function (R) {
      var h = head + '<section class="sec">' + secHead("O que já existe sobre isso") + '<p class="meta">Buscamos por “' + e(q) + '”.</p>';
      var checking = R.claims.filter(function (c) { return c.selo === "EM_CHECAGEM"; });
      var done = R.claims.filter(function (c) { return c.selo !== "EM_CHECAGEM"; });
      h += '<div class="sec">' + '<h3 class="kicker">Já checamos</h3>' + (done.length ? '<div class="grid" style="--min:300px;margin-top:10px">' + done.slice(0, 6).map(findingCard).join("") + "</div>" : empty("Nenhuma afirmação checada com esses termos.")) + "</div>";
      h += '<div class="sec"><h3 class="kicker">Já estamos checando</h3>' + (checking.length ? '<div class="grid" style="--min:300px;margin-top:10px">' + checking.map(findingCard).join("") + "</div>" : empty("Nada em checagem com esses termos.")) + "</div>";
      h += '<div class="sec"><h3 class="kicker">Isso já apareceu antes</h3>' + (R.records.length ? R.records.slice(0, 5).map(function (x) { return resultItem(x); }).join("") + '<p class="note-side"><a class="link" href="#/resultado?q=' + encodeURIComponent(q) + '">Ver ' + plural(R.records.length, "registro", "registros") + " no tempo →</a></p>" : empty("Não encontramos registro nos arquivos consultados. Isso não significa que nunca aconteceu.")) + "</div>";
      h += '<div class="sec"><h3 class="kicker">Nada disso responde?</h3><p>Envie para checagem. <a class="btn green" href="#/checar/enviado">Enviar para checagem</a></p></div></section>';
      return h;
    });
  };

  // ---------- busca (usada por Checar, Buscar, Resultado no tempo)
  function search(q) {
    return Promise.all([load("busca.json"), load("historias.json"), load("afirmacoes.json")]).then(function (r) {
      var idx = r[0], toks = norm(q).split(/\s+/).filter(function (t) { return t.length > 1; });
      function hit(text) { var n = norm(text); return toks.length && toks.every(function (t) { return n.indexOf(t) >= 0; }); }
      var records = [], stories = [], claims = [], people = {};
      idx.forEach(function (x) {
        if (x.t === "registro") {
          var whoHit = (x.who || []).filter(function (w) { return hit(w); });
          if (hit(x.x) || whoHit.length) {
            records.push(x);
            whoHit.forEach(function (w) { people[w] = people[w] || {}; (x.stories || []).forEach(function (s) { people[w][s] = (people[w][s] || 0) + 1; }); });
          }
        } else if (x.t === "historia" && hit(x.x)) stories.push(x);
      });
      var slugs = {}; r[1].forEach(function (s) { slugs[s.slug] = s; });
      claims = r[2].claims.filter(function (c) { return hit(c.text); });
      records.sort(function (a, b) { return (b.d || "").localeCompare(a.d || ""); });
      return { q: q, records: records, stories: stories.map(function (s) { return slugs[s.slug]; }).filter(Boolean), claims: claims, people: people, slugs: slugs };
    });
  }
  function resultItem(x) {
    return '<article class="result"><div><div class="d">' + e(fdate(x.d)) + '</div><div class="ty">' + e(x.k || "Registro") + "</div></div><div><p>" + e(x.x.length > 260 ? x.x.slice(0, 260).replace(/\s+\S*$/, "") + "…" : x.x) + '</p><a class="link" href="#/registro/' + e(x.id) + '">Ver o registro</a></div></article>';
  }

  // ---------- Resultado no tempo (15) / Buscar
  P.resultado = function () {
    var q = qparam("q");
    var form = '<form role="search" data-search class="check-input" style="margin-top:16px"><label class="sr" for="q-main">Procurar</label><div style="display:flex;box-shadow:0 0 0 3px var(--ink);background:#fff"><input id="q-main" name="q" type="search" value="' + e(q) + '" placeholder="Procure uma frase, pessoa ou assunto…" style="flex:1;min-width:0;border:0;padding:14px;font-size:17px"><button class="btn" type="submit">Buscar</button></div></form>';
    var head = '<section class="page-head"><p class="kicker">Resultado no tempo</p><h1 class="h-page">' + (q ? "“" + e(q) + "”" : "Buscar nos nossos arquivos") + "</h1>" + form + "</section>";
    if (!q) return Promise.resolve(head + '<p class="note-side">Busque por uma frase, um assunto ou um nome. Busca por nome mostra em quais histórias a pessoa aparece.</p>');
    return search(q).then(function (R) {
      var h = head;
      var names = Object.keys(R.people);
      if (names.length) {
        h += '<section class="sec">' + secHead("Em quais histórias aparece") + names.slice(0, 3).map(function (n) {
          var st = Object.keys(R.people[n]).map(function (s) { return R.slugs[s]; }).filter(Boolean);
          return '<p style="font-weight:800;margin:12px 0 4px">' + e(n) + '</p><p class="note-side" style="margin:0 0 6px">Aparecer aqui não é ser culpado.</p>' + st.map(storyRow).join("");
        }).join("") + "</section>";
      }
      if (R.stories.length) h += '<section class="sec">' + secHead("Histórias") + R.stories.map(storyRow).join("") + "</section>";
      if (R.claims.length) h += '<section class="sec">' + secHead("Afirmações checadas") + '<div class="grid" style="--min:300px">' + R.claims.map(findingCard).join("") + "</div></section>";
      if (!R.records.length && !R.stories.length && !R.claims.length) {
        return h + '<section class="sec">' + empty("Não encontramos registro nos arquivos consultados. Isso não significa que nunca aconteceu.") + '<p class="note-side">Os vídeos do arquivo têm busca própria em <a class="link" href="#/arquivos?q=' + encodeURIComponent(q) + '">Nos arquivos</a>.</p></section>';
      }
      var by = {};
      R.records.forEach(function (x) { var y = (x.d || "").slice(0, 4); (by[y] = by[y] || []).push(x); });
      h += '<section class="sec">' + secHead(plural(R.records.length, "registro", "registros") + " no tempo") +
        Object.keys(by).sort().reverse().map(function (y) { return '<h3 class="results-year">' + e(y) + "</h3>" + by[y].slice(0, 20).map(resultItem).join("") + (by[y].length > 20 ? '<p class="note-side">+ ' + (by[y].length - 20) + " neste ano</p>" : ""); }).join("") + "</section>";
      return h;
    });
  };

  // ---------- Registro histórico (16)
  P.registro = function (id) {
    return load("registros.json").then(function (idx) {
      var slugs = idx[id];
      if (!slugs || !slugs.length) return notFound("Registro não encontrado.");
      return Promise.all([load("historias/" + slugs[0] + ".json"), load("historias.json")]).then(function (r) {
        var s = r[0], x = s.events.filter(function (v) { return v.id === id; })[0];
        if (!x) return notFound("Registro não encontrado.");
        var all = {}; r[1].forEach(function (t) { all[t.slug] = t; });
        var src = x.sources[0];
        var h = '<section class="page-head"><p class="kicker ' + (x.kicker === "ALEGAÇÃO ATRIBUÍDA" ? "kind-a" : "kind-f") + '">Registro · ' + e(x.kicker) + '</p><h1 style="margin:0"><time class="bigdate" style="font-size:clamp(56px,11cqi,140px);display:block" datetime="' + e(x.date) + '">' + e(fdate(x.date)) + '</time><span class="sr"> — registro em ' + e(s.title) + "</span></h1></section>";
        h += '<div class="split sec"><div>';
        if (src && src.excerpt) h += docSpotlight({ title: src.title, url: src.url, host: src.outlet, date: x.date, says: src.excerpt, event: x.text, does_not_say: src.limit || x.limits }, "Trecho original");
        else h += '<div class="prose"><p>' + e(x.text) + "</p></div>";
        if (x.response) h += '<div class="response"><div class="rotulo k">✉ O que diz o citado · segundo a fonte</div><p style="margin:6px 0 0">' + e(x.response) + "</p></div>";
        h += '</div><div><div class="card bar"><h2 class="kicker">De onde veio</h2>' + (x.sources.length ? sourceList(x.sources) : empty("Fonte não registrada.")) +
          '<p class="meta">Publicado em: ' + e(fdate(x.published)) + "</p></div>" +
          '<div class="card" style="margin-top:14px"><h2 class="kicker">Este trecho aparece em</h2>' + slugs.map(function (sl) { return all[sl] ? storyRow(all[sl]) : ""; }).join("") + "</div></div></div>";
        h += '<p class="note-side">Aparecer antes não prova o fato de hoje.</p>';
        return h;
      });
    });
  };

  // ---------- Entenda o caso (17)
  P.caso = function (slug) {
    return load("historias/" + slug + ".json").then(function (s) {
      var by = {};
      s.events.forEach(function (x) { var y = (x.date || "").slice(0, 4); (by[y] = by[y] || []).push(x); });
      var h = '<section class="page-head"><p class="kicker">Entenda o caso</p><h1 class="h-page">' + e(s.title) + '</h1><p class="lead">' + (s.span ? "De " + e(s.span.replace("–", " a ")) + ". " : "") + plural(s.nums[0].v, "registro", "registros") + " com fonte e data nos nossos arquivos.</p><p><a class=\"btn\" href=\"#/historia/" + e(s.slug) + '">Ver a história agora</a></p></section>';
      h += '<section class="sec">' + secHead("Fatos-chave") + keyFacts(s) + "</section>";
      h += '<section class="sec">' + secHead("Linha do tempo") + timeline(s.tl) + "</section>";
      if (s.cast.length) h += '<section class="sec">' + secHead("Quem aparece neste caso") + cast(s.title, s.cast) + "</section>";
      h += '<section class="sec">' + secHead("Ano a ano") + Object.keys(by).sort().reverse().map(function (y) {
        return '<details class="more-records"' + (y === Object.keys(by).sort().reverse()[0] ? " open" : "") + '><summary><span class="bigdate" style="font-size:40px">' + e(y) + "</span> · " + plural(by[y].length, "registro", "registros") + "</summary>" + by[y].map(recordCard).join("") + "</details>";
      }).join("") + "</section>";
      h += transparency({ updated: s.lastPublished, sources: s.sources.length });
      document.title = "Entenda o caso: " + s.title + " · Desmentindo";
      return h;
    });
  };

  // ---------- Nos arquivos (14)
  P.arquivos = function () {
    return Promise.all([load("arquivos.json"), load("historias.json"), load("home.json")]).then(function (r) {
      var A = r[0], S = r[1], q = qparam("q");
      var h = '<section class="page-head"><p class="kicker">Nos arquivos</p><h1 class="h-page">O que já foi dito, com data e fonte</h1><p class="lead">Histórias com registros e fontes, e o arquivo de vídeos com transcrição pesquisável.</p></section>';
      h += '<section class="sec">' + secHead("Vídeos pesquisáveis") + '<div class="grid" style="--min:240px">' + A.sources.map(function (s) {
        var pct = s.total ? Math.round(100 * s.indexed / s.total) : 0;
        return '<div class="fact"><div class="l">' + e(s.name) + '</div><div class="v' + (s.searchable ? "" : " na") + '">' + (s.searchable ? nf(s.indexed) : "Ainda não pesquisável") + '</div><p class="s">' + nf(s.indexed) + " de " + nf(s.total) + " vídeos processados (" + pct + "%)" + (s.latest ? " · até " + e(fdate(s.latest)) : "") + "</p></div>";
      }).join("") + '</div><p class="note-side">Fonte fora da busca aparece como “ainda não pesquisável”. Isso não é o mesmo que “nada encontrado”.</p>' +
        '<form data-archive class="check-input" style="margin-top:14px"><label class="sr" for="arq-q">Procurar uma frase nos vídeos</label><div style="display:flex;box-shadow:0 0 0 3px var(--ink);background:#fff"><input id="arq-q" name="q" type="search" value="' + e(q) + '" placeholder="Procure uma frase dita nos vídeos" style="flex:1;min-width:0;border:0;padding:14px;font-size:17px"><button class="btn" type="submit">Buscar nos vídeos</button></div></form>' +
        '<p class="meta">A primeira busca baixa o arquivo de transcrições (cerca de 7 MB).</p><div id="arq-results" aria-live="polite"></div></section>';
      h += '<section class="sec">' + secHead("Histórias nos arquivos") + S.map(storyRow).join("") + "</section>";
      if (q) setTimeout(function () { archiveSearch(A, q); }, 0);
      return h;
    });
  };
  var agData = null;
  function archiveSearch(A, q) {
    var box = document.getElementById("arq-results");
    if (!box) return;
    var src = A.sources.filter(function (s) { return s.searchable && s.dataset; })[0];
    if (!src) { box.innerHTML = empty("Nenhum arquivo de vídeo pesquisável agora."); return; }
    box.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="width:70%"></div><p class="meta">Carregando o arquivo…</p>';
    (agData || (agData = fetch("../" + src.dataset).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }))).then(function (ds) {
      var t = norm(q), out = [];
      for (var i = 0; i < ds.videos.length && out.length < 60; i++) {
        var v = ds.videos[i];
        if (norm(v.t).indexOf(t) >= 0) out.push({ v: v, x: v.t, s: 0 });
        for (var j = 0; j < v.sg.length && out.length < 60; j++) if (norm(v.sg[j].x).indexOf(t) >= 0) out.push({ v: v, x: v.sg[j].x, s: v.sg[j].s || 0 });
      }
      if (!out.length) { box.innerHTML = empty("Nenhuma menção literal a este termo nos vídeos pesquisáveis. Isso não significa que nunca foi dito."); return; }
      out.sort(function (a, b) { return (b.v.u || "").localeCompare(a.v.u || ""); });
      box.innerHTML = '<p class="meta" style="margin-top:12px">' + plural(out.length, "trecho", "trechos") + (out.length >= 60 ? " (primeiros 60)" : "") + " em " + e(src.name) + ". Achar o trecho mostra o que foi dito, não que é verdade.</p>" + out.map(function (o) {
        var mm = Math.floor(o.s / 60), ss = String(o.s % 60).padStart(2, "0");
        return '<article class="result"><div><div class="d">' + e(fdate(o.v.u)) + '</div><div class="ty">▶ ' + mm + ":" + ss + "</div></div><div><p>" + e(o.x) + '</p><p class="meta">' + e(o.v.t) + " · " + ext("https://www.youtube.com/watch?v=" + o.v.id + (o.s ? "&t=" + o.s + "s" : ""), "Ver trecho ↗") + "</p></div></article>";
      }).join("");
    }).catch(function () { agData = null; box.innerHTML = '<p class="empty">Não conseguimos carregar o arquivo agora. Isso é uma falha nossa, não “nada encontrado”. Tente de novo.</p>'; });
  }

  // ---------- O Dia (19)
  P.dia = function () {
    return Promise.all([load("home.json"), load("destaques.json")]).then(function (r) {
      var H = r[0], D = r[1];
      var h = '<section class="page-head"><p class="kicker">Desmentindo · O Dia</p><h1 class="h-page">' + e(fdate(H.edition)) + '</h1><p class="lead">O que registramos até esta edição. Sem número fixo de histórias: entra o que importou.</p></section>';
      if (H.hero) h += '<section class="sec">' + secHead("A história do dia") + storyRow({ slug: H.hero.slug, title: H.hero.title, lastD: H.hero.lastD, lastT: H.hero.lastT, n: H.hero.n, span: H.hero.span }) + "</section>";
      h += '<section class="sec">' + secHead("Em destaque") + D.items.slice(0, 5).map(function (x) { return '<article class="record"><div class="top"><span class="kicker">' + e(x.outlet) + " · " + e(fdate(x.date)) + "</span></div><p><strong>" + ext(x.url, e(x.title)) + "</strong></p></article>"; }).join("") + "</section>";
      h += '<section class="sec">' + secHead("Já checamos") + '<div class="grid" style="--min:300px">' + H.checked.map(findingCard).join("") + "</div></section>";
      h += '<section class="sec">' + secHead("Também nos arquivos") + H.more.map(storyRow).join("") + "</section>";
      h += '<section class="sec">' + newsletter() + "</section>";
      return h;
    });
  };

  // ---------- Cards para compartilhar (18)
  P.cards = function () {
    return Promise.all([load("home.json"), load("afirmacoes.json")]).then(function (r) {
      var H = r[0], c = r[1].claims.filter(function (x) { return x.selo === "DOCUMENTADO"; })[0] || r[1].claims[0];
      function card(kind, label, title, date, kick, foot) {
        return '<figure style="margin:0"><div class="sharecard ' + kind + '" role="img" aria-label="' + e(label + ": " + title) + '"><div class="sc-top"><span class="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span>DESMENTINDO</div>' +
          '<div class="sc-kick">' + e(kick) + '</div><div class="sc-title">' + e(title) + '</div><div class="sc-date">' + e(date) + '</div><div class="sc-foot">' + e(foot) + "</div></div><figcaption class=\"meta\">" + e(label) + "</figcaption></figure>";
      }
      var h = '<section class="page-head"><p class="kicker">Cards para compartilhar</p><h1 class="h-page">Leve a fonte junto</h1><p class="lead">Todo card leva a régua da marca, o tempo, o achado ou a pergunta, e a fonte.</p></section><div class="sharegrid sec">';
      if (H.hero) {
        var foot = (H.hero.lastSrc ? "Fonte: " + (H.hero.lastSrc.outlet || "") + " · " : "") + "desmentindo.com.br";
        h += card("ig", "Instagram 1080×1350", H.hero.title, fdate(H.hero.lastD), "Último registro", foot);
        h += card("st", "Story 1080×1920", H.hero.title, fdate(H.hero.lastD), "Olha a data", foot);
        h += card("x", "X 1600×900", H.hero.title, fdate(H.hero.lastD), "História", foot);
        h += card("og", "Prévia de link 1200×630", H.hero.title, fdate(H.hero.lastD), "Desmentindo", "desmentindo.com.br");
      }
      if (c) h += card("ig", "Afirmação · Instagram", "“" + c.text + "”", SELO[c.selo][1], CHECK[c.check], "Conferido em " + fdate(c.checked_at) + " · desmentindo.com.br");
      h += "</div>";
      h += '<section class="sec">' + secHead("WhatsApp") + '<div class="card"><p style="margin-top:0"><strong>Texto pronto:</strong></p><p>' + (H.hero ? e(H.hero.title) + " — último registro em " + e(fdate(H.hero.lastD)) + ". Veja as fontes: desmentindo.com.br" : "") + "</p></div></section>";
      return h;
    });
  };

  // ---------- Estados do sistema (20)
  P.estados = function () {
    return Promise.resolve('<section class="page-head"><p class="kicker">Estados do sistema</p><h1 class="h-page">Quando não há resposta, a gente diz qual é o caso</h1></section>' +
      '<div class="grid sec" style="--min:300px">' +
      '<div><h2 class="kicker">Sem resultado</h2>' + empty("Não encontramos registro nos arquivos consultados. Isso não significa que nunca aconteceu.") + "</div>" +
      '<div><h2 class="kicker">Arquivo fora da busca ≠ zero resultados</h2><p class="empty" style="border-style:dotted">Esta fonte ainda não é pesquisável. Não dá para dizer que “não tem nada” nela.</p></div>' +
      '<div><h2 class="kicker">História não encontrada</h2>' + empty("Esta história não existe ou mudou de endereço.") + "</div>" +
      '<div><h2 class="kicker">Erro</h2><p class="empty" style="border-color:var(--ink);border-style:solid">Algo falhou do nosso lado. Isso é uma falha, não “nada encontrado”. Tente de novo.</p></div>' +
      '<div><h2 class="kicker">Carregando</h2><div class="skeleton" style="height:22px"></div><div class="skeleton" style="width:75%"></div><div class="skeleton" style="width:55%"></div></div>' +
      '<div><h2 class="kicker">Vazio</h2>' + empty("Ainda não há nada aqui nesta edição.") + "</div></div>");
  };

  // ---------- institucionais (21–26)
  function simple(kicker, title, lead, body) {
    return Promise.resolve('<section class="page-head"><p class="kicker">' + kicker + '</p><h1 class="h-page">' + title + "</h1>" + (lead ? '<p class="lead">' + lead + "</p>" : "") + "</section>" + (body || ""));
  }
  P.sobre = function () {
    return simple("Sobre", "O que foi dito. Quando foi dito. E de onde veio.",
      "O Desmentindo é uma publicação de checagem, contexto e cronologia. Mostramos o documento, a data e a fonte, e dizemos com clareza o que ainda não sabemos.",
      '<section class="sec">' + secHead("Nossas regras") + '<ul class="rules"><li>Aparecer não é prova.</li><li>Aparecer junto não é ser culpado.</li><li>Dizer não é provar.</li><li>Não encontramos ≠ não existe.</li><li>Achar a fonte não é confirmar.</li><li>Se mudou, a gente mostra.</li></ul></section>' +
      '<section class="sec">' + secHead("Equipe e financiamento") + empty("Ainda não publicamos estas informações. Quando publicarmos, ficam aqui, com data.") + "</section>");
  };
  P.como = function () {
    return simple("Como trabalhamos", "Estado por forma e por palavra, nunca só por cor", "Cada afirmação recebe um selo. Cada fonte recebe um rótulo. Cada história mostra quando foi publicada, atualizada ou corrigida.",
      '<section class="sec">' + secHead("Os selos") + '<div class="grid" style="--min:300px">' + Object.keys(SELO).map(function (k) { return '<div class="card">' + selo(k) + '<p style="margin:10px 0 0">' + e(SELO_EXPLICA[k]) + "</p></div>"; }).join("") + "</div>" +
      '<p class="note-side">Todo selo vem com “checamos se foi dito” ou “checamos se aconteceu”. Um vídeo da fala documenta que foi dito, não que o fato aconteceu. Reportagem sobre uma acusação documenta a acusação, não o fato.</p></section>' +
      '<section class="sec">' + secHead("Os rótulos das fontes") + '<div class="grid" style="--min:300px"><div class="card"><p class="rotulo">Fonte localizada</p><p>Isso, sozinho, não confirma a afirmação.</p></div><div class="card"><p class="rotulo">Documento localizado</p><p>Ainda precisamos verificar o que ele realmente sustenta.</p></div></div></section>' +
      '<section class="sec">' + secHead("Publicação") + "<p>" + pubm("PUBLICADO", "Publicado") + " " + pubm("ATUALIZADO", "↻ Atualizado") + " o fato evoluiu · " + pubm("CORRIGIDO", "✎ Corrigido") + " nós erramos, e mostramos a versão anterior · " + pubm("RESPOSTA", "✉ Resposta publicada") + " a resposta de quem foi citado, na íntegra e com data.</p></section>" +
      '<section class="sec">' + secHead("O que nunca fazemos") + '<ul class="rules"><li>Página de pessoa, ranking ou lista de pessoas acompanhadas.</li><li>Ligar pessoas entre si. Ligamos pessoas ao fato, com verbo, data e fonte.</li><li>Chamar mudança no tempo de contradição sem revisão humana.</li><li>Inventar número, documento ou fonte.</li></ul></section>');
  };
  P.correcoes = function () {
    return simple("Correções", "Se erramos, a gente mostra", "Correção aparece no topo da própria história, com a versão anterior riscada e a hora.",
      '<section class="sec">' + secHead("Registro público de correções") + empty("Nenhuma correção pública registrada até agora.") + '<p class="note-side">Achou um erro? <a class="link" href="#/contato">Fale com a gente</a>.</p></section>');
  };
  P.envie = function () {
    var hs = qparam("historia");
    return simple("Envie sua versão", "Foi citado? Sua versão entra com data", "Se publicarmos, a resposta aparece na mesma página da história, na íntegra, com a data.",
      '<section class="sec"><form class="card" data-envie novalidate style="max-width:760px"><p class="notice" style="margin-top:0">O envio ainda não está aberto nesta versão. Nada do que você escrever será enviado ou guardado.</p>' +
      '<label for="ev-h" style="font-weight:800;display:block;margin-top:12px">História</label><input id="ev-h" type="text" value="' + e(hs) + '" style="width:100%;padding:12px;border:0;box-shadow:0 0 0 2px var(--ink)">' +
      '<label for="ev-t" style="font-weight:800;display:block;margin-top:12px">Sua versão</label><textarea id="ev-t" rows="5" style="width:100%;padding:12px;border:0;box-shadow:0 0 0 2px var(--ink)"></textarea>' +
      '<p style="margin-top:12px"><button class="btn" type="submit">Enviar</button></p><p class="status-msg" role="status" aria-live="polite"></p></form></section>');
  };
  P.contato = function () {
    return simple("Conversar com a gente", "Canal público em preparação", "", empty("Ainda não temos um canal público de contato configurado. Quando tivermos, ele aparece aqui."));
  };
  P.data = function () {
    return load("home.json").then(function (H) {
      var caps = [
        ["01", "Buscar", "Procure uma frase dita em " + nf(H.stats.videos) + " vídeos transcritos, com data e minutagem.", "JA_EXISTE", "Já existe"],
        ["02", "Consultar", nf(H.stats.stories) + " histórias com " + nf(H.stats.records) + " registros e " + nf(H.stats.sources) + " fontes, com data e origem.", "JA_EXISTE", "Já existe"],
        ["03", "Acompanhar", "Linha do tempo de um caso, atualizada a cada edição.", "PROTOTIPO", "Protótipo"],
        ["04", "Receber", "Relatórios sob demanda para redações, pesquisa e escolas.", "EM_ESTUDO", "Em estudo"],
        ["05", "Integrar", "Acesso aos dados por API.", "EM_ESTUDO", "Em estudo"]
      ];
      return '<section class="page-head"><p class="kicker"><span class="logo-data">DATA</span> Desmentindo Data</p><h1 class="h-page">A camada profissional</h1><p class="lead">O Desmentindo é a publicação. O Desmentindo Data é para quem usa esses arquivos no trabalho. Aqui só aparece o que existe ou está em estudo, com o estado escrito.</p></section>' +
        '<section class="sec"><div class="grid" style="--min:230px">' + caps.map(function (c) { return '<div class="cap"><div class="n">' + c[0] + '</div><div class="v">' + c[1] + '</div><p style="margin:0">' + e(c[2]) + '</p><span class="capst ' + c[3] + '">' + c[4] + "</span></div>"; }).join("") + "</div>" +
        '<p class="note-side">Estados a confirmar com a equipe técnica. Nada aqui é oferta comercial.</p></section>' +
        '<section class="sec"><p class="empty">Não produzimos perfil, ranking ou lista de pessoas. A unidade é o fato, a história, a afirmação e o documento.</p></section>';
    });
  };
  P.mais = function () {
    var L = [["#/circulando", "Está circulando"], ["#/destaque", "Em destaque hoje"], ["#/checamos", "Já checamos"], ["#/arquivos", "Nos arquivos"], ["#/cards", "Cards para compartilhar"], ["#/sobre", "Sobre"], ["#/como-trabalhamos", "Como trabalhamos"], ["#/correcoes", "Correções"], ["#/envie", "Envie sua versão"], ["#/data", "Para profissionais"], ["#/contato", "Conversar com a gente"]];
    return simple("Mais", "Tudo do Desmentindo", "", '<ul class="srclist sec">' + L.map(function (l) { return '<li><span class="gl" aria-hidden="true">→</span><a class="link" href="' + l[0] + '">' + l[1] + "</a></li>"; }).join("") + "</ul>");
  };
  function notFound(msg) {
    return '<section class="page-head"><p class="kicker">Não encontrada</p><h1 class="h-page">' + e(msg || "Esta história não existe ou mudou de endereço.") + '</h1><p style="margin-top:16px"><a class="btn line" href="#/">Ir para Agora</a> <a class="btn line" href="#/buscar">Buscar</a></p></section>';
  }

  // ------------------------------------------------------------ assinatura / régua
  function setAssinatura(H, hide) {
    var box = document.getElementById("assinatura");
    document.getElementById("regua-ed").innerHTML = "Edição de <time datetime=\"" + e(H.edition) + "\">" + e(fdate(H.edition)) + "</time>";
    box.innerHTML = hide ? "" : '<div class="assinatura"><div class="assinatura-in"><p>O que foi dito. Quando foi dito. E de onde veio.</p><span class="date">Edição de ' + e(fdate(H.edition)) + "</span></div></div>";
  }

  // ------------------------------------------------------------ roteador
  var ROUTES = [
    [/^$/, "agora", function () { return P.home(); }],
    [/^historia\/([a-z0-9-]+)$/, "agora", function (m) { return P.historia(m[1]); }],
    [/^afirmacao\/([a-z0-9-]+)$/, "checar", function (m) { return P.afirmacao(m[1]); }],
    [/^circulando$/, "agora", function () { return P.circulando(); }],
    [/^destaque$/, "agora", function () { return P.destaque(); }],
    [/^checamos$/, "checar", function () { return P.checamos(); }],
    [/^checar(?:\/(enviado))?$/, "checar", function (m) { return P.checar(m[1]); }],
    [/^arquivos$/, "arquivos", function () { return P.arquivos(); }],
    [/^(?:resultado|buscar)$/, "buscar", function () { return P.resultado(); }],
    [/^registro\/(EV-\d+)$/, "arquivos", function (m) { return P.registro(m[1]); }],
    [/^caso\/([a-z0-9-]+)$/, "arquivos", function (m) { return P.caso(m[1]); }],
    [/^o-dia$/, "dia", function () { return P.dia(); }],
    [/^cards$/, "", function () { return P.cards(); }],
    [/^estados$/, "", function () { return P.estados(); }],
    [/^sobre$/, "", function () { return P.sobre(); }],
    [/^como-trabalhamos$/, "", function () { return P.como(); }],
    [/^correcoes$/, "", function () { return P.correcoes(); }],
    [/^envie$/, "", function () { return P.envie(); }],
    [/^contato$/, "", function () { return P.contato(); }],
    [/^data$/, "", function () { return P.data(); }],
    [/^mais$/, "mais", function () { return P.mais(); }]
  ];
  // Rotas do app antigo: páginas de pessoa, rede, matriz ou dossiê não existem aqui.
  // Nome vira busca ("em quais histórias aparece"); o resto vai para Agora.
  function legacy(path) {
    var m = /^(?:pessoa|p)\/(.+)$/.exec(path);
    if (m) return "#/resultado?q=" + encodeURIComponent(decodeURIComponent(m[1]).replace(/[-_]/g, " "));
    if (/^(caso|c)\/(.+)$/.test(path)) return "#/arquivos";
    return null;
  }

  var main;
  function route() {
    var raw = location.hash.replace(/^#\/?/, "");
    var path = raw.split("?")[0];
    if (/^m-|^fontes-todas$|^updates$|^main$/.test(raw)) return; // âncoras internas
    var found = null, m;
    for (var i = 0; i < ROUTES.length; i++) { m = ROUTES[i][0].exec(path); if (m) { found = ROUTES[i]; break; } }
    if (!found) { var to = legacy(path); if (to) { location.replace(to); return; } }
    var nav = found ? found[1] : "";
    document.querySelectorAll("[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (!/^historia\//.test(path)) document.title = "Desmentindo";
    main.setAttribute("aria-busy", "true");
    main.innerHTML = '<div class="skeleton" style="height:48px;margin-top:28px;width:60%"></div><div class="skeleton" style="height:18px"></div><div class="skeleton" style="height:18px;width:80%"></div>';
    var p = found ? found[2](m) : Promise.resolve(notFound());
    p.then(function (html) {
      main.innerHTML = html;
    }).catch(function (err) {
      main.innerHTML = err && err.status === 404 ? notFound() : '<section class="page-head"><h1 class="h-page">Algo falhou do nosso lado</h1><p class="lead">Isso é uma falha, não “nada encontrado”. <button class="btn line" type="button" data-retry>Tentar de novo</button></p></section>';
    }).then(function () {
      main.removeAttribute("aria-busy");
      if (route.done) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
      route.done = true;
      var h1 = main.querySelector("h1"); if (h1 && path !== "") document.title = h1.textContent.slice(0, 70) + " · Desmentindo";
    });
  }

  // ------------------------------------------------------------ interações
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    if (f.hasAttribute("data-search")) { ev.preventDefault(); var q = (f.q.value || "").trim(); if (q) go("#/resultado?q=" + encodeURIComponent(q)); }
    else if (f.hasAttribute("data-check")) { ev.preventDefault(); var c = (f.q.value || "").trim(); if (c) go("#/checar?q=" + encodeURIComponent(c)); }
    else if (f.hasAttribute("data-archive")) { ev.preventDefault(); var a = (f.q.value || "").trim(); if (a) go("#/arquivos?q=" + encodeURIComponent(a)); }
    else if (f.hasAttribute("data-newsletter")) { ev.preventDefault(); f.parentNode.querySelector(".status-msg").textContent = "As inscrições para O Dia ainda não estão abertas. Nenhum e-mail foi guardado."; }
    else if (f.hasAttribute("data-envie")) { ev.preventDefault(); f.querySelector(".status-msg").textContent = "O envio ainda não está aberto. Nada foi enviado nem guardado."; }
  });
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-example],[data-filter],[data-retry],[data-anchor],[data-tab]");
    if (!t) return;
    if (t.hasAttribute("data-example")) { go("#/checar?q=" + encodeURIComponent(t.getAttribute("data-example"))); }
    else if (t.hasAttribute("data-filter")) { go("#/circulando?f=" + t.getAttribute("data-filter")); }
    else if (t.hasAttribute("data-retry")) { route(); }
    else if (t.hasAttribute("data-tab")) {
      t.parentNode.querySelectorAll("[role=tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b === t)); });
      var ta = document.getElementById("chk-main"); if (ta) { ta.placeholder = "Cole aqui o link (https://…)"; ta.focus(); }
    } else if (t.hasAttribute("data-anchor")) {
      ev.preventDefault();
      var el = document.getElementById(t.getAttribute("href").slice(1));
      if (el) { el.scrollIntoView({ block: "start" }); el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
    }
  });

  function boot() {
    main = document.getElementById("main");
    window.addEventListener("hashchange", route);
    load("home.json").then(function (H) { setAssinatura(H, location.hash.replace(/^#\/?/, "") !== ""); }).catch(function () {});
    route();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
