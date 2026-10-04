// The three plain pages a visitor, a crawler and an affiliate programme all
// expect to find: what this is, what it does with your data, and how the
// number compares with the ones people already know. Prose only; every claim
// here is one the rest of the site already makes or the code can show.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { mascot, MOODS } from './_mascot.mjs';

const CSS = `<style>
.inf { max-width: 74ch; }
.inf__top { display: flex; align-items: center; gap: var(--s-4); margin: var(--s-4) 0 var(--s-3); }
.inf__top h1 { margin: 0; }
.inf h2 { margin: var(--s-6, 40px) 0 var(--s-2); font: 400 clamp(20px, 2.4vw, 26px)/1.15 var(--poster); letter-spacing: .02em; text-transform: uppercase; color: var(--ink); }
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
  <p>Hosting is free. The <a href="${esc(ctx.href('/bunker-kit.html'))}">Bunker Kit</a> and the
    <a href="${esc(ctx.href('/library.html'))}">reading list</a> carry Amazon links that are paid links: as an Amazon Associate,
    ${esc(brand.NAME)} earns from qualifying purchases. They are labelled where they appear. There is room for
    <a href="${esc(ctx.href('/sponsor.html'))}">one named sponsor</a>, who gets no say over the number, and a donate link to ${x}.</p>
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
    <li><b>Amazon paid links.</b> The reading list and the supplies crate in the Bunker Kit use Amazon Associates links. If you follow one, Amazon
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

export function brandPage(ctx) {
  const levels = [...brand.LEVELS].sort((a, b) => b.level - a.level);
  const sw = (name, v, note) => `<li class="br__sw"><i style="background:${v}"></i><b>${esc(name)}</b><code>${esc(v)}</code><span>${esc(note)}</span></li>`;
  const main = `${CSS}
