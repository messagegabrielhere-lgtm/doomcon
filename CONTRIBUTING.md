# Contributing

SIREN is an open, recomputable index. Contributions that keep it that way are welcome.

## Before you write code

1. Read [docs/METHODOLOGY.md](docs/METHODOLOGY.md) — what the number means, and how it can mislead.
2. Read [docs/CONTRACT.md](docs/CONTRACT.md) — hard constraints (zero deps for the index pipeline, reproducible output, shared fetch helper).
3. Open an issue first for anything that changes the score formula, the frozen reference, or a public API shape.

Security reports: prefer a [private advisory](https://github.com/messagegabrielhere-lgtm/doomcon/security/advisories/new). Details are in [SECURITY.md](SECURITY.md). Do not paste live secrets into a public issue.

Operator map for Actions schedules, secrets, and red-run triage: [docs/GITHUB.md](docs/GITHUB.md). Support channels: [SUPPORT.md](SUPPORT.md).

## Run the pipeline

Node 20+. No install is required for the index path.

```bash
# Docker (no local Node required)
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/collect.mjs

# Or locally
node collector/collect.mjs
node collector/engine.mjs
node site/build.mjs
```

| Step | Command |
|---|---|
| Collect | `node collector/collect.mjs` |
| Score | `node collector/engine.mjs` |
| Build site | `node site/build.mjs` |
| Compliance | `npm run compliance` |
| Arena tests | `npm run test:arena` |

`collector/backfill.mjs` rebuilds `data/reference.json`. **Do not regenerate it casually** — the reference distribution is frozen on purpose. A PR that touches it needs an explicit rationale in the description.

## Add a source

Drop a file in `collector/sources/`. It is discovered automatically.

```js
export default {
  id: 'my-source',
  pillar: 'capability', // capability | compute | attention | governance | markets
  label: 'Human-readable name',
  async collect(fetchJson) {
    const data = await fetchJson('https://…')
    return { value: 42, unit: 'things/day', meta: { /* optional */ } }
  },
}
```

Rules:

- `value` must be a finite number.
- Higher always means more activity (negate inside the adapter if needed).
- **Throw on failure** — never return a fallback. A dark source is a first-class state.
- Use the injected `fetchJson` (from `collector/fetch.mjs`). Do not call `fetch()` directly.
- A new source does **not** enter the index until it is added to the frozen reference. Adding an adapter alone must not move history.

## Verify a receipt

Receipts are hash-chained under `data/receipts/`. `verifyChain()` in `collector/receipts.mjs` re-derives every hash. A receipt records what was fetched at score time, not what the upstream source says today.

## Pull requests

- Keep the index pipeline dependency-free. Optional npm surfaces (`arena/`, `clipper/`, `investors/` job install) stay out of the collector/site path.
- Prefer one concern per PR.
- Say whether the change touches scoring, the reference, workflows, or the static site.
- Run `npm run compliance` (and any relevant tests) before you ask for review.

## What does not belong here

- Secrets, personal contact details, or live API keys.
- Trackers, ads, or analytics that contradict the privacy page.
- Changes that make the published number unrecomputable from this repo.
