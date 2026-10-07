import assert from 'node:assert/strict';
import test from 'node:test';
import {
  beaconScript, commitReport, diffAlerts, emptyLedger, formatReport, formatWorkflowFailure,
  hourLabel, ingestEvents, injectBeacon, normalisePath, parseNtfy, planReport, previousHourKey,
  statusFromState, summarize,
} from './visitors.mjs';

const NOW = new Date('2026-10-07T22:11:00.000Z');
const NOW_UNIX = Math.floor(NOW.getTime() / 1000);

function hit(id, time, path) {
  return { id, time, event: 'message', topic: 't', message: JSON.stringify({ v: 1, path }) };
}

test('normalisePath strips the project prefix, query and index.html', () => {
  assert.equal(normalisePath('/doomcon/methodology.html', '/doomcon'), '/methodology.html');
  assert.equal(normalisePath('/doomcon/', '/doomcon'), '/');
  assert.equal(normalisePath('/doomcon', '/doomcon'), '/');
  assert.equal(normalisePath('/methodology.html?x=1#y', ''), '/methodology.html');
  assert.equal(normalisePath('/foo/index.html', ''), '/foo');
  assert.equal(normalisePath('/doomcon-extra', '/doomcon'), '/doomcon-extra');
  assert.equal(normalisePath('/../etc/passwd', ''), null);
  assert.equal(normalisePath('https://evil.example/', ''), null);
  assert.equal(normalisePath('/a b', ''), null);
});

test('ingest counts a path once per ntfy id and buckets by the server clock', () => {
  const t = Math.floor(Date.parse('2026-10-07T21:30:00Z') / 1000);
  const events = [hit('a', t, '/doomcon/'), hit('a', t, '/doomcon/'), hit('b', t + 1, '/doomcon/methodology.html')];
  const { ledger, accepted } = ingestEvents(emptyLedger(), events, { basePath: '/doomcon', nowUnix: NOW_UNIX });
  assert.equal(accepted, 2);
  assert.equal(ledger.hours['2026-10-07T21'].views, 2);
  assert.equal(ledger.hours['2026-10-07T21'].paths['/'], 1);
  assert.equal(ledger.hours['2026-10-07T21'].paths['/methodology.html'], 1);
  const again = ingestEvents(ledger, events, { basePath: '/doomcon', nowUnix: NOW_UNIX });
  assert.equal(again.accepted, 0);
  assert.equal(again.ledger.hours['2026-10-07T21'].views, 2);
});

test('ingest drops a message that is not a page view', () => {
  const t = Math.floor(Date.parse('2026-10-07T21:30:00Z') / 1000);
  const events = [
    { id: 'x', time: t, event: 'message', message: 'hello' },
    { id: 'y', time: t, event: 'message', message: JSON.stringify({ v: 2, path: '/' }) },
    hit('z', t, '/ok'),
  ];
  const { ledger, accepted } = ingestEvents(emptyLedger(), events, { nowUnix: NOW_UNIX });
  assert.equal(accepted, 1);
  assert.equal(ledger.hours['2026-10-07T21'].views, 1);
});

test('summarize reports the previous complete hour and the UTC day', () => {
  const t21 = Math.floor(Date.parse('2026-10-07T21:10:00Z') / 1000);
  const t22 = Math.floor(Date.parse('2026-10-07T22:05:00Z') / 1000);
  const { ledger } = ingestEvents(emptyLedger(), [hit('a', t21, '/'), hit('b', t21, '/'), hit('c', t22, '/news.html')], { nowUnix: NOW_UNIX });
  const summary = summarize(ledger, NOW);
  assert.equal(previousHourKey(NOW), '2026-10-07T21');
  assert.equal(summary.hour, '2026-10-07T21');
  assert.equal(summary.hourViews, 2);
  assert.equal(summary.today, 3);
  assert.deepEqual(summary.top[0], ['/', 2]);
  assert.equal(hourLabel(summary.hour), '2026-10-07 21:00 to 2026-10-07 22:00 UTC');
});

