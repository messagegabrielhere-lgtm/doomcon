// /bets.html: Tally's bets. The page for collector/bets.mjs, which explains
// why a site stamped NOT A PREDICTION has this page at all. Short version: the
// index still never forecasts; this is a separate, scored ledger of forecasts
// about the index, with the arithmetic beside every probability.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { mascot } from './_mascot.mjs';

const pct = (p) => `${(p * 100).toFixed(p >= 0.995 || p <= 0.005 ? 1 : 0)}%`;

export function hasBets(ctx) {
  return Boolean(ctx.bets && Array.isArray(ctx.bets.open) && Array.isArray(ctx.bets.resolved));
}

function openRow(b) {
  return `<li class="bt__c">
    <p class="bt__p num">${esc(pct(b.p))}</p>
    <p class="bt__s">${esc(b.statement)}</p>
    <p class="bt__m">Made ${esc(utc(b.made_at))} · settles at the first reading after ${esc(utc(b.due_at))}</p>
    <p class="bt__m">Basis: it happened in <b>${esc(b.basis.k)} of ${esc(b.basis.n)}</b> comparable past cases; (${esc(b.basis.k)} + 1) / (${esc(b.basis.n)} + 2).</p>
  </li>`;
}

function resolvedRow(b) {
  return `<tr><td>${esc(b.made_on)}</td><td>${esc(b.statement)}</td><td class="num">${esc(pct(b.p))}</td>
    <td>${b.hit ? 'Happened' : 'Did not happen'}</td><td class="num">${esc(b.brier.toFixed(4))}</td></tr>`;
}

export function render(ctx) {
  const B = ctx.bets; const s = B.summary || {};
  const level = ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null;
  const main = `
<style>
.bt { max-width: 84ch; }
.bt__top { display: flex; align-items: center; gap: var(--s-4); margin: var(--s-4) 0 var(--s-3); }
.bt__top h1 { margin: 0; }
.bt__l { list-style: none; margin: var(--s-4) 0; padding: 0; display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); }
.bt__c { padding: var(--s-4); border: 1px solid var(--rule); border-top: 6px solid var(--lvl, var(--accent)); border-radius: 8px; background: var(--bg-sunken); }
.bt__p { margin: 0; font: 400 clamp(48px, 8vw, 76px)/1 var(--poster); color: var(--lvl, var(--accent)); }
.bt__s { margin: 6px 0 var(--s-2); font: 600 var(--t-base)/1.4 var(--sans); color: var(--ink); }
.bt__m { margin: 0 0 4px; font: 500 var(--t-xs)/1.45 var(--mono); letter-spacing: .03em; color: var(--ink-dim); }
.bt__m b { color: var(--ink); }
.bt h2 { margin: var(--s-6, 40px) 0 var(--s-2); }
.bt > p, .bt > ul > li { font: 400 var(--t-base)/1.6 var(--sans); color: var(--ink-dim); }
.bt b { color: var(--ink); }
.bt__scroll { overflow-x: auto; position: relative; }
.bt table { border-collapse: collapse; width: 100%; font: 400 var(--t-sm)/1.45 var(--sans); }
.bt th, .bt td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--rule); color: var(--ink-dim); }
.bt th { font: 700 var(--t-xs)/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink); }
.bt__score { display: flex; flex-wrap: wrap; gap: var(--s-4) var(--s-6, 40px); margin: var(--s-3) 0; }
.bt__score p { margin: 0; display: grid; gap: 4px; }
.bt__score b { font: 400 clamp(36px, 6vw, 56px)/1 var(--poster); color: var(--ink); }
.bt__score span { font: 500 var(--t-xs)/1.35 var(--mono); color: var(--ink-dim); max-width: 24ch; }
</style>
<section class="bt">
  <p class="eyebrow">Tally\u2019s bets · forecasts about the index · kept apart from it</p>
  <div class="bt__top">${mascot({ size: 76, level })}<h1 class="bp__h1">Forecasts you can score</h1></div>
  <p class="lede">The index does not predict, and that has not changed. This page is something else: once a day Tally writes down a few
    small forecasts <b>about the index itself</b>, each with a probability and a due date, and every one is marked right or wrong in public when it falls due.</p>

  <h2 class="sec__h">Open bets</h2>
  ${B.open.length ? `<ol class="bt__l">${B.open.map(openRow).join('\n')}</ol>` : '<p>No open bets. The next set is written at the first reading of the next UTC day.</p>'}

  <h2 class="sec__h">The track record</h2>
  <div class="bt__score">
    <p><b class="num">${esc(s.resolved || 0)}</b><span>bets settled so far</span></p>
    <p><b class="num">${s.resolved ? esc(s.hits) : '—'}</b><span>of them happened</span></p>
    <p><b class="num">${s.mean_brier === null || s.mean_brier === undefined ? '—' : esc(Number(s.mean_brier).toFixed(3))}</b><span>mean Brier score. 0 is perfect; always saying 50% scores 0.250</span></p>
  </div>
  ${B.resolved.length ? `<div class="bt__scroll"><table>
    <thead><tr><th>Made</th><th>Bet</th><th>Said</th><th>Outcome</th><th>Brier</th></tr></thead>
    <tbody>${B.resolved.slice(0, 60).map(resolvedRow).join('\n')}</tbody>
  </table></div>` : '<p>Nothing has fallen due yet. The first bets settle a day after they were made, and this table fills in from there. An empty record is printed as empty.</p>'}

  <h2 class="sec__h">The rules</h2>
  <ul>
    <li><b>Nobody\u2019s opinion sets the number.</b> Each probability is a base rate from the index\u2019s own history: how often the same thing happened before, smoothed as (k + 1) / (n + 2). The k and n are printed on every bet.</li>
    <li><b>Every bet has a due date and a yes-or-no outcome,</b> settled by the first reading published after the due time.</li>
    <li><b>Every bet is scored</b> with the Brier score, (probability − outcome)², and the running mean is published, good or bad.</li>
    <li><b>Bets are never edited or deleted.</b> The file is <a href="${esc(ctx.href('/api/bets.json'))}">public JSON</a> and the code is in the repository.</li>
    <li><b>They are bets about the index only.</b> Not about the world, not about what AI does next, and they do not feed the index.</li>
  </ul>
  <h2 class="sec__h">What a base rate cannot see</h2>
  <p>It knows how often something happened before and nothing else. It does not know that the score is sitting just under a boundary today,
    or that a big release is due. The history is also short${B.open[0] ? `: the 24-hour bets rest on ${esc(B.open[0].basis.n)} past cases` : ''}, and a level that has never moved gives a base rate that says it never will. That is a limit of the method, stated here so the first miss is not a surprise.</p>
  <p><a href="${esc(ctx.href('/'))}">The current reading →</a> · <a href="${esc(ctx.href('/methodology.html'))}">How the index is computed →</a></p>
</section>`;
  return page({
    ctx, path: '/bets.html',
    title: `Tally\u2019s bets: scored forecasts about the ${brand.NAME} index`,
    description: `Daily base-rate forecasts about the ${brand.NAME} index, each with a probability and a due date, scored in public with the Brier score. Separate from the index, which does not predict.`,
    main,
  });
}
