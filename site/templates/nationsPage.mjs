// /nations.html — THE NATIONS RACE. USA vs China (and the rest) for the
// lead in AI: prediction-market odds grouped by each lab's home country,
// the labs each side fields, electricity and mapped data centres.
// Data: site/nations.mjs over data/race.json, data/power.json, world.json.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';
import { NATION } from '../nations.mjs';

const PATH = '/nations.html';
const qTitle = 'USA vs China: who is winning the race to superintelligence?';

const CSS = `<style>
.nr{max-width:1100px}.nr .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#F87171;margin:0 0 10px}
.nr-sb{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:18px 0;padding:18px;border:2px solid #334155;border-radius:12px;background:linear-gradient(90deg,rgba(96,165,250,.14),rgba(7,10,16,.9) 45%,rgba(7,10,16,.9) 55%,rgba(248,113,113,.14))}
.nr-sb .side{display:flex;flex-direction:column;gap:4px}.nr-sb .side.cn{align-items:flex-end;text-align:right}
.nr-sb .fl{font-size:44px;line-height:1}.nr-sb b{font:800 15px var(--mono);letter-spacing:.12em;color:#fff}
.nr-sb .sc{font:900 64px/1 var(--mono);color:#fff;letter-spacing:.04em}.nr-sb .sc i{font-style:normal;color:#64748B;margin:0 10px}
.nr-sb small{grid-column:1/-1;text-align:center;color:var(--ink-dim);font-size:13px}
.nr-m{border:1px solid var(--rule);border-radius:10px;background:var(--bg-raised,#0E131D);padding:14px 16px;margin:12px 0}
.nr-m h2{margin:0 0 4px;font:700 15px/1.3 var(--sans);color:#fff}.nr-m .src{font:600 11.5px var(--mono);color:var(--ink-faint,#6B7686)}
.nr-tug{display:flex;height:34px;border-radius:7px;overflow:hidden;margin:10px 0 6px;border:1px solid #1F2937}
.nr-tug span{display:flex;align-items:center;padding:0 10px;font:800 13px var(--mono);color:#fff;white-space:nowrap;min-width:0}
.nr-tug .us{background:#1D4ED8;justify-content:flex-start}.nr-tug .cn{background:#B91C1C;justify-content:flex-end}.nr-tug .ot{background:#334155;justify-content:center;font-weight:700;color:#CBD5E1}
.nr-lead{font:700 12px var(--mono);letter-spacing:.08em}.nr-lead.us{color:#93C5FD}.nr-lead.cn{color:#FCA5A5}
.nr-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.nr-chips span{font:600 12px var(--mono);padding:3px 8px;border:1px solid #334155;border-radius:999px;color:#CBD5E1}
.nr-labs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;font-size:13.5px}.nr-labs div{color:var(--ink-dim)}.nr-labs b{display:block;color:#fff;margin-bottom:2px}
.nr-note{font-size:12.5px;color:#FCD34D;margin:6px 0 0}
.nr-x{appearance:none;border:1px solid #F87171;background:#1A0A0A;color:#FCA5A5;padding:10px 14px;font:700 13px var(--mono);cursor:pointer}
.nr-faq{margin:var(--sec,2rem) 0 var(--s-5,1.25rem);max-width:62ch}
.nr-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.nr-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.nr-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.nr-faq-key{margin-top:var(--s-4,1rem)!important}
@media (max-width:560px){.nr-sb .sc{font-size:44px}.nr-sb .fl{font-size:32px}.nr-labs{grid-template-columns:1fr}}
</style>`;

const fmt = (m, v) => v == null ? '—' : m.kind === 'pct' ? `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%` : m.kind === 'twh' ? `${Math.round(v).toLocaleString('en-US')} TWh` : Math.round(v).toLocaleString('en-US');

