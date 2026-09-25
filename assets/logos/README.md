# Drop logos here

Anything in this directory is copied to `public/logos/` on every build and is
picked up by name — no code change, no path to wire.

## Names the site looks for

| File | Where it is used | Notes |
|---|---|---|
| `mark.svg` | masthead, replacing the generated detector mark | SVG preferred; PNG works |
| `mark.png` | same, if no `mark.svg` | at least 512×512 |
| `wordmark.svg` | masthead lockup beside the mark | |
| `og.png` | `og:image` fallback, replacing the generated card | exactly 1200×630 |
| `favicon.svg` | browser tab | replaces the level-lit generated favicon |
| `lab-<id>.svg` | the watch floor, per lab | ids: `openai`, `anthropic`, `google-deepmind`, `xai`, `meta`, `deepseek`, `mistral`, `qwen` |

Any other file is still copied and served from `/logos/<name>`, so it can be
referenced by hand.

## What happens when a file is absent

Nothing breaks. Every slot falls back to the mark `site/brandmarks.mjs`
generates, which is the current behaviour. A file appearing here overrides it;
a file disappearing restores it.

## One thing worth knowing before replacing the favicon

The generated favicon is not a static logo — it **lights its five grille slots
up to the current DOOMCON level, in heat colours**, so a pinned tab carries the
reading. No competitor in this category does that. A static `favicon.svg` here
replaces that behaviour with a fixed image. Worth it for a strong brand mark;
worth knowing it is a trade.
