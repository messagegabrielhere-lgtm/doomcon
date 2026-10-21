// /today.html — daily AI dashboard as a horizontal swipe deck.
//
// Ainnect wins on the gesture: "one swipe each" with a bottom wheel and
// vertical-wheel → horizontal scroll. This page takes that shape for mood,
// boards, agents and news — without their light-theme shell and without
// hiding any fact behind JS (MOTION.md rule 0: every panel is in the HTML).

import { esc, utc, num } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/today.html';

export function hasToday(ctx) {
  return Boolean(
    (ctx.mood && Array.isArray(ctx.mood.companies))
    || (ctx.boards && Array.isArray(ctx.boards.boards))
    || (ctx.codingAgents && Array.isArray(ctx.codingAgents.agents)),
  );
}

export function render(ctx) {
  if (!hasToday(ctx)) {
    return page({
      ctx,
      path: PATH,
      noindex: true,
      title: `Today in AI · ${brand.NAME}`,
      description: 'Daily dashboard waiting on mood, boards or coding-agents data.',
      main: `<section><h1>Today in AI</h1><p class="lede">No dashboard inputs in this build yet.</p></section>`,
    });
  }

  const panels = buildPanels(ctx);
  const dots = panels.map((p, i) => (
    `<button type="button" class="td__dot${i === 0 ? ' is-on' : ''}" data-td-i="${i}"
      aria-label="${esc(p.label)} (${i + 1} of ${panels.length})"
      aria-current="${i === 0 ? 'true' : 'false'}"></button>`
  )).join('');

  const main = `<style>${css()}</style>
<div class="td" data-td-deck>
  <div class="td__viewport" tabindex="0" role="region"
       aria-roledescription="carousel"
       aria-label="Today in AI, ${panels.length} panels, swipe or scroll horizontally">
    <div class="td__rail">
      ${panels.map((p, i) => panelHtml(p, i, panels.length)).join('')}
    </div>
  </div>
  <nav class="td__wheel" aria-label="Dashboard panels">
    <button type="button" class="td__nb" data-td-dir="-1" aria-label="Previous panel">‹</button>
    <div class="td__dots" role="tablist">${dots}</div>
    <button type="button" class="td__nb" data-td-dir="1" aria-label="Next panel">›</button>
    <p class="td__hint" aria-hidden="true"><span data-td-pos>01</span> · swipe or scroll →</p>
  </nav>
</div>
${deckJs()}
<p class="td__foot">Machine surfaces:
  <a href="${esc(ctx.href('/api/mood.json'))}">mood</a> ·
  <a href="${esc(ctx.href('/api/boards.json'))}">boards</a> ·
  <a href="${esc(ctx.href('/api/coding-agents.json'))}">coding-agents</a>.
  Prefer those over scraping this HTML.</p>`;

  return page({
    ctx,
    path: PATH,
    title: `Today in AI — mood, boards, agent updates · ${brand.NAME}`,
    description: 'Daily AI dashboard: swipe between headline tone, public model boards, and coding-agent release status.',
    main,
  });
}

function buildPanels(ctx) {
  const panels = [{ id: 'glance', label: 'Glance', html: glancePanel(ctx) }];
  if (ctx.mood) panels.push({ id: 'mood', label: 'Mood', html: moodPanel(ctx) });
  if (ctx.boards) panels.push({ id: 'boards', label: 'Boards', html: boardsPanel(ctx) });
  if (ctx.codingAgents) panels.push({ id: 'agents', label: 'Agents', html: agentsPanel(ctx) });
  if (ctx.news?.items?.length) panels.push({ id: 'news', label: 'News', html: newsPanel(ctx) });
  return panels;
}

function panelHtml(p, i, total) {
  return `<section class="td__panel" id="td-${esc(p.id)}" data-td-panel="${i}"
    aria-label="${esc(p.label)}, panel ${i + 1} of ${total}">
    <div class="td__panel__in">${p.html}</div>
  </section>`;
}

