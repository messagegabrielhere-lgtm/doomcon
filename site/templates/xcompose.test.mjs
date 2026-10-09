import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeX } from '../xcompose.mjs';

test('composer: fresh wording, live numbers, fits X', () => {
  const seen = new Set();
  let r = 0;
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < 12; i++) {
    const t = composeX({ kind: 'news', title: 'OpenAI ships a new model with a very long headline that goes on and on about benchmarks and agents and more', src: 'Reuters', level: { L: '4', S: '57.4' }, now: Date.UTC(2026, 9, 9, 18, i), rand });
    assert.ok(t.length <= 250, t);
    assert.ok(!/\{\w+\}/.test(t), t);
    seen.add(t);
  }
  assert.ok(seen.size >= 8, `only ${seen.size} distinct posts`);
  const rd = composeX({ kind: 'reading', level: { L: '3', S: '61.2' }, rand: () => 0 });
  assert.match(rd, /3/);
  assert.match(rd, /61\.2/);
});

test('composer: skips a wording the visitor already used', async () => {
  const first = composeX({ kind: 'alert', title: 'Tornado Warning', src: 'NWS', level: { L: '4', S: '50' }, now: 0, rand: () => 0 });
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
  let k = 0;
  const second = composeX({ kind: 'alert', title: 'Tornado Warning', src: 'NWS', level: { L: '4', S: '50' }, now: 0, rand: () => (k++ % 7) / 7, used: [hash(first)] });
  assert.notEqual(first, second);
});
