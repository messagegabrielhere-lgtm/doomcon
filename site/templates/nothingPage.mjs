// /nothing.html — Nothing Ever Happens, the skeptic's counter.
//
// docs/SUB-INDICES.md §4. A direct, acknowledged riff on pizzint.watch's
// Nothing Ever Happens Index — pointed at AI, and built so it can only say
// "more doom" when public predictions actually land.
//
// pizzint's NEH is max(Polymarket geo odds): a panic gauge. Ours is the
// opposite register: how often dated, confident AI claims missed. The joke is
// the framing. The ledger underneath is sourced, dated, and revisable.
//
// Does NOT feed the main index (docs/SUB-INDICES.md shared rules). Never
// prints a confident score over an empty resolved set — that is the pizzint
// failure mode this whole repo exists to refuse (docs/TEARDOWN.md §3.1).
//
// Deterministic: no clock reads, no randomness. "Today" for overdue checks is
// the observation stamp on state.json, never Date.now().

import { esc, num, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { mascot } from './_mascot.mjs';

const PATH = '/nothing.html';

// ── Curated ledger ─────────────────────────────────────────────────────────
//
// Each row is a public, dated claim with a source URL a stranger can open.
// status is computed at render time from due_iso vs the observation stamp —
// never hand-written as "missed" unless the claim has a hard public miss
// (announced window closed without the event, or the claimant walked it back).
//
// Add rows; do not invent. A claim without a due date does not belong here.

/** @typedef {'miss' | 'hit' | 'pending' | 'overdue'} ClaimStatus */

/**
 * Frozen ledger of public AI predictions with checkable windows.
 * `outcome` is set only when the public record is unambiguous:
 *   miss — window closed, event did not happen (or claimant retracted)
 *   hit  — event happened inside the window
 *   null — still open; render decides pending vs overdue from due_iso
 */
export const LEDGER = Object.freeze([
  {
    id: 'eu-ai-act-force-2024',
    claim: 'EU AI Act enters into force on 1 August 2024',
    who: 'EU Official Journal / Commission timeline',
    due_iso: '2024-08-01',
    outcome: 'hit',
    source_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689',
    note: 'Entered into force twenty days after publication, on the published August 2024 date. Calendar held.',
  },
  {
    id: 'gpt5-summer-2024',
    claim: 'GPT-5 ships in summer 2024',
    who: 'Widespread OpenAI-circle expectation (press cycle)',
    due_iso: '2024-09-22',
    outcome: 'miss',
    source_url: 'https://www.theverge.com/2024/5/14/24156428/openai-gpt-5-rumors-altman',
    note: 'Summer 2024 closed with no GPT-5 release. GPT-4.1 / o-series arrived later under other names.',
  },
  {
    id: 'gemini-ultra-consumer-q1-2024',
    claim: 'Gemini Ultra reaches consumers in early 2024 as announced',
    who: 'Google (December 2023 launch framing)',
    due_iso: '2024-03-31',
    outcome: 'miss',
    source_url: 'https://blog.google/technology/ai/google-gemini-ai/',
    note: 'Ultra access slipped past the early-2024 consumer framing; Advanced / later tiers filled the gap.',
  },
  {
    id: 'openai-agi-board-2024',
    claim: 'OpenAI reaches AGI under the Microsoft deal definition in 2024',
    who: 'Public speculation around the MSFT / OpenAI AGI clause',
    due_iso: '2024-12-31',
    outcome: 'miss',
    source_url: 'https://www.reuters.com/technology/microsoft-openai-agreements-focus-agi-definition-2024/',
    note: 'No public AGI declaration by either party in 2024. The clause remained untriggered.',
  },
  {
    id: 'apple-intelligence-eu-2024',
    claim: 'Apple Intelligence launches in the EU with the US 2024 wave',
    who: 'Apple (WWDC 2024 / regional rollout commentary)',
    due_iso: '2024-12-31',
    outcome: 'miss',
    source_url: 'https://www.reuters.com/technology/apple-delays-launch-ai-powered-features-europe-2024-06-21/',
    note: 'EU rollout was delayed past the 2024 US wave over DMA compliance.',
  },
  {
    id: 'sora-public-2024',
    claim: 'OpenAI Sora is generally available to the public in 2024',
    who: 'February 2024 demo-cycle expectation',
    due_iso: '2024-12-31',
    outcome: 'miss',
    source_url: 'https://openai.com/index/sora/',
    note: '2024 closed with Sora still limited / waitlisted rather than general public availability.',
  },
  {
    id: 'federal-ai-licensing-2025',
    claim: 'US federal licensing regime for frontier training is law in 2025',
    who: '2023–24 policy advocacy forecasts',
    due_iso: '2025-12-31',
    outcome: 'miss',
    source_url: 'https://www.congress.gov/',
    note: 'No enacted federal frontier-licensing statute by end of 2025. Executive actions are not the claim.',
  },
  {
    id: 'claude-opus-desktop-agent-2025',
    claim: 'A generally available computer-use agent from a frontier lab replaces routine desktop work for most knowledge workers in 2025',
    who: '2024 agent-demo discourse',
    due_iso: '2025-12-31',
    outcome: 'miss',
    source_url: 'https://www.anthropic.com/news/developing-computer-use',
    note: 'Computer-use demos shipped; “most knowledge workers” replacement did not.',
  },
  {
    id: 'agi-2026-mainstream',
    claim: 'AGI arrives by end of 2026 (mainstream short-timeline claim)',
    who: 'Aggregated short-timeline public forecasts',
    due_iso: '2026-12-31',
    outcome: null,
    source_url: 'https://www.metaculus.com/',
    note: 'Open until the due date. A miss or hit here is marked only when the public record is clear.',
  },
  {
    id: 'federal-ai-licensing-2026',
    claim: 'US federal licensing regime for frontier training is law in 2026',
    who: 'Carry-forward of the 2025 licensing forecast',
    due_iso: '2026-12-31',
    outcome: null,
    source_url: 'https://www.congress.gov/',
    note: 'Open until 2026 closes. Same claim, next calendar.',
  },
]);

const BANDS = Object.freeze([
  { id: 'happened', lo: 0, hi: 29, label: 'IT HAPPENED', gloss: 'Resolved claims mostly landed.' },
  { id: 'happening', lo: 30, hi: 64, label: 'SOMETHING IS HAPPENING', gloss: 'Hits and misses are mixed.' },
  { id: 'might', lo: 65, hi: 89, label: 'NOTHING MUCH HAPPENED', gloss: 'Most dated claims missed.' },
  { id: 'neh', lo: 90, hi: 100, label: 'NOTHING EVER HAPPENS', gloss: 'Nearly every checkable claim missed.' },
]);

function bandFor(score) {
  if (!Number.isFinite(score)) return null;
  return BANDS.find((b) => score >= b.lo && score <= b.hi) || BANDS[BANDS.length - 1];
}

/** Observation stamp used as "today" — never the build clock. */
function asOfIso(ctx) {
  const s = ctx && ctx.state && ctx.state.generated_at;
  return typeof s === 'string' && Number.isFinite(Date.parse(s)) ? s : null;
}

/**
 * Resolve one ledger row against the observation stamp.
 * @returns {{ status: ClaimStatus, claim: object }}
 */
export function resolveClaim(row, asOf) {
  if (row.outcome === 'miss') return { status: 'miss', claim: row };
  if (row.outcome === 'hit') return { status: 'hit', claim: row };
  const due = Date.parse(row.due_iso);
  const now = Date.parse(asOf || '');
  if (!Number.isFinite(due) || !Number.isFinite(now)) return { status: 'pending', claim: row };
  if (now > due) return { status: 'overdue', claim: row };
  return { status: 'pending', claim: row };
}

/** Pure score from resolved miss/hit rows. Overdue is not a miss until marked. */
export function scoreLedger(resolved) {
  const miss = resolved.filter((r) => r.status === 'miss').length;
  const hit = resolved.filter((r) => r.status === 'hit').length;
  const n = miss + hit;
  if (n < 3) {
    return {
      score: null,
      miss,
      hit,
      resolved: n,
      reason: `Need at least 3 resolved claims to print a score (have ${n}).`,
    };
  }
  const score = Math.round((1000 * miss) / n) / 10;
  return { score, miss, hit, resolved: n, reason: null };
}

/** Consecutive readings without a level change, newest-first over moves. */
export function calmStreak(ctx) {
  const moves = Array.isArray(ctx.moves) ? [...ctx.moves] : [];
  if (!moves.length) return null;
  moves.sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)));
  let n = 0;
  let since = null;
  for (const m of moves) {
    n += 1;
    since = m.generated_at;
    if (m.level_changed) break;
  }
  const head = moves[0];
  return {
    readings: n,
    since,
    level: head.level,
    name: head.level_name,
    at: head.generated_at,
  };
}

