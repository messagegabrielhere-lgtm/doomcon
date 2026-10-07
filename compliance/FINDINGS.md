# Legal & compliance findings

Audit date: **2026-10-07** (code remediations shipped **2026-10-08**). Scope: the
SIREN website (GitHub Pages), static apps (`/scanner`, `/arena`, `/monitor`,
`/elon`, `/bunker-kit`, `/game`), the `clipper/` pipeline, collectors, and
social posting workflows.

**Automated scan:** `npm run compliance` → **PASS** (High 0 · Medium 0 · Low 0).

Not legal advice. Have a lawyer review anything that takes money, redistributes
market data, or depicts real people.

---

## Shipped in code (2026-10-08)

| Item | Change |
|---|---|
| Licence conflict | Root `LICENSE` + `LICENSE-MIT` + `LICENSE-CC-BY-4.0`; `package.json` `(MIT AND CC-BY-4.0)`; footers use `LICENSE_SUMMARY` |
| Privacy third parties | Binance, Yahoo (via GitHub snapshot), Coinbase-derived arena data documented |
| Privacy overclaim | “Nobody here knows you visited” → operator has no analytics; host/APIs still see IPs |
| CCPA | “No sale or sharing” statement on privacy page |
| “No advertising” | about / press / FAQ → “no ad network”; Amazon paid links still disclosed |
| Terms | Under-16 note; new governing-law section (California / US) |
| Brand fonts | Guide matches live Inter Tight / JetBrains Mono |
| `/elon.html` | Links self-hosted `fonts/fonts.css` |

---

## Still open — operator checks (manual)

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

## Residual risks (need a policy decision, not just copy)

### 1. High — AI-generated caricatures of identifiable people

**Where:** `assets/img/art-{altman,musk,amodei,…}.webp`, wired in
`site/templates/_avatars.mjs` (`FACE` map, ~19 people).

**Risk:** Right of publicity / personality rights; state synthetic-media /
deepfake statutes; platform rules if those images are posted to X without a
clear “AI-generated / illustration” label. Terms §5 already call them
“generated artwork, not photographs.”

**Options:** Keep abstract monograms only; get permission; or confine likenesses
to clearly labeled editorial context and never post them as social media of the
real people.

---

### 2. High — Market-data redistribution may breach provider ToS

**Where:** Yahoo Finance chart API → `scanner-data`; browser live calls to OKX,
Binance, Polymarket, DexScreener; Coinbase via arena collector.

**Risk:** Provider ToS often restrict scraping / republishing. Disclaimers do
not grant a license.

**Options:** Licensed feed; link out; or drop public stock/crypto apps.

---

### 3. High — Investment-advice framing on Scanner / Arena / picks

Disclaimers are present and strong (`site/sitebar.mjs` `DISCLOSURE`, page
footers). Residual Advisers Act / UDAP risk if “picks” and exportable trade
plans are treated as recommendations. Soften language further only if product
intent allows.

---

### 4. Medium — Clipper (dormant) copyright & YouTube ToS

Still unconfigured. Rights gate and allow-list remain as documented in
`compliance/README.md`.

---

### 5. Low — Real Clips embeds

YouTube nocookie embeds + disclosed thumbs; fair-use gray area if monetised
heavily via Amazon.

---

## Daily audit (all markets)

As of 2026-10-08:

- GitHub Actions `compliance` runs **daily** (13:17 UTC)
- `compliance/markets.mjs` covers US, California, EU/EEA, UK, prediction-market geo, Amazon across scanner / arena / monitor / shop
- Local: `npm run compliance:daily`
- Ops calendar event + Notion checklist created for the human pass

## Suggested next actions (operator)

1. Complete the five open **manual** checks.
2. Decide policy on **AI face caricatures**.
3. Decide whether **Yahoo/exchange republishing** needs a licensed feed.
4. Keep the daily market-regime checklist (calendar / Notion) — do not mark those ids `done` in `manual.json`.

---

## How this was checked

```bash
npm run compliance          # selftest + strict audit — PASS
node compliance/audit.mjs --strict --verbose
```
