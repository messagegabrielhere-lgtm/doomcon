// One permanent page per index move. This is the long tail: pizzint's sitemap
// holds 1,018 URLs and 997 of them are auto-generated briefs. The dashboard
// everybody talks about is one URL, and one URL cannot rank for a category.
//
// The anti-thin-content decision: we mint a page for EVERY receipt, because a
// permanent record is the product and a URL that 404s later is a broken
// promise. But only substantive moves go in sitemap.xml and the feed; the rest
// carry noindex,follow. A few thousand near-identical "score moved 0.1" pages
// is how a site earns a thin-content problem instead of a long tail.

import { esc, num, signed, utc, utcDay } from './_html.mjs';
import { levelBars } from './_parts.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

// Fallbacks only. A reading that carries meta.url wins, always - the adapter
// knows exactly which endpoint it read and this map does not. Anything absent
// from both renders as plain text rather than as a guessed link.
const SOURCE_LINKS = {
  arxiv: 'https://arxiv.org/list/cs.AI/recent',
  huggingface: 'https://huggingface.co/models',
  openrouter: 'https://openrouter.ai/models',
  epoch: 'https://epoch.ai/data/notable-ai-models',
  'hacker-news': 'https://news.ycombinator.com/',
  wikipedia: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  'federal-register': 'https://www.federalregister.gov/',
  'gov-uk': 'https://www.gov.uk/search/all?keywords=artificial+intelligence',
  polymarket: 'https://polymarket.com/',
  manifold: 'https://manifold.markets/',
  kalshi: 'https://kalshi.com/',
  'sec-edgar': 'https://efts.sec.gov/LATEST/search-index?q=%22artificial+intelligence%22',
  'vast-ai': 'https://vast.ai/',
  'aws-spot': 'https://aws.amazon.com/ec2/spot/',
};

export function render(ctx, move) {
  const r = move.receipt;
  const levelChanged = move.level_changed;
  const headline = levelChanged
    ? `${brand.NAME} ${move.previous_level} → ${brand.NAME} ${move.level}: ${move.level_name}`
    : `${brand.NAME} ${move.level} holds at ${num(move.score, 1)}`;

  const main = `
<article class="prose">
  <p class="eyebrow"><a href="${esc(ctx.href('/moves/'))}">Index moves</a> · ${esc(utcDay(move.generated_at))}</p>
  <h1>${esc(headline)}</h1>
  <p class="lede">Observed <time datetime="${esc(move.generated_at)}">${esc(utc(move.generated_at))}</time>.
     ${esc(rationale(move))}</p>

  <div class="movehead">
    <div class="movehead__nums">
      <span class="movehead__from num">${esc(num(move.previous_score, 1))}</span>
      <span class="movehead__arrow" aria-hidden="true">→</span>
      <span class="movehead__to num">${esc(num(move.score, 1))}</span>
      <span class="movehead__delta num">${esc(signed(move.delta, 1))}</span>
    </div>
    <div class="level" style="gap:12px">
      <div class="level__digit num" style="font-size:3.2rem" aria-hidden="true">${esc(move.level)}</div>
      <div class="level__meta">
        <p class="level__name" style="font-size:1rem">${esc(brand.NAME)} ${esc(move.level)} · ${esc(move.level_name)}</p>
        ${levelBars(move.level)}
      </div>
    </div>
  </div>

  <div class="kv">
    ${row('Observed at', `<time datetime="${esc(move.generated_at)}">${esc(utc(move.generated_at))}</time>`)}
    ${row('Prior score', `<span class="num">${esc(num(move.previous_score, 1))}</span>`)}
    ${row('New score', `<span class="num">${esc(num(move.score, 1))}</span>`)}
    ${row('Change', `<span class="num">${esc(signed(move.delta, 1))}</span>`)}
    ${row('Level', levelChanged
      ? `${esc(brand.NAME)} ${esc(move.previous_level)} → ${esc(brand.NAME)} ${esc(move.level)} (${esc(move.level_name)})`
      : `${esc(brand.NAME)} ${esc(move.level)} (${esc(move.level_name)}), unchanged`)}
    ${row('Anti-flap rule', `<code>${esc(r.rule_fired ?? 'none')}</code>`)}
    ${row('Engine version', `<code>${esc(r.engine_version ?? 'unrecorded')}</code>`)}
  </div>

  <h2 id="pillars">Pillars at this observation</h2>
  ${pillarTable(r)}

  <h2 id="inputs">Inputs</h2>
  <p>Every reading the engine saw, exactly as fetched. Dark sources are listed as dark and were
     excluded from the arithmetic; none of them was imputed or treated as zero.</p>
  ${inputList(r)}

  <h2 id="receipt">Receipt</h2>
  <p>This observation is sealed into an append-only hash chain. The hash below is the SHA-256 of
     this receipt’s canonical JSON with the hash field removed; <code>prev_hash</code> is the
     previous receipt’s hash. Change any input after the fact and every subsequent hash breaks.</p>
  <div class="kv">
    ${row('Receipt id', `<code>${esc(r.id)}</code>`)}
    ${row('Hash', `<span class="hash">${esc(r.hash ?? 'unrecorded')}</span>`)}
    ${row('Previous hash', `<span class="hash">${esc(r.prev_hash ?? 'unrecorded')}</span>`)}
    ${row('Raw receipt', `<a href="${esc(ctx.href(`/api/receipts/${r.id}.json`))}">api/receipts/${esc(r.id)}.json</a>`)}
  </div>

  <p class="fresh__key" style="margin-top:22px">
    ${move.newer ? `<a href="${esc(ctx.href(`/moves/${move.newer}.html`))}">← Newer observation</a>` : ''}
    ${move.newer && move.older ? ' · ' : ''}
    ${move.older ? `<a href="${esc(ctx.href(`/moves/${move.older}.html`))}">Older observation →</a>` : ''}
  </p>
</article>
`;

  return page({
    ctx,
    path: `/moves/${move.id}.html`,
    title: `${headline} — ${utc(move.generated_at)} · ${brand.NAME}`,
    description:
      `${brand.NAME} moved from ${num(move.previous_score, 1)} to ${num(move.score, 1)} ` +
      `(${signed(move.delta, 1)}) at ${utc(move.generated_at)}. ${rationale(move)}`,
    ogType: 'article',
    ogImage: ctx.cardFor(move.id),
    ogImageAlt: `${brand.NAME} ${move.level}, ${move.level_name}, score ${num(move.score, 1)} of 100`,
    noindex: !move.indexable,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline,
      datePublished: move.generated_at,
      dateModified: move.generated_at,
      url: ctx.url(`/moves/${move.id}.html`),
      articleSection: 'Index moves',
      isAccessibleForFree: true,
      author: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
      publisher: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
      license: 'https://creativecommons.org/licenses/by/4.0/',
      description: rationale(move),
    }],
    main,
  });
}

