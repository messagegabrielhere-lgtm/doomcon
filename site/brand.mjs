// Brand constants. Everything that renders a name, a URL or a level word reads
// from here, so registering doomcon.watch is a one-line change (CANONICAL_URL)
// rather than a grep across twelve templates.
//
// THE RULE THIS FILE EXISTS TO HOLD: voice in the words, rigour in the number.
// Every string below may be vivid. No string below may make a claim the engine
// cannot support. The WHO's six-phase pandemic scale is the cautionary tale -
// Phase 6 measured geographic spread, the public read it as severity, H1N1 was
// mild, and the numbered phases were gone by 2013. A scale is read as whatever
// its name suggests, so these names describe the instrument, never the danger.

export const NAME = 'DOOMCON';

// DECISION: the tagline moved from self-deprecation ("We don't know anything.
// We just count.") to a line that points at the competition. Every rival in
// this category - DoomBench, the AI Safety Clock, the p(doom) countdowns -
// publishes a number produced by human or model judgement that a stranger
// cannot reproduce. Ours can be reproduced from the receipt. That is the whole
// moat, and the masthead is the cheapest place in the build to say it.
//
// TRAP: collector/card.mjs MEASURES this string (estWidth at 22px) to size the
// card's right-hand column, and the left column gets whatever is left over. A
// long tagline shrinks the level line until fitSize() drops under MIN_FONT and
// auditCard() fails the build. Keep it at or under the ~38 characters the
// original ran to. This one is 37.
export const TAGLINE = 'Nobody knows the odds. We keep count.';

// The original line, kept verbatim because CONTRACT.md, README.md and
// docs/METHODOLOGY.md all quote it and it is still the most honest sentence on
// the site. Rendered wherever there is room for a second line.
export const CREED = "We don't know anything. We just count.";

// The long form, for surfaces with a full sentence of room: og:description
// fallbacks, the history page, an about box. Says the moat out loud.
export const STRAPLINE =
  'Everyone has a p(doom). Nobody has a receipt. DOOMCON counts what is ' +
  'observably happening, hourly, and publishes the arithmetic.';

// The domain we intend to own. Deliberately separate from CANONICAL_URL: we
// spell this one out in post text and burn it into share cards even while the
// site still lives on github.io, so the printed brand never has to change.
export const DOMAIN = 'doomcon.watch';

// Where the site is actually served from today. GitHub Pages project sites are
// served under /<repo>, NOT at the host root — every internal link has to carry
// that prefix or the whole site 404s the moment it leaves localhost. BASE_PATH
// below derives it, so swapping to 'https://doomcon.watch' empties the prefix
// automatically.
export const CANONICAL_URL = 'https://messagegabrielhere-lgtm.github.io/doomcon';

// pizzint ships twitter:site="@pizzint" while their account is @pizzintwatch —
// the card is misattributed on every share. The fix is not "be careful", it is
// "have no default". Leave this null until an account genuinely exists and is
// controlled by us; layout.mjs omits the tag entirely when it is null rather
// than guessing a plausible handle.
export const X_HANDLE = null;

// TRAP: no source count in this string. "Fourteen sources" was true on the day
// it was typed and becomes a lie the first time an adapter lands or dies — in a
// field (og:description, api/index.json) that nobody ever re-reads. Counts come
// from state.json at render time or they do not appear at all.
export const DESCRIPTION =
  'The AIpocalypse, instrumented. Five pillars of public data, one 0-100 score ' +
  'and one level, recomputed hourly. No model scores it and no human votes on ' +
  'it — every number is reproducible from a published receipt.';

