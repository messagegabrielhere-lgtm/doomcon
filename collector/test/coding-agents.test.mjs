import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  healthOf, rowFromFetch, summarise, AGENT_ROSTER, MCP_ROSTER,
} from '../coding-agents.mjs';

test('healthOf labels active / slowing / dormant from recency', () => {
  const asOf = '2026-10-12T00:00:00.000Z';
  assert.equal(healthOf('2026-10-10T00:00:00.000Z', null, asOf).label, 'active');
  assert.equal(healthOf('2026-08-20T00:00:00.000Z', null, asOf).label, 'slowing');
  assert.equal(healthOf('2026-01-01T00:00:00.000Z', null, asOf).label, 'dormant');
});

test('rowFromFetch keeps dark rows honest', () => {
  const dark = rowFromFetch(AGENT_ROSTER[0], {
    error: new Error('HTTP 403'),
    asOf: '2026-10-12T00:00:00.000Z',
  });
  assert.equal(dark.ok, false);
  assert.equal(dark.stars, null);
  assert.equal(dark.health.label, 'dark');
});

test('rowFromFetch + summarise sort active high-star agents first', () => {
  const asOf = '2026-10-12T00:00:00.000Z';
  const a = rowFromFetch(AGENT_ROSTER[0], {
    repoJson: {
      stargazers_count: 50, forks_count: 1, subscribers_count: 1, open_issues_count: 0,
      language: 'TS', license: { spdx_id: 'MIT' }, archived: false,
      pushed_at: '2026-10-11T00:00:00.000Z', html_url: 'https://github.com/x/y', description: 'd',
    },
    releaseJson: { tag_name: 'v1', published_at: '2026-10-10T00:00:00.000Z', html_url: 'https://github.com/x/y/releases/1', prerelease: false },
    asOf,
  });
  a.releases_90d = 3;
  const b = rowFromFetch(AGENT_ROSTER[1], {
    repoJson: {
      stargazers_count: 500, forks_count: 1, subscribers_count: 1, open_issues_count: 0,
      language: 'TS', license: { spdx_id: 'MIT' }, archived: false,
      pushed_at: '2026-10-11T00:00:00.000Z', html_url: 'https://github.com/x/z', description: 'd',
    },
    releaseJson: { tag_name: 'v2', published_at: '2026-10-09T00:00:00.000Z', html_url: 'https://github.com/x/z/releases/2', prerelease: false },
    asOf,
  });
  b.releases_90d = 1;
  const s = summarise([a, b]);
  assert.equal(s.ok, 2);
  assert.equal(s.most_stars.id, AGENT_ROSTER[1].id);
  assert.equal(s.most_releases_90d.id, AGENT_ROSTER[0].id);
  assert.ok(AGENT_ROSTER.length >= 20);
  assert.ok(MCP_ROSTER.length >= 5);
});
