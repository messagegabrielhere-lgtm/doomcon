// Post a Dispatch emergency trigger to X when a fresh high-severity alert
// appears. Uses collector/post-x.mjs (same OAuth path as the daily poster).
//
// Guardrails:
//   - only posts when evaluateEmergency() is active
//   - at most one post per run
//   - never re-posts the same alert id (ledger: posted-alerts.ndjson)
//   - minimum gap between dispatch X posts (MIN_GAP_HOURS)
//   - text always passes preflightX (no URL, mention, BREAKING, !)
//   - each post carries a custom PNG from dispatch/card.mjs (system art +
//     severity + headline), rendered in-process from the same alert object
//   - --dry-run never reads credentials
//
// Usage:
//   node dispatch/post-alerts.mjs --dry-run [dispatch.json]
//   node dispatch/post-alerts.mjs [--snap path] [--ledger path]
//   node dispatch/post-alerts.mjs --selftest

import { createHash } from 'node:crypto';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { dryRun, postToX, preflightX, readCredentials, printResults, sha256, assertPng } from '../collector/post-x.mjs';
import { evaluateEmergency, formatAlertPost, freshTriggers } from './emergency.mjs';
import { renderAlertCard } from './card.mjs';
import { isMain } from './geo.mjs';

export const MIN_GAP_HOURS = 3;
export const LEDGER_NAME = 'posted-alerts.ndjson';

const say = (s) => process.stdout.write(`${s}\n`);

export function textHash(text) {
  return `sha256:${createHash('sha256').update(String(text), 'utf8').digest('hex')}`;
}

export function parseLedger(raw) {
  const out = [];
  String(raw || '').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let row;
    try { row = JSON.parse(line); } catch {
      throw new Error(`${LEDGER_NAME} line ${i + 1} is not JSON; refusing to post until fixed by hand`);
    }
    if (typeof row.alert_id !== 'string' || !Number.isFinite(Date.parse(row.posted_at))) {
      throw new Error(`${LEDGER_NAME} line ${i + 1} lacks alert_id/posted_at; refusing to post`);
    }
    out.push(row);
  });
  return out;
}