function glancePanel(ctx) {
  const s = ctx.state;
  const m = ctx.mood;
  const b = ctx.boards;
  const ca = ctx.codingAgents;
  const g = m?.glance || {};
  const chips = [];
  if (g.leading) chips.push(stat('Leading tone', `${g.leading.name} ${fmt(g.leading.index)}`));
  if (g.trailing) chips.push(stat('Under pressure', `${g.trailing.name} ${fmt(g.trailing.index)}`));
  if (b?.glance?.openrouter_top) chips.push(stat('Top on OpenRouter', b.glance.openrouter_top.name));
  if (ca?.agents_summary) {
    chips.push(stat('Agent releases', `${ca.agents_summary.updated_this_week ?? 0} of ${ca.agents_summary.tracked} this week`));
  }
  return `
    <p class="eyebrow">${esc(brand.NAME)} · live</p>
    <h1 class="td__h1">Today in AI</h1>
    <p class="lede">Newsroom tone, model boards and coding-agent updates — one swipe each.
       The index still answers how loud the field is; this deck answers what moved around it.</p>
    ${s && Number.isFinite(s.score) ? `<p class="td__chip"><a href="${esc(ctx.href('/'))}">${esc(brand.NAME)} ${esc(s.level)}</a>
      · ${esc(num(s.score, 1))} of 100 · ${esc(s.level_name || '')} · ${esc(utc(s.generated_at))}</p>` : ''}
    <div class="td__glance">${chips.join('')}</div>
    <p class="td__note">Swipe, trackpad, arrow keys or the wheel below. Every panel is already in the HTML.</p>`;
}

function moodPanel(ctx) {
  const m = ctx.mood;
  const g = m.glance || {};
  const ranked = (m.ranked || []).slice(0, 8);
  const rows = ranked.map((c) => {
    const cls = c.index > 0 ? 'td__pos' : c.index < 0 ? 'td__neg' : '';
    return `<li><span>${esc(c.name)}</span><b class="${cls}">${fmt(c.index)}</b></li>`;
  }).join('');
  return `
    <div class="td__sec__h"><h2>Market mood</h2>
      <a href="${esc(ctx.href('/mood.html'))}">Full board →</a></div>
    <p class="td__note">${esc(m.totals?.headlines_naming_a_company ?? 0)} headlines scanned · ${esc(utc(m.generated_at))}</p>
    ${g.leading || g.trailing ? `<p class="td__lead">${g.leading ? `Leading: <b>${esc(g.leading.name)}</b> ${fmt(g.leading.index)}` : ''}
      ${g.trailing ? ` · Trailing: <b>${esc(g.trailing.name)}</b> ${fmt(g.trailing.index)}` : ''}</p>` : ''}
    <ol class="td__mood">${rows}</ol>`;
}

function boardsPanel(ctx) {
  const b = ctx.boards;
  const cards = (b.boards || []).filter((x) => x.ok).map((board) => {
    const top = (board.rows || []).slice(0, 5).map((r, i) => {
      const metric = board.id === 'openrouter-usage' ? r.tokens_label
        : board.id === 'hf-video' ? (Number.isFinite(r.downloads) ? String(r.downloads) : '')
          : (Number.isFinite(r.elo) ? String(r.elo) : '');
      return `<li><span class="td__rk">${i + 1}</span>
        <a href="${esc(r.source_url)}" rel="noopener">${esc(r.name)}</a>
        <span class="td__met">${esc(metric)}</span></li>`;
    }).join('');
    return `<article class="td__card"><h3>${esc(board.title)}</h3>
      <ol>${top}</ol>
      <a class="td__src" href="${esc(board.source_url)}" rel="noopener">${esc(board.source)} ↗</a></article>`;
  }).join('');
  return `
    <div class="td__sec__h"><h2>Model boards</h2>
      <a href="${esc(ctx.href('/boards.html'))}">All boards →</a></div>
    <div class="td__cards">${cards || '<p class="td__note">No boards live this run.</p>'}</div>`;
}

function agentsPanel(ctx) {
  const ca = ctx.codingAgents;
  const s = ca.agents_summary || {};
  const recent = (ca.agents || [])
    .filter((a) => a.ok && a.latest_release?.published_at)
    .slice()
    .sort((a, b) => String(b.latest_release.published_at).localeCompare(String(a.latest_release.published_at)))
    .slice(0, 10);
  const items = recent.map((a) => `<li>
    <a href="${esc(ctx.href(`/coding-agents/${a.id}.html`))}">${esc(a.name)}</a>
    <span>${esc(a.latest_release.tag || '')} · ${esc(String(a.latest_release.published_at).slice(0, 10))}</span>
  </li>`).join('');
  return `
    <div class="td__sec__h"><h2>Agent updates</h2>
      <a href="${esc(ctx.href('/coding-agents.html'))}">Agents hub →</a>
      <a href="${esc(ctx.href('/mcp-hub.html'))}">MCP hub →</a></div>
    <p class="td__note">${esc(s.updated_this_week ?? 0)} of ${esc(s.tracked ?? 0)} tracked agents shipped a release in the last 7 days.</p>
    <ol class="td__agents">${items}</ol>`;
}

