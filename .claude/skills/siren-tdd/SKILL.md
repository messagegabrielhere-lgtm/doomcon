---
name: siren-tdd
description: Test-first workflow adapted for SIREN. Use when building features or fixing bugs test-first, or when the user mentions TDD / red-green.
---

# SIREN TDD

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `tdd`
(MIT) for this repo's Node built-ins + `node --test` layout.

## Seams on this repo

Agree seams with the user before writing tests. Common SIREN seams:

| Area | Public seam |
|---|---|
| Source adapter | Default export shape in `docs/CONTRACT.md` (id, fetch, parse) |
| Engine / score | Pure functions over fixtures → level + pillar scores |
| Posts / voice | `collector/posts.mjs --test` and wording rules in `docs/VOICE.md` |
| Site template | `render(ctx)` → HTML string; build with `node site/build.mjs` |
| Agent kit | CLI stdout / MCP tool results from `agent-kit/test.mjs` |

Do not test through live network when a fixture will do. Network belongs in
`collector/fetch.mjs` and is mocked or recorded at that boundary.

## Rules of the loop

1. **Red before green.** Failing test first; only enough code to pass.
2. **One slice.** One seam, one test, one minimal implementation.
3. **No speculative generality.** No config knobs or abstractions for imagined needs.
4. **Refactor later.** Review/refactor is a separate pass (`code-review` from
   mattpocock skills if installed; otherwise a surgical cleanup after green).

## Anti-patterns here

- Asserting pillar order by re-deriving the same formula in the test (tautology)
- Hitting real APIs in unit tests
- Snapshots of full HTML when a substring or structure check would do
- Adding `node_modules` imports into collector/site to make tests "easier"

## After green

Run `siren-verify` for the touched area. Keep diffs surgical (Karpathy §3).
