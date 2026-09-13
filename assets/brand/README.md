# Brand assets

Drop the official files here; the docs build picks them up automatically (`apps/docs/src/brand.js`):

| File | Used for | Requirements |
|---|---|---|
| `ivolt-logo.svg` | header wordmark in the docs, Open Graph image, favicon derivation | SVG with a `viewBox`; text as paths preferred; colours may use `currentColor` for the wordmark so it follows the theme; the bolt/accent in `#29F59A` |
| `ivolt-mark.svg` (optional) | favicon and compact uses (the split O with the bolt inside) | square `viewBox` |

Until they exist, the build falls back to the temporary wordmark in `apps/docs/src/brand.js` and logs a warning. Nothing else in the repository references the temporary artwork.
