import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render } from './openapi.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  state: { engine_version: '1', generated_at: '2026-10-14T22:00:00Z' },
};

test('openapi lists Outrank free-tool and Search Trends HTML landings', () => {
  const spec = JSON.parse(render(ctx));
  assert.equal(spec.openapi, '3.1.0');
  for (const p of [
    '/api/search-trends.json',
    '/search-trends.html',
    '/ai-prediction-markets.html',
    '/free-tools.html',
    '/verify.html',
    '/classic.html',
    '/AGENTS.md',
  ]) {
    assert.ok(spec.paths[p], p);
    assert.ok(spec.paths[p].get?.operationId, p);
  }
  assert.match(spec.paths['/verify.html'].get.summary, /check a SIREN reading/i);
  assert.match(spec.paths['/free-tools.html'].get.summary, /free tools/i);
  assert.match(spec.paths['/search-trends.html'].get.summary, /Search Trends/i);
  // FINDABILITY #330 — OpenAPI path for the classic instrument panel.
  assert.match(spec.paths['/classic.html'].get.summary, /full SIREN instrument panel/i);
  // FINDABILITY #441 — OpenAPI `/` names dual middot head terms.
  assert.match(
    spec.paths['/'].get.summary,
    /AI activity index today · AI activity level today/,
  );
  assert.equal(
    spec.paths['/verify.html'].get.responses['200'].content['text/html'].schema.type,
    'string',
  );
  assert.doesNotMatch(JSON.stringify(spec), /probability of doom/i);
});
