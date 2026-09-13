// Every iv-* class used by fixtures, recipes, the starter and the docs pages must exist in the built stylesheet.
// This is the "snippets against distribution" check: docs previews, tests and starters share these files.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(__dirname, "../..");
const distCss = join(root, "packages/ivolt/dist/css/ivolt.css");

function walk(dir, ext) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!["ivolt", "node_modules", "dist"].includes(f)) out.push(...walk(p, ext)); }
    else if (ext.some((e) => f.endsWith(e))) out.push(p);
  }
  return out;
}

describe.skipIf(!existsSync(distCss))("snippets against distribution", () => {
  const css = readFileSync(distCss, "utf8");
  const defined = new Set(css.match(/\.iv-[\w-]+/g).map((s) => s.slice(1)));
  const files = [
    ...walk(join(root, "packages/ivolt/fixtures"), [".html"]),
    ...walk(join(root, "examples"), [".html"]),
    ...walk(join(root, "apps/docs/src"), [".astro"]),
  ];
  it("finds the built stylesheet and some sources", () => {
    expect(defined.size).toBeGreaterThan(100);
    expect(files.length).toBeGreaterThan(20);
  });
  for (const file of files) {
    it(`${file.replace(root + "/", "")} uses only classes that exist`, () => {
      const src = readFileSync(file, "utf8");
      const used = new Set();
      for (const m of src.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c.startsWith("iv-")) used.add(c);
      // Astro templates can build class names dynamically; only literal attributes are checked.
      const missing = [...used].filter((c) => !defined.has(c));
      expect(missing).toEqual([]);
    });
  }
});
