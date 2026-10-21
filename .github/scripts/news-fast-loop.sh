#!/usr/bin/env bash
set -uo pipefail
# Token for gh-pages remote (Actions provides GITHUB_TOKEN).
: "${GITHUB_TOKEN:=${GH_TOKEN:-}}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
# workflow_dispatch can set MINUTES. Refuse anything that is not a
# whole number so it cannot change the arithmetic below.
case "$MINUTES" in
  ''|*[!0-9]*) echo "::error::minutes must be a whole number"; exit 1 ;;
esac
END=$(( $(date +%s) + MINUTES * 60 ))
PUBLISHED=0
TICK=0
LAST_WAKE=0
# FINDABILITY #112 — GitHub Pages rejects builds when news-fast pushes
# every minute (duration:0 "Page build failed" streak after 07:41Z
# 2026-10-15). Batch Pages publishes so a build can finish; news.json
# on main still updates every tick via the hourly Commit step.
# PENDING_PUB holds a change until the gap elapses.
# FINDABILITY #117 — 300s still left Pages mostly errored under load;
# 600s gives ~80s builds room between pushes once this tip re-arms.
PUBLISH_MIN_GAP=600
LAST_PAGES_PUB=0
PENDING_PUB=0

# FINDABILITY #118 — LAST_PAGES_PUB=0 made AGO ≈ epoch and forced an
# immediate first publish on every newly armed job (raced collect /
# prior news-fast tip; Pages errored again at 09:00Z). Keep the gap
# clock honest from the live tip, including mid-loop collect pushes.
refresh_last_pages_pub() {
  local tip_iso tip_epoch
  tip_iso=$(gh api "repos/${GITHUB_REPOSITORY}/commits/gh-pages" \
    --jq '.commit.committer.date' 2>/dev/null || true)
  if [ -n "${tip_iso:-}" ]; then
    tip_epoch=$(date -d "$tip_iso" +%s 2>/dev/null || true)
    if [ -n "${tip_epoch:-}" ] && [ "$tip_epoch" -gt "$LAST_PAGES_PUB" ] 2>/dev/null; then
      LAST_PAGES_PUB=$tip_epoch
    fi
  fi
}

# FINDABILITY #98 — main has no public/; --only news falls through to a
# full wipe (~44m) when public/index.html is missing, which ate the
# entire 58m news-fast budget on tick 1 and left Google News on a
# 7h+ stale news-sitemap (run 38666831944). Seed once from gh-pages
# before the loop (same pattern as collect.yml #94).
if [ ! -f public/index.html ]; then
  echo "seeding public/ from gh-pages for news-only builds"
  rm -rf .pages-seed
  if git clone --depth 1 --branch gh-pages \
    "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
    .pages-seed; then
    # Prefer git %ct when the clone succeeds (no extra API call).
    tip_ct=$(git -C .pages-seed log -1 --format=%ct 2>/dev/null || true)
    if [ -n "${tip_ct:-}" ] && [ "$tip_ct" -gt 0 ] 2>/dev/null; then
      LAST_PAGES_PUB=$tip_ct
      echo "FINDABILITY #118: LAST_PAGES_PUB seeded from gh-pages tip (${tip_ct}; $(( $(date +%s) - tip_ct ))s ago)"
    fi
    mkdir -p public
    tar cf - -C .pages-seed --exclude .git . | tar xf - -C public
    rm -rf .pages-seed
  else
    echo "::warning::could not seed public/ from gh-pages; first --only news may fall back to a full build"
    rm -rf .pages-seed
  fi
fi
# API fallback when clone skipped/failed, and a baseline before tick 1.
if [ "$LAST_PAGES_PUB" -eq 0 ]; then
  refresh_last_pages_pub
  if [ "$LAST_PAGES_PUB" -gt 0 ]; then
    echo "FINDABILITY #118: LAST_PAGES_PUB seeded via API (${LAST_PAGES_PUB}; $(( $(date +%s) - LAST_PAGES_PUB ))s ago)"
  fi
fi

