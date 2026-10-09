// THE ONE HEADER. Every page on the site, whoever wrote it (a template, a
// hand-built page in site/static, the homepage), opens with the same bar: the
// siren and wordmark home, the live level chip, a short primary nav and an
// "All rooms" control that opens a searchable list of every room.
//
// sitebar.mjs stamp() injects it right after <body> on any page that does not
// already carry the mark below, so a page added tomorrow gets it for free.
// The room list itself ships once, in nav/site-nav.js (written by stampAll),
// so 800 pages do not each carry 15KB of the same links; the primary nav, the
// breadcrumb and the related rooms are plain HTML on every page.

import { pixelText } from './templates/_pixel.mjs';
import { SEARCH_CORE_JS } from './searchcore.mjs';

export const HEADER_MARK = 'data-siteheader';
export const NAV_JS_PATH = 'nav/site-nav.js';

const LEVEL_COLOR = { 5: '#4FB3FF', 4: '#4ADE80', 3: '#FACC15', 2: '#FB923C', 1: '#F87171' };

export const PRIMARY = [
  ['/', 'Index'],
  ['/race.html', 'Race'],
  ['/news.html', 'News'],
  ['/leaders.html', 'Leaders'],
  ['/monitor.html', 'Monitor'],
  ['/dispatch.html', 'Dispatch'],
  ['/moltbook.html', 'Agent Watch'],
  ['/videos.html', 'Videos'],
  ['/radio.html', 'Radio'],
];

// WHAT'S NEW: the newest rooms and features, surfaced in the header (✦ New),
// at the top of the room finder and as a strip on the homepage. Newest first;
// keep it to about six so it stays a highlight reel, not a second menu.
export const WHATS_NEW = [
  ['/si-watch.html#coding', 'px:agentcode', 'What AI agents are coding', 'Live: agent pull requests by kind of work, language and repo.'],
  ['/day-after.html', 'px:flame', 'The Day After', 'Game out the public revolt after an AI catastrophe.'],
  ['/dispatch.html', 'px:seismo', 'Live alerts', 'Big quakes and extreme weather within about a minute.'],
  ['/leaders.html', 'px:headline', 'Leaders in the news', 'Every AI boss’s coverage, refreshed every 15 minutes.'],
  ['/contain.html', 'px:joystick', 'Containment', 'Arcade: stop rogue AI processes breaching the firewall.'],
];

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const imgOf = (base, n) => (String(n).startsWith('px:') ? `${base}/img/px-${String(n).slice(3)}.svg` : `${base}/img/art-${n}.webp`);

/** roomGroups(ctx) rows -> a flat, serialisable list: [href, icon, label, blurb, group]. */
export function flattenRooms(groups) {
  return (groups || []).flatMap(([g, list]) => list.map(([href, art, label, , blurb]) => [href, art, label, blurb || '', g]));
}

/** The room a published path belongs to, or null. rel is 'race.html', 'index.html', 'moves/x.html'. */
export function roomFor(rooms, rel) {
  const p = `/${String(rel || '').replace(/^\/+/, '')}`;
  return (rooms || []).find((r) => r[0] === p) || (rooms || []).find((r) => r[0].split('#')[0] === p) || null;
}

function currentPath(rel) {
  const p = `/${String(rel || '').replace(/^\/+/, '')}`;
  return p === '/index.html' ? '/' : p;
}

