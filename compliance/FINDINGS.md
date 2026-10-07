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

### 4. Medium — Privacy page incomplete vs live third parties

**Where:** `site/templates/infoPages.mjs` → `privacy()`.

**Stated:** monitor (USGS, NASA EONET, GDACS, GDELT, ADSB.lol, OKX,
alternative.me); scanner (OKX, Polymarket, DEX Screener, alternative.me);
stock picks / AI battle; YouTube thumbs + nocookie; noembed; GitHub; Amazon.

**Missing or understated:**

| Third party | Used by |
|---|---|
| **Binance** WebSocket (`wss://stream.binance.com`) | `/scanner.html` odds live BTC |
| **Yahoo Finance** (via GitHub snapshot + arena) | scanner, arena, monitor markets |
| **Coinbase** Exchange public API | arena (server → published JSON) |
| **rugcheck.xyz / solscan.io** (outbound) | scanner Solana panel links |

Also: privacy claims “No analytics” / “Nobody here knows you visited” while
GitHub Pages and every direct API call still see IPs — the page discloses
GitHub, but the absolute “nobody knows” line overclaims.

**Fix:** Update the privacy third-party list; soften absolute “nobody knows”
wording; mention Binance, Yahoo, Coinbase.

---

### 5. Medium — “No advertising” vs Amazon Associates

**Where:** about, press kit (`infoPages.mjs`), FAQ (`_faq.mjs`). Affiliate pages
and Bunker Kit correctly say “Paid links” / “As an Amazon Associate…”.

**Risk:** FTC deception if a general “carries no advertising” claim is read
together with paid Amazon links. The FAQ is careful; about/press are not.

**Fix:** Change about/press to “no display ads / no ad network” (or similar)
and point at labelled Amazon links, matching the FAQ.

---

### 6. Medium — Licence statement conflict / missing LICENSE file

| Source | Says |
|---|---|
| `README.md` | “Code MIT. Data and index values CC-BY 4.0.” |
| `package.json` `"license"` | `CC-BY-4.0` |
| `site/brand.mjs` `LICENSE` | `CC BY 4.0` (shown in footers) |
| Repo root | **No `LICENSE` file** |

**Risk:** Downstream users cannot tell which grant applies to code vs data;
GitHub license detection is wrong or empty; MIT grant may be ineffective
without the license text in-tree.

**Fix:** Add `LICENSE` (or `LICENSE-MIT` + `LICENSE-CC-BY-4.0`), align
`package.json` and footer copy with README’s split grant.

---

### 7. Medium — Terms gaps

`terms.html` (updated 7 Oct 2026) is strong on advice, warranty, liability, and
satire. Still missing or thin:

- **Governing law / venue** — none chosen
- **CCPA/CPRA** — no “we do not sell/share personal information” statement
  (even if true, California visitors often expect it)
- **Children** — only under-13 (COPPA); no note for under-16 (GDPR) if EU
  traffic is material
- **Browsewrap** — “by using you agree”; enforceability is weaker than a
  checked acceptance on any future account/checkout feature

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

### 11. Low — Copy / brand hygiene

- Brand guide (`infoPages.brandPage`) still names **Anton** and **Stardos
  Stencil**; live CSS uses Inter Tight / JetBrains Mono (`site/styles.mjs`).
- `/elon.html` does not `<link>` `fonts/fonts.css` (system fallback only —
  fine for GDPR, inconsistent with other static apps).

---

### What looks solid

- Self-hosted OFL fonts (no Google Fonts)
- No session replay / ad pixels / `document.cookie` writers found
- Privacy + terms pages generated and linked from footers
- Amazon disclosures on library + bunker-kit
- Finance disclaimers on scanner/arena + shared sitebar disclosure
- Social posting guards (no likes/follows/DMs; mention guard rules exist)
- Clipper rights gate; DMCA N/A (no uploads)
- Military ADS-B shown only as regional counts (privacy-minded)
- Flock/OSM ODbL attribution path in layout footer

---

## Suggested priority order

1. Complete the five open **manual** checks (X label/bio, Amazon site list, key
   rotation, `COMPLIANCE_PII_TERMS`).
2. Fix **license** conflict + add root `LICENSE` file(s).
3. Patch **privacy** third-party list (Binance, Yahoo, Coinbase) and soften
   “nobody knows you visited”.
4. Soften **“no advertising”** on about/press.
5. Decide policy on **AI face caricatures** (keep / label harder / remove).
6. Decide whether **Yahoo/exchange republishing** is acceptable risk or needs
   a licensed feed / link-out.
7. Optional: governing law + CCPA “we do not sell” line in terms/privacy.

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
