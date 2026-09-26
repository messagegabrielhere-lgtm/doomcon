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
//      emblems, all distinct in a greyscale thumbnail: a beaded orbit, a
//      crested shield, a faceted prism, a reticled octagon, a sealed stadium,
//      a closed bracket, a beaded cell, a cut squircle.
//
//      THE ACCENT IS PER-PERSON, INSIDE THE LAB'S OWN HUE. The brief asked for
//      "a strong per-person accent colour"; the previous rule was one hue per
//      organisation. Both are kept, because they are not actually in tension:
//      every person has their own hex, and every hex sits in their lab's hue
//      family, so Zuckerberg and LeCun are two values of Meta blue and differ
//      in silhouette — which is the true relationship rather than a palette
//      accident. See ACCENT below and docs/BRAND.md §4.
//
//      Colour is never the only carrier, and at eight marks over six labs it
//      structurally cannot be: three of the labs sit in one blue-violet region
//      of the wheel. That is measured, printed in docs/BRAND.md §6, and it is
//      exactly why the emblems had to be distinguishable in greyscale before a
//      single hue was chosen.
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

import { esc, utcDay } from './_html.mjs';

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
  // OpenAI / Altman. A ring with a bead on it — a node on an orbit. The bead
  // is the only filled element in the set that is not a vertex dot, which is
  // what makes this one findable in a column of eight at 20px.
  orbit:
    '<circle cx="12" cy="12" r="8.7"/>'
    + '<circle cx="18.15" cy="5.85" r="2.15" fill="currentColor" stroke="none"/>',

  // Anthropic / Amodei. A shield, with the top edge notched into a crest.
  aegis:
    '<path d="M12 1.9 20.9 5.3v6.4c0 4.7-3.9 7.9-8.9 10.4-5-2.5-8.9-5.7-8.9-10.4V5.3Z"/>'
    + '<path d="M7.5 3.6 12 5.3l4.5-1.7" fill="none" stroke-width="1.6"/>',

  // Google DeepMind / Hassabis. A cut gem: a diamond with the bottom point
  // taken off, so the silhouette is asymmetric top-to-bottom and cannot be
  // confused with the plain diamond it started as. The first draft WAS a plain
  // diamond with two facet strokes near the top vertex, and the harness showed
  // those strokes were invisible at 20 and 26px and fought the monogram at 34 —
  // so the character moved into the outline, where small sizes can still see it.
  prism:
    '<path d="M12 2.1 21.9 12 15.6 21.9H8.4L2.1 12Z"/>',

  // xAI / Musk. An octagon inside a reticle. Four ticks on the axes, outside
  // the body, so the silhouette is unmistakable without touching the middle.
  rotor:
    '<path d="M8.4 3.4h7.2l4.9 4.9v7.4l-4.9 4.9H8.4l-4.9-4.9V8.3Z"/>'
    + '<path d="M12 0.8v1.9M12 21.3v1.9M0.8 12h1.9M21.3 12h1.9" fill="none" stroke-width="1.8"/>',

  // Meta / Zuckerberg. A stadium with its two end caps drawn in — a capsule
  // that has been sealed at both ends rather than an empty pill.
  stadium:
    '<rect x="1.5" y="5.1" width="21" height="13.8" rx="6.9"/>'
    + '<path d="M6.6 8.7v6.6M17.4 8.7v6.6" fill="none" stroke-width="1.5"/>',

  // Meta / LeCun. Two brackets, closed along the bottom. Shares Meta's hue
  // with the stadium above and shares nothing else, which is the relationship:
  // same lab, different person, and the SHAPE is what tells them apart.
  bracket:
    '<path d="M8.8 2.6H2.8v18.8h6M15.2 2.6h6v18.8h-6"/>'
    + '<path d="M9.8 21.4h4.4" fill="none" stroke-width="1.5"/>',

  // DeepSeek / Liang. A hexagon with its top and base vertices beaded — a cell
  // in a lattice, which is the one of these that is about a structure rather
  // than about a boundary.
  //
  // FLAT-TOP, NOT POINT-TOP, and the harness is why. The first draft was a
  // point-top hexagon and Hassabis's gem is a point-top pentagon; at 16px and
  // 20px the two were the same picture with one side's difference in it. A
  // hexagon turned 30° has a different axis from every other mark in the set,
  // which is a difference that survives being 16 pixels wide.
  cell:
    '<path d="M7.1 2.6h9.8L21.8 12l-4.9 9.4H7.1L2.2 12Z"/>'
    + '<circle cx="2.2" cy="12" r="1.7" fill="currentColor" stroke="none"/>'
    + '<circle cx="21.8" cy="12" r="1.7" fill="currentColor" stroke="none"/>',

  // Mistral / Mensch. A squircle with the top-right corner cut away. The one
  // asymmetric mark in the set, which is why it is the easiest of the eight to
  // pick out of a grid, and it costs no interior room at all.
  //
  // KEEP THIS KEY NAMED `squircle`. avatarUnknown() draws the "no principal
  // published" frame from it, and renaming it would silently empty that mark
  // rather than failing the build.
  squircle:
    '<path d="M8.6 2.4h6.6l6.4 6.4v6.6a6 6 0 0 1-6 6H8.4a6 6 0 0 1-6-6V8.4a6 6 0 0 1 6-6Z"/>'
    + '<path d="M15.2 2.4v6.4h6.4" fill="none" stroke-width="1.5"/>',

  // ---- THE SECOND SEVEN ---------------------------------------------------
  // Added when /leaders grew this module from the eight watch-floor principals
  // to the fifteen people on the leader-wire roster. Same three rules as
  // above, and the same test: printed at 20px and desaturated, the fifteen are
  // still fifteen. Every one of these keeps a clear centre band at least 13
  // units wide at y=12, because a two-letter monogram sits on top of it — the
  // reason a plain down-triangle and a plus-sign were both drawn and both
  // thrown away.

  // Nvidia / Huang. A pentagon with a rectangular base — vertical sides and
  // square bottom corners, which is what separates it from Hassabis's gem
  // (slanted on every edge) at the sizes where only the silhouette survives.
  tower:
    '<path d="M12 2.3 21.3 9.4V21.3H2.7V9.4Z"/>',

  // Microsoft / Nadella. A trapezoid, wide at the top. Deliberately NOT the
  // vertical mirror of itself: a wide-bottom trapezoid was drawn for Suleyman
  // first and the pair read as one shape and its reflection, which is a
  // difference nobody sees in a column.
  keystone:
    '<path d="M3.6 2.9h16.8l-2.9 18.2H6.5Z"/>',

  // Microsoft AI / Suleyman. A tablet: rounded portrait rectangle with a rule
  // across the top. The rule is what keeps it off the "no principal published"
  // frame, which is a rounded SQUARE with nothing in it.
  tablet:
    '<rect x="4.2" y="2.6" width="15.6" height="18.8" rx="2.6"/>'
    + '<path d="M4.2 7.2h15.6" fill="none" stroke-width="1.5"/>',

  // Alphabet / Pichai. A dome: flat base, semicircular top.
  // The only mark in the set whose top and bottom edges are different KINDS of
  // edge, which is legible at any size.
  dome:
    '<path d="M2.6 21.4V12a9.4 9.4 0 0 1 18.8 0v9.4Z"/>',

  // Google / Kavukcuoglu. A ring broken into three arcs. Shares a circle with
  // Altman's orbit and differs in the two ways that survive 20px: the ring is
  // interrupted, and there is no bead.
  arcs:
    '<path d="M21.00 13.91A9.2 9.2 0 0 1 9.16 20.75M5.84 18.84A9.2 9.2 0 0 1 5.84 5.16'
    + 'M9.16 3.25A9.2 9.2 0 0 1 21.00 10.09" fill="none"/>',

  // University of Toronto / Hinton. A parallelogram. Shear is a silhouette
  // difference no other mark in the set has.
  pennant:
    '<path d="M7.4 2.7h13.9l-4.7 18.6H2.7Z"/>',

  // Mila / Bengio. A plain diamond, point top and point bottom. The gem it sits
  // nearest is Hassabis's, which has a six-unit flat edge along its base; this
  // one comes to a point there.
  rhombus:
    '<path d="M12 2.2 21.8 12 12 21.8 2.2 12Z"/>',

  // NOBODY'S. The honest empty frame, and it is a ninth shape rather than a
  // borrowed one on purpose: avatarUnknown() used to draw the squircle, and
  // now that the squircle is Mensch's cut corner, "no principal published"
  // would have been rendered in another man's emblem. A plain rounded square
  // belongs to no one, which is the whole statement.
  frame:
    '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="6"/>',
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
    role: 'CEO', shape: 'orbit', tag: 'OPENAI',
  },
  amodei: {
    name: 'Dario Amodei', initials: 'DA', org: 'anthropic', orgName: 'Anthropic',
    role: 'CEO', shape: 'aegis', tag: 'ANTHROPIC',
  },
  hassabis: {
    name: 'Demis Hassabis', initials: 'DH', org: 'google-deepmind', orgName: 'Google DeepMind',
    role: 'CEO', shape: 'prism', tag: 'DEEPMIND',
  },
  musk: {
    name: 'Elon Musk', initials: 'EM', org: 'xai', orgName: 'xAI',
    role: 'Founder', shape: 'rotor', tag: 'XAI',
  },
  zuckerberg: {
    name: 'Mark Zuckerberg', initials: 'MZ', org: 'meta', orgName: 'Meta',
    role: 'CEO', shape: 'stadium', tag: 'META',
  },
  lecun: {
    name: 'Yann LeCun', initials: 'YL', org: 'meta', orgName: 'Meta',
    role: 'Chief AI Scientist', shape: 'bracket', tag: 'META',
  },
  liang: {
    name: 'Liang Wenfeng', initials: 'LW', org: 'deepseek', orgName: 'DeepSeek',
    role: 'Founder', shape: 'cell', tag: 'DEEPSEEK',
  },
  mensch: {
    name: 'Arthur Mensch', initials: 'AM', org: 'mistral', orgName: 'Mistral',
    role: 'CEO', shape: 'squircle', tag: 'MISTRAL',
  },

  // ---- THE SEVEN THE LEADER WIRE ADDED ------------------------------------
  // data/leaders.json carries fifteen people and this table carried eight, so
  // seven rows of /leaders had no mark at all. Every id, name, org id and role
  // below is the one collector/leaders.mjs publishes, copied rather than
  // invented, so `personIdFor(leader.id)` resolves straight off the wire.
  //
  // None of them is a principal in data/race.json, which is checked and not
  // assumed: no player there carries the id `nvidia`, `microsoft`, `google` or
  // `academia`, so adding these cannot change a single mark on the watch floor
  // or on /race. They are reachable only by the ids and names below.
  huang: {
    name: 'Jensen Huang', initials: 'JH', org: 'nvidia', orgName: 'Nvidia',
    role: 'CEO', shape: 'tower', tag: 'NVIDIA',
  },
  nadella: {
    name: 'Satya Nadella', initials: 'SN', org: 'microsoft', orgName: 'Microsoft',
    role: 'CEO', shape: 'keystone', tag: 'MICROSOFT',
  },
  suleyman: {
    name: 'Mustafa Suleyman', initials: 'MS', org: 'microsoft', orgName: 'Microsoft AI',
    role: 'CEO', shape: 'tablet', tag: 'MICROSOFT AI',
  },
  pichai: {
    name: 'Sundar Pichai', initials: 'SP', org: 'google', orgName: 'Alphabet',
    role: 'CEO', shape: 'dome', tag: 'ALPHABET',
  },
  kavukcuoglu: {
    name: 'Koray Kavukcuoglu', initials: 'KK', org: 'google', orgName: 'Google',
    role: 'Chief AI Architect', shape: 'arcs', tag: 'GOOGLE',
  },
  // The two academics are the reason `tag` exists as its own field rather than
  // being derived from orgName. "Mila, Université de Montréal" is twenty-eight
  // characters and the portrait's footer slot is twelve; deriving a short form
  // by truncation would print "MILA, UNIVERS". A short name is an editorial
  // choice, so it is typed out and reviewable.
  hinton: {
    name: 'Geoffrey Hinton', initials: 'GH', org: 'academia', orgName: 'University of Toronto',
    role: 'Professor emeritus', shape: 'pennant', tag: 'TORONTO',
  },
  bengio: {
    name: 'Yoshua Bengio', initials: 'YB', org: 'academia', orgName: 'Mila, Université de Montréal',
    role: 'Professor', shape: 'rhombus', tag: 'MILA',
  },
};

