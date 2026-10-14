import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './index.mjs';

const state = JSON.parse(readFileSync(new URL('../../data/state.json', import.meta.url), 'utf8'));
const news = JSON.parse(readFileSync(new URL('../../data/news.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { balance: false, instruments: true },
  state,
  news,
  history: [],
  moves: [],
  seriesFor: () => [],
};

describe('classic page', () => {
  it('ships a question-shaped title, own canonical, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx, { view: 'classic' });
    assert.match(html, /<title>Where is the full SIREN instrument panel\?/);
    assert.match(html, /<h1 class="bp__h1">Where is the full SIREN instrument panel\?<\/h1>/);
    assert.match(html, /rel="canonical" href="https:\/\/siren\.watch\/classic\.html"/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /How is this different from the home page\?/);
    assert.match(html, /Where do I check the working behind the number\?/);
    assert.match(html, /What does the reading look like as a clock\?/);
    assert.match(html, /What does SIREN Arena show today\?/);
    assert.match(html, /How do I hear when SIREN moves first\?/);
    assert.match(html, /How does SIREN stay free without a paywall\?/);
    assert.match(html, /Is the classic panel a doom probability\?/);
    assert.match(html, /id="inst-h">Where do I check the working behind the number\?<\/h2>/);
    assert.match(html, /id="xp-h">What does the reading look like as a clock\?<\/h2>/);
    assert.match(html, /id="mkb-h">What does SIREN Arena show today\?/);
    assert.match(html, /id="fol-h">How do I hear when SIREN moves first\?<\/h2>/);
    assert.match(html, /id="support-h">How does SIREN stay free without a paywall\?<\/h2>/);
    assert.doesNotMatch(html, /id="inst-h">Check the working<\/h2>/);
    assert.doesNotMatch(html, /id="xp-h">The reading, as a clock<\/h2>/);
    assert.doesNotMatch(html, /id="support-h">Keep the count running<\/h2>/);
    assert.doesNotMatch(html, /id="fol-h">Hear it first:/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/instruments\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /What instruments sit behind the SIREN reading\?/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /measures activity tempo/);
    // Live verdict demoted so the panel question owns the single H1.
    assert.match(html, /<h2 class="ans__a"/);
    assert.doesNotMatch(html, /rel="canonical" href="https:\/\/siren\.watch\/"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('keeps the homepage head on path / with the live title', () => {
    const html = render(ctx);
    assert.match(html, /<title>AI activity index today · SIREN/);
    assert.match(html, /rel="canonical" href="https:\/\/siren\.watch\/"/);
    assert.doesNotMatch(html, /Where is the full SIREN instrument panel\?/);
  });

  it('support earn cards and verify methodology link use question H1s', () => {
    const html = render(ctx, { view: 'classic' });
    const earn = html.match(/<div class="earn">([\s\S]*?)<\/div>/);
    assert.ok(earn, 'expected support earn cards');
    assert.match(earn[1], /href="\/library\.html"><b>What AI books argue both sides of the case\?<\/b>/);
    assert.match(earn[1], /href="\/bunker-kit\.html"><b>What free tools belong in a bunker kit\?<\/b>/);
    assert.match(earn[1], /href="\/sponsor\.html"><b>How do you sponsor SIREN without moving the number\?<\/b>/);
    assert.doesNotMatch(earn[1], /<b>The reading list<\/b>/);
    assert.doesNotMatch(earn[1], /<b>The Bunker Kit<\/b>/);
    assert.doesNotMatch(earn[1], /<b>Sponsor the index<\/b>/);
    const vfy = html.match(/id="vfy"[\s\S]*?<p class="fresh__key">([\s\S]*?)<\/p>/);
    assert.ok(vfy, 'expected verify key paragraph');
    assert.match(vfy[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(vfy[1], /href="\/methodology\.html">method<\/a>/);
  });

  it('instruments record and FAQ methodology links use the question H1', () => {
    const html = render(ctx, { view: 'instruments' });
    const record = html.match(/id="record"[\s\S]*?<\/section>/);
    assert.ok(record, 'expected instruments record section');
    assert.match(record[0], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology →<\/a>/);
    assert.doesNotMatch(record[0], /href="\/methodology\.html">methodology page →<\/a>/);
    assert.match(record[0], /href="\/history\.html">What is the history of AI risk\? →<\/a>/);
    assert.doesNotMatch(record[0], /href="\/history\.html">Full history and every observation →<\/a>/);
    const faq = html.match(/class="inst__faq-key">([\s\S]*?)<\/p>/);
    assert.ok(faq, 'expected instruments FAQ sibling');
    assert.match(faq[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(faq[1], /href="\/methodology\.html">How the AI activity index is computed<\/a>/);
  });

  it('classic instrument CTA and scanner link use question H1s', () => {
    const html = render(ctx, { view: 'classic' });
    assert.match(html, /href="\/instruments\.html">What instruments sit behind the SIREN reading\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/instruments\.html">Open the instrument room →<\/a>/);
    assert.match(html, /href="\/scanner\.html">What does the SIREN Capitulation Scanner show\?<\/a>/);
    assert.doesNotMatch(html, /href="\/scanner\.html">Scanner<\/a>/);
    assert.match(html, /What does SIREN Arena show\? →/);
    assert.doesNotMatch(html, /All picks and the track record →/);
  });

  it('instruments embed helper links to the export question, not the noindex widget', () => {
    const html = render(ctx, { view: 'instruments' });
    assert.match(html, /href="\/export\.html#embed">How do I export and embed SIREN data\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/embed\.html">Preview the widget →<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('oven methodology link uses the methodology question H1', () => {
    const html = render(ctx, { view: 'instruments' });
    const oven = html.match(/id="oven"[\s\S]*?<p class="fresh__key">([\s\S]*?)<\/p>/);
    assert.ok(oven, 'expected oven key paragraph');
    assert.match(oven[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology →<\/a>/);
    assert.doesNotMatch(oven[1], /How a stage is decided →/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('war-room doors and closer alerts use page H1 questions', () => {
    const html = render(ctx, { view: 'classic' });
    assert.match(html, /id="war-room"/);
    assert.match(html, /class="wr__go"[^>]*>What instruments sit behind the SIREN reading\? →<\/a>/);
    assert.match(html, /class="wr__go"[^>]*>Which AI stories has SIREN scored in this window\? →<\/a>/);
    assert.doesNotMatch(html, /class="wr__go"[^>]*>Open →<\/a>/);
    assert.match(html, /href="\/alerts\.html">How do I get alerts when SIREN moves\?/);
    assert.doesNotMatch(html, /Level alerts by RSS/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('home module and switcher section H2s use questions mirrored in FAQ', () => {
    const html = render({
      ...ctx,
      race: JSON.parse(readFileSync(new URL('../../data/race.json', import.meta.url), 'utf8')),
      x: JSON.parse(readFileSync(new URL('../../data/x-surface.json', import.meta.url), 'utf8')),
      digest: JSON.parse(readFileSync(new URL('../../data/digest.json', import.meta.url), 'utf8')),
      deskPicks: JSON.parse(readFileSync(new URL('../../data/desk-picks.json', import.meta.url), 'utf8')),
      leaders: JSON.parse(readFileSync(new URL('../../data/leaders.json', import.meta.url), 'utf8')),
      history: Array.from({ length: 8 }, (_, i) => ({
        generated_at: `2026-10-0${i + 1}T12:00:00Z`,
        t: Date.parse(`2026-10-0${i + 1}T12:00:00Z`),
        score: 50 + i,
        level: 4,
        level_name: 'ROUTINE',
        degraded: false,
      })),
    }, { view: 'classic' });
    assert.match(html, /id="vfy-h">How do you check a SIREN reading yourself\?<\/h2>/);
    assert.match(html, /Where is every dataset on one panel\?/);
    assert.match(html, /How do you check a SIREN reading yourself\?/);
    assert.match(html, /Which frontier labs are monitored\?/);
    assert.match(html, /Which labs’ posts are on the X wire\?/);
    assert.match(html, /Which readings are most recent\?/);
    assert.match(html, /Which eight stories are newest\?/);
    assert.match(html, /Which AI leaders are on the record\?/);
    assert.match(html, /class="sw__ph">What is in the newsroom\?<\/h3>/);
    assert.match(html, /class="sw__ph">Who is winning the AI race\?<\/h3>/);
    assert.doesNotMatch(html, /id="vfy-h">Don’t trust it\. Check it\.<\/h2>/);
    assert.doesNotMatch(html, /Every dataset, one panel<span/);
    assert.doesNotMatch(html, /id="rd-h">Recent readings<\/h2>/);
    assert.doesNotMatch(html, /class="sw__ph">The newsroom<\/h3>/);
    assert.doesNotMatch(html, /class="sw__ph">The race<\/h3>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('explainers guide card uses the guide question H1', () => {
    const html = render(ctx, { view: 'classic' });
    assert.match(html, /href="\/guide\.html"><b>How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?<\/b>/);
    assert.doesNotMatch(html, /href="\/guide\.html"><b>SIREN vs DEFCON vs the Clock<\/b>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('classic markets cards and desk switcher more-links use page H1 questions', () => {
    const html = render(ctx, { view: 'classic' });
    const go = html.match(/class="mkb__go">([\s\S]*?)<\/div>/);
    assert.ok(go, 'expected markets go row');
    assert.match(go[1], /href="[^"]*#investors">What does SIREN Arena show\?<\/a>/);
    assert.match(go[1], /href="[^"]*#battle">What does SIREN Arena show\?<\/a>/);
    assert.doesNotMatch(go[1], />Big investors</);
    assert.doesNotMatch(go[1], />AI battle</);
    assert.match(html, /id="mkb-tk">What does SIREN Arena show\?<\/b>/);
    assert.doesNotMatch(html, /id="mkb-tk">See today's picks<\/b>/);
    assert.match(html, /class="sw__more"[^>]*>Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /class="sw__more"[^>]*>The full board/);
    assert.doesNotMatch(html, /class="sw__more"[^>]*>All \d+ items, each score decomposed/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('classic reel more-link uses the newsroom question H1', () => {
    const html = render(ctx, { view: 'classic' });
    assert.match(html, /class="reel__more"[^>]*>Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /class="reel__more"[^>]*>All \d+ items/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('classic leader-wire more-link uses the leaders question H1', () => {
    const html = render({
      ...ctx,
      leaders: JSON.parse(readFileSync(new URL('../../data/leaders.json', import.meta.url), 'utf8')),
    }, { view: 'classic' });
    assert.match(html, /class="lw__more"><a href="\/leaders\.html">Which AI leaders are on the record this week\?<\/a>/);
    assert.doesNotMatch(html, /Every line, every leader, and the watch-floor/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });


  it('instruments recent-moves archive link uses the moves question H1', () => {
    const html = render({
      ...ctx,
      moves: [{
        id: 'm1',
        generated_at: '2026-10-13T20:00:00Z',
        score: 48,
        previous_score: 47.5,
        level: 4,
        previous_level: 4,
        level_name: 'ROUTINE',
        level_changed: false,
        delta: 0.5,
      }],
    }, { view: 'instruments' });
    assert.match(html, /href="\/moves\/">Where are the SIREN index moves\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/moves\/">Full archive →<\/a>/);
  });
});
