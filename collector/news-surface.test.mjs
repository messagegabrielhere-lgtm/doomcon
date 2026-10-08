import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceSignature } from './news.mjs';

test('surfaceSignature ignores score-only drift', () => {
  const base = [{
    id: 'abc',
    title: 'Lab ships model',
    score: 40,
    meta: { corroboration: { count: 1 }, story: null },
  }];
  const drifted = [{
    ...base[0],
    score: 39.1,
    meta: { corroboration: { count: 1 }, story: null },
  }];
  assert.equal(surfaceSignature(base, []), surfaceSignature(drifted, []));
});

test('surfaceSignature moves on corroboration and story membership', () => {
  const one = [{
    id: 'abc',
    title: 'Lab ships model',
    meta: { corroboration: { count: 1 }, story: null },
  }];
  const two = [{
    id: 'abc',
    title: 'Lab ships model',
    meta: { corroboration: { count: 2 }, story: { id: 's1' } },
  }];
  const stories = [{ id: 's1', members: ['abc', 'def'], sources: ['a', 'b'], severity: 0 }];
  assert.notEqual(surfaceSignature(one, []), surfaceSignature(two, stories));
});

test('surfaceSignature moves on title edits', () => {
  const a = [{ id: 'abc', title: 'One', meta: { corroboration: { count: 1 } } }];
  const b = [{ id: 'abc', title: 'Two', meta: { corroboration: { count: 1 } } }];
  assert.notEqual(surfaceSignature(a, []), surfaceSignature(b, []));
});
