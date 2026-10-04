// The three plain pages a visitor, a crawler and an affiliate programme all
// expect to find: what this is, what it does with your data, and how the
// number compares with the ones people already know. Prose only; every claim
// here is one the rest of the site already makes or the code can show.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { mascot } from './_mascot.mjs';

const CSS = `<style>
.inf { max-width: 74ch; }
.inf__top { display: flex; align-items: center; gap: var(--s-4); margin: var(--s-4) 0 var(--s-3); }
.inf__top h1 { margin: 0; }
.inf h2 { margin: var(--s-6, 40px) 0 var(--s-2); font: 700 var(--t-md)/1.2 var(--stencil); letter-spacing: .12em; text-transform: uppercase; color: var(--ink); }
.inf p, .inf li { font: 400 var(--t-base)/1.65 var(--sans); color: var(--ink-dim); }
.inf b { color: var(--ink); }
.inf table { border-collapse: collapse; width: 100%; margin: var(--s-3) 0; font: 400 var(--t-sm)/1.45 var(--sans); }
.inf th, .inf td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--rule); color: var(--ink-dim); }
.inf th { font: 700 var(--t-xs)/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink); }
.inf__scroll { overflow-x: auto; position: relative; }
</style>`;

const level = (ctx) => (ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null);

export function about(ctx) {
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">About</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">What this is, and who is behind it</h1></div>
  <p class="lede">${esc(brand.DESCRIPTION)}</p>
  <h2>What it is</h2>
  <p>${esc(brand.NAME)} is a small, automated publication. A collector reads public sources every hour, a published formula turns
    them into a score, and a static site is rebuilt from the result. There is no editorial desk deciding the level.
    The <a href="${esc(ctx.href('/methodology.html'))}">methodology</a> has every formula and constant, and the
    <a href="${esc(brand.REPO_URL)}" rel="noopener">source code</a> is public.</p>
  <h2>Who runs it</h2>
  <p>One person, independently. It is not affiliated with any AI lab, government body or the organisations whose scales it
    borrows its grammar from. It is free to read, carries no advertising and has no investors.</p>
  <h2>How it is paid for</h2>
  <p>Hosting is free. The <a href="${esc(ctx.href('/bunker-kit.html'))}">Bunker Kit</a> has one crate of Amazon links that are paid
    links: as an Amazon Associate, ${esc(brand.NAME)} earns from qualifying purchases. They are labelled where they appear and
    nothing else on the site is paid. There is also a donate link to ${x}.</p>
  <h2>Contact</h2>
  <p>Corrections, data sources and press questions: message ${x} on X, or open an issue on the
    <a href="${esc(brand.REPO_URL)}" rel="noopener">repository</a>. A correction that changes a number is recorded in the open.</p>
  <h2>Terms, in plain words</h2>
  <ul>
    <li>The site is information, not advice. Do not use it as the basis for financial, legal, safety or policy decisions.</li>
    <li>It measures activity, not danger. ${esc(brand.DISCLAIMER_SHORT)}</li>
    <li>Third-party data is shown under its own licence, credited on the page that uses it. The site's own text and data are ${esc(brand.LICENSE)}.</li>
    <li>The joke pages (Tally's desk, the game, the Bunker Kit) are jokes. Their numbers are still real counts.</li>
  </ul>
  <p><a href="${esc(ctx.href('/privacy.html'))}">Privacy →</a> · <a href="${esc(ctx.href('/guide.html'))}">How it compares with DEFCON and the Doomsday Clock →</a></p>
</section>`;
  return page({
    ctx, path: '/about.html',
    title: `About ${brand.NAME}: what it is and who runs it`,
    description: `${brand.NAME} is an independent, automated index of AI activity run by one person. How it works, how it is paid for, and how to get in touch.`,
    main,
  });
}

export function privacy(ctx) {
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Privacy</p>
  <div class="inf__top"><h1 class="bp__h1">What this site knows about you</h1></div>
  <p class="lede">Very little, and nothing it keeps. This page lists every way a visit can leave a trace.</p>
  <h2>What the site itself does</h2>
  <ul>
    <li><b>No cookies.</b> The site sets none.</li>
    <li><b>No analytics.</b> There is no tracking script, pixel or visitor counter. Nobody here knows you visited.</li>
    <li><b>No accounts and no forms.</b> There is nothing to sign up for and nowhere to type personal details.</li>
    <li><b>Browser storage.</b> A few preferences are kept in your own browser's local storage: the last reading you saw, your
      language choice, and your best score in the game. They never leave your device, and clearing site data removes them.</li>
  </ul>
  <h2>Third parties a visit touches</h2>
  <ul>
    <li><b>GitHub Pages</b> hosts the site, so GitHub's servers receive your IP address and browser details, as any web host does.</li>
    <li><b>Google Fonts</b> serves the typefaces, so Google receives the same when a page loads.</li>
    <li><b>Links out.</b> Clicking a link to X, Amazon, a news source or a data source takes you to that site under its own
      policy. The "Post on X" links pass only the text of the card and this site's address.</li>
    <li><b>Amazon paid links.</b> The supplies crate in the Bunker Kit uses Amazon Associates links. If you follow one, Amazon
      may set its own cookies to attribute a purchase. As an Amazon Associate, ${esc(brand.NAME)} earns from qualifying purchases.</li>
  </ul>
  <h2>The embed and the badge</h2>
  <p>The iframe embed and the README badge are static files. They set no cookies and run no tracking on the pages that use them.</p>
  <h2>Questions</h2>
  <p>See the <a href="${esc(ctx.href('/about.html'))}">about page</a> for how to get in touch.</p>
</section>`;
  return page({
    ctx, path: '/privacy.html',
    title: `Privacy · ${brand.NAME}`,
    description: `${brand.NAME} sets no cookies and runs no analytics. What a visit touches: GitHub Pages, Google Fonts, and the sites you choose to click through to.`,
    main,
  });
}

export function guide(ctx) {
  const bands = [...brand.LEVELS].sort((a, b) => b.level - a.level);
  const st = ctx.state;
  const now = st && Number.isFinite(st.level)
    ? `Right now it reads <b>${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}</b>.` : '';
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Guide</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">DOOMCON, DEFCON, the Doomsday Clock and p(doom)</h1></div>
  <p class="lede">Four numbers people reach for when they want to know how worried to be. They measure different things, and
    only one of them is a count. ${now}</p>
  <h2>The short version</h2>
  <div class="inf__scroll"><table>
    <thead><tr><th>Number</th><th>What it measures</th><th>Who sets it</th><th>Can you recompute it?</th></tr></thead>
    <tbody>
      <tr><td><b>${esc(brand.NAME)}</b></td><td>How much is happening in AI: tempo, not danger</td><td>A published formula over public data, hourly</td><td>Yes, from the receipt</td></tr>
      <tr><td><b>DEFCON</b></td><td>The readiness posture of US armed forces, 5 (lowest) to 1 (highest)</td><td>US military command</td><td>No. The current level is not routinely made public</td></tr>
      <tr><td><b>Doomsday Clock</b></td><td>A symbolic judgement of how close humanity is to catastrophe</td><td>The Bulletin of the Atomic Scientists, usually once a year</td><td>No. It is a judgement, by design</td></tr>
      <tr><td><b>p(doom)</b></td><td>One person's stated probability that AI ends very badly</td><td>Whoever is asked</td><td>No. It is an opinion expressed as a number</td></tr>
    </tbody>
  </table></div>
  <h2>How to read the DOOMCON dial</h2>
  <p>The scale runs from 5 to 1 and <b>1 is the loudest</b>. The level is the band the 0–100 composite score falls in:</p>
  <div class="inf__scroll"><table>
    <thead><tr><th>Level</th><th>Name</th><th>Score band</th><th>In a few words</th></tr></thead>
    <tbody>
${bands.map((l) => `      <tr><td><b>${esc(l.level)}</b></td><td>${esc(l.name)}</td><td>${esc(l.band[0])}–${esc(l.band[1])}</td><td>${esc(l.epithet)}</td></tr>`).join('\n')}
    </tbody>
  </table></div>
  <p>The score is built from five pillars: ${brand.PILLARS.map((p) => `<b>${esc(p.name)}</b> (${esc(p.blurb.replace(/\.$/, '').toLowerCase())})`).join(', ')}.
    Each is scored against the index's own frozen record, so a reading says how today compares with what the index has seen before.</p>
  <h2>What a loud reading does and does not tell you</h2>
  <p>A loud reading tells you a lot shipped, a lot was spent, a lot was written or a lot was regulated, and the pillar
    breakdown says which. It does not tell you whether any of it was good or bad, and it is not a forecast of what happens next.
    That is why the home page is stamped "not a prediction".</p>
  <h2>Why borrow DEFCON's grammar at all</h2>
  <p>Because nobody needs the scale explained twice. "Five is calm, one is not" is already in most people's heads. The borrowing
    stops at the grammar: ${esc(brand.NAME)} is not a readiness level and is not issued by any government body.</p>
  <h2>Where to go next</h2>
  <p><a href="${esc(ctx.href('/'))}">The current reading →</a> · <a href="${esc(ctx.href('/methodology.html'))}">Every formula →</a> ·
    <a href="${esc(ctx.href('/history.html'))}">Sixty years of the same argument →</a> · <a href="${esc(ctx.href('/desk.html'))}">Tally's desk →</a></p>
</section>`;
  return page({
    ctx, path: '/guide.html',
    title: `DOOMCON vs DEFCON vs the Doomsday Clock vs p(doom): what each measures`,
    description: `A plain guide to four doom numbers. DEFCON is military readiness, the Doomsday Clock is a board's judgement, p(doom) is an opinion, and ${brand.NAME} is an hourly count of AI activity you can recompute.`,
    main,
  });
}
