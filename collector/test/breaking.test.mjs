// The breaking rule, the outlet-independence test, persistence across runs,
// and the detection-latency ledger. Pure fixtures; no network.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  outletOf, sightingsOf, clusterItems, evaluateCluster, detectBreaking,
  updateSightings, speedTable, median, breakingPass, BREAKING_RULES,
} from '../breaking.mjs';

const NOW_ISO = '2026-10-09T20:30:00.000Z';
const NOW = Date.parse(NOW_ISO);
const at = (minAgo) => new Date(NOW - minAgo * 60_000).toISOString();

let n = 0;
function item({ source, url, title = 'OpenAI ships a new reasoning model to every ChatGPT user', pub, seen, outlet, unvetted, also = [], story, score = 50 }) {
  n += 1;
  return {
    id: `i${String(n).padStart(4, '0')}`,
    source,
    url,
    title,
    published_at: pub,
    score,
    meta: {
      first_seen_at: seen ?? pub,
      ...(outlet ? { outlet_domain: outlet } : {}),
      ...(unvetted ? { unvetted: true } : {}),
      ...(story ? { story: { id: story } } : {}),
      corroboration: { primary_published_at: pub, also },
    },
  };
}

const evalOne = (list) => evaluateCluster(list, NOW);

describe('outletOf', () => {
  it('names publishers, not feeds', () => {
    assert.equal(outletOf({ source: 'openai-status', url: 'https://status.openai.com/incidents/x' }), 'openai.com');
    assert.equal(outletOf({ source: 'reddit-openai', url: 'https://www.reddit.com/r/OpenAI/x' }), 'reddit.com');
    assert.equal(outletOf({ source: 'gnews-ai', url: 'https://news.google.com/rss/articles/abc' }), null, 'an aggregator redirect names nobody');
    assert.equal(outletOf({ source: 'gnews-ai', url: 'https://news.google.com/rss/articles/abc', outlet: 'www.reuters.com' }), 'reuters.com');
    assert.equal(outletOf({ source: 'x-search', url: 'https://x.com/a/status/1', outlet: 'x:SomeOne' }), 'x:someone');
  });
});

