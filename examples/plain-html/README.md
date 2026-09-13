# iVOLT plain HTML starter

One page, no Node, no build step. It links the prebuilt files from `./ivolt/`.

The `ivolt/` folder is not committed. From the repository root run:

```
npm ci
npm run build
node scripts/sync-examples.mjs   # copies packages/ivolt/dist into examples/plain-html/ivolt
```

Then open `examples/plain-html/index.html` in a browser (or serve the folder with any static server). To reuse it elsewhere, copy the whole `examples/plain-html` folder.