function row(k, v) {
  return `<div class="kv__row"><div class="kv__k">${esc(k)}</div><div class="kv__v">${v}</div></div>`;
}

/**
 * Scoring rationale in plain English, derived entirely from the receipt. It
 * never speculates about causes - it reports which pillar moved and which rule
 * the state machine applied. No future tense: CONTRACT.md bans it in generated
 * copy and the ban is worth honouring on the site as well as in posts.
 */
function rationale(move) {
  const parts = [];
  const dir = move.delta > 0 ? 'rose' : move.delta < 0 ? 'fell' : 'held';
  parts.push(move.delta === 0
    ? `The composite held at ${num(move.score, 1)}.`
    : `The composite ${dir} ${Math.abs(move.delta).toFixed(1)} points to ${num(move.score, 1)} of 100.`);

  if (move.leadPillar) {
    parts.push(`${brand.pillarMeta(move.leadPillar.id).name} was the highest-scoring live pillar at ${num(move.leadPillar.score, 1)}.`);
  }
  if (move.darkPillars && move.darkPillars.length) {
    parts.push(`${move.darkPillars.map((id) => brand.pillarMeta(id).name).join(' and ')} reported dark and ${move.darkPillars.length === 1 ? 'was' : 'were'} excluded; the level is frozen while any pillar is dark.`);
  }
  if (move.level_changed) {
    parts.push(`The level stepped to ${brand.NAME} ${move.level}, ${move.level_name}.`);
  } else {
    const rule = move.receipt.rule_fired;
    parts.push(rule && rule !== 'none'
      ? `The level did not change: the ${String(rule).replace(/_/g, ' ')} rule held it.`
      : `The level did not change and no anti-flap rule was triggered.`);
  }
  return parts.join(' ');
}

function pillarTable(receipt) {
  const rows = Array.isArray(receipt.pillars) ? receipt.pillars : [];
  if (!rows.length) return '<p>No pillar breakdown was recorded in this receipt.</p>';
  const body = rows.map((p) => {
    const m = brand.pillarMeta(p.id);
    const score = p.dark ? 'dark' : p.uncalibrated ? 'no baseline' : num(p.score, 1);
    const src = p.dark
      ? `0 / ${esc(p.sources_total ?? '?')}`
      : `${esc(p.sources_ok ?? '?')} / ${esc(p.sources_total ?? '?')}`;
    return `<tr><td>${esc(m.name)}</td><td class="num">${esc(score)}</td><td class="num">${src}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Pillar</th><th>Score</th><th>Live sources</th></tr></thead><tbody>${body}</tbody></table>`;
}

function inputList(receipt) {
  const inputs = Array.isArray(receipt.inputs) ? receipt.inputs : [];
  if (!inputs.length) return '<p>No input readings were recorded in this receipt.</p>';
  const items = inputs.map((r) => {
    const href = (r.meta && typeof r.meta.url === 'string' && /^https?:\/\//.test(r.meta.url))
      ? r.meta.url
      : SOURCE_LINKS[r.id] || SOURCE_LINKS[r.source] || null;
    const id = r.source ?? r.id ?? 'unknown';
    const name = href ? `<a href="${esc(href)}" rel="noopener">${esc(id)}</a>` : esc(id);
    const value = r.ok
      ? `<span class="num">${esc(Number.isFinite(r.value) ? r.value : String(r.value))}</span>` +
        (r.unit ? ` <span class="num">${esc(r.unit)}</span>` : '')
      : `<span class="num">dark · ${esc(r.error || 'no reading')}</span>`;
    return `<li>${name} <span class="num">[${esc(r.pillar ?? '?')}]</span> ${value}</li>`;
  }).join('');
  return `<ul class="srcs">${items}</ul>`;
}
