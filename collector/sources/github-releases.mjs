// Capability pillar — vendor and framework release velocity.
//
// A release is a commitment: someone cut a tag, wrote notes and told users to
// upgrade. Counting them across a fixed basket of the repos the field actually
// runs on gives a shipping-tempo signal that no paper count can see.

import { fetchAll as defaultFetchAll } from '../fetch.mjs';

const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

// releases.atom returns the 10 most recent releases and nothing else. `?page=2`
// returns page 1 again (verified 2026-09-23), and the JSON API needs a token we
// are not allowed to have (CONTRACT.md §1.3). 10 is therefore a hard ceiling per
// repo, which is the single most important property of this source.
const ATOM_FEED_CAP = 10;

/**
 * The basket. Fixed, hand-picked, and changed only deliberately — a basket that
 * grows over time manufactures a rising trend out of nothing, and the reference
 * distribution in data/reference.json is frozen against THIS list.
 *
 * Chosen as: the four frontier labs' official client SDKs (where a model launch
 * shows up as a release within hours), the serving stacks, and the training /
 * orchestration frameworks the ecosystem is built on.
 *
 * Deliberately EXCLUDED, and why — each was probed on 2026-09-23:
 *   pytorch/pytorch     tags every trunk commit; all 10 feed entries covered 34
 *                       minutes. Permanently saturated, so it would contribute a
 *                       constant 10 and drown the repos that carry signal.
 *   ggml-org/llama.cpp  same failure mode: per-build tags (b11118…), 10 entries
 *                       inside 9 hours.
 *   meta-llama/llama-stack  301s to ogx-ai/ogx — the repo moved out of Meta's org.
 *                       A basket member whose identity is in motion is not stable
 *                       enough to hold a frozen reference distribution.
 */
const REPOS = [
  // Frontier-lab client SDKs — a model launch lands here on day zero.
  'openai/openai-python',
  'openai/openai-agents-python',
  'anthropics/anthropic-sdk-python',
  'googleapis/python-genai',
  // Serving and inference stacks.
  'vllm-project/vllm',
  'sgl-project/sglang',
  'ollama/ollama',
  // Model and training libraries.
  'huggingface/transformers',
  'huggingface/diffusers',
  'unslothai/unsloth',
  // Application-layer frameworks and the tool-use protocol.
  'langchain-ai/langchain',
  'run-llama/llama_index',
  'modelcontextprotocol/python-sdk',
];

const feedUrl = (repo) => `https://github.com/${repo}/releases.atom`;

/**
 * Pull the release timestamps out of an Atom feed.
 *
 * Scoped to <entry> blocks because the feed carries its own document-level
 * <updated> before the first entry; a naive global match would count the feed
 * itself as a release. Entries are NOT ordered by <updated> (GitHub orders by
 * release creation), so every entry must be examined — no early break.
 */
function releaseTimestamps(xml, repo) {
  const stamps = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const raw = entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
    if (!raw) throw new Error(`github-releases: ${repo} has an <entry> with no <updated>`);
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) throw new Error(`github-releases: ${repo} has unparseable <updated> "${raw}"`);
    stamps.push(t);
  }
  return stamps;
}

export default {
  id: 'github-releases',
  pillar: 'capability',
  label: 'AI repo releases',

  // fetchAll is injected-with-a-default rather than taken from the contract's
  // `collect(fetchJson)` parameter: this source fans out over 13 Atom feeds. It is
  // still the shared helper, so timeout/retry/UA/concurrency-cap all hold.
  async collect(fetchJson, { fetchAll = defaultFetchAll } = {}) {
    const observedAt = new Date();
    const cutoffMs = observedAt.getTime() - WINDOW_MS;

    const results = await fetchAll(
      REPOS.map((repo) => ({ key: repo, url: feedUrl(repo), parse: 'text' })),
    );

    // Any failure is fatal, and that is not laziness. This value is a sum over a
    // fixed basket: a repo we could not reach contributes 0, which is
    // indistinguishable from a repo that shipped nothing. That is imputation by
    // omission — the exact thing CONTRACT.md forbids. Better one dark run than a
    // number that quietly means something different from the run before it.
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      throw new Error(
        `github-releases: ${failed.length}/${REPOS.length} feeds failed, refusing to sum a partial basket — ` +
          failed.map((r) => `${r.key}: ${r.error.message}`).join(' | '),
      );
    }

    let total = 0;
    const perRepo = {};
    const truncated = [];

    for (const { key: repo, value: xml } of results) {
      const stamps = releaseTimestamps(xml, repo);
      const inWindow = stamps.filter((t) => t >= cutoffMs).length;
      total += inWindow;
      perRepo[repo] = inWindow;

      // Every one of the 10 available entries fell inside the window, so the real
      // count is >= 10 and we cannot see how much more. Reported, never imputed:
      // downstream gets a floor that is explicitly labelled as a floor.
      if (stamps.length >= ATOM_FEED_CAP && inWindow === stamps.length) truncated.push(repo);
    }

    return {
      value: total,
      unit: `releases/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        repos: REPOS.length,
        feed_cap: ATOM_FEED_CAP,
        // Non-empty means `value` is a lower bound. It stays monotone in activity,
        // so the index is still directionally sound, but the top of the range is
        // compressed. If this list is routinely most of the basket, shorten
        // WINDOW_DAYS rather than pretending the cap is not there.
        truncated_repos: truncated,
        per_repo: perRepo,
      },
    };
  },
};
