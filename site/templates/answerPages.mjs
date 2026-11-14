// Four US head-term answer pages (2026-11-14 keyword pull, US Google, monthly):
//   pentagon pizza index 40,500 (KD 6) · ai 2027 18,100 (KD 14)
//   ai takeover 5,400 (KD 2) · is ai a bubble 4,400 (KD 15)
// Each page answers the search in plain sentences with sources, then shows the
// live SIREN reading next to it, then the newsroom headlines that match. The
// sourced facts are hand-written and dated; the live numbers come from ctx.
// Voice: VOICE.md §3. No future tense, no probability claims about the index.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, webPage, faqPage } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

const CHECKED = '2026-11-14';

const a = (href, text) => `<a href="${esc(href)}" rel="noopener">${esc(text)}</a>`;

export const PAGES = {
  'pentagon-pizza-index': {
    h1: 'What is the Pentagon Pizza Index?',
    description: 'The Pentagon Pizza Index: where the idea came from, what the pizza trackers measure, what they get wrong, and how SIREN applies the same idea to AI with public counts.',
    rx: /\b(pentagon|pizza|defen[cs]e department|department of war|military)\b/i,
    newsWhat: 'the Pentagon or the military',
    sections: [
      ['Where did the Pentagon Pizza Index come from?',
        `<p>The idea traces to Frank Meeks, a Domino's franchise owner in the Washington area. He told reporters that late-night orders from the Pentagon, the CIA and the White House jumped before major events. The best-known claim: on 1 August 1990 the CIA ordered a one-night record of 21 pizzas, and Iraq invaded Kuwait the next day. Meeks also described surges before the Grenada and Panama invasions and during the 1998 Clinton impeachment fight. (${a('https://en.wikipedia.org/wiki/Pentagon_pizza_theory', 'Wikipedia: Pentagon pizza theory')}; ${a('https://moderndiplomacy.eu/2025/07/23/the-pentagon-pizza-index-as-a-case-study-in-low%e2%80%91tech-osint/', 'Modern Diplomacy')})</p>`],
      ['How is it tracked today?',
        `<p>Since 2024, accounts such as the Pentagon Pizza Report on X and the PizzINT dashboard read Google Maps "popular times" data for pizza shops near the Pentagon. On 12 June 2025 at 6:59 pm ET the account posted that nearly all nearby pizza places showed a surge; Israel struck Iran about an hour later. (${a('https://washingtonian.com/2025/06/26/did-busy-pizza-shops-really-predict-us-airstrikes-on-iran/', 'Washingtonian')}; ${a('https://www.aol.com/pentagon-pizza-account-reported-high-175215845.html', 'USA Today via AOL')})</p>`],
      ['Does it actually work?',
        `<p>Nobody has published a test of it. The famous cases are remembered because something followed; the busy nights with no event are not counted. Google's busyness figures are estimates from phone location data, a shop can be busy for ordinary reasons, and several outlets questioned the timeline the account gave for the June 2025 strikes. Treat it as a folk signal, not a measurement.</p>`],
      [`How does ${brand.NAME} apply the same idea to AI?`,
        `<p>${brand.NAME} borrows the format, a single public gauge built from things anyone can watch, and points it at AI instead of the Pentagon. The inputs are counts: papers on arXiv, model releases on Hugging Face, SEC filings, Federal Register rules and prediction-market prices. Every hourly reading is hash-chained, so anyone can re-check it. It measures how busy the AI world is, not what happens next. Side by side: <a href="/vs/pizzint.html">${esc(brand.NAME)} vs PizzINT</a>.</p>`],
    ],
    faq: [
      ['What is the Pentagon Pizza Index?', 'An informal idea that late-night pizza orders near the Pentagon jump before major military or political events. It started with stories from a Washington-area Domino\'s franchise owner, Frank Meeks, around 1990 and is now tracked with Google Maps busyness data.'],
      ['Is the Pentagon Pizza Index accurate?', 'It has never been tested. The cases people cite are the ones where something followed; busy nights with no event go uncounted, and Google\'s busyness data is an estimate.'],
    ],
  },

  'ai-takeover': {
    h1: 'Is an AI takeover happening? What has actually been measured',
    description: 'What "AI takeover" means, what AI researchers said when surveyed, and what SIREN\'s hourly count of AI activity shows right now. Measurements, not predictions.',
    rx: /\b(takeover|superintelligen\w+|agi|existential|extinction|rogue|loss of control|alignment)\b/i,
    newsWhat: 'takeover, superintelligence, AGI or alignment',
    sections: [
      ['What does "AI takeover" mean?',
        '<p>In AI safety writing, a takeover means AI systems ending up in control of decisions that matter, whether by being handed that control or by taking it, in a way people cannot reverse. It is a scenario people argue about, not an event anyone has observed.</p>'],
      ['What do AI researchers say about it?',
        `<p>The largest survey so far asked 2,778 researchers who publish at top AI venues in October 2023. The median answer gave a 5% chance that advanced AI leads to outcomes as bad as human extinction; the mean was 16%. Between 38% and 51% of respondents put that chance at 10% or more. Those are opinions collected in a survey, and the authors say they are not a reliable guide to the truth. (${a('https://www.jair.org/index.php/jair/article/download/19087/27230', 'Grace et al., Thousands of AI Authors on the Future of AI')}; ${a('https://wiki.aiimpacts.org/ai_timelines/predictions_of_human-level_ai_timelines/ai_timeline_surveys/2023_expert_survey_on_progress_in_ai', 'AI Impacts')})</p>`],
      ['What can actually be measured?',
        `<p>Activity. How many AI papers, model releases, data-centre deals, government rules and prediction-market moves happen, and whether that is more or less than usual. That is what ${esc(brand.NAME)} counts every hour. A busy hour is not a takeover; it is a busy hour. Other people's risk estimates are collected on the <a href="/vs/pdoom.html">p(doom) page</a>, kept separate from the count.</p>`],
    ],
    faq: [
      ['Is an AI takeover happening?', 'No one has observed one. It is a scenario debated in AI safety research. What can be measured is AI activity, which SIREN counts every hour.'],
      ['What do AI researchers think the risk is?', 'In a 2023 survey of 2,778 AI researchers, the median respondent gave a 5% chance of outcomes as bad as human extinction from advanced AI; the mean was 16%. These are opinions, not measurements.'],
    ],
  },

  'ai-2027': {
    h1: 'AI 2027: how does the scenario compare with what has been measured?',
    description: 'What the AI 2027 scenario said, how its authors have revised their dates since, and what SIREN\'s hourly AI activity count shows today.',
    rx: /\b(agi|superintelligen\w+|ai 2027|kokotajlo|automated research|ai researcher|coding agents?|intelligence explosion)\b/i,
    newsWhat: 'AGI, superintelligence or automated AI research',
    sections: [
      ['What is AI 2027?',
        `<p>AI 2027 is a month-by-month scenario published in April 2025 by the AI Futures Project, a group led by former OpenAI researcher Daniel Kokotajlo. It describes AI systems that automate coding and then AI research itself, and ends in two versions: a race and a slowdown. The authors called 2027 a central estimate, not a certainty. (${a('https://ai-2027.com/', 'ai-2027.com')}; ${a('https://www.astralcodexten.com/p/introducing-ai-2027', 'Introducing AI 2027')})</p>`],
      ['How have the authors revised it?',
        `<p>In early 2026 the group graded its own 2025 calls and put progress at roughly 58–66% of the scenario's pace on its quantitative measures, which pushed their dates later. On 10 November 2026 they moved earlier again: Kokotajlo's median date for a "superhuman AI researcher" went from December 2028 to May 2027, and the project's six forecasters gave medians between May and November 2027. (${a('https://ai2027-tracker.com/guides/ai-2027-vs-reality/', 'AI 2027 tracker')}; ${a('https://futuresearch.ai/blog/ai-2027-one-year-later/', 'FutureSearch')}; ${a('https://fourweekmba.com/ai-kokotajlo-pulls-forecast-19-months-on-anthropic-disclosures/', 'FourWeekMBA')})</p>`],
      [`What does ${brand.NAME} add?`,
        `<p>The scenario is a story about the future. ${esc(brand.NAME)} is a count of the present: AI papers, releases, compute and capital deals, rules and prediction-market moves, scored every hour against a fixed reference. It cannot say whether AI 2027 comes true. It can show whether the activity the scenario describes is speeding up or slowing down, hour by hour, with receipts.</p>`],
    ],
    faq: [
      ['What is AI 2027?', 'A scenario published in April 2025 by the AI Futures Project, led by Daniel Kokotajlo, describing AI that automates coding and then AI research, with a race ending and a slowdown ending.'],
      ['Have the AI 2027 authors changed their dates?', 'Yes, both ways. An early-2026 self-grading put progress at about 58–66% of the scenario\'s pace. A 10 November 2026 update moved Kokotajlo\'s median for a superhuman AI researcher to May 2027.'],
    ],
  },

  'is-ai-a-bubble': {
    h1: 'Is AI a bubble? The spending, the revenue and what SIREN measures',
    description: 'How much the big tech companies are spending on AI in 2026, how that compares with AI revenue, and what SIREN\'s Compute & Capital pillar shows this hour.',
    rx: /\b(bubble|capex|capital spending|valuation|data cent(er|re)s?|nvidia|hyperscalers?|funding round|ipo|debt)\b/i,
    newsWhat: 'AI spending, data centres, valuations or funding',
    pillar: 'compute',
    sections: [
      ['How much is being spent?',
        `<p>Microsoft, Amazon, Alphabet and Meta, plus Oracle, guided toward a combined $635–690 billion of capital spending for 2026, up 67–74% on 2025, with about three-quarters of it for AI infrastructure. Goldman Sachs put total AI capital spending near $765 billion for 2026, about 2.4% of US GDP. (${a('https://longyield.substack.com/p/the-ai-capex-boom-bubble-or-infrastructure', 'LongYield')}; ${a('https://www.fool.com/investing/2026/07/16/is-the-ai-infrastructure-build-out-a-bubble-heres/', 'Motley Fool')})</p>`],
      ['Why do people call it a bubble?',
        `<p>Spending is growing much faster than revenue. For the four largest cloud companies, 2026 plans implied capital spending growth around 80% against revenue growth around 15%. One estimate puts 2026 AI revenue at $80–120 billion against roughly $450 billion of AI capital spending, and the chips wear out within a few years. (${a('https://www.futuriom.com/articles/news/ctp-is-hyperscaler-ai-spending-sustainable/2026/04', 'Futuriom')}; ${a('https://philippdubach.com/posts/ai-capex-arms-race-who-blinks-first/', 'Philipp Dubach')})</p>`],
      ['Why do others say it is not?',
        '<p>The spenders are some of the most profitable companies in history and pay largely from cash flow, demand for computing still outruns supply, and AI revenue is growing quickly from a small base. A bubble is only certain in hindsight; the numbers above show the gap, not when or whether it closes.</p>'],
    ],
    faq: [
      ['Is AI a bubble?', 'It is disputed. In 2026 the largest tech companies planned roughly $635–690 billion of capital spending, mostly for AI, while AI revenue was a fraction of that. Critics call that gap a bubble; defenders point to profits, cash flow and demand.'],
      ['How much are tech companies spending on AI in 2026?', 'Microsoft, Amazon, Alphabet, Meta and Oracle guided toward a combined $635–690 billion of capital spending for 2026, about three-quarters of it for AI infrastructure.'],
    ],
  },
};

