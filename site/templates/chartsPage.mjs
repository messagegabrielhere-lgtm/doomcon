// /charts.html — THIS WEEK IN CHARTS, SIREN EDITION. Live trend charts that
// matter for AI, each with its own takeaway and a fresh X post:
//   1. Who will have the best AI model? (Polymarket, live in the browser)
//   2. The hottest AI prediction markets right now (Polymarket, live)
//   3. The SIREN score, last 7 days (hourly, re-read live)
//   4. What's driving it: the four pillars, 7 days
//   5. The power race: electricity generated, China vs US vs India vs EU
// Static SVGs ship in the HTML (readable without JavaScript, from the build's
// own data); the browser then swaps in live data. Inspired by a16z's "This
// Week in Charts" format. Never invents a number: a dark feed keeps the
// static chart and says when it is from.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { polymarketUrl } from '../monetize.mjs';

// One chart drawer for node (static) and the browser (live). ES5, no backticks.
export const CHART_JS = String.raw`
function sirenLine(series, o){
  o = o || {}; var W = o.w || 860, H = o.h || 300, L = 52, R = o.right || 170, T = 14, B = 28;
  var all = []; series.forEach(function(s){ s.pts.forEach(function(p){ all.push(p); }); });
  if (!all.length) return "";
  var x0 = Math.min.apply(null, all.map(function(p){return p[0];})), x1 = Math.max.apply(null, all.map(function(p){return p[0];}));
  var lo = o.ymin != null ? o.ymin : Math.min.apply(null, all.map(function(p){return p[1];}));
  var hi = o.ymax != null ? o.ymax : Math.max.apply(null, all.map(function(p){return p[1];}));
  if (hi === lo) { hi += 1; lo -= 1; }
  var pad = (hi - lo) * 0.06; if (o.ymin == null) lo -= pad; if (o.ymax == null) hi += pad;
  var fx = function(v){ return L + (v - x0) / ((x1 - x0) || 1) * (W - L - R); };
  var fy = function(v){ return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
  var fmt = o.fmt || function(v){ return Math.round(v); };
  var g = "";
  for (var i = 0; i <= 4; i++) { var v = lo + (hi - lo) * i / 4; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + fy(v).toFixed(1) + '" y2="' + fy(v).toFixed(1) + '" stroke="#1F2937"/><text x="' + (L - 8) + '" y="' + (fy(v) + 4).toFixed(1) + '" text-anchor="end" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">' + fmt(v) + '</text>'; }
  var dl = o.dlabel || function(t){ var d = new Date(t); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate(); };
  g += '<text x="' + L + '" y="' + (H - 8) + '" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">' + dl(x0) + '</text><text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">' + dl(x1) + '</text>';
  var labels = series.map(function(s){ var p = s.pts[s.pts.length - 1]; return { s: s, y: fy(p[1]), v: p[1] }; }).sort(function(a, b){ return a.y - b.y; });
  for (var k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 14) labels[k].y = labels[k - 1].y + 14;
  var lines = series.map(function(s){ var p = s.pts.map(function(q){ return fx(q[0]).toFixed(1) + "," + fy(q[1]).toFixed(1); }).join(" "); var e = s.pts[s.pts.length - 1];
    return '<polyline fill="none" stroke="' + s.color + '" stroke-width="' + (s.w || 2.5) + '" stroke-linejoin="round" points="' + p + '"/><circle cx="' + fx(e[0]).toFixed(1) + '" cy="' + fy(e[1]).toFixed(1) + '" r="3.5" fill="' + s.color + '"/>'; }).join("");
  var lab = labels.map(function(l){ return '<text x="' + (W - R + 8) + '" y="' + (l.y + 4).toFixed(1) + '" fill="' + l.s.color + '" font-size="12" font-weight="700" font-family="IBM Plex Mono,monospace">' + String(l.s.name).replace(/[<&]/g, "") + " " + fmt(l.v) + '</text>'; }).join("");
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + String(o.label || "").replace(/"/g, "") + '">' + g + lines + lab + '</svg>';
}`;
const sirenLine = new Function(`${CHART_JS}; return sirenLine;`)();

