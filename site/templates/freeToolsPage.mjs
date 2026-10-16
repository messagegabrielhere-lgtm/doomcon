// /free-tools.html — Outrank-style free-tools listicle over real SIREN instruments.
// Head-term directory only: every row links a page we already publish. No thin
// synonym doorways, no doom-probability calculator (FINDABILITY.md §3.3).

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { verifyQuestion } from './_verify.mjs';
import * as brand from '../brand.mjs';

const PATH = '/free-tools.html';

/** Real free instruments — one honest sentence each (ItemList = HTML). */
export function freeToolRows() {
  return Object.freeze([
    {
      path: '/verify.html',
      name: verifyQuestion(),
      blurb: 'Re-hash the last 12 public receipts in your browser. Proves the record was not edited after the fact.',
    },
    {
      path: '/alerts.html',
      name: `How do I get alerts when ${brand.NAME} moves?`,
      blurb: 'RSS feeds for level changes, score swings and pillar spikes — pipe to email, Slack or a webhook. No signup here.',
    },
    {
      path: '/export.html',
      name: `How do I export and embed ${brand.NAME} data?`,
      blurb: 'CSV/JSON downloads, iframe embed, README badge and fetch snippets under an open licence.',
    },
    {
      path: '/export.html#embed',
      name: 'How do I embed the widget iframe?',
      blurb: 'A small live reading for your own site — no script tag, no key, no tracking. Snippets live on the export page.',
    },
    {
      path: '/export.html#embed',
      name: 'What badge works when iframes are stripped?',
      blurb: 'SVG level badge for GitHub READMEs and markdown footers — HTML and Markdown snippets on the export page.',
    },
    {
      path: '/api/index.json',
      name: 'Where is the API index?',
      blurb: 'Every public endpoint, including per-reading receipts. OpenAPI twin at /openapi.json. CORS open, no account.',
    },
    {
      path: '/news-sitemap.xml',
      name: 'Where is the news sitemap?',
      blurb: 'Rolling ~48h window of scored AI stories for Google News discovery.',
    },
    {
      path: '/search-trends.html',
      name: `Which Google Search Trends for AI does ${brand.NAME} watch?`,
      blurb: 'Daily trending searches filtered for AI — watched, not scored.',
    },
    {
      path: '/ai-prediction-markets.html',
      name: 'Where are live AI prediction market odds?',
      blurb: 'Live lab and model odds from public markets — market prices, not a SIREN forecast.',
    },
    {
      path: '/methodology.html',
      name: `How the ${brand.NAME} AI activity index is computed · methodology`,
      blurb: 'Every formula and frozen-reference rule — recompute yourself.',
    },
    // FINDABILITY #332 — classic board is a free instrument (war room / oven /
    // pillars / moves / embed) kept after the shorter home page shipped.
    {
      path: '/classic.html',
      name: `Where is the full ${brand.NAME} instrument panel?`,
      blurb: 'The classic board — war room, oven, pillars, moves, embed — kept after the shorter home page shipped.',
    },
  ]);
}

const CSS = `<style>
.ft{max-width:720px;min-width:0}
.ft .eyebrow{font:600 12px/1.2 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px;text-transform:uppercase}
.ft h1{font:700 clamp(1.6rem,5vw,2.3rem)/1.15 var(--sans);margin:0 0 12px;color:var(--ink)}
.ft h2{font:700 1.25rem/1.25 var(--sans);margin:34px 0 10px;color:var(--ink)}
.ft h3{font:700 1rem/1.3 var(--sans);margin:14px 0 6px;color:var(--ink)}
.ft p,.ft li{color:var(--ink-dim);line-height:1.6;overflow-wrap:anywhere}
.ft a{color:var(--accent,#4ADE80)}
.ft .lede{font:400 1.05rem/1.55 var(--sans);color:var(--ink-dim);margin:0 0 18px;max-width:62ch}
.ft ol{list-style:none;padding:0;margin:16px 0 0}
.ft li{padding:12px 0;border-bottom:1px solid var(--rule)}
.ft li a.ft__n{font:600 var(--t-base,1rem)/1.35 var(--sans);color:var(--ink);text-decoration:none}
.ft li p{margin:4px 0 0;font:400 var(--t-sm,.875rem)/1.5 var(--sans);color:var(--ink-dim)}
.ft .ft__sib{margin-top:28px;font-size:14px}
</style>`;

export function freeToolsPage(ctx) {
  const qTitle = `What free tools does ${brand.NAME} publish?`;
  const rows = freeToolRows();
  const alsoQ = 'What else sits next to these free tools?';
  const alsoA = `The AI explainers hub, the live AI activity index, and the fetch-first map for agents.`;
  const doomQ = `Does ${brand.NAME} ship a doom-probability calculator?`;
  const doomA = `No. These tools expose an hourly activity count, receipts, feeds and public JSON. None of them publishes a chance of harm.`;

  const faqPairs = [
    [
      qTitle,
      `${brand.NAME} publishes free instruments anyone can use without an account: verify receipts in the browser, RSS alerts, export and embed, a README badge, OpenAPI, a Google News sitemap, Search Trends, AI prediction-market odds, the full methodology, and the classic instrument panel at /classic.html.`,
    ],
    [
      verifyQuestion(),
      'Re-hash the last 12 public receipts in your browser. Proves the published record was not edited after the fact — not that the inputs were right.',
    ],
    [alsoQ, alsoA],
    [doomQ, doomA],
  ];

  const list = rows.map((g) => `<li>
  <a class="ft__n" href="${esc(ctx.href(g.path))}">${esc(g.name)}</a>
  <p>${esc(g.blurb)}</p>
</li>`).join('');
  const faqHtml = faqPairs.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');

  const description = `${qTitle} Verify receipts in your browser, RSS alerts, export and embed, OpenAPI, news sitemap, Search Trends and prediction markets — free, no account. Not a doom-probability calculator.`;

  const main = `${CSS}
<section class="ft">
  <p class="eyebrow"><a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a> · Free tools</p>
  <h1>${esc(qTitle)}</h1>
  <p class="lede">${esc(brand.NAME)} ships free instruments on this origin — no account, no key for the public reads.
    Each row below is a real page. None of them is a doom-probability calculator.</p>
  <ol>${list}</ol>
  <h2>${esc(alsoQ)}</h2>
  <p><a href="${esc(ctx.href('/'))}">AI activity index today · ${esc(brand.NAME)} →</a>
     · <a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a>
     · <a href="${esc(ctx.href('/agents.md'))}">agents.md</a>
     · <a href="${esc(ctx.href('/llms.txt'))}">llms.txt</a>.</p>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="ft__sib">Search-shaped sibling:
    <a href="${esc(ctx.href('/verify.html'))}">${esc(verifyQuestion())}</a>
    · <a href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a>
    · <a href="${esc(ctx.href('/export.html'))}">How do I export and embed ${esc(brand.NAME)} data?</a>
    · <a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a>.</p>
</section>`;

  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        url: ctx.url(PATH),
        description,
        isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: qTitle,
        numberOfItems: rows.length,
        itemListElement: rows.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: g.name,
          url: ctx.url(g.path),
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqPairs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}
