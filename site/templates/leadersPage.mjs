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
import { lineItem, wireStyles, legend } from './_leaderwire.mjs';
import { avatarPortrait, avatarSprite, personIdFor, portraitCss, PEOPLE } from './_avatars.mjs';
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

  const main = `<style>${wireStyles()}${portraitCss()}${pageCss()}</style>
${avatarSprite()}
<section class="lwp__intro">
  <h1 class="lwp__h1">The leader wire</h1>
  <p class="lede">What the people running AI said on the record in the last
     ${esc(wire.window_days)} days, in the words their publications printed.
     ${esc(t.on_record)} of ${esc(t.leaders)} are on the record this week across
     ${esc(t.lines)} line${t.lines === 1 ? '' : 's'}; the other ${esc(t.no_line)} are listed too,
     because a name missing from a list and a name with nothing beside it are different facts.
     Compiled ${esc(utc(wire.generated_at))} from the same
     ${esc(wire.corpus.items)}-item corpus as the signal feed.</p>
  ${recordBoard(wire)}
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
  <p class="lwp__marks">The mark beside each name is an <b>abstract monogram</b> — a geometric
     emblem keyed to the person's initials and their organisation. It is not a portrait, not a
     likeness and not a caricature, and no photograph of any person appears anywhere on this site.
     The shape tells you which organisation; <b>the name printed beside it is the
     identification</b>, and you are never asked to recognise a face.</p>
  <ol class="lwr">${wire.leaders.map((l) => card(l)).join('')}</ol>
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
 * One leader, as a card with a mark you can actually see.
 *
 * The old row printed a 26px box with two letters in it and put fifteen of
 * them in a bordered list; measured on the built page, the largest graphic
 * anywhere on /leaders was 64 pixels square and eleven of the twelve SVGs were
 * 16px icons. A page whose entire subject is fifteen named people had nothing
 * on it to look at.
 *
 * WHAT DID NOT CHANGE, AND MUST NOT. The lines are still rendered by
 * _leaderwire.lineItem(), which is the module that owns the contract this page
 * exists to keep: the headline verbatim, whole, linked, with the outlet that
 * printed it beside it. A visual redesign is exactly the change that quietly
 * detaches a quote from its source or trims one to fit a column, so the quote
 * markup is not reimplemented here — it is imported.
 *
 * The anchor is unchanged too. /leaders.html#lw-altman is a permalink to one
 * person, documented in _leaderwire.row(), and a redesign that silently
 * renumbered the fragments would break every link anyone has sent.
 */
function card(l) {
  const onRecord = l.state === 'on_record';
  const pid = personIdFor(l.id);

  // A sixteenth person appearing in data/leaders.json before _avatars.mjs has
  // a mark for them is a real possibility, and it renders as an honest gap
  // rather than as a broken card: the name, the org and the lines are all
  // still here, because none of them came from the avatar module.
  const portrait = pid
    ? avatarPortrait(pid, { decorative: true, idPrefix: 'lwc' })
    : '<p class="lwc__nomark">no mark<br>published</p>';

  const state = onRecord
    ? `<p class="lwc__st"><b class="lwc__stn num">${esc(l.count)}</b>` +
      `<span>line${l.count === 1 ? '' : 's'} on the record</span></p>`
    // A sentence, not a dash. The rule _leaderwire.row() states: a dash in a
    // cell is what a missing value looks like, and this is a measured absence.
    : '<p class="lwc__st"><span>no line this week</span></p>';

  const body = onRecord
    ? `<ol class="lw__ll">${l.lines.map(lineItem).join('')}</ol>`
    : '<p class="lw__none">Nothing on the record this week.</p>';

  return `<li class="lwr__i lwc" id="lw-${esc(l.id)}" data-state="${esc(l.state)}"` +
    `${pid ? ` data-person="${esc(pid)}"` : ''} data-org="${esc(l.org_id)}">
  <div class="lwc__hd">
    ${portrait}
    <div class="lwc__who">
      <b class="lwc__n">${esc(l.name)}</b>
      <span class="lwc__o">${esc(l.role)} · ${esc(l.org)}</span>
      ${state}
    </div>
  </div>
  <div class="lwc__body">${body}${floorNote(l)}</div>