export const HEADER_CSS = `<style ${HEADER_MARK}-css>
.sh{--sh-bg:#000;--sh-panel:#0E131D;--sh-line:#232C3B;--sh-btn:#2A3446;--sh-ink:#E6EAF0;--sh-mute:#AEB7C3;--sh-acc:#4F46E5;--sh-acc2:#818CF8;
  position:relative;z-index:60;background:var(--sh-bg);border-bottom:2px solid var(--sh-line);color:var(--sh-ink);
  font:600 12px/1.2 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;-webkit-text-size-adjust:100%}
.sh *,.sh *::before,.sh *::after{box-sizing:border-box}
.sh a{text-decoration:none;color:inherit}
.sh__in{max-width:1240px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:12px;min-height:60px}
.sh__brand{display:inline-flex;align-items:center;gap:10px;flex:0 0 auto;min-height:44px}
.sh__brand img{display:block;width:36px;height:36px}
.sh .v2-ptext{display:block;line-height:0}.sh .v2-px{display:block}
.sh .v2-sr,.sh__sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sh__lv{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 9px;border:1px solid var(--sh-lv);background:#03130A;color:var(--sh-lv);font-weight:700;font-size:12px;white-space:nowrap}
.sh__lv i{width:8px;height:8px;border-radius:50%;background:var(--sh-lv);box-shadow:0 0 8px var(--sh-lv)}
.sh__nav{flex:1 1 auto;min-width:0;display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
.sh__nav::-webkit-scrollbar{display:none}
.sh__nav a:first-child{margin-left:auto}
.sh__nav a{flex:0 0 auto;display:inline-flex;align-items:center;min-height:44px;padding:0 9px;color:var(--sh-mute);border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;text-transform:uppercase;font-size:11.5px}
.sh__nav a:hover{color:#fff}
.sh__nav a[aria-current=page]{color:#fff;border-bottom-color:var(--sh-acc2)}
.sh__all{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:0;background:var(--sh-acc);color:#fff;font:inherit;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.sh__all:hover{background:#4338CA}
.sh__new{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 12px;border:2px solid #FACC15;background:transparent;color:#FACC15;font:inherit;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.sh__new:hover{background:#FACC15;color:#000}
@media (max-width:560px){.sh__new{padding:0 10px}.sh__new span{display:none}}
.sh-rooms__g.sh-rooms__g--new{color:#FACC15}
.sh__srch{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:44px;border:2px solid var(--sh-btn);background:transparent;color:var(--sh-ink);cursor:pointer}
.sh__srch:hover{border-color:var(--sh-acc2);color:#fff}
.sh-rooms__chips{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-bottom:1px solid #232C3B;scrollbar-width:none}
.sh-rooms__chips::-webkit-scrollbar{display:none}
.sh-rooms__chips button{flex:0 0 auto;min-height:32px;padding:0 10px;border:1px solid #2A3446;background:#0E131D;color:#D7DCE3;font:600 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.sh-rooms__chips button:hover{border-color:#818CF8;color:#fff}
.sh-rooms__g--rec{color:#FACC15}
.sh-pn{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 18px}
.sh-pn a{display:flex;flex-direction:column;gap:3px;min-height:56px;padding:10px 12px;border:2px solid #2A3446;background:#0E131D;color:#E6EAF0!important;text-decoration:none!important}
.sh-pn a:hover{border-color:#6366F1;background:#161D33}
.sh-pn small{color:#AEB7C3;font:600 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}
.sh-pn b{font-weight:650}
.sh-pn a[data-sh-next]{text-align:right;grid-column:2}
.sh__all svg{display:block}
.sh__all kbd{font:inherit;font-size:10px;border:1px solid rgba(255,255,255,.55);padding:1px 5px}
.sh a:focus-visible,.sh button:focus-visible,.sh-rooms a:focus-visible,.sh-rel a:focus-visible,.sh-rel button:focus-visible,.sh-top:focus-visible,video:focus-visible{outline:2px solid #E2A03B;outline-offset:2px}
@media (max-width:1360px){.sh__lv b{display:none}.sh__all kbd{display:none}.sh__nav a{padding:0 7px}}
@media (max-width:1180px){.sh__nav{mask-image:linear-gradient(90deg,#000 90%,transparent)}}
@media (max-width:900px){.sh__nav{display:none}.sh__lv{margin-left:auto}}
@media (max-width:560px){.sh__in{gap:6px;padding:0 10px;min-height:56px}.sh__brand svg{width:96px;height:auto}.sh__brand img{width:32px;height:32px}.sh__lv{padding:4px 7px;font-size:11px}.sh__all{padding:0 12px}.sh__all kbd,.sh__all span{display:none}.sh__lvw{display:none}.sh__srch{width:42px}}
.sh__lvw{font-style:normal}
@media (max-width:400px){.sh__srch{display:none}}
@media (max-width:340px){.sh__brand svg{display:none}}
.sh-rooms{width:min(720px,calc(100vw - 20px));max-height:min(82vh,760px);margin:7vh auto auto;padding:0;border:2px solid #2A3446;background:#0A0E16;color:#E6EAF0;box-shadow:0 30px 90px rgba(0,0,0,.7);font:500 14px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif}
.sh-rooms::backdrop{background:rgba(0,0,0,.72);backdrop-filter:blur(3px)}
.sh-rooms__box{display:flex;flex-direction:column;max-height:min(82vh,760px)}
.sh-rooms__top{display:flex;align-items:center;gap:8px;border-bottom:2px solid #232C3B}
.sh-rooms__q{flex:1 1 auto;min-width:0;min-height:52px;padding:0 16px;border:0;background:transparent;color:#fff;font:500 17px/1.3 system-ui,sans-serif;outline:none}
.sh-rooms__x{flex:0 0 auto;min-width:48px;min-height:48px;border:0;background:transparent;color:#AEB7C3;font:600 18px/1 system-ui,sans-serif;cursor:pointer}
.sh-rooms__x:hover{color:#fff}
.sh-rooms__l{list-style:none;margin:0;padding:6px 8px 10px;overflow-y:auto;flex:1 1 auto}
.sh-rooms__g{padding:12px 8px 4px;color:#86EFAC;font:700 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em}
.sh-rooms__i{display:flex;align-items:center;gap:12px;min-height:48px;padding:6px 8px;color:#E6EAF0;text-decoration:none;border-left:2px solid transparent}
.sh-rooms__i img{flex:0 0 auto;width:34px;height:34px;display:block}
.sh-rooms__i span{min-width:0;display:flex;flex-direction:column}
.sh-rooms__i b{font-weight:650}
.sh-rooms__i small{color:#AEB7C3;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sh-rooms__i:hover,.sh-rooms__i.on{background:#161D33;border-left-color:#818CF8}
.sh-rooms__i[aria-current=page] b::after{content:' · you are here';color:#86EFAC;font-weight:500;font-size:12px}
.sh-rooms__i--x b{color:#A5B4FC}
.sh-rooms__i mark{background:rgba(250,204,21,.28);color:inherit}
.sh-rooms__k{margin:0;padding:8px 16px;border-top:1px solid #232C3B;color:#AEB7C3;font:500 11px/1.3 'IBM Plex Mono',ui-monospace,monospace}
@media (max-width:560px){.sh-rooms{margin:10px auto auto;max-height:calc(100vh - 20px)}.sh-rooms__box{max-height:calc(100vh - 20px)}.sh-rooms__k{display:none}}
.sh-rel{max-width:1240px;margin:40px auto 0;padding:0 16px;color:#E6EAF0;font:500 14px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif}
.sh-rel *{box-sizing:border-box}
.sh-crumb{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:0 0 12px;padding:0;list-style:none;color:#AEB7C3;font:600 12px/1.3 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase}
.sh-crumb li+li::before{content:'›';margin-right:8px;color:#5B6576}
.sh-crumb a{color:#D7DCE3;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
.sh-crumb a:hover{color:#fff;text-decoration:underline}
.sh-crumb [aria-current]{color:#86EFAC}
.sh-rel__h{margin:0 0 10px;color:#AEB7C3;font:700 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}
.sh-rel__g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.sh-rel__a{display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 12px;border:2px solid #2A3446;background:#0E131D;color:#E6EAF0!important;text-decoration:none!important}
.sh-rel__a:hover{border-color:#6366F1;background:#161D33}
.sh-rel__a img{flex:0 0 auto;width:40px;height:40px;display:block}
.sh-rel__a span{min-width:0;display:flex;flex-direction:column;gap:2px}
.sh-rel__a b{font:700 12px/1.2 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase}
.sh-rel__a small{color:#AEB7C3;font-size:12.5px;line-height:1.35}
.sh-rel__more{margin:12px 0 0;display:flex;flex-wrap:wrap;gap:8px 16px}
.sh-rel__more a,.sh-rel__more button{all:unset;cursor:pointer;display:inline-flex;align-items:center;min-height:44px;color:#A5B4FC;font:600 12px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase}
.sh-rel__more a:hover,.sh-rel__more button:hover{color:#fff}
.sh-top{position:fixed;left:12px;bottom:12px;z-index:9997;display:none;align-items:center;justify-content:center;width:44px;height:44px;border:2px solid #2A3446;background:rgba(10,14,22,.94);color:#E6EAF0;font:700 18px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.4)}
.sh-top.on{display:inline-flex}
.sh-top:hover{border-color:#6366F1;color:#fff}
@media (max-width:700px){#sitebar,.sh-top{transition:transform .25s ease,opacity .25s ease}html.sh-dn #sitebar,html.sh-dn .sh-top{transform:translateY(160%);opacity:0;pointer-events:none}}
@media (prefers-reduced-motion:reduce){#sitebar,.sh-top{transition:none}}
@media print{.sh,.sh-rel,.sh-top{display:none}}
</style>`;