function measureHtml(m) {
  const us = m.by.US || 0, cn = m.by.CN || 0;
  const others = Object.entries(m.by).filter(([k]) => k !== 'US' && k !== 'CN').sort((a, b) => b[1] - a[1]);
  let tug;
  if (m.kind === 'pct' && m.id !== 'kalshi') {
    const ot = Math.max(0, 1 - us - cn);
    tug = `<div class="nr-tug" role="img" aria-label="USA ${fmt(m, us)}, China ${fmt(m, cn)}, others ${fmt(m, ot)}"><span class="us" style="flex:${Math.max(us, 0.04)}">🇺🇸 ${fmt(m, us)}</span>${ot >= 0.005 ? `<span class="ot" style="flex:${Math.max(ot, 0.06)}">${fmt(m, ot)}</span>` : ''}<span class="cn" style="flex:${Math.max(cn, 0.06)}">${fmt(m, cn)} 🇨🇳</span></div>`;
  } else {
    const t = us + cn || 1;
    tug = `<div class="nr-tug" role="img" aria-label="USA ${fmt(m, us)}, China ${fmt(m, cn)}"><span class="us" style="flex:${Math.max(us / t, 0.08)}">🇺🇸 ${fmt(m, us)}</span><span class="cn" style="flex:${Math.max(cn / t, 0.08)}">${fmt(m, cn)} 🇨🇳</span></div>`;
  }
  const lead = m.scored && m.leader ? `<span class="nr-lead ${m.leader.toLowerCase()}">POINT: ${esc(NATION[m.leader].short.toUpperCase())}</span>` : m.scored ? '<span class="nr-lead">TIED</span>' : '<span class="nr-lead">NOT SCORED</span>';
  const chips = others.length ? `<div class="nr-chips">${others.slice(0, 8).map(([k, v]) => `<span>${esc((NATION[k] && NATION[k].flag) || '')} ${esc((NATION[k] && NATION[k].short) || k)} ${esc(fmt(m, v))}</span>`).join('')}</div>` : '';
  const labs = m.list ? `<div class="nr-labs"><div><b>🇺🇸 ${(m.list.US || []).length} American</b>${esc((m.list.US || []).join(', ') || '—')}</div><div><b>🇨🇳 ${(m.list.CN || []).length} Chinese</b>${esc((m.list.CN || []).join(', ') || '—')}</div></div>` : '';
  return `<section class="nr-m" id="${esc(m.id)}"><h2>${esc(m.label)}</h2>${tug}${lead} <span class="src">· ${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener nofollow">${esc(m.src)}</a>` : esc(m.src)}</span>${chips}${labs}${m.note ? `<p class="nr-note">${esc(m.note)}</p>` : ''}</section>`;
}

export function render(ctx, nr) {
  nr = nr || { measures: [], score: { US: 0, CN: 0 } };
  const share = esc(ctx.url ? ctx.url(PATH) : `https://siren.watch${PATH}`);
  const h = nr.head;
  const usOdds = h ? h.by.US || 0 : null, cnOdds = h ? h.by.CN || 0 : null;
  const scored = nr.measures.filter((m) => m.scored).length;
  const xTitle = h ? `USA vs China in AI: the markets give American labs ${(usOdds * 100).toFixed(0)}% and Chinese labs ${(cnOdds * 100).toFixed(1)}% odds of having the best model. Scoreboard: USA ${nr.score.US}, China ${nr.score.CN}.` : 'USA vs China: the race for the best AI, scored live.';

  // Tip #273: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const howQ = 'How does this scoreboard work?';
  // FAQ answers restate hero / scoreboard / how-it-works / disclaimer copy only.
  // Refuse: SIREN forecast of who wins SI, financial advice, doom-probability.
  const faq = [
    [qTitle,
      'The betting markets price which company will have the best AI model. Group those companies by home country and you get the national race, updated every hour. Add the electricity each country can generate and you have the physical side too. Each measure gives one point to whichever of the two leads it.'],
    [howQ,
      'Odds by country add each market\'s live prices for individual companies by home country and scale so the live legs total 100%. Electricity is annual generation from Our World in Data. Data centres mapped in OpenStreetMap are shown but not scored when mapping is sparse.'],
    ['Are the odds SIREN’s forecast of who wins?',
      'Odds are market prices for which country\'s labs hold the best model, not forecasts by SIREN. Market prices are what traders pay, not SIREN\'s view, and can move fast. Not financial advice; prediction markets are restricted in some places.'],
    ['How does the scoreboard award points?',
      'Each measure gives one point to whichever of the two leads it. Odds by country add each market\'s live prices for individual companies by home country and scale so the live legs total 100%. Electricity is annual generation from Our World in Data. Data centres mapped in OpenStreetMap are shown but not scored when mapping is sparse.'],
    ['How is this different from the lab race page?',
      'Related: the lab race ranks companies on live prediction-market odds; this page groups those companies by home country and adds electricity and mapped data centres.'],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `${CSS}<section class="nr">
  <p class="eyebrow">THE NATIONS RACE · LIVE</p>
  <h1 class="bp__h1">${esc(qTitle)}</h1>
  <p class="lede">The betting markets price which company will have the best AI model. Group those companies by home country and you get the national race, updated every hour. Add the electricity each country can generate and you have the physical side too. Each measure gives one point to whichever of the two leads it.</p>
  <div class="nr-sb" role="img" aria-label="Scoreboard: USA ${nr.score.US}, China ${nr.score.CN}, out of ${scored} measures">
    <div class="side us"><span class="fl">🇺🇸</span><b>USA</b>${h ? `<span style="color:#93C5FD;font:700 13px var(--mono)">${(usOdds * 100).toFixed(0)}% ODDS</span>` : ''}</div>
    <div class="sc">${nr.score.US}<i>–</i>${nr.score.CN}</div>
    <div class="side cn"><span class="fl">🇨🇳</span><b>CHINA</b>${h ? `<span style="color:#FCA5A5;font:700 13px var(--mono)">${(cnOdds * 100).toFixed(1)}% ODDS</span>` : ''}</div>
    <small>Points across ${scored} live measures. Odds are market prices for which country's labs hold the best model, not forecasts by SIREN.</small>
  </div>
  ${nr.measures.map(measureHtml).join('')}
  <p style="margin-top:16px"><button type="button" class="nr-x" data-xpost="page" data-x-title="${esc(xTitle)}" data-x-src="SIREN" data-x-url="${share}">𝕏 Post the scoreboard</button></p>
  <h2 id="how" style="margin-top:22px">How does this scoreboard work?</h2>
  <ul>
    <li><b>Odds by country:</b> each market's live prices for individual companies (Google, Anthropic, OpenAI, DeepSeek, Alibaba, Moonshot and others) are added up by the company's home country and scaled so the live legs total 100%.</li>
    <li><b>Kalshi:</b> its companies are not mutually exclusive, so the measure shows each country's best single lab.</li>
    <li><b>Labs priced:</b> how many of each country's companies the market lists at all.</li>
    <li><b>Electricity:</b> annual generation from the open Our World in Data dataset; training and running AI is limited by power.</li>
    <li><b>Data centres:</b> sites mapped by OpenStreetMap volunteers. Mapping in China is sparse, so this is shown but not scored.</li>
  </ul>
  <p>Related: <a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a> · <a href="${esc(ctx.href('/power.html'))}">Who makes the most electricity (China vs US)?</a> · <a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a> · <a href="${esc(ctx.href('/charts.html'))}">What AI charts does ${esc(brand.NAME)} publish?</a></p>
  <p style="font-size:12.5px">Market prices are what traders pay, not SIREN's view, and can move fast. Not financial advice; prediction markets are restricted in some places. Company names belong to their owners. <a href="${esc(ctx.href('/api/nations.json'))}">JSON</a></p>
  <section class="nr-faq" aria-labelledby="faq">
    <h2 id="faq">Questions people actually ask</h2>
    ${faqHtml}
    <p class="nr-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a>
      · <a href="${esc(ctx.href('/power.html'))}">Who makes the most electricity (China vs US)?</a>.</p>
  </section>
</section>`;

  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description: h
      ? `${qTitle} Live: American labs ${(usOdds * 100).toFixed(0)}% vs Chinese labs ${(cnOdds * 100).toFixed(1)}% market odds of the best AI model, plus labs, electricity and data centres. Scoreboard USA ${nr.score.US}, China ${nr.score.CN}. Odds are market prices, not SIREN forecasts.`
      : `${qTitle} The USA vs China race in AI, scored live from prediction markets, electricity and data centres. Odds are market prices, not SIREN forecasts.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: qTitle,
        description: 'USA vs China AI nations race: prediction-market odds by lab home country, frontier labs priced, electricity generation, and mapped data centres. Market prices are not SIREN forecasts.',
        url: ctx.url(PATH),
        creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
        isAccessibleForFree: true,
        speakable: speakable(['h1.bp__h1', 'p.lede']),
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

/** A compact highlight card for the race page and the homepage. */
export function highlightHtml(ctx, nr) {
  if (!nr || !nr.head) return '';
  const us = nr.head.by.US || 0, cn = nr.head.by.CN || 0, ot = Math.max(0, 1 - us - cn);
  return `<a href="${esc(ctx.href(PATH))}" class="nr-hl" style="display:block;margin:16px 0;padding:14px 16px;border:2px solid #F87171;border-radius:12px;background:linear-gradient(90deg,rgba(29,78,216,.25),rgba(11,15,22,.95) 40%,rgba(11,15,22,.95) 60%,rgba(185,28,28,.25));color:#E6EAF0;text-decoration:none">
  <span style="display:block;font:700 11px/1 var(--mono,monospace);letter-spacing:.16em;color:#FCA5A5;margin-bottom:8px">★ FEATURED · THE NATIONS RACE</span>
  <span style="display:flex;align-items:center;justify-content:space-between;gap:10px;font:800 20px/1.2 var(--sans,system-ui)"><span>🇺🇸 USA ${(us * 100).toFixed(0)}%</span><span style="font:800 26px var(--mono,monospace)">${nr.score.US}–${nr.score.CN}</span><span>${(cn * 100).toFixed(1)}% CHINA 🇨🇳</span></span>
  <span style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin:10px 0 6px"><i style="flex:${Math.max(us, 0.03)};background:#3B82F6"></i><i style="flex:${Math.max(ot, 0.01)};background:#475569"></i><i style="flex:${Math.max(cn, 0.03)};background:#EF4444"></i></span>
  <span style="font-size:13px;color:#CBD5E1">Market odds that the best AI model is American vs Chinese, plus labs and electricity. ${esc(qTitle)} →</span></a>`;
}
