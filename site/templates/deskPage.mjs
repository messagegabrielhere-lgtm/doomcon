// TALLY'S DESK: the unserious counts. The competitor has a Strip Club Index;
// this is the same register with the house rule intact, which is that the joke
// lives in the framing and the number is straight. Every figure here is a
// plain count over data the site already publishes: the newsroom window in
// data/news.json and the scored readings behind /moves/. Nothing is weighted,
// nothing feeds the index, and a count of zero is printed as zero.
//
// Deterministic: no clock, no randomness. The stamps are the inputs' own.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { mascot } from './_mascot.mjs';

const N = (n) => Number(n).toLocaleString('en-US');

/** Headline counters: [id, title, pattern, what it counts, the joke]. */
const COUNTERS = [
  ['robots', 'The Robot Count', /\brobot/i, 'headlines containing the word "robot"',
    'A robot in a headline is not a robot in your kitchen. It is still a robot in a headline, and those we can count.'],
  ['billions', 'Billions Mentioned', /\bbillions?\b|\$\s?[\d.]+\s?(?:bn\b|b\b)/i, 'headlines that mention a billion of something',
    'Usually dollars. Occasionally parameters. Never apologies.'],
  ['betteridge', 'The Betteridge Index', /\?\s*$/, 'headlines that end in a question mark',
    'Betteridge’s law says the answer to any headline ending in a question mark is no. We only count the question marks.'],
  ['godfather', 'Godfather Sightings', /godfather/i, 'headlines containing the word "godfather"',
    'The field has more godfathers than a film trilogy. This is how many turned up this window.'],
  ['agi', 'The Said-It Counter', /\bAGI\b|superintelligen/i, 'headlines that say "AGI" or "superintelligence"',
    'Saying it is free. Counting how often it is said is also free, which is why it is here.'],
  ['doom', 'Doom, By Name', /\bdoom|extinction|apocalyp|existential/i, 'headlines that use doom, extinction, apocalypse or existential',
    'The word in our own name, counted where other people use it. It measures vocabulary and nothing else.'],
];

function streak(ctx) {
  const moves = Array.isArray(ctx.moves) ? [...ctx.moves] : [];
  if (!moves.length) return null;
  moves.sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)));
  let n = 0; let since = null;
  for (const m of moves) {
    n += 1; since = m.generated_at;
    if (m.level_changed) break;
  }
  return { n, since, level: moves[0].level, name: moves[0].level_name, at: moves[0].generated_at };
}

function shareLink(ctx, text) {
  return `<a class="dk__x" rel="noopener" target="_blank" href="https://x.com/intent/post?text=${encodeURIComponent(text)}&amp;url=${encodeURIComponent(ctx.url('/desk.html'))}">Post this on X</a>`;
}

export function hasDesk(ctx) {
  return Boolean(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length);
}

export function render(ctx) {
  const items = ctx.news.items;
  const total = items.length;
  const at = ctx.news.generated_at ? utc(ctx.news.generated_at) : 'an unstamped window';
  const st = streak(ctx);
  const level = ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null;

  const cards = [];
  if (st) {
    const line = `${brand.NAME} has read level ${st.level}, ${st.name}, for ${N(st.n)} readings in a row, since ${utc(st.since)}.`;
    cards.push(`<li class="dk__c" id="streak">
      <h2 class="dk__h">Nothing Ever Changes</h2>
      <p class="dk__n num">${esc(N(st.n))}</p>
      <p class="dk__u">consecutive readings at level ${esc(st.level)}, ${esc(st.name)}, since ${esc(utc(st.since))}</p>
      <p class="dk__j">The dial works. It is just not moving. When it does, this resets to one and somebody posts about it.</p>
      <p class="dk__f">${shareLink(ctx, line)} <a href="${esc(ctx.href('/moves/'))}">Every reading →</a></p>
    </li>`);
  }
  for (const [id, title, rx, what, joke] of COUNTERS) {
    const n = items.filter((i) => rx.test(String(i.title || ''))).length;
    const line = `${title}: ${N(n)} of ${N(total)} AI ${what.replace(/^headlines/, 'headlines')} as of ${at}. Counted by ${brand.NAME}.`;
    cards.push(`<li class="dk__c" id="${esc(id)}">
      <h2 class="dk__h">${esc(title)}</h2>
      <p class="dk__n num">${esc(N(n))}</p>
      <p class="dk__u">of ${esc(N(total))} ${esc(what)}, newsroom window as of ${esc(at)}</p>
      <p class="dk__j">${esc(joke)}</p>
      <p class="dk__f">${shareLink(ctx, line)}</p>
    </li>`);
  }

  const main = `
<style>
.dk__top { display: flex; align-items: center; gap: var(--s-4); margin: var(--s-4) 0 var(--s-3); }
.dk__h1 { margin: 0; }
.dk__l { list-style: none; margin: var(--s-5) 0; padding: 0; display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
.dk__c { margin: 0; padding: var(--s-4); border: 1px solid var(--rule); border-top: 6px solid var(--lvl, var(--accent)); border-radius: 8px; background: var(--bg-raised, var(--bg-sunken)); }
.dk__h { margin: 0; font: 700 var(--t-sm)/1.2 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
.dk__n { margin: var(--s-2) 0 0; font: 400 clamp(54px, 9vw, 84px)/1 var(--poster); color: var(--lvl, var(--accent)); }
.dk__u { margin: 4px 0 var(--s-3); font: 500 var(--t-xs)/1.45 var(--mono); letter-spacing: .04em; color: var(--ink-dim); }
.dk__j { margin: 0 0 var(--s-3); font: 400 var(--t-base)/1.5 var(--sans); color: var(--ink); }
.dk__f { margin: 0; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font: 500 var(--t-xs)/1.4 var(--mono); }
.dk__x { display: inline-block; padding: 7px 12px; border: 2px solid var(--lvl, var(--accent)); border-radius: 4px; color: var(--ink); text-decoration: none;
  font: 700 var(--t-xs)/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; }
.dk__x:hover, .dk__x:focus-visible { background: var(--lvl, var(--accent)); color: #0b0c0e; }
.dk__fine { font: 400 var(--t-sm)/1.55 var(--sans); color: var(--ink-dim); max-width: 70ch; }
</style>
<section class="dk">
  <p class="eyebrow">Tally’s desk · does not feed the main number</p>
  <div class="dk__top">${mascot({ size: 84, level })}<h1 class="dk__h1 bp__h1">The unserious counts</h1></div>
  <p class="lede">Side indexes, kept by the duty canary. The framing is a joke; the numbers are not. Each one is a plain count
    over the ${esc(N(total))} headlines in the <a href="${esc(ctx.href('/news.html'))}">newsroom</a> window or the published readings,
    and a count of zero is printed as zero.</p>
  <ul class="dk__l">
${cards.join('\n')}
  </ul>
  <p class="dk__fine">What these are not: a signal, a forecast, or an input to ${esc(brand.NAME)}. A headline count measures what
    editors wrote, in the feeds this site reads, inside one window. Matching is by word, so a headline about a film called
    “The Godfather” would count; the newsroom only keeps AI stories, which is why that has not happened yet.</p>
  <p><a href="${esc(ctx.href('/game.html'))}">Play Tally Counts, the 30-second counting game →</a></p>
</section>`;

  return page({
    ctx,
    path: '/desk.html',
    title: `Tally’s desk: the unserious counts · ${brand.NAME}`,
    description: `Side indexes from ${brand.NAME}: the Robot Count, the Betteridge Index, Godfather Sightings and how long the level has not changed. Straight counts, jokey framing.`,
    main,
  });
}
