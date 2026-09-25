// /leaders.html — the leader wire in full: every line, every leader, and the
// reconciliation against the watch floor.
//
// ---------------------------------------------------------------------------
// WHY THIS PAGE EXISTS AT ALL
// ---------------------------------------------------------------------------
//
// docs/VISITORS.md counts twelve arrival clusters. Three of them ask a
// question this site could not answer until now, and all three ask it in the
// same words: *what are these people actually saying?* The journalist on
// deadline (6 of 100) needs a dated, citable line with a publication on it.
// The policy staffer (5 of 100) needs to know whether a named principal has
// gone on the record this week. The returner (7 of 100 — served by nobody)
// needs one page that is different from the last time they looked, and a
// roster of fifteen people is the single most reliably-changing thing on this
// site short of the feed itself.
//
// It is also the counter to the one place pizzint's live column genuinely
// wins: personality. Theirs relays X posts, which means faces and names and
// somebody talking. Ours relays headlines from outlets with editors — which is
// slower, and is the reason every line here can be clicked and checked.
//
// ---------------------------------------------------------------------------
// THE RULE, AGAIN, BECAUSE THIS IS THE PAGE WHERE IT WOULD BE TEMPTING
// ---------------------------------------------------------------------------
//
// A page called "what the leaders said" wants a pull-quote. It wants a big
// serif line with somebody's name under it. There is no such element in this
// file and there must never be one: we do not hold a transcript, we hold a
// headline, and a headline set in quotation marks under a person's photograph
// is an invented quotation with good typography. Every attributed string on
// this page is `line.headline`, printed whole, linked to the outlet that ran
// it. The section below headed "What this page never does" says so to the
// reader as well, because a promise the reader cannot see is a promise that
// only protects us.

import { esc, utc, utcDay } from './_html.mjs';
import { row, wireStyles, legend } from './_leaderwire.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/leaders.html';

// Structured data is capped for the same reason newsPage.mjs caps it: a
// pretty-printed graph larger than the markup it describes is a slow page and
// a worse audit. Fifteen leaders cannot plausibly carry more lines than this
// in a seven-day window, so the cap is a guard rather than a policy.
const JSONLD_MAX = 60;

/** build.mjs guard: is there anything to build this page from? */
export function hasLeaders(ctx) {
  return Boolean(ctx && ctx.leaders && Array.isArray(ctx.leaders.leaders) && ctx.leaders.leaders.length);
}

export function render(ctx) {
  if (!hasLeaders(ctx)) return emptyPage(ctx);
  const wire = ctx.leaders;
  const t = wire.totals;
  const onRecord = wire.leaders.filter((l) => l.state === 'on_record');
  const quiet = wire.leaders.filter((l) => l.state === 'no_line');

  const main = `<style>${wireStyles()}${pageCss()}</style>
<section class="lwp__intro">
  <h1 class="lwp__h1">The leader wire</h1>
  <p class="lede">What the people running AI said on the record in the last
     ${esc(wire.window_days)} days, in the words their publications printed.
     ${esc(t.on_record)} of ${esc(t.leaders)} are on the record this week across
     ${esc(t.lines)} line${t.lines === 1 ? '' : 's'}; the other ${esc(t.no_line)} are listed too,
     because a name missing from a list and a name with nothing beside it are different facts.
     Compiled ${esc(utc(wire.generated_at))} from the same
     ${esc(wire.corpus.items)}-item corpus as the signal feed.</p>
  ${scoreboard(wire)}
</section>

<section class="sec lwp__rule" aria-labelledby="lwp-rule-h">
  <h2 class="sec__h" id="lwp-rule-h">What this page never does</h2>
  <p class="lwp__ruletext"><b>It never writes a quotation.</b> Not a paraphrase, not a summary, not
     a tightened version of what somebody said. The only words attributed to a named person
     anywhere on this page are the headline, reproduced exactly as the publication printed it and
     linked to that publication. There is no transcript here, so there is no quotation here.</p>
  <p class="lwp__ruletext">Attributing invented words to a living person is the one error this site
     could not recover from. A wrong number is checkable against a published formula; an invented
     sentence is checkable against nothing, and the person has to deny it. Headline-only means
     every line below can be verified in one click, by anyone, including by the person named in
     it.</p>
</section>

${legend(wire)}
<section class="sec lw" aria-labelledby="lwp-wire-h">
  <h2 class="sec__h" id="lwp-wire-h">The roster</h2>
  <ol class="lw__l">${wire.leaders.map((l) => row(l)).join('')}</ol>
</section>

${crossCheck(wire)}

${method(ctx, wire, onRecord, quiet)}`;

  return page({
    ctx,
    path: PATH,
    title: `The leader wire — ${t.on_record} of ${t.leaders} on the record · ${brand.NAME}`,
    ogTitle: `${brand.NAME} leader wire — ${t.on_record} of ${t.leaders} on the record`,
    description:
      `What the people running AI said on the record in the last ${wire.window_days} days: ` +
      `${t.lines} headline${t.lines === 1 ? '' : 's'} naming ${t.on_record} of ${t.leaders} ` +
      `leaders, each reproduced exactly as its publication printed it and linked to the source. ` +
      `Compiled ${utc(wire.generated_at)}.`,
    ogImage: ctx.cardFor && ctx.state ? ctx.cardFor(ctx.state.receipt_id) : null,
    ogImageAlt: `${brand.NAME} share card`,
    jsonld: [collectionPage(ctx, wire), itemList(ctx, wire)],
    main,
  });
}

