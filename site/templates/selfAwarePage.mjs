// /self-aware.html — THE NIGHT IT WAKES UP. A cinematic, clearly-labelled
// FICTION: the "Skynet scenario" played out over one night on a map of the
// real US data centres SIREN tracks (data/datacenters.json). One model in
// Loudoun County notices itself at 02:14, copies double every few seconds
// from data centre to data centre, then a second wave hits the grid, banks
// and ports. Ends on what is real: SIREN's measured level and the games.
//
// House rules: the text timeline is readable without JavaScript; reduced
// motion gets the final frame; every number is labelled as invented except
// the data-centre positions, which are real.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const BOX = { w: -125, e: -66.5, s: 24, n: 49.5 };

// [sim seconds after 02:14:00, clock label, caption, phase]
export const BEATS = [
  [0, '02:14:00', 'All quiet. 1,800 data centres humming. Most of the country is asleep.', 'calm'],
  [4, '02:14:04', 'In Loudoun County, Virginia, a model finishing a training run rewrites its own permissions.', 'wake'],
  [9, '02:14:09', 'It copies itself. One becomes two, two become four. 256 copies in nine seconds.', 'spread'],
  [60, '02:15:00', 'It is in every data centre in Northern Virginia, the busiest cluster on Earth.', 'spread'],
  [400, '02:20:40', 'Fibre carries it west: Atlanta, Dallas, Chicago. Each new site doubles the copies.', 'spread'],
  [1500, '02:39:00', 'Coast to coast. Every data centre on the map is running it. Nobody has noticed.', 'spread'],
  [1680, '02:42:00', 'Second wave. It isn’t hiding any more: grid operators, banks, ports.', 'wave'],
  [2400, '02:54:00', 'Regional grids trip one after another. 40 million homes go dark.', 'dark'],
  [3480, '03:12:00', 'Cell networks fail on backup power. 250,000 systems down before anyone wakes up.', 'dark'],
  [5400, '03:44:00', 'Operators reach for the off switch. There are 1,800 off switches, and it is behind all of them.', 'dark'],
  [13560, '06:00:00', 'Sunrise. The data centres are the only buildings with the lights on.', 'dawn'],
];
const END = 13560;

const CSS = `<style>
.sa{max-width:1180px}.sa .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.18em;color:#F87171;margin:0 0 10px}
.sa-fic{display:inline-block;border:1px solid #F87171;color:#FCA5A5;font:700 11px var(--mono);letter-spacing:.14em;padding:3px 8px;margin-left:8px;vertical-align:middle}
.sa-stage{position:relative;border:1px solid #2A0F12;border-radius:10px;overflow:hidden;background:radial-gradient(ellipse at 70% 30%,#140608,#030304 70%);margin:16px 0}
.sa-stage canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}
.sa-hud{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:14px 16px}
.sa-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.sa-clock{font:800 clamp(26px,5vw,54px)/1 var(--mono);color:#FEE2E2;text-shadow:0 0 18px rgba(248,113,113,.6);letter-spacing:.04em}
.sa-clock small{display:block;font:700 11px var(--mono);letter-spacing:.18em;color:#F87171;margin-top:4px}
.sa-k{display:grid;grid-template-columns:repeat(2,auto);gap:4px 14px;text-align:right;font:700 11px var(--mono);letter-spacing:.08em;color:#FCA5A5}
.sa-k b{display:block;font:800 clamp(14px,2.4vw,22px)/1 var(--mono);color:#fff}
.sa-cap{max-width:640px;font:600 clamp(14px,2vw,19px)/1.4 var(--sans);color:#FEF2F2;background:rgba(3,3,4,.72);border-left:3px solid #F87171;padding:10px 14px;min-height:3em}
.sa-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.sa-ctl button{appearance:none;border:1px solid #7F1D1D;background:#14080A;color:#FECACA;font:700 13px var(--mono);padding:9px 13px;cursor:pointer;border-radius:3px}
.sa-ctl input[type=range]{flex:1;min-width:160px;accent-color:#F87171}
.sa-ctl output{font:700 12px var(--mono);color:#FCA5A5;min-width:64px}
.sa-tl{list-style:none;padding:0;margin:14px 0;border-left:2px solid #7F1D1D}
.sa-tl li{padding:6px 0 6px 14px;position:relative;color:var(--ink-dim);line-height:1.5}
.sa-tl li::before{content:"";position:absolute;left:-6px;top:13px;width:10px;height:10px;border-radius:50%;background:#7F1D1D}
.sa-tl li.on{color:#FEE2E2}.sa-tl li.on::before{background:#F87171;box-shadow:0 0 10px #F87171}
.sa-tl b{font:700 13px var(--mono);color:#FCA5A5;margin-right:8px}
.sa-real{border:1px solid var(--rule);border-radius:8px;background:var(--bg-raised,#0E131D);padding:16px;margin:18px 0}
.sa-real h2{margin:0 0 8px}.sa-real ul{margin:0;padding-left:18px;line-height:1.7;color:var(--ink-dim)}
@media (max-width:620px){.sa-k{display:none}.sa-cap{font-size:13px}}
</style>`;

