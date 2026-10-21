// The three plain pages a visitor, a crawler and an affiliate programme all
// expect to find: what this is, what it does with your data, and how the
// number compares with the ones people already know. Prose only; every claim
// here is one the rest of the site already makes or the code can show.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';
import { MONETIZE, on as mzOn } from '../monetize.mjs';
import { mascot, MOODS } from './_mascot.mjs';
import { voicesSection, voicesFaq, VOICES, SURVEY } from './_pdoomVoices.mjs';

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

const mail = `<a href="mailto:${esc(brand.CONTACT_EMAIL)}">${esc(brand.CONTACT_EMAIL)}</a>`;

/** WebPage + speakable + breadcrumbs + FAQ for evergreen explainers (FINDABILITY schema rule). */
function explainerJsonLd(ctx, path, title, description, faqEntities, crumbName) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['h1', '.lede']),
    },
    breadcrumbs(ctx, [{ name: crumbName, path }]),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntities,
    },
  ];
}

export function about(ctx) {
  const path = '/about.html';
  // Head-term question (FINDABILITY tip #204): H1 must match <title> stem.
  // Was “What is SIREN, and who is behind it?” under title “What is SIREN?”.
  const qTitle = `What is ${brand.NAME}?`;
  const description = `${qTitle} An independent, automated index of AI activity run by one person. How it works, how it is paid for, and how to get in touch.`;
  // Tip #308: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const nameQ = 'What does the name SIREN mean?';
  const whatQ = 'What is SIREN as a publication?';
  const whoQ = `Who runs ${brand.NAME}?`;
  const payQ = `How is ${brand.NAME} paid for?`;
  const contactQ = `How do you contact ${brand.NAME}?`;
  const termsQ = 'What are the terms, in plain words?';
  // FAQ from the SAME pairs rendered in HTML (§3.3). Refuse doom-probability.
  const faq = [
    [qTitle,
      `${brand.NAME} is a small, automated publication. A collector reads public sources every hour, a published formula turns them into a score, and a static site is rebuilt from the result. It measures AI activity tempo — not danger or a probability of harm.`],
    [nameQ,
      'SI is superintelligence. REN is Real-time Early Notice. Together: a siren for the road to superintelligence, which tells you how loud things are and never claims to know how the road ends.'],
    [whatQ,
      `${brand.NAME} is a small, automated publication. A collector reads public sources every hour, a published formula turns them into a score, and a static site is rebuilt from the result. There is no editorial desk deciding the level.`],
    [whoQ,
      'One person, independently. It is not affiliated with any AI lab, government body, or the organisations whose scales it borrows its grammar from. It is free to read, carries no display-ad network, and has no investors.'],
    [payQ,
      'Hosting is free. Some pages carry Amazon Associate links that are paid links and labelled where they appear. There is room for one named sponsor with no say over the number, and a donate link.'],
    [contactQ,
      'Corrections, data sources and press questions go by email, X, or an issue on the repository. A correction that changes a number is recorded in the open.'],
    [termsQ,
      'The site is information, not advice. It measures activity, not danger. Third-party data is shown under its own licence. The joke pages are jokes; their numbers are still real counts.'],
    [`Does ${brand.NAME} publish a doom probability?`,
      `No. ${brand.DISCLAIMER_SHORT} The methodology and every receipt are public so a stranger can recompute the number.`],
  ];
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">About</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">${esc(brand.DESCRIPTION)}</p>
  <h2>${esc(nameQ)}</h2>
  <p><b>SI</b> is superintelligence. <b>REN</b> is Real-time Early Notice. Together: a siren for the road to superintelligence, which tells you how loud things are and never claims to know how the road ends.
    The index was called ${esc(brand.FORMERLY)} until October 2026. Only the name changed; the method, the history and every receipt are the same.</p>
  <h2>${esc(whatQ)}</h2>
  <p>${esc(brand.NAME)} is a small, automated publication. A collector reads public sources every hour, a published formula turns
    them into a score, and a static site is rebuilt from the result. There is no editorial desk deciding the level.
    <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a> has every formula and constant, and the
    <a href="${esc(brand.REPO_URL)}" rel="noopener">source code</a> is public.</p>
  <h2>${esc(whoQ)}</h2>
  <p>One person, independently. It is not affiliated with any AI lab, government body or the organisations whose scales it
    borrows its grammar from. It is free to read, carries no display-ad network and has no investors.</p>
  <h2>${esc(payQ)}</h2>
  <p>Hosting is free. <a href="${esc(ctx.href('/bunker-kit.html'))}">What free tools belong in a bunker kit?</a> and
    <a href="${esc(ctx.href('/library.html'))}">What AI books argue both sides of the case?</a> carry Amazon links that are paid links: as an Amazon Associate,
    ${esc(brand.NAME)} earns from qualifying purchases. They are labelled where they appear. There is room for one named sponsor via
    <a href="${esc(ctx.href('/sponsor.html'))}">How do you sponsor ${esc(brand.NAME)} without moving the number?</a> — with no say over the number — and a donate link to ${x}.</p>
  <h2>${esc(contactQ)}</h2>
  <p>Corrections, data sources and press questions: ${mail}, message ${x} on X, or open an issue on the
    <a href="${esc(brand.REPO_URL)}" rel="noopener">repository</a>. A correction that changes a number is recorded in the open.</p>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>
    · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>
    · <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a>.</p>
  <h2>${esc(termsQ)}</h2>
  <ul>
    <li>The site is information, not advice. Do not use it as the basis for financial, legal, safety or policy decisions.</li>
    <li>It measures activity, not danger. ${esc(brand.DISCLAIMER_SHORT)}</li>
    <li>Third-party data is shown under its own licence, credited on the page that uses it. ${esc(brand.LICENSE_BLURB)}.</li>
    <li>${esc(brand.SATIRE)}</li>
    <li>The joke pages (Tally's desk, the game, the Bunker Kit) are satire. Their index numbers, when shown, are still real counts.</li>
  </ul>
  <p>The full version is on <a href="${esc(ctx.href('/terms.html'))}">What are the ${esc(brand.NAME)} terms of use?</a>.
    A one-page map of every disclosure is on <a href="${esc(ctx.href('/disclosures.html'))}">What does ${esc(brand.NAME)} disclose?</a>.</p>
  <p><a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you? →</a>
    · <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)? →</a></p>
</section>`;
  return page({
    ctx,
    path,
    title: `${qTitle} An independent AI activity index · who runs it`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: explainerJsonLd(
      ctx,
      path,
      qTitle,
      description,
      faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
      qTitle,
    ),
    main,
  });
}

export const PRIVACY_UPDATED = '12 October 2026';

export function privacy(ctx) {
  const path = '/privacy.html';
  // Head-term question (FINDABILITY tip #205): H1 must match <title> stem.
  // Was “What does this site know about you?” under “What does SIREN know…”.
  const qTitle = `What does ${brand.NAME} know about you?`;
  const hasGc = !!(MONETIZE.analytics && MONETIZE.analytics.goatcounter);
  const hasGa = !!(MONETIZE.analytics && MONETIZE.analytics.gtag);
  const gaId = hasGa ? esc(MONETIZE.analytics.gtag) : '';
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a> on X` : 'the project account';
  const repo = `<a href="${esc(brand.REPO_URL)}/issues" rel="noopener">an issue on the repository</a>`;
  // Tip #309: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const responsibleQ = `Who is responsible for ${brand.NAME} privacy?`;
  const choicesQ = 'What are your choices about analytics cookies?';
  const siteQ = 'What does the site itself do with a visit?';
  const californiaQ = 'How do California and similar privacy laws apply?';
  const rightsQ = 'What rights do you have under EU, UK and similar laws?';
  const childrenQ = 'Is the site directed at children?';
  const thirdQ = 'Which third parties does a visit touch?';
  const retentionQ = 'How long is visit data retained?';
  const embedQ = 'Do the embed and the badge track visitors?';
  const contactQ = `How do you contact ${brand.NAME} about privacy?`;
  // FAQ from the SAME pairs rendered in HTML (§3.3). Refuse doom-probability / data-sale claims beyond LEGAL_NO_SELL.
  const faq = [
    [qTitle,
      `${brand.NAME} keeps no visitor accounts. A visit may leave host logs (GitHub Pages), optional analytics if enabled, and local preferences in your browser. This page lists every way a visit can leave a trace.`],
    [responsibleQ,
      `${brand.NAME} is run by one independent operator. There is no company account and no postal address published here. Privacy questions and data requests go by email, X, or an issue on the repository. The operator decides what analytics run and what is linked; they do not sell visitor lists.`],
    ...(hasGa ? [[choicesQ,
      'In Europe, the UK and Switzerland, Google Analytics cookies stay off until you choose “Allow analytics” in the banner. If your browser sends Global Privacy Control, analytics cookies stay off everywhere. Advertising storage, ad personalisation and Google signals are switched off for every visitor. Change your mind any time via privacy choices or by clearing this site’s data in your browser.']] : []),
    [siteQ,
      hasGa
        ? `Google Analytics may set cookies when analytics are allowed. This site’s own code does not call document.cookie. There are no accounts; preferences such as theme and game scores stay in local storage on your device.`
        : 'No first-party cookies from this site’s own code. There are no accounts; preferences such as theme and game scores stay in local storage on your device.'],
    [californiaQ,
      `${brand.LEGAL_NO_SELL} ${brand.NAME} has no login and no customer database of its own. Visit data that reaches Google Analytics or the host is disclosed on this page. California residents can email, contact X, or open a repository issue; requests that apply to this project are handled promptly.`],
    [rightsQ,
      `Where GDPR, UK GDPR or similar laws apply, you may have rights to access, correct, delete, restrict or object to processing of personal data, and to lodge a complaint with a supervisory authority. ${brand.NAME} itself does not keep an account profile for you. For data held by a third party named on this page, use that party’s tools or ask here and the request will be pointed at the right place.`],
    [childrenQ,
      `The site is meant for a general adult audience. It is not directed at children under 13 (COPPA) or at children under 16 where that higher age applies. ${brand.NAME} does not knowingly collect personal information from children.`],
    [thirdQ,
      'A visit may touch GitHub Pages as host, optional analytics if enabled, first-party fonts, live-data APIs you open in the browser, YouTube thumbnails on media pages, outbound links you choose, and labelled affiliate or Amazon Associate links. Fonts are served from this site.'],
    [retentionQ,
      hasGa
        ? 'This site does not keep a server-side log of individual visitors beyond what the host retains. Google Analytics retains data according to the property’s retention setting (months, not forever). Local storage on your device lasts until you clear it.'
        : 'This site does not keep a server-side log of individual visitors beyond what the host retains. Google Analytics is off. Local storage on your device lasts until you clear it.'],
    [embedQ,
      'The iframe embed and the README badge are static files. They set no cookies and load nothing from third parties on the pages that use them.'],
    [`Does ${brand.NAME} sell personal data?`,
      `${brand.LEGAL_NO_SELL} The operator does not sell visitor lists.`],
    ['Are there first-party cookies?',
      hasGa
        ? 'Google Analytics may set cookies when analytics are allowed. This site’s own code does not call document.cookie. Preferences such as theme and game scores stay in local storage on your device.'
        : 'No first-party cookies from this site’s own code. Preferences such as theme and game scores stay in local storage on your device.'],
    [contactQ,
      `See What is ${brand.NAME}? for how to get in touch, or What does ${brand.NAME} disclose? for the short map of every legal notice on the site.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Privacy</p>
  <div class="inf__top"><h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">Last updated ${esc(PRIVACY_UPDATED)}. Very little is kept by ${esc(brand.NAME)} itself.
    This page lists every way a visit can leave a trace, who receives it, and what rights you have.</p>

  <h2>${esc(responsibleQ)}</h2>
  <p>${esc(brand.NAME)} is run by one independent operator. There is no company account and no postal address published here.
    Privacy questions and data requests go to ${mail} (or ${x}, or ${repo}). The operator decides what analytics run and what is linked; they do not sell visitor lists.</p>

  ${hasGa ? `<h2>${esc(choicesQ)}</h2>
  <ul>
    <li><b>Europe, the UK and Switzerland:</b> Google Analytics cookies stay off until you choose “Allow analytics” in the banner. Until then Google receives only cookieless, consent-mode signals.</li>
    <li><b>Global Privacy Control:</b> if your browser sends GPC, analytics cookies stay off everywhere, and the site treats it as an opt-out of any sale or sharing.</li>
    <li><b>Advertising:</b> advertising storage, ad personalisation and Google signals are switched off for every visitor.</li>
    <li><b>Change your mind any time:</b> <a href="#" data-consent-open>open privacy choices</a>, or clear this site's data in your browser.</li>
  </ul>` : ''}

  <h2>${esc(siteQ)}</h2>
  <ul>
    ${hasGa
      ? `<li><b>Cookies from Google Analytics.</b> Pages load Google Analytics (measurement ID ${gaId}), which may set cookies Google uses to recognise returning visitors and measure traffic (_ga, _ga_*, and related). This site's own code does not call <code>document.cookie</code>.</li>`
      : `<li><b>No first-party cookies.</b> The site's own code sets none.</li>`}
    ${hasGc
      ? `<li><b>Visitor counts, without cookies.</b> Pages load GoatCounter, which counts visits: the page, the referring site, your country (worked out from your IP address, which is not stored), browser, screen size and language. It sets no cookies, does not track you across sites, and keeps no personal data. Turn on your browser's Do Not Track to be left out.</li>`
      : ''}
    ${hasGa
      ? `<li><b>Google Analytics.</b> Pages load Google's gtag script for ${gaId}. Google receives your IP address, browser details, the page you open and a client identifier, under <a href="https://policies.google.com/privacy" rel="noopener">Google's privacy policy</a>. ${esc(brand.NAME)} uses the reports to see which pages are read; it does not sell that data or share it with sponsors. Data may be processed in the United States.</li>`
      : ''}
    ${!hasGc && !hasGa
      ? `<li><b>No analytics scripts.</b> There is no tracking script, pixel or visitor counter on this site. Your host and any page you open that calls a third-party API still see a normal web request.</li>`
      : ''}
    <li><b>No accounts.</b> There is nothing to sign up for. The <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a> form stores and sends nothing itself: it opens a pre-filled, <b>public</b> issue on GitHub that you choose whether to submit, under GitHub's privacy policy.</li>
    <li><b>Browser storage.</b> A few preferences are kept in your own browser's local storage: the last reading you saw, your
      language choice, your best score in the game, and the panel settings on the live monitor and scanner pages. They never
      leave your device, and clearing site data removes them.</li>
  </ul>

  <h2>${esc(californiaQ)}</h2>
  <p>${esc(brand.LEGAL_NO_SELL)} ${esc(brand.NAME)} has no login and no customer database of its own.
    Visit data that reaches Google Analytics or the host is described above. If you are a California resident and want to know what a covered business holds about you, email ${mail}, contact ${x} or open ${repo}; requests that apply to this project are handled promptly.
    You can also use industry opt-outs such as the <a href="https://optout.aboutads.info/" rel="noopener">Digital Advertising Alliance</a> tools where they apply to third parties you visit through this site.</p>

  <h2>${esc(rightsQ)}</h2>
  <p>Where GDPR, UK GDPR or similar laws apply, you may have rights to access, correct, delete, restrict or object to processing of personal data, and to lodge a complaint with a supervisory authority.
    ${esc(brand.NAME)} itself does not keep an account profile for you. For data held by Google, GoatCounter, GitHub or another third party named on this page, use that party's tools or ask here and the request will be pointed at the right place.
    ${hasGa ? 'To limit Google Analytics in your browser, use Google\'s <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">opt-out add-on</a>, block third-party cookies, or use a content blocker.' : ''}</p>

  <h2>${esc(childrenQ)}</h2>
  <p>The site is meant for a general adult audience. It is not directed at children under 13 (COPPA) or at children under 16 where that higher age applies.
    ${esc(brand.NAME)} does not knowingly collect personal information from children. If you believe a child submitted personal data through a public GitHub issue opened from the feedback form, email ${mail} or contact ${x} so it can be removed.</p>

  <h2>${esc(thirdQ)}</h2>
  <ul>
    <li><b>GitHub Pages</b> hosts the site, so GitHub's servers receive your IP address and browser details, as any web host does.</li>
    ${hasGa
      ? `<li><b>Google Analytics</b> receives visit data as described above, under Google's privacy policy.</li>`
      : ''}
    <li><b>Fonts</b> are served from this site. No font request goes to Google Fonts or any other third-party font host.</li>
    <li><b>Live data pages.</b> Hand-built pages that fetch public data straight from your browser, so those providers receive
      your IP address and browser details when you open them, under their own policies:
      the <b>world monitor</b> (USGS, NASA EONET, GDACS, GDELT, ADSB.lol ADS-B/MLAT/TIS-B as regional counts only, OKX, Yahoo Finance chart data via published snapshots, alternative.me),
      the <b>scanner</b> (OKX, Binance WebSocket for live crypto prices, Polymarket, DEX Screener, alternative.me; outbound links may include rugcheck.xyz and solscan.io),
      and the <b>stock picks and AI battle</b> page (Coinbase public API data via published snapshots, Yahoo Finance via published snapshots, plus browser calls noted on that page).
      The <b>dispatch</b> page reads only this project's dispatch snapshot and country outline from GitHub
      (raw.githubusercontent.com), not third-party APIs from the browser.
      The monitor, scanner and battle pages also read this project's own data files from GitHub.
      Every other page loads only files from this site, except the media pages below.</li>
    <li><b>Real Clips.</b> The clips page shows video thumbnails served by YouTube (i.ytimg.com), so Google receives your IP
      address when the page loads. Playing a clip opens YouTube's privacy-enhanced player (youtube-nocookie.com), which holds off on tracking cookies until you play, under Google's policy. The link checker looks up the link you paste through
      noembed.com. The clip list itself is read from GitHub.</li>
    <li><b>AI on TV &amp; radio.</b> The live page shows video thumbnails served by YouTube (i.ytimg.com) and podcast artwork from
      each show's host, so those servers receive your IP address when the page loads. A video plays in YouTube's privacy-enhanced
      player (youtube-nocookie.com) only after you click it, and an episode's audio streams from the show's own host only after you press play.</li>
    <li><b>Optional local AI.</b> The monitor can talk to an Ollama model running on your own computer if you turn it on. That
      connection stays on your machine; nothing is sent to this site.</li>
    <li><b>Links out.</b> Clicking a link to X, Amazon, a news source or a data source takes you to that site under its own
      policy. The "Post on X" links pass only the text of the card and this site's address.</li>
${mzOn.newsletter() ? `<li><b>Email newsletter.</b> If you subscribe, your email address goes to ${MONETIZE.newsletter.provider === 'buttondown' ? 'Buttondown' : 'beehiiv'}, which sends the newsletter under its own privacy policy. It is used only to send it, and every email has an unsubscribe link.</li>` : ''}
    ${mzOn.ads() ? `<li><b>Advertising.</b> Some reading pages show one ad from ${MONETIZE.ads.provider === 'ethicalads' ? 'EthicalAds' : 'Carbon Ads'}, chosen by the page's topic, not by tracking you. The ad network receives your IP address and browser details to serve it, under its own policy. This site sets no ad cookies.</li>` : ''}
    ${mzOn.sponsor() ? `<li><b>Sponsor.</b> The sponsor line links to ${esc(MONETIZE.sponsor.name)}; following it takes you to their site under their policy. The sponsor receives no visitor data from this site.</li>` : ''}
    <li><b>Affiliate links.</b> Some links to paid services in the Bunker Kit may be affiliate links; if you buy through one, ${esc(brand.NAME)} may earn a commission at no cost to you.</li>
    <li><b>Amazon paid links.</b> The reading list and the supplies crate in the Bunker Kit use Amazon Associates links. If you follow one, Amazon
      may set its own cookies to attribute a purchase. ${esc(brand.LEGAL_AFFILIATE)}</li>
  </ul>

  <h2>${esc(retentionQ)}</h2>
  <ul>
    <li><b>This site</b> does not keep a server-side log of individual visitors beyond what the host (GitHub Pages) retains under its own policy.</li>
    <li><b>GoatCounter</b>${hasGc ? ' keeps aggregate visit counts without personal data; see GoatCounter\'s own retention terms.' : ' is off.'}</li>
    <li><b>Google Analytics</b>${hasGa ? ' retains data according to the property\'s Google Analytics retention setting (months, not forever); delete requests follow Google\'s tools.' : ' is off.'}</li>
    <li><b>Local storage</b> on your device lasts until you clear it.</li>
  </ul>

  <h2>${esc(embedQ)}</h2>
  <p>The iframe embed and the README badge are static files. They set no cookies and load nothing from third parties on the pages that use them.</p>

  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/about.html'))}">What is ${esc(brand.NAME)}?</a>
    · <a href="${esc(ctx.href('/disclosures.html'))}">What does ${esc(brand.NAME)} disclose?</a>
    · <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a>.</p>
  <h2>${esc(contactQ)}</h2>
  <p>See <a href="${esc(ctx.href('/about.html'))}">What is ${esc(brand.NAME)}?</a> for how to get in touch, or
    <a href="${esc(ctx.href('/disclosures.html'))}">What does ${esc(brand.NAME)} disclose?</a> for the short map of every legal notice on the site.
    To report a security issue, use
    <a href="${esc(brand.REPO_URL)}/security/advisories/new" rel="noopener">private vulnerability reporting</a>
    or read <a href="${esc(brand.REPO_URL)}/blob/main/SECURITY.md" rel="noopener">SECURITY.md</a>.</p>
</section>`;
  const description = hasGa
    ? `${qTitle} ${brand.NAME} uses Google Analytics (${gaId}) and${hasGc ? ' cookieless GoatCounter' : ''} to count visits. What a visit touches: GitHub Pages, Google,${hasGc ? ' GoatCounter,' : ''} live-data APIs you open, and the sites you choose to click through to. ${brand.LEGAL_NO_SELL}`
    : `${qTitle} ${brand.NAME} keeps no visitor accounts; cookieless counts and host logs are disclosed here. What a visit touches: GitHub Pages, analytics if enabled, and the sites you choose to click through to.`;
  return page({
    ctx,
    path,
    title: `${qTitle} Privacy policy`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: explainerJsonLd(
      ctx,
      path,
      qTitle,
      description,
      faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
      qTitle,
    ),
    main,
  });
}


// FEEDBACK. No backend and nothing stored here: the form builds a pre-filled
// GitHub issue (one of .github/ISSUE_TEMPLATE/*.yml, fields filled by id) and
// opens it, so every report lands in the repository's issue list to be read
// and fixed. GitHub needs the visitor signed in to submit; the copy says so,
// and says issues are public.
export function feedback(ctx) {
  const path = '/feedback.html';
  const qTitle = `How do I report a problem or send an idea to ${brand.NAME}?`;
  const description = `${qTitle} Every report goes straight to the project's public issue list on GitHub. Nothing is sent to or stored by this site. Issues are public — leave out personal information.`;
  const repo = brand.REPO_URL;

  // FAQ answers restate lede / note copy only (FINDABILITY §3.3).
  // Refuse: private intake, doom-probability, stuffing.
  const faq = [
    [qTitle,
      'Every report goes straight to the project\'s issue list on GitHub, where it is read and worked through. Opens GitHub with the form filled in; you press Create there (a free GitHub account is needed).'],
    ['Does this site store my feedback?',
      'Nothing is sent to or stored by this site. The form opens a pre-filled, public issue on GitHub that you choose whether to submit.'],
    ['Are feedback issues public?',
      'Issues are public, so please leave out personal information.'],
    ['What kinds of reports can I send?',
      'Something\'s broken, wrong or old data, or an idea or feedback.'],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');

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
.fb .fb-faq-key{margin-top:16px}
.fb .fb-faq-key a{color:var(--accent,#4ADE80);text-decoration:underline;text-underline-offset:2px}
</style>
<section class="inf fb">
  <p class="eyebrow">Feedback</p>
  <div class="inf__top"><h1 class="bp__h1">${esc(qTitle)}</h1></div>
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
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="note fb-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/about.html'))}">What is ${esc(brand.NAME)}?</a>
    · <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a>.</p>
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
    ctx,
    path,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: explainerJsonLd(ctx, path, qTitle, description, faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })), 'Feedback'),
    main,
  });
}

