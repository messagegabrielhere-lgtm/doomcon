# Legal & compliance findings

Audit date: **2026-10-07**. Scope: the SIREN website (GitHub Pages), static apps
(`/scanner`, `/arena`, `/monitor`, `/elon`, `/bunker-kit`, `/game`), the
`clipper/` pipeline, collectors, and social posting workflows.

**Automated scan:** `npm run compliance` → **PASS** (High 0 · Medium 0 · Low 0).
**This document covers what the scanner cannot see**, plus open manual checks.

Not legal advice. Have a lawyer review anything that takes money, redistributes
market data, or depicts real people.

---

## Verdict

The repo already blocks the expensive AI-site failure modes (Google Fonts IP
leak, session replay, missing privacy page, unlabeled affiliates, unattended
@mentions, clipper without rights). Remaining exposure is mostly **operator
actions**, **third-party data ToS**, **AI likenesses of real people**, and a
few **copy / license inconsistencies**.

---

## Open operator checks (manual)

From `compliance/manual.json` — still unchecked:

| Id | Issue | Why it matters |
|---|---|---|
| `x-automated-label` | X “Automated” label not confirmed on | X Automation Rules; account suspension |
| `x-bio-disclosure` | Bio does not yet say automated + human owner | Same |
| `amazon-associates` | Associates Central may not list this GitHub Pages URL / social accounts | Amazon can terminate the tag `buyusa0d-20` |
| `secrets-rotated` | API keys not confirmed rotated in last 12 months | Account takeover / bill shock |
| `pii-secret` | `COMPLIANCE_PII_TERMS` secret may be unset | Private name/email/phone can land in the public repo unnoticed |

Marked done / N/A already: `x-ai-media`, `dmca-agent-registered`, `clipper-env-channels`.

Allow-listed (not fixed): `ytdlp-cookies` on `.github/workflows/clipper.yml` until **2027-01-06** — clipper is unconfigured; if `YTDLP_COOKIES` is ever set, use a throwaway Google account.

---

## Findings beyond the scanner

### 1. High — AI-generated caricatures of identifiable people

**Where:** `assets/img/art-{altman,musk,amodei,…}.webp`, wired in
`site/templates/_avatars.mjs` (`FACE` map, ~19 people).

**Risk:** Right of publicity / personality rights; state synthetic-media /
deepfake statutes; platform rules if those images are posted to X without a
clear “AI-generated / illustration” label. Terms §5 already call them
“generated artwork, not photographs,” which helps disclosure but does not
eliminate civil exposure if someone objects.

**Mitigation options:** Keep abstract monograms only; get permission; or confine
likenesses to clearly labeled editorial context and never post them as social
media avatars of the real people.

---

### 2. High — Market-data redistribution may breach provider ToS

**Where:**

- `scanner/collect-stocks.mjs` / `collect-sentiment.mjs` → Yahoo Finance chart API → published on `scanner-data` and consumed by `/scanner.html`, `/arena.html`, `/monitor.html`
- Browser live calls from `/scanner.html`: OKX, Binance WebSocket, Polymarket, DexScreener, alternative.me
- Arena: Coinbase public API (server-side) + Yahoo for stocks

**Risk:** Yahoo’s and several exchanges’ terms restrict scraping / republishing
delayed quotes on a third-party site. Disclaimers (“delayed”, “not advice”) do
not grant a license. A cease-and-desist or key/IP block is the usual outcome;
contract claims are possible for commercial use (affiliates/sponsors).

**Mitigation options:** Licensed market-data feed; link out instead of hosting
bars; or drop stock/crypto apps from the public site.

---

### 3. High — Investment-advice framing on Scanner / Arena / picks

**Where:** `/scanner.html` (trade plans, entry zones, Pine Script export, daily
picks, journal), `/arena.html` (AI battle, daily picks, investor/Congress
disclosures). Footers and `site/sitebar.mjs` `DISCLOSURE` are present and
strong.

**Risk:** US Advisers Act publisher exclusion is fact-specific. Screens that
look like personalized “picks”, backtested track records, and exportable trade
plans sit closer to the line than a raw index. State UDAP / “not advice”
disclaimers reduce but do not eliminate risk if a reader trades and loses money.

**Mitigation options:** Soften “picks” / “trade plan” language; lead with
hypothetical; avoid implying the screen is a recommendation; keep disclaimers
above the fold on every finance surface (mostly done).

---

### 4. Medium — Privacy page incomplete vs live third parties — **FIXED 2026-10-12**

