// ACCESS pillar — weights somebody else can actually run.
//
// DOOMCON's capability pillar counts every model created on the Hub, which is a
// measure of how many hands are on the tools. This counts only the subset published
// under a licence that lets a stranger download, fine-tune and deploy the weights
// commercially without asking anybody. That difference is the entire upside claim:
// a model behind an API is a product, a model under Apache-2.0 is infrastructure.
//
// Measured 2026-09-24 over a trailing 24 hours: 841 models under apache-2.0 and
// 484 under mit, each reached inside a single 1000-item page.

const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

// 1000 is the server's real ceiling — larger values are clamped, not honoured
// (established in collector/sources/huggingface.mjs and re-verified here).
const PAGE_SIZE = 1000;

// 6 pages = 6,000 models per licence, roughly 7x the measured daily volume.
// Exceeding it is not a paging bug, it is an extraordinary day, and the adapter
// throws rather than return a floor dressed up as a count.
const MAX_PAGES = 6;

// The two licences that actually carry open weights at volume. Both are
// OSI-approved and neither restricts commercial use or field of endeavour, which
// is the bar this source is drawing. Deliberately EXCLUDED: every *-nc variant,
// the Llama community licences and OpenRAIL — those are published weights with
// conditions, and folding them in here would let a restricted release count as
// unrestricted access. They are a different measurement, not a bigger one.
const LICENCES = ['apache-2.0', 'mit'];

/** The Hub hands out its next-page cursor in the Link header and nowhere else. */
function nextLink(linkHeader) {
  if (!linkHeader) return null;
  return linkHeader.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1] ?? null;
}

export default {
  id: 'hf-permissive-models',
  pillar: 'access',
  label: 'Open-weight models under a permissive licence',

  async collect(fetchJson) {
    const observedAt = new Date();
    const cutoffMs = observedAt.getTime() - WINDOW_MS;

    const perLicence = {};
    let total = 0;
    let pagesTotal = 0;

    for (const licence of LICENCES) {
      // Counted into a Set, not a counter. Pagination sorts by createdAt but pages
      // by Mongo _id; the two orders agree in practice but nothing guarantees it,
      // and a retried page must not be able to inflate the headline number.
      const seen = new Set();
      let url =
        `https://huggingface.co/api/models?filter=license:${encodeURIComponent(licence)}` +
        `&sort=createdAt&direction=-1&limit=${PAGE_SIZE}`;
      let pages = 0;
      let crossedCutoff = false;

      while (url && pages < MAX_PAGES) {
        const { data, headers } = await fetchJson(url, { withMeta: true });
        pages += 1;
        pagesTotal += 1;

        if (!Array.isArray(data)) {
          throw new Error(
            `hf-permissive-models: expected an array from ${url}, got ${typeof data} — API shape changed`,
          );
        }
        if (data.length === 0) {
          throw new Error(
            `hf-permissive-models: page ${pages} came back empty from ${url} — the listing ended ` +
              `before the ${WINDOW_HOURS}h boundary, so the count would be a floor rather than a count`,
          );
        }

        for (const model of data) {
          const created = Date.parse(model?.createdAt);
          if (!Number.isFinite(created)) {
            throw new Error(
              `hf-permissive-models: model "${model?.id ?? '<no id>'}" has unparseable createdAt ` +
                `(${JSON.stringify(model?.createdAt)}) — API shape changed, refusing to guess`,
            );
          }
          if (created >= cutoffMs) seen.add(model.id ?? model._id ?? JSON.stringify(model));
        }

        // The last item of a descending page is that page's oldest. Once it
        // predates the cutoff, every later page does too.
        if (Date.parse(data[data.length - 1].createdAt) < cutoffMs) {
          crossedCutoff = true;
          break;
        }

        url = nextLink(headers.link);
        if (!url) {
          throw new Error(
            `hf-permissive-models: ran out of pages for ${licence} after ${pages} ` +
              `(${seen.size} models) without reaching the ${WINDOW_HOURS}h boundary — a missing ` +
              `Link: rel="next" here means pagination changed`,
          );
        }
      }

      if (!crossedCutoff) {
        // Deliberately fatal, for the same reason collector/sources/huggingface.mjs
        // is: returning seen.size here would be a lower bound, not a count, and it
        // would under-report on precisely the biggest day — the reading the index
        // most needs to be right.
        throw new Error(
          `hf-permissive-models: hit the ${MAX_PAGES}-page cap for ${licence} (${seen.size} models, ` +
            `${PAGE_SIZE * MAX_PAGES} scanned) without reaching the ${WINDOW_HOURS}h boundary — ` +
            `raise MAX_PAGES; refusing to report a floor as a count`,
        );
      }

      perLicence[licence] = seen.size;
      total += seen.size;
    }

    return {
      value: total,
      unit: `models/${WINDOW_HOURS}h`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_hours: WINDOW_HOURS,
        licences: LICENCES,
        per_licence: perLicence,
        pages_fetched: pagesTotal,
        page_size: PAGE_SIZE,
      },
    };
  },
};