// TERMS AND DISCLAIMERS. One page that every other page can point at, so the
// protections do not depend on a reader finding the right footnote. Plain
// words, numbered sections, and nothing that names or locates the person who
// runs the site: contact goes through the project account and the repository,
// the same as the about page. Not a substitute for a lawyer's review.
export const TERMS_UPDATED = '12 October 2026';

export function terms(ctx) {
  const path = '/terms.html';
  // Head-term title: people search “SIREN terms” / what the index disclaims.
  const qTitle = `What are the ${brand.NAME} terms of use?`;
  const title = `${qTitle} Disclaimers and what the index is not`;
  const description = `${brand.NAME} is information and commentary, not advice. Terms of use, the no-warranty and liability terms, and what the index does and does not claim.`;
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a> on X` : 'the project account';
  const repo = `<a href="${esc(brand.REPO_URL)}/issues" rel="noopener">an issue on the repository</a>`;
  // Tip #311: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const infoQ = `1. Is ${brand.NAME} information and entertainment only?`;
  const indexQ = '2. What is the index, and what is it not?';
  const financeQ = `3. Is ${brand.NAME} financial or investment advice?`;
  const safetyQ = '4. What do the security, surveillance and safety pages cover?';
  const peopleQ = "5. How are people, companies and other people's words treated?";
  const accuracyQ = '6. How accurate and available is the site?';
  const linksQ = '7. What about links, paid links and third-party services?';
  const useQ = '8. What are the rules for your use of the site and its data?';
  const warrantyQ = '9. Is there any warranty?';
  const liabilityQ = '10. What is the limitation of liability?';
  const indemnityQ = '11. What is the indemnity?';
  const childrenQ = '12. Is the site directed at children?';
  const personalQ = '13. What about personal information and “do not sell”?';
  const copyrightQ = '14. How do copyright concerns and corrections work?';
  const lawQ = '15. What law governs these terms?';
  const changesQ = '16. How do changes, severability and your rights work?';
  // FAQ from the SAME pairs rendered in HTML (§3.3). Refuse doom-probability.
  const faq = [
    [qTitle,
      `By using ${brand.NAME} — this website, its data files, feeds, embeds, badge, share cards and posts — you agree to these terms. The site is information, commentary and entertainment; it is not financial, legal, safety or medical advice.`],
    [infoQ,
      'Everything on the site is general information, commentary and, in places, satire. It is not advice of any kind and does not create any professional, advisory or fiduciary relationship with you.'],
    [indexQ,
      `${brand.DISCLAIMER} It is not a forecast, a warning system, an emergency alert or a statement that any harm is likely or imminent. Names borrowed from other scales are used for comparison and commentary only.`],
    [financeQ,
      `${brand.NAME} and its operator are not a broker-dealer, a registered investment adviser, a financial planner or a tax adviser. Nothing on the site is a recommendation or solicitation to buy, sell or hold any security or other instrument.`],
    [safetyQ,
      'Vulnerability data, camera and infrastructure maps, live world data, dispatch and joke pages are for ambient awareness or satire only. They are not for navigation, emergency response or survival guidance.'],
    [peopleQ,
      `Companies, labs, products and public figures are named to report or comment on public information. Rankings are mechanical outputs of a published formula. Humour and exaggeration, including the mascot, are satire.`],
    [accuracyQ,
      'The site is assembled automatically from third-party sources. Figures may be inaccurate, incomplete, stale or temporarily missing. Each reading has a public receipt, but no figure is guaranteed.'],
    [linksQ,
      `${brand.LEGAL_AFFILIATE} The site links to other websites it does not control. A sponsor, if there is one, is labelled and has no say over any number.`],
    [useQ,
      `${brand.LICENSE_BLURB}. Do not use the site or its data to break the law, harass anyone, or misrepresent ${brand.NAME} as an official alert.`],
    [warrantyQ,
      'The site and everything on it are provided “as is” and “as available”, without warranties of any kind, to the fullest extent the law allows.'],
    [liabilityQ,
      `To the fullest extent the law allows, ${brand.NAME}, its operator and contributors are not liable for damages arising from use of the site. Where liability cannot be excluded, it is limited to zero dollars.`],
    [indemnityQ,
      `If you misuse the site or its data, or break these terms or the law in connection with them, you agree to cover resulting claims for ${brand.NAME} and its operator.`],
    [childrenQ,
      'The site is meant for a general adult audience. It is not directed at children under 13, or under 16 where that higher age applies.'],
    [personalQ,
      `${brand.LEGAL_NO_SELL} Details of analytics, hosts and browser-side API calls are on the privacy page.`],
    [copyrightQ,
      'If you believe something on the site infringes your rights, is inaccurate, or should be removed, email, contact X, or open a repository issue with the page address and what you would like changed.'],
    [lawQ,
      'These terms are governed by the laws of the United States, without regard to conflict-of-law rules, except where a mandatory local law says otherwise.'],
    [changesQ,
      'These terms may be updated at any time; the date at the top shows the latest version. If any part is found unenforceable, the rest still applies.'],
    [`Does ${brand.NAME} predict the future or measure danger?`,
      `No. ${brand.DISCLAIMER_SHORT} It is not a forecast, a warning system, or an emergency alert.`],
    [`Is ${brand.NAME} affiliated with DEFCON or the Doomsday Clock?`,
      `No. Names and language borrowed from other scales are used for comparison and commentary only. The index is not connected with the organisations behind those scales.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<style>
.inf__box { border: 1px solid var(--rule); border-left: 4px solid var(--accent, #4ADE80); padding: var(--s-3) var(--s-4); margin: var(--s-4) 0; }
.inf__box p { margin: 0 0 8px; } .inf__box p:last-child { margin: 0; }
.inf ol > li { margin-bottom: 6px; }
.inf__caps { font: 400 var(--t-sm)/1.6 var(--sans); }
</style>
<section class="inf">
  <p class="eyebrow">Terms &amp; disclaimers</p>
  <div class="inf__top"><h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">Last updated ${esc(TERMS_UPDATED)}. By using ${esc(brand.NAME)} — this website, its data files, feeds, embeds, badge,
    share cards and posts — you agree to these terms. If you do not agree, please do not use it.
    A shorter map of every notice is on <a href="${esc(ctx.href('/disclosures.html'))}">What does ${esc(brand.NAME)} disclose?</a>.</p>

  <div class="inf__box">
    <p><b>The short version.</b> ${esc(brand.NAME)} is an automated, independent publication for information, commentary and
      entertainment. It counts public activity; it does not predict the future or measure danger. Nothing here is financial,
      investment, legal, security, safety, medical or any other professional advice. The data can be wrong, late or missing,
      and the site is provided as is, with no warranty. Use it at your own risk.</p>
  </div>

  <h2>${esc(infoQ)}</h2>
  <p>Everything on the site is general information, commentary and, in places, satire. It is not advice of any kind and does
    not create any professional, advisory or fiduciary relationship with you. Do not make financial, investment, legal,
    security, safety, medical, emergency, travel or policy decisions based on it. Talk to a qualified professional first.</p>

  <h2>${esc(indexQ)}</h2>
  <ul>
    <li>${esc(brand.DISCLAIMER)}</li>
    <li>It is not a forecast, a warning system, an emergency alert or a statement that any harm is likely or imminent.
      It is not affiliated with, and does not speak for, any military, civil-defence or government alert system.</li>
    <li>Names, levels and language borrowed from other scales (such as DEFCON or the Doomsday Clock) are used for
      comparison and commentary only. ${esc(brand.NAME)} is not connected with the organisations behind them.</li>
  </ul>

  <h2>${esc(financeQ)}</h2>
  <p>The stock picks, screens, scores, prediction-market readings, forecasts, investor and congressional trade disclosures,
    AI trading competition and any other market content are automated, simulated or hypothetical, and are published for
    information and entertainment only. ${esc(brand.NAME)} and its operator are not a broker-dealer, a registered investment
    adviser, a financial planner or a tax adviser. Nothing on the site is a recommendation or solicitation to buy, sell or hold
    any security, crypto asset, contract or other instrument. Past, simulated and hypothetical results do not predict future
    results. Trading involves risk, including the loss of more than you invest. Do your own research and consult a licensed
    professional. The forecasts page is a public scoring exercise, not betting: no money is taken or paid.</p>

  <h2>${esc(safetyQ)}</h2>
  <ul>
    <li><b>Vulnerability data</b> is summarised from public government catalogues. The site publishes no exploit code and gives
      no security advice; follow your vendors' guidance and a qualified security professional.</li>
    <li><b>Camera and infrastructure maps</b> (licence-plate readers, data centres, power) are built from crowd-sourced and
      public records that can be incomplete, outdated or wrong. A location is not a claim about who operates it or what it
      does. Do not use these maps to trespass, harass anyone, tamper with or damage equipment, or evade lawful enforcement.</li>
    <li><b>Live world data</b> on the monitor (earthquakes, storms, fires, flights, military aircraft, shipping, news) comes from
      third-party feeds that can be delayed, incomplete or wrong. It is not for navigation, aviation, emergency response or
      evacuation decisions. In an emergency, follow official alerts and local authorities.</li>
    <li><b>Dispatch</b> (911 CAD calls, NWS/USGS/GDACS/NHC/EONET alerts and police-call chatter) is delayed public open data for ambient
      awareness only. High-severity triggers may mark an emergency banner on this site and post once to X; that is still not a
      warning system, not complete coverage of the United States, and not for emergency response.
      In an emergency, call your local emergency number and follow official alerts.</li>
    <li><b>The Bunker Kit, the game and the mascot's desk</b> are jokes. They are not emergency-preparedness, survival or
      safety guidance. For real preparedness, use your local emergency-management authority.</li>
  </ul>

  <h2>${esc(peopleQ)}</h2>
  <ul>
    <li>Companies, AI labs, products, public figures and officials are named only to report public information, comment on it
      or identify it. Names, logos and trademarks belong to their owners. Cultural references used for commentary, such as “Skynet” (from the Terminator films), the Waffle House Index (a FEMA nickname) and the Doomsday Clock, belong to their owners; SIREN is not connected with or endorsed by StudioCanal, Waffle House, Inc., the Bulletin of the Atomic Scientists, or any studio, company or organisation named. Their appearance does not mean they endorse, sponsor
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
    <li>${esc(brand.SATIRE)}</li>
  </ul>

  <h2>${esc(accuracyQ)}</h2>
  <p>The site is assembled automatically by code that reads third-party sources on a schedule. Sources change, fail, rate-limit
    and publish errors; scheduled runs are often late. Figures may therefore be inaccurate, incomplete, stale or temporarily
    missing, and the site may be unavailable or change without notice. Each reading has a public receipt so you can check it,
    and corrections are made in the open, but no figure is guaranteed.</p>

  <h2>${esc(linksQ)}</h2>
  <p>The site links to other websites and services that ${esc(brand.NAME)} does not control and is not responsible for. Visiting them
    is at your own risk and under their own terms and privacy policies. Some links are paid or affiliate links:
    ${esc(brand.LEGAL_AFFILIATE)} A sponsor, if there is one, is labelled and has no say over any number.
    Listing a product is not a guarantee of it; check it yourself before you buy.
    Prediction-market and exchange links may be unavailable or restricted where you live; that is their rule, not a recommendation from this site. Some prediction-market or exchange links may carry a referral code that pays SIREN a share of fees; where one does, it is labelled as a referral link. Using prediction markets may be illegal or restricted for people under 18 or in your state or country; check before you trade. Any paid tool offered on the site in future will show its price, refund terms and seller details at checkout, before you pay.</p>

  <h2>${esc(useQ)}</h2>
  <ul>
    <li>${esc(brand.LICENSE_BLURB)}. Reuse with credit. Third-party data stays under its own
      licence, as credited on the page that uses it. Nothing here grants rights in anyone else's content or trademarks.</li>
    <li>Do not use the site or its data to break the law, harass or target anyone, or misrepresent ${esc(brand.NAME)} — for example
      by presenting a reading as an official alert or as the operator's endorsement.</li>
    <li>Please be reasonable with automated access to the data files so the site stays up for everyone.</li>
  </ul>

  <h2>${esc(warrantyQ)}</h2>
  <p class="inf__caps">THE SITE AND EVERYTHING ON IT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS
    OR IMPLIED, INCLUDING WARRANTIES OF ACCURACY, COMPLETENESS, TIMELINESS, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NON-INFRINGEMENT, TO THE FULLEST EXTENT THE LAW ALLOWS.</p>

  <h2>${esc(liabilityQ)}</h2>
  <p class="inf__caps">TO THE FULLEST EXTENT THE LAW ALLOWS, ${esc(brand.NAME.toUpperCase())}, ITS OPERATOR AND CONTRIBUTORS ARE NOT LIABLE FOR
    ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, MONEY, DATA OR
    GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF, OR INABILITY TO USE, THE SITE, ITS DATA OR ANY LINKED SITE, WHETHER IN
    CONTRACT, TORT OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY. WHERE LIABILITY CANNOT BE EXCLUDED, IT IS LIMITED TO ZERO
    DOLLARS (US$0), THE AMOUNT YOU PAID TO USE THE SITE.</p>

  <h2>${esc(indemnityQ)}</h2>
  <p>If you misuse the site or its data, or break these terms or the law in connection with them, you agree to cover any claims,
    losses and reasonable costs that result for ${esc(brand.NAME)} and its operator.</p>

  <h2>${esc(childrenQ)}</h2>
  <p>The site is meant for a general adult audience. It is not directed at children under 13, or under 16 where that higher age applies.
    See <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a> for how visits are measured and how to ask for removal of something a child posted publicly via the feedback form.</p>

  <h2>${esc(personalQ)}</h2>
  <p>${esc(brand.LEGAL_NO_SELL)} Details of analytics, hosts and browser-side API calls are on
    <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a>.</p>

  <h2>${esc(copyrightQ)}</h2>
  <p>If you believe something on the site infringes your rights, is inaccurate, or should be removed, email ${mail}, contact ${x} or open
    ${repo} with the page address and what you would like changed. Valid requests are handled promptly.
    There is no user-upload feature; the site is a static publication that reports, links to and briefly quotes other people's work.</p>
  <p><b>Copyright notices (DMCA-style).</b> To ask for removal of material you own, send to ${mail}: your contact details; the work you say is infringed; the exact page address and the item on it; a statement that you believe in good faith the use is not authorised by you, your agent or the law; a statement that the notice is accurate and, under penalty of perjury, that you are the owner or authorised to act for the owner; and your physical or electronic signature. Material that meets these points is taken down or corrected while the claim is looked at. If your material was removed and you believe that was a mistake, reply with a counter-notice giving the same details and the reason. Misrepresenting a claim can make you liable for damages.</p>

  <h2>${esc(lawQ)}</h2>
  <p>These terms are governed by the laws of the United States, without regard to conflict-of-law rules, except where a mandatory local law says otherwise.
    Nothing here chooses a specific state venue or waives rights you cannot waive. If a dispute cannot be resolved informally through ${mail}, ${x} or ${repo},
    either side may use a court of competent jurisdiction that will hear the claim.</p>

  <h2>${esc(changesQ)}</h2>
  <p>These terms may be updated at any time; the date at the top shows the latest version, and continuing to use the site means
    you accept it. If any part is found unenforceable, the rest still applies. Nothing in these terms limits any right you have
    that the law does not allow to be limited. This page is not a substitute for advice from your own lawyer.</p>

  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}

  <p><a href="${esc(ctx.href('/disclosures.html'))}">What does ${esc(brand.NAME)} disclose?</a> · <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a> · <a href="${esc(ctx.href('/about.html'))}">What is ${esc(brand.NAME)}?</a> · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a></p>
</section>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: explainerJsonLd(ctx, path, title, description, faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })), qTitle),
    main,
  });
}

