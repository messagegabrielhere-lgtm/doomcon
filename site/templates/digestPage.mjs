// /digest.html — the page somebody bookmarks and opens each morning.
//
// The dashboard says WHAT happened. This says what it means, and it does so
// without one sentence of generated prose: every "why this matters" line below
// was assembled in collector/digest.mjs out of facts that are already in
// data/news.json, data/state.json, data/history.ndjson and data/race.json.
// docs/DIGEST.md publishes every rule and every threshold that produced them,
// and this page links to it from four places, because the claim that a stranger
// can recompute our numbers is worth nothing if the stranger cannot find the
// rules.
//
// Four sections, in the order a reader wants them:
//
//   THE BRIEF          what actually happened in the last 24 hours, selected by
//                      published rule, each item carrying the rules it fired
//   WHAT CHANGED       a structured diff since the previous observation -
//                      pillars, sources, leaderboard positions, first sightings
//   STREAKS & RECORDS  the arithmetic that makes a daily visit pay
//   PER LAB            the frontier roster, which is also the seed of the
//                      per-lab pages (TEARDOWN 2.3, the long tail)
//
// Constraints, same as news.html: no client framework, no JavaScript at all on
// this page beyond the shared motion layer, every row in the static HTML, and
// no state collapsed - live, dark and awaiting-baseline stay three things.

import { esc, utc, utcClock, signed, num } from './_html.mjs';
import { pillarTag, pillarSprite, pillarCss } from './_reel.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/digest.html';

/** build.mjs guard: is there anything to build this page from? */
export function hasDigest(ctx) {
  return Boolean(ctx && ctx.digest && typeof ctx.digest === 'object');
}

export function render(ctx) {
  if (!hasDigest(ctx)) return emptyPage(ctx);
  const d = ctx.digest;

  const brief = d.brief || { items: [], state: 'empty' };
  const changed = d.what_changed || {};
  const streaks = d.streaks || { state: 'awaiting-baseline', records: [], streaks: [], facts: [] };
  const ents = d.entities || { labs: [] };

  const main = `<style>${digestCss()}</style>${pillarSprite()}
<section class="dg__intro">
  <h1 class="dg__h1">The daily brief</h1>
  <p class="lede">${esc(leadSentence(d))}</p>
  ${stampStrip(d)}
  <p class="dg__key">Nothing on this page was written by a model. Every line under every headline is a
     template with measured numbers substituted into it &mdash; how many independent sources carried an
     item, how that source is publishing against its own baseline, which lab is named and where that lab
     sits on the leaderboard. The selection rules and every threshold are published in
     <a href="${esc(ctx.href('/methodology.html'))}">the methodology</a> and in <code>docs/DIGEST.md</code>.</p>
</section>

${briefSection(d, brief)}
${changedSection(ctx, d, changed)}
${streakSection(d, streaks)}
${entitySection(ctx, d, ents)}
${rulesSection(d)}`;

  const lead = brief.items && brief.items.length ? brief.items[0] : null;
  return page({
    ctx,
    motion: true,
    path: PATH,
    ogType: 'article',
    title: `The daily brief — ${brief.shown || 0} items, ${changedCount(changed)} changes · ${brand.NAME}`,
    ogTitle: `${brand.NAME} daily brief — ${utc(d.as_of)}`,
    description: metaDescription(d, brief, changed, lead),
    ogImage: ctx.cardFor && ctx.state ? ctx.cardFor(ctx.state.receipt_id) : null,
    ogImageAlt: `${brand.NAME} share card`,
    jsonld: [reportLd(ctx, d, brief), itemListLd(ctx, brief)],
    main,
  });
}

/**
 * ctx.digest absent. The page still builds, says which file is missing and
 * carries noindex. An empty brief that a crawler has cached is worse than no
 * brief, and "no digest was compiled" is a different statement from "nothing
 * happened".
 */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `The daily brief · ${brand.NAME}`,
    description: `${brand.NAME} has not compiled a digest in this build.`,
    main: `<style>${digestCss()}</style>${pillarSprite()}
<section class="dg__intro">
  <h1 class="dg__h1">The daily brief</h1>
  <p class="lede">No digest was compiled in this build. This page is the absence of a result, not an
     empty one &mdash; when <code>data/digest.json</code> is present it is rendered here in full: the
     day&rsquo;s items selected by published rule, the diff since the previous observation, the streaks
     and the per-lab rollups.</p>
</section>`,
  });
}

// ---------------------------------------------------------------------------
// Head matter
// ---------------------------------------------------------------------------

function leadSentence(d) {
  const b = d.brief || {};
  const c = d.corpus || {};
  const sel = b.shown
    ? `${b.shown} of ${b.candidates} items published in the last ${b.window_hours} hours cleared a selection rule`
    : `no item among the ${b.candidates || 0} published in the last ${b.window_hours || 24} hours cleared a selection rule`;
  return `${sel}, out of a ${c.items || 0}-item corpus spanning ${c.observed_span_hours || 0} hours ` +
         `across ${c.feeds_live || 0} live feeds. Below them: what moved since the previous observation, ` +
         `what is at a record in the log, and where each frontier lab stands.`;
}

function metaDescription(d, brief, changed, lead) {
  const idx = changed.index && changed.index.since_previous;
  const move = idx && idx.state === 'live'
    ? `Composite ${num(idx.score_to, 1)} of 100, ${signed(idx.score_delta, 2)} since ${utc(idx.reference_at)}. `
    : '';
  const head = lead ? `${lead.title.slice(0, 90)}. ` : '';
  return `${brand.NAME} daily brief for ${utc(d.as_of)}. ${head}${move}` +
         `${brief.shown || 0} items selected by published rule from ${brief.candidates || 0} candidates. ` +
         `No model wrote any of it.`;
}

function changedCount(changed) {
  const idx = changed.index && changed.index.since_previous;
  const pillars = idx && idx.state === 'live' ? idx.pillars_moved : 0;
  const src = changed.sources && changed.sources.state === 'live' ? changed.sources.transitions.length : 0;
  const race = changed.race && Array.isArray(changed.race.movers) ? changed.race.movers.length : 0;
  return pillars + src + race;
}

