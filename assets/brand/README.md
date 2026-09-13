# Brand assets

Official artwork, provided by iNTERVOLUTIONS. Source files are never modified by the build.

| File | Contents | Used for |
|---|---|---|
| `ivolt-logo-balanced.svg` | full lockup: isotype, iVOLT wordmark, CSS tag and "BY iNTERVOLUTIONS" signature; ivory on transparent, designed for dark surfaces | Open Graph image (as is); docs header (copy with ivory → `currentColor`, electric green → `--iv-color-primary`, tag glyphs → `--iv-color-on-primary`, signature omitted, so the whole lockup follows light/dark) |
| `ivolt-isotipo.svg` | split O with the bolt inside | favicon (on a dark rounded plate), compact uses |

Consumers: `apps/docs/src/brand.js` (header), `scripts/build-og.mjs` (OG image and favicon), `docs/design/brand-board.html` (reference sheet). Without these files the build falls back to a temporary wordmark and marks the OG image as temporary.
