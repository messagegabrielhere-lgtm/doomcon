// Every room tile and every What's New entry gets its own icon: the owner
// asked twice for no duplicates. Same page, same icon is allowed only for the
// same destination (e.g. a room repeated in two groups).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomGroups } from './homeV2.mjs';
import { WHATS_NEW } from '../siteheader.mjs';
import { TILE_ICONS } from '../tileicons.mjs';

test('room and What’s New icons are unique per destination', () => {
  const ctx = { href: (p) => p, url: (p) => p, news: { items: [] }, routes: {}, molt: null, leaders: null };
  const rows = roomGroups(ctx).flatMap(([, list]) => list.map(([h, art, label]) => [h.split('#')[0], art, label]));
  for (const [h, art, label] of WHATS_NEW) rows.push(['new:' + h, art, label]);
  const byIcon = new Map();
  for (const [h, art, label] of rows) {
    const set = byIcon.get(art) || new Map();
    set.set(h, label); byIcon.set(art, set);
  }
  const dups = [...byIcon].filter(([, m]) => m.size > 1).map(([art, m]) => `${art}: ${[...m.values()].join(', ')}`);
  assert.deepEqual(dups, []);
  for (const [, art] of rows) if (String(art).startsWith('px:')) assert.ok(TILE_ICONS[art.slice(3)], `missing pixel icon ${art}`);
});
