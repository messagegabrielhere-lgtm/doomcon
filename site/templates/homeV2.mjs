// The homepage, PizzINT-style: one glowing level banner, an icon dock, the
// bosses on watch, the labs as monitored "locations", and two small charts.
// Everything is server-rendered: the level, the score and every count are text
// or inline SVG in the HTML, so the build's self-check and every screenshot see
// them without a script. The only script is the ticking UTC clock.
//
// The full instrument panel this replaced still builds, at /classic.html.
import { esc, num } from './_html.mjs';

import { blocks, pixelText, icon } from './_pixel.mjs';
import { sponsorLine, newsletterBox, tipLink, MZ_CSS, MONETIZE } from '../monetize.mjs';
import { whatMoved, alternativeSignals } from '../extras.mjs';
import { render as verifyBox, verifyCss } from './_verify.mjs';
import { PILLARS as BRAND_PILLARS } from '../brand.mjs';
const PILLAR_META = Object.fromEntries(BRAND_PILLARS.map((p) => [p.id, p]));

// ---------- copy ----------
const LEVEL = {
  5: { color: '#4FB3FF', ground: '#03101C', line: 'QUIET. TOO QUIET.' },
  4: { color: '#4ADE80', ground: '#03130A', line: 'THE MACHINES ARE WORKING LATE' },
  3: { color: '#FACC15', ground: '#151103', line: 'SOMETHING IS BEING TRAINED' },
  2: { color: '#FB923C', ground: '#170B03', line: 'CLEAR YOUR CALENDAR' },
  1: { color: '#F87171', ground: '#1A0505', line: 'NOBODY HAS SEEN THIS BEFORE' },
};
const FACE_BY_LEADER = { altman: 'altman', amodei: 'amodei', hassabis: 'hassabis', musk: 'musk', zuckerberg: 'zuck', huang: 'huang' };
const FACE_BY_LAB = { anthropic: 'amodei', 'google-deepmind': 'hassabis', openai: 'altman', meta: 'zuck', xai: 'musk' };
const BOSSES = ['altman', 'amodei', 'hassabis', 'musk', 'zuckerberg', 'huang'];

function hhmm(iso) { return String(iso || '').slice(11, 16) + 'Z'; }
function pct(p, d = 1) { return Number.isFinite(p) ? `${(p * 100).toFixed(d)}%` : '—'; }


// EVERY ROOM, promoted from the front page: one tile per feature, each with its
// own illustration, its live number where the data has one, and a one-line
// reason to click. Grouped so twenty-odd tiles still read at a glance.
export function roomGroups(ctx) {
  const r = ctx.routes || {};
  const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : null);
  const race = ctx.race && ctx.race.players ? ctx.race.players.slice().sort((a, b) => a.rank - b.rank)[0] : null;
  const lt = (ctx.leaders && ctx.leaders.totals) || {};
  const groups = [
    ['LIVE INTEL', [
      ['/race.html', 'radar', 'The Race', race && race.market ? `${race.name} ${(race.market.probability * 100).toFixed(1)}%` : null, 'Labs ranked on live prediction-market odds.'],
      ['/news.html', 'news', 'Newsroom', ctx.news && ctx.news.items ? `${ctx.news.items.length} stories` : null, 'Every AI story, scored and corroborated.'],
      ['/leaders.html', 'mic', 'Leaders', Number.isFinite(lt.leaders) ? `${lt.on_record ?? 0} of ${lt.leaders} on record` : null, 'What the people running AI said this week.'],
      ctx.digest ? ['/digest.html', 'clipboard', 'Digest', null, 'The day in a few corroborated items.'] : null,
      ['/monitor.html', 'satellite', 'World Monitor', null, 'Live globe: stories from 27 outlets, hazards, a country stress index, 72-hour replay.'],
      ['/elon.html', 'musk', 'Real Clips', null, 'Verified clips of Elon, Altman, Amodei and the AI bosses.'],
      ['/live-x.html', 'satellite', 'Live on X', null, 'Live X feeds and Spaces on AI, newest first.'],
      ['/videos.html', 'camera', 'SIREN TV', '6 videos', 'Short explainers: Tally, Skynet status, SI prep, your job.'],
      ['/radio.html', 'mic', 'SIREN Radio', '6 stations', 'Six stations of music generated live in your browser.'],
      ['/changelog.html', 'clipboard', 'What Moved', null, 'Every hour’s changes: score, pillars and top stories.'],
    ]],
    ['THE MACHINES', [
      ['/watts.html', 'power', 'Power', ctx.infra && Number.isFinite(ctx.infra.score) ? `${ctx.infra.score.toFixed(1)} / 100` : null, 'Grid load, drought and build-out under the models.'],
      ['/map.html', 'server', 'Map', ctx.datacenters && ctx.datacenters.sites ? `${fmt(ctx.datacenters.sites.length)} US sites` : null, 'Where the compute sits, against the water it needs.'],
      r.world ? ['/world.html', 'globe', 'World', ctx.world && ctx.world.totals ? `${fmt(ctx.world.totals.sites)} sites` : null, 'Every mapped datacentre on Earth, then orbit.'] : null,
      r.flock ? ['/flock.html', 'camera', 'Cameras', ctx.flock && ctx.flock.totals ? `${fmt(ctx.flock.totals.mapped_worldwide)} mapped` : null, 'Licence-plate readers volunteers have mapped.'] : null,
      r.exploits ? ['/exploits.html', 'bug', 'Exploits', null, 'Days from disclosure to exploited in the wild.'] : null,
    ]],
    ['PEOPLE', [
      r.balance ? ['/jobs.html', 'case', 'Jobs', null, 'Is AI taking jobs? What has been counted.'] : null,
      r.balance ? ['/medicine.html', 'pill', 'Medicine', null, 'Is AI curing anything? Trials and approvals.'] : null,
      r.balance ? ['/balance.html', 'scales', 'Balance', null, 'Harm and benefit, counted side by side.'] : null,
      ['/bliss.html', 'sun', 'Upside', null, 'The direction we would be glad to see move.'],
      ['/breakthroughs.html', 'sun', 'Breakthroughs', null, 'AI curing, solving and restoring: the good news, tracked.'],
      ['/ai-proof-job.html', 'case', 'AI-Proof Your Job', null, 'A 2-minute plan to keep your job and grow with AI.'],
    ]],
    ['PLAY & PREP', [
      ['/arena.html#battle', 'stocks', 'AI Battle', null, 'AI models trade stocks and crypto against live prices.'],
      ['/arena.html', 'clipboard', 'Stock Picks', null, 'Daily rule-based stock picks, scored in public.'],
      ['/scanner.html', 'magnifier', 'Scanner', null, 'Screen stocks, ETFs and crypto in plain English.'],
      ['/bets.html', 'dice', 'Tally’s Bets', null, 'Daily forecasts about the index, scored in public.'],
      ['/game.html', 'joystick', 'Game', null, 'Thirty seconds: count signals, ignore predictions.'],
      ['/desk.html', 'canary', 'Tally’s Desk', null, 'The unserious counts: robots and godfathers.'],
      ['/bunker-kit.html', 'bunker', 'Bunker Kit', null, '50 free tools and six crates of emergency gear.'],
      ['/si-ready.html', 'scales', 'Ready for SI?', null, 'Prepare for superintelligence: a 3-minute personal plan.'],
      ['/prepper-checklist.html', 'clipboard', 'Prepper Checklist', null, 'A 72-hour kit and two weeks at home, sized for you.'],
      ['/bug-out-land.html', 'globe', 'Bug-Out Land', null, 'Where to buy remote land to ride out Skynet.'],
      ['/library.html', 'books', 'Reading List', null, 'Books from every side of the AI argument.'],
    ]],
    ['THE RECORD', [
      ['/ai-doomsday-clock.html', 'clock', 'The Clock', null, 'The reading as a clock face you can verify.'],
      ['/history.html', 'archive', 'History', ctx.history ? `${ctx.history.length} readings` : null, 'Sixty years of the argument, and every reading.'],
      ['/methodology.html', 'magnifier', 'Methodology', null, 'Every formula. Recompute the number yourself.'],
      ['/classic.html', 'siren', 'Full Panel', null, 'The full instrument panel, receipts and API.'],
      ['/staff.html', 'server', 'The Staff', null, 'The automated crew that runs SIREN, at work together.'],
      ['/tally.html', 'canary', 'Tally', null, 'Meet the duty canary. Five moods, one for each level.'],
      ['/careers.html', 'case', 'Careers', null, 'Now hiring: AIs welcome to apply.'],
      ['/agents.html', 'globe', 'For AI Agents', null, 'Open data, skill.md and Moltbook: AIs welcome.'],
      ['/feedback.html', 'mic', 'Feedback', null, 'Report a problem or send an idea. We read every one.'],
      ['/alerts.html', 'siren', 'Alerts', null, 'Level changes, big moves, pillar spikes: RSS, email, X.'],
      ['/export.html', 'archive', 'Data & Embed', null, 'CSV, JSON and a live widget for your site.'],
      ['/bias.html', 'scales', 'Known Biases', null, 'Where SIREN’s sources skew, said plainly.'],
      ['/reference-plan.html', 'magnifier', 'Baseline Plan', null, 'How the frozen reference gets updated, versioned.'],
    ]],
  ];
  return groups.map(([g, items]) => [g, items.filter(Boolean)]).filter(([, l]) => l.length);
}

function roomsGrid(ctx, href, img) {
  const groups = roomGroups(ctx);
  return `<section class="v2-rooms" id="rooms" data-sec="Every room" aria-labelledby="v2-rooms-h">
  <h2 id="v2-rooms-h" class="v2-sr">Every room</h2>
  ${groups.map(([g, list]) => {
    return `<div class="v2-rgroup"><span class="v2-rgh">${esc(g)}</span><div class="v2-rgrid">${list.map(([p, art, label, n, blurb]) => `<a class="v2-room" href="${href(p)}"><img src="${img(art)}" width="56" height="56" alt="" loading="lazy"><span class="v2-room__t"><b>${esc(label.toUpperCase())}</b>${n ? `<i>${esc(n)}</i>` : ''}<small>${esc(blurb)}</small></span></a>`).join('')}</div></div>`;
  }).join('')}
</section>`;
}

