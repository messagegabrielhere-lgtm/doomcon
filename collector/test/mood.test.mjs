import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreHeadline, companiesIn, buildMood, RULE, COMPANIES,
} from '../mood.mjs';

test('scoreHeadline awards positive weight for unveil terms', () => {
  const s = scoreHeadline('OpenAI unveils new model');
  assert.equal(s.capped, RULE.POSITIVE_WEIGHT);
  assert.ok(s.positive.includes('unveils'));
});

test('scoreHeadline caps extreme headlines', () => {
  const s = scoreHeadline('raises raise raised raising unveil unveils breakthrough record surge soars wins wins wins');
  assert.ok(s.raw > RULE.HEADLINE_CAP);
  assert.equal(s.capped, RULE.HEADLINE_CAP);
});

test('companiesIn matches Google DeepMind and OpenAI without Meta-in-Metaculus', () => {
  assert.deepEqual(
    companiesIn('Google DeepMind and OpenAI raise funding').sort(),
    ['google', 'openai'],
  );
  assert.ok(!companiesIn('Metaculus updates AGI forecast').includes('meta'));
});

test('buildMood is deterministic and ranks OpenAI above Microsoft on the fixture', () => {
  const fixture = {
    generated_at: '2026-10-12T00:00:00.000Z',
    window_days: 7,
    items: [
      { id: 'a', title: 'OpenAI unveils new model', url: 'https://example.com/a', source: 'x', published_at: '2026-10-11T00:00:00.000Z' },
      { id: 'b', title: 'Microsoft risks AI rollout', url: 'https://example.com/b', source: 'y', published_at: '2026-10-10T00:00:00.000Z' },
      { id: 'c', title: 'Weather improves worldwide', url: 'https://example.com/c', source: 'z', published_at: '2026-10-09T00:00:00.000Z' },
    ],
  };
  const a = buildMood(fixture);
  const b = buildMood(fixture);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.totals.headlines_naming_a_company, 2);
  assert.equal(a.glance.leading.id, 'openai');
  assert.equal(a.companies.length, COMPANIES.length);
  assert.equal(a.companies.find((c) => c.id === 'apple').index, null);
});
