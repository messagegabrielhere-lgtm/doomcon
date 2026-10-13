// /bench.html — live room for this week’s SIREN Labs instruments.
// Built from data/labs-bench.json (collector/labs-bench.mjs). Count, don’t predict.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.bn{max-width:1100px}.bn .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#22D3EE;margin:0 0 10px}
.bn-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0}
.bn-k div{border:1px solid var(--rule);border-top:4px solid var(--c,#22D3EE);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px}
.bn-k b{display:block;font:800 28px/1.05 var(--mono);color:#fff;margin:6px 0 4px}.bn-k span{font:700 11px var(--mono);letter-spacing:.1em;color:var(--c)}.bn-k small{color:var(--ink-dim);font-size:12.5px;line-height:1.4}
.bn-sec{border:1px solid var(--rule);border-radius:8px;background:var(--bg-raised,#0E131D);padding:16px;margin:18px 0}
.bn-sec h2{margin:0 0 8px;font:800 20px/1.2 var(--sans);color:#fff}.bn-sec .q{margin:0 0 12px;font:600 15px/1.4 var(--sans);color:#E6EAF0}
.bn-sec p,.bn-sec li{color:var(--ink-dim);font-size:14px;line-height:1.5}
.bn-t{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:8px}
.bn-t th,.bn-t td{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left}
.bn-t th{font:700 11px var(--mono);color:var(--ink-faint,#6B7686);letter-spacing:.08em}
.bn-t td.n{text-align:right;font-family:var(--mono)}
.bn-spark{width:100%;height:120px;display:block}
.bn-flag{display:inline-block;font:700 10.5px var(--mono);letter-spacing:.08em;padding:2px 7px;border-radius:999px;border:1px solid currentColor}
.bn-dark{color:#6B7686}.bn-note{font-size:12.5px;color:var(--ink-faint,#6B7686);margin-top:10px}
</style>`;

const pct = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—');
const num = (x) => (Number.isFinite(x) ? Number(x).toLocaleString('en-US') : '—');
const hoursLabel = (h) => {
  if (!Number.isFinite(h)) return '—';
  if (h < 1 / 60) return `${Math.round(h * 3600)} sec`;
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(h >= 10 ? 0 : 1)} h`;
  return `${(h / 24).toFixed(1)} days`;
};

function horizonSvg(models) {
  const pts = (models || []).filter((m) => Number.isFinite(m.p50_hours) && m.release_date);
  if (pts.length < 2) return '';
  const xs = pts.map((m) => Date.parse(m.release_date + 'T00:00:00Z'));
  const ys = pts.map((m) => Math.log10(Math.max(m.p50_hours, 1e-4)));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 900, H = 160, L = 48, R = 16, T = 12, B = 24;
  const X = (t) => L + ((t - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const line = pts.map((m, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join('');
  const dots = pts.map((m, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="2.5" fill="${m.is_sota ? '#22D3EE' : '#64748B'}"><title>${esc(m.name)} · ${esc(hoursLabel(m.p50_hours))}</title></circle>`).join('');
  return `<svg class="bn-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="METR 50% task horizon over model release date, log scale">${dots}<path d="${line}" fill="none" stroke="#22D3EE" stroke-width="1.5" opacity=".5"/></svg>`;
}

function computeSvg(envelope) {
  const pts = (envelope || []).filter((e) => Number.isFinite(e.flop) && e.date);
  if (pts.length < 2) return '';
  const xs = pts.map((e) => Date.parse(e.date + 'T00:00:00Z'));
  const ys = pts.map((e) => Math.log10(e.flop));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 900, H = 140, L = 48, R = 16, T = 10, B = 22;
  const X = (t) => L + ((t - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const line = pts.map((e, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join('');
  return `<svg class="bn-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Largest disclosed training FLOP over time, log scale"><path d="${line}" fill="none" stroke="#A78BFA" stroke-width="2"/></svg>`;
}

function kpi(label, value, sub, c) {
  return `<div style="--c:${c}"><span>${esc(label)}</span><b>${value}</b><small>${esc(sub)}</small></div>`;
}

function recursionBlock(ctx, r, hist) {
  if (!r || (!r.ok && !Number.isFinite(r.share))) {
    return `<div class="bn-sec" id="rsi"><h2>The Recursion Meter</h2><p class="bn-dark">Not answering this hour.</p></div>`;
  }
  const rows = (r.repos || []).map((x) => `<tr><td><a href="https://github.com/${esc(x.repo)}" target="_blank" rel="noopener nofollow">${esc(x.repo)}</a></td><td class="n">${num(x.agent_merged)}</td><td class="n">${num(x.merged)}</td><td class="n">${pct(x.share)}</td></tr>`).join('');
  const spark = (hist || []).filter((h) => Number.isFinite(h.recursion_share));
  let sparkSvg = '';
  if (spark.length >= 2) {
    const v = spark.map((h) => h.recursion_share);
    const lo = Math.min(...v), hi = Math.max(...v), rng = hi - lo || 1;
    const d = v.map((x, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1) * 300).toFixed(1)},${(36 - (x - lo) / rng * 28).toFixed(1)}`).join('');
    sparkSvg = `<svg class="bn-spark" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#4ADE80" stroke-width="2"/></svg>`;
  }
  return `<div class="bn-sec" id="rsi">
  <h2>The Recursion Meter</h2>
  <p class="q">How much of the code that builds AI is now written by AI?</p>
  <div class="bn-k">${kpi('AGENT SHARE', pct(r.share), `${num(r.total_agent)} of ${num(r.total_merged)} merged PRs · last ${r.window_days || 7} days`, '#4ADE80')}</div>
  ${sparkSvg}
  <table class="bn-t"><thead><tr><th>REPO</th><th class="n">AGENT</th><th class="n">ALL</th><th class="n">SHARE</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="bn-note">${esc(r.note || '')} GitHub public search; same agent list as <a href="${esc(ctx.href('/si-watch.html'))}">Takeover Watch</a>.</p>
</div>`;
}

function horizonBlock(h) {
  if (!h || !h.ok) {
    return `<div class="bn-sec" id="horizon"><h2>The Task-Horizon Clock</h2><p class="bn-dark">${esc((h && h.error) || 'Not answering this hour.')}</p></div>`;
  }
  const f = h.frontier || {};
  const top = [...(h.models || [])].sort((a, b) => b.p50_minutes - a.p50_minutes).slice(0, 12)
    .map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.release_date)}</td><td class="n">${esc(hoursLabel(m.p50_hours))}</td><td class="n">${m.is_sota ? 'yes' : '—'}</td></tr>`).join('');
  return `<div class="bn-sec" id="horizon">
  <h2>The Task-Horizon Clock</h2>
  <p class="q">How long a job can an AI agent finish on its own?</p>
  <div class="bn-k">
    ${kpi('FRONTIER P50', esc(hoursLabel(f.p50_hours)), `${f.name || '—'} · released ${f.release_date || '—'}`, '#22D3EE')}
    ${kpi('DOUBLING', h.doubling_months != null ? `${h.doubling_months} mo` : '—', h.doubling_days != null ? `METR estimate · ${h.doubling_days} days` : 'METR doubling time', '#22D3EE')}
  </div>
  ${horizonSvg(h.models)}
  <table class="bn-t"><thead><tr><th>MODEL</th><th>RELEASE</th><th class="n">P50 HORIZON</th><th class="n">SOTA</th></tr></thead><tbody>${top}</tbody></table>
  <p class="bn-note">${esc(h.unit || '')}${f.p50_hours > 16 ? ' METR marks readings above 16 hours as less reliable with the current task suite.' : ''} Source: <a href="https://metr.org/time-horizons/" target="_blank" rel="noopener">METR time horizons</a> (${esc(h.benchmark || 'TH')}). <a href="${esc(h.source || 'https://metr.org/assets/benchmark_results_1_1.yaml')}" target="_blank" rel="noopener">Raw YAML</a>.</p>
</div>`;
}

function jumpBlock(j) {
  if (!j || !j.ok) {
    return `<div class="bn-sec" id="jump"><h2>Capability Jump Alarm</h2><p class="bn-dark">${esc((j && j.error) || 'Not answering this hour.')}</p></div>`;
  }
  const rows = (j.flagged || []).slice(0, 15).map((f) => `<tr><td>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener nofollow">${esc(f.model)}</a>` : esc(f.model)}</td><td>${esc(f.org || '—')}</td><td>${esc(f.date)}</td><td class="n">+${esc(f.residual_sigma)}σ</td></tr>`).join('');
  return `<div class="bn-sec" id="jump">
  <h2>Capability Jump Alarm</h2>
  <p class="q">When does a new model land far off the trend?</p>
  <div class="bn-k">
    ${kpi('FLAGGED', esc(String(j.flagged_count ?? 0)), `releases > ${j.sigma_threshold || 2}σ above the FLOP trend`, '#FACC15')}
    ${kpi('TREND σ', j.sigma != null ? esc(String(j.sigma)) : '—', `${(j.trend && j.trend.n) || 0} models with disclosed compute`, '#FACC15')}
  </div>
  ${rows ? `<table class="bn-t"><thead><tr><th>MODEL</th><th>ORG</th><th>DATE</th><th class="n">GAP</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>No release sits more than two standard deviations above the disclosed-compute trend.</p>'}
  <p class="bn-note">${esc(j.method || '')}. ${esc(j.source_note || '')} LMArena and Artificial Analysis leaderboards are named on the Labs card; this live cut uses Epoch’s open compute column until those boards expose a stable public series.</p>
</div>`;
}

function computeBlock(c) {
  if (!c || !c.ok || !c.largest) {
    return `<div class="bn-sec" id="compute"><h2>The Compute Clock</h2><p class="bn-dark">${esc((c && c.error) || 'Not answering this hour.')}</p></div>`;
  }
  const L = c.largest;
  return `<div class="bn-sec" id="compute">
  <h2>The Compute Clock</h2>
  <p class="q">How fast is frontier training compute growing?</p>
  <div class="bn-k">
    ${kpi('LARGEST RUN', esc(L.scientific || '—'), `${L.model || '—'} · ${L.org || '—'} · ${L.date || '—'}`, '#A78BFA')}
    ${kpi('DOUBLING', c.doubling_months != null ? `${c.doubling_months} mo` : '—', 'from the disclosed-FLOP envelope', '#A78BFA')}
  </div>
  ${computeSvg(c.envelope)}
  <p class="bn-note">${esc(c.source_note || '')} <a href="https://epoch.ai/data/notable_ai_models.csv" target="_blank" rel="noopener">Epoch CSV</a>.</p>
</div>`;
}

function silenceBlock(ctx, s) {
  if (!s || !s.ok) {
    return `<div class="bn-sec" id="quiet"><h2>The Lab Silence Index</h2><p class="bn-dark">Not answering this hour.</p></div>`;
  }
  const color = { unusual: '#F87171', long: '#FB923C', normal: '#4ADE80', quiet: '#94A3B8', unread: '#64748B', baseline: '#94A3B8' };
  const rows = (s.labs || []).map((l) => `<tr>
    <td>${esc(l.name)}</td>
    <td class="n">${l.days_silent == null ? '—' : l.days_silent}</td>
    <td class="n">${num(l.news_7d)}</td>
    <td><span class="bn-flag" style="color:${color[l.flag] || '#94A3B8'}">${esc(String(l.flag || '').toUpperCase())}</span></td>
  </tr>`).join('');
  return `<div class="bn-sec" id="quiet">
  <h2>The Lab Silence Index</h2>
  <p class="q">Do labs go quiet before a big release?</p>
  <table class="bn-t"><thead><tr><th>LAB</th><th class="n">DAYS SILENT</th><th class="n">NEWS 7D</th><th>FLAG</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="bn-note">${esc(s.note || '')} Principals from the <a href="${esc(ctx.href('/leaders.html'))}">Leaders</a> tracker; news counts from the newsroom window.</p>
</div>`;
}

export function render(ctx, doc, hist = []) {
  doc = doc || {};
  const at = (doc.generated_at || '').slice(0, 16).replace('T', ' ');
  const share = esc(ctx.url ? ctx.url('/bench.html') : 'https://siren.watch/bench.html');
  const main = `${CSS}<section class="bn">
  <p class="eyebrow">SIREN LABS · LIVE BENCH · WEEK OF OCT 12, 2026</p>
  <h1 class="bp__h1">Is AI building AI yet?</h1>
  <p class="lede">Five open-data instruments from this week’s Labs bench. Each one says what it counts and where the number comes from. None of them is a forecast.</p>
  <p><a href="${esc(ctx.href('/labs.html'))}">← Back to SIREN Labs</a> · <a href="${esc(ctx.href('/api/labs-bench.json'))}">JSON</a></p>
  ${recursionBlock(ctx, doc.recursion, hist)}
  ${horizonBlock(doc.horizon)}
  ${jumpBlock(doc.jump)}
  ${computeBlock(doc.compute)}
  ${silenceBlock(ctx, doc.silence)}
  <p><button type="button" data-xpost="page" data-x-title="SIREN Labs is live: recursion meter, task-horizon clock, capability jumps, compute clock, lab silence — open data, no forecasts" data-x-src="SIREN Labs" data-x-url="${share}" style="appearance:none;border:1px solid #22D3EE;background:transparent;color:#A5F3FC;padding:10px 14px;font:700 13px var(--mono);cursor:pointer">𝕏 Post the bench</button></p>
  <p class="bn-note">Updated ${esc(at || '—')} UTC. Open data only. Show the method. Count, don’t predict.</p>
</section>`;
  return page({
    ctx,
    path: '/bench.html',
    title: `SIREN Labs bench: recursion, horizons, jumps, compute, silence · ${brand.NAME}`,
    description: 'Live open-data instruments from SIREN Labs: how much AI code is written by AI, METR task horizons, capability jumps off the Epoch compute trend, the largest training run, and lab silence.',
    main,
  });
}
