// Monthly reports: /reports/YYYY-MM.html and the /reports/ index.
//
// Why this exists: the hourly number changes every hour, so a writer cannot
// cite it and expect the link to still say what they quoted. A month that has
// closed never changes. Each report is a stable URL with findings written as
// complete sentences, so a journalist can lift one line and link the page.
//
// Deterministic: inputs are ctx.history (data/history.ndjson rows) and
// ctx.state.generated_at only. Describes activity tempo, never a probability.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs } from './_seo.mjs';
import * as brand from '../brand.mjs';

const INDEX_Q = `What did the ${brand.NAME} AI activity index do each month?`;

const PILLARS = [
  ['capability', 'Capability'],
  ['compute', 'Compute & Capital'],
  ['attention', 'Attention'],
  ['governance', 'Governance'],
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

export function monthLabel(month) {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function reportPath(month) {
  return `/reports/${month}.html`;
}

/** Distinct YYYY-MM keys present in history, oldest first. */
export function monthsIn(history) {
  const set = new Set();
  for (const r of history) if (r && typeof r.t === 'string') set.add(r.t.slice(0, 7));
  return [...set].sort();
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Summary statistics for one calendar month (UTC). */
export function summarize(history, month, nowIso) {
  const rows = history.filter((r) => r && typeof r.t === 'string' && r.t.startsWith(month)
    && Number.isFinite(r.score));
  if (!rows.length) return null;
  let min = rows[0];
  let max = rows[0];
  const levels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) {
    if (r.score < min.score) min = r;
    if (r.score > max.score) max = r;
    if (levels[r.level] !== undefined) levels[r.level] += 1;
  }
  const pillars = PILLARS.map(([id, name]) => {
    const vals = rows.map((r) => r.pillars && r.pillars[id]).filter(Number.isFinite);
    return { id, name, mean: mean(vals), n: vals.length };
  }).filter((p) => p.mean !== null);
  const modeLevel = Object.entries(levels).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return {
    month,
    complete: typeof nowIso === 'string' ? nowIso.slice(0, 7) > month : false,
    n: rows.length,
    first: rows[0],
    last: rows[rows.length - 1],
    mean: mean(rows.map((r) => r.score)),
    min,
    max,
    levels,
    modeLevel: Number(modeLevel[0]),
    modeShare: modeLevel[1] / rows.length,
    pillars,
  };
}

function levelName(level) {
  const l = brand.LEVELS.find((x) => x.level === level);
  return l ? l.name : String(level);
}

/** Quotable findings: each one a complete sentence that stands alone. */
export function findings(s) {
  const label = monthLabel(s.month);
  const span = s.complete ? `In ${label}` : `In ${label} to date`;
  const out = [
    `${span}, the ${brand.NAME} AI activity index averaged ${num(s.mean, 1)} of 100 across ${s.n} readings.`,
    `The highest ${brand.NAME} reading of ${label} was ${num(s.max.score, 1)} at ${utc(s.max.t)}; the lowest was ${num(s.min.score, 1)} at ${utc(s.min.t)}.`,
    `${brand.NAME} spent ${Math.round(s.modeShare * 100)}% of ${label} readings at level ${s.modeLevel} (${levelName(s.modeLevel)}).`,
  ];
  if (s.pillars.length >= 2) {
    const sorted = [...s.pillars].sort((a, b) => b.mean - a.mean);
    const hi = sorted[0];
    const lo = sorted[sorted.length - 1];
    out.push(`${hi.name} was the most active ${brand.NAME} pillar in ${label}, averaging ${num(hi.mean, 1)}; ${lo.name} was the least active at ${num(lo.mean, 1)}.`);
  }
  const delta = s.last.score - s.first.score;
  out.push(`From its first to its last reading of ${label}, the index moved ${delta >= 0 ? 'up' : 'down'} ${num(Math.abs(delta), 1)} points, from ${num(s.first.score, 1)} to ${num(s.last.score, 1)}.`);
  return out;
}

export function render(ctx, month) {
  const s = summarize(ctx.history, month, ctx.state.generated_at);
  if (!s) return null;
  const label = monthLabel(month);
  const path = reportPath(month);
  const title = `${brand.NAME} AI activity report, ${label}${s.complete ? '' : ' (month to date)'}`;
  const facts = findings(s);
  const levelRows = [1, 2, 3, 4, 5].map((l) =>
    `<tr><td>${l} · ${esc(levelName(l))}</td><td>${s.levels[l]}</td><td>${num(100 * s.levels[l] / s.n, 0)}%</td></tr>`).join('');
  const pillarRows = s.pillars.map((p) =>
    `<tr><td>${esc(p.name)}</td><td>${num(p.mean, 1)}</td></tr>`).join('');
  const all = monthsIn(ctx.history);
  const i = all.indexOf(month);
  const prev = i > 0 ? all[i - 1] : null;
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
  const cite = `${brand.NAME} (${month.slice(0, 4)}). AI activity report, ${label}. ${ctx.url(path)}`;

  const main = `<article class="lore">
  <h1>${esc(title)}</h1>
  <p class="lede">${esc(s.complete ? 'This month has closed. These numbers will not change.' : `Month to date, through ${utc(s.last.t)}. Final numbers publish when the month closes; this URL stays the same.`)}</p>
  <h2 id="findings">Key findings</h2>
  <ul>${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  <h2 id="levels">How many readings landed at each level?</h2>
  <table><thead><tr><th>Level</th><th>Readings</th><th>Share</th></tr></thead><tbody>${levelRows}</tbody></table>
  <h2 id="pillars">Which pillars were most active?</h2>
  <table><thead><tr><th>Pillar</th><th>Mean score (0–100)</th></tr></thead><tbody>${pillarRows}</tbody></table>
  <h2 id="method">Where do these numbers come from?</h2>
  <p>Every figure is computed from the public reading log at
    <a href="${esc(ctx.href('/api/history.json'))}">/api/history.json</a>, using the formulas on the
    <a href="${esc(ctx.href('/methodology.html'))}">methodology page</a>. Each hourly reading has a hash-chained receipt you can
    <a href="${esc(ctx.href('/verify.html'))}">verify in your browser</a>. ${esc(brand.DISCLAIMER)}</p>
  <h2 id="cite">How do I cite this report?</h2>
  <p><code>${esc(cite)}</code></p>
  <p>Free to quote and republish under CC BY 4.0 with a link to this page.</p>
  <p>${prev ? `<a href="${esc(ctx.href(reportPath(prev)))}">← ${esc(monthLabel(prev))}</a> · ` : ''}<a href="${esc(ctx.href('/reports/'))}">All monthly reports</a>${next ? ` · <a href="${esc(ctx.href(reportPath(next)))}">${esc(monthLabel(next))} →</a>` : ''}</p>
</article>
`;

  return page({
    ctx,
    path,
    title: `${title} · ${brand.NAME}`,
    ogTitle: title,
    description: facts[0] + ' ' + facts[2],
    ogType: 'article',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: title,
        description: facts.join(' '),
        url: ctx.url(path),
        temporalCoverage: `${s.first.t}/${s.last.t}`,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
        isAccessibleForFree: true,
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/history.json') }],
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: INDEX_Q, path: '/reports/' },
        { name: label, path },
      ]),
    ],
    main,
  });
}

