// TWO QUESTIONS EVERYONE ASKS: is AI taking jobs, and is AI curing anything.
// Both pages are views of data/ledger.json, the hand-verified register behind
// /balance, filtered to one subject, plus the newsroom headlines that mention
// it. Nothing here is new data and nothing is a forecast: each entry prints
// what was MEASURED, what is CLAIMED on the back of it, and the caveat, in the
// ledger's own words. Harm-side and benefit-side entries keep their own status
// words and are never added together.
//
// Deterministic: no clock, no randomness; the stamps are the ledger's own.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { mascot } from './_mascot.mjs';

const N = (n) => Number(n).toLocaleString('en-US');

export const TOPICS = {
  jobs: {
    path: '/jobs.html',
    leadId: 'challenger-ai-cited-cuts',
    eyebrow: 'Jobs · a view of the registers · does not feed the main number',
    h1: 'AI and jobs: what has been measured',
    lede: 'Everybody has a forecast for what AI does to work. This page has no forecast. It lists what has been counted so far, who counted it, and what the count does not show.',
    pick: (e) => /labou?r|jobs|employment|work/i.test(String(e.domain)),
    rx: /\b(layoffs?|laid off|job cuts?|jobs?|hiring|workforce|unemployment|redundanc\w+|headcount)\b/i,
    what: 'jobs, layoffs, hiring or the workforce',
    title: `AI and jobs: what has actually been measured · ${brand.NAME}`,
    description: 'Announced job cuts that cite AI, and measured effects on freelancers, with sources and caveats. Counts on the record, not forecasts.',
    not: 'A count of announced cuts is not a count of jobs lost to AI, and none of these entries says what happens next.',
  },
  medicine: {
    path: '/medicine.html',
    leadId: 'fda-ai-devices',
    eyebrow: 'Medicine · a view of the registers · does not feed the main number',
    h1: 'AI in medicine: results on the record',
    lede: 'Breakthrough is a headline word. This page lists the medical results that have a trial, an authorisation list or a database behind them, with what each one does and does not show.',
    pick: (e) => /drug|medical|protein|clinic|health/i.test(String(e.domain)) || e.id === 'co-scientist',
    rx: /\b(drugs?|cancer|clinical|FDA|medical|medicine|patients?|diseases?|therap\w+|biotech|hospitals?|vaccines?)\b/i,
    what: 'drugs, patients, trials or medicine',
    title: `AI in medicine: trial results, approvals and what they show · ${brand.NAME}`,
    description: 'AI-designed drugs in trials, FDA-authorised AI devices, screening trials and AlphaFold, each with its numbers, sources and caveats.',
    not: 'An authorisation is not a measured patient benefit, a Phase 2 result is not an approval, and a structure prediction is not a drug.',
  },
};

export function entries(ctx, key) {
  const L = ctx.ledger;
  if (!L || !Array.isArray(L.benefit) || !Array.isArray(L.harm)) return [];
  const t = TOPICS[key];
  return [...L.benefit, ...L.harm].filter(t.pick);
}

export function hasTopic(ctx, key) { return entries(ctx, key).length > 0; }

/** The lead figure of a topic, for the home page and the nav tile. */
export function lead(ctx, key) {
  const all = entries(ctx, key);
  const e = all.find((x) => x.id === TOPICS[key].leadId) || all[0];
  const n = e && Array.isArray(e.numbers) ? e.numbers[0] : null;
  return n ? { value: String(n.value), unit: String(n.unit), date: String(n.date), id: e.id, title: e.title } : null;
}