const COLORS = ['#F87171', '#60A5FA', '#FACC15', '#4ADE80', '#C084FC', '#FB923C'];
const pct = (v) => `${Math.round(v * 100)}%`;
const CSS = `<style>
.ch{max-width:1100px}.ch .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#60A5FA;margin:0 0 10px}
.ch-c{border:1px solid var(--rule);border-radius:10px;background:var(--bg-raised,#0E131D);padding:16px;margin:16px 0;scroll-margin-top:90px}
.ch-c h2{margin:0;font:700 20px/1.25 var(--sans);color:#E6EAF0}
.ch-c .tk{margin:6px 0 10px;color:#FDE68A;font:600 15px/1.45 var(--sans)}
.ch-c svg{display:block;width:100%;height:auto}
.ch-f{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between;margin-top:8px;font:600 11.5px var(--mono);color:var(--ink-faint,#6B7686)}
.ch-f a{color:inherit}
.ch-x{appearance:none;border:1px solid #60A5FA;background:#0B1220;color:#BFDBFE;padding:8px 12px;font:700 12.5px var(--mono);cursor:pointer;border-radius:3px}
.ch-live{display:inline-flex;align-items:center;gap:6px;color:#4ADE80}.ch-live i{width:7px;height:7px;border-radius:50%;background:#4ADE80;animation:chP 2s infinite}
@keyframes chP{50%{opacity:.3}}@media (prefers-reduced-motion:reduce){.ch-live i{animation:none}}
.ch-m{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.ch-m a{display:block;border:1px solid var(--rule);border-radius:8px;padding:10px;text-decoration:none;color:var(--ink);background:#0A0E15}
.ch-m b{display:block;font:800 22px var(--mono);color:#fff}.ch-m small{color:var(--ink-dim);font-size:12.5px;line-height:1.35;display:block}
.ch-m .up{color:#4ADE80}.ch-m .dn{color:#F87171}
.ch-toc{display:flex;flex-wrap:wrap;gap:6px}.ch-toc a{border:1px solid var(--rule);padding:5px 9px;border-radius:3px;font:600 12px var(--mono);color:var(--ink);text-decoration:none}
</style>`;

function card(id, n, title, takeaway, svg, source, xTitle, live, share) {
  return `<article class="ch-c" id="${id}"><h2>${n}. ${esc(title)}</h2><p class="tk" data-tk>${esc(takeaway)}</p><div data-svg>${svg}</div>
  <div class="ch-f"><span>${live ? '<span class="ch-live" data-live><i></i>LIVE</span> · ' : ''}<span data-src>${source}</span></span>
  <button type="button" class="ch-x" data-xpost="page" data-x-title="${esc(xTitle)}" data-x-src="SIREN" data-x-url="${share}#${id}">𝕏 Post this chart</button></div></article>`;
}

