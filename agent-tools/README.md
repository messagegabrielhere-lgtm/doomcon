# SIREN agent tools

Paid tools for people who run AI agents, sold from the SIREN site. Nothing runs
without a license key, and keys are only issued after a payment lands in an
account you control.

| Folder | What it is |
|---|---|
| `recorder/` | **Flight Recorder** — the product (`siren-fr` CLI). Refuses to run without a valid key. |
| `license-server/` | Cloudflare Worker that issues keys after Stripe or x402 (USDC) payment. |
| `tools/` | `keygen.js` (one-time signing key), `issue-key.js` (comp a key by hand). |
| `../site/static/agent-tools.html` | The storefront page on the SIREN site. |

## How payment gates access

```
 Card:  agent-tools.html ──► Stripe Payment Link ──► Stripe ──webhook──► Worker signs key
        ◄── thank-you (same page, ?session_id=) shows key ◄───────────────────┘
 USDC (any wallet): agent ──GET /usdc/quote──► unique amount + your address
        agent sends USDC on Base ──POST /usdc/claim {quoteId, txHash}──► Worker reads the
        transfer from Base itself ──► signs key ──► 200 { key }
 USDC (x402): agent ──GET /x402/key──► 402 terms (pay YOUR wallet) ──X-PAYMENT──► facilitator
        verifies + settles on-chain ──► Worker signs key ──► 200 { key }
 Use:   siren-fr activate <key>  → verified offline with the public key baked into the CLI
```

Keys are Ed25519-signed and expire (monthly subscribers get a fresh one each
billing cycle via `siren-fr renew`; USDC keys last 30 days and don't renew).
Only the Worker holds the private key, so nobody can mint a key without paying.

**Honest limit:** the recorder is JavaScript running on the buyer's machine. A
determined developer can patch out the license check. That's true of all
locally-run software; the key stops casual copying and makes paying the easy
path. If piracy ever matters, move a feature that needs the server (e.g. hosted
digest emails) behind the key.

## Launch checklist (about 45 minutes)

Do these on **your own Mac**, not in a shared or cloud machine.

1. **Make your own signing key.** The one in this repo came from a temporary
   build machine and its private half is gone, so it can't issue anything.
   ```
   cd agent-tools && node tools/keygen.js --force
   ```
   Commit the updated `recorder/src/public-key.js`. Keep `tools/keys/` private
   (it's git-ignored) and back it up somewhere safe — losing it means you can't
   renew existing customers.
2. **Cloudflare (free plan).** `cd license-server && npx wrangler login`, then
   `npx wrangler kv namespace create LICENSES` and paste the id into
   `wrangler.toml`. Paste the public key into `PUBLIC_KEY_SPKI_B64`.
   `npx wrangler secret put LICENSE_PRIVATE_KEY_PKCS8` (value printed by keygen).
3. **Your USDC wallet.** Already set in `PAY_TO_ADDRESS`. Plain-USDC payments
   (`USDC_NETWORK = "base"`) take real money as soon as the Worker is deployed;
   they need no facilitator. x402 starts on `X402_NETWORK = "base-sepolia"`
   (test money) so you can try it first. For
   real money switch to `"base"` and a mainnet facilitator (Coinbase CDP's
   facilitator needs a free CDP API key; put its auth header in the
   `FACILITATOR_AUTH` secret).
4. **Stripe.** Create a product "SIREN Flight Recorder", $9/month recurring,
   and a **Payment Link** for it. In the link's settings:
   - After payment → redirect to
     `https://messagegabrielhere-lgtm.github.io/doomcon/agent-tools.html?session_id={CHECKOUT_SESSION_ID}`
   - Turn on the customer portal (Settings → Billing → Customer portal) so
     receipts include "Manage subscription" for online cancellation.
   - Business name: SIREN Labs (keeps your personal name off receipts where
     Stripe allows; Stripe still needs your real identity for payouts).
   Add a webhook endpoint `https://<your-worker>/stripe/webhook` with events
   `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`;
   `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with its signing secret.
5. `npx wrangler deploy`. Put the worker URL in `API` and the Payment Link in
   `STRIPE_PAYMENT_LINK` at the bottom of `site/static/agent-tools.html`.
6. **Publish the CLI.** `cd recorder && npm publish` from an npm account under
   the SIREN Labs name.
7. **Test with real money, small.** Buy one month with your own card, activate,
   run `siren-fr digest`, then refund yourself in Stripe. Do one testnet x402
   purchase.

## Tests

```
cd recorder && npm test          # log tamper detection, rollback, proxy, license, paywall
cd license-server && npm test    # Stripe signature + lifecycle, x402 verify/settle, key compat
```
