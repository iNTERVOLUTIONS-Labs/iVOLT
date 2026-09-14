# Showcase recipe

A complete product page composed only with iVOLT: a sticky, transparent navbar over a cinematic hero
with a parallax photograph, a marquee of tokens, counted figures, a photo gallery with the lightbox
viewer, a sticky deck of cards, a three-step contact wizard that submits nothing, the real roadmap of
the package as a timeline, and a reading progress bar.

Open `index.html` directly. It links `../ivolt/css/ivolt.min.css` and `../ivolt/js/auto.js`, which
`node scripts/sync-examples.mjs` copies from the built package; inside the downloadable zip those
assets travel with the page. The photographs live in `photos/` next to this file, so the recipe works
offline and does not depend on the documentation site.

Honesty notes: the figures in the “Measured, not estimated” section are the real measurements of the
`0.6.0-beta.0` milestone and say so; the contact wizard has no server and says so; the timeline
carries no invented dates, because the changelog gives none. Photograph credits are in
`photos/README.md`.
