import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARCHIVE_MAX,
  mergeArchive,
  archiveOnlyItems,
  sortArchiveItems,
} from '../item-archive.mjs';

function item(id, published_at, title = `Title ${id}`) {
  return {
    id,
    title,
    url: `https://example.test/${id}`,
    published_at,
    score: 40,
    pillar: 'capability',
    source: 'hn',
    summary: 'scored story',
    meta: { first_seen_at: published_at },
  };
}

describe('item-archive', () => {
  it('keeps overflow and departed out of the live id set', () => {
    const prev = {
      items: [item('old', '2026-10-01T00:00:00Z')],
    };
    const out = mergeArchive(prev, {
      overflow: [item('ov', '2026-10-10T00:00:00Z')],
      departed: [item('gone', '2026-10-09T00:00:00Z')],
      liveIds: ['live', 'ov'],
      updatedAt: '2026-10-12T00:00:00Z',
      max: 10,
    });
    const ids = out.items.map((i) => i.id).sort();
    assert.deepEqual(ids, ['gone', 'old']);
    assert.equal(out.schema, 1);
    assert.equal(out.updated_at, '2026-10-12T00:00:00Z');
  });

  it('caps by published_at and never invents rows', () => {
    const overflow = [
      item('a', '2026-10-10T00:00:00Z'),
      item('b', '2026-10-11T00:00:00Z'),
      item('c', '2026-10-09T00:00:00Z'),
      { id: 'bad' },
    ];
    const out = mergeArchive(null, { overflow, liveIds: [], max: 2, updatedAt: '2026-10-12T00:00:00Z' });
    assert.deepEqual(out.items.map((i) => i.id), ['b', 'a']);
    assert.equal(ARCHIVE_MAX, 5000);
    assert.deepEqual(sortArchiveItems(out.items).map((i) => i.id), ['b', 'a']);
  });

  it('archiveOnlyItems drops ids still in the newsroom window', () => {
    const archive = { items: [item('a', '2026-10-01T00:00:00Z'), item('b', '2026-10-02T00:00:00Z')] };
    const only = archiveOnlyItems(archive, [item('a', '2026-10-10T00:00:00Z')]);
    assert.deepEqual(only.map((i) => i.id), ['b']);
  });
});
