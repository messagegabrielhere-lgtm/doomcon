import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cadenceFor, isDue } from './news.mjs';

describe('newsroom cadence', () => {
  it('asks the wires every minute and holds arXiv for an hour', () => {
    assert.equal(cadenceFor({ id: 'hn-ai', kind: 'forum' }), 60_000);
    assert.equal(cadenceFor({ id: 'techmeme', kind: 'press' }), 60_000);
    assert.equal(cadenceFor({ id: 'anthropic-status', kind: 'status' }), 60_000);
    assert.equal(cadenceFor({ id: 'openai', kind: 'lab' }), 300_000);
    assert.equal(cadenceFor({ id: 'arxiv-newest', kind: 'paper' }), 3_600_000);
  });

  it('asks Reddit slower than the other forums', () => {
    assert.equal(cadenceFor({ id: 'reddit-openai', kind: 'forum' }), 600_000);
  });

  it('lets an adapter set its own interval', () => {
    assert.equal(cadenceFor({ id: 'hn-ai', kind: 'forum', minIntervalMs: 900_000 }), 900_000);
  });
});

describe('reddit force carve-out', () => {
  const now = Date.parse('2026-10-09T20:00:00.000Z');
  const recent = now - 60_000; // one minute ago

  it('forces non-Reddit feeds even when recently fetched', () => {
    assert.equal(isDue({ id: 'hn-ai', kind: 'forum' }, recent, now, true), true);
    assert.equal(isDue({ id: 'techmeme', kind: 'press' }, recent, now, true), true);
  });

  it('does not force Reddit feeds that were fetched inside their cadence', () => {
    assert.equal(isDue({ id: 'reddit-artificial', kind: 'forum' }, recent, now, true), false);
  });

  it('still asks Reddit when its own cadence has elapsed', () => {
    const stale = now - 700_000; // > 600s cadence
    assert.equal(isDue({ id: 'reddit-artificial', kind: 'forum' }, stale, now, true), true);
  });
});