</li>`;
}

/**
 * The watch-floor reconciliation on the row, where there is one to print.
 *
 * This is _leaderwire.floorNote()'s twin and prints the same fields from the
 * same published verdict; that function is module-private, so the markup is
 * reproduced rather than imported, and it deliberately reuses that module's
 * `.lw__wf` paint so the two cannot drift apart visually. Only wire_fills_gap
 * prints here, for the reason given there: the other three verdicts are true
 * but unremarkable, and the cross-check section below prints all four.
 */
function floorNote(l) {
  const wf = l.watch_floor;
  if (!wf || wf.verdict !== 'wire_fills_gap') return '';
  return `<p class="lw__wf" title="${esc(wf.reason || wf.note)}">
    <span class="lw__wfk">WATCH FLOOR</span>
    <span>${esc(String(wf.state || '').replace(/_/g, ' '))}${wf.feed ? ` · ${esc(wf.feed)}` : ''} —
      the line came from ${esc(l.sources.join(', '))} instead.</span>
  </p>`;
}

// ---------------------------------------------------------------------------
// The board — who is on the record, and who is not
// ---------------------------------------------------------------------------

// TWO GEOMETRIES, NOT ONE STRETCHED GEOMETRY, and the breakpoint is 640px
// because that is where _charts.mjs puts it and where site/styles.mjs already
// switches .ch__svg--sm for .ch__svg--lg. Reusing that contract rather than
// inventing a second one is why this file ships no media query of its own for
// the board: three columns of five on a desktop, two columns of eight on a
// phone, and the sheet decides which is in the document's flow.
// embX/nameX/countFs are tuned against the LONGEST NAME ON THE ROSTER, not
// eyeballed: "Koray Kavukcuoglu" is 17 characters, JetBrains Mono advances at
// 0.6em, and at the phone geometry's first draft (nameX 42, 10.5px) that is
// 107 units of text into 103 units of room — the name ran under the count and
// two cells rendered "Koray Kavukcuoglu_". The name never shrinks to fit and
// is never truncated, so the room moved instead. checkBoardFit() below states
// the invariant the numbers have to satisfy.
const BOARD_LG = {
  w: 720, pad: 14, cols: 3, cellH: 58, colGap: 12, rowGap: 8,
  headH: 62, tallyY: 74, tallyH: 18, gridY: 108,
  emb: 30, embX: 10, nameX: 50, nameFs: 12, subFs: 9.5, countFs: 18,
};
// The phone is ONE COLUMN AND ONE LINE PER PERSON, and that is a measured
// decision rather than a stylistic one. Two columns of 164 units cannot hold a
// seventeen-character name beside a count at any size a phone can read: the
// arithmetic in checkBoardFit() came out 15 units short at 10px type, and the
// only ways to close it were to shrink the name below this site's legibility
// floor or to truncate it. Both are worse than a taller graphic, so the roster
// goes full-width and the sub moves onto the name's own baseline.
const BOARD_SM = {
  w: 356, pad: 10, cols: 1, cellH: 30, colGap: 0, rowGap: 4,
  headH: 58, tallyY: 66, tallyH: 15, gridY: 92,
  emb: 22, embX: 6, nameX: 34, nameFs: 11, subFs: 9, countFs: 15,
  singleLine: true, subRight: 44,
};

// JetBrains Mono advances at 0.6em. Used only to CHECK a layout, never to
// place a glyph — the browser does the typesetting.
const MONO_ADVANCE = 0.6;

/**
 * Does the longest name on this roster fit beside the count, in both
 * geometries? A name that does not fit is a rendering bug that only appears
 * when someone with a long name is added to data/leaders.json, which is
 * exactly the change nobody re-screenshots. So it fails the build instead.
 */
function checkBoardFit(rows, subFor) {
  const longest = rows.reduce((a, l) => (l.name.length > a.length ? l.name : a), '');
  const longestSub = rows.reduce((a, l) => {
    const t = subFor(l);
    return t.length > a.length ? t : a;
  }, '');
  for (const g of [BOARD_LG, BOARD_SM]) {
    const colW = (g.w - g.pad * 2 - g.colGap * (g.cols - 1)) / g.cols;
    // The count is right-anchored at colW - 10 and is allowed three digits: a
    // 999-line week is absurd, but a layout that breaks on one is a layout
    // that breaks on a good news day.
    const countLeft = colW - 10 - 3 * g.countFs * MONO_ADVANCE;
    const fits = (what, text, fs, x, limit) => {
      const needed = text.length * fs * MONO_ADVANCE;
      if (x + needed > limit) {
        throw new Error(
          `leadersPage: ${what} "${text}" needs ${needed.toFixed(1)} units in the ` +
          `${g.cols}-column board and there are ${(limit - x).toFixed(1)}. Widen the cell or move ` +
          'the column; do not shrink or truncate the text.');
      }
    };
    if (g.singleLine) {
      // name, then the sub right-anchored before the count, all on one baseline
      const subLeft = colW - g.subRight - longestSub.length * g.subFs * MONO_ADVANCE;
      fits('name', longest, g.nameFs, g.nameX, subLeft - 6);
      fits('sub', longestSub, g.subFs, subLeft, countLeft - 6);
    } else {
      fits('name', longest, g.nameFs, g.nameX, countLeft - 6);
      fits('sub', longestSub, g.subFs, g.nameX, colW - 10);
    }
  }
}

/**
 * The page's largest graphic, and the one the brief asked for by name.
 *
 * "2/15" is the most interesting number on this page and it was being printed
 * as four characters in a definition list. It is a roster-shaped fact — WHICH
 * two, out of WHICH fifteen — so it is drawn as the roster: a fifteen-segment
 * tally in the fixed roster order, then one cell per person carrying their
 * mark, their name, and their line count.
 *
 * THE ENCODING NEVER RESTS ON HUE. A person on the record has a solid cell
 * border, a filled tally segment, their line count as a numeral, and the words
 * "on the record". A silent person has a dashed border, a hollow segment, an
 * em dash, and the words "no line". Desaturate the whole thing and every one
 * of those four survives.
 *
 * NOTHING HERE IS IMPUTED. Every number is read off wire.totals or counted
 * from wire.leaders; a person with no line is drawn as a person with no line,
 * never as a zero-height bar that could be mistaken for a measurement of
 * quietness. Where the whole roster is silent the header says so in words
 * rather than printing a bar with nothing in it.
 */
function recordBoard(wire) {
  const t = wire.totals;
  const rows = wire.leaders;
  checkBoardFit(rows, cellSub);
  const onCount = rows.filter((l) => l.state === 'on_record').length;

  const title = `Who is on the record: ${t.on_record} of ${t.leaders} leaders, `
    + `${t.lines} line${t.lines === 1 ? '' : 's'} in ${wire.window_days} days`;

  // The description is the whole board in words, because the board is the only
  // place some of this is drawn. A screen reader gets the same roster, in the
  // same order, with the same counts.
  const named = rows.map((l) => `${l.name} (${l.org}) ${l.state === 'on_record'
    ? `${l.count} line${l.count === 1 ? '' : 's'}`
    : 'no line'}`).join('; ');
  const desc = onCount === 0
    ? `No one on the fixed roster of ${t.leaders} is on the record in this `
      + `${wire.window_days}-day window. Every name is listed: ${named}.`
    : `${t.on_record} of ${t.leaders} on the record across ${t.lines} `
      + `line${t.lines === 1 ? '' : 's'} from ${t.distinct_items} distinct `
      + `item${t.distinct_items === 1 ? '' : 's'}. In roster order: ${named}.`;

  const caption = `Fixed roster of ${t.leaders}, in the published order. A filled segment and a `
    + `solid cell mean at least one headline named that person beside a speech cue in the last `
    + `${wire.window_days} days; a hollow segment and a dashed cell mean none did, which is a `
    + `statement about this ${wire.corpus.items}-item corpus and not about the person.`;

  const sm = boardPlot(wire, BOARD_SM, 'lwb-s', 'ch__svg--sm', title, desc);
  const lg = boardPlot(wire, BOARD_LG, 'lwb-l', 'ch__svg--lg', title, desc);

  return `<figure class="ch lwb">${sm}${lg}<figcaption class="ch__cap">${esc(caption)}</figcaption></figure>`;
}

function boardPlot(wire, g, idp, variantCls, title, desc) {
  const t = wire.totals;
  const rows = wire.leaders;
  const inner = g.w - g.pad * 2;
  const colW = (inner - g.colGap * (g.cols - 1)) / g.cols;
  const gridRows = Math.ceil(rows.length / g.cols);
  const h = g.gridY + gridRows * g.cellH + (gridRows - 1) * g.rowGap + g.pad;

  const tid = `${idp}t`;
  const did = `${idp}d`;

  let out = `<svg class="ch__svg lwb__svg ${variantCls}" viewBox="0 0 ${g.w} ${h}" `
    + `preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${tid} ${did}" `
    + `style="--w:${g.w}px">`
    + `<title id="${tid}">${esc(title)}</title><desc id="${did}">${esc(desc)}</desc>`;

  // --- the headline fact ---------------------------------------------------
  const bigFs = g.cols === 3 ? 40 : 30;
  const baseY = g.cols === 3 ? 42 : 34;
  out += `<text class="lwb__big" x="${g.pad}" y="${baseY}" font-size="${bigFs}">${esc(t.on_record)}</text>`;
  const bigW = String(t.on_record).length * bigFs * 0.6;
  out += `<text class="lwb__of" x="${n2(g.pad + bigW + 4)}" y="${baseY}" font-size="${g.cols === 3 ? 17 : 14}">/ ${esc(t.leaders)}</text>`;
  out += `<text class="lwb__k" x="${g.pad}" y="${baseY + 16}" font-size="${g.cols === 3 ? 10 : 9}">`
    + `${esc(t.on_record === 0 ? 'NOBODY ON THE RECORD' : 'ON THE RECORD')}`
    + `</text>`;

  // Right-hand figures. Lines and items, both counted, both with their noun.
  const rx = g.w - g.pad;
  out += `<text class="lwb__big lwb__big--r" x="${rx}" y="${baseY - 12}" text-anchor="end" font-size="${g.cols === 3 ? 22 : 17}">${esc(t.lines)}</text>`;
  out += `<text class="lwb__k" x="${rx}" y="${baseY + 2}" text-anchor="end" font-size="${g.cols === 3 ? 10 : 9}">`
    + `LINE${t.lines === 1 ? '' : 'S'}</text>`;
  out += `<text class="lwb__k lwb__k--dim" x="${rx}" y="${baseY + 16}" text-anchor="end" font-size="${g.cols === 3 ? 10 : 9}">`
    + `${esc(t.distinct_items)} ITEM${t.distinct_items === 1 ? '' : 'S'} · ${esc(wire.window_days)}D</text>`;

  // --- the tally -----------------------------------------------------------
  // One segment per person, in roster order, so segment 6 IS Jensen Huang
  // rather than "the sixth one that happened to be filled".
  const segGap = g.cols === 3 ? 4 : 3;
  const segW = (inner - segGap * (rows.length - 1)) / rows.length;
  out += rows.map((l, i) => {
    const x = g.pad + i * (segW + segGap);
    const on = l.state === 'on_record';
    return `<rect class="lwb__seg${on ? ' lwb__seg--on' : ''}" x="${n2(x)}" y="${g.tallyY}" `
      + `width="${n2(segW)}" height="${g.tallyH}" rx="2"`
      + `${on ? ` data-person="${esc(l.id)}"` : ''}/>`;
  }).join('');

  // --- one cell per person -------------------------------------------------
  out += rows.map((l, i) => {
    const col = i % g.cols;
    const rowI = Math.floor(i / g.cols);
    const x = g.pad + col * (colW + g.colGap);
    const y = g.gridY + rowI * (g.cellH + g.rowGap);
    const on = l.state === 'on_record';
    const p = personIdFor(l.id);

    const sub = cellSub(l);

    // The mark. data-person carries the per-person accent rule that
    // avatarSprite() ships, and it lands on the <g> that owns `color`, so the
    // <use> inside it inherits the right hue in both schemes.
    const mark = p
      ? `<g class="lwb__mk" data-person="${esc(p)}" data-org="${esc(l.org_id)}">`
        + `<use href="#dc-avt-${esc(PEOPLE[p].shape)}" x="${n2(x + g.embX)}" y="${n2(y + (g.cellH - g.emb) / 2)}" `
        + `width="${g.emb}" height="${g.emb}"/></g>`
      // A roster id this module cannot draw is a real possibility the moment
      // collector/leaders.mjs adds a sixteenth person, and it must not be an
      // invisible hole. The honest empty frame, same as avatarUnknown().
      : `<g class="lwb__mk lwb__mk--none">`
        + `<use href="#dc-avt-frame" x="${n2(x + g.embX)}" y="${n2(y + (g.cellH - g.emb) / 2)}" `
        + `width="${g.emb}" height="${g.emb}"/></g>`;

    // One line on a phone, two on a desktop. Same fields either way: nothing is
    // dropped from the narrow layout, it is only arranged differently.
    const text = g.singleLine
      ? `<text class="lwb__n" x="${n2(x + g.nameX)}" y="${n2(y + g.cellH / 2 + 4)}" font-size="${g.nameFs}">${esc(l.name)}</text>`
        + `<text class="lwb__s" x="${n2(x + colW - g.subRight)}" y="${n2(y + g.cellH / 2 + 4)}" text-anchor="end" font-size="${g.subFs}">${esc(sub)}</text>`
      : `<text class="lwb__n" x="${n2(x + g.nameX)}" y="${n2(y + g.cellH / 2 - 2)}" font-size="${g.nameFs}">${esc(l.name)}</text>`
        + `<text class="lwb__s" x="${n2(x + g.nameX)}" y="${n2(y + g.cellH / 2 + 12)}" font-size="${g.subFs}">${esc(sub)}</text>`;

    return `<g class="lwb__cell" data-state="${esc(l.state)}">`
      + `<rect class="lwb__box" x="${n2(x + 0.5)}" y="${n2(y + 0.5)}" width="${n2(colW - 1)}" height="${n2(g.cellH - 1)}" rx="4"/>`
      + mark
      + text
      + `<text class="lwb__c" x="${n2(x + colW - 10)}" y="${n2(y + g.cellH / 2 + 5)}" text-anchor="end" font-size="${g.countFs}">`
      + `${on ? esc(l.count) : '—'}</text>`
      + `</g>`;
  }).join('');

  return out + '</svg>';
}