function newsPanel(ctx) {
  const items = ctx.news.items;
  const top = items.slice(0, 8).map((it) => `<li>
    <a href="${esc(it.url)}" rel="noopener">${esc(it.title)}</a>
    <span>${esc(it.source || '')} · ${esc(String(it.published_at || '').slice(0, 10))}</span>
  </li>`).join('');
  return `
    <div class="td__sec__h"><h2>Today in the newsroom</h2>
      <a href="${esc(ctx.href('/news.html'))}">Full newsroom →</a></div>
    <ol class="td__agents">${top}</ol>`;
}

function stat(k, v) {
  return `<div class="td__g"><span class="td__gk">${esc(k)}</span><b>${esc(v)}</b></div>`;
}

function fmt(v) {
  if (!Number.isFinite(v)) return '—';
  return v > 0 ? `+${num(v, 0)}` : String(num(v, 0));
}

/** Wheel + dots + keys. Content is already painted; this only moves the rail. */
function deckJs() {
  return `<script>(function(){
if(window.__tdDeck)return;window.__tdDeck=1;
var D=document,deck=D.querySelector('[data-td-deck]');
if(!deck)return;
var vp=deck.querySelector('.td__viewport'),rail=deck.querySelector('.td__rail');
if(!vp||!rail)return;
var panels=[].slice.call(rail.querySelectorAll('[data-td-panel]'));
var dots=[].slice.call(deck.querySelectorAll('[data-td-i]'));
var posEl=deck.querySelector('[data-td-pos]');
var RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
var reduce=!!(RM&&RM.matches);
var i=0,lock=0;

function pad(n){return (n<10?'0':'')+n;}
function go(n,smooth){
  if(!panels.length)return;
  i=Math.max(0,Math.min(panels.length-1,n));
  var left=panels[i].offsetLeft;
  if(vp.scrollTo)vp.scrollTo({left:left,behavior:(smooth&&!reduce)?'smooth':'auto'});
  else vp.scrollLeft=left;
  sync();
}
function sync(){
  var w=vp.clientWidth||1;
  var cur=Math.round(vp.scrollLeft/w);
  cur=Math.max(0,Math.min(panels.length-1,cur));
  i=cur;
  for(var d=0;d<dots.length;d++){
    var on=d===i;
    dots[d].classList.toggle('is-on',on);
    dots[d].setAttribute('aria-current',on?'true':'false');
  }
  if(posEl)posEl.textContent=pad(i+1);
  var prev=deck.querySelector('[data-td-dir="-1"]');
  var next=deck.querySelector('[data-td-dir="1"]');
  if(prev)prev.setAttribute('aria-disabled',i<=0?'true':'false');
  if(next)next.setAttribute('aria-disabled',i>=panels.length-1?'true':'false');
}
function onScroll(){if(lock)return;lock=1;requestAnimationFrame(function(){lock=0;sync();});}

// Vertical wheel / trackpad → horizontal panels. Skip when the reader is
// scrolling inside a tall panel, or when reduced-motion prefers a stack.
vp.addEventListener('wheel',function(e){
  if(reduce||panels.length<2)return;
  if(Math.abs(e.deltaY)<Math.abs(e.deltaX))return;
  // Nested scrollables keep their own wheel.
  var t=e.target;
  while(t&&t!==vp){
    if(t.scrollHeight>t.clientHeight+8){
      var atTop=t.scrollTop<=0,atBot=t.scrollTop+t.clientHeight>=t.scrollHeight-2;
      if(!(atTop&&e.deltaY<0)&&!(atBot&&e.deltaY>0))return;
    }
    t=t.parentElement;
  }
  e.preventDefault();
  if(e.deltaY>8)go(i+1,true);
  else if(e.deltaY<-8)go(i-1,true);
},{passive:false});

vp.addEventListener('scroll',onScroll,{passive:true});
window.addEventListener('resize',function(){go(i,false);},{passive:true});

deck.addEventListener('click',function(e){
  var dir=e.target.closest&&e.target.closest('[data-td-dir]');
  if(dir){
    if(dir.getAttribute('aria-disabled')==='true')return;
    go(i+Number(dir.getAttribute('data-td-dir')),true);
    return;
  }
  var dot=e.target.closest&&e.target.closest('[data-td-i]');
  if(dot)go(Number(dot.getAttribute('data-td-i')),true);
});

vp.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();go(i+1,true);}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(i-1,true);}
  else if(e.key==='Home'){e.preventDefault();go(0,true);}
  else if(e.key==='End'){e.preventDefault();go(panels.length-1,true);}
});

sync();
})();</script>`;
}

