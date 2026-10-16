#!/usr/bin/env bash
# FINDABILITY #192 — collect/news Publish body extracted from collect.yml.
# Inline `run: |` exceeded GitHub's 21000-char expression cap (push events
# fail at 0s with "workflow file issue"; schedule stayed on a cached parse
# until tip moved). Keep secrets/context in the workflow `env:` block.
set -euo pipefail

rm -rf .pages
# NEVER PUBLISH OVER A NEWER FULL PASS. public/ was built before the
# commit step; if that step had to replay onto a tip the full lane
# had just pushed (its index, Takeover Watch, AI on TV ...), public/
# still holds the older data and would overwrite the full lane's
# fresher site. Rebuild from what is now on disk when that happened.
B="$(cat "$RUNNER_TEMP/built-sha" 2>/dev/null || true)"
if [ -n "$B" ] && [ "$(git rev-list --count "$B"..HEAD 2>/dev/null || echo 2)" -gt 1 ]; then
  echo "::notice title=newsroom::main moved under this run; rebuilding before publishing"
  # Same news-only preference as Rebuild the site (FINDABILITY #94/#100).
  PUB_NEWS_ONLY=0
  if [ -f public/index.html ]; then
    if GOOGLE_SITE_VERIFICATION="${GOOGLE_SITE_VERIFICATION}" \
      BING_SITE_VERIFICATION="${BING_SITE_VERIFICATION}" \
      NODE_OPTIONS=--max-old-space-size=8192 \
      timeout 900 node site/build.mjs --only news; then
      PUB_NEWS_ONLY=1
    else
      echo "::error::publish-time news-only rebuild failed; refusing full wipe"
      exit 1
    fi
  else
    GOOGLE_SITE_VERIFICATION="${GOOGLE_SITE_VERIFICATION}" \
      BING_SITE_VERIFICATION="${BING_SITE_VERIFICATION}" \
      NODE_OPTIONS=--max-old-space-size=8192 \
      timeout 2400 node site/build.mjs
  fi
  if [ "$PUB_NEWS_ONLY" != "1" ]; then
    node collector/card.mjs
    node collector/posts.mjs
    node site/post-sheet.mjs
    node site/engage-sheet.mjs
  fi
  # FINDABILITY #101 — same heap floor as Compliance gate.
  NODE_OPTIONS=--max-old-space-size=8192 node compliance/audit.mjs --dir public
fi
test -f public/index.html || { echo '::error::public/index.html missing; refusing to publish'; exit 1; }
SUBJECT="$(node --input-type=module -e '
  import { readFileSync } from "node:fs";
  let s = {};
  try { s = JSON.parse(readFileSync("data/state.json", "utf8")); } catch {}
  const score = typeof s.score === "number" ? s.score.toFixed(1) : "NO SCORE";
  process.stdout.write(`SIREN ${s.level ?? "-"}, score ${score} — newsroom refresh`);
')"
mkdir .pages
# FINDABILITY #128 — stash live tip conquest FAQ hubs before orphan
# wipe (news-only public/ omits #126/#127 needles the same way).
PRESERVE_FAQ=$(mktemp -d)
PAGES_REMOTE="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
rm -rf .pages-faq-tip
if git clone -q --depth 1 --branch gh-pages "$PAGES_REMOTE" .pages-faq-tip 2>/dev/null; then
  # FINDABILITY #136 — also stash tip agent maps (head-term / root needles).
  # FINDABILITY #141/#143/#145/#153/#154/#155/#157/#158/#161 — stash tip /lab/ +
  # companies hubs, home/classic, race, Watts/Micron/CoreWeave/Nvidia/Neoclouds
  # + Search Trends FAQs so mid-merge collect cannot wipe those overlays.
  # FINDABILITY #210 — stash tip news-sitemap.xml so probe needles (Roadster /
  # Starshield / …) survive orphan Publish on tip < #208.
  for hub in compare.html alternatives.html agents.md llms.txt \
    lab/index.html companies.html companies/index.html \
    index.html classic.html race.html race/index.html \
    watts.html watts/index.html lab/micron.html lab/coreweave.html \
    lab/nvidia.html lab/openai.html lab/anthropic.html lab/asml.html lab/tsmc.html lab/amazon.html lab/meta.html lab/apple.html lab/microsoft.html lab/xai.html lab/google-deepmind.html lab/samsung.html lab/qwen.html lab/deepseek.html lab/mistral.html lab/palantir.html lab/amd.html lab/tesla.html tags/neoclouds.html tags/chatbots.html tags/huggingface.html tags/datacenters.html search-trends.html news-sitemap.xml; do
    if [ -f ".pages-faq-tip/$hub" ]; then
      mkdir -p "$PRESERVE_FAQ/$(dirname "$hub")"
      cp -a ".pages-faq-tip/$hub" "$PRESERVE_FAQ/$hub"
    fi
  done
  rm -rf .pages-faq-tip
