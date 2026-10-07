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
import * as brand from '../brand.mjs';
import { mascot } from './_mascot.mjs';

export const amazon = (asin) => `https://www.amazon.com/dp/${asin}?tag=${brand.AMAZON_TAG}`;

const SHELVES = [
  ['The case for worry', 'Books arguing that advanced AI could go badly wrong, and what would have to be true to prevent it.', [
    ['B00LPMFE9Y', 'Superintelligence', 'Nick Bostrom, 2014', 'The book that put the control problem on the map: what happens if a machine becomes much smarter than its makers.'],
    ['0525558632', 'Human Compatible', 'Stuart Russell, 2019', 'A leading AI researcher argues the standard way of building AI is flawed and proposes machines that stay uncertain about what we want.'],
    ['0393868338', 'The Alignment Problem', 'Brian Christian, 2020', 'A reported history of how systems end up doing what we said and not what we meant.'],
    ['0316595640', 'If Anyone Builds It, Everyone Dies', 'Eliezer Yudkowsky and Nate Soares, 2025', 'The starkest version of the argument, stated in the title.'],
  ]],
  ['The case for doubt', 'Books arguing that much of what is claimed for AI, by boosters and doomers alike, does not survive inspection.', [
    ['B0D8C1KNB6', 'AI Snake Oil', 'Arvind Narayanan and Sayash Kapoor, 2024', 'Two computer scientists on what AI can do, what it cannot, and how to tell the difference.'],
    ['B0DR3873M9', 'Empire of AI', 'Karen Hao, 2025', 'A reporter’s account of OpenAI and of what the industry costs the people and places it draws on.'],
  ]],
  ['The view from the builders', 'Books by people making or deploying the technology, about what it is for and how to live with it.', [
    ['B0BVSW143K', 'The Coming Wave', 'Mustafa Suleyman, 2023', 'A DeepMind co-founder on why the technology is hard to contain and why he thinks it must be.'],
    ['059371671X', 'Co-Intelligence', 'Ethan Mollick, 2024', 'A practical book on working alongside current AI systems.'],
    ['B08Y6FYJVY', 'The Singularity Is Nearer', 'Ray Kurzweil, 2024', 'The long-standing optimist’s case, updated.'],
    ['0316581291', 'Genesis', 'Henry Kissinger, Eric Schmidt and Craig Mundie, 2024', 'A statesman and two technologists on what AI does to politics, knowledge and security.'],
  ]],
  ['The long view', 'Books that put AI inside a bigger story.', [
    ['1101970316', 'Life 3.0', 'Max Tegmark, 2017', 'A physicist walks through the futures that advanced AI could lead to, good and bad.'],
    ['B0CT3Y5LL9', 'Nexus', 'Yuval Noah Harari, 2024', 'A history of information networks, ending with AI.'],
  ]],
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
.shp__b { padding: 12px 14px; border: 1px solid var(--rule); border-left: 6px solid var(--accent-2); border-radius: 8px; background: var(--bg-sunken); }
.shp__b a { font: 650 var(--t-md)/1.25 var(--sans); color: var(--ink); }
.shp__by { display: block; margin: 2px 0 4px; font: 500 var(--t-xs)/1.3 var(--mono); letter-spacing: .04em; color: var(--ink-faint); }
.shp__go { display: inline-block; margin-top: var(--s-2); padding: 10px 16px; border: 2px solid var(--accent-2); border-radius: 4px; color: var(--ink); text-decoration: none;
  font: 700 var(--t-sm)/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; }
.shp__go:hover, .shp__go:focus-visible { background: var(--accent-2); color: var(--accent-ink); }
</style>`;

const level = (ctx) => (ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null);

export function library(ctx) {
  const main = `${CSS}
<section class="shp">
  <p class="eyebrow">The reading list · paid links · does not feed the main number</p>
  <div class="shp__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">Read the argument, both sides of it</h1></div>
  <p class="lede">${esc(brand.NAME)} counts and does not take a side. These ${BOOK_COUNT} books do take sides, and they disagree with each other, which is the point of reading more than one.</p>
  <p><span class="shp__paid">Paid links</span> Every title links to Amazon. As an Amazon Associate, ${esc(brand.NAME)} earns from qualifying purchases, at no cost to you. Listing is not endorsement, and your library has most of these.</p>
${SHELVES.map(([name, why, books]) => `  <h2>${esc(name)}</h2>
  <p>${esc(why)}</p>
  <ul class="shp__l">
${books.map(([asin, title, by, blurb]) => `    <li class="shp__b"><a href="${esc(amazon(asin))}" rel="sponsored noopener" target="_blank">${esc(title)}</a><span class="shp__by">${esc(by)}</span>${esc(blurb)}</li>`).join('\n')}
  </ul>`).join('\n')}
  <h2>More ways to keep this running</h2>
  <p><a href="${esc(ctx.href('/bunker-kit.html'))}">The Bunker Kit’s supply crate</a> (paid links too) · <a href="${esc(ctx.href('/sponsor.html'))}">Sponsor the index</a> · <a href="${esc(ctx.href('/#support'))}">Donate</a></p>
</section>`;
  return page({
    ctx, path: '/library.html',
    title: `The AI reading list: ${BOOK_COUNT} books from every side of the argument · ${brand.NAME}`,
    description: `Books on AI risk, AI scepticism and AI optimism, side by side: Bostrom, Russell, Narayanan and Kapoor, Hao, Suleyman, Mollick, Kurzweil and more. Paid Amazon links.`,
    main,
  });
}

export function sponsor(ctx) {
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  const n = Array.isArray(ctx.history) ? ctx.history.length : null;
  const main = `${CSS}
<section class="shp">
  <p class="eyebrow">Sponsorship</p>
  <div class="shp__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">Sponsor the index</h1></div>
  <p class="lede">${esc(brand.NAME)} has no advertising network, no tracking and no investors. It has room for one named sponsor at a time, shown plainly, with no say over the number.</p>
  <h2>What a sponsor gets</h2>
  <ul>
    <li><b>One line, everywhere.</b> “Supported by [name]” with a link, in the masthead and footer of every page.</li>
    <li><b>The share cards.</b> The same line on the reading card that is redrawn every hour and posted daily.</li>
    <li><b>The daily post.</b> A credit in the daily reading on X.</li>
    <li><b>An audience that reads the footnotes.</b> People who follow AI closely enough to want a number they can check${n ? `; ${esc(n.toLocaleString('en-US'))} readings published so far` : ''}.</li>
  </ul>
  <h2>What a sponsor does not get</h2>
  <ul>
    <li><b>No influence on the number.</b> The level comes from a published formula over public data, and every reading has a receipt anyone can verify. A sponsor cannot move it and neither can the operator.</li>
    <li><b>No tracking.</b> No pixels, no scripts, no visitor data. The site collects none to share.</li>
    <li><b>No editorial say.</b> Not over the jobs and medicine pages, the registers, or what the X account posts.</li>
    <li><b>No disguise.</b> The sponsorship is labelled as one wherever it appears.</li>
  </ul>
  <h2>Who it suits</h2>
  <p>Prediction markets, research tools, data providers, newsletters, and anyone who wants to be seen next to a number that shows its work. Not suitable: anything that needs the index to say a particular thing.</p>
  <h2>How to start</h2>
  <p>Message ${x} on X with who you are and what you would like to run. One sponsor at a time, month by month.</p>
  <p><a class="shp__go" href="${esc(brand.X_URL || ctx.href('/about.html'))}" rel="noopener">Ask about sponsoring</a></p>
</section>`;
  return page({
    ctx, path: '/sponsor.html',
    title: `Sponsor ${brand.NAME}: one named sponsor, no say over the number`,
    description: `${brand.NAME} takes one labelled sponsor at a time. What a sponsor gets, and what it does not: no influence on the index, no tracking, no editorial say.`,
    main,
  });
}