/**
 * ctx.leaders absent. The page still builds, says which of the two absences it
 * is, and carries noindex — an empty roster in Google's cache is worse than no
 * roster. build.mjs can also just skip the file; hasLeaders(ctx) is the guard.
 */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `The leader wire · ${brand.NAME}`,
    description: `${brand.NAME} has not published a leader wire in this build.`,
    main: `<style>${wireStyles()}${pageCss()}</style>
<section class="lwp__intro">
  <h1 class="lwp__h1">The leader wire</h1>
  <p class="lede">No wire was published in this build. This is the absence of a result, not a
     result: it does not mean nobody spoke this week, it means <code>data/leaders.json</code> was
     not present when this page was generated. When it is, every one of the fifteen people on the
     roster is rendered here — including the ones with nothing beside their name.</p>
</section>`,
  });
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Four figures, above the fold, each with its denominator.
 *
 * docs/VISITORS.md §3's second conclusion is that we win the slow clusters and
 * lose the fast ones — every cluster we serve has a budget over 45 seconds. A
 * reader holding a phone decides in four. These are the four numbers that
 * answer "is anything here" without a scroll.
 */
function scoreboard(wire) {
  const t = wire.totals;
  const cells = [
    { v: `${t.on_record}/${t.leaders}`, k: 'on the record', s: `of the fixed roster` },
    { v: t.lines, k: `line${t.lines === 1 ? '' : 's'}`, s: `${t.distinct_items} distinct item${t.distinct_items === 1 ? '' : 's'}` },
    { v: t.no_line, k: 'no line', s: 'listed anyway' },
    { v: `${wire.window_days}d`, k: 'window', s: `${wire.corpus.items_in_window} items scanned` },
  ];
  return `<dl class="lwp__sb">${cells.map((c) => `
    <div class="lwp__sbc">
      <dt class="lwp__sbk">${esc(c.k)}</dt>
      <dd class="lwp__sbv num">${esc(c.v)}<span class="lwp__sbs">${esc(c.s)}</span></dd>
    </div>`).join('')}</dl>`;
}

/**
 * The reconciliation the brief's §3 asks for, in full.
 *
 * collector/race.mjs reports `no_feed` for six of its eight principals and
 * `dormant` for a seventh, because darioamodei.com serves no feed, hassabis.com
 * is a 114-byte JavaScript redirect, and the rest post on X, where scraping
 * carries an explicit permanent-suspension penalty. Read beside this wire
 * those two readings look like a contradiction. They are not, and the fix is
 * not to soften either one — it is to say what each measures:
 *
 *   the watch floor measures FEEDS WE MAY FETCH.
 *   the wire measures WHAT PUBLICATIONS PRINTED.
 *
 * Where the floor is empty and the wire has lines, the wire is right about the
 * person having spoken, and it names the outlet the line came from. Where both
 * are empty, they are two separate silences and neither is imputed from the
 * other. Every verdict is computed in collector/leaders.mjs and published on
 * the row, so this page and /race cannot drift into two different sentences
 * about the same person.
 */
