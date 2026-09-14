import { test, expect } from "@playwright/test";

test.describe("Megamenu", () => {
  test("toggles open panels, keyboard moves and closes, overlay and inert follow the state, destroy restores", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/megamenu/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const root = page.locator(".iv-megamenu").first();
    const toggles = root.locator(".iv-megamenu__toggle");
    expect(await toggles.count()).toBeGreaterThanOrEqual(2);
    await expect(toggles.first()).toBeVisible();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");
    const panels = root.locator(".iv-megamenu__panel");
    expect(await panels.first().getAttribute("inert")).not.toBeNull();

    await toggles.first().click();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "true");
    await expect(panels.first()).toBeVisible();
    expect(await panels.first().getAttribute("inert")).toBeNull();
    await expect(root.locator(".iv-megamenu__overlay")).toBeVisible();

    // Opening another item closes the first.
    await toggles.nth(1).click();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");

    // Escape closes and returns focus to the toggle.
    await page.keyboard.press("Escape");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "false");
    await expect(toggles.nth(1)).toBeFocused();
    await expect(root.locator(".iv-megamenu__overlay")).toBeHidden();

    // Arrow keys move between toggles; Down opens.
    await toggles.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(toggles.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");
    const firstLink = panels.nth(1).locator("a").first();
    await expect(firstLink).toBeFocused();
    await page.keyboard.press("Escape");

    // Click outside closes.
    await toggles.first().click();
    await page.mouse.click(5, 790);
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/megamenu.js");
      const el = document.querySelector(".iv-megamenu");
      const before = el.innerHTML;
      mod.Megamenu.get(el).destroy();
      return { overlay: !!el.querySelector(".iv-megamenu__overlay"), inert: el.querySelectorAll("[inert]").length, hiddenToggles: [...el.querySelectorAll(".iv-megamenu__toggle")].every((t) => t.hidden), changed: before !== el.innerHTML };
    });
    expect(restored.overlay).toBe(false);
    expect(restored.inert).toBe(0);
    expect(restored.hiddenToggles).toBe(true);
    expect(restored.changed).toBe(true);
  });

  test("small screens: accordion without overlay", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/fixture/megamenu/basic");
    const root = page.locator(".iv-megamenu").first();
    const toggle = root.locator(".iv-megamenu__toggle").first();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(root.locator(".iv-megamenu__panel").first()).toBeVisible();
    await expect(root.locator(".iv-megamenu__overlay")).toBeHidden();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });

  test("without JS: links navigate, panels open on focus within, toggles stay hidden", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/megamenu/basic?nojs=1");
    const root = page.locator(".iv-megamenu").first();
    await expect(root.locator(".iv-megamenu__toggle").first()).toBeHidden();
    const link = root.locator(".iv-megamenu__link").first();
    await link.focus();
    await expect(root.locator(".iv-megamenu__panel").first()).toBeVisible();
  });
});
