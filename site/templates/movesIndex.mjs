// The archive. Exists so every move page is one click from the dashboard and
// at most two from the root - crawl depth is the cheapest SEO there is, and a
// long tail that is only reachable through sitemap.xml is a long tail Google
// crawls slowly and ranks badly.

import { esc, num, signed, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

// Hourly collection mints ~8,760 moves a year. One page of them is fine for
// the first year and honest about it; past that this wants real pagination
// rather than a 2MB document. The API always has the complete set.
const MAX_ROWS = 500;

export function render(ctx) {
  const shown = ctx.moves.slice(0, MAX_ROWS);
  const days = new Map();
  for (const m of shown) {
    const day = utcDay(m.generated_at);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(m);
  }

  const body = [...days.entries()].map(([day, list]) => `
    <h2 id="d${esc(day)}">${esc(day)}</h2>
    <ul class="moves">${list.map((m) => rowFor(ctx, m)).join('')}</ul>`).join('');

  const truncated = ctx.moves.length > shown.length
    ? `<p class="fresh__key">Showing the ${MAX_ROWS} most recent of ${ctx.moves.length} observations.
       The complete series is at <a href="${esc(ctx.href('/api/history.json'))}">api/history.json</a>.</p>`
    : '';

  const main = `
<article class="prose">
  <h1>Index moves</h1>
  <p class="lede">Every scored observation, permanently. Each one carries the readings it was
     computed from and a hash that breaks if they are edited afterwards.</p>
  ${truncated}
  ${shown.length ? body : '<p>No observations recorded yet.</p>'}
</article>`;

  return page({
    ctx,
    path: '/moves/',
    title: `Index moves — every scored observation · ${brand.NAME}`,
    description: `The complete archive of ${brand.NAME} index observations, each with its inputs and a hash-chained receipt.`,
    ogImage: ctx.cardFor(ctx.state.receipt_id),
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${brand.NAME} index moves`,
      url: ctx.url('/moves/'),
      dateModified: ctx.state.generated_at,
    }],
    main,
  });
}

function rowFor(ctx, m) {
  const what = m.level_changed
    ? `${brand.NAME} ${m.previous_level} → ${brand.NAME} ${m.level} · ${m.level_name}`
    : `${num(m.previous_score, 1)} → ${num(m.score, 1)}`;
  const tag = m.level_changed ? '<span class="move__tag">level change</span>' : '';
  return `<li class="move"><a class="move__a" href="${esc(ctx.href(`/moves/${m.id}.html`))}">
      <time class="move__time" datetime="${esc(m.generated_at)}">${esc(utc(m.generated_at))}</time>
      <span class="move__what">${esc(what)}${tag}</span>
      <span class="move__delta num">${esc(signed(m.delta, 1))}</span>
    </a></li>`;
}
