# Security

The live site is whatever is on `main` and published to `gh-pages`. There are no versioned releases. The index pipeline (`collector/`, `site/`) uses Node built-ins only. Credentials exist only for optional side jobs (posting, the AI battle, the clipper).

## Reporting a vulnerability

Report privately. Do not open a public issue for a security problem, and do not include live API keys or tokens.

1. Open a [private security advisory](https://github.com/messagegabrielhere-lgtm/doomcon/security/advisories/new) on this repository.
2. If that page is unavailable, email messagegabrielhere@gmail.com. Include the affected path and what an attacker can do.

You should get an acknowledgement within 7 days. A fix lands on `main` before any public write-up.

## In scope

- A secret committed to this repository or printed in a workflow log
- Supply-chain risk in the declared npm dependencies (`package.json`, `clipper/package.json`) or in a GitHub Action
- Cross-site scripting or an open redirect introduced by the static site
- A workflow token that can do more than its job needs

## Out of scope

- Denial of service against a third-party feed this repo polls
- A finding that already requires a GitHub Actions secret
- Account takeover of the operator's X, Bluesky, or YouTube accounts

This is not a bug bounty.
