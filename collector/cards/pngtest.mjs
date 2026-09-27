/**
 * collector/cards/pngtest.mjs — what the PNG share cards actually print.
 *
 *   docker run --rm -v "$PWD":/app -w /app node:20-alpine \
 *     node collector/cards/pngtest.mjs
 *
 * A PNG cannot be grepped: the letters are strokes. site/cardpng.mjs therefore
 * records every string a card sets, with its cap height, and hands the list
 * back through `opts.trace`. This renders all six cards site/build.mjs ships
 * to public/cards/ from the live data and checks the four things the brand
 * cannot survive getting wrong on the surface most people see first:
 *
 *   1. THE DOMAIN. brand.DOMAIN is printed and doomcon.watch — which does not
 *      resolve — is not.
 *   2. LEGIBILITY. X shows a landscape card at roughly 500px wide on a phone;
 *      under ~11px at 1200 wide is unreadable there. Nothing is set below
 *      that floor, scaled to the card's own width.
 *   3. THE SENTENCE. The state card leads with the homepage's own <h1>, word
 *      for word, reassembled from the wrapped lines it was traced as.
 *   4. THE DIRECTION. Every card that draws the ladder prints CALM and SEVERE.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateCard, headlineCard, raceCard, levelSentenceText } from '../../site/cardpng.mjs';
import * as brand from '../../site/brand.mjs';

const ROOT = process.cwd();
const load = (n) => {
  const p = join(ROOT, 'data', n);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
};
const state = load('state.json');
const news = load('news.json');
const race = load('race.json');
const item = news && Array.isArray(news.items) ? news.items[0] : null;

let failures = 0;
const fail = (m) => { failures += 1; console.log(`FAIL  ${m}`); };
const pass = (m) => console.log(`ok    ${m}`);

if (!state || state.level == null || state.score == null) {
  fail('no scored level in data/state.json; nothing to render');
}

const em = String.fromCharCode(0x2014);
for (const format of ['landscape', 'portrait']) {
  const W = format === 'portrait' ? 1080 : 1200;
  const floor = Math.round(((11 * W) / 1200) * 10) / 10;
  const cards = [
    ['state', state, (d, o) => stateCard(d, o), true],
    ['headline', item, (d, o) => headlineCard(d, { ...o, level: state.level }), true],
    ['race', race, (d, o) => raceCard(d, { ...o, level: state.level }), false],
  ];
  for (const [name, data, draw, hasLadder] of cards) {
    if (!data) { console.log(`skip  ${name}-${format}: no data`); continue; }
    const trace = [];
    try { draw(data, { format, trace }); } catch (err) { fail(`${name}-${format}: ${err.message}`); continue; }
    const id = `${name}-${format}`;
    const texts = trace.map((t) => t.text);
    const min = Math.min(...trace.map((t) => t.size));
    const smallest = [...new Set(trace.filter((t) => t.size === min).map((t) => t.text))].slice(0, 3);

    const printed = texts.filter((t) => t.toLowerCase() === String(brand.DOMAIN).toLowerCase());
    if (!printed.length) fail(`${id}: does not print brand.DOMAIN "${brand.DOMAIN}"`);
    const dead = texts.filter((t) => /doomcon\.watch/i.test(t));
    if (dead.length) fail(`${id}: prints doomcon.watch, which does not resolve: ${JSON.stringify(dead[0])}`);
    if (printed.length && !dead.length) pass(`${id}: prints ${printed[0]}`);

    if (min < floor) fail(`${id}: ${JSON.stringify(smallest)} set at ${min}px, under the ${floor}px floor`);
    else pass(`${id}: smallest type ${min}px (${JSON.stringify(smallest)}), floor ${floor}px`);

    if (hasLadder) {
      if (texts.includes('CALM') && texts.includes('SEVERE')) pass(`${id}: ladder ends read CALM and SEVERE`);
      else fail(`${id}: ladder is missing CALM or SEVERE`);
    }
    if (name === 'state') {
      const want = levelSentenceText(state);
      const page = `AI activity is at ${brand.NAME} ${state.level} ${em} ${state.level_name}, on a scale where 1 is loudest.`;
      if (want !== page) fail(`${id}: levelSentenceText() "${want}" is not the page's "${page}"`);
      if (texts.join(' ').includes(want)) pass(`${id}: leads with "${want}"`);
      else fail(`${id}: the sentence is not on the card in order (${JSON.stringify(texts.slice(2, 8))})`);
    }
  }
}

console.log(failures ? `\n${failures} FAILURES` : '\nall checks pass');
process.exit(failures ? 1 : 0);
