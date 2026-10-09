# Rollback plan — launch day

Read this **before** you tweet the URL. When something is wrong, you will not
want to invent a plan under pressure.

The live site is the `gh-pages` branch (force-pushed by `collect.yml` /
`deploy.sh`). Source of truth for data is `main` (`data/`). Arena state is the
`arena-data` branch. Treat them separately.

---

## Severity triage (30 seconds)

| What you see | Severity | First move |
|---|---|---|
| Wrong number / dark pillar, rest of site fine | low | wait for next collect, or Actions → collect → Run workflow |
| Homepage 404 / blank / yesterday's reading stuck | high | rollback `gh-pages` (§A) |
| Secrets leaked or bill spiking | critical | kill switches (§C) then rotate keys |
| Bad commit on `main` broke the collector | high | revert commit on `main` (§B), then republish |
| Arena doing something insane | medium | disable arena workflow / set spend cap to 0 (§C) |

---

## A. Roll back the live site (`gh-pages`)

GitHub Pages serves whatever `gh-pages` HEAD is. Older commits are still in that
branch's history **until** the next orphan force-push — the publish step writes
an orphan commit, so **keep a known-good tarball**.

### Preferred: restore from a backup you took

```bash
# You did this before launch (docs/LAUNCH.md §10):
node collector/tools/backup.mjs backup
# …bad deploy happens…
node site/build.mjs          # rebuild from current or restored data/
./deploy.sh                  # force-pushes a fresh gh-pages
```

### Restore data, then rebuild

```bash
node collector/tools/backup.mjs restore .backups/data-<stamp>
node site/build.mjs
./deploy.sh
```

### Pin Actions while you dig

Repo → Actions → select `collect` / `news-fast` → ⋯ → **Disable workflow**.
Re-enable when green. Disabling stops further force-pushes from fighting you.

### Nuclear: empty Pages

Settings → Pages → temporary unpublish, or push a one-file `index.html` that
says "back shortly" pointing at `/500.html` copy. Prefer a real rebuild.

---

## B. Roll back `main` (collector / templates)

```bash
git fetch origin main
git log --oneline origin/main -20          # find last known-good SHA
git revert <bad-sha>                       # preferred: adds a new commit
# or, if you just pushed and are alone on the branch:
# git reset --hard <good-sha> && git push --force-with-lease
```

Then run collect once (Actions → collect → Run workflow) so `gh-pages` matches.

**Do not** force-push `main` if the news/collect bots are mid-commit; disable
those workflows first (§A).

---

## C. Kill switches (bill / abuse / leaked key)

| Switch | How |
|---|---|
| Stop all automations | Actions → disable `collect`, `news-fast`, `arena`, `clipper`, `post-daily` |
| Arena AI spend → $0 | repo variable `ARENA_DAILY_USD_CAP=0` (baselines still run) |
| Clipper AI off | repo variable `CLIPPER_AI_DISABLED=true` |
| Stop social posts | ensure `POST_MODE` is not `live`, or remove X/Bluesky secrets temporarily |
| Revoke a leaked key | provider console revoke → replace GitHub secret → `secrets-check` |

---

## D. Communications

1. Post on X **without a URL** (GO-LIVE.md rule) if the card would show a bad
   number: "Desk dark — checking receipts." Link stays in the bio only.
2. Site: the existing `/500.html` is the honest status page; you can soft-link
   it from the homepage strip if the index itself is lying.
3. GitHub issue with label `incident` for your own trail; close it when restored.

---

## E. After restore — prove it

```bash
node collector/tools/backup.mjs selftest
npm run compliance
npm run build && npm run test:launch
curl -sI https://messagegabrielhere-lgtm.github.io/doomcon/ | head
curl -s https://messagegabrielhere-lgtm.github.io/doomcon/api/state.json | head -c 200
```

Confirm GoatCounter still receives a hit, then re-enable workflows one at a time
(`collect` first, then `news-fast`, then the rest).

---

## F. What rollback cannot fix

- A secret that was committed and pulled by others — only rotation + provider
  revoke (§C + LAUNCH §2).
- App Store / domain DNS — out of band; keep registrar login handy.
- X account suspension — appeal on X; the site still stands alone.
