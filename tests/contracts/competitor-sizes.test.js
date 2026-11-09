// The compare pages quote iVOLT's sizes from apps/docs/src/data/competitor-sizes.json. In 1.1 they
// still quoted 1.0.0 (32.1 KiB) because the version was typed by hand in the measuring script.
// The JSON must describe the package as it is: same version, same bytes as the build.
// When this fails after a release or a rebuild: node scripts/measure-competitors.mjs --ivolt-only
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "../..");
const sizes = JSON.parse(readFileSync(resolve(root, "apps/docs/src/data/competitor-sizes.json"), "utf8"));
const pkg = JSON.parse(readFileSync(resolve(root, "packages/ivolt/package.json"), "utf8"));
const ivolt = sizes.files.filter((f) => f.id === "ivolt");

describe("measured sizes on the compare pages", () => {
  it("measure iVOLT at the version of the package", () => {
    expect(ivolt.length).toBeGreaterThan(0);
    for (const f of ivolt) expect(f.version, `${f.file}: run node scripts/measure-competitors.mjs --ivolt-only`).toBe(pkg.version);
  });

  it("match the bytes of the current build, when there is one", () => {
    for (const f of ivolt) {
      const file = resolve(root, "packages/ivolt", f.file);
      if (!existsSync(file)) continue;
      const sha = createHash("sha256").update(readFileSync(file)).digest("hex");
      expect(sha, `${f.file} changed since it was measured: node scripts/measure-competitors.mjs --ivolt-only`).toBe(f.sha256);
    }
  });

  it("carry no hand-typed component count that could drift from the site's own", () => {
    for (const f of sizes.files) expect(f.note || "", f.file).not.toMatch(/\d+\s+(interactive|components?|behaviou?rs?)/i);
  });
});