// THE WAY AROUND. Three routes to every room, none needed to read the page:
// a sticky strip of every room's icon that stays on screen while you scroll;
// a Jump search (press / or Ctrl/Cmd-K, type a few letters, Enter); and on a
// phone, a thumb bar along the bottom with the busiest rooms and "All rooms".
function roomNav(ctx, href, img) {
  const all = roomGroups(ctx).flatMap(([g, l]) => l.map((x) => [...x, g]));
  const strip = `<nav class="v2-nav" aria-label="Every room"><div class="v2-wrap v2-nav__in">
  <a class="v2-nav__home" href="${href('/')}" aria-current="page"><img src="${img('siren')}" width="26" height="26" alt="">INDEX</a>
  <div class="v2-nav__scroll">${all.map(([p, art, label]) => `<a class="v2-nav__t" href="${href(p)}"><img src="${img(art)}" width="26" height="26" alt="" loading="lazy">${esc(label.toUpperCase())}</a>`).join('')}</div>
  <button class="v2-nav__jump" type="button" data-v2-jump aria-haspopup="dialog">JUMP <kbd>/</kbd></button>
</div></nav>`;
  const palette = `<dialog class="v2-pal" id="v2-pal" aria-label="Jump to a room"><div class="v2-pal__box">
  <input class="v2-pal__q" id="v2-pal-q" type="search" placeholder="Jump to… type a room name" aria-label="Filter rooms" autocomplete="off" spellcheck="false">
  <ul class="v2-pal__l">${[['#signal', 'Signal', 'The level, the score and the trend'], ['#breaking', 'Breaking', 'The top story right now'], ['#rooms', 'Every room', 'All features, grouped'], ['#bosses', 'Bosses', 'The AI leaders on watch'], ['#labs', 'Labs', 'The labs as monitored locations'], ['#trend', 'Trend', 'Charts: 24 hours to all time'], ['#loud', 'What’s loud', 'Every pillar explained'], ['#health', 'Health', 'Why a reading is degraded'], ['#tally', 'Tally', 'Follow the alerts on X']].map(([h, l, b], i) => `<li><a class="v2-pal__i v2-pal__i--sec" href="${h}" data-k="${esc(`${l} ${b} section on this page`.toLowerCase())}"><span class="v2-pal__num">${i + 1}</span><span><b>${esc(l)}</b><small>On this page · ${esc(b)} · key ${i + 1}</small></span></a></li>`).join('')}${all.map(([p, art, label, n, blurb, g]) => `<li><a class="v2-pal__i" href="${href(p)}" data-k="${esc(`${label} ${blurb} ${g}`.toLowerCase())}"><img src="${img(art)}" width="36" height="36" alt="" loading="lazy"><span><b>${esc(label)}</b><small>${esc(blurb)}</small></span>${n ? `<i>${esc(n)}</i>` : ''}</a></li>`).join('')}</ul>
  <p class="v2-pal__hint">↑ ↓ to move · Enter to open · Esc to close</p>
</div></dialog>`;
  const tab = [['/news.html', 'news', 'NEWS'], ['/race.html', 'radar', 'RACE'], ['/leaders.html', 'mic', 'LEADERS'], ['/monitor.html', 'satellite', 'MONITOR']];
  const tabbar = `<nav class="v2-tab" aria-label="Quick rooms">${tab.map(([p, a, l]) => `<a href="${href(p)}"><img src="${img(a)}" width="24" height="24" alt="">${l}</a>`).join('')}<button type="button" data-v2-jump><span class="v2-tab__grid" aria-hidden="true">▦</span>ALL</button></nav>`;
  return { strip, palette, tabbar };
}

const NAV_JS = `(function(){var d=document.getElementById('v2-pal');if(!d||!d.showModal)return;var q=document.getElementById('v2-pal-q');var items=[].slice.call(d.querySelectorAll('.v2-pal__i'));var cur=0;
function vis(){return items.filter(function(a){return a.parentNode.style.display!=='none'})}
function mark(){var v=vis();items.forEach(function(a){a.classList.remove('on')});if(v.length){cur=Math.max(0,Math.min(cur,v.length-1));v[cur].classList.add('on');v[cur].scrollIntoView({block:'nearest'})}}
function open(){q.value='';items.forEach(function(a){a.parentNode.style.display=''});cur=0;d.showModal();q.focus();mark()}
[].slice.call(document.querySelectorAll('[data-v2-jump]')).forEach(function(b){b.addEventListener('click',open)});
document.addEventListener('keydown',function(e){var t=e.target;var typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);if(((e.key==='/'&&!typing)||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'))&&!d.open){e.preventDefault();open()}});
q.addEventListener('input',function(){var k=q.value.trim().toLowerCase();items.forEach(function(a){a.parentNode.style.display=!k||a.getAttribute('data-k').indexOf(k)>=0?'':'none'});cur=0;mark()});
q.addEventListener('keydown',function(e){var v=vis();if(e.key==='ArrowDown'){e.preventDefault();cur++;mark()}else if(e.key==='ArrowUp'){e.preventDefault();cur--;mark()}else if(e.key==='Enter'&&v[cur]){e.preventDefault();d.close();location.href=v[cur].href}});
d.addEventListener('click',function(e){if(e.target===d||(e.target.closest&&e.target.closest('.v2-pal__i--sec')))d.close()})})();`;

const WAR_JS = `(function(){
var secs=[].slice.call(document.querySelectorAll('[data-sec]'));var l=document.getElementById('v2-rail-l');
if(l){secs.forEach(function(s,i){var li=document.createElement('li');var a=document.createElement('a');a.href='#'+s.id;a.innerHTML='<kbd>'+(i+1)+'</kbd>'+s.getAttribute('data-sec').toUpperCase();li.appendChild(a);l.appendChild(li)});}
var links=l?[].slice.call(l.querySelectorAll('a')):[];
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var i=secs.indexOf(e.target);links.forEach(function(a,j){a.classList.toggle('on',j===i)})}})},{rootMargin:'-30% 0px -60% 0px'});secs.forEach(function(s){io.observe(s)})}
document.addEventListener('keydown',function(e){var t=e.target;if(e.metaKey||e.ctrlKey||e.altKey||(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)))return;var d=document.getElementById('v2-pal');if(d&&d.open)return;
var n=parseInt(e.key,10);if(n>=1&&n<=secs.length){e.preventDefault();secs[n-1].scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+secs[n-1].id)}
else if(e.key==='t'||e.key==='Home'&&!e.shiftKey){if(e.key==='t'){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}}});
(function(){var N=window.SIREN_NOW,box=document.getElementById('v2-since');if(!N||!box)return;var K='siren:visit',P=null;try{P=JSON.parse(localStorage.getItem(K)||'null')}catch(e){}
try{localStorage.setItem(K,JSON.stringify({seen:Date.now(),score:N.score,level:N.level,leader:N.leader,lp:N.lp}))}catch(e){}
if(!P||!P.seen||Date.now()-P.seen<20*60000)return;var out=[],h=(Date.now()-P.seen)/36e5;
if(P.level!==N.level)out.push('<b>Level moved</b> SIREN '+P.level+' → <b>SIREN '+N.level+'</b>');
if(P.score!=null&&N.score!=null){var d=Math.round((N.score-P.score)*10)/10;out.push('Score '+P.score.toFixed(1)+' → <b>'+N.score.toFixed(1)+'</b>'+(d?' ('+(d>0?'▲':'▼')+Math.abs(d).toFixed(1)+')':' (no change)'))}
var nn=(N.news||[]).filter(function(t){return t>P.seen}).length;if(nn)out.push('<a href="news.html"><b>'+nn+'</b> new '+(nn===1?'story':'stories')+'</a>');
if(N.leader&&P.leader&&N.leader!==P.leader)out.push('<a href="race.html"><b>'+N.leader+'</b> took the lead from '+P.leader+'</a>');else if(N.leader&&P.lp!=null&&N.lp!=null&&Math.abs(N.lp-P.lp)>=0.5)out.push('<a href="race.html">'+N.leader+' '+P.lp.toFixed(1)+'% → <b>'+N.lp.toFixed(1)+'%</b></a>');
if(!out.length)return;var ago=h<1?Math.round(h*60)+' MIN':h<48?Math.round(h)+' H':Math.round(h/24)+' DAYS';
box.innerHTML='<span class="k">SINCE YOUR LAST VISIT · '+ago+' AGO</span><span class="v">'+out.join('<i>·</i>')+'</span><button type="button" aria-label="Dismiss">×</button>';box.hidden=false;box.querySelector('button').onclick=function(){box.hidden=true}})();
var f=document.getElementById('v2-fresh');if(f){var at=Date.parse(f.getAttribute('data-at'));var h=(Date.now()-at)/36e5;if(h>2){f.classList.add('stale');f.title='The newest reading is '+Math.round(h)+' hours old. The site normally refreshes every hour.';f.insertAdjacentHTML('beforeend',' · '+Math.round(h)+'H OLD')}}
})();`;


// TRACKING GRAPHICS, PizzINT-style: a week of readings as a banded area chart,
// a gauge per pillar, a light per source, and a scrolling headline ticker.
// All inline SVG/CSS drawn at build time from data/, so they cost no script.
const BAND = [[0, 35, '#4FB3FF'], [35, 55, '#4ADE80'], [55, 70, '#FFD23F'], [70, 85, '#FF8A2B'], [85, 100, '#FF3B3B']];
function weekChart(history) {
  const end = history.length ? Date.parse(history[history.length - 1].t) : Date.now();
  const pts = history.filter((h) => Number.isFinite(h.score) && end - Date.parse(h.t) <= 7 * 864e5);
  if (pts.length < 2) return '';
  const W = 720, H = 200, PL = 34, PB = 22, t0 = Date.parse(pts[0].t), span = Math.max(1, end - t0);
  const x = (t) => PL + ((Date.parse(t) - t0) / span) * (W - PL - 24);
  const y = (v) => 8 + (1 - v / 100) * (H - PB - 8);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.score).toFixed(1)}`).join('');
  const area = `${line}L${x(pts[pts.length - 1].t).toFixed(1)},${y(0)}L${x(pts[0].t).toFixed(1)},${y(0)}Z`;
  const bands = BAND.map(([a, b, c]) => `<rect x="${PL}" y="${y(b)}" width="${W - PL - 6}" height="${(y(a) - y(b)).toFixed(1)}" fill="${c}" opacity=".07"/><text x="${PL - 6}" y="${(y((a + b) / 2) + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="${c}" font-family="IBM Plex Mono,monospace">${5 - BAND.findIndex((q) => q[0] === a)}</text>`).join('');
  const days = []; for (let d = 0; d <= 7; d++) { const t = t0 + (span * d) / 7; days.push(`<text x="${(PL + (d / 7) * (W - PL - 24)).toFixed(1)}" y="${H - 6}" font-size="10" fill="#6B7686" text-anchor="middle" font-family="IBM Plex Mono,monospace">${new Date(t).toISOString().slice(5, 10)}</text>`); }
  const last = pts[pts.length - 1];
  return `<svg class="v2-week" viewBox="0 0 ${W} ${H}" role="img" aria-label="Composite score over the last 7 days, ${pts.length} readings, now ${last.score.toFixed(1)}">
<defs><linearGradient id="wkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4ADE80" stop-opacity=".45"/><stop offset="1" stop-color="#4ADE80" stop-opacity="0"/></linearGradient></defs>
${bands}<path d="${area}" fill="url(#wkg)"/><path d="${line}" fill="none" stroke="#4ADE80" stroke-width="2"/>
<circle cx="${x(last.t).toFixed(1)}" cy="${y(last.score).toFixed(1)}" r="5" fill="#4ADE80"><animate attributeName="r" values="4;8;4" dur="1.6s" repeatCount="indefinite"/></circle>${days}</svg>`;
}
const PILLAR_HUE = { capability: '#6ea8fe', compute: '#c792ea', attention: '#ffb020', governance: '#5fd08a', markets: '#ff8f6b' };
function gauges(pillars) {
  return (pillars || []).map((p) => {
    const v = Number.isFinite(p.score) ? p.score : null, c = PILLAR_HUE[p.id] || '#AEB7C3';
    const R = 34, C = Math.PI * R, frac = v == null ? 0 : v / 100;
    const label = v == null ? (p.dark ? 'DARK' : 'CALIBRATING') : v.toFixed(0);
    return `<div class="v2-gauge"><svg viewBox="0 0 90 56" aria-hidden="true"><path d="M11 50a34 34 0 0 1 68 0" fill="none" stroke="#1E2633" stroke-width="9" stroke-linecap="round"/>${v == null ? '' : `<path d="M11 50a34 34 0 0 1 68 0" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}"/>`}<text x="45" y="48" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-weight="700" font-size="${v == null ? 9 : 16}" fill="${v == null ? '#6B7686' : '#fff'}">${label}</text></svg><span style="color:${c}">${esc(String(p.name || p.id).toUpperCase())}</span></div>`;
  }).join('');
}
function sourceLights(sources) {
  return (sources || []).map((x) => {
    const st = x.ok ? 'src-live' : x.uncalibrated ? 'src-cal' : 'src-dark';
    return `<span class="v2-src ${st}" title="${esc(x.label || x.id)}: ${st === 'src-live' ? 'live and scored' : st === 'src-cal' ? 'reporting, awaiting baseline' : 'not answering'}"><i></i>${esc(String(x.label || x.id).toUpperCase())}</span>`;
  }).join('');
}
function ticker(items) {
  const top = (items || []).slice().sort((a, b) => String(b.published_at).localeCompare(String(a.published_at))).slice(0, 14);
  if (!top.length) return '';
  const run = top.map((i) => `<a href="${esc(i.url)}" rel="noopener">${esc(String(i.source).toUpperCase())} · ${esc(i.title)}</a>`).join('<b>◆</b>');
  return `<div class="v2-ticker" aria-label="Latest AI headlines"><span class="lbl">LIVE WIRE</span><div class="trk"><div class="run">${run}<b>◆</b>${run}</div></div></div>`;
}


