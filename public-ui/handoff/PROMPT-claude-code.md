# Prompt para o Claude Code — redesign visual do Desmentindo

> **Estado em 25/09/2026:** a versão `desmentindo_local_8.html` já tem as seções 1 a 9. Para ela, use `handoff/PROMPT-v8-secoes-10-12.md`.

Aplique as alterações abaixo no código-fonte que gera o `desmentindo_local.html`. **Não altere os dados (`const D = …`) nem a lógica existente**: é só reskin mais um painel novo na página Início. Mantenha todas as regras editoriais (vínculo documentado ≠ culpa etc.).

## 1. Fonte
- Troque o `<link>` do Google Fonts (IBM Plex Sans + Mono) por:
  `https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&display=swap`
- No CSS, todas as ocorrências de `'IBM Plex Sans'` → `'Archivo'`, e `'IBM Plex Mono',…monospace` → `'Archivo',sans-serif;font-variant-numeric:tabular-nums`.
- No JS do canvas do Segundo cérebro (`ctx.font=…'IBM Plex Sans'…`) → `'Archivo'`.
- No `<style>` inicial do shell: `font:14px Archivo,system-ui,sans-serif;background:#f3f2f2`.
- Não mude `FF='Helvetica, Arial, sans-serif'` (a contra-imagem SVG→PNG não carrega webfont).

## 2. Cores fixas no JS (fora do bloco de dados)
Substitua os hex hard-coded no código (contra-imagem, mapa, bancada):

| antes | depois |
|---|---|
| #1b64a0 | #009c3b |
| #0c7f63 | #201e1d |
| #a35f00, #b3261e | #8a6700 |
| #6b4fa3, #7a4700 | #002776 |
| #a83279 | #c9a800 |
| #e3f4ef, #e6ebf0 | #eae7e7 |
| #fbeed7 | #fff3b0 |
| #e0edf8 | #d9f2e2 |
| #f8e3ef | #a9c4ea |
| #3d4b5a | #444141 |
| #6b7785, #5f6f80 | #7d7979 |
| #13202c | #201e1d |
| #546578 | #605d5d |
| #7a8a9a | #9b9797 |
| #d3dbe2 | #bab6b6 |
| #e9eef2 | #eae9e9 |
| #f7f9fb | #f3f2f2 |

E a paleta da bancada:
```js
const PALETA=['#009c3b','#002776','#c9a800','#201e1d','#4a6fb5','#7d7979'];
```

## 3. CSS — adicionar no FIM do stylesheet principal
Sobrescreve os tokens (claro e escuro) e aplica o estilo Modernist (cantos retos, réguas de 2px, Archivo 800) com tons do Brasil (verde = ação, azul = documentado, amarelo = alegação). Os blocos "Modernist" + "Tons do Brasil" + "Painel visual" devem entrar nesta ordem:

```css
/* ===== Modernist ===== */
:root{--bg:#f3f2f2;--panel:#eae9e9;--panel2:#d7d3d3;--line:#bab6b6;--rule:#201e1d66;--text:#201e1d;--mute:#605d5d;--accent:#ec3013;--accent-600:#dd2b0f;--accent-ink:#ae1800;--accent-bg:#ffe0d9;
--e-avanca:#201e1d;--e-invalida:#ec3013;--e-encerra:#7c1405;--e-alivia:#7d7979;--e-atrasa:#bab6b6;--e-redistribui:#ff9783;
--ok:#201e1d;--on-ok:#f3f2f2;--al:#ae1800;--on-al:#fff2ef;--pend:#7d7979;--on-pend:#f8f4f4;--nada:#d7d3d3;--on-nada:#605d5d;--fp:#ffc4b8;--on-fp:#7c1405;
--okbg:#201e1d14;--albg:#ffe0d9;--op:#444141;--opbg:#201e1d0d;--shadow:0 12px 32px color-mix(in srgb,#2d2b2b 22%,transparent);--scrim:#201e1d80;}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#201e1d;--panel:#2d2b2b;--panel2:#444141;--line:#605d5d;--rule:#f3f2f266;--text:#f3f2f2;--mute:#bab6b6;--accent:#ff563c;--accent-600:#ff9783;--accent-ink:#ff9783;--accent-bg:#4d170e;
--e-avanca:#f3f2f2;--e-invalida:#ff563c;--e-encerra:#ffc4b8;--e-alivia:#9b9797;--e-atrasa:#605d5d;--e-redistribui:#ff9783;
--ok:#f3f2f2;--on-ok:#201e1d;--al:#ff563c;--on-al:#201e1d;--pend:#9b9797;--on-pend:#201e1d;--nada:#444141;--on-nada:#bab6b6;--fp:#7c1405;--on-fp:#ffe0d9;
--okbg:#f3f2f214;--albg:#4d170e;--op:#d7d3d3;--opbg:#f3f2f20f;--shadow:0 0 0 1px #605d5d,0 12px 32px #0009;--scrim:#000000a0;}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#201e1d;--panel:#2d2b2b;--panel2:#444141;--line:#605d5d;--rule:#f3f2f266;--text:#f3f2f2;--mute:#bab6b6;--accent:#ff563c;--accent-600:#ff9783;--accent-ink:#ff9783;--accent-bg:#4d170e;
--e-avanca:#f3f2f2;--e-invalida:#ff563c;--e-encerra:#ffc4b8;--e-alivia:#9b9797;--e-atrasa:#605d5d;--e-redistribui:#ff9783;
--ok:#f3f2f2;--on-ok:#201e1d;--al:#ff563c;--on-al:#201e1d;--pend:#9b9797;--on-pend:#201e1d;--nada:#444141;--on-nada:#bab6b6;--fp:#7c1405;--on-fp:#ffe0d9;
--okbg:#f3f2f214;--albg:#4d170e;--op:#d7d3d3;--opbg:#f3f2f20f;--shadow:0 0 0 1px #605d5d,0 12px 32px #0009;--scrim:#000000a0;}
body{font-family:'Archivo',system-ui,sans-serif;font-size:15px}
button,input,select,textarea{font-family:inherit}
*,*::before,*::after{border-radius:0!important}
.ato.e-avanca,.dot[class*="t-"],.rgpin{border-radius:50%!important}
::selection{background:color-mix(in srgb,var(--accent) 30%,transparent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
a{color:var(--accent-ink);text-underline-offset:3px}
h1{font-weight:800;font-size:40px;line-height:1.04;letter-spacing:-.025em}
h2{font-weight:800;font-size:22px;letter-spacing:-.015em}
h3,h4,.brand,.tile .num,.pgrid b,.nrtile b,.bnote .home-stat b,.lgb b{font-weight:800}
.tile .num{font-size:34px;letter-spacing:-.03em}
.top{border-bottom:2px solid var(--text);background:var(--bg)}
.brand{font-size:20px;letter-spacing:-.03em}
.nav a{font-weight:600;border-bottom-width:4px}
.nav a[aria-current="page"]{color:var(--text);border-bottom-color:var(--accent)}
.rigor{background:var(--bg);border-bottom:2px solid var(--rule)}
.rigor b{font-weight:600}
.ibtn{border:2px solid var(--text);color:var(--text);background:transparent;font-weight:600}
.ibtn:hover{border-color:var(--accent);background:var(--accent-bg);color:var(--text)}
.ibtn:active{background:var(--accent);color:var(--bg)}
.side{background:var(--bg);border:0;border-top:2px solid var(--text);padding:14px 16px 14px 0}
.side h3,.db h4,.bh,.k2,.bnote h4,.fc .t{color:var(--text);font-weight:800}
.search,.yrs select,.tools select,.rdsel select,.btool select,.nw textarea,.nw input[type=text]{border:1px solid var(--mute);background:var(--bg)}
.chip,.tnav button,.nwtabs button,.seg button,.btabs button{background:transparent;border-color:var(--line);text-align:left}
.chip:hover,.tnav button:hover,.nwtabs button:hover,.btabs button:hover,.lgb:hover{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.chip[aria-pressed="true"],.tnav button[aria-pressed=true],.nwtabs button[aria-pressed="true"],.seg button[aria-pressed="true"],.btabs button[aria-pressed="true"]{background:var(--accent-bg);border-color:var(--accent);color:var(--text)}
.seg{border:2px solid var(--text)}
.btn{background:var(--accent);color:#fff;font-weight:800;text-align:left;padding:9px 14px}
.btn:hover{filter:none;background:var(--accent-600)}
.btn:active{background:var(--accent-ink)}
.btn.ghost{background:transparent;border:2px solid var(--text);color:var(--text)}
.btn.ghost:hover{background:var(--accent-bg);border-color:var(--accent)}
.card,.tile,.fc,.row,.ent,.gh,.gv,.rdp,.rdh,.defs div,.pgrid div,.lrow,.nrb,.abre,.key,.bp,.mwrap,.tw,.ctw,.mapwrap,.rdgw,.note8,.nwtxt,.scale,.lgb,.nrtile{border-color:var(--line)}
.tile{border-top-width:4px}
.fc{border-left-width:1px;border-left-color:var(--line);border-top:4px solid var(--ok)}
.fc.al{border-left-color:var(--line);border-top-color:var(--al)}.fc.ok2{border-left-color:var(--line);border-top-color:var(--accent)}
.fc:hover,.row:hover,.lrow:hover,.pl:hover,.nrc:hover{border-color:var(--accent)}
.fc.al:hover,.fc:hover{border-left-color:var(--accent)}
.abre{border-left-width:1px;border-top:4px solid var(--accent)}
.hero{border-left-width:1px;border-top:4px solid var(--e-invalida)}
.nrb{border-left-width:1px;border-top:5px solid var(--bc)}
.pill{font-weight:600}
.yh{color:var(--text);font-weight:800;border-bottom:2px solid var(--text)}
#main h2{border-top:2px solid var(--rule);padding-top:12px}
#main .op h2,#main .bnote h2,#main .card h2,#main .gh h2,#main .ent h2{border-top:0;padding-top:0}
.foot{border-top:2px solid var(--rule)}
.drawer{border-left:2px solid var(--text);background:var(--bg)}
.dh{border-bottom:2px solid var(--text)}
.bh{border-bottom:2px solid var(--text)}
table.ct th{color:var(--text);font-weight:800;border-bottom:2px solid var(--text)}
.scale td,.votes td,table.ct td{border-bottom-color:var(--line)}
.bnote .lk,.nwl,details.more>summary,.gv li .tm,.btag,.pill.k,.bi[aria-current="true"],.nrtrip i,.nwarr{color:var(--accent-ink)}
.pill.k{border-color:var(--accent)}
.mono,.pill.ev{font-family:'Archivo',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:600}
img.av,.ytbox img{filter:grayscale(1) contrast(1.08)}
.rgk{border-width:2px}
@media (max-width:900px){.side{padding:16px;border-top:0}}
@media (max-width:480px){h1{font-size:28px}}

/* ===== Tons do Brasil ===== */
:root{--accent:#009c3b;--accent-600:#008a34;--accent-ink:#00702b;--accent-bg:#d9f2e2;
--e-avanca:#009c3b;--e-invalida:#002776;--e-encerra:#8a6700;--e-alivia:#4a6fb5;--e-atrasa:#9b9797;--e-redistribui:#e0bf00;
--ok:#002776;--on-ok:#ffffff;--al:#8a6700;--al-fill:#ffdf00;--on-al:#201e1d;--pend:#7d7979;--on-pend:#ffffff;--fp:#a9c4ea;--on-fp:#002776;
--okbg:#00277614;--albg:#fff3b0;--op:#002776;--opbg:#0027760d;}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--accent:#2fd06a;--accent-600:#6fe29a;--accent-ink:#6fe29a;--accent-bg:#0b3d1f;
--e-avanca:#2fd06a;--e-invalida:#7fa8ff;--e-encerra:#ffdf00;--e-alivia:#a9c4ea;--e-atrasa:#7d7979;--e-redistribui:#ffe866;
--ok:#7fa8ff;--on-ok:#0a1633;--al:#ffdf00;--al-fill:#ffdf00;--on-al:#201e1d;--pend:#9b9797;--on-pend:#201e1d;--fp:#2a3f66;--on-fp:#dbe6fa;
--okbg:#7fa8ff1c;--albg:#3a3200;--op:#a9c4ea;--opbg:#a9c4ea14;}}
:root[data-theme="dark"]{--accent:#2fd06a;--accent-600:#6fe29a;--accent-ink:#6fe29a;--accent-bg:#0b3d1f;
--e-avanca:#2fd06a;--e-invalida:#7fa8ff;--e-encerra:#ffdf00;--e-alivia:#a9c4ea;--e-atrasa:#7d7979;--e-redistribui:#ffe866;
--ok:#7fa8ff;--on-ok:#0a1633;--al:#ffdf00;--al-fill:#ffdf00;--on-al:#201e1d;--pend:#9b9797;--on-pend:#201e1d;--fp:#2a3f66;--on-fp:#dbe6fa;
--okbg:#7fa8ff1c;--albg:#3a3200;--op:#a9c4ea;--opbg:#a9c4ea14;}
.cell.al,.stack i.al,.hist button i.b,.sw.al,.dot.al,.tile.al{--_f:var(--al-fill)}
.cell.al,.stack i.al,.hist button i.b,.sw.al,.dot.al{background:var(--al-fill)}
.cell.al{color:var(--on-al)}
.tile.al,.fc.al{border-top-color:var(--al-fill)}
.edge.al{stroke:#c9a800}
.top{border-bottom:2px solid var(--text);box-shadow:0 4px 0 var(--al-fill)}
.btn{color:#fff}

/* ===== Painel visual ===== */
.pn{margin:22px 0 8px}
.pn-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-top:2px solid var(--text);border-bottom:2px solid var(--text)}
.pn-kpi{display:flex;flex-direction:column;gap:2px;padding:16px 16px 14px;border-left:2px solid var(--rule);text-decoration:none;color:var(--text)}
.pn-kpi:first-child{border-left:0;padding-left:0}
.pn-kpi:hover{background:var(--accent-bg)}
.pn-kpi b{font-size:52px;font-weight:800;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.pn-kpi span{font-size:14px;font-weight:600}
.pn-kpi small{font-size:12px;color:var(--mute)}
.pn-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin-top:8px}
.pn-b{display:flex;flex-direction:column;gap:14px;padding:20px 0 18px;border-bottom:2px solid var(--rule);min-width:0}
.pn-b.pn-wide{grid-column:1/-1}
.pn-b header h3{font-size:20px;font-weight:800;letter-spacing:-.015em;margin:0}
.pn-b header p{font-size:13px;color:var(--mute);margin-top:2px}
.pn-b footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--mute);margin-top:auto}
.pn-b footer a{font-weight:700;color:var(--accent-ink);text-decoration:none}
.pn-b footer a:hover{text-decoration:underline}
.pn-bar{display:flex;height:44px;gap:2px}
.pn-bar i{display:block;height:100%}
.pn-bar i.ok,.pn-ts i.ok{background:var(--ok)}.pn-bar i.al,.pn-ts i.al{background:var(--al-fill)}.pn-bar i.pe{background:var(--pend)}.pn-bar i.ns{background:var(--nada)}.pn-bar i.fp{background:var(--fp)}
.pn-leg{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--mute)}
.pn-leg span{display:inline-flex;align-items:center;gap:6px}
.pn-leg b{color:var(--text);font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
.pn-leg em{font-style:normal;font-size:12px}
.pn-leg .sw{width:12px;height:12px}
.pn-tl{--tlh:160px;display:flex;align-items:flex-end;gap:3px}
.pn-tc{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;gap:3px;text-decoration:none;color:var(--mute)}
.pn-tc:hover .pn-ts{outline:2px solid var(--accent);outline-offset:1px}
.pn-tn{font-size:11px;font-weight:700;text-align:center;color:var(--text);font-variant-numeric:tabular-nums}
.pn-ts{display:flex;flex-direction:column;min-height:1px}
.pn-ts i{display:block;min-height:0}
.pn-ty{font-size:10.5px;text-align:center;border-top:2px solid var(--text);padding-top:3px;white-space:nowrap;overflow:hidden}
.pn-hb{display:flex;flex-direction:column;gap:8px}
.pn-hr{display:grid;grid-template-columns:minmax(150px,230px) minmax(0,1fr);gap:12px;align-items:center;text-decoration:none;color:var(--text);font-size:13.5px}
a.pn-hr:hover .pn-hv i{outline:2px solid var(--accent);outline-offset:1px}
.pn-hl{display:flex;align-items:center;gap:8px;font-weight:600}
.pn-hl span{color:var(--text)}
.pn-ico{flex:none}
.pn-hv{display:flex;align-items:center;gap:8px;min-width:0}
.pn-hv i{display:block;height:22px;background:var(--text);max-width:calc(100% - 48px)}
.pn-hv b{font-weight:800;font-variant-numeric:tabular-nums}
.pn-sub{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;margin:6px 0 0}
.pn-ev{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.pn-ev div{display:flex;flex-direction:column;gap:3px;border-top:2px solid var(--text);padding-top:6px}
.pn-ev b{font-size:24px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.pn-ev small{font-size:12px;color:var(--mute);font-weight:600}
.pn-evb{display:flex;gap:2px}.pn-evb i{width:8px;height:14px;background:var(--nada)}.pn-evb i.on{background:var(--accent)}
.pn-waf{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:4px;max-width:420px}
.pn-waf i{display:block;aspect-ratio:1}
.w-documentado{background:var(--ok)}.w-parcial{background:var(--al-fill)}.w-em_investigacao{background:var(--accent)}.w-contraditado{background:var(--e-redistribui)}.w-nao_comprovado{background:var(--pend)}.w-nao_avaliado{background:transparent;box-shadow:inset 0 0 0 2px var(--pend)}
.pn-leg .sw[class*="w-"]{border:0}
.pn-cap{font-size:13px;color:var(--mute);margin:0}
.pn-hmw{overflow-x:auto}
.pn-hm{display:grid;gap:3px;min-width:640px}
.pn-hh{display:flex;align-items:flex-end;justify-content:center;height:96px;padding-bottom:4px;text-decoration:none;color:var(--text);border-bottom:2px solid var(--text)}
.pn-hh span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:12.5px;font-weight:700;white-space:nowrap}
.pn-hh:hover{color:var(--accent-ink)}
.pn-hc{display:flex;flex-direction:column;justify-content:center;font-size:13px;font-weight:600;color:var(--text);text-decoration:none;min-height:36px;padding-right:6px;line-height:1.2}
.pn-hc small{font-size:11px;font-weight:400;color:var(--mute)}
.pn-hc:hover{color:var(--accent-ink)}
.pn-hm .cell{height:36px;text-decoration:none}
.pn-hm a.cell:hover{outline:2px solid var(--text);outline-offset:0}
.pn-hm .cell.al{background:var(--al-fill);color:var(--on-al)}
.pn-nx{background:transparent;color:var(--line);font-weight:400}
@media (max-width:900px){.pn-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.pn-kpi:nth-child(4){border-left:0;padding-left:0}.pn-kpi:nth-child(n+4){border-top:2px solid var(--rule)}.pn-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.pn-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-kpi{border-left:0!important;padding-left:0!important;border-top:2px solid var(--rule)}.pn-kpi:first-child{grid-column:1/-1;border-top:0}.pn-kpi b{font-size:40px}.pn-tl{--tlh:120px;gap:1px}.pn-ty{font-size:9px}.pn-tn{font-size:9px}.pn-hr{grid-template-columns:1fr}}
```

