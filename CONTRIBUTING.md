# Contributing to iVOLT

iVOLT is maintained by iNTERVOLUTIONS. Bug reports, fixes and documentation improvements are welcome. The full guide, with the rules the contract tests enforce, is at [ivolt.intervolutions.com/contributing](https://ivolt.intervolutions.com/contributing).

## Reporting a bug

Open an issue at <https://github.com/iNTERVOLUTIONS-Labs/iVOLT/issues> with:

- the iVOLT version (`IVOLT.version` in the browser, or `version` from the package), and whether you load it from npm, a CDN or a copy of `dist/`;
- the browser and its version, and the assistive technology if the bug is about accessibility;
- the smallest HTML that shows the problem, what you expected, and what happened instead.

Security problems go through a private advisory instead. See [SECURITY.md](SECURITY.md).

## Running the project

You need Node.js 22 or later and npm 10 or later.

```
npm ci                    # install from the lockfile
npm run build             # build packages/ivolt/dist (dist/ is not versioned)
npm test                  # unit and contract tests
npx playwright install    # once, for the browser tests
npm run test:browser      # Playwright in Chromium; IVOLT_ALL_BROWSERS=1 adds Firefox and WebKit
npm run sizes             # sizes against the budgets
npm run pack-smoke        # pack the package and install it in an external consumer
npm run verify            # all of the above, plus the docs build and the examples
```

`IVOLT_SKIP_DOCS_SERVER=1 npm run test:browser -- <spec files>` runs fixture specs without building the documentation site.

## Pull requests

- Keep each pull request to one change, with a test that fails without it. A fixed bug gets a test that would have caught it.
- The public surface (classes, tokens, `data-iv-*` attributes, options, events, exports) is frozen by [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) and follows SemVer as [`docs/STABILITY.md`](docs/STABILITY.md) describes. Changes to it are additive and need a decision record in [`docs/DECISIONS.md`](docs/DECISIONS.md).
- Code, identifiers, commit messages and public docs are in English.
- Add your change to `packages/ivolt/CHANGELOG.md` under the unreleased version.
- CI (`.github/workflows/ci.yml`) has to be green before a merge.

By contributing you agree that your work is released under the [MIT licence](LICENSE).
