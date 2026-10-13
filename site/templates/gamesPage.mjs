// /games.html — THE ARCADE. Every playable thing on SIREN in one place, so
// games are one click from any page (the icon rail's joystick lands here).
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

export const GAMES = [
  ['/contain.html', 'px:core', 'Containment', 'Arcade', 'Can you stop an AI breakout?', '#F87171'],
  ['/game.html', 'px:joystick', 'Signal or Noise', '30 seconds', 'Count the real signals, ignore the predictions. Beat your best score.', '#4ADE80'],
  ['/day-after.html', 'px:megaphone', 'The Day After', 'Strategy', 'An AI catastrophe just happened. Game out the public revolt, move by move.', '#FB923C'],
  ['/self-aware.html', 'px:redeye', 'The Night It Wakes Up', 'Simulation', 'Watch the Skynet scenario spread across a map of real US data centres.', '#EF4444'],
  ['/arena.html#battle', 'stocks', 'AI Battle', 'Live', 'AI models trade stocks and crypto against live prices. Pick a winner.', '#60A5FA'],
  ['/bets.html', 'dice', 'Tally’s Bets', 'Daily', 'Tally the canary makes forecasts about the index every day, scored in public.', '#FACC15'],
  ['/p-doom.html#voices', 'px:pclock', 'Set Your p(doom)', 'Dial', 'Twenty-eight named estimates, Hinton to Yudkowsky. Spin the dial and post yours.', '#A78BFA'],
  ['/si-ready.html', 'px:backpack', 'Ready for SI?', 'Quiz', 'A three-minute quiz that ends in your personal superintelligence plan.', '#22D3EE'],
  ['/ai-proof-job.html', 'px:rocket', 'AI-Proof Your Job', 'Quiz', 'Two minutes to find out how exposed your job is, and what to do about it.', '#34D399'],
];

const CSS = `<style>
.gm{max-width:1100px}.gm .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#4ADE80;margin:0 0 10px}
.gm-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin:18px 0}
.gm-c{display:flex;flex-direction:column;gap:8px;padding:16px;border:2px solid var(--rule);border-top:5px solid var(--c);border-radius:8px;background:var(--bg-raised,#0E131D);color:inherit!important;text-decoration:none!important;transition:transform .12s,border-color .12s}
.gm-c:hover,.gm-c:focus-visible{transform:translateY(-3px);border-color:var(--c)}
.gm-c img{width:56px;height:56px;image-rendering:pixelated}
.gm-c b{font:800 18px/1.2 var(--sans);color:#fff}.gm-c i{font:700 11px var(--mono);letter-spacing:.12em;color:var(--c);font-style:normal;text-transform:uppercase}
.gm-c small{font-size:13.5px;line-height:1.45;color:var(--ink-dim)}.gm-c span.go{margin-top:auto;font:700 12px var(--mono);color:var(--c)}
</style>`;

export function render(ctx) {
  const img = (n) => esc(ctx.href(String(n).startsWith('px:') ? `/img/px-${String(n).slice(3)}.svg` : `/img/art-${n}.webp`));
  const cards = GAMES.map(([h, ic, t, kind, blurb, c]) => `<a class="gm-c" href="${esc(ctx.href(h))}" style="--c:${c}"><img src="${img(ic)}" width="56" height="56" alt=""><i>${esc(kind)}</i><b>${esc(t)}</b><small>${esc(blurb)}</small><span class="go">▶ PLAY</span></a>`).join('');
  const main = `${CSS}<section class="gm">
  <p class="eyebrow">THE SIREN ARCADE</p>
  <h1 class="bp__h1">Games: play the AI apocalypse</h1>
  <p class="lede">Free games and simulations about AI, the takeover scenario and the odds. No sign-up, nothing to install, and every one runs in your browser. Games sits in the menu on every page, so you can always get back here.</p>
  <div class="gm-g">${cards}</div>
  <p>Want music while you play? Turn on <a href="${esc(ctx.href('/radio.html'))}">SIREN Radio</a>.</p>
</section>`;
  return page({ ctx, path: '/games.html',
    title: `AI games: play the AI apocalypse, free in your browser · ${brand.NAME}`,
    description: 'Free browser games about AI: stop a rogue AI breaching the firewall, watch Skynet wake up on a real data-centre map, game out the day after, bet with Tally and set your p(doom).',
    main });
}
