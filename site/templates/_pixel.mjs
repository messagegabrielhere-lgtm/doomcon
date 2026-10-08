// Shared pixel-art helpers for the PizzINT-style chrome: crisp vector blocks,
// a 5x7 bitmap headline face drawn as blocks (with the words kept as text for
// screen readers and search), small pixel icons, and the generated art that
// stands for each room of the site.
import { esc } from './_html.mjs';

// ---------- pixel helpers (crisp vector blocks, merged per row) ----------
export function blocks(rows, pal, k, extra = '') {
  let w = 0; for (const r of rows) if (r.length > w) w = r.length;
  let out = '';
  rows.forEach((r, y) => {
    let x = 0;
    while (x < r.length) {
      const ch = r[x]; const c = pal[ch];
      if (!c) { x++; continue; }
      let x2 = x; while (x2 < r.length && r[x2] === ch) x2++;
      out += `<rect x="${x}" y="${y}" width="${x2 - x}" height="1" fill="${c}"/>`;
      x = x2;
    }
  });
  return `<svg class="v2-px"${extra} width="${w * k}" height="${rows.length * k}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}

const G = {
  A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.#### #.... #.... #.... #.... #.... .####', D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
  G: '.#### #.... #.... #.### #...# #...# .####', H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###', J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.', P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.', V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '.#. ##. .#. .#. .#. .#. ###',
  2: '.###. #...# ....# ...#. ..#.. .#... #####', 3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.', 9: '.###. #...# #...# .#### ....# ....# .###.',
  '.': '. . . . . . #', "'": '# # . . . . .', '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '-': '... ... ... ### ... ... ...', ' ': '.. .. .. .. .. .. ..',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..', '!': '# # # # # . #', ':': '. # . . . # .', '&': '.##.. #..#. .##.. .#... #.#.# #..#. .##.#',
};
// Headline type drawn as blocks. The words are also in the markup as text, so
// the page reads the same to a screen reader, a search engine and the build.
export function pixelText(text, k, color, cls = '') {
  const rows = ['', '', '', '', '', '', ''];
  [...String(text).toUpperCase()].forEach((ch, i) => {
    const g = (G[ch] || G[' ']).split(' ');
    for (let r = 0; r < 7; r++) rows[r] += (i ? '.' : '') + g[r];
  });
  return `<span class="v2-ptext ${cls}"><span class="v2-sr">${esc(text)}</span>${blocks(rows, { '#': color }, k)}</span>`;
}

export const ICON = {
  clock: [{ a: '#4ADE80', b: '#FFFFFF' }, ['...aaaaaa...', '..a......a..', '.a...b....a.', 'a....b.....a', 'a....b.....a', 'a....bbb...a', 'a..........a', 'a..........a', '.a........a.', '..a......a..', '...aaaaaa...']],
  eye: [{ a: '#4ADE80', b: '#86EFAC', c: '#FFFFFF' }, ['....aaaa....', '..aa....aa..', '.a...bb...a.', 'a...bccb...a', 'a...bccb...a', '.a...bb...a.', '..aa....aa..', '....aaaa....']],
  bolt: [{ a: '#F87171' }, ['......aa....', '.....aa.....', '....aa......', '...aa.......', '..aaaaaa....', '.....aa.....', '....aa......', '...aa.......', '..aa........', '..a.........']],
  shield: [{ a: '#4ADE80', b: '#064E1E', c: '#BBF7D0', '@': '#000000' }, ['@@@@@@@@@@@@', '@aaaaaaaaaa@', '@abbbbbbbba@', '@abbbbbbcba@', '@abbbbbccba@', '@abcbbccbba@', '@abccccbbba@', '.@abbcbbba@.', '.@abbbbbba@.', '..@abbbba@..', '...@aaaa@...', '....@@@@....']],
  speaker: [{ a: '#E5E7EB', b: '#9CA3AF', c: '#F87171' }, ['.....a...c..', '....aa....c.', '.bbaaa..c..c', '.bbaaa...c.c', '.bbaaa...c.c', '.bbaaa..c..c', '....aa....c.', '.....a...c..']],
  robot: [{ a: '#9CA3AF', b: '#0B0F17', c: '#FFFFFF', '@': '#000000' }, ['.....cc.....', '.....aa.....', '..aaaaaaaa..', '.aaaaaaaaaa.', '.aabbaabbaa.', '.aabbaabbaa.', 'caaaaaaaaaac', '.aaaaaaaaaa.', '.aaccccccaa.', '.aaaaaaaaaa.', '..aaaaaaaa..']],
};
export const icon = (name, k, tint) => {
  const [pal, rows] = ICON[name];
  return blocks(rows, tint ? { ...pal, a: tint } : pal, k);
};


// Which generated illustration (assets/img/art-<name>.webp) stands for which room.
export const ROOM_ART = {
  '/': 'siren', '/arena.html': 'stocks', '/scanner.html': 'magnifier', '/monitor.html': 'satellite', '/race.html': 'radar', '/news.html': 'news',
  '/watts.html': 'power', '/map.html': 'server', '/world.html': 'globe', '/flock.html': 'camera',
  '/exploits.html': 'bug', '/leaders.html': 'mic', '/elon.html': 'camera', '/digest.html': 'clipboard', '/jobs.html': 'case',
  '/medicine.html': 'pill', '/balance.html': 'scales', '/bliss.html': 'sun', '/prepper-checklist.html': 'clipboard', '/feedback.html': 'mic', '/si-ready.html': 'scales', '/ai-proof-job.html': 'case', '/breakthroughs.html': 'sun', '/live-x.html': 'satellite',
  '/methodology.html': 'magnifier', '/instruments.html': 'magnifier', '/bets.html': 'dice',
  '/ai-doomsday-clock.html': 'clock', '/desk.html': 'canary', '/game.html': 'joystick',
  '/library.html': 'books', '/bunker-kit.html': 'bunker', '/history.html': 'archive', '/moves/': 'archive',
  '/about.html': 'canary', '/guide.html': 'siren', '/p-doom.html': 'clock', '/sponsor.html': 'case',
  '/privacy.html': 'camera', '/press.html': 'news', '/brand.html': 'siren',
};
export function roomArt(path) {
  if (ROOM_ART[path]) return ROOM_ART[path];
  if (String(path).startsWith('/moves/')) return 'archive';
  if (String(path).startsWith('/item/')) return 'news';
  return null;
}

// One line per level, in the voice of the front page. Used by the banner, the
// browser tab title and the share description.
export const LEVEL_LINE = {
  5: 'Quiet. Too quiet.',
  4: 'The machines are working late.',
  3: 'Something is being trained.',
  2: 'Clear your calendar.',
  1: 'Nobody has seen this before.',
};
