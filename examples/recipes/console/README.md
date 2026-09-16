# console — Arclight Console

A dense product panel for an invented grid operator, dark by default, built only with
the published iVOLT package (`../ivolt/css/ivolt.min.css` and `../ivolt/js/auto.js`)
plus one local stylesheet for the layout of this page.

## What it demonstrates

| Area | Components |
| --- | --- |
| Frame | `iv-navbar` with an `iv-megamenu` inside its panel and the early `data-iv-js` mark (ADR-042); `iv-drawer` that is modal below `lg` and a static column above it |
| Figures | `iv-stat--card` / `iv-stat--glow` with `Countup`, `iv-progress` in three tones, `iv-pulse-glow` on a badge |
| Data | `iv-tabs`, `iv-datatable` with a text filter and sortable columns (`data-iv-sort`, `data-iv-sorted`, `data-iv-value`), `iv-timeline` |
| Loading | `iv-skeleton` cards that replace the job queue for about a second when **Reload sample data** is used, then put it back |
| Messages | `iv-alert` in three tones, declarative `iv-toast`, `iv-popover`, `iv-tooltip`, `iv-dialog` as a confirmation |
| Keyboard | `iv-command` palette on `Ctrl`/`⌘`+`K`, with page sections and three actions |
| Form | `iv-form` with a summary and blur validation, `iv-picker`, `iv-datepicker` with `data-iv-native="off"`, `iv-switch`, a character counter |
| Theme | a three-button group in the top bar and a palette command, both calling the `theme` module of the package |

## What is fictional

Arclight is a fictional grid operator: every feeder, district, load, frequency,
temperature, crew name, timestamp and alert was written by hand for this example, and
the page is connected to nothing — no account, no telemetry, no network request. The
page says so once, in the footer.

The destructive-looking controls destroy nothing: **Trip feeder F-12** opens a dialog
that says what would happen and then shows a notification, **Acknowledge** shows a
notification, and the maintenance-window form validates in the browser and reports that
nothing was requested. The command palette only moves within this page.

## Photographs

None. This recipe uses no bitmaps at all; the only images are inline SVG icons drawn
for the page.