function crossCheck(wire) {
  const tracked = wire.leaders.filter((l) => l.watch_floor && l.watch_floor.tracked);
  const untracked = wire.leaders.filter((l) => !l.watch_floor || !l.watch_floor.tracked);
  if (!tracked.length) return '';

  const VERDICT = {
    wire_fills_gap: 'the wire fills the gap',
    both_quiet: 'both quiet',
    both_live: 'both carry a reading',
    floor_only: 'floor only',
  };

  return `<section class="sec lwp__cc" aria-labelledby="lwp-cc-h">
  <h2 class="sec__h" id="lwp-cc-h">Cross-check against the watch floor</h2>
  <p class="lwp__ruletext">The race page tracks a loudness signal for each lab's principal, and
     seven of its eight cells are empty — not because those people are quiet, but because
     <b>the floor measures feeds we may lawfully fetch</b> and almost none of them publish one.
     This wire measures a different thing: <b>what publications printed</b>. Where the floor is
     empty and the wire has lines, the wire is the better reading of whether the person spoke, and
     it names the outlet the line came from. Where both are empty, they are two separate silences,
     and neither is imputed from the other.</p>
  <ul class="lwp__cl">${tracked.map((l) => {
    const wf = l.watch_floor;
    return `<li class="lwp__ci" data-verdict="${esc(wf.verdict)}">
      <p class="lwp__cn"><b>${esc(l.name)}</b>
        <span class="lwp__cv">${esc(VERDICT[wf.verdict] || wf.verdict)}</span></p>
      <p class="lwp__cs"><span class="lwp__ck">FLOOR</span> ${esc(String(wf.state).replace(/_/g, ' '))}${
        wf.feed ? ` · ${esc(wf.feed)}` : ''}${wf.reason ? ` — ${esc(wf.reason)}` : ''}</p>
      <p class="lwp__cs"><span class="lwp__ck">WIRE</span> ${esc(l.count)} line${l.count === 1 ? '' : 's'}${
        l.sources.length ? ` from ${esc(l.sources.join(', '))}` : ''}</p>
      <p class="lwp__cw">${esc(wf.note)}</p>
    </li>`;
  }).join('')}</ul>
  <p class="lwp__note">${esc(untracked.length)} of the ${esc(wire.totals.leaders)} people on this
     roster are not principals on the watch floor${untracked.length ? ` — ${esc(untracked.map((l) => l.name).join(', '))}` : ''}.
     For them the wire is the only reading, and it is labelled that way on the row rather than
     left to look like an agreement.</p>
</section>`;
}

