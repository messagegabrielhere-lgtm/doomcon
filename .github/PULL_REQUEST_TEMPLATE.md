## Summary

<!-- What changed, and why. Link the issue if there is one. -->

## Touches

- [ ] Index scoring / pillars / levels
- [ ] Frozen reference (`data/reference.json`) — **needs explicit rationale**
- [ ] Source adapters (`collector/sources/`)
- [ ] Receipts / verification
- [ ] Static site (`site/`)
- [ ] GitHub Actions / secrets surface
- [ ] Arena / clipper / other side project
- [ ] Docs only

## Test plan

- [ ] `npm run compliance` (or `node compliance/audit.mjs --strict`)
- [ ] Relevant unit / self-tests (e.g. `npm run test:arena`, `npm run test:posts`)
- [ ] If scoring changed: local collect → score → compare receipt / state shape
- [ ] If site changed: `node site/build.mjs` and spot-check the page

## Notes

<!-- Screenshots, migration steps, follow-ups for the operator. -->