/** One-page map of every legal notice a visitor, affiliate programme or regulator expects. */
export function disclosures(ctx) {
  const path = '/disclosures.html';
  // Head-term title: people search “SIREN disclosures” / what the site discloses.
  const qTitle = `What does ${brand.NAME} disclose?`;
  const title = `${qTitle} Legal notices in one place`;
  const description = `Legal and compliance disclosures for ${brand.NAME}: what the index is, not advice, affiliates, privacy, satire and licence — with links to the full terms.`;
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  // Tip #310: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const indexQ = `What is the ${brand.NAME} index, and what is it not?`;
  const financeQ = `What does ${brand.NAME} disclose about finance and markets?`;
  const affiliateQ = 'What affiliate and paid links does this site use?';
  const privacyQ = 'What does this page say about privacy and analytics?';
  const satireQ = 'Which pages are satire or jokes?';
  const peopleQ = 'How are people and likenesses handled?';
  const licenceQ = `What licence covers ${brand.NAME}?`;
  const contactQ = `How do you contact ${brand.NAME} about disclosures?`;
  // FAQ from the SAME pairs rendered in HTML (§3.3). Refuse doom-probability.
  const faq = [
    [qTitle,
      `This page maps every notice ${brand.NAME} makes: what the index is, that it is not advice, affiliate and paid links, privacy and analytics, satire, people and likenesses, and the licence. The full contracts are the terms and privacy pages.`],
    [indexQ,
      `${brand.DISCLAIMER} ${brand.LEGAL_NOT_ADVICE} Not a forecast, warning system, emergency alert or probability of harm. Names borrowed from DEFCON or the Doomsday Clock are commentary only.`],
    [financeQ,
      `Stock picks, scanner screens, AI paper trades, prediction-market odds, investor and congressional trade listings are automated, simulated or hypothetical. ${brand.NAME} is not a broker-dealer or registered investment adviser. Past and simulated results do not predict future results.`],
    [affiliateQ,
      `${brand.LEGAL_AFFILIATE} There is no display-ad network while ads stay off in configuration. A named sponsor, if any, is labelled and has no say over any number.`],
    [privacyQ,
      `Visits may be counted with Google Analytics and cookieless GoatCounter when those are turned on; both are disclosed on the privacy page. ${brand.LEGAL_NO_SELL}`],
    [satireQ,
      'Tally the mascot, the Bunker Kit, the game and similar pages are satire or jokes. Their counts can still be real arithmetic; the framing is not emergency, medical or survival advice.'],
    [peopleQ,
      'Illustrated portraits of public figures are generated artwork, not photographs. Names, marks and logos belong to their owners. Appearance here is not endorsement either way.'],
    [licenceQ,
      `${brand.LICENSE_BLURB}. Third-party data stays under its own licence, credited on the page that uses it.`],
    [`Is ${brand.NAME} financial or legal advice?`,
      `${brand.LEGAL_NOT_ADVICE} Stock picks, scanner screens and prediction-market odds are automated, simulated or hypothetical.`],
    [`Does ${brand.NAME} sell personal data?`,
      `${brand.LEGAL_NO_SELL} Visits may be counted with analytics when those are turned on; both are disclosed on the privacy page.`],
    [contactQ,
      'Corrections, takedown requests and privacy questions go by email, X, or an issue on the repository. Security reports are in SECURITY.md.'],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Disclosures</p>
  <div class="inf__top"><h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">Every notice ${esc(brand.NAME)} makes in one place. The full contracts are
    <a href="${esc(ctx.href('/terms.html'))}">What are the ${esc(brand.NAME)} terms of use?</a> and
    <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a>; this page is the map.</p>

  <h2>${esc(indexQ)}</h2>
  <ul>
    <li>${esc(brand.DISCLAIMER)}</li>
    <li>${esc(brand.LEGAL_NOT_ADVICE)}</li>
    <li>Not a forecast, warning system, emergency alert or probability of harm. Names borrowed from DEFCON or the Doomsday Clock are commentary only.</li>
  </ul>

  <h2>${esc(financeQ)}</h2>
  <p>Stock picks, scanner screens, AI paper trades, prediction-market odds, investor and congressional trade listings are automated, simulated or hypothetical.
    ${esc(brand.NAME)} is not a broker-dealer or registered investment adviser. Past and simulated results do not predict future results.
    Trading can lose money. Prediction markets and exchanges may be restricted where you live. The site-wide disclosure on every page repeats this.</p>

  <h2>${esc(affiliateQ)}</h2>
  <p>${esc(brand.LEGAL_AFFILIATE)} There is no display-ad network while ads stay off in configuration.
    A named sponsor, if any, is labelled and has no say over any number.</p>

  <h2>${esc(privacyQ)}</h2>
  <p>Visits may be counted with Google Analytics and cookieless GoatCounter when those are turned on; both are disclosed on the privacy page.
    ${esc(brand.LEGAL_NO_SELL)} Live tool pages call third-party APIs from your browser (exchanges, maps, feeds); those providers see your IP under their own policies.</p>

  <h2>${esc(satireQ)}</h2>
  <p>Tally the mascot, the Bunker Kit, the game and similar pages are satire or jokes. Their counts can still be real arithmetic; the framing is not emergency, medical or survival advice.</p>

  <h2>${esc(peopleQ)}</h2>
  <p>Illustrated portraits of public figures are generated artwork, not photographs. Names, marks and logos belong to their owners.
    Appearance here is not endorsement either way.</p>

  <h2>${esc(licenceQ)}</h2>
  <p>${esc(brand.LICENSE_BLURB)}. Third-party data stays under its own licence, credited on the page that uses it.
    See the <a href="${esc(brand.REPO_URL)}/blob/main/LICENSE" rel="noopener">LICENSE</a> file in the repository.</p>

  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}

  <h2>${esc(contactQ)}</h2>
  <p>Corrections, takedown requests and privacy questions: ${mail}, ${x} on X, or an issue on the
    <a href="${esc(brand.REPO_URL)}" rel="noopener">repository</a>. Security reports: see
    <a href="${esc(brand.REPO_URL)}/blob/main/SECURITY.md" rel="noopener">SECURITY.md</a>.</p>

  <p><a href="${esc(ctx.href('/terms.html'))}">What are the ${esc(brand.NAME)} terms of use?</a> · <a href="${esc(ctx.href('/privacy.html'))}">What does ${esc(brand.NAME)} know about you?</a> · <a href="${esc(ctx.href('/about.html'))}">What is ${esc(brand.NAME)}?</a></p>
</section>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: explainerJsonLd(ctx, path, title, description, faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })), qTitle),
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
  // FINDABILITY #455 — dual middot head terms beside live home (p(doom) /
  // AI doomsday-clock glossaries were index-only after compare dual #453).
  return st && Number.isFinite(st.level)
    ? `<p><b>Right now:</b> ${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}, composite ${esc(Number(st.score).toFixed(1))} of 100, observed ${esc(utc(st.generated_at))}. <a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)} →</a></p>` : '';
}