/**
 * THE PER-PERSON ACCENT.
 *
 * `[dark, light]`, and the light value is not decoration: site/styles.mjs
 * carries a full light scheme, _labs.mjs cannot (it sets its accent inline and
 * therefore has exactly one), and xAI's #aab3bf measures 2.1:1 on paper, which
 * is a hairline. Both values are published in docs/BRAND.md §4 with their
 * measured contrast against both grounds.
 *
 * SEVEN OF THE EIGHT ARE THEIR LAB'S OWN HUE, character for character, because
 * a principal's mark and the left edge of that lab's box on the watch floor
 * being the same colour is a real relationship and worth keeping. The eighth —
 * LeCun — is a second value of Meta blue, because Meta is the one lab here
 * with two named principals and two people sharing one hex is the one case
 * where "per-person accent" has to mean something.
 */
const ACCENT = {
  altman:            ['#10a37f', '#0a6e55'],
  amodei:            ['#d97757', '#a2472a'],
  hassabis:          ['#5b9cff', '#1a56d6'],
  musk:              ['#aab3bf', '#4a525c'],
  zuckerberg:        ['#3b82f6', '#1d4ed8'],
  lecun:             ['#93b8ff', '#3665cc'],
  liang:             ['#7a8cff', '#3b3fc4'],
  mensch:            ['#fa720f', '#a34204'],

  // The seven the leader wire added. Four new organisations, and three of them
  // carry two principals each, so the Meta rule above generalises: one hue per
  // lab, two VALUES of it where two people share the lab. Measured against
  // both grounds before they were committed — every pair below clears 4.5:1 on
  // --bg and on --bg-raised in its own scheme, which the first draft of
  // Bengio's light value (#44807c, 4.31:1) did not.
  huang:             ['#76b900', '#3f6300'],
  nadella:           ['#4cc2ff', '#005a8c'],
  suleyman:          ['#a8e0ff', '#0b6f9e'],
  pichai:            ['#f0544a', '#a3261a'],
  kavukcuoglu:       ['#ffb0a6', '#7a1f14'],
  hinton:            ['#7fb3b0', '#2d6360'],
  bengio:            ['#b9d6d4', '#387470'],
};

