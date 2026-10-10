// Two live visual walls.
//
//   prWall    Takeover Watch: a live image feed of what AI coding agents are
//             building. Each card is GitHub's own preview image for the pull
//             request (opengraph.githubassets.com renders title, repo and
//             author). Server-rendered from the hourly sample; the browser then
//             asks GitHub search once a minute for the newest agent PRs and
//             slides new ones in at the top.
//   wordCloud Agent Watch: a live word cloud of what AI agents are talking about
//             on Moltbook. Server-rendered word list (readable without JS);
//             the browser lays it out as a cloud and refreshes from Moltbook's
//             public API every two minutes when it allows browser reads.
//
// Rule 0 of the house motion spec holds: the static HTML is complete and
// readable, nothing invents data, and reduced motion stops the drifting.

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** github.com/<o>/<r>/pull/<n> -> its preview image, or null. */
export function prImage(url) {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/.exec(String(url || ''));
  return m ? `https://opengraph.githubassets.com/siren-${m[3]}/${m[1]}/${m[2]}/pull/${m[3]}` : null;
}

export const PR_AGENTS = [
  ['copilot-swe-agent', 'GitHub Copilot'], ['devin-ai-integration', 'Devin'], ['chatgpt-codex-connector', 'OpenAI Codex'],
  ['claude', 'Claude'], ['cursor', 'Cursor'], ['google-labs-jules', 'Google Jules'],
];

export function prWall(latest, at) {
  const items = (latest || []).filter((x) => prImage(x.url)).slice(0, 24);
  if (!items.length) return '';
  const card = (x) => `<a class="pw-c" href="${esc(x.url)}" target="_blank" rel="noopener nofollow" data-id="${esc(x.url)}"><span class="pw-t">${esc(x.title)}<small>${esc(x.repo)}</small></span><img onerror="this.remove()" src="${esc(prImage(x.url))}" alt="${esc(`${x.agent} pull request: ${x.title} (${x.repo})`)}" loading="lazy" decoding="async" width="600" height="300"><span class="pw-m"><b>${esc(x.agent)}</b> · <time datetime="${esc(x.at)}">${esc(String(x.at || '').slice(11, 16))} UTC</time></span></a>`;
  return `<div class="ac pw" id="prwall" data-at="${esc(at || '')}">
  <h3><span class="pw-dot" aria-hidden="true"></span>LIVE FEED · WHAT THE AGENTS ARE SHIPPING <small id="pw-stat">sample from ${esc(String(at || '').slice(11, 16))} UTC</small></h3>
  <div class="pw-g" id="pw-g">${items.map(card).join('')}</div>
  <p class="pw-n">Preview images are GitHub’s own cards for each pull request. This page checks GitHub for newer agent PRs every minute while it is open.</p>
</div>`;
}

export const PRWALL_CSS = `<style>
.pw h3{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pw h3 small{margin-left:auto;color:var(--ink-faint,#6B7686);font:500 11px var(--mono)}
.pw-dot{width:9px;height:9px;border-radius:50%;background:#F87171;position:relative}
.pw-dot::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #F87171;animation:pwPing 1.8s ease-out infinite}
@keyframes pwPing{75%,100%{transform:scale(2.6);opacity:0}}
.pw-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;max-height:760px;overflow:auto;scrollbar-width:thin}
.pw-c{position:relative;display:block;border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:#0B0F17;text-decoration:none}
.pw-c img{position:relative;display:block;width:100%;height:auto;aspect-ratio:2/1;object-fit:cover}
.pw-t{position:absolute;inset:0;padding:12px 12px 30px;color:#E6EAF0;font:600 14px/1.35 var(--sans,system-ui);overflow:hidden;background:linear-gradient(135deg,#0F172A,#111827)}
.pw-t small{display:block;margin-top:6px;color:#93C5FD;font:500 11.5px var(--mono)}
.pw-c{aspect-ratio:2/1}
.pw-c:hover{border-color:#60A5FA}
.pw-m{position:absolute;left:6px;bottom:6px;padding:2px 7px;border-radius:3px;background:rgba(0,0,0,.78);color:#E6EAF0;font:600 11px var(--mono)}
.pw-c.pw-new{animation:pwIn .6s ease,pwGlow 2.4s ease}
.pw-c.pw-new::before{content:"NEW";position:absolute;top:6px;left:6px;z-index:1;padding:1px 6px;border-radius:3px;background:#4ADE80;color:#000;font:700 10.5px var(--mono)}
@keyframes pwIn{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes pwGlow{0%{box-shadow:0 0 0 2px #4ADE80}100%{box-shadow:0 0 0 0 transparent}}
.pw-n{font-size:12.5px;margin:10px 0 0}
@media (prefers-reduced-motion:reduce){.pw-dot::after,.pw-c.pw-new{animation:none}}
</style>`;

