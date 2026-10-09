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

export const HEADER_MARK = 'data-siteheader';
export const NAV_JS_PATH = 'nav/site-nav.js';

const LEVEL_COLOR = { 5: '#4FB3FF', 4: '#4ADE80', 3: '#FACC15', 2: '#FB923C', 1: '#F87171' };

// Three doors, not a hallway of peers (docs/GROWTH.md §05, SITE-UPGRADES-90 §1D.4).
// Everything else stays one tap away under All rooms (/).
export const PRIMARY = [
  ['/', 'Index'],
  ['/evidence.html', 'Evidence'],
  ['/methodology.html', 'Method'],
];

/** Fallback icon + blurb when a primary path is not yet in the room catalogue. */
export const PRIMARY_META = {
  '/': ['siren', 'The level, the score and the war room'],
  '/evidence.html': ['news', 'Newsroom, race, leaders, map, watts — what backs the number'],
  '/methodology.html': ['magnifier', 'Every formula. Recompute the number yourself.'],
};

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
.sh{--sh-bg:#000;--sh-panel:#0E131D;--sh-line:#232C3B;--sh-btn:#2A3446;--sh-ink:#E6EAF0;--sh-mute:#AEB7C3;--sh-acc:#6366F1;--sh-acc2:#818CF8;
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
.sh__all:hover{background:#4F46E5}
.sh__all svg{display:block}
.sh__all kbd{font:inherit;font-size:10px;border:1px solid rgba(255,255,255,.55);padding:1px 5px}
.sh a:focus-visible,.sh button:focus-visible,.sh-rooms a:focus-visible,.sh-rel a:focus-visible,.sh-top:focus-visible{outline:2px solid #E2A03B;outline-offset:2px}
@media (max-width:1360px){.sh__lv b{display:none}}
@media (max-width:1180px){.sh__nav{mask-image:linear-gradient(90deg,#000 90%,transparent)}}
@media (max-width:900px){.sh__nav{display:none}.sh__lv{margin-left:auto}}
@media (max-width:560px){.sh__in{gap:8px;padding:0 12px;min-height:56px}.sh__brand svg{width:118px;height:auto}.sh__brand img{width:32px;height:32px}.sh__lv{padding:4px 7px;font-size:11px}.sh__all{padding:0 12px}.sh__all kbd,.sh__all span{display:none}}
@media (max-width:360px){.sh__brand svg{display:none}}
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
<a class="sh__lv" href="${esc(`${base}/#signal`)}" style="--sh-lv:${color}" title="Current reading: SIREN ${esc(lv ?? '')}${o.levelName ? ` (${esc(o.levelName)})` : ''}, score ${esc(score)} of 100"><i aria-hidden="true"></i><span>SIREN ${esc(lv ?? '–')}${o.levelName ? `<b> · ${esc(String(o.levelName).toUpperCase())}</b>` : ''} · ${esc(score || '–')}</span></a>
<nav class="sh__nav" aria-label="Primary">${nav}</nav>
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
  return `
<nav class="sh-rel" ${HEADER_MARK}-rel aria-label="You are here">
<ol class="sh-crumb"><li><a href="${esc(`${base}/`)}">Home</a></li><li><a href="${esc(`${base}/#rooms`)}" data-sh-rooms-group="${esc(group)}">${esc(gTitle)}</a></li><li><span aria-current="page">${esc(label)}</span></li></ol>
${pick.length ? `<p class="sh-rel__h">Related rooms · ${esc(gTitle)}</p>
<div class="sh-rel__g">${pick.map(([h, art, l, b]) => `<a class="sh-rel__a" href="${esc(base + h)}"><img src="${esc(imgOf(base, art))}" width="40" height="40" alt="" loading="lazy" decoding="async"><span><b>${esc(l)}</b><small>${esc(b)}</small></span></a>`).join('')}</div>` : ''}
<p class="sh-rel__more"><button type="button" data-sh-rooms>▦ Every room</button><a href="#" data-sh-top>↑ Back to top</a></p>
</nav>`;
}

/** The script: the All rooms dialog (built from the shared list), shortcuts, back to top. */
export function navJs(rooms, base = '') {
  const data = JSON.stringify({ base, rooms, primary: PRIMARY, primaryMeta: PRIMARY_META }).replace(/</g, '\\u003c');
  return `/* SIREN shared navigation: built by site/siteheader.mjs. */
(function(){
var D=${data};
if(window.__shNav)return;window.__shNav=1;
function img(n){return n.indexOf('px:')===0?D.base+'/img/px-'+n.slice(3)+'.svg':D.base+'/img/art-'+n+'.webp'}
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var here=location.pathname.replace(/index\\.html$/,'');
function cur(h){var p=(D.base+h).split('#')[0].replace(/index\\.html$/,'');return p===here}
var dlg=null,q,items=[],sel=0;
function build(){
  dlg=document.createElement('dialog');dlg.className='sh-rooms';dlg.id='sh-rooms';dlg.setAttribute('aria-label','Every room');
  var h='<div class="sh-rooms__box"><div class="sh-rooms__top"><input class="sh-rooms__q" type="search" placeholder="Find a room… (type to filter)" aria-label="Filter rooms" autocomplete="off" spellcheck="false"><button type="button" class="sh-rooms__x" aria-label="Close">✕</button></div><ul class="sh-rooms__l">';
  var secs=[].slice.call(document.querySelectorAll('[data-sec][id]'));
  if(secs.length){h+='<li class="sh-rooms__g">ON THIS PAGE</li>';secs.forEach(function(s){var l=s.getAttribute('data-sec');h+='<li><a class="sh-rooms__i" href="#'+e(s.id)+'" data-k="'+e((l+' on this page section').toLowerCase())+'"><span><b>'+e(l)+'</b><small>On this page</small></span></a></li>'})}
  h+='<li class="sh-rooms__g">START HERE</li>';
  var meta=D.primaryMeta||{};
  D.primary.forEach(function(p){var r=null;D.rooms.forEach(function(x){if(!r&&x[0]===p[0])r=x});var m=meta[p[0]]||['siren','The level, the score and the war room'];h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+p[0])+'" data-k="'+e((p[1]+' '+(r?r[2]+' '+r[3]:m[1])).toLowerCase())+'"'+(cur(p[0])?' aria-current="page"':'')+'><img src="'+e(img(r?r[1]:m[0]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(p[1])+'</b><small>'+e(r?r[3]:m[1])+'</small></span></a></li>'});
  var g='';
  D.rooms.forEach(function(r){if(r[4]!==g){g=r[4];h+='<li class="sh-rooms__g">'+e(g)+'</li>'}h+='<li><a class="sh-rooms__i" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' '+r[4]).toLowerCase())+'"'+(cur(r[0])?' aria-current="page"':'')+'><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'});
  h+='</ul><p class="sh-rooms__k">↑ ↓ to move · Enter to open · Esc to close · press / anywhere</p></div>';
  dlg.innerHTML=h;document.body.appendChild(dlg);
  q=dlg.querySelector('.sh-rooms__q');items=[].slice.call(dlg.querySelectorAll('.sh-rooms__i'));
  q.addEventListener('input',filt);
  q.addEventListener('keydown',function(ev){var v=vis(),n=Math.max(1,v.length);if(ev.key==='ArrowDown'){ev.preventDefault();sel=(sel+1)%n;mark()}else if(ev.key==='ArrowUp'){ev.preventDefault();sel=(sel-1+n)%n;mark()}else if(ev.key==='Enter'&&v[sel]){ev.preventDefault();dlg.close();location.href=v[sel].href}});
  dlg.querySelector('.sh-rooms__x').addEventListener('click',function(){dlg.close()});
  dlg.addEventListener('click',function(ev){if(ev.target===dlg||(ev.target.closest&&ev.target.closest('a[href^="#"]')))dlg.close()});
}
function vis(){return items.filter(function(a){return a.parentNode.style.display!=='none'})}
function mark(){var v=vis();items.forEach(function(a){a.classList.remove('on')});if(v.length){sel=Math.max(0,Math.min(sel,v.length-1));v[sel].classList.add('on');v[sel].scrollIntoView({block:'nearest'})}}
function filt(){var k=q.value.trim().toLowerCase();var heads=[].slice.call(dlg.querySelectorAll('.sh-rooms__g'));items.forEach(function(a){a.parentNode.style.display=!k||(a.getAttribute('data-k').indexOf(k)>=0&&!(a.classList.contains('sh-rooms__i--p')&&a.getAttribute('href')!==D.base+'/'))?'':'none'});heads.forEach(function(hd){hd.style.display=k?'none':''});sel=0;mark()}
function open(prefill){if(!dlg)build();if(!dlg.showModal){location.href=D.base+'/#rooms';return}q.value=prefill||'';filt();if(!dlg.open)dlg.showModal();q.focus();if(prefill)q.select()}
window.sirenRooms=open;
// Every "all rooms" control on the site opens this one list: ours, the inner
// pages' "All pages" tab and the homepage's Jump/ALL buttons.
document.addEventListener('click',function(ev){var t=ev.target&&ev.target.closest?ev.target.closest('[data-sh-rooms],[data-pal],[data-v2-jump],[data-sh-rooms-group],[data-sh-top]'):null;if(!t)return;
  if(t.hasAttribute('data-sh-top')){ev.preventDefault();toTop();return}
  ev.preventDefault();ev.stopImmediatePropagation();open(t.getAttribute('data-sh-rooms-group')||'')},true);
window.addEventListener('keydown',function(ev){var t=ev.target,tag=t&&t.tagName;var typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable);
  if((ev.key==='/'&&!typing&&!ev.metaKey&&!ev.ctrlKey&&!ev.altKey)||((ev.metaKey||ev.ctrlKey)&&String(ev.key).toLowerCase()==='k')){if(dlg&&dlg.open&&ev.key!=='/'){dlg.close()}else{open()}ev.preventDefault();ev.stopImmediatePropagation()}},true);
// BACK TO TOP: one button, bottom-left, after a screen and a half, clear of
// the freshness bar on phones and the intro chip.
function toTop(){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;window.scrollTo({top:0,behavior:rm?'auto':'smooth'});var b=document.querySelector('.sh__brand');if(b)try{b.focus({preventScroll:true})}catch(x){}}
var top=document.createElement('button');top.type='button';top.className='sh-top';top.setAttribute('aria-label','Back to top');top.textContent='↑';top.addEventListener('click',toTop);
function place(){var off=12;['sitebar','siren-intro'].forEach(function(id){var el=document.getElementById(id);if(!el)return;var r=el.getBoundingClientRect();if(r.width&&r.left<80&&r.bottom>innerHeight-140)off=Math.max(off,innerHeight-r.top+8)});[].forEach.call(document.querySelectorAll('nav.tab,nav.v2-tab'),function(el){var r=el.getBoundingClientRect();if(r.height&&getComputedStyle(el).display!=='none'&&r.bottom>=innerHeight-4)off=Math.max(off,innerHeight-r.top+8)});top.style.bottom=off+'px'}
function onScroll(){var on=scrollY>innerHeight*1.5;if(on!==top.classList.contains('on')){top.classList.toggle('on',on);if(on)place()}}
function init(){document.body.appendChild(top);addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',place);onScroll()}
if(document.body)init();else document.addEventListener('DOMContentLoaded',init);
})();
`;
}
