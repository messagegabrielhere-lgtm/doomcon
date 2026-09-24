// ADOPTION pillar — open weights actually being pulled.
//
// The companion to pypi-ai-installs, and the reason both exist: PyPI counts people
// installing the tooling, this counts people fetching the MODELS. A library install
// might be a transitive dependency; a 5GB weights download is a deliberate act with
// a bandwidth bill attached.
//
// It is also the number that closes the loop on the ACCESS pillar. hf-permissive-models
// counts open weights being PUBLISHED. If publication rose while downloads stayed
// flat, the honest reading would be that the field is producing artefacts nobody
// uses - and this index should be able to show that rather than assume it away.
//
// A BASKET METRIC, ALL-OR-NOTHING, for the same reason as pypi-ai-installs: a
// missing member makes the sum a different measurement rather than a smaller one.
//
// Measured 2026-09-24, HuggingFace `downloads` (trailing 30 days):
// all-MiniLM-L6-v2 251.4M, Qwen2.5-7B-Instruct 9.7M, Llama-3.1-8B-Instruct 6.2M,
// whisper-large-v3 4.7M, stable-diffusion-xl-base-1.0 3.4M,
// Mistral-7B-Instruct-v0.3 2.3M, gemma-2-9b-it 0.86M, Phi-3-mini-4k-instruct 0.35M.
// Basket total 278,916,768.

const ENDPOINT = 'https://huggingface.co/api/models';

// FIXED basket, spanning the things open weights are actually used FOR: an
// embedding workhorse, four instruction-tuned text models from four different
// labs, speech, image, and a small model that runs on a laptop. Every one is
// permissively or openly licensed and every one is a stable, long-lived repo id -
// a renamed repo would take the source dark rather than silently drop a term.
//
// As with the PyPI basket: changing this list is creating a NEW source, because
// every percentile against the frozen reference after the edit measures the edit.
const BASKET = [
  'sentence-transformers/all-MiniLM-L6-v2',
  'Qwen/Qwen2.5-7B-Instruct',
  'meta-llama/Llama-3.1-8B-Instruct',
  'openai/whisper-large-v3',
  'stabilityai/stable-diffusion-xl-base-1.0',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'google/gemma-2-9b-it',
  'microsoft/Phi-3-mini-4k-instruct',
];

export default {
  id: 'hf-model-downloads',
  pillar: 'adoption',
  label: 'Downloads of widely deployed open models',

  async collect(fetchJson) {
    const observedAt = new Date();

    const perModel = {};
    let total = 0;

    for (const id of BASKET) {
      // The id contains a slash and must keep it — it is a path segment pair, not
      // one encoded token. encodeURIComponent on the whole id would turn
      // "org/model" into "org%2Fmodel" and the Hub answers that with a 404.
      const url = `${ENDPOINT}/${id.split('/').map(encodeURIComponent).join('/')}`;
      const body = await fetchJson(url);

      const downloads = body?.downloads;
      if (!Number.isFinite(downloads)) {
        throw new Error(
          `hf-model-downloads: model "${id}" returned no finite .downloads ` +
            `(got ${JSON.stringify(downloads)}) from ${url} — the basket is a fixed set and a ` +
            `missing member silently changes what the sum measures, so the whole source goes dark`,
        );
      }
      if (downloads === 0) {
        throw new Error(
          `hf-model-downloads: model "${id}" reported 0 downloads over the trailing 30 days — ` +
            `implausible for a basket member, treating it as a stat-pipeline failure rather ` +
            `than folding a zero into the sum`,
        );
      }

      perModel[id] = downloads;
      total += downloads;
    }

    return {
      value: total,
      unit: 'downloads/30d',
      observed_at: observedAt.toISOString(),
      meta: {
        basket: BASKET,
        basket_size: BASKET.length,
        per_model: perModel,
        // The Hub's `downloads` field is a trailing-30-day figure, not all-time.
        // Stated here because the difference is a factor of years.
        field: 'downloads (trailing 30d)',
      },
    };
  },
};