/**
 * Two stamps, not one. data/news.json and data/state.json are written by
 * different collectors on different clocks, and every figure on this page is
 * anchored to one or the other. Printing a single "last updated" would pick a
 * side silently.
 */
function stampStrip(d) {
  const skew = Math.abs(d.clock_skew_seconds || 0);
  const skewNote = d.clock_skew_note
    ? `<p class="dg__skew">${esc(d.clock_skew_note)}</p>`
    : '';
  return `<dl class="dg__stamps">
    <div><dt>News corpus</dt><dd><time datetime="${esc(d.as_of)}">${esc(utc(d.as_of))}</time></dd></div>
    <div><dt>Index observation</dt><dd><time datetime="${esc(d.index_as_of)}">${esc(utc(d.index_as_of))}</time></dd></div>
    <div><dt>Gap between them</dt><dd class="num">${esc(formatSeconds(skew))}</dd></div>
    <div><dt>Digest version</dt><dd class="num">${esc(d.digest_version)}</dd></div>
  </dl>${skewNote}`;
}

function formatSeconds(s) {
  if (!Number.isFinite(s)) return '—';
  if (s < 90) return `${Math.round(s)}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

// ---------------------------------------------------------------------------
// 1. THE BRIEF
// ---------------------------------------------------------------------------

// The rules, in the words a reader needs, not the ids the collector uses.
const RULE_WORD = {
  corroborated: 'corroborated',
  primary_announcement: 'primary',
  engagement_outlier: 'engagement outlier',
  source_surge: 'source surge',
  frontier_salience: 'frontier lab named',
};

function briefSection(d, brief) {
  if (!brief.items || !brief.items.length) {
    return `<section class="sec dg" aria-labelledby="dg-brief-h">
      <h2 class="sec__h" id="dg-brief-h">The brief</h2>
      <p class="dg__empty"><b>NO ITEM CLEARED A RULE</b>
        Of ${esc(brief.candidates || 0)} items published in the last ${esc(brief.window_hours || 24)} hours,
        none satisfied any of the ${esc(Object.keys(RULE_WORD).length)} selection rules. The brief is short
        rather than padded: filling it with the next-highest-scoring items would turn &ldquo;selected by
        rule&rdquo; into &ldquo;ranked by score&rdquo;, which is a weaker claim wearing the same name.</p>
    </section>`;
  }

  const counts = brief.rule_counts || {};
  const legend = Object.keys(RULE_WORD).sort().map((id) =>
    `<li><span class="dg__rule" data-rule="${esc(id)}">${esc(RULE_WORD[id])}</span>
      <span class="num">${esc(counts[id] ?? 0)}</span> in window</li>`).join('');

  return `<section class="sec dg" aria-labelledby="dg-brief-h">
  <h2 class="sec__h" id="dg-brief-h">The brief</h2>
  <p class="dg__key">${esc(brief.shown)} shown of ${esc(brief.qualified)} that cleared a rule, from
     ${esc(brief.candidates)} candidates in the last ${esc(brief.window_hours)} hours. Capped at
     ${esc(brief.max_items)} items and ${esc(brief.max_per_source)} per source, so a single high-volume feed
     cannot fill it; ${esc(brief.held_back)} qualifying ${esc(brief.held_back === 1 ? 'item was' : 'items were')}
     held back by those caps.</p>
  <ul class="dg__legend">${legend}</ul>
  <ol class="dg__brief">${brief.items.map(briefItem).join('')}</ol>
</section>`;
}

function briefItem(it) {
  const rules = it.rules.map((r) =>
    `<span class="dg__rule" data-rule="${esc(r)}">${esc(RULE_WORD[r] || r)}</span>`).join('');

  const title = it.url
    ? `<a href="${esc(it.url)}" rel="noopener nofollow">${esc(it.title)}</a>`
    : esc(it.title);

  const why = (it.why_components || []).map((w) => `<li>${esc(w)}</li>`).join('');
  const sub = it.summary ? `<p class="dg__sub">${esc(clip(it.summary, 220))}</p>` : '';
  const pillar = it.pillar ? pillarTag(it.pillar, { long: true }) : '';

  return `<li class="dg__item" data-pillar="${esc(it.pillar || '')}">
    <div class="dg__itemhead">
      <span class="dg__rank num" aria-hidden="true">${esc(String(it.rank).padStart(2, '0'))}</span>
      <p class="dg__meta">
        <time class="num" datetime="${esc(it.published_at)}" title="${esc(utc(it.published_at))}">${esc(utcClock(it.published_at))}</time>
        <span class="dg__age num">${esc(it.age_hours)}h</span>
        ${pillar}
        <span class="dg__src">${esc(it.source_label)}</span>
      </p>
      <p class="dg__weight num" title="Sum of the published weights of the rules this item fired">
        <b>${esc(it.rule_weight)}</b><span class="vh"> rule weight</span>
      </p>
    </div>
    <h3 class="dg__title"><span class="vh">Item ${esc(it.rank)}. </span>${title}</h3>
    ${sub}
    <p class="dg__rules">${rules}</p>
    <h4 class="vh">Why this matters</h4>
    <ul class="dg__why">${why}</ul>
  </li>`;
}

// ---------------------------------------------------------------------------
// 2. WHAT CHANGED
// ---------------------------------------------------------------------------

function changedSection(ctx, d, changed) {
  const idx = changed.index || {};
  return `<section class="sec dg" aria-labelledby="dg-chg-h">
  <h2 class="sec__h" id="dg-chg-h">What changed</h2>
  ${indexBlock(idx)}
  ${sourcesBlock(changed.sources)}
  ${raceBlock(ctx, changed.race)}
  ${firstSeenBlock(changed.first_seen)}
</section>`;
}

function indexBlock(idx) {
  const diff = idx.since_previous;
  const day = idx.since_24h;
  const held = idx.level_stable_hours !== null && idx.level_stable_hours !== undefined
    ? `<p class="dg__key">The level has held for ${esc(idx.level_stable_hours)}h, since
       <time datetime="${esc(idx.level_since)}">${esc(utc(idx.level_since))}</time>. Anti-flap rule fired
       this observation: <code>${esc(idx.rule_fired || 'none')}</code>.</p>`
    : '';

  if (!diff || diff.state !== 'live') {
    return `<h3 class="dg__h3">The index</h3>
      ${awaiting(diff && diff.reason)}
      ${held}`;
  }

  const rows = diff.pillars.map((p) => {
    if (p.state !== 'live') {
      return `<tr data-pillar="${esc(p.id)}"><th scope="row">${pillarTag(p.id)} ${esc(p.name)}</th>
        <td class="num">—</td><td class="num">—</td>
        <td class="dg__nostate" colspan="2">no score &mdash; dark or awaiting a frozen baseline, never zero</td></tr>`;
    }
    const dir = direction(p.delta);
    return `<tr data-pillar="${esc(p.id)}" data-dir="${esc(dir.key)}">
      <th scope="row">${pillarTag(p.id)} ${esc(p.name)}</th>
      <td class="num">${esc(p.from)}</td>
      <td class="num">${esc(p.to)}</td>
      <td class="num dg__delta">${esc(dir.glyph)} ${esc(signedOr(p.delta, 2))}</td>
      <td class="dg__word">${esc(dir.word)}</td></tr>`;
  }).join('');

  const dirScore = direction(diff.score_delta);
  const dayLine = day && day.state === 'live'
    ? `<p class="dg__key">Against roughly a day earlier (${esc(day.reference_age_hours)}h, at
       <time datetime="${esc(day.reference_at)}">${esc(utc(day.reference_at))}</time>): composite
       ${esc(signedOr(day.score_delta, 2))}, ${esc(day.pillars_moved)} pillars moved.</p>`
    : `<p class="dg__key">A 24-hour comparison is awaiting a baseline: ${esc((day && day.reason) || 'no observation in range')}.</p>`;

  return `<h3 class="dg__h3">The index</h3>
  <p class="dg__key">Against the previous observation, ${esc(diff.reference_age_hours)}h earlier at
     <time datetime="${esc(diff.reference_at)}">${esc(utc(diff.reference_at))}</time>.
     ${esc(diff.level_changed ? `The level moved from ${diff.level_from} to ${diff.level_to}.` : `The level held at ${diff.level_to}.`)}</p>
  <div class="dg__scroll"><table class="dg__t">
    <caption class="vh">Pillar scores at the previous and current observation</caption>
    <thead><tr><th scope="col">Pillar</th><th scope="col">Was</th><th scope="col">Now</th>
      <th scope="col">Move</th><th scope="col"><span class="vh">Direction</span></th></tr></thead>
    <tbody>
      <tr class="dg__trtotal" data-dir="${esc(dirScore.key)}">
        <th scope="row">Composite</th>
        <td class="num">${esc(diff.score_from)}</td>
        <td class="num">${esc(diff.score_to)}</td>
        <td class="num dg__delta">${esc(dirScore.glyph)} ${esc(signedOr(diff.score_delta, 2))}</td>
        <td class="dg__word">${esc(dirScore.word)}</td>
      </tr>
      ${rows}
    </tbody>
  </table></div>
  ${dayLine}
  ${held}`;
}

/**
 * Source state transitions.
 *
 * pizzint's own status endpoint reports "healthy" at a 12% scrape success rate
 * (TEARDOWN 3.1), so a feed dying is invisible on their dashboard. Here it is a
 * named row with a from-state and a to-state, and `awaiting-baseline` never
 * collapses into `dark`.
 */
function sourcesBlock(s) {
  if (!s) return '';
  if (s.state !== 'live') {
    return `<h3 class="dg__h3">Sources</h3>${awaiting(s.reason)}${sourceTally(s)}`;
  }
  if (!s.transitions.length) {
    return `<h3 class="dg__h3">Sources</h3>
      <p class="dg__key">No feed and no index source changed state since the previous digest. That is a
         measured result, not a skipped check: the full roster and its current state is below.</p>
      ${sourceTally(s)}`;
  }
  const rows = s.transitions.map((t) => `<li class="dg__trans" data-kind="${esc(t.kind)}">
    <span class="dg__transw">${esc(t.kind.replace(/_/g, ' '))}</span>
    <code>${esc(t.id)}</code>
    <span class="dg__transs">${esc(t.family)} &middot; ${esc(t.from)} &rarr; ${esc(t.to)}</span>
  </li>`).join('');
  return `<h3 class="dg__h3">Sources</h3>
    <p class="dg__key">${esc(s.transitions.length)} state ${esc(s.transitions.length === 1 ? 'change' : 'changes')}
       since the previous digest &mdash; ${esc(s.went_dark)} went dark, ${esc(s.came_back)} came back.</p>
    <ul class="dg__translist">${rows}</ul>
    ${sourceTally(s)}`;
}

function sourceTally(s) {
  const now = s.now || { news: {}, index: {} };
  const tally = (obj) => {
    const counts = {};
    for (const v of Object.values(obj)) counts[v] = (counts[v] || 0) + 1;
    return Object.keys(counts).sort().map((k) =>
      `<span class="dg__state" data-state="${esc(k)}">${esc(counts[k])} ${esc(k)}</span>`).join('');
  };
  return `<p class="dg__tally"><b>News feeds</b> ${tally(now.news)}</p>
    <p class="dg__tally"><b>Index sources</b> ${tally(now.index)}</p>`;
}

function raceBlock(ctx, r) {
  if (!r) return '';
  if (r.state === 'absent') {
    return `<h3 class="dg__h3">The leaderboard</h3>
      <p class="dg__key">${esc(r.reason || 'data/race.json was not present at digest time.')}</p>`;
  }
  const href = ctx.href('/race.html');
  const movers = Array.isArray(r.movers) ? r.movers : [];

  const moverRows = movers.map((m) => {
    const dir = direction(m.probability_delta);
    const rank = m.rank_delta === null || m.rank_delta === 0
      ? `<span class="dg__word">rank ${esc(m.rank)}, held</span>`
      : `<span class="dg__word">rank ${esc(m.rank_from)} &rarr; ${esc(m.rank)}</span>`;
    return `<li class="dg__mover" data-dir="${esc(dir.key)}">
      <b>${esc(m.name)}</b>
      <span class="num">${esc(pct(m.probability))}</span>
      <span class="num dg__delta">${esc(dir.glyph)} ${esc(signedOr(m.probability_delta_points, 1))} pts</span>
      ${rank}</li>`;
  }).join('');

  const sevenRows = (r.seven_day || []).map((p) => {
    const dir = direction(p.change_7d);
    return `<li class="dg__mover" data-dir="${esc(dir.key)}">
      <b>${esc(p.name)}</b>
      <span class="num">${esc(pct(p.probability))}</span>
      <span class="num dg__delta">${esc(dir.glyph)} ${esc(signedOr(p.change_7d_points, 1))} pts</span>
      <span class="dg__word">over 7 days</span></li>`;
  }).join('');

  const sinceBlock = r.state === 'live' && movers.length
    ? `<p class="dg__key">${esc(movers.length)} ${esc(movers.length === 1 ? 'position' : 'positions')} moved since the
         previous digest, counting a rank change or a probability move of at least half a point.</p>
       <ul class="dg__movers">${moverRows}</ul>`
    : r.state === 'live'
      ? `<p class="dg__key">No position moved by a rank or by half a point since the previous digest.</p>`
      : awaiting(r.reason);

  return `<h3 class="dg__h3">The leaderboard</h3>
    <p class="dg__key">Ranked on live ${esc(r.venue || 'prediction-market')} odds.
       ${r.leader ? `${esc(r.leader.name)} leads at ${esc(pct(r.leader.probability))}.` : ''}
       <a href="${esc(href)}">The full leaderboard &rarr;</a></p>
    ${sinceBlock}
    ${sevenRows ? `<h4 class="dg__h4">The venue&rsquo;s own 7-day change</h4>
      <p class="dg__key">This column comes from the market, not from our record, so it is a live number on
         a first run in a way our own diff cannot be.</p>
      <ul class="dg__movers">${sevenRows}</ul>` : ''}`;
}

/**
 * First sighting. Nobody else in this category computes it, and it costs one
 * dictionary lookup per item: a name that has never appeared in the record
 * before is a fact about the record, and the record is ours.
 */
function firstSeenBlock(f) {
  if (!f) return '';
  if (f.state !== 'live') {
    return `<h3 class="dg__h3">First sightings</h3>${awaiting(f.reason)}`;
  }
  if (!f.entities.length && !f.sources.length) {
    return `<h3 class="dg__h3">First sightings</h3>
      <p class="dg__key">No name appeared in the corpus for the first time. The ledger has run
         ${esc(f.runs)} ${esc(f.runs === 1 ? 'time' : 'times')} since
         <time datetime="${esc(f.established_at)}">${esc(utc(f.established_at))}</time>.</p>`;
  }
  const ents = f.entities.map((e) => `<li class="dg__first">
    <b>${esc(e.name)}</b>
    <span class="dg__firstw">first carried by ${esc(e.first_source)} at
      <time datetime="${esc(e.first_published_at)}">${esc(utc(e.first_published_at))}</time></span>
    <span class="dg__firstt">${esc(clip(e.first_item_title, 110))}</span></li>`).join('');
  const srcs = f.sources.length
    ? `<p class="dg__key">New to the corpus this run: ${f.sources.map((x) => `<code>${esc(x.id)}</code>`).join(', ')}.</p>`
    : '';
  return `<h3 class="dg__h3">First sightings</h3>
    <p class="dg__key">${esc(f.entities.length)} ${esc(f.entities.length === 1 ? 'name' : 'names')} appeared in the
       corpus for the first time since the ledger was established
       <time datetime="${esc(f.established_at)}">${esc(utc(f.established_at))}</time>.</p>
    <ul class="dg__firsts">${ents}</ul>${srcs}`;
}

// ---------------------------------------------------------------------------
// 3. STREAKS AND RECORDS
// ---------------------------------------------------------------------------

function streakSection(d, s) {
  if (s.state !== 'live') {
    return `<section class="sec dg" aria-labelledby="dg-st-h">
      <h2 class="sec__h" id="dg-st-h">Streaks and records</h2>
      ${awaiting(s.reason)}
    </section>`;
  }

  const running = s.streaks.filter((x) => x.moves >= 1);
  const streakRows = running.map((x) => `<li class="dg__streak" data-dir="${esc(x.direction === 'rising' ? 'up' : 'down')}">
    <b>${esc(x.name)}</b>
    <span class="dg__streakn num">${esc(x.moves)}</span>
    <span class="dg__streakw">consecutive ${esc(x.direction === 'rising' ? 'rises' : 'falls')}
      over ${esc(x.span_hours)}h</span>
    <span class="num dg__delta">${esc(x.total_change_label ? x.total_change_label.replace('-', '−') : '')}</span>
  </li>`).join('');

  const still = s.streaks.filter((x) => x.moves === 0);
  const stillLine = still.length
    ? `<p class="dg__key">${still.map((x) =>
        `${x.name} ${x.state === 'broken' ? 'carries no score this observation' : 'held to the decimal'}`).join('; ')}.</p>`
    : '';

  const recRows = s.records.filter((r) => !r.flat).map((r) => `<tr>
    <th scope="row">${esc(r.label)}</th>
    <td class="num">${esc(r.current)}</td>
    <td class="num">${esc(r.low.value)}${stamp(r.low.at)}</td>
    <td class="num">${esc(r.high.value)}${stamp(r.high.at)}</td>
    <td class="dg__word">${esc(r.at_log_low ? 'at the low' : r.at_log_high ? 'at the high' : 'inside the range')}</td>
  </tr>`).join('');

  const flat = s.records.filter((r) => r.flat);
  const flatLine = flat.length
    ? `<p class="dg__key">${flat.map((r) => esc(r.label)).join(', ')}
       ${esc(flat.length === 1 ? 'has' : 'have')} not moved across the whole log, so
       ${esc(flat.length === 1 ? 'it has' : 'they have')} no high and no low to report.</p>`
    : '';

  const facts = (s.facts || []).map((f) => `<li>${esc(typeof f === 'string' ? f : f.text)}</li>`).join('');

  return `<section class="sec dg" aria-labelledby="dg-st-h">
  <h2 class="sec__h" id="dg-st-h">Streaks and records</h2>
  <p class="dg__key"><b>Every record on this page is scoped to ${esc(s.scope)}</b>, and nothing here is
     called all-time. The log began
     <time datetime="${esc(s.first_observation_at)}">${esc(utc(s.first_observation_at))}</time>. An all-time
     high needs a record longer than the claim it carries, and this one is not there yet.</p>

  ${running.length ? `<h3 class="dg__h3">Running streaks</h3>
  <p class="dg__key">Counted in consecutive observations, not in days &mdash; this index observes roughly
     hourly, and calling three consecutive rises &ldquo;three days&rdquo; would be false.</p>
  <ul class="dg__streaks">${streakRows}</ul>` : ''}
  ${stillLine}

  ${recRows ? `<h3 class="dg__h3">Highs and lows in the log</h3>
  <div class="dg__scroll"><table class="dg__t dg__t--drop">
    <caption class="vh">Record high and low for each series across ${esc(s.scope)}</caption>
    <thead><tr><th scope="col">Series</th><th scope="col">Now</th><th scope="col">Log low</th>
      <th scope="col">Log high</th><th scope="col"><span class="vh">Position</span></th></tr></thead>
    <tbody>${recRows}</tbody>
  </table></div>` : ''}
  ${flatLine}

  ${facts ? `<h3 class="dg__h3">The arithmetic</h3><ul class="dg__facts">${facts}</ul>` : ''}
</section>`;
}

// ---------------------------------------------------------------------------
// 4. PER-LAB ROLLUPS
// ---------------------------------------------------------------------------

function entitySection(ctx, d, e) {
  if (!e.labs || !e.labs.length) return '';
  const blocks = e.labs.map((l) => labBlock(l)).join('');
  return `<section class="sec dg" aria-labelledby="dg-lab-h">
  <h2 class="sec__h" id="dg-lab-h">Every frontier lab, last ${esc(e.window_label)}</h2>
  <p class="dg__key">${esc(e.items_naming_any_entity)} of ${esc(e.corpus_items)} items in the corpus name at
     least one of the ${esc(e.distinct_entities)} entities in the published vocabulary. A lab with no items
     is a measured zero across the live feeds, not a gap in collection. Market position and mindshare come
     from <a href="${esc(ctx.href('/race.html'))}">the leaderboard</a>; item counts and release cadence are
     computed here.</p>
  <div class="dg__labs">${blocks}</div>
</section>`;
}

function labBlock(l) {
  const m = l.market || {};
  const rank = Number.isFinite(m.rank)
    ? `<span class="dg__labrank num">#${esc(m.rank)}</span>`
    : '<span class="dg__labrank dg__labrank--none num">&mdash;</span>';

  const stats = [
    ['Items in window', l.items],
    ['Share of corpus', l.share_of_corpus === null ? '—' : `${(l.share_of_corpus * 100).toFixed(1)}%`],
    ['Market', m.state === 'live' && m.probability_pct !== null ? `${m.probability_pct}%` : '—'],
    ['7-day', m.change_7d_state === 'live' && m.change_7d_points !== null ? signedOr(m.change_7d_points, 1) : '—'],
  ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join('');

  const lines = (l.lines || []).map((t) => `<li>${esc(t)}</li>`).join('');
  const tops = (l.top_items || []).map((t) => `<li>
    <a href="${esc(t.url)}" rel="noopener nofollow">${esc(clip(t.title, 96))}</a>
    <span class="dg__topm num">${esc(t.score)} &middot; ${esc(t.source)} &middot;
      <time datetime="${esc(t.published_at)}">${esc(utc(t.published_at))}</time></span></li>`).join('');

  return `<article class="dg__lab">
    <h3 class="dg__labh">${rank} ${esc(l.name)}
      ${l.principal ? `<span class="dg__labp">${esc(l.principal)}</span>` : ''}</h3>
    <dl class="dg__labstats">${stats}</dl>
    <ul class="dg__lablines">${lines}</ul>
    ${tops ? `<h4 class="dg__h4">Highest-scoring items naming them</h4><ul class="dg__labtop">${tops}</ul>` : ''}
    <p class="dg__labents">Matched on ${esc((l.entities || []).join(', '))}
      <span class="dg__labsrc">&mdash; vocabulary from ${esc(l.entity_source)}</span></p>
  </article>`;
}

// ---------------------------------------------------------------------------
// 5. HOW THIS PAGE IS COMPUTED
// ---------------------------------------------------------------------------

function rulesSection(d) {
  const r = d.rules || {};
  const weights = r.RULE_WEIGHT || {};
  const ruleRows = Object.keys(RULE_WORD).sort().map((id) => `<tr>
    <th scope="row"><span class="dg__rule" data-rule="${esc(id)}">${esc(RULE_WORD[id])}</span></th>
    <td class="num">${esc(weights[id] ?? '—')}</td>
    <td>${esc(RULE_EXPLAIN[id])}</td></tr>`).join('');

  const vel = d.velocity || {};
  const velLine = vel.state === 'live'
    ? `The velocity baseline is live: the corpus holds ${esc(vel.prior_hours)}h of history older than the
       brief window, against the ${esc(vel.min_prior_hours)}h a baseline needs.`
    : `The velocity baseline is awaiting data: ${esc(vel.reason || 'the prior segment is too short')}. The
       source-surge rule therefore fires for nobody in this build, and the brief says so rather than
       computing a ratio against a few hours and calling it a baseline.`;

  const engRows = (d.engagement_thresholds || []).map((t) => `<tr>
    <th scope="row"><code>${esc(t.source)}</code></th>
    <td>${esc(t.metric)}</td>
    <td class="num">${esc(t.samples)}</td>
    <td class="num">${esc(t.threshold === null ? '—' : t.threshold)}</td>
    <td class="num">${esc(t.max)}</td>
    <td class="dg__word">${esc(t.state)}</td></tr>`).join('');

  return `<section class="sec dg" aria-labelledby="dg-how-h">
  <h2 class="sec__h" id="dg-how-h">How this page is computed</h2>
  <p class="dg__key">An item enters the brief on <b>any one</b> of five rules, not on a blended score. A
     blend hides which fact did the work; five rules mean every selected item can name the comparison that
     put it there, and you can redo that comparison against <code>data/news.json</code> with a calculator.
     Ranking within the brief is the sum of the weights below, then the item&rsquo;s own news score, then
     its published time, then its id &mdash; a total order, so two runs over one file give one answer.</p>

  <div class="dg__scroll"><table class="dg__t">
    <caption class="vh">The five selection rules and their weights</caption>
    <thead><tr><th scope="col">Rule</th><th scope="col">Weight</th><th scope="col">Fires when</th></tr></thead>
    <tbody>${ruleRows}</tbody>
  </table></div>

  <h3 class="dg__h3">Velocity</h3>
  <p class="dg__key">${velLine}</p>

  ${engRows ? `<h3 class="dg__h3">Engagement thresholds</h3>
  <p class="dg__key">Computed per source from this window, not fixed in advance: Hacker News points,
     Hugging Face upvotes and Hugging Face likes run on three different scales, and a fixed cut-off does not
     survive a quiet week. A source with fewer than ${esc(d.rules.ENGAGEMENT_MIN_SAMPLES)} scored items has
     no threshold and the rule cannot fire for it.</p>
  <div class="dg__scroll"><table class="dg__t">
    <caption class="vh">Per-source engagement thresholds computed from this window</caption>
    <thead><tr><th scope="col">Source</th><th scope="col">Metric</th><th scope="col">Samples</th>
      <th scope="col">p90</th><th scope="col">Max</th><th scope="col">State</th></tr></thead>
    <tbody>${engRows}</tbody>
  </table></div>` : ''}

  <h3 class="dg__h3">The three source states</h3>
  <p class="dg__key"><b>live</b> &mdash; it answered and it is scored.
     <b>dark</b> &mdash; the fetch or the parse failed; it is excluded and never imputed.
     <b>awaiting baseline</b> &mdash; it answered perfectly and there is no frozen history to score it
     against yet. Calling the third one dark would claim an outage that is not happening, so this page
     never merges them, on any surface, in any count.</p>

  <p class="dg__key">Every threshold on this page travels inside
     <code>data/digest.json</code> beside the numbers it produced, so recomputing a selection does not mean
     matching a file against a commit. The prose version is <code>docs/DIGEST.md</code>.</p>
</section>`;
}

const RULE_EXPLAIN = {
  corroborated: 'two or more independent sources carried the same story. The strongest evidence available that an event occurred, and the one term a single-source tracker cannot compute.',
  primary_announcement: 'a lab newsroom or a release feed published it directly, at that feed\'s full declared weight — so an adapter-downgraded customer story does not count as an announcement.',
  engagement_outlier: 'its engagement is at or above the 90th percentile of what that same source carried in this window.',
  source_surge: 'that source published unusually fast against its own baseline in this window; its single highest-scoring item carries the rule.',
  frontier_salience: 'it names at least two entities from the published vocabulary, one of which is a frontier lab on the leaderboard.',
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function awaiting(reason) {
  return `<p class="dg__await"><b>AWAITING BASELINE</b>
    <span>${esc(reason || 'there is not yet enough record to compute this')}. This is the absence of a
    comparison, not a comparison that came out flat.</span></p>`;
}

function direction(delta) {
  if (!Number.isFinite(delta) || delta === 0) return { key: 'flat', glyph: '=', word: 'unchanged' };
  return delta > 0 ? { key: 'up', glyph: '▲', word: 'up' } : { key: 'down', glyph: '▼', word: 'down' };
}

function signedOr(value, decimals) {
  return Number.isFinite(value) ? signed(value, decimals) : '—';
}

/**
 * A record's timestamp, under its value.
 *
 * Minutes, not seconds, and no trailing " UTC" - the Z carries it, and the
 * three full-precision forms are still on the element (datetime and title) for
 * anything reading the page rather than looking at it. Six characters saved per
 * cell is the difference between the records table fitting a 375px phone and
 * needing a sideways swipe to reach its last column.
 */
function stamp(iso) {
  const full = utc(iso);
  return `<span class="dg__at"><time datetime="${esc(iso)}" title="${esc(full)}">${esc(full.replace(/:\d\d UTC$/, 'Z'))}</time></span>`;
}

function pct(p) {
  return Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : '—';
}

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function reportLd(ctx, d, brief) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: `${brand.NAME} daily brief`,
    headline: `${brand.NAME} daily brief — ${utc(d.as_of)}`,
    description: `${brief.shown || 0} items selected from ${brief.candidates || 0} candidates by five published rules, ` +
      `plus a structured diff of the index, the sources and the leaderboard since the previous observation.`,
    url: ctx.url(PATH),
    datePublished: d.as_of,
    dateModified: d.generated_at,
    inLanguage: 'en',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creditText: brand.NAME,
    publisher: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
    // Said in the structured data as well as in the prose, because the machine
    // reading of this page should carry the disclaimer too.
    disambiguatingDescription: brand.DISCLAIMER,
  };
}

