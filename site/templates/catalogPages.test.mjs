// node --test site/templates/catalogPages.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogEntries, searchIndex, pageMeta, bunkerTools, TYPES, CATALOG_TYPES } from './catalogPages.mjs';
import { sirenSearchCore, SEARCH_CORE_JS } from '../searchcore.mjs';

const groups = [
  ['LIVE INTEL', [['/race.html', 'radar', 'The Race', null, 'Labs ranked on live prediction-market odds.'], ['/moltbook.html', 'px:agent2', 'Agent Watch', null, 'What AI agents are saying on Moltbook, live.']]],
  ['PLAY & PREP', [['/game.html', 'joystick', 'Game', null, 'Thirty seconds: count signals.'], ['/scanner.html', 'px:crosshair', 'Scanner', null, 'Screen stocks.'], ['/gone.html', 'px:doc', 'Gone', null, 'Not built.']]],
];
const files = ['race.html', 'moltbook.html', 'game.html', 'scanner.html', 'about.html', 'odd.html', 'feed.xml', 'feed-pillar-compute.xml', 'api/state.json', 'api/history.csv', 'embed.html', '404.html'];
const pages = { 'about.html': { title: 'About SIREN', desc: 'Who runs it.' }, 'odd.html': { title: 'An odd page', desc: 'Found on disk.' }, '404.html': { title: 'Not found', desc: '' } };
const videos = [{ id: 'tally', title: 'Meet Tally', secs: 22, station: 'CANARY', blurb: 'Five moods.' }];

test('catalogEntries types rooms, keeps only written files, and finds unlisted pages', () => {
  const e = catalogEntries({ groups, files, pages, videos });
  const by = (u) => e.find((x) => x.url === u);
  assert.equal(by('/race.html').type, 'page');
  assert.equal(by('/race.html').group, 'LIVE INTEL');
  assert.equal(by('/game.html').type, 'game');
  assert.equal(by('/scanner.html').type, 'tool');
  assert.equal(by('/gone.html'), undefined, 'a room whose file was not written is left out');
  assert.equal(by('/odd.html').title, 'An odd page', 'a written page in no list still appears');
  assert.equal(by('/404.html'), undefined);
  assert.equal(by('/videos.html#v-tally').type, 'video');
  assert.equal(by('/api/state.json').type, 'data');
  assert.equal(by('/api/history.csv').meta, 'api/history.csv');
  assert.equal(by('/api/news.json'), undefined, 'unwritten data files are not listed');
  assert.ok(by('/api/search-index.json'), 'the index lists itself');
  assert.equal(by('/feed.xml').type, 'feed');
  assert.match(by('/feed-pillar-compute.xml').title, /Compute pillar/);
  assert.equal(by('/embed.html').type, 'embed');
  assert.equal(new Set(e.map((x) => x.url)).size, e.length, 'no duplicate urls');
  for (const x of e) assert.ok(CATALOG_TYPES.includes(x.type), x.type);
});

test('searchIndex packs entries and content into compact rows', () => {
  const e = catalogEntries({ groups, files, pages, videos });
  const idx = searchIndex(e, {
    at: '2026-10-09T00:00:00Z',
    news: { items: [{ id: 'abc', title: 'Agents ship a new model', summary: 'A summary.', published_at: '2026-10-09T01:00:00Z', pillar: 'capability', source: 'wire', kind: 'press', url: 'https://example.com/x' }] },
    leaders: { leaders: [{ id: 'x1', name: 'Ada Example', role: 'CEO', org: 'Lab', aliases: ['Ada'] }] },
    faq: [['What is SIREN?', 'An hourly index.']],
    kit: [{ name: 'Tool', url: 'https://tool.example', does: 'Does things.', crate: 'Vault', domain: 'tool.example' }],
    itemPages: true,
  });
  assert.equal(idx.v, 1);
  assert.deepEqual(idx.order, TYPES.map(([k]) => k));
  for (const row of idx.items) {
    assert.equal(row.length, 6);
    assert.ok(idx.types[row[0]], `known type ${row[0]}`);
    assert.ok(/^(\/|https:\/\/)/.test(row[2]), `url ${row[2]}`);
  }
  const news = idx.items.find((r) => r[0] === 'news');
  assert.equal(news[2], '/item/agents-ship-a-new-model-abc.html');
  assert.equal(idx.items.find((r) => r[0] === 'leader')[2], '/leaders.html#lw-x1');
  assert.equal(idx.items.find((r) => r[0] === 'kit')[2], 'https://tool.example');
  assert.ok(JSON.stringify(idx).length < 20000);
});

test('search core ranks, forgives one slip, and highlights', () => {
  const S = sirenSearchCore();
  const idx = searchIndex(catalogEntries({ groups, files, pages, videos }), {
    news: { items: [{ id: 'n1', title: 'Datacentre water fight', summary: 'Drought.', published_at: '2026-10-09', pillar: 'compute' }] },
  });
  const rows = S.prep(idx);
  const top = S.search(rows, 'agent watch');
  assert.equal(top[0].it[2], '/moltbook.html');
  assert.equal(S.search(rows, 'datacenter')[0].it[1], 'Datacentre water fight', 'one-letter slip still matches');
  assert.equal(S.search(rows, 'zzzqqq').length, 0);
  assert.ok(S.search(rows, 'csv').some((h) => h.it[2] === '/api/history.csv'));
  assert.equal(S.search(rows, 'race', { type: 'news' }).length, 0);
  assert.equal(S.hl('Agent <Watch>', 'watch'), 'Agent &lt;<mark>Watch</mark>&gt;');
  assert.equal(S.hl('swatch', 'watch'), 'swatch', 'only marks word starts');
  assert.ok(S.near('colour', 'color') && S.near('agnet', 'agent') && !S.near('agent', 'angel'));
  // The browser copy is the same function.
  const win = {};
  new Function('window', SEARCH_CORE_JS)(win);
  assert.equal(win.sirenSearch.search(win.sirenSearch.prep(idx), 'agent watch')[0].it[2], '/moltbook.html');
});

test('pageMeta and bunkerTools read what the build wrote', () => {
  assert.deepEqual(pageMeta('<title>Privacy · SIREN</title><meta name="description" content="No cookies &amp; no data.">'), { title: 'Privacy', desc: 'No cookies & no data.' });
  const html = '<script>\nconst CRATES = [{id:"vault", name:"Knowledge vault", why:"x"}];\nconst TOOLS = [["vault","Archive","archive.example","Saves pages.","",null,null,null]];\nconst packed = 1;';
  assert.deepEqual(bunkerTools(html), [{ name: 'Archive', url: 'https://archive.example', does: 'Saves pages.', crate: 'Knowledge vault', domain: 'archive.example' }]);
  assert.deepEqual(bunkerTools('<p>no kit</p>'), []);
});
