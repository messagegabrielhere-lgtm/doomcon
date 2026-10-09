// node --test collector/test/race.test.mjs
//
// Offline: fixtures only. Importing race.mjs must not fire HTTP.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PLAYERS,
  ATOM_FEED_CAP,
  isMain,
  buildWhy,
  computeMindshare,
  readNegRiskEvent,
  posthavenPublishedStamps,
  releaseTimestamps,
  summarizeGithubBasket,
  summarizeHuggingFace,
  assertEntityVocabulary,
} from '../race.mjs';

const CLOCK = '2026-10-09T12:00:00.000Z';
const DAY = 86_400_000;
const ago = (days) => new Date(Date.parse(CLOCK) - days * DAY).toISOString();

test('isMain resolves relative argv paths', () => {
  const here = pathToFileURL(path.resolve('collector/race.mjs')).href;
  assert.equal(isMain(here, 'collector/race.mjs'), true);
  assert.equal(isMain(here, './collector/race.mjs'), true);
  assert.equal(isMain(here, 'collector/other.mjs'), false);
  assert.equal(isMain(here, ''), false);
  assert.equal(isMain(here, undefined), false);
});

test('assertEntityVocabulary still matches the published entity probes', () => {
  assert.doesNotThrow(() => assertEntityVocabulary());
});

test('releaseTimestamps scopes to <entry> and ignores feed-level <updated>', () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <updated>${CLOCK}</updated>
    <entry><title>a</title><updated>${ago(2)}</updated></entry>
    <entry><title>b</title><updated>${ago(5)}</updated></entry>
  </feed>`;
  const stamps = releaseTimestamps(xml, 'lab/repo');
  assert.equal(stamps.length, 2);
  assert.ok(stamps.every((t) => t < Date.parse(CLOCK)));
});

test('releaseTimestamps refuses an entry with no <updated>', () => {
  assert.throws(
    () => releaseTimestamps('<feed><entry><title>x</title></entry></feed>', 'lab/repo'),
    /no <updated>/,
  );
});

test('summarizeGithubBasket: is_floor is feed-cap only, not failed repos', () => {
  const player = { repos: ['a/one', 'a/two'] };
  const partial = summarizeGithubBasket(player, {
    per_repo: { 'a/one': 3 },
    failed: [{ repo: 'a/two', status: 404, error: 'not found' }],
    truncated: [],
  });
  assert.equal(partial.state, 'live');
  assert.equal(partial.releases_30d, 3);
  assert.equal(partial.is_floor, false);
  assert.equal(partial.incomplete, true);
  assert.equal(partial.repos_answered, 1);
  assert.equal(partial.repos_total, 2);

  const capped = summarizeGithubBasket(player, {
    per_repo: { 'a/one': ATOM_FEED_CAP },
    failed: [],
    truncated: ['a/one'],
  });
  assert.equal(capped.is_floor, true);
  assert.equal(capped.incomplete, false);
});

test('summarizeGithubBasket: all repos dark → dark, not a floor', () => {
  const row = summarizeGithubBasket({ repos: ['a/one'] }, {
    per_repo: {},
    failed: [{ repo: 'a/one', status: 503, error: 'upstream' }],
    truncated: [],
  });
  assert.equal(row.state, 'dark');
  assert.equal(row.releases_30d, null);
  assert.equal(row.is_floor, false);
  assert.equal(row.incomplete, true);
});

test('summarizeHuggingFace: empty answer is absent; no answer is dark', () => {
  const player = { hf_authors: ['anthropic'] };
  const absent = summarizeHuggingFace(player, {
    authors: { anthropic: { repos_returned: 0, models_30d: 0, newest_at: null, is_floor: false, sample: [] } },
    failed: [],
  });
  assert.equal(absent.state, 'absent');
  assert.equal(absent.models_30d, null);

  const dark = summarizeHuggingFace(player, { authors: {}, failed: [{ author: 'anthropic', status: 429, error: 'rate' }] });
  assert.equal(dark.state, 'dark');
  assert.equal(dark.incomplete, true);

  const live = summarizeHuggingFace(player, {
    authors: { anthropic: { repos_returned: 2, models_30d: 1, newest_at: CLOCK, is_floor: false, sample: [] } },
    failed: [],
  });
  assert.equal(live.state, 'live');
  assert.equal(live.models_30d, 1);
});

test('readNegRiskEvent drops inactive placeholder legs and unpriced legs', () => {
  const event = {
    markets: [
      {
        active: true,
        groupItemTitle: 'OpenAI',
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.42","0.58"]',
        volumeNum: 1000,
        oneDayPriceChange: 0.01,
      },
      {
        active: false,
        groupItemTitle: 'Company A',
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.5","0.5"]',
        volumeNum: 0,
      },
      {
        active: true,
        groupItemTitle: 'Other',
        outcomes: '["Yes","No"]',
        // no outcomePrices — pad legs
      },
    ],
  };
  const got = readNegRiskEvent(event);
  assert.equal(got.legs.length, 1);
  assert.equal(got.legs[0].title, 'OpenAI');
  assert.equal(got.legs[0].probability, 0.42);
  assert.equal(got.placeholder_legs, 1);
  assert.equal(got.unpriced_legs, 1);
});

test('posthavenPublishedStamps uses <published>, never <updated>', () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title>old</title><published>${ago(40)}</published><updated>${CLOCK}</updated></entry>
    <entry><title>new</title><published>${ago(3)}</published><updated>${CLOCK}</updated></entry>
  </feed>`;
  const stamps = posthavenPublishedStamps(xml, 'https://example.test/atom');
  assert.equal(stamps.length, 2);
  assert.ok(Math.max(...stamps) < Date.parse(CLOCK) - DAY);
});

