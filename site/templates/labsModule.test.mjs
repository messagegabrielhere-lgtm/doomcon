import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './_labs.mjs';

const race = JSON.parse(readFileSync(new URL('../../data/race.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  race,
  state: { generated_at: '2026-10-14T02:00:00Z', score: 55.5, level: 4, level_name: 'ROUTINE' },
};

describe('labs monitor module', () => {
  it('links the ranking CTA with the race question H1', () => {
    const html = render(ctx);
    assert.match(html, /Who is winning the AI race\? →/);
    assert.doesNotMatch(html, /full ranking →/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
