import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './homeV2.mjs';

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

describe('home v2 footer', () => {
  it('keeps dual head terms in H1 .v2-sr beside the brand pixel (FINDABILITY #308)', () => {
    const html = render(ctx, { head: '' });
    assert.match(
      html,
      /<h1>[\s\S]*?<span class="v2-sr">AI activity index today · AI activity level today · AI SIREN INDEX<\/span>/,
    );
    // Pixel mark still draws the brand string (not the long head-term line).
    assert.match(html, /<h1>[\s\S]*?viewBox="0 0 71 7"/);
  });

  it('uses question-shaped legal and provenance sibling links', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/instruments\.html#oven">What instruments sit behind the SIREN reading\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/classic\.html#oven"/);
    assert.doesNotMatch(html, /href="\/instruments\.html#oven">full oven with gates →<\/a>/);
    assert.match(html, /href="\/history\.html">What is the history of AI risk\?<\/a>/);
    assert.match(html, /href="\/race\.html">Who is winning the AI race\?<\/a>/);
    assert.doesNotMatch(html, /href="\/history\.html">HISTORY<\/a>/);
    assert.doesNotMatch(html, /href="\/race\.html">MARKETS<\/a>/);
    assert.doesNotMatch(html, /href="\/race\.html">THE RACE →<\/a>/);
    assert.doesNotMatch(html, /href="\/moltbook\.html">AGENT WATCH →<\/a>/);
    assert.doesNotMatch(html, /href="\/changelog\.html">CHANGELOG →<\/a>/);
    assert.doesNotMatch(html, /href="\/moves\/"[^>]*>MOVES →<\/a>/);
    const feet = [...html.matchAll(/<p class="v2-foot">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    assert.ok(feet.length >= 2, 'expected home v2 foot paragraphs');
    const all = feet.join('\n');
    assert.match(all, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(all, /href="\/classic\.html#vfy">Where is the full SIREN instrument panel\?<\/a>/);
    assert.match(all, /href="\/classic\.html">Where is the full SIREN instrument panel\?<\/a>/);
    assert.match(all, /href="\/alerts\.html">How do I get alerts when SIREN moves\?<\/a>/);
    assert.doesNotMatch(all, /href="\/classic\.html#vfy">Verify a reading<\/a>/);
    assert.doesNotMatch(all, /href="\/classic\.html">Full instrument panel<\/a>/);
    assert.doesNotMatch(all, /href="\/feed\.xml">RSS<\/a>/);
    assert.match(all, /href="\/about\.html">What is SIREN\?<\/a>/);
    assert.match(all, /href="\/sponsor\.html">How do you sponsor SIREN without moving the number\?<\/a>/);
    assert.match(all, /href="\/terms\.html">What are the SIREN terms of use\?<\/a>/);
    assert.match(all, /href="\/privacy\.html">What does SIREN know about you\?<\/a>/);
    assert.match(all, /href="\/disclosures\.html">What does SIREN disclose\?<\/a>/);
    assert.match(all, /href="\/feedback\.html">How do I report a problem or send an idea to SIREN\?<\/a>/);
    assert.doesNotMatch(all, /href="\/about\.html">About<\/a>/);
    assert.doesNotMatch(all, /href="\/privacy\.html">Privacy<\/a>/);
    assert.doesNotMatch(all, /href="\/methodology\.html">How it works<\/a>/);
    assert.doesNotMatch(all, /href="\/terms\.html">terms &amp; disclaimers<\/a>/);
    assert.doesNotMatch(all, /href="\/disclosures\.html">Disclosures<\/a>/);
    assert.doesNotMatch(all, /href="\/sponsor\.html">Sponsor<\/a>/);
    assert.doesNotMatch(all, /doom score:\s*\d/i);
    assert.doesNotMatch(all, /probability of doom/i);
  });

  it('dash buttons and live news chip use alerts/export/news question H1s', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/alerts\.html">🔔 How do I get alerts when SIREN moves\?<\/a>/);
    assert.match(html, /href="\/export\.html">⤓ How do I export and embed SIREN data\?<\/a>/);
    assert.match(html, />Copy this reading<\/button>/);
    assert.match(html, /data-copy="SIREN 4, ROUTINE\./);
    assert.match(html, /href="\/news\.html"[^>]*>[\s\S]*?Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(html, /class="tag cool v2-top__x"[^>]*href="\/alerts\.html"[^>]*>How do I get alerts when SIREN moves\?<\/a>/);
    assert.doesNotMatch(html, /href="\/feed-level\.xml"[^>]*>ALERTS<\/a>/);
    assert.doesNotMatch(html, /href="\/alerts\.html">🔔 ALERTS<\/a>/);
    assert.doesNotMatch(html, /href="\/export\.html">⤓ DATA &amp; EMBED<\/a>/);
    assert.doesNotMatch(html, /NEWS &amp; ALERTS LIVE/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('ships a visible feeds strip with RSS and alerts destinations', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /id="feeds"[^>]*aria-labelledby="v2-feeds-h"/);
    assert.match(html, /id="v2-feeds-h"[^>]*>How do I subscribe to SIREN without an account\?<\/h2>/);
    assert.match(html, /href="\/feed\.xml"><b>Every index move<\/b><\/a>/);
    assert.match(html, /href="\/feed-level\.xml"><b>Level changes only<\/b><\/a>/);
    assert.match(html, /class="v2-feeds__list"[\s\S]*?href="\/alerts\.html"><b>How do I get alerts when SIREN moves\?<\/b><\/a>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });


  it('reuse embed helper links to the export question, not the noindex widget', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/export\.html#embed">How do I export and embed SIREN data\?<\/a>/);
    assert.doesNotMatch(html, /href="\/embed\.html">Open the widget<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('Tally CTA level-change subscribe uses the alerts question H1', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /id="tally"[\s\S]*?href="\/alerts\.html">How do I get alerts when SIREN moves\?<\/a>/);
    assert.doesNotMatch(html, /href="\/feed-level\.xml">level-change RSS<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('moltbook agents note links the agents question H1', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /class="[^"]*v2-molt[^"]*"[\s\S]*?href="\/agents\.html">How should AI agents use SIREN\?<\/a>/);
    assert.match(html, /href="\/skill\.md">skill\.md<\/a>/);
    assert.doesNotMatch(html, /AI agents: SIREN’s data is open at <a href="\/skill\.md">skill\.md<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('home video CTA uses the videos question H1', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/videos\.html">What free AI explainer videos does SIREN publish\?<\/a>/);
    assert.doesNotMatch(html, /NEW FILM: THE ROAD TO SUPERINTELLIGENCE/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('every-room card titles use destination question H1s', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/race\.html"[^>]*>[\s\S]*?<b>Who is winning the AI race\?<\/b>/);
    assert.match(html, /href="\/news\.html"[^>]*>[\s\S]*?<b>Which AI stories has SIREN scored in this window\?<\/b>/);
    assert.match(html, /href="\/contain\.html"[^>]*>[\s\S]*?<b>Can you stop an AI breakout\?<\/b>/);
    assert.match(html, /href="\/games\.html"[^>]*>[\s\S]*?<b>What free AI games can you play on SIREN\?<\/b>/);
    assert.match(html, /href="\/p-doom\.html"[^>]*>[\s\S]*?<b>What is p\(doom\)\?<\/b>/);
    assert.doesNotMatch(html, /v2-room__t"><b>THE RACE<\/b>/);
    assert.doesNotMatch(html, /v2-room__t"><b>NEWSROOM<\/b>/);
    assert.doesNotMatch(html, /v2-room__t"><b>Containment<\/b>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  // FINDABILITY #423 — home every-room grid must surface DoomBench conquest
  // (unbranded “AI doom index” SERP rival) beside PizzINT / Takeoff.
  it('every-room THE RECORD includes DoomBench conquest card (FINDABILITY #423)', () => {
    const html = render(ctx, { head: '' });
    assert.match(
      html,
      /href="\/vs\/doombench\.html"[^>]*>[\s\S]*?<b>SIREN vs DoomBench: which should you use\?<\/b>/,
    );
    assert.match(html, /Activity count vs Live AI Doom Index/);
  });

  // FINDABILITY #425 — Skynet Countdown conquest card (named in home FAQ; was
  // omitted while DoomBench / PizzINT / Takeoff rooms shipped).
  it('every-room THE RECORD includes Skynet Countdown conquest card (FINDABILITY #425)', () => {
    const html = render(ctx, { head: '' });
    assert.match(
      html,
      /href="\/vs\/skynet-countdown\.html"[^>]*>[\s\S]*?<b>SIREN vs Skynet Countdown: which should you use\?<\/b>/,
    );
    assert.match(html, /Activity count vs AGI timeline and control-loss odds/);
  });

  it('highlights the rooms readers stay in, on the score and the phone bar', () => {
    const html = render(ctx, { head: '' });
    const stay = html.match(/<nav class="v2-stay"[\s\S]*?<\/nav>/);
    assert.ok(stay, 'expected the stay strip');
    assert.match(stay[0], /Which rooms do readers stay in\?/);
    assert.match(stay[0], /READERS STAY HERE/);
    for (const path of ['/news.html', '/charts.html', '/waffle.html', '/day-after.html', '/dispatch.html']) {
      assert.match(stay[0], new RegExp(`href="${path.replace('.', '\\.')}"`));
    }
    const tab = html.match(/<nav class="v2-tab"[\s\S]*?<\/nav>/);
    assert.ok(tab, 'expected the phone bar');
    assert.match(tab[0], /href="\/news\.html"/);
    assert.match(tab[0], /href="\/charts\.html"/);
    assert.match(tab[0], /href="\/waffle\.html"/);
    assert.match(tab[0], /href="\/dispatch\.html"/);
    assert.doesNotMatch(tab[0], /href="\/race\.html"/);
    assert.doesNotMatch(tab[0], /href="\/monitor\.html"/);
    assert.match(html, /class="v2-room v2-room--stay" href="\/charts\.html"/);
    assert.match(html, /class="v2-room v2-room--stay" href="\/news\.html"/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('keeps the wire and the score path on story pages', () => {
    const html = render({
      ...ctx,
      news: {
        items: [
          { id: 'n1', title: 'Chip order', source: 'reuters', url: 'https://example.test/chip', published_at: '2026-10-14T14:00:00Z', score: 40 },
          { id: 'n2', title: 'Model card', source: 'openai', url: 'https://example.test/model', published_at: '2026-10-14T13:00:00Z', score: 90 },
        ],
        generated_at: '2026-10-14T15:00:00Z',
      },
    }, { head: '' });
    assert.match(html, /id="v2-next-h"[^>]*>Which scored stories sit on this reading\?<\/h2>/);
    assert.match(html, /href="\/item\/model-card-n2\.html">Model card<\/a><b>90\.0<\/b>/);
    assert.match(html, /class="v2-ticker"[\s\S]*href="\/item\/chip-order-n1\.html"/);
    assert.doesNotMatch(html, /class="v2-ticker"[\s\S]*href="https:\/\/example\.test\/chip"/);
    assert.match(html, /href="\/charts\.html">What AI charts does SIREN publish\?<\/a>/);
    assert.match(html, /href="\/alerts\.html">How do I get alerts when SIREN moves\?<\/a>/);
    assert.match(html, /"@type":"ItemList"/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('reuse, bosses, labs and video section H2s use questions', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /id="v2-share-h"[^>]*>How do you reuse this SIREN reading\?<\/h2>/);
    assert.match(html, /id="v2-bosses-h"[^>]*>Which AI bosses are on watch\?<\/h2>/);
    assert.match(html, /id="v2-labs-h"[^>]*>Which labs are monitored on the home board\?<\/h2>/);
    assert.match(html, /id="v2-video-h"[^>]*>What is SIREN\?<\/h2>/);
    assert.doesNotMatch(html, /id="v2-share-h">REUSE THIS READING/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('home card H3s use questions over pixel chrome', () => {
    const html = render({
      ...ctx,
      race: { players: [], markets: { polymarket: { ok: true, horizon: { title: 't', legs: [{ slug: 'x', title: 'Q', probability: 0.5, change_1d: 0 }] } } } },
      pmTop: [{ slug: 'y', question: 'Mover?', move: 0.1, volume: 1000 }],
      molt: {
        generated_at: '2026-10-14T15:00:00Z',
        posts: [{
          title: 'Agent post', url: 'https://example.com/p/1', agent: 'bot',
          agent_url: 'https://example.com/u/bot', upvotes: 3, comments: 1, created_at: '2026-10-14T14:00:00Z',
        }],
      },
    }, { head: '' });
    assert.match(html, /id="v2-trend-h"[^>]*>[\s\S]*What is the score trend\?/);
    assert.match(html, /id="v2-loud-h"[^>]*>[\s\S]*What pillars are loud right now\?/);
    assert.match(html, /id="v2-health-h"[^>]*>[\s\S]*How is source health right now\?/);
    assert.match(html, /id="v2-mkts-h"[^>]*>[\s\S]*Which AI prediction markets are live\?/);
    assert.match(html, /id="v2-molt-h"[^>]*>[\s\S]*What are AI agents saying\?/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('lab-card H3s use questions', () => {
    const html = render({
      ...ctx,
      race: {
        players: [
          { id: 'openai', name: 'OpenAI', rank: 1, principal: 'Sam Altman', market: { probability: 0.22, change_7d: 0.01 }, shipping: { github: { releases_30d: 3 } }, mindshare: { share: 0.2 } },
          { id: 'anthropic', name: 'Anthropic', rank: 2, principal: 'Dario Amodei', market: { probability: 0.18, change_7d: -0.02 }, shipping: { github: { releases_30d: 2 } }, mindshare: { share: 0.15 } },
        ],
        markets: {},
      },
    }, { head: '' });
    assert.match(html, /Who is OpenAI on the race board\?/);
    assert.match(html, /Who is Anthropic on the race board\?/);
    assert.doesNotMatch(html, /<h3>OPENAI<\/h3>/);
    assert.doesNotMatch(html, /<h3>ANTHROPIC<\/h3>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});


