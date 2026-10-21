import { test } from 'node:test';
import assert from 'node:assert/strict';
import adapter, {
  computePermissiveShare,
  countModelsInWindow,
  nextLink,
} from '../bliss-sources/hf-permissive-share.mjs';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const CUTOFF = NOW.getTime() - 24 * 60 * 60 * 1000;

function row(id, createdAt) {
  return { id, createdAt };
}

/** One page that crosses the cutoff: `inWindow` fresh rows then one older. */
function crossingPage(prefix, inWindow) {
  const rows = [];
  for (let i = 0; i < inWindow; i++) {
    rows.push(row(`${prefix}-${i}`, new Date(CUTOFF + (inWindow - i) * 60_000).toISOString()));
  }
  rows.push(row(`${prefix}-old`, new Date(CUTOFF - 60_000).toISOString()));
  return rows;
}

/**
 * fetchJson that answers licence filter URLs and the unfiltered listing from
 * fixed crossing pages. Counts are chosen so the share is exact and the
 * denominator clears MIN_DENOMINATOR (50).
 */
function stubFetch({ apache = 20, mit = 10, total = 100 } = {}) {
  const urls = [];
  const fetchJson = async (url) => {
    urls.push(url);
    if (url.includes('filter=license:apache-2.0')) {
      return { data: crossingPage('apache', apache), headers: { link: null } };
    }
    if (url.includes('filter=license:mit')) {
      return { data: crossingPage('mit', mit), headers: { link: null } };
    }
    if (url.includes('/api/models?') && !url.includes('filter=')) {
      return { data: crossingPage('all', total), headers: { link: null } };
    }
    throw new Error(`unexpected url ${url}`);
  };
  return { fetchJson, urls };
}

test('adapter contract shape', () => {
  assert.equal(adapter.id, 'hf-permissive-share');
  assert.equal(adapter.pillar, 'access');
  assert.equal(typeof adapter.label, 'string');
  assert.equal(typeof adapter.collect, 'function');
});

test('nextLink parses Link rel=next', () => {
  assert.equal(
    nextLink('<https://huggingface.co/api/models?cursor=abc>; rel="next"'),
    'https://huggingface.co/api/models?cursor=abc',
  );
  assert.equal(nextLink(undefined), null);
});

test('countModelsInWindow counts in-window rows for a filter', async () => {
  const { count, pages } = await countModelsInWindow(
    async () => ({ data: crossingPage('x', 7), headers: { link: null } }),
    { cutoffMs: CUTOFF, filter: 'mit', maxPages: 6, label: 'license:mit' },
  );
  assert.equal(count, 7);
  assert.equal(pages, 1);
});

test('computePermissiveShare returns permissive / total', async () => {
  const { fetchJson, urls } = stubFetch({ apache: 20, mit: 10, total: 100 });
  const r = await computePermissiveShare(fetchJson, { cutoffMs: CUTOFF, observedAt: NOW });
  assert.equal(r.value, 0.3);
  assert.equal(r.unit, 'share/24h');
  assert.equal(r.meta.permissive_models, 30);
  assert.equal(r.meta.total_models, 100);
  assert.equal(r.meta.per_licence['apache-2.0'], 20);
  assert.equal(r.meta.per_licence.mit, 10);
  assert.equal(r.meta.clamped_to_one, false);
  // Licence filters first, then the unfiltered total — order is part of the cost story.
  assert.ok(urls[0].includes('filter=license:apache-2.0'));
  assert.ok(urls[1].includes('filter=license:mit'));
  assert.ok(urls[2].includes('/api/models?') && !urls[2].includes('filter='));
});

test('computePermissiveShare clamps dual-licence overlap above 1', async () => {
  const { fetchJson } = stubFetch({ apache: 80, mit: 40, total: 100 });
  const r = await computePermissiveShare(fetchJson, { cutoffMs: CUTOFF, observedAt: NOW });
  assert.equal(r.value, 1);
  assert.equal(r.meta.clamped_to_one, true);
  assert.equal(r.meta.permissive_models, 120);
});

test('refuses a denominator below MIN_DENOMINATOR', async () => {
  const { fetchJson } = stubFetch({ apache: 5, mit: 5, total: 20 });
  await assert.rejects(
    () => computePermissiveShare(fetchJson, { cutoffMs: CUTOFF, observedAt: NOW }),
    /denominator this small/,
  );
});

test('refuses non-array and unparseable createdAt', async () => {
  await assert.rejects(
    () => countModelsInWindow(
      async () => ({ data: null, headers: {} }),
      { cutoffMs: CUTOFF, maxPages: 6, label: 'all models' },
    ),
    /expected an array/,
  );

  await assert.rejects(
    () => countModelsInWindow(
      async () => ({ data: [{ id: 'x', createdAt: 'banana' }], headers: {} }),
      { cutoffMs: CUTOFF, maxPages: 6, label: 'all models' },
    ),
    /unparseable createdAt/,
  );
});

test('collect returns a finite share', async () => {
  // Fixtures must sit relative to wall-clock `new Date()` inside collect().
  const nowMs = Date.now();
  const cutoff = nowMs - 24 * 60 * 60 * 1000;
  function liveCrossing(prefix, inWindow) {
    const rows = [];
    for (let i = 0; i < inWindow; i++) {
      rows.push(row(`${prefix}-${i}`, new Date(cutoff + (inWindow - i) * 60_000).toISOString()));
    }
    rows.push(row(`${prefix}-old`, new Date(cutoff - 60_000).toISOString()));
    return rows;
  }
  const fetchJson = async (url) => {
    if (url.includes('filter=license:apache-2.0')) {
      return { data: liveCrossing('apache', 25), headers: { link: null } };
    }
    if (url.includes('filter=license:mit')) {
      return { data: liveCrossing('mit', 25), headers: { link: null } };
    }
    return { data: liveCrossing('all', 100), headers: { link: null } };
  };
  const r = await adapter.collect(fetchJson);
  assert.equal(r.value, 0.5);
  assert.equal(r.unit, 'share/24h');
  assert.ok(Number.isFinite(Date.parse(r.observed_at)));
});