fi
tar cf - -C public . | (cd .pages && tar xf -)
# FINDABILITY #115 — news-only public/ can omit conquest short aliases
# (#111/#113). Orphan publish must not wipe them (same restore as
# news-fast #114). Primaries already carry the correct canonical.
# FINDABILITY #124 — /trends + Outrank directory indexes.
mkdir -p .pages/vs
[ -f .pages/vs/doombench.html ] && cp -a .pages/vs/doombench.html .pages/vs/doom.html
[ -f .pages/vs/skynet-countdown.html ] && cp -a .pages/vs/skynet-countdown.html .pages/vs/skynet.html
[ -f .pages/vs/takeofftracker.html ] && cp -a .pages/vs/takeofftracker.html .pages/vs/takeoff.html
if [ -f .pages/search-trends.html ]; then
  cp -a .pages/search-trends.html .pages/trends.html
  mkdir -p .pages/trends .pages/search-trends
  cp -a .pages/search-trends.html .pages/trends/index.html
  cp -a .pages/search-trends.html .pages/search-trends/index.html
fi
if [ -f .pages/verify.html ]; then mkdir -p .pages/verify && cp -a .pages/verify.html .pages/verify/index.html; fi
if [ -f .pages/free-tools.html ]; then mkdir -p .pages/free-tools && cp -a .pages/free-tools.html .pages/free-tools/index.html; fi
if [ -f .pages/ai-prediction-markets.html ]; then mkdir -p .pages/ai-prediction-markets && cp -a .pages/ai-prediction-markets.html .pages/ai-prediction-markets/index.html; fi
# FINDABILITY #129 — unhyphenated /pdoom typed guess.
if [ -f .pages/p-doom.html ]; then
  cp -a .pages/p-doom.html .pages/pdoom.html
  mkdir -p .pages/pdoom
  cp -a .pages/p-doom.html .pages/pdoom/index.html
fi
# FINDABILITY #133 — doomsday-clock / ai-doom / doom-index typed guesses.
if [ -f .pages/ai-doomsday-clock.html ]; then
  cp -a .pages/ai-doomsday-clock.html .pages/doomsday-clock.html
  mkdir -p .pages/doomsday-clock
  cp -a .pages/ai-doomsday-clock.html .pages/doomsday-clock/index.html
fi
if [ -f .pages/guide.html ]; then
  cp -a .pages/guide.html .pages/ai-doom.html
  mkdir -p .pages/ai-doom
  cp -a .pages/guide.html .pages/ai-doom/index.html
fi
if [ -f .pages/compare.html ]; then
  cp -a .pages/compare.html .pages/doom-index.html
  cp -a .pages/compare.html .pages/ai-doom-index.html
  mkdir -p .pages/doom-index .pages/ai-doom-index
  cp -a .pages/compare.html .pages/doom-index/index.html
  cp -a .pages/compare.html .pages/ai-doom-index/index.html
fi
# FINDABILITY #131 — root rival brand typed guesses (canonical on /vs/*).
if [ -f .pages/vs/doombench.html ]; then
  cp -a .pages/vs/doombench.html .pages/doombench.html
  cp -a .pages/vs/doombench.html .pages/doom.html
  mkdir -p .pages/doombench .pages/doom
  cp -a .pages/vs/doombench.html .pages/doombench/index.html
  cp -a .pages/vs/doombench.html .pages/doom/index.html
