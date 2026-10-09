// The xAI X-search parser and its call budget. No key, no network: the API is
// a fixture and the budget ledger is a temp file.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  parseXSearch, readXaiBody, extractJsonArray, snowflakeMs, parseStatusUrl,
  budgetDecision, budgetConfig, recordCall, rollLedger, pickModel,
} from '../news-sources/_xai.mjs';
import xSearch, { postsToDrafts } from '../news-sources/x-search.mjs';

const FIX = new URL('./fixtures/news/', import.meta.url);
const json = (n) => JSON.parse(readFileSync(new URL(n, FIX), 'utf8'));
const NOW = Date.parse('2026-10-09T20:30:00Z');

describe('xai response parser', () => {
  it('derives post time from the status id', () => {
    assert.equal(new Date(snowflakeMs('2108651210142658617')).toISOString(), '2026-10-09T20:10:00.000Z');
    assert.equal(snowflakeMs('12'), null);
    assert.equal(snowflakeMs('not a number'), null);
  });

  it('normalises status URLs', () => {
    assert.deepEqual(parseStatusUrl('https://twitter.com/sama/status/123456789?s=20'), { handle: 'sama', id: '123456789', url: 'https://x.com/sama/status/123456789' });
    assert.equal(parseStatusUrl('https://x.com/sama'), null);
  });

  it('keeps only posts the search tool itself cited (Responses API shape)', () => {
    const r = parseXSearch(json('xai-responses.json'), { nowMs: NOW });
    assert.deepEqual(r.posts.map((p) => p.url), [
      'https://x.com/OpenAI/status/2108651210142658617',
      'https://x.com/sama/status/2108653726725058617',
    ]);
    assert.equal(r.posts[0].posted_at, '2026-10-09T20:10:00.000Z');
    // invented (uncited), handle mismatch, and too old
    assert.equal(r.rejected, 3);
    assert.equal(r.sourcesUsed, 14);
  });

  it('reads the legacy chat-completions shape too', () => {
    const r = parseXSearch(json('xai-chat.json'), { nowMs: NOW });
    assert.equal(r.posts.length, 1);
    assert.equal(r.posts[0].handle, 'AnthropicAI');
    assert.equal(r.sourcesUsed, 6);
  });

  it('respects the max', () => {
    assert.equal(parseXSearch(json('xai-responses.json'), { nowMs: NOW, max: 1 }).posts.length, 1);
  });

  it('throws on malformed bodies and API errors, and is empty (not broken) on prose with no JSON', () => {
    assert.throws(() => readXaiBody(null), /not a JSON object/);
    assert.throws(() => readXaiBody([1, 2]), /not a JSON object/);
    assert.throws(() => readXaiBody({ foo: 1 }), /shape changed/);
    assert.throws(() => readXaiBody({ error: { message: 'Incorrect API key' } }), /API error — Incorrect API key/);
    const prose = { output: [{ type: 'message', content: [{ type: 'output_text', text: 'I could not find anything.' }] }], citations: ['https://x.com/a/status/2108651210142658617'] };
    assert.deepEqual(parseXSearch(prose, { nowMs: NOW }).posts, []);
    assert.equal(extractJsonArray('[{"a":1}'), null);
    assert.deepEqual(extractJsonArray('x [1,2] y'), [1, 2]);
  });

  it('never lets an uncited post through even when the model insists', () => {
    const body = {
      output: [{ type: 'message', content: [{ type: 'output_text', text: '[{"url":"https://x.com/OpenAI/status/2108651210142658617","handle":"OpenAI","text":"Fabricated announcement text here"}]' }] }],
    };
    assert.deepEqual(parseXSearch(body, { nowMs: NOW }).posts, []);
  });

  it('maps posts to drafts attributed to the handle', () => {
    const [official, person] = postsToDrafts(parseXSearch(json('xai-responses.json'), { nowMs: NOW }).posts);
    assert.equal(official.meta.outlet_domain, 'openai.com');
    assert.equal(official.weight_override, 0.65);
    assert.equal(person.meta.outlet_domain, 'x:sama');
    assert.match(person.summary, /@sama/);
    assert.equal(official.meta.text_via, 'xai_x_search');
  });

  it('picks a fast grok-4 model from the listing', () => {
    assert.equal(pickModel({ data: [{ id: 'grok-3' }, { id: 'grok-4-0709' }, { id: 'grok-4-fast-non-reasoning' }] }), 'grok-4-fast-non-reasoning');
    assert.equal(pickModel({ data: [] }), null);
  });
});

