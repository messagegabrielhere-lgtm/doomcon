// compliance/markets.mjs — daily legal/compliance coverage across every
// market surface and every jurisdiction this site can touch.
//
// Product "markets" here means the finance / prediction / trading apps
// (scanner, arena, monitor market panels, Amazon paid links). Legal
// "markets" means the regimes those surfaces can reach a visitor in.
//
// Automated rules trip on missing disclaimers or geo notices.
// DAILY_CHECKS are printed every run — they are operator review, not
// one-time ticks in manual.json.
//
// Not legal advice.

const PAGE = /\.(html?|mjs|js)$/i;
const shipped = (f) => PAGE.test(f.path) && !f.path.endsWith('.md');

function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function hasAdviceDisclaimer(text) {
  return /not (an? )?(investment|financial|trading)[\w\s,/]{0,40}advice/i.test(text)
    || /nothing here is financial advice/i.test(text)
    || /We are not financial advisors/i.test(text);
}

/** Product surfaces that publish market content. */
export const SURFACES = [
  {
    id: 'scanner',
    label: 'Capitulation Scanner',
    paths: ['site/static/scanner.html'],
    venues: ['US equities (Yahoo)', 'OKX crypto', 'Binance BTC stream', 'Polymarket', 'DexScreener'],
    kind: 'signals',
  },
  {
    id: 'arena',
    label: 'AI battle / investors / daily picks',
    paths: ['site/static/arena.html'],
    venues: ['Coinbase (arena fills)', 'Yahoo equities', 'SEC 13F', 'ARK holdings', 'House PTR'],
    kind: 'signals',
  },
  {
    id: 'monitor',
    label: 'World monitor (markets panel)',
    paths: ['site/static/monitor.html'],
    venues: ['Yahoo (via scanner snapshot)', 'OKX'],
    kind: 'data',
  },
  {
    id: 'terms-finance',
    label: 'Terms — financial section',
    paths: ['site/templates/infoPages.mjs'],
    venues: ['site-wide'],
    kind: 'policy',
    match: /Not financial or investment advice|not a broker-dealer/i,
  },
  {
    id: 'sitebar-disclosure',
    label: 'Shared finance disclosure bar',
    paths: ['site/sitebar.mjs'],
    venues: ['scanner', 'arena'],
    kind: 'policy',
  },
  {
    id: 'amazon',
    label: 'Amazon Associates surfaces',
    paths: ['site/templates/shopPages.mjs', 'site/static/bunker-kit.html'],
    venues: ['Amazon.com'],
    kind: 'affiliate',
  },
];

/** Jurisdictions / regimes the daily pass must cover. */
export const REGIMES = [
  { id: 'us-federal', label: 'United States (federal)', focus: 'FTC, Advisers Act publisher exclusion, CAN-SPAM, COPPA' },
  { id: 'us-california', label: 'California', focus: 'CCPA/CPRA, CalOPPA, CIPA, auto-renewal' },
  { id: 'eu-eea', label: 'EU / EEA', focus: 'GDPR, ePrivacy (cookies/trackers/fonts)' },
  { id: 'uk', label: 'United Kingdom', focus: 'FCA financial-promotion tone on posts and finance pages' },
  { id: 'prediction-geo', label: 'Prediction-market geo', focus: 'Polymarket US/restricted-country notice on scanner' },
  { id: 'amazon-associates', label: 'Amazon Associates', focus: 'Disclosure + approved site list for every storefront/account' },
];

/**
 * Printed every audit run. Recurring daily operator review — not stored in
 * manual.json "done", because they reset every day.
 */
export const DAILY_CHECKS = [
  {
    id: 'daily-us-finance',
    regime: 'us-federal',
    text: 'US: scanner, arena and any new finance surface still carry a clear “not investment advice” notice above or beside the signals.',
  },
  {
    id: 'daily-california',
    regime: 'us-california',
    text: 'California: privacy page still matches the code (no new cookies, analytics, or sale/share of personal information).',
  },
  {
    id: 'daily-eu-gdpr',
    regime: 'eu-eea',
    text: 'EU/EEA: no new third-party font, tracker, or non-essential cookie shipped without consent.',
  },
  {
    id: 'daily-uk-fca',
    regime: 'uk',
    text: 'UK: social posts and finance pages do not read as an authorised financial promotion; hypothetical / entertainment framing stays.',
  },
  {
    id: 'daily-prediction-geo',
    regime: 'prediction-geo',
    text: 'Prediction markets: Polymarket geo/availability notice still visible on the scanner odds panel.',
  },
  {
    id: 'daily-amazon',
    regime: 'amazon-associates',
    text: 'Amazon: every page with a tagged link still discloses Associates earnings on that page.',
  },
  {
    id: 'daily-market-apis',
    regime: 'us-federal',
    text: 'Market data: Yahoo / OKX / Binance / Coinbase / Polymarket use still matches privacy.html and no new scrape target was added silently.',
  },
  {
    id: 'daily-social-finance',
    regime: 'us-federal',
    text: 'Social: no automated post implies a trade recommendation; any affiliate link in a post would need #ad (none today).',
  },
];

