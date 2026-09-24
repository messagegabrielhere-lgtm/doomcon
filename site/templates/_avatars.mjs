// Principal marks — one abstract, geometric monogram per named principal.
//
// ---------------------------------------------------------------------------
// WHY THESE ARE NOT FACES, AND WHY THAT IS THE BETTER ANSWER
// ---------------------------------------------------------------------------
//
// The brief that produced this file pointed at pizzint.watch, which ships a
// cropped photograph of Pete Hegseth as a button and a picture of Donald Trump
// in its timeline, and asked for "the little emoticons". That device works for
// them because their whole page is a joke about pizza deliveries. Ours is not
// a joke about anything: /race prints a computed rank, a market probability and
// a "posture" word beside each of these people's names.
//
// A drawn face next to a computed label about the person reads as a claim about
// the person. A caricature reads as a verdict on them. Neither is a thing this
// site is in a position to publish, because the whole moat is "vivid framing,
// honest number" (docs/VOICE.md §1) and a cartoon of a real man's face next to
// the word SURGE is vividness that has crossed into the number's lane.
//
// So: an abstract mark, and three rules that keep it honest.
//
//   1. THE LABEL IS THE IDENTIFICATION, THE MARK IS DECORATION. Every avatar
//      this module emits carries the person's name in text — visible by
//      default, and visually-hidden only when the caller has already printed
//      the name immediately beside it. There is no code path that emits a bare
//      mark with no name attached. You are never asked to recognise a shape.
//
//   2. THE SHAPE IS THE PERSON; THE COLOUR IS THE ORGANISATION. Eight
//      silhouettes, all distinct in a greyscale thumbnail: circle, hexagon,
//      diamond, squircle, shield, octagon, bracket, stadium. The accent comes
//      from the lab, so Zuckerberg and LeCun share a hue and differ in shape,
//      which is the true relationship and not a coincidence of palette.
//      Colour is never the only carrier — that is the site-wide rule and it is
//      the reason the shapes had to be distinguishable before the hues were
//      chosen.
//
//   3. NOTHING HERE IS FETCHED, GENERATED OR RANDOM. No portrait, no gravatar,
//      no hashed identicon whose output nobody has looked at. Eight hand-drawn
//      outlines and a two-letter monogram, all in the static HTML, all
//      byte-identical across builds (CONTRACT.md hard constraint 4).
//
// The practical wins come free: no network request, no licensing question, no
// image to go stale when somebody changes job, legible at 20px, correct in both
// colour schemes, and a rendering that survives a greyscale repost — which is
// how a lot of this site is actually read.
//
// Paint lives in site/styles.mjs (the `.avt*` block), not here, so one sheet
// themes these for light and dark the same way it themes every chart.

import { esc } from './_html.mjs';

// ---------------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------------

// 24x24 viewBox. Every path is an OUTLINE with a clear ~13px centre, because a
// two-letter monogram sits on top of it. Stroked with currentColor and filled
// with an inherited wash (both set in styles.mjs), so a symbol carries no
// colour of its own and one sprite serves both themes.
//
// Chosen for silhouette, not for prettiness: printed at 20px and desaturated,
// these eight are still eight. A set that needed colour to be told apart would
// have failed the rule it exists to satisfy.
const SHAPE = {
  circle:   '<circle cx="12" cy="12" r="10.1"/>',
  hex:      '<path d="M12 1.7 21 6.85v10.3L12 22.3 3 17.15V6.85Z"/>',
  diamond:  '<path d="M12 1.5 22.5 12 12 22.5 1.5 12Z"/>',
  squircle: '<rect x="2" y="2" width="20" height="20" rx="6.5"/>',
  shield:   '<path d="M12 1.8 21.3 5.3v7.1c0 4.6-4 7.6-9.3 9.8-5.3-2.2-9.3-5.2-9.3-9.8V5.3Z"/>',
  octagon:  '<path d="M8.1 1.9h7.8l5.2 5.2v7.8l-5.2 5.2H8.1L2.9 14.9V7.1Z"/>',
  bracket:  '<path d="M8.6 2.5H2.6v19h6M15.4 2.5h6v19h-6"/>',
  stadium:  '<rect x="1.5" y="4.6" width="21" height="14.8" rx="7.4"/>',
};

export const AVATAR_SHAPES = Object.freeze(Object.keys(SHAPE));

// ---------------------------------------------------------------------------
// The people
// ---------------------------------------------------------------------------