## 4. JS — painel visual da Início
Cole este bloco logo antes de `function vMatriz(){`:

```js
const ICO={avanca:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',invalida:'<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',encerra:'<rect x="2" y="3" width="20" height="5"/><path d="M4 8v13h16V8"/><path d="M10 12h4"/>',alivia:'<rect x="3" y="11" width="18" height="11"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',atrasa:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',redistribui:'<path d="m8 3-4 4 4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'};
const ico=(k,s)=>'<svg class="pn-ico" width="'+(s||20)+'" height="'+(s||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" aria-hidden="true">'+ICO[k]+'</svg>';
const nf=n=>n.toLocaleString('pt-BR');
function vPainel(){
  const doc=EV.filter(e=>e.nat==='fato_documentado').length,ale=EV.length-doc;
  const tr=trStats();const natos=tr.base.length;
  const kp=[[nf(EV.length),'eventos registrados',nf(doc)+' fatos documentados · '+nf(ale)+' alegações','eventos'],[D.casos.length,'casos','','trilhas'],[D.pes.length,'pessoas auditadas','','fichas'],[nf(D.nfontes),'fontes','','contagens'],[natos,'atos processuais classificados','','trilhas']];
  const kpis='<div class="pn-kpis">'+kp.map(k=>'<a class="pn-kpi" href="#/'+k[3]+'"><b>'+k[0]+'</b><span>'+esc(k[1])+'</span>'+(k[2]?'<small>'+esc(k[2])+'</small>':'')+'</a>').join('')+'</div>';
  // status dos pares
  const gc={};Object.keys(GRP).forEach(g=>gc[g]=PR.filter(p=>GRP[g].includes(p.st)).length);const tp=PR.length;
  const stBar='<div class="pn-bar">'+Object.keys(GRP).filter(g=>gc[g]).map(g=>'<i class="'+g+'" style="flex:'+gc[g]+'" title="'+esc(GL[g])+': '+gc[g]+'"></i>').join('')+'</div>'+
    '<div class="pn-leg">'+Object.keys(GRP).map(g=>'<span><i class="sw '+g+'"></i><b>'+gc[g]+'</b>'+esc(GL[g])+' <em>'+Math.round(gc[g]*100/tp)+'%</em></span>').join('')+'</div>';
  // eventos por ano
  const yrs={};let pre=[0,0];EV.forEach(e=>{if(!e.y||e.y>=9999)return;const a=e.nat==='fato_documentado'?0:1;if(e.y<2005){pre[a]++;return}(yrs[e.y]=yrs[e.y]||[0,0])[a]++});
  const cols=[['<2005',pre]];for(let y=2005;y<=2026;y++)cols.push([String(y),yrs[y]||[0,0]]);
  const mx=Math.max(...cols.map(c=>c[1][0]+c[1][1]));
  const tl='<div class="pn-tl">'+cols.map(([y,v])=>{const t=v[0]+v[1];return '<a href="#/eventos" class="pn-tc" title="'+y+': '+v[0]+' documentados, '+v[1]+' alegações"><span class="pn-tn">'+(t||'')+'</span><span class="pn-ts" style="height:calc(var(--tlh) * '+(t/mx).toFixed(4)+')"><i class="al" style="flex:'+v[1]+'"></i><i class="ok" style="flex:'+v[0]+'"></i></span><span class="pn-ty">'+(y==='<2005'?'antes':"'"+y.slice(2))+'</span></a>'}).join('')+'</div>'+
    '<div class="pn-leg"><span><i class="sw ok"></i>Fato documentado</span><span><i class="sw al"></i>Alegação atribuída</span></div>';
  // onde os casos param
  const em=Math.max(...EFK.map(k=>tr.cnt[k]));
  const fun='<div class="pn-hb">'+EFK.map(k=>'<a href="#/trilhas" class="pn-hr"><span class="pn-hl" style="color:var(--e-'+k+')">'+ico(k)+'<span>'+esc(D.efd[k].n)+'</span></span><span class="pn-hv"><i style="width:'+(tr.cnt[k]/em*100)+'%;background:var(--e-'+k+')"></i><b>'+tr.cnt[k]+'</b></span></a>').join('')+'</div>';
  // mapa de calor
  const cc={};EV.forEach(e=>(e.c||[]).forEach(c=>cc[c]=(cc[c]||0)+1));
  const top=D.casos.slice().sort((a,b)=>(cc[b]||0)-(cc[a]||0)).slice(0,10);
  const pix={};PR.forEach((p,i)=>pix[p.p+'|'+p.c]=i);
  const gOf=st=>Object.keys(GRP).find(g=>GRP[g].includes(st));
  const hm='<div class="pn-hmw"><div class="pn-hm" style="grid-template-columns:minmax(150px,1.4fr) repeat('+D.pes.length+',minmax(34px,1fr))"><div></div>'+D.pes.map(p=>'<a class="pn-hh" href="#/pessoa?n='+encodeURIComponent(p)+'" title="'+esc(p)+'"><span>'+esc(short(p))+'</span></a>').join('')+
    top.map(c=>'<a class="pn-hc" href="#/caso?c='+encodeURIComponent(c)+'">'+esc(D.caso_lbl[c]||c)+'<small>'+(cc[c]||0)+' ev.</small></a>'+D.pes.map(p=>{const i=pix[p+'|'+c];if(i==null)return '<span class="cell pn-nx" title="Par não auditado">–</span>';const g=gOf(PR[i].st);return '<a class="cell '+g+'" href="'+hashFor('home',null,i)+'" title="'+esc(p)+' × '+esc(D.caso_lbl[c]||c)+': '+esc(GL[g])+'">'+GLET[g]+'</a>'}).join('')).join('')+'</div></div>';
  // fontes
  const FT=[['Reportagem',['reportagem','reportagem_com_analise']],['Institucional oficial',['institucional_oficial','institucional']],['Página institucional',['pagina_institucional']],['Documento oficial',['documento_oficial']],['Documento primário',['primaria_documento']],['Decisão',['decisao']],['Opinião',['opiniao_veiculo_partidario','coluna_opiniao']],['Outro',['outro']]];
  const fv=Object.values(D.fontes);const ft=FT.map(([l,ks])=>[l,fv.filter(f=>ks.includes(f.tp)).length]);const fm=Math.max(...ft.map(x=>x[1]));
  const fon='<div class="pn-hb">'+ft.map(([l,n])=>'<div class="pn-hr"><span class="pn-hl"><span>'+esc(l)+'</span></span><span class="pn-hv"><i style="width:'+(n/fm*100)+'%"></i><b>'+nf(n)+'</b></span></div>').join('')+'</div>';
  const nvc={};EV.forEach(e=>nvc[e.nv]=(nvc[e.nv]||0)+1);
  const nvb='<div class="pn-ev">'+['E1','E2','E3','E4','E5'].map((k,i)=>'<div><span class="pn-evb">'+[0,1,2,3,4].map(j=>'<i class="'+(j<=i?'on':'')+'"></i>').join('')+'</span><b>'+(nvc[k]||0)+'</b><small>'+k+'</small></div>').join('')+'</div>';
  // narrativas
  const N=D.nar,n0=N.narrativas[0],CL=N.claims,SO=['documentado','parcial','em_investigacao','contraditado','nao_comprovado','nao_avaliado'];
  const sc={};CL.forEach(c=>sc[c.status]=(sc[c.status]||0)+1);
  const waf='<div class="pn-waf">'+SO.flatMap(s=>Array(sc[s]||0).fill(s)).map(s=>'<i class="w-'+s+'" title="'+esc(N.status[s])+'"></i>').join('')+'</div>'+
    '<div class="pn-leg">'+SO.filter(s=>sc[s]).map(s=>'<span><i class="sw w-'+s+'"></i><b>'+sc[s]+'</b>'+esc(N.status[s])+'</span>').join('')+'</div>';
  const blk=(t,sub,body,href,cta,note,cls)=>'<section class="pn-b'+(cls?' '+cls:'')+'"><header><h3>'+t+'</h3>'+(sub?'<p>'+sub+'</p>':'')+'</header>'+body+'<footer>'+(note?'<span>'+note+'</span>':'<span></span>')+'<a href="#/'+href+'">'+cta+' →</a></footer></section>';
  return '<div class="pn">'+kpis+'<div class="pn-grid">'+
    blk('Status dos vínculos pessoa × caso',nf(tp)+' pares auditados',stBar,'matriz','Abrir matriz','O status descreve o que a fonte registra, não a conduta.')+
    blk('Placar da narrativa',esc(n0.titulo)+' · '+esc(n0.veiculo.split(' (')[0]),waf+'<p class="pn-cap">'+CL.length+' afirmações checadas uma a uma</p>','narrativas','Ver a auditoria')+
    blk('Eventos por ano','Data do fato; '+nf(EV.length)+' eventos',tl,'eventos','Abrir linha do tempo','','pn-wide')+
    blk('Onde os casos param',natos+' atos classificados pelo efeito no andamento do caso',fun,'trilhas','Abrir trilhas por caso','Anular ou encerrar não é absolvição.')+
    blk('Origem das fontes',nf(D.nfontes)+' fontes · nível de evidência dos eventos',fon+'<h4 class="pn-sub">Nível de evidência (E1 fraco → E5 forte)</h4>'+nvb,'glossario','Entender os níveis')+
    blk('Mapa de calor: pessoas × casos','Os 10 casos com mais eventos',hm+'<div class="pn-leg">'+Object.keys(GRP).map(g=>'<span><i class="sw '+g+'"></i>'+GLET[g]+' '+esc(GL[g])+'</span>').join('')+'</div>','matriz','Abrir matriz completa','Cor = status do vínculo no dossiê. Vínculo documentado ≠ culpa.','pn-wide')+
  '</div></div>'}
```

Em `vHome()`, logo após o `<p class="lead">…</p>`, troque `${nwHtml()}` por:
```js
${vPainel()}
  ${nwHtml()}
```

O painel usa funções que já existem (`esc`, `short`, `trStats`, `hashFor`, `EV`, `PR`, `GRP`, `GL`, `GLET`, `EFK`). Todos os links são `href="#/…"` e usam o roteamento por hash atual.

## 5. Verificar
- Início: 5 números grandes, status dos pares, placar da narrativa (27 quadrados), eventos por ano (a barra de 2026 não pode estourar o topo), onde os casos param (com ícones), origem das fontes + níveis E1–E5, mapa de calor 11 pessoas × 10 casos.
- Os links do mapa de calor abrem a gaveta do par; os nomes abrem a ficha da pessoa.
- Tema escuro e mobile (<560px) funcionando.
- Nenhum `border-radius` visível, exceto os glifos de dados (círculo de "avança", pontos do cérebro, pinos do termômetro).

## 6. Termômetro do regime — losango com legenda junto
Premissa: legenda e definições ficam ao lado do gráfico, nunca em seção separada.

Cole antes de `function rgGauge(){`:
```js
function rgDiamond(){
  const cx=450,hw=y=>280*(1-Math.abs(y-310)/300),Z=RG.zonas;
  const selZ=RG.autor[S.rg]&&RG.autor[S.rg].zona;
  const byZone={};RGORD.forEach(k=>{const z=RG.autor[k]&&RG.autor[k].zona;if(z)(byZone[z]=byZone[z]||[]).push(k)});
  const col=i=>i<3?'var(--accent)':'var(--al)',fil=i=>i<3?'var(--accent)':'var(--al-fill)';
  let g='';
  Z.forEach((z,i)=>{const yt=i===0?10:10+100*i+5,yb=i===5?610:10+100*(i+1)-5,sel=z.k===selZ,solid=i===0||i===5;
    const pts=[[cx-hw(yt),yt],[cx+hw(yt),yt],[cx+hw(yb),yb],[cx-hw(yb),yb]].map(p=>p[0].toFixed(1)+','+p[1]).join(' ');
    const fill=solid?fil(i):'color-mix(in srgb,'+fil(i)+' '+(sel?26:10)+'%,var(--bg))';
    g+='<polygon points="'+pts+'" fill="'+fill+'" stroke="'+col(i)+'" stroke-width="'+(sel?6:3)+'" stroke-linejoin="miter"'+(solid&&!sel?' stroke-opacity="0"':'')+'><title>'+esc(z.n)+': '+esc(z.d)+'</title></polygon>';
    const ks=byZone[z.k]||[],mid=(yt+yb)/2+(i===0?22:i===5?-22:0);
    if(!solid)g+='<text x="'+cx+'" y="'+(ks.length?mid-12:mid+7)+'" text-anchor="middle" class="rgd-t">'+esc(z.n.toUpperCase())+'</text>';
    ks.forEach((k,j)=>{const x=cx+(j-(ks.length-1)/2)*46,y=solid?mid:mid+24,on=S.rg===k;
      g+='<g data-rgm="'+k+'" class="rgd-m" role="button" tabindex="0" aria-pressed="'+on+'"><title>'+esc(RGSH[k])+': '+esc(z.n)+' (opinião do autor)</title><circle cx="'+x+'" cy="'+y+'" r="18" fill="'+(on?'var(--text)':'var(--bg)')+'" stroke="var(--text)" stroke-width="3"/><text x="'+x+'" y="'+(y+6)+'" text-anchor="middle" class="rgd-mt" fill="'+(on?'var(--bg)':'var(--text)')+'">'+esc(RGSH[k][0])+'</text></g>'})});
  g+='<line x1="20" y1="310" x2="880" y2="310" stroke="var(--text)" stroke-width="2" stroke-dasharray="6 6"/>';
  g+='<text x="20" y="298" class="rgd-s" fill="var(--accent-ink)">FORMAS JUSTAS ↑</text><text x="20" y="334" class="rgd-s" fill="var(--al)">FORMAS INJUSTAS ↓</text>';
  g+='<text x="610" y="52" class="rgd-c" fill="var(--accent-ink)">GOVERNO JUSTO</text><text x="610" y="86" class="rgd-c rgd-cb" fill="var(--accent-ink)">DE UM SÓ</text>';
  g+='<text x="290" y="560" text-anchor="end" class="rgd-c" fill="var(--al)">GOVERNO INJUSTO</text><text x="290" y="594" text-anchor="end" class="rgd-c rgd-cb" fill="var(--al)">DE UM SÓ</text>';
  const list=Z.map((z,i)=>{const ks=byZone[z.k]||[],c=i<3?'var(--accent)':'var(--al-fill)',sel=z.k===selZ;return '<div class="rgd-z'+(sel?' on':'')+'" style="--zc:'+c+'"><div class="rgd-zn"><b>'+esc(z.n)+'</b>'+(ks.length?'<span class="rgd-zk">'+ks.map(k=>'<button class="rgd-i" data-rgm="'+k+'" aria-pressed="'+(S.rg===k)+'" title="'+esc(RG.nomes[k]||RGSH[k])+'"><span class="rgd-b">'+esc(RGSH[k][0])+'</span>'+esc(RGSH[k])+'</button>').join('')+'</span>':'')+'</div><p>'+esc(z.d)+'</p></div>'}).join('');
  const dt=RG.autor.brasil&&RG.autor.brasil.data;
  return '<div class="rgd"><svg class="rgd-svg" viewBox="0 0 900 620" role="group" aria-label="Losango das seis formas de governo com a posição atribuída pelo autor">'+g+'</svg><div class="rgd-l"><div class="rgd-h">As seis formas de governo<small>Letras = onde o autor situa cada item (opinião'+(dt?', '+esc(fmtD(dt)):'')+'). Não é medida do dossiê.</small></div>'+list+'</div></div>'}
```
Em `vRegime()`:
- troque `${rgGauge()}` por `${rgDiamond()}`;
- troque a legenda logo abaixo por "De cima para baixo: governo justo de um só, aristocracia e democracia boa (formas justas); democracia ruim, oligarquia e governo injusto de um só (formas injustas). Clique num marcador ou num item da lista para ver o que o dossiê registrou sobre ele.";
- remova a linha `<div class="tnav" …>${tabs}</div>`;
- remova `<h2>As seis zonas da escala</h2>` e `<div class="how">${zonaLeg}</div>` (as definições agora estão ao lado do losango).

Os cliques usam o handler existente de `[data-rgm]`.

CSS (adicionar no fim):
```css
/* ===== Termômetro: losango ===== */
.rgd{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,1fr);gap:28px;align-items:start;margin:20px 0 6px;padding:18px 0;border-top:2px solid var(--text);border-bottom:2px solid var(--text)}
.rgd-svg{width:100%;height:auto;display:block;max-width:820px}
.rgd-t{font-family:'Archivo',sans-serif;font-weight:800;font-size:21px;letter-spacing:.14em;fill:var(--text)}
.rgd-s{font-family:'Archivo',sans-serif;font-weight:800;font-size:13px;letter-spacing:.1em}
.rgd-c{font-family:'Archivo',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.01em}
.rgd-cb{font-size:34px}
.rgd-mt{font-family:'Archivo',sans-serif;font-weight:800;font-size:17px;pointer-events:none}
.rgd-m{cursor:pointer}.rgd-m:hover circle{stroke:var(--accent);stroke-width:4}
.rgd-m:focus-visible{outline:none}.rgd-m:focus-visible circle{stroke:var(--accent);stroke-width:5}
.rgd-l{display:flex;flex-direction:column}
.rgd-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;padding-bottom:8px;border-bottom:2px solid var(--text)}
.rgd-h small{display:block;text-transform:none;letter-spacing:0;font-weight:400;font-size:12.5px;color:var(--mute);margin-top:2px}
.rgd-z{display:flex;flex-direction:column;gap:3px;padding:10px 0 10px 14px;border-bottom:1px solid var(--line);box-shadow:inset 6px 0 0 var(--zc)}
.rgd-z.on{background:var(--accent-bg)}
.rgd-zn{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.rgd-zn b{font-size:15px;font-weight:800}
.rgd-z p{font-size:13px;line-height:1.4;color:var(--mute);margin:0}
.rgd-zk{display:flex;flex-wrap:wrap;gap:6px}
.rgd-i{display:inline-flex;align-items:center;gap:6px;padding:2px 10px 2px 2px;border:2px solid var(--text);font-size:13px;font-weight:700}
.rgd-i:hover{border-color:var(--accent)}
.rgd-i[aria-pressed="true"]{background:var(--text);color:var(--bg)}
.rgd-b{flex:none;width:24px;height:24px;border-radius:50%!important;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}
@media (max-width:820px){.rgd{grid-template-columns:minmax(0,1fr);gap:16px}}
```

