// Adversarial regression tests for the JavaScript components.
// Each test here failed before the fix that ships with it.
import { test, expect } from "@playwright/test";

test.describe("Picker", () => {
  test("re-places the popover when the viewport shrinks while it is open", async ({ page }) => {
    await page.setViewportSize({ width: 460, height: 900 });
    await page.goto("/fixture/picker/basic");
    await page.locator(".iv-picker__control").click();
    const popover = page.locator(".iv-picker__popover");
    await expect(popover).toBeVisible();
    await expect(popover).toHaveAttribute("data-iv-placement", "bottom");

    // Shrinking the window leaves no room below: the popover used to keep the
    // height it was measured with and spilled out of the viewport.
    await page.setViewportSize({ width: 460, height: 340 });
    await page.waitForTimeout(150);
    const fits = await popover.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { bottom: rect.bottom, top: rect.top, height: window.innerHeight };
    });
    expect(fits.bottom).toBeLessThanOrEqual(fits.height + 1);
    expect(fits.top).toBeGreaterThanOrEqual(-1);
  });

  test("keeps focus when the popover chrome is pressed, so the keyboard stays alive", async ({ page }) => {
    await page.goto("/fixture/picker/basic");
    await page.locator(".iv-picker__control").click();
    const popover = page.locator(".iv-picker__popover");
    await expect(popover).toBeVisible();

    // A point on the top padding, past the rounded corner: with the 22 px radius of ADR-049 the
    // old (4, 4) corner point lies outside the box and counts as an outside press that closes it.
    const corner = await popover.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { x: Math.round(rect.left + 32), y: Math.round(rect.top + 4) };
    });
    await page.mouse.click(corner.x, corner.y);
    await page.waitForTimeout(80);

    await expect(popover).toBeVisible();
    const host = await page.evaluate(() => document.activeElement?.className ?? "");
    expect(host).toContain("iv-picker__search");

    // The highlight still moves, which it cannot do once focus is on <body>.
    const before = await page.locator(".iv-picker__option--active").getAttribute("id");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(60);
    const after = await page.locator(".iv-picker__option--active").getAttribute("id");
    expect(after).not.toBe(before);
  });
});

test.describe("Tabs", () => {
  test("Space activates the tab instead of scrolling the page", async ({ page }) => {
    await page.goto("/fixture/tabs/basic");
    await page.evaluate(() => {
      document.body.style.minHeight = "3000px";
    });
    await page.locator("#t-monthly").focus();
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(page.locator("#t-monthly")).toHaveAttribute("aria-selected", "true");

    // Space on a tab that is not selected selects it.
    await page.keyboard.press("ArrowRight");
    await page.locator("#t-enterprise").focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(page.locator("#t-enterprise")).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Dropdown", () => {
  test("returns focus to the trigger when an item is activated with the pointer", async ({ page }) => {
    await page.goto("/fixture/dropdown/basic");
    await page.locator(".iv-dropdown > summary").click();
    await expect(page.locator(".iv-dropdown")).toHaveAttribute("open", "");
    await page.locator(".iv-dropdown__item").first().click();
    await page.waitForTimeout(80);
    await expect(page.locator(".iv-dropdown")).not.toHaveAttribute("open", "");
    const active = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(active).toBe("SUMMARY");
  });
});

test.describe("Dialog", () => {
  test("a selection drag that ends on the backdrop does not close it", async ({ page }) => {
    await page.goto("/fixture/dialog/basic");
    await page.locator('[data-iv-open="signup"]').click();
    const dialog = page.locator("#signup");
    await expect(dialog).toHaveAttribute("open", "");

    const points = await page.locator(".iv-dialog__panel").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + 30),
        y: Math.round(rect.top + rect.height / 2),
        outX: Math.round(rect.right + 40),
      };
    });
    await page.mouse.move(points.x, points.y);
    await page.mouse.down();
    await page.mouse.move(points.outX, points.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    await expect(dialog).toHaveAttribute("open", "");

    // A real press on the backdrop still closes it.
    await page.mouse.click(points.outX, points.y);
    await page.waitForTimeout(150);
    await expect(dialog).not.toHaveAttribute("open", "");
  });
});