export function pdoom(ctx) {
  const path = '/p-doom.html';
  // Head-term question (FINDABILITY tip #201): glossary query, not a
  // SIREN doom-probability claim. H1 must match <title>.
  const qTitle = 'What is p(doom)?';
  // Tip #312: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const originQ = 'Where does the term p(doom) come from?';
  const differQ = 'Why do p(doom) estimates differ so much?';
  const cannotQ = 'What can p(doom) not tell you?';
  const differentQ = `How is ${brand.NAME} different from p(doom)?`;
  const moreQ = 'What else should you read about p(doom)?';
  // FAQ answers restate lede / differ / SIREN-instead / voices copy only (§3.3).
  // Refuse: SIREN-as-p(doom), SIREN-as-doom-probability, forecast.
  // Visible FAQ + FAQPage from the SAME array (schema without HTML was a gap).
  // voicesFaq() supplies named-estimate Q&As; map to pairs so HTML matches schema.
  const faq = [
    [qTitle,
      'p(doom) is shorthand for "probability of doom": one person\'s estimate, as a percentage, that advanced AI leads to a catastrophic outcome for humanity. It is an opinion expressed as a number, with no agreed method behind it.'],
    [originQ,
      'It started as informal slang among people who work on and argue about AI risk, as a quick way to ask “how worried are you?” It spread into interviews and headlines once prominent researchers and executives began giving their own figures in public.'],
    [differQ,
      'Because "doom" is not defined the same way by everyone, the time frame varies, and the figure is a judgement rather than a measurement.'],
    [cannotQ,
      'It cannot be verified or recomputed, and it does not tell you what is happening today. A room of experts with very different figures can all be looking at the same facts.'],
    [differentQ,
      `${brand.NAME} does not estimate the chance of anything. It counts how much is happening in AI, hourly, and reports it as a level from 5 (quietest) to 1 (loudest). Everyone has a p(doom); nobody has a receipt.`],
    [`Does ${brand.NAME} publish a p(doom) or a doom probability?`,
      `No. ${brand.NAME} measures activity tempo — how much is happening in AI this hour — not danger and not a probability of harm. Everyone has a p(doom); nobody has a receipt.`],
    [moreQ,
      `Compare ${brand.NAME} to DEFCON, the Doomsday Clock and p(doom); read the AI doomsday clock explainer; browse AI books that argue both sides; or open the history of AI risk.`],
    ...voicesFaq().map((e) => [e.name, e.acceptedAnswer.text]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const description = `${qTitle} 28 named, sourced estimates on one chart, from 0% to 99.9%, plus a dial to set your own. An opinion as a percentage — not a recomputable measurement.`;
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Explainer</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede"><b>p(doom) is shorthand for “probability of doom”: one person’s estimate, as a percentage, that advanced AI leads to a catastrophic outcome for humanity.</b>
    It is an opinion expressed as a number. There is no agreed method for producing it and no way to check one.</p>
  ${voicesSection(ctx, ctx.state && ctx.state.level)}
  <h2>${esc(originQ)}</h2>
  <p>It started as informal slang among people who work on and argue about AI risk, as a quick way to ask “how worried are you?” It spread into interviews and headlines once prominent researchers and executives began giving their own figures in public.</p>
  <h2>${esc(differQ)}</h2>
  <ul>
    <li><b>“Doom” is not defined.</b> Some people mean human extinction, others mean permanent loss of control, others something milder. Two people can give the same number and mean different things.</li>
    <li><b>The time frame varies.</b> Ten years, this century, ever.</li>
    <li><b>It is a judgement, not a measurement.</b> Estimates given in public run from near zero to near certain, and the same person’s figure can move with the news.</li>
  </ul>
  <h2>${esc(cannotQ)}</h2>
  <p>It cannot be verified or recomputed, and it does not tell you what is happening today. A room of experts with very different figures can all be looking at the same facts.</p>
  <h2>${esc(differentQ)}</h2>
  <p>${esc(brand.NAME)} does not estimate the chance of anything. It counts how much is happening in AI, hourly, and reports it as a level from 5 (quietest) to 1 (loudest).
    Every reading ships with a receipt, and a free tool lets you <a href="${esc(ctx.href('/verify.html'))}">re-check the published record in your own browser</a>.
    The site’s line is: everyone has a p(doom), nobody has a receipt.</p>
  ${nowLine(ctx)}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>
    · <a href="${esc(ctx.href('/ai-doomsday-clock.html'))}">Is there an AI doomsday clock?</a>
    · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
  <h2>${esc(moreQ)}</h2>
  <p><a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)? →</a> ·
    <a href="${esc(ctx.href('/ai-doomsday-clock.html'))}">Is there an AI doomsday clock? →</a> ·
    <a href="${esc(ctx.href('/library.html'))}">What AI books argue both sides of the case? →</a> ·
    <a href="${esc(ctx.href('/history.html'))}">What is the history of AI risk? →</a></p>
</section>`;
  return page({
    ctx, path,
    title: `${qTitle} Hinton, Amodei, Musk, LeCun and 24 more · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: explainerJsonLd(
      ctx,
      path,
      qTitle,
      description,
      faq.map(([qAsk, a]) => ({
        '@type': 'Question',
        name: qAsk,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
      'p(doom)',
    ),
    main,
  });
}

export function aiClock(ctx) {
  const path = '/ai-doomsday-clock.html';
  // Head-term question (FINDABILITY tip #200): disambiguation query, not a
  // doom-probability claim. H1 must match <title>.
  const qTitle = 'Is there an AI doomsday clock?';
  // Tip #313: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const bulletinQ = 'What is the Bulletin’s Doomsday Clock?';
  const expertsQ = 'Where does expert opinion sit on an AI clock?';
  const specificQ = 'What are AI-specific clocks and scores?';
  const insteadQ = `What does ${brand.NAME} do instead of a doomsday clock?`;
  const whichQ = 'Which clock should you use?';
  // FAQ answers restate lede / Bulletin / experts / SIREN-instead copy only (§3.3).
  // Refuse: SIREN-as-doomsday-clock, SIREN-as-doom-probability, forecast.
  // Visible FAQ + FAQPage from the SAME array (schema without HTML was a gap).
  const faq = [
    [qTitle,
      `The Bulletin of the Atomic Scientists’ Doomsday Clock includes AI among its risks but is not AI-specific and is set once a year. AI-specific clocks are set by judgement. ${brand.NAME} publishes an hourly, verifiable count of AI activity, and plots named experts’ p(doom) estimates on one chart.`],
    [bulletinQ,
      'The Bulletin of the Atomic Scientists has published the Doomsday Clock since 1947. A board of experts decides, usually once a year, how close to “midnight” to set it. It is a considered judgement, not a calculation, and it is not updated between announcements.'],
    [expertsQ,
      `Ask the people building AI how likely it is to end in catastrophe and you get a cloud, not a number. The loudest cluster sits around 10–20%. The largest survey of AI researchers gives a median of ${SURVEY.median}%. On a clock where 100% is midnight, 15% is about 51 minutes to go.`],
    [specificQ,
      'A number of sites publish an AI risk clock, countdown or score. What they share is the method: a person, a panel or a language model decides the setting. That makes them statements of opinion, not something a reader can recompute.'],
    [insteadQ,
      `${brand.NAME} counts releases, compute and capital, attention, governance and markets from public sources every hour. It reports tempo, not danger; each reading has a receipt; and it moves hourly, not yearly.`],
    [whichQ,
      `If you want an expert body’s considered view of overall risk, read the Bulletin’s statement. If you want to know how much is happening in AI this week, and to be able to check the answer, that is what ${brand.NAME} is for.`],
    ['How close is the AI doomsday clock to midnight?',
      `There is no official AI clock. Expert estimates of AI catastrophe cluster around 10–20%; the largest researcher survey has a median of ${SURVEY.median}%. On a clock where 100% is midnight, 15% is about 51 minutes to go.`],
    ['Who sets the AI doomsday clock?',
      `Nobody officially. Sites that publish one set it by their own judgement. ${brand.NAME}’s reading is computed hourly from public data and can be re-checked in the browser.`],
    [`Is ${brand.NAME} a doomsday clock or a doom probability?`,
      `No. ${brand.NAME} measures activity tempo — how much is happening in AI this hour — not danger and not a probability of harm. The dial borrows countdown grammar only.`],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const description = `${qTitle} The Bulletin’s clock is yearly judgement, not AI-specific. Expert p(doom) clusters around 10–20%. ${brand.NAME} is an hourly AI activity count anyone can verify.`;
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Explainer</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede"><b>The Doomsday Clock is not an AI clock, though it now takes AI into account. Several AI-specific “clocks” exist, and all of them are set by judgement.
    ${esc(brand.NAME)} is the nearest thing that is counted instead: an hourly reading of AI activity that anyone can verify.</b></p>
  <p><a href="${esc(ctx.href('/p-doom.html#voices'))}"><b>Set your own AI doomsday clock →</b></a> Drag a dial, see where you sit among 28 named experts from LeCun (0.01%) to Yudkowsky (95%+), and post it.</p>
  <style>${TCLK_CSS}</style>
  ${tempoClock(ctx, { size: 260 })}
  <h2>${esc(bulletinQ)}</h2>
  <p>The Bulletin of the Atomic Scientists has published the Doomsday Clock since 1947. It is a symbol: a board of experts decides, usually once a year, how close to “midnight” to set it.
    It began as a warning about nuclear weapons and has since widened to include climate change and disruptive technologies, AI among them. It is a considered judgement, not a calculation, and it is not updated between announcements.</p>
  <h2>${esc(expertsQ)}</h2>
  <p>Ask the people building AI how likely it is to end in catastrophe and you get a cloud, not a number. The loudest cluster sits around <b>10–20%</b> (Geoffrey Hinton; Elon Musk says 10–30%; Dario Amodei 10–25%). The largest survey of AI researchers gives a median of <b>${SURVEY.median}%</b>. The tails run from Yann LeCun’s <b>under 0.01%</b> to Eliezer Yudkowsky’s <b>over 95%</b>.
    On a clock where 100% is midnight, 15% is about 51 minutes to go. <a href="${esc(ctx.href('/p-doom.html#voices'))}">See all ${VOICES.length} voices on one chart and set the clock to your own number →</a></p>
  <h2>${esc(specificQ)}</h2>
  <p>A number of sites publish an AI risk clock, countdown or score. What they share is the method: a person, a panel or a language model decides the setting. That makes them statements of opinion. Useful ones, sometimes, but not something a reader can recompute.</p>
  <h2>${esc(insteadQ)}</h2>
  <ul>
    <li><b>It counts.</b> Releases, compute and capital, attention, governance and markets, from public sources, every hour.</li>
    <li><b>It reports tempo, not danger.</b> The level runs from 5 (quietest) to 1 (loudest). Loud means a lot is happening; it does not mean things are going badly.</li>
    <li><b>It can be checked.</b> Each reading has a receipt, and a free tool <a href="${esc(ctx.href('/verify.html'))}">re-verifies the record in your browser</a>.</li>
    <li><b>It moves when the world does.</b> Hourly, not yearly.</li>
  </ul>
  ${nowLine(ctx)}
  <h2>${esc(whichQ)}</h2>
  <p>If you want an expert body’s considered view of overall risk, read the Bulletin’s statement. If you want to know how much is happening in AI this week, and to be able to check the answer, that is what this site is for. They answer different questions.</p>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>
    · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)?</a>
    · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
  <p><a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a> · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)?</a> · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a></p>
</section>`;
  return page({
    ctx, path,
    title: `${qTitle} Bulletin vs verifiable count · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: explainerJsonLd(
      ctx,
      path,
      qTitle,
      description,
      faq.map(([qAsk, a]) => ({
        '@type': 'Question',
        name: qAsk,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
      'AI doomsday clock',
    ),
    main,
  });
}

export function brandPage(ctx) {
  const path = '/brand.html';
  // Head-term title: people search “SIREN brand guide” / colours / Tally.
  const qTitle = `Where is the ${brand.NAME} brand guide?`;
  const title = `${qTitle} Name, colours, type, voice and Tally`;
  const description = `How ${brand.NAME} looks and sounds: the level colours, the typefaces, the voice rules, and Tally the duty canary in five moods to download.`;
  const levels = [...brand.LEVELS].sort((a, b) => b.level - a.level);
  const sw = (name, v, note) => `<li class="br__sw"><i style="background:${v}"></i><b>${esc(name)}</b><code>${esc(v)}</code><span>${esc(note)}</span></li>`;
  // Tip #315: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const ideaQ = `What is the ${brand.NAME} brand idea?`;
  const nameQ = `How should the ${brand.NAME} name be written?`;
  const tallyQ = 'Who is Tally, the duty canary?';
  const colourQ = 'What colours does the brand use?';
  const typeQ = 'What typefaces does the brand use?';
  const voiceQ = 'What is the brand voice?';
  const filesQ = 'Which brand files can you download?';
  // FAQ from the SAME pairs rendered in HTML (§3.3). Refuse doom-probability.
  const faq = [
    [qTitle,
      `This page. It covers the name, level colours, typefaces, voice rules, and Tally the duty canary in five moods to download. Everything here may be used with credit; the site’s text and data are ${brand.LICENSE}.`],
    [ideaQ,
      `${brand.SLOGAN} A public-information bulletin from the 1950s, about a twenty-first-century subject, that shows its arithmetic. The costume is civil defence; the content is a count.`],
    [nameQ,
      `Always ${brand.NAME}, in capitals, followed by the level: “${brand.NAME} 4”. The publication line is “${brand.PUBLICATION}”. The tagline is “${brand.TAGLINE}”.`],
    [tallyQ,
      'Tally is the duty canary — the mascot. The helmet takes the level’s colour and the face takes the level’s mood. Use the drawing for the level you are talking about; do not recolour the body.'],
    [colourQ,
      'The five level colours carry meaning and are never used as decoration for something else. Amber is the brand accent.'],
    [typeQ,
      'Inter Tight for headlines and reading; JetBrains Mono for labels, numbers, the wordmark and stamps. Both are self-hosted under the SIL Open Font License.'],
    [voiceQ,
      'Put the joke in the framing and keep the number straight. Say what was counted, by whom, and when. Say “loud” and “quiet”. Do not predict in the index or say a loud level means danger.'],
    [filesQ,
      'The mark and level badge as SVG, the current reading card and portrait card, and Tally in all five moods.'],
    [`Who is Tally?`,
      'Tally is the duty canary — the mascot. The helmet takes the level’s colour and the face takes the level’s mood. Use the drawing for the level you are talking about; do not recolour the body.'],
    [`Does a loud level mean danger?`,
      `No. Say “loud” and “quiet”: the scale measures tempo, not danger. ${brand.DISCLAIMER_SHORT}`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
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
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">One page for anyone making something with the brand: a slide, a post, a story, a sticker. Everything here may be used with credit; ${esc(brand.LICENSE)}.</p>

  <h2>${esc(ideaQ)}</h2>
  <p><b>${esc(brand.SLOGAN)}</b> A public-information bulletin from the 1950s, about a twenty-first-century subject, that shows its arithmetic.
    The costume is civil defence: hazard tape, a rubber stamp, a duty mascot. The content is a count.</p>

  <h2>${esc(nameQ)}</h2>
  <p>Always <b>${esc(brand.NAME)}</b>, in capitals, followed by the level: “${esc(brand.NAME)} 4”. The publication line is “${esc(brand.PUBLICATION)}”.
    The tagline is “${esc(brand.TAGLINE)}”</p>

  <h2>${esc(tallyQ)}</h2>
  <p>The mascot. The helmet takes the level's colour and the face takes the level's mood. Use the drawing for the level you are talking about; do not recolour the body.</p>
  <ol class="br__row">
${levels.map((l) => `    <li class="br__t" style="--lvl:var(--heat-${l.level})">${mascot({ size: 120, level: l.level })}<b>${esc(l.level)} · ${esc(l.name)}</b><span>${esc(MOODS[l.level])}</span><a href="${esc(ctx.href(`/brand/tally-${l.level}.svg`))}" download>Download SVG</a></li>`).join('\n')}
  </ol>

  <h2>${esc(colourQ)}</h2>
  <p>The five level colours carry meaning and are never used as decoration for something else. Amber is the brand accent.</p>
  <ul class="br__row">
    ${sw('Level 5', '#56b0e0', 'quietest')}${sw('Level 4', '#5fd08a', '')}${sw('Level 3 · accent', '#ffb020', 'also the brand amber')}${sw('Level 2', '#ff8b3d', '')}${sw('Level 1', '#ff5f56', 'loudest')}${sw('Ground', '#0b0c0e', 'page background')}${sw('Ink', '#e8eaee', 'text')}
  </ul>

  <h2>${esc(typeQ)}</h2>
  <div class="br__type">
    <p style="font:650 44px/1 var(--poster);text-transform:uppercase">Inter Tight, for headlines</p>
    <p style="font:400 18px/1.5 var(--sans)">Inter Tight, for reading. Sentences, explanations, anything longer than a label.</p>
    <p style="font:600 14px/1.4 var(--mono);letter-spacing:.1em;text-transform:uppercase">JetBrains Mono, for labels and numbers 52.4</p>
    <p style="font:700 20px/1.2 var(--stencil);letter-spacing:.14em;text-transform:uppercase">JetBrains Mono, for the wordmark and stamps</p>
  </div>

  <h2>${esc(voiceQ)}</h2>
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

  <h2>${esc(filesQ)}</h2>
  <ul>
    <li><a href="${esc(ctx.href('/favicon.svg'))}">The mark</a> (SVG, lit to the current level) · <a href="${esc(ctx.href('/badge.svg'))}">level badge</a></li>
    <li><a href="${esc(ctx.href('/cards/state.png'))}">Current reading card</a> · <a href="${esc(ctx.href('/cards/state-portrait.png'))}">portrait card</a></li>
    <li>Tally, all five moods: the download links above</li>
  </ul>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p><a href="${esc(ctx.href('/press.html'))}">Where is the SIREN press kit? →</a></p>
</section>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: explainerJsonLd(ctx, path, title, description, faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })), qTitle),
    main,
  });
}