## 7. Início com cara de portal (com fotos nos registros)
Substitua a função `vHome()` inteira por este bloco (inclui `trAll()`, que conta todos os atos sem aplicar os filtros da lateral):
```js
function trAll(){const base=D.atos;const cnt={};EFK.forEach(k=>cnt[k]=base.filter(a=>a.ef===k).length);return{base,cnt,nc:new Set(base.map(a=>a.c)).size}}
function vHome(){
  const gvCount=Object.keys(D.gv||{}).length,tr=trAll();
  const GROUPS=[
    ['Auditoria',[['narrativas','Auditoria de narrativas'],['regime','Termômetro do regime'],['rede','Vínculos e hipóteses'],['cerebro','Segundo cérebro']]],
    ['Casos e pessoas',[['trilhas','Onde os casos param'],['fichas','Pessoas e casos'],['eventos','Eventos e linha do tempo'],['matriz','Matriz'],['mapa','Mapa'],['mecanismos','Mecanismos processuais']]],
    ['Mídia e opinião',[['garcia','Comparativo Alexandre Garcia'],['gazeta','Gazeta do Povo'],['oeste','Revista Oeste'],['cobertura','Cobertura de opinião'],['opiniao','Opinião do autor'],['mensagens','Mensagens']]],
    ['Números e método',[['inicio','Visão geral'],['sit','Situação atual'],['contagens','Contagens'],['glossario','Glossário e método']]],
  ];
  const dated=EV.filter(x=>x.d&&x.d.slice(0,4)!=='9999').sort((a,b)=>b.d.localeCompare(a.d));
  const lead=dated.find(x=>x.nat==='fato_documentado'&&(x.p||x.pf))||dated[0];
  const lc=(lead.c||[])[0],inC=dated.filter(x=>x!==lead&&(x.c||[]).includes(lc));
  const rel=inC.slice(0,2);
  const pm=new Map();[lead,...inC].forEach(x=>{const n=x.p||x.pf;if(!n)return;if(!pm.has(n))pm.set(n,[]);pm.get(n).push(x)});
  const ppl=[...pm.entries()].sort((p,q)=>(q[1].length+(D.foto[q[0]]?100:0))-(p[1].length+(D.foto[p[0]]?100:0))).slice(0,3);
  const rec=dated.filter(x=>x!==lead&&!rel.includes(x)).slice(0,6);
  const cl=x=>(x.c||[]).map(c=>D.caso_lbl[c]||c).join(', ');
  const tag=x=>x.nat==='alegacao_atribuida'?'<span class="pt-tag al">Alegação atribuída</span>':'<span class="pt-tag ok">Fato documentado</span>';
  const nvT={E1:'evidência fraca',E2:'evidência limitada',E3:'evidência média',E4:'evidência forte',E5:'evidência muito forte'};
  const nvl=x=>x.nv?'<span class="pt-nv" title="Nível '+x.nv+' de 1 a 5">'+'<i class="on"></i>'.repeat(+x.nv.slice(1))+'<i></i>'.repeat(5-x.nv.slice(1))+' '+esc(nvT[x.nv]||x.nv)+'</span>':'';
  const who=x=>x.p||x.pf||'';
  const ph=(x,cls)=>{const n=who(x),f=n&&D.foto[n];if(f)return '<figure class="pt-ph '+cls+'"><img src="'+f.u+'" alt="Foto de '+esc(n)+'" loading="lazy" title="'+esc(n)+' · Foto: '+esc(f.c)+' ('+esc(f.l)+')">'+'</figure>';
    const t=n||cl(x);const w=t.replace(/(.*?)/g,'').split(/[s/]+/).filter(y=>/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]/.test(y));const ini=((w[0]||'?')[0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase();
    return '<figure class="pt-ph '+cls+' pt-ini" aria-hidden="true"><span>'+esc(ini)+'</span></figure>'};
  const cut=(t,n)=>t&&t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':(t||'');
  const sh=(k,t,href)=>'<div class="pt-sh"><span>'+esc(k)+'</span>'+(href?'<a href="#/'+href+'">'+esc(t)+' →</a>':'')+'</div>';
  // casos com movimentação recente
  const seen=new Set(),byCase=[];for(const x of dated){const c=(x.c||[])[0];if(!c||seen.has(c))continue;seen.add(c);byCase.push([c,x]);if(byCase.length===4)break}
  // destaques
  const CL=(D.nar&&D.nar.claims)||[],n0=D.nar&&D.nar.narrativas[0],sc={};CL.forEach(c=>sc[c.status]=(sc[c.status]||0)+1);
  const SO=['documentado','parcial','em_investigacao','contraditado','nao_comprovado','nao_avaliado'];
  const zB=RG.autor.brasil&&RGZ[RG.autor.brasil.zona];
  const dest=[
    ['narrativas','Auditoria de narrativas',n0?esc(n0.titulo):'','<div class="pt-mini">'+SO.filter(k=>sc[k]).map(k=>'<i class="w-'+k+'" style="flex:'+sc[k]+'" title="'+esc(D.nar.status[k])+': '+sc[k]+'"></i>').join('')+'</div><div class="pt-lg">'+SO.filter(k=>sc[k]).map(k=>'<span><i class="w-'+k+'"></i>'+esc(D.nar.status[k])+' '+sc[k]+'</span>').join('')+'</div><p class="pt-cap"><b>'+(sc.documentado||0)+'</b> de '+CL.length+' afirmações têm registro. <b>'+(sc.nao_comprovado||0)+'</b> não foram comprovadas.</p>'],
    ['regime','Termômetro do regime','Onde o autor situa o Brasil hoje','<p class="pt-big">'+esc(zB?zB.n:'—')+'</p><p class="pt-cap"><span class="pt-tag op">Opinião do autor</span> Não é medida do dossiê.</p>'],
    ['trilhas','Onde os casos param',tr.base.length+' decisões classificadas pelo efeito','<div class="pt-mini">'+EFK.filter(k=>tr.cnt[k]).map(k=>'<i style="flex:'+tr.cnt[k]+';background:var(--e-'+k+')" title="'+esc(D.efd[k].n)+': '+tr.cnt[k]+'"></i>').join('')+'</div><div class="pt-lg">'+EFK.filter(k=>tr.cnt[k]).map(k=>'<span><i style="background:var(--e-'+k+')"></i>'+esc(D.efd[k].n)+' '+tr.cnt[k]+'</span>').join('')+'</div><p class="pt-cap"><b>'+tr.cnt.avanca+'</b> fizeram o caso avançar; <b>'+(tr.cnt.invalida+tr.cnt.encerra)+'</b> anularam ou encerraram sem julgar o mérito.</p>'],
    ['garcia','Alexandre Garcia','O que o comentarista disse, mês a mês','<p class="pt-big">'+gvCount+' vídeos</p><p class="pt-cap"><span class="pt-tag op">Opinião</span> Comparados com os eventos do dossiê.</p>']
  ];
  return '<div class="pt">'+
  '<header class="pt-mast"><div class="pt-mt"><span>Edição de '+esc(fmtD(D.meta.atualizado))+'</span><span>Rodada '+D.meta.rodada+'</span><span>'+nf(EV.length)+' eventos · '+nf(D.nfontes)+' fontes</span></div>'+
  '<h1 class="pt-logo">Desmentindo</h1><p class="pt-slogan">Veja o que a evidência realmente permite afirmar.</p>'+
  '<nav class="pt-ed" aria-label="Editorias">'+GROUPS.map(g=>'<a href="#/'+g[1][0][0]+'">'+esc(g[0])+'</a>').join('')+'</nav></header>'+
  '<div class="pt-top">'+
    '<article class="pt-lead">'+
    '<div class="pt-k">'+esc(cl(lead))+' · '+esc(dateOf(lead))+'</div>'+
    '<button class="pt-h1" data-ev="'+lead.id+'">'+esc(cut(headline(lead).replace(/\s*\([^)]*\)/g,'').replace(/\.$/,''),150))+'</button>'+
    '<div class="pt-meta">'+tag(lead)+nvl(lead)+'</div>'+
    (rel.length?'<ul class="pt-bul">'+rel.map(x=>'<li><button data-ev="'+x.id+'">'+esc(cut(headline(x),130))+'</button></li>').join('')+'</ul>':'')+
    (ppl.length?'<div class="pt-pk">Pessoas centrais neste caso</div><div class="pt-ppl">'+ppl.map(([n,all])=>{const xs=all.filter(z=>z!==lead).length?all.filter(z=>z!==lead):all,x=xs[0],y=xs[1],f=D.foto[n];return '<article class="pt-pc">'+
      '<a class="pt-pf" href="#/pessoa?n='+encodeURIComponent(n)+'">'+(f?'<img src="'+f.u+'" alt="Foto de '+esc(n)+'" loading="lazy" title="Foto: '+esc(f.c)+' ('+esc(f.l)+')">':'<span>'+esc(n.split(/\s+/).filter(w=>/^[A-ZÁÉÍÓÚ]/.test(w)).map(w=>w[0]).slice(0,2).join(''))+'</span>')+'<b>'+esc(n)+'</b></a>'+
      '<button class="pt-pt" data-ev="'+x.id+'">'+esc(cut(headline(x),110))+'</button>'+
      '<div class="pt-pm">'+tag(x)+'<span>'+esc(dateOf(x))+' · '+all.length+' registro'+(all.length>1?'s':'')+' no caso</span></div>'+
      (y?'<ul class="pt-bul sm"><li><button data-ev="'+y.id+'">'+esc(cut(headline(y),90))+'</button></li></ul>':'')+
    '</article>'}).join('')+'</div><p class="pt-cred">Pessoas com mais registros neste caso no dossiê. Aparecer aqui não indica culpa nem vínculo com os fatos; a foto só identifica a pessoa. Fotos: Wikimedia Commons, licença livre (crédito ao passar o mouse).</p>':'')+
    '</article>'+
    '<aside class="pt-rec">'+sh('Últimos registros','Todos','eventos')+
    '<ol>'+rec.map((x,i)=>'<li><button data-ev="'+x.id+'"><span class="pt-n">'+(i+1)+'</span>'+ph(x,'sm')+'<span class="pt-rb"><span class="pt-k">'+esc(dateOf(x))+' · '+esc(cut(cl(x),40))+'</span><span class="pt-rt">'+esc(cut(headline(x),120))+'</span>'+tag(x)+'</span></button></li>').join('')+'</ol>'+
    '<p class="pt-key"><span class="pt-tag ok">Fato documentado</span> uma fonte registra o fato. <span class="pt-tag al">Alegação atribuída</span> alguém afirma; não é fato confirmado.<br>A foto mostra a pessoa central do registro. Aparecer ao lado de um fato não indica culpa nem vínculo.</p></aside>'+
  '</div>'+
  sh('Em destaque')+
  '<div class="pt-dest">'+dest.map(d=>'<a class="pt-card" href="#/'+d[0]+'"><span class="pt-ck">'+esc(d[1])+'</span><span class="pt-ct">'+d[2]+'</span>'+d[3]+'</a>').join('')+'</div>'+
  sh('Movimentação recente por caso','Onde os casos param','trilhas')+
  '<div class="pt-cases">'+byCase.map(([c,x])=>'<a class="pt-case" href="#/caso?c='+encodeURIComponent(c)+'">'+ph(x,'md')+'<span class="pt-ck">'+esc(D.caso_lbl[c]||c)+'</span><span class="pt-k">Último registro: '+esc(dateOf(x))+'</span><span class="pt-rt">'+esc(cut(headline(x),110))+'</span>'+tag(x)+'</a>').join('')+'</div>'+
  sh('O dossiê em números','Visão geral','inicio')+
  vPainel()+
  sh('Bancada: audite uma peça','Como funciona','narrativas')+
  nwHtml()+
  sh('Todas as seções')+
  '<div class="pt-map">'+GROUPS.map(([g,it])=>'<div><h3>'+esc(g)+'</h3><ul>'+it.map(([k,l])=>'<li><a href="#/'+k+'">'+esc(l)+'</a></li>').join('')+'</ul></div>').join('')+'</div>'+
  '<div class="pt-rules"><div><b>Documentado não é culpa.</b> Registrar um ato ou um vínculo não diz que houve crime.</div><div><b>Alegação não é fato.</b> É o que alguém afirma; o dossiê registra quem disse.</div><div><b>Anular não é absolver.</b> Anulação, arquivamento ou suspensão não dizem se os fatos ocorreram.</div><div><b>Opinião é marcada.</b> Todo conteúdo de opinião traz a etiqueta de opinião.</div></div>'+
  '</div>'}
```
No `vPainel()`, troque `const tr=trStats();` por `const tr=trAll();`.

Estrutura: cabeçalho de jornal → banner principal em largura total (manchete grande em verde, sem parênteses; etiqueta e nível de evidência; 2 marcadores com os registros seguintes do mesmo caso; "Pessoas centrais neste caso": 3 cards com foto 4:3 em P&B e nome sobre a foto, o registro mais recente de cada pessoa no caso (diferente da manchete), etiqueta, data e total de registros, e um marcador com o registro anterior; aviso de que aparecer ali não indica culpa nem vínculo) → "Últimos registros" em 2 colunas, com miniatura → Em destaque → Movimentação por caso → Números → Bancada → mapa das seções → 4 regras.

Fotos: só as de `D.foto` (licença livre), sempre em preto e branco, com crédito (legenda na manchete, `title` nas miniaturas). Sem foto → quadrado com iniciais. Aviso junto da lista: "A foto mostra a pessoa central do registro. Aparecer ao lado de um fato não indica culpa nem vínculo." Gráficos continuam sem fotos.

