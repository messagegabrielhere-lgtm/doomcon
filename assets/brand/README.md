# Brand assets

Distribution artefacts — for X, press, decks. **Not** the on-site marks.

| File | Size | Use |
|---|---|---|
| `x-profile.png` | 400×400 | X profile picture |
| `x-header.png` | 1500×500 | X header |

## These are deliberately NOT in `assets/logos/`

`assets/logos/` overrides what the site renders. Everything there replaces a
**generated, live** mark with a static image, and each slot costs something real:

- `mark.svg` / `favicon.svg` — the generated mark is **level-lit**: its five
  grille slots light in heat colours up to the current DOOMCON level, so a
  pinned tab carries the reading. Nothing else in the category does this. A
  static file throws it away.
- `wordmark.svg` — the masthead wordmark is **real text**, so it is selectable,
  translatable, indexable and set in the site's own face. An `<img>` is none of
  those. See the note above `mastheadLockup()` in `site/brandmarks.mjs`.
- `og.png` — the generated card carries the **live score**. A static one shows
  a number that was true once.

So the slots stay empty on purpose. They exist for an operator who wants a
hand-drawn identity badly enough to pay those costs — drop a file in and it
takes over on the next build, delete it and the generated mark returns.

Share cards are generated too, into `public/cards/`, by `collector/card.mjs`.
