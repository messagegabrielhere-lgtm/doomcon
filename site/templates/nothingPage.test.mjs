import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEDGER,
  resolveClaim,
  scoreLedger,
  calmStreak,
  quietShare,
  compute,
} from './nothingPage.mjs';

test('ledger has enough dated claims to eventually score', () => {
  assert.ok(LEDGER.length >= 6);
  for (const row of LEDGER) {
    assert.equal(typeof row.id, 'string');
    assert.equal(typeof row.claim, 'string');
    assert.ok(Number.isFinite(Date.parse(row.due_iso)), row.id);
    assert.ok(/^https?:\/\//.test(row.source_url), row.id);
  }
});

test('resolveClaim honors explicit miss/hit and overdue vs pending', () => {
  const miss = resolveClaim({ outcome: 'miss', due_iso: '2024-01-01' }, '2026-10-09T00:00:00Z');
  assert.equal(miss.status, 'miss');
  const hit = resolveClaim({ outcome: 'hit', due_iso: '2024-01-01' }, '2026-10-09T00:00:00Z');
  assert.equal(hit.status, 'hit');
  const overdue = resolveClaim({ outcome: null, due_iso: '2025-01-01' }, '2026-10-09T00:00:00Z');
  assert.equal(overdue.status, 'overdue');
  const pending = resolveClaim({ outcome: null, due_iso: '2026-12-31' }, '2026-10-09T00:00:00Z');
  assert.equal(pending.status, 'pending');
});

test('scoreLedger refuses to invent a number under three resolved claims', () => {
  const thin = scoreLedger([
    { status: 'miss' },
    { status: 'hit' },
  ]);
  assert.equal(thin.score, null);
  assert.match(thin.reason, /at least 3/);
});

test('scoreLedger is 100 × misses / resolved', () => {
  const full = scoreLedger([
    { status: 'miss' },
    { status: 'miss' },
    { status: 'miss' },
    { status: 'hit' },
  ]);
  assert.equal(full.score, 75);
  assert.equal(full.miss, 3);
  assert.equal(full.hit, 1);
});

test('calmStreak counts until a level change', () => {
  const streak = calmStreak({
    moves: [
      { generated_at: '2026-10-09T12:00:00Z', level: 4, level_name: 'ROUTINE', level_changed: false },
      { generated_at: '2026-10-09T11:00:00Z', level: 4, level_name: 'ROUTINE', level_changed: false },
      { generated_at: '2026-10-09T10:00:00Z', level: 4, level_name: 'ROUTINE', level_changed: true },
    ],
  });
  assert.equal(streak.readings, 3);
  assert.equal(streak.level, 4);
});

test('quietShare needs a minimum window', () => {
  assert.equal(quietShare({ history: [{ level: 4 }, { level: 5 }] }), null);
  const hist = Array.from({ length: 20 }, (_, i) => ({ level: i < 15 ? 5 : 2 }));
  const q = quietShare({ history: hist }, 20);
  assert.equal(q.quiet, 15);
  assert.equal(q.pct, 75);
});

test('compute scores the live ledger against state.generated_at', () => {
  const data = compute({
    state: { generated_at: '2026-10-09T21:00:00Z', level: 4 },
    moves: [],
    history: [],
  });
  assert.ok(Number.isFinite(data.scored.score));
  assert.ok(data.scored.resolved >= 3);
  assert.ok(data.band);
  assert.ok(data.rows.every((r) => ['miss', 'hit', 'pending', 'overdue'].includes(r.status)));
});
