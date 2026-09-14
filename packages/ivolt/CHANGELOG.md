# Changelog

All notable changes to `@intervolutions/ivolt`. Dates are added when a version is published.

## 0.3.0-beta.0 (unreleased)

### Added
- `Carousel` (`iv-carousel`, export `./carousel`): a scroll-snap slideshow that works without JavaScript and becomes an APG tabbed carousel with `slide` (parallax captions), `fade` and `cinema` (Ken Burns) effects, autoplay with a progress bar and a large counter, play/pause, swipe, thumbnails, and no autoplay under reduced motion.
- `Picker` (`iv-picker`, export `./picker`): a native `<select>` promoted to a searchable selector with chips for multiple values, option groups, a maximum number of items, a clear button, full keyboard support and two-way synchronisation with the native element; `iv-picker--glass` variant.
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
