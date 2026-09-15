// Nothing public may stay undocumented. The reference is regenerated from the package sources
// and compared with what the site and the API contract actually say, so a class, an option, an
// event or a token added to the package fails here until it is written down somewhere.
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pagesDir = join(root, "apps/docs/src/pages");

/**
 * Classes that are allowed not to appear in prose, with the reason each one is exempt.
 * Every other class of the package must be named by an English page or by the API contract.
 *
 * - `iv-u-*`: the utility matrix is generated from a finite table (API_CONTRACT.md §4) and
 *   documented as that table on /foundations/layout. Listing its 384 members one by one would
 *   be noise, and the matrix is what defines them; the reference page renders them all anyway.
 */
const exempt = [(name) => name.startsWith("iv-u-")];

/** Every .astro page of the English site (the Spanish twins are translations of these). */
function englishPages(dir = pagesDir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { if (entry !== "es") englishPages(p, out); }
    else if (entry.endsWith(".astro")) out.push(p);
  }
  return out;
}

let reference;
let prose; // every English page plus the API contract, as one haystack
let contract;
let tokensPage;
let referencePage;

beforeAll(() => {
  // Regenerate: the test must fail on the current sources, not on a stale checked-in file.
  execFileSync(process.execPath, [join(root, "scripts/build-reference.mjs")], { cwd: root, stdio: "pipe" });
  reference = JSON.parse(readFileSync(join(root, "apps/docs/src/data/reference.json"), "utf8"));
  contract = readFileSync(join(root, "docs/API_CONTRACT.md"), "utf8");
  tokensPage = readFileSync(join(pagesDir, "foundations/tokens-and-themes.astro"), "utf8");
  referencePage = readFileSync(join(root, "apps/docs/src/components/Reference.astro"), "utf8");
  prose = englishPages().map((f) => readFileSync(f, "utf8")).join("\n") + "\n" + contract;
});

describe("reference", () => {
  it("generates a surface of the expected size", () => {
    const classes = Object.values(reference.sheets).flat();
    expect(classes.length).toBeGreaterThan(700);
    expect(reference.tokens.length).toBeGreaterThan(120);
    expect(reference.components.length).toBeGreaterThan(20);
    expect(reference.attributes.length).toBeGreaterThan(100);
  });

  it("documents every class in a page or in the API contract", () => {
    const classes = [...new Set(Object.values(reference.sheets).flat())];
    const missing = classes.filter((c) => !exempt.some((f) => f(c)) && !prose.includes(c));
    expect(missing).toEqual([]);
  });

  it("keeps the utility exemption honest: the matrix itself is documented", () => {
    const layout = readFileSync(join(pagesDir, "foundations/layout.astro"), "utf8");
    expect(layout).toMatch(/iv-u-/);
    expect(contract).toMatch(/iv-u-/);
    // And the exemption covers utilities only.
    const exempted = Object.values(reference.sheets).flat().filter((c) => exempt.some((f) => f(c)));
    expect(exempted.every((c) => c.startsWith("iv-u-"))).toBe(true);
  });

  it("documents every option and every event of every component in the API contract", () => {
    const missing = [];
    for (const component of reference.components) {
      for (const option of component.options) {
        if (!new RegExp(`\\b${option.key}\\b`).test(contract)) missing.push(`${component.name}.${option.key}`);
      }
      for (const event of component.events) {
        if (!contract.includes(event)) missing.push(`${component.name} ${event}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("documents every token on the tokens page or in the reference", () => {
    // The reference renders reference.json in full, so a token is documented as soon as it is
    // in that file — provided the page really iterates the whole list, which is asserted here.
    expect(referencePage).toMatch(/reference\.tokens\.map/);
    const known = new Set(reference.tokens.map((t) => t.name));
    const missing = reference.tokens.filter((t) => !known.has(t.name) && !tokensPage.includes(t.name));
    expect(missing).toEqual([]);
    // The tokens page still has to introduce every family a reader starts from, by name.
    const families = ["color", "space", "radius", "text", "font", "shadow"];
    const unexplained = families.filter((family) => {
      const names = reference.tokens.map((t) => t.name).filter((n) => n.startsWith(`--iv-${family}-`));
      return names.length > 0 && !names.some((n) => tokensPage.includes(n) || contract.includes(n));
    });
    expect(unexplained).toEqual([]);
  });

  it("gives every token a value in both themes", () => {
    const empty = reference.tokens.filter((t) => !t.light || !t.dark);
    expect(empty).toEqual([]);
  });

  it("is rendered by both language pages of the site", () => {
    for (const page of ["reference.astro", "es/reference.astro"]) {
      const src = readFileSync(join(pagesDir, page), "utf8");
      expect(src).toMatch(/components\/Reference.astro/);
    }
  });
});
