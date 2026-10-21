# Still Me brand

**Still Me:** *Still me. Still here for them.*

Still Me lets you record yourself now, so that after you die the people you choose can talk with an AI of you. The brand's first job is **clarity**: anyone who sees the name, the icon, or the first screen should understand what the app does within five seconds. Warmth comes second, and only in plain words.

## Name

- Write it as two words, both capitalized: **Still Me**. Never "StillMe", "Stillme" or "STILL ME" in running text. `StillMe` is only for code and file names.
- **Why it works:** it's what your family would say after talking to it, "that's still him", and what you're promising: still me, even after.
- **Availability:** a web search found no app with this exact name, unlike Afterword, Everlore and Echoself, which are all taken.
- **Before launch:**
  - Reserve the name in App Store Connect.
  - Run a USPTO trademark search. Two common words can be harder to register on their own, which is another reason to always pair the name with its descriptor on the App Store (below).

## Lines

- **Tagline:** Still me. Still here for them.
- **What it does, in one line:** Record yourself now. Your family can talk with you later.
- **App Store name (30 characters max):** Still Me: Your AI Legacy (24)
- **App Store subtitle (30 characters max):** An AI of you, for your family (29)
- **Three-step explainer,** used on the welcome screen and in marketing:
  1. Record yourself now.
  2. Choose who gets you.
  3. They can talk with you.

## Voice and tone

Direct, warm, honest. Say what it is in plain words, then be kind about it.

| Say | Don't say |
|---|---|
| an AI of you, built from what you recorded | digital twin, clone, upload your consciousness |
| after you die | pass on, the departed, the deceased |
| the people you choose, your family | beneficiaries, users |
| record yourself | create your persona, train your model |
| check in, I'm still here | dead-man's switch, liveness check |

Rules:
- **Clarity beats poetry.** If a sentence needs a second read, rewrite it.
- **Always be honest that it's an AI.** Every screen a recipient sees says so. Never promise "it's really them" or "live forever".
- **No euphemisms, no gloom.** Say "die". Don't add skulls or candles, and don't make jokes.

## Mark

A speech bubble with a heartbeat running through it: your voice, still going.

- **Files:** the SwiftUI version is `PulseMark` in `ios/StillMe/Theme.swift`, and the app icon is `ios/StillMe/Assets.xcassets/AppIcon.appiconset/AppIcon.png`.
- **The icon** is a white bubble with a Pulse-red heartbeat on a vermilion field.
- **In the app,** the mark is a Pulse bubble with a white heartbeat.
- **Never flatline it.** Don't use the mark with a straight line.
- **Minimum size:** 20 pt.

## Color

One accent, used sparingly. Everything else is warm white and deep ink.

| Token | Light | Dark | Use |
|---|---|---|---|
| Pulse | `#C93C22` | `#FF7A5C` | Accent: buttons, the mark, key highlights. It's also the system accent color |
| Ink | `#14171F` | `#F2F1EE` | Headlines and body text |
| Slate | `#5E6270` | `#9BA0AC` | Secondary text, captions |
| Canvas | `#FAF8F6` | `#101217` | Page background |
| Card | `#FFFFFF` | `#1A1D24` | Bubbles, cards, input fields |
| OnAccent | `#FFFFFF` | `#101217` | Text on Pulse fills |

The icon's background is a vermilion gradient from `#E25434` to `#B9321C`.

**Contrast (WCAG AA, 4.5:1 or better for text):**
- Pulse on canvas: 4.8 (light), 7.3 (dark)
- White on Pulse: 5.1
- Ink on canvas: 16.9
- Slate on canvas: 5.7 (light), 7.2 (dark)

## Type

- **SF Pro,** the iOS system font, with no custom fonts to license or bundle.
- **Headlines:** Heavy (the app name, screen titles). **Section titles:** Bold. **Body:** Regular.
- **Supports Dynamic Type,** including the navigation titles (scaled through `UIFontMetrics`).

## App Store listing (draft)

- **Name:** Still Me: Your AI Legacy
- **Subtitle:** An AI of you, for your family
- **Promotional text:** Record your stories, your opinions and the way you talk. After you die, the people you choose can talk with an AI of you.
- **Keywords** (100 characters max): legacy,memories,memoir,voice,family,grief,afterlife,interview,remembrance,journal,biography,story
- **Category:** Lifestyle