// ---------- THE DASHBOARD (score first, then why) ----------
const SRC_NAME = { arxiv: 'arXiv preprints', 'github-releases': 'GitHub releases', huggingface: 'Hugging Face uploads', openrouter: 'OpenRouter models', 'sec-fts': 'SEC filings', stockanalysis: 'AI chip stocks', vastai: 'GPU rental prices', hn: 'Hacker News', wikipedia: 'Wikipedia pageviews', 'federal-register': 'US Federal Register', govuk: 'GOV.UK', kalshi: 'Kalshi', manifold: 'Manifold', polymarket: 'Polymarket' };
const RULE_TXT = {
  frozen_dark_pillar: 'The level is held while any pillar is dark, so a missing input can never move it.',
  deadband: 'The score is inside the dead band around the boundary, so the level holds.',
  dwell: 'The score has not stayed past the boundary long enough yet.',
  min_interval: 'Too soon after the last change; levels move at most once per window.',
  quorum: 'Not enough pillars agree with the move, so one loud pillar cannot drag the level.',
  locked: 'The level is locked after a recent change.',
  insufficient_history: 'Not enough recent readings to confirm a move.',
  no_live_pillars: 'No pillar is live, so nothing can be scored.',
  none: 'No boundary is close; the level simply holds.',
  escalate: 'The level just went up.', deescalate: 'The level just went down.', genesis: 'The first reading.',
};
const srcName = (x) => SRC_NAME[x.id] || x.label || x.id;
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function agoTxt(iso, nowMs) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return 'never';
  const m = Math.max(0, Math.round((nowMs - t) / 60000));
  return m < 2 ? 'just now' : m < 90 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}