export async function readLedger(ledgerPath) {
  try { return parseLedger(await readFile(ledgerPath, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export function gapOk(ledger, { now = Date.now(), minGapHours = MIN_GAP_HOURS } = {}) {
  if (!ledger.length) return { ok: true };
  const last = ledger.reduce((a, b) => (Date.parse(b.posted_at) > Date.parse(a.posted_at) ? b : a));
  const gapMs = now - Date.parse(last.posted_at);
  if (gapMs < minGapHours * 3600000) {
    return { ok: false, why: `last dispatch X post was ${(gapMs / 3600000).toFixed(1)} h ago; wait ${minGapHours} h`, last };
  }
  return { ok: true, last };
}

/**
 * Build the custom card for one alert. Throws if the renderer cannot set a
 * glyph or a required figure is missing — caller skips that alert.
 */
export function cardForAlert(alert) {
  const bytes = renderAlertCard(alert);
  assertPng(bytes);
  return { bytes, sha256: sha256(bytes), name: `dispatch-${alert.system || 'alert'}` };
}

/**
 * Pick the single best fresh trigger to post, or null.
 * @returns {{ pick: { alert, text, sha, card } | null, emergency, why }}
 */
export function pickAlertPost(snap, ledger, { now = Date.now() } = {}) {
  const emergency = evaluateEmergency(snap, { now });
  if (!emergency.active) return { pick: null, emergency, why: 'no emergency triggers' };

  // An EMERGENCY (a great quake, a US extreme) does not wait three hours
  // behind a routine post; it still keeps half an hour of spacing.
  const gap = gapOk(ledger, { now, minGapHours: emergency.level === 1 ? 0.5 : MIN_GAP_HOURS });
  if (!gap.ok) return { pick: null, emergency, why: gap.why };

  const postedIds = ledger.map((r) => r.alert_id);
  const fresh = freshTriggers(emergency, postedIds);
  if (!fresh.length) return { pick: null, emergency, why: 'all triggers already posted' };

  const byId = new Map((snap.alerts || []).map((a) => [a.id, a]));
  for (const id of fresh) {
    const alert = byId.get(id);
    if (!alert) continue;
    try {
      const text = formatAlertPost(alert);
      // Also refuse if this exact text already went out.
      const sha = textHash(text);
      if (ledger.some((r) => r.text_sha256 === sha)) continue;
      const card = cardForAlert(alert);
      return { pick: { alert, text, sha, card }, emergency, why: null };
    } catch (err) {
      say(`[post-alerts] skip ${id}: ${err.message}`);
    }
  }
  return { pick: null, emergency, why: 'no fresh trigger passed preflight' };
}

export async function run({
  snapPath, ledgerPath, dryRun: isDry = false, now = Date.now(), env = process.env, liveLocal = false,
} = {}) {
  if (!isDry && env.GITHUB_ACTIONS !== 'true' && !liveLocal) {
    throw new Error('live dispatch posting runs in GitHub Actions. Use --dry-run, or --live-local if you mean it.');
  }

  const snap = JSON.parse(await readFile(snapPath, 'utf8'));
  const ledger = await readLedger(ledgerPath);
  const { pick, emergency, why } = pickAlertPost(snap, ledger, { now });

  say(`[post-alerts] emergency=${emergency.label} triggers=${emergency.count}`
    + (emergency.primary ? ` primary=${emergency.primary.event}` : ''));

  if (!pick) {
    say(`[post-alerts] nothing to post — ${why}`);
    return { outcome: 'skipped', why, emergency };
  }

  say(`[post-alerts] candidate ${pick.alert.id}`);
  say(pick.text.split('\n').map((l) => `    | ${l}`).join('\n'));
  say(`[post-alerts] card ${pick.card.name} ${pick.card.bytes.length} B ${pick.card.sha256.slice(0, 19)}…`);

  if (isDry) {
    const req = dryRun({ text: pick.text, png: pick.card.bytes });
    say(JSON.stringify(req, null, 2));
    return { outcome: 'dry_run', alert_id: pick.alert.id, emergency, card: pick.card.name };
  }

  const creds = readCredentials(env);
  if (!creds.ok) {
    say(`[post-alerts] skipped — missing ${creds.missing.join(', ')}`);
    return { outcome: 'no_creds', missing: creds.missing, emergency };
  }

  const result = await postToX({ text: pick.text, png: pick.card.bytes, creds: creds.creds });
  const line = {
    channel: 'x',
    mode: 'dispatch',
    alert_id: pick.alert.id,
    system: pick.alert.system,
    event: pick.alert.event,
    severity: pick.alert.severity,
    text_sha256: pick.sha,
    card_sha256: pick.card.sha256,
    card_bytes: pick.card.bytes.length,
    posted_at: new Date().toISOString(),
    outcome: result.outcome,
    remote_id: result.id,
    remote_url: result.url,
  };
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  await appendFile(ledgerPath, `${JSON.stringify(line)}\n`, { flag: 'a' });
  say(`[post-alerts] ${result.outcome === 'posted' ? 'POSTED' : result.outcome} ${result.url || pick.alert.id}`);
  return { outcome: result.outcome, alert_id: pick.alert.id, url: result.url, emergency };
}

export async function selfTest() {
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  };
  const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

  await check('parseLedger fails closed on corrupt JSON', () => {
    let threw = false;
    try { parseLedger('{"alert_id":"x"}\nNOT JSON\n'); } catch { threw = true; }
    if (!threw) throw new Error('did not throw');
  });

  await check('gapOk refuses under MIN_GAP_HOURS', () => {
    const now = Date.parse('2026-10-08T18:00:00Z');
    const ledger = [{ alert_id: 'a', posted_at: '2026-10-08T16:00:00Z', text_sha256: 'x' }];
    eq(gapOk(ledger, { now }).ok, false, 'gap');
    eq(gapOk(ledger, { now: Date.parse('2026-10-08T20:00:00Z') }).ok, true, 'after gap');
  });

  await check('pickAlertPost posts a fresh Extreme NWS once with a custom card', () => {
    const now = Date.parse('2026-10-08T18:00:00Z');
    const alert = {
      id: 'nws:tornado-1', system: 'nws', event: 'Tornado Warning',
      severity: 'Extreme', headline: 'Tornado Warning issued for Test County',
      area: 'Test County', t: now - 600000, lat: 35.2, lon: -97.5,
    };
    const snap = { alerts: [alert] };
    const r1 = pickAlertPost(snap, [], { now });
    if (!r1.pick) throw new Error(`expected pick, got ${r1.why}`);
    preflightX(r1.pick.text);
    if (/\bWarning\b/i.test(r1.pick.text)) throw new Error('Warning leaked into post text');
    if (!/tornado/i.test(r1.pick.text)) throw new Error('tornado angle missing from NWS post');
    if (!r1.pick.card?.bytes?.length) throw new Error('missing custom card bytes');
    assertPng(r1.pick.card.bytes);
    eq(r1.pick.card.name, 'dispatch-nws', 'card name');
    const ledger = [{ alert_id: alert.id, posted_at: '2026-10-08T12:00:00Z', text_sha256: 'old' }];
    const r2 = pickAlertPost(snap, ledger, { now });
    eq(r2.pick, null, 'already posted');
  });

  await check('quiet snapshot posts nothing', () => {
    const r = pickAlertPost({ alerts: [{
      id: 'nws:heat', system: 'nws', event: 'Heat Advisory', severity: 'Moderate',
      headline: 'Heat Advisory', t: Date.now(),
    }] }, []);
    eq(r.pick, null, 'no pick');
    eq(r.emergency.active, false, 'inactive');
  });

  await check('USGS and NHC posts use different skeletons and cards', () => {
    const t = Date.parse('2026-10-08T15:45:00Z');
    const quake = formatAlertPost({
      id: 'usgs:x', system: 'usgs', event: 'M6.4 earthquake', severity: 'Severe',
      headline: 'M6.4 - offshore', area: 'Pacific', t, mag: 6.4,
    });
    const storm = formatAlertPost({
      id: 'nhc:al092026', system: 'nhc', event: 'HU Isaias', severity: 'Extreme',
      headline: 'Isaias: HU, 120 kt', area: 'AL', t, wind_kt: 120,
    });
    preflightX(quake);
    preflightX(storm);
    if (!/USGS|quake/i.test(quake)) throw new Error('usgs voice missing');
    if (!/NHC|Storm|Tropical|kt/i.test(storm)) throw new Error('nhc voice missing');
    if (quake === storm) throw new Error('systems must not share identical text');
    const qc = cardForAlert({
      id: 'usgs:x', system: 'usgs', event: 'M6.4 earthquake', severity: 'Severe',
      headline: 'M6.4 - offshore', area: 'Pacific', t, mag: 6.4, lat: 10, lon: -90,
    });
    const sc = cardForAlert({
      id: 'nhc:al092026', system: 'nhc', event: 'HU Isaias', severity: 'Extreme',
      headline: 'Isaias: HU, 120 kt', area: 'AL', t, wind_kt: 120, lat: 25, lon: -70,
    });
    if (qc.sha256 === sc.sha256) throw new Error('cards must differ by system');
    eq(qc.name, 'dispatch-usgs', 'usgs card');
    eq(sc.name, 'dispatch-nhc', 'nhc card');
  });

  return results;
}

async function main(argv) {
  if (argv.includes('--selftest') || argv.includes('--test')) {
    if (!printResults('post-alerts', await selfTest())) process.exit(1);
    // Also run emergency format smoke.
    const { formatAlertPost: fmt } = await import('./emergency.mjs');
    fmt({
      id: 'usgs:test', system: 'usgs', event: 'M6.2 earthquake', severity: 'Severe',
      headline: 'M6.2 - 10 km from Somewhere', area: 'Somewhere',
      t: Date.parse('2026-10-08T12:00:00Z'), mag: 6.2,
    });
    process.stdout.write('ok   post-alerts  formatAlertPost smoke\n');
    return;
  }

  const isDry = argv.includes('--dry-run');
  const liveLocal = argv.includes('--live-local');
  const snapArg = argv.find((a) => a.startsWith('--snap='))?.slice(7)
    || argv.find((a) => !a.startsWith('--') && a.endsWith('.json'));
  const ledgerArg = argv.find((a) => a.startsWith('--ledger='))?.slice(9);
  const snapPath = snapArg || path.join(process.cwd(), 'dispatch-out', 'dispatch.json');
  const ledgerPath = ledgerArg || path.join(path.dirname(snapPath), LEDGER_NAME);

  const report = await run({ snapPath, ledgerPath, dryRun: isDry, liveLocal });
  if (report.outcome === 'failed') process.exit(1);
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`post-alerts.mjs failed: ${err.message}\n`);
    process.exit(1);
  });
}
