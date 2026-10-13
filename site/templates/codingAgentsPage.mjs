// /coding-agents.html — coding agents hub
// /mcp-hub.html — MCP servers hub
// /coding-agents/<id>.html and /mcp-hub/<id>.html — entity pages
// Reads data/coding-agents.json (collector/coding-agents.mjs).

import { esc, utc, num } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const AGENTS_PATH = '/coding-agents.html';
const MCP_PATH = '/mcp-hub.html';

export function hasCodingAgents(ctx) {
  return Boolean(ctx && ctx.codingAgents && Array.isArray(ctx.codingAgents.agents));
}

export function hasMcpHub(ctx) {
  return Boolean(ctx && ctx.codingAgents && Array.isArray(ctx.codingAgents.mcp));
}

export function renderAgents(ctx) {
  if (!hasCodingAgents(ctx)) return empty(ctx, AGENTS_PATH, 'Coding agents', 'data/coding-agents.json');
  const data = ctx.codingAgents;
  const rows = data.agents || [];
  const s = data.agents_summary || {};
  return hubPage(ctx, {
    path: AGENTS_PATH,
    eyebrow: 'Coding agents',
    title: 'AI coding agents',
    lede: `Maintenance status, stars and recent releases for ${esc(s.tracked ?? rows.length)} public coding agents. `
      + `${esc(s.updated_this_week ?? 0)} shipped a release in the last 7 days. `
      + `Health labels are release and push recency on GitHub — not reviews.`,
    rows,
    summary: s,
    entityBase: '/coding-agents',
    sibling: { href: MCP_PATH, label: 'MCP hub' },
    jsonPath: '/api/coding-agents.json',
    generatedAt: data.generated_at,
    rule: data.rule,
  });
}

export function renderMcp(ctx) {
  if (!hasMcpHub(ctx)) return empty(ctx, MCP_PATH, 'MCP hub', 'data/coding-agents.json');
  const data = ctx.codingAgents;
  const rows = data.mcp || [];
  const s = data.mcp_summary || {};
  return hubPage(ctx, {
    path: MCP_PATH,
    eyebrow: 'MCP servers',
    title: 'Model Context Protocol servers',
    lede: `MCP servers and SDKs agents connect through — ${esc(s.tracked ?? rows.length)} tracked. `
      + `Stars measure attention; health is GitHub recency only.`,
    rows,
    summary: s,
    entityBase: '/mcp-hub',
    sibling: { href: AGENTS_PATH, label: 'Coding agents' },
    jsonPath: '/api/coding-agents.json',
    generatedAt: data.generated_at,
    rule: data.rule,
  });
}

export function renderAgentEntity(ctx, id) {
  const row = (ctx.codingAgents?.agents || []).find((r) => r.id === id);
  return entityPage(ctx, row, { hub: AGENTS_PATH, hubLabel: 'Coding agents', base: '/coding-agents' });
}

export function renderMcpEntity(ctx, id) {
  const row = (ctx.codingAgents?.mcp || []).find((r) => r.id === id);
  return entityPage(ctx, row, { hub: MCP_PATH, hubLabel: 'MCP hub', base: '/mcp-hub' });
}

export function agentIds(ctx) {
  return (ctx.codingAgents?.agents || []).filter((r) => r && r.id).map((r) => r.id);
}

export function mcpIds(ctx) {
  return (ctx.codingAgents?.mcp || []).filter((r) => r && r.id).map((r) => r.id);
}

function hubPage(ctx, opts) {
  const active = opts.rows.filter((r) => r.health?.label === 'active' || r.health?.label === 'slowing');
  const rest = opts.rows.filter((r) => !active.includes(r));
  const main = `<style>${css()}</style>
<section class="ca__intro">
  <p class="eyebrow">${esc(opts.eyebrow)}</p>
  <h1 class="ca__h1">${esc(opts.title)}</h1>
  <p class="lede">${opts.lede}</p>
  <p class="ca__meta">Updated ${esc(utc(opts.generatedAt))} ·
     <a href="${esc(ctx.href(opts.sibling.href))}">${esc(opts.sibling.label)}</a> ·
     <a href="${esc(ctx.href(opts.jsonPath))}">JSON</a></p>
  ${summaryStrip(opts.summary)}
</section>
${sectionList(ctx, 'Active and maintained', active, opts.entityBase)}
${sectionList(ctx, 'Slowing, dormant, archived or dark', rest, opts.entityBase)}
<section class="ca__rule"><h2>How health is labelled</h2>
  <p>${esc(opts.rule?.statement || '')}</p>
</section>`;

  return page({
    ctx,
    path: opts.path,
    title: `${opts.title} — maintenance status and releases · ${brand.NAME}`,
    description: stripTags(opts.lede).slice(0, 160),
    main,
  });
}