export function press(ctx) {
  const path = '/press.html';
  // Head-term title: people search “SIREN press kit” / how to cite the index.
  const qTitle = `Where is the ${brand.NAME} press kit?`;
  const title = `${qTitle} Facts, images and how to cite a reading`;
  const description = `Facts, a liftable paragraph, images and a contact for anyone writing about ${brand.NAME}, the hourly AI activity index you can verify yourself.`;
  const st = ctx.state;
  const now = st && Number.isFinite(st.level)
    ? `${brand.NAME} ${st.level}, ${st.level_name}, composite ${Number(st.score).toFixed(1)} of 100, observed ${utc(st.generated_at)}` : null;
  const x = brand.X_URL ? `<a href="${esc(brand.X_URL)}" rel="noopener">${esc(brand.X_HANDLE)}</a>` : 'the project account';
  const n = Array.isArray(ctx.history) ? ctx.history.length : null;
  // Tip #316: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const sentenceQ = `What is ${brand.NAME} in one sentence?`;
  const paragraphQ = 'What paragraph can you lift?';
  const factsQ = `What are the key ${brand.NAME} facts?`;
  const citeQ = `How do I cite a ${brand.NAME} reading?`;
  const imagesQ = 'Which press images can you use?';
  const contactQ = `How do you contact ${brand.NAME} for press?`;
  const coverageQ = 'Is there press coverage yet?';
  // FAQ from the SAME pairs rendered in HTML (§3.3). Refuse doom-probability.
  const faq = [
    [qTitle,
      `This page. It has a one-sentence description, a liftable paragraph, facts, image assets, how to cite a reading, and a contact. Everything here may be quoted; the site’s text and data are ${brand.LICENSE}.`],
    [sentenceQ,
      `${brand.NAME} is an hourly index of how much is happening in AI, on a scale from 5 (quietest) to 1 (loudest), where every reading can be verified by the reader.`],
    [paragraphQ,
      `${brand.NAME} counts public AI activity across five pillars and turns it into one score from 0 to 100 and a level from 5 to 1. It measures tempo, not danger, and it does not forecast.`],
    [factsQ,
      'The index is scored hourly; the newsroom refreshes every minute. It is not a probability, a prediction, or a measure of how bad anything is. Readings are checkable in the browser.'],
    [citeQ,
      `Use the “Cite this reading” line under the verify button on How do you check a ${brand.NAME} reading yourself? (also on the home board). It links to one reading permanently, so the number in your piece does not change after you publish.`],
    [imagesQ,
      'Current reading card, portrait card, level badge, mark, Tally moods from the brand guide, and the embeddable widget.'],
    [contactQ,
      'Email or message on X. Corrections that change a number are recorded in the open on the repository.'],
    [coverageQ,
      'None yet. When there is some, it will be linked here, including the critical pieces.'],
    [`Does ${brand.NAME} publish a doom probability?`,
      `No. ${brand.DISCLAIMER_SHORT} The press kit states that plainly: the index is not a probability, a prediction, or a measure of how bad anything is.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  // FINDABILITY #469 — dual middot head terms on press Current reading CTA
  // (press was index-only after bliss dual #467).
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow">Press kit</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">Facts, a paragraph you can lift, images and a contact. Everything on this page may be quoted; the site's text and data are ${esc(brand.LICENSE)}.</p>
  <h2>${esc(sentenceQ)}</h2>
  <p><b>${esc(brand.NAME)} is an hourly index of how much is happening in AI, on a scale from 5 (quietest) to 1 (loudest), where every reading can be verified by the reader.</b></p>
  <h2>${esc(paragraphQ)}</h2>
  <p>${esc(brand.NAME)} counts public AI activity across five pillars (${brand.PILLARS.map((p) => esc(p.name.toLowerCase())).join(', ')}) and turns it into one score from 0 to 100 and a level from 5 to 1.
    It measures tempo, not danger, and it does not forecast. Each reading is published with a receipt containing its inputs and the hash of the receipt before it,
    and a button on the home page lets any visitor re-check the last twelve readings in their own browser. It is run by one person, carries no display-ad network, and labels Amazon Associate links where they appear.</p>
  <h2>${esc(factsQ)}</h2>
  <ul>
    ${now ? `<li><b>Current reading:</b> ${esc(now)}. <a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)}</a>.</li>` : ''}
    ${n ? `<li><b>Readings published:</b> ${esc(n.toLocaleString('en-US'))}, each with a receipt. <a href="${esc(ctx.href('/moves/'))}">Where are the ${esc(brand.NAME)} index moves?</a>.</li>` : ''}
    <li><b>Update cadence:</b> the index is scored hourly; the newsroom refreshes every minute.</li>
    <li><b>What it is not:</b> a probability, a prediction, or a measure of how bad anything is.</li>
    <li><b>Checkable:</b> <a href="${esc(ctx.href('/verify.html'))}">How do you check a ${esc(brand.NAME)} reading yourself?</a>, read <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>, or the <a href="${esc(brand.REPO_URL)}" rel="noopener">source</a>.</li>
    <li><b>Jobs and medicine:</b> sourced, caveated pages on <a href="${esc(ctx.href('/jobs.html'))}">Is AI taking jobs?</a> and <a href="${esc(ctx.href('/medicine.html'))}">Is AI curing anything?</a>.</li>
    <li><b>Mascot:</b> Tally, the duty canary. The helmet colour and the face follow the level.</li>
  </ul>
  <h2>${esc(citeQ)}</h2>
  <p>Use the "Cite this reading" line under the verify button on <a href="${esc(ctx.href('/verify.html'))}">How do you check a ${esc(brand.NAME)} reading yourself?</a> (also on the home board). It links to one reading permanently, so the number in your piece does not change after you publish.</p>
  <h2>${esc(imagesQ)}</h2>
  <ul>
    <li><a href="${esc(ctx.href('/cards/state.png'))}">Current reading card</a> (1200×675 PNG, redrawn every reading)</li>
    <li><a href="${esc(ctx.href('/cards/state-portrait.png'))}">Portrait card</a> for stories and vertical video</li>
    <li><a href="${esc(ctx.href('/badge.svg'))}">Level badge</a> (SVG) and <a href="${esc(ctx.href('/favicon.svg'))}">mark</a> (SVG)</li>
    <li><a href="${esc(ctx.href('/brand.html'))}">Where is the SIREN brand guide?</a> — Tally in five moods to download</li>
    <li><a href="${esc(ctx.href('/embed.html'))}">Embeddable widget</a>; the code is on <a href="${esc(ctx.href('/instruments.html'))}#embed">What instruments sit behind the ${esc(brand.NAME)} reading?</a></li>
  </ul>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <h2>${esc(contactQ)}</h2>
  <p>Email ${mail} or message ${x} on X. Corrections that change a number are recorded in the open on the <a href="${esc(brand.REPO_URL)}" rel="noopener">repository</a>.</p>
  <h2>${esc(coverageQ)}</h2>
  <p>None yet. When there is some, it will be linked here, including the critical pieces.</p>
</section>`;
  return page({
    ctx,
    path,
    title,
    description,
    jsonld: explainerJsonLd(ctx, path, title, description, faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })), qTitle),
    main,
  });
}

