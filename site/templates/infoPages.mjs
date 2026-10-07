// The three plain pages a visitor, a crawler and an affiliate programme all
// expect to find: what this is, what it does with your data, and how the
// number compares with the ones people already know. Prose only; every claim
// here is one the rest of the site already makes or the code can show.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { MONETIZE, on as mzOn } from '../monetize.mjs';
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
  <h2>The name</h2>
  <p><b>SI</b> is superintelligence. <b>REN</b> is Real-time Early Notice. Together: a siren for the road to superintelligence, which tells you how loud things are and never claims to know how the road ends.
    The index was called ${esc(brand.FORMERLY)} until October 2026. Only the name changed; the method, the history and every receipt are the same.</p>
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
  <p>The full version is on the <a href="${esc(ctx.href('/terms.html'))}">terms &amp; disclaimers</a> page.</p>
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
  <p class="lede">Very little. This page lists every way a visit can leave a trace.</p>
  <h2>What the site itself does</h2>
  <ul>
    <li><b>No cookies.</b> The site sets none.</li>
    <li><b>Page views, and nothing else.</b> Each page except the embed and the badge sends the path of that page, once an hour per tab, to a counter. There is no advertising pixel and no session replay. The operator gets the totals in Slack once an hour. The counter address is in the page source, so the number counts requests, not people.</li>
    <li><b>No accounts.</b> There is nothing to sign up for. The <a href="${esc(ctx.href('/feedback.html'))}">feedback form</a> stores and sends nothing itself: it opens a pre-filled, <b>public</b> issue on GitHub that you choose whether to submit, under GitHub's privacy policy.</li>
    <li><b>Browser storage.</b> A few preferences are kept in your own browser's local storage: the last reading you saw, your
      language choice, your best score in the game, and the panel settings on the live monitor and scanner pages. They never
      leave your device, and clearing site data removes them.</li>
  </ul>
  <h2>Third parties a visit touches</h2>
  <ul>
    <li><b>GitHub Pages</b> hosts the site, so GitHub's servers receive your IP address and browser details, as any web host does.</li>
    <li><b>The page-view counter</b> is ntfy.sh. The request carries the page path and nothing the site added about you. ntfy.sh still sees your IP address and browser details, because that is how a request works. The site reads back only the path and the time. A flag in this browser tab (session storage, not a cookie) remembers that the page was already counted this hour, so a refresh is not a second count. The flag never leaves the tab. The embed and the badge do not send this request.</li>
    <li><b>Fonts</b> are served from this site. No font request goes to Google or any other third party.</li>
    <li><b>Live data pages.</b> Three hand-built pages fetch public data straight from your browser, so those providers receive
      your IP address and browser details when you open them, under their own policies:
      the <b>world monitor</b> (USGS, NASA EONET, GDACS, GDELT, ADSB.lol (regional counts only), OKX, alternative.me),
      the <b>scanner</b> (OKX, Polymarket, DEX Screener, alternative.me), and the <b>stock picks and AI battle</b> page.
      All three also read this project's own data files from GitHub (raw.githubusercontent.com).
      Every other page loads its content from this site, plus the page-view count above. The clips page, below, also loads images from YouTube.</li>
    <li><b>Real Clips.</b> The clips page shows video thumbnails served by YouTube (i.ytimg.com), so Google receives your IP
      address when the page loads. Playing a clip opens YouTube's privacy-enhanced player (youtube-nocookie.com), which sets
      no tracking cookies until you play, under Google's policy. The link checker looks up the link you paste through
      noembed.com. The clip list itself is read from GitHub.</li>
    <li><b>Optional local AI.</b> The monitor can talk to an Ollama model running on your own computer if you turn it on. That
      connection stays on your machine; nothing is sent to this site.</li>
    <li><b>Links out.</b> Clicking a link to X, Amazon, a news source or a data source takes you to that site under its own
      policy. The "Post on X" links pass only the text of the card and this site's address.</li>