function entityPage(ctx, row, { hub, hubLabel, base }) {
  if (!row) {
    return page({
      ctx,
      path: `${base}/unknown.html`,
      noindex: true,
      title: `Not tracked · ${brand.NAME}`,
      description: 'Unknown entity.',
      main: `<section><h1>Not on the roster</h1><p><a href="${esc(ctx.href(hub))}">← ${esc(hubLabel)}</a></p></section>`,
    });
  }
  const path = `${base}/${row.id}.html`;
  const rel = row.latest_release;
  const main = `<style>${css()}</style>
<section class="ca__intro">
  <p class="eyebrow"><a href="${esc(ctx.href(hub))}">${esc(hubLabel)}</a></p>
  <h1 class="ca__h1">${esc(row.name)}</h1>
  <p class="lede">${esc(row.blurb || row.description || '')}</p>
  <p class="ca__meta">${pill(row.health?.label)} ·
     ${Number.isFinite(row.stars) ? `★ ${esc(grouped(row.stars))}` : 'stars unknown'} ·
     ${rel ? `latest ${esc(rel.tag || rel.name || 'release')} on ${esc(utcDay(rel.published_at))}` : 'no release on record'} ·
     <a href="${esc(row.html_url)}" rel="noopener">GitHub ↗</a></p>
</section>
<section class="ca__facts">
  <h2>Facts from GitHub</h2>
  <dl class="ca__dl">
    ${fact('Repository', row.repo)}
    ${fact('Stars', Number.isFinite(row.stars) ? grouped(row.stars) : null)}
    ${fact('Forks', Number.isFinite(row.forks) ? grouped(row.forks) : null)}
    ${fact('Language', row.language)}
    ${fact('License', row.license)}
    ${fact('Last push', row.pushed_at ? utc(row.pushed_at) : null)}
    ${fact('Releases in 90 days', Number.isFinite(row.releases_90d) ? String(row.releases_90d) : null)}
    ${fact('Health', row.health?.label)}
    ${fact('Days since activity', Number.isFinite(row.health?.days_since_activity) ? String(row.health.days_since_activity) : null)}
    ${row.ok ? '' : fact('Fetch error', row.error)}
  </dl>
</section>
${rel ? `<section class="ca__rel"><h2>Latest release</h2>
  <p><a href="${esc(rel.url || row.html_url)}" rel="noopener">${esc(rel.tag || rel.name || 'release')}</a>
     · ${esc(utc(rel.published_at))}${rel.prerelease ? ' · prerelease' : ''}</p>
</section>` : ''}
<p class="ca__foot">Health is GitHub recency, not a review. Stars measure attention, not quality.</p>`;

  return page({
    ctx,
    path,
    title: `${row.name} — ${row.health?.label || 'status'} · ${brand.NAME}`,
    description: `${row.name}: ${row.health?.label || 'status'}${Number.isFinite(row.stars) ? `, ${grouped(row.stars)} stars` : ''}. Maintenance from public GitHub data.`,
    main,
  });
}

function sectionList(ctx, title, rows, entityBase) {
  if (!rows.length) return '';
  const items = rows.map((r) => {
    const href = ctx.href(`${entityBase}/${r.id}.html`);
    const rel = r.latest_release;
    return `<li class="ca__row">
      <a class="ca__name" href="${esc(href)}">${esc(r.name)}</a>
      ${pill(r.health?.label)}
      <span class="ca__stars">${Number.isFinite(r.stars) ? `★ ${esc(grouped(r.stars))}` : '—'}</span>
      <span class="ca__rel">${rel ? `${esc(rel.tag || '')} · ${esc(utcDay(rel.published_at))}` : 'no release'}</span>
      ${Number.isFinite(r.releases_90d) ? `<span class="ca__r90">${esc(r.releases_90d)} rel/90d</span>` : ''}
    </li>`;
  }).join('');
  return `<section class="ca__list"><h2>${esc(title)}</h2><ol>${items}</ol></section>`;
}

