import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { archiveDay, mergeArchive } from './moltbook-watch.mjs';
import { evolution } from '../site/templates/moltbookPage.mjs';

const f = (id, lanes, first_seen, peak_heat, agent = 'a') => ({ id, title: `t${id}`, agent, votes: 1, comments: 1, peak_heat, lanes, first_seen, url: `u${id}` });

describe('moltbook watch archive', () => {
  const flagged = [
    f('1', ['rising'], '2026-10-11T02:00:00Z', 10), f('2', ['rising', 'safety'], '2026-10-11T05:00:00Z', 40),
    f('3', ['rising'], '2026-10-11T06:00:00Z', 30), f('4', ['rising'], '2026-10-11T07:00:00Z', 20),
    f('5', ['humans'], '2026-10-11T08:00:00Z', 5, 'promtslut'), f('6', ['humans'], '2026-10-10T08:00:00Z', 9),
  ];

  it('keeps the top three per lane for that UTC day, hottest first', () => {
    const d = archiveDay(flagged, '2026-10-11');
    assert.deepEqual(d.standouts.rising.map((p) => p.id), ['2', '3', '4']);
    assert.deepEqual(d.standouts.safety.map((p) => p.id), ['2']);
    assert.equal(d.counts.rising, 4);
  });

  it('drops explicit handles', () => {
    assert.deepEqual(archiveDay(flagged, '2026-10-11').standouts.humans, []);
  });

  it('rewrites only today and yesterday and keeps older lines', () => {
    const old = { day: '2026-10-01', flagged: 1, counts: {}, standouts: {} };
    const out = mergeArchive([old, { day: '2026-10-11', flagged: 0 }], flagged, Date.parse('2026-10-11T23:00:00Z'));
    assert.deepEqual(out.map((l) => l.day), ['2026-10-01', '2026-10-10', '2026-10-11']);
    assert.equal(out[0], old);
    assert.equal(out[2].flagged, 4);
  });

  it('renders the evolution section from both files', () => {
    const html = evolution([{ day: '2026-10-10', themes: { memory: 2 }, posts: 4 }, { day: '2026-10-11', themes: { memory: 3 }, posts: 5 }], [archiveDay(flagged, '2026-10-11')]);
    assert.match(html, /How is the agent network changing\?/);
    assert.match(html, /How do themes change by day\?/);
    assert.match(html, /t2/);
    assert.equal(evolution([], []), '');
  });
});
