import { test } from 'node:test';
import assert from 'node:assert/strict';
import wikipediaZh from '../sources/wikipedia-zh.mjs';

const ARTICLES = [
  '人工智能', '大型语言模型', '通用人工智能', 'OpenAI', 'ChatGPT',
  'Anthropic', '机器学习', 'Google_DeepMind', '生成式人工智能',
];

function stamp(day) {
  // Wikimedia hourly-zero stamp YYYYMMDD00
  return `${day.replace(/-/g, '')}00`;
}

function itemsFor(days) {
  return days.map((d) => ({ timestamp: stamp(d), views: 100 }));
}

test('wikipedia-zh: mean over shared 7-day window', async () => {
  const days = [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
  ];
  const byArticle = Object.fromEntries(ARTICLES.map((a) => [a, { items: itemsFor(days) }]));
  const fetchAll = async (reqs) => reqs.map((r) => ({
    key: r.key, ok: true, value: byArticle[r.key],
  }));
  const out = await wikipediaZh.collect(async () => { throw new Error('unused'); }, { fetchAll });
  assert.equal(out.unit, 'pageviews/day');
  assert.equal(out.value, 100);
  assert.equal(out.meta.project, 'zh.wikipedia');
  assert.equal(out.meta.window_days, 7);
  assert.equal(out.meta.window_to, '2026-10-08');
});

test('wikipedia-zh: missing article takes the source dark', async () => {
  const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
  const fetchAll = async (reqs) => reqs.map((r, i) => (
    i === 0
      ? { key: r.key, ok: false, error: new Error('404') }
      : { key: r.key, ok: true, value: { items: itemsFor(days) } }
  ));
  await assert.rejects(
    () => wikipediaZh.collect(async () => { throw new Error('unused'); }, { fetchAll }),
    /failed/
  );
});
