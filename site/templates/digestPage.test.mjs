import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasDigest, render } from './digestPage.mjs';

const digest = JSON.parse(readFileSync(new URL('../../data/digest.json', import.meta.url), 'utf8'));
const state = JSON.parse(readFileSync(new URL('../../data/state.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state,
  digest,
  news: { items: state.news?.items || [], generated_at: state.generated_at },
};

describe('digest page', () => {
  it('gates on digest object', () => {
    assert.equal(hasDigest(ctx), true);
    assert.equal(hasDigest({}), false);
  });

  it('ships a question-shaped title, speakable Report, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What is the SIREN daily brief\?/);
    assert.match(html, /<h1 class="dg__h1">What is the SIREN daily brief\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Was any of this written by a model\?/);
    assert.match(html, /How are items selected for the brief\?/);
    assert.match(html, /Where are the selection rules published\?/);
    assert.match(html, /id="dg-brief-h">What is in today's brief\?/);
    assert.match(html, /id="dg-chg-h">What changed on the index\?<\/h2>/);
    assert.match(html, /id="dg-st-h">What streaks and records does the log show\?<\/h2>/);
    assert.match(html, /id="dg-lab-h">How did every frontier lab fare, last/);
    assert.match(html, /id="dg-how-h">How is this page computed\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*What is in today's brief\?/);
    assert.match(html, /FAQPage[\s\S]*What changed on the index\?/);
    assert.match(html, /FAQPage[\s\S]*How is this page computed\?/);
    assert.match(html, /<h3 class="dg__h3">What moved on the index\?<\/h3>/);
    assert.match(html, /<h3 class="dg__h3">Which sources changed state\?<\/h3>/);
    assert.match(html, /<h3 class="dg__h3">What does the leaderboard show\?<\/h3>/);
    assert.match(html, /<h3 class="dg__h3">What is the velocity baseline\?<\/h3>/);
    assert.match(html, /<h3 class="dg__h3">What are the three source states\?<\/h3>/);
    assert.match(html, /FAQPage[\s\S]*What moved on the index\?/);
    assert.match(html, /FAQPage[\s\S]*What are the three source states\?/);
    assert.doesNotMatch(html, /<h3 class="dg__h3">The index<\/h3>/);
    assert.doesNotMatch(html, /<h3 class="dg__h3">Sources<\/h3>/);
    assert.doesNotMatch(html, /<h3 class="dg__h3">The leaderboard<\/h3>/);
    assert.doesNotMatch(html, /<h3 class="dg__h3">Velocity<\/h3>/);
    assert.doesNotMatch(html, /<h3 class="dg__h3">The three source states<\/h3>/);
    assert.doesNotMatch(html, /id="dg-brief-h">The brief /);
    assert.doesNotMatch(html, /id="dg-chg-h">What changed<\/h2>/);
    assert.doesNotMatch(html, /id="dg-st-h">Streaks and records<\/h2>/);
    assert.doesNotMatch(html, /id="dg-how-h">How this page is computed<\/h2>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Report"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/news\.html/);
    const key = html.match(/<p class="dg__key">([\s\S]*?)<\/p>/);
    assert.ok(key, 'expected digest key paragraph');
    assert.match(key[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(key[1], /href="\/methodology\.html">the methodology<\/a>/);
    assert.match(html, /href="\/race\.html">Who is winning the AI race\?<\/a>/);
    assert.match(html, /Who is winning the AI race\? &rarr;|Who is winning the AI race\? →/);
    assert.doesNotMatch(html, /The full leaderboard/);
    assert.doesNotMatch(html, /href="\/race\.html">the leaderboard<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What is the SIREN daily brief\?/);
    assert.match(html, /noindex/);
  });

  it('per-lab H3s use questions mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /How did OpenAI fare in this window\?/);
    assert.match(html, /How did Anthropic fare in this window\?/);
    assert.match(html, /FAQPage[\s\S]*How did OpenAI fare in this window\?/);
    assert.doesNotMatch(html, /<h3 class="dg__labh">[^<]*OpenAI<\/h3>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('keeps the brief H2 clean and puts the headline before the meta row', () => {
    // Real news.json so the arrivals badge has something to count — the empty
    // stub on the shared ctx would leave the badge slot blank and hide the
    // "beside, not inside" layout under test.
    let news = ctx.news;
    try {
      news = JSON.parse(readFileSync(new URL('../../data/news.json', import.meta.url), 'utf8'));
    } catch {
      /* fixture optional when the clone has no news.json */
    }
    const html = render({ ...ctx, news });
    // Arrivals badge sits beside the H2, never inside it — so the jump index
    // and the section title stay the question a reader bookmarks.
    assert.match(html, /id="dg-brief-h">What is in today's brief\?<\/h2>/);
    // Badge must not live inside the H2 element (that was the TOC leak).
    assert.doesNotMatch(html, /id="dg-brief-h">[^<]*newbadge/);
    assert.doesNotMatch(html, /id="dg-brief-h"><[^>]*newbadge/);
    assert.match(html, /class="dg__briefhead"/);
    if (news && Array.isArray(news.items) && news.items.length) {
      assert.match(html, /class="dg__briefhead"[\s\S]*?class="newbadge"/);
    }
    const jump = html.match(/aria-label="On this page"[\s\S]*?<\/nav>/);
    assert.ok(jump, 'expected On this page jump nav');
    assert.match(jump[0], /href="#dg-brief-h">What is in today(?:'|&#39;)s brief\?<\/a>/);
    assert.doesNotMatch(jump[0], /arrived|first seen/i);
    // Title before meta: first brief item opens with rank + H3, not the clock.
    const first = html.match(/<li class="dg__item"[\s\S]*?<\/li>/);
    assert.ok(first, 'expected brief item markup');
    const titleAt = first[0].indexOf('class="dg__title"');
    const metaAt = first[0].indexOf('class="dg__meta"');
    assert.ok(titleAt >= 0 && metaAt >= 0 && titleAt < metaAt, 'headline must precede meta');
    assert.match(first[0], /class="dg__src"[^>]*title="/);
    assert.match(first[0], /class="dg__src"[^>]*>[a-z0-9-]+/);
  });
});
