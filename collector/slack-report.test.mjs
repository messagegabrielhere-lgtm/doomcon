import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alertLine, diffAlerts, formatReport, indexLine, postSlack, statusFromState, viewsLines,
} from './slack-report.mjs';

const DARK = {
  level: 4, level_name: 'ROUTINE', score: 48.4412, degraded: true,
  failed_sources: ['sec-fts'], dark_pillars: ['compute'], generated_at: '2026-10-07T21:45:00.000Z',
};

test('alerts fire on the edge and stay quiet while a pillar remains dark', () => {
  const dark = statusFromState(DARK);
  assert.deepEqual(diffAlerts(null, dark).map((a) => a.kind), ['degraded']);
  assert.deepEqual(diffAlerts(dark, dark), []);
  const louder = { ...dark, level: 3, level_name: 'ELEVATED' };
  assert.equal(diffAlerts(dark, louder)[0].kind, 'level');
  const healed = { ...dark, degraded: false, failed: [], dark: [] };
  assert.deepEqual(diffAlerts(dark, healed).map((a) => a.kind), ['recovered']);
  const extra = { ...dark, failed: ['sec-fts', 'arxiv'] };
  assert.deepEqual(diffAlerts(dark, extra).map((a) => a.kind), ['source_failed']);
  const fewer = { ...dark, failed: [] };
  assert.deepEqual(diffAlerts(dark, fewer).map((a) => a.kind), ['source_recovered']);
});

test('the report names the index, the views and any alert', () => {
  const status = statusFromState(DARK);
  const text = formatReport({
    status,
    alerts: diffAlerts(null, status),
    views: { day: 12, week: 40, pages: [{ name: '/', count: 8 }, { name: '/news.html', count: 3 }] },
    siteUrl: 'https://example.test/',
  });
  assert.match(text, /^SIREN alert: the index went degraded\. Dark: compute\. Failed: sec-fts\./);
  assert.match(text, /Index: 48\.4, level 4 ROUTINE, degraded \(compute dark; failed: sec-fts\)\./);
  assert.match(text, /Page views: 12 in the last 24 hours, 40 in the last 7 days\./);
  assert.match(text, /Top pages, 24h: \/ \(8\), \/news\.html \(3\)/);
  assert.match(text, /reading stamped 2026-10-07T21:45:00\.000Z/);
});

test('without GoatCounter or state the report still renders', () => {
  assert.match(viewsLines(null)[0], /not configured/);
  assert.equal(indexLine(null), 'Index: no state.json to read.');
  const text = formatReport({ status: null, views: null, siteUrl: '' });
  assert.match(text, /SIREN hourly/);
});

test('level alert reads as a move, with no future tense', () => {
  const line = alertLine({ kind: 'level', from: 4, to: 3, fromName: 'ROUTINE', toName: 'ELEVATED' });
  assert.equal(line, 'SIREN alert: level moved from 4 ROUTINE to 3 ELEVATED.');
  const banned = /\b(will|expect|predict|imminent|soon|coming|warns|forecast|likely)\b|'ll\b/i;
  const all = [
    line,
    alertLine({ kind: 'degraded', dark: [], failed: [] }),
    alertLine({ kind: 'recovered' }),
    alertLine({ kind: 'source_failed', ids: ['a'] }),
    alertLine({ kind: 'source_recovered', ids: ['a'] }),
    formatReport({ status: statusFromState(DARK), views: null }),
  ];
  for (const s of all) assert.doesNotMatch(s, banned);
});

test('postSlack is a no-op without a webhook and sends once with retries: 0', async () => {
  assert.deepEqual(await postSlack('', 'x'), { sent: false });
  const calls = [];
  const res = await postSlack('https://hooks.example.test/abc', 'hello', {
    fetchText: async (url, opts) => { calls.push({ url, opts }); return 'ok'; },
  });
  assert.deepEqual(res, { sent: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.retries, 0);
  assert.deepEqual(JSON.parse(calls[0].opts.body), { text: 'hello' });
});

test('a failed post never echoes the webhook URL', async () => {
  const hook = 'https://hooks.example.test/T0/B0/very-secret-path';
  await assert.rejects(
    () => postSlack(hook, 'x', {
      fetchText: async () => { const e = new Error(`HTTP 404 from ${hook}`); e.status = 404; throw e; },
    }),
    (err) => err.message === 'Slack webhook failed HTTP 404' && !err.message.includes('very-secret-path'),
  );
});
