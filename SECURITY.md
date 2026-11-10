# Security policy

iVOLT (`@intervolutions/ivolt`) is maintained by [iNTERVOLUTIONS](https://intervolutions.com). This page says which versions get security fixes and how to report a vulnerability without making it public first.

## Supported versions

| Version | Security fixes |
|---|---|
| 1.x | Yes. The latest 1.x release gets the fix. |
| 1.x after 2.0 ships | Yes, for at least 12 months after the 2.0.0 release date. |
| 0.x betas and 1.0 release candidates | No. Upgrade to the latest 1.x. |

A fix ships as a patch release (`1.y.z`) on npm and jsDelivr. The `@1` CDN pin picks it up on its own. If you pin an exact version, you have to bump it yourself.

## Reporting a vulnerability

Please report privately through GitHub Security Advisories:

**https://github.com/iNTERVOLUTIONS-Labs/iVOLT/security/advisories/new**

Please do not open a public issue, pull request or discussion about the problem until a fix is out.

A useful report includes:

- the affected version or versions, and whether you load the package from npm, a CDN or a copy of `dist/`;
- the component or file involved, and the smallest page that reproduces the problem;
- what an attacker can do with it: script injection, a bypass of a documented guarantee (for example text that `Toast` or `Command` should insert with `textContent` but renders as HTML), a supply-chain problem in the published tarball, and so on.

## What to expect

iVOLT has a small maintainer team, so these are targets, not guarantees:

- **Acknowledgement**: within 5 working days.
- **First assessment** (whether it is a vulnerability, and how severe): within 10 working days.
- **Fix**: as soon as we can. For a confirmed high-severity issue we aim for a patch release within 30 days. We will tell you if it is going to take longer and why.

We will keep you informed in the advisory thread. We will agree a disclosure date with you, and credit you in the advisory and the changelog unless you would rather stay anonymous. There is no bug bounty.

## Scope

In scope: the published package `@intervolutions/ivolt` (CSS, JavaScript, types, tokens and the files in its tarball) and the release workflow in this repository.

Out of scope: the documentation site at ivolt.intervolutions.com and its demos (report problems there as a normal issue unless they expose visitors to an attack), and vulnerabilities in your own pages that do not come from iVOLT. For example, passing untrusted HTML to `innerHTML` yourself is not an iVOLT issue.

The package has no runtime dependencies and makes no network requests. Releases published from the release workflow carry an npm provenance statement that links the tarball to the commit and workflow that built it (`npm audit signatures` checks it).