export function render(ctx, { history = [], race = null, power = null } = {}) {
  const share = esc(ctx.url ? ctx.url('/charts.html') : 'https://siren.watch/charts.html');
  const pmBase = polymarketUrl('https://polymarket.com/event/x', 'charts').split('?')[1] || '';
  // 3 + 4: SIREN, last 7 days of hourly readings.
  const cut = Date.now() - 7 * 864e5;
  const h = history.filter((r) => r && !r.degraded && Number.isFinite(r.score) && Date.parse(r.t || r.generated_at) >= cut).map((r) => ({ t: Date.parse(r.t || r.generated_at), ...r }));
  const scoreSvg = h.length > 1 ? sirenLine([{ name: 'SIREN', color: '#F87171', pts: h.map((r) => [r.t, r.score]), w: 3 }], { label: 'SIREN score, last 7 days', fmt: (v) => v.toFixed(1) }) : '<p>Not enough readings yet.</p>';
  const first = h[0], last = h[h.length - 1];
  const delta = first && last ? last.score - first.score : 0;
  const scoreTk = last ? `SIREN reads ${last.score.toFixed(1)} (level ${last.level}), ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} points on the week.` : 'Waiting for readings.';
  const P = [['capability', 'Capability', '#60A5FA'], ['compute', 'Compute & capital', '#FACC15'], ['attention', 'Attention', '#F87171'], ['governance', 'Governance', '#4ADE80'], ['markets', 'Markets', '#C084FC']];
  const pSeries = P.map(([k, name, color]) => ({ name, color, pts: h.filter((r) => r.pillars && Number.isFinite(r.pillars[k])).map((r) => [r.t, r.pillars[k]]) })).filter((s) => s.pts.length > 1);
  const pSvg = pSeries.length ? sirenLine(pSeries, { label: 'SIREN pillars, last 7 days', fmt: (v) => v.toFixed(0), right: 200 }) : '<p>Not enough readings yet.</p>';
  const movers = pSeries.map((s) => ({ name: s.name, d: s.pts[s.pts.length - 1][1] - s.pts[0][1] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const pTk = movers.length ? `Biggest mover this week: ${movers[0].name}, ${movers[0].d >= 0 ? 'up' : 'down'} ${Math.abs(movers[0].d).toFixed(1)}.` : '';
  // 1: best model (static = current odds as flat points; live = 30-day history).
  const legs = ((race && race.markets && race.markets.polymarket && race.markets.polymarket.horizon && race.markets.polymarket.horizon.legs) || []).slice().sort((a, b) => b.probability - a.probability).slice(0, 5);
  const ev = race && race.markets && race.markets.polymarket && race.markets.polymarket.horizon;
  const bmSvg = legs.length ? sirenLine(legs.map((l, i) => ({ name: l.title, color: COLORS[i], pts: [[Date.now() - 7 * 864e5, Math.max(0, l.probability - (l.change_7d || 0)) * 100], [Date.now(), l.probability * 100]] })), { label: 'Polymarket: which company has the best AI model', fmt: (v) => `${Math.round(v)}%`, ymin: 0 }) : '<p>Market data not collected yet.</p>';
  const bmTk = legs.length >= 2 ? `${legs[0].title} ${pct(legs[0].probability)} vs ${legs[1].title} ${pct(legs[1].probability)} to have the best AI model at the end of 2026.` : '';
  // 5: power race.
  const pr = power && power.race;
  const pw = pr ? [['China', '#F87171', pr.china], ['United States', '#60A5FA', pr.us], ['India', '#FB923C', pr.india], ['EU', '#C084FC', pr.eu]].filter((x) => x[2] && x[2].length).map(([name, color, s]) => ({ name, color, pts: s.map(([y, v]) => [Date.UTC(y, 0, 1), v]) })) : [];
  const pwSvg = pw.length ? sirenLine(pw, { label: 'Electricity generated per year, TWh', fmt: (v) => Math.round(v).toLocaleString('en-US'), dlabel: (t) => String(new Date(t).getUTCFullYear()), ymin: 0 }) : '<p>Power data not collected yet.</p>';
  const cn = pr && pr.china && pr.china[pr.china.length - 1], us = pr && pr.us && pr.us[pr.us.length - 1];
  const pwTk = cn && us ? `China generated ${(cn[1] / us[1]).toFixed(1)}× the electricity of the US in ${cn[0]}. In 2000 it was less than a third.` : '';

  const main = `${CSS}<section class="ch">
  <p class="eyebrow">THIS WEEK IN CHARTS · LIVE</p>
  <h1 class="bp__h1">AI in charts, updating as you read</h1>
  <p class="lede">Five charts that say where AI is heading this week. The prediction markets refresh live in your browser, the SIREN charts every hour. Each has one line of takeaway and its own 𝕏 button that writes a fresh post.</p>
  <nav class="ch-toc" aria-label="Charts"><a href="#best-model">Best AI model odds</a><a href="#hot-markets">Hottest AI bets</a><a href="#siren">SIREN, 7 days</a><a href="#pillars">What’s driving it</a><a href="#power">The power race</a></nav>
  ${card('best-model', 1, 'Who will have the best AI model at the end of 2026?', bmTk, bmSvg, `Polymarket${ev && ev.url ? ` · <a href="${esc(polymarketUrl(ev.url, 'charts'))}" target="_blank" rel="noopener">trade it</a>` : ''}`, bmTk ? `Polymarket odds for the best AI model at the end of 2026: ${bmTk.replace(/ to have the best.*$/, '')}.` : 'Who will have the best AI model at the end of 2026?', true, share)}
  ${card('hot-markets', 2, 'The hottest AI bets right now', 'The AI prediction markets with the most money moving in the last 24 hours.', '<div class="ch-m" data-hot><p>Loading live markets…</p></div>', 'Polymarket, ranked by 24-hour volume', 'The hottest AI bets on Polymarket right now', true, share)}
  ${card('siren', 3, 'The SIREN score, last 7 days', scoreTk, scoreSvg, `SIREN, hourly · <a href="${esc(ctx.href('/methodology.html'))}">method</a>`, scoreTk, true, share)}
  ${card('pillars', 4, 'What’s driving it: the four pillars', pTk, pSvg, 'SIREN pillar readings, hourly', pTk ? `What moved AI this week: ${pTk.replace('Biggest mover this week: ', '')}` : 'What moved AI this week', true, share)}
  ${card('power', 5, 'The power race: electricity generated per year', pwTk, pwSvg, `Our World in Data · <a href="${esc(ctx.href('/power.html'))}">full table</a>`, pwTk, false, share)}
  <p style="font-size:12.5px">Polymarket links carry SIREN’s tracking tag. Prediction markets are restricted in some places; check the rules where you live. Not financial advice. Charts are drawn from the data on this page; nothing is estimated.</p>
</section>
<script>${CHART_JS}
(function(){var C=${JSON.stringify(COLORS)},REF=${JSON.stringify(pmBase)};
function card(id){return document.getElementById(id);}
function pm(slug){return "https://polymarket.com/event/"+encodeURIComponent(slug)+(REF?"?"+REF:"");}
function esc(t){return String(t||"").replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function setX(id,t){var b=card(id)&&card(id).querySelector("[data-xpost]");if(b&&t)b.setAttribute("data-x-title",t);}
function jget(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
function hist(tok,interval,fid){return jget("https://clob.polymarket.com/prices-history?market="+tok+"&interval="+interval+"&fidelity="+fid).then(function(j){return (j.history||[]).map(function(p){return [p.t*1000,p.p*100];});});}
function bestModel(){
  jget("https://gamma-api.polymarket.com/events?slug=which-company-has-best-ai-model-end-of-2026").then(function(j){
    var ms=(j[0]&&j[0].markets||[]).filter(function(m){return !m.closed;}).map(function(m){var p=0;try{p=+JSON.parse(m.outcomePrices)[0];}catch(e){}var tok=null;try{tok=JSON.parse(m.clobTokenIds)[0];}catch(e){}return {name:m.groupItemTitle||m.question,p:p,tok:tok};}).filter(function(m){return m.tok;}).sort(function(a,b){return b.p-a.p;}).slice(0,5);
    return Promise.all(ms.map(function(m){return hist(m.tok,"1m",360).catch(function(){return [];});})).then(function(hs){
      var s=ms.map(function(m,i){return {name:m.name,color:C[i],pts:hs[i].length>1?hs[i]:[[Date.now()-864e5,m.p*100],[Date.now(),m.p*100]]};});
      var c=card("best-model");c.querySelector("[data-svg]").innerHTML=sirenLine(s,{label:"Polymarket: which company has the best AI model, 30 days",fmt:function(v){return Math.round(v)+"%";},ymin:0});
      if(ms.length>1){var t=ms[0].name+" "+Math.round(ms[0].p*100)+"% vs "+ms[1].name+" "+Math.round(ms[1].p*100)+"% to have the best AI model at the end of 2026.";c.querySelector("[data-tk]").textContent=t;setX("best-model","Polymarket right now: "+ms[0].name+" "+Math.round(ms[0].p*100)+"%, "+ms[1].name+" "+Math.round(ms[1].p*100)+"% to have the best AI model by year end. 30-day chart");}
      c.querySelector("[data-src]").innerHTML='Polymarket, 30 days, updated '+new Date().toISOString().slice(11,16)+' UTC · <a href="'+pm("which-company-has-best-ai-model-end-of-2026")+'" target="_blank" rel="noopener">trade it</a>';
    });
  }).catch(function(){});
}
function spark(pts,col){if(pts.length<2)return "";var xs=pts.map(function(p){return p[0];}),ys=pts.map(function(p){return p[1];});var x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),lo=Math.min.apply(null,ys),hi=Math.max.apply(null,ys);if(hi===lo){hi+=1;lo-=1;}
  return '<svg viewBox="0 0 200 40" style="height:40px;margin:6px 0"><polyline fill="none" stroke="'+col+'" stroke-width="2" points="'+pts.map(function(p){return ((p[0]-x0)/((x1-x0)||1)*200).toFixed(1)+","+(38-(p[1]-lo)/(hi-lo)*36).toFixed(1);}).join(" ")+'"/></svg>';}
function hot(){
  jget("https://gamma-api.polymarket.com/events?tag_slug=ai&closed=false&order=volume24hr&ascending=false&limit=9").then(function(evs){
    var picks=evs.map(function(e){var ms=(e.markets||[]).filter(function(m){return !m.closed;}).map(function(m){var p=0;try{p=+JSON.parse(m.outcomePrices)[0];}catch(err){}var tok=null;try{tok=JSON.parse(m.clobTokenIds)[0];}catch(err){}return {q:m.groupItemTitle||m.question,p:p,tok:tok,wk:+m.oneWeekPriceChange||0};}).filter(function(m){return m.tok&&m.p<0.995&&m.p>0.005;}).sort(function(a,b){return b.p-a.p;});return ms[0]?{ev:e,m:ms[0]}:null;}).filter(Boolean).slice(0,6);
    return Promise.all(picks.map(function(x){return hist(x.m.tok,"1w",60).catch(function(){return [];});})).then(function(hs){
      var box=card("hot-markets").querySelector("[data-hot]");
      box.innerHTML=picks.map(function(x,i){var up=x.m.wk>=0;return '<a href="'+pm(x.ev.slug)+'" target="_blank" rel="noopener"><small>'+esc(x.ev.title)+(x.m.q&&x.m.q!==x.ev.title?" · "+esc(x.m.q):"")+'</small><b>'+Math.round(x.m.p*100)+'%</b>'+spark(hs[i],C[i%C.length])+'<small class="'+(up?"up":"dn")+'">'+(up?"▲ ":"▼ ")+Math.abs(Math.round(x.m.wk*100))+' pts this week · $'+Math.round(x.ev.volume24hr||0).toLocaleString("en-US")+' traded today</small></a>';}).join("")||"<p>No live AI markets right now.</p>";
      if(picks[0])setX("hot-markets","Hottest AI bet on Polymarket today: “"+picks[0].ev.title+"” at "+Math.round(picks[0].m.p*100)+"%, with $"+Math.round(picks[0].ev.volume24hr||0).toLocaleString("en-US")+" traded in 24 hours");
    });
  }).catch(function(){var box=card("hot-markets").querySelector("[data-hot]");box.innerHTML='<p>Polymarket did not answer. <a href="https://polymarket.com/predictions/ai" target="_blank" rel="noopener">See the AI markets on Polymarket →</a></p>';});
}
function siren(){
  jget("api/history.json").then(function(j){
    var cut=Date.now()-7*864e5,o=(j.observations||[]).filter(function(r){return !r.degraded&&Date.parse(r.generated_at)>=cut&&isFinite(r.score);}).map(function(r){r.t=Date.parse(r.generated_at);return r;});
    if(o.length<2)return;
    var c=card("siren");c.querySelector("[data-svg]").innerHTML=sirenLine([{name:"SIREN",color:"#F87171",pts:o.map(function(r){return [r.t,r.score];}),w:3}],{label:"SIREN score, last 7 days",fmt:function(v){return v.toFixed(1);}});
    var a=o[0],b=o[o.length-1],d=b.score-a.score;var t="SIREN reads "+b.score.toFixed(1)+" (level "+b.level+"), "+(d>=0?"up ":"down ")+Math.abs(d).toFixed(1)+" points on the week.";c.querySelector("[data-tk]").textContent=t;setX("siren",t);
    var P=[["capability","Capability","#60A5FA"],["compute","Compute & capital","#FACC15"],["attention","Attention","#F87171"],["governance","Governance","#4ADE80"],["markets","Markets","#C084FC"]];
    var s=P.map(function(p){return {name:p[1],color:p[2],pts:o.filter(function(r){return r.pillars&&isFinite(r.pillars[p[0]])&&r.pillars[p[0]]!==null;}).map(function(r){return [r.t,r.pillars[p[0]]];})};}).filter(function(x){return x.pts.length>1;});
    if(s.length)card("pillars").querySelector("[data-svg]").innerHTML=sirenLine(s,{label:"SIREN pillars, last 7 days",fmt:function(v){return v.toFixed(0);},right:200});
  }).catch(function(){});
}
bestModel();hot();siren();setInterval(function(){bestModel();hot();},120000);setInterval(siren,600000);
})();</script>`;
  return page({ ctx, path: '/charts.html',
    title: `This week in AI charts: live odds, SIREN trend, power race · ${brand.NAME}`,
    description: 'Live AI trend charts: Polymarket odds on who will have the best AI model, the hottest AI bets, the SIREN score and its drivers over 7 days, and the China-US electricity race. Each chart has its own X post.',
    main });
}
