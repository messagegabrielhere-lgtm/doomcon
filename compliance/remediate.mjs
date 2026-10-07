// compliance/remediate.mjs — what to do about each finding.
//
// STEPS[ruleId]   an ordered playbook, printed with every finding and written
//                 to compliance/REMEDIATION.md by `audit.mjs --report`.
// AUTOFIX[ruleId] (file, ctx) => [{ path, text }] | null
//                 A safe, mechanical fix applied by `audit.mjs --fix`. Returns
//                 the files to write, or null when the fix needs a human (and
//                 the playbook explains why). Only ever touches tracked repo
//                 files, never a build directory.
//
// Fixes are deliberately conservative: they add notices, swap a font link for
// one that already exists locally, or create a page from a template with
// placeholders marked TODO. Anything that removes behaviour (a tracker, a
// mailer, a checkout) is left to a person, because deleting code silently is
// how a site breaks at 2am.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const FINANCE_NOTE =
  '<p class="legal-note" style="margin:24px auto;max-width:72ch;padding:0 16px;font:400 12px/1.5 system-ui,sans-serif;opacity:.75">' +
  'For information and entertainment only. Not investment, financial or trading advice, and not a recommendation to buy or sell any security or crypto asset. ' +
  'Signals and simulated results do not predict future returns. Do your own research or talk to a licensed professional. ' +
  '<a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>';

export const AFFILIATE_NOTE =
  '<p class="legal-note" style="margin:24px auto;max-width:72ch;padding:0 16px;font:400 12px/1.5 system-ui,sans-serif;opacity:.75">' +
  'Some links on this page are affiliate links. As an Amazon Associate we earn from qualifying purchases, at no extra cost to you. ' +
  '<a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p>';

const PRIVACY_LINK = ' <a href="/privacy.html" class="legal-note">How we use your email (privacy)</a>';

