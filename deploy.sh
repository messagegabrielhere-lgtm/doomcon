#!/bin/sh
# Publish public/ to the gh-pages branch that GitHub Pages serves.
#
# Pages deploys from a branch rather than from Actions because the OAuth token
# this repo was set up with lacks the `workflow` scope, so .github/workflows
# cannot be pushed. A branch deploy needs no scope at all. If the workflow scope
# is granted later, collect.yml can commit here instead and this becomes a
# local-only convenience.
set -eu
ROOT=$(cd "$(dirname "$0")" && pwd)
WORK="${DOOMCON_PAGES_DIR:-$HOME/.doomcon-pages}"
[ -d "$ROOT/public" ] || { echo "no public/ — run site/build.mjs first" >&2; exit 1; }

LEVEL=$(sed -n 's/.*"level":[[:space:]]*\([0-9]*\).*/\1/p' "$ROOT/data/state.json" | head -1)
SCORE=$(sed -n 's/.*"score":[[:space:]]*\([0-9.]*\).*/\1/p' "$ROOT/data/state.json" | head -1)
STAMP=$(sed -n 's/.*"generated_at":[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT/data/state.json" | head -1)

mkdir -p "$WORK"
if [ ! -d "$WORK/.git" ]; then
  (cd "$WORK" && git init -q && git checkout -q -b gh-pages \
   && git remote add origin https://github.com/messagegabrielhere-lgtm/doomcon.git)
fi
# Wipe tracked content so deletions propagate, then repopulate from public/.
find "$WORK" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
tar cf - -C "$ROOT/public" . | (cd "$WORK" && tar xf -)

cd "$WORK"
git add -A
# "Nothing to commit" does NOT mean "nothing to publish". A previous run may
# have committed and then lost the push race against the news-fast loop, which
# is exactly what happened on 2026-09-24 — the directory aliases sat in a local
# commit while the live site 404'd on them. Only skip when the remote already
# has this exact tree.
if git diff --cached --quiet; then
  git fetch -q origin gh-pages 2>/dev/null || true
  if git rev-parse --verify -q HEAD >/dev/null &&
     [ "$(git rev-parse HEAD)" = "$(git rev-parse -q --verify origin/gh-pages || echo none)" ]; then
    echo "no change to publish"; exit 0
  fi
  echo "nothing new to commit, but the remote is behind — pushing the existing commit" >&2
else
git -c user.name="Gabriel Tornberg" -c user.email="messagegabrielhere@gmail.com" \
    commit -q -m "DOOMCON $LEVEL, score $SCORE — $STAMP

Build output from messagegabrielhere-lgtm/doomcon@main. Do not hand-edit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
fi
# Retry on a lost race. The news-fast Actions loop force-pushes gh-pages every
# minute, so a local publish and a CI publish WILL collide eventually — the
# first one did, with "cannot lock ref". Both write the same build output, so
# losing the race is harmless; we just need to try again rather than fail.
for attempt in 1 2 3 4 5; do
  if git push -q -f origin gh-pages 2>/dev/null; then
    echo "published DOOMCON $LEVEL score $SCORE ($STAMP)"
    exit 0
  fi
  echo "gh-pages push lost a race (attempt $attempt); retrying" >&2
  git fetch -q origin gh-pages 2>/dev/null || true
  sleep 4
done
echo "could not publish after 5 attempts — is the news-fast loop mid-push?" >&2
exit 1