// Levels count DOWN toward louder, borrowing DEFCON's grammar so nobody needs
// the legend explained. Bands are duplicated from CONTRACT.md; the engine owns
// the arithmetic and state.json carries level_name, these are for the legend
// and for a loud failure if the two ever disagree.
//
// DECISION — why `name` is untouched while the voice went into new fields:
// collector/engine.mjs owns LEVEL_NAMES, writes level_name into state.json, and
// site/build.mjs refuses to ship when state.level_name disagrees with
// levelMeta(level).name. collector/card.mjs holds a third copy. Renaming ROUTINE
// here would fail the build against every receipt already written and every card
// already rendered. So the canonical word stays fixed and the personality lives
// in `epithet` (2-4 words, for badges, chips and card straps) and `description`
// (one paragraph, for legends and the history page).
//
// Every string below is about the NEEDLE, never about the world. That is the
// line: "off the top of the chart" is a fact about our reference distribution.
// It is not a fact about anybody's odds.
export const LEVELS = [
  {
    level: 5,
    name: 'DORMANT',
    band: [0, 34],
    epithet: 'Needle at rest',
    gloss: 'Activity below this index’s own historical norm.',
    description:
      'The floor of the scale. Papers, releases, filings and market odds are all moving ' +
      'slower than this index calls normal. That is not safety — it is a quiet hour on the ' +
      'instruments, and we post it exactly as loudly as we post the rest.',
  },
  {
    level: 4,
    name: 'ROUTINE',
    band: [35, 54],
    epithet: 'Needle breathing',
    gloss: 'Activity within the normal range of the record.',
    description:
      'Business as usual for a field whose usual is already loud. The scale is centred here by ' +
      'construction — 50 is the middle of the frozen reference distribution — so a reading in ' +
      'this band means nothing across the five pillars is behaving out of character.',
  },
  {
    level: 3,
    name: 'ELEVATED',
    band: [55, 69],
    epithet: 'Off the rest stop',
    gloss: 'Activity above the normal range of the record.',
    description:
      'Something is carrying the average. One or more pillars have pulled clear of their own ' +
      'reference distribution and the composite has followed them up. It says louder than ' +
      'usual. It does not say why, and the pillar breakdown is where you go to find out.',
  },
  {
    level: 2,
    name: 'ACCELERATED',
    band: [70, 84],
    epithet: 'Pinned high',
    gloss: 'Activity in the top decile of the record.',
    description:
      'The top decile of the record, with several pillars high at once. That is what it looks ' +
      'like when releases, capital and paperwork land in the same window — and it is also what ' +
      'it looks like when one source is having a strange week. The receipt tells them apart.',
  },
  {
    level: 1,
    name: 'UNPRECEDENTED',
    band: [85, 100],
    epithet: 'Off the top of the chart',
    gloss: 'Activity beyond anything in the record.',
    description:
      'Past the top of the reference distribution: the frozen backfill holds nothing like this. ' +
      'The name is a statement about our own record running out, not about the world ending. ' +
      'Those are two different sentences and this index refuses to merge them.',
  },
];

// Fixed ids, fixed order, never renamed (CONTRACT.md "The five pillars").
// Order here is render order everywhere on the site.
//
// `blurb` is the 12px line inside a pillar card on a 375px phone: room for one
// clause and not a word more. `description` is the paragraph version, for the
// methodology page, the history page legend, and anywhere with a column width.
export const PILLARS = [
  {
    id: 'capability',
    name: 'Capability',
    blurb: 'What shipped, and what got written down.',
    description:
      'Preprints, model releases, release notes, repository activity. The field leaves a paper ' +
      'trail every time it moves. This pillar counts the trail; it does not read it.',
  },
  {
    id: 'compute',
    name: 'Compute & Capital',
    blurb: 'Silicon, spend, and the market’s opinion of both.',
    description:
      'GPU spot prices, rentable supply, disclosed capital expenditure, and what the market pays ' +
      'for the companies selling the shovels. Weights can be kept secret. The power bill cannot.',
  },
  {
    id: 'attention',
    name: 'Attention',
    blurb: 'How loudly the world is talking.',
    description:
      'News volume, search interest, forum and repository chatter. The softest pillar, and the ' +
      'first to spike at nothing — which is precisely why it is one of five and not one of one.',
  },
  {
    id: 'governance',
    name: 'Governance',
    blurb: 'Paperwork with the force of law.',
    description:
      'Bills, consultations, statutory instruments, enforcement notices. The slowest pillar, and ' +
      'the one that leaves the cleanest dates: a regulation has a number, a journal and a day.',
  },
  {
    id: 'markets',
    name: 'Markets',
    blurb: 'Where money is posted against an opinion.',
    description:
      'Polymarket, Kalshi, Manifold. The only pillar whose sources pay for being wrong, which ' +
      'makes it the only one where an opinion carries a price instead of a byline.',
  },
];

// The one sentence that has to appear near the number on every surface. Levels
// describe observable tempo, never probability of harm (TEARDOWN 6.1, the WHO
// Phase-6 lesson). If this line ever gets cut for space, cut something else.
//
// DECISION: it now leads with the distinction instead of the definition.
// "Observable activity tempo relative to this index's own history" is precise
// and nobody finishes reading it. "How much is happening, not how bad it is" is
// the same claim in words that survive being skimmed on a phone, with the
// precise version immediately behind it for anyone who did not skim.
export const DISCLAIMER =
  'DOOMCON measures how much is happening, not how bad it is. Levels describe ' +
  'observable activity tempo against this index’s own record. They are not a ' +
  'probability of harm.';