export function guide(ctx) {
  const bands = [...brand.LEVELS].sort((a, b) => b.level - a.level);
  const st = ctx.state;
  const now = st && Number.isFinite(st.level)
    ? `Right now it reads <b>${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}</b>.` : '';
  const path = '/guide.html';
  // Head-term question (FINDABILITY tip #199): strangers search the comparison.
  const qTitle = `How does ${brand.NAME} compare to DEFCON, the Doomsday Clock and p(doom)?`;
  // Tip #314: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const shortQ = 'What is the short version of the comparison?';
  const dialQ = `How do you read the ${brand.NAME} dial?`;
  const loudQ = 'What does a loud reading tell you, and what does it not?';
  const grammarQ = "Why borrow DEFCON's grammar at all?";
  const nextQ = 'Where should you go next?';
  // FAQ answers restate the comparison table / dial / refuse copy only (§3.3).
  // Refuse: guide-as-doom-probability, DEFCON/Doomsday brand hijack, forecast.
  // Visible FAQ + FAQPage from the SAME array (schema without HTML was a gap).
  const faq = [
    [qTitle,
      `${brand.NAME} measures how much is happening in AI — tempo, not danger — from a published formula over public data, hourly, and you can recompute it from the receipt. DEFCON is US military readiness; the Bulletin’s Doomsday Clock is a yearly symbolic judgement; p(doom) is one person’s opinion as a percentage.`],
    [shortQ,
      `${brand.NAME} is a recomputable hourly count of AI activity. DEFCON is US military readiness. The Doomsday Clock is a yearly symbolic judgement. The Pentagon Pizza Index reads shop busyness as a hint. p(doom) is one person’s opinion as a percentage.`],
    [dialQ,
      `The scale runs from 5 to 1 and 1 is the loudest. The level is the band the 0–100 composite score falls in, built from five pillars scored against the index’s own frozen record.`],
    [loudQ,
      'A loud reading tells you a lot shipped, a lot was spent, a lot was written or a lot was regulated, and the pillar breakdown says which. It does not tell you whether any of it was good or bad, and it is not a forecast of what happens next.'],
    [grammarQ,
      `Because nobody needs the scale explained twice. “Five is calm, one is not” is already in most people’s heads. The borrowing stops at the grammar: ${brand.NAME} is not a readiness level and is not issued by any government body.`],
    [`Is ${brand.NAME} a DEFCON level or the Bulletin’s Doomsday Clock?`,
      `No. ${brand.NAME} borrows the countdown grammar only. It is not a military readiness level and does not publish the Bulletin’s clock. Sites that put those phrases in an AI title for traffic are doing brand hijack; see /vs/pizzint.html.`],
    ['What is p(doom)?',
      'p(doom) is one person’s stated probability that AI ends very badly. It is an opinion expressed as a number — not a recomputable measurement. See /p-doom.html.'],
    [`Does a loud ${brand.NAME} reading mean AI is more dangerous?`,
      'No. A loud reading means a lot shipped, was spent, was written or was regulated. It does not say whether any of it was good or bad, and it is not a forecast.'],
    [nextQ,
      `Open the live index, methodology, AI explainers hub, compare and vs pages, the PizzINT contrast, alternatives, history of AI risk, or Tally’s desk.`],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const description = `${qTitle} DEFCON is military readiness, the Doomsday Clock is a board's judgement, p(doom) is an opinion, PizzINT borrows those titles, and ${brand.NAME} is an hourly count of AI activity you can recompute.`;
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow"><a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a> · How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">Five numbers people reach for when they want to know how worried to be. They measure different things, and
    only one of them is a count you can check. ${now}</p>
  <h2>${esc(shortQ)}</h2>
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
  <h2>${esc(dialQ)}</h2>
  <p>The scale runs from 5 to 1 and <b>1 is the loudest</b>. The level is the band the 0–100 composite score falls in:</p>
  <div class="inf__scroll"><table>
    <thead><tr><th>Level</th><th>Name</th><th>Score band</th><th>In a few words</th></tr></thead>
    <tbody>
${bands.map((l) => `      <tr><td><b>${esc(l.level)}</b></td><td>${esc(l.name)}</td><td>${esc(l.band[0])}–${esc(l.band[1])}</td><td>${esc(l.epithet)}</td></tr>`).join('\n')}
    </tbody>
  </table></div>
  <p>The score is built from five pillars: ${brand.PILLARS.map((p) => `<b>${esc(p.name)}</b> (${esc(p.blurb.replace(/\.$/, '').toLowerCase())})`).join(', ')}.
    Each is scored against the index's own frozen record, so a reading says how today compares with what the index has seen before.</p>
  <h2>${esc(loudQ)}</h2>
  <p>A loud reading tells you a lot shipped, a lot was spent, a lot was written or a lot was regulated, and the pillar
    breakdown says which. It does not tell you whether any of it was good or bad, and it is not a forecast of what happens next.
    That is why the home page is stamped "not a prediction".</p>
  <h2>${esc(grammarQ)}</h2>
  <p>Because nobody needs the scale explained twice. "Five is calm, one is not" is already in most people's heads. The borrowing
    stops at the grammar: ${esc(brand.NAME)} is not a readiness level and is not issued by any government body.</p>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/history.html'))}">What is the history of AI risk?</a>
    · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>
    · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)?</a>.</p>
  <h2>${esc(nextQ)}</h2>
  <p><a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)} →</a> · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a> ·
    <a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a> ·
    <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> ·
    <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does ${esc(brand.NAME)} contrast?</a> ·
    <a href="${esc(ctx.href('/vs/pizzint.html'))}">${esc(brand.NAME)} vs PizzINT: which should you use?</a> ·
    <a href="${esc(ctx.href('/alternatives.html'))}">What are AI doom index alternatives?</a> ·
    <a href="${esc(ctx.href('/history.html'))}">What is the history of AI risk?</a> · <a href="${esc(ctx.href('/desk.html'))}">What unserious counts does ${esc(brand.NAME)} keep on Tally’s desk?</a></p>
