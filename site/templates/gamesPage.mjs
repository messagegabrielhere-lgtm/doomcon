// /games.html — THE ARCADE. Every playable thing on SIREN in one place, so
// games are one click from any page (the icon rail's joystick lands here).
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const PATH = '/games.html';
const qTitle = 'What free AI games can you play on SIREN?';

export const GAMES = [
  ['/contain.html', 'px:core', 'Can you stop an AI breakout?', 'Arcade', 'Free browser game: stop the breakout before it escapes.', '#F87171'],
  ['/game.html', 'px:joystick', 'How do you play Tally Counts?', '30 seconds', 'Count the real signals, ignore the predictions. Beat your best score.', '#4ADE80'],
  ['/day-after.html', 'px:megaphone', 'What happens the day after an AI catastrophe?', 'Strategy', 'A short strategy sim about the first day after the break.', '#FB923C'],
  ['/self-aware.html', 'px:redeye', 'What if an AI wakes up at 2:14 a.m.?', 'Simulation', 'A night-shift simulation, not a forecast.', '#EF4444'],
  ['/arena.html#battle', 'stocks', 'What does SIREN Arena show?', 'Live', 'AI models trade stocks and crypto against live prices. Pick a winner.', '#60A5FA'],
  ['/bets.html', 'dice', 'Does the SIREN index make forecasts?', 'Daily', 'Tally’s unserious daily bets — not the SIREN score.', '#FACC15'],
  ['/p-doom.html#voices', 'px:pclock', 'What is p(doom)?', 'Dial', 'Twenty-eight named estimates, Hinton to Yudkowsky. Spin the dial and post yours.', '#A78BFA'],
  ['/si-ready.html', 'px:backpack', 'Ready for superintelligence?', 'Quiz', 'A three-minute personal plan — not a SI date or doom forecast.', '#22D3EE'],
  ['/ai-proof-job.html', 'px:rocket', 'How do I AI-proof my job?', 'Quiz', 'Two minutes to find out how exposed your job is, and what to do about it.', '#34D399'],
];

const CSS = `<style>
.gm{max-width:1100px}.gm .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#4ADE80;margin:0 0 10px}
.gm-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin:18px 0}
.gm-c{display:flex;flex-direction:column;gap:8px;padding:16px;border:2px solid var(--rule);border-top:5px solid var(--c);border-radius:8px;background:var(--bg-raised,#0E131D);color:inherit!important;text-decoration:none!important;transition:transform .12s,border-color .12s}
.gm-c:hover,.gm-c:focus-visible{transform:translateY(-3px);border-color:var(--c)}
.gm-c img{width:56px;height:56px;image-rendering:pixelated}
.gm-c b{font:800 18px/1.2 var(--sans);color:#fff}.gm-c i{font:700 11px var(--mono);letter-spacing:.12em;color:var(--c);font-style:normal;text-transform:uppercase}
.gm-c small{font-size:13.5px;line-height:1.45;color:var(--ink-dim)}.gm-c span.go{margin-top:auto;font:700 12px var(--mono);color:var(--c)}
.gm-faq{margin:34px 0 12px;max-width:62ch}
.gm-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.gm-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.gm-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.gm-faq-key{margin-top:var(--s-4,1rem)!important}
</style>`;

export function render(ctx) {
  // FAQ answers restate lede / body copy only.
  // Refuse: games-as-doom-forecast, real-takeover-method, doom-probability.
  const faq = [
    [qTitle,
      'Free games and simulations about AI, the takeover scenario and the odds. No sign-up, nothing to install, and every one runs in your browser. Games sits in the menu on every page, so you can always get back here.'],
    ['Do I need an account or install?',
      'No sign-up, nothing to install, and every one runs in your browser.'],
    ['Where is Containment?',
      'Containment: Can you stop an AI breakout? It is listed on this arcade page with the other free SIREN games.'],
    ['Is there music while you play?',
      'Want music while you play? Turn on What free music does SIREN Radio play?'],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const img = (n) => esc(ctx.href(String(n).startsWith('px:') ? `/img/px-${String(n).slice(3)}.svg` : `/img/art-${n}.webp`));
  const cards = GAMES.map(([h, ic, t, kind, blurb, c]) => `<a class="gm-c" href="${esc(ctx.href(h))}" style="--c:${c}"><img src="${img(ic)}" width="56" height="56" alt=""><i>${esc(kind)}</i><b>${esc(t)}</b><small>${esc(blurb)}</small><span class="go">▶ PLAY</span></a>`).join('');
  const main = `${CSS}<section class="gm">
  <p class="eyebrow">THE SIREN ARCADE</p>
  <h1 class="bp__h1">${esc(qTitle)}</h1>
  <p class="lede">Free games and simulations about AI, the takeover scenario and the odds. No sign-up, nothing to install, and every one runs in your browser. Games sits in the menu on every page, so you can always get back here.</p>
  <div class="gm-g">${cards}</div>
  <p>Want music while you play? Turn on <a href="${esc(ctx.href('/radio.html'))}">What free music does SIREN Radio play?</a></p>
  <section class="gm-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="gm-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/contain.html'))}">Can you stop an AI breakout?</a>
      · <a href="${esc(ctx.href('/day-after.html'))}">What happens the day after an AI catastrophe?</a>
      · <a href="${esc(ctx.href('/radio.html'))}">What free music does SIREN Radio play?</a>
      · <a href="${esc(ctx.href('/videos.html'))}">What free AI explainer videos does SIREN publish?</a>.</p>
  </section>
</section>`;
  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description: `${qTitle} Free browser games about AI: Containment, The Day After, the Skynet scenario map, Tally’s bets and more. No sign-up.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        description: 'Free browser games and simulations about AI on SIREN: Containment, The Day After, Skynet scenario map, Tally’s bets and more. No sign-up.',
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}
