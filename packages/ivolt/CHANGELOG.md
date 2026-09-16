# Changelog

All notable changes to `@intervolutions/ivolt`. Dates are added when a version is published.

## 1.0.0-rc.2 (unreleased)

### Changed
- **Cobalt** (ADR-049): the default palette moves from green to the colours of intervolutions.com: navy-tinted neutrals, cobalt primary, cyan accent, indigo info, lime success, coral danger, amber warning; every semantic pair measured against WCAG in both themes. New tokens `--iv-gradient-brand` and `--iv-gradient-primary`. Radii are 6, 14 and 22 px (`sm`, `md`, `lg`). `--iv-font-sans` lists Outfit first (the package ships no font files; the site serves Outfit under the OFL). Components adopt the treatments of the reference site: pill buttons with the brand gradient and a glow, cobalt-tinted ghost buttons, translucent cards with a hairline stroke, tinted `kbd`, 14 px fields.
- `Hero`: `--iv-hero-accent` defaults to `--iv-palette-cyan-400` in both themes instead of `--iv-color-accent`, whose light value is now a deep teal that sinks into the dark scrim; `--light` still points it at `--iv-color-primary`.
- Breaking for the beta only: the eleven-step `--iv-palette-green-*` (now five steps, success only) and `--iv-palette-blue-*` are gone; the new hues are `cobalt`, `cyan` and `indigo`.

## 1.0.0-rc.1 — 2026-09-15 (npm, tag `next`)

### Changed
- `Megamenu` rebuilt from scratch (contract §8.9 v2, ADR-048) after the owner's review: the panel gains a head with title, count and close, a directory with counts, discovery tabs with ranked art cards, a cloud, a feature box, an aside with recent items and facets, an in-panel filter, a foot with crumb and terminal-style status line, a ticker, a caret under the trigger and a staggered entrance; `--full`, `--glass` and `--dense`; new events `iv:change` (panel tabs) and `iv:filter`, methods `selectTab` and `filter`, options `filter`, `emptyText`, `countText`, `closeText`. Hover intent, keyboard, overlay, inert panels and the mobile accordion stay. Migration: `__inner` → `__body`, `__group` → `__directory`, `__links` → `__dirlist`, `__bottom` → `__foot`.

## 1.0.0-rc.0 — 2026-09-15 (npm, tag `next`)

The contract of `docs/API_CONTRACT.md` is frozen for 1.0 and `docs/STABILITY.md` says what is public and how it changes. Nothing new lands before 1.0.0, only fixes. What 1.0 ships, cycle by cycle:

- 0.1 — tokens, themes, base, layout, utilities matrix, button, card, form, dialog, badge, alert, table, breadcrumb, pagination, progress, skeleton, disclosure, tabs, dropdown, drawer, toast.
- 0.2 — combobox, data table, Spanish documentation.
- 0.3 — carousel, picker, form validation and counter, surfaces (glass, grain, mesh, aurora, glow).
- 0.4 — megamenu, edge effects with proximity and reveal, hero.
- 0.5 — datepicker, tooltip, popover, command palette, theme builder.
- 0.6 — navbar, stepper, timeline, stat, avatar, declarative toasts, the expressive-layer tokens.
- 0.7 — lightbox, scroll motion with a JavaScript fallback, text effects, countup, the showcase recipe.
- 0.8 — hardening: destroy restores the served DOM, focus chosen correctly, right-to-left, forced colours, print, 320 px.
- 0.9 — card-by-card stack relay, sibling labels in the picker, the flat stylesheet equal to the layered one, every string an option, generated reference, localisation and stability pages.

## 0.9.0-beta.0 (unreleased)

### Changed
- `iv-stack-cards` hands over card by card: each card shrinks and fades exactly while the next one arrives (named view timeline, `--iv-i` and `--iv-stack-count`).
- The picker keeps a sibling `<label>` next to its visible field, so floating labels and sibling selectors work without a compensating rule.
- Titles (dialog, drawer, card, popover, tabs, command, megamenu, timeline, hero, stat) and every link-shaped component (button, navbar, megamenu, pagination, stepper, tabs, dropdown, command, gallery) keep their type and colour in the flat stylesheet; `tests/browser/qa-flat.spec.js` compares computed styles between the two sheets.

### Added
- Every string a component writes is an option: `dismissText` (toast region), `clearText` and `removeText` (picker), `slideText` and `counterText` (carousel), `counterText` (lightbox); counters format their digits with `Intl.NumberFormat` from the element's language.
- Documentation: a generated reference of every class, local, token, option, event and attribute, checked by a contract test; a localisation page; a stability and versioning page.

## 0.8.0-beta.0 (unreleased)

