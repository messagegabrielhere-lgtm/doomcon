// HOW THE SITE EARNS. Two pages: a reading list whose links are Amazon
// Associates links, and a sponsor page that says what a sponsor gets and,
// more to the point, what a sponsor does not get. Both are labelled as what
// they are. Neither touches the index: no template here reads a score to
// decide what to sell, and nothing a reader buys changes a number.
//
// The reading list deliberately covers the people who disagree with each
// other. The blurbs say what each book argues, not whether it is right.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';
import { MONETIZE } from '../monetize.mjs';
import { mascot } from './_mascot.mjs';

export const amazon = (asin) => (/^https:\/\//.test(asin) ? asin : `https://www.amazon.com/dp/${asin}?tag=${brand.AMAZON_TAG}`);
export const amazonSearch = (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q).replace(/%20/g, '+')}&tag=${brand.AMAZON_TAG}`;

// Tip #318: shelf H2s are question-shaped (mirrored in library FAQ §3.3).
const SHELVES = [
  ['What is the case for worry?', 'Books arguing that advanced AI could go badly wrong, and what would have to be true to prevent it.', [
    ['B00LPMFE9Y', 'Superintelligence', 'Nick Bostrom, 2014', 'The book that put the control problem on the map: what happens if a machine becomes much smarter than its makers.'],
    ['0525558632', 'Human Compatible', 'Stuart Russell, 2019', 'A leading AI researcher argues the standard way of building AI is flawed and proposes machines that stay uncertain about what we want.'],
    ['0393868338', 'The Alignment Problem', 'Brian Christian, 2020', 'A reported history of how systems end up doing what we said and not what we meant.'],
    ['0316595640', 'If Anyone Builds It, Everyone Dies', 'Eliezer Yudkowsky and Nate Soares, 2025', 'The starkest version of the argument, stated in the title.'],
  ]],
  ['What is the case for doubt?', 'Books arguing that much of what is claimed for AI, by boosters and doomers alike, does not survive inspection.', [
    ['B0D8C1KNB6', 'AI Snake Oil', 'Arvind Narayanan and Sayash Kapoor, 2024', 'Two computer scientists on what AI can do, what it cannot, and how to tell the difference.'],
    ['B0DR3873M9', 'Empire of AI', 'Karen Hao, 2025', 'A reporter’s account of OpenAI and of what the industry costs the people and places it draws on.'],
  ]],
  ['What is the view from the builders?', 'Books by people making or deploying the technology, about what it is for and how to live with it.', [
    ['B0BVSW143K', 'The Coming Wave', 'Mustafa Suleyman, 2023', 'A DeepMind co-founder on why the technology is hard to contain and why he thinks it must be.'],
    ['059371671X', 'Co-Intelligence', 'Ethan Mollick, 2024', 'A practical book on working alongside current AI systems.'],
    ['B08Y6FYJVY', 'The Singularity Is Nearer', 'Ray Kurzweil, 2024', 'The long-standing optimist’s case, updated.'],
    ['0316581291', 'Genesis', 'Henry Kissinger, Eric Schmidt and Craig Mundie, 2024', 'A statesman and two technologists on what AI does to politics, knowledge and security.'],
  ]],
  ['Which books put AI to work?', 'Practical guides for using today’s assistants on the job.', [
    ['https://amzn.to/4y8hCwF', 'The Microsoft Copilot Bible for Beginners & Busy Professionals', 'Pierce J. Sheldon', 'A 5-in-1 guide to Copilot across Word, Excel, Outlook and Teams: prompts, automations and hours saved each week.'],
    [amazonSearch('ChatGPT guide for beginners book'), 'ChatGPT guides for beginners', 'Search results on Amazon', 'Pick a current edition: the tools change every few months, so the newest printing matters most.'],
    [amazonSearch('prompt engineering book'), 'Prompt engineering books', 'Search results on Amazon', 'From quick cheat-sheets to the textbook end of the shelf.'],
  ]],
  ['What is the long view?', 'Books that put AI inside a bigger story.', [
    ['1101970316', 'Life 3.0', 'Max Tegmark, 2017', 'A physicist walks through the futures that advanced AI could lead to, good and bad.'],
    ['B0CT3Y5LL9', 'Nexus', 'Yuval Noah Harari, 2024', 'A history of information networks, ending with AI.'],
  ]],
];

const GEAR = [
  ['NVIDIA Jetson Orin Nano Super developer kit', 'NVIDIA Jetson Orin Nano', 'A palm-sized AI computer for running vision and small language models at home.'],
  ['Raspberry Pi 5 AI HAT', 'Raspberry Pi 5 + AI HAT', 'The cheapest way to put a neural accelerator on your desk.'],
  ['Google Coral USB accelerator', 'Coral USB Accelerator', 'Plug-in Edge TPU for fast on-device inference.'],
  ['Mac mini M4', 'Mac mini (Apple silicon)', 'A popular quiet box for running open models with Ollama or LM Studio.'],
  ['Faraday bag phone', 'Faraday bag', 'For when you want your phone off the grid for a bit.'],
];

export const BOOK_COUNT = SHELVES.reduce((n, s) => n + s[2].length, 0);

const CSS = `<style>
.shp { max-width: 82ch; }
.shp__top { display: flex; align-items: center; gap: var(--s-4); margin: var(--s-4) 0 var(--s-3); }
.shp__top h1 { margin: 0; }
.shp__paid { display: inline-block; padding: 4px 8px; border: 2px solid var(--dark-src); border-radius: 4px; color: var(--dark-src);
  font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; }
