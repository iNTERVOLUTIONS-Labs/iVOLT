# iVOLT

**A CSS framework and design system by iNTERVOLUTIONS.** Semantic components as the fast path, a finite utility set for composition, design tokens as the visual contract and optional JavaScript for behaviour. No runtime dependencies, no build step, light and dark themes, accessible components tested in three engines. This repository holds the package, its documentation site, the examples and the tests.

Install it with `npm install @intervolutions/ivolt`, or copy `packages/ivolt/dist` next to your page. Package documentation: [`packages/ivolt/README.md`](packages/ivolt/README.md).

## Repository

| Path | Contents |
|---|---|
| `packages/ivolt` | the package: tokens, CSS modules, ES modules, fixtures |
| `apps/docs` | documentation site (Astro), consumes the package through its `exports` |
| `examples/` | plain HTML starter and four complete recipes |
| `tests/` | unit, CSS contract and browser tests (Playwright, axe) |
| `docs/` | product bible, architecture, contracts, design system, quality, decisions |

## Develop

```
npm ci
npm run build            # tokens → CSS → JS → types
npm test                 # unit + contract tests
npm run test:browser     # Playwright (Chromium; IVOLT_ALL_BROWSERS=1 adds Firefox and WebKit)
npm run sizes            # min+gzip per artifact against budgets
npm run pack-smoke       # npm pack → external consumer
npm run dev:docs         # documentation site (builds the package first when dist/ is missing)
npm run verify           # everything above plus examples and the docs build
```

Publishing steps live in `docs/RELEASE.md`; what is public and how it changes, in `docs/STABILITY.md`.

MIT © 2026 iNTERVOLUTIONS