### Fixed
- Right-to-left: the carousel track, the drawer entrance, the marquee loop, the megamenu chevron, the popover arrow, the range fill, the sheen and the scan line mirror under `[dir="rtl"]`; every fixture stays inside 320 px in both directions.
- Forced colours: progress bars, the active combobox option, the highlighted command row and glass panels keep a visible state with system colours; a first `@media print` block removes sticky and fixed chrome, shadows and animations.
- Focus: hidden inputs, hidden subtrees and disabled fieldsets are skipped when a dialog, drawer or popover chooses its first focusable; `summary`, `iframe`, `contenteditable` and media with controls are focusable.
- `destroy` restores the served `style` attribute exactly (stepper, scroll motion); the drawer keeps a served `data-iv-static`; a dialog opened from its own `iv:init` listener leaves no orphan `tabindex`; a link that only carries an empty trigger attribute keeps its navigation.
- A `data-iv-*` attribute without a value reads as `true` for boolean options.

### Changed
- `surfaces.css`, `effects.css`, `motion.css` and `text.css` are also emitted as standalone minified modules in `dist/css/`, like the components.

## 0.7.0-beta.0 — 2026-09-14 (npm, tag `beta`)

### Added
- `Lightbox` (`iv-gallery`, `iv-lightbox`, export `./lightbox`): a gallery of image links that opens a full-screen viewer composed on the dialog, with keyboard, swipe, zoom, captions, counter and preloading; `--masonry` and `--strip` galleries.
- `motion.css` with `ScrollMotion` (export `./scroll-motion`): `iv-parallax`, `iv-scroll-progress`, `iv-marquee` and `iv-stack-cards` on CSS scroll-driven animations, with one small component that writes the same progress variables where the browser has none; everything static under reduced motion.
- `text.css` with `Countup` (export `./countup`): `iv-text-reveal` (line by line, staggered by `--iv-i`), `iv-text-glow`, `iv-text-outline`, `iv-text-shimmer`, and served figures that count up when they enter the viewport, formatted through `Intl.NumberFormat`.
- The «showcase» recipe: a full product page composed only with the framework (navbar, cinematic hero with parallax, marquee, countup figures, gallery with lightbox, stepper, timeline, text reveals), with its own credited photographs.

## 0.6.0-beta.0 (unreleased)

### Added
- `Navbar` (`iv-navbar`, export `./navbar`): a site header with brand, links and actions that folds into a panel below a breakpoint, sticks and condenses on scroll (glass surface, ambient shadow), can hide while scrolling down, stays transparent over a cinematic hero until condensed, and hosts a megamenu.
- `Stepper` (`iv-stepper`, export `./stepper`): a step-by-step assistant with a numbered index, one panel per step, next and back controls that validate the current panel (through `Form` when present, through the constraint API otherwise), keyboard moves between reachable steps, a progress line and `iv:complete` at the end; `--vertical` and `--compact`.
- `timeline.css`, `stat.css`, `avatar.css`: a vertical, alternating or horizontal timeline with states; key figures with label, value, delta and hint (`--card`, `--lg`, `--glow`); avatars with image or initials, sizes, ring, status dot and overlapping groups.
- Declarative toasts: a button with `data-iv-toast="<region id>"` and `data-iv-message` shows a notice without JavaScript of its own.
- Tokens `--iv-shadow-ambient`, `--iv-color-hover-surface`, `--iv-color-primary-border`, `--iv-focus-halo`, `--iv-tracking-tight` and `--iv-tracking-caps`; `.iv-progress--lg` and `--iv-progress-size`; `--iv-card-shadow` and `--iv-card-shadow-hover`.

### Changed
- Twenty-two component modules polished after the owner's review (ADR-040): shadows that exist in the dark theme, a focus halo shared by fields and buttons, table headers in small caps, masked sort markers, pill tabs, circular calendar days, toasts by tone, and a floating label that no longer collides with an enriched select. Dialog and drawer backdrops blur.
- Those recipes now consume the new tokens; the local `--iv-progress-height` is replaced by `--iv-progress-size`; every card lifts on hover where hover exists; the secondary button outline uses `--iv-color-primary-border`.

## 0.5.0-beta.0 (unreleased)

### Added
- `Command` (`iv-command`, export `./command`): a command palette composed on the dialog, opened with Ctrl+K or `/`, filtered by label and keywords, driven by the keyboard, with groups, shortcuts, recent items in local storage (opt-in) and actions added from the API.
- `Tooltip` (export `./tooltip`): short hints from `data-iv-tooltip`, shown on hover after a delay and at once on focus, described through `aria-describedby`, placed above or below within the viewport.
- `Popover` (export `./popover`): rich content on the native `popover` attribute, placed next to its invoker (CSS anchor positioning where supported, measured otherwise), focus in and back, cancelable `iv:open`/`iv:close` mapped from `beforetoggle`; `--arrow` and `--glass` variants.
- `Datepicker` (`iv-datepicker`, export `./datepicker`): a native date input gains an accessible calendar dialog with a keyboard grid, month and year navigation, today and clear, `min`, `max` and `step`, localised names through `Intl` and a first day of the week that follows the locale; the native picker stays on coarse pointers.

## 0.4.0-beta.0 (unreleased)

