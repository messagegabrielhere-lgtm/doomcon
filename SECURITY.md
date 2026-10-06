# Security

SIREN (this repository) is a public, read-mostly data pipeline and static site.
The index itself needs **no secrets** to collect, score, or build. Credentials
exist only for optional distribution side projects (posting, AI battle, clipper).

## Reporting a vulnerability

Open a [private security advisory](https://github.com/messagegabrielhere-lgtm/doomcon/security/advisories/new)
on this repository, or file a GitHub issue marked **security** if advisory
creation is unavailable. Do not post live API keys, tokens, or personal data in
a public issue.

We aim to acknowledge reports within a few days. Prefer coordinated disclosure:
give us time to revoke or rotate before publishing exploit details.

## What counts as in scope

- Accidental secret exposure in this repository or in a published workflow log
- Supply-chain risk in the declared npm dependencies (`package.json`,
  `clipper/package.json`)
- Cross-site scripting or open redirects introduced by the static site generator
- Privilege issues in GitHub Actions workflows (over-broad tokens, secret leakage)

## Out of scope

- Denial of service against third-party data sources we poll
- Issues that require an attacker to already hold a GitHub Actions secret
- Social-engineering of the operator's X / Bluesky / YouTube accounts
- Findings against GitHub Pages platform defaults we cannot change (custom
  response headers are limited on project Pages)

## Secrets policy

1. **Never commit secrets.** `.env` files are gitignored. Only `.env.example`
   templates belong in git.
2. **Production credentials live in GitHub Actions secrets** (Settings → Secrets
   and variables → Actions). See `.env.example` and `clipper/.env.example`.
3. **Least exposure in CI.** Posting and model keys are injected only into the
   step that needs them. Workflows without secrets configured must stay green
   no-ops.
4. **Optional PII tripwire.** Set repository secret `COMPLIANCE_PII_TERMS` to a
   comma-separated list of private strings (real name, personal email, phone).
   The compliance audit fails if any of them appear in a tracked file.
5. **Rotate annually** (or immediately after any exposure). Checklist lives in
   `compliance/manual.json` under `secrets-rotated`.

## Dependency surface

| Area | Dependencies |
|---|---|
| Index pipeline (`collector/`, `site/`, `scanner/`, `compliance/`) | None — Node 20 built-ins only |
| AI battle (`arena/`) | Root `package.json` (`@anthropic-ai/sdk`); other providers via `fetch` |
| Clipper (`clipper/`) | `clipper/package.json` (`@anthropic-ai/sdk`) |

Dependabot watches both lockfiles. Install with `npm ci --ignore-scripts` in CI
when possible so package lifecycle scripts cannot run untrusted code.

## Related automation

- `compliance/` — blocks common legal and secret-leak mistakes on every push
- `.github/workflows/compliance.yml` — strict audit gate, chart self-test, npm audit
- `.github/dependabot.yml` — weekly/monthly dependency and Actions bumps
- `SECURITY.md` / `/.well-known/security.txt` — how to reach us
- Footer and privacy page link here so visitors can find the same path

Not a bug bounty program. Thanks for helping keep a public index honest.
