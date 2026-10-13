// DataCrunch GPU cloud: on-demand and spot $/GPU-hour for a frozen set of
// single-GPU instance types. Second street-price read for Compute & Capital,
// independent of Vast.ai's consumer spot book and of SEC filing volume.
//
// Endpoint is keyless JSON (verified 2026-10-13): GET /v1/instance-types
// returns ~79 rows with price_per_hour and spot_price as decimal strings.
//
// Uncalibrated on admission: there is no honest historical reconstruction of
// this catalogue. It reports into the shadow / unconventional path until a
// forward-built reference exists (docs/REFERENCE-VERSIONING.md, IMPROVEMENTS-v1).

const ENDPOINT = 'https://api.datacrunch.io/v1/instance-types';

// FROZEN. Changing the basket silently rebases the series. H100 is the deepest
// single-GPU class that is both listed and priced on this catalogue today;
// A100 80GB and L40S keep the floor from vanishing if H100 inventory thins.
const MODELS = Object.freeze(['H100', 'A100 80GB', 'L40S']);

// Prefer spot (moves with demand). Fall back to on-demand list when spot is
// absent or zero so a quiet book does not zero the reading.
const MIN_PRICES = 2;

function money(v) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function median(sorted) {
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default {
  id: 'datacrunch',
  pillar: 'compute',
  label: 'DataCrunch GPU spot floor ($/hr)',

  async collect(fetchJson) {
    const body = await fetchJson(ENDPOINT);
    if (!Array.isArray(body)) {
      throw new Error(
        `datacrunch: expected an array of instance types (got ${typeof body}; keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
      );
    }

    const allowed = new Set(MODELS);
    const perGpu = [];
    const usedModels = new Set();
    let scanned = 0;

    for (const row of body) {
      const model = row?.model;
      if (!allowed.has(model)) continue;
      const n = row?.gpu?.number_of_gpus;
      if (typeof n !== 'number' || n !== 1) continue;
      scanned += 1;
      const spot = money(row.spot_price);
      const list = money(row.price_per_hour);
      const price = spot ?? list;
      if (price === null) continue;
      perGpu.push(price);
      usedModels.add(model);
    }

    if (perGpu.length < MIN_PRICES) {
      throw new Error(
        `datacrunch: only ${perGpu.length} usable single-GPU prices across ${MODELS.join('/')} ` +
        `(need ${MIN_PRICES}; scanned ${scanned} matching rows)`
      );
    }

    perGpu.sort((a, b) => a - b);
    const value = median(perGpu);
    if (!Number.isFinite(value)) {
      throw new Error(`datacrunch: median resolved to non-finite ${value}`);
    }

    return {
      value,
      unit: 'usd/gpu/hour',
      observed_at: new Date().toISOString(),
      meta: {
        models: MODELS.slice(),
        models_used: [...usedModels].sort(),
        offers_used: perGpu.length,
        cheapest: perGpu[0],
        dearest: perGpu[perGpu.length - 1],
        direction: 'higher = tighter GPU cloud market',
        source_note: 'median of spot (else on-demand) $/hr for frozen single-GPU models; uncalibrated until forward reference',
      },
    };
  },
};
