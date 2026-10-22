import assert from 'node:assert/strict';
import { it } from 'node:test';
import { blocks } from './_pixel.mjs';

it('pixel art draws one path per colour, not a rect per run', () => {
  const svg = blocks(['##.#', '.##.'], { '#': '#FFF' }, 3);
  assert.doesNotMatch(svg, /<rect/);
  assert.equal((svg.match(/<path /g) || []).length, 1);
  assert.match(svg, /d="M0 0h2v1h-2zM3 0h1v1h-1zM1 1h2v1h-2z" fill="#FFF"/);
});
