// /search-trends.html — Google Search Trends that SIREN watches for findability.
// Watched, not scored. Daily trending firehose + head-term watchlist.
import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, organization, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.st{max-width:920px}
.st .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#60A5FA;margin:0 0 10px}
.st h1{margin:0 0 12px}
.st .lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.st h2{font:700 1.15rem/1.25 var(--sans);margin:28px 0 10px;color:var(--ink)}
.st p,.st li{color:var(--ink-dim);line-height:1.55}
.st-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin:14px 0}
.st-c{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;padding:14px;display:flex;flex-direction:column;gap:6px}
.st-c h3{margin:0;font:700 13px/1.3 var(--sans);color:var(--ink)}
.st-c .tr{font:700 12px/1 var(--mono);color:#93C5FD;letter-spacing:.04em}
.st-c .geo{font:500 11px/1.2 var(--mono);color:var(--ink-faint,#6B7686)}
.st-c ul{margin:0;padding-left:18px;font-size:13px}
.st-c a{color:var(--ink)}
.st-table{width:100%;border-collapse:collapse;margin:10px 0;font:400 14px/1.4 var(--sans)}
.st-table th,.st-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--rule);color:var(--ink-dim);vertical-align:top}
.st-table th{font:700 11px/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
.st-table .hit{color:#4ADE80;font-weight:700}
.st-table .miss{color:var(--ink-faint,#6B7686)}
.st-dark{border:1px dashed var(--rule);padding:14px;border-radius:6px;color:var(--ink-faint)}
.st-faq details{border-top:1px solid var(--rule);padding:10px 0}
.st-faq summary{cursor:pointer;font:700 14px/1.35 var(--sans);color:var(--ink)}
.st-faq p{margin:8px 0 0}
</style>`;

function traffic(n, raw) {
  if (Number.isFinite(n)) return `${n.toLocaleString('en-US')}+`;
  return raw || '—';
}

function faqBlocks() {
  return [
    {
      q: `Which Google Search Trends for AI does ${brand.NAME} watch?`,
      a: `Daily trending searches from Google’s public RSS, filtered for AI-related titles. ${brand.NAME} publishes the firehose and a head-term watchlist on this page so crawlable answers exist before a spike.`,
    },
    {
      q: `Does ${brand.NAME} publish Google Trends scores?`,
      a: `No. Daily Google trending searches are watched for findability and published on this page. They do not move the ${brand.NAME} level. Longer search curiosity still comes from Wikipedia pageviews in the attention pillar.`,
    },
    {
      q: 'Why does a brand query like “AI prediction Mintieo” return nothing useful?',
      a: 'Google ranks crawlable pages. If a brand has no live site, no indexed HTML, and no third-party coverage under that name, Search has nothing to show for it. The fix is a public page that honestly answers the query, submitted in a sitemap — not a Trends spike alone.',
    },
    {
      q: `Where do live AI prediction-market odds live on ${brand.NAME}?`,
      a: `On The Race (/race.html) and the Markets pillar. Those pages report market prices. They are not a ${brand.NAME} forecast.`,
    },
    // FINDABILITY #158 — stock / neocloud Trends spikes need crawlable routing
    // on the watchlist page itself (gated destinations already answer).
    {
      q: `Where does ${brand.NAME} send IREN stock, dram stock, CoreWeave stock, and neocloud Trends?`,
      a: `IREN / Iris Energy / AI-cloud power → /watts.html (substrate reading, not a stock tip). Micron / MU / DRAM / HBM / memory stock → /lab/micron.html. CoreWeave stock / debt / bond yields → /lab/coreweave.html. Nvidia / NVDA stock → /lab/nvidia.html. ASML / EUV AI chip tools → /lab/asml.html. TSMC / AI foundry → /lab/tsmc.html. Amazon Bee / AI wearables → /lab/amazon.html. Meta Muse / open-weight AI → /lab/meta.html. Apple Intelligence → /lab/apple.html. Microsoft Copilot → /lab/microsoft.html. Grok / xAI → /lab/xai.html. Gemini / Gemma → /lab/google-deepmind.html. Samsung / HBM / AI memory → /lab/samsung.html. OpenAI lawsuit / FTC / ChatGPT suits → /lab/openai.html (story counts only, not legal advice). Anthropic IPO / FTC → /lab/anthropic.html (story counts only, not IPO advice). Neocloud / neoclouds → /tags/neoclouds.html. Character.ai bankruptcy → /tags/chatbots.html. Qwen / Alibaba open models → /lab/qwen.html. Oracle / AI datacenters → /tags/datacenters.html. Each page is story counts or infrastructure tempo only — not investment advice, not credit analysis, not legal advice, and not a company doom score.`,
    },
  ];
}

export function render(ctx, trends, hist = []) {
  const at = trends && trends.generated_at ? utc(trends.generated_at) : null;
  const ai = (trends && trends.ai_trends) || [];
  const heads = (trends && trends.head_terms) || [];
  const geosOk = ((trends && trends.geos) || []).filter((g) => g.ok);
  const dark = !trends || !trends.ok;

  const cards = ai.length
    ? `<div class="st-g">${ai.slice(0, 12).map((it) => `<article class="st-c">
      <div class="tr">${esc(traffic(it.traffic, it.traffic_raw))} searches</div>
      <h3>${esc(it.title)}</h3>
      <div class="geo">${esc(it.geo || '')}${it.head_terms && it.head_terms.length ? ` · watchlist: ${esc(it.head_terms.join(', '))}` : ''}</div>
      ${(it.news || []).length ? `<ul>${it.news.slice(0, 2).map((n) => `<li>${n.url ? `<a href="${esc(n.url)}" rel="noopener nofollow">${esc(n.title || n.url)}</a>` : esc(n.title || '')}${n.source ? ` · ${esc(n.source)}` : ''}</li>`).join('')}</ul>` : ''}
    </article>`).join('')}</div>`
    : `<p class="st-dark">${dark ? 'Google Trends did not answer this hour. The previous reading stays on disk; nothing is invented.' : 'No AI-related queries are in the current daily trending firehose. The head-term watchlist below still runs.'}</p>`;

  const watch = `<table class="st-table"><thead><tr><th>Head term</th><th>In today’s trends?</th><th>${esc(brand.NAME)} page</th></tr></thead><tbody>
    ${heads.map((t) => `<tr>
      <td>${esc(t.label)}</td>
      <td class="${t.trending ? 'hit' : 'miss'}">${t.trending ? `Yes${t.titles && t.titles[0] ? ` — ${esc(t.titles[0].title)}` : ''}` : 'Not in today’s firehose'}</td>
      <td><a href="${esc(ctx.href(t.path))}">${esc(t.path)}</a></td>
    </tr>`).join('')}
  </tbody></table>`;

  const histBits = hist.length
    ? `<p>Recent days with AI-related trending hits: ${hist.slice(-7).map((h) => `${esc(String(h.generated_at || '').slice(0, 10))} (${Number(h.ai_related || 0)})`).join(' · ')}.</p>`
    : '';

  const faqs = faqBlocks();
  const faqHtml = `<div class="st-faq">${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`;

  const main = `${CSS}<section class="st">
  <p class="eyebrow">SEARCH TRENDS · WATCHED, NOT SCORED</p>
  <h1 class="bp__h1 speakable-summary">Which Google Search Trends for AI does ${esc(brand.NAME)} watch?</h1>
  <p class="lede speakable-lede">Daily trending searches from Google’s public RSS, filtered for AI. ${brand.NAME} watches these for findability — when a head term spikes, the matching page should already answer it. Trends here do not move the index.</p>
  <p>${geosOk.length ? `Geos answering: ${esc(geosOk.map((g) => g.geo).join(', '))}.` : 'No geos answering.'}${at ? ` Updated ${esc(at)}.` : ''} <a href="${esc(ctx.href('/api/search-trends.json'))}">JSON</a> · <a href="${esc(ctx.href('/ai-prediction-markets.html'))}">AI prediction markets →</a></p>
  <h2>Which AI queries are in today’s firehose?</h2>
  ${cards}
  <h2>Which head terms already have a ${esc(brand.NAME)} page?</h2>
  <p>Terms ${brand.NAME} already has a crawlable answer for. A “Yes” means the phrase (or a close match) is inside today’s Google trending RSS.</p>
  ${watch}
  ${histBits}
  <h2>Where does longer-horizon search curiosity show up?</h2>
  <p>Interest-over-time for AI topics still comes from <a href="${esc(ctx.href('/methodology.html'))}">Wikipedia pageviews in the attention pillar</a> — Google’s explore API is not a stable keyless feed. This page is the spike detector; Wikipedia is the baseline.</p>
  <h2>FAQ</h2>
  ${faqHtml}
  <p style="font-size:12.5px">Source: <a href="https://trends.google.com/trending/rss" rel="noopener">trends.google.com/trending/rss</a>. Approximate traffic bands are Google’s. Not financial advice; not a ${esc(brand.NAME)} forecast.</p>
</section>`;

  const pageTitle = `Which Google Search Trends for AI does ${brand.NAME} watch?`;
  const jsonld = [
    organization(ctx),
    breadcrumbs(ctx, [{ name: pageTitle, path: '/search-trends.html' }]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: pageTitle,
      url: ctx.url('/search-trends.html'),
      dateModified: trends && trends.generated_at ? trends.generated_at : undefined,
      speakable: speakable(['.speakable-summary', '.speakable-lede']),
      isPartOf: { '@id': `${ctx.url('/')}#website` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return page({
    ctx,
    path: '/search-trends.html',
    title: pageTitle,
    description: 'Daily Google trending searches filtered for AI, plus the head terms SIREN already answers. Watched for findability; not scored into the index.',
    main,
    jsonld,
  });
}