Privacy now lists Binance, Yahoo Finance, Coinbase, rugcheck/solscan; softens
absolute “nobody knows” wording; adds CCPA do-not-sell, retention, children
under-16, and rights language. See `/privacy.html` and `/disclosures.html`.

---

### 5. Medium — “No advertising” vs Amazon Associates — **FIXED 2026-10-12**

About, press, and the sitewide give-line now say “no display ads / no
display-ad network” and Amazon Associate language is on footers, disclosures,
and the sitebar disclosure.

---

### 6. Medium — Licence statement conflict / missing LICENSE file — **FIXED 2026-10-12**

Root `LICENSE` holds MIT (code) + CC BY 4.0 (data). `brand.LICENSE_BLURB` and
footers say “Code MIT; data and index values CC BY 4.0”. `package.json` points
at that file.

---

### 7. Medium — Terms gaps — **MOSTLY FIXED 2026-10-12**

Terms (updated 12 Oct 2026) now include governing law (US, no forced state
venue), CCPA “do not sell/share”, children under-13 and under-16, and a
disclosures hub. Browsewrap remains: still “by using you agree”, which is
acceptable until any account/checkout feature lands.

---

### 8. Medium — Trademark / brand borrowing

DEFCON grammar, Doomsday Clock comparisons, “Flock” ALPR register, lab/people
names and logos in race/leaders copy. Terms disclaim affiliation (good).
Residual risk: confusion or complaint from trademark owners if presentation
looks official. Keep “not affiliated / not an alert system” near every
DEFCON-style dial (largely done on method/guide).

---

### 9. Medium — Clipper (dormant) copyright & YouTube ToS

`clipper/` requires `rights: own|licensed` (enforced). `config.live.json` has
**no channels** — scheduled runs skip. Residual risks if activated:

- YouTube ToS / Content ID for clipped Shorts
- `YTDLP_COOKIES` → Google account ban risk (allow-listed)
- TikTok `SELF_ONLY` until app audit
- Must assert rights in GitHub Actions variables (`clipper-env-channels`)

---

### 10. Low — Real Clips (`/elon.html`)

Indexes and embeds third-party YouTube videos via `youtube-nocookie.com`
(good). Thumbnails hit `i.ytimg.com` (disclosed). Fair-use / embed license for
a site that also monetizes via Amazon is a gray area if YouTube or a channel
objects; keep “not affiliated” footer; prefer official embeds only (current
design).

---

### 11. Low — Copy / brand hygiene — **FIXED 2026-10-21**

Brand guide (`infoPages.brandPage`) now names the live faces (Inter Tight /
JetBrains Mono, self-hosted OFL), and `/elon.html` links `fonts/fonts.css` like
the other static apps.

---

### What looks solid

- Self-hosted OFL fonts (no Google Fonts)
- No session replay / ad pixels / `document.cookie` writers found
- Privacy + terms pages generated and linked from footers
- Amazon disclosures on library + bunker-kit
- Finance disclaimers on scanner/arena + shared sitebar disclosure
- Social posting guards (no likes/follows/DMs; mention guard rules exist)
- Clipper rights gate; DMCA N/A (no uploads)
- Aircraft (military, hub-sample density, emergency squawks) shown only as regional counts with ADS-B/MLAT/TIS-B mix (privacy-minded; no Aireon/ACARS/FLIFO)
- Flock/OSM ODbL attribution path in layout footer

---

## Suggested priority order

1. Complete the five open **manual** checks (X label/bio, Amazon site list, key
   rotation, `COMPLIANCE_PII_TERMS`).
2. ~~Fix license / privacy third parties / “no advertising” / CCPA + governing law~~ — done 2026-10-12 (`/disclosures.html`, expanded `/privacy.html` + `/terms.html`).
3. Decide policy on **AI face caricatures** (keep / label harder / remove).
4. Decide whether **Yahoo/exchange republishing** is acceptable risk or needs
   a licensed feed / link-out.
5. Optional later: Google Consent Mode / EU cookie banner if GA stays on and
   EU traffic is material (currently allow-listed in `compliance/allow.json`).

---

## How this was checked

```bash
npm run compliance          # selftest + strict audit — PASS
node compliance/audit.mjs --strict --verbose
```

Manual review of `site/templates/infoPages.mjs`, `shopPages.mjs`,
`site/static/{scanner,arena,monitor,elon,bunker-kit}.html`, `clipper/`,
`scanner/`, `investors/`, `arena/`, `compliance/{rules,manual,allow}.json`,
font LICENSE files under `assets/fonts/`.