fi
if [ -f .pages/vs/skynet-countdown.html ]; then
  cp -a .pages/vs/skynet-countdown.html .pages/skynet-countdown.html
  cp -a .pages/vs/skynet-countdown.html .pages/skynet.html
  mkdir -p .pages/skynet-countdown .pages/skynet
  cp -a .pages/vs/skynet-countdown.html .pages/skynet-countdown/index.html
  cp -a .pages/vs/skynet-countdown.html .pages/skynet/index.html
fi
if [ -f .pages/vs/pizzint.html ]; then
  cp -a .pages/vs/pizzint.html .pages/pizzint.html
  mkdir -p .pages/pizzint
  cp -a .pages/vs/pizzint.html .pages/pizzint/index.html
fi
if [ -f .pages/vs/takeofftracker.html ]; then
  cp -a .pages/vs/takeofftracker.html .pages/takeofftracker.html
  cp -a .pages/vs/takeofftracker.html .pages/takeoff.html
  mkdir -p .pages/takeofftracker .pages/takeoff
  cp -a .pages/vs/takeofftracker.html .pages/takeofftracker/index.html
  cp -a .pages/vs/takeofftracker.html .pages/takeoff/index.html
fi
# FINDABILITY #128 — restore tip conquest FAQ hubs when needles missing.
if [ -f "$PRESERVE_FAQ/compare.html" ] \
  && ! grep -q 'How do you compare AI doom indexes' .pages/compare.html 2>/dev/null; then
  cp -a "$PRESERVE_FAQ/compare.html" .pages/compare.html
  mkdir -p .pages/compare
  cp -a "$PRESERVE_FAQ/compare.html" .pages/compare/index.html
  echo "restored compare.html conquest FAQ hub (#128)"
fi
if [ -f "$PRESERVE_FAQ/alternatives.html" ] \
  && ! grep -q 'What is an AI doom index alternative' .pages/alternatives.html 2>/dev/null; then
  cp -a "$PRESERVE_FAQ/alternatives.html" .pages/alternatives.html
  mkdir -p .pages/alternatives
  cp -a "$PRESERVE_FAQ/alternatives.html" .pages/alternatives/index.html
  echo "restored alternatives.html conquest FAQ hub (#128)"
fi
# FINDABILITY #136/#139 — restore tip agent maps when #134 head-term /
# #132 root needles are missing, or when llms.txt lists /lab/openai.html
# without the #138 labAboutLabel (OpenAI / ChatGPT). Mid-merge collect
# on tip < #138 would otherwise wipe the #138 overlay.
# FINDABILITY #156 — also restore when #153/#154/#155 Trends tips
# (IREN stock / dram stock / CoreWeave stock) are missing after wipe.
for map in agents.md llms.txt; do
  if [ -f "$PRESERVE_FAQ/$map" ] \
    && { ! grep -qF '/ai-doom.html' ".pages/$map" 2>/dev/null \
      || ! grep -qF '/doomsday-clock.html' ".pages/$map" 2>/dev/null \
      || ! grep -qF '/doom-index.html' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'root https://siren.watch/doombench.html' ".pages/$map" 2>/dev/null \
      || { grep -qF '/lab/openai.html' ".pages/$map" 2>/dev/null \
        && ! grep -qF 'OpenAI / ChatGPT' ".pages/$map" 2>/dev/null; } \
      || ! grep -qF 'IREN stock' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'dram stock' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'CoreWeave stock' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'neoclouds Trends' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'NVDA Trends' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'OpenAI lawsuit' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Anthropic IPO' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'ASML stock' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'TSMC stock' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Amazon Bee' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Meta Muse' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Apple Intelligence' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Microsoft Copilot' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'MAI-Base / MAI-Base-2' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Grok / xAI' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Gemini / Gemma / Argon' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Samsung / AI memory' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Character.ai bankruptcy' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Alibaba open-weight' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Oracle datacenter' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'DeepSeek outage' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Timestral' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'OpenAI outage' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Hugging Face hack' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Palantir / AIP' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'AMD / MI300' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Tesla / FSD' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'ChatGPT Chrome' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Meta and Apple Mac AI' ".pages/$map" 2>/dev/null \
      || ! grep -qF 'Samsung AI glasses' ".pages/$map" 2>/dev/null; }; then
    cp -a "$PRESERVE_FAQ/$map" ".pages/$map"
    echo "restored $map agent map (#136/#139/#156/#157/#161/#162/#163/#164/#165/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#183/#184/#185/#191/#193/#195)"
  fi