/** The bar itself. o: { rel, base, level, levelName, score }. */
export function headerHtml(o = {}) {
  const base = o.base || '';
  const cur = currentPath(o.rel);
  const lv = Number.isFinite(+o.level) ? +o.level : null;
  const color = LEVEL_COLOR[lv] || '#4ADE80';
  const score = Number.isFinite(+o.score) && o.score !== null && o.score !== '' ? Number(o.score).toFixed(1) : '';
  const nav = PRIMARY.map(([h, l]) => `<a href="${esc(base + h)}"${h === cur ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('');
  return `${HEADER_CSS}
<header class="sh" ${HEADER_MARK} role="banner"><div class="sh__in">
<a class="sh__brand" href="${esc(`${base}/`)}" aria-label="AI SIREN Index, home"><img src="${esc(`${base}/img/art-siren.webp`)}" width="36" height="36" alt="">${pixelText('AI SIREN INDEX', 3, '#FFFFFF')}</a>
<a class="sh__lv" href="${esc(`${base}/#signal`)}" style="--sh-lv:${color}" title="Current reading: SIREN ${esc(lv ?? '')}${o.levelName ? ` (${esc(o.levelName)})` : ''}, score ${esc(score)} of 100"><i aria-hidden="true"></i><span><em class="sh__lvw">SIREN </em>${esc(lv ?? '–')}${o.levelName ? `<b> · ${esc(String(o.levelName).toUpperCase())}</b>` : ''} · ${esc(score || '–')}</span></a>
<nav class="sh__nav" aria-label="Primary">${nav}</nav>
<button type="button" class="sh__new" data-sh-rooms-group="NEW ON SIREN" aria-haspopup="dialog" aria-controls="sh-rooms" title="What’s new on SIREN">✦<span> New</span></button>
<button type="button" class="sh__srch" data-sh-rooms data-sh-search aria-haspopup="dialog" aria-controls="sh-rooms" title="Search the site (/)"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.5" cy="7.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11.6 11.6 16 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg><b class="sh__sr">Search the site</b></button>
<button type="button" class="sh__all" data-sh-rooms aria-haspopup="dialog" aria-controls="sh-rooms"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="currentColor"/></svg><span>All rooms</span><kbd>/</kbd><b class="sh__sr">Open the list of every room</b></button>
</div></header>
<script>(function(){var h=document.currentScript&&document.currentScript.previousElementSibling,b=document.body;if(!h||!b)return;var s=getComputedStyle(b),px=function(v){return parseFloat(v)||0};var t=px(s.paddingTop)+px(s.marginTop),l=px(s.paddingLeft)+px(s.marginLeft),r=px(s.paddingRight)+px(s.marginRight);if(t||l||r){h.style.margin='-'+t+'px -'+r+'px '+(t?Math.min(t,16):0)+'px -'+l+'px'}})();</script>`;
}

/** "You are here" and three or four rooms from the same group, for the foot of a room page. */
export function relatedHtml(rooms, rel, base = '') {
  const room = roomFor(rooms, rel);
  if (!room) return '';
  const [href, , label, , group] = room;
  const same = rooms.filter((r) => r[4] === group);
  const at = same.findIndex((r) => r === room);
  const seen = new Set([href.split('#')[0]]);
  const pick = [];
  for (let k = 1; k < same.length && pick.length < 4; k += 1) {
    const r = same[(at + k) % same.length];
    const p = r[0].split('#')[0];
    if (seen.has(p)) continue;
    seen.add(p); pick.push(r);
  }
  const gTitle = group.charAt(0) + group.slice(1).toLowerCase();
  const uniq = same.filter((r, i) => same.findIndex((x) => x[0].split('#')[0] === r[0].split('#')[0]) === i);
  const ui = uniq.findIndex((r) => r[0].split('#')[0] === href.split('#')[0]);
  const prev = uniq.length > 1 && ui > 0 ? uniq[ui - 1] : null;
  const next = uniq.length > 1 && ui >= 0 && ui < uniq.length - 1 ? uniq[ui + 1] : null;
  const pn = prev || next ? `<div class="sh-pn">${prev ? `<a href="${esc(base + prev[0])}" data-sh-prev rel="prev"><small>← Previous · [</small><b>${esc(prev[2])}</b></a>` : ''}${next ? `<a href="${esc(base + next[0])}" data-sh-next rel="next"><small>Next · ] →</small><b>${esc(next[2])}</b></a>` : ''}</div>` : '';
  return `
<nav class="sh-rel" ${HEADER_MARK}-rel aria-label="You are here">
<ol class="sh-crumb"><li><a href="${esc(`${base}/`)}">Home</a></li><li><a href="${esc(`${base}/#rooms`)}" data-sh-rooms-group="${esc(group)}">${esc(gTitle)}</a></li><li><span aria-current="page">${esc(label)}</span></li></ol>
${pn}
${pick.length ? `<p class="sh-rel__h">Related rooms · ${esc(gTitle)}</p>
<div class="sh-rel__g">${pick.map(([h, art, l, b]) => `<a class="sh-rel__a" href="${esc(base + h)}"><img src="${esc(imgOf(base, art))}" width="40" height="40" alt="" loading="lazy" decoding="async"><span><b>${esc(l)}</b><small>${esc(b)}</small></span></a>`).join('')}</div>` : ''}
<p class="sh-rel__more"><button type="button" data-sh-rooms>▦ Every room</button><a href="#" data-sh-top>↑ Back to top</a></p>
</nav>`;
}

/** The script: the All rooms dialog (built from the shared list), shortcuts, back to top. */
export function navJs(rooms, base = '') {
  const data = JSON.stringify({ base, rooms, primary: PRIMARY, news: WHATS_NEW }).replace(/</g, '\\u003c');
  return `/* SIREN shared navigation: built by site/siteheader.mjs. */
${SEARCH_CORE_JS}
(function(){
var D=${data};
if(window.__shNav)return;window.__shNav=1;
function img(n){return n.indexOf('px:')===0?D.base+'/img/px-'+n.slice(3)+'.svg':D.base+'/img/art-'+n+'.webp'}
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var here=location.pathname.replace(/index\\.html$/,'');
function cur(h){var p=(D.base+h).split('#')[0].replace(/index\\.html$/,'');return p===here}
var dlg=null,q,items=[],stat=[],sel=0;
function build(){
  dlg=document.createElement('dialog');dlg.className='sh-rooms';dlg.id='sh-rooms';dlg.setAttribute('aria-label','Every room');
  var h='<div class="sh-rooms__box"><div class="sh-rooms__top"><input class="sh-rooms__q" type="search" placeholder="Find a room, or search everything…" aria-label="Find a room or search the site" autocomplete="off" spellcheck="false"><button type="button" class="sh-rooms__x" aria-label="Close">✕</button></div><ul class="sh-rooms__l">';
  var secs=[].slice.call(document.querySelectorAll('[data-sec][id]'));
  if(secs.length){h+='<li class="sh-rooms__g">ON THIS PAGE</li>';secs.forEach(function(s){var l=s.getAttribute('data-sec');h+='<li><a class="sh-rooms__i" href="#'+e(s.id)+'" data-k="'+e((l+' on this page section').toLowerCase())+'"><span><b>'+e(l)+'</b><small>On this page</small></span></a></li>'})}
  // Home first, then the rooms you used last, then every group once.
  var homeK='index home war room level score dashboard';
  h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+'/')+'" data-k="'+homeK+'"'+(cur('/')?' aria-current="page"':'')+'><img src="'+e(img('siren'))+'" width="34" height="34" alt="" loading="lazy"><span><b>Index</b><small>The level, the score and the war room</small></span></a></li>';
  var byP={},uniq=[],seenP={};D.rooms.forEach(function(r){var k=r[0].split('#')[0];if(!byP[r[0]])byP[r[0]]=r;if(seenP[r[0]])return;seenP[r[0]]=1;uniq.push(r)});
  var rec=recent().filter(function(p){return byP[p]&&!cur(p)}).slice(0,5);
  if(rec.length){h+='<li class="sh-rooms__g sh-rooms__g--rec">RECENT</li>';rec.forEach(function(p){var r=byP[p];h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]).toLowerCase())+'"><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'})}
  if(D.news&&D.news.length){h+='<li class="sh-rooms__g sh-rooms__g--new">NEW ON SIREN</li>';D.news.forEach(function(r){h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' new').toLowerCase())+'"><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'})}
  var g='',groups=[];
  uniq.forEach(function(r){if(r[4]!==g){g=r[4];groups.push(g);h+='<li class="sh-rooms__g" id="shg-'+groups.length+'">'+e(g)+'</li>'}h+='<li><a class="sh-rooms__i" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' '+r[4]).toLowerCase())+'"'+(cur(r[0])?' aria-current="page"':'')+'><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'});
  // Group chips: jump straight to a section of the list.
  h=h.replace('<ul class="sh-rooms__l">','<nav class="sh-rooms__chips" aria-label="Jump to a group">'+groups.map(function(x,i){return '<button type="button" data-shg="'+(i+1)+'">'+e(x.charAt(0)+x.slice(1).toLowerCase())+'</button>'}).join('')+'</nav><ul class="sh-rooms__l">');
  h+='</ul><p class="sh-rooms__k">↑ ↓ move · Enter open · Esc close · / anywhere · [ ] prev/next room · <a href="'+e(D.base)+'/search.html" style="color:#A5B4FC">full search</a> · <a href="'+e(D.base)+'/catalog.html" style="color:#A5B4FC">catalog</a></p></div>';
  dlg.innerHTML=h;document.body.appendChild(dlg);
  q=dlg.querySelector('.sh-rooms__q');stat=items=[].slice.call(dlg.querySelectorAll('.sh-rooms__i'));
  q.addEventListener('input',filt);
  q.addEventListener('keydown',function(ev){var v=vis(),n=Math.max(1,v.length);if(ev.key==='ArrowDown'){ev.preventDefault();sel=(sel+1)%n;mark()}else if(ev.key==='ArrowUp'){ev.preventDefault();sel=(sel-1+n)%n;mark()}else if(ev.key==='Enter'&&v[sel]){ev.preventDefault();dlg.close();if(v[sel].target==='_blank')window.open(v[sel].href,'_blank','noopener');else location.href=v[sel].href}});
  dlg.querySelector('.sh-rooms__x').addEventListener('click',function(){dlg.close()});
  dlg.querySelector('.sh-rooms__chips').addEventListener('click',function(ev){var b=ev.target.closest('[data-shg]');if(!b)return;if(q.value){q.value='';filt()}var hd=dlg.querySelector('#shg-'+b.getAttribute('data-shg'));if(hd){var ul=dlg.querySelector('.sh-rooms__l');ul.scrollTop=hd.offsetTop-ul.offsetTop-4;var nx=hd.nextElementSibling&&hd.nextElementSibling.querySelector('.sh-rooms__i');sel=Math.max(0,vis().indexOf(nx));mark()}});
  dlg.addEventListener('click',function(ev){if(ev.target===dlg||(ev.target.closest&&ev.target.closest('a[href^="#"]')))dlg.close()});
}
function vis(){return items.filter(function(a){return a.parentNode.style.display!=='none'})}
// SEARCH EVERYTHING. Past the rooms, the same index /search.html uses
// (api/search-index.json, loaded on the first keystroke) adds stories,
// leaders, videos and data, and the last row always hands the query over.
var SX=null,SXrows=null,SXwait=false,roomSet={};D.rooms.forEach(function(r){roomSet[r[0]]=1});D.primary.forEach(function(p){roomSet[p[0]]=1});
function sxLoad(){if(SX||SXwait)return;SXwait=true;fetch(D.base+'/api/search-index.json').then(function(r){return r.json()}).then(function(d){SX=d;SXrows=window.sirenSearch.prep(d);if(dlg&&dlg.open&&q.value.trim())filt()}).catch(function(){})}
function sxImg(it){var n=it[5]||((SX&&SX.icons&&SX.icons[it[0]])||'px:doc');return img(n)}
function dyn(k){
  [].slice.call(dlg.querySelectorAll('.sh-dyn')).forEach(function(n){n.parentNode.removeChild(n)});
  var raw=q.value.trim(),ul=dlg.querySelector('.sh-rooms__l'),add=[];if(!raw)return add;
  if(raw.length>=2)sxLoad();
  var h='';
  if(SXrows&&raw.length>=2){var hits=window.sirenSearch.search(SXrows,raw).filter(function(x){return !roomSet[x.it[2]]}).slice(0,6);
    if(hits.length){h+='<li class="sh-rooms__g sh-dyn">ACROSS THE SITE</li>';hits.forEach(function(x){var it=x.it,ext=/^https?:/.test(it[2]);h+='<li class="sh-dyn"><a class="sh-rooms__i" href="'+e(ext?it[2]:D.base+it[2])+'"'+(ext?' target="_blank" rel="noopener"':'')+'><img src="'+e(sxImg(it))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+window.sirenSearch.hl(it[1],raw)+'</b><small>'+e(((SX.types&&SX.types[it[0]])||it[0])+(it[3]?' · '+it[3]:''))+'</small></span></a></li>'})}}
  h+='<li class="sh-dyn"><a class="sh-rooms__i sh-rooms__i--x" href="'+e(D.base+'/search.html?q='+encodeURIComponent(raw))+'"><span><b>Search everything for “'+e(raw)+'” →</b><small>Rooms, stories, leaders, videos, data and feeds</small></span></a></li>';
  ul.insertAdjacentHTML('beforeend',h);
  return [].slice.call(ul.querySelectorAll('.sh-dyn .sh-rooms__i'));
}
function mark(){var v=vis();items.forEach(function(a){a.classList.remove('on')});if(v.length){sel=Math.max(0,Math.min(sel,v.length-1));v[sel].classList.add('on');v[sel].scrollIntoView({block:'nearest'})}}
function filt(){var k=q.value.trim().toLowerCase();var heads=[].slice.call(dlg.querySelectorAll('.sh-rooms__g'));stat.forEach(function(a){a.parentNode.style.display=!k||(a.getAttribute('data-k').indexOf(k)>=0&&!(a.classList.contains('sh-rooms__i--p')&&a.getAttribute('href')!==D.base+'/'))?'':'none'});heads.forEach(function(hd){hd.style.display=k?'none':''});items=stat.concat(dyn(k));sel=0;mark()}
function open(prefill,group){if(!dlg)build();if(!dlg.showModal){location.href=D.base+'/#rooms';return}q.value=prefill||'';filt();if(!dlg.open)dlg.showModal();q.focus();if(prefill)q.select();
  if(group){[].forEach.call(dlg.querySelectorAll('.sh-rooms__g'),function(hd){if(hd.textContent===group){var ul=dlg.querySelector('.sh-rooms__l');ul.scrollTop=hd.offsetTop-ul.offsetTop-4}})}}
// RECENT rooms, kept in this browser only.
var RK='siren:recent';
function recent(){try{return JSON.parse(localStorage.getItem(RK)||'[]')}catch(x){return[]}}
(function remember(){var p=null;D.rooms.forEach(function(r){if(!p&&cur(r[0])&&r[0].indexOf('#')<0)p=r[0]});if(!p)return;try{var l=recent().filter(function(x){return x!==p});l.unshift(p);localStorage.setItem(RK,JSON.stringify(l.slice(0,8)))}catch(x){}})();
// [ and ] step to the previous / next room in this page's group.
window.addEventListener('keydown',function(ev){var t=ev.target,tag=t&&t.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)||ev.metaKey||ev.ctrlKey||ev.altKey||(dlg&&dlg.open))return;if(ev.key!=='['&&ev.key!==']')return;var a=document.querySelector(ev.key==='['?'[data-sh-prev]':'[data-sh-next]');if(a){ev.preventDefault();location.href=a.href}});
window.sirenRooms=open;
// Every "all rooms" control on the site opens this one list: ours, the inner
// pages' "All pages" tab and the homepage's Jump/ALL buttons.
document.addEventListener('click',function(ev){var t=ev.target&&ev.target.closest?ev.target.closest('[data-sh-rooms],[data-pal],[data-v2-jump],[data-sh-rooms-group],[data-sh-top]'):null;if(!t)return;
  if(t.hasAttribute('data-sh-top')){ev.preventDefault();toTop();return}
  ev.preventDefault();ev.stopImmediatePropagation();open('',t.getAttribute('data-sh-rooms-group')||'')},true);
