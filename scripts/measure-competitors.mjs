// Measures the files a visitor downloads to use iVOLT and four other CSS frameworks, so the
// comparison pages quote sizes that anyone can reproduce instead of estimates.
//
//   node scripts/measure-competitors.mjs              everything (needs the network)
//   node scripts/measure-competitors.mjs --ivolt-only  only iVOLT, from the local build, offline
//
// iVOLT is measured from packages/ivolt/dist at the version in its package.json, not downloaded:
// the bytes are the ones npm publishes, and a release can be measured before it is on the CDN.
// The pages quoted iVOLT 1.0.0 on the 1.1 site because the version was typed here by hand;
// tests/contracts/competitor-sizes.test.js now fails when the JSON and the package disagree.
//
// Downloads pinned versions from jsDelivr (the npm tarball contents, unmodified), compresses each
// file with gzip level 9 and Brotli quality 11 (Node's zlib, the same settings for every file),
// and writes apps/docs/src/data/competitor-sizes.json with the date, the URLs and a SHA-256 of
// every file. The site renders from that JSON at build time and never fetches anything: this
// script needs the network, the build does not. Re-run it to refresh the figures, commit the JSON.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = join(root, "apps/docs/src/data/competitor-sizes.json");
const ivoltOnly = process.argv.includes("--ivolt-only");
const ivoltVersion = JSON.parse(readFileSync(join(root, "packages/ivolt/package.json"), "utf8")).version;

// What each framework asks a page to load in its documented no-build (CDN) setup. Pinned.
const frameworks = [
  { id: "ivolt", name: "iVOLT", version: ivoltVersion, pkg: "@intervolutions/ivolt", local: join(root, "packages/ivolt"), files: [
    { role: "css", path: "dist/css/ivolt.min.css", note: "every component, utility and theme" },
    // No count here: the site states the number of components from its own single source.
    { role: "js", path: "dist/js/ivolt.iife.min.js", note: "every interactive component, optional" },
    { role: "classless", path: "dist/css/core.min.css", note: "tokens, reset and element styles only" },
  ] },
  { id: "bootstrap", name: "Bootstrap", version: "5.3.8", pkg: "bootstrap", files: [
    { role: "css", path: "dist/css/bootstrap.min.css" },
    { role: "js", path: "dist/js/bootstrap.bundle.min.js", note: "includes Popper" },
  ] },
  { id: "bootstrap6", name: "Bootstrap 6 (alpha)", version: "6.0.0-alpha.1", pkg: "bootstrap", files: [
    { role: "css", path: "dist/css/bootstrap.min.css" },
    { role: "js", path: "dist/js/bootstrap.bundle.min.js" },
  ] },
  { id: "bulma", name: "Bulma", version: "1.0.4", pkg: "bulma", files: [
    { role: "css", path: "css/bulma.min.css", note: "Bulma ships no JavaScript" },
    { role: "css-lite", path: "css/versions/bulma-no-helpers.min.css", note: "the official build without helper classes" },
  ] },
  { id: "pico", name: "Pico CSS", version: "2.1.1", pkg: "@picocss/pico", files: [
    { role: "css", path: "css/pico.min.css" },
    { role: "classless", path: "css/pico.classless.min.css" },
  ] },
  { id: "tailwind", name: "Tailwind CSS", version: "4.3.5", pkg: "tailwindcss", files: [
    { role: "reset", path: "preflight.css", note: "the base reset; utilities are generated from your markup by a build step" },
  ] },
  { id: "tailwind-browser", name: "Tailwind CSS (browser build)", version: "4.3.5", pkg: "@tailwindcss/browser", files: [
    { role: "js", path: "dist/index.global.js", note: "the no-build path: compiles utilities in the browser at runtime" },
  ] },
];

const previous = JSON.parse(readFileSync(out, "utf8"));
const rows = ivoltOnly ? previous.files.filter((r) => r.id !== "ivolt") : [];
for (const fw of frameworks) {
  if (ivoltOnly && !fw.local) continue;
  for (const f of fw.files) {
    const url = `https://cdn.jsdelivr.net/npm/${fw.pkg}@${fw.version}/${f.path}`;
    let buf;
    if (fw.local) buf = readFileSync(join(fw.local, f.path));
    else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    }
    const gzip = gzipSync(buf, { level: 9 }).length;
    const brotli = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length;
    rows.push({ id: fw.id, name: fw.name, version: fw.version, package: fw.pkg, role: f.role, file: f.path, note: f.note || null, url, bytes: buf.length, gzip, brotli, sha256: createHash("sha256").update(buf).digest("hex") });
    console.log(`${fw.name.padEnd(30)} ${f.path.padEnd(32)} ${String(buf.length).padStart(8)} B  gzip ${String(gzip).padStart(7)}  br ${String(brotli).padStart(7)}`);
  }
}

// iVOLT first, as the pages list it.
rows.sort((a, b) => (a.id === "ivolt" ? 0 : 1) - (b.id === "ivolt" ? 0 : 1));
writeFileSync(out, JSON.stringify({
  measured: ivoltOnly ? previous.measured : new Date().toISOString().slice(0, 10),
  method: "Files downloaded from cdn.jsdelivr.net at the pinned versions (iVOLT: the files of the local build, the bytes npm publishes); sizes in bytes, raw and compressed with Node zlib: gzip level 9, Brotli quality 11.",
  script: "scripts/measure-competitors.mjs",
  files: rows,
}, null, 2) + "\n");
console.log(`measure-competitors: ${rows.length} files → ${out}`);