### Added
- `effects.css` with `Proximity` and `Reveal` (exports `./proximity`, `./reveal`): `iv-edge-glint` (a light travels the border), `iv-edge-near` (the border lights up where the pointer approaches), `iv-scan`, `iv-spark`, `iv-pulse-glow`, `iv-rise` and `iv-reveal` (scroll reveals); everything static under reduced motion.
- `hero.css`: full-bleed opening sections (`iv-hero`) with media, scrim, kicker, oversized title rising line by line, lead, actions, facts and an aside; `--center`, `--split`, `--cinematic`, `--terminal`, `--compact`, `--kenburns` and `--light`.
- `Megamenu` (`iv-megamenu`, export `./megamenu`): a navigation bar whose items open wide panels with link groups, cards and a bottom bar; hover and focus without JavaScript, intentional hover, keyboard, overlay, inert panels and a mobile accordion with it.

### Changed
- Declarative triggers (`data-iv-open`, `data-iv-toggle`, `data-iv-close`) ignore empty values, so components can use those attributes as state without noise in the console.
- Toast regions enter the top layer as manual popovers where supported; combobox lists are placed and capped by the room around the input; carousel slides off screen are inert in every effect (ADR-034).
- Every `select.iv-select` is enhanced by the picker when JavaScript runs; `data-iv-native` keeps the native control (ADR-032).
- Fixes from the adversarial review: selection drags no longer close dialogs and drawers, tabs activate on Space without scrolling, dropdowns return focus after pointer selection, toasts stay while hovered or focused, switches and ranges survive forced colours, long words and inline code no longer widen pages (ADR-035).

## 0.3.0-beta.0 (unreleased)

### Added
- `Carousel` (`iv-carousel`, export `./carousel`): a scroll-snap slideshow that works without JavaScript and becomes an APG tabbed carousel with `slide` (parallax captions), `fade` and `cinema` (Ken Burns) effects, autoplay with a progress bar and a large counter, play/pause, swipe, thumbnails, and no autoplay under reduced motion.
- `Picker` (`iv-picker`, export `./picker`): a native `<select>` promoted to a searchable selector with chips for multiple values, option groups, a maximum number of items, a clear button, full keyboard support and two-way synchronisation with the native element; `iv-picker--glass` variant.
- `Form` (`data-iv-component="form"`, export `./form`): constraint validation turned into inline messages per error type (`data-iv-error-*`), an optional error summary with links, focus management, `iv:validate` for custom rules, `iv:invalid` and a cancelable `iv:valid` before a valid submit.
- `Counter` (export `./counter`): character or word counter for a text field with warning and soft-limit states; a soft limit marks the control invalid through `setCustomValidity`.
- `form.css`: floating labels (`iv-field--float`), input groups, switch, range, file drop zone, auto-sizing textarea, input sizes, invalid and valid field states with icons, error summary and a one-shot shake.
- `surfaces.css` (in `ivolt.css` after the components): `iv-glass` and `iv-glass--strong` with a solid fallback, `iv-texture-grain`, `iv-texture-mesh`, `iv-texture-aurora`, `iv-glow`, `iv-gradient-text`, `iv-shine` and `iv-elevate`, all driven by the new tokens and static under reduced motion.
- Tokens `glass`, `blur`, `glow` and `texture` for the expressive layer (ADR-030).

### Changed
- Size budgets raised to 40 KiB (CSS) and 32 KiB (JS, gzip) with ADR-030.

## 0.2.0-beta.0 (unreleased)

### Added
- `Combobox` (`iv-combobox`, `data-iv-component="combobox"`, export `./combobox`): a labelled `<input list>` with a `<datalist>` is promoted to the APG combobox pattern with a filtered listbox; options `filter`, `minChars`, `strict`, `autoselect`, `emptyText`; cancelable `iv:change` before `iv:changed`; native `input`/`change` dispatched on the input; case- and diacritic-insensitive matching; `destroy` restores the served markup exactly.
- `DataTable` (`iv-datatable`, `data-iv-component="datatable"`, export `./datatable`): client-side sorting (text, number, date) and filtering on top of a served `<table class="iv-table">`; header buttons with `aria-sort`, hidden filter block until JavaScript runs, live row count, empty row, cancelable `iv:sort`/`iv:filter` before `iv:sorted`/`iv:filtered`; `destroy` restores the served order and markup exactly.

## 0.1.0-alpha.0 (unreleased)

First alpha. Tokens and light/dark/system themes without JavaScript, `.iv-root`-scoped base styles, layout primitives (container, stack, cluster, grid), a finite utility matrix, CSS families (button, card, form, badge, alert, table, breadcrumb, pagination, progress, skeleton) and progressively enhanced components (dialog, drawer, disclosure, tabs, dropdown, toast). Layered and flat stylesheets, per-component CSS, ES modules with real `exports`, an IIFE (`IVOLT`), type declarations and token JSON.

Known limitations: alpha API; no screen reader or physical device testing yet; no specific forced-colors support; no framework wrappers.
