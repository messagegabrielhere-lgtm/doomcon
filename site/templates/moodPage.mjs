// /mood.html — headline tone for the companies the newsroom already names.
// Reads data/mood.json (collector/mood.mjs). Deterministic HTML; no scripts.

import { esc, utc, num } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/mood.html';

export function hasMood(ctx) {
  return Boolean(ctx && ctx.mood && Array.isArray(ctx.mood.companies));
}

export function render(ctx) {
  if (!hasMood(ctx)) return emptyPage(ctx);
  const m = ctx.mood;
  const g = m.glance || {};
  const ranked = Array.isArray(m.ranked) ? m.ranked : [];
  const companies = Array.isArray(m.companies) ? m.companies : [];

  const main = `<style>${css()}</style>
<section class="md__intro">
  <p class="eyebrow">Market mood · headline tone</p>
  <h1 class="md__h1">How today's headlines treat each major AI company</h1>
  <p class="lede">${esc(m.totals.headlines_naming_a_company)} headlines in the newsroom window named a roster company
     across ${esc(m.totals.companies_with_headlines)} of ${esc(m.totals.companies_on_roster)} tracked firms,
     compiled ${esc(utc(m.generated_at))}. The index is headline tone from fixed word lists — not company performance.</p>
  ${glance(g, m)}
</section>

<section class="md__board" aria-labelledby="md-board-h">
  <h2 id="md-board-h">The board</h2>
  <p class="md__note">0 means the company was mentioned but no scoring term matched — neutral, not missing.
     A company with no headlines this window is listed below the board, not as zero.</p>
  <ol class="md__list">${ranked.map((c) => companyRow(ctx, c)).join('')}</ol>
</section>

${quietSection(companies)}
${howSection(m)}
${lexiconSection(m)}
<p class="md__foot">JSON: <a href="${esc(ctx.href('/api/mood.json'))}"><code>/api/mood.json</code></a>.
   Lexicon version ${esc(m.lexicon_version)} · scorer ${esc(m.version)}.</p>`;

  return page({
    ctx,
    path: PATH,
    title: `AI market mood — headline tone by company · ${brand.NAME}`,
    description: metaDesc(m, g),
    main,
    jsonld: [datasetLd(ctx, m)],
  });
}

function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `Market mood · ${brand.NAME}`,
    description: 'Headline tone by company. Waiting for data/mood.json.',
    main: `<section><h1>Market mood</h1><p class="lede">No mood file in this build. Run <code>node collector/mood.mjs</code> after the newsroom.</p></section>`,
  });
}

function glance(g, m) {
  const cells = [];
  if (g.leading) {
    cells.push(`<div class="md__g"><span class="md__gk">Leading tone</span><b>${esc(g.leading.name)}</b><span class="md__gv md__pos">${fmtIndex(g.leading.index)}</span></div>`);
  }
  if (g.trailing) {
    cells.push(`<div class="md__g"><span class="md__gk">Under pressure</span><b>${esc(g.trailing.name)}</b><span class="md__gv md__neg">${fmtIndex(g.trailing.index)}</span></div>`);
  }
  if (g.most_discussed) {
    cells.push(`<div class="md__g"><span class="md__gk">Most discussed</span><b>${esc(g.most_discussed.name)}</b><span class="md__gv">${esc(g.most_discussed.headlines)} headlines</span></div>`);
  }
  if (Number.isFinite(m.totals?.negative_pair_share)) {
    cells.push(`<div class="md__g"><span class="md__gk">Negative wording</span><b>${num(m.totals.negative_pair_share * 100, 0)}%</b><span class="md__gv">of company–headline pairs</span></div>`);
  }
  return cells.length ? `<div class="md__glance">${cells.join('')}</div>` : '';
}

function companyRow(ctx, c) {
  const bar = toneBar(c.index);
  const samples = (c.sample || []).slice(0, 3).map((h) => {
    const why = hitWhy(h);
    const link = h.url
      ? `<a href="${esc(h.url)}" rel="noopener">${esc(h.title)}</a>`
      : esc(h.title);
    return `<li>${link}${why ? `<span class="md__why">${esc(why)}</span>` : ''}</li>`;
  }).join('');
  return `<li class="md__co">
    <div class="md__co__h">
      <span class="md__name">${esc(c.name)}</span>
      <span class="md__idx ${c.index > 0 ? 'md__pos' : c.index < 0 ? 'md__neg' : ''}">${fmtIndex(c.index)}</span>
      <span class="md__n">${esc(c.headlines)} headline${c.headlines === 1 ? '' : 's'}</span>
    </div>
    ${bar}
    ${samples ? `<ul class="md__samples">${samples}</ul>` : ''}
  </li>`;
}

function quietSection(companies) {
  const quiet = companies.filter((c) => c.index === null);
  if (!quiet.length) return '';
  return `<section class="md__quiet" aria-labelledby="md-quiet-h">
    <h2 id="md-quiet-h">Not named this window</h2>
    <p>${quiet.map((c) => esc(c.name)).join(' · ')}. Absence is not a score of zero.</p>
  </section>`;
}