${mzOn.newsletter() ? `<li><b>Email newsletter.</b> If you subscribe, your email address goes to ${MONETIZE.newsletter.provider === 'buttondown' ? 'Buttondown' : 'beehiiv'}, which sends the newsletter under its own privacy policy. It is used only to send it, and every email has an unsubscribe link.</li>` : ''}
    ${mzOn.ads() ? `<li><b>Advertising.</b> Some reading pages show one ad from ${MONETIZE.ads.provider === 'ethicalads' ? 'EthicalAds' : 'Carbon Ads'}, chosen by the page's topic, not by tracking you. The ad network receives your IP address and browser details to serve it, under its own policy. This site sets no ad cookies.</li>` : ''}
    ${mzOn.sponsor() ? `<li><b>Sponsor.</b> The sponsor line links to ${esc(MONETIZE.sponsor.name)}; following it takes you to their site under their policy. The sponsor receives no visitor data from this site.</li>` : ''}
    <li><b>Affiliate links.</b> Some links to paid services in the Bunker Kit may be affiliate links; if you buy through one, ${esc(brand.NAME)} may earn a commission at no cost to you.</li>
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
    description: `${brand.NAME} sets no cookies. It counts which pages were opened and nothing else. A visit touches GitHub Pages, the page-view counter, and the sites you choose to click through to.`,
    main,
  });
}


// FEEDBACK. No backend and nothing stored here: the form builds a pre-filled
// GitHub issue (one of .github/ISSUE_TEMPLATE/*.yml, fields filled by id) and
// opens it, so every report lands in the repository's issue list to be read
// and fixed. GitHub needs the visitor signed in to submit; the copy says so,
// and says issues are public.
export function feedback(ctx) {
  const repo = brand.REPO_URL;
  const main = `${CSS}
<style>
.fb form{display:grid;gap:16px;max-width:640px;margin-top:20px}
.fb fieldset{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.fb legend,.fb label{font:600 12px/1.4 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-dim,#AEB7C3);margin-bottom:6px;display:block}
.fb .kind input{position:absolute;opacity:0}
.fb .kind span{display:inline-block;padding:9px 14px;border:1px solid var(--rule,#232C3B);border-radius:4px;cursor:pointer;font:600 14px/1 var(--sans)}
.fb .kind input:checked+span{border-color:#4ADE80;color:#4ADE80;background:rgba(74,222,128,.08)}
.fb .kind input:focus-visible+span{outline:2px solid #4ADE80;outline-offset:2px}
.fb input[type=url],.fb input[type=text],.fb textarea{width:100%;box-sizing:border-box;padding:11px 12px;background:#0E131D;color:#fff;border:1px solid var(--rule,#232C3B);border-radius:4px;font:400 15px/1.45 var(--sans)}
.fb textarea{min-height:150px;resize:vertical}
.fb button{justify-self:start;padding:12px 18px;border:0;border-radius:4px;background:#4ADE80;color:#000;font:700 14px/1 var(--mono);letter-spacing:.08em;cursor:pointer}
.fb .note{font-size:13px;color:var(--ink-dim,#AEB7C3);margin:0}
</style>
<section class="inf fb">
  <p class="eyebrow">Feedback</p>
  <div class="inf__top"><h1 class="bp__h1">Report a problem or send an idea</h1></div>
  <p class="lede">Every report goes straight to the project's issue list on GitHub, where it is read and worked through.</p>
  <form id="fb" novalidate>
    <fieldset class="kind"><legend>What is it?</legend>
      <label><input type="radio" name="kind" value="bug" checked><span>Something's broken</span></label>
      <label><input type="radio" name="kind" value="data"><span>Wrong or old data</span></label>
      <label><input type="radio" name="kind" value="feedback"><span>Idea or feedback</span></label>
    </fieldset>
    <div><label for="fb-title">Short summary</label><input id="fb-title" type="text" maxlength="120" placeholder="e.g. The race chart is blank on my phone" required></div>
    <div><label for="fb-page">Page</label><input id="fb-page" type="url" placeholder="${esc(ctx.url('/'))}"></div>
    <div><label for="fb-what">Details</label><textarea id="fb-what" placeholder="What you saw, what you expected, or what you'd like." required></textarea></div>
    <button type="submit">OPEN ON GITHUB →</button>
    <p class="note">Opens GitHub with this filled in; you press <b>Create</b> there (a free GitHub account is needed). Issues are <b>public</b>, so please leave out personal information. Nothing is sent to or stored by this site.</p>
    <p class="note">Or browse <a href="${esc(repo)}/issues" rel="noopener">open issues</a>.</p>
  </form>
</section>
<script>
(function(){
  var f=document.getElementById('fb'), q=new URLSearchParams(location.search);
  var pg=document.getElementById('fb-page'); if(q.get('page')) pg.value=q.get('page'); else if(document.referrer.indexOf(location.origin)===0) pg.value=document.referrer;
  if(q.get('kind')){var r=f.querySelector('input[value="'+q.get('kind')+'"]'); if(r) r.checked=true;}
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var kind=f.querySelector('input[name=kind]:checked').value, t=document.getElementById('fb-title'), w=document.getElementById('fb-what');
    if(!t.value.trim()){t.focus();return;} if(!w.value.trim()){w.focus();return;}
    var pre={bug:'[Bug] ',data:'[Data] ',feedback:'[Feedback] '}[kind];
    var u=new URL(${JSON.stringify(repo + '/issues/new')});
    u.searchParams.set('template',kind+'.yml'); u.searchParams.set('title',pre+t.value.trim());
    u.searchParams.set('page',pg.value.trim()); u.searchParams.set('what',w.value.trim().slice(0,5000));
    if(kind==='bug') u.searchParams.set('device',navigator.userAgent.slice(0,180));
    window.open(u.toString(),'_blank','noopener');
  });
})();
</script>`;
  return page({
    ctx, path: '/feedback.html',
    title: `Feedback · ${brand.NAME}`,
    description: `Report a problem, wrong data or an idea for ${brand.NAME}. Reports go straight to the project's public issue list on GitHub.`,
    main,
  });
}

