# iVOLT

[![CI](https://github.com/iNTERVOLUTIONS-Labs/iVOLT/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/iNTERVOLUTIONS-Labs/iVOLT/actions/workflows/ci.yml)

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

Documentation: [ivolt.intervolutions.com](https://ivolt.intervolutions.com/). Publishing steps live in `docs/RELEASE.md`; what is public and how it changes, in `docs/STABILITY.md`; hosting requirements for the site, in `docs/DEPLOY.md`.

## Maintenance and support

iVOLT is maintained by iNTERVOLUTIONS. 1.x is the supported line. When 2.0 ships, 1.x keeps getting fixes for at least 12 months. Report bugs in [issues](https://github.com/iNTERVOLUTIONS-Labs/iVOLT/issues) (see [CONTRIBUTING.md](CONTRIBUTING.md)) and vulnerabilities privately through a [security advisory](https://github.com/iNTERVOLUTIONS-Labs/iVOLT/security/advisories/new) (see [SECURITY.md](SECURITY.md)). Every push and pull request to `main` runs [CI](.github/workflows/ci.yml); the three-engine release gate is in `docs/RELEASE.md`.

MIT © 2026 iNTERVOLUTIONS
