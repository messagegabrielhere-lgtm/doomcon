// Competitor conquest landings: /compare.html, /alternatives.html, /vs/*.html.
//
// COMPETITIVE-SEO.md: DoomBench (~2k entity URLs), Skynet (timeline + tags),
// and p(doom) clocks own head terms we can honestly answer without stealing
// their claims. These pages intercept "X alternative", "AI doom index vs",
// and "recomputable AI index" queries. Every claim here is already on the
// site (methodology, receipts, guide). No doom-probability titles.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, organization, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.cmp{max-width:78ch}
.cmp__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.cmp__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.cmp h2{margin:var(--s-6,40px) 0 var(--s-2);font:400 clamp(20px,2.4vw,26px)/1.15 var(--poster);letter-spacing:.02em;text-transform:uppercase;color:var(--ink)}
.cmp h3{margin:var(--s-4) 0 var(--s-2);font:700 var(--t-base)/1.35 var(--sans);color:var(--ink)}
.cmp p,.cmp li{font:400 var(--t-base)/1.65 var(--sans);color:var(--ink-dim)}
.cmp b{color:var(--ink)}
.cmp table{border-collapse:collapse;width:100%;margin:var(--s-3) 0;font:400 var(--t-sm)/1.45 var(--sans)}
.cmp th,.cmp td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--rule);color:var(--ink-dim)}
.cmp th{font:700 var(--t-xs)/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
.cmp__scroll{overflow-x:auto}
.cmp__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.cmp__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.cmp__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.cmp__nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.cmp__nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.cmp__nav a:hover{background:var(--bg-sunken)}
.cmp__card{padding:14px 0;border-bottom:1px solid var(--rule)}
.cmp__card:last-child{border-bottom:0}
</style>`;

/** Rivals we can describe from public positioning, without inventing their numbers. */
export const RIVALS = [
  {
    id: 'doombench',
    path: '/vs/doombench.html',
    name: 'DoomBench',
    url: 'https://www.doombench.com/',
    short: 'Live AI Doom Index',
    measures: 'A qualitative “doom index” from sourced evidence for and against an AI-takeover scenario',
    whoSets: 'Their scoring rules over curated evidence items',
    recomputable: false,
    recomputableNote: 'No: a stranger cannot re-derive the score from published inputs alone',
    also: 'Entity hubs for models, companies, countries and people',
    ourAngle: `${brand.NAME} does not score takeover risk. It counts how loud AI activity is this hour, from public feeds, with a receipt.`,
    queryShapes: ['DoomBench alternative', 'DoomBench vs activity index', 'live AI doom index recomputable'],
  },
  {
    id: 'skynet-countdown',
    path: '/vs/skynet-countdown.html',
    name: 'Skynet Countdown',
    url: 'https://skynetcountdown.com/',
    short: 'AI risk predictor & AGI timeline tracker',
    measures: 'Estimated chance of AI control loss and an estimated AGI date, plus tagged news',
    whoSets: 'Their risk and timeline model over breakthroughs and headlines',
    recomputable: false,
    recomputableNote: 'No: the percentage and the date are model outputs, not a published formula over open inputs',
    also: 'Day hubs and tag pages for news',
    ourAngle: `${brand.NAME} publishes no AGI date and no control-loss percentage. It publishes an hourly activity score you can recompute.`,
    queryShapes: ['Skynet Countdown alternative', 'AGI timeline vs activity index', 'AI risk predictor receipt'],
  },
  {
    id: 'pdoom',
    path: '/vs/pdoom.html',
    name: 'p(doom) clocks',
    url: 'https://pdoom.ai/',
    short: 'Probability-of-doom countdowns',
    measures: 'One person’s (or a site’s) stated probability that AI ends badly, often as a clock',
    whoSets: 'Whoever picks the number',
    recomputable: false,
    recomputableNote: 'No: p(doom) is an opinion expressed as a percentage',
    also: 'Memetic countdowns; thin SEO shells on several domains',
    ourAngle: `${brand.NAME} does not publish a p(doom). It counts observable tempo. For the vocabulary, see the p(doom) explainer.`,
    queryShapes: ['p(doom) alternative', 'AI doomsday clock verifiable', 'pdoom vs activity index'],
    related: ['/p-doom.html', '/ai-doomsday-clock.html'],
  },
];

function liveStrip(ctx) {
  const st = ctx && ctx.state;
  if (!st || !Number.isFinite(st.level) || !Number.isFinite(st.score)) {
    return `<p class="cmp__lede">${esc(brand.NAME)} publishes a fresh reading every hour at the homepage and in <a href="${esc(ctx.href('/api/state.json'))}">/api/state.json</a>.</p>`;
  }
  return `<div class="cmp__stat" role="group" aria-label="Current ${brand.NAME} reading">
    <div><b class="num">${esc(brand.NAME)} ${esc(st.level)}</b><span>${esc(st.level_name)}</span></div>
    <div><b class="num">${esc(num(st.score, 1))}</b><span>of 100 this hour</span></div>
    <div><b class="num">${esc(utc(st.generated_at))}</b><span>UTC reading time</span></div>
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/'))}">Live dial →</a>
     · <a href="${esc(ctx.href('/api/state.json'))}">state.json →</a>
     · Scale runs 5 (quietest) to 1 (loudest). Tempo, not danger.</p>`;
}

function rivalNav(excludeId) {
  const links = [
    `<a href="${esc('/compare.html')}">Full comparison</a>`,
    `<a href="${esc('/alternatives.html')}">Alternatives hub</a>`,
    ...RIVALS.filter((r) => r.id !== excludeId).map((r) => `<a href="${esc(r.path)}">${esc(r.name)}</a>`),
    `<a href="${esc('/guide.html')}">DEFCON &amp; clocks</a>`,
  ];
  return `<nav class="cmp__nav" aria-label="Compare pages">${links.join('')}</nav>`;
}

function comparisonTable() {
  const rows = [
    {
      name: brand.NAME,
      measures: 'How much is happening in AI (tempo across five pillars)',
      who: 'A published formula over public data, hourly',
      recompute: 'Yes — from the receipt and open code',
    },
    ...RIVALS.map((r) => ({
      name: r.name,
      measures: r.measures,
      who: r.whoSets,
      recompute: r.recomputable ? 'Yes' : 'No',
    })),
  ];
  return `<div class="cmp__scroll"><table>
    <thead><tr><th>Index</th><th>What it measures</th><th>Who sets it</th><th>Recomputable?</th></tr></thead>
    <tbody>
${rows.map((row) => `      <tr><td><b>${esc(row.name)}</b></td><td>${esc(row.measures)}</td><td>${esc(row.who)}</td><td>${esc(row.recompute)}</td></tr>`).join('\n')}
    </tbody>
  </table></div>`;
}

function faqEntities(pairs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

function pageJsonLd(ctx, path, title, description, crumbs, faqPairs) {
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['h1', '.cmp__lede']),
    },
    breadcrumbs(ctx, crumbs),
    organization(ctx),
  ];
  if (faqPairs && faqPairs.length) blocks.push(faqEntities(faqPairs));
  return blocks;
}

export function compareHub(ctx) {
  const path = '/compare.html';
  const title = `AI doom indexes compared: ${brand.NAME} vs DoomBench, Skynet Countdown and p(doom)`;
  const description = `${brand.NAME} is an hourly AI activity count you can recompute. DoomBench scores takeover evidence, Skynet Countdown estimates AGI dates and control-loss odds, and p(doom) clocks publish opinions. Side-by-side without borrowing their claims.`;
  const faq = [
    [`What is the difference between ${brand.NAME} and DoomBench?`,
      `${brand.NAME} measures AI activity tempo from public data every hour and publishes a receipt. DoomBench publishes a qualitative doom index from sourced evidence about takeover risk. One is a count; the other is a judgement-scored risk index.`],
    ['Which AI doom index can I recompute myself?',
      `${brand.NAME}. Clone the repo, run the collector, and compare your number to the published one. DoomBench, Skynet Countdown and p(doom) clocks are not independently recomputable from open inputs alone.`],
    ['Does a louder SIREN reading mean AI is more dangerous?',
      'No. The level measures how much is happening — releases, compute, headlines, rule-making and market prices — not whether what happened was good or bad.'],
  ];
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k">Compare</p>
  <h1>AI doom indexes, compared honestly</h1>
  <p class="cmp__lede">People searching for an “AI doom index” usually land on a judgement score or a countdown.
    ${esc(brand.NAME)} answers a different question: <b>how loud is AI activity right now</b>, measured hourly from public data.
    This page puts that next to the rivals people actually type.</p>
  ${liveStrip(ctx)}
  <h2>Side by side</h2>
  ${comparisonTable()}
  <h2>Pick a rival</h2>
  ${RIVALS.map((r) => `<div class="cmp__card">
    <h3><a href="${esc(ctx.href(r.path))}">${esc(brand.NAME)} vs ${esc(r.name)}</a></h3>
    <p>${esc(r.short)}. ${esc(r.measures)}. ${esc(r.recomputableNote)}.</p>
  </div>`).join('')}
  <h2>Also on this site</h2>
  <p><a href="${esc(ctx.href('/alternatives.html'))}">AI activity index alternatives →</a>
     · <a href="${esc(ctx.href('/guide.html'))}">SIREN vs DEFCON vs the Doomsday Clock vs p(doom) →</a>
     · <a href="${esc(ctx.href('/methodology.html'))}">Every formula →</a>
     · <a href="${esc(ctx.href('/embed.html'))}">Embed the live reading →</a></p>
  ${rivalNav(null)}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: pageJsonLd(ctx, path, title, description, [{ name: 'Compare', path }], faq),
    main,
  });
}

export function alternatives(ctx) {
  const path = '/alternatives.html';
  const title = `AI doom index alternatives: recomputable activity vs judgement clocks · ${brand.NAME}`;
  const description = `Looking for a DoomBench, Skynet Countdown or p(doom) alternative? ${brand.NAME} is an hourly AI activity index with open code, CORS JSON and hash-chained receipts — not a probability of doom.`;
  const faq = [
    ['What is a good alternative to DoomBench?',
      `${brand.NAME} if you want a recomputable activity tempo reading instead of a qualitative doom score. It does not replace DoomBench’s takeover-evidence framing; it answers a different question with arithmetic you can check.`],
    ['What is a good alternative to Skynet Countdown?',
      `${brand.NAME} if you want live activity without an AGI date or a control-loss percentage. For dated news hubs, this site publishes per-story pages and a rolling news sitemap instead of a predicted singularity day.`],
    ['Is there a verifiable AI doomsday clock?',
      `Most AI doomsday clocks are expert judgement. ${brand.NAME} is an hourly activity count with a receipt. See the AI doomsday clock explainer for the vocabulary without the fake precision.`],
  ];
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k">Alternatives</p>
  <h1>AI doom index alternatives — and what each one actually is</h1>
  <p class="cmp__lede">“Alternative” only helps if the substitute measures the same thing. Most AI doom indexes measure
    <b>judgement about danger</b>. ${esc(brand.NAME)} measures <b>how much is happening</b>. Use this hub when a search
    for DoomBench, Skynet Countdown or p(doom) brought you here and you need the honest fork.</p>
  ${liveStrip(ctx)}
  <h2>When ${esc(brand.NAME)} is the right alternative</h2>
  <ul>
    <li>You want a number a stranger can recompute from public data and a published receipt.</li>
    <li>You want an embeddable widget and a CORS-open JSON API, not a client-rendered shell.</li>
    <li>You want tempo (releases, compute, attention, governance, markets), not a takeover probability.</li>
  </ul>
  <h2>When it is the wrong alternative</h2>
  <ul>
    <li>You need a scored argument about AI takeover risk — that is DoomBench’s product, not ours.</li>
    <li>You need an estimated AGI date or control-loss percentage — that is Skynet Countdown’s product, not ours.</li>
    <li>You want a personal extinction probability — that is p(doom), and it stays an opinion.</li>
  </ul>
  <h2>One page per rival</h2>
  ${RIVALS.map((r) => `<div class="cmp__card">
    <h3><a href="${esc(ctx.href(r.path))}">${esc(r.name)} → ${esc(brand.NAME)}</a></h3>
    <p>${esc(r.ourAngle)}</p>
    <p class="fresh__key">Queries this page answers: ${esc(r.queryShapes.join('; '))}.</p>
  </div>`).join('')}
  <h2>Compare everything</h2>
  <p><a href="${esc(ctx.href('/compare.html'))}">Full side-by-side table →</a>
     · <a href="${esc(ctx.href('/guide.html'))}">DEFCON, Doomsday Clock and p(doom) →</a>
     · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)? →</a></p>
  ${rivalNav(null)}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: pageJsonLd(ctx, path, title, description, [{ name: 'Alternatives', path }], faq),
    main,
  });
}

export function vsRival(ctx, rivalId) {
  const rival = RIVALS.find((r) => r.id === rivalId);
  if (!rival) return '';
  const path = rival.path;
  const title = `${brand.NAME} vs ${rival.name}: activity count vs ${rival.short}`;
  const description = `${brand.NAME} vs ${rival.name}. ${rival.measures}. ${rival.recomputableNote}. ${brand.NAME} publishes an hourly recomputable activity score instead.`;
  const faq = [
    [`${brand.NAME} vs ${rival.name} — which should I use?`,
      `Use ${rival.name} if you want ${rival.measures.toLowerCase()}. Use ${brand.NAME} if you want an hourly AI activity tempo reading with open inputs and a receipt. They are not substitutes for the same claim.`],
    [`Can I recompute ${rival.name}?`,
      rival.recomputableNote],
    [`Does ${brand.NAME} publish the same number as ${rival.name}?`,
      `No. ${brand.NAME} does not score ${rival.short.toLowerCase()}. It scores observable activity across five pillars and says so on every page.`],
  ];
  const related = (rival.related || [])
    .map((p) => `<a href="${esc(ctx.href(p))}">${esc(p.replace(/^\//, '').replace(/\.html$/, ''))} →</a>`)
    .join(' · ');
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k">Versus</p>
  <h1>${esc(brand.NAME)} vs ${esc(rival.name)}</h1>
  <p class="cmp__lede">${esc(rival.ourAngle)}</p>
  ${liveStrip(ctx)}
  <h2>What each one is</h2>
  ${comparisonTable()}
  <h3>${esc(rival.name)}</h3>
  <ul>
    <li><b>Public claim:</b> ${esc(rival.short)}.</li>
    <li><b>Measures:</b> ${esc(rival.measures)}.</li>
    <li><b>Set by:</b> ${esc(rival.whoSets)}.</li>
    <li><b>Recomputable by a stranger:</b> ${esc(rival.recomputableNote)}.</li>
    <li><b>Also ships:</b> ${esc(rival.also)}.</li>
    <li><b>Their site:</b> <a href="${esc(rival.url)}" rel="noopener">${esc(rival.url.replace(/^https?:\/\//, ''))}</a></li>
  </ul>
  <h3>${esc(brand.NAME)}</h3>
  <ul>
    <li><b>Measures:</b> AI activity tempo across capability, compute &amp; capital, attention, governance and markets.</li>
    <li><b>Set by:</b> a published formula over public data, hourly.</li>
    <li><b>Recomputable:</b> yes — receipt, open code, CORS JSON.</li>
    <li><b>Does not publish:</b> takeover probability, AGI date, or anyone’s p(doom).</li>
  </ul>
  <h2>Where to go next</h2>
  <p><a href="${esc(ctx.href('/'))}">Current ${esc(brand.NAME)} reading →</a>
     · <a href="${esc(ctx.href('/methodology.html'))}">Method →</a>
     · <a href="${esc(ctx.href('/compare.html'))}">All indexes compared →</a>
     · <a href="${esc(ctx.href('/alternatives.html'))}">Alternatives hub →</a>
     ${related ? `· ${related}` : ''}</p>
  ${rivalNav(rival.id)}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: pageJsonLd(
      ctx,
      path,
      title,
      description,
      [{ name: 'Compare', path: '/compare.html' }, { name: `vs ${rival.name}`, path }],
      faq,
    ),
    main,
  });
}

/** All HTML bodies this module owns. */
export function renderAll(ctx) {
  return [
    { path: 'compare.html', html: compareHub(ctx) },
    { path: 'alternatives.html', html: alternatives(ctx) },
    ...RIVALS.map((r) => ({ path: r.path.replace(/^\//, ''), html: vsRival(ctx, r.id) })),
  ];
}

/** Sitemap rows for the conquest set (always indexable — evergreen substance). */
export function sitemapEntries(ctx) {
  const last = (ctx.state && ctx.state.generated_at) || new Date().toISOString();
  return [
    { loc: '/compare.html', changefreq: 'weekly', priority: '0.9', lastmod: last },
    { loc: '/alternatives.html', changefreq: 'weekly', priority: '0.9', lastmod: last },
    ...RIVALS.map((r) => ({
      loc: r.path,
      changefreq: 'weekly',
      priority: '0.85',
      lastmod: last,
    })),
  ];
}