// TERMS AND DISCLAIMERS. One page that every other page can point at, so the
// protections do not depend on a reader finding the right footnote. Plain
// words, numbered sections, and nothing that names or locates the person who
// runs the site: contact goes through the project account and the repository,
// the same as the about page. Not a substitute for a lawyer's review.
export const TERMS_UPDATED = '7 October 2026';

export function terms(ctx) {
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a> on X` : 'the project account';
  const repo = `<a href="${esc(brand.REPO_URL)}/issues" rel="noopener">an issue on the repository</a>`;
  const main = `${CSS}
<style>
.inf__box { border: 1px solid var(--rule); border-left: 4px solid var(--accent, #4ADE80); padding: var(--s-3) var(--s-4); margin: var(--s-4) 0; }
.inf__box p { margin: 0 0 8px; } .inf__box p:last-child { margin: 0; }
.inf ol > li { margin-bottom: 6px; }
.inf__caps { font: 400 var(--t-sm)/1.6 var(--sans); }
</style>
<section class="inf">
  <p class="eyebrow">Terms &amp; disclaimers</p>
  <div class="inf__top"><h1 class="bp__h1">Terms of use and disclaimers</h1></div>
  <p class="lede">Last updated ${esc(TERMS_UPDATED)}. By using ${esc(brand.NAME)} — this website, its data files, feeds, embeds, badge,
    share cards and posts — you agree to these terms. If you do not agree, please do not use it.</p>

  <div class="inf__box">
    <p><b>The short version.</b> ${esc(brand.NAME)} is an automated, independent publication for information, commentary and
      entertainment. It counts public activity; it does not predict the future or measure danger. Nothing here is financial,
      investment, legal, security, safety, medical or any other professional advice. The data can be wrong, late or missing,
      and the site is provided as is, with no warranty. Use it at your own risk.</p>
  </div>

  <h2>1. Information and entertainment only</h2>
  <p>Everything on the site is general information, commentary and, in places, satire. It is not advice of any kind and does
    not create any professional, advisory or fiduciary relationship with you. Do not make financial, investment, legal,
    security, safety, medical, emergency, travel or policy decisions based on it. Talk to a qualified professional first.</p>

  <h2>2. What the index is, and is not</h2>
  <ul>
    <li>${esc(brand.DISCLAIMER)}</li>
    <li>It is not a forecast, a warning system, an emergency alert or a statement that any harm is likely or imminent.
      It is not affiliated with, and does not speak for, any military, civil-defence or government alert system.</li>
    <li>Names, levels and language borrowed from other scales (such as DEFCON or the Doomsday Clock) are used for
      comparison and commentary only. ${esc(brand.NAME)} is not connected with the organisations behind them.</li>
  </ul>

  <h2>3. Not financial or investment advice</h2>
  <p>The stock picks, screens, scores, prediction-market readings, forecasts, investor and congressional trade disclosures,
    AI trading competition and any other market content are automated, simulated or hypothetical, and are published for
    information and entertainment only. ${esc(brand.NAME)} and its operator are not a broker-dealer, a registered investment
    adviser, a financial planner or a tax adviser. Nothing on the site is a recommendation or solicitation to buy, sell or hold
    any security, crypto asset, contract or other instrument. Past, simulated and hypothetical results do not predict future
    results. Trading involves risk, including the loss of more than you invest. Do your own research and consult a licensed
    professional. The forecasts page is a public scoring exercise, not betting: no money is taken or paid.</p>

  <h2>4. Security, surveillance and safety pages</h2>
  <ul>
    <li><b>Vulnerability data</b> is summarised from public government catalogues. The site publishes no exploit code and gives
      no security advice; follow your vendors' guidance and a qualified security professional.</li>
    <li><b>Camera and infrastructure maps</b> (licence-plate readers, data centres, power) are built from crowd-sourced and
      public records that can be incomplete, outdated or wrong. A location is not a claim about who operates it or what it
      does. Do not use these maps to trespass, harass anyone, tamper with or damage equipment, or evade lawful enforcement.</li>
    <li><b>Live world data</b> on the monitor (earthquakes, storms, fires, flights, military aircraft, shipping, news) comes from
      third-party feeds that can be delayed, incomplete or wrong. It is not for navigation, aviation, emergency response or
      evacuation decisions. In an emergency, follow official alerts and local authorities.</li>
    <li><b>The Bunker Kit, the game and the mascot's desk</b> are jokes. They are not emergency-preparedness, survival or
      safety guidance. For real preparedness, use your local emergency-management authority.</li>
  </ul>

  <h2>5. People, companies and other people's words</h2>
  <ul>
    <li>Companies, AI labs, products, public figures and officials are named only to report public information, comment on it
      or identify it. Names, logos and trademarks belong to their owners. Their appearance does not mean they endorse, sponsor
      or are affiliated with ${esc(brand.NAME)}, or that ${esc(brand.NAME)} endorses them.</li>
    <li>Rankings, scores and "race" standings are mechanical outputs of a published formula applied to public data. They are
      not statements of fact about anyone's conduct, character, safety record or intentions.</li>
    <li>Trade disclosures by members of Congress and investors are reproduced from public filings and may be delayed or
      incomplete. Showing a trade implies no wrongdoing.</li>
    <li>Headlines, posts, videos, quotes and excerpts from news outlets, X, YouTube and other sources are attributed and linked to where they
      came from. They are the words and opinions of their authors, not of ${esc(brand.NAME)}, and are shown for reporting and
      commentary.</li>
    <li>Illustrated portraits of public figures are generated artwork, not photographs. They are used to identify the person in
      reporting and commentary and say nothing about their views, conduct or approval of this site.</li>
    <li>Humour and exaggeration on the site, including anything said by the mascot, are satire and not literal statements of fact.</li>
  </ul>

  <h2>6. Accuracy and availability</h2>
  <p>The site is assembled automatically by code that reads third-party sources on a schedule. Sources change, fail, rate-limit
    and publish errors; scheduled runs are often late. Figures may therefore be inaccurate, incomplete, stale or temporarily
    missing, and the site may be unavailable or change without notice. Each reading has a public receipt so you can check it,
    and corrections are made in the open, but no figure is guaranteed.</p>

  <h2>7. Links, paid links and third-party services</h2>
  <p>The site links to other websites and services that ${esc(brand.NAME)} does not control and is not responsible for. Visiting them
    is at your own risk and under their own terms and privacy policies. Some links are paid links: as an Amazon Associate,
    ${esc(brand.NAME)} earns from qualifying purchases. A sponsor, if there is one, is labelled and has no say over any number.
    Listing a product is not a guarantee of it; check it yourself before you buy.</p>

  <h2>8. Your use of the site and its data</h2>
  <ul>
    <li>The site's own text and data are ${esc(brand.LICENSE)}; reuse them with credit. Third-party data stays under its own
      licence, as credited on the page that uses it. Nothing here grants rights in anyone else's content or trademarks.</li>
    <li>Do not use the site or its data to break the law, harass or target anyone, or misrepresent ${esc(brand.NAME)} — for example
      by presenting a reading as an official alert or as the operator's endorsement.</li>
    <li>Please be reasonable with automated access to the data files so the site stays up for everyone.</li>
  </ul>

  <h2>9. No warranty</h2>
  <p class="inf__caps">THE SITE AND EVERYTHING ON IT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS
    OR IMPLIED, INCLUDING WARRANTIES OF ACCURACY, COMPLETENESS, TIMELINESS, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NON-INFRINGEMENT, TO THE FULLEST EXTENT THE LAW ALLOWS.</p>

  <h2>10. Limitation of liability</h2>
  <p class="inf__caps">TO THE FULLEST EXTENT THE LAW ALLOWS, ${esc(brand.NAME.toUpperCase())}, ITS OPERATOR AND CONTRIBUTORS ARE NOT LIABLE FOR
    ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, MONEY, DATA OR
    GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF, OR INABILITY TO USE, THE SITE, ITS DATA OR ANY LINKED SITE, WHETHER IN
    CONTRACT, TORT OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY. WHERE LIABILITY CANNOT BE EXCLUDED, IT IS LIMITED TO ZERO
    DOLLARS (US$0), THE AMOUNT YOU PAID TO USE THE SITE.</p>

  <h2>11. Indemnity</h2>
  <p>If you misuse the site or its data, or break these terms or the law in connection with them, you agree to cover any claims,
    losses and reasonable costs that result for ${esc(brand.NAME)} and its operator.</p>

  <h2>12. Children</h2>
  <p>The site is meant for a general adult audience and is not directed at children under 13. It collects no personal
    information from anyone; see the <a href="${esc(ctx.href('/privacy.html'))}">privacy page</a>.</p>

  <h2>13. Copyright concerns and corrections</h2>
  <p>If you believe something on the site infringes your rights, is inaccurate, or should be removed, contact ${x} or open
    ${repo} with the page address and what you would like changed. Valid requests are handled promptly.</p>

  <h2>14. Changes, severability and your rights</h2>
  <p>These terms may be updated at any time; the date at the top shows the latest version, and continuing to use the site means
    you accept it. If any part is found unenforceable, the rest still applies. Nothing in these terms limits any right you have
    that the law does not allow to be limited.</p>

  <p><a href="${esc(ctx.href('/privacy.html'))}">Privacy →</a> · <a href="${esc(ctx.href('/about.html'))}">About →</a> · <a href="${esc(ctx.href('/methodology.html'))}">Method →</a></p>
</section>`;
  return page({
    ctx, path: '/terms.html',
    title: `Terms & disclaimers · ${brand.NAME}`,
    description: `${brand.NAME} is information and commentary, not advice. Terms of use, the no-warranty and liability terms, and what the index does and does not claim.`,
    main,
  });
}

// TWO ANSWER PAGES for the two phrases people actually type. Each one answers
// the question in its first paragraph, says what the thing measures and who
// sets it, and only then says how SIREN differs. Facts about other people's
// numbers are kept to what is stable and uncontroversial; nothing here states
// the Clock's current setting or anyone's current estimate, because both
// change and this page would go stale without anyone noticing.
/**
 * THE TEMPO CLOCK. People look for a clock, so here is the reading drawn as
 * one: a single hand that has gone score/100 of the way round, in the level's
 * colour. It is the dial in a different costume and nothing more. Twelve
 * o'clock is 0 and 100, and the caption says in words that it is not a
 * countdown to anything.
 */
export function tempoClock(ctx, { size = 220 } = {}) {
  const st = ctx.state;
  if (!st || !Number.isFinite(st.score)) return '';
  const a = (st.score / 100) * Math.PI * 2 - Math.PI / 2;
  const hx = (100 + Math.cos(a) * 62).toFixed(2); const hy = (100 + Math.sin(a) * 62).toFixed(2);
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const t = (i / 60) * Math.PI * 2; const long = i % 5 === 0;
    const r0 = long ? 78 : 83; const p = (r) => `${(100 + Math.cos(t) * r).toFixed(1)} ${(100 + Math.sin(t) * r).toFixed(1)}`;
    return `<path d="M${p(r0)}L${p(88)}" stroke-width="${long ? 2.4 : 1}"/>`;
  }).join('');
  const sweep = st.score >= 50 ? 1 : 0;
  const ex = (100 + Math.cos(a) * 88).toFixed(2); const ey = (100 + Math.sin(a) * 88).toFixed(2);
  return `<figure class="tclk" style="--lvl:var(--heat-${esc(st.level)})">
  <svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Tempo clock: the hand is ${esc(Number(st.score).toFixed(1))} hundredths of the way round, level ${esc(st.level)}, ${esc(st.level_name)}">
    <circle cx="100" cy="100" r="94" class="tclk__face"/>
    <path d="M100 12A88 88 0 ${sweep} 1 ${ex} ${ey}" class="tclk__arc"/>
    <g class="tclk__ticks">${ticks}</g>
    <path d="M100 100L${hx} ${hy}" class="tclk__hand"/>
    <circle cx="100" cy="100" r="6" class="tclk__hub"/>
    <text x="100" y="${st.score > 25 && st.score < 75 ? 66 : 150}" text-anchor="middle" class="tclk__n">${esc(Number(st.score).toFixed(1))}</text>
  </svg>
  <figcaption>The tempo clock: the hand has gone ${esc(Number(st.score).toFixed(1))} of 100 round the face. ${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}. It is not a countdown to anything.</figcaption>
</figure>`;
}

export const TCLK_CSS = `
.tclk { margin: var(--s-4) 0; display: grid; justify-items: center; gap: 8px; }
.tclk svg { max-width: 100%; height: auto; }
.tclk__face { fill: var(--bg-sunken); stroke: var(--rule); stroke-width: 2; }
.tclk__arc { fill: none; stroke: var(--lvl, var(--accent)); stroke-width: 7; stroke-linecap: round; opacity: .9; }
.tclk__ticks path { stroke: var(--ink-dim); }
.tclk__hand { stroke: var(--ink); stroke-width: 5; stroke-linecap: round; }
.tclk__hub { fill: var(--lvl, var(--accent)); stroke: var(--ink); stroke-width: 2; }
.tclk__n { font: 400 26px var(--poster); fill: var(--ink); }
.tclk figcaption { font: 500 var(--t-xs)/1.45 var(--mono); letter-spacing: .03em; color: var(--ink-dim); text-align: center; max-width: 44ch; }
`;

function nowLine(ctx) {
  const st = ctx.state;
  return st && Number.isFinite(st.level)
    ? `<p><b>Right now:</b> ${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}, composite ${esc(Number(st.score).toFixed(1))} of 100, observed ${esc(utc(st.generated_at))}. <a href="${esc(ctx.href('/'))}">See the live reading →</a></p>` : '';
}

export function pdoom(ctx) {
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Explainer</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">What is p(doom)?</h1></div>
  <p class="lede"><b>p(doom) is shorthand for “probability of doom”: one person’s estimate, as a percentage, that advanced AI leads to a catastrophic outcome for humanity.</b>
    It is an opinion expressed as a number. There is no agreed method for producing it and no way to check one.</p>
  <h2>Where the term comes from</h2>
  <p>It started as informal slang among people who work on and argue about AI risk, as a quick way to ask “how worried are you?” It spread into interviews and headlines once prominent researchers and executives began giving their own figures in public.</p>
  <h2>Why the numbers differ so much</h2>
  <ul>
    <li><b>“Doom” is not defined.</b> Some people mean human extinction, others mean permanent loss of control, others something milder. Two people can give the same number and mean different things.</li>
    <li><b>The time frame varies.</b> Ten years, this century, ever.</li>
    <li><b>It is a judgement, not a measurement.</b> Estimates given in public run from near zero to near certain, and the same person’s figure can move with the news.</li>
  </ul>
  <h2>What p(doom) cannot tell you</h2>
  <p>It cannot be verified or recomputed, and it does not tell you what is happening today. A room of experts with very different figures can all be looking at the same facts.</p>
  <h2>How ${esc(brand.NAME)} is different</h2>
  <p>${esc(brand.NAME)} does not estimate the chance of anything. It counts how much is happening in AI, hourly, and reports it as a level from 5 (quietest) to 1 (loudest).
    Every reading ships with a receipt, and a button on the home page lets you <a href="${esc(ctx.href('/#vfy'))}">re-check the published record in your own browser</a>.
    The site’s line is: everyone has a p(doom), nobody has a receipt.</p>
  ${nowLine(ctx)}
  <h2>Read more</h2>
  <p><a href="${esc(ctx.href('/guide.html'))}">p(doom) next to DEFCON and the Doomsday Clock →</a> · <a href="${esc(ctx.href('/ai-doomsday-clock.html'))}">Is there an AI doomsday clock? →</a> ·
    <a href="${esc(ctx.href('/library.html'))}">Books from every side of the argument →</a> · <a href="${esc(ctx.href('/history.html'))}">Sixty years of the same argument →</a></p>
</section>`;
  return page({
    ctx, path: '/p-doom.html',
    title: `What is p(doom)? The probability-of-doom number, explained · ${brand.NAME}`,
    description: `p(doom) is one person's estimate of the probability that AI ends catastrophically. Where the term comes from, why the figures differ so widely, and what it cannot tell you.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      { '@type': 'Question', name: 'What is p(doom)?', acceptedAnswer: { '@type': 'Answer', text: 'p(doom) is shorthand for "probability of doom": one person\'s estimate, as a percentage, that advanced AI leads to a catastrophic outcome for humanity. It is an opinion expressed as a number, with no agreed method behind it.' } },
      { '@type': 'Question', name: 'Why do p(doom) estimates differ so much?', acceptedAnswer: { '@type': 'Answer', text: 'Because "doom" is not defined the same way by everyone, the time frame varies, and the figure is a judgement rather than a measurement.' } },
    ] }],
    main,
  });
}

export function aiClock(ctx) {
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Explainer</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">Is there a doomsday clock for AI?</h1></div>
  <p class="lede"><b>The Doomsday Clock is not an AI clock, though it now takes AI into account. Several AI-specific “clocks” exist, and all of them are set by judgement.
    ${esc(brand.NAME)} is the nearest thing that is counted instead: an hourly reading of AI activity that anyone can verify.</b></p>
  <style>${TCLK_CSS}</style>
  ${tempoClock(ctx, { size: 260 })}
  <h2>The Doomsday Clock</h2>
  <p>The Bulletin of the Atomic Scientists has published the Doomsday Clock since 1947. It is a symbol: a board of experts decides, usually once a year, how close to “midnight” to set it.
    It began as a warning about nuclear weapons and has since widened to include climate change and disruptive technologies, AI among them. It is a considered judgement, not a calculation, and it is not updated between announcements.</p>
  <h2>AI-specific clocks and scores</h2>
  <p>A number of sites publish an AI risk clock, countdown or score. What they share is the method: a person, a panel or a language model decides the setting. That makes them statements of opinion. Useful ones, sometimes, but not something a reader can recompute.</p>
  <h2>What ${esc(brand.NAME)} does instead</h2>
  <ul>
    <li><b>It counts.</b> Releases, compute and capital, attention, governance and markets, from public sources, every hour.</li>
    <li><b>It reports tempo, not danger.</b> The level runs from 5 (quietest) to 1 (loudest). Loud means a lot is happening; it does not mean things are going badly.</li>
    <li><b>It can be checked.</b> Each reading has a receipt, and the home page has a button that <a href="${esc(ctx.href('/#vfy'))}">re-verifies the record in your browser</a>.</li>
    <li><b>It moves when the world does.</b> Hourly, not yearly.</li>
  </ul>
  ${nowLine(ctx)}
  <h2>Which should you use?</h2>
  <p>If you want an expert body’s considered view of overall risk, read the Bulletin’s statement. If you want to know how much is happening in AI this week, and to be able to check the answer, that is what this site is for. They answer different questions.</p>
  <p><a href="${esc(ctx.href('/guide.html'))}">The side-by-side comparison →</a> · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)? →</a> · <a href="${esc(ctx.href('/methodology.html'))}">How the index is computed →</a></p>
</section>`;
  return page({
    ctx, path: '/ai-doomsday-clock.html',
    title: `Is there an AI doomsday clock? What exists, and one you can verify · ${brand.NAME}`,
    description: `The Doomsday Clock is set by a board once a year and is not AI-specific. AI risk clocks are set by judgement. ${brand.NAME} is an hourly count of AI activity that anyone can verify.`,
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
      <li>Predict in the index or in posts. Forecasts live only on Tally\u2019s bets, each with a probability, a due date and a score.</li>
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
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">SIREN, DEFCON, the Doomsday Clock and p(doom)</h1></div>
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
  <h2>How to read the SIREN dial</h2>
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
    title: `SIREN vs DEFCON vs the Doomsday Clock vs p(doom): what each measures`,
    description: `A plain guide to four doom numbers. DEFCON is military readiness, the Doomsday Clock is a board's judgement, p(doom) is an opinion, and ${brand.NAME} is an hourly count of AI activity you can recompute.`,
    main,
  });
}
