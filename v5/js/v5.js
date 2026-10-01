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

  // ---------------------------------------------------------------- componente: JÁ FALARAM SOBRE ISSO
  function saidItem(o, story, noWho) {
    return '<li class="said" data-video="' + e(o.video_id) + '" data-t="' + o.t_seconds + '" data-date="' + e(o.date) + '">' +
      (story ? '<p class="said-story">Sobre <a href="#/historia/' + e(story.slug) + '">' + e(story.title) + "</a></p>" : "") +
      (noWho ? "" : '<p class="said-who">' + e(o.source_name) + "</p>") +
      '<p class="said-x">' + e(o.excerpt) + "</p>" +
      '<div class="said-foot"><span class="said-when">' + tdate(o.date) + " · " + e(o.t_label) + "</span>" +
      '<a class="go" href="' + e(o.deep_link) + '" target="_blank" rel="noopener" aria-label="Ver trecho no vídeo, a partir de ' + e(o.t_label) + '">Ver trecho</a></div></li>';
  }
  var NOTE = '<p class="quiet">O texto resume o que é dito naquele minuto. Confira no vídeo.</p>';
  function unavailable(arch) {
    var na = (arch || []).filter(function (a) { return !a.available; }).map(function (a) { return a.name; });
    if (!na.length) return "";
    return '<p class="na">' + e(na.join(" e ")) + ": arquivo" + (na.length > 1 ? "s" : "") + " ainda não disponíve" + (na.length > 1 ? "is" : "l") + " para pesquisa.</p>";
  }
  function archList(arch) {
    return '<ul class="arch">' + arch.map(function (a) {
      return "<li><span class=\"an\">" + e(a.name) + "</span>" + (a.available
        ? '<span class="as ok">' + nf(a.videos_indexed) + " vídeos · pesquisa disponível</span>"
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
  P.home = function () {
    return load("home.json").then(function (H) {
      var h = '<section class="hero"><h1 class="name">DESMENTINDO</h1><p class="motto">Notícias passam. O que foi dito fica.</p>' +
        searchForm("", "q-home", true) +
        '<p class="cue">Veja o que já foi dito sobre uma notícia, com a data, o minuto do vídeo e a fonte original.</p>' +
        '<p class="tries">Por exemplo: <a href="#/busca?q=Alexandre%20de%20Moraes">Alexandre de Moraes</a> · <a href="#/busca?q=INSS">INSS</a> · <a href="#/busca?q=Dark%20Horse">Dark Horse</a></p></section>';
      if (H.hero) {
        h += '<section class="sec" id="agora"><h2 class="h2">Agora' + (H.edition ? ' <span class="meta" style="letter-spacing:0;text-transform:none;font-weight:400">· atualizado em ' + e(fdate(H.edition)) + "</span>" : "") + "</h2>" +
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
      var h = '<section class="page-head"><p class="kicker">Agora' + (s.span ? " · " + e(s.span.replace("–", " a ")) : "") + '</p><h1 class="h1">' + e(s.title) + "</h1>";
      if (s.summary) {
        h += '<p class="summary">' + e(s.summary.text) + "</p>" +
          '<p class="src">' + tdate(s.summary.date) + (s.summary.source ? " · " + ext(s.summary.source.url, e(s.summary.source.outlet || "fonte"), "") : "") + "</p>";
      }
      if (s.said.length) h += '<a class="jump" href="#ja-falaram" data-jump>Já falaram sobre isso · ' + plural(s.said.length, "trecho", "trechos") + "</a>";
      h += "</section>";
      if (s.known.length) {
        h += '<section class="sec"><h2 class="h2">O que sabemos</h2><ul class="items">' + s.known.map(function (k) {
          return "<li>" + tdate(k.date) + "<p>" + e(k.text) + "</p>" + (k.source ? '<p class="src">' + ext(k.source.url, e(k.source.outlet || "fonte"), "") + "</p>" : "") + "</li>";
        }).join("") + "</ul></section>";
      }
      // JÁ FALARAM SOBRE ISSO
      if (s.said.length || s.people.length) {
        h += '<section class="sec" id="ja-falaram"><h2 class="h2">Já falaram sobre isso</h2>';
        if (s.said.length) {
          h += moreList("said-" + s.slug, s.said, function (o) { return saidItem(o); }, 3) + NOTE + unavailable(arch);
          if (s.people.length) h += '<p class="people">Também nos arquivos: ' + s.people.map(person).join("") + "</p>";
        } else {
          h += '<p style="margin:0;color:var(--ink-2)">Ainda não ligamos trechos de vídeo a esta história. Pessoas citadas nela têm trechos nos arquivos:</p>' +
            '<p class="people">' + s.people.map(person).join("") + "</p>" + unavailable(arch);
        }
        h += "</section>";
      }
      if (s.found) {
        h += '<section class="sec"><h2 class="h2">O que encontramos</h2><div class="doc"><p class="meta" style="margin:0">Documento localizado · ' + tdate(s.found.date) + '</p><p class="dt" style="margin:4px 0 0">' + ext(s.found.url, e(s.found.title)) + "</p>" +
          (s.found.says ? "<q>" + e(s.found.says.replace(/^["'“‘«]|["'”’»]$/g, "")) + "</q>" : "") + "</div></section>";
      }
      if (s.chrono.length) {
        h += '<section class="sec"><h2 class="h2">Cronologia</h2><ol class="chrono">' + s.chrono.map(function (c) { return "<li>" + tdate(c.date) + "<p>" + e(c.text) + "</p></li>"; }).join("") + "</ol></section>";
      }
      if (s.sources.length) {
        var src = function (x) { return '<li><span class="k">' + e(x.kind) + "</span>" + ext(x.url, e(x.title)) + (x.outlet ? ' <span class="meta">· ' + e(x.outlet) + "</span>" : "") + "</li>"; };
        h += '<section class="sec"><h2 class="h2">Fontes</h2><ul class="srcs">' + s.sources.slice(0, 5).map(src).join("") + "</ul>" +
          (s.sources.length > 5 ? "<details><summary>Ver mais " + nf(s.sources.length - 5) + (s.sources_total > s.sources.length ? " (das " + nf(s.sources_total) + " fontes)" : "") + '</summary><ul class="srcs">' + s.sources.slice(5).map(src).join("") + "</ul></details>" : "") + "</section>";
      }
      if (s.updates.length) {
        h += '<section class="sec"><h2 class="h2">Atualizações</h2><ul class="items">' + s.updates.map(function (u) { return "<li>" + tdate(u.published) + "<p>" + e(u.text) + "</p></li>"; }).join("") + "</ul></section>";
      }
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
        return { source_name: M.ag_name, video_id: v[0], date: v[1], t_seconds: r[1], t_label: tLabel(r[1]), excerpt: r[2], deep_link: "https://www.youtube.com/watch?v=" + v[0] + "&t=" + r[1] + "s" };
      });
    });
  }
  P.busca = function () {
    var q = qparam("q");
    document.title = (q ? q + " · " : "") + "Pesquisa · Desmentindo";
    var head = '<section class="page-head"><p class="kicker">Pesquise o arquivo</p>' + searchForm(q, "q-busca") + "</section>";
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
        M.archives.forEach(function (a) {
          if (!a.available) return;
          h += '<div class="src-h"><strong>' + e(a.name) + '</strong><span class="n" data-count="' + ag.length + '">' + (ag.length ? plural(ag.length, "trecho", "trechos") + " mencionam" : "nenhum trecho com essas palavras") + "</span></div>";
          if (ag.length) h += '<div id="ag-res"><p class="meta">Carregando trechos…</p></div>';
        });
        h += unavailable(M.archives) + "</section>";
        if (docs.length) {
          h += '<section class="group"><div class="group-h"><h2 class="h2">Documentos</h2><span class="meta">' + plural(docs.length, "documento", "documentos") + '</span></div><ul class="srcs">' +
            docs.slice(0, 6).map(function (d) { return "<li>" + ext(d[2], e(d[0])) + ' <span class="meta">· ' + tdate(d[3]) + (d[1] ? " · " + e(d[1]) : "") + "</span></li>"; }).join("") + "</ul></section>";
        }
        if (!any) h += '<section class="sec"><p class="empty">Nada encontrado para “' + e(q) + '” nas histórias nem nos vídeos pesquisáveis. Isso não quer dizer que nunca foi dito.</p></section>';
        if (ag.length) {
          setTimeout(function () {
            var box = document.getElementById("ag-res");
            if (!box) return;
            var first = ag.slice(0, 6);
            segs(first, M).then(function (items) {
              box.innerHTML = '<ul class="said-list" id="ag-list">' + items.map(function (o) { return saidItem(o, null, true); }).join("") + "</ul>" +
                (ag.length > first.length ? '<button class="more-btn" id="ag-more">Mostrar mais ' + nf(ag.length - first.length) + "</button>" : "") + NOTE;
              var shown = first.length, btn = document.getElementById("ag-more");
              if (btn) btn.addEventListener("click", function () {
                var next = ag.slice(shown, shown + 10);
                segs(next, M).then(function (more) {
                  document.getElementById("ag-list").insertAdjacentHTML("beforeend", more.map(function (o) { return saidItem(o, null, true); }).join(""));
                  shown += next.length;
                  if (shown >= ag.length) btn.remove(); else btn.textContent = "Mostrar mais " + nf(ag.length - shown);
                });
              });
            }, function () { box.innerHTML = '<p class="empty">Não conseguimos carregar os trechos agora. É uma falha nossa, não “nada encontrado”. Tente de novo.</p>'; });
          }, 0);
        }
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
        '<p class="quiet">Ser citado não indica culpa, nem posição de quem fala. ' + (A.archives.length ? e(A.archives.join(" e ")) + ": arquivos ainda não disponíveis para pesquisa." : "") + "</p></section>";
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
      var h = '<section class="page-head"><p class="kicker">Desmentindo Data</p><h1 class="h1">Para profissionais</h1>' +
        '<p class="lead">O Desmentindo é a publicação. O Desmentindo Data é para quem usa esses arquivos no trabalho: redações, pesquisa e escolas.</p></section>';
      h += '<section class="sec"><h2 class="h2">O que já existe</h2><ul class="items">' +
        "<li><p><strong>Pesquisar</strong> trechos de " + nf(A.archives.filter(function (a) { return a.available; }).reduce(function (n, a) { return n + a.videos_indexed; }, 0)) + " vídeos, com data e minuto.</p></li>" +
        "<li><p><strong>Consultar</strong> " + nf(A.stats.stories) + " histórias com " + nf(A.stats.records) + " registros, com data e fonte.</p></li></ul></section>";
      h += '<section class="sec"><h2 class="h2">Cobertura dos arquivos de vídeo</h2><ul class="arch">' + A.archives.map(function (a) {
        return '<li><span class="an">' + e(a.name) + '</span><span class="as' + (a.available ? " ok" : "") + '">' + nf(a.videos_indexed) + " de " + nf(a.videos_total) + " vídeos processados" + (a.available ? (a.latest ? " · até " + e(fdate(a.latest)) : "") : " · ainda não disponível para pesquisa") + "</span></li>";
      }).join("") + "</ul></section>";
      h += '<section class="sec"><p class="quiet" style="margin:0">Não produzimos perfil, ranking ou nota de pessoas. A unidade é o fato, a história, o que foi dito e o documento.</p></section>';
      return h;
    });
  };

  function notFound() {
    return '<section class="page-head"><h1 class="h1">Página não encontrada</h1><p class="lead">Ela não existe ou mudou de endereço.</p>' + searchForm("", "q-nf") + "</section>";
  }

  // ---------------------------------------------------------------- roteador
  function route() {
    var hash = location.hash || "#/";
    var path = hash.slice(1).split("?")[0].split("#")[0];
    var anchor = hash.slice(1).split("#")[1];
    if (/^ja-falaram|^agora/.test(hash.slice(1))) return; // âncora na própria página
    var parts = path.split("/").filter(Boolean);
    var name = parts[0] || "home", arg = parts[1] ? decodeURIComponent(parts[1]) : null;
    var fn = P[name] || P.home;
    document.body.classList.toggle("is-home", fn === P.home);
    document.title = "Desmentindo";
    var door = fn === P.busca ? "busca" : (fn === P.arquivos || fn === P.arquivo) ? "arquivos" : (fn === P.home || fn === P.historia) ? "agora" : "";
    Array.prototype.forEach.call(document.querySelectorAll("[data-door]"), function (a) { if (a.getAttribute("data-door") === door) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    pending = {};
    fn(arg).then(function (h) {
      main.innerHTML = '<div class="wrap">' + h + "</div>";
      if (anchor) { var t = document.getElementById(anchor); if (t) t.scrollIntoView(); } else window.scrollTo(0, 0);
    }, function () { main.innerHTML = '<div class="wrap"><p class="empty" style="padding:40px 0">Não conseguimos carregar esta página agora. Tente de novo.</p></div>'; });
  }
  // Âncoras internas (#ja-falaram) não trocam a rota.
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest("a[data-jump]");
    if (!a) return;
    ev.preventDefault();
    var t = document.getElementById(a.getAttribute("data-jump") || "ja-falaram");
    if (t) t.scrollIntoView({ behavior: "smooth" });
  });
  window.addEventListener("hashchange", route);
  route();
})();