export const SLUGS = Object.keys(PAGES);
export const pathFor = (slug) => `/${slug}.html`;

function liveBlock(ctx, t) {
  const s = ctx.state;
  if (!s || !Number.isFinite(s.score)) return '';
  const pillars = Array.isArray(s.pillars) ? s.pillars.filter((p) => Number.isFinite(p.score)) : [];
  const focus = t.pillar ? pillars.find((p) => p.id === t.pillar) : null;
  const rows = pillars.map((p) => `<li${focus && p.id === focus.id ? ' class="ap__hot"' : ''}><b>${esc(p.name)}</b> ${num(p.score, 1)} of 100</li>`).join('');
  return `<section class="ap__live">
  <h2>What does ${esc(brand.NAME)} read right now?</h2>
  <p class="ap__big">${num(s.score, 1)} <small>of 100 · level ${esc(s.level)} (${esc(s.level_name)}) · ${esc(utc(s.generated_at))}</small></p>
  ${focus ? `<p>${esc(focus.name)}, the pillar that counts spending, chips and deals, reads ${num(focus.score, 1)} of 100.</p>` : ''}
  <ul class="ap__pillars">${rows}</ul>
  <p>This is a count of AI activity against a fixed reference, not a probability and not a prediction. <a href="/methodology.html">How is it computed?</a> · <a href="/">Live gauge</a></p>
</section>`;
}

