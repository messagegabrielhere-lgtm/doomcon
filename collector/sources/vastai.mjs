// Vast.ai GPU spot market: what it costs to rent an hour of consumer-datacentre
// compute right now. Rents are the fastest-moving observable in the AI supply
// chain — they reprice hourly, where cloud list prices reprice yearly.
//
// Verified 2026-09-22: the query below returns 64 RTX 4090 offers, median
// $0.476-0.487 per GPU-hour on two consecutive calls.

const ENDPOINT = 'https://console.vast.ai/api/v0/bundles/';

// SCALAR CHOICE, and why it points the right way.
//
// We take the MEDIAN $/hour PER GPU across the cheapest rentable on-demand
// offers for ONE fixed GPU model, and that number RISES AS THE MARKET TIGHTENS.
//
// Why a fixed model: Vast's fleet is a churning mix of everything from V100s to
// RTX 6000 Pros. An unfiltered average measures which cards happened to be
// listed today, not what compute costs. Pinning the model holds composition
// constant so the series tracks price, not inventory drift.
//
// Why the RTX 4090: it is the deepest, most continuously-listed class on Vast,
// so the basket does not evaporate on a quiet day.
//
// Why "cheapest first" and a median: sorting ascending points the measurement
// at the floor of the market, which is the part that moves first — when demand
// arrives the cheap offers get rented and the floor lifts. The median of that
// window ignores the handful of mispriced or nearly-expired listings that sit
// at the very bottom (we saw two at $0.1363 against a $0.48 median).
//
// Direction: more renting -> scarce supply -> floor rises -> value rises.
const GPU_NAME = 'RTX 4090';

// TRAP: a top-level `limit` query param is rejected outright
// ("limit: Extra inputs are not permitted") and a `limit` inside q is ignored —
// the endpoint hard-caps a page at 64 offers. Filters and `order` inside q DO
// take effect, so 64 means "the 64 cheapest", which is exactly the window we
// want. Do not "fix" this by trying to paginate; treat 64 as the design.
const QUERY = {
  gpu_name: { eq: GPU_NAME },
  rentable: { eq: true },
  type: 'on-demand',
  order: [['dph_total', 'asc']],
};

// Guard against reading a price off a near-empty listing. Below this the median
// is a rumour, not a market, so we go dark rather than publish a thin number.
const MIN_OFFERS = 8;

function median(sorted) {
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default {
  id: 'vastai',
  pillar: 'compute',
  label: 'GPU spot floor (RTX 4090 $/hr)',

  async collect(fetchJson) {
    const qs = new URLSearchParams({ q: JSON.stringify(QUERY) });
    const body = await fetchJson(`${ENDPOINT}?${qs}`);

    // Vast reports its own errors inside a 200 body, so an HTTP-level check in
    // the shared helper will not catch them.
    if (body?.success === false) {
      throw new Error(`vastai: API error ${body.error ?? '?'}: ${body.msg ?? 'no message'}`);
    }

    const offers = body?.offers;
    if (!Array.isArray(offers)) {
      throw new Error(
        `vastai: expected an offers array (got ${typeof offers}; keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
      );
    }

    // dph_total is the price for the WHOLE offer, which may bundle several
    // cards or a fraction of one. Dividing by num_gpus is what makes offers
    // comparable to each other and across time.
    const perGpu = [];
    for (const o of offers) {
      const n = o?.num_gpus;
      const dph = o?.dph_total;
      if (typeof n !== 'number' || n <= 0) continue;
      if (typeof dph !== 'number' || !Number.isFinite(dph) || dph <= 0) continue;
      // The server filter should make this redundant; if it ever silently stops
      // filtering, this keeps a foreign GPU out of a "fixed class" median.
      if (o.gpu_name !== GPU_NAME) continue;
      perGpu.push(dph / n);
    }

    if (perGpu.length < MIN_OFFERS) {
      throw new Error(
        `vastai: only ${perGpu.length} usable ${GPU_NAME} offers (need ${MIN_OFFERS}); ` +
        `market too thin to price`
      );
    }

    perGpu.sort((a, b) => a - b);
    const value = median(perGpu);

    if (!Number.isFinite(value)) {
      throw new Error(`vastai: median resolved to non-finite ${value}`);
    }

    return {
      value,
      unit: 'usd/gpu/hour',
      observed_at: new Date().toISOString(),
      meta: {
        gpu_name: GPU_NAME,
        offers_returned: offers.length,
        offers_used: perGpu.length,
        cheapest: perGpu[0],
        dearest: perGpu[perGpu.length - 1],
        direction: 'higher = tighter GPU spot market',
        source_note: 'page is hard-capped at 64 offers, sorted cheapest-first; this is the market floor',
      },
    };
  },
};