<style>
.br__row { display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); list-style: none; margin: var(--s-3) 0; padding: 0; }
.br__t { display: grid; justify-items: center; gap: 6px; padding: var(--s-3); border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-sunken); text-align: center; }
.br__t .tally { width: 100%; max-width: 120px; height: auto; }
.br__t b { font: 400 18px/1.1 var(--poster); letter-spacing: .03em; color: var(--lvl); }
.br__t a { font: 600 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
.br__sw { display: grid; gap: 4px; padding: 0; }
.br__sw i { display: block; height: 56px; border-radius: 8px; border: 1px solid var(--rule); }
.br__sw code { font: 500 var(--t-xs)/1 var(--mono); color: var(--ink-dim); }
.br__sw span { font: 400 var(--t-xs)/1.35 var(--sans); color: var(--ink-faint); }
.br__type { display: grid; gap: var(--s-3); margin: var(--s-3) 0; }
.br__type p { margin: 0; color: var(--ink); }
.br__do { display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
</style>
<section class="inf">
  <p class="eyebrow">Brand</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">How ${esc(brand.NAME)} looks and sounds</h1></div>
  <p class="lede">One page for anyone making something with the brand: a slide, a post, a story, a sticker. Everything here may be used with credit; ${esc(brand.LICENSE)}.</p>

  <h2>The idea</h2>
  <p><b>${esc(brand.SLOGAN)}</b> A public-information bulletin from the 1950s, about a twenty-first-century subject, that shows its arithmetic.
    The costume is civil defence: hazard tape, a rubber stamp, a duty mascot. The content is a count.</p>

  <h2>The name</h2>
  <p>Always <b>${esc(brand.NAME)}</b>, in capitals, followed by the level: “${esc(brand.NAME)} 4”. The publication line is “${esc(brand.PUBLICATION)}”.
    The tagline is “${esc(brand.TAGLINE)}”</p>

  <h2>Tally, the duty canary</h2>
  <p>The mascot. The helmet takes the level's colour and the face takes the level's mood. Use the drawing for the level you are talking about; do not recolour the body.</p>
  <ol class="br__row">
${levels.map((l) => `    <li class="br__t" style="--lvl:var(--heat-${l.level})">${mascot({ size: 120, level: l.level })}<b>${esc(l.level)} · ${esc(l.name)}</b><span>${esc(MOODS[l.level])}</span><a href="${esc(ctx.href(`/brand/tally-${l.level}.svg`))}" download>Download SVG</a></li>`).join('\n')}
  </ol>

  <h2>Colour</h2>
  <p>The five level colours carry meaning and are never used as decoration for something else. Amber is the brand accent.</p>
  <ul class="br__row">
    ${sw('Level 5', '#56b0e0', 'quietest')}${sw('Level 4', '#5fd08a', '')}${sw('Level 3 · accent', '#ffb020', 'also the brand amber')}${sw('Level 2', '#ff8b3d', '')}${sw('Level 1', '#ff5f56', 'loudest')}${sw('Ground', '#0b0c0e', 'page background')}${sw('Ink', '#e8eaee', 'text')}
  </ul>

  <h2>Type</h2>
  <div class="br__type">
    <p style="font:400 44px/1 var(--poster);text-transform:uppercase">Anton, for headlines</p>
    <p style="font:400 18px/1.5 var(--sans)">Inter Tight, for reading. Sentences, explanations, anything longer than a label.</p>
    <p style="font:600 14px/1.4 var(--mono);letter-spacing:.1em;text-transform:uppercase">JetBrains Mono, for labels and numbers 52.4</p>
    <p style="font:700 20px/1.2 var(--stencil);letter-spacing:.14em;text-transform:uppercase">Stardos Stencil, for the wordmark and stamps only</p>
  </div>

  <h2>Voice</h2>
  <div class="br__do">
    <div><p><b>Do</b></p><ul>
      <li>Put the joke in the framing and keep the number straight.</li>
      <li>Say what was counted, by whom, and when.</li>
      <li>Say “loud” and “quiet”. The scale measures tempo.</li>
      <li>Print a zero as a zero and a missing value as missing.</li>
    </ul></div>
    <div><p><b>Do not</b></p><ul>
      <li>Predict. No “will”, no “soon”, no countdowns.</li>
      <li>Say a loud level means danger, or a quiet one means safety.</li>
      <li>Call anything evil, or add harm and benefit into one figure.</li>
      <li>Imitate a real agency's emblem. The costume is a genre.</li>
    </ul></div>
  </div>

  <h2>Files</h2>
  <ul>
    <li><a href="${esc(ctx.href('/favicon.svg'))}">The mark</a> (SVG, lit to the current level) · <a href="${esc(ctx.href('/badge.svg'))}">level badge</a></li>
    <li><a href="${esc(ctx.href('/cards/state.png'))}">Current reading card</a> · <a href="${esc(ctx.href('/cards/state-portrait.png'))}">portrait card</a></li>
    <li>Tally, all five moods: the download links above</li>
  </ul>
  <p><a href="${esc(ctx.href('/press.html'))}">Press kit →</a></p>
</section>`;
  return page({
    ctx, path: '/brand.html',
    title: `Brand guide: name, colours, type, voice and Tally · ${brand.NAME}`,
    description: `How ${brand.NAME} looks and sounds: the level colours, the typefaces, the voice rules, and Tally the duty canary in five moods to download.`,
    main,
  });
}

export function press(ctx) {
  const st = ctx.state;
  const now = st && Number.isFinite(st.level)
    ? `${brand.NAME} ${st.level}, ${st.level_name}, composite ${Number(st.score).toFixed(1)} of 100, observed ${utc(st.generated_at)}` : null;
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  const n = Array.isArray(ctx.history) ? ctx.history.length : null;
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Press kit</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">For anyone writing about ${esc(brand.NAME)}</h1></div>
  <p class="lede">Facts, a paragraph you can lift, images and a contact. Everything on this page may be quoted; the site's text and data are ${esc(brand.LICENSE)}.</p>
  <h2>In one sentence</h2>
  <p><b>${esc(brand.NAME)} is an hourly index of how much is happening in AI, on a scale from 5 (quietest) to 1 (loudest), where every reading can be verified by the reader.</b></p>
  <h2>A paragraph you can lift</h2>
  <p>${esc(brand.NAME)} counts public AI activity across five pillars (${brand.PILLARS.map((p) => esc(p.name.toLowerCase())).join(', ')}) and turns it into one score from 0 to 100 and a level from 5 to 1.
    It measures tempo, not danger, and it does not forecast. Each reading is published with a receipt containing its inputs and the hash of the receipt before it,
    and a button on the home page lets any visitor re-check the last twelve readings in their own browser. It is run by one person, carries no advertising and sets no cookies.</p>
  <h2>Facts</h2>
  <ul>
    ${now ? `<li><b>Current reading:</b> ${esc(now)}. <a href="${esc(ctx.href('/'))}">Live page</a>.</li>` : ''}
    ${n ? `<li><b>Readings published:</b> ${esc(n.toLocaleString('en-US'))}, each with a receipt. <a href="${esc(ctx.href('/moves/'))}">Archive</a>.</li>` : ''}
    <li><b>Update cadence:</b> the index is scored hourly; the newsroom refreshes every minute.</li>
    <li><b>What it is not:</b> a probability, a prediction, or a measure of how bad anything is.</li>
    <li><b>Checkable:</b> <a href="${esc(ctx.href('/#vfy'))}">verify the readings in your browser</a>, read the <a href="${esc(ctx.href('/methodology.html'))}">method</a>, or the <a href="${esc(brand.REPO_URL)}" rel="noopener">source</a>.</li>
    <li><b>Jobs and medicine:</b> sourced, caveated pages on <a href="${esc(ctx.href('/jobs.html'))}">AI and jobs</a> and <a href="${esc(ctx.href('/medicine.html'))}">AI in medicine</a>.</li>
    <li><b>Mascot:</b> Tally, the duty canary. The helmet colour and the face follow the level.</li>
  </ul>
  <h2>How to cite a reading</h2>
  <p>Use the "Cite this reading" line under the verify button on the home page. It links to one reading permanently, so the number in your piece does not change after you publish.</p>
  <h2>Images</h2>
  <ul>
    <li><a href="${esc(ctx.href('/cards/state.png'))}">Current reading card</a> (1200×675 PNG, redrawn every reading)</li>
    <li><a href="${esc(ctx.href('/cards/state-portrait.png'))}">Portrait card</a> for stories and vertical video</li>
    <li><a href="${esc(ctx.href('/badge.svg'))}">Level badge</a> (SVG) and <a href="${esc(ctx.href('/favicon.svg'))}">mark</a> (SVG)</li>
    <li><a href="${esc(ctx.href('/brand.html'))}">Brand guide</a>, with Tally in five moods to download</li>
    <li><a href="${esc(ctx.href('/embed.html'))}">Embeddable widget</a>; the code is on the <a href="${esc(ctx.href('/instruments.html'))}#embed">instruments page</a></li>
  </ul>
  <h2>Contact</h2>
  <p>Message ${x} on X. Corrections that change a number are recorded in the open on the <a href="${esc(brand.REPO_URL)}" rel="noopener">repository</a>.</p>
  <h2>Coverage</h2>
  <p>None yet. When there is some, it will be linked here, including the critical pieces.</p>
</section>`;
  return page({
    ctx, path: '/press.html',
    title: `Press kit · ${brand.NAME}`,
    description: `Facts, a liftable paragraph, images and a contact for anyone writing about ${brand.NAME}, the hourly AI activity index you can verify yourself.`,
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
  <p class="lede">Five numbers people reach for when they want to know how worried to be. They measure different things, and
    only one of them is a count you can check. ${now}</p>
  <h2>The short version</h2>
  <div class="inf__scroll"><table>
    <thead><tr><th>Number</th><th>What it measures</th><th>Who sets it</th><th>Can you recompute it?</th></tr></thead>
    <tbody>
      <tr><td><b>${esc(brand.NAME)}</b></td><td>How much is happening in AI: tempo, not danger</td><td>A published formula over public data, hourly</td><td>Yes, from the receipt</td></tr>
      <tr><td><b>DEFCON</b></td><td>The readiness posture of US armed forces, 5 (lowest) to 1 (highest)</td><td>US military command</td><td>No. The current level is not routinely made public</td></tr>
      <tr><td><b>Doomsday Clock</b></td><td>A symbolic judgement of how close humanity is to catastrophe</td><td>The Bulletin of the Atomic Scientists, usually once a year</td><td>No. It is a judgement, by design</td></tr>
      <tr><td><b>Pentagon Pizza Index</b></td><td>How busy pizza shops near the Pentagon are, read as a hint of military activity</td><td>A website, from shop-busyness data</td><td>Not from anything it publishes that we could find; its own disclaimer says not to rely on it</td></tr>
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
