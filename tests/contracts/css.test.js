import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { utilities, responsiveBreakpoints } from "../../packages/ivolt/scripts/utilities.config.mjs";

const pkg = resolve(__dirname, "../../packages/ivolt");
const src = join(pkg, "src/css");
const dist = join(pkg, "dist/css");
const modules = ["base.css", "reset.css", "surfaces.css", ...readdirSync(join(src, "layout")).map((f) => `layout/${f}`), ...readdirSync(join(src, "components")).map((f) => `components/${f}`)];
const read = (rel) => readFileSync(join(src, rel), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Very small selector extractor: preludes of rules that end with `{`, ignoring at-rule preludes. */
function selectors(css) {
  const out = [];
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(stripComments(css)))) {
    const prelude = m[1].trim();
    if (!prelude || prelude.startsWith("@")) continue;
    for (const s of prelude.split(",")) out.push(s.trim());
  }
  return out;
}

/** Approximate specificity of the class/attribute/pseudo-class column. */
function classColumn(sel) {
  const s = sel.replace(/::[\w-]+/g, "").replace(/:not\(([^)]*)\)/g, "$1").replace(/:is\(([^)]*)\)/g, "$1").replace(/:where\([^)]*\)/g, "");
  const classes = (s.match(/\.[\w-]+/g) || []).length;
  const attrs = (s.match(/\[[^\]]+\]/g) || []).length;
  const pseudos = (s.match(/:(?!\d)[\w-]+/g) || []).filter((p) => !["::"].includes(p)).length;
  return classes + attrs + pseudos;
}

describe("CSS module contracts", () => {
  it("modules declare no @layer and import nothing", () => {
    for (const rel of modules) {
      expect(stripComments(read(rel)), rel).not.toMatch(/@layer/);
      expect(stripComments(read(rel)), rel).not.toMatch(/@import/);
    }
  });
  it("no !important outside sr-only utilities", () => {
    for (const rel of modules) expect(read(rel), rel).not.toMatch(/!important/);
    const util = stripComments(read("utilities.css"));
    for (const line of util.split("\n").filter((l) => l.includes("!important"))) expect(line).toMatch(/sr-only|position: absolute|inline-size: 1px|block-size: 1px|padding: 0|margin: -1px|overflow: hidden|clip-path|white-space|border: 0/);
  });
  it("class selectors are prefixed iv- and custom properties are prefixed --iv-", () => {
    for (const rel of [...modules, "utilities.css", "tokens.css"]) {
      const css = stripComments(read(rel)).replace(/url\([^)]*\)/g, "url()");
      for (const cls of css.match(/\.[a-zA-Z][\w-]*/g) || []) expect(cls, `${rel}: ${cls}`).toMatch(/^\.iv-/);
      for (const v of css.match(/(?<![\w-])--[a-zA-Z][\w-]*/g) || []) expect(v, `${rel}: ${v}`).toMatch(/^--iv-/);
    }
  });
  it("element selectors in base.css are scoped to .iv-root", () => {
    for (const sel of selectors(read("base.css"))) expect(sel, sel).toMatch(/^\.iv-root(\b|$)|^:root|^\.iv-/);
  });
  it("component selectors stay at or below (0,2,0), except the documented dialog/drawer :target fallbacks", () => {
    const allow = [/^\.iv-dialog:target:not\(\[open\]\)$/, /^\.iv-drawer:target:not\(\[open\]\)$/]; // ADR-023
    for (const rel of modules.filter((m) => m !== "reset.css")) {
      for (const sel of selectors(read(rel))) {
        if (allow.some((re) => re.test(sel))) continue;
        expect(classColumn(sel), `${rel}: ${sel}`).toBeLessThanOrEqual(2);
      }
    }
  });
  it("breakpoints only via @custom-media names, never var() inside @media", () => {
    for (const rel of [...modules, "utilities.css"]) {
      const css = stripComments(read(rel));
      for (const m of css.match(/@media[^{]+/g) || []) {
        expect(m, `${rel}: ${m}`).not.toMatch(/var\(/);
        if (/--iv-/.test(m)) expect(m).toMatch(/\(--iv-(sm|md|lg|xl|2xl)\)/);
      }
    }
  });
  it("utilities.css matches the declared matrix exactly", () => {
    const css = stripComments(read("utilities.css"));
    const names = new Set((css.match(/\.iv-u-[\w-]+/g) || []).map((s) => s.slice(1)));
    const expected = new Set(["iv-u-sr-only", "iv-u-sr-only-focusable"]);
    for (const u of utilities) { expected.add(`iv-u-${u.name}`); if (u.responsive) for (const bp of responsiveBreakpoints) expected.add(`iv-u-${bp}-${u.name}`); }
    expect([...names].sort()).toEqual([...expected].sort());
    for (const u of utilities) expect(css).toContain(`.iv-u-${u.name}.iv-u-${u.name} {`);
  });
  it("entries import each module once and declare the layer order", () => {
    for (const entry of ["core.css", "ivolt.css", "ivolt.flat.css"]) {
      const css = read(entry);
      const imports = (css.match(/@import url\("([^"]+)"\)/g) || []).map((s) => s.match(/"([^"]+)"/)[1]);
      expect(new Set(imports).size, entry).toBe(imports.length);
      if (entry === "ivolt.flat.css") expect(css).not.toMatch(/@layer|layer\(/);
      else expect(css.trimStart()).toMatch(/^\/\*[^]*?\*\/\s*@layer iv\.reset, iv\.tokens, iv\.base, iv\.layout, iv\.components, iv\.utilities, iv\.overrides;/);
    }
  });
});

describe("built CSS (requires npm run build)", () => {
  const built = existsSync(join(dist, "ivolt.css"));
  it.skipIf(!built)("dist keeps layer order and resolves custom media", () => {
    const css = readFileSync(join(dist, "ivolt.css"), "utf8");
    // lightningcss may rewrite the single @layer statement into per-layer blocks; first appearance order must hold.
    const order = ["iv.reset", "iv.tokens", "iv.base", "iv.layout", "iv.components", "iv.utilities", "iv.overrides"];
    const firstIndex = order.map((l) => css.search(new RegExp(`@layer ${l.replace(".", "\\.")}\\b`)));
    expect(firstIndex.every((i) => i >= 0)).toBe(true);
    expect([...firstIndex].sort((a, b) => a - b)).toEqual(firstIndex);
    expect(css).not.toMatch(/@custom-media/);
    for (const m of css.match(/@media[^{]+/g) || []) expect(m).not.toMatch(/--iv-/);
    expect(readFileSync(join(dist, "ivolt.flat.css"), "utf8")).not.toMatch(/@layer/);
    expect(readFileSync(join(dist, "reset.layer.css"), "utf8")).toMatch(/^@layer iv\.reset/);
  });
});
