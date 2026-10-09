import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARXIV_RATE_LIMIT_WAITS_MS,
  arxivAdapterBudgetMs,
  fetchArxivWindow,
  isArxivRateLimit,
} from './arxiv-fetch.mjs';
import { needsHeal } from './heal-degraded.mjs';

const limited = () => Object.assign(new Error('HTTP 429 Unknown Error — Rate exceeded.'), { status: 429 });

describe('arXiv rate limit', () => {
  it('recognises a 429 and ignores other failures', () => {
    assert.equal(isArxivRateLimit(limited()), true);
    assert.equal(isArxivRateLimit(new Error('timeout after 75000ms')), false);
    assert.equal(isArxivRateLimit(new Error('HTTP 500')), false);
  });

  it('returns the first successful body without waiting', async () => {
    let calls = 0;
    const body = await fetchArxivWindow(async () => {
      calls += 1;
      return '<feed/>';
    }, 'https://export.arxiv.org/api/query', { waits: [30_000, 60_000], sleepFn: async () => { throw new Error('should not sleep'); } });
    assert.equal(body, '<feed/>');
    assert.equal(calls, 1);
  });

  it('waits out a 429 and then returns the next body', async () => {
    const waits = [];
    let calls = 0;
    const body = await fetchArxivWindow(async () => {
      calls += 1;
      if (calls === 1) throw limited();
      return '<ok/>';
    }, 'https://export.arxiv.org/api/query', {
      waits: [30_000, 60_000],
      sleepFn: async (ms) => { waits.push(ms); },
    });
    assert.equal(body, '<ok/>');
    assert.deepEqual(waits, [30_000]);
  });

  it('forwards withMeta to fetchText', async () => {
    const out = await fetchArxivWindow(async (_url, opts) => {
      assert.equal(opts.withMeta, true);
      assert.equal(opts.retries, 0);
      return { data: '<feed/>', headers: { 'content-type': 'application/atom+xml' } };
    }, 'https://export.arxiv.org/api/query', {
      waits: [1],
      withMeta: true,
      sleepFn: async () => { throw new Error('should not sleep'); },
    });
    assert.equal(out.data, '<feed/>');
  });

  it('does not retry a non-429 failure', async () => {
    let calls = 0;
    await assert.rejects(
      () => fetchArxivWindow(async () => {
        calls += 1;
        throw new Error('HTTP 500');
      }, 'https://export.arxiv.org/api/query', { waits: [1, 1], sleepFn: async () => { throw new Error('should not sleep'); } }),
      /HTTP 500/,
    );
    assert.equal(calls, 1);
  });

  it('stops after the last 429 instead of waiting again', async () => {
    const waits = [];
    let calls = 0;
    await assert.rejects(
      () => fetchArxivWindow(async () => {
        calls += 1;
        throw limited();
      }, 'https://export.arxiv.org/api/query', {
        waits: [5, 7],
        sleepFn: async (ms) => { waits.push(ms); },
      }),
      /429/,
    );
    assert.equal(calls, 3);
    assert.deepEqual(waits, [5, 7]);
  });

  it('keeps the index adapter budget locked to the published wait ladder', () => {
    assert.deepEqual([...ARXIV_RATE_LIMIT_WAITS_MS], [60_000, 120_000, 180_000]);
    assert.equal(arxivAdapterBudgetMs(), 660_000);
  });
});

describe('heal-degraded', () => {
  it('asks for a heal when a calibrated source is rate-limited', () => {
    const r = needsHeal({
      degraded: true,
      sources: [
        { id: 'arxiv', ok: false, uncalibrated: false, error: 'HTTP 429 Too Many Requests — Rate exceeded.' },
        { id: 'hn', ok: true, uncalibrated: false },
      ],
    });
    assert.equal(r.heal, true);
    assert.deepEqual(r.sources, ['arxiv']);
  });

  it('does not heal uncalibrated or non-rate-limit darkness', () => {
    assert.equal(needsHeal({
      degraded: true,
      sources: [
        { id: 'github-releases', ok: false, uncalibrated: true, error: 'uncalibrated: no entry' },
        { id: 'hn', ok: false, uncalibrated: false, error: 'HTTP 500' },
      ],
    }).heal, false);
  });

  it('heals from a raw snapshot before the engine has run', () => {
    const r = needsHeal(null, {
      readings: [
        { source: 'arxiv', ok: false, error: 'HTTP 429 Rate exceeded.' },
        { source: 'hn', ok: true },
      ],
    });
    assert.equal(r.heal, true);
    assert.deepEqual(r.sources, ['arxiv']);
  });
});
