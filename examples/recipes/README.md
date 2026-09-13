# iVOLT recipes

Three complete pages built only with the iVOLT package: no other CSS framework,
no external scripts, no images from the network. They are the reference for how
the components are meant to be combined.

| Recipe | What it shows |
| --- | --- |
| [`landing/`](landing/index.html) | Marketing page: hero, benefit cards with inline SVG, a CTA band scoped to the dark theme with `data-iv-theme="dark"`, example pricing cards, an exclusive FAQ accordion and a demo contact dialog. |
| [`catalog/`](catalog/index.html) | Catalogue: breadcrumb, a filter form (categories and price sorting) driven by `catalog.js`, nine product cards, pagination states and a tabbed product detail. |
| [`admin/`](admin/index.html) | Dashboard: a drawer that becomes a static sidebar from the `lg` breakpoint, KPI cards with progress bars, a striped table that stacks on narrow screens, a demo form and toasts driven by `admin.js`. |

## Opening them

The pages link the prebuilt package with relative paths (`../ivolt/css/ivolt.min.css`
and `../ivolt/js/auto.js`). That folder is generated, so build and sync once from
the repository root:

```sh
npm run build
node scripts/sync-examples.mjs
```

Then open any `index.html`. A local static server is recommended, because the
recipe scripts are ES modules and browsers block module loading from `file://`:

```sh
npx serve examples/recipes     # or: python3 -m http.server --directory examples/recipes
```

Without JavaScript the pages still read: the accordion is `<details>`, the tabs
are anchor links to stacked sections, and the dialog and drawer fall back to
static blocks reached through their anchors. Only the filters, the sorting and
the toasts need the scripts.

## The data is invented

Every company, product, customer, order, price and figure in these pages is
fictitious and labelled as sample data. Prices are marked *example pricing*,
covers are placeholder blocks rather than photographs, the forms state that
nothing is sent and no submission leaves the browser. The pagination links
beyond page 1 return to the top of the page instead of pretending to load more
results, and the delete confirmation in the admin recipe deletes nothing.
