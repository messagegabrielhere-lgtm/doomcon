// ACCESS pillar — how much model you can buy for a dollar.
//
// This is the most concrete "AI is getting better for people" number available
// anywhere in this repo, and it is the one source here that needs no interpretation
// at all: the same catalogue that DOOMCON's capability pillar counts for arrivals
// carries a dated price for every listed model. Falling price is not a proxy for
// broadening access. It IS broadening access.
//
// THE INVERSION. CONTRACT.md requires that higher always means more of what the
// index measures. Price runs the wrong way — cheaper is better — so this adapter
// reports the RECIPROCAL, million-tokens-per-dollar, rather than negating a price.
// Both satisfy the contract; the reciprocal is chosen because it is a quantity a
// reader can check against their own bill, and a negative dollar figure on a chart
// is a puzzle nobody should have to solve.
//
// Measured 2026-09-24: 459 models listed, 430 with a positive two-sided price, 360
// of those at 128k context or more. The p10 blended price among them was
// $0.1225 per million tokens — 8.16 million tokens for a dollar. The floor was
// mistralai/mistral-nemo at $0.0217; the median was $0.90.

const ENDPOINT = 'https://openrouter.ai/api/v1/models';

// Serviceability bar. A model with a 4k context window is cheap the way a bicycle
// is cheap — it is not the same good. 128k is the current floor for "you could
// actually build the thing you wanted to build on this", and holding the bar fixed
// is what makes the series comparable across time as the catalogue turns over.
const MIN_CONTEXT = 131_072;

// Blend ratio for a single headline price. Real workloads read far more than they
// write; 3:1 prompt:completion is the conventional assumption and is stated here
// rather than buried, because changing it changes the number and a reader is
// entitled to know which mixture they are looking at.
const PROMPT_SHARE = 0.75;
const COMPLETION_SHARE = 0.25;

// The 10th percentile, not the minimum. The minimum is one listing, and a single
// delisting or a promotional price moves it by a factor of two — that is a
// measurement of one vendor's marketing calendar, not of the market. The p10 over
// hundreds of models is the frontier of cheap and it moves when the frontier does.
const PERCENTILE = 0.10;

// Below this the percentile is arithmetic over a crowd too small to have a shape.
const MIN_POOL = 40;

const TOKENS_PER_UNIT = 1_000_000;

/** Nearest-rank percentile over an ascending array. */
function quantile(sorted, p) {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[i];
}

export default {
  id: 'openrouter-cost-floor',
  pillar: 'access',
  label: 'Tokens per dollar at the cheap frontier',

  async collect(fetchJson) {
    const observedAt = new Date();

    const body = await fetchJson(ENDPOINT);
    const models = body?.data;

    if (!Array.isArray(models)) {
      throw new Error(
        `openrouter-cost-floor: expected an array at .data from ${ENDPOINT}, got ${typeof models} — API shape changed`,
      );
    }
    if (models.length === 0) {
      throw new Error(
        `openrouter-cost-floor: catalogue came back empty from ${ENDPOINT} — treating as a dead source, not as free tokens`,
      );
    }

    const pool = [];
    let freeCount = 0;
    let pricedCount = 0;

    for (const model of models) {
      // Prices arrive as STRINGS ("0.0000028"). Number() on a missing field yields
      // NaN and on null yields 0 — and a zero price is indistinguishable from a
      // free model, which would silently divide by zero three lines later and
      // report infinite generosity. Both are filtered explicitly.
      const prompt = Number(model?.pricing?.prompt);
      const completion = Number(model?.pricing?.completion);
      const ctx = Number(model?.context_length);

      if (!Number.isFinite(prompt) || !Number.isFinite(completion)) continue;
      if (prompt === 0 && completion === 0) { freeCount += 1; continue; }
      if (prompt <= 0 || completion <= 0) continue;
      pricedCount += 1;
      if (!Number.isFinite(ctx) || ctx < MIN_CONTEXT) continue;

      // Per-token prices, scaled to a per-million figure a human recognises.
      pool.push((prompt * PROMPT_SHARE + completion * COMPLETION_SHARE) * TOKENS_PER_UNIT);
    }

    if (pool.length < MIN_POOL) {
      throw new Error(
        `openrouter-cost-floor: only ${pool.length} priced models at >=${MIN_CONTEXT} context ` +
          `(needed ${MIN_POOL}) out of ${models.length} listed — either the catalogue shrank or ` +
          `the pricing shape changed. Refusing to compute a percentile over a pool this small.`,
      );
    }

    pool.sort((a, b) => a - b);
    const usdPerMillion = quantile(pool, PERCENTILE);

    if (!Number.isFinite(usdPerMillion) || usdPerMillion <= 0) {
      throw new Error(
        `openrouter-cost-floor: p${PERCENTILE * 100} blended price computed as ` +
          `${JSON.stringify(usdPerMillion)} — refusing to divide by it`,
      );
    }

    // Million tokens per dollar. usdPerMillion is dollars per million tokens, so
    // its reciprocal is millions of tokens per dollar directly - no further
    // scaling, which keeps it checkable by eye against the meta field below.
    // Higher = cheaper = more access, the direction every source here runs.
    const value = 1 / usdPerMillion;

    return {
      value: Number(value.toFixed(6)),
      unit: 'Mtok/usd',
      observed_at: observedAt.toISOString(),
      meta: {
        percentile: PERCENTILE,
        usd_per_million_tokens: Number(usdPerMillion.toFixed(6)),
        blend: { prompt: PROMPT_SHARE, completion: COMPLETION_SHARE },
        min_context: MIN_CONTEXT,
        pool_size: pool.length,
        catalogue_size: models.length,
        priced_models: pricedCount,
        free_models: freeCount,
        cheapest_usd_per_million: Number(pool[0].toFixed(6)),
        median_usd_per_million: Number(quantile(pool, 0.5).toFixed(6)),
      },
    };
  },
};
