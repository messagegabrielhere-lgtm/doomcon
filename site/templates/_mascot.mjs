// TALLY, THE DUTY CANARY. An early-warning index already has a mascot in the
// language: the canary. This one wears a civil-defence helmet, and the helmet
// is painted in the current level's colour, so the character carries the
// reading the way the favicon and the seal do. It imitates a genre (the 1950s
// public-information cartoon), not any agency's emblem.
//
// THE FACE IS THE LEVEL TOO. Pass a level and Tally is asleep at 5, whistling
// at 4, head up at 3, ruffled at 2 and in full squawk at 1. The mood describes
// how LOUD things are, never how bad: the index counts tempo, and so does the
// bird. With no level the neutral face is drawn.
//
// Static SVG, no script, no motion. Decorative wherever it is used: the level
// is always in words beside it, so the figure is aria-hidden.

/** What Tally is doing at each level; completes the sentence "Tally is …". */
export const MOODS = Object.freeze({
  5: 'asleep on the perch',
  4: 'whistling',
  3: 'head up',
  2: 'feathers ruffled',
  1: 'in full squawk',
});

const INK = '#0b0c0e';
const dot = (cx, r) => `<circle cx="${cx}" cy="28" r="${r}" fill="${INK}"/><circle cx="${cx + r / 3}" cy="${28 - r / 3}" r="${(r / 3).toFixed(2)}" fill="#fff"/>`;
const wide = (cx) => `<circle cx="${cx}" cy="28" r="3.3" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cx="${cx}" cy="28" r="1.5" fill="${INK}"/>`;
const drop = (x, y) => `<path d="M${x} ${y}q-2.4 3.6 0 5q2.4-1.4 0-5z" fill="#7fd0ff" stroke="${INK}" stroke-width="1"/>`;
const line = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
const BEAK = `<polygon points="29,31 35,31 32,36" fill="#ff8b3d" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;

const FACES = {
  5: line('M24.6 28q2.4 2.2 4.8 0') + line('M34.6 28q2.4 2.2 4.8 0') + BEAK
    + `<text x="47" y="15" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="currentColor">z</text><text x="53" y="9" font-family="Arial,sans-serif" font-size="6.5" font-weight="700" fill="currentColor">z</text>`,
  4: dot(27, 2.1) + dot(37, 2.1) + BEAK
    + `<path d="M50 20v-7l5-1.4v6.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="48.6" cy="20.2" r="1.7" fill="currentColor"/><circle cx="53.6" cy="18.6" r="1.7" fill="currentColor"/>`,
  3: dot(27, 2.6) + dot(37, 2.6) + BEAK,
  2: wide(27) + wide(37) + BEAK + drop(47.5, 24),
  1: wide(27) + wide(37)
    + `<polygon points="28.5,31 35.5,31 32,34.4" fill="#ff8b3d" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><polygon points="29.6,35.4 34.4,35.4 32,39.6" fill="#ff8b3d" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`
    + drop(47.5, 23) + drop(15.5, 26)
    + line('M52 31l5-1.6') + line('M52.6 35h5.4') + line('M12 31l-5-1.6') + line('M11.4 35H6'),
};
const NEUTRAL = dot(27, 2.1) + dot(37, 2.1) + BEAK;

export function mascot({ size = 56, cls = '', level = null } = {}) {
  const face = FACES[level] || NEUTRAL;
  return `<svg class="tally${cls ? ` ${cls}` : ''}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false">
  <g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M27 54v6m-3 0h6M37 54v6m-3 0h6" fill="none"/>
    <polygon points="46,42 59,38 56,50" fill="#f0b400"/>
    <ellipse cx="32" cy="41" rx="17" ry="15" fill="#ffd23f"/>
    <path d="M18 38q-7 7 2 14q6-3 6-11z" fill="#f0b400"/>
    <circle cx="32" cy="24" r="12.5" fill="#ffd23f"/>
    <path d="M18 21a14 14 0 0 1 28 0z" class="tally__hat"/>
    <rect x="14.5" y="19.5" width="35" height="4.6" rx="2.3" class="tally__hat"/>
  </g>
  <ellipse cx="32" cy="46" rx="9" ry="7" fill="#ffe58a"/>
  <circle cx="32" cy="13.4" r="3.6" fill="${INK}"/>
  <polygon points="32,11 34.4,15 29.6,15" fill="#fff"/>
  ${face}
</svg>`;
}

/** A self-contained file version: the hat colour is baked in, so it works
 *  anywhere an image does (a sticker, a slide, a post). */
export function mascotFile(level, hat) {
  return mascot({ size: 512, level })
    .replace('<svg class="tally"', '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(/ aria-hidden="true" focusable="false"/, ` role="img" aria-label="Tally the duty canary, ${MOODS[level] || 'on duty'}"`)
    .replace(/class="tally__hat"/g, `fill="${hat}"`)
    .replace(/currentColor/g, '#9aa2ad') + '\n';
}

export function mascotCss() {
  return `
.tally { flex: none; display: block; color: var(--ink-dim); }
.tally__hat { fill: var(--lvl, var(--accent)); }
`;
}
