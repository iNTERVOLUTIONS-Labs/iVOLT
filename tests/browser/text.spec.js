import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Vertical offset of a reveal line inside its own mask, in pixels. */
const lineOffset = (locator) =>
  locator.evaluate((el) => {
    const inner = el.firstElementChild;
    return Math.round(inner.getBoundingClientRect().top - el.getBoundingClientRect().top);
  });

test.describe("Text reveal", () => {
  test("the lines rise when Reveal marks the heading, staggered by the index", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/text/reveal");
    const heading = page.locator(".iv-text-reveal").first();
    await expect(heading).toHaveAttribute("data-iv-inview", "");
    await expect.poll(() => lineOffset(heading.locator(".iv-text-reveal__line").first())).toBe(0);
    await expect(heading).toBeVisible();

    // The second heading starts below the fold and waits for the observer.
    const later = page.locator(".iv-text-reveal").nth(1);
    expect(await later.getAttribute("data-iv-inview")).toBe(null);
    const hidden = await lineOffset(later.locator(".iv-text-reveal__line").first());
    expect(hidden).toBeGreaterThan(8);
    await later.scrollIntoViewIfNeeded();
    await expect(later).toHaveAttribute("data-iv-inview", "");
    await expect.poll(() => lineOffset(later.locator(".iv-text-reveal__line").first())).toBe(0);
  });

  test("the stagger comes from the served --iv-i, not from a timer", async ({ page }) => {
    await page.goto("/fixture/text/reveal");
    const delays = await page.locator(".iv-text-reveal").nth(1).locator(".iv-text-reveal__line > span").evaluateAll((els) => els.map((el) => getComputedStyle(el).transitionDelay));
    expect(delays).toEqual(["0s", "0.11s", "0.22s", "0.33s"]);
  });

  test("without JavaScript every line is already up", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/text/reveal?nojs=1");
    const offsets = await page.locator(".iv-text-reveal__line").evaluateAll((els) =>
      els.map((el) => Math.round(el.firstElementChild.getBoundingClientRect().top - el.getBoundingClientRect().top))
    );
    expect(offsets.every((o) => o === 0)).toBe(true);
  });

  test("reduced motion shows every line at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/text/reveal");
    const offsets = await page.locator(".iv-text-reveal__line").evaluateAll((els) =>
      els.map((el) => Math.round(el.firstElementChild.getBoundingClientRect().top - el.getBoundingClientRect().top))
    );
    expect(offsets.every((o) => o === 0)).toBe(true);
  });
});

test.describe("Text glow", () => {
  test("the glow is two shadows and the pulse stops under reduced motion", async ({ page }) => {
    await page.goto("/fixture/text/glow");
    const shadow = await page.locator(".iv-text-glow").first().evaluate((el) => getComputedStyle(el).textShadow);
    expect(shadow.split("px,").length).toBeGreaterThan(1);
    expect(await page.locator(".iv-text-glow--pulse").evaluate((el) => el.getAnimations().length)).toBe(1);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fixture/text/glow");
    expect(await page.locator(".iv-text-glow--pulse").evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(page.locator(".iv-text-glow--pulse")).toBeVisible();
  });
});

test.describe("Text outline", () => {
  test("the letters are hollow and the link fills them back in", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/fixture/text/outline");
    const outlined = page.locator(".iv-text-outline").first();
    const stroke = await outlined.evaluate((el) => getComputedStyle(el).webkitTextStrokeWidth);
    expect(stroke).toBe("1px");
    const fill = page.locator(".iv-text-outline--fill");
    const resting = await fill.evaluate((el) => getComputedStyle(el).webkitTextFillColor);
    expect(resting).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    await fill.hover();
    await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).webkitTextFillColor)).not.toMatch(/rgba\(0, 0, 0, 0\)/);
    // Keyboard reaches the same state through the link that contains it.
    await page.mouse.move(5, 780);
    await page.locator('a[href="#text-outline"]').focus();
    await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).webkitTextFillColor)).not.toMatch(/rgba\(0, 0, 0, 0\)/);
  });
});

test.describe("Text shimmer", () => {
  test("the band crosses the line, and --once waits for the heading to arrive", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/text/shimmer");
    const looping = page.locator(".iv-text-shimmer").first();
    expect(await looping.evaluate((el) => el.getAnimations().length)).toBe(1);

    const once = page.locator(".iv-text-shimmer--once");
    expect(await once.getAttribute("data-iv-inview")).toBe(null);
    expect(await once.evaluate((el) => el.getAnimations().length)).toBe(0);
    await once.scrollIntoViewIfNeeded();
    await expect(once).toHaveAttribute("data-iv-inview", "");
    await expect.poll(() => once.evaluate((el) => el.getAnimations().map((a) => a.animationName ?? ""))).toEqual(["iv-text-shimmer"]);
    expect(await once.evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe("1");
  });

  test("reduced motion parks the band off the glyphs and keeps the text readable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto("/fixture/text/shimmer");
    const looping = page.locator(".iv-text-shimmer").first();
    expect(await looping.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await looping.evaluate((el) => getComputedStyle(el).backgroundPosition)).toBe("100% 0px");
    await expect(looping).toBeVisible();
  });
});

const fixtures = ["text/reveal", "text/glow", "text/outline", "text/shimmer"];
for (const theme of ["light", "dark"]) {
  for (const f of fixtures) {
    test(`axe ${f} (${theme})`, async ({ page }) => {
      // The audited state is the settled one, which is what reduced motion renders at once.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/fixture/${f}?theme=${theme}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}
