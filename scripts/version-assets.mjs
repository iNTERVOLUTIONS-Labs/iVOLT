// Gives every unhashed local script and stylesheet the site links from its HTML a content
// version (?v=<10 hex of sha256>), after the Astro build.
//
// Astro fingerprints what it bundles (/_astro/…), but the stage boot script, the stage sheet, the
// framework copy under /examples/ivolt/ and the theme downloads keep their names from release to
// release. The CDN in front of the site caches them for a day, so a deploy that changed
// /stage/boot.js went on serving the old one for hours (2026-11-10: the phone fix for overlay
// demos was live on the origin and invisible behind the cache). A new version means a new URL.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/docs/dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("version-assets: apps/docs/dist/index.html is missing; run the Astro build first");
  process.exit(1);
}

const versions = new Map();
const versionOf = (path) => {
  if (!versions.has(path)) {
    const file = join(dist, path);
    versions.set(path, existsSync(file) && statSync(file).isFile()
      ? createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 10)
      : null);
  }
  return versions.get(path);
};

// src="/x.js" or href="/x.css" in a tag (code samples are HTML-escaped, so they never match).
const ref = /(\s(?:src|href)=")(\/(?!_astro\/)[^"?#]+\.(?:js|mjs|css))(")/g;
let files = 0;
let refs = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    if (!f.endsWith(".html")) continue;
    const html = readFileSync(f, "utf8");
    const next = html.replace(ref, (m, pre, path, post) => {
      const v = versionOf(path);
      if (!v) return m;
      refs++;
      return `${pre}${path}?v=${v}${post}`;
    });
    if (next !== html) { writeFileSync(f, next); files++; }
  }
};
walk(dist);
console.log(`version-assets: ${refs} references in ${files} pages, ${[...versions.values()].filter(Boolean).length} assets versioned`);
