# Changelog

All notable changes to `@intervolutions/ivolt`. Dates are added when a version is published.

## 0.2.0-beta.0 (unreleased)

### Added
- `Combobox` (`iv-combobox`, `data-iv-component="combobox"`, export `./combobox`): a labelled `<input list>` with a `<datalist>` is promoted to the APG combobox pattern with a filtered listbox; options `filter`, `minChars`, `strict`, `autoselect`, `emptyText`; cancelable `iv:change` before `iv:changed`; native `input`/`change` dispatched on the input; case- and diacritic-insensitive matching; `destroy` restores the served markup exactly.
- `DataTable` (`iv-datatable`, `data-iv-component="datatable"`, export `./datatable`): client-side sorting (text, number, date) and filtering on top of a served `<table class="iv-table">`; header buttons with `aria-sort`, hidden filter block until JavaScript runs, live row count, empty row, cancelable `iv:sort`/`iv:filter` before `iv:sorted`/`iv:filtered`; `destroy` restores the served order and markup exactly.

## 0.1.0-alpha.0 (unreleased)

First alpha. Tokens and light/dark/system themes without JavaScript, `.iv-root`-scoped base styles, layout primitives (container, stack, cluster, grid), a finite utility matrix, CSS families (button, card, form, badge, alert, table, breadcrumb, pagination, progress, skeleton) and progressively enhanced components (dialog, drawer, disclosure, tabs, dropdown, toast). Layered and flat stylesheets, per-component CSS, ES modules with real `exports`, an IIFE (`IVOLT`), type declarations and token JSON.

Known limitations: alpha API; no screen reader or physical device testing yet; no specific forced-colors support; no framework wrappers.