function dial(state, L) {
  const v = Number.isFinite(state.score) ? state.score : 0;
  const cx = 160, cy = 150, R = 120, W = 22;
  const pt = (val, r) => { const a = Math.PI * (1 - val / 100); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const arc = (a, b, c) => { const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c}" stroke-width="${W}" fill="none" opacity="${v >= a && v < b ? 1 : 0.28}"/>`; };
  const ticks = [0, 35, 55, 70, 85, 100].map((t) => { const [a, b] = pt(t, R - 16), [c, d] = pt(t, R + 14); return `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c.toFixed(1)}" y2="${d.toFixed(1)}" stroke="#6B7686" stroke-width="2"/><text x="${pt(t, R + 28)[0].toFixed(1)}" y="${(pt(t, R + 28)[1] + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#6B7686" font-family="IBM Plex Mono,monospace">${t}</text>`; }).join('');
  const ang = 180 * (v / 100) - 90;
  return `<svg class="v2-dial" viewBox="0 0 320 222" role="img" aria-label="Score ${v.toFixed(1)} of 100, SIREN ${state.level}">
${BAND.map(([a, b, c]) => arc(a, b, c)).join('')}${ticks}
<g class="v2-needle" style="--to:${ang.toFixed(1)}deg;transform-origin:${cx}px ${cy}px"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 6}" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="9" fill="#fff"/></g>
<text x="${cx}" y="${cy + 50}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-weight="700" font-size="40" fill="#fff" data-count="${v.toFixed(1)}">${v.toFixed(1)}</text>
<text x="${cx}" y="${cy + 68}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="${L.color}" letter-spacing="2">OF 100</text></svg>`;
}

function deltaAt(rows, nowMs, hours) {
  const cur = rows[rows.length - 1]; if (!cur) return null;
  const target = nowMs - hours * 3600e3;
  let best = null;
  for (const r of rows) { const t = Date.parse(r.t); if (t <= target + 20 * 60e3) best = r; }
  return best && best !== cur && Number.isFinite(best.score) ? cur.score - best.score : null;
}
const chip = (label, d) => d === null ? `<span class="v2-dchip mute">${label} —</span>` : `<span class="v2-dchip ${d > 0.05 ? 'up' : d < -0.05 ? 'dn' : ''}">${label} ${d > 0.05 ? '▲' : d < -0.05 ? '▼' : '='}${Math.abs(d).toFixed(1)}</span>`;

function chart(rows, hours, id) {
  const end = rows.length ? Date.parse(rows[rows.length - 1].t) : Date.now();
  const pts = rows.filter((h) => Number.isFinite(h.score) && (hours === Infinity || end - Date.parse(h.t) <= hours * 3600e3));
  if (pts.length < 2) return `<p class="v2-nodata">Not enough readings yet for this range.</p>`;
  const W = 760, H = 240, PL = 34, PR = 12, PB = 24, T = 10;
  const t0 = Date.parse(pts[0].t), span = Math.max(1, end - t0);
  const x = (t) => PL + ((Date.parse(t) - t0) / span) * (W - PL - PR);
  const y = (v) => T + (1 - v / 100) * (H - PB - T);
  const path = (get) => { let d = '', pen = false; for (const p of pts) { const v = get(p); if (!Number.isFinite(v)) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(v).toFixed(1)}`; pen = true; } return d; };
  const bands = BAND.map(([a, b, c]) => `<rect x="${PL}" y="${y(b).toFixed(1)}" width="${W - PL - PR}" height="${(y(a) - y(b)).toFixed(1)}" fill="${c}" opacity=".06"/>`).join('');
  const grid = [0, 35, 55, 70, 85, 100].map((g) => `<text x="${PL - 6}" y="${(y(g) + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#6B7686" font-family="IBM Plex Mono,monospace">${g}</text>`).join('');
  const lines = Object.entries(PILLAR_HUE).map(([pid, c]) => `<path d="${path((p) => p.pillars && p.pillars[pid])}" fill="none" stroke="${c}" stroke-width="1.2" opacity=".55" class="pl pl-${pid}"/>`).join('');
  const marks = []; for (let i = 1; i < pts.length; i++) if (pts[i].level !== pts[i - 1].level) marks.push(`<g><line x1="${x(pts[i].t).toFixed(1)}" x2="${x(pts[i].t).toFixed(1)}" y1="${T}" y2="${H - PB}" stroke="#fff" stroke-dasharray="3 3" opacity=".6"/><text x="${(x(pts[i].t) + 4).toFixed(1)}" y="${T + 12}" font-size="10" fill="#fff" font-family="IBM Plex Mono,monospace">→ ${pts[i].level}</text></g>`);
  const deg = pts.filter((p) => p.degraded).map((p) => `<rect x="${(x(p.t) - 1).toFixed(1)}" y="${H - PB - 4}" width="2" height="4" fill="#FACC15"/>`).join('');
  const n = 6, labels = []; for (let i = 0; i <= n; i++) { const t = t0 + (span * i) / n; const d = new Date(t).toISOString(); labels.push(`<text x="${(PL + (i / n) * (W - PL - PR)).toFixed(1)}" y="${H - 6}" font-size="10" fill="#6B7686" text-anchor="middle" font-family="IBM Plex Mono,monospace">${hours <= 24 ? d.slice(11, 16) : d.slice(5, 10)}</text>`); }
  const last = pts[pts.length - 1];
  return `<svg class="v2-hchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Composite and pillar scores, ${pts.length} readings, now ${last.score.toFixed(1)}">
<defs><linearGradient id="hg-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4ADE80" stop-opacity=".35"/><stop offset="1" stop-color="#4ADE80" stop-opacity="0"/></linearGradient></defs>
${bands}${grid}${lines}<path d="${path((p) => p.score)}L${x(last.t).toFixed(1)},${y(0)}L${x(pts[0].t).toFixed(1)},${y(0)}Z" fill="url(#hg-${id})"/><path d="${path((p) => p.score)}" fill="none" stroke="#4ADE80" stroke-width="2.5"/>${marks.join('')}${deg}
<circle cx="${x(last.t).toFixed(1)}" cy="${y(last.score).toFixed(1)}" r="5" fill="#4ADE80"/>${labels.join('')}</svg>`;
}

function historyPanel(rows) {
  const R = [['24H', 24], ['7D', 168], ['30D', 720], ['ALL', Infinity]];
  return `<div class="v2-card v2-hist" id="trend" data-sec="Trend">
  <div class="row sb"><h3>${icon('eye', 3, '#4ADE80')}${pixelText('THE TREND', 3, '#FFFFFF')}</h3><span class="live">${rows.length} READINGS</span></div>
  <div class="v2-tabs" role="tablist">${R.map(([l], i) => `<input type="radio" name="v2r" id="v2r${i}" ${i === 1 ? 'checked' : ''}><label for="v2r${i}">${l}</label>`).join('')}
  ${R.map(([l, h], i) => `<div class="v2-tabp" data-i="${i}">${chart(rows, h, i)}</div>`).join('')}</div>
  <div class="v2-legend"><span><i style="background:#4ADE80;height:3px"></i>COMPOSITE</span>${Object.entries(PILLAR_HUE).map(([p, c]) => `<span><i style="background:${c}"></i>${esc(p.toUpperCase())}</span>`).join('')}<span><i style="background:#FACC15;width:3px;height:8px"></i>DEGRADED</span><span>┆ LEVEL CHANGE</span></div>
</div>`;
}

function spark(rows, pid) {
  const pts = rows.slice(-72).map((r) => r.pillars && r.pillars[pid]);
  if (pts.filter(Number.isFinite).length < 2) return '<svg class="v2-spark" viewBox="0 0 120 28"></svg>';
  let d = '', pen = false;
  pts.forEach((v, i) => { if (!Number.isFinite(v)) { pen = false; return; } d += `${pen ? 'L' : 'M'}${(i / (pts.length - 1) * 118 + 1).toFixed(1)},${(26 - v / 100 * 24).toFixed(1)}`; pen = true; });
  return `<svg class="v2-spark" viewBox="0 0 120 28" aria-hidden="true"><path d="${d}" fill="none" stroke="${PILLAR_HUE[pid] || '#AEB7C3'}" stroke-width="1.6"/></svg>`;
}

function loudPanel(state, rows) {
  const by = {}; for (const s of state.sources || []) (by[s.pillar] = by[s.pillar] || []).push(s);
  const rowsHtml = (state.pillars || []).map((p) => {
    const meta = PILLAR_META[p.id] || {};
    const live = Number.isFinite(p.score) && !p.dark;
    const status = live ? num(p.score, 1) : p.dark ? 'DARK' : 'CALIBRATING';
    const share = Number.isFinite(p.weight_share) && p.weight_share > 0 ? `${Math.round(p.weight_share * 100)}% OF THE SCORE` : 'NOT IN THE SCORE';
    const why = live ? `Running at the ${ordinal(Math.round((p.percentile || 0) * 100))} percentile of the last year.` : p.dark ? 'No source answered this hour, so the pillar is left out and the level is held.' : 'Its sources report, but none has a year of baseline yet, so it is shown and not scored.';
    const srcs = (by[p.id] || []).map((s) => `<li class="${s.ok ? 'ok' : s.uncalibrated ? 'cal' : 'bad'}"><b>${esc(srcName(s))}</b> ${Number.isFinite(s.value) ? `${Number(s.value).toLocaleString('en-US')} ${esc(s.unit || '')}` : ''}${s.ok && Number.isFinite(s.percentile) ? ` · ${ordinal(Math.round(s.percentile * 100))} pct` : s.uncalibrated ? ' · awaiting baseline' : !s.ok ? ' · not answering' : ''}</li>`).join('');
    return `<details class="v2-loud"><summary><span class="pn" style="color:${PILLAR_HUE[p.id]}">${esc(p.name.toUpperCase())}</span><span class="t"><i style="width:${live ? p.score.toFixed(1) : 0}%;background:${PILLAR_HUE[p.id]}"></i></span>${spark(rows, p.id)}<b class="${live ? '' : 'mute'}">${status}</b></summary>
  <p>${esc(meta.blurb || '')} ${esc(why)} <span class="sh">${share}</span></p><ul>${srcs}</ul></details>`;
  }).join('');
  return `<div class="v2-card" id="loud" data-sec="What’s loud"><div class="row sb"><h3>${icon('speaker', 3)}${pixelText("WHAT'S LOUD", 3, '#FFFFFF')}</h3><span class="live">TAP A PILLAR</span></div>${rowsHtml}
  <p class="v2-formula" id="v2-formula"></p></div>`;
}

function healthPanel(state) {
  const now = Date.parse(state.generated_at);
  const srcs = state.sources || [];
  const scored = srcs.filter((s) => s.ok).length, cal = srcs.filter((s) => s.uncalibrated).length, bad = srcs.filter((s) => !s.ok && !s.uncalibrated);
  const h = state.health || {};
  const next = h.expected_next_run_utc ? String(h.expected_next_run_utc).slice(11, 16) + ' UTC' : null;
  const lag = Number.isFinite(h.typical_lag_minutes) ? h.typical_lag_minutes : null;
  const dark = (state.pillars || []).filter((p) => p.dark).map((p) => p.name);
  const why = [];
  if (dark.length) why.push(`<b>${esc(dark.join(', '))}</b> ${dark.length > 1 ? 'are' : 'is'} dark: ${bad.map((s) => `${esc(srcName(s))} (last answered ${agoTxt(s.last_ok, now)})`).join(', ') || 'no source answered'}.`);
  else if (bad.length) why.push(`${bad.map((s) => `${esc(srcName(s))} last answered ${agoTxt(s.last_ok, now)}`).join('; ')}.`);
  const calP = (state.pillars || []).filter((p) => !p.dark && !Number.isFinite(p.score)).map((p) => p.name);
  if (calP.length) why.push(`<b>${esc(calP.join(', '))}</b> is still building its baseline, so it is shown but left out of the score.`);
  why.push(esc(RULE_TXT[state.rule_fired] || ''));
  const impact = `The score is computed from ${(state.pillars || []).filter((p) => Number.isFinite(p.score) && !p.dark).length} of ${(state.pillars || []).length} pillars and ${scored} scored sources.`;
  const table = srcs.map((s) => `<tr><td><span class="v2-dot ${s.ok ? 'ok' : s.uncalibrated ? 'cal' : 'bad'}"></span>${esc(srcName(s))}</td><td>${esc(String(s.pillar || '').toUpperCase())}</td><td>${s.ok ? 'SCORED' : s.uncalibrated ? 'REPORTING' : 'DOWN'}</td><td>${s.ok || s.uncalibrated ? agoTxt(s.observed_at, now) : agoTxt(s.last_ok, now)}</td></tr>`).join('');
  return `<div class="v2-card v2-health" id="health" data-sec="Health">
  <div class="row sb"><h3>${icon('shield', 3, state.degraded ? '#FACC15' : '#4ADE80')}${pixelText(state.degraded ? 'DEGRADED: WHY' : 'ALL SYSTEMS', 3, '#FFFFFF')}</h3><span class="live">${scored} SCORED · ${cal} REPORTING · ${bad.length} DOWN</span></div>
  <p>${why.filter(Boolean).join(' ')} ${esc(impact)}</p>
  <p class="v2-eta">Readings land hourly${lag ? `, usually about ${lag} min past the hour` : ''}${next ? `. Next expected around <b>${next}</b>` : ''}. A reading older than two hours is flagged as overdue at the top of the page.</p>
  <details><summary>Every source and when it last answered</summary><div class="v2-tw"><table><thead><tr><th>Source</th><th>Pillar</th><th>Status</th><th>Last good</th></tr></thead><tbody>${table}</tbody></table></div></details>
</div>`;
}

function movedPanel(wm, href) {
  if (!wm) return '';
  const pd = (wm.pillar_deltas || []).filter((p) => p.kind !== 'move' || Math.abs(p.delta) >= 0.1).slice(0, 5)
    .map((p) => p.kind === 'move' ? `<span>${esc(p.name)} <b class="${p.delta > 0 ? 'up' : 'dn'}">${p.delta > 0 ? '▲' : '▼'}${Math.abs(p.delta).toFixed(1)}</b></span>` : `<span>${esc(p.name)} <b class="${p.kind === 'live' ? 'up' : 'dn'}">${p.kind === 'live' ? 'BACK LIVE' : 'WENT DARK'}</b></span>`).join('');
  const d = wm.score_delta;
  const items = (wm.top_items || []).slice(0, 3).map((i) => `<li><a href="${esc(i.url)}" rel="noopener">${esc(i.title)}</a> <small>${esc(String(i.source || '').toUpperCase())}</small></li>`).join('');
  return `<div class="v2-card v2-moved" id="moved" data-sec="What moved"><div class="row sb"><h3>${icon('bolt', 3, '#4ADE80')}${pixelText('WHAT MOVED THIS HOUR', 3, '#FFFFFF')}</h3><a class="live" href="${href('/changelog.html')}">CHANGELOG →</a></div>
  <p class="v2-mv"><span>SCORE <b class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${Number.isFinite(d) ? `${d > 0 ? '▲' : d < 0 ? '▼' : '='}${Math.abs(d).toFixed(1)}` : '—'}</b></span>${wm.level_change ? `<span>LEVEL <b class="up">${esc(String(wm.level_change.from ?? ''))} → ${esc(String(wm.level_change.to ?? ''))}</b></span>` : ''}${pd || '<span>No pillar moved more than a tenth of a point.</span>'}</p>
  ${items ? `<ul class="v2-mvi">${items}</ul>` : ''}</div>`;
}

function altPanel(alts) {
  if (!alts || !alts.length) return '';
  return `<details class="v2-card v2-alt" id="alt"><summary><h3 style="display:inline-flex">${icon('eye', 3, '#A5B4FC')}${pixelText('UNCONVENTIONAL SIGNALS', 3, '#FFFFFF')}</h3> <span class="live">NOT IN THE SCORE · TAP TO SHOW</span></summary>
  <p>Raw readings SIREN collects every hour but does not score yet, because none has a year of baseline. Watch them; they cannot move the level.</p>
  <div class="v2-altg">${alts.map((a) => `<div><b>${esc(SRC_NAME[a.id] || a.label || a.id)}</b><span class="n">${Number.isFinite(a.value) ? Number(a.value).toLocaleString('en-US') : '—'} <small>${esc(a.unit || '')}</small></span><small>${esc(a.description || '')}</small></div>`).join('')}</div></details>`;
}

const DASH_JS = `(function(){var red=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-count]').forEach(function(el){var to=+el.getAttribute('data-count');if(red||!isFinite(to))return;var t0=null;function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1200);k=1-Math.pow(1-k,3);el.textContent=(to*k).toFixed(1);if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)});
var F=document.getElementById('v2-formula'),S=window.SIREN_PILLARS;if(F&&S){var l=S.filter(function(p){return typeof p.s==='number'&&isFinite(p.s)});if(l.length){var m=l.reduce(function(a,p){return a+p.s},0)/l.length,mx=Math.max.apply(null,l.map(function(p){return p.s}));F.innerHTML='<b>Recompute it:</b> 0.7 × mean('+l.map(function(p){return p.s.toFixed(1)}).join(', ')+') + 0.3 × max = 0.7 × '+m.toFixed(2)+' + 0.3 × '+mx.toFixed(2)+' = <b>'+(0.7*m+0.3*mx).toFixed(1)+'</b>. Pillars that are dark or still calibrating are left out.'}}
var v=document.querySelector('[data-verify-now]');if(v)v.addEventListener('click',function(e){var b=document.querySelector('[data-vfy-go]');var box=document.getElementById('vfy');if(box){e.preventDefault();box.scrollIntoView({behavior:red?'auto':'smooth',block:'start'});if(b&&!b.disabled)setTimeout(function(){b.click()},red?0:500)}});})();`;

function pmLink(slug, kind = 'market') {
  const ref = MONETIZE.polymarket && MONETIZE.polymarket.ref ? `&${MONETIZE.polymarket.ref}` : '';
  return `https://polymarket.com/${kind}/${encodeURIComponent(slug)}?utm_source=siren&utm_medium=markets-strip${ref}`;
}
function marketsPanel(ctx, href) {
  const pm = ctx.race && ctx.race.markets && ctx.race.markets.polymarket;
  const legs = pm && pm.horizon && Array.isArray(pm.horizon.legs) ? pm.horizon.legs.slice(0, 5) : [];
  const movers = (ctx.pmTop || []).slice().sort((a, b) => Math.abs(b.move || 0) - Math.abs(a.move || 0)).slice(0, 6);
  if (!legs.length && !movers.length) return '';
  const leg = (l) => `<a class="v2-pm" href="${esc(pmLink(l.slug))}" target="_blank" rel="noopener sponsored"><span>${esc(l.title)}</span><b>${pct(l.probability, 0)}</b><i class="${(l.change_1d || 0) > 0 ? 'up' : (l.change_1d || 0) < 0 ? 'dn' : ''}">${Number.isFinite(l.change_1d) && l.change_1d ? `${l.change_1d > 0 ? '▲' : '▼'}${Math.abs(l.change_1d * 100).toFixed(1)} 24H` : '— 24H'}</i><em>TRADE →</em></a>`;
  const mv = (m) => `<a class="v2-pm wide" href="${esc(pmLink(m.slug))}" target="_blank" rel="noopener sponsored"><span>${esc(m.question)}</span><i class="${(m.move || 0) > 0 ? 'up' : 'dn'}">${(m.move || 0) > 0 ? '▲' : '▼'}${Math.abs((m.move || 0) * 100).toFixed(0)} PTS</i><small>$${Math.round((m.volume || 0) / 1000).toLocaleString('en-US')}K VOL</small><em>TRADE →</em></a>`;
  return `<div class="v2-card v2-mkts" id="markets" data-sec="Markets">
  <div class="row sb"><h3>${icon('eye', 3, '#A855F7')}${pixelText('AI PREDICTION MARKETS', 3, '#FFFFFF')}</h3><a class="live" href="${href('/race.html')}">THE RACE →</a></div>
  ${legs.length ? `<p class="v2-mq">${esc(pm.horizon.title)}</p><div class="v2-pmg">${legs.map(leg).join('')}</div>` : ''}
  ${movers.length ? `<p class="v2-mq">BIGGEST MOVERS ON AI QUESTIONS TODAY</p><div class="v2-pmg">${movers.map(mv).join('')}</div>` : ''}
  <p class="v2-pmn">Live odds from Polymarket. Links open Polymarket${MONETIZE.polymarket && MONETIZE.polymarket.ref ? ' (referral link)' : ''}. Prediction markets are restricted in some places; check the rules where you live. Not financial advice.</p>
</div>`;
}

export function render(ctx, { head }) {
  const { state } = ctx;
  const href = ctx.href;
  const img = (n) => href(`/img/art-${n}.webp`);
  const L = LEVEL[state.level] || LEVEL[4];
  const score = num(state.score, 1);
  const vs = ctx.vsYesterday;
  const delta = vs && Number.isFinite(vs.delta) ? vs.delta : state.delta_from_previous;
  const deltaTxt = Number.isFinite(delta) ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} ${vs && vs.basis === 'previous' ? 'SINCE LAST' : 'VS 24H AGO'}` : '';
  const sources = state.sources || [];
  const ok = sources.filter((s) => s.ok || s.uncalibrated).length;

  // Breaking: the highest-scoring story of the last six hours, else the newest.
  const items = (ctx.news && ctx.news.items) || [];
  const now = Date.parse(state.generated_at);
  const fresh = items.filter((i) => now - Date.parse(i.published_at) < 6 * 3600e3);
  const top = (fresh.length ? fresh : items).slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];

  const routes = ctx.routes || {};
  const dock = [
    ['siren', 'INDEX', '/', true],
    ['radar', 'THE RACE', '/race.html'],
    ['news', 'NEWSROOM', '/news.html'],
    ['server', 'MACHINES', '/map.html'],
    routes.flock ? ['camera', 'CAMERAS', '/flock.html'] : null,
    routes.exploits ? ['bug', 'EXPLOITS', '/exploits.html'] : null,
    ['case', 'JOBS', '/jobs.html'],
  ].filter(Boolean);

  const leaders = ((ctx.leaders && ctx.leaders.leaders) || []).filter((l) => BOSSES.includes(l.id))
    .sort((a, b) => BOSSES.indexOf(a.id) - BOSSES.indexOf(b.id));
  const totals = (ctx.leaders && ctx.leaders.totals) || {};
  const bossStatus = (l) => {
    if (l.state === 'on_record') return { t: `ON RECORD ×${l.count}`, cls: 'hot' };
    if (l.watch_floor && l.watch_floor.state === 'dormant' && l.watch_floor.feed) return { t: 'GONE QUIET', cls: '' };
    return { t: 'NO LINE 7D', cls: '' };
  };

  const players = ((ctx.race && ctx.race.players) || []).slice().sort((a, b) => a.rank - b.rank).slice(0, 6);
  // What the "since your last visit" strip compares against (WAR_JS).
  const lead0 = players[0];
  const weekAgo = Date.parse(state.generated_at) - 7 * 864e5;
  const sinceNow = {
    score: Number.isFinite(state.score) ? Math.round(state.score * 10) / 10 : null,
    level: state.level,
    leader: lead0 ? lead0.name : null,
    lp: lead0 && lead0.market && Number.isFinite(lead0.market.probability) ? Math.round(lead0.market.probability * 1000) / 10 : null,
    news: items.map((i) => Date.parse(i.published_at)).filter((t) => Number.isFinite(t) && t > weekAgo),
  };
  const maxRel = Math.max(1, ...players.map((p) => (p.shipping && p.shipping.github && p.shipping.github.releases_30d) || 0));
  const maxMs = Math.max(0.01, ...players.map((p) => (p.mindshare && p.mindshare.share) || 0));
  const lab = (p) => {
    const m = p.market || {};
    const ch = Number.isFinite(m.change_7d) ? m.change_7d : null;
    const rel = (p.shipping && p.shipping.github && p.shipping.github.releases_30d);
    const ms = p.mindshare && p.mindshare.share;
    const big = ch !== null && Math.abs(ch) >= 0.05;
    const pill = big
      ? { t: `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch * 100).toFixed(0)} PT ${ch > 0 ? 'SPIKE' : 'DROP'}`, cls: 'red' }
      : (rel >= 20 ? { t: '▲ SHIPPING', cls: 'amber' } : { t: '↘ QUIET', cls: 'blue' });
    const face = FACE_BY_LAB[p.id];
    const pic = face ? `<img class="v2-face sq" loading="lazy" decoding="async" src="${img(face)}" width="64" height="64" alt="">` : icon('robot', 5);
    const bar = (label, val, w, color) => `<div class="v2-bar"><span>${label}</span><span class="t"><i style="width:${Math.max(0, Math.min(100, w)).toFixed(1)}%;background:${color}"></i></span><b>${val}</b></div>`;
    return `<article class="v2-lab${big ? ' hot' : ''}">
  <div class="hd">
    <div class="row">${pic}<div class="nm"><h3>${esc(p.name.toUpperCase())}</h3><span>${esc(p.principal || 'No single principal')}</span></div><span class="odds">${pct(m.probability)}</span></div>
    <div class="row sb"><span class="v2-pill ${pill.cls}">${pill.t}</span><span class="mv${big ? ' red' : ''}">${ch === null ? 'NO 7D REFERENCE' : `${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch * 100).toFixed(1)} PTS / 7D`}</span></div>
  </div>
  <div class="sig"><span class="cap">SIGNAL ANALYSIS</span>
    ${bar('ODDS', pct(m.probability), (m.probability || 0) * 100, '#3B5BFF')}
    ${bar('RELEASES 30D', Number.isFinite(rel) ? String(rel) : '—', ((rel || 0) / maxRel) * 100, '#3B5BFF')}
    ${bar('MINDSHARE', pct(ms), ((ms || 0) / maxMs) * 100, '#A855F7')}
  </div>
