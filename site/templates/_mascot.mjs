// TALLY, THE DUTY CANARY. An early-warning index already has a mascot in the
// language: the canary. This one wears a civil-defence helmet, and the helmet
// is painted in the current level's colour, so the character carries the
// reading the way the favicon and the seal do. It imitates a genre (the 1950s
// public-information cartoon), not any agency's emblem.
//
// Static SVG, no script, no motion. Decorative wherever it is used: the level
// is always in words beside it, so the figure is aria-hidden.

export function mascot({ size = 56, cls = '' } = {}) {
  return `<svg class="tally${cls ? ` ${cls}` : ''}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false">
  <g stroke="#0b0c0e" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M27 54v6m-3 0h6M37 54v6m-3 0h6" fill="none"/>
    <polygon points="46,42 59,38 56,50" fill="#f0b400"/>
    <ellipse cx="32" cy="41" rx="17" ry="15" fill="#ffd23f"/>
    <path d="M18 38q-7 7 2 14q6-3 6-11z" fill="#f0b400"/>
    <circle cx="32" cy="24" r="12.5" fill="#ffd23f"/>
    <path d="M18 21a14 14 0 0 1 28 0z" class="tally__hat"/>
    <rect x="14.5" y="19.5" width="35" height="4.6" rx="2.3" class="tally__hat"/>
    <polygon points="29,31 35,31 32,36" fill="#ff8b3d"/>
  </g>
  <ellipse cx="32" cy="46" rx="9" ry="7" fill="#ffe58a"/>
  <circle cx="32" cy="13.4" r="3.6" fill="#0b0c0e"/>
  <polygon points="32,11 34.4,15 29.6,15" fill="#fff"/>
  <circle cx="27" cy="28" r="2.1" fill="#0b0c0e"/><circle cx="37" cy="28" r="2.1" fill="#0b0c0e"/>
  <circle cx="27.7" cy="27.3" r=".7" fill="#fff"/><circle cx="37.7" cy="27.3" r=".7" fill="#fff"/>
</svg>`;
}

export function mascotCss() {
  return `
.tally { flex: none; display: block; }
.tally__hat { fill: var(--lvl, var(--accent)); }
`;
}
