// Gate for X posts from post-pulse (pulse, agent-watch, takeover) and post-daily.
//
// System and health status never goes to X. A post is sent only when the
// index reading is a real number: not degraded, no pillar missing, imputed,
// or waiting on a frozen baseline. Anything else is skipped. The caller logs
// the reason and does not send.
//
// Message types this refuses, in the order they are reported:
//   degraded index notice
//   missing or no frozen baseline
//   imputed values
//   errors
//   status wording
//   health wording

export const BLOCKED_X_MESSAGE_TYPES = Object.freeze([
  { id: 'degraded', label: 'degraded index notice', pattern: /\bdegrad(?:ed|ation)\b/i },
  { id: 'no-frozen-baseline', label: 'missing or no frozen baseline', pattern: /no frozen baseline|without a frozen baseline|awaiting a frozen baseline|awaiting baseline|\bno baseline\b|\buncalibrat\w*/i },
  { id: 'imputed', label: 'imputed values', pattern: /\bimput(?:e|ed|es|ing|ation)\b/i },
  { id: 'error', label: 'errors', pattern: /\berrors?\b/i },
  { id: 'status', label: 'status wording', pattern: /\bstatus\b/i },
  { id: 'health', label: 'health wording', pattern: /\bhealth(?:y|ily)?\b|\bunhealthy\b/i },
]);

const PILLAR_IDS = Object.freeze(['capability', 'compute', 'attention', 'governance', 'markets']);

// PILLARS WHOSE BASELINE IS PENDING BY DESIGN (operator decision, 2026-11-18).
// Markets has no keyless history to freeze against (docs/MARKETS.md) and waits
// on a forward baseline of 300+ days. Until then the homepage publishes the
// reading on the other four pillars with markets marked "not yet scored", and
// X may post that same reading, labelled the same way (partialLabel). This
// covers only a pillar that is uncalibrated AND unscored: an imputed, dark or
// scored-while-uncalibrated markets pillar still blocks, as does every other
// pillar's missing baseline, a degraded index and any failed source.
export const PENDING_BASELINE_OK = Object.freeze(['markets']);

function finiteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function pillarClause(ids, singular, plural) {
  const noun = ids.length === 1 ? 'pillar' : 'pillars';
  return `${noun} ${ids.join(', ')} ${ids.length === 1 ? singular : plural}`;
}

/** Why `text` must not be posted to X, or null when the copy is a reading. */
export function xMessageBlock(text, kind) {
  const hits = [];
  if (kind === 'degraded') hits.push('degraded index notice');
  const body = String(text ?? '');
  for (const type of BLOCKED_X_MESSAGE_TYPES) {
    if (type.pattern.test(body) && !hits.includes(type.label)) hits.push(type.label);
  }
  return hits.length ? hits.join('; ') : null;
}

/**
 * Why this index reading must not be posted to X, or null when it is a real
 * number on every pillar. `degraded`, a dark pillar, an imputed pillar, a
 * pillar with no frozen baseline (except an unscored PENDING_BASELINE_OK
 * pillar, which posts with partialLabel), and a missing composite are all refusals.
 */
export function readingBlockReason(state) {
  if (!state || typeof state !== 'object') return 'no index reading';
  const reasons = [];
  const failed = Array.isArray(state.failed_sources) ? state.failed_sources.filter(Boolean) : [];
  if (state.degraded === true || failed.length > 0) {
    reasons.push(failed.length > 0
      ? `index is degraded (${failed.length} source ${failed.length === 1 ? 'error' : 'errors'})`
      : 'index is degraded');
  }

  const pillars = Array.isArray(state.pillars) ? state.pillars : [];
  const byId = new Map();
  for (const p of pillars) if (p && p.id) byId.set(p.id, p);
  const darkList = new Set(Array.isArray(state.dark_pillars) ? state.dark_pillars : []);
  const uncalList = new Set(Array.isArray(state.uncalibrated_pillars) ? state.uncalibrated_pillars : []);

  const missing = [];
  const baseline = [];
  const imputed = [];
  const noNumber = [];
  for (const id of PILLAR_IDS) {
    const p = byId.get(id);
    if (!p || p.dark === true || darkList.has(id)) {
      missing.push(id);
      continue;
    }
    const uncal = p.uncalibrated === true || uncalList.has(id);
    const scored = finiteNumber(p.score);
    if (p.imputed === true || (uncal && scored)) {
      imputed.push(id);
      continue;
    }
    if (uncal) {
      if (!(PENDING_BASELINE_OK.includes(id) && !scored)) baseline.push(id);
      continue;
    }
    if (!scored) noNumber.push(id);
  }
  if (missing.length) reasons.push(pillarClause(missing, 'is missing', 'are missing'));
  if (baseline.length) reasons.push(pillarClause(baseline, 'has no frozen baseline', 'have no frozen baseline'));
  if (imputed.length) reasons.push(pillarClause(imputed, 'is imputed', 'are imputed'));
  if (noNumber.length) reasons.push(pillarClause(noNumber, 'has no real number', 'have no real number'));

  const imputedSources = [];
  if (Array.isArray(state.sources)) {
    for (const s of state.sources) {
      if (s && s.imputed === true) imputedSources.push(s.id || 'unknown');
    }
  }
  if (imputedSources.length) reasons.push(`source ${imputedSources.join(', ')} is imputed`);
  if (!finiteNumber(state.score)) reasons.push('the reading has no real number');
  return reasons.length ? reasons.join('; ') : null;
}