test('posthavenPublishedStamps refuses to fall back to <updated>', () => {
  assert.throws(
    () => posthavenPublishedStamps(
      `<feed><entry><title>x</title><updated>${CLOCK}</updated></entry></feed>`,
      'https://example.test/atom',
    ),
    /no <published>/,
  );
});

test('computeMindshare splits on observed corpus midpoint, not nominal window', () => {
  const items = [];
  for (let i = 0; i < 30; i++) {
    items.push({
      entities: i < 20 ? ['OpenAI'] : [],
      published_at: ago(i * 0.05), // ~1.5 hours of span, not 7 days
    });
  }
  const out = computeMindshare({ generated_at: CLOCK, window_days: 7, max_items: 200, items });
  const openai = out.per_player.openai;
  assert.equal(openai.state, 'live');
  assert.ok(openai.share > 0);
  assert.ok(out.window.observed_span_hours < 7 * 24);
  assert.equal(out.window.nominal_window_days, 7);
  // 15 items per half < MINDSHARE_MIN_HALF_ITEMS (20) → null delta.
  assert.equal(openai.delta_state, 'halves_too_thin');
  assert.equal(openai.delta, null);
});

test('buildWhy precedence: 7d move beats mindshare and shipping', () => {
  const leader = {
    id: 'openai',
    name: 'OpenAI',
    principal: 'Sam Altman',
    market: { probability: 0.4, change_7d: 0.02, horizon_event: { title: 'Best AI 2026' } },
    mindshare: { share: 0.1, delta: 0.05, corpus: 200 },
    shipping: {
      github: { state: 'live', releases_30d: 5, is_floor: false },
      huggingface: { state: 'absent', models_30d: null },
      openrouter: { state: 'live', listed_30d: 1 },
    },
    loudness: { state: 'no_feed' },
    runnerUp: { id: 'anthropic', name: 'Anthropic', market: { probability: 0.3 } },
  };
  const { why, why_components } = buildWhy(leader, leader);
  assert.match(why, /Market leader/);
  assert.match(why, /\+2\.0 points over 7 days/);
  assert.ok(why_components.some((c) => /Named in/.test(c)));
  // Move won the headline: shipping text is in components but not the second sentence.
  assert.ok(why_components.some((c) => /GitHub release/.test(c)));
  assert.doesNotMatch(why, /GitHub release/);
});

test('buildWhy: no market is not a 0% chance', () => {
  const player = {
    id: 'anthropic',
    name: 'Anthropic',
    principal: 'Dario Amodei',
    market: { probability: null, change_7d: null, horizon_event: { title: 'Best AI 2026' } },
    mindshare: { share: null, delta: null },
    shipping: {
      github: { state: 'dark', releases_30d: null },
      huggingface: { state: 'dark', models_30d: null },
      openrouter: { state: 'dark', listed_30d: null },
    },
    loudness: { state: 'no_feed' },
  };
  const { why } = buildWhy(player, null);
  assert.match(why, /not offering this bet/);
  assert.match(why, /not the same as a 0% chance/);
});

test('roster stays frozen at eight players', () => {
  assert.equal(PLAYERS.length, 8);
  assert.deepEqual(PLAYERS.map((p) => p.id).sort(), [
    'anthropic', 'deepseek', 'google-deepmind', 'meta', 'mistral', 'openai', 'qwen', 'xai',
  ]);
});
