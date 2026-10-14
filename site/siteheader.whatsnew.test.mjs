import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WHATS_NEW, navJs } from './siteheader.mjs';
import { render } from './templates/homeV2.mjs';

/** Destination H1 questions for each What's New path (tip #257). */
const EXPECTED = {
  '/nations.html': 'USA vs China: who is winning the race to superintelligence?',
  '/labs.html': 'What is SIREN Labs measuring this week?',
  '/games.html': 'What free AI games can you play on SIREN?',
  '/evolution.html': 'How has AI activity moved day by day?',
  '/charts.html': 'What AI charts does SIREN publish?',
  '/power.html': 'Who makes the most electricity (China vs US)?',
  '/threats.html': 'What could take the machines offline tonight?',
  '/self-aware.html': 'What if an AI wakes up at 2:14 a.m.?',
  '/status.html': 'Is ChatGPT down? Is Claude down?',
  '/p-doom.html#voices': 'What is p(doom)?',
  '/waffle.html': 'Is the Waffle House open?',
  '/live.html': 'What AI is on TV and radio right now?',
  '/si-watch.html#coding': 'What AI autonomy signals is SIREN watching?',
  '/day-after.html': 'What happens the day after an AI catastrophe?',
  '/dispatch.html': 'What public feeds does SIREN Dispatch show?',
  '/leaders.html': 'Which AI leaders are on the record this week?',
};

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: {
    generated_at: '2026-10-14T15:00:00Z',
    score: 56.2,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    pillars: [],
  },
  news: { items: [], generated_at: '2026-10-14T15:00:00Z', total: 0, sources: [] },
  molt: {
    generated_at: '2026-10-14T15:00:00Z',
    posts: [{
      title: 'Agent post',
      url: 'https://example.com/p/1',
      agent: 'bot',
      agent_url: 'https://example.com/u/bot',
      upvotes: 3,
      comments: 1,
      created_at: '2026-10-14T14:00:00Z',
    }],
  },
};

describe('WHATS_NEW question H1s (tip #257)', () => {
  it('every What’s New label matches its destination H1 question', () => {
    assert.equal(WHATS_NEW.length, Object.keys(EXPECTED).length);
    for (const [href, , label] of WHATS_NEW) {
      assert.ok(EXPECTED[href], `unexpected What’s New path ${href}`);
      assert.equal(label, EXPECTED[href]);
      assert.match(label, /\?/);
    }
    assert.doesNotMatch(WHATS_NEW.map((r) => r[2]).join('\n'), /^USA vs China$/m);
    assert.doesNotMatch(WHATS_NEW.map((r) => r[2]).join('\n'), /^The Arcade$/m);
    assert.doesNotMatch(WHATS_NEW.map((r) => r[2]).join('\n'), /^Live alerts$/m);
    assert.doesNotMatch(WHATS_NEW.map((r) => r[2]).join('\n'), /doom score/i);
    assert.doesNotMatch(WHATS_NEW.map((r) => r[2]).join('\n'), /probability of doom/i);
  });

  it('home ✦ NEW strip and rooms dialog ship the question labels', () => {
    const html = render(ctx, { head: '' });
    const strip = html.match(/class="v2-whatsnew"[\s\S]*?<\/nav>/);
    assert.ok(strip, 'expected home What’s New strip');
    assert.match(strip[0], /href="\/nations\.html"[^>]*>[\s\S]*?USA vs China: who is winning the race to superintelligence\?<\/a>/);
    assert.match(strip[0], /href="\/games\.html"[^>]*>[\s\S]*?What free AI games can you play on SIREN\?<\/a>/);
    assert.doesNotMatch(strip[0], />USA vs China<\/a>/);
    assert.doesNotMatch(strip[0], />The Arcade<\/a>/);
    assert.doesNotMatch(strip[0], />SIREN Labs<\/a>/);

    const js = navJs([['/news.html', 'px:news', 'News', 'Stories', 'NEWS']], '');
    assert.match(js, /What free AI games can you play on SIREN\?/);
    assert.match(js, /Which AI leaders are on the record this week\?/);
    assert.doesNotMatch(js, /"The Arcade"/);
    assert.doesNotMatch(js, /"Leaders in the news"/);
    assert.doesNotMatch(js, /doom score/i);
  });
});
