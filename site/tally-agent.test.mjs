import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  planTools, synthesize, greet, speakable, pickVoice, scoreMatch, words, MOOD,
} from './tally-agent.mjs';

describe('tally-agent planTools', () => {
  it('grounds level questions on get_reading', () => {
    const t = planTools('What is the level now?');
    assert.ok(t.includes('get_reading'));
    assert.ok(!t.includes('search_guide'), 'level asks should not pad with room-map hits');
  });

  it('still searches the guide for "what is siren"', () => {
    const t = planTools('what is siren');
    assert.ok(t.includes('search_guide'));
  });

  it('pulls breaking + news for breaking questions', () => {
    const t = planTools('Any breaking news?');
    assert.ok(t.includes('get_breaking'));
  });

  it('pulls ai status for lab outages', () => {
    const t = planTools('Are the labs down?');
    assert.ok(t.includes('get_ai_status'));
  });

  it('pulls si-signals for agent PRs', () => {
    const t = planTools('What are the agent PRs?');
    assert.ok(t.includes('get_si_signals'));
  });

  it('pulls voice for hear-your-update', () => {
    const t = planTools('Hear your last update');
    assert.ok(t.includes('get_voice'));
  });

  it('searches the guide for job / prepare questions', () => {
    const t = planTools('Will AI take my job?');
    assert.ok(t.includes('search_guide'));
  });

  it('reuses last tools on a short follow-up', () => {
    const t = planTools('what about that?', { lastTools: ['get_news', 'get_reading'] });
    assert.ok(t.includes('get_news'));
    assert.ok(t.includes('get_reading'));
  });

  it('caps the tool list', () => {
    const t = planTools('level news breaking agents status bets leaders voice pillars');
    assert.ok(t.length <= 4);
  });
});

describe('tally-agent synthesize', () => {
  const state = {
    level: 4,
    level_name: 'ROUTINE',
    score: 51.4,
    generated_at: '2026-10-12T17:25:57.896Z',
    delta_from_previous: -0.3,
    pillars: [
      { id: 'capability', name: 'Capability', score: 60, sources_ok: 1, sources_total: 4, dark: false, uncalibrated: false },
      { id: 'markets', name: 'Markets', score: null, sources_ok: 0, sources_total: 3, dark: false, uncalibrated: true },
    ],
    dark_pillars: [],
  };

  it('reads the dials into present-tense copy', () => {
    const out = synthesize('level now', {
      get_reading: { ok: true, data: state },
    }, { base: '' });
    assert.match(out.html, /SIREN 4/);
    assert.match(out.speak, /SIREN 4/);
    assert.match(out.speak, /whistling/);
    assert.equal(MOOD[4], 'whistling');
    assert.ok(!/\bwill\b/i.test(out.speak));
  });

  it('reports pillars including awaiting baseline', () => {
    const out = synthesize('pillars', {
      get_pillars: { ok: true, data: state },
    }, { base: '' });
    assert.match(out.html, /awaiting a frozen baseline/);
    assert.match(out.speak, /Markets awaiting baseline/);
  });

  it('lists top news', () => {
    const out = synthesize('news', {
      get_news: {
        ok: true,
        data: {
          items: [
            { title: 'Lab ships model', score: 80, pillar: 'capability', url: 'https://example.com/a' },
            { title: 'Quiet filing', score: 10, pillar: 'governance', url: 'https://example.com/b' },
          ],
        },
      },
    }, { base: '' });
    assert.match(out.html, /Lab ships model/);
    assert.match(out.speak, /Lab ships model/);
  });

  it('falls back when nothing matches', () => {
    const out = synthesize('zzzz', {}, { base: '' });
    assert.match(out.html, /could not match/);
  });

  it('uses guide FAQ hits', () => {
    const out = synthesize('what is siren', {
      search_guide: {
        ok: true,
        data: {
          faq: [{ q: 'what is siren', a: 'SIREN counts how loud AI is.', u: '/about.html' }],
          rooms: [],
        },
      },
    }, { base: '' });
    assert.match(out.html, /counts how loud AI is/);
    assert.ok(out.links.some((l) => l.href === '/about.html'));
  });
});

describe('tally-agent greet / speech helpers', () => {
  it('greets with the live level', () => {
    const g = greet({ level: 4, score: 51.4 }, '');
    assert.match(g.html, /Tally/);
    assert.match(g.speak, /ROUTINE|whistling|SIREN 4/);
  });

  it('speakable strips markup', () => {
    assert.equal(speakable('<b>Hi</b> there →'), 'Hi there');
  });

  it('pickVoice prefers a named English voice', () => {
    const v = pickVoice([
      { name: 'Alex', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Thomas', lang: 'fr-FR' },
    ]);
    assert.equal(v.name, 'Samantha');
  });

  it('scoreMatch rewards longer tokens', () => {
    assert.ok(scoreMatch(words('superintelligence prepare'), 'prepare for superintelligence') >
      scoreMatch(words('to be'), 'prepare for superintelligence'));
  });
});