/**
 * The second line of a board cell. ONE definition, used by the renderer and by
 * checkBoardFit(), so the guard measures the string that actually gets drawn
 * rather than a copy of it that can drift.
 */
function cellSub(l) {
  return l.state === 'on_record'
    ? `${l.count} line${l.count === 1 ? '' : 's'} · ${l.sources.length} source${l.sources.length === 1 ? '' : 's'}`
    : 'no line this window';
}

// Two decimals, and the trailing zeros trimmed, so a rebuild with identical
// inputs produces identical bytes and the diff stays empty.
function n2(v) {
  return String(Math.round(v * 100) / 100);
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

/* ---- THE BOARD ---------------------------------------------------------
   Geometry is in recordBoard()/boardPlot(); this is paint only, the split
   site/styles.mjs states for every chart on the site. The two variants swap at
   640px on .ch__svg--sm / .ch__svg--lg, which the global sheet already owns, so
   there is no breakpoint here to fall out of step with it. */
.lwb { margin: var(--s-5) 0 0; }

/* EVERY TEXT RULE BELOW IS PREFIXED WITH .lwb__svg, AND IT HAS TO BE.
   site/styles.mjs carries a rule .ch text { fill: var(--ink-dim) } at specificity
   (0,1,1), and this figure is a .ch — so a bare .lwb__big { fill: ... } at
   (0,1,0) loses to it. Measured, not guessed: the first draft of this block
   painted the headline figure in --accent and the built page rendered every
   number, label and name on the board in one flat --ink-dim, which is the
   whole hierarchy gone and no error anywhere. Two classes beat one class plus
   one element, so the prefix is what makes these rules apply at all. */
.lwb__svg text { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.lwb__svg .lwb__big { fill: var(--accent); font-weight: 700; letter-spacing: -0.03em; }
.lwb__svg .lwb__big--r { fill: var(--ink); }
.lwb__svg .lwb__of { fill: var(--ink-faint); font-weight: 700; letter-spacing: -0.02em; }
.lwb__svg .lwb__k { fill: var(--ink-faint); letter-spacing: 0.14em; }
/* The tally. A filled segment against a washed, DASHED hollow one - fill,
   stroke style and the printed count all change together, so the reading
   survives greyscale and survives a reader who cannot separate the two hues at
   all. The hollow slot carries a wash rather than nothing because thirteen
   1.2px dashed outlines on --rule were, measured on the built page, close to
   invisible: an empty strip reads as a missing graphic, not as thirteen
   silences. */
.lwb__seg { fill: var(--wash-alt); stroke: var(--ink-faint); stroke-width: 1; stroke-dasharray: 2 2.6; }
.lwb__seg--on { fill: var(--avt-a, var(--accent)); stroke: none; stroke-dasharray: none; }

.lwb__box { fill: none; stroke: var(--rule); stroke-width: 1; }
.lwb__cell[data-state="on_record"] .lwb__box { fill: var(--wash); stroke: var(--ink-faint); }
.lwb__cell[data-state="no_line"] .lwb__box { stroke-dasharray: 3 3; }
.lwb__mk { color: var(--avt-a, var(--ink-dim)); }
.lwb__cell[data-state="no_line"] .lwb__mk { color: var(--ink-faint); }
.lwb__mk--none { color: var(--ink-faint); }
.lwb__svg .lwb__n { fill: var(--ink); font-weight: 500; }
.lwb__svg .lwb__cell[data-state="no_line"] .lwb__n { fill: var(--ink-dim); font-weight: 400; }
.lwb__svg .lwb__s { fill: var(--ink-faint); }
.lwb__svg .lwb__c { fill: var(--ink); font-weight: 700; }
.lwb__svg .lwb__cell[data-state="no_line"] .lwb__c { fill: var(--ink-faint); font-weight: 400; }

/* ---- THE ROSTER CARDS --------------------------------------------------- */
.lwp__marks { max-width: var(--measure); font-size: var(--t-sm); line-height: 1.65;
  color: var(--ink-dim); margin: 0 0 var(--s-4); }
.lwp__marks b { color: var(--ink); font-weight: 600; }

.lwr { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); }
/* Two columns only once a column is wide enough for a 112px mark AND a
   250-character Techmeme headline beside it. Below that it is one column, which
   is the 375px case the whole layout is designed from. */
@media (min-width: 860px) { .lwr { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.lwc {
  --avtp-size: 88px;
  display: flex; flex-direction: column; gap: var(--s-3); min-width: 0;
  padding: var(--s-3); background: var(--bg-raised);
  border: 1px solid var(--rule); border-left: 3px solid var(--rule);
  border-radius: var(--radius);
  scroll-margin-top: calc(var(--rail-h) + var(--s-5));
}
@media (min-width: 560px) { .lwc { --avtp-size: 112px; } }
/* The state is carried by the WORDS in .lwc__st and by the border STYLE. The
   hue is the third signal and it is the person's organisation, not a verdict. */
.lwc[data-state="on_record"] { border-left-color: var(--avt-a, var(--accent)); }
.lwc[data-state="no_line"] { border-left-style: dashed; }

.lwc__hd { display: flex; gap: var(--s-3); align-items: flex-start; min-width: 0; }
.lwc__who { min-width: 0; flex: 1 1 auto; }
.lwc__n { display: block; font-size: var(--t-lg); font-weight: 700; line-height: 1.1;
  letter-spacing: -0.01em; color: var(--ink); overflow-wrap: anywhere; }
.lwc__o { display: block; margin-top: 5px; font-family: var(--mono); font-size: var(--t-2xs);
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.lwc__st {
  margin: var(--s-2) 0 0; display: inline-flex; align-items: baseline; gap: 6px;
  padding: 3px 7px; border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-faint);
}
.lwc[data-state="on_record"] .lwc__st { border-color: var(--avt-a, var(--accent)); color: var(--ink-dim); }
.lwc[data-state="no_line"] .lwc__st { border-style: dashed; }
.lwc__stn { font-size: var(--t-sm); font-weight: 700; color: var(--ink); }
/* The mark this module could not draw. Same grammar as avatarUnknown(): dotted,
   unlettered, and it says which absence it is. */
.lwc__nomark {
  flex: 0 0 auto; width: var(--avtp-size); margin: 0;
  display: flex; align-items: center; justify-content: center; text-align: center;
  aspect-ratio: 120 / 136; border: 1px dashed var(--rule); border-radius: var(--radius);
  font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint);
}
.lwc__body { min-width: 0; }

/* One rule, and it moves nothing - a card that animates in is a blank card in a
   screenshot taken at first paint (MOTION.md rule 0). */
@media (prefers-reduced-motion: no-preference) {
  .lwc { transition: border-color 140ms ease-out, background-color 140ms ease-out; }
}
.lwc:hover { border-color: var(--rule-soft); border-left-color: var(--avt-a, var(--accent)); }

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
