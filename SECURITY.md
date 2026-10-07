# Security policy

## Supported surfaces

This repository publishes a static site and an open collector. Please report
issues that affect:

- Secret leakage (API keys, tokens, private credentials in the repo or builds)
- Cross-site scripting or injection in generated HTML, embeds, or the JSON API
- Supply-chain risk in GitHub Actions or committed dependencies
- Abuse of the public API that could harm GitHub Pages hosting or upstream sources
- Anything that would make the privacy page false (tracking, cookies we claim not to set)

Out of scope for “security” reports (use a normal issue instead): methodology
disputes, score disagreements, and copy edits.

## How to report

**Preferred:** open a private vulnerability report on this repository:

https://github.com/messagegabrielhere-lgtm/doomcon/security/advisories/new

If that form is unavailable, open a public issue titled `security:` with **no
secrets or exploit details in the first message**, and ask for a private channel.

Do not post live credentials, cookies, or personal data in issues or pull
requests.

## What to include

- Affected URL, file, or workflow
- Steps to reproduce (or a clear description if reproduction is unsafe)
- Impact you believe it has
- Any suggested fix

## Response

We aim to acknowledge reports within a few days and to ship a fix or mitigation
for confirmed issues as soon as practical. Credit is offered in release notes
when the reporter wants it.

## Operator checklist (not public)

Repo maintainers should keep these true:

1. `COMPLIANCE_PII_TERMS` is set so private identifiers cannot land in the tree.
2. Provider API keys used by Actions are rotated at least yearly; old keys revoked.
3. `npm run compliance` stays green on every push (already gated in CI).
4. The X bot account carries the Automated label and a bio that names a human-run account, if automation is enabled.
