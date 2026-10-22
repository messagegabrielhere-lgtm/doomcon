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
    // Typed “doom” / bare “doombench” guesses. Same body; canonical on path.
    // Root aliases (FINDABILITY #131) catch hand-typed URLs without /vs/.
    aliases: ['/vs/doom.html', '/doombench.html', '/doom.html'],
    name: 'DoomBench',
    url: 'https://www.doombench.com/',
    short: 'Live AI Doom Index',
    measures: 'A qualitative “doom index” from sourced evidence for and against an AI-takeover scenario',
    whoSets: 'Their scoring rules over curated evidence items',
    recomputable: false,
    recomputableNote: 'Not that we could find: we did not see published inputs that let a reader re-derive the score',
    also: 'Entity hubs for models, companies, countries and people — we mirror the shape at /models.html, /companies.html, /people.html, /countries.html, /country/, /model/, and /people/ without a doom score',
    ourAngle: `${brand.NAME} does not score takeover risk. It counts how loud AI activity is this hour, from public feeds, with a receipt.`,
    queryShapes: ['DoomBench alternative', 'DoomBench vs activity index', 'live AI doom index recomputable'],
  },
  {
    id: 'skynet-countdown',
    path: '/vs/skynet-countdown.html',
    // Short typed guess for the rival's head term. Same body as the primary;
    // layout canonical stays on path (not the alias) so this is not a doorway.
    // Root aliases (FINDABILITY #131) catch hand-typed URLs without /vs/.
    aliases: ['/vs/skynet.html', '/skynet-countdown.html', '/skynet.html'],
    name: 'Skynet Countdown',
    url: 'https://skynetcountdown.com/',
    short: 'AI risk predictor & AGI timeline tracker',
    measures: 'Estimated chance of AI control loss and an estimated AGI date, plus tagged news',
    whoSets: 'Their risk and timeline model over breakthroughs and headlines',
    recomputable: false,
    recomputableNote: 'Not that we could find: the percentage and the date read as model outputs, and we did not see a published formula over open inputs',
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
    also: 'Countdown-style pages on several sites',
    ourAngle: `${brand.NAME} does not publish a p(doom). It counts observable tempo. For the vocabulary, see the p(doom) explainer.`,
    queryShapes: ['p(doom) alternative', 'AI doomsday clock verifiable', 'pdoom vs activity index'],
    related: ['/p-doom.html', '/ai-doomsday-clock.html'],
  },
  {
    id: 'pizzint',
    path: '/vs/pizzint.html',
    // Root typed guess (FINDABILITY #131). Canonical stays on /vs/pizzint.html.
    aliases: ['/pizzint.html'],
    name: 'PizzINT',
    url: 'https://www.pizzint.watch/',
    short: 'Pentagon Pizza Index with DEFCON / Doomsday Clock framing',
    measures: 'A pizza-and-intel novelty index that borrows DEFCON and Doomsday Clock language in the title',
    whoSets: 'Their site’s framing over pizza / intel metaphors — not a published AI-activity formula',
    recomputable: false,
    recomputableNote: 'Not as an AI activity count: the DEFCON/Doomsday language is brand hijack, and we did not see open inputs that recompute an AI tempo reading',
    also: 'Hundreds of /intel brief URLs; news-sitemap flips empty↔thin',
    ourAngle: `${brand.NAME} does not publish a DEFCON level or a Doomsday Clock reading. It publishes an hourly AI activity score you can recompute from public data.`,
    queryShapes: [
      'Pentagon Pizza Index alternative',
      'DEFCON level AI index',
      'pizzint vs activity index',
      'AI activity index not DEFCON',
    ],
    related: ['/guide.html', '/ai-doomsday-clock.html'],
  },
  {
    id: 'takeofftracker',
    path: '/vs/takeofftracker.html',
    // Typed “takeoff” guess for the rival head term. Same body; canonical on path.
    // Root aliases (FINDABILITY #131) catch hand-typed URLs without /vs/.
    aliases: ['/vs/takeoff.html', '/takeofftracker.html', '/takeoff.html'],
    name: 'Takeoff Tracker',
    url: 'https://www.takeofftracker.com/',
    short: 'AGI metrics dashboard (timelines, stocks, leaderboards, p(doom) estimates)',
    measures: 'A dashboard of AGI-adjacent signals — Metaculus-style timelines, AI stock moves, arena leaderboards, GPU power, datacentres, and collected p(doom) estimates',
    whoSets: 'Their curated dashboard over public prediction markets, markets data and linked leaderboards',
    recomputable: false,
    recomputableNote: 'Not as a single activity reading: the page aggregates many third-party series, and we did not see one published formula that re-derives a SIREN-style tempo score from those inputs',
    also: 'Blog posts and starter packs around takeoff vocabulary',
    ourAngle: `${brand.NAME} does not publish an AGI timeline, a takeoff dashboard, or anyone’s p(doom). It publishes one hourly recomputable activity score from public feeds.`,
    queryShapes: [
      'Takeoff Tracker alternative',
      'AGI metrics dashboard vs activity index',
      'takeofftracker vs SIREN',
      'AGI timeline tracker recomputable',
    ],
    related: ['/p-doom.html', '/methodology.html'],
  },
  {
    id: 'aidoomsday',
    path: '/vs/aidoomsday.html',
    aliases: ['/aidoomsday.html', '/vs/ai-doomsday-clock.html'],
    name: 'The AI Doomsday Clock (aidoomsday.live)',
    url: 'https://aidoomsday.live/',
    short: 'A single dial set from named experts’ p(doom) estimates',
    measures: 'Where stated expert probabilities of AI catastrophe cluster, shown as a clock (it reads the 10–20% cluster)',
    whoSets: 'The site, reading a spread of named researchers’ and lab leaders’ stated p(doom)',
    recomputable: false,
    recomputableNote: 'No, and the site says so: it calls the setting a way to read a cloud of subjective probabilities, not a measurement',
    also: 'A slider to set the clock to your own number and share it',
    ourAngle: `${brand.NAME} does not set a clock from opinions. It counts AI activity every hour from public data, and the ${brand.NAME} p(doom) page plots the same named experts on one chart.`,
    queryShapes: ['AI doomsday clock', 'is there an AI doomsday clock today', 'aidoomsday.live alternative'],
    related: ['/ai-doomsday-clock.html', '/p-doom.html'],
  },
  {
    id: 'imd-ai-safety-clock',
    path: '/vs/imd-ai-safety-clock.html',
    aliases: ['/ai-safety-clock.html', '/vs/ai-safety-clock.html', '/vs/imd.html'],
    name: 'IMD AI Safety Clock',
    url: 'https://www.imd.org/centers/digital-ai-transformation-center/aisafetyclock/',
    short: 'A business school’s minutes-to-midnight clock for uncontrolled AGI',
    measures: 'Risk from uncontrolled AGI across sophistication, autonomy and execution, set as minutes to midnight (it launched at 29 and has since moved to 15)',
    whoSets: 'IMD researchers, combining a news-tracking dashboard with desk research and expert judgement',
    recomputable: false,
    recomputableNote: 'Not by a reader: IMD describes a proprietary dashboard plus qualitative expert assessment, and updates the setting periodically',
    also: 'Whitepapers on six-month AI developments and a newsletter',
    ourAngle: `${brand.NAME} publishes no minutes-to-midnight setting. It publishes an hourly AI activity score from open inputs that anyone can recompute.`,
    queryShapes: ['AI Safety Clock', 'IMD AI Safety Clock alternative', 'AI safety clock today'],
    related: ['/ai-doomsday-clock.html', '/methodology.html'],
  },
  {
    id: 'aifeartrustindex',
    path: '/vs/aifeartrustindex.html',
    aliases: ['/aifeartrustindex.html', '/vs/ai-fear-trust-index.html'],
    name: 'AI Fear & Trust Index',
    url: 'https://aifeartrustindex.com/doom',
    short: 'A computed index of existential-risk discourse about named AI systems',
    measures: 'How much and how intensely people talk about existential risk for each model or lab, with a minutes-to-midnight display',
    whoSets: 'A published formula over posts that their own language model classifies',
    recomputable: false,
    recomputableNote: 'Partly: the weights are published, but the inputs are labels from their own classifier, so a stranger cannot rebuild the score from raw public data',
    also: 'Per-model and per-lab rankings over a 72-hour window',
    ourAngle: `Closest in spirit: both measure something observable, not danger. ${brand.NAME} counts AI activity (releases, compute, money, governance, markets, attention), not fear in posts, and every input is public.`,
    queryShapes: ['AI fear index', 'AI doom index live', 'aifeartrustindex alternative'],
    related: ['/ai-doomsday-clock.html', '/methodology.html'],
  },
];