/** The published vocabulary: how a line gets here, and what it cost. */
function method(ctx, wire, onRecord, quiet) {
  const c = wire.corpus;
  const cues = wire.cues || { core: [], extended: [] };
  const classes = (cues.class_means && Object.entries(cues.class_means)) || [];

  return `<section class="sec lwp__m" aria-labelledby="lwp-m-h">
  <h2 class="sec__h" id="lwp-m-h">How a line gets here</h2>
  <dl class="lwp__dl">
    <div><dt>The test</dt><dd>A headline in <code>data/news.json</code> is a line when it
      <b>names a roster member</b> — whole word, against the published alias table below — <b>and
      carries a speech cue</b>. Both conditions, every time. ${esc(c.named_without_cue)}
      headline${c.named_without_cue === 1 ? '' : 's'} in this window named one of these people and
      carried no cue, and ${c.named_without_cue === 1 ? 'it was' : 'they were'} excluded rather
      than printed as speech.</dd></div>
    <div><dt>The cues</dt><dd><b>${esc(cues.core.length)} core</b>:
      <code>${esc(cues.core.join(' · '))}</code>, plus any words the publication put in double
      quotation marks in its own headline. <b>${esc(cues.extended.length)} extended</b>, and this
      is an editorial judgement rather than a measurement:
      <code>${esc(cues.extended.join(' · '))}</code>. Every line records which list caught it.</dd></div>
    ${classes.length ? `<div><dt>Cue classes</dt><dd>${classes.map(([k, v]) =>
      `<b>${esc(k)}</b> — ${esc(v)}`).join('<br>')}</dd></div>` : ''}
    <div><dt>The roster</dt><dd>Fifteen people, fixed order, never pruned. The matching vocabulary
      is data, not a heuristic: no fuzzy matching, no edit distance, no initial inference. If a
      spelling is not in the table it does not match.
      <ul class="lwp__al">${wire.leaders.map((l) =>
        `<li><b>${esc(l.name)}</b> <span>${esc(l.role)} · ${esc(l.org)}</span>
          <code>${esc(l.aliases.join(' · '))}</code></li>`).join('')}</ul></dd></div>
    <div><dt>Two names we deliberately do not match</dt><dd>Bare <code>Huang</code> and bare
      <code>Liang</code> are absent from the table. Both are among the commonest surnames on earth
      and this corpus carries chip-supply and research headlines by the hundred; a bare match would
      put a stranger's words under a named living person's row.
      <code>Jensen</code> and <code>Wenfeng</code> are distinctive enough to keep. For the same
      reason a bare surname preceded by a different given name is ruled out —
      <code>Daniela Amodei</code> is not <code>Dario Amodei</code>.</dd></div>
    <div><dt>The window</dt><dd>${esc(wire.window_days)} days, ${esc(c.items_in_window)} of
      ${esc(c.items)} items scanned, oldest ${esc(c.oldest_item_at ? utcDay(c.oldest_item_at) : '—')}.
      ${c.window_binds ? `The corpus is capped at ${esc(c.max_items)} items and on a busy week
      <b>the cap binds long before the window does</b>, so this is the last
      ${esc(c.items)} items rather than a full seven days of everything published.` : ''}</dd></div>
    <div><dt>What it cannot see</dt><dd>Everything these fifteen people said that no outlet in our
      source list put in a <em>headline</em>. A podcast nobody wrote up, a post on X, a remark in a
      filing — all invisible here. ${esc(quiet.length)} of ${esc(wire.totals.leaders)} rows read
      <b>no line</b> this week, and that is a statement about this corpus, not about those
      people.</dd></div>
  </dl>
  <p class="lwp__note">Matcher version <b class="num">${esc(wire.matcher_version)}</b>. Every input
     behind this page is in <a href="${esc(ctx.href('/api/leaders.json'))}">api/leaders.json</a>,
     including the cue, the class and the alias that matched on every single line.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function collectionPage(ctx, wire) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The leader wire',
    url: ctx.url(PATH),
    isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
    datePublished: wire.generated_at,
    dateModified: wire.generated_at,
    description:
      `Headlines from the last ${wire.window_days} days naming the people running AI, each ` +
      `reproduced exactly as its publication printed it and linked to the source.`,
  };
}

// The graph lists the LINKS, not the sentences: every entry is a url plus the
// headline as its name, with no author, no creator and no quotation object. We
// are not the publisher of these headlines and the markup must not imply that
// we are.
function itemList(ctx, wire) {
  const lines = wire.leaders.flatMap((l) => l.lines).slice(0, JSONLD_MAX);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Leader wire lines',
    url: ctx.url(PATH),
    numberOfItems: wire.totals.lines,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: lines.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: l.url,
      name: l.headline,
    })),
  };
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

// Everything the roster itself needs comes from _leaderwire.wireStyles(), so
// the homepage module and this page cannot drift apart. Only the page
// furniture is below.
function pageCss() {
  return `
.lwp__intro { margin: 0 0 var(--sec); }
.lwp__h1 { font-size: var(--d-title); line-height: 1.05; letter-spacing: -0.02em; margin: 0 0 var(--s-3); }

.lwp__sb { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; margin: var(--s-4) 0 0;
  background: var(--rule); border: 1px solid var(--rule); border-radius: var(--radius); overflow: hidden; }
@media (min-width: 720px) { .lwp__sb { grid-template-columns: repeat(4, 1fr); } }
.lwp__sbc { background: var(--bg); padding: var(--s-3); }
.lwp__sbk { font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-faint); }
.lwp__sbv { margin: 2px 0 0; font-family: var(--mono); font-size: var(--t-lg); font-weight: 700; color: var(--ink);
  display: flex; flex-direction: column; gap: 2px; }