/** Share of recent history at level ≥ 4 (ROUTINE or quieter). */
export function quietShare(ctx, limit = 168) {
  const hist = Array.isArray(ctx.history) ? ctx.history : [];
  const rows = hist
    .filter((h) => Number.isFinite(h.level))
    .slice(-limit);
  if (rows.length < 12) return null;
  const quiet = rows.filter((h) => h.level >= 4).length;
  return {
    quiet,
    total: rows.length,
    pct: Math.round((1000 * quiet) / rows.length) / 10,
  };
}

export function compute(ctx) {
  const asOf = asOfIso(ctx);
  const rows = LEDGER.map((row) => resolveClaim(row, asOf));
  const resolved = rows.filter((r) => r.status === 'miss' || r.status === 'hit');
  const scored = scoreLedger(resolved);
  const band = bandFor(scored.score);
  return {
    asOf,
    rows,
    scored,
    band,
    streak: calmStreak(ctx),
    quiet: quietShare(ctx),
    pending: rows.filter((r) => r.status === 'pending').length,
    overdue: rows.filter((r) => r.status === 'overdue').length,
  };
}

export function hasNothing(ctx) {
  return Boolean(ctx && ctx.state);
}

const STATUS_LABEL = {
  miss: 'MISS',
  hit: 'HIT',
  pending: 'PENDING',
  overdue: 'OVERDUE',
};