/**
 * The principals the watch floor and /race already name, plus LeCun, who the
 * brief asked for and who data/race.json does not carry (Meta's published
 * principal there is Zuckerberg). Nobody is added here who is not already
 * named in text on a page of this site.
 *
 * `org` is the lab id used by _labs.mjs and data/race.json, and it is what
 * styles.mjs keys the accent off. `initials` is written out rather than
 * derived, because deriving them from a name gets Liang Wenfeng wrong: the
 * family name is first, so a naive split produces the wrong letter order.
 */
const PEOPLE = {
  altman: {
    name: 'Sam Altman', initials: 'SA', org: 'openai', orgName: 'OpenAI',
    role: 'CEO', shape: 'circle',
  },
  amodei: {
    name: 'Dario Amodei', initials: 'DA', org: 'anthropic', orgName: 'Anthropic',
    role: 'CEO', shape: 'shield',
  },
  hassabis: {
    name: 'Demis Hassabis', initials: 'DH', org: 'google-deepmind', orgName: 'Google DeepMind',
    role: 'CEO', shape: 'diamond',
  },
  musk: {
    name: 'Elon Musk', initials: 'EM', org: 'xai', orgName: 'xAI',
    role: 'Founder', shape: 'octagon',
  },
  zuckerberg: {
    name: 'Mark Zuckerberg', initials: 'MZ', org: 'meta', orgName: 'Meta',
    role: 'CEO', shape: 'stadium',
  },
  lecun: {
    name: 'Yann LeCun', initials: 'YL', org: 'meta', orgName: 'Meta',
    role: 'Chief AI Scientist', shape: 'bracket',
  },
  liang: {
    name: 'Liang Wenfeng', initials: 'LW', org: 'deepseek', orgName: 'DeepSeek',
    role: 'Founder', shape: 'hex',
  },
  mensch: {
    name: 'Arthur Mensch', initials: 'AM', org: 'mistral', orgName: 'Mistral',
    role: 'CEO', shape: 'squircle',
  },
};

for (const [id, p] of Object.entries(PEOPLE)) {
  // A typo in the table above would ship a mark with no outline and no way to
  // notice at a glance. Fail at import time instead.
  if (!SHAPE[p.shape]) throw new Error(`_avatars: person "${id}" wants shape "${p.shape}", which does not exist`);
  if (!/^[A-Z]{2}$/.test(p.initials)) throw new Error(`_avatars: person "${id}" has initials ${JSON.stringify(p.initials)}; two capitals expected`);
}

export { PEOPLE };

/** Lowercased name -> id, so a race.json `principal` string resolves. */
const BY_NAME = new Map(Object.entries(PEOPLE).map(([id, p]) => [p.name.toLowerCase(), id]));

/** Lab id -> the principal this module draws for it. First declared wins, so
 *  Meta resolves to Zuckerberg (who is data/race.json's published principal)
 *  and LeCun stays reachable by his own id. */
const BY_ORG = new Map();
for (const [id, p] of Object.entries(PEOPLE)) if (!BY_ORG.has(p.org)) BY_ORG.set(p.org, id);

export function hasAvatar(personId) {
  return typeof personId === 'string' && Object.prototype.hasOwnProperty.call(PEOPLE, personId);
}

/**
 * Resolve anything a caller is likely to be holding to a person id: the id
 * itself, the full name as data/race.json writes it, or a lab id.
 *
 * Returns null rather than throwing, and null is a real answer: data/race.json
 * publishes `"principal": null` for Alibaba Qwen because no individual is named
 * for it, and inventing one to fill a cell is the imputation this whole project
 * is a reaction to. Callers gate on the null; see avatarFor().
 */