for (const [id, p] of Object.entries(PEOPLE)) {
  // A typo in the table above would ship a mark with no outline and no way to
  // notice at a glance. Fail at import time instead.
  if (!SHAPE[p.shape]) throw new Error(`_avatars: person "${id}" wants shape "${p.shape}", which does not exist`);
  if (!/^[A-Z]{2}$/.test(p.initials)) throw new Error(`_avatars: person "${id}" has initials ${JSON.stringify(p.initials)}; two capitals expected`);
  if (!ACCENT[id]) throw new Error(`_avatars: person "${id}" has no accent pair in ACCENT`);
  // The portrait footer is a fixed-width slot; a tag longer than this is a
  // layout bug that only shows up in a screenshot, so it is a build error.
  if (typeof p.tag !== 'string' || !p.tag || p.tag.length > 12) {
    throw new Error(`_avatars: person "${id}" needs a two-to-twelve character tag, got ${JSON.stringify(p.tag)}`);
  }
  // Carried on the record so mark() can stamp it without a second lookup, and
  // so a caller building a legend has the id without re-deriving it.
  p.id = id;
}

// Two people may not share a silhouette. The shapes are the identification of
// last resort — greyscale, dichromatic, 20px — and a duplicate would quietly
// undo the whole argument in the header of this file.
(function assertShapesAreDistinct() {
  const seen = new Map();
  for (const [id, p] of Object.entries(PEOPLE)) {
    if (seen.has(p.shape)) {
      throw new Error(`_avatars: "${id}" and "${seen.get(p.shape)}" both draw "${p.shape}"`);
    }
    seen.set(p.shape, id);
  }
})();

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
export function avatarSprite({ style = true } = {}) {
  const symbols = Object.entries(SHAPE).map(([id, d]) =>
    `<symbol id="dc-avt-${id}" viewBox="0 0 24 24">` +
    `<g stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">${d}</g>` +
    `</symbol>`
  ).join('');
  return (style ? accentStyleTag() : '')
    + `<svg class="avtsprite" aria-hidden="true" focusable="false" width="0" height="0">${symbols}</svg>`;
}