done
# FINDABILITY #141 — restore tip /lab/ + companies hubs when #140
# labAboutLabel is missing (OpenAI / ChatGPT on /lab/openai.html rows).
for hub in lab/index.html companies.html companies/index.html; do
  if [ -f "$PRESERVE_FAQ/$hub" ] \
    && grep -qF '/lab/openai.html' ".pages/$hub" 2>/dev/null \
    && ! grep -qF 'OpenAI / ChatGPT' ".pages/$hub" 2>/dev/null; then
    mkdir -p ".pages/$(dirname "$hub")"
    cp -a "$PRESERVE_FAQ/$hub" ".pages/$hub"
    echo "restored $hub labAboutLabel (#141)"
  fi
done
# FINDABILITY #143 — restore tip home/classic when #142 knowsAbout
# labAboutLabel is missing after mid-merge collect on tip < #142.
for hub in index.html classic.html; do
  if [ -f "$PRESERVE_FAQ/$hub" ] \
    && ! grep -qF 'OpenAI / ChatGPT' ".pages/$hub" 2>/dev/null; then
    cp -a "$PRESERVE_FAQ/$hub" ".pages/$hub"
    echo "restored $hub knowsAbout labAboutLabel (#143)"
  fi
done
# FINDABILITY #145 — restore tip /race.html when #144 labAboutLabel
# is missing after mid-merge / news-only orphan on tip < #144.
for hub in race.html race/index.html; do
  if [ -f "$PRESERVE_FAQ/$hub" ] \
    && grep -qF '/lab/openai.html' ".pages/$hub" 2>/dev/null \
    && ! grep -qF 'OpenAI / ChatGPT' ".pages/$hub" 2>/dev/null; then
    mkdir -p ".pages/$(dirname "$hub")"
    cp -a "$PRESERVE_FAQ/$hub" ".pages/$hub"
    echo "restored $hub race labAboutLabel (#145)"
  fi
done
# FINDABILITY #153 — restore tip /watts.html when #152 IREN FAQ is
# missing after mid-merge / orphan Publish on tip < #152.
for hub in watts.html watts/index.html; do
  if [ -f "$PRESERVE_FAQ/$hub" ] \
    && ! grep -qF 'Why does SIREN watch IREN stock and AI cloud power in Google Search Trends?' ".pages/$hub" 2>/dev/null; then
    mkdir -p ".pages/$(dirname "$hub")"
    cp -a "$PRESERVE_FAQ/$hub" ".pages/$hub"
    echo "restored $hub IREN Trends FAQ (#153)"
  fi
done
# FINDABILITY #154 — restore tip /lab/micron.html when #151 DRAM FAQ
# is missing after mid-merge / orphan Publish on tip < #151.
if [ -f "$PRESERVE_FAQ/lab/micron.html" ] \
  && ! grep -qF 'Why does SIREN watch Micron stock, MU, and DRAM stock in Google Search Trends?' ".pages/lab/micron.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/micron.html" .pages/lab/micron.html
  echo "restored lab/micron.html DRAM Trends FAQ (#154)"
fi
# FINDABILITY #155/#160 — restore tip /lab/coreweave.html when CoreWeave
# stock or debt FAQ is missing after mid-merge / orphan Publish.
if [ -f "$PRESERVE_FAQ/lab/coreweave.html" ] \
  && { ! grep -qF 'Why does SIREN watch CoreWeave stock in Google Search Trends?' ".pages/lab/coreweave.html" 2>/dev/null \
    || ! grep -qF 'Why does SIREN watch CoreWeave debt and bond yields in Google Search Trends?' ".pages/lab/coreweave.html" 2>/dev/null; }; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/coreweave.html" .pages/lab/coreweave.html
  echo "restored lab/coreweave.html CoreWeave stock/debt FAQ (#155/#160)"
