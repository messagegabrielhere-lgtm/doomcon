# GitHub ops runbook

One page for running this repository on GitHub. The live reading still lives on
the [site](https://messagegabrielhere-lgtm.github.io/doomcon/); this file is the
control panel map.

For first-time setup see [GO-LIVE.md](GO-LIVE.md). For posting credentials see
[POSTING.md](POSTING.md). For vulnerability reporting see
[SECURITY.md](../SECURITY.md).

---

## Branches

| Branch | Role | Who writes it |
|---|---|---|
| `main` | Source of truth (collector, site, workflows, docs) | Humans / agents via PR; `post-daily` may commit `data/posted.ndjson` |
| `gh-pages` | What GitHub Pages serves (orphan, force-pushed) | `collect`, `news-fast` |
| `arena-data` | Paper-trading state (orphan, force-pushed) | `arena` |
| `scanner-data` | Stock snapshot for `/scanner.html` (orphan, force-pushed) | `scanner-stocks` |

Never merge `gh-pages`, `arena-data`, or `scanner-data` into `main`. They are
publish targets, not history.

---

## Workflows

| Workflow | Schedule (UTC) | Concurrency | Writes | Secrets needed |
|---|---|---|---|---|
| `collect` | `*/15` news lane; `:07` full lane | `doomcon-data` (never cancel) | `gh-pages` | optional `COMPLIANCE_PII_TERMS` |
| `news-fast` | `:04` hourly re-arm (loops ~1h) | `news-fast` | `gh-pages` | none |
| `post-daily` | `14:41` daily | `post-daily` | `main` (`data/posted.ndjson`) | X and/or Bluesky (no-op if absent) |
| `arena` | `*/5` | `arena` | `arena-data` | optional model keys |
| `scanner-stocks` | US session + after close | `scanner-stocks` (cancel ok) | `scanner-data` | none |
| `clipper` | `:04,:19,:34,:49` | `clipper` | Actions cache only | YouTube + Anthropic |
| `compliance` | every push/PR; Mondays `13:17` | PR runs cancel stale | none | optional `COMPLIANCE_PII_TERMS` |
| `labeler` | pull requests | — | PR labels | none |
| `ops-health` | Mondays `15:00` + manual | — | job summary only | none |

GitHub crons are hints. Scheduled runs are often 5–20 minutes late and can be
dropped during incidents. Every data workflow is written so a skipped or doubled
tick is harmless.

### Manual levers

| Goal | Where |
|---|---|
| Refresh the site now | Actions → `collect` → Run workflow |
| News-only loop for N minutes | Actions → `news-fast` → Run workflow (`minutes`) |
| Post today's reading (dry by default) | Actions → `post-daily` → Run workflow |
| Force an arena guard/turn | Actions → `arena` → Run workflow |
| Re-audit the tree | Actions → `compliance` → Run workflow |
| Last-day Actions health | Actions → `ops-health` → Run workflow |

---

## Secrets and variables

All live under **Settings → Secrets and variables → Actions**. Never commit
values. Local templates: [`.env.example`](../.env.example),
[`clipper/.env.example`](../clipper/.env.example).

### Secrets

| Name | Used by | If missing |
|---|---|---|
| `COMPLIANCE_PII_TERMS` | `compliance`, `collect` gate | Audit skips the PII tripwire |
| `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_SECRET` | `post-daily` | X path is a green no-op |
| `BSKY_HANDLE` / `BSKY_APP_PASSWORD` | `post-daily` | Bluesky path is a green no-op |
| `ANTHROPIC_API_KEY` | `arena`, `clipper` | Arena uses labelled stand-in; clipper idles |
| `OPENAI_API_KEY` / `XAI_API_KEY` / `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` | `arena` | That model uses a labelled stand-in |
| `YT_CLIENT_ID` / `YT_CLIENT_SECRET` / `YT_REFRESH_TOKEN` | `clipper` | Clipper idles |
| `YTDLP_COOKIES` | `clipper` (optional) | Only if YouTube starts demanding cookies |

### Variables

| Name | Used by | Notes |
|---|---|---|
| `CLIPPER_CHANNEL_URL` | `clipper` | Required for clipper to do work |
| `CLIPPER_CHANNEL_RIGHTS` | `clipper` | `"own"` or `"licensed"` — asserted per channel |
| `NEWS_FAST_CHAIN` | `news-fast` | Set to `off` to stop the hourly self-rearm |
| `BSKY_SERVICE` | `post-daily` | Optional Bluesky PDS override |
| `ARENA_MODEL_*` / `ARENA_STANDINS` | `arena` | Optional model id / stand-in toggles |

Rotate provider keys at least annually (`secrets-rotated` in
`compliance/manual.json`).

---

## Triage labels

Path labeler (`.github/labeler.yml`) applies area labels on every PR. Bootstrap
colours live in `.github/labels.yml` and are ensured by the labeler workflow.

| Label | Meaning |
|---|---|
| `area:collector` | Index pipeline / sources |
| `area:site` | Static site generator / templates |
| `area:workflows` | `.github/workflows` |
| `area:compliance` | Compliance rules / audit |
| `area:arena` | AI battle |
| `area:clipper` | YouTube clipper |
| `area:scanner` | Capitulation scanner |
| `area:docs` | Docs / community files |
| `area:data` | Committed JSON under `data/` |
| `dependencies` | Dependabot / lockfile bumps |
| `security` | Security-related changes |

Open an **Ops / workflow** issue when a scheduled job is red and you need a
paper trail beyond the Actions log.

---

## When something is red

1. Open the failed run → expand the failed step. Most green-path failures are
   upstream HTTP 429/5xx; the next schedule usually clears them.
2. **Do not** force-push `main` to “fix” Pages. Pages is `gh-pages`; re-run
   `collect` or `news-fast`.
3. `post-daily` red means a paid write did not happen. Check secrets, then
   re-run with `dry_run` first if unsure.
4. `compliance` red on a PR: run `npm run compliance` locally, fix findings,
   push. Do not widen `compliance/allow.json` without reading the rule.
5. Arena / scanner publish failures: check the orphan branch still exists and
   that the workflow has `contents: write`.
6. For a Monday digest of the last day of runs, open the latest `ops-health`
   summary (Actions → ops-health → job summary).

---

## Settings only the owner can flip

These return 403 for ordinary automation tokens. Click them once:

1. **Code security → Private vulnerability reporting** → Enable
2. **Code security → Dependabot alerts** (+ security updates) → Enable
3. **Actions → General**: keep “Read repository contents and packages
   permissions” as the default; workflows raise write only where documented
4. Optional: disable **Wiki** and **Projects** if unused (reduces noise)
5. Set secret `COMPLIANCE_PII_TERMS` (name, personal email, phone)

Community profile files (LICENSE, SECURITY, CONTRIBUTING, CoC, issue/PR
templates) live in the tree — merge the community-health PR if they are not on
`main` yet.
