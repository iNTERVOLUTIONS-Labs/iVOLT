// No inline event handlers in anything the project publishes as markup to copy: fixtures (they
// become the documented snippets), recipes and the site's pages. The rule is in the repository
// guide, and the site's Content-Security-Policy blocks them anyway: form/basic shipped an
// onsubmit="return false" that the policy switched off, so its demo form navigated on Save.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dirs = ["packages/ivolt/fixtures", "examples", "apps/docs/src"];

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name === "ivolt") return [];
    const f = join(dir, e.name);
    return e.isDirectory() ? files(f) : /\.(html|astro)$/.test(e.name) ? [f] : [];
  });
}

describe("inline event handlers", () => {
  const all = dirs.flatMap((d) => files(join(root, d)));

  it("finds the markup to check", () => {
    expect(all.length).toBeGreaterThan(100);
  });

  it("none in fixtures, recipes or site pages", () => {
    const hits = all.flatMap((f) => {
      const text = readFileSync(f, "utf8");
      return [...text.matchAll(/<[a-zA-Z][^>]*\s(on[a-z]+)\s*=\s*["'{]/g)].map((m) => `${f.slice(root.length + 1)}: ${m[1]}`);
    });
    expect(hits).toEqual([]);
  });
});