fi
# FINDABILITY #161 — restore tip /lab/nvidia.html when Nvidia / NVDA
# Trends FAQ is missing after mid-merge / orphan Publish on tip < #161.
if [ -f "$PRESERVE_FAQ/lab/nvidia.html" ] \
  && ! grep -qF 'Why does SIREN watch Nvidia stock and NVDA in Google Search Trends?' ".pages/lab/nvidia.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/nvidia.html" .pages/lab/nvidia.html
  echo "restored lab/nvidia.html Nvidia / NVDA Trends FAQ (#161)"
fi

# FINDABILITY #162 — restore tip /lab/openai.html when OpenAI lawsuit
# / FTC FAQ is missing after mid-merge / orphan Publish on tip < #162.
if [ -f "$PRESERVE_FAQ/lab/openai.html" ] \
  && { ! grep -qF 'Why does SIREN watch OpenAI lawsuits and FTC probes?' ".pages/lab/openai.html" 2>/dev/null \
    || ! grep -qF 'Why does SIREN watch OpenAI and ChatGPT outages?' ".pages/lab/openai.html" 2>/dev/null \
    || ! grep -qF 'Why does SIREN watch ChatGPT computer use and Chrome tabs?' ".pages/lab/openai.html" 2>/dev/null; }; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/openai.html" .pages/lab/openai.html
  echo "restored lab/openai.html OpenAI lawsuit / FTC + outage + Chrome FAQ (#162/#181/#191)"
fi

# FINDABILITY #163 — restore tip /lab/anthropic.html when Anthropic IPO
# / FTC FAQ is missing after mid-merge / orphan Publish on tip < #163.
if [ -f "$PRESERVE_FAQ/lab/anthropic.html" ] \
  && ! grep -qF 'Why does SIREN watch Anthropic IPO and FTC probes?' ".pages/lab/anthropic.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/anthropic.html" .pages/lab/anthropic.html
  echo "restored lab/anthropic.html Anthropic IPO / FTC FAQ (#163)"
fi

# FINDABILITY #164 — restore tip /lab/asml.html when ASML Trends FAQ
# is missing after mid-merge / orphan Publish on tip < #164.
if [ -f "$PRESERVE_FAQ/lab/asml.html" ] \
  && ! grep -qF 'Why does SIREN watch ASML in Google Search Trends?' ".pages/lab/asml.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/asml.html" .pages/lab/asml.html
  echo "restored lab/asml.html ASML Trends FAQ (#164)"
fi

# FINDABILITY #165 — restore tip /lab/tsmc.html when TSMC Trends FAQ
# is missing after mid-merge / orphan Publish on tip < #165.
if [ -f "$PRESERVE_FAQ/lab/tsmc.html" ] \
  && ! grep -qF 'Why does SIREN watch TSMC in Google Search Trends?' ".pages/lab/tsmc.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/tsmc.html" .pages/lab/tsmc.html
  echo "restored lab/tsmc.html TSMC Trends FAQ (#165)"
fi

# FINDABILITY #167 — restore tip /lab/amazon.html when Amazon Bee FAQ
# is missing after mid-merge / orphan Publish on tip < #167.
if [ -f "$PRESERVE_FAQ/lab/amazon.html" ] \
  && ! grep -qF 'Why does SIREN watch Amazon Bee and AI wearables?' ".pages/lab/amazon.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/amazon.html" .pages/lab/amazon.html
  echo "restored lab/amazon.html Amazon Bee FAQ (#167)"
fi

# FINDABILITY #169/#193 — restore tip /lab/meta.html when Meta Muse or
# Meta–Apple Mac FAQ is missing after mid-merge / orphan Publish.
if [ -f "$PRESERVE_FAQ/lab/meta.html" ] \
  && { ! grep -qF 'Why does SIREN watch Meta Muse and open-weight AI?' ".pages/lab/meta.html" 2>/dev/null \
    || ! grep -qF 'Why does SIREN watch Meta and Apple Mac AI partnerships?' ".pages/lab/meta.html" 2>/dev/null; }; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/meta.html" .pages/lab/meta.html
  echo "restored lab/meta.html Meta Muse + Meta–Apple Mac FAQ (#169/#193)"