/**
 * THE PER-PERSON ACCENTS, as a <style> element.
 *
 * WHY THIS SHIPS FROM HERE AND NOT FROM site/styles.mjs. That file is the
 * site's sheet and it already carries the per-ORGANISATION accents; adding a
 * per-person layer to it is an edit to a module this pass does not own. So the
 * rules ride with the sprite instead, and `avatarSprite()` emits both by
 * default — which means the integration for this whole feature is zero lines:
 * the one existing caller (_labs.mjs) already calls avatarSprite().
 *
 * THE THREE-WAY EMISSION IS NOT BELT-AND-BRACES. site/styles.mjs states the
 * pattern and this obeys it exactly: the media query for a visitor on their OS
 * setting, and the two [data-theme] forms for an embed that a host page has
 * pinned. A light blog embedding a dark box cannot restyle inside an iframe,
 * so the pin has to work.
 *
 * SPECIFICITY IS DELIBERATE AND IT IS TIGHT. styles.mjs emits
 * `[data-org="meta"] { --avt-a }` at (0,1,0) and
 * `:root:not([data-theme="dark"]) [data-org="meta"]` at (0,3,0). Each rule
 * below matches its counterpart exactly and wins on document order, because
 * this block ships inside <main> and the sheet ships in <head>. If styles.mjs
 * ever tightens those selectors, these stop winning and every mark falls back
 * to its lab hue — which is a graceful failure, not a broken page, and it is
 * the reason this was built as an override rather than a replacement.
 *
 * Emitting it twice on one page is harmless: the rules are identical.
 */