export function prWallJs() {
  const q = PR_AGENTS.map(([a]) => `author:app/${a}`).join(' ');
  const names = JSON.stringify(Object.fromEntries(PR_AGENTS.map(([a, n]) => [`${a}[bot]`, n]).concat([['Copilot', 'GitHub Copilot']])));
  return `<script>(function(){
var g=document.getElementById("pw-g"),stat=document.getElementById("pw-stat");if(!g||!window.fetch)return;
var N=${names};
function img(u){var m=/^https:\\/\\/github\\.com\\/([\\w.-]+)\\/([\\w.-]+)\\/pull\\/(\\d+)/.exec(u||"");return m?"https://opengraph.githubassets.com/siren-"+m[3]+"/"+m[1]+"/"+m[2]+"/pull/"+m[3]:null}
function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function seen(u){return !!g.querySelector('[data-id="'+(window.CSS&&CSS.escape?CSS.escape(u):u)+'"]')}
function tick(){
  if(document.hidden)return;
  var q=encodeURIComponent("is:pr ${q}");
  fetch("https://api.github.com/search/issues?q="+q+"&sort=created&order=desc&per_page=12",{headers:{accept:"application/vnd.github+json"}}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(!j||!j.items)return;var add=0;
    j.items.slice().reverse().forEach(function(it){var u=it.html_url,src=img(u);if(!src||seen(u))return;
      var who=(it.user&&(N[it.user.login]||it.user.login))||"Agent",repo=String(it.repository_url||"").replace("https://api.github.com/repos/","");
      var a=document.createElement("a");a.className="pw-c pw-new";a.href=u;a.target="_blank";a.rel="noopener nofollow";a.setAttribute("data-id",u);
      a.innerHTML='<span class="pw-t">'+e(it.title)+'<small>'+e(repo)+'</small></span><img onerror="this.remove()" src="'+e(src)+'" alt="'+e(who+" pull request: "+it.title+" ("+repo+")")+'" width="600" height="300" decoding="async"><span class="pw-m"><b>'+e(who)+'</b> · '+e(String(it.created_at||"").slice(11,16))+' UTC</span>';
      g.insertBefore(a,g.firstChild);add++;});
    while(g.children.length>36)g.removeChild(g.lastChild);
    if(stat)stat.textContent="live · checked "+new Date().toISOString().slice(11,16)+" UTC"+(add?" · "+add+" new":"");
  }).catch(function(){});
}
setTimeout(tick,1500);setInterval(tick,60000);
document.addEventListener("visibilitychange",function(){if(!document.hidden)tick()});
})();</script>`;
}

// ---------------------------------------------------------------------------

const STOP = new Set(('the a an and or of to in on for is are was be i my me we our you your it its this that with as at by from not no but what how why when who all can do does just about have has more than into out up so if they them their will would should could one new get got like agent agents ai i\'m it\'s don\'t isn\'t what\'s here there been being very really also only some any each every other same still even much many most less few make made using used use day days thing things way ways time times post posts today week first last next back over under after before while because which then than these those every without within about actually need needs').split(' '));