fi

# FINDABILITY #170 — restore tip /lab/apple.html when Apple Intelligence FAQ
# is missing after mid-merge / orphan Publish on tip < #170.
if [ -f "$PRESERVE_FAQ/lab/apple.html" ] \
  && ! grep -qF 'Why does SIREN watch Apple Intelligence?' ".pages/lab/apple.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/apple.html" .pages/lab/apple.html
  echo "restored lab/apple.html Apple Intelligence FAQ (#170)"
fi

# FINDABILITY #171/#220 — restore tip /lab/microsoft.html when Microsoft Copilot
# or MAI-Base FAQ is missing after mid-merge / orphan Publish on tip < #171/#220.
if [ -f "$PRESERVE_FAQ/lab/microsoft.html" ] \
  && { ! grep -qF 'Why does SIREN watch Microsoft Copilot?' ".pages/lab/microsoft.html" 2>/dev/null \
    || ! grep -qF 'Why does SIREN watch Microsoft MAI-Base?' ".pages/lab/microsoft.html" 2>/dev/null; }; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/microsoft.html" .pages/lab/microsoft.html
  echo "restored lab/microsoft.html Microsoft Copilot + MAI-Base FAQ (#171/#220)"
fi

# FINDABILITY #173 — restore tip /lab/xai.html when Grok / xAI FAQ
# is missing after mid-merge / orphan Publish on tip < #173.
if [ -f "$PRESERVE_FAQ/lab/xai.html" ] \
  && ! grep -qF 'Why does SIREN watch Grok and xAI?' ".pages/lab/xai.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/xai.html" .pages/lab/xai.html
  echo "restored lab/xai.html Grok / xAI FAQ (#173)"
fi

# FINDABILITY #174 — restore tip /lab/google-deepmind.html when Gemini / Gemma / Argon FAQ
# is missing after mid-merge / orphan Publish on tip < #174.
if [ -f "$PRESERVE_FAQ/lab/google-deepmind.html" ] \
  && ! grep -qF 'Why does SIREN watch Gemini, Gemma, and Argon?' ".pages/lab/google-deepmind.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/google-deepmind.html" .pages/lab/google-deepmind.html
  echo "restored lab/google-deepmind.html Gemini / Gemma / Argon FAQ (#174/#187)"
fi

# FINDABILITY #175 — restore tip /lab/samsung.html when Samsung / HBM FAQ
# is missing after mid-merge / orphan Publish on tip < #175.
if [ -f "$PRESERVE_FAQ/lab/samsung.html" ] \
  && { ! grep -qF 'Why does SIREN watch Samsung and AI memory chips?' ".pages/lab/samsung.html" 2>/dev/null \
    || ! grep -qF 'Why does SIREN watch Samsung AI glasses?' ".pages/lab/samsung.html" 2>/dev/null; }; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/samsung.html" .pages/lab/samsung.html
  echo "restored lab/samsung.html Samsung / HBM + AI glasses FAQ (#175/#195)"
fi
# FINDABILITY #177 — restore tip /lab/qwen.html when Qwen FAQ
# is missing after mid-merge / orphan Publish on tip < #177.
if [ -f "$PRESERVE_FAQ/lab/qwen.html" ] \
  && ! grep -qF 'Why does SIREN watch Qwen and Alibaba open models?' ".pages/lab/qwen.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/qwen.html" .pages/lab/qwen.html
  echo "restored lab/qwen.html Qwen FAQ (#177)"
fi
# FINDABILITY #179 — restore tip /lab/deepseek.html when DeepSeek FAQ
# is missing after mid-merge / orphan Publish on tip < #179.
if [ -f "$PRESERVE_FAQ/lab/deepseek.html" ] \
  && ! grep -qF 'Why does SIREN watch DeepSeek and AI outages?' ".pages/lab/deepseek.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/deepseek.html" .pages/lab/deepseek.html
  echo "restored lab/deepseek.html DeepSeek outage FAQ (#179)"
