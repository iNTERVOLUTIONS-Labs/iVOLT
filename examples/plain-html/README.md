# iVOLT plain HTML starter

One page, no Node, no build step: a header, a hero, a card grid, a form and a dialog,
styled and behaved by the prebuilt files in `./ivolt/`. Copy the folder and start
editing the text.

## Downloaded the zip?

Everything is already here. Unzip the folder and open `index.html` with a double click:
it works straight from your disk, with no server. The page links two files:

- `ivolt/css/ivolt.min.css`, the whole framework's CSS;
- `ivolt/js/ivolt.iife.min.js`, the optional JavaScript, started by the line after it
  (`IVOLT.init(document)`). Only the dialog on this page needs it.

It is a classic script on purpose: browsers do not run ES modules from a page opened as a
file (`file://`). Once the page is served over HTTP you can swap both lines for the module
that starts itself:

```html
<script type="module" src="ivolt/js/auto.min.js"></script>
```

The rest of `ivolt/` (one CSS file per component, the ES modules) is there for when you want
to load less. The guide is at https://ivolt.intervolutions.com/getting-started.

The text is set in the system font. To use Outfit, the face of the iVOLT site, see
"The font" in the getting started guide.

## From a checkout of the repository

The `ivolt/` folder is not committed. From the repository root run:

```
npm ci
npm run build
node scripts/sync-examples.mjs   # copies packages/ivolt/dist into examples/plain-html/ivolt
```

Then open `examples/plain-html/index.html` in a browser.

## En español

Si has descargado el zip, no hace falta instalar nada: descomprímelo y abre `index.html` con
doble clic; funciona desde el disco, sin servidor. La página enlaza la hoja
`ivolt/css/ivolt.min.css` y el script clásico `ivolt/js/ivolt.iife.min.js`, que arranca la
línea `IVOLT.init(document)` (solo el diálogo lo necesita). Es un script clásico porque los
navegadores no ejecutan módulos desde un fichero abierto con `file://`; cuando sirvas la página
por HTTP puedes cambiar las dos líneas por `<script type="module" src="ivolt/js/auto.min.js"></script>`.
La guía en español está en https://ivolt.intervolutions.com/es/getting-started.
