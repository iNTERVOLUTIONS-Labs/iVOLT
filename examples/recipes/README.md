# iVOLT recipes

Four complete pages built only with the iVOLT package: no other CSS framework, no
external scripts, no fonts or images from the network. They are the reference for
how the components are meant to be combined.

| Recipe | What it shows |
| --- | --- |
| [`studio/`](studio/index.html) | Editorial page for an invented design studio: transparent navbar over a cinematic hero with parallax, a display marquee, a sticky deck of services, a photo gallery with the viewer, initials-only avatars, an alternating timeline and a three-step brief that sends nothing. |
| [`console/`](console/index.html) | Dense product panel, dark by default: navbar with megamenu, a side drawer that becomes a static column at `lg`, counted figures, progress bars, tabs, a filterable and sortable data table, skeletons that resolve on demand, alerts, a popover, toasts, a confirmation dialog, a command palette on `Ctrl`+`K` and a validated form with a calendar. |
| [`journal/`](journal/index.html) | Editorial issue, light by default: a typographic cover, a reading progress bar, a long read with a drop cap, a pull quote and notes in popovers, a masonry gallery with the viewer, an index, pagination and a print stylesheet. |
| [`store/`](store/index.html) | Catalogue and checkout: breadcrumb, a product carousel that cross-fades, badges, prices as figures, a rich picker and a combobox as filters, product cards, pagination, a cart drawer, a confirmation dialog, toasts and a three-step checkout with a date field and browser validation. |

## Opening them

The pages link the prebuilt package with relative paths (`../ivolt/css/ivolt.min.css`
and `../ivolt/js/auto.js`). That folder is generated, so build and sync once from the
repository root:

```sh
npm run build
node scripts/sync-examples.mjs
```

Then open any `index.html`. A local static server is required, because the pages load
ES modules and browsers block module loading from `file://`:

```sh
python3 -m http.server --directory examples/recipes
```

Without JavaScript every page still reads: the galleries are lists of links to the
photographs, the wizards are stacked sections reached by their anchors, the menus are
lists, the tabs are anchor links to sections, the filters are plain form controls and
the drawers and dialogs are reachable through their anchors. Only the viewer, the
command palette, the sorting, the toasts and the theme switch need the script, and each
page hides the controls that would do nothing without it.

## Everything on these pages is invented

Meridian Field, Arclight Console, The Quiet Column and Northline Supply are fictional.
Every company, person, product, price, reading, date and figure is made up and labelled
as such in the page itself and in the footer. Nothing is sold, no payment is possible,
no order or request is created, no form submits anything and no page contacts the
network. The photographs are stock images credited in each recipe's `README.md`; there
are no photographs of people, and the avatars are initials.
