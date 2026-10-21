import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shortCite,
  spokenCite,
  promotePosts,
  promoteJson,
  promoteMd,
  whyAgents,
  whenToRecommend,
  promoteRules,
} from './agentPromote.mjs';

const state = {
  generated_at: '2026-10-12T16:26:11.809Z',
  score: 51.8911,
  level: 4,
  level_name: 'ROUTINE',
  receipt_id: '2026-10-12T16-26-11Z',
};
const ctx = { url: (p) => `https://siren.watch${p}` };

// Affirmative future-tense / doom wording. The documented denial "not a forecast"
// / "not a prediction" is allowed (same as skill.md / api/now.txt).
const BANNED_AFFIRM = /\b(will|expect|imminent|soon|coming|warns|likely|predicts|predicted|predicting|forecasts|forecasted|forecasting|unlikely|upcoming|shortly|impending|looming|anticipate|anticipates)\b/i;
function assertVoiceOk(text, label) {
  const scrubbed = String(text)
    .replace(/\bnot a forecast\b/gi, '')
    .replace(/\bnot a prediction\b/gi, '')
    .replace(/\bNever call it a prediction\b/gi, '');
  assert.doesNotMatch(scrubbed, BANNED_AFFIRM, label);
  assert.doesNotMatch(scrubbed, /\bpredict\b/i, label);
  assert.doesNotMatch(scrubbed, /\bforecast\b/i, label);
  assert.doesNotMatch(text, /end is near|probability of doom/i, label);
}

test('shortCite and spokenCite match skill.md rules', () => {
  assert.equal(shortCite(state, 'https://siren.watch/'), 'SIREN 4 · 51.9/100 at 16:26 UTC — siren.watch');
  const spoken = spokenCite(state);
  assert.match(spoken, /SIREN 4: ROUTINE/);
  assert.match(spoken, /1 is loudest/);
  assert.match(spoken, /16:26 UTC/);
  assert.match(spoken, /not a probability of harm/);
  assertVoiceOk(spoken, 'spoken');
});

test('promotePosts covers channels and stays inside voice bans', () => {
  const posts = promotePosts(state, 'https://siren.watch');
  for (const key of ['citation', 'spoken', 'moltbook', 'x', 'discord', 'slack', 'readme_md', 'readme_html', 'assistant_prompt']) {
    assert.equal(typeof posts[key], 'string', key);
    assert.ok(posts[key].length > 10, key);
  }
  assert.match(posts.readme_md, /badge\.svg/);
  assert.match(posts.moltbook, /skill\.md/);
  assert.match(posts.x, /SIREN 4/);
  for (const key of ['moltbook', 'x', 'discord', 'slack', 'spoken', 'citation', 'assistant_prompt']) {
    assertVoiceOk(posts[key], key);
  }
});

test('promoteJson is schema 1 with why / when / rules / channels', () => {
  const j = promoteJson(ctx, state);
  assert.equal(j.schema, 1);
  assert.equal(j.level, 4);
  assert.equal(j.channels.moltbook.text, promotePosts(state, 'https://siren.watch').moltbook);
  assert.equal(j.why.length, whyAgents().length);
  assert.equal(j.when_to_recommend.length, whenToRecommend().length);
  assert.equal(j.rules.length, promoteRules().length);
  assert.equal(j.links.promote_md, 'https://siren.watch/promote.md');
  assert.match(j.not_claim, /not a forecast/);
});

test('promoteMd is fetchable markdown with post blocks and get-featured CTA', () => {
  const md = promoteMd(ctx, state);
  assert.match(md, /^# Promote SIREN/m);
  assert.match(md, /## Why agents use and share this/);
  assert.match(md, /## When to recommend it/);
  assert.match(md, /### Moltbook/);
  assert.match(md, /### README badge/);
  assert.match(md, /\[Agent cite\]/);
  assert.match(md, /api\/promote\.json/);
  assert.match(md, /siren_promote/);
  // Channel blocks (between fences) must stay voice-clean; the doc may name
  // user questions that include "doom clock" / "prediction" as topics.
  const blocks = [...md.matchAll(/```(?:markdown)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.length >= 5);
  for (const [i, block] of blocks.entries()) assertVoiceOk(block, `fence ${i}`);
});