function entry(ctx, e, glosses, t) {
  const nums = (Array.isArray(e.numbers) ? e.numbers : []).map((n) => `<li><b class="num">${esc(n.value)}</b> <span>${esc(n.unit)}</span> <a href="${esc(n.source_url)}" rel="noopener">${esc(n.date)}</a></li>`).join('');
  const srcs = (Array.isArray(e.sources) ? e.sources : []).map((u, i) => `<a href="${esc(u)}" rel="noopener" title="${esc(u)}">${i + 1}</a>`).join(' ');
  const gloss = glosses && glosses[e.side] && glosses[e.side][e.status];
  const first = Array.isArray(e.numbers) && e.numbers[0];
  const line = first ? `${first.value} ${first.unit} (${first.date}). ${e.title}` : e.title;
  return `<article class="tp__e" id="${esc(e.id)}" data-side="${esc(e.side)}">
    <p class="tp__chips"><span class="tp__chip"${gloss ? ` title="${esc(gloss)}"` : ''}>${esc(e.status)}</span><span class="tp__chip tp__chip--q">${esc(e.domain)}</span><span class="tp__asof">checked ${esc(e.as_of)}</span></p>
    <h2 class="tp__h">${esc(e.title)}</h2>
    ${nums ? `<ul class="tp__nums">${nums}</ul>` : ''}
    <h3 class="tp__k">What is measured</h3><p>${esc(e.what_is_measured)}</p>
    <h3 class="tp__k">What gets claimed</h3><p>${esc(e.what_is_claimed)}</p>
    <h3 class="tp__k">The caveat</h3><p>${esc(e.caveat)}</p>
    <p class="tp__f">Sources ${srcs} · <a class="tp__x" rel="noopener" target="_blank" href="https://x.com/intent/post?text=${encodeURIComponent(line.slice(0, 230))}&amp;url=${encodeURIComponent(ctx.url(`${t.path}#${e.id}`))}">Post this on X</a> ·
      <a href="${esc(ctx.href(`/balance.html#reg-${e.id}`))}">In the register →</a></p>
  </article>`;
}

export function render(ctx, key) {
  const t = TOPICS[key];
  const list = entries(ctx, key);
  const L = ctx.ledger;
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
  const hits = items.filter((i) => t.rx.test(String(i.title || '')));
  const at = ctx.news && ctx.news.generated_at ? utc(ctx.news.generated_at) : null;
  const level = ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null;
  const other = key === 'jobs' ? TOPICS.medicine : TOPICS.jobs;

  const main = `
<style>
.tp { max-width: 82ch; }
.tp__top { display: flex; align-items: center; gap: var(--s-4); margin: var(--s-4) 0 var(--s-3); }
.tp__top h1 { margin: 0; }
.tp__e { margin: var(--s-5) 0; padding: var(--s-4); border: 1px solid var(--rule); border-left: 6px solid var(--accent); border-radius: 8px; background: var(--bg-sunken); }
.tp__e[data-side="benefit"] { border-left-color: var(--ok); }
.tp__e[data-side="harm"] { border-left-color: var(--dark-src); }
.tp__chips { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; margin: 0 0 var(--s-2); font: 600 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
.tp__chip { padding: 4px 7px; border: 1px solid currentColor; border-radius: 4px; color: var(--ink); }
.tp__chip--q, .tp__asof { color: var(--ink-dim); }
.tp__h { margin: 0 0 var(--s-3); font: 650 var(--t-lg, 20px)/1.25 var(--sans); color: var(--ink); }
.tp__nums { list-style: none; margin: 0 0 var(--s-3); padding: 0; display: grid; gap: 6px; }
.tp__nums li { font: 400 var(--t-sm)/1.4 var(--sans); color: var(--ink-dim); overflow-wrap: anywhere; }
.tp__nums b { font: 400 clamp(26px, 5vw, 38px)/1 var(--poster); color: var(--ink); margin-right: 6px; }
.tp__k { margin: var(--s-3) 0 2px; font: 700 var(--t-xs)/1.2 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
.tp__e p { margin: 0 0 var(--s-2); font: 400 var(--t-base)/1.6 var(--sans); color: var(--ink-dim); }
.tp__f { font-size: var(--t-sm) !important; overflow-wrap: anywhere; }
.tp__news { list-style: none; margin: var(--s-3) 0; padding: 0; display: grid; gap: 8px; }
.tp__news li { font: 400 var(--t-base)/1.45 var(--sans); color: var(--ink-dim); }
.tp__news small { font: 500 var(--t-2xs)/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); margin-left: 6px; }
.tp__sec { margin: var(--s-6, 40px) 0 var(--s-2); }
</style>
<section class="tp">
  <p class="eyebrow">${esc(t.eyebrow)}</p>
  <div class="tp__top">${mascot({ size: 76, level })}<h1 class="bp__h1">${esc(t.h1)}</h1></div>
  <p class="lede">${esc(t.lede)}</p>
  <p class="fresh__key">${esc(N(list.length))} ${list.length === 1 ? 'entry' : 'entries'} from the hand-verified registers${L && L.as_of_date ? `, checked as of ${esc(L.as_of_date)}` : ''}.
    ${esc(t.not)}</p>
${list.map((e) => entry(ctx, e, L && L.status_words, t)).join('\n')}
  <h2 class="sec__h tp__sec" id="in-the-news">In the newsroom now</h2>
  <p class="fresh__key"><b>${esc(N(hits.length))} of ${esc(N(items.length))}</b> headlines in the newsroom window mention ${esc(t.what)}${at ? `, as of ${esc(at)}` : ''}.
    Matched by word, so read them before trusting the count.</p>
  ${hits.length ? `<ul class="tp__news">${hits.slice(0, 12).map((i) => `<li><a href="${esc(i.url)}" rel="noopener">${esc(i.title)}</a><small>${esc(i.source)} · ${esc(String(i.published_at).slice(0, 10))}</small></li>`).join('')}</ul>` : ''}
  <p><a href="${esc(ctx.href(other.path))}">${esc(other.h1)} →</a> · <a href="${esc(ctx.href('/balance.html'))}">Every register entry, both sides →</a> · <a href="${esc(ctx.href('/library.html'))}">Books on the argument (paid links) →</a>${brand.X_URL ? ` · <a href="https://x.com/intent/follow?screen_name=${esc(brand.X_HANDLE.replace(/^@/, ''))}" rel="noopener">Follow ${esc(brand.X_HANDLE)} for updates to these numbers →</a>` : ''}</p>
</section>`;

  return page({ ctx, path: t.path, title: t.title, description: t.description, main });
}

/** The home-page pair: one card per question, each with its lead figure. */
export function homeCards(ctx) {
  const cards = ['jobs', 'medicine'].filter((k) => hasTopic(ctx, k)).map((k) => {
    const t = TOPICS[k]; const l = lead(ctx, k);
    const q = k === 'jobs' ? 'Is AI taking jobs?' : 'Is AI curing anything?';
    return `<a class="tq__c tq__c--ph" href="${esc(ctx.href(t.path))}" style="--ph:url('${esc(ctx.href(`/img/page-${k}.jpg`))}');--ph-set:image-set(url('${esc(ctx.href(`/img/page-${k}.avif`))}') type('image/avif'), url('${esc(ctx.href(`/img/page-${k}.jpg`))}') type('image/jpeg'))">
      <span class="tq__q">${esc(q)}</span>
      ${l ? `<b class="tq__n num">${esc(l.value)}</b><span class="tq__u">${esc(l.unit)} · ${esc(l.date)}</span>` : ''}
      <span class="tq__to">${esc(N(entries(ctx, k).length))} results on the record, with caveats →</span>
    </a>`;
  });
  if (!cards.length) return '';
  return `<section class="sec tq" id="two-questions" aria-labelledby="tq-h">
  <h2 class="sec__h" id="tq-h">The two questions everyone asks</h2>
  <div class="tq__l">${cards.join('')}</div>
  <p class="fresh__key">The pictures on these cards are generated illustrations. The numbers are not.</p>
</section>`;
}

export function topicCss() {
  return `
.tq__l { display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); }
.tq__c { display: grid; gap: 6px; padding: var(--s-4); border: 1px solid var(--rule); border-top: 6px solid var(--lvl, var(--accent)); border-radius: 8px;
  background: var(--bg-sunken); text-decoration: none; color: var(--ink); }
.tq__c:hover, .tq__c:focus-visible { border-color: var(--lvl, var(--accent)); }
.tq__c--ph { position: relative; isolation: isolate; min-height: clamp(220px, 30vw, 340px); align-content: end; overflow: hidden; border: 0; border-radius: 16px;
  --ink: #eef0f4; --ink-dim: #b3bac4; color: #eef0f4; background: #06070b; }
.tq__c--ph::before { content: ""; position: absolute; inset: 0; z-index: -2; background: var(--ph) center / cover no-repeat; transition: transform .6s ease; }
@supports (background-image: image-set(url("a.avif") type("image/avif"))) { .tq__c--ph::before { background-image: var(--ph-set); } }
.tq__c--ph::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(0deg, rgba(6,7,11,.94) 8%, rgba(6,7,11,.35) 70%, rgba(6,7,11,.1)); }
@media (prefers-reduced-motion: no-preference) { .tq__c--ph:hover::before { transform: scale(1.04); } }
.tq__q { font: 400 clamp(26px, 4vw, 38px)/1.02 var(--poster); text-transform: uppercase; letter-spacing: .012em; }
.tq__n { font: 400 clamp(40px, 7vw, 64px)/1 var(--poster); color: var(--lvl, var(--accent)); }
.tq__u { font: 500 var(--t-xs)/1.45 var(--mono); letter-spacing: .04em; color: var(--ink-dim); }
.tq__to { margin-top: 6px; font: 700 var(--t-xs)/1.2 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-dim); }
`;
}