window.addEventListener('keydown',function(ev){var t=ev.target,tag=t&&t.tagName;var typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable);
  var own=document.querySelector('[data-site-search]');if(ev.key==='/'&&!typing&&!ev.metaKey&&!ev.ctrlKey&&!ev.altKey&&own&&!(dlg&&dlg.open)){ev.preventDefault();ev.stopImmediatePropagation();own.focus();own.select();return}
  if((ev.key==='/'&&!typing&&!ev.metaKey&&!ev.ctrlKey&&!ev.altKey)||((ev.metaKey||ev.ctrlKey)&&String(ev.key).toLowerCase()==='k')){if(dlg&&dlg.open&&ev.key!=='/'){dlg.close()}else{open()}ev.preventDefault();ev.stopImmediatePropagation()}},true);
// BACK TO TOP: one button, bottom-left, after a screen and a half, clear of
// the freshness bar on phones and the intro chip.
function toTop(){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;window.scrollTo({top:0,behavior:rm?'auto':'smooth'});var b=document.querySelector('.sh__brand');if(b)try{b.focus({preventScroll:true})}catch(x){}}
var top=document.createElement('button');top.type='button';top.className='sh-top';top.setAttribute('aria-label','Back to top');top.textContent='↑';top.addEventListener('click',toTop);
function place(){var off=12;['sitebar','siren-intro'].forEach(function(id){var el=document.getElementById(id);if(!el)return;var r=el.getBoundingClientRect();if(r.width&&r.left<80&&r.bottom>innerHeight-140)off=Math.max(off,innerHeight-r.top+8)});[].forEach.call(document.querySelectorAll('nav.tab,nav.v2-tab'),function(el){var r=el.getBoundingClientRect();if(r.height&&getComputedStyle(el).display!=='none'&&r.bottom>=innerHeight-4)off=Math.max(off,innerHeight-r.top+8)});top.style.bottom=off+'px'}
// Phones: floating chrome slides away while reading down, back on scroll up.
var lastY=scrollY,root=document.documentElement;
function dir(){var y=scrollY,dy=y-lastY;if(Math.abs(dy)<8)return;var dn=dy>0&&y>240&&(innerHeight+y)<document.documentElement.scrollHeight-80;root.classList.toggle('sh-dn',dn);lastY=y}
function onScroll(){dir();var on=scrollY>innerHeight*1.5;if(on!==top.classList.contains('on')){top.classList.toggle('on',on);if(on)place()}}
function init(){document.body.appendChild(top);addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',place);onScroll()}
if(document.body)init();else document.addEventListener('DOMContentLoaded',init);
})();
`;
}