export function renderIndex(ctx) {
  const months = monthsIn(ctx.history).reverse();
  const path = '/reports/';
  const items = months.map((m) => {
    const s = summarize(ctx.history, m, ctx.state.generated_at);
    return `<li><a href="${esc(ctx.href(reportPath(m)))}">${esc(monthLabel(m))}</a>${s.complete ? '' : ' (month to date)'} — averaged ${num(s.mean, 1)} of 100 across ${s.n} readings</li>`;
  }).join('');
  const main = `<article class="lore">
  <h1>${esc(INDEX_Q)}</h1>
  <p class="lede">One page per month with quotable findings and a permanent URL. Built from the public reading log; free to cite under CC BY 4.0.</p>
  <ul>${items}</ul>
  <p>${esc(brand.DISCLAIMER)}</p>
</article>
`;
  return page({
    ctx,
    path,
    title: `${brand.NAME} monthly AI activity reports · ${brand.NAME}`,
    ogTitle: `${brand.NAME} monthly AI activity reports`,
    description: 'Monthly summaries of the SIREN AI activity index: averages, highs, lows, time at each level and the most active pillars, with permanent citable URLs.',
    jsonld: [breadcrumbs(ctx, [{ name: 'Home', path: '/' }, { name: INDEX_Q, path }])],
    main,
  });
}