while [ "$(date +%s)" -lt "$END" ]; do
  TICK=$((TICK + 1))
  START=$(date +%s)

  # EVERY TICK BUILDS FROM THE NEWEST MAIN, not from the commit this
  # job checked out when it started up to fifty minutes ago. Without
  # this the loop republished its start-of-job copy of state.json and
  # the templates over every newer deploy: measured 2026-09-28, the
  # live headline read 39.2 as of 23:19 UTC while main held 39.6 as of
  # 02:22, three hours and two full index passes later, and every
  # template change pushed mid-hour was reverted within a minute.
  # Everything is refreshed except the two files this loop owns and
  # carries forward between ticks. WORKING TREE ONLY: `git checkout
  # <commit> -- .` would also stage every refreshed file, and the
  # hourly commit below would then carry a tick-old copy of main and
  # conflict when it rebases onto the real one.
  # The leader wire's four files are carried forward too (the loop
  # refreshes them every tick, see below) — and main's copies of the
  # three memory files are staged aside so the collector can fold
  # them in rather than be overwritten by them.
  # The breaking clusters, the speed ledger and the X-search budget
  # ledger are this loop's own state too, carried tick to tick.
  OWN_X=(':(exclude)data/breaking.json' ':(exclude)data/sightings.json' ':(exclude)data/xai-usage.json')
  LEADERS_X=(':(exclude)data/leaders.json' ':(exclude)data/leaders-coverage.json' ':(exclude)data/leaders-profiles.json' ':(exclude)data/leaders-feeds.json')
  MAIN_LEADERS="${RUNNER_TEMP:-/tmp}/main-leaders"
  rm -rf "$MAIN_LEADERS"; mkdir -p "$MAIN_LEADERS"
  if git fetch -q --depth=1 origin main 2>/dev/null; then
    git restore --source=FETCH_HEAD --worktree -- . ':(exclude)data/news.json' ':(exclude)data/x-surface.json' ':(exclude)data/bsky-surface.json' "${OWN_X[@]}" "${LEADERS_X[@]}" \
      || echo "::warning::tick $TICK could not refresh from main; building from the previous tick's tree"
    for f in leaders-coverage.json leaders-profiles.json leaders-feeds.json; do
      git show "FETCH_HEAD:data/$f" > "$MAIN_LEADERS/$f" 2>/dev/null || rm -f "$MAIN_LEADERS/$f"
    done
  else
    echo "::warning::tick $TICK could not fetch main; building from the previous tick's tree"
  fi

  # WAKE THE INDEX PASS IF THE CRON DID NOT. Measured 2026-10-04: the
  # hourly schedule in collect.yml fired at 05:15, then not again
  # until 10:49. GitHub drops scheduled runs under load and says so.
  # A reading that is already past its hour is overdue: when the
  # newest state on main is more than 50 minutes old this loop asks
  # for a full pass itself, at most once every 15 minutes, so a
  # dropped :07 cron does not leave the page sitting on last hour's
  # number for another twenty minutes of slack.
  # workflow_dispatch is one of the two events GITHUB_TOKEN is
  # allowed to raise.
  AGE=$(node -e "try{const s=require('./data/state.json');process.stdout.write(String(Math.round((Date.now()-Date.parse(s.generated_at))/60000)))}catch(e){process.stdout.write('0')}")
  # Also wake a full pass when the newest reading is rate-limit
  # degraded. A green collect that published DEGRADED for arXiv 429
  # never trips the failure watchdog; without this the page sits
  # degraded until the next :07 cron. Age floor 15 min so we do not
  # re-hammer the same ban the heal step just waited out.
  NEED_HEAL=$(node -e "
    try {
      const s = require('./data/state.json');
      const rate = /\b429\b|rate exceeded|too many requests/i;
      const limited = (s.sources || []).some((x) => x && !x.ok && !x.uncalibrated && rate.test(String(x.error || '')));
      const age = (Date.now() - Date.parse(s.generated_at)) / 60000;
      process.stdout.write(s.degraded && limited && age >= 15 ? '1' : '0');
    } catch { process.stdout.write('0'); }
  ")
  NOW=$(date +%s)
  if { [ "$AGE" -gt 50 ] || [ "$NEED_HEAL" = "1" ]; } && [ $(( NOW - LAST_WAKE )) -gt 900 ] && [ "${CHAIN:-on}" != "off" ]; then
    if [ "$NEED_HEAL" = "1" ]; then
      echo "tick $TICK: reading is rate-limit degraded (${AGE} min old) — dispatching a heal full pass"
    else
      echo "tick $TICK: newest reading is ${AGE} min old — dispatching the full index pass"
    fi
    gh workflow run collect.yml --repo "$GITHUB_REPOSITORY" -f mode=full || echo "::warning::could not dispatch collect.yml"
    LAST_WAKE=$NOW
  fi

  # Hash before/after. news.mjs rewrites the file every run (the
  # timestamp alone changes), so comparing the whole file would
  # publish every minute regardless. Compare the ITEMS only.
  # The breaking strip counts as a change too: a second outlet joining
  # an existing item moves no item id but can make a story BREAKING.
  # run.surface (news.mjs) adds title / corroboration / story-membership
  # moves that leave the id set alone; score decay never moves it.
  NFP() { node -e "let k=[];try{const n=require('./data/news.json');k.push(n.items.map(i=>i.id),n.run&&n.run.surface||'')}catch{k.push('none')}try{k.push(require('./data/breaking.json').clusters.map(c=>[c.id,c.live,c.corroboration]))}catch{}process.stdout.write(require('crypto').createHash('sha256').update(JSON.stringify(k)).digest('hex'))"; }
  BEFORE=$(NFP)

  XAI_API_KEY="$NEWS_XAI_KEY" node collector/news.mjs || echo "::warning::news pass $TICK failed; continuing"

  # Social surfaces are slower than the newsroom tick. Refresh them
  # every fifth minute so HN/Techmeme/Lobsters/Bluesky stay current
  # without burning the oEmbed budget every sixty seconds.
  if [ $(( TICK % 5 )) -eq 0 ]; then
    node collector/x-surface.mjs || echo "::warning::x-surface pass $TICK failed; continuing"
    node collector/bsky-surface.mjs || echo "::warning::bsky-surface pass $TICK failed; continuing"
  fi

  AFTER=$(NFP)

  # THE LEADER WIRE, EVERY TICK, BUT NOT EVERY TICK'S NETWORK.
  # collector/leaders.mjs re-reads news.json each tick (pure, no
  # network) and asks Google News, Wikipedia and the official feeds
  # only when its own stamps say 15 minutes (profiles: a day) have
  # passed. --adopt folds in main's memory first, so a search the
  # 15-minute lane in collect.yml ran minutes ago is not run again
  # here: this loop only searches when that lane is late or dropped.
  # This loop never commits the leader files (collect.yml does); it
  # only republishes /leaders.html when what a reader sees changed.
  LFP() { node -e "try{process.stdout.write(String(require('./data/leaders.json').fingerprint||'none'))}catch(e){process.stdout.write('none')}"; }
  LBEFORE=$(LFP)
  timeout 100 node collector/leaders.mjs --adopt "$MAIN_LEADERS" >/dev/null \
    || echo "::warning::leader wire pass $TICK failed; continuing"
  LAFTER=$(LFP)

  # FINDABILITY #149 — Google Trends firehose spikes (e.g. micron stock)
  # cool in under an hour. collect.yml only refreshes search-trends on
  # the hourly pass; without a news-fast poll, tip search-trends.html
  # stays on a pre-spike snapshot while main's data/ already moved.
  # Two RSS geos; keep prior file on failure (collector is continue-safe).
  TFP() { node -e "try{const t=require('./data/search-trends.json');const hits=(t.head_terms||[]).filter(h=>h&&h.trending).map(h=>h.id).sort().join(',');process.stdout.write(String(t.generated_at||'')+'|'+hits)}catch(e){process.stdout.write('none')}"; }
  TBEFORE=$(TFP)
  timeout 45 node collector/search-trends.mjs \
    || echo "::warning::search-trends pass $TICK failed; continuing"
  TAFTER=$(TFP)

  if [ "$BEFORE" != "$AFTER" ] || [ "$LBEFORE" != "$LAFTER" ] || [ "$TBEFORE" != "$TAFTER" ]; then
    PENDING_PUB=1
    if [ "$TBEFORE" != "$TAFTER" ]; then
      echo "tick $TICK: newsroom, leader wire, or search-trends changed — pending Pages publish"
    else
      echo "tick $TICK: newsroom or leader wire changed — pending Pages publish"
    fi
  else
    echo "tick $TICK: no change"
  fi

  # FINDABILITY #118 — collect (or another publisher) may have pushed
  # gh-pages since our last local publish; re-read tip before gap math.
  refresh_last_pages_pub
  NOW_PUB=$(date +%s)
  AGO=$(( NOW_PUB - LAST_PAGES_PUB ))
  if [ "$PENDING_PUB" -eq 1 ] && [ "$AGO" -lt "$PUBLISH_MIN_GAP" ]; then
    echo "tick $TICK: deferring Pages publish (FINDABILITY #112/#118; ${AGO}s since last, need ${PUBLISH_MIN_GAP}s)"
  elif [ "$PENDING_PUB" -eq 1 ]; then
    echo "tick $TICK: fast rebuild and publish (gap ${AGO}s ≥ ${PUBLISH_MIN_GAP}s)"
    # --only news: patch the live tree instead of wiping ~1,200 files.
    # Cards / posts / post-sheet are hourly (collect.yml); they are not
    # what makes the newsroom feel current.
    # FINDABILITY #99 — never fall back to a full wipe here. Without
    # public/index.html, build.mjs --only news used to start a ~44m
    # full rebuild that ate the 58m job and published nothing
    # (run 38666831944). Prefer a mid-loop re-seed + timed news-only,
    # or skip this tick and let the next one retry.
    if [ ! -f public/index.html ]; then
      echo "tick $TICK: public/ missing — re-seeding from gh-pages"
      rm -rf .pages-seed
      if git clone --depth 1 --branch gh-pages \
        "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
        .pages-seed; then
        mkdir -p public
        tar cf - -C .pages-seed --exclude .git . | tar xf - -C public
        rm -rf .pages-seed
      else
        rm -rf .pages-seed
        echo "::warning::tick $TICK: could not re-seed public/; skipping publish"
        sleep 30
        continue
      fi
    fi
    # FINDABILITY #104 — seeded public/ needs the same 8GB floor as collect.
    # FINDABILITY #106 — 900s floor after #103/#106 slim path; 480s still
    # timed out on tip c4993bcf while archive day hubs + full sitemap ran.
    if ! NODE_OPTIONS=--max-old-space-size=8192 timeout 900 node site/build.mjs --only news --quiet; then
      echo "::warning::news-only build failed or timed out on tick $TICK; skipping full wipe fallback"
      sleep 30
      continue
    fi

    # Overlay onto the live gh-pages tip instead of re-tarring the
    # whole 90MB+ site. Keep .pages across ticks: a fresh shallow
    # clone is ~100MB / ~2–3s every publish; fetch+reset is seconds
    # cheaper once the working copy exists. rsync then skips the
    # ~31MB of item briefs whose bytes/mtimes did not move.
    # Falls back to a full orphan publish if refresh or push fails.
    PUB_OK=0
    PAGES_REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
    # FINDABILITY #114 — news-only / orphan trees omit conquest short
    # aliases (#111/#113). Orphan publish wiped /vs/skynet.html from
    # tip within minutes. Primaries already carry the right canonical;
    # re-copy them onto the typed-guess paths before every commit.
    restore_vs_aliases() {
      local root="$1"
      mkdir -p "$root/vs"
      [ -f "$root/vs/doombench.html" ] && cp -a "$root/vs/doombench.html" "$root/vs/doom.html"
      [ -f "$root/vs/skynet-countdown.html" ] && cp -a "$root/vs/skynet-countdown.html" "$root/vs/skynet.html"
      [ -f "$root/vs/takeofftracker.html" ] && cp -a "$root/vs/takeofftracker.html" "$root/vs/takeoff.html"
      # FINDABILITY #124 — /trends short alias + Outrank directory indexes.
      if [ -f "$root/search-trends.html" ]; then
        cp -a "$root/search-trends.html" "$root/trends.html"
        mkdir -p "$root/trends" "$root/search-trends"
        cp -a "$root/search-trends.html" "$root/trends/index.html"
        cp -a "$root/search-trends.html" "$root/search-trends/index.html"
      fi
      if [ -f "$root/verify.html" ]; then
        mkdir -p "$root/verify"
        cp -a "$root/verify.html" "$root/verify/index.html"
      fi
      if [ -f "$root/free-tools.html" ]; then
        mkdir -p "$root/free-tools"
        cp -a "$root/free-tools.html" "$root/free-tools/index.html"
      fi
      if [ -f "$root/ai-prediction-markets.html" ]; then
        mkdir -p "$root/ai-prediction-markets"
        cp -a "$root/ai-prediction-markets.html" "$root/ai-prediction-markets/index.html"
      fi
      # FINDABILITY #129 — unhyphenated /pdoom typed guess.
      if [ -f "$root/p-doom.html" ]; then
        cp -a "$root/p-doom.html" "$root/pdoom.html"
        mkdir -p "$root/pdoom"
        cp -a "$root/p-doom.html" "$root/pdoom/index.html"
      fi
      # FINDABILITY #252 — /ai-activity-index typed guess (canonical on /).
      # FINDABILITY #262 — /ai-activity-level typed guess (canonical on /).
      if [ -f "$root/index.html" ]; then
        cp -a "$root/index.html" "$root/ai-activity-index.html"
        mkdir -p "$root/ai-activity-index"
        cp -a "$root/index.html" "$root/ai-activity-index/index.html"
        cp -a "$root/index.html" "$root/ai-activity-level.html"
        mkdir -p "$root/ai-activity-level"
        cp -a "$root/index.html" "$root/ai-activity-level/index.html"
      fi
      # FINDABILITY #133 — doomsday-clock / ai-doom / doom-index typed guesses.
      if [ -f "$root/ai-doomsday-clock.html" ]; then
        cp -a "$root/ai-doomsday-clock.html" "$root/doomsday-clock.html"
        mkdir -p "$root/doomsday-clock"
        cp -a "$root/ai-doomsday-clock.html" "$root/doomsday-clock/index.html"
      fi
      if [ -f "$root/guide.html" ]; then
        cp -a "$root/guide.html" "$root/ai-doom.html"
        mkdir -p "$root/ai-doom"
        cp -a "$root/guide.html" "$root/ai-doom/index.html"
      fi
      if [ -f "$root/compare.html" ]; then
        cp -a "$root/compare.html" "$root/doom-index.html"
        cp -a "$root/compare.html" "$root/ai-doom-index.html"
        mkdir -p "$root/doom-index" "$root/ai-doom-index"
        cp -a "$root/compare.html" "$root/doom-index/index.html"
        cp -a "$root/compare.html" "$root/ai-doom-index/index.html"
      fi
      # FINDABILITY #131 — root rival brand typed guesses (canonical on /vs/*).
      if [ -f "$root/vs/doombench.html" ]; then
        cp -a "$root/vs/doombench.html" "$root/doombench.html"
        cp -a "$root/vs/doombench.html" "$root/doom.html"
        mkdir -p "$root/doombench" "$root/doom"
        cp -a "$root/vs/doombench.html" "$root/doombench/index.html"
        cp -a "$root/vs/doombench.html" "$root/doom/index.html"
      fi
      if [ -f "$root/vs/skynet-countdown.html" ]; then
        cp -a "$root/vs/skynet-countdown.html" "$root/skynet-countdown.html"
        cp -a "$root/vs/skynet-countdown.html" "$root/skynet.html"
        mkdir -p "$root/skynet-countdown" "$root/skynet"
        cp -a "$root/vs/skynet-countdown.html" "$root/skynet-countdown/index.html"
        cp -a "$root/vs/skynet-countdown.html" "$root/skynet/index.html"
      fi
      if [ -f "$root/vs/pizzint.html" ]; then
        cp -a "$root/vs/pizzint.html" "$root/pizzint.html"
        mkdir -p "$root/pizzint"
        cp -a "$root/vs/pizzint.html" "$root/pizzint/index.html"
      fi
      if [ -f "$root/vs/takeofftracker.html" ]; then
        cp -a "$root/vs/takeofftracker.html" "$root/takeofftracker.html"
        cp -a "$root/vs/takeofftracker.html" "$root/takeoff.html"
        mkdir -p "$root/takeofftracker" "$root/takeoff"
        cp -a "$root/vs/takeofftracker.html" "$root/takeofftracker/index.html"
        cp -a "$root/vs/takeofftracker.html" "$root/takeoff/index.html"
      fi
    }
    # FINDABILITY #128 — orphan tar of a stale seeded public/ can wipe
    # #126/#127 conquest FAQ hubs. Restore tip copies when needles missing.
    restore_conquest_faqs() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/compare.html" ] \
        && ! grep -q 'How do you compare AI doom indexes' "$root/compare.html" 2>/dev/null; then
        cp -a "$preserve/compare.html" "$root/compare.html"
        mkdir -p "$root/compare"
        cp -a "$preserve/compare.html" "$root/compare/index.html"
        echo "restored compare.html conquest FAQ hub (#128)"
      fi
      if [ -f "$preserve/alternatives.html" ] \
        && ! grep -q 'What is an AI doom index alternative' "$root/alternatives.html" 2>/dev/null; then
        cp -a "$preserve/alternatives.html" "$root/alternatives.html"
        mkdir -p "$root/alternatives"
        cp -a "$preserve/alternatives.html" "$root/alternatives/index.html"
        echo "restored alternatives.html conquest FAQ hub (#128)"
      fi
    }
    # FINDABILITY #136/#139 — restore tip agents.md / llms.txt when
    # #134 head-term or #132 root needles are missing, or when
    # llms.txt lists /lab/openai.html without #138 labAboutLabel
    # (OpenAI / ChatGPT) after overlay/orphan.
    restore_agent_maps() {
      local root="$1" preserve="$2"
      local map
      for map in agents.md llms.txt; do
        # FINDABILITY #136/#139 — head-term / root / labAboutLabel needles.
        # FINDABILITY #156 — also restore when Trends tips for IREN→Watts,
        # dram→Micron, or CoreWeave→lab are missing after orphan Publish
        # from tip < #153/#154/#155 (collect newsroom force-push wipe).
        if [ -f "$preserve/$map" ] \
          && { ! grep -qF '/ai-doom.html' "$root/$map" 2>/dev/null \
            || ! grep -qF '/doomsday-clock.html' "$root/$map" 2>/dev/null \
            || ! grep -qF '/doom-index.html' "$root/$map" 2>/dev/null \
            || ! grep -qF '/ai-activity-index.html' "$root/$map" 2>/dev/null \
            || ! grep -qF '/ai-activity-level.html' "$root/$map" 2>/dev/null \
            || ! grep -qF 'AI activity level today' "$root/$map" 2>/dev/null \
            || ! grep -qF '/classic.html' "$root/$map" 2>/dev/null \
            || ! grep -qF 'root https://siren.watch/doombench.html' "$root/$map" 2>/dev/null \
            || { grep -qF '/lab/openai.html' "$root/$map" 2>/dev/null \
              && ! grep -qF 'OpenAI / ChatGPT' "$root/$map" 2>/dev/null; } \
            || ! grep -qF 'IREN stock' "$root/$map" 2>/dev/null \
            || ! grep -qF 'dram stock' "$root/$map" 2>/dev/null \
            || ! grep -qF 'CoreWeave stock' "$root/$map" 2>/dev/null \
            || ! grep -qF 'CRWV Trends' "$root/$map" 2>/dev/null \
            || ! grep -qF 'neoclouds Trends' "$root/$map" 2>/dev/null \
            || ! grep -qF 'NVDA Trends' "$root/$map" 2>/dev/null \
            || ! grep -qF 'OpenAI lawsuit' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Anthropic IPO' "$root/$map" 2>/dev/null \
            || ! grep -qF 'AI safety bill' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Canadian data' "$root/$map" 2>/dev/null \
            || ! grep -qF 'METR' "$root/$map" 2>/dev/null \
            || ! grep -qF 'ECDSA' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Claude Opus 5.5' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Claude Mythos 5' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Blackstone' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Replit' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Waymo Canada' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Allied Universal' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Starshield' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Flying Roadster' "$root/$map" 2>/dev/null \
            || ! grep -qF 'ASML stock' "$root/$map" 2>/dev/null \
            || ! grep -qF 'TSMC stock' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Amazon Bee' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Meta Muse' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Apple Intelligence' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Microsoft Copilot' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Microsoft MAI-Base' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Surface Laptop Ultra' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Grok / xAI' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Gemini / Gemma / Argon' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Samsung / AI memory' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Character.ai bankruptcy' "$root/$map" 2>/dev/null \
            || ! grep -qF 'CERT-In' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Alibaba open-weight' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Oracle datacenter' "$root/$map" 2>/dev/null \
            || ! grep -qF 'DeepSeek outage' "$root/$map" 2>/dev/null \
            || ! grep -qF 'DeepSeek V4.1 Flash' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Timestral' "$root/$map" 2>/dev/null \
            || ! grep -qF 'OpenAI outage' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Hugging Face hack' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Palantir / AIP' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Ondas' "$root/$map" 2>/dev/null \
            || ! grep -qF 'AMD / MI300' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Tesla / FSD' "$root/$map" 2>/dev/null \
            || ! grep -qF 'ChatGPT Chrome' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Meta and Apple Mac AI' "$root/$map" 2>/dev/null \
            || ! grep -qF 'Samsung AI glasses' "$root/$map" 2>/dev/null; }; then
          cp -a "$preserve/$map" "$root/$map"
          echo "restored $map agent map (#136/#139/#156/#157/#161/#162/#163/#164/#165/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#183/#184/#185/#191/#193/#195/#324/#362/#366/#433)"
        fi
      done
    }
    # FINDABILITY #326 — restore tip skill.md (+ packaged SKILL.md) when
    # classic panel needle is missing after orphan Publish.
    # FINDABILITY #435 — also restore when contiguous “AI activity level today”
    # (#433) is missing while classic still present.
    restore_skill_classic() {
      local root="$1" preserve="$2"
      local skill
      for skill in skill.md skills/siren-ai-index/SKILL.md; do
        if [ -f "$preserve/$skill" ] \
          && { ! grep -qF '/classic.html' "$root/$skill" 2>/dev/null \
            || ! grep -qF 'Where is the full SIREN instrument panel?' "$root/$skill" 2>/dev/null \
            || ! grep -qF 'AI activity level today' "$root/$skill" 2>/dev/null; }; then
          mkdir -p "$root/$(dirname "$skill")"
          cp -a "$preserve/$skill" "$root/$skill"
          echo "restored $skill classic instrument panel / level head term (#326/#435)"
        fi
      done
    }
    # FINDABILITY #437 — restore tip agents.html when dual middot head terms
    # are missing after orphan/news-only Publish (level-only pre prompt is not enough).
    restore_agents_html_dual() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/agents.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/agents.html" 2>/dev/null; then
        cp -a "$preserve/agents.html" "$root/agents.html"
        echo "restored agents.html dual head term (#437)"
      fi
    }
    # FINDABILITY #328/#439 — restore tip agents.txt / ai.txt / api-catalog when
    # classic panel or dual middot head terms are missing after orphan/news-only Publish.
    restore_discovery_classic() {
      local root="$1" preserve="$2"
      local surf
      for surf in agents.txt ai.txt; do
        if [ -f "$preserve/$surf" ] \
          && { ! grep -qF '/classic.html' "$root/$surf" 2>/dev/null \
            || ! grep -qF 'Where is the full SIREN instrument panel?' "$root/$surf" 2>/dev/null \
            || ! grep -qF 'AI activity index today · AI activity level today' "$root/$surf" 2>/dev/null; }; then
          mkdir -p "$root/$(dirname "$surf")"
          cp -a "$preserve/$surf" "$root/$surf"
          echo "restored $surf classic instrument panel / dual head term (#328/#439)"
        fi
      done
      # Catalog + MCP card only need the /classic.html href (no question prose).
      for surf in .well-known/api-catalog .well-known/api-catalog.json \
        .well-known/mcp/server-card.json; do
        if [ -f "$preserve/$surf" ] \
          && ! grep -qF '/classic.html' "$root/$surf" 2>/dev/null; then
          mkdir -p "$root/$(dirname "$surf")"
          cp -a "$preserve/$surf" "$root/$surf"
          echo "restored $surf classic instrument panel (#328)"
        fi
      done
      # FINDABILITY #330/#441 — agents.json / openapi / api/index / llms-full /
      # agent-skills need classic href or dual head terms after news-only overlay.
      for surf in agents.json openapi.json api/index.json llms-full.txt \
        .well-known/agent-skills/index.json; do
        if [ -f "$preserve/$surf" ] \
          && { { ! grep -qF '/classic.html' "$root/$surf" 2>/dev/null \
              && ! grep -qF '"/classic.html"' "$root/$surf" 2>/dev/null; } \
            || ! grep -qF 'AI activity index today · AI activity level today' "$root/$surf" 2>/dev/null; }; then
          mkdir -p "$root/$(dirname "$surf")"
          cp -a "$preserve/$surf" "$root/$surf"
          echo "restored $surf classic instrument panel / dual head term (#330/#441)"
        fi
      done
      # FINDABILITY #441 — api-catalog / MCP card dual head terms.
      for surf in .well-known/api-catalog .well-known/api-catalog.json \
        .well-known/mcp/server-card.json; do
        if [ -f "$preserve/$surf" ] \
          && ! grep -qF 'AI activity index today · AI activity level today' "$root/$surf" 2>/dev/null; then
          mkdir -p "$root/$(dirname "$surf")"
          cp -a "$preserve/$surf" "$root/$surf"
          echo "restored $surf dual head term (#441)"
        fi
      done
      # FINDABILITY #332/#443 — free-tools listicle needs classic panel question
      # or dual middot head terms.
      if [ -f "$preserve/free-tools.html" ] \
        && { ! grep -qF '/classic.html' "$root/free-tools.html" 2>/dev/null \
          || ! grep -qF 'Where is the full SIREN instrument panel?' "$root/free-tools.html" 2>/dev/null \
          || ! grep -qF 'AI activity index today · AI activity level today' "$root/free-tools.html" 2>/dev/null; }; then
        cp -a "$preserve/free-tools.html" "$root/free-tools.html"
        mkdir -p "$root/free-tools"
        cp -a "$root/free-tools.html" "$root/free-tools/index.html"
        echo "restored free-tools.html classic instrument panel / dual head term (#332/#443)"
      fi
      # FINDABILITY #451 — verify.html dual middot head terms.
      if [ -f "$preserve/verify.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/verify.html" 2>/dev/null; then
        cp -a "$preserve/verify.html" "$root/verify.html"
        mkdir -p "$root/verify"
        cp -a "$root/verify.html" "$root/verify/index.html"
        echo "restored verify.html dual head term (#451)"
      fi
      # FINDABILITY #453 — compare / alternatives dual middot head terms.
      if [ -f "$preserve/compare.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/compare.html" 2>/dev/null; then
        cp -a "$preserve/compare.html" "$root/compare.html"
        mkdir -p "$root/compare"
        cp -a "$root/compare.html" "$root/compare/index.html"
        cp -a "$root/compare.html" "$root/doom-index.html"
        cp -a "$root/compare.html" "$root/ai-doom-index.html"
        mkdir -p "$root/doom-index" "$root/ai-doom-index"
        cp -a "$root/compare.html" "$root/doom-index/index.html"
        cp -a "$root/compare.html" "$root/ai-doom-index/index.html"
        echo "restored compare.html dual head term (#453)"
      fi
      if [ -f "$preserve/alternatives.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/alternatives.html" 2>/dev/null; then
        cp -a "$preserve/alternatives.html" "$root/alternatives.html"
        mkdir -p "$root/alternatives"
        cp -a "$root/alternatives.html" "$root/alternatives/index.html"
        echo "restored alternatives.html dual head term (#453)"
      fi
      # FINDABILITY #455 — p-doom / ai-doomsday-clock dual middot head terms.
      if [ -f "$preserve/p-doom.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/p-doom.html" 2>/dev/null; then
        cp -a "$preserve/p-doom.html" "$root/p-doom.html"
        cp -a "$root/p-doom.html" "$root/pdoom.html"
        mkdir -p "$root/pdoom"
        cp -a "$root/p-doom.html" "$root/pdoom/index.html"
        echo "restored p-doom.html dual head term (#455)"
      fi
      if [ -f "$preserve/ai-doomsday-clock.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/ai-doomsday-clock.html" 2>/dev/null; then
        cp -a "$preserve/ai-doomsday-clock.html" "$root/ai-doomsday-clock.html"
        mkdir -p "$root/ai-doomsday-clock"
        cp -a "$root/ai-doomsday-clock.html" "$root/ai-doomsday-clock/index.html"
        # FINDABILITY #133/#457 — short /doomsday-clock alias must match dual tip.
        cp -a "$root/ai-doomsday-clock.html" "$root/doomsday-clock.html"
        mkdir -p "$root/doomsday-clock"
        cp -a "$root/ai-doomsday-clock.html" "$root/doomsday-clock/index.html"
        echo "restored ai-doomsday-clock.html dual head term (#455)"
      fi
      # FINDABILITY #457 — guide / guides dual middot head terms.
      if [ -f "$preserve/guide.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/guide.html" 2>/dev/null; then
        cp -a "$preserve/guide.html" "$root/guide.html"
        mkdir -p "$root/guide"
        cp -a "$root/guide.html" "$root/guide/index.html"
        cp -a "$root/guide.html" "$root/ai-doom.html"
        mkdir -p "$root/ai-doom"
        cp -a "$root/guide.html" "$root/ai-doom/index.html"
        echo "restored guide.html dual head term (#457)"
      fi
      if [ -f "$preserve/guides.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/guides.html" 2>/dev/null; then
        cp -a "$preserve/guides.html" "$root/guides.html"
        mkdir -p "$root/guides"
        cp -a "$root/guides.html" "$root/guides/index.html"
        echo "restored guides.html dual head term (#457)"
      fi
      for md in guide.md guides.md; do
        if [ -f "$preserve/$md" ] \
          && ! grep -qF 'AI activity index today · AI activity level today' "$root/$md" 2>/dev/null; then
          cp -a "$preserve/$md" "$root/$md"
          echo "restored $md dual head term (#457)"
        fi
      done
      # FINDABILITY #459 — desk dual middot head terms.
      for desk in bets.html balance.html self-aware.html; do
        if [ -f "$preserve/$desk" ] \
          && ! grep -qF 'AI activity index today · AI activity level today' "$root/$desk" 2>/dev/null; then
          cp -a "$preserve/$desk" "$root/$desk"
          base="${desk%.html}"
          mkdir -p "$root/$base"
          cp -a "$root/$desk" "$root/$base/index.html"
          echo "restored $desk dual head term (#459)"
        fi
      done
      # FINDABILITY #461 — videos dual middot head terms.
      if [ -f "$preserve/videos.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/videos.html" 2>/dev/null; then
        cp -a "$preserve/videos.html" "$root/videos.html"
        mkdir -p "$root/videos"
        cp -a "$root/videos.html" "$root/videos/index.html"
        echo "restored videos.html dual head term (#461)"
      fi
      # FINDABILITY #467 — bliss dual middot head terms.
      if [ -f "$preserve/bliss.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/bliss.html" 2>/dev/null; then
        cp -a "$preserve/bliss.html" "$root/bliss.html"
        mkdir -p "$root/bliss"
        cp -a "$root/bliss.html" "$root/bliss/index.html"
        echo "restored bliss.html dual head term (#467)"
      fi
      # FINDABILITY #469 — press dual middot head terms.
      if [ -f "$preserve/press.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' "$root/press.html" 2>/dev/null; then
        cp -a "$preserve/press.html" "$root/press.html"
        mkdir -p "$root/press"
        cp -a "$root/press.html" "$root/press/index.html"
        echo "restored press.html dual head term (#469)"
      fi
      # FINDABILITY #471 — moves dual middot head terms (probe path).
      if [ -f "$preserve/moves/2026-10-17T15-35-33Z.html" ] \
        && ! grep -qF 'AI activity index today · AI activity level today' \
          "$root/moves/2026-10-17T15-35-33Z.html" 2>/dev/null; then
        mkdir -p "$root/moves"
        cp -a "$preserve/moves/2026-10-17T15-35-33Z.html" \
          "$root/moves/2026-10-17T15-35-33Z.html"
        echo "restored moves dual head term probe (#471)"
      fi
      # FINDABILITY #473 — error-page dual middot head terms.
      for hub in 404.html 500.html; do
        if [ -f "$preserve/$hub" ] \
          && ! grep -qF 'AI activity index today · AI activity level today' \
            "$root/$hub" 2>/dev/null; then
          cp -a "$preserve/$hub" "$root/$hub"
          echo "restored $hub dual head term (#473)"
        fi
      done
      # FINDABILITY #475 — home-crumb dual middot head terms (kind/games probe).
      for hub in kind/press.html games.html; do
        if [ -f "$preserve/$hub" ] \
          && ! grep -qF 'AI activity index today · AI activity level today' \
            "$root/$hub" 2>/dev/null; then
          mkdir -p "$root/$(dirname "$hub")"
          cp -a "$preserve/$hub" "$root/$hub"
          echo "restored $hub crumb dual head term (#475)"
        fi
      done
      # FINDABILITY #483/#485 — in-place patch footer SECTIONS home when
      # still index-only (whole-file press/games restore left rooms wiped).
      local f
      if command -v rg >/dev/null 2>&1; then
        mapfile -t _sec_dual_files < <(rg -l --glob '*.html' \
          'href="/">AI activity index today · SIREN</a>' "$root" 2>/dev/null || true)
      else
        mapfile -t _sec_dual_files < <(grep -rl --include='*.html' \
          'href="/">AI activity index today · SIREN</a>' "$root" 2>/dev/null || true)
      fi
      for f in "${_sec_dual_files[@]}"; do
        [ -f "$f" ] || continue
        perl -pi -e \
          's#href="/">AI activity index today · SIREN</a>#href="/">AI activity index today · AI activity level today · SIREN</a>#g' \
          "$f"
        echo "patched $f sections dual head term (#485)"
      done
      unset _sec_dual_files
    }
    # FINDABILITY #141 — restore tip /lab/ + companies hubs when #140
    # labAboutLabel is missing after orphan Publish.
    restore_lab_hub_labels() {
      local root="$1" preserve="$2"
      local hub
      for hub in lab/index.html companies.html companies/index.html; do
        if [ -f "$preserve/$hub" ] \
          && grep -qF '/lab/openai.html' "$root/$hub" 2>/dev/null \
          && ! grep -qF 'OpenAI / ChatGPT' "$root/$hub" 2>/dev/null; then
          mkdir -p "$root/$(dirname "$hub")"
          cp -a "$preserve/$hub" "$root/$hub"
          echo "restored $hub labAboutLabel (#141)"
        fi
      done
    }
    # FINDABILITY #143 — restore tip home when #142 Organization
    # knowsAbout labAboutLabel (OpenAI / ChatGPT) is missing after
    # news-only index.html overlay from tip < #142.
    # FINDABILITY #254 — also restore when exact head-term FAQ
    # “What is an AI activity index?” is missing; re-sync #252 alias.
    # FINDABILITY #284 — also restore when title-match “AI activity index today”
    # FAQ is missing (orphan Publish can keep #254 while wiping #284).
    # FINDABILITY #264 — also restore when #262 level-alias FAQ prose is
    # missing (orphan Publish can keep #254 while wiping the tip overlay).
    # FINDABILITY #296 — also restore when dual head-term <title> loses
    # contiguous “AI activity level today ·” (middot form; description uses :).
    # FINDABILITY #308 — also restore when H1 .v2-sr loses dual head terms
    # (orphan Publish can keep #296 title while wiping brand-only H1).
    # FINDABILITY #312/#314 — also restore when tip has trimmed <title> (no
    # level_name) but Publish re-emitted ROUTINE/… in <title> only (body scale
    # copy still says ROUTINE; match the title tag, and only when tip is clean).
    # FINDABILITY #316 — also restore when tip dropped the decimal score from
    # <title> but Publish re-emitted `· 55.6` (tip must be score-free).
    # FINDABILITY #423 — also restore when DoomBench conquest every-room / FAQ
    # path is missing after orphan newsroom wipe.
    # FINDABILITY #425/#427 — also restore when Skynet Countdown conquest
    # every-room / FAQ path is missing after orphan newsroom wipe.
    # FINDABILITY #429 — also restore when PizzINT / Takeoff Tracker conquest
    # every-room is missing after orphan newsroom wipe.
    # FINDABILITY #318 — home needles apply to index.html only (classic is the
    # instrument panel with its own title/canonical; never copy home onto it).
    restore_home_knowsabout() {
      local root="$1" preserve="$2"
      local hub
      for hub in index.html; do
        if [ -f "$preserve/$hub" ] \
          && { ! grep -qF 'OpenAI / ChatGPT' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'What is an AI activity index?' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'What is the AI activity index today?' "$root/$hub" 2>/dev/null \
            || ! grep -qF '/ai-activity-level.html is a short alias' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'AI activity level today ·' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'AI activity index today · AI activity level today · AI SIREN INDEX' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'SIREN vs DoomBench: which should you use?' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'SIREN vs Skynet Countdown: which should you use?' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'SIREN vs PizzINT: which should you use?' "$root/$hub" 2>/dev/null \
            || ! grep -qF 'SIREN vs Takeoff Tracker: which should you use?' "$root/$hub" 2>/dev/null \
            || { grep -qE '<title>[^<]*(DORMANT|ROUTINE|ELEVATED|ACCELERATED|UNPRECEDENTED|UNAVAILABLE)' "$root/$hub" 2>/dev/null \
              && ! grep -qE '<title>[^<]*(DORMANT|ROUTINE|ELEVATED|ACCELERATED|UNPRECEDENTED|UNAVAILABLE)' "$preserve/$hub" 2>/dev/null; } \
            || { grep -qE '<title>[^<]*[0-9]+\.[0-9]+' "$root/$hub" 2>/dev/null \
              && ! grep -qE '<title>[^<]*[0-9]+\.[0-9]+' "$preserve/$hub" 2>/dev/null; }; }; then
          cp -a "$preserve/$hub" "$root/$hub"
          echo "restored $hub knowsAbout labAboutLabel / activity-index FAQ (#143/#254/#264/#284/#296/#308/#312/#314/#316/#423/#425/#429)"
        fi
      done
      # FINDABILITY #252/#254 — alias body must match restored home.
      # FINDABILITY #262 — /ai-activity-level alias body must match restored home.
      if [ -f "$root/index.html" ]; then
        cp -a "$root/index.html" "$root/ai-activity-index.html"
        mkdir -p "$root/ai-activity-index"
        cp -a "$root/index.html" "$root/ai-activity-index/index.html"
        cp -a "$root/index.html" "$root/ai-activity-level.html"
        mkdir -p "$root/ai-activity-level"
        cp -a "$root/index.html" "$root/ai-activity-level/index.html"
      fi
    }
    # FINDABILITY #318 — restore tip /classic.html when panel title or
    # canonical is missing (orphan tip/home overlay collapsed classic onto `/`).
    restore_classic_panel() {
      local root="$1" preserve="$2"
      local hub=classic.html
      if [ -f "$preserve/$hub" ] \
        && { ! grep -qF 'Where is the full SIREN instrument panel?' "$root/$hub" 2>/dev/null \
          || ! grep -qF 'rel="canonical" href="https://siren.watch/classic.html"' "$root/$hub" 2>/dev/null; }; then
        cp -a "$preserve/$hub" "$root/$hub"
        echo "restored $hub classic instrument panel (#318)"
      fi
    }
    # FINDABILITY #322 — reinject /classic.html into sitemap.xml when a
    # newsroom/orphan rewrite dropped the loc (mid-flight checkout < #318).
    ensure_classic_sitemap() {
      local root="$1"
      if [ -f "$root/sitemap.xml" ]; then
        node collector/tools/ensure-classic-sitemap.mjs "$root/sitemap.xml"
      fi
    }
    # FINDABILITY #145 — restore tip /race.html when #144 labAboutLabel
    # is missing after orphan newsroom Publish from tip < #144.
    restore_race_lab_labels() {
      local root="$1" preserve="$2"
      local hub
      for hub in race.html race/index.html; do
        if [ -f "$preserve/$hub" ] \
          && grep -qF '/lab/openai.html' "$root/$hub" 2>/dev/null \
          && ! grep -qF 'OpenAI / ChatGPT' "$root/$hub" 2>/dev/null; then
          mkdir -p "$root/$(dirname "$hub")"
          cp -a "$preserve/$hub" "$root/$hub"
          echo "restored $hub race labAboutLabel (#145)"
        fi
      done
    }
    # FINDABILITY #153 — restore tip /watts.html when #152 IREN FAQ
    # is missing after orphan Publish from tip < #152.
    restore_watts_iren_faq() {
      local root="$1" preserve="$2"
      local hub
      for hub in watts.html watts/index.html; do
        if [ -f "$preserve/$hub" ] \
          && ! grep -qF 'Why does SIREN watch IREN stock and AI cloud power in Google Search Trends?' "$root/$hub" 2>/dev/null; then
          mkdir -p "$root/$(dirname "$hub")"
          cp -a "$preserve/$hub" "$root/$hub"
          echo "restored $hub IREN Trends FAQ (#153)"
        fi
      done
    }
    # FINDABILITY #154 — restore tip /lab/micron.html when #151 DRAM
    # FAQ is missing after orphan Publish from tip < #151.
    restore_micron_dram_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/micron.html" ] \
        && ! grep -qF 'Why does SIREN watch Micron stock, MU, and DRAM stock in Google Search Trends?' "$root/lab/micron.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/micron.html" "$root/lab/micron.html"
        echo "restored lab/micron.html DRAM Trends FAQ (#154)"
      fi
    }
    # FINDABILITY #155/#160 — restore tip /lab/coreweave.html when
    # CoreWeave stock or debt FAQ is missing after orphan Publish.
    restore_coreweave_stock_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/coreweave.html" ] \
        && { ! grep -qF 'Why does SIREN watch CoreWeave stock and CRWV in Google Search Trends?' "$root/lab/coreweave.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch CoreWeave debt and bond yields in Google Search Trends?' "$root/lab/coreweave.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/coreweave.html" "$root/lab/coreweave.html"
        echo "restored lab/coreweave.html CoreWeave stock/CRWV/debt FAQ (#155/#160/#288)"
      fi
    }
    # FINDABILITY #157 — restore tip /tags/neoclouds.html when neocloud
    # Trends FAQ is missing after orphan Publish from tip < #157.
    restore_neocloud_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/tags/neoclouds.html" ] \
        && ! grep -qF 'Why does SIREN watch neocloud and neoclouds in Google Search Trends?' "$root/tags/neoclouds.html" 2>/dev/null; then
        mkdir -p "$root/tags"
        cp -a "$preserve/tags/neoclouds.html" "$root/tags/neoclouds.html"
        echo "restored tags/neoclouds.html neocloud Trends FAQ (#157)"
      fi
    }
    # FINDABILITY #176 — restore tip /tags/chatbots.html when Character.ai
    # bankruptcy FAQ is missing after orphan Publish from tip < #176.
    restore_character_ai_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/tags/chatbots.html" ] \
        && ! grep -qF 'Why does SIREN watch Character.ai and AI chatbot bankruptcies?' "$root/tags/chatbots.html" 2>/dev/null; then
        mkdir -p "$root/tags"
        cp -a "$preserve/tags/chatbots.html" "$root/tags/chatbots.html"
        echo "restored tags/chatbots.html Character.ai bankruptcy FAQ (#176)"
      fi
    }
    # FINDABILITY #410 — restore tip /tags/agents.html when CERT-In FAQ is
    # missing after orphan Publish from tip < #410.
    restore_cert_in_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/tags/agents.html" ] \
        && ! grep -qF 'Why does SIREN watch CERT-In and AI agent cyber incidents?' "$root/tags/agents.html" 2>/dev/null; then
        mkdir -p "$root/tags"
        cp -a "$preserve/tags/agents.html" "$root/tags/agents.html"
        echo "restored tags/agents.html CERT-In FAQ (#410)"
      fi
    }
    # FINDABILITY #182 — restore tip /tags/huggingface.html when Hugging Face
    # hack FAQ is missing after orphan Publish from tip < #182.
    restore_huggingface_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/tags/huggingface.html" ] \
        && ! grep -qF 'Why does SIREN watch Hugging Face hacks and incidents?' "$root/tags/huggingface.html" 2>/dev/null; then
        mkdir -p "$root/tags"
        cp -a "$preserve/tags/huggingface.html" "$root/tags/huggingface.html"
        echo "restored tags/huggingface.html Hugging Face hack FAQ (#182)"
      fi
    }

    # FINDABILITY #183/#406 — restore tip /lab/palantir.html when Palantir
    # or Ondas-Palantir FAQ is missing after orphan Publish.
    restore_palantir_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/palantir.html" ] \
        && { ! grep -qF 'Why does SIREN watch Palantir and government AI?' "$root/lab/palantir.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Ondas-Palantir AI?' "$root/lab/palantir.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/palantir.html" "$root/lab/palantir.html"
        echo "restored lab/palantir.html Palantir / AIP + Ondas FAQ (#183/#406)"
      fi
    }

    # FINDABILITY #184 — restore tip /lab/amd.html when AMD FAQ
    # is missing after orphan Publish from tip < #184.
    restore_amd_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/amd.html" ] \
        && ! grep -qF 'Why does SIREN watch AMD and AI GPUs?' "$root/lab/amd.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/amd.html" "$root/lab/amd.html"
        echo "restored lab/amd.html AMD / MI300 FAQ (#184)"
      fi
    }

    # FINDABILITY #185/#378 — restore tip /lab/tesla.html when Tesla / FSD
    # or Flying Roadster FAQ is missing after orphan Publish.
    restore_tesla_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/tesla.html" ] \
        && { ! grep -qF 'Why does SIREN watch Tesla Autopilot and FSD?' "$root/lab/tesla.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Tesla Flying Roadster?' "$root/lab/tesla.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/tesla.html" "$root/lab/tesla.html"
        echo "restored lab/tesla.html Tesla / FSD + Flying Roadster FAQ (#185/#378)"
      fi
    }
    # FINDABILITY #372 — restore tip /lab/waymo.html when Waymo Canada FAQ
    # is missing after orphan Publish from tip < #372.
    restore_waymo_canada_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/waymo.html" ] \
        && ! grep -qF 'Why does SIREN watch Waymo Canada and Toronto robotaxis?' "$root/lab/waymo.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/waymo.html" "$root/lab/waymo.html"
        echo "restored lab/waymo.html Waymo Canada / Toronto FAQ (#372)"
      fi
    }
    # FINDABILITY #374 — restore tip /lab/softbank.html when SoftBank Allied FAQ
    # is missing after orphan Publish from tip < #374.
    restore_softbank_allied_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/softbank.html" ] \
        && ! grep -qF 'Why does SIREN watch SoftBank Allied Universal talks?' "$root/lab/softbank.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/softbank.html" "$root/lab/softbank.html"
        echo "restored lab/softbank.html SoftBank Allied Universal FAQ (#374)"
      fi
    }
    # FINDABILITY #376 — restore tip /lab/spacex.html when SpaceX Starshield FAQ
    # is missing after orphan Publish from tip < #376.
    restore_spacex_starshield_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/spacex.html" ] \
        && ! grep -qF 'Why does SIREN watch SpaceX Starshield?' "$root/lab/spacex.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/spacex.html" "$root/lab/spacex.html"
        echo "restored lab/spacex.html SpaceX Starshield FAQ (#376)"
      fi
    }
    # FINDABILITY #178 — restore tip /tags/datacenters.html when Oracle
    # / AI datacenter FAQ is missing after orphan Publish from tip < #178.
    restore_oracle_datacenters_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/tags/datacenters.html" ] \
        && ! grep -qF 'Why does SIREN watch Oracle and AI datacenters?' "$root/tags/datacenters.html" 2>/dev/null; then
        mkdir -p "$root/tags"
        cp -a "$preserve/tags/datacenters.html" "$root/tags/datacenters.html"
        echo "restored tags/datacenters.html Oracle / AI datacenter FAQ (#178)"
      fi
    }
    # FINDABILITY #158/#166 — restore tip /search-trends.html (+ aliases)
    # when watchlist routing FAQ is missing, or when ASML/TSMC destinations
    # were dropped from the answer after orphan Publish (quiet firehose
    # still needs crawlable destinations).
    restore_trends_routes_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/search-trends.html" ] \
        && { ! grep -qF 'Where does SIREN send IREN stock, dram stock, CoreWeave stock, and neocloud Trends?' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'ASML / EUV AI chip tools → /lab/asml.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'TSMC / AI foundry → /lab/tsmc.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Amazon Bee / AI wearables → /lab/amazon.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Meta Muse / open-weight AI → /lab/meta.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Meta–Apple Mac AI / Muse on Mac → /lab/meta.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Apple Intelligence → /lab/apple.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Microsoft Copilot → /lab/microsoft.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Microsoft MAI-Base / MAI-Base-2 → /lab/microsoft.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Surface Laptop Ultra → /lab/microsoft.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Grok / xAI → /lab/xai.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Gemini / Gemma / Argon → /lab/google-deepmind.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Samsung / HBM / AI memory → /lab/samsung.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Samsung AI glasses → /lab/samsung.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Character.ai bankruptcy → /tags/chatbots.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'CERT-In → /tags/agents.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Qwen / Alibaba open models → /lab/qwen.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Oracle / AI datacenters → /tags/datacenters.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'DeepSeek outage → /lab/deepseek.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'DeepSeek V4.1 Flash → /lab/deepseek.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Mistral / Timestral → /lab/mistral.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'OpenAI outage → /lab/openai.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'ChatGPT Chrome / computer use → /lab/openai.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Anthropic IPO / FTC → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Anthropic AI safety bill → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Anthropic Canadian data centres → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Anthropic METR → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Anthropic ECDSA → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Claude Opus 5.5 → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Claude Mythos 5 → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Blackstone / Anthropic → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Replit / Anthropic → /lab/anthropic.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Waymo Canada / Toronto robotaxi → /lab/waymo.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'SoftBank / Allied Universal → /lab/softbank.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'SpaceX / Starshield → /lab/spacex.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Tesla Flying Roadster → /lab/tesla.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Hugging Face hack → /tags/huggingface.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Palantir / AIP → /lab/palantir.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Ondas / Palantir → /lab/palantir.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'AMD / MI300 → /lab/amd.html' "$root/search-trends.html" 2>/dev/null \
          || ! grep -qF 'Tesla / FSD → /lab/tesla.html' "$root/search-trends.html" 2>/dev/null; }; then
        cp -a "$preserve/search-trends.html" "$root/search-trends.html"
        cp -a "$preserve/search-trends.html" "$root/trends.html"
        mkdir -p "$root/trends" "$root/search-trends"
        cp -a "$preserve/search-trends.html" "$root/trends/index.html"
        cp -a "$preserve/search-trends.html" "$root/search-trends/index.html"
        echo "restored search-trends.html routing FAQ (#158/#166/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#183/#184/#185/#362/#366/#368/#372/#374/#376/#378/#392/#397/#402/#406/#408/#410/#412/#414/#418/#420)"
      fi
    }
    # FINDABILITY #161 — restore tip /lab/nvidia.html when Nvidia / NVDA
    # Trends FAQ is missing after orphan Publish from tip < #161.

    # FINDABILITY #162 — restore tip /lab/openai.html when OpenAI lawsuit
    # / FTC FAQ is missing after orphan Publish from tip < #162.

    # FINDABILITY #163/#362/#366/#368/#392/#397/#402/#408/#412/#420 — restore tip /lab/anthropic.html when
    # Anthropic IPO / FTC, AI safety bill, Canadian DC, or METR FAQ is missing
    # after orphan Publish (newsroom wipe kept IPO while dropping newer FAQs —
    # parallel to OpenAI #162/#181/#191).

    # FINDABILITY #164 — restore tip /lab/asml.html when ASML Trends FAQ
    # is missing after orphan Publish from tip < #164.
    restore_asml_trends_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/asml.html" ] \
        && ! grep -qF 'Why does SIREN watch ASML in Google Search Trends?' "$root/lab/asml.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/asml.html" "$root/lab/asml.html"
        echo "restored lab/asml.html ASML Trends FAQ (#164)"
      fi
    }
    # FINDABILITY #165 — restore tip /lab/tsmc.html when TSMC Trends FAQ
    # is missing after orphan Publish from tip < #165.
    restore_tsmc_trends_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/tsmc.html" ] \
        && ! grep -qF 'Why does SIREN watch TSMC in Google Search Trends?' "$root/lab/tsmc.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/tsmc.html" "$root/lab/tsmc.html"
        echo "restored lab/tsmc.html TSMC Trends FAQ (#165)"
      fi
    }
    # FINDABILITY #167 — restore tip /lab/amazon.html when Amazon Bee FAQ
    # is missing after orphan Publish from tip < #167.
    restore_amazon_bee_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/amazon.html" ] \
        && ! grep -qF 'Why does SIREN watch Amazon Bee and AI wearables?' "$root/lab/amazon.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/amazon.html" "$root/lab/amazon.html"
        echo "restored lab/amazon.html Amazon Bee FAQ (#167)"
      fi
    }
    # FINDABILITY #169 — restore tip /lab/meta.html when Meta Muse FAQ
    # is missing after orphan Publish from tip < #169.
    restore_meta_muse_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/meta.html" ] \
        && { ! grep -qF 'Why does SIREN watch Meta Muse and open-weight AI?' "$root/lab/meta.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Meta and Apple Mac AI partnerships?' "$root/lab/meta.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/meta.html" "$root/lab/meta.html"
        echo "restored lab/meta.html Meta Muse + Meta–Apple Mac FAQ (#169/#193)"
      fi
    }
    # FINDABILITY #248 — restore tip /model/muse-spark.html when Muse Spark
    # model hub FAQ is missing after orphan Publish (story count < MODEL_INDEX_MIN).
    # FINDABILITY #463 — also restore when dual middot head terms are missing.
    restore_muse_spark_model_hub() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/model/muse-spark.html" ] \
        && { ! grep -qF 'What has SIREN scored about Muse Spark?' "$root/model/muse-spark.html" 2>/dev/null \
          || ! grep -qF 'AI activity index today · AI activity level today' "$root/model/muse-spark.html" 2>/dev/null; }; then
        mkdir -p "$root/model"
        cp -a "$preserve/model/muse-spark.html" "$root/model/muse-spark.html"
        echo "restored model/muse-spark.html Muse Spark model hub (#248/#463)"
      fi
    }
    # FINDABILITY #248 — restore tip /model/fable.html when Fable model hub
    # FAQ is missing after orphan Publish.
    # FINDABILITY #463 — also restore when dual middot head terms are missing.
    restore_fable_model_hub() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/model/fable.html" ] \
        && { ! grep -qF 'What has SIREN scored about Fable?' "$root/model/fable.html" 2>/dev/null \
          || ! grep -qF 'AI activity index today · AI activity level today' "$root/model/fable.html" 2>/dev/null; }; then
        mkdir -p "$root/model"
        cp -a "$preserve/model/fable.html" "$root/model/fable.html"
        echo "restored model/fable.html Fable model hub (#248/#463)"
      fi
    }
    # FINDABILITY #465 — restore tip pillar pages when dual middot head terms
    # are missing after orphan Publish (composite-reading CTA was index-only).
    restore_pillar_dual_head_term() {
      local root="$1" preserve="$2"
      local pillar
      for pillar in pillar/compute.html pillar/attention.html pillar/capability.html pillar/governance.html pillar/markets.html; do
        if [ -f "$preserve/$pillar" ] \
          && ! grep -qF 'AI activity index today · AI activity level today' "$root/$pillar" 2>/dev/null; then
          mkdir -p "$root/pillar"
          cp -a "$preserve/$pillar" "$root/$pillar"
          echo "restored $pillar dual head term (#465)"
        fi
      done
    }
    # FINDABILITY #170 — restore tip /lab/apple.html when Apple Intelligence FAQ
    # is missing after orphan Publish from tip < #170.
    restore_apple_intelligence_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/apple.html" ] \
        && ! grep -qF 'Why does SIREN watch Apple Intelligence?' "$root/lab/apple.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/apple.html" "$root/lab/apple.html"
        echo "restored lab/apple.html Apple Intelligence FAQ (#170)"
      fi
    }
    # FINDABILITY #171/#220/#414 — restore tip /lab/microsoft.html when Microsoft Copilot,
    # MAI-Base, or Surface Laptop Ultra FAQ is missing after orphan Publish from tip
    # < #171/#220/#414.
    restore_microsoft_copilot_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/microsoft.html" ] \
        && { ! grep -qF 'Why does SIREN watch Microsoft Copilot?' "$root/lab/microsoft.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Microsoft MAI-Base?' "$root/lab/microsoft.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Surface Laptop Ultra?' "$root/lab/microsoft.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/microsoft.html" "$root/lab/microsoft.html"
        echo "restored lab/microsoft.html Microsoft Copilot + MAI-Base + Surface Laptop Ultra FAQ (#171/#220/#414)"
      fi
    }
    # FINDABILITY #173 — restore tip /lab/xai.html when Grok / xAI FAQ
    # is missing after orphan Publish from tip < #173.
    restore_xai_grok_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/xai.html" ] \
        && ! grep -qF 'Why does SIREN watch Grok and xAI?' "$root/lab/xai.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/xai.html" "$root/lab/xai.html"
        echo "restored lab/xai.html Grok / xAI FAQ (#173)"
      fi
    }
    # FINDABILITY #174 — restore tip /lab/google-deepmind.html when Gemini / Gemma / Argon FAQ
    # is missing after orphan Publish from tip < #174.
    restore_gemini_gemma_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/google-deepmind.html" ] \
        && ! grep -qF 'Why does SIREN watch Gemini, Gemma, and Argon?' "$root/lab/google-deepmind.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/google-deepmind.html" "$root/lab/google-deepmind.html"
        echo "restored lab/google-deepmind.html Gemini / Gemma / Argon FAQ (#174/#187)"
      fi
    }
    # FINDABILITY #175/#195 — restore tip /lab/samsung.html when Samsung / HBM
    # or Samsung AI glasses FAQ is missing after orphan Publish.
    restore_samsung_hbm_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/samsung.html" ] \
        && { ! grep -qF 'Why does SIREN watch Samsung and AI memory chips?' "$root/lab/samsung.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Samsung AI glasses?' "$root/lab/samsung.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/samsung.html" "$root/lab/samsung.html"
        echo "restored lab/samsung.html Samsung / HBM + AI glasses FAQ (#175/#195)"
      fi
    }
    # FINDABILITY #177 — restore tip /lab/qwen.html when Qwen FAQ
    # is missing after orphan Publish from tip < #177.
    restore_qwen_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/qwen.html" ] \
        && ! grep -qF 'Why does SIREN watch Qwen and Alibaba open models?' "$root/lab/qwen.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/qwen.html" "$root/lab/qwen.html"
        echo "restored lab/qwen.html Qwen FAQ (#177)"
      fi
    }
    # FINDABILITY #179/#418 — restore tip /lab/deepseek.html when DeepSeek outage
    # or DeepSeek V4.1 Flash FAQ is missing after orphan Publish from tip < #179/#418.
    restore_deepseek_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/deepseek.html" ] \
        && { ! grep -qF 'Why does SIREN watch DeepSeek and AI outages?' "$root/lab/deepseek.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch DeepSeek V4.1 Flash?' "$root/lab/deepseek.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/deepseek.html" "$root/lab/deepseek.html"
        echo "restored lab/deepseek.html DeepSeek outage + V4.1 Flash FAQ (#179/#418)"
      fi
    }
    # FINDABILITY #180 — restore tip /lab/mistral.html when Mistral FAQ
    # is missing after orphan Publish from tip < #180.
    restore_mistral_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/mistral.html" ] \
        && ! grep -qF 'Why does SIREN watch Mistral and Timestral?' "$root/lab/mistral.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/mistral.html" "$root/lab/mistral.html"
        echo "restored lab/mistral.html Mistral / Timestral FAQ (#180)"
      fi
    }
    restore_anthropic_ipo_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/anthropic.html" ] \
        && { ! grep -qF 'Why does SIREN watch Anthropic IPO and FTC probes?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Anthropic AI safety bill pitches?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Anthropic Canadian data centres?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Anthropic METR evaluator access?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Anthropic ECDSA curve seeds?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Claude Opus 5.5?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Blackstone Anthropic financing?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Replit Anthropic model switches?' "$root/lab/anthropic.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch Claude Mythos 5?' "$root/lab/anthropic.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/anthropic.html" "$root/lab/anthropic.html"
        echo "restored lab/anthropic.html Anthropic IPO / FTC + AI safety bill + Canadian DC + METR + ECDSA + Opus + Blackstone + Replit + Mythos FAQ (#163/#362/#366/#368/#392/#397/#402/#408/#412/#420)"
      fi
    }
    restore_openai_lawsuit_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/openai.html" ] \
        && { ! grep -qF 'Why does SIREN watch OpenAI lawsuits and FTC probes?' "$root/lab/openai.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch OpenAI and ChatGPT outages?' "$root/lab/openai.html" 2>/dev/null \
          || ! grep -qF 'Why does SIREN watch ChatGPT computer use and Chrome tabs?' "$root/lab/openai.html" 2>/dev/null; }; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/openai.html" "$root/lab/openai.html"
        echo "restored lab/openai.html OpenAI lawsuit / FTC + outage FAQ (#162/#181)"
      fi
    }
    restore_nvidia_nvda_faq() {
      local root="$1" preserve="$2"
      if [ -f "$preserve/lab/nvidia.html" ] \
        && ! grep -qF 'Why does SIREN watch Nvidia stock and NVDA in Google Search Trends?' "$root/lab/nvidia.html" 2>/dev/null; then
        mkdir -p "$root/lab"
        cp -a "$preserve/lab/nvidia.html" "$root/lab/nvidia.html"
        echo "restored lab/nvidia.html Nvidia / NVDA Trends FAQ (#161)"
      fi
    }
    if [ -d .pages/.git ]; then
      if ! git -C .pages fetch -q origin gh-pages 2>/dev/null \
        || ! git -C .pages reset -q --hard FETCH_HEAD 2>/dev/null; then
        echo "tick $TICK: could not refresh .pages; recloning"
        rm -rf .pages
      fi
    fi
    if [ ! -d .pages/.git ]; then
      rm -rf .pages
      git clone -q --depth 1 --branch gh-pages "$PAGES_REMOTE" .pages \
        || rm -rf .pages
    fi
    if [ -d .pages/.git ]; then
      # FINDABILITY #96 — news-sitemap/sitemap/robots must ride the
      # overlay path. Omitting them left Google News on a stale
      # news-sitemap while api/news.json + /news.html refreshed.
      # FINDABILITY #116 — llms.txt / agents.md advertise conquest short
      # aliases (#111/#113); keep them on the overlay path so agent maps
      # do not lag HTML-only overlays while news-fast owns gh-pages.
      # FINDABILITY #136 — stash tip agent maps before public/ overlay
      # can replace them with a news-only build that lacks #134/#132.
      # FINDABILITY #143 — also stash tip home/classic for #142 knowsAbout.
      # FINDABILITY #145 — stash tip race.html for #144 labAboutLabel.
      # FINDABILITY #153/#154/#155/#157/#158/#161 — stash tip watts + Micron +
      # CoreWeave/Nvidia labs + Neoclouds tag + Search Trends for FAQs.
      PRESERVE_MAPS=$(mktemp -d)
      for map in agents.md llms.txt index.html classic.html; do
        [ -f ".pages/$map" ] && cp -a ".pages/$map" "$PRESERVE_MAPS/$map"
      done
      # FINDABILITY #326 — stash tip skill.md + packaged SKILL.md separately
      # so #143 preserve-list shape stays contiguous for engine-shadow.
      if [ -f .pages/skill.md ]; then
        cp -a .pages/skill.md "$PRESERVE_MAPS/skill.md"
      fi
      if [ -f .pages/skills/siren-ai-index/SKILL.md ]; then
        mkdir -p "$PRESERVE_MAPS/skills/siren-ai-index"
        cp -a .pages/skills/siren-ai-index/SKILL.md "$PRESERVE_MAPS/skills/siren-ai-index/SKILL.md"
      fi
      # FINDABILITY #437 — stash tip agents.html for dual head-term restore.
      if [ -f .pages/agents.html ]; then
        cp -a .pages/agents.html "$PRESERVE_MAPS/agents.html"
      fi
      # FINDABILITY #328 — stash tip agents.txt / ai.txt / api-catalog / MCP card.
      # FINDABILITY #330 — also stash agents.json / openapi / api/index / llms-full /
      # agent-skills so news-only overlay cannot drop classic.
      for surf in agents.txt ai.txt agents.json openapi.json api/index.json llms-full.txt \
        free-tools.html verify.html \
        .well-known/api-catalog .well-known/api-catalog.json \
        .well-known/mcp/server-card.json \
        .well-known/agent-skills/index.json; do
        if [ -f ".pages/$surf" ]; then
          mkdir -p "$PRESERVE_MAPS/$(dirname "$surf")"
          cp -a ".pages/$surf" "$PRESERVE_MAPS/$surf"
        fi
      done
      # FINDABILITY #210 — stash tip news-sitemap before public/ overlay can
      # wipe Roadster/Starshield probe needles built on tip < #208.
      for hub in race.html race/index.html watts.html watts/index.html \
        lab/micron.html lab/coreweave.html lab/nvidia.html lab/openai.html lab/anthropic.html lab/asml.html lab/tsmc.html lab/amazon.html lab/meta.html lab/apple.html lab/microsoft.html lab/xai.html lab/google-deepmind.html lab/samsung.html lab/qwen.html lab/deepseek.html lab/mistral.html lab/palantir.html lab/amd.html lab/tesla.html lab/waymo.html lab/softbank.html lab/spacex.html tags/neoclouds.html tags/chatbots.html tags/agents.html tags/huggingface.html tags/datacenters.html model/muse-spark.html model/fable.html pillar/compute.html pillar/attention.html pillar/capability.html pillar/governance.html pillar/markets.html \
        search-trends.html news-sitemap.xml; do
        if [ -f ".pages/$hub" ]; then
          mkdir -p "$PRESERVE_MAPS/$(dirname "$hub")"
          cp -a ".pages/$hub" "$PRESERVE_MAPS/$hub"
        fi
      done
      # FINDABILITY #149/#158 — news-only Trends HTML + API must ride
      # the overlay path (orphan fallback already tars all of public/).
      # FINDABILITY #328 — also overlay ai.txt + api-catalog + MCP card so tip
      # discovery surfaces stay in lockstep with news-only writeAgentText.
      # FINDABILITY #330 — also overlay agents.json / openapi / api/index /
      # agent-skills (llms-full already in list).
      for rel in api/news.json api/breaking.json api/state.json api/fresh.json api/now.txt now.md llms.txt llms-full.txt agents.md AGENTS.md agents.txt agents.json ai.txt skill.md openapi.json api/index.json free-tools.html verify.html news.html index.html classic.html instruments.html feed.xml news-sitemap.xml sitemap.xml robots.txt api/leaders.json leaders.html leaders/index.html search-trends.html api/search-trends.json .well-known/api-catalog .well-known/api-catalog.json .well-known/mcp/server-card.json .well-known/agent-skills/index.json; do
        if [ -e "public/$rel" ]; then
          mkdir -p ".pages/$(dirname "$rel")"
          cp -a "public/$rel" ".pages/$rel"
        fi
      done
      if command -v rsync >/dev/null 2>&1; then
        if [ -d public/news ]; then mkdir -p .pages/news && rsync -a --delete public/news/ .pages/news/; fi
        if [ -d public/item ]; then mkdir -p .pages/item && rsync -a --delete public/item/ .pages/item/; fi
      else
        if [ -d public/news ]; then rm -rf .pages/news && cp -a public/news .pages/news; fi
        if [ -d public/item ]; then rm -rf .pages/item && cp -a public/item .pages/item; fi
      fi
      restore_vs_aliases .pages
      restore_agent_maps .pages "$PRESERVE_MAPS"
      restore_skill_classic .pages "$PRESERVE_MAPS"
      restore_agents_html_dual .pages "$PRESERVE_MAPS"
      restore_discovery_classic .pages "$PRESERVE_MAPS"
      restore_home_knowsabout .pages "$PRESERVE_MAPS"
      restore_classic_panel .pages "$PRESERVE_MAPS"
      ensure_classic_sitemap .pages
      restore_race_lab_labels .pages "$PRESERVE_MAPS"
      restore_watts_iren_faq .pages "$PRESERVE_MAPS"
      restore_micron_dram_faq .pages "$PRESERVE_MAPS"
      restore_coreweave_stock_faq .pages "$PRESERVE_MAPS"
      restore_neocloud_faq .pages "$PRESERVE_MAPS"
      restore_character_ai_faq .pages "$PRESERVE_MAPS"
      restore_cert_in_faq .pages "$PRESERVE_MAPS"
      restore_huggingface_faq .pages "$PRESERVE_MAPS"
      restore_palantir_faq .pages "$PRESERVE_MAPS"
      restore_amd_faq .pages "$PRESERVE_MAPS"
      restore_tesla_faq .pages "$PRESERVE_MAPS"
      restore_waymo_canada_faq .pages "$PRESERVE_MAPS"
      restore_softbank_allied_faq .pages "$PRESERVE_MAPS"
      restore_spacex_starshield_faq .pages "$PRESERVE_MAPS"
      restore_oracle_datacenters_faq .pages "$PRESERVE_MAPS"
      restore_trends_routes_faq .pages "$PRESERVE_MAPS"
      restore_nvidia_nvda_faq .pages "$PRESERVE_MAPS"
      restore_openai_lawsuit_faq .pages "$PRESERVE_MAPS"
      restore_anthropic_ipo_faq .pages "$PRESERVE_MAPS"
      restore_asml_trends_faq .pages "$PRESERVE_MAPS"
      restore_tsmc_trends_faq .pages "$PRESERVE_MAPS"
      restore_amazon_bee_faq .pages "$PRESERVE_MAPS"
      restore_meta_muse_faq .pages "$PRESERVE_MAPS"
      restore_muse_spark_model_hub .pages "$PRESERVE_MAPS"
      restore_fable_model_hub .pages "$PRESERVE_MAPS"
      restore_pillar_dual_head_term .pages "$PRESERVE_MAPS"
      restore_apple_intelligence_faq .pages "$PRESERVE_MAPS"
      restore_microsoft_copilot_faq .pages "$PRESERVE_MAPS"
      restore_xai_grok_faq .pages "$PRESERVE_MAPS"
      restore_gemini_gemma_faq .pages "$PRESERVE_MAPS"
      restore_samsung_hbm_faq .pages "$PRESERVE_MAPS"
      restore_qwen_faq .pages "$PRESERVE_MAPS"
      restore_deepseek_faq .pages "$PRESERVE_MAPS"
      restore_mistral_faq .pages "$PRESERVE_MAPS"
      # FINDABILITY #210 — merge tip news:keywords probe needles after overlay.
      if [ -f "$PRESERVE_MAPS/news-sitemap.xml" ] && [ -f .pages/news-sitemap.xml ]; then
        node collector/tools/merge-news-keyword-tip.mjs \
          "$PRESERVE_MAPS/news-sitemap.xml" .pages/news-sitemap.xml
      fi
      rm -rf "$PRESERVE_MAPS"
      git -C .pages config user.name  'github-actions[bot]'
      git -C .pages config user.email '41898282+github-actions[bot]@users.noreply.github.com'
      git -C .pages add -A
      if git -C .pages diff --cached --quiet; then
        echo "tick $TICK: overlay had nothing new to commit"
        PUB_OK=1
      elif git -C .pages commit -q -m "newsroom refresh — $(date -u +%Y-%m-%dT%H:%M:%SZ)"; then
        # collect.yml force-pushes this same branch. A "cannot lock ref"
        # rejection is momentary; retry before falling through to the full
        # orphan replace below. A non-fast-forward (tip moved) still fails
        # every attempt and falls through as before.
        for attempt in 1 2 3; do
          if git -C .pages push -q "$PAGES_REMOTE" HEAD:gh-pages; then
            PUB_OK=1
            break
          fi
          echo "tick $TICK: overlay gh-pages push rejected (attempt $attempt); retrying"
          sleep $((attempt * 2))
        done
      fi
    fi
    if [ "$PUB_OK" -ne 1 ]; then
      echo "tick $TICK: overlay publish missed; full orphan publish"
      # FINDABILITY #128 — stash tip conquest FAQ hubs before orphan wipe.
      # FINDABILITY #136/#141/#143/#145/#153/#154/#155/#157/#158/#161 — agent maps +
      # lab hubs + home/race + Watts/Micron/CoreWeave/Nvidia/Neoclouds/Trends FAQs.
      # FINDABILITY #210 — also stash tip news-sitemap.xml for probe-needle merge.
      PRESERVE_FAQ=$(mktemp -d)
      # FINDABILITY #326/#328 — also stash tip skill.md + discovery surfaces.
      for hub in compare.html alternatives.html agents.md llms.txt skill.md \
        skills/siren-ai-index/SKILL.md agents.html agents.txt ai.txt \
        p-doom.html ai-doomsday-clock.html guide.html guides.html guide.md guides.md \
        bets.html balance.html self-aware.html videos.html bliss.html press.html \
        moves/2026-10-17T15-35-33Z.html 404.html 500.html \
        kind/press.html games.html \
        .well-known/api-catalog .well-known/api-catalog.json \
        .well-known/mcp/server-card.json \
        lab/index.html companies.html companies/index.html \
        index.html classic.html race.html race/index.html \
        watts.html watts/index.html lab/micron.html lab/coreweave.html \
        lab/nvidia.html lab/openai.html lab/anthropic.html lab/asml.html lab/tsmc.html lab/amazon.html lab/meta.html lab/apple.html lab/microsoft.html lab/xai.html lab/google-deepmind.html lab/samsung.html lab/qwen.html lab/deepseek.html lab/mistral.html lab/palantir.html lab/amd.html lab/tesla.html lab/waymo.html lab/softbank.html lab/spacex.html tags/neoclouds.html tags/chatbots.html tags/agents.html tags/huggingface.html tags/datacenters.html model/muse-spark.html model/fable.html pillar/compute.html pillar/attention.html pillar/capability.html pillar/governance.html pillar/markets.html search-trends.html news-sitemap.xml; do
        if [ -f ".pages/$hub" ]; then
          mkdir -p "$PRESERVE_FAQ/$(dirname "$hub")"
          cp -a ".pages/$hub" "$PRESERVE_FAQ/$hub"
        fi
      done
      if [ ! -f "$PRESERVE_FAQ/compare.html" ] || [ ! -f "$PRESERVE_FAQ/alternatives.html" ] \
        || [ ! -f "$PRESERVE_FAQ/agents.md" ] || [ ! -f "$PRESERVE_FAQ/llms.txt" ]; then
        rm -rf .pages-faq-tip
        if git clone -q --depth 1 --branch gh-pages "$PAGES_REMOTE" .pages-faq-tip 2>/dev/null; then
          for hub in compare.html alternatives.html agents.md llms.txt skill.md \
            skills/siren-ai-index/SKILL.md agents.html agents.txt ai.txt \
            p-doom.html ai-doomsday-clock.html guide.html guides.html guide.md guides.md \
            bets.html balance.html self-aware.html videos.html bliss.html press.html \
            moves/2026-10-17T15-35-33Z.html 404.html 500.html \
            kind/press.html games.html \
            .well-known/api-catalog .well-known/api-catalog.json \
            .well-known/mcp/server-card.json \
            lab/index.html companies.html companies/index.html \
            index.html classic.html race.html race/index.html \
            watts.html watts/index.html lab/micron.html lab/coreweave.html \
            lab/nvidia.html lab/openai.html lab/anthropic.html lab/asml.html lab/tsmc.html lab/amazon.html lab/meta.html lab/apple.html lab/microsoft.html lab/xai.html lab/google-deepmind.html lab/samsung.html lab/qwen.html lab/deepseek.html lab/mistral.html lab/palantir.html lab/amd.html lab/tesla.html lab/waymo.html lab/softbank.html lab/spacex.html tags/neoclouds.html tags/chatbots.html tags/agents.html tags/huggingface.html tags/datacenters.html model/muse-spark.html model/fable.html pillar/compute.html pillar/attention.html pillar/capability.html pillar/governance.html pillar/markets.html search-trends.html news-sitemap.xml; do
            if [ -f ".pages-faq-tip/$hub" ]; then
              mkdir -p "$PRESERVE_FAQ/$(dirname "$hub")"
              cp -a ".pages-faq-tip/$hub" "$PRESERVE_FAQ/$hub"
            fi
          done
          rm -rf .pages-faq-tip
        fi
      fi
      rm -rf .pages && mkdir .pages
      echo '.pages/' > .git/info/exclude.tmp && cat .git/info/exclude >> .git/info/exclude.tmp 2>/dev/null || true
      mv .git/info/exclude.tmp .git/info/exclude
      tar cf - -C public . | (cd .pages && tar xf -)
      restore_vs_aliases .pages
      restore_conquest_faqs .pages "$PRESERVE_FAQ"
      restore_agent_maps .pages "$PRESERVE_FAQ"
      restore_skill_classic .pages "$PRESERVE_FAQ"
      restore_agents_html_dual .pages "$PRESERVE_FAQ"
      restore_discovery_classic .pages "$PRESERVE_FAQ"
      restore_lab_hub_labels .pages "$PRESERVE_FAQ"
      restore_home_knowsabout .pages "$PRESERVE_FAQ"
      restore_classic_panel .pages "$PRESERVE_FAQ"
      ensure_classic_sitemap .pages
      restore_race_lab_labels .pages "$PRESERVE_FAQ"
      restore_watts_iren_faq .pages "$PRESERVE_FAQ"
      restore_micron_dram_faq .pages "$PRESERVE_FAQ"
      restore_coreweave_stock_faq .pages "$PRESERVE_FAQ"
      restore_neocloud_faq .pages "$PRESERVE_FAQ"
      restore_character_ai_faq .pages "$PRESERVE_FAQ"
      restore_cert_in_faq .pages "$PRESERVE_FAQ"
      restore_huggingface_faq .pages "$PRESERVE_FAQ"
      restore_palantir_faq .pages "$PRESERVE_FAQ"
      restore_amd_faq .pages "$PRESERVE_FAQ"
      restore_tesla_faq .pages "$PRESERVE_FAQ"
      restore_waymo_canada_faq .pages "$PRESERVE_FAQ"
      restore_softbank_allied_faq .pages "$PRESERVE_FAQ"
      restore_spacex_starshield_faq .pages "$PRESERVE_FAQ"
      restore_oracle_datacenters_faq .pages "$PRESERVE_FAQ"
      restore_trends_routes_faq .pages "$PRESERVE_FAQ"
      restore_nvidia_nvda_faq .pages "$PRESERVE_FAQ"
      restore_openai_lawsuit_faq .pages "$PRESERVE_FAQ"
      restore_anthropic_ipo_faq .pages "$PRESERVE_FAQ"
      restore_asml_trends_faq .pages "$PRESERVE_FAQ"
      restore_tsmc_trends_faq .pages "$PRESERVE_FAQ"
      restore_amazon_bee_faq .pages "$PRESERVE_FAQ"
      restore_meta_muse_faq .pages "$PRESERVE_FAQ"
      restore_muse_spark_model_hub .pages "$PRESERVE_FAQ"
      restore_fable_model_hub .pages "$PRESERVE_FAQ"
      restore_pillar_dual_head_term .pages "$PRESERVE_FAQ"
      restore_apple_intelligence_faq .pages "$PRESERVE_FAQ"
      restore_microsoft_copilot_faq .pages "$PRESERVE_FAQ"
      restore_xai_grok_faq .pages "$PRESERVE_FAQ"
      restore_gemini_gemma_faq .pages "$PRESERVE_FAQ"
      restore_samsung_hbm_faq .pages "$PRESERVE_FAQ"
      restore_qwen_faq .pages "$PRESERVE_FAQ"
      restore_deepseek_faq .pages "$PRESERVE_FAQ"
      restore_mistral_faq .pages "$PRESERVE_FAQ"
      # FINDABILITY #210 — merge tip news:keywords probe needles after orphan tar.
      if [ -f "$PRESERVE_FAQ/news-sitemap.xml" ] && [ -f .pages/news-sitemap.xml ]; then
        node collector/tools/merge-news-keyword-tip.mjs \
          "$PRESERVE_FAQ/news-sitemap.xml" .pages/news-sitemap.xml
      fi
      rm -rf "$PRESERVE_FAQ"
      git -C .pages init -q
      git -C .pages checkout -q -b gh-pages
      git -C .pages config user.name  'github-actions[bot]'
      git -C .pages config user.email '41898282+github-actions[bot]@users.noreply.github.com'
      git -C .pages add -A
      git -C .pages commit -q -m "newsroom refresh — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      for attempt in 1 2 3; do
        if git -C .pages push -q -f "$PAGES_REMOTE" gh-pages; then
          PUB_OK=1
          break
        fi
        echo "tick $TICK: orphan gh-pages push rejected (attempt $attempt); retrying"
        sleep $((attempt * 2))
      done
    fi
    if [ "$PUB_OK" -eq 1 ]; then
      PUBLISHED=$((PUBLISHED + 1))
      PENDING_PUB=0
      LAST_PAGES_PUB=$(date +%s)
    else
      # Still advance the gap clock so a hard Pages rejection cannot
      # spin every remaining tick (FINDABILITY #112).
      LAST_PAGES_PUB=$(date +%s)
      echo "::warning::tick $TICK: Pages publish failed; will retry after ${PUBLISH_MIN_GAP}s"
    fi
  fi

  # Sleep the REMAINDER of the minute, not a flat 60s, so a slow pass
  # does not make the cadence drift later every iteration.
  ELAPSED=$(( $(date +%s) - START ))
  REMAIN=$(( 60 - ELAPSED ))
  [ "$REMAIN" -gt 0 ] && sleep "$REMAIN"
done

echo "loop finished: $TICK ticks, $PUBLISHED publishes"
echo "PUBLISHED=$PUBLISHED" >> "$GITHUB_ENV"

