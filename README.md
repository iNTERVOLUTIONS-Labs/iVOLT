# iVOLT

A hybrid frontend framework by iNTERVOLUTIONS: semantic components as the fast path, a finite utility set for composition, design tokens as the visual contract and optional JavaScript for behaviour. No runtime dependencies. **Beta (0.2.0-beta.0), not yet published.**

## Repository

| Path | Contents |
|---|---|
| `packages/ivolt` | the package: tokens, CSS modules, ES modules, fixtures |
| `apps/docs` | documentation site (Astro), consumes the package through its `exports` |
| `examples/` | plain HTML starter and three complete recipes |
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

## Use it today

Build the package and copy `packages/ivolt/dist` next to your page, or install a tarball made with `npm pack`. See `apps/docs` (getting started) for the details. Publishing steps live in `docs/RELEASE.md`.

MIT © 2026 iNTERVOLUTIONS