function itemListLd(ctx, brief) {
  const items = (brief.items || []).map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: it.url,
    name: it.title,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${brand.NAME} daily brief items`,
    url: ctx.url(PATH),
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items,
  };
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
//
// Namespaced under .dg*, shipped in the page rather than in site/styles.mjs so
// the page is self-contained. No new colours beyond the five pillar hues that
// pillarCss already defines; up and down reuse --dark-src and --ok, and both
// always sit beside a glyph and a sign so the page survives greyscale.
const dgCss = `
.dg__intro { padding: var(--s-6) 0 var(--s-2); }
.dg__h1 { font-size: clamp(1.75rem, 6vw, 2.5rem); line-height: 1.08; letter-spacing: -0.02em; margin: 0 0 var(--s-3); }
.dg__key { font-family: var(--mono); font-size: var(--t-xs); line-height: 1.7; color: var(--ink-faint); margin: 0 0 var(--s-3); }
.dg__key b { color: var(--ink-dim); font-weight: 500; }
.dg__key a { color: var(--ink-dim); }
.dg__h3 { font-family: var(--mono); font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); margin: var(--s-5) 0 var(--s-2); }
.dg__h4 { font-family: var(--mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); margin: var(--s-4) 0 var(--s-2); }

.dg__stamps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-2) var(--s-4); margin: var(--s-4) 0; padding: var(--s-3) 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.dg__stamps dt { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-faint); }
.dg__stamps dd { margin: 2px 0 0; font-family: var(--mono); font-size: var(--t-xs); color: var(--ink); }
@media (min-width: 720px) { .dg__stamps { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.dg__skew { font-family: var(--mono); font-size: var(--t-xs); color: var(--stale); margin: 0 0 var(--s-3); }

.dg__await { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: baseline; margin: 0 0 var(--s-3); font-size: var(--t-sm); color: var(--ink-dim); line-height: 1.55; }
.dg__await b { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; color: var(--stale); white-space: nowrap; }
.dg__empty { display: grid; gap: 4px; font-size: var(--t-sm); color: var(--ink-dim); line-height: 1.55; }
.dg__empty b { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.12em; color: var(--ink-faint); }

/* --- the brief ---------------------------------------------------------- */
.dg__legend { list-style: none; margin: 0 0 var(--s-3); padding: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; font-family: var(--mono); font-size: 10px; color: var(--ink-faint); }
.dg__legend li { display: inline-flex; align-items: baseline; gap: 4px; }

.dg__rule { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid var(--rule); border-radius: 2px; padding: 1px 5px; color: var(--ink-dim); white-space: nowrap; }
.dg__rule[data-rule="corroborated"] { border-color: var(--accent); color: var(--accent); }

.dg__brief { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
.dg__item { position: relative; border-bottom: 1px solid var(--rule); padding: var(--s-4) 0 var(--s-4) 13px; }
.dg__item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--p, var(--rule)); opacity: 0.6; transform-origin: top; }
.dg__itemhead { display: grid; grid-template-columns: 3ch minmax(0, 1fr) auto; gap: 8px; align-items: baseline; }
.dg__rank { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); }
.dg__meta { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; font-family: var(--mono); font-size: 10.5px; color: var(--ink-dim); }
.dg__age { font-size: 10px; color: var(--ink-faint); border: 1px solid var(--rule-soft); border-radius: 2px; padding: 0 4px; }
.dg__src { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; max-width: 22ch; white-space: nowrap; }
.dg__weight { margin: 0; font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); }
.dg__weight b { font-size: 15px; color: var(--ink); }
.dg__title { grid-column: 1 / -1; font-size: 17px; line-height: 1.3; font-weight: 500; letter-spacing: -0.012em; margin: 6px 0 0; overflow-wrap: anywhere; }
.dg__title a { text-decoration: none; }
.dg__title a:hover { text-decoration: underline; text-decoration-color: var(--p, var(--accent)); }
.dg__sub { font-size: var(--t-sm); color: var(--ink-faint); margin: 5px 0 0; line-height: 1.5; }
.dg__rules { display: flex; flex-wrap: wrap; gap: 5px; margin: 9px 0 0; }
.dg__why { list-style: none; margin: 9px 0 0; padding: 0 0 0 11px; border-left: 1px solid var(--rule); display: grid; gap: 4px; }
.dg__why li { font-family: var(--mono); font-size: var(--t-xs); line-height: 1.6; color: var(--ink-dim); }

