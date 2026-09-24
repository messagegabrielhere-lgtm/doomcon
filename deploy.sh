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
if git diff --cached --quiet; then echo "no change to publish"; exit 0; fi
git -c user.name="Gabriel Tornberg" -c user.email="messagegabrielhere@gmail.com" \
    commit -q -m "DOOMCON $LEVEL, score $SCORE — $STAMP

Build output from messagegabrielhere-lgtm/doomcon@main. Do not hand-edit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push -q -f origin gh-pages
echo "published DOOMCON $LEVEL score $SCORE ($STAMP)"
