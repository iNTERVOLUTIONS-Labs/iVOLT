# iVOLT plain HTML starter

One page, no Node, no build step: a header, a hero, a card grid, a form and a dialog,
styled and behaved by the prebuilt files in `./ivolt/`. Copy the folder and start
editing the text.

The `ivolt/` folder is not committed. From the repository root run:

```
npm ci
npm run build
node scripts/sync-examples.mjs   # copies packages/ivolt/dist into examples/plain-html/ivolt
```

Then open `examples/plain-html/index.html` in a browser (or serve the folder with any static server). To reuse it elsewhere, copy the whole `examples/plain-html` folder.
