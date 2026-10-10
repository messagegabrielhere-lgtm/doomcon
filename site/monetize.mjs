// site/monetize.mjs — every way the site earns, in one file, all OFF until an
// ID is filled in. Nothing here loads a script, shows a slot or changes a link
// while its value is null, so the site stays exactly as fast and clean as it
// is now. docs/MONETIZE.md says where to sign up and what to paste.
//
// SEO RULES THE CODE FOLLOWS (so earning never costs ranking):
//   - every paid link carries rel="sponsored noopener" (Google's own rule)
//   - no ad above the fold, no pop-ups, no interstitials
//   - ad scripts load async after the page, into a box with reserved height,
//     so they cannot shift the layout (Core Web Vitals CLS)
//   - one ad per page at most, and none on the homepage
//   - sponsor and affiliate lines are plain text links: crawlable, labelled

export const MONETIZE = {
  // Email newsletter. provider 'buttondown' + your Buttondown username, or
  // provider 'beehiiv' + your publication's subscribe URL.
  newsletter: { provider: null, username: null, url: null, pitch: 'One email when the level moves, and a short weekly reading. No spam.' },

  // Visitor analytics.
  //   goatcounter: site code before .goatcounter.com. Cookieless; null = off.
  //   gtag: Google Analytics 4 measurement ID (G-…). null = off. Loads on
  //   every stamped page via site/sitebar.mjs and is disclosed on /privacy.
  analytics: { goatcounter: 'messagegabriel', gtag: 'G-KHYRHKZ3CP' },

  // Tip jar: your Buy Me a Coffee or Ko-fi page URL.
  tips: { url: 'https://ko-fi.com/I0R828E7LP', label: 'Support SIREN on Ko-fi' },

  // Privacy-friendly ads. provider 'ethicalads' + publisher id, or
  // provider 'carbon' + serve code and placement. Never AdSense: it needs a
  // consent banner and slows every page.
  ads: { provider: null, publisher: null, serve: null, placement: null },

  // One sponsor at a time. Shown on every page and on the homepage strip.
  sponsor: { name: null, url: null, line: null, until: null },

  // Polymarket links on the markets strip. `ref` is your referral query string
  // from polymarket.com (Profile → Referrals), e.g. 'via=yourname'. null = plain
  // links with UTM tags only.
  polymarket: { ref: null },

  // Paid upgrades shown in the Bunker Kit. Plain links until you add your
  // affiliate link in `aff`; then the affiliate link is used, marked sponsored.
  affiliates: [
    { id: 'incogni', name: 'Incogni', url: 'https://incogni.com/', aff: null, does: 'Asks data brokers to delete your personal data, on repeat', doom: 'Get your data out of the training set while it still matters.' },
    { id: 'deleteme', name: 'DeleteMe', url: 'https://joindeleteme.com/', aff: null, does: 'Removes your listings from people-search sites', doom: 'Unlist yourself from the internet’s phone book.' },
    { id: 'protonvpn', name: 'Proton VPN', url: 'https://protonvpn.com/', aff: null, does: 'Swiss no-logs VPN with a free tier', doom: 'Leave fewer tracks. Swiss neutrality, but for packets.' },
    { id: 'protonmail', name: 'Proton Mail', url: 'https://proton.me/mail', aff: null, does: 'End-to-end encrypted email', doom: 'Email nobody trains on.' },
    { id: 'nordvpn', name: 'NordVPN', url: 'https://nordvpn.com/', aff: null, does: 'Fast VPN with threat protection', doom: 'A tunnel the crawlers can’t see into.' },
    { id: '1password', name: '1Password', url: 'https://1password.com/', aff: null, does: 'Password manager with passkeys and breach alerts', doom: 'One vault. Not one password.' },
    { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/', aff: null, does: 'AI voice generation and dubbing', doom: 'Know your enemy: hear how good the fake voices are.' },
    { id: 'descript', name: 'Descript', url: 'https://www.descript.com/', aff: null, does: 'Edit video and podcasts by editing the transcript', doom: 'For the resistance’s video channel.' },
  ],
};

export const on = {
  newsletter: () => !!((MONETIZE.newsletter.provider === 'buttondown' && MONETIZE.newsletter.username)
    || (MONETIZE.newsletter.provider === 'beehiiv' && MONETIZE.newsletter.url)),
  tips: () => !!MONETIZE.tips.url,
  ads: () => !!((MONETIZE.ads.provider === 'ethicalads' && MONETIZE.ads.publisher)
    || (MONETIZE.ads.provider === 'carbon' && MONETIZE.ads.serve && MONETIZE.ads.placement)),
  sponsor: () => {
    const s = MONETIZE.sponsor;
    if (!s.name || !s.url) return false;
    return !s.until || Date.parse(s.until) > Date.now();
  },
};

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "Supported by X" — or, with no sponsor, a quiet house line that sells the slot. */
export function sponsorLine(sponsorHref, { house = true } = {}) {
  const s = MONETIZE.sponsor;
  if (on.sponsor()) {
    return `<span class="mz-sp">Supported by <a href="${esc(s.url)}" rel="sponsored noopener">${esc(s.name)}</a>${s.line ? ` · ${esc(s.line)}` : ''} <a class="mz-what" href="${esc(sponsorHref)}">(sponsor)</a></span>`;
  }
  return house ? `<span class="mz-sp">This spot is open: <a href="${esc(sponsorHref)}">sponsor SIREN</a></span>` : '';
}

/** The subscribe box, or '' when no newsletter is set up. */
export function newsletterBox(privacyHref) {
  if (!on.newsletter()) return '';
  const n = MONETIZE.newsletter;
  const note = `<p class="mz-note">${esc(n.pitch)} Unsubscribe any time. <a href="${esc(privacyHref)}">Privacy</a>.</p>`;
  if (n.provider === 'buttondown') {
    return `<form class="mz-nl" action="https://buttondown.com/api/emails/embed-subscribe/${esc(n.username)}" method="post" target="_blank">
  <label for="mz-email">Get the level by email</label>
  <div><input id="mz-email" type="email" name="email" placeholder="you@example.com" required autocomplete="email"><button type="submit">SUBSCRIBE</button></div>
  ${note}
</form>`;
  }
  return `<div class="mz-nl"><label>Get the level by email</label><div><a class="mz-btn" href="${esc(n.url)}" rel="noopener">SUBSCRIBE FREE →</a></div>${note}</div>`;
}

export function tipLink() {
  return on.tips() ? `<a class="mz-tip" href="${esc(MONETIZE.tips.url)}" rel="noopener">☕ ${esc(MONETIZE.tips.label)}</a>` : '';
}

/** Google Analytics gtag snippet for <head>, or '' when analytics.gtag is off. */
export function gtagHead() {
  const id = MONETIZE.analytics && MONETIZE.analytics.gtag;
  if (!id || !/^G-[A-Z0-9]+$/i.test(String(id))) return '';
  const safe = esc(id);
  return `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${safe}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${safe}');
</script>`;
}

/** One ad, async, in a box of reserved height. '' when ads are off. */
export function adSlot() {
  if (!on.ads()) return '';
  const a = MONETIZE.ads;
  const box = 'margin:28px auto;max-width:72ch;min-height:140px;display:flex;justify-content:center;align-items:center';
  if (a.provider === 'ethicalads') {
    return `<aside class="mz-ad" aria-label="Advertisement" style="${box}"><div data-ea-publisher="${esc(a.publisher)}" data-ea-type="image" data-ea-style="stickybox-off"></div><script async src="https://media.ethicalads.io/media/client/ethicalads.min.js"></script></aside>`;
  }
  return `<aside class="mz-ad" aria-label="Advertisement" style="${box}"><script async type="text/javascript" src="https://cdn.carbonads.com/carbon.js?serve=${esc(a.serve)}&amp;placement=${esc(a.placement)}" id="_carbon_ads_js"></script></aside>`;
}

/** Pages that may carry an ad: long reading pages, never the homepage or tools mid-use. */
export const AD_PAGES = new Set([
  'news.html', 'race.html', 'leaders.html', 'history.html', 'methodology.html', 'digest.html',
  'library.html', 'bunker-kit.html', 'prepper-checklist.html', 'elon.html', 'jobs.html', 'medicine.html',
  'balance.html', 'p-doom.html', 'ai-doomsday-clock.html', 'guide.html', 'watts.html', 'bliss.html',
]);

/** Shared CSS for the bits above; self-contained so any page can carry it. */
export const MZ_CSS = `<style>
.mz-sp{font:500 12px/1.5 "IBM Plex Mono",ui-monospace,monospace;color:#AEB7C3}.mz-sp a{color:#4ADE80}.mz-sp .mz-what{color:#6B7686;text-decoration:none}
.mz-nl{display:grid;gap:8px;max-width:520px}.mz-nl label{font:600 12px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;color:#4ADE80;text-transform:uppercase}
.mz-nl div{display:flex;gap:8px;flex-wrap:wrap}.mz-nl input{flex:1 1 220px;padding:11px 12px;background:#000;color:#fff;border:1px solid #232C3B;border-radius:4px;font:400 15px/1 "IBM Plex Sans",sans-serif}
.mz-nl button,.mz-btn{padding:11px 16px;border:0;border-radius:4px;background:#4ADE80;color:#000;font:700 13px/1 "IBM Plex Mono",monospace;letter-spacing:.08em;cursor:pointer;text-decoration:none;display:inline-block}
.mz-note{margin:0;font-size:12.5px;color:#AEB7C3}.mz-note a{color:inherit}
.mz-tip{color:#FFB020}
</style>`;
