#!/usr/bin/env node
// compliance/selftest.mjs — prove every rule fires on a violation and stays
// quiet on the fixed version. Run in CI before the audit, so a rule that
// silently stops matching fails the build instead of giving a false PASS.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from './rules.mjs';
import { AUTOFIX } from './remediate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const F = (path, text) => ({ path, text });
const CASES = {
  'fonts-third-party': {
    bad: [F('a.html', '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400&display=swap">')],
    good: [F('a.html', '<link rel="stylesheet" href="/fonts/fonts.css">')],
  },
  'session-replay': {
    bad: [F('a.html', '<script src="https://static.hotjar.com/c/hotjar-1.js"></script>')],
    good: [F('a.html', '<script>posthog.init("k", { disable_session_recording: true })</script>')],
  },
  'tracking-pixel': {
    bad: [F('a.html', '<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>')],
    good: [F('a.html', '<p>no trackers</p>')],
  },
  'privacy-claims': {
    bad: [F('privacy.html', '<p>No analytics.</p>'), F('a.html', '<script src="https://www.google-analytics.com/a.js"></script>')],
    good: [F('privacy.html', '<p>No analytics.</p>'), F('a.html', '<p>hi</p>')],
  },
  'signup-no-age-gate': {
    bad: [F('a.html', '<form><input type="password" name="pw"><button>Sign up</button></form>')],
    good: [F('a.html', '<form><select name="birth_year"></select><input type="password" name="pw"><button>Sign up</button></form>')],
  },
  'email-capture': {
    bad: [F('a.html', '<form><input type="email" name="email"></form>')],
    good: [F('a.html', '<form><input type="email" name="email"> <a href="/privacy.html">Privacy</a></form>')],
  },
  'can-spam': {
    bad: [F('send.mjs', "import nodemailer from 'nodemailer'; nodemailer.createTransport({}).sendMail({ html: 'We launched!' })")],
    good: [F('send.mjs', "import nodemailer from 'nodemailer'; const POSTAL_ADDRESS = 'PO Box 1'; nodemailer.createTransport({}).sendMail({ headers: { 'List-Unsubscribe': '<u>' }, html: 'unsubscribe ' + POSTAL_ADDRESS })")],
  },
  'auto-renewal': {
    bad: [F('a.html', '<p>$9/per month</p><button>Subscribe</button>')],
    good: [F('a.html', '<p>$9/per month. Renews automatically until you cancel online in Settings.</p><button>Subscribe</button>')],
  },
  'dmca-agent': {
    bad: [F('a.html', '<input type="file" name="upload">')],
    good: [F('a.html', '<input type="file" name="upload">'), F('dmca.html', 'Designated agent')],
  },
  'affiliate-disclosure': {
    bad: [F('a.html', '<a href="https://www.amazon.com/dp/B0?tag=x-20">Radio</a>')],
    good: [F('a.html', '<a href="https://www.amazon.com/dp/B0?tag=x-20">Radio</a><p>As an Amazon Associate we earn from qualifying purchases.</p>')],
  },
  'finance-disclaimer': {
    bad: [F('a.html', 'RSI below 30, golden cross, stop-loss hit')],
    good: [F('a.html', 'RSI below 30, golden cross, stop-loss hit. Not investment advice.')],
  },
  'secret-in-repo': {
    bad: [F('a.mjs', "const k = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWX'")],
    good: [F('a.mjs', 'const k = process.env.ANTHROPIC_API_KEY')],
  },
  'owner-pii': {
    bad: [F('a.md', 'contact jane.private@example.org')],
    good: [F('a.md', 'contact via the press page')],
    piiTerms: ['jane.private@example.org'],
  },
  'x-automation': {
    bad: [F('bot.mjs', "await fetch('https://api.x.com/2/users/123/likes', { method: 'POST' })")],
    good: [F('bot.mjs', "await fetch('https://api.x.com/2/tweets', { method: 'POST' })")],
  },
  'clip-rights': {
    bad: [F('clipper/config.json', '{"channels":[{"url":"https://youtube.com/@someone","rights":"none"}]}')],
    good: [F('clipper/config.json', '{"channels":[{"url":"https://youtube.com/@me","rights":"own"}]}')],
  },
  'cookie-consent': {
    bad: [F('a.html', '<script>document.cookie = "id=1"</script>')],
    good: [F('a.html', '<script>if (consent) document.cookie = "id=1"</script>')],
  },
  'social-mention-guard': {
    bad: [F('collector/post-x.mjs', "await fetch('https://api.x.com/2/tweets', { method: 'POST', body })")],
    good: [F('collector/post-x.mjs', "const m = findMention(text); if (m) throw new Error('no'); await fetch('https://api.x.com/2/tweets', { method: 'POST', body })")],
  },
  'social-affiliate': {
    bad: [F('collector/post-daily.mjs', "const text = 'Bunker radio https://amzn.to/abc123'")],
    good: [F('collector/post-daily.mjs', "const text = '#ad Bunker radio https://amzn.to/abc123'")],
  },
  'ytdlp-cookies': {
    bad: [F('.github/workflows/clip.yml', 'env:\n  YTDLP_COOKIES: ${{ secrets.YTDLP_COOKIES }}')],
    good: [F('.github/workflows/clip.yml', 'run: yt-dlp URL')],
  },
  'privacy-page': {
    bad: [F('a.html', '<p>hi</p>')],
    good: [F('a.html', '<a href="/privacy.html">Privacy</a>')],
  },
};

let failed = 0;
for (const rule of RULES) {
  const c = CASES[rule.id];
  if (!c) { console.log(`✗ ${rule.id}: no self-test case`); failed++; continue; }
  const piiTerms = c.piiTerms || [];
  const bad = rule.check({ files: c.bad, piiTerms }).length;
  const good = rule.check({ files: c.good, piiTerms }).length;
  const ok = bad > 0 && good === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${rule.id}  (violation → ${bad} finding${bad === 1 ? '' : 's'}, fixed → ${good})`);
}

// Every auto-fix must turn its own violation into a pass.
let fixes = 0;
for (const [id, fix] of Object.entries(AUTOFIX)) {
  const rule = RULES.find((r) => r.id === id);
  const c = CASES[id];
  const piiTerms = c.piiTerms || [];
  const files = c.bad.map((f) => ({ ...f }));
  for (const finding of rule.check({ files, piiTerms })) {
    const file = files.find((f) => f.path === finding.file);
    for (const w of fix(file, { root: ROOT }) || []) {
      const cur = files.find((f) => f.path === w.path);
      if (cur) cur.text = w.text; else files.push({ path: w.path, text: w.text });
    }
  }
  const after = rule.check({ files, piiTerms }).length;
  fixes++;
  if (after) failed++;
  console.log(`${after ? '✗' : '✓'} --fix ${id}  (findings after fix → ${after})`);
}

console.log(failed ? `\n${failed} check(s) broken` : `\nAll ${RULES.length} rules catch their violation and clear on the fix; all ${fixes} auto-fixes resolve their finding.`);
process.exit(failed ? 1 : 0);