CSS (adicionar no fim; inclui os blocos "Início: portal" e "Início: fotos nos registros"):
```css
/* ===== Início: portal ===== */
.pt{display:flex;flex-direction:column}
.pt-mast{border-bottom:4px solid var(--text);padding-bottom:0;margin-bottom:22px}
.pt-mt{display:flex;flex-wrap:wrap;gap:4px 20px;font-size:12.5px;font-weight:600;color:var(--mute);padding-bottom:8px;border-bottom:2px solid var(--rule)}
.pt-logo{font-size:clamp(48px,9vw,112px);font-weight:800;letter-spacing:-.055em;line-height:.9;margin:14px 0 6px}
.pt-slogan{font-size:17px;font-weight:600;margin:0 0 14px}
.pt-ed{display:flex;flex-wrap:wrap;border-top:2px solid var(--text)}
.pt-ed a{padding:10px 18px 10px 0;margin-right:18px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text);text-decoration:none;border-bottom:4px solid transparent}
.pt-ed a:hover{border-bottom-color:var(--accent);color:var(--text)}
.pt-top{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:0;border-bottom:2px solid var(--text)}
.pt-lead{padding:4px 28px 26px 0;display:flex;flex-direction:column;gap:12px;align-items:flex-start;border-right:2px solid var(--rule)}
.pt-k{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--accent-ink)}
.pt-h1{font-size:clamp(28px,3.4vw,44px);font-weight:800;line-height:1.05;letter-spacing:-.03em;color:var(--text);text-align:left;text-wrap:balance}
.pt-h1:hover{color:var(--accent-ink)}
.pt-sum{font-size:17px;line-height:1.5;max-width:62ch;margin:0;text-wrap:pretty}
.pt-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;font-size:13px;color:var(--mute)}
.pt-tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;line-height:1.4;white-space:nowrap}
.pt-tag.ok{background:var(--ok);color:var(--on-ok)}
.pt-tag.al{background:var(--al-fill);color:var(--on-al)}
.pt-tag.op{background:transparent;color:var(--text);box-shadow:inset 0 0 0 2px var(--text)}
.pt-nv{display:inline-flex;align-items:center;gap:2px;font-size:12.5px;font-weight:600;color:var(--mute)}
.pt-nv i{display:block;width:6px;height:12px;background:var(--nada)}.pt-nv i.on{background:var(--accent)}
.pt-nv i:last-of-type{margin-right:5px}
.pt-rec{padding:4px 0 18px 26px;display:flex;flex-direction:column;min-width:0}
.pt-rec ol{list-style:none;margin:0;padding:0}
.pt-rec li{border-bottom:1px solid var(--line)}
.pt-rec li button{display:flex;gap:12px;width:100%;padding:12px 0;text-align:left;color:var(--text)}
.pt-rec li button:hover .pt-rt{color:var(--accent-ink);text-decoration:underline}
.pt-n{font-size:26px;font-weight:800;line-height:1;color:var(--accent);min-width:22px;font-variant-numeric:tabular-nums}
.pt-rb{display:flex;flex-direction:column;gap:4px;align-items:flex-start;min-width:0}
.pt-rt{font-size:15px;font-weight:700;line-height:1.3;text-wrap:pretty}
.pt-key{font-size:12.5px;color:var(--mute);line-height:1.9;margin:12px 0 0}
.pt-sh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-top:4px solid var(--text);padding-top:8px;margin:34px 0 14px}
.pt-top .pt-sh,.pt-rec .pt-sh{margin-top:0;border-top-width:2px}
.pt-sh span{font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.pt-sh a{font-size:13px;font-weight:700;color:var(--accent-ink);text-decoration:none}
.pt-sh a:hover{text-decoration:underline}
.pt-dest,.pt-cases{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.pt-card,.pt-case{display:flex;flex-direction:column;gap:8px;padding:0 18px 4px;border-left:2px solid var(--rule);text-decoration:none;color:var(--text);min-width:0}
.pt-card:first-child,.pt-case:first-child{border-left:0;padding-left:0}
.pt-card:hover .pt-ck,.pt-case:hover .pt-ck{color:var(--accent-ink);text-decoration:underline}
.pt-ck{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1.15}
.pt-ct{font-size:13px;color:var(--mute);line-height:1.35}
.pt-case{align-items:flex-start}
.pt-mini{display:flex;gap:2px;height:22px;margin-top:4px}.pt-mini i{display:block;height:100%}
.pt-big{font-size:30px;font-weight:800;line-height:1;letter-spacing:-.03em;margin:4px 0 0}
.pt-cap{font-size:13px;line-height:1.45;margin:0}
.pt .pn{margin-top:0}
.pt-map{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.pt-map>div{padding:0 18px;border-left:2px solid var(--rule)}.pt-map>div:first-child{border-left:0;padding-left:0}
.pt-map h3{font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px}
.pt-map ul{list-style:none;margin:0;padding:0}.pt-map li{border-bottom:1px solid var(--line)}
.pt-map a{display:block;padding:7px 0;font-size:14.5px;font-weight:600;color:var(--text);text-decoration:none}.pt-map a:hover{color:var(--accent-ink)}
.pt-rules{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:34px;border-top:2px solid var(--text);border-bottom:2px solid var(--text)}
.pt-rules div{padding:14px 18px;font-size:13.5px;line-height:1.45;border-left:2px solid var(--rule)}.pt-rules div:first-child{border-left:0;padding-left:0}
.pt-rules b{display:block;font-size:15px;font-weight:800;margin-bottom:2px}
@media (max-width:980px){.pt-top{grid-template-columns:minmax(0,1fr)}.pt-lead{border-right:0;padding-right:0;border-bottom:2px solid var(--rule)}.pt-rec{padding-left:0;padding-top:16px}.pt-dest,.pt-cases,.pt-map,.pt-rules{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:22px}.pt-card:nth-child(3),.pt-case:nth-child(3),.pt-map>div:nth-child(3),.pt-rules div:nth-child(3){border-left:0;padding-left:0}}
@media (max-width:560px){.pt-dest,.pt-cases,.pt-map,.pt-rules{grid-template-columns:minmax(0,1fr)}.pt-card,.pt-case,.pt-map>div,.pt-rules div{border-left:0!important;padding-left:0!important;padding-right:0;border-top:2px solid var(--rule);padding-top:12px}.pt-card:first-child,.pt-case:first-child{border-top:0}.pt-ed a{margin-right:10px;padding-right:0}}
.pt-lg{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:12px;color:var(--mute)}.pt-lg span{display:inline-flex;align-items:center;gap:5px}.pt-lg i{display:inline-block;width:10px;height:10px;flex:none}

/* ===== Início: fotos nos registros ===== */
.pt-lead{display:block}
.pt-lr{display:grid;grid-template-columns:128px minmax(0,1fr);gap:20px;align-items:start;width:100%}
.pt-lx{display:flex;flex-direction:column;gap:12px;align-items:flex-start;min-width:0}
.pt-cred{font-size:11.5px;color:var(--mute);margin:0;line-height:1.4}
.pt-lb{display:flex;flex-direction:column;gap:12px;align-items:flex-start;min-width:0}
.pt-ph{margin:0;flex:none;background:var(--panel2);overflow:hidden;position:relative}
.pt-ph img{display:block;width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.08)}
.pt-ph.big{width:128px;border-bottom:4px solid var(--accent)}
.pt-ph.big img{width:128px;height:128px}
.pt-ph.big.pt-ini{height:128px}
.pt-ph.big figcaption{font-size:10.5px;color:var(--mute);margin-top:4px;line-height:1.3}
.pt-ph.sm{width:64px;height:64px}
.pt-ph.md{width:72px;height:72px}
.pt-ini{display:flex;align-items:center;justify-content:center;background:var(--panel2)}
.pt-ini span{font-weight:800;letter-spacing:-.03em;color:var(--mute)}
.pt-ph.sm.pt-ini span{font-size:20px}.pt-ph.md.pt-ini span{font-size:22px}.pt-ph.big.pt-ini span{font-size:32px}
.pt-rec li button{align-items:flex-start}
@media (max-width:560px){.pt-lr{grid-template-columns:84px minmax(0,1fr);gap:14px}.pt-ph.big,.pt-ph.big img{width:84px}.pt-ph.big img,.pt-ph.big.pt-ini{height:84px}.pt-ph.sm{width:52px;height:52px}}

/* ===== Início: banner principal ===== */
.pt-top{grid-template-columns:minmax(0,1fr)!important}
.pt-lead{display:flex!important;flex-direction:column;gap:14px;padding:4px 0 26px!important;border-right:0!important;border-bottom:2px solid var(--rule)}
.pt-lead .pt-h1{font-size:clamp(32px,4.8vw,58px);line-height:1.02;letter-spacing:-.035em;color:var(--accent-ink);max-width:24ch;text-wrap:balance}
.pt-lead .pt-h1:hover{color:var(--text)}
.pt-bul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.pt-bul li{display:flex;gap:10px;align-items:baseline}
.pt-bul li::before{content:"";flex:none;width:9px;height:9px;background:var(--accent);transform:translateY(-2px)}
.pt-bul button{font-size:clamp(16px,1.8vw,20px);font-weight:600;line-height:1.3;color:var(--text);text-align:left}
.pt-bul button:hover{color:var(--accent-ink);text-decoration:underline}
.pt-bul.sm button{font-size:14px;font-weight:500}
.pt-pk{align-self:stretch;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-top:2px solid var(--rule);padding-top:14px;margin-top:6px}
.pt-ppl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.pt-pc{display:flex;flex-direction:column;gap:10px;min-width:0}
.pt-pf{position:relative;display:block;aspect-ratio:4/3;background:var(--panel2);overflow:hidden;text-decoration:none}
.pt-pf img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;filter:grayscale(1) contrast(1.08)}
.pt-pf>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:var(--mute)}
.pt-pf b{position:absolute;left:0;bottom:0;background:var(--text);color:var(--bg);font-size:13px;font-weight:800;padding:5px 10px;letter-spacing:.01em}
.pt-pf:hover b{background:var(--accent)}
.pt-pt{font-size:20px;font-weight:800;line-height:1.15;letter-spacing:-.015em;color:var(--accent-ink);text-align:left;text-wrap:pretty}
.pt-pt:hover{color:var(--text)}
.pt-pm{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12px;color:var(--mute)}
.pt-rec{padding:18px 0 18px!important}
.pt-rec ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px}
@media (max-width:760px){.pt-ppl{grid-template-columns:minmax(0,1fr)}.pt-pc{display:grid;grid-template-columns:120px minmax(0,1fr);column-gap:14px}.pt-pf{grid-row:span 3;aspect-ratio:1}.pt-pc .pt-bul{grid-column:2}.pt-rec ol{grid-template-columns:minmax(0,1fr)}}
```

## 8. Hub de notícias (aba nova + bloco na Início)
Aba `#/noticias` ("Hub de notícias", logo após Início) e bloco "Hoje na imprensa · auditado" na Início, antes de "Em destaque". Sem barra de filtros e em largura "solo".

1. Dados: `hub/edicao-AAAA-MM-DD.json` (ver `hub/edicao-2026-09-25.json`). No build, injete a edição mais recente logo após a linha `const D = …`:
```js
const HUB=/* conteúdo do JSON */;
const HUBV={};HUB.veiculos.forEach(([k,n,u])=>HUBV[k]={n,u});
const HSELO={confere:['Confere com o dossiê','O que a notícia diz bate com registros que o dossiê já tem.'],parcial:['Confere em parte','Uma parte bate com o dossiê; outra parte ainda não tem registro.'],novo:['Fato novo','Ainda não há registro no dossiê. Entra na próxima rodada, depois de conferido.'],diverge:['Diverge do dossiê','A notícia contradiz um registro do dossiê. As duas versões ficam registradas.'],alegacao:['Alegação','A notícia relata o que alguém afirma. Alegação não é fato.'],fora:['Fora do escopo','O tema não faz parte do dossiê. Aparece como notícia do dia, sem auditoria.']};
const HTIPO={fato:'Fato relatado',alegacao:'Alegação',resposta:'Resposta do citado',opiniao:'Opinião'};
```
2. Cole antes de `function vMatriz(){`:
```js
function hubSel(k,big){const s=HSELO[k]||['?',''];return '<span class="hb-selo s-'+k+(big?' big':'')+'" title="'+esc(s[1])+'">'+esc(s[0])+'</span>'}
function hubItem(x,compact){const V=HUBV[x.v]||{n:x.v};
  const evs=(x.ev||[]).filter(i=>byId[i]);
  return '<article class="hb-it'+(compact?' c':'')+'"><div class="hb-src"><b>'+esc(V.n)+'</b><span>'+esc(fmtD(x.d))+' · '+esc(x.tema||'')+'</span></div>'+
  '<a class="hb-t" href="'+esc(safeUrl(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.t)+'</a>'+
  '<div class="hb-aud"><span class="hb-lab">Auditoria Desmentindo</span>'+hubSel(x.selo)+'<span class="hb-tp">'+esc(HTIPO[x.tipo]||'')+'</span><p>'+esc(x.frase)+'</p>'+
  (evs.length&&!compact?'<div class="hb-ev"><span>Registros ligados:</span>'+evs.map(i=>'<button class="pill ev" data-ev="'+i+'" title="'+esc(headline(byId[i]))+'">'+i+'</button>').join('')+'</div>':'')+
  (x.p&&x.p.length&&!compact?'<div class="hb-ev"><span>Pessoas:</span>'+x.p.map(n=>'<a href="#/pessoa?n='+encodeURIComponent(n)+'">'+esc(n)+'</a>').join('')+'</div>':'')+
  '</div></article>'}
function hubKey(){return '<div class="hb-key">'+Object.keys(HSELO).map(k=>'<div>'+hubSel(k)+'<span>'+esc(HSELO[k][1])+'</span></div>').join('')+'</div>'}
function vHub(){const H=HUB,I=H.itens.slice().sort((a,b)=>b.d.localeCompare(a.d));
  const sc={};I.forEach(x=>sc[x.selo]=(sc[x.selo]||0)+1);
  const cov=H.veiculos.map(([k,n,u])=>{const c=I.filter(x=>x.v===k).length;return '<a class="hb-cv'+(c?'':' z')+'" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer"><b>'+c+'</b><span>'+esc(n)+'</span></a>'}).join('');
  const bar='<div class="hb-bar">'+Object.keys(HSELO).filter(k=>sc[k]).map(k=>'<i class="s-'+k+'" style="flex:'+sc[k]+'" title="'+esc(HSELO[k][0])+': '+sc[k]+'"></i>').join('')+'</div><div class="pn-leg">'+Object.keys(HSELO).filter(k=>sc[k]).map(k=>'<span><i class="sw s-'+k+'"></i><b>'+sc[k]+'</b>'+esc(HSELO[k][0])+'</span>').join('')+'</div>';
  const temas=[...new Set(I.map(x=>x.tema))];
  return '<div class="pt"><header class="pt-mast"><div class="pt-mt"><span>Edição de '+esc(fmtD(H.edicao))+'</span><span>'+I.length+' notícias · '+H.veiculos.length+' veículos acompanhados</span></div><h1 class="pt-logo" style="font-size:clamp(40px,7vw,84px)">Hub de notícias</h1><p class="pt-slogan">O que a imprensa publicou hoje sobre política e Justiça, e o que o dossiê tem a dizer sobre cada notícia.</p></header>'+
  '<div class="hb-how"><div><b>1. Curadoria</b>Notícias do dia dos veículos abaixo, resumidas com palavras nossas e com link para o original.</div><div><b>2. Auditoria</b>Cada notícia é comparada com os registros do dossiê e recebe um selo.</div><div><b>3. Registro</b>Fato novo só entra no dossiê depois de conferido, na rodada seguinte.</div></div>'+
  '<div class="pt-sh"><span>Selos desta edição</span></div>'+bar+hubKey()+
  temas.map(t=>'<div class="pt-sh"><span>'+esc(t)+'</span></div><div class="hb-list">'+I.filter(x=>x.tema===t).map(x=>hubItem(x)).join('')+'</div>').join('')+
  '<div class="pt-sh"><span>Cobertura por veículo nesta edição</span></div><p class="pn-cap" style="margin-bottom:10px">Número de notícias lidas de cada veículo. Zero quer dizer que o veículo não foi lido nesta edição, não que ele não publicou nada.</p><div class="hb-cov">'+cov+'</div>'+
  '<p class="foot" style="margin-top:22px">'+esc(H.nota)+' Os títulos são resumos do Desmentindo, não cópia do veículo. O selo avalia a notícia contra o dossiê; não é juízo sobre o veículo nem sobre as pessoas citadas.</p></div>'}
function hubHome(){const I=HUB.itens.slice().sort((a,b)=>b.d.localeCompare(a.d)).filter(x=>x.selo!=='fora').slice(0,3);if(!I.length)return '';
  return '<div class="pt-sh"><span>Hoje na imprensa · auditado</span><a href="#/noticias">Hub de notícias →</a></div><div class="hb-home">'+I.map(x=>hubItem(x,true)).join('')+'</div><p class="pt-key">Selo = o que o dossiê diz sobre a notícia. '+['confere','parcial','novo'].map(k=>hubSel(k)+' '+esc(HSELO[k][1].split('.')[0].toLowerCase())+'.').join(' ')+'</p>'}
```
3. `VIEWS`: adicione `['noticias','Hub de notícias']` depois de `['home','Início']`. `VIEWFN`: `noticias:vHub`. Em `renderMain`: `showBar` falso para `noticias` e `noticias` na lista de `solo`.
4. Em `vHome()`, antes de `sh('Em destaque')+`, adicione `hubHome()+`.

CSS (adicionar no fim):
```css
/* ===== Hub de notícias ===== */
.hb-how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:2px solid var(--rule)}
.hb-how div{padding:0 18px 16px;border-left:2px solid var(--rule);font-size:14px;line-height:1.45}.hb-how div:first-child{border-left:0;padding-left:0}
.hb-how b{display:block;font-size:16px;font-weight:800;margin-bottom:2px}
.hb-selo{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;line-height:1.3;white-space:nowrap}
.s-confere{background:var(--ok);color:var(--on-ok)}.s-parcial{background:var(--fp);color:var(--on-fp)}.s-novo{background:var(--accent);color:#fff}.s-diverge{background:var(--text);color:var(--al-fill)}.s-alegacao{background:var(--al-fill);color:var(--on-al)}.s-fora{background:transparent;color:var(--mute);box-shadow:inset 0 0 0 2px var(--line)}
.pn-leg .sw.s-fora{box-shadow:inset 0 0 0 2px var(--line)}
.hb-bar{display:flex;gap:2px;height:30px;margin-bottom:8px}.hb-bar i{display:block;height:100%}
.hb-key{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 24px;margin-top:14px}
.hb-key div{display:flex;flex-direction:column;align-items:flex-start;gap:4px;font-size:12.5px;color:var(--mute);line-height:1.4}
.hb-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px}
.hb-it{display:flex;flex-direction:column;gap:8px;padding:14px 0 18px;border-bottom:1px solid var(--line);min-width:0}
.hb-src{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;font-size:12px;color:var(--mute)}
.hb-src b{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text)}
.hb-t{font-size:20px;font-weight:800;line-height:1.18;letter-spacing:-.015em;color:var(--text);text-decoration:none;text-wrap:pretty}
.hb-t:hover{color:var(--accent-ink);text-decoration:underline}
.hb-t::after{content:" ↗";font-size:.7em;color:var(--mute)}
.hb-aud{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:10px 12px;background:var(--panel);box-shadow:inset 4px 0 0 var(--accent)}
.hb-lab{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);width:100%}
.hb-tp{font-size:12px;font-weight:700;color:var(--mute)}
.hb-aud p{width:100%;margin:0;font-size:14px;line-height:1.45}
.hb-ev{display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;width:100%;font-size:12.5px}
.hb-ev>span{color:var(--mute);font-weight:600}
.hb-ev a{font-weight:700;color:var(--accent-ink)}
.hb-home{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.hb-it.c{border-bottom:0;padding-top:0}.hb-it.c .hb-t{font-size:17px}.hb-it.c .hb-aud p{font-size:13px}
.hb-cov{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));border-top:2px solid var(--text)}
.hb-cv{display:flex;flex-direction:column;gap:2px;padding:10px 12px 12px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--text)}
.hb-cv b{font-size:30px;font-weight:800;line-height:1}.hb-cv span{font-size:13px;font-weight:600}
.hb-cv.z b,.hb-cv.z span{color:var(--mute)}.hb-cv:hover span{color:var(--accent-ink);text-decoration:underline}
@media (max-width:900px){.hb-list,.hb-home{grid-template-columns:minmax(0,1fr)}.hb-key{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.hb-how{grid-template-columns:minmax(0,1fr)}.hb-how div{border-left:0;padding-left:0}.hb-key{grid-template-columns:minmax(0,1fr)}}
```

A rotina diária que gera o JSON está em `handoff/ROTINA-hub-noticias.md`.

## 9. Auditoria de narrativas, rodapé "Sobre esta aba" e Segundo cérebro

### 9a. Auditoria de narrativas
Página nova, na ordem: título + 1 frase → **Nova auditoria** (a bancada `nwHtml()`, a mesma da Início) → **Auditorias feitas**: um cartão-resumo por narrativa (título, origem, barra de status com legenda ao lado, frase "Em resumo" e botões "Ver o infográfico refeito", "O que cada status quer dizer", "Baixar JSON") → detalhes recolhidos (`<details>`) com a auditoria completa e a legenda dos status → **Sobre esta aba** (texto de abertura, regra de ouro, como funciona, salvaguardas).

