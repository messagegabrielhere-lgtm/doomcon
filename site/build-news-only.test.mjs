import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function newsOnlyBlock(src) {
  const marker = 'NEWS-ONLY FAST PATH';
  const start = src.indexOf(marker);
  assert.ok(start >= 0, 'news-only marker missing');
  const end = src.indexOf('news-only build complete', start);
  assert.ok(end > start, 'news-only complete log missing');
  return src.slice(start, end);
}

test('news-only item skip ignores asOfChanged (FINDABILITY #102)', () => {
  // Blanket rewrite when state.generated_at moved forced ~800 item HTML writes
  // per newsroom tick and stalled Google News Publish.
  const block = newsOnlyBlock(readFileSync(join(ROOT, 'site/build.mjs'), 'utf8'));
  assert.match(block, /FINDABILITY #102/);
  assert.match(block, /if \(!itemChanged && existsSync\(abs\)\)/);
  assert.doesNotMatch(
    block,
    /if \(!asOfChanged && !pillarChanged && !entityChanged && !itemChanged/,
  );
  assert.doesNotMatch(
    block,
    /if \(!pillarChanged && !entityChanged && !itemChanged/,
  );
});

test('news-only skips facet hub rewrites (FINDABILITY #103)', () => {
  // Seeded public/ + full facet rewrite + stamp blew news-fast's 480s budget
  // (6/6 ticks timed out, PUBLISHED=0) even after #102 item skips.
  const block = newsOnlyBlock(readFileSync(join(ROOT, 'site/build.mjs'), 'utf8'));
  assert.match(block, /FINDABILITY #103/);
  assert.match(block, /dayPages\.indexableDays/);
  assert.match(block, /news-sitemap\.xml/);
  assert.doesNotMatch(block, /writeModelAndCountryPages/);
  assert.doesNotMatch(block, /writePeopleAndDayPages/);
  assert.doesNotMatch(block, /writeTagPages/);
  assert.doesNotMatch(block, /writeKindPages/);
  assert.doesNotMatch(block, /writeOutletPages/);
  assert.doesNotMatch(block, /facetPages\.renderPillar/);
  assert.doesNotMatch(block, /facetPages\.renderLab/);
});

test('news-only caps live day hubs and skips full sitemap (FINDABILITY #106)', () => {
  const block = newsOnlyBlock(readFileSync(join(ROOT, 'site/build.mjs'), 'utf8'));
  assert.match(block, /FINDABILITY #106/);
  assert.match(block, /liveDays/);
  assert.match(block, /\.slice\(0, 5\)/);
  assert.doesNotMatch(block, /write\(args\.out, 'sitemap\.xml'/);
});