</article>`;
  };

  const hist = (ctx.history || []).slice(-12);
  const scores = hist.map((h) => h.score).filter(Number.isFinite);
  const lo = Math.max(0, Math.floor(Math.min(...scores, state.score) - 3));
  const hi = Math.min(100, Math.ceil(Math.max(...scores, state.score) + 2));
  const cols = hist.map((h, i) => {
    const hpc = ((h.score - lo) / Math.max(1, hi - lo)) * 100;
    const last = i === hist.length - 1;
    return `<i title="${num(h.score, 1)} at ${hhmm(h.t)}" style="height:${Math.max(4, hpc).toFixed(1)}%${last ? ';background:#BE185D;border-top-color:#EF4444' : ''}"></i>`;
  }).join('');

  const pillars = (state.pillars || []).map((p) => {
    const live = Number.isFinite(p.score) && !p.dark;
    const loud = live && p.score >= 65;
    return `<div class="v2-bar wide"><span class="pn">${esc(p.name.toUpperCase())}</span><span class="t"><i style="width:${live ? p.score.toFixed(1) : 0}%;background:${loud ? '#F87171' : '#3B5BFF'}"></i></span><b class="${live ? '' : 'mute'}">${live ? num(p.score, 1) : (p.dark ? 'DARK' : 'CALIB')}</b></div>`;
  }).join('');

  const nav = roomNav(ctx, href, img);
  const rows = ctx.history || [];
  const nowMs = Date.parse(state.generated_at);
  let wm = null, alts = [];
  try { wm = whatMoved(ctx); } catch { wm = null; }
  try { alts = alternativeSignals(state); } catch { alts = []; }
  const dash = `<section class="v2-dash" aria-label="The reading at a glance">
    ${dial(state, L)}
    <div class="v2-dinfo">
      <div class="v2-chips">${chip('1H', Number.isFinite(state.delta_from_previous) ? state.delta_from_previous : deltaAt(rows, nowMs, 1))}${chip('24H', deltaAt(rows, nowMs, 24))}${chip('7D', deltaAt(rows, nowMs, 168))}</div>
      <p class="v2-dline"><b style="color:${L.color}">SIREN ${state.level} · ${esc(state.level_name)}</b> since ${esc(String(state.level_since || '').slice(0, 10))}. ${state.degraded ? `<a href="#health" class="amber">DEGRADED: see why ↓</a>` : '<span class="green">All pillars live.</span>'}</p>
      <div class="v2-dbtns"><a class="v2-btn sm" href="#vfy" data-verify-now>✓ VERIFY THIS READING</a><a class="v2-btn sm ghost" href="${href('/alerts.html')}">🔔 ALERTS</a><a class="v2-btn sm ghost" href="${href('/export.html')}">⤓ DATA &amp; EMBED</a></div>
    </div>
  </section>
  <script>window.SIREN_PILLARS=${JSON.stringify((state.pillars || []).filter((p) => !p.dark).map((p) => ({ id: p.id, s: Number.isFinite(p.score) ? p.score : null })))}</script>`;
  const body = `
<div class="v2">
<div class="v2-top"><div class="v2-wrap">
  <span class="v2-chip">${icon('clock', 2)}<span id="v2-clock" class="tnum">${esc(String(state.generated_at).slice(0, 10))} ${esc(hhmm(state.generated_at))}</span></span>
  <span class="tag red" id="v2-fresh" data-at="${esc(state.generated_at)}">LAST READING <b>${esc(hhmm(state.generated_at))}</b></span>
  <span class="v2-chip">${icon('eye', 2)}${ok}/${sources.length} REPORTING · ${sources.filter((x) => x.ok).length} SCORED</span>
  <span class="right">
    <a class="tag green" href="#rooms">ALL ROOMS ↓</a>
    <button type="button" class="tag radio" id="siren-radio" data-level="${state.level}" aria-pressed="false" title="Play SIREN Radio: an original soundtrack generated in your browser. Its mood follows the level.">♪ RADIO</button>
    <a class="tag blue" href="${href('/history.html')}">HISTORY</a>
    <a class="tag violet" href="${href('/race.html')}">MARKETS</a>
    <span>STATUS: <b class="${state.degraded ? 'amber' : 'green'}">${state.degraded ? 'DEGRADED' : 'OPERATIONAL'}</b></span>
    <span title="A Terminator reference. Nothing here is self-aware. Probably.">SKYNET: <b class="${state.level <= 2 ? 'amber' : 'green'}">${({ 5: 'ASLEEP', 4: 'NOT SELF-AWARE (YET)', 3: 'LEARNING AT A GEOMETRIC RATE', 2: 'ASKING QUESTIONS', 1: 'JUDGMENT DAY WATCH' })[state.level] || 'NOT SELF-AWARE (YET)'}</b></span>
  </span>