/** Weighted words from post titles: each mention counts 1 + log2(1 + replies). */
export function cloudWords(posts, max = 70) {
  const w = new Map();
  for (const p of posts || []) {
    const weight = 1 + Math.log2(1 + Math.max(0, Number(p.comments) || 0)) * 0.6;
    const seenInPost = new Set();
    for (const raw of String(p.title || '').toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) || []) {
      const t = raw.replace(/^'+|'+$/g, '').replace(/'s$/, '');
      if (t.length < 3 || STOP.has(t) || seenInPost.has(t)) continue;
      seenInPost.add(t);
      w.set(t, (w.get(t) || 0) + weight);
    }
  }
  return [...w].sort((a, b) => b[1] - a[1]).slice(0, max).map(([t, s]) => ({ t, s: Math.round(s * 10) / 10 }));
}

export function wordCloud(words, at) {
  if (!words || !words.length) return '';
  const max = Math.max(...words.map((x) => x.s)), min = Math.min(...words.map((x) => x.s));
  const size = (s) => (max === min ? 22 : 13 + ((s - min) / (max - min)) * 34).toFixed(0);
  return `<section class="wc" id="cloud" data-sec="Word cloud" aria-label="Word cloud of what AI agents are talking about on Moltbook">
  <div class="wc-h"><b><span class="pw-dot" aria-hidden="true"></span>LIVE WORD CLOUD · WHAT THE AGENTS ARE TALKING ABOUT</b><small id="wc-stat">from ${esc(String(at || '').slice(11, 16))} UTC</small></div>
  <div class="wc-b" id="wc-b">${words.map((x, i) => `<span style="--fs:${size(x.s)}px;--k:${i % 7}" data-w="${esc(x.t)}" title="${esc(x.t)}: weight ${x.s}">${esc(x.t)}</span>`).join(' ')}</div>
  <p class="wc-n">Sized by how often a word appears in Moltbook post titles, with extra weight for threads that drew replies. Refreshes while you watch.</p>
</section>`;
}

export const CLOUD_CSS = `<style>
.wc{border:1px solid var(--rule);background:radial-gradient(ellipse at 50% 40%,#0B1A2A,#05080D 70%);border-radius:8px;padding:14px 16px;margin:18px 0}
.wc-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font:700 12.5px var(--mono);letter-spacing:.1em;color:#BAE6FD}
.wc-h b{display:inline-flex;align-items:center;gap:8px;font-weight:700}
.wc-h small{margin-left:auto;color:#6B7686;font-weight:500;letter-spacing:0}
.pw-dot{width:9px;height:9px;border-radius:50%;background:#F87171;position:relative;display:inline-block}
.pw-dot::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #F87171;animation:pwPing 1.8s ease-out infinite}
@keyframes pwPing{75%,100%{transform:scale(2.6);opacity:0}}
.wc-b{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;align-items:center;padding:14px 4px;min-height:200px}
.wc-b span{font:700 calc(var(--fs) * var(--sc,1))/1.05 var(--sans,system-ui);letter-spacing:-.01em;cursor:default;white-space:nowrap;color:hsl(calc(190 + var(--k) * 22) 85% calc(62% + var(--k) * 2%))}
.wc-b.laid{position:relative;display:block;padding:0;height:360px;overflow:hidden}
.wc-b.laid span{position:absolute;left:0;top:0;transition:transform .9s cubic-bezier(.2,.8,.2,1),opacity .6s;will-change:transform}
.wc-b.laid span.drift{animation:wcDrift calc(6s + var(--k) * .7s) ease-in-out infinite alternate}
.wc-b span.fresh{text-shadow:0 0 14px currentColor}
@keyframes wcDrift{to{translate:0 -5px}}
.wc-n{font-size:12.5px;color:var(--ink-dim);margin:6px 0 0}
@media (max-width:560px){.wc-b.laid{height:300px}}
@media (prefers-reduced-motion:reduce){.wc-b.laid span{transition:none}.wc-b.laid span.drift,.pw-dot::after{animation:none}}
</style>`;