</section>`;
  return page({
    ctx, path,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    head: `<link rel="alternate" type="text/markdown" href="${esc(ctx.href('/guide.md'))}" title="Guide (markdown)">`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        url: ctx.url(path),
        description,
        isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path },
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

/** Markdown mirror of /guide.html for agents (FINDABILITY.md §3.2 #9). */
export function guideMd(ctx) {
  const bands = [...brand.LEVELS].sort((a, b) => b.level - a.level);
  const st = ctx.state;
  const now = st && Number.isFinite(st.level)
    ? `Right now it reads **${brand.NAME} ${st.level}, ${st.level_name}**.`
    : '';
  const compareRows = [
    [`${brand.NAME}`, 'How much is happening in AI: tempo, not danger', 'A published formula over public data, hourly', 'Yes, from the receipt'],
    ['DEFCON', 'The readiness posture of US armed forces, 5 (lowest) to 1 (highest)', 'US military command', 'No. The current level is not routinely made public'],
    ['Doomsday Clock', 'A symbolic judgement of how close humanity is to catastrophe', 'The Bulletin of the Atomic Scientists, usually once a year', 'No. It is a judgement, by design'],
    ['Pentagon Pizza Index', 'How busy pizza shops near the Pentagon are, read as a hint of military activity', 'A website, from shop-busyness data', 'Not from anything it publishes that we could find; its own disclaimer says not to rely on it'],
    ['p(doom)', 'One person\'s stated probability that AI ends very badly', 'Whoever is asked', 'No. It is an opinion expressed as a number'],
  ];
  const pillars = brand.PILLARS
    .map((p) => `**${p.name}** (${p.blurb.replace(/\.$/, '').toLowerCase()})`)
    .join(', ');
  return `# How does ${brand.NAME} compare to DEFCON, the Doomsday Clock and p(doom)?

