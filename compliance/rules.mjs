// compliance/rules.mjs — the rule set the auditor runs.
//
// Each rule is data plus one function. `check(ctx)` returns findings:
//   { file, line, detail }
// and the auditor stamps the rule's id, severity, law and fix onto each.
//
// Severity:
//   high   — a per-visitor / per-email / per-session statutory exposure, or a
//            leaked secret. CI fails.
//   medium — a real gap that should be fixed before the feature ships. CI fails
//            with --strict (the default in the workflow).
//   low    — hygiene. Reported, never fails the build.
//
// Rules look at what the repo ACTUALLY ships. Comments and docs (*.md) are
// skipped for code-pattern rules so that writing about a risk is not the risk.
//
// Not legal advice. These are tripwires that catch the common, expensive
// mistakes; they do not replace a lawyer reviewing a real launch.

const PAGE = /\.(html?|mjs|js|jsx|tsx|ts|vue|svelte|astro)$/i;
const CODE = /\.(mjs|cjs|js|jsx|ts|tsx|py|sh|ya?ml)$/i;

/** Line number of a character offset. */
export function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Every match of re in text as { line, match }. */
function hits(text, re) {
  const out = [];
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = g.exec(text))) {
    out.push({ line: lineOf(text, m.index), match: m[0] });
    if (m[0].length === 0) g.lastIndex++;
  }
  return out;
}