test('alerts fire on the edge and stay quiet while a pillar remains dark', () => {
  const dark = statusFromState({
    level: 4, level_name: 'ROUTINE', score: 48.4, degraded: true,
    failed_sources: ['sec-fts'], dark_pillars: ['compute'], generated_at: '2026-10-07T22:45:55.414Z',
  });
  const first = diffAlerts(null, dark);
  assert.deepEqual(first.map((a) => a.kind), ['degraded']);
  assert.deepEqual(diffAlerts(dark, dark), []);
  const louder = { ...dark, level: 3, level_name: 'ELEVATED' };
  assert.equal(diffAlerts(dark, louder)[0].kind, 'level');
  const healed = { ...dark, degraded: false, failed: [], dark: [] };
  assert.deepEqual(diffAlerts(dark, healed).map((a) => a.kind), ['recovered']);
  const extra = { ...dark, failed: ['sec-fts', 'arxiv'] };
  assert.deepEqual(diffAlerts(dark, extra).map((a) => a.kind), ['source_failed']);
});

test('the hourly report names views and the index, and a failed post does not clear the alert', () => {
  const t = Math.floor(Date.parse('2026-10-07T21:30:00Z') / 1000);
  const state = {
    level: 4, level_name: 'ROUTINE', score: 48.4412, degraded: true,
    failed_sources: ['sec-fts'], dark_pillars: ['compute'], generated_at: '2026-10-07T21:45:00.000Z',
  };
  const plan = planReport(emptyLedger(), {
    events: [hit('a', t, '/')],
    state,
    now: NOW,
    basePath: '',
    siteUrl: 'https://example.test/doomcon/',
    nowUnix: NOW_UNIX,
  });
  assert.match(plan.text, /Page views that hour: 1/);
  assert.match(plan.text, /Index: 48\.4, level 4 ROUTINE, degraded \(compute dark; failed: sec-fts\)\./);
  assert.match(plan.text, /SIREN alert: the index went degraded/);
  assert.equal(plan.ledger.status, null);
  const saved = commitReport(emptyLedger(), plan, { posted: false });
  assert.equal(saved.status, null);
  const acked = commitReport(emptyLedger(), plan, { posted: true });
  assert.equal(acked.status.degraded, true);
  assert.equal(acked.last_report_hour, '2026-10-07T21');
  const quiet = planReport(acked, { events: [], state, now: NOW, nowUnix: NOW_UNIX, siteUrl: 'https://example.test/' });
  assert.equal(quiet.text, null);
});

test('parseNtfy reads one JSON object per line', () => {
  const rows = parseNtfy('{"id":"a","event":"message"}\n\n{"id":"b","event":"message"}\n');
  assert.equal(rows.length, 2);
  assert.equal(parseNtfy('').length, 0);
  assert.equal(parseNtfy('not json\n').length, 0);
});

test('workflow failure text points at the run and does not invent a visitor count', () => {
  const text = formatWorkflowFailure({ name: 'collect', conclusion: 'failure', url: 'https://github.com/example/run/1' });
  assert.match(text, /collect workflow failed/);
  assert.match(text, /https:\/\/github.com\/example\/run\/1/);
  assert.doesNotMatch(text, /page views/i);
});

test('injectBeacon lands before the closing body tag', () => {
  const html = injectBeacon('<html><body><p>Hi</p></body></html>', '/doomcon');
  assert.match(html, /<script>[\s\S]*ntfy\.sh[\s\S]*<\/script>\n<\/body>/);
  assert.equal(html.match(/<script>/g).length, 1);
});

test('the beacon counts a path and sets no cookie', () => {
  const js = beaconScript({ basePath: '/doomcon', topic: 'siren-pageviews-doomcon-7f3a' });
  assert.match(js, /https:\/\/ntfy\.sh\/siren-pageviews-doomcon-7f3a/);
  assert.match(js, /sessionStorage/);
  assert.match(js, /localhost/);
  assert.doesNotMatch(js, /document\.cookie/);
  assert.doesNotMatch(js, /google-analytics|googletagmanager|hotjar|plausible|goatcounter|posthog|fbq\(/i);
  assert.equal(hourLabel('2026-10-07T23'), '2026-10-07 23:00 to 2026-10-08 00:00 UTC');
  const report = formatReport({
    summary: { hour: '2026-10-07T21', hourViews: 0, top: [], today: 0 },
    status: null,
    alerts: [],
    siteUrl: 'https://example.test/',
    digest: true,
  });
  assert.match(report, /Page views that hour: 0/);
  assert.match(report, /Index reading could not be fetched/);
});
