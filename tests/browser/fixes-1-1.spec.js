import { test, expect } from "@playwright/test";

/**
 * Corrections of 1.1 that have no older spec to live in. Each case failed on 1.0.0.
 */

test.describe("progress", () => {
  // The default bar is cobalt; its reduced-motion track used to be the success tint.
  test("the indeterminate bar under reduced motion is the primary tint", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fixture/progress/basic?nojs");
    const { track, subtle } = await page.locator("#pr-indeterminate").evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--iv-color-primary-subtle)";
      el.parentElement.append(probe);
      const subtle = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { track: getComputedStyle(el).backgroundColor, subtle };
    });
    expect(track).toBe(subtle);
  });
});

// Animations and transitions that repainted or re-laid out every frame now move only
// composited properties (transform, translate, scale, opacity).
test.describe("composited motion", () => {
  const composited = new Set(["transform", "translate", "scale", "opacity", "offset", "computedOffset", "easing", "composite"]);

  test("the skeleton sweep moves a layer instead of repainting the background", async ({ page }) => {
    await page.goto("/fixture/skeleton/card?nojs");
    const props = await page.evaluate(() =>
      document.getAnimations().flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k))),
    );
    expect(props.length).toBeGreaterThan(0);
    expect(props.filter((p) => !composited.has(p))).toEqual([]);
    const host = await page.locator(".iv-skeleton").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(host).toBe("none");
  });

  test("the switch thumb slides with translate, the floating label with scale", async ({ page }) => {
    await page.goto("/fixture/form/controls?nojs");
    const thumb = await page.locator(".iv-switch__thumb").first().evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(thumb.split(", ")).toEqual(["translate"]);
    await page.goto("/fixture/form/float?nojs");
    const label = await page.locator(".iv-field--float .iv-label").first().evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(label.split(", ").filter((p) => !["translate", "scale", "color"].includes(p))).toEqual([]);
  });

  test("the switch thumb still ends at the inline end in both directions", async ({ page }) => {
    for (const dir of ["ltr", "rtl"]) {
      await page.goto(`/fixture/form/controls?nojs&dir=${dir}`);
      const gap = await page.evaluate(() => {
        const input = document.querySelector(".iv-switch input");
        input.checked = true;
        const thumb = input.closest(".iv-switch").querySelector(".iv-switch__thumb");
        thumb.style.transition = "none";
        const t = thumb.getBoundingClientRect();
        const track = thumb.parentElement.getBoundingClientRect();
        return document.dir === "rtl" ? t.left - track.left : track.right - t.right;
      });
      expect(gap, dir).toBeCloseTo(3, 0);
    }
  });
});

// A modal dialog or drawer left the page scrolling underneath it (wheel, touch, keyboard
// on the backdrop); the lock is CSS now, so it holds with or without the script.
test.describe("scroll lock under a modal", () => {
  for (const [fixture, open, panel, scroller] of [
    ["dialog/basic", '[data-iv-open="signup"]', "#signup", "#signup"],
    ["drawer/basic", "[data-iv-open]", ".iv-drawer", ".iv-drawer__body"],
  ]) {
    test(`${fixture}: the page stops scrolling while the panel is modal`, async ({ page }) => {
      // The drawer is only modal below its static breakpoint.
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(`/fixture/${fixture}`);
      const root = () => page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
      expect(await root()).toBe("visible");
      await page.locator(open).first().click();
      await expect(page.locator(panel).first()).toBeVisible();
      expect(await root()).toBe("hidden");
      const contained = await page.locator(scroller).first().evaluate((el) => getComputedStyle(el).overscrollBehaviorY);
      expect(contained).toBe("contain");
      await page.keyboard.press("Escape");
      await expect(page.locator(panel).first()).toBeHidden();
      expect(await root()).toBe("visible");
    });
  }
});

// Two rules pointed at classes that do not exist (`.iv-parallax__layer`, `.iv-mesh`).
test.describe("selectors that matched nothing", () => {
  test("parallax layers print where the layout put them", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await page.goto("/fixture/motion/parallax?nojs");
    const transforms = await page.locator(".iv-parallax").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    expect(transforms.length).toBeGreaterThan(0);
    expect(transforms.every((t) => t === "none")).toBe(true);
  });

  test("the mesh and the aurora step aside in forced colours", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/fixture/surfaces/textures?nojs");
    const aurora = await page.locator(".iv-texture-aurora").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(aurora).toBe("none");
    const mesh = await page.locator(".iv-texture-mesh").first().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(mesh.split(",").every((layer) => layer.trim() === "none")).toBe(true);
  });
});
