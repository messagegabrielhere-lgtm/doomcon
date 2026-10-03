# Brand assets

Distribution artefacts — for X, press, decks. **Not** the on-site marks.

| File | Size | Use |
|---|---|---|
| `x-profile.png` | 400×400 | X profile picture |
| `x-header.png` | 1500×500 | X header |

**Generated, not drawn.** `node site/brand-assets.mjs` writes both from the
same primitives as the share cards and the favicon: the sentinel mark, and
`brand.TAGLINE` / `brand.PUBLICATION` read at run time. Until 2026-10-03 these
were hand-made files carrying the retired dial logo and the retired tagline
("never predicted", which fails the post pre-flight). Change the tagline in
`site/brand.mjs`, re-run the script, upload the two files to X by hand — X
blocks automated profile edits.

Both are static, so neither claims a reading: the mark is set at level 3,
whose heat colour is the brand accent, and the header draws the five-band scale
with no band singled out.

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