/* --- tables ------------------------------------------------------------- */
/* Tables scroll inside their own box rather than widening the page. body
   carries overflow-x:hidden (site/styles.mjs) so this can never become a page
   scroll, and overscroll-behavior-x:contain stops a horizontal swipe on a
   table chaining into the browser's back gesture - the same pairing
   styles.mjs already uses for its own scrollers. */
.dg__scroll { overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; margin: 0 0 var(--s-3); }
.dg__t { width: 100%; border-collapse: collapse; font-size: var(--t-sm); }
.dg__t th, .dg__t td { text-align: left; padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rule-soft); vertical-align: baseline; white-space: nowrap; }
.dg__t thead th { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); font-weight: 500; border-bottom-color: var(--rule); }
.dg__t tbody th { font-weight: 500; color: var(--ink); }
.dg__t tbody th .ptag { margin-right: 5px; }
.dg__t td { color: var(--ink-dim); }
.dg__t td:last-child { white-space: normal; }
.dg__trtotal th, .dg__trtotal td { border-bottom-color: var(--rule); }
.dg__trtotal th { font-weight: 700; }
.dg__delta { font-variant-numeric: tabular-nums; }
[data-dir="up"] .dg__delta, .dg__streak[data-dir="up"] .dg__delta, .dg__mover[data-dir="up"] .dg__delta { color: var(--dark-src); }
[data-dir="down"] .dg__delta, .dg__streak[data-dir="down"] .dg__delta, .dg__mover[data-dir="down"] .dg__delta { color: var(--ok); }
[data-dir="flat"] .dg__delta { color: var(--ink-faint); }
.dg__word { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); }
.dg__nostate { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); white-space: normal; }
.dg__at { display: block; font-size: 9.5px; color: var(--ink-faint); letter-spacing: 0; }

