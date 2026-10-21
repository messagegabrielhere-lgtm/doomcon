// /compute.html — THE COMPUTE CLOCK. SIREN Labs experiment: largest disclosed
// training run, record ladder, and the doubling time of frontier training
// compute from Epoch AI's notable-models data (CC BY). Plus Epoch's AI data-
// centre stock. Watched, not scored.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.cc{max-width:1100px}.cc .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#A78BFA;margin:0 0 10px}
.cc-q{border-left:3px solid #A78BFA;padding:6px 0 6px 14px;margin:14px 0;font:600 18px/1.45 var(--sans);color:#E9D5FF}
.cc-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0}
.cc-k div{border:1px solid var(--rule);border-top:4px solid var(--c,#A78BFA);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px}
.cc-k b{display:block;font:800 28px/1.05 var(--mono);color:#fff;margin:6px 0}.cc-k span{font:700 11.5px var(--mono);letter-spacing:.1em;color:var(--c,#A78BFA)}.cc-k small{color:var(--ink-dim);font-size:12.5px;display:block;line-height:1.4}
.cc-c{border:1px solid var(--rule);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px;margin:14px 0}
.cc-c h2{margin:0 0 10px;font:700 13px var(--mono);letter-spacing:.1em;color:#C4B5FD}
.cc-c svg{display:block;width:100%;height:auto}
.cc-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}
.cc-t{width:100%;border-collapse:collapse;font-size:14px}.cc-t td,.cc-t th{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left}.cc-t th{font:700 11px var(--mono);color:var(--ink-faint,#6B7686);letter-spacing:.08em}
.cc-t td.n{text-align:right;font-family:var(--mono)}
.cc-bar{height:8px;border-radius:4px;background:#A78BFA;display:block}
.cc-note{font-size:12.5px;color:var(--ink-dim);line-height:1.5;margin:8px 0 0}
</style>`;

const fmt = (n, d = 0) => (n == null || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d }));
const sci = (x) => (x && x.scientific) || '—';

function ladderSvg(ladder) {
  const pts = (ladder || []).filter((p) => Number.isFinite(p.log10) && p.date);
  if (pts.length < 2) return '';
  const t0 = Date.parse(`${pts[0].date}T00:00:00Z`);
  const t1 = Date.parse(`${pts[pts.length - 1].date}T00:00:00Z`);
  const y0 = Math.min(...pts.map((p) => p.log10));
  const y1 = Math.max(...pts.map((p) => p.log10));
  const W = 900; const H = 320; const L = 56; const R = 24; const T = 18; const B = 36;
  const x = (iso) => L + ((Date.parse(`${iso}T00:00:00Z`) - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = y0 + (y1 - y0) * f;
    return `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#1F2937"/><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">${v.toFixed(1)}</text>`;
  }).join('');
  const poly = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.log10).toFixed(1)}`).join(' ');
  const dots = pts.map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.log10).toFixed(1)}" r="3.5" fill="#A78BFA"><title>${esc(p.model || '')} · ${esc(sci(p))}</title></circle>`).join('');
  const last = pts[pts.length - 1];
  const label = `<text x="${Math.min(x(last.date) + 8, W - R - 4).toFixed(1)}" y="${(y(last.log10) - 8).toFixed(1)}" fill="#C4B5FD" font-size="12" font-weight="700" font-family="IBM Plex Mono,monospace">${esc((last.model || '').slice(0, 28))}</text>`;
  const yStart = pts[0].date.slice(0, 4);
  const yEnd = last.date.slice(0, 4);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Record training-compute ladder from ${yStart} to ${yEnd}, log10 FLOP">${grid}<path d="${poly}" fill="none" stroke="#7C3AED" stroke-width="2.5"/>${dots}${label}<text x="${L}" y="${H - 10}" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">${esc(yStart)}</text><text x="${W - R}" y="${H - 10}" text-anchor="end" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">${esc(yEnd)}</text><text x="${L}" y="12" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">log₁₀ FLOP</text></svg>`;
}

