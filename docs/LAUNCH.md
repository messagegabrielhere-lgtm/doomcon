# Launch checklist — all 20

This is the operator's single source of truth for going live without leaving a
hole. Every item maps to **this** codebase (static site + GitHub Actions), not
to a generic SaaS template. Where something does not apply, it says so and
says what we do instead — inventing a fake signup flow would be a mistake.

Status legend: **DONE** in code/docs · **YOU** needs a human in a console ·
**N/A** does not exist on this architecture (covered by an equivalent).

---

## 1. Hide every API key — nothing in the frontend, nothing in git — **DONE**

- `.gitignore` excludes `.env`, `.env.*`, `.backups/`.
- `.env.example` and `clipper/.env.example` are placeholders only.
- Site templates never read `process.env` for provider keys.
- Workflows inject secrets only into the steps that need them (`post-daily.yml`,
  `arena.yml`, `clipper.yml`, `secrets-check.yml`).
- Compliance rule `secret-in-repo` fails CI on `sk-ant-`, `ghp_`, `AIza…`, etc.

**Verify:** `rg -n "sk-ant-|ghp_|xai-[A-Za-z0-9]{20}" --glob '!compliance/**'` → empty.

## 2. Rotate any key that was ever committed — **YOU**

Git history scan of this repo found **no live provider keys** (only the
compliance self-test's fake `sk-ant-…` fixture). Still rotate if you ever pasted
a real key into chat, a screenshot, or an Actions log:

1. Provider console → create new key.
2. GitHub → Settings → Secrets → paste new value.
3. Actions → `secrets-check` → Run workflow → all green.
4. Revoke the old key at the provider.
5. Tick `secrets-rotated` in `compliance/manual.json`.

## 3. Rate limiting so one user can't burn the bill — **DONE**

Visitors hit GitHub Pages (static). They cannot call Anthropic/OpenAI through
this site. Bill risk is **our** Actions jobs:

| Brake | Where |
|---|---|
| Per-host outbound gates | `collector/fetch.mjs` `HOST_MIN_INTERVAL_MS` |
| Arena daily USD / tokens / calls | `arena/spend-cap.mjs` (`ARENA_DAILY_*` env) |
| Clipper output-token ceiling | `clipper/src/pick.mjs` (`CLIPPER_MAX_TOKENS`) |
| Clipper kill switch | `CLIPPER_AI_DISABLED=1` |

## 4. Auth on every route, not just the UI — **DONE** (mapped)

There is no user auth. The equivalent:

- Pages are public on purpose.
- Secrets never ship to Pages; only workflow steps that declare
  `secrets.*` receive them.
- Issue desk validates issue ids before calling the GitHub API
  (`collector/issue-bot.mjs`).
- Arena proposals are auth'd by possession of a server-side key and then
  re-checked by `arena/rules.mjs` before any fill.

## 5. Lock down database rules so users only see their own data — **N/A**

There is no per-user database. `data/` and the public JSON API are **CC-BY 4.0
and intentionally public**. Arena wallets are paper money on a public branch.
If you later add accounts, put RLS in that system — do not pretend it exists here.

## 6. Validate every input on the server — **DONE**

| Input | Gate |
|---|---|
| Source HTTP | `collector/fetch.mjs` → `FetchError` |
| Arena proposals | JSON schema + `normalize()` + `rules.mjs` gate |
| Clipper picks | JSON schema on Claude output; heuristic fallback |
| Issue desk | integer issue id check |
| Build inputs | schema/self-checks in `site/build.mjs` |

## 7. Spending cap on the AI provider — **DONE** + **YOU**

**In code:** arena daily caps (default $5 / 400k tokens / 48 calls) and clipper
`max_tokens` ceiling.

**In the console (do this before enabling paid keys):**

| Provider | Where to set a monthly budget |
|---|---|
| Anthropic | console.anthropic.com → Plans & Billing → Budget |
| OpenAI | platform.openai.com → Usage → Limits |
| xAI | console.x.ai → Billing limits |
| Google AI | AI Studio / Cloud billing budget alert |
| DeepSeek | platform.deepseek.com → usage limits |

Set each to an amount you can afford to lose overnight. Code caps are a seatbelt;
the console budget is the airbag.

## 8. Errors must not leak stack traces — **DONE**

- `collector/safe-error.mjs` → `publicError()` strips stacks, paths, secret shapes.
- Arena writes `w.error` through `publicError` into public `state.json`.
- `FetchError.toJSON()` never includes a stack.
- `/500.html` explicitly tells the visitor there is no stack on purpose.

## 9. Error tracking before users tweet — **DONE** + **YOU**

| Signal | Where |
|---|---|
| Workflow failure mail | GitHub → Settings → Notifications → Actions |
| Annotations | `secrets-check`, compliance, collect logs |
| Watchdog workflow | `.github/workflows/watchdog.yml` (failed collect / publish) |
| Human reports | `/feedback.html` → labelled GitHub issues → issue desk |

**YOU:** watch the Actions tab on launch day, or wire a Slack incoming webhook
to workflow failures (repo Settings → Secrets → `SLACK_WEBHOOK_URL` if you
add a notifier). GoatCounter (analytics) is not an error tracker.

## 10. Back up the database and test a restore — **DONE**

```bash
node collector/tools/backup.mjs selftest    # must print ok
node collector/tools/backup.mjs backup      # writes .backups/data-…/
node collector/tools/backup.mjs restore .backups/data-… --dry-run
```

Git history is the continuous backup; this tool is the deliberate snapshot you
take before a risky migration. `selftest` mutates a temp tree only.

## 11. 404 and 500 pages that don't look broken — **DONE**

- `/404.html` — GitHub Pages serves this for missing paths.
- `/500.html` — on-brand desk-dark page for CDNs / status posts.

Both link home, carry the masthead, and refuse to invent a reading.

## 12. Works on a cheap Android phone — **DONE** (ongoing)

- `viewport-fit=cover`, responsive CSS down to ~359px.
- LCP image: `fetchpriority="high"` + `decoding="async"` on the homepage siren.
- Fonts self-hosted with `font-display: swap`; stylesheet preloaded.
- Below-fold faces/art use `loading="lazy"`.
- Videos are `preload="none"`.

**Verify on a real low-end phone** after deploy: first paint of the level number
under 3s on mid-tier 4G. If not, see §13.

## 13. Nothing takes more than 3 seconds to load — **DONE** (guardrails)

- Homepage is server-rendered HTML (no SPA boot).
- News-only rebuild path keeps the open-tab loop fast.
- Smoke test flags homepage HTML &gt; 400KB as a failure.

After deploy, Chrome DevTools → Lighthouse on mobile; if LCP &gt; 3s, cut
above-fold weight (hero art, font count) before adding features.

## 14. Meta tags + OG image for X — **DONE**

`site/templates/layout.mjs` emits description, canonical, `og:*`,
`twitter:card=summary_large_image`, and a versioned `og:image` pointing at
`cards/state.png` (1200×675). Share a link in a DM to yourself to confirm the
card renders after the next collect publish.

## 15. Privacy policy + terms — **DONE**

- `/privacy.html` — every trace a visit can leave, including GoatCounter.
- `/terms.html` — information not advice; no warranty; liability limits.
- Linked from the homepage footer and the site-wide legal strip.

## 16. Analytics for drop-off — **DONE**

GoatCounter site code `messagegabriel` in `site/monetize.mjs` (cookieless).
Open https://messagegabriel.goatcounter.com/ after launch for paths and referrers.
Privacy page copy switches automatically with the flag.

## 17. Test signup, payment, password reset end-to-end — **N/A** + smoke

There is **no signup, no card vault, no password reset**. Equivalent launch tests:

```bash
npm run build
npm run test:launch          # local public/ checks
SMOKE_LIVE=1 npm run test:launch   # hits the live site
```

Manual: open `/feedback.html` and confirm the GitHub issue form prefills; open
the Ko-fi tip link; confirm Amazon Associates links are `rel=sponsored`.

## 18. Emails don't land in spam — **YOU** (when newsletter turns on)

Newsletter is **off** until `MONETIZE.newsletter` is filled. Before sending:

1. Buttondown/beehiiv: verify the domain (SPF + DKIM + DMARC).
2. From-name = brand; include postal address + unsubscribe (CAN-SPAM).
3. Send yourself a test from a Gmail and a Outlook address; check spam.
4. Never buy a list.

## 19. Way for users to contact you — **DONE**

- `/feedback.html` → public GitHub issue (bug / data / idea).
- `/about.html` + press kit → X handle.
- Issue desk auto-triages `from-site` issues.

## 20. Rollback plan if launch day goes wrong — **DONE**

See **[docs/ROLLBACK.md](./ROLLBACK.md)**. Read it once before you post the URL.

---

## Quick pre-flight (10 minutes)

```bash
npm run compliance
npm run test:arena
node collector/tools/backup.mjs selftest
npm run build && npm run test:launch
```

Then **YOU**: secrets-check workflow green, provider budgets set, GoatCounter
showing hits, one X draft ready with no link in the post body (`GO-LIVE.md`).
