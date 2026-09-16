# @intervolutions/ivolt

**iVOLT is a CSS framework and design system for accessible interfaces.** Semantic components are the fast path, a finite utility set composes them, design tokens are the visual contract and JavaScript is optional. There are no runtime dependencies and no build step: one `<link>` is enough in plain HTML, Astro, WordPress or any bundler, with dark mode, right-to-left, print and AA contrast handled from the first page.

[![npm version](https://img.shields.io/npm/v/@intervolutions/ivolt.svg)](https://www.npmjs.com/package/@intervolutions/ivolt)
[![license MIT](https://img.shields.io/npm/l/@intervolutions/ivolt.svg)](LICENSE)

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

## What you get

| | |
| --- | --- |
| Components | 24 with optional JavaScript: dialog, drawer, disclosure, tabs, dropdown, toast, combobox, data table, picker, form validation, counter, carousel, megamenu, navbar, stepper, datepicker, tooltip, popover, command palette, lightbox, countup, scroll motion, proximity and reveal |
| CSS-only families | 14: button, card, form, table, badge, alert, hero, timeline, stat, avatar, breadcrumb, pagination, progress, skeleton |
| Tokens | every `--iv-*` custom property, also published as `tokens.json`; light, dark and system themes that nest per element |
| Stylesheets | layered `ivolt.css`, flat `ivolt.flat.css` for pipelines that cannot cascade layers, and one minified file per component |
| JavaScript | ES modules with real `exports` and `.d.ts` types, an auto-start entry and an IIFE (`IVOLT`) for pages without a bundler |
| Weight | `ivolt.min.css` 32.1 KiB min+gzip, the complete IIFE 45.5 KiB min+gzip; import a single component and ship only that |

## Why iVOLT

- **It works on the page you already have.** Styles are scoped to `.iv-root`, every class, token, attribute and event is prefixed, and nothing uses `!important`, so iVOLT sits next to a WordPress theme or a legacy stylesheet without a fight.
- **Accessibility is part of the contract.** Keyboard paths, focus handling, ARIA and AA contrast are tested in Chromium, Firefox and WebKit, and every content component still works with JavaScript disabled.
- **Themes are yours.** Change a token and the page follows; light, dark and system switch with one attribute and can be scoped to a single section.
- **Nothing phones home.** Zero runtime dependencies, no telemetry, no remote fonts and no network requests of any kind.

## Compatibility

Chromium 113, Firefox 113, Safari 16.4 and their mobile versions; tested in Chromium, Firefox and WebKit. Works from a `<link>`, from npm, in Astro, Vite, WordPress or any bundler. Importing the ES modules never touches `document` or `window`, so server rendering is safe. Right-to-left, forced colours, print and `prefers-reduced-motion` are supported, and public names follow SemVer from 1.0.0.

## Licence

MIT © 2026 iNTERVOLUTIONS