function liveStrip(ctx) {
  const st = ctx && ctx.state;
  if (!st || !Number.isFinite(st.level) || !Number.isFinite(st.score)) {
    return `<p class="cmp__lede">${esc(brand.NAME)} publishes a fresh reading every hour at the homepage and in <a href="${esc(ctx.href('/api/state.json'))}">/api/state.json</a>.</p>`;
  }
  // FINDABILITY #453 — dual middot head terms beside live home (compare /
  // alternatives / vs hubs were index-only after verify dual #451).
  return `<div class="cmp__stat" role="group" aria-label="Current ${brand.NAME} reading">
    <div><b class="num">${esc(brand.NAME)} ${esc(st.level)}</b><span>${esc(st.level_name)}</span></div>
    <div><b class="num">${esc(num(st.score, 1))}</b><span>of 100 this hour</span></div>
    <div><b class="num">${esc(utc(st.generated_at))}</b><span>UTC reading time</span></div>
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)} →</a>
     · <a href="${esc(ctx.href('/api/state.json'))}">state.json →</a>
     · Scale runs 5 (quietest) to 1 (loudest). Tempo, not danger.</p>`;
}

function rivalNav(excludeId) {
  const links = [
    `<a href="${esc('/compare.html')}">Which AI doom indexes can you compare?</a>`,
    `<a href="${esc('/vs.html')}">Which AI indexes does ${esc(brand.NAME)} contrast?</a>`,
    `<a href="${esc('/alternatives.html')}">What are AI doom index alternatives?</a>`,
    ...RIVALS.filter((r) => r.id !== excludeId).map((r) => `<a href="${esc(r.path)}">${esc(brand.NAME)} vs ${esc(r.name)}: which should you use?</a>`),
    `<a href="${esc('/guide.html')}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>`,
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

/** Visible FAQ from the SAME pairs as FAQPage JSON-LD (FINDABILITY schema rule). */
function faqBlock(pairs) {
  if (!pairs || !pairs.length) return '';
  return `<h2 id="faq">What questions do people actually ask?</h2>
${pairs.map(([q, a]) => `  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('\n')}`;
}

function pageJsonLd(ctx, path, title, description, crumbs, faqPairs) {
  const modified = ctx.state && typeof ctx.state.generated_at === 'string'
    ? ctx.state.generated_at
    : undefined;
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['h1', '.cmp__lede']),
      ...(modified ? { dateModified: modified } : {}),
    },
    breadcrumbs(ctx, crumbs),
    organization(ctx),
  ];
  if (faqPairs && faqPairs.length) blocks.push(faqEntities(faqPairs));
  return blocks;
}

export function compareHub(ctx) {
  const path = '/compare.html';
  const aa = brand.COMPLEMENTS.find((c) => c.id === 'artificial-analysis');
  const a27 = brand.COMPLEMENTS.find((c) => c.id === 'ai-2027');
  // Head-term question (FINDABILITY tip #206): H1 must match <title> stem.
  // Was “Which AI doom indexes can you compare honestly?” under a shorter title.
  const qTitle = 'Which AI doom indexes can you compare?';
  const description = `${qTitle} How do you compare AI doom indexes? ${brand.NAME} is an hourly AI activity count you can recompute. DoomBench scores takeover evidence, Skynet Countdown estimates AGI dates, p(doom) clocks publish opinions, PizzINT borrows DEFCON/Doomsday framing, and Takeoff Tracker aggregates AGI metrics. Side-by-side without borrowing their claims.`;
  // Tip #267: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const sideQ = 'How do they compare side by side?';
  const pickQ = 'Which rival should you pick?';
  const compQ = 'Which complementary instruments are not doom indexes?';
  const alsoQ = 'What else is on this site?';
  // FAQ from the SAME pairs as FAQPage (§3.3). Refuse doom-probability / DEFCON hijack / forecast.
  const faq = [
    [qTitle,
      `${brand.NAME} next to DoomBench, Skynet Countdown, p(doom) clocks, PizzINT and Takeoff Tracker — method by method. ${brand.NAME} is an hourly recomputable activity count; the others are judgement scores, countdowns, opinions, or title hijacks.`],
    // Exact how-to head term (FINDABILITY #127) — SERP “compare AI doom indexes”
    // ranked DoomBench ahead of this hub; keep H1/title, add matching visible FAQ.
    ['How do you compare AI doom indexes?',
      `Put method next to method. ${brand.NAME} is an hourly recomputable AI activity count with a receipt. DoomBench scores takeover evidence, Skynet Countdown estimates AGI dates, p(doom) clocks publish opinions, PizzINT borrows DEFCON/Doomsday framing, and Takeoff Tracker aggregates AGI metrics. This page’s table is that comparison without borrowing their claims.`],
    [sideQ,
      `${brand.NAME} is an hourly recomputable activity count; the rivals are judgement scores, countdowns, opinions, or title hijacks. The table below compares method by method.`],
    [pickQ,
      'Each rival has a dedicated versus page: DoomBench, Skynet Countdown, p(doom) clocks, PizzINT and Takeoff Tracker.'],
    [compQ,
      `For which model is smartest, cheapest or fastest, use Artificial Analysis. For a detailed written AGI scenario, use AI 2027. ${brand.NAME} is tempo. They pair; they do not substitute.`],
    [alsoQ,
      'Versus hub, alternatives hub, guide, methodology and export/embed live on this site beside the comparison table.'],
    [`What is the difference between ${brand.NAME} and DoomBench?`,
      `${brand.NAME} measures AI activity tempo from public data every hour and publishes a receipt. DoomBench publishes a qualitative doom index from sourced evidence about takeover risk. One is a count; the other is a judgement-scored risk index.`],
    ['Which AI doom index can I recompute myself?',
      `${brand.NAME}. Clone the repo, run the collector, and compare your number to the published one. DoomBench, Skynet Countdown, p(doom) clocks and PizzINT are not independently recomputable as an AI activity count from open inputs alone.`],
    [`Is ${brand.NAME} a DEFCON level or Doomsday Clock?`,
      `No. ${brand.NAME} borrows the countdown grammar only. It does not publish a military DEFCON reading or the Bulletin’s Doomsday Clock. Sites that put those phrases in the title for AI traffic are doing brand hijack; see /guide.html and /vs/pizzint.html.`],
    [`Does a louder ${brand.NAME} reading mean AI is more dangerous?`,
      'No. The level measures how much is happening — releases, compute, headlines, rule-making and market prices — not whether what happened was good or bad.'],
  ];
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k">Which AI doom indexes can you compare?</p>
  <h1>${esc(qTitle)}</h1>
  <p class="cmp__lede">People searching for an “AI doom index” usually land on a judgement score, a countdown, or a DEFCON-shaped novelty page.
    ${esc(brand.NAME)} answers a different question: <b>how loud is AI activity right now</b>, measured hourly from public data.
    This page puts that next to the rivals people actually type.</p>
  ${liveStrip(ctx)}
  <h2 id="cmp-side-h">How do they compare side by side?</h2>
  ${comparisonTable()}
  <h2 id="cmp-pick-h">Which rival should you pick?</h2>
  ${RIVALS.map((r) => `<div class="cmp__card">
    <h3><a href="${esc(ctx.href(r.path))}">${esc(brand.NAME)} vs ${esc(r.name)}: which should you use?</a></h3>
    <p>${esc(r.short)}. ${esc(r.measures)}. ${esc(r.recomputableNote)}.</p>
  </div>`).join('')}
  <h2 id="cmp-comp-h">Which complementary instruments are not doom indexes?</h2>
  <p>For <b>which model is smartest, cheapest or fastest</b>, use
    <a href="${esc(aa.url)}" rel="noopener">${esc(aa.name)}</a>.
    That is independent quality, speed and cost. For <b>what a detailed AGI scenario looks like</b>, use
    <a href="${esc(a27.url)}" rel="noopener">${esc(a27.name)}</a>.
    That is a written scenario narrative. ${esc(brand.NAME)} is tempo.
    They pair; they do not substitute. We link out; we do not republish their numbers or their story as ours.</p>
  ${faqBlock(faq)}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast?</a>
    · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>
    · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
  <h2 id="cmp-also-h">What else is on this site?</h2>
  <p><a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast? →</a>
     · <a href="${esc(ctx.href('/alternatives.html'))}">What are AI doom index alternatives? →</a>
     · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)? →</a>
     · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology →</a>
     · <a href="${esc(ctx.href('/export.html'))}#embed">How do I export and embed ${esc(brand.NAME)} data? →</a></p>
  ${rivalNav(null)}
</article>`;
  return page({
    ctx,
    path,
    title: `${qTitle} ${brand.NAME} vs DoomBench, Skynet, p(doom), PizzINT and Takeoff Tracker`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: pageJsonLd(ctx, path, qTitle, description, [
      { name: 'Home', path: '/' },
      { name: qTitle, path },
    ], faq),
    main,
  });
}

/** Head-term /vs.html directory over the same gated conquest set as /vs/*. */
export function vsHub(ctx) {
  const path = '/vs.html';
  // Head-term title: people search “SIREN vs” / rival index names.
  const title = `Which AI indexes does ${brand.NAME} contrast? DoomBench, Skynet, p(doom), PizzINT, Takeoff Tracker`;
  const description = `${brand.NAME} versus DoomBench, Skynet Countdown, p(doom) clocks, PizzINT and Takeoff Tracker — one honest page each. Activity tempo with a receipt, not a doom probability, AGI date, or DEFCON reading.`;
  const faq = [
    [`Where are the ${brand.NAME} versus pages?`,
      `Each rival has a dedicated /vs/ page: DoomBench, Skynet Countdown, p(doom) clocks, PizzINT and Takeoff Tracker. This hub lists them. The full table is on /compare.html.`],
    [`Does ${brand.NAME} claim to beat DoomBench or Skynet on doom risk?`,
      `No. Those sites score judgement about danger or timelines. ${brand.NAME} counts how loud AI activity is this hour. The versus pages only contrast measurement methods.`],
  ];
  const rows = RIVALS.map((r) => `<li>
  <a href="${esc(ctx.href(r.path))}">${esc(brand.NAME)} vs ${esc(r.name)}: which should you use?</a>
  <span class="cmp__lede" style="display:block;margin:4px 0 0">${esc(r.short)}. ${esc(r.ourAngle)}</span>
</li>`).join('');
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · Which AI indexes does ${esc(brand.NAME)} contrast?</p>
  <h1>Which AI indexes does ${esc(brand.NAME)} contrast?</h1>
  <p class="cmp__lede">Search often lands on a doom score, a countdown, or a DEFCON-shaped novelty page.
    These versus pages state what each rival measures and what ${esc(brand.NAME)} refuses to claim.
    No borrowed doom probability, AGI date, or military DEFCON reading.</p>
  ${liveStrip(ctx)}
  <div class="cmp__stat" role="group" aria-label="Versus pages">
    <div><b class="num">${esc(String(RIVALS.length))}</b><span>Rival pages</span></div>
  </div>
  <ol class="cmp__card" style="list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px">${rows}</ol>
  ${faqBlock(faq)}
  <h2 id="vs-also-h">What else should you read?</h2>
  <p><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a>
     · <a href="${esc(ctx.href('/alternatives.html'))}">What are AI doom index alternatives?</a>
     · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a></p>
  ${rivalNav(null)}
</article>`;
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Which AI indexes does ${brand.NAME} contrast?`,
    numberOfItems: RIVALS.length,
    itemListElement: RIVALS.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${brand.NAME} vs ${r.name}: which should you use?`,
      url: ctx.url(r.path),
    })),
  };
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: [
      ...pageJsonLd(ctx, path, title, description, [
        { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
        { name: `Which AI indexes does ${brand.NAME} contrast?`, path },
      ], faq),
      listLd,
    ],
    main,
  });
}

export function alternatives(ctx) {
  const path = '/alternatives.html';
  const aa = brand.COMPLEMENTS.find((c) => c.id === 'artificial-analysis');
  const a27 = brand.COMPLEMENTS.find((c) => c.id === 'ai-2027');
  // Head-term question (FINDABILITY tip #207): H1 must match <title> stem.
  // Was “What are AI doom index alternatives, and what is each one?” under a shorter title.
  const qTitle = 'What are AI doom index alternatives?';
  const description = `${qTitle} What is an AI doom index alternative? Looking for a DoomBench, Skynet Countdown, p(doom), PizzINT or Takeoff Tracker alternative? ${brand.NAME} is an hourly AI activity index with open code, CORS JSON and hash-chained receipts — not a DEFCON level or probability of doom.`;
  // Tip #267: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const rightQ = `When is ${brand.NAME} the right alternative?`;
  const wrongQ = `When is ${brand.NAME} the wrong alternative?`;
  const oneQ = 'Where is one page per rival?';
  const allQ = 'Where can you compare everything?';
  // FAQ from the SAME pairs as FAQPage (§3.3). Refuse doom-probability / DEFCON hijack / forecast.
  const faq = [
    [qTitle,
      `${brand.NAME} if you want a recomputable hourly activity count instead of a judgement doom score, AGI date, personal p(doom), DEFCON-shaped novelty page, or multi-panel takeoff dashboard. The pages below say when it is the right substitute — and when it is not.`],
    // Exact singular head term (FINDABILITY #126) — SERP “AI doom index alternative”
    // was not surfacing this hub; keep plural H1/title, add matching visible FAQ.
    ['What is an AI doom index alternative?',
      `An AI doom index alternative is a reading that answers a related question without borrowing a doom probability. ${brand.NAME} is an hourly AI activity index — how loud AI activity is across public feeds — with open code, CORS JSON and hash-chained receipts. It is not a DEFCON level, not a p(doom), and not a forecast.`],
    [rightQ,
      'When you want a number a stranger can recompute from public data and a published receipt, an embeddable widget and CORS-open JSON, and tempo rather than a takeover probability or fake DEFCON.'],
    [wrongQ,
      'When you need a scored takeover argument (DoomBench), an AGI date (Skynet Countdown), a personal p(doom), Pentagon-pizza novelty, a multi-panel takeoff dashboard, model intelligence rankings, or a detailed written AGI scenario.'],
    [oneQ,
      'Each rival has a dedicated versus page listed below, with the queries that page answers.'],
    [allQ,
      'The full side-by-side table is on Which AI doom indexes can you compare?; the versus hub lists every rival page.'],
    ['What is a good alternative to DoomBench?',
      `${brand.NAME} if you want a recomputable activity tempo reading instead of a qualitative doom score. It does not replace DoomBench’s takeover-evidence framing; it answers a different question with arithmetic you can check.`],
    ['What is a good alternative to Skynet Countdown?',
      `${brand.NAME} if you want live activity without an AGI date or a control-loss percentage. For dated news hubs, this site publishes per-story pages and a rolling news sitemap instead of a predicted singularity day.`],
    ['What is a good alternative to the Pentagon Pizza Index / PizzINT?',
      `${brand.NAME} if you want an AI activity reading instead of DEFCON/Doomsday Clock brand hijack. ${brand.NAME} does not publish a military DEFCON level or the Bulletin’s clock — see /vs/pizzint.html and /guide.html.`],
    ['What is a good alternative to Takeoff Tracker?',
      `${brand.NAME} if you want one hourly recomputable activity reading instead of a multi-panel AGI metrics dashboard (timelines, stocks, leaderboards, p(doom) estimates). It does not replace Takeoff Tracker’s curated signal board; it answers a different question with a receipt.`],
    ['Is there a verifiable AI doomsday clock?',
      `Most AI doomsday clocks are expert judgement. ${brand.NAME} is an hourly activity count with a receipt. See the AI doomsday clock explainer for the vocabulary without the fake precision.`],
  ];
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · What are AI doom index alternatives?</p>
  <h1>${esc(qTitle)}</h1>
  <p class="cmp__lede">“Alternative” only helps if the substitute measures the same thing. Most AI doom indexes measure
    <b>judgement about danger</b>, or borrow DEFCON language for traffic. ${esc(brand.NAME)} measures <b>how much is happening</b>. Use this hub when a search
    for DoomBench, Skynet Countdown, p(doom), PizzINT or Takeoff Tracker brought you here and you need the honest fork.</p>
  ${liveStrip(ctx)}
  <h2 id="alt-right-h">When is ${esc(brand.NAME)} the right alternative?</h2>
  <ul>
    <li>You want a number a stranger can recompute from public data and a published receipt.</li>
    <li>You want an embeddable widget and a CORS-open JSON API, not a client-rendered shell.</li>
    <li>You want tempo (releases, compute, attention, governance, markets), not a takeover probability or a fake DEFCON.</li>
  </ul>
  <h2 id="alt-wrong-h">When is ${esc(brand.NAME)} the wrong alternative?</h2>
  <ul>
    <li>You need a scored argument about AI takeover risk — that is DoomBench’s product, not ours.</li>
    <li>You need an estimated AGI date or control-loss percentage — that is Skynet Countdown’s product, not ours.</li>
    <li>You want a personal extinction probability — that is p(doom), and it stays an opinion.</li>
    <li>You want Pentagon-pizza novelty or a military DEFCON reading — that is not an AI activity index; see /vs/pizzint.html.</li>
    <li>You want a multi-panel AGI takeoff dashboard (timelines, stocks, arena ranks, collected p(doom)) — that is Takeoff Tracker’s product, not ours.</li>
    <li>You need model intelligence, speed or cost rankings — that is <a href="${esc(aa.url)}" rel="noopener">${esc(aa.name)}</a>, not an activity index.</li>
    <li>You want a detailed written AGI scenario — that is <a href="${esc(a27.url)}" rel="noopener">${esc(a27.name)}</a>, not an activity index.</li>
  </ul>
  <h2 id="alt-one-h">Where is one page per rival?</h2>
  ${RIVALS.map((r) => `<div class="cmp__card">
    <h3><a href="${esc(ctx.href(r.path))}">${esc(brand.NAME)} vs ${esc(r.name)}: which should you use?</a></h3>
    <p>${esc(r.ourAngle)}</p>
    <p class="fresh__key">Queries this page answers: ${esc(r.queryShapes.join('; '))}.</p>
  </div>`).join('')}
  ${faqBlock(faq)}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a>
    · <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast?</a>
    · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>
    · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)?</a>.</p>
  <h2 id="alt-all-h">Where can you compare everything?</h2>
  <p><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare? →</a>
     · <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast? →</a>
     · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)? →</a>
     · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)? →</a></p>
  ${rivalNav(null)}
</article>`;
  return page({
    ctx,
    path,
    title: `${qTitle} Recomputable activity vs judgement clocks · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: pageJsonLd(ctx, path, qTitle, description, [
      { name: 'Home', path: '/' },
      { name: qTitle, path },
    ], faq),
    main,
  });
}

export function vsRival(ctx, rivalId) {
  const rival = RIVALS.find((r) => r.id === rivalId);
  if (!rival) return '';
  const path = rival.path;
  // Head-term question (FINDABILITY tip #208): H1 must match <title> stem (colon, not em dash).
  const qTitle = `${brand.NAME} vs ${rival.name}: which should you use?`;
  const title = `${qTitle} Activity count vs ${rival.short}`;
  const description = `${qTitle} ${rival.measures}. ${rival.recomputableNote}. ${brand.NAME} publishes an hourly recomputable activity score instead.`;
  // Tip #364: side-card H3s are question-shaped and mirrored in FAQ (§3.3).
  const rivalQ = `What is ${rival.name}?`;
  const sirenQ = `What is ${brand.NAME}?`;
  const faq = [
    [qTitle,
      `Use ${rival.name} if you want ${rival.measures.toLowerCase()}. Use ${brand.NAME} if you want an hourly AI activity tempo reading with open inputs and a receipt. They are not substitutes for the same claim.`],
    [`Can I recompute ${rival.name}?`,
      rival.recomputableNote],
    [`Does ${brand.NAME} publish the same number as ${rival.name}?`,
      `No. ${brand.NAME} does not score ${rival.short.toLowerCase()}. It scores observable activity across five pillars and says so on every page.`],
    [rivalQ,
      `${rival.name}: ${rival.short}. Measures ${rival.measures}. Set by ${rival.whoSets}.`],
    [sirenQ,
      `${brand.NAME} measures AI activity tempo across capability, compute & capital, attention, governance and markets with a published formula over public data, hourly.`],
  ];
  const relatedQ = {
    '/p-doom.html': 'What is p(doom)?',
    '/ai-doomsday-clock.html': 'Is there an AI doomsday clock?',
    '/guide.html': `How does ${brand.NAME} compare to DEFCON, the Doomsday Clock and p(doom)?`,
    '/methodology.html': `How the ${brand.NAME} AI activity index is computed · methodology`,
  };
  const related = (rival.related || [])
    .map((p) => {
      const q = relatedQ[p] || p.replace(/^\//, '').replace(/\.html$/, '');
      return `<a href="${esc(ctx.href(p))}">${esc(q)} →</a>`;
    })
    .join(' · ');
  const main = `${CSS}
<article class="cmp prose">
  <p class="cmp__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast?</a></p>
  <h1>${esc(qTitle)}</h1>
  <p class="cmp__lede">${esc(rival.ourAngle)}</p>
  ${liveStrip(ctx)}
  <h2 id="vs-each-h">What is each one?</h2>
  ${comparisonTable()}
  <h3>${esc(rivalQ)}</h3>
  <ul>
    <li><b>Public claim:</b> ${esc(rival.short)}.</li>
    <li><b>Measures:</b> ${esc(rival.measures)}.</li>
    <li><b>Set by:</b> ${esc(rival.whoSets)}.</li>
    <li><b>Recomputable by a stranger:</b> ${esc(rival.recomputableNote)}.</li>
    <li><b>Also ships:</b> ${esc(rival.also)}.</li>
    <li><b>Their site:</b> <a href="${esc(rival.url)}" rel="noopener">${esc(rival.url.replace(/^https?:\/\//, ''))}</a></li>
  </ul>
  <h3>${esc(sirenQ)}</h3>
  <ul>
    <li><b>Measures:</b> AI activity tempo across capability, compute &amp; capital, attention, governance and markets.</li>
    <li><b>Set by:</b> a published formula over public data, hourly.</li>
    <li><b>Recomputable:</b> yes — receipt, open code, CORS JSON.</li>
    <li><b>Does not publish:</b> takeover probability, AGI date, anyone’s p(doom), a military DEFCON level, or the Bulletin’s Doomsday Clock.</li>
  </ul>
  ${faqBlock(faq)}
  <h2 id="vs-next-h">Where should you go next?</h2>
  <p><a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)} →</a>
     · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a>
     · <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast?</a>
     · <a href="${esc(ctx.href('/alternatives.html'))}">What are AI doom index alternatives?</a>
     ${related ? `· ${related}` : ''}</p>
  ${rivalNav(rival.id)}
</article>`;
  return page({
    ctx,
    path,
    title,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: pageJsonLd(
      ctx,
      path,
      qTitle,
      description,
      [
        { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
        { name: `Which AI indexes does ${brand.NAME} contrast?`, path: '/vs.html' },
        { name: qTitle, path },
      ],
      faq,
    ),
    main,
  });
}

/** All HTML bodies this module owns. */
export function renderAll(ctx) {
  const rivalPages = RIVALS.flatMap((r) => {
    const html = vsRival(ctx, r.id);
    const primary = { path: r.path.replace(/^\//, ''), html };
    // Alias files reuse the primary body so <link rel="canonical"> still
    // points at rival.path (vsRival passes path: rival.path into layout).
    const aliases = (r.aliases || []).map((a) => ({
      path: a.replace(/^\//, ''),
      html,
    }));
    return [primary, ...aliases];
  });
  return [
    { path: 'compare.html', html: compareHub(ctx) },
    { path: 'alternatives.html', html: alternatives(ctx) },
    { path: 'vs.html', html: vsHub(ctx) },
    ...rivalPages,
  ];
}

/** Sitemap rows for the conquest set (always indexable — evergreen substance). */
export function sitemapEntries(ctx) {
  const last = (ctx.state && ctx.state.generated_at) || new Date().toISOString();
  return [
    { loc: '/compare.html', changefreq: 'weekly', priority: '0.9', lastmod: last },
    { loc: '/alternatives.html', changefreq: 'weekly', priority: '0.9', lastmod: last },
    { loc: '/vs.html', changefreq: 'weekly', priority: '0.9', lastmod: last },
    ...RIVALS.map((r) => ({
      loc: r.path,
      changefreq: 'weekly',
      priority: '0.85',
      lastmod: last,
    })),
  ];
}
