# site/

**What this is:** the **static site generator**. It turns `data/*.json` into
HTML under `public/` for GitHub Pages.

**Novice map**

| Piece | Job |
|---|---|
| `build.mjs` | Main entry — run `node site/build.mjs` |
| `templates/` | Page templates (home, news, methodology, …) |
| `static/` | Hand-written pages (arena, scanner, monitor, game, …) copied into the build |
| `brand.mjs` | Names, URLs, disclaimers, colours |
| `styles.mjs` / `sitebar.mjs` | Shared CSS and the sitewide disclosure bar |
| `post-sheet.mjs` | Operator console for copying daily posts |

**Rules for novices**

- Do not edit `public/` by hand — it is rebuild output (and gitignored on main).
- Prefer editing a template or `site/static/*.html`, then rebuild.
- Core site code stays **npm-free** (Node built-ins only).

Brand/voice docs live under [`docs/`](../docs/).
