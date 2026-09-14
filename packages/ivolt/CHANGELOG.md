# Changelog

All notable changes to `@intervolutions/ivolt`. Dates are added when a version is published.

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
