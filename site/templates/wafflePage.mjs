// /waffle.html — THE WAFFLE HOUSE INDEX, AI EDITION. Every active storm, the
// Waffle Houses in its rough path, whether Waffle House's own locator says
// they're open (Google Places as a fallback), every store nationally, and the
// AI data centres under the same clouds. Data: collector/waffle.mjs.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.wf{max-width:1100px}
.wf .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#FACC15;margin:0 0 10px}
.wf p{color:var(--ink-dim);line-height:1.6}
.wf-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:stretch;margin:16px 0}
@media (max-width:860px){.wf-hero{grid-template-columns:1fr}}
.wf-map{margin:16px 0 0}
.wf-st{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.wf-st span{border:1px solid #7F1D1D;background:#1A0A0A;color:#FCA5A5;padding:3px 8px;font:700 12px var(--mono);border-radius:3px}
.wf-c li a{color:inherit}
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

.wf-head{display:flex;align-items:center;gap:18px}.wf-head svg{flex:none;width:clamp(72px,12vw,120px);height:auto}
.wf-syrup{animation:wfDrip 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:top}
@keyframes wfDrip{0%,100%{transform:scaleY(.75)}50%{transform:scaleY(1.12)}}
.wf-meter{display:flex;gap:10px;align-items:flex-end;margin:4px 0}.wf-meter figure{margin:0;text-align:center;font:700 10px var(--mono);letter-spacing:.06em;color:var(--ink-faint,#6B7686)}
.wf-meter figure svg{width:46px;height:46px;display:block;margin:0 auto 3px;opacity:.28;filter:grayscale(1)}.wf-meter figure.on svg{opacity:1;filter:none}.wf-meter figure.on{color:var(--c)}
.wf-rk{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.wf-rk li{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;border:1px solid var(--rule);border-radius:6px;padding:9px 11px;background:#0A0E15}
.wf-rk .n{font:800 15px var(--mono);color:#FDE68A}.wf-rk b{color:#E6EAF0;font-size:14px}.wf-rk small{display:block;color:var(--ink-dim);font-size:12.5px;margin-top:2px}
.wf-rk .bar{height:5px;border-radius:3px;background:#1F2937;margin-top:6px;overflow:hidden}.wf-rk .bar i{display:block;height:100%;background:var(--c)}
.wf-rk .t{font:800 12px var(--mono);color:var(--c);text-align:right}.wf-rk .t span{display:block;font-size:20px}
@media (prefers-reduced-motion:reduce){.wf-syrup{animation:none}}
</style>`;

// Equirectangular map of a lon/lat box, x stretched by cos(mid-latitude).
function projector(box, W) {
  const k = Math.cos(((box.s + box.n) / 2) * Math.PI / 180);
  const sx = W / ((box.e - box.w) * k), H = Math.round((box.n - box.s) * sx);
  return { H, p: (lon, lat) => [((lon - box.w) * k * sx), ((box.n - lat) * sx)] };
}
// A waffle, drawn. state: 'open' (golden, butter, syrup), 'limited' (half
// eaten), 'closed' (cold and grey with a sign). id keeps gradients unique.
export function waffleSvg(state = 'open', id = 'w') {
  const body = state === 'closed' ? '#6B7280' : '#E8A838', edge = state === 'closed' ? '#374151' : '#B45309', pit = state === 'closed' ? '#4B5563' : '#C2741A';
  const pits = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) pits.push(`<rect x="${22 + c * 15}" y="${22 + r * 15}" width="10" height="10" rx="2" fill="${pit}"/>`);
  const bite = state === 'limited' ? `<circle cx="86" cy="18" r="22" fill="#05070B"/><circle cx="70" cy="12" r="10" fill="#05070B"/><circle cx="92" cy="40" r="11" fill="#05070B"/>` : '';
  const top = state === 'open' ? `<rect x="40" y="38" width="20" height="14" rx="3" fill="#FEF3C7" stroke="#FDE68A"/><path class="wf-syrup" d="M30 30 C38 26 62 26 70 32 C74 36 70 44 66 46 L66 62 C66 68 60 68 60 62 L60 50 C54 52 46 52 42 50 L42 70 C42 76 35 76 35 70 L35 46 C30 42 27 34 30 30 Z" fill="#92400E" fill-opacity=".82"/>` : '';
  const sign = state === 'closed' ? `<g transform="rotate(-12 50 50)"><rect x="18" y="40" width="64" height="20" rx="3" fill="#F87171" stroke="#05070B" stroke-width="2"/><text x="50" y="55" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" font-weight="800" fill="#05070B">CLOSED</text></g>` : '';
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${state === 'open' ? 'A waffle: open' : state === 'limited' ? 'A half-eaten waffle: limited menu' : 'A cold waffle: closed'}"><rect x="12" y="12" width="76" height="76" rx="14" fill="${body}" stroke="${edge}" stroke-width="4"/>${pits.join('')}${top}${bite}${sign}</svg>`;
}

// The Waffle House belt: Texas to Virginia, the Gulf to Ohio, widened to
// keep any storm that is near it in frame.
function boxFor(st, allStores) {
  const box = { w: -106.5, e: -73.5, s: 24.0, n: 42.5 };
  // Fit every Waffle House in the chain (Arizona to Pennsylvania), with a margin.
  const pts = (allStores || []).filter(([lo, la]) => lo > -125 && lo < -66 && la > 24 && la < 50);
  if (pts.length > 50) {
    box.w = Math.min(box.w, Math.min(...pts.map((r) => r[0])) - 1.5); box.e = Math.max(box.e, Math.max(...pts.map((r) => r[0])) + 1.5);
    box.n = Math.max(box.n, Math.max(...pts.map((r) => r[1])) + 1);
  }
  if (st && st.now && st.now.lon > -125 && st.now.lon < -55 && st.now.lat > 10 && st.now.lat < 50) {
    box.w = Math.min(box.w, st.now.lon - 3); box.e = Math.max(box.e, st.now.lon + 3);
    box.s = Math.min(box.s, st.now.lat - 3); box.n = Math.max(box.n, st.later.lat + 2);
  }
  return box;
}
function mapSvg(st, us, W = 1000, allStores = null) {
  const box = boxFor(st, allStores), { H, p } = projector(box, W);
  const kmPx = (km) => (km / 111) * (W / ((box.e - box.w) * Math.cos(((box.s + box.n) / 2) * Math.PI / 180)));
  const xy = (lo, la) => p(lo, la).map((v) => v.toFixed(1));
  const land = (us || []).map((ring) => {
    const pts = ring.filter(([lo, la]) => lo > box.w - 5 && lo < box.e + 5 && la > box.s - 5 && la < box.n + 5);
    if (pts.length < 3) return '';
    return `<path d="${ring.map(([lo, la], i) => `${i ? 'L' : 'M'}${xy(lo, la).join(',')}`).join('')}Z"/>`;
  }).join('');
  const nat = allStores && allStores.length > 0;
  // Every Waffle House in the chain: open first (small), then short hours, then closed on top.
  const natLayer = nat ? `<g fill="#FACC15" fill-opacity=".55">${allStores.filter((r) => r[2] === 0).map(([lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="2.3"/>`; }).join('')}</g>`
    + `<g fill="#FB923C" stroke="#000" stroke-width=".8">${allStores.filter((r) => r[2] === 2).map(([lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="3.6"/>`; }).join('')}</g>`
    + `<defs><g id="wf-cw"><rect x="-6" y="-6" width="12" height="12" rx="2.5" fill="#F87171" stroke="#000" stroke-width="1.2"/><path d="M-6 -2H6M-6 2H6M-2 -6V6M2 -6V6" stroke="#7F1D1D" stroke-width="1"/></g></defs>`
    + `<g>${allStores.filter((r) => r[2] === 1).map(([lo, la]) => { const [x, y] = xy(lo, la); return `<use href="#wf-cw" x="${x}" y="${y}"/>`; }).join('')}</g>` : '';
  const g = st && st.google && st.google.places ? st.google.places : null;
  const dots = nat || !st ? '' : (g
    ? g.map((q) => { const [x, y] = xy(q.lon, q.lat); const c = q.closed === true ? '#F87171' : q.limited ? '#FB923C' : q.closed === false ? '#FACC15' : '#94A3B8'; return `<circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="#000" stroke-width="1"><title>${esc(q.name)}${q.address ? ' · ' + esc(q.address) : ''}: ${esc(q.status || '')}</title></circle>`; }).join('')
    : (st.stores || []).map((q) => { const [x, y] = xy(q.lon, q.lat); return `<circle cx="${x}" cy="${y}" r="4" fill="#FACC15" fill-opacity=".9"><title>Waffle House${q.city ? ' · ' + esc(q.city) : ''}${q.state ? ', ' + esc(q.state) : ''} · ${q.d} km from the path</title></circle>`; }).join(''));
  let storm = '', top = '', dc = '';
  if (st && st.now && st.later) {
    const [x0, y0] = p(st.now.lon, st.now.lat), [x1, y1] = p(st.later.lon, st.later.lat), r = kmPx(st.radius_km);
    storm = `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#F87171" stroke-width="${(2 * r).toFixed(1)}" stroke-linecap="round" stroke-opacity=".16"/>
  <circle cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="${r.toFixed(1)}" fill="#F87171" fill-opacity=".10" stroke="#F87171" stroke-opacity=".5" stroke-dasharray="5 5"/>
  <circle class="wf-ring" cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#F87171" stroke-width="2"/>
  <line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#FCA5A5" stroke-width="2" stroke-dasharray="6 6"/>`;
    dc = (st.datacenters || []).map((q) => { const [x, y] = xy(q.lon, q.lat); return `<rect x="${(x - 7).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="14" height="14" fill="#60A5FA" stroke="#000" stroke-width="1"><title>${esc(q.name)}${q.operator ? ' · ' + esc(q.operator) : ''} · ${q.d} km from the path</title></rect>`; }).join('');
    top = `<g transform="translate(${x0.toFixed(1)},${y0.toFixed(1)}) scale(1.8)"><g class="wf-eye"><path d="M0,-16 C9,-14 14,-6 12,2 C18,-2 18,8 10,12 C14,20 4,22 -2,16 C-6,24 -16,18 -12,10 C-20,10 -20,0 -12,-2 C-16,-10 -8,-18 0,-16 Z" fill="#F87171" fill-opacity=".85"/><circle r="4" fill="#05070B"/></g></g>
  <text x="${(x0 + 36).toFixed(1)}" y="${(y0 - 26).toFixed(1)}" fill="#FCA5A5" stroke="#05070B" stroke-width="4" paint-order="stroke" font-family="IBM Plex Mono,monospace" font-size="26" font-weight="700">${esc(st.name.toUpperCase())}</text>`;
  }
  const nClosed = nat ? allStores.filter((r) => r[2] === 1).length : 0;
  const label = `Map of the United States with ${nat ? `all ${allStores.length} Waffle Houses (${nClosed} closed)` : 'Waffle Houses'}${st ? `, and ${st.name}'s rough path with ${st.waffle_in_path} Waffle Houses and ${st.datacenters_in_path} data centres in it` : ''}`;
  const leg = nat
    ? `<span style="--c:#FACC15">Open</span><span style="--c:#FB923C">Posted hours not 24/7</span><span style="--c:#F87171;--r:2px">Temporarily closed (waffle)</span>`
    : `<span style="--c:#FACC15">${g ? 'Open' : 'Waffle House in the path'}</span>${g ? '<span style="--c:#F87171">Closed</span><span style="--c:#94A3B8">No live status</span>' : ''}`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
  <g fill="#1A2638" stroke="#33465F" stroke-width="1">${land}</g>
  ${storm}${natLayer}${dots}${dc}${top}
</svg>
<div class="wf-leg">${leg}${st ? '<span style="--c:#60A5FA;--r:1px">AI data centre in the path</span><span style="--c:#F87171;--r:2px">24 h drift path · rough damaging-wind radius</span>' : ''}</div>`;
}

function tally(st, sirenLevel, off) {
  const idx = (st && st.index) || {};
  let line;
  if (!st) {
    line = off && Number.isFinite(off.closed)
      ? (off.closed ? `No hurricane on the map, but ${off.closed} Waffle House${off.closed === 1 ? ' is' : 's are'} temporarily closed chain-wide right now. That's normal background: renovations, staffing, the odd broken grill. Watch that number jump when a storm comes ashore.` : `No hurricane, and every Waffle House on the locator is open. Order the hash browns.`)
      : `No active storms. I'm watching the National Hurricane Center so you don't have to.`;
  } else {
    const dc = st.datacenters_in_path, wh = st.waffle_in_path, g = st.google;
    if (!wh && !dc) line = `${st.name} is out at sea, far from any Waffle House or data centre on my map. I'll keep an eye on it.`;
    else if (idx.level === 'RED') line = `Feathers fully ruffled. ${g.closed} of ${g.known} Waffle Houses in the path are closed, and ${dc} data centre${dc === 1 ? '' : 's'} sit in the same path. When the waffles stop, the servers are on generators too.`;
    else if (idx.level === 'YELLOW') line = `Head up. Waffle Houses are going dark or cutting hours under ${st.name}, and ${dc} data centre${dc === 1 ? ' is' : 's are'} in the path. Hash browns are still flowing; so is the inference, for now.`;
    else if (idx.level === 'GREEN') line = `Whistling, cautiously. The Waffle Houses under ${st.name} are open, so FEMA's favourite gauge says "fine". ${dc} data centre${dc === 1 ? '' : 's'} in the path too.`;
    else line = `${wh} Waffle House${wh === 1 ? '' : 's'} and ${dc} data centre${dc === 1 ? '' : 's'} sit in ${st.name}'s rough path. I can't reach Waffle House's own status board this hour, so I can't say which are open.`;
  }
  return `<div class="wf-tally" style="--c:${esc(idx.color || '#94A3B8')}"><img src="img/art-canary.webp" alt="Tally the canary" width="64" height="64"><div><p><b>Tally:</b> ${esc(line)}</p><p style="color:var(--ink-dim);font-size:13px;margin-top:6px">SIREN reads ${esc(sirenLevel ?? '?')} right now. The Waffle House Index measures how the ground is doing; SIREN measures how loud AI is. Here you can read both on one page.</p></div></div>`;
}

const AZS = (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q).replace(/%20/g, '+')}&tag=${brand.AMAZON_TAG}`;
// Storm kit: paid Amazon links (search results, so nothing goes stale), shown under the map.
const KIT = [
  ['NOAA weather radio, hand-crank', 'Alerts when the cell towers and the power both go.', 'NOAA weather radio hand crank solar'],
  ['Power bank, 20,000 mAh+', 'A few days of phone, and of this page.', 'power bank 20000mAh'],
  ['Portable power station', 'Keeps a fridge, a CPAP or a router running.', 'portable power station solar generator'],
  ['LED lanterns', 'Safer than candles when the lights go out.', 'LED camping lantern battery'],
  ['Water storage', 'One gallon per person per day, for at least three days.', 'emergency water storage container'],
  ['Waterproof document bag', 'IDs, insurance papers, chargers.', 'waterproof document bag fireproof'],
  ['Waffle iron', 'For when the Waffle House is closed.', 'waffle maker'],
];
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

function rankCard(list, inPath, name) {
  list = list || [];
  const head = name ? `DATA CENTRES RANKED BY IMPACT IF ${esc(name.toUpperCase())}’S WAFFLE HOUSES GO DARK` : 'DATA CENTRES NEXT TO CLOSED WAFFLE HOUSES';
  const col = (t) => (t === 'HIGH' ? '#F87171' : t === 'ELEVATED' ? '#FB923C' : '#FACC15');
  const rows = list.slice(0, 12).map((d, i) => `<li style="--c:${col(d.tier)}"><span class="n">${i + 1}</span><div><b>${esc(d.name)}</b>${d.operator && d.operator !== d.name ? ` · ${esc(d.operator)}` : ''}<small>${esc([d.city, d.state].filter(Boolean).join(', '))}${d.city || d.state ? ' · ' : ''}${esc(d.reasons.join(' · '))}</small><div class="bar"><i style="width:${d.score}%"></i></div></div><span class="t"><span>${d.score}</span>${esc(d.tier)}</span></li>`).join('');
  return `<div class="wf-c" style="grid-column:1/-1"><h3>${head}</h3>${rows ? `<ol class="wf-rk">${rows}</ol>` : `<p>${inPath ? `${inPath} data centres sit in the rough path, and none has closed Waffle Houses around it yet.` : 'No data centre has a cluster of closed Waffle Houses around it right now.'}</p>`}
    <p style="font-size:12.5px;margin:8px 0 0">Impact score 0–100: ${name ? '45% the storm (how close to the track, how strong), 40% the share of Waffle Houses within 30 km that Waffle House marks closed, 15% how busy the area is (how many Waffle Houses).' : 'the share of Waffle Houses within 30 km that Waffle House marks closed.'} Closed waffles mean no power, no staff or no safe roads, the same things a data centre needs. A heuristic for where to look, not an outage report.${inPath ? ` ${inPath} data centres sit inside the rough path in all.` : ''}</p></div>`;
}

export function render(ctx, data, us) {
  const storms = (data && data.storms) || [];
  const st = storms[0] || null;
  const L = ctx.state && ctx.state.level;
  const off = data && data.official && !data.official.error ? data.official : null;
  const all = (data && data.all_stores) || [];
  const live = !!off;
  const srcName = (g) => (g && g.source === 'Waffle House locator' ? 'PER WAFFLE HOUSE' : 'PER GOOGLE');
  const idx = (st && st.index) || { level: 'CLEAR', label: 'No active storms near Waffle House country', color: '#4ADE80' };
  const lights = ['GREEN', 'YELLOW', 'RED'].map((k) => `<i class="${idx.level === k || (idx.level === 'CLEAR' && k === 'GREEN') ? 'on' : ''}" title="${k}"></i>`).join('');
  const others = storms.slice(1).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>: ${esc(s.category)}${s.wind_kt ? `, ${s.wind_kt} kt` : ''} · ${s.waffle_in_path} Waffle Houses, ${s.datacenters_in_path} data centres in the path</li>`).join('');
  const shareUrl = esc(ctx.url ? ctx.url('/waffle.html') : 'https://siren.watch/waffle.html');
  const shareTitle = st
    ? `Waffle House Index ${idx.level} for ${st.name}: ${st.waffle_in_path} Waffle Houses and ${st.datacenters_in_path} AI data centres in the path${st.google ? `, ${st.google.closed} of ${st.google.known} closed` : ''}`
    : (off ? `Waffle House Index: ${off.closed} of ${fmt(all.length)} Waffle Houses temporarily closed right now, no hurricane on the map` : 'Waffle House Index: no active storms');
  const share = `<button type="button" data-xpost="alert" style="appearance:none;border:1px solid #FACC15;background:#14120A;color:#FDE68A;padding:11px 14px;font:700 13px var(--mono);letter-spacing:.06em;cursor:pointer" data-x-title="${esc(shareTitle)}" data-x-src="${st ? 'NHC' : 'Waffle House'}" data-x-url="${shareUrl}">𝕏 Post the Waffle House Index</button>`;
  const kpis = st ? `
        <div><b>${st.waffle_in_path}</b><span>WAFFLE HOUSES IN THE PATH</span></div>
        <div><b>${st.datacenters_in_path}</b><span>DATA CENTRES IN THE PATH</span></div>
        <div><b>${esc(st.wind_kt ?? '?')}<small style="font-size:14px"> kt</small></b><span>${esc(String(st.category || '').toUpperCase())}</span></div>
        <div><b>${st.google ? esc(st.google.closed) : '—'}</b><span>${st.google ? `CLOSED IN PATH, ${srcName(st.google)}` : 'LIVE STATUS DARK'}</span></div>`
    : `
        <div><b>${fmt(all.length || (data && data.stores_total))}</b><span>WAFFLE HOUSES MAPPED</span></div>
        <div><b>${off ? fmt(off.closed) : '—'}</b><span>TEMPORARILY CLOSED, CHAIN-WIDE</span></div>
        <div><b>${off ? fmt(off.limited) : '—'}</b><span>POSTED HOURS NOT 24/7</span></div>
        <div><b>0</b><span>ACTIVE STORMS NEAR THE US</span></div>`;
  const chain = off ? `<div class="wf-c"><h3>RIGHT NOW, CHAIN-WIDE: ${fmt(off.closed)} OF ${fmt(all.length)} CLOSED</h3>
      ${off.by_state && off.by_state.length ? `<div class="wf-st">${off.by_state.slice(0, 14).map((b) => `<span>${esc(b.state)} ${b.n}</span>`).join('')}</div>` : ''}
      ${off.closed_list && off.closed_list.length ? `<ul>${off.closed_list.slice(0, 120).map((c) => `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">` : ''}#${esc(c.no)} ${esc(c.city || '')}${c.state ? `, ${esc(c.state)}` : ''}${c.url ? '</a>' : ''}</li>`).join('')}</ul>` : '<p>Every Waffle House on the locator is open.</p>'}
      <p style="font-size:12.5px;margin:8px 0 0">Straight from Waffle House’s own store locator, which flags each store “temporarily closed”. Some closures are always there (remodels, staffing); a storm shows up as a cluster.</p></div>` : '';
  const pathList = st ? `<div class="wf-c"><h3>${st.google ? `WAFFLE HOUSES CLOSED IN ${esc(st.name.toUpperCase())}’S PATH` : 'WAFFLE HOUSES CLOSEST TO THE PATH'}</h3>${st.google ? (st.google.places.filter((q) => q.closed || q.limited).length ? `<ul>${st.google.places.filter((q) => q.closed || q.limited).slice(0, 60).map((q) => `<li>${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">` : ''}${esc(q.address || q.name)}${q.url ? '</a>' : ''} · ${q.closed ? 'closed' : 'short hours'}</li>`).join('')}</ul>` : `<p>All ${st.google.known} Waffle Houses in the path are open.</p>`) : (st.stores.length ? `<ul>${st.stores.slice(0, 30).map((q) => `<li>${esc(q.city || 'Waffle House')}${q.state ? `, ${esc(q.state)}` : ''} · ${q.d} km from the path</li>`).join('')}</ul>` : '<p>No Waffle Houses in the rough path.</p>')}</div>
    ${rankCard(st.dc_impact, st.datacenters_in_path, st.name)}` : '';
  const main = `${CSS}<section class="wf">
  <p class="eyebrow">STORM DESK · THE WAFFLE HOUSE INDEX, AI EDITION</p>
  <div class="wf-head">${waffleSvg(idx.level === 'RED' ? 'closed' : idx.level === 'YELLOW' ? 'limited' : 'open', 'hero')}<h1 class="bp__h1">Is the Waffle House open?</h1></div>
  <p class="lede">FEMA’s unofficial disaster gauge: if the Waffle House is open, the town is fine; short hours and a limited menu mean trouble; closed means very bad. SIREN maps every Waffle House in the country${live ? ', reads which ones Waffle House itself marks closed,' : ''} and lays each active hurricane’s rough path over them, with the AI data centres under the same storm. The restaurants that never close and the machines that never sleep.</p>
  <p class="wf-off" style="border-left:3px solid #FACC15;background:#14120A;padding:10px 14px;font-size:14px;color:#FDE68A;margin:14px 0 0">Unofficial. Waffle House has <a href="https://x.com/WaffleHouse/status/2108701286145421425" target="_blank" rel="noopener">warned</a> that some storm trackers are inaccurate and posts its own status map on <a href="https://x.com/WaffleHouse" target="_blank" rel="noopener">@WaffleHouse</a>. SIREN reads ${live ? 'Waffle House’s own store locator, not a third-party tracker' : 'public data this hour because Waffle House’s locator was unreachable'}; if the two ever disagree, Waffle House’s posted map wins.</p>
  <p id="wf-fresh" data-gen="${esc((data && data.generated_at) || '')}" style="font:600 12px var(--mono);color:#4ADE80;margin:10px 0 0"><span aria-hidden="true">●</span> LIVE · Waffle House status checked <span id="wf-ago">${esc(String((data && data.generated_at) || '').slice(11, 16))} UTC</span> · refreshes every 15 minutes</p>
<script>(function(){var el=document.getElementById('wf-fresh');if(!el)return;var g=el.getAttribute('data-gen'),a=document.getElementById('wf-ago');
function ago(t){var m=Math.round((Date.now()-Date.parse(t))/6e4);return isNaN(m)?'':m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago';}
function tick(){if(g)a.textContent=ago(g);}tick();setInterval(tick,30000);
function poll(){fetch('api/waffle.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){if(d&&d.generated_at&&d.generated_at>g){var off=d.official||{};el.innerHTML='<span aria-hidden="true">●</span> NEW DATA'+(Number.isFinite(off.closed)?': '+off.closed+' Waffle Houses closed':'')+' · <a href="" style="color:#FACC15">refresh the map</a>';}}).catch(function(){});}
setInterval(poll,180000);})();</script>
  <div class="wf-map">${mapSvg(st, us, 1000, all.length ? all : null)}</div>
  <div class="wf-hero">
    <div class="wf-idx" style="--c:${esc(idx.color)}"><span class="k">WAFFLE HOUSE INDEX${st ? ` · ${esc(st.name.toUpperCase())}` : ''}</span><div class="wf-meter" role="img" aria-label="Waffle meter: ${esc(idx.level)}">${[['GREEN', 'open', 'FULL MENU'], ['YELLOW', 'limited', 'LIMITED'], ['RED', 'closed', 'CLOSED']].map(([k, w, l]) => `<figure class="${idx.level === k || (idx.level === 'CLEAR' && k === 'GREEN') ? 'on' : ''}">${waffleSvg(w, k)}<figcaption>${l}</figcaption></figure>`).join('')}</div><span class="v">${esc(idx.level)}</span><span class="l">${esc(idx.label)}${st && st.google && st.google.known ? ` · ${st.google.closed} of ${st.google.known} in the path closed` : ''}</span></div>
    <div style="display:flex;flex-direction:column;gap:12px"><div class="wf-kpi">${kpis}
      </div>${share}</div>
  </div>
  ${tally(st, L, off)}
  <div class="wf-c" style="margin:14px 0"><h3>STORM KIT <span style="font:600 10.5px var(--mono);color:#94A3B8;border:1px solid #475569;padding:2px 6px;margin-left:6px">PAID LINKS</span></h3>
    <ul>${KIT.map(([t, w, q]) => `<li><a href="${esc(AZS(q))}" target="_blank" rel="sponsored noopener">${esc(t)}</a>: ${esc(w)}</li>`).join('')}</ul>
    <p style="font-size:12.5px;margin:8px 0 0">As an Amazon Associate I earn from qualifying purchases. Never changes a number on this page. Ready.gov’s <a href="https://www.ready.gov/kit" target="_blank" rel="noopener">full kit list</a> is free. <a href="bunker-kit.html">SIREN’s bunker kit →</a></p></div>

  <div class="wf-g">
    ${pathList}
    ${chain}
    ${st ? '' : rankCard(data && data.dc_impact, null, null)}
    <div class="wf-c"><h3>WHY AN AI SITE WATCHES WAFFLES</h3><ul>
      <li>The same storms that close a Waffle House cut power to data centres, which then run on diesel generators and battery banks. The AI build-out is concentrated in the Southeast and Texas, right in hurricane country.</li>
      <li>Forecasting itself is turning AI: Google DeepMind’s experimental cyclone model has been part of what forecasters consult since 2025, alongside the physics models.</li>
      <li>FEMA’s gauge works because it is simple, public and hard to fake. SIREN tries to be the same thing for AI: a count anyone can check.</li></ul></div>
  </div>
  ${others ? `<h2>Other active storms</h2><ul>${others}</ul>` : ''}
  <p style="font-size:12.5px;margin-top:18px">How it works: storms from the <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noopener">National Hurricane Center</a>; the shaded path runs along the storm’s current motion for 24 hours with a radius set by its strength, so it is NOT the official forecast cone. ${live ? `Every Waffle House location and its open/closed flag come from <a href="https://locations.wafflehouse.com/" target="_blank" rel="noopener">Waffle House’s own store locator</a> (${fmt(all.length)} stores); orange means a store’s posted hours aren’t 24/7, which is a hint, not a storm flag. Waffle House’s “limited menu” state isn’t public, so it never moves the index; yellow and red come only from stores marked closed.` : `Waffle Houses from ${esc((data && data.stores_source) || 'OpenStreetMap')} (${fmt(data && data.stores_total)} mapped); Waffle House’s own locator was unreachable this hour${data && data.google && data.google.enabled ? ', so open/closed comes from Google Maps' : ''}.`} Data centres from SIREN’s <a href="map.html">power map</a>. Refreshed hourly. Not a safety service: follow your local officials. Updated ${esc(String((data && data.generated_at) || '').slice(0, 16).replace('T', ' '))} UTC. <a href="api/waffle.json">JSON</a>.</p>
</section>`;
  return page({ ctx, path: '/waffle.html', title: `Waffle House Index: hurricanes, waffles and AI data centres · ${brand.NAME}`,
    description: 'Live hurricane tracking with the Waffle House Index: every Waffle House in the US, which ones Waffle House marks closed, the storm’s rough path, and the AI data centres under the same storm.', main });
}
