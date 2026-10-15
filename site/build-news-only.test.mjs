import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('news-only item skip ignores asOfChanged (FINDABILITY #102)', () => {
  // Blanket rewrite when state.generated_at moved forced ~800 item HTML writes
  // per newsroom tick and stalled Google News Publish.
  const src = readFileSync(join(ROOT, 'site/build.mjs'), 'utf8');
  const newsOnly = src.match(/if \(newsOnly\) \{([\s\S]*?)\n  \}/);
  assert.ok(newsOnly, 'news-only block missing');
  assert.match(newsOnly[0], /FINDABILITY #102/);
  assert.match(
    newsOnly[0],
    /if \(!pillarChanged && !entityChanged && !itemChanged && existsSync\(abs\)\)/,
  );
  assert.doesNotMatch(
    newsOnly[0],
    /if \(!asOfChanged && !pillarChanged && !entityChanged && !itemChanged/,
  );
});