export function personIdFor(value) {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  if (!key) return null;
  if (hasAvatar(key)) return key;
  const byName = BY_NAME.get(key.toLowerCase());
  if (byName) return byName;
  return BY_ORG.get(key) || null;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * The eight outlines as one <symbol> sheet. Emit ONCE per page, before the
 * first avatar — the pattern _reel.pillarSprite() established, and for the same
 * reason: inlining the path data into every mark costs bytes per occurrence to
 * draw eight shapes, and a same-document <use> needs no script, no second
 * request and no hydration, so it is still correct in a prerender and in a
 * screenshot taken at first paint (MOTION.md rule 0).
 *
 * Emitting it twice is harmless — duplicate ids resolve to the first — so a
 * page that renders both the watch floor and the race table does not have to
 * co-ordinate.
 */
export function avatarSprite() {
  const symbols = Object.entries(SHAPE).map(([id, d]) =>
    `<symbol id="dc-avt-${id}" viewBox="0 0 24 24">` +
    `<g stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${d}</g>` +
    `</symbol>`
  ).join('');
  return `<svg class="avtsprite" aria-hidden="true" focusable="false" width="0" height="0">${symbols}</svg>`;
}

/** The mark alone. Never exported on its own — see rule 1 in the header. */
function mark(p, size) {
  return `<span class="avt avt--${esc(size)}" data-org="${esc(p.org)}" data-shape="${esc(p.shape)}" aria-hidden="true">` +
    `<svg class="avt__m" viewBox="0 0 24 24" focusable="false"><use href="#dc-avt-${esc(p.shape)}"/></svg>` +
    `<span class="avt__i">${esc(p.initials)}</span>` +
    `</span>`;
}

const SIZES = new Set(['sm', 'md', 'lg']);

/**
 * One principal, marked and named.
 *
 * @param {string} personId  a key of PEOPLE, or anything personIdFor() resolves
 * @param {object} [opts]
 * @param {'sm'|'md'|'lg'} [opts.size='sm']   20px / 26px / 34px
 * @param {'beside'|'none'} [opts.label='beside']
 *        'beside' prints the name (and, by default, the role) as text next to
 *        the mark. 'none' prints it visually-hidden instead, and is ONLY
 *        correct when the caller already prints the same name immediately
 *        adjacent — _labs.mjs's `.lab__p` is the case this exists for. There is
 *        no option that drops the name entirely.
 * @param {boolean} [opts.role=true]   show "CEO · OpenAI" under the name
 * @param {string|null} [opts.sub=null] replace the role line with your own text
 *        (a measured figure, e.g. "posts 18 / 30d"). Escaped here.
 * @param {string|null} [opts.href=null] wrap the whole row in a link
 * @returns {string} HTML
 */
export function avatar(personId, opts = {}) {
  const id = personIdFor(personId);
  // Loud, like _reel.pillarSigil(): a silent '' here means a caller's typo
  // ships as a missing mark that nobody sees until a screenshot. Callers that
  // legitimately do not know whether a person is named use avatarFor().
  if (!id) throw new Error(`_avatars: no principal mark for ${JSON.stringify(personId)}`);
  const p = PEOPLE[id];

  const size = SIZES.has(opts.size) ? opts.size : 'sm';
  const label = opts.label === 'none' ? 'none' : 'beside';
  const showRole = opts.role !== false;
  const sub = typeof opts.sub === 'string' && opts.sub ? opts.sub
    : (showRole ? `${p.role} · ${p.orgName}` : null);

  const body = label === 'none'
    ? `${mark(p, size)}<span class="vh">${esc(p.name)}</span>`
    : `${mark(p, size)}<span class="avtrow__t">` +
      `<b class="avtrow__n">${esc(p.name)}</b>` +
      (sub ? `<span class="avtrow__r">${esc(sub)}</span>` : '') +
      `</span>`;

  const cls = `avtrow avtrow--${label === 'none' ? 'bare' : size}`;
  const attrs = `class="${cls}" data-person="${esc(id)}" data-org="${esc(p.org)}"`;

  return opts.href
    ? `<a ${attrs} href="${esc(opts.href)}">${body}</a>`
    : `<span ${attrs}>${body}</span>`;
}

/**
 * The honest empty cell: a lab whose principal nobody has published.
 *
 * data/race.json carries `"principal": null` for Alibaba Qwen. The three
 * source states on this site are never merged and the same discipline applies
 * to a person: "we have not published a name" is a different statement from
 * "there is nobody", and neither is "here is a placeholder head". This renders
 * a dotted, unlettered frame and says which one it means, exactly the way the
 * freshness chips do.
 */
export function avatarUnknown({ size = 'sm', reason = 'no principal published', detail = null, label = 'beside' } = {}) {
  const s = SIZES.has(size) ? size : 'sm';
  const frame = `<span class="avt avt--${esc(s)} avt--none" aria-hidden="true">` +
    `<svg class="avt__m" viewBox="0 0 24 24" focusable="false"><use href="#dc-avt-squircle"/></svg>` +
    `<span class="avt__i">—</span></span>`;
  const full = detail && detail !== reason ? detail : null;
  if (label === 'none') return `${frame}<span class="vh">${esc(full || reason)}</span>`;
  // The visible line is one sentence because the slot is one line; the full
  // published note rides along visually-hidden, so nothing is lost to a screen
  // reader or to a copy-paste. Truncating a stated reason down to an ellipsis
  // and calling it done is how "we deliberately left this empty" becomes
  // "Left e...", which reads like a bug instead of like a decision.
  return `<span class="avtrow avtrow--${esc(s)}" data-person="none">${frame}` +
    `<span class="avtrow__t"><b class="avtrow__n avtrow__n--none">—</b>` +
    `<span class="avtrow__r">${esc(reason)}</span>` +
    (full ? `<span class="vh">${esc(full)}</span>` : '') +
    `</span></span>`;
}

/** The first sentence of a published note, for a one-line slot. */
function firstSentence(text) {
  const m = String(text).match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : String(text)).trim();
}

