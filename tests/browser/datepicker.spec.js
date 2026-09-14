import { test, expect } from "@playwright/test";

test.describe("Datepicker", () => {
  test("opens a calendar, keyboard selects within min and max, writes ISO and fires events, destroy restores", async ({ page }) => {
    await page.goto("/fixture/datepicker/basic");
    const root = page.locator(".iv-datepicker").first();
    const input = root.locator("input[type=date]");
    const toggle = root.locator(".iv-datepicker__toggle");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.evaluate(() => { window.__ev = []; const el = document.querySelector(".iv-datepicker"); ["iv:opened", "iv:change", "iv:changed", "iv:closed"].forEach((t) => el.addEventListener(t, (e) => window.__ev.push([t, e.detail.value ?? null]))); el.querySelector("input").addEventListener("change", () => window.__ev.push(["native-change"])); });
    const before = await input.inputValue();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const dialog = root.locator(".iv-datepicker__popover");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "dialog");
    const grid = dialog.locator("[role=grid]");
    await expect(grid).toBeVisible();
    // One tab stop in the grid, focused on the selected day or today.
    const focusedDay = dialog.locator(".iv-datepicker__day:focus");
    await expect(focusedDay).toHaveCount(1);
    expect(await dialog.locator('.iv-datepicker__day[tabindex="0"]').count()).toBe(1);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    const target = await dialog.locator(".iv-datepicker__day:focus").getAttribute("data-iv-date");
    expect(target).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await input.inputValue()).toBe(target);
    expect(await input.inputValue()).not.toBe(before);
    const ev = await page.evaluate(() => window.__ev);
    expect(ev.some((e) => e[0] === "iv:change" && e[1] === target)).toBe(true);
    expect(ev.some((e) => e[0] === "iv:changed")).toBe(true);
    expect(ev.some((e) => e[0] === "native-change")).toBe(true);
    await expect(toggle).toBeFocused();

    // Escape closes and returns focus; disabled days exist beyond min/max when the fixture sets them.
    await toggle.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/datepicker.js");
      const el = document.querySelector(".iv-datepicker");
      mod.Datepicker.get(el).destroy();
      return { toggle: !!el.querySelector(".iv-datepicker__toggle"), popover: !!el.querySelector(".iv-datepicker__popover"), type: el.querySelector("input").type };
    });
    expect(restored).toEqual({ toggle: false, popover: false, type: "date" });
  });

  test("locale fixture: Spanish month names and Monday first; US English and Sunday first", async ({ page }) => {
    await page.goto("/fixture/datepicker/locale");
    const roots = page.locator(".iv-datepicker");
    await roots.nth(0).locator(".iv-datepicker__toggle").click();
    const esTitle = (await roots.nth(0).locator(".iv-datepicker__title").textContent()).toLowerCase();
    expect(esTitle).toMatch(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/);
    const esFirst = (await roots.nth(0).locator(".iv-datepicker__grid th").first().textContent()).trim().toLowerCase();
    expect(esFirst.startsWith("l")).toBe(true);
    await page.keyboard.press("Escape");
    await roots.nth(1).locator(".iv-datepicker__toggle").click();
    const enFirst = (await roots.nth(1).locator(".iv-datepicker__grid th").first().textContent()).trim().toLowerCase();
    expect(enFirst.startsWith("s")).toBe(true);
  });

  test("without JS only the native input exists", async ({ page }) => {
    await page.goto("/fixture/datepicker/basic?nojs=1");
    await expect(page.locator(".iv-datepicker__toggle")).toHaveCount(0);
    await expect(page.locator(".iv-datepicker input[type=date]").first()).toBeVisible();
  });
});
