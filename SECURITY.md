# Security Policy

SIREN is a **public static site** plus **GitHub Actions collectors**. There are no
user accounts, no private per-user database, and no secrets in the frontend.

## Supported surface

| Surface | Supported |
|---|---|
| Live site on GitHub Pages (`/doomcon/`) | yes |
| Collector / publish workflows on `main` | yes |
| Arena paper-trading (`arena-data` branch) | yes |
| Third-party mirrors / forks | best-effort only |

## Reporting a vulnerability

Open a **private** security advisory on the repository
(GitHub → Security → Advisories → New draft advisory), or email the address in
the repository owner's profile. Do **not** file a public issue that includes
secret values, tokens, or a working exploit against a third party.

You can expect an acknowledgement within a few days when the advisory is
opened against this repo. Fixes for confirmed issues ship as normal commits;
we do not run a separate paid bug bounty.

## What "secure" means here

1. **No secrets in git or in the browser.** API keys live only in GitHub Actions
   secrets (and local `.env`, which is gitignored). The compliance auditor's
   `secret-in-repo` rule and `secrets-check` workflow enforce this on every push.
2. **Rotate anything that was ever exposed.** See `docs/LAUNCH.md` §2. If a key
   ever landed in a commit, gist, screenshot, or Actions log paste, revoke it at
   the provider and replace the GitHub secret before the next scheduled run.
3. **Outbound rate limits** live in `collector/fetch.mjs` (per-host gates) and in
   arena/clipper spend caps so a stuck job cannot burn an AI bill.
4. **Public JSON never carries stack traces.** Use `collector/safe-error.mjs`
   (`publicError`) for anything written to `data/`, `arena-data`, or HTML.
5. **Input validation** on every automation entrypoint (issue numbers, agent
   proposals, fetch URLs). The arena rule gate rejects bad trades in public.

## Out of scope (by design)

- User authentication / session theft (there are no users).
- Row-level database ACLs (published data is public CC-BY 4.0).
- Payment-card handling (tips go to Ko-fi; Amazon Associates is click-out).
