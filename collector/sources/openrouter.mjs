// Capability pillar — how fast new models reach the point of being servable.
//
// arXiv counts intent; OpenRouter counts arrival. A model appearing in this
// catalogue has weights, an endpoint and a price, which is a much later and much
// harder milestone than a preprint. The two together give the pillar a leading and
// a lagging edge.

const WINDOW_DAYS = 30;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Whole catalogue in one response (~454 models as of 2026-09-23), no pagination,
// no key. Counting is done client-side because there is no date filter.
const ENDPOINT = 'https://openrouter.ai/api/v1/models';

// 30 days, not 24 hours: the catalogue turns over slowly enough that a daily count
// is usually 0-3, which quantises the percentile into a handful of buckets and
// makes the pillar twitch on single launches. A month-long trailing window keeps
// the number in the tens and the derivative meaningful.

export default {
  id: 'openrouter',
  pillar: 'capability',
  label: 'OpenRouter models listed',

  async collect(fetchJson) {
    const observedAt = new Date();
    const cutoffSeconds = (observedAt.getTime() - WINDOW_MS) / 1000;

    const body = await fetchJson(ENDPOINT);
    const models = body?.data;

    if (!Array.isArray(models)) {
      throw new Error(
        `openrouter: expected an array at .data from ${ENDPOINT}, got ${typeof models} — API shape changed`,
      );
    }
    if (models.length === 0) {
      throw new Error(`openrouter: catalogue came back empty from ${ENDPOINT} — treating as a dead source, not as zero activity`);
    }

    let count = 0;
    let newest = null;

    for (const model of models) {
      // `created` is unix SECONDS. Comparing it against Date.now() milliseconds
      // yields 0 every single run and looks exactly like a quiet month — the most
      // expensive kind of bug this index can have.
      const created = model?.created;
      if (!Number.isFinite(created)) {
        throw new Error(
          `openrouter: model "${model?.id ?? '<no id>'}" has no finite .created ` +
            `(got ${JSON.stringify(created)}) — API shape changed, refusing to guess`,
        );
      }
      if (newest === null || created > newest) newest = created;
      if (created >= cutoffSeconds) count++;
    }

    return {
      value: count,
      unit: `models/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        catalogue_size: models.length,
        newest_listed_at: new Date(newest * 1000).toISOString(),
      },
    };
  },
};
