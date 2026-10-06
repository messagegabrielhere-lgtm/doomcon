# Compliance auditor

A zero-dependency scanner that blocks the expensive legal mistakes AI-built sites
tend to ship with. It runs on every push, weekly, and as a gate before every
deploy to GitHub Pages.

```bash
npm run compliance            # self-test the rules, then audit (strict)
node compliance/audit.mjs     # fails on HIGH only
node compliance/audit.mjs --strict --dir public   # also scan the built site
node compliance/audit.mjs --json
```

## What it checks

| Rule | Severity | Exposure it prevents |
|---|---|---|
| `fonts-third-party` | high | GDPR — a Munich court awarded €100 per visitor whose IP went to Google Fonts |
| `session-replay` | high | California CIPA wiretap claims, up to $5,000 per session |
| `privacy-claims` | high | FTC deception: privacy page says "no analytics" while code tracks |
| `signup-no-age-gate` | high | COPPA, up to ~$53k per violation |
| `can-spam` | high | CAN-SPAM, up to $53,088 per email without unsubscribe + postal address |
| `auto-renewal` | high | California auto-renewal law / FTC ROSCA |
| `affiliate-disclosure` | high | FTC Endorsement Guides; Amazon Associates termination |
| `secret-in-repo` | high | Leaked API keys |
| `owner-pii` | high | Your private details in a public repo (via `COMPLIANCE_PII_TERMS`) |
| `x-automation` | high | X suspension for automated likes, follows, reposts, DMs |
| `clip-rights` | high | Copyright strikes from clipping videos you don't own |
| `tracking-pixel` | medium | GDPR/CCPA consent for analytics and ad pixels |
| `email-capture` | medium | Email field with no privacy link (CalOPPA, GDPR) |
| `dmca-agent` | medium | Losing DMCA safe harbor for user uploads ($150k per work) |
| `finance-disclaimer` | medium | Trading signals with no "not investment advice" notice |
| `cookie-consent` | medium | ePrivacy cookie consent |
| `privacy-page` | medium | CalOPPA requires a linked privacy policy |

`compliance/selftest.mjs` plants a violation and a fix for every rule and fails CI
if any rule stops catching its violation or starts flagging the fix.

## Accepting a finding

Add an entry to `compliance/allow.json` — a reason and a review date are
required. After the date the finding comes back.

```json
[{ "rule": "tracking-pixel", "file": "site/static/x.html", "reason": "consent banner added in PR #12", "until": "2027-01-01" }]
```

## Things a scan can't see

`compliance/manual.json` lists checks only you can do (X "Automated" label, bio
disclosure, Amazon Associates profile, DMCA agent, clipper channel rights, key
rotation). Each run prints the open ones. Add an id to `done` once it's true.

## Keeping your name out of the repo

Add a repository secret named `COMPLIANCE_PII_TERMS` (Settings → Secrets and
variables → Actions) with your real name, personal email and phone,
comma-separated. The audit fails if any of them appears in a tracked file and
reports only the file and line, never the term.

Not legal advice. These are tripwires for common, costly mistakes, not a
substitute for a lawyer reviewing anything that takes money or user data.
