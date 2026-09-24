// Capability pillar — raw volume of artefacts shipped.
//
// The noisiest of the four capability sources and the most immediate: roughly
// 3,800 models a day land on the Hub, most of them fine-tunes and quantisations.
// That is the point. arXiv and OpenRouter measure the frontier; this measures how
// many hands are on the tools, which moves days before anything reaches a paper.

const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

// 1000 is the server's real ceiling — larger values are clamped, not honoured
// (verified 2026-09-23: limit=1000 returned exactly 1000 items spanning ~6.3h).
const PAGE_SIZE = 1000;

// 12 pages = 12,000 models ≈ 3x a normal day. Exceeding it is not a paging bug,
// it is an extraordinary day, and the adapter throws rather than return a floor
// dressed up as a count. See the throw at the bottom for the trade-off.
const MAX_PAGES = 12;

const FIRST_PAGE = `https://huggingface.co/api/models?sort=createdAt&direction=-1&limit=${PAGE_SIZE}`;

// The Hub hands out its next-page cursor in the Link header and nowhere else. The
// cursor is an opaque base64 blob; there is no offset/page parameter that works
// (`?p=` is silently ignored on this route), so header access is mandatory — which
// is why fetchJson has a withMeta mode.
function nextLink(linkHeader) {
  if (!linkHeader) return null;
  return linkHeader.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1] ?? null;
}

export default {
  id: 'huggingface',
  pillar: 'capability',
  label: 'HuggingFace models created',

  async collect(fetchJson) {
    const observedAt = new Date();
    const cutoffMs = observedAt.getTime() - WINDOW_MS;

    // Counted into a Set, not a counter. Pagination sorts by createdAt but pages by
    // Mongo _id; the two orders agree in practice but nothing guarantees it, and a
    // retried page must not be able to inflate the headline number.
    const seen = new Set();
    let url = FIRST_PAGE;
    let pages = 0;
    let crossedCutoff = false;
    let oldestSeen = null;

    while (url && pages < MAX_PAGES) {
      const { data, headers } = await fetchJson(url, { withMeta: true });
      pages++;

      if (!Array.isArray(data)) {
        throw new Error(`huggingface: expected an array from ${url}, got ${typeof data} — API shape changed`);
      }
      if (data.length === 0) {
        throw new Error(`huggingface: page ${pages} came back empty from ${url} — listing ended before the ${WINDOW_HOURS}h boundary`);
      }

      for (const model of data) {
        const created = Date.parse(model?.createdAt);
        if (!Number.isFinite(created)) {
          throw new Error(
            `huggingface: model "${model?.id ?? '<no id>'}" has unparseable createdAt ` +
              `(${JSON.stringify(model?.createdAt)}) — API shape changed, refusing to guess`,
          );
        }
        if (oldestSeen === null || created < oldestSeen) oldestSeen = created;
        if (created >= cutoffMs) seen.add(model.id ?? model._id ?? JSON.stringify(model));
      }

      // The last item of a descending page is the page's oldest. Once it predates
      // the cutoff, every later page does too.
      if (Date.parse(data[data.length - 1].createdAt) < cutoffMs) {
        crossedCutoff = true;
        break;
      }

      url = nextLink(headers.link);
      if (!url) {
        throw new Error(
          `huggingface: ran out of pages after ${pages} (${seen.size} models) without reaching ` +
            `the ${WINDOW_HOURS}h boundary — the Hub has millions of models, so a missing ` +
            `Link: rel="next" here means pagination changed`,
        );
      }
    }

    if (!crossedCutoff) {
      // Deliberately fatal. Returning seen.size here would be a lower bound, not a
      // count, and it would under-report on precisely the loudest day of the year —
      // the reading the index most needs to be right. A dark source with a specific
      // error is honest; a silently clipped one is the pizzint failure mode.
      throw new Error(
        `huggingface: hit the ${MAX_PAGES}-page cap (${seen.size} models, ${PAGE_SIZE * MAX_PAGES} scanned) ` +
          `without reaching the ${WINDOW_HOURS}h boundary — raise MAX_PAGES; refusing to report a floor as a count`,
      );
    }

    return {
      value: seen.size,
      unit: `models/${WINDOW_HOURS}h`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_hours: WINDOW_HOURS,
        pages_fetched: pages,
        page_size: PAGE_SIZE,
        oldest_scanned: oldestSeen === null ? null : new Date(oldestSeen).toISOString(),
      },
    };
  },
};