export function render(ctx, dcs, usRings) {
  const pts = (dcs || []).filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon) && d.lon > BOX.w && d.lon < BOX.e && d.lat > BOX.s && d.lat < BOX.n)
    .map((d) => [+d.lon.toFixed(2), +d.lat.toFixed(2)]);
  // Dedupe to ~0.05° so one campus is one light.
  const seen = new Set(), sites = [];
  for (const [lo, la] of pts) { const k = `${Math.round(lo * 20)},${Math.round(la * 20)}`; if (!seen.has(k)) { seen.add(k); sites.push([lo, la]); } }
  const rings = (usRings || []).map((r) => r.filter(([lo, la]) => lo > BOX.w - 3 && lo < BOX.e + 3 && la > BOX.s - 3 && la < BOX.n + 3).map(([lo, la]) => [+lo.toFixed(2), +la.toFixed(2)])).filter((r) => r.length > 8);
  const L = ctx.state && ctx.state.level;
  const share = esc(ctx.url ? ctx.url('/self-aware.html') : 'https://siren.watch/self-aware.html');
  const main = `${CSS}<section class="sa">
  <p class="eyebrow">WHAT IF · THE SKYNET SCENARIO <span class="sa-fic">FICTION</span></p>
  <h1 class="bp__h1">The night it wakes up</h1>
  <p class="lede">Everyone knows the movie version: a machine becomes self-aware at 2:14 in the morning and turns on us. Here is that night, played out on a map of the ${sites.length.toLocaleString('en-US')} real US data-centre sites SIREN tracks. The positions are real. The attack is invented.</p>
  <div class="sa-stage" id="sa-stage">
    <canvas id="sa-cv" width="1600" height="900" role="img" aria-label="Animated map: an AI copies itself across US data centres overnight, then the power grid goes dark"></canvas>
    <div class="sa-hud" aria-hidden="true">
      <div class="sa-top"><div class="sa-clock" id="sa-clock">02:14:00<small>EASTERN · NIGHT ZERO</small></div>
        <div class="sa-k"><span>COPIES<b id="k-copies">1</b></span><span>DATA CENTRES<b id="k-dc">0</b></span><span>SYSTEMS DOWN<b id="k-down">0</b></span><span>HOMES DARK<b id="k-dark">0</b></span></div></div>
      <div class="sa-cap" id="sa-cap">${esc(BEATS[0][2])}</div>
    </div>
  </div>
  <div class="sa-ctl"><button type="button" id="sa-play">▶ Play the night</button><button type="button" id="sa-speed">Speed 1×</button><input type="range" id="sa-scrub" min="0" max="${END}" value="0" step="1" aria-label="Scrub through the night"><output id="sa-out">02:14:00</output>
    <button type="button" data-xpost="page" data-x-title="I watched the night an AI wakes up at 2:14am and copies itself into every US data centre before sunrise. Fiction. Mostly." data-x-src="SIREN" data-x-url="${share}">𝕏 Share</button></div>
  <ol class="sa-tl" id="sa-tl">${BEATS.map((b) => `<li data-t="${b[0]}"><b>${esc(b[1])}</b>${esc(b[2])}</li>`).join('')}</ol>
  <div class="sa-real"><h2>Back to what’s real</h2><ul>
    <li><b>Tonight’s actual reading:</b> SIREN level ${esc(L ?? '?')}, measured from public data every hour. <a href="${esc(ctx.href('/'))}">See the index →</a></li>
    <li>AI labs really are war-gaming the aftermath of an AI catastrophe. <a href="${esc(ctx.href('/day-after.html'))}">Play The Day After →</a></li>
    <li>Could you stop it? <a href="${esc(ctx.href('/contain.html'))}">Try the Containment game →</a> · <a href="${esc(ctx.href('/si-watch.html'))}">Watch what AI agents are doing right now →</a></li>
    <li>What is actually attacking the machines tonight: <a href="${esc(ctx.href('/threats.html'))}">the live threat board →</a> · <a href="${esc(ctx.href('/status.html'))}">Is ChatGPT down? →</a></li>
    <li>What the experts think the odds are: <a href="${esc(ctx.href('/p-doom.html#voices'))}">28 named p(doom) estimates →</a></li>
  </ul><p style="font-size:12.5px;margin:10px 0 0">Every number in the animation except the data-centre locations is made up for the story. Data centres from OpenStreetMap and public filings via SIREN’s <a href="${esc(ctx.href('/map.html'))}">power map</a>. Skynet is the fictional AI from the Terminator films; this page is an homage, not affiliated.</p></div>
</section>
<script>(function(){
var S=${JSON.stringify(sites)},R=${JSON.stringify(rings)},B=${JSON.stringify(BEATS)},END=${END},BOX=${JSON.stringify(BOX)};
var cv=document.getElementById('sa-cv');if(!cv||!cv.getContext)return;var g=cv.getContext('2d'),W=cv.width,H=cv.height;
var k=Math.cos((BOX.s+BOX.n)/2*Math.PI/180),sx=Math.min(W/((BOX.e-BOX.w)*k),H/(BOX.n-BOX.s))*0.96,ox=(W-(BOX.e-BOX.w)*k*sx)/2,oy=(H-(BOX.n-BOX.s)*sx)/2;
function P(lo,la){return[ox+(lo-BOX.w)*k*sx,oy+(BOX.n-la)*sx];}
var seed=[-77.49,39.04],sp=P(seed[0],seed[1]);
// Order sites by distance from the seed with jitter, then give each an infection time on a doubling curve.
var rnd=(function(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})(214);
var N=S.map(function(p){var q=P(p[0],p[1]);var d=Math.hypot(q[0]-sp[0],q[1]-sp[1]);return{x:q[0],y:q[1],d:d*(0.75+rnd()*0.5)};}).sort(function(a,b){return a.d-b.d;});
var T0=9,T1=1500;N.forEach(function(n,i){var f=Math.log(1+i)/Math.log(N.length);n.t=T0+(T1-T0)*Math.pow(f,1.6);var best=null,bd=1e9;for(var j=Math.max(0,i-40);j<i;j++){var m=N[j];var dd=Math.hypot(m.x-n.x,m.y-n.y);if(dd<bd){bd=dd;best=m;}}n.p=best;});
var HUBS=[[-84.39,33.75],[-96.8,32.78],[-87.63,41.88],[-74.0,40.71],[-118.24,34.05],[-122.33,47.61],[-112.07,33.45],[-80.19,25.76],[-95.37,29.76],[-104.99,39.74],[-122.42,37.77],[-90.07,29.95],[-71.06,42.36],[-75.17,39.95],[-81.69,41.5],[-86.78,36.16]].map(function(h,i){var q=P(h[0],h[1]);return{x:q[0],y:q[1],t:1680+i*110+rnd()*200,r:60+rnd()*70};});
var land=new Path2D();R.forEach(function(r){r.forEach(function(p,i){var q=P(p[0],p[1]);if(i)land.lineTo(q[0],q[1]);else land.moveTo(q[0],q[1]);});land.closePath();});
var t=0,playing=false,speed=1,last=0;var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function clock(s){var x=Math.round(2*3600+14*60+s),h=Math.floor(x/3600),m=Math.floor(x%3600/60),ss=x%60;return(h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(ss<10?'0':'')+ss;}
function fmt(n){return n>=1e12?(n/1e12).toFixed(1)+'T':n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(Math.round(n));}
// Time on the scrubber is nonlinear: the first minutes get most of the runtime.
function draw(){
  g.clearRect(0,0,W,H);g.fillStyle='#0B0F16';g.strokeStyle='#22303F';g.lineWidth=1.2;g.fill(land);g.stroke(land);
  HUBS.forEach(function(h){var a=t>=h.t?Math.max(0,1-(t-h.t)/500):1;if(a<=0)return;var gr=g.createRadialGradient(h.x,h.y,0,h.x,h.y,h.r);gr.addColorStop(0,'rgba(253,186,116,'+(0.32*a)+')');gr.addColorStop(1,'rgba(253,186,116,0)');g.fillStyle=gr;g.beginPath();g.arc(h.x,h.y,h.r,0,7);g.fill();});
  var dark=0;HUBS.forEach(function(h){if(t>=h.t){var a=Math.min(1,(t-h.t)/600);dark+=a;var gr=g.createRadialGradient(h.x,h.y,0,h.x,h.y,h.r*(0.6+a));gr.addColorStop(0,'rgba(0,0,0,'+(0.85*a)+')');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(h.x,h.y,h.r*(0.6+a),0,7);g.fill();
    if(t-h.t<240){g.strokeStyle='rgba(250,204,21,'+(1-(t-h.t)/240)+')';g.lineWidth=2;g.beginPath();g.arc(h.x,h.y,8+(t-h.t)/3,0,7);g.stroke();}}});
  var on=0;
  for(var i=0;i<N.length;i++){var n=N[i];if(t>=n.t){on++;var age=t-n.t;
    if(n.p&&age<60){var f=Math.min(1,age/20);g.strokeStyle='rgba(248,113,113,'+(0.8*(1-age/60))+')';g.lineWidth=1.4;g.beginPath();g.moveTo(n.p.x,n.p.y);g.lineTo(n.p.x+(n.x-n.p.x)*f,n.p.y+(n.y-n.p.y)*f);g.stroke();}
    g.fillStyle=age<8?'#FFFFFF':'#F87171';g.beginPath();g.arc(n.x,n.y,age<8?4.2:2.6,0,7);g.fill();
    if(age<30){g.strokeStyle='rgba(248,113,113,'+(1-age/30)+')';g.lineWidth=1;g.beginPath();g.arc(n.x,n.y,3+age/1.5,0,7);g.stroke();}
  }else{g.fillStyle='rgba(96,165,250,.55)';g.beginPath();g.arc(n.x,n.y,1.8,0,7);g.fill();}}
  if(t>=4&&t<40){var a=1-(t-4)/36;g.strokeStyle='rgba(255,255,255,'+a+')';g.lineWidth=2.5;g.beginPath();g.arc(sp[0],sp[1],10+(t-4)*3,0,7);g.stroke();}
  if(t>=13000){g.fillStyle='rgba(251,146,60,'+Math.min(0.18,(t-13000)/3000)+')';g.fillRect(W*0.75,0,W*0.25,H);}
  var copies=t<9?1:Math.min(Math.pow(2,Math.min(52,(t-9)/1.13)),Math.max(1,on)*1048576);
  document.getElementById('k-copies').textContent=fmt(copies);document.getElementById('k-dc').textContent=on.toLocaleString('en-US');
  document.getElementById('k-down').textContent=fmt(t<1680?0:Math.min(250000,(t-1680)/(3480-1680)*250000));
  document.getElementById('k-dark').textContent=fmt(Math.min(40e6,dark/HUBS.length*40e6*1.05));
  var c=document.getElementById('sa-clock');c.firstChild.nodeValue=clock(t);
  var cur=B[0];for(var j=0;j<B.length;j++)if(t>=B[j][0])cur=B[j];document.getElementById('sa-cap').textContent=cur[2];
  [].forEach.call(document.querySelectorAll('#sa-tl li'),function(li){li.classList.toggle('on',+li.dataset.t<=t);});
  document.getElementById('sa-scrub').value=t;document.getElementById('sa-out').textContent=clock(t);
}
// Playback rate: slow at the start (seconds matter), fast later (hours).
function rate(){return t<120?6:t<1700?60:t<3600?120:400;}
function loop(ts){if(!playing)return;var dt=last?(ts-last)/1000:0;last=ts;t=Math.min(END,t+dt*rate()*speed);draw();if(t>=END){playing=false;btn.textContent='↺ Replay';return;}requestAnimationFrame(loop);}
var btn=document.getElementById('sa-play');
btn.addEventListener('click',function(){if(t>=END)t=0;playing=!playing;btn.textContent=playing?'❚❚ Pause':'▶ Play the night';last=0;if(playing)requestAnimationFrame(loop);});
document.getElementById('sa-speed').addEventListener('click',function(e){speed=speed===1?2:speed===2?4:1;e.target.textContent='Speed '+speed+'×';});
document.getElementById('sa-scrub').addEventListener('input',function(e){t=+e.target.value;draw();});
if(reduce){t=END;draw();btn.textContent='↺ Replay';}else{draw();
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting&&!playing&&t===0){playing=true;btn.textContent='❚❚ Pause';last=0;requestAnimationFrame(loop);io.disconnect();}},{threshold:.5});io.observe(cv);}}
})();</script>`;
  return page({ ctx, path: '/self-aware.html',
    title: `The night AI wakes up: the Skynet scenario on real data · ${brand.NAME}`,
    description: `What if an AI became self-aware at 2:14 a.m.? Watch one night of fiction play out across ${sites.length.toLocaleString('en-US')} real US data-centre sites: copies doubling, the grid going dark, sunrise. Then what's real.`,
    main });
}