const DMCA_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Copyright / DMCA</title></head>
<body style="max-width:72ch;margin:40px auto;padding:0 16px;font:400 16px/1.6 system-ui,sans-serif">
<h1>Copyright and DMCA notices</h1>
<p>We respect copyright. If you believe material on this site infringes your copyright, send a notice to our designated agent.</p>
<h2>Designated agent</h2>
<p><!-- TODO: register at https://dmca.copyright.gov ($6, renew every 3 years) and copy the details here exactly as filed. -->
Name: TODO<br>Address: TODO (a PO box or registered agent address is fine)<br>Email: TODO</p>
<h2>What to include</h2>
<ol>
<li>Your signature (typed is fine) and contact details.</li>
<li>The copyrighted work you say is infringed.</li>
<li>The URL of the material on this site.</li>
<li>A statement that you have a good-faith belief the use is not authorised.</li>
<li>A statement, under penalty of perjury, that the notice is accurate and you are the owner or authorised to act for them.</li>
</ol>
<h2>Counter-notices and repeat infringers</h2>
<p>If your material was removed by mistake you may send a counter-notice to the same agent. Accounts that repeatedly infringe are terminated.</p>
</body></html>
`;

/** Insert html just before </body>, or at the end if there is none. */
function beforeBodyEnd(text, html) {
  const i = text.toLowerCase().lastIndexOf('</body>');
  return i === -1 ? text + '\n' + html + '\n' : text.slice(0, i) + html + '\n' + text.slice(i);
}

const isHtml = (p) => /\.html?$/i.test(p);

export const AUTOFIX = {
  'fonts-third-party': (file, { root }) => {
    if (!isHtml(file.path)) return null; // templates: change the constant by hand (see steps)
    const local = path.join(root, 'assets', 'fonts', 'fonts.css');
    if (!existsSync(local)) return null;
    const have = readFileSync(local, 'utf8');
    const link = /<link[^>]+href=["']https:\/\/fonts\.googleapis\.com\/css2\?([^"']+)["'][^>]*>/i.exec(file.text);
    if (!link) return null;
    const families = [...link[1].matchAll(/family=([^:&]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, ' ')));
    const missing = families.filter((f) => !have.includes(`'${f}'`));
    if (missing.length) return null; // would silently fall back; a person must add these families first
    const text = file.text
      .replace(/<link[^>]+rel=["']preconnect["'][^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*\n?/gi, '')
      .replace(link[0], '<link rel="stylesheet" href="fonts/fonts.css">');
    return [{ path: file.path, text }];
  },

  'finance-disclaimer': (file) =>
    isHtml(file.path) ? [{ path: file.path, text: beforeBodyEnd(file.text, FINANCE_NOTE) }] : null,

  'affiliate-disclosure': (file) =>
    isHtml(file.path) ? [{ path: file.path, text: beforeBodyEnd(file.text, AFFILIATE_NOTE) }] : null,

  'email-capture': (file) => {
    if (!isHtml(file.path)) return null;
    const re = /(<form\b[\s\S]*?(type|name)=["']email["'][\s\S]*?<\/form>)/i;
    if (!re.test(file.text)) return null;
    return [{ path: file.path, text: file.text.replace(re, `$1${PRIVACY_LINK}`) }];
  },

  'dmca-agent': (file) => {
    const target = path.posix.join(path.posix.dirname(file.path), 'dmca.html');
    return [{ path: target, text: DMCA_PAGE, create: true }];
  },
};

export const STEPS = {
  'fonts-third-party': [
    'Install the families locally: npm i @fontsource/<family> (one per family, e.g. @fontsource/inter-tight).',
    'Copy the latin woff2 weights you use into assets/fonts/ and add an @font-face block per weight to assets/fonts/fonts.css (font-display: swap).',
    'Make the build copy assets/fonts/ to /fonts/ and point every page at /fonts/fonts.css; delete the fonts.googleapis.com and fonts.gstatic.com preconnects.',
    'Update the privacy page so it no longer lists Google Fonts.',
    'Run `node compliance/audit.mjs --fix` afterwards: it rewrites standalone .html pages automatically once fonts.css has the families.',
  ],
  'session-replay': [
    'Remove the replay script unless you have a concrete need for it.',
    'If you keep it: load it only after an explicit opt-in (not a pre-ticked box), mask every input (maskAllInputs / data-hj-suppress), and exclude pages with forms.',
    'Disclose the vendor and what it records on the privacy page.',
    'Set the shortest data retention the vendor offers.',
  ],
  'tracking-pixel': [
    'Prefer cookieless, IP-truncating analytics (e.g. Plausible, GoatCounter, Cloudflare Web Analytics).',
    'Otherwise, load the pixel only after consent and add a "Do Not Sell or Share" link for California visitors.',
    'List every third party on the privacy page.',
  ],
  'privacy-claims': [
    'Decide which is true: remove the third party from the code, or correct the privacy page.',
    'Re-run the audit; this finding clears when the claim and the code agree.',
  ],
  'signup-no-age-gate': [
    'Ask for birth year (or date) with no hint of the cutoff, before collecting anything else.',
    'If under 13: do not create the account, do not store the email, show a neutral message, and set a short-lived flag so the user cannot just go back and change the year.',
    'State in the privacy page that the service is not for children under 13.',
    'If the site is aimed at children at all, stop and get a lawyer: COPPA then requires verifiable parental consent.',
  ],
  'email-capture': [
    'Put a link to the privacy page directly beside the email field (`--fix` does this for .html forms).',
    'Say in one line what you will send and how often.',
    'Store the date, source page and wording of consent with each address.',
  ],
  'can-spam': [
    'Add a visible unsubscribe link to every marketing email that works without logging in, and honour it within 10 business days (do it instantly).',
    'Send the List-Unsubscribe and List-Unsubscribe-Post: List-Unsubscribe=One-Click headers (Gmail and Yahoo require them for bulk senders).',
    'Include a valid physical postal address: a PO box or a commercial registered-agent address keeps your home address private.',
    'Use an honest From name and a subject line that matches the content.',
  ],
  'auto-renewal': [
    'Directly next to the subscribe button, state: the price, the billing period, that it renews automatically until cancelled, and how to cancel.',
    'Add an unticked checkbox the customer must tick to accept the renewal terms.',
    'Email a confirmation with the same terms and a cancellation link.',
    'Offer online cancellation that takes no more steps than signing up did (California and FTC "click to cancel" rules).',
  ],
  'dmca-agent': [
    'Register a designated agent at https://dmca.copyright.gov ($6; renew every 3 years). A PO box or registered-agent address is allowed.',
    'Publish a DMCA page with the agent details exactly as filed (`--fix` creates dmca.html with TODO placeholders).',
    'Link it from the footer and from the upload form.',
    'Keep a log of notices and takedowns, and terminate repeat infringers.',
  ],
  'affiliate-disclosure': [
    'Place a plain-language disclosure near the first affiliate link on the page, not only on the privacy page (`--fix` appends one to .html pages).',
    'For Amazon, use the exact sentence: "As an Amazon Associate I earn from qualifying purchases."',
    'In social posts with affiliate links, put #ad or "affiliate link" at the start of the post.',
  ],
  'finance-disclaimer': [
    'Show a "Not investment advice" notice on every page that ranks, signals or simulates trades (`--fix` appends one to .html pages).',
    'Avoid personalised recommendations ("you should buy X"); keep the content impersonal and published to everyone alike.',
    'Never take payment for signals without talking to a securities lawyer first.',
  ],
  'secret-in-repo': [
    'Revoke the key at the provider NOW. Assume it has been copied: public repos are scraped for keys within minutes.',
    'Create a new key and store it as a GitHub Actions secret; read it from process.env.',
    'Delete the key from the file. Then purge it from history: git filter-repo --replace-text <file-with-the-key> and force-push.',
    'Check the provider\'s usage log for charges you did not make.',
  ],
  'owner-pii': [
    'Remove the term from the file.',
    'Purge it from git history: pip install git-filter-repo; git filter-repo --replace-text replacements.txt; git push --force.',
    'GitHub keeps cached views of old commits: ask GitHub Support to purge cached views if the term was sensitive.',
    'Keep it in the COMPLIANCE_PII_TERMS secret so it can never come back.',
  ],
  'x-automation': [
    'Delete the call. Automated likes, follows, reposts, DMs and bookmarks are prohibited for automated accounts.',
    'Do those by hand from the human account if you want them.',
  ],
  'clip-rights': [
    'Set "rights": "own" for channels you own, or "licensed" for an approved clipping campaign (keep the permission email).',
    'Remove any channel you have no written permission for.',
  ],
  'cookie-consent': [
    'If the cookie only stores a preference (theme, tab), move it to localStorage: no consent needed.',
    'If it is for tracking or ads, add a consent banner with an equally easy "Reject" button and set the cookie only after "Accept".',
  ],
  'privacy-page': [
    'Publish /privacy.html: what you collect, why, which third parties receive it, how long you keep it, and how to contact you.',
    'Link it from every page footer.',
  ],
  'terms-page': [
    'Publish /terms.html: not advice, no warranties, limitation of liability, licences (code MIT; data CC BY), third-party content, and contact.',
    'Link it next to Privacy in the site footer and on standalone finance pages.',
  ],
  'finance-legal-links': [
    'On every HTML page with a finance disclaimer, Amazon tag or legal-note, add links to privacy.html and terms.html (relative paths so GitHub Pages base paths still work).',
    'Keep the existing disclosure text; the links are in addition to it, not a replacement.',
  ],
  'social-mention-guard': [
    'Before any automated post is sent, reject text containing an @handle (see findMention in collector/post-x.mjs).',
    'Add a test that a post with "@someone" is rejected, so a refactor cannot drop the guard.',
  ],
  'social-affiliate': [
    'Start any automated post that carries an affiliate link with "#ad" or "(affiliate link)".',
    'Add the account to your Amazon Associates "websites and mobile apps" list, or Amazon can close the account.',
  ],
  'ytdlp-cookies': [
    'Use a separate Google account made only for this (never your personal or work account) to export the cookies.',
    'For your own channel, prefer downloading originals from YouTube Studio or Google Takeout, which needs no cookies at all.',
    'Rotate the cookie secret if that account was ever your main one.',
  ],
};
