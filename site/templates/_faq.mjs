// THE QUESTIONS A STRANGER ASKS, answered once and used twice: as a visible
// section on the home page and as FAQPage structured data, from the same
// array so the two cannot drift. Every answer is a statement the rest of the
// site already makes; the bands and pillar names are read from brand.mjs.

import { esc } from './_html.mjs';
import * as brand from '../brand.mjs';

export function items(ctx) {
  const bands = [...brand.LEVELS].sort((a, b) => b.level - a.level)
    .map((l) => `${l.level} ${l.name} (${l.band[0]}–${l.band[1]})`).join(', ');
  const pillars = brand.PILLARS.map((p) => p.name.toLowerCase()).join(', ');
  const st = (ctx && ctx.state) || {};
  const now = Number.isFinite(st.score) && st.level_name
    ? ` Right now ${brand.NAME} reads level ${st.level} (${st.level_name}), ${Number(st.score).toFixed(1)} of 100.`
    : '';
  return [
    // The two questions people actually type, first. Each answer is a claim the
    // rest of the site already makes, and the reading in the first is the live
    // one, so the visible text and the structured data say the same thing.
    ['Is AI dangerous right now?',
      `Nobody can measure that directly, and ${brand.NAME} does not try. What it measures is how much is happening in AI, every hour, from public data.${now} A loud reading means a lot is happening, not that things are going badly; for people's estimates of the risk itself, see the p(doom) explainer, and for harm and benefit counted side by side, the Balance page.`],
    ['Is there an AI doomsday clock?',
      `The Bulletin of the Atomic Scientists' Doomsday Clock now takes AI into account, and IMD publishes an AI Safety Clock; both are set by expert judgement. ${brand.NAME} is the counted alternative: an hourly reading of AI activity, published with the receipt anyone needs to recompute it.`],
    ['What is SIREN, and what does the name stand for?',
      `${brand.NAME} is an hourly index of how much is happening in AI. SI is superintelligence and REN is Real-time Early Notice: a siren for the road to superintelligence. It counts public activity across five pillars (${pillars}), turns it into one score from 0 to 100, and reports a level from 5 (quietest) to 1 (loudest). It was called ${brand.FORMERLY} until October 2026; the method and the record are unchanged.`],
    ['Does SIREN say superintelligence is here, or coming?',
      `No. It does not detect superintelligence and it does not forecast it. It measures how loud AI activity is right now: releases, compute, headlines, rule-making and market prices. A loud reading means a lot is happening, and nothing more.`],
    ['Is SIREN like DEFCON or the Doomsday Clock?',
      `It borrows DEFCON's grammar, a scale that counts down from 5 to 1. The difference is what sits behind the number. DEFCON is set by military command and the Doomsday Clock by a board's judgement; ${brand.NAME} is arithmetic over public data, and every reading is published with the inputs needed to recompute it.`],
    ['Does a louder level mean AI is more dangerous?',
      `No. The level measures tempo: releases, compute, headlines, rule-making and market prices. A loud week means a lot happened. It says nothing about whether what happened was good or bad, and the site never sums harm and benefit into one figure.`],
    ['How is the level calculated, and how often?',
      `A collector runs every hour, scores each pillar against the index's own frozen record, and combines them into the composite. The level is the band the score falls in: ${bands}. The formulas and constants are on the methodology page.`],
    ['Can I check the number myself?',
      `Yes. Each reading ships with a receipt holding its inputs, its score and the hash of the receipt before it, and the state, history and receipts are open JSON. If a source did not report, the page says so and no value is filled in for it.`],
    ['Who runs SIREN, and how is it paid for?',
      `One person runs it. It is free, carries no advertising, sets no cookies and runs no analytics. The paid links are the Amazon links on the reading list and in the Bunker Kit's supplies crate, which are labelled; there is room for one named sponsor with no say over the number, and a donate link to the project's X account.`],
    ['How can I cite, embed or share it?',
      `The site's text and data are licensed ${brand.LICENSE}. There is an iframe embed and a README badge on the home page, a public JSON API, two RSS feeds, and a "Post on X" link on every card.`],
    ['Who is Tally?',
      `Tally is the duty canary, the mascot. The helmet is painted in the current level's colour and the face follows the level: asleep at 5, in full squawk at 1. Tally also keeps the unserious counts and runs the counting game.`],
  ];
}

export function render(ctx) {
  const qa = items(ctx);
  return `<section class="sec faq" id="faq" aria-labelledby="faq-h">
  <h2 class="sec__h" id="faq-h">Questions people ask</h2>
  <div class="faq__l">
${qa.map(([q, a]) => `    <details class="faq__i"><summary class="faq__q">${esc(q)}</summary><p class="faq__a">${esc(a)}</p></details>`).join('\n')}
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/guide.html'))}">The longer version: SIREN, DEFCON, the Doomsday Clock and p(doom) →</a></p>
</section>`;
}

export function faqCss() {
  return `
.faq__l { display: grid; gap: 8px; max-width: 78ch; }
.faq__i { border: 1px solid var(--rule); border-radius: 8px; background: var(--bg-sunken); }
.faq__q { cursor: pointer; padding: 12px 14px; font: 600 var(--t-base)/1.35 var(--sans); color: var(--ink); }
.faq__i[open] > .faq__q { border-bottom: 1px solid var(--rule); }
.faq__a { margin: 0; padding: 12px 14px; font: 400 var(--t-base)/1.6 var(--sans); color: var(--ink-dim); }
`;
}

export function jsonLd(ctx) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items(ctx).map(([q, a]) => ({
      '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