/**
 * The label an X post carries when the reading stands on fewer than five
 * pillars because a PENDING_BASELINE_OK pillar is unscored, or '' otherwise.
 * Worded to pass xMessageBlock (no "baseline", "uncalibrated", "status").
 */
export function partialLabel(state) {
  if (!state || typeof state !== 'object') return '';
  const uncalList = new Set(Array.isArray(state.uncalibrated_pillars) ? state.uncalibrated_pillars : []);
  const pillars = Array.isArray(state.pillars) ? state.pillars : [];
  const pending = PILLAR_IDS.filter((id) => {
    const p = pillars.find((x) => x && x.id === id);
    return p && PENDING_BASELINE_OK.includes(id) && (p.uncalibrated === true || uncalList.has(id)) && !finiteNumber(p.score);
  });
  if (!pending.length) return '';
  return `Read on ${PILLAR_IDS.length - pending.length} of ${PILLAR_IDS.length} pillars; ${pending.join(', ')} not yet scored.`;
}

// Copy that states the index reading itself. Only such posts need the label;
// a drought count or race price says nothing the missing pillar would change.
const STATES_READING = /\bSIREN [1-5]\b|\bof 100\b|\bcomposite\b|\blevel [1-5]\b/i;

/**
 * `text` with the partial label on its own line when the copy states the
 * reading and the reading stands on fewer than five pillars. Falls back to a
 * short label when the long one would push past `limit` characters.
 */
export function withPartialLabel(text, state, limit = 280) {
  const body = String(text ?? '');
  const label = partialLabel(state);
  if (!label || !STATES_READING.test(body)) return body;
  const long = `${body.trimEnd()}\n${label}`;
  if ([...long].length <= limit) return long;
  return `${body.trimEnd()}\n${label.replace(/^Read on (\d) of (\d) pillars; /, '$1/$2 pillars; ')}`;
}

/** A complete five-pillar reading. Tests and the pulse self-check start here. */
export function indexReading(over = {}) {
  const pillars = over.pillars || PILLAR_IDS.map((id, i) => ({
    id, name: id, score: 40 + i, dark: false, uncalibrated: false,
  }));
  return {
    generated_at: '2026-10-13T14:30:26.823Z',
    score: 49.3,
    level: 4,
    level_name: 'ROUTINE',
    degraded: false,
    dark_pillars: [],
    uncalibrated_pillars: [],
    failed_sources: [],
    sources: [],
    ...over,
    pillars,
  };
}

const REAL_READ = 'SIREN 4, ROUTINE, on a scale where 1 is loudest. Composite 49.3 of 100, as of 14:30 UTC.';

/** The notice that was posted to X from the 14:30 UTC reading. */
export const BASELINE_STATUS_TEXT = 'SIREN is degraded as of 14:30 UTC. 1 of 5 pillars has no frozen baseline yet: markets. The level holds at 4 and nothing is imputed for a pillar the index cannot score.';

