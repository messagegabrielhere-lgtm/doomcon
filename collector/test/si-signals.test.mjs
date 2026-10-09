import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCount } from '../si-signals.mjs';

test('searchCount retries an incomplete GitHub search and keeps the full count', async () => {
  const answers = [{ total_count: 1, incomplete_results: true }, { total_count: 2184, incomplete_results: false }];
  let i = 0;
  const r = await searchCount('q', { fetcher: async () => answers[i++], pause: 0 });
  assert.equal(r.count, 2184); assert.equal(r.complete, true);
  assert.equal(i, 2);
});

test('searchCount marks a count that never completed', async () => {
  const r = await searchCount('q', { fetcher: async () => ({ total_count: 40, incomplete_results: true }), pause: 0, tries: 2 });
  assert.equal(r.count, 40); assert.equal(r.complete, false);
});

test('workKind sorts PR titles into kinds of work', async () => {
  const { workKind } = await import('../si-signals.mjs');
  assert.equal(workKind('fix(auth): handle expired tokens'), 'fix');
  assert.equal(workKind('feat: add CSV export'), 'feature');
  assert.equal(workKind('Bump lodash from 4.17.20 to 4.17.21'), 'deps');
  assert.equal(workKind('Add unit tests for parser'), 'feature');
  assert.equal(workKind('Update README with setup steps'), 'docs');
  assert.equal(workKind('Refactor payment module'), 'refactor');
  assert.equal(workKind('Hello'), 'other');
});

test('summariseWork counts kinds, languages and repos', async () => {
  const { summariseWork } = await import('../si-signals.mjs');
  const it = (title, repo, at) => ({ title, repository_url: `https://api.github.com/repos/${repo}`, html_url: `https://github.com/${repo}/pull/1`, created_at: at });
  const w = summariseWork([
    { agent: 'Devin', items: [it('fix: crash on start', 'a/x', '2026-10-09T10:00:00Z'), it('feat: dark mode', 'a/x', '2026-10-09T11:00:00Z')] },
    { agent: 'Claude', items: [it('docs: README', 'b/y', '2026-10-09T12:00:00Z')] },
  ], { 'a/x': 'TypeScript', 'b/y': 'Python' });
  assert.equal(w.sample_size, 3);
  assert.deepEqual(w.languages, [{ name: 'TypeScript', n: 2 }, { name: 'Python', n: 1 }]);
  assert.equal(w.latest[0].agent, 'Claude');
  assert.equal(w.by_agent.Devin.fix, 1);
  assert.equal(w.top_repos[0].repo, 'a/x');
});
