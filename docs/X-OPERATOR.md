# X operator checklist — `@SIRENutf6`

What only a human can change on the live account. Checked against the public
profile on **2026-10-07**. Code and CI cannot flip these switches.

Live profile: https://x.com/SIRENutf6  
Site (already in the website field): https://messagegabrielhere-lgtm.github.io/doomcon/

---

## 1. Bio — **change this now**

**Current (fails compliance):**

```text
SIREN · Superintelligence Real-time Early Notice. Power, chips, cash — one number you can check. Run by a Grok Bot crew.
```

Problems: it never says the account is automated, and it never names a
human-managed account. “Grok Bot crew” is not enough under X’s automation rules.

**Replace with** (swap `YOUR_HUMAN` for the handle you actually read — no `@`
doubling if you paste carefully):

```text
Automated account managed by @YOUR_HUMAN. One reading a day of the SIREN AI tempo index, from public data. Not a prediction.
```

That string is what `collector/post-daily.mjs` ships as `BIO_GUIDANCE.x` (126
characters with a 15-character handle still under X’s 160 limit).

How: signed in as `@SIRENutf6` → Edit profile → Bio → paste → Save.

When done: add `"x-bio-disclosure"` to `done` in `compliance/manual.json`.

---

## 2. “Automated” label — **confirm / turn on**

1. Signed in as `@SIRENutf6`.
2. Settings and privacy → Your account → Account information → Automation.
3. Choose **Managing account** = the same `@YOUR_HUMAN` as in the bio.
4. Confirm with that account’s password when X asks.
5. Check the profile: an **Automated** label should sit under the display name.

When done: add `"x-automated-label"` to `done` in `compliance/manual.json`.

---

## 3. Affiliate posts — **fix the habit**

Recent timeline posts include bare Amazon short links (`amzn.to/…`) with **no
`#ad`**. That breaks FTC Endorsement Guides and Amazon Associates rules for
social posts. The daily index poster in this repo never emits affiliate links;
those posts are hand-made.

**From now on, every X post that carries an Amazon / affiliate URL must start
with `#ad` or `(affiliate link)`**, for example:

```text
#ad Waking up hot at 3 am? https://amzn.to/…
```

Also: Associates Central → Account settings → websites and mobile apps → add
**both** the GitHub Pages URL **and** `https://x.com/SIRENutf6` (or the account
is at risk of termination). When listed, tick `amazon-associates` in
`compliance/manual.json`.

---

## 4. Keep as-is (already fine)

| Field | Live value |
|---|---|
| Handle | `@SIRENutf6` |
| Website | GitHub Pages doomcon URL |
| Index posts | Link-free text + card is the paid-API shape; keep that |

Do **not** put a URL in automated index post text (13× more expensive and ranks
worse). The domain stays on the card and in the bio website field.

---

## 5. Keep your human account in sync (likes / reposts)

Automated likes and reposts are **forbidden** for `@SIRENutf6` (binding X use-case
text in `docs/POSTING.md` §6; self-serve apps also lost those endpoints). The
sync path is a human console, same shape as `/post-sheet.html`:

1. Open **`/engage-sheet.html`** (local: `npm run engage` → `public/engage-sheet.html`).
2. Sign into X as the **managing human** account — never as `@SIRENutf6`.
3. Work the list top-down. Each row is an X status already on siren.watch (X wire
   via oEmbed and/or a newsroom item whose URL is the status).
4. Click **Like on X** / **Repost on X** (opens X intent URLs; you confirm).
5. Tick the checkboxes so the sheet tracks what you finished. Progress is
   localStorage only.

Rebuilds with the hourly collect lane (`node site/engage-sheet.mjs` after
`post-sheet`). Machine-readable slate: `data/x-engage.json`.

---

## 6. After you change it

```bash
npm run compliance
```

The auditor still cannot see the live bio; it only stops printing the manual
rows once you mark them `done` in `compliance/manual.json`. Mark them only when
the profile really matches.
