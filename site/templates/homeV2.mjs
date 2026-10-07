// The homepage, PizzINT-style: one glowing level banner, an icon dock, the
// bosses on watch, the labs as monitored "locations", and two small charts.
// Everything is server-rendered: the level, the score and every count are text
// or inline SVG in the HTML, so the build's self-check and every screenshot see
// them without a script. The only script is the ticking UTC clock.
//
// The full instrument panel this replaced still builds, at /classic.html.
import { esc, num } from './_html.mjs';

import { blocks, pixelText, icon } from './_pixel.mjs';
import { sponsorLine, newsletterBox, tipLink, MZ_CSS } from '../monetize.mjs';

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
    ]],
    ['PLAY & PREP', [
      ['/arena.html#battle', 'stocks', 'AI Battle', null, 'AI models trade stocks and crypto against live prices.'],
      ['/arena.html', 'clipboard', 'Stock Picks', null, 'Daily rule-based stock picks, scored in public.'],
      ['/scanner.html', 'magnifier', 'Scanner', null, 'Screen stocks, ETFs and crypto in plain English.'],
      ['/bets.html', 'dice', 'Tally’s Bets', null, 'Daily forecasts about the index, scored in public.'],
      ['/game.html', 'joystick', 'Game', null, 'Thirty seconds: count signals, ignore predictions.'],
      ['/desk.html', 'canary', 'Tally’s Desk', null, 'The unserious counts: robots and godfathers.'],
      ['/bunker-kit.html', 'bunker', 'Bunker Kit', null, '50 free tools and six crates of emergency gear.'],
      ['/prepper-checklist.html', 'clipboard', 'Prepper Checklist', null, 'A 72-hour kit and two weeks at home, sized for you.'],
      ['/library.html', 'books', 'Reading List', null, 'Books from every side of the AI argument.'],
    ]],
    ['THE RECORD', [
      ['/ai-doomsday-clock.html', 'clock', 'The Clock', null, 'The reading as a clock face you can verify.'],
      ['/history.html', 'archive', 'History', ctx.history ? `${ctx.history.length} readings` : null, 'Sixty years of the argument, and every reading.'],
      ['/methodology.html', 'magnifier', 'Methodology', null, 'Every formula. Recompute the number yourself.'],
      ['/classic.html', 'siren', 'Full Panel', null, 'The full instrument panel, receipts and API.'],
      ['/feedback.html', 'mic', 'Feedback', null, 'Report a problem or send an idea. We read every one.'],
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
  <ul class="v2-pal__l">${[['#signal', 'Signal', 'The level, the score and the trend'], ['#breaking', 'Breaking', 'The top story right now'], ['#rooms', 'Every room', 'All features, grouped'], ['#bosses', 'Bosses', 'The AI leaders on watch'], ['#labs', 'Labs', 'The labs as monitored locations'], ['#readings', 'Readings', 'The score trend and what is loud'], ['#tally', 'Tally', 'Follow the alerts on X']].map(([h, l, b], i) => `<li><a class="v2-pal__i v2-pal__i--sec" href="${h}" data-k="${esc(`${l} ${b} section on this page`.toLowerCase())}"><span class="v2-pal__num">${i + 1}</span><span><b>${esc(l)}</b><small>On this page · ${esc(b)} · key ${i + 1}</small></span></a></li>`).join('')}${all.map(([p, art, label, n, blurb, g]) => `<li><a class="v2-pal__i" href="${href(p)}" data-k="${esc(`${label} ${blurb} ${g}`.toLowerCase())}"><img src="${img(art)}" width="36" height="36" alt="" loading="lazy"><span><b>${esc(label)}</b><small>${esc(blurb)}</small></span>${n ? `<i>${esc(n)}</i>` : ''}</a></li>`).join('')}</ul>
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
  const ok = sources.filter((s) => s.ok).length;

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
  const body = `
<div class="v2">
<div class="v2-top"><div class="v2-wrap">
  <span class="v2-chip">${icon('clock', 2)}<span id="v2-clock" class="tnum">${esc(String(state.generated_at).slice(0, 10))} ${esc(hhmm(state.generated_at))}</span></span>
  <span class="tag red" id="v2-fresh" data-at="${esc(state.generated_at)}">LAST READING <b>${esc(hhmm(state.generated_at))}</b></span>
  <span class="v2-chip">${icon('eye', 2)}${ok}/${sources.length} SOURCES REPORTING</span>
  <span class="right">
    <a class="tag green" href="#rooms">ALL ROOMS ↓</a>
    <button type="button" class="tag radio" id="siren-radio" data-level="${state.level}" aria-pressed="false" title="Play SIREN Radio: an original soundtrack generated in your browser. Its mood follows the level.">♪ RADIO</button>
    <a class="tag blue" href="${href('/history.html')}">HISTORY</a>
    <a class="tag violet" href="${href('/race.html')}">MARKETS</a>
    <span>STATUS: <b class="${state.degraded ? 'amber' : 'green'}">${state.degraded ? 'DEGRADED' : 'OPERATIONAL'}</b></span>
  </span>
</div></div>
${nav.strip}
<main class="v2-wrap v2-main" id="main">
  <div class="v2-brand">
    <img class="v2-art bob" src="${img('siren')}" width="112" height="112" alt="">
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
  <div class="v2-since" id="v2-since" hidden role="status"></div>
  <div class="v2-sponsor">${sponsorLine(href('/sponsor.html'))}</div>
  <script>window.SIREN_NOW=${JSON.stringify(sinceNow).replace(/</g, '\\u003c')}</script>

  ${top ? `<div class="v2-breaking" id="breaking" data-sec="Breaking"><span class="badge"><span class="blink">${icon('bolt', 2)}</span>BREAKING</span><a href="${esc(top.url)}" rel="noopener">${esc(top.title)}</a><span class="src">${esc(hhmm(top.published_at))} · ${esc(String(top.source).toUpperCase())}</span></div>` : ''}

<section class="v2-video" aria-labelledby="v2-video-h">
    <div class="txt"><h2 id="v2-video-h">${pixelText('WHAT IS SIREN?', 4, '#FFFFFF', 'fit')}</h2><p>A 42-second tour: the hourly reading, the five levels, and the rooms worth opening. Sound on: the soundtrack is SIREN Radio, generated from the same code as the ♪ button.</p></div>
    <video controls preload="none" playsinline width="1280" height="720" poster="${href('/media/siren-explainer-poster.jpg')}">
      <source src="${href('/media/siren-explainer.webm')}" type="video/webm">
      <source src="${href('/media/siren-explainer.mp4')}" type="video/mp4">
    </video>
  </section>
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoObject', name: 'What is SIREN? A 42-second tour of the AI Siren Index', description: 'How SIREN counts how loud AI is every hour, what its five levels mean, and the rooms on the site: the race, the newsroom, the AI bosses, real clips, the world monitor, the AI battle and the prepper kit.', thumbnailUrl: [ctx.url('/media/siren-explainer-poster.jpg')], uploadDate: '2026-10-07', duration: 'PT42S', contentUrl: ctx.url('/media/siren-explainer.mp4'), embedUrl: ctx.url('/') }).replace(/</g, '\\u003c')}</script>

${roomsGrid(ctx, href, img)}

  <div class="v2-sec" id="bosses" data-sec="Bosses"><h2>${pixelText('THE BOSSES ON WATCH', 4, '#FFFFFF', 'fit')}</h2><span>ON THE RECORD THIS WEEK · ${totals.on_record ?? 0} OF ${totals.leaders ?? 15}</span></div>
  <div class="v2-bosses">
    ${leaders.map((l) => { const s = bossStatus(l); return `<a class="boss" href="${href('/leaders.html')}"><img class="v2-face" loading="lazy" decoding="async" src="${img(FACE_BY_LEADER[l.id])}" width="96" height="96" alt=""><span class="nm">${esc(l.name.toUpperCase())}</span><span class="co">${esc(String(l.org).toUpperCase())}</span><span class="st ${s.cls}">${s.t}</span></a>`; }).join('')}
  </div>

  <div class="v2-sec" id="labs" data-sec="Labs"><h2>${pixelText(`${players.length} LABS MONITORED`, 4, '#FFFFFF', 'fit')}</h2><span>ODDS OF BEST MODEL IN 2026 · POLYMARKET</span></div>
  <div class="v2-labs">${players.map(lab).join('')}</div>

  <div class="v2-two" id="readings" data-sec="Readings">
    <div class="v2-card">
      <div class="row sb"><h3>${icon('shield', 3, '#4ADE80')}${pixelText('READINGS', 3, '#FFFFFF')}</h3><span class="live">LIVE</span></div>
      <div class="v2-cols" role="img" aria-label="Last ${hist.length} composite readings, ${scores.map((s) => num(s, 1)).join(', ')}">${cols}</div>
      <div class="row sb small"><span>${esc(hhmm(hist[0] && hist[0].t))}</span><span>AXIS ${lo}–${hi}</span><b>NOW · ${score}</b></div>
    </div>
    <div class="v2-card">
      <h3>${icon('speaker', 3)}${pixelText("WHAT'S LOUD", 3, '#FFFFFF')}</h3>
      <div class="stack">${pillars}</div>
    </div>
  </div>

  <div class="v2-cta" id="tally" data-sec="Tally">
    <img class="v2-art bob" loading="lazy" decoding="async" src="${img('canary')}" width="88" height="88" alt="">
    <div class="col">${pixelText('TALLY IS STILL SINGING', 4, '#FFFFFF', 'fit')}<span>Our duty canary posts on X the hour the level moves. Nothing in between. Or follow the <a href="${href('/feed-level.xml')}">level-change RSS feed</a>.</span></div>
    <a class="v2-btn" href="https://x.com/intent/follow?screen_name=SIRENutf6">FOLLOW @SIRENutf6 →</a>
  </div>
  ${newsletterBox(href('/privacy.html')) ? `<div class="v2-nl">${newsletterBox(href('/privacy.html'))}</div>` : ''}

  <p class="v2-foot">SIREN counts how loud AI is, every hour, from public data. A count, not a forecast. Portraits and icons are generated illustrations, not photographs.
  <a href="${href('/methodology.html')}">How it works</a> · <a href="${href('/classic.html#vfy')}">Verify a reading</a> · <a href="${href('/classic.html')}">Full instrument panel</a> · <a href="${href('/about.html')}">About</a> · <a href="${href('/sponsor.html')}">Sponsor</a>${tipLink() ? ` · ${tipLink()}` : ''}</p>
  <p class="v2-foot"><b>Not advice.</b> Information, commentary and satire only — not financial, investment, legal, security or safety advice. Data is automated and may be wrong or late; provided as is, with no warranty. Not affiliated with any company, lab, person or agency named here. Use of this site means you accept the <a href="${href('/terms.html')}">terms &amp; disclaimers</a>. <a href="${href('/privacy.html')}">Privacy</a>. <a href="${href('/feedback.html')}">Report a problem or send feedback</a>.</p>
</main>
${nav.palette}${nav.tabbar}
<nav class="v2-rail" aria-label="On this page"><span class="v2-rail__h">ON THIS PAGE</span><ol id="v2-rail-l"></ol><a class="v2-rail__top" href="#main">↑ TOP</a></nav>
</div>
<script>${NAV_JS}</script>
<script>${WAR_JS}</script>
<script>(function(){var el=document.getElementById('v2-clock');if(!el)return;function p(n){return(n<10?'0':'')+n}function t(){var d=new Date();el.textContent=d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate())+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds())+'Z'}t();setInterval(t,1000)})();</script>`;

  return `<!doctype html>
<html lang="en">
${head.replace('</head>', `<style>${CSS}</style>${MZ_CSS}\n</head>`)}
<body class="v2-body"><a class="v2-skip" href="#signal">Skip to the reading</a>${body}
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