function summaryStrip(s) {
  if (!s) return '';
  const bits = [];
  if (Number.isFinite(s.ok)) bits.push(`<div class="ca__g"><b>${esc(s.ok)}/${esc(s.tracked)}</b><span>answering</span></div>`);
  if (s.by_health) {
    bits.push(`<div class="ca__g"><b>${esc(s.by_health.active || 0)}</b><span>active</span></div>`);
    bits.push(`<div class="ca__g"><b>${esc(s.by_health.dormant || 0)}</b><span>dormant</span></div>`);
  }
  if (s.most_stars) bits.push(`<div class="ca__g"><b>${esc(s.most_stars.name)}</b><span>most stars (${esc(grouped(s.most_stars.stars))})</span></div>`);
  return bits.length ? `<div class="ca__glance">${bits.join('')}</div>` : '';
}

function pill(label) {
  const l = label || 'unknown';
  return `<span class="ca__pill ca__pill--${esc(l)}">${esc(l)}</span>`;
}

function fact(k, v) {
  if (v == null || v === '') return '';
  return `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
}

function empty(ctx, path, title, file) {
  return page({
    ctx,
    path,
    noindex: true,
    title: `${title} · ${brand.NAME}`,
    description: `Waiting for ${file}.`,
    main: `<section><h1>${esc(title)}</h1><p class="lede">No data in this build. Run <code>node collector/coding-agents.mjs</code>.</p></section>`,
  });
}

function grouped(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function utcDay(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function stripTags(html) {
  // Drop well-formed tags, then any leftover `<` so nested leftovers cannot
  // re-form markup (CodeQL js/incomplete-multi-character-sanitization).
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/</g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function css() {
  return `
.ca__intro{max-width:760px}
.ca__h1{font:700 clamp(1.6rem,3vw,2.2rem)/1.15 var(--sans);margin:0 0 12px;color:var(--ink)}
.ca__meta{font:500 13px/1.4 var(--mono);color:var(--ink-faint,#6B7686)}
.ca__glance{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:16px 0}
.ca__g{border:1px solid var(--rule);padding:10px 12px;background:var(--bg-raised,#0E131D)}
.ca__g b{display:block;font:700 1rem/1.2 var(--sans);color:var(--ink)}
.ca__g span{font:500 12px/1.3 var(--mono);color:var(--ink-dim)}
.ca__list{margin:28px 0;max-width:900px}
.ca__list h2,.ca__facts h2,.ca__rel h2,.ca__rule h2{font:700 1.15rem/1.2 var(--sans);color:var(--ink)}
.ca__list ol{list-style:none;margin:0;padding:0}
.ca__row{display:grid;grid-template-columns:minmax(0,1.4fr) auto auto minmax(0,1.2fr) auto;gap:8px 12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--rule);font:500 13px/1.3 var(--mono);color:var(--ink-dim)}
.ca__name{font:700 15px/1.2 var(--sans);color:var(--ink);text-decoration:none}
.ca__name:hover{text-decoration:underline}
.ca__stars,.ca__rel,.ca__r90{white-space:nowrap}
.ca__pill{display:inline-block;padding:2px 7px;border-radius:3px;font:700 10px/1.6 var(--mono);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--rule)}
.ca__pill--active{color:#052e16;background:#4ADE80;border-color:#4ADE80}
.ca__pill--slowing{color:#422006;background:#FACC15;border-color:#FACC15}
.ca__pill--dormant,.ca__pill--archived,.ca__pill--dark,.ca__pill--unknown{color:var(--ink-dim)}
.ca__dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:12px 0}
.ca__dl div{border:1px solid var(--rule);padding:10px 12px}
.ca__dl dt{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint,#6B7686);margin-bottom:4px}
.ca__dl dd{margin:0;font:600 14px/1.3 var(--sans);color:var(--ink)}
.ca__rule,.ca__facts,.ca__rel{max-width:760px;margin:28px 0}
.ca__rule p,.ca__foot{color:var(--ink-dim);line-height:1.55}
.ca__foot{font-size:13px}
@media (max-width:700px){.ca__row{grid-template-columns:1fr auto;}}
`;
}
