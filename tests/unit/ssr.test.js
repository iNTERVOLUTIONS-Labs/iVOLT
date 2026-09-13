// Runs in the default "node" environment: no DOM globals at all.
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
    expect(mod.version).toBe("0.1.0-alpha.0");
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
});
