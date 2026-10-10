import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSummary, SERVICES } from '../ai-status.mjs';

test('parseSummary keeps the indicator, degraded components and open incidents', () => {
  const s = parseSummary({ page: { updated_at: '2026-10-10T02:00:00Z' }, status: { indicator: 'minor', description: 'Partially Degraded Service' },
    components: [{ name: 'API', status: 'degraded_performance' }, { name: 'Console', status: 'operational' }, { name: 'Group', status: 'major_outage', group: true }],
    incidents: [{ name: 'Elevated errors', impact: 'minor', status: 'investigating', shortlink: 'https://stspg.io/x', incident_updates: [{ body: 'Looking into it' }] }, { name: 'Old', status: 'resolved' }] });
  assert.equal(s.indicator, 'minor');
  assert.deepEqual(s.degraded, [{ name: 'API', status: 'degraded_performance' }]);
  assert.equal(s.incidents.length, 1);
  assert.equal(s.incidents[0].latest, 'Looking into it');
  assert.equal(parseSummary({}), null);
});

test('every service has a unique id and an https summary endpoint', () => {
  const ids = SERVICES.map((s) => s[0]);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SERVICES) assert.match(s[4], /^https:\/\/.+\/api\/v2\/summary\.json$/);
});
