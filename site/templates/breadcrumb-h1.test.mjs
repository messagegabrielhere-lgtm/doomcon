import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { breadcrumbs } from './_seo.mjs';
import { render as renderEvolution } from './evolutionPage.mjs';
import { render as renderWaffle } from './wafflePage.mjs';

const here = dirname(fileURLToPath(import.meta.url));

describe('breadcrumb leaves match page H1 questions (tip #259)', () => {
  it('template sources do not hard-code bare BreadcrumbList leaf names', () => {
    const bare = [];
    for (const name of readdirSync(here)) {
      if (!name.endsWith('.mjs') || name.endsWith('.test.mjs') || name.startsWith('_seo')) continue;
      const t = readFileSync(join(here, name), 'utf8');
      const blocks = t.matchAll(/breadcrumbs\(ctx,\s*\[(.*?)\]\s*[,)]/gs);
      for (const m of blocks) {
        for (const n of m[1].matchAll(/name:\s*['"]([^'"]+)['"]/g)) {
          const label = n[1];
          if (label === 'Home') continue;
          if (!label.includes('?') && !label.startsWith('AI activity index today')) {
            bare.push(`${name}: ${label}`);
          }
        }
      }
    }
    assert.deepEqual(bare, []);
  });

  it('evolution and waffle BreadcrumbList leaves use the page H1 questions', () => {
    const evoCtx = {
      url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
      href: (p) => p,
      cardFor: () => null,
      history: [
        { t: '2026-10-12T12:00:00Z', score: 50, level: 4, pillars: { capability: 40, compute: 50, attention: 45, governance: 30, markets: 55 } },
        { t: '2026-10-13T12:00:00Z', score: 52, level: 4, pillars: { capability: 42, compute: 51, attention: 46, governance: 31, markets: 54 } },
      ],
      deskPicks: { items: [] },
      state: { generated_at: '2026-10-13T15:00:00Z', score: 52, level: 4, level_name: 'ROUTINE' },
    };
    const evo = renderEvolution(evoCtx, { runs: [] }, []);
    assert.match(evo, /BreadcrumbList[\s\S]*?"name"\s*:\s*"How has AI activity moved day by day\?"/);
    assert.doesNotMatch(evo, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Evolution Log"/);

    const wafCtx = {
      url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
      href: (p) => p,
      cardFor: () => null,
      routes: { waffle: true, map: true },
      state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
    };
    const waf = renderWaffle(wafCtx, { storms: [], generated_at: '2026-10-13T15:00:00Z' }, null);
    assert.match(waf, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Is the Waffle House open\?"/);
    assert.doesNotMatch(waf, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Waffle House Index"/);

    const sample = breadcrumbs(evoCtx, [
      { name: 'Home', path: '/' },
      { name: 'How has AI activity moved day by day?', path: '/evolution.html' },
    ]);
    assert.equal(sample.itemListElement.at(-1).name, 'How has AI activity moved day by day?');
    assert.doesNotMatch(JSON.stringify(sample), /Evolution Log|Waffle House Index/);
  });
});
