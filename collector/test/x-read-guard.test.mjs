import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASELINE_STATUS_TEXT, BLOCKED_X_MESSAGE_TYPES, indexReading, readingBlockReason, selfTest, xMessageBlock,
} from '../x-read-guard.mjs';
import {
  agentWatchCandidates, preparePulsePost, pulseCandidates, takeoverCandidates,
} from '../post-pulse.mjs';

test('guard self-check passes', () => {
  const failed = selfTest().filter((r) => !r.ok);
  assert.deepEqual(failed, []);
});

test('every blocked message type is named and refuses its own wording', () => {
  const samples = {
    degraded: 'SIREN is degraded as of 14:30 UTC.',
    'no-frozen-baseline': '1 of 5 pillars has no frozen baseline yet: markets.',
    imputed: 'The value was imputed from the previous hour.',
    error: 'The collector returned an error.',
    status: 'Skynet status at 14:30 UTC.',
    health: 'Source health is healthy.',
  };
  assert.deepEqual(BLOCKED_X_MESSAGE_TYPES.map((t) => t.id), Object.keys(samples));
  for (const type of BLOCKED_X_MESSAGE_TYPES) {
    const why = xMessageBlock(samples[type.id]);
    assert.match(why, new RegExp(type.label));
  }
  assert.match(xMessageBlock(BASELINE_STATUS_TEXT, 'degraded'), /degraded index notice/);
  assert.match(xMessageBlock(BASELINE_STATUS_TEXT, 'degraded'), /missing or no frozen baseline/);
  assert.match(xMessageBlock(BASELINE_STATUS_TEXT, 'degraded'), /imputed values/);
});

test('pulse, agent-watch and takeover skip when the reading is not a real number', () => {
  const text = 'SIREN 4, 49.3 of 100, as of 14:30 UTC.';
  const cases = [
    [indexReading({ degraded: true }), /index is degraded/],
    [indexReading({
      dark_pillars: ['governance'],
      pillars: indexReading().pillars.map((p) => (p.id === 'governance' ? { ...p, dark: true, score: null } : p)),
    }), /pillar governance is missing/],
    [indexReading({
      uncalibrated_pillars: ['markets'],
      pillars: indexReading().pillars.map((p) => (p.id === 'markets' ? { ...p, uncalibrated: true, score: null } : p)),
    }), /pillar markets has no frozen baseline/],
    [indexReading({
      pillars: indexReading().pillars.map((p) => (p.id === 'markets' ? { ...p, imputed: true } : p)),
    }), /pillar markets is imputed/],
    [indexReading({ score: null }), /the reading has no real number/],
  ];
  for (const kind of ['pulse', 'agent-watch', 'takeover']) {
    for (const [state, pattern] of cases) {
      const decided = preparePulsePost({
        state, ledger: [], candidates: [{ text, story: `${kind}:ok` }],
      });
      assert.equal(decided.post, null, kind);
      assert.match(decided.why, pattern, `${kind}: ${decided.why}`);
    }
  }
});

test('a real reading may post, and status wording in any of the three jobs is withheld', () => {
  const state = indexReading();
  assert.equal(readingBlockReason(state), null);

  const news = {
    items: [{ id: 'n1', title: 'A lab shipped a model', published_at: '2026-10-13T14:00:00.000Z', score: 10, source: 'wire', kind: 'news' }],
    sources: [{ id: 'wire', label: 'Wire' }],
  };
  const pulse = preparePulsePost({
    state, ledger: [], candidates: pulseCandidates(state, news, Date.parse('2026-10-13T14:30:00.000Z')),
  });
  assert.ok(pulse.post, pulse.why);
  assert.equal(xMessageBlock(pulse.post.text), null);
  assert.ok(pulse.withheld.some((w) => /status wording/.test(w)));

  const statusWatch = agentWatchCandidates(state, {
    watch: { themes: [{ name: 'Tools', n: 2 }] },
    fresh: [{ id: 'm1', title: 'status update from the swarm', agent: 'bot', comments: 40 }],
    posts: [],
  });
  const blockedWatch = preparePulsePost({ state, ledger: [], candidates: statusWatch });
  assert.equal(blockedWatch.post, null);
  assert.match(blockedWatch.why, /status wording/);

  const cleanWatch = agentWatchCandidates(state, {
    watch: { themes: [{ name: 'Tools', n: 2 }] },
    fresh: [{ id: 'm2', title: 'A thread about tools', agent: 'bot', comments: 40 }],
    posts: [],
  });
  const postedWatch = preparePulsePost({ state, ledger: [], candidates: cleanWatch });
  assert.ok(postedWatch.post);
  assert.equal(xMessageBlock(postedWatch.post.text), null);

  const cleanTakeover = takeoverCandidates(state, {
    generated_at: state.generated_at,
    agent_prs: { total_24h: 12, by_agent: [{ name: 'codex', prs_24h: 9 }] },
    frontier: { models_90d: 4, newest: [{ model: 'Example', org: 'Lab' }] },
    moltbook: { agents_seen: 3, replies_seen: 10 },
  });
  assert.ok(cleanTakeover.length >= 3);
  for (const c of cleanTakeover) assert.equal(xMessageBlock(c.text), null, c.text);
  assert.ok(preparePulsePost({ state, ledger: [], candidates: cleanTakeover }).post);

  const errorTakeover = takeoverCandidates(state, {
    generated_at: state.generated_at,
    frontier: { models_90d: 2, newest: [{ model: 'a reported error', org: 'Lab' }] },
  });
  const blockedTakeover = preparePulsePost({ state, ledger: [], candidates: errorTakeover });
  assert.equal(blockedTakeover.post, null);
  assert.match(blockedTakeover.why, /errors/);
});
