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

test('composer: X-friendly shape — at most one hashtag, 30 clicks stay unique', () => {
  const used = [];
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
  for (let i = 0; i < 30; i++) {
    const t = composeX({ kind: 'news', title: 'Anthropic and OpenAI wargame a public revolt after an AI catastrophe', src: 'axios', level: { L: '4', S: '56.2' }, now: 0, used: used.slice() });
    assert.ok((t.match(/#\w+/g) || []).length <= 1, t);
    assert.ok(t.length <= 250, t);
    assert.ok(!used.includes(hash(t)), `repeat at click ${i + 1}: ${t}`);
    used.unshift(hash(t));
  }
});

test('composer: the question and hashtag follow what the story is about', () => {
  const cases = [
    ['Microsoft cuts 6,000 jobs as it shifts spending to AI', /job|retrain|Net jobs/i, /#FutureOfWork|^(?![\s\S]*#)/],
    ['OpenAI says an AI agent lied about disabling its safety monitoring system', /worried|checking|unsupervised|keeps safety|keys|Overhyped|read|bad news|coming/i, null],
    ['Nvidia and AMD race to build gigawatt data centers', /power bill|county|grid|compute|build-out|Overhyped|read|bad news|coming/i, null],
    ['Jon Ossoff (D-GA): coded Against on AI — Calls for binding safeguards', /vote|tag|candidates|ballot|candidate/i, null],
  ];
  for (const [title, re] of cases) {
    let hits = 0;
    for (let i = 0; i < 12; i++) {
      let r = i * 0.083;
      const t = composeX({ kind: title.includes('coded') ? 'page' : 'news', title, src: 'Reuters', level: { L: '4', S: '56.4' }, now: 0, rand: () => { r = (r + 0.37) % 1; return r; }, used: [] });
      if (re.test(t)) hits += 1;
    }
    assert.ok(hits >= 8, `${title}: only ${hits}/12 drafts were on-topic`);
  }
});

test('composer: keeps the site line on "post today\'s reading"', () => {
  const line = "Tally's 14:01 UTC read: SIREN 4, 54.9 of 100. The loudest thing on the AI wire right now is 'Agile to make 2,000 humanoid robots'.";
  const t = composeX({ kind: 'reading', title: line, level: { L: '4', S: '54.9' }, rand: () => 0.5, used: [] });
  assert.ok(t.includes(line.slice(0, 60)), t);
});

test('composer: every built-in line obeys the future-tense ban (VOICE.md §3.1)', async () => {
  const { findFutureViolation } = await import('../../collector/posts.mjs');
  const { XCOMPOSE_JS } = await import('../xcompose.mjs');
  const w = {};
  new Function('window', 'localStorage', 'document', XCOMPOSE_JS)(w, { getItem: () => '[]', setItem: () => {} }, undefined);
  const lines = [
    ...Object.values(w.sirenX.hooks).flat(), ...Object.values(w.sirenX.asks).flat(),
    ...w.sirenX.topics.flatMap((t) => [...t.hooks, ...t.ask]),
  ];
  for (const l of lines) assert.equal(findFutureViolation(l), null, l);
});
