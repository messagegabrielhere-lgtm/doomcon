import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gScale, parseKev, parseFeodo, parseEonet } from '../threats.mjs';

test('gScale follows NOAA (G1 = Kp 5) and never calls a missing reading quiet', () => {
  assert.equal(gScale(5).level, 'G1');
  assert.equal(gScale(7.3).level, 'G3');
  assert.equal(gScale(9).level, 'G5');
  assert.equal(gScale(2).level, 'QUIET');
  assert.equal(gScale(null).level, 'UNKNOWN');
});

test('parseKev counts recent additions, ransomware and AI-stack flaws', () => {
  const now = Date.parse('2026-10-10T00:00:00Z');
  const k = parseKev({ catalogVersion: 'x', vulnerabilities: [
    { cveID: 'CVE-1', vendorProject: 'NVIDIA', product: 'Triton', vulnerabilityName: 'RCE', dateAdded: '2026-10-08', knownRansomwareCampaignUse: 'Known' },
    { cveID: 'CVE-2', vendorProject: 'Acme', product: 'VPN', vulnerabilityName: 'Auth bypass', dateAdded: '2026-09-20', knownRansomwareCampaignUse: 'Unknown' },
    { cveID: 'CVE-3', vendorProject: 'Old', product: 'Thing', vulnerabilityName: 'x', dateAdded: '2020-01-01' }] }, now);
  assert.equal(k.total, 3); assert.equal(k.added_7d, 1); assert.equal(k.added_30d, 2); assert.equal(k.ransomware_30d, 1);
  assert.equal(k.latest[0].cve, 'CVE-1'); assert.equal(k.latest[0].ai, true);
});

test('parseFeodo and parseEonet summarise their feeds', () => {
  const f = parseFeodo([{ status: 'online', malware: 'QakBot', country: 'US', last_online: '2026-10-09' }, { status: 'offline', malware: 'QakBot', country: 'DE', last_online: '2026-01-01' }], Date.parse('2026-10-09T12:00:00Z'));
  assert.equal(f.online, 1); assert.equal(f.by_malware[0].n, 2);
  const e = parseEonet({ events: [{ title: 'Fire', categories: [{ title: 'Wildfires' }], geometry: [{ date: '2026-10-09' }] }] });
  assert.equal(e.open, 1); assert.equal(e.by_category[0].key, 'Wildfires');
});
