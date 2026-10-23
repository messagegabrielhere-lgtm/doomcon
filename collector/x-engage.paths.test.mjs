import { it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEngageSlate } from './x-engage.mjs';
import { slugFor } from '../site/templates/itemPage.mjs';

it('newsroom rows link to the real item page (slug-id), not /item/<id>.html', () => {
  const item = { id: 'c89746c76134a26f', title: 'Lab ships a model: what changed?', url: 'https://x.com/someone/status/1234567890123456789', published_at: '2026-10-22T20:00:00Z', score: 70, pillar: 'capability' };
  const slate = buildEngageSlate({ news: { items: [item] }, now: '2026-10-22T21:00:00Z' });
  const row = slate.items.find((r) => r.source === 'news');
  assert.ok(row, 'news row present');
  assert.equal(row.site_path, `/item/${slugFor(item)}.html`);
});