export function selfTest() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, ok: true }); } catch (err) { results.push({ name, ok: false, error: err.message }); }
  };
  const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

  check('a real index read with a number is allowed', () => {
    eq(readingBlockReason(indexReading()), null, 'reading');
    eq(xMessageBlock(REAL_READ), null, 'text');
    eq(xMessageBlock(REAL_READ, 'daily'), null, 'daily kind');
  });

  check('degraded index notice is blocked', () => {
    const why = xMessageBlock('SIREN is degraded as of 14:30 UTC.', 'daily');
    if (!/degraded index notice/.test(why)) throw new Error(why);
    eq(xMessageBlock('Composite 49.3 of 100.', 'degraded'), 'degraded index notice', 'kind');
  });

  check('missing or no frozen baseline is blocked', () => {
    for (const text of [
      '1 of 5 pillars has no frozen baseline yet: markets.',
      '2 more have no frozen baseline yet: markets.',
      '3 awaiting a frozen baseline.',
      'Markets has no frozen baseline yet, so it is published and not scored.',
      'published without a frozen baseline.',
      'the source is uncalibrated.',
    ]) {
      const why = xMessageBlock(text);
      if (!/frozen baseline|missing or no frozen baseline/.test(why || '')) throw new Error(`${text} -> ${why}`);
    }
    eq(xMessageBlock('Frozen-baseline median is 4,180.'), null, 'a real median is not a missing baseline');
    eq(xMessageBlock('its 90th percentile against a frozen baseline.'), null, 'a scored percentile is not a missing baseline');
  });

  check('imputed values are blocked', () => {
    const why = xMessageBlock('nothing is imputed for a pillar the index cannot score.');
    if (!/imputed values/.test(why)) throw new Error(why);
  });

  check('errors are blocked', () => {
    const why = xMessageBlock('Collector error on the markets feed. SIREN 4, 49.3 of 100.');
    if (!/errors/.test(why)) throw new Error(why);
    eq(xMessageBlock('ErrorNet shipped. SIREN 4, 49.3 of 100.'), null, 'a name is not the word error');
  });

  check('status wording is blocked', () => {
    const why = xMessageBlock('Skynet status at 14:30 UTC. SIREN 4, 49.3 of 100.');
    if (!/status wording/.test(why)) throw new Error(why);
  });

  check('health wording is blocked', () => {
    for (const text of ['Source health is fine.', 'The pipe is healthy.', 'The pipe is unhealthy.']) {
      const why = xMessageBlock(text);
      if (!/health wording/.test(why || '')) throw new Error(`${text} -> ${why}`);
    }
  });

  check('the 14:30 UTC baseline notice is blocked on every named type it carries', () => {
    const why = xMessageBlock(BASELINE_STATUS_TEXT, 'degraded');
    for (const label of ['degraded index notice', 'missing or no frozen baseline', 'imputed values']) {
      if (!why.includes(label)) throw new Error(`missing ${label} in ${why}`);
    }
  });

  check('a degraded reading is skipped', () => {
    const why = readingBlockReason(indexReading({ degraded: true }));
    if (!/index is degraded/.test(why)) throw new Error(why);
  });

  check('a dark pillar is a missing pillar', () => {
    const why = readingBlockReason(indexReading({
      dark_pillars: ['markets'],
      pillars: indexReading().pillars.map((p) => (p.id === 'markets' ? { ...p, dark: true, score: null } : p)),
    }));
    if (!/pillar markets is missing/.test(why)) throw new Error(why);
  });

  check('unscored markets awaiting its baseline posts, labelled partial', () => {
    const st = indexReading({
      score: 49.3,
      degraded: false,
      uncalibrated_pillars: ['markets'],
      pillars: indexReading().pillars.map((p) => (p.id === 'markets' ? { ...p, uncalibrated: true, score: null } : p)),
    });
    if (readingBlockReason(st) !== null) throw new Error(readingBlockReason(st));
    const t = withPartialLabel(REAL_READ, st);
    if (!/Read on 4 of 5 pillars; markets not yet scored\.$/.test(t)) throw new Error(t);
    if (xMessageBlock(t)) throw new Error(`label trips the copy guard: ${xMessageBlock(t)}`);
    if (withPartialLabel(REAL_READ, indexReading()) !== REAL_READ) throw new Error('a full reading gained a label');
    const drought = '794 of 1,921 mapped US datacentres are in a county at D1 drought or worse.';
    if (withPartialLabel(drought, st) !== drought) throw new Error('a post that states no reading gained a label');
  });

  check('any other pillar with no frozen baseline is still skipped', () => {
    const why = readingBlockReason(indexReading({
      score: 49.3,
      degraded: false,
      uncalibrated_pillars: ['compute'],
      pillars: indexReading().pillars.map((p) => (p.id === 'compute' ? { ...p, uncalibrated: true, score: null } : p)),
    }));
    if (!/pillar compute has no frozen baseline/.test(why)) throw new Error(why);
    if (/no real number/.test(why)) throw new Error(`composite was a number: ${why}`);
  });

  check('an imputed pillar or source is skipped', () => {
    const pillar = readingBlockReason(indexReading({
      pillars: indexReading().pillars.map((p) => (p.id === 'markets' ? { ...p, imputed: true, score: 10 } : p)),
    }));
    if (!/pillar markets is imputed/.test(pillar)) throw new Error(pillar);
    const scoredGap = readingBlockReason(indexReading({
      uncalibrated_pillars: ['markets'],
      pillars: indexReading().pillars.map((p) => (p.id === 'markets' ? { ...p, uncalibrated: true, score: 10 } : p)),
    }));
    if (!/imputed/.test(scoredGap)) throw new Error(scoredGap);
    const source = readingBlockReason(indexReading({ sources: [{ id: 'kalshi', imputed: true }] }));
    if (!/source kalshi is imputed/.test(source)) throw new Error(source);
  });

  check('a reading with no real number is skipped', () => {
    const composite = readingBlockReason(indexReading({ score: null }));
    if (!/the reading has no real number/.test(composite)) throw new Error(composite);
    const pillar = readingBlockReason(indexReading({
      pillars: indexReading().pillars.map((p) => (p.id === 'attention' ? { ...p, score: null } : p)),
    }));
    if (!/pillar attention has no real number/.test(pillar)) throw new Error(pillar);
    eq(readingBlockReason(null), 'no index reading', 'absent');
  });

  check('source errors count as degraded', () => {
    const why = readingBlockReason(indexReading({ degraded: false, failed_sources: ['arxiv'] }));
    if (!/index is degraded/.test(why) || !/error/.test(why)) throw new Error(why);
  });

  return results;
}