export function render(ctx, d) {
  d = d || {};
  const run = d.largest_run || {};
  const trend = d.trend || {};
  const dc = d.data_centers || {};
  const largestDc = dc.largest || {};
  const share = esc(ctx.url ? ctx.url('/compute.html') : 'https://siren.watch/compute.html');
  const maxH = (dc.top && dc.top[0] && dc.top[0].h100_eq) || 1;
  const dcRows = (dc.top || []).map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td>${esc(s.owner || '—')}</td><td class="n">${fmt(s.h100_eq)}</td><td style="width:28%"><i class="cc-bar" style="width:${((s.h100_eq / maxH) * 100).toFixed(1)}%"></i></td><td class="n">${s.power_mw == null ? '—' : fmt(s.power_mw, 0)}</td></tr>`).join('');
  const ladderRows = (d.record_ladder || []).slice().reverse().slice(0, 10).map((r) => `<tr><td>${esc(r.date)}</td><td>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.model || '—')}</a>` : esc(r.model || '—')}</td><td>${esc(r.org || '—')}</td><td class="n">${esc(sci(r))}</td></tr>`).join('');
  const newest = (d.newest_with_flop || []).slice(0, 6).map((m) => `<tr><td>${esc(m.date)}</td><td>${esc(m.model || '—')}</td><td>${esc(m.org || '—')}</td><td class="n">${esc(sci(m))}</td></tr>`).join('');
  const doubling = trend.ok ? `${trend.months_per_doubling}` : '—';
  const growth = trend.ok ? `${trend.growth_per_year}×` : '—';
  const main = `${CSS}<section class="cc">
  <p class="eyebrow">SIREN LABS · THE COMPUTE CLOCK · NOT IN THE SCORE</p>
  <h1 class="bp__h1">How fast is frontier training compute growing?</h1>
  <p class="cc-q">A live clock of the largest disclosed training run, the record ladder, and the doubling time from Epoch AI’s notable-models data.</p>
  <p class="lede">SIREN does not invent FLOP estimates. Epoch AI maintains the public catalogue; this page recomputes the record holders and an ordinary-least-squares doubling time on the frontier subset, and shows Epoch’s AI data-centre stock beside it. The numbers are watched, not scored into the main index.</p>
  ${run.model ? `<div class="cc-k">
    <div style="--c:#A78BFA"><span>LARGEST TRAINING RUN</span><b>${esc(sci(run))}</b><small>${esc(run.model)}${run.org ? ` · ${esc(run.org)}` : ''}${run.date ? ` · ${esc(run.date)}` : ''}</small></div>
    <div style="--c:#22D3EE"><span>DOUBLING TIME</span><b>${esc(doubling)} mo</b><small>${trend.ok ? `${esc(growth)} per year on ${fmt(trend.n)} frontier models since ${esc(trend.from || '2020')}` : esc(trend.error || 'trend not available')}</small></div>
    <div style="--c:#FACC15"><span>LARGEST AI DATA CENTRE</span><b>${largestDc.h100_eq ? fmt(Math.round(largestDc.h100_eq / 1000)) + 'k' : '—'}</b><small>H100-equivalents${largestDc.name ? ` · ${esc(largestDc.name)}` : ''}${largestDc.power_mw != null ? ` · ${fmt(largestDc.power_mw, 0)} MW` : ''}</small></div>
    <div style="--c:#4ADE80"><span>AI DC STOCK (EPOCH)</span><b>${dc.total_h100_eq != null ? (dc.total_h100_eq / 1e6).toFixed(1) + 'M' : '—'}</b><small>H100-eq across ${fmt(dc.sites_covered)} sites · ${fmt(dc.total_power_mw, 0)} MW IT power</small></div>
  </div>
  <div class="cc-c"><h2>RECORD LADDER · LOG₁₀ TRAINING FLOP</h2>${ladderSvg(d.record_ladder)}<p class="cc-note">Each point is a model that set a new all-time high for disclosed training compute in Epoch’s catalogue. Gaps mean no larger run was recorded, not that nothing trained.</p></div>
  <div class="cc-g">
    <div class="cc-c"><h2>RECENT RECORD HOLDERS</h2><table class="cc-t"><thead><tr><th>DATE</th><th>MODEL</th><th>ORG</th><th style="text-align:right">FLOP</th></tr></thead><tbody>${ladderRows}</tbody></table></div>
    <div class="cc-c"><h2>NEWEST WITH A FLOP ESTIMATE</h2><table class="cc-t"><thead><tr><th>DATE</th><th>MODEL</th><th>ORG</th><th style="text-align:right">FLOP</th></tr></thead><tbody>${newest}</tbody></table></div>
  </div>
  <div class="cc-c"><h2>LARGEST AI DATA CENTRES (EPOCH)</h2>
    <table class="cc-t"><thead><tr><th>#</th><th>SITE</th><th>OWNER</th><th style="text-align:right">H100-EQ</th><th></th><th style="text-align:right">MW</th></tr></thead><tbody>${dcRows}</tbody></table>
    <p class="cc-note">IT power and H100-equivalents are Epoch’s independent estimates from satellite imagery, permits and disclosed chip counts. Coverage is partial by design.</p>
  </div>
  <p><button type="button" data-xpost="page" data-x-title="Compute clock: largest disclosed training run is ${esc(sci(run))} FLOP (${esc(run.model || '')}). Frontier training compute is doubling about every ${esc(doubling)} months on Epoch AI’s catalogue." data-x-src="Epoch AI via SIREN" data-x-url="${share}" style="appearance:none;border:1px solid #A78BFA;background:#120F1A;color:#E9D5FF;padding:10px 14px;font:700 13px var(--mono);cursor:pointer">𝕏 Post the compute clock</button></p>` : '<p>The compute-clock data has not been collected yet.</p>'}
  <p>Related: <a href="${esc(ctx.href('/si-watch.html'))}">Takeover Watch</a> · <a href="${esc(ctx.href('/power.html'))}">The power race</a> · <a href="${esc(ctx.href('/labs.html'))}">SIREN Labs</a> · <a href="${esc(ctx.href('/map.html'))}">US data-centre map</a></p>
  <p class="cc-note">Source: <a href="https://epoch.ai/data/notable-ai-models" target="_blank" rel="noopener">Epoch AI notable AI models</a> and <a href="https://epoch.ai/data/ai-data-centers" target="_blank" rel="noopener">AI data centers</a>, CC BY 4.0. ${esc(d.attribution || '')} Refreshed up to twice a day. <a href="${esc(ctx.href('/api/compute-clock.json'))}">JSON</a>. Updated ${esc(String(d.fetched_at || '').slice(0, 16).replace('T', ' '))} UTC.</p>
</section>`;
  return page({
    ctx,
    path: '/compute.html',
    title: `The compute clock: frontier training FLOP and doubling time · ${brand.NAME}`,
    description: run.model
      ? `Largest disclosed AI training run ${sci(run)} FLOP (${run.model}); frontier compute doubling about every ${doubling} months; Epoch AI data centres. Open data, recomputed on SIREN.`
      : `Live clock of frontier AI training compute from Epoch AI’s public datasets, recomputed on SIREN.`,
    main,
  });
}
