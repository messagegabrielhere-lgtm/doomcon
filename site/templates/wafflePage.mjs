// /waffle.html — THE WAFFLE HOUSE INDEX, AI EDITION. Every active storm, the
// Waffle Houses in its rough path, whether Google says they're open, and the
// AI data centres under the same clouds. Data: collector/waffle.mjs.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.wf{max-width:1100px}
.wf .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#FACC15;margin:0 0 10px}
.wf p{color:var(--ink-dim);line-height:1.6}
.wf-hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px;align-items:stretch;margin:16px 0}
@media (max-width:860px){.wf-hero{grid-template-columns:1fr}}
.wf-idx{border:2px solid var(--c);background:color-mix(in srgb,var(--c) 10%,#05070B);border-radius:8px;padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.wf-idx .k{font:700 12px var(--mono);letter-spacing:.14em;color:var(--c)}
.wf-idx .v{font:800 clamp(30px,6vw,52px)/1 var(--mono);color:var(--c);letter-spacing:.04em}
.wf-idx .l{font:600 15px var(--sans);color:#E6EAF0}
.wf-lights{display:flex;gap:8px;margin:4px 0}.wf-lights i{width:26px;height:26px;border-radius:50%;background:#1F2937;box-shadow:inset 0 0 0 2px #334155}
.wf-lights i.on{background:var(--c);box-shadow:0 0 16px var(--c)}
.wf-kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.wf-kpi div{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;padding:12px}
.wf-kpi b{display:block;font:800 28px/1 var(--mono);color:#fff}.wf-kpi span{font:600 11.5px var(--mono);letter-spacing:.08em;color:var(--ink-faint,#6B7686)}
.wf-map{border:1px solid var(--rule);border-radius:8px;background:radial-gradient(ellipse at 60% 40%,#0B1B30,#04070C 75%);overflow:hidden}
.wf-map svg{display:block;width:100%;height:auto}
.wf-leg{display:flex;flex-wrap:wrap;gap:6px 16px;padding:8px 12px;font:600 12px var(--mono);color:var(--ink-dim);border-top:1px solid var(--rule)}
.wf-leg span::before{content:"";display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;background:var(--c);border-radius:var(--r,50%)}
.wf-eye{animation:wfSpin 6s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes wfSpin{to{transform:rotate(-360deg)}}
.wf-ring{animation:wfPulse 2.8s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes wfPulse{0%{opacity:.55;transform:scale(.6)}100%{opacity:0;transform:scale(1.15)}}
@media (prefers-reduced-motion:reduce){.wf-eye,.wf-ring{animation:none}}
.wf-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin:14px 0}
.wf-c{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;padding:14px}
.wf-c h3{margin:0 0 8px;font:700 13px var(--mono);letter-spacing:.1em;color:#FDE68A}
.wf-c ul{margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-dim);line-height:1.55;max-height:300px;overflow:auto}
.wf-tally{display:flex;gap:14px;align-items:flex-start;border:1px dashed #3F3A12;background:#0D0C06;border-radius:8px;padding:14px;margin:14px 0}
.wf-tally img{width:64px;height:64px;border-radius:50%;flex:none;box-shadow:0 0 0 3px var(--c)}
.wf-tally p{margin:0;color:#FDE68A}
.wf-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.wf-tabs a{border:1px solid var(--rule);padding:6px 10px;color:var(--ink);text-decoration:none;font:600 13px var(--mono)}.wf-tabs a[aria-current]{border-color:#FACC15;color:#FACC15}
</style>`;

// Equirectangular map of a lon/lat box, x stretched by cos(mid-latitude).
function projector(box, W) {
  const k = Math.cos(((box.s + box.n) / 2) * Math.PI / 180);
  const sx = W / ((box.e - box.w) * k), H = Math.round((box.n - box.s) * sx);
  return { H, p: (lon, lat) => [((lon - box.w) * k * sx), ((box.n - lat) * sx)] };
}
function boxFor(st) {
  const r = (st.radius_km || 200) / 111;
  const pts = [st.now, st.later, ...(st.stores || []).slice(0, 200), ...(st.datacenters || [])];
  let w = Math.min(...pts.map((p) => p.lon)) - r * 0.8, e = Math.max(...pts.map((p) => p.lon)) + r * 0.8;
  let s = Math.min(...pts.map((p) => p.lat)) - r * 0.6, n = Math.max(...pts.map((p) => p.lat)) + r * 0.6;
  // At least 9 degrees wide, 2:1-ish, so the coastline reads.
  const cx = (w + e) / 2, cy = (s + n) / 2, half = Math.max(4.5, (e - w) / 2), halfY = Math.max(3.2, (n - s) / 2, half * 0.55);
  return { w: cx - half, e: cx + half, s: cy - halfY, n: cy + halfY };
}
function mapSvg(st, us, W = 1000) {
  const box = boxFor(st), { H, p } = projector(box, W);
  const kmPx = (km) => (km / 111) * (W / ((box.e - box.w) * Math.cos(((box.s + box.n) / 2) * Math.PI / 180)));
  const land = (us || []).map((ring) => {
    const pts = ring.filter(([lo, la]) => lo > box.w - 5 && lo < box.e + 5 && la > box.s - 5 && la < box.n + 5);
    if (pts.length < 3) return '';
    return `<path d="${ring.map(([lo, la], i) => `${i ? 'L' : 'M'}${p(lo, la).map((v) => v.toFixed(1)).join(',')}`).join('')}Z"/>`;
  }).join('');
  const [x0, y0] = p(st.now.lon, st.now.lat), [x1, y1] = p(st.later.lon, st.later.lat), r = kmPx(st.radius_km);
  const closed = new Set(((st.google && st.google.places) || []).filter((q) => q.closed).map((q) => `${q.lat.toFixed(2)},${q.lon.toFixed(2)}`));
  const g = st.google && st.google.places ? st.google.places : null;
  const dots = g
    ? g.map((q) => { const [x, y] = p(q.lon, q.lat); const c = q.closed === true ? '#F87171' : q.closed === false ? '#FACC15' : '#94A3B8'; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${c}" stroke="#000" stroke-width="1.5" r2="1"><title>${esc(q.name)}${q.address ? ' · ' + esc(q.address) : ''}: ${q.closed === true ? 'CLOSED' : q.closed === false ? 'open' : 'unknown'}</title></circle>`; }).join('')
    : (st.stores || []).map((q) => { const [x, y] = p(q.lon, q.lat); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#FACC15" fill-opacity=".9" stroke="#000" stroke-width="1.2"><title>Waffle House${q.city ? ' · ' + esc(q.city) : ''}${q.state ? ', ' + esc(q.state) : ''} · ${q.d} km from the path</title></circle>`; }).join('');
  void closed;
  const dc = (st.datacenters || []).map((q) => { const [x, y] = p(q.lon, q.lat); return `<rect x="${(x - 7).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="14" height="14" fill="#60A5FA" stroke="#000" stroke-width="1"><title>${esc(q.name)}${q.operator ? ' · ' + esc(q.operator) : ''} · ${q.d} km from the path</title></rect>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Map: ${st.name}, ${st.waffle_in_path} Waffle Houses and ${st.datacenters_in_path} data centres in its rough path`)}">
  <g fill="#1A2638" stroke="#33465F" stroke-width="1">${land}</g>
  <line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#F87171" stroke-width="${(2 * r).toFixed(1)}" stroke-linecap="round" stroke-opacity=".14"/>
  <circle cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="${r.toFixed(1)}" fill="#F87171" fill-opacity=".10" stroke="#F87171" stroke-opacity=".5" stroke-dasharray="5 5"/>
  <circle class="wf-ring" cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#F87171" stroke-width="2"/>
  <line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#FCA5A5" stroke-width="2" stroke-dasharray="6 6"/>
  ${dots}${dc}
  <g transform="translate(${x0.toFixed(1)},${y0.toFixed(1)}) scale(1.8)"><g class="wf-eye"><path d="M0,-16 C9,-14 14,-6 12,2 C18,-2 18,8 10,12 C14,20 4,22 -2,16 C-6,24 -16,18 -12,10 C-20,10 -20,0 -12,-2 C-16,-10 -8,-18 0,-16 Z" fill="#F87171" fill-opacity=".85"/><circle r="4" fill="#05070B"/></g></g>
  <text x="${(x0 + 36).toFixed(1)}" y="${(y0 - 26).toFixed(1)}" fill="#FCA5A5" font-family="IBM Plex Mono,monospace" font-size="26" font-weight="700">${esc(st.name.toUpperCase())}</text>
</svg>
<div class="wf-leg"><span style="--c:#FACC15">${st.google ? 'Waffle House: open' : 'Waffle House in the path'}</span>${st.google ? '<span style="--c:#F87171">Waffle House: closed</span><span style="--c:#94A3B8">no live status</span>' : ''}<span style="--c:#60A5FA;--r:1px">Data centre</span><span style="--c:#F87171;--r:2px">24 h drift path · rough damaging-wind radius</span></div>`;
}

function tally(st, sirenLevel) {
  const idx = st.index || {};
  const dc = st.datacenters_in_path, wh = st.waffle_in_path;
  let line;
  if (!wh && !dc) line = `${st.name} is out at sea, far from any Waffle House or data centre on my map. I'll keep an eye on it.`;
  else if (idx.level === 'RED') line = `Feathers fully ruffled. ${st.google.closed} of ${st.google.known} Waffle Houses I can check are closed, and ${dc} data centre${dc === 1 ? '' : 's'} sit in the same path. When the waffles stop, the servers are on generators too.`;
  else if (idx.level === 'YELLOW') line = `Head up. A few Waffle Houses have gone dark under ${st.name}, and ${dc} data centre${dc === 1 ? ' is' : 's are'} in the path. Hash browns are still flowing; so is the inference, for now.`;
  else if (idx.level === 'GREEN') line = `Whistling, cautiously. The Waffle Houses under ${st.name} are open, so FEMA's favourite gauge says "fine". ${dc} data centre${dc === 1 ? '' : 's'} in the path too.`;
  else line = `${wh} Waffle House${wh === 1 ? '' : 's'} and ${dc} data centre${dc === 1 ? '' : 's'} sit in ${st.name}'s rough path. I can't see which are open yet: that needs Google's live data switched on.`;
  return `<div class="wf-tally" style="--c:${esc(idx.color || '#94A3B8')}"><img src="img/art-canary.webp" alt="Tally the canary" width="64" height="64"><div><p><b>Tally:</b> ${esc(line)}</p><p style="color:var(--ink-dim);font-size:13px;margin-top:6px">SIREN reads ${esc(sirenLevel ?? '?')} right now. The Waffle House Index measures how the ground is doing; SIREN measures how loud AI is. Tonight you can read both on one page.</p></div></div>`;
}

export function render(ctx, data, us) {
  const storms = (data && data.storms) || [];
  const st = storms[0] || null;
  const L = ctx.state && ctx.state.level;
  const idx = (st && st.index) || { level: 'CLEAR', label: 'No active storms', color: '#4ADE80' };
  const lights = ['GREEN', 'YELLOW', 'RED'].map((k) => `<i class="${idx.level === k ? 'on' : ''}" title="${k}"></i>`).join('');
  const others = storms.slice(1).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>: ${esc(s.category)}${s.wind_kt ? `, ${s.wind_kt} kt` : ''} · ${s.waffle_in_path} Waffle Houses, ${s.datacenters_in_path} data centres in the path</li>`).join('');
  const share = st ? `<button type="button" data-xpost="alert" style="appearance:none;border:1px solid #FACC15;background:#14120A;color:#FDE68A;padding:11px 14px;font:700 13px var(--mono);letter-spacing:.06em;cursor:pointer" data-x-title="${esc(`Waffle House Index ${idx.level} for ${st.name}: ${st.waffle_in_path} Waffle Houses and ${st.datacenters_in_path} AI data centres in the path${st.google ? `, ${st.google.closed} of ${st.google.known} checked are closed` : ''}`)}" data-x-src="NHC" data-x-url="${esc(ctx.url ? ctx.url('/waffle.html') : 'https://siren.watch/waffle.html')}">𝕏 Post the Waffle House Index</button>` : '';
  const main = `${CSS}<section class="wf">
  <p class="eyebrow">STORM DESK · THE WAFFLE HOUSE INDEX, AI EDITION</p>
  <h1 class="bp__h1">Is the Waffle House open?</h1>
  <p class="lede">FEMA’s unofficial disaster gauge: if the Waffle House is open, the town is fine; a limited menu means trouble; closed means very bad. SIREN follows every active hurricane, finds the Waffle Houses in its rough path, asks Google whether they’re open, and puts the AI data centres under the same storm beside them. The restaurants that never close and the machines that never sleep.</p>
  ${st ? `<div class="wf-hero">
    <div class="wf-map">${mapSvg(st, us)}</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="wf-idx" style="--c:${esc(idx.color)}"><span class="k">WAFFLE HOUSE INDEX · ${esc(st.name.toUpperCase())}</span><div class="wf-lights">${lights}</div><span class="v">${esc(idx.level)}</span><span class="l">${esc(idx.label)}${st.google && st.google.known ? ` · ${st.google.closed} of ${st.google.known} checked are closed` : ''}</span></div>
      <div class="wf-kpi">
        <div><b>${st.waffle_in_path}</b><span>WAFFLE HOUSES IN THE PATH</span></div>
        <div><b>${st.datacenters_in_path}</b><span>DATA CENTRES IN THE PATH</span></div>
        <div><b>${esc(st.wind_kt ?? '?')}<small style="font-size:14px"> kt</small></b><span>${esc(st.category.toUpperCase())}</span></div>
        <div><b>${st.google ? esc(st.google.closed) : '—'}</b><span>${st.google ? 'CLOSED, PER GOOGLE' : 'LIVE STATUS OFF'}</span></div>
      </div>
      ${share}
    </div>
  </div>
  ${tally(st, L)}
  <div class="wf-g">
    <div class="wf-c"><h3>AI DATA CENTRES IN THE PATH</h3>${st.datacenters.length ? `<ul>${st.datacenters.slice(0, 30).map((d) => `<li><b>${esc(d.name)}</b>${d.operator ? ` · ${esc(d.operator)}` : ''}${d.city ? ` · ${esc(d.city)}` : ''}${d.state ? `, ${esc(d.state)}` : ''} · ${d.d} km</li>`).join('')}</ul>` : '<p>None on SIREN’s data-centre map are inside the rough path.</p>'}</div>
    <div class="wf-c"><h3>${st.google ? 'WAFFLE HOUSES GOOGLE SAYS ARE CLOSED' : 'WAFFLE HOUSES CLOSEST TO THE PATH'}</h3>${st.google ? (st.google.places.filter((q) => q.closed).length ? `<ul>${st.google.places.filter((q) => q.closed).slice(0, 40).map((q) => `<li>${esc(q.address || q.name)}${q.status === 'CLOSED_TEMPORARILY' ? ' · temporarily closed' : ' · closed right now'}</li>`).join('')}</ul>` : '<p>Every Waffle House Google could check in the path is open.</p>') : (st.stores.length ? `<ul>${st.stores.slice(0, 30).map((q) => `<li>${esc(q.city || 'Waffle House')}${q.state ? `, ${esc(q.state)}` : ''} · ${q.d} km from the path</li>`).join('')}</ul>` : '<p>No Waffle Houses in the rough path.</p>')}</div>
    <div class="wf-c"><h3>WHY AN AI SITE WATCHES WAFFLES</h3><ul>
      <li>The same storms that close a Waffle House cut power to data centres, which then run on diesel generators and battery banks. The AI build-out is concentrated in the Southeast and Texas, right in hurricane country.</li>
      <li>Forecasting itself is turning AI: Google DeepMind’s experimental cyclone model has been part of what forecasters consult since 2025, alongside the physics models.</li>
      <li>FEMA’s gauge works because it is simple, public and hard to fake. SIREN tries to be the same thing for AI: a count anyone can check.</li></ul></div>
  </div>
  ${others ? `<h2>Other active storms</h2><ul>${others}</ul>` : ''}` : `<div class="wf-idx" style="--c:#4ADE80;max-width:520px"><span class="k">WAFFLE HOUSE INDEX</span><div class="wf-lights"><i class="on" style="--c:#4ADE80"></i><i></i><i></i></div><span class="v">CLEAR</span><span class="l">No active Atlantic or eastern Pacific storms right now. Order the hash browns.</span></div>`}
  <p style="font-size:12.5px;margin-top:18px">How it works: storms from the <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noopener">National Hurricane Center</a>; the shaded path runs along the storm’s current motion for 24 hours with a radius set by its strength, so it is NOT the official forecast cone. Waffle House locations from <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener">OpenStreetMap</a> (${esc(data && data.stores_total || 0)} mapped); open or closed from Google Maps data${data && data.google && data.google.enabled ? `, ${esc(data.google.calls)} lookups this hour` : ' once the owner switches it on'}. A Waffle House is open 24 hours, so “not open now” counts as closed. Data centres from SIREN’s <a href="map.html">power map</a>. Not a safety service: follow your local officials. Updated ${esc(String((data && data.generated_at) || '').slice(0, 16).replace('T', ' '))} UTC. <a href="api/waffle.json">JSON</a>.</p>
</section>`;
  return page({ ctx, path: '/waffle.html', title: `Waffle House Index: hurricanes, waffles and AI data centres · ${brand.NAME}`,
    description: 'Live hurricane tracking with the Waffle House Index: which Waffle Houses are in the storm’s path, whether Google says they’re open, and the AI data centres under the same storm.', main });
}
