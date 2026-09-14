import { test, expect } from "@playwright/test";

test.describe("Effects", () => {
  test("proximity feeds pointer variables into edge-near elements and destroy clears them", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/effects/edges");
    const near = page.locator(".iv-edge-near").first();
    const box = await near.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);
    const inside = await near.evaluate((el) => ({ near: el.style.getPropertyValue("--iv-near"), mx: el.style.getPropertyValue("--iv-mx") }));
    expect(parseFloat(inside.near)).toBeGreaterThan(0.9);
    expect(inside.mx).toMatch(/px$/);
    await page.mouse.move(5, 795);
    await page.waitForTimeout(100);
    const far = await near.evaluate((el) => parseFloat(el.style.getPropertyValue("--iv-near") || "0"));
    expect(far).toBeLessThan(0.2);
    const cleared = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/proximity.js");
      const root = document.querySelector('[data-iv-component="proximity"]') || document.body;
      const inst = mod.Proximity.get(root);
      if (inst) inst.destroy();
      return [...document.querySelectorAll(".iv-edge-near")].every((el) => !el.style.getPropertyValue("--iv-near"));
    });
    expect(cleared).toBe(true);
  });

  test("reveal marks elements when they enter the viewport; reduced motion shows everything", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 500 });
    await page.goto("/fixture/effects/reveal");
    const items = page.locator(".iv-reveal");
    const n = await items.count();
    expect(n).toBeGreaterThanOrEqual(3);
    await items.last().scrollIntoViewIfNeeded();
    await expect(items.last()).toHaveAttribute("data-iv-inview", "");
    await expect(items.last()).toBeVisible();
    await expect(items.last()).toHaveCSS("opacity", "1"); // waits for the 700 ms transition

    const ctx = await page.context().browser().newContext({ reducedMotion: "reduce", viewport: { width: 1000, height: 500 } });
    const p2 = await ctx.newPage();
    await p2.goto("http://localhost:4180/fixture/effects/reveal");
    const firstOpacity = await p2.locator(".iv-reveal").first().evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(firstOpacity)).toBe(1);
    await ctx.close();
  });

  test("without JS every reveal is visible and edges are plain", async ({ page }) => {
    await page.goto("/fixture/effects/reveal?nojs=1");
    const opacities = await page.locator(".iv-reveal").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.every((o) => parseFloat(o) === 1)).toBe(true);
  });
});

test.describe("Hero", () => {
  for (const f of ["hero/basic", "hero/split", "hero/cinematic", "hero/terminal"]) {
    test(`${f} fits phones and keeps its title as the heading`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/fixture/${f}`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
      await expect(page.locator(".iv-hero__title").first()).toBeVisible();
      expect(await page.locator(".iv-hero h1, .iv-hero h2").count()).toBeGreaterThan(0);
    });
  }
});