test.describe("Drawer", () => {
  test("a selection drag that ends on the backdrop does not close it", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto("/fixture/drawer/basic");
    await page.locator("[data-iv-open]").first().click();
    const drawer = page.locator("#site-drawer");
    await expect(drawer).toHaveAttribute("open", "");

    const points = await page.locator(".iv-drawer__panel").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + 30),
        y: Math.round(rect.top + rect.height / 2),
        outX: Math.round(rect.right + 60),
      };
    });
    await page.mouse.move(points.x, points.y);
    await page.mouse.down();
    await page.mouse.move(points.outX, points.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    await expect(drawer).toHaveAttribute("open", "");
  });

  test("hides its opening and closing controls where the panel is static", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/fixture/drawer/basic");
    await expect(page.locator("#site-drawer")).toHaveAttribute("data-iv-static", "");
    // At this width `open()` is a no-op, so a visible trigger would do nothing.
    await expect(page.locator("[data-iv-open]").first()).toBeHidden();
    await expect(page.locator(".iv-drawer__footer [data-iv-close]")).toBeHidden();

    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator("[data-iv-open]").first()).toBeVisible();
  });
});

test.describe("Toast", () => {
  test("keeps the timer paused while the pointer stays on the toast", async ({ page }) => {
    await page.goto("/fixture/toast/basic");
    const result = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/index.js");
      const region = document.querySelector(".iv-toast-region");
      const item = mod.Toast.get(region).show({ message: "hover", timeout: 5000 });
      const el = item.element;
      el.dispatchEvent(new MouseEvent("mouseenter"));
      const pausedByHover = item._timerId === null;
      // Focus entering and leaving the toast must not restart the countdown
      // while the pointer is still resting on it.
      el.dispatchEvent(new FocusEvent("focusin"));
      el.dispatchEvent(new FocusEvent("focusout"));
      const stillPaused = item._timerId === null;
      el.dispatchEvent(new MouseEvent("mouseleave"));
      const resumedOnLeave = item._timerId !== null;
      return { pausedByHover, stillPaused, resumedOnLeave };
    });
    expect(result).toEqual({ pausedByHover: true, stillPaused: true, resumedOnLeave: true });
  });
});

test.describe("Lifecycle", () => {
  const fixtures = [
    "dialog/basic",
    "drawer/basic",
    "dropdown/basic",
    "toast/basic",
    "tabs/basic",
    "disclosure/accordion",
    "combobox/basic",
    "datatable/basic",
    "picker/multiple",
    "carousel/cinema",
  ];

  for (const fixture of fixtures) {
    test(`${fixture} survives init → destroy → init without console errors`, async ({ page }) => {
      /** @type {string[]} */
      const problems = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console: ${message.text()}`);
      });
      await page.goto(`/fixture/${fixture}`);
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-iv-js"));

      // The same fixture without JavaScript, re-serialised by the DOM so that
      // only real differences show up, never HTML spelling.
      const withoutJs = await page.evaluate(async () => {
        const response = await fetch(`${location.pathname}?nojs=1`);
        const text = await response.text();
        const start = text.indexOf('<main id="fixture">') + '<main id="fixture">'.length;
        const holder = document.createElement("div");
        holder.innerHTML = text.slice(start, text.lastIndexOf("</main>"));
        return holder.innerHTML;
      });

      const markup = await page.evaluate(async () => {
        const mod = await import("/packages/ivolt/dist/js/index.js");
        const root = /** @type {HTMLElement} */ (document.getElementById("fixture"));
        mod.destroy(document);
        const served = root.innerHTML;
        mod.init(document);
        mod.destroy(document);
        const servedAgain = root.innerHTML;
        mod.init(document);
        return { served, servedAgain };
      });

      // `destroy` puts the served markup back, and does so identically every cycle.
      expect(markup.served).toBe(withoutJs);
      expect(markup.servedAgain).toBe(withoutJs);
      expect(problems).toEqual([]);
    });
  }
});
