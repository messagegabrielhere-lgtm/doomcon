/**
 * CARD 4 — THE DEVELOPING CARD.  collector/cards/developing.mjs
 *
 * A live event cluster: the lead headline, how many independent feeds carried
 * it, how fast, and which severity terms fired.
 *
 * THE HERO IS THE CORROBORATION COUNT, NOT THE HEADLINE. That is the whole
 * design. Every account in this category posts a headline; the number that
 * makes a headline worth more than a screenshot is how many separate newsrooms
 * arrived at it independently and how quickly, and that number is the one thing
 * this project computes about a story. So "3" is 220px tall and the headline
 * is set underneath it at reading size. docs/VOICE.md §2 habit 4 — name the
 * source in the sentence — is the rule; this card makes it the picture.
 *
 * THE SENTENCE THIS CARD EXISTS TO NOT SAY. A severity term firing is a fact
 * about the words in a headline. It is not a fact about the world, it is not a
 * risk score, and it does not move the DOOMCON level — the newsroom is not one
 * of the fourteen sources the index reads, and the card says so in its own
 * band, in the largest type it can spare, above the limitation box.
 *
 * READS: data/news.json  .stories[] (source_count, severity, severity_terms,
 *        span_hours, members, lead) joined to .items[] by id; data/state.json
 *        for the level the band asserts is unmoved.
 * POSTS: when a cluster first reaches MIN_SOURCES independent feeds, at most
 *        once per cluster id. See shouldPost().
 */

import {
  CARD_W, MARGIN, COL, RULE, GROUND_RAISED, INK, INK_DIM, INK_FAINT,
  HEAT, Surface, fit, fmt1, fold, wrapFit, textWidth, utcStamp, W_HERO, W_MED,
} from './_kit.mjs';
import { chassis, limitBox, eyebrow, BODY_TOP } from './_chassis.mjs';

/** Independent feeds needed before a cluster is a card. Two is the floor the
 *  posts generator already uses (MIN_CORROBORATION); three is asked for here
 *  because a card is louder than a post and should cost more. */
export const MIN_SOURCES = 3;

/** Hours after the last item at which a cluster stops being "developing". */
export const MAX_AGE_HOURS = 36;

const TIER_HUE = { a: '#ff5f56', b: '#ff8b3d', c: '#ffb020' };
const TIER_WORD = { a: 'TIER A', b: 'TIER B', c: 'TIER C' };

/** The cluster this card would draw, or null. Pure. */
export function pick(news, { now = null } = {}) {
  if (!news || !Array.isArray(news.stories)) return null;
  const byId = new Map((news.items || []).map((i) => [i.id, i]));
  const t = now ? new Date(now).getTime() : new Date(news.generated_at).getTime();

  const candidates = news.stories
    .filter((st) => st.source_count >= MIN_SOURCES)
    .filter((st) => byId.has(st.lead))
    .filter((st) => (t - new Date(st.last_published_at).getTime()) / 36e5 <= MAX_AGE_HOURS)
    // Severity first, then corroboration, then tightness. Ties broken by id so
    // two runs over the same file choose the same story. No Math.random here or
    // anywhere: CONTRACT.md §4.
    .sort((a, b) => (b.severity - a.severity)
      || (b.source_count - a.source_count)
      || (a.span_hours - b.span_hours)
      || a.id.localeCompare(b.id));

  if (!candidates.length) return null;
  const st = candidates[0];
  return {
    story: st,
    lead: byId.get(st.lead),
    members: st.members.map((m) => byId.get(m)).filter(Boolean),
  };
}

export function shouldPost({ news, state } = {}) {
  if (!news) return { ok: false, why: 'no data/news.json' };
  if (!state || state.level == null) return { ok: false, why: 'no level in data/state.json for the band' };
  const got = pick(news);
  if (!got) {
    const best = Math.max(0, ...(news.stories || []).map((s) => s.source_count));
    return {
      ok: false,
      why: `no cluster has ${MIN_SOURCES} independent feeds inside ${MAX_AGE_HOURS}h `
        + `(best today: ${best})`,
    };
  }
  return { ok: true, storyId: got.story.id };
}