describe('the breaking rule', () => {
  it('fires on two independent outlets within 20 minutes', () => {
    const a = item({ source: 'gdelt-ai', url: 'https://example-times.com/a', pub: at(30), outlet: 'example-times.com', story: 's1' });
    const b = item({ source: 'gnews-ai', url: 'https://news.google.com/rss/articles/b', pub: at(15), outlet: 'dailywire.example', story: 's1' });
    const ev = evalOne([a, b]);
    assert.ok(ev);
    assert.deepEqual(ev.outlets, ['dailywire.example', 'example-times.com']);
    assert.match(ev.rule[0], /within 20 min/);
  });

  it('does not fire on two ordinary outlets two hours apart', () => {
    const a = item({ source: 'gdelt-ai', url: 'https://one.example/a', pub: at(150), outlet: 'one.example' });
    const b = item({ source: 'gdelt-ai', url: 'https://two.example/b', pub: at(20), outlet: 'two.example' });
    assert.equal(evalOne([a, b]), null);
  });

  it('fires on a tier-one outlet plus one more, at any distance inside the window', () => {
    const a = item({ source: 'verge-ai', url: 'https://www.theverge.com/x', pub: at(200) });
    const b = item({ source: 'gdelt-ai', url: 'https://one.example/b', pub: at(20), outlet: 'one.example' });
    const ev = evalOne([a, b]);
    assert.ok(ev);
    assert.deepEqual(ev.tier1, ['theverge.com']);
    assert.deepEqual(ev.rule, ['tier-one outlet plus one more']);
  });

  it('counts two subreddits as one outlet, and relays as none', () => {
    const r1 = item({ source: 'reddit-openai', url: 'https://reddit.com/r/OpenAI/1', pub: at(10) });
    const r2 = item({ source: 'reddit-singularity', url: 'https://reddit.com/r/singularity/2', pub: at(9) });
    assert.equal(evalOne([r1, r2]), null);
    const tc = item({ source: 'techcrunch-ai', url: 'https://techcrunch.com/x', pub: at(30) });
    const tm = item({ source: 'techmeme', url: 'https://techmeme.com/261009/p1', pub: at(25) });
    assert.equal(evalOne([tc, tm]), null, 'a TechCrunch story on Techmeme is still one report');
  });

  it('treats one company as one outlet across its channels', () => {
    const blog = item({ source: 'openai', url: 'https://openai.com/index/x', pub: at(30) });
    const status = item({ source: 'openai-status', url: 'https://status.openai.com/incidents/y', pub: at(28) });
    assert.equal(evalOne([blog, status]), null);
  });

  it('never counts an unvetted social account', () => {
    const t1 = item({ source: 'verge-ai', url: 'https://theverge.com/x', pub: at(30) });
    const anon = item({ source: 'x-search', url: 'https://x.com/anon/status/1', pub: at(28), outlet: 'x:anon', unvetted: true });
    assert.equal(evalOne([t1, anon]), null);
    const sama = item({ source: 'x-search', url: 'https://x.com/sama/status/2', pub: at(28), outlet: 'x:sama' });
    assert.ok(evalOne([t1, sama]));
  });

  it('matches a newsroom across feeds: Google News Reuters + Bluesky reuters.com is one outlet', () => {
    const gn = item({ source: 'gnews-ai', url: 'https://news.google.com/rss/articles/r', pub: at(12), outlet: 'reuters.com' });
    const bs = item({ source: 'bluesky-ai', url: 'https://bsky.app/profile/reuters.com/post/1', pub: at(11), outlet: 'reuters.com' });
    assert.equal(evalOne([gn, bs]), null);
  });

  it('reads corroborating members carried inside one item', () => {
    const it1 = item({
      source: 'techcrunch-ai', url: 'https://techcrunch.com/x', pub: at(40),
      also: [{ source: 'gnews-ai', url: 'https://news.google.com/rss/articles/q', title: 't', published_at: at(35), outlet: 'bloomberg.com' }],
    });
    const ev = evalOne([it1]);
    assert.ok(ev);
    assert.deepEqual(ev.outlets, ['bloomberg.com', 'techcrunch.com']);
  });

  it('ignores sightings older than the window', () => {
    const a = item({ source: 'verge-ai', url: 'https://theverge.com/x', pub: at(BREAKING_RULES.WINDOW_HOURS * 60 + 30) });
    const b = item({ source: 'gdelt-ai', url: 'https://one.example/b', pub: at(BREAKING_RULES.WINDOW_HOURS * 60 + 20), outlet: 'one.example' });
    assert.equal(evalOne([a, b]), null);
  });

  it('clamps an outlet timestamp later than our own first sighting', () => {
    const it1 = item({ source: 'verge-ai', url: 'https://theverge.com/x', pub: at(-30), seen: at(5) });
    assert.equal(sightingsOf(it1)[0].t, Date.parse(at(5)));
  });

  it('clusters by story id and leaves the rest alone', () => {
    const a = item({ source: 'a', url: 'https://a.example/1', pub: at(1), story: 'S' });
    const b = item({ source: 'b', url: 'https://b.example/1', pub: at(1), story: 'S' });
    const c = item({ source: 'c', url: 'https://c.example/1', pub: at(1) });
    assert.deepEqual(clusterItems([a, b, c]).map((l) => l.length).sort(), [1, 2]);
  });
});

describe('detectBreaking across runs', () => {
  const a = item({ source: 'verge-ai', url: 'https://theverge.com/big', title: 'Big lab news from The Verge desk today', pub: at(40), seen: at(38), story: 'K', score: 60 });
  const b = item({ source: 'gdelt-ai', url: 'https://one.example/big', title: 'Big lab news syndicated', pub: at(35), seen: at(34), outlet: 'one.example', story: 'K', score: 40 });

  it('records first_seen, latency, outlets and the tier-one headline', () => {
    const [c] = detectBreaking([a, b], [], { generatedAt: NOW_ISO });
    assert.equal(c.live, true);
    assert.equal(c.title, 'Big lab news from The Verge desk today');
    assert.equal(c.outlet, 'theverge.com');
    assert.equal(c.corroboration, 2);
    assert.equal(c.first_seen_at, at(38));
    assert.equal(c.earliest_published_at, at(40));
    assert.equal(c.latency_s, 120);
    assert.equal(c.breaking_at, NOW_ISO);
  });

  it('keeps id and breaking_at when the cluster grows, and keeps history when it ages out', () => {
    const [first] = detectBreaking([a, b], [], { generatedAt: at(10) });
    const c2 = item({ source: 'gnews-ai', url: 'https://news.google.com/rss/articles/z', pub: at(5), outlet: 'reuters.com', story: 'K' });
    const [again] = detectBreaking([a, b, c2], [first], { generatedAt: NOW_ISO });
    assert.equal(again.id, first.id);
    assert.equal(again.breaking_at, at(10));
    assert.equal(again.corroboration, 3);
    const later = detectBreaking([], [again], { generatedAt: NOW_ISO });
    assert.equal(later.length, 1);
    assert.equal(later[0].live, false);
  });

  it('keeps at most 30', () => {
    const prev = Array.from({ length: 40 }, (_, i) => ({ id: `b${i}`, item_ids: [`x${i}`], breaking_at: at(i), live: true }));
    assert.equal(detectBreaking([], prev, { generatedAt: NOW_ISO }).length, BREAKING_RULES.KEEP);
  });
});

