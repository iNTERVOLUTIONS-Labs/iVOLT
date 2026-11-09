// Derives AVIF and WebP renditions of the recipe screenshots (apps/docs/public/shots/*.jpg) at
// the widths the device frames actually draw them, for <picture> with srcset. The JPEGs stay the
// committed source and the fallback; the renditions are rebuilt from them on every build.
//
// Measured before this existed (Lighthouse, 2026-11-09): studio-1440.jpg, 180 KB, was sent whole
// to a 390 px phone that draws it ~350 px wide. Uses sharp, which Astro already installs for its
// own image pipeline; without it the frames keep serving the JPEGs and the build goes on.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dir = join(root, "apps/docs/public/shots");
if (!existsSync(dir)) { console.warn("images: no shots folder, nothing to do"); process.exit(0); }

let sharp;
try { sharp = (await import("sharp")).default; }
catch { console.warn("images: sharp is not installed, the device frames keep the JPEGs"); process.exit(0); }

/** Widths per source width: what a frame draws on a phone, a tablet and a desktop, at 1x and 2x. */
export const SHOT_WIDTHS = { 1440: [480, 800, 1440], 390: [390] };

let made = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".jpg"))) {
  const src = join(dir, name);
  const stem = name.slice(0, -4);
  const { width } = await sharp(src).metadata();
  const widths = SHOT_WIDTHS[width] || [width];
  for (const w of widths) {
    for (const [ext, opts] of [["avif", { quality: 50, effort: 4 }], ["webp", { quality: 72 }]]) {
      const out = join(dir, `${stem}-${w}w.${ext}`);
      if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue;
      await sharp(src).resize({ width: w, withoutEnlargement: true })[ext](opts).toFile(out);
      made++;
    }
  }
}
console.log(`images: ${made} AVIF/WebP renditions written`);