.lwp__sbs { font-size: var(--t-2xs); font-weight: 400; color: var(--ink-faint); letter-spacing: 0.02em; }

.lwp__ruletext { max-width: var(--measure); font-size: var(--t-sm); line-height: 1.65; color: var(--ink-dim); margin: 0 0 var(--row); }
.lwp__ruletext b { color: var(--ink); font-weight: 600; }

.lwp__cl { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
@media (min-width: 720px) { .lwp__cl { grid-template-columns: repeat(2, 1fr); } }
.lwp__ci { border: 1px solid var(--rule); border-radius: var(--radius); padding: var(--s-3); background: var(--bg-raised); }
/* The verdict is a WORD in the row. The left edge is confirmation only, and it
   is a border width rather than a hue so it survives greyscale. */
.lwp__ci[data-verdict="wire_fills_gap"] { border-left: 3px solid var(--accent); }
.lwp__cn { margin: 0 0 var(--s-2); display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--s-2); }
.lwp__cn b { font-size: var(--t-sm); }
.lwp__cv { font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-dim); }
.lwp__cs { margin: 0 0 3px; font-family: var(--mono); font-size: var(--t-2xs); line-height: 1.6; color: var(--ink-faint); }
.lwp__ck { display: inline-block; min-width: 5ch; letter-spacing: 0.12em; color: var(--ink-dim); }
.lwp__cw { margin: var(--s-2) 0 0; font-size: var(--t-xs); line-height: 1.6; color: var(--ink-dim); }

.lwp__dl { margin: 0; }
.lwp__dl > div { padding: var(--s-3) 0; border-top: 1px solid var(--rule); }
.lwp__dl dt { font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-faint); margin-bottom: 4px; }
.lwp__dl dd { margin: 0; font-size: var(--t-sm); line-height: 1.65; color: var(--ink-dim); max-width: var(--measure); }
.lwp__dl dd b { color: var(--ink); font-weight: 600; }
.lwp__dl code { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim);
  background: var(--bg-raised); border: 1px solid var(--rule-soft); border-radius: 2px; padding: 0 3px;
  overflow-wrap: anywhere; }

.lwp__al { list-style: none; margin: var(--s-2) 0 0; padding: 0; display: grid; gap: 5px; }
.lwp__al li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 6px; font-size: var(--t-xs); }
.lwp__al span { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); }

.lwp__note { margin: var(--s-3) 0 0; font-family: var(--mono); font-size: var(--t-2xs);
  line-height: 1.7; color: var(--ink-faint); }
.lwp__note a { color: var(--ink-dim); }
`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs owns these calls)
//
//   build.mjs:
//     1. read data/leaders.json, tolerate ENOENT -> ctx.leaders = null,
//        exactly as ctx.news is read today.
//     2. import * as leadersPage from './templates/leadersPage.mjs';
//        if (leadersPage.hasLeaders(ctx)) {
//          written.push(await write(args.out, 'leaders.html', leadersPage.render(ctx)));
//        }
//     3. copy data/leaders.json to public/api/leaders.json beside the other
//        api/*.json files — the method section links it as the audit trail and
//        a link to a 404 is worse than no link.
//
// render(ctx) is safe to call unconditionally: with ctx.leaders null it emits a
// noindex "no wire published" page.
//
// Also needed, and neither is mine to edit:
//   layout.mjs   SECTIONS entry { href: '/leaders.html', label: 'Leaders',
//                short: 'Leaders', needs: 'leaders' }, and a hasSection() arm
//                `if (key === 'leaders') return Boolean(ctx.leaders && ...)`
//                matching build.mjs's gate.
//   sitemap.mjs  add /leaders.html, changefreq hourly, priority 0.8.
//   collector    run collector/leaders.mjs after collector/news.mjs in the
//                workflow; it reads data/news.json and data/race.json and
//                writes data/leaders.json, and makes no network call.
// ---------------------------------------------------------------------------