/** Automated rules merged into RULES. */
export const MARKET_RULES = [
  {
    id: 'market-surface-disclaimer',
    severity: 'high',
    title: 'Market/trading surface without an investment-advice disclaimer',
    law: 'Investment Advisers Act §202(a)(11) publisher exclusion; state securities and UDAP law; UK FCA financial-promotion tone',
    fix: 'Keep the shared disclosure (site/sitebar.mjs) or an equivalent “Not investment / financial advice” notice on every signals page.',
    check: ({ files }) => {
      const out = [];
      for (const surface of SURFACES.filter((s) => s.kind === 'signals' || s.kind === 'policy')) {
        for (const rel of surface.paths) {
          const f = files.find((x) => x.path === rel || x.path.endsWith('/' + rel));
          if (!f) continue;
          if (surface.match && !surface.match.test(f.text)) {
            out.push({ file: f.path, line: 1, detail: `${surface.label}: expected finance/policy wording missing` });
            continue;
          }
          if ((surface.kind === 'signals' || surface.id === 'sitebar-disclosure') && !hasAdviceDisclaimer(f.text)) {
            out.push({ file: f.path, line: 1, detail: `${surface.label}: no “not investment/financial advice” notice` });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'polymarket-geo',
    severity: 'medium',
    title: 'Polymarket odds UI without a geo / availability notice',
    law: 'Polymarket Terms; US/state gambling and prediction-market restrictions; UDAP omission risk',
    fix: 'On the scanner (or any page that loads Polymarket odds), state that the venue is unavailable in the US and some other countries.',
    check: ({ files }) => {
      // Only the interactive scanner odds UI. Collectors and docs that call the
      // Polymarket API are not a visitor-facing geo-notice obligation.
      const oddsUi = files.filter((f) => /(?:^|\/)site\/static\/scanner\.html$/.test(f.path));
      return oddsUi.flatMap((f) => {
        if (!/polymarket/i.test(f.text)) return [];
        if (/US and some other countries|not available to people in the US|unavailable in the US/i.test(f.text)) return [];
        const idx = f.text.search(/polymarket/i);
        return [{ file: f.path, line: lineOf(f.text, idx < 0 ? 0 : idx), detail: 'Polymarket odds UI without US/geo availability notice' }];
      });
    },
  },
  {
    id: 'markets-privacy-coverage',
    severity: 'medium',
    title: 'Market third parties missing from the privacy page',
    law: 'CalOPPA; GDPR Art. 13 transparency; FTC deception if privacy understates third parties',
    fix: 'List Yahoo, OKX, Binance, Coinbase and Polymarket on privacy.html whenever those live surfaces ship.',
    check: ({ files }) => {
      const privacy = files.filter((f) => /privacy/i.test(f.path) && shipped(f));
      if (!privacy.length) return [];
      const ptext = privacy.map((f) => f.text).join('\n');
      const hasScanner = files.some((f) => f.path.endsWith('site/static/scanner.html') || f.path === 'site/static/scanner.html');
      const hasArena = files.some((f) => f.path.endsWith('site/static/arena.html') || f.path === 'site/static/arena.html');
      if (!hasScanner && !hasArena) return [];
      const need = [
        ['Yahoo', /yahoo/i],
        ['OKX', /\bOKX\b/i],
        ['Binance', /binance/i],
        ['Polymarket', /polymarket/i],
      ];
      if (hasArena) need.push(['Coinbase', /coinbase/i]);
      const missing = need.filter(([, re]) => !re.test(ptext)).map(([name]) => name);
      if (!missing.length) return [];
      return [{ file: privacy[0].path, line: 1, detail: `market surfaces ship but privacy omits: ${missing.join(', ')}` }];
    },
  },
];

/** Markdown section for --report / Actions summary. */
export function marketsReportMarkdown() {
  const lines = [
    '## Daily market-regime checks',
    '',
    'Recurring operator review across every market surface and jurisdiction. These reset daily — do not mark them done in `manual.json`.',
    '',
  ];
  for (const r of REGIMES) {
    lines.push(`### ${r.label}`, '', `*${r.focus}*`, '');
    for (const c of DAILY_CHECKS.filter((d) => d.regime === r.id)) {
      lines.push(`- [ ] ${c.text} (\`${c.id}\`)`);
    }
    lines.push('');
  }
  lines.push('### Surfaces in scope', '');
  for (const s of SURFACES) {
    lines.push(`- **${s.label}** (\`${s.id}\`) — ${s.venues.join('; ')}`);
  }
  lines.push('');
  return lines.join('\n');
}
