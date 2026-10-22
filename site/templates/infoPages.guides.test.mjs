import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GUIDES, aiClock, guides, guidesMd, pdoom } from './infoPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-10T14:00:00Z',
    score: 55.5,
    level: 4,
    level_name: 'ROUTINE',
  },
};

describe('guides hub', () => {
  it('lists evergreen explainers with matching question H1 and FAQ schema', () => {
    assert.ok(GUIDES.length >= 7);
    assert.ok(GUIDES.some((g) => g.path === '/p-doom.html'));
    assert.ok(GUIDES.some((g) => g.path === '/ai-doomsday-clock.html'));
    assert.ok(GUIDES.some((g) => g.path === '/vs.html'));
    assert.ok(GUIDES.some((g) => g.path === '/history.html'));
    const html = guides(ctx);
    assert.match(html, /<title>What are the AI explainers\? p\(doom\), clocks, doom indexes/);
    assert.match(html, /<h1 class="bp__h1">What are the AI explainers\?<\/h1>/);
    assert.doesNotMatch(html, /What are the AI explainers — and what each number measures/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Where are the AI doom and p\(doom\) explainers\?/);
    assert.match(html, /Does SIREN publish a doom probability\?/);
    assert.match(html, /\/guides\.html/);
    assert.match(html, /ItemList/);
    assert.match(html, /FAQPage/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/p-doom\.html/);
    assert.match(html, /\/ai-doomsday-clock\.html/);
    assert.match(html, /\/history\.html/);
    assert.match(html, /\/compare\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /How does SIREN compare to DEFCON/);
    assert.match(html, /How the SIREN AI activity index is computed/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI indexes does SIREN contrast\?/);
    assert.match(html, /What are AI doom index alternatives\?/);
    assert.match(html, /eyebrow"><a href="\/guide\.html">How does SIREN compare to DEFCON/);
    assert.doesNotMatch(html, /eyebrow">Guides<\/p>/);
    assert.doesNotMatch(html, />AI doom indexes compared</);
    assert.doesNotMatch(html, />SIREN vs other AI indexes</);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom is \d/i);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /guides\.md/);
    assert.match(html, /rel="alternate"[^>]*guides\.md/);
    // FINDABILITY #457 — dual middot head terms on guides hub live link.
    assert.match(html, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    assert.match(html, /href="\/guides\.md">What are the AI explainers\?<\/a>/);
    assert.doesNotMatch(html, /href="\/guides\.md">Markdown mirror →<\/a>/);
    assert.doesNotMatch(html, /href="\/">Live reading →<\/a>/);
  });

  it('ships a markdown mirror for agents', () => {
    const md = guidesMd(ctx);
    assert.match(md, /^# What are the AI explainers\?/m);
    assert.match(md, /\/guides\.html/);
    assert.match(md, /\/p-doom\.html/);
    assert.match(md, /\/ai-doomsday-clock\.html/);
    // FINDABILITY #457 — dual middot head terms on guides.md live link.
    assert.match(md, /AI activity index today · AI activity level today · SIREN/);
    assert.match(md, /^## What else sits next to these AI explainers\?/m);
    assert.doesNotMatch(md, /^## Also$/m);
    assert.doesNotMatch(md, /\[Live reading\]/);
    assert.doesNotMatch(md, /^# AI explainers —/m);
    assert.doesNotMatch(md, /doom score:\s*\d/i);
  });

  it('guides section H2s use questions mirrored in FAQPage', () => {
    const html = guides(ctx);
    assert.match(html, /<h2>What else sits next to these AI explainers\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>Also<\/h2>/);
    assert.match(html, /"name"\s*:\s*"What else sits next to these AI explainers\?"/);
    assert.match(html, /the both-sides library/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });

  it('ai-doomsday-clock ships matching question H1 and visible FAQ', () => {
    const html = aiClock(ctx);
    // FINDABILITY #455 — dual middot head terms on shared nowLine.
    assert.match(html, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    assert.doesNotMatch(html, /href="\/">See the live reading →<\/a>/);
    assert.match(html, /<title>Is there an AI doomsday clock\? Bulletin vs verifiable count/);
    assert.match(html, /<h1 class="bp__h1">Is there an AI doomsday clock\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /How close is the AI doomsday clock to midnight\?/);
    assert.match(html, /Who sets the AI doomsday clock\?/);
    assert.match(html, /Is SIREN a doomsday clock or a doom probability\?/);
    assert.match(html, /Bulletin of the Atomic Scientists/);
    assert.match(html, /"@type"\s*:\s*"WebPage"/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/guide\.html/);
    assert.match(html, /\/p-doom\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /How does SIREN compare to DEFCON/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /measures activity tempo/);
    assert.doesNotMatch(html, /The side-by-side comparison/);
    assert.doesNotMatch(html, /How the index is computed →/);
    assert.doesNotMatch(html, /<h1 class="bp__h1">The AI Doomsday Clock: is there one\?<\/h1>/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
    assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('ai-doomsday-clock section H2s use questions mirrored in FAQPage', () => {
    const html = aiClock(ctx);
    assert.match(html, /<h2>What is the Bulletin.s Doomsday Clock\?<\/h2>/);
    assert.match(html, /<h2>Where does expert opinion sit on an AI clock\?<\/h2>/);
    assert.match(html, /<h2>What are AI-specific clocks and scores\?<\/h2>/);
    assert.match(html, /<h2>What does SIREN do instead of a doomsday clock\?<\/h2>/);
    assert.match(html, /<h2>Which clock should you use\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>The Doomsday Clock<\/h2>/);
    assert.doesNotMatch(html, /<h2>The experts. clock: where opinion sits<\/h2>/);
    assert.doesNotMatch(html, /<h2>AI-specific clocks and scores<\/h2>/);
    assert.doesNotMatch(html, /<h2>What SIREN does instead<\/h2>/);
    assert.doesNotMatch(html, /<h2>Which should you use\?<\/h2>/);
    assert.match(html, /"name"\s*:\s*"What is the Bulletin.s Doomsday Clock\?"/);
    assert.match(html, /"name"\s*:\s*"What does SIREN do instead of a doomsday clock\?"/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });

  it('p-doom ships matching question H1 and visible FAQ', () => {
    const html = pdoom(ctx);
    // FINDABILITY #455 — dual middot head terms on shared nowLine.
    assert.match(html, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    assert.doesNotMatch(html, /href="\/">See the live reading →<\/a>/);
    assert.match(html, /<title>What is p\(doom\)\? Hinton, Amodei, Musk, LeCun/);
    assert.match(html, /<h1 class="bp__h1">What is p\(doom\)\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Why do p\(doom\) estimates differ so much\?/);
    assert.match(html, /Does SIREN publish a p\(doom\) or a doom probability\?/);
    assert.match(html, /What is Geoffrey Hinton/);
    assert.match(html, /What do AI researchers think the chance of AI doom is\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /"@type"\s*:\s*"WebPage"/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/guide\.html/);
    assert.match(html, /\/ai-doomsday-clock\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /How does SIREN compare to DEFCON/);
    assert.match(html, /measures activity tempo/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
    assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('p-doom section H2s use questions mirrored in FAQPage', () => {
    const html = pdoom(ctx);
    assert.match(html, /<h2>Where does the term p\(doom\) come from\?<\/h2>/);
    assert.match(html, /<h2>Why do p\(doom\) estimates differ so much\?<\/h2>/);
    assert.match(html, /<h2>What can p\(doom\) not tell you\?<\/h2>/);
    assert.match(html, /<h2>How is SIREN different from p\(doom\)\?<\/h2>/);
    assert.match(html, /<h2>What else should you read about p\(doom\)\?<\/h2>/);
    assert.match(html, /id="vx-h">Where do 28 named p\(doom\) estimates sit on one ladder\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>Where the term comes from<\/h2>/);
    assert.doesNotMatch(html, /<h2>Why the numbers differ so much<\/h2>/);
    assert.doesNotMatch(html, /<h2>What p\(doom\) cannot tell you<\/h2>/);
    assert.doesNotMatch(html, /<h2>How SIREN is different<\/h2>/);
    assert.doesNotMatch(html, /<h2>Read more<\/h2>/);
    assert.doesNotMatch(html, /id="vx-h">The voices: 28 named estimates, one ladder<\/h2>/);
    assert.match(html, /"name"\s*:\s*"Where does the term p\(doom\) come from\?"/);
    assert.match(html, /"name"\s*:\s*"How is SIREN different from p\(doom\)\?"/);
    assert.match(html, /"name"\s*:\s*"Where do 28 named p\(doom\) estimates sit on one ladder\?"/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });

  it('p-doom voices section H3s use questions mirrored in FAQPage', () => {
    const html = pdoom(ctx);
    assert.match(html, /<h3>What is in the news about AI catastrophe, safety, and p\(doom\)\?<\/h3>/);
    assert.match(html, /<h3>Which polls and surveys report p\(doom\)\?<\/h3>/);
    assert.match(html, /<h3>What further reading covers every side\?<\/h3>/);
    assert.match(html, /"name"\s*:\s*"What is in the news about AI catastrophe, safety, and p\(doom\)\?"/);
    assert.match(html, /"name"\s*:\s*"Which polls and surveys report p\(doom\)\?"/);
    assert.doesNotMatch(html, /<h3>IN THE NEWS: AI CATASTROPHE/);
    assert.doesNotMatch(html, /<h3>POLLS &amp; SURVEYS<\/h3>/);
    assert.doesNotMatch(html, /<h3>FURTHER READING, EVERY SIDE<\/h3>/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });

  it('p-doom voices sibling links use news/live/day-after/library question H1s', () => {
    const html = pdoom(ctx);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\? →<\/a>/);
    assert.match(html, /href="\/live\.html">What AI is on TV and radio right now\? →<\/a>/);
    assert.match(html, /href="\/day-after\.html">What happens the day after an AI catastrophe\? →<\/a>/);
    assert.match(html, /href="\/library\.html">What AI books argue both sides of the case\? →<\/a>/);
    assert.doesNotMatch(html, /href="news\.html">All AI news →<\/a>/);
    assert.doesNotMatch(html, /href="live\.html">Watch: AI on TV/);
    assert.doesNotMatch(html, /href="day-after\.html">Game out the day after →<\/a>/);
    assert.doesNotMatch(html, /href="library\.html">SIREN’s library: books from every side →<\/a>/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });
});

describe('AI doomsday clock: which clocks exist today', () => {
  it('names the clocks people search for, in a table and in FAQ schema', () => {
    const html = aiClock(ctx);
    assert.match(html, /<h2 id="today">Is there an AI doomsday clock today\?<\/h2>/);
    for (const name of ['Bulletin Doomsday Clock', 'IMD AI Safety Clock', 'aidoomsday.live', 'AI Fear &amp; Trust Index']) {
      assert.ok(html.includes(name), name);
    }
    assert.match(html, /href="\/vs\/imd-ai-safety-clock\.html"/);
    assert.match(html, /SIREN 4, 55\.5 of 100/);
    assert.match(html, /"name":\s*"Is there an AI doomsday clock today\?"/);
  });
});