/* --- source transitions ------------------------------------------------- */
.dg__translist, .dg__movers, .dg__streaks, .dg__firsts { list-style: none; margin: 0 0 var(--s-3); padding: 0; display: grid; gap: 6px; }
.dg__trans, .dg__mover, .dg__streak { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 7px 9px; border: 1px solid var(--rule); border-left-width: 2px; border-radius: 2px; background: var(--bg-raised); font-size: var(--t-sm); }
.dg__trans[data-kind="went_dark"] { border-left-color: var(--dark-src); }
.dg__trans[data-kind="came_back"], .dg__trans[data-kind="newly_calibrated"] { border-left-color: var(--ok); }
.dg__transw { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink); }
.dg__transs { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); }
.dg__mover[data-dir="up"] { border-left-color: var(--dark-src); }
.dg__mover[data-dir="down"] { border-left-color: var(--ok); }
.dg__streak[data-dir="up"] { border-left-color: var(--dark-src); }
.dg__streak[data-dir="down"] { border-left-color: var(--ok); }
.dg__streakn { font-size: 17px; font-weight: 700; color: var(--ink); }
.dg__streakw { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); }
.dg__tally { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); margin: 0 0 5px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
.dg__tally b { color: var(--ink-dim); font-weight: 500; min-width: 11ch; }
.dg__state { border: 1px solid var(--rule); border-radius: 2px; padding: 0 5px; }
.dg__state[data-state="dark"] { color: var(--dark-src); border-color: var(--dark-src); }
.dg__state[data-state="live"] { color: var(--ok); border-color: var(--ok); }
.dg__state[data-state="awaiting-baseline"], .dg__state[data-state="dormant"] { color: var(--stale); border-color: var(--stale); }

