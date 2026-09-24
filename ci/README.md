# CI workflows, parked

These two files are GitHub Actions workflows. They live here rather than in
`.github/workflows/` for one reason: the token this repo is pushed with does not
carry the `workflow` scope, and GitHub refuses any push that creates or updates a
workflow file without it.

Nothing is broken by this. The site deploys from the `gh-pages` branch, which
needs no Actions at all — `deploy.sh` publishes `public/` there directly.

To turn on automatic 15-minute collection:

    gh auth refresh -h github.com -s workflow
    mkdir -p .github/workflows && git mv ci/workflows/*.yml .github/workflows/
    git commit -m "Enable scheduled collection" && git push

`collect.yml` runs the collectors, scores, rebuilds and commits the result.
`pages.yml` deploys via Actions — only needed if you switch Pages away from the
`gh-pages` branch source.