// For surfaces with one line and no more: embed chrome, a card strap, a tooltip.
// Never a substitute for DISCLAIMER anywhere DISCLAIMER fits.
export const DISCLAIMER_SHORT = 'Activity tempo, not probability of harm.';

// The three denials, kept as data so the history page, the methodology page and
// any future FAQ state them identically. DoomBench runs an FAQ explaining that
// its 67.8 "does not mean a 60 percent probability" — that FAQ exists because
// the denial was not on the surface where the number was.
//
// TRAP, found by running collector/posts.findFutureViolation() over every string
// in this module: "Not a forecast." is REJECTED by the post pre-flight, because
// the ban is a word list and does not know the difference between asserting the
// future and denying it. Every string here is a candidate for post copy, so it
// says "prediction" instead — a noun the ban deliberately permits, since the
// markets pillar is built on prediction markets. Same meaning, ships.
export const NOT_CLAIMS = [
  {
    claim: 'Not a probability.',
    because:
      'Nothing here is a p(doom). The composite is a percentile of observed activity, ' +
      'rescaled. It carries no units of risk and no opinion about outcomes.',
  },
  {
    claim: 'Not a prediction.',
    because:
      'Every number on this site describes an observation that has already happened, stamped ' +
      'in UTC. Generated copy is barred from the future tense by a unit test, not by discipline.',
  },
  {
    claim: 'Not a judgement.',
    because:
      'No model scores it and no human votes on it. The same code over the same public inputs ' +
      'produces the same number, on your machine as on ours.',
  },
];

export const LICENSE = 'CC BY 4.0';
export const REPO_URL = 'https://github.com/messagegabrielhere-lgtm/doomcon';

// Derived. Empty string for an apex domain, '/doomcon' for the Pages project site.
export const BASE_PATH = new URL(CANONICAL_URL).pathname.replace(/\/+$/, '');
export const ORIGIN = new URL(CANONICAL_URL).origin;

export function levelMeta(level) {
  const found = LEVELS.find((l) => l.level === level);
  if (!found) throw new Error(`brand: unknown level ${JSON.stringify(level)} (expected 1-5)`);
  return found;
}

export function pillarMeta(id) {
  const found = PILLARS.find((p) => p.id === id);
  if (!found) throw new Error(`brand: unknown pillar id ${JSON.stringify(id)} (expected one of ${PILLARS.map((p) => p.id).join(', ')})`);
  return found;
}

// Module-load invariants. This file is hand-edited more often than anything else
// in the repo — it is where copy changes land — and a typo in a band edge would
// silently mis-place the caret in _parts.scaleTrack(), which derives its cell
// widths from exactly these numbers. Failing at import beats shipping a scale
// that draws 61.9 on the 70 mark.
(function assertBrandIntegrity() {
  const ids = PILLARS.map((p) => p.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`brand: duplicate pillar id in [${ids.join(', ')}]`);
  }
  for (const p of PILLARS) {
    for (const key of ['name', 'blurb', 'description']) {
      if (typeof p[key] !== 'string' || p[key].length === 0) {
        throw new Error(`brand: pillar "${p.id}" is missing a non-empty ${key}`);
      }
    }
  }

  const ordered = [...LEVELS].sort((a, b) => b.level - a.level);
  if (ordered.map((l) => l.level).join(',') !== '5,4,3,2,1') {
    throw new Error('brand: LEVELS must contain exactly levels 5,4,3,2,1');
  }
  let expectedFloor = 0;
  for (const l of ordered) {
    for (const key of ['name', 'epithet', 'gloss', 'description']) {
      if (typeof l[key] !== 'string' || l[key].length === 0) {
        throw new Error(`brand: level ${l.level} is missing a non-empty ${key}`);
      }
    }
    const [lo, hi] = l.band;
    if (lo !== expectedFloor) {
      throw new Error(
        `brand: level ${l.level} band starts at ${lo}, expected ${expectedFloor} — ` +
        'the bands must tile 0-100 with no gap and no overlap',
      );
    }
    if (!(hi > lo)) throw new Error(`brand: level ${l.level} band [${lo}, ${hi}] is not ascending`);
    expectedFloor = hi + 1;
  }
  if (expectedFloor !== 101) {
    throw new Error(`brand: level bands stop at ${expectedFloor - 1}, expected 100`);
  }
})();