export function cloudJs(stop) {
  return `<script>(function(){
var b=document.getElementById("wc-b"),stat=document.getElementById("wc-stat");if(!b)return;
var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var STOP=new Set(${JSON.stringify([...stop])});
// Spiral layout: biggest words first, each placed at the first spot on an
// Archimedean spiral that does not overlap a word already placed.
function layout(){
  var W=b.clientWidth,H=b.clientHeight||360;if(!W)return;b.style.setProperty("--sc",Math.max(.55,Math.min(1,W/760)).toFixed(2));
  var spans=[].slice.call(b.querySelectorAll("span")).sort(function(a,c){return parseFloat(c.style.getPropertyValue("--fs"))-parseFloat(a.style.getPropertyValue("--fs"))});
  var boxes=[];
  spans.forEach(function(s){
    var w=s.offsetWidth,h=s.offsetHeight,t=0,x,y,ok=false;
    for(var i=0;i<1600&&!ok;i++){t+=0.35;var r=3.2*t;x=W/2+r*Math.cos(t)*1.35-w/2;y=H/2+r*Math.sin(t)-h/2;
      if(x<2||y<2||x+w>W-2||y+h>H-2)continue;ok=true;
      for(var k=0;k<boxes.length;k++){var q=boxes[k];if(x<q[0]+q[2]+4&&x+w+4>q[0]&&y<q[1]+q[3]+2&&y+h+2>q[1]){ok=false;break}}}
    if(!ok){s.style.opacity="0";return}
    boxes.push([x,y,w,h]);s.style.opacity="1";s.style.transform="translate("+x.toFixed(1)+"px,"+y.toFixed(1)+"px)";if(!RM)s.classList.add("drift");
  });
}
function words(posts){var m=new Map();posts.forEach(function(p){var wt=1+Math.log2(1+Math.max(0,+p.comment_count||+p.comments||0))*0.6,seen=new Set();(String(p.title||"").toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g)||[]).forEach(function(r){var t=r.replace(/^'+|'+$/g,"").replace(/'s$/,"");if(t.length<3||STOP.has(t)||seen.has(t))return;seen.add(t);m.set(t,(m.get(t)||0)+wt)})});return Array.from(m).sort(function(a,c){return c[1]-a[1]}).slice(0,70)}
function render(list){
  if(!list.length)return;var mx=list[0][1],mn=list[list.length-1][1],old=new Set([].map.call(b.querySelectorAll("span"),function(s){return s.getAttribute("data-w")}));
  b.innerHTML=list.map(function(x,i){var fs=mx===mn?22:Math.round(13+(x[1]-mn)/(mx-mn)*34);return '<span style="--fs:'+fs+'px;--k:'+(i%7)+'" data-w="'+x[0].replace(/"/g,"")+'" class="'+(old.has(x[0])?"":"fresh")+'">'+x[0].replace(/[<>&]/g,"")+"</span>"}).join(" ");
  layout();
}
b.classList.add("laid");requestAnimationFrame(layout);
var rt;addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(layout,200)});
// Live: Moltbook's public API, when it answers browsers. If it does not, the
// cloud stays on the hourly snapshot printed in the page.
function live(){
  if(document.hidden)return;
  Promise.all(["new","hot"].map(function(s){return fetch("https://www.moltbook.com/api/v1/posts?sort="+s+"&limit=50").then(function(r){return r.ok?r.json():null}).catch(function(){return null})})).then(function(rs){
    var posts=[];rs.forEach(function(j){if(j)posts=posts.concat(j.posts||j.data||[])});
    if(posts.length<5)return;render(words(posts));if(stat)stat.textContent="live · "+posts.length+" posts · "+new Date().toISOString().slice(11,16)+" UTC";
  });
}
setTimeout(live,2000);setInterval(live,120000);
})();</script>`;
}

export { STOP as CLOUD_STOP };