/** Drop // and /* *\/ comment lines so prose about a risk is not flagged. */
function codeOnly(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l) => (/^\s*(\/\/|#(?!!)|\*)/.test(l) ? '' : l))
    .join('\n');
}

const shipped = (f) => PAGE.test(f.path) && !f.path.endsWith('.md');

export const RULES = [
  // ── 1. Third-party fonts ───────────────────────────────────────────────
  {
    id: 'fonts-third-party',
    severity: 'high',
    title: 'Fonts loaded from a third-party server',
    law: 'GDPR — LG München I, 3 O 17493/20 (2022): €100 per visitor whose IP went to Google',
    fix: 'Self-host the woff2 files (assets/fonts/) and reference them with a site-relative URL.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) =>
        hits(codeOnly(f.text), /https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fast\.fonts\.net|use\.fontawesome\.com|kit\.fontawesome\.com)[^\s"'`)]*/i)
          .map((h) => ({ file: f.path, line: h.line, detail: h.match }))),
  },

  // ── 2. Session replay / keystroke recording ────────────────────────────
  {
    id: 'session-replay',
    severity: 'high',
    title: 'Session-replay or keystroke-recording script',
    law: 'California Invasion of Privacy Act §631/§637.2 — up to $5,000 per violation; wiretap claims under other state laws',
    fix: 'Remove it, or load it only after opt-in consent with all inputs masked (maskAllInputs) and disclose it in the privacy page.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) =>
        hits(codeOnly(f.text), /(static\.hotjar\.com|hotjar\(|www\.clarity\.ms|clarity\(\s*["']|fullstory\.com|FS\.identify|cdn\.logrocket|LogRocket\.init|mouseflow\.com|smartlook|inspectlet|luckyorange|enable_recording_console_log|rrweb|posthog\.init\([^)]*\{(?![^}]*disable_session_recording\s*:\s*true))/i)
          .map((h) => ({ file: f.path, line: h.line, detail: h.match.slice(0, 80) }))),
  },

  // ── 3. Analytics / ad pixels without a consent gate ────────────────────
  {
    id: 'tracking-pixel',
    severity: 'medium',
    title: 'Analytics or ad pixel',
    law: 'GDPR/ePrivacy consent; CCPA/CPRA "sale/share" notice; VPPA where video is involved',
    fix: 'Gate behind consent (or use cookieless, IP-truncating analytics) and list it on the privacy page.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) =>
        hits(codeOnly(f.text), /(googletagmanager\.com\/(gtag|gtm)|google-analytics\.com|connect\.facebook\.net|fbq\(\s*['"]init|snap\.licdn\.com|analytics\.tiktok\.com|static\.ads-twitter\.com|bat\.bing\.com)/i)
          .map((h) => ({ file: f.path, line: h.line, detail: h.match }))),
  },

  // ── 4. The privacy page must not contradict the code ───────────────────
  {
    id: 'privacy-claims',
    severity: 'high',
    title: 'Privacy page claim contradicted by the code',
    law: 'FTC Act §5 (deceptive practices); state UDAP laws',
    fix: 'Either remove the tracker/third party or correct the privacy page.',
    check: ({ files }) => {
      const privacy = files.filter((f) => /privacy/i.test(f.path) && shipped(f));
      if (!privacy.length) return [];
      const ptext = privacy.map((f) => f.text).join('\n');
      const claimsNoAnalytics = /no analytics|no tracking/i.test(ptext);
      const claimsNoCookies = /no cookies|sets none/i.test(ptext);
      const out = [];
      for (const f of files.filter(shipped)) {
        const c = codeOnly(f.text);
        if (claimsNoAnalytics)
          for (const h of hits(c, /(googletagmanager|google-analytics|fbq\(|hotjar|clarity\.ms|posthog\.init|plausible\.io\/js|umami|goatcounter)/i))
            out.push({ file: f.path, line: h.line, detail: `privacy page says "no analytics" but code loads ${h.match}` });
        if (claimsNoCookies)
          for (const h of hits(c, /document\.cookie\s*=/))
            out.push({ file: f.path, line: h.line, detail: 'privacy page says "no cookies" but code sets document.cookie' });
      }
      return out;
    },
  },

  // ── 5. Account sign-up without an age gate (COPPA) ─────────────────────
  {
    id: 'signup-no-age-gate',
    severity: 'high',
    title: 'Sign-up or account form with no age gate',
    law: 'COPPA, 16 CFR 312 — civil penalties up to ~$53,000 per violation',
    fix: 'Add a neutral age gate (ask birth year, do not hint the cutoff) and block under-13 sign-ups; say so in the privacy page.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) => {
        const c = codeOnly(f.text);
        // A real account form: a <form> element that holds a password field,
        // or sign-up wording plus an email field. Headlines that merely say
        // "sign up" are not forms.
        const out = [];
        for (const h of hits(c, /<form\b[\s\S]{0,4000}?<\/form>/i)) {
          const form = h.match;
          const isAccount = /type=["']password["']/i.test(form)
            || (/(sign\s?up|create (an )?account|register)/i.test(form) && /type=["']email["']/i.test(form));
          if (isAccount && !/birth[\s_-]?(year|date)|date of birth|\bage\b[^;]{0,40}\b13\b|ageGate|age-gate|confirm you are (13|18)/i.test(c))
            out.push({ file: f.path, line: h.line, detail: 'account form with no age gate' });
        }
        return out;
      }),
  },

  // ── 6. Email collection: forms need a privacy link; senders need CAN-SPAM ─
  {
    id: 'email-capture',
    severity: 'medium',
    title: 'Email collected with no privacy link next to the form',
    law: 'CalOPPA (privacy policy must be linked); GDPR Art. 13 notice',
    fix: 'Put a link to /privacy.html beside the email field and say what you will send.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) => {
        const c = codeOnly(f.text);
        const em = hits(c, /type=["']email["']|name=["']email["']|(buttondown|beehiiv|convertkit|mailchimp|substack|formspree|kit\.com)\.[a-z]+\/[^\s"']*/i);
        if (!em.length || /privacy/i.test(c)) return [];
        return [{ file: f.path, line: em[0].line, detail: em[0].match }];
      }),
  },
  {
    id: 'can-spam',
    severity: 'high',
    title: 'Marketing email sender without unsubscribe link and postal address',
    law: 'CAN-SPAM Act, 15 U.S.C. 7704 — up to $53,088 per email',
    fix: 'Every marketing email template must carry a working one-click unsubscribe (and List-Unsubscribe header) plus a physical postal address or registered PO box.',
    check: ({ files }) =>
      files.filter((f) => CODE.test(f.path)).flatMap((f) => {
        const c = codeOnly(f.text);
        const send = hits(c, /(nodemailer|createTransport|@sendgrid\/mail|sgMail\.send|resend\.emails\.send|mailgun|postmark|api\.mailchannels|ses\.send(Email|RawEmail)|smtplib)/i);
        if (!send.length) return [];
        const missing = [];
        if (!/unsubscribe/i.test(c)) missing.push('unsubscribe link');
        if (!/List-Unsubscribe/i.test(c)) missing.push('List-Unsubscribe header');
        if (!/(P\.?O\.? Box|postal|mailing address|POSTAL_ADDRESS)/i.test(c)) missing.push('postal address');
        return missing.length ? [{ file: f.path, line: send[0].line, detail: `email sender missing: ${missing.join(', ')}` }] : [];
      }),
  },

  // ── 7. Subscription checkout without clear renewal terms ───────────────
  {
    id: 'auto-renewal',
    severity: 'high',
    title: 'Recurring payment without renewal terms at the button',
    law: 'California ARL, Bus. & Prof. Code §17600–17606 (unconsented renewals are an unconditional gift); FTC ROSCA',
    fix: 'Next to the subscribe button, state price, billing period, that it renews automatically until cancelled, and how to cancel online. Require an affirmative checkbox.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) => {
        const c = codeOnly(f.text);
        const sub = hits(c, /(mode:\s*["']subscription["']|recurring:\s*\{|\/(per|a)\s(month|mo|year|yr)\b|billed (monthly|annually)|gumroad\.com\/l\/[^\s"']+\?[^"']*recurrence|lemonsqueezy\.com\/checkout)/i);
        if (!sub.length) return [];
        if (/renews? automatically|auto[- ]?renew/i.test(c) && /cancel/i.test(c)) return [];
        return [{ file: f.path, line: sub[0].line, detail: sub[0].match }];
      }),
  },

  // ── 8. User uploads without a DMCA agent ───────────────────────────────
  {
    id: 'dmca-agent',
    severity: 'medium',
    title: 'User uploads with no DMCA policy / designated agent',
    law: '17 U.S.C. 512(c) safe harbor requires a registered agent ($6 at dmca.copyright.gov); statutory damages up to $150,000 per work',
    fix: 'Register an agent at dmca.copyright.gov, publish /dmca.html with the agent contact and takedown steps, and renew every 3 years.',
    check: ({ files }) => {
      const uploads = files.filter(shipped).flatMap((f) =>
        hits(codeOnly(f.text), /<input[^>]+type=["']file["']/i).map((h) => ({ file: f.path, line: h.line, detail: 'public file-upload field' })));
      if (!uploads.length) return [];
      const hasDmca = files.some((f) => /dmca/i.test(f.path) || /designated agent|dmca\.copyright\.gov/i.test(f.text));
      return hasDmca ? [] : uploads;
    },
  },

  // ── 9. Affiliate links need a clear disclosure on the same page ────────
  {
    id: 'affiliate-disclosure',
    severity: 'high',
    title: 'Affiliate link with no disclosure on the same page',
    law: 'FTC Endorsement Guides, 16 CFR 255 — civil penalties per violation; Amazon Associates Operating Agreement',
    fix: 'Put "As an Amazon Associate I earn from qualifying purchases" (or equivalent) visibly near the links, not only on the privacy page.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) => {
        const c = f.text;
        const aff = hits(c, /(amzn\.to\/|amazon\.[a-z.]+\/[^\s"'`]*[?&]tag=|[?&](ref|aff|affiliate)_?id=|shareasale\.com|impact\.com\/|awin1\.com)/i);
        if (!aff.length) return [];
        if (/earns? from qualifying purchases|affiliate (link|commission)|we may earn|paid link/i.test(c)) return [];
        return [{ file: f.path, line: aff[0].line, detail: aff[0].match }];
      }),
  },

  // ── 10. Market / trading tools need an advice disclaimer ───────────────
  {
    id: 'finance-disclaimer',
    severity: 'medium',
    title: 'Stock/crypto signals with no "not investment advice" notice',
    law: 'Investment Advisers Act §202(a)(11) publisher exclusion depends on impersonal, bona fide content; state securities and UDAP law',
    fix: 'Show "Not investment advice" on every page that ranks, signals or simulates trades.',
    check: ({ files }) =>
      files.filter((f) => /\.html?$/i.test(f.path) || /templates\//.test(f.path)).flatMap((f) => {
        const c = codeOnly(f.text);
        const sig = hits(c, /(\bRSI\b|golden cross|buy signal|sell signal|stop[- ]loss|take[- ]profit|paper[- ]money|price target|breakout)/i);
        const distinct = new Set(sig.map((h) => h.match.toLowerCase().replace(/[- ]/g, '')));
        if (distinct.size < 3) return [];
        if (/not (an? )?(investment|financial|trading)[\w\s,/]{0,30}advice/i.test(f.text)) return [];
        return [{ file: f.path, line: sig[0].line, detail: `${sig.length} trading-signal terms, no disclaimer` }];
      }),
  },

  // ── 11. Secrets committed to the repo ──────────────────────────────────
  {
    id: 'secret-in-repo',
    severity: 'high',
    title: 'Credential committed to the repository',
    law: 'Account takeover, API bills, and breach-notification duties if user data is exposed',
    fix: 'Revoke and rotate the key now, then move it to a GitHub Actions secret. Removing it from the file does not remove it from git history.',
    check: ({ files }) =>
      files.filter((f) => !/\.example$|example\./i.test(f.path)).flatMap((f) =>
        hits(f.text, /(sk-ant-[A-Za-z0-9_-]{20,}|sk-(proj-)?[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC )?PRIVATE KEY-----)/)
          .map((h) => ({ file: f.path, line: h.line, detail: `${h.match.slice(0, 8)}… (redacted)` }))),
  },

  // ── 12. Owner PII leaking into the public repo/site ────────────────────
  {
    id: 'owner-pii',
    severity: 'high',
    title: 'Private identifier found in a public file',
    law: 'Doxxing / personal-safety risk; also exposes the operator to direct legal service',
    fix: 'Remove it from the file AND from git history (git filter-repo), then force-push.',
    // Terms come from the COMPLIANCE_PII_TERMS secret (comma-separated) so the
    // list of things to keep private is never itself committed. Matches are
    // reported by file and line only; the term is never printed.
    check: ({ files, piiTerms }) => {
      const out = [];
      const generic = /(\b\d{3}-\d{2}-\d{4}\b)/; // SSN shape
      for (const f of files) {
        for (const h of hits(f.text, generic)) out.push({ file: f.path, line: h.line, detail: 'SSN-shaped number' });
        for (const t of piiTerms) {
          const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          for (const h of hits(f.text, re)) out.push({ file: f.path, line: h.line, detail: 'matches a private term from COMPLIANCE_PII_TERMS' });
        }
      }
      return out;
    },
  },

  // ── 13. Automated social posting must stay inside platform rules ───────
  {
    id: 'x-automation',
    severity: 'high',
    title: 'Automation that X prohibits',
    law: 'X Automation Rules and Developer Agreement — suspension of the account and API access',
    fix: 'Never automate likes, follows, reposts, DMs or unsolicited @mentions. Post and reply-when-summoned only.',
    check: ({ files }) =>
      files.filter((f) => CODE.test(f.path)).flatMap((f) =>
        hits(codeOnly(f.text), /api\.(x|twitter)\.com\/2\/users\/[^"'`\s]*\/(likes|following|retweets|bookmarks|blocking|muting)|\/2\/dm_conversations|\/1\.1\/(favorites|friendships)\/create/i)
          .map((h) => ({ file: f.path, line: h.line, detail: h.match }))),
  },

  // ── 14. Re-posting other people's video ────────────────────────────────
  {
    id: 'clip-rights',
    severity: 'high',
    title: 'Clipper channel without stated rights',
    law: 'Copyright infringement (17 U.S.C. 504, up to $150,000 per work) and platform strikes',
    fix: 'Every channel must have "rights": "own" or "licensed". Only clip your own videos or an approved clipping campaign.',
    check: ({ files }) => [
      // A workflow that hardcodes the rights value vouches for whatever URL is
      // configured later. Rights must be asserted alongside the channel.
      ...files.filter((f) => /\.ya?ml$/i.test(f.path)).flatMap((f) =>
        hits(codeOnly(f.text), /CLIPPER_CHANNEL_RIGHTS:\s*["']?(own|licensed)\b/)
          .map((h) => ({ file: f.path, line: h.line, detail: 'rights hardcoded in the workflow instead of asserted per channel' }))),
      ...files.filter((f) => /clipper\/config.*\.json$/i.test(f.path) && !/example/i.test(f.path)).flatMap((f) => {
        let cfg;
        try { cfg = JSON.parse(f.text); } catch { return [{ file: f.path, line: 1, detail: 'invalid JSON' }]; }
        return (cfg.channels || [])
          .filter((ch) => !['own', 'licensed'].includes(ch.rights))
          .map((ch) => ({ file: f.path, line: lineOf(f.text, f.text.indexOf(ch.url || '')), detail: `${ch.url || '(no url)'} has rights=${ch.rights ?? 'unset'}` }));
      }),
    ],
  },

  // ── 15. Cookies set without a consent mechanism ────────────────────────
  {
    id: 'cookie-consent',
    severity: 'medium',
    title: 'Cookie set with no consent mechanism',
    law: 'ePrivacy Directive Art. 5(3) / GDPR for EU visitors',
    fix: 'Use localStorage for preferences, or add consent before non-essential cookies.',
    check: ({ files }) =>
      files.filter(shipped).flatMap((f) => {
        const c = codeOnly(f.text);
        const ck = hits(c, /document\.cookie\s*=/);
        if (!ck.length || /consent/i.test(c)) return [];
        return [{ file: f.path, line: ck[0].line, detail: 'document.cookie written' }];
      }),
  },

  // ── 16. A privacy page has to exist once anything is collected ─────────
  {
    id: 'privacy-page',
    severity: 'medium',
    title: 'No privacy page',
    law: 'CalOPPA (Bus. & Prof. Code §22575) — any site that collects PII from Californians',
    fix: 'Publish /privacy.html and link it from every page footer.',
    check: ({ files }) =>
      files.some((f) => /privacy/i.test(f.path) || /privacy\.html/.test(f.text))
        ? []
        : [{ file: '(repo)', line: 0, detail: 'no privacy page found' }],
  },
  // ── 17. Automated social posters must refuse @mentions ─────────────────
  {
    id: 'social-mention-guard',
    severity: 'high',
    title: 'Automated social poster with no @mention guard',
    law: 'X Automation Rules (no unsolicited mentions); Bluesky Community Guidelines (spam)',
    fix: 'Reject any automated post text that contains an @handle before it is sent.',
    check: ({ files }) =>
      files.filter((f) => CODE.test(f.path)).flatMap((f) => {
        const c = codeOnly(f.text);
        const post = hits(c, /(api\.(x|twitter)\.com\/2\/tweets|com\.atproto\.repo\.createRecord)/);
        if (!post.length) return [];
        return /findMention|assertNoMention|@mention/i.test(c)
          ? [] : [{ file: f.path, line: post[0].line, detail: `${post[0].match} with no mention check in the same file` }];
      }),
  },

  // ── 18. Affiliate links inside automated social posts ──────────────────
  {
    id: 'social-affiliate',
    severity: 'high',
    title: 'Affiliate link in an automated social post without #ad',
    law: 'FTC Endorsement Guides 16 CFR 255; Amazon Associates Operating Agreement (social posts must disclose)',
    fix: 'Start the post with "#ad" or "(affiliate link)".',
    check: ({ files }) =>
      files.filter((f) => CODE.test(f.path) && /(post|tweet|social|bsky|bluesky)/i.test(f.path)).flatMap((f) => {
        const c = codeOnly(f.text);
        const aff = hits(c, /(amzn\.to\/|amazon\.[a-z.]+\/[^\s"'`]*[?&]tag=)/i);
        if (!aff.length || /#ad\b|affiliate link|paid link/i.test(c)) return [];
        return [{ file: f.path, line: aff[0].line, detail: aff[0].match }];
      }),
  },

  // ── 19. Logged-in cookies used to download from YouTube ────────────────
  {
    id: 'ytdlp-cookies',
    severity: 'low',
    title: 'YouTube downloads can run with a logged-in account\'s cookies',
    law: 'YouTube Terms of Service (no downloading outside YouTube features) — risk is termination of that Google account',
    fix: 'Use a throwaway Google account for the cookies, or download your own videos from YouTube Studio instead.',
    check: ({ files }) =>
      files.filter((f) => /\.ya?ml$/i.test(f.path)).flatMap((f) =>
        hits(f.text, /secrets\.YTDLP_COOKIES|--cookies\b/).slice(0, 1)
          .map((h) => ({ file: f.path, line: h.line, detail: 'yt-dlp cookies wired into CI' }))),
  },
];

/**
 * Things no code scan can see. Printed every run so they stay on the list.
 * Tick them off in compliance/manual.json once done.
 */
export const MANUAL = [
  { id: 'x-automated-label', text: 'X account: the "Automated" label is on.',
    steps: ['Log in to the bot account on x.com.', 'Settings and privacy → Your account → Account information → Automation.', 'Choose "Managing account" and pick the human account that runs it, then confirm with that account\'s password.', 'Check the label shows under the bot\'s name on its profile.'] },
  { id: 'x-bio-disclosure', text: 'X bio says it is automated and links a human-run account.',
    steps: ['Edit profile → Bio.', 'Add a line such as: "Automated account · data posts daily · run by @<human account>".', 'The human account need not use your real name; it must be one you actually read.'] },
  { id: 'x-ai-media', text: 'AI-generated images posted anywhere are labelled, and none show real people doing things they did not.',
    steps: ['Caption AI-made images "AI-generated" or "illustration".', 'Never post AI images or video of real, identifiable people (X synthetic media policy; state deepfake laws).', 'The daily data cards are drawn from data, not generated, so they need no label.'] },
  { id: 'amazon-associates', text: 'Amazon Associates lists every site and account where affiliate links appear.',
    steps: ['Associates Central → Account settings → Edit your website and mobile app list.', 'Add the GitHub Pages site URL and any social account that posts your links.', 'Make your first 3 qualifying sales within 180 days of signing up, or the account is closed.'] },
  { id: 'dmca-agent-registered', text: 'Only if the site ever accepts uploads: DMCA agent registered.',
    steps: ['Not needed today: nothing on the site accepts uploads.', 'If that changes: https://dmca.copyright.gov → register ($6) → put the details on a dmca.html page (`audit.mjs --fix` creates the template).'] },
  { id: 'clipper-env-channels', text: 'Clipper channels in GitHub settings are ones you own or are licensed to clip.',
    steps: ['GitHub repo → Settings → Secrets and variables → Actions → Variables.', 'Open CLIPPER_CHANNEL_URLS: every URL must be your own channel or an approved clipping campaign.', 'CLIPPER_CHANNEL_RIGHTS must be "own" or "licensed".'] },
  { id: 'secrets-rotated', text: 'API keys rotated in the last 12 months; old ones revoked.',
    steps: ['For each secret in repo Settings → Secrets (X, Bluesky, Anthropic, OpenAI, xAI, Gemini, DeepSeek, YouTube): create a new key at the provider.', 'Paste it into the GitHub secret, run the workflow once, then revoke the old key.', 'Set a calendar reminder for next year.'] },
  { id: 'pii-secret', text: 'COMPLIANCE_PII_TERMS secret is set, so your private details can never land in the public repo.',
    steps: ['GitHub repo → Settings → Secrets and variables → Actions → New repository secret.', 'Name: COMPLIANCE_PII_TERMS. Value: your real name, personal email and phone, comma-separated.', 'Run the "compliance" workflow once to confirm it passes.'] },
];
