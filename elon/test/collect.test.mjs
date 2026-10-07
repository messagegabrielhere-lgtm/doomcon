import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, matchElon, channelIdFromPage, merge } from '../collect.mjs';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <entry>
  <id>yt:video:AAAAAAAAAAA</id>
  <yt:videoId>AAAAAAAAAAA</yt:videoId>
  <title>Elon Musk on Starship &amp; Mars</title>
  <published>2026-09-30T15:00:00+00:00</published>
  <media:group>
   <media:title>Elon Musk on Starship &amp; Mars</media:title>
   <media:description>Full interview.</media:description>
   <media:community><media:statistics views="12345"/></media:community>
  </media:group>
 </entry>
 <entry>
  <yt:videoId>BBBBBBBBBBB</yt:videoId>
  <title>2026 Annual Shareholder Meeting</title>
  <published>2026-06-12T20:00:00+00:00</published>
  <media:group><media:description>Live from Giga Texas</media:description><media:community><media:statistics views="9"/></media:community></media:group>
 </entry>
 <entry>
  <yt:videoId>CCCCCCCCCCC</yt:videoId>
  <title>Muskrat habitats explained</title>
  <published>2026-01-01T00:00:00+00:00</published>
  <media:group><media:description>Wildlife.</media:description></media:group>
 </entry>
</feed>`;

test('parseFeed reads ids, decoded titles, views', () => {
  const v = parseFeed(FEED);
  assert.equal(v.length, 3);
  assert.equal(v[0].id, 'AAAAAAAAAAA');
  assert.equal(v[0].title, 'Elon Musk on Starship & Mars');
  assert.equal(v[0].views, 12345);
  assert.equal(v[1].description, 'Live from Giga Texas');
  assert.equal(v[2].views, null);
});

test('matchElon: name anywhere, events only on official channels, no muskrats', () => {
  const [a, b, c] = parseFeed(FEED);
  assert.equal(matchElon(a, 'news'), 'name');
  assert.equal(matchElon(b, 'official'), 'event');
  assert.equal(matchElon(b, 'news'), null);
  assert.equal(matchElon(c, 'official'), null);
  assert.equal(matchElon({ title: "Musk's plan", description: '' }, 'news'), 'name');
  // Passing mention in an interview description is not a clip of him; in his own company's it is.
  assert.equal(matchElon({ title: 'Jensen Huang: NVIDIA', description: '01:02:03 - Elon Musk' }, 'interview'), null);
  assert.equal(matchElon({ title: 'Optimus update', description: 'Elon Musk walks through Optimus' }, 'official'), 'name');
  assert.equal(matchElon({ title: 'POV Hailing a Cybercab', description: '' }, 'official'), null);
});

test('channelIdFromPage', () => {
  assert.equal(channelIdFromPage('<link rel="canonical" href="https://www.youtube.com/channel/UC5WjFrtBdufl6CZojX3D8dQ">'), 'UC5WjFrtBdufl6CZojX3D8dQ');
  assert.equal(channelIdFromPage('{"externalId":"UCtI0Hodo5o5dUb67FeUjDeA"}'), 'UCtI0Hodo5o5dUb67FeUjDeA');
  assert.equal(channelIdFromPage('<html>consent</html>'), null);
});

test('merge keeps firstSeen and old views, sorts newest first', () => {
  const prev = [{ id: 'x', published: '2026-01-01', firstSeen: 'T0', views: 5, description: 'd' }];
  const out = merge(prev, [{ id: 'x', published: '2026-01-01', views: null, description: '' }, { id: 'y', published: '2026-02-01', views: 1 }], 'T1');
  assert.deepEqual(out.map((c) => c.id), ['y', 'x']);
  assert.equal(out[1].firstSeen, 'T0');
  assert.equal(out[1].views, 5);
  assert.equal(out[1].description, 'd');
  assert.equal(out[0].firstSeen, 'T1');
});

import { parseChannelSearch, relativeToIso } from '../collect.mjs';

test('relativeToIso', () => {
  const now = Date.UTC(2026, 9, 7);
  assert.equal(relativeToIso('Streamed 2 years ago', now), new Date(now - 2 * 31536e6).toISOString());
  assert.equal(relativeToIso('1 day ago', now), new Date(now - 864e5).toISOString());
  assert.equal(relativeToIso('Premieres soon', now), '');
});

test('parseChannelSearch finds videoRenderers at any depth', () => {
  const data = { contents: { tabs: [{ expandableTabRenderer: { content: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: [
    { videoRenderer: { videoId: 'DDDDDDDDDDD', title: { runs: [{ text: 'Elon Musk: ' }, { text: 'Mars' }] }, publishedTimeText: { simpleText: '3 years ago' }, viewCountText: { simpleText: '1,234,567 views' },
      detailedMetadataSnippets: [{ snippetText: { runs: [{ text: 'We talk to ' }, { text: 'Elon' }] } }] } },
    { channelRenderer: { channelId: 'x' } },
    { videoRenderer: { videoId: 'bad' } },
  ] } }] } } } }] } };
  const html = `<script nonce="n">var ytInitialData = ${JSON.stringify(data)};</script><script>x</script>`;
  const r = parseChannelSearch(html, Date.UTC(2026, 9, 7));
  assert.equal(r.parsed, true);
  assert.equal(r.videos.length, 1);
  assert.equal(r.videos[0].title, 'Elon Musk: Mars');
  assert.equal(r.videos[0].views, 1234567);
  assert.equal(r.videos[0].approxDate, true);
  assert.equal(r.videos[0].description, 'We talk to Elon');
  assert.equal(parseChannelSearch('<html>consent</html>').parsed, false);
});

test('merge: an approximate date never overwrites an exact one, and an exact one replaces it', () => {
  const exact = [{ id: 'z', published: '2023-04-01T00:00:00Z', firstSeen: 'T0' }];
  assert.equal(merge(exact, [{ id: 'z', published: '2023-05-01T00:00:00Z', approxDate: true }], 'T1')[0].published, '2023-04-01T00:00:00Z');
  const approx = [{ id: 'z', published: '2023-05-01T00:00:00Z', approxDate: true, firstSeen: 'T0' }];
  const out = merge(approx, [{ id: 'z', published: '2023-04-01T00:00:00Z' }], 'T1')[0];
  assert.equal(out.published, '2023-04-01T00:00:00Z');
  assert.equal(out.approxDate, undefined);
  assert.equal(JSON.parse(JSON.stringify(merge(exact, [{ id: 'z', published: 'x', approxDate: true }], 'T1')[0])).approxDate, undefined);
});