.dg__first { display: grid; gap: 2px; padding: 8px 9px; border: 1px solid var(--rule); border-left: 2px solid var(--accent); border-radius: 2px; background: var(--bg-raised); }
.dg__firstw, .dg__firstt { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); }
.dg__firstt { color: var(--ink-dim); }

.dg__facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.dg__facts li { font-family: var(--mono); font-size: var(--t-xs); line-height: 1.65; color: var(--ink-dim); padding-left: 13px; position: relative; }
.dg__facts li::before { content: '·'; position: absolute; left: 3px; color: var(--accent); }

/* --- per-lab ------------------------------------------------------------ */
.dg__labs { display: grid; gap: var(--s-3); }
@media (min-width: 760px) { .dg__labs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.dg__lab { border: 1px solid var(--rule); border-radius: 3px; padding: var(--s-3); background: var(--bg-raised); }
.dg__labh { display: flex; align-items: baseline; flex-wrap: wrap; gap: 7px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 var(--s-2); }
.dg__labrank { font-family: var(--mono); font-size: var(--t-xs); color: var(--accent); }
.dg__labrank--none { color: var(--ink-faint); }
.dg__labp { font-family: var(--mono); font-size: 10.5px; font-weight: 400; color: var(--ink-faint); }
.dg__labstats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 0 0 var(--s-2); padding: 8px 0; border-top: 1px solid var(--rule-soft); border-bottom: 1px solid var(--rule-soft); }
.dg__labstats dt { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); }
.dg__labstats dd { margin: 2px 0 0; font-family: var(--mono); font-size: 13px; color: var(--ink); }
.dg__lablines { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
.dg__lablines li { font-family: var(--mono); font-size: 10.5px; line-height: 1.6; color: var(--ink-dim); }
.dg__labtop { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.dg__labtop li { font-size: var(--t-sm); line-height: 1.4; }
.dg__labtop a { text-decoration: none; color: var(--ink); }
.dg__labtop a:hover { text-decoration: underline; text-decoration-color: var(--accent); }
.dg__topm { display: block; font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); margin-top: 2px; }
.dg__labents { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); margin: var(--s-2) 0 0; }
.dg__labsrc { color: var(--rule); }

