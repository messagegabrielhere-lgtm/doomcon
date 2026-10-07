# elon/

**What this is:** builds an index of **YouTube channels** that publish Elon
Musk clips, keyed by uploader (provenance), not by scraping random reuploads.

**Novice map**

| Piece | Job |
|---|---|
| `collect.mjs` | Refresh the channel list / clip metadata |
| `sources.json` | Configured sources |
| `test/` | Unit tests |
| `.github/workflows/elon-clips.yml` | Scheduled run → `elon-data` branch |
| `site/static/elon.html` | Public page |

No npm. Rights and reuse still matter — this page is a directory, not a clipper.
(Clipping other people’s videos needs a licence; see `clipper/`.)
