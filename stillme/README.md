# Still Me

*Still me. Still here for them.*

An iPhone app for recording yourself — your stories, opinions and the way you talk — so that after you die, the people you choose can talk with an AI of you.

It's just an app: no server, no website, no accounts. Everything stays on the iPhone, and the AI runs on the device with Apple Intelligence.

```
ios/            SwiftUI app (iOS 26). Generate the Xcode project with XcodeGen.
ios/scripts/    release.sh: one-command App Store upload from a Mac.
APP_STORE.md    Step-by-step submission, with every listing field ready to paste.
PRIVACY.md      Privacy policy (linked from the App Store listing).
BRAND.md        Name, colors, type, voice.
```

## How it works

**While you're alive**

1. **Record.** The goal is enough of you that an AI can answer the way you would. The Record tab has:
   - **Interview:** 149 questions in 16 topics. You can type or speak; speech becomes text on the phone, and the audio isn't kept.
   - **How you'd reply:** 28 everyday texts you answer exactly as you'd text back.
   - **People in your life:** nicknames, history and status for each person.
   - **Life timeline:** the big dates.
   - **Dig deeper:** an on-device interviewer that asks about what's missing.
   - **Depth meter:** shows the thinnest area of your archive.
   - **Daily question:** an optional evening notification.
2. **Rehearse.** Talk with your own AI. Long-press a reply that doesn't sound like you to correct it. You can also preview how it talks to each person.
3. **Seal a legacy file for each person.** It contains only the memories meant for everyone or for them, and it's encrypted.
   - Send the file now, by AirDrop, Messages or email. It stays locked.
   - Leave its unlock code in your will, or with someone you trust.

**After you die**

The person opens the `.stillme` file in Still Me and enters the code. Then they read your note and talk with the AI of you, on their own iPhone.

## Under the hood

- **On-device AI** (`Services/PersonaEngine.swift`): Apple's Foundation Models framework.
  - The model's context is small (about 4,000 tokens). So each reply gets the person's profile, the people list, the memories most relevant to what was just said, their corrections, and a few texting samples.
  - **Guardrails written into the instructions:** don't invent memories; be honest if sincerely asked whether it's really them; never claim to be alive; care for someone in crisis.
  - **Requirements:** an iPhone with Apple Intelligence (iPhone 15 Pro or newer). Other iPhones can still record.
- **Sealing** (`Services/LegacySeal.swift`):
  - **Encryption:** AES-GCM.
  - **Key:** derived with PBKDF2-SHA256 (600,000 rounds) from a random 16-character code.
  - **Code:** shown once and never stored.
  - **Readable without the code:** only who the file is from and who it's for.
- **Storage:** JSON files in Application Support, using iOS's complete file protection.

## Build and test

You need a Mac with Xcode 26:

```bash
brew install xcodegen
cd ios && xcodegen
open StillMe.xcodeproj
```

No Mac needed for checks. On every push to this branch, `.github/workflows/stillme-ios.yml`:
- compiles Debug and Release builds,
- runs the unit tests,
- takes light and dark screenshots of 11 screens on a 6.9" iPhone simulator,
- saves them to the `stillme-screens` branch.

Debug builds accept these launch arguments:

| Argument | What it does |
|---|---|
| `-StillMeDemo 1` | Fills the app with a fictional person's archive |
| `-mode owner` / `-mode recipient` | Picks which side of the app opens |
| `-StillMeTab N` | Opens owner tab N (0 to 4) |
| `-StillMeScreen consent\|people\|replies\|intro` | Opens a specific screen |

## Release

See [APP_STORE.md](APP_STORE.md). In short: create the app record, run `ios/scripts/release.sh` on your Mac, fill in the listing from that file, and submit.