fi
# FINDABILITY #180 — restore tip /lab/mistral.html when Mistral FAQ
# is missing after mid-merge / orphan Publish on tip < #180.
if [ -f "$PRESERVE_FAQ/lab/mistral.html" ] \
  && ! grep -qF 'Why does SIREN watch Mistral and Timestral?' ".pages/lab/mistral.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/mistral.html" .pages/lab/mistral.html
  echo "restored lab/mistral.html Mistral / Timestral FAQ (#180)"
fi
# FINDABILITY #157 — restore tip /tags/neoclouds.html when neocloud
# Trends FAQ is missing after mid-merge / orphan Publish on tip < #157.
if [ -f "$PRESERVE_FAQ/tags/neoclouds.html" ] \
  && ! grep -qF 'Why does SIREN watch neocloud and neoclouds in Google Search Trends?' ".pages/tags/neoclouds.html" 2>/dev/null; then
  mkdir -p .pages/tags
  cp -a "$PRESERVE_FAQ/tags/neoclouds.html" .pages/tags/neoclouds.html
  echo "restored tags/neoclouds.html neocloud Trends FAQ (#157)"
fi
# FINDABILITY #176 — restore tip /tags/chatbots.html when Character.ai
# bankruptcy FAQ is missing after mid-merge / orphan Publish on tip < #176.
if [ -f "$PRESERVE_FAQ/tags/chatbots.html" ] \
  && ! grep -qF 'Why does SIREN watch Character.ai and AI chatbot bankruptcies?' ".pages/tags/chatbots.html" 2>/dev/null; then
  mkdir -p .pages/tags
  cp -a "$PRESERVE_FAQ/tags/chatbots.html" .pages/tags/chatbots.html
  echo "restored tags/chatbots.html Character.ai bankruptcy FAQ (#176)"
fi
# FINDABILITY #182 — restore tip /tags/huggingface.html when Hugging Face
# hack FAQ is missing after mid-merge / orphan Publish on tip < #182.
if [ -f "$PRESERVE_FAQ/tags/huggingface.html" ] \
  && ! grep -qF 'Why does SIREN watch Hugging Face hacks and incidents?' ".pages/tags/huggingface.html" 2>/dev/null; then
  mkdir -p .pages/tags
  cp -a "$PRESERVE_FAQ/tags/huggingface.html" .pages/tags/huggingface.html
  echo "restored tags/huggingface.html Hugging Face hack FAQ (#182)"
fi

# FINDABILITY #183 — restore tip /lab/palantir.html when Palantir FAQ
# is missing after mid-merge / orphan Publish on tip < #183.
if [ -f "$PRESERVE_FAQ/lab/palantir.html" ] \
  && ! grep -qF 'Why does SIREN watch Palantir and government AI?' ".pages/lab/palantir.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/palantir.html" .pages/lab/palantir.html
  echo "restored lab/palantir.html Palantir / AIP FAQ (#183)"
fi

# FINDABILITY #184 — restore tip /lab/amd.html when AMD FAQ
# is missing after mid-merge / orphan Publish on tip < #184.
if [ -f "$PRESERVE_FAQ/lab/amd.html" ] \
  && ! grep -qF 'Why does SIREN watch AMD and AI GPUs?' ".pages/lab/amd.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/amd.html" .pages/lab/amd.html
  echo "restored lab/amd.html AMD / MI300 FAQ (#184)"
fi

# FINDABILITY #185 — restore tip /lab/tesla.html when Tesla FAQ
# is missing after mid-merge / orphan Publish on tip < #185.
if [ -f "$PRESERVE_FAQ/lab/tesla.html" ] \
  && ! grep -qF 'Why does SIREN watch Tesla Autopilot and FSD?' ".pages/lab/tesla.html" 2>/dev/null; then
  mkdir -p .pages/lab
  cp -a "$PRESERVE_FAQ/lab/tesla.html" .pages/lab/tesla.html
  echo "restored lab/tesla.html Tesla / FSD FAQ (#185)"
