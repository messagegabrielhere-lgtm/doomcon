// ACCESS pillar — the share of Hub uploads a stranger may keep.
//
// Companion to hf-permissive-models (the COUNT of Apache-2.0 / MIT uploads).
// That count rises when the Hub is busy; this share rises only when a larger
// fraction of the firehose is under a licence that lets a stranger download,
// fine-tune and deploy commercially without asking. docs/BLISS.md §7 names
// converting more pillars to ratios as the largest open improvement — this is
// that conversion for the access pillar, without retiring the absolute count.
//
// Numerator  = same definition as hf-permissive-models (licence filter pages).
// Denominator = same definition as collector/sources/huggingface.mjs (all models).
// Both are trailing-24h createdAt windows. Tags on the unfiltered listing are
// incomplete (~40% carry license:*), so the share MUST use the filter= pages
// for the numerator rather than inferring licence from tags on the total crawl.
//
// Cost, stated rather than hidden: this adapter re-pages both listings. BLISS
// does not need to run hourly (docs/BLISS.md §8); the Hub is already rate-
// limited to 1 req/s in collector/fetch.mjs.

const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

const PAGE_SIZE = 1000;

// Total listing: 12 pages = 12,000 models ≈ 3x a normal day (same cap as
// collector/sources/huggingface.mjs). Licence listings are quieter; 6 pages
// each matches hf-permissive-models.
const MAX_PAGES_TOTAL = 12;
const MAX_PAGES_LICENCE = 6;

// A share over a handful of uploads is noise. At Hub daily volume (~3,800
// models) this never binds; it exists so a truncated crawl cannot publish
// "1.00 permissive" over three rows.
const MIN_DENOMINATOR = 50;

// Same two licences hf-permissive-models counts. OSI-approved, no commercial
// or field-of-endeavour restriction. Deliberately EXCLUDED: *-nc, Llama
// community, OpenRAIL — published weights with conditions are a different
// measurement.
const LICENCES = ['apache-2.0', 'mit'];

/** The Hub hands out its next-page cursor in the Link header and nowhere else. */
export function nextLink(linkHeader) {
  if (!linkHeader) return null;
  return linkHeader.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1] ?? null;
}

/**
 * Page a Hub models listing sorted by createdAt desc and count ids inside the
 * window. `filter` is appended as `filter=license:<id>` when set.
 */
export async function countModelsInWindow(fetchJson, {
  cutoffMs,
  filter = null,
  maxPages,
  label,
}) {
  const seen = new Set();
  let url = filter
    ? `https://huggingface.co/api/models?filter=license:${encodeURIComponent(filter)}` +
      `&sort=createdAt&direction=-1&limit=${PAGE_SIZE}`
    : `https://huggingface.co/api/models?sort=createdAt&direction=-1&limit=${PAGE_SIZE}`;
  let pages = 0;
  let crossedCutoff = false;

  while (url && pages < maxPages) {
    const { data, headers } = await fetchJson(url, { withMeta: true });
    pages += 1;

    if (!Array.isArray(data)) {
      throw new Error(
        `hf-permissive-share: expected an array from ${url}, got ${typeof data} — API shape changed`,
      );
    }
    if (data.length === 0) {
      throw new Error(
        `hf-permissive-share: page ${pages} for ${label} came back empty from ${url} — ` +
          `listing ended before the ${WINDOW_HOURS}h boundary`,
      );
    }

    for (const model of data) {
      const created = Date.parse(model?.createdAt);
      if (!Number.isFinite(created)) {
        throw new Error(
          `hf-permissive-share: model "${model?.id ?? '<no id>'}" has unparseable createdAt ` +
            `(${JSON.stringify(model?.createdAt)}) — API shape changed, refusing to guess`,
        );
      }
      if (created >= cutoffMs) seen.add(model.id ?? model._id ?? JSON.stringify(model));
    }

    if (Date.parse(data[data.length - 1].createdAt) < cutoffMs) {
      crossedCutoff = true;
      break;
    }

    url = nextLink(headers.link);
    if (!url) {
      throw new Error(
        `hf-permissive-share: ran out of pages for ${label} after ${pages} ` +
          `(${seen.size} models) without reaching the ${WINDOW_HOURS}h boundary — a missing ` +
          `Link: rel="next" here means pagination changed`,
      );
    }
  }

  if (!crossedCutoff) {
    throw new Error(
      `hf-permissive-share: hit the ${maxPages}-page cap for ${label} (${seen.size} models, ` +
        `${PAGE_SIZE * maxPages} scanned) without reaching the ${WINDOW_HOURS}h boundary — ` +
        `raise the page cap; refusing to report a floor as a count`,
    );
  }

  return { count: seen.size, pages };
}

export async function computePermissiveShare(fetchJson, { cutoffMs, observedAt }) {
  const perLicence = {};
  let permissive = 0;
  let pagesLicence = 0;

  for (const licence of LICENCES) {
    const { count, pages } = await countModelsInWindow(fetchJson, {
      cutoffMs,
      filter: licence,
      maxPages: MAX_PAGES_LICENCE,
      label: `license:${licence}`,
    });
    perLicence[licence] = count;
    permissive += count;
    pagesLicence += pages;
  }

  const { count: total, pages: pagesTotal } = await countModelsInWindow(fetchJson, {
    cutoffMs,
    filter: null,
    maxPages: MAX_PAGES_TOTAL,
    label: 'all models',
  });

  if (total < MIN_DENOMINATOR) {
    throw new Error(
      `hf-permissive-share: only ${total} Hub models created in the trailing ${WINDOW_HOURS}h ` +
        `(needed ${MIN_DENOMINATOR}) — refusing to publish a share over a denominator this small`,
    );
  }

  // Numerator can exceed denominator if a model carries both apache-2.0 and mit
  // tags and both filter listings include it — two Sets summed, one Set for the
  // total. Cap at 1 rather than invent a union across filter pages (that would
  // need a third crawl). Observed dual-licence overlap is rare; clamping keeps
  // the contract "higher always means more" and the unit a real share.
  const rawShare = permissive / total;
  const share = Math.min(1, rawShare);

  return {
    value: Number(share.toFixed(6)),
    unit: `share/${WINDOW_HOURS}h`,
    observed_at: observedAt.toISOString(),
    meta: {
      window_hours: WINDOW_HOURS,
      licences: LICENCES,
      permissive_models: permissive,
      total_models: total,
      per_licence: perLicence,
      pages_licence: pagesLicence,
      pages_total: pagesTotal,
      page_size: PAGE_SIZE,
      clamped_to_one: rawShare > 1,
    },
  };
}

export default {
  id: 'hf-permissive-share',
  pillar: 'access',
  label: 'Permissive share of new Hub models',

  async collect(fetchJson) {
    const observedAt = new Date();
    const cutoffMs = observedAt.getTime() - WINDOW_MS;
    return computePermissiveShare(fetchJson, { cutoffMs, observedAt });
  },
};
