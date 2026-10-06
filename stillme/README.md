# Still Me

*Still me. Still here for them.*

An iPhone app for recording yourself — your stories, your opinions, the way you talk — so that after you die, the people you choose can keep talking with an AI built from you.

```
ios/      SwiftUI app (iOS 17+). Generate the Xcode project with XcodeGen.
server/   Node + TypeScript backend: stores archives, runs the check-in switch,
          and serves the persona through Claude (Anthropic's official SDK).
```

## How it works

**While you're alive**

1. **Record.** The goal is enough of you that an AI can answer the way you would, not just a biography. The Record tab has these parts:
   - **Interview:** 149 questions across 16 topics, from roots and childhood through "how you talk", advice, messages to keep, and "would you rather" questions that show how you reason. You can type or speak. Speech is transcribed on the phone, and the audio isn't kept.
   - **How you'd reply:** 28 everyday texts ("I got the job!!", "Are you mad at me?", "Grandma died this morning"). You answer exactly as you'd text back. This is the strongest signal of your voice.
   - **People in your life:** for each person, what you call each other, your history, inside jokes, and whether they've died or you're estranged. Recipients are added automatically, so the AI knows who it's talking to.
   - **Life timeline:** dated events, so the AI doesn't mix up when things happened.
   - **Dig deeper:** an AI interviewer reads your archive and asks about the gaps, such as people you mentioned but never described, or stories you hinted at.
   - **Depth meter:** scores six areas and tells you which one is thinnest.
   - **Daily question:** an optional evening notification with one unanswered question.
   - **Your own material:** free-form stories and pasted writing (letters, texts, emails).
2. **Describe yourself.** How you talk, standing instructions to your AI ("remind my kids I was proud of them"), and topics that are off limits.
3. **Rehearse.** Chat with your own AI. Long-press any reply that doesn't sound like you and tap **That's not me** to write a correction. Corrections override everything else. You can also preview how it would talk to a specific person.
4. **Choose recipients.** Name the people who should receive your legacy. Each can get a personal note. You can limit any memory to specific people (for example, something only your daughter should hear).
5. **Check in.** Tap **I'm still here** every N days (you set N). Opening the app doesn't count, because someone else might open your phone after you die.

**After you die**

```
active ──missed check-in──▶ overdue ──grace period──▶ awaiting executor ──confirms──▶ released
   ▲                          │                           │
   └──── you check in ────────┴── executor says "alive" ──┘
```

- When a check-in is missed, you get reminders (a phone notification, plus email if you add an address).
- After the grace period, your **executor** (someone you trust) gets an email link. Nothing is shared unless they confirm your death. If you didn't name an executor, the legacy is released after a second grace period.
- On release, each recipient is emailed a private access code. They install Still Me, tap **Someone left me an access code**, and can talk with your AI. The AI only sees the memories meant for them.
- If you turn out to be alive, **Revoke release** voids every code.

## The persona

`server/src/persona.ts` builds the system prompt from the archive and the person being spoken to. Things to know:

- **Model:** `claude-opus-5-5` at `medium` effort with streaming.
- **No retrieval step:** whole archives fit in the 1M-token context window. The prompt is cached for an hour, so follow-up messages cost much less.
- **Refusal fallback is on:** it uses `fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta. If a safety classifier declines a reply, Anthropic re-runs it on a fallback model instead of cutting off a grieving person mid-conversation. Remove those two lines to turn it off.
- **Guardrails written into the prompt:**
  - Don't invent memories. Say "I don't remember" instead.
  - Be honest if sincerely asked whether it's really you.
  - Never claim to be alive or watching over anyone.
  - Don't make up wishes about wills, medical care, or money.
  - If someone seems to be in crisis, step out of character and point them to help (988 in the US).

## Run it

**Server**

```bash
cd server
cp .env.example .env           # add ANTHROPIC_API_KEY
npm install
npm test                       # unit tests for the switch, privacy filtering, validation
set -a; . ./.env; set +a; npm run dev
```

Without `RESEND_API_KEY`, emails (executor links, access codes) are printed to the console, so you can walk through the whole flow locally.

**iOS app** (requires a Mac with Xcode 16 or later)

```bash
brew install xcodegen
cd ios && xcodegen
open StillMe.xcodeproj
```

The app talks to `http://localhost:8787` by default (set in `project.yml` → `StillMeServerURL`). You can change it at runtime under **You → Server URL**. The simulator reaches your Mac's localhost directly. A physical phone needs your Mac's LAN IP or a deployed server.

## Before production

These are the parts that are deliberately simple right now:

- **Storage.** The server uses one JSON file per account. Move to a real database with encryption at rest and backups. You will be holding people's life stories, and the server has to outlive them.
- **Hosting.** It has to keep running for years, unattended, to fire the switch. Use a managed host with monitoring, run `tick()` from a scheduled job, and alert on email failures.
- **Email.** Use a real provider with a verified domain (Resend is wired in). Executor and recipient emails should not land in spam.
- **Abuse.** There's per-credential rate limiting, but no account verification. Before launch, verify the owner's email and consider verifying the executor's too.
- **Cost.** Every recipient message is a Claude call billed to you. Decide on pricing (for example, a one-time fee that funds years of conversations) and add usage caps per recipient.

See [BRAND.md](BRAND.md) for the name, palette, type and voice, [APP_STORE.md](APP_STORE.md) for the submission checklist and [PRIVACY.md](PRIVACY.md) for a privacy policy draft.
