// Runs in the default "node" environment: no DOM globals at all.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const pkg = JSON.parse(readFileSync(new URL("../../packages/ivolt/package.json", import.meta.url), "utf8"));
import { describe, it, expect } from "vitest";

describe("SSR safety", () => {
  it("has no DOM globals in this environment", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });

  it("imports index.js without touching the DOM", async () => {
    const mod = await import("../../packages/ivolt/src/js/index.js");
    expect(typeof mod.init).toBe("function");
    expect(typeof mod.destroy).toBe("function");
    expect(typeof mod.Dialog).toBe("function");
    expect(typeof mod.setTheme).toBe("function");
    expect(mod.version).toBe(pkg.version);
    expect(Object.isFrozen(mod.components)).toBe(true);
  });

  it("imports auto.js without throwing", async () => {
    const mod = await import("../../packages/ivolt/src/js/auto.js");
    expect(typeof mod.init).toBe("function");
    expect(typeof mod.Dialog).toBe("function");
  });

  it("imports theme.js without throwing", async () => {
    const mod = await import("../../packages/ivolt/src/js/theme.js");
    expect(typeof mod.setTheme).toBe("function");
    expect(typeof mod.getTheme).toBe("function");
    expect(typeof mod.resolveTheme).toBe("function");
    expect(typeof mod.restoreTheme).toBe("function");
  });

  it("imports the iife source without throwing", async () => {
    const mod = await import("../../packages/ivolt/src/js/iife.js");
    expect(typeof mod.init).toBe("function");
  });

  it("imports every source module without touching the DOM", async () => {
    const dir = join(process.cwd(), "packages", "ivolt", "src", "js", "components");
    const files = readdirSync(dir).filter((name) => name.endsWith(".js"));
    expect(files.length).toBeGreaterThanOrEqual(24);
    for (const file of files) {
      const mod = await import(`../../packages/ivolt/src/js/components/${file}`);
      expect(Object.keys(mod).length, `${file} exports nothing`).toBeGreaterThan(0);
    }
    for (const file of readdirSync(join(process.cwd(), "packages", "ivolt", "src", "js", "core"))) {
      if (!file.endsWith(".js")) continue;
      const mod = await import(`../../packages/ivolt/src/js/core/${file}`);
      expect(Object.keys(mod).length, `core/${file} exports nothing`).toBeGreaterThan(0);
    }
  });

  it("imports every built module without touching the DOM", async () => {
    const dist = join(process.cwd(), "packages", "ivolt", "dist", "js");
    if (!existsSync(dist)) {
      // `npm run build` has not run in this checkout; the source sweep above stands.
      return;
    }
    const dir = join(dist, "components");
    const files = readdirSync(dir).filter(
      (name) => name.endsWith(".js") && !name.endsWith(".min.js")
    );
    expect(files.length).toBeGreaterThanOrEqual(24);
    for (const file of files) {
      const mod = await import(join(dir, file));
      expect(Object.keys(mod).length, `dist ${file} exports nothing`).toBeGreaterThan(0);
    }
    for (const entry of ["theme.js", "index.js", "auto.js"]) {
      const file = join(dist, entry);
      if (!existsSync(file)) continue;
      const mod = await import(file);
      expect(Object.keys(mod).length, `dist ${entry} exports nothing`).toBeGreaterThan(0);
    }
  });
});