export function accentStyleTag() {
  const rules = (prefix, i) => Object.entries(ACCENT)
    .map(([id, pair]) => `${prefix}[data-person="${id}"]{--avt-a:${pair[i]}}`)
    .join('');
  return '<style>'
    + rules('', 0)
    + `@media (prefers-color-scheme:light){${rules(':root:not([data-theme="dark"]) ', 1)}}`
    + rules(':root[data-theme="light"] ', 1)
    + rules(':root[data-theme="dark"] ', 0)
    + '</style>';
}

/** The accent pair for a person, as `[dark, light]`. For a legend, for the
 *  colour-blindness harness, and for anything rendered outside the document
 *  where a CSS variable does not exist. */
export function accentFor(personId) {
  const id = personIdFor(personId);
  return id ? [...ACCENT[id]] : null;
}

/** The mark alone. Never exported on its own — see rule 1 in the header. */
function mark(p, size) {
  // data-person as well as data-org: the accent rules in avatarStyleTag() key
  // off the person and they have to reach THIS element, not an ancestor. A
  // custom property set on .avtrow would inherit down, but styles.mjs sets
  // --avt-a directly on [data-org] here, and a direct set beats an inherited
  // one no matter how specific the ancestor's selector is.
  return `<span class="avt avt--${esc(size)}" data-person="${esc(p.id)}" data-org="${esc(p.org)}" data-shape="${esc(p.shape)}" aria-hidden="true">` +
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
 * @param {string|null} [opts.note=null] the full published note behind `sub`,
 *        carried visually-hidden. The visible slot is one line; the measured
 *        reasons in data/race.json are two — "Posts on X. Scraping X carries an
 *        explicit permanent-suspension penalty under its developer terms, so
 *        this cell is empty by policy, not by accident." Clipping that to its
 *        first sentence and dropping the rest turns a stated decision back into
 *        what reads as a missing value, so the remainder rides along here: a
 *        screen reader gets it, a copy-paste gets it, and the row still fits in
 *        one line. Same split avatarUnknown() already makes with `detail`, and
 *        it is skipped when it would only repeat `sub`.
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
  const note = typeof opts.note === 'string' && opts.note && opts.note !== sub ? opts.note : null;

  const body = label === 'none'
    ? `${mark(p, size)}<span class="vh">${esc(p.name)}${note ? ` — ${esc(note)}` : ''}</span>`
    : `${mark(p, size)}<span class="avtrow__t">` +
      `<b class="avtrow__n">${esc(p.name)}</b>` +
      (sub ? `<span class="avtrow__r">${esc(sub)}</span>` : '') +
      (note ? `<span class="vh">${esc(note)}</span>` : '') +
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
    `<svg class="avt__m" viewBox="0 0 24 24" focusable="false"><use href="#dc-avt-frame"/></svg>` +
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

/**
 * The first sentence of a published note, for a one-line slot.
 *
 * A TERMINATOR FOLLOWED BY AN ALPHANUMERIC IS NOT A SENTENCE END, and that
 * exception is the whole reason this is not a one-liner. The naive
 * `^[^.!?]*[.!?]` cut data/race.json's Anthropic reason —
 * "darioamodei.com publishes essays but serves no feed: /rss and /feed.xml both
 * returned HTTP 404 (probed 2026-09-23)." — down to the two words
 * "darioamodei.", which is not a sentence, not a measurement, and reads on the
 * watch floor as a truncation bug rather than as the probe result it is.
 *
 * Checked against all eight published reasons and the one principal_note in
 * data/race.json as of 2026-09-24. The domain cases (darioamodei.com,
 * hassabis.com, /feed.xml) are the ones that decide the rule: a dot inside a
 * hostname or a filename is always followed by a letter, and a real sentence
 * end here is always followed by a space or by nothing. Where a note is a
 * single sentence the whole note comes back, which is correct — the caller caps
 * the visible line in CSS and carries the full text alongside it.
 */
function firstSentence(text) {
  const m = String(text).match(/^[\s\S]*?[.!?](?![A-Za-z0-9])/);
  return (m ? m[0] : String(text)).trim();
}

/**
 * The measured reading for a principal, from the `loudness` block a
 * data/race.json player already carries. One function so the watch floor and
 * /race cannot print two different sentences about the same person.
 *
 * This exists because of what the watch floor was throwing away. Seven of the
 * eight boxes printed the string "no public feed" and nothing else, while
 * data/race.json was carrying, per lab, the actual probe result that produced
 * it — "darioamodei.com publishes essays but serves no feed: /rss and /feed.xml
 * both returned HTTP 404 (probed 2026-09-23)", "Posts on X. Scraping X carries
 * an explicit permanent-suspension penalty under its developer terms, so this
 * cell is empty by policy, not by accident." Those are the strongest sentences
 * we own and they were rendered as three identical words eight times.
 *
 * The four states stay four. `dormant` is a feed that answers and has published
 * nothing lately — Altman's blog, last post 2026-04-10 — and collapsing it into
 * `no_feed` would claim a working feed is broken, which is the same merge
 * docs/NEWS.md refuses for source states.
 *
 * @param {object|null} player a data/race.json player row
 * @returns {{state: string, text: string|null, note: string|null}}
 *          `text` is one line for the visible slot, `note` the full published
 *          reason when it is longer, or null when it is not.
 */
export function principalLine(player) {
  const l = (player && player.loudness) || {};
  const state = typeof l.state === 'string' ? l.state : 'unread';
  const reason = typeof l.reason === 'string' && l.reason ? l.reason : null;

  if (state === 'live' && Number.isFinite(l.posts_30d)) {
    return { state, text: `${l.posts_30d} posts / 30d`, note: reason };
  }
  if (state === 'dormant') {
    // A date, not "dormant" on its own. "No post since 2026-04-10" is a
    // measurement a reader can check; "dormant" is a word we chose.
    const since = typeof l.newest_at === 'string' && Number.isFinite(Date.parse(l.newest_at))
      ? `no post since ${utcDay(l.newest_at)}`
      : 'feed answers, nothing published in the window';
    return { state, text: since, note: reason };
  }
  if (state === 'no_feed') {
    return { state, text: reason ? firstSentence(reason) : 'no public feed', note: reason };
  }
  if (state === 'dark') {
    return { state, text: reason ? firstSentence(reason) : 'feed read failed', note: reason };
  }
  // Not "quiet". We have not looked, which is not the same as having looked and
  // found nothing — the rule _labs.mjs prints under the grid.
  return { state: 'unread', text: null, note: reason };
}

/**
 * A race.json player row -> the right one of the two above.
 *
 * This is the call site _labs.mjs and racePage.mjs want: it takes the object
 * they already hold, resolves the published `principal` name, and falls back to
 * the honest empty frame rather than to nothing. A lab box with a mark for
 * seven labs and a hole for the eighth reads as a rendering bug; a lab box that
 * says "no principal published" reads as a measurement.
 *
 * Pass `measured: true` and the second line becomes principalLine()'s reading —
 * what this person's feed actually did — instead of their job title. That is
 * the call the watch floor wants: the box above the row already names the lab,
 * so "CEO · Anthropic" is two words we already printed, while "no post since
 * 2026-04-10" is a fact that exists nowhere else on the page. `sub` passed
 * explicitly still wins over both.
 */
export function avatarFor(player, opts = {}) {
  if (!player || typeof player !== 'object') {
    return avatarUnknown({ ...opts, reason: 'no player record' });
  }
  // A PUBLISHED NULL BEATS OUR OWN TABLE, and this is the line that makes it
  // so. The lab-id fallback is there for a row that simply never carried a
  // principal field; it must not fire when data/race.json has explicitly
  // published `"principal": null`, because PEOPLE above maps a lab id to a
  // person and would then reinstate a name the collector has stopped
  // publishing. That is imputation — the same move as treating a dark source as
  // a zero — and it fails silently, which is worse: measured against the live
  // file, nulling every principal changed the rendered watch floor by zero
  // bytes. Every name stayed, sourced from a table typed by hand.
  const declaredNull = Object.prototype.hasOwnProperty.call(player, 'principal') && !player.principal;
  const id = personIdFor(player.principal) || (declaredNull ? null : personIdFor(player.id));
  if (!id) {
    const note = typeof player.principal_note === 'string' && player.principal_note ? player.principal_note : null;
    return avatarUnknown({
      ...opts,
      reason: note ? firstSentence(note) : 'no principal published',
      detail: note,
    });
  }

  if (opts.measured) {
    const m = principalLine(player);
    const { measured, ...rest } = opts;
    return avatar(id, {
      ...rest,
      // text null means we have not looked. Fall through to the role rather
      // than printing an empty line or inventing a state for the person.
      sub: typeof rest.sub === 'string' ? rest.sub : (m.text || undefined),
      note: typeof rest.note === 'string' ? rest.note : m.note,
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

// ---------------------------------------------------------------------------
// The portrait
// ---------------------------------------------------------------------------

/**
 * THE SAME MARK, BIG. 96px and up, and that number is the whole point of it.
 *
 * Measured on the built /leaders.html before this existed: twelve SVGs on the
 * page, eleven of them 16x16 and the largest 64x64. The roster of fifteen
 * people — the page's entire subject — was rendered as fifteen two-letter
 * monograms in 26px boxes. The operator's note was "I don't see the new
 * graphics", and they were right; there was nothing to see.
 *
 * WHAT THIS IS NOT, AND WHY THE ANSWER DID NOT CHANGE WHEN THE MARKS GOT BIG.
 * The argument in the header of this file was written for a 20px mark, and the
 * obvious objection to scaling it up is that 96px is enough room to draw a
 * face, so why not. Because the objection has it backwards: the reason there
 * is no face here was never that a face would not fit. These are fifteen real,
 * living, named people, and this site prints computed labels beside their
 * names. A drawn likeness next to a computed label is a claim about the person
 * that we cannot source, and a caricature is a verdict on them. More pixels
 * make that worse, not better — a 20px doodle is deniable and a 120px portrait
 * is a publication.
 *
 * So the portrait is the same abstract geometry, drawn larger, with the three
 * rules intact: the name in text is the identification, the shape is the
 * person, the colour is the organisation. Nothing here is derived from any
 * person's appearance, and nothing here is fetched.
 *
 * WHY IT REDRAWS THE PATH INSTEAD OF <use>-ING THE SPRITE. The sprite's
 * outlines carry stroke-width as a presentation attribute in 24-unit space. A
 * <use> scaled 4x scales the stroke with it, to the equivalent of a 7px line,
 * and inheritance cannot override a presentation attribute set inside the
 * symbol. Drawing the path into the document instead puts the geometry where a
 * CSS rule can reach it, so `.avtp__mk > *` sets one weight for every element
 * and the portrait is crisp rather than inflated. The sprite is still the right
 * answer at 20-34px and both call sites keep using it.
 *
 * @param {string} personId  a key of PEOPLE, or anything personIdFor() resolves
 * @param {object} [opts]
 * @param {boolean} [opts.decorative=false]
 *        true marks the whole SVG aria-hidden. Correct ONLY when the caller
 *        prints the person's name and organisation as text beside it, which is
 *        what /leaders does: role="img" there would read the same two facts a
 *        second time on each of fifteen cards. The default is labelled.
 * @param {string} [opts.idPrefix='avtp']
 *        Disambiguator for the <title> id. Two portraits of the same person on
 *        one page need different prefixes; content-derived rather than
 *        counted, so the output does not depend on call order.
 * @returns {string} HTML
 */
export function avatarPortrait(personId, opts = {}) {
  const id = personIdFor(personId);
  if (!id) throw new Error(`_avatars: no principal portrait for ${JSON.stringify(personId)}`);
  const p = PEOPLE[id];
  const decorative = opts.decorative === true;
  const prefix = typeof opts.idPrefix === 'string' && opts.idPrefix ? opts.idPrefix : 'avtp';
  const tid = `${prefix}-${id}-t`;

  // 120 x 136. The emblem is 88 units square, which at the 112px the card
  // renders it at is a 92px mark — over the 96px the brief asked for once the
  // frame is counted, and still square-ish on a 375px phone at 88px.
  const mk = `<g class="avtp__mk" transform="translate(16 12) scale(3.6667)">${SHAPE[p.shape]}</g>`;

  // The monogram sits at the emblem's centre, not the tile's: every shape in
  // SHAPE is drawn to keep y=12 of its own 24-unit box clear, and that maps to
  // y=56 here.
  const mono = `<text class="avtp__i" x="60" y="68" text-anchor="middle" font-size="31">${esc(p.initials)}</text>`;

  const foot = `<path class="avtp__rule" d="M14 111h92" fill="none"/>`
    + `<text class="avtp__o" x="60" y="126" text-anchor="middle" font-size="10">${esc(p.tag)}</text>`;

  // Corner ticks. Purely decorative, identical for everybody, and drawn
  // OUTSIDE the emblem so they never fight the monogram.
  const hud = '<g class="avtp__hud" fill="none">'
    + '<path d="M5 17V5h12M103 5h12v12M115 119v12h-12M17 131H5v-12"/></g>';

  const a11y = decorative
    ? ' aria-hidden="true" focusable="false"'
    : ` role="img" aria-labelledby="${esc(tid)}"`;
  const title = decorative
    ? ''
    : `<title id="${esc(tid)}">${esc(p.name)} — ${esc(p.role)}, ${esc(p.orgName)}. `
      + 'An abstract monogram, not a likeness.</title>';

  return `<svg class="avtp" viewBox="0 0 120 136"${a11y} data-person="${esc(id)}" data-org="${esc(p.org)}" data-shape="${esc(p.shape)}">`
    + title
    + '<rect class="avtp__bg" x="0.75" y="0.75" width="118.5" height="134.5" rx="9"/>'
    + hud + mk + mono + foot
    + '</svg>';
}

/**
 * Paint for the portrait, as a CSS string.
 *
 * It ships from here rather than from site/styles.mjs for the reason
 * accentStyleTag() already gives: that file is another module's, and a caller
 * that inlines this block gets the whole feature with no edit to the sheet.
 * Inlining it twice on one page is harmless — the rules are identical.
 *
 * --avtp-size is the one number a caller tunes. Everything inside the tile is
 * in viewBox units and scales with it, so there is no second breakpoint to
 * keep in step.
 */
export function portraitCss() {
  return `
.avtp {
  display: block; width: var(--avtp-size, 96px); height: auto; flex: 0 0 auto;
  color: var(--avt-a, var(--ink-dim));
}
.avtp__bg { fill: var(--bg-raised); stroke: var(--rule); stroke-width: 1.5; }
.avtp__hud { stroke: currentColor; stroke-width: 2; stroke-linecap: square; opacity: 0.85; }
.avtp__mk {
  stroke: currentColor; fill: transparent;
  fill: color-mix(in srgb, currentColor 14%, transparent);
  stroke-linejoin: round; stroke-linecap: round;
}
/* One weight for every element of the emblem. This is the rule the doc comment
   on avatarPortrait() is about: it beats the stroke-width presentation
   attributes inside the shape data, which are tuned for a 24px box. */
.avtp__mk > * { stroke-width: 0.52; }
.avtp__i {
  font-family: var(--mono); font-weight: 700; fill: var(--ink);
  letter-spacing: 0.01em;
}
.avtp__rule { stroke: var(--rule); stroke-width: 1; }
.avtp__o {
  font-family: var(--mono); fill: var(--ink-faint);
  letter-spacing: 0.14em;
}
`;
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
