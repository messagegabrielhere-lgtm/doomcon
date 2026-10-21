import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeDaily, composeLevelAlert, pickAlert, previousLevel, buildRequest, itemPath, run,
  BREAKING_MIN_OUTLETS,
} from './newsletter.mjs';
import { slugFor } from '../site/templates/itemPage.mjs';
import { findFutureViolation } from './posts.mjs';

const T = '2026-10-21T14:00:00.000Z';
const state = (o = {}) => ({
  generated_at: T, score: 61.2, level: 3, level_name: 'ELEVATED', level_since: '2026-10-21T13:00:00.000Z',
  pillars: [{ id: 'capability', name: 'Capability', score: 70.1 }, { id: 'compute', name: 'Compute', score: 40 }],
  ...o,
});
const history = [
  { t: '2026-10-20T13:30:00.000Z', score: 50, level: 4 },
  { t: '2026-10-21T12:00:00.000Z', score: 54, level: 4 },
  { t: '2026-10-21T13:00:00.000Z', score: 60, level: 3 },
];
const cluster = (o = {}) => ({
  id: 'c1', live: true, title: 'Lab ships a [thing]', url: 'https://example.com/a', corroboration: BREAKING_MIN_OUTLETS,
  outlets: ['a.com', 'b.com', 'c.com', 'd.com'], first_seen_at: '2026-10-21T13:30:00.000Z', breaking_at: '2026-10-21T13:40:00.000Z', ...o,
});

describe('newsletter', () => {
  it('item links match the site slug rule', () => {
    for (const title of ['A Design Flaw: Muse’s “share” links!', '', 'x'.repeat(90)]) {
      const it0 = { id: 'abc123', title };
      assert.equal(itemPath(it0), `/item/${slugFor(it0)}.html`);
    }
  });

  it('daily brief carries the reading, a 24h delta, stories, unsubscribe, and no future tense', () => {
    const e = composeDaily({ state: state(), history, digest: { brief: { items: [{ id: 'i1', title: 'A *bold* claim', source: 'wires', news_score: 70 }] } } });
    assert.equal(e.kind, 'daily');
    assert.equal(e.key, 'daily:2026-10-21');
    assert.equal(e.tag, 'daily');
    assert.match(e.subject, /SIREN 3 · 61\.2 of 100/);
    assert.match(e.body, /\+11\.2 on 24 hours earlier/);
    assert.match(e.body, /A \\\*bold\\\* claim/);
    assert.match(e.body, /\{\{ unsubscribe_url \}\}/);
    assert.equal(findFutureViolation(e.body.replace(/\[[^\]]*\]\([^)]*\)/g, '')), null);
  });

  it('a fresh level change is an alert, once', () => {
    assert.equal(previousLevel(state(), history), 4);
    const now = new Date('2026-10-21T14:10:00Z');
    const a = pickAlert({ state: state(), history, now });
    assert.equal(a.kind, 'level');
    assert.match(a.subject, /SIREN 4 → SIREN 3: ELEVATED/);
    assert.match(a.body, /tempo, not danger/);
    assert.equal(pickAlert({ state: state(), history, now, ledger: [{ key: a.key, kind: 'level', sent_at: now.toISOString() }] }), null);
  });

  it('breaking alerts need enough outlets, freshness, and spacing', () => {
    const s = state({ level_since: '2026-10-01T00:00:00.000Z' });
    const now = new Date('2026-10-21T14:10:00Z');
    assert.equal(pickAlert({ state: s, history, now, breaking: { clusters: [cluster({ corroboration: 2 })] } }), null);
    assert.equal(pickAlert({ state: s, history, now, breaking: { clusters: [cluster({ breaking_at: '2026-10-21T08:00:00Z' })] } }), null);
    const b = pickAlert({ state: s, history, now, breaking: { clusters: [cluster()] } });
    assert.equal(b.kind, 'breaking');
    assert.equal(b.tag, 'alerts');
    const recent = [{ kind: 'breaking', key: 'breaking:zz', sent_at: '2026-10-21T12:00:00Z' }];
    assert.equal(pickAlert({ state: s, history, now, ledger: recent, breaking: { clusters: [cluster()] } }), null);
  });

  it('the Buttondown request targets one tag and confirms the send', () => {
    const r = buildRequest({ subject: 's', body: 'b', tag: 'alerts' }, 'k');
    assert.equal(r.headers.authorization, 'Token k');
    assert.equal(r.headers['x-buttondown-live-dangerously'], 'true');
    const body = JSON.parse(r.body);
    assert.equal(body.status, 'about_to_send');
    assert.deepEqual(body.filters.filters[0], { field: 'subscriber.tags', operator: 'contains', value: 'alerts' });
  });

  it('does nothing without a key', async () => {
    const lines = [];
    const out = await run({ mode: 'daily', env: {}, say: (l) => lines.push(l), transport: () => { throw new Error('must not send'); } });
    assert.equal(out.sent, null);
    assert.match(lines[0], /BUTTONDOWN_API_KEY is not set/);
  });
});