fi
# FINDABILITY #178 — restore tip /tags/datacenters.html when Oracle
# / AI datacenter FAQ is missing after mid-merge / orphan Publish on tip < #178.
if [ -f "$PRESERVE_FAQ/tags/datacenters.html" ] \
  && ! grep -qF 'Why does SIREN watch Oracle and AI datacenters?' ".pages/tags/datacenters.html" 2>/dev/null; then
  mkdir -p .pages/tags
  cp -a "$PRESERVE_FAQ/tags/datacenters.html" .pages/tags/datacenters.html
  echo "restored tags/datacenters.html Oracle / AI datacenter FAQ (#178)"
fi
# FINDABILITY #158/#166 — restore tip /search-trends.html (+ aliases) when
# watchlist routing FAQ is missing, or when ASML/TSMC destinations were
# dropped from the answer after mid-merge / orphan Publish.
if [ -f "$PRESERVE_FAQ/search-trends.html" ] \
  && { ! grep -qF 'Where does SIREN send IREN stock, dram stock, CoreWeave stock, and neocloud Trends?' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'ASML / EUV AI chip tools → /lab/asml.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'TSMC / AI foundry → /lab/tsmc.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Amazon Bee / AI wearables → /lab/amazon.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Meta Muse / open-weight AI → /lab/meta.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Meta–Apple Mac AI / Muse on Mac → /lab/meta.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Apple Intelligence → /lab/apple.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Microsoft Copilot → /lab/microsoft.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Microsoft MAI-Base / MAI-Base-2 → /lab/microsoft.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Grok / xAI → /lab/xai.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Gemini / Gemma / Argon → /lab/google-deepmind.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Samsung / HBM / AI memory → /lab/samsung.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Samsung AI glasses → /lab/samsung.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Character.ai bankruptcy → /tags/chatbots.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Qwen / Alibaba open models → /lab/qwen.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Oracle / AI datacenters → /tags/datacenters.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'DeepSeek outage → /lab/deepseek.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Mistral / Timestral → /lab/mistral.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'OpenAI outage → /lab/openai.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'ChatGPT Chrome / computer use → /lab/openai.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Hugging Face hack → /tags/huggingface.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Palantir / AIP → /lab/palantir.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'AMD / MI300 → /lab/amd.html' ".pages/search-trends.html" 2>/dev/null \
    || ! grep -qF 'Tesla / FSD → /lab/tesla.html' ".pages/search-trends.html" 2>/dev/null; }; then
  cp -a "$PRESERVE_FAQ/search-trends.html" .pages/search-trends.html
  cp -a "$PRESERVE_FAQ/search-trends.html" .pages/trends.html
  mkdir -p .pages/trends .pages/search-trends
  cp -a "$PRESERVE_FAQ/search-trends.html" .pages/trends/index.html
  cp -a "$PRESERVE_FAQ/search-trends.html" .pages/search-trends/index.html
  echo "restored search-trends.html routing FAQ (#158/#166/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#183/#184/#185)"
fi
# FINDABILITY #210 — merge tip news:keywords probe needles into rebuilt
# news-sitemap so orphan Publish on tip < #208 cannot wipe Roadster/Starshield.
if [ -f "$PRESERVE_FAQ/news-sitemap.xml" ] && [ -f .pages/news-sitemap.xml ]; then
  node collector/tools/merge-news-keyword-tip.mjs \
    "$PRESERVE_FAQ/news-sitemap.xml" .pages/news-sitemap.xml
fi
rm -rf "$PRESERVE_FAQ"
cd .pages
git init -q -b gh-pages
git config user.name  'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -q -m "$SUBJECT" \
  -m "Build output from ${GITHUB_REPOSITORY}@${GITHUB_SHA} (collect/news). Do not hand-edit."
# news-fast also publishes to gh-pages on its own schedule. A bare
# force-push loses the compare-and-swap race ("cannot lock ref") when
# both land in the same second; retry until ours is the tip.
for attempt in 1 2 3 4 5; do
  if git push -q -f "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" gh-pages; then
    break
  fi
  echo "gh-pages push rejected (attempt $attempt); retrying"
  sleep $((attempt * 2))
  if [ "$attempt" -eq 5 ]; then
    echo '::error::could not publish to gh-pages after 5 attempts'
    exit 1
  fi
done
cd ..
rm -rf .pages
echo "published: $SUBJECT"

