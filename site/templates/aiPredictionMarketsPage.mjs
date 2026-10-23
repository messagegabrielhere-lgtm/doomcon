// /ai-prediction-markets.html — evergreen head-term page for people searching
// “AI prediction markets”. Honest: market odds live on The Race; SIREN itself
// is not a prediction. Competes for the query without violating VOICE.md.
import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, organization, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.apm{max-width:78ch}
.apm .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#FBBF24;margin:0 0 10px}
.apm .lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.apm h2{font:700 1.15rem/1.25 var(--sans);margin:28px 0 10px;color:var(--ink)}
.apm p,.apm li{color:var(--ink-dim);line-height:1.6}
.apm .stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:16px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.apm .stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.apm .stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.apm .nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.apm .nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.apm .nav a:hover{background:var(--bg-sunken)}
.apm-faq details{border-top:1px solid var(--rule);padding:10px 0}
.apm-faq summary{cursor:pointer;font:700 14px/1.35 var(--sans);color:var(--ink)}
.apm-faq p{margin:8px 0 0}
</style>`;

function faqs(brandName) {
  return [
    {
      q: 'What are AI prediction markets?',
      a: 'Exchange-traded contracts on AI questions — which lab holds the best model, when a release ships, whether an event happens by a date. Prices are money-backed opinions, not lab press releases.',
    },
    {
      q: `Does ${brandName} predict the future?`,
      a: `No. ${brandName} counts observable AI activity tempo. On The Race and the Markets pillar it reprints live prediction-market prices so you can see what traders are paying. Those prices are not a ${brandName} forecast.`,
    },
    {
      q: 'Where are the live odds?',
      a: 'The Race ranks frontier labs by the live Polymarket probability for best AI model at year-end. The Markets pillar lists scored news under the markets filter. Each page says the number is a market price.',
    },
    {
      q: 'Why might a brand search for an AI prediction product return nothing?',
      a: 'Search needs crawlable pages. A name with no indexed site, no sitemap entry and no coverage under that string does not surface — even if similar products exist. Publish the answer, then submit the URL.',
    },
  ];
}

export function render(ctx, race) {
  const top = race && Array.isArray(race.players)
    ? race.players.slice().sort((a, b) => a.rank - b.rank)[0]
    : null;
  const leader = top && top.market && Number.isFinite(top.market.probability)
    ? { name: top.name, pct: (top.market.probability * 100).toFixed(1) }
    : null;
  const at = race && race.generated_at ? utc(race.generated_at) : (ctx.state && ctx.state.generated_at ? utc(ctx.state.generated_at) : null);
  const faq = faqs(brand.NAME);

  const pageTitle = `Where are live AI prediction market odds? · ${brand.NAME}`;

  const main = `${CSS}<section class="apm">
  <p class="eyebrow">PREDICTION MARKETS · NOT A ${esc(brand.NAME)} FORECAST</p>
  <h1 class="bp__h1 speakable-summary">Where are live AI prediction market odds?</h1>
  <p class="lede speakable-lede">${esc(brand.NAME)} reprints money-backed prices from Polymarket, Kalshi and Manifold on AI questions. The index itself counts how loud AI activity is this hour. It does not publish a prediction.</p>
  ${leader && leader.pct ? `<div class="stat"><div><b>${esc(leader.pct)}%</b><span>${esc(leader.name)} — live best-model market (year-end)</span></div>${at ? `<div><b>${esc(at)}</b><span>Race board clock (UTC)</span></div>` : ''}</div>` : ''}
  <div class="nav">
    <a href="${esc(ctx.href('/race.html'))}">The Race →</a>
    <a href="${esc(ctx.href('/pillar/markets.html'))}">Markets pillar →</a>
    <a href="${esc(ctx.href('/methodology.html'))}">Methodology →</a>
    <a href="${esc(ctx.href('/search-trends.html'))}">Search Trends watch →</a>
  </div>
  <h2>What does this page answer?</h2>
  <p>People type “AI prediction markets” when they want live odds on labs and model releases. This page is the crawlable answer: where ${esc(brand.NAME)} shows those prices, and the hard line that the prices are the market’s, not ours.</p>
  <h2>Where should readers go next?</h2>
  <ul>
    <li><a href="${esc(ctx.href('/race.html'))}">The Race</a> — frontier labs ordered by live prediction-market probability.</li>
    <li><a href="${esc(ctx.href('/pillar/markets.html'))}">Markets pillar</a> — scored stories under the markets filter, plus source posture.</li>
    <li><a href="${esc(ctx.href('/nations.html'))}">Nations</a> — the same odds grouped by lab home country.</li>
    <li><a href="${esc(ctx.href('/search-trends.html'))}">Search Trends</a> — when AI head terms spike on Google’s daily firehose.</li>
  </ul>
  <h2>FAQ</h2>
  <div class="apm-faq">${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
  <p style="font-size:12.5px">Not financial advice. Prediction markets are restricted in some places. Market names belong to their venues. ${esc(brand.TAGLINE)}</p>
</section>`;

  return page({
    ctx,
    path: '/ai-prediction-markets.html',
    title: pageTitle,
    description: 'Where to read live AI prediction-market odds on SIREN — The Race and the Markets pillar. Market prices, not a SIREN forecast. Includes FAQ.',
    main,
    jsonld: [
      organization(ctx),
      breadcrumbs(ctx, [{ name: 'Where are live AI prediction market odds?', path: '/ai-prediction-markets.html' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: pageTitle,
        url: ctx.url('/ai-prediction-markets.html'),
        description: 'Live AI prediction-market odds reprinted on SIREN, with a clear line that SIREN does not forecast.',
        speakable: speakable(['.speakable-summary', '.speakable-lede']),
        isPartOf: { '@id': `${ctx.url('/')}#website` },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  });
}
