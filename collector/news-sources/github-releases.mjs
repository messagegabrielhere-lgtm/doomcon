// GitHub releases.atom across a fixed basket of AI repositories.
//
// A release is the most unambiguous "something shipped" event there is: a tag
// was cut, notes were written, users were told to upgrade. It is also FAST — an
// SDK release lands within hours of a model launch and often before the lab's
// own blog post clears review, which is the upstream position this whole layer
// is built to occupy.
//
// This is also the only door Anthropic has into the feed as a publisher, since
// Anthropic ships no blog RSS at any path (see anthropic-status.mjs).
//
// BASKET DISCIPLINE. Fixed and hand-picked. A basket that grows over time
// manufactures a rising trend out of nothing — the same rule and the same
// reasoning as collector/sources/github-releases.mjs, which holds the frozen
// reference distribution for the INDEX. This file feeds the NEWS reel and not
// the index, so its basket may differ, but it must still be changed
// deliberately and never by accident.
//
// Verified 2026-09-23: every repo below returns 200, application/atom+xml.
// Deliberately EXCLUDED: huggingface/transformers (1.3MB feed) and
// vllm-project/vllm (734KB) — both tag often enough that they would dominate
// the reel with routine point releases while costing 2MB of transfer per run.

import { parseFeed, assertXmlFeed, draft } from './_feed.mjs';

const REPOS = [
  // Frontier-lab clients: a model launch shows up here on day zero.
  'openai/openai-python',
  'anthropics/claude-code',
  'anthropics/anthropic-sdk-python',
  'googleapis/python-genai',
  // Open weights and the runtimes that serve them.
  'google-deepmind/gemma',
  'ollama/ollama',
  // The tool-use protocol the agent ecosystem standardised on.
  'modelcontextprotocol/python-sdk',
];

// releases.atom returns the 10 most recent releases and nothing more; ?page=2
// returns page 1 again (verified 2026-09-23). A hard ceiling per repo, so a
// repo that cut 30 releases today is reported as 10 rather than silently
// truncated without saying so.
const PER_REPO = 6;

export default {
  id: 'github-releases',
  kind: 'release',
  label: 'GitHub releases (AI basket)',
  weight: 0.75,

  async collect(fetchText) {
    const results = await Promise.allSettled(
      REPOS.map(async (repo) => {
        const url = `https://github.com/${repo}/releases.atom`;
        const { data, headers } = await fetchText(url, { timeoutMs: 20_000, withMeta: true });
        assertXmlFeed(data, url, headers?.['content-type'] ?? '');
        return { repo, url, entries: parseFeed(data, { limit: PER_REPO }) };
      }),
    );

    const items = [];
    const failed = [];

    for (let i = 0; i < results.length; i++) {
      const outcome = results[i];
      if (outcome.status !== 'fulfilled') {
        // A basket member that failed is NAMED in meta rather than silently
        // dropped. A missing member is a silent zero otherwise, and a silent
        // zero in a basket is indistinguishable from a quiet week.
        failed.push({ repo: REPOS[i], error: outcome.reason?.message ?? String(outcome.reason) });
        continue;
      }
      const { repo, entries } = outcome.value;
      for (const e of entries) {
        if (!e.published_at) continue;
        items.push(draft({
          source: 'github-releases',
          kind: 'release',
          title: `${repo} ${e.title}`,
          summary: e.summary || `New release of ${repo}.`,
          url: e.url,
          published_at: e.published_at,
          defaultPillar: 'capability',
          meta: { repo, release_tag: e.title, basket_size: REPOS.length },
        }));
      }
    }

    // Report the whole basket's health on every item, so a reader of the feed
    // file can see the source was partially degraded without reading a log.
    for (const item of items) {
      item.meta.basket_failed = failed;
      item.meta.basket_live = REPOS.length - failed.length;
    }

    if (items.length === 0) {
      throw new Error(
        `github-releases: all ${REPOS.length} basket repos yielded nothing` +
          (failed.length ? ` — ${failed.map((f) => `${f.repo}: ${f.error}`).join('; ')}` : ''),
      );
    }
    return items;
  },
};
