// The archive. Exists so every move page is one click from the dashboard and
// at most two from the root - crawl depth is the cheapest SEO there is, and a
// long tail that is only reachable through sitemap.xml is a long tail Google
// crawls slowly and ranks badly.

import { esc, num, signed, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

// Hourly collection mints ~8,760 moves a year. One page of them is fine for
// the first year and honest about it; past that this wants real pagination
// rather than a 2MB document. The API always has the complete set.
const MAX_ROWS = 500;

export function render(ctx) {
  const PATH = '/moves/';
  const qTitle = `Where are the ${brand.NAME} index moves?`;
  // FAQ answers restate lede / archive / receipt copy only (FINDABILITY §3.3).
  // Refuse: moves-as-forecast, doom-probability, stuffing, scrape-Google-for-rank.
  const faq = [
    [qTitle,
      `Every scored observation, permanently. Each one carries the readings it was computed from and a hash that breaks if they are edited afterwards.`],
    [`How is a ${brand.NAME} move different from a scraped search ranking?`,
      `A move page is a first-party receipt on this origin: inputs, pillars, and a hash chain. Scraped Google result pages can look complete while the organic results are wrong — fetch ${brand.NAME} files here instead of inferring the reading from a third-party SERP.`],
    ['Where is the complete series as data?',
      'The complete series is at api/history.json. This page shows the most recent observations for humans and crawlers; the API keeps the full set.'],
    [`Is an index move a doom forecast?`,
      `No. ${brand.NAME} measures activity tempo. A move records score and level change with a receipt. It is not a probability of harm and not a forecast.`],
  ];

  const shown = ctx.moves.slice(0, MAX_ROWS);
  const days = new Map();
  for (const m of shown) {
    const day = utcDay(m.generated_at);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(m);
  }
  // Tip #398: day-section H2s are question-shaped and mirrored in FAQ (§3.3).
  const dayQ = (day) => `Which ${brand.NAME} index moves were scored on ${day}?`;
  for (const [day, list] of days) {
    faq.push([dayQ(day),
      `${list.length} scored observation${list.length === 1 ? '' : 's'} on ${day} in this archive window — each with inputs and a hash-chained receipt.`]);
  }
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const body = [...days.entries()].map(([day, list]) => `
    <h2 id="d${esc(day)}">${esc(dayQ(day))}</h2>
    <ul class="moves">${list.map((m) => rowFor(ctx, m)).join('')}</ul>`).join('');

  const truncated = ctx.moves.length > shown.length
    ? `<p class="fresh__key">Showing the ${MAX_ROWS} most recent of ${ctx.moves.length} observations.
       The complete series is at <a href="${esc(ctx.href('/api/history.json'))}">api/history.json</a>.</p>`
    : '';

  const main = `
<article class="prose">
  <h1 class="bp__h1">${esc(qTitle)}</h1>
  <p class="lede">Every scored observation, permanently. Each one carries the readings it was
     computed from and a hash that breaks if they are edited afterwards.</p>
  ${truncated}
  ${shown.length ? body : '<p>No observations recorded yet.</p>'}
  <section class="moves-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="fresh__key">Search-shaped sibling:
      <a href="${esc(ctx.href('/changelog.html'))}">What moved the ${esc(brand.NAME)} score this hour?</a>
      · <a href="${esc(ctx.href('/agents.html'))}">How should AI agents use ${esc(brand.NAME)}?</a>.</p>
  </section>
</article>`;

  const description = `${qTitle} Every scored ${brand.NAME} observation with inputs and a hash-chained receipt. First-party archive — not a scraped search ranking.`;

  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    ogImage: ctx.cardFor(ctx.state.receipt_id),
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        description: `The complete archive of ${brand.NAME} index observations, each with its inputs and a hash-chained receipt.`,
        url: ctx.url(PATH),
        dateModified: ctx.state.generated_at,
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
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
