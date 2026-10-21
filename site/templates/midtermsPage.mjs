// /midterms.html — 2026 midterm AI stance board.
//
// Coarse tags only: pro / against / neutral, each tied to a cited public
// statement. Not a doom score, not an endorsement, not a forecast of who
// wins a race. Static HTML so screenshots and crawlers see the counts.

import { esc, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const PATH = '/midterms.html';
export const Q_TITLE = 'Who is pro-AI, against, or neutral in the 2026 midterms?';

const STANCE = {
  pro: { label: 'Pro', short: 'PRO', color: '#4ADE80', ink: '#052E16', blurb: 'Accelerate / build' },
  against: { label: 'Against', short: 'AGAINST', color: '#F87171', ink: '#450A0A', blurb: 'Guardrails-first' },
  neutral: { label: 'Neutral', short: 'NEUTRAL', color: '#FACC15', ink: '#1C1403', blurb: 'Mixed / thin record' },
};

export function hasMidterms(ctx) {
  return Boolean(ctx && ctx.midterms && Array.isArray(ctx.midterms.races) && ctx.midterms.races.length);
}

/** Totals and flat candidate rows derived from the committed JSON. */
export function midtermsModel(data) {
  if (!data || !Array.isArray(data.races)) {
    return { races: [], candidates: [], totals: { races: 0, candidates: 0, pro: 0, against: 0, neutral: 0 } };
  }
  const candidates = [];
  const totals = { races: data.races.length, candidates: 0, pro: 0, against: 0, neutral: 0 };
  for (const race of data.races) {
    for (const c of race.candidates || []) {
      const stance = STANCE[c.stance] ? c.stance : 'neutral';
      totals.candidates += 1;
      totals[stance] += 1;
      candidates.push({ ...c, stance, race });
    }
  }
  return { races: data.races, candidates, totals, data };
}

const CHAMBERS = [
  ['senate', 'Senate', 'U.S. Senate races'],
  ['house', 'House', 'U.S. House races'],
  ['governor', 'Governor', 'Governor races'],
];

/** Races grouped by chamber, in a fixed order; unknown chambers land last. */
export function racesByChamber(races) {
  const known = new Set(CHAMBERS.map(([k]) => k));
  const groups = CHAMBERS.map(([key, short, label]) => ({ key, short, label, races: races.filter((r) => r.chamber === key) }));
  const other = races.filter((r) => !known.has(r.chamber));
  if (other.length) groups.push({ key: 'other', short: 'Other', label: 'Other races', races: other });
  return groups.filter((g) => g.races.length);
}

function stanceCounts(races) {
  const n = { candidates: 0, pro: 0, against: 0, neutral: 0 };
  for (const r of races) for (const c of r.candidates || []) {
    n.candidates += 1;
    n[STANCE[c.stance] ? c.stance : 'neutral'] += 1;
  }
  return n;
}

function partyMark(p) {
  const s = String(p || '').toUpperCase();
  if (s.startsWith('D')) return 'D';
  if (s.startsWith('R')) return 'R';
  if (s.startsWith('I')) return 'I';
  return s.slice(0, 1) || '?';
}

function stanceChip(stance) {
  const m = STANCE[stance] || STANCE.neutral;
  return `<span class="mt-chip" style="--sc:${m.color};--si:${m.ink}" title="${esc(m.blurb)}">${esc(m.short)}</span>`;
}

function shareTitle(model) {
  const t = model.totals;
  return `${t.pro} pro · ${t.against} against · ${t.neutral} neutral on AI across ${t.races} midterm races SIREN is tracking. Who is coded how, and on what evidence?`;
}

const CSS = `<style>
.mt{max-width:1100px}
.mt .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#A5B4FC;margin:0 0 10px}
.mt-lede{font:400 1.05rem/1.55 var(--sans);color:var(--ink-dim,#94A3B8);max-width:62ch;margin:0 0 18px}
.mt-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0 0 18px}
.mt-k div{border:1px solid #2A3446;border-top:4px solid var(--c,#A5B4FC);background:#0E131D;padding:12px 14px}
.mt-k b{display:block;font:800 28px/1 var(--mono);color:#fff;margin:4px 0 2px}
.mt-k span{font:700 11px/1 var(--mono);letter-spacing:.1em;color:var(--c,#A5B4FC)}
.mt-k small{display:block;color:#AEB7C3;font-size:12.5px;margin-top:4px}
.mt-bar{display:flex;height:28px;border:1px solid #1F2937;overflow:hidden;margin:0 0 8px}
.mt-bar i{display:flex;align-items:center;justify-content:center;font:800 11px/1 var(--mono);color:#061018;min-width:0;white-space:nowrap;padding:0 6px}
.mt-note{font-size:13px;color:#CBD5E1;margin:0 0 20px}
.mt-race{border:1px solid #2A3446;background:#0A0E16;margin:0 0 14px;padding:14px 16px}
.mt-race h3{margin:0 0 4px;font:700 15px/1.3 var(--sans);color:#fff}
.mt-race .meta{font:600 11.5px/1.4 var(--mono);color:#6B7686;margin:0 0 10px}
.mt-cands{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mt-cand{border:1px solid #232C3B;background:#0E131D;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.mt-cand .row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.mt-cand .nm{font:700 15px/1.2 var(--sans);color:#E6EAF0}
.mt-cand .party{font:700 11px var(--mono);letter-spacing:.08em;color:#AEB7C3}
.mt-cand .sum{font:400 13.5px/1.45 var(--sans);color:#AEB7C3;margin:0}
.mt-cand .ev{font:400 12.5px/1.4 var(--sans);color:#94A3B8;margin:0;border-left:2px solid #334155;padding-left:10px}
.mt-cand .ev a{color:#A5B4FC}
.mt-cand .ev-k{font:600 11px/1.3 var(--mono);letter-spacing:.04em;color:#6B7686;display:block;margin-bottom:2px}
.mt-chip{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;font:800 10px/1 var(--mono);letter-spacing:.08em;background:var(--sc);color:var(--si)}
.mt-x{appearance:none;border:1px solid #A5B4FC;background:#0B1020;color:#C7D2FE;padding:10px 14px;font:700 13px var(--mono);cursor:pointer;margin:8px 8px 8px 0}
.mt-x:hover{background:#161D33}
.mt-how,.mt-faq{margin:22px 0 16px;max-width:62ch}
.mt-how h2,.mt-faq h2{font:600 1.125rem/1.2 var(--sans);margin:0 0 10px;color:#E6EAF0}
.mt-how h3,.mt-faq h3{font:600 1rem/1.3 var(--sans);margin:14px 0 6px;color:#E6EAF0}
.mt-how p,.mt-faq p,.mt-how li{font:400 1rem/1.55 var(--sans);color:#94A3B8;margin:0 0 8px}
.mt-how ul{margin:0 0 10px;padding-left:1.2em}
.mt-key{margin-top:14px!important}
.mt-jump{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 14px;padding:8px 0;background:var(--bg,#05070B)}
.mt-jump span{font:700 11px/1 var(--mono);letter-spacing:.14em;color:#6B7686;margin-right:4px}
.mt-jump a{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border:1px solid #2A3446;background:#0E131D;color:#E6EAF0;font:700 12px/1 var(--mono);letter-spacing:.06em;text-decoration:none}
.mt-jump a:hover,.mt-jump a:focus-visible{border-color:#A5B4FC;color:#fff}
.mt-jump .grp{display:flex;flex-wrap:wrap;align-items:center;gap:6px;width:100%}
.mt-jump .grp b{font:700 11px/1 var(--mono);letter-spacing:.12em;color:#A5B4FC;min-width:78px}
.mt-ch{margin:22px 0 10px;font:700 1.125rem/1.2 var(--sans);color:#E6EAF0;scroll-margin-top:64px}
.mt-ch small{display:block;font:600 11.5px/1.4 var(--mono);color:#6B7686;margin-top:4px}
.mt-race{scroll-margin-top:64px}.mt-how h2,.mt-faq h2{scroll-margin-top:64px}
@media (max-width:640px){.mt-cands{grid-template-columns:1fr}}
</style>`;

function jumpLabel(race) {
  const m = /^house-[a-z]{2}-(\d+)-/.exec(race.id || '');
  return m ? `${race.state}-${m[1]}` : race.state;
}

function raceBlock(ctx, race) {
  const pageUrl = ctx.url ? ctx.url(PATH) : `https://siren.watch${PATH}`;
  const rows = (race.candidates || []).map((c) => {
    const ev = (c.evidence && c.evidence[0]) || null;
    const evDate = ev && ev.date
      ? utcDay(ev.date.length === 10 ? `${ev.date}T00:00:00.000Z` : ev.date)
      : null;
    const evHtml = ev
      ? `<p class="ev">${ev.kind === 'summary' ? `<span class="ev-k">Tracker summary, not the candidate's words:</span> ${esc(ev.quote)}` : `“${esc(ev.quote)}”`} — ${ev.url ? `<a href="${esc(ev.url)}" target="_blank" rel="noopener nofollow">${esc(ev.source || 'source')}</a>` : esc(ev.source || 'source')}${evDate ? ` · ${esc(evDate)}` : ''}</p>`
      : '<p class="ev">No cited line in this build.</p>';
    return `<article class="mt-cand" id="${esc(c.id)}">
      <div class="row"><span class="nm">${esc(c.name)}${c.incumbent ? ' · inc.' : ''}</span>${stanceChip(c.stance)}</div>
      <span class="party">${esc(partyMark(c.party))} · ${esc(race.seat)}</span>
      <p class="sum">${esc(c.summary)}</p>
      ${evHtml}
      <p style="margin:4px 0 0"><button type="button" class="mt-x" style="padding:6px 10px;font-size:11px" data-xpost="page" data-x-title="${esc(`${c.name} (${partyMark(c.party)}-${race.state}): coded ${(STANCE[c.stance] || STANCE.neutral).label} on AI — ${c.summary}`)}" data-x-src="SIREN midterms" data-x-url="${esc(`${pageUrl}#${c.id}`)}">𝕏 Post this read</button></p>
    </article>`;
  }).join('');
  return `<section class="mt-race" id="${esc(race.id)}">
    <h3 class="mt-rh">${esc(race.state_name)} · ${esc(race.seat)}</h3>
    <p class="meta">${esc(race.state)} · <a href="${esc(race.compare_url)}" target="_blank" rel="noopener nofollow">${/aicongress\.us/.test(race.compare_url || '') ? 'Compare on AI Congress' : 'Cited coverage'}</a></p>
    <div class="mt-cands">${rows}</div>
  </section>`;
}

export function render(ctx) {
  if (!hasMidterms(ctx)) return emptyPage(ctx);
  const model = midtermsModel(ctx.midterms);
  const t = model.totals;
  const data = ctx.midterms;
  const share = esc(ctx.url ? ctx.url(PATH) : `https://siren.watch${PATH}`);
  const xTitle = shareTitle(model);
  const method = data.methodology || {};
  const stanceDefs = method.stances || {};
  const howQ = 'How does SIREN code pro, against, and neutral?';
  const groups = racesByChamber(model.races);
  const chamberLine = groups.map((g) => `${g.races.length} ${g.short.toLowerCase()}`).join(', ');
  const barParts = [
    t.pro > 0 ? `<i style="flex:${t.pro};background:${STANCE.pro.color}">${t.pro} PRO</i>` : '',
    t.against > 0 ? `<i style="flex:${t.against};background:${STANCE.against.color}">${t.against} AGAINST</i>` : '',
    t.neutral > 0 ? `<i style="flex:${t.neutral};background:${STANCE.neutral.color}">${t.neutral} NEUTRAL</i>` : '',
  ].join('');

  const faq = [
    [Q_TITLE,
      `${t.candidates} candidates across ${t.races} races: ${t.pro} coded pro, ${t.against} against, ${t.neutral} neutral. Each tag sits on a cited public line. Election day on this board is ${utcDay(data.election_day + 'T00:00:00.000Z')}.`],
    [howQ,
      `Pro: ${stanceDefs.pro || STANCE.pro.blurb} Against: ${stanceDefs.against || STANCE.against.blurb} Neutral: ${stanceDefs.neutral || STANCE.neutral.blurb}`],
    ['Is this an endorsement or a forecast of who wins?',
      'No. It is a stance board on AI policy language in the public record. It is not a vote recommendation and not a forecast of any race outcome.'],
    ['Does a higher SIREN level mean midterm AI risk is higher?',
      `${brand.DISCLAIMER_SHORT} The midterms board is a separate room; it does not move the SIREN score.`],
    ['Where does the evidence come from?',
      method.sources_note || 'Cited campaign statements and legislative records, with primary pages on AI Congress.'],
    ...groups.map((g) => {
      const n = stanceCounts(g.races);
      return [
        `How do ${g.label.toLowerCase()} break down on AI?`,
        `${n.candidates} candidates across ${g.races.length} ${g.label.toLowerCase()}: ${n.pro} pro, ${n.against} against, ${n.neutral} neutral. States: ${[...new Set(g.races.map((r) => r.state))].join(', ')}.`,
      ];
    }),
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `${CSS}<section class="mt">
  <p class="eyebrow">MIDTERMS · AI STANCE BOARD · ${esc(utcDay(data.election_day + 'T00:00:00.000Z'))}</p>
  <h1 class="bp__h1">${esc(Q_TITLE)}</h1>
  <p class="mt-lede">${esc(method.summary || 'Coarse AI stance tags for midterm candidates, each tied to a cited public line. Not a doom score and not an endorsement.')}</p>
  <div class="mt-k" role="group" aria-label="Stance counts">
    <div style="--c:${STANCE.pro.color}"><span>PRO</span><b>${t.pro}</b><small>${esc(STANCE.pro.blurb)}</small></div>
    <div style="--c:${STANCE.against.color}"><span>AGAINST</span><b>${t.against}</b><small>${esc(STANCE.against.blurb)}</small></div>
    <div style="--c:${STANCE.neutral.color}"><span>NEUTRAL</span><b>${t.neutral}</b><small>${esc(STANCE.neutral.blurb)}</small></div>
    <div style="--c:#A5B4FC"><span>TRACKED</span><b>${t.candidates}</b><small>${t.races} races (${esc(chamberLine)}) · updated ${esc(utc(data.generated_at))}</small></div>
  </div>
  <div class="mt-bar" role="img" aria-label="${t.pro} pro, ${t.against} against, ${t.neutral} neutral">${barParts}</div>
  <p class="mt-note">One tag per person. Click through to the cited line. Missing evidence stays missing.</p>
  <p>
    <button type="button" class="mt-x" data-xpost="page" data-x-title="${esc(xTitle)}" data-x-src="SIREN" data-x-url="${share}">𝕏 Post the midterms board</button>
    <a class="mt-x" href="${esc(ctx.href('/api/midterms.json'))}" style="display:inline-flex;align-items:center;text-decoration:none">JSON</a>
  </p>
  <nav class="mt-jump" aria-label="Jump to a race"><span>JUMP TO A RACE</span>${groups.map((g) => `<div class="grp"><b>${esc(g.short.toUpperCase())}</b>${g.races.map((r) => `<a href="#${esc(r.id)}" title="${esc(`${r.state_name} · ${r.seat}`)}">${esc(jumpLabel(r))}</a>`).join('')}</div>`).join('')}<div class="grp"><a href="#how">HOW WE CODE</a><a href="#faq">FAQ</a></div></nav>
  ${groups.map((g) => {
    const n = stanceCounts(g.races);
    return `<h2 class="mt-ch" id="ch-${esc(g.key)}">${esc(g.label)}<small>${g.races.length} races · ${n.candidates} candidates · ${n.pro} pro · ${n.against} against · ${n.neutral} neutral</small></h2>
  ${g.races.map((r) => raceBlock(ctx, r)).join('')}`;
  }).join('')}
  <section class="mt-how" aria-labelledby="how">
    <h2 id="how">${esc(howQ)}</h2>
    <ul>
      <li><b>Pro:</b> ${esc(stanceDefs.pro || STANCE.pro.blurb)}</li>
      <li><b>Against:</b> ${esc(stanceDefs.against || STANCE.against.blurb)}</li>
      <li><b>Neutral:</b> ${esc(stanceDefs.neutral || STANCE.neutral.blurb)}</li>
    </ul>
    <p>${esc(method.sources_note || '')}</p>
  </section>
  <p>Related: <a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a> · <a href="${esc(ctx.href('/nations.html'))}">USA vs China: who is winning the race to superintelligence?</a> · <a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a> · <a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a></p>
  <p style="font-size:12.5px;color:#6B7686">Not an endorsement. Not a forecast of any race. Stance tags are SIREN’s reading of cited public lines and can be wrong; send corrections via <a href="${esc(ctx.href('/feedback.html'))}">feedback</a>. Compiled ${esc(utc(data.generated_at))}.</p>
  <section class="mt-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="mt-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a>
      · <a href="${esc(ctx.href('/nations.html'))}">USA vs China: who is winning the race to superintelligence?</a>.</p>
  </section>
</section>`;

  return page({
    ctx,
    path: PATH,
    title: `${Q_TITLE} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${Q_TITLE}`,
    description: `${Q_TITLE} ${t.pro} pro, ${t.against} against, ${t.neutral} neutral across ${t.races} races. Each tag cites a public line. Not an endorsement and not a forecast.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: Q_TITLE,
        description: 'Coarse AI stance tags (pro / against / neutral) for 2026 U.S. midterm candidates, each tied to a cited public statement. Not an endorsement or race forecast.',
        url: ctx.url(PATH),
        creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
        isAccessibleForFree: true,
        speakable: speakable(['h1.bp__h1', 'p.mt-lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: Q_TITLE, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}

function emptyPage(ctx) {
  const main = `${CSS}<section class="mt">
  <p class="eyebrow">MIDTERMS · AI STANCE BOARD</p>
  <h1 class="bp__h1">${esc(Q_TITLE)}</h1>
  <p class="mt-lede"><code>data/midterms.json</code> is absent or empty. The board builds once that file carries races.</p>
</section>`;
  return page({
    ctx,
    path: PATH,
    title: `${Q_TITLE} · ${brand.NAME}`,
    description: Q_TITLE,
    main,
  });
}

/** Compact homepage / markets highlight with Post to X. */
export function highlightHtml(ctx, data) {
  const model = midtermsModel(data);
  if (!model.totals.candidates) return '';
  const t = model.totals;
  const href = (ctx && ctx.href) ? ctx.href(PATH) : PATH;
  const share = (ctx && ctx.url) ? ctx.url(PATH) : `https://siren.watch${PATH}`;
  const xTitle = shareTitle(model);
  return `<div class="mt-hl" style="display:block;margin:16px 0;padding:14px 16px;border:2px solid #A5B4FC;border-radius:12px;background:linear-gradient(135deg,rgba(79,70,229,.22),rgba(11,15,22,.95) 55%,rgba(248,113,113,.12));color:#E6EAF0">
  <a href="${esc(href)}" style="display:block;color:inherit;text-decoration:none">
    <span style="display:block;font:700 11px/1 var(--mono,monospace);letter-spacing:.16em;color:#C7D2FE;margin-bottom:8px">★ FEATURED · 2026 MIDTERMS · AI STANCE</span>
    <span style="display:block;font:800 18px/1.25 var(--sans,system-ui);margin-bottom:8px">${esc(Q_TITLE)}</span>
    <span style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin:0 0 8px;border:1px solid #1F2937">
      <i style="flex:${Math.max(t.pro, 0.01)};background:${STANCE.pro.color}"></i>
      <i style="flex:${Math.max(t.against, 0.01)};background:${STANCE.against.color}"></i>
      <i style="flex:${Math.max(t.neutral, 0.01)};background:${STANCE.neutral.color}"></i>
    </span>
    <span style="display:flex;flex-wrap:wrap;gap:10px 16px;font:700 13px/1.3 var(--mono,monospace)">
      <span style="color:${STANCE.pro.color}">${t.pro} PRO</span>
      <span style="color:${STANCE.against.color}">${t.against} AGAINST</span>
      <span style="color:${STANCE.neutral.color}">${t.neutral} NEUTRAL</span>
      <span style="color:#AEB7C3">${t.races} RACES</span>
    </span>
    <span style="display:block;margin-top:8px;font-size:13px;color:#CBD5E1">Cited public lines only. Open the board →</span>
  </a>
  <p style="margin:12px 0 0"><button type="button" data-xpost="page" data-x-title="${esc(xTitle)}" data-x-src="SIREN" data-x-url="${esc(share)}" style="appearance:none;border:1px solid #A5B4FC;background:#0B1020;color:#C7D2FE;padding:9px 12px;font:700 12px/1 var(--mono,monospace);cursor:pointer">𝕏 Post the midterms board</button></p>
</div>`;
}
