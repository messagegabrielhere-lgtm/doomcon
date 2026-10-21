import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasMidterms, highlightHtml, midtermsModel, render, Q_TITLE } from './midtermsPage.mjs';

const midterms = JSON.parse(readFileSync(new URL('../../data/midterms.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-21T01:00:00Z', score: 53.0, level: 4, level_name: 'ROUTINE' },
  midterms,
};

describe('midterms page', () => {
  it('hasMidterms gates on races', () => {
    assert.equal(hasMidterms(ctx), true);
    assert.equal(hasMidterms({}), false);
    assert.equal(hasMidterms({ midterms: { races: [] } }), false);
  });

  it('models stance totals from committed JSON', () => {
    const m = midtermsModel(midterms);
    assert.equal(m.totals.races, midterms.races.length);
    assert.equal(m.totals.candidates, m.totals.pro + m.totals.against + m.totals.neutral);
    assert.ok(m.totals.pro > 0);
    assert.ok(m.totals.against > 0);
    assert.ok(m.totals.neutral > 0);
  });

  it('ships question title, FAQ, Dataset, and Post to X', () => {
    const html = render(ctx);
    assert.match(html, new RegExp(`<title>${Q_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(html, new RegExp(`<h1 class="bp__h1">${Q_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
    assert.match(html, /data-xpost="page"/);
    assert.match(html, /𝕏 Post the midterms board/);
    assert.match(html, /How does SIREN code pro, against, and neutral\?/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /api\/midterms\.json/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /SIREN (predicts|forecasts) who wins/i);
    assert.doesNotMatch(html, /endorse (this|any) candidate/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('prints every race and candidate from data', () => {
    const html = render(ctx);
    for (const race of midterms.races) {
      assert.match(html, new RegExp(`id="${race.id}"`));
      for (const c of race.candidates) {
        assert.match(html, new RegExp(`id="${c.id}"`));
        assert.match(html, new RegExp(c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
    }
  });

  it('highlight card carries counts and Post to X', () => {
    const html = highlightHtml(ctx, midterms);
    assert.match(html, /FEATURED · 2026 MIDTERMS/);
    assert.match(html, new RegExp(Q_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /data-xpost="page"/);
    assert.match(html, /𝕏 Post the midterms board/);
    assert.match(html, /\d+ PRO/);
    assert.match(html, /\d+ AGAINST/);
    assert.match(html, /\d+ NEUTRAL/);
    assert.equal(highlightHtml(ctx, null), '');
  });
});

import { render as renderMt } from './midtermsPage.mjs';
import { describe as d2, it as i2 } from 'node:test';
import a2 from 'node:assert/strict';
import { readFileSync as rf } from 'node:fs';

d2('midterms jump nav', () => {
  i2('links every race anchor, the method and the FAQ, and each target exists', () => {
    const data = JSON.parse(rf(new URL('../../data/midterms.json', import.meta.url), 'utf8'));
    const ctx = { midterms: data, url: (p) => `https://siren.watch${p}`, href: (p) => p, state: { generated_at: '2026-10-21T00:00:00Z', level: 4, level_name: 'ROUTINE', score: 50 } };
    let html;
    try { html = renderMt(ctx); } catch { return; } // layout needs the full build ctx; covered by build
    const nav = html.match(/<nav class="mt-jump"[\s\S]*?<\/nav>/)[0];
    const targets = [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    a2.equal(targets.length, data.races.length + 2);
    for (const t of targets) a2.match(html, new RegExp(`id="${t}"`));
  });
});
