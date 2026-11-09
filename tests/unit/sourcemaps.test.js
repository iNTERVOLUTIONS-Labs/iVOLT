// Published source maps must not carry the build machine's paths: the CSS maps used to list
// every source as an absolute path (home directory and checkout folder included).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../../packages/ivolt/dist");

function maps(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? maps(join(dir, e.name)) : e.name.endsWith(".map") ? [join(dir, e.name)] : []);
}

describe("source maps", () => {
  const files = maps(dist);

  it("exist", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.slice(dist.length + 1), f]))("%s lists relative sources only", (_, file) => {
    const { sources = [] } = JSON.parse(readFileSync(file, "utf8"));
    for (const s of sources) {
      expect(s, s).not.toMatch(/^(\/|[a-zA-Z]:|home\/|Users\/)/);
      expect(s, s).not.toContain(process.cwd().slice(1));
    }
  });
});
