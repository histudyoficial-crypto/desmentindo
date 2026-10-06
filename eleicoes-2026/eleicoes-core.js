/* Eleições 2026 · núcleo puro (sem DOM): estados explícitos da seção, leitura do boletim de urna (BU) no navegador e
 * linha do tempo sem interpolação. Usado por eleicoes.js e pelos testes (node public-ui/test-eleicoes-core.mjs).
 *
 * Regras:
 * - Uma seção do cadastro oficial NUNCA some: sempre volta um estado com nome curto, explicação e detalhe técnico.
 * - Ausência de arquivo nunca é apresentada como suspeita; o motivo não é inferido.
 * - Nada é interpolado: entre dois registros só existe "sem registro".
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ estados da seção
  // fonte: cs.json (cadastro de seções, com da/ha quando o arquivo da seção foi gerado) + leitura do aux da seção.
  var ESTADOS = {
    PUBLICADO:      { nome: "Boletim publicado",            classe: "ok",      texto: "O boletim de urna desta seção está publicado pelo TSE." },
    CONFERIDO:      { nome: "Conferido",                    classe: "ok",      texto: "Boletim publicado e a soma dos boletins do município bate com o resultado oficial do município." },
    AGREGADA:       { nome: "Seção agregada",               classe: "neutro",  texto: "Esta seção foi reunida a outra no dia da eleição. Os votos dela estão no boletim da seção principal; ela não tem arquivo próprio." },
    APURACAO:       { nome: "Sistema de Apuração",          classe: "neutro",  texto: "A seção foi apurada pelo Sistema de Apuração da Justiça Eleitoral, e não pela urna. O TSE publica o boletim desse sistema." },
    INCOMPLETA:     { nome: "Fonte incompleta",             classe: "atencao", texto: "O TSE publicou arquivos desta seção, mas sem boletim de urna. Os votos estão no total oficial; o boletim não está entre os arquivos." },
    INDISPONIVEL:   { nome: "Arquivo oficial ainda não disponível", classe: "atencao", texto: "O cadastro oficial indica que o arquivo desta seção foi gerado, mas ele ainda não está disponível para download. Status: ACOMPANHANDO. Não inferimos o motivo." },
    PENDENTE:       { nome: "Pendente",                     classe: "pendente", texto: "O TSE ainda não gerou os arquivos desta seção." },
    RECUSADA:       { nome: "Consulta recusada",            classe: "erro",    texto: "O servidor do TSE recusou a consulta agora (limite de acesso). Isso não diz nada sobre a seção. Tente mais tarde." },
    NAO_CONCLUIDA:  { nome: "Consulta não concluída",       classe: "erro",    texto: "Não conseguimos falar com o TSE agora (rede ou erro temporário do servidor). Isso não diz nada sobre a seção." },
    ILEGIVEL:       { nome: "Arquivo ilegível",             classe: "ilegivel",    texto: "O arquivo chegou, mas não pôde ser lido. Nada foi concluído a partir dele." }
  };

  function principalDe(ns, zonaSecs) {
    for (var i = 0; i < (zonaSecs || []).length; i++) { if ((zonaSecs[i].nsa || []).indexOf(ns) >= 0) return zonaSecs[i].ns; }
    return null;
  }

  // Antes de consultar o aux: só o que o cadastro diz (usado na grade de seções).
  function estadoCadastro(sec, zonaSecs) {
    var p = principalDe(sec.ns, zonaSecs);
    if (p) return { estado: "AGREGADA", principal: p };
    return { estado: sec.da && sec.ha ? "GERADO" : "PENDENTE" };
  }

  // aux: { status: <HTTP>|null, json, corpo (texto do erro, se legível) }
  function secaoEstado(sec, zonaSecs, aux, extra) {
    var p = principalDe(sec.ns, zonaSecs), tec = [];
    if (p) return r("AGREGADA", { principal: p, tecnico: "Listada em nsa da seção " + p + " no cadastro oficial (cs.json)." });
    var gerado = !!(sec.da && sec.ha);
    tec.push(gerado ? "Cadastro oficial (cs.json): arquivo gerado em " + sec.da + " " + sec.ha + "." : "Cadastro oficial (cs.json): sem data de geração (da/ha).");
    if (!aux || aux.status == null) return r("NAO_CONCLUIDA", { tecnico: tec.concat(["Sem resposta HTTP" + (aux && aux.erro ? " (" + aux.erro + ")" : "") + "."]).join(" ") });
    if (aux.status === 200) {
      var hs = aux.json && aux.json.hashes;
      if (!aux.json || !hs || !hs.length) return r("ILEGIVEL", { tecnico: tec.concat(["HTTP 200 sem lista de arquivos legível."]).join(" ") });
      var tipos = {};
      hs.forEach(function (h) { (h.arq || []).forEach(function (f) { tipos[f.tp] = h; }); });
      var t = tec.concat(["Arquivos: " + Object.keys(tipos).sort().join(", ") + "."]).join(" ");
      if (tipos.bu) return r(extra && extra.conferido ? "CONFERIDO" : "PUBLICADO", { tecnico: t, hash: tipos.bu });
      if (tipos.busa) return r("APURACAO", { tecnico: t, hash: tipos.busa });
      return r("INCOMPLETA", { tecnico: t });
    }
    var nsk = /<Code>NoSuchKey<\/Code>/.test(aux.corpo || "");
    if (aux.status === 404) {
      var t404 = tec.concat(["HTTP 404" + (nsk ? " · NoSuchKey (objeto ausente no armazenamento público)" : "") + "."]).join(" ");
      return r(gerado ? "INDISPONIVEL" : "PENDENTE", { tecnico: t404 });
    }
    if (aux.status === 403 || aux.status === 429) return r("RECUSADA", { tecnico: tec.concat(["HTTP " + aux.status + "."]).join(" ") });
    return r("NAO_CONCLUIDA", { tecnico: tec.concat(["HTTP " + aux.status + "."]).join(" ") });
  }
  function r(k, o) { var e = ESTADOS[k], out = { estado: k, nome: e.nome, classe: e.classe, texto: e.texto }; for (var x in o) out[x] = o[x]; return out; }

  // ------------------------------------------------------------------ boletim de urna (BER/ASN.1) → votos de Presidente
  // Mesmo percurso do leitor validado no 1º turno (498.873 BUs; soma dos votos = comparecimento em cada BU e soma dos BUs
  // = resultado oficial nos municípios conferidos). Se a estrutura não bater, devolve null: nada é mostrado como resultado.
  function tlv(b, i) {
    var t = b[i++], cls = t >> 6, cons = (t >> 5) & 1, tag = t & 31;
    if (tag === 31) { tag = 0; var x; do { x = b[i++]; tag = (tag << 7) | (x & 127); } while (x & 128); }
    var ln = b[i++];
    if (ln & 128) { var n = ln & 127; ln = 0; for (var k = 0; k < n; k++) ln = ln * 256 + b[i++]; }
    return { cls: cls, cons: cons, tag: tag, s: i, e: i + ln };
  }
  function kids(b, s, e) { var out = [], i = s; while (i < e) { var t = tlv(b, i); if (t.e > e) throw new Error("BER"); out.push(t); i = t.e; } return out; }
  function int(b, t) { var v = 0, neg = b[t.s] & 128; for (var i = t.s; i < t.e; i++) v = v * 256 + b[i]; return neg ? v - Math.pow(256, t.e - t.s) : v; }

  function decodeBU(bytes, eleicao) {
    try {
      var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      var env = kids(b, 0, b.length)[0];
      var inner = kids(b, env.s, env.e).filter(function (t) { return t.tag === 4 && !t.cons && t.cls === 0; })[0];
      var bu = kids(b, inner.s, inner.e)[0];
      var out = { municipio: null, zona: null, local: null, secao: null, aptos: null, comparecimento: null, votos: {} };
      kids(b, bu.s, bu.e).forEach(function (t) {
        if (!(t.cls === 0 && t.tag === 16 && t.cons)) return;
        var k = kids(b, t.s, t.e);
        if (k.length === 3 && k[0].tag === 16 && k[1].tag === 2 && k[2].tag === 2) {
          var mz = kids(b, k[0].s, k[0].e);
          out.municipio = int(b, mz[0]); out.zona = int(b, mz[1]); out.local = int(b, k[1]); out.secao = int(b, k[2]);
        } else if (k.length && k[0].tag === 16 && k[0].cons && kids(b, k[0].s, k[0].e).length && kids(b, k[0].s, k[0].e)[0].tag === 2) {
          k.forEach(function (rv) {
            var f = kids(b, rv.s, rv.e);
            if (int(b, f[0]) !== eleicao) return;
            out.aptos = int(b, f[1]);
            var res = f.filter(function (x) { return x.tag === 16 && x.cons; })[0];
            kids(b, res.s, res.e).forEach(function (rvc) {
              var g = kids(b, rvc.s, rvc.e);
              out.comparecimento = int(b, g[1]);
              var tvc = g.filter(function (x) { return x.tag === 16 && x.cons; })[0];
              kids(b, tvc.s, tvc.e).forEach(function (tc) {
                var h = kids(b, tc.s, tc.e), vv = h.filter(function (x) { return x.cls === 0 && x.tag === 16 && x.cons; })[0];
                kids(b, vv.s, vv.e).forEach(function (vt) {
                  var tipo = null, qtd = 0, cod = null;
                  kids(b, vt.s, vt.e).forEach(function (c) {
                    if (c.cls === 2 && c.tag === 1) tipo = int(b, c);
                    else if (c.cls === 2 && c.tag === 2) qtd = int(b, c);
                    else if (c.cls === 2 && c.tag === 3) cod = int(b, kids(b, c.s, c.e)[1]);
                  });
                  var key = tipo === 1 ? String(cod) : tipo === 2 ? "branco" : tipo === 3 ? "nulo" : tipo === 4 ? "legenda_" + cod : "tipo_" + tipo;
                  out.votos[key] = (out.votos[key] || 0) + (qtd || 0);
                });
              });
            });
          });
        }
      });
      var soma = 0; for (var v in out.votos) soma += out.votos[v];
      out.confere = out.comparecimento != null && soma === out.comparecimento;
      return out.aptos == null || !out.confere ? null : out;
    } catch (e) { return null; }
  }

  // ------------------------------------------------------------------ linha do tempo sem interpolação
  // pontos: [{t: ms}] em ordem; devolve os intervalos sem registro maiores que `limiteMs` (desenhados como lacuna).
  function lacunas(pontos, limiteMs) {
    var out = [];
    for (var i = 1; i < pontos.length; i++) {
      var d = pontos[i].t - pontos[i - 1].t;
      if (d > limiteMs) out.push({ de: pontos[i - 1].t, ate: pontos[i].t, ms: d });
    }
    return out;
  }
  // atraso entre o que o TSE mostrava e a hora da leitura (métrica calculada, não dado do TSE)
  function defasagem(capturadoMs, tseMs) { return capturadoMs != null && tseMs != null ? capturadoMs - tseMs : null; }

  var api = { ESTADOS: ESTADOS, principalDe: principalDe, estadoCadastro: estadoCadastro, secaoEstado: secaoEstado,
              decodeBU: decodeBU, lacunas: lacunas, defasagem: defasagem };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.EleicoesCore = api;
})(typeof window !== "undefined" ? window : this);