Substitua a função `vNarr()` inteira por:
```js
function vNarr(){
  const N=NR.narrativas[0];if(!N)return '<h1>Auditoria de narrativas</h1><div class="empty">Sem dados nesta versão.</div>';
  const cs=NR.claims,cnt={};cs.forEach(c=>{cnt[c.status]=(cnt[c.status]||0)+1});
  const saltos=cs.filter(c=>c.salto),saltosNC=saltos.filter(c=>c.status==='nao_comprovado').length;
  const tiles=STORD.filter(k=>cnt[k]).map(k=>`<div class="nrtile st-${k}"><b>${cnt[k]}</b><span>${esc(NR.status[k])}</span></div>`).join('');
  const nEv=new Set(cs.flatMap(c=>c.ev||[])).size;
  const leg=STORD.map(k=>`<tr><td class="tx"><span class="pill st-${k}">${esc(NR.status[k])}</span></td><td class="tx" style="font-size:13.5px">${esc(STDEF[k])}</td></tr>`).join('');
  const legc=['alta','media','baixa'].map(k=>`<tr><td class="tx"><span class="pill cf-${k}">confiança ${esc(NR.confianca[k].toLowerCase())}</span></td><td class="tx" style="font-size:13.5px">${esc(CFDEF[k])}</td></tr>`).join('');
  const TP=Object.entries(NR.tipos).map(([k,v])=>`<span class="pill">${esc(v)}</span>`).join(' ');
  const pipe=[['Ingestão','Texto, link, imagem, vídeo ou transcrição entram no mesmo formato em que foram publicados. A origem (quem publicou) é guardada só como proveniência, nunca como critério.'],['Extração','Entidades, relações, datas e valores são lidos da peça, sem juízo.'],['Decomposição','Cada seta, frase ou sobreposição visual vira uma afirmação atômica: sujeito, relação, objeto, data, tipo (fato, alegação, inferência, investigação, conclusão judicial, opinião).'],['Investigação','Para cada afirmação: busca de fonte primária, busca de origem da informação (fonte → fonte original → documento → evento) e busca ativa de contradição.'],['Classificação','Status e confiança são atribuídos separadamente, com o raciocínio escrito, o que a evidência prova e o que não prova.'],['Grafo','As afirmações viram arestas datadas entre entidades que já existem no Dossiê (pessoas, eventos, casos, fontes). Não se cria sistema paralelo.'],['Apresentação','A saída volta no formato da entrada (aqui, o infográfico refeito), com cada aresta clicável até a evidência.']].map((p,i)=>`<li><b>${i+1}. ${esc(p[0])}.</b> ${esc(p[1])}</li>`).join('');
  const saf=[['Culpa por associação','Vínculo documentado nunca é convertido em responsabilidade. Toda seta que resume uma cadeia é marcada como salto e avaliada à parte.'],['Viés de confirmação','A busca por contradição é obrigatória e registrada em cada afirmação, inclusive quando não encontra nada.'],['Lavagem de fonte','Cada evidência guarda a origem informacional declarada. Reportagem que cita outra reportagem não sobe de nível.'],['Circularidade','Réplicas do mesmo original são contadas como uma origem só. Repetição não é corroboração.'],['Falácia temporal','Cada afirmação tem validade (de/até). Fato posterior não retroage para explicar fato anterior.'],['Duplicação de evidência','Uma evidência que aparece em duas afirmações é sinalizada, para não contar duas vezes.'],['Inferência apresentada como fato','O tipo da afirmação é obrigatório e visível. Inferência nunca herda o status dos elos que a compõem.']].map(s=>`<tr><td class="tx"><b>${esc(s[0])}</b></td><td class="tx" style="font-size:13.5px">${esc(s[1])}</td></tr>`).join('');
  const gv=(D.gv||[]).length;
  return `<h1>Auditoria de narrativas</h1>
  <p class="nr-sub">Cole uma peça (imagem, texto, vídeo ou tabela) e veja, afirmação por afirmação, o que tem registro e o que não tem.</p>
  <section class="nr-new"><div class="nr-newh"><span class="nr-step">Nova auditoria</span></div>${nwHtml()}</section>
  <div class="pt-sh"><span>Auditorias feitas</span><em class="nr-cnt">${NR.narrativas.length}</em></div>
  <div class="nr-list">${NR.narrativas.map(n=>{const c=NR.claims,k={};c.forEach(x=>k[x.status]=(k[x.status]||0)+1);const sj=c.filter(x=>x.salto);
    return '<article class="nr-sum"><div class="nr-sm"><span class="mono">'+esc(n.id)+'</span> · '+esc(n.formato)+' · '+esc(n.veiculo)+' · status de '+esc(fmtD(NR.atualizado))+'</div>'+
    '<h3>'+esc(n.titulo)+'</h3><p class="nr-res">'+esc(n.resumo)+'</p>'+
    '<div class="pt-mini" style="height:26px">'+STORD.filter(s=>k[s]).map(s=>'<i class="w-'+s+'" style="flex:'+k[s]+'" title="'+esc(NR.status[s])+': '+k[s]+'"></i>').join('')+'</div>'+
    '<div class="pt-lg">'+STORD.filter(s=>k[s]).map(s=>'<span><i class="w-'+s+'"></i>'+esc(NR.status[s])+' <b>'+k[s]+'</b></span>').join('')+'</div>'+
    '<p class="nr-verd"><b>Em resumo:</b> das '+c.length+' afirmações, '+(k.documentado||0)+' têm registro e '+(k.nao_comprovado||0)+' não foram comprovadas. As '+sj.length+' setas que ligam tudo a '+esc(n.alvo)+' são conclusões da peça, não fatos: '+sj.filter(x=>x.status==='nao_comprovado').length+' delas não têm evidência própria.</p>'+
    '<div class="nr-act"><button class="btn" data-nrmore="det">Ver o infográfico refeito</button><button class="btn ghost" data-nrmore="leg">O que cada status quer dizer</button><button class="btn ghost" data-nw="json">Baixar JSON</button></div></article>'}).join('')}</div>
  <details class="nr-det" id="nr-det"><summary>Auditoria completa: ${esc(N.titulo)}</summary>
  <h2>O infográfico, refeito com status por elo</h2>
  <p class="mute" style="font-size:13.5px">Cada linha mostra a cadeia desenhada na narrativa e, abaixo, o que cada elo afirma. Clique numa afirmação para ver evidências, limites e histórico. A seta tracejada final é o salto: o que a narrativa desenha como conclusão.</p>
  <div class="nrgrid">${N.blocos.map(b=>nrBlock(b,N.alvo)).join('')}</div>
  <h3 style="margin-top:18px">A afirmação global</h3>${nrRow(N.global_claim)}
  <div class="nao"><b>Aviso metodológico</b>A existência de um vínculo documentado entre entidades não implica responsabilidade pelos atos atribuídos às demais entidades. Cada afirmação e cada relação é avaliada individualmente. Este quadro reflete as fontes lidas até 24/09/2026, em geral resumos de páginas (E1 e E2); documentos primários ainda não foram abertos. Investigações em curso podem mudar o quadro em qualquer direção.</div>
  
  </details>
  <details class="nr-det" id="nr-leg"><summary>O que cada status quer dizer</summary>
  
  <div class="ctw"><table class="ct"><tbody>${leg}</tbody></table></div>
  <h3 style="margin-top:14px">Confiança (separada do status)</h3>
  <div class="ctw"><table class="ct"><tbody>${legc}</tbody></table></div>
  <p class="mute" style="font-size:13px;margin-top:8px">Tipos de afirmação: ${TP}. Hierarquia de evidência: documento primário &gt; secundário que cita documento &gt; narrativa. Escala E0 a E5 em “Glossário e método”.</p>
  
  </details>
  <section class="ab-sobre"><h2>Sobre esta aba</h2>
  <p class="lead" style="font-size:15.5px">Entregue ao Dossiê uma narrativa (texto, imagem, vídeo, discurso) e pergunte: <b>o que sabemos, o que não sabemos e exatamente por quê</b>. A narrativa é decomposta em afirmações atômicas. Cada afirmação recebe o seu próprio status, com a evidência que a sustenta, o que ela prova e o que não prova.</p>
  <div class="note8" style="margin:12px 0"><b>Regra de ouro: uma seta não é prova.</b> O status pertence à afirmação e ao elo, nunca à pessoa. A mesma régua vale para qualquer origem: esquerda, direita, governo, oposição, imprensa, influenciadores, autoridades ou este próprio dossiê. A pergunta é sempre “o que exatamente se afirma e que evidência sustenta”; quem afirma serve só de proveniência.</div>
  
  <h2>Como funciona</h2>
  <ol class="nrpipe">${pipe}</ol>
  <h3 style="margin-top:16px">Salvaguardas contra os erros mais comuns</h3>
  <div class="ctw"><table class="ct"><tbody>${saf}</tbody></table></div>
  <details class="more"><summary>O que a máquina faz e o que exige revisão humana</summary><div class="nrsplit"><div><b>Automatizável, com conferência</b><ul><li>Transcrever e segmentar vídeos e textos.</li><li>Extrair entidades, datas, valores e citações.</li><li>Propor a decomposição em afirmações atômicas.</li><li>Buscar fontes candidatas e rastrear réplicas do mesmo original.</li><li>Cruzar com eventos, pessoas e casos já no Dossiê.</li><li>Detectar duplicação de evidência e inconsistência de datas.</li></ul></div><div><b>Exige revisão humana</b><ul><li>Abrir e ler o documento primário (decisão, denúncia, registro oficial).</li><li>Decidir o status e a confiança de cada afirmação.</li><li>Separar fato, inferência e opinião em textos ambíguos.</li><li>Avaliar homonímia, contexto e ironia.</li><li>Qualquer afirmação que nomeie pessoa real, antes de circular.</li></ul></div></div></details>
  <details class="more"><summary>Como se liga ao resto do Dossiê</summary><ul style="margin:8px 0 0 20px;display:grid;gap:6px"><li><b>Eventos e fontes.</b> Uma afirmação aponta para eventos (EV) e fontes (S) já registrados, hoje ${D.ev.length} eventos. Não há segunda base.</li><li><b>Pessoas e casos.</b> Sujeito e objeto de cada afirmação são as mesmas entidades das fichas. <button class="pill k" data-goto-v="rede">Vínculos e hipóteses</button> guarda a rede; aqui fica o status de cada aresta.</li><li><b>Corpus Alexandre Garcia.</b> O caminho previsto é vídeo → transcrição → trechos → afirmações → entidades → eventos → evidência → checagem → grafo. Hoje ${gv} vídeos estão indexados em <button class="pill k" data-goto-v="garcia">Comparativo Garcia</button>; as afirmações ainda não foram extraídas.</li><li><b>Política de estados de dados.</b> O histórico de versões de cada afirmação é acrescentado, nunca reescrito, para reconstruir por que uma classificação foi dada numa data.</li></ul></details>
  <details class="more"><summary>Limites desta primeira versão</summary><ul style="margin:8px 0 0 20px;display:grid;gap:6px"><li>Há uma única narrativa auditada, escolhida como caso de teste do método.</li><li>Das 17 fontes, 9 são resumos de páginas lidas em 24/09/2026 (E1 e E2), 5 já estavam registradas no Dossiê e 3 são apenas título de busca (E0).</li><li>Nenhum documento primário novo foi aberto: denúncia do MPRJ, relatório da PF, registros da Alerj e da Receita seguem pendentes e estão listados em cada afirmação.</li><li>Elos marcados “ainda não avaliado” não foram checados; aparecem para não parecerem verificados.</li><li>Os status e as confianças foram atribuídos por quem construiu o Dossiê e não passaram por revisão externa. Há pessoas reais citadas: recomenda-se revisão jurídica antes de ampla divulgação.</li></ul></details>
  </section>`}
function clDrawer(c){
  const N=NR.narrativas[0],ev=(c.ev||[]).filter(id=>byId[id]);
  const fs=(c.fontes||[]).map(f=>`<div class="src"><a href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener noreferrer">${esc(f.titulo)}</a><div class="k mute" style="font-size:12.5px"><span class="mono">${esc(f.id)}</span> · ${esc(f.veiculo)} · ${esc(f.tipo.replace(/_/g,' '))} · <span class="pill ev" title="${esc(NV[f.nivel]||'')}">${esc(f.nivel)}</span></div><div class="quote"><b>Origem declarada:</b> ${esc(f.origem_informacional)}<br><b>Leitura:</b> ${esc(f.leitura)}</div></div>`).join('')||'<p class="mute">Nenhuma fonte associada: a afirmação é o que a narrativa desenha, sem evidência própria.</p>';
  const rp=c.replicas||{};
  const hist=(c.historico||[]).slice().reverse().map(h=>`<tr><td class="tx">v${h.v}</td><td class="tx">${esc(fmtD(h.data))}</td><td class="tx">${esc(NR.status[h.status]||h.status)} · ${esc((NR.confianca[h.confianca]||h.confianca).toLowerCase())}</td><td class="tx" style="font-size:13px">${esc(h.motivo)}</td></tr>`).join('');
  const vig=c.valid_from||c.valid_to?`${esc(c.valid_from?fmtD(c.valid_from):'?')} a ${esc(c.valid_to?fmtD(c.valid_to):'em aberto')}`:'não determinada';
  return `<div class="dh"><div class="tt"><div class="k"><span class="mono">${esc(c.id)}</span> · afirmação da narrativa ${esc(c.narr||N.id)}${c.narr&&c.narr!==N.id?' · triagem automática':''}</div><h2>${esc(c.texto)}</h2>
   <div class="rch" style="margin-top:8px">${stPill(c)}${cfPill(c)}<span class="pill">${esc(NR.tipos[c.tipo_afirmacao]||c.tipo_afirmacao)}</span>${c.salto?'<span class="pill al">salto entre elos</span>':''}</div>
   <div class="nrtrip"><span>${esc(c.sujeito)}</span><i>${esc(PRED[c.predicado]||c.predicado)}</i><span>${esc(c.objeto)}</span></div></div>
   <button class="ibtn" data-dclose aria-label="Fechar">Fechar</button></div>
  <div class="db">
   ${c.narr&&c.narr!==N.id&&c.historico&&c.historico[0]&&/riagem/.test(c.historico[0].motivo||'')?'<div class="nao"><b>Triagem automática</b>Classificação feita na página só com registros do Dossiê, sem navegar na web e sem abrir documentos. Requer revisão humana.</div>':''}
   <h4>Por que este status</h4><p>${esc(c.raciocinio)}</p>
   <h4>O que a evidência comprova</h4><p>${esc(c.comprova)}</p>
   <div class="nao"><b>O que a evidência não comprova</b>${esc(c.nao_comprova)}</div>
   ${c.cl_ref&&CLB[c.cl_ref]?`<h4>Afirmação equivalente já auditada</h4><div class="plist"><button class="pl" data-cl="${esc(c.cl_ref)}"><b>${esc(c.cl_ref)}</b> · ${esc(NR.status[CLB[c.cl_ref].status]||'')}<br>${esc(CLB[c.cl_ref].texto)}</button></div>`:''}
   <h4>Vigência</h4><p>${vig}</p>
   <h4>Evidências (${(c.fontes||[]).length})</h4>${fs}
   <h4>Replicação</h4><p>${rp.n?`Origem informacional: ${esc(rp.origem)}. ${rp.n} reprodução(ões) localizada(s)${rp.exemplos&&rp.exemplos.length?' ('+esc(rp.exemplos.join(', '))+')':''}. <b>Repetição não é corroboração:</b> as réplicas contam como uma origem só.`:`Origem informacional: ${esc(rp.origem||'não identificada')}. Nenhuma réplica contada.`}</p>
   ${c.versao_citado?`<h4>Versão do citado</h4><p>${esc(c.versao_citado)}</p>`:'<h4>Versão do citado</h4><p class="mute">Não localizada nas fontes lidas.</p>'}
   <h4>Busca feita</h4><p><b>A favor:</b> ${esc((c.busca||{}).suporte||'')}<br><b>Contra:</b> ${esc((c.busca||{}).contraria||'')}</p>
   ${c.limites?`<h4>Limites</h4><p>${esc(c.limites)}</p>`:''}
   ${c.pendencias&&c.pendencias.length?`<h4>Pendências</h4>${li(c.pendencias)}`:''}
   ${ev.length?`<h4>Eventos do Dossiê ligados</h4><div class="plist">${ev.map(id=>{const e=byId[id];return `<button class="pl" data-ev="${esc(id)}"><b>${esc(dateOf(e))}</b> · ${e.nat==='alegacao_atribuida'?'alegação':'documentado'} · ${esc(e.nv)}<br>${esc(headline(e))}</button>`}).join('')}</div>`:''}
   <h4>Histórico de versões</h4><div class="ctw"><table class="ct"><tbody>${hist}</tbody></table></div><p class="mute" style="font-size:12.5px">Última verificação: ${esc(fmtD(c.ultima_verificacao))}. O histórico só é acrescentado, nunca reescrito.</p>
   <div class="nao"><b>Aviso</b>A existência de um vínculo documentado entre entidades não implica responsabilidade pelos atos atribuídos às demais entidades. Cada afirmação e relação é avaliada individualmente.</div>
  </div>`}