function howSection(m) {
  const r = m.rule || {};
  return `<section class="md__how" aria-labelledby="md-how-h">
    <h2 id="md-how-h">How this number is calculated</h2>
    <p>${esc(r.statement || '')}</p>
    <p>It matches words, not meaning. Read it as headline tone, not company performance.
       ${esc(r.zero_means || '')} ${esc(r.null_means || '')}</p>
  </section>`;
}

function lexiconSection(m) {
  const lx = m.lexicons || {};
  const block = (title, words) => `<details class="md__lex"><summary>${esc(title)} (${(words || []).length})</summary>
    <p class="md__lex__list">${(words || []).map(esc).join(', ')}</p></details>`;
  return `<section class="md__lexes" aria-labelledby="md-lex-h">
    <h2 id="md-lex-h">The lexicons in full</h2>
    ${block('Positive', lx.positive)}
    ${block('Negative', lx.negative)}
    ${block('Clickbait', lx.clickbait)}
  </section>`;
}

function hitWhy(h) {
  const bits = [];
  if (h.positive?.length) bits.push(`up on “${h.positive.slice(0, 2).join('”, “')}”`);
  if (h.negative?.length) bits.push(`down on “${h.negative.slice(0, 2).join('”, “')}”`);
  if (h.clickbait?.length) bits.push('clickbait phrasing');
  return bits.length ? `Scored ${bits.join('; ')}` : '';
}

function fmtIndex(v) {
  if (!Number.isFinite(v)) return '—';
  return v > 0 ? `+${num(v, 0)}` : String(num(v, 0));
}

function toneBar(index) {
  if (!Number.isFinite(index)) return '';
  const clamped = Math.max(-100, Math.min(100, index));
  const pct = ((clamped + 100) / 200) * 100;
  return `<div class="md__bar" role="img" aria-label="tone ${fmtIndex(index)} on a -100 to 100 scale">
    <i style="left:${pct.toFixed(1)}%"></i>
  </div>`;
}

function metaDesc(m, g) {
  const parts = [`Headline tone for ${m.totals.companies_with_headlines} AI companies from ${m.totals.headlines_naming_a_company} headlines.`];
  if (g.leading) parts.push(`Leading: ${g.leading.name} ${fmtIndex(g.leading.index)}.`);
  if (g.trailing) parts.push(`Trailing: ${g.trailing.name} ${fmtIndex(g.trailing.index)}.`);
  return parts.join(' ');
}

function datasetLd(ctx, m) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} market mood`,
    description: 'Headline-tone index per AI company from fixed word lists applied to the newsroom window.',
    url: ctx.url(PATH),
    dateModified: m.generated_at,
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/mood.json') },
  };
}

function css() {
  return `
.md__intro{max-width:720px}
.md__h1{font:700 clamp(1.6rem,3vw,2.2rem)/1.15 var(--sans);margin:0 0 12px;color:var(--ink)}
.md__glance{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:18px 0 8px}
.md__g{border:1px solid var(--rule);padding:12px 14px;background:var(--bg-raised,#0E131D)}
.md__gk{display:block;font:600 11px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint,#6B7686);margin-bottom:6px}
.md__g b{display:block;font:700 1.05rem/1.2 var(--sans);color:var(--ink)}
.md__gv{font:500 13px/1.3 var(--mono);color:var(--ink-dim)}
.md__pos{color:#4ADE80}.md__neg{color:#F87171}
.md__board,.md__quiet,.md__how,.md__lexes{margin:36px 0;max-width:820px}
.md__note,.md__how p,.md__quiet p{color:var(--ink-dim);line-height:1.55}
.md__list{list-style:none;margin:0;padding:0}
.md__co{padding:16px 0;border-bottom:1px solid var(--rule)}
.md__co__h{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:baseline}
.md__name{font:700 1.05rem/1.2 var(--sans);color:var(--ink)}
.md__idx{font:700 1.1rem/1 var(--mono)}
.md__n{font:500 12px/1 var(--mono);color:var(--ink-faint,#6B7686)}
.md__bar{position:relative;height:6px;margin:10px 0 8px;background:linear-gradient(90deg,#F87171,#6B7686,#4ADE80);border-radius:2px}
.md__bar i{position:absolute;top:-3px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:var(--ink);border:2px solid var(--bg,#070A12)}
.md__samples{margin:8px 0 0;padding:0;list-style:none}
.md__samples li{font-size:14px;line-height:1.45;margin:6px 0;color:var(--ink-dim)}
.md__samples a{color:var(--ink)}
.md__why{display:block;font:500 12px/1.35 var(--mono);color:var(--ink-faint,#6B7686);margin-top:2px}
.md__lex{border:1px solid var(--rule);padding:10px 12px;margin:8px 0}
.md__lex__list{font:500 13px/1.5 var(--mono);color:var(--ink-dim);margin:8px 0 0}
.md__foot{font:500 13px/1.4 var(--mono);color:var(--ink-faint,#6B7686);margin:28px 0}
`;
}
