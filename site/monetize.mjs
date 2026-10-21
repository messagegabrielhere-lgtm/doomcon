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
  // Subscribers pick what they get with two Buttondown tags. The sender
  // (collector/newsletter.mjs) mails the daily brief to `daily` and level /
  // breaking alerts to `alerts`. Until a provider is set, the homepage box
  // still works: it offers the same two emails through Blogtrottr, which
  // mails the public RSS feeds (/feed-daily.xml, /feed-level.xml).
  newsletter: {
    provider: null, username: null, url: null,
    pitch: 'The daily brief: one email a day with the closing reading and the stories that moved it. Alerts: one email the hour the level changes, and on the biggest breaking stories. Free.',
    tags: { daily: 'daily', alerts: 'alerts' },
  },

  // Visitor analytics.
  //   goatcounter: site code before .goatcounter.com. Cookieless; null = off.
  //   gtag: Google Analytics 4 measurement ID (G-…). null = off. Loads on
  //   every stamped page via site/sitebar.mjs and is disclosed on /privacy.
  analytics: { goatcounter: 'messagegabriel', gtag: 'G-93SEVYQXY3' },

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
  // Paste the full link Polymarket's share button gives you, or just its
  // query (e.g. 'r=yourname'); everything after '?' is kept and added to
  // every polymarket.com link on the site.
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

const SITE_NAME = 'SIREN';
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

/**
 * The homepage signup box. With Buttondown set up it is a real form whose two
 * checkboxes become subscriber tags. Without a provider it is still honest and
 * still works: two buttons that open Blogtrottr with SIREN's public feeds
 * pre-filled, so the address goes to Blogtrottr and never to SIREN.
 */
