// /boards.html — public model leaderboards republished with source links.
// Reads data/boards.json (collector/boards.mjs).

import { esc, utc, num } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/boards.html';

export function hasBoards(ctx) {
  return Boolean(ctx && ctx.boards && Array.isArray(ctx.boards.boards));
}

export function render(ctx) {
  if (!hasBoards(ctx)) return emptyPage(ctx);
  const b = ctx.boards;
  const boards = b.boards || [];
  const g = b.glance || {};

  const main = `<style>${css()}</style>
<section class="bd__intro">
  <p class="eyebrow">Model boards</p>
  <h1 class="bd__h1">AI model leaderboards</h1>
  <p class="lede">${esc(g.boards_ok ?? 0)} of ${esc(g.boards_total ?? boards.length)} boards live as of
     ${esc(utc(b.generated_at))}. Every row links to its upstream source.
     ${brand.NAME} does not invent Elo, token volumes or download counts.</p>
</section>
${boards.map((board) => boardSection(board)).join('')}
<p class="bd__foot">JSON: <a href="${esc(ctx.href('/api/boards.json'))}"><code>/api/boards.json</code></a>.
   Also see <a href="${esc(ctx.href('/race.html'))}">The Race</a> for prediction-market lab odds.</p>`;

  return page({
    ctx,
    path: PATH,
    title: `AI model leaderboards — OpenRouter, LMArena, Hugging Face · ${brand.NAME}`,
    description: `Public model rankings republished with sources. ${g.boards_ok ?? 0} of ${g.boards_total ?? 0} boards live.`,
    main,
    jsonld: [datasetLd(ctx, b)],
  });
}

function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `Model boards · ${brand.NAME}`,
    description: 'Waiting for data/boards.json.',
    main: `<section><h1>Model boards</h1><p class="lede">No boards file in this build. Run <code>node collector/boards.mjs</code>.</p></section>`,
  });
}

function boardSection(board) {
  if (!board.ok) {
    return `<section class="bd__board bd__dark" aria-labelledby="bd-${esc(board.id)}">
      <h2 id="bd-${esc(board.id)}">${esc(board.title)}</h2>
      <p class="bd__note">Dark this run: ${esc(board.error || 'no rows')}.
         Source: <a href="${esc(board.source_url)}" rel="noopener">${esc(board.source)}</a>.</p>
    </section>`;
  }
  const head = board.id === 'openrouter-usage'
    ? ['#', 'Model', 'Author', 'Tokens', 'Change']
    : board.id === 'hf-video'
      ? ['#', 'Model', 'Author', 'Downloads', 'Likes']
      : ['#', 'Model', 'Elo'];
  const body = board.rows.slice(0, 12).map((r) => rowHtml(board.id, r)).join('');
  return `<section class="bd__board" aria-labelledby="bd-${esc(board.id)}">
    <h2 id="bd-${esc(board.id)}">${esc(board.title)}</h2>
    <p class="bd__note">${esc(board.note || '')}
       <a href="${esc(board.source_url)}" rel="noopener">Source: ${esc(board.source)} ↗</a></p>
    <div class="bd__table-wrap"><table class="bd__table">
      <thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
    </table></div>
  </section>`;
}

function rowHtml(boardId, r) {
  if (boardId === 'openrouter-usage') {
    return `<tr>
      <td>${esc(r.rank)}</td>
      <td><a href="${esc(r.source_url)}" rel="noopener">${esc(r.name)}</a></td>
      <td>${esc(r.author || '')}</td>
      <td>${esc(r.tokens_label || '—')}</td>
      <td>${esc(r.change || '—')}</td>
    </tr>`;
  }
  if (boardId === 'hf-video') {
    return `<tr>
      <td>${esc(r.rank)}</td>
      <td><a href="${esc(r.source_url)}" rel="noopener">${esc(r.name)}</a></td>
      <td>${esc(r.author || '')}</td>
      <td>${Number.isFinite(r.downloads) ? esc(formatCount(r.downloads)) : '—'}</td>
      <td>${Number.isFinite(r.likes) ? esc(String(r.likes)) : '—'}</td>
    </tr>`;
  }
  return `<tr>
    <td>${esc(r.rank)}</td>
    <td><a href="${esc(r.source_url)}" rel="noopener">${esc(r.name)}</a></td>
    <td>${Number.isFinite(r.elo) ? esc(String(r.elo)) : '—'}</td>
  </tr>`;
}

function formatCount(n) {
  if (n >= 1e6) return `${num(n / 1e6, 2)}M`;
  if (n >= 1e3) return `${num(n / 1e3, 1)}K`;
  return String(n);
}

function datasetLd(ctx, b) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} model boards`,
    description: 'Republished public AI model leaderboards with source links.',
    url: ctx.url(PATH),
    dateModified: b.generated_at,
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/boards.json') },
  };
}

function css() {
  return `
.bd__intro{max-width:720px}
.bd__h1{font:700 clamp(1.6rem,3vw,2.2rem)/1.15 var(--sans);margin:0 0 12px;color:var(--ink)}
.bd__board{margin:32px 0;max-width:900px}
.bd__board h2{font:700 1.25rem/1.2 var(--sans);margin:0 0 8px;color:var(--ink)}
.bd__note{color:var(--ink-dim);line-height:1.5;margin:0 0 12px;font-size:14px}
.bd__dark{opacity:.85}
.bd__table-wrap{overflow-x:auto;border:1px solid var(--rule)}
.bd__table{width:100%;border-collapse:collapse;font:500 14px/1.4 var(--mono)}
.bd__table th,.bd__table td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--rule);color:var(--ink-dim)}
.bd__table th{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint,#6B7686)}
.bd__table a{color:var(--ink);font-weight:600;text-decoration:none}
.bd__table a:hover{text-decoration:underline}
.bd__table tr:last-child td{border-bottom:0}
.bd__foot{font:500 13px/1.4 var(--mono);color:var(--ink-faint,#6B7686);margin:28px 0}
`;
}