function faqJsonLd(ctx, data) {
  const scoreLine = Number.isFinite(data.scored.score)
    ? `The Nothing Index is ${data.scored.score} of 100 (${data.band.label}): ${data.scored.miss} misses and ${data.scored.hit} hits among ${data.scored.resolved} resolved public claims.`
    : `The Nothing Index is not printed yet: ${data.scored.reason}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the ${brand.NAME} Nothing Ever Happens Index?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `A skeptic's counter for AI hype: the share of dated, public AI predictions that missed, on a 0–100 scale. ${scoreLine} It does not feed the main ${brand.NAME} reading.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How is this different from pizzint.watch’s Nothing Ever Happens Index?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PizzINT’s NEH is the single highest probability among curated geopolitical Polymarket contracts — a panic gauge. Ours scores whether checkable AI claims landed or missed. Correlation is not causation on either page.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does this number feed the main SIREN index?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Sub-indices do not feed the composite unless their sources sit in the frozen reference. This page is a separate instrument.',
        },
      },
    ],
  };
}

export function render(ctx) {
  const data = compute(ctx);
  const level = ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null;
  const scoreTxt = Number.isFinite(data.scored.score) ? num(data.scored.score, 1) : '—';
  const band = data.band;
  const asOf = data.asOf ? utc(data.asOf) : 'unspecified observation';

  const gaugeSegs = BANDS.map((b) => {
    const on = band && band.id === b.id ? '1' : '0';
    const flex = Math.max(1, b.hi - b.lo);
    return `<span class="neh__seg" data-id="${esc(b.id)}" data-on="${on}" style="flex:${flex}">${esc(b.label)}</span>`;
  }).join('');

  const rows = data.rows.map(({ status, claim: c }) => {
    return `<tr data-status="${esc(status)}">
      <td><span class="neh__st">${esc(STATUS_LABEL[status])}</span></td>
      <td>
        <b>${esc(c.claim)}</b>
        <div class="neh__who">${esc(c.who)}</div>
        <div class="neh__note">${esc(c.note)}</div>
      </td>
      <td class="num">${esc(utcDay(c.due_iso))}</td>
      <td><a href="${esc(c.source_url)}" rel="noopener">source</a></td>
    </tr>`;
  }).join('\n');

  const streak = data.streak;
  const quiet = data.quiet;

  const main = `
<style>
.neh__top { display:flex; align-items:center; gap:var(--s-4); margin:var(--s-4) 0 var(--s-3); flex-wrap:wrap; }
.neh__h1 { margin:0; }
.neh__hero { display:grid; gap:var(--s-4); grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); margin:var(--s-5) 0; }
@media (max-width:820px){ .neh__hero { grid-template-columns:1fr; } }
.neh__panel { margin:0; padding:var(--s-4); border:1px solid var(--rule); border-radius:8px; background:var(--bg-raised, var(--bg-sunken)); }
.neh__k { margin:0; font:700 var(--t-xs)/1.2 var(--mono); letter-spacing:.14em; text-transform:uppercase; color:var(--ink-dim); }
.neh__score { margin:var(--s-2) 0 0; font:400 clamp(64px, 12vw, 104px)/.95 var(--poster); color:var(--accent); }
.neh__band { margin:8px 0 0; font:700 var(--t-sm)/1.3 var(--mono); letter-spacing:.08em; text-transform:uppercase; }
.neh__gloss { margin:6px 0 0; font:400 var(--t-base)/1.5 var(--sans); color:var(--ink); max-width:48ch; }
.neh__math { margin:var(--s-3) 0 0; font:500 var(--t-sm)/1.45 var(--mono); color:var(--ink-dim); }
.neh__gauge { display:flex; gap:3px; margin-top:var(--s-4); }
.neh__seg { flex:1; min-height:44px; padding:6px 4px; font:700 9px/1.15 var(--mono); letter-spacing:.04em; text-align:center; color:var(--ink-dim); border:1px solid var(--rule); border-radius:4px; display:flex; align-items:center; justify-content:center; }
.neh__seg[data-id="happened"] { background:rgba(248,113,113,.12); }
.neh__seg[data-id="happening"] { background:rgba(251,191,36,.12); }
.neh__seg[data-id="might"] { background:rgba(52,211,153,.10); }
.neh__seg[data-id="neh"] { background:rgba(96,165,250,.12); }
.neh__seg[data-on="1"] { color:var(--ink); box-shadow:inset 0 0 0 2px var(--accent); }
.neh__side { display:grid; gap:var(--s-3); }
.neh__stat { margin:0; padding:var(--s-3); border:1px solid var(--rule); border-radius:8px; }
.neh__n { margin:6px 0 0; font:400 clamp(36px, 7vw, 56px)/1 var(--poster); color:var(--ink); }
.neh__u { margin:4px 0 0; font:500 var(--t-xs)/1.4 var(--mono); color:var(--ink-dim); }
.neh__table { width:100%; border-collapse:collapse; margin:var(--s-5) 0; font:400 var(--t-sm)/1.45 var(--sans); }
.neh__table th { text-align:left; font:700 var(--t-xs)/1.2 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--ink-dim); padding:8px 10px; border-bottom:1px solid var(--rule); }
.neh__table td { padding:12px 10px; border-bottom:1px solid var(--rule); vertical-align:top; }
.neh__who { margin-top:4px; color:var(--ink-dim); font:500 var(--t-xs)/1.4 var(--mono); }
.neh__note { margin-top:6px; color:var(--ink); max-width:62ch; }
.neh__st { display:inline-block; padding:3px 7px; border-radius:3px; font:700 10px/1 var(--mono); letter-spacing:.1em; }
tr[data-status="miss"] .neh__st { background:rgba(52,211,153,.18); color:#6ee7b7; }
tr[data-status="hit"] .neh__st { background:rgba(248,113,113,.18); color:#fca5a5; }
tr[data-status="pending"] .neh__st { background:rgba(148,163,184,.16); color:var(--ink-dim); }
tr[data-status="overdue"] .neh__st { background:rgba(251,191,36,.18); color:#fde68a; }
.neh__fine { font:400 var(--t-sm)/1.55 var(--sans); color:var(--ink-dim); max-width:72ch; }
.neh__faq { margin:var(--s-6) 0; display:grid; gap:var(--s-3); }
.neh__faq details { border:1px solid var(--rule); border-radius:8px; padding:12px 14px; background:var(--bg-raised, var(--bg-sunken)); }
.neh__faq summary { cursor:pointer; font:700 var(--t-sm)/1.35 var(--sans); }
.neh__faq p { margin:8px 0 0; color:var(--ink-dim); }
</style>
<section class="neh">
  <p class="eyebrow">Nothing Ever Happens · a ${esc(brand.NAME)} sub-index · does not feed the main number</p>
  <div class="neh__top">${mascot({ size: 84, level })}<h1 class="neh__h1 bp__h1">Nothing Ever Happens</h1></div>
  <p class="lede">The index for people who think the AI discourse is mostly hot air — and the one that keeps public score when confident, dated claims miss. A riff on <a href="https://www.pizzint.watch/nothingeverhappens" rel="noopener">pizzint.watch’s NEH</a>, pointed at predictions instead of panic odds.</p>

  <div class="neh__hero">
    <article class="neh__panel">
      <p class="neh__k">Nothing Index</p>
      <p class="neh__score num">${esc(scoreTxt)}</p>
      ${band
        ? `<p class="neh__band">${esc(band.label)}</p><p class="neh__gloss">${esc(band.gloss)}</p>`
        : `<p class="neh__band">AWAITING RESOLVED CLAIMS</p><p class="neh__gloss">${esc(data.scored.reason)}</p>`}
      <p class="neh__math">${Number.isFinite(data.scored.score)
        ? `${esc(String(data.scored.miss))} misses ÷ ${esc(String(data.scored.resolved))} resolved × 100 = ${esc(scoreTxt)}`
        : `Resolved so far: ${esc(String(data.scored.miss))} miss · ${esc(String(data.scored.hit))} hit · ${esc(String(data.pending))} pending · ${esc(String(data.overdue))} overdue`}</p>
      <div class="neh__gauge" role="img" aria-label="Nothing Index bands from IT HAPPENED to NOTHING EVER HAPPENS">${gaugeSegs}</div>
      <p class="neh__math">As of observation ${esc(asOf)}. Overdue rows are not auto-scored as misses — a human marks the outcome when the public record is clear.</p>
    </article>
    <div class="neh__side">
      ${streak ? `<article class="neh__stat">
        <p class="neh__k">Index calm streak</p>
        <p class="neh__n num">${esc(String(streak.readings))}</p>
        <p class="neh__u">consecutive readings at ${esc(brand.NAME)} ${esc(String(streak.level))} · ${esc(streak.name)}, since ${esc(utc(streak.since))}</p>
      </article>` : `<article class="neh__stat"><p class="neh__k">Index calm streak</p><p class="neh__n num">—</p><p class="neh__u">No move history loaded.</p></article>`}
      ${quiet ? `<article class="neh__stat">
        <p class="neh__k">Quiet share</p>
        <p class="neh__n num">${esc(num(quiet.pct, 1))}%</p>
        <p class="neh__u">${esc(String(quiet.quiet))} of ${esc(String(quiet.total))} recent readings at level 4–5 (ROUTINE or quieter)</p>
      </article>` : `<article class="neh__stat"><p class="neh__k">Quiet share</p><p class="neh__n num">—</p><p class="neh__u">Need a longer history window.</p></article>`}
      <article class="neh__stat">
        <p class="neh__k">Ledger</p>
        <p class="neh__n num">${esc(String(LEDGER.length))}</p>
        <p class="neh__u">curated claims · ${esc(String(data.scored.resolved))} resolved · ${esc(String(data.pending))} pending · ${esc(String(data.overdue))} overdue</p>
      </article>
    </div>
  </div>

  <h2>The ledger</h2>
  <p class="neh__fine">Every row is a public claim with a due date and a source. Hits lower the index. Misses raise it. Pending stays pending. Overdue waits for a human outcome mark so a late news story cannot silently become a miss.</p>
  <div style="overflow-x:auto">
  <table class="neh__table">
    <thead><tr><th>Status</th><th>Claim</th><th>Due</th><th>Source</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  </div>

  <h2>How the number is made</h2>
  <p class="neh__fine"><b>score = 100 × (misses ÷ resolved)</b>, where resolved means rows marked hit or miss. Pending and overdue do not enter the denominator. The main ${esc(brand.NAME)} reading is a separate instrument — activity tempo from public sources — and this page never writes into it.</p>

  <div class="neh__faq">
    <details open>
      <summary>What is this index?</summary>
      <p>A skeptic’s counter: the share of dated AI predictions in our ledger that missed. High means the confident calendar mostly failed. Low means the claims landed.</p>
    </details>
    <details>
      <summary>How is this different from pizzint’s NEH?</summary>
      <p>Theirs is the highest probability among curated geopolitical Polymarket contracts — a live panic gauge. Ours asks whether checkable AI claims came true. Same meme grammar, opposite evidence.</p>
    </details>
    <details>
      <summary>Why not auto-fail every overdue row?</summary>
      <p>Because that would print a confident miss over ambiguous public records — the same category error as a dashboard printing DOUGHCON 5 over a dead scraper. Overdue is a queue, not a verdict.</p>
    </details>
  </div>

  <p class="neh__fine">Related: <a href="${esc(ctx.href('/desk.html'))}">Tally’s Desk</a> (unserious counts, including the calm streak) · <a href="${esc(ctx.href('/bets.html'))}">Tally’s Bets</a> (our own forecasts, scored) · <a href="${esc(ctx.href('/methodology.html'))}">Methodology</a>.</p>
</section>
<script type="application/ld+json">${JSON.stringify(faqJsonLd(ctx, data)).replace(/</g, '\\u003c')}</script>`;

  const missWord = data.scored.miss === 1 ? 'miss' : 'misses';
  const hitWord = data.scored.hit === 1 ? 'hit' : 'hits';
  const desc = Number.isFinite(data.scored.score)
    ? `Nothing Ever Happens Index at ${scoreTxt}/100 (${band.label}): ${data.scored.miss} ${missWord}, ${data.scored.hit} ${hitWord} among dated AI claims. A ${brand.NAME} sub-index.`
    : `Nothing Ever Happens — ${brand.NAME}'s skeptic counter for dated AI predictions. Score pending until enough claims resolve.`;

  return page({
    ctx,
    path: PATH,
    title: Number.isFinite(data.scored.score)
      ? `Nothing Ever Happens ${scoreTxt} · ${band.label} · ${brand.NAME}`
      : `Nothing Ever Happens · ${brand.NAME}`,
    description: desc,
    main,
  });
}