describe('xai budget', () => {
  const cfg = { minutes: 20, dailyCap: 3 };

  it('reads its config from env with sane clamps', () => {
    assert.deepEqual(budgetConfig({}), { minutes: 20, dailyCap: 60, maxResults: 8 });
    assert.deepEqual(budgetConfig({ XAI_X_SEARCH_MINUTES: '1', XAI_X_SEARCH_DAILY_CAP: '5', XAI_X_SEARCH_MAX_RESULTS: '99' }), { minutes: 5, dailyCap: 5, maxResults: 25 });
  });

  it('enforces the cadence and the daily cap, and resets at UTC midnight', () => {
    let l = null;
    assert.equal(budgetDecision(l, NOW, cfg).ok, true);
    l = recordCall(l, NOW);
    assert.equal(budgetDecision(l, NOW + 5 * 60_000, cfg).reason, 'cadence');
    assert.equal(budgetDecision(l, NOW + 19 * 60_000, cfg).ok, true, '10% slack');
    l = recordCall(l, NOW + 20 * 60_000);
    l = recordCall(l, NOW + 40 * 60_000);
    assert.equal(l.calls, 3);
    const capped = budgetDecision(l, NOW + 60 * 60_000, cfg);
    assert.equal(capped.ok, false);
    assert.equal(capped.reason, 'cap');
    // next UTC day
    const tomorrow = Date.parse('2026-10-10T00:05:00Z');
    const d = budgetDecision(l, tomorrow, cfg);
    assert.equal(d.ok, true);
    assert.equal(d.ledger.calls, 0);
    assert.deepEqual(d.ledger.days.at(-1), { day: '2026-10-09', calls: 3, sources_used: 0 });
  });

  it('survives a garbage ledger', () => {
    assert.equal(rollLedger('nonsense', NOW).calls, 0);
    assert.equal(rollLedger({ calls: 'x', day: 7 }, NOW).calls, 0);
  });
});

describe('x-search adapter', () => {
  const tmp = () => pathToFileURL(join(mkdtempSync(join(tmpdir(), 'xai-')), 'xai-usage.json'));

  it('is held without a key, or when the lane switches it off', async () => {
    const a = await xSearch.collect(null, null, { env: {}, usageUrl: tmp() });
    assert.equal(a.held, 'no XAI_API_KEY');
    const b = await xSearch.collect(null, null, { env: { XAI_API_KEY: 'k', XAI_X_SEARCH_OFF: '1' }, usageUrl: tmp() });
    assert.match(b.held, /off in this lane/);
  });

  it('calls once, records the call before sending, then holds on cadence and cap', async () => {
    const usageUrl = tmp();
    const calls = [];
    const fetchJson = async (url, opts = {}) => {
      calls.push({ url, opts });
      if (url.endsWith('/models')) return { data: [{ id: 'grok-4-fast' }] };
      // The ledger must already count this call when the request goes out.
      const ledger = JSON.parse(await readFile(usageUrl, 'utf8'));
      assert.equal(ledger.calls, 1);
      assert.equal(ledger.last_status, 'pending');
      assert.equal(JSON.parse(opts.body).tools[0].type, 'x_search');
      assert.equal(opts.retries, 0, 'never retry a paid call');
      return json('xai-responses.json');
    };
    const env = { XAI_API_KEY: 'k', XAI_X_SEARCH_DAILY_CAP: '2' };
    const fetchJson2 = async (url, opts = {}) => { calls.push({ url, opts }); return { output: [], citations: [] }; };
    const out = await xSearch.collect(null, fetchJson, { env, usageUrl, now: () => NOW });
    assert.equal(out.length, 2);
    assert.equal(out[0].source, 'x-search');
    const ledger = JSON.parse(await readFile(usageUrl, 'utf8'));
    assert.equal(ledger.calls, 1);
    assert.equal(ledger.sources_used, 14);
    assert.equal(ledger.last_status, 'ok');
    assert.equal(ledger.model, 'grok-4-fast');

    const soon = await xSearch.collect(null, fetchJson, { env, usageUrl, now: () => NOW + 60_000 });
    assert.match(soon.held, /not due/);
    const second = await xSearch.collect(null, fetchJson2, { env, usageUrl, now: () => NOW + 3_600_000 });
    assert.equal(second.length, 0, 'second call answered; its posts are now too old for the window');
    const later = await xSearch.collect(null, fetchJson2, { env, usageUrl, now: () => NOW + 2 * 3_600_000 });
    assert.match(later.held, /daily cap reached \(2\/2/);
    assert.equal(calls.filter((c) => c.url.endsWith('/responses')).length, 2);
  });

  it('counts a failed call and goes dark without leaking the key', async () => {
    const usageUrl = tmp();
    writeFileSync(usageUrl, JSON.stringify({ day: '2026-10-09', calls: 0, model: 'grok-4-fast', model_day: '2026-10-09' }));
    const fetchJson = async () => { throw Object.assign(new Error('HTTP 500 from api — secret-key-123'), { status: 500 }); };
    await assert.rejects(
      xSearch.collect(null, fetchJson, { env: { XAI_API_KEY: 'secret-key-123' }, usageUrl, now: () => NOW }),
      (err) => /x-search: HTTP 500/.test(err.message) && !err.message.includes('secret-key-123'),
    );
    const ledger = JSON.parse(await readFile(usageUrl, 'utf8'));
    assert.equal(ledger.calls, 1);
    assert.equal(ledger.last_status, 'error 500');
  });

  it('goes dark on a malformed answer, still counting the call', async () => {
    const usageUrl = tmp();
    writeFileSync(usageUrl, JSON.stringify({ day: '2026-10-09', calls: 0, model: 'grok-4-fast', model_day: '2026-10-09' }));
    await assert.rejects(
      xSearch.collect(null, async () => ({ unexpected: true }), { env: { XAI_API_KEY: 'k' }, usageUrl, now: () => NOW }),
      /shape changed/,
    );
    const ledger = JSON.parse(await readFile(usageUrl, 'utf8'));
    assert.equal(ledger.calls, 1);
    assert.equal(ledger.last_status, 'malformed');
  });
});