> HTML: ${ctx.url('/guide.html')}

Five numbers people reach for when they want to know how worried to be. They measure different things, and only one of them is a count you can check. ${now}

## The short version

| Number | What it measures | Who sets it | Can you recompute it? |
|---|---|---|---|
${compareRows.map(([a, b, c, d]) => `| **${a}** | ${b} | ${c} | ${d} |`).join('\n')}

## How to read the SIREN dial

The scale runs from 5 to 1 and **1 is the loudest**. The level is the band the 0–100 composite score falls in:

| Level | Name | Score band | In a few words |
|---|---|---|---|
${bands.map((l) => `| **${l.level}** | ${l.name} | ${l.band[0]}–${l.band[1]} | ${l.epithet} |`).join('\n')}

The score is built from five pillars: ${pillars}. Each is scored against the index's own frozen record, so a reading says how today compares with what the index has seen before.

## What a loud reading does and does not tell you

A loud reading tells you a lot shipped, a lot was spent, a lot was written or a lot was regulated, and the pillar breakdown says which. It does not tell you whether any of it was good or bad, and it is not a forecast of what happens next. That is why the home page is stamped "not a prediction".

## Why borrow DEFCON's grammar at all

Because nobody needs the scale explained twice. "Five is calm, one is not" is already in most people's heads. The borrowing stops at the grammar: ${brand.NAME} is not a readiness level and is not issued by any government body.

## Where to go next

- [AI activity index today · AI activity level today · ${brand.NAME}](${ctx.url('/')})
- [How the ${brand.NAME} AI activity index is computed · methodology](${ctx.url('/methodology.html')}) · [methodology.md](${ctx.url('/methodology.md')})
- [Which AI doom indexes can you compare?](${ctx.url('/compare.html')}) · [Which AI indexes does ${brand.NAME} contrast?](${ctx.url('/vs.html')}) · [What are AI doom index alternatives?](${ctx.url('/alternatives.html')})
- [${brand.NAME} vs PizzINT: which should you use?](${ctx.url('/vs/pizzint.html')})
- [What is the history of AI risk?](${ctx.url('/history.html')})
- [What are the AI explainers?](${ctx.url('/guides.html')})
`;
}

/** Evergreen explainers we already publish — head-term directory, not new claims. */
export const GUIDES = Object.freeze([
  {
    path: '/guide.html',
    name: 'How does SIREN compare to DEFCON, the Doomsday Clock and p(doom)?',
    blurb: 'Activity tempo vs readiness, symbolic clocks, opinions and title hijack — what each measures.',
  },
  {
    path: '/p-doom.html',
    name: 'What is p(doom)?',
    blurb: 'Named estimates on one chart. An opinion expressed as a percentage, not a receipt.',
  },
  {
    path: '/ai-doomsday-clock.html',
    name: 'Is there an AI doomsday clock?',
    blurb: 'The Bulletin’s clock vs AI-specific countdowns vs an hourly activity count.',
  },
  {
    path: '/methodology.html',
    name: 'How the SIREN AI activity index is computed · methodology',
    blurb: 'Every formula, pillar weight, and frozen-reference rule.',
  },
  {
    path: '/history.html',
    name: 'What is the history of AI risk?',
    blurb: 'Dated, sourced field notes — Good, Asilomar, the pause letter — not a forecast.',
  },
  {
    path: '/compare.html',
    name: 'Which AI doom indexes can you compare?',
    blurb: 'Side-by-side with DoomBench, Skynet Countdown, p(doom), PizzINT and Takeoff Tracker.',
  },
  {
    path: '/vs.html',
    name: 'Which AI indexes does SIREN contrast?',
    blurb: 'Directory of honest versus pages — activity tempo, not doom claims.',
  },
  {
    path: '/alternatives.html',
    name: 'What are AI doom index alternatives?',
    blurb: 'When this index is the right substitute — and when it is not.',
  },
  {
    path: '/jobs.html',
    name: 'Is AI taking jobs?',
    blurb: 'Register counts with sources and caveats — not a jobs forecast.',
  },
  {
    path: '/medicine.html',
    name: 'Is AI curing anything?',
    blurb: 'Trials, authorisations, and caveats — not a cure claim.',
  },
  {
    path: '/free-tools.html',
    name: 'What free tools does SIREN publish?',
    blurb: 'Verify receipts, alerts, export, OpenAPI — free instruments, not a doom calculator.',
  },
  {
    path: '/verify.html',
    name: 'How do you check a SIREN reading yourself?',
    blurb: 'Re-hash the last 12 public receipts in your browser.',
  },
]);

/** Head-term /guides.html hub over evergreen explainers (FINDABILITY conquest). */
export function guides(ctx) {
  const path = '/guides.html';
  // Head-term question (FINDABILITY tip #203): H1 must match <title> stem.
  // Was “What are the AI explainers — and what each number measures” under a
  // different question-shaped title — schema/speakable pointed at the wrong H1.
  const qTitle = 'What are the AI explainers?';
  const description = `${qTitle} Plain guides on p(doom), AI doomsday clocks, DEFCON comparisons, and recomputable AI activity indexes. ${brand.NAME} counts tempo — it does not publish a doom probability.`;
  // Tip #319: “Also” H2 is question-shaped and mirrored in FAQ (§3.3).
  const alsoQ = 'What else sits next to these AI explainers?';
  // FAQ from the SAME pairs rendered in HTML (FINDABILITY schema rule — no invented Q&A).
  // Refuse: SIREN-as-doom-probability / stuffing synonym doorways / forecast.
  const faqPairs = [
    [
      qTitle,
      `${brand.NAME} publishes this hub as a directory of evergreen explainers: p(doom), AI doomsday clocks, DEFCON comparisons, methodology, sourced AI-risk history, and versus pages for DoomBench, Skynet Countdown, p(doom) clocks, PizzINT and Takeoff Tracker. None of them is a doom probability for ${brand.NAME} itself.`,
    ],
    [
      'Where are the AI doom and p(doom) explainers?',
      `On this page and the links below: /p-doom.html, /ai-doomsday-clock.html, /guide.html, /compare.html, /vs.html, and /history.html. They explain vocabulary other sites use; they do not turn the ${brand.NAME} reading into a chance of harm.`,
    ],
    [
      `Does ${brand.NAME} publish a doom probability?`,
      `No. ${brand.NAME} publishes an hourly AI activity count with a receipt. The explainer pages describe vocabulary other sites use; they do not turn the ${brand.NAME} reading into a chance of harm.`,
    ],
    [
      alsoQ,
      `The live AI activity index, the markdown mirror of this hub, the history of AI risk, and the both-sides library.`,
    ],
  ];
  const rows = GUIDES.map((g) => `<li style="padding:12px 0;border-bottom:1px solid var(--rule)">
  <a href="${esc(ctx.href(g.path))}" style="font:600 var(--t-base)/1.35 var(--sans);color:var(--ink);text-decoration:none">${esc(g.name)}</a>
  <p style="margin:4px 0 0;font:400 var(--t-sm)/1.5 var(--sans);color:var(--ink-dim)">${esc(g.blurb)}</p>
</li>`).join('');
  const faqHtml = faqPairs.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<section class="inf">
  <p class="eyebrow"><a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a> · What are the AI explainers?</p>
  <div class="inf__top">${mascot({ size: 76, level: level(ctx) })}<h1 class="bp__h1">${esc(qTitle)}</h1></div>
  <p class="lede">Search often lands on a doom score, a countdown, or a DEFCON-shaped novelty page.
    These pages answer the vocabulary questions without inventing a probability of harm.
    ${esc(brand.NAME)} stays an hourly activity count with a receipt.</p>
  <ol style="list-style:none;padding:0;margin:16px 0 0">${rows}</ol>
  <h2>${esc(alsoQ)}</h2>
  <p><a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)} →</a>
     · <a href="${esc(ctx.href('/guides.md'))}">What are the AI explainers?</a>
     · <a href="${esc(ctx.href('/history.html'))}">What is the history of AI risk? →</a>
     · <a href="${esc(ctx.href('/library.html'))}">What AI books argue both sides of the case? →</a></p>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p>Search-shaped sibling:
    <a href="${esc(ctx.href('/guide.html'))}">How does ${esc(brand.NAME)} compare to DEFCON, the Doomsday Clock and p(doom)?</a>
    · <a href="${esc(ctx.href('/p-doom.html'))}">What is p(doom)?</a>
    · <a href="${esc(ctx.href('/ai-doomsday-clock.html'))}">Is there an AI doomsday clock?</a>
    · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
</section>`;
  return page({
    ctx,
    path,
    title: `${qTitle} p(doom), clocks, doom indexes · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    head: `<link rel="alternate" type="text/markdown" href="${esc(ctx.href('/guides.md'))}" title="AI explainers (markdown)">`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        url: ctx.url(path),
        description,
        isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: qTitle,
        numberOfItems: GUIDES.length,
        itemListElement: GUIDES.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: g.name,
          url: ctx.url(g.path),
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqPairs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}

/** Markdown mirror of /guides.html for agents (FINDABILITY.md §2.1). */
export function guidesMd(ctx) {
  const qTitle = 'What are the AI explainers?';
  const lines = GUIDES.map((g) => `- [${g.name}](${ctx.url(g.path)}): ${g.blurb}`).join('\n');
  return `# ${qTitle}

> HTML: ${ctx.url('/guides.html')}

Search often lands on a doom score, a countdown, or a DEFCON-shaped novelty page.
These pages answer the vocabulary questions without inventing a probability of harm.
${brand.NAME} stays an hourly activity count with a receipt.

## Guides

${lines}

## What else sits next to these AI explainers?

- [AI activity index today · AI activity level today · ${brand.NAME}](${ctx.url('/')})
- [guide.md](${ctx.url('/guide.md')}) · [methodology.md](${ctx.url('/methodology.md')})
- [What is the history of AI risk?](${ctx.url('/history.html')})
`;
}
