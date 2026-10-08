import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cadenceFor } from './news.mjs';

describe('newsroom cadence', () => {
  it('asks the wires every minute and holds arXiv for an hour', () => {
    assert.equal(cadenceFor({ id: 'hn-ai', kind: 'forum' }), 60_000);
    assert.equal(cadenceFor({ id: 'techmeme', kind: 'press' }), 60_000);
    assert.equal(cadenceFor({ id: 'anthropic-status', kind: 'status' }), 60_000);
    assert.equal(cadenceFor({ id: 'openai', kind: 'lab' }), 300_000);
    assert.equal(cadenceFor({ id: 'arxiv-newest', kind: 'paper' }), 3_600_000);
  });

  it('asks Reddit slower than the other forums', () => {
    assert.equal(cadenceFor({ id: 'reddit-openai', kind: 'forum' }), 180_000);
  });

  it('lets an adapter set its own interval', () => {
    assert.equal(cadenceFor({ id: 'hn-ai', kind: 'forum', minIntervalMs: 900_000 }), 900_000);
  });
});