/* 375px: the four-up stat row becomes two-up before anything truncates. */
@media (max-width: 420px) {
  /* Only on the records table, whose last column restates in a word what the
     row already shows in numbers. Never on the rules table, whose last column
     IS the explanation; and never on the index table, whose unscored rows put
     their "no score" note in a colspan cell that happens to be last. */
  .dg__t--drop th:last-child, .dg__t--drop td:last-child { display: none; }
  .dg__labstats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dg__itemhead { grid-template-columns: minmax(0, 1fr) auto; }
  .dg__rank { display: none; }
  .dg__title, .dg__sub, .dg__rules, .dg__why { grid-column: 1 / -1; }
}

/* Motion. The rail beside a brief item wipes in, because the item is a new
   selection; nothing that carries a number animates, because a number faded in
   from opacity 0 is a blank number in a screenshot taken at 200ms and
   screenshots are the growth loop. */
@media (prefers-reduced-motion: no-preference) {
  .dg__item::before { animation: dcDgRail 460ms ease-out backwards; }
  .dg__item:nth-child(2)::before { animation-delay: 70ms; }
  .dg__item:nth-child(3)::before { animation-delay: 140ms; }
  .dg__item:nth-child(4)::before { animation-delay: 210ms; }
  .dg__item:nth-child(n+5)::before { animation-delay: 280ms; }
  @keyframes dcDgRail { from { transform: scaleY(0); } to { transform: scaleY(1); } }
}
`;

/** All CSS the digest page needs. */
export function digestCss() {
  return [pillarCss, dgCss].join('\n');
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs owns these calls)
//
//   1. read data/digest.json, tolerating ENOENT, and put it on ctx.digest -
//      the same three lines that already load data/news.json and data/race.json
//   2. import * as digestPage from './templates/digestPage.mjs';
//   3. if (digestPage.hasDigest(ctx)) write 'digest.html' with digestPage.render(ctx)
//   4. if (digest) write 'api/digest.json' with stableJson(digest)
//   5. add '/digest.html' to sitemap.mjs and a nav entry in layout.mjs NAV
//
// hasDigest(ctx) is false when the file is absent, and render(ctx) still
// produces a valid noindex page in that case, so either wiring is safe.
// ---------------------------------------------------------------------------
