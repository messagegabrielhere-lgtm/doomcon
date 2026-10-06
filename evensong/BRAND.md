# Evensong brand

**Evensong:** *Your voice, after the day is done.*

The word means a song sung at the close of day. The app records your stories, opinions and way of talking, so that after you die the people you choose can still hear from you. The brand should feel like a warm room at dusk with the lamps coming on. Not a tech product, not a funeral home.

## Name

- Write it as one word, capital E: **Evensong**. Never "EvenSong" or "Even Song".
- Before relying on the name, confirm it's free in App Store Connect and do a trademark search in each market you'll launch in (USPTO for the US). A web search found no App Store app using it.
- The word has church connotations (it's the Anglican evening service). That gives it a reverent warmth, but keep the visual language non-denominational: sky, light, voice. No crosses, choirs or stained glass.

## Taglines

- Primary: **Your voice, after the day is done.**
- App Store subtitle (30 characters max): **Stay with the people you love** (29)
- Alternates for marketing:
  - Tell it now. They'll hear it later.
  - The conversation doesn't have to end.
  - Leave more than a memory.

## Voice and tone

Warm, plain, unhurried. Talk like a kind friend who's comfortable with the subject.

| Say | Don't say |
|---|---|
| your voice, your stories, the people you love | upload, digital twin, clone, data |
| when you're gone, after you die | pass on, departed, deceased (in UI copy) |
| an AI built from what you shared | you'll live forever, digital immortality, it's really them |
| check in, still here | dead-man's switch, liveness check |
| the people you choose | beneficiaries, users |

Rules:
- **Be honest about what it is.** Every recipient-facing screen says it's an AI built from what someone chose to share. Never imply resurrection.
- **Don't be morbid or chirpy.** No skulls or tombstones, and no exclamation marks around death.
- **Use short sentences and plain words.** Many readers will be grieving.

## Mark

A sun on the horizon whose lower edge dips below the line as the tail of a speech bubble: a voice that keeps speaking as the day ends.

- The SwiftUI version is `HorizonMark` in `ios/Evensong/Theme.swift`. The icon is `ios/Evensong/Assets.xcassets/AppIcon.appiconset/AppIcon.png`.
- Always use lamplight gold on a dark sky, or dusk indigo on parchment. Don't outline, rotate or recolor it outside the palette.
- Minimum size: 24 pt. Below that, the bubble tail disappears.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| Dusk | `#3B3566` | `#8E86C4` | Primary, accent color in light mode |
| Lamplight | `#9C5E17` | `#F0B35E` | Highlights and the mark. Accent color in dark mode |
| Canvas | `#F8F3EA` (parchment) | `#15131D` (night) | Page background |
| Card | `#FFFDF8` | `#211E2C` | Bubbles, cards |
| Ink | `#241F33` | `#EDE7DC` | Primary text |
| Heather | `#6F6590` | `#A79DC4` | Secondary text, icons |
| OnAccent | `#FFFFFF` | `#1A1726` | Text on accent fills |

The dusk sky gradient for the welcome screen and icon runs night `#141124` → indigo `#342E5E` → plum `#764C6C` → amber `#EC9E56` at the horizon.

Contrast (WCAG): every text pair above passes AA (4.5:1 or better). Light-mode Lamplight was darkened to `#9C5E17` to get there. The brighter `#F0B35E` is for dark backgrounds only.

## Type

- **Headings, the welcome screen, letters, and everything the AI says:** New York, Apple's built-in serif (`.fontDesign(.serif)`). The departed person's words always appear in serif, which sets them apart from the interface.
- **Everything else:** SF Pro, the system default.
- No custom fonts to license or bundle. Both support Dynamic Type.

## App Store listing (draft)

- **Name:** Evensong
- **Subtitle:** Stay with the people you love
- **Promotional text:** Record your stories, your opinions and the way you talk. When you're gone, the people you choose can still hear from you.
- **Keywords:** legacy,memories,memoir,voice,family,grief,story,interview,remembrance,AI,journal,biography
- **Category:** Lifestyle (secondary: Social Networking)
