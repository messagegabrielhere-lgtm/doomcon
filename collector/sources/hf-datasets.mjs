// Capability pillar — datasets shipped to the Hub.
//
// Sibling of collector/sources/huggingface.mjs (models created / 24h). Models
// measure how many hands are on the tools; datasets measure the other half of
// the open-artefact firehose — training data, eval sets, and fine-tune corpora
// landing on the same Hub. The two move together on busy days and diverge when
// the field is publishing weights without fresh data (or the reverse).
//
// Measured 2026-10-12: ~1,826 datasets created in a trailing 24h window, reached
// inside two 1000-item pages. Same pagination mechanics as the models adapter
// (Link: rel="next", sort=createdAt, limit clamped at 1000).

const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

// 1000 is the server's real ceiling — larger values are clamped, not honoured
// (established in collector/sources/huggingface.mjs and re-verified here).
const PAGE_SIZE = 1000;

// 8 pages = 8,000 datasets ≈ 4x the measured daily volume. Exceeding it is not a
// paging bug, it is an extraordinary day, and the adapter throws rather than
// return a floor dressed up as a count.
const MAX_PAGES = 8;

const FIRST_PAGE =
  `https://huggingface.co/api/datasets?sort=createdAt&direction=-1&limit=${PAGE_SIZE}`;

/** The Hub hands out its next-page cursor in the Link header and nowhere else. */
export function nextLink(linkHeader) {
  if (!linkHeader) return null;
  return linkHeader.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1] ?? null;
}

/**
 * Count Hub datasets whose createdAt falls inside [cutoffMs, observedAt].
 * Exported so the unit tests can drive the pager without a live network.
 */
export async function countDatasetsInWindow(fetchJson, { cutoffMs, observedAt }) {
  const seen = new Set();
  let url = FIRST_PAGE;
  let pages = 0;
  let crossedCutoff = false;
  let oldestSeen = null;

  while (url && pages < MAX_PAGES) {
    const { data, headers } = await fetchJson(url, { withMeta: true });
    pages += 1;

    if (!Array.isArray(data)) {
      throw new Error(
        `hf-datasets: expected an array from ${url}, got ${typeof data} — API shape changed`,
      );
    }
    if (data.length === 0) {
      throw new Error(
        `hf-datasets: page ${pages} came back empty from ${url} — listing ended before the ` +
          `${WINDOW_HOURS}h boundary`,
      );
    }

    for (const row of data) {
      const created = Date.parse(row?.createdAt);
      if (!Number.isFinite(created)) {
        throw new Error(
          `hf-datasets: dataset "${row?.id ?? '<no id>'}" has unparseable createdAt ` +
            `(${JSON.stringify(row?.createdAt)}) — API shape changed, refusing to guess`,
        );
      }
      if (oldestSeen === null || created < oldestSeen) oldestSeen = created;
      if (created >= cutoffMs) seen.add(row.id ?? row._id ?? JSON.stringify(row));
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
        `hf-datasets: ran out of pages after ${pages} (${seen.size} datasets) without reaching ` +
          `the ${WINDOW_HOURS}h boundary — the Hub has millions of datasets, so a missing ` +
          `Link: rel="next" here means pagination changed`,
      );
    }
  }

  if (!crossedCutoff) {
    // Deliberately fatal — same trade-off as collector/sources/huggingface.mjs.
    throw new Error(
      `hf-datasets: hit the ${MAX_PAGES}-page cap (${seen.size} datasets, ` +
        `${PAGE_SIZE * MAX_PAGES} scanned) without reaching the ${WINDOW_HOURS}h boundary — ` +
        `raise MAX_PAGES; refusing to report a floor as a count`,
    );
  }

  return {
    value: seen.size,
    unit: `datasets/${WINDOW_HOURS}h`,
    observed_at: observedAt.toISOString(),
    meta: {
      window_hours: WINDOW_HOURS,
      pages_fetched: pages,
      page_size: PAGE_SIZE,
      oldest_scanned: oldestSeen === null ? null : new Date(oldestSeen).toISOString(),
    },
  };
}

export default {
  id: 'hf-datasets',
  pillar: 'capability',
  label: 'HuggingFace datasets created',

  async collect(fetchJson) {
    const observedAt = new Date();
    const cutoffMs = observedAt.getTime() - WINDOW_MS;
    return countDatasetsInWindow(fetchJson, { cutoffMs, observedAt });
  },
};