describe('speed ledger', () => {
  const rec = (source, url, minAgo) => ({ source, url, published_ms: NOW - minAgo * 60_000 });
  const prevSources = [{ id: 'verge-ai', fetched_at: at(1), ok: true }, { id: 'dead', fetched_at: at(1), ok: false }];

  it('baselines silently on its first run', () => {
    const { ledger, added } = updateSightings(null, [rec('verge-ai', 'https://v/1', 5)], { generatedAt: NOW_ISO, previousSources: prevSources });
    assert.equal(added, 0);
    assert.equal(Object.keys(ledger.seen).length, 1);
    assert.equal(ledger.started_at, NOW_ISO);
  });

  it('samples only new items from sources that were asked before and were not dark', () => {
    const base = updateSightings(null, [rec('verge-ai', 'https://v/1', 5)], { generatedAt: at(1), previousSources: prevSources }).ledger;
    const { ledger, added } = updateSightings(base, [
      rec('verge-ai', 'https://v/1', 5), // seen already
      rec('verge-ai', 'https://v/2', 4), // 240 s
      rec('verge-ai', 'https://v/3', 2 * 60), // 7200 s
      rec('verge-ai', 'https://v/old', 30 * 60), // over 24h: backfill
      rec('brand-new', 'https://n/1', 1), // never asked before
      rec('dead', 'https://d/1', 1), // dark last time
    ], { generatedAt: NOW_ISO, previousSources: prevSources });
    assert.equal(added, 2);
    assert.deepEqual(ledger.samples.map((s) => s[2]).sort((x, y) => x - y), [240, 7200]);
    const t = speedTable(ledger, [{ id: 'verge-ai', label: 'The Verge' }]);
    assert.equal(t.overall.n, 2);
    assert.equal(t.overall.median_s, 3720);
    assert.deepEqual(t.by_source[0], { source: 'verge-ai', label: 'The Verge', median_s: 3720, n: 2 });
    assert.match(t.definition, /not a comparison/);
  });

  it('drops samples older than 24h and seen-keys older than 8 days', () => {
    const old = { started_at: at(99999), seen: { aaaa: Math.floor((NOW - 9 * 86_400_000) / 60_000).toString(36) }, samples: [['verge-ai', Math.floor((NOW - 25 * 3_600_000) / 1000), 60]] };
    const { ledger } = updateSightings(old, [], { generatedAt: NOW_ISO });
    assert.deepEqual(ledger.samples, []);
    assert.deepEqual(ledger.seen, {});
  });

  it('median', () => {
    assert.equal(median([]), null);
    assert.equal(median([5]), 5);
    assert.equal(median([1, 2, 3, 10]), 3);
  });
});

describe('breakingPass', () => {
  it('writes both files, and freezes the speed ledger when the minute loop owns it', async () => {
    const dir = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'brk-'))}/`);
    const a = item({ source: 'verge-ai', url: 'https://theverge.com/p', pub: at(20), story: 'P' });
    const b = item({ source: 'gdelt-ai', url: 'https://one.example/p', pub: at(18), outlet: 'one.example', story: 'P' });
    const out = await breakingPass({ items: [a, b], freshRecords: [], sources: [], previousSources: [], generatedAt: NOW_ISO, dataDir: dir, loopRunning: false });
    assert.equal(out.live, 1);
    assert.equal(out.fresh, out.clusters[0].id);
    assert.ok(existsSync(new URL('sightings.json', dir)));
    const written = JSON.parse(readFileSync(new URL('breaking.json', dir), 'utf8'));
    assert.equal(written.clusters.length, 1);
    assert.ok(written.speed && written.rules.text.includes('20 minutes'));

    const before = readFileSync(new URL('sightings.json', dir), 'utf8');
    await breakingPass({ items: [a, b], freshRecords: [{ source: 'verge-ai', url: 'https://new/1', published_ms: NOW }], sources: [], previousSources: [], generatedAt: NOW_ISO, dataDir: dir, loopRunning: true });
    assert.equal(readFileSync(new URL('sightings.json', dir), 'utf8'), before);
  });
});
