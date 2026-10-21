// /threats.html — THREAT BOARD. The real things that could take the machines
// offline tonight: software under active attack (CISA KEV), live botnet
// servers (abuse.ch Feodo), the Sun (NOAA geomagnetic storms) and the planet
// (NASA EONET). Data: collector/threats.mjs, every 15 minutes. Source list
// adapted from OSIRIS (MIT).
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const PATH = '/threats.html';
const qTitle = 'What could take the machines offline tonight?';

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
.th-faq{margin:var(--sec,2rem) 0 var(--s-5,1.25rem);max-width:62ch}
.th-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.th-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.th-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.th-faq-key{margin-top:var(--s-4,1rem)!important}
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
  const kevList = kev && kev.latest && kev.latest.length ? `<ul>${kev.latest.map((x) => `<li><a href="https://nvd.nist.gov/vuln/detail/${esc(x.cve)}" target="_blank" rel="noopener">${esc(x.cve)}</a> · <b>${esc(x.vendor)} ${esc(x.product)}</b>: ${esc(x.name)} <small>(${esc(x.added)})</small>${x.ransomware ? '<span class="th-tag" style="background:#7F1D1D;color:#FECACA">RANSOMWARE</span>' : ''}${x.ai ? '<span class="th-tag" style="background:#071520;color:#9AD4F0">AI STACK</span>' : ''}</li>`).join('')}</ul>` : '<p>Nothing new on the list this month, or the feed is dark.</p>';
  const feBox = fe ? `<div class="th-chips">${(fe.by_malware || []).map((m) => `<span>${esc(m.key)} ${m.n}</span>`).join('')}</div><p style="font-size:13px;margin:10px 0 4px">Where the online servers sit:</p><div class="th-chips">${(fe.by_country || []).map((m) => `<span>${esc(m.key)} ${m.n}</span>`).join('')}</div>` : '<p>Feed dark this pass.</p>';
  const spBox = sp && sp.alerts && sp.alerts.length ? `<ul>${sp.alerts.map((a) => `<li><small>${esc(String(a.at || '').slice(0, 16))} UTC</small> ${esc(a.text)}</li>`).join('')}</ul>` : '<p>No current NOAA space-weather alerts.</p>';
  const eoList = eo && eo.latest ? `<ul>${eo.latest.map((e) => `<li>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">` : ''}${esc(e.title)}${e.url ? '</a>' : ''} <small>${esc(e.category || '')}${e.date ? ' · ' + esc(String(e.date).slice(0, 10)) : ''}</small></li>`).join('')}</ul>` : '<p>Feed dark this pass.</p>';

  // Tip #275: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const kevQ = 'Which software was newly exploited (CISA KEV, last 30 days)?';
  const botQ = 'Which botnet families are online?';
  const spaceQ = 'What space weather alerts are active?';
  const natQ = 'Which natural events is NASA tracking?';
  // FAQ answers restate hero / tiles / sources copy only.
  // Refuse: certainty that machines go offline tonight, doom-probability titles,
  // treating a dark feed as all-clear.
  const faq = [
    [qTitle,
      'The AI build-out runs on software, power and satellites. Here is what is attacking or straining each one right now, from public feeds that update all day: newly exploited software (CISA KEV), live botnet servers (abuse.ch Feodo), geomagnetic storm level (NOAA), and open natural events (NASA EONET). Refreshed every 15 minutes.'],
    [kevQ,
      kev
        ? `Flaws added to CISA’s known-exploited list in 7 days · ${kev.ransomware_30d} used by ransomware this month. The board lists newly exploited software from CISA KEV in the last 30 days.`
        : 'Flaws added to CISA’s known-exploited list in 7 days. CISA feed unreachable this pass, so that tile shows “—”.'],
    [botQ,
      fe
        ? `Live command-and-control servers tracked by abuse.ch Feodo Tracker · ${fe.total} on the list, ${fe.online} online.`
        : 'abuse.ch Feodo Tracker feed unreachable this pass, so that tile shows “—”.'],
    [spaceQ,
      sp
        ? `${sp.scale.label} · Kp ${sp.kp} now, ${sp.max_24h} peak in 24 h (NOAA). G3+ storms can trip grids and satellites.`
        : 'NOAA feed unreachable this pass, so that tile shows “—”.'],
    [natQ,
      eo
        ? `Open natural events NASA is tracking: ${(eo.by_category || []).slice(0, 3).map((c) => `${c.n} ${c.key.toLowerCase()}`).join(', ') || eo.open}.`
        : 'NASA EONET unreachable this pass, so that tile shows “—”.'],
    ['Does a dark feed mean everything is clear?',
      'A dark feed shows as “—”, never as all clear. Sources: CISA KEV, abuse.ch Feodo Tracker, NOAA SWPC, NASA EONET. Source list adapted from OSIRIS (MIT).'],
    ['What does SOFTWARE UNDER ATTACK count?',
      kev
        ? `Flaws added to CISA’s known-exploited list in 7 days · ${kev.ransomware_30d} used by ransomware this month. The board lists newly exploited software from CISA KEV in the last 30 days.`
        : 'Flaws added to CISA’s known-exploited list in 7 days. CISA feed unreachable this pass, so that tile shows “—”.'],
    ['Is this a forecast that AI goes offline tonight?',
      'No. It is a live board of public feeds that update all day — exploited software, botnet servers, space weather and natural events — not a prediction that the machines go offline.'],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `${CSS}<section class="th">
  <p class="eyebrow">LIVE · THREAT BOARD</p>
  <h1 class="bp__h1">${esc(qTitle)}</h1>
  <p class="lede">The AI build-out runs on software, power and satellites. Here is what is attacking or straining each one right now, from public feeds that update all day. Refreshed every 15 minutes.</p>
  <div class="th-k">${tiles}</div>
  <div class="th-g">
    <div class="th-c" style="grid-column:1/-1"><h2 id="kev">${esc(kevQ)}</h2>${kevList}</div>
    <div class="th-c"><h2 id="botnets">${esc(botQ)}</h2>${feBox}</div>
    <div class="th-c"><h2 id="space">${esc(spaceQ)}</h2>${spBox}</div>
    <div class="th-c"><h2 id="planet">${esc(natQ)}</h2>${eoList}</div>
  </div>
  <p style="margin-top:16px">Related: <a href="${esc(ctx.href('/status.html'))}">Is ChatGPT down? Is Claude down?</a> · <a href="${esc(ctx.href('/dispatch.html'))}">What public feeds does ${esc(brand.NAME)} Dispatch show?</a> · <a href="${esc(ctx.href('/waffle.html'))}">Is the Waffle House open?</a> · <a href="${esc(ctx.href('/self-aware.html'))}">What if an AI wakes up at 2:14 a.m.?</a></p>
  <p style="font-size:12.5px;margin-top:10px">Sources: <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener">CISA KEV</a>, <a href="https://feodotracker.abuse.ch/" target="_blank" rel="noopener">abuse.ch Feodo Tracker</a>, <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener">NOAA SWPC</a>, <a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noopener">NASA EONET</a>. A dark feed shows as “—”, never as all clear. Source list adapted from <a href="https://github.com/simplifaisoul/osiris" target="_blank" rel="noopener">OSIRIS</a> (MIT). Updated ${esc(String(d.generated_at || '').slice(0, 16).replace('T', ' '))} UTC · <a href="api/threats.json">JSON</a></p>
  <section class="th-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="th-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/status.html'))}">Is ChatGPT down? Is Claude down?</a>
      · <a href="${esc(ctx.href('/exploits.html'))}">How many days from a CVE going public to CISA listing it as exploited?</a>.</p>
  </section>
</section>`;

  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · Threat board · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description: `${qTitle} Live threat board: newly exploited software (CISA KEV), live botnet servers, geomagnetic storm level and open natural disasters, refreshed every 15 minutes. A dark feed shows as “—”, never as all clear.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: qTitle,
        description: 'Live threat board for AI infrastructure: CISA known-exploited vulnerabilities, abuse.ch Feodo botnet servers, NOAA space weather, and NASA EONET natural events. Refreshed every 15 minutes; dark feeds show as unavailable, never as all clear.',
        url: ctx.url(PATH),
        creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
        isAccessibleForFree: true,
        speakable: speakable(['h1.bp__h1', 'p.lede']),
        ...(typeof d.generated_at === 'string' ? { dateModified: d.generated_at } : {}),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}