function css() {
  return `
.td{position:relative;margin:0 -16px;max-width:none}
.td__viewport{overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;outline:none}
.td__viewport:focus-visible{box-shadow:inset 0 0 0 2px var(--accent,#4ADE80)}
.td__viewport::-webkit-scrollbar{display:none}
.td__rail{display:flex;align-items:stretch}
.td__panel{flex:0 0 100%;width:100%;scroll-snap-align:start;scroll-snap-stop:always;
  min-height:min(70vh,640px);box-sizing:border-box}
.td__panel__in{max-width:960px;margin:0 auto;padding:8px 20px 72px;box-sizing:border-box}
.td__h1{font:700 clamp(1.8rem,4vw,2.6rem)/1.08 var(--sans);margin:0 0 12px;color:var(--ink)}
.td__chip{font:600 13px/1.4 var(--mono);color:var(--ink-dim)}
.td__chip a{color:var(--accent,#4ADE80)}
.td__glance{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:18px 0}
.td__g{border:1px solid var(--rule);padding:12px 14px;background:var(--bg-raised,#0E131D)}
.td__gk{display:block;font:600 11px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint,#6B7686);margin-bottom:6px}
.td__g b{font:700 1rem/1.25 var(--sans);color:var(--ink)}
.td__sec__h{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:baseline;margin-bottom:8px}
.td__sec__h h2{font:700 1.35rem/1.15 var(--sans);margin:0;color:var(--ink)}
.td__sec__h a{font:600 13px/1 var(--mono);color:var(--ink-dim)}
.td__note,.td__lead{color:var(--ink-dim);font-size:14px;line-height:1.5}
.td__mood{list-style:none;margin:12px 0;padding:0;max-width:420px}
.td__mood li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--rule);font:500 14px/1.3 var(--mono)}
.td__mood b{font-weight:700}
.td__pos{color:#4ADE80}.td__neg{color:#F87171}
.td__cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:12px}
.td__card{border:1px solid var(--rule);padding:12px 14px;background:var(--bg-raised,#0E131D)}
.td__card h3{margin:0 0 8px;font:700 12px/1.3 var(--mono);letter-spacing:.06em;color:var(--ink)}
.td__card ol{list-style:none;margin:0;padding:0}
.td__card li{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:6px;align-items:baseline;padding:4px 0;font-size:13px}
.td__card a{color:var(--ink);text-decoration:none;font-weight:600}
.td__card a:hover{text-decoration:underline}
.td__rk{color:var(--ink-faint,#6B7686);font:600 12px var(--mono)}
.td__met{font:500 12px var(--mono);color:var(--ink-dim)}
.td__src{display:inline-block;margin-top:8px;font:500 12px var(--mono);color:var(--ink-faint,#6B7686)}
.td__agents{list-style:none;margin:8px 0;padding:0;max-height:48vh;overflow:auto}
.td__agents li{padding:8px 0;border-bottom:1px solid var(--rule);font-size:14px}
.td__agents a{color:var(--ink);font-weight:600;text-decoration:none}
.td__agents span{display:block;font:500 12px/1.3 var(--mono);color:var(--ink-faint,#6B7686);margin-top:2px}

/* The wheel — Ainnect's bottom affordance, in SIREN ink. */
.td__wheel{position:sticky;bottom:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;
  gap:10px 14px;padding:10px 16px 14px;background:linear-gradient(180deg,transparent,var(--bg,#070A12) 28%);
  pointer-events:none;z-index:3}
.td__wheel > *{pointer-events:auto}
.td__dots{display:flex;gap:8px;align-items:center}
.td__dot{width:8px;height:8px;padding:0;border:0;border-radius:999px;background:var(--rule,#2A3344);
  cursor:pointer;transition:width .2s ease,background .2s ease}
.td__dot.is-on{width:28px;background:var(--ink,#E6EAF0)}
.td__nb{width:36px;height:36px;border:1px solid var(--rule);background:var(--bg-raised,#0E131D);
  color:var(--ink);font:700 18px/1 var(--sans);border-radius:4px;cursor:pointer}
.td__nb[aria-disabled="true"]{opacity:.35;cursor:default}
.td__hint{margin:0;font:600 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink-faint,#6B7686);width:100%;text-align:center}
.td__foot{font:500 13px/1.4 var(--mono);color:var(--ink-faint,#6B7686);margin:20px 16px 28px;max-width:960px}

@media (prefers-reduced-motion: reduce){
  .td__viewport{scroll-snap-type:none;scroll-behavior:auto;overflow-x:visible;overflow-y:visible}
  .td__rail{display:block}
  .td__panel{min-height:0;margin-bottom:36px}
  .td__dot{transition:none}
  .td__hint{display:none}
}
@media (max-width:640px){
  .td__panel__in{padding:4px 16px 80px}
  .td__cards{grid-template-columns:1fr}
}
`;
}
