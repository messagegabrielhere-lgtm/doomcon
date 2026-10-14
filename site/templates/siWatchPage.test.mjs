import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './siWatchPage.mjs';

const sig = JSON.parse(readFileSync(new URL('../../data/si-signals.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { threats: true, status: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('si-watch page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx, sig, []);
    assert.match(html, /<title>What AI autonomy signals is SIREN watching\?/);
    assert.match(html, /<h1 class="bp__h1">What AI autonomy signals is SIREN watching\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /id="coding">What are the AI agents coding\?<\/h2>/);
    assert.match(html, /id="coming">Which signals are on the way\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*What are the AI agents coding\?/);
    assert.match(html, /FAQPage[\s\S]*Which signals are on the way\?/);
    assert.match(html, /Do these signals move the SIREN level\?/);
    assert.match(html, /What happens when a signal stops answering\?/);
    assert.match(html, /Where does the data come from\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/threats\.html/);
    assert.match(html, /\/status\.html/);
    assert.match(html, /href="\/moltbook\.html">What are AI agents saying on Moltbook\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/moltbook\.html">Agent Watch →<\/a>/);
    assert.match(html, /href="\/feedback\.html">How do I report a problem or send an idea to SIREN\?<\/a>/);
    assert.doesNotMatch(html, /href="\/feedback\.html">Suggest a signal<\/a>/);
    assert.doesNotMatch(html, /id="coding">What the AI agents are coding<\/h2>/);
    assert.doesNotMatch(html, /id="coming">Signals on the way<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /takeover is coming/i);
    assert.doesNotMatch(html, /SIREN (predicts|forecasts) AGI/i);
    assert.doesNotMatch(html, /probability of (doom|takeover)/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