.shp h2 { margin: var(--s-6, 40px) 0 4px; font: 400 clamp(22px, 2.6vw, 30px)/1.1 var(--poster); letter-spacing: .02em; text-transform: uppercase; color: var(--ink); }
.shp p, .shp li { font: 400 var(--t-base)/1.6 var(--sans); color: var(--ink-dim); }
.shp b { color: var(--ink); }
.shp__l { list-style: none; margin: var(--s-3) 0; padding: 0; display: grid; gap: 10px; }
.shp__b { padding: 12px 14px; border: 1px solid var(--rule); border-left: 6px solid var(--accent); border-radius: 8px; background: var(--bg-sunken); }
.shp__b a { font: 650 var(--t-md)/1.25 var(--sans); color: var(--ink); }
.shp__by { display: block; margin: 2px 0 4px; font: 500 var(--t-xs)/1.3 var(--mono); letter-spacing: .04em; color: var(--ink-faint); }
.shp__go { display: inline-block; margin-top: var(--s-2); padding: 10px 16px; border: 2px solid var(--accent); border-radius: 4px; color: var(--ink); text-decoration: none;
  font: 700 var(--t-sm)/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; }
.shp__go:hover, .shp__go:focus-visible { background: var(--accent); color: #0b0c0e; }
.shp-faq{margin:34px 0 12px;max-width:62ch}
.shp-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.shp-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.shp-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.shp-faq-key{margin-top:var(--s-4,1rem)!important}
</style>`;

const level = (ctx) => (ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null);

export function library(ctx) {
  const PATH = '/library.html';
  const qTitle = 'What AI books argue both sides of the case?';
  // Tip #318: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const gearQ = 'What gear runs AI at home?';
  const moreQ = 'What are more ways to keep this running?';
  // FAQ answers restate lede / paid-links / eyebrow copy only (FINDABILITY §3.3).
  // Refuse: endorsement-as-SIREN-claim, library-as-index-input, doom-probability, stuffing.
  const faq = [
    [qTitle,
      `${brand.NAME} counts and does not take a side. These ${BOOK_COUNT} books do take sides, and they disagree with each other, which is the point of reading more than one.`],
    ...SHELVES.map(([name, why]) => [name, why]),
    [gearQ,
      'Hardware people use to run models locally, off the cloud. Links go to Amazon search results, so you can compare current prices.'],
    [moreQ,
      `The bunker kit (paid links too), sponsoring ${brand.NAME} without moving the number, or a donate link.`],
    ['Are these paid links?',
      `Every title and gadget links to Amazon. As an Amazon Associate, ${brand.NAME} earns from qualifying purchases, at no cost to you. Listing is not endorsement, and your library has most of these.`],
    [`Does buying a book move the ${brand.NAME} score?`,
      'No. The reading list is paid links and does not feed the main number. Nothing a reader buys changes a score.'],
    [`Is the reading list a doom probability?`,
      `No. ${brand.NAME} measures activity tempo. The shelves include worry, doubt, builders and the long view side by side — not a probability of harm.`],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `${CSS}
<section class="shp">
  <p class="eyebrow">The reading list · paid links · does not feed the main number</p>
  <div class="shp__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">${esc(brand.NAME)} counts and does not take a side. These ${BOOK_COUNT} books do take sides, and they disagree with each other, which is the point of reading more than one.</p>
  <p><span class="shp__paid">Paid links</span> Every title and gadget links to Amazon. As an Amazon Associate, ${esc(brand.NAME)} earns from qualifying purchases, at no cost to you. Listing is not endorsement, and your library has most of these.</p>
${SHELVES.map(([name, why, books]) => `  <h2>${esc(name)}</h2>
  <p>${esc(why)}</p>
  <ul class="shp__l">
${books.map(([asin, title, by, blurb]) => `    <li class="shp__b"><a href="${esc(amazon(asin))}" rel="sponsored noopener" target="_blank">${esc(title)}</a><span class="shp__by">${esc(by)}</span>${esc(blurb)}</li>`).join('\n')}
  </ul>`).join('\n')}
  <h2>${esc(gearQ)}</h2>
  <p>Hardware people use to run models locally, off the cloud. Links go to Amazon search results, so you can compare current prices.</p>
  <ul class="shp__l">
${GEAR.map(([q, title, blurb]) => `    <li class="shp__b"><a href="${esc(amazonSearch(q))}" rel="sponsored noopener" target="_blank">${esc(title)}</a><span class="shp__by">Paid link · Amazon search</span>${esc(blurb)}</li>`).join('\n')}
  </ul>
  <h2>${esc(moreQ)}</h2>
  <p><a href="${esc(ctx.href('/bunker-kit.html'))}">What free tools belong in a bunker kit?</a> (paid links too) · <a href="${esc(ctx.href('/sponsor.html'))}">How do you sponsor ${esc(brand.NAME)} without moving the number?</a> · <a href="${esc(MONETIZE.tips.url || ctx.href('/sponsor.html'))}" rel="noopener">Donate</a></p>
  <section class="shp-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="shp-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/bunker-kit.html'))}">What free tools belong in a bunker kit?</a>
      · <a href="${esc(ctx.href('/sponsor.html'))}">How do you sponsor ${esc(brand.NAME)} without moving the number?</a>.</p>
  </section>
</section>`;
  const description = `${qTitle} ${BOOK_COUNT} books on AI risk, scepticism and optimism side by side: Bostrom, Russell, Narayanan and Kapoor, Hao, Suleyman, Mollick, Kurzweil and more. Paid Amazon links.`;
  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        description: `${BOOK_COUNT} AI books from every side of the argument. Paid Amazon links. Does not feed the ${brand.NAME} score.`,
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

export function sponsor(ctx) {
  const PATH = '/sponsor.html';
  const qTitle = `How do you sponsor ${brand.NAME} without moving the number?`;
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  const n = Array.isArray(ctx.history) ? ctx.history.length : null;
  // Tip #317: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const getsQ = 'What does a sponsor get?';
  const notQ = 'What does a sponsor not get?';
  const suitsQ = 'Who does sponsorship suit?';
  const startQ = 'How do you start sponsoring?';
  // FAQ answers restate lede / gets / does-not-get copy only (FINDABILITY §3.3).
  // Refuse: sponsor-moves-score, visitor-data-sale, doom-probability, stuffing.
  const faq = [
    [qTitle,
      `${brand.NAME} has no advertising network and no investors. It has room for one named sponsor at a time, shown plainly, with no say over the number.`],
    [getsQ,
      'One labelled “Supported by [name]” line in the masthead and footer, the same line on the hourly share card, a credit in the daily X reading, and an audience that wants a number they can check.'],
    [notQ,
      'No influence on the number (published formula, receipts anyone can verify), no visitor data, no editorial say, and no disguise — the sponsorship is labelled wherever it appears.'],
    [suitsQ,
      'Prediction markets, research tools, data providers, newsletters, and anyone who wants to be seen next to a number that shows its work. Not suitable: anything that needs the index to say a particular thing.'],
    [startQ,
      'Message on X with who you are and what you would like to run. One sponsor at a time, month by month.'],
    [`Does sponsorship turn ${brand.NAME} into a doom forecast?`,
      `No. ${brand.NAME} measures activity tempo. A sponsor cannot move the level, and sponsorship does not make the index a probability of harm.`],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `${CSS}
<section class="shp">
  <p class="eyebrow">Sponsorship</p>
  <div class="shp__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">${esc(brand.NAME)} has no advertising network and no investors. It has room for one named sponsor at a time, shown plainly, with no say over the number.</p>
  <h2>${esc(getsQ)}</h2>
  <ul>
    <li><b>One line, everywhere.</b> “Supported by [name]” with a link, in the masthead and footer of every page.</li>
    <li><b>The share cards.</b> The same line on the reading card that is redrawn every hour and posted daily.</li>
    <li><b>The daily post.</b> A credit in the daily reading on X.</li>
    <li><b>An audience that reads the footnotes.</b> People who follow AI closely enough to want a number they can check${n ? `; ${esc(n.toLocaleString('en-US'))} readings published so far` : ''}.</li>
  </ul>
  <h2>${esc(notQ)}</h2>
  <ul>
    <li><b>No influence on the number.</b> The level comes from a published formula over public data, and every reading has a receipt anyone can verify. A sponsor cannot move it and neither can the operator.</li>
    <li><b>No visitor data.</b> Analytics stay with the operator. Sponsors do not receive visitor lists, pixels or reports from this site.</li>
    <li><b>No editorial say.</b> Not over the jobs and medicine pages, the registers, or what the X account posts.</li>
    <li><b>No disguise.</b> The sponsorship is labelled as one wherever it appears.</li>
  </ul>
  <h2>${esc(suitsQ)}</h2>
  <p>Prediction markets, research tools, data providers, newsletters, and anyone who wants to be seen next to a number that shows its work. Not suitable: anything that needs the index to say a particular thing.</p>
  <h2>${esc(startQ)}</h2>
  <p>Message ${x} on X with who you are and what you would like to run. One sponsor at a time, month by month.</p>
  <p><a class="shp__go" href="${esc(brand.X_URL || ctx.href('/about.html'))}" rel="noopener">Ask about sponsoring</a></p>
  <section class="shp-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="shp-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/library.html'))}">What AI books argue both sides of the case?</a>
      · <a href="${esc(ctx.href('/about.html'))}">What is ${esc(brand.NAME)}?</a>.</p>
  </section>
</section>`;
  const description = `${qTitle} One labelled sponsor at a time. What a sponsor gets, and what it does not: no influence on the index, no visitor data, no editorial say.`;
  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description: `${brand.NAME} takes one labelled sponsor at a time. No influence on the index, no visitor data, no editorial say.`,
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