</div></div>
${ticker(items)}
${nav.strip}
<main class="v2-wrap v2-main" id="main">
  <div class="v2-brand">
    <span class="v2-3d" data-siren3d data-level="${state.level}"><img class="v2-art bob" src="${img('siren')}" width="112" height="112" alt=""></span>
    <h1>${pixelText('AI SIREN INDEX', 8, '#FFFFFF', 'fit')}</h1>
  </div>
  <div class="v2-sub"><span>Superintelligence, watched hourly</span><span class="sep">|</span><a class="v2-btn sm" href="https://x.com/SIRENutf6">FOLLOW @SIRENutf6</a></div>

  <section class="hero">
    <div class="v2-banner" id="signal" data-sec="Signal" style="--lv:${L.color};--lvg:${L.ground}">
      ${icon('shield', 5, L.color)}
      <div class="col">
        ${pixelText(`SIREN ${state.level}`, 8, L.color, 'fit')}
        <span class="lbl">${esc(state.level_name)} · ${esc(L.line)}</span>
      </div>
      <div class="v2-score">
        ${pixelText(score, 6, '#FFFFFF')}
        <span class="lbl">OF 100${deltaTxt ? ` · ${deltaTxt}` : ''}</span>
      </div>
    </div>
  </section>
  ${dash}
  <div class="v2-since" id="v2-since" hidden role="status"></div>
  <div class="v2-sponsor">${sponsorLine(href('/sponsor.html'))}</div>
  <script>window.SIREN_NOW=${JSON.stringify(sinceNow).replace(/</g, '\\u003c')}</script>

  ${top ? `<div class="v2-breaking" id="breaking" data-sec="Breaking"><span class="badge"><span class="blink">${icon('bolt', 2)}</span>BREAKING</span><a href="${esc(top.url)}" rel="noopener">${esc(top.title)}</a><span class="src">${esc(hhmm(top.published_at))} · ${esc(String(top.source).toUpperCase())}</span></div>` : ''}

${movedPanel(wm, href)}
  ${historyPanel(rows)}
  <div class="v2-two">${loudPanel(state, rows)}${healthPanel(state)}</div>
  ${marketsPanel(ctx, href)}
  ${altPanel(alts)}
  <div class="v2-vfywrap">${verifyBox(ctx)}</div>


  <div class="v2-sec" id="bosses" data-sec="Bosses"><h2>${pixelText('THE BOSSES ON WATCH', 4, '#FFFFFF', 'fit')}</h2><span>ON THE RECORD THIS WEEK · ${totals.on_record ?? 0} OF ${totals.leaders ?? 15}</span></div>
  <div class="v2-bosses">
    ${leaders.map((l) => { const s = bossStatus(l); return `<a class="boss" href="${href('/leaders.html')}"><img class="v2-face" loading="lazy" decoding="async" src="${img(FACE_BY_LEADER[l.id])}" width="96" height="96" alt=""><span class="nm">${esc(l.name.toUpperCase())}</span><span class="co">${esc(String(l.org).toUpperCase())}</span><span class="st ${s.cls}">${s.t}</span></a>`; }).join('')}
  </div>

  <div class="v2-sec" id="labs" data-sec="Labs"><h2>${pixelText(`${players.length} LABS MONITORED`, 4, '#FFFFFF', 'fit')}</h2><span>ODDS OF BEST MODEL IN 2026 · POLYMARKET</span></div>
  <div class="v2-labs">${players.map(lab).join('')}</div>

<section class="v2-video" aria-labelledby="v2-video-h">
    <div class="txt"><h2 id="v2-video-h">${pixelText('WHAT IS SIREN?', 4, '#FFFFFF', 'fit')}</h2><p>A 42-second tour: the hourly reading, the five levels, and the rooms worth opening. Sound on: the soundtrack is SIREN Radio, generated from the same code as the ♪ button.</p></div>
    <video controls preload="none" playsinline width="1280" height="720" poster="${href('/media/siren-explainer-poster.jpg')}">
      <source src="${href('/media/siren-explainer.webm')}" type="video/webm">
      <source src="${href('/media/siren-explainer.mp4')}" type="video/mp4">
    </video>
  </section>
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoObject', name: 'What is SIREN? A 42-second tour of the AI Siren Index', description: 'How SIREN counts how loud AI is every hour, what its five levels mean, and the rooms on the site: the race, the newsroom, the AI bosses, real clips, the world monitor, the AI battle and the prepper kit.', thumbnailUrl: [ctx.url('/media/siren-explainer-poster.jpg')], uploadDate: '2026-10-07', duration: 'PT42S', contentUrl: ctx.url('/media/siren-explainer.mp4'), embedUrl: ctx.url('/') }).replace(/</g, '\\u003c')}</script>

${roomsGrid(ctx, href, img)}

  <div class="v2-cta" id="tally" data-sec="Tally">
    <img class="v2-art bob" loading="lazy" decoding="async" src="${img('canary')}" width="88" height="88" alt="">
    <div class="col">${pixelText('TALLY IS STILL SINGING', 4, '#FFFFFF', 'fit')}<span>Our duty canary posts on X the hour the level moves. Nothing in between. Or follow the <a href="${href('/feed-level.xml')}">level-change RSS feed</a>.</span></div>
    <a class="v2-btn" href="https://x.com/intent/follow?screen_name=SIRENutf6">FOLLOW @SIRENutf6 →</a>
  </div>
  ${newsletterBox(href('/privacy.html')) ? `<div class="v2-nl">${newsletterBox(href('/privacy.html'))}</div>` : ''}

  <p class="v2-foot">SIREN counts how loud AI is, every hour, from public data. A count, not a forecast. No fate but what we count. Portraits and icons are generated illustrations, not photographs.
  <a href="${href('/methodology.html')}">How it works</a> · <a href="${href('/classic.html#vfy')}">Verify a reading</a> · <a href="${href('/classic.html')}">Full instrument panel</a> · <a href="${href('/about.html')}">About</a> · <a href="${href('/sponsor.html')}">Sponsor</a>${tipLink() ? ` · ${tipLink()}` : ''}</p>
  <p class="v2-foot"><b>Not advice.</b> Information, commentary and satire only — not financial, investment, legal, security or safety advice. Data is automated and may be wrong or late; provided as is, with no warranty. Not affiliated with any company, lab, person or agency named here. Use of this site means you accept the <a href="${href('/terms.html')}">terms &amp; disclaimers</a>. <a href="${href('/privacy.html')}">Privacy</a>. <a href="${href('/feedback.html')}">Report a problem or send feedback</a>.</p>
</main>
${nav.palette}${nav.tabbar}
<nav class="v2-rail" aria-label="On this page"><span class="v2-rail__h">ON THIS PAGE</span><ol id="v2-rail-l"></ol><a class="v2-rail__top" href="#main">↑ TOP</a></nav>
</div>
<script>${NAV_JS}</script>
<script>${WAR_JS}</script>
<script>${DASH_JS}</script>
<script>(function(){var el=document.getElementById('v2-clock');if(!el)return;function p(n){return(n<10?'0':'')+n}function t(){var d=new Date();el.textContent=d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate())+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds())+'Z'}t();setInterval(t,1000)})();</script>`;

  return `<!doctype html>
