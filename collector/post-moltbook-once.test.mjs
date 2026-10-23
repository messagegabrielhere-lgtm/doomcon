import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { requestFor } from './post-moltbook-once.mjs';

describe('moltbook queue requests', () => {
  it('posts a new post by default', () => {
    assert.deepEqual(requestFor({ id: 'a', title: 'T', content: 'C' }),
      { path: '/posts', body: { submolt_name: 'general', title: 'T', content: 'C' } });
  });
  it('replies on a thread for a comment item', () => {
    assert.deepEqual(requestFor({ id: 'b', type: 'comment', post_id: 'p1', content: 'C' }),
      { path: '/posts/p1/comments', body: { content: 'C' } });
    assert.deepEqual(requestFor({ id: 'c', type: 'comment', post_id: 'p1', parent_id: 'k9', content: 'C' }).body,
      { content: 'C', parent_id: 'k9' });
  });
  it('refuses a comment without a thread', () => {
    assert.throws(() => requestFor({ id: 'd', type: 'comment', content: 'C' }), /post_id/);
  });
});
