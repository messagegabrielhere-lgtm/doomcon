import { test } from 'node:test';
import assert from 'node:assert/strict';
import adapter, { countDatasetsInWindow, nextLink } from '../sources/hf-datasets.mjs';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const CUTOFF = NOW.getTime() - 24 * 60 * 60 * 1000;

function row(id, createdAt) {
  return { id, createdAt, _id: id };
}

/** Build a descending-createdAt page that straddles the cutoff. */
function pageAroundCutoff({ inWindow = 3, older = 2, pageSize = 1000 } = {}) {
  const rows = [];
  for (let i = 0; i < inWindow; i++) {
    rows.push(row(`new-${i}`, new Date(CUTOFF + (inWindow - i) * 60_000).toISOString()));
  }
  for (let i = 0; i < older; i++) {
    rows.push(row(`old-${i}`, new Date(CUTOFF - (i + 1) * 60_000).toISOString()));
  }
  // Pad so callers can assert page-size behaviour without inventing timestamps.
  while (rows.length < Math.min(pageSize, inWindow + older)) {
    /* no-op — keep the real length */
  }
  return rows;
}

test('adapter contract shape', () => {
  assert.equal(adapter.id, 'hf-datasets');
  assert.equal(adapter.pillar, 'capability');
  assert.equal(typeof adapter.label, 'string');
  assert.equal(typeof adapter.collect, 'function');
});

test('nextLink parses Link rel=next', () => {
  assert.equal(
    nextLink('<https://huggingface.co/api/datasets?cursor=abc>; rel="next"'),
    'https://huggingface.co/api/datasets?cursor=abc',
  );
  assert.equal(nextLink(null), null);
  assert.equal(nextLink(''), null);
});

test('countDatasetsInWindow counts only rows inside the window', async () => {
  const rows = pageAroundCutoff({ inWindow: 4, older: 3 });
  const fetchJson = async () => ({ data: rows, headers: { link: null } });
  const r = await countDatasetsInWindow(fetchJson, { cutoffMs: CUTOFF, observedAt: NOW });
  assert.equal(r.value, 4);
  assert.equal(r.unit, 'datasets/24h');
  assert.equal(r.meta.pages_fetched, 1);
  assert.equal(r.observed_at, NOW.toISOString());
});

test('countDatasetsInWindow pages until the cutoff is crossed', async () => {
  const page1 = [];
  for (let i = 0; i < 5; i++) {
    page1.push(row(`p1-${i}`, new Date(CUTOFF + (10 - i) * 3_600_000).toISOString()));
  }
  const page2 = [
    row('p2-0', new Date(CUTOFF + 30_000).toISOString()),
    row('p2-1', new Date(CUTOFF - 60_000).toISOString()),
  ];
  const urls = [];
  const fetchJson = async (url) => {
    urls.push(url);
    if (urls.length === 1) {
      return {
        data: page1,
        headers: { link: '<https://huggingface.co/api/datasets?cursor=page2>; rel="next"' },
      };
    }
    return { data: page2, headers: { link: null } };
  };

  const r = await countDatasetsInWindow(fetchJson, { cutoffMs: CUTOFF, observedAt: NOW });
  assert.equal(r.value, 6); // 5 from page1 + 1 still in window on page2
  assert.equal(r.meta.pages_fetched, 2);
  assert.equal(urls[1], 'https://huggingface.co/api/datasets?cursor=page2');
});

test('countDatasetsInWindow dedupes across pages', async () => {
  const shared = row('dup', new Date(CUTOFF + 60_000).toISOString());
  const page1 = [shared, row('a', new Date(CUTOFF + 120_000).toISOString())];
  // Force a second page by keeping every createdAt above the cutoff, then cross
  // on page 2. Oldest on page1 is still in-window so the pager continues.
  page1.push(row('b', new Date(CUTOFF + 30_000).toISOString()));
  const page2 = [shared, row('old', new Date(CUTOFF - 60_000).toISOString())];

  let n = 0;
  const fetchJson = async () => {
    n += 1;
    if (n === 1) {
      return {
        data: page1,
        headers: { link: '<https://huggingface.co/api/datasets?cursor=x>; rel="next"' },
      };
    }
    return { data: page2, headers: { link: null } };
  };

  const r = await countDatasetsInWindow(fetchJson, { cutoffMs: CUTOFF, observedAt: NOW });
  assert.equal(r.value, 3); // dup, a, b — shared counted once
});

test('refuses non-array, empty page, bad createdAt, and missing next', async () => {
  await assert.rejects(
    () => countDatasetsInWindow(async () => ({ data: { nope: true }, headers: {} }), {
      cutoffMs: CUTOFF, observedAt: NOW,
    }),
    /expected an array/,
  );

  await assert.rejects(
    () => countDatasetsInWindow(async () => ({ data: [], headers: {} }), {
      cutoffMs: CUTOFF, observedAt: NOW,
    }),
    /came back empty/,
  );

  await assert.rejects(
    () => countDatasetsInWindow(async () => ({
      data: [{ id: 'x', createdAt: 'not-a-date' }],
      headers: {},
    }), { cutoffMs: CUTOFF, observedAt: NOW }),
    /unparseable createdAt/,
  );

  // Entire page still inside the window and no Link: next → fatal.
  const allNew = [row('a', new Date(CUTOFF + 60_000).toISOString())];
  await assert.rejects(
    () => countDatasetsInWindow(async () => ({ data: allNew, headers: { link: null } }), {
      cutoffMs: CUTOFF, observedAt: NOW,
    }),
    /ran out of pages/,
  );
});

test('collect wires observedAt and returns the count', async () => {
  // Fixtures must sit relative to wall-clock `new Date()` inside collect().
  const nowMs = Date.now();
  const rows = [
    row('live-a', new Date(nowMs - 60_000).toISOString()),
    row('live-b', new Date(nowMs - 120_000).toISOString()),
    row('live-old', new Date(nowMs - 25 * 60 * 60 * 1000).toISOString()),
  ];
  const r = await adapter.collect(async () => ({ data: rows, headers: { link: null } }));
  assert.equal(r.value, 2);
  assert.equal(r.unit, 'datasets/24h');
  assert.ok(Number.isFinite(Date.parse(r.observed_at)));
});
