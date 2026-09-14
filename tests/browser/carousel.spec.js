import { test, expect } from "@playwright/test";

test.describe("Carousel", () => {
  test("promotion to tabbed carousel, navigation, keyboard, events, destroy", async ({ page }) => {
    await page.goto("/fixture/carousel/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const root = page.locator(".iv-carousel").first();
    const slides = root.locator(".iv-carousel__slide");
    const n = await slides.count();
    expect(n).toBeGreaterThanOrEqual(3);
    const tabs = root.locator(".iv-carousel__dots [role=tab]");
    await expect(tabs).toHaveCount(n);
    await expect(root.locator(".iv-carousel__dots")).toHaveAttribute("role", "tablist");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(slides.first()).toHaveAttribute("role", "tabpanel");
    await expect(slides.first()).toHaveAttribute("aria-roledescription", "slide");
    await expect(slides.nth(1)).toHaveAttribute("aria-label", new RegExp(`^2 of ${n}$`));
    await expect(root.locator(".iv-carousel__next")).toBeVisible();

    await page.exposeFunction("record", () => {});
    const events = await page.evaluate(() => { window.__ev = []; const el = document.querySelector(".iv-carousel"); ["iv:change", "iv:changed"].forEach((t) => el.addEventListener(t, (e) => window.__ev.push([t, e.detail.index, e.detail.previousIndex, e.detail.reason]))); return true; });
    expect(events).toBe(true);
    await root.locator(".iv-carousel__next").click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await root.locator(".iv-carousel__prev").click();
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    // Loop backwards from the first slide.
    await root.locator(".iv-carousel__prev").click();
    await expect(tabs.nth(n - 1)).toHaveAttribute("aria-selected", "true");
    const ev = await page.evaluate(() => window.__ev);
    expect(ev.filter((e) => e[0] === "iv:change").length).toBe(3);
    expect(ev.filter((e) => e[0] === "iv:changed").length).toBe(3);
    expect(ev[0]).toEqual(["iv:change", 1, 0, "next"]);

    // Keyboard on the tabs: roving tabindex, arrows move and select.
    await tabs.nth(n - 1).focus();
    await page.keyboard.press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(tabs.nth(n - 1)).toHaveAttribute("aria-selected", "true");

    // Cancelable change.
    await page.evaluate(() => document.querySelector(".iv-carousel").addEventListener("iv:change", (e) => e.preventDefault(), { once: true }));
    await root.locator(".iv-carousel__next").click();
    await expect(tabs.nth(n - 1)).toHaveAttribute("aria-selected", "true");

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/carousel.js");
      const el = document.querySelector(".iv-carousel");
      mod.Carousel.get(el).destroy();
      return { tabs: el.querySelectorAll("[role=tab]").length, anchors: el.querySelectorAll(".iv-carousel__dots a[href^='#']").length, panels: el.querySelectorAll("[role=tabpanel]").length, hiddenButtons: [...el.querySelectorAll(".iv-carousel__prev, .iv-carousel__next")].every((b) => b.hidden) };
    });
    expect(restored.tabs).toBe(0);
    expect(restored.panels).toBe(0);
    expect(restored.anchors).toBe(n);
    expect(restored.hiddenButtons).toBe(true);
  });

  test("autoplay: progress and counter, toggle pauses, reduced motion disables it", async ({ page }) => {
    await page.goto("/fixture/carousel/cinema");
    const root = page.locator(".iv-carousel").first();
    await expect(root).toHaveAttribute("data-iv-effect", "cinema");
    await expect(root.locator(".iv-carousel__progress")).toHaveCount(1);
    await expect(root.locator(".iv-carousel__counter")).toHaveText(/0?1\s*\/\s*0?\d/);
    const toggle = root.locator(".iv-carousel__toggle");
    await expect(toggle).toBeVisible();
    const playing = await page.evaluate(async () => { const mod = await import("/packages/ivolt/dist/js/components/carousel.js"); return mod.Carousel.get(document.querySelector(".iv-carousel")).isPlaying; });
    expect(playing).toBe(true);
    await toggle.click();
    const paused = await page.evaluate(async () => { const mod = await import("/packages/ivolt/dist/js/components/carousel.js"); return mod.Carousel.get(document.querySelector(".iv-carousel")).isPlaying; });
    expect(paused).toBe(false);
    // Non-visible slides are inert in the fade-based effects.
    const inert = await root.locator(".iv-carousel__slide").nth(1).getAttribute("inert");
    expect(inert).not.toBeNull();

    const ctx = await page.context().browser().newContext({ reducedMotion: "reduce" });
    const p2 = await ctx.newPage();
    await p2.goto("http://localhost:4180/fixture/carousel/cinema");
    await expect(p2.locator("html")).toHaveAttribute("data-iv-js", "");
    const rmPlaying = await p2.evaluate(async () => { const mod = await import("/packages/ivolt/dist/js/components/carousel.js"); return mod.Carousel.get(document.querySelector(".iv-carousel")).isPlaying; });
    expect(rmPlaying).toBe(false);
    await ctx.close();
  });

  test("thumbnails act as tabs and swipe changes the slide", async ({ page }) => {
    await page.goto("/fixture/carousel/thumbs");
    const root = page.locator(".iv-carousel").first();
    const tabs = root.locator(".iv-carousel__dots--thumbs [role=tab]");
    expect(await tabs.count()).toBeGreaterThanOrEqual(3);
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(root.locator(".iv-carousel__slide").nth(2)).not.toHaveAttribute("aria-hidden", "true");
    await expect(root.locator(".iv-carousel__slide").nth(0)).toHaveAttribute("aria-hidden", "true");
    const box = await root.locator(".iv-carousel__viewport").boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 6 });
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(tabs.nth(3 < await tabs.count() ? 3 : 0)).toHaveAttribute("aria-selected", "true");
  });

  test("without JS the track scrolls and snaps, dots are anchors, buttons stay hidden", async ({ page }) => {
    await page.goto("/fixture/carousel/basic?nojs=1");
    const root = page.locator(".iv-carousel").first();
    await expect(root.locator("[role=tab]")).toHaveCount(0);
    expect(await root.locator(".iv-carousel__dots a[href^='#']").count()).toBeGreaterThanOrEqual(3);
    await expect(root.locator(".iv-carousel__next")).toBeHidden();
    const scroll = await root.locator(".iv-carousel__track").evaluate((el) => ({ scrollable: el.scrollWidth > el.clientWidth, snap: getComputedStyle(el).scrollSnapType }));
    expect(scroll.scrollable).toBe(true);
    expect(scroll.snap).toContain("x");
  });
});
