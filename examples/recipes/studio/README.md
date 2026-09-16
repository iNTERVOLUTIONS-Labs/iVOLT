# studio — Meridian Field

An editorial page for an invented design studio, built only with the published iVOLT
package (`../ivolt/css/ivolt.min.css` and `../ivolt/js/auto.js`) plus one local
stylesheet for the layout and the art of this page.

## What it demonstrates

| Area | Components |
| --- | --- |
| Frame | `iv-navbar--transparent` with the early `data-iv-js` mark (ADR-042), `iv-scroll-progress` driven by `ScrollMotion` |
| Cover | `iv-hero--cinematic` with `iv-parallax-frame` / `iv-parallax--media` over a `<picture>`, `iv-text-reveal` line masks, `iv-rise`, `iv-hero__facts`, `iv-edge-glint` |
| Rhythm | `iv-marquee--fade` in display type, with `iv-gradient-text` and `iv-text-outline` items |
| Body | `Reveal` on four notes with a conductive rule, `iv-stack-cards` deck of three services, `iv-avatar` / `iv-avatar-group`, `iv-timeline--alternate` |
| Gallery | `iv-gallery` with `Lightbox` — six photographs, each tile a link to its own file |
| Form | `iv-stepper` inside `iv-form`, `iv-picker`, field-level error messages |
| Theme | a three-button group in the footer that calls the `theme` module of the package |

## What is fictional

Meridian Field is a fictional studio: the name, the people, the dates and the project
scopes were written for this example. Nothing is sold, and the three-step brief
validates in the browser with no server behind it. The page says so once, in the
footer.

## Photographs

Source: Lorem Picsum (`https://picsum.photos/id/<id>/1280/800`), which serves
photographs published on Unsplash under the Unsplash License (free to use, no
permission needed; attribution appreciated). Resized to 1280×800 JPEG, plus one 800×500
copy used below the `md` breakpoint. There are no photographs of people. The npm
package ships no bitmaps.

| File | What it shows | Author | Unsplash page |
| --- | --- | --- | --- |
| `p1048.jpg`, `p1048-800.jpg` | Looking up between glass towers into a white sky | Anthony DELANOIX | https://unsplash.com/photos/b5POxb2aL9o |
| `p1081.jpg` | Stacked concrete balconies against a pale sky | Julien Moreau | https://unsplash.com/photos/688Fna1pwOQ |
| `p1076.jpg` | A latticed tower seen from below | Samuel Zeller | https://unsplash.com/photos/WlD3vixTVUg |
| `p1047.jpg` | A brick alley with fire escapes | sergee bee | https://unsplash.com/photos/bIQiMWxX_WU |
| `p1079.jpg` | A ring of sparks spun in the dark | Kamesh Vedula | https://unsplash.com/photos/ISL7czxIP-k |
| `p1077.jpg` | Two cyclists blurred by a long exposure | Maico Amorim | https://unsplash.com/photos/SJWPKMb9u-k |
| `p1039.jpg` | A waterfall in a green forest ravine | Andrew Coelho | https://unsplash.com/photos/VB-w_3dnyvI |
