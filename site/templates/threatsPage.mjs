// /threats.html — THREAT BOARD. The real things that could take the machines
// offline tonight: software under active attack (CISA KEV), live botnet
// servers (abuse.ch Feodo), the Sun (NOAA geomagnetic storms) and the planet
// (NASA EONET). Data: collector/threats.mjs, every 15 minutes. Source list
// adapted from OSIRIS (MIT).
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.th{max-width:1100px}.th .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#FB923C;margin:0 0 10px}
.th-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:16px 0}
.th-k div{border:1px solid var(--rule);border-top:4px solid var(--c);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px}
.th-k b{display:block;font:800 34px/1 var(--mono);color:#fff;margin:6px 0}.th-k span{font:700 11.5px var(--mono);letter-spacing:.1em;color:var(--c)}.th-k small{display:block;color:var(--ink-dim);font-size:12.5px;line-height:1.4}
.th-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.th-c{border:1px solid var(--rule);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px}
.th-c h2{margin:0 0 8px;font:700 13px var(--mono);letter-spacing:.1em;color:#FDBA74}
.th-c ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.5;color:var(--ink-dim);max-height:340px;overflow:auto}
.th-tag{display:inline-block;font:700 10px var(--mono);padding:1px 5px;border-radius:3px;margin-left:4px;vertical-align:1px}
.th-chips{display:flex;flex-wrap:wrap;gap:6px}.th-chips span{border:1px solid var(--rule);padding:3px 8px;font:600 12px var(--mono);border-radius:3px;color:var(--ink)}
</style>`;

export function render(ctx, d) {
  d = d || {};
  const kev = d.kev, fe = d.feodo, sp = d.space, eo = d.eonet;
  const tile = (c, k, v, s) => `<div style="--c:${c}"><span>${esc(k)}</span><b>${v}</b><small>${s}</small></div>`;
  const tiles = [
    tile('#F87171', 'SOFTWARE UNDER ATTACK', kev ? esc(kev.added_7d) : '—', kev ? `flaws added to CISA’s known-exploited list in 7 days · ${esc(kev.ransomware_30d)} used by ransomware this month` : 'CISA feed unreachable this pass'),
    tile('#FB923C', 'BOTNET SERVERS ONLINE', fe ? esc(fe.online) : '—', fe ? `live command-and-control servers tracked by abuse.ch Feodo Tracker · ${esc(fe.total)} on the list` : 'abuse.ch feed unreachable this pass'),
    tile(sp ? sp.scale.color : '#64748B', 'THE SUN · GRID RISK', sp ? esc(sp.scale.level) : '—', sp ? `${esc(sp.scale.label)} · Kp ${esc(sp.kp)} now, ${esc(sp.max_24h)} peak in 24 h (NOAA). G3+ storms can trip grids and satellites.` : 'NOAA feed unreachable this pass'),
    tile('#60A5FA', 'THE PLANET', eo ? esc(eo.open) : '—', eo ? `open natural events NASA is tracking: ${esc((eo.by_category || []).slice(0, 3).map((c) => `${c.n} ${c.key.toLowerCase()}`).join(', '))}` : 'NASA EONET unreachable this pass'),
  ].join('');
  const kevList = kev && kev.latest && kev.latest.length ? `<ul>${kev.latest.map((x) => `<li><a href="https://nvd.nist.gov/vuln/detail/${esc(x.cve)}" target="_blank" rel="noopener">${esc(x.cve)}</a> · <b>${esc(x.vendor)} ${esc(x.product)}</b>: ${esc(x.name)} <small>(${esc(x.added)})</small>${x.ransomware ? '<span class="th-tag" style="background:#7F1D1D;color:#FECACA">RANSOMWARE</span>' : ''}${x.ai ? '<span class="th-tag" style="background:#312E81;color:#C7D2FE">AI STACK</span>' : ''}</li>`).join('')}</ul>` : '<p>Nothing new on the list this month, or the feed is dark.</p>';
  const feBox = fe ? `<div class="th-chips">${(fe.by_malware || []).map((m) => `<span>${esc(m.key)} ${m.n}</span>`).join('')}</div><p style="font-size:13px;margin:10px 0 4px">Where the online servers sit:</p><div class="th-chips">${(fe.by_country || []).map((m) => `<span>${esc(m.key)} ${m.n}</span>`).join('')}</div>` : '<p>Feed dark this pass.</p>';
  const spBox = sp && sp.alerts && sp.alerts.length ? `<ul>${sp.alerts.map((a) => `<li><small>${esc(String(a.at || '').slice(0, 16))} UTC</small> ${esc(a.text)}</li>`).join('')}</ul>` : '<p>No current NOAA space-weather alerts.</p>';
  const eoList = eo && eo.latest ? `<ul>${eo.latest.map((e) => `<li>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">` : ''}${esc(e.title)}${e.url ? '</a>' : ''} <small>${esc(e.category || '')}${e.date ? ' · ' + esc(String(e.date).slice(0, 10)) : ''}</small></li>`).join('')}</ul>` : '<p>Feed dark this pass.</p>';
  const main = `${CSS}<section class="th">
  <p class="eyebrow">LIVE · THREAT BOARD</p>
  <h1 class="bp__h1">What could take the machines offline tonight</h1>
  <p class="lede">The AI build-out runs on software, power and satellites. Here is what is attacking or straining each one right now, from public feeds that update all day. Refreshed every 15 minutes.</p>
  <div class="th-k">${tiles}</div>
  <div class="th-g">
    <div class="th-c" style="grid-column:1/-1"><h2>NEWLY EXPLOITED SOFTWARE (CISA KEV, LAST 30 DAYS)</h2>${kevList}</div>
    <div class="th-c"><h2>BOTNET FAMILIES (ABUSE.CH)</h2>${feBox}</div>
    <div class="th-c"><h2>SPACE WEATHER ALERTS (NOAA)</h2>${spBox}</div>
    <div class="th-c"><h2>NATURAL EVENTS (NASA EONET)</h2>${eoList}</div>
  </div>
  <p style="margin-top:16px">Related: <a href="${esc(ctx.href('/status.html'))}">Is ChatGPT down?</a> · <a href="${esc(ctx.href('/dispatch.html'))}">Live quakes &amp; weather</a> · <a href="${esc(ctx.href('/waffle.html'))}">Waffle House Index</a> · <a href="${esc(ctx.href('/self-aware.html'))}">The night it wakes up (fiction)</a></p>
  <p style="font-size:12.5px;margin-top:10px">Sources: <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener">CISA KEV</a>, <a href="https://feodotracker.abuse.ch/" target="_blank" rel="noopener">abuse.ch Feodo Tracker</a>, <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener">NOAA SWPC</a>, <a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noopener">NASA EONET</a>. A dark feed shows as “—”, never as all clear. Source list adapted from <a href="https://github.com/simplifaisoul/osiris" target="_blank" rel="noopener">OSIRIS</a> (MIT). Updated ${esc(String(d.generated_at || '').slice(0, 16).replace('T', ' '))} UTC · <a href="api/threats.json">JSON</a></p>
</section>`;
  return page({ ctx, path: '/threats.html',
    title: `Threat board: exploited software, botnets, solar storms and disasters, live · ${brand.NAME}`,
    description: 'What could take AI and the internet offline tonight: newly exploited software (CISA KEV), live botnet servers, geomagnetic storm level and open natural disasters, refreshed every 15 minutes.',
    main });
}
