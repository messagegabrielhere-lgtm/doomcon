// /today.html — daily AI dashboard: mood, boards, agent updates at a glance.
// Closes the Ainnect "one swipe each" gap without replacing the index.

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

  const main = `<style>${css()}</style>
<section class="td__intro">
  <p class="eyebrow">${brand.NAME} · daily dashboard</p>
  <h1 class="td__h1">Today in AI</h1>
  <p class="lede">Newsroom tone, model boards and coding-agent updates — one page.
     The index still answers how loud the field is; this page answers what moved around it.</p>
  ${indexChip(ctx)}
</section>
${moodBlock(ctx)}
${boardsBlock(ctx)}
${agentsBlock(ctx)}
${newsBlock(ctx)}
<p class="td__foot">Machine surfaces:
  <a href="${esc(ctx.href('/api/mood.json'))}">mood</a> ·
  <a href="${esc(ctx.href('/api/boards.json'))}">boards</a> ·
  <a href="${esc(ctx.href('/api/coding-agents.json'))}">coding-agents</a>.
  Prefer those over scraping this HTML.</p>`;

  return page({
    ctx,
    path: PATH,
    title: `Today in AI — mood, boards, agent updates · ${brand.NAME}`,
    description: 'Daily AI dashboard: headline tone by company, public model boards, and coding-agent release status.',
    main,
  });
}

function indexChip(ctx) {
  const s = ctx.state;
  if (!s || !Number.isFinite(s.score)) return '';
  return `<p class="td__chip"><a href="${esc(ctx.href('/'))}">${esc(brand.NAME)} ${esc(s.level)}</a>
    · ${esc(num(s.score, 1))} of 100 · ${esc(s.level_name || '')} · ${esc(utc(s.generated_at))}</p>`;
}

function moodBlock(ctx) {
  const m = ctx.mood;
  if (!m) return '';
  const g = m.glance || {};
  const ranked = (m.ranked || []).slice(0, 8);
  const rows = ranked.map((c) => {
    const cls = c.index > 0 ? 'td__pos' : c.index < 0 ? 'td__neg' : '';
    return `<li><span>${esc(c.name)}</span><b class="${cls}">${fmt(c.index)}</b></li>`;
  }).join('');
  return `<section class="td__sec" aria-labelledby="td-mood">
    <div class="td__sec__h"><h2 id="td-mood">Market mood</h2>
      <a href="${esc(ctx.href('/mood.html'))}">Full board →</a></div>
    <p class="td__note">${esc(m.totals?.headlines_naming_a_company ?? 0)} headlines scanned · ${esc(utc(m.generated_at))}</p>
    ${g.leading || g.trailing ? `<p class="td__lead">${g.leading ? `Leading: <b>${esc(g.leading.name)}</b> ${fmt(g.leading.index)}` : ''}
      ${g.trailing ? ` · Trailing: <b>${esc(g.trailing.name)}</b> ${fmt(g.trailing.index)}` : ''}</p>` : ''}
    <ol class="td__mood">${rows}</ol>
  </section>`;
}

function boardsBlock(ctx) {
  const b = ctx.boards;
  if (!b) return '';
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
  return `<section class="td__sec" aria-labelledby="td-boards">
    <div class="td__sec__h"><h2 id="td-boards">Model boards</h2>
      <a href="${esc(ctx.href('/boards.html'))}">All boards →</a></div>
    <div class="td__cards">${cards || '<p class="td__note">No boards live this run.</p>'}</div>
  </section>`;
}

function agentsBlock(ctx) {
  const ca = ctx.codingAgents;
  if (!ca) return '';
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
  return `<section class="td__sec" aria-labelledby="td-agents">
    <div class="td__sec__h"><h2 id="td-agents">Agent updates</h2>
      <a href="${esc(ctx.href('/coding-agents.html'))}">Agents hub →</a>
      <a href="${esc(ctx.href('/mcp-hub.html'))}">MCP hub →</a></div>
    <p class="td__note">${esc(s.updated_this_week ?? 0)} of ${esc(s.tracked ?? 0)} tracked agents shipped a release in the last 7 days.</p>
    <ol class="td__agents">${items}</ol>
  </section>`;
}

function newsBlock(ctx) {
  const items = ctx.news?.items;
  if (!Array.isArray(items) || !items.length) return '';
  const top = items.slice(0, 6).map((it) => `<li>
    <a href="${esc(it.url)}" rel="noopener">${esc(it.title)}</a>
    <span>${esc(it.source || '')} · ${esc(String(it.published_at || '').slice(0, 10))}</span>
  </li>`).join('');
  return `<section class="td__sec" aria-labelledby="td-news">
    <div class="td__sec__h"><h2 id="td-news">Today in the newsroom</h2>
      <a href="${esc(ctx.href('/news.html'))}">Full newsroom →</a></div>
    <ol class="td__agents">${top}</ol>
  </section>`;
}

function fmt(v) {
  if (!Number.isFinite(v)) return '—';
  return v > 0 ? `+${num(v, 0)}` : String(num(v, 0));
}

function css() {
  return `
.td__intro{max-width:720px}
.td__h1{font:700 clamp(1.7rem,3vw,2.4rem)/1.1 var(--sans);margin:0 0 12px;color:var(--ink)}
.td__chip{font:600 13px/1.4 var(--mono);color:var(--ink-dim)}
.td__chip a{color:var(--accent,#4ADE80)}
.td__sec{margin:36px 0;max-width:960px}
.td__sec__h{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:baseline;margin-bottom:8px}
.td__sec__h h2{font:700 1.25rem/1.2 var(--sans);margin:0;color:var(--ink)}
.td__sec__h a{font:600 13px/1 var(--mono);color:var(--ink-dim)}
.td__note,.td__lead{color:var(--ink-dim);font-size:14px;line-height:1.5}
.td__mood{list-style:none;margin:12px 0;padding:0;max-width:420px}
.td__mood li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--rule);font:500 14px/1.3 var(--mono)}
.td__mood b{font-weight:700}
.td__pos{color:#4ADE80}.td__neg{color:#F87171}
.td__cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.td__card{border:1px solid var(--rule);padding:12px 14px;background:var(--bg-raised,#0E131D)}
.td__card h3{margin:0 0 8px;font:700 13px/1.3 var(--mono);letter-spacing:.06em;color:var(--ink)}
.td__card ol{list-style:none;margin:0;padding:0}
.td__card li{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:6px;align-items:baseline;padding:4px 0;font-size:13px}
.td__card a{color:var(--ink);text-decoration:none;font-weight:600}
.td__card a:hover{text-decoration:underline}
.td__rk{color:var(--ink-faint,#6B7686);font:600 12px var(--mono)}
.td__met{font:500 12px var(--mono);color:var(--ink-dim)}
.td__src{display:inline-block;margin-top:8px;font:500 12px var(--mono);color:var(--ink-faint,#6B7686)}
.td__agents{list-style:none;margin:8px 0;padding:0}
.td__agents li{padding:8px 0;border-bottom:1px solid var(--rule);font-size:14px}
.td__agents a{color:var(--ink);font-weight:600;text-decoration:none}
.td__agents span{display:block;font:500 12px/1.3 var(--mono);color:var(--ink-faint,#6B7686);margin-top:2px}
.td__foot{font:500 13px/1.4 var(--mono);color:var(--ink-faint,#6B7686);margin:32px 0}
`;
}
