// /power.html — THE POWER RACE. Musk's metric (electricity production as the
// truest measure of a large economy) made checkable: who generates the most,
// per person, fastest growing, and the US-China gap. Data: collector/power.mjs
// (Our World in Data energy dataset). Ties to SIREN: AI is the new load.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.pw{max-width:1100px}.pw .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#FACC15;margin:0 0 10px}
.pw-q{border-left:3px solid #FACC15;padding:6px 0 6px 14px;margin:14px 0;font:600 18px/1.45 var(--sans);color:#FEF9C3}
.pw-q cite{display:block;font:600 12px var(--mono);font-style:normal;color:var(--ink-faint,#6B7686);margin-top:4px}
.pw-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0}
.pw-k div{border:1px solid var(--rule);border-top:4px solid var(--c,#FACC15);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px}
.pw-k b{display:block;font:800 30px/1 var(--mono);color:#fff;margin:6px 0}.pw-k span{font:700 11.5px var(--mono);letter-spacing:.1em;color:var(--c,#FACC15)}.pw-k small{color:var(--ink-dim);font-size:12.5px}
.pw-c{border:1px solid var(--rule);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px;margin:14px 0}
.pw-c h2{margin:0 0 10px;font:700 13px var(--mono);letter-spacing:.1em;color:#FDE68A}
.pw-c svg{display:block;width:100%;height:auto}
.pw-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}
.pw-t{width:100%;border-collapse:collapse;font-size:14px}.pw-t td,.pw-t th{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left}.pw-t th{font:700 11px var(--mono);color:var(--ink-faint,#6B7686);letter-spacing:.08em}
.pw-t td.n{text-align:right;font-family:var(--mono)}
.pw-bar{height:8px;border-radius:4px;background:#FACC15;display:block}
</style>`;

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }));
const COL = { china: '#F87171', us: '#60A5FA', india: '#FB923C', eu: '#A78BFA' };
const NAME = { china: 'China', us: 'United States', india: 'India', eu: 'European Union' };

function raceSvg(race) {
  const keys = Object.keys(race || {}).filter((k) => race[k] && race[k].length > 1);
  if (!keys.length) return '';
  const all = keys.flatMap((k) => race[k]);
  const y0 = Math.min(...all.map((p) => p[0])), y1 = Math.max(...all.map((p) => p[0])), max = Math.max(...all.map((p) => p[1]));
  const W = 900, H = 340, L = 60, R = 200, T = 16, B = 30;
  const x = (yr) => L + ((yr - y0) / (y1 - y0 || 1)) * (W - L - R), y = (v) => T + (1 - v / max) * (H - T - B);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => { const v = max * f; return `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#1F2937"/><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">${fmt(v)}</text>`; }).join('');
  const lines = keys.map((k) => { const pts = race[k]; const last = pts[pts.length - 1]; return `<polyline fill="none" stroke="${COL[k]}" stroke-width="3" points="${pts.map(([a, b]) => `${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(' ')}"/><circle cx="${x(last[0]).toFixed(1)}" cy="${y(last[1]).toFixed(1)}" r="4" fill="${COL[k]}"/><text x="${(x(last[0]) + 8).toFixed(1)}" y="${(y(last[1]) + 4).toFixed(1)}" fill="${COL[k]}" font-size="12" font-weight="700" font-family="IBM Plex Mono,monospace">${esc(NAME[k])} ${fmt(last[1])}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Electricity generation in TWh per year since ${y0}: ${keys.map((k) => `${NAME[k]} ${fmt(race[k][race[k].length - 1][1])}`).join(', ')}">${grid}<text x="${L}" y="${H - 8}" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">${y0}</text><text x="${W - R}" y="${H - 8}" text-anchor="end" fill="#6B7686" font-size="11" font-family="IBM Plex Mono,monospace">${y1}</text>${lines}</svg>`;
}

export function render(ctx, d) {
  d = d || {};
  const top = d.top || [];
  const cn = top.find((c) => c.iso === 'CHN'), us = top.find((c) => c.iso === 'USA');
  const ratio = cn && us ? (cn.twh / us.twh).toFixed(1) : null;
  const maxT = top.length ? top[0].twh : 1;
  const share = esc(ctx.url ? ctx.url('/power.html') : 'https://siren.watch/power.html');
  const rows = top.slice(0, 20).map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td class="n">${fmt(c.twh)}</td><td style="width:38%"><i class="pw-bar" style="width:${((c.twh / maxT) * 100).toFixed(1)}%"></i></td><td class="n">${c.growth_5y_pct == null ? '—' : (c.growth_5y_pct > 0 ? '+' : '') + c.growth_5y_pct + '%'}</td></tr>`).join('');
  const pc = (d.per_capita || []).map((c) => `<tr><td>${esc(c.name)}</td><td class="n">${fmt(c.per_capita_kwh)}</td></tr>`).join('');
  const fast = (d.fastest || []).map((c) => `<tr><td>${esc(c.name)}</td><td class="n">+${c.growth_5y_pct}%</td><td class="n">${fmt(c.twh)}</td></tr>`).join('');
  const main = `${CSS}<section class="pw">
  <p class="eyebrow">THE POWER RACE · ELECTRICITY = STRENGTH?</p>
  <h1 class="bp__h1">Who makes the most electricity</h1>
  <blockquote class="pw-q">“Electricity production is the best metric for the true strength of any large-scale economy imo”<cite>ELON MUSK, OCT 10, 2026 · <a href="https://x.com/elonmusk/status/2108952286030356925" target="_blank" rel="noopener">ON X</a></cite></blockquote>
  <p class="lede">So here is the scoreboard. Every country’s electricity generation from the open energy record, the race between the two biggest, and who makes the most per person. It matters for AI too: the data centres SIREN tracks are the fastest-growing new load on the grid.</p>
  ${top.length ? `<div class="pw-k">
    <div style="--c:#F87171"><span>#1 GENERATOR</span><b>${esc(cn ? cn.name : top[0].name)}</b><small>${fmt((cn || top[0]).twh)} TWh in ${esc(d.year)}</small></div>
    <div style="--c:#60A5FA"><span>CHINA vs US</span><b>${ratio ? ratio + '×' : '—'}</b><small>China generates ${ratio || '?'} times what the US does</small></div>
    <div style="--c:#FACC15"><span>WORLD TOTAL</span><b>${fmt(d.world_twh)}</b><small>terawatt-hours in ${esc(d.year)}</small></div>
    <div style="--c:#4ADE80"><span>MOST PER PERSON</span><b>${esc((d.per_capita && d.per_capita[0] || {}).name || '—')}</b><small>${fmt((d.per_capita && d.per_capita[0] || {}).per_capita_kwh)} kWh per person (countries over 5M people)</small></div>
  </div>
  <div class="pw-c"><h2>THE RACE: ELECTRICITY GENERATED PER YEAR (TWh)</h2>${raceSvg(d.race)}</div>
  <div class="pw-g">
    <div class="pw-c" style="grid-column:1/-1"><h2>TOP 20 GENERATORS, ${esc(d.year)}</h2><table class="pw-t"><thead><tr><th>#</th><th>COUNTRY</th><th style="text-align:right">TWh</th><th></th><th style="text-align:right">5-YR</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="pw-c"><h2>MOST PER PERSON (kWh)</h2><table class="pw-t"><tbody>${pc}</tbody></table></div>
    <div class="pw-c"><h2>FASTEST GROWING, 5 YEARS</h2><table class="pw-t"><tbody>${fast}</tbody></table><p style="font-size:12px;margin:6px 0 0;color:var(--ink-dim)">Countries generating at least 50 TWh.</p></div>
  </div>
  <p><button type="button" data-xpost="page" data-x-title="China now generates ${esc(ratio || '?')}× the electricity the US does (${fmt(cn && cn.twh)} vs ${fmt(us && us.twh)} TWh). If power is the truest measure of a large economy, who's really winning?" data-x-src="Our World in Data" data-x-url="${share}" style="appearance:none;border:1px solid #FACC15;background:#14120A;color:#FDE68A;padding:10px 14px;font:700 13px var(--mono);cursor:pointer">𝕏 Post the power race</button></p>` : '<p>The power data has not been collected yet.</p>'}
  <p>Related: <a href="${esc(ctx.href('/watts.html'))}">AI’s power draw</a> · <a href="${esc(ctx.href('/map.html'))}">US data-centre map</a> · <a href="${esc(ctx.href('/world.html'))}">World data centres</a></p>
  <p style="font-size:12.5px;margin-top:14px">Source: <a href="https://github.com/owid/energy-data" target="_blank" rel="noopener">Our World in Data energy dataset</a> (Ember and the Energy Institute), CC BY 4.0. Annual figures, latest year ${esc(d.year || '?')}; refreshed daily. Generation, not consumption; imports and exports are not netted out. <a href="api/power.json">JSON</a></p>
</section>`;
  return page({ ctx, path: '/power.html',
    title: `The power race: who makes the most electricity (China vs US) · ${brand.NAME}`,
    description: `Electricity generation by country, ${d.year || 'latest'}: China ${cn ? fmt(cn.twh) : ''} TWh vs the US ${us ? fmt(us.twh) : ''}, per-person leaders and the fastest growers, from open data. Musk's "best metric" made checkable.`,
    main });
}