export function build(data, opts = {}) {
  const gate = shouldPost(data);
  if (!gate.ok) throw new Error(`developing card: ${gate.why}`);
  const { news, state } = data;
  const { story, lead, members } = pick(news);

  const s = new Surface();
  chassis(s, {
    level: state.level,
    kind: 'DEVELOPING',
    observedAt: news.generated_at,
    domain: opts.domain ?? null,
  });

  /* ---- the hero: the corroboration count ------------------------------- */
  eyebrow(s, 'Independent feeds carrying one story', MARGIN, BODY_TOP + 20);

  s.text(String(story.source_count), MARGIN, BODY_TOP + 232, 172, HEAT[3], {
    track: 0, weight: W_HERO, role: 'hero',
  });

  const gx = MARGIN + 210;
  const gw = COL - 210;
  s.text('Independent', gx, BODY_TOP + 112, 50, INK, { track: 0.01, weight: W_MED, role: 'thumb' });
  s.text('sources', gx, BODY_TOP + 180, 50, INK, { track: 0.01, weight: W_MED, role: 'thumb' });
  const span = story.span_hours < 1
    ? `All within ${Math.round(story.span_hours * 60)} minutes`
    : `All within ${fmt1(story.span_hours)} hours`;
  s.text(span, gx, BODY_TOP + 222, fit(span, 22, gw), INK_DIM, { track: 0.01 });

  s.rect(MARGIN, BODY_TOP + 264, COL, 2, RULE);

  /* ---- the headline ----------------------------------------------------- */
  // Somebody else's words, set verbatim. cardpng's face carries mixed case and
  // real punctuation, so a headline needs no folding at all in the normal case;
  // fold() still reports anything it could not set, and a headline that loses
  // more than two characters is refused rather than quietly altered.
  const folded = fold(lead.title);
  if (folded.lost > 2) {
    throw new Error(`developing card: headline loses ${folded.lost} characters to the font: "${lead.title.slice(0, 70)}…"`);
  }
  const head = wrapFit(folded.text, 30, COL, 5, 18);
  const lineH = Math.round(head.size * 1.36);
  const headTop = BODY_TOP + 288;
  head.lines.forEach((ln, i) => {
    s.text(ln, MARGIN, headTop + lineH * (i + 1), head.size, INK, { track: 0.01 });
  });

  /* ---- the terms that fired --------------------------------------------- */
  const seen = new Set();
  const terms = [];
  for (const t of story.severity_terms || []) {
    const k = String(t.term).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    terms.push(t);
  }
  const termsTop = 724;
  if (terms.length) {
    eyebrow(s, 'Severity terms that fired in these headlines', MARGIN, termsTop);
    let cx = MARGIN;
    let cy = termsTop + 14;
    for (const t of terms.slice(0, 8)) {
      const label = fold(t.term).text;
      const sz = 22;
      const w = textWidth(label, sz, 0.01) + 70;
      if (cx + w > MARGIN + COL) { cx = MARGIN; cy += 48; }
      if (cy + 38 > 840) break;                 // two rows is the budget
      s.rect(cx, cy, w, 36, GROUND_RAISED, { r: 18 });
      s.frame(cx + 1, cy + 1, w - 2, 34, TIER_HUE[t.tier] || INK_DIM, { r: 17, width: 2, alpha: 0.85 });
      // The tier is a LETTER before it is a hue.
      s.text(String(t.tier).toUpperCase(), cx + 17, cy + 25, 20, TIER_HUE[t.tier] || INK_DIM, { track: 0 });
      s.text(label, cx + 44, cy + 25, sz, INK, { track: 0.01 });
      cx += w + 11;
    }
  }

  /* ---- who carried it, and when ----------------------------------------- */
  const whoTop = 862;
  eyebrow(s, 'Who carried it, and when', MARGIN, whoTop);
  members.slice(0, 3).forEach((it, i) => {
    const ry = whoTop + 14 + i * 34;
    s.disc(MARGIN + 5, ry + 13, 5, HEAT[4]);
    const nm = fold(it.source).text;
    s.text(nm, MARGIN + 22, ry + 20, fit(nm, 22, 320), INK_DIM, { track: 0.01 });
    s.text(utcStamp(it.published_at), CARD_W - MARGIN, ry + 20, 20, INK_FAINT,
      { align: 'right', track: 0.01 });
  });

  /* ---- the band this card exists for ------------------------------------ */
  // The most important sentence on the card, and the one a screenshot is most
  // likely to be missing. It gets a box of its own, above the limitation.
  const bandY = 988;
  s.rect(MARGIN, bandY, COL, 56, GROUND_RAISED, { r: 8 });
  s.rect(MARGIN, bandY, 5, 56, HEAT[state.level], { r: 2.5 });
  const band = `The newsroom does not move the level. DOOMCON holds at ${state.level}, ${state.level_name}.`;
  s.text(band, MARGIN + 22, bandY + 36, fit(band, 25, COL - 46), INK, { track: 0.01 });

  s.note('story', story.id);
  s.note('sources', story.source_count);
  s.note('terms', terms.map((t) => `${t.term}(${t.tier})`).join(' '));

  limitBox(s,
    'A severity term is a fact about the words in a headline, not about the world. '
    + 'The newsroom is not one of the index\u2019s sources.');

  return s;
}

export default { id: 'developing', build, shouldPost, pick, MIN_SOURCES };
