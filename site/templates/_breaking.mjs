// The BREAKING strip and the "How fast is SIREN?" box, from data/breaking.json
// (collector/breaking.mjs). Shared by the newsroom and the homepage.
//
// Everything printed is a field of that file: the headline is a published
// item's own headline, "first seen" is SIREN's own detection stamp, and the
// source count is the number of INDEPENDENT outlets the rule counted. Absent
// data renders nothing; it is never filled in.

import { esc, utcClock, duration } from './_html.mjs';

const STRIP_MAX = 3;
const SPEED_ROWS = 10;

/** Live clusters, newest detection first. Never throws on a bad file. */
export function liveClusters(ctx) {
  const b = ctx && ctx.breaking;
  if (!b || !Array.isArray(b.clusters)) return [];
  return b.clusters.filter((c) => c && c.live && c.title && c.url && Number.isFinite(Date.parse(c.first_seen_at)));
}

/**
 * The freshest live cluster under `hours` old, measured against the breaking
 * file's own compile stamp (never the reader's clock). Null when none.
 */
export function freshCluster(ctx, hours = 2) {
  const b = ctx && ctx.breaking;
  const now = Date.parse(b && b.generated_at);
  if (!Number.isFinite(now)) return null;
  return liveClusters(ctx)
    .filter((c) => now - Date.parse(c.first_seen_at) < hours * 3_600_000)
    .sort((a, b2) => Date.parse(b2.first_seen_at) - Date.parse(a.first_seen_at))[0] ?? null;
}

function outletCount(c) {
  return Number.isFinite(c.corroboration) ? c.corroboration : Array.isArray(c.outlets) ? c.outlets.length : 0;
}

/** "first seen 21:14 UTC · 3 sources" */
export function breakingMeta(c) {
  const n = outletCount(c);
  return `first seen ${utcClock(c.first_seen_at)} UTC · ${n} source${n === 1 ? '' : 's'}`;
}

export function xButton(c, cls = 'brk__xp') {
  return `<button type="button" class="${esc(cls)}" data-xpost="news" data-x-title="${esc(c.title)}" data-x-src="${esc(c.outlet || c.source || '')}" data-x-url="${esc(c.url)}" aria-label="Post this story to X">𝕏 Post</button>`;
}

/** The strip at the top of the newsroom. Empty string when nothing is live. */
export function breakingStrip(ctx, { href = (p) => p } = {}) {
  const live = liveClusters(ctx).slice(0, STRIP_MAX);
  if (!live.length) return '';
  const rows = live.map((c) => {
    const outlets = Array.isArray(c.outlets) ? c.outlets.join(', ') : '';
    const rule = Array.isArray(c.rule) ? c.rule.join('; ') : '';
    return `<li class="brk__row">
  <span class="brk__tag" aria-hidden="true">⚡ BREAKING</span><span class="vh">Breaking:</span>
  <span class="brk__meta" title="${esc(`Outlets: ${outlets}. Rule: ${rule}.`)}">${esc(breakingMeta(c))}</span>
  <a class="brk__t" href="${esc(c.url)}" rel="noopener">${esc(c.title)}</a>
  ${xButton(c)}
</li>`;
  }).join('');
  return `<section class="brk" aria-label="Breaking stories">
<ul class="brk__list">${rows}</ul>
<p class="brk__note">Breaking = two independent outlets within 20 minutes, or one lab / wire / major tech desk plus one more.
 <a href="${esc(href('/api/breaking.json'))}">The data</a></p>
</section>`;
}

const human = (s) => (Number.isFinite(s) ? duration(Math.max(0, s)) : '—');

/** The speed box. Empty string until there is at least one sample. */
export function speedBox(ctx, { href = (p) => p } = {}) {
  const sp = ctx && ctx.breaking && ctx.breaking.speed;
  if (!sp || !sp.overall || !Number.isFinite(sp.overall.n) || sp.overall.n === 0) return '';
  const rows = (Array.isArray(sp.by_source) ? sp.by_source : [])
    .filter((r) => r && Number.isFinite(r.median_s) && r.n > 0)
    .slice(0, SPEED_ROWS)
    .map((r) => `<tr><th scope="row">${esc(r.source)}</th><td>${esc(human(r.median_s))}</td><td>${esc(r.n)}</td></tr>`)
    .join('');
  return `<section class="spd" aria-labelledby="spd-h">
  <h3 class="spd__h" id="spd-h">How fast is SIREN?</h3>
  <p class="spd__big"><b>${esc(human(sp.overall.median_s))}</b> median, over ${esc(sp.overall.n)} item${sp.overall.n === 1 ? '' : 's'} in the last ${esc(sp.window_hours ?? 24)}h</p>
  <p class="spd__def">Time from the outlet's own timestamp to SIREN first seeing the item. It includes the outlet's feed delay and
     how often SIREN asks; it is not a comparison with any other service.</p>
  ${rows ? `<div class="spd__wrap"><table class="spd__t"><thead><tr><th scope="col">Source</th><th scope="col">Median</th><th scope="col">Items</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
  <p class="spd__def"><a href="${esc(href('/api/breaking.json'))}">Per-source numbers and the full definition</a></p>
</section>`;
}

export function breakingCss() {
  return `
.brk{border:1px solid #7F1D1D;background:#1A0A0A;padding:10px 12px;margin:0 0 16px;max-width:100%;box-sizing:border-box}
.brk__list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.brk__row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;min-width:0}
.brk__tag{font-weight:700;letter-spacing:.06em;color:#FECACA;background:#450A0A;border:1px solid #991B1B;padding:2px 8px;font-size:13px;white-space:nowrap}
.brk__meta{font-size:13px;color:#FCA5A5;white-space:nowrap}
.brk__t{flex:1 1 260px;min-width:0;color:#fff;font-weight:600;overflow-wrap:anywhere}
.brk__t:hover{text-decoration:underline}
.brk__xp{font:inherit;font-size:12px;padding:3px 8px;border:1px solid #475569;background:#0F172A;color:#E2E8F0;cursor:pointer}
.brk__note{margin:8px 0 0;font-size:12px;color:#CBD5E1}
.brk__note a{color:#FECACA}
.spd{border:1px solid #2B3445;padding:12px;margin:16px 0;max-width:100%;box-sizing:border-box}
.spd__h{margin:0 0 6px;font-size:16px}
.spd__big{margin:0 0 6px}.spd__big b{font-size:22px}
.spd__def{margin:6px 0;font-size:12px;opacity:.85}
.spd__wrap{overflow-x:auto;max-width:100%}
.spd__t{border-collapse:collapse;font-size:13px;min-width:260px}
.spd__t th,.spd__t td{padding:3px 10px 3px 0;text-align:left}
.spd__t td{font-variant-numeric:tabular-nums}
`;
}