function newsBlock(ctx, t) {
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
  const hits = items.filter((i) => t.rx.test(String(i.title || ''))).slice(0, 8);
  if (!hits.length) return '';
  const li = hits.map((i) => `<li><a href="${esc(ctx.href(`/item/${slugFor(i)}.html`))}">${esc(i.title)}</a> <small>${esc(utc(i.published_at))}</small></li>`).join('');
  return `<section><h2>Which newsroom headlines mention this now?</h2>
  <p>${hits.length} recent headlines about ${esc(t.newsWhat)}, matched by keyword, so read before trusting the match.</p>
  <ul>${li}</ul></section>`;
}

export function render(ctx, slug) {
  const t = PAGES[slug];
  const path = pathFor(slug);
  const sections = t.sections.map(([q, body]) => `<section><h2>${esc(q)}</h2>${body}</section>`).join('\n');
  const faq = t.faq.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('');
  const others = SLUGS.filter((s) => s !== slug).map((s) => `<li><a href="${esc(ctx.href(pathFor(s)))}">${esc(PAGES[s].h1)}</a></li>`).join('');
  const main = `<style>.ap{max-width:780px}.ap__live{border:1px solid var(--rule);border-radius:10px;padding:14px 16px;margin:20px 0}.ap__big{font:800 40px/1.1 var(--mono);margin:6px 0}.ap__big small{font:600 13px var(--sans);color:var(--ink-dim)}.ap__pillars{display:flex;flex-wrap:wrap;gap:6px 16px;list-style:none;padding:0}.ap__hot{color:#F87171}</style>
<article class="lore ap">
  <h1>${esc(t.h1)}</h1>
  <p class="lede">${esc(t.description)}</p>
  ${sections}
  ${liveBlock(ctx, t)}
  ${newsBlock(ctx, t)}
  <section><h2>Quick answers</h2>${faq}</section>
  <p><small>Sourced facts checked ${CHECKED}. ${esc(brand.DISCLAIMER)}</small></p>
  <nav><h2>Related questions</h2><ul>${others}</ul></nav>
</article>
`;
  return page({
    ctx,
    path,
    title: `${t.h1} · ${brand.NAME}`,
    ogTitle: t.h1,
    description: t.description,
    ogType: 'article',
    jsonld: [
      webPage(ctx, { path, name: t.h1, description: t.description, dateModified: ctx.state && ctx.state.generated_at }),
      breadcrumbs(ctx, [{ name: 'Home', path: '/' }, { name: t.h1, path }]),
      faqPage(t.faq),
    ],
    main,
  });
}

export function sitemapEntries(ctx) {
  const last = ctx.state && ctx.state.generated_at;
  return SLUGS.map((s) => ({ loc: pathFor(s), changefreq: 'daily', priority: '0.8', lastmod: last }));
}
