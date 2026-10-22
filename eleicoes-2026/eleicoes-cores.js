/* Eleições 2026 · cor de cada candidato a Presidente nos mapas e no placar (configuração de apresentação; não muda dado).
   Decisão do proprietário (22/10/2026, revisão proposta do Plano Diretor §32.2.4 para mapas de resultado eleitoral):
   Lula #D62839 · Flávio Bolsonaro #2458D3; demais candidatos pela cor VERIFICADA da identidade do partido, com variação
   acessível quando preciso. A chave é o NÚMERO do candidato (para Presidente, número = número do partido), nunca a posição
   no placar: a cor acompanha a pessoa, não o lugar. Sigla: arquivo oficial do TSE (eleição 6257, campo par.sg).
   Sem cor verificada → cinza neutro com hachura (legenda escreve o nome; a cor não sugere partido nenhum).
   A cor só diz QUEM foi o mais votado; não mostra tamanho de vitória nem percentual. */
(function (g) {
  "use strict";
  var SIGLA = { 13: "PT", 14: "MISSÃO", 16: "PSTU", 21: "PCB", 22: "PL", 27: "DC", 29: "PCO", 30: "NOVO", 35: "DEMOCRATA", 55: "PSD", 70: "AVANTE", 80: "UP" };
  // cor: preenchimento do mapa; tinta: mesma cor escurecida para texto/traço sobre fundo claro (contraste ≥ 4,5:1)
  var COR = {
    13: { cor: "#D62839", tinta: "#B01F2F", fonte: "Decisão do proprietário, 22/10/2026" },
    22: { cor: "#2458D3", tinta: "#1F4DB8", fonte: "Decisão do proprietário, 22/10/2026" }
  };
  var NEUTRO = { cor: "#8F8A88", tinta: "#5C5958", neutro: true, fonte: "Sem cor de partido verificada: cinza neutro com hachura" };
  function de(n) { var c = COR[String(n)]; return c ? { cor: c.cor, tinta: c.tinta, neutro: false, fonte: c.fonte } : NEUTRO; }
  function sigla(n) { return SIGLA[String(n)] || null; }
  var API = { de: de, sigla: sigla, COR: COR, SIGLA: SIGLA, NEUTRO: NEUTRO };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else g.EleicoesCores = API;
})(typeof window !== "undefined" ? window : this);
