// Throwaway render harness. Mirrors the ctx that site/build.mjs assembles, so
// infraPage.render() is exercised exactly as the real builder will call it.
import { readFile, writeFile } from 'node:fs/promises';
import * as infraPage from './site/templates/infraPage.mjs';
import * as brand from './site/brand.mjs';

const read = async (p) => JSON.parse(await readFile(p, 'utf8'));
const state = await read('data/state.json');
const infra = await read('data/infra.json');
const history = (await readFile('data/history.ndjson', 'utf8'))
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

const ctx = {
  state, infra, news: null, race: null, x: null, history, receipts: [], moves: [],
  methodologyMd: '',
  href: (p) => `${brand.BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`,
  url: (p) => `${brand.ORIGIN}${brand.BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`,
  seriesFor: () => [],
  vsYesterday: null,
  cardFor: () => null,
  temporalCoverage: state.generated_at,
};

console.log('hasInfra:', infraPage.hasInfra(ctx));
const html = infraPage.render(ctx);
await writeFile('.tmp-infra.html', html);
console.log('bytes:', html.length);

// Determinism: two renders of the same ctx must be byte-identical.
const again = infraPage.render(ctx);
console.log('deterministic:', html === again);

// Empty-state path.
const emptyHtml = infraPage.render({ ...ctx, infra: null });
await writeFile('.tmp-infra-empty.html', emptyHtml);
console.log('empty page bytes:', emptyHtml.length, '| noindex:', emptyHtml.includes('noindex'));

// Cheap structural checks.
const must = ['SUBSTRATE', 'Read this before the charts', 'What this cannot tell you',
  'NO FREE FEED', 'AWAITING BASELINE', 'The corridors', 'api/infra.json'];
for (const m of must) if (!html.includes(m)) console.error('MISSING:', m);
const opens = (html.match(/<(section|article|figure|table|div)\b/g) || []).length;
const closes = (html.match(/<\/(section|article|figure|table|div)>/g) || []).length;
console.log('block tags open/close:', opens, closes, opens === closes ? 'BALANCED' : 'MISMATCH');
console.log('undefined/NaN/[object leaks:',
  (html.match(/undefined|NaN|\[object Object\]/g) || []).length);
