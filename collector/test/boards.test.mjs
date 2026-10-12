import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTokenVolume, parseOpenRouterRankingsHtml, parseLmarenaJsonLd,
  parseHfVideo, buildBoardsFromParts,
} from '../boards.mjs';

test('parseTokenVolume reads T/B suffixes', () => {
  assert.equal(parseTokenVolume('5.68T'), 5.68e12);
  assert.equal(parseTokenVolume('841B'), 841e9);
  assert.equal(parseTokenVolume('not-a-number'), null);
});

test('parseOpenRouterRankingsHtml extracts ranked rows', () => {
  const html = `
    <div id="rankings-summary"><caption>Models ranked by tokens</caption>
    <tbody>
      <tr><td>1</td><th>DeepSeek V4.1 Flash</th><td>deepseek</td><td>5.68T</td><td>+13%</td></tr>
      <tr><td>2</td><th>GLM 5.3 Flash</th><td>z-ai</td><td>1.79T</td><td>+12%</td></tr>
    </tbody></div>`;
  const { rows } = parseOpenRouterRankingsHtml(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'DeepSeek V4.1 Flash');
  assert.equal(rows[0].tokens, 5.68e12);
});

test('parseOpenRouterRankingsHtml strips nested tag leftovers', () => {
  const html = `
    <div id="rankings-summary"><caption>safe</caption>
    <tbody>
      <tr><td>1</td><th><scr<script>ipt>evil</scr</script>ipt>Model</th><td>lab</td><td>1T</td><td></td></tr>
    </tbody></div>`;
  const { rows } = parseOpenRouterRankingsHtml(html);
  assert.equal(rows[0].name, 'ipt>evil ipt>Model');
  assert.ok(!/</.test(rows[0].name));
  assert.ok(!/<script/i.test(rows[0].name));
});

test('parseLmarenaJsonLd reads ItemList order', () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@type': 'ItemList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'claude-fable-5' },
      { '@type': 'ListItem', position: 2, name: 'gemini-3-pro' },
    ],
  })}</script>`;
  const rows = parseLmarenaJsonLd(html);
  assert.equal(rows[0].name, 'claude-fable-5');
  assert.equal(rows[1].rank, 2);
});

test('buildBoardsFromParts marks failed boards dark without inventing rows', () => {
  const dark = buildBoardsFromParts({
    openrouterError: new Error('down'),
    lmarenaError: new Error('down'),
    hfVideoError: new Error('down'),
    asOf: '2026-10-12T00:00:00.000Z',
  });
  assert.equal(dark.glance.boards_ok, 0);
  assert.ok(dark.boards.every((b) => !b.ok && b.rows.length === 0));

  const live = buildBoardsFromParts({
    openrouter: { caption: 'x', rows: [{ rank: 1, name: 'A', author: 'a', tokens_label: '1T', tokens: 1e12, change: null, source_url: 'https://example.com' }] },
    lmarena: [{ rank: 1, name: 'm', elo: 1500, source_url: 'https://example.com' }],
    hfVideo: parseHfVideo([{ id: 'org/model', downloads: 100, likes: 1 }]),
    asOf: '2026-10-12T00:00:00.000Z',
  });
  assert.equal(live.glance.boards_ok, 3);
});
