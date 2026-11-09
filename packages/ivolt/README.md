# @intervolutions/ivolt

**iVOLT is a CSS framework and design system for accessible interfaces.** Semantic components are the fast path, a finite utility set composes them, design tokens are the visual contract and JavaScript is optional. There are no runtime dependencies and no build step: one `<link>` is enough in plain HTML, Astro, WordPress or any bundler, with dark mode, right-to-left, print and AA contrast handled from the first page.

[![npm version](https://img.shields.io/npm/v/@intervolutions/ivolt.svg)](https://www.npmjs.com/package/@intervolutions/ivolt)
[![license MIT](https://img.shields.io/npm/l/@intervolutions/ivolt.svg)](LICENSE)

## Quick start from a CDN

Two lines, no install. The `@1` pin follows every 1.x release; pin an exact version (`@1.1.0`) in production if you want byte-for-byte repeatable pages, and then add an `integrity` hash (jsDelivr shows it for each file) with `crossorigin="anonymous"`.

```html
<html class="iv-root" data-iv-theme="system">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@intervolutions/ivolt@1/dist/css/ivolt.min.css">
  <script type="module" src="https://cdn.jsdelivr.net/npm/@intervolutions/ivolt@1/dist/js/auto.min.js"></script>
```

`auto.min.js` is every component in one file that starts itself; leave it out and the CSS-only components still work. The classic-script build is `dist/js/ivolt.iife.min.js` (global `IVOLT`, call `IVOLT.init()`).

## Install

```sh
npm install @intervolutions/ivolt
```

Plain HTML, no bundler: copy `node_modules/@intervolutions/ivolt/dist` next to your page and link it.

```html
<html class="iv-root" data-iv-theme="system">
  <link rel="stylesheet" href="ivolt/css/ivolt.min.css">
  <script type="module" src="ivolt/js/auto.js"></script>
```

With a bundler, Astro or Vite:

```js
import "@intervolutions/ivolt/css/ivolt.css";
import { init, Dialog } from "@intervolutions/ivolt";
init(document);
```

**Documentation:** guides, every component with live examples, the token reference and four complete pages are at [ivolt.intervolutions.com](https://ivolt.intervolutions.com/); the source is at [github.com/iNTERVOLUTIONS-Labs/iVOLT](https://github.com/iNTERVOLUTIONS-Labs/iVOLT).

## One colour repaints the system

Hover and pressed states, tints, borders, focus rings, glows and both brand gradients are mixed in CSS from `--iv-color-primary`. Set it once and buttons, links, badges, progress bars, switches and gradient text follow; the default Cobalt values are unchanged.

```css
:root, [data-iv-theme] {
  --iv-color-primary: #E11D48;
  --iv-color-on-primary: #FFFFFF; /* the text drawn on it: check 4.5:1 yourself */
}
```

Declare it on `:root`, on a `[data-iv-theme]` scope or on a `[data-iv-palette]` scope, where the derived colours are computed. To point one section at another role of the theme, use `data-iv-palette="accent|success|warning|danger|info|neutral"`.

## What you get

| | |
| --- | --- |
| Components | 24 with optional JavaScript: dialog, drawer, disclosure, tabs, dropdown, toast, combobox, data table, picker, form validation, counter, carousel, megamenu, navbar, stepper, datepicker, tooltip, popover, command palette, lightbox, countup, scroll motion, proximity and reveal |
| CSS-only families | 28: button, card, form, table, badge, alert, hero, timeline, stat, avatar, breadcrumb, pagination, progress, skeleton, and since 1.1 kbd, divider, spinner, segmented control, chip, banner, empty state, list group and description list, meter, rating, code block, device mockups, sidebar and app shell |
| Tokens | every `--iv-*` custom property, also published as `tokens.json`; light, dark and system themes that nest per element; one-colour theming |
| Stylesheets | layered `ivolt.css`, flat `ivolt.flat.css` for pipelines that cannot cascade layers, and one file per component |
| JavaScript | ES modules with real `exports` and `.d.ts` types (typed `iv:*` events), an auto-start entry, a single-file `auto.min.js` and an IIFE (`IVOLT`); extras such as `@intervolutions/ivolt/copy` load only when imported |
| Tooling | `ivolt.manifest.json` (every class, option, attribute, event and token) and `vscode.html-data.json` for attribute completion in VS Code |
| Weight | measured with `npm run sizes`, min+gzip: `ivolt.min.css` under the 40 KiB budget, the grouped JavaScript under 48 KiB; import a single component and ship only that |

To enable the VS Code completion, add `"html.customData": ["./node_modules/@intervolutions/ivolt/dist/vscode.html-data.json"]` to the workspace settings.

## Why iVOLT

- **It works on the page you already have.** Styles are scoped to `.iv-root`, every class, token, attribute and event is prefixed, and nothing uses `!important`, so iVOLT sits next to a WordPress theme or a legacy stylesheet without a fight.
- **Accessibility is part of the contract.** Keyboard paths, focus handling, ARIA and AA contrast are tested in Chromium, Firefox and WebKit, and every content component still works with JavaScript disabled. Segmented controls, ratings and filter chips are native radios and checkboxes.
- **Themes are yours.** Change one colour and the page follows; light, dark and system switch with one attribute and can be scoped to a single section.
- **Modern CSS, progressively.** Container-driven layouts, subgrid, `:has()`, view-timeline reveals, animated `<details>` and exit transitions where the browser has them; the same page reads correctly where it does not.
- **Nothing phones home.** Zero runtime dependencies, no telemetry, no remote fonts and no network requests of any kind.

## Compatibility

Chrome and Edge 111, Firefox 113, Safari 16.4 and their mobile versions; tested in Chromium, Firefox and WebKit. Works from a `<link>`, from npm, in Astro, Vite, WordPress or any bundler. Importing the ES modules never touches `document` or `window`, so server rendering is safe. Right-to-left, forced colours, print and `prefers-reduced-motion` are supported, and public names follow SemVer from 1.0.0.

## Licence

MIT © 2026 iNTERVOLUTIONS