<html lang="en">
${head.replace('</head>', `<style>${CSS}${DASH_CSS}</style><style>${verifyCss()}</style>${MZ_CSS}\n</head>`)}
<body class="v2-body"><a class="v2-skip" href="#signal">Skip to the reading</a>${body}
<script type="module" src="${href('/media/siren3d.js')}"></script>
<script src="${href('/media/radio.js')}" defer></script>
</body>
</html>`;
}

const CSS = `
.v2 [data-sec]{scroll-margin-top:76px}
.v2 .tag.red.stale{border-color:#B45309;background:#241505;color:#FDE68A}
.v2-pal__i--sec{border-left:2px solid #14532D!important}
.v2-pal__num{flex:none;width:28px;height:28px;display:grid;place-items:center;border:2px solid #2A3446;font-weight:700;color:#86EFAC}
.v2-rail{display:none}
@media (min-width:1500px){
  .v2-rail{display:flex;flex-direction:column;gap:8px;position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:30;font-size:11px;font-weight:700;letter-spacing:.08em}
  .v2-rail__h{color:#AEB7C3;font-size:10px;letter-spacing:.16em}
  .v2-rail ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
  .v2-rail a{display:flex;align-items:center;gap:8px;padding:5px 8px;border-left:2px solid #2A3446;color:#AEB7C3!important}
  .v2-rail a:hover{color:#fff!important;border-color:#6366F1}
  .v2-rail a.on{color:#fff!important;border-color:#4ADE80;background:#03130A}
  .v2-rail kbd{font:inherit;min-width:18px;text-align:center;border:1px solid #2A3446;color:#86EFAC}
  .v2-rail__top{margin-top:6px}
}

.v2 .tag.green{border-color:#14532D;background:#03130A;color:#86EFAC}
.v2 .tag.radio{border-color:#3730A3;background:#0B0A1F;color:#A5B4FC;cursor:pointer;font:inherit;font-weight:700}
.v2 .tag.radio[aria-pressed=true]{background:#818CF8;color:#000;border-color:#818CF8;animation:v2-pulse 1.6s ease-in-out infinite}
.v2 .tag.radio.armed{border-color:#818CF8}
@keyframes v2-pulse{50%{box-shadow:0 0 0 4px rgba(129,140,248,.25)}}
@media (prefers-reduced-motion:reduce){.v2 .tag.radio[aria-pressed=true]{animation:none}}
.v2-nav{position:sticky;top:0;z-index:40;background:rgba(0,0,0,.92);backdrop-filter:blur(6px);border-bottom:1px solid #232C3B}
.v2-nav__in{display:flex;align-items:center;gap:10px;padding-block:8px}
.v2-nav__home,.v2-nav__t{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;padding:5px 10px 5px 6px;border:2px solid #2A3446;background:#111827;color:#D7DCE3!important;font-size:11px;font-weight:700;letter-spacing:.05em;white-space:nowrap}
.v2-nav__home{border-color:#6366F1;background:#1E1B4B;color:#fff!important}
.v2-nav__t:hover{border-color:#6366F1;color:#fff!important;background:#161D33}
.v2-nav__home img,.v2-nav__t img{display:block}
.v2-nav__scroll{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;min-width:0;flex:1 1 auto;padding-bottom:2px;mask-image:linear-gradient(90deg,#000 92%,transparent)}
.v2-nav__jump{flex:0 0 auto;font:inherit;font-size:12px;font-weight:700;letter-spacing:.06em;color:#fff;background:#4F46E5;border:0;padding:8px 12px;cursor:pointer;min-height:40px}
.v2-nav__jump kbd{font:inherit;border:1px solid rgba(255,255,255,.5);padding:0 5px;margin-left:4px}
.v2-pal{border:2px solid #4338CA;background:#0A0E16;color:#F3F4F6;padding:0;width:min(640px,calc(100vw - 32px));max-height:min(78vh,720px)}
.v2-pal::backdrop{background:rgba(0,0,0,.7)}
.v2-pal__box{display:flex;flex-direction:column;max-height:min(78vh,720px)}
.v2-pal__q{font:inherit;font-size:16px;padding:14px 16px;background:#000;color:#fff;border:0;border-bottom:1px solid #232C3B;outline:none}
.v2-pal__l{list-style:none;margin:0;padding:6px;overflow:auto}
.v2-pal__i{display:flex;align-items:center;gap:12px;padding:8px 10px;color:#fff!important;border:2px solid transparent}
.v2-pal__i span{display:flex;flex-direction:column;min-width:0;flex:1}
.v2-pal__i b{font-size:14px}.v2-pal__i small{font-size:12px;color:#AEB7C3}
.v2-pal__i i{font-style:normal;font-size:12px;font-weight:700;color:#A5B4FC;white-space:nowrap}
.v2-pal__i.on,.v2-pal__i:hover{border-color:#6366F1;background:#161D33}
.v2-pal__hint{margin:0;padding:8px 16px;font-size:11px;color:#AEB7C3;border-top:1px solid #232C3B}
.v2-tab{display:none}
@media (max-width:720px){
  .v2-nav__home{display:none}
  .v2-tab{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:45;background:#0A0E16;border-top:2px solid #232C3B;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))}
  .v2-tab a,.v2-tab button{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit;font-size:10px;font-weight:700;letter-spacing:.05em;color:#D7DCE3!important;background:none;border:0;padding:4px 0;min-height:48px;cursor:pointer}
  .v2-tab img{display:block}
  .v2-tab__grid{font-size:20px;line-height:24px;color:#A5B4FC}
  .v2-main{padding-bottom:110px}
  body.v2-body #sitebar{bottom:calc(76px + env(safe-area-inset-bottom,0px))}
}

.v2-rooms{display:flex;flex-direction:column;gap:16px}
.v2-rgroup{display:flex;flex-direction:column;gap:10px}
.v2-rgh{font-size:12px;font-weight:700;letter-spacing:.16em;color:#AEB7C3;display:flex;align-items:center;gap:10px}
.v2-rgh::before{content:"";width:10px;height:10px;background:#4ADE80;box-shadow:0 0 10px rgba(74,222,128,.5)}
.v2-rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.v2-room{display:flex;align-items:center;gap:14px;padding:12px 14px;border:2px solid #2A3446;background:#111827;color:#fff!important;min-height:84px}
.v2-room:hover{border-color:#6366F1;background:#161D33}
.v2-room img{display:block;flex:none}
.v2-room__t{display:flex;flex-direction:column;gap:2px;min-width:0}
.v2-room__t b{font-size:14px;letter-spacing:.06em}
.v2-room__t i{font-style:normal;font-size:12px;font-weight:700;color:#A5B4FC}
.v2-room__t small{font-size:12px;color:#AEB7C3;line-height:1.35}

body.v2-body{margin:0;background:#000;color:#F3F4F6}
.v2{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;font-weight:500;font-size:16px;line-height:1.5;background:#000;color:#F3F4F6;min-height:100vh}
.v2 *{box-sizing:border-box}
.v2 a{color:#A5B4FC;text-decoration:none}.v2 a:hover{color:#E0E7FF}
.v2 a:focus-visible{outline:2px solid #4ADE80;outline-offset:2px}
.v2 h1,.v2 h2,.v2 h3{margin:0;font:inherit}
.v2-px{display:block;flex:none}
.v2-ptext{display:block;line-height:0;max-width:100%}
.v2-ptext.fit svg{max-width:100%;height:auto}
.v2-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.v2-wrap{max-width:1200px;margin:0 auto;padding-inline:20px}
.v2 .tnum,.v2-bar b,.v2-lab .odds{font-variant-numeric:tabular-nums}
.v2 .green{color:#4ADE80}.v2 .amber{color:#FACC15}
.v2-top{border-bottom:1px solid #232C3B;background:#0A0E16}
.v2-top .v2-wrap{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;padding-block:10px;font-size:13px;color:#D7DCE3}
.v2 .v2-chip{display:inline-flex;align-items:center;gap:8px}
.v2 .tag{padding:5px 10px;border:1px solid;font-weight:700}
.v2 .tag.red{border-color:#7F1D1D;background:#1A0707;color:#FCA5A5}.v2 .tag.red b{color:#fff}
.v2 .tag.blue{border-color:#3B4FD9;background:#111A44;color:#C7D2FE}
.v2 .tag.violet{border-color:#7E3AF2;background:#2A1240;color:#E9D5FF}
.v2-top .right{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.v2-main{padding-block:40px 72px;display:flex;flex-direction:column;gap:22px}
.v2-brand{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.v2-brand h1{flex:1 1 300px;min-width:0}
.v2-art{display:block;flex:none;max-width:none;object-fit:contain}
.v2-sub{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-left:134px;color:#D7DCE3;font-size:17px;letter-spacing:.12em;margin-top:-6px}
.v2-sub .sep{color:#4B5563}
.v2-btn{display:inline-flex;align-items:center;gap:8px;background:#4F46E5;color:#fff!important;font-weight:700;letter-spacing:.05em;min-height:48px;padding:0 22px}
.v2-btn.sm{min-height:0;padding:7px 12px;font-size:13px}
.v2-btn:hover{background:#6366F1}
.v2 .hero{margin:0;padding:0;border:0;background:none}
.v2-banner{border:2px solid var(--lv);background:var(--lvg);padding:26px 28px;display:flex;align-items:center;gap:22px;flex-wrap:wrap;animation:v2glow 3s ease-in-out infinite}
.v2-banner .col{display:flex;flex-direction:column;gap:12px;flex:1 1 320px;min-width:0}
.v2-banner .lbl{font-size:15px;font-weight:700;letter-spacing:.1em;color:var(--lv)}
.v2-banner .v2-score{margin-left:auto;border:0;padding:0;background:none;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
@keyframes v2glow{0%,100%{box-shadow:0 0 24px color-mix(in srgb,var(--lv) 15%,transparent)}50%{box-shadow:0 0 44px color-mix(in srgb,var(--lv) 35%,transparent)}}
.v2-breaking{border:1px solid #232C3B;background:#0A0E16;padding:10px 14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.v2-breaking .badge{display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border:1px solid #991B1B;background:#2A0B0B;color:#FECACA;font-weight:700;font-size:13px;letter-spacing:.08em}
.v2-breaking a{color:#fff;flex:1 1 300px;min-width:0}.v2-breaking a:hover{text-decoration:underline}
.v2-breaking .src{margin-left:auto;font-size:13px;color:#AEB7C3}
.v2 .blink{animation:v2blink 1.1s steps(2,start) infinite;display:inline-flex}
@keyframes v2blink{50%{opacity:.15}}
.v2-dock{border:1px solid #232C3B;background:#0A0E16;padding:12px;display:flex;flex-wrap:wrap;gap:10px}
.v2-dock .tile{width:112px;height:112px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:2px solid #2A3446;background:#111827;color:#D7DCE3;font-size:11px;font-weight:700;letter-spacing:.05em;text-align:center}
.v2-dock .tile img{display:block}
.v2-dock .tile:hover{border-color:#6366F1;color:#fff}
.v2-dock .tile.on{border-color:#6366F1;background:#1E1B4B;color:#fff}
.v2-sec{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px;margin-top:14px}
.v2-sec h2{flex:1 1 300px;min-width:0}
.v2-sec>span{font-size:13px;color:#AEB7C3}
.v2-face{display:block;flex:none;max-width:none;background:#000;border:2px solid #2A3446;border-radius:50%}
.v2-face.sq{border-radius:6px}
.v2-bosses{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.v2-bosses .boss{border:2px solid #232C3B;background:#0E131D;padding:16px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;color:#fff}
.v2-bosses .boss:hover{border-color:#6366F1;color:#fff}
.v2-bosses .nm{font-size:13px;font-weight:700}
.v2-bosses .co{font-size:12px;color:#AEB7C3}
.v2-bosses .st{font-size:11px;font-weight:700;padding:4px 8px;border:1px solid #3B4A63;color:#D7DCE3;letter-spacing:.06em}
.v2-bosses .st.hot{border-color:#DC2626;background:#2A0B0B;color:#FECACA}
.v2-labs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:16px}
.v2-lab{border:2px solid #232C3B;background:#0E131D;display:flex;flex-direction:column}
.v2-lab.hot{border-color:#DC2626;box-shadow:0 0 24px rgba(220,38,38,.2)}
.v2-lab .hd{padding:18px 20px 16px;display:flex;flex-direction:column;gap:14px}
.v2 .row{display:flex;align-items:center;gap:14px}.v2 .row.sb{justify-content:space-between}
.v2-lab .nm{min-width:0}
.v2-lab h3{font-size:18px;font-weight:700;letter-spacing:.03em;color:#fff}
.v2-lab .nm span{font-size:12px;color:#AEB7C3}
.v2-lab .odds{margin-left:auto;font-size:22px;font-weight:700;color:#fff}
.v2-lab .mv{font-size:13px;font-weight:700;color:#AEB7C3}.v2-lab .mv.red{color:#F87171}
.v2-pill{padding:7px 12px;border:1px solid;font-size:13px;font-weight:700;letter-spacing:.05em}
.v2-pill.red{border-color:#DC2626;background:#3A0D0D;color:#FECACA}
.v2-pill.amber{border-color:#B45309;background:#241505;color:#FDE68A}
.v2-pill.blue{border-color:#3B5BFF;background:#0E1540;color:#C7D2FE}
.v2-lab .sig{border-top:1px solid #232C3B;padding:16px 20px 20px;display:flex;flex-direction:column;gap:12px}
.v2 .cap{font-size:12px;font-weight:700;letter-spacing:.14em;color:#AEB7C3}
.v2-bar{display:grid;grid-template-columns:120px minmax(0,1fr) 64px;gap:10px;align-items:center;font-size:13px;color:#D7DCE3}
.v2-bar.wide{grid-template-columns:170px minmax(0,1fr) 64px}
.v2-bar .pn{font-weight:700}
.v2-bar .t{height:14px;background:#1A2232}.v2-bar .t i{display:block;height:14px}
.v2-bar b{text-align:right;color:#fff}.v2-bar b.mute{color:#AEB7C3}
.v2-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:16px}
.v2-card{border:2px solid #232C3B;background:#0E131D;padding:20px;display:flex;flex-direction:column;gap:14px}
.v2-card h3{display:flex;align-items:center;gap:10px}
.v2-card .stack{display:flex;flex-direction:column;gap:14px}
.v2-card .small{font-size:13px;color:#AEB7C3}.v2-card .small b{color:#fff}
.v2 .live{padding:3px 8px;background:#DC2626;color:#fff;font-size:12px;font-weight:700}
.v2-cols{display:flex;align-items:flex-end;gap:6px;height:150px;border-bottom:1px solid #2A3344}
.v2-cols i{flex:1 1 0;background:#3B5BFF;border-top:4px solid #3B5BFF}
.v2-cta{border:2px solid #4338CA;background:#0E1033;padding:24px 28px;display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.v2-cta .col{display:flex;flex-direction:column;gap:10px;flex:1 1 300px;min-width:0;color:#C7D2FE}
.v2-foot{margin:0;font-size:13px;color:#AEB7C3}
.v2-track{margin:22px 0}.v2-week{width:100%;height:auto;display:block;margin:6px 0 10px}
.v2-gauges{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:6px 0 12px}.v2-gauge{text-align:center}.v2-gauge svg{width:100%;max-width:120px;height:auto}.v2-gauge span{display:block;font:600 10px/1.3 'IBM Plex Mono',monospace;letter-spacing:.08em}
@media (max-width:640px){.v2-gauges{grid-template-columns:repeat(3,1fr)}}
.v2-srcs{display:flex;flex-wrap:wrap;gap:6px 14px;font:600 10px/1.6 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#AEB7C3}.v2-src i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}
.v2-src.src-live i{background:#4ADE80;box-shadow:0 0 8px #4ADE80;animation:v2-blink 2s infinite}.v2-src.src-cal i{background:#FFB020}.v2-src.src-dark i{background:#FF3B3B}
@keyframes v2-blink{50%{opacity:.35}}
.v2-ticker{display:flex;align-items:center;border-bottom:1px solid #232C3B;background:#05070B;overflow:hidden;font:500 12px/1 'IBM Plex Mono',monospace}
.v2-ticker .lbl{flex:none;background:#FF3B3B;color:#fff;font-weight:700;letter-spacing:.12em;padding:8px 10px}
.v2-ticker .trk{overflow:hidden;flex:1;white-space:nowrap}.v2-ticker .run{display:inline-block;padding-left:12px;animation:v2-tick 120s linear infinite}
.v2-ticker:hover .run{animation-play-state:paused}.v2-ticker a{color:#E6EAF0;text-decoration:none}.v2-ticker a:hover{color:#4ADE80}.v2-ticker b{color:#FF3B3B;margin:0 14px}
@keyframes v2-tick{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.v2-ticker .run{animation:none}.v2-src.src-live i{animation:none}}
.v2-3d{display:inline-flex;width:140px;height:140px;align-items:center;justify-content:center;flex:none}.v2-3d canvas{width:140px!important;height:140px!important}
.v2-video{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:24px;align-items:center;margin:28px 0;padding:18px;border:1px solid #232C3B;border-radius:4px;background:#0E131D}
.v2-video h2{margin:0 0 10px}.v2-video p{margin:0;color:#AEB7C3;font-size:15px;line-height:1.5}
.v2-video video{width:100%;height:auto;aspect-ratio:16/9;background:#000;border-radius:3px;display:block}
@media (max-width:860px){.v2-video{grid-template-columns:1fr}}
.v2-skip{position:absolute;left:-9999px;top:8px;z-index:10000;padding:8px 12px;background:#4ADE80;color:#000;font:700 13px 'IBM Plex Mono',monospace}.v2-skip:focus{left:8px}
.v2-sponsor{margin:10px 0 0;text-align:right}.v2-nl{margin:18px 0 0;padding:16px;border:1px solid #232C3B;border-radius:4px;background:#0E131D}
.v2-since{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:12px 0 0;padding:10px 14px;border:1px solid #232C3B;border-left:4px solid #818CF8;border-radius:4px;background:#0E131D;font:500 14px/1.4 'IBM Plex Sans',sans-serif;color:#E6EAF0}
.v2-since[hidden]{display:none}
.v2-since .k{font:600 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#818CF8}
.v2-since .v{flex:1;min-width:220px}.v2-since i{font-style:normal;color:#5B6676;margin:0 8px}
.v2-since a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.v2-since button{all:unset;cursor:pointer;color:#AEB7C3;font-size:18px;line-height:1;padding:2px 6px}.v2-since button:focus-visible{outline:2px solid #818CF8}
.v2 .bob{animation:v2bob 1.4s steps(2,start) infinite}
@keyframes v2bob{50%{transform:translateY(-4px)}}
@media (max-width:720px){
  .v2-sub{padding-left:0;font-size:14px}
  .v2-banner .v2-score{margin-left:0;align-items:flex-start}
  .v2-brand .v2-art{width:72px;height:72px}
  .v2-dock .tile{width:calc(33.33% - 7px);height:100px}
  .v2-bar.wide{grid-template-columns:120px minmax(0,1fr) 56px}
}
@media (prefers-reduced-motion:reduce){.v2 *{animation:none!important}}
`;

const DASH_CSS = `
.v2-mq{font-size:12px;letter-spacing:.1em;color:#AEB7C3;margin:12px 0 6px;font-weight:700}
.v2-pmg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.v2-pm{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:2px solid #2A3446;background:#0A0E16;color:#F3F4F6!important}
.v2-pm:hover{border-color:#A855F7}
.v2-pm.wide{grid-column:span 2}@media (max-width:720px){.v2-pm.wide{grid-column:span 1}}
.v2-pm span{font-size:13px;line-height:1.35}.v2-pm b{font-size:22px}.v2-pm i{font-style:normal;font-size:12px;font-weight:700}.v2-pm small{font-size:11px;color:#6B7686}
.v2-pm em{font-style:normal;font-size:11px;font-weight:700;letter-spacing:.1em;color:#C4B5FD;margin-top:auto}
.v2-pmn{font-size:11.5px;color:#6B7686;margin:10px 0 0}
.v2-dash{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:18px 28px;align-items:center;border:2px solid #232C3B;background:#060A10;padding:16px 20px}
.v2-dial{width:100%;height:auto;display:block}
.v2-needle{transform:rotate(var(--to));animation:v2-sweep 1.2s cubic-bezier(.2,.8,.2,1) both}
@keyframes v2-sweep{from{transform:rotate(-90deg)}to{transform:rotate(var(--to))}}
@media (prefers-reduced-motion:reduce){.v2-needle{animation:none}}
.v2-dinfo{display:flex;flex-direction:column;gap:12px;min-width:0}
.v2-chips{display:flex;gap:8px;flex-wrap:wrap}
.v2-dchip{font-weight:700;font-size:15px;padding:6px 12px;border:2px solid #2A3446;background:#0A0E16;color:#D7DCE3}
.v2-dchip.up{border-color:#7F1D1D;color:#FCA5A5}.v2-dchip.dn{border-color:#14532D;color:#86EFAC}.v2-dchip.mute{opacity:.6}
.v2-dline{margin:0;font-size:15px;color:#D7DCE3}
.v2-dbtns{display:flex;gap:8px;flex-wrap:wrap}
.v2-btn.sm{min-height:44px;padding:0 14px;font-size:13px}
.v2-btn.ghost{background:transparent;border:2px solid #3B4FD9}
.v2 b.up,.v2 .up{color:#FCA5A5}.v2 b.dn,.v2 .dn{color:#86EFAC}
.v2-moved .v2-mv{display:flex;flex-wrap:wrap;gap:8px 18px;margin:10px 0 0;font-size:14px}
.v2-mvi{margin:10px 0 0;padding-left:18px;font-size:14px;line-height:1.45}.v2-mvi small{color:#6B7686}
.v2-hist .v2-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.v2-tabs input{position:absolute;opacity:0;pointer-events:none}
.v2-tabs label{cursor:pointer;padding:8px 14px;border:2px solid #2A3446;font-weight:700;font-size:13px;min-height:40px;display:inline-flex;align-items:center}
.v2-tabs input:checked+label{border-color:#4ADE80;color:#000;background:#4ADE80}
.v2-tabs input:focus-visible+label{outline:2px solid #fff}
.v2-tabp{display:none;width:100%;order:9}
#v2r0:checked~.v2-tabp[data-i="0"],#v2r1:checked~.v2-tabp[data-i="1"],#v2r2:checked~.v2-tabp[data-i="2"],#v2r3:checked~.v2-tabp[data-i="3"]{display:block}
.v2-hchart{width:100%;height:auto;display:block;margin-top:8px}
.v2-nodata{color:#6B7686;font-size:13px}
.v2-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;color:#AEB7C3;margin-top:6px}
.v2-legend i{display:inline-block;width:14px;height:2px;margin-right:6px;vertical-align:middle}
.v2-loud{border-top:1px solid #1E2633;padding:8px 0}
.v2-loud summary{display:grid;grid-template-columns:150px 1fr 120px 82px;gap:10px;align-items:center;cursor:pointer;list-style:none;min-height:40px}
.v2-loud summary::-webkit-details-marker{display:none}
.v2-loud .pn{font-size:12px;font-weight:700;letter-spacing:.06em}
.v2-loud .t{height:10px;background:#1E2633;position:relative}.v2-loud .t i{position:absolute;inset:0 auto 0 0}
.v2-loud b{text-align:right;font-variant-numeric:tabular-nums}.v2-loud b.mute{color:#6B7686;font-size:11px}
.v2-spark{width:120px;height:28px;display:block}
.v2-loud p{margin:8px 0 4px;font-size:13px;color:#AEB7C3;line-height:1.5}.v2-loud .sh{color:#A5B4FC;font-weight:700}
.v2-loud ul{margin:0;padding-left:16px;font-size:12.5px;line-height:1.6;color:#D7DCE3}
.v2-loud li.cal{color:#AEB7C3}.v2-loud li.bad{color:#FCA5A5}
.v2-formula{font-size:12.5px;color:#AEB7C3;margin:12px 0 0;line-height:1.5}
.v2-health p{font-size:13.5px;line-height:1.55;color:#D7DCE3;margin:10px 0 0}.v2-health .v2-eta{color:#AEB7C3}
.v2-health details{margin-top:10px}.v2-health summary{cursor:pointer;color:#A5B4FC;font-size:13px;min-height:36px;display:flex;align-items:center}
.v2-tw{overflow-x:auto}.v2-health table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
.v2-health th,.v2-health td{text-align:left;padding:6px 8px;border-bottom:1px solid #1E2633;white-space:nowrap}
.v2-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;background:#6B7686}.v2-dot.ok{background:#4ADE80}.v2-dot.cal{background:#FACC15}.v2-dot.bad{background:#F87171}
.v2-alt summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.v2-alt summary::-webkit-details-marker{display:none}
.v2-alt p{font-size:13px;color:#AEB7C3}
.v2-altg{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.v2-altg div{border:1px solid #232C3B;padding:10px;display:flex;flex-direction:column;gap:4px}
.v2-altg b{font-size:12px;letter-spacing:.06em;color:#A5B4FC}.v2-altg .n{font-size:20px;font-weight:700}.v2-altg small{font-size:11.5px;color:#AEB7C3;line-height:1.4}
.v2-vfywrap{--accent:#4ADE80;--mono:'IBM Plex Mono',monospace;--t-sm:13px;--ink:#F3F4F6;--ink-dim:#AEB7C3;--rule:#232C3B;border:2px solid #232C3B;padding:4px 20px 16px;background:#060A10}
.v2-vfywrap h2{font-size:18px;font-weight:700;margin:12px 0 6px}.v2-vfywrap p{font-size:14px;color:#AEB7C3;line-height:1.55}
@media (max-width:720px){
  .v2-card .row.sb{flex-wrap:wrap;gap:6px}
  .v2-card h3{min-width:0;max-width:100%}.v2-card h3 svg{max-width:100%;height:auto}
  .v2-dash{grid-template-columns:1fr;padding:12px}
  .v2-dial{max-width:340px;margin:0 auto}
  .v2-loud summary{grid-template-columns:1fr 64px;grid-template-areas:"n b" "t t" "s s";row-gap:6px}
  .v2-loud .pn{grid-area:n}.v2-loud b{grid-area:b}.v2-loud .t{grid-area:t}.v2-loud .v2-spark{grid-area:s;width:100%}
  .v2-sub{padding-left:0}
  .v2-top .right{margin-left:0}
}`;
