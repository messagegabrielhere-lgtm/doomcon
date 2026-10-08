import { test } from 'node:test';
import assert from 'node:assert/strict';
import polymarket, { AI_QUESTION, matchAiQuestion, AI_SLUG_ALLOW } from '../sources/polymarket.mjs';
import manifold from '../sources/manifold.mjs';

const yes = (q, ids) => assert.equal(matchAiQuestion(q, ids).match, true, `expected AI: ${q}`);
const no = (q, ids) => assert.equal(matchAiQuestion(q, ids).match, false, `expected NOT AI: ${q}`);

test('true positives the old regex already passed still pass', () => {
  for (const q of [
    'Will OpenAI release GPT-6 before 2027?',
    'AGI before 2030?',
    'Will Anthropic release Claude 5 in 2026?',
    'Google Gemini 3 Ultra released by December?',
    'Will the A.I. bubble pop in 2026?',
    'Which company has the best AI model end of October?',
    'Will DeepSeek release R2?',
    'Will Grok 5 top LMArena?',
    'Will ChatGPT reach 1B weekly users?',
    'Will artificial general intelligence be declared?',
  ]) {
    assert.ok(AI_QUESTION.test(q), `old regex sanity: ${q}`);
    yes(q);
  }
});

test('new true positives the old regex missed', () => {
  yes('Will xAI raise at a $300B valuation?');
  yes('Will Sam Altman remain CEO through 2026?');
  yes('Will a large language model win IMO gold?');
  yes('Will Meta release Llama 5 this year?');
  assert.equal(AI_QUESTION.test('Will xAI raise at a $300B valuation?'), false);
});

test('exclusions: ambiguous tokens in non-AI context', () => {
  no('Will Gemini (GEMI) stock close above $40?');
  no('Will the Gemini exchange list a new stablecoin?');
  no('Will Claude Giroux score 30 goals?');
  no('Will Jean-Claude Van Damme star in a new film?');
  no('Mistral wind gusts over 100km/h in Marseille?');
  no('Will Ai Weiwei hold an exhibition in Beijing?');
  no('Will Powell say "AI" during the press conference?');
  no('How many times will Trump say AI at the rally?');
});

test('weak tokens need a second signal', () => {
  no('Will Sora the cat win the show?');
  no('Will the copilot be named in the report?');
  yes('Will Copilot top the chatbot arena?');
});

test('allow-listed slugs pass regardless of wording', () => {
  const r = matchAiQuestion('IPO by October 31?', { eventSlug: 'anthropic-ipo-by' });
  assert.equal(r.match, true);
  assert.equal(r.via, 'allow');
  assert.ok(AI_SLUG_ALLOW.length > 5);
  no('IPO by October 31?', { eventSlug: 'stripe-ipo-by' });
});

test('result is auditable: hits and exclusions named', () => {
  const r = matchAiQuestion('Will Claude Giroux and Anthropic both make headlines?');
  assert.equal(r.match, true);
  assert.deepEqual(r.hits, ['anthropic']);
  assert.deepEqual(r.excluded, ['claude']);
});

// --- adapters wired through the new gate (units unchanged) -----------------

function polyMarket(question, slug, i, extra = {}) {
  return {
    question, slug, conditionId: `c${i}`, closed: false, active: true, acceptingOrders: true, negRisk: false,
    outcomes: '["Yes","No"]', outcomePrices: '["0.4","0.6"]', oneDayPriceChange: 0.01, volumeNum: 1000 + i, ...extra,
  };
}

test('polymarket: gate applied, allow-list counted, unit unchanged', async () => {
  const events = [];
  for (let i = 0; i < 22; i++) events.push({ slug: `openai-thing-${i}`, markets: [polyMarket(`Will OpenAI ship feature ${i}?`, `m-${i}`, i)] });
  events.push({ slug: 'anthropic-ipo-by', markets: [polyMarket('IPO by October 31?', 'anthropic-ipo-by-oct-31', 99)] });
  events.push({ slug: 'powell-says', markets: [polyMarket('Will Powell say "AI" during the press conference?', 'powell-ai', 98)] });
  events.push({ slug: 'gemi', markets: [polyMarket('Will Gemini (GEMI) stock close above $40?', 'gemi-40', 97)] });
  let first = true;
  const fetchJson = async () => { const body = { events: first ? events : [] }; first = false; return body; };
  const r = await polymarket.collect(fetchJson);
  assert.equal(r.unit, 'prob_points/day');
  assert.equal(r.meta.markets_in_basket, 23);
  assert.equal(r.meta.allow_listed, 1);
  assert.equal(r.meta.rejected.off_topic_excluded, 2);
  assert.equal(r.meta.rejected_off_topic, 2);
});

test('manifold: gate applied, unit unchanged', async () => {
  const rows = [];
  for (let i = 0; i < 21; i++) rows.push({ id: `id${i}`, question: `Will Anthropic do thing ${i}?`, slug: `s${i}`, isResolved: false, outcomeType: 'BINARY', token: 'MANA', probability: 0.5, volume24Hours: 10, volume: 100 });
  rows.push({ id: 'x', question: 'Will Claude Giroux retire?', slug: 'cg', isResolved: false, outcomeType: 'BINARY', token: 'MANA', probability: 0.5, volume24Hours: 1000, volume: 100 });
  let first = true;
  const fetchJson = async () => { const out = first ? rows : []; first = false; return out; };
  const r = await manifold.collect(fetchJson);
  assert.equal(r.unit, 'mana/24h');
  assert.equal(r.value, 210);
  assert.equal(r.meta.rejected.off_topic_excluded, 1);
});