```
Em `nwOutHtml()`, logo após `if(!N)return '';`, adicione:
```js
if(N.origem==='exemplo'&&S.view==='narrativas')return '';
```
No handler global de clique, antes de `if((x=t.closest('[data-goto-v]'))){`:
```js
if((x=t.closest('[data-nrmore]'))){const d=document.getElementById('nr-'+x.dataset.nrmore);if(d){d.open=true;window.scrollTo({top:d.getBoundingClientRect().top+scrollY-(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hh'))||100)-10,behavior:'smooth'})}return}
```

### 9b. Rodapé "Sobre esta aba" (todas as abas, exceto Início e Hub)
Os textos que explicam a aba (os `p.lead` e `.note8` que ficam antes do primeiro `h2`) vão para uma seção **Sobre esta aba** no fim da página, antes do `.foot`. Legendas de gráfico e tabela continuam ao lado do gráfico (premissa do projeto). Em `renderMain()`, logo antes de `const so=$('#sort');`:
```js
if(S.view!=='home'&&S.view!=='noticias'){const M=$('#main'),mv=[];for(const el of M.children){if(el.matches('h2,.foot,.ab-sobre,section,details'))break;if(el.matches('p.lead,.note8'))mv.push(el)}if(mv.length){let sb=M.querySelector(':scope > .ab-sobre');if(!sb){sb=document.createElement('section');sb.className='ab-sobre';sb.innerHTML='<h2>Sobre esta aba</h2>';M.insertBefore(sb,M.querySelector(':scope > .foot'))}const h2=sb.querySelector('h2');let ref=h2.nextSibling;mv.forEach(e=>sb.insertBefore(e,ref))}}
```

### 9c. Segundo cérebro abre com um tema selecionado
Abre direto no tema com mais eventos (hoje, Compliance Zero / Master), em grafo local de profundidade 2, com uma fila de temas acima para trocar e o botão "Grafo completo". No início de `vCerebro()`:
```js
if(!B.started&&!S.n){const t0=brainThemes()[0];if(t0){B.started=true;B.local=true;B.depth=2;S.n='k:'+t0.c}}
```
E, logo antes do `return \`<div class="btabs"…`:
```js
const cur=S.n&&S.n.startsWith('k:')?S.n.slice(2):null;const thr='<div class="bthemes"><span>Tema:</span>'+brainThemes().slice(0,10).map(t=>'<button class="chip" data-btheme="'+esc(t.c)+'" aria-pressed="'+(cur===t.c)+'">'+esc(D.caso_lbl[t.c]||t.c)+' <span class="n">'+t.n+'</span></button>').join('')+'<button class="chip" data-bz="all">Grafo completo</button></div>';
```
e prefixe o retorno com `thr+`.

CSS (adicionar no fim):
```css
/* ===== Narrativas, rodapé das abas, cérebro ===== */
.nr-sub{font-size:17px;font-weight:500;max-width:62ch;margin:6px 0 18px}
.nr-new{border-top:4px solid var(--accent);padding-top:10px}
.nr-new h2{border-top:0!important;padding-top:0!important;margin-top:4px}
.nr-step{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink)}
.nr-cnt{font-style:normal;font-size:14px;font-weight:800}
.nr-list{display:grid;gap:18px}
.nr-sum{display:flex;flex-direction:column;gap:10px;padding-bottom:18px;border-bottom:2px solid var(--rule)}
.nr-sm{font-size:12.5px;color:var(--mute)}
.nr-sum h3{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0}
.nr-res{font-size:15px;max-width:70ch;margin:0}
.nr-verd{font-size:15px;line-height:1.5;max-width:70ch;margin:0;padding:10px 12px;background:var(--panel);box-shadow:inset 4px 0 0 var(--accent)}
.nr-act{display:flex;flex-wrap:wrap;gap:8px}
.nr-det{margin-top:18px;border-top:2px solid var(--text)}
.nr-det>summary{cursor:pointer;font-size:17px;font-weight:800;padding:12px 0;list-style:none}
.nr-det>summary::before{content:"+ ";color:var(--accent)}
.nr-det[open]>summary::before{content:"– "}
.ab-sobre{margin-top:40px;padding-top:4px;border-top:4px solid var(--text);font-size:14.5px}
#main .ab-sobre>h2{border-top:0;padding-top:8px;font-size:14px;letter-spacing:.08em;text-transform:uppercase}
.ab-sobre p.lead{font-size:15px!important;max-width:75ch}
.bthemes{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}
.bthemes>span{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}
```

## 10. Gaveta do evento em blocos agrupados e coloridos
Ao clicar num item, a gaveta mostra:
- **Cabeçalho:** ID, data, título, etiqueta Fato/Alegação, nível de evidência e fichas.
- **Resumo:** o texto principal cortado em 4 linhas, com "Ler tudo"; resultado e alcance lado a lado; "O que isto não significa".
- **Saiba mais:** 6 blocos-resumo coloridos com o dado principal (ex.: "1 de 5 · Confiabilidade", "31 · Opinião"). Clicar abre o bloco e rola até ele.
- **Blocos recolhidos**, cada um com a sua cor (barra à esquerda e fundo levemente tingido):
  - Quem e onde: azul (documentado).
  - Versões: amarelo (alegação e resposta).
  - Confiabilidade: verde.
  - Fontes: azul-claro.
  - Opinião e mídia: cinza.
  - Ligações: ouro.

Substitua `evDrawer(e)` inteira por:
```js
function evDrawer(e){
  const votes=e.votos&&e.votos.length?`<h4>Votos${e.plac?' · placar':''}</h4>${e.plac?`<p>${esc(e.plac)}</p>`:''}<table class="votes"><tbody>${e.votos.map(v=>`<tr><td>${esc(v[0])}</td><td>${esc(v[1])}</td></tr>`).join('')}</tbody></table>`:'';
  const al=e.nat==='alegacao_atribuida';
  const NVS={E0:'sem fonte lida',E1:'fraca: resumo ou uma só reportagem',E2:'limitada: reportagem com detalhe',E3:'média: fonte institucional',E4:'forte: documento oficial',E5:'muito forte: documento primário'};
  const blk=(id,t,sub,body,open)=>body&&body.trim()?`<details class="dz c-${id}" id="dz-${id}"${open?' open':''}><summary><span class="dz-t">${t}</span>${sub?`<span class="dz-s">${sub}</span>`:''}</summary><div class="dz-b">${body}</div></details>`:'';
  const quem=[
    e.pap&&e.pap.length?`<p><b>Papel no registro:</b> ${esc(e.pap.map(x=>x.replace(/_/g,' ')).join(', '))}</p>`:'',
    e.ag&&e.ag.length?`<p><b>Quem assinou o ato:</b> ${esc(e.ag.join(', '))}. Ato formal registrado; não se infere motivação.</p>`:'',
    e.cg&&e.cg.length?`<h4>Cargo e partido à época</h4><ul>${e.cg.map(x=>x.c?`<li><b>${esc(x.n)}</b>: ${esc(x.c)}${x.o?', '+esc(x.o):''}${x.p?' · '+esc(x.p):x.pa?' · partido atual na fonte: '+esc(x.pa)+' (partido à época não verificado)':' · partido não consta na fonte'} <a href="${esc(safeUrl(x.s))}" target="_blank" rel="noopener noreferrer">fonte</a></li>`:`<li><b>${esc(x.n)}</b>: <span class="mute">não verificado</span></li>`).join('')}</ul>`:'',
    `<h4>Caso</h4><div class="rch">${e.c.map(k=>`<button class="pill k" data-caso="${esc(k)}">${esc(D.caso_lbl[k]||k)} →</button>`).join('')}</div>`,
    e.m.length?`<h4>Mecanismo processual</h4><div class="rch">${e.m.map(k=>`<button class="pill k" data-goto-m="${k}">${esc(D.mec.find(m=>m.k===k).nome)}</button>`).join('')}</div>`:'',
    e.l.length?`<h4>Poder ou setor</h4><div class="rch">${e.l.map(k=>`<span class="pill">${esc(LAYN[k])}</span>`).join('')}</div>`:''
  ].join('');
  const vers=[
    e.alde?`<div class="dz-v a"><b>Quem afirma</b><p>${esc(e.alde)}</p></div>`:'',
    e.resp?`<div class="dz-v r"><b>O que a pessoa responde</b><p>${esc(e.resp)}</p></div>`:e.rsp0?`<div class="dz-v r"><b>O que a pessoa responde</b><p class="mute">Resposta não localizada na fonte lida.</p></div>`:'',
    e.dm&&e.dm!==e.desc?`<div class="dz-v"><b>Posição dos ministros</b><p>${esc(e.dm)}</p></div>`:'',
    votes
  ].join('');
  const nCon=(e.contr||[]).length,nPen=(e.pend||[]).length;
  const conf=[
    `<div class="dz-nv"><span class="pill ev">${e.nv}${evb(e.nv)}</span><span><b>Nível de evidência ${e.nv.slice(1)} de 5</b> · ${esc(NVS[e.nv]||'')}</span></div>`,
    e.ver?`<h4>Conferido por outra pessoa</h4><p><span class="pill k">${esc(VER[e.ver.v]||e.ver.v)}</span></p><p>${esc(e.ver.r)}</p>`:'',
    nCon?`<h4>Fontes que divergem (${nCon})</h4>${li(e.contr)}`:'',
    nPen?`<h4>O que ainda falta conferir (${nPen})</h4>${li(e.pend)}`:''
  ].join('');
  const fon=e.fontes.map(srcHtml).join('')||'<p class="mute">Sem fonte registrada.</p>';
  const gz=opEv(e,'g'),oe=opEv(e,'o'),ga=garciaEv(e);
  const cntOp=s=>{const m=(s||'').match(/\((\d+) textos?\)/);return m?+m[1]:0};
  const nOp=cntOp(gz)+cntOp(oe);
  const opi=`<p class="dz-warn">Opinião de veículos e comentaristas. Não é fato e não confirma nem desmente o registro.</p>${ga}${gz}${oe}`;
  const prs=PR.filter(p=>p.ev.includes(e.id));
  const lig=prs.length?`<p class="mute" style="font-size:13px">Cada par é o status do vínculo entre uma pessoa e um caso no dossiê.</p><div class="plist">${prs.map(p=>`<button class="pl" data-par="${p.i}">${esc(p.p)} × ${esc(D.caso_lbl[p.c])} · ${GL[p.g]}</button>`).join('')}</div>`:'';
  const ns=[...new Set([e.p,...(e.env||[])].filter(x=>x&&D.aud[x]).concat(D.cit.filter(c=>c.ev.includes(e.id)).map(c=>c.n)))];
  const nvN=+e.nv.slice(1);const idx=[['quem','Quem e onde',(e.c.length)+' caso'+(e.c.length>1?'s':'')],vers.trim()?['ver','Versões',(e.alde?'acusação':'')+(e.alde&&(e.resp||e.rsp0)?' + ':'')+(e.resp?'resposta':e.rsp0?'sem resposta':'')||'votos']:null,['conf','Confiabilidade',nvN+' de 5'],['fon','Fontes',String(e.fontes.length)],['op','Opinião',String(nOp)],prs.length?['lig','Ligações',String(prs.length)]:null].filter(Boolean);
  const confSub=[e.nv,e.ver?'conferido':'',nCon?nCon+' divergência'+(nCon>1?'s':''):'',nPen?nPen+' pendência'+(nPen>1?'s':''):''].filter(Boolean).join(' · ');
  return `<div class="dh"><div class="tt"><div class="k"><span class="mono">${e.id}</span> · ${esc(dateOf(e))}</div><h2>${esc(pname(e))} · ${esc(e.c.map(c=>D.caso_lbl[c]||c).join(', '))}</h2>
    <div class="rch" style="margin-top:8px"><span class="pt-tag ${al?'al':'ok'}">${al?'Alegação atribuída':'Fato documentado'}</span><span class="pill ev" title="${esc(NV[e.nv]||'')}">${e.nv}${evb(e.nv)}</span><span class="pill">${esc(CAT[e.cat]||'Contexto do caso')}</span>${e.proc?`<span class="pill">${esc(e.proc)}</span>`:''}</div>
    ${ns.length?`<div class="rch" style="margin-top:8px"><span class="mute" style="font-size:12.5px">Fichas:</span>${ns.slice(0,8).map(x=>`<button class="lkb pe" data-pes="${esc(x)}">${esc(x)}</button>`).join('')}${ns.length>8?`<span class="mute" style="font-size:12.5px">+${ns.length-8}</span>`:''}</div>`:''}
    </div>
    <button class="ibtn" data-dclose aria-label="Fechar">Fechar</button></div>
  <div class="db">
    <section class="dz-res" id="dz-res">
      <div class="dz-lab">${al?'O que se alega':'O que aconteceu'}</div><p class="dz-main" id="dz-main">${esc(e.desc)}</p>${(e.desc||'').length>260?'<button class="dz-more" data-dzmore>Ler tudo</button>':''}
      ${e.res||e.alc?`<div class="dz-ra">${e.res?`<div><div class="dz-lab">Resultado</div><p>${esc(e.res)}</p></div>`:''}${e.alc?`<div><div class="dz-lab">Alcance</div><p>${esc(e.alc)}</p></div>`:''}</div>`:''}
      <div class="nao"><b>O que isto não significa</b>${esc(naoOf(e))}</div>
    </section>
    <div class="dz-lab" style="margin-top:18px">Saiba mais</div>
    <nav class="dz-tiles" aria-label="Blocos desta ficha">${idx.map(([k,l,v])=>`<button class="c-${k}" data-dz="${k}"><b>${esc(v)}</b><span>${esc(l)}</span></button>`).join('')}</nav>
    ${blk('quem','Quem e onde','pessoas, cargo, caso e mecanismo',quem,false)}
    ${blk('ver','Versões','quem afirma, quem responde e como votaram',vers,false)}
    ${blk('conf','Confiabilidade',confSub,conf,false)}
    ${blk('fon','Fontes',e.fontes.length+' fonte'+(e.fontes.length!==1?'s':''),fon,false)}
    ${blk('op','Opinião e mídia',(nOp?nOp+' textos de opinião · ':'')+'Garcia, Gazeta, Oeste',opi,false)}
    ${blk('lig','Ligações no dossiê',prs.length+' par'+(prs.length!==1?'es':'')+' pessoa × caso',lig,false)}
  </div>`}
```
No handler global de clique, antes de `if((x=t.closest('[data-nrmore]'))){`:
```js
if(t.closest('[data-dzmore]')){const m=$('#dz-main');if(m){const o=m.classList.toggle('open');t.closest('[data-dzmore]').textContent=o?'Mostrar menos':'Ler tudo'}return}
if((x=t.closest('[data-dz]'))){const d=document.getElementById('dz-'+x.dataset.dz),db=$('#drawer .db');if(d&&db){if(d.tagName==='DETAILS')d.open=true;db.scrollTo({top:d.offsetTop-db.offsetTop-8,behavior:'smooth'})}return}
```
CSS (adicionar no fim; inclui "Gaveta em blocos" e "Gaveta: cores por bloco"):
```css
/* ===== Gaveta em blocos ===== */
.dz-idx{display:flex;flex-wrap:wrap;gap:4px;margin-top:12px}
.dz-idx button{font-size:12.5px;font-weight:700;padding:4px 10px;border:2px solid var(--text);background:transparent;color:var(--text)}
.dz-idx button:hover{background:var(--accent-bg);border-color:var(--accent)}
.db{position:relative}
.dz-res{padding:4px 0 18px;border-bottom:4px solid var(--text)}
.dz-lab{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);margin:12px 0 4px}
.dz-lab:first-child{margin-top:0}
.dz-main{font-size:17px;line-height:1.5}
.dz-res .nao{margin-top:14px}
.dz{border-bottom:2px solid var(--rule)}
.dz>summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;padding:14px 28px 14px 0;position:relative}
.dz>summary::-webkit-details-marker{display:none}
.dz>summary::after{content:"+";position:absolute;right:0;top:10px;font-size:22px;font-weight:800;color:var(--accent)}
.dz[open]>summary::after{content:"–"}
.dz>summary:hover .dz-t{color:var(--accent-ink)}
.dz-t{font-size:17px;font-weight:800;letter-spacing:-.01em}
.dz-s{font-size:12.5px;color:var(--mute)}
.dz-b{padding:0 0 18px}
.dz-b h4:first-child{margin-top:0}
.dz-v{padding:10px 12px;margin:0 0 8px;background:var(--panel)}
.dz-v b{display:block;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}
.dz-v p{margin:0}
.dz-v.a{box-shadow:inset 4px 0 0 var(--al-fill)}.dz-v.r{box-shadow:inset 4px 0 0 var(--ok)}
.dz-nv{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;font-size:14px;margin-bottom:6px}
.dz-warn{font-size:13px;padding:8px 10px;background:var(--panel);box-shadow:inset 4px 0 0 var(--op);margin-bottom:10px}

/* ===== Gaveta: cores por bloco ===== */
.c-quem{--bc:var(--ok)}.c-ver{--bc:var(--al-fill)}.c-conf{--bc:var(--accent)}.c-fon{--bc:var(--e-alivia)}.c-op{--bc:var(--pend)}.c-lig{--bc:var(--e-encerra)}
.dz-main{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin:0}
.dz-main.open{display:block}
.dz-more{font-size:13px;font-weight:700;color:var(--accent-ink);text-decoration:underline;margin-top:4px}
.dz-ra{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:12px}
.dz-ra p{margin:0;font-size:14px}
.dz-res{border-bottom:0!important;padding-bottom:4px!important}
.dz-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:6px 0 18px}
.dz-tiles button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;background:color-mix(in srgb,var(--bc) 14%,var(--bg));border-top:5px solid var(--bc);text-align:left;color:var(--text)}
.dz-tiles button:hover{background:color-mix(in srgb,var(--bc) 26%,var(--bg))}
.dz-tiles b{font-size:18px;font-weight:800;line-height:1.1}
.dz-tiles span{font-size:12.5px;font-weight:600;color:var(--mute)}
.dz{border-bottom:0!important;margin-bottom:8px;background:color-mix(in srgb,var(--bc) 7%,var(--bg));box-shadow:inset 6px 0 0 var(--bc)}
.dz>summary{padding:12px 36px 12px 18px!important}
.dz>summary::after{right:14px!important;color:var(--text)!important}
.dz[open]>summary{background:color-mix(in srgb,var(--bc) 16%,var(--bg))}
.dz-b{padding:14px 16px 16px 18px!important}
.dz-v{background:var(--bg)!important}
.db .nao{margin-top:12px}
@media (max-width:480px){.dz-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
```
Próximo passo: aplicar o mesmo padrão às gavetas de par (pessoa × caso) e de afirmação da auditoria.

## 11. Blocos agrupados e coloridos em toda a plataforma
Mesmo padrão da gaveta do evento (seção 10) aplicado a:
- **Gaveta do vínculo pessoa × caso:** o que o status quer dizer, contagem de documentados e alegações, "o que isto não significa", blocos-resumo e blocos recolhidos (Eventos, Notas da auditoria, Busca). Tem atalhos para a ficha da pessoa e a linha do caso.
- **Gaveta da afirmação (auditoria de narrativas):** por que o status, o que comprova, o que não comprova, blocos-resumo e blocos (Evidências, Versões e busca, Limites e vigência, Ligações, Histórico).
- **Páginas:** cartões (`.card`, `.ent`, `.gh`, `.rdp`, `.rdh`) com barra superior colorida e fundo levemente tingido, alternando verde, amarelo, verde-ação, azul-claro, cinza e ouro. Seções de opinião e perspectiva (`.op`) tingidas pela cor do tipo. Os cartões "Em destaque" da Início e os títulos do painel de números também seguem as cores.

Substitua `parDrawer(p)` e `clDrawer(c)` pelo conteúdo de `handoff/drawers2.js`, que também traz os auxiliares `dzBlk`, `dzTiles` e `dzMain`:
```js
function dzBlk(id,cls,t,sub,body,open){return body&&body.trim()?`<details class="dz c-${cls}" id="dz-${id}"${open?' open':''}><summary><span class="dz-t">${t}</span>${sub?`<span class="dz-s">${sub}</span>`:''}</summary><div class="dz-b">${body}</div></details>`:''}
function dzTiles(a){return `<div class="dz-lab" style="margin-top:18px">Saiba mais</div><nav class="dz-tiles" aria-label="Blocos desta ficha">${a.map(([k,c,l,v])=>`<button class="c-${c}" data-dz="${k}"><b>${esc(v)}</b><span>${esc(l)}</span></button>`).join('')}</nav>`}
function dzMain(t){return `<p class="dz-main" id="dz-main">${esc(t)}</p>${(t||'').length>260?'<button class="dz-more" data-dzmore>Ler tudo</button>':''}`}
function parDrawer(p){
  const evs=p.ev.map(id=>byId[id]).filter(Boolean).sort(ncmp);
  const nd=evs.filter(e=>e.nat!=='alegacao_atribuida').length,na=evs.length-nd;
  const evl=evs.length?`<div class="plist">${evs.map(e=>`<button class="pl" data-ev="${e.id}"><b>${esc(dateOf(e))}</b> · ${e.nat==='alegacao_atribuida'?'alegação':'documentado'} · ${e.nv}<br>${esc(headline(e))}</button>`).join('')}</div>`:'<p class="mute">Nenhum evento lido para este par nesta rodada.</p>';
  const aud=[p.q&&p.q.length?`<h4>Qualificadores</h4>${li(p.q.map(q=>QUAL[q]||q.replace(/_/g,' ')))}`:'',p.notas&&p.notas.length?`<h4>Notas da auditoria</h4>${li(p.notas)}`:''].join('');
  const bus=`<p>${p.nc||0} consulta(s) feita(s); ${p.ncand||0} resultado(s) de busca registrado(s) como candidato (E0, não lido). Candidato não é vínculo.</p>`;
  const t=[['ev','quem','Eventos',evs.length+(na?' ('+na+' alegaç'+(na>1?'ões':'ão')+')':'')],aud.trim()?['aud','conf','Notas da auditoria',String((p.notas||[]).length+(p.q||[]).length)]:null,['bus','op','Busca',(p.nc||0)+' consulta'+((p.nc||0)!==1?'s':'')]].filter(Boolean);
  return `<div class="dh"><div class="tt"><div class="k">Vínculo pessoa × caso</div><h2>${esc(p.p)} × ${esc(D.caso_lbl[p.c])}</h2>
    <div class="rch" style="margin-top:8px"><span class="pt-tag ${p.g==='ok'?'ok':p.g==='al'?'al':'op'}">${GL[p.g]}</span>${p.nv?`<span class="pill ev" title="${esc(NV[p.nv]||'')}">máx. ${p.nv}</span>`:''}${p.st==='falha_tecnica'?'<span class="pill">falha técnica na busca</span>':''}</div>
    <div class="rch" style="margin-top:8px"><button class="lkb pe" data-pes="${esc(p.p)}">Ficha de ${esc(p.p)}</button><button class="lkb pe" data-caso="${esc(p.c)}">Linha do caso</button></div></div>
    <button class="ibtn" data-dclose aria-label="Fechar">Fechar</button></div>
  <div class="db">
    <section class="dz-res"><div class="dz-lab">O que este status quer dizer</div><p class="dz-main open">${esc(GDESC[p.g])}</p>
    <div class="dz-ra"><div><div class="dz-lab">Documentados</div><p class="dz-num">${nd}</p></div><div><div class="dz-lab">Alegações</div><p class="dz-num">${na}</p></div></div>
    <div class="nao"><b>O que isto não significa</b>${(p.g==='ns'||p.g==='pe')?'Que não exista vínculo. Significa que esta rodada não o documentou em fonte lida.':'Vínculo documentado não é culpa. O status descreve o que a fonte registra sobre a pessoa neste caso.'}</div></section>
    ${dzTiles(t)}
    ${dzBlk('ev','quem','Eventos deste vínculo',evs.length+' registro'+(evs.length!==1?'s':''),evl,false)}
    ${dzBlk('aud','conf','Notas da auditoria','qualificadores e observações',aud,false)}
    ${dzBlk('bus','op','Busca feita','o que foi procurado',bus,false)}
  </div>`}
function clDrawer(c){
  const N=NR.narrativas[0],ev=(c.ev||[]).filter(id=>byId[id]);
  const fs=(c.fontes||[]).map(f=>`<div class="src"><a href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener noreferrer">${esc(f.titulo)}</a><div class="k mute" style="font-size:12.5px"><span class="mono">${esc(f.id)}</span> · ${esc(f.veiculo)} · ${esc(f.tipo.replace(/_/g,' '))} · <span class="pill ev" title="${esc(NV[f.nivel]||'')}">${esc(f.nivel)}</span></div><div class="quote"><b>Origem declarada:</b> ${esc(f.origem_informacional)}<br><b>Leitura:</b> ${esc(f.leitura)}</div></div>`).join('')||'<p class="mute">Nenhuma fonte associada: a afirmação é o que a narrativa desenha, sem evidência própria.</p>';
  const rp=c.replicas||{};
  const hist=(c.historico||[]).slice().reverse().map(h=>`<tr><td class="tx">v${h.v}</td><td class="tx">${esc(fmtD(h.data))}</td><td class="tx">${esc(NR.status[h.status]||h.status)} · ${esc((NR.confianca[h.confianca]||h.confianca).toLowerCase())}</td><td class="tx" style="font-size:13px">${esc(h.motivo)}</td></tr>`).join('');
  const vig=c.valid_from||c.valid_to?`${esc(c.valid_from?fmtD(c.valid_from):'?')} a ${esc(c.valid_to?fmtD(c.valid_to):'em aberto')}`:'não determinada';
  const tri=c.narr&&c.narr!==N.id&&c.historico&&c.historico[0]&&/riagem/.test(c.historico[0].motivo||'');
  const ver=[`<div class="dz-v r"><b>Versão do citado</b><p>${c.versao_citado?esc(c.versao_citado):'<span class="mute">Não localizada nas fontes lidas.</span>'}</p></div>`,`<div class="dz-v"><b>Busca a favor</b><p>${esc((c.busca||{}).suporte||'—')}</p></div>`,`<div class="dz-v a"><b>Busca contra</b><p>${esc((c.busca||{}).contraria||'—')}</p></div>`].join('');
  const conf=[`<h4>Vigência</h4><p>${vig}</p>`,`<h4>Replicação</h4><p>${rp.n?`Origem informacional: ${esc(rp.origem)}. ${rp.n} reprodução(ões) localizada(s)${rp.exemplos&&rp.exemplos.length?' ('+esc(rp.exemplos.join(', '))+')':''}. <b>Repetição não é corroboração:</b> as réplicas contam como uma origem só.`:`Origem informacional: ${esc(rp.origem||'não identificada')}. Nenhuma réplica contada.`}</p>`,c.limites?`<h4>Limites</h4><p>${esc(c.limites)}</p>`:'',c.pendencias&&c.pendencias.length?`<h4>O que ainda falta conferir</h4>${li(c.pendencias)}`:''].join('');
  const lig=[c.cl_ref&&CLB[c.cl_ref]?`<h4>Afirmação equivalente já auditada</h4><div class="plist"><button class="pl" data-cl="${esc(c.cl_ref)}"><b>${esc(c.cl_ref)}</b> · ${esc(NR.status[CLB[c.cl_ref].status]||'')}<br>${esc(CLB[c.cl_ref].texto)}</button></div>`:'',ev.length?`<h4>Eventos do dossiê</h4><div class="plist">${ev.map(id=>{const e=byId[id];return `<button class="pl" data-ev="${esc(id)}"><b>${esc(dateOf(e))}</b> · ${e.nat==='alegacao_atribuida'?'alegação':'documentado'} · ${esc(e.nv)}<br>${esc(headline(e))}</button>`}).join('')}</div>`:''].join('');
  const his=`<div class="ctw"><table class="ct"><tbody>${hist}</tbody></table></div><p class="mute" style="font-size:12.5px">Última verificação: ${esc(fmtD(c.ultima_verificacao))}. O histórico só é acrescentado, nunca reescrito.</p>`;
  const nf=(c.fontes||[]).length,nh=(c.historico||[]).length;
  const t=[['fon','fon','Evidências',String(nf)],['ver','ver','Versões e busca',c.versao_citado?'com resposta':'sem resposta'],['conf','conf','Limites e vigência',String((c.pendencias||[]).length)+' pendência'+((c.pendencias||[]).length!==1?'s':'')],lig.trim()?['lig','lig','Ligações',String(ev.length+(c.cl_ref?1:0))]:null,['his','op','Histórico',nh+' versão'+(nh!==1?'ões':'')]].filter(Boolean);
  return `<div class="dh"><div class="tt"><div class="k"><span class="mono">${esc(c.id)}</span> · afirmação da narrativa ${esc(c.narr||N.id)}${tri?' · triagem automática':''}</div><h2>${esc(c.texto)}</h2>
   <div class="rch" style="margin-top:8px">${stPill(c)}${cfPill(c)}<span class="pill">${esc(NR.tipos[c.tipo_afirmacao]||c.tipo_afirmacao)}</span>${c.salto?'<span class="pill al">salto entre elos</span>':''}</div>
   <div class="nrtrip"><span>${esc(c.sujeito)}</span><i>${esc(PRED[c.predicado]||c.predicado)}</i><span>${esc(c.objeto)}</span></div></div>
   <button class="ibtn" data-dclose aria-label="Fechar">Fechar</button></div>
  <div class="db">
   ${tri?'<div class="nao"><b>Triagem automática</b>Classificação feita na página só com registros do Dossiê, sem navegar na web e sem abrir documentos. Requer revisão humana.</div>':''}
   <section class="dz-res"><div class="dz-lab">Por que este status</div>${dzMain(c.raciocinio)}
   <div class="dz-ra"><div><div class="dz-lab">O que a evidência comprova</div><p>${esc(c.comprova)}</p></div></div>
   <div class="nao"><b>O que a evidência não comprova</b>${esc(c.nao_comprova)}</div></section>
   ${dzTiles(t)}
   ${dzBlk('fon','fon','Evidências',nf+' fonte'+(nf!==1?'s':'')+' lida'+(nf!==1?'s':''),fs,false)}
   ${dzBlk('ver','ver','Versões e busca','o que o citado diz e o que se procurou',ver,false)}
   ${dzBlk('conf','conf','Limites e vigência','quando vale, réplicas e pendências',conf,false)}
   ${dzBlk('lig','lig','Ligações no dossiê','eventos e afirmações equivalentes',lig,false)}
   ${dzBlk('his','op','Histórico de versões',nh+' registro'+(nh!==1?'s':''),his,false)}
   <div class="nao"><b>Aviso</b>A existência de um vínculo documentado entre entidades não implica responsabilidade pelos atos atribuídos às demais entidades. Cada afirmação e cada relação é avaliada individualmente.</div>
  </div>`}
```
**Atenção:** no arquivo, logo após `clDrawer`, vêm `const MODOS`, `nrm`, `slug` e `tw`. Substitua só a função; não apague esse trecho.

CSS (adicionar no fim):
```css
/* ===== Blocos coloridos na plataforma ===== */
.dz-num{font-size:28px;font-weight:800;line-height:1}
.op{background:color-mix(in srgb,var(--line) 12%,var(--bg));padding:12px 14px!important;border-left-width:6px!important}
.op.f{background:color-mix(in srgb,var(--ok) 7%,var(--bg))}.op.a{background:color-mix(in srgb,var(--al-fill) 14%,var(--bg))}.op.r{background:color-mix(in srgb,var(--accent) 8%,var(--bg))}.op.g,.op.o{background:color-mix(in srgb,var(--pend) 9%,var(--bg))}
.nrb{background:color-mix(in srgb,var(--bc) 6%,var(--bg))}
.card.hero,.abre{background:color-mix(in srgb,var(--accent) 5%,var(--bg))}
.pn-b:nth-child(6n+1) header h3{box-shadow:inset 0 -4px 0 var(--ok)}
.pn-b:nth-child(6n+2) header h3{box-shadow:inset 0 -4px 0 var(--al-fill)}
.pn-b:nth-child(6n+3) header h3{box-shadow:inset 0 -4px 0 var(--accent)}
.pn-b:nth-child(6n+4) header h3{box-shadow:inset 0 -4px 0 var(--e-alivia)}
.pn-b:nth-child(6n+5) header h3{box-shadow:inset 0 -4px 0 var(--pend)}
.pn-b:nth-child(6n+6) header h3{box-shadow:inset 0 -4px 0 var(--e-encerra)}
.pn-b header h3{display:inline;padding-bottom:2px}
.pt-card:nth-child(1){--bc:var(--ok)}.pt-card:nth-child(2){--bc:var(--al-fill)}.pt-card:nth-child(3){--bc:var(--accent)}.pt-card:nth-child(4){--bc:var(--pend)}
.pt-card{border-top:5px solid var(--bc);padding-top:12px!important;background:color-mix(in srgb,var(--bc) 6%,var(--bg))}
.pt-dest{gap:8px}.pt-card{border-left:0!important;padding-left:14px!important}

#main .card:not(.hero):not(.tile),#main .ent,#main .gh,#main .rdp,#main .rdh{--bc:var(--ok);border-top:5px solid var(--bc)!important;background:color-mix(in srgb,var(--bc) 6%,var(--bg))}
#main :is(.card:not(.hero):not(.tile),.ent,.gh,.rdp,.rdh):nth-of-type(6n+2){--bc:var(--al-fill)}
#main :is(.card:not(.hero):not(.tile),.ent,.gh,.rdp,.rdh):nth-of-type(6n+3){--bc:var(--accent)}
#main :is(.card:not(.hero):not(.tile),.ent,.gh,.rdp,.rdh):nth-of-type(6n+4){--bc:var(--e-alivia)}
#main :is(.card:not(.hero):not(.tile),.ent,.gh,.rdp,.rdh):nth-of-type(6n+5){--bc:var(--pend)}
#main :is(.card:not(.hero):not(.tile),.ent,.gh,.rdp,.rdh):nth-of-type(6n+6){--bc:var(--e-encerra)}
#main .pgrid div{background:var(--bg)}
#main .pgrid div{border-top:4px solid var(--bc,var(--ok))!important}
#main .pgrid div:nth-child(6n+1){--bc:var(--ok)}#main .pgrid div:nth-child(6n+2){--bc:var(--al-fill)}#main .pgrid div:nth-child(6n+3){--bc:var(--accent)}#main .pgrid div:nth-child(6n+4){--bc:var(--e-alivia)}#main .pgrid div:nth-child(6n+5){--bc:var(--pend)}#main .pgrid div:nth-child(6n+6){--bc:var(--e-encerra)}
```

## 12. Cor por veículo e por tipo de conteúdo
**Por veículo:** cada fonte e cada texto de opinião ganha a cor do veículo (barra à esquerda, fundo tingido e selo com o nome). O veículo sai do domínio do link. Nas gavetas, os blocos Fontes e Opinião mostram uma legenda com os veículos presentes e o aviso: "a cor identifica a origem, não indica posição nem confiabilidade".

Cores:
- Oficial (STF, Senado, Câmara, TSE, gov): azul-marinho
- Gazeta do Povo: verde
- Revista Oeste: vermelho
- Alexandre Garcia: roxo
- Folha: azul
- Estadão: grafite
- Globo/g1/Valor: laranja
- UOL: amarelo
- CNN Brasil: vinho
- Veja: vermelho-claro
- Metrópoles: turquesa
- Poder360: ouro
- Imprensa jurídica (Conjur, Migalhas, Jota): azul-claro
- Outros: cinza

**Por tipo de conteúdo**, cada um com fundo e barra próprios:
- Fato documentado: azul.
- Alegação: amarelo, agora traço contínuo.
- Contexto: cinza.
- Opinião: roxo.
- "O que isto não significa": amarelo-claro.

1. Cole antes de `function srcHtml(f){` o conteúdo de `handoff/veiculos.js`:
```js
const VEIC=[
 ['oficial','Oficial (STF, Senado, Câmara, TSE, gov)',/(^|\.)(stf\.jus\.br|senado\.leg\.br|camara\.leg\.br|tse\.jus\.br|gov\.br|agenciabrasil\.ebc\.com\.br|mpf\.mp\.br|jus\.br|leg\.br|amazonaws\.com)$/,'#002776','#ffffff'],
 ['gazeta','Gazeta do Povo',/gazetadopovo\.com\.br$/,'#0e7a3a','#ffffff'],
 ['oeste','Revista Oeste',/revistaoeste\.com$/,'#c7102e','#ffffff'],
 ['garcia','Alexandre Garcia',/(youtube\.com|youtu\.be)$/,'#6b3fa0','#ffffff'],
 ['folha','Folha',/folha\.uol\.com\.br$/,'#1d4f91','#ffffff'],
 ['estadao','Estadão',/estadao\.com\.br$/,'#2b2b2b','#ffffff'],
 ['globo','O Globo / g1 / Valor',/globo\.com$/,'#e05a00','#ffffff'],
 ['uol','UOL',/uol\.com\.br$/,'#d4a200','#201e1d'],
 ['cnn','CNN Brasil',/cnnbrasil\.com\.br$/,'#b0001e','#ffffff'],
 ['veja','Veja',/veja\.abril\.com\.br$/,'#d6202b','#ffffff'],
 ['metropoles','Metrópoles',/metropoles\.com$/,'#0098a6','#ffffff'],
 ['poder360','Poder360',/poder360\.com\.br$/,'#8a6700','#ffffff'],
 ['juridico','Imprensa jurídica (Conjur, Migalhas, Jota)',/(conjur\.com\.br|migalhas\.com\.br|jota\.info|jusbrasil\.com\.br)$/,'#4a6fb5','#ffffff'],
 ['outro','Outros veículos',/.*/,'#7d7979','#ffffff']
];
const VK={};VEIC.forEach(v=>VK[v[0]]=v);
function veicOf(url){let hn='';try{hn=new URL(url).hostname.replace(/^www\d*\./,'')}catch(e){return VK.outro}return VEIC.find(v=>v[2].test(hn))||VK.outro}
function veicBadge(v){return `<span class="vb" style="--vc:${v[3]};--vt:${v[4]}">${esc(v[1].split(' (')[0])}</span>`}
function veicTag(root){if(!root)return;
  root.querySelectorAll('.src, .gv, .hb-it, .rdcr li, .nrc').forEach(b=>{if(b.dataset.vt)return;const a=b.querySelector('a[href^="http"]');if(!a)return;
    let v=veicOf(a.href);if(b.classList.contains('hb-it')&&b.dataset.v&&VK[b.dataset.v])v=VK[b.dataset.v];
    if(b.classList.contains('op-g')&&!/^https?:/.test(a.getAttribute('href')||''))return;
    b.dataset.vt=v[0];b.style.setProperty('--vc',v[3]);b.style.setProperty('--vt',v[4]);b.classList.add('vtag');
    if(!b.querySelector(':scope > .vb, :scope .hb-src .vb'))b.insertAdjacentHTML('afterbegin',veicBadge(v))});
  const used=[...new Set([...root.querySelectorAll('[data-vt]')].map(x=>x.dataset.vt))];
  root.querySelectorAll('.vleg').forEach(x=>x.remove());
  if(used.length>1){const box=root.querySelector('#dz-fon .dz-b, #dz-op .dz-b');}
}
function veicLegend(keys){return `<div class="vleg">${keys.map(k=>VK[k]).filter(Boolean).map(v=>veicBadge(v)).join('')}<span>Cada veículo tem uma cor. A cor identifica a origem, não indica posição nem confiabilidade.</span></div>`}
```
2. Em `renderMain()`, antes de `const so=$('#sort');`: `if(S.view!=='corpus')veicTag($('#main'));`
3. Em `renderDrawer()`, antes de `const b=$('[data-dclose]',dr);`:
```js
veicTag(dr);['#dz-fon','#dz-op'].forEach(s=>{const bx=dr.querySelector(s+' .dz-b');if(!bx)return;const vs=[...new Set([...bx.querySelectorAll('[data-vt]')].map(x=>x.dataset.vt))];if(vs.length)bx.insertAdjacentHTML('afterbegin',veicLegend(vs))});
```
4. Em `hubItem()`, o `<article class="hb-it">` recebe `data-v="<chave do veículo>"`.

CSS (adicionar no fim):
```css
/* ===== Cores por veículo e por tipo de conteúdo ===== */
.vb{display:inline-flex;align-items:center;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;line-height:1.35;background:var(--vc);color:var(--vt);white-space:nowrap;margin:0 6px 4px 0;vertical-align:middle}
.vtag{box-shadow:inset 5px 0 0 var(--vc)!important;background:color-mix(in srgb,var(--vc) 7%,var(--bg))!important;padding-left:14px!important}
.src.vtag{padding:10px 10px 10px 14px;margin-bottom:6px;border-bottom:0}
.gv.vtag{border-color:color-mix(in srgb,var(--vc) 35%,var(--line))!important}
.gv.vtag .optag{color:var(--vc)}
.hb-it.vtag{padding-right:12px!important;padding-top:12px!important}
.hb-it.vtag .hb-src b{display:none}
.vleg{display:flex;flex-wrap:wrap;align-items:center;gap:4px 0;margin-bottom:12px;padding:8px 10px;background:var(--bg)}
.vleg>span:last-child{flex-basis:100%;font-size:12px;color:var(--mute);margin-top:2px}
/* tipos de conteúdo */
.row.k-doc,.lrow{background:color-mix(in srgb,var(--ok) 6%,var(--bg))!important;box-shadow:inset 6px 0 0 var(--ok);border-left:0!important}
.row.k-al{background:color-mix(in srgb,var(--al-fill) 16%,var(--bg))!important;box-shadow:inset 6px 0 0 var(--al-fill);border-left:0!important;border-style:solid!important}
.row.k-ctx{background:color-mix(in srgb,var(--pend) 8%,var(--bg))!important;box-shadow:inset 6px 0 0 var(--pend);border-left:0!important}
.gv.op-g{background:color-mix(in srgb,#6b3fa0 7%,var(--bg))!important;box-shadow:inset 6px 0 0 #6b3fa0;border-left:0!important;border-style:solid!important}
.gv.op-g .optag{color:#6b3fa0}
.qt{box-shadow:inset 4px 0 0 var(--mute)}
.nao{background:color-mix(in srgb,var(--al-fill) 22%,var(--bg))!important}
.ks.k-doc{border-left-color:var(--ok)}.ks.k-al{border-style:solid;border-left-color:var(--al-fill);background:color-mix(in srgb,var(--al-fill) 16%,var(--bg))}.ks.k-op{border-style:solid;border-left-color:#6b3fa0;background:color-mix(in srgb,#6b3fa0 7%,var(--bg))}
.agrow{display:block;padding:10px 12px 10px 16px!important;margin-bottom:4px;background:color-mix(in srgb,#6b3fa0 6%,var(--bg));box-shadow:inset 5px 0 0 #6b3fa0;text-decoration:none;color:var(--text)}
.agrow:hover{background:color-mix(in srgb,#6b3fa0 14%,var(--bg))}
```

## Próximas etapas (ainda não feitas)
Cartão visual de pessoa, rede de vínculos, termômetro ampliado, comparativo Gazeta × Oeste × opinião, ícones por mecanismo, cards 1080×1080 para compartilhar.


## 14. Sistema visual editorial v1 (direção criativa, em aprovação)
Arquivo de referência: `Desmentindo Sistema Visual v1.dc.html`. Ainda não é para implementar; é a direção que as peças sociais, a newsletter e a página "O Dia" vão seguir.
- **Conceito "carimbo de tempo":** régua fixa no topo (marca, edição, data e hora), marca-texto amarelo e datas grandes em Archivo condensado (largura de 72 a 75%, peso 900).
- **Edições e cor da régua:**
  - Agora: amarelo #FFDF00.
  - Atualização: azul #002776.
  - Fechamento: preto, com fio verde.
  - O Dia: papel, com cabeçalho de jornal.
- **Estados com forma própria,** além da cor: documentado, parcial, não localizado, em auditoria, inconclusivo, atualizado, o que mudou, nos acervos, fonte primária, documento, linha do tempo, contexto.
- **Campos de automação e limites da capa:** título de 60 caracteres, achado de 90 caracteres e `REVIEW_GATE`, que exige revisão humana quando a peça cita pessoa identificável.


## 15. Linguagem pública v1 (em aprovação)
Arquivo de referência: `Desmentindo Linguagem Publica v1.dc.html`. Ainda não é para aplicar na tela: primeiro vem a aprovação.
- **Princípio:** por dentro pode ser sofisticado; por fora precisa ser óbvio. Os nomes internos (corpus, audit, RHR, media salience, provenance) continuam valendo nos dados e no código.
- **Dicionário principal:**
  - corpus → Arquivos
  - auditoria → Checagem
  - dossiê → Entenda o caso
  - evidência → O que encontramos
  - ocorrência → Vezes que apareceu
  - RHR → Isso já apareceu antes
  - news hub → Na imprensa hoje
  - provenance → Fonte
- **Selos:**
  - Tem documento
  - Só em parte
  - Não encontramos registro
  - Ainda não dá para confirmar
  - Estamos conferindo
  - Atualizado às HH:MM
  - Nos arquivos
  - Fonte original
  - Alguém disse
- **Salvaguardas em linguagem de conversa:**
  - Aparecer não é prova.
  - Aparecer junto não é ser culpado.
  - Dizer não é provar.
  - Não encontramos não quer dizer que não existe.
- **Personalidade:** direta, ácida e irônica, mas documentada. A polêmica tem que vir dos fatos (data, documento, declaração, cronologia). Nada de insinuar culpa ou tratar ligação como causa.


## 16. Consolidação v2: arquitetura do site e camada profissional (em aprovação)
Arquivo de referência: `Desmentindo Consolidacao v2.dc.html`. Ainda não é para implementar.

**Navegação principal:** Agora · Checar · Nos arquivos · O Dia, mais a busca, e ao lado Sobre · Para profissionais.
- No celular, barra fixa embaixo: Agora · Checar · Buscar · O Dia · Mais.

**Home:** o topo passa a ser a história do momento. A frase "O que foi dito. Quando foi dito. E de onde veio." vira uma linha sob o cabeçalho. A ordem dos blocos é:
1. Em destaque agora
2. Checar
3. O que mudou hoje
4. Em destaque hoje
5. Já checamos
6. Isso já apareceu antes
7. Nos arquivos / Entenda os casos
8. Receba O Dia
9. Use no seu trabalho (discreto)
10. Rodapé

**Linguagem v1.1:**
- Entram "polêmico" e "compartilhável" na personalidade.
- Os selos voltam a "Documentado" e "Documentado em parte".
- Estados de publicação: Publicado · Atualizado (o fato evoluiu) · Corrigido (nós erramos).

**Transparência:** faixa em toda peça com publicado, atualizado, fontes, "Achou um erro?" e "Apareceu aqui? Responda".

**Páginas novas:**
- Sobre
- Como trabalhamos (7 passos)
- Política editorial
- Correções, com registro público
- Direito de resposta
- Fontes e método
- Como usamos tecnologia
- Contato
- Anuncie e parcerias
- Termos
- Privacidade

**Destino dos módulos antigos:**
- Saem do público: Dossiê e Segundo cérebro.
- Vão para a área avançada: Matriz, Mecanismos, Vínculos, Painel e Termômetro. O Termômetro fica marcado como opinião do autor.
- Mudam de nome:
  - Pessoas e casos → Entenda os casos
  - Corpus → Nos arquivos
  - Hub → Em destaque hoje

**Camada profissional:** Desmentindo (publicação) e Desmentindo Data, com um selo azul "DATA".
- Produtos, todos marcados "Em estudo" e sem preço: Pro, API, Pesquisa sob encomenda, Cronologias e levantamentos, Acompanhar temas, Dados e licenciamento.
- Sem ranking de pessoas, sem score e sem perfil político individual.


## 17. Aprovação das fases 1 a 3 e as 3 master screens
Referências:
- `Desmentindo Master Screens.dc.html`: Home, Página da história e Para profissionais, em desktop de 1280 px e celular de 390 px.
- `DM Home.dc.html`, `DM Historia.dc.html` e `DM Profissionais.dc.html`, cada um com a prop `mobile`.

**Ajustes de texto:**
- Frase das marcas: "O Desmentindo você acompanha. O Desmentindo Data você usa."
- Em destaque hoje: "O que está repercutindo na imprensa".
  - A contagem de veículos só aparece com medição real.
  - Linha fixa: "Repercutir não é comprovar."
- Newsletter: "Todo fim de tarde, o que realmente importou no dia."
- Resposta: "Foi citado nesta história? Envie sua versão."

**Página da história:** uma URL permanente por acontecimento (`/historia/slug`). Agora, Atualização e Fechamento são momentos da mesma página. Blocos:
1. Cabeçalho, com publicado, atualizado e correções.
2. Onde está agora: sabemos / ainda não sabemos.
3. A história hoje: 09:12 → 13:47 → 17:15.
4. Olha a data: isso já apareceu antes.
5. Veja o documento.
6. O que a imprensa disse.
7. Fontes.
8. Atualizações e correções.
9. Resposta publicada e "Envie sua versão".
10. "Esta história continua amanhã."

**Módulos antigos:** a classificação por destino (público, arquivo avançado, profissional, só interno, sai) está na Consolidação v2.


## 18. Master Screens v3 (masters para congelar)
Referências: `Desmentindo Master Screens v3.dc.html`, `DM Home v3.dc.html`, `DM Historia v3.dc.html` e `DM Profissionais v3.dc.html`. As versões v1 ficam como histórico.

**Está circulando** é uma entrada editorial nova, separada de Em destaque hoje.
- Na Home, ganha seção própria logo depois do Checar.
- Cada card traz origem (tipo e hora), a frase, a pergunta "Fomos conferir", o estado e o link.
- Na Página da história, abre a leitura com três partes: O que foi dito, Origem da afirmação ("a origem não decide a resposta") e O que encontramos.
- O objeto é a afirmação. Não existe lista de pessoas monitoradas.

**Em destaque hoje** passa a ser "O que está no noticiário". A linha fixa é "Aparecer em muitos veículos não é comprovar."

**Semântica de estado:**
- Sobre a fonte, como rótulo e não como veredito: Fonte localizada · Documento localizado.
- Sobre a afirmação, como selo:
  - Documentado ("encontramos documentação que sustenta a afirmação no contexto apresentado")
  - Parcialmente documentado
  - Ainda não dá para confirmar
  - Não encontramos registro
  - Em checagem
  - Atualizado às HH:MM
- "Em auditoria" está proibido na tela.

**Para profissionais:**
- O hero separa o que "já existe por trás do Desmentindo" do que está "em estudo como uso profissional".
- São 10 capacidades, todas marcadas "em estudo".

**Módulos antigos:** a classificação está na tabela E do arquivo v3.


## 19. Expansão, Etapa 1 (arquitetura das 26 telas)
Referência: `Desmentindo Expansao Etapa 1.dc.html`. Os masters v3 estão congelados.
- **Documentado:** "Encontramos documentação que sustenta a afirmação no contexto apresentado."
- **Fonte localizada** e **Documento localizado** são rótulos da fonte, nunca selo da afirmação.
- **Regra de todo selo:** vem acompanhado de "Checamos se foi dito" ou "Checamos se aconteceu". Uma reportagem sobre acusação documenta a acusação, não o fato.
- **Estados em três camadas:** selo da afirmação · rótulo da fonte · estado da publicação (Publicado, Atualizado, Corrigido).
- **Famílias:** A Agora · B História · C Checar · D Nos arquivos · E O Dia · F Confiança · G Desmentindo Data · H Sistema.
- **Navegação:** a mesma dos masters.
- **Arquivo de referência:** o inventário das 26 telas (com master-pai), os 21 componentes, os tokens, as 12 regras de herança e a fonte de verdade estão no arquivo da Etapa 1.


## 20. Expansão, Etapa 1.1 (tempo e vínculos internos)
Referência: `Desmentindo Expansao Etapa 1.1.dc.html`.

**Vínculos e hipóteses:** capacidade interna, sem tela pública. Alimenta:
- Olha a data
- O que mudou
- Isso já apareceu antes
- Cronologia
- O que encontramos
- O que ainda não sabemos

O módulo público antigo "Vínculos" continua removido.

**Componente 22 · Contraste no tempo ("Olha a data"):**
- De 2 a 4 momentos, cada um com data, verbo, o fato, selo e "checamos se…" e a fonte original.
- Mostra o tempo entre os momentos em palavras e fecha com "O que mudou?".
- **Verbos permitidos (lista fechada):** disse, declarou, votou, assinou, apoiou, declarou apoio, assumiu o cargo, entrou no governo, saiu do governo, rompeu, publicou, decidiu.
- **Só com revisão humana:** "mudou de lado", "se contradisse", "voltou atrás", "recuou".

**Componente 23 · Quem aparece nesta história:** substitui a tela 18 antiga (Pessoa em contexto). A tela 18 passa a ser Cards para compartilhar.

**O que explica a mudança?** É uma variante do Finding Card, com 4 estados. Nunca usar "sem explicação".

**Busca por nome:** responde "em quais histórias aparece", agrupado por ano. Não existe perfil de pessoa.

**Capacidades profissionais:** três estados (já existe, protótipo, em estudo).
- Os estados reais de cada capacidade ainda dependem de confirmação técnica.
- Timeline Intelligence é só hipótese de negócio, sem nome comercial.

**Etapa 2:** pronta = sim, aguardando revisão.


## 21. Implementação P0: Home e Página da história com dados reais
Referência: `DM Plataforma v4.dc.html`. Ela lê `candidato/dados.json`, e o arquivo `Desmentindo Plataforma v4.dc.html` mostra casos longo, médio e curto.

**Separe o modelo de dados do modelo de apresentação.** Não altere Corpus, RHR, News Hub, Publisher nem Human Review. Crie adaptadores de apresentação:
- `storyFromCaso(caso)` → { title, span, lastT, nums[4], nfat/nal, tl[≤6], firstY/lastY/gap, doc, rail[≤8] }
- `claimCard(cl)` → { glifo, selo, texto, id }
- `hubItem(h)` → { veículo, data, título }
- `caseCard(caso)` → { nome, span, barras por ano }

**Componentes que recebem dados:** Editorial Hero (sem imagem → data + documento), Big Number, proporção fato/alegação, Visual Timeline, Olha a data (primeiro × último), Document Spotlight, Source Rail, Open Questions (com estado vazio), cards de Está circulando e de casos.

**Regras de conteúdo:**
- Cortar o texto em fronteira de palavra.
- Datas em "DD MMM AAAA".
- Rótulos: "Fato com fonte" e "Alegação atribuída".
- Sem fotos até existir campo de imagem por história.

**Pendências:** estão em `handoff/DESIGN_BACKLOG.md`, com os campos que faltam no modelo de apresentação (gancho, resumo curto, marco, documento com página e trecho, perguntas, origem por afirmação, imagem).

**Próximas famílias, na ordem:** P1 (Está circulando, Em destaque, Já checamos, Checar, Busca) → P2 → P3, com os mesmos componentes.

**Mapa de status das afirmações:** documentado → Documentado · parcial → Parcialmente documentado · nao_comprovado → Ainda não dá para confirmar · sem_registro → Não encontramos registro · em_investigacao e nao_avaliado → Em checagem. Valor desconhecido → Em checagem, nunca um estado conclusivo.


## 22. Implementação do design aprovado na plataforma real (v5), 2026-10-02
Referências: `public-ui/handoff/DESIGN_RECONCILIATION.md` (inventário, matriz, conflitos, achados) e `SOURCE_MANIFEST.md` (sha256 do pacote).

**Alvo:** a v5 que está no ar (raiz), não `Desmentindo Brasil.html`. PRE_DESIGN_IMPLEMENTATION_COMMIT = `3cb0e67`. Nenhuma v6, nenhuma plataforma paralela.

**Decisões aplicadas:**
- Home continua simples (marca + mensagem + busca; portas AGORA · JÁ FALARAM · PESQUISE). Do v4 vêm a faixa-assinatura, os tokens e a régua.
- AGORA: 3 notícias com texto e o resto em linhas. Cada notícia tem URL própria (`#/agora/<id>`), com as fontes visíveis.
- História na ordem de Johnny, com os componentes v4:
  - data protagonista;
  - números com contexto;
  - linha do tempo visual;
  - documento em destaque (com a regra "Documento localizado");
  - trilho de fontes (com a regra "Fonte localizada");
  - atualizações com marcador ↻;
  - faixa de transparência.
- Alegação atribuída sempre rotulada (P0).
- Busca agrupada por ano; Para profissionais com cartões JÁ EXISTE.
- Shell:
  - rodapé DM Rodape com NOSSAS REGRAS;
  - barra inferior no celular (Agora · Já falaram · Pesquisar · Checar · Mais);
  - foco verde.
- Checar (`#/checar`): método em 7 passos, paridade de formato e leitura do resultado. O envio ainda não está aberto. Componente ORIGINAL × CHECADO (`window.DesmentindoCheck`):
  - contrato CHECK_MODEL com formatos `relations | table | timeline | card` (CHECK_OUTPUT_PARITY);
  - selo por afirmação;
  - a força do traço segue a força do selo;
  - peça checada como CHECKED_MASTER_ASSET.
  O exemplo público fica desligado até decisão.
- Rotas antigas: redireciono para o equivalente, uma página "mudou de lugar" ou uma página "saiu da página pública".

**Arquivos alterados:**
- `v5/index.html`, `v5/css/v5.css`, `v5/js/v5.js`;
- `public-ui/build-v5-data.mjs`: rótulo de alegação, `rotas.json`, `checar.json`;
- `public-ui/qa/v5_qa.py`: gates novos `V5_EPISTEMIC_QA`, `V5_CHECAR_QA`, `V5_ROUTES_QA`, `ACCESSIBILITY` e `MOBILE`, com varredura a 375 px;
- `public-ui/handoff/*`.

**Não alterado:** Publisher, Control Plane, Human Review, RHR, Corpus, News Hub, DAY-STORIES, `data/editorial`.

**Checkpoints:**
- 0 inventário: feito;
- 1 P0: alegação corrigida; app anterior aguarda decisão;
- 2 P1: feito, exceto as lacunas de dado/canal;
- 3 P2: parcial;
- 4 P3: backlog;
- 5 Checar: componentes feitos.

**Regressões:** nenhuma funcional. "Já falaram" continua até 1,5 tela no celular: os números da História ficam só na faixa final no celular.

**Pendências:** DESIGN_BACKLOG e as 3 decisões de Johnny.