export function signupBox({ privacyHref, dailyFeedUrl, levelFeedUrl, alertsHref, id = 'nl', heading = 'GET THE SIREN BRIEF BY EMAIL' } = {}) {
  const n = MONETIZE.newsletter;
  const t = n.tags || { daily: 'daily', alerts: 'alerts' };
  const head = `<p class="mz-k">${esc(heading)}</p><p class="mz-pitch">${esc(n.pitch)}</p>`;
  if (on.newsletter() && n.provider === 'buttondown') {
    return `<form class="mz-nl mz-nl--big" id="${esc(id)}" action="https://buttondown.com/api/emails/embed-subscribe/${esc(n.username)}" method="post" target="_blank">
  ${head}
  <label class="vh" for="${esc(id)}-email">Your email address</label>
  <div class="mz-row"><input id="${esc(id)}-email" type="email" name="email" placeholder="you@example.com" required autocomplete="email"><button type="submit">SUBSCRIBE FREE →</button></div>
  <fieldset class="mz-tags"><legend class="vh">What to send</legend>
    <label><input type="checkbox" name="tag" value="${esc(t.daily)}" checked> Daily brief</label>
    <label><input type="checkbox" name="tag" value="${esc(t.alerts)}" checked> Level &amp; breaking alerts</label>
  </fieldset>
  <p class="mz-note">Sent by Buttondown. Unsubscribe in one click from any email. <a href="${esc(privacyHref)}">Privacy</a>.</p>
</form>`;
  }
  if (on.newsletter()) {
    return `<div class="mz-nl mz-nl--big" id="${esc(id)}">${head}<div class="mz-row"><a class="mz-btn" href="${esc(n.url)}" rel="noopener">SUBSCRIBE FREE →</a></div><p class="mz-note">Unsubscribe in one click from any email. <a href="${esc(privacyHref)}">Privacy</a>.</p></div>`;
  }
  const bt = (u) => `https://blogtrottr.com/?url=${encodeURIComponent(u)}`;
  return `<div class="mz-nl mz-nl--big" id="${esc(id)}">${head}
  <div class="mz-row"><a class="mz-btn" href="${esc(bt(dailyFeedUrl))}" rel="noopener" target="_blank">EMAIL ME THE DAILY BRIEF →</a><a class="mz-btn mz-btn--ghost" href="${esc(bt(levelFeedUrl))}" rel="noopener" target="_blank">EMAIL ME LEVEL ALERTS</a></div>
  <p class="mz-note">Delivered by Blogtrottr from ${esc(SITE_NAME)}'s public feeds: your address goes to them, not to ${esc(SITE_NAME)}. Unsubscribe from any email. <a href="${esc(alertsHref)}">Other ways: RSS, Slack, in-tab</a> · <a href="${esc(privacyHref)}">Privacy</a>.</p>
</div>`;
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
  // CONSENT (Google Consent Mode v2). Advertising storage is always denied.
  // Analytics cookies wait for a yes in the EEA, UK and Switzerland, and
  // stay off for anyone who said no or sends Global Privacy Control.
  (function(){var c=null;try{c=localStorage.getItem('siren:consent')}catch(e){}
  var gpc=navigator.globalPrivacyControl===true;
  var ads={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  gtag('consent','default',Object.assign({analytics_storage:'denied',wait_for_update:500,region:${JSON.stringify(CONSENT_REGIONS)}},ads));
  gtag('consent','default',Object.assign({analytics_storage:(gpc||c==='denied')?'denied':'granted'},ads));
  if(c==='granted'&&!gpc)gtag('consent','update',{analytics_storage:'granted'});
  if(c==='denied'||gpc)gtag('consent','update',{analytics_storage:'denied'});})();
  gtag('set','ads_data_redaction',true);
  gtag('js', new Date());
  gtag('config', '${safe}', { allow_google_signals: false, allow_ad_personalization_signals: false });
</script>`;
}

// EEA + UK + Switzerland: analytics cookies need consent first.
export const CONSENT_REGIONS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];

// The consent banner: shown to visitors whose clock is in Europe (the same
// regions the default above holds back), until they choose. Any page can
// reopen it with an element carrying data-consent-open.
export const CONSENT_JS = `(function(){var K='siren:consent';function get(){try{return localStorage.getItem(K)}catch(e){return null}}
function set(v){try{localStorage.setItem(K,v)}catch(e){}if(window.gtag)gtag('consent','update',{analytics_storage:v});close()}
var el=null;function close(){if(el&&el.parentNode)el.parentNode.removeChild(el);el=null}
function show(){if(el)return;el=document.createElement('div');el.id='siren-consent';el.setAttribute('role','dialog');el.setAttribute('aria-label','Privacy choices');
el.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:10001;max-width:560px;margin:0 auto;padding:14px 16px;border-radius:10px;background:#0B0F16;color:#E6EAF0;border:1px solid #56B0E0;box-shadow:0 10px 30px rgba(0,0,0,.55);font:14px/1.45 system-ui,sans-serif';
el.innerHTML='<b>Analytics cookies?</b> SIREN uses Google Analytics to see which pages get read. It sets cookies only if you allow it. No ads, no selling data. <a href="'+(window.SIREN_BASE||'')+'/privacy.html" style="color:#56B0E0">Privacy</a><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" data-c="granted" style="min-height:40px;padding:0 14px;border:0;border-radius:6px;background:#56B0E0;color:#06070b;font-weight:700;cursor:pointer">Allow analytics</button><button type="button" data-c="denied" style="min-height:40px;padding:0 14px;border:1px solid #475569;border-radius:6px;background:transparent;color:#E6EAF0;font-weight:700;cursor:pointer">No thanks</button></div>';
el.addEventListener('click',function(e){var v=e.target&&e.target.getAttribute&&e.target.getAttribute('data-c');if(v)set(v)});document.body.appendChild(el)}document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-consent-open]');if(t){e.preventDefault();show()}});
var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
var eu=/^Europe\\//.test(tz)||/^(Atlantic\\/(Reykjavik|Canary|Madeira|Azores|Faroe)|Arctic\\/Longyearbyen)$/.test(tz);
if(!get()&&eu&&navigator.globalPrivacyControl!==true){if(document.body)show();else document.addEventListener('DOMContentLoaded',show)}})();`;

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
.mz-nl--big{max-width:none;gap:10px}.mz-nl .mz-k{margin:0;font:700 13px/1.2 "IBM Plex Mono",monospace;letter-spacing:.14em;color:var(--lv,#4ADE80)}
.mz-nl .mz-pitch{margin:0;font:400 15px/1.5 "IBM Plex Sans",system-ui,sans-serif;color:#D7DCE3;max-width:70ch}
.mz-nl .mz-row{display:flex;gap:8px;flex-wrap:wrap}.mz-nl .mz-row input{flex:1 1 240px;min-height:48px}
.mz-nl--big button,.mz-nl--big .mz-btn{min-height:48px;padding:0 18px;display:inline-flex;align-items:center;background:var(--ui,#E8ECF2);color:#05070B}
.mz-nl .mz-btn--ghost{background:transparent;color:#fff;border:2px solid #3A4558}
.mz-tags{border:0;margin:0;padding:0;display:flex;gap:16px;flex-wrap:wrap}.mz-tags label{font:500 14px/1.4 "IBM Plex Sans",sans-serif;letter-spacing:0;text-transform:none;color:#D7DCE3;display:inline-flex;gap:6px;align-items:center}
.mz-tags input{accent-color:var(--ui,#E8ECF2);width:18px;height:18px}
.vh{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
</style>`;

/** Add the Polymarket referral (if set) and UTM tags to any polymarket.com URL. */
export function polymarketUrl(url, medium = 'site') {
  if (!/^https:\/\/(www\.)?polymarket\.com\b/.test(String(url))) return url;
  const raw = MONETIZE.polymarket && MONETIZE.polymarket.ref ? String(MONETIZE.polymarket.ref) : '';
  const ref = raw.includes('?') ? raw.split('?')[1] : raw.replace(/^[?&]/, '');
  const u = new URL(url);
  if (!u.searchParams.has('utm_source')) { u.searchParams.set('utm_source', 'siren'); u.searchParams.set('utm_medium', medium); }
  for (const [k, v] of new URLSearchParams(ref)) if (!/^utm_/.test(k)) u.searchParams.set(k, v);
  return u.toString();
}
export const polymarketHasRef = () => !!(MONETIZE.polymarket && MONETIZE.polymarket.ref);
