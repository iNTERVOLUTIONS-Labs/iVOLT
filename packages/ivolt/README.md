# @intervolutions/ivolt

A hybrid frontend framework: semantic components as the fast path, a finite utility set for composition, design tokens as the visual contract and optional JavaScript for behaviour. No runtime dependencies. Alpha.

Install the release candidate with `npm install @intervolutions/ivolt@next` (the beta stays at `@beta`), or build it from the repository (`npm ci && npm run build`) and copy `dist/` into your project.

```html
<html class="iv-root" data-iv-theme="system">
  <link rel="stylesheet" href="ivolt/css/ivolt.min.css">
  <script type="module" src="ivolt/js/auto.js"></script>
```

```js
import "@intervolutions/ivolt/css/ivolt.css";
import { init, Dialog } from "@intervolutions/ivolt";
init(document);
```

Documentation lives in `apps/docs` of the repository. MIT licence.
