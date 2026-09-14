import { test, expect } from "@playwright/test";

test.describe("Picker", () => {
  test("single: control, search, keyboard selection, native sync, clear, destroy", async ({ page }) => {
    await page.goto("/fixture/picker/basic");
    const root = page.locator(".iv-picker").first();
    const native = root.locator("select");
    await expect(native).toHaveClass(/iv-picker__native/);
    const control = root.locator(".iv-picker__control");
    await expect(control).toHaveAttribute("aria-haspopup", "listbox");
    await expect(control).toHaveAttribute("aria-expanded", "false");
    await expect(root.locator(".iv-picker__placeholder")).toBeVisible();
    // The label names the control.
    const labelledby = await control.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();

    await page.evaluate(() => { window.__ev = []; const el = document.querySelector(".iv-picker"); ["iv:change", "iv:changed", "iv:opened", "iv:closed"].forEach((t) => el.addEventListener(t, (e) => window.__ev.push([t, e.detail.value, e.detail.added, e.detail.removed]))); el.querySelector("select").addEventListener("change", () => window.__ev.push(["native-change"])); });
    await control.click();
    await expect(control).toHaveAttribute("aria-expanded", "true");
    const popover = root.locator(".iv-picker__popover");
    await expect(popover).toBeVisible();
    const search = root.locator(".iv-picker__search");
    await expect(search).toBeVisible(); // more than seven options: automatic search
    const options = root.locator(".iv-picker__option");
    const total = await options.count();
    expect(total).toBeGreaterThan(7);
    const secondText = (await options.nth(1).textContent()).trim();
    await search.fill(secondText.slice(0, 3));
    const visible = await root.locator(".iv-picker__option:not([hidden])").count();
    expect(visible).toBeLessThan(total);
    expect(visible).toBeGreaterThan(0);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-expanded", "false");
    const value = await native.inputValue();
    expect(value).not.toBe("");
    await expect(root.locator(".iv-picker__value")).not.toHaveText("");
    const ev = await page.evaluate(() => window.__ev);
    expect(ev.some((e) => e[0] === "iv:change")).toBe(true);
    expect(ev.some((e) => e[0] === "iv:changed")).toBe(true);
    expect(ev.some((e) => e[0] === "native-change")).toBe(true);
    await expect(root.locator(".iv-picker__option[aria-selected='true']")).toHaveCount(1);

    // Escape closes and returns focus to the control.
    await control.click();
    await expect(control).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(control).toHaveAttribute("aria-expanded", "false");
    await expect(control).toBeFocused();

    // Clear.
    await root.locator(".iv-picker__clear").click();
    expect(await native.inputValue()).toBe("");
    await expect(root.locator(".iv-picker__placeholder")).toBeVisible();

    // Cancelable change leaves the native untouched.
    await page.evaluate(() => document.querySelector(".iv-picker").addEventListener("iv:change", (e) => e.preventDefault(), { once: true }));
    await control.click();
    await root.locator(".iv-picker__option:not([aria-disabled='true'])").nth(1).click();
    expect(await native.inputValue()).toBe("");

    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/picker.js");
      const el = document.querySelector(".iv-picker");
      mod.Picker.get(el).destroy();
      const s = el.querySelector("select");
      return { control: !!el.querySelector(".iv-picker__control"), popover: !!el.querySelector(".iv-picker__popover"), nativeClass: s.className, hidden: s.getAttribute("aria-hidden"), tabindex: s.getAttribute("tabindex") };
    });
    expect(restored.control).toBe(false);
    expect(restored.popover).toBe(false);
    expect(restored.nativeClass).not.toContain("iv-picker__native");
    expect(restored.hidden).toBeNull();
    expect(restored.tabindex).toBeNull();
  });

  test("multiple: chips, remove, backspace, max items, clear", async ({ page }) => {
    await page.goto("/fixture/picker/multiple");
    const root = page.locator(".iv-picker[data-iv-max-items]").first();
    const native = root.locator("select");
    const control = root.locator(".iv-picker__control");
    await control.click();
    const list = root.locator(".iv-picker__list");
    await expect(list).toHaveAttribute("aria-multiselectable", "true");
    expect(await root.locator(".iv-picker__list [role=group]").count()).toBeGreaterThanOrEqual(2);
    const enabled = root.locator(".iv-picker__option:not([aria-disabled='true'])");
    await enabled.nth(0).click();
    await expect(control).toHaveAttribute("aria-expanded", "true"); // multiple stays open
    await enabled.nth(1).click();
    await enabled.nth(2).click();
    await expect(root.locator(".iv-picker__chip")).toHaveCount(3);
    expect((await native.evaluate((s) => [...s.selectedOptions].map((o) => o.value))).length).toBe(3);
    // Limit reached: the remaining options are disabled.
    const disabledNow = await root.locator(".iv-picker__option[aria-disabled='true']").count();
    expect(disabledNow).toBeGreaterThan(0);
    await root.locator(".iv-picker__chip-remove").first().click();
    await expect(root.locator(".iv-picker__chip")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await control.focus();
    await page.keyboard.press("Backspace");
    await expect(root.locator(".iv-picker__chip")).toHaveCount(1);
    expect((await native.evaluate((s) => [...s.selectedOptions].map((o) => o.value))).length).toBe(1);
    // clear() empties both the chips and the native select (form reset is covered by the unit tests).
    await page.evaluate(async () => { const mod = await import("/packages/ivolt/dist/js/components/picker.js"); mod.Picker.get(document.querySelector(".iv-picker[data-iv-max-items]")).clear(); });
    await expect(root.locator(".iv-picker__chip")).toHaveCount(0);
    expect((await native.evaluate((s) => [...s.selectedOptions].map((o) => o.value))).length).toBe(0);
  });

  test("without JS the native select is visible and unwrapped", async ({ page }) => {
    await page.goto("/fixture/picker/basic?nojs=1");
    await expect(page.locator(".iv-picker__control")).toHaveCount(0);
    await expect(page.locator(".iv-picker select").first()).toBeVisible();
  });
});