/**
 * A race.json player row -> the right one of the two above.
 *
 * This is the call site _labs.mjs and racePage.mjs want: it takes the object
 * they already hold, resolves the published `principal` name, and falls back to
 * the honest empty frame rather than to nothing. A lab box with a mark for
 * seven labs and a hole for the eighth reads as a rendering bug; a lab box that
 * says "no principal published" reads as a measurement.
 */
export function avatarFor(player, opts = {}) {
  if (!player || typeof player !== 'object') {
    return avatarUnknown({ ...opts, reason: 'no player record' });
  }
  const id = personIdFor(player.principal) || personIdFor(player.id);
  if (!id) {
    const note = typeof player.principal_note === 'string' && player.principal_note ? player.principal_note : null;
    return avatarUnknown({
      ...opts,
      reason: note ? firstSentence(note) : 'no principal published',
      detail: note,
    });
  }
  // The published role wins over ours when race.json carries one: that field is
  // collected, ours is typed into a table by hand, and the collected one is the
  // one a reader can go and check.
  //
  // The containment check is not defensive tidying. data/race.json publishes
  // Hassabis's role as "CEO, Google DeepMind" against a player named "Google
  // DeepMind", and appending unconditionally printed "CEO, Google DeepMind ·
  // Google DeepMind" - a 38-character line that both read as a stutter and, in
  // a grid track declared 1fr, widened the whole row past the viewport.
  //
  // THE COMMA IS THE TEST, and it is the right one for this data rather than a
  // clever guess. Every principal_role in data/race.json is either a bare title
  // ("CEO", "Founder") or a title that already names the organisation after a
  // comma ("CEO, Google DeepMind", "CEO, Meta"). Appending the org
  // unconditionally printed "CEO, Meta · Meta AI" and "CEO, Google DeepMind ·
  // Google DeepMind" - a stutter, and in a loose grid track long enough to push
  // the row past the viewport. A substring check does not catch the Meta case,
  // because the player is called "Meta AI" and the role says "Meta".
  let sub = opts.sub;
  if (sub === undefined && typeof player.principal_role === 'string' && player.principal_role) {
    const role = player.principal_role.trim();
    const org = player.name || PEOPLE[id].orgName;
    sub = role.includes(',') ? role : `${role} · ${org}`;
  }
  return avatar(id, { ...opts, sub });
}

/**
 * Every principal this module can draw, in the order they are declared.
 * Useful for a legend, a key on /race, or a visual regression harness.
 */
export function allAvatars(opts = {}) {
  return Object.keys(PEOPLE).map((id) => avatar(id, opts)).join('');
}

// ---------------------------------------------------------------------------
// INTEGRATION — the two callers this was built for
//
//   _labs.mjs (the watch floor), inside box(), replacing the `.lab__p` line:
//     import { avatarFor, avatarSprite } from './_avatars.mjs';
//     ...
//     <span class="lab__n">
//       <b class="lab__name">${esc(p.name)}</b>
//       ${avatarFor(p, { size: 'sm', role: false })}
//     </span>
//     ...and `${avatarSprite()}` once, next to that module's styleTag().
//
//   racePage.mjs, in the leaderboard row:
//     ${avatarFor(player, { size: 'md', href: `#${player.id}` })}
//
// ONE CONSTRAINT ON THE CALLER. A CSS grid that holds these must declare its
// tracks as minmax(0, 1fr), not 1fr. A plain 1fr track floors at the item's
// min-content width, and a long principal role then widens the whole grid past
// the viewport - measured at 375px, where it pushed the page to a 440px scroll
// width. The row itself is capped (max-width:100%, and the role line at 26ch)
// so this only ever bites in the sloppy-track case, but it does bite.
//
// Nothing else is required. The paint is already in site/styles.mjs, which is
// inlined into every page by layout.mjs, so neither caller ships a style block.
// ---------------------------------------------------------------------------
